import crypto from 'node:crypto';
import {
  resolveSupabaseServerConfig,
  readJsonBody,
  verifyAdminRequest,
} from './contact-service.js';
import {
  DEFAULT_FAQS,
  FAQ_CATEGORIES,
  loadRuntimeCatalog,
  readLocalStoreRaw,
  writeLocalStoreRaw,
  isServerlessReadOnlyEnv,
} from './shop-data.js';

function mapFaqRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    category: row.category || FAQ_CATEGORIES[0],
    question: row.question || '',
    answer: row.answer || '',
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isPublished: row.is_published !== false && row.isPublished !== false,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export async function handleListFaqs({ includeUnpublished = false } = {}) {
  const cfg = resolveSupabaseServerConfig();

  if (cfg.configured) {
    const key = cfg.serviceRoleKey || cfg.anonKey;
    const filter = includeUnpublished ? '' : '&is_published=eq.true';
    try {
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/faqs?select=*${filter}&order=sort_order.asc,created_at.asc`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows) && rows.length > 0) {
          return {
            status: 200,
            body: { success: true, faqs: rows.map(mapFaqRow).filter(Boolean) },
          };
        }
      }
    } catch {
      // Fallback cleanly to local/default FAQs
    }
  }

  const catalog = loadRuntimeCatalog();
  const list = (Array.isArray(catalog.faqs) && catalog.faqs.length > 0 ? catalog.faqs : DEFAULT_FAQS)
    .filter((f) => includeUnpublished || f.isPublished !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  return { status: 200, body: { success: true, faqs: list } };
}

export async function handleAdminListFaqs(req) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }
  return handleListFaqs({ includeUnpublished: true });
}

/**
 * @param {any} req
 * @param {string | null} [id]
 */
export async function handleAdminSaveFaq(req, id = null) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const body = await readJsonBody(req);
  const category = FAQ_CATEGORIES.includes(body.category) ? body.category : FAQ_CATEGORIES[0];
  const question = String(body.question || '').trim();
  const answer = String(body.answer || '').trim();
  const sortOrder = Number(body.sortOrder ?? 0) || 0;
  const isPublished = body.isPublished !== false;

  if (question.length < 3 || answer.length < 3) {
    return {
      status: 400,
      body: { success: false, error: 'Question and answer are required (minimum 3 characters each).' },
    };
  }

  const nowIso = new Date().toISOString();
  const { cfg, restApiKey, restAuthToken } = admin;

  if (cfg.configured) {
    const headers = {
      apikey: restApiKey,
      Authorization: `Bearer ${restAuthToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    try {
      if (id) {
        const res = await fetch(`${cfg.supabaseUrl}/rest/v1/faqs?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            category,
            question,
            answer,
            sort_order: sortOrder,
            is_published: isPublished,
            updated_at: nowIso,
          }),
        });
        if (res.ok) {
          const rows = await res.json().catch(() => []);
          if (Array.isArray(rows) && rows.length > 0) {
            return { status: 200, body: { success: true, faq: mapFaqRow(rows[0]) } };
          }
        }
      } else {
        const newId = crypto.randomUUID();
        const res = await fetch(`${cfg.supabaseUrl}/rest/v1/faqs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: newId,
            category,
            question,
            answer,
            sort_order: sortOrder,
            is_published: isPublished,
            created_at: nowIso,
            updated_at: nowIso,
          }),
        });
        if (res.ok) {
          const rows = await res.json().catch(() => []);
          return { status: 201, body: { success: true, faq: mapFaqRow(rows[0]) } };
        }
      }
    } catch {
      // Fall through to local store fallback in non-serverless dev
    }
  }

  if (isServerlessReadOnlyEnv()) {
    return {
      status: 503,
      body: { success: false, error: 'Run 20261116_ecommerce_expansion.sql in Supabase to save FAQs.' },
    };
  }

  const store = readLocalStoreRaw() || {};
  if (!Array.isArray(store.faqs) || store.faqs.length === 0) {
    store.faqs = [...DEFAULT_FAQS];
  }

  if (id) {
    const idx = store.faqs.findIndex((f) => f.id === id);
    if (idx === -1) return { status: 404, body: { success: false, error: 'FAQ not found.' } };
    store.faqs[idx] = { ...store.faqs[idx], category, question, answer, sortOrder, isPublished, updatedAt: nowIso };
    writeLocalStoreRaw(store);
    return { status: 200, body: { success: true, faq: store.faqs[idx] } };
  }

  const created = {
    id: `faq-${Date.now()}`,
    category,
    question,
    answer,
    sortOrder,
    isPublished,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.faqs.push(created);
  writeLocalStoreRaw(store);
  return { status: 201, body: { success: true, faq: created } };
}

export async function handleAdminDeleteFaq(req, id) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const { cfg, restApiKey, restAuthToken } = admin;
  if (cfg.configured) {
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/faqs?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          apikey: restApiKey,
          Authorization: `Bearer ${restAuthToken}`,
        },
      });
      if (res.ok) {
        return { status: 200, body: { success: true } };
      }
    } catch {
      // ignore
    }
  }

  const store = readLocalStoreRaw() || {};
  if (Array.isArray(store.faqs)) {
    store.faqs = store.faqs.filter((f) => f.id !== id);
    writeLocalStoreRaw(store);
  }
  return { status: 200, body: { success: true } };
}

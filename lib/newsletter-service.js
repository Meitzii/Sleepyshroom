import crypto from 'node:crypto';
import {
  resolveSupabaseServerConfig,
  readJsonBody,
  verifyAdminRequest,
} from './contact-service.js';
import {
  readLocalStoreRaw,
  writeLocalStoreRaw,
  isServerlessReadOnlyEnv,
} from './shop-data.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim()) && String(email).length <= 254;
}

function mapSubscriberRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    consent: Boolean(row.consent),
    status: row.status === 'unsubscribed' ? 'unsubscribed' : 'subscribed',
    source: row.source || 'footer',
    unsubscribeToken: row.unsubscribe_token || row.unsubscribeToken || '',
    subscribedAt: row.subscribed_at || row.created_at || new Date().toISOString(),
    unsubscribedAt: row.unsubscribed_at || null,
    createdAt: row.created_at || row.subscribed_at || new Date().toISOString(),
  };
}

export async function handleNewsletterSubscribe(req) {
  const body = await readJsonBody(req);
  const rawEmail = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 120);
  const consent = body.consent === true;
  const source = String(body.source || 'footer').trim().slice(0, 50) || 'footer';

  if (!isValidEmail(rawEmail)) {
    return {
      status: 400,
      body: { success: false, error: 'Please enter a valid email address.' },
    };
  }

  if (!consent) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please confirm that you would like to receive newsletter updates from Sleepyshroom.',
      },
    };
  }

  const nowIso = new Date().toISOString();
  const cfg = resolveSupabaseServerConfig();

  if (cfg.configured) {
    if (!cfg.serviceRoleKey) {
      return {
        status: 503,
        body: {
          success: false,
          error: 'SUPABASE_SERVICE_ROLE_KEY is required on the server to manage newsletter subscriptions securely.',
        },
      };
    }

    const headers = {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    try {
      const lookupRes = await fetch(
        `${cfg.supabaseUrl}/rest/v1/newsletter_subscribers?email=ilike.${encodeURIComponent(rawEmail)}&limit=1`,
        { headers }
      );

      if (!lookupRes.ok) {
        const errPayload = await lookupRes.json().catch(() => null);
        if (lookupRes.status === 404 || errPayload?.code === 'PGRST205' || errPayload?.code === '42P01') {
          return {
            status: 503,
            body: {
              success: false,
              setupRequired: true,
              error: 'Newsletter table (public.newsletter_subscribers) has not been created yet. Run the 20261116_ecommerce_expansion.sql migration in Supabase.',
            },
          };
        }
        return {
          status: 502,
          body: { success: false, error: errPayload?.message || 'Unable to verify existing subscription.' },
        };
      }

      const existingRows = await lookupRes.json().catch(() => []);
      const existing = Array.isArray(existingRows) ? existingRows[0] : null;

      if (existing) {
        if (existing.status === 'subscribed') {
          return {
            status: 409,
            body: {
              success: false,
              duplicate: true,
              error: 'This email is already subscribed to Sleepyshroom updates! 🍄',
            },
          };
        }

        // Re-subscribe previously unsubscribed address with fresh consent timestamp
        const newToken = existing.unsubscribe_token || crypto.randomBytes(24).toString('hex');
        const patchRes = await fetch(
          `${cfg.supabaseUrl}/rest/v1/newsletter_subscribers?id=eq.${encodeURIComponent(existing.id)}`,
          {
            method: 'PATCH',
            headers: { ...headers, Prefer: 'return=representation' },
            body: JSON.stringify({
              name: name || existing.name || '',
              consent: true,
              status: 'subscribed',
              source,
              unsubscribe_token: newToken,
              subscribed_at: nowIso,
              unsubscribed_at: null,
              updated_at: nowIso,
            }),
          }
        );

        const patched = await patchRes.json().catch(() => []);
        if (!patchRes.ok) {
          return {
            status: 500,
            body: { success: false, error: 'Could not reactivate subscription.' },
          };
        }

        const sub = mapSubscriberRow(Array.isArray(patched) ? patched[0] : { ...existing, status: 'subscribed' });
        return {
          status: 200,
          body: {
            success: true,
            resubscribed: true,
            message: 'Welcome back! You have been re-subscribed to Sleepyshroom updates.',
            subscriber: sub,
          },
        };
      }

      const newSubscriberId = crypto.randomUUID();
      const unsubToken = crypto.randomBytes(24).toString('hex');

      const insertRes = await fetch(`${cfg.supabaseUrl}/rest/v1/newsletter_subscribers`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          id: newSubscriberId,
          email: rawEmail,
          name,
          consent: true,
          status: 'subscribed',
          source,
          unsubscribe_token: unsubToken,
          subscribed_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        }),
      });

      const inserted = await insertRes.json().catch(() => []);
      if (!insertRes.ok) {
        if (insertRes.status === 409) {
          return {
            status: 409,
            body: {
              success: false,
              duplicate: true,
              error: 'This email is already subscribed to Sleepyshroom updates! 🍄',
            },
          };
        }
        return {
          status: 500,
          body: { success: false, error: inserted?.message || 'Unable to save subscription.' },
        };
      }

      const subscriber = mapSubscriberRow(Array.isArray(inserted) ? inserted[0] : null);
      return {
        status: 201,
        body: {
          success: true,
          message: 'Thank you for subscribing! Check your inbox for new wallpaper drops & seasonal collections.',
          subscriber,
        },
      };
    } catch (err) {
      return {
        status: 500,
        body: { success: false, error: err?.message || 'Unexpected newsletter error.' },
      };
    }
  }

  // Local store persistence fallback when Supabase is not configured in local dev
  if (isServerlessReadOnlyEnv()) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'Supabase is not configured on this server. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      },
    };
  }

  const store = readLocalStoreRaw() || {};
  if (!Array.isArray(store.newsletterSubscribers)) store.newsletterSubscribers = [];
  const existingIdx = store.newsletterSubscribers.findIndex(
    (s) => String(s.email || '').toLowerCase() === rawEmail
  );

  if (existingIdx >= 0) {
    const existing = store.newsletterSubscribers[existingIdx];
    if (existing.status === 'subscribed') {
      return {
        status: 409,
        body: {
          success: false,
          duplicate: true,
          error: 'This email is already subscribed to Sleepyshroom updates! 🍄',
        },
      };
    }
    store.newsletterSubscribers[existingIdx] = {
      ...existing,
      name: name || existing.name || '',
      consent: true,
      status: 'subscribed',
      source,
      subscribedAt: nowIso,
      unsubscribedAt: null,
    };
    writeLocalStoreRaw(store);
    return {
      status: 200,
      body: {
        success: true,
        resubscribed: true,
        message: 'Welcome back! You have been re-subscribed to Sleepyshroom updates.',
        subscriber: store.newsletterSubscribers[existingIdx],
      },
    };
  }

  const newSub = {
    id: crypto.randomUUID(),
    email: rawEmail,
    name,
    consent: true,
    status: 'subscribed',
    source,
    unsubscribeToken: crypto.randomBytes(24).toString('hex'),
    subscribedAt: nowIso,
    unsubscribedAt: null,
    createdAt: nowIso,
  };
  store.newsletterSubscribers.unshift(newSub);
  writeLocalStoreRaw(store);

  return {
    status: 201,
    body: {
      success: true,
      message: 'Thank you for subscribing! Check your inbox for new wallpaper drops & seasonal collections.',
      subscriber: newSub,
    },
  };
}

export async function handleNewsletterUnsubscribe(req) {
  const body = req.method === 'GET' ? {} : await readJsonBody(req);
  const urlObj = new URL(req.url || '/api/newsletter', 'http://localhost');
  const token = String(body.token || urlObj.searchParams.get('token') || '').trim();
  const email = String(body.email || urlObj.searchParams.get('email') || '').trim().toLowerCase();

  if (!token && !isValidEmail(email)) {
    return {
      status: 400,
      body: { success: false, error: 'Provide a valid email address or unsubscribe token.' },
    };
  }

  const nowIso = new Date().toISOString();
  const cfg = resolveSupabaseServerConfig();

  if (cfg.configured && cfg.serviceRoleKey) {
    const headers = {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    };

    const filter = token
      ? `unsubscribe_token=eq.${encodeURIComponent(token)}`
      : `email=ilike.${encodeURIComponent(email)}`;

    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/newsletter_subscribers?${filter}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'unsubscribed',
        unsubscribed_at: nowIso,
        updated_at: nowIso,
      }),
    });

    if (!res.ok) {
      return {
        status: 500,
        body: { success: false, error: 'Could not process unsubscribe request.' },
      };
    }

    const updated = await res.json().catch(() => []);
    if (!Array.isArray(updated) || updated.length === 0) {
      return {
        status: 404,
        body: { success: false, error: 'No matching newsletter subscription was found.' },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        message: 'You have been unsubscribed from Sleepyshroom marketing emails.',
        subscriber: mapSubscriberRow(updated[0]),
      },
    };
  }

  const store = readLocalStoreRaw() || {};
  const list = Array.isArray(store.newsletterSubscribers) ? store.newsletterSubscribers : [];
  const idx = list.findIndex((s) =>
    token ? s.unsubscribeToken === token : String(s.email || '').toLowerCase() === email
  );
  if (idx === -1) {
    return {
      status: 404,
      body: { success: false, error: 'No matching newsletter subscription was found.' },
    };
  }
  list[idx] = { ...list[idx], status: 'unsubscribed', unsubscribedAt: nowIso };
  store.newsletterSubscribers = list;
  writeLocalStoreRaw(store);

  return {
    status: 200,
    body: {
      success: true,
      message: 'You have been unsubscribed from Sleepyshroom marketing emails.',
      subscriber: list[idx],
    },
  };
}

export async function handleAdminListSubscribers(req) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const { cfg, restApiKey, restAuthToken } = admin;
  if (cfg.configured) {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/newsletter_subscribers?select=*&order=subscribed_at.desc`,
      {
        headers: {
          apikey: restApiKey,
          Authorization: `Bearer ${restAuthToken}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      if (res.status === 404 || errData?.code === 'PGRST205' || errData?.code === '42P01') {
        return {
          status: 200,
          body: {
            success: true,
            setupRequired: true,
            error: 'Run 20261116_ecommerce_expansion.sql in Supabase to enable public.newsletter_subscribers.',
            subscribers: [],
          },
        };
      }
      return { status: 502, body: { success: false, error: errData?.message || 'Unable to load subscribers.' } };
    }
    const rows = await res.json().catch(() => []);
    return {
      status: 200,
      body: {
        success: true,
        subscribers: Array.isArray(rows) ? rows.map(mapSubscriberRow).filter(Boolean) : [],
      },
    };
  }

  const store = readLocalStoreRaw() || {};
  return {
    status: 200,
    body: {
      success: true,
      subscribers: Array.isArray(store.newsletterSubscribers) ? store.newsletterSubscribers : [],
    },
  };
}

export async function handleAdminUpdateSubscriber(req, id) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const body = await readJsonBody(req);
  const nextStatus = body.status === 'unsubscribed' ? 'unsubscribed' : 'subscribed';
  const nowIso = new Date().toISOString();
  const { cfg, restApiKey, restAuthToken } = admin;

  if (cfg.configured) {
    const patch = {
      status: nextStatus,
      updated_at: nowIso,
      unsubscribed_at: nextStatus === 'unsubscribed' ? nowIso : null,
      subscribed_at: nextStatus === 'subscribed' ? nowIso : undefined,
    };
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/newsletter_subscribers?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: restApiKey,
          Authorization: `Bearer ${restAuthToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) {
      return { status: 500, body: { success: false, error: 'Could not update subscriber status.' } };
    }
    const rows = await res.json().catch(() => []);
    return { status: 200, body: { success: true, subscriber: mapSubscriberRow(rows[0]) } };
  }

  const store = readLocalStoreRaw() || {};
  const list = Array.isArray(store.newsletterSubscribers) ? store.newsletterSubscribers : [];
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return { status: 404, body: { success: false, error: 'Subscriber not found.' } };
  list[idx] = {
    ...list[idx],
    status: nextStatus,
    unsubscribedAt: nextStatus === 'unsubscribed' ? nowIso : null,
  };
  store.newsletterSubscribers = list;
  writeLocalStoreRaw(store);
  return { status: 200, body: { success: true, subscriber: list[idx] } };
}

export async function handleAdminDeleteSubscriber(req, id) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const { cfg, restApiKey, restAuthToken } = admin;
  if (cfg.configured) {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/newsletter_subscribers?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: restApiKey,
          Authorization: `Bearer ${restAuthToken}`,
        },
      }
    );
    if (!res.ok) {
      return { status: 500, body: { success: false, error: 'Could not delete subscriber.' } };
    }
    return { status: 200, body: { success: true } };
  }

  const store = readLocalStoreRaw() || {};
  store.newsletterSubscribers = (store.newsletterSubscribers || []).filter((s) => s.id !== id);
  writeLocalStoreRaw(store);
  return { status: 200, body: { success: true } };
}

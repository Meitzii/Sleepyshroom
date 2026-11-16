import crypto from 'node:crypto';
import {
  resolveSupabaseServerConfig,
  readJsonBody,
  extractBearerToken,
  fetchVerifiedSupabaseUser,
  verifyAdminRequest,
} from './contact-service.js';
import {
  loadRuntimeCatalog,
  readLocalStoreRaw,
  writeLocalStoreRaw,
  isServerlessReadOnlyEnv,
} from './shop-data.js';

function mapReviewRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    productId: row.product_id || row.productId,
    orderId: row.order_id || row.orderId || null,
    userId: row.user_id || row.userId,
    reviewerName: row.reviewer_name || row.reviewerName || 'Verified Buyer',
    rating: Number(row.rating || 5),
    title: row.title || '',
    comment: row.comment || '',
    verifiedPurchase: row.verified_purchase !== false && row.verifiedPurchase !== false,
    status: row.status === 'hidden' ? 'hidden' : 'published',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
  };
}

function orderContainsProduct(order, productId, catalogProducts = []) {
  if (!order) return false;
  const st = String(order.paymentStatus || order.status || '').toLowerCase();
  if (st !== 'paid' && st !== 'completed') return false;
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.items_json)
      ? order.items_json
      : [];

  for (const item of items) {
    if (item.productId === productId) return true;
    if (Array.isArray(item.bundleProductIds) && item.bundleProductIds.includes(productId)) return true;
    const prodDef = catalogProducts.find((p) => p.id === item.productId);
    if (prodDef && Array.isArray(prodDef.bundleProductIds) && prodDef.bundleProductIds.includes(productId)) {
      return true;
    }
  }
  return false;
}

async function verifyUserPurchaseForProduct(cfg, bearerToken, user, productId) {
  const catalog = loadRuntimeCatalog();
  const userEmail = String(user.email || '').toLowerCase().trim();

  // Check Supabase orders first
  if (cfg.configured) {
    const authKey = cfg.serviceRoleKey || cfg.anonKey;
    const authBearer = cfg.serviceRoleKey || bearerToken;
    try {
      const filters = [`user_id.eq.${user.id}`];
      if (userEmail) filters.push(`customer_email.ilike.${userEmail}`);
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/orders?or=(${encodeURIComponent(filters.join(','))})&select=id,user_id,customer_email,status,payment_status,items_json`,
        {
          headers: {
            apikey: authKey,
            Authorization: `Bearer ${authBearer}`,
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows)) {
          const match = rows.find((row) => orderContainsProduct(row, productId, catalog.products));
          if (match) {
            return { verified: true, orderId: match.id };
          }
        }
      }
    } catch {
      // Fall back to local store check
    }
  }

  // Local store fallback
  const localMatch = (catalog.orders || []).find(
    (o) =>
      ((o.userId && o.userId === user.id) ||
        (userEmail && String(o.customerEmail || '').toLowerCase() === userEmail)) &&
      orderContainsProduct(o, productId, catalog.products)
  );
  if (localMatch) {
    return { verified: true, orderId: localMatch.id };
  }

  return { verified: false, orderId: null };
}

export async function handleGetProductReviews(req) {
  const urlObj = new URL(req.url || '/api/reviews', 'http://localhost');
  const productId = String(urlObj.searchParams.get('productId') || '').trim();
  const bearer = extractBearerToken(req);
  const cfg = resolveSupabaseServerConfig();

  let currentUser = null;
  if (cfg.configured && bearer) {
    currentUser = await fetchVerifiedSupabaseUser(cfg, bearer);
  }

  let reviewsList = [];
  if (cfg.configured) {
    const key = cfg.serviceRoleKey || cfg.anonKey;
    const authHeader = cfg.serviceRoleKey || bearer || cfg.anonKey;
    const queryFilter = productId
      ? `product_id=eq.${encodeURIComponent(productId)}&status=eq.published`
      : `status=eq.published`;
    try {
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/reviews?${queryFilter}&select=*&order=created_at.desc`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${authHeader}`,
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        reviewsList = Array.isArray(rows) ? rows.map(mapReviewRow).filter(Boolean) : [];
      }
    } catch {
      // Fallback below if table not present yet
    }
  }

  if (reviewsList.length === 0) {
    const store = readLocalStoreRaw();
    const localReviews = Array.isArray(store?.reviews) ? store.reviews : [];
    reviewsList = localReviews
      .filter((r) => r.status !== 'hidden' && (!productId || r.productId === productId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const totalCount = reviewsList.length;
  const averageRating =
    totalCount > 0
      ? Number((reviewsList.reduce((acc, r) => acc + Number(r.rating || 0), 0) / totalCount).toFixed(1))
      : 0;

  let canReview = false;
  let existingUserReview = null;

  if (currentUser && productId) {
    const purchaseCheck = await verifyUserPurchaseForProduct(cfg, bearer, currentUser, productId);
    canReview = purchaseCheck.verified;
    existingUserReview = reviewsList.find((r) => r.userId === currentUser.id) || null;
  }

  return {
    status: 200,
    body: {
      success: true,
      productId: productId || null,
      averageRating,
      totalCount,
      canReview,
      existingUserReview,
      reviews: reviewsList,
    },
  };
}

export async function handleSubmitOrUpdateReview(req) {
  const cfg = resolveSupabaseServerConfig();
  const bearer = extractBearerToken(req);

  if (!bearer) {
    return {
      status: 401,
      body: { success: false, error: 'Please sign in to submit a customer review.' },
    };
  }

  if (!cfg.configured) {
    return {
      status: 503,
      body: { success: false, error: 'Supabase authentication is required to verify review authorship.' },
    };
  }

  const user = await fetchVerifiedSupabaseUser(cfg, bearer);
  if (!user) {
    return {
      status: 401,
      body: { success: false, error: 'Invalid or expired sign-in session. Please sign in again.' },
    };
  }

  const body = await readJsonBody(req);
  const productId = String(body.productId || '').trim();
  const rating = Number(body.rating);
  const title = String(body.title || '').trim().slice(0, 120);
  const comment = String(body.comment || '').trim();

  if (!productId) {
    return { status: 400, body: { success: false, error: 'Product ID is required.' } };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: 400, body: { success: false, error: 'Rating must be an integer between 1 and 5 stars.' } };
  }

  if (comment.length < 3 || comment.length > 2500) {
    return {
      status: 400,
      body: { success: false, error: 'Review feedback must be between 3 and 2,500 characters.' },
    };
  }

  const purchase = await verifyUserPurchaseForProduct(cfg, bearer, user, productId);
  if (!purchase.verified) {
    return {
      status: 403,
      body: {
        success: false,
        error: 'Only customers with a verified purchase of this product (or a bundle containing it) can leave a review.',
      },
    };
  }

  const reviewerName =
    String(
      user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : 'Verified Customer')
    )
      .trim()
      .slice(0, 120) || 'Verified Customer';

  const nowIso = new Date().toISOString();
  const restKey = cfg.serviceRoleKey || cfg.anonKey;
  const restToken = cfg.serviceRoleKey || bearer;
  const headers = {
    apikey: restKey,
    Authorization: `Bearer ${restToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const existingRes = await fetch(
      `${cfg.supabaseUrl}/rest/v1/reviews?user_id=eq.${encodeURIComponent(user.id)}&product_id=eq.${encodeURIComponent(productId)}&limit=1`,
      { headers }
    );

    if (existingRes.ok) {
      const existingRows = await existingRes.json().catch(() => []);
      const existing = Array.isArray(existingRows) ? existingRows[0] : null;

      if (existing) {
        const patchRes = await fetch(
          `${cfg.supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(existing.id)}`,
          {
            method: 'PATCH',
            headers: { ...headers, Prefer: 'return=representation' },
            body: JSON.stringify({
              rating,
              title,
              comment,
              reviewer_name: reviewerName,
              updated_at: nowIso,
            }),
          }
        );
        const patched = await patchRes.json().catch(() => []);
        if (!patchRes.ok) {
          return {
            status: 500,
            body: { success: false, error: patched?.message || 'Unable to update your review.' },
          };
        }
        return {
          status: 200,
          body: {
            success: true,
            updated: true,
            message: 'Your review has been updated!',
            review: mapReviewRow(Array.isArray(patched) ? patched[0] : { ...existing, rating, title, comment }),
          },
        };
      }

      const newReviewId = crypto.randomUUID();
      const insertRes = await fetch(`${cfg.supabaseUrl}/rest/v1/reviews`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          id: newReviewId,
          product_id: productId,
          order_id: purchase.orderId || null,
          user_id: user.id,
          reviewer_name: reviewerName,
          rating,
          title,
          comment,
          verified_purchase: true,
          status: 'published',
          created_at: nowIso,
          updated_at: nowIso,
        }),
      });
      const inserted = await insertRes.json().catch(() => []);
      if (!insertRes.ok) {
        return {
          status: 500,
          body: { success: false, error: inserted?.message || 'Unable to submit review.' },
        };
      }
      return {
        status: 201,
        body: {
          success: true,
          message: 'Thank you for sharing your verified review!',
          review: mapReviewRow(Array.isArray(inserted) ? inserted[0] : null),
        },
      };
    }

    const errData = await existingRes.json().catch(() => null);
    if (existingRes.status === 404 || errData?.code === 'PGRST205' || errData?.code === '42P01') {
      if (isServerlessReadOnlyEnv()) {
        return {
          status: 503,
          body: {
            success: false,
            setupRequired: true,
            error: 'Run 20261116_ecommerce_expansion.sql in Supabase to enable public.reviews.',
          },
        };
      }
    }
  } catch (err) {
    return {
      status: 500,
      body: { success: false, error: err?.message || 'Unexpected error saving review.' },
    };
  }

  // Local store fallback if reviews table is not yet applied locally
  if (!isServerlessReadOnlyEnv()) {
    const store = readLocalStoreRaw() || {};
    if (!Array.isArray(store.reviews)) store.reviews = [];
    const idx = store.reviews.findIndex((r) => r.userId === user.id && r.productId === productId);
    if (idx >= 0) {
      store.reviews[idx] = {
        ...store.reviews[idx],
        rating,
        title,
        comment,
        reviewerName,
        updatedAt: nowIso,
      };
      writeLocalStoreRaw(store);
      return {
        status: 200,
        body: { success: true, updated: true, message: 'Your review has been updated!', review: store.reviews[idx] },
      };
    }
    const created = {
      id: crypto.randomUUID(),
      productId,
      orderId: purchase.orderId || null,
      userId: user.id,
      reviewerName,
      rating,
      title,
      comment,
      verifiedPurchase: true,
      status: 'published',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.reviews.unshift(created);
    writeLocalStoreRaw(store);
    return {
      status: 201,
      body: { success: true, message: 'Thank you for sharing your verified review!', review: created },
    };
  }

  return { status: 500, body: { success: false, error: 'Unable to save review.' } };
}

export async function handleAdminListReviews(req) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const catalog = loadRuntimeCatalog();
  const titleById = new Map((catalog.products || []).map((p) => [p.id, p.title]));
  const { cfg, restApiKey, restAuthToken } = admin;

  if (cfg.configured) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/reviews?select=*&order=created_at.desc`, {
      headers: {
        apikey: restApiKey,
        Authorization: `Bearer ${restAuthToken}`,
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const rows = await res.json().catch(() => []);
      const mapped = (Array.isArray(rows) ? rows : [])
        .map(mapReviewRow)
        .filter(Boolean)
        .map((r) => ({ ...r, productTitle: titleById.get(r.productId) || r.productId }));
      return { status: 200, body: { success: true, reviews: mapped } };
    }
    const errData = await res.json().catch(() => null);
    if (res.status === 404 || errData?.code === 'PGRST205' || errData?.code === '42P01') {
      return {
        status: 200,
        body: {
          success: true,
          setupRequired: true,
          error: 'Run 20261116_ecommerce_expansion.sql in Supabase to enable public.reviews.',
          reviews: (catalog.reviews || []).map((r) => ({
            ...r,
            productTitle: titleById.get(r.productId) || r.productId,
          })),
        },
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      reviews: (catalog.reviews || []).map((r) => ({
        ...r,
        productTitle: titleById.get(r.productId) || r.productId,
      })),
    },
  };
}

export async function handleAdminModerateReview(req, id) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const body = await readJsonBody(req);
  const nextStatus = body.status === 'hidden' ? 'hidden' : 'published';
  const nowIso = new Date().toISOString();
  const { cfg, restApiKey, restAuthToken } = admin;

  if (cfg.configured) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: restApiKey,
        Authorization: `Bearer ${restAuthToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: nextStatus, updated_at: nowIso }),
    });
    if (res.ok) {
      const rows = await res.json().catch(() => []);
      return { status: 200, body: { success: true, review: mapReviewRow(rows[0]) } };
    }
  }

  const store = readLocalStoreRaw() || {};
  const list = Array.isArray(store.reviews) ? store.reviews : [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { status: 404, body: { success: false, error: 'Review not found.' } };
  list[idx] = { ...list[idx], status: nextStatus, updatedAt: nowIso };
  store.reviews = list;
  writeLocalStoreRaw(store);
  return { status: 200, body: { success: true, review: list[idx] } };
}

export async function handleAdminDeleteReview(req, id) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const { cfg, restApiKey, restAuthToken } = admin;
  if (cfg.configured) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        apikey: restApiKey,
        Authorization: `Bearer ${restAuthToken}`,
      },
    });
    if (res.ok) {
      return { status: 200, body: { success: true } };
    }
  }

  const store = readLocalStoreRaw() || {};
  store.reviews = (store.reviews || []).filter((r) => r.id !== id);
  writeLocalStoreRaw(store);
  return { status: 200, body: { success: true } };
}

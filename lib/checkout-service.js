import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSupabaseServerConfig,
  readJsonBody,
  extractBearerToken,
  fetchVerifiedSupabaseUser,
  verifyAdminRequest,
} from './contact-service.js';
import {
  loadRuntimeCatalog,
  getRootDir,
  upsertLocalOrder,
  incrementLocalProductDownloads,
  hasLocalWebhookEvent,
  recordLocalWebhookEvent,
} from './shop-data.js';
import {
  PAYMONGO_METHOD_META,
  ALL_PAYMONGO_METHODS,
  resolvePaymongoServerConfig,
  usdToPhp,
  phpToCentavos,
  buildPaymongoLineItemsPhp,
  createPaymongoCheckoutSession,
  retrievePaymongoCheckoutSession,
  extractVerifiedPaymentFromCheckoutSession,
  verifyPaymongoWebhookSignature,
  formatPaymongoPaymentMethodLabel,
} from './paymongo.js';
import { sendOrderConfirmationEmails } from './email-service.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function sanitizeBillingDetails(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  return {
    country: String(obj.country || 'Philippines').trim().slice(0, 100),
    city: String(obj.city || '').trim().slice(0, 100),
    postalCode: String(obj.postalCode || '').trim().slice(0, 32),
    addressLine1: String(obj.addressLine1 || '').trim().slice(0, 200),
    phone: String(obj.phone || '').trim().slice(0, 32),
  };
}

function resolveRequestOrigin(req) {
  const proto = String(req.headers?.['x-forwarded-proto'] || 'http')
    .split(',')[0]
    .trim();
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  if (host) {
    return `${proto}://${host}`;
  }
  const envOrigin = process.env.APP_URL || process.env.VITE_APP_URL || process.env.VERCEL_URL;
  if (envOrigin) {
    return envOrigin.startsWith('http') ? envOrigin.replace(/\/+$/, '') : `https://${envOrigin}`;
  }
  return 'http://localhost:3000';
}

export function isOrderDownloadAuthorized(order) {
  if (!order) return false;
  const st = String(order.paymentStatus || order.status || '').toLowerCase();
  if (st !== 'paid' && st !== 'completed') return false;
  if (Number(order.total || 0) > 0) {
    return Boolean(
      order.paidAt ||
        order.paymongoPaymentId ||
        order.transactionId ||
        order.paymentReference
    );
  }
  return true;
}

function calculateDiscountBreakdown(discountMatch, subtotalUsd, phpPerUsdRate) {
  if (!discountMatch || !discountMatch.active) {
    return { valid: false, discountUsd: 0, discountPhp: 0 };
  }
  const minSpendUsd = Number(discountMatch.minSpend || 0);
  const minSpendPhp = usdToPhp(minSpendUsd, phpPerUsdRate);
  if (subtotalUsd + 0.0001 < minSpendUsd) {
    return {
      valid: false,
      discountUsd: 0,
      discountPhp: 0,
      message: `Minimum spend of ₱${minSpendPhp.toFixed(2)} PHP required for ${discountMatch.code}.`,
    };
  }

  const subtotalPhp = usdToPhp(subtotalUsd, phpPerUsdRate);
  const rawUsd =
    discountMatch.type === 'percentage'
      ? (subtotalUsd * Number(discountMatch.value || 0)) / 100
      : Math.min(subtotalUsd, Number(discountMatch.value || 0));
  const discountUsd = Number(Math.max(0, Math.min(subtotalUsd, rawUsd)).toFixed(2));

  const rawPhp =
    discountMatch.type === 'percentage'
      ? (subtotalPhp * Number(discountMatch.value || 0)) / 100
      : Math.min(subtotalPhp, usdToPhp(Number(discountMatch.value || 0), phpPerUsdRate));
  const discountPhp = Number(Math.max(0, Math.min(subtotalPhp, rawPhp)).toFixed(2));

  return {
    valid: true,
    discountUsd,
    discountPhp,
    minSpendUsd,
    minSpendPhp,
    message:
      discountMatch.type === 'percentage'
        ? `${discountMatch.value}% off applied!`
        : `₱${usdToPhp(Number(discountMatch.value), phpPerUsdRate).toFixed(2)} PHP off applied!`,
  };
}

function buildOrderFromSupabaseRow(row) {
  if (!row || typeof row !== 'object') return null;
  const items = Array.isArray(row.items_json) ? row.items_json : [];
  const total = Number(row.total_amount ?? row.total ?? 0);
  const subtotal = Number(row.subtotal ?? total);
  const discount = Number(row.discount ?? Math.max(0, subtotal - total));
  const rawPaymentStatus = String(row.payment_status || row.status || 'pending').toLowerCase();
  const normalizedStatus = rawPaymentStatus === 'completed' ? 'paid' : rawPaymentStatus;

  return {
    id: String(row.id),
    userId: row.user_id || null,
    orderNumber: String(row.order_number || `SHROOM-${String(row.id).slice(0, 6).toUpperCase()}`),
    customerEmail: String(row.customer_email || ''),
    customerName: String(row.customer_name || 'Valued Customer'),
    billingDetails:
      row.billing_details && typeof row.billing_details === 'object' ? row.billing_details : undefined,
    items,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    discountCode: row.discount_code || undefined,
    total: Number(total.toFixed(2)),
    currency: String(row.currency || 'PHP').toUpperCase(),
    paymentProvider: String(row.payment_provider || 'paymongo'),
    paymentMethod: String(row.payment_method || 'PayMongo Hosted Checkout'),
    paymentStatus: normalizedStatus,
    transactionId: String(
      row.transaction_id || row.paymongo_payment_id || row.paymongo_checkout_session_id || row.payment_reference || ''
    ),
    paymentReference: String(
      row.payment_reference || row.paymongo_payment_id || row.paymongo_checkout_session_id || ''
    ),
    paymongoCheckoutSessionId: row.paymongo_checkout_session_id || undefined,
    paymongoPaymentIntentId: row.paymongo_payment_intent_id || undefined,
    paymongoPaymentId: row.paymongo_payment_id || undefined,
    paymongoEventId: row.paymongo_event_id || undefined,
    paidAt: row.paid_at || undefined,
    failureReason: row.failure_reason || undefined,
    downloadToken: String(row.download_token || ''),
    downloadCount: Number(row.download_count || 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

async function persistPendingOrderToSupabase(order, bearerToken) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) return { saved: false, reason: 'supabase_unconfigured' };

  const rpcAuthToken = bearerToken || cfg.serviceRoleKey || cfg.anonKey;
  const apiKey = cfg.serviceRoleKey || cfg.anonKey;

  try {
    const rpcRes = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/create_checkout_order`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${rpcAuthToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_id: order.id,
        p_user_id: order.userId || null,
        p_order_number: order.orderNumber,
        p_customer_email: order.customerEmail,
        p_customer_name: order.customerName,
        p_subtotal: order.subtotal,
        p_discount: order.discount,
        p_discount_code: order.discountCode || null,
        p_total_amount: order.total,
        p_currency: order.currency || 'PHP',
        p_payment_provider: 'paymongo',
        p_payment_method: order.paymentMethod,
        p_paymongo_checkout_session_id: order.paymongoCheckoutSessionId,
        p_paymongo_payment_intent_id: order.paymongoPaymentIntentId || null,
        p_download_token: order.downloadToken,
        p_billing_details: order.billingDetails || {},
        p_items_json: order.items,
      }),
    });
    if (rpcRes.ok) {
      return { saved: true };
    }
  } catch {
    // Fallback to service role REST insert if migration RPC wasn't executed yet
  }

  if (cfg.serviceRoleKey) {
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: order.id,
          user_id: order.userId || null,
          order_number: order.orderNumber,
          customer_email: order.customerEmail,
          customer_name: order.customerName,
          status: 'pending',
          subtotal: order.subtotal,
          discount: order.discount,
          discount_code: order.discountCode || null,
          total_amount: order.total,
          currency: order.currency || 'PHP',
          payment_provider: 'paymongo',
          payment_method: order.paymentMethod,
          payment_status: 'pending',
          payment_reference: order.paymongoCheckoutSessionId,
          transaction_id: order.paymongoCheckoutSessionId,
          paymongo_checkout_session_id: order.paymongoCheckoutSessionId,
          paymongo_payment_intent_id: order.paymongoPaymentIntentId || null,
          download_token: order.downloadToken,
          download_count: 0,
          billing_details: order.billingDetails || {},
          items_json: order.items,
        }),
      });
      return { saved: res.ok };
    } catch {
      return { saved: false, reason: 'network_error' };
    }
  }

  return { saved: false, reason: 'service_role_or_migration_required' };
}

async function findSupabaseOrder({ id, downloadToken, checkoutSessionId, paymentIntentId, orderNumber }) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) return null;

  if (downloadToken) {
    try {
      const rpcRes = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/get_order_by_download_token`, {
        method: 'POST',
        headers: {
          apikey: cfg.serviceRoleKey || cfg.anonKey,
          Authorization: `Bearer ${cfg.serviceRoleKey || cfg.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_token: downloadToken }),
      });
      if (rpcRes.ok) {
        const rpcData = await rpcRes.json().catch(() => null);
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        const mapped = buildOrderFromSupabaseRow(row);
        if (mapped) return mapped;
      }
    } catch {
      // Fall through cleanly
    }
  }

  if (!cfg.serviceRoleKey) return null;

  const queries = [];
  if (checkoutSessionId) {
    queries.push(`paymongo_checkout_session_id=eq.${encodeURIComponent(checkoutSessionId)}`);
  }
  if (paymentIntentId) {
    queries.push(`paymongo_payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}`);
  }
  if (id && isValidUuid(id)) {
    queries.push(`id=eq.${encodeURIComponent(id)}`);
  }
  if (downloadToken) {
    queries.push(`download_token=eq.${encodeURIComponent(downloadToken)}`);
  }
  if (orderNumber) {
    queries.push(`order_number=eq.${encodeURIComponent(orderNumber)}`);
  }

  for (const filter of queries) {
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders?${filter}&select=*&limit=1`, {
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        const mapped = buildOrderFromSupabaseRow(Array.isArray(rows) ? rows[0] : null);
        if (mapped) return mapped;
      }
    } catch {
      // Try next identifier cleanly
    }
  }

  return null;
}

async function updateSupabaseOrderPatch(orderId, patch) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured || !cfg.serviceRoleKey || !orderId) return null;

  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`,
      {
        method: 'PATCH',
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          ...patch,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (res.ok) {
      const rows = await res.json().catch(() => []);
      return buildOrderFromSupabaseRow(Array.isArray(rows) ? rows[0] : null);
    }
  } catch {
    // Non-blocking fallback
  }
  return null;
}

async function checkSupabaseWebhookEventExists(eventId) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured || !cfg.serviceRoleKey || !eventId) return false;
  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/payment_webhook_events?event_id=eq.${encodeURIComponent(eventId)}&select=id&limit=1`,
      {
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) return false;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function insertSupabaseWebhookEvent({
  eventId,
  eventType,
  checkoutSessionId,
  paymentId,
  livemode,
  payload,
}) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured || !cfg.serviceRoleKey || !eventId) return { inserted: false, duplicate: false };
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/payment_webhook_events`, {
      method: 'POST',
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        provider: 'paymongo',
        event_id: eventId,
        event_type: eventType,
        checkout_session_id: checkoutSessionId || null,
        payment_id: paymentId || null,
        livemode: Boolean(livemode),
        payload: payload || {},
      }),
    });
    if (res.status === 409) {
      return { inserted: false, duplicate: true };
    }
    return { inserted: res.ok, duplicate: false };
  } catch {
    return { inserted: false, duplicate: false };
  }
}

async function finalizeVerifiedPaidOrder({
  order,
  paymentId,
  paymentIntentId,
  paymentMethodLabel,
  paidAt,
  eventId,
  receiptOrigin,
}) {
  const wasAlreadyPaid =
    String(order.paymentStatus || '').toLowerCase() === 'paid' ||
    String(order.paymentStatus || '').toLowerCase() === 'completed';

  const nowIso = paidAt || new Date().toISOString();
  const updatedOrder = {
    ...order,
    paymentStatus: 'paid',
    paymentMethod: paymentMethodLabel || order.paymentMethod || 'PayMongo',
    paymongoPaymentId: paymentId || order.paymongoPaymentId,
    paymongoPaymentIntentId: paymentIntentId || order.paymongoPaymentIntentId,
    paymongoEventId: eventId || order.paymongoEventId,
    transactionId: paymentId || order.paymongoCheckoutSessionId || order.transactionId,
    paymentReference: paymentId || order.paymongoCheckoutSessionId || order.paymentReference,
    paidAt: order.paidAt || nowIso,
    failureReason: undefined,
  };

  upsertLocalOrder(updatedOrder);
  const supabaseUpdated = await updateSupabaseOrderPatch(order.id, {
    status: 'paid',
    payment_status: 'paid',
    payment_method: updatedOrder.paymentMethod,
    payment_reference: updatedOrder.paymentReference,
    transaction_id: updatedOrder.transactionId,
    paymongo_payment_id: updatedOrder.paymongoPaymentId || null,
    paymongo_payment_intent_id: updatedOrder.paymongoPaymentIntentId || null,
    paymongo_event_id: updatedOrder.paymongoEventId || null,
    paid_at: updatedOrder.paidAt,
    failure_reason: null,
  });

  if (!wasAlreadyPaid) {
    incrementLocalProductDownloads(updatedOrder.items);
    await sendOrderConfirmationEmails({
      order: supabaseUpdated || updatedOrder,
      receiptOrigin,
    }).catch((err) => {
      console.warn('[Order Email Notification Warning]', err?.message || err);
    });
  }

  return supabaseUpdated || updatedOrder;
}

export async function handleGetPaymentConfig() {
  const catalog = loadRuntimeCatalog();
  const pmConfig = resolvePaymongoServerConfig();
  const enabledKeys = catalog.paymentProviders?.paymongoEnabledMethods || ALL_PAYMONGO_METHODS;
  const methods = enabledKeys
    .filter((k) => PAYMONGO_METHOD_META[k])
    .map((k) => ({
      key: PAYMONGO_METHOD_META[k].key,
      label: PAYMONGO_METHOD_META[k].label,
      description: PAYMONGO_METHOD_META[k].description,
      minPhp: Number((PAYMONGO_METHOD_META[k].minCentavos / 100).toFixed(2)),
    }));

  return {
    status: 200,
    body: {
      provider: 'paymongo',
      enabled: catalog.paymentProviders?.paymongoEnabled !== false,
      configured: pmConfig.configured,
      testMode: pmConfig.isTestMode,
      blockedLiveMode: pmConfig.blockedLiveMode,
      webhookConfigured: pmConfig.webhookConfigured,
      currency: 'PHP',
      currencySymbol: '₱',
      phpPerUsdRate: catalog.phpPerUsdRate,
      enabledMethods: methods,
    },
  };
}

export async function handleDiscountValidation(req) {
  const body = await readJsonBody(req);
  const code = String(body.code || '').trim().toUpperCase();

  if (!code) {
    return { status: 400, body: { valid: false, message: 'Please enter a promo code.' } };
  }

  const catalog = loadRuntimeCatalog();
  const match = catalog.discountCodes.find(
    (d) => String(d.code || '').toUpperCase() === code && d.active
  );

  if (!match) {
    return { status: 404, body: { valid: false, message: 'Invalid or expired promo code.' } };
  }

  let subtotalUsd = Number(body.subtotal);
  if (Array.isArray(body.items) && body.items.length > 0) {
    let computedUsd = 0;
    for (const item of body.items) {
      const prod = catalog.products.find((p) => p.id === item?.productId);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item?.quantity) || 1)));
      if (prod) {
        computedUsd += Number(prod.price || 0) * qty;
      }
    }
    if (computedUsd > 0 || !Number.isFinite(subtotalUsd)) {
      subtotalUsd = Number(computedUsd.toFixed(2));
    }
  }

  if (!Number.isFinite(subtotalUsd) || subtotalUsd < 0) {
    subtotalUsd = 0;
  }

  const calc = calculateDiscountBreakdown(match, subtotalUsd, catalog.phpPerUsdRate);
  if (!calc.valid) {
    return { status: 400, body: { valid: false, message: calc.message } };
  }

  return {
    status: 200,
    body: {
      valid: true,
      discountCode: match.code,
      type: match.type,
      value: match.value,
      minSpend: Number(match.minSpend || 0),
      minSpendPhp: calc.minSpendPhp,
      discountAmount: calc.discountUsd,
      discountAmountPhp: calc.discountPhp,
      phpPerUsdRate: catalog.phpPerUsdRate,
      message: calc.message,
    },
  };
}

export async function handleCheckoutSubmission(req) {
  const body = await readJsonBody(req);
  const catalog = loadRuntimeCatalog();
  const pmConfig = resolvePaymongoServerConfig();

  if (catalog.paymentProviders?.paymongoEnabled === false) {
    return {
      status: 503,
      body: {
        success: false,
        code: 'paymongo_disabled',
        error: 'PayMongo checkout is temporarily disabled in Store Settings.',
      },
    };
  }

  if (!pmConfig.configured) {
    return {
      status: 503,
      body: {
        success: false,
        code: pmConfig.blockedLiveMode ? 'paymongo_live_disabled' : 'paymongo_not_configured',
        error: pmConfig.blockedLiveMode
          ? 'Live PayMongo keys are blocked in sandbox verification mode. Use a PayMongo sk_test_ sandbox key.'
          : 'PayMongo payment gateway is not configured on the server. Add PAYMONGO_SECRET_KEY (sk_test_...) in environment variables.',
      },
    };
  }

  const customerEmail = String(body.customerEmail || '').trim();
  const customerName = String(body.customerName || '').trim();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const discountCode = String(body.discountCode || '').trim().toUpperCase();
  const billingDetails = sanitizeBillingDetails(body.billingDetails);
  const requestedMethod = String(body.paymentMethod || '').trim().toLowerCase();

  if (!customerName || customerName.length > 120) {
    return {
      status: 400,
      body: { success: false, error: 'Please enter your full name for billing and digital receipt.' },
    };
  }

  if (!isValidEmail(customerEmail)) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please enter a valid email address for digital download delivery.',
      },
    };
  }

  if (!billingDetails.country) {
    return {
      status: 400,
      body: { success: false, error: 'Please select your billing country or region.' },
    };
  }

  if (rawItems.length === 0) {
    return {
      status: 400,
      body: { success: false, error: 'Your shopping bag is empty.' },
    };
  }

  const phpRate = catalog.phpPerUsdRate;
  let subtotalUsd = 0;
  let subtotalCentavos = 0;
  const verifiedItems = [];

  for (const item of rawItems) {
    const prodId = String(item?.productId || '').trim();
    const prod = catalog.products.find((p) => p.id === prodId);
    if (!prod) {
      return {
        status: 400,
        body: {
          success: false,
          error: `One of the items in your bag could not be verified (${prodId || 'unknown'}).`,
        },
      };
    }

    const qty = Math.max(1, Math.min(50, Math.floor(Number(item?.quantity) || 1)));
    const unitUsd = Number(prod.price || 0);
    const unitPhp = usdToPhp(unitUsd, phpRate);
    const unitPhpCentavos = phpToCentavos(unitPhp);

    subtotalUsd += unitUsd * qty;
    subtotalCentavos += unitPhpCentavos * qty;

    verifiedItems.push({
      productId: prod.id,
      slug: prod.slug || prod.id,
      title: prod.title,
      price: unitPhp,
      unitUsd,
      quantity: qty,
      unitPhpCentavos,
      image: Array.isArray(prod.images) ? prod.images[0] || '' : '',
      deviceTypes: Array.isArray(prod.deviceTypes) ? prod.deviceTypes : ['desktop'],
      downloadFileName: prod.downloadFileName || `${prod.slug || prod.id}.jpg`,
    });
  }

  subtotalUsd = Number(subtotalUsd.toFixed(2));
  const subtotalPhp = Number((subtotalCentavos / 100).toFixed(2));

  let discountPhp = 0;
  let appliedCode = undefined;
  if (discountCode) {
    const discMatch = catalog.discountCodes.find(
      (d) => String(d.code || '').toUpperCase() === discountCode && d.active
    );
    if (!discMatch) {
      return {
        status: 400,
        body: { success: false, error: `Promo code "${discountCode}" is invalid or expired.` },
      };
    }
    const calc = calculateDiscountBreakdown(discMatch, subtotalUsd, phpRate);
    if (!calc.valid) {
      return {
        status: 400,
        body: { success: false, error: calc.message || 'Promo code minimum spend not met.' },
      };
    }
    discountPhp = calc.discountPhp;
    appliedCode = discMatch.code;
  }

  const discountCentavos = Math.min(subtotalCentavos, phpToCentavos(discountPhp));
  const totalCentavos = Math.max(0, subtotalCentavos - discountCentavos);
  const actualDiscountPhp = Number((discountCentavos / 100).toFixed(2));
  const totalPhp = Number((totalCentavos / 100).toFixed(2));

  const configuredMethods =
    catalog.paymentProviders?.paymongoEnabledMethods || ALL_PAYMONGO_METHODS;

  let paymentMethodTypes = configuredMethods.filter((m) => PAYMONGO_METHOD_META[m]);
  if (requestedMethod && requestedMethod !== 'all') {
    if (!configuredMethods.includes(requestedMethod)) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'The selected PayMongo payment method is not enabled.',
        },
      };
    }
    const minReq = PAYMONGO_METHOD_META[requestedMethod]?.minCentavos || 100;
    if (totalCentavos < minReq) {
      return {
        status: 400,
        body: {
          success: false,
          error: `${PAYMONGO_METHOD_META[requestedMethod].label} requires a minimum order total of ₱${(minReq / 100).toFixed(2)} PHP.`,
        },
      };
    }
    paymentMethodTypes = [requestedMethod];
  } else {
    paymentMethodTypes = paymentMethodTypes.filter(
      (m) => totalCentavos >= (PAYMONGO_METHOD_META[m]?.minCentavos || 100)
    );
  }

  if (totalCentavos < 100 || paymentMethodTypes.length === 0) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'PayMongo Checkout requires a minimum payable order amount of ₱20.00 PHP.',
      },
    };
  }

  // Link optional authenticated Supabase user
  const supaCfg = resolveSupabaseServerConfig();
  const bearer = extractBearerToken(req);
  let verifiedUserId = null;
  if (bearer && supaCfg.configured) {
    const authUser = await fetchVerifiedSupabaseUser(supaCfg, bearer);
    if (authUser?.id) {
      verifiedUserId = authUser.id;
    }
  }

  const origin = resolveRequestOrigin(req);
  const orderId = crypto.randomUUID();
  const orderNumber = `SHROOM-${1000 + Math.floor(100 + Math.random() * 8900)}`;
  const downloadToken = `shroom_dl_${crypto.randomBytes(12).toString('hex')}`;
  const lineItems = buildPaymongoLineItemsPhp(verifiedItems, discountCentavos, origin);

  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount * li.quantity, 0);
  if (lineItems.length === 0 || lineItemsTotal !== totalCentavos) {
    return {
      status: 500,
      body: {
        success: false,
        error: 'Unable to reconcile PHP line item totals for PayMongo Checkout.',
      },
    };
  }

  const successUrl = `${origin}/?checkout_status=success&order=${encodeURIComponent(downloadToken)}`;
  const cancelUrl = `${origin}/?checkout_status=cancelled&order=${encodeURIComponent(downloadToken)}`;

  const pmSession = await createPaymongoCheckoutSession({
    secretKey: pmConfig.secretKey,
    orderId,
    orderNumber,
    downloadToken,
    customerName,
    customerEmail,
    customerPhone: billingDetails.phone,
    billingDetails,
    lineItems,
    paymentMethodTypes,
    discountCode: appliedCode,
    successUrl,
    cancelUrl,
  });

  if (!pmSession.ok) {
    return {
      status: pmSession.status >= 400 && pmSession.status < 500 ? 400 : 502,
      body: {
        success: false,
        code: pmSession.code || 'paymongo_session_error',
        error: pmSession.error || 'Could not initialize PayMongo Checkout Session.',
      },
    };
  }

  const selectedLabel =
    paymentMethodTypes.length === 1 && PAYMONGO_METHOD_META[paymentMethodTypes[0]]
      ? `PayMongo · ${PAYMONGO_METHOD_META[paymentMethodTypes[0]].shortLabel} (Pending)`
      : 'PayMongo Hosted Checkout (Pending)';

  const orderItemsClean = verifiedItems.map(({ unitPhpCentavos: _ignored, ...rest }) => rest);
  const pendingOrder = {
    id: orderId,
    userId: verifiedUserId,
    orderNumber,
    customerEmail,
    customerName,
    billingDetails,
    items: orderItemsClean,
    subtotal: subtotalPhp,
    discount: actualDiscountPhp,
    discountCode: appliedCode,
    total: totalPhp,
    currency: 'PHP',
    paymentProvider: 'paymongo',
    paymentMethod: selectedLabel,
    paymentStatus: 'pending',
    isTestOrder: !pmSession.livemode,
    transactionId: pmSession.sessionId,
    paymentReference: pmSession.sessionId,
    paymongoCheckoutSessionId: pmSession.sessionId,
    paymongoPaymentIntentId: pmSession.paymentIntentId || undefined,
    downloadToken,
    downloadCount: 0,
    createdAt: new Date().toISOString(),
  };

  upsertLocalOrder(pendingOrder);
  const supaPersist = await persistPendingOrderToSupabase(pendingOrder, bearer);

  return {
    status: 200,
    body: {
      success: true,
      checkoutUrl: pmSession.checkoutUrl,
      sessionId: pmSession.sessionId,
      order: pendingOrder,
      persistedTo: {
        supabase: Boolean(supaPersist.saved),
      },
    },
  };
}

export async function handlePaymongoWebhook(req, rawBody) {
  const pmConfig = resolvePaymongoServerConfig();
  if (!pmConfig.webhookConfigured) {
    return {
      status: 503,
      body: { received: false, error: 'PAYMONGO_WEBHOOK_SECRET is not configured on the server.' },
    };
  }

  const sigHeader = req.headers?.['paymongo-signature'] || req.headers?.['x-paymongo-signature'];
  const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');

  let parsedPayload = null;
  try {
    parsedPayload = rawString ? JSON.parse(rawString) : null;
  } catch {
    return { status: 400, body: { received: false, error: 'Invalid JSON webhook body.' } };
  }

  const eventObj = parsedPayload?.data;
  const eventAttrs = eventObj?.attributes;
  const livemode = Boolean(eventAttrs?.livemode);

  if (livemode && pmConfig.blockedLiveMode) {
    return {
      status: 400,
      body: { received: false, error: 'Live-mode webhook rejected while live payments are disabled.' },
    };
  }

  const sigCheck = verifyPaymongoWebhookSignature({
    rawBody: rawString,
    signatureHeader: sigHeader,
    webhookSecret: pmConfig.webhookSecret,
    livemode,
  });

  if (!sigCheck.valid) {
    return {
      status: 401,
      body: { received: false, error: sigCheck.reason || 'Invalid webhook signature.' },
    };
  }

  const eventId = String(eventObj?.id || '').trim();
  const eventType = String(eventAttrs?.type || '').trim();
  const resource = eventAttrs?.data || {};
  const resourceAttrs = resource?.attributes || {};

  if (!eventId || !eventType) {
    return { status: 400, body: { received: false, error: 'Malformed PayMongo event payload.' } };
  }

  // Idempotency check across Supabase + local store
  const alreadyProcessed =
    hasLocalWebhookEvent(eventId) || (await checkSupabaseWebhookEventExists(eventId));
  if (alreadyProcessed) {
    return {
      status: 200,
      body: { received: true, duplicate: true, eventId, eventType },
    };
  }

  const origin = resolveRequestOrigin(req);
  const metadata = resourceAttrs?.metadata || {};

  let checkoutSessionId =
    resource.type === 'checkout_session'
      ? resource.id
      : resourceAttrs.checkout_session_id || metadata.checkout_session_id || null;

  let paymentIntentId =
    resource.type === 'payment_intent'
      ? resource.id
      : resourceAttrs.payment_intent?.id || resourceAttrs.payment_intent_id || null;

  let paymentId = resource.type === 'payment' ? resource.id : null;

  if (resource.type === 'checkout_session') {
    const payments = Array.isArray(resourceAttrs.payments) ? resourceAttrs.payments : [];
    const matchedPayment =
      payments.find((p) => String(p?.attributes?.status || '').toLowerCase() === 'paid') ||
      payments[0];
    if (matchedPayment?.id) paymentId = matchedPayment.id;
  }

  // Find corresponding order via Supabase + local dev catalog
  const localCatalog = loadRuntimeCatalog();
  let order =
    (await findSupabaseOrder({
      id: metadata.order_id,
      downloadToken: metadata.download_token,
      checkoutSessionId,
      paymentIntentId,
      orderNumber: resourceAttrs.reference_number || metadata.order_number,
    })) ||
    localCatalog.orders.find(
      (o) =>
        (checkoutSessionId && o.paymongoCheckoutSessionId === checkoutSessionId) ||
        (paymentIntentId && o.paymongoPaymentIntentId === paymentIntentId) ||
        (metadata.order_id && o.id === metadata.order_id) ||
        (metadata.download_token && o.downloadToken === metadata.download_token)
    ) ||
    null;

  if (eventType === 'checkout_session.payment.paid' || eventType === 'payment.paid') {
    if (!order) {
      // Acknowledge cleanly or return 404? Returning 200 after recording prevents infinite retries on foreign/unrelated events
      await insertSupabaseWebhookEvent({
        eventId,
        eventType,
        checkoutSessionId,
        paymentId,
        livemode,
        payload: { unmatched: true, metadata },
      });
      recordLocalWebhookEvent({ eventId, eventType, checkoutSessionId, paymentId, unmatched: true });
      return {
        status: 200,
        body: { received: true, matched: false, eventId, eventType },
      };
    }

    let paidVerification = null;
    if (resource.type === 'checkout_session') {
      paidVerification = extractVerifiedPaymentFromCheckoutSession(resource);
    } else if (resource.type === 'payment') {
      const pStatus = String(resourceAttrs.status || '').toLowerCase();
      if (pStatus === 'paid') {
        paidVerification = {
          paid: true,
          paymentId: resource.id,
          paymentIntentId,
          amountCentavos: Number(resourceAttrs.amount || 0),
          currency: String(resourceAttrs.currency || 'PHP').toUpperCase(),
          paymentMethodLabel: formatPaymongoPaymentMethodLabel(resource),
          paidAt:
            typeof resourceAttrs.paid_at === 'number'
              ? new Date(resourceAttrs.paid_at * 1000).toISOString()
              : new Date().toISOString(),
        };
      }
    }

    if (!paidVerification?.paid) {
      return {
        status: 200,
        body: { received: true, ignored: true, reason: 'No paid payment object found in event.' },
      };
    }

    const expectedCentavos = phpToCentavos(order.total);
    if (
      paidVerification.currency !== 'PHP' ||
      (expectedCentavos > 0 && paidVerification.amountCentavos < expectedCentavos)
    ) {
      return {
        status: 400,
        body: {
          received: false,
          error: 'Paid amount or currency mismatch against stored order total.',
        },
      };
    }

    await finalizeVerifiedPaidOrder({
      order,
      paymentId: paidVerification.paymentId || paymentId,
      paymentIntentId: paidVerification.paymentIntentId || paymentIntentId,
      paymentMethodLabel: paidVerification.paymentMethodLabel,
      paidAt: paidVerification.paidAt,
      eventId,
      receiptOrigin: origin,
    });
  } else if (eventType === 'payment.failed') {
    if (order && order.paymentStatus !== 'paid' && order.paymentStatus !== 'completed') {
      const reason =
        resourceAttrs.failed_message ||
        resourceAttrs.last_payment_error?.failed_message ||
        'Payment failed on PayMongo.';
      const failedOrder = {
        ...order,
        paymentStatus: 'failed',
        paymongoPaymentId: paymentId || order.paymongoPaymentId,
        paymongoEventId: eventId,
        failureReason: reason,
      };
      upsertLocalOrder(failedOrder);
      await updateSupabaseOrderPatch(order.id, {
        status: 'failed',
        payment_status: 'failed',
        paymongo_payment_id: paymentId || null,
        paymongo_event_id: eventId,
        failure_reason: reason,
      });
    }
  } else if (eventType === 'checkout_session.expired') {
    if (order && order.paymentStatus === 'pending') {
      const expiredOrder = {
        ...order,
        paymentStatus: 'expired',
        paymongoEventId: eventId,
      };
      upsertLocalOrder(expiredOrder);
      await updateSupabaseOrderPatch(order.id, {
        status: 'expired',
        payment_status: 'expired',
        paymongo_event_id: eventId,
      });
    }
  }

  await insertSupabaseWebhookEvent({
    eventId,
    eventType,
    checkoutSessionId,
    paymentId,
    livemode,
    payload: { orderId: order?.id || null, orderNumber: order?.orderNumber || null },
  });
  recordLocalWebhookEvent({
    eventId,
    eventType,
    checkoutSessionId,
    paymentId,
    orderId: order?.id || null,
  });

  return {
    status: 200,
    body: { received: true, eventId, eventType, orderNumber: order?.orderNumber || null },
  };
}

async function reconcileOrderWithPaymongoIfPending(order, receiptOrigin = '') {
  if (!order) return null;
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
    return order;
  }
  if (!order.paymongoCheckoutSessionId) {
    return order;
  }

  const pmConfig = resolvePaymongoServerConfig();
  if (!pmConfig.configured) {
    return order;
  }

  const sessionRes = await retrievePaymongoCheckoutSession(
    pmConfig.secretKey,
    order.paymongoCheckoutSessionId
  );
  if (!sessionRes.ok || !sessionRes.session) {
    return order;
  }

  const extracted = extractVerifiedPaymentFromCheckoutSession(sessionRes.session);
  if (extracted.paid) {
    const expectedCentavos = phpToCentavos(order.total);
    if (
      extracted.currency === 'PHP' &&
      (expectedCentavos === 0 || extracted.amountCentavos >= expectedCentavos)
    ) {
      return await finalizeVerifiedPaidOrder({
        order,
        paymentId: extracted.paymentId,
        paymentIntentId: extracted.paymentIntentId,
        paymentMethodLabel: extracted.paymentMethodLabel,
        paidAt: extracted.paidAt,
        eventId: order.paymongoEventId || undefined,
        receiptOrigin,
      });
    }
  }

  if (extracted.status === 'failed' && order.paymentStatus === 'pending') {
    const updated = {
      ...order,
      paymentStatus: 'failed',
      paymongoPaymentId: extracted.paymentId || order.paymongoPaymentId,
      failureReason: extracted.failureReason || 'Payment failed.',
    };
    upsertLocalOrder(updated);
    await updateSupabaseOrderPatch(order.id, {
      status: 'failed',
      payment_status: 'failed',
      paymongo_payment_id: updated.paymongoPaymentId || null,
      failure_reason: updated.failureReason,
    });
    return updated;
  }

  if (extracted.status === 'expired' && order.paymentStatus === 'pending') {
    const updated = {
      ...order,
      paymentStatus: 'expired',
    };
    upsertLocalOrder(updated);
    await updateSupabaseOrderPatch(order.id, {
      status: 'expired',
      payment_status: 'expired',
    });
    return updated;
  }

  return order;
}

export async function handleListOrders(req) {
  const urlObj = new URL(req.url || '/api/orders', 'http://localhost');
  const emailFilter = String(urlObj.searchParams.get('email') || '').trim().toLowerCase();

  const cfg = resolveSupabaseServerConfig();
  const bearer = extractBearerToken(req);
  let verifiedUser = null;
  let isAdmin = false;

  if (cfg.configured && bearer) {
    const adminCheck = await verifyAdminRequest(req);
    if (adminCheck.ok) {
      isAdmin = true;
      verifiedUser = adminCheck.user;
    } else {
      verifiedUser = await fetchVerifiedSupabaseUser(cfg, bearer);
    }
  }

  if (!isAdmin && !verifiedUser) {
    return {
      status: 401,
      body: { error: 'Please sign in to view your orders.' },
    };
  }

  const verifiedEmailLower = String(verifiedUser?.email || '').trim().toLowerCase();
  if (!isAdmin && emailFilter && emailFilter !== verifiedEmailLower) {
    return {
      status: 403,
      body: { error: 'You may only view orders associated with your signed-in account.' },
    };
  }

  const catalog = loadRuntimeCatalog();
  const localOrders = Array.isArray(catalog.orders) ? catalog.orders : [];

  let supabaseOrders = [];
  if (cfg.configured) {
    const authToken = isAdmin && cfg.serviceRoleKey ? cfg.serviceRoleKey : bearer || cfg.anonKey;
    const apiKey = isAdmin && cfg.serviceRoleKey ? cfg.serviceRoleKey : cfg.anonKey;
    const filters = ['select=*', 'order=created_at.desc'];

    if (!isAdmin && verifiedUser) {
      filters.push(
        `or=(user_id.eq.${encodeURIComponent(verifiedUser.id)},customer_email.ilike.${encodeURIComponent(verifiedEmailLower)})`
      );
    } else if (emailFilter) {
      filters.push(`customer_email=ilike.${encodeURIComponent(emailFilter)}`);
    }

    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders?${filters.join('&')}`, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows)) {
          supabaseOrders = rows.map(buildOrderFromSupabaseRow).filter(Boolean);
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }

  const targetEmail = isAdmin ? emailFilter : verifiedEmailLower;

  const mergedMap = new Map();
  for (const ord of [...supabaseOrders, ...localOrders]) {
    if (!ord) continue;
    const ordEmailLower = String(ord.customerEmail || '').trim().toLowerCase();
    if (!isAdmin) {
      const matchesUser =
        (ord.userId && verifiedUser?.id && ord.userId === verifiedUser.id) ||
        (verifiedEmailLower && ordEmailLower === verifiedEmailLower);
      if (!matchesUser) continue;
    } else if (targetEmail && ordEmailLower !== targetEmail) {
      continue;
    }
    const key = ord.downloadToken || ord.orderNumber || ord.id;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, ord);
    }
  }

  const result = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { status: 200, body: result };
}

export async function handleGetOrderByToken(req, idOrToken) {
  const param = String(idOrToken || '').trim();
  if (!param) {
    return { status: 400, body: { error: 'Missing order token or ID.' } };
  }

  const urlObj = new URL(req.url || `/api/orders/${param}`, 'http://localhost');
  const shouldVerify = urlObj.searchParams.get('verify') === '1';

  const cfg = resolveSupabaseServerConfig();
  const bearer = extractBearerToken(req);
  let verifiedUser = null;
  let isAdmin = false;

  if (cfg.configured && bearer) {
    const adminCheck = await verifyAdminRequest(req);
    if (adminCheck.ok) {
      isAdmin = true;
      verifiedUser = adminCheck.user;
    } else {
      verifiedUser = await fetchVerifiedSupabaseUser(cfg, bearer);
    }
  }

  const isAuthorizedForOrder = (ord) => {
    if (!ord) return false;
    if (ord.downloadToken === param) return true;
    if (isAdmin) return true;
    if (!verifiedUser) return false;
    const verifiedEmailLower = String(verifiedUser.email || '').trim().toLowerCase();
    const ordEmailLower = String(ord.customerEmail || '').trim().toLowerCase();
    return Boolean(
      (ord.userId && ord.userId === verifiedUser.id) ||
        (verifiedEmailLower && ordEmailLower === verifiedEmailLower)
    );
  };

  const catalog = loadRuntimeCatalog();
  const localMatch = (catalog.orders || []).find(
    (o) => o.downloadToken === param || o.id === param || o.orderNumber === param
  );
  const supaMatch = await findSupabaseOrder({
    id: isValidUuid(param) ? param : undefined,
    downloadToken: param,
    orderNumber: param,
  });

  let order = supaMatch || localMatch || null;
  if (!order || !isAuthorizedForOrder(order)) {
    return { status: 404, body: { error: 'Order not found' } };
  }

  if (shouldVerify && order.paymentStatus === 'pending') {
    order = await reconcileOrderWithPaymongoIfPending(order, resolveRequestOrigin(req));
  }

  return { status: 200, body: order };
}

export async function handleOrderAction(req, idOrToken) {
  const param = String(idOrToken || '').trim();
  const body = await readJsonBody(req);
  const action = String(body.action || '').trim().toLowerCase();

  if (!param) {
    return { status: 400, body: { success: false, error: 'Missing order reference.' } };
  }

  const cfg = resolveSupabaseServerConfig();
  const bearer = extractBearerToken(req);
  let verifiedUser = null;
  let isAdmin = false;

  if (cfg.configured && bearer) {
    const adminCheck = await verifyAdminRequest(req);
    if (adminCheck.ok) {
      isAdmin = true;
      verifiedUser = adminCheck.user;
    } else {
      verifiedUser = await fetchVerifiedSupabaseUser(cfg, bearer);
    }
  }

  const catalog = loadRuntimeCatalog();
  const localMatch = (catalog.orders || []).find(
    (o) => o.downloadToken === param || o.id === param || o.orderNumber === param
  );
  const supaMatch = await findSupabaseOrder({
    id: isValidUuid(param) ? param : undefined,
    downloadToken: param,
    orderNumber: param,
  });

  let order = supaMatch || localMatch || null;
  if (!order) {
    return { status: 404, body: { success: false, error: 'Order not found.' } };
  }

  const isOwnerByToken = order.downloadToken === param;
  const isOwnerByAccount =
    verifiedUser &&
    ((order.userId && order.userId === verifiedUser.id) ||
      String(order.customerEmail || '').toLowerCase() === String(verifiedUser.email || '').toLowerCase());

  if (!isOwnerByToken && !isOwnerByAccount && !isAdmin) {
    return { status: 403, body: { success: false, error: 'Not authorized for this order.' } };
  }

  if (action === 'verify') {
    if (!isAdmin && !isOwnerByToken && !isOwnerByAccount) {
      return { status: 403, body: { success: false, error: 'Unauthorized verification attempt.' } };
    }
    const reconciled = await reconcileOrderWithPaymongoIfPending(order, resolveRequestOrigin(req));
    return {
      status: 200,
      body: {
        success: true,
        verifiedPaid: isOrderDownloadAuthorized(reconciled),
        order: reconciled,
      },
    };
  }

  if (action === 'cancel_session') {
    // Reconcile against PayMongo first so a genuinely paid checkout is NEVER downgraded!
    const checked = await reconcileOrderWithPaymongoIfPending(order, resolveRequestOrigin(req));
    if (isOrderDownloadAuthorized(checked)) {
      return {
        status: 200,
        body: { success: true, verifiedPaid: true, order: checked },
      };
    }
    if (checked.paymentStatus === 'pending') {
      const cancelledOrder = {
        ...checked,
        paymentStatus: 'cancelled',
      };
      upsertLocalOrder(cancelledOrder);
      const updatedSupa = await updateSupabaseOrderPatch(checked.id, {
        status: 'cancelled',
        payment_status: 'cancelled',
      });
      return {
        status: 200,
        body: {
          success: true,
          verifiedPaid: false,
          order: updatedSupa || cancelledOrder,
        },
      };
    }
    return {
      status: 200,
      body: { success: true, verifiedPaid: false, order: checked },
    };
  }

  return {
    status: 400,
    body: { success: false, error: 'Unsupported order action.' },
  };
}

export async function handleAuthorizedDownload(req, tokenParam, explicitProductId = '') {
  const token = String(tokenParam || '').trim();
  const urlObj = new URL(req.url || `/api/downloads/${token}`, 'http://localhost');
  const productId = String(explicitProductId || urlObj.searchParams.get('productId') || '').trim();

  if (!token) {
    return {
      kind: 'json',
      status: 400,
      body: { authorized: false, error: 'Missing download token.' },
    };
  }

  const catalog = loadRuntimeCatalog();
  const localMatch = (catalog.orders || []).find((o) => o.downloadToken === token);
  const supaMatch = await findSupabaseOrder({ downloadToken: token });
  let order = supaMatch || localMatch || null;

  if (!order) {
    return {
      kind: 'json',
      status: 404,
      body: { authorized: false, error: 'Invalid or expired download token.' },
    };
  }

  if (!isOrderDownloadAuthorized(order) && order.paymentStatus === 'pending') {
    order = await reconcileOrderWithPaymongoIfPending(order, resolveRequestOrigin(req));
  }

  if (!isOrderDownloadAuthorized(order)) {
    return {
      kind: 'json',
      status: 403,
      body: {
        authorized: false,
        paymentStatus: order.paymentStatus || 'pending',
        error:
          order.paymentStatus === 'cancelled'
            ? 'This checkout was cancelled. Downloads require a verified payment.'
            : order.paymentStatus === 'failed'
            ? 'Payment failed for this order. Please retry checkout to unlock downloads.'
            : 'Payment has not been verified yet. Downloads unlock automatically once PayMongo confirms your payment.',
      },
    };
  }

  // Metadata response when no specific productId file is requested
  if (!productId) {
    return {
      kind: 'json',
      status: 200,
      body: {
        authorized: true,
        orderNumber: order.orderNumber,
        purchasedAt: order.paidAt || order.createdAt,
        customerEmail: order.customerEmail,
        paymentStatus: order.paymentStatus,
        items: (order.items || []).map((item) => {
          const prod = catalog.products.find((p) => p.id === item.productId);
          return {
            ...item,
            resolutions: prod?.resolutions || ['4K UHD', 'Retina'],
            fileFormat: prod?.fileFormat || 'PNG (Lossless 300 DPI)',
            fileSize: prod?.fileSize || '25 MB',
            whatsIncluded: prod?.whatsIncluded || ['Digital Wallpaper'],
            downloadFileName:
              item.downloadFileName ||
              prod?.downloadFileName ||
              `${String(item.title || 'wallpaper').toLowerCase().replace(/\s+/g, '_')}.jpg`,
            downloadApiUrl: `/api/downloads/${encodeURIComponent(token)}?productId=${encodeURIComponent(
              item.productId
            )}`,
          };
        }),
      },
    };
  }

  // Authorized file delivery for a specific purchased productId
  const purchasedItem = (order.items || []).find((i) => i.productId === productId);
  if (!purchasedItem) {
    return {
      kind: 'json',
      status: 403,
      body: {
        authorized: false,
        error: 'The requested wallpaper is not included in this verified order.',
      },
    };
  }

  const catalogProd = catalog.products.find((p) => p.id === productId);
  const rawName =
    purchasedItem.downloadFileName ||
    catalogProd?.downloadFileName ||
    `${String(purchasedItem.title || 'sleepyshroom_wallpaper').toLowerCase().replace(/\s+/g, '_')}.jpg`;
  const cleanFilename =
    rawName.toLowerCase().endsWith('.jpg') || rawName.toLowerCase().endsWith('.png')
      ? rawName
      : `${rawName.replace(/\.zip$/i, '')}.jpg`;

  const nextDownloadCount = (order.downloadCount || 0) + 1;
  upsertLocalOrder({ ...order, downloadCount: nextDownloadCount });
  await updateSupabaseOrderPatch(order.id, { download_count: nextDownloadCount });

  const imageRelPath = catalogProd?.images?.[0] || purchasedItem.image || '';
  if (imageRelPath.startsWith('/')) {
    const publicFilePath = path.resolve(getRootDir(), 'public', imageRelPath.replace(/^\/+/, ''));
    const publicRoot = path.resolve(getRootDir(), 'public');
    if (publicFilePath.startsWith(publicRoot) && fs.existsSync(publicFilePath)) {
      const buffer = fs.readFileSync(publicFilePath);
      const ext = path.extname(publicFilePath).toLowerCase();
      return {
        kind: 'binary',
        status: 200,
        contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
        filename: cleanFilename,
        buffer,
      };
    }

    // Serverless fallback: fetch static image asset from origin after server-side payment authorization succeeded
    try {
      const origin = resolveRequestOrigin(req);
      const assetRes = await fetch(`${origin}${imageRelPath}`);
      if (assetRes.ok) {
        const arrBuf = await assetRes.arrayBuffer();
        return {
          kind: 'binary',
          status: 200,
          contentType: assetRes.headers.get('content-type') || 'image/jpeg',
          filename: cleanFilename,
          buffer: Buffer.from(arrBuf),
        };
      }
    } catch {
      // Fall through cleanly
    }
  }

  return {
    kind: 'binary',
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    filename: cleanFilename.replace(/\.(jpg|png)$/i, '_license.txt'),
    buffer: Buffer.from(
      `=== SLEEPYSHROOM VERIFIED DIGITAL DOWNLOAD ===\n\nOrder: ${order.orderNumber}\nTitle: ${purchasedItem.title}\nCustomer: ${order.customerEmail}\nThank you for supporting sleepyshroom!\n`,
      'utf-8'
    ),
  };
}

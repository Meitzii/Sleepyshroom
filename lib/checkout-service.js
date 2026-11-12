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
  usdToCents,
  centsToUsd,
  resolvePaypalServerConfig,
  createPaypalOrder,
  retrievePaypalOrder,
  capturePaypalOrder,
  refundPaypalCapture,
  verifyPaypalWebhookSignature,
  extractPaypalOrderPaymentDetails,
} from './paypal.js';
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
    country: String(obj.country || 'United States').trim().slice(0, 100),
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
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
    .split(',')[0]
    .trim();
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
        order.paypalCaptureId ||
        order.paypalOrderId ||
        order.transactionId ||
        order.paymentReference
    );
  }
  return true;
}

function calculateDiscountBreakdown(discountMatch, subtotalUsd) {
  if (!discountMatch || !discountMatch.active) {
    return { valid: false, discountUsd: 0, discountCents: 0, minSpendUsd: 0 };
  }

  const subtotalCents = usdToCents(subtotalUsd);
  const minSpendUsd = Number(discountMatch.minSpend || 0);
  const minSpendCents = usdToCents(minSpendUsd);

  if (subtotalCents < minSpendCents) {
    return {
      valid: false,
      discountUsd: 0,
      discountCents: 0,
      minSpendUsd,
      message: `Minimum spend of $${minSpendUsd.toFixed(2)} USD required for ${discountMatch.code}.`,
    };
  }

  const rawCents =
    discountMatch.type === 'percentage'
      ? Math.round((subtotalCents * Number(discountMatch.value || 0)) / 100)
      : usdToCents(Number(discountMatch.value || 0));

  const discountCents = Math.max(0, Math.min(subtotalCents, rawCents));
  const discountUsd = centsToUsd(discountCents);

  return {
    valid: true,
    discountUsd,
    discountCents,
    minSpendUsd,
    message:
      discountMatch.type === 'percentage'
        ? `${discountMatch.value}% off applied!`
        : `$${centsToUsd(usdToCents(Number(discountMatch.value || 0))).toFixed(2)} USD off applied!`,
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
    orderNumber: String(
      row.order_number || `SHROOM-${String(row.id).slice(0, 6).toUpperCase()}`
    ),
    customerEmail: String(row.customer_email || ''),
    customerName: String(row.customer_name || 'Valued Customer'),
    billingDetails:
      row.billing_details && typeof row.billing_details === 'object' ? row.billing_details : undefined,
    items,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    discountCode: row.discount_code || undefined,
    total: Number(total.toFixed(2)),
    currency: String(row.currency || 'USD').toUpperCase(),
    paymentProvider: String(row.payment_provider || 'paypal'),
    paymentMethod: String(row.payment_method || 'PayPal'),
    paymentStatus: normalizedStatus,
    transactionId: String(
      row.transaction_id ||
        row.paypal_capture_id ||
        row.paypal_order_id ||
        row.payment_reference ||
        ''
    ),
    paymentReference: String(
      row.payment_reference ||
        row.paypal_capture_id ||
        row.paypal_order_id ||
        ''
    ),
    paypalOrderId: row.paypal_order_id || undefined,
    paypalCaptureId: row.paypal_capture_id || undefined,
    paypalPayerId: row.paypal_payer_id || undefined,
    paypalEventId: row.paypal_event_id || undefined,
    paypalRefundId: row.paypal_refund_id || undefined,
    paidAt: row.paid_at || undefined,
    refundedAt: row.refunded_at || undefined,
    refundReason: row.refund_reason || undefined,
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
        p_currency: order.currency || 'USD',
        p_payment_provider: 'paypal',
        p_payment_method: order.paymentMethod,
        p_paypal_order_id: order.paypalOrderId,
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
    const corePayload = {
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
      currency: order.currency || 'USD',
      payment_provider: 'paypal',
      payment_method: order.paymentMethod,
      payment_status: 'pending',
      payment_reference: order.paypalOrderId,
      transaction_id: order.paypalOrderId,
      download_token: order.downloadToken,
      download_count: 0,
      billing_details: order.billingDetails || {},
      items_json: order.items,
    };

    try {
      const fullRes = await fetch(`${cfg.supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          ...corePayload,
          paypal_order_id: order.paypalOrderId,
        }),
      });
      if (fullRes.ok) {
        return { saved: true };
      }

      if (fullRes.status === 400 || fullRes.status === 404) {
        const coreRes = await fetch(`${cfg.supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            apikey: cfg.serviceRoleKey,
            Authorization: `Bearer ${cfg.serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(corePayload),
        });
        return { saved: coreRes.ok };
      }
    } catch {
      return { saved: false, reason: 'network_error' };
    }
  }

  return { saved: false, reason: 'service_role_or_migration_required' };
}

async function findSupabaseOrder({ id, downloadToken, paypalOrderId, captureId, orderNumber }) {
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
  if (paypalOrderId) {
    queries.push(`paypal_order_id=eq.${encodeURIComponent(paypalOrderId)}`);
    queries.push(`payment_reference=eq.${encodeURIComponent(paypalOrderId)}`);
  }
  if (captureId) {
    queries.push(`paypal_capture_id=eq.${encodeURIComponent(captureId)}`);
    queries.push(`transaction_id=eq.${encodeURIComponent(captureId)}`);
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

const PAYPAL_SPECIFIC_COLUMNS = [
  'paypal_order_id',
  'paypal_capture_id',
  'paypal_payer_id',
  'paypal_event_id',
  'paypal_refund_id',
  'refunded_at',
  'refund_reason',
];

async function updateSupabaseOrderPatch(orderId, patch) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured || !cfg.serviceRoleKey || !orderId) return null;

  const sendPatch = async (bodyObj) => {
    return fetch(`${cfg.supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`, {
      method: 'PATCH',
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        ...bodyObj,
        updated_at: new Date().toISOString(),
      }),
    });
  };

  try {
    const res = await sendPatch(patch);
    if (res.ok) {
      const rows = await res.json().catch(() => []);
      return buildOrderFromSupabaseRow(Array.isArray(rows) ? rows[0] : null);
    }

    if (res.status === 400) {
      const corePatch = { ...patch };
      let strippedAny = false;
      for (const col of PAYPAL_SPECIFIC_COLUMNS) {
        if (col in corePatch) {
          delete corePatch[col];
          strippedAny = true;
        }
      }
      if (strippedAny && Object.keys(corePatch).length > 0) {
        const fallbackRes = await sendPatch(corePatch);
        if (fallbackRes.ok) {
          const rows = await fallbackRes.json().catch(() => []);
          return buildOrderFromSupabaseRow(Array.isArray(rows) ? rows[0] : null);
        }
      }
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
  paypalOrderId,
  captureId,
  livemode,
  payload,
}) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured || !cfg.serviceRoleKey || !eventId) {
    return { inserted: false, duplicate: false };
  }
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
        provider: 'paypal',
        event_id: eventId,
        event_type: eventType,
        checkout_session_id: paypalOrderId || null,
        payment_id: captureId || null,
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
  paypalOrderId,
  captureId,
  payerId,
  paymentMethodLabel,
  paidAt,
  eventId,
  receiptOrigin,
}) {
  const currentStatus = String(order.paymentStatus || '').toLowerCase();
  const wasAlreadyPaid = currentStatus === 'paid' || currentStatus === 'completed';

  const nowIso = paidAt || new Date().toISOString();
  const resolvedPaypalOrderId = paypalOrderId || order.paypalOrderId;
  const resolvedCaptureId = captureId || order.paypalCaptureId;

  const updatedOrder = {
    ...order,
    paymentStatus: 'paid',
    paymentProvider: 'paypal',
    paymentMethod: paymentMethodLabel || order.paymentMethod || 'PayPal',
    paypalOrderId: resolvedPaypalOrderId,
    paypalCaptureId: resolvedCaptureId,
    paypalPayerId: payerId || order.paypalPayerId,
    paypalEventId: eventId || order.paypalEventId,
    transactionId: resolvedCaptureId || resolvedPaypalOrderId || order.transactionId,
    paymentReference: resolvedCaptureId || resolvedPaypalOrderId || order.paymentReference,
    paidAt: order.paidAt || nowIso,
    failureReason: undefined,
  };

  upsertLocalOrder(updatedOrder);
  const supabaseUpdated = await updateSupabaseOrderPatch(order.id, {
    status: 'paid',
    payment_status: 'paid',
    payment_provider: 'paypal',
    payment_method: updatedOrder.paymentMethod,
    payment_reference: updatedOrder.paymentReference,
    transaction_id: updatedOrder.transactionId,
    paypal_order_id: updatedOrder.paypalOrderId || null,
    paypal_capture_id: updatedOrder.paypalCaptureId || null,
    paypal_payer_id: updatedOrder.paypalPayerId || null,
    paypal_event_id: updatedOrder.paypalEventId || null,
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

async function finalizeRefundedOrder({
  order,
  refundId,
  reason,
  refundedAt,
  eventId,
}) {
  const nowIso = refundedAt || new Date().toISOString();
  const updatedOrder = {
    ...order,
    paymentStatus: 'refunded',
    paypalRefundId: refundId || order.paypalRefundId,
    paypalEventId: eventId || order.paypalEventId,
    refundedAt: order.refundedAt || nowIso,
    refundReason: reason || order.refundReason || 'Refunded via PayPal',
  };

  upsertLocalOrder(updatedOrder);
  const supabaseUpdated = await updateSupabaseOrderPatch(order.id, {
    status: 'refunded',
    payment_status: 'refunded',
    paypal_refund_id: updatedOrder.paypalRefundId || null,
    paypal_event_id: updatedOrder.paypalEventId || null,
    refunded_at: updatedOrder.refundedAt,
    refund_reason: updatedOrder.refundReason,
  });

  return supabaseUpdated || updatedOrder;
}

function assertCapturedPaypalMatchesOrder(order, details) {
  const expectedCents = usdToCents(order.total);
  const actualCents = usdToCents(details.capturedAmount ?? order.total);

  if (details.capturedCurrency && details.capturedCurrency !== 'USD') {
    const err = new Error(
      `PayPal currency mismatch: expected USD, received ${details.capturedCurrency}.`
    );
    err.statusCode = 400;
    throw err;
  }

  if (expectedCents > 0 && details.capturedAmount !== undefined && actualCents < expectedCents) {
    const err = new Error('Captured PayPal amount is less than the stored order total.');
    err.statusCode = 400;
    throw err;
  }

  if (details.orderNumber && order.orderNumber && details.orderNumber !== order.orderNumber) {
    const err = new Error('PayPal order reference does not match this Sleepyshroom order.');
    err.statusCode = 400;
    throw err;
  }
}

async function reconcileOrderWithPaypal(order, { receiptOrigin = '', captureIfApproved = false } = {}) {
  if (!order) return null;

  const catalog = loadRuntimeCatalog();
  const paypalConfig = resolvePaypalServerConfig({ paymentProviders: catalog.paymentProviders });
  const targetPaypalOrderId = order.paypalOrderId || (String(order.paymentProvider || '').toLowerCase() === 'paypal' ? order.paymentReference : '');

  if (!paypalConfig.configured || !targetPaypalOrderId) {
    return order;
  }

  let ppOrder;
  try {
    ppOrder = await retrievePaypalOrder(paypalConfig, targetPaypalOrderId);
  } catch {
    return order;
  }

  let details = extractPaypalOrderPaymentDetails(ppOrder);

  // If approved by buyer and caller wants completion, execute server-side capture
  if (
    captureIfApproved &&
    details.paypalOrderStatus === 'APPROVED' &&
    String(order.paymentStatus || '').toLowerCase() === 'pending'
  ) {
    try {
      const captured = await capturePaypalOrder(paypalConfig, targetPaypalOrderId, {
        requestId: `capture-${order.id}-${targetPaypalOrderId}`,
      });
      ppOrder = captured;
      details = extractPaypalOrderPaymentDetails(captured);
    } catch (err) {
      const reason = err?.message || 'PayPal payment capture failed.';
      const failedOrder = { ...order, paymentStatus: 'failed', failureReason: reason };
      upsertLocalOrder(failedOrder);
      await updateSupabaseOrderPatch(order.id, {
        status: 'failed',
        payment_status: 'failed',
        failure_reason: reason,
      });
      return failedOrder;
    }
  }

  if (details.captureStatus === 'REFUNDED' || Boolean(details.refundId)) {
    if (String(order.paymentStatus || '').toLowerCase() !== 'refunded') {
      return await finalizeRefundedOrder({
        order,
        refundId: details.refundId,
        reason: order.refundReason || 'Refunded in PayPal',
        refundedAt: new Date().toISOString(),
      });
    }
    return order;
  }

  if (
    details.paypalOrderStatus === 'COMPLETED' &&
    (!details.captureStatus || details.captureStatus === 'COMPLETED')
  ) {
    assertCapturedPaypalMatchesOrder(order, details);
    return await finalizeVerifiedPaidOrder({
      order,
      paypalOrderId: details.paypalOrderId || targetPaypalOrderId,
      captureId: details.captureId,
      payerId: details.payerId,
      paymentMethodLabel: details.paymentMethodLabel,
      paidAt: new Date().toISOString(),
      receiptOrigin,
    });
  }

  if (details.captureStatus === 'DECLINED' || details.captureStatus === 'FAILED') {
    const failedOrder = {
      ...order,
      paymentStatus: 'failed',
      paypalCaptureId: details.captureId || order.paypalCaptureId,
      failureReason: 'Payment was declined by PayPal.',
    };
    upsertLocalOrder(failedOrder);
    await updateSupabaseOrderPatch(order.id, {
      status: 'failed',
      payment_status: 'failed',
      paypal_capture_id: failedOrder.paypalCaptureId || null,
      failure_reason: failedOrder.failureReason,
    });
    return failedOrder;
  }

  if (details.paypalOrderStatus === 'VOIDED' && order.paymentStatus === 'pending') {
    const cancelled = { ...order, paymentStatus: 'cancelled' };
    upsertLocalOrder(cancelled);
    await updateSupabaseOrderPatch(order.id, {
      status: 'cancelled',
      payment_status: 'cancelled',
    });
    return cancelled;
  }

  return order;
}

export async function handleGetPaymentConfig() {
  const catalog = loadRuntimeCatalog();
  const paypalConfig = resolvePaypalServerConfig({ paymentProviders: catalog.paymentProviders });
  const enabled = catalog.paymentProviders?.paypalEnabled !== false;

  return {
    status: 200,
    body: {
      provider: 'paypal',
      enabled,
      configured: paypalConfig.configured,
      webhookConfigured: paypalConfig.webhookConfigured,
      clientId: enabled && paypalConfig.configured ? paypalConfig.clientId : '',
      environment: paypalConfig.environment,
      testMode: paypalConfig.environment !== 'live',
      allowCards: catalog.paymentProviders?.paypalAllowCards !== false,
      currency: 'USD',
      currencySymbol: '$',
      minOrderUsd: 0.5,
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
    let computedCents = 0;
    for (const item of body.items) {
      const prod = catalog.products.find((p) => p.id === item?.productId);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item?.quantity) || 1)));
      if (prod) {
        computedCents += usdToCents(prod.price) * qty;
      }
    }
    if (computedCents > 0 || !Number.isFinite(subtotalUsd)) {
      subtotalUsd = centsToUsd(computedCents);
    }
  }

  if (!Number.isFinite(subtotalUsd) || subtotalUsd < 0) {
    subtotalUsd = 0;
  }

  const calc = calculateDiscountBreakdown(match, subtotalUsd);
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
      discountAmount: calc.discountUsd,
      message: calc.message,
    },
  };
}

export async function handleCheckoutSubmission(req) {
  const body = await readJsonBody(req);
  const catalog = loadRuntimeCatalog();
  const paypalConfig = resolvePaypalServerConfig({ paymentProviders: catalog.paymentProviders });

  if (catalog.paymentProviders?.paypalEnabled === false) {
    return {
      status: 503,
      body: {
        success: false,
        code: 'paypal_disabled',
        error: 'PayPal Checkout is temporarily disabled in Store Settings.',
      },
    };
  }

  const customerEmail = String(body.customerEmail || '').trim();
  const customerName = String(body.customerName || '').trim();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const discountCode = String(body.discountCode || '').trim().toUpperCase();
  const billingDetails = sanitizeBillingDetails(body.billingDetails);

  if (!customerName || customerName.length > 120) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please enter your full name for billing and digital receipt.',
      },
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

  let subtotalCents = 0;
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
    const unitCents = usdToCents(prod.price);
    const unitUsd = centsToUsd(unitCents);

    subtotalCents += unitCents * qty;
    verifiedItems.push({
      productId: prod.id,
      slug: prod.slug || prod.id,
      title: prod.title,
      category: prod.collection || prod.theme || 'Digital',
      price: unitUsd,
      unitCents,
      quantity: qty,
      image: Array.isArray(prod.images) ? prod.images[0] || '' : '',
      deviceTypes: Array.isArray(prod.deviceTypes) ? prod.deviceTypes : ['desktop'],
      downloadFileName: prod.downloadFileName || `${prod.slug || prod.id}.jpg`,
    });
  }

  const subtotalUsd = centsToUsd(subtotalCents);
  let discountCents = 0;
  let appliedCode = undefined;

  if (discountCode) {
    const discMatch = catalog.discountCodes.find(
      (d) => String(d.code || '').toUpperCase() === discountCode && d.active
    );
    if (!discMatch) {
      return {
        status: 400,
        body: {
          success: false,
          error: `Promo code "${discountCode}" is invalid or expired.`,
        },
      };
    }
    const calc = calculateDiscountBreakdown(discMatch, subtotalUsd);
    if (!calc.valid) {
      return {
        status: 400,
        body: { success: false, error: calc.message || 'Promo code minimum spend not met.' },
      };
    }
    discountCents = calc.discountCents;
    appliedCode = discMatch.code;
  }

  discountCents = Math.min(subtotalCents, discountCents);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  if (totalCents < 50) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'PayPal Checkout requires a minimum payable order total of $0.50 USD.',
      },
    };
  }

  if (!paypalConfig.configured) {
    return {
      status: 503,
      body: {
        success: false,
        code: 'paypal_not_configured',
        error:
          'PayPal credentials are not configured on the server. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.',
      },
    };
  }

  const actualDiscountUsd = centsToUsd(discountCents);
  const totalUsd = centsToUsd(totalCents);

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

  const successUrl = `${origin}/?checkout_status=success&order=${encodeURIComponent(downloadToken)}`;
  const cancelUrl = `${origin}/?checkout_status=cancelled&order=${encodeURIComponent(downloadToken)}`;

  let ppOrder;
  try {
    ppOrder = await createPaypalOrder(paypalConfig, {
      orderNumber,
      description: `Sleepyshroom Digital Wallpapers (${orderNumber})`,
      items: verifiedItems,
      discountCents,
      successUrl,
      cancelUrl,
      requestId: `create-${orderId}`,
    });
  } catch (err) {
    const statusCode =
      err?.statusCode >= 400 && err?.statusCode < 500 ? 400 : err?.statusCode === 503 ? 503 : 502;
    return {
      status: statusCode,
      body: {
        success: false,
        code: 'paypal_order_error',
        error: err?.message || 'Unable to create PayPal order.',
      },
    };
  }

  const orderItemsClean = verifiedItems.map(({ unitCents: _uc, category: _cat, ...rest }) => rest);
  const pendingOrder = {
    id: orderId,
    userId: verifiedUserId,
    orderNumber,
    customerEmail,
    customerName,
    billingDetails,
    items: orderItemsClean,
    subtotal: subtotalUsd,
    discount: actualDiscountUsd,
    discountCode: appliedCode,
    total: totalUsd,
    currency: 'USD',
    paymentProvider: 'paypal',
    paymentMethod: 'PayPal Checkout (Pending)',
    paymentStatus: 'pending',
    isTestOrder: paypalConfig.environment !== 'live',
    transactionId: ppOrder.id,
    paymentReference: ppOrder.id,
    paypalOrderId: ppOrder.id,
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
      paypalOrderId: ppOrder.id,
      approveUrl: ppOrder.approveUrl,
      checkoutUrl: ppOrder.approveUrl,
      order: pendingOrder,
      persistedTo: {
        supabase: Boolean(supaPersist.saved),
      },
    },
  };
}

export async function handlePaypalWebhook(req, rawBody) {
  const catalog = loadRuntimeCatalog();
  const paypalConfig = resolvePaypalServerConfig({ paymentProviders: catalog.paymentProviders });

  if (!paypalConfig.webhookConfigured) {
    return {
      status: 503,
      body: {
        received: false,
        error:
          'PayPal webhook verification is not configured on the server (PAYPAL_WEBHOOK_ID missing).',
      },
    };
  }

  const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');

  let sigVerification;
  try {
    sigVerification = await verifyPaypalWebhookSignature(paypalConfig, req.headers, rawString);
  } catch (err) {
    return {
      status: 502,
      body: {
        received: false,
        error: err?.message || 'Unable to verify PayPal webhook signature.',
      },
    };
  }

  if (!sigVerification.verified) {
    return {
      status: sigVerification.statusCode || 401,
      body: {
        received: false,
        error: sigVerification.reason || 'PayPal webhook signature invalid.',
      },
    };
  }

  const event = sigVerification.webhookEvent || {};
  const eventId = String(event.id || '').trim();
  const eventType = String(event.event_type || '').trim();
  const resource = event.resource && typeof event.resource === 'object' ? event.resource : {};

  if (!eventId || !eventType) {
    return {
      status: 400,
      body: { received: false, error: 'Malformed PayPal webhook payload.' },
    };
  }

  const alreadyProcessed =
    hasLocalWebhookEvent(eventId) || (await checkSupabaseWebhookEventExists(eventId));
  if (alreadyProcessed) {
    return {
      status: 200,
      body: { received: true, duplicate: true, eventId, eventType },
    };
  }

  const origin = resolveRequestOrigin(req);
  const resourceLinks = Array.isArray(resource.links) ? resource.links : [];
  const upHref = resourceLinks.find((l) => l?.rel === 'up')?.href || '';
  const upId = upHref ? String(upHref.split('/').pop() || '') : '';

  const isOrderEvent =
    eventType.startsWith('CHECKOUT.ORDER.') ||
    String(event.resource_type || '').toLowerCase() === 'checkout-order';
  const isRefundEvent =
    eventType === 'PAYMENT.CAPTURE.REFUNDED' || eventType === 'PAYMENT.CAPTURE.REVERSED';

  let paypalOrderId = isOrderEvent
    ? String(resource.id || '')
    : String(resource?.supplementary_data?.related_ids?.order_id || '');
  if (!paypalOrderId && !isOrderEvent && !isRefundEvent && upHref.includes('/orders/')) {
    paypalOrderId = upId;
  }

  let captureId = '';
  if (!isOrderEvent) {
    if (isRefundEvent) {
      captureId = String(
        resource?.supplementary_data?.related_ids?.capture_id ||
          (upHref.includes('/captures/') ? upId : '')
      );
    } else if (eventType.startsWith('PAYMENT.CAPTURE.')) {
      captureId = String(resource.id || '');
    }
  }

  const customOrderNumber = String(
    resource.custom_id ||
      resource.invoice_id ||
      resource?.purchase_units?.[0]?.custom_id ||
      resource?.purchase_units?.[0]?.invoice_id ||
      ''
  ).trim();

  let order =
    (await findSupabaseOrder({
      paypalOrderId: paypalOrderId || undefined,
      captureId: captureId || undefined,
      orderNumber: customOrderNumber || undefined,
    })) ||
    catalog.orders.find(
      (o) =>
        (paypalOrderId && o.paypalOrderId === paypalOrderId) ||
        (captureId && o.paypalCaptureId === captureId) ||
        (customOrderNumber && o.orderNumber === customOrderNumber)
    ) ||
    null;

  if (!order) {
    await insertSupabaseWebhookEvent({
      eventId,
      eventType,
      paypalOrderId,
      captureId,
      livemode: paypalConfig.environment === 'live',
      payload: { unmatched: true, customOrderNumber },
    });
    recordLocalWebhookEvent({
      eventId,
      eventType,
      paypalOrderId,
      captureId,
      unmatched: true,
    });
    return {
      status: 200,
      body: { received: true, matched: false, eventId, eventType },
    };
  }

  if (eventType === 'CHECKOUT.ORDER.APPROVED') {
    const reconciled = await reconcileOrderWithPaypal(order, {
      receiptOrigin: origin,
      captureIfApproved: true,
    });
    if (reconciled) {
      order = reconciled;
    }
  } else if (
    eventType === 'CHECKOUT.ORDER.COMPLETED' ||
    eventType === 'PAYMENT.CAPTURE.COMPLETED'
  ) {
    const resolvedOrderId = paypalOrderId || order.paypalOrderId;
    if (resolvedOrderId) {
      try {
        const ppOrder = await retrievePaypalOrder(paypalConfig, resolvedOrderId);
        const details = extractPaypalOrderPaymentDetails(ppOrder);
        if (
          details.paypalOrderStatus === 'COMPLETED' &&
          (!details.captureStatus || details.captureStatus === 'COMPLETED')
        ) {
          assertCapturedPaypalMatchesOrder(order, details);
          order = await finalizeVerifiedPaidOrder({
            order,
            paypalOrderId: details.paypalOrderId || resolvedOrderId,
            captureId: captureId || details.captureId,
            payerId: details.payerId,
            paymentMethodLabel: details.paymentMethodLabel,
            paidAt: resource.create_time || resource.update_time || new Date().toISOString(),
            eventId,
            receiptOrigin: origin,
          });
        }
      } catch (err) {
        return {
          status: err?.statusCode === 400 ? 400 : 502,
          body: {
            received: false,
            error: err?.message || 'Unable to verify PayPal payment details against order.',
          },
        };
      }
    } else if (
      String(resource.status || '').toUpperCase() === 'COMPLETED' &&
      String(resource.amount?.currency_code || 'USD').toUpperCase() === 'USD'
    ) {
      const amtCents = usdToCents(resource.amount?.value);
      if (usdToCents(order.total) > 0 && amtCents < usdToCents(order.total)) {
        return {
          status: 400,
          body: {
            received: false,
            error: 'Captured PayPal amount mismatch against stored order total.',
          },
        };
      }
      order = await finalizeVerifiedPaidOrder({
        order,
        captureId: captureId || resource.id,
        paymentMethodLabel: 'PayPal',
        paidAt: resource.create_time || new Date().toISOString(),
        eventId,
        receiptOrigin: origin,
      });
    }
  } else if (
    eventType === 'PAYMENT.CAPTURE.DENIED' ||
    eventType === 'PAYMENT.CAPTURE.DECLINED'
  ) {
    const st = String(order.paymentStatus || '').toLowerCase();
    if (st !== 'paid' && st !== 'completed' && st !== 'refunded') {
      const reason =
        resource?.status_details?.reason || 'Payment was declined by PayPal.';
      const failedOrder = {
        ...order,
        paymentStatus: 'failed',
        paypalCaptureId: captureId || order.paypalCaptureId,
        paypalEventId: eventId,
        failureReason: reason,
      };
      upsertLocalOrder(failedOrder);
      await updateSupabaseOrderPatch(order.id, {
        status: 'failed',
        payment_status: 'failed',
        paypal_capture_id: failedOrder.paypalCaptureId || null,
        paypal_event_id: eventId,
        failure_reason: reason,
      });
      order = failedOrder;
    }
  } else if (isRefundEvent) {
    const refundId = String(resource.id || '');
    const reason = String(resource.note_to_payer || 'Refunded via PayPal').slice(0, 250);
    order = await finalizeRefundedOrder({
      order,
      refundId,
      reason,
      refundedAt: resource.update_time || resource.create_time || new Date().toISOString(),
      eventId,
    });
  }

  await insertSupabaseWebhookEvent({
    eventId,
    eventType,
    paypalOrderId: paypalOrderId || order.paypalOrderId,
    captureId: captureId || order.paypalCaptureId,
    livemode: paypalConfig.environment === 'live',
    payload: { orderId: order.id, orderNumber: order.orderNumber },
  });
  recordLocalWebhookEvent({
    eventId,
    eventType,
    paypalOrderId: paypalOrderId || order.paypalOrderId,
    captureId: captureId || order.paypalCaptureId,
    orderId: order.id,
  });

  return {
    status: 200,
    body: {
      received: true,
      eventId,
      eventType,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
    },
  };
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
    order = await reconcileOrderWithPaypal(order, {
      receiptOrigin: resolveRequestOrigin(req),
      captureIfApproved: false,
    });
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

  const order = supaMatch || localMatch || null;
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

  const paypalConfig = resolvePaypalServerConfig({ paymentProviders: catalog.paymentProviders });
  const origin = resolveRequestOrigin(req);

  if (action === 'capture') {
    if (isOrderDownloadAuthorized(order)) {
      return {
        status: 200,
        body: { success: true, verifiedPaid: true, order },
      };
    }

    if (!paypalConfig.configured) {
      return {
        status: 503,
        body: {
          success: false,
          error: 'PayPal server credentials are not configured.',
        },
      };
    }

    const suppliedPaypalOrderId = String(body.paypalOrderId || '').trim();
    const storedPaypalOrderId =
      order.paypalOrderId ||
      (String(order.paymentProvider || '').toLowerCase() === 'paypal' ? order.paymentReference : '');

    if (storedPaypalOrderId && suppliedPaypalOrderId && storedPaypalOrderId !== suppliedPaypalOrderId) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'PayPal order ID does not match the stored order.',
        },
      };
    }

    const targetPaypalOrderId = storedPaypalOrderId || suppliedPaypalOrderId;
    if (!targetPaypalOrderId) {
      return {
        status: 400,
        body: { success: false, error: 'No PayPal order ID associated with this order.' },
      };
    }

    try {
      const capturedPayload = await capturePaypalOrder(paypalConfig, targetPaypalOrderId, {
        requestId: `capture-${order.id}-${targetPaypalOrderId}`,
      });
      const details = extractPaypalOrderPaymentDetails(capturedPayload);

      if (
        details.paypalOrderStatus !== 'COMPLETED' ||
        (details.captureStatus && details.captureStatus !== 'COMPLETED')
      ) {
        return {
          status: 400,
          body: {
            success: false,
            error: `PayPal capture not completed (status: ${details.captureStatus || details.paypalOrderStatus || 'PENDING'}).`,
          },
        };
      }

      assertCapturedPaypalMatchesOrder(order, details);
      const finalOrder = await finalizeVerifiedPaidOrder({
        order,
        paypalOrderId: details.paypalOrderId || targetPaypalOrderId,
        captureId: details.captureId,
        payerId: details.payerId,
        paymentMethodLabel: details.paymentMethodLabel,
        paidAt: new Date().toISOString(),
        receiptOrigin: origin,
      });

      return {
        status: 200,
        body: {
          success: true,
          verifiedPaid: true,
          order: finalOrder,
        },
      };
    } catch (err) {
      const status =
        err?.statusCode >= 400 && err?.statusCode < 500 ? err.statusCode : 502;
      const failureReason = err?.message || 'Unable to capture PayPal payment.';
      if (order.paymentStatus === 'pending' && status === 400) {
        const updatedFail = { ...order, paymentStatus: 'failed', failureReason };
        upsertLocalOrder(updatedFail);
        await updateSupabaseOrderPatch(order.id, {
          status: 'failed',
          payment_status: 'failed',
          failure_reason: failureReason,
        });
      }
      return {
        status,
        body: {
          success: false,
          verifiedPaid: false,
          error: failureReason,
        },
      };
    }
  }

  if (action === 'verify') {
    const reconciled = await reconcileOrderWithPaypal(order, {
      receiptOrigin: origin,
      captureIfApproved: true,
    });
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
    const checked = await reconcileOrderWithPaypal(order, {
      receiptOrigin: origin,
      captureIfApproved: true,
    });
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

  if (action === 'refund') {
    if (!isAdmin) {
      return {
        status: 403,
        body: {
          success: false,
          error: 'Only authorized administrators can issue PayPal refunds.',
        },
      };
    }

    if (String(order.paymentStatus || '').toLowerCase() === 'refunded') {
      return {
        status: 400,
        body: { success: false, error: 'This order has already been refunded.' },
      };
    }

    if (!isOrderDownloadAuthorized(order)) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Only paid orders can be refunded.',
        },
      };
    }

    if (!paypalConfig.configured) {
      return {
        status: 503,
        body: {
          success: false,
          error: 'PayPal API credentials are not configured on the server.',
        },
      };
    }

    let captureId = order.paypalCaptureId || '';
    if (!captureId && order.paypalOrderId) {
      try {
        const ppOrder = await retrievePaypalOrder(paypalConfig, order.paypalOrderId);
        const details = extractPaypalOrderPaymentDetails(ppOrder);
        captureId = details.captureId || '';
      } catch {
        captureId = '';
      }
    }

    if (!captureId) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'No PayPal capture ID was found on this order for refund.',
        },
      };
    }

    const reason =
      String(body.reason || 'Refunded by administrator via Sleepyshroom').trim().slice(0, 250) ||
      'Refunded by administrator';

    try {
      const refundPayload = await refundPaypalCapture(paypalConfig, captureId, {
        amountCents: usdToCents(order.total),
        currency: order.currency || 'USD',
        reason,
        invoiceId: order.orderNumber,
      });

      const refundStatus = String(refundPayload?.status || '').toUpperCase();
      if (refundStatus && refundStatus !== 'COMPLETED' && refundStatus !== 'PENDING') {
        return {
          status: 400,
          body: {
            success: false,
            error: `PayPal refund returned status "${refundStatus}".`,
          },
        };
      }

      const finalOrder = await finalizeRefundedOrder({
        order,
        refundId: refundPayload?.id ? String(refundPayload.id) : '',
        reason,
        refundedAt: new Date().toISOString(),
      });

      return {
        status: 200,
        body: {
          success: true,
          refundId: refundPayload?.id || undefined,
          order: finalOrder,
        },
      };
    } catch (err) {
      return {
        status: err?.statusCode >= 400 && err?.statusCode < 500 ? 400 : 502,
        body: {
          success: false,
          error: err?.message || 'PayPal refund request failed.',
        },
      };
    }
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
    order = await reconcileOrderWithPaypal(order, {
      receiptOrigin: resolveRequestOrigin(req),
      captureIfApproved: false,
    });
  }

  if (!isOrderDownloadAuthorized(order)) {
    return {
      kind: 'json',
      status: 403,
      body: {
        authorized: false,
        paymentStatus: order.paymentStatus || 'pending',
        error:
          order.paymentStatus === 'refunded'
            ? 'This order was refunded, so digital download access has been revoked.'
            : order.paymentStatus === 'cancelled'
              ? 'This checkout was cancelled. Downloads require a verified PayPal payment.'
              : order.paymentStatus === 'failed'
                ? 'Payment failed for this order. Please retry checkout to unlock downloads.'
                : 'Payment has not been verified yet. Downloads unlock automatically once PayPal confirms your payment.',
      },
    };
  }

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

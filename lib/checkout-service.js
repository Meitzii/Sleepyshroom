import crypto from 'node:crypto';
import {
  resolveSupabaseServerConfig,
  readJsonBody,
  extractBearerToken,
  fetchVerifiedSupabaseUser,
  verifyAdminRequest,
} from './contact-service.js';
import { loadRuntimeCatalog, saveLocalCheckoutRecord } from './shop-data.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function parseExpiryMmYy(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  const year2 = Number(digits.slice(2, 4));
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const fullYear = 2000 + year2;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
    return { valid: false, expired: true, formatted: `${String(month).padStart(2, '0')}/${digits.slice(2, 4)}` };
  }
  return { valid: true, expired: false, formatted: `${String(month).padStart(2, '0')}/${digits.slice(2, 4)}` };
}

function maskMobileNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 7) return 'Mobile Wallet';
  const last4 = digits.slice(-4);
  const prefix = digits.slice(0, 4);
  return `${prefix} •••• ${last4}`;
}

function sanitizeBillingDetails(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  return {
    country: String(obj.country || '').trim().slice(0, 100),
    city: String(obj.city || '').trim().slice(0, 100),
    postalCode: String(obj.postalCode || '').trim().slice(0, 32),
    addressLine1: String(obj.addressLine1 || '').trim().slice(0, 200),
  };
}

function calculateDiscountBreakdown(discountMatch, subtotal) {
  if (!discountMatch || !discountMatch.active) {
    return { valid: false, discountAmount: 0 };
  }
  const minSpend = Number(discountMatch.minSpend || 0);
  if (subtotal < minSpend) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Minimum spend of $${minSpend.toFixed(2)} required for ${discountMatch.code}.`,
    };
  }
  const rawDisc =
    discountMatch.type === 'percentage'
      ? (subtotal * Number(discountMatch.value || 0)) / 100
      : Math.min(subtotal, Number(discountMatch.value || 0));
  const discountAmount = Number(Math.max(0, Math.min(subtotal, rawDisc)).toFixed(2));
  return {
    valid: true,
    discountAmount,
    message:
      discountMatch.type === 'percentage'
        ? `${discountMatch.value}% off applied!`
        : `$${Number(discountMatch.value).toFixed(2)} off applied!`,
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

  let subtotal = Number(body.subtotal);
  if (Array.isArray(body.items) && body.items.length > 0) {
    let computedSubtotal = 0;
    for (const item of body.items) {
      const prod = catalog.products.find((p) => p.id === item?.productId);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(item?.quantity) || 1)));
      if (prod) {
        computedSubtotal += Number(prod.price || 0) * qty;
      }
    }
    if (computedSubtotal > 0 || !Number.isFinite(subtotal)) {
      subtotal = Number(computedSubtotal.toFixed(2));
    }
  }

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    subtotal = 0;
  }

  const calc = calculateDiscountBreakdown(match, subtotal);
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
      discountAmount: calc.discountAmount,
      message: calc.message,
    },
  };
}

function buildOrderFromSupabaseRow(row) {
  if (!row || typeof row !== 'object') return null;
  const items = Array.isArray(row.items_json) ? row.items_json : [];
  const total = Number(row.total_amount ?? row.total ?? 0);
  const subtotal = Number(row.subtotal ?? total);
  const discount = Number(row.discount ?? Math.max(0, subtotal - total));
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
    paymentMethod: String(row.payment_method || row.payment_provider || 'Digital Checkout'),
    paymentProvider: row.payment_provider || undefined,
    paymentStatus: String(row.payment_status || row.status || 'completed'),
    transactionId: String(row.transaction_id || row.payment_reference || ''),
    downloadToken: String(row.download_token || row.id),
    downloadCount: Number(row.download_count || 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

async function persistOrderToSupabaseBestEffort(order, bearerToken) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) return false;

  const rpcAuthToken = bearerToken || cfg.serviceRoleKey || cfg.anonKey;
  const authToken = cfg.serviceRoleKey || bearerToken || cfg.anonKey;
  const apiKey = cfg.serviceRoleKey || cfg.anonKey;

  // Prefer SECURITY DEFINER RPC when available (works cleanly for both guests & authenticated customers)
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
        p_payment_provider: order.paymentProvider || 'stripe',
        p_payment_method: order.paymentMethod,
        p_payment_status: order.paymentStatus,
        p_payment_reference: order.transactionId,
        p_download_token: order.downloadToken,
        p_billing_details: order.billingDetails || {},
        p_items_json: order.items,
      }),
    });
    if (rpcRes.ok) {
      return true;
    }
  } catch {
    // Fall through cleanly
  }

  // Fallback direct REST insert if serviceRoleKey is configured or authenticated RLS allows
  if (cfg.serviceRoleKey || (bearerToken && order.userId)) {
    const baseRow = {
      id: order.id,
      user_id: order.userId || null,
      customer_email: order.customerEmail,
      status: 'completed',
      payment_provider: order.paymentProvider || 'stripe',
      payment_reference: order.transactionId,
      currency: 'USD',
      total_amount: order.total,
    };

    const extendedRow = {
      ...baseRow,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      subtotal: order.subtotal,
      discount: order.discount,
      discount_code: order.discountCode || null,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      transaction_id: order.transactionId,
      download_token: order.downloadToken,
      download_count: order.downloadCount,
      billing_details: order.billingDetails || {},
      items_json: order.items,
    };

    try {
      let res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(extendedRow),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err?.code || '';
        const msg = String(err?.message || '');
        // Retry minimal schema if migration columns haven't been added or status constraint differs
        if (code === 'PGRST204' || msg.includes('column')) {
          res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(baseRow),
          });
        } else if (code === '23514' || msg.includes('status')) {
          res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ ...baseRow, status: 'paid' }),
          });
        }
      }

      return res.ok;
    } catch {
      return false;
    }
  }

  return false;
}

export async function handleCheckoutSubmission(req) {
  const body = await readJsonBody(req);
  const catalog = loadRuntimeCatalog();

  const customerEmail = String(body.customerEmail || '').trim();
  const customerName = String(body.customerName || '').trim();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const discountCode = String(body.discountCode || '').trim().toUpperCase();
  const billingDetails = sanitizeBillingDetails(body.billingDetails);
  const rawProvider = String(body.paymentProvider || '').trim().toLowerCase();
  const rawPaymentMethodLabel = String(body.paymentMethod || '').trim();
  const paymentDetails =
    body.paymentDetails && typeof body.paymentDetails === 'object' ? body.paymentDetails : {};

  if (!customerName || customerName.length > 120) {
    return {
      status: 400,
      body: { success: false, error: 'Please enter your full name for billing and delivery.' },
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

  if (rawItems.length === 0) {
    return {
      status: 400,
      body: { success: false, error: 'Your shopping bag is empty.' },
    };
  }

  // Server-authoritative item lookup and subtotal computation
  let subtotal = 0;
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
    const price = Number(prod.price || 0);
    subtotal += price * qty;
    verifiedItems.push({
      productId: prod.id,
      title: prod.title,
      price,
      quantity: qty,
      image: Array.isArray(prod.images) ? prod.images[0] || '' : '',
      deviceTypes: Array.isArray(prod.deviceTypes) ? prod.deviceTypes : ['desktop'],
      downloadFileName: prod.downloadFileName || `${prod.slug || prod.id}.jpg`,
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  // Server-authoritative discount computation
  let discount = 0;
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
    const calc = calculateDiscountBreakdown(discMatch, subtotal);
    if (!calc.valid) {
      return {
        status: 400,
        body: { success: false, error: calc.message || 'Promo code minimum spend not met.' },
      };
    }
    discount = calc.discountAmount;
    appliedCode = discMatch.code;
  }

  const total = Number(Math.max(0, subtotal - discount).toFixed(2));
  const providersCfg = catalog.paymentProviders;

  // Determine & validate selected payment method cleanly (never storing raw card PAN or CVC!)
  let resolvedProvider = rawProvider || 'stripe';
  if (total === 0) {
    resolvedProvider = 'free';
  } else if (!['stripe', 'paypal', 'gcash', 'maya'].includes(resolvedProvider)) {
    const lowerLabel = rawPaymentMethodLabel.toLowerCase();
    if (lowerLabel.includes('paypal')) resolvedProvider = 'paypal';
    else if (lowerLabel.includes('gcash')) resolvedProvider = 'gcash';
    else if (lowerLabel.includes('maya')) resolvedProvider = 'maya';
    else resolvedProvider = 'stripe';
  }

  if (resolvedProvider !== 'free') {
    const isEnabled =
      (resolvedProvider === 'stripe' && providersCfg.stripeEnabled !== false) ||
      (resolvedProvider === 'paypal' && providersCfg.paypalEnabled !== false) ||
      (resolvedProvider === 'gcash' && providersCfg.gcashEnabled !== false) ||
      (resolvedProvider === 'maya' && providersCfg.mayaEnabled !== false);
    if (!isEnabled) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'The selected payment method is currently unavailable. Please choose another option.',
        },
      };
    }
  }

  let formattedPaymentMethod = rawPaymentMethodLabel || 'Secure Digital Checkout';
  let walletReference = '';

  if (resolvedProvider === 'free') {
    formattedPaymentMethod = 'Complimentary Order ($0.00)';
  } else if (resolvedProvider === 'stripe') {
    const cardholderName = String(paymentDetails.cardholderName || customerName).trim();
    const cardBrand = String(paymentDetails.cardBrand || 'Card').trim().slice(0, 24);
    const cardLast4 = String(paymentDetails.cardLast4 || '').replace(/\D/g, '').slice(-4);
    const expiryCheck = parseExpiryMmYy(paymentDetails.cardExpiry);

    if (!cardholderName) {
      return { status: 400, body: { success: false, error: 'Please enter the cardholder name.' } };
    }
    if (cardLast4.length !== 4) {
      return { status: 400, body: { success: false, error: 'Please enter a valid payment card number.' } };
    }
    if (!expiryCheck || !expiryCheck.valid) {
      return {
        status: 400,
        body: {
          success: false,
          error: expiryCheck?.expired
            ? 'Your card expiration date is in the past. Please use a valid card.'
            : 'Please enter a valid card expiration date (MM/YY).',
        },
      };
    }

    formattedPaymentMethod = `Card (${cardBrand} •••• ${cardLast4})`;
  } else if (resolvedProvider === 'paypal') {
    const paypalEmail = String(paymentDetails.paypalEmail || customerEmail).trim();
    if (!isValidEmail(paypalEmail)) {
      return {
        status: 400,
        body: { success: false, error: 'Please enter a valid PayPal account email address.' },
      };
    }
    walletReference = String(paymentDetails.referenceNumber || '').trim().slice(0, 64);
    formattedPaymentMethod = `PayPal (${paypalEmail})`;
  } else if (resolvedProvider === 'gcash') {
    const mobileDigits = String(paymentDetails.mobileNumber || '').replace(/\D/g, '');
    const accountName = String(paymentDetails.accountName || customerName).trim();
    if (mobileDigits.length < 10 || mobileDigits.length > 13) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Please enter a valid GCash mobile number (e.g. 0917 123 4567).',
        },
      };
    }
    if (!accountName) {
      return { status: 400, body: { success: false, error: 'Please enter your GCash account name.' } };
    }
    walletReference = String(paymentDetails.referenceNumber || '').trim().slice(0, 64);
    if (providersCfg.gcashNumber && !providersCfg.testMode && !walletReference) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Please enter your GCash payment reference number to verify your transfer.',
        },
      };
    }
    formattedPaymentMethod = walletReference
      ? `GCash (${maskMobileNumber(mobileDigits)} · Ref ${walletReference})`
      : `GCash (${maskMobileNumber(mobileDigits)})`;
  } else if (resolvedProvider === 'maya') {
    const mobileDigits = String(paymentDetails.mobileNumber || '').replace(/\D/g, '');
    const accountName = String(paymentDetails.accountName || customerName).trim();
    if (mobileDigits.length < 10 || mobileDigits.length > 13) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Please enter a valid Maya mobile number (e.g. 0917 123 4567).',
        },
      };
    }
    if (!accountName) {
      return { status: 400, body: { success: false, error: 'Please enter your Maya account name.' } };
    }
    walletReference = String(paymentDetails.referenceNumber || '').trim().slice(0, 64);
    if (providersCfg.mayaNumber && !providersCfg.testMode && !walletReference) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Please enter your Maya payment reference number to verify your transfer.',
        },
      };
    }
    formattedPaymentMethod = walletReference
      ? `Maya (${maskMobileNumber(mobileDigits)} · Ref ${walletReference})`
      : `Maya (${maskMobileNumber(mobileDigits)})`;
  }

  // Link optional authenticated Supabase user
  const cfg = resolveSupabaseServerConfig();
  const bearer = extractBearerToken(req);
  let verifiedUserId = null;
  if (bearer && cfg.configured) {
    const authUser = await fetchVerifiedSupabaseUser(cfg, bearer);
    if (authUser?.id) {
      verifiedUserId = authUser.id;
    }
  }

  const nowIso = new Date().toISOString();
  const orderNumber = `SHROOM-${1000 + Math.floor(100 + Math.random() * 8900)}`;
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const downloadToken = `shroom_dl_${randomSuffix}_${Date.now().toString(36)}`;
  const transactionId = walletReference
    ? `${resolvedProvider}_${walletReference}`
    : `txn_${resolvedProvider}_${crypto.randomBytes(5).toString('hex')}`;

  const isTestOrder =
    resolvedProvider === 'free'
      ? false
      : Boolean(providersCfg.testMode && !(resolvedProvider === 'stripe' && providersCfg.stripeSecretKeyConfigured));

  const newOrder = {
    id: crypto.randomUUID(),
    userId: verifiedUserId,
    orderNumber,
    customerEmail,
    customerName,
    billingDetails,
    items: verifiedItems,
    subtotal,
    discount,
    discountCode: appliedCode,
    total,
    paymentProvider: resolvedProvider,
    paymentMethod: formattedPaymentMethod,
    paymentStatus: 'completed',
    isTestOrder,
    transactionId,
    downloadToken,
    downloadCount: 0,
    createdAt: nowIso,
  };

  const savedLocally = saveLocalCheckoutRecord(newOrder, verifiedItems);
  const savedToSupabase = await persistOrderToSupabaseBestEffort(newOrder, bearer);

  return {
    status: 200,
    body: {
      success: true,
      order: newOrder,
      downloadUrl: `/downloads/${downloadToken}`,
      persistedTo: {
        supabase: savedToSupabase,
        localStore: savedLocally,
      },
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

  // Merge and deduplicate by downloadToken / id
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
  if (localMatch && isAuthorizedForOrder(localMatch)) {
    return { status: 200, body: localMatch };
  }

  if (cfg.configured) {
    const authToken = bearer || cfg.serviceRoleKey || cfg.anonKey;
    const apiKey = cfg.serviceRoleKey || cfg.anonKey;

    // 1. Try secure token RPC lookup (safe for guest confirmation pages)
    try {
      const rpcRes = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/get_order_by_download_token`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_token: param }),
      });
      if (rpcRes.ok) {
        const rpcData = await rpcRes.json().catch(() => null);
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        const mapped = buildOrderFromSupabaseRow(row);
        if (mapped && isAuthorizedForOrder(mapped)) {
          return { status: 200, body: mapped };
        }
      }
    } catch {
      // Fall through cleanly
    }

    // 2. Fallback direct query when caller holds an authenticated session or serviceRoleKey
    if (bearer || cfg.serviceRoleKey) {
      const clause = isValidUuid(param)
        ? `or=(id.eq.${encodeURIComponent(param)},download_token.eq.${encodeURIComponent(param)})`
        : `or=(download_token.eq.${encodeURIComponent(param)},order_number.eq.${encodeURIComponent(param)})`;
      try {
        const res = await fetch(`${cfg.supabaseUrl}/rest/v1/orders?${clause}&select=*&limit=1`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const rows = await res.json().catch(() => []);
          const mapped = buildOrderFromSupabaseRow(Array.isArray(rows) ? rows[0] : null);
          if (mapped && isAuthorizedForOrder(mapped)) {
            return { status: 200, body: mapped };
          }
        }
      } catch {
        // Non-blocking fallback
      }
    }
  }

  return { status: 404, body: { error: 'Order not found' } };
}

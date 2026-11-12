import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

export const PAYPAL_SANDBOX_API_BASE = 'https://api-m.sandbox.paypal.com';
export const PAYPAL_LIVE_API_BASE = 'https://api-m.paypal.com';

export const COUNTRY_NAME_TO_ISO2 = {
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  us: 'US',
  philippines: 'PH',
  'the philippines': 'PH',
  ph: 'PH',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  gb: 'GB',
  canada: 'CA',
  ca: 'CA',
  australia: 'AU',
  au: 'AU',
  japan: 'JP',
  jp: 'JP',
  singapore: 'SG',
  sg: 'SG',
  malaysia: 'MY',
  my: 'MY',
  indonesia: 'ID',
  id: 'ID',
  thailand: 'TH',
  th: 'TH',
  vietnam: 'VN',
  vn: 'VN',
  'south korea': 'KR',
  korea: 'KR',
  kr: 'KR',
  germany: 'DE',
  de: 'DE',
  france: 'FR',
  fr: 'FR',
  italy: 'IT',
  it: 'IT',
  spain: 'ES',
  es: 'ES',
  netherlands: 'NL',
  nl: 'NL',
  sweden: 'SE',
  se: 'SE',
  norway: 'NO',
  no: 'NO',
  denmark: 'DK',
  dk: 'DK',
  finland: 'FI',
  fi: 'FI',
  switzerland: 'CH',
  ch: 'CH',
  austria: 'AT',
  at: 'AT',
  belgium: 'BE',
  be: 'BE',
  ireland: 'IE',
  ie: 'IE',
  'new zealand': 'NZ',
  nz: 'NZ',
  brazil: 'BR',
  br: 'BR',
  mexico: 'MX',
  mx: 'MX',
  india: 'IN',
  in: 'IN',
  china: 'CN',
  cn: 'CN',
  'hong kong': 'HK',
  hk: 'HK',
  taiwan: 'TW',
  tw: 'TW',
  'united arab emirates': 'AE',
  uae: 'AE',
  ae: 'AE',
  'saudi arabia': 'SA',
  sa: 'SA',
  poland: 'PL',
  pl: 'PL',
  portugal: 'PT',
  pt: 'PT',
};

const tokenCache = new Map();

export function usdToCents(amountUsd) {
  const numeric = Number(amountUsd);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.round(numeric * 100));
}

export function centsToUsd(cents) {
  const numeric = Number(cents);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number((Math.round(numeric) / 100).toFixed(2));
}

export function centsToDecimalString(cents) {
  const numeric = Number(cents);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0.00';
  return (Math.round(numeric) / 100).toFixed(2);
}

export function resolveCountryIso2(country) {
  if (!country) return undefined;
  const normalized = String(country).trim();
  if (!normalized) return undefined;
  const lower = normalized.toLowerCase();
  if (COUNTRY_NAME_TO_ISO2[lower]) {
    return COUNTRY_NAME_TO_ISO2[lower];
  }
  if (/^[A-Za-z]{2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  return undefined;
}

export function resolvePaypalServerConfig(settings) {
  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const webhookId = String(process.env.PAYPAL_WEBHOOK_ID || '').trim();

  const rawEnv = String(process.env.PAYPAL_ENVIRONMENT || '').trim().toLowerCase();
  const settingsTestMode = settings?.paymentProviders?.testMode;

  let environment = 'sandbox';
  if (rawEnv === 'live' || rawEnv === 'production') {
    environment = 'live';
  } else if (rawEnv === 'sandbox' || rawEnv === 'test') {
    environment = 'sandbox';
  } else if (settingsTestMode === false) {
    environment = 'live';
  }

  const apiBase =
    environment === 'live' ? PAYPAL_LIVE_API_BASE : PAYPAL_SANDBOX_API_BASE;

  return {
    configured: Boolean(clientId && clientSecret),
    webhookConfigured: Boolean(clientId && clientSecret && webhookId),
    clientId,
    clientSecret,
    webhookId,
    environment,
    apiBase,
  };
}

function buildPaypalApiError(responseStatus, payload, fallbackMessage) {
  const firstDetail = Array.isArray(payload?.details) ? payload.details[0] : null;
  const issue = firstDetail?.issue ? String(firstDetail.issue) : '';
  const description = firstDetail?.description
    ? String(firstDetail.description)
    : payload?.message || payload?.error_description || '';
  const detailText =
    description || fallbackMessage || `PayPal request failed (${responseStatus})`;
  const error = new Error(issue ? `${detailText} (${issue})` : detailText);
  error.statusCode = responseStatus || 500;
  error.paypalIssue = issue || undefined;
  error.paypalName = payload?.name ? String(payload.name) : undefined;
  error.paypalDebugId = payload?.debug_id ? String(payload.debug_id) : undefined;
  error.paypalPayload = payload;
  return error;
}

export async function getPaypalAccessToken(paypalConfig, { forceRefresh = false } = {}) {
  if (!paypalConfig?.configured) {
    const err = new Error(
      'PayPal API credentials are not configured on the server (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).'
    );
    err.statusCode = 503;
    throw err;
  }

  const cacheKey = `${paypalConfig.environment}:${paypalConfig.clientId}`;
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > now + 60_000) {
    return cached.accessToken;
  }

  const basicAuth = Buffer.from(
    `${paypalConfig.clientId}:${paypalConfig.clientSecret}`
  ).toString('base64');

  const response = await fetch(`${paypalConfig.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw buildPaypalApiError(
      response.status,
      payload,
      'Failed to obtain PayPal OAuth access token.'
    );
  }

  const expiresInSeconds = Math.max(60, Number(payload.expires_in) || 32400);
  tokenCache.set(cacheKey, {
    accessToken: String(payload.access_token),
    expiresAt: now + expiresInSeconds * 1000,
  });

  return String(payload.access_token);
}

async function callPaypalApi(paypalConfig, endpointPath, options = {}) {
  const { method = 'GET', body, requestId, retryOnAuth = true } = options;
  const accessToken = await getPaypalAccessToken(paypalConfig);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (requestId) {
    headers['PayPal-Request-Id'] = String(requestId).slice(0, 108);
  }

  const response = await fetch(`${paypalConfig.apiBase}${endpointPath}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401 && retryOnAuth) {
    const cacheKey = `${paypalConfig.environment}:${paypalConfig.clientId}`;
    tokenCache.delete(cacheKey);
    return callPaypalApi(paypalConfig, endpointPath, {
      ...options,
      retryOnAuth: false,
    });
  }

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    throw buildPaypalApiError(
      response.status,
      payload,
      `PayPal API error (${response.status})`
    );
  }

  return payload;
}

export function buildPaypalPurchaseUnit({
  orderNumber,
  description,
  items = [],
  discountCents = 0,
}) {
  const paypalItems = [];
  let itemTotalCents = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    const unitCents =
      Number.isFinite(Number(item.unitCents)) && Number(item.unitCents) >= 0
        ? Math.round(Number(item.unitCents))
        : usdToCents(item.price ?? item.unitPrice ?? 0);

    itemTotalCents += unitCents * qty;
    paypalItems.push({
      name: String(item.title || item.name || 'Digital Wallpaper').slice(0, 127),
      description: String(
        item.category ? `${item.category} Digital Wallpaper` : 'Digital Wallpaper Pack'
      ).slice(0, 127),
      sku: String(item.productId || item.id || '').slice(0, 127) || undefined,
      unit_amount: {
        currency_code: 'USD',
        value: centsToDecimalString(unitCents),
      },
      quantity: String(qty),
      category: 'DIGITAL_GOODS',
    });
  }

  const safeDiscountCents = Math.min(
    Math.max(0, Math.round(Number(discountCents) || 0)),
    Math.max(0, itemTotalCents - 50)
  );
  const netTotalCents = Math.max(50, itemTotalCents - safeDiscountCents);

  const breakdown = {
    item_total: {
      currency_code: 'USD',
      value: centsToDecimalString(itemTotalCents),
    },
  };

  if (safeDiscountCents > 0) {
    breakdown.discount = {
      currency_code: 'USD',
      value: centsToDecimalString(safeDiscountCents),
    };
  }

  return {
    reference_id: String(orderNumber).slice(0, 256),
    custom_id: String(orderNumber).slice(0, 127),
    invoice_id: String(orderNumber).slice(0, 127),
    soft_descriptor: 'SLEEPYSHROOM',
    description: String(description || `Sleepyshroom Order ${orderNumber}`).slice(0, 127),
    amount: {
      currency_code: 'USD',
      value: centsToDecimalString(netTotalCents),
      breakdown,
    },
    items: paypalItems,
  };
}

export async function createPaypalOrder(
  paypalConfig,
  {
    orderNumber,
    description,
    items,
    discountCents = 0,
    successUrl,
    cancelUrl,
    requestId,
  }
) {
  const purchaseUnit = buildPaypalPurchaseUnit({
    orderNumber,
    description,
    items,
    discountCents,
  });

  const payload = await callPaypalApi(paypalConfig, '/v2/checkout/orders', {
    method: 'POST',
    requestId: requestId || `order-${orderNumber}`,
    body: {
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      application_context: {
        brand_name: 'sleepyshroom',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: successUrl,
        cancel_url: cancelUrl,
      },
    },
  });

  const links = Array.isArray(payload?.links) ? payload.links : [];
  const approveUrl =
    links.find((link) => link?.rel === 'payer-action' || link?.rel === 'approve')
      ?.href || null;

  return {
    id: payload?.id ? String(payload.id) : '',
    status: payload?.status ? String(payload.status) : 'CREATED',
    approveUrl,
    links,
    raw: payload,
  };
}

export async function retrievePaypalOrder(paypalConfig, paypalOrderId) {
  if (!paypalOrderId) {
    const err = new Error('Missing PayPal order ID.');
    err.statusCode = 400;
    throw err;
  }
  return callPaypalApi(
    paypalConfig,
    `/v2/checkout/orders/${encodeURIComponent(String(paypalOrderId))}`,
    { method: 'GET' }
  );
}

export async function capturePaypalOrder(
  paypalConfig,
  paypalOrderId,
  { requestId } = {}
) {
  if (!paypalOrderId) {
    const err = new Error('Missing PayPal order ID for capture.');
    err.statusCode = 400;
    throw err;
  }
  try {
    return await callPaypalApi(
      paypalConfig,
      `/v2/checkout/orders/${encodeURIComponent(String(paypalOrderId))}/capture`,
      {
        method: 'POST',
        requestId: requestId || `capture-${paypalOrderId}`,
        body: {},
      }
    );
  } catch (error) {
    if (
      error?.statusCode === 422 &&
      (error?.paypalIssue === 'ORDER_ALREADY_CAPTURED' ||
        error?.paypalIssue === 'TRANSACTION_REFUSED')
    ) {
      if (error.paypalIssue === 'ORDER_ALREADY_CAPTURED') {
        return retrievePaypalOrder(paypalConfig, paypalOrderId);
      }
    }
    throw error;
  }
}

export async function refundPaypalCapture(
  paypalConfig,
  captureId,
  { amountCents, currency = 'USD', reason, invoiceId, requestId } = {}
) {
  if (!captureId) {
    const err = new Error('Missing PayPal capture ID for refund.');
    err.statusCode = 400;
    throw err;
  }

  const body = {};
  if (Number.isFinite(Number(amountCents)) && Number(amountCents) > 0) {
    body.amount = {
      value: centsToDecimalString(amountCents),
      currency_code: String(currency || 'USD').toUpperCase(),
    };
  }
  if (invoiceId) {
    body.invoice_id = String(invoiceId).slice(0, 127);
  }
  if (reason) {
    body.note_to_payer = String(reason).slice(0, 255);
  }

  return callPaypalApi(
    paypalConfig,
    `/v2/payments/captures/${encodeURIComponent(String(captureId))}/refund`,
    {
      method: 'POST',
      requestId: requestId || `refund-${captureId}-${Date.now()}`,
      body,
    }
  );
}

function getHeaderCaseInsensitive(headers, name) {
  if (!headers) return '';
  const target = name.toLowerCase();
  if (typeof headers.get === 'function') {
    return String(headers.get(target) || headers.get(name) || '').trim();
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value)
        ? String(value[0] || '').trim()
        : String(value || '').trim();
    }
  }
  return '';
}

export async function verifyPaypalWebhookSignature(
  paypalConfig,
  headers,
  rawBodyString
) {
  if (!paypalConfig?.webhookConfigured) {
    return {
      verified: false,
      statusCode: 503,
      reason:
        'PayPal webhook verification is not configured (missing PAYPAL_WEBHOOK_ID or API credentials).',
    };
  }

  const authAlgo = getHeaderCaseInsensitive(headers, 'paypal-auth-algo');
  const certUrl = getHeaderCaseInsensitive(headers, 'paypal-cert-url');
  const transmissionId = getHeaderCaseInsensitive(
    headers,
    'paypal-transmission-id'
  );
  const transmissionSig = getHeaderCaseInsensitive(
    headers,
    'paypal-transmission-sig'
  );
  const transmissionTime = getHeaderCaseInsensitive(
    headers,
    'paypal-transmission-time'
  );

  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    return {
      verified: false,
      statusCode: 401,
      reason: 'Missing required PayPal webhook signature headers.',
    };
  }

  let webhookEvent;
  try {
    webhookEvent = JSON.parse(rawBodyString || '{}');
  } catch {
    return {
      verified: false,
      statusCode: 400,
      reason: 'Invalid JSON payload in PayPal webhook body.',
    };
  }

  const result = await callPaypalApi(
    paypalConfig,
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: paypalConfig.webhookId,
        webhook_event: webhookEvent,
      },
    }
  );

  const verificationStatus = String(result?.verification_status || '').toUpperCase();
  if (verificationStatus !== 'SUCCESS') {
    return {
      verified: false,
      statusCode: 401,
      verificationStatus,
      webhookEvent,
      reason: `PayPal webhook signature verification failed (${verificationStatus || 'UNKNOWN'}).`,
    };
  }

  return {
    verified: true,
    statusCode: 200,
    verificationStatus,
    webhookEvent,
  };
}

export function formatPaypalPaymentMethodLabel(details = {}) {
  const sourceType = String(details.sourceType || '').toLowerCase();
  if (sourceType === 'card') {
    const brand = details.cardBrand
      ? details.cardBrand.charAt(0).toUpperCase() +
        details.cardBrand.slice(1).toLowerCase()
      : 'Card';
    const last4 = details.cardLast4 ? ` ···· ${details.cardLast4}` : '';
    return `${brand}${last4} via PayPal`;
  }
  if (sourceType === 'venmo') return 'Venmo via PayPal';
  if (sourceType === 'apple_pay') return 'Apple Pay via PayPal';
  return 'PayPal';
}

export function extractPaypalOrderPaymentDetails(paypalOrder) {
  if (!paypalOrder || typeof paypalOrder !== 'object') {
    return {};
  }

  const purchaseUnit = Array.isArray(paypalOrder.purchase_units)
    ? paypalOrder.purchase_units[0]
    : null;
  const captures = Array.isArray(purchaseUnit?.payments?.captures)
    ? purchaseUnit.payments.captures
    : [];
  const primaryCapture =
    captures.find((c) => c?.status === 'COMPLETED') || captures[0] || null;

  const refunds = Array.isArray(purchaseUnit?.payments?.refunds)
    ? purchaseUnit.payments.refunds
    : [];
  const primaryRefund = refunds[0] || null;

  const paymentSource = paypalOrder.payment_source || {};
  let sourceType = 'paypal';
  let cardBrand = '';
  let cardLast4 = '';

  if (paymentSource.card) {
    sourceType = 'card';
    cardBrand = String(paymentSource.card.brand || '');
    cardLast4 = String(paymentSource.card.last_digits || '');
  } else if (paymentSource.venmo) {
    sourceType = 'venmo';
  } else if (paymentSource.apple_pay) {
    sourceType = 'apple_pay';
  } else if (paymentSource.paypal) {
    sourceType = 'paypal';
  }

  const payerId =
    paypalOrder?.payer?.payer_id ||
    paymentSource?.paypal?.account_id ||
    '';
  const payerEmail =
    paypalOrder?.payer?.email_address ||
    paymentSource?.paypal?.email_address ||
    '';

  const captureId = primaryCapture?.id ? String(primaryCapture.id) : '';
  const captureStatus = primaryCapture?.status
    ? String(primaryCapture.status).toUpperCase()
    : '';
  const refundId = primaryRefund?.id ? String(primaryRefund.id) : '';
  const capturedAmount = primaryCapture?.amount?.value
    ? Number(primaryCapture.amount.value)
    : purchaseUnit?.amount?.value
      ? Number(purchaseUnit.amount.value)
      : undefined;
  const capturedCurrency = String(
    primaryCapture?.amount?.currency_code ||
      purchaseUnit?.amount?.currency_code ||
      'USD'
  ).toUpperCase();

  return {
    paypalOrderId: paypalOrder.id ? String(paypalOrder.id) : '',
    paypalOrderStatus: paypalOrder.status
      ? String(paypalOrder.status).toUpperCase()
      : '',
    orderNumber:
      purchaseUnit?.custom_id ||
      purchaseUnit?.invoice_id ||
      purchaseUnit?.reference_id ||
      '',
    captureId,
    captureStatus,
    refundId,
    payerId: payerId ? String(payerId) : '',
    payerEmail: payerEmail ? String(payerEmail) : '',
    sourceType,
    cardBrand,
    cardLast4,
    paymentMethodLabel: formatPaypalPaymentMethodLabel({
      sourceType,
      cardBrand,
      cardLast4,
    }),
    capturedAmount,
    capturedCurrency,
  };
}

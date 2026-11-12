import crypto from 'node:crypto';

export const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

export const PAYMONGO_METHOD_META = {
  card: {
    key: 'card',
    label: 'Credit / Debit Card',
    shortLabel: 'Card',
    description: 'Visa, Mastercard',
    minCentavos: 2000,
  },
  gcash: {
    key: 'gcash',
    label: 'GCash',
    shortLabel: 'GCash',
    description: 'Pay with GCash e-wallet',
    minCentavos: 100,
  },
  paymaya: {
    key: 'paymaya',
    label: 'Maya',
    shortLabel: 'Maya',
    description: 'Pay with Maya wallet',
    minCentavos: 100,
  },
  qrph: {
    key: 'qrph',
    label: 'QR Ph',
    shortLabel: 'QR Ph',
    description: 'InstaPay / PESONet banking QR',
    minCentavos: 100,
  },
  grab_pay: {
    key: 'grab_pay',
    label: 'GrabPay',
    shortLabel: 'GrabPay',
    description: 'Pay with GrabPay wallet',
    minCentavos: 2000,
  },
};

export const ALL_PAYMONGO_METHODS = Object.keys(PAYMONGO_METHOD_META);

export const COUNTRY_NAME_TO_ISO2 = {
  philippines: 'PH',
  'united states': 'US',
  canada: 'CA',
  'united kingdom': 'GB',
  australia: 'AU',
  japan: 'JP',
  singapore: 'SG',
  'south korea': 'KR',
  germany: 'DE',
  france: 'FR',
};

function cleanEnv(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getUsdToPhpRate() {
  const raw = Number(cleanEnv(process.env.USD_TO_PHP_RATE));
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 58;
}

export function usdToPhp(usdAmount, rate = getUsdToPhpRate()) {
  const amount = Number(usdAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount * rate).toFixed(2));
}

export function phpToCentavos(phpAmount) {
  const amount = Number(phpAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export function centavosToPhp(centavos) {
  const num = Number(centavos || 0);
  if (!Number.isFinite(num)) return 0;
  return Number((num / 100).toFixed(2));
}

export function resolvePaymongoServerConfig() {
  const secretKey = cleanEnv(process.env.PAYMONGO_SECRET_KEY);
  const publicKey = cleanEnv(
    process.env.PAYMONGO_PUBLIC_KEY || process.env.VITE_PAYMONGO_PUBLIC_KEY
  );
  const webhookSecret = cleanEnv(process.env.PAYMONGO_WEBHOOK_SECRET);
  const allowLive = cleanEnv(process.env.PAYMONGO_ALLOW_LIVE).toLowerCase() === 'true';

  const hasPlaceholder =
    !secretKey ||
    secretKey.includes('your-') ||
    secretKey.startsWith('MY_') ||
    secretKey === 'undefined';

  const validSecretFormat = !hasPlaceholder && /^(sk_test_|sk_live_)[A-Za-z0-9]+$/.test(secretKey);
  const isLiveKey = validSecretFormat && secretKey.startsWith('sk_live_');
  const isTestKey = validSecretFormat && secretKey.startsWith('sk_test_');
  const blockedLiveMode = isLiveKey && !allowLive;

  return {
    configured: validSecretFormat && !blockedLiveMode,
    hasSecretKey: validSecretFormat,
    isLiveMode: isLiveKey,
    isTestMode: isTestKey || !isLiveKey,
    blockedLiveMode,
    secretKey: blockedLiveMode ? '' : secretKey,
    publicKey,
    webhookConfigured:
      Boolean(webhookSecret) &&
      !webhookSecret.includes('your-') &&
      !webhookSecret.startsWith('MY_'),
    webhookSecret,
  };
}

export function resolveCountryIso2(countryInput) {
  const clean = String(countryInput || '').trim();
  if (/^[A-Z]{2}$/i.test(clean)) return clean.toUpperCase();
  const mapped = COUNTRY_NAME_TO_ISO2[clean.toLowerCase()];
  return mapped || 'PH';
}

export function buildPaymongoLineItemsPhp(verifiedItems, discountPhpCentavos, origin = '') {
  const units = [];
  for (const item of verifiedItems) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unitCentavos = Math.max(0, Number(item.unitPhpCentavos) || 0);
    for (let i = 0; i < qty; i++) {
      units.push({
        productId: item.productId,
        name: item.title,
        unitCentavos,
        image: item.image || '',
      });
    }
  }

  const grossTotalCentavos = units.reduce((sum, u) => sum + u.unitCentavos, 0);
  const safeDiscount = Math.max(0, Math.min(grossTotalCentavos, Math.round(discountPhpCentavos || 0)));
  const netTargetCentavos = grossTotalCentavos - safeDiscount;

  // Apply discount proportionally per unit when needed, keeping integer sum invariant exact
  let allocatedDiscount = 0;
  const discountedUnits = units.map((unit, idx) => {
    let unitDiscount = 0;
    if (safeDiscount > 0 && grossTotalCentavos > 0) {
      if (idx === units.length - 1) {
        unitDiscount = safeDiscount - allocatedDiscount;
      } else {
        unitDiscount = Math.round((unit.unitCentavos / grossTotalCentavos) * safeDiscount);
        const remainingMax = safeDiscount - allocatedDiscount;
        unitDiscount = Math.min(unitDiscount, remainingMax, unit.unitCentavos);
      }
      allocatedDiscount += unitDiscount;
    }
    return {
      ...unit,
      finalCentavos: Math.max(0, unit.unitCentavos - unitDiscount),
    };
  });

  // Ensure exact match against netTargetCentavos in case last item hit zero floor
  let currentSum = discountedUnits.reduce((sum, u) => sum + u.finalCentavos, 0);
  let diff = netTargetCentavos - currentSum;
  for (let i = discountedUnits.length - 1; i >= 0 && diff !== 0; i--) {
    if (diff < 0) {
      const deduct = Math.min(discountedUnits[i].finalCentavos, Math.abs(diff));
      discountedUnits[i].finalCentavos -= deduct;
      diff += deduct;
    } else {
      discountedUnits[i].finalCentavos += diff;
      diff = 0;
    }
  }

  // Re-group identical (productId + finalCentavos) items into clean line_items
  const groupedMap = new Map();
  for (const unit of discountedUnits) {
    const key = `${unit.productId}:${unit.finalCentavos}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        name: unit.name.slice(0, 120),
        amount: unit.finalCentavos,
        currency: 'PHP',
        quantity: 1,
        description:
          safeDiscount > 0
            ? 'Sleepyshroom Digital Wallpaper (Promo applied)'
            : 'Sleepyshroom High-Resolution Digital Wallpaper',
        image: unit.image,
      });
    } else {
      groupedMap.get(key).quantity += 1;
    }
  }

  const httpsOrigin =
    typeof origin === 'string' && origin.startsWith('https://') ? origin.replace(/\/+$/, '') : '';

  return Array.from(groupedMap.values())
    .filter((li) => li.amount > 0)
    .map((li) => {
      const payload = {
        name: li.name,
        amount: li.amount,
        currency: 'PHP',
        quantity: li.quantity,
        description: li.description,
      };
      if (httpsOrigin && li.image && (li.image.startsWith('https://') || li.image.startsWith('/'))) {
        try {
          const absUrl = li.image.startsWith('https://')
            ? li.image
            : `${httpsOrigin}${li.image}`;
          if (absUrl.startsWith('https://') && !absUrl.includes('localhost')) {
            payload.images = [absUrl];
          }
        } catch {
          // Omit invalid image URL cleanly
        }
      }
      return payload;
    });
}

function buildBasicAuthHeader(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

export async function createPaymongoCheckoutSession({
  secretKey,
  orderId,
  orderNumber,
  downloadToken,
  customerName,
  customerEmail,
  customerPhone,
  billingDetails,
  lineItems,
  paymentMethodTypes,
  discountCode,
  successUrl,
  cancelUrl,
}) {
  const billingAddress = {
    country: resolveCountryIso2(billingDetails?.country),
  };
  if (billingDetails?.addressLine1) billingAddress.line1 = billingDetails.addressLine1;
  if (billingDetails?.city) billingAddress.city = billingDetails.city;
  if (billingDetails?.postalCode) billingAddress.postal_code = billingDetails.postalCode;

  const billing = {
    name: customerName,
    email: customerEmail,
    address: billingAddress,
  };
  if (customerPhone) {
    billing.phone = customerPhone;
  }

  const metadata = {
    order_id: String(orderId),
    order_number: String(orderNumber),
    download_token: String(downloadToken),
    customer_email: String(customerEmail),
  };
  if (discountCode) {
    metadata.discount_code = String(discountCode);
  }

  const payload = {
    data: {
      attributes: {
        billing,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        description: `Sleepyshroom Digital Wallpapers — ${orderNumber}${discountCode ? ` (${discountCode})` : ''}`,
        reference_number: orderNumber,
        line_items: lineItems,
        payment_method_types: paymentMethodTypes,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      },
    },
  };

  const response = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(secretKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.data?.id || !data?.data?.attributes?.checkout_url) {
    const firstErr = Array.isArray(data?.errors) ? data.errors[0] : null;
    const message =
      firstErr?.detail ||
      firstErr?.message ||
      data?.error?.message ||
      `PayMongo Checkout API returned HTTP ${response.status}.`;
    return {
      ok: false,
      status: response.status,
      error: message,
      code: firstErr?.code || 'paymongo_error',
    };
  }

  const attrs = data.data.attributes || {};
  return {
    ok: true,
    sessionId: data.data.id,
    checkoutUrl: attrs.checkout_url,
    paymentIntentId: attrs.payment_intent?.id || attrs.payment_intent_id || null,
    livemode: Boolean(attrs.livemode),
    status: attrs.status || 'active',
    paymentMethodTypes: Array.isArray(attrs.payment_method_types)
      ? attrs.payment_method_types
      : paymentMethodTypes,
    raw: data.data,
  };
}

export async function retrievePaymongoCheckoutSession(secretKey, sessionId) {
  if (!secretKey || !sessionId) {
    return { ok: false, status: 400, error: 'Missing PayMongo credentials or session ID.' };
  }

  const response = await fetch(
    `${PAYMONGO_API_BASE}/checkout_sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: buildBasicAuthHeader(secretKey),
        Accept: 'application/json',
      },
    }
  );

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.data?.id) {
    const firstErr = Array.isArray(data?.errors) ? data.errors[0] : null;
    return {
      ok: false,
      status: response.status,
      error: firstErr?.detail || `PayMongo returned HTTP ${response.status}.`,
    };
  }

  return {
    ok: true,
    session: data.data,
  };
}

export function formatPaymongoPaymentMethodLabel(paymentOrSource) {
  const sourceType = String(
    paymentOrSource?.attributes?.source?.type ||
      paymentOrSource?.source?.type ||
      paymentOrSource?.payment_method_used ||
      ''
  )
    .trim()
    .toLowerCase();

  const brand = paymentOrSource?.attributes?.source?.brand;
  const last4 = paymentOrSource?.attributes?.source?.last4;

  if (sourceType === 'card') {
    const cardName = brand ? String(brand).toUpperCase() : 'Card';
    return last4 ? `PayMongo · ${cardName} •••• ${last4}` : `PayMongo · ${cardName}`;
  }
  const meta = PAYMONGO_METHOD_META[sourceType];
  if (meta) {
    return `PayMongo · ${meta.shortLabel}`;
  }
  if (sourceType) {
    return `PayMongo · ${sourceType.toUpperCase()}`;
  }
  return 'PayMongo Hosted Checkout';
}

export function extractVerifiedPaymentFromCheckoutSession(sessionResource) {
  if (!sessionResource || typeof sessionResource !== 'object') {
    return { paid: false, status: 'pending' };
  }

  const attrs = sessionResource.attributes || {};
  const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
  const paymentIntent = attrs.payment_intent || null;
  const paymentIntentId = paymentIntent?.id || attrs.payment_intent_id || null;
  const intentStatus = String(paymentIntent?.attributes?.status || '').toLowerCase();

  const paidPayment = payments.find(
    (p) => String(p?.attributes?.status || '').toLowerCase() === 'paid'
  );

  if (paidPayment) {
    const pAttrs = paidPayment.attributes || {};
    const paidTimestamp =
      typeof pAttrs.paid_at === 'number'
        ? new Date(pAttrs.paid_at * 1000).toISOString()
        : typeof pAttrs.created_at === 'number'
        ? new Date(pAttrs.created_at * 1000).toISOString()
        : new Date().toISOString();

    return {
      paid: true,
      status: 'paid',
      checkoutSessionId: sessionResource.id,
      paymentId: paidPayment.id,
      paymentIntentId,
      amountCentavos: Number(pAttrs.amount || 0),
      currency: String(pAttrs.currency || 'PHP').toUpperCase(),
      paymentMethodLabel: formatPaymongoPaymentMethodLabel(paidPayment),
      paymentMethodType: pAttrs.source?.type || null,
      paidAt: paidTimestamp,
      livemode: Boolean(attrs.livemode),
    };
  }

  const failedPayment = payments.find(
    (p) => String(p?.attributes?.status || '').toLowerCase() === 'failed'
  );
  if (failedPayment) {
    const errMsg =
      failedPayment?.attributes?.failed_message ||
      paymentIntent?.attributes?.last_payment_error?.failed_message ||
      'Payment attempt failed on PayMongo.';
    return {
      paid: false,
      status: 'failed',
      checkoutSessionId: sessionResource.id,
      paymentId: failedPayment.id,
      paymentIntentId,
      failureReason: errMsg,
      livemode: Boolean(attrs.livemode),
    };
  }

  const sessionStatus = String(attrs.status || '').toLowerCase();
  if (sessionStatus === 'expired') {
    return {
      paid: false,
      status: 'expired',
      checkoutSessionId: sessionResource.id,
      paymentIntentId,
      livemode: Boolean(attrs.livemode),
    };
  }

  return {
    paid: false,
    status: intentStatus === 'succeeded' ? 'pending' : 'pending',
    checkoutSessionId: sessionResource.id,
    paymentIntentId,
    livemode: Boolean(attrs.livemode),
  };
}

export function verifyPaymongoWebhookSignature({
  rawBody,
  signatureHeader,
  webhookSecret,
  livemode = false,
}) {
  if (!webhookSecret) {
    return { valid: false, reason: 'Webhook secret is not configured.' };
  }
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valid: false, reason: 'Missing Paymongo-Signature header.' };
  }

  const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  if (!rawString) {
    return { valid: false, reason: 'Empty webhook payload.' };
  }

  const parts = {};
  for (const segment of signatureHeader.split(',')) {
    const eqIndex = segment.indexOf('=');
    if (eqIndex > 0) {
      const k = segment.slice(0, eqIndex).trim().toLowerCase();
      const v = segment.slice(eqIndex + 1).trim();
      if (k && v) {
        parts[k] = v;
      }
    }
  }

  const timestamp = parts.t;
  const candidateHex = livemode ? parts.li : parts.te || parts.li;

  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return { valid: false, reason: 'Missing or invalid timestamp in Paymongo-Signature.' };
  }

  if (!candidateHex || !/^[a-f0-9]{64}$/i.test(candidateHex)) {
    return { valid: false, reason: 'Missing expected HMAC signature token in header.' };
  }

  const signedPayload = `${timestamp}.${rawString}`;
  const computedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(computedHex, 'hex');
  const actualBuf = Buffer.from(candidateHex, 'hex');

  if (expectedBuf.length !== actualBuf.length) {
    return { valid: false, reason: 'Signature length mismatch.' };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, actualBuf);
  if (!valid) {
    return { valid: false, reason: 'Webhook signature verification failed.' };
  }

  return { valid: true, timestamp: Number(timestamp) };
}

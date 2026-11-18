import {
  resolveSupabaseServerConfig,
  readJsonBody,
  verifyAdminRequest,
} from './contact-service.js';
import {
  DEFAULT_PAYMENT_PROVIDERS,
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_OF_SERVICE,
  readLocalStoreRaw,
  writeLocalStoreRaw,
  isServerlessReadOnlyEnv,
} from './shop-data.js';

export const SOCIAL_PLATFORM_LABELS = {
  pinterest: 'Pinterest',
  instagram: 'Instagram',
  linktree: 'Linktree',
  kofi: 'Ko-fi',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

export const DEFAULT_SOCIAL_MEDIA = {
  pinterest: { enabled: true, url: 'https://ph.pinterest.com/FreecafeDecals/' },
  instagram: { enabled: true, url: 'https://www.instagram.com/meitzii.art' },
  linktree: { enabled: true, url: 'https://linktr.ee/Cheumeitzii' },
  kofi: { enabled: true, url: 'https://ko-fi.com/cheumeitzii' },
  tiktok: { enabled: false, url: '' },
  facebook: { enabled: false, url: '' },
};

export function isValidSocialHttpUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const protocolOk = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    const hostOk = Boolean(parsed.hostname && parsed.hostname.includes('.'));
    return protocolOk && hostOk;
  } catch {
    return false;
  }
}

export function sanitizeSocialMedia(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const result = {};
  for (const key of Object.keys(SOCIAL_PLATFORM_LABELS)) {
    const entry = src[key];
    if (entry && typeof entry === 'object') {
      const cleanUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
      result[key] = {
        enabled: Boolean(entry.enabled),
        url: cleanUrl && isValidSocialHttpUrl(cleanUrl) ? cleanUrl : '',
      };
    } else {
      result[key] = { ...DEFAULT_SOCIAL_MEDIA[key] };
    }
  }
  return result;
}

function sanitizeQrImageValue(raw) {
  const clean = String(raw || '').trim();
  if (!clean) return '';
  if (clean.startsWith('/uploads/') || clean.startsWith('/images/')) return clean.slice(0, 500);
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(clean)) {
    return clean.length <= 750000 ? clean : '';
  }
  if (isValidSocialHttpUrl(clean)) return clean.slice(0, 1000);
  return '';
}

function sanitizeQrPayloadValue(raw) {
  return String(raw || '')
    .replace(/[\r\n\t]+/g, '')
    .trim()
    .slice(0, 2000);
}

function sanitizePaymentProviders(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const parsedRate = Number(src.phpExchangeRate);
  const safeRate =
    Number.isFinite(parsedRate) && parsedRate >= 20 && parsedRate <= 150
      ? Number(parsedRate.toFixed(2))
      : DEFAULT_PAYMENT_PROVIDERS.phpExchangeRate || 56.5;

  return {
    paypalEnabled: src.paypalEnabled !== false,
    paypalAllowCards: src.paypalAllowCards !== false,
    testMode: Boolean(src.testMode),
    googlePayEnabled: src.googlePayEnabled !== false,
    googlePayMerchantId: String(src.googlePayMerchantId || '').trim().slice(0, 64),
    googlePayMerchantName: String(src.googlePayMerchantName || 'sleepyshroom').trim().slice(0, 80) || 'sleepyshroom',
    gcashEnabled: src.gcashEnabled !== false,
    gcashQrImage: sanitizeQrImageValue(src.gcashQrImage),
    gcashQrPayload: sanitizeQrPayloadValue(src.gcashQrPayload),
    gcashAccountName: String(src.gcashAccountName || '').trim().slice(0, 100),
    gcashAccountNumber: String(src.gcashAccountNumber || '').trim().slice(0, 40),
    gcashInstructions:
      String(src.gcashInstructions || DEFAULT_PAYMENT_PROVIDERS.gcashInstructions || '').trim().slice(0, 400),
    mayaEnabled: src.mayaEnabled !== false,
    mayaQrImage: sanitizeQrImageValue(src.mayaQrImage),
    mayaQrPayload: sanitizeQrPayloadValue(src.mayaQrPayload),
    mayaAccountName: String(src.mayaAccountName || '').trim().slice(0, 100),
    mayaAccountNumber: String(src.mayaAccountNumber || '').trim().slice(0, 40),
    mayaInstructions:
      String(src.mayaInstructions || DEFAULT_PAYMENT_PROVIDERS.mayaInstructions || '').trim().slice(0, 400),
    phpExchangeRate: safeRate,
  };
}

export function validateSocialMediaInput(rawSocial) {
  if (!rawSocial || typeof rawSocial !== 'object') return null;
  for (const [key, label] of Object.entries(SOCIAL_PLATFORM_LABELS)) {
    const entry = rawSocial[key];
    if (entry && typeof entry === 'object' && typeof entry.url === 'string') {
      const trimmedUrl = entry.url.trim();
      if (trimmedUrl && !isValidSocialHttpUrl(trimmedUrl)) {
        return `Please enter a valid http:// or https:// URL for ${label}.`;
      }
    }
  }
  return null;
}

export function validatePaymentProvidersInput(rawProviders) {
  if (!rawProviders || typeof rawProviders !== 'object') return null;
  if (rawProviders.phpExchangeRate !== undefined) {
    const rate = Number(rawProviders.phpExchangeRate);
    if (!Number.isFinite(rate) || rate < 20 || rate > 150) {
      return 'Please enter a valid USD to PHP exchange rate between 20 and 150.';
    }
  }
  for (const [field, label] of [
    ['gcashQrImage', 'GCash QR Code'],
    ['mayaQrImage', 'Maya QR Code'],
  ]) {
    const val = String(rawProviders[field] || '').trim();
    if (val && !sanitizeQrImageValue(val)) {
      return `Please upload a valid image file (PNG/JPG/WebP) or http(s) URL for ${label}.`;
    }
  }
  return null;
}

/**
 * @param {any} rawSettings
 * @param {any} [fallbackSettings]
 */
export function mergeWithDefaultSettings(rawSettings, fallbackSettings = null) {
  const localRaw = readLocalStoreRaw();
  const baseSettings = fallbackSettings || localRaw?.settings || {};
  const merged = {
    storeName: 'sleepyshroom',
    tagline: 'Little screens, sweeter dreams.',
    contactEmail: 'shop.sleepyshroom@gmail.com',
    currency: 'USD',
    currencySymbol: '$',
    ...baseSettings,
    ...(rawSettings || {}),
    seo: {
      ...(baseSettings.seo || {}),
      ...((rawSettings && rawSettings.seo) || {}),
    },
    socialMedia: sanitizeSocialMedia(
      (rawSettings && rawSettings.socialMedia) || baseSettings.socialMedia || DEFAULT_SOCIAL_MEDIA
    ),
    paymentProviders: sanitizePaymentProviders(
      (rawSettings && rawSettings.paymentProviders) ||
        baseSettings.paymentProviders ||
        DEFAULT_PAYMENT_PROVIDERS
    ),
    privacyPolicy: (rawSettings && rawSettings.privacyPolicy) || baseSettings.privacyPolicy || DEFAULT_PRIVACY_POLICY,
    termsOfService:
      (rawSettings && rawSettings.termsOfService) || baseSettings.termsOfService || DEFAULT_TERMS_OF_SERVICE,
    redeemedDiscountCodes: {
      ...(baseSettings.redeemedDiscountCodes && typeof baseSettings.redeemedDiscountCodes === 'object'
        ? baseSettings.redeemedDiscountCodes
        : {}),
      ...(rawSettings &&
      rawSettings.redeemedDiscountCodes &&
      typeof rawSettings.redeemedDiscountCodes === 'object'
        ? rawSettings.redeemedDiscountCodes
        : {}),
    },
  };
  return merged;
}

export async function fetchSupabaseSettings() {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) return null;

  const key = cfg.serviceRoleKey || cfg.anonKey;
  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/site_settings?id=eq.default&select=settings_json&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row && row.settings_json && typeof row.settings_json === 'object') {
      return row.settings_json;
    }
  } catch {
    // Table may not exist yet; fall back seamlessly to local/store defaults
  }
  return null;
}

/**
 * @param {any} settingsObj
 * @param {any} [authOverride]
 */
export async function upsertSupabaseSettings(settingsObj, authOverride = null) {
  const cfg = authOverride?.cfg || resolveSupabaseServerConfig();
  if (!cfg.configured) return { saved: false, skipped: true, reason: 'supabase_unconfigured' };

  const apiKey = authOverride?.restApiKey || cfg.serviceRoleKey || cfg.anonKey;
  const authToken = authOverride?.restAuthToken || cfg.serviceRoleKey || cfg.anonKey;

  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/site_settings?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: 'default',
        settings_json: settingsObj,
        updated_at: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      return { saved: true, statusCode: 200 };
    }

    const errPayload = await res.json().catch(() => null);
    const errCode = String(errPayload?.code || '');
    const errMsg = String(errPayload?.message || errPayload?.error || `HTTP ${res.status}`);

    if (
      res.status === 404 ||
      errCode === 'PGRST205' ||
      errCode === '42P01' ||
      /site_settings/i.test(errMsg) && /not found|does not exist|schema cache/i.test(errMsg)
    ) {
      return {
        saved: false,
        statusCode: 503,
        needsTableSetup: true,
        reason: 'missing_table',
        error:
          'The public.site_settings table has not been created in Supabase yet. Run the 20261117_site_settings.sql migration in Supabase SQL Editor so settings save across refreshes.',
      };
    }

    if (res.status === 401 || res.status === 403 || errCode === '42501') {
      return {
        saved: false,
        statusCode: 403,
        reason: 'rls_denied',
        error:
          'Supabase blocked saving settings (RLS permission denied or missing SUPABASE_SERVICE_ROLE_KEY). Ensure your account has admin role in public.profiles or set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.',
      };
    }

    return {
      saved: false,
      statusCode: res.status || 502,
      reason: 'supabase_error',
      error: `Could not save settings to Supabase: ${errMsg}`,
    };
  } catch (err) {
    return {
      saved: false,
      statusCode: 502,
      reason: 'request_failed',
      error: err?.message || 'Network error while saving settings to Supabase.',
    };
  }
}

export async function handleGetPublicContent() {
  const localRaw = readLocalStoreRaw();
  const supaSettings = await fetchSupabaseSettings();
  const settings = mergeWithDefaultSettings(supaSettings, localRaw?.settings);
  const slides = Array.isArray(localRaw?.carouselSlides)
    ? localRaw.carouselSlides
        .filter((s) => s && s.status === 'published' && s.visible !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];

  return {
    status: 200,
    body: {
      settings,
      carouselSlides: slides,
    },
  };
}

export async function handleAdminSaveSettings(req) {
  const admin = await verifyAdminRequest(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const body = await readJsonBody(req);
  const validationError =
    validateSocialMediaInput(body?.socialMedia) ||
    validatePaymentProvidersInput(body?.paymentProviders);
  if (validationError) {
    return { status: 400, body: { success: false, error: validationError } };
  }

  const localRaw = readLocalStoreRaw();
  const supaCurrent = await fetchSupabaseSettings();
  const currentMerged = mergeWithDefaultSettings(supaCurrent, localRaw?.settings);
  const nextSettings = mergeWithDefaultSettings(body, currentMerged);

  const localWritten =
    !isServerlessReadOnlyEnv() && localRaw && typeof localRaw === 'object'
      ? (() => {
          localRaw.settings = nextSettings;
          return writeLocalStoreRaw(localRaw);
        })()
      : false;

  const supaResult = await upsertSupabaseSettings(nextSettings, admin);
  if (!supaResult.saved && !supaResult.skipped) {
    // On Vercel (or whenever Supabase is active), never fake success if Supabase rejected the write
    if (isServerlessReadOnlyEnv() || !localWritten || admin?.cfg?.configured) {
      return {
        status: supaResult.statusCode || 503,
        body: {
          success: false,
          needsTableSetup: Boolean(supaResult.needsTableSetup),
          error:
            supaResult.error ||
            'Unable to persist settings to Supabase database.',
        },
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      settings: nextSettings,
      persistedToSupabase: Boolean(supaResult.saved),
    },
  };
}

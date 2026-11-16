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

function sanitizePaymentProviders(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    paypalEnabled: src.paypalEnabled !== false,
    paypalAllowCards: src.paypalAllowCards !== false,
    testMode: Boolean(src.testMode),
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
  if (!cfg.configured) return { saved: false, reason: 'supabase_unconfigured' };

  const apiKey = authOverride?.restApiKey || cfg.serviceRoleKey || cfg.anonKey;
  const authToken = authOverride?.restAuthToken || cfg.serviceRoleKey || cfg.anonKey;

  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/site_settings`, {
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
    return { saved: res.ok };
  } catch {
    return { saved: false, reason: 'request_failed' };
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
  const validationError = validateSocialMediaInput(body?.socialMedia);
  if (validationError) {
    return { status: 400, body: { success: false, error: validationError } };
  }

  const localRaw = readLocalStoreRaw();
  const supaCurrent = await fetchSupabaseSettings();
  const currentMerged = mergeWithDefaultSettings(supaCurrent, localRaw?.settings);
  const nextSettings = mergeWithDefaultSettings(body, currentMerged);

  if (!isServerlessReadOnlyEnv() && localRaw && typeof localRaw === 'object') {
    localRaw.settings = nextSettings;
    writeLocalStoreRaw(localRaw);
  }

  await upsertSupabaseSettings(nextSettings, admin);

  return {
    status: 200,
    body: {
      success: true,
      settings: nextSettings,
    },
  };
}

import type {
  SocialMediaLinkConfig,
  SocialMediaSettings,
  SocialPlatformKey,
  WebsiteSettings,
} from '../types/index.ts';

export interface SocialPlatformMeta {
  key: SocialPlatformKey;
  label: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS_META: SocialPlatformMeta[] = [
  {
    key: 'pinterest',
    label: 'Pinterest',
    placeholder: 'https://www.pinterest.com/yourhandle',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://www.instagram.com/yourhandle',
  },
  {
    key: 'linktree',
    label: 'Linktree',
    placeholder: 'https://linktr.ee/yourhandle',
  },
  {
    key: 'kofi',
    label: 'Ko-fi',
    placeholder: 'https://ko-fi.com/yourhandle',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://www.tiktok.com/@yourhandle',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/yourpage',
  },
];

export function createDefaultSocialMediaSettings(): SocialMediaSettings {
  return {
    pinterest: { enabled: false, url: '' },
    instagram: { enabled: false, url: '' },
    linktree: { enabled: false, url: '' },
    kofi: { enabled: false, url: '' },
    tiktok: { enabled: false, url: '' },
    facebook: { enabled: false, url: '' },
  };
}

export function isValidSocialHttpUrl(rawUrl: string): boolean {
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

export function normalizeSocialMediaSettings(
  raw?: Partial<Record<SocialPlatformKey, Partial<SocialMediaLinkConfig>>> | null
): SocialMediaSettings {
  const defaults = createDefaultSocialMediaSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  for (const { key } of SOCIAL_PLATFORMS_META) {
    const item = raw[key];
    if (item && typeof item === 'object') {
      const cleanUrl = typeof item.url === 'string' ? item.url.trim() : '';
      defaults[key] = {
        enabled: Boolean(item.enabled),
        url: cleanUrl,
      };
    }
  }

  return defaults;
}

export interface ActiveSocialPlatform extends SocialPlatformMeta {
  url: string;
}

export function getVisibleSocialPlatforms(
  settings?: WebsiteSettings | null
): ActiveSocialPlatform[] {
  const normalized = normalizeSocialMediaSettings(settings?.socialMedia);
  return SOCIAL_PLATFORMS_META.filter(({ key }) => {
    const entry = normalized[key];
    return entry.enabled && isValidSocialHttpUrl(entry.url);
  }).map(meta => ({
    ...meta,
    url: normalized[meta.key].url,
  }));
}

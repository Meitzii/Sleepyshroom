import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SleepyshroomRuntimeEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

const SINGLETON_CLIENT_KEY = '__SLEEPYSHROOM_SUPABASE_CLIENT__';
const SINGLETON_SIGNATURE_KEY = '__SLEEPYSHROOM_SUPABASE_SIG__';
const RUNTIME_ENV_KEY = '__SLEEPYSHROOM_ENV__';

const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const normalizeSupabaseUrl = (value: string | undefined): string => {
  if (!value) return '';
  let clean = stripWrappingQuotes(value).replace(/\/+$/, '');
  if (!clean || clean.includes('your-project-ref') || clean.startsWith('MY_')) {
    return '';
  }
  if (!clean.includes('://') && /^[a-z0-9.-]+\.supabase\.(co|in|net)$/i.test(clean)) {
    clean = `https://${clean}`;
  }
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return clean;
    }
  } catch {
    return '';
  }
  return '';
};

const isSecretOrServiceRoleKey = (value: string): boolean => {
  if (value.startsWith('sb_secret_')) return true;
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as { role?: string };
      if (payload?.role === 'service_role') return true;
    } catch {
      // Ignore malformed payload
    }
  }
  return false;
};

const normalizePublicKey = (value: string | undefined): string => {
  if (!value) return '';
  const clean = stripWrappingQuotes(value);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) {
    return '';
  }
  if (isSecretOrServiceRoleKey(clean)) {
    return '';
  }
  return clean;
};

const getRuntimeEnv = (): SleepyshroomRuntimeEnv => {
  try {
    const globalObj = globalThis as Record<string, unknown>;
    const runtime = globalObj[RUNTIME_ENV_KEY];
    if (runtime && typeof runtime === 'object') {
      return runtime as SleepyshroomRuntimeEnv;
    }
  } catch {
    // Ignore
  }
  return {};
};

const runtimeEnv = getRuntimeEnv();

const buildUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    : undefined;
const buildAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
    : undefined;
const buildPublishableKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
    : undefined;

// Prefer build-time Vite static replacements, falling back to /api/runtime-config runtime injection
const rawUrl =
  normalizeSupabaseUrl(buildUrl) ||
  normalizeSupabaseUrl(runtimeEnv.VITE_SUPABASE_URL);

const rawAnonKey =
  normalizePublicKey(buildAnonKey) ||
  normalizePublicKey(buildPublishableKey) ||
  normalizePublicKey(runtimeEnv.VITE_SUPABASE_ANON_KEY) ||
  normalizePublicKey(runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY);

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured =
  isValidHttpUrl(rawUrl) &&
  rawAnonKey.length > 0 &&
  !rawUrl.includes('your-project-ref') &&
  !rawAnonKey.includes('your-supabase-');

const resolveSingletonClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) {
    return null;
  }

  const signature = `${rawUrl}::${rawAnonKey}`;
  const globalObj = globalThis as Record<string, unknown>;
  const existing = globalObj[SINGLETON_CLIENT_KEY] as SupabaseClient | undefined;
  const existingSig = globalObj[SINGLETON_SIGNATURE_KEY] as string | undefined;

  if (existing && existingSig === signature) {
    return existing;
  }

  const client = createClient(rawUrl, rawAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  globalObj[SINGLETON_CLIENT_KEY] = client;
  globalObj[SINGLETON_SIGNATURE_KEY] = signature;
  return client;
};

export const supabase: SupabaseClient | null = resolveSingletonClient();

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let clean = stripWrappingQuotes(raw).replace(/\/+$/, '');
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
}

function isServiceRoleOrSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as {role?: string};
      if (payload?.role === 'service_role') return true;
    } catch {
      // Non-JSON JWT payload; treat conservatively only if not matching secret prefix
    }
  }
  return false;
}

function normalizePublicSupabaseKey(raw: string | undefined): string {
  if (!raw) return '';
  const clean = stripWrappingQuotes(raw);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) {
    return '';
  }
  if (isServiceRoleOrSecretKey(clean)) {
    return '';
  }
  return clean;
}

function pickFirst(
  candidates: string[],
  processEnv: Record<string, string | undefined>,
  fileEnv: Record<string, string>,
  normalizer: (val: string | undefined) => string,
): string {
  for (const name of candidates) {
    const fromProc = normalizer(processEnv[name]);
    if (fromProc) return fromProc;
  }
  for (const name of candidates) {
    const fromFile = normalizer(fileEnv[name]);
    if (fromFile) return fromFile;
  }
  return '';
}

export default defineConfig(({mode}) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');

  const resolvedUrl = pickFirst(
    ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
    process.env,
    fileEnv,
    normalizeSupabaseUrl,
  );
  const resolvedAnonKey = pickFirst(
    [
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ],
    process.env,
    fileEnv,
    normalizePublicSupabaseKey,
  );
  const resolvedPublishableKey = pickFirst(
    [
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ],
    process.env,
    fileEnv,
    normalizePublicSupabaseKey,
  );

  if (resolvedUrl) process.env.VITE_SUPABASE_URL = resolvedUrl;
  if (resolvedAnonKey) process.env.VITE_SUPABASE_ANON_KEY = resolvedAnonKey;
  if (resolvedPublishableKey) {
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = resolvedPublishableKey;
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

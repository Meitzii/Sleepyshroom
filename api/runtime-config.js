function stripWrappingQuotes(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeSupabaseUrl(raw) {
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

function isSecretOrServiceRoleKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);
      if (payload && payload.role === 'service_role') return true;
    } catch {
      // Ignore malformed payload
    }
  }
  return false;
}

function normalizePublicKey(raw) {
  if (!raw) return '';
  const clean = stripWrappingQuotes(raw);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) {
    return '';
  }
  if (isSecretOrServiceRoleKey(clean)) {
    return '';
  }
  return clean;
}

function pickFirst(candidates, normalizer) {
  for (const name of candidates) {
    const val = normalizer(process.env[name]);
    if (val) return val;
  }
  return '';
}

/**
 * @param {any} _req
 * @param {any} res
 */
export default function handler(_req, res) {
  const supabaseUrl = pickFirst(
    ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
    normalizeSupabaseUrl
  );
  const supabaseAnonKey = pickFirst(
    [
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ],
    normalizePublicKey
  );
  const supabasePublishableKey = pickFirst(
    [
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ],
    normalizePublicKey
  );

  const payload = {};
  if (supabaseUrl) payload.VITE_SUPABASE_URL = supabaseUrl;
  if (supabaseAnonKey) payload.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;
  if (supabasePublishableKey) payload.VITE_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.status(200).send(`window.__SLEEPYSHROOM_ENV__ = ${JSON.stringify(payload)};`);
}

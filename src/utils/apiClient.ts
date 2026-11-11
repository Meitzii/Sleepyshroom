import { supabase } from '../lib/supabase.ts';

export interface ParsedApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  isJson: boolean;
  rawText: string;
}

/**
 * Safely parses any HTTP Response without throwing SyntaxError when an upstream server
 * or host returns plain text or HTML (for example, a 404 or 502 error page).
 */
export async function parseJsonResponse<T = any>(
  response: Response
): Promise<ParsedApiResponse<T>> {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text().catch(() => '');
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      isJson: contentType.includes('application/json'),
      rawText,
    };
  }

  const looksLikeJson =
    contentType.includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed) as T;
      return {
        ok: response.ok,
        status: response.status,
        data: parsed,
        isJson: true,
        rawText,
      };
    } catch {
      // Fall through cleanly as non-JSON
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data: null,
    isJson: false,
    rawText,
  };
}

export function extractApiErrorMessage(
  parsed: ParsedApiResponse<any>,
  fallbackMessage: string
): string {
  const payloadError =
    parsed.data &&
    typeof parsed.data === 'object' &&
    (parsed.data.error || parsed.data.message);
  if (typeof payloadError === 'string' && payloadError.trim()) {
    return payloadError.trim();
  }

  if (parsed.status === 404) {
    return 'Service endpoint not found (404). Please try again in a moment.';
  }
  if (parsed.status === 401 || parsed.status === 403) {
    return 'Session expired or unauthorized. Please sign in and try again.';
  }
  if (parsed.status >= 500) {
    return 'Server error while processing your request. Please try again shortly.';
  }

  return fallbackMessage;
}

export async function getOptionalSupabaseAuthHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

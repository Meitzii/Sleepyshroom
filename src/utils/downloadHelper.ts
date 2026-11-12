import { getOptionalSupabaseAuthHeader, parseJsonResponse } from './apiClient.ts';

/**
 * Direct binary download helper reserved exclusively for complimentary freebie wallpapers.
 * Paid digital wallpapers MUST go through `downloadAuthorizedOrderFile`.
 */
export async function downloadWallpaperFile(imageUrl: string, filename: string): Promise<boolean> {
  const cleanFilename =
    filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.png')
      ? filename
      : `${filename.replace(/\.zip$/i, '')}.jpg`;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch free wallpaper: ${response.status}`);
    }

    const blob = await response.blob();
    const imageBlob = blob.type.startsWith('image/')
      ? blob
      : new Blob([blob], { type: 'image/jpeg' });

    const blobUrl = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return true;
  } catch (err) {
    console.warn('Direct freebie download error:', err);
    return false;
  }
}

function parseFilenameFromContentDisposition(header: string | null, fallback: string): string {
  if (header) {
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(header);
    if (match?.[1]) {
      return decodeURIComponent(match[1].trim());
    }
  }
  const lower = fallback.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.png')) {
    return fallback;
  }
  return `${fallback.replace(/\.zip$/i, '')}.jpg`;
}

/**
 * Downloads a purchased digital wallpaper strictly through server-side PayMongo verification.
 * Unpaid, pending, cancelled, or failed orders are rejected with HTTP 403 and never bypassed.
 */
export async function downloadAuthorizedOrderFile(
  downloadToken: string,
  productId: string,
  fallbackFilename = 'sleepyshroom_wallpaper.jpg'
): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = String(downloadToken || '').trim();
  const cleanProd = String(productId || '').trim();

  if (!cleanToken || !cleanProd) {
    return {
      ok: false,
      error: 'Missing download authorization token or product identifier.',
    };
  }

  try {
    const authHeaders = await getOptionalSupabaseAuthHeader();
    const res = await fetch(
      `/api/downloads/${encodeURIComponent(cleanToken)}?productId=${encodeURIComponent(cleanProd)}`,
      {
        headers: authHeaders,
      }
    );

    if (!res.ok) {
      const parsed = await parseJsonResponse<{ error?: string }>(res);
      return {
        ok: false,
        error:
          (parsed.isJson && parsed.data?.error) ||
          'Payment has not been verified yet. Downloads unlock once PayMongo confirms payment.',
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const jsonBody = await res.json().catch(() => null);
      return {
        ok: false,
        error: jsonBody?.error || 'Download could not be authorized for this item.',
      };
    }

    const blob = await res.blob();
    const filename = parseFilenameFromContentDisposition(
      res.headers.get('content-disposition'),
      fallbackFilename
    );
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Unable to download file right now. Please try again.',
    };
  }
}

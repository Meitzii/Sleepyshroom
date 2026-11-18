import { getOptionalSupabaseAuthHeader, parseJsonResponse } from './apiClient.ts';

/**
 * Direct binary download helper reserved exclusively for complimentary freebie wallpapers.
 * Paid digital wallpapers MUST go through `downloadAuthorizedOrderFile`.
 */
function inferExtensionFromUrlOrMime(url: string, mime = ''): string {
  const mimeLower = mime.toLowerCase();
  if (mimeLower.includes('zip')) return '.zip';
  if (mimeLower.includes('png')) return '.png';
  if (mimeLower.includes('webp')) return '.webp';
  if (mimeLower.includes('gif')) return '.gif';
  if (mimeLower.includes('jpeg') || mimeLower.includes('jpg')) return '.jpg';

  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  if (cleanUrl.endsWith('.zip')) return '.zip';
  if (cleanUrl.endsWith('.png')) return '.png';
  if (cleanUrl.endsWith('.webp')) return '.webp';
  if (cleanUrl.endsWith('.gif')) return '.gif';
  return '.jpg';
}

export async function downloadWallpaperFile(imageUrl: string, filename: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch free wallpaper: ${response.status}`);
    }

    const blob = await response.blob();
    const detectedExt = inferExtensionFromUrlOrMime(imageUrl, blob.type);
    const lowerName = (filename || 'sleepyshroom_wallpaper').toLowerCase();
    const hasKnownExt =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.gif') ||
      lowerName.endsWith('.zip');
    const cleanFilename = hasKnownExt
      ? (lowerName.endsWith('.zip') && detectedExt !== '.zip'
          ? filename.replace(/\.zip$/i, detectedExt)
          : filename)
      : `${filename}${detectedExt}`;

    const finalBlob =
      blob.type && blob.type !== 'application/octet-stream'
        ? blob
        : new Blob([blob], { type: detectedExt === '.zip' ? 'application/zip' : 'image/png' });

    const blobUrl = URL.createObjectURL(finalBlob);
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
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.zip')
  ) {
    return fallback;
  }
  return `${fallback}.jpg`;
}

/**
 * Downloads a purchased digital wallpaper strictly through server-side PayPal verification.
 * Unpaid, pending, cancelled, failed, or refunded orders are rejected with HTTP 403 and never bypassed.
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
          'Payment has not been verified yet. Downloads unlock once PayPal confirms payment.',
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

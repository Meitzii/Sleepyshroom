import { parseJsonResponse } from './apiClient.ts';

export interface UploadStoreAssetOptions {
  token?: string | null;
  folder?: string;
  optimizeImage?: boolean;
  maxDimension?: number;
}

export interface UploadStoreAssetResult {
  url: string;
  filename?: string;
  size?: number;
  storage?: string;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Keeps small images, SVGs, and GIFs untouched, while smoothly downscaling large
 * high-resolution screenshots/photos so uploads stay crisp and reliable on both
 * local Express and Vercel serverless functions.
 */
export async function optimizeImageDataUrl(
  file: File,
  options: { maxDimension?: number; maxChars?: number } = {}
): Promise<string> {
  const maxDimension = options.maxDimension ?? 1920;
  const maxChars = options.maxChars ?? 1_650_000;

  const rawDataUrl = await readFileAsDataUrl(file);
  const lowerType = (file.type || '').toLowerCase();

  if (
    lowerType.includes('svg') ||
    lowerType.includes('gif') ||
    (!lowerType.startsWith('image/') && !/\.(png|jpe?g|webp)$/i.test(file.name))
  ) {
    return rawDataUrl;
  }

  // Already small enough -> preserve pixel-perfect original file
  if (rawDataUrl.length <= 450_000 && !lowerType.includes('bmp')) {
    return rawDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          maxDimension / Math.max(img.width || 1, img.height || 1)
        );
        const targetW = Math.max(1, Math.round((img.width || 1) * scale));
        const targetH = Math.max(1, Math.round((img.height || 1) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Preserve PNG if lossless output fits comfortably
        if (lowerType.includes('png')) {
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length <= maxChars) {
            resolve(pngUrl);
            return;
          }
        }

        const qualities = [0.9, 0.82, 0.72, 0.6];
        for (const q of qualities) {
          const webpUrl = canvas.toDataURL('image/webp', q);
          if (webpUrl.startsWith('data:image/webp') && webpUrl.length <= maxChars) {
            resolve(webpUrl);
            return;
          }
          const jpgUrl = canvas.toDataURL('image/jpeg', q);
          if (jpgUrl.length <= maxChars) {
            resolve(jpgUrl);
            return;
          }
        }

        resolve(canvas.toDataURL('image/jpeg', 0.55));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function uploadStoreAsset(
  file: File,
  options: UploadStoreAssetOptions = {}
): Promise<UploadStoreAssetResult> {
  const shouldOptimize = options.optimizeImage !== false;
  const isImage =
    (file.type || '').startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Selected file is larger than 15 MB. Please choose a smaller image, PDF, or ZIP archive.');
  }

  const dataUrl =
    shouldOptimize && isImage
      ? await optimizeImageDataUrl(file, { maxDimension: options.maxDimension })
      : await readFileAsDataUrl(file);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dataUrl,
      filename: file.name,
      folder: options.folder || 'images',
    }),
  });

  if (res.status === 413) {
    throw new Error(
      'File is too large for the upload request. Please compress the image or upload a smaller file (< 3 MB on hosted deployments).'
    );
  }

  const parsed = await parseJsonResponse<{
    success?: boolean;
    url?: string;
    filename?: string;
    size?: number;
    storage?: string;
    error?: string;
  }>(res);

  if (!parsed.ok || !parsed.isJson || !parsed.data?.url) {
    throw new Error(
      (parsed.isJson && parsed.data?.error) ||
        `Upload failed (HTTP ${res.status}). Please sign in as admin and try again.`
    );
  }

  return {
    url: parsed.data.url,
    filename: parsed.data.filename,
    size: parsed.data.size,
    storage: parsed.data.storage,
  };
}

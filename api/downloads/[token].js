import { handleAuthorizedDownload } from '../../lib/checkout-service.js';

function getTokenParam(req) {
  const raw = req.query?.token;
  if (Array.isArray(raw)) return String(raw[0] || '');
  if (raw) return String(raw);
  const path = String(req.url || '').split('?')[0];
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ authorized: false, error: 'Method not allowed' });
  }

  try {
    const token = getTokenParam(req);
    const productIdRaw = req.query?.productId;
    const productId = Array.isArray(productIdRaw) ? String(productIdRaw[0] || '') : String(productIdRaw || '');
    const result = await handleAuthorizedDownload(req, token, productId);

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');

    if (result.kind === 'binary') {
      res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${String(result.filename || 'wallpaper.jpg').replace(/"/g, '')}"`
      );
      return res.status(result.status).send(result.buffer);
    }

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Authorized download error:', err);
    return res.status(500).json({
      authorized: false,
      error: err?.message || 'Unable to authorize digital download.',
    });
  }
}

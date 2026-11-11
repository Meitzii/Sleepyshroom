import { handleGetOrderByToken } from '../../lib/checkout-service.js';

function getOrderParam(req) {
  const raw = req.query?.idOrToken;
  if (Array.isArray(raw)) return String(raw[0] || '');
  if (raw) return String(raw);
  const path = String(req.url || '').split('?')[0];
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const idOrToken = getOrderParam(req);
    const result = await handleGetOrderByToken(req, idOrToken);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Order lookup error:', err);
    return res.status(500).json({ error: 'Unable to retrieve order.' });
  }
}

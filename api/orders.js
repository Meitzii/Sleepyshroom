import { handleListOrders } from '../lib/checkout-service.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handleListOrders(req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Orders list error:', err);
    return res.status(500).json({ error: 'Unable to load orders.' });
  }
}

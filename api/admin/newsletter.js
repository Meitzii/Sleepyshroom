import {
  handleAdminListSubscribers,
  handleAdminUpdateSubscriber,
  handleAdminDeleteSubscriber,
} from '../../lib/newsletter-service.js';

export default async function handler(req, res) {
  const urlObj = new URL(req.url || '/api/admin/newsletter', 'http://localhost');
  const id = String(req.query?.id || urlObj.searchParams.get('id') || '').trim();

  try {
    if (req.method === 'GET') {
      const result = await handleAdminListSubscribers(req);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'PATCH' && id) {
      const result = await handleAdminUpdateSubscriber(req, id);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'DELETE' && id) {
      const result = await handleAdminDeleteSubscriber(req, id);
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed or missing subscriber ID.' });
  } catch (err) {
    console.error('Admin newsletter endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to process newsletter admin request.',
    });
  }
}

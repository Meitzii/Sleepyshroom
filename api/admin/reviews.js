import {
  handleAdminListReviews,
  handleAdminModerateReview,
  handleAdminDeleteReview,
} from '../../lib/reviews-service.js';

export default async function handler(req, res) {
  const urlObj = new URL(req.url || '/api/admin/reviews', 'http://localhost');
  const id = String(req.query?.id || urlObj.searchParams.get('id') || '').trim();

  try {
    if (req.method === 'GET') {
      const result = await handleAdminListReviews(req);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'PATCH' && id) {
      const result = await handleAdminModerateReview(req, id);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'DELETE' && id) {
      const result = await handleAdminDeleteReview(req, id);
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed or missing review ID.' });
  } catch (err) {
    console.error('Admin reviews error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to process review admin request.',
    });
  }
}

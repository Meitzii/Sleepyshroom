import {
  handleGetProductReviews,
  handleSubmitOrUpdateReview,
} from '../lib/reviews-service.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await handleGetProductReviews(req);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const result = await handleSubmitOrUpdateReview(req);
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unexpected reviews error.',
    });
  }
}

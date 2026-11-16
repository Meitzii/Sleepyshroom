import {
  handleNewsletterSubscribe,
  handleNewsletterUnsubscribe,
} from '../lib/newsletter-service.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const result = await handleNewsletterSubscribe(req);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'DELETE' || req.method === 'PATCH' || req.method === 'GET') {
      const result = await handleNewsletterUnsubscribe(req);
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Newsletter endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unexpected newsletter server error.',
    });
  }
}

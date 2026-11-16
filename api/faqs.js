import { handleListFaqs } from '../lib/faqs-service.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleListFaqs({ includeUnpublished: false });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('FAQs endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to load FAQs.',
    });
  }
}

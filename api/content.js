import { handleGetPublicContent } from '../lib/settings-service.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const result = await handleGetPublicContent();
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Content endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to load storefront content.',
    });
  }
}

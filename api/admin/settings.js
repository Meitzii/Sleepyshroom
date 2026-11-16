import { handleAdminSaveSettings } from '../../lib/settings-service.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'PUT, PATCH');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleAdminSaveSettings(req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Admin settings endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to save storefront settings.',
    });
  }
}

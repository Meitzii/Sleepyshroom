import { handleAdminListMessages } from '../../lib/contact-service.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleAdminListMessages(req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Admin messages list error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to load contact messages.',
    });
  }
}

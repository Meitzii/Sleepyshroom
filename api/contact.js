import { handleContactSubmission } from '../lib/contact-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleContactSubmission(req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Contact endpoint error:', err);
    return res.status(500).json({
      success: false,
      savedToDatabase: false,
      error: 'Unexpected error while submitting your message.',
    });
  }
}

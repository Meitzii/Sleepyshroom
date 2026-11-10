import {
  handleAdminUpdateMessageStatus,
  handleAdminDeleteMessage,
} from '../../../lib/contact-service.js';

function getMessageId(req) {
  const raw = req.query?.id;
  if (Array.isArray(raw)) return String(raw[0] || '');
  if (raw) return String(raw);
  const path = String(req.url || '').split('?')[0];
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

export default async function handler(req, res) {
  const id = getMessageId(req);

  try {
    if (req.method === 'PATCH') {
      const result = await handleAdminUpdateMessageStatus(req, id);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'DELETE') {
      const result = await handleAdminDeleteMessage(req, id);
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin message update/delete error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to update contact message.',
    });
  }
}

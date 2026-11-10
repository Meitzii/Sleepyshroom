import { handleAdminReplyMessage } from '../../../../lib/contact-service.js';

function getMessageId(req) {
  const raw = req.query?.id;
  if (Array.isArray(raw)) return String(raw[0] || '');
  if (raw) return String(raw);
  const path = String(req.url || '').split('?')[0];
  const segments = path.split('/').filter(Boolean);
  return segments.length >= 2 ? segments[segments.length - 2] : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const id = getMessageId(req);
    const result = await handleAdminReplyMessage(req, id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Admin message reply error:', err);
    return res.status(500).json({
      success: false,
      emailDelivered: false,
      error: 'Unable to send reply email.',
    });
  }
}

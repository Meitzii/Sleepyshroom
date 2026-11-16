import {
  handleAdminListEmailLogs,
  handleAdminResendOrderConfirmation,
} from '../../lib/checkout-service.js';
import { readJsonBody } from '../../lib/contact-service.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await handleAdminListEmailLogs(req);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await handleAdminResendOrderConfirmation(req, body.orderId || body.orderNumber || '');
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin email logs error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to process email logs request.',
    });
  }
}

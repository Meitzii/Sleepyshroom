import {
  handleGetPaymentConfig,
  handleCheckoutSubmission,
} from '../lib/checkout-service.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await handleGetPaymentConfig();
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Payment config endpoint error:', err);
      return res.status(500).json({
        error: err?.message || 'Unable to load payment configuration.',
      });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await handleCheckoutSubmission(req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Checkout endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unexpected error while processing checkout.',
    });
  }
}

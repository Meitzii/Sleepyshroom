import { handleDiscountValidation } from '../../lib/checkout-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  try {
    const result = await handleDiscountValidation(req);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Discount validation error:', err);
    return res.status(500).json({
      valid: false,
      message: 'Could not validate promo code.',
    });
  }
}

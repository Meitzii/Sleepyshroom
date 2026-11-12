import { handlePaypalWebhook } from '../../lib/checkout-service.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawRequestBody(req) {
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }
  if (typeof req.rawBody === 'string') {
    return Buffer.from(req.rawBody, 'utf8');
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
  }
  if (chunks.length > 0) {
    return Buffer.concat(chunks);
  }

  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }
  return Buffer.alloc(0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBuffer = await readRawRequestBody(req);
    const result = await handlePaypalWebhook(req, rawBuffer);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[api/webhooks/paypal] Unhandled webhook error:', error);
    return res.status(500).json({
      received: false,
      error: error?.message || 'Failed to process PayPal webhook.',
    });
  }
}

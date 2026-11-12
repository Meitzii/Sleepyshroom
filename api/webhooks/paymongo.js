import { handlePaymongoWebhook } from '../../lib/checkout-service.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawRequestBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ received: false, error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawRequestBody(req);
    const result = await handlePaymongoWebhook(req, rawBody);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('PayMongo webhook handler error:', err);
    return res.status(500).json({
      received: false,
      error: err?.message || 'Unexpected error processing PayMongo webhook.',
    });
  }
}

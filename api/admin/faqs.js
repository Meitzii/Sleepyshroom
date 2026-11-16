import {
  handleAdminListFaqs,
  handleAdminSaveFaq,
  handleAdminDeleteFaq,
} from '../../lib/faqs-service.js';

export default async function handler(req, res) {
  const urlObj = new URL(req.url || '/api/admin/faqs', 'http://localhost');
  const id = String(req.query?.id || urlObj.searchParams.get('id') || '').trim();

  try {
    if (req.method === 'GET') {
      const result = await handleAdminListFaqs(req);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'POST') {
      const result = await handleAdminSaveFaq(req, null);
      return res.status(result.status).json(result.body);
    }

    if ((req.method === 'PUT' || req.method === 'PATCH') && id) {
      const result = await handleAdminSaveFaq(req, id);
      return res.status(result.status).json(result.body);
    }

    if (req.method === 'DELETE' && id) {
      const result = await handleAdminDeleteFaq(req, id);
      return res.status(result.status).json(result.body);
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed or missing FAQ ID.' });
  } catch (err) {
    console.error('Admin FAQs error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to process FAQ admin request.',
    });
  }
}

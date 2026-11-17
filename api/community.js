import { handleContactSubmission } from '../lib/contact-service.js';
import {
  handleGetProductReviews,
  handleSubmitOrUpdateReview,
} from '../lib/reviews-service.js';
import { handleListFaqs } from '../lib/faqs-service.js';
import {
  handleNewsletterSubscribe,
  handleNewsletterUnsubscribe,
} from '../lib/newsletter-service.js';

function firstQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return value ? String(value).trim() : '';
}

function getPathname(req) {
  try {
    return new URL(req.url || '/api/community', 'http://localhost').pathname.replace(/\/+$/, '') || '/api/community';
  } catch {
    return String(req.url || '/api/community').split('?')[0].replace(/\/+$/, '') || '/api/community';
  }
}

function resolveCommunityRoute(req) {
  const explicit = firstQueryValue(req.query?.route).toLowerCase();
  if (explicit) return explicit;

  const pathname = getPathname(req);
  if (pathname === '/api/contact') return 'contact';
  if (pathname === '/api/reviews') return 'reviews';
  if (pathname === '/api/faqs') return 'faqs';
  if (pathname === '/api/newsletter') return 'newsletter';
  return '';
}

export default async function handler(req, res) {
  const route = resolveCommunityRoute(req);

  if (route === 'contact') {
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

  if (route === 'reviews') {
    try {
      if (req.method === 'GET') {
        const result = await handleGetProductReviews(req);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const result = await handleSubmitOrUpdateReview(req);
        return res.status(result.status).json(result.body);
      }

      res.setHeader('Allow', 'GET, POST, PUT, PATCH');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err) {
      console.error('Reviews endpoint error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unexpected reviews error.',
      });
    }
  }

  if (route === 'faqs') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
      const result = await handleListFaqs({ includeUnpublished: false });
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('FAQs endpoint error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to load FAQs.',
      });
    }
  }

  if (route === 'newsletter') {
    try {
      if (req.method === 'POST') {
        const result = await handleNewsletterSubscribe(req);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        const result = await handleNewsletterUnsubscribe(req);
        return res.status(result.status).json(result.body);
      }

      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err) {
      console.error('Newsletter endpoint error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to process newsletter request.',
      });
    }
  }

  return res.status(404).json({ success: false, error: 'Not found' });
}

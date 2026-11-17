import { handleAdminSaveSettings } from '../../lib/settings-service.js';
import {
  handleAdminListReviews,
  handleAdminModerateReview,
  handleAdminDeleteReview,
} from '../../lib/reviews-service.js';
import {
  handleAdminListFaqs,
  handleAdminSaveFaq,
  handleAdminDeleteFaq,
} from '../../lib/faqs-service.js';

function firstQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return value ? String(value).trim() : '';
}

function getUrlParts(req) {
  try {
    const urlObj = new URL(req.url || '/api/admin/store', 'http://localhost');
    return {
      pathname: urlObj.pathname.replace(/\/+$/, '') || '/api/admin/store',
      searchParams: urlObj.searchParams,
    };
  } catch {
    return {
      pathname: String(req.url || '/api/admin/store').split('?')[0].replace(/\/+$/, ''),
      searchParams: new URLSearchParams(),
    };
  }
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(String(segment || '')).trim();
  } catch {
    return String(segment || '').trim();
  }
}

function resolveAdminStoreRoute(req) {
  const explicit = firstQueryValue(req.query?.route).toLowerCase();
  const { pathname, searchParams } = getUrlParts(req);
  const queryId = firstQueryValue(req.query?.id) || String(searchParams.get('id') || '').trim();

  if (explicit === 'settings' || pathname === '/api/admin/settings') {
    return { route: 'settings', id: '' };
  }

  if (
    explicit === 'reviews' ||
    pathname === '/api/admin/reviews' ||
    pathname.startsWith('/api/admin/reviews/')
  ) {
    let id = queryId;
    if (!id && pathname.startsWith('/api/admin/reviews/')) {
      const rest = pathname.slice('/api/admin/reviews/'.length).split('/')[0] || '';
      id = decodeSegment(rest);
    }
    return { route: 'reviews', id };
  }

  if (
    explicit === 'faqs' ||
    pathname === '/api/admin/faqs' ||
    pathname.startsWith('/api/admin/faqs/')
  ) {
    let id = queryId;
    if (!id && pathname.startsWith('/api/admin/faqs/')) {
      const rest = pathname.slice('/api/admin/faqs/'.length).split('/')[0] || '';
      id = decodeSegment(rest);
    }
    return { route: 'faqs', id };
  }

  return { route: explicit, id: queryId };
}

export default async function handler(req, res) {
  const { route, id } = resolveAdminStoreRoute(req);

  if (route === 'settings') {
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      res.setHeader('Allow', 'PUT, PATCH');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
      const result = await handleAdminSaveSettings(req);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Admin settings endpoint error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to save storefront settings.',
      });
    }
  }

  if (route === 'reviews') {
    try {
      if (req.method === 'GET') {
        const result = await handleAdminListReviews(req);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'PATCH' && id) {
        const result = await handleAdminModerateReview(req, id);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'DELETE' && id) {
        const result = await handleAdminDeleteReview(req, id);
        return res.status(result.status).json(result.body);
      }

      res.setHeader('Allow', 'GET, PATCH, DELETE');
      return res.status(405).json({
        success: false,
        error: 'Method not allowed or missing review ID.',
      });
    } catch (err) {
      console.error('Admin reviews error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to process review admin request.',
      });
    }
  }

  if (route === 'faqs') {
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
      return res.status(405).json({
        success: false,
        error: 'Method not allowed or missing FAQ ID.',
      });
    } catch (err) {
      console.error('Admin FAQs error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to process FAQ admin request.',
      });
    }
  }

  return res.status(404).json({ success: false, error: 'Not found' });
}

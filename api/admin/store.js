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
import {
  handleUploadAsset,
  handleAdminSaveSlides,
  handleAdminCreateSlide,
  handleAdminDeleteSlide,
  handleAdminCreateProduct,
  handleAdminUpdateProduct,
  handleAdminDeleteProduct,
  handleAdminCreateCollection,
  handleAdminUpdateCollection,
  handleAdminDeleteCollection,
  handleAdminCreateBundle,
  handleAdminUpdateBundle,
  handleAdminDeleteBundle,
  handleAdminGetStats,
} from '../../lib/catalog-service.js';

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

function extractId(queryId, pathname, prefix) {
  if (queryId) return queryId;
  if (pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length).split('/')[0] || '';
    return decodeSegment(rest);
  }
  return '';
}

function resolveAdminStoreRoute(req) {
  const explicit = firstQueryValue(req.query?.route).toLowerCase();
  const { pathname, searchParams } = getUrlParts(req);
  const queryId = firstQueryValue(req.query?.id) || String(searchParams.get('id') || '').trim();

  if (explicit === 'upload' || pathname === '/api/upload') {
    return { route: 'upload', id: '' };
  }
  if (explicit === 'stats' || pathname === '/api/admin/stats') {
    return { route: 'stats', id: '' };
  }
  if (explicit === 'settings' || pathname === '/api/admin/settings') {
    return { route: 'settings', id: '' };
  }
  if (explicit === 'slides' || pathname === '/api/admin/slides' || pathname.startsWith('/api/admin/slides/')) {
    return { route: 'slides', id: extractId(queryId, pathname, '/api/admin/slides/') };
  }
  if (explicit === 'products' || pathname === '/api/admin/products' || pathname.startsWith('/api/admin/products/')) {
    return { route: 'products', id: extractId(queryId, pathname, '/api/admin/products/') };
  }
  if (
    explicit === 'collections' ||
    pathname === '/api/admin/collections' ||
    pathname.startsWith('/api/admin/collections/')
  ) {
    return { route: 'collections', id: extractId(queryId, pathname, '/api/admin/collections/') };
  }
  if (explicit === 'bundles' || pathname === '/api/admin/bundles' || pathname.startsWith('/api/admin/bundles/')) {
    return { route: 'bundles', id: extractId(queryId, pathname, '/api/admin/bundles/') };
  }
  if (explicit === 'reviews' || pathname === '/api/admin/reviews' || pathname.startsWith('/api/admin/reviews/')) {
    return { route: 'reviews', id: extractId(queryId, pathname, '/api/admin/reviews/') };
  }
  if (explicit === 'faqs' || pathname === '/api/admin/faqs' || pathname.startsWith('/api/admin/faqs/')) {
    return { route: 'faqs', id: extractId(queryId, pathname, '/api/admin/faqs/') };
  }

  return { route: explicit, id: queryId };
}

export default async function handler(req, res) {
  const { route, id } = resolveAdminStoreRoute(req);

  if (route === 'upload') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    try {
      const result = await handleUploadAsset(req);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Upload failed.' });
    }
  }

  if (route === 'stats') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    try {
      const result = await handleAdminGetStats(req);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Admin stats error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Unable to load stats.' });
    }
  }

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

  if (route === 'slides') {
    try {
      if (req.method === 'PUT') {
        const result = await handleAdminSaveSlides(req);
        return res.status(result.status).json(result.body);
      }
      if (req.method === 'POST') {
        const result = await handleAdminCreateSlide(req);
        return res.status(result.status).json(result.body);
      }
      if (req.method === 'DELETE' && id) {
        const result = await handleAdminDeleteSlide(req, id);
        return res.status(result.status).json(result.body);
      }
      res.setHeader('Allow', 'PUT, POST, DELETE');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err) {
      console.error('Admin slides error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Unable to save slides.' });
    }
  }

  if (route === 'products') {
    try {
      if (req.method === 'POST') {
        const result = await handleAdminCreateProduct(req);
        return res.status(result.status).json(result.body);
      }
      if ((req.method === 'PUT' || req.method === 'PATCH') && id) {
        const result = await handleAdminUpdateProduct(req, id);
        return res.status(result.status).json(result.body);
      }
      if (req.method === 'DELETE' && id) {
        const result = await handleAdminDeleteProduct(req, id);
        return res.status(result.status).json(result.body);
      }
      res.setHeader('Allow', 'POST, PUT, PATCH, DELETE');
      return res.status(405).json({ success: false, error: 'Method not allowed or missing product ID.' });
    } catch (err) {
      console.error('Admin products error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Unable to save product.' });
    }
  }

  if (route === 'collections') {
    try {
      if (req.method === 'POST') {
        const result = await handleAdminCreateCollection(req);
        return res.status(result.status).json(result.body);
      }
      if ((req.method === 'PUT' || req.method === 'PATCH') && id) {
        const result = await handleAdminUpdateCollection(req, id);
        return res.status(result.status).json(result.body);
      }
      if (req.method === 'DELETE' && id) {
        const result = await handleAdminDeleteCollection(req, id);
        return res.status(result.status).json(result.body);
      }
      res.setHeader('Allow', 'POST, PUT, PATCH, DELETE');
      return res.status(405).json({ success: false, error: 'Method not allowed or missing collection ID.' });
    } catch (err) {
      console.error('Admin collections error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Unable to save collection.' });
    }
  }

  if (route === 'bundles') {
    try {
      if (req.method === 'POST') {
        const result = await handleAdminCreateBundle(req);
        return res.status(result.status).json(result.body);
      }
      if ((req.method === 'PUT' || req.method === 'PATCH') && id) {
        const result = await handleAdminUpdateBundle(req, id);
        return res.status(result.status).json(result.body);
      }
      if (req.method === 'DELETE' && id) {
        const result = await handleAdminDeleteBundle(req, id);
        return res.status(result.status).json(result.body);
      }
      res.setHeader('Allow', 'POST, PUT, PATCH, DELETE');
      return res.status(405).json({ success: false, error: 'Method not allowed or missing bundle ID.' });
    } catch (err) {
      console.error('Admin bundles error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Unable to save bundle.' });
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

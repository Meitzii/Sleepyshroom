import {
  handleGetPublicContentAndCatalog,
  handleGetAdminContentAndCatalog,
  handleGetSlides,
  handleGetProducts,
  handleGetProductByIdOrSlug,
  handleGetCollections,
  handleGetCollectionBySlugOrId,
  handleGetBundles,
  handleGetBundleByIdOrSlug,
  handleFreeDownload,
} from '../lib/catalog-service.js';

function firstQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return value ? String(value).trim() : '';
}

function getUrlParts(req) {
  try {
    const u = new URL(req.url || '/api/content', 'http://localhost');
    return { pathname: u.pathname.replace(/\/+$/, '') || '/api/content' };
  } catch {
    return {
      pathname: String(req.url || '/api/content').split('?')[0].replace(/\/+$/, '') || '/api/content',
    };
  }
}

function decodeSeg(val) {
  try {
    return decodeURIComponent(String(val || '')).trim();
  } catch {
    return String(val || '').trim();
  }
}

function resolvePublicRoute(req) {
  const explicit = firstQueryValue(req.query?.route).toLowerCase();
  const { pathname } = getUrlParts(req);

  if (explicit === 'admin-content' || pathname === '/api/admin/content') {
    return { route: 'admin-content', param: '' };
  }
  if (explicit === 'slides' || pathname === '/api/slides') {
    return { route: 'slides', param: '' };
  }
  if (
    explicit === 'free-download' ||
    pathname.startsWith('/api/free-download/')
  ) {
    let param = firstQueryValue(req.query?.productId);
    if (!param && pathname.startsWith('/api/free-download/')) {
      param = decodeSeg(pathname.slice('/api/free-download/'.length).split('/')[0] || '');
    }
    return { route: 'free-download', param };
  }
  if (
    explicit === 'products' ||
    pathname === '/api/products' ||
    pathname.startsWith('/api/products/')
  ) {
    let param = firstQueryValue(req.query?.idOrSlug);
    if (!param && pathname.startsWith('/api/products/')) {
      param = decodeSeg(pathname.slice('/api/products/'.length).split('/')[0] || '');
    }
    return { route: 'products', param };
  }
  if (
    explicit === 'collections' ||
    pathname === '/api/collections' ||
    pathname.startsWith('/api/collections/')
  ) {
    let param = firstQueryValue(req.query?.slugOrId);
    if (!param && pathname.startsWith('/api/collections/')) {
      param = decodeSeg(pathname.slice('/api/collections/'.length).split('/')[0] || '');
    }
    return { route: 'collections', param };
  }
  if (
    explicit === 'bundles' ||
    pathname === '/api/bundles' ||
    pathname.startsWith('/api/bundles/')
  ) {
    let param = firstQueryValue(req.query?.slugOrId);
    if (!param && pathname.startsWith('/api/bundles/')) {
      param = decodeSeg(pathname.slice('/api/bundles/'.length).split('/')[0] || '');
    }
    return { route: 'bundles', param };
  }
  return { route: 'content', param: '' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const { route, param } = resolvePublicRoute(req);

    if (route === 'admin-content') {
      const result = await handleGetAdminContentAndCatalog(req);
      return res.status(result.status).json(result.body);
    }

    if (route === 'slides') {
      const result = await handleGetSlides();
      return res.status(result.status).json(result.body);
    }

    if (route === 'products') {
      const result = param
        ? await handleGetProductByIdOrSlug(param)
        : await handleGetProducts(req);
      return res.status(result.status).json(result.body);
    }

    if (route === 'collections') {
      const result = param
        ? await handleGetCollectionBySlugOrId(req, param)
        : await handleGetCollections(req);
      return res.status(result.status).json(result.body);
    }

    if (route === 'bundles') {
      const result = param
        ? await handleGetBundleByIdOrSlug(param)
        : await handleGetBundles();
      return res.status(result.status).json(result.body);
    }

    if (route === 'free-download') {
      const result = await handleFreeDownload(req, param);
      if (result.kind === 'binary') {
        res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${String(result.filename || 'wallpaper.jpg').replace(/"/g, '')}"`
        );
        return res.status(result.status).send(result.buffer);
      }
      return res.status(result.status).json(result.body);
    }

    const result = await handleGetPublicContentAndCatalog();
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Content endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Unable to load storefront content.',
    });
  }
}

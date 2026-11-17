import {
  handleGetPaymentConfig,
  handleCheckoutSubmission,
  handleDiscountValidation,
  handleListOrders,
  handleGetOrderByToken,
  handleOrderAction,
} from '../lib/checkout-service.js';

function firstQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return value ? String(value).trim() : '';
}

function getPathname(req) {
  try {
    return new URL(req.url || '/api/checkout', 'http://localhost').pathname.replace(/\/+$/, '') || '/api/checkout';
  } catch {
    return String(req.url || '/api/checkout').split('?')[0].replace(/\/+$/, '') || '/api/checkout';
  }
}

function resolveCommerceRoute(req) {
  const explicit = firstQueryValue(req.query?.route).toLowerCase();
  const pathname = getPathname(req);

  if (explicit === 'discounts-validate' || pathname === '/api/discounts/validate') {
    return { route: 'discounts-validate', idOrToken: '' };
  }

  if (explicit === 'orders' || pathname === '/api/orders' || pathname.startsWith('/api/orders/')) {
    let idOrToken = firstQueryValue(req.query?.idOrToken);
    if (!idOrToken && pathname.startsWith('/api/orders/')) {
      const rest = pathname.slice('/api/orders/'.length).split('/')[0] || '';
      try {
        idOrToken = decodeURIComponent(rest);
      } catch {
        idOrToken = rest;
      }
    }
    return { route: 'orders', idOrToken: idOrToken.trim() };
  }

  if (!explicit || explicit === 'checkout') {
    if (pathname === '/api/checkout') {
      return { route: 'checkout', idOrToken: '' };
    }
    return { route: 'checkout', idOrToken: '' };
  }

  return { route: explicit, idOrToken: '' };
}

export default async function handler(req, res) {
  const { route, idOrToken } = resolveCommerceRoute(req);

  if (route === 'discounts-validate') {
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

  if (route === 'orders') {
    if (idOrToken) {
      if (req.method === 'POST') {
        try {
          const result = await handleOrderAction(req, idOrToken);
          return res.status(result.status).json(result.body);
        } catch (err) {
          console.error('Order action error:', err);
          return res.status(500).json({
            success: false,
            error: err?.message || 'Unable to process order action.',
          });
        }
      }

      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method not allowed' });
      }

      try {
        const result = await handleGetOrderByToken(req, idOrToken);
        return res.status(result.status).json(result.body);
      } catch (err) {
        console.error('Order lookup error:', err);
        return res.status(500).json({ error: 'Unable to retrieve order.' });
      }
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const result = await handleListOrders(req);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Orders list error:', err);
      return res.status(500).json({ error: 'Unable to load orders.' });
    }
  }

  if (route === 'checkout') {
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

  return res.status(404).json({ success: false, error: 'Not found' });
}

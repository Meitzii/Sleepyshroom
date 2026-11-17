import {
  readJsonBody,
  handleAdminListMessages,
  handleAdminUpdateMessageStatus,
  handleAdminDeleteMessage,
  handleAdminReplyMessage,
} from '../../lib/contact-service.js';
import {
  handleAdminListSubscribers,
  handleAdminUpdateSubscriber,
  handleAdminDeleteSubscriber,
} from '../../lib/newsletter-service.js';
import {
  handleAdminListEmailLogs,
  handleAdminResendOrderConfirmation,
} from '../../lib/checkout-service.js';

function firstQueryValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return value ? String(value).trim() : '';
}

function getUrlParts(req) {
  try {
    const urlObj = new URL(req.url || '/api/admin/communications', 'http://localhost');
    return {
      pathname: urlObj.pathname.replace(/\/+$/, '') || '/api/admin/communications',
      searchParams: urlObj.searchParams,
    };
  } catch {
    return {
      pathname: String(req.url || '/api/admin/communications').split('?')[0].replace(/\/+$/, ''),
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

function resolveAdminCommRoute(req) {
  const explicit = firstQueryValue(req.query?.route).toLowerCase();
  const { pathname, searchParams } = getUrlParts(req);
  const queryId = firstQueryValue(req.query?.id) || String(searchParams.get('id') || '').trim();
  const queryIdOrToken = firstQueryValue(req.query?.idOrToken) || queryId;

  if (
    explicit === 'messages-reply' ||
    /^\/api\/admin\/messages\/[^/]+\/reply$/i.test(pathname)
  ) {
    let id = queryId;
    if (!id) {
      const match = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/reply$/i);
      if (match) id = decodeSegment(match[1]);
    }
    return { route: 'messages-reply', id };
  }

  if (
    explicit === 'orders-resend-email' ||
    /^\/api\/admin\/orders\/[^/]+\/resend-email$/i.test(pathname)
  ) {
    let idOrToken = queryIdOrToken;
    if (!idOrToken) {
      const match = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/resend-email$/i);
      if (match) idOrToken = decodeSegment(match[1]);
    }
    return { route: 'orders-resend-email', id: idOrToken };
  }

  if (
    explicit === 'messages' ||
    pathname === '/api/admin/messages' ||
    pathname.startsWith('/api/admin/messages/')
  ) {
    let id = queryId;
    if (!id && pathname.startsWith('/api/admin/messages/')) {
      const rest = pathname.slice('/api/admin/messages/'.length).split('/')[0] || '';
      id = decodeSegment(rest);
    }
    return { route: 'messages', id };
  }

  if (
    explicit === 'newsletter' ||
    pathname === '/api/admin/newsletter' ||
    pathname.startsWith('/api/admin/newsletter/')
  ) {
    let id = queryId;
    if (!id && pathname.startsWith('/api/admin/newsletter/')) {
      const rest = pathname.slice('/api/admin/newsletter/'.length).split('/')[0] || '';
      id = decodeSegment(rest);
    }
    return { route: 'newsletter', id };
  }

  if (explicit === 'email-logs' || pathname === '/api/admin/email-logs') {
    return { route: 'email-logs', id: queryId };
  }

  return { route: explicit, id: queryId };
}

export default async function handler(req, res) {
  const { route, id } = resolveAdminCommRoute(req);

  if (route === 'messages-reply') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
      const result = await handleAdminReplyMessage(req, id);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Admin message reply error:', err);
      return res.status(500).json({
        success: false,
        emailDelivered: false,
        error: 'Unable to send reply email.',
      });
    }
  }

  if (route === 'messages') {
    if (id) {
      try {
        if (req.method === 'PATCH') {
          const result = await handleAdminUpdateMessageStatus(req, id);
          return res.status(result.status).json(result.body);
        }

        if (req.method === 'DELETE') {
          const result = await handleAdminDeleteMessage(req, id);
          return res.status(result.status).json(result.body);
        }

        res.setHeader('Allow', 'PATCH, DELETE');
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      } catch (err) {
        console.error('Admin message update/delete error:', err);
        return res.status(500).json({
          success: false,
          error: 'Unable to update contact message.',
        });
      }
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
      const result = await handleAdminListMessages(req);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Admin messages list error:', err);
      return res.status(500).json({
        success: false,
        error: 'Unable to load contact messages.',
      });
    }
  }

  if (route === 'newsletter') {
    try {
      if (req.method === 'GET') {
        const result = await handleAdminListSubscribers(req);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'PATCH' && id) {
        const result = await handleAdminUpdateSubscriber(req, id);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'DELETE' && id) {
        const result = await handleAdminDeleteSubscriber(req, id);
        return res.status(result.status).json(result.body);
      }

      res.setHeader('Allow', 'GET, PATCH, DELETE');
      return res.status(405).json({
        success: false,
        error: 'Method not allowed or missing subscriber ID.',
      });
    } catch (err) {
      console.error('Admin newsletter endpoint error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to process newsletter admin request.',
      });
    }
  }

  if (route === 'email-logs') {
    try {
      if (req.method === 'GET') {
        const result = await handleAdminListEmailLogs(req);
        return res.status(result.status).json(result.body);
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleAdminResendOrderConfirmation(
          req,
          body.orderId || body.orderNumber || ''
        );
        return res.status(result.status).json(result.body);
      }

      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err) {
      console.error('Admin email logs error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to process email logs request.',
      });
    }
  }

  if (route === 'orders-resend-email') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
      const result = await handleAdminResendOrderConfirmation(req, id);
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('Admin resend order email error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to resend order confirmation email.',
      });
    }
  }

  return res.status(404).json({ success: false, error: 'Not found' });
}

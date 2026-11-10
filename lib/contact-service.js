import crypto from 'node:crypto';
import {
  STORE_CONTACT_EMAIL,
  getEmailProviderConfig,
  sendContactNotificationEmail,
  sendAdminReplyEmail,
} from './email-service.js';

function stripQuotes(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeUrl(raw) {
  if (!raw) return '';
  let clean = stripQuotes(raw).replace(/\/+$/, '');
  if (!clean || clean.includes('your-project-ref') || clean.startsWith('MY_')) return '';
  if (!clean.includes('://') && /^[a-z0-9.-]+\.supabase\.(co|in|net)$/i.test(clean)) {
    clean = `https://${clean}`;
  }
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return clean;
  } catch {
    return '';
  }
  return '';
}

function isSecretKey(raw) {
  const clean = stripQuotes(raw);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) return false;
  if (clean.startsWith('sb_secret_')) return true;
  const parts = clean.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return payload?.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

function normalizeAnonKey(raw) {
  const clean = stripQuotes(raw);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) return '';
  if (isSecretKey(clean)) return '';
  return clean;
}

function normalizeServiceKey(raw) {
  const clean = stripQuotes(raw);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) return '';
  return isSecretKey(clean) ? clean : '';
}

export function resolveSupabaseServerConfig() {
  const urlCandidates = [
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];
  const anonCandidates = [
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  ];
  const serviceCandidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ];

  let supabaseUrl = '';
  for (const val of urlCandidates) {
    const normalized = normalizeUrl(val);
    if (normalized) {
      supabaseUrl = normalized;
      break;
    }
  }

  let anonKey = '';
  for (const val of anonCandidates) {
    const normalized = normalizeAnonKey(val);
    if (normalized) {
      anonKey = normalized;
      break;
    }
  }

  let serviceRoleKey = '';
  for (const val of serviceCandidates) {
    const normalized = normalizeServiceKey(val);
    if (normalized) {
      serviceRoleKey = normalized;
      break;
    }
  }

  return {
    configured: Boolean(supabaseUrl && (anonKey || serviceRoleKey)),
    supabaseUrl,
    anonKey: anonKey || serviceRoleKey,
    serviceRoleKey,
  };
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return await new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function extractBearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof auth !== 'string') return '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function mapDbRowToContactMessage(row) {
  return {
    id: row.id,
    submissionId: row.submission_id,
    userId: row.user_id || null,
    fullName: row.full_name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    consent: Boolean(row.consent),
    status: row.status === 'read' || row.status === 'replied' ? row.status : 'unread',
    emailSent: Boolean(row.email_sent),
    emailSentAt: row.email_sent_at || null,
    emailError: row.email_error || null,
    repliedAt: row.replied_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

async function fetchVerifiedSupabaseUser(cfg, bearerToken) {
  if (!bearerToken) return null;
  const response = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${bearerToken}`,
    },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? user : null;
}

export async function verifyAdminRequest(req) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      status: 503,
      error: 'Supabase configuration is missing on the server.',
    };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Administrator sign-in is required.',
    };
  }

  const user = await fetchVerifiedSupabaseUser(cfg, token);
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid or expired session. Please sign in again.',
    };
  }

  const restHeaders = {
    apikey: cfg.serviceRoleKey || cfg.anonKey,
    Authorization: `Bearer ${cfg.serviceRoleKey || token}`,
    Accept: 'application/json',
  };

  const profileRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,email,role&limit=1`,
    { headers: restHeaders }
  );

  if (!profileRes.ok) {
    return {
      ok: false,
      status: 403,
      error: 'Unable to verify administrator privileges.',
    };
  }

  const profiles = await profileRes.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const verifiedEmail = String(user.email || '').toLowerCase();
  const isAdminRole =
    String(profile?.role || '').toLowerCase() === 'admin' ||
    verifiedEmail === STORE_CONTACT_EMAIL.toLowerCase();

  if (!isAdminRole) {
    return {
      ok: false,
      status: 403,
      error: 'Administrator access denied. This area is restricted to shop administrators.',
    };
  }

  return {
    ok: true,
    cfg,
    token,
    user,
    restAuthToken: cfg.serviceRoleKey || token,
    restApiKey: cfg.serviceRoleKey || cfg.anonKey,
  };
}

export async function handleContactSubmission(req) {
  const body = await readJsonBody(req);

  // Silent honeypot rejection for automated spam bots
  if (typeof body.website_url === 'string' && body.website_url.trim().length > 0) {
    return { status: 400, body: { success: false, error: 'Invalid submission.' } };
  }

  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  const consent = Boolean(body.consent);
  const submissionId = isValidUuid(body.submissionId) ? body.submissionId : crypto.randomUUID();

  if (!fullName || fullName.length > 120) {
    return { status: 400, body: { success: false, error: 'Please enter your full name (max 120 characters).' } };
  }
  if (!isValidEmail(email)) {
    return { status: 400, body: { success: false, error: 'Please enter a valid email address.' } };
  }
  if (!subject || subject.length > 200) {
    return { status: 400, body: { success: false, error: 'Please enter an inquiry subject (max 200 characters).' } };
  }
  if (!message || message.length > 5000) {
    return { status: 400, body: { success: false, error: 'Please enter your message (max 5000 characters).' } };
  }
  if (!consent) {
    return {
      status: 400,
      body: { success: false, error: 'Please agree to the privacy consent checkbox before submitting.' },
    };
  }

  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) {
    return {
      status: 503,
      body: {
        success: false,
        savedToDatabase: false,
        error: 'Supabase is not configured on the server. Unable to save your inquiry.',
      },
    };
  }

  const bearer = extractBearerToken(req);
  let verifiedUserId = null;
  if (bearer) {
    const authUser = await fetchVerifiedSupabaseUser(cfg, bearer);
    if (!authUser) {
      return {
        status: 401,
        body: {
          success: false,
          savedToDatabase: false,
          error: 'Your login session expired. Please refresh the page or sign out to submit as a guest.',
        },
      };
    }
    verifiedUserId = authUser.id;
  }

  const createdAt = new Date().toISOString();
  const insertPayload = {
    submission_id: submissionId,
    user_id: verifiedUserId,
    full_name: fullName,
    email,
    subject,
    message,
    consent: true,
    status: 'unread',
    email_sent: false,
  };

  const writeAuthToken = cfg.serviceRoleKey || bearer || cfg.anonKey;
  const writeApiKey = cfg.serviceRoleKey || cfg.anonKey;
  const preferHeader = cfg.serviceRoleKey ? 'return=representation' : 'return=minimal';

  const insertRes = await fetch(`${cfg.supabaseUrl}/rest/v1/contact_messages`, {
    method: 'POST',
    headers: {
      apikey: writeApiKey,
      Authorization: `Bearer ${writeAuthToken}`,
      'Content-Type': 'application/json',
      Prefer: preferHeader,
    },
    body: JSON.stringify(insertPayload),
  });

  if (!insertRes.ok) {
    const errPayload = await insertRes.json().catch(() => ({}));
    const errCode = errPayload?.code || '';
    const errMsg = String(errPayload?.message || '');

    if (errCode === 'PGRST205' || insertRes.status === 404) {
      return {
        status: 503,
        body: {
          success: false,
          savedToDatabase: false,
          code: 'CONTACT_TABLE_MISSING',
          error:
            'The Supabase contact_messages table has not been created yet. Please run the SQL migration or email shop.sleepyshroom@gmail.com directly.',
        },
      };
    }

    if (insertRes.status === 409 || errCode === '23505' || errMsg.includes('duplicate_contact_inquiry')) {
      return {
        status: 409,
        body: {
          success: false,
          savedToDatabase: false,
          duplicate: true,
          error: 'This inquiry was already received just a moment ago. No duplicate message was sent.',
        },
      };
    }

    return {
      status: 500,
      body: {
        success: false,
        savedToDatabase: false,
        error: errMsg || 'Failed to save your message to the database.',
      },
    };
  }

  // Only attempt notification email AFTER database insert succeeded cleanly
  const emailResult = await sendContactNotificationEmail({
    fullName,
    email,
    subject,
    message,
    createdAt,
    submissionId,
    userId: verifiedUserId,
  });

  // Update email status on the saved row when server service role key is configured
  if (cfg.serviceRoleKey) {
    await fetch(
      `${cfg.supabaseUrl}/rest/v1/contact_messages?submission_id=eq.${encodeURIComponent(submissionId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          email_sent: Boolean(emailResult.delivered),
          email_sent_at: emailResult.delivered ? new Date().toISOString() : null,
          email_error: emailResult.delivered ? null : emailResult.error || 'Email delivery failed.',
        }),
      }
    ).catch(() => {});
  }

  return {
    status: 201,
    body: {
      success: true,
      savedToDatabase: true,
      submissionId,
      recipientEmail: STORE_CONTACT_EMAIL,
      emailDelivered: Boolean(emailResult.delivered),
      emailProvider: emailResult.provider || null,
      emailMessageId: emailResult.messageId || null,
      emailError: emailResult.delivered ? null : emailResult.error || 'Email delivery could not be confirmed.',
    },
  };
}

export async function handleAdminListMessages(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return { status: auth.status, body: { success: false, error: auth.error } };
  }

  const urlObj = new URL(req.url || '/api/admin/messages', 'http://localhost');
  const statusFilter = urlObj.searchParams.get('status');
  const filterQuery =
    statusFilter && ['unread', 'read', 'replied'].includes(statusFilter)
      ? `&status=eq.${encodeURIComponent(statusFilter)}`
      : '';

  const res = await fetch(
    `${auth.cfg.supabaseUrl}/rest/v1/contact_messages?select=*${filterQuery}&order=created_at.desc`,
    {
      headers: {
        apikey: auth.restApiKey,
        Authorization: `Bearer ${auth.restAuthToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    if (errPayload?.code === 'PGRST205' || res.status === 404) {
      return {
        status: 503,
        body: {
          success: false,
          code: 'CONTACT_TABLE_MISSING',
          error: 'The contact_messages table does not exist in Supabase yet. Run the SQL migration to view inquiries.',
        },
      };
    }
    return {
      status: res.status,
      body: {
        success: false,
        error: errPayload?.message || 'Unable to load contact messages from Supabase.',
      },
    };
  }

  const rows = await res.json().catch(() => []);
  const emailConfig = getEmailProviderConfig();

  return {
    status: 200,
    body: {
      success: true,
      messages: Array.isArray(rows) ? rows.map(mapDbRowToContactMessage) : [],
      emailConfigured: emailConfig.configured,
      emailProvider: emailConfig.provider,
    },
  };
}

export async function handleAdminUpdateMessageStatus(req, id) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return { status: auth.status, body: { success: false, error: auth.error } };
  }

  if (!isValidUuid(id)) {
    return { status: 400, body: { success: false, error: 'Invalid message ID.' } };
  }

  const body = await readJsonBody(req);
  const nextStatus = String(body.status || '').trim();
  if (!['unread', 'read', 'replied'].includes(nextStatus)) {
    return {
      status: 400,
      body: { success: false, error: 'Status must be one of: unread, read, replied.' },
    };
  }

  const patchData = { status: nextStatus };
  if (nextStatus === 'replied') {
    patchData.replied_at = new Date().toISOString();
  }

  const res = await fetch(
    `${auth.cfg.supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: auth.restApiKey,
        Authorization: `Bearer ${auth.restAuthToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patchData),
    }
  );

  const payload = await res.json().catch(() => []);
  if (!res.ok) {
    return {
      status: res.status,
      body: { success: false, error: payload?.message || 'Could not update message status.' },
    };
  }

  const updated = Array.isArray(payload) ? payload[0] : null;
  if (!updated) {
    return { status: 404, body: { success: false, error: 'Contact message not found.' } };
  }

  return {
    status: 200,
    body: { success: true, message: mapDbRowToContactMessage(updated) },
  };
}

export async function handleAdminDeleteMessage(req, id) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return { status: auth.status, body: { success: false, error: auth.error } };
  }

  if (!isValidUuid(id)) {
    return { status: 400, body: { success: false, error: 'Invalid message ID.' } };
  }

  const res = await fetch(
    `${auth.cfg.supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: auth.restApiKey,
        Authorization: `Bearer ${auth.restAuthToken}`,
        Prefer: 'return=representation',
      },
    }
  );

  const payload = await res.json().catch(() => []);
  if (!res.ok) {
    return {
      status: res.status,
      body: { success: false, error: payload?.message || 'Could not delete contact message.' },
    };
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    return { status: 404, body: { success: false, error: 'Contact message not found.' } };
  }

  return { status: 200, body: { success: true, deletedId: id } };
}

export async function handleAdminReplyMessage(req, id) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return { status: auth.status, body: { success: false, error: auth.error } };
  }

  if (!isValidUuid(id)) {
    return { status: 400, body: { success: false, error: 'Invalid message ID.' } };
  }

  const body = await readJsonBody(req);
  const replySubject = String(body.replySubject || '').trim();
  const replyBody = String(body.replyBody || '').trim();

  if (!replyBody) {
    return { status: 400, body: { success: false, error: 'Please write a reply message before sending.' } };
  }

  // Fetch the message first so we reply only to the verified stored recipient
  const fetchRes = await fetch(
    `${auth.cfg.supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    {
      headers: {
        apikey: auth.restApiKey,
        Authorization: `Bearer ${auth.restAuthToken}`,
        Accept: 'application/json',
      },
    }
  );

  const rows = await fetchRes.json().catch(() => []);
  const target = Array.isArray(rows) ? rows[0] : null;
  if (!fetchRes.ok || !target) {
    return { status: 404, body: { success: false, error: 'Contact message not found.' } };
  }

  const emailResult = await sendAdminReplyEmail({
    toEmail: target.email,
    toName: target.full_name,
    originalSubject: target.subject,
    replySubject: replySubject || `Re: ${target.subject}`,
    replyBody,
  });

  if (!emailResult.delivered) {
    return {
      status: 502,
      body: {
        success: false,
        emailDelivered: false,
        error: emailResult.error || 'Email delivery failed. Reply was not marked as sent.',
      },
    };
  }

  // Only mark as 'replied' AFTER email provider confirmed delivery
  const patchRes = await fetch(
    `${auth.cfg.supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: auth.restApiKey,
        Authorization: `Bearer ${auth.restAuthToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: 'replied',
        replied_at: new Date().toISOString(),
      }),
    }
  );

  const updatedRows = await patchRes.json().catch(() => []);
  const updated = Array.isArray(updatedRows) ? updatedRows[0] : target;

  return {
    status: 200,
    body: {
      success: true,
      emailDelivered: true,
      emailProvider: emailResult.provider,
      emailMessageId: emailResult.messageId,
      message: mapDbRowToContactMessage(updated),
    },
  };
}

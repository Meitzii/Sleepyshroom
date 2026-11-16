import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { readLocalStoreRaw, writeLocalStoreRaw, isServerlessReadOnlyEnv } from './shop-data.js';

export const STORE_CONTACT_EMAIL = 'shop.sleepyshroom@gmail.com';
export const CUSTOMER_SUPPORT_EMAIL = 'sleepyshroom@gmail.com';

function cleanEnv(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveSupabaseEmailLogConfig() {
  const urlCandidates = [
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];
  const serviceCandidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ];

  let supabaseUrl = '';
  for (const val of urlCandidates) {
    const clean = cleanEnv(val).replace(/\/+$/, '');
    if (clean && !clean.includes('your-project-ref') && !clean.startsWith('MY_')) {
      supabaseUrl = clean;
      break;
    }
  }

  let serviceRoleKey = '';
  for (const val of serviceCandidates) {
    const clean = cleanEnv(val);
    if (clean && !clean.includes('your-supabase-') && !clean.startsWith('MY_')) {
      serviceRoleKey = clean;
      break;
    }
  }

  return {
    configured: Boolean(supabaseUrl && serviceRoleKey),
    supabaseUrl,
    serviceRoleKey,
  };
}

export function getEmailProviderConfig() {
  const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
  const resendFrom = cleanEnv(process.env.RESEND_FROM_EMAIL) || cleanEnv(process.env.CONTACT_FROM_EMAIL);

  if (resendApiKey && !resendApiKey.includes('your-') && !resendApiKey.startsWith('MY_')) {
    return {
      configured: true,
      provider: 'resend',
      resendApiKey,
      fromEmail: resendFrom || 'Sleepyshroom Contact <onboarding@resend.dev>',
      usingSandboxSender: !resendFrom,
    };
  }

  const gmailPass = cleanEnv(process.env.GMAIL_APP_PASSWORD);
  const gmailUser = cleanEnv(process.env.GMAIL_USER) || STORE_CONTACT_EMAIL;

  const smtpHost = cleanEnv(process.env.SMTP_HOST) || (gmailPass ? 'smtp.gmail.com' : '');
  const smtpPortRaw = cleanEnv(process.env.SMTP_PORT) || (smtpHost === 'smtp.gmail.com' ? '465' : '587');
  const smtpPort = Number(smtpPortRaw) || 465;
  const smtpSecureRaw = cleanEnv(process.env.SMTP_SECURE);
  const smtpSecure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;
  const smtpUser = cleanEnv(process.env.SMTP_USER) || (gmailPass ? gmailUser : '');
  const smtpPass = cleanEnv(process.env.SMTP_PASS) || gmailPass;
  const smtpFrom =
    cleanEnv(process.env.SMTP_FROM_EMAIL) ||
    cleanEnv(process.env.CONTACT_FROM_EMAIL) ||
    (smtpUser ? `Sleepyshroom <${smtpUser}>` : '');

  if (smtpHost && smtpUser && smtpPass) {
    return {
      configured: true,
      provider: 'smtp',
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromEmail: smtpFrom || smtpUser,
    };
  }

  return {
    configured: false,
    provider: null,
    fromEmail: '',
  };
}

export async function recordEmailLog(entry) {
  const logEntry = {
    id: crypto.randomUUID(),
    emailType: String(entry.emailType || 'transactional'),
    recipientEmail: String(entry.recipientEmail || ''),
    orderId: entry.orderId || null,
    orderNumber: entry.orderNumber || null,
    subject: String(entry.subject || ''),
    provider: String(entry.provider || 'unconfigured'),
    providerMessageId: entry.providerMessageId || null,
    status: entry.status === 'sent' || entry.status === 'skipped' ? entry.status : 'failed',
    errorMessage: entry.errorMessage ? String(entry.errorMessage).slice(0, 1000) : null,
    attemptedAt: entry.attemptedAt || new Date().toISOString(),
    deliveredAt: entry.status === 'sent' ? (entry.deliveredAt || new Date().toISOString()) : null,
  };

  if (!isServerlessReadOnlyEnv()) {
    try {
      const store = readLocalStoreRaw();
      if (store && typeof store === 'object') {
        if (!Array.isArray(store.emailLogs)) store.emailLogs = [];
        store.emailLogs.unshift(logEntry);
        if (store.emailLogs.length > 500) {
          store.emailLogs = store.emailLogs.slice(0, 500);
        }
        writeLocalStoreRaw(store);
      }
    } catch {
      // Ignore local file write failures
    }
  }

  const supa = resolveSupabaseEmailLogConfig();
  if (supa.configured) {
    try {
      await fetch(`${supa.supabaseUrl}/rest/v1/email_logs`, {
        method: 'POST',
        headers: {
          apikey: supa.serviceRoleKey,
          Authorization: `Bearer ${supa.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: logEntry.id,
          email_type: logEntry.emailType,
          recipient_email: logEntry.recipientEmail,
          order_id: logEntry.orderId,
          order_number: logEntry.orderNumber,
          subject: logEntry.subject,
          provider: logEntry.provider,
          provider_message_id: logEntry.providerMessageId,
          status: logEntry.status,
          error_message: logEntry.errorMessage,
          attempted_at: logEntry.attemptedAt,
          delivered_at: logEntry.deliveredAt,
        }),
      });
    } catch {
      // Table may not exist yet before migration is run
    }
  }

  return logEntry;
}

export async function listEmailLogs({ limit = 100 } = {}) {
  const supa = resolveSupabaseEmailLogConfig();
  if (supa.configured) {
    try {
      const res = await fetch(
        `${supa.supabaseUrl}/rest/v1/email_logs?select=*&order=attempted_at.desc&limit=${Number(limit) || 100}`,
        {
          headers: {
            apikey: supa.serviceRoleKey,
            Authorization: `Bearer ${supa.serviceRoleKey}`,
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            id: r.id,
            emailType: r.email_type,
            recipientEmail: r.recipient_email,
            orderId: r.order_id,
            orderNumber: r.order_number,
            subject: r.subject,
            provider: r.provider,
            providerMessageId: r.provider_message_id,
            status: r.status,
            errorMessage: r.error_message,
            attemptedAt: r.attempted_at,
            deliveredAt: r.delivered_at,
          }));
        }
      }
    } catch {
      // Fall back to local logs
    }
  }

  const store = readLocalStoreRaw();
  const localLogs = Array.isArray(store?.emailLogs) ? store.emailLogs : [];
  return localLogs.slice(0, limit);
}

export async function hasOrderConfirmationBeenSent(order) {
  if (!order) return false;
  if (order.confirmationEmailSentAt) return true;

  const store = readLocalStoreRaw();
  const localLogs = Array.isArray(store?.emailLogs) ? store.emailLogs : [];
  if (
    localLogs.some(
      (log) =>
        log.emailType === 'order_confirmation_customer' &&
        log.status === 'sent' &&
        ((order.id && log.orderId === order.id) ||
          (order.orderNumber && log.orderNumber === order.orderNumber))
    )
  ) {
    return true;
  }

  const supa = resolveSupabaseEmailLogConfig();
  if (supa.configured && order.id) {
    try {
      const res = await fetch(
        `${supa.supabaseUrl}/rest/v1/email_logs?order_id=eq.${encodeURIComponent(order.id)}&email_type=eq.order_confirmation_customer&status=eq.sent&select=id&limit=1`,
        {
          headers: {
            apikey: supa.serviceRoleKey,
            Authorization: `Bearer ${supa.serviceRoleKey}`,
            Accept: 'application/json',
          },
        }
      );
      if (res.ok) {
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows) && rows.length > 0) return true;
      }
    } catch {
      // Ignore if table not created yet
    }
  }

  return false;
}

export async function sendEmailViaProvider({ to, subject, text, html, replyTo }) {
  const cfg = getEmailProviderConfig();

  if (!cfg.configured) {
    return {
      delivered: false,
      provider: null,
      error:
        'Server email provider is not configured (set RESEND_API_KEY or GMAIL_APP_PASSWORD / SMTP credentials).',
    };
  }

  if (cfg.provider === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: cfg.fromEmail,
          to: Array.isArray(to) ? to : [to],
          reply_to: replyTo || undefined,
          subject,
          text,
          html,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.id) {
        const rawErr =
          payload?.message || payload?.error?.message || `Resend returned HTTP ${response.status}.`;
        const sandboxHint =
          cfg.usingSandboxSender &&
          (response.status === 403 || /domain|verify|testing emails|recipient/i.test(rawErr))
            ? ' Set RESEND_FROM_EMAIL to a verified domain sender in Resend to deliver to external recipients.'
            : '';
        return {
          delivered: false,
          provider: 'resend',
          error: `${rawErr}${sandboxHint}`,
        };
      }

      return {
        delivered: true,
        provider: 'resend',
        messageId: String(payload.id),
      };
    } catch (err) {
      return {
        delivered: false,
        provider: 'resend',
        error: err?.message || 'Network error calling Resend email API.',
      };
    }
  }

  // Nodemailer SMTP transport
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      auth: {
        user: cfg.smtpUser,
        pass: cfg.smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: cfg.fromEmail,
      to,
      replyTo: replyTo || undefined,
      subject,
      text,
      html,
    });

    const accepted = Array.isArray(info?.accepted) ? info.accepted.length > 0 : false;
    if (!accepted || !info?.messageId) {
      return {
        delivered: false,
        provider: 'smtp',
        error: 'SMTP server did not accept the message.',
      };
    }

    return {
      delivered: true,
      provider: 'smtp',
      messageId: String(info.messageId),
    };
  } catch (err) {
    return {
      delivered: false,
      provider: 'smtp',
      error: err?.message || 'SMTP delivery failed.',
    };
  }
}

export async function sendContactNotificationEmail({
  fullName,
  email,
  subject,
  message,
  createdAt,
  submissionId,
  userId,
}) {
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const submittedLabel = new Date(createdAt || Date.now()).toUTCString();
  const accountType = userId ? `Signed-in customer (${userId})` : 'Guest visitor';

  const mailSubject = `[Sleepyshroom Contact] ${subject} — from ${fullName}`;
  const text = [
    'New Contact Inquiry — sleepyshroom',
    '----------------------------------------',
    `From: ${fullName} <${email}>`,
    `Account Type: ${accountType}`,
    `Subject: ${subject}`,
    `Submitted: ${submittedLabel}`,
    `Reference ID: ${submissionId}`,
    '',
    'Message:',
    message,
    '',
    '----------------------------------------',
    'Reply directly to this email to respond to the customer.',
  ].join('\n');

  const html = `
  <div style="background:#FFFCF7;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#292929;">
    <div style="max-width:600px;margin:0 auto;background:#FCF3E2;border:1px solid #EADCC8;border-radius:20px;padding:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#A64B3C;">
        New Customer Inquiry · sleepyshroom
      </p>
      <h2 style="margin:0 0 16px;font-size:20px;color:#292929;">${safeSubject}</h2>
      <div style="background:#FFFCF7;border:1px solid #EADCC8;border-radius:14px;padding:16px;margin-bottom:16px;font-size:13px;line-height:1.6;">
        <p style="margin:0 0 6px;"><strong>Customer Name:</strong> ${safeName}</p>
        <p style="margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:#A64B3C;">${safeEmail}</a></p>
        <p style="margin:0 0 6px;"><strong>Visitor Type:</strong> ${escapeHtml(accountType)}</p>
        <p style="margin:0;"><strong>Submitted:</strong> ${escapeHtml(submittedLabel)}</p>
      </div>
      <div style="background:#FFFFFF;border:1px solid #EADCC8;border-radius:14px;padding:16px;font-size:14px;line-height:1.65;color:#292929;">
        ${safeMessage}
      </div>
      <p style="margin:16px 0 0;font-size:11px;color:#777777;">
        Reference ID: ${escapeHtml(submissionId)} · Reply directly to respond to ${safeName}.
      </p>
    </div>
  </div>`;

  const result = await sendEmailViaProvider({
    to: STORE_CONTACT_EMAIL,
    replyTo: email,
    subject: mailSubject,
    text,
    html,
  });

  await recordEmailLog({
    emailType: 'contact_notification',
    recipientEmail: STORE_CONTACT_EMAIL,
    subject: mailSubject,
    provider: result.provider || 'unconfigured',
    providerMessageId: result.messageId || null,
    status: result.delivered ? 'sent' : 'failed',
    errorMessage: result.error || null,
  });

  return result;
}

export async function sendAdminReplyEmail({
  toEmail,
  toName,
  originalSubject,
  originalMessage,
  originalCreatedAt,
  replySubject,
  replyBody,
}) {
  const safeName = escapeHtml(toName || 'Friend');
  const safeBody = escapeHtml(replyBody).replace(/\n/g, '<br />');
  const subjectLine = replySubject?.trim() || `Re: ${originalSubject}`;
  const quotedDate = originalCreatedAt ? new Date(originalCreatedAt).toUTCString() : null;
  const safeOriginal = originalMessage ? escapeHtml(originalMessage).replace(/\n/g, '<br />') : '';

  const textParts = [
    `Hi ${toName || 'there'},`,
    '',
    replyBody,
    '',
    'With cozy wishes,',
    'sleepyshroom Studio',
    CUSTOMER_SUPPORT_EMAIL,
  ];
  if (originalMessage) {
    textParts.push(
      '',
      '----------------------------------------',
      `Original inquiry${quotedDate ? ` (${quotedDate})` : ''}:`,
      originalSubject ? `Subject: ${originalSubject}` : '',
      originalMessage
    );
  }
  const text = textParts.filter((line, idx) => line !== '' || idx < 6 || idx === 7).join('\n');

  const quotedHtml = safeOriginal
    ? `
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid #EADCC8;font-size:12px;color:#777777;line-height:1.55;">
        <p style="margin:0 0 6px;font-weight:700;color:#292929;">
          Original message${quotedDate ? ` (${escapeHtml(quotedDate)})` : ''}:
        </p>
        <blockquote style="margin:0;padding-left:12px;border-left:2px solid #EADCC8;color:#555555;">
          ${safeOriginal}
        </blockquote>
      </div>`
    : '';

  const html = `
  <div style="background:#FFFCF7;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#292929;">
    <div style="max-width:600px;margin:0 auto;background:#FCF3E2;border:1px solid #EADCC8;border-radius:20px;padding:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#A64B3C;">
        sleepyshroom Support
      </p>
      <p style="margin:0 0 14px;font-size:14px;">Hi ${safeName},</p>
      <div style="background:#FFFCF7;border:1px solid #EADCC8;border-radius:14px;padding:16px;font-size:14px;line-height:1.65;color:#292929;">
        ${safeBody}
      </div>
      ${quotedHtml}
      <p style="margin:16px 0 0;font-size:12px;color:#777777;">
        With cozy wishes,<br />
        <strong style="color:#292929;">sleepyshroom</strong> · ${escapeHtml(CUSTOMER_SUPPORT_EMAIL)}
      </p>
    </div>
  </div>`;

  const result = await sendEmailViaProvider({
    to: toEmail,
    replyTo: CUSTOMER_SUPPORT_EMAIL,
    subject: subjectLine,
    text,
    html,
  });

  await recordEmailLog({
    emailType: 'contact_reply',
    recipientEmail: toEmail,
    subject: subjectLine,
    provider: result.provider || 'unconfigured',
    providerMessageId: result.messageId || null,
    status: result.delivered ? 'sent' : 'failed',
    errorMessage: result.error || null,
  });

  return result;
}

export async function sendOrderConfirmationEmails({ order, receiptOrigin = '', forceResend = false }) {
  if (!order || !order.customerEmail) {
    return { customerDelivered: false, storeDelivered: false, skippedDuplicate: false };
  }

  const paidStatus = String(order.paymentStatus || '').toLowerCase();
  if (paidStatus !== 'paid' && paidStatus !== 'completed') {
    return {
      customerDelivered: false,
      storeDelivered: false,
      skippedUnpaid: true,
      errors: ['Order payment is not verified as paid yet.'],
    };
  }

  if (!forceResend) {
    const alreadySent = await hasOrderConfirmationBeenSent(order);
    if (alreadySent) {
      return {
        customerDelivered: false,
        storeDelivered: false,
        skippedDuplicate: true,
      };
    }
  }

  const cleanOrigin = String(receiptOrigin || '').replace(/\/+$/, '');
  const receiptLink = cleanOrigin
    ? `${cleanOrigin}/#confirmation/${encodeURIComponent(order.downloadToken)}`
    : `#confirmation/${encodeURIComponent(order.downloadToken)}`;
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const orderCurrency = String(order.currency || 'USD').toUpperCase();
  const totalLabel =
    orderCurrency === 'PHP'
      ? `₱${Number(order.total || 0).toFixed(2)} PHP`
      : `$${Number(order.total || 0).toFixed(2)} USD`;
  const purchaseDateLabel = new Date(order.paidAt || order.createdAt || Date.now()).toUTCString();
  const paymentRef =
    order.paypalCaptureId || order.paypalOrderId || order.transactionId || order.paymentReference || 'n/a';
  const paymentStatusLabel = 'PAID (Verified via PayPal)';

  const customerSubject = `Your Sleepyshroom Order Confirmation & Downloads (${order.orderNumber})`;

  const customerText = [
    `Hi ${order.customerName || 'Cozy Friend'},`,
    '',
    `Thank you for your order! Your payment for Sleepyshroom Order ${order.orderNumber} has been verified.`,
    `Order Number: ${order.orderNumber}`,
    `Purchase Date: ${purchaseDateLabel}`,
    `Total Paid: ${totalLabel}`,
    `Payment Status: ${paymentStatusLabel}`,
    `Payment Reference: ${paymentRef}`,
    '',
    'Purchased Digital Products:',
    ...itemsList.map((it) => `- ${it.title} (Qty ${it.quantity || 1})`),
    '',
    `Secure Download Access: ${receiptLink}`,
    '',
    'You can also sign in to your Sleepyshroom Customer Account anytime to re-download your purchases.',
    `Need help with downloads or compatibility? Email us at ${CUSTOMER_SUPPORT_EMAIL} or ${STORE_CONTACT_EMAIL}.`,
    '',
    'With cozy wishes,',
    'sleepyshroom Studio',
  ].join('\n');

  const safeName = escapeHtml(order.customerName || 'Friend');
  const safeOrderNum = escapeHtml(order.orderNumber);
  const safeRef = escapeHtml(paymentRef);
  const itemsHtml = itemsList
    .map(
      (it) =>
        `<li style="margin-bottom:6px;"><strong>${escapeHtml(it.title)}</strong> × ${Number(it.quantity || 1)}${it.isBundle ? ' <span style="color:#A64B3C;font-size:11px;font-weight:700;">(Bundle — all included items unlocked)</span>' : ''}</li>`
    )
    .join('');

  const customerHtml = `
  <div style="background:#FFFCF7;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#292929;">
    <div style="max-width:600px;margin:0 auto;background:#FCF3E2;border:1px solid #EADCC8;border-radius:20px;padding:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#A64B3C;">
        Payment Verified · sleepyshroom
      </p>
      <h2 style="margin:0 0 12px;font-size:20px;color:#292929;">Order ${safeOrderNum} Confirmed</h2>
      <p style="margin:0 0 16px;font-size:14px;">Hi ${safeName}, thank you for your order! Your high-resolution digital wallpapers are unlocked and ready to download.</p>
      <div style="background:#FFFCF7;border:1px solid #EADCC8;border-radius:14px;padding:16px;margin-bottom:16px;font-size:13px;line-height:1.6;">
        <p style="margin:0 0 6px;"><strong>Customer:</strong> ${safeName}</p>
        <p style="margin:0 0 6px;"><strong>Order Number:</strong> ${safeOrderNum}</p>
        <p style="margin:0 0 6px;"><strong>Purchase Date:</strong> ${escapeHtml(purchaseDateLabel)}</p>
        <p style="margin:0 0 6px;"><strong>Total Paid:</strong> ${escapeHtml(totalLabel)}</p>
        <p style="margin:0 0 6px;"><strong>Payment Status:</strong> ${escapeHtml(paymentStatusLabel)}</p>
        <p style="margin:0 0 6px;"><strong>Method:</strong> ${escapeHtml(order.paymentMethod || 'PayPal')}</p>
        <p style="margin:0;"><strong>Reference:</strong> ${safeRef}</p>
      </div>
      <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;">${itemsHtml}</ul>
      <a href="${escapeHtml(receiptLink)}" style="display:inline-block;background:#A64B3C;color:#FFFCF7;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:700;">
        Open Secure Download Page
      </a>
      <p style="margin:18px 0 0;font-size:12px;color:#777777;line-height:1.5;">
        Questions or download trouble? Email <a href="mailto:${escapeHtml(CUSTOMER_SUPPORT_EMAIL)}" style="color:#A64B3C;font-weight:700;">${escapeHtml(CUSTOMER_SUPPORT_EMAIL)}</a> or view your Order History in your Sleepyshroom account.
      </p>
    </div>
  </div>`;

  const storeSubject = `[Sleepyshroom Paid Order] ${order.orderNumber} — ${totalLabel}`;
  const storeText = [
    `Paid Order Received: ${order.orderNumber}`,
    `Purchase Date: ${purchaseDateLabel}`,
    `Customer: ${order.customerName} <${order.customerEmail}>`,
    `Total: ${totalLabel}`,
    `Method: ${order.paymentMethod || 'PayPal'}`,
    `PayPal Order ID: ${order.paypalOrderId || 'n/a'}`,
    `PayPal Capture ID: ${order.paypalCaptureId || 'n/a'}`,
    `Items: ${itemsList.map((i) => i.title).join(', ')}`,
  ].join('\n');

  const [customerRes, storeRes] = await Promise.all([
    sendEmailViaProvider({
      to: order.customerEmail,
      replyTo: CUSTOMER_SUPPORT_EMAIL,
      subject: customerSubject,
      text: customerText,
      html: customerHtml,
    }),
    sendEmailViaProvider({
      to: STORE_CONTACT_EMAIL,
      replyTo: order.customerEmail,
      subject: storeSubject,
      text: storeText,
      html: `<pre style="font-family:monospace;font-size:13px;padding:16px;background:#FFFCF7;border:1px solid #EADCC8;border-radius:12px;">${escapeHtml(storeText)}</pre>`,
    }),
  ]);

  await Promise.all([
    recordEmailLog({
      emailType: 'order_confirmation_customer',
      recipientEmail: order.customerEmail,
      orderId: order.id || null,
      orderNumber: order.orderNumber || null,
      subject: customerSubject,
      provider: customerRes?.provider || 'unconfigured',
      providerMessageId: customerRes?.messageId || null,
      status: customerRes?.delivered ? 'sent' : 'failed',
      errorMessage: customerRes?.error || null,
    }),
    recordEmailLog({
      emailType: 'order_confirmation_store',
      recipientEmail: STORE_CONTACT_EMAIL,
      orderId: order.id || null,
      orderNumber: order.orderNumber || null,
      subject: storeSubject,
      provider: storeRes?.provider || 'unconfigured',
      providerMessageId: storeRes?.messageId || null,
      status: storeRes?.delivered ? 'sent' : 'failed',
      errorMessage: storeRes?.error || null,
    }),
  ]);

  return {
    customerDelivered: Boolean(customerRes?.delivered),
    storeDelivered: Boolean(storeRes?.delivered),
    customerMessageId: customerRes?.messageId || null,
    errors: [customerRes?.error, storeRes?.error].filter(Boolean),
  };
}

import nodemailer from 'nodemailer';

export const STORE_CONTACT_EMAIL = 'shop.sleepyshroom@gmail.com';

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

  return sendEmailViaProvider({
    to: STORE_CONTACT_EMAIL,
    replyTo: email,
    subject: mailSubject,
    text,
    html,
  });
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
    STORE_CONTACT_EMAIL,
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
        <strong style="color:#292929;">sleepyshroom</strong> · ${escapeHtml(STORE_CONTACT_EMAIL)}
      </p>
    </div>
  </div>`;

  return sendEmailViaProvider({
    to: toEmail,
    replyTo: STORE_CONTACT_EMAIL,
    subject: subjectLine,
    text,
    html,
  });
}

export async function sendOrderConfirmationEmails({ order, receiptOrigin = '' }) {
  if (!order || !order.customerEmail) {
    return { customerDelivered: false, storeDelivered: false };
  }

  const cleanOrigin = String(receiptOrigin || '').replace(/\/+$/, '');
  const receiptLink = cleanOrigin
    ? `${cleanOrigin}/#confirmation/${encodeURIComponent(order.downloadToken)}`
    : `#confirmation/${encodeURIComponent(order.downloadToken)}`;
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const totalLabel = `₱${Number(order.total || 0).toFixed(2)} PHP`;

  const customerText = [
    `Hi ${order.customerName || 'Cozy Friend'},`,
    '',
    `Thank you! Your payment for Sleepyshroom Order ${order.orderNumber} has been verified via PayMongo.`,
    `Total Paid: ${totalLabel}`,
    `Payment Reference: ${order.paymongoPaymentId || order.paymongoCheckoutSessionId || order.transactionId}`,
    '',
    'Included Wallpapers:',
    ...itemsList.map((it) => `- ${it.title} (Qty ${it.quantity || 1})`),
    '',
    `Open your download page anytime: ${receiptLink}`,
    '',
    'With cozy wishes,',
    'sleepyshroom',
    STORE_CONTACT_EMAIL,
  ].join('\n');

  const safeName = escapeHtml(order.customerName || 'Friend');
  const safeOrderNum = escapeHtml(order.orderNumber);
  const safeRef = escapeHtml(order.paymongoPaymentId || order.paymongoCheckoutSessionId || order.transactionId || '');
  const itemsHtml = itemsList
    .map(
      (it) =>
        `<li style="margin-bottom:6px;"><strong>${escapeHtml(it.title)}</strong> × ${Number(it.quantity || 1)}</li>`
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
      <div style="background:#FFFCF7;border:1px solid #EADCC8;border-radius:14px;padding:16px;margin-bottom:16px;font-size:13px;">
        <p style="margin:0 0 6px;"><strong>Total Paid:</strong> ${escapeHtml(totalLabel)}</p>
        <p style="margin:0 0 6px;"><strong>Method:</strong> ${escapeHtml(order.paymentMethod || 'PayMongo')}</p>
        <p style="margin:0;"><strong>Reference:</strong> ${safeRef}</p>
      </div>
      <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;">${itemsHtml}</ul>
      <a href="${escapeHtml(receiptLink)}" style="display:inline-block;background:#A64B3C;color:#FFFCF7;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:700;">
        Download Your Wallpapers
      </a>
    </div>
  </div>`;

  const storeText = [
    `Paid Order Received: ${order.orderNumber}`,
    `Customer: ${order.customerName} <${order.customerEmail}>`,
    `Total: ${totalLabel}`,
    `Method: ${order.paymentMethod || 'PayMongo'}`,
    `PayMongo Session: ${order.paymongoCheckoutSessionId || 'n/a'}`,
    `PayMongo Payment: ${order.paymongoPaymentId || 'n/a'}`,
    `Items: ${itemsList.map((i) => i.title).join(', ')}`,
  ].join('\n');

  const [customerRes, storeRes] = await Promise.all([
    sendEmailViaProvider({
      to: order.customerEmail,
      replyTo: STORE_CONTACT_EMAIL,
      subject: `Your Sleepyshroom Wallpapers Are Ready (${order.orderNumber})`,
      text: customerText,
      html: customerHtml,
    }),
    sendEmailViaProvider({
      to: STORE_CONTACT_EMAIL,
      replyTo: order.customerEmail,
      subject: `[Sleepyshroom Paid Order] ${order.orderNumber} — ${totalLabel}`,
      text: storeText,
      html: `<pre style="font-family:monospace;font-size:13px;padding:16px;background:#FFFCF7;border:1px solid #EADCC8;border-radius:12px;">${escapeHtml(storeText)}</pre>`,
    }),
  ]);

  return {
    customerDelivered: Boolean(customerRes?.delivered),
    storeDelivered: Boolean(storeRes?.delivered),
    errors: [customerRes?.error, storeRes?.error].filter(Boolean),
  };
}

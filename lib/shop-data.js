import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

export const DEFAULT_PAYMENT_PROVIDERS = {
  paypalEnabled: true,
  paypalAllowCards: true,
  testMode: false,
  googlePayEnabled: true,
  googlePayMerchantId: '',
  googlePayMerchantName: 'sleepyshroom',
  gcashEnabled: true,
  gcashQrImage: '',
  gcashAccountName: '',
  gcashAccountNumber: '',
  gcashInstructions:
    'Open your GCash app, scan the QR code or send the exact PHP amount, then enter your 13-digit GCash Reference No. below.',
  mayaEnabled: true,
  mayaQrImage: '',
  mayaAccountName: '',
  mayaAccountNumber: '',
  mayaInstructions:
    'Open your Maya app, scan the QR code or transfer the exact PHP amount, then enter your Maya Reference ID below.',
  phpExchangeRate: 56.5,
};

export const DEFAULT_DISCOUNT_CODES = [
  {
    code: 'COZY10',
    type: 'percentage',
    value: 10,
    minSpend: 0,
    active: true,
  },
  {
    code: 'SHROOMFAM',
    type: 'percentage',
    value: 20,
    minSpend: 10,
    active: true,
  },
  {
    code: 'SWEETDREAMS',
    type: 'fixed',
    value: 2.0,
    minSpend: 8.0,
    active: true,
  },
];

export const DEFAULT_PRODUCTS = [
  {
    id: 'prod-free-2',
    title: 'Acorn Lantern Lullaby (Freebie Wallpaper)',
    slug: 'acorn-lantern-lullaby-freebie',
    price: 0,
    isFree: true,
    theme: 'Little Forest',
    collection: 'Free Wallpapers',
    deviceTypes: ['mobile', 'tablet'],
    resolutions: [
      'iPhone 12–16 Pro Max',
      'Samsung Galaxy / Android OLED',
      'iPad / Tablet Portrait (2048 x 2732)',
    ],
    fileFormat: 'Lossless PNG (300 DPI) with Lock Screen depth space',
    fileSize: '12.8 MB',
    whatsIncluded: [
      'Mobile Lock Screen Wallpaper',
      'Mobile Home Screen Wallpaper (Subtle Blur Variant)',
      'Tablet Portrait Wallpaper',
      'Personal Use License',
    ],
    images: ['/src/assets/images/free_mobile_sprout_1794024694152.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_freebie_acorn_lullaby_mobile.jpg',
  },
  {
    id: 'prod-free-1',
    title: 'Little Clover Nap (Freebie Wallpaper)',
    slug: 'little-clover-nap-freebie',
    price: 0,
    isFree: true,
    theme: 'Mushroom Dreams',
    collection: 'Free Wallpapers',
    deviceTypes: ['desktop'],
    resolutions: ['4K UHD (3840 x 2160)', '5K Retina (5120 x 2880)', 'Full HD (1920 x 1080)'],
    fileFormat: 'Lossless PNG (300 DPI)',
    fileSize: '14.2 MB',
    whatsIncluded: [
      'Full 4K Desktop Wallpaper (16:9)',
      'MacBook Retina Edition',
      'Personal Use License',
      'Cozy Setup Guide',
    ],
    images: ['/src/assets/images/free_desktop_nap_1794024679756.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_freebie_clover_nap_desktop.jpg',
  },
  {
    id: 'prod-desktop-1',
    title: 'Sleepy Garden Sanctuary Wallpaper',
    slug: 'sleepy-garden-sanctuary',
    price: 4.5,
    theme: 'Sleepy Garden',
    collection: 'Pastel Garden',
    deviceTypes: ['desktop'],
    resolutions: [
      '4K UHD (3840 x 2160)',
      '5K Retina (5120 x 2880)',
      'Ultrawide (3440 x 1440)',
      'MacBook / Laptop (2560 x 1600)',
    ],
    fileFormat: 'High-res lossless PNG (300 DPI) + 16-bit color profile',
    fileSize: '38.4 MB',
    whatsIncluded: ['4K Desktop Wallpaper (16:9)', '5K Ultra-Retina Wallpaper', 'Setup Guide'],
    images: [
      '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
      '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
    ],
    status: 'published',
    downloadFileName: 'sleepyshroom_sleepy_garden_desktop_bundle.zip',
  },
  {
    id: 'prod-desktop-2',
    title: 'Cozy Autumn Cottage Wallpaper',
    slug: 'cozy-autumn-cottage',
    price: 4.5,
    theme: 'Cozy Autumn',
    collection: 'Autumn Cottage',
    deviceTypes: ['desktop'],
    resolutions: ['4K UHD (3840 x 2160)', '5K Retina (5120 x 2880)', 'Ultrawide (3440 x 1440)'],
    fileFormat: 'Lossless PNG + HEIC',
    fileSize: '42.1 MB',
    whatsIncluded: ['Full Autumn Illustration 4K', 'Mac & Windows instructions'],
    images: [
      '/src/assets/images/theme_cozy_autumn_1794020166366.jpg',
      '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
    ],
    status: 'published',
    downloadFileName: 'sleepyshroom_autumn_cottage_desktop.zip',
  },
  {
    id: 'prod-desktop-3',
    title: 'Mushroom Dreams Slumber Desktop',
    slug: 'mushroom-dreams-slumber-desktop',
    price: 5.0,
    theme: 'Mushroom Dreams',
    collection: 'Dreamy Night',
    deviceTypes: ['desktop'],
    resolutions: ['4K UHD (3840 x 2160)', '5K Retina (5120 x 2880)', 'Ultrawide (3440 x 1440)'],
    fileFormat: 'High-res Lossless PNG files',
    fileSize: '36.8 MB',
    whatsIncluded: ['Main 4K Nighttime Slumber Wallpaper', 'Soft Lavender Day Edition'],
    images: [
      '/src/assets/images/theme_mushroom_dreams_1794020165115.jpg',
      '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
    ],
    status: 'published',
    downloadFileName: 'sleepyshroom_slumber_desktop_pack.zip',
  },
  {
    id: 'prod-desktop-4',
    title: 'Little Shroom Cottage Dusk Desktop',
    slug: 'little-shroom-cottage-dusk',
    price: 4.0,
    theme: 'Little Forest',
    collection: 'Enchanted Woodland',
    deviceTypes: ['desktop'],
    resolutions: ['4K UHD (3840 x 2160)', 'MacBook Retina'],
    fileFormat: 'Lossless PNG',
    fileSize: '29.5 MB',
    whatsIncluded: ['4K Desktop Wallpaper', 'Sunset Twilight Colorway', 'Installation Guide'],
    images: ['/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_cottage_dusk_desktop.zip',
  },
  {
    id: 'prod-mobile-1',
    title: 'Midnight Firefly Forest Mobile & Tablet',
    slug: 'midnight-firefly-forest-mobile',
    price: 3.5,
    theme: 'Little Forest',
    collection: 'Dreamy Night',
    deviceTypes: ['mobile', 'tablet'],
    resolutions: [
      'iPhone 12–16 Pro Max (1290 x 2796)',
      'Android OLED (1440 x 3120)',
      'iPad Pro (2048 x 2732)',
    ],
    fileFormat: 'PNG + HEIC',
    fileSize: '24.2 MB',
    whatsIncluded: ['Lock Screen Wallpaper', 'Home Screen Wallpaper', 'Tablet Versions'],
    images: ['/src/assets/images/theme_mobile_forest_1794020166376.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_firefly_forest_mobile_tablet.zip',
  },
  {
    id: 'prod-mobile-2',
    title: 'Sleepy Mushroom Slumber Phone Wallpaper',
    slug: 'sleepy-mushroom-slumber-phone',
    price: 3.5,
    theme: 'Mushroom Dreams',
    collection: 'Dreamy Night',
    deviceTypes: ['mobile', 'tablet'],
    resolutions: ['iPhone HD & Super Retina', 'Android OLED', 'iPad Pro'],
    fileFormat: 'Lossless PNG + Apple HEIC',
    fileSize: '21.0 MB',
    whatsIncluded: ['Phone Lock Screen', 'Phone Home Screen', 'Tablet Pro edition'],
    images: ['/src/assets/images/theme_mushroom_dreams_1794020165115.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_slumber_phone_tablet.zip',
  },
  {
    id: 'prod-mobile-3',
    title: 'Chamomile Meadow Snail Mobile Wallpaper',
    slug: 'chamomile-meadow-snail-mobile',
    price: 3.0,
    theme: 'Sleepy Garden',
    collection: 'Pastel Garden',
    deviceTypes: ['mobile'],
    resolutions: ['High-Res Phone OLED (1290 x 2796)'],
    fileFormat: 'PNG format',
    fileSize: '18.4 MB',
    whatsIncluded: ['Phone Lock Screen', 'Phone Home Screen', 'Quick Wallpaper Guide'],
    images: ['/src/assets/images/theme_sleepy_garden_1794020165839.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_chamomile_snail_phone.zip',
  },
  {
    id: 'prod-mobile-4',
    title: 'Autumn Acorn Teatime Mobile & Tablet',
    slug: 'autumn-acorn-teatime-mobile',
    price: 3.5,
    theme: 'Cozy Autumn',
    collection: 'Autumn Cottage',
    deviceTypes: ['mobile', 'tablet'],
    resolutions: ['iPhone All Sizes', 'Android All Sizes', 'iPad / Android Tablet'],
    fileFormat: 'PNG & HEIC formats',
    fileSize: '23.8 MB',
    whatsIncluded: ['Phone Lock Screen', 'Phone Home Screen', 'Tablet Edition'],
    images: ['/src/assets/images/theme_cozy_autumn_1794020166366.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_autumn_mobile_tablet.zip',
  },
];

export const DEFAULT_INITIAL_ORDERS = [];

export const FAQ_CATEGORIES = [
  'Orders and Payments',
  'Downloads and Access',
  'Wallpaper Compatibility',
  'Licensing and Usage',
  'Refunds and Cancellations',
  'Account and Technical Support',
];

export const DEFAULT_FAQS = [
  {
    id: 'faq-1',
    category: 'Orders and Payments',
    question: 'How do I purchase a wallpaper?',
    answer:
      'Browse our collections or wallpaper catalog, click "Add to Cart" (or "Buy Now") on your favorite designs or theme bundles, and proceed to checkout. Enter your name and email address for order delivery, then complete payment securely via PayPal or debit/credit card.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-2',
    category: 'Orders and Payments',
    question: 'What payment methods are accepted?',
    answer:
      'We process all paid transactions in USD exclusively through PayPal Checkout, which supports PayPal balance as well as major debit and credit cards (Visa, Mastercard, American Express, and Discover) even without creating a PayPal account.',
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: 'faq-3',
    category: 'Downloads and Access',
    question: 'How do I download my purchase?',
    answer:
      'Immediately after PayPal confirms your payment, your Order Confirmation page unlocks direct download buttons for every wallpaper (and every individual wallpaper included inside a bundle). We also email your confirmation receipt with a private link to your downloads.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-4',
    category: 'Downloads and Access',
    question: 'Can I download my purchased wallpapers again?',
    answer:
      'Yes! Keep your order confirmation email link or sign in to your Sleepyshroom Customer Account using the same email address used at checkout to view your order history and re-download your files anytime.',
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: 'faq-5',
    category: 'Downloads and Access',
    question: 'What happens if my download link expires?',
    answer:
      'Order confirmation download tokens remain tied to your verified paid order. If you ever lose your email receipt or have trouble accessing an older purchase, sign in to your Account page or email shop.sleepyshroom@gmail.com with your order number and we will restore your access.',
    sortOrder: 3,
    isPublished: true,
  },
  {
    id: 'faq-6',
    category: 'Wallpaper Compatibility',
    question: 'What devices are supported?',
    answer:
      'Depending on the listing, our digital sets include crops for Desktop & Laptop monitors (MacBook, iMac, Windows PC, Ultrawide), Smartphones (iPhone & Android), and Tablets (iPad & Android Tablets). Each product page lists exact compatible devices.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-7',
    category: 'Wallpaper Compatibility',
    question: 'What resolution are the wallpapers?',
    answer:
      'Our illustrations are exported in crisp lossless 300 DPI PNG or high-resolution formats: up to 6K/5K/4K (6016×3384 / 5120×2880 / 3840×2160) for desktop, 1290×2796+ for phones, and 2048×2732+ for tablets.',
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: 'faq-8',
    category: 'Licensing and Usage',
    question: 'Can I use wallpapers on multiple devices?',
    answer:
      'Yes! Your Personal Use License allows you to download and display your purchased wallpaper across all of your own personal devices—phone, tablet, laptop, and desktop.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-9',
    category: 'Licensing and Usage',
    question: 'Can I redistribute or resell purchased wallpapers?',
    answer:
      'No. All Sleepyshroom artwork remains our copyrighted intellectual property. You may not resell, redistribute, upload to public wallpaper repositories, print on commercial merchandise, or use our artwork for AI training datasets.',
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: 'faq-10',
    category: 'Refunds and Cancellations',
    question: 'What is your refund policy for digital wallpapers?',
    answer:
      'Because digital files are delivered instantaneously and cannot be returned, completed digital orders are generally non-refundable. However, if you accidentally purchase the exact same item twice or encounter an unresolvable corrupted file, email us within 14 days for a prompt refund.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-11',
    category: 'Account and Technical Support',
    question: 'What should I do if my payment succeeds but I cannot access my download?',
    answer:
      'Wait a few seconds on the Order Confirmation page or click "Refresh & Verify Payment Status" so PayPal sync completes. If it still does not unlock, email shop.sleepyshroom@gmail.com with your PayPal transaction ID or checkout email and we will unlock it manually right away.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'faq-12',
    category: 'Account and Technical Support',
    question: 'How can I contact customer support?',
    answer:
      'You can reach us anytime via the Contact page or by emailing shop.sleepyshroom@gmail.com. We reply to all inquiries within 12–48 hours.',
    sortOrder: 2,
    isPublished: true,
  },
];

export const DEFAULT_PRIVACY_POLICY = {
  title: 'Privacy Policy',
  lastUpdated: 'November 2026',
  ownerReviewRequiredNotice:
    'Owner Review Note: Please confirm your preferred legal entity name (e.g., sole proprietor name/business registration) and Data Protection Officer (DPO) contact details below prior to formal publication.',
  content: `## 1. Overview & Commitment (Philippines Data Privacy Act — RA 10173)
Sleepyshroom ("we", "our", or "us") is an independent digital wallpaper and stationery studio operating from the Philippines. We respect your privacy and process personal data in good faith in accordance with applicable privacy standards, including the Philippine **Data Privacy Act of 2012 (Republic Act No. 10173)** and its Implementing Rules and Regulations.

## 2. Information We Collect
We collect only the personal data strictly necessary to run the storefront and fulfill digital purchases:
- **Account Information:** Name, email address, and profile avatar when you create an account or sign in via Google OAuth.
- **Order & Transaction Information:** Customer name, email address, billing country/city (when supplied), purchased items, order number, and payment status.
- **Newsletter Subscriptions:** Email address, subscription timestamp, and explicit opt-in consent record (only when you actively subscribe via our newsletter form).
- **Reviews & Support Inquiries:** Product ratings, review comments, and contact messages you voluntarily send us.

## 3. Payment Processing (PayPal & Cards)
All payments are processed securely off-site/tokenized via **PayPal**. Sleepyshroom never collects, sees, or stores full credit card numbers, CVV codes, or bank passwords.

## 4. Cookies & Local Storage
We use essential browser storage (\`localStorage\` / \`sessionStorage\`) solely to keep your shopping bag intact, preserve your sign-in session, and track temporary checkout verification state. We do not sell personal data or deploy intrusive third-party ad trackers.

## 5. Supabase & Third-Party Service Providers
To operate reliably, we rely on trusted processors:
- **Supabase:** Encrypted PostgreSQL database, Row Level Security (RLS), authentication, and digital asset storage.
- **PayPal:** Verified payment checkout, capture, webhook verification, and refund processing.
- **Transactional Email Provider (Resend / SMTP):** Delivers automated order confirmation emails, download links, and customer support replies.

## 6. Data Retention & Security
We use HTTPS encryption in transit, server-side authorization checks, signed/verified download tokens, and Supabase Row Level Security policies. Order records are retained so customers can re-access purchased downloads; newsletter records are kept until you unsubscribe or request deletion.

## 7. Your Rights Under RA 10173 & Privacy Requests
You have the right to be informed, access your personal data, request correction of inaccurate records, withdraw newsletter consent (unsubscribe anytime), or request deletion/erasure of account data (subject to lawful transaction record obligations).

## 8. Contact & Policy Updates
For privacy, access, or deletion requests (Owner confirmation recommended for formal DPO designation), contact **shop.sleepyshroom@gmail.com**. We may update this policy from time to time and post the updated effective date here.`,
};

export const DEFAULT_TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  lastUpdated: 'November 2026',
  ownerReviewRequiredNotice:
    'Owner Review Note: Confirm your governing business jurisdiction/proprietor details and any country-specific tax invoicing notes before finalizing.',
  content: `## 1. General Website Terms
Welcome to **Sleepyshroom** (https://sleepyshroom.vercel.app). By accessing our storefront, creating an account, or purchasing digital products, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the site.

## 2. Account Responsibilities
You are responsible for maintaining the confidentiality of your account credentials and for ensuring that the email address provided at checkout is accurate so download receipts can be delivered.

## 3. Product Descriptions & Pricing
We strive to display accurate previews, device compatibility notes, and resolutions for every wallpaper, icon pack, and bundle. Prices are listed in United States Dollars (USD) unless otherwise noted and may change without prior notice prior to order placement.

## 4. Digital Product Purchases & Payment Terms
All items sold on Sleepyshroom are **digital downloads** (no physical items are shipped). Full payment is verified server-side through PayPal Checkout (PayPal balance or eligible debit/credit card) before paid downloads are unlocked.

## 5. Download Access
Verified orders immediately unlock secure digital download links on the confirmation screen, in your customer account order history, and via your confirmation email. Bundle purchases unlock access to every included product in that bundle.

## 6. Personal-Use Licensing & Copyright
All illustrations, icon sets, and designs are the exclusive intellectual property of **Sleepyshroom**. Your purchase grants a non-exclusive, non-transferable **Personal Use License** to display the artwork on your personal phones, tablets, laptops, and desktop monitors.

## 7. Strictly Prohibited Uses
You may **not**:
- Resell, share publicly, sublicense, or redistribute the files or bundles (even modified or free of charge).
- Print our artwork onto physical merchandise for sale or commercial distribution.
- Scrape, feed, or ingest our artwork into AI/ML training datasets or NFTs.

## 8. Refunds & Cancellations
Because digital downloads are delivered immediately, completed digital sales are final, except for accidental duplicate purchases reported within 14 days or verifiable technical file defects that we cannot resolve.

## 9. Website Availability & Limitation of Liability
While we aim for uninterrupted uptime, Sleepyshroom is provided "as is" and "as available." To the fullest extent permitted by law, Sleepyshroom shall not be liable for indirect damages, device incompatibility outside listed resolutions, or third-party payment/network outages.

## 10. Changes to Terms & Contact
We reserve the right to update these Terms of Service at any time. Questions regarding these terms may be directed to **shop.sleepyshroom@gmail.com**.`,
};

export function isCollectionCurrentlyActive(collection, referenceDate = new Date()) {
  if (!collection) return false;
  if (collection.status && collection.status !== 'published') return false;
  const nowMs = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
  if (collection.startDate) {
    const startMs = new Date(collection.startDate).getTime();
    if (!Number.isNaN(startMs) && nowMs < startMs) return false;
  }
  if (collection.endDate) {
    const endMs = new Date(collection.endDate).getTime();
    if (!Number.isNaN(endMs) && nowMs > endMs) return false;
  }
  return true;
}

export function getRootDir() {
  return ROOT_DIR;
}

export function isServerlessReadOnlyEnv() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function readLocalStoreRaw() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return null;
}

export function writeLocalStoreRaw(store) {
  if (isServerlessReadOnlyEnv() || !store || typeof store !== 'object') return false;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function loadRuntimeCatalog() {
  const fileStore = readLocalStoreRaw();

  const fileProducts = Array.isArray(fileStore?.products) ? fileStore.products : [];
  const productMap = new Map();
  for (const prod of DEFAULT_PRODUCTS) {
    productMap.set(prod.id, prod);
  }
  for (const prod of fileProducts) {
    if (prod?.id) {
      productMap.set(prod.id, prod);
    }
  }

  const discountCodes =
    Array.isArray(fileStore?.discountCodes) && fileStore.discountCodes.length > 0
      ? fileStore.discountCodes
      : DEFAULT_DISCOUNT_CODES;

  const rawProviders = fileStore?.settings?.paymentProviders || {};
  const paymentProviders = {
    ...DEFAULT_PAYMENT_PROVIDERS,
    ...rawProviders,
    paypalEnabled: rawProviders.paypalEnabled !== false,
    paypalAllowCards: rawProviders.paypalAllowCards !== false,
    testMode: Boolean(rawProviders.testMode),
    googlePayEnabled: rawProviders.googlePayEnabled !== false,
    gcashEnabled: rawProviders.gcashEnabled !== false,
    mayaEnabled: rawProviders.mayaEnabled !== false,
    phpExchangeRate:
      Number.isFinite(Number(rawProviders.phpExchangeRate)) && Number(rawProviders.phpExchangeRate) >= 20
        ? Number(rawProviders.phpExchangeRate)
        : DEFAULT_PAYMENT_PROVIDERS.phpExchangeRate,
  };

  const orders = Array.isArray(fileStore?.orders) ? fileStore.orders : DEFAULT_INITIAL_ORDERS;
  const webhookEvents = Array.isArray(fileStore?.webhookEvents) ? fileStore.webhookEvents : [];
  const collections = Array.isArray(fileStore?.collections) ? fileStore.collections : [];
  const bundles = Array.isArray(fileStore?.bundles) ? fileStore.bundles : [];
  const newsletterSubscribers = Array.isArray(fileStore?.newsletterSubscribers) ? fileStore.newsletterSubscribers : [];
  const emailLogs = Array.isArray(fileStore?.emailLogs) ? fileStore.emailLogs : [];
  const reviews = Array.isArray(fileStore?.reviews) ? fileStore.reviews : [];
  const faqs = Array.isArray(fileStore?.faqs) && fileStore.faqs.length > 0 ? fileStore.faqs : DEFAULT_FAQS;

  return {
    fileStore,
    products: Array.from(productMap.values()),
    collections,
    bundles,
    discountCodes,
    paymentProviders,
    orders,
    webhookEvents,
    newsletterSubscribers,
    emailLogs,
    reviews,
    faqs,
  };
}

export function upsertLocalOrder(order) {
  if (isServerlessReadOnlyEnv() || !order) return false;
  try {
    const store = readLocalStoreRaw();
    if (!store || typeof store !== 'object') return false;
    if (!Array.isArray(store.orders)) store.orders = [];

    const idx = store.orders.findIndex(
      (o) =>
        o.id === order.id ||
        (order.downloadToken && o.downloadToken === order.downloadToken) ||
        (order.paypalOrderId && o.paypalOrderId === order.paypalOrderId) ||
        (order.paypalCaptureId && o.paypalCaptureId === order.paypalCaptureId)
    );

    if (idx >= 0) {
      store.orders[idx] = { ...store.orders[idx], ...order };
    } else {
      store.orders.unshift(order);
    }

    return writeLocalStoreRaw(store);
  } catch (err) {
    console.warn('[LocalStore] Could not upsert order:', err?.message || err);
    return false;
  }
}

export function incrementLocalProductDownloads(items) {
  if (isServerlessReadOnlyEnv() || !Array.isArray(items) || items.length === 0) return false;
  try {
    const store = readLocalStoreRaw();
    if (!store || !Array.isArray(store.products)) return false;
    for (const item of items) {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.downloadCount = (prod.downloadCount || 0) + 1;
        prod.recentDownloadTime = 'just now';
      }
    }
    return writeLocalStoreRaw(store);
  } catch {
    return false;
  }
}

export function hasLocalWebhookEvent(eventId) {
  if (!eventId) return false;
  const catalog = loadRuntimeCatalog();
  return catalog.webhookEvents.some((ev) => ev?.eventId === eventId);
}

export function recordLocalWebhookEvent(entry) {
  if (isServerlessReadOnlyEnv() || !entry?.eventId) return false;
  try {
    const store = readLocalStoreRaw();
    if (!store || typeof store !== 'object') return false;
    if (!Array.isArray(store.webhookEvents)) store.webhookEvents = [];
    if (store.webhookEvents.some((ev) => ev?.eventId === entry.eventId)) {
      return false;
    }
    store.webhookEvents.unshift({
      ...entry,
      processedAt: new Date().toISOString(),
    });
    if (store.webhookEvents.length > 500) {
      store.webhookEvents = store.webhookEvents.slice(0, 500);
    }
    return writeLocalStoreRaw(store);
  } catch {
    return false;
  }
}


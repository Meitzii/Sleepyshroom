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

export function getRootDir() {
  return ROOT_DIR;
}

export function isServerlessReadOnlyEnv() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function loadRuntimeCatalog() {
  let fileStore = null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      fileStore = JSON.parse(raw);
    }
  } catch {
    fileStore = null;
  }

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
    paypalEnabled: rawProviders.paypalEnabled !== false,
    paypalAllowCards: rawProviders.paypalAllowCards !== false,
    testMode: rawProviders.testMode !== false,
  };

  const orders = Array.isArray(fileStore?.orders) ? fileStore.orders : DEFAULT_INITIAL_ORDERS;
  const webhookEvents = Array.isArray(fileStore?.webhookEvents) ? fileStore.webhookEvents : [];

  return {
    fileStore,
    products: Array.from(productMap.values()),
    discountCodes,
    paymentProviders,
    orders,
    webhookEvents,
  };
}

export function upsertLocalOrder(order) {
  if (isServerlessReadOnlyEnv() || !order) return false;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let store = fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
      : null;
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

    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('[LocalStore] Could not upsert order:', err?.message || err);
    return false;
  }
}

export function incrementLocalProductDownloads(items) {
  if (isServerlessReadOnlyEnv() || !Array.isArray(items) || items.length === 0) return false;
  try {
    if (!fs.existsSync(DATA_FILE)) return false;
    const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (!store || !Array.isArray(store.products)) return false;
    for (const item of items) {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.downloadCount = (prod.downloadCount || 0) + 1;
        prod.recentDownloadTime = 'just now';
      }
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return true;
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
    if (!fs.existsSync(DATA_FILE)) return false;
    const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

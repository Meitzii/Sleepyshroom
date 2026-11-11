import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

export const DEFAULT_PAYMENT_PROVIDERS = {
  stripeEnabled: true,
  stripePublishableKey: 'pk_test_sample_sleepyshroom',
  stripeSecretKeyConfigured: false,
  paypalEnabled: true,
  paypalClientId: 'client_id_sample',
  paypalEmail: '',
  gcashEnabled: true,
  gcashAccountName: '',
  gcashNumber: '',
  mayaEnabled: true,
  mayaAccountName: '',
  mayaNumber: '',
  testMode: true,
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
    images: ['/src/assets/images/theme_cozy_autumn_1794020166366.jpg'],
    status: 'published',
    downloadFileName: 'sleepyshroom_autumn_mobile_tablet.zip',
  },
];

export const DEFAULT_INITIAL_ORDERS = [
  {
    id: 'ord-1041',
    orderNumber: 'SHROOM-1041',
    customerEmail: 'clara.woodland@example.com',
    customerName: 'Clara Woodland',
    items: [
      {
        productId: 'prod-desktop-1',
        title: 'Sleepy Garden Sanctuary Wallpaper',
        price: 4.5,
        quantity: 1,
        image: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
        deviceTypes: ['desktop'],
        downloadFileName: 'sleepyshroom_sleepy_garden_desktop_bundle.zip',
      },
      {
        productId: 'prod-mobile-1',
        title: 'Midnight Firefly Forest Mobile & Tablet',
        price: 3.5,
        quantity: 1,
        image: '/src/assets/images/theme_mobile_forest_1794020166376.jpg',
        deviceTypes: ['mobile', 'tablet'],
        downloadFileName: 'sleepyshroom_firefly_forest_mobile_tablet.zip',
      },
    ],
    subtotal: 8.0,
    discount: 0.8,
    discountCode: 'COZY10',
    total: 7.2,
    paymentMethod: 'Card (Visa •••• 4242)',
    paymentProvider: 'stripe',
    paymentStatus: 'completed',
    transactionId: 'txn_str_9831478234',
    downloadToken: 'tok_shroom_demo_1041',
    downloadCount: 3,
    createdAt: '2026-11-05T14:22:00.000Z',
  },
];

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

  const paymentProviders = {
    ...DEFAULT_PAYMENT_PROVIDERS,
    ...(fileStore?.settings?.paymentProviders || {}),
  };

  const orders = Array.isArray(fileStore?.orders) ? fileStore.orders : DEFAULT_INITIAL_ORDERS;

  return {
    fileStore,
    products: Array.from(productMap.values()),
    discountCodes,
    paymentProviders,
    orders,
  };
}

export function saveLocalCheckoutRecord(newOrder, verifiedItems) {
  if (isServerlessReadOnlyEnv()) {
    return false;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let store = null;
    if (fs.existsSync(DATA_FILE)) {
      store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    if (!store || typeof store !== 'object') {
      return false;
    }

    if (!Array.isArray(store.orders)) {
      store.orders = [];
    }
    store.orders.unshift(newOrder);

    if (Array.isArray(store.products)) {
      for (const item of verifiedItems) {
        const prod = store.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.downloadCount = (prod.downloadCount || 0) + 1;
          prod.recentDownloadTime = 'just now';
        }
      }
    }

    if (Array.isArray(store.users) && newOrder.customerEmail) {
      const exists = store.users.some(
        (u) => String(u.email || '').toLowerCase() === newOrder.customerEmail.toLowerCase()
      );
      if (!exists) {
        store.users.push({
          id: newOrder.userId || `usr-${Date.now()}`,
          name: newOrder.customerName || 'Valued Customer',
          email: newOrder.customerEmail,
          createdAt: newOrder.createdAt,
        });
      }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('[Checkout] Skipping local file persistence:', err?.message || err);
    return false;
  }
}

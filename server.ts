import http from 'http';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { 
  Product, 
  CarouselSlide, 
  Collection, 
  WebsiteSettings, 
  Order, 
  ContactMessage, 
  DiscountCode, 
  UserAccount 
} from './src/types/index.ts';
import {
  handleContactSubmission,
  handleAdminListMessages,
  handleAdminUpdateMessageStatus,
  handleAdminDeleteMessage,
  handleAdminReplyMessage,
} from './lib/contact-service.js';
import {
  handleGetPaymentConfig,
  handleDiscountValidation,
  handleCheckoutSubmission,
  handlePaymongoWebhook,
  handleListOrders,
  handleGetOrderByToken,
  handleOrderAction,
  handleAuthorizedDownload,
} from './lib/checkout-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local'), quiet: true });
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

function parsePortValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(String(raw).trim());
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }
  return undefined;
}

function resolveListenConfig(): { port: number; host?: string } {
  const args = process.argv.slice(2);
  let cliPort: number | undefined;
  let cliHost: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
      const nextVal = args[i + 1];
      const parsed = parsePortValue(nextVal);
      if (parsed !== undefined) {
        cliPort = parsed;
        i += 1;
      }
    } else if (arg.startsWith('--port=')) {
      const parsed = parsePortValue(arg.slice('--port='.length));
      if (parsed !== undefined) cliPort = parsed;
    } else if (arg.startsWith('-p') && arg.length > 2) {
      const parsed = parsePortValue(arg.slice(2));
      if (parsed !== undefined) cliPort = parsed;
    } else if (arg === '--host' || arg === '-H') {
      const nextVal = args[i + 1];
      if (nextVal && !nextVal.startsWith('-')) {
        cliHost = nextVal.trim();
        i += 1;
      } else {
        cliHost = '0.0.0.0';
      }
    } else if (arg.startsWith('--host=')) {
      const val = arg.slice('--host='.length).trim();
      cliHost = val || '0.0.0.0';
    }
  }

  const nginxPort = parsePortValue(process.env.NGINX_PORT);
  const envPort = parsePortValue(process.env.PORT);
  const defaultAppPort = parsePortValue(process.env.DEFAULT_APP_PORT) ?? 3000;
  const safeEnvPort = envPort !== undefined && envPort !== nginxPort ? envPort : undefined;

  const port = cliPort ?? safeEnvPort ?? defaultAppPort;
  const host = cliHost || process.env.HOST?.trim() || undefined;
  return { port, host };
}

const app = express();
const { port: PORT, host: HOST } = resolveListenConfig();
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure data and uploads directory exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface AppStore {
  settings: WebsiteSettings;
  carouselSlides: CarouselSlide[];
  products: Product[];
  collections: Collection[];
  orders: Order[];
  messages: ContactMessage[];
  discountCodes: DiscountCode[];
  users: UserAccount[];
}

const defaultStore: AppStore = {
  settings: {
    storeName: 'sleepyshroom',
    tagline: 'Little screens, sweeter dreams.',
    contactEmail: 'shop.sleepyshroom@gmail.com',
    currency: 'USD',
    currencySymbol: '$',
    heroHeadline: 'Cozy wallpapers for your dreamy days.',
    heroSupportingText: 'Find a little happiness in every screen. Discover cozy, cute, and dreamy digital wallpapers made with love.',
    heroPrimaryBtnText: 'Explore Themes',
    heroSecondaryBtnText: 'Browse Wallpapers',
    heroImage: '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
    brandIntroHeading: 'A little corner of cozy.',
    brandIntroText: 'sleepyshroom is a little digital corner for people who love soft colors, dreamy illustrations, and making their devices feel like home.',
    showHero: true,
    showCarousel: true,
    showDesktopSection: true,
    showMobileSection: true,
    showBrandIntro: true,
    paymentProviders: {
      paymongoEnabled: true,
      paymongoEnabledMethods: ['card', 'gcash', 'paymaya', 'qrph', 'grab_pay'],
      phpPerUsdRate: 58,
      testMode: true,
    },
    socialLinks: {
      instagram: 'https://instagram.com/sleepyshroom',
      twitter: 'https://twitter.com/sleepyshroom',
      pinterest: 'https://pinterest.com/sleepyshroom',
    },
    aboutMe: {
      heading: 'Hello, welcome to my little corner!',
      introduction: "Hi! I'm the person behind sleepyshroom. I created this little shop to share cozy, dreamy, and lovely designs that make everyday screens feel a little more special.",
      whyStarted: "In a world that can often feel rushed and noisy, I wanted our phones, tablets, and laptops to be calming sanctuaries. Each illustration starts with quiet pencil sketches of sleeping fungi, gentle forest creatures, and soothing pastel hues that bring peaceful moments throughout your day.",
      designInspiration: "Inspired by gentle Japanese stationery, quiet rainy mornings, fairy-tale moss gardens, and the warmth of a hot cup of tea. Every digital download is crafted with care, high pixel density, and subtle grain textures that feel like real paper.",
      profileImage: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
    },
    returnPolicy: {
      title: 'Digital Goods Return & Refund Policy',
      lastUpdated: 'November 2026',
      content: `## 1. Digital Download Nature
All products available on sleepyshroom are digital downloads (PNG, HEIC, and high-resolution ZIP archives). Because digital files are delivered immediately upon order completion and cannot be returned physically, all sales are generally final.

## 2. Instant Download Access
Once payment is completed, you receive instant download links on your confirmation screen, an email receipt with your secure download token, and permanent access inside your customer account.

## 3. Duplicate Purchases
Accidentally purchase the exact same wallpaper twice? No worries! Contact us within 14 days with your order numbers, and we will happily refund the duplicate transaction.

## 4. Damaged or Corrupted Files
In the rare event that a downloaded file is corrupted or fails to unpack, please email us right away. We will immediately reissue fresh, verified download files or provide direct links.

## 5. Device Compatibility Assistance
If you need help setting up your wallpaper on a specific iOS, Android, macOS, or Windows device, reach out anytime! We provide step-by-step setup guides for both Lock Screens and Home Screens.

## 6. How to Contact Us
For any questions or assistance with your order, email us at shop.sleepyshroom@gmail.com or use our Contact Form. We typically respond within 24-48 hours.`,
    },
  },
  carouselSlides: [
    {
      id: 'slide-1',
      themeTitle: 'Mushroom Dreams',
      description: 'Under a starry pastel cap, dream away the busy day in peace and warmth.',
      imageUrl: '/src/assets/images/theme_mushroom_dreams_1794020165115.jpg',
      linkDestination: '/collections?theme=Mushroom+Dreams',
      exploreButtonText: 'Explore Theme',
      order: 1,
      visible: true,
      status: 'published',
    },
    {
      id: 'slide-2',
      themeTitle: 'Sleepy Garden',
      description: 'Gentle snail friends, chamomile blooms, and morning mist in the quiet meadow.',
      imageUrl: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
      linkDestination: '/collections?theme=Sleepy+Garden',
      exploreButtonText: 'Explore Theme',
      order: 2,
      visible: true,
      status: 'published',
    },
    {
      id: 'slide-3',
      themeTitle: 'Cozy Autumn',
      description: 'Crisp falling golden leaves, miniature mushroom roofs, and warm acorn tea.',
      imageUrl: '/src/assets/images/theme_cozy_autumn_1794020166366.jpg',
      linkDestination: '/collections?theme=Cozy+Autumn',
      exploreButtonText: 'Explore Theme',
      order: 3,
      visible: true,
      status: 'published',
    },
    {
      id: 'slide-4',
      themeTitle: 'Little Forest',
      description: 'Soft mossy paths guided by glowing lantern fungi and resting woodland friends.',
      imageUrl: '/src/assets/images/theme_mobile_forest_1794020166376.jpg',
      linkDestination: '/collections?theme=Little+Forest',
      exploreButtonText: 'Explore Theme',
      order: 4,
      visible: true,
      status: 'published',
    },
    {
      id: 'slide-5',
      themeTitle: 'Dreamy Pastels',
      description: 'Soothing lavender gradients, hand-drawn sparkles, and soft whimsical clouds.',
      imageUrl: '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
      linkDestination: '/collections?theme=Dreamy+Pastels',
      exploreButtonText: 'Explore Theme',
      order: 5,
      visible: true,
      status: 'published',
    },
  ],

  /* =========================================================================================
   * 🎨 [WALLPAPER DISPLAY CONFIGURATION] - CHANGE YOUR WALLPAPER PRODUCTS & IMAGES HERE!
   * =========================================================================================
   * File locations:
   * 1. Active live store data: /data/store.json (search for "products")
   * 2. Default code backup: /server.ts (below)
   * 3. Wallpaper image files folder: /src/assets/images/
   *
   * To change the preview image shown on a wallpaper card, change the "images" array:
   *   images: ['/src/assets/images/your_new_image.jpg']
   *
   * To change what file is downloaded when purchased or freebie downloaded:
   *   downloadFileName: 'your_wallpaper_file.zip' (or .jpg)
   * ========================================================================================= */
  products: [
    {
      id: 'prod-desktop-1',
      title: 'Sleepy Garden Sanctuary Wallpaper',
      slug: 'sleepy-garden-sanctuary',
      description: 'A soothing sanctuary for your computer screen. Features hand-drawn chamomile blooms, sleeping snail companions, gentle morning dew, and soft lavender mushrooms.',
      price: 4.50,
      compareAtPrice: 6.00,
      theme: 'Sleepy Garden',
      collection: 'Pastel Garden',
      deviceTypes: ['desktop'],
      resolutions: ['4K UHD (3840 x 2160)', '5K Retina (5120 x 2880)', 'Ultrawide (3440 x 1440)', 'MacBook / Laptop (2560 x 1600)'],
      fileFormat: 'High-res lossless PNG (300 DPI) + 16-bit color profile',
      fileSize: '38.4 MB (ZIP archive with 4 resolution variations)',
      whatsIncluded: [
        '4K Desktop Wallpaper (16:9)',
        '5K Ultra-Retina Wallpaper',
        'Ultrawide Desktop Variant (21:9)',
        'Organized Desktop Organizer Icon Grid Template',
        'Step-by-step Setup Guide for macOS & Windows'
      ],
      images: [
        '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
        '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'
      ],
      featured: true,
      isNew: true,
      popularity: 98,
      status: 'published',
      createdAt: '2026-11-01T10:00:00.000Z',
      downloadFileName: 'sleepyshroom_sleepy_garden_desktop_bundle.zip',
    },
    {
      id: 'prod-desktop-2',
      title: 'Cozy Autumn Cottage Wallpaper',
      slug: 'cozy-autumn-cottage',
      description: 'Warm golden sunlight filters through amber oak leaves onto a cozy thatched mushroom roof, complete with a steaming cup of herbal tea and a favorite open book.',
      price: 4.50,
      compareAtPrice: 5.50,
      theme: 'Cozy Autumn',
      collection: 'Autumn Cottage',
      deviceTypes: ['desktop'],
      resolutions: ['4K UHD (3840 x 2160)', '5K Retina (5120 x 2880)', 'Ultrawide (3440 x 1440)'],
      fileFormat: 'Lossless PNG + HEIC + Minimalist Wallpaper Variant',
      fileSize: '42.1 MB',
      whatsIncluded: [
        'Full Autumn Illustration 4K',
        'Minimalist Low-Detail Variant for Clean Desktops',
        'Ultrawide 21:9 ratio',
        'Mac & Windows instructions'
      ],
      images: [
        '/src/assets/images/theme_cozy_autumn_1794020166366.jpg',
        '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'
      ],
      featured: true,
      isNew: false,
      popularity: 95,
      status: 'published',
      createdAt: '2026-10-24T12:00:00.000Z',
      downloadFileName: 'sleepyshroom_autumn_cottage_desktop.zip',
    },
    {
      id: 'prod-desktop-3',
      title: 'Mushroom Dreams Slumber Desktop',
      slug: 'mushroom-dreams-slumber-desktop',
      description: 'The iconic sleepyshroom character dozing soundly beneath a lavender polka-dot cap, wrapped in a cozy purple knit scarf with fairy light sparkles all around.',
      price: 5.00,
      compareAtPrice: 6.50,
      theme: 'Mushroom Dreams',
      collection: 'Dreamy Night',
      deviceTypes: ['desktop'],
      resolutions: ['4K UHD (3840 x 2160)', '5K Retina (5120 x 2880)', 'Ultrawide (3440 x 1440)'],
      fileFormat: 'High-res Lossless PNG files',
      fileSize: '36.8 MB',
      whatsIncluded: [
        'Main 4K Nighttime Slumber Wallpaper',
        'Soft Lavender Day Edition',
        'Ultrawide Dual Monitor Edition',
        'Desktop Folder Icons pack'
      ],
      images: [
        '/src/assets/images/theme_mushroom_dreams_1794020165115.jpg',
        '/src/assets/images/theme_sleepy_garden_1794020165839.jpg'
      ],
      featured: true,
      isNew: true,
      popularity: 99,
      status: 'published',
      createdAt: '2026-11-03T14:30:00.000Z',
      downloadFileName: 'sleepyshroom_slumber_desktop_pack.zip',
    },
    {
      id: 'prod-desktop-4',
      title: 'Little Shroom Cottage Dusk Desktop',
      slug: 'little-shroom-cottage-dusk',
      description: 'Our signature mushroom cottage bathed in sweet twilight hues with a glowing lantern and blooming wildflower meadow path.',
      price: 4.00,
      theme: 'Little Forest',
      collection: 'Enchanted Woodland',
      deviceTypes: ['desktop'],
      resolutions: ['4K UHD (3840 x 2160)', 'MacBook Retina'],
      fileFormat: 'Lossless PNG',
      fileSize: '29.5 MB',
      whatsIncluded: [
        '4K Desktop Wallpaper',
        'Sunset Twilight Colorway',
        'Installation Guide'
      ],
      images: [
        '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'
      ],
      featured: false,
      isNew: false,
      popularity: 88,
      status: 'published',
      createdAt: '2026-10-15T09:00:00.000Z',
      downloadFileName: 'sleepyshroom_cottage_dusk_desktop.zip',
    },
    {
      id: 'prod-mobile-1',
      title: 'Midnight Firefly Forest Mobile & Tablet',
      slug: 'midnight-firefly-forest-mobile',
      description: 'A magical vertical phone and tablet wallpaper capturing glowing mushroom lanterns, sparkling stars, and a little fox slumbering warmly in a mossy nook.',
      price: 3.50,
      compareAtPrice: 4.50,
      theme: 'Little Forest',
      collection: 'Dreamy Night',
      deviceTypes: ['mobile', 'tablet'],
      resolutions: ['iPhone 12–16 Pro Max (1290 x 2796)', 'Android OLED (1440 x 3120)', 'iPad Pro 11" & 12.9" (2048 x 2732)', 'Universal Tablet'],
      fileFormat: 'PNG + HEIC (Optimized for Apple & Android Lock Screens and Home Screens)',
      fileSize: '24.2 MB',
      whatsIncluded: [
        'Lock Screen Wallpaper (with space for clock & widgets)',
        'Home Screen Wallpaper (gentle blur / low contrast for clean icons)',
        'iPad / Tablet Portrait & Landscape versions',
        'Matching App Icon Grids'
      ],
      images: [
        '/src/assets/images/theme_mobile_forest_1794020166376.jpg'
      ],
      featured: true,
      isNew: true,
      popularity: 97,
      status: 'published',
      createdAt: '2026-11-04T16:00:00.000Z',
      downloadFileName: 'sleepyshroom_firefly_forest_mobile_tablet.zip',
    },
    {
      id: 'prod-mobile-2',
      title: 'Sleepy Mushroom Slumber Phone Wallpaper',
      slug: 'sleepy-mushroom-slumber-phone',
      description: 'Keep the cutest sleepy mushroom companion in your pocket wherever you go. Perfectly composed so your time display and widgets sit above the cozy mushroom cap.',
      price: 3.50,
      compareAtPrice: 4.00,
      theme: 'Mushroom Dreams',
      collection: 'Dreamy Night',
      deviceTypes: ['mobile', 'tablet'],
      resolutions: ['iPhone HD & Super Retina', 'Android OLED', 'iPad Pro'],
      fileFormat: 'Lossless PNG + Apple HEIC',
      fileSize: '21.0 MB',
      whatsIncluded: [
        'Phone Lock Screen edition',
        'Phone Home Screen low-distraction edition',
        'Tablet Pro edition (2048 x 2732)',
        'Step-by-step lockscreen setup tips'
      ],
      images: [
        '/src/assets/images/theme_mushroom_dreams_1794020165115.jpg'
      ],
      featured: true,
      isNew: false,
      popularity: 94,
      status: 'published',
      createdAt: '2026-10-28T11:20:00.000Z',
      downloadFileName: 'sleepyshroom_slumber_phone_tablet.zip',
    },
    {
      id: 'prod-mobile-3',
      title: 'Chamomile Meadow Snail Mobile Wallpaper',
      slug: 'chamomile-meadow-snail-mobile',
      description: 'A flower-crowned snail taking a peaceful afternoon nap amongst wild chamomile blooms and pastel lilac fungi. Calming, delicate, and gentle on the eyes.',
      price: 3.00,
      theme: 'Sleepy Garden',
      collection: 'Pastel Garden',
      deviceTypes: ['mobile'],
      resolutions: ['High-Res Phone OLED (1290 x 2796)'],
      fileFormat: 'PNG format',
      fileSize: '18.4 MB',
      whatsIncluded: [
        'Phone Lock Screen (Clean)',
        'Phone Home Screen (Muted)',
        'Quick Wallpaper Guide'
      ],
      images: [
        '/src/assets/images/theme_sleepy_garden_1794020165839.jpg'
      ],
      featured: false,
      isNew: true,
      popularity: 91,
      status: 'published',
      createdAt: '2026-11-02T13:45:00.000Z',
      downloadFileName: 'sleepyshroom_chamomile_snail_phone.zip',
    },
    {
      id: 'prod-mobile-4',
      title: 'Autumn Acorn Teatime Mobile & Tablet',
      slug: 'autumn-acorn-teatime-mobile',
      description: 'Warm cozy vibes on the go. Golden autumn leaves, steaming teacup, and little storybook mushroom hut adapted for all vertical screens.',
      price: 3.50,
      theme: 'Cozy Autumn',
      collection: 'Autumn Cottage',
      deviceTypes: ['mobile', 'tablet'],
      resolutions: ['iPhone All Sizes', 'Android All Sizes', 'iPad / Android Tablet'],
      fileFormat: 'PNG & HEIC formats',
      fileSize: '23.8 MB',
      whatsIncluded: [
        'Phone Lock Screen',
        'Phone Home Screen',
        'Tablet Edition',
        'Setup Instructions'
      ],
      images: [
        '/src/assets/images/theme_cozy_autumn_1794020166366.jpg'
      ],
      featured: false,
      isNew: false,
      popularity: 89,
      status: 'published',
      createdAt: '2026-10-20T08:15:00.000Z',
      downloadFileName: 'sleepyshroom_autumn_mobile_tablet.zip',
    }
  ],
  collections: [
    {
      id: 'col-1',
      name: 'Dreamy Night',
      slug: 'dreamy-night',
      description: 'Starry twilight skies, glowing fungi lanterns, and quiet dreams for restful evenings.',
      coverImage: '/src/assets/images/theme_mushroom_dreams_1794020165115.jpg',
      featured: true,
      order: 1,
      productCount: 3,
    },
    {
      id: 'col-2',
      name: 'Pastel Garden',
      slug: 'pastel-garden',
      description: 'Soft lavender petals, chamomile blooms, and gentle sleepy garden snails.',
      coverImage: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
      featured: true,
      order: 2,
      productCount: 2,
    },
    {
      id: 'col-3',
      name: 'Autumn Cottage',
      slug: 'autumn-cottage',
      description: 'Warm golden sunlight, fallen oak leaves, steaming acorn tea, and cozy cabins.',
      coverImage: '/src/assets/images/theme_cozy_autumn_1794020166366.jpg',
      featured: true,
      order: 3,
      productCount: 2,
    },
    {
      id: 'col-4',
      name: 'Enchanted Woodland',
      slug: 'enchanted-woodland',
      description: 'Little mushroom abodes nestled in misty forests and tranquil woodland glens.',
      coverImage: '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
      featured: true,
      order: 4,
      productCount: 2,
    }
  ],
  orders: [],
  messages: [
    {
      id: 'msg-1',
      fullName: 'Hannah Baker',
      email: 'hannah.b@example.com',
      subject: 'Custom ultrawide resolution request',
      message: 'I love your Sleepy Garden wallpapers so much! Will you be releasing dual 32:9 super ultrawide editions soon? Keep up the magical work!',
      consent: true,
      status: 'new',
      createdAt: '2026-11-06T15:10:00.000Z',
    }
  ],
  discountCodes: [
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
      value: 2.00,
      minSpend: 8.00,
      active: true,
    }
  ],
  users: [
    {
      id: 'usr-admin',
      name: 'Sleepyshroom Owner',
      email: 'shop.sleepyshroom@gmail.com',
      isAdmin: true,
      role: 'admin',
      createdAt: '2026-11-01T08:00:00.000Z',
    },
    {
      id: 'usr-demo',
      name: 'Cozy Dreamer',
      email: 'dreamer@sleepyshroom.com',
      createdAt: '2026-11-01T08:00:00.000Z',
    }
  ],
};

const VALID_PAYMONGO_METHODS = ['card', 'gcash', 'paymaya', 'qrph', 'grab_pay'] as const;

function sanitizePaymentProviders(raw: any) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawMethods = Array.isArray(src.paymongoEnabledMethods)
    ? src.paymongoEnabledMethods.filter((m: any) => VALID_PAYMONGO_METHODS.includes(m))
    : [];
  const rateNum = Number(src.phpPerUsdRate);
  return {
    paymongoEnabled: src.paymongoEnabled !== false,
    paymongoEnabledMethods:
      rawMethods.length > 0 ? rawMethods : [...defaultStore.settings.paymentProviders.paymongoEnabledMethods],
    phpPerUsdRate: Number.isFinite(rateNum) && rateNum > 0 ? Number(rateNum.toFixed(2)) : 58,
    testMode: src.testMode !== false,
  };
}

// Initialize or read store
function readStore(): AppStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data) as AppStore;
      if (parsed && typeof parsed === 'object') {
        parsed.settings = {
          ...defaultStore.settings,
          ...(parsed.settings || {}),
          paymentProviders: sanitizePaymentProviders(parsed.settings?.paymentProviders),
        };
        if (!Array.isArray(parsed.orders)) {
          parsed.orders = [];
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading store file, falling back to default:', err);
  }
  saveStore(defaultStore);
  return defaultStore;
}

function saveStore(store: AppStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

// PayMongo Webhook MUST receive exact unparsed raw request bytes BEFORE express.json() for HMAC-SHA256 verification
app.post('/api/webhooks/paymongo', express.raw({ type: '*/*', limit: '2mb' }), async (req: Request, res: Response) => {
  try {
    const result = await handlePaymongoWebhook(req, req.body);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[PayMongo Webhook Error]', err);
    res.status(500).json({
      received: false,
      error: err?.message || 'Unexpected error processing PayMongo webhook.',
    });
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/wallpapers', express.static(path.join(__dirname, 'public', 'wallpapers')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/src/assets/images', express.static(path.join(__dirname, 'public', 'src', 'assets', 'images')));

// API ROUTES

// 1. Settings & Content
app.get('/api/content', (_req: Request, res: Response) => {
  const store = readStore();
  res.json({
    settings: store.settings,
    carouselSlides: store.carouselSlides.filter(s => s.status === 'published' && s.visible).sort((a, b) => a.order - b.order),
  });
});

app.get('/api/admin/content', (_req: Request, res: Response) => {
  const store = readStore();
  res.json({
    settings: store.settings,
    carouselSlides: store.carouselSlides.sort((a, b) => a.order - b.order),
  });
});

app.put('/api/admin/settings', (req: Request, res: Response) => {
  const store = readStore();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const nextSettings: WebsiteSettings = {
    ...store.settings,
    ...body,
    paymentProviders: sanitizePaymentProviders(
      body.paymentProviders ?? store.settings.paymentProviders
    ),
  };
  store.settings = nextSettings;
  saveStore(store);
  res.json({ success: true, settings: store.settings });
});

// 2. Carousel Management
app.get('/api/slides', (_req: Request, res: Response) => {
  const store = readStore();
  res.json(store.carouselSlides);
});

app.put('/api/admin/slides', (req: Request, res: Response) => {
  const store = readStore();
  const slides = req.body as CarouselSlide[];
  if (Array.isArray(slides)) {
    store.carouselSlides = slides;
    saveStore(store);
    res.json({ success: true, slides: store.carouselSlides });
  } else {
    res.status(400).json({ error: 'Expected array of slides' });
  }
});

app.post('/api/admin/slides', (req: Request, res: Response) => {
  const store = readStore();
  const newSlide: CarouselSlide = {
    id: `slide-${Date.now()}`,
    themeTitle: req.body.themeTitle || 'New Theme',
    description: req.body.description || 'Description of this cozy wallpaper collection.',
    imageUrl: req.body.imageUrl || '',
    linkDestination: req.body.linkDestination || '/collections',
    exploreButtonText: req.body.exploreButtonText || 'Explore Theme',
    order: store.carouselSlides.length + 1,
    visible: req.body.visible ?? true,
    status: req.body.status || 'published',
  };
  store.carouselSlides.push(newSlide);
  saveStore(store);
  res.json({ success: true, slide: newSlide });
});

app.delete('/api/admin/slides/:id', (req: Request, res: Response) => {
  const store = readStore();
  store.carouselSlides = store.carouselSlides.filter(s => s.id !== req.params.id);
  // Re-number orders
  store.carouselSlides.forEach((s, i) => {
    s.order = i + 1;
  });
  saveStore(store);
  res.json({ success: true });
});

// 3. Products
app.get('/api/products', (req: Request, res: Response) => {
  const store = readStore();
  const { device, theme, collection, search, sort, includeDrafts } = req.query;

  let list = store.products;
  if (includeDrafts !== 'true') {
    list = list.filter(p => p.status === 'published');
  }

  if (device && typeof device === 'string' && device !== 'all') {
    list = list.filter(p => p.deviceTypes.includes(device as any));
  }

  if (theme && typeof theme === 'string' && theme !== 'all') {
    list = list.filter(p => p.theme.toLowerCase() === theme.toLowerCase());
  }

  if (collection && typeof collection === 'string' && collection !== 'all') {
    list = list.filter(p => p.collection.toLowerCase() === collection.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.theme.toLowerCase().includes(q) ||
      p.collection.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (sort === 'price-low') {
    list = [...list].sort((a, b) => a.price - b.price);
  } else if (sort === 'price-high') {
    list = [...list].sort((a, b) => b.price - a.price);
  } else if (sort === 'popular') {
    list = [...list].sort((a, b) => b.popularity - a.popularity);
  } else {
    // Default newest
    list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(list);
});

app.get('/api/products/:idOrSlug', (req: Request, res: Response) => {
  const store = readStore();
  const param = req.params.idOrSlug;
  const product = store.products.find(p => p.id === param || p.slug === param);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

app.post('/api/admin/products', (req: Request, res: Response) => {
  const store = readStore();
  const body = req.body;
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    title: body.title || 'Untitled Wallpaper',
    slug: (body.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: body.description || '',
    price: Number(body.price) || 3.50,
    compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
    theme: body.theme || 'Mushroom Dreams',
    collection: body.collection || 'Dreamy Night',
    deviceTypes: body.deviceTypes && body.deviceTypes.length > 0 ? body.deviceTypes : ['desktop'],
    resolutions: body.resolutions || ['4K UHD (3840 x 2160)'],
    fileFormat: body.fileFormat || 'High-res lossless PNG (300 DPI)',
    fileSize: body.fileSize || '25.0 MB',
    whatsIncluded: body.whatsIncluded || ['High-resolution digital wallpaper', 'Setup guide'],
    images: body.images && body.images.length > 0 ? body.images : ['/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'],
    featured: Boolean(body.featured),
    isNew: true,
    popularity: 90,
    status: body.status || 'published',
    createdAt: new Date().toISOString(),
    downloadFileName: body.downloadFileName || `${(body.title || 'wallpaper').toLowerCase().replace(/\s+/g, '_')}.zip`,
    isFree: Boolean(body.isFree || Number(body.price) === 0),
    downloadCount: Number(body.downloadCount) || 120,
    recentDownloadTime: body.recentDownloadTime || 'just now',
  };

  store.products.unshift(newProduct);
  saveStore(store);
  res.json({ success: true, product: newProduct });
});

app.put('/api/admin/products/:id', (req: Request, res: Response) => {
  const store = readStore();
  const idx = store.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const updated = { ...store.products[idx], ...req.body };
  if (updated.isFree) {
    updated.price = 0;
  }
  if (req.body.downloadCount !== undefined) {
    updated.downloadCount = Number(req.body.downloadCount);
  }
  store.products[idx] = updated;
  saveStore(store);
  res.json({ success: true, product: store.products[idx] });
});

app.delete('/api/admin/products/:id', (req: Request, res: Response) => {
  const store = readStore();
  store.products = store.products.filter(p => p.id !== req.params.id);
  saveStore(store);
  res.json({ success: true });
});

// 4. Collections
app.get('/api/collections', (_req: Request, res: Response) => {
  const store = readStore();
  const list = store.collections.map(c => {
    const count = store.products.filter(p => p.collection.toLowerCase() === c.name.toLowerCase() && p.status === 'published').length;
    return { ...c, productCount: count };
  });
  res.json(list);
});

app.post('/api/admin/collections', (req: Request, res: Response) => {
  const store = readStore();
  const body = req.body;
  const newCol: Collection = {
    id: `col-${Date.now()}`,
    name: body.name || 'New Collection',
    slug: (body.name || 'new').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: body.description || '',
    coverImage: body.coverImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
    featured: Boolean(body.featured),
    order: store.collections.length + 1,
    productCount: 0,
  };
  store.collections.push(newCol);
  saveStore(store);
  res.json({ success: true, collection: newCol });
});

app.put('/api/admin/collections/:id', (req: Request, res: Response) => {
  const store = readStore();
  const idx = store.collections.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }
  store.collections[idx] = { ...store.collections[idx], ...req.body };
  saveStore(store);
  res.json({ success: true, collection: store.collections[idx] });
});

app.delete('/api/admin/collections/:id', (req: Request, res: Response) => {
  const store = readStore();
  store.collections = store.collections.filter(c => c.id !== req.params.id);
  saveStore(store);
  res.json({ success: true });
});

// 5. Discount Codes
app.get('/api/discounts', (_req: Request, res: Response) => {
  const store = readStore();
  res.json(store.discountCodes);
});

app.post('/api/discounts/validate', async (req: Request, res: Response) => {
  try {
    const result = await handleDiscountValidation(req);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Discount Validate Error]', err);
    res.status(500).json({ valid: false, message: 'Could not validate promo code.' });
  }
});

// 6. Checkout & Orders (PayMongo PHP Checkout + Webhooks)
app.get('/api/checkout', async (_req: Request, res: Response) => {
  try {
    const result = await handleGetPaymentConfig();
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Payment Config Error]', err);
    res.status(500).json({ error: 'Unable to load payment configuration.' });
  }
});

app.post('/api/checkout', async (req: Request, res: Response) => {
  try {
    const result = await handleCheckoutSubmission(req);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Checkout API Error]', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Unexpected error processing checkout.',
    });
  }
});

app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const result = await handleListOrders(req);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Orders List Error]', err);
    res.status(500).json({ error: 'Unable to load orders.' });
  }
});

app.get('/api/orders/:idOrToken', async (req: Request, res: Response) => {
  try {
    const result = await handleGetOrderByToken(req, String(req.params.idOrToken || ''));
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Order Lookup Error]', err);
    res.status(500).json({ error: 'Unable to load order.' });
  }
});

app.post('/api/orders/:idOrToken', async (req: Request, res: Response) => {
  try {
    const result = await handleOrderAction(req, String(req.params.idOrToken || ''));
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Order Action Error]', err);
    res.status(500).json({ success: false, error: 'Unable to update order.' });
  }
});

// 7. Server-Enforced Digital Download Authorization & High-Res Asset Delivery
app.get('/api/downloads/:token', async (req: Request, res: Response) => {
  try {
    const result = await handleAuthorizedDownload(req, String(req.params.token || ''));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    if (result.kind === 'binary') {
      res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${String(result.filename || 'wallpaper.jpg').replace(/"/g, '')}"`
      );
      res.status(result.status).send(result.buffer);
      return;
    }
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Download Auth Error]', err);
    res.status(500).json({ authorized: false, error: 'Unable to verify digital download authorization.' });
  }
});

// Direct Freebie Wallpaper Download (strictly enforced to genuinely free wallpapers)
app.get('/api/free-download/:productId', (req: Request, res: Response) => {
  const store = readStore();
  const { productId } = req.params;
  const prod = store.products.find(p => p.id === productId || p.slug === productId);

  if (!prod) {
    res.status(404).send('Free wallpaper not found');
    return;
  }

  if (!prod.isFree && Number(prod.price) > 0) {
    res.status(403).json({ error: 'Paid wallpapers require verified payment before downloading.' });
    return;
  }

  // Increment download count and set live download text
  prod.downloadCount = (prod.downloadCount || 0) + 1;
  prod.recentDownloadTime = 'just now';
  saveStore(store);

  const imagePath = prod.images[0];
  if (imagePath && imagePath.startsWith('/')) {
    const fullPath = path.join(__dirname, 'public', imagePath.replace(/^\/+/, ''));
    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${prod.downloadFileName.replace('.zip', '.jpg')}"`);
      res.setHeader('Content-Type', 'image/jpeg');
      fs.createReadStream(fullPath).pipe(res);
      return;
    }
  }

  res.setHeader('Content-Disposition', `attachment; filename="${prod.downloadFileName.replace('.zip', '.jpg')}"`);
  res.setHeader('Content-Type', 'text/plain');
  res.send(`=== SLEEPYSHROOM FREE DIGITAL WALLPAPER ===\n\nTitle: ${prod.title}\nThank you for downloading from sleepyshroom!\n"Little screens, sweeter dreams."`);
});

// Live Event trigger to increment product download count
app.post('/api/products/:id/download-event', (req: Request, res: Response) => {
  const store = readStore();
  const prod = store.products.find(p => p.id === req.params.id);
  if (prod) {
    prod.downloadCount = (prod.downloadCount || 0) + 1;
    prod.recentDownloadTime = 'just now';
    saveStore(store);
    res.json({ success: true, downloadCount: prod.downloadCount, recentDownloadTime: prod.recentDownloadTime });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Trigger file download stream for an item (strictly delegates to paid order verification)
app.get('/api/downloads/:token/file/:productId', async (req: Request, res: Response) => {
  try {
    const result = await handleAuthorizedDownload(
      req,
      String(req.params.token || ''),
      String(req.params.productId || '')
    );
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    if (result.kind === 'binary') {
      res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${String(result.filename || 'wallpaper.jpg').replace(/"/g, '')}"`
      );
      res.status(result.status).send(result.buffer);
      return;
    }
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[Download Stream Error]', err);
    res.status(500).json({ authorized: false, error: 'Unable to authorize file download.' });
  }
});

// 8. Contact Form & Admin Contact Messages (Supabase + Email Delivery)
app.post('/api/contact', async (req: Request, res: Response) => {
  try {
    const result = await handleContactSubmission(req);
    res.status(result.status ?? 500).json(result.body);
  } catch (err: any) {
    console.error('[Contact API Error]', err);
    res.status(500).json({
      success: false,
      savedToDatabase: false,
      error: err?.message || 'Unexpected error submitting contact form.',
    });
  }
});

app.get('/api/admin/messages', async (req: Request, res: Response) => {
  try {
    const result = await handleAdminListMessages(req);
    res.status(result.status ?? 500).json(result.body);
  } catch (err: any) {
    console.error('[Admin Messages List Error]', err);
    res.status(500).json({ success: false, error: 'Unable to load contact messages.' });
  }
});

app.patch(['/api/admin/messages/:id', '/api/admin/messages/:id/status'], async (req: Request, res: Response) => {
  try {
    const result = await handleAdminUpdateMessageStatus(req, String(req.params.id || ''));
    res.status(result.status ?? 500).json(result.body);
  } catch (err: any) {
    console.error('[Admin Message Update Error]', err);
    res.status(500).json({ success: false, error: 'Unable to update message status.' });
  }
});

app.delete('/api/admin/messages/:id', async (req: Request, res: Response) => {
  try {
    const result = await handleAdminDeleteMessage(req, String(req.params.id || ''));
    res.status(result.status ?? 500).json(result.body);
  } catch (err: any) {
    console.error('[Admin Message Delete Error]', err);
    res.status(500).json({ success: false, error: 'Unable to delete contact message.' });
  }
});

app.post('/api/admin/messages/:id/reply', async (req: Request, res: Response) => {
  try {
    const result = await handleAdminReplyMessage(req, String(req.params.id || ''));
    res.status(result.status ?? 500).json(result.body);
  } catch (err: any) {
    console.error('[Admin Message Reply Error]', err);
    res.status(500).json({
      success: false,
      emailDelivered: false,
      error: err?.message || 'Unable to send reply email.',
    });
  }
});

// 9. Admin Image Upload / Asset handler
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl) {
      res.status(400).json({ error: 'No image data provided' });
      return;
    }

    // Parse base64
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already a regular URL or path, just echo back
      res.json({ url: dataUrl });
      return;
    }

    const ext = matches[1].split('/')[1] || 'jpg';
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    const safeName = (filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '_') : 'upload') + `_${Date.now()}.${cleanExt}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    const buffer = Buffer.from(matches[2], 'base64');

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${safeName}`;

    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// 10. Customer Auth / Profiles
app.post('/api/auth/register', (req: Request, res: Response) => {
  const store = readStore();
  const { name, email } = req.body;
  if (!email || !name) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }
  let user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    res.status(400).json({ error: 'An account with this email already exists' });
    return;
  }
  user = {
    id: `usr-${Date.now()}`,
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  saveStore(store);
  res.json({ success: true, user });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const store = readStore();
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  let user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  const isOwnerEmail = email.toLowerCase() === 'shop.sleepyshroom@gmail.com';
  if (!user) {
    // Convenient auto-create or mock demo user for frictionless testing
    user = {
      id: isOwnerEmail ? 'usr-admin' : `usr-${Date.now()}`,
      name: isOwnerEmail ? 'Sleepyshroom Owner' : email.split('@')[0],
      email,
      isAdmin: isOwnerEmail,
      role: isOwnerEmail ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    saveStore(store);
  } else if (isOwnerEmail) {
    user.isAdmin = true;
    user.role = 'admin';
    saveStore(store);
  }
  res.json({ success: true, user });
});

// 11. Admin Statistics Overview
app.get('/api/admin/stats', async (req: Request, res: Response) => {
  const store = readStore();
  let ordersSource = store.orders;

  try {
    const ordersRes = await handleListOrders(req);
    if (ordersRes.status === 200 && Array.isArray(ordersRes.body)) {
      ordersSource = ordersRes.body;
    }
  } catch {
    // Fallback to local store orders cleanly
  }

  const phpRate = Number(store.settings?.paymentProviders?.phpPerUsdRate) || 58;
  const totalRevenue = ordersSource.reduce((sum, o: any) => {
    const st = String(o.paymentStatus || '').toLowerCase();
    if (st !== 'paid' && st !== 'completed') return sum;
    const isPhp = String(o.currency || 'PHP').toUpperCase() === 'PHP';
    const amtPhp = isPhp ? Number(o.total || 0) : Number(o.total || 0) * phpRate;
    return sum + amtPhp;
  }, 0);

  const paidOrdersCount = ordersSource.filter((o: any) => {
    const st = String(o.paymentStatus || '').toLowerCase();
    return st === 'paid' || st === 'completed';
  }).length;

  const publishedProducts = store.products.filter(p => p.status === 'published').length;
  const draftProducts = store.products.filter(p => p.status === 'draft').length;
  const totalCustomers = store.users.length;
  const recentOrders = ordersSource.slice(0, 5);

  let unreadMessages = 0;
  try {
    const msgRes = await handleAdminListMessages(req);
    if (msgRes.status === 200 && Array.isArray(msgRes.body?.messages)) {
      unreadMessages = msgRes.body.messages.filter(
        (m: any) => m.status === 'new' || m.status === 'unread'
      ).length;
    }
  } catch {
    unreadMessages = 0;
  }

  res.json({
    totalRevenue: Number(totalRevenue.toFixed(2)),
    revenueCurrency: 'PHP',
    totalOrders: ordersSource.length,
    paidOrdersCount,
    totalProducts: store.products.length,
    publishedProducts,
    draftProducts,
    totalCustomers,
    unreadMessages,
    recentOrders,
  });
});

// 12. OAuth Callback Relay (lightweight HTML response for popup OAuth flows inside iframe previews)
app.get(['/auth/callback', '/auth/callback/'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Signing in to sleepyshroom...</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #FFFCF7;
        color: #292929;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 24px;
        text-align: center;
      }
      .card {
        max-width: 360px;
        width: 100%;
        background: #FCF3E2;
        border: 1px solid #EADCC8;
        border-radius: 24px;
        padding: 28px 24px;
        box-sizing: border-box;
      }
      .title {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      .desc {
        font-size: 13px;
        color: #777777;
        margin: 0 0 18px;
        line-height: 1.5;
      }
      .btn {
        display: inline-block;
        background: #A64B3C;
        color: #FFFCF7;
        border: 0;
        border-radius: 12px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1 class="title">Completing your sign-in...</h1>
      <p class="desc" id="status">Returning you cleanly to sleepyshroom.</p>
      <button type="button" class="btn" onclick="window.close()">Close Window</button>
    </div>
    <script>
      (function () {
        var payload = {
          type: 'SLEEPYSHROOM_OAUTH_CALLBACK',
          search: window.location.search || '',
          hash: window.location.hash || ''
        };
        var sent = false;
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
            sent = true;
          }
        } catch (e) {}
        if (sent) {
          var statusEl = document.getElementById('status');
          if (statusEl) {
            statusEl.textContent = 'Google sign-in verified. You can close this window if it does not close automatically.';
          }
          setTimeout(function () {
            try { window.close(); } catch (e) {}
          }, 120);
        } else {
          window.location.replace('/' + (window.location.search || '') + (window.location.hash || ''));
        }
      })();
    </script>
  </body>
</html>`);
});

// 13. Public Runtime Config (exposes non-secret Supabase client config from runtime process.env/.env* to SPA)
function stripEnvQuotes(value: string | undefined): string {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeServerSupabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let clean = stripEnvQuotes(raw).replace(/\/+$/, '');
  if (!clean || clean.includes('your-project-ref') || clean.startsWith('MY_')) {
    return '';
  }
  if (!clean.includes('://') && /^[a-z0-9.-]+\.supabase\.(co|in|net)$/i.test(clean)) {
    clean = `https://${clean}`;
  }
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return clean;
    }
  } catch {
    return '';
  }
  return '';
}

function isServerSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as { role?: string };
      if (payload?.role === 'service_role') return true;
    } catch {
      // Ignore malformed payload
    }
  }
  return false;
}

function normalizeServerPublicKey(raw: string | undefined): string {
  if (!raw) return '';
  const clean = stripEnvQuotes(raw);
  if (!clean || clean.includes('your-supabase-') || clean.startsWith('MY_')) {
    return '';
  }
  if (isServerSecretKey(clean)) {
    return '';
  }
  return clean;
}

function pickFirstEnv(candidates: string[], normalizer: (raw: string | undefined) => string): string {
  for (const name of candidates) {
    const val = normalizer(process.env[name]);
    if (val) return val;
  }
  return '';
}

app.get(['/api/runtime-config', '/api/runtime-config.js'], (_req: Request, res: Response) => {
  const supabaseUrl = pickFirstEnv(
    ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
    normalizeServerSupabaseUrl
  );
  const supabaseAnonKey = pickFirstEnv(
    [
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ],
    normalizeServerPublicKey
  );
  const supabasePublishableKey = pickFirstEnv(
    [
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ],
    normalizeServerPublicKey
  );

  const payload: Record<string, string> = {};
  if (supabaseUrl) payload.VITE_SUPABASE_URL = supabaseUrl;
  if (supabaseAnonKey) payload.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;
  if (supabasePublishableKey) payload.VITE_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(`window.__SLEEPYSHROOM_ENV__ = ${JSON.stringify(payload)};`);
});

// Integrate with Vite Dev Server or Production Static Files
async function startServer() {
  const httpServer = http.createServer(app);
  const disableHmr = process.env.DISABLE_HMR === 'true';
  let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: !disableHmr,
        ...(disableHmr ? { ws: false as const } : { ws: { server: httpServer } }),
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    }).then((vite) => {
      viteServer = vite;
      return vite;
    });

    vitePromise.catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err);
      process.exit(1);
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (viteServer) {
        viteServer.middlewares(req, res, next);
        return;
      }
      vitePromise.then((vite) => vite.middlewares(req, res, next), next);
    });
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please free port ${PORT} or pass --port.`);
    } else {
      console.error('Server failed to start:', err);
    }
    process.exit(1);
  });

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    try {
      if (viteServer) {
        await viteServer.close();
      }
    } catch (err) {
      console.error(`Error closing Vite during ${signal}:`, err);
    }
    httpServer.close(() => {
      process.exit(0);
    });
    if (typeof httpServer.closeAllConnections === 'function') {
      httpServer.closeAllConnections();
    }
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await new Promise<void>((resolve) => {
    const onListening = () => {
      const displayHost = HOST && HOST !== '0.0.0.0' ? HOST : 'localhost';
      console.log(`🌙 sleepyshroom cozy server listening on http://${displayHost}:${PORT}`);
      resolve();
    };

    if (HOST) {
      httpServer.listen(PORT, HOST, onListening);
    } else {
      httpServer.listen(PORT, onListening);
    }
  });
}

startServer();

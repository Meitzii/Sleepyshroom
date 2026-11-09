import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
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
      stripeEnabled: true,
      stripePublishableKey: 'pk_test_sample_sleepyshroom',
      stripeSecretKeyConfigured: false,
      paypalEnabled: true,
      paypalClientId: 'client_id_sample',
      gcashEnabled: true,
      mayaEnabled: true,
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
  orders: [
    {
      id: 'ord-1041',
      orderNumber: 'SHROOM-1041',
      customerEmail: 'clara.woodland@example.com',
      customerName: 'Clara Woodland',
      items: [
        {
          productId: 'prod-desktop-1',
          title: 'Sleepy Garden Sanctuary Wallpaper',
          price: 4.50,
          image: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
          deviceTypes: ['desktop'],
        },
        {
          productId: 'prod-mobile-1',
          title: 'Midnight Firefly Forest Mobile & Tablet',
          price: 3.50,
          image: '/src/assets/images/theme_mobile_forest_1794020166376.jpg',
          deviceTypes: ['mobile', 'tablet'],
        }
      ],
      subtotal: 8.00,
      discount: 0.80,
      discountCode: 'COZY10',
      total: 7.20,
      paymentMethod: 'Stripe (Visa •••• 4242)',
      paymentStatus: 'completed',
      transactionId: 'txn_str_9831478234',
      downloadToken: 'tok_shroom_demo_1041',
      downloadCount: 3,
      createdAt: '2026-11-05T14:22:00.000Z',
    }
  ],
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

// Initialize or read store
function readStore(): AppStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data) as AppStore;
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

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

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
  store.settings = { ...store.settings, ...req.body };
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

app.post('/api/discounts/validate', (req: Request, res: Response) => {
  const store = readStore();
  const { code, subtotal } = req.body;
  if (!code) {
    res.status(400).json({ valid: false, message: 'Please provide a promo code' });
    return;
  }
  const match = store.discountCodes.find(d => d.code.toUpperCase() === String(code).toUpperCase().trim() && d.active);
  if (!match) {
    res.status(404).json({ valid: false, message: 'Invalid or expired code' });
    return;
  }
  if (subtotal < match.minSpend) {
    res.status(400).json({ valid: false, message: `Minimum spend of $${match.minSpend.toFixed(2)} required for this code` });
    return;
  }
  let discountAmount = 0;
  if (match.type === 'percentage') {
    discountAmount = (subtotal * match.value) / 100;
  } else {
    discountAmount = Math.min(subtotal, match.value);
  }
  res.json({
    valid: true,
    discountCode: match.code,
    type: match.type,
    value: match.value,
    discountAmount: Number(discountAmount.toFixed(2)),
    message: match.type === 'percentage' ? `${match.value}% off applied!` : `$${match.value.toFixed(2)} off applied!`,
  });
});

// 6. Checkout & Orders
app.post('/api/checkout', (req: Request, res: Response) => {
  const store = readStore();
  const { customerEmail, customerName, items, discountCode, paymentMethod } = req.body;

  if (!customerEmail || !items || !items.length) {
    res.status(400).json({ error: 'Missing required order fields' });
    return;
  }

  // Calculate real server-side subtotal
  let subtotal = 0;
  const verifiedItems: any[] = [];

  for (const item of items) {
    const prod = store.products.find(p => p.id === item.productId);
    if (prod) {
      const price = prod.price;
      subtotal += price * (item.quantity || 1);
      verifiedItems.push({
        productId: prod.id,
        title: prod.title,
        price: prod.price,
        image: prod.images[0] || '',
        deviceTypes: prod.deviceTypes,
      });
    }
  }

  let discount = 0;
  if (discountCode) {
    const disc = store.discountCodes.find(d => d.code.toUpperCase() === String(discountCode).toUpperCase().trim() && d.active);
    if (disc && subtotal >= disc.minSpend) {
      if (disc.type === 'percentage') {
        discount = (subtotal * disc.value) / 100;
      } else {
        discount = Math.min(subtotal, disc.value);
      }
    }
  }

  const total = Number((subtotal - discount).toFixed(2));
  const orderNum = `SHROOM-${1000 + store.orders.length + 1}`;
  const downloadToken = `shroom_dl_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
  const transactionId = `txn_${(paymentMethod || 'card').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber: orderNum,
    customerEmail,
    customerName: customerName || 'Valued Customer',
    items: verifiedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    discountCode: discountCode || undefined,
    total,
    paymentMethod: paymentMethod || 'Secure Card Checkout',
    paymentStatus: 'completed',
    transactionId,
    downloadToken,
    downloadCount: 0,
    createdAt: new Date().toISOString(),
  };

  store.orders.unshift(newOrder);

  // Bump download count and set live indicator for purchased items
  for (const itm of verifiedItems) {
    const prod = store.products.find(p => p.id === itm.productId);
    if (prod) {
      prod.downloadCount = (prod.downloadCount || 0) + 1;
      prod.recentDownloadTime = 'just now';
    }
  }

  // If user exists, connect order; if new guest, add to users list
  if (!store.users.some(u => u.email.toLowerCase() === customerEmail.toLowerCase())) {
    store.users.push({
      id: `usr-${Date.now()}`,
      name: customerName || 'Valued Customer',
      email: customerEmail,
      createdAt: new Date().toISOString(),
    });
  }

  saveStore(store);

  // Log confirmation notification (simulating real server mail dispatch to customer and owner)
  console.log(`[Order Confirmed] Order ${orderNum} created for ${customerEmail}. Digital token: ${downloadToken}`);

  res.json({
    success: true,
    order: newOrder,
    downloadUrl: `/downloads/${downloadToken}`,
  });
});

app.get('/api/orders', (req: Request, res: Response) => {
  const store = readStore();
  const email = req.query.email as string;
  if (email) {
    const userOrders = store.orders.filter(o => o.customerEmail.toLowerCase() === email.toLowerCase());
    res.json(userOrders);
    return;
  }
  res.json(store.orders);
});

app.get('/api/orders/:idOrToken', (req: Request, res: Response) => {
  const store = readStore();
  const param = req.params.idOrToken;
  const order = store.orders.find(o => o.id === param || o.orderNumber === param || o.downloadToken === param);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
});

// 7. Secure Digital Download Simulator & High-res asset delivery
app.get('/api/downloads/:token', (req: Request, res: Response) => {
  const store = readStore();
  const token = req.params.token;
  const order = store.orders.find(o => o.downloadToken === token);

  if (!order) {
    res.status(404).json({ error: 'Invalid or expired download link' });
    return;
  }

  // Increment download count
  order.downloadCount += 1;
  saveStore(store);

  // Return download package meta with items
  const downloadPackage = {
    orderNumber: order.orderNumber,
    purchasedAt: order.createdAt,
    customerEmail: order.customerEmail,
    items: order.items.map(item => {
      const prod = store.products.find(p => p.id === item.productId);
      return {
        ...item,
        resolutions: prod?.resolutions || ['4K UHD', 'Retina'],
        fileFormat: prod?.fileFormat || 'PNG (Lossless 300 DPI)',
        fileSize: prod?.fileSize || '25 MB',
        whatsIncluded: prod?.whatsIncluded || ['Digital Wallpaper', 'Guide'],
        downloadFileName: prod?.downloadFileName || `${item.title.toLowerCase().replace(/\s+/g, '_')}.zip`,
        directImageUrl: prod?.images[0] || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
      };
    }),
  };

  res.json(downloadPackage);
});

// Direct Freebie Wallpaper Download
app.get('/api/free-download/:productId', (req: Request, res: Response) => {
  const store = readStore();
  const { productId } = req.params;
  const prod = store.products.find(p => p.id === productId || p.slug === productId);

  if (!prod) {
    res.status(404).send('Free wallpaper not found');
    return;
  }

  // Increment download count and set live download text
  prod.downloadCount = (prod.downloadCount || 0) + 1;
  prod.recentDownloadTime = 'just now';
  saveStore(store);

  const imagePath = prod.images[0];
  if (imagePath && imagePath.startsWith('/src/assets/images/')) {
    const fullPath = path.join(__dirname, imagePath);
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

// Trigger file download stream for an item
app.get('/api/downloads/:token/file/:productId', (req: Request, res: Response) => {
  const store = readStore();
  const { token, productId } = req.params;
  const order = store.orders.find(o => o.downloadToken === token);

  if (!order) {
    res.status(404).send('Invalid download token');
    return;
  }

  const prod = store.products.find(p => p.id === productId);
  if (!prod) {
    res.status(404).send('Product not found in this package');
    return;
  }

  // Increment product download count as well
  prod.downloadCount = (prod.downloadCount || 0) + 1;
  prod.recentDownloadTime = 'just now';
  saveStore(store);

  // Stream the wallpaper image as an attachment so browser actually downloads it!
  const imagePath = prod.images[0];
  if (imagePath && imagePath.startsWith('/src/assets/images/')) {
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${prod.downloadFileName.replace('.zip', '.jpg')}"`);
      res.setHeader('Content-Type', 'image/jpeg');
      fs.createReadStream(fullPath).pipe(res);
      return;
    }
  }

  // Fallback text bundle readme
  res.setHeader('Content-Disposition', `attachment; filename="${prod.downloadFileName.replace('.zip', '_readme.txt')}"`);
  res.setHeader('Content-Type', 'text/plain');
  res.send(`=== SLEEPYSHROOM DIGITAL WALLPAPER BUNDLE ===\n\nTitle: ${prod.title}\nTheme: ${prod.theme}\nSupported Devices: ${prod.deviceTypes.join(', ')}\nResolutions: ${prod.resolutions.join(', ')}\nFile Format: ${prod.fileFormat}\n\nThank you so much for supporting sleepyshroom!\n"Little screens, sweeter dreams."`);
});

// 8. Contact Form
app.post('/api/contact', (req: Request, res: Response) => {
  const store = readStore();
  const { fullName, email, subject, message, consent } = req.body;

  if (!fullName || !email || !message) {
    res.status(400).json({ error: 'Please provide your name, email, and message.' });
    return;
  }

  if (!consent) {
    res.status(400).json({ error: 'Please agree to the privacy consent checkbox.' });
    return;
  }

  const newMsg: ContactMessage = {
    id: `msg-${Date.now()}`,
    fullName,
    email,
    subject: subject || 'General inquiry',
    message,
    consent: Boolean(consent),
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  store.messages.unshift(newMsg);
  saveStore(store);

  console.log(`[Contact Form Received] From ${fullName} (${email}): ${subject}. Forwarded to store recipient: ${store.settings.contactEmail}`);

  res.json({
    success: true,
    message: 'Thank you for your message! We will get back to you shortly.',
    id: newMsg.id,
  });
});

app.get('/api/admin/messages', (_req: Request, res: Response) => {
  const store = readStore();
  res.json(store.messages);
});

app.patch('/api/admin/messages/:id/status', (req: Request, res: Response) => {
  const store = readStore();
  const msg = store.messages.find(m => m.id === req.params.id);
  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  msg.status = req.body.status || 'read';
  saveStore(store);
  res.json({ success: true, message: msg });
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
app.get('/api/admin/stats', (_req: Request, res: Response) => {
  const store = readStore();
  const totalRevenue = store.orders.reduce((sum, o) => sum + (o.paymentStatus === 'completed' ? o.total : 0), 0);
  const totalOrders = store.orders.length;
  const publishedProducts = store.products.filter(p => p.status === 'published').length;
  const draftProducts = store.products.filter(p => p.status === 'draft').length;
  const totalCustomers = store.users.length;
  const recentOrders = store.orders.slice(0, 5);
  const unreadMessages = store.messages.filter(m => m.status === 'new').length;

  res.json({
    totalRevenue,
    totalOrders,
    totalProducts: store.products.length,
    publishedProducts,
    draftProducts,
    totalCustomers,
    unreadMessages,
    recentOrders,
  });
});

// Integrate with Vite Dev Server or Production Static Files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`🌙 sleepyshroom cozy server listening on http://localhost:${PORT}`);
  });
}

startServer();

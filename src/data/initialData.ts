import type { WebsiteSettings, CarouselSlide, Product, Collection, DiscountCode, ThemeBundle } from "../types/index.ts";

export const initialSettings: WebsiteSettings = {
  "storeName": "sleepyshroom",
  "tagline": "Little screens, sweeter dreams.",
  "contactEmail": "shop.sleepyshroom@gmail.com",
  "currency": "USD",
  "currencySymbol": "$",
  "heroHeadline": "Cozy wallpapers for your dreamy days.",
  "heroSupportingText": "Find a little happiness in every screen. Discover cozy, cute, and dreamy digital wallpapers made with love.",
  "heroPrimaryBtnText": "Explore Themes",
  "heroSecondaryBtnText": "Browse Wallpapers",
  "heroImage": "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg",
  "brandIntroHeading": "A little corner of cozy.",
  "brandIntroText": "sleepyshroom is a little digital corner for people who love soft colors, dreamy illustrations, and making their devices feel like home.",
  "showHero": true,
  "showCarousel": true,
  "showDesktopSection": true,
  "showMobileSection": true,
  "showBrandIntro": true,
  "paymentProviders": {
    "paypalEnabled": true,
    "paypalAllowCards": true,
    "testMode": false
  },
  "socialLinks": {
    "instagram": "https://instagram.com/sleepyshroom",
    "twitter": "https://twitter.com/sleepyshroom",
    "pinterest": "https://pinterest.com/sleepyshroom"
  },
  "aboutMe": {
    "heading": "Hello, welcome to my little corner!",
    "introduction": "Hi! I'm the person behind sleepyshroom. I created this little shop to share cozy, dreamy, and lovely designs that make everyday screens feel a little more special.",
    "whyStarted": "In a world that can often feel rushed and noisy, I wanted our phones, tablets, and laptops to be calming sanctuaries. Each illustration starts with quiet pencil sketches of sleeping fungi, gentle forest creatures, and soothing pastel hues that bring peaceful moments throughout your day.",
    "designInspiration": "Inspired by gentle Japanese stationery, quiet rainy mornings, fairy-tale moss gardens, and the warmth of a hot cup of tea. Every digital download is crafted with care, high pixel density, and subtle grain textures that feel like real paper.",
    "profileImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
  },
  "returnPolicy": {
    "title": "Digital Goods Return & Refund Policy",
    "lastUpdated": "November 2026",
    "content": "## 1. Digital Download Nature\nAll products available on sleepyshroom are digital downloads (PNG, HEIC, and high-resolution ZIP archives). Because digital files are delivered immediately upon order completion and cannot be returned physically, all sales are generally final.\n\n## 2. Instant Download Access\nOnce payment is completed, you receive instant download links on your confirmation screen, an email receipt with your secure download token, and permanent access inside your customer account.\n\n## 3. Duplicate Purchases\nAccidentally purchase the exact same wallpaper twice? No worries! Contact us within 14 days with your order numbers, and we will happily refund the duplicate transaction.\n\n## 4. Damaged or Corrupted Files\nIn the rare event that a downloaded file is corrupted or fails to unpack, please email us right away. We will immediately reissue fresh, verified download files or provide direct links.\n\n## 5. Device Compatibility Assistance\nIf you need help setting up your wallpaper on a specific iOS, Android, macOS, or Windows device, reach out anytime! We provide step-by-step setup guides for both Lock Screens and Home Screens.\n\n## 6. How to Contact Us\nFor any questions or assistance with your order, email us at shop.sleepyshroom@gmail.com or use our Contact Form. We typically respond within 24-48 hours."
  }
};

export const initialCarouselSlides: CarouselSlide[] = [
  {
    "id": "slide-1",
    "themeTitle": "Mushroom Dreams",
    "description": "Under a starry pastel cap, dream away the busy day in peace and warmth.",
    "imageUrl": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "linkDestination": "/collections?theme=Mushroom+Dreams",
    "exploreButtonText": "Explore Theme",
    "order": 1,
    "visible": true,
    "status": "published"
  },
  {
    "id": "slide-2",
    "themeTitle": "Sleepy Garden",
    "description": "Gentle snail friends, chamomile blooms, and morning mist in the quiet meadow.",
    "imageUrl": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "linkDestination": "/collections?theme=Sleepy+Garden",
    "exploreButtonText": "Explore Theme",
    "order": 2,
    "visible": true,
    "status": "published"
  },
  {
    "id": "slide-3",
    "themeTitle": "Cozy Autumn",
    "description": "Crisp falling golden leaves, miniature mushroom roofs, and warm acorn tea.",
    "imageUrl": "/src/assets/images/theme_cozy_autumn_1794020166366.jpg",
    "linkDestination": "/collections?theme=Cozy+Autumn",
    "exploreButtonText": "Explore Theme",
    "order": 3,
    "visible": true,
    "status": "published"
  },
  {
    "id": "slide-4",
    "themeTitle": "Little Forest",
    "description": "Soft mossy paths guided by glowing lantern fungi and resting woodland friends.",
    "imageUrl": "/src/assets/images/theme_mobile_forest_1794020166376.jpg",
    "linkDestination": "/collections?theme=Little+Forest",
    "exploreButtonText": "Explore Theme",
    "order": 4,
    "visible": true,
    "status": "published"
  },
  {
    "id": "slide-5",
    "themeTitle": "Dreamy Pastels",
    "description": "Soothing lavender gradients, hand-drawn sparkles, and soft whimsical clouds.",
    "imageUrl": "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg",
    "linkDestination": "/collections?theme=Dreamy+Pastels",
    "exploreButtonText": "Explore Theme",
    "order": 5,
    "visible": true,
    "status": "published"
  }
];

export const initialProducts: Product[] = [
  {
    "id": "prod-ghost-desktop",
    "title": "Ghost Lantern Stroll Desktop 6K",
    "slug": "ghost-lantern-stroll-desktop",
    "description": "A cozy baby ghost carrying a warm acorn lantern under a starlit canopy. High pixel density master illustration for iMac, MacBook, and Windows widescreen monitors.",
    "price": 4.5,
    "compareAtPrice": 6,
    "theme": "Little Ghost",
    "collection": "Little Ghost Whispers",
    "collectionId": "col-ghost",
    "category": "desktop",
    "productType": "wallpaper",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "6K Retina (6016 x 3384)",
      "4K UHD (3840 x 2160)",
      "Ultrawide 21:9"
    ],
    "fileFormat": "Lossless 300 DPI PNG & ZIP",
    "fileSize": "32.4 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Ultrawide 21:9 Wallpaper",
      "Display P3 Color Profile",
      "Personal License"
    ],
    "images": [
      "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 96,
    "status": "published",
    "createdAt": "2026-11-05T12:00:00.000Z",
    "downloadFileName": "sleepyshroom_ghost_lantern_desktop_6k.zip",
    "downloadCount": 342,
    "recentDownloadTime": "12m ago"
  },
  {
    "id": "prod-ghost-mobile",
    "title": "Baby Ghost Pumpkin Patch Phone & Tablet",
    "slug": "baby-ghost-pumpkin-patch-mobile",
    "description": "Adorable smiling baby ghost surrounded by miniature pumpkins and glowing moss. Specially formatted with Lock Screen clock depth headroom.",
    "price": 3.5,
    "compareAtPrice": 5,
    "theme": "Little Ghost",
    "collection": "Little Ghost Whispers",
    "collectionId": "col-ghost",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone 12–16 Pro Max (1290 x 2796)",
      "Samsung OLED",
      "iPad Pro (2048 x 2732)"
    ],
    "fileFormat": "Lossless 300 DPI PNG",
    "fileSize": "24.1 MB",
    "whatsIncluded": [
      "Phone Lock Screen Wallpaper",
      "Phone Home Screen Wallpaper",
      "Tablet Edition",
      "Setup Guide"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 94,
    "status": "published",
    "createdAt": "2026-11-05T12:00:00.000Z",
    "downloadFileName": "sleepyshroom_baby_ghost_mobile_tablet.zip",
    "downloadCount": 418,
    "recentDownloadTime": "4m ago"
  },
  {
    "id": "prod-ghost-icons",
    "title": "Ghost & Pumpkin Cozy App Icons (48 Icons)",
    "slug": "ghost-pumpkin-app-icons",
    "description": "Transform your phone and desktop home screen with 48 hand-drawn app icons featuring cozy ghosties, acorn lanterns, and pastel pumpkins.",
    "price": 4,
    "compareAtPrice": 6,
    "theme": "Little Ghost",
    "collection": "Little Ghost Whispers",
    "collectionId": "col-ghost",
    "category": "icon_pack",
    "productType": "icon_pack",
    "deviceTypes": [
      "mobile",
      "desktop",
      "tablet"
    ],
    "resolutions": [
      "512 x 512 App Icons (PNG)",
      "Mac ICNS + Windows ICO format"
    ],
    "fileFormat": "PNG, ICNS, ICO in ZIP",
    "fileSize": "18.6 MB",
    "whatsIncluded": [
      "48 Hand-drawn App Icons",
      "Matching Widget Backgrounds",
      "Easy 2-Minute Setup Video Guide"
    ],
    "images": [
      "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg"
    ],
    "featured": false,
    "isNew": true,
    "popularity": 88,
    "status": "published",
    "createdAt": "2026-11-05T12:00:00.000Z",
    "downloadFileName": "sleepyshroom_ghost_app_icons_pack.zip",
    "downloadCount": 195,
    "recentDownloadTime": "2h ago"
  },
  {
    "id": "prod-ghost-bundle",
    "title": "The Complete Little Ghost Collection Set",
    "slug": "complete-little-ghost-set",
    "description": "The all-in-one cozy ghost set: 6K Desktop Wallpapers, Phone & Tablet Lock Screens, and 48 Matching App Icons with 41% bundle savings.",
    "price": 7.99,
    "compareAtPrice": 13.5,
    "theme": "Little Ghost",
    "collection": "Little Ghost Whispers",
    "collectionId": "col-ghost",
    "category": "bundle",
    "productType": "bundle",
    "isBundle": true,
    "bundleItemCount": 3,
    "bundleProductIds": [
      "prod-ghost-desktop",
      "prod-ghost-mobile",
      "prod-ghost-icons"
    ],
    "bundleSavingsPercent": 41,
    "deviceTypes": [
      "desktop",
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "6K Desktop",
      "iPhone Retina",
      "iPad",
      "512x512 Icons"
    ],
    "fileFormat": "Lossless PNG & Master ZIP Archive",
    "fileSize": "75.1 MB",
    "whatsIncluded": [
      "6K Desktop Wallpapers",
      "Phone & Tablet Wallpapers",
      "48 App Icons Pack",
      "Personal License"
    ],
    "images": [
      "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 100,
    "status": "published",
    "createdAt": "2026-11-05T12:00:00.000Z",
    "downloadFileName": "sleepyshroom_complete_little_ghost_bundle.zip",
    "downloadCount": 521,
    "recentDownloadTime": "just now"
  },
  {
    "id": "prod-cottage-desktop",
    "title": "Mushroom Cottage Morning Mist Desktop 6K",
    "slug": "mushroom-cottage-morning-mist-desktop",
    "description": "Storybook stone chimney cottage nestled in blooming clover and wild morning mist. Peaceful sanctuary for your monitor.",
    "price": 4.5,
    "compareAtPrice": 6,
    "theme": "Cottagecore",
    "collection": "Cottagecore Haven",
    "collectionId": "col-cottagecore",
    "category": "desktop",
    "productType": "wallpaper",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "6K Retina (6016 x 3384)",
      "4K UHD",
      "Ultrawide 21:9"
    ],
    "fileFormat": "Lossless 300 DPI PNG",
    "fileSize": "34.2 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Ultrawide 21:9 Version",
      "Warm Color Profile"
    ],
    "images": [
      "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 97,
    "status": "published",
    "createdAt": "2026-11-04T10:00:00.000Z",
    "downloadFileName": "sleepyshroom_cottage_morning_mist_desktop.zip",
    "downloadCount": 388,
    "recentDownloadTime": "15m ago"
  },
  {
    "id": "prod-cottage-mobile",
    "title": "Forest Tea Party Phone & Tablet",
    "slug": "forest-tea-party-mobile",
    "description": "A steaming mug of floral tea and freshly picked wild berries in a quiet mossy grove. Calibrated for all phones and tablets.",
    "price": 3.5,
    "compareAtPrice": 5,
    "theme": "Cottagecore",
    "collection": "Cottagecore Haven",
    "collectionId": "col-cottagecore",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone 12–16 Pro Max",
      "iPad Pro",
      "Samsung Galaxy"
    ],
    "fileFormat": "Lossless PNG",
    "fileSize": "22.8 MB",
    "whatsIncluded": [
      "Phone Lock Screen",
      "Phone Home Screen (Blur)",
      "Tablet Edition"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 93,
    "status": "published",
    "createdAt": "2026-11-04T10:00:00.000Z",
    "downloadFileName": "sleepyshroom_forest_tea_party_mobile.zip",
    "downloadCount": 462,
    "recentDownloadTime": "23m ago"
  },
  {
    "id": "prod-cottage-icons",
    "title": "Cottage Wooden & Floral App Icons (56 Icons)",
    "slug": "cottage-wooden-app-icons",
    "description": "56 aesthetic cottagecore app icons including mushroom teacups, honey jars, wooden books, and chamomile blossoms.",
    "price": 4.5,
    "compareAtPrice": 6.5,
    "theme": "Cottagecore",
    "collection": "Cottagecore Haven",
    "collectionId": "col-cottagecore",
    "category": "icon_pack",
    "productType": "icon_pack",
    "deviceTypes": [
      "mobile",
      "desktop",
      "tablet"
    ],
    "resolutions": [
      "512 x 512 PNG Icons",
      "Mac ICNS + Windows ICO"
    ],
    "fileFormat": "PNG & ICO in ZIP",
    "fileSize": "21.0 MB",
    "whatsIncluded": [
      "56 App Icons",
      "12 Wallpaper Widgets",
      "Setup Instructions"
    ],
    "images": [
      "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"
    ],
    "featured": false,
    "isNew": true,
    "popularity": 89,
    "status": "published",
    "createdAt": "2026-11-04T10:00:00.000Z",
    "downloadFileName": "sleepyshroom_cottage_icons_56pack.zip",
    "downloadCount": 210,
    "recentDownloadTime": "1h ago"
  },
  {
    "id": "prod-cottage-bundle",
    "title": "The Complete Cottagecore Haven Set",
    "slug": "complete-cottagecore-haven-set",
    "description": "The complete cottagecore sanctuary: 6K Desktop Wallpaper, Phone & Tablet Lock Screens, and 56 Wooden App Icons with 39% savings.",
    "price": 8.5,
    "compareAtPrice": 14,
    "theme": "Cottagecore",
    "collection": "Cottagecore Haven",
    "collectionId": "col-cottagecore",
    "category": "bundle",
    "productType": "bundle",
    "isBundle": true,
    "bundleItemCount": 3,
    "bundleProductIds": [
      "prod-cottage-desktop",
      "prod-cottage-mobile",
      "prod-cottage-icons"
    ],
    "bundleSavingsPercent": 39,
    "deviceTypes": [
      "desktop",
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "6K Desktop",
      "iPhone Retina",
      "iPad",
      "512x512 Icons"
    ],
    "fileFormat": "Lossless PNG & Master ZIP Archive",
    "fileSize": "78.0 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Phone & Tablet Wallpapers",
      "56 App Icons Pack",
      "Personal License"
    ],
    "images": [
      "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 99,
    "status": "published",
    "createdAt": "2026-11-04T10:00:00.000Z",
    "downloadFileName": "sleepyshroom_complete_cottagecore_bundle.zip",
    "downloadCount": 489,
    "recentDownloadTime": "8m ago"
  },
  {
    "id": "prod-straw-desktop",
    "title": "Wild Strawberry Meadow Sunrise Desktop 6K",
    "slug": "wild-strawberry-meadow-sunrise-desktop",
    "description": "Gentle pastel pink morning light washing over a sweet wild strawberry patch with dew drops on fresh leaves.",
    "price": 4.5,
    "compareAtPrice": 6,
    "theme": "Strawberry",
    "collection": "Strawberry Patch Dreams",
    "collectionId": "col-strawberry",
    "category": "desktop",
    "productType": "wallpaper",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "6K Retina (6016 x 3384)",
      "4K UHD",
      "Ultrawide 21:9"
    ],
    "fileFormat": "Lossless 300 DPI PNG",
    "fileSize": "31.5 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Ultrawide Edition",
      "Color Calibrated PNG"
    ],
    "images": [
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 95,
    "status": "published",
    "createdAt": "2026-11-03T09:00:00.000Z",
    "downloadFileName": "sleepyshroom_strawberry_meadow_desktop.zip",
    "downloadCount": 312,
    "recentDownloadTime": "33m ago"
  },
  {
    "id": "prod-straw-mobile",
    "title": "Sweet Berry Field Mice Phone & Tablet",
    "slug": "sweet-berry-field-mice-mobile",
    "description": "A tiny sleepy field mouse curled up under a strawberry leaf. Soft blush tones with clear clock space.",
    "price": 3.5,
    "compareAtPrice": 5,
    "theme": "Strawberry",
    "collection": "Strawberry Patch Dreams",
    "collectionId": "col-strawberry",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone 12–16 Pro Max",
      "iPad Pro",
      "Samsung Galaxy"
    ],
    "fileFormat": "Lossless PNG",
    "fileSize": "23.0 MB",
    "whatsIncluded": [
      "Phone Lock Screen",
      "Phone Home Screen",
      "Tablet Wallpaper"
    ],
    "images": [
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 91,
    "status": "published",
    "createdAt": "2026-11-03T09:00:00.000Z",
    "downloadFileName": "sleepyshroom_sweet_berry_mobile.zip",
    "downloadCount": 379,
    "recentDownloadTime": "45m ago"
  },
  {
    "id": "prod-straw-icons",
    "title": "Strawberry Milk Pastel App Icons (48 Icons)",
    "slug": "strawberry-milk-app-icons",
    "description": "48 sweet strawberry and cream app icons with matching widgets for your aesthetic phone home screen.",
    "price": 4,
    "compareAtPrice": 6,
    "theme": "Strawberry",
    "collection": "Strawberry Patch Dreams",
    "collectionId": "col-strawberry",
    "category": "icon_pack",
    "productType": "icon_pack",
    "deviceTypes": [
      "mobile",
      "desktop",
      "tablet"
    ],
    "resolutions": [
      "512 x 512 PNG Icons",
      "Mac ICNS + Windows ICO"
    ],
    "fileFormat": "PNG in ZIP",
    "fileSize": "19.2 MB",
    "whatsIncluded": [
      "48 App Icons",
      "8 Widget Photos",
      "Installation Guide"
    ],
    "images": [
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
    ],
    "featured": false,
    "isNew": true,
    "popularity": 87,
    "status": "published",
    "createdAt": "2026-11-03T09:00:00.000Z",
    "downloadFileName": "sleepyshroom_strawberry_icons_pack.zip",
    "downloadCount": 164,
    "recentDownloadTime": "3h ago"
  },
  {
    "id": "prod-straw-bundle",
    "title": "The Complete Strawberry Patch Dreams Set",
    "slug": "complete-strawberry-patch-dreams-set",
    "description": "Full strawberry collection: 6K Desktop Wallpaper, Phone & Tablet Lock Screens, and 48 Strawberry Milk App Icons with 39% savings.",
    "price": 7.99,
    "compareAtPrice": 13,
    "theme": "Strawberry",
    "collection": "Strawberry Patch Dreams",
    "collectionId": "col-strawberry",
    "category": "bundle",
    "productType": "bundle",
    "isBundle": true,
    "bundleItemCount": 3,
    "bundleProductIds": [
      "prod-straw-desktop",
      "prod-straw-mobile",
      "prod-straw-icons"
    ],
    "bundleSavingsPercent": 39,
    "deviceTypes": [
      "desktop",
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "6K Desktop",
      "iPhone Retina",
      "iPad",
      "512x512 Icons"
    ],
    "fileFormat": "Lossless PNG & Master ZIP Archive",
    "fileSize": "73.7 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Phone & Tablet Wallpapers",
      "48 App Icons Pack",
      "Personal License"
    ],
    "images": [
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 98,
    "status": "published",
    "createdAt": "2026-11-03T09:00:00.000Z",
    "downloadFileName": "sleepyshroom_complete_strawberry_bundle.zip",
    "downloadCount": 412,
    "recentDownloadTime": "19m ago"
  },
  {
    "id": "prod-cloudy-desktop",
    "title": "Rainy Afternoon Window Raindrops Desktop 6K",
    "slug": "rainy-afternoon-window-desktop",
    "description": "Gentle raindrops on a cozy cottage pane, overlooking misty fir pines and distant foggy hills.",
    "price": 4.5,
    "compareAtPrice": 6,
    "theme": "Cloudy Day",
    "collection": "Cloudy Day Comfort",
    "collectionId": "col-cloudy-day",
    "category": "desktop",
    "productType": "wallpaper",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "6K Retina (6016 x 3384)",
      "4K UHD",
      "Ultrawide 21:9"
    ],
    "fileFormat": "Lossless 300 DPI PNG",
    "fileSize": "33.1 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Ultrawide 21:9 Edition",
      "Color Calibrated PNG"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": true,
    "isNew": false,
    "popularity": 92,
    "status": "published",
    "createdAt": "2026-10-28T14:00:00.000Z",
    "downloadFileName": "sleepyshroom_cloudy_window_desktop.zip",
    "downloadCount": 298,
    "recentDownloadTime": "55m ago"
  },
  {
    "id": "prod-cloudy-mobile",
    "title": "Drizzly Morning Chamomile Phone & Tablet",
    "slug": "drizzly-morning-chamomile-mobile",
    "description": "Rainy comfort for your pocket screen. A sleepy snail resting beneath a cozy yellow umbrella with tea.",
    "price": 3.5,
    "compareAtPrice": 5,
    "theme": "Cloudy Day",
    "collection": "Cloudy Day Comfort",
    "collectionId": "col-cloudy-day",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone 12–16 Pro Max",
      "iPad Pro",
      "Samsung Galaxy"
    ],
    "fileFormat": "Lossless PNG",
    "fileSize": "22.4 MB",
    "whatsIncluded": [
      "Phone Lock Screen",
      "Phone Home Screen",
      "Tablet Wallpaper"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": false,
    "isNew": false,
    "popularity": 90,
    "status": "published",
    "createdAt": "2026-10-28T14:00:00.000Z",
    "downloadFileName": "sleepyshroom_drizzly_chamomile_mobile.zip",
    "downloadCount": 350,
    "recentDownloadTime": "1h ago"
  },
  {
    "id": "prod-cloudy-icons",
    "title": "Raindrop & Cloud Cozy App Icons (48 Icons)",
    "slug": "raindrop-cloud-app-icons",
    "description": "48 rainy day themed pastel icons featuring little clouds, umbrellas, teacups, and gentle droplets.",
    "price": 4,
    "compareAtPrice": 6,
    "theme": "Cloudy Day",
    "collection": "Cloudy Day Comfort",
    "collectionId": "col-cloudy-day",
    "category": "icon_pack",
    "productType": "icon_pack",
    "deviceTypes": [
      "mobile",
      "desktop",
      "tablet"
    ],
    "resolutions": [
      "512 x 512 PNG Icons",
      "Mac ICNS + Windows ICO"
    ],
    "fileFormat": "PNG in ZIP",
    "fileSize": "17.8 MB",
    "whatsIncluded": [
      "48 App Icons",
      "Matching Rainy Widgets",
      "Setup Instructions"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": false,
    "isNew": false,
    "popularity": 86,
    "status": "published",
    "createdAt": "2026-10-28T14:00:00.000Z",
    "downloadFileName": "sleepyshroom_cloudy_icons_pack.zip",
    "downloadCount": 145,
    "recentDownloadTime": "4h ago"
  },
  {
    "id": "prod-cloudy-bundle",
    "title": "The Complete Cloudy Day Comfort Set",
    "slug": "complete-cloudy-day-comfort-set",
    "description": "The rainy day collection: 6K Desktop Wallpaper, Phone & Tablet Lock Screens, and 48 Cozy Raindrop Icons with 41% savings.",
    "price": 7.99,
    "compareAtPrice": 13.5,
    "theme": "Cloudy Day",
    "collection": "Cloudy Day Comfort",
    "collectionId": "col-cloudy-day",
    "category": "bundle",
    "productType": "bundle",
    "isBundle": true,
    "bundleItemCount": 3,
    "bundleProductIds": [
      "prod-cloudy-desktop",
      "prod-cloudy-mobile",
      "prod-cloudy-icons"
    ],
    "bundleSavingsPercent": 41,
    "deviceTypes": [
      "desktop",
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "6K Desktop",
      "iPhone Retina",
      "iPad",
      "512x512 Icons"
    ],
    "fileFormat": "Lossless PNG & Master ZIP Archive",
    "fileSize": "73.3 MB",
    "whatsIncluded": [
      "6K Desktop Wallpaper",
      "Phone & Tablet Wallpapers",
      "48 App Icons Pack",
      "Personal License"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": true,
    "isNew": false,
    "popularity": 97,
    "status": "published",
    "createdAt": "2026-10-28T14:00:00.000Z",
    "downloadFileName": "sleepyshroom_complete_cloudy_bundle.zip",
    "downloadCount": 395,
    "recentDownloadTime": "14m ago"
  },
  {
    "id": "prod-free-2",
    "title": "Acorn Lantern Lullaby (Freebie Wallpaper)",
    "slug": "acorn-lantern-lullaby-freebie",
    "description": "A darling free mobile and tablet wallpaper. A gentle baby mushroom curled up with a glowing acorn lantern and friendly fireflies in a quiet fairytale forest. Beautiful on iPhone & Android lock screens.",
    "price": 0,
    "compareAtPrice": 3.5,
    "isFree": true,
    "theme": "Little Forest",
    "collection": "Free Wallpapers",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone 12–16 Pro Max",
      "Samsung Galaxy / Android OLED",
      "iPad / Tablet Portrait (2048 x 2732)"
    ],
    "fileFormat": "Lossless PNG (300 DPI) with Lock Screen depth space",
    "fileSize": "12.8 MB",
    "whatsIncluded": [
      "Mobile Lock Screen Wallpaper",
      "Mobile Home Screen Wallpaper (Subtle Blur Variant)",
      "Tablet Portrait Wallpaper",
      "Personal Use License"
    ],
    "images": [
      "/src/assets/images/free_mobile_sprout_1794024694152.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 99,
    "downloadCount": 2316,
    "recentDownloadTime": "just now",
    "status": "published",
    "createdAt": "2026-11-06T18:30:00.000Z",
    "downloadFileName": "sleepyshroom_freebie_acorn_lullaby_mobile.jpg",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "collectionId": "col-freebies"
  },
  {
    "id": "prod-free-1",
    "title": "Little Clover Nap (Freebie Wallpaper)",
    "slug": "little-clover-nap-freebie",
    "description": "A sweet free gift for you! A tiny sleepy red mushroom napping peacefully under a giant clover leaf in a sunlit mossy glade. Completely free to download in crisp 4K UHD.",
    "price": 0,
    "compareAtPrice": 5,
    "isFree": true,
    "theme": "Mushroom Dreams",
    "collection": "Free Wallpapers",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "4K UHD (3840 x 2160)",
      "5K Retina (5120 x 2880)",
      "Full HD (1920 x 1080)"
    ],
    "fileFormat": "Lossless PNG (300 DPI)",
    "fileSize": "14.2 MB",
    "whatsIncluded": [
      "Full 4K Desktop Wallpaper (16:9)",
      "MacBook Retina Edition",
      "Personal Use License",
      "Cozy Setup Guide"
    ],
    "images": [
      "/src/assets/images/free_desktop_nap_1794024679756.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 100,
    "downloadCount": 2500,
    "recentDownloadTime": "just now",
    "status": "published",
    "createdAt": "2026-11-06T18:00:00.000Z",
    "downloadFileName": "sleepyshroom_freebie_clover_nap_desktop.jpg",
    "category": "desktop",
    "productType": "wallpaper",
    "collectionId": "col-freebies"
  },
  {
    "id": "prod-desktop-1",
    "title": "Sleepy Garden Sanctuary Wallpaper",
    "slug": "sleepy-garden-sanctuary",
    "description": "A soothing sanctuary for your computer screen. Features hand-drawn chamomile blooms, sleeping snail companions, gentle morning dew, and soft lavender mushrooms.",
    "price": 4.5,
    "compareAtPrice": 6,
    "theme": "Sleepy Garden",
    "collection": "Pastel Garden",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "4K UHD (3840 x 2160)",
      "5K Retina (5120 x 2880)",
      "Ultrawide (3440 x 1440)",
      "MacBook / Laptop (2560 x 1600)"
    ],
    "fileFormat": "High-res lossless PNG (300 DPI) + 16-bit color profile",
    "fileSize": "38.4 MB (ZIP archive with 4 resolution variations)",
    "whatsIncluded": [
      "4K Desktop Wallpaper (16:9)",
      "5K Ultra-Retina Wallpaper",
      "Ultrawide Desktop Variant (21:9)",
      "Organized Desktop Organizer Icon Grid Template",
      "Step-by-step Setup Guide for macOS & Windows"
    ],
    "images": [
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
      "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 98,
    "status": "published",
    "createdAt": "2026-11-01T10:00:00.000Z",
    "downloadFileName": "sleepyshroom_sleepy_garden_desktop_bundle.zip",
    "downloadCount": 948,
    "recentDownloadTime": "4m ago",
    "category": "desktop",
    "productType": "wallpaper",
    "collectionId": "col-2"
  },
  {
    "id": "prod-desktop-2",
    "title": "Cozy Autumn Cottage Wallpaper",
    "slug": "cozy-autumn-cottage",
    "description": "Warm golden sunlight filters through amber oak leaves onto a cozy thatched mushroom roof, complete with a steaming cup of herbal tea and a favorite open book.",
    "price": 4.5,
    "compareAtPrice": 5.5,
    "theme": "Cozy Autumn",
    "collection": "Autumn Cottage",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "4K UHD (3840 x 2160)",
      "5K Retina (5120 x 2880)",
      "Ultrawide (3440 x 1440)"
    ],
    "fileFormat": "Lossless PNG + HEIC + Minimalist Wallpaper Variant",
    "fileSize": "42.1 MB",
    "whatsIncluded": [
      "Full Autumn Illustration 4K",
      "Minimalist Low-Detail Variant for Clean Desktops",
      "Ultrawide 21:9 ratio",
      "Mac & Windows instructions"
    ],
    "images": [
      "/src/assets/images/theme_cozy_autumn_1794020166366.jpg",
      "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"
    ],
    "featured": true,
    "isNew": false,
    "popularity": 95,
    "status": "published",
    "createdAt": "2026-10-24T12:00:00.000Z",
    "downloadFileName": "sleepyshroom_autumn_cottage_desktop.zip",
    "downloadCount": 782,
    "recentDownloadTime": "18m ago",
    "category": "desktop",
    "productType": "wallpaper",
    "collectionId": "col-3"
  },
  {
    "id": "prod-desktop-3",
    "title": "Mushroom Dreams Slumber Desktop",
    "slug": "mushroom-dreams-slumber-desktop",
    "description": "The iconic sleepyshroom character dozing soundly beneath a lavender polka-dot cap, wrapped in a cozy purple knit scarf with fairy light sparkles all around.",
    "price": 5,
    "compareAtPrice": 6.5,
    "theme": "Mushroom Dreams",
    "collection": "Dreamy Night",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "4K UHD (3840 x 2160)",
      "5K Retina (5120 x 2880)",
      "Ultrawide (3440 x 1440)"
    ],
    "fileFormat": "High-res Lossless PNG files",
    "fileSize": "36.8 MB",
    "whatsIncluded": [
      "Main 4K Nighttime Slumber Wallpaper",
      "Soft Lavender Day Edition",
      "Ultrawide Dual Monitor Edition",
      "Desktop Folder Icons pack"
    ],
    "images": [
      "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 99,
    "status": "published",
    "createdAt": "2026-11-03T14:30:00.000Z",
    "downloadFileName": "sleepyshroom_slumber_desktop_pack.zip",
    "downloadCount": 1420,
    "recentDownloadTime": "6m ago",
    "category": "desktop",
    "productType": "wallpaper",
    "collectionId": "col-1"
  },
  {
    "id": "prod-desktop-4",
    "title": "Little Shroom Cottage Dusk Desktop",
    "slug": "little-shroom-cottage-dusk",
    "description": "Our signature mushroom cottage bathed in sweet twilight hues with a glowing lantern and blooming wildflower meadow path.",
    "price": 4,
    "theme": "Little Forest",
    "collection": "Enchanted Woodland",
    "deviceTypes": [
      "desktop"
    ],
    "resolutions": [
      "4K UHD (3840 x 2160)",
      "MacBook Retina"
    ],
    "fileFormat": "Lossless PNG",
    "fileSize": "29.5 MB",
    "whatsIncluded": [
      "4K Desktop Wallpaper",
      "Sunset Twilight Colorway",
      "Installation Guide"
    ],
    "images": [
      "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"
    ],
    "featured": false,
    "isNew": false,
    "popularity": 88,
    "status": "published",
    "createdAt": "2026-10-15T09:00:00.000Z",
    "downloadFileName": "sleepyshroom_cottage_dusk_desktop.zip",
    "downloadCount": 563,
    "recentDownloadTime": "35m ago",
    "category": "desktop",
    "productType": "wallpaper",
    "collectionId": "col-4"
  },
  {
    "id": "prod-mobile-1",
    "title": "Midnight Firefly Forest Mobile & Tablet",
    "slug": "midnight-firefly-forest-mobile",
    "description": "A magical vertical phone and tablet wallpaper capturing glowing mushroom lanterns, sparkling stars, and a little fox slumbering warmly in a mossy nook.",
    "price": 3.5,
    "compareAtPrice": 4.5,
    "theme": "Little Forest",
    "collection": "Dreamy Night",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone 12–16 Pro Max (1290 x 2796)",
      "Android OLED (1440 x 3120)",
      "iPad Pro 11\" & 12.9\" (2048 x 2732)",
      "Universal Tablet"
    ],
    "fileFormat": "PNG + HEIC (Optimized for Apple & Android Lock Screens and Home Screens)",
    "fileSize": "24.2 MB",
    "whatsIncluded": [
      "Lock Screen Wallpaper (with space for clock & widgets)",
      "Home Screen Wallpaper (gentle blur / low contrast for clean icons)",
      "iPad / Tablet Portrait & Landscape versions",
      "Matching App Icon Grids"
    ],
    "images": [
      "/src/assets/images/theme_mobile_forest_1794020166376.jpg"
    ],
    "featured": true,
    "isNew": true,
    "popularity": 97,
    "status": "published",
    "createdAt": "2026-11-04T16:00:00.000Z",
    "downloadFileName": "sleepyshroom_firefly_forest_mobile_tablet.zip",
    "downloadCount": 1890,
    "recentDownloadTime": "1m ago",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "collectionId": "col-1"
  },
  {
    "id": "prod-mobile-2",
    "title": "Sleepy Mushroom Slumber Phone Wallpaper",
    "slug": "sleepy-mushroom-slumber-phone",
    "description": "Keep the cutest sleepy mushroom companion in your pocket wherever you go. Perfectly composed so your time display and widgets sit above the cozy mushroom cap.",
    "price": 3.5,
    "compareAtPrice": 4,
    "theme": "Mushroom Dreams",
    "collection": "Dreamy Night",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone HD & Super Retina",
      "Android OLED",
      "iPad Pro"
    ],
    "fileFormat": "Lossless PNG + Apple HEIC",
    "fileSize": "21.0 MB",
    "whatsIncluded": [
      "Phone Lock Screen edition",
      "Phone Home Screen low-distraction edition",
      "Tablet Pro edition (2048 x 2732)",
      "Step-by-step lockscreen setup tips"
    ],
    "images": [
      "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg"
    ],
    "featured": true,
    "isNew": false,
    "popularity": 94,
    "status": "published",
    "createdAt": "2026-10-28T11:20:00.000Z",
    "downloadFileName": "sleepyshroom_slumber_phone_tablet.zip",
    "downloadCount": 1125,
    "recentDownloadTime": "12m ago",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "collectionId": "col-1"
  },
  {
    "id": "prod-mobile-3",
    "title": "Chamomile Meadow Snail Mobile Wallpaper",
    "slug": "chamomile-meadow-snail-mobile",
    "description": "A flower-crowned snail taking a peaceful afternoon nap amongst wild chamomile blooms and pastel lilac fungi. Calming, delicate, and gentle on the eyes.",
    "price": 3,
    "theme": "Sleepy Garden",
    "collection": "Pastel Garden",
    "deviceTypes": [
      "mobile"
    ],
    "resolutions": [
      "High-Res Phone OLED (1290 x 2796)"
    ],
    "fileFormat": "PNG format",
    "fileSize": "18.4 MB",
    "whatsIncluded": [
      "Phone Lock Screen (Clean)",
      "Phone Home Screen (Muted)",
      "Quick Wallpaper Guide"
    ],
    "images": [
      "/src/assets/images/theme_sleepy_garden_1794020165839.jpg"
    ],
    "featured": false,
    "isNew": true,
    "popularity": 91,
    "status": "published",
    "createdAt": "2026-11-02T13:45:00.000Z",
    "downloadFileName": "sleepyshroom_chamomile_snail_phone.zip",
    "downloadCount": 684,
    "recentDownloadTime": "22m ago",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "collectionId": "col-2"
  },
  {
    "id": "prod-mobile-4",
    "title": "Autumn Acorn Teatime Mobile & Tablet",
    "slug": "autumn-acorn-teatime-mobile",
    "description": "Warm cozy vibes on the go. Golden autumn leaves, steaming teacup, and little storybook mushroom hut adapted for all vertical screens.",
    "price": 3.5,
    "theme": "Cozy Autumn",
    "collection": "Autumn Cottage",
    "deviceTypes": [
      "mobile",
      "tablet"
    ],
    "resolutions": [
      "iPhone All Sizes",
      "Android All Sizes",
      "iPad / Android Tablet"
    ],
    "fileFormat": "PNG & HEIC formats",
    "fileSize": "23.8 MB",
    "whatsIncluded": [
      "Phone Lock Screen",
      "Phone Home Screen",
      "Tablet Edition",
      "Setup Instructions"
    ],
    "images": [
      "/src/assets/images/theme_cozy_autumn_1794020166366.jpg"
    ],
    "featured": false,
    "isNew": false,
    "popularity": 89,
    "status": "published",
    "createdAt": "2026-10-20T08:15:00.000Z",
    "downloadFileName": "sleepyshroom_autumn_mobile_tablet.zip",
    "downloadCount": 479,
    "recentDownloadTime": "48m ago",
    "category": "phone_tablet",
    "productType": "wallpaper",
    "collectionId": "col-3"
  }
];

export const initialCollections: Collection[] = [
  {
    "id": "col-ghost",
    "name": "Little Ghost Whispers",
    "slug": "ghost",
    "description": "Gentle baby ghosts wandering through glowing moss, smiling jack-o-lanterns, and peaceful pumpkin patches.",
    "coverImage": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "bannerImage": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "featured": true,
    "isNew": true,
    "status": "published",
    "order": 1,
    "theme": "Little Ghost",
    "productCount": 4
  },
  {
    "id": "col-cottagecore",
    "name": "Cottagecore Haven",
    "slug": "cottagecore",
    "description": "Rustic mushroom stone cottages, wildflower meadows, wooden garden bridges, and gentle tea tables in the woods.",
    "coverImage": "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg",
    "bannerImage": "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg",
    "featured": true,
    "isNew": true,
    "status": "published",
    "order": 2,
    "theme": "Cottagecore",
    "productCount": 4
  },
  {
    "id": "col-strawberry",
    "name": "Strawberry Patch Dreams",
    "slug": "strawberry",
    "description": "Ripe sun-warmed strawberries, delicate white blossoms, pastel pink hues, and sleepy bumblebees taking afternoon naps.",
    "coverImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "bannerImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "featured": true,
    "isNew": true,
    "status": "published",
    "order": 3,
    "theme": "Strawberry",
    "productCount": 4
  },
  {
    "id": "col-cloudy-day",
    "name": "Cloudy Day Comfort",
    "slug": "cloudy-day",
    "description": "Soft drizzly rain taps against the cottage window while warm cinnamon tea steams beside cozy reading corners.",
    "coverImage": "/src/assets/images/theme_mobile_forest_1794020166376.jpg",
    "bannerImage": "/src/assets/images/theme_mobile_forest_1794020166376.jpg",
    "featured": true,
    "isNew": false,
    "status": "published",
    "order": 4,
    "theme": "Cloudy Day",
    "productCount": 4
  },
  {
    "id": "col-dreamy-night",
    "name": "Dreamy Night",
    "slug": "dreamy-night",
    "description": "Starry twilight skies, glowing fungi lanterns, and quiet dreams for restful evenings.",
    "coverImage": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "bannerImage": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "featured": true,
    "isNew": false,
    "status": "published",
    "order": 5,
    "theme": "Mushroom Dreams",
    "productCount": 3
  },
  {
    "id": "col-pastel-garden",
    "name": "Pastel Garden",
    "slug": "pastel-garden",
    "description": "Soft lavender petals, chamomile blooms, and gentle sleepy garden snails.",
    "coverImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "bannerImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "featured": true,
    "isNew": false,
    "status": "published",
    "order": 6,
    "theme": "Sleepy Garden",
    "productCount": 2
  },
  {
    "id": "col-autumn-cottage",
    "name": "Autumn Cottage",
    "slug": "autumn-cottage",
    "description": "Warm golden sunlight, fallen oak leaves, steaming acorn tea, and cozy cabins.",
    "coverImage": "/src/assets/images/theme_cozy_autumn_1794020166366.jpg",
    "bannerImage": "/src/assets/images/theme_cozy_autumn_1794020166366.jpg",
    "featured": true,
    "isNew": false,
    "status": "published",
    "order": 7,
    "theme": "Cozy Autumn",
    "productCount": 2
  },
  {
    "id": "col-enchanted-woodland",
    "name": "Enchanted Woodland",
    "slug": "enchanted-woodland",
    "description": "Little mushroom abodes nestled in misty forests and tranquil woodland glens.",
    "coverImage": "/src/assets/images/theme_mobile_forest_1794020166376.jpg",
    "bannerImage": "/src/assets/images/theme_mobile_forest_1794020166376.jpg",
    "featured": true,
    "isNew": false,
    "status": "published",
    "order": 8,
    "theme": "Little Forest",
    "productCount": 1
  },
  {
    "id": "col-freebies",
    "name": "Free Wallpapers",
    "slug": "free-wallpapers",
    "description": "Complimentary hand-drawn wallpapers to bring a little cozy comfort to your screens without spending a dime.",
    "coverImage": "/src/assets/images/free_desktop_nap_1794024679756.jpg",
    "bannerImage": "/src/assets/images/free_desktop_nap_1794024679756.jpg",
    "featured": false,
    "isNew": false,
    "status": "published",
    "order": 9,
    "theme": "Freebies",
    "productCount": 2
  }
];

export const initialBundles: ThemeBundle[] = [
  {
    "id": "bundle-ghost",
    "title": "The Complete Little Ghost Collection Set",
    "slug": "complete-little-ghost-set",
    "collectionId": "col-ghost",
    "collectionSlug": "ghost",
    "collectionName": "Little Ghost Whispers",
    "description": "The all-in-one cozy ghost sanctuary. Includes 6K Ultrawide Desktop Wallpapers, Phone & Tablet Lock Screens, and 48 Matching Desktop & Mobile App Icons.",
    "previewImage": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "originalPrice": 13.5,
    "bundlePrice": 7.99,
    "savingsAmount": 5.51,
    "savingsPercent": 41,
    "productIds": [
      "prod-ghost-desktop",
      "prod-ghost-mobile",
      "prod-ghost-icons"
    ],
    "includedItems": [
      "Ghost Lantern Stroll 6K Desktop & Laptop Wallpapers (16:9, 16:10, 21:9)",
      "Baby Ghost Pumpkin Patch Phone & Tablet Lock & Home Screens",
      "48-piece Hand-illustrated Ghost & Pumpkin App Icons + Widget Art",
      "Lossless 300 DPI PNG & Uncompressed ZIP Archives",
      "Personal & Aesthetic Device Setup License"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": "bundle-cottagecore",
    "title": "The Complete Cottagecore Haven Set",
    "slug": "complete-cottagecore-haven-set",
    "collectionId": "col-cottagecore",
    "collectionSlug": "cottagecore",
    "collectionName": "Cottagecore Haven",
    "description": "Full screen sanctuary for your digital life. Includes 6K Desktop scenes, Phone & iPad calibrated wallpapers, and 56 Wooden Cottage App Icons.",
    "previewImage": "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg",
    "originalPrice": 14,
    "bundlePrice": 8.5,
    "savingsAmount": 5.5,
    "savingsPercent": 39,
    "productIds": [
      "prod-cottage-desktop",
      "prod-cottage-mobile",
      "prod-cottage-icons"
    ],
    "includedItems": [
      "Mushroom Cottage Morning Mist 6K Ultrawide Desktop Wallpaper",
      "Forest Tea Party Phone & iPad Retina Lock Screen Wallpapers",
      "56 Handcrafted Wooden & Floral App Icons (iOS & Android compatible)",
      "Matching Mac & Windows Folder Customization Icons",
      "Personal Lifetime Display License"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": "bundle-strawberry",
    "title": "The Complete Strawberry Patch Dreams Set",
    "slug": "complete-strawberry-patch-dreams-set",
    "collectionId": "col-strawberry",
    "collectionSlug": "strawberry",
    "collectionName": "Strawberry Patch Dreams",
    "description": "Sweet berry bliss across all devices. Includes 6K Desktop editions, Phone & Tablet lock screens, and 48 Strawberry Milk custom app icons.",
    "previewImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "originalPrice": 13,
    "bundlePrice": 7.99,
    "savingsAmount": 5.01,
    "savingsPercent": 39,
    "productIds": [
      "prod-straw-desktop",
      "prod-straw-mobile",
      "prod-straw-icons"
    ],
    "includedItems": [
      "Wild Strawberry Meadow Sunrise 6K Desktop Wallpaper",
      "Sweet Berry Field Mice Phone & Tablet Wallpaper Duo",
      "48-piece Pastel Strawberry Milk App Icons & Widget Accents",
      "Lossless 300 DPI Original Master Files",
      "Lifetime Re-download Access"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": "bundle-cloudy-day",
    "title": "The Complete Cloudy Day Comfort Set",
    "slug": "complete-cloudy-day-comfort-set",
    "collectionId": "col-cloudy-day",
    "collectionSlug": "cloudy-day",
    "collectionName": "Cloudy Day Comfort",
    "description": "The ultimate rainy day haven. Includes 6K Desktop window raindrops, soothing phone & tablet lock screens, and 48 Cozy Raindrop App Icons.",
    "previewImage": "/src/assets/images/theme_mobile_forest_1794020166376.jpg",
    "originalPrice": 13.5,
    "bundlePrice": 7.99,
    "savingsAmount": 5.51,
    "savingsPercent": 41,
    "productIds": [
      "prod-cloudy-desktop",
      "prod-cloudy-mobile",
      "prod-cloudy-icons"
    ],
    "includedItems": [
      "Rainy Afternoon Window 6K Desktop & Laptop Wallpaper",
      "Drizzly Morning Chamomile Phone & iPad Lock Screen",
      "48 Raindrop, Cloud & Hot Cocoa App Icons",
      "Lossless 300 DPI PNG & ZIP Archives",
      "Personal Use License"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": "bundle-dreamy-night",
    "title": "The Complete Dreamy Night Set",
    "slug": "complete-dreamy-night-set",
    "collectionId": "col-dreamy-night",
    "collectionSlug": "dreamy-night",
    "collectionName": "Dreamy Night",
    "description": "Starry twilight forest wallpapers for desktop, phone, and tablet paired with glowing fungi app icons.",
    "previewImage": "/src/assets/images/theme_mushroom_dreams_1794020165115.jpg",
    "originalPrice": 12,
    "bundlePrice": 7.5,
    "savingsAmount": 4.5,
    "savingsPercent": 38,
    "productIds": [
      "prod-1",
      "prod-2",
      "prod-3"
    ],
    "includedItems": [
      "Dreamy Night Mushroom Cap 6K Desktop Wallpaper",
      "Starry Spore Sleep Phone & Tablet Wallpaper",
      "Glowing Night Fungi Desktop & Mobile Icons",
      "Personal Lifetime Display License"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": "bundle-pastel-garden",
    "title": "The Complete Pastel Garden Set",
    "slug": "complete-pastel-garden-set",
    "collectionId": "col-pastel-garden",
    "collectionSlug": "pastel-garden",
    "collectionName": "Pastel Garden",
    "description": "Calming chamomile meadows, sleepy snails, and lavender field art across all screens with matching icons.",
    "previewImage": "/src/assets/images/theme_sleepy_garden_1794020165839.jpg",
    "originalPrice": 12.5,
    "bundlePrice": 7.5,
    "savingsAmount": 5,
    "savingsPercent": 40,
    "productIds": [
      "prod-4",
      "prod-5"
    ],
    "includedItems": [
      "Sleepy Snail Chamomile 6K Desktop Wallpaper",
      "Lavender Slumber Phone & iPad Wallpaper",
      "Garden Botanicals Aesthetic App Icons Pack",
      "Lossless 300 DPI PNG Files"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  {
    "id": "bundle-autumn-cottage",
    "title": "The Complete Autumn Cottage Set",
    "slug": "complete-autumn-cottage-set",
    "collectionId": "col-autumn-cottage",
    "collectionSlug": "autumn-cottage",
    "collectionName": "Autumn Cottage",
    "description": "Warm golden leaves, steaming acorn teatime, and cozy cabins across all your devices.",
    "previewImage": "/src/assets/images/theme_cozy_autumn_1794020166366.jpg",
    "originalPrice": 12,
    "bundlePrice": 7.5,
    "savingsAmount": 4.5,
    "savingsPercent": 38,
    "productIds": [
      "prod-6",
      "prod-7"
    ],
    "includedItems": [
      "Autumn Oak Leaves 6K Desktop Wallpaper",
      "Acorn Teatime Phone & Tablet Wallpaper",
      "Golden Forest Custom Icon Pack",
      "Personal Use License"
    ],
    "status": "published",
    "featured": true,
    "createdAt": "2026-11-01T10:00:00.000Z"
  }
];

export const initialDiscountCodes: DiscountCode[] = [
  {
    "code": "COZY10",
    "type": "percentage",
    "value": 10,
    "minSpend": 0,
    "active": true
  },
  {
    "code": "SHROOMFAM",
    "type": "percentage",
    "value": 20,
    "minSpend": 10,
    "active": true
  },
  {
    "code": "SWEETDREAMS",
    "type": "fixed",
    "value": 2,
    "minSpend": 8,
    "active": true
  }
];

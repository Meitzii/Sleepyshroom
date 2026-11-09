# 🎨 Sleepyshroom — How to Change Your Wallpaper Displays

This guide shows you exactly where to change the wallpaper preview images and downloadable files in your codebase or through the visual admin dashboard.

---

## 📍 Quick Overview: Where Are The Files?

| What you want to change | Location in Project |
| :--- | :--- |
| **Active Live Store Wallpapers** (Titles, Prices, Images) | `/data/store.json` (search for `"products"`) |
| **Wallpaper Image Files** (JPG / PNG assets) | `/src/assets/images/` |
| **Default Fallback Catalog** (in code) | `/server.ts` (search for `🎨 [WALLPAPER DISPLAY CONFIGURATION]`) |
| **Visual Admin Dashboard** (No coding needed) | Click **Admin** in the header or visit `/admin` in your browser |

---

## 🛠️ Method 1: Change Wallpapers in Code (`/data/store.json`)

The live website reads its active catalog from **`/data/store.json`**.

Open `/data/store.json` and scroll to `"products": [ ... ]`.

Each wallpaper has a block like this:

```json
{
  "id": "prod-desktop-1",
  "title": "Sleepy Garden Sanctuary Wallpaper",
  "slug": "sleepy-garden-sanctuary",
  "description": "A soothing sanctuary for your computer screen...",
  "price": 4.5,
  "compareAtPrice": 6.0,
  "theme": "Sleepy Garden",
  "collection": "Pastel Garden",
  "deviceTypes": [
    "desktop"
  ],
  "resolutions": [
    "4K UHD (3840 x 2160)",
    "5K Retina (5120 x 2880)"
  ],

  /* 👇 1. THIS IS THE PREVIEW IMAGE DISPLAYED ON CARDS & PRODUCT PAGES */
  "images": [
    "/src/assets/images/your_new_wallpaper.jpg"
  ],

  /* 👇 2. THIS IS THE FILE ATTACHMENT DELIVERED WHEN DOWNLOADED OR PURCHASED */
  "downloadFileName": "sleepyshroom_sleepy_garden_desktop_bundle.zip",

  /* 👇 3. SET TO true FOR FREEBIE WALLPAPERS ($0.00) */
  "isFree": false,

  /* 👇 4. SOCIAL PROOF DOWNLOAD COUNT SHOWN ON THE CARD */
  "downloadCount": 1842
}
```

### Steps to swap an image:
1. Place your new image file inside `/src/assets/images/` (e.g. `/src/assets/images/my_cute_shroom.jpg`).
2. Open `/data/store.json`.
3. Locate the wallpaper you want to update.
4. Replace `"images": [ "/src/assets/images/..." ]` with your new image path:
   ```json
   "images": [
     "/src/assets/images/my_cute_shroom.jpg"
   ]
   ```
5. Save the file. The website instantly updates!

---

## 🖼️ Method 2: Where the UI Displays the Image

If you want to modify how the image is rendered or styled in the React code:

- **Product Card Preview Grid (Homepage & Collections)**:
  File: `/src/components/common/ProductCard.tsx`
  Search for the comment banner:
  `{/* 🖼️ [WALLPAPER DISPLAY IMAGE] */}`
  Line 50 renders: `<img src={product.images[0]} alt={product.title} ... />`

- **Single Wallpaper Detail Page (Device Frames Preview)**:
  File: `/src/pages/ProductDetailPage.tsx`
  Search for the comment banner:
  `{/* 🖼️ [PRODUCT DETAIL WALLPAPER PREVIEW] */}`
  Line 140 renders the active wallpaper preview inside desktop, tablet, and mobile device frames.

- **Hero Banner Image**:
  Stored in `/data/store.json` under `"heroImage"`:
  `"heroImage": "/src/assets/images/hero_mushroom_cottage_1794020164209.jpg"`

- **Explore Themes Carousel Slides**:
  Stored in `/data/store.json` under `"carouselSlides"`:
  Each slide has an `"imageUrl"` property.

---

## 🖱️ Method 3: Change Wallpapers visually (No Coding Needed!)

You don't even have to edit code files if you don't want to:

1. Open the Admin Dashboard by navigating to `/#admin` in your browser URL (or sign in to your Account with `sleepyshroom@gmail.com`). Public visitors cannot see the Admin button.
2. Go to the **Products Catalog** tab.
3. Click **Edit** on any wallpaper.
4. You will see:
   - **Image URL / Preview**: Paste your image URL or choose a file.
   - **Title & Description**: Change the name and story.
   - **Price & Freebie Toggle**: Check the box to make it a $0 Free Gift.
   - **Downloads / Sales Count**: Customize the social proof number.
5. Click **Save Product**. Your changes take effect immediately on the live storefront!

import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSupabaseServerConfig,
  readJsonBody,
  extractBearerToken,
  verifyAdminRequest,
} from './contact-service.js';
import {
  getRootDir,
  isCollectionCurrentlyActive,
  isServerlessReadOnlyEnv,
  loadRuntimeCatalog,
  readLocalStoreRaw,
  writeLocalStoreRaw,
} from './shop-data.js';
import { fetchSupabaseSettings, mergeWithDefaultSettings } from './settings-service.js';

const STORAGE_BUCKET = 'storefront-assets';

function resolveMimeAndExt(mimeType, originalName = '') {
  const mimeLower = String(mimeType || '').toLowerCase();
  const extFromName = path.extname(String(originalName || '')).toLowerCase();

  if (mimeLower.includes('png')) return { mime: 'image/png', ext: 'png', isImage: true };
  if (mimeLower.includes('webp')) return { mime: 'image/webp', ext: 'webp', isImage: true };
  if (mimeLower.includes('gif')) return { mime: 'image/gif', ext: 'gif', isImage: true };
  if (mimeLower.includes('svg')) return { mime: 'image/svg+xml', ext: 'svg', isImage: true };
  if (mimeLower.includes('jpeg') || mimeLower.includes('jpg')) {
    return { mime: 'image/jpeg', ext: 'jpg', isImage: true };
  }
  if (mimeLower.includes('zip')) {
    return { mime: 'application/zip', ext: 'zip', isImage: false };
  }
  if (extFromName === '.png') return { mime: 'image/png', ext: 'png', isImage: true };
  if (extFromName === '.webp') return { mime: 'image/webp', ext: 'webp', isImage: true };
  if (extFromName === '.gif') return { mime: 'image/gif', ext: 'gif', isImage: true };
  if (extFromName === '.zip') return { mime: 'application/zip', ext: 'zip', isImage: false };
  return { mime: mimeLower || 'image/jpeg', ext: 'jpg', isImage: true };
}

async function ensureSupabasePublicBucket(cfg) {
  if (!cfg.configured || !cfg.serviceRoleKey) return false;
  try {
    const checkRes = await fetch(`${cfg.supabaseUrl}/storage/v1/bucket/${STORAGE_BUCKET}`, {
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
      },
    });
    if (checkRes.ok) return true;

    const createRes = await fetch(`${cfg.supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: STORAGE_BUCKET,
        name: STORAGE_BUCKET,
        public: true,
        file_size_limit: 26214400, // 25 MB
      }),
    });
    return createRes.ok || createRes.status === 409;
  } catch {
    return false;
  }
}

async function uploadBufferToSupabaseStorage(cfg, { buffer, objectPath, contentType }) {
  if (!cfg.configured || !cfg.serviceRoleKey) {
    return { ok: false, reason: 'no_service_role_key' };
  }
  try {
    const ready = await ensureSupabasePublicBucket(cfg);
    if (!ready) return { ok: false, reason: 'bucket_unavailable' };

    const encodedPath = objectPath
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    const uploadRes = await fetch(
      `${cfg.supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${encodedPath}`,
      {
        method: 'POST',
        headers: {
          apikey: cfg.serviceRoleKey,
          Authorization: `Bearer ${cfg.serviceRoleKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
          'cache-control': '31536000',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      return { ok: false, reason: `storage_http_${uploadRes.status}` };
    }

    const publicUrl = `${cfg.supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${encodedPath}`;
    return { ok: true, url: publicUrl };
  } catch (err) {
    return { ok: false, reason: err?.message || 'storage_upload_failed' };
  }
}

async function checkAdminWhenSupabaseConfigured(req) {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) {
    return { ok: true, cfg };
  }
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return {
      ok: false,
      status: auth.status || 403,
      error: auth.error || 'Administrator privileges required.',
    };
  }
  return auth;
}

export async function handleUploadAsset(req) {
  const admin = await checkAdminWhenSupabaseConfigured(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }

  const body = await readJsonBody(req);
  const rawDataUrl = String(body?.dataUrl || '').trim();
  const rawFilename = String(body?.filename || 'upload').trim();
  const folder = String(body?.folder || 'images')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40) || 'images';

  if (!rawDataUrl) {
    return { status: 400, body: { success: false, error: 'No image or file data provided.' } };
  }

  // Passthrough existing HTTP(S) URLs or local public paths cleanly
  if (!rawDataUrl.startsWith('data:')) {
    return { status: 200, body: { success: true, url: rawDataUrl } };
  }

  const matches = rawDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { status: 400, body: { success: false, error: 'Invalid base64 upload format.' } };
  }

  const { mime, ext, isImage } = resolveMimeAndExt(matches[1], rawFilename);
  const buffer = Buffer.from(matches[2], 'base64');

  if (buffer.length > 15 * 1024 * 1024) {
    return {
      status: 413,
      body: {
        success: false,
        error: 'File is larger than 15 MB. Please upload an optimized image or smaller archive.',
      },
    };
  }

  const baseName = path
    .basename(rawFilename, path.extname(rawFilename))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'upload';
  const safeName = `${baseName}_${Date.now()}.${ext}`;
  const objectPath = `${folder}/${safeName}`;

  const cfg = admin.cfg || resolveSupabaseServerConfig();

  // Prefer permanent Supabase Storage URL when service role key is configured (works on both Vercel & local)
  if (cfg.configured && cfg.serviceRoleKey) {
    const supaUpload = await uploadBufferToSupabaseStorage(cfg, {
      buffer,
      objectPath,
      contentType: mime,
    });
    if (supaUpload.ok && supaUpload.url) {
      return {
        status: 200,
        body: {
          success: true,
          url: supaUpload.url,
          filename: safeName,
          size: buffer.length,
          storage: 'supabase',
        },
      };
    }
  }

  // Local non-serverless Express mode: write directly into /public/uploads/
  if (!isServerlessReadOnlyEnv()) {
    const uploadsDir = path.join(getRootDir(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);
    return {
      status: 200,
      body: {
        success: true,
        url: `/uploads/${safeName}`,
        filename: safeName,
        size: buffer.length,
        storage: 'local',
      },
    };
  }

  // Serverless fallback when Supabase Storage bucket/service key isn't configured yet:
  // Accept compressed inline image data URLs up to 1.8 MB so uploads never block on Vercel.
  if (isImage && rawDataUrl.length <= 2_400_000) {
    return {
      status: 200,
      body: {
        success: true,
        url: rawDataUrl,
        filename: safeName,
        size: buffer.length,
        storage: 'inline',
      },
    };
  }

  return {
    status: 413,
    body: {
      success: false,
      error:
        'Large raw files require SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables for Storage bucket uploads, or use a smaller compressed image (< 1.8 MB).',
    },
  };
}

export async function fetchSupabaseCatalogSnapshot() {
  const cfg = resolveSupabaseServerConfig();
  if (!cfg.configured) return null;
  const key = cfg.serviceRoleKey || cfg.anonKey;
  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/site_settings?id=eq.catalog&select=settings_json,updated_at&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row && row.settings_json && typeof row.settings_json === 'object') {
      return {
        ...row.settings_json,
        updatedAt: row.settings_json.updatedAt || row.updated_at || null,
      };
    }
  } catch {
    // Non-blocking fallback to store.json
  }
  return null;
}

async function upsertSupabaseCatalogSnapshot(snapshot, authOverride = null) {
  const cfg = authOverride?.cfg || resolveSupabaseServerConfig();
  if (!cfg.configured) return { saved: false, skipped: true };

  const apiKey = authOverride?.restApiKey || cfg.serviceRoleKey || cfg.anonKey;
  const authToken = authOverride?.restAuthToken || cfg.serviceRoleKey || cfg.anonKey;

  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/site_settings?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: 'catalog',
        settings_json: snapshot,
        updated_at: new Date().toISOString(),
      }),
    });

    if (res.ok) return { saved: true };
    const errPayload = await res.json().catch(() => null);
    return {
      saved: false,
      statusCode: res.status || 502,
      error: errPayload?.message || errPayload?.error || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      saved: false,
      statusCode: 502,
      error: err?.message || 'Unable to sync catalog changes to Supabase.',
    };
  }
}

export async function getEffectiveCatalogState() {
  const localRaw = readLocalStoreRaw() || {};
  const runtime = loadRuntimeCatalog();
  const supaCatalog = await fetchSupabaseCatalogSnapshot();

  const localUpdatedMs = localRaw.catalogUpdatedAt ? new Date(localRaw.catalogUpdatedAt).getTime() : 0;
  const supaUpdatedMs = supaCatalog?.updatedAt ? new Date(supaCatalog.updatedAt).getTime() : 0;

  const preferSupa =
    Boolean(supaCatalog) &&
    (isServerlessReadOnlyEnv() || supaUpdatedMs > localUpdatedMs);

  const carouselSlides =
    preferSupa && Array.isArray(supaCatalog?.carouselSlides)
      ? supaCatalog.carouselSlides
      : Array.isArray(localRaw.carouselSlides)
        ? localRaw.carouselSlides
        : [];

  const products =
    preferSupa && Array.isArray(supaCatalog?.products)
      ? supaCatalog.products
      : runtime.products;

  const collections =
    preferSupa && Array.isArray(supaCatalog?.collections)
      ? supaCatalog.collections
      : runtime.collections;

  const bundles =
    preferSupa && Array.isArray(supaCatalog?.bundles)
      ? supaCatalog.bundles
      : runtime.bundles;

  return {
    localRaw,
    carouselSlides,
    products,
    collections,
    bundles,
    orders: runtime.orders || [],
    users: Array.isArray(localRaw.users) ? localRaw.users : [],
    supaConfigured: resolveSupabaseServerConfig().configured,
  };
}

async function persistCatalogMutation(req, mutator) {
  const admin = await checkAdminWhenSupabaseConfigured(req);
  if (!admin.ok) {
    return { ok: false, status: admin.status, error: admin.error };
  }

  const state = await getEffectiveCatalogState();
  const nextState = {
    carouselSlides: [...state.carouselSlides],
    products: [...state.products],
    collections: [...state.collections],
    bundles: [...state.bundles],
  };

  const result = mutator(nextState);
  if (result && result.error) {
    return { ok: false, status: result.status || 400, error: result.error };
  }

  const nowIso = new Date().toISOString();

  // Save locally when running in writable dev/Node server
  let localSaved = false;
  if (!isServerlessReadOnlyEnv()) {
    const raw = readLocalStoreRaw() || {};
    raw.carouselSlides = nextState.carouselSlides;
    raw.products = nextState.products;
    raw.collections = nextState.collections;
    raw.bundles = nextState.bundles;
    raw.catalogUpdatedAt = nowIso;
    localSaved = writeLocalStoreRaw(raw);
  }

  // Persist to Supabase site_settings (id = 'catalog') when configured
  const bearer = extractBearerToken(req);
  const cfg = admin.cfg || resolveSupabaseServerConfig();
  const supaResult = await upsertSupabaseCatalogSnapshot(
    {
      carouselSlides: nextState.carouselSlides,
      products: nextState.products,
      collections: nextState.collections,
      bundles: nextState.bundles,
      updatedAt: nowIso,
    },
    cfg.configured
      ? {
          cfg,
          restApiKey: cfg.serviceRoleKey || cfg.anonKey,
          restAuthToken: cfg.serviceRoleKey || bearer || cfg.anonKey,
        }
      : null
  );

  if (cfg.configured && !supaResult.saved && !supaResult.skipped && (isServerlessReadOnlyEnv() || !localSaved)) {
    return {
      ok: false,
      status: supaResult.statusCode || 503,
      error: supaResult.error || 'Could not persist changes to Supabase.',
    };
  }

  return {
    ok: true,
    nextState,
    result,
    persistedToSupabase: Boolean(supaResult.saved),
  };
}

function getQueryParam(req, name) {
  if (req.query && req.query[name] !== undefined) {
    return String(Array.isArray(req.query[name]) ? req.query[name][0] : req.query[name]);
  }
  try {
    const u = new URL(req.url || '/', 'http://localhost');
    return u.searchParams.get(name) || '';
  } catch {
    return '';
  }
}

export async function handleGetPublicContentAndCatalog() {
  const state = await getEffectiveCatalogState();
  const supaSettings = await fetchSupabaseSettings();
  const settings = mergeWithDefaultSettings(supaSettings, state.localRaw?.settings);
  const slides = state.carouselSlides
    .filter((s) => s && s.status === 'published' && s.visible !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  return {
    status: 200,
    body: {
      settings,
      carouselSlides: slides,
    },
  };
}

export async function handleGetAdminContentAndCatalog(req) {
  const admin = await checkAdminWhenSupabaseConfigured(req);
  if (!admin.ok) {
    return { status: admin.status, body: { success: false, error: admin.error } };
  }
  const state = await getEffectiveCatalogState();
  const supaSettings = await fetchSupabaseSettings();
  const settings = mergeWithDefaultSettings(supaSettings, state.localRaw?.settings);
  const slides = [...state.carouselSlides].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  return {
    status: 200,
    body: {
      settings,
      carouselSlides: slides,
    },
  };
}

export async function handleGetSlides() {
  const state = await getEffectiveCatalogState();
  return { status: 200, body: state.carouselSlides };
}

export async function handleAdminSaveSlides(req) {
  const body = await readJsonBody(req);
  if (!Array.isArray(body)) {
    return { status: 400, body: { success: false, error: 'Expected array of slides' } };
  }

  const saved = await persistCatalogMutation(req, (nextState) => {
    nextState.carouselSlides = body;
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, slides: saved.nextState.carouselSlides } };
}

export async function handleAdminCreateSlide(req) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      themeTitle: body.themeTitle || 'New Theme',
      description: body.description || 'Description of this cozy wallpaper collection.',
      imageUrl: body.imageUrl || '',
      linkDestination: body.linkDestination || '/collections',
      exploreButtonText: body.exploreButtonText || 'Explore Theme',
      order: nextState.carouselSlides.length + 1,
      visible: body.visible ?? true,
      status: body.status || 'published',
    };
    nextState.carouselSlides.push(newSlide);
    return { slide: newSlide };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, slide: saved.result.slide } };
}

export async function handleAdminDeleteSlide(req, id) {
  const saved = await persistCatalogMutation(req, (nextState) => {
    nextState.carouselSlides = nextState.carouselSlides
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
  });
  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true } };
}

export async function handleGetProducts(req) {
  const state = await getEffectiveCatalogState();
  const device = getQueryParam(req, 'device');
  const theme = getQueryParam(req, 'theme');
  const collection = getQueryParam(req, 'collection');
  const search = getQueryParam(req, 'search');
  const sort = getQueryParam(req, 'sort');
  const includeDrafts = getQueryParam(req, 'includeDrafts');

  let list = state.products;
  if (includeDrafts !== 'true') {
    list = list.filter((p) => p.status === 'published');
  }
  if (device && device !== 'all') {
    list = list.filter((p) => Array.isArray(p.deviceTypes) && p.deviceTypes.includes(device));
  }
  if (theme && theme !== 'all') {
    list = list.filter((p) => String(p.theme || '').toLowerCase() === theme.toLowerCase());
  }
  if (collection && collection !== 'all') {
    list = list.filter((p) => String(p.collection || '').toLowerCase() === collection.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        String(p.title || '').toLowerCase().includes(q) ||
        String(p.description || '').toLowerCase().includes(q) ||
        String(p.theme || '').toLowerCase().includes(q) ||
        String(p.collection || '').toLowerCase().includes(q)
    );
  }

  if (sort === 'price-low') {
    list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sort === 'price-high') {
    list = [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sort === 'popular') {
    list = [...list].sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
  } else {
    list = [...list].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  return { status: 200, body: list };
}

export async function handleGetProductByIdOrSlug(idOrSlug) {
  const state = await getEffectiveCatalogState();
  const prod = state.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  if (!prod) return { status: 404, body: { error: 'Product not found' } };
  return { status: 200, body: prod };
}

export async function handleAdminCreateProduct(req) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const cleanImages = Array.isArray(body.images)
      ? body.images.map((s) => String(s || '').trim()).filter(Boolean)
      : [];

    const newProduct = {
      id: body.id && !nextState.products.some((p) => p.id === body.id) ? body.id : `prod-${Date.now()}`,
      title: body.title || 'Untitled Wallpaper',
      slug:
        (body.slug || body.title || 'untitled')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `wallpaper-${Date.now()}`,
      description: body.description || '',
      price: body.isFree ? 0 : Number(body.price ?? 3.5),
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
      theme: body.theme || 'Mushroom Dreams',
      collection: body.collection || 'Dreamy Night',
      collectionId: body.collectionId || undefined,
      category: body.category || 'desktop',
      productType: body.productType || 'wallpaper',
      deviceTypes: Array.isArray(body.deviceTypes) && body.deviceTypes.length > 0 ? body.deviceTypes : ['desktop'],
      resolutions: Array.isArray(body.resolutions) && body.resolutions.length > 0 ? body.resolutions : ['4K UHD (3840 x 2160)'],
      fileFormat: body.fileFormat || 'High-res lossless PNG (300 DPI)',
      fileSize: body.fileSize || '25.0 MB',
      whatsIncluded: Array.isArray(body.whatsIncluded) && body.whatsIncluded.length > 0 ? body.whatsIncluded : ['High-resolution digital wallpaper', 'Setup guide'],
      images: cleanImages.length > 0 ? cleanImages : ['/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'],
      featured: Boolean(body.featured),
      isNew: true,
      popularity: 90,
      status: body.status || 'published',
      createdAt: new Date().toISOString(),
      downloadFileName:
        body.downloadFileName ||
        `${String(body.title || 'wallpaper').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`,
      downloadUrl: body.downloadUrl ? String(body.downloadUrl).trim() : undefined,
      isFree: Boolean(body.isFree || Number(body.price) === 0),
      downloadCount: Number(body.downloadCount) || 120,
      recentDownloadTime: body.recentDownloadTime || 'just now',
    };
    nextState.products.unshift(newProduct);
    return { product: newProduct };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, product: saved.result.product } };
}

export async function handleAdminUpdateProduct(req, id) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const idx = nextState.products.findIndex((p) => p.id === id);
    if (idx === -1) {
      return { status: 404, error: 'Product not found' };
    }
    const cleanImages = Array.isArray(body.images)
      ? body.images.map((s) => String(s || '').trim()).filter(Boolean)
      : nextState.products[idx].images;
    const updated = {
      ...nextState.products[idx],
      ...body,
      images: cleanImages && cleanImages.length > 0 ? cleanImages : nextState.products[idx].images,
    };
    if (updated.isFree) {
      updated.price = 0;
    }
    if (body.downloadCount !== undefined) {
      updated.downloadCount = Number(body.downloadCount);
    }
    nextState.products[idx] = updated;
    return { product: updated };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, product: saved.result.product } };
}

export async function handleAdminDeleteProduct(req, id) {
  const saved = await persistCatalogMutation(req, (nextState) => {
    nextState.products = nextState.products.filter((p) => p.id !== id);
  });
  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true } };
}

export async function handleGetCollections(req) {
  const state = await getEffectiveCatalogState();
  const includeAll = getQueryParam(req, 'includeAll').toLowerCase() === 'true';
  const baseList = includeAll
    ? state.collections
    : state.collections.filter((c) => isCollectionCurrentlyActive(c));

  const list = baseList.map((c) => {
    const count = state.products.filter(
      (p) =>
        (p.collectionId === c.id ||
          String(p.collection || '').toLowerCase() === String(c.name || '').toLowerCase() ||
          String(p.theme || '').toLowerCase() === String(c.name || '').toLowerCase()) &&
        p.status === 'published'
    ).length;
    return { ...c, productCount: count };
  });

  return { status: 200, body: list };
}

export async function handleGetCollectionBySlugOrId(req, slugOrId) {
  const state = await getEffectiveCatalogState();
  const rawParam = String(slugOrId || '').trim();
  const lowerParam = rawParam.toLowerCase();
  const includeInactive = getQueryParam(req, 'includeInactive').toLowerCase() === 'true';

  const collection = state.collections.find(
    (c) =>
      String(c.slug || '').toLowerCase() === lowerParam ||
      String(c.id || '').toLowerCase() === lowerParam ||
      String(c.name || '').toLowerCase() === lowerParam
  );

  if (!collection) {
    return { status: 404, body: { error: 'Collection not found' } };
  }

  const currentlyActive = isCollectionCurrentlyActive(collection);
  if (!includeInactive && !currentlyActive) {
    return {
      status: 410,
      body: {
        error: 'This limited theme collection is no longer active.',
        expired: true,
        collection: {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          isLimitedEdition: collection.isLimitedEdition,
          startDate: collection.startDate || null,
          endDate: collection.endDate || null,
        },
      },
    };
  }

  const matchingProducts = state.products.filter(
    (p) =>
      (p.collectionId === collection.id ||
        String(p.collection || '').toLowerCase() === String(collection.name || '').toLowerCase() ||
        String(p.theme || '').toLowerCase() === String(collection.name || '').toLowerCase()) &&
      p.status === 'published'
  );

  const matchingBundles = (state.bundles || []).filter(
    (b) =>
      (b.collectionId === collection.id || b.collectionSlug === collection.slug) &&
      (b.status === undefined || b.status === 'published')
  );

  const relatedCollections = state.collections
    .filter((c) => c.id !== collection.id && isCollectionCurrentlyActive(c))
    .slice(0, 4)
    .map((c) => {
      const count = state.products.filter(
        (p) =>
          (p.collectionId === c.id ||
            String(p.collection || '').toLowerCase() === String(c.name || '').toLowerCase() ||
            String(p.theme || '').toLowerCase() === String(c.name || '').toLowerCase()) &&
          p.status === 'published'
      ).length;
      return { ...c, productCount: count };
    });

  return {
    status: 200,
    body: {
      collection: {
        ...collection,
        productCount: matchingProducts.length,
      },
      products: matchingProducts,
      bundles: matchingBundles,
      relatedCollections,
    },
  };
}

export async function handleAdminCreateCollection(req) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const newCol = {
      id: `col-${Date.now()}`,
      name: body.name || 'New Collection',
      slug: (body.slug || body.name || 'new')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      description: body.description || '',
      coverImage: body.coverImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
      bannerImage: body.bannerImage || body.coverImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg',
      featured: Boolean(body.featured),
      isNew: Boolean(body.isNew),
      isLimitedEdition: Boolean(body.isLimitedEdition),
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      status: body.status || 'published',
      order: nextState.collections.length + 1,
      productCount: 0,
      theme: body.theme || body.name,
      createdAt: new Date().toISOString(),
    };
    nextState.collections.push(newCol);
    return { collection: newCol };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, collection: saved.result.collection } };
}

export async function handleAdminUpdateCollection(req, id) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const idx = nextState.collections.findIndex((c) => c.id === id);
    if (idx === -1) return { status: 404, error: 'Collection not found' };
    nextState.collections[idx] = { ...nextState.collections[idx], ...body };
    return { collection: nextState.collections[idx] };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, collection: saved.result.collection } };
}

export async function handleAdminDeleteCollection(req, id) {
  const saved = await persistCatalogMutation(req, (nextState) => {
    nextState.collections = nextState.collections.filter((c) => c.id !== id);
  });
  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true } };
}

export async function handleGetBundles() {
  const state = await getEffectiveCatalogState();
  const list = (state.bundles || []).filter((b) => b.status === undefined || b.status === 'published');
  return { status: 200, body: list };
}

export async function handleGetBundleByIdOrSlug(slugOrId) {
  const state = await getEffectiveCatalogState();
  const param = String(slugOrId || '').toLowerCase().trim();
  const bundle = (state.bundles || []).find(
    (b) => String(b.slug || '').toLowerCase() === param || String(b.id || '').toLowerCase() === param
  );
  if (!bundle) return { status: 404, body: { error: 'Bundle not found' } };
  return { status: 200, body: bundle };
}

export async function handleAdminCreateBundle(req) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const productIds = Array.isArray(body.productIds)
      ? body.productIds
      : Array.isArray(body.includedProductIds)
        ? body.includedProductIds
        : [];
    const includedItems = Array.isArray(body.includedItems)
      ? body.includedItems
      : Array.isArray(body.includedItemsSummary)
        ? body.includedItemsSummary
        : [];
    const previewImage =
      body.previewImage || body.coverImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg';
    const originalPrice = Number(body.originalPrice) || 0;
    const bundlePrice = Number(body.bundlePrice) || 0;
    const savingsAmount = originalPrice > bundlePrice ? Number((originalPrice - bundlePrice).toFixed(2)) : 0;
    const savingsPercent = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;
    const linkedCollection = nextState.collections.find(
      (c) => c.id === body.collectionId || c.slug === body.collectionSlug
    );

    const newBundle = {
      id: `bundle-${Date.now()}`,
      title: body.title || 'New Theme Bundle',
      slug: (body.slug || body.title || 'new-bundle')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      collectionId: body.collectionId || linkedCollection?.id || '',
      collectionSlug: body.collectionSlug || linkedCollection?.slug || '',
      collectionName: body.collectionName || linkedCollection?.name || 'Theme Bundles',
      description: body.description || '',
      previewImage,
      originalPrice,
      bundlePrice,
      savingsAmount,
      savingsPercent,
      productIds,
      includedItems,
      status: body.status || 'published',
      featured: body.featured !== false,
      createdAt: new Date().toISOString(),
    };

    const bundleProduct = {
      id: `prod-bundle-${newBundle.id}`,
      title: newBundle.title,
      slug: newBundle.slug,
      description: newBundle.description,
      price: newBundle.bundlePrice,
      compareAtPrice: newBundle.originalPrice || undefined,
      theme: linkedCollection?.name || newBundle.collectionName,
      collection: newBundle.collectionName,
      collectionId: newBundle.collectionId,
      category: 'bundle',
      productType: 'bundle',
      isBundle: true,
      bundleItemCount: newBundle.productIds.length,
      bundleProductIds: newBundle.productIds,
      bundleSavingsPercent: newBundle.savingsPercent,
      deviceTypes: ['desktop', 'mobile', 'tablet'],
      resolutions: ['4K Desktop', 'Retina Mobile', 'High-Res Tablet', 'ZIP Archive'],
      fileFormat: 'All formats included (ZIP containing PNG & HEIC)',
      fileSize: '45.0 MB',
      whatsIncluded:
        newBundle.includedItems.length > 0
          ? newBundle.includedItems
          : ['Complete Theme Set', 'All Resolutions', 'Personal Use License'],
      images: [newBundle.previewImage],
      featured: Boolean(newBundle.featured),
      isNew: true,
      status: newBundle.status,
      downloadFileName: `${newBundle.slug}_complete_bundle.zip`,
      popularity: 95,
      createdAt: new Date().toISOString(),
    };
    nextState.products.push(bundleProduct);
    nextState.bundles.push(newBundle);
    return { bundle: newBundle, product: bundleProduct };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return {
    status: 200,
    body: { success: true, bundle: saved.result.bundle, product: saved.result.product },
  };
}

export async function handleAdminUpdateBundle(req, id) {
  const body = await readJsonBody(req);
  const saved = await persistCatalogMutation(req, (nextState) => {
    const idx = nextState.bundles.findIndex((b) => b.id === id);
    if (idx === -1) return { status: 404, error: 'Bundle not found' };
    const existing = nextState.bundles[idx];
    const updated = {
      ...existing,
      ...body,
      previewImage: body.previewImage || body.coverImage || existing.previewImage,
      productIds: Array.isArray(body.productIds)
        ? body.productIds
        : Array.isArray(body.includedProductIds)
          ? body.includedProductIds
          : existing.productIds,
      includedItems: Array.isArray(body.includedItems)
        ? body.includedItems
        : Array.isArray(body.includedItemsSummary)
          ? body.includedItemsSummary
          : existing.includedItems,
    };
    if (updated.originalPrice && updated.bundlePrice) {
      const orig = Number(updated.originalPrice);
      const bun = Number(updated.bundlePrice);
      updated.savingsAmount = orig > bun ? Number((orig - bun).toFixed(2)) : 0;
      updated.savingsPercent = orig > 0 ? Math.round((updated.savingsAmount / orig) * 100) : 0;
    }
    nextState.bundles[idx] = updated;

    const prodIdx = nextState.products.findIndex(
      (p) => p.id === `prod-bundle-${updated.id}` || p.slug === updated.slug
    );
    if (prodIdx >= 0) {
      nextState.products[prodIdx].title = updated.title;
      nextState.products[prodIdx].price = updated.bundlePrice;
      nextState.products[prodIdx].compareAtPrice = updated.originalPrice || undefined;
      nextState.products[prodIdx].description = updated.description;
      nextState.products[prodIdx].bundleSavingsPercent = updated.savingsPercent;
      nextState.products[prodIdx].bundleItemCount = updated.productIds?.length || 0;
      nextState.products[prodIdx].bundleProductIds = updated.productIds || [];
      nextState.products[prodIdx].whatsIncluded = updated.includedItems || nextState.products[prodIdx].whatsIncluded;
      nextState.products[prodIdx].status = updated.status;
      if (updated.previewImage) nextState.products[prodIdx].images = [updated.previewImage];
    }
    return { bundle: updated };
  });

  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true, bundle: saved.result.bundle } };
}

export async function handleAdminDeleteBundle(req, id) {
  const saved = await persistCatalogMutation(req, (nextState) => {
    const target = nextState.bundles.find((b) => b.id === id);
    nextState.bundles = nextState.bundles.filter((b) => b.id !== id);
    if (target) {
      nextState.products = nextState.products.filter(
        (p) => p.id !== `prod-bundle-${target.id}` && p.slug !== target.slug
      );
    }
  });
  if (!saved.ok) {
    return { status: saved.status, body: { success: false, error: saved.error } };
  }
  return { status: 200, body: { success: true } };
}

export async function resolveBinaryAssetFromPath(req, assetPath, fallbackFilename) {
  const target = String(assetPath || '').trim();
  if (!target) return null;

  const ensureFilename = (mime) => {
    const lowerName = String(fallbackFilename || 'sleepyshroom_wallpaper.png').toLowerCase();
    if (/\.(png|jpg|jpeg|webp|gif|zip)$/i.test(lowerName)) return fallbackFilename;
    if (mime.includes('png')) return `${fallbackFilename}.png`;
    if (mime.includes('webp')) return `${fallbackFilename}.webp`;
    if (mime.includes('zip')) return `${fallbackFilename}.zip`;
    return `${fallbackFilename}.jpg`;
  };

  // 1. Inline data URL
  if (target.startsWith('data:')) {
    const matches = target.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1];
      return {
        contentType: mime,
        filename: ensureFilename(mime),
        buffer: Buffer.from(matches[2], 'base64'),
      };
    }
  }

  // 2. Local filesystem (checks public/ first, then workspace src/ fallback)
  if (target.startsWith('/')) {
    const decodedRel = decodeURIComponent(target).replace(/^\/+/, '');
    const rootDir = getRootDir();
    const candidates = [
      path.resolve(rootDir, 'public', decodedRel),
      path.resolve(rootDir, decodedRel),
    ];

    for (const candidate of candidates) {
      if (
        (candidate.startsWith(path.resolve(rootDir, 'public')) ||
          candidate.startsWith(path.resolve(rootDir, 'src'))) &&
        fs.existsSync(candidate) &&
        fs.statSync(candidate).isFile()
      ) {
        const ext = path.extname(candidate).toLowerCase();
        const mime =
          ext === '.png'
            ? 'image/png'
            : ext === '.webp'
              ? 'image/webp'
              : ext === '.zip'
                ? 'application/zip'
                : 'image/jpeg';
        return {
          contentType: mime,
          filename: ensureFilename(mime),
          buffer: fs.readFileSync(candidate),
        };
      }
    }

    // Fetch from deployed static host origin (Vercel /assets or /src/assets/images)
    try {
      const proto = String(req.headers?.['x-forwarded-proto'] || 'http').split(',')[0].trim();
      const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
      if (host) {
        const assetRes = await fetch(`${proto}://${host}${encodeURI(decodeURIComponent(target))}`);
        if (assetRes.ok) {
          const mime = assetRes.headers.get('content-type') || 'image/jpeg';
          return {
            contentType: mime,
            filename: ensureFilename(mime),
            buffer: Buffer.from(await assetRes.arrayBuffer()),
          };
        }
      }
    } catch {
      // Ignore network fetch error
    }
  }

  // 3. Remote HTTPS asset (e.g. Supabase Storage URL)
  if (/^https?:\/\//i.test(target)) {
    try {
      const assetRes = await fetch(target);
      if (assetRes.ok) {
        const mime = assetRes.headers.get('content-type') || 'image/jpeg';
        return {
          contentType: mime,
          filename: ensureFilename(mime),
          buffer: Buffer.from(await assetRes.arrayBuffer()),
        };
      }
    } catch {
      // Ignore remote fetch error
    }
  }

  return null;
}

export async function handleFreeDownload(req, productId) {
  const state = await getEffectiveCatalogState();
  const prod = state.products.find((p) => p.id === productId || p.slug === productId);
  if (!prod) {
    return { kind: 'json', status: 404, body: { error: 'Free wallpaper not found' } };
  }
  if (!prod.isFree && Number(prod.price) > 0) {
    return {
      kind: 'json',
      status: 403,
      body: { error: 'Paid wallpapers require verified payment before downloading.' },
    };
  }

  // Increment count locally if writable
  if (!isServerlessReadOnlyEnv()) {
    const raw = readLocalStoreRaw();
    if (raw && Array.isArray(raw.products)) {
      const targetProd = raw.products.find((p) => p.id === prod.id);
      if (targetProd) {
        targetProd.downloadCount = (targetProd.downloadCount || 0) + 1;
        targetProd.recentDownloadTime = 'just now';
        writeLocalStoreRaw(raw);
      }
    }
  }

  const assetSource = prod.downloadUrl || prod.images?.[0] || '';
  const fallbackName = prod.downloadFileName || `${prod.slug || prod.id}.jpg`;
  const binary = await resolveBinaryAssetFromPath(req, assetSource, fallbackName);

  if (binary) {
    return {
      kind: 'binary',
      status: 200,
      contentType: binary.contentType,
      filename: binary.filename,
      buffer: binary.buffer,
    };
  }

  return {
    kind: 'binary',
    status: 200,
    contentType: 'text/plain; charset=utf-8',
    filename: fallbackName.replace(/\.(jpg|png|zip)$/i, '_readme.txt'),
    buffer: Buffer.from(
      `=== SLEEPYSHROOM FREE DIGITAL WALLPAPER ===\n\nTitle: ${prod.title}\nThank you for downloading from sleepyshroom!\n"Little screens, sweeter dreams."`,
      'utf-8'
    ),
  };
}

export async function handleAdminGetStats(req) {
  const state = await getEffectiveCatalogState();
  let ordersSource = state.orders;

  try {
    const { handleListOrders } = await import('./checkout-service.js');
    const ordersRes = await handleListOrders(req);
    if (ordersRes.status === 200 && Array.isArray(ordersRes.body)) {
      ordersSource = ordersRes.body;
    }
  } catch {
    // Fallback cleanly
  }

  const totalRevenue = ordersSource.reduce((sum, o) => {
    const st = String(o.paymentStatus || '').toLowerCase();
    if (st !== 'paid' && st !== 'completed') return sum;
    const isPhp = String(o.currency || 'USD').toUpperCase() === 'PHP';
    const amtUsd = isPhp ? Number(o.total || 0) / 56.5 : Number(o.total || 0);
    return sum + amtUsd;
  }, 0);

  const paidOrdersCount = ordersSource.filter((o) => {
    const st = String(o.paymentStatus || '').toLowerCase();
    return st === 'paid' || st === 'completed';
  }).length;

  const publishedProducts = state.products.filter((p) => p.status === 'published').length;
  const draftProducts = state.products.filter((p) => p.status === 'draft').length;
  const totalCustomers = state.users.length;
  const recentOrders = ordersSource.slice(0, 5);

  let unreadMessages = 0;
  try {
    const { handleAdminListMessages } = await import('./contact-service.js');
    const msgRes = await handleAdminListMessages(req);
    if (msgRes.status === 200 && Array.isArray(msgRes.body?.messages)) {
      unreadMessages = msgRes.body.messages.filter(
        (m) => m.status === 'new' || m.status === 'unread'
      ).length;
    }
  } catch {
    unreadMessages = 0;
  }

  return {
    status: 200,
    body: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueCurrency: 'USD',
      totalOrders: ordersSource.length,
      paidOrdersCount,
      totalProducts: state.products.length,
      publishedProducts,
      draftProducts,
      totalCustomers,
      unreadMessages,
      recentOrders,
    },
  };
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  Layers,
  Plus,
  Edit3,
  Trash2,
  Clock,
  Sparkles,
  Check,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { Collection, Product, ThemeBundle } from '../../types/index.ts';
import { parseJsonResponse } from '../../utils/apiClient.ts';

interface CollectionsBundlesAdminPanelProps {
  collections: Collection[];
  allProducts: Product[];
  getToken: () => Promise<string | null>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
  onRefresh: () => Promise<void> | void;
}

const DEFAULT_FALLBACK_IMAGE = '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg';

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function getCollectionActiveState(col: Collection): { label: string; isActive: boolean; isExpired: boolean } {
  const now = Date.now();
  if (col.status && col.status !== 'published') {
    return { label: col.status, isActive: false, isExpired: false };
  }
  if (col.startDate) {
    const s = new Date(col.startDate).getTime();
    if (!Number.isNaN(s) && now < s) {
      return { label: 'Scheduled', isActive: false, isExpired: false };
    }
  }
  if (col.endDate) {
    const e = new Date(col.endDate).getTime();
    if (!Number.isNaN(e) && now > e) {
      return { label: 'Expired', isActive: false, isExpired: true };
    }
  }
  return { label: col.isLimitedEdition ? 'Active Limited' : 'Published', isActive: true, isExpired: false };
}

export const CollectionsBundlesAdminPanel: React.FC<CollectionsBundlesAdminPanelProps> = ({
  collections: initialCollections,
  allProducts,
  getToken,
  onNotify,
  onError,
  onRefresh,
}) => {
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [bundles, setBundles] = useState<ThemeBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Collection Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [colForm, setColForm] = useState({
    name: '',
    slug: '',
    description: '',
    coverImage: DEFAULT_FALLBACK_IMAGE,
    bannerImage: DEFAULT_FALLBACK_IMAGE,
    featured: false,
    isNew: false,
    isLimitedEdition: false,
    startDate: '',
    endDate: '',
    status: 'published' as 'published' | 'draft' | 'archived',
  });

  // Bundle Modal State
  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleForm, setBundleForm] = useState({
    title: '',
    slug: '',
    collectionId: '',
    description: '',
    previewImage: DEFAULT_FALLBACK_IMAGE,
    originalPrice: 12,
    bundlePrice: 8.5,
    productIds: [] as string[],
    includedItemsText: '',
    featured: true,
    status: 'published' as 'published' | 'draft',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [colRes, bunRes] = await Promise.all([
        fetch('/api/collections?includeAll=true'),
        fetch('/api/bundles'),
      ]);
      const [colParsed, bunParsed] = await Promise.all([
        parseJsonResponse<Collection[]>(colRes),
        parseJsonResponse<ThemeBundle[]>(bunRes),
      ]);
      if (colParsed.ok && colParsed.isJson && Array.isArray(colParsed.data)) {
        setCollections(colParsed.data);
      }
      if (bunParsed.ok && bunParsed.isJson && Array.isArray(bunParsed.data)) {
        setBundles(bunParsed.data);
      }
    } catch (err: any) {
      onError(err?.message || 'Unable to load collections & bundles.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openNewCollection = () => {
    setEditingCollectionId(null);
    setColForm({
      name: '',
      slug: '',
      description: '',
      coverImage: DEFAULT_FALLBACK_IMAGE,
      bannerImage: DEFAULT_FALLBACK_IMAGE,
      featured: false,
      isNew: true,
      isLimitedEdition: false,
      startDate: '',
      endDate: '',
      status: 'published',
    });
    setCollectionModalOpen(true);
  };

  const openEditCollection = (c: Collection) => {
    setEditingCollectionId(c.id);
    setColForm({
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      coverImage: c.coverImage || DEFAULT_FALLBACK_IMAGE,
      bannerImage: c.bannerImage || c.coverImage || DEFAULT_FALLBACK_IMAGE,
      featured: Boolean(c.featured),
      isNew: Boolean(c.isNew),
      isLimitedEdition: Boolean(c.isLimitedEdition),
      startDate: toLocalDateTimeInput(c.startDate),
      endDate: toLocalDateTimeInput(c.endDate),
      status: (c.status as 'published' | 'draft' | 'archived') || 'published',
    });
    setCollectionModalOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.name.trim()) {
      onError('Collection name is required.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        name: colForm.name.trim(),
        slug: (colForm.slug || colForm.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: colForm.description.trim(),
        coverImage: colForm.coverImage.trim() || DEFAULT_FALLBACK_IMAGE,
        bannerImage: colForm.bannerImage.trim() || colForm.coverImage.trim() || DEFAULT_FALLBACK_IMAGE,
        featured: colForm.featured,
        isNew: colForm.isNew,
        isLimitedEdition: colForm.isLimitedEdition,
        startDate: colForm.startDate ? new Date(colForm.startDate).toISOString() : null,
        endDate: colForm.endDate ? new Date(colForm.endDate).toISOString() : null,
        status: colForm.status,
      };

      const url = editingCollectionId
        ? `/api/admin/collections/${encodeURIComponent(editingCollectionId)}`
        : '/api/admin/collections';
      const res = await fetch(url, {
        method: editingCollectionId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const parsed = await parseJsonResponse<{ success?: boolean; error?: string }>(res);
      if (!parsed.ok || parsed.data?.success === false) {
        onError(parsed.data?.error || 'Could not save collection.');
        return;
      }

      setCollectionModalOpen(false);
      onNotify(`Collection "${payload.name}" saved.`);
      await loadData();
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Error saving collection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (c: Collection) => {
    if (!confirm(`Delete theme collection "${c.name}"?`)) return;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/admin/collections/${encodeURIComponent(c.id)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        onError('Could not delete collection.');
        return;
      }
      onNotify(`Deleted collection "${c.name}".`);
      await loadData();
      await onRefresh();
    } catch {
      onError('Error deleting collection.');
    }
  };

  const openNewBundle = () => {
    setEditingBundleId(null);
    const firstColId = collections[0]?.id || '';
    setBundleForm({
      title: '',
      slug: '',
      collectionId: firstColId,
      description: '',
      previewImage: DEFAULT_FALLBACK_IMAGE,
      originalPrice: 12,
      bundlePrice: 8.5,
      productIds: [],
      includedItemsText: 'All 4K Desktop & Mobile Wallpapers\nMatching Icon Packs\nLifetime Re-download Access',
      featured: true,
      status: 'published',
    });
    setBundleModalOpen(true);
  };

  const openEditBundle = (b: ThemeBundle) => {
    setEditingBundleId(b.id);
    setBundleForm({
      title: b.title || '',
      slug: b.slug || '',
      collectionId: b.collectionId || '',
      description: b.description || '',
      previewImage: b.previewImage || DEFAULT_FALLBACK_IMAGE,
      originalPrice: Number(b.originalPrice || 0),
      bundlePrice: Number(b.bundlePrice || 0),
      productIds: Array.isArray(b.productIds) ? b.productIds : [],
      includedItemsText: Array.isArray(b.includedItems) ? b.includedItems.join('\n') : '',
      featured: b.featured !== false,
      status: b.status === 'draft' ? 'draft' : 'published',
    });
    setBundleModalOpen(true);
  };

  const toggleBundleProduct = (productId: string) => {
    setBundleForm(prev => {
      const exists = prev.productIds.includes(productId);
      const nextIds = exists
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId];
      const computedOriginal = nextIds.reduce((sum, id) => {
        const prod = allProducts.find(p => p.id === id);
        return sum + Number(prod?.price || 0);
      }, 0);
      return {
        ...prev,
        productIds: nextIds,
        originalPrice: computedOriginal > 0 ? Number(computedOriginal.toFixed(2)) : prev.originalPrice,
      };
    });
  };

  const handleSaveBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundleForm.title.trim()) {
      onError('Bundle title is required.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const matchedCol = collections.find(c => c.id === bundleForm.collectionId);
      const includedItems = bundleForm.includedItemsText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

      const payload = {
        title: bundleForm.title.trim(),
        slug: (bundleForm.slug || bundleForm.title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        collectionId: bundleForm.collectionId,
        collectionSlug: matchedCol?.slug || '',
        collectionName: matchedCol?.name || 'Theme Bundles',
        description: bundleForm.description.trim(),
        previewImage: bundleForm.previewImage.trim() || DEFAULT_FALLBACK_IMAGE,
        originalPrice: Number(bundleForm.originalPrice) || 0,
        bundlePrice: Number(bundleForm.bundlePrice) || 0,
        productIds: bundleForm.productIds,
        includedItems,
        featured: bundleForm.featured,
        status: bundleForm.status,
      };

      const url = editingBundleId
        ? `/api/admin/bundles/${encodeURIComponent(editingBundleId)}`
        : '/api/admin/bundles';
      const res = await fetch(url, {
        method: editingBundleId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const parsed = await parseJsonResponse<{ success?: boolean; error?: string }>(res);
      if (!parsed.ok || parsed.data?.success === false) {
        onError(parsed.data?.error || 'Could not save bundle.');
        return;
      }

      setBundleModalOpen(false);
      onNotify(`Bundle "${payload.title}" saved and synced with storefront catalog.`);
      await loadData();
      await onRefresh();
    } catch (err: any) {
      onError(err?.message || 'Error saving bundle.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBundle = async (b: ThemeBundle) => {
    if (!confirm(`Delete bundle "${b.title}"? This also removes its linked catalog bundle entry.`)) return;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/admin/bundles/${encodeURIComponent(b.id)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        onError('Could not delete bundle.');
        return;
      }
      onNotify(`Deleted bundle "${b.title}".`);
      await loadData();
      await onRefresh();
    } catch {
      onError('Error deleting bundle.');
    }
  };

  const calcSavingsAmount =
    bundleForm.originalPrice > bundleForm.bundlePrice
      ? Number((bundleForm.originalPrice - bundleForm.bundlePrice).toFixed(2))
      : 0;
  const calcSavingsPercent =
    bundleForm.originalPrice > 0
      ? Math.round((calcSavingsAmount / bundleForm.originalPrice) * 100)
      : 0;

  const nonBundleProducts = allProducts.filter(p => !p.isBundle);

  return (
    <div className="space-y-8">
      {/* SECTION A: THEME COLLECTIONS */}
      <div className="space-y-4">
        <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#A64B3C]" />
              <span>Theme Collections &amp; Limited Releases ({collections.length})</span>
            </h2>
            <p className="text-xs text-[#33222C] mt-0.5">
              Create theme landing pages (<code className="font-mono">/collections/:slug</code>), set NEW/Featured badges, or schedule limited-edition start &amp; end dates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="px-3.5 py-2 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={openNewCollection}
              className="px-4 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Collection</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collections.map(c => {
            const state = getCollectionActiveState(c);
            return (
              <div
                key={c.id}
                className="bg-[#F9F6F0] p-4 rounded-2xl border border-[#E8C9C1] flex flex-col sm:flex-row gap-4 justify-between"
              >
                <div className="flex gap-3.5 min-w-0">
                  <img
                    src={c.coverImage}
                    alt={c.name}
                    className="w-20 h-20 rounded-xl object-cover border border-[#D5C2BB] shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-heading font-bold text-sm text-[#1E1419] truncate">{c.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          state.isActive
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : state.isExpired
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {state.label}
                      </span>
                      {c.featured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A64B3C]/10 text-[#A64B3C] border border-[#A64B3C]/20">
                          Featured
                        </span>
                      )}
                      {c.isNew && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#777777]">/collections/{c.slug}</p>
                    <p className="text-xs text-[#33222C] line-clamp-2">{c.description}</p>
                    {(c.startDate || c.endDate) && (
                      <p className="text-[11px] text-[#777777] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#A64B3C]" />
                        <span>
                          {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'Now'} –{' '}
                          {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Ongoing'}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditCollection(c)}
                    className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#A64B3C]" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCollection(c)}
                    className="p-1.5 text-[#777777] hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                    title="Delete collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION B: THEME BUNDLES */}
      <div className="space-y-4">
        <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#A64B3C]" />
              <span>Theme Bundles &amp; Savings Sets ({bundles.length})</span>
            </h2>
            <p className="text-xs text-[#33222C] mt-0.5">
              Group matching wallpapers and icon packs into discounted bundles. Child downloads unlock automatically upon verified PayPal purchase.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewBundle}
            className="px-4 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bundle</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map(b => (
            <div
              key={b.id}
              className="bg-[#F9F6F0] p-4 rounded-2xl border border-[#E8C9C1] flex flex-col sm:flex-row gap-4 justify-between"
            >
              <div className="flex gap-3.5 min-w-0">
                <img
                  src={b.previewImage}
                  alt={b.title}
                  className="w-20 h-20 rounded-xl object-cover border border-[#D5C2BB] shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-heading font-bold text-sm text-[#1E1419] truncate">{b.title}</h3>
                    {b.savingsPercent > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Save {b.savingsPercent}%
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        b.status === 'draft'
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-[#A64B3C]/10 text-[#A64B3C] border border-[#A64B3C]/20'
                      }`}
                    >
                      {b.status || 'published'}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#777777]">
                    {b.collectionName} · {b.productIds?.length || 0} linked products
                  </p>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-extrabold text-[#A64B3C] tabular-nums">
                      ${Number(b.bundlePrice || 0).toFixed(2)}
                    </span>
                    {Number(b.originalPrice || 0) > Number(b.bundlePrice || 0) && (
                      <span className="line-through text-[#777777] tabular-nums">
                        ${Number(b.originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditBundle(b)}
                  className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteBundle(b)}
                  className="p-1.5 text-[#777777] hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                  title="Delete bundle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLLECTION MODAL */}
      {collectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveCollection}
            className="bg-[#F7F3E9] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E8C9C1] shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#E8C9C1]/60 pb-3">
              <h3 className="font-heading font-bold text-lg text-[#1E1419]">
                {editingCollectionId ? 'Edit Theme Collection' : 'New Theme Collection'}
              </h3>
              <button type="button" onClick={() => setCollectionModalOpen(false)} className="text-[#777777] hover:text-[#1E1419] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Collection Name *</label>
                <input
                  type="text"
                  required
                  value={colForm.name}
                  onChange={e => setColForm({ ...colForm, name: e.target.value })}
                  placeholder="e.g. Strawberry Meadow"
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">URL Slug</label>
                <input
                  type="text"
                  value={colForm.slug}
                  onChange={e => setColForm({ ...colForm, slug: e.target.value })}
                  placeholder="strawberry"
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">Charming Description</label>
              <textarea
                rows={3}
                value={colForm.description}
                onChange={e => setColForm({ ...colForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Cover Image URL / Path</label>
                <input
                  type="text"
                  value={colForm.coverImage}
                  onChange={e => setColForm({ ...colForm, coverImage: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Hero Banner Image URL / Path</label>
                <input
                  type="text"
                  value={colForm.bannerImage}
                  onChange={e => setColForm({ ...colForm, bannerImage: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Visibility Status</label>
                <select
                  value={colForm.status}
                  onChange={e => setColForm({ ...colForm, status: e.target.value as 'published' | 'draft' | 'archived' })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Limited Start Date</label>
                <input
                  type="datetime-local"
                  value={colForm.startDate}
                  onChange={e => setColForm({ ...colForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Limited End Date</label>
                <input
                  type="datetime-local"
                  value={colForm.endDate}
                  onChange={e => setColForm({ ...colForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colForm.featured}
                  onChange={e => setColForm({ ...colForm, featured: e.target.checked })}
                  className="accent-[#A64B3C]"
                />
                <span className="font-bold text-[#1E1419]">Featured Collection</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colForm.isNew}
                  onChange={e => setColForm({ ...colForm, isNew: e.target.checked })}
                  className="accent-[#A64B3C]"
                />
                <span className="font-bold text-[#1E1419]">Show NEW Badge</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colForm.isLimitedEdition}
                  onChange={e => setColForm({ ...colForm, isLimitedEdition: e.target.checked })}
                  className="accent-[#A64B3C]"
                />
                <span className="font-bold text-[#1E1419]">Limited Edition Drop</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E8C9C1]/60">
              <button
                type="button"
                onClick={() => setCollectionModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#D5C2BB] rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Collection</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BUNDLE MODAL */}
      {bundleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveBundle}
            className="bg-[#F7F3E9] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E8C9C1] shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#E8C9C1]/60 pb-3">
              <h3 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#A64B3C]" />
                <span>{editingBundleId ? 'Edit Theme Bundle' : 'Create New Theme Bundle'}</span>
              </h3>
              <button type="button" onClick={() => setBundleModalOpen(false)} className="text-[#777777] hover:text-[#1E1419] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Bundle Title *</label>
                <input
                  type="text"
                  required
                  value={bundleForm.title}
                  onChange={e => setBundleForm({ ...bundleForm, title: e.target.value })}
                  placeholder="The Complete Ghost Set"
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Collection</label>
                <select
                  value={bundleForm.collectionId}
                  onChange={e => setBundleForm({ ...bundleForm, collectionId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                >
                  <option value="">Select theme collection...</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">Description</label>
              <textarea
                rows={2}
                value={bundleForm.description}
                onChange={e => setBundleForm({ ...bundleForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Original Total ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={bundleForm.originalPrice}
                  onChange={e => setBundleForm({ ...bundleForm, originalPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Bundle Price ($) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={bundleForm.bundlePrice}
                  onChange={e => setBundleForm({ ...bundleForm, bundlePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl font-bold text-[#A64B3C]"
                />
              </div>
              <div className="p-2 bg-emerald-100/80 border border-emerald-300 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">Calculated Savings</span>
                <span className="font-extrabold text-emerald-950">
                  Save ${calcSavingsAmount.toFixed(2)} ({calcSavingsPercent}%)
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">Preview Image URL / Path</label>
              <input
                type="text"
                value={bundleForm.previewImage}
                onChange={e => setBundleForm({ ...bundleForm, previewImage: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">
                Included Products ({bundleForm.productIds.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto bg-white border border-[#E8C9C1] rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {nonBundleProducts.map(prod => (
                  <label
                    key={prod.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F9F6F0] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={bundleForm.productIds.includes(prod.id)}
                      onChange={() => toggleBundleProduct(prod.id)}
                      className="accent-[#A64B3C]"
                    />
                    <span className="truncate font-medium text-[#1E1419]">{prod.title}</span>
                    <span className="ml-auto text-[11px] font-bold text-[#A64B3C] shrink-0">
                      ${prod.price.toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">Included Summary Points (One per line)</label>
              <textarea
                rows={3}
                value={bundleForm.includedItemsText}
                onChange={e => setBundleForm({ ...bundleForm, includedItemsText: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleForm.status === 'published'}
                    onChange={e => setBundleForm({ ...bundleForm, status: e.target.checked ? 'published' : 'draft' })}
                    className="accent-[#A64B3C]"
                  />
                  <span className="font-bold text-[#1E1419]">Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleForm.featured}
                    onChange={e => setBundleForm({ ...bundleForm, featured: e.target.checked })}
                    className="accent-[#A64B3C]"
                  />
                  <span className="font-bold text-[#1E1419]">Featured</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBundleModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#D5C2BB] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Bundle</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

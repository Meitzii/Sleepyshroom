import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookHeart,
  Calendar,
  CalendarClock,
  Check,
  Filter,
  HeartPulse,
  ListChecks,
  NotebookPen,
  SlidersHorizontal,
  Sparkles,
  Sticker,
  Wallet,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Collection, Product, ThemeBundle } from '../types/index.ts';
import { parseJsonResponse } from '../utils/apiClient.ts';
import { CollectionHero } from '../components/collections/CollectionHero.tsx';
import { CollectionCategoryNav, type CategoryOption } from '../components/collections/CollectionCategoryNav.tsx';
import { CollectionFilters, type CollectionFilterState } from '../components/collections/CollectionFilters.tsx';
import { CollectionProductGrid } from '../components/collections/CollectionProductGrid.tsx';
import { CollectionBundleSection } from '../components/collections/CollectionBundleSection.tsx';
import { RelatedCollections } from '../components/collections/RelatedCollections.tsx';
import { ProductCard } from '../components/common/ProductCard.tsx';
import { SectionHeading } from '../components/common/SectionHeading.tsx';
import {
  DIGITAL_STATIONERY_CATEGORIES,
  DIGITAL_STATIONERY_COLLECTION_NAME,
  DIGITAL_STATIONERY_COLLECTION_SLUG,
  isStationeryCollection,
  isStationeryProduct,
  matchesStationeryCategory,
  resolveStationeryRouteSlug,
} from '../data/stationeryCatalog.ts';

interface CollectionPageProps {
  slug: string;
}

function matchesCollectionCategory(product: Product, category: string): boolean {
  if (category === 'all') return true;
  if (category === 'bundle') {
    return Boolean(product.isBundle || product.category === 'bundle' || product.productType === 'bundle');
  }
  if (category === 'icon_pack') {
    return product.category === 'icon_pack' || product.productType === 'icon_pack';
  }
  if (category === 'desktop') {
    return (
      product.category === 'desktop' ||
      (product.deviceTypes.includes('desktop') &&
        product.category !== 'icon_pack' &&
        !product.isBundle)
    );
  }
  if (category === 'phone_tablet') {
    return (
      product.category === 'phone_tablet' ||
      ((product.deviceTypes.includes('mobile') || product.deviceTypes.includes('tablet')) &&
        product.category !== 'icon_pack' &&
        !product.isBundle)
    );
  }
  return true;
}

export const CollectionPage: React.FC<CollectionPageProps> = ({ slug }) => {
  const { collections, products, bundles, navigateTo } = useShop();

  const stationeryRoute = useMemo(() => resolveStationeryRouteSlug(slug), [slug]);
  const isStationeryView = Boolean(stationeryRoute);

  const [loading, setLoading] = useState(!stationeryRoute);
  const [expiredInfo, setExpiredInfo] = useState<{ name: string; endDate?: string | null } | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [collectionProducts, setCollectionProducts] = useState<Product[]>([]);
  const [collectionBundles, setCollectionBundles] = useState<ThemeBundle[]>([]);
  const [relatedCollections, setRelatedCollections] = useState<Collection[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [stationeryTheme, setStationeryTheme] = useState<string>('all');

  const [filters, setFilters] = useState<CollectionFilterState>({
    category: stationeryRoute ? stationeryRoute.activeCategory : 'all',
    maxPrice: 25,
    onSaleOnly: false,
    bundlesOnly: false,
    productType: 'all',
    sortBy: stationeryRoute ? 'newest' : 'featured',
  });

  // All published Digital Stationery products (used on /collections/digital-stationery & category pages)
  const allStationeryProducts = useMemo(() => {
    return products.filter((p) => p.status === 'published' && isStationeryProduct(p));
  }, [products]);

  const stationeryThemes = useMemo(() => {
    return Array.from(new Set(allStationeryProducts.map((p) => p.theme).filter(Boolean)));
  }, [allStationeryProducts]);

  // Sync stationery route changes immediately without reload spinner
  useEffect(() => {
    if (!stationeryRoute) return;
    const ceiling = Math.max(10, ...allStationeryProducts.map((p) => Number(p.price || 0)));
    setLoading(false);
    setExpiredInfo(null);
    setFilters((prev) => ({
      ...prev,
      category: stationeryRoute.activeCategory,
      bundlesOnly: false,
      productType: 'all',
      maxPrice: Math.max(prev.maxPrice, Math.ceil(ceiling)),
    }));
  }, [stationeryRoute, allStationeryProducts]);

  // Load standard Wallpaper Theme Collection
  useEffect(() => {
    if (stationeryRoute) return;

    let cancelled = false;
    setLoading(true);
    setExpiredInfo(null);

    const loadCollection = async () => {
      const normalizedSlug = String(slug || '').trim().toLowerCase();

      const ctxCol = collections.find(
        (c) =>
          c.slug.toLowerCase() === normalizedSlug ||
          c.id.toLowerCase() === normalizedSlug ||
          c.name.toLowerCase() === normalizedSlug
      );

      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(slug)}`);
        const parsed = await parseJsonResponse(res);

        if (cancelled) return;

        if (res.status === 410 && parsed.data?.expired) {
          setExpiredInfo({
            name: parsed.data?.collection?.name || ctxCol?.name || slug,
            endDate: parsed.data?.collection?.endDate || null,
          });
          setCollection(null);
          setLoading(false);
          return;
        }

        if (parsed.ok && parsed.isJson && parsed.data?.collection) {
          const loadedCol: Collection = parsed.data.collection;
          const loadedProds: Product[] = Array.isArray(parsed.data.products)
            ? parsed.data.products.filter((p: Product) => !isStationeryProduct(p))
            : [];
          const loadedBundles: ThemeBundle[] = Array.isArray(parsed.data.bundles)
            ? parsed.data.bundles
            : [];
          const loadedRelated: Collection[] = Array.isArray(parsed.data.relatedCollections)
            ? parsed.data.relatedCollections.filter((c: Collection) => !isStationeryCollection(c))
            : [];

          const ceiling = Math.max(10, ...loadedProds.map((p) => Number(p.price || 0)));
          setCollection(loadedCol);
          setCollectionProducts(loadedProds);
          setCollectionBundles(loadedBundles);
          setRelatedCollections(loadedRelated);
          setFilters({
            category: 'all',
            maxPrice: Math.ceil(ceiling),
            onSaleOnly: false,
            bundlesOnly: false,
            productType: 'all',
            sortBy: 'featured',
          });
          setLoading(false);
          return;
        }
      } catch {
        // Fallback to context data cleanly
      }

      if (cancelled) return;

      if (ctxCol) {
        const now = Date.now();
        const isExpired = ctxCol.endDate ? new Date(ctxCol.endDate).getTime() < now : false;
        const isFuture = ctxCol.startDate ? new Date(ctxCol.startDate).getTime() > now : false;
        if (isExpired || isFuture || (ctxCol.status && ctxCol.status !== 'published')) {
          setExpiredInfo({ name: ctxCol.name, endDate: ctxCol.endDate || null });
          setCollection(null);
          setLoading(false);
          return;
        }

        const matchedProds = products.filter(
          (p) =>
            p.status === 'published' &&
            !isStationeryProduct(p) &&
            (p.collectionId === ctxCol.id ||
              p.collection.toLowerCase() === ctxCol.name.toLowerCase() ||
              p.theme?.toLowerCase() === ctxCol.name.toLowerCase())
        );
        const matchedBundles = bundles.filter(
          (b) => b.collectionId === ctxCol.id || b.collectionSlug === ctxCol.slug
        );
        const rel = collections
          .filter((c) => c.id !== ctxCol.id && !isStationeryCollection(c))
          .slice(0, 4);
        const ceiling = Math.max(10, ...matchedProds.map((p) => Number(p.price || 0)));

        setCollection(ctxCol);
        setCollectionProducts(matchedProds);
        setCollectionBundles(matchedBundles);
        setRelatedCollections(rel);
        setFilters({
          category: 'all',
          maxPrice: Math.ceil(ceiling),
          onSaleOnly: false,
          bundlesOnly: false,
          productType: 'all',
          sortBy: 'featured',
        });
      } else {
        setCollection(null);
      }
      setLoading(false);
    };

    loadCollection();
    return () => {
      cancelled = true;
    };
  }, [slug, stationeryRoute, collections, products, bundles]);

  const activeDataset = isStationeryView ? allStationeryProducts : collectionProducts;

  const priceCeiling = useMemo(
    () => Math.max(10, ...activeDataset.map((p) => Number(p.price || 0))),
    [activeDataset]
  );

  const categories: CategoryOption[] = useMemo(() => {
    if (isStationeryView) {
      return [
        { id: 'all', label: 'All Items', count: allStationeryProducts.length },
        ...DIGITAL_STATIONERY_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          count: allStationeryProducts.filter((p) => matchesStationeryCategory(p, cat.id)).length,
        })),
      ];
    }

    return [
      { id: 'all', label: 'All Products', count: collectionProducts.length },
      {
        id: 'phone_tablet',
        label: 'Phone & Tablet Wallpapers',
        count: collectionProducts.filter((p) => matchesCollectionCategory(p, 'phone_tablet')).length,
      },
      {
        id: 'desktop',
        label: 'Desktop Wallpapers',
        count: collectionProducts.filter((p) => matchesCollectionCategory(p, 'desktop')).length,
      },
      {
        id: 'icon_pack',
        label: 'Icon Packs',
        count: collectionProducts.filter((p) => matchesCollectionCategory(p, 'icon_pack')).length,
      },
      {
        id: 'bundle',
        label: 'Bundles',
        count: collectionProducts.filter((p) => matchesCollectionCategory(p, 'bundle')).length,
      },
    ];
  }, [isStationeryView, allStationeryProducts, collectionProducts]);

  const availableProductTypes = useMemo(() => {
    if (isStationeryView) return [];
    const types = Array.from(
      new Set(
        collectionProducts
          .map((p) => String(p.productType || (p.isBundle ? 'bundle' : 'wallpaper')))
          .filter(Boolean)
      )
    );
    return types;
  }, [isStationeryView, collectionProducts]);

  const filteredProducts = useMemo(() => {
    let list = activeDataset.filter((p) => {
      if (isStationeryView) {
        if (!matchesStationeryCategory(p, filters.category)) return false;
        if (
          stationeryTheme !== 'all' &&
          p.theme.toLowerCase() !== stationeryTheme.toLowerCase()
        ) {
          return false;
        }
      } else {
        if (!matchesCollectionCategory(p, filters.category)) return false;
        if (filters.bundlesOnly && !p.isBundle && p.category !== 'bundle') return false;
        if (filters.productType !== 'all') {
          const pType = String(p.productType || (p.isBundle ? 'bundle' : 'wallpaper'));
          if (pType !== filters.productType) return false;
        }
      }
      if (Number(p.price) > filters.maxPrice) return false;
      if (filters.onSaleOnly && !(p.compareAtPrice && p.compareAtPrice > p.price)) return false;
      return true;
    });

    if (filters.sortBy === 'price-low') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price-high') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'newest') {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (filters.sortBy === 'best-selling') {
      list = [...list].sort(
        (a, b) => (b.downloadCount || b.popularity || 0) - (a.downloadCount || a.popularity || 0)
      );
    } else {
      list = [...list].sort((a, b) => {
        if (Boolean(b.featured) !== Boolean(a.featured)) return b.featured ? 1 : -1;
        return (b.popularity || 0) - (a.popularity || 0);
      });
    }

    return list;
  }, [activeDataset, isStationeryView, filters, stationeryTheme]);

  const hasActiveFilters = isStationeryView
    ? filters.category !== 'all' ||
      stationeryTheme !== 'all' ||
      filters.maxPrice < Math.ceil(priceCeiling)
    : filters.category !== 'all' ||
      filters.onSaleOnly ||
      filters.bundlesOnly ||
      filters.productType !== 'all' ||
      filters.maxPrice < Math.ceil(priceCeiling);

  const resetFilters = () => {
    setStationeryTheme('all');
    setFilters({
      category: 'all',
      maxPrice: Math.ceil(priceCeiling),
      onSaleOnly: false,
      bundlesOnly: false,
      productType: 'all',
      sortBy: isStationeryView ? 'newest' : 'featured',
    });
    if (isStationeryView && slug !== DIGITAL_STATIONERY_COLLECTION_SLUG) {
      navigateTo('collections', DIGITAL_STATIONERY_COLLECTION_SLUG);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-4 space-y-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#A64B3C]/20 border-t-[#A64B3C] animate-spin mx-auto" />
        <p className="text-sm font-bold text-[#777777]">Gathering cozy designs...</p>
      </div>
    );
  }

  // Dedicated Digital Stationery Collection & Category View (mirrors /#collections layout)
  if (isStationeryView && stationeryRoute) {
    const activeCatMeta =
      filters.category !== 'all'
        ? DIGITAL_STATIONERY_CATEGORIES.find((c) => c.id === filters.category) || stationeryRoute.categoryDef
        : null;

    const pageTitle = activeCatMeta ? activeCatMeta.label : DIGITAL_STATIONERY_COLLECTION_NAME;
    const maxSliderPrice = Math.max(10, Math.ceil(priceCeiling));

    const getCategoryIcon = (catId: string) => {
      switch (catId) {
        case 'digital-notes':
          return <NotebookPen className="w-4 h-4" />;
        case 'digital-journals':
          return <BookHeart className="w-4 h-4" />;
        case 'calendars-schedules':
          return <Calendar className="w-4 h-4" />;
        case 'to-do-lists':
          return <ListChecks className="w-4 h-4" />;
        case 'habit-mood-trackers':
          return <HeartPulse className="w-4 h-4" />;
        case 'digital-stickers':
          return <Sticker className="w-4 h-4" />;
        case 'budget-planners':
          return <Wallet className="w-4 h-4" />;
        default:
          return null;
      }
    };

    const handleSelectStationeryCategory = (categoryId: string, targetSlug: string) => {
      setFilters((prev) => ({
        ...prev,
        category: categoryId,
      }));
      navigateTo('collections', targetSlug);
    };

    return (
      <div className="py-8 sm:py-12 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Page Header */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <SectionHeading as="h1" size="lg">
              {pageTitle}
            </SectionHeading>
          </div>

          {/* Centered Category Segmented Control Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() =>
                handleSelectStationeryCategory('all', DIGITAL_STATIONERY_COLLECTION_SLUG)
              }
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                filters.category === 'all'
                  ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                  : 'bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] border border-[#EADCC8]'
              }`}
            >
              All Items
            </button>

            {DIGITAL_STATIONERY_CATEGORIES.map((category) => {
              const active = filters.category === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelectStationeryCategory(category.id, category.slug)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                      : 'bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] border border-[#EADCC8]'
                  }`}
                >
                  {getCategoryIcon(category.id)}
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toolbar: Result count + Mobile filter toggle + Sorting */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-3 px-4 bg-[#FFFFFF] rounded-2xl border border-neutral-200 mb-8">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <span className="text-xs font-bold text-[#777777]">
                Showing{' '}
                <span className="font-extrabold text-[#292929]">{filteredProducts.length}</span>{' '}
                items
              </span>

              {/* Mobile Filter trigger */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#292929] bg-neutral-100 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#A64B3C] hover:underline font-bold self-start sm:self-auto cursor-pointer"
              >
                Clear all filters
              </button>
            )}

            {/* Sort By Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label
                htmlFor="stationery-sort-select"
                className="text-xs text-[#777777] font-bold shrink-0"
              >
                Sort by:
              </label>
              <select
                id="stationery-sort-select"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as CollectionFilterState['sortBy'],
                  }))
                }
                className="text-xs font-bold text-[#292929] bg-transparent border-0 focus:ring-0 cursor-pointer p-1"
              >
                <option value="newest">Newest Releases</option>
                <option value="best-selling">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Main Content Grid: Sidebar Filters (desktop) + Products */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Desktop Filter Sidebar */}
            <aside
              className={`md:col-span-3 space-y-6 ${mobileFilterOpen ? 'block' : 'hidden md:block'}`}
            >
              <div className="bg-[#FFFFFF] rounded-3xl p-5 border border-neutral-200 space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#292929] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#A64B3C]" />
                    <span>Refine Catalog</span>
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[11px] font-bold text-[#A64B3C] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Theme Filter */}
                <div>
                  <h3 className="text-xs font-bold text-[#292929] mb-2.5">Themes</h3>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setStationeryTheme('all')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        stationeryTheme === 'all'
                          ? 'bg-[#FFFCF7] text-[#292929] border border-[#EADCC8]'
                          : 'text-[#777777] hover:bg-[#FFFCF7]/60'
                      }`}
                    >
                      <span>All Themes</span>
                      {stationeryTheme === 'all' && (
                        <Check className="w-3.5 h-3.5 text-[#A64B3C]" />
                      )}
                    </button>
                    {stationeryThemes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStationeryTheme(t)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                          stationeryTheme.toLowerCase() === t.toLowerCase()
                            ? 'bg-[#FFFCF7] text-[#292929] border border-[#EADCC8]'
                            : 'text-[#777777] hover:bg-[#FFFCF7]/60'
                        }`}
                      >
                        <span>{t}</span>
                        {stationeryTheme.toLowerCase() === t.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-[#A64B3C]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Price Filter */}
                <div className="border-t border-[#EADCC8] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-[#292929]">Max Price</h3>
                    <span className="text-xs font-bold text-[#A64B3C] tabular-nums tracking-tight">
                      ${Math.min(filters.maxPrice, maxSliderPrice).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxSliderPrice}
                    step="0.5"
                    value={Math.min(filters.maxPrice, maxSliderPrice)}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))
                    }
                    aria-label="Filter by max price"
                    className="w-full accent-[#A64B3C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#777777] font-bold mt-1">
                    <span>$0.00</span>
                    <span>${maxSliderPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Product Grid Container */}
            <main className="md:col-span-9">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} orientation="auto" />
                  ))}
                </div>
              ) : (
                <div className="bg-[#FCF3E2] rounded-3xl p-12 text-center border border-[#EADCC8] max-w-md mx-auto">
                  <p className="text-3xl mb-3">🍄</p>
                  <h3 className="font-heading font-bold text-lg text-[#292929] mb-1">
                    No matching stationery found
                  </h3>
                  <p className="text-xs text-[#777777] font-medium mb-5">
                    Try adjusting or resetting your filter criteria to discover more cozy digital
                    stationery.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-5 py-2.5 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs font-bold hover:bg-[#8E3E30] transition-all cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (expiredInfo) {
    return (
      <div className="py-20 px-4 max-w-lg mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#FCF3E2] border border-[#EADCC8] flex items-center justify-center mx-auto">
          <CalendarClock className="w-8 h-8 text-[#A64B3C]" />
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929]">
          {expiredInfo.name} Has Rested for the Season
        </h1>
        <p className="text-sm text-[#777777] font-medium leading-relaxed">
          This limited seasonal collection is currently outside its release window. If you previously purchased designs from this collection, your files remain safely available in your Account order history.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigateTo('collections')}
            className="px-5 py-3 rounded-xl bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold cursor-pointer"
          >
            Browse Active Collections
          </button>
          <button
            type="button"
            onClick={() => navigateTo('account')}
            className="px-5 py-3 rounded-xl bg-[#FCF3E2] hover:bg-[#EADCC8] text-[#292929] border border-[#EADCC8] text-xs font-bold cursor-pointer"
          >
            View My Purchases
          </button>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="py-20 px-4 max-w-lg mx-auto text-center space-y-4">
        <p className="text-4xl">🍄</p>
        <h1 className="font-heading font-bold text-2xl text-[#292929]">Collection Not Found</h1>
        <p className="text-sm text-[#777777] font-medium">
          We couldn&apos;t find a theme collection matching &ldquo;{slug}&rdquo;.
        </p>
        <button
          type="button"
          onClick={() => navigateTo('collections')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold hover:bg-[#8E3E30] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore All Wallpapers</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      {/* Dynamic Collection Hero */}
      <CollectionHero collection={collection} totalProducts={collectionProducts.length} />

      {/* Category Navigation Bar */}
      <CollectionCategoryNav
        categories={categories}
        selectedCategory={filters.category}
        onSelectCategory={(category) =>
          setFilters((prev) => ({
            ...prev,
            category,
            bundlesOnly: category === 'bundle' ? true : false,
          }))
        }
      />

      {/* Filter Sidebar + Product Grid */}
      <section className="py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <CollectionFilters
              filters={filters}
              onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
              onReset={resetFilters}
              availableProductTypes={availableProductTypes}
              priceCeiling={priceCeiling}
              hasActiveFilters={hasActiveFilters}
              mobileOpen={mobileFilterOpen}
              onCloseMobile={() => setMobileFilterOpen(false)}
            />

            <CollectionProductGrid
              products={filteredProducts}
              sortBy={filters.sortBy}
              onSortChange={(sortBy) => setFilters((prev) => ({ ...prev, sortBy }))}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={resetFilters}
              onOpenMobileFilters={() => setMobileFilterOpen(true)}
            />
          </div>
        </div>
      </section>

      {/* Dedicated Bundle Section */}
      <CollectionBundleSection bundles={collectionBundles} collectionProducts={collectionProducts} />

      {/* Related Collections Grid */}
      <RelatedCollections collections={relatedCollections} />

      {/* Gentle bottom back-link */}
      <div className="pb-12 pt-2 text-center">
        <button
          type="button"
          onClick={() => navigateTo('collections')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Back to Full Sleepyshroom Catalog</span>
        </button>
      </div>
    </div>
  );
};

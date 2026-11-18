import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, Monitor, Smartphone, Tablet, Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ProductCard } from '../components/common/ProductCard.tsx';
import { SectionHeading } from '../components/common/SectionHeading.tsx';
import { isStationeryCollection, isStationeryProduct } from '../data/stationeryCatalog.ts';

export const CollectionsPage: React.FC = () => {
  const { products, collections, viewParam, navigateTo } = useShop();

  // Parse viewParam (e.g. "device=desktop", "theme=Sleepy+Garden", "search=autumn")
  const initialParams = useMemo(() => {
    const params: { device?: string; theme?: string; collection?: string; search?: string; free?: string } = {};
    if (viewParam) {
      const searchParams = new URLSearchParams(viewParam);
      if (searchParams.get('device')) params.device = searchParams.get('device')!;
      if (searchParams.get('theme')) params.theme = searchParams.get('theme')!;
      if (searchParams.get('collection')) params.collection = searchParams.get('collection')!;
      if (searchParams.get('search')) params.search = searchParams.get('search')!;
      if (searchParams.get('free')) params.free = searchParams.get('free')!;
    }
    return params;
  }, [viewParam]);

  const [selectedDevice, setSelectedDevice] = useState<string>(initialParams.device || 'all');
  const [selectedTheme, setSelectedTheme] = useState<string>(initialParams.theme || 'all');
  const [selectedCollection, setSelectedCollection] = useState<string>(initialParams.collection || 'all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchFilter, setSearchFilter] = useState<string>(initialParams.search || '');
  const [maxPrice, setMaxPrice] = useState<number>(10);
  const [onlyFree, setOnlyFree] = useState<boolean>(initialParams.free === 'true' || initialParams.collection === 'Free Wallpapers');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync when viewParam changes externally
  useEffect(() => {
    if (initialParams.device) setSelectedDevice(initialParams.device);
    if (initialParams.theme) setSelectedTheme(initialParams.theme);
    if (initialParams.collection) {
      setSelectedCollection(initialParams.collection);
      if (initialParams.collection === 'Free Wallpapers') setOnlyFree(true);
    }
    if (initialParams.search !== undefined) setSearchFilter(initialParams.search);
    if (initialParams.free !== undefined) setOnlyFree(initialParams.free === 'true');
  }, [initialParams]);

  // Keep Wallpaper Collections strictly separate from Digital Stationery products (allow cross-search if user searches via header)
  const wallpaperProducts = useMemo(() => {
    if (searchFilter.trim()) return products;
    return products.filter(p => !isStationeryProduct(p));
  }, [products, searchFilter]);

  const wallpaperCollections = useMemo(() => {
    return collections.filter(c => !isStationeryCollection(c));
  }, [collections]);

  // Unique themes list
  const themes = useMemo(() => {
    const list = Array.from(new Set(wallpaperProducts.map(p => p.theme)));
    return list;
  }, [wallpaperProducts]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...wallpaperProducts];

    // Device filter
    if (selectedDevice !== 'all') {
      list = list.filter(p => p.deviceTypes.includes(selectedDevice as any));
    }

    // Theme filter
    if (selectedTheme !== 'all') {
      list = list.filter(p => p.theme.toLowerCase() === selectedTheme.toLowerCase());
    }

    // Collection filter
    if (selectedCollection !== 'all') {
      list = list.filter(p => p.collection.toLowerCase() === selectedCollection.toLowerCase());
    }

    // Freebie filter
    if (onlyFree) {
      list = list.filter(p => p.isFree || p.price === 0);
    }

    // Price filter
    list = list.filter(p => p.price <= maxPrice);

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.theme.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'popularity') {
      list.sort((a, b) => b.popularity - a.popularity);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [wallpaperProducts, selectedDevice, selectedTheme, selectedCollection, maxPrice, searchFilter, sortBy, onlyFree]);

  const clearFilters = () => {
    setSelectedDevice('all');
    setSelectedTheme('all');
    setSelectedCollection('all');
    setOnlyFree(false);
    setSearchFilter('');
    setMaxPrice(10);
    setSortBy('newest');
  };

  const hasActiveFilters = selectedDevice !== 'all' || selectedTheme !== 'all' || selectedCollection !== 'all' || searchFilter !== '' || maxPrice < 10 || onlyFree;

  return (
    <div className="py-8 sm:py-12 bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <SectionHeading as="h1" size="lg">
            {onlyFree
              ? 'Free Wallpapers'
              : selectedDevice === 'desktop'
              ? 'Desktop Themes'
              : selectedDevice === 'mobile'
              ? 'Mobile Wallpapers'
              : selectedDevice === 'tablet'
              ? 'Tablet Wallpapers'
              : 'Wallpaper Collections'}
          </SectionHeading>
        </div>

        {/* Dedicated Theme Collection Landing Cards */}
        {!hasActiveFilters && wallpaperCollections.length > 0 && (
          <div className="mb-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {wallpaperCollections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigateTo('collections', c.slug)}
                  className="group text-left bg-[#FFFFFF] rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-16/10 w-full overflow-hidden bg-neutral-100 relative">
                    <img
                      src={c.coverImage}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {c.isNew && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#A64B3C] text-[#FFFFFF] text-[10px] font-extrabold">
                        NEW
                      </span>
                    )}
                    {c.isLimitedEdition && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#292929] text-[#FFFFFF] text-[10px] font-extrabold">
                        LIMITED
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-[#292929] group-hover:text-[#A64B3C] truncate">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-[#777777] font-semibold">
                        {c.productCount ?? 0} designs
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#A64B3C] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Device Segmented Control Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => { setSelectedDevice('all'); setOnlyFree(false); }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDevice === 'all' && !onlyFree
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] border border-[#EADCC8]'
            }`}
          >
            All Screens
          </button>
          <button
            onClick={() => { setSelectedDevice('desktop'); setOnlyFree(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDevice === 'desktop' && !onlyFree
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] border border-[#EADCC8]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => { setSelectedDevice('mobile'); setOnlyFree(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDevice === 'mobile' && !onlyFree
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] border border-[#EADCC8]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Phone</span>
          </button>
          <button
            onClick={() => { setSelectedDevice('tablet'); setOnlyFree(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedDevice === 'tablet' && !onlyFree
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] border border-[#EADCC8]'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>Tablet</span>
          </button>
          <button
            onClick={() => setOnlyFree(!onlyFree)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              onlyFree
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs ring-2 ring-[#A64B3C]/40'
                : 'bg-[#FCF3E2] text-[#A64B3C] border-2 border-[#EADCC8] hover:bg-[#EADCC8]/40'
            }`}
          >
            <span>🎁 Freebies ($0)</span>
          </button>
        </div>

        {/* Toolbar: Result count + Mobile filter toggle + Sorting */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-3 px-4 bg-[#FFFFFF] rounded-2xl border border-neutral-200 mb-8">
          
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span className="text-xs font-bold text-[#777777]">
              Showing <span className="font-extrabold text-[#292929]">{filteredProducts.length}</span> wallpapers
            </span>

            {/* Mobile Filter trigger */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#292929] bg-neutral-100 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#A64B3C] hover:underline font-bold self-start sm:self-auto cursor-pointer"
            >
              Clear all filters
            </button>
          )}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="sort-select" className="text-xs text-[#777777] font-bold shrink-0">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs font-bold text-[#292929] bg-transparent border-0 focus:ring-0 cursor-pointer p-1"
            >
              <option value="newest">Newest Releases</option>
              <option value="popularity">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

        </div>

        {/* Main Content Grid: Sidebar Filters (desktop) + Products */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Desktop Filter Sidebar */}
          <aside className={`md:col-span-3 space-y-6 ${mobileFilterOpen ? 'block' : 'hidden md:block'}`}>
            <div className="bg-[#FFFFFF] rounded-3xl p-5 border border-neutral-200 space-y-6">
              
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#292929] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Refine Catalog</span>
                </span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[11px] font-bold text-[#A64B3C] hover:underline cursor-pointer">
                    Reset
                  </button>
                )}
              </div>

              {/* Theme Filter */}
              <div>
                <h3 className="text-xs font-bold text-[#292929] mb-2.5">
                  Themes
                </h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedTheme('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedTheme === 'all'
                        ? 'bg-[#FFFCF7] text-[#292929] border border-[#EADCC8]'
                        : 'text-[#777777] hover:bg-[#FFFCF7]/60'
                    }`}
                  >
                    <span>All Themes</span>
                    {selectedTheme === 'all' && <Check className="w-3.5 h-3.5 text-[#A64B3C]" />}
                  </button>
                  {themes.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTheme(t)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        selectedTheme.toLowerCase() === t.toLowerCase()
                          ? 'bg-[#FFFCF7] text-[#292929] border border-[#EADCC8]'
                          : 'text-[#777777] hover:bg-[#FFFCF7]/60'
                      }`}
                    >
                      <span>{t}</span>
                      {selectedTheme.toLowerCase() === t.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-[#A64B3C]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter (Price distinctively styled) */}
              <div className="border-t border-[#EADCC8] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#292929]">
                    Max Price
                  </h3>
                  <span className="text-xs font-bold text-[#A64B3C] tabular-nums tracking-tight">
                    ${maxPrice.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#A64B3C] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#777777] font-bold mt-1">
                  <span>$2.00</span>
                  <span>$10.00</span>
                </div>
              </div>

            </div>
          </aside>

          {/* Product Grid Container */}
          <main className="md:col-span-9">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    orientation={selectedDevice === 'desktop' ? 'landscape' : 'auto'}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-[#FCF3E2] rounded-3xl p-12 text-center border border-[#EADCC8] max-w-md mx-auto">
                <p className="text-3xl mb-3">🍄</p>
                <h3 className="font-heading font-bold text-lg text-[#292929] mb-1">
                  No matching wallpapers found
                </h3>
                <p className="text-xs text-[#777777] font-medium mb-5">
                  Try adjusting or resetting your filter criteria to discover more cozy designs.
                </p>
                <button
                  onClick={clearFilters}
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
};

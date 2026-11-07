import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, Monitor, Smartphone, Tablet, Sparkles, X, Check } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ProductCard } from '../components/common/ProductCard.tsx';

export const CollectionsPage: React.FC = () => {
  const { products, collections, viewParam } = useShop();

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

  // Unique themes list
  const themes = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.theme)));
    return list;
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

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
  }, [products, selectedDevice, selectedTheme, selectedCollection, maxPrice, searchFilter, sortBy, onlyFree]);

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
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3B2633] uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#3B2633]" />
            <span>Digital Wallpapers</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#1E1419] tracking-tight">
            {onlyFree
              ? 'Complimentary Free Wallpapers'
              : selectedDevice === 'desktop'
              ? 'Desktop Themes'
              : selectedDevice === 'mobile'
              ? 'Mobile & Tablet Themes'
              : 'All Wallpaper Collections'}
          </h1>
          <p className="mt-2 text-sm text-[#33222C] font-medium">
            {onlyFree
              ? 'Download our sweet complimentary wallpapers instantly — completely free.'
              : 'Explore high-resolution digital wallpapers crafted for peaceful and cozy screen spaces.'}
          </p>
        </div>

        {/* Device Segmented Control Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => { setSelectedDevice('all'); setOnlyFree(false); }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedDevice === 'all' && !onlyFree
                ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs'
                : 'bg-[#F9F6F0] text-[#281822] hover:bg-[#E8C9C1]/40 border border-[#E8C9C1]'
            }`}
          >
            All Screens
          </button>
          <button
            onClick={() => { setSelectedDevice('desktop'); setOnlyFree(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedDevice === 'desktop' && !onlyFree
                ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs'
                : 'bg-[#F9F6F0] text-[#281822] hover:bg-[#E8C9C1]/40 border border-[#E8C9C1]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => { setSelectedDevice('mobile'); setOnlyFree(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedDevice === 'mobile' && !onlyFree
                ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs'
                : 'bg-[#F9F6F0] text-[#281822] hover:bg-[#E8C9C1]/40 border border-[#E8C9C1]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Phone</span>
          </button>
          <button
            onClick={() => { setSelectedDevice('tablet'); setOnlyFree(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              selectedDevice === 'tablet' && !onlyFree
                ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs'
                : 'bg-[#F9F6F0] text-[#281822] hover:bg-[#E8C9C1]/40 border border-[#E8C9C1]'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>Tablet</span>
          </button>
          <button
            onClick={() => setOnlyFree(!onlyFree)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              onlyFree
                ? 'bg-[#945367] text-[#F7F3E9] shadow-xs ring-2 ring-[#945367]/40'
                : 'bg-[#FAF7F0] text-[#945367] border-2 border-[#D6C8F2] hover:bg-[#D6C8F2]/30'
            }`}
          >
            <span>🎁 Freebies ($0)</span>
          </button>
        </div>

        {/* Toolbar: Result count + Mobile filter toggle + Sorting */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-3 px-4 bg-[#F9F6F0] rounded-2xl border border-[#E8C9C1] mb-8">
          
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span className="text-xs font-bold text-[#3B2834]">
              Showing <span className="font-extrabold text-[#1E1419]">{filteredProducts.length}</span> wallpapers
            </span>

            {/* Mobile Filter trigger */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#24171E] bg-[#E8C9C1]/50"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#24171E] hover:text-[#8B6F7A] underline font-bold self-start sm:self-auto"
            >
              Clear all filters
            </button>
          )}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="sort-select" className="text-xs text-[#2D1C26] font-bold shrink-0">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs font-bold text-[#1E1419] bg-transparent border-0 focus:ring-0 cursor-pointer p-1"
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
            <div className="bg-[#F9F6F0] rounded-3xl p-5 border border-[#E8C9C1] space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#E8C9C1]/50 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#24171E] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Refine Catalog</span>
                </span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[11px] font-bold text-[#8B6F7A] hover:underline">
                    Reset
                  </button>
                )}
              </div>

              {/* Theme Filter */}
              <div>
                <h3 className="text-xs font-bold text-[#1E1419] mb-2.5">
                  Themes
                </h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedTheme('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                      selectedTheme === 'all'
                        ? 'bg-[#E8C9C1]/50 text-[#1E1419]'
                        : 'text-[#382631] hover:bg-[#E8C9C1]/30'
                    }`}
                  >
                    <span>All Themes</span>
                    {selectedTheme === 'all' && <Check className="w-3.5 h-3.5 text-[#8B6F7A]" />}
                  </button>
                  {themes.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTheme(t)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                        selectedTheme.toLowerCase() === t.toLowerCase()
                          ? 'bg-[#E8C9C1]/50 text-[#1E1419]'
                          : 'text-[#382631] hover:bg-[#E8C9C1]/30'
                      }`}
                    >
                      <span>{t}</span>
                      {selectedTheme.toLowerCase() === t.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-[#8B6F7A]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collections Filter */}
              <div className="border-t border-[#E8C9C1]/50 pt-4">
                <h3 className="text-xs font-bold text-[#1E1419] mb-2.5">
                  Collections
                </h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedCollection('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                      selectedCollection === 'all'
                        ? 'bg-[#E8C9C1]/50 text-[#1E1419]'
                        : 'text-[#382631] hover:bg-[#E8C9C1]/30'
                    }`}
                  >
                    <span>All Collections</span>
                    {selectedCollection === 'all' && <Check className="w-3.5 h-3.5 text-[#8B6F7A]" />}
                  </button>
                  {collections.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCollection(c.name)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                        selectedCollection.toLowerCase() === c.name.toLowerCase()
                          ? 'bg-[#E8C9C1]/50 text-[#1E1419]'
                          : 'text-[#382631] hover:bg-[#E8C9C1]/30'
                      }`}
                    >
                      <span>{c.name}</span>
                      {selectedCollection.toLowerCase() === c.name.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-[#8B6F7A]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter (Price distinctively styled) */}
              <div className="border-t border-[#E8C9C1]/50 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#1E1419]">
                    Max Price
                  </h3>
                  <span className="text-xs font-bold text-[#945367] tabular-nums tracking-tight">
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
                  className="w-full accent-[#8B6F7A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#45313D] font-bold mt-1">
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
              <div className="bg-[#F9F6F0] rounded-3xl p-12 text-center border border-[#E8C9C1] max-w-md mx-auto">
                <p className="text-3xl mb-3">🍄</p>
                <h3 className="font-heading font-bold text-lg text-[#1E1419] mb-1">
                  No matching wallpapers found
                </h3>
                <p className="text-xs text-[#33222C] font-medium mb-5">
                  Try adjusting or resetting your filter criteria to discover more cozy designs.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-5 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs font-bold hover:bg-[#785E69] transition-all"
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

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, ShoppingBag, X, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from './common/Icons.tsx';

interface HeaderProps {
  onOpenMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  const {
    cartCount,
    setIsCartOpen,
    navigateTo,
    products,
    settings,
  } = useShop();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter products for search autocomplete
  const searchResults = searchInput.trim().length > 1
    ? products
        .filter((p) => {
          const query = searchInput.toLowerCase().trim();
          return (
            p.title.toLowerCase().includes(query) ||
            p.theme.toLowerCase().includes(query) ||
            p.collection.toLowerCase().includes(query) ||
            p.deviceTypes.some((d) => d.toLowerCase().includes(query))
          );
        })
        .slice(0, 5)
    : [];

  // Close search panel / suggestions on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFocused(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectProduct = (slug: string) => {
    setIsFocused(false);
    setSearchInput('');
    setSearchOpen(false);
    navigateTo('product', slug);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setIsFocused(false);
      setSearchOpen(false);
      navigateTo('collections', `search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <header
      ref={searchContainerRef}
      className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-neutral-200 transition-all"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 grid grid-cols-3 items-center">
        {/* Left: Three-line Hamburger Menu Icon */}
        <div className="justify-self-start flex items-center">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="p-2.5 -ml-2 rounded-xl text-[#292929] hover:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-[#A64B3C] cursor-pointer"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
          </button>
        </div>

        {/* Center: Perfectly Centered Sleepyshroom Logo */}
        <div className="justify-self-center flex items-center justify-center min-w-0">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="group flex items-center gap-2 sm:gap-2.5 text-center transition-transform active:scale-95 cursor-pointer"
          >
            <ShroomLogoIcon size={34} className="transition-transform group-hover:rotate-6 shrink-0" />
            <span className="font-section-serif font-medium text-[26px] sm:text-[29px] text-[#292929] tracking-tight leading-none whitespace-nowrap">
              {settings?.storeName || 'sleepyshroom'}
            </span>
          </button>
        </div>

        {/* Right: Search Icon & Shopping Cart Icon */}
        <div className="justify-self-end flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setIsFocused(true);
            }}
            aria-label="Toggle search"
            aria-expanded={searchOpen}
            className={`p-2.5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[#A64B3C] cursor-pointer ${
              searchOpen
                ? 'bg-neutral-100 text-[#A64B3C]'
                : 'text-[#292929] hover:bg-neutral-100'
            }`}
          >
            <Search className="w-5 h-5 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label="View shopping cart"
            className="relative p-2.5 -mr-2 rounded-xl text-[#292929] hover:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-[#A64B3C] cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#A64B3C] text-[#FFFFFF] text-[10px] font-bold rounded-full shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Clean Search Bar & Autocomplete Dropdown (Desktop, Tablet, Mobile) */}
      {searchOpen && (
        <div className="border-t border-neutral-200 bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-xl mx-auto relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search cozy wallpapers, themes, or devices..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setIsFocused(true);
                }}
                onFocus={() => setIsFocused(true)}
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-full text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/30 focus:border-[#A64B3C] focus:bg-[#FFFFFF] transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  if (searchInput) {
                    setSearchInput('');
                  } else {
                    setSearchOpen(false);
                    setIsFocused(false);
                  }
                }}
                aria-label={searchInput ? 'Clear search text' : 'Close search bar'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#777777] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>

            {/* Live Search Autocomplete Dropdown */}
            {isFocused && searchInput.trim().length > 1 && (
              <div className="mt-2 w-full bg-[#FFFFFF] rounded-2xl shadow-xl border border-neutral-200 p-2 z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#777777] border-b border-neutral-100">
                  Wallpaper Suggestions
                </div>
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProduct(prod.slug)}
                        className="w-full flex items-center gap-3 p-2 text-left rounded-xl hover:bg-neutral-50 transition-colors group cursor-pointer"
                      >
                        <img
                          src={prod.images[0]}
                          alt={prod.title}
                          className="w-10 h-10 object-cover rounded-lg shrink-0 border border-neutral-200"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#292929] truncate group-hover:text-[#A64B3C]">
                            {prod.title}
                          </p>
                          <p className="text-[11px] text-[#777777] truncate">
                            <span>{prod.theme}</span> ·{' '}
                            <span className="font-bold text-[#A64B3C]">
                              {prod.isFree || prod.price === 0 ? 'FREE' : `$${prod.price.toFixed(2)}`}
                            </span>
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#777777] group-hover:text-[#A64B3C] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full mt-1 pt-2 pb-1 border-t border-neutral-100 text-center text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
                    >
                      View all results for &ldquo;{searchInput}&rdquo;
                    </button>
                  </div>
                ) : (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs font-bold text-[#292929]">No wallpapers found</p>
                    <p className="text-[11px] text-[#777777] mt-1">
                      Try searching &ldquo;garden&rdquo;, &ldquo;autumn&rdquo;, &ldquo;mushroom&rdquo;, or &ldquo;desktop&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

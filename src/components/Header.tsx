import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, ShoppingBag, User, X, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from './common/Icons.tsx';

interface HeaderProps {
  onOpenMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
  const { 
    cartCount, 
    setIsCartOpen, 
    user, 
    navigateTo, 
    products, 
    settings 
  } = useShop();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter products for search autocomplete
  const searchResults = searchInput.trim().length > 1
    ? products.filter(p => {
        const query = searchInput.toLowerCase().trim();
        return (
          p.title.toLowerCase().includes(query) ||
          p.theme.toLowerCase().includes(query) ||
          p.collection.toLowerCase().includes(query) ||
          p.deviceTypes.some(d => d.toLowerCase().includes(query))
        );
      }).slice(0, 5)
    : [];

  // Close search suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <header className="sticky top-0 z-40 bg-[#FFFCF7]/95 backdrop-blur-md border-b border-[#EADCC8] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Left: Hamburger menu + Logo */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="p-2.5 rounded-xl text-[#292929] hover:bg-[#FCF3E2] transition-colors focus-visible:ring-2 focus-visible:ring-[#A64B3C] cursor-pointer"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={() => navigateTo('home')}
            className="group flex items-center gap-2.5 text-left transition-transform active:scale-95 cursor-pointer"
          >
            <ShroomLogoIcon size={38} className="transition-transform group-hover:rotate-6" />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xl sm:text-2xl text-[#292929] tracking-tight leading-none">
                {settings?.storeName || 'sleepyshroom'}
              </span>
              <span className="hidden sm:inline-block text-[11px] font-bold text-[#777777] tracking-normal leading-tight mt-0.5">
                {settings?.tagline || 'Little screens, sweeter dreams.'}
              </span>
            </div>
          </button>
        </div>

        {/* Center: Desktop Quick Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-[#292929]">
          <button
            onClick={() => navigateTo('collections')}
            className="hover:text-[#A64B3C] transition-colors py-1 border-b-2 border-transparent hover:border-[#A64B3C] cursor-pointer"
          >
            All Collections
          </button>
          <button
            onClick={() => navigateTo('collections', 'free=true')}
            className="text-[#A64B3C] hover:text-[#8E3E30] transition-colors py-1 border-b-2 border-transparent hover:border-[#A64B3C] flex items-center gap-1 font-extrabold cursor-pointer"
          >
            <span>Freebies 🎁</span>
          </button>
          <button
            onClick={() => navigateTo('collections', 'device=desktop')}
            className="hover:text-[#A64B3C] transition-colors py-1 border-b-2 border-transparent hover:border-[#A64B3C] cursor-pointer"
          >
            Desktop Themes
          </button>
          <button
            onClick={() => navigateTo('collections', 'device=mobile')}
            className="hover:text-[#A64B3C] transition-colors py-1 border-b-2 border-transparent hover:border-[#A64B3C] cursor-pointer"
          >
            Mobile & Tablet
          </button>
          <button
            onClick={() => navigateTo('about')}
            className="hover:text-[#A64B3C] transition-colors py-1 border-b-2 border-transparent hover:border-[#A64B3C] cursor-pointer"
          >
            About Me
          </button>
        </nav>

        {/* Right: Search + Account + Cart + Admin trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Search bar (Desktop expanded / Mobile icon toggle) */}
          <div ref={searchContainerRef} className="relative">
            <div className="hidden md:flex items-center relative w-56 lg:w-64">
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <input
                  type="text"
                  placeholder="Search cozy wallpapers..."
                  value={searchInput}
                  onChange={e => {
                    setSearchInput(e.target.value);
                    setIsFocused(true);
                  }}
                  onFocus={() => setIsFocused(true)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#FCF3E2] border border-[#EADCC8] rounded-full text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 focus:border-[#A64B3C] transition-all"
                />
                <Search className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#777777] hover:text-[#292929] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>

            {/* Mobile search toggle button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 rounded-xl text-[#292929] hover:bg-[#FCF3E2] transition-colors cursor-pointer"
              aria-label="Toggle search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Search autocomplete dropdown */}
            {isFocused && searchInput.trim().length > 1 && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-84 bg-[#FCF3E2] rounded-2xl shadow-xl border border-[#EADCC8] p-2 z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#777777] border-b border-[#EADCC8]">
                  Wallpaper Suggestions
                </div>
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map(prod => (
                      <button
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod.slug)}
                        className="w-full flex items-center gap-3 p-2 text-left rounded-xl hover:bg-[#FFFCF7] transition-colors group cursor-pointer"
                      >
                        <img
                          src={prod.images[0]}
                          alt={prod.title}
                          className="w-10 h-10 object-cover rounded-lg shrink-0 border border-[#EADCC8]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#292929] truncate group-hover:text-[#A64B3C]">
                            {prod.title}
                          </p>
                          <p className="text-[11px] text-[#777777] truncate">
                            <span>{prod.theme}</span> · <span className="font-bold text-[#A64B3C]">${prod.price.toFixed(2)}</span>
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#777777] group-hover:text-[#A64B3C] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full mt-1 pt-2 border-t border-[#EADCC8] text-center text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
                    >
                      View all results for "{searchInput}"
                    </button>
                  </div>
                ) : (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs font-bold text-[#292929]">
                      No wallpapers found
                    </p>
                    <p className="text-[11px] text-[#777777] mt-1">
                      Try searching "garden", "autumn", "mushroom", or "desktop"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account / Sign In */}
          <button
            onClick={() => navigateTo('account')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#292929] hover:bg-[#FCF3E2] transition-colors cursor-pointer"
            title={user ? `Signed in as ${user.name}` : 'Sign In'}
          >
            <User className="w-4 h-4 text-[#292929]" />
            <span className="hidden sm:inline">
              {user ? user.name.split(' ')[0] : 'Sign In'}
            </span>
          </button>

          {/* Shopping Cart Icon with Badge */}
          <button
            onClick={() => setIsCartOpen(true)}
            aria-label="View shopping cart"
            className="relative p-2.5 rounded-xl text-[#292929] hover:bg-[#FCF3E2] transition-colors focus-visible:ring-2 focus-visible:ring-[#A64B3C] cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-[#A64B3C] text-[#FFFCF7] text-[11px] font-bold rounded-full shadow-sm animate-in zoom-in-50 duration-200">
                {cartCount}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* Mobile Search Dropdown row */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-[#EADCC8]">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search cozy wallpapers..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-9 py-2 text-xs bg-[#FCF3E2] border border-[#EADCC8] rounded-full text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
            />
            <Search className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#292929] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
};

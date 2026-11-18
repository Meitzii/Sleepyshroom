import React from 'react';
import { SlidersHorizontal, X, Check, RotateCcw, Sparkles, Tag } from 'lucide-react';

export interface CollectionFilterState {
  category: string;
  maxPrice: number;
  onSaleOnly: boolean;
  bundlesOnly: boolean;
  productType: string;
  sortBy: 'featured' | 'newest' | 'price-low' | 'price-high' | 'best-selling';
}

interface CollectionFiltersProps {
  filters: CollectionFilterState;
  onChange: (next: Partial<CollectionFilterState>) => void;
  onReset: () => void;
  availableProductTypes: string[];
  priceCeiling: number;
  hasActiveFilters: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  showBundleToggle?: boolean;
}

export const CollectionFilters: React.FC<CollectionFiltersProps> = ({
  filters,
  onChange,
  onReset,
  availableProductTypes,
  priceCeiling,
  hasActiveFilters,
  mobileOpen,
  onCloseMobile,
  showBundleToggle = true,
}) => {
  const maxSlider = Math.max(10, Math.ceil(priceCeiling));

  return (
    <aside
      className={`${
        mobileOpen
          ? 'fixed inset-0 z-50 bg-[#292929]/50 backdrop-blur-xs flex justify-end lg:static lg:bg-transparent lg:backdrop-blur-none lg:block'
          : 'hidden lg:block'
      } lg:col-span-3`}
    >
      <div
        className={`${
          mobileOpen
            ? 'w-80 max-w-[90vw] h-full overflow-y-auto bg-[#FFFFFF] p-6 shadow-2xl'
            : 'bg-[#FFFFFF] rounded-3xl p-5 border border-neutral-200 sticky top-36'
        } space-y-6`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#292929] flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#A64B3C]" />
            <span>Filter Collection</span>
          </span>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] font-bold text-[#A64B3C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            {mobileOpen && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg bg-neutral-100 text-[#292929] border border-neutral-200"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-[#292929]">Highlights & Offers</h3>
          <button
            type="button"
            onClick={() => onChange({ onSaleOnly: !filters.onSaleOnly })}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              filters.onSaleOnly
                ? 'bg-[#A64B3C] text-[#FFFCF7] border-[#8E3E30] shadow-xs'
                : 'bg-[#FFFFFF] text-[#292929] border-neutral-200 hover:border-[#A64B3C]/40 hover:bg-neutral-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>On Sale Only</span>
            </span>
            {filters.onSaleOnly && <Check className="w-3.5 h-3.5" />}
          </button>

          {showBundleToggle && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  bundlesOnly: !filters.bundlesOnly,
                  category: !filters.bundlesOnly ? 'bundle' : 'all',
                })
              }
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filters.bundlesOnly
                  ? 'bg-[#A64B3C] text-[#FFFCF7] border-[#8E3E30] shadow-xs'
                  : 'bg-[#FFFFFF] text-[#292929] border-neutral-200 hover:border-[#A64B3C]/40 hover:bg-neutral-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Theme Bundles Only</span>
              </span>
              {filters.bundlesOnly && <Check className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Product Type */}
        {availableProductTypes.length > 1 && (
          <div className="border-t border-neutral-200 pt-4 space-y-2">
            <h3 className="text-xs font-bold text-[#292929]">Product Type</h3>
            <div className="space-y-1.5">
              {['all', ...availableProductTypes].map((type) => {
                const labelMap: Record<string, string> = {
                  all: 'All Product Types',
                  wallpaper: 'Wallpapers',
                  icon_pack: 'Icon Packs',
                  bundle: 'Complete Bundles',
                  stationery: 'Digital Stationery',
                };
                const active = filters.productType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange({ productType: type })}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-neutral-50 text-[#292929] border border-[#A64B3C]/40'
                        : 'text-[#777777] hover:bg-neutral-50'
                    }`}
                  >
                    <span>{labelMap[type] || type}</span>
                    {active && <Check className="w-3.5 h-3.5 text-[#A64B3C]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Max Price Filter */}
        <div className="border-t border-[#EADCC8] pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#292929]">Maximum Price</h3>
            <span className="text-xs font-extrabold text-[#A64B3C] tabular-nums">
              ${filters.maxPrice.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxSlider}
            step={0.5}
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
            aria-label="Filter by maximum price"
            className="w-full accent-[#A64B3C] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#777777] font-bold mt-1">
            <span>Free ($0)</span>
            <span>${maxSlider.toFixed(2)}</span>
          </div>
        </div>

        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="w-full py-3 rounded-xl bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold cursor-pointer lg:hidden"
          >
            Apply Filters
          </button>
        )}
      </div>
    </aside>
  );
};

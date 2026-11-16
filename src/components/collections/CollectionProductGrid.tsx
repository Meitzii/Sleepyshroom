import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import type { Product } from '../../types/index.ts';
import { ProductCard } from '../common/ProductCard.tsx';
import type { CollectionFilterState } from './CollectionFilters.tsx';

interface CollectionProductGridProps {
  products: Product[];
  sortBy: CollectionFilterState['sortBy'];
  onSortChange: (sort: CollectionFilterState['sortBy']) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onOpenMobileFilters: () => void;
}

export const CollectionProductGrid: React.FC<CollectionProductGridProps> = ({
  products,
  sortBy,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  onOpenMobileFilters,
}) => {
  return (
    <div className="lg:col-span-9 space-y-6">
      {/* Toolbar: Matching count + mobile filters + sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#777777]">
            Showing <span className="font-extrabold text-[#292929]">{products.length}</span>{' '}
            {products.length === 1 ? 'design' : 'designs'}
          </span>

          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-xs font-bold text-[#292929] cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[#A64B3C]" />
            <span>Filters</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="collection-sort" className="text-xs font-bold text-[#777777]">
            Sort by:
          </label>
          <select
            id="collection-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as CollectionFilterState['sortBy'])}
            className="text-xs font-bold text-[#292929] bg-[#FFFCF7] border border-[#EADCC8] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/30 cursor-pointer"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="best-selling">Best Selling</option>
          </select>
        </div>
      </div>

      {/* Product Grid or Cozy Empty State */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-[#FCF3E2] rounded-3xl p-10 sm:p-14 text-center border border-[#EADCC8]">
          <p className="text-3xl mb-3">🍄</p>
          <h3 className="font-heading font-bold text-lg text-[#292929] mb-2">
            No designs match these filters
          </h3>
          <p className="text-xs sm:text-sm text-[#777777] font-medium max-w-md mx-auto mb-5">
            Try clearing your active filters or switching categories to explore the rest of this collection.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};

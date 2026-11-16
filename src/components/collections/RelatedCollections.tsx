import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { Collection } from '../../types/index.ts';
import { useShop } from '../../context/ShopContext.tsx';

interface RelatedCollectionsProps {
  collections: Collection[];
}

export const RelatedCollections: React.FC<RelatedCollectionsProps> = ({ collections }) => {
  const { navigateTo } = useShop();

  if (!collections || collections.length === 0) return null;

  return (
    <section className="py-14 border-t border-[#EADCC8] bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A64B3C] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Keep Exploring</span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929]">
              More Cozy Theme Collections
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('collections')}
            className="text-xs font-bold text-[#A64B3C] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => navigateTo('collections', col.slug)}
              className="group text-left bg-[#FCF3E2] rounded-3xl border border-[#EADCC8] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer"
            >
              <div className="aspect-16/10 w-full overflow-hidden bg-[#EADCC8]/40 relative">
                <img
                  src={col.coverImage}
                  alt={col.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {col.isNew && (
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-[10px] font-extrabold">
                    NEW
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="font-heading font-bold text-base text-[#292929] group-hover:text-[#A64B3C] transition-colors">
                    {col.name}
                  </h3>
                  <p className="text-xs text-[#777777] line-clamp-2 mt-1 font-medium">
                    {col.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#EADCC8] flex items-center justify-between text-[11px] font-bold text-[#A64B3C]">
                  <span>{col.productCount ?? 0} designs</span>
                  <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

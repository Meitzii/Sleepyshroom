import React from 'react';
import { Sparkles, Home, ChevronRight, Layers, Smartphone, Monitor } from 'lucide-react';
import type { Collection } from '../../types/index.ts';
import { useShop } from '../../context/ShopContext.tsx';

interface CollectionHeroProps {
  collection: Collection;
  totalProducts: number;
}

export const CollectionHero: React.FC<CollectionHeroProps> = ({ collection, totalProducts }) => {
  const { navigateTo } = useShop();

  const heroImage = collection.bannerImage || collection.coverImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg';

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#FCF3E2] to-[#FFFCF7] border-b border-[#EADCC8] pb-12 sm:pb-16 pt-6 sm:pt-8">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-[#EADCC8]/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 rounded-full bg-[#A64B3C]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#777777] font-medium mb-6 flex-wrap">
          <button
            onClick={() => navigateTo('home')}
            className="hover:text-[#A64B3C] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#EADCC8]" />
          <button
            onClick={() => navigateTo('collections')}
            className="hover:text-[#A64B3C] transition-colors cursor-pointer"
          >
            Collections
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#EADCC8]" />
          <span className="text-[#292929] font-bold truncate max-w-[200px] sm:max-w-none">
            {collection.name}
          </span>
        </nav>

        {/* Hero Card Container */}
        <div className="bg-[#FFFCF7] rounded-3xl border border-[#EADCC8] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Column: Collection Information */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FCF3E2] text-[#A64B3C] border border-[#EADCC8]">
                <Sparkles className="w-3 h-3 text-[#A64B3C]" />
                Curated Theme Collection
              </span>

              {collection.isNew && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#A64B3C] text-[#FFFCF7] shadow-xs">
                  NEW RELEASE
                </span>
              )}

              {collection.featured && !collection.isNew && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#292929] text-[#FFFCF7]">
                  FEATURED
                </span>
              )}
            </div>

            {/* Collection Title */}
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#292929] tracking-tight mb-4 leading-tight">
              {collection.name}
            </h1>

            {/* Charming Description */}
            <p className="text-sm sm:text-base text-[#777777] leading-relaxed mb-8 max-w-xl">
              {collection.description || 'Step into this peaceful collection of cozy illustrations, soft palettes, and tranquil digital aesthetics crafted for all your screens.'}
            </p>

            {/* Collection Highlights / Meta */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#EADCC8]/80 text-center sm:text-left">
              <div className="bg-[#FCF3E2]/60 rounded-2xl p-3 border border-[#EADCC8]/60">
                <div className="text-xs text-[#777777] font-medium flex items-center gap-1 justify-center sm:justify-start">
                  <Layers className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Items</span>
                </div>
                <div className="text-lg font-extrabold text-[#292929] mt-0.5">
                  {totalProducts} {totalProducts === 1 ? 'Design' : 'Designs'}
                </div>
              </div>

              <div className="bg-[#FCF3E2]/60 rounded-2xl p-3 border border-[#EADCC8]/60">
                <div className="text-xs text-[#777777] font-medium flex items-center gap-1 justify-center sm:justify-start">
                  <Monitor className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Resolution</span>
                </div>
                <div className="text-lg font-extrabold text-[#292929] mt-0.5">
                  4K & 5K UHD
                </div>
              </div>

              <div className="bg-[#FCF3E2]/60 rounded-2xl p-3 border border-[#EADCC8]/60">
                <div className="text-xs text-[#777777] font-medium flex items-center gap-1 justify-center sm:justify-start">
                  <Smartphone className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Delivery</span>
                </div>
                <div className="text-lg font-extrabold text-[#292929] mt-0.5">
                  Instant
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Theme Banner Artwork */}
          <div className="lg:col-span-5 relative min-h-[260px] sm:min-h-[340px] lg:min-h-full bg-[#FCF3E2] overflow-hidden">
            <img
              src={heroImage}
              alt={collection.name}
              className="w-full h-full object-cover object-center select-none"
              loading="eager"
            />
            {/* Subtle bottom gradient shadow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            
            {/* Theme watermark badge */}
            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#EADCC8] text-[11px] font-bold text-[#292929] shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#A64B3C]" />
              <span>sleepyshroom original artwork</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

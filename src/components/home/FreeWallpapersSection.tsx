import React from 'react';
import { Gift, Sparkles, Download, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ProductCard } from '../common/ProductCard.tsx';
import { ScrollReveal } from '../common/ScrollReveal.tsx';

export const FreeWallpapersSection: React.FC = () => {
  const { products, navigateTo } = useShop();

  const freeProducts = products.filter(p => p.isFree || p.price === 0);

  if (freeProducts.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 relative overflow-hidden bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Card */}
        <div className="bg-[#FCF3E2] border-2 border-[#EADCC8] rounded-3xl p-6 sm:p-10 shadow-sm relative">
          
          {/* Subtle Decorative Mushroom Badges */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 bg-[#FFFCF7] text-[#292929] border border-[#EADCC8] px-3 py-1 rounded-full text-xs font-bold">
            <Gift className="w-3.5 h-3.5 text-[#A64B3C]" />
            <span>100% Free Gifts</span>
          </div>

          <div className="max-w-2xl mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A64B3C] uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#A64B3C]" />
              <span>A Sweet Welcome Gift</span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929] tracking-tight">
              Complimentary Cozy Freebies
            </h2>
            <p className="mt-2 text-sm text-[#777777] font-medium leading-relaxed">
              Find a little happiness for your screens right away! Enjoy these two hand-crafted wallpapers completely free — instant 1-click download with no checkout required, ready for your phone, tablet, and desktop.
            </p>

            {/* Quick reassurance perks */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#292929]">
              <span className="inline-flex items-center gap-1.5 bg-[#FFFCF7] px-2.5 py-1 rounded-lg border border-[#EADCC8]">
                <Download className="w-3.5 h-3.5 text-[#A64B3C]" />
                <span>Instant 1-Click Download</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#FFFCF7] px-2.5 py-1 rounded-lg border border-[#EADCC8]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A64B3C]" />
                <span>Zero Cost / No Checkout Needed</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#FFFCF7] px-2.5 py-1 rounded-lg border border-[#EADCC8]">
                <Heart className="w-3.5 h-3.5 text-[#A64B3C]" />
                <span>Personal & Device Enjoyment</span>
              </span>
            </div>
          </div>

          {/* Product Cards Grid for Freebies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {freeProducts.map((product, idx) => (
              <ScrollReveal
                key={product.id}
                direction="up"
                distance={18}
                delayMs={idx * 100}
                durationMs={600}
              >
                <ProductCard
                  product={product}
                  orientation={product.deviceTypes.includes('desktop') ? 'landscape' : 'portrait'}
                />
              </ScrollReveal>
            ))}
          </div>

          {/* Bottom Callout */}
          <div className="mt-8 pt-6 border-t border-[#EADCC8] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#777777] font-medium text-center sm:text-left">
              Loved your free gifts? Explore the full collection of cozy themes to match all your displays!
            </p>
            <button
              onClick={() => navigateTo('collections')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A64B3C] text-[#FFFCF7] font-bold text-xs hover:bg-[#8E3E30] transition-all shrink-0 cursor-pointer"
            >
              <span>Browse All Wallpaper Themes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

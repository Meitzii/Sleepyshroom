import React from 'react';
import { Gift, Download, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ProductCard } from '../common/ProductCard.tsx';
import { ScrollReveal } from '../common/ScrollReveal.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';

export const FreeWallpapersSection: React.FC = () => {
  const { products, navigateTo } = useShop();

  const freeProducts = products.filter((p) => p.isFree || p.price === 0);

  if (freeProducts.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 relative overflow-hidden bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clean Minimalist Freebies Container */}
        <div className="bg-[#FFFFFF] border border-neutral-200 rounded-3xl p-6 sm:p-10 shadow-xs relative">
          {/* Free Gift Corner Tag */}
          <div className="hidden sm:flex absolute top-6 right-8 items-center gap-1.5 text-xs font-bold text-[#A64B3C]">
            <Gift className="w-4 h-4" />
            <span>100% Free Gifts</span>
          </div>

          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
            <SectionHeading
              as="h2"
              size="md"
              subtitle="Find a little happiness for your screens right away! Enjoy these two hand-crafted wallpapers completely free — instant 1-click download with no checkout required, ready for your phone, tablet, and desktop."
            >
              Freebies
            </SectionHeading>

            {/* Quick reassurance perks */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#292929]">
              <span className="inline-flex items-center gap-1.5 bg-neutral-50 px-3 py-1 rounded-lg border border-neutral-200">
                <Download className="w-3.5 h-3.5 text-[#A64B3C]" />
                <span>Instant 1-Click Download</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-neutral-50 px-3 py-1 rounded-lg border border-neutral-200">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A64B3C]" />
                <span>Zero Cost / No Checkout Needed</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-neutral-50 px-3 py-1 rounded-lg border border-neutral-200">
                <Heart className="w-3.5 h-3.5 text-[#A64B3C]" />
                <span>Personal &amp; Device Enjoyment</span>
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
          <div className="mt-8 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#777777] font-medium text-center sm:text-left">
              Loved your free gifts? Explore the full collection of cozy themes to match all your displays!
            </p>
            <button
              type="button"
              onClick={() => navigateTo('collections')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A64B3C] text-[#FFFFFF] font-bold text-xs hover:bg-[#8E3E30] transition-all shrink-0 cursor-pointer"
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

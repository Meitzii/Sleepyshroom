import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ProductCard } from '../common/ProductCard.tsx';
import { ScrollReveal } from '../common/ScrollReveal.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';
import { isStationeryProduct } from '../../data/stationeryCatalog.ts';

export const FreeWallpapersSection: React.FC = () => {
  const { products, navigateTo } = useShop();

  const freeProducts = products.filter(
    (p) => !isStationeryProduct(p) && (p.isFree || p.price === 0)
  );

  if (freeProducts.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 relative overflow-hidden bg-[#FFFFFF] border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Section Header matching Desktop & Mobile Themes */}
        <div className="mb-10 text-center">
          <SectionHeading as="h2" size="md">
            Freebies
          </SectionHeading>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => navigateTo('collections', 'free=true')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#292929] hover:text-[#A64B3C] transition-colors group cursor-pointer"
            >
              <span>See All Freebies</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
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
      </div>
    </section>
  );
};


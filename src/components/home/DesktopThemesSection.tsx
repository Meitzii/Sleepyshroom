import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ProductCard } from '../common/ProductCard.tsx';
import { ScrollReveal } from '../common/ScrollReveal.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';
import { isStationeryProduct } from '../../data/stationeryCatalog.ts';

export const DesktopThemesSection: React.FC = () => {
  const { products, navigateTo } = useShop();

  const desktopProducts = products
    .filter((p) => !isStationeryProduct(p) && p.deviceTypes.includes('desktop'))
    .slice(0, 4);

  return (
    <section className="py-12 sm:py-16 bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Section Header */}
        <div className="mb-10 text-center">
          <SectionHeading as="h2" size="md">
            Desktop Themes
          </SectionHeading>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => navigateTo('collections', 'device=desktop')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#292929] hover:text-[#A64B3C] transition-colors group cursor-pointer"
            >
              <span>See All Desktop Themes</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {desktopProducts.map((product, idx) => (
            <ScrollReveal
              key={product.id}
              direction="up"
              distance={18}
              delayMs={idx * 75}
              durationMs={600}
            >
              <ProductCard product={product} orientation="landscape" />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

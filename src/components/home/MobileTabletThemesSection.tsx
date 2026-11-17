import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ProductCard } from '../common/ProductCard.tsx';
import { ScrollReveal } from '../common/ScrollReveal.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';

export const MobileTabletThemesSection: React.FC = () => {
  const { products, navigateTo } = useShop();

  const mobileProducts = products
    .filter((p) => p.deviceTypes.includes('mobile') || p.deviceTypes.includes('tablet'))
    .slice(0, 4);

  return (
    <section className="py-12 sm:py-16 bg-[#FFFFFF] border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Section Header */}
        <div className="mb-10 text-center">
          <SectionHeading as="h2" size="md">
            Mobile &amp; Tablet Themes
          </SectionHeading>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => navigateTo('collections', 'device=mobile')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#292929] hover:text-[#A64B3C] transition-colors group cursor-pointer"
            >
              <span>See All Mobile &amp; Tablet Themes</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Product Grid with Portrait Orientation */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {mobileProducts.map((product, idx) => (
            <ScrollReveal
              key={product.id}
              direction="up"
              distance={18}
              delayMs={idx * 75}
              durationMs={600}
            >
              <ProductCard product={product} orientation="portrait" />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

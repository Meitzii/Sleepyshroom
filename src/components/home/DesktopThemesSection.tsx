import React from 'react';
import { ArrowRight, Monitor } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ProductCard } from '../common/ProductCard.tsx';
import { ScrollReveal } from '../common/ScrollReveal.tsx';

export const DesktopThemesSection: React.FC = () => {
  const { products, navigateTo } = useShop();

  const desktopProducts = products
    .filter(p => p.deviceTypes.includes('desktop'))
    .slice(0, 4);

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with See All */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#777777] uppercase tracking-wider mb-1">
              <Monitor className="w-3.5 h-3.5 text-[#A64B3C]" />
              <span>Computer Wallpapers</span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929] tracking-tight">
              Desktop Themes
            </h2>
            <p className="mt-1 text-sm text-[#777777] font-medium">
              Give your workspace a little cozy magic.
            </p>
          </div>

          <button
            onClick={() => navigateTo('collections', 'device=desktop')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#292929] hover:text-[#A64B3C] transition-colors group self-start sm:self-auto cursor-pointer"
          >
            <span>See All Desktop Themes</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
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

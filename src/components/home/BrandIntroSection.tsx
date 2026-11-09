import React from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ShroomLogoIcon } from '../common/Icons.tsx';

export const BrandIntroSection: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const heading = settings?.brandIntroHeading || 'A little corner of cozy.';
  const text = settings?.brandIntroText || 'sleepyshroom is a little digital corner for people who love soft colors, dreamy illustrations, and making their devices feel like home.';

  return (
    <section className="py-14 sm:py-20 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Soft Background Card */}
        <div className="bg-[#FCF3E2] rounded-3xl p-8 sm:p-12 border border-[#EADCC8] shadow-sm relative overflow-hidden">
          
          {/* Subtle Ambient Dots */}
          <div className="absolute top-4 right-6 text-[#A64B3C] opacity-60">✨</div>
          <div className="absolute bottom-6 left-6 text-[#A64B3C] opacity-60">🌸</div>

          {/* Mushroom Illustration */}
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8]">
              <ShroomLogoIcon size={56} />
            </div>
          </div>

          {/* Heading */}
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929] tracking-tight mb-4">
            {heading}
          </h2>

          {/* Text */}
          <p className="text-base sm:text-lg text-[#777777] font-medium leading-relaxed max-w-2xl mx-auto mb-7">
            {text}
          </p>

          {/* About Me Button */}
          <div>
            <button
              onClick={() => navigateTo('about')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 text-[#FFFCF7]" />
              <span>About Me</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

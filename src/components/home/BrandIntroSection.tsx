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
        <div className="bg-[#F9F6F0] rounded-3xl p-8 sm:p-12 border border-[#E8C9C1] shadow-sm relative overflow-hidden">
          
          {/* Subtle Ambient Dots */}
          <div className="absolute top-4 right-6 text-[#FFD58A] opacity-60">✨</div>
          <div className="absolute bottom-6 left-6 text-[#A99BEA] opacity-60">🌸</div>

          {/* Mushroom Illustration */}
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-[#E8C9C1]/30 rounded-2xl border border-[#E8C9C1]">
              <ShroomLogoIcon size={56} />
            </div>
          </div>

          {/* Heading */}
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#1E1419] tracking-tight mb-4">
            {heading}
          </h2>

          {/* Text */}
          <p className="text-base sm:text-lg text-[#33222C] font-medium leading-relaxed max-w-2xl mx-auto mb-7">
            {text}
          </p>

          {/* About Me Button */}
          <div>
            <button
              onClick={() => navigateTo('about')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#F7F3E9] bg-[#8B6F7A] hover:bg-[#785E69] active:scale-98 rounded-xl shadow-xs transition-all"
            >
              <Heart className="w-4 h-4 text-[#FFD58A]" />
              <span>About Me</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};

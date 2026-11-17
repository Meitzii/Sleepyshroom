import React from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { ShroomLogoIcon } from '../common/Icons.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';

export const BrandIntroSection: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const heading = settings?.brandIntroHeading || 'A little corner of cozy.';
  const text =
    settings?.brandIntroText ||
    'sleepyshroom is a little digital corner for people who love soft colors, dreamy illustrations, and making their devices feel like home.';

  return (
    <section className="py-14 sm:py-20 bg-[#FFFFFF] border-t border-neutral-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Clean White Minimalist Card */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 sm:p-12 border border-neutral-200 shadow-xs">
          {/* Mushroom Illustration */}
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-[#FFFFFF] rounded-2xl border border-neutral-200">
              <ShroomLogoIcon size={52} />
            </div>
          </div>

          {/* Centered Delicate Heading */}
          <SectionHeading as="h2" size="md" className="mb-4">
            {heading}
          </SectionHeading>

          {/* Text */}
          <p className="text-base sm:text-lg text-[#777777] font-medium leading-relaxed max-w-2xl mx-auto mb-7">
            {text}
          </p>

          {/* About Me Button */}
          <div>
            <button
              type="button"
              onClick={() => navigateTo('about')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#FFFFFF] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 text-[#FFFFFF]" />
              <span>About Me</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

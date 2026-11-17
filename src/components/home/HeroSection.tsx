import React from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';

interface HeroSectionProps {
  onScrollToThemes: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToThemes }) => {
  const { settings, navigateTo } = useShop();

  const headline = settings?.heroHeadline || 'Cozy wallpapers for your dreamy days.';
  const subtext =
    settings?.heroSupportingText ||
    'Find a little happiness in every screen. Discover cozy, cute, and dreamy digital wallpapers made with love.';
  const primaryBtn = settings?.heroPrimaryBtnText || 'Explore Themes';
  const secondaryBtn = settings?.heroSecondaryBtnText || 'Browse Wallpapers';

  return (
    <section className="bg-[#FFFFFF] pt-6 pb-10 sm:pt-10 sm:pb-14 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Welcome Headline, Descriptions & CTAs */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-6">
            {/* Subtle Tagline Kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A64B3C]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Digital Stationery &amp; Cozy Wallpapers</span>
            </div>

            {/* Main Welcome Headline */}
            <h1 className="font-section-serif font-normal text-4xl sm:text-5xl lg:text-[58px] text-[#292929] tracking-tight leading-[1.12] text-balance">
              {headline}
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg text-[#777777] font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
              {subtext}
            </p>

            {/* Primary & Secondary Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <button
                type="button"
                onClick={onScrollToThemes}
                className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-bold text-[#FFFFFF] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{primaryBtn}</span>
                <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigateTo('collections')}
                className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-bold text-[#292929] bg-[#FFFFFF] hover:bg-neutral-50 active:scale-98 rounded-2xl border border-neutral-300 transition-all flex items-center justify-center cursor-pointer"
              >
                {secondaryBtn}
              </button>
            </div>

            {/* Trust Points */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-[#777777] font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A64B3C]" />
                Instant Digital Download
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A64B3C]" />
                4K &amp; 5K Ultra-Retina
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A64B3C]" />
                Desktop, Mobile &amp; Tablet
              </span>
            </div>
          </div>

          {/* Right Column: Large Seamless Mushroom Vector Illustration (No Borders, Outlines, or Frame) */}
          <div className="lg:col-span-7 flex items-center justify-center">
            <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-none bg-[#FFFFFF] overflow-hidden">
              <img
                src="/assets/aistudio/image_b3079c64.png"
                alt="Sleepyshroom cozy mushroom illustration"
                className="w-full h-auto object-contain select-none mix-blend-multiply border-0 outline-none shadow-none scale-[1.24] sm:scale-[1.26] origin-center"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

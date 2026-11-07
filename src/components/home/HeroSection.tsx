import React from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';

interface HeroSectionProps {
  onScrollToThemes: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToThemes }) => {
  const { settings, navigateTo } = useShop();

  const headline = settings?.heroHeadline || 'Cozy wallpapers for your dreamy days.';
  const subtext = settings?.heroSupportingText || 'Find a little happiness in every screen. Discover cozy, cute, and dreamy digital wallpapers made with love.';
  const primaryBtn = settings?.heroPrimaryBtnText || 'Explore Themes';
  const secondaryBtn = settings?.heroSecondaryBtnText || 'Browse Wallpapers';
  const heroImg = settings?.heroImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg';

  return (
    <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-20">
      {/* Soft Background Accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#E8C9C1]/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-[#D6C8F2]/25 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            
            {/* Subtle Tagline kicker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8C9C1]/40 border border-[#E8C9C1] text-xs font-bold text-[#3B2633]">
              <Sparkles className="w-3.5 h-3.5 text-[#3B2633]" />
              <span>Digital Stationery & Cozy Wallpapers</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#1E1419] tracking-tight leading-[1.15] text-balance">
              {headline}
            </h1>

            {/* Supporting Prose */}
            <p className="text-base sm:text-lg text-[#33222C] font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
              {subtext}
            </p>

            {/* Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <button
                onClick={onScrollToThemes}
                className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-bold text-[#F7F3E9] bg-[#8B6F7A] hover:bg-[#785E69] active:scale-98 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 group"
              >
                <span>{primaryBtn}</span>
                <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              </button>

              <button
                onClick={() => navigateTo('collections')}
                className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-bold text-[#24171E] bg-[#F4EAE6] hover:bg-[#E8C9C1]/60 active:scale-98 rounded-2xl border border-[#E8C9C1] transition-all flex items-center justify-center"
              >
                {secondaryBtn}
              </button>
            </div>

            {/* Trust points */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-[#382430] font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B6F7A]" />
                Instant Digital Download
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B6F7A]" />
                4K & 5K Ultra-Retina
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B6F7A]" />
                Desktop, Mobile & Tablet
              </span>
            </div>

          </div>

          {/* Right Column: Hero Illustration Container */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Decorative Frame */}
              <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-[#FDFBF7] bg-[#E8C9C1]/30 aspect-16/10 group">
                <img
                  src={heroImg}
                  alt="sleepyshroom cozy mushroom cottage"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                />

                {/* Subtle scrim & badge */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E1419]/25 via-transparent to-transparent pointer-events-none" />
                
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-[#F7F3E9]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E8C9C1] shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD58A]" />
                  <span className="text-[11px] font-bold text-[#24171E]">
                    Handcrafted with love
                  </span>
                </div>
              </div>

              {/* Floating cute stamp badge */}
              <div className="absolute -bottom-4 -left-3 sm:-bottom-6 sm:-left-6 bg-[#D6C8F2]/90 backdrop-blur-md border-2 border-white rounded-2xl p-3 shadow-md hidden sm:flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F7F3E9] flex items-center justify-center text-sm shadow-xs">
                  🍄
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1E1419] leading-tight">
                    sleepyshroom
                  </p>
                  <p className="text-[10px] text-[#3B2834] font-medium">
                    Cottagecore Sanctuary
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

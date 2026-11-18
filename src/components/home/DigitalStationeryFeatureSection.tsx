import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';

export const DigitalStationeryFeatureSection: React.FC = () => {
  const { navigateTo } = useShop();

  const handleExploreStationery = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigateTo('collections', 'digital-stationery');
  };

  return (
    <section
      id="digital-stationery-feature"
      className="py-12 sm:py-16 bg-[#FFFFFF] border-b border-neutral-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-5xl mx-auto">
          <div className="bg-[#FFFFFF] rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
              {/* Left Column: Editorial Copy & Lower-Left Explore More CTA */}
              <div className="md:col-span-5 order-2 md:order-1 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#FFFFFF]">
                <div className="space-y-4">
                  {/* Subtle Stationery Flourish */}
                  <div className="inline-flex items-center gap-2 text-[#A64B3C]" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="shrink-0"
                    >
                      <path d="M12 2L14.3 9.7L22 12L14.3 14.3L12 22L9.7 14.3L2 12L9.7 9.7L12 2Z" />
                    </svg>
                    <span className="h-px w-8 bg-[#EADCC8]" />
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="opacity-75 shrink-0"
                    >
                      <path d="M12 2L14.3 9.7L22 12L14.3 14.3L12 22L9.7 14.3L2 12L9.7 9.7L12 2Z" />
                    </svg>
                  </div>

                  <h2 className="font-section-serif font-medium text-2xl sm:text-3xl text-[#292929] tracking-tight">
                    Digital Stationery
                  </h2>

                  <p className="text-sm sm:text-base text-[#777777] font-medium leading-relaxed">
                    Little tools for your everyday thoughts, plans, and dreams. Make every day a
                    little more organized and a little more magical.
                  </p>
                </div>

                {/* Lower-Left Corner CTA Button */}
                <div className="pt-8 md:pt-6">
                  <a
                    href="/collections/digital-stationery"
                    onClick={handleExploreStationery}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#FFFFFF] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 rounded-xl shadow-xs transition-all group cursor-pointer"
                  >
                    <span>Explore More</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </div>

              {/* Right Column: Cozy Digital Stationery Illustration */}
              <div className="md:col-span-7 order-1 md:order-2 relative aspect-16/10 bg-[#FCF3E2] border-b md:border-b-0 md:border-l border-[#EADCC8]/70 overflow-hidden">
                <img
                  src="/src/assets/images/stationery_homepage_feature_1794968172632.jpg"
                  alt="Cozy hand-drawn digital stationery illustration with open notebook, twine-tied paper sheets, wooden pen, stars, and little woodland mushrooms"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

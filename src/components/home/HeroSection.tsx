import React, { useState, useEffect, useRef, TouchEvent } from 'react';
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';

interface HeroSectionProps {
  onScrollToThemes: () => void;
}

interface WelcomeSlide {
  id: string;
  imageUrl: string;
  label: string;
  caption: string;
  linkCollectionQuery?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToThemes }) => {
  const { settings, carouselSlides, collections, navigateTo } = useShop();

  const headline = settings?.heroHeadline || 'Cozy wallpapers for your dreamy days.';
  const subtext =
    settings?.heroSupportingText ||
    'Find a little happiness in every screen. Discover cozy, cute, and dreamy digital wallpapers made with love.';
  const primaryBtn = settings?.heroPrimaryBtnText || 'Explore Themes';
  const secondaryBtn = settings?.heroSecondaryBtnText || 'Browse Wallpapers';
  const heroImg =
    settings?.heroImage || '/src/assets/images/hero_mushroom_cottage_1794020164209.jpg';

  const publishedSlides = carouselSlides.filter(
    (s) => s.visible && s.status === 'published' && Boolean(s.imageUrl)
  );

  const welcomeSlides: WelcomeSlide[] = [
    {
      id: 'welcome-hero',
      imageUrl: heroImg,
      label: settings?.storeName || 'sleepyshroom',
      caption: 'Handcrafted with love',
    },
    ...publishedSlides.map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl,
      label: s.themeTitle,
      caption: s.description,
      linkCollectionQuery: s.themeTitle,
    })),
  ];

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = welcomeSlides.length;

  useEffect(() => {
    if (activeSlideIndex >= totalSlides) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, totalSlides]);

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused, totalSlides]);

  const prevSlide = () => {
    if (totalSlides <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const nextSlide = () => {
    if (totalSlides <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (delta > 45) nextSlide();
    else if (delta < -45) prevSlide();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleSlideExplore = (slide: WelcomeSlide) => {
    if (!slide.linkCollectionQuery) {
      navigateTo('collections');
      return;
    }
    const matched = collections.find(
      (c) =>
        c.theme?.toLowerCase() === slide.linkCollectionQuery?.toLowerCase() ||
        c.name.toLowerCase() === slide.linkCollectionQuery?.toLowerCase()
    );
    if (matched) {
      navigateTo('collections', matched.slug);
    } else {
      navigateTo('collections', `theme=${encodeURIComponent(slide.linkCollectionQuery)}`);
    }
  };

  const currentSlide = welcomeSlides[activeSlideIndex] || welcomeSlides[0];

  return (
    <section className="bg-[#FFFFFF] pt-8 pb-12 sm:pt-14 sm:pb-18">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Welcome Headline, Descriptions & CTAs */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            {/* Subtle Tagline Kicker */}
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A64B3C]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Digital Stationery &amp; Cozy Wallpapers</span>
            </div>

            {/* Main Welcome Headline */}
            <h1 className="font-section-serif font-normal text-4xl sm:text-5xl lg:text-[54px] text-[#292929] tracking-tight leading-[1.12] text-balance">
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

          {/* Right Column: Welcoming Carousel Frame */}
          <div className="lg:col-span-6 relative">
            <div
              className="relative mx-auto max-w-xl lg:max-w-none"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative rounded-3xl overflow-hidden border border-neutral-200 bg-neutral-50 shadow-sm aspect-16/10 group">
                {welcomeSlides.map((slide, idx) => {
                  const isActive = idx === activeSlideIndex;
                  return (
                    <div
                      key={slide.id}
                      aria-hidden={!isActive}
                      className={`absolute inset-0 transition-all duration-700 ease-out ${
                        isActive
                          ? 'opacity-100 scale-100 z-10'
                          : 'opacity-0 scale-102 pointer-events-none z-0'
                      }`}
                    >
                      <img
                        src={slide.imageUrl}
                        alt={slide.label}
                        className="w-full h-full object-cover select-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#292929]/55 via-[#292929]/10 to-transparent pointer-events-none" />
                    </div>
                  );
                })}

                {/* Slide Caption Overlay & Quick Theme Explore */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-20 flex items-end justify-between gap-3">
                  <div className="bg-[#FFFFFF]/92 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-neutral-200 shadow-xs min-w-0 max-w-[75%]">
                    <p className="text-[11px] font-bold text-[#A64B3C] uppercase tracking-wider leading-tight truncate">
                      {currentSlide.label}
                    </p>
                    <p className="text-xs font-semibold text-[#292929] truncate mt-0.5">
                      {currentSlide.caption}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSlideExplore(currentSlide)}
                    aria-label={`Explore ${currentSlide.label}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFFFF]/95 hover:bg-[#A64B3C] text-[#292929] hover:text-[#FFFFFF] border border-neutral-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Prev / Next Carousel Controls */}
                {totalSlides > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevSlide}
                      aria-label="Previous welcome slide"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#292929] border border-neutral-200 shadow-xs flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextSlide}
                      aria-label="Next welcome slide"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#292929] border border-neutral-200 shadow-xs flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Clean Indicator Dots Below Carousel */}
              {totalSlides > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {welcomeSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      aria-label={`View slide ${idx + 1}: ${slide.label}`}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === activeSlideIndex
                          ? 'w-7 bg-[#A64B3C]'
                          : 'w-2 bg-neutral-300 hover:bg-[#A64B3C]/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useState, useRef, useEffect, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import type { CarouselSlide } from '../../types/index.ts';
import { ProtectedArtworkPreview } from '../common/ProtectedArtworkPreview.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';

export const ThemeCarousel: React.FC = () => {
  const { carouselSlides, collections, navigateTo } = useShop();

  // Filter visible slides
  const slides = carouselSlides.filter((s) => s.visible && s.status === 'published');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = slides.length;

  const nextSlide = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  useEffect(() => {
    if (isHovered || total <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (total === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];

  const handleExplore = (slide: CarouselSlide) => {
    const matchedCollection = collections.find(
      (c) =>
        c.theme?.toLowerCase() === slide.themeTitle.toLowerCase() ||
        c.name.toLowerCase() === slide.themeTitle.toLowerCase() ||
        c.slug.toLowerCase() === slide.themeTitle.toLowerCase().replace(/\s+/g, '-')
    );
    if (matchedCollection) {
      navigateTo('collections', matchedCollection.slug);
      return;
    }
    if (slide.linkDestination) {
      if (slide.linkDestination.startsWith('/collections/')) {
        const slug = slide.linkDestination.replace('/collections/', '').split('?')[0];
        navigateTo('collections', slug || null);
      } else if (
        slide.linkDestination.startsWith('/collections') ||
        slide.linkDestination.startsWith('/wallpaper-collections')
      ) {
        const query = slide.linkDestination.includes('?')
          ? slide.linkDestination.split('?')[1]
          : null;
        navigateTo('collections', query);
      } else {
        navigateTo('collections', `theme=${encodeURIComponent(slide.themeTitle)}`);
      }
    } else {
      navigateTo('collections', `theme=${encodeURIComponent(slide.themeTitle)}`);
    }
  };

  return (
    <section id="explore-themes" className="pt-0.5 pb-12 sm:pt-1 sm:pb-16 bg-[#FFFFFF] border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-6 sm:mb-10 text-center">
          <SectionHeading as="h2" size="md">
            Explore the Themes
          </SectionHeading>

          <div className="mt-3">
            <a
              href="/wallpaper-collections"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('collections');
              }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#292929] hover:text-[#A64B3C] transition-colors group cursor-pointer"
            >
              <span>See All Themes</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          className="relative max-w-5xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Slide Card */}
          <div className="bg-[#FFFFFF] rounded-3xl border border-neutral-200 shadow-xs overflow-hidden transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 items-center">
              {/* Slide Image / Protected Artwork Container */}
              <div className="md:col-span-7 relative aspect-16/10 bg-neutral-100 overflow-hidden">
                {currentSlide.imageUrl ? (
                  <ProtectedArtworkPreview
                    src={currentSlide.imageUrl}
                    alt={currentSlide.themeTitle}
                    watermarkOpacity={0.22}
                    showWatermark={true}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-103"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#FFFFFF] border border-neutral-200">
                    <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-[#A64B3C] mb-3 border border-neutral-200">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-[#292929]">Cozy Collection Preview</p>
                    <p className="text-xs text-[#777777] mt-1 max-w-xs font-medium">
                      New handcrafted wallpapers and seasonal themes arriving soon!
                    </p>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none md:hidden" />
              </div>

              {/* Slide Content */}
              <div className="md:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#777777]">
                  <span className="w-2 h-2 rounded-full bg-[#A64B3C]" />
                  <span>
                    Theme Spotlight · {currentIndex + 1} of {total}
                  </span>
                </div>

                <h3 className="font-section-serif font-medium text-2xl sm:text-3xl text-[#292929] tracking-tight">
                  {currentSlide.themeTitle}
                </h3>

                <p className="text-sm sm:text-base text-[#777777] font-medium leading-relaxed">
                  {currentSlide.description}
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleExplore(currentSlide)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[#FFFFFF] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 rounded-xl shadow-xs transition-all group cursor-pointer"
                  >
                    <span>{currentSlide.exploreButtonText || 'Explore Theme'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Left Arrow Button */}
          {total > 1 && (
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#FFFFFF] border border-neutral-200 text-[#292929] shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-all z-20 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {total > 1 && (
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#FFFFFF] border border-neutral-200 text-[#292929] shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-all z-20 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Carousel Indicators (Dots) */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to slide ${index + 1}: ${slide.themeTitle}`}
                  className={`transition-all rounded-full cursor-pointer ${
                    index === currentIndex
                      ? 'w-8 h-2.5 bg-[#A64B3C]'
                      : 'w-2.5 h-2.5 bg-neutral-300 hover:bg-[#A64B3C]/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

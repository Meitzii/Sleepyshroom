import React from 'react';
import { Heart, Sparkles, Coffee, Palette, ArrowRight, ShieldCheck, Mail, Monitor, Download } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from '../components/common/Icons.tsx';

export const AboutMePage: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const about = settings?.aboutMe || {
    heading: 'Welcome to our cozy little studio!',
    introduction: "Sleepyshroom is an independent digital wallpaper and stationery studio founded out of a deep love for gentle aesthetics, quiet mornings, and calming digital spaces.",
    whyStarted: "In a world where screens can often feel overstimulating and loud, we believe your devices should feel like peaceful sanctuaries. Every wallpaper begins with quiet sketches of sleepy woodland creatures, mossy cottage gardens, and warm earthy palettes designed to bring a moment of stillness every time you unlock your device.",
    designInspiration: "Inspired by Japanese stationery, vintage storybooks, rainy afternoon tea, and cottagecore nature. Every digital release is individually calibrated for high pixel density, balanced contrast, and delicate grain textures that feel like real watercolor paper.",
    profileImage: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
  };

  return (
    <div className="py-12 sm:py-16 bg-[#FFFCF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Hero Card */}
        <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Profile Image */}
            <div className="md:col-span-5">
              <div className="relative mx-auto max-w-xs aspect-square rounded-3xl overflow-hidden border-4 border-[#FFFCF7] shadow-md bg-[#EADCC8]/30">
                <img
                  src={about.profileImage || '/src/assets/images/theme_sleepy_garden_1794020165839.jpg'}
                  alt="Sleepyshroom Independent Studio"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2.5 right-2.5 bg-[#FFFCF7]/95 px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#A64B3C] border border-[#EADCC8]">
                  Independent Studio 🍄
                </div>
              </div>
            </div>

            {/* Introduction Text */}
            <div className="md:col-span-7 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A64B3C] uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-[#A64B3C] fill-current" />
                <span>The Story of Sleepyshroom</span>
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929] tracking-tight">
                {about.heading}
              </h1>
              <p className="text-sm sm:text-base text-[#777777] font-medium leading-relaxed">
                {about.introduction}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-[#292929] font-bold">
                <span className="flex items-center gap-1.5 bg-[#FFFCF7] px-3 py-1.5 rounded-xl border border-[#EADCC8]">
                  <Sparkles className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Original Illustrations</span>
                </span>
                <span className="flex items-center gap-1.5 bg-[#FFFCF7] px-3 py-1.5 rounded-xl border border-[#EADCC8]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>300 DPI Lossless</span>
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Narrative Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Why We Started */}
          <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-[#A64B3C] flex items-center justify-center mb-1">
              <Coffee className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-bold text-lg text-[#292929]">
              Our Creative Mission
            </h2>
            <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
              {about.whyStarted}
            </p>
          </div>

          {/* Design Inspiration */}
          <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-[#A64B3C] flex items-center justify-center mb-1">
              <Palette className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-bold text-lg text-[#292929]">
              Handcrafted Digital Experience
            </h2>
            <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
              {about.designInspiration}
            </p>
          </div>

        </div>

        {/* Our Quality Promises Strip */}
        <div className="bg-[#FFFCF7] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] space-y-4">
          <h3 className="font-heading font-bold text-lg text-[#292929] text-center">
            What You Can Expect From Every Download
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] space-y-1.5">
              <p className="font-bold text-[#292929] flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-[#A64B3C]" />
                <span>Multi-Device Calibration</span>
              </p>
              <p className="text-[#777777] font-medium leading-relaxed text-[11px]">
                Formatted and tested across 4K/5K desktop monitors, ultrawide displays, iPads, and iOS/Android phones with optimal icon spacing.
              </p>
            </div>

            <div className="p-4 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] space-y-1.5">
              <p className="font-bold text-[#292929] flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#A64B3C]" />
                <span>Instant &amp; Permanent Access</span>
              </p>
              <p className="text-[#777777] font-medium leading-relaxed text-[11px]">
                Instant delivery right upon checkout confirmation + email receipt with lifetime token redownload access anytime.
              </p>
            </div>

            <div className="p-4 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] space-y-1.5">
              <p className="font-bold text-[#292929] flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#A64B3C]" />
                <span>Kind Customer Support</span>
              </p>
              <p className="text-[#777777] font-medium leading-relaxed text-[11px]">
                Have a question or need device setup assistance? We're always here at <strong className="text-[#292929]">sleepyshroom@gmail.com</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Cozy Call to Action Card */}
        <div className="bg-[#FCF3E2] rounded-3xl p-8 border border-[#EADCC8] text-center space-y-4">
          <div className="flex justify-center">
            <ShroomLogoIcon size={48} />
          </div>
          <h3 className="font-heading font-bold text-xl text-[#292929]">
            Ready to make your screen a little cozier?
          </h3>
          <p className="text-xs sm:text-sm text-[#777777] font-medium max-w-md mx-auto">
            Take a look through our desktop, phone, and tablet wallpaper collections.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('collections')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Explore Wallpapers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigateTo('contact')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFFCF7] hover:bg-[#EADCC8]/50 text-[#292929] text-xs sm:text-sm font-bold rounded-xl border border-[#EADCC8] transition-all cursor-pointer"
            >
              <span>Say Hello</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

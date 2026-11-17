import React from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from '../components/common/Icons.tsx';
import { SectionHeading } from '../components/common/SectionHeading.tsx';

const DEFAULT_ABOUT_INTRO =
  "Hi, I'm Mei or Cheumeitzii the artist behind Sleepy Shroom! \n\n I’m a freelance digital artist and a graphic designer, who loves creating a cozy little worlds and cute characters. Each of my phone, tablet and desktop themes is a small slice of this world – a little scene that comes to life on your Home Screen!\n\nThank you for visiting my shop and helping me achieve my dreams of creating cute things and I hope you find something here that makes your days a little brighter!";

export const AboutMePage: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const savedIntro = settings?.aboutMe?.introduction?.trim() || '';
  const isLegacyDefaultIntro =
    !savedIntro ||
    savedIntro.startsWith("Hi! I'm the person behind sleepyshroom") ||
    savedIntro.startsWith('Sleepyshroom is an independent digital wallpaper');

  const aboutIntro = isLegacyDefaultIntro ? DEFAULT_ABOUT_INTRO : savedIntro;
  const profileImage =
    settings?.aboutMe?.profileImage || '/src/assets/images/theme_sleepy_garden_1794020165839.jpg';

  return (
    <div className="py-12 sm:py-16 bg-[#FFFFFF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Artist Introduction Card: Picture Left + Intro Right */}
        <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Profile Image */}
            <div className="md:col-span-5">
              <div className="relative mx-auto max-w-xs aspect-square rounded-3xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                <img
                  src={profileImage}
                  alt="Mei (Cheumeitzii), artist behind Sleepyshroom"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Introduction Text */}
            <div className="md:col-span-7 space-y-4 text-center md:text-left">
              <h1 className="inline-flex items-center justify-center md:justify-start gap-1.5 text-xs sm:text-sm font-bold text-[#A64B3C] uppercase tracking-wider">
                <Heart className="w-4 h-4 text-[#A64B3C] fill-current" />
                <span>About Me</span>
              </h1>
              <p className="text-sm sm:text-base text-[#777777] font-medium leading-relaxed whitespace-pre-line">
                {aboutIntro}
              </p>
            </div>
          </div>
        </div>

        {/* Cozy Call to Action Card */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 border border-neutral-200 text-center space-y-4">
          <div className="flex justify-center">
            <ShroomLogoIcon size={48} />
          </div>
          <SectionHeading as="h2" size="md">
            Ready to make your screen a little cozier?
          </SectionHeading>
          <p className="text-xs sm:text-sm text-[#777777] font-medium max-w-md mx-auto">
            Take a look through our desktop, phone, and tablet wallpaper collections.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('collections')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Explore Wallpapers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo('contact')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFFFFF] hover:bg-neutral-50 text-[#292929] text-xs sm:text-sm font-bold rounded-xl border border-neutral-200 transition-all cursor-pointer"
            >
              <span>Say Hello</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


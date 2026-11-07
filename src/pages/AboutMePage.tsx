import React from 'react';
import { Heart, Sparkles, Coffee, Palette, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from '../components/common/Icons.tsx';

export const AboutMePage: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const about = settings?.aboutMe || {
    heading: 'Hello, welcome to my little corner!',
    introduction: "Hi! I'm the person behind sleepyshroom. I created this little shop to share cozy, dreamy, and lovely designs that make everyday screens feel a little more special.",
    whyStarted: "In a world that can often feel rushed and noisy, I wanted our phones, tablets, and laptops to be calming sanctuaries. Each illustration starts with quiet pencil sketches of sleeping fungi, gentle forest creatures, and soothing pastel hues that bring peaceful moments throughout your day.",
    designInspiration: "Inspired by gentle Japanese stationery, quiet rainy mornings, fairy-tale moss gardens, and the warmth of a hot cup of tea. Every digital download is crafted with care, high pixel density, and subtle grain textures that feel like real paper.",
    profileImage: '/src/assets/images/theme_sleepy_garden_1794020165839.jpg',
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Hero Card */}
        <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-10 border border-[#E8C9C1] shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Profile Image */}
            <div className="md:col-span-5">
              <div className="relative mx-auto max-w-xs aspect-square rounded-3xl overflow-hidden border-4 border-[#FDFBF7] shadow-md bg-[#E8C9C1]/30">
                <img
                  src={about.profileImage || '/src/assets/images/theme_sleepy_garden_1794020165839.jpg'}
                  alt="Creator of sleepyshroom"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2.5 right-2.5 bg-[#F7F3E9]/90 px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#8B6F7A] border border-[#E8C9C1]">
                  Artist & Creator 🍄
                </div>
              </div>
            </div>

            {/* Introduction Text */}
            <div className="md:col-span-7 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1419] uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-[#945367] fill-current" />
                <span>The Story Behind The Shroom</span>
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#1E1419] tracking-tight">
                {about.heading}
              </h1>
              <p className="text-sm sm:text-base text-[#33222C] font-medium leading-relaxed">
                {about.introduction}
              </p>
            </div>

          </div>
        </div>

        {/* Narrative Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Why I Started */}
          <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8C9C1]/50 text-[#1E1419] flex items-center justify-center mb-1">
              <Coffee className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419]">
              Why I started sleepyshroom
            </h2>
            <p className="text-xs sm:text-sm text-[#33222C] font-medium leading-relaxed">
              {about.whyStarted}
            </p>
          </div>

          {/* Design Inspiration */}
          <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D6C8F2]/50 text-[#1E1419] flex items-center justify-center mb-1">
              <Palette className="w-5 h-5" />
            </div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419]">
              My Design Inspiration
            </h2>
            <p className="text-xs sm:text-sm text-[#33222C] font-medium leading-relaxed">
              {about.designInspiration}
            </p>
          </div>

        </div>

        {/* Cozy Call to Action Card */}
        <div className="bg-[#F4EAE6] rounded-3xl p-8 border border-[#E8C9C1] text-center space-y-4">
          <div className="flex justify-center">
            <ShroomLogoIcon size={48} />
          </div>
          <h3 className="font-heading font-bold text-xl text-[#1E1419]">
            Ready to make your screen a little cozier?
          </h3>
          <p className="text-xs sm:text-sm text-[#33222C] font-medium max-w-md mx-auto">
            Take a look through our desktop, phone, and tablet wallpaper collections.
          </p>
          <div>
            <button
              onClick={() => navigateTo('collections')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Explore Wallpapers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

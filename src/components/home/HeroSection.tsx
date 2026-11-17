import React from 'react';
import { Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="bg-[#FFFFFF] pt-6 pb-0 sm:pt-8 sm:pb-0 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#A64B3C]">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Digital Stationery &amp; Cozy Wallpapers.</span>
        </div>
      </div>
    </section>
  );
};



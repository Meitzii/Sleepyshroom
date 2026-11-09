import React from 'react';
import { Heart, Sparkles, ShieldCheck } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from './common/Icons.tsx';

export const Footer: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const providers = settings?.paymentProviders || {
    stripeEnabled: true,
    paypalEnabled: true,
    gcashEnabled: true,
    mayaEnabled: true,
  };

  return (
    <footer className="bg-[#F2ECE0] border-t border-[#E8C9C1] text-[#1E1419] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-10 border-b border-[#E8C9C1]/80">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <ShroomLogoIcon size={38} />
              <div>
                <h3 className="font-heading font-bold text-xl text-[#1E1419] leading-none">
                  {settings?.storeName || 'sleepyshroom'}
                </h3>
                <p className="text-xs text-[#3B2834] mt-1 font-medium">
                  {settings?.tagline || 'Little screens, sweeter dreams.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#33222C] leading-relaxed max-w-sm font-medium">
              A gentle boutique for high-resolution digital wallpapers. Thoughtfully illustrated for your desktops, laptops, phones, and tablets.
            </p>

            <div className="text-xs text-[#2E1E28] flex items-center gap-1.5 font-bold">
              <Heart className="w-3.5 h-3.5 text-[#E8C9C1] fill-current" />
              <span>Made with love, wherever you are.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1419]">
              Shop & Explore
            </h4>
            <ul className="space-y-2 text-xs text-[#33222C] font-semibold">
              <li>
                <button
                  onClick={() => navigateTo('collections')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  All Wallpaper Collections
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('collections', 'device=desktop')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  Desktop Themes
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('collections', 'device=mobile')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  Mobile & Tablet Themes
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('account')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  My Customer Account
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care & Legal */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1419]">
              Customer Care & Policies
            </h4>
            <ul className="space-y-2 text-xs text-[#33222C] font-semibold">
              <li>
                <button
                  onClick={() => navigateTo('policy')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  Return & Refund Policy (Digital Goods)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  About Me & Story
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  Contact Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy')}
                  className="hover:text-[#1E1419] hover:underline transition-colors"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>

            {/* Payments We Accept */}
            <div className="pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1E1419] mb-2">
                Payments We Accept
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {providers.stripeEnabled && (
                  <>
                    <span className="px-2 py-1 bg-white text-[10px] font-bold text-[#1E1419] rounded-md border border-[#D5C2BB] shadow-xs">
                      Visa
                    </span>
                    <span className="px-2 py-1 bg-white text-[10px] font-bold text-[#1E1419] rounded-md border border-[#D5C2BB] shadow-xs">
                      Mastercard
                    </span>
                  </>
                )}
                {providers.paypalEnabled && (
                  <span className="px-2 py-1 bg-white text-[10px] font-bold text-[#1E1419] rounded-md border border-[#D5C2BB] shadow-xs">
                    PayPal
                  </span>
                )}
                {providers.gcashEnabled && (
                  <span className="px-2 py-1 bg-white text-[10px] font-bold text-[#1E1419] rounded-md border border-[#D5C2BB] shadow-xs">
                    GCash
                  </span>
                )}
                {providers.mayaEnabled && (
                  <span className="px-2 py-1 bg-white text-[10px] font-bold text-[#1E1419] rounded-md border border-[#D5C2BB] shadow-xs">
                    Maya
                  </span>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#33222C] font-medium gap-3">
          <p>© 2026 sleepyshroom. All rights reserved.</p>
          <p className="text-[11px] text-[#5A4550]">
            Little screens, sweeter dreams. 🍄
          </p>
        </div>

      </div>
    </footer>
  );
};

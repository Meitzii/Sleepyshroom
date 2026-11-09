import React, { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from './common/Icons.tsx';

export const Footer: React.FC = () => {
  const { settings, navigateTo } = useShop();
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (subscribeEmail.trim()) {
      setSubscribed(true);
      setSubscribeEmail('');
      setTimeout(() => setSubscribed(false), 6000);
    }
  };

  const providers = settings?.paymentProviders || {
    stripeEnabled: true,
    paypalEnabled: true,
    gcashEnabled: true,
    mayaEnabled: true,
  };

  return (
    <footer className="bg-[#FCF3E2] border-t border-[#EADCC8] text-[#292929] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Email Subscribe Bar Section */}
        <div className="mb-12 p-6 sm:p-8 bg-[#FFFCF7] rounded-3xl border border-[#EADCC8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A64B3C]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stay Cozy & In the Loop</span>
            </div>
            <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#292929]">
              Subscribe for new wallpaper drops & free gifts
            </h3>
            <p className="text-xs sm:text-sm text-[#777777] font-medium">
              Join the sleepy club. Soft updates, seasonal wallpapers, and sweet dreams sent to your inbox.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex-1 max-w-md w-full">
            {subscribed ? (
              <div className="p-3 bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl flex items-center gap-2 text-xs text-[#292929] font-bold">
                <Heart className="w-4 h-4 text-[#A64B3C] fill-current" />
                <span>Thank you for subscribing! Check your inbox soon. 🍄</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address..."
                  value={subscribeEmail}
                  onChange={e => setSubscribeEmail(e.target.value)}
                  className="flex-1 px-4 py-3 text-xs sm:text-sm bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl text-[#292929] placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  Subscribe
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-10 border-b border-[#EADCC8]">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <ShroomLogoIcon size={38} />
              <div>
                <h3 className="font-heading font-bold text-xl text-[#292929] leading-none">
                  {settings?.storeName || 'sleepyshroom'}
                </h3>
                <p className="text-xs text-[#777777] mt-1 font-medium">
                  {settings?.tagline || 'Little screens, sweeter dreams.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#777777] leading-relaxed max-w-sm font-medium">
              A gentle boutique for high-resolution digital wallpapers. Thoughtfully illustrated for your desktops, laptops, phones, and tablets.
            </p>

            <div className="text-xs text-[#292929] flex items-center gap-1.5 font-bold">
              <Heart className="w-3.5 h-3.5 text-[#A64B3C] fill-current" />
              <span>Made with love, wherever you are.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Shop & Explore
            </h4>
            <ul className="space-y-2 text-xs text-[#777777] font-semibold">
              <li>
                <button
                  onClick={() => navigateTo('collections')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  All Wallpaper Collections
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('collections', 'device=desktop')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Desktop Themes
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('collections', 'device=mobile')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Mobile & Tablet Themes
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care & Legal */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Customer Care & Policies
            </h4>
            <ul className="space-y-2 text-xs text-[#777777] font-semibold">
              <li>
                <button
                  onClick={() => navigateTo('policy')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Return & Refund Policy (Digital Goods)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  About Me & Story
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Contact Support
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>

            {/* Payments We Accept */}
            <div className="pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#292929] mb-2">
                Payments We Accept
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {providers.stripeEnabled && (
                  <>
                    <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                      Visa
                    </span>
                    <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                      Mastercard
                    </span>
                  </>
                )}
                {providers.paypalEnabled && (
                  <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                    PayPal
                  </span>
                )}
                {providers.gcashEnabled && (
                  <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                    GCash
                  </span>
                )}
                {providers.mayaEnabled && (
                  <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                    Maya
                  </span>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#777777] font-medium gap-3">
          <p>© 2026 sleepyshroom. All rights reserved.</p>
          <p className="text-[11px] text-[#777777]">
            Little screens, sweeter dreams. 🍄
          </p>
        </div>

      </div>
    </footer>
  );
};

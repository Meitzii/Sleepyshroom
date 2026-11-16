import React, { useState } from 'react';
import { Heart, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon, SocialPlatformIcon } from './common/Icons.tsx';
import { parseJsonResponse } from '../utils/apiClient.ts';
import { getVisibleSocialPlatforms } from '../utils/socialMedia.ts';

export const Footer: React.FC = () => {
  const { settings, navigateTo } = useShop();
  const activeSocialPlatforms = getVisibleSocialPlatforms(settings);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeMessage(null);
    setSubscribeError(null);

    if (!subscribeEmail.trim()) {
      setSubscribeError('Please enter your email address.');
      return;
    }
    if (!consentChecked) {
      setSubscribeError('Please check the consent box to receive wallpaper updates.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subscribeEmail.trim(),
          consent: true,
          source: 'footer',
        }),
      });
      const parsed = await parseJsonResponse(res);
      if (parsed.ok && parsed.data?.success) {
        setSubscribeMessage(
          parsed.data.message || 'Thank you for subscribing! Check your inbox for new wallpaper drops.'
        );
        setSubscribeEmail('');
        setConsentChecked(false);
      } else {
        setSubscribeError(
          parsed.data?.error || 'Could not subscribe at this moment. Please try again.'
        );
      }
    } catch {
      setSubscribeError('Network error while subscribing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const providers = settings?.paymentProviders || {
    paypalEnabled: true,
    paypalAllowCards: true,
    testMode: true,
  };
  const allowCards = providers.paypalAllowCards !== false;

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

          <form onSubmit={handleSubscribe} className="flex-1 max-w-md w-full space-y-2.5">
            {subscribeMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{subscribeMessage}</span>
              </div>
            )}
            {subscribeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{subscribeError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                aria-label="Newsletter email address"
                placeholder="Enter your email address..."
                value={subscribeEmail}
                onChange={e => setSubscribeEmail(e.target.value)}
                className="flex-1 px-4 py-3 text-xs sm:text-sm bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl text-[#292929] placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Subscribe</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#777777]">
              <label className="inline-flex items-start gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded border-[#EADCC8] accent-[#A64B3C] cursor-pointer"
                />
                <span>Yes, email me new wallpaper drops &amp; freebies. Unsubscribe anytime.</span>
              </label>
              <button
                type="button"
                onClick={() => navigateTo('unsubscribe')}
                className="font-bold text-[#A64B3C] hover:underline cursor-pointer"
              >
                Unsubscribe
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-[#EADCC8]">
          
          {/* Brand Info */}
          <div className={`${activeSocialPlatforms.length > 0 ? 'sm:col-span-2 md:col-span-4' : 'sm:col-span-2 md:col-span-5'} space-y-4`}>
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
          <div className={`${activeSocialPlatforms.length > 0 ? 'sm:col-span-1 md:col-span-2' : 'sm:col-span-1 md:col-span-3'} space-y-3`}>
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
          <div className={`${activeSocialPlatforms.length > 0 ? 'sm:col-span-1 md:col-span-3' : 'sm:col-span-1 md:col-span-4'} space-y-3`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Customer Care & Policies
            </h4>
            <ul className="space-y-2 text-xs text-[#777777] font-semibold">
              <li>
                <button
                  onClick={() => navigateTo('faq')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Frequently Asked Questions (FAQ)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy', 'refund')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Digital Product Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('privacy-policy')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Privacy Policy (RA 10173)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('terms-of-service')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('policy', 'copyright')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Copyright &amp; Personal License
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  About Sleepyshroom Studio
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Contact &amp; Support
                </button>
              </li>
            </ul>

            {/* Payments We Accept */}
            <div className="pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#292929] mb-2">
                Payments We Accept · USD via PayPal
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                  PayPal
                </span>
                {allowCards && (
                  <>
                    <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                      Visa
                    </span>
                    <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                      Mastercard
                    </span>
                    <span className="px-2 py-1 bg-[#FFFCF7] text-[10px] font-bold text-[#292929] rounded-md border border-[#EADCC8] shadow-xs">
                      Debit &amp; Credit
                    </span>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Dedicated Social Media Section */}
          {activeSocialPlatforms.length > 0 && (
            <div className="sm:col-span-2 md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
                Social Media
              </h4>
              <p className="text-xs text-[#777777] font-medium leading-relaxed">
                Follow sleepyshroom for cozy wallpaper previews, behind-the-scenes sketches, and seasonal drops.
              </p>
              <nav aria-label="Sleepyshroom Social Media" className="pt-1">
                <ul className="grid grid-cols-2 sm:flex sm:flex-wrap md:grid md:grid-cols-1 lg:grid-cols-2 gap-2.5">
                  {activeSocialPlatforms.map(platform => (
                    <li key={platform.key}>
                      <a
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Follow ${settings?.storeName || 'sleepyshroom'} on ${platform.label} (opens in a new tab)`}
                        className="group w-full sm:w-auto md:w-full inline-flex items-center justify-center sm:justify-start gap-2.5 px-3.5 py-2.5 min-h-[44px] bg-[#FFFCF7] hover:bg-[#A64B3C] text-[#292929] hover:text-[#FFFCF7] border border-[#EADCC8] hover:border-[#A64B3C] rounded-2xl shadow-2xs transition-all duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A64B3C]/50"
                      >
                        <SocialPlatformIcon
                          platform={platform.key}
                          size={17}
                          className="text-[#A64B3C] group-hover:text-[#FFFCF7] transition-all duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100"
                        />
                        <span className="text-xs font-bold whitespace-nowrap">{platform.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}

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

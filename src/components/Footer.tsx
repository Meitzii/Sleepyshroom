import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { SocialPlatformIcon, PaymentBadges } from './common/Icons.tsx';
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
    googlePayEnabled: true,
    gcashEnabled: true,
    mayaEnabled: true,
  };

  return (
    <footer className="bg-[#FFFFFF] border-t border-neutral-200 text-[#292929] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        {/* Main 3-Section Footer Grid: Helpful Links | Socials | Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-neutral-200">
          {/* Section 1: Helpful Links */}
          <div className="md:col-span-3 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Helpful Links
            </h4>
            <ul className="space-y-2.5 text-xs text-[#777777] font-semibold">
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('faq')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Frequently Asked Questions (FAQ)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('policy', 'refund')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Digital Product Refund Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('privacy-policy')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Privacy Policy (RA 10173)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('terms-of-service')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('policy', 'copyright')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Copyright &amp; Personal License
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  About Sleepyshroom Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#A64B3C] hover:underline transition-colors cursor-pointer"
                >
                  Contact &amp; Support
                </button>
              </li>
            </ul>
          </div>

          {/* Section 2: Socials */}
          <div className="md:col-span-4 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Socials
            </h4>
            {activeSocialPlatforms.length > 0 ? (
              <nav aria-label="Sleepyshroom Social Media">
                <ul className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-w-sm">
                  {activeSocialPlatforms.map((platform) => (
                    <li key={platform.key}>
                      <a
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Follow ${settings?.storeName || 'sleepyshroom'} on ${platform.label} (opens in a new tab)`}
                        className="group w-full inline-flex items-center gap-2.5 px-3.5 py-2.5 min-h-[42px] bg-[#FFFFFF] hover:bg-[#A64B3C] text-[#292929] hover:text-[#FFFFFF] border border-neutral-200 hover:border-[#A64B3C] rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A64B3C]/50"
                      >
                        <SocialPlatformIcon
                          platform={platform.key}
                          size={16}
                          className="text-[#A64B3C] group-hover:text-[#FFFFFF] transition-colors shrink-0"
                        />
                        <span className="text-xs font-bold whitespace-nowrap">{platform.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : (
              <p className="text-xs text-[#777777] font-medium">
                Follow along for seasonal wallpaper previews and studio drops.
              </p>
            )}
          </div>

          {/* Section 3: Newsletter */}
          <div className="md:col-span-5 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Newsletter
            </h4>
            <p className="text-xs text-[#777777] font-medium leading-relaxed">
              Subscribe for new wallpaper drops, seasonal releases, and freebies sent straight to your inbox.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2.5">
              {subscribeMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{subscribeMessage}</span>
                </div>
              )}
              {subscribeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-bold">
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
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-[#FFFFFF] border border-neutral-300 rounded-xl text-[#292929] placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/30 focus:border-[#A64B3C]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFFFF] text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2 disabled:opacity-60"
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
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 accent-[#A64B3C] cursor-pointer"
                  />
                  <span>Yes, email me new wallpaper drops &amp; freebies.</span>
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
        </div>

        {/* Bottom-most Footer: Accepted Payment Methods in One Clean Row */}
        <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#777777] whitespace-nowrap">
              Accepted Payment Methods
            </span>
            <PaymentBadges providers={providers} className="justify-center sm:justify-start" />
          </div>

          <p className="text-xs text-[#777777] font-medium whitespace-nowrap">
            © 2026 {settings?.storeName || 'sleepyshroom'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

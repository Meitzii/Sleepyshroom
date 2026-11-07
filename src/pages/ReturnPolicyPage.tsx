import React from 'react';
import { FileText, ShieldAlert, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

export const ReturnPolicyPage: React.FC = () => {
  const { settings, navigateTo } = useShop();

  const policy = settings?.returnPolicy || {
    title: 'Digital Goods Return & Refund Policy',
    lastUpdated: 'November 2026',
    content: `## 1. Digital Download Nature
All products available on sleepyshroom are digital downloads (PNG, HEIC, and high-resolution ZIP archives). Because digital files are delivered immediately upon order completion and cannot be returned physically, all sales are generally final.

## 2. Instant Download Access
Once payment is completed, you receive instant download links on your confirmation screen, an email receipt with your secure download token, and permanent access inside your customer account.

## 3. Duplicate Purchases
Accidentally purchase the exact same wallpaper twice? No worries! Contact us within 14 days with your order numbers, and we will happily refund the duplicate transaction.

## 4. Damaged or Corrupted Files
In the rare event that a downloaded file is corrupted or fails to unpack, please email us right away. We will immediately reissue fresh, verified download files or provide direct links.

## 5. Device Compatibility Assistance
If you need help setting up your wallpaper on a specific iOS, Android, macOS, or Windows device, reach out anytime! We provide step-by-step setup guides for both Lock Screens and Home Screens.

## 6. How to Contact Us
For any questions or assistance with your order, email us at shop@sleepyshroom.com or use our Contact Form. We typically respond within 24-48 hours.`,
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1419] uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Store Policies</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#1E1419]">
            {policy.title}
          </h1>
          <p className="text-xs text-[#45313D] font-medium">
            Last updated: {policy.lastUpdated}
          </p>
        </div>

        {/* Notice Card */}
        <div className="p-4 sm:p-5 bg-[#E8C9C1]/40 rounded-2xl border border-[#D5C2BB] flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#8B6F7A] shrink-0 mt-0.5" />
          <p className="text-xs text-[#1E1419] font-medium leading-relaxed">
            <strong className="font-bold">Important Digital Goods Notice:</strong> Because our wallpapers are delivered as instant digital downloads, standard physical item returns do not apply. However, we guarantee that all files are intact, high-resolution, and we always refund accidental duplicates.
          </p>
        </div>

        {/* Policy Content */}
        <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-10 border border-[#E8C9C1] shadow-xs prose prose-stone max-w-none text-xs sm:text-sm text-[#33222C] leading-relaxed space-y-6">
          {policy.content.split('## ').filter(Boolean).map((section, idx) => {
            const lines = section.split('\n');
            const heading = lines[0];
            const body = lines.slice(1).join('\n');
            return (
              <div key={idx} className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#1E1419]">
                  {heading}
                </h2>
                <p className="text-xs sm:text-sm text-[#33222C] font-medium whitespace-pre-line leading-relaxed">
                  {body.trim()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Contact Help */}
        <div className="text-center pt-4">
          <p className="text-xs text-[#33222C] font-medium mb-3">
            Need help with a purchase or download issue?
          </p>
          <button
            onClick={() => navigateTo('contact')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs font-bold hover:bg-[#785E69] transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact Customer Support</span>
          </button>
        </div>

      </div>
    </div>
  );
};

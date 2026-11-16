import React from 'react';
import { FileText, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

function renderTermsParagraphs(markdown: string) {
  return markdown.split(/\n\n+/).map((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="font-heading font-bold text-lg sm:text-xl text-[#292929] pt-4">
          {trimmed.replace(/^##\s+/, '')}
        </h2>
      );
    }
    const lines = trimmed.split('\n');
    if (lines.every((l) => l.trim().startsWith('- '))) {
      return (
        <ul key={idx} className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#777777] font-medium">
          {lines.map((l, li) => (
            <li key={li}>{l.replace(/^-\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={idx} className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed whitespace-pre-line">
        {trimmed.replace(/\*\*(.*?)\*\*/g, '$1')}
      </p>
    );
  });
}

export const TermsOfServicePage: React.FC = () => {
  const { settings, navigateTo } = useShop();
  const doc = settings?.termsOfService;

  const fallbackTerms = `## 1. General Website Terms
By browsing or purchasing from Sleepyshroom, you agree to these Terms of Service and our Store Policies.

## 2. Digital Product Purchases & Payment
All products sold in this store are digital downloads priced in USD and fulfilled electronically after server-verified PayPal or card payment capture. No physical items are shipped.

## 3. Instant Download Access
Once payment succeeds, downloads unlock immediately on your Order Confirmation page, in your Customer Account order history, and via confirmation email.

## 4. Personal-Use Licensing & Restrictions
Every wallpaper, icon pack, and bundle includes a non-exclusive, non-transferable Personal Use License across your own devices. You may not resell, share publicly, print onto merchandise for sale, or use files in AI training datasets.

## 5. Refunds
Because digital downloads cannot be returned after delivery, sales are final except for duplicate purchases reported within 14 days or unresolvable technical file issues.

## 6. Support Contact
For help with orders, licensing, or downloads, reach us at sleepyshroom@gmail.com.`;

  return (
    <div className="py-12 sm:py-16 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FCF3E2] border border-[#EADCC8] text-xs font-extrabold text-[#A64B3C]">
            <FileText className="w-3.5 h-3.5" />
            <span>Terms &amp; Licensing</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#292929]">
            {doc?.title || 'Terms of Service'}
          </h1>
          <p className="text-xs font-bold text-[#777777]">
            Last updated: {doc?.lastUpdated || 'November 2026'}
          </p>
        </div>

        {doc?.ownerReviewRequiredNotice && (
          <div className="p-4 rounded-2xl bg-[#FCF3E2] border border-[#A64B3C]/30 flex items-start gap-3 text-xs text-[#292929]">
            <AlertCircle className="w-4 h-4 text-[#A64B3C] shrink-0 mt-0.5" />
            <p className="font-semibold">{doc.ownerReviewRequiredNotice}</p>
          </div>
        )}

        <div className="bg-[#FCF3E2]/55 rounded-3xl p-6 sm:p-10 border border-[#EADCC8] space-y-4">
          {renderTermsParagraphs(doc?.content || fallbackTerms)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FCF3E2] rounded-2xl p-5 border border-[#EADCC8]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#292929]">
            <Mail className="w-4 h-4 text-[#A64B3C]" />
            <span>Questions about these terms? Email sleepyshroom@gmail.com</span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('privacy-policy')}
            className="text-xs font-bold text-[#A64B3C] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Read Privacy Policy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

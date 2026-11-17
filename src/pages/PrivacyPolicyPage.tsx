import React from 'react';
import { AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { SectionHeading } from '../components/common/SectionHeading.tsx';

function renderMarkdownParagraphs(markdown: string) {
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

export const PrivacyPolicyPage: React.FC = () => {
  const { settings, navigateTo } = useShop();
  const doc = settings?.privacyPolicy;

  const fallbackContent = `## 1. Overview & Commitment (Philippines Data Privacy Act — RA 10173)
Sleepyshroom is an independent digital wallpaper and stationery shop operating from the Philippines. We respect your privacy and handle personal data responsibly in alignment with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).

## 2. Information We Collect
We collect only the information needed to deliver digital orders and support our customers:
- Account Name, Email, and optional Avatar when creating a customer account or signing in with Google.
- Order details including email address, customer name, purchased products/bundles, transaction references, and download tokens.
- Newsletter email address and explicit consent record only when you choose to subscribe.
- Verified product reviews and support messages you choose to submit.

## 3. Payment Security (PayPal & Cards)
All payments are processed securely through PayPal. Sleepyshroom never sees, collects, or stores raw credit/debit card numbers or CVV security codes.

## 4. Essential Cookies & Local Storage
We use essential browser storage solely to preserve your shopping bag, login session, and checkout status. We do not sell personal information to third parties.

## 5. Third-Party Service Providers
Sleepyshroom relies on Supabase (database, auth, file storage), PayPal (payment capture & webhook verification), and Resend/SMTP transactional email services for order receipts and support replies.

## 6. Your Privacy Rights & Contact
You can unsubscribe from marketing emails anytime, request access or correction of your account records, or ask for deletion by emailing shop.sleepyshroom@gmail.com.`;

  return (
    <div className="py-12 sm:py-16 bg-[#FFFFFF] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <SectionHeading as="h1" size="lg">
            {doc?.title || 'Privacy Policy'}
          </SectionHeading>
          <p className="text-xs font-bold text-[#777777]">
            Last updated: {doc?.lastUpdated || 'November 2026'}
          </p>
        </div>

        {doc?.ownerReviewRequiredNotice && (
          <div className="p-4 rounded-2xl bg-neutral-50 border border-[#A64B3C]/30 flex items-start gap-3 text-xs text-[#292929]">
            <AlertCircle className="w-4 h-4 text-[#A64B3C] shrink-0 mt-0.5" />
            <p className="font-semibold">{doc.ownerReviewRequiredNotice}</p>
          </div>
        )}

        <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-10 border border-neutral-200 space-y-4">
          {renderMarkdownParagraphs(doc?.content || fallbackContent)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FFFFFF] rounded-2xl p-5 border border-neutral-200">
          <div className="flex items-center gap-2 text-xs font-bold text-[#292929]">
            <Mail className="w-4 h-4 text-[#A64B3C]" />
            <span>Privacy questions? Email shop.sleepyshroom@gmail.com</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('terms-of-service')}
              className="text-xs font-bold text-[#A64B3C] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Terms of Service</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo('unsubscribe')}
              className="text-xs font-bold text-[#292929] hover:text-[#A64B3C] hover:underline cursor-pointer"
            >
              Newsletter Unsubscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

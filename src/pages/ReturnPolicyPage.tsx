import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  Lock,
  BookOpen,
  MessageCircle,
  HelpCircle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

type PolicyTab = 'refund' | 'privacy' | 'terms' | 'copyright' | 'support';

interface TabConfig {
  id: PolicyTab;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  lastUpdated: string;
}

const TABS: TabConfig[] = [
  {
    id: 'refund',
    label: 'Refund Policy',
    shortLabel: 'Refunds',
    icon: ShieldAlert,
    title: 'Digital Goods Return & Refund Policy',
    lastUpdated: 'November 2026',
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    shortLabel: 'Privacy',
    icon: Lock,
    title: 'Customer Privacy & Data Protection Policy',
    lastUpdated: 'November 2026',
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    shortLabel: 'Terms',
    icon: FileText,
    title: 'Store Terms of Service & Digital Purchase Conditions',
    lastUpdated: 'November 2026',
  },
  {
    id: 'copyright',
    label: 'Copyright & License',
    shortLabel: 'Copyright',
    icon: BookOpen,
    title: 'Intellectual Property, Copyright & Personal License',
    lastUpdated: 'November 2026',
  },
  {
    id: 'support',
    label: 'Contact & Support',
    shortLabel: 'Support',
    icon: MessageCircle,
    title: 'Customer Care & File Delivery Support Policy',
    lastUpdated: 'November 2026',
  },
];

export const ReturnPolicyPage: React.FC = () => {
  const { viewParam, navigateTo } = useShop();

  // Initialize tab from viewParam if valid
  const initialTab: PolicyTab =
    viewParam && ['refund', 'privacy', 'terms', 'copyright', 'support'].includes(viewParam)
      ? (viewParam as PolicyTab)
      : 'refund';

  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  useEffect(() => {
    if (viewParam && ['refund', 'privacy', 'terms', 'copyright', 'support'].includes(viewParam)) {
      setActiveTab(viewParam as PolicyTab);
    }
  }, [viewParam]);

  const currentTabConfig = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div className="py-12 sm:py-16 bg-[#FFFCF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A64B3C] uppercase tracking-wider bg-[#FCF3E2] px-3.5 py-1 rounded-full border border-[#EADCC8]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Store Policies & Trust Information</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#292929]">
            {currentTabConfig.title}
          </h1>
          <p className="text-xs text-[#777777] font-medium">
            Effective Date & Last Updated: {currentTabConfig.lastUpdated} · Sleepyshroom Digital Studio
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-[#FCF3E2] border border-[#EADCC8] rounded-2xl shadow-xs">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                    : 'text-[#777777] hover:text-[#292929] hover:bg-[#FFFCF7]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Content */}
        {activeTab === 'refund' && (
          <div className="space-y-6">
            {/* Notice Card */}
            <div className="p-4 sm:p-5 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#A64B3C] shrink-0 mt-0.5" />
              <div className="text-xs text-[#292929] font-medium leading-relaxed space-y-1">
                <p className="font-bold">Digital Goods Nature & Fairness Guarantee</p>
                <p className="text-[#777777]">
                  Because all wallpapers and stationery files are delivered instantly as unencrypted digital downloads, physical returns are not possible. However, we stand 100% behind file quality, and we gladly refund accidental duplicate purchases.
                </p>
              </div>
            </div>

            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs text-xs sm:text-sm text-[#555555] leading-relaxed space-y-6">
              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  1. Instant Digital Delivery
                </h2>
                <p>
                  Upon completing checkout through PayPal, digital download tokens are generated immediately. You are presented with direct download links on your confirmation screen, and an automated backup receipt is sent to your email. Because files are delivered irrevocably, standard returns for buyer's remorse or change of mind are not accepted.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  2. Accidental Duplicate Purchases (14-Day Full Refund Guarantee)
                </h2>
                <p>
                  If you accidentally purchase the same wallpaper or bundle twice due to double clicking or checking out twice, simply forward your receipts or order numbers to <strong>sleepyshroom@gmail.com</strong> within 14 days. We will gladly and immediately issue a 100% full refund on the duplicate order via PayPal.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  3. Corrupted or Defective Files
                </h2>
                <p>
                  Every wallpaper is quality-checked at 300 DPI lossless resolution before release. If you ever encounter an archive that fails to extract, a corrupt download stream, or an image file with unexpected artifacts, please notify us immediately. We will test the file, correct any issue, and reissue a clean, fresh download mirror. If we cannot resolve a technical issue with a file, a full refund will be provided.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  4. Device Display Compatibility
                </h2>
                <p>
                  Our files are provided in standardized ultra-high resolutions (up to 6016×3384 for desktop and 1290×2796 for mobile). Please verify your device screen resolution before ordering. If your device uses an unconventional aspect ratio and the wallpaper requires custom cropping, reach out and we will gladly create a tailored crop for you free of charge!
                </p>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-[#292929] font-medium leading-relaxed space-y-1">
                <p className="font-bold">Zero-Tracking & Minimal Data Philosophy</p>
                <p className="text-[#777777]">
                  Sleepyshroom does not sell, rent, or trade your personal data. We collect only what is strictly required to fulfill your digital orders and provide customer support.
                </p>
              </div>
            </div>

            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs text-xs sm:text-sm text-[#555555] leading-relaxed space-y-6">
              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  1. Information We Collect
                </h2>
                <p>
                  When you make a purchase or submit a contact inquiry, we receive your name, email address, order details, and IP address for transaction verification and fraud prevention. We never receive, process, or store your credit card numbers or banking passwords—all financial transactions are processed securely through PayPal's PCI-compliant infrastructure.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  2. How Your Information Is Used
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-[#555555]">
                  <li>Delivering your secure digital download tokens and automated order receipts.</li>
                  <li>Maintaining your order history so you can retrieve your purchased files in the future.</li>
                  <li>Responding to your customer service questions, compatibility requests, or duplicate purchase claims.</li>
                  <li>Sending optional seasonal drop announcements (only if you explicitly subscribed to our newsletter; you can unsubscribe at any time with one click).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  3. Third-Party Service Providers
                </h2>
                <p>
                  We share data solely with trusted infrastructure providers required to operate our digital shop:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#555555]">
                  <li><strong>PayPal:</strong> To securely process transactions and prevent payment fraud.</li>
                  <li><strong>Supabase:</strong> To securely store customer account records and order tokens in an encrypted PostgreSQL database.</li>
                  <li><strong>Resend / SMTP:</strong> To transmit your transactional order receipts and download links.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  4. Data Retention & Your Rights
                </h2>
                <p>
                  We retain order records indefinitely so that you may always retrieve your digital files. You have the right to request access to the personal data we hold about you or request its deletion at any time by emailing <strong>sleepyshroom@gmail.com</strong>.
                </p>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] flex items-start gap-3">
              <FileText className="w-5 h-5 text-[#A64B3C] shrink-0 mt-0.5" />
              <div className="text-xs text-[#292929] font-medium leading-relaxed space-y-1">
                <p className="font-bold">Transparent Digital Storefront Terms</p>
                <p className="text-[#777777]">
                  By browsing Sleepyshroom or purchasing digital downloads, you agree to these fair terms governing our digital store.
                </p>
              </div>
            </div>

            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs text-xs sm:text-sm text-[#555555] leading-relaxed space-y-6">
              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  1. Acceptance of Terms
                </h2>
                <p>
                  These Terms of Service govern your use of sleepyshroom.vercel.app and all purchases made through this storefront. If you disagree with any portion of these terms, please refrain from using the store.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  2. Pricing & Currency
                </h2>
                <p>
                  All prices are listed in United States Dollars (USD). We reserve the right to modify prices, launch promotional sales, or retire collections at any time. The total cost displayed at checkout is the full amount charged with no surprise fees.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  3. Digital Product Delivery
                </h2>
                <p>
                  No physical goods will ever be shipped. All purchases are delivered as downloadable electronic files. You are responsible for ensuring that your internet connection and devices are capable of downloading and viewing high-resolution image files.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  4. Account Security & Guest Checkout
                </h2>
                <p>
                  You may purchase products as a guest or with a customer account. If you create an account, you are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  5. Store Responsibilities & Limitation of Liability
                </h2>
                <p>
                  Sleepyshroom provides digital artwork on an "as is" and "as available" basis. While we guarantee that all artwork files are thoroughly virus-scanned and crafted to professional standards, Sleepyshroom is not liable for device misconfiguration, third-party software glitches, or unsupported operating systems.
                </p>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'copyright' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-[#292929] font-medium leading-relaxed space-y-1">
                <p className="font-bold">Original Art Protection & Personal License</p>
                <p className="text-[#777777]">
                  Every wallpaper, theme, and illustration is the original intellectual property of Sleepyshroom. Your purchase grants you a personal enjoyment license.
                </p>
              </div>
            </div>

            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs text-xs sm:text-sm text-[#555555] leading-relaxed space-y-6">
              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  1. Ownership of Artwork
                </h2>
                <p>
                  All illustrations, color palettes, digital compositions, character designs, and branding associated with Sleepyshroom are protected by copyright and intellectual property laws. Purchasing a wallpaper transfers a license to display the art—it does not transfer copyright ownership.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  2. Permitted Personal Uses (Allowed)
                </h2>
                <div className="space-y-2 text-[#555555]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>Setting as the wallpaper, lock screen, or background on your personal smartphones, tablets, laptops, desktop monitors, and smartwatches.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>Displaying personal desktop setups or phone home screens featuring our wallpapers on social media (tagging <em>@sleepyshroom</em> is always loved!).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>Backing up your purchased files to your personal private cloud drive or external storage.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  3. Prohibited Commercial Uses (Strictly Forbidden)
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-[#555555]">
                  <li><strong>No Reselling or Redistribution:</strong> You may not resell, redistribute, sublicense, share via public download links, or include our files in digital asset packs.</li>
                  <li><strong>No Commercial Merchandising:</strong> You may not print our designs onto physical merchandise (stickers, t-shirts, mugs, phone cases, physical posters) for sale or distribution.</li>
                  <li><strong>No AI Model Training:</strong> Scraping, ingestion, or feeding of Sleepyshroom artwork into generative AI models, LoRA weights, or datasets is strictly prohibited.</li>
                  <li><strong>No Blockchain or NFTs:</strong> Minting, tokenizing, or associating our artwork with NFTs or crypto assets is strictly forbidden.</li>
                </ul>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-5 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-[#A64B3C] shrink-0 mt-0.5" />
              <div className="text-xs text-[#292929] font-medium leading-relaxed space-y-1">
                <p className="font-bold">Human, Warm & Dedicated Support</p>
                <p className="text-[#777777]">
                  Every inquiry is personally answered by the artist behind Sleepyshroom. We are here to make your experience smooth and joyful.
                </p>
              </div>
            </div>

            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-10 border border-[#EADCC8] shadow-xs text-xs sm:text-sm text-[#555555] leading-relaxed space-y-6">
              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  1. How Support Is Delivered
                </h2>
                <p>
                  Customer support is provided via direct email and our online contact portal. You can reach us at:
                </p>
                <div className="p-4 bg-[#FFFCF7] border border-[#EADCC8] rounded-2xl space-y-1 text-xs">
                  <p><strong>Primary Support:</strong> <a href="mailto:sleepyshroom@gmail.com" className="text-[#A64B3C] font-bold hover:underline">sleepyshroom@gmail.com</a></p>
                  <p><strong>Store Inquiries:</strong> <a href="mailto:shop.sleepyshroom@gmail.com" className="text-[#A64B3C] font-bold hover:underline">shop.sleepyshroom@gmail.com</a></p>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  2. Response Time Commitment
                </h2>
                <p>
                  We aim to respond to all inquiries within <strong>12 to 24 hours</strong>, 7 days a week. During major holiday drops, responses may occasionally take up to 48 hours, but we will always get back to you and resolve any issue.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-[#292929]">
                  3. What to Include When Contacting Us
                </h2>
                <p>
                  To help us assist you as swiftly as possible, please provide:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#555555]">
                  <li>Your Order ID or PayPal transaction reference.</li>
                  <li>The email address used during checkout.</li>
                  <li>Your device model and operating system (if asking about setup or resolution).</li>
                  <li>A screenshot or description of any error encountered.</li>
                </ul>
              </section>
            </div>
          </div>
        )}

        {/* Contact Help Footer Banner */}
        <div className="text-center pt-4">
          <p className="text-xs text-[#777777] font-medium mb-3">
            Have a specific question not covered in our policies?
          </p>
          <button
            onClick={() => navigateTo('contact')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs font-bold hover:bg-[#8E3E30] transition-all cursor-pointer shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open Contact Support Form</span>
          </button>
        </div>

      </div>
    </div>
  );
};

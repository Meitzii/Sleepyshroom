import React, { useEffect, useMemo, useState } from 'react';
import { HelpCircle, ChevronDown, Search, Mail, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { parseJsonResponse } from '../utils/apiClient.ts';
import type { FaqItem } from '../types/index.ts';

const FAQ_CATEGORIES = [
  'All Categories',
  'Orders and Payments',
  'Downloads and Access',
  'Wallpaper Compatibility',
  'Licensing and Usage',
  'Refunds and Cancellations',
  'Account and Technical Support',
];

export const FaqPage: React.FC = () => {
  const { navigateTo } = useShop();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const res = await fetch('/api/faqs');
        const parsed = await parseJsonResponse(res);
        if (parsed.ok && parsed.isJson && Array.isArray(parsed.data?.faqs)) {
          setFaqs(parsed.data.faqs);
          if (parsed.data.faqs.length > 0) {
            setOpenId(parsed.data.faqs[0].id);
          }
        }
      } catch {
        // Fallback handled gracefully
      } finally {
        setLoading(false);
      }
    };
    loadFaqs();
  }, []);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      if (!item.isPublished) return false;
      if (activeCategory !== 'All Categories' && item.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faqs, activeCategory, searchQuery]);

  const groupedFaqs = useMemo(() => {
    const groups = new Map<string, FaqItem[]>();
    for (const item of filteredFaqs) {
      const cat = item.category || 'Orders and Payments';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return Array.from(groups.entries());
  }, [filteredFaqs]);

  return (
    <div className="py-12 sm:py-16 bg-[#FFFCF7] min-h-screen">
      {/* Schema.org FAQPage JSON-LD */}
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs
                .filter((f) => f.isPublished)
                .map((f) => ({
                  '@type': 'Question',
                  name: f.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: f.answer,
                  },
                })),
            }),
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FCF3E2] border border-[#EADCC8] text-xs font-extrabold text-[#A64B3C]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help Center</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#292929]">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-[#777777] font-medium">
            Everything you need to know about PayPal checkout, instant digital downloads, device resolutions, and licensing.
          </p>
        </div>

        {/* Search & Category Tabs */}
        <div className="bg-[#FCF3E2] rounded-3xl p-5 sm:p-6 border border-[#EADCC8] space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g., PayPal, iPad, refund, bundle)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FFFCF7] border border-[#EADCC8] text-xs sm:text-sm text-[#292929] placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/30"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FAQ_CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                    active
                      ? 'bg-[#A64B3C] text-[#FFFCF7] border-[#8E3E30]'
                      : 'bg-[#FFFCF7] text-[#292929] border-[#EADCC8] hover:bg-[#EADCC8]/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accordion */}
        {loading ? (
          <div className="py-14 text-center text-xs font-bold text-[#777777]">
            Opening our cozy help guide...
          </div>
        ) : groupedFaqs.length === 0 ? (
          <div className="bg-[#FCF3E2] rounded-3xl p-10 text-center border border-[#EADCC8]">
            <p className="font-heading font-bold text-base text-[#292929] mb-2">
              No matching questions found
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All Categories');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold cursor-pointer"
            >
              Show All FAQs
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedFaqs.map(([categoryName, items]) => (
              <div key={categoryName} className="space-y-3">
                <h2 className="font-heading font-bold text-lg text-[#292929] flex items-center gap-2 px-1">
                  <Sparkles className="w-4 h-4 text-[#A64B3C]" />
                  <span>{categoryName}</span>
                </h2>
                <div className="space-y-2.5">
                  {items.map((item) => {
                    const isOpen = openId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="bg-[#FCF3E2]/70 rounded-2xl border border-[#EADCC8] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          aria-expanded={isOpen}
                          className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#FCF3E2] transition-colors cursor-pointer"
                        >
                          <span className="font-heading font-bold text-sm sm:text-base text-[#292929]">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#A64B3C] shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#777777] font-medium leading-relaxed border-t border-[#EADCC8]/60 bg-[#FFFCF7]">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Need more help banner */}
        <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-lg text-[#292929]">
              Still need a hand with a download or order?
            </h3>
            <p className="text-xs sm:text-sm text-[#777777] font-medium mt-1">
              Email us anytime at <strong className="text-[#292929]">sleepyshroom@gmail.com</strong> or send a note through our Contact page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('contact')}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold cursor-pointer shadow-xs"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
};

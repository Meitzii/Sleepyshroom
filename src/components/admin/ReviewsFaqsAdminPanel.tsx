import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  HelpCircle,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type { FaqCategory, FaqItem, Product, ProductReview } from '../../types/index.ts';
import { parseJsonResponse } from '../../utils/apiClient.ts';

interface ReviewsFaqsAdminPanelProps {
  allProducts: Product[];
  getToken: () => Promise<string | null>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

const FAQ_CATEGORIES: FaqCategory[] = [
  'Orders and Payments',
  'Downloads and Access',
  'Wallpaper Compatibility',
  'Licensing and Usage',
  'Refunds and Cancellations',
  'Account and Technical Support',
];

export const ReviewsFaqsAdminPanel: React.FC<ReviewsFaqsAdminPanelProps> = ({
  allProducts,
  getToken,
  onNotify,
  onError,
}) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [reviewSearch, setReviewSearch] = useState('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('all');

  // FAQ Modal state
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({
    category: FAQ_CATEGORIES[0] as string,
    question: '',
    answer: '',
    sortOrder: 1,
    isPublished: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [revRes, faqRes] = await Promise.all([
        fetch('/api/admin/reviews', { headers }),
        fetch('/api/admin/faqs', { headers }),
      ]);
      const [revParsed, faqParsed] = await Promise.all([
        parseJsonResponse<{ success?: boolean; reviews?: ProductReview[] }>(revRes),
        parseJsonResponse<{ success?: boolean; faqs?: FaqItem[] }>(faqRes),
      ]);
      if (revParsed.ok && revParsed.data?.reviews) {
        setReviews(revParsed.data.reviews);
      }
      if (faqParsed.ok && faqParsed.data?.faqs) {
        setFaqs(faqParsed.data.faqs);
      }
    } catch (err: any) {
      onError(err?.message || 'Unable to load reviews & FAQs.');
    } finally {
      setLoading(false);
    }
  }, [getToken, onError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productTitleMap = useMemo(
    () => new Map(allProducts.map(p => [p.id, p.title])),
    [allProducts]
  );

  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    return reviews.filter(r => {
      if (reviewFilter !== 'all' && r.status !== reviewFilter) return false;
      if (!q) return true;
      const pTitle = (r.productTitle || productTitleMap.get(r.productId) || '').toLowerCase();
      return (
        pTitle.includes(q) ||
        r.reviewerName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q)
      );
    });
  }, [reviews, reviewFilter, reviewSearch, productTitleMap]);

  const filteredFaqs = useMemo(() => {
    return faqs
      .filter(f => faqCategoryFilter === 'all' || f.category === faqCategoryFilter)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [faqs, faqCategoryFilter]);

  const handleToggleReviewStatus = async (rev: ProductReview) => {
    const nextStatus = rev.status === 'published' ? 'hidden' : 'published';
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const parsed = await parseJsonResponse<{ success?: boolean; error?: string }>(res);
      if (!parsed.ok || parsed.data?.success === false) {
        onError(parsed.data?.error || 'Could not update review visibility.');
        return;
      }
      setReviews(prev => prev.map(r => (r.id === rev.id ? { ...r, status: nextStatus } : r)));
      onNotify(`Review visibility set to ${nextStatus}.`);
    } catch {
      onError('Error updating review status.');
    }
  };

  const handleDeleteReview = async (rev: ProductReview) => {
    if (!confirm(`Delete review by ${rev.reviewerName}?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onError('Could not delete review.');
        return;
      }
      setReviews(prev => prev.filter(r => r.id !== rev.id));
      onNotify('Review removed.');
    } catch {
      onError('Error deleting review.');
    }
  };

  const openNewFaq = () => {
    setEditingFaqId(null);
    setFaqForm({
      category: faqCategoryFilter !== 'all' ? faqCategoryFilter : FAQ_CATEGORIES[0],
      question: '',
      answer: '',
      sortOrder: faqs.length + 1,
      isPublished: true,
    });
    setFaqModalOpen(true);
  };

  const openEditFaq = (faq: FaqItem) => {
    setEditingFaqId(faq.id);
    setFaqForm({
      category: faq.category || FAQ_CATEGORIES[0],
      question: faq.question || '',
      answer: faq.answer || '',
      sortOrder: Number(faq.sortOrder || 1),
      isPublished: faq.isPublished !== false,
    });
    setFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (faqForm.question.trim().length < 3 || faqForm.answer.trim().length < 3) {
      onError('Please enter both a question and answer (at least 3 characters each).');
      return;
    }
    setSavingFaq(true);
    try {
      const token = await getToken();
      if (!token) return;
      const url = editingFaqId
        ? `/api/admin/faqs/${encodeURIComponent(editingFaqId)}`
        : '/api/admin/faqs';
      const res = await fetch(url, {
        method: editingFaqId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: faqForm.category,
          question: faqForm.question.trim(),
          answer: faqForm.answer.trim(),
          sortOrder: Number(faqForm.sortOrder) || 0,
          isPublished: faqForm.isPublished,
        }),
      });
      const parsed = await parseJsonResponse<{ success?: boolean; faq?: FaqItem; error?: string }>(res);
      if (!parsed.ok || parsed.data?.success === false) {
        onError(parsed.data?.error || 'Could not save FAQ.');
        return;
      }
      setFaqModalOpen(false);
      onNotify('FAQ item saved.');
      await loadData();
    } catch (err: any) {
      onError(err?.message || 'Error saving FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (faq: FaqItem) => {
    if (!confirm(`Delete FAQ: "${faq.question}"?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/faqs/${encodeURIComponent(faq.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onError('Could not delete FAQ.');
        return;
      }
      setFaqs(prev => prev.filter(f => f.id !== faq.id));
      onNotify('FAQ item deleted.');
    } catch {
      onError('Error deleting FAQ.');
    }
  };

  return (
    <div className="space-y-8">
      {/* REVIEWS MODERATION */}
      <div className="space-y-4">
        <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
              <Star className="w-5 h-5 text-[#A64B3C]" />
              <span>Verified Customer Reviews ({reviews.length})</span>
            </h2>
            <p className="text-xs text-[#33222C] mt-0.5">
              Moderate authentic reviews submitted by verified Sleepyshroom buyers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3.5 py-2 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="bg-[#F9F6F0] p-3.5 rounded-2xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {(['all', 'published', 'hidden'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setReviewFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                  reviewFilter === st
                    ? 'bg-[#A64B3C] text-[#FFFCF7]'
                    : 'bg-white text-[#1E1419] border border-[#D5C2BB] hover:bg-[#F4EAE6]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={reviewSearch}
              onChange={e => setReviewSearch(e.target.value)}
              placeholder="Search product, reviewer, comment..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D5C2BB] rounded-xl"
            />
          </div>
        </div>

        <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
          {filteredReviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777777] font-medium">
              No verified customer reviews found yet.
            </div>
          ) : (
            filteredReviews.map(rev => (
              <div key={rev.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#1E1419]">
                      {rev.productTitle || productTitleMap.get(rev.productId) || rev.productId}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-amber-500 text-amber-500" />
                      ))}
                    </span>
                    {rev.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Purchase</span>
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        rev.status === 'published'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-stone-200 text-stone-700 border-stone-300'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                  {rev.title && <p className="font-bold text-[#1E1419]">{rev.title}</p>}
                  <p className="text-[#33222C]">{rev.comment}</p>
                  <p className="text-[11px] text-[#777777]">
                    By {rev.reviewerName} · {new Date(rev.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleReviewStatus(rev)}
                    className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] border border-[#D5C2BB] rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {rev.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{rev.status === 'published' ? 'Hide' : 'Publish'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteReview(rev)}
                    className="p-1.5 text-[#777777] hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                    title="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAQ CRUD MANAGEMENT */}
      <div className="space-y-4">
        <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-[#1E1419] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#A64B3C]" />
              <span>FAQ Accordion Manager ({faqs.length})</span>
            </h2>
            <p className="text-xs text-[#33222C] mt-0.5">
              Organize help questions across all 6 customer support categories.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewFaq}
            className="px-4 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add FAQ</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFaqCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
              faqCategoryFilter === 'all'
                ? 'bg-[#A64B3C] text-[#FFFCF7]'
                : 'bg-[#F9F6F0] text-[#1E1419] border border-[#E8C9C1]'
            }`}
          >
            All Categories ({faqs.length})
          </button>
          {FAQ_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFaqCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                faqCategoryFilter === cat
                  ? 'bg-[#A64B3C] text-[#FFFCF7]'
                  : 'bg-[#F9F6F0] text-[#1E1419] border border-[#E8C9C1]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
          {filteredFaqs.map(faq => (
            <div key={faq.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-[#D5C2BB] text-[#A64B3C]">
                    {faq.category}
                  </span>
                  <span className="text-[10px] font-mono text-[#777777]">Order #{faq.sortOrder}</span>
                  {!faq.isPublished && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                      Hidden
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-[#1E1419]">{faq.question}</h4>
                <p className="text-[#33222C] leading-relaxed">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditFaq(faq)}
                  className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] border border-[#D5C2BB] rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteFaq(faq)}
                  className="p-1.5 text-[#777777] hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                  title="Delete FAQ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ MODAL */}
      {faqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSaveFaq}
            className="bg-[#F7F3E9] rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#E8C9C1] shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#E8C9C1]/60 pb-3">
              <h3 className="font-heading font-bold text-lg text-[#1E1419]">
                {editingFaqId ? 'Edit FAQ Entry' : 'Add FAQ Entry'}
              </h3>
              <button type="button" onClick={() => setFaqModalOpen(false)} className="text-[#777777] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#1E1419] mb-1">Category</label>
                <select
                  value={faqForm.category}
                  onChange={e => setFaqForm({ ...faqForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                >
                  {FAQ_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1E1419] mb-1">Sort Order</label>
                <input
                  type="number"
                  value={faqForm.sortOrder}
                  onChange={e => setFaqForm({ ...faqForm, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">Question *</label>
              <input
                type="text"
                required
                value={faqForm.question}
                onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1E1419] mb-1">Answer *</label>
              <textarea
                rows={4}
                required
                value={faqForm.answer}
                onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={faqForm.isPublished}
                  onChange={e => setFaqForm({ ...faqForm, isPublished: e.target.checked })}
                  className="accent-[#A64B3C]"
                />
                <span className="font-bold text-[#1E1419]">Published on /faq page</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFaqModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#D5C2BB] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFaq}
                  className="px-5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingFaq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save FAQ</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

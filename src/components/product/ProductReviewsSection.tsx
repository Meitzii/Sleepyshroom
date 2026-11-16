import React, { useEffect, useState } from 'react';
import { Star, ShieldCheck, Edit3, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import type { ProductReview } from '../../types/index.ts';
import { useShop } from '../../context/ShopContext.tsx';
import { supabase } from '../../lib/supabase.ts';
import { parseJsonResponse } from '../../utils/apiClient.ts';

interface ProductReviewsSectionProps {
  productId: string;
  productTitle: string;
}

const StarRatingRow: React.FC<{
  rating: number;
  interactive?: boolean;
  onSelect?: (star: number) => void;
  size?: 'sm' | 'md';
}> = ({ rating, interactive = false, onSelect, size = 'sm' }) => {
  const iconCls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        return interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onSelect?.(star)}
            className="p-0.5 cursor-pointer hover:scale-110 transition-transform"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`${iconCls} ${
                star <= rating ? 'text-[#A64B3C] fill-[#A64B3C]' : 'text-[#EADCC8]'
              }`}
            />
          </button>
        ) : (
          <Star
            key={star}
            className={`${iconCls} ${filled ? 'text-[#A64B3C] fill-[#A64B3C]' : 'text-[#EADCC8]'}`}
          />
        );
      })}
    </div>
  );
};

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  productTitle,
}) => {
  const { user, navigateTo } = useShop();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [existingUserReview, setExistingUserReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      }
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { headers });
      const parsed = await parseJsonResponse(res);
      if (parsed.ok && parsed.isJson && parsed.data) {
        setReviews(Array.isArray(parsed.data.reviews) ? parsed.data.reviews : []);
        setAverageRating(Number(parsed.data.averageRating || 0));
        setTotalCount(Number(parsed.data.totalCount || 0));
        setCanReview(Boolean(parsed.data.canReview));
        const existing = parsed.data.existingUserReview || null;
        setExistingUserReview(existing);
        if (existing) {
          setRating(Number(existing.rating || 5));
          setTitle(existing.title || '');
          setComment(existing.comment || '');
        } else {
          setRating(5);
          setTitle('');
          setComment('');
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg('Please write at least a short sentence sharing your thoughts.');
      return;
    }

    setSubmitting(true);
    try {
      let token = '';
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || '';
      }
      const res = await fetch('/api/reviews', {
        method: existingUserReview ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim(),
          comment: comment.trim(),
        }),
      });
      const parsed = await parseJsonResponse(res);
      if (!parsed.ok || !parsed.data?.success) {
        setErrorMsg(parsed.data?.error || 'Could not save your review.');
      } else {
        setSuccessMsg(
          existingUserReview
            ? 'Your review has been updated. Thank you!'
            : 'Thank you for leaving a verified customer review!'
        );
        setIsEditing(false);
        await loadReviews();
      }
    } catch {
      setErrorMsg('Network error submitting your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-14 pt-12 border-t border-[#EADCC8]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Summary & Verified Purchase Gate */}
        <div className="lg:col-span-4 bg-[#FCF3E2] rounded-3xl p-6 border border-[#EADCC8] space-y-5">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#A64B3C]">
              Customer Reviews
            </span>
            <h2 className="font-heading font-bold text-2xl text-[#292929] mt-1">
              Verified Feedback
            </h2>
          </div>

          <div className="flex items-center gap-4 bg-[#FFFCF7] p-4 rounded-2xl border border-[#EADCC8]">
            <div className="text-3xl font-extrabold text-[#292929] tabular-nums">
              {totalCount > 0 ? averageRating.toFixed(1) : '—'}
            </div>
            <div>
              <StarRatingRow rating={averageRating} size="sm" />
              <p className="text-xs text-[#777777] font-bold mt-1">
                {totalCount === 0
                  ? 'No reviews yet'
                  : `${totalCount} verified ${totalCount === 1 ? 'review' : 'reviews'}`}
              </p>
            </div>
          </div>

          <div className="text-xs text-[#777777] leading-relaxed font-medium flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#A64B3C] shrink-0 mt-0.5" />
            <span>
              To keep Sleepyshroom trustworthy, reviews can only be posted by signed-in customers who purchased{' '}
              <strong className="text-[#292929]">{productTitle}</strong>.
            </span>
          </div>

          {!user ? (
            <button
              type="button"
              onClick={() => navigateTo('account')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FFFCF7] hover:bg-[#EADCC8]/50 border border-[#EADCC8] text-xs font-bold text-[#292929] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#A64B3C]" />
              <span>Sign In to Review Purchases</span>
            </button>
          ) : canReview ? (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="w-full py-3 px-4 rounded-xl bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{existingUserReview ? 'Edit Your Review' : 'Write a Verified Review'}</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-[11px] font-semibold text-[#777777]">
              Only customers with a paid order including this design (or its bundle) can submit a review.
            </div>
          )}
        </div>

        {/* Review Form + Verified Review List */}
        <div className="lg:col-span-8 space-y-6">
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isEditing && canReview && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#FCF3E2] rounded-3xl p-6 border border-[#A64B3C]/30 space-y-4"
            >
              <h3 className="font-heading font-bold text-lg text-[#292929]">
                {existingUserReview ? 'Update Your Review' : 'Share Your Experience'}
              </h3>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1.5">Your Rating</label>
                <StarRatingRow
                  rating={rating}
                  interactive={true}
                  onSelect={(s) => setRating(s)}
                  size="md"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1.5">
                  Review Title (optional)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="So crisp on my iPad lock screen!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-xs sm:text-sm text-[#292929]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#292929] mb-1.5">
                  Review Comment
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share how the resolution, colors, or icon setup worked on your device..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-xs sm:text-sm text-[#292929]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-xs font-bold text-[#292929] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{existingUserReview ? 'Update Review' : 'Post Review'}</span>
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-[#777777]">
              Loading verified customer reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-[#FCF3E2]/50 rounded-3xl p-8 text-center border border-[#EADCC8]">
              <p className="font-heading font-bold text-base text-[#292929] mb-1">
                No verified reviews yet for this design
              </p>
              <p className="text-xs text-[#777777] font-medium">
                Be the first verified buyer to share how this wallpaper looks on your screen!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <article
                  key={rev.id}
                  className="bg-[#FCF3E2]/70 rounded-2xl p-5 border border-[#EADCC8] space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <StarRatingRow rating={rev.rating} size="sm" />
                      <span className="text-xs font-extrabold text-[#292929]">
                        {rev.reviewerName}
                      </span>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                    <time className="text-[11px] text-[#777777] font-semibold">
                      {new Date(rev.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                  {rev.title && (
                    <h4 className="font-heading font-bold text-sm text-[#292929]">{rev.title}</h4>
                  )}
                  <p className="text-xs sm:text-sm text-[#292929]/90 leading-relaxed font-medium">
                    {rev.comment}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

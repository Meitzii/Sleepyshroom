import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, MailX } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { parseJsonResponse } from '../utils/apiClient.ts';
import { SectionHeading } from '../components/common/SectionHeading.tsx';

export const UnsubscribePage: React.FC = () => {
  const { viewParam, navigateTo } = useShop();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = viewParam || urlParams.get('token');
    if (token && token.length > 12) {
      const autoUnsubscribe = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/newsletter?token=${encodeURIComponent(token)}`, {
            method: 'DELETE',
          });
          const parsed = await parseJsonResponse(res);
          if (parsed.ok && parsed.data?.success) {
            setStatusMessage(parsed.data.message || 'You have been unsubscribed from Sleepyshroom updates.');
          } else {
            setErrorMessage(parsed.data?.error || 'Could not process unsubscribe token.');
          }
        } catch {
          setErrorMessage('Network error while unsubscribing.');
        } finally {
          setLoading(false);
        }
      };
      autoUnsubscribe();
    }
  }, [viewParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Please enter your subscribed email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const parsed = await parseJsonResponse(res);
      if (parsed.ok && parsed.data?.success) {
        setStatusMessage(parsed.data.message || 'You have been unsubscribed.');
        setEmail('');
      } else {
        setErrorMessage(parsed.data?.error || 'Email not found or unable to unsubscribe.');
      }
    } catch {
      setErrorMessage('Unable to process unsubscribe request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-4 bg-[#FFFFFF] min-h-[60vh]">
      <div className="max-w-md mx-auto bg-[#FFFFFF] rounded-3xl p-8 border border-neutral-200 shadow-xs space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center mx-auto">
          <MailX className="w-6 h-6 text-[#A64B3C]" />
        </div>
        <div className="space-y-1.5">
          <SectionHeading as="h1" size="sm">
            Newsletter Unsubscribe
          </SectionHeading>
          <p className="text-xs text-[#777777] font-medium">
            Enter your email below to opt out of Sleepyshroom wallpaper drop announcements. Transactional order receipts for purchases are unaffected.
          </p>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs sm:text-sm text-[#292929]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Unsubscribe Me</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
        >
          Return to Storefront
        </button>
      </div>
    </div>
  );
};

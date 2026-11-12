import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  CheckCircle,
  Download,
  Sparkles,
  Smartphone,
  Monitor,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Lock,
  Loader2,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order } from '../types/index.ts';
import { downloadAuthorizedOrderFile } from '../utils/downloadHelper.ts';
import { parseJsonResponse, getOptionalSupabaseAuthHeader } from '../utils/apiClient.ts';
import { formatOrderMoney } from '../utils/currency.ts';

interface OrderConfirmationPageProps {
  token: string;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({ token }) => {
  const { navigateTo, clearCart, setLatestOrder } = useShop();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [verifying, setVerifying] = useState(false);
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const clearedCartForTokenRef = useRef<string | null>(null);
  const autoPollCountRef = useRef(0);

  const fetchVerifiedOrder = useCallback(async (showSpinner = false) => {
    if (!token) {
      setLoading(false);
      return null;
    }
    if (showSpinner) setVerifying(true);
    try {
      const authHeaders = await getOptionalSupabaseAuthHeader();
      const res = await fetch(`/api/orders/${encodeURIComponent(token)}?verify=1`, {
        headers: authHeaders,
      });
      const parsed = await parseJsonResponse<Order & { error?: string }>(res);
      if (parsed.ok && parsed.isJson && parsed.data && !parsed.data.error) {
        setOrder(parsed.data);
        return parsed.data;
      }
      return null;
    } catch (err) {
      console.error('Order verification lookup error:', err);
      return null;
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }, [token]);

  useEffect(() => {
    autoPollCountRef.current = 0;
    setLoading(Boolean(token));
    setOrder(null);
    setDownloadFeedback(null);
    void fetchVerifiedOrder(false);
  }, [token, fetchVerifiedOrder]);

  const statusLower = String(order?.paymentStatus || 'pending').toLowerCase();
  const isVerifiedPaid = statusLower === 'paid' || statusLower === 'completed';

  // Clear shopping bag once payment is genuinely verified by server/PayMongo
  useEffect(() => {
    if (!order || !isVerifiedPaid) return;
    setLatestOrder(order);
    if (clearedCartForTokenRef.current !== order.downloadToken) {
      clearedCartForTokenRef.current = order.downloadToken;
      clearCart();
    }
  }, [order, isVerifiedPaid, clearCart, setLatestOrder]);

  // Brief retry check if user landed immediately before PayMongo webhook/session settled
  useEffect(() => {
    if (!order || statusLower !== 'pending' || autoPollCountRef.current >= 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      autoPollCountRef.current += 1;
      void fetchVerifiedOrder(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [order, statusLower, fetchVerifiedOrder]);

  const handleManualVerify = async () => {
    setDownloadFeedback(null);
    if (!token) return;
    setVerifying(true);
    try {
      const authHeaders = await getOptionalSupabaseAuthHeader();
      const res = await fetch(`/api/orders/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ action: 'verify' }),
      });
      const parsed = await parseJsonResponse<{ order?: Order; error?: string }>(res);
      if (parsed.ok && parsed.isJson && parsed.data?.order) {
        setOrder(parsed.data.order);
      } else {
        await fetchVerifiedOrder(false);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadFile = async (productId: string, title: string, fallbackFile?: string) => {
    if (!order || !isVerifiedPaid) return;
    setDownloadingProductId(productId);
    setDownloadFeedback(null);

    const res = await downloadAuthorizedOrderFile(
      order.downloadToken,
      productId,
      fallbackFile || `${title.toLowerCase().replace(/\s+/g, '_')}.jpg`
    );

    setDownloadingProductId(null);
    if (res.ok) {
      setDownloadFeedback({
        text: `Download started for "${title}"! Check your downloads folder.`,
      });
      setTimeout(() => setDownloadFeedback(null), 5000);
    } else {
      setDownloadFeedback({
        text: res.error || 'Could not authorize download for this wallpaper.',
        isError: true,
      });
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <Loader2 className="w-7 h-7 text-[#A64B3C] animate-spin mx-auto" />
        <p className="text-sm font-semibold text-[#A64B3C]">
          Verifying payment status with PayMongo...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <h2 className="font-heading font-bold text-2xl text-[#292929] mb-2">
          Order Reference Unavailable
        </h2>
        <p className="text-sm text-[#777777] font-medium mb-6">
          Could not locate this order. Please sign in to check your order history or return to checkout.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigateTo('account')}
            className="px-6 py-3 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-sm font-bold hover:bg-[#8E3E30] transition-all cursor-pointer"
          >
            Go to My Account
          </button>
          <button
            onClick={() => navigateTo('collections')}
            className="px-6 py-3 bg-[#FFFCF7] text-[#292929] border border-[#EADCC8] rounded-xl text-sm font-bold hover:bg-[#FCF3E2] transition-all cursor-pointer"
          >
            Browse Wallpapers
          </button>
        </div>
      </div>
    );
  }

  const billingLocation = [
    order.billingDetails?.city,
    order.billingDetails?.postalCode,
    order.billingDetails?.country,
  ]
    .filter(Boolean)
    .join(', ');

  // Strict enforcement: NEVER show digital download buttons unless server verified paymentStatus === 'paid' | 'completed'
  if (!isVerifiedPaid) {
    const isPending = statusLower === 'pending';
    const statusTitle =
      isPending
        ? 'Awaiting PayMongo Payment Confirmation'
        : statusLower === 'cancelled'
        ? 'Checkout Cancelled Before Payment'
        : statusLower === 'expired'
        ? 'Checkout Session Expired'
        : statusLower === 'refunded'
        ? 'Order Refunded'
        : 'Payment Not Completed';

    const statusDescription = isPending
      ? 'We created your order and are waiting for PayMongo to confirm your payment. Digital downloads unlock automatically once verification finishes.'
      : order.failureReason ||
        'Because payment has not been verified for this order, digital wallpaper downloads remain locked.';

    return (
      <div className="py-10 sm:py-16 bg-[#FFFCF7]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs text-center space-y-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm ${
                isPending
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {isPending ? <Clock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>

            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#292929]">
              {statusTitle}
            </h1>

            <p className="text-sm text-[#777777] font-medium leading-relaxed max-w-lg mx-auto">
              {statusDescription}
            </p>

            <div className="bg-[#FFFCF7] rounded-2xl p-4 border border-[#EADCC8] text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#777777] font-medium">Order Number</span>
                <span className="font-bold text-[#292929]">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777] font-medium">Payment Status</span>
                <span className="font-bold uppercase text-[#A64B3C]">{statusLower}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#777777] font-medium">Order Total</span>
                <span className="font-bold text-[#292929] tabular-nums">
                  {formatOrderMoney(order.total, order.currency)}
                </span>
              </div>
              {order.paymongoCheckoutSessionId && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#777777] font-medium">PayMongo Session</span>
                  <span className="font-mono text-[#292929] truncate">{order.paymongoCheckoutSessionId}</span>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] flex items-center justify-center gap-2 text-xs font-semibold text-[#777777]">
              <Lock className="w-4 h-4 text-[#A64B3C] shrink-0" />
              <span>Downloads are strictly locked until PayMongo payment verification succeeds.</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={verifying}
                onClick={handleManualVerify}
                className="px-5 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
                <span>{verifying ? 'Checking PayMongo...' : 'Verify Payment Status'}</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('checkout')}
                className="px-5 py-3 bg-[#FFFCF7] hover:bg-[#EADCC8]/40 text-[#292929] border border-[#EADCC8] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Checkout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-16 bg-[#FFFCF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Celebration Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-8 h-8" />
          </div>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#292929] tracking-tight">
            Thank you for your order!
          </h1>

          <p className="text-sm sm:text-base text-[#777777] font-medium">
            Payment verified via PayMongo. Your digital wallpapers are unlocked for{' '}
            <strong className="text-[#292929] font-bold">{order.customerEmail}</strong>.
          </p>
        </div>

        {/* Download notification feedback */}
        {downloadFeedback && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
              downloadFeedback.isError
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            {downloadFeedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-700" />
            )}
            <span>{downloadFeedback.text}</span>
          </div>
        )}

        {/* Main Digital Downloads Card */}
        <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs mb-8 space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADCC8] pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Verified Digital Download Package
              </span>
              <h2 className="font-heading font-bold text-xl text-[#292929]">
                Order {order.orderNumber}
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#777777]">
              Paid on {new Date(order.paidAt || order.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Purchased Items with Server-Enforced Download buttons */}
          <div className="space-y-4">
            {order.items.map(item => {
              const isBusy = downloadingProductId === item.productId;
              return (
                <div
                  key={item.productId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8]"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-cover rounded-xl shrink-0 border border-[#EADCC8]"
                    />
                    <div>
                      <h3 className="font-heading font-bold text-sm sm:text-base text-[#292929]">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#777777] font-medium mt-0.5">
                        <span>Lossless 300 DPI</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{item.deviceTypes.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isBusy}
                    onClick={() => handleDownloadFile(item.productId, item.title, item.downloadFileName)}
                    className="px-5 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isBusy ? 'Preparing File...' : 'Download Files'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Device Setup Tips */}
          <div className="bg-[#FFFCF7] rounded-2xl p-5 border border-[#EADCC8] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#292929] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A64B3C]" />
              <span>Cozy Setup Guide</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#777777]">
              <div className="space-y-1">
                <p className="font-bold text-[#292929] flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>Mac &amp; Windows Desktop</span>
                </p>
                <p className="leading-relaxed text-[11px] font-medium">
                  Save your wallpaper file, then open System Settings &gt; Wallpaper / Personalization to set your preferred background.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[#292929] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#A64B3C]" />
                  <span>iPhone &amp; Android</span>
                </p>
                <p className="leading-relaxed text-[11px] font-medium">
                  Save to Photos/Gallery. Set as Lock Screen with wallpaper depth effect enabled, and match with clean app icons.
                </p>
              </div>
            </div>
          </div>

          {/* Receipt & Billing Details */}
          <div className="border-t border-[#EADCC8] pt-4 space-y-2 text-xs text-[#777777] font-medium">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Billed to: <strong className="text-[#292929]">{order.customerName}</strong>
                {billingLocation ? ` (${billingLocation})` : ''}
              </span>
              <span>
                PayMongo Reference:{' '}
                <strong className="text-[#292929] font-mono">
                  {order.paymongoPaymentId || order.transactionId || order.paymongoCheckoutSessionId}
                </strong>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Payment: <strong className="text-[#292929]">{order.paymentMethod}</strong>
                {order.isTestOrder ? ' · Test Mode' : ''}
              </span>
              <span className="text-xs font-bold text-[#292929]">
                Total Paid:{' '}
                <span className="text-base font-extrabold text-[#A64B3C] tabular-nums">
                  {formatOrderMoney(order.total, order.currency)}
                </span>
              </span>
            </div>
          </div>

        </div>

        {/* Next Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigateTo('account')}
            className="w-full sm:w-auto px-6 py-3 bg-[#FFFCF7] hover:bg-[#FCF3E2] text-[#292929] rounded-xl text-xs sm:text-sm font-bold transition-all border border-[#EADCC8] cursor-pointer"
          >
            View in My Account
          </button>
          <button
            onClick={() => navigateTo('collections')}
            className="w-full sm:w-auto px-6 py-3 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs sm:text-sm font-bold hover:bg-[#8E3E30] transition-all cursor-pointer"
          >
            Explore More Wallpapers
          </button>
        </div>

      </div>
    </div>
  );
};

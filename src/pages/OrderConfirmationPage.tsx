import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Download,
  Sparkles,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order } from '../types/index.ts';
import { downloadWallpaperFile } from '../utils/downloadHelper.ts';
import { parseJsonResponse, getOptionalSupabaseAuthHeader } from '../utils/apiClient.ts';
import { findOrderInLocalCache, saveOrderToLocalCache } from '../utils/orderCache.ts';

interface OrderConfirmationPageProps {
  token: string;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({ token }) => {
  const { latestOrder, navigateTo, products } = useShop();
  const [order, setOrder] = useState<Order | null>(() => {
    if (latestOrder && (!token || latestOrder.downloadToken === token || latestOrder.orderNumber === token)) {
      return latestOrder;
    }
    return token ? findOrderInLocalCache(token) : null;
  });
  const [loading, setLoading] = useState(!order && Boolean(token));
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      latestOrder &&
      (!token || latestOrder.downloadToken === token || latestOrder.orderNumber === token)
    ) {
      saveOrderToLocalCache(latestOrder);
      setOrder(latestOrder);
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    const cached = findOrderInLocalCache(token);
    if (cached) {
      setOrder(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const authHeaders = await getOptionalSupabaseAuthHeader();
        const res = await fetch(`/api/orders/${encodeURIComponent(token)}`, {
          headers: authHeaders,
        });
        const parsed = await parseJsonResponse<Order & { error?: string }>(res);
        if (!cancelled && parsed.ok && parsed.isJson && parsed.data && !parsed.data.error) {
          saveOrderToLocalCache(parsed.data);
          setOrder(parsed.data);
        }
      } catch (err) {
        console.error('Order confirmation lookup error:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, latestOrder]);

  const handleDownloadFile = async (productId: string, title: string) => {
    const item = order?.items.find(i => i.productId === productId);
    const catalogProd = products.find(p => p.id === productId);
    const imageSrc =
      item?.image ||
      catalogProd?.images?.[0] ||
      `/wallpapers/${title.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    const baseName =
      item?.downloadFileName ||
      catalogProd?.downloadFileName ||
      `${title.toLowerCase().replace(/\s+/g, '_')}.jpg`;

    await downloadWallpaperFile(imageSrc, baseName);

    setDownloadSuccessMessage(`Download started for "${title}"! Check your downloads folder.`);
    setTimeout(() => setDownloadSuccessMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <p className="text-sm font-semibold text-[#A64B3C]">
          Preparing your cozy wallpapers...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <h2 className="font-heading font-bold text-2xl text-[#292929] mb-2">
          Order Access Token Unavailable
        </h2>
        <p className="text-sm text-[#777777] font-medium mb-6">
          Could not locate this order on this device. Please sign in to view your purchased downloads.
        </p>
        <button
          onClick={() => navigateTo('account')}
          className="px-6 py-3 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-sm font-bold hover:bg-[#8E3E30] transition-all cursor-pointer"
        >
          Go to My Account
        </button>
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
            Your digital wallpapers are ready for{' '}
            <strong className="text-[#292929] font-bold">{order.customerEmail}</strong>.
          </p>
        </div>

        {/* Download notification feedback */}
        {downloadSuccessMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 font-medium">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{downloadSuccessMessage}</span>
          </div>
        )}

        {/* Main Digital Downloads Card */}
        <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs mb-8 space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADCC8] pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                Digital Download Package
              </span>
              <h2 className="font-heading font-bold text-xl text-[#292929]">
                Order {order.orderNumber}
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#777777]">
              Purchased on {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Purchased Items with Direct Download buttons */}
          <div className="space-y-4">
            {order.items.map(item => (
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

                {/* Direct Download Button */}
                <button
                  onClick={() => handleDownloadFile(item.productId, item.title)}
                  className="px-5 py-3 bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 text-[#FFFCF7] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Files</span>
                </button>
              </div>
            ))}
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
                Transaction ID: <strong className="text-[#292929] font-mono">{order.transactionId}</strong>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Payment: <strong className="text-[#292929]">{order.paymentMethod}</strong>
                {order.isTestOrder ? ' · Demo Test Order' : ''}
              </span>
              <span className="text-xs font-bold text-[#292929]">
                Total Paid:{' '}
                <span className="text-base font-extrabold text-[#A64B3C] tabular-nums">
                  ${order.total.toFixed(2)}
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

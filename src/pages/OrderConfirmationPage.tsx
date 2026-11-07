import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  Download, 
  Sparkles, 
  Mail, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck,
  FileCheck,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order } from '../types/index.ts';

interface OrderConfirmationPageProps {
  token: string;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({ token }) => {
  const { latestOrder, navigateTo } = useShop();
  const [order, setOrder] = useState<Order | null>(latestOrder);
  const [loading, setLoading] = useState(!latestOrder);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!latestOrder && token) {
      // Fetch order by token
      fetch(`/api/orders/${token}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setOrder(data);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, latestOrder]);

  const handleDownloadFile = (productId: string, title: string) => {
    const downloadUrl = `/api/downloads/${token || order?.downloadToken}/file/${productId}`;
    
    // Create temporary anchor to trigger browser download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadSuccessMessage(`Download started for "${title}"! Check your downloads folder.`);
    setTimeout(() => setDownloadSuccessMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <p className="text-sm font-semibold text-[#8B6F7A]">
          Preparing your cozy wallpapers...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <h2 className="font-heading font-bold text-2xl text-[#1E1419] mb-2">
          Order Access Token Expired
        </h2>
        <p className="text-sm text-[#33222C] font-medium mb-6">
          Could not locate this order. Please sign in to view your purchased downloads.
        </p>
        <button
          onClick={() => navigateTo('account')}
          className="px-6 py-3 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-sm font-bold"
        >
          Go to My Account
        </button>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Celebration Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-8 h-8" />
          </div>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#1E1419] tracking-tight">
            Thank you for your order!
          </h1>

          <p className="text-sm sm:text-base text-[#33222C] font-medium">
            Your digital wallpapers are ready. An order receipt and permanent access token have also been sent to{' '}
            <strong className="text-[#1E1419] font-bold">{order.customerEmail}</strong>.
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
        <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] shadow-xs mb-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8C9C1]/70 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E1419]">
                Digital Download Package
              </span>
              <h2 className="font-heading font-bold text-xl text-[#1E1419]">
                Order {order.orderNumber}
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#45313D]">
              Purchased on {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Purchased Items with Direct Download buttons */}
          <div className="space-y-4">
            {order.items.map(item => (
              <div
                key={item.productId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#D5C2BB]"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded-xl shrink-0 border border-[#D5C2BB]"
                  />
                  <div>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-[#1E1419]">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#45313D] font-medium mt-0.5">
                      <span>Lossless 300 DPI</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{item.deviceTypes.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Download Button */}
                <button
                  onClick={() => handleDownloadFile(item.productId, item.title)}
                  className="px-5 py-3 bg-[#8B6F7A] hover:bg-[#785E69] active:scale-98 text-[#F7F3E9] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Files</span>
                </button>
              </div>
            ))}
          </div>

          {/* Device Setup Tips */}
          <div className="bg-[#F4EAE6]/60 rounded-2xl p-5 border border-[#D5C2BB] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1419] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E6A020]" />
              <span>Cozy Setup Guide</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#33222C]">
              <div className="space-y-1">
                <p className="font-bold text-[#1E1419] flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#8B6F7A]" />
                  <span>Mac & Windows Desktop</span>
                </p>
                <p className="leading-relaxed text-[11px] font-medium">
                  Unpack your download file. Open System Settings &gt; Wallpaper / Personalization, and select your preferred high-resolution version.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[#1E1419] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#8B6F7A]" />
                  <span>iPhone & Android</span>
                </p>
                <p className="leading-relaxed text-[11px] font-medium">
                  Save to Photos/Gallery. Set as Lock Screen with wallpaper depth effect enabled, and use the clean home screen variant for clean app icons.
                </p>
              </div>
            </div>
          </div>

          {/* Receipt details */}
          <div className="border-t border-[#E8C9C1]/70 pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#33222C] font-medium gap-2">
            <span>Payment: <strong className="text-[#1E1419]">{order.paymentMethod}</strong></span>
            <span>Transaction ID: <strong className="text-[#1E1419]">{order.transactionId}</strong></span>
            <span className="text-xs font-bold text-[#1E1419]">
              Total Paid: <span className="text-base font-extrabold text-[#945367] tabular-nums">${order.total.toFixed(2)}</span>
            </span>
          </div>

        </div>

        {/* Next Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigateTo('account')}
            className="w-full sm:w-auto px-6 py-3 bg-[#E8C9C1]/60 hover:bg-[#E8C9C1] text-[#1E1419] rounded-xl text-xs sm:text-sm font-bold transition-all border border-[#8B6F7A]/30"
          >
            View in My Account
          </button>
          <button
            onClick={() => navigateTo('collections')}
            className="w-full sm:w-auto px-6 py-3 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs sm:text-sm font-bold hover:bg-[#785E69] transition-all"
          >
            Explore More Wallpapers
          </button>
        </div>

      </div>
    </div>
  );
};

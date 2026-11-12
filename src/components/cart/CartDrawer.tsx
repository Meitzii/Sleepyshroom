import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Tag, Check, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { EmptyCartShroom } from '../common/Icons.tsx';
import { calculateCheckoutBreakdown, formatUsd } from '../../utils/currency.ts';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    appliedDiscount,
    applyDiscount,
    removeDiscount,
    navigateTo,
  } = useShop();

  const breakdown = calculateCheckoutBreakdown(cart, appliedDiscount);

  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isCartOpen) return null;

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setPromoLoading(true);
    setPromoMessage(null);
    const result = await applyDiscount(promoInput.trim());
    setPromoLoading(false);

    if (result.success) {
      setPromoMessage({ text: result.message, error: false });
      setPromoInput('');
    } else {
      setPromoMessage({ text: result.message, error: true });
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    navigateTo('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-[#292929]/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#FFFCF7] h-full shadow-2xl flex flex-col z-10 border-l border-[#EADCC8]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#EADCC8] flex items-center justify-between bg-[#FCF3E2]">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-lg text-[#292929]">
              Your Cozy Bag
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#A64B3C] text-[#FFFCF7]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
            className="p-2 text-[#292929] hover:bg-[#EADCC8]/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length > 0 ? (
            cart.map(item => (
              <div
                key={item.product.id}
                className="flex items-start gap-4 p-3.5 bg-[#FCF3E2] rounded-2xl border border-[#EADCC8] relative group"
              >
                {/* Thumbnail */}
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className="w-16 h-16 object-cover rounded-xl shrink-0 border border-[#EADCC8]"
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-sm text-[#292929] truncate">
                    {item.product.title}
                  </h4>
                  <p className="text-[11px] text-[#777777] font-medium mt-0.5">
                    {item.product.theme} · Digital Download
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    {/* Distinctive price */}
                    <span className="text-sm font-bold text-[#A64B3C] tabular-nums tracking-tight">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 bg-[#FFFCF7] px-2 py-1 rounded-lg border border-[#EADCC8]">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="text-xs font-bold text-[#292929] hover:text-[#A64B3C] w-4 text-center cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-[#292929] w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="text-xs font-bold text-[#292929] hover:text-[#A64B3C] w-4 text-center cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  aria-label="Remove item"
                  className="text-[#777777] hover:text-[#A64B3C] transition-colors p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            /* Empty Cart Illustration */
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <EmptyCartShroom className="w-44 h-44 mb-3" />
              <h3 className="font-heading font-bold text-lg text-[#292929] mb-1">
                Your bag is peaceful and empty
              </h3>
              <p className="text-xs text-[#777777] font-medium max-w-xs mb-6">
                Discover cozy wallpapers for your desktop, phone, and tablet to fill your digital sanctuary.
              </p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigateTo('collections');
                }}
                className="px-6 py-2.5 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs font-bold hover:bg-[#8E3E30] transition-all shadow-xs cursor-pointer"
              >
                Browse Wallpapers
              </button>
            </div>
          )}
        </div>

        {/* Footer with Subtotal, Promo, Checkout */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#EADCC8] bg-[#FCF3E2] space-y-4">
            
            {/* Promo Code Input */}
            <div>
              {appliedDiscount ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-xs text-[#292929]">
                  <div className="flex items-center gap-2 font-bold">
                    <Tag className="w-3.5 h-3.5 text-[#292929]" />
                    <span>Code <strong className="font-mono">{appliedDiscount.code}</strong> applied</span>
                  </div>
                  <button
                    onClick={removeDiscount}
                    className="text-[11px] font-bold text-[#A64B3C] hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Discount code (try COZY10)"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-xs bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                  />
                  <button
                    type="submit"
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2 bg-[#EADCC8] hover:bg-[#D5C2BB] disabled:opacity-50 text-xs font-bold text-[#292929] rounded-xl transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
              {promoMessage && (
                <p className={`text-[11px] mt-1.5 font-bold ${promoMessage.error ? 'text-red-500' : 'text-emerald-700'}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#777777] font-semibold">
                <span>Subtotal</span>
                <span className="font-bold text-[#292929] tabular-nums">
                  {formatUsd(breakdown.subtotalUsd)}
                </span>
              </div>
              {breakdown.discountUsd > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount ({appliedDiscount?.code})</span>
                  <span className="tabular-nums">-{formatUsd(breakdown.discountUsd)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#292929] pt-2 border-t border-[#EADCC8]">
                <span>Total (USD)</span>
                <span className="text-[#A64B3C] text-base font-extrabold tabular-nums tracking-tight">
                  {formatUsd(breakdown.totalUsd)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <p className="text-[11px] text-center text-[#777777] font-medium">
              Instant digital download delivery immediately after checkout.
            </p>

          </div>
        )}

      </div>
    </div>
  );
};

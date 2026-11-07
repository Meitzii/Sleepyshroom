import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Tag, Check, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { EmptyCartShroom } from '../common/Icons.tsx';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    discount,
    appliedDiscount,
    total,
    applyDiscount,
    removeDiscount,
    navigateTo,
  } = useShop();

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
        className="fixed inset-0 bg-[#35282F]/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#F7F3E9] h-full shadow-2xl flex flex-col z-10 border-l border-[#E8C9C1]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E8C9C1]/60 flex items-center justify-between bg-[#F4EAE6]/50">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-lg text-[#1E1419]">
              Your Cozy Bag
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#8B6F7A] text-[#F7F3E9]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
            className="p-2 text-[#1E1419] hover:bg-[#E8C9C1]/50 rounded-xl transition-colors"
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
                className="flex items-start gap-4 p-3.5 bg-[#F9F6F0] rounded-2xl border border-[#E8C9C1] relative group"
              >
                {/* Thumbnail */}
                <img
                  src={item.product.images[0]}
                  alt={item.product.title}
                  className="w-16 h-16 object-cover rounded-xl shrink-0 border border-[#E8C9C1]"
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-sm text-[#1E1419] truncate">
                    {item.product.title}
                  </h4>
                  <p className="text-[11px] text-[#3B2834] font-medium mt-0.5">
                    {item.product.theme} · Digital Download
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    {/* Distinctive price */}
                    <span className="text-sm font-bold text-[#945367] tabular-nums tracking-tight">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 bg-[#F4EAE6] px-2 py-1 rounded-lg border border-[#E8C9C1]/60">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="text-xs font-bold text-[#1E1419] hover:text-[#8B6F7A] w-4 text-center"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-[#1E1419] w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="text-xs font-bold text-[#1E1419] hover:text-[#8B6F7A] w-4 text-center"
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
                  className="text-[#45313D] hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            /* Empty Cart Illustration */
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <EmptyCartShroom className="w-44 h-44 mb-3" />
              <h3 className="font-heading font-bold text-lg text-[#1E1419] mb-1">
                Your bag is peaceful and empty
              </h3>
              <p className="text-xs text-[#33222C] font-medium max-w-xs mb-6">
                Discover cozy wallpapers for your desktop, phone, and tablet to fill your digital sanctuary.
              </p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigateTo('collections');
                }}
                className="px-6 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs font-bold hover:bg-[#785E69] transition-all shadow-xs"
              >
                Browse Wallpapers
              </button>
            </div>
          )}
        </div>

        {/* Footer with Subtotal, Promo, Checkout */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#E8C9C1]/60 bg-[#F4EAE6]/50 space-y-4">
            
            {/* Promo Code Input */}
            <div>
              {appliedDiscount ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#D6C8F2]/30 border border-[#A99BEA]/50 text-xs text-[#1E1419]">
                  <div className="flex items-center gap-2 font-bold">
                    <Tag className="w-3.5 h-3.5 text-[#24171E]" />
                    <span>Code <strong className="font-mono">{appliedDiscount.code}</strong> applied</span>
                  </div>
                  <button
                    onClick={removeDiscount}
                    className="text-[11px] font-bold text-red-600 hover:underline"
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
                    className="flex-1 px-3 py-2 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl text-[#1E1419] font-medium placeholder-[#5A4550] focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                  />
                  <button
                    type="submit"
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2 bg-[#E8C9C1] hover:bg-[#D8B9B1] disabled:opacity-50 text-xs font-bold text-[#1E1419] rounded-xl transition-colors"
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
              <div className="flex justify-between text-[#33222C] font-semibold">
                <span>Subtotal</span>
                <span className="font-bold text-[#945367] tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount</span>
                  <span className="tabular-nums">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#1E1419] pt-2 border-t border-[#E8C9C1]/50">
                <span>Total</span>
                <span className="text-[#945367] text-base font-extrabold tabular-nums tracking-tight">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-[#F7F3E9] bg-[#8B6F7A] hover:bg-[#785E69] active:scale-98 shadow-sm transition-all flex items-center justify-center gap-2 group"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <p className="text-[11px] text-center text-[#3B2834] font-medium">
              Instant digital download delivery immediately after checkout.
            </p>

          </div>
        )}

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Lock, 
  CreditCard, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  Download, 
  Check, 
  AlertCircle,
  HelpCircle 
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    subtotal,
    discount,
    appliedDiscount,
    total,
    clearCart,
    setLatestOrder,
    navigateTo,
    user,
    settings,
  } = useShop();

  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'paypal' | 'gcash' | 'maya'>('stripe');

  // Simulated card fields (when stripe is selected)
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [isTestMode, setIsTestMode] = useState(true);

  // Status & error handling
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (cart.length === 0) {
    return (
      <div className="py-20 max-w-md mx-auto text-center px-4">
        <p className="text-4xl mb-4">🛒</p>
        <h2 className="font-heading font-bold text-2xl text-[#1E1419] mb-2">
          Your bag is empty
        </h2>
        <p className="text-sm text-[#33222C] font-medium mb-6">
          Please add a wallpaper to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => navigateTo('collections')}
          className="px-6 py-3 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-sm font-bold hover:bg-[#785E69] transition-all shadow-sm"
        >
          Browse Wallpapers
        </button>
      </div>
    );
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address for digital file delivery.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please provide your name.');
      return;
    }

    setLoading(true);

    try {
      const providerLabel = 
        selectedProvider === 'stripe' ? 'Stripe Card (International)' :
        selectedProvider === 'paypal' ? 'PayPal Wallet' :
        selectedProvider === 'gcash' ? 'GCash Mobile Payment' : 'Maya Digital Payment';

      // Call server checkout endpoint
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim(),
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          discountCode: appliedDiscount?.code,
          paymentMethod: providerLabel,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed on the server. Please try again.');
      }

      // Successful order creation and verification
      setLatestOrder(data.order);
      clearCart();
      navigateTo('confirmation', data.order.downloadToken);

    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing error. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigateTo('collections')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1419] hover:text-[#945367] transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Customer & Payment Form */}
          <div className="lg:col-span-7 space-y-6">
            
            <form onSubmit={handleSubmitPayment} className="space-y-6">
              
              {/* Step 1: Customer Info for Digital Delivery */}
              <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E8C9C1]/70 pb-3">
                  <span className="w-6 h-6 rounded-full bg-[#8B6F7A] text-[#F7F3E9] text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                    Delivery Email Address
                  </h2>
                </div>

                <p className="text-xs text-[#33222C] font-medium">
                  Your high-resolution wallpaper downloads and receipts will be delivered immediately to this email.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1E1419] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Clara Oswald"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E1419] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium focus:outline-none focus:ring-2 focus:ring-[#8B6F7A]/40"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Provider Selection */}
              <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8C9C1]/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#8B6F7A] text-[#F7F3E9] text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                      Payment Method
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                    <Lock className="w-3 h-3" />
                    <span>256-bit Encrypted</span>
                  </span>
                </div>

                {/* Provider Options Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* Stripe Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('stripe')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedProvider === 'stripe'
                        ? 'border-[#8B6F7A] bg-[#E8C9C1]/50 ring-2 ring-[#8B6F7A]/30 font-bold'
                        : 'border-[#D5C2BB] bg-white hover:bg-[#F4EAE6]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#8B6F7A]" />
                    <span className="text-xs text-[#1E1419] font-bold">Card (Stripe)</span>
                  </button>

                  {/* PayPal */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('paypal')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedProvider === 'paypal'
                        ? 'border-[#8B6F7A] bg-[#E8C9C1]/50 ring-2 ring-[#8B6F7A]/30 font-bold'
                        : 'border-[#D5C2BB] bg-white hover:bg-[#F4EAE6]'
                    }`}
                  >
                    <span className="font-bold text-[#8B6F7A] text-sm">PP</span>
                    <span className="text-xs text-[#1E1419] font-bold">PayPal</span>
                  </button>

                  {/* GCash */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('gcash')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedProvider === 'gcash'
                        ? 'border-[#8B6F7A] bg-[#E8C9C1]/50 ring-2 ring-[#8B6F7A]/30 font-bold'
                        : 'border-[#D5C2BB] bg-white hover:bg-[#F4EAE6]'
                    }`}
                  >
                    <span className="font-bold text-[#8B6F7A] text-sm">G</span>
                    <span className="text-xs text-[#1E1419] font-bold">GCash</span>
                  </button>

                  {/* Maya */}
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('maya')}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedProvider === 'maya'
                        ? 'border-[#8B6F7A] bg-[#E8C9C1]/50 ring-2 ring-[#8B6F7A]/30 font-bold'
                        : 'border-[#D5C2BB] bg-white hover:bg-[#F4EAE6]'
                    }`}
                  >
                    <span className="font-bold text-[#8B6F7A] text-sm">M</span>
                    <span className="text-xs text-[#1E1419] font-bold">Maya</span>
                  </button>

                </div>

                {/* Provider specific inputs */}
                {selectedProvider === 'stripe' && (
                  <div className="p-4 bg-white rounded-2xl border border-[#D5C2BB] space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#1E1419] mb-1">
                      <span className="font-bold">Card Details</span>
                      <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        Test Mode Enabled (4242 ready)
                      </span>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        placeholder="Card Number"
                        className="w-full px-3 py-2 text-xs bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419] font-mono font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="w-full px-3 py-2 text-xs bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419] font-mono font-medium text-center"
                      />
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                        placeholder="CVC"
                        className="w-full px-3 py-2 text-xs bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419] font-mono font-medium text-center"
                      />
                    </div>
                  </div>
                )}

                {selectedProvider === 'paypal' && (
                  <div className="p-4 bg-white rounded-2xl border border-[#D5C2BB] text-xs text-[#1E1419] space-y-2">
                    <p className="font-bold text-[#1E1419]">PayPal Express Checkout</p>
                    <p className="text-[#33222C] font-medium">
                      Upon clicking complete, you will be redirected to PayPal's secure portal to authorize your digital purchase.
                    </p>
                  </div>
                )}

                {(selectedProvider === 'gcash' || selectedProvider === 'maya') && (
                  <div className="p-4 bg-white rounded-2xl border border-[#D5C2BB] text-xs text-[#1E1419] space-y-2">
                    <p className="font-bold text-[#1E1419]">
                      {selectedProvider === 'gcash' ? 'GCash Mobile Payment' : 'Maya Digital Payment'}
                    </p>
                    <p className="text-[#33222C] font-medium">
                      Supported through our payment gateway. A secure payment prompt or QR invoice will finalize verification.
                    </p>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-[#F7F3E9] bg-[#8B6F7A] hover:bg-[#785E69] active:scale-98 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {loading ? 'Verifying Payment on Server...' : `Pay $${total.toFixed(2)} & Get Wallpapers`}
                  </span>
                </button>

                <p className="text-[11px] text-center text-[#45313D] font-medium">
                  By completing this order, you agree to our Digital Goods Return Policy. Instant download starts immediately.
                </p>

              </div>

            </form>

          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] shadow-xs space-y-5">
              
              <h3 className="font-heading font-bold text-lg text-[#1E1419] border-b border-[#E8C9C1]/70 pb-3">
                Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title}
                      className="w-12 h-12 object-cover rounded-xl shrink-0 border border-[#D5C2BB]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1E1419] truncate">
                        {item.product.title}
                      </p>
                      <p className="text-[11px] text-[#45313D] font-medium">
                        Qty {item.quantity} · {item.product.theme}
                      </p>
                    </div>
                    {/* Distinctive Price */}
                    <span className="text-xs font-extrabold text-[#945367] tabular-nums">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#E8C9C1]/70 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#33222C] font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#945367] tabular-nums">${subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount ({appliedDiscount?.code})</span>
                    <span className="tabular-nums">-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline text-base font-bold text-[#1E1419] pt-2 border-t border-[#E8C9C1]/70">
                  <span>Total Due</span>
                  {/* Distinctive Total Price */}
                  <span className="text-xl font-extrabold text-[#945367] tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Instant Download Guarantee */}
              <div className="p-4 bg-[#F4EAE6]/60 rounded-2xl border border-[#D5C2BB] space-y-2 text-xs text-[#33222C]">
                <div className="flex items-center gap-2 font-bold text-[#1E1419]">
                  <Download className="w-4 h-4 text-[#8B6F7A]" />
                  <span>Immediate Digital Access</span>
                </div>
                <p className="text-[11px] leading-relaxed font-medium">
                  Upon verified payment, you will instantly receive high-resolution download links and an email copy with a permanent digital token.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

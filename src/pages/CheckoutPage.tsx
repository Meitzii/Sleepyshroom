import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Lock,
  CreditCard,
  ArrowLeft,
  Download,
  AlertCircle,
  Tag,
  CheckCircle2,
  Smartphone,
  QrCode,
  Wallet,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { PaymongoPaymentMethodKey } from '../types/index.ts';
import {
  parseJsonResponse,
  extractApiErrorMessage,
  getOptionalSupabaseAuthHeader,
} from '../utils/apiClient.ts';
import { calculateCheckoutPhpBreakdown, formatPhp } from '../utils/currency.ts';

const BILLING_COUNTRIES = [
  'Philippines',
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Japan',
  'Singapore',
  'South Korea',
  'Germany',
  'France',
  'Other',
];

interface PaymongoMethodOption {
  key: PaymongoPaymentMethodKey;
  label: string;
  description: string;
  minPhp: number;
}

interface PaymongoCheckoutConfig {
  provider: 'paymongo';
  enabled?: boolean;
  configured: boolean;
  testMode: boolean;
  blockedLiveMode?: boolean;
  webhookConfigured: boolean;
  currency: string;
  currencySymbol: string;
  phpPerUsdRate: number;
  enabledMethods: PaymongoMethodOption[];
}

const DEFAULT_PAYMONGO_METHODS: PaymongoMethodOption[] = [
  { key: 'card', label: 'Credit / Debit Card', description: 'Visa, Mastercard', minPhp: 20 },
  { key: 'gcash', label: 'GCash', description: 'Pay with GCash e-wallet', minPhp: 1 },
  { key: 'paymaya', label: 'Maya', description: 'Pay with Maya wallet', minPhp: 1 },
  { key: 'qrph', label: 'QR Ph', description: 'InstaPay / PESONet banking QR', minPhp: 1 },
  { key: 'grab_pay', label: 'GrabPay', description: 'Pay with GrabPay wallet', minPhp: 20 },
];

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    appliedDiscount,
    applyDiscount,
    removeDiscount,
    navigateTo,
    user,
    settings,
    cancelledCheckoutToken,
    clearCancelledCheckoutNotice,
    phpPerUsdRate,
  } = useShop();

  // Step 1: Billing & Digital Delivery Details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingCountry, setBillingCountry] = useState('Philippines');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Step 2: Server PayMongo Config & Method Preference
  const [paymentConfig, setPaymentConfig] = useState<PaymongoCheckoutConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<'all' | PaymongoPaymentMethodKey>('all');

  // Promo code inside Checkout Order Summary
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Submission & cancellation feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedCancelTokenRef = useRef<string | null>(null);

  // Fetch live PayMongo gateway config from server
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/checkout');
        const parsed = await parseJsonResponse<PaymongoCheckoutConfig>(res);
        if (active && parsed.ok && parsed.isJson && parsed.data) {
          setPaymentConfig(parsed.data);
        }
      } catch {
        // Non-blocking fallback uses settings defaults
      } finally {
        if (active) setConfigLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reconcile returned PayMongo cancel redirect against server
  useEffect(() => {
    if (!cancelledCheckoutToken || processedCancelTokenRef.current === cancelledCheckoutToken) {
      return;
    }
    processedCancelTokenRef.current = cancelledCheckoutToken;

    (async () => {
      try {
        const authHeaders = await getOptionalSupabaseAuthHeader();
        const res = await fetch(`/api/orders/${encodeURIComponent(cancelledCheckoutToken)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ action: 'cancel_session' }),
        });
        const parsed = await parseJsonResponse<{
          verifiedPaid?: boolean;
          order?: { downloadToken?: string };
        }>(res);
        if (parsed.ok && parsed.isJson && parsed.data?.verifiedPaid && parsed.data?.order?.downloadToken) {
          clearCancelledCheckoutNotice();
          navigateTo('confirmation', parsed.data.order.downloadToken);
        }
      } catch {
        // Keep user safely on checkout page with bag preserved
      }
    })();
  }, [cancelledCheckoutToken, clearCancelledCheckoutNotice, navigateTo]);

  // Sync signed-in user fields cleanly without overwriting manual edits
  useEffect(() => {
    if (!user) return;
    setCustomerName(prev => (prev.trim() ? prev : user.name || ''));
    setCustomerEmail(prev => (prev.trim() ? prev : user.email || ''));
  }, [user]);

  const effectiveRate = paymentConfig?.phpPerUsdRate || phpPerUsdRate || 58;
  const breakdown = useMemo(
    () => calculateCheckoutPhpBreakdown(cart, appliedDiscount, effectiveRate),
    [cart, appliedDiscount, effectiveRate]
  );

  const isTestMode =
    paymentConfig?.testMode ?? (settings?.paymentProviders?.testMode !== false);

  const enabledMethods = useMemo<PaymongoMethodOption[]>(() => {
    if (paymentConfig?.enabledMethods && paymentConfig.enabledMethods.length > 0) {
      return paymentConfig.enabledMethods;
    }
    const configuredKeys = settings?.paymentProviders?.paymongoEnabledMethods;
    if (Array.isArray(configuredKeys) && configuredKeys.length > 0) {
      return DEFAULT_PAYMONGO_METHODS.filter(m => configuredKeys.includes(m.key));
    }
    return DEFAULT_PAYMONGO_METHODS;
  }, [paymentConfig, settings?.paymentProviders?.paymongoEnabledMethods]);

  useEffect(() => {
    if (selectedMethod !== 'all') {
      const found = enabledMethods.find(m => m.key === selectedMethod);
      if (!found || breakdown.totalPhp < found.minPhp) {
        setSelectedMethod('all');
      }
    }
  }, [enabledMethods, selectedMethod, breakdown.totalPhp]);

  if (cart.length === 0) {
    return (
      <div className="py-20 max-w-md mx-auto text-center px-4">
        <p className="text-4xl mb-4">🛒</p>
        <h2 className="font-heading font-bold text-2xl text-[#292929] mb-2">
          Your bag is empty
        </h2>
        <p className="text-sm text-[#777777] font-medium mb-6">
          Please add a wallpaper to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => navigateTo('collections')}
          className="px-6 py-3 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-sm font-bold hover:bg-[#8E3E30] transition-all shadow-sm cursor-pointer"
        >
          Browse Wallpapers
        </button>
      </div>
    );
  }

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoFeedback(null);
    const res = await applyDiscount(promoInput.trim());
    setPromoLoading(false);
    if (res.success) {
      setPromoFeedback({ text: res.message, isError: false });
      setPromoInput('');
    } else {
      setPromoFeedback({ text: res.message, isError: true });
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name for billing and digital delivery.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address for digital download delivery.');
      return;
    }

    if (!billingCountry.trim()) {
      setErrorMessage('Please select your billing country or region.');
      return;
    }

    if (breakdown.totalCentavos < 100) {
      setErrorMessage(
        'PayMongo Checkout requires a minimum payable amount. Freebie wallpapers can be downloaded directly without checkout.'
      );
      return;
    }

    setLoading(true);

    try {
      const authHeaders = await getOptionalSupabaseAuthHeader();

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          customerEmail: trimmedEmail,
          customerName: trimmedName,
          billingDetails: {
            country: billingCountry.trim(),
            city: billingCity.trim(),
            postalCode: billingPostalCode.trim(),
            addressLine1: billingAddress.trim(),
            phone: customerPhone.trim(),
          },
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          discountCode: appliedDiscount?.code,
          paymentMethod: selectedMethod,
        }),
      });

      const parsed = await parseJsonResponse<{
        success?: boolean;
        checkoutUrl?: string;
        sessionId?: string;
        order?: { downloadToken?: string };
        error?: string;
      }>(response);

      if (
        !parsed.isJson ||
        !parsed.ok ||
        !parsed.data?.success ||
        !parsed.data?.checkoutUrl
      ) {
        const msg = extractApiErrorMessage(
          parsed,
          'Could not start PayMongo Checkout right now. Please try again.'
        );
        throw new Error(msg);
      }

      clearCancelledCheckoutNotice();
      window.location.assign(parsed.data.checkoutUrl);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to connect to PayMongo Checkout. Please verify your details.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 bg-[#FFFCF7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigateTo('collections')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#292929] hover:text-[#A64B3C] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </button>

        {/* Cancelled PayMongo session banner */}
        {cancelledCheckoutToken !== null && (
          <div
            role="status"
            className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-950 font-medium"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">PayMongo checkout was cancelled before payment completed.</p>
                <p className="text-amber-900 mt-0.5">
                  No payment was captured and downloads were not unlocked. Your bag items remain saved so you can review or retry anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearCancelledCheckoutNotice}
              aria-label="Dismiss cancelled notice"
              className="p-1 text-amber-800 hover:text-amber-950 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Billing & PayMongo Checkout Form */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmitPayment} className="space-y-6" noValidate>

              {/* Step 1: Billing & Delivery Details */}
              <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#EADCC8] pb-3">
                  <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h2 className="font-heading font-bold text-lg text-[#292929]">
                    Billing &amp; Digital Delivery Details
                  </h2>
                </div>

                <p className="text-xs text-[#777777] font-medium leading-relaxed">
                  Pre-fills your PayMongo billing receipt and delivers your verified digital download links via email.
                </p>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="billing-name" className="block text-xs font-bold text-[#292929] mb-1">
                        Full Name *
                      </label>
                      <input
                        id="billing-name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="e.g. Clara Oswald"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-email" className="block text-xs font-bold text-[#292929] mb-1">
                        Delivery Email Address *
                      </label>
                      <input
                        id="billing-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="billing-phone" className="block text-xs font-bold text-[#292929] mb-1">
                        Mobile Number <span className="font-normal text-[#777777]">(optional, useful for GCash / Maya)</span>
                      </label>
                      <input
                        id="billing-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="e.g. 0917 123 4567"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-country" className="block text-xs font-bold text-[#292929] mb-1">
                        Country / Region *
                      </label>
                      <select
                        id="billing-country"
                        value={billingCountry}
                        onChange={e => setBillingCountry(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      >
                        {BILLING_COUNTRIES.map(country => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label htmlFor="billing-city" className="block text-xs font-bold text-[#292929] mb-1">
                        City
                      </label>
                      <input
                        id="billing-city"
                        type="text"
                        autoComplete="address-level2"
                        placeholder="e.g. Manila"
                        value={billingCity}
                        onChange={e => setBillingCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-postal" className="block text-xs font-bold text-[#292929] mb-1">
                        ZIP / Postal Code
                      </label>
                      <input
                        id="billing-postal"
                        type="text"
                        autoComplete="postal-code"
                        placeholder="e.g. 1000"
                        value={billingPostalCode}
                        onChange={e => setBillingPostalCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      />
                    </div>

                    <div>
                      <label htmlFor="billing-address" className="block text-xs font-bold text-[#292929] mb-1">
                        Street Address <span className="font-normal text-[#777777]">(optional)</span>
                      </label>
                      <input
                        id="billing-address"
                        type="text"
                        autoComplete="street-address"
                        placeholder="Street or unit"
                        value={billingAddress}
                        onChange={e => setBillingAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: PayMongo Hosted Checkout Options */}
              <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADCC8] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h2 className="font-heading font-bold text-lg text-[#292929]">
                      PayMongo Secure Checkout (PHP)
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-[#777777] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#A64B3C]" />
                    <span>{isTestMode ? 'PayMongo Test Sandbox' : 'PayMongo Hosted Payment'}</span>
                  </span>
                </div>

                {!configLoading && paymentConfig && paymentConfig.enabled === false && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">PayMongo checkout is currently paused by the store owner.</p>
                      <p className="text-amber-900">
                        Please check back shortly or contact shop.sleepyshroom@gmail.com for assistance.
                      </p>
                    </div>
                  </div>
                )}

                {!configLoading && paymentConfig && paymentConfig.enabled !== false && !paymentConfig.configured && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">
                        {paymentConfig.blockedLiveMode
                          ? 'Live PayMongo keys are blocked in test mode.'
                          : 'PayMongo gateway credentials are not configured on the server yet.'}
                      </p>
                      <p className="text-amber-900">
                        {paymentConfig.blockedLiveMode
                          ? 'Use a PayMongo sandbox secret key in your server environment variables.'
                          : 'Set PAYMONGO_SECRET_KEY in your Vercel or server environment variables to launch PayMongo Hosted Checkout.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-[#292929]">
                    Choose Payment Experience
                  </p>

                  {/* Primary Recommended All-Methods Hosted Session */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod('all');
                      setErrorMessage(null);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      selectedMethod === 'all'
                        ? 'border-[#A64B3C] bg-[#FFFCF7] ring-2 ring-[#A64B3C]/25'
                        : 'border-[#EADCC8] bg-[#FFFCF7] hover:bg-[#EADCC8]/25'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Wallet className="w-5 h-5 text-[#A64B3C] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#292929]">
                          All Enabled PayMongo Methods (Recommended)
                        </p>
                        <p className="text-[11px] text-[#777777] font-medium mt-0.5">
                          Pick Card, GCash, Maya, QR Ph, or GrabPay directly on PayMongo&apos;s hosted checkout page.
                        </p>
                      </div>
                    </div>
                    {selectedMethod === 'all' && (
                      <CheckCircle2 className="w-4 h-4 text-[#A64B3C] shrink-0" />
                    )}
                  </button>

                  {/* Specific PayMongo Channels */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {enabledMethods.map(method => {
                      const isActive = selectedMethod === method.key;
                      const belowMin = breakdown.totalPhp > 0 && breakdown.totalPhp < method.minPhp;
                      return (
                        <button
                          key={method.key}
                          type="button"
                          disabled={belowMin}
                          onClick={() => {
                            setSelectedMethod(method.key);
                            setErrorMessage(null);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                            isActive
                              ? 'border-[#A64B3C] bg-[#FFFCF7] ring-2 ring-[#A64B3C]/25 font-bold'
                              : 'border-[#EADCC8] bg-[#FFFCF7] hover:bg-[#EADCC8]/25 font-semibold'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            {method.key === 'card' ? (
                              <CreditCard className="w-4 h-4 text-[#A64B3C]" />
                            ) : method.key === 'qrph' ? (
                              <QrCode className="w-4 h-4 text-[#A64B3C]" />
                            ) : (
                              <Smartphone className="w-4 h-4 text-[#A64B3C]" />
                            )}
                            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#A64B3C]" />}
                          </div>
                          <span className="text-xs text-[#292929] font-bold">{method.label}</span>
                          <span className="text-[10px] text-[#777777] font-medium">
                            {belowMin ? `Min ₱${method.minPhp.toFixed(0)} PHP` : method.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Security Explanation Box */}
                <div className="p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-1.5 text-xs text-[#777777]">
                  <p className="font-bold text-[#292929] flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-[#A64B3C]" />
                    <span>Official PayMongo Hosted Checkout Redirect</span>
                  </p>
                  <p className="text-[11px] leading-relaxed font-medium">
                    Card numbers and e-wallet credentials are collected exclusively by PayMongo—never on Sleepyshroom. Your wallpapers unlock only after PayMongo confirms payment.
                  </p>
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading || breakdown.totalCentavos < 100 || paymentConfig?.enabled === false}
                  className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {loading
                      ? 'Redirecting to PayMongo...'
                      : `Proceed to PayMongo Checkout · ${formatPhp(breakdown.totalPhp)}`}
                  </span>
                </button>

                <p className="text-[11px] text-center text-[#777777] font-medium">
                  By continuing to PayMongo, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => navigateTo('policy')}
                    className="text-[#A64B3C] font-bold hover:underline cursor-pointer"
                  >
                    Digital Goods Return Policy
                  </button>
                  . Downloads unlock automatically upon verified payment.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary (PHP Checkout Currency) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">

              <div className="flex items-center justify-between border-b border-[#EADCC8] pb-3">
                <h3 className="font-heading font-bold text-lg text-[#292929]">
                  Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFFCF7] border border-[#EADCC8] text-[#A64B3C]">
                  PHP (₱)
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map(item => {
                  const lineItem = breakdown.items.find(b => b.productId === item.product.id);
                  const linePhp = lineItem ? lineItem.linePhp : 0;
                  return (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-xl shrink-0 border border-[#EADCC8]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#292929] truncate">
                          {item.product.title}
                        </p>
                        <p className="text-[11px] text-[#777777] font-medium">
                          Qty {item.quantity} · {item.product.theme} (${(item.product.price * item.quantity).toFixed(2)})
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-[#A64B3C] tabular-nums shrink-0">
                        {formatPhp(linePhp, false)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Box */}
              <div className="border-t border-[#EADCC8] pt-4 space-y-2">
                {appliedDiscount ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-xs text-[#292929]">
                    <div className="flex items-center gap-2 font-bold">
                      <Tag className="w-3.5 h-3.5 text-[#A64B3C]" />
                      <span>
                        Code <strong className="font-mono">{appliedDiscount.code}</strong> applied
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeDiscount();
                        setPromoFeedback(null);
                      }}
                      className="text-[11px] font-bold text-[#A64B3C] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. COZY10)"
                      value={promoInput}
                      onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                    />
                    <button
                      type="submit"
                      disabled={promoLoading || !promoInput.trim()}
                      className="px-4 py-2 bg-[#EADCC8] hover:bg-[#D5C2BB] disabled:opacity-50 text-xs font-bold text-[#292929] rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {promoLoading ? 'Checking...' : 'Apply'}
                    </button>
                  </form>
                )}
                {promoFeedback && (
                  <p className={`text-[11px] font-bold ${promoFeedback.isError ? 'text-red-700' : 'text-emerald-800'}`}>
                    {promoFeedback.text}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#EADCC8] pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-[#777777] font-medium">
                  <span>Subtotal (${breakdown.subtotalUsd.toFixed(2)} USD)</span>
                  <span className="font-bold text-[#292929] tabular-nums">
                    {formatPhp(breakdown.subtotalPhp)}
                  </span>
                </div>

                {breakdown.discountPhp > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount ({appliedDiscount?.code})</span>
                    <span className="tabular-nums">-{formatPhp(breakdown.discountPhp)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[11px] text-[#777777] font-medium">
                  <span>Conversion Rate</span>
                  <span className="tabular-nums">$1.00 USD = ₱{effectiveRate.toFixed(2)} PHP</span>
                </div>

                <div className="flex justify-between items-baseline text-base font-bold text-[#292929] pt-2 border-t border-[#EADCC8]">
                  <span>Total Due</span>
                  <span className="text-xl font-extrabold text-[#A64B3C] tabular-nums">
                    {formatPhp(breakdown.totalPhp)}
                  </span>
                </div>
              </div>

              {/* Verification Guarantee */}
              <div className="p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-2 text-xs text-[#777777]">
                <div className="flex items-center gap-2 font-bold text-[#292929]">
                  <Download className="w-4 h-4 text-[#A64B3C]" />
                  <span>Verified Digital Delivery</span>
                </div>
                <p className="text-[11px] leading-relaxed font-medium">
                  As soon as PayMongo confirms your payment, your high-resolution wallpaper downloads unlock automatically and an email receipt is dispatched.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

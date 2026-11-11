import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  CreditCard,
  ArrowLeft,
  Download,
  AlertCircle,
  Tag,
  CheckCircle2,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { PaymentProviderKey } from '../types/index.ts';
import {
  parseJsonResponse,
  extractApiErrorMessage,
  getOptionalSupabaseAuthHeader,
} from '../utils/apiClient.ts';
import { saveOrderToLocalCache } from '../utils/orderCache.ts';

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

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover';
  if (/^(352[89]|35[3-8])/.test(digits)) return 'JCB';
  return 'Card';
}

function passesLuhnCheck(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function formatCardNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(' ');
}

function formatExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function validateExpiryMmYy(raw: string): { valid: boolean; reason?: string } {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 4) {
    return { valid: false, reason: 'Please enter card expiration in MM/YY format.' };
  }
  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2, 4));
  if (month < 1 || month > 12) {
    return { valid: false, reason: 'Expiration month must be between 01 and 12.' };
  }
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valid: false, reason: 'This card has expired. Please use an active card.' };
  }
  return { valid: true };
}

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    subtotal,
    discount,
    appliedDiscount,
    total,
    applyDiscount,
    removeDiscount,
    clearCart,
    setLatestOrder,
    navigateTo,
    user,
    settings,
  } = useShop();

  // Step 1: Billing & Digital Delivery Details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [billingCountry, setBillingCountry] = useState('United States');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Step 2: Payment Provider & Method Fields
  const providerConfig = settings?.paymentProviders;
  const isTestMode = providerConfig?.testMode !== false;
  const availableProviders = useMemo(() => {
    const list: { key: 'stripe' | 'paypal' | 'gcash' | 'maya'; label: string }[] = [];
    if (!providerConfig || providerConfig.stripeEnabled !== false) {
      list.push({ key: 'stripe', label: 'Credit / Debit Card' });
    }
    if (!providerConfig || providerConfig.paypalEnabled !== false) {
      list.push({ key: 'paypal', label: 'PayPal' });
    }
    if (!providerConfig || providerConfig.gcashEnabled !== false) {
      list.push({ key: 'gcash', label: 'GCash' });
    }
    if (!providerConfig || providerConfig.mayaEnabled !== false) {
      list.push({ key: 'maya', label: 'Maya' });
    }
    if (list.length === 0) {
      list.push({ key: 'stripe', label: 'Credit / Debit Card' });
    }
    return list;
  }, [providerConfig]);

  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'paypal' | 'gcash' | 'maya'>('stripe');

  // Card fields (kept clean; never prefilled with masked placeholders)
  const [cardholderName, setCardholderName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState(user?.email || '');
  const [paypalReference, setPaypalReference] = useState('');

  // GCash / Maya wallet fields
  const [walletMobile, setWalletMobile] = useState('');
  const [walletAccountName, setWalletAccountName] = useState(user?.name || '');
  const [walletReference, setWalletReference] = useState('');

  // Inline promo code inside Checkout Order Summary
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync signed-in user fields cleanly without overwriting manual edits
  useEffect(() => {
    if (!user) return;
    setCustomerName(prev => (prev.trim() ? prev : user.name || ''));
    setCustomerEmail(prev => (prev.trim() ? prev : user.email || ''));
    setCardholderName(prev => (prev.trim() ? prev : user.name || ''));
    setPaypalEmail(prev => (prev.trim() ? prev : user.email || ''));
    setWalletAccountName(prev => (prev.trim() ? prev : user.name || ''));
  }, [user]);

  // Keep selectedProvider aligned with enabled admin payment settings
  useEffect(() => {
    if (!availableProviders.some(p => p.key === selectedProvider)) {
      setSelectedProvider(availableProviders[0].key);
    }
  }, [availableProviders, selectedProvider]);

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

  const cardDigits = cardNumber.replace(/\D/g, '');
  const detectedBrand = cardDigits.length > 0 ? detectCardBrand(cardDigits) : null;

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

  const handleFillTestCard = () => {
    setCardholderName(prev => (prev.trim() ? prev : customerName.trim() || 'Cozy Customer'));
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/29');
    setCardCvc('424');
    setErrorMessage(null);
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

    const activeProvider: PaymentProviderKey = total <= 0 ? 'free' : selectedProvider;
    let paymentDetails: Record<string, string> = {};
    let providerLabel = 'Complimentary Order ($0.00)';

    if (activeProvider === 'stripe') {
      const holder = (cardholderName || trimmedName).trim();
      if (!holder) {
        setErrorMessage('Please enter the cardholder name printed on your card.');
        return;
      }
      if (!passesLuhnCheck(cardDigits)) {
        setErrorMessage('Please enter a valid debit or credit card number.');
        return;
      }
      const expCheck = validateExpiryMmYy(cardExpiry);
      if (!expCheck.valid) {
        setErrorMessage(expCheck.reason || 'Please enter a valid expiration date (MM/YY).');
        return;
      }
      const cleanCvc = cardCvc.replace(/\D/g, '');
      const requiredCvcLen = detectedBrand === 'Amex' ? 4 : 3;
      if (cleanCvc.length < requiredCvcLen || cleanCvc.length > 4) {
        setErrorMessage(`Please enter a valid ${requiredCvcLen}-digit security code (CVC).`);
        return;
      }

      const brandName = detectCardBrand(cardDigits);
      const last4 = cardDigits.slice(-4);
      providerLabel = `Card (${brandName} •••• ${last4})`;
      paymentDetails = {
        cardholderName: holder,
        cardBrand: brandName,
        cardLast4: last4,
        cardExpiry: formatExpiryInput(cardExpiry),
      };
    } else if (activeProvider === 'paypal') {
      const cleanPaypalEmail = paypalEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanPaypalEmail)) {
        setErrorMessage('Please enter a valid PayPal account email address.');
        return;
      }
      if (providerConfig?.paypalEmail && !isTestMode && !paypalReference.trim()) {
        setErrorMessage('Please enter your PayPal transaction reference ID.');
        return;
      }
      providerLabel = `PayPal (${cleanPaypalEmail})`;
      paymentDetails = {
        paypalEmail: cleanPaypalEmail,
        referenceNumber: paypalReference.trim(),
      };
    } else if (activeProvider === 'gcash' || activeProvider === 'maya') {
      const walletTitle = activeProvider === 'gcash' ? 'GCash' : 'Maya';
      const cleanMobile = walletMobile.replace(/\D/g, '');
      const cleanAccName = (walletAccountName || trimmedName).trim();
      if (cleanMobile.length < 10 || cleanMobile.length > 13) {
        setErrorMessage(
          `Please enter a valid ${walletTitle} mobile number (e.g. 0917 123 4567).`
        );
        return;
      }
      if (!cleanAccName) {
        setErrorMessage(`Please enter your ${walletTitle} account name.`);
        return;
      }
      const hasMerchantAccount =
        activeProvider === 'gcash'
          ? Boolean(providerConfig?.gcashNumber)
          : Boolean(providerConfig?.mayaNumber);
      if (hasMerchantAccount && !isTestMode && !walletReference.trim()) {
        setErrorMessage(
          `Please enter your ${walletTitle} reference number after completing the wallet transfer.`
        );
        return;
      }
      providerLabel = `${walletTitle} Wallet`;
      paymentDetails = {
        mobileNumber: cleanMobile,
        accountName: cleanAccName,
        referenceNumber: walletReference.trim(),
      };
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
          },
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          discountCode: appliedDiscount?.code,
          paymentProvider: activeProvider,
          paymentMethod: providerLabel,
          paymentDetails,
        }),
      });

      const parsed = await parseJsonResponse<{
        success?: boolean;
        order?: any;
        error?: string;
      }>(response);

      if (!parsed.isJson || !parsed.ok || !parsed.data?.success || !parsed.data?.order) {
        const msg = extractApiErrorMessage(
          parsed,
          'Checkout could not be completed right now. Please try again.'
        );
        throw new Error(msg);
      }

      saveOrderToLocalCache(parsed.data.order);
      setLatestOrder(parsed.data.order);
      clearCart();
      navigateTo('confirmation', parsed.data.order.downloadToken);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment processing error. Please verify your details.');
    } finally {
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Billing & Payment Form */}
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
                  Used for your purchase receipt and instant high-resolution wallpaper download access.
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                  </div>

                  <div>
                    <label htmlFor="billing-address" className="block text-xs font-bold text-[#292929] mb-1">
                      Billing Street Address <span className="font-normal text-[#777777]">(optional for digital delivery)</span>
                    </label>
                    <input
                      id="billing-address"
                      type="text"
                      autoComplete="street-address"
                      placeholder="Street, apartment, or suite"
                      value={billingAddress}
                      onChange={e => setBillingAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Options */}
              <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADCC8] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h2 className="font-heading font-bold text-lg text-[#292929]">
                      Payment Method
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-[#777777] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#A64B3C]" />
                    <span>{isTestMode ? 'Demo Test Checkout' : 'Secure Digital Checkout'}</span>
                  </span>
                </div>

                {total <= 0 ? (
                  <div className="p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] flex items-start gap-3 text-xs text-[#292929]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">No payment required ($0.00 Total Due)</p>
                      <p className="text-[#777777] font-medium">
                        Your promo discount covers the full order. Click below to generate your digital download package.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Payment Option Selector */}
                    <div
                      className={`grid gap-2.5 ${
                        availableProviders.length <= 2
                          ? 'grid-cols-2'
                          : availableProviders.length === 3
                          ? 'grid-cols-1 sm:grid-cols-3'
                          : 'grid-cols-2 sm:grid-cols-4'
                      }`}
                    >
                      {availableProviders.map(option => {
                        const isActive = selectedProvider === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setSelectedProvider(option.key);
                              setErrorMessage(null);
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              isActive
                                ? 'border-[#A64B3C] bg-[#FFFCF7] ring-2 ring-[#A64B3C]/25 font-bold'
                                : 'border-[#EADCC8] bg-[#FFFCF7] hover:bg-[#EADCC8]/30 font-semibold'
                            }`}
                          >
                            {option.key === 'stripe' && (
                              <CreditCard className="w-5 h-5 text-[#A64B3C]" />
                            )}
                            {option.key === 'paypal' && (
                              <Wallet className="w-5 h-5 text-[#A64B3C]" />
                            )}
                            {(option.key === 'gcash' || option.key === 'maya') && (
                              <Smartphone className="w-5 h-5 text-[#A64B3C]" />
                            )}
                            <span className="text-xs text-[#292929]">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Option Details: Credit / Debit Card */}
                    {selectedProvider === 'stripe' && (
                      <div className="p-4 sm:p-5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#292929]">
                          <span className="font-bold">
                            Card Information {detectedBrand ? `· ${detectedBrand}` : ''}
                          </span>
                          {isTestMode && (
                            <button
                              type="button"
                              onClick={handleFillTestCard}
                              className="text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Fill Test Visa (4242)
                            </button>
                          )}
                        </div>

                        <div>
                          <label htmlFor="card-holder" className="block text-xs font-bold text-[#292929] mb-1">
                            Cardholder Name *
                          </label>
                          <input
                            id="card-holder"
                            type="text"
                            autoComplete="cc-name"
                            value={cardholderName}
                            onChange={e => setCardholderName(e.target.value)}
                            placeholder="Name on card"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                          />
                        </div>

                        <div>
                          <label htmlFor="card-number" className="block text-xs font-bold text-[#292929] mb-1">
                            Card Number *
                          </label>
                          <input
                            id="card-number"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            value={cardNumber}
                            onChange={e => setCardNumber(formatCardNumberInput(e.target.value))}
                            placeholder="1234 5678 9012 3456"
                            maxLength={23}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-mono tabular-nums font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label htmlFor="card-expiry" className="block text-xs font-bold text-[#292929] mb-1">
                              Expiry Date *
                            </label>
                            <input
                              id="card-expiry"
                              type="text"
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              value={cardExpiry}
                              onChange={e => setCardExpiry(formatExpiryInput(e.target.value))}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-mono tabular-nums font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                            />
                          </div>
                          <div>
                            <label htmlFor="card-cvc" className="block text-xs font-bold text-[#292929] mb-1">
                              Security Code (CVC) *
                            </label>
                            <input
                              id="card-cvc"
                              type="password"
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              value={cardCvc}
                              onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="123"
                              maxLength={4}
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-mono tabular-nums font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-[#777777] font-medium leading-relaxed">
                          {isTestMode
                            ? 'Sandbox test mode is enabled: card details are validated cleanly without charging a real bank card.'
                            : 'Only the card brand and last 4 digits appear on your receipt.'}
                        </p>
                      </div>
                    )}

                    {/* Option Details: PayPal */}
                    {selectedProvider === 'paypal' && (
                      <div className="p-4 sm:p-5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-3.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#292929]">PayPal Checkout Details</span>
                          {customerEmail.trim() && paypalEmail !== customerEmail && (
                            <button
                              type="button"
                              onClick={() => setPaypalEmail(customerEmail)}
                              className="font-bold text-[#A64B3C] hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Use billing email
                            </button>
                          )}
                        </div>

                        {providerConfig?.paypalEmail && (
                          <div className="p-3 rounded-xl bg-[#FCF3E2] border border-[#EADCC8] space-y-1">
                            <p className="font-bold text-[#292929]">
                              Send PayPal payment (${total.toFixed(2)}) to:
                            </p>
                            <p className="font-mono text-[#A64B3C] font-bold">
                              {providerConfig.paypalEmail}
                            </p>
                          </div>
                        )}

                        <div>
                          <label htmlFor="paypal-email" className="block text-xs font-bold text-[#292929] mb-1">
                            PayPal Account Email *
                          </label>
                          <input
                            id="paypal-email"
                            type="email"
                            value={paypalEmail}
                            onChange={e => setPaypalEmail(e.target.value)}
                            placeholder="your-paypal@example.com"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                          />
                        </div>

                        <div>
                          <label htmlFor="paypal-ref" className="block text-xs font-bold text-[#292929] mb-1">
                            PayPal Transaction ID {providerConfig?.paypalEmail && !isTestMode ? '*' : '(Optional)'}
                          </label>
                          <input
                            id="paypal-ref"
                            type="text"
                            value={paypalReference}
                            onChange={e => setPaypalReference(e.target.value)}
                            placeholder="e.g. PP-984312"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                          />
                        </div>

                        <p className="text-[11px] text-[#777777] font-medium leading-relaxed">
                          {isTestMode && !providerConfig?.paypalEmail
                            ? 'Sandbox test mode is enabled: confirm with your PayPal email to generate your download order immediately.'
                            : 'Your receipt and permanent digital downloads unlock right after confirming.'}
                        </p>
                      </div>
                    )}

                    {/* Option Details: GCash / Maya */}
                    {(selectedProvider === 'gcash' || selectedProvider === 'maya') && (
                      <div className="p-4 sm:p-5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-3.5 text-xs">
                        <p className="font-bold text-[#292929]">
                          {selectedProvider === 'gcash' ? 'GCash Wallet Details' : 'Maya Wallet Details'}
                        </p>

                        {(selectedProvider === 'gcash' ? providerConfig?.gcashNumber : providerConfig?.mayaNumber) && (
                          <div className="p-3 rounded-xl bg-[#FCF3E2] border border-[#EADCC8] space-y-1">
                            <p className="font-bold text-[#292929]">
                              Send ${total.toFixed(2)} USD equivalent via {selectedProvider === 'gcash' ? 'GCash' : 'Maya'} to:
                            </p>
                            <p className="font-mono font-bold text-[#A64B3C]">
                              {selectedProvider === 'gcash'
                                ? `${providerConfig?.gcashNumber}${providerConfig?.gcashAccountName ? ` · ${providerConfig.gcashAccountName}` : ''}`
                                : `${providerConfig?.mayaNumber}${providerConfig?.mayaAccountName ? ` · ${providerConfig.mayaAccountName}` : ''}`}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label htmlFor="wallet-mobile" className="block text-xs font-bold text-[#292929] mb-1">
                              {selectedProvider === 'gcash' ? 'GCash Mobile Number *' : 'Maya Mobile Number *'}
                            </label>
                            <input
                              id="wallet-mobile"
                              type="tel"
                              inputMode="tel"
                              value={walletMobile}
                              onChange={e => setWalletMobile(e.target.value)}
                              placeholder="0917 123 4567"
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-mono tabular-nums font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                            />
                          </div>

                          <div>
                            <label htmlFor="wallet-name" className="block text-xs font-bold text-[#292929] mb-1">
                              Account Name *
                            </label>
                            <input
                              id="wallet-name"
                              type="text"
                              value={walletAccountName}
                              onChange={e => setWalletAccountName(e.target.value)}
                              placeholder="Account holder name"
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="wallet-ref" className="block text-xs font-bold text-[#292929] mb-1">
                            Reference Number{' '}
                            {(selectedProvider === 'gcash' ? providerConfig?.gcashNumber : providerConfig?.mayaNumber) && !isTestMode
                              ? '*'
                              : isTestMode
                              ? '(Optional in Test Mode)'
                              : '(Optional)'}
                          </label>
                          <input
                            id="wallet-ref"
                            type="text"
                            value={walletReference}
                            onChange={e => setWalletReference(e.target.value)}
                            placeholder="e.g. 901234567890"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

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
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] active:scale-98 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    {loading
                      ? 'Completing Your Order...'
                      : total <= 0
                      ? 'Complete Free Order & Get Wallpapers'
                      : `Complete Order ($${total.toFixed(2)})`}
                  </span>
                </button>

                <p className="text-[11px] text-center text-[#777777] font-medium">
                  By completing this order, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => navigateTo('policy')}
                    className="text-[#A64B3C] font-bold hover:underline cursor-pointer"
                  >
                    Digital Goods Return Policy
                  </button>
                  . Downloads become available immediately.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary + Inline Promo Code */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">

              <h3 className="font-heading font-bold text-lg text-[#292929] border-b border-[#EADCC8] pb-3">
                Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map(item => (
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
                        Qty {item.quantity} · {item.product.theme}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-[#A64B3C] tabular-nums shrink-0">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Code Box (available on Checkout directly) */}
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
                  <span>Subtotal</span>
                  <span className="font-bold text-[#292929] tabular-nums">${subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount ({appliedDiscount?.code})</span>
                    <span className="tabular-nums">-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline text-base font-bold text-[#292929] pt-2 border-t border-[#EADCC8]">
                  <span>Total Due</span>
                  <span className="text-xl font-extrabold text-[#A64B3C] tabular-nums">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Instant Download Guarantee */}
              <div className="p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-2 text-xs text-[#777777]">
                <div className="flex items-center gap-2 font-bold text-[#292929]">
                  <Download className="w-4 h-4 text-[#A64B3C]" />
                  <span>Immediate Digital Access</span>
                </div>
                <p className="text-[11px] leading-relaxed font-medium">
                  Once confirmed, your high-resolution wallpaper downloads and digital receipt token unlock immediately.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

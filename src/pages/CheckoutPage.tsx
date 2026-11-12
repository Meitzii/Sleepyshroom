import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  loadScript,
  type PayPalButtonsComponent,
} from '@paypal/paypal-js';
import {
  Lock,
  ArrowLeft,
  Download,
  AlertCircle,
  Tag,
  ShieldCheck,
  ExternalLink,
  Loader2,
  X,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Smartphone,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order } from '../types/index.ts';
import {
  parseJsonResponse,
  extractApiErrorMessage,
  getOptionalSupabaseAuthHeader,
} from '../utils/apiClient.ts';
import { calculateCheckoutBreakdown, formatUsd } from '../utils/currency.ts';
import {
  PaypalIcon,
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  ShieldLockIcon,
  ShroomLogoIcon,
} from '../components/common/Icons.tsx';

const BILLING_COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Philippines',
  'Japan',
  'Singapore',
  'South Korea',
  'Germany',
  'France',
  'Netherlands',
  'New Zealand',
  'Other',
];

interface PayPalCheckoutConfig {
  provider: 'paypal';
  enabled?: boolean;
  configured: boolean;
  webhookConfigured: boolean;
  clientId: string;
  environment: 'sandbox' | 'live';
  testMode: boolean;
  allowCards: boolean;
  currency: string;
  currencySymbol: string;
  minOrderUsd: number;
}

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    appliedDiscount,
    applyDiscount,
    removeDiscount,
    clearCart,
    setLatestOrder,
    navigateTo,
    user,
    settings,
    cancelledCheckoutToken,
    clearCancelledCheckoutNotice,
  } = useShop();

  // Step 1: Billing & Digital Delivery Details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingCountry, setBillingCountry] = useState('United States');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Step 2: Server PayPal Gateway Config & SDK State
  const [paymentConfig, setPaymentConfig] = useState<PayPalCheckoutConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  // Promo code inside Checkout Order Summary
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Submission, capture & hosted fallback state
  const [capturing, setCapturing] = useState(false);
  const [hostedLoading, setHostedLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackApproveUrl, setFallbackApproveUrl] = useState<string | null>(null);
  const [showPolicyAccordion, setShowPolicyAccordion] = useState(false);

  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const processedCancelTokenRef = useRef<string | null>(null);
  const activeOrderRef = useRef<{
    downloadToken: string;
    paypalOrderId: string;
    approveUrl?: string;
    signature: string;
  } | null>(null);

  const breakdown = useMemo(
    () => calculateCheckoutBreakdown(cart, appliedDiscount),
    [cart, appliedDiscount]
  );

  const minOrderCents = Math.max(
    50,
    Math.round((paymentConfig?.minOrderUsd ?? 0.5) * 100)
  );
  const meetsMinOrder = breakdown.totalCents >= minOrderCents;

  const isPaypalEnabled =
    paymentConfig?.enabled ?? (settings?.paymentProviders?.paypalEnabled !== false);
  const allowCards =
    paymentConfig?.allowCards ?? (settings?.paymentProviders?.paypalAllowCards !== false);
  const isTestMode =
    paymentConfig?.testMode ?? (settings?.paymentProviders?.testMode !== false);
  const sdkEnvironment: 'sandbox' | 'production' =
    paymentConfig?.environment === 'live' ? 'production' : 'sandbox';

  // Keep latest form & cart state in a ref so PayPal Buttons callbacks never force iframe teardown on typing
  const checkoutStateRef = useRef({
    customerName,
    customerEmail,
    customerPhone,
    billingCountry,
    billingCity,
    billingPostalCode,
    billingAddress,
    cart,
    appliedDiscount,
    breakdown,
    meetsMinOrder,
  });

  checkoutStateRef.current = {
    customerName,
    customerEmail,
    customerPhone,
    billingCountry,
    billingCity,
    billingPostalCode,
    billingAddress,
    cart,
    appliedDiscount,
    breakdown,
    meetsMinOrder,
  };

  const validateBillingState = (state: typeof checkoutStateRef.current): string | null => {
    const trimmedName = state.customerName.trim();
    const trimmedEmail = state.customerEmail.trim();

    if (!trimmedName) {
      return 'Please enter your full name for billing and digital delivery.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      return 'Please enter a valid email address for digital download delivery.';
    }
    if (!state.billingCountry.trim()) {
      return 'Please select your billing country or region.';
    }
    if (!state.meetsMinOrder) {
      return `PayPal Checkout requires a minimum payable order of ${formatUsd(minOrderCents / 100)}. Freebie wallpapers can be downloaded directly without checkout.`;
    }
    return null;
  };

  // Fetch live PayPal public config from server
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/checkout');
        const parsed = await parseJsonResponse<PayPalCheckoutConfig>(res);
        if (active && parsed.ok && parsed.isJson && parsed.data) {
          setPaymentConfig(parsed.data);
        }
      } catch {
        // Non-blocking fallback
      } finally {
        if (active) setConfigLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reconcile returned PayPal cancel redirect against server
  useEffect(() => {
    if (
      cancelledCheckoutToken === null ||
      !cancelledCheckoutToken ||
      processedCancelTokenRef.current === cancelledCheckoutToken
    ) {
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

  const buildOrderSignature = (state: typeof checkoutStateRef.current) =>
    JSON.stringify({
      customerName: state.customerName.trim(),
      customerEmail: state.customerEmail.trim().toLowerCase(),
      billingCountry: state.billingCountry.trim(),
      discountCode: state.appliedDiscount?.code || '',
      totalCents: state.breakdown.totalCents,
      items: state.cart.map(i => `${i.product.id}:${i.quantity}`),
    });

  useEffect(() => {
    setFallbackApproveUrl(null);
    activeOrderRef.current = null;
  }, [
    customerName,
    customerEmail,
    billingCountry,
    breakdown.totalCents,
    appliedDiscount?.code,
    cart,
  ]);

  const createServerPaypalOrder = async (): Promise<{
    paypalOrderId: string;
    downloadToken: string;
    approveUrl: string;
  }> => {
    const latest = checkoutStateRef.current;
    const validationErr = validateBillingState(latest);
    if (validationErr) {
      setErrorMessage(validationErr);
      throw new Error(validationErr);
    }

    setErrorMessage(null);
    const authHeaders = await getOptionalSupabaseAuthHeader();

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        customerEmail: latest.customerEmail.trim(),
        customerName: latest.customerName.trim(),
        billingDetails: {
          country: latest.billingCountry.trim(),
          city: latest.billingCity.trim(),
          postalCode: latest.billingPostalCode.trim(),
          addressLine1: latest.billingAddress.trim(),
          phone: latest.customerPhone.trim(),
        },
        items: latest.cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        discountCode: latest.appliedDiscount?.code,
      }),
    });

    const parsed = await parseJsonResponse<{
      success?: boolean;
      paypalOrderId?: string;
      approveUrl?: string;
      checkoutUrl?: string;
      order?: { downloadToken?: string };
      error?: string;
    }>(response);

    if (!parsed.isJson || !parsed.ok || !parsed.data?.success || !parsed.data?.paypalOrderId) {
      const msg = extractApiErrorMessage(
        parsed,
        'Could not create PayPal order right now. Please try again.'
      );
      setErrorMessage(msg);
      throw new Error(msg);
    }

    const paypalOrderId = parsed.data.paypalOrderId;
    const downloadToken = parsed.data.order?.downloadToken || '';
    const approveUrl = parsed.data.approveUrl || parsed.data.checkoutUrl || '';

    activeOrderRef.current = {
      paypalOrderId,
      downloadToken,
      approveUrl,
      signature: buildOrderSignature(latest),
    };

    if (approveUrl) {
      setFallbackApproveUrl(approveUrl);
    }

    if (downloadToken && paypalOrderId) {
      try {
        sessionStorage.setItem(
          `sleepyshroom_paypal_return_${downloadToken}`,
          paypalOrderId
        );
      } catch {
        // Ignore storage errors
      }
    }

    return { paypalOrderId, downloadToken, approveUrl };
  };

  // Load and render PayPal Smart Buttons (PayPal + Debit/Credit Card) when configured
  useEffect(() => {
    const container = paypalContainerRef.current;
    if (!container) return;

    if (
      configLoading ||
      !isPaypalEnabled ||
      !paymentConfig?.configured ||
      !paymentConfig?.clientId ||
      !meetsMinOrder
    ) {
      setSdkReady(false);
      setSdkLoading(false);
      container.innerHTML = '';
      return;
    }

    let cancelled = false;
    let renderedButtons: PayPalButtonsComponent | null = null;

    setSdkLoading(true);
    setSdkReady(false);
    setSdkError(null);

    (async () => {
      try {
        const paypal = await loadScript({
          clientId: paymentConfig.clientId,
          currency: 'USD',
          intent: 'capture',
          components: 'buttons',
          environment: sdkEnvironment,
          disableFunding: allowCards ? undefined : ['card'],
        });

        if (cancelled) return;

        if (!paypal?.Buttons) {
          setSdkError(
            'PayPal Smart Buttons could not initialize in this browser. You can use Hosted PayPal Checkout below.'
          );
          setSdkLoading(false);
          return;
        }

        const buttons = paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'checkout',
            height: 46,
            tagline: false,
          },
          onClick: (_data, actions) => {
            const err = validateBillingState(checkoutStateRef.current);
            if (err) {
              setErrorMessage(err);
              return actions.reject();
            }
            setErrorMessage(null);
            return actions.resolve();
          },
          createOrder: async () => {
            const created = await createServerPaypalOrder();
            return created.paypalOrderId;
          },
          onApprove: async (data) => {
            const orderIdToCapture =
              data.orderID || activeOrderRef.current?.paypalOrderId || '';
            const downloadToken = activeOrderRef.current?.downloadToken || '';
            const lookupKey = downloadToken || orderIdToCapture;

            if (!lookupKey) {
              setErrorMessage('Missing PayPal order reference for payment capture.');
              return;
            }

            setCapturing(true);
            setErrorMessage(null);

            try {
              const authHeaders = await getOptionalSupabaseAuthHeader();
              const captureRes = await fetch(
                `/api/orders/${encodeURIComponent(lookupKey)}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                  },
                  body: JSON.stringify({
                    action: 'capture',
                    paypalOrderId: orderIdToCapture,
                  }),
                }
              );

              const capturedParsed = await parseJsonResponse<{
                success?: boolean;
                verifiedPaid?: boolean;
                order?: Order;
                error?: string;
              }>(captureRes);

              if (
                !capturedParsed.isJson ||
                !capturedParsed.ok ||
                !capturedParsed.data?.verifiedPaid
              ) {
                const msg = extractApiErrorMessage(
                  capturedParsed,
                  'PayPal approved the payment, but capture verification failed.'
                );
                setErrorMessage(msg);
                return;
              }

              clearCancelledCheckoutNotice();
              const verifiedOrder = capturedParsed.data.order;
              if (verifiedOrder) {
                setLatestOrder(verifiedOrder);
              }
              clearCart();
              navigateTo(
                'confirmation',
                verifiedOrder?.downloadToken || downloadToken
              );
            } catch (err: any) {
              setErrorMessage(
                err?.message ||
                  'Unable to verify PayPal payment capture right now. Please try again.'
              );
            } finally {
              setCapturing(false);
            }
          },
          onCancel: () => {
            setErrorMessage(
              'PayPal checkout was closed before payment completed. Your bag items remain saved.'
            );
            const dlToken = activeOrderRef.current?.downloadToken;
            if (dlToken) {
              void (async () => {
                try {
                  const authHeaders = await getOptionalSupabaseAuthHeader();
                  await fetch(`/api/orders/${encodeURIComponent(dlToken)}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...authHeaders,
                    },
                    body: JSON.stringify({ action: 'cancel_session' }),
                  });
                } catch {
                  // Non-blocking
                }
              })();
            }
          },
          onError: (err) => {
            console.error('PayPal Smart Buttons error:', err);
            setErrorMessage(prev =>
              prev ||
              'PayPal Checkout encountered an error. Please double-check your billing email and retry, or use Hosted PayPal Checkout below.'
            );
          },
        });

        renderedButtons = buttons;

        if (!buttons.isEligible()) {
          setSdkError(
            'Inline PayPal Smart Buttons are not eligible here. Please use Hosted PayPal Checkout below.'
          );
          setSdkLoading(false);
          return;
        }

        container.innerHTML = '';
        await buttons.render(container);

        if (!cancelled) {
          setSdkReady(true);
          setSdkLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load PayPal JS SDK:', err);
          setSdkError(
            err?.message ||
              'Could not load PayPal Smart Buttons. You can continue via Hosted PayPal Checkout below.'
          );
          setSdkLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderedButtons) {
        void renderedButtons.close().catch(() => {});
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [
    configLoading,
    isPaypalEnabled,
    paymentConfig?.configured,
    paymentConfig?.clientId,
    sdkEnvironment,
    allowCards,
    meetsMinOrder,
    clearCancelledCheckoutNotice,
    clearCart,
    navigateTo,
    setLatestOrder,
  ]);

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

  const handleHostedPaypalRedirect = async () => {
    setErrorMessage(null);

    const currentSignature = buildOrderSignature(checkoutStateRef.current);
    if (
      fallbackApproveUrl &&
      activeOrderRef.current?.paypalOrderId &&
      activeOrderRef.current.signature === currentSignature
    ) {
      setHostedLoading(true);
      window.location.assign(fallbackApproveUrl);
      return;
    }

    setHostedLoading(true);
    try {
      const created = await createServerPaypalOrder();
      if (!created.approveUrl) {
        throw new Error('PayPal did not return a hosted approval URL.');
      }
      clearCancelledCheckoutNotice();
      window.location.assign(created.approveUrl);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to launch Hosted PayPal Checkout right now.'
      );
      setHostedLoading(false);
    }
  };

  const isStep1Valid = Boolean(
    customerName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail.trim()) &&
    billingCountry.trim()
  );

  return (
    <div className="py-8 sm:py-12 bg-[#FFFCF7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Step Breadcrumbs */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EADCC8]">
          <button
            type="button"
            onClick={() => navigateTo('collections')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#292929] hover:text-[#A64B3C] transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>

          {/* Stepper */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#777777]">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  isStep1Valid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#A64B3C] text-[#FFFCF7]'
                }`}
              >
                {isStep1Valid ? <Check className="w-3 h-3" /> : '1'}
              </span>
              <span className={isStep1Valid ? 'text-[#292929] font-bold' : 'text-[#292929]'}>
                Delivery Details
              </span>
            </div>
            <span className="text-[#EADCC8]">/</span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-[#A64B3C] font-bold">PayPal Payment (USD)</span>
            </div>
            <span className="text-[#EADCC8]">/</span>
            <div className="flex items-center gap-1.5 text-[#777777]/70">
              <span className="w-5 h-5 rounded-full bg-[#EADCC8]/50 text-[#777777] text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <span>Downloads</span>
            </div>
          </div>
        </div>

        {/* Cancelled PayPal session banner */}
        {cancelledCheckoutToken !== null && (
          <div
            role="status"
            className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-950 font-medium shadow-2xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">PayPal checkout was closed before payment completed.</p>
                <p className="text-amber-900 mt-0.5">
                  No payment was captured and downloads remain locked. Your bag items stay saved so you can retry anytime.
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

          {/* Left Column: Billing Details & PayPal Gateway */}
          <div className="lg:col-span-7 space-y-6">

            {/* Step 1: Billing & Digital Delivery Details */}
            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#EADCC8] pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                      isStep1Valid
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#A64B3C] text-[#FFFCF7]'
                    }`}
                  >
                    {isStep1Valid ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <h2 className="font-heading font-bold text-lg text-[#292929]">
                    Billing &amp; Digital Delivery Details
                  </h2>
                </div>
                {isStep1Valid && (
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready
                  </span>
                )}
              </div>

              <p className="text-xs text-[#777777] font-medium leading-relaxed">
                Your download link and PayPal receipt will be dispatched to this email immediately upon payment capture.
              </p>

              <div className="space-y-4">
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
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
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
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="billing-country" className="block text-xs font-bold text-[#292929] mb-1">
                      Country / Region *
                    </label>
                    <select
                      id="billing-country"
                      value={billingCountry}
                      onChange={e => setBillingCountry(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
                    >
                      {BILLING_COUNTRIES.map(country => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="billing-phone" className="block text-xs font-bold text-[#292929] mb-1">
                      Phone Number <span className="font-normal text-[#777777]">(optional)</span>
                    </label>
                    <input
                      id="billing-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. +1 555 014 8920"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
                    />
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
                      placeholder="e.g. Portland"
                      value={billingCity}
                      onChange={e => setBillingCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
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
                      placeholder="e.g. 97201"
                      value={billingPostalCode}
                      onChange={e => setBillingPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
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
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FFFCF7] border border-[#EADCC8] rounded-xl text-[#292929] font-medium focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: PayPal Payment Options & Smart Buttons */}
            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADCC8] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h2 className="font-heading font-bold text-lg text-[#292929]">
                    Select Payment Method (USD)
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              {/* PayPal Sandbox Notice */}
              {isTestMode && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>PayPal Sandbox Active · Test buyer accounts can be used to simulate checkout</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    Test Mode
                  </span>
                </div>
              )}

              {/* Accepted Payment Options Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: PayPal Account */}
                <div className="p-4 rounded-2xl border border-[#EADCC8] bg-[#FFFCF7] flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <PaypalIcon size={20} />
                    <span className="font-heading font-bold text-sm text-[#003087]">PayPal Account</span>
                  </div>
                  <p className="text-[11px] text-[#777777] font-medium leading-relaxed">
                    Pay securely using your PayPal balance, linked bank account, or Pay in 4 installments.
                  </p>
                </div>

                {/* Option 2: Debit & Credit Card */}
                <div className="p-4 rounded-2xl border border-[#EADCC8] bg-[#FFFCF7] flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#A64B3C]" />
                      <span className="font-heading font-bold text-sm text-[#292929]">Debit or Credit Card</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <VisaIcon width={24} height={16} />
                      <MastercardIcon width={24} height={16} />
                      <AmexIcon width={24} height={16} />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#777777] font-medium leading-relaxed">
                    No PayPal account required! Check out directly as a guest using any major card.
                  </p>
                </div>
              </div>

              {/* Security and Guidance Reassurance */}
              <div className="p-3.5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] flex items-center gap-2.5 text-xs text-[#292929]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-[11px] font-medium leading-relaxed text-[#555555]">
                  Select the gold <strong>PayPal</strong> button below for account checkout, or the black <strong>Debit or Credit Card</strong> button to pay directly by card.
                </p>
              </div>

              {!configLoading && !isPaypalEnabled && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">PayPal checkout is currently paused by the store owner.</p>
                    <p className="text-amber-900">
                      Please check back shortly or contact shop.sleepyshroom@gmail.com for assistance.
                    </p>
                  </div>
                </div>
              )}

              {!configLoading && isPaypalEnabled && paymentConfig && !paymentConfig.configured && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">PayPal gateway credentials are not configured on the server yet.</p>
                    <p className="text-amber-900">
                      Add <code className="font-mono font-bold">PAYPAL_CLIENT_ID</code> and{' '}
                      <code className="font-mono font-bold">PAYPAL_CLIENT_SECRET</code> to your server environment variables to activate PayPal Checkout.
                    </p>
                  </div>
                </div>
              )}

              {!meetsMinOrder && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Minimum payable total is {formatUsd(minOrderCents / 100)}.</p>
                    <p className="text-amber-900">
                      Complimentary freebie wallpapers ($0.00) can be downloaded directly from their product cards without checkout.
                    </p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-2.5 text-xs text-red-800 font-medium shadow-2xs"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    aria-label="Dismiss error"
                    className="text-red-700 hover:text-red-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Capturing Verification Modal / Card */}
              {capturing && (
                <div className="p-6 bg-white border border-[#EADCC8] rounded-2xl shadow-sm text-center space-y-3">
                  <div className="relative w-12 h-12 mx-auto">
                    <ShroomLogoIcon size={48} className="animate-pulse" />
                    <Loader2 className="w-6 h-6 animate-spin text-[#A64B3C] absolute -bottom-1 -right-1" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-base text-[#292929]">
                      Verifying payment with PayPal...
                    </h4>
                    <p className="text-xs text-[#777777] font-medium mt-1">
                      Capturing payment capture and unlocking your high-resolution digital wallpaper files.
                    </p>
                  </div>
                </div>
              )}

              {/* PayPal Smart Buttons Mount Container */}
              {isPaypalEnabled && paymentConfig?.configured && meetsMinOrder && (
                <div className="space-y-3 pt-2">
                  {sdkLoading && (
                    <div className="p-5 bg-white border border-[#EADCC8] rounded-2xl flex items-center justify-center gap-2.5 text-xs font-semibold text-[#777777]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#A64B3C]" />
                      <span>Loading secure PayPal checkout buttons...</span>
                    </div>
                  )}

                  <div
                    ref={paypalContainerRef}
                    className={capturing ? 'pointer-events-none opacity-40' : 'min-h-[48px]'}
                  />

                  {/* Fallback button only if PayPal Smart Buttons SDK is blocked or encounters an error */}
                  {sdkError && (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 font-medium space-y-3">
                      <p className="font-bold">{sdkError}</p>
                      <button
                        type="button"
                        disabled={hostedLoading || capturing || !meetsMinOrder}
                        onClick={() => {
                          void handleHostedPaypalRedirect();
                        }}
                        className="w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap shadow-xs"
                      >
                        {hostedLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-white shrink-0" />
                        )}
                        <span>
                          {hostedLoading
                            ? 'Connecting to PayPal...'
                            : `Continue to Hosted PayPal Checkout · ${formatUsd(breakdown.totalUsd)}`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Trust Badges Strip (4 Pillars) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[#EADCC8]">
                <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                  <Download className="w-3.5 h-3.5 text-[#A64B3C] mx-auto mb-1" />
                  <span className="block text-[10px] font-bold text-[#292929]">Instant Delivery</span>
                  <span className="text-[9px] text-[#777777]">300 DPI Lossless</span>
                </div>
                <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                  <ShieldLockIcon size={14} className="mx-auto mb-1" />
                  <span className="block text-[10px] font-bold text-[#292929]">Encrypted</span>
                  <span className="text-[9px] text-[#777777]">256-Bit SSL</span>
                </div>
                <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                  <CreditCard className="w-3.5 h-3.5 text-[#A64B3C] mx-auto mb-1" />
                  <span className="block text-[10px] font-bold text-[#292929]">No Account Needed</span>
                  <span className="text-[9px] text-[#777777]">Pay by Card</span>
                </div>
                <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#A64B3C] mx-auto mb-1" />
                  <span className="block text-[10px] font-bold text-[#292929]">Money-Back</span>
                  <span className="text-[9px] text-[#777777]">Duplicate Protection</span>
                </div>
              </div>

              <p className="text-[11px] text-center text-[#777777] font-medium">
                By completing checkout with PayPal, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => setShowPolicyAccordion(prev => !prev)}
                  className="text-[#A64B3C] font-bold hover:underline cursor-pointer"
                >
                  Digital Goods Return Policy
                </button>
                . Downloads unlock automatically upon verified payment capture.
              </p>
            </div>
          </div>

          {/* Right Column: Order Summary (Sticky Desktop Panel) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div className="bg-[#FCF3E2] rounded-3xl p-6 sm:p-8 border border-[#EADCC8] shadow-xs space-y-5">

              <div className="flex items-center justify-between border-b border-[#EADCC8] pb-3">
                <h3 className="font-heading font-bold text-lg text-[#292929]">
                  Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
                </h3>
                <span className="text-xs font-bold text-[#A64B3C] bg-white px-2.5 py-1 rounded-full border border-[#EADCC8]">
                  USD ($)
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map(item => {
                  const lineItem = breakdown.items.find(b => b.productId === item.product.id);
                  const lineUsd = lineItem ? lineItem.lineUsd : 0;
                  const isMobile = item.product.deviceTypes?.includes('mobile');
                  return (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8]">
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
                        <div className="flex items-center gap-1.5 text-[11px] text-[#777777] font-medium mt-0.5">
                          {isMobile ? (
                            <Smartphone className="w-3 h-3 text-[#A64B3C]" />
                          ) : (
                            <Monitor className="w-3 h-3 text-[#A64B3C]" />
                          )}
                          <span>Qty {item.quantity}</span>
                          <span>·</span>
                          <span className="truncate">{item.product.theme}</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#A64B3C] tabular-nums shrink-0">
                        {formatUsd(lineUsd, false)}
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
                  <span>Subtotal</span>
                  <span className="font-bold text-[#292929] tabular-nums">
                    {formatUsd(breakdown.subtotalUsd)}
                  </span>
                </div>

                {breakdown.discountUsd > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount ({appliedDiscount?.code})</span>
                    <span className="tabular-nums">-{formatUsd(breakdown.discountUsd)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline text-base font-bold text-[#292929] pt-2 border-t border-[#EADCC8]">
                  <span>Total Due</span>
                  <span className="text-xl font-extrabold text-[#A64B3C] tabular-nums">
                    {formatUsd(breakdown.totalUsd)}
                  </span>
                </div>
              </div>

              {/* Collapsible Return Policy Preview */}
              <div className="border-t border-[#EADCC8] pt-3">
                <button
                  type="button"
                  onClick={() => setShowPolicyAccordion(prev => !prev)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-[#777777] hover:text-[#292929] transition-colors cursor-pointer py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A64B3C]" />
                    <span>Return Policy &amp; Duplicate Protection</span>
                  </span>
                  {showPolicyAccordion ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showPolicyAccordion && (
                  <div className="mt-2.5 p-3.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-[11px] text-[#777777] leading-relaxed space-y-1.5 font-medium">
                    <p>
                      <strong>Instant Access:</strong> All items are digital downloads delivered immediately upon PayPal capture.
                    </p>
                    <p>
                      <strong>Duplicate Protection:</strong> Accidentally purchased the same wallpaper twice? Email us within 14 days and we refund the duplicate transaction.
                    </p>
                    <p>
                      <strong>Damaged Files:</strong> In the rare event of a download or unpack error, we reissue fresh download links right away.
                    </p>
                  </div>
                )}
              </div>

              {/* Verification Guarantee */}
              <div className="p-4 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-2 text-xs text-[#777777]">
                <div className="flex items-center gap-2 font-bold text-[#292929]">
                  <Download className="w-4 h-4 text-[#A64B3C]" />
                  <span>Instant High-Res Delivery</span>
                </div>
                <p className="text-[11px] leading-relaxed font-medium">
                  Once PayPal confirms your payment, your high-resolution wallpaper downloads unlock automatically on your confirmation screen and in your customer account.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

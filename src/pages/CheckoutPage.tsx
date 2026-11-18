import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  loadScript,
  loadCustomScript,
  type PayPalButtonsComponent,
} from '@paypal/paypal-js';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
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
  QrCode,
  Copy,
  Maximize2,
  Edit3,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import type { Order, PaymentProviderKey } from '../types/index.ts';
import {
  parseJsonResponse,
  extractApiErrorMessage,
  getOptionalSupabaseAuthHeader,
} from '../utils/apiClient.ts';
import {
  calculateCheckoutBreakdown,
  formatUsd,
  formatOrderMoney,
} from '../utils/currency.ts';
import {
  decodeQrPayloadFromImageSrc,
  injectQrPhAmount,
  generateQrCodeDataUrl,
  isValidEmvcoQrPayload,
} from '../utils/qrph.ts';
import {
  PaypalIcon,
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  GooglePayIcon,
  GcashIcon,
  MayaIcon,
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
  googlePay?: {
    enabled: boolean;
    configured: boolean;
    supportedViaPaypal: boolean;
    merchantId: string;
    merchantName: string;
  };
  phLocal?: {
    gcashEnabled: boolean;
    gcashConfigured: boolean;
    gcashQrImage: string;
    gcashQrPayload?: string;
    gcashAccountName: string;
    gcashAccountNumber: string;
    gcashInstructions: string;
    mayaEnabled: boolean;
    mayaConfigured: boolean;
    mayaQrImage: string;
    mayaQrPayload?: string;
    mayaAccountName: string;
    mayaAccountNumber: string;
    mayaInstructions: string;
    phpExchangeRate: number;
    currency: 'PHP';
    currencySymbol: '₱';
  };
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

  // Steam-style 3-stage checkout flow: details -> review -> payment
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'review' | 'payment'>('details');

  // Step 2: Payment Method Selector & Gateway State
  const [selectedMethod, setSelectedMethod] = useState<PaymentProviderKey>('paypal');
  const [paymentConfig, setPaymentConfig] = useState<PayPalCheckoutConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  // Google Pay SDK state
  const [gpayLoading, setGpayLoading] = useState(false);
  const [gpayError, setGpayError] = useState<string | null>(null);

  // PH Local QR (GCash / Maya) & Dynamic QRPh state
  const [manualReference, setManualReference] = useState('');
  const [manualSenderName, setManualSenderName] = useState('');
  const [manualProofNote, setManualProofNote] = useState('');
  const [showOptionalRef, setShowOptionalRef] = useState(false);
  const [submittingManualQr, setSubmittingManualQr] = useState(false);
  const [submittingZeroOrder, setSubmittingZeroOrder] = useState(false);
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string>('');
  const [qrAutoPopulated, setQrAutoPopulated] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [enlargedQrModal, setEnlargedQrModal] = useState<{ title: string; url: string } | null>(null);

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
  const googlePayContainerRef = useRef<HTMLDivElement | null>(null);
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

  const isZeroTotal = breakdown.totalCents === 0;

  const isPaypalEnabled =
    paymentConfig?.enabled ?? (settings?.paymentProviders?.paypalEnabled !== false);
  const allowCards =
    paymentConfig?.allowCards ?? (settings?.paymentProviders?.paypalAllowCards !== false);
  const isTestMode =
    paymentConfig?.testMode ?? (settings?.paymentProviders?.testMode !== false);
  const sdkEnvironment: 'sandbox' | 'production' =
    paymentConfig?.environment === 'live' ? 'production' : 'sandbox';

  const isGooglePayEnabled =
    paymentConfig?.googlePay?.enabled ??
    (settings?.paymentProviders?.googlePayEnabled !== false && isPaypalEnabled);
  const isGcashEnabled =
    paymentConfig?.phLocal?.gcashEnabled ??
    (settings?.paymentProviders?.gcashEnabled !== false);
  const isMayaEnabled =
    paymentConfig?.phLocal?.mayaEnabled ??
    (settings?.paymentProviders?.mayaEnabled !== false);

  const phLocalConfig = {
    gcashQrImage:
      paymentConfig?.phLocal?.gcashQrImage ?? settings?.paymentProviders?.gcashQrImage ?? '',
    gcashQrPayload:
      paymentConfig?.phLocal?.gcashQrPayload ?? settings?.paymentProviders?.gcashQrPayload ?? '',
    gcashAccountName:
      paymentConfig?.phLocal?.gcashAccountName ?? settings?.paymentProviders?.gcashAccountName ?? '',
    gcashAccountNumber:
      paymentConfig?.phLocal?.gcashAccountNumber ?? settings?.paymentProviders?.gcashAccountNumber ?? '',
    gcashInstructions:
      paymentConfig?.phLocal?.gcashInstructions ??
      settings?.paymentProviders?.gcashInstructions ??
      'Scan the GCash QR code — the exact PHP total is auto-filled when supported — then click Confirm Payment below for instant downloads.',
    mayaQrImage:
      paymentConfig?.phLocal?.mayaQrImage ?? settings?.paymentProviders?.mayaQrImage ?? '',
    mayaQrPayload:
      paymentConfig?.phLocal?.mayaQrPayload ?? settings?.paymentProviders?.mayaQrPayload ?? '',
    mayaAccountName:
      paymentConfig?.phLocal?.mayaAccountName ?? settings?.paymentProviders?.mayaAccountName ?? '',
    mayaAccountNumber:
      paymentConfig?.phLocal?.mayaAccountNumber ?? settings?.paymentProviders?.mayaAccountNumber ?? '',
    mayaInstructions:
      paymentConfig?.phLocal?.mayaInstructions ??
      settings?.paymentProviders?.mayaInstructions ??
      'Scan the Maya QR code — the exact PHP total is auto-filled when supported — then click Confirm Payment below for instant downloads.',
    phpExchangeRate:
      paymentConfig?.phLocal?.phpExchangeRate ?? settings?.paymentProviders?.phpExchangeRate ?? 56.5,
  };

  const phpTotal = Number((breakdown.totalUsd * phLocalConfig.phpExchangeRate).toFixed(2));
  const isManualQrSelected = selectedMethod === 'gcash' || selectedMethod === 'maya';

  // Keep latest form & cart state in a ref so PayPal / Google Pay callbacks never force iframe teardown on typing
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
    return null;
  };

  // Fetch live payment gateway public config from server
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/checkout');
        const parsed = await parseJsonResponse<PayPalCheckoutConfig>(res);
        if (active && parsed.ok && parsed.isJson && parsed.data) {
          setPaymentConfig(parsed.data);
          // Default to first enabled method if PayPal is paused
          if (parsed.data.enabled === false) {
            if (parsed.data.phLocal?.gcashEnabled) setSelectedMethod('gcash');
            else if (parsed.data.phLocal?.mayaEnabled) setSelectedMethod('maya');
          }
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

  const createServerPaypalOrder = async (
    provider: 'paypal' | 'google_pay' = 'paypal'
  ): Promise<{
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
        paymentProvider: provider,
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
      code?: string;
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
      if (parsed.data?.code === 'discount_already_used') {
        removeDiscount();
        setPromoFeedback({ text: msg, isError: true });
      }
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

  // Auto-generate dynamic amount-populated QRPh image for GCash / Maya whenever PHP total changes
  useEffect(() => {
    if (
      (selectedMethod !== 'gcash' && selectedMethod !== 'maya') ||
      phpTotal <= 0
    ) {
      setDynamicQrUrl('');
      setQrAutoPopulated(false);
      setQrGenerating(false);
      return;
    }

    const configuredPayload =
      selectedMethod === 'gcash'
        ? phLocalConfig.gcashQrPayload
        : phLocalConfig.mayaQrPayload;
    const baseQrImage =
      selectedMethod === 'gcash'
        ? phLocalConfig.gcashQrImage
        : phLocalConfig.mayaQrImage;

    if (!configuredPayload && !baseQrImage) {
      setDynamicQrUrl('');
      setQrAutoPopulated(false);
      setQrGenerating(false);
      return;
    }

    let cancelled = false;
    setQrGenerating(true);

    (async () => {
      try {
        let rawPayload =
          configuredPayload && isValidEmvcoQrPayload(configuredPayload)
            ? configuredPayload
            : '';

        if (!rawPayload && baseQrImage) {
          const decoded = await decodeQrPayloadFromImageSrc(baseQrImage);
          if (decoded && isValidEmvcoQrPayload(decoded)) {
            rawPayload = decoded;
          }
        }

        if (cancelled) return;

        if (rawPayload) {
          const amountPayload = injectQrPhAmount(rawPayload, phpTotal);
          if (amountPayload) {
            const generatedUrl = await generateQrCodeDataUrl(amountPayload);
            if (!cancelled) {
              setDynamicQrUrl(generatedUrl);
              setQrAutoPopulated(true);
              setQrGenerating(false);
              return;
            }
          }
        }

        if (!cancelled) {
          setDynamicQrUrl('');
          setQrAutoPopulated(false);
          setQrGenerating(false);
        }
      } catch {
        if (!cancelled) {
          setDynamicQrUrl('');
          setQrAutoPopulated(false);
          setQrGenerating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedMethod,
    phpTotal,
    phLocalConfig.gcashQrPayload,
    phLocalConfig.gcashQrImage,
    phLocalConfig.mayaQrPayload,
    phLocalConfig.mayaQrImage,
  ]);

  // Load and render PayPal Smart Buttons (PayPal + Debit/Credit Card) when active in Step 3
  useEffect(() => {
    const container = paypalContainerRef.current;
    if (!container) return;

    if (
      checkoutStep !== 'payment' ||
      isZeroTotal ||
      selectedMethod !== 'paypal' ||
      configLoading ||
      !isPaypalEnabled ||
      !paymentConfig?.configured ||
      !paymentConfig?.clientId
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
    checkoutStep,
    isZeroTotal,
    selectedMethod,
    configLoading,
    isPaypalEnabled,
    paymentConfig?.configured,
    paymentConfig?.clientId,
    sdkEnvironment,
    allowCards,
    clearCancelledCheckoutNotice,
    clearCart,
    navigateTo,
    setLatestOrder,
  ]);

  // Load and render Google Pay button via Google Pay Web API + PayPal Orders v2 when active in Step 3
  useEffect(() => {
    const container = googlePayContainerRef.current;
    if (!container) return;

    if (
      checkoutStep !== 'payment' ||
      isZeroTotal ||
      selectedMethod !== 'google_pay' ||
      configLoading ||
      !isPaypalEnabled ||
      !isGooglePayEnabled ||
      !paymentConfig?.configured ||
      !paymentConfig?.clientId
    ) {
      setGpayLoading(false);
      setGpayError(null);
      container.innerHTML = '';
      return;
    }

    let cancelled = false;
    setGpayLoading(true);
    setGpayError(null);
    container.innerHTML = '';

    (async () => {
      try {
        await loadCustomScript({ url: 'https://pay.google.com/gp/p/js/pay.js' });
        const paypalGp = await loadScript({
          clientId: paymentConfig.clientId,
          currency: 'USD',
          intent: 'capture',
          components: 'googlepay',
          dataNamespace: 'paypalGooglePay',
          environment: sdkEnvironment,
        });

        if (cancelled) return;

        const googleApi = (window as any)?.google?.payments?.api;
        const gpComponent = (paypalGp as any)?.Googlepay?.();
        if (!googleApi || !gpComponent) {
          setGpayError(
            'Google Pay is unavailable in this browser or not yet activated on the connected merchant app. You can pay via Card or PayPal.'
          );
          setGpayLoading(false);
          return;
        }

        const gpConfig = await gpComponent.config();
        if (cancelled) return;

        if (!gpConfig?.isEligible) {
          setGpayError(
            'Google Pay is not eligible for your PayPal merchant account or current device/browser. Please use PayPal, Debit/Credit Card, or PH Local QR.'
          );
          setGpayLoading(false);
          return;
        }

        const paymentsClient = new googleApi.PaymentsClient({
          environment: sdkEnvironment === 'production' ? 'PRODUCTION' : 'TEST',
        });

        const readiness = await paymentsClient.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: gpConfig.allowedPaymentMethods,
        });

        if (cancelled) return;

        if (!readiness?.result) {
          setGpayError(
            'Google Pay is not ready on this browser or device. Try Chrome with a Google account or pay via Card, PayPal, or PH Local QR.'
          );
          setGpayLoading(false);
          return;
        }

        const gpButton = paymentsClient.createButton({
          buttonColor: 'black',
          buttonType: 'pay',
          buttonRadius: 14,
          buttonSizeMode: 'fill',
          onClick: async () => {
            const latest = checkoutStateRef.current;
            const validationErr = validateBillingState(latest);
            if (validationErr) {
              setErrorMessage(validationErr);
              return;
            }
            setErrorMessage(null);

            try {
              const paymentDataRequest = {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: gpConfig.allowedPaymentMethods,
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: latest.breakdown.totalUsd.toFixed(2),
                  currencyCode: 'USD',
                  countryCode: gpConfig.countryCode || 'US',
                },
                merchantInfo: {
                  ...(gpConfig.merchantInfo || {}),
                  ...(paymentConfig.googlePay?.merchantId
                    ? { merchantId: paymentConfig.googlePay.merchantId }
                    : {}),
                  merchantName:
                    paymentConfig.googlePay?.merchantName ||
                    settings?.storeName ||
                    'sleepyshroom',
                },
              };

              const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
              setCapturing(true);

              const created = await createServerPaypalOrder('google_pay');
              const confirmRes = await gpComponent.confirmOrder({
                orderId: created.paypalOrderId,
                paymentMethodData: paymentData.paymentMethodData,
              });

              if (
                confirmRes?.status === 'PAYER_ACTION_REQUIRED' &&
                typeof gpComponent.initiatePayerAction === 'function'
              ) {
                await gpComponent.initiatePayerAction({ orderId: created.paypalOrderId });
              }

              const authHeaders = await getOptionalSupabaseAuthHeader();
              const captureRes = await fetch(
                `/api/orders/${encodeURIComponent(created.downloadToken || created.paypalOrderId)}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                  },
                  body: JSON.stringify({
                    action: 'capture',
                    paypalOrderId: created.paypalOrderId,
                  }),
                }
              );

              const capturedParsed = await parseJsonResponse<{
                success?: boolean;
                verifiedPaid?: boolean;
                order?: Order;
                error?: string;
              }>(captureRes);

              if (!capturedParsed.isJson || !capturedParsed.ok || !capturedParsed.data?.verifiedPaid) {
                const msg = extractApiErrorMessage(
                  capturedParsed,
                  'Google Pay approved the payment, but capture verification failed.'
                );
                setErrorMessage(msg);
                return;
              }

              clearCancelledCheckoutNotice();
              if (capturedParsed.data.order) {
                setLatestOrder(capturedParsed.data.order);
              }
              clearCart();
              navigateTo(
                'confirmation',
                capturedParsed.data.order?.downloadToken || created.downloadToken
              );
            } catch (err: any) {
              if (err?.statusCode === 'CANCELED') {
                setErrorMessage('Google Pay sheet was closed before completing payment.');
              } else {
                setErrorMessage(
                  err?.message || 'Unable to process Google Pay payment right now. Please try again.'
                );
              }
            } finally {
              setCapturing(false);
            }
          },
        });

        container.innerHTML = '';
        container.appendChild(gpButton);
        if (!cancelled) {
          setGpayLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setGpayError(
            err?.message ||
              'Google Pay could not be loaded here. You can pay via PayPal, Card, or PH Local QR instead.'
          );
          setGpayLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [
    checkoutStep,
    isZeroTotal,
    selectedMethod,
    configLoading,
    isPaypalEnabled,
    isGooglePayEnabled,
    paymentConfig?.configured,
    paymentConfig?.clientId,
    paymentConfig?.googlePay?.merchantId,
    paymentConfig?.googlePay?.merchantName,
    sdkEnvironment,
    settings?.storeName,
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
      const created = await createServerPaypalOrder('paypal');
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

  const handleCopyDetail = (key: string, value: string) => {
    if (!value) return;
    void navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(prev => (prev === key ? null : prev)), 2000);
  };

  const handleProceedToReview = () => {
    const validationErr = validateBillingState(checkoutStateRef.current);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }
    setErrorMessage(null);
    setCheckoutStep('review');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitZeroTotalOrder = async () => {
    const validationErr = validateBillingState(checkoutStateRef.current);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    setErrorMessage(null);
    setSubmittingZeroOrder(true);
    try {
      const authHeaders = await getOptionalSupabaseAuthHeader();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          paymentProvider: isManualQrSelected ? selectedMethod : 'paypal',
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim(),
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
        }),
      });

      const parsed = await parseJsonResponse<{
        success?: boolean;
        code?: string;
        order?: Order;
        error?: string;
      }>(response);

      if (!parsed.isJson || !parsed.ok || !parsed.data?.success || !parsed.data?.order) {
        const msg = extractApiErrorMessage(
          parsed,
          'Could not complete your order right now. Please try again.'
        );
        if (parsed.data?.code === 'discount_already_used') {
          removeDiscount();
          setPromoFeedback({ text: msg, isError: true });
        }
        setErrorMessage(msg);
        return;
      }

      clearCancelledCheckoutNotice();
      setLatestOrder(parsed.data.order);
      clearCart();
      navigateTo('confirmation', parsed.data.order.downloadToken);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Network error while completing your order.'
      );
    } finally {
      setSubmittingZeroOrder(false);
    }
  };

  const handleSubmitManualQrOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethod !== 'gcash' && selectedMethod !== 'maya') return;

    const validationErr = validateBillingState(checkoutStateRef.current);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    const cleanRef = manualReference.trim();

    setErrorMessage(null);
    setSubmittingManualQr(true);
    try {
      const authHeaders = await getOptionalSupabaseAuthHeader();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          paymentProvider: selectedMethod,
          paymentReference: cleanRef || undefined,
          senderName: manualSenderName.trim(),
          paymentProofNote: manualProofNote.trim(),
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim(),
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
        }),
      });

      const parsed = await parseJsonResponse<{
        success?: boolean;
        code?: string;
        order?: Order;
        error?: string;
      }>(response);

      if (!parsed.isJson || !parsed.ok || !parsed.data?.success || !parsed.data?.order) {
        const msg = extractApiErrorMessage(
          parsed,
          `Could not confirm your ${selectedMethod === 'gcash' ? 'GCash' : 'Maya'} order. Please try again.`
        );
        if (parsed.data?.code === 'discount_already_used') {
          removeDiscount();
          setPromoFeedback({ text: msg, isError: true });
        }
        setErrorMessage(msg);
        return;
      }

      clearCancelledCheckoutNotice();
      setLatestOrder(parsed.data.order);
      clearCart();
      navigateTo('confirmation', parsed.data.order.downloadToken);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Network error while confirming your payment.'
      );
    } finally {
      setSubmittingManualQr(false);
    }
  };

  const isStep1Valid = Boolean(
    customerName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail.trim()) &&
    billingCountry.trim()
  );

  const selectedMethodLabel = isZeroTotal
    ? 'Promo / Complimentary ($0.00)'
    : selectedMethod === 'gcash'
      ? 'GCash QR (PHP ₱)'
      : selectedMethod === 'maya'
        ? 'Maya QR (PHP ₱)'
        : selectedMethod === 'google_pay'
          ? 'Google Pay (USD $)'
          : 'PayPal & Debit/Credit Card (USD $)';

  const reviewTotalDisplay = isZeroTotal
    ? formatUsd(0)
    : isManualQrSelected
      ? formatOrderMoney(phpTotal, 'PHP')
      : formatUsd(breakdown.totalUsd);

  return (
    <div className="py-8 sm:py-12 bg-[#FFFFFF]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Step Breadcrumbs (Steam-style 3-step Checkout) */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => navigateTo('collections')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#292929] hover:text-[#A64B3C] transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>

          {/* Stepper */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#777777]">
            <button
              type="button"
              onClick={() => setCheckoutStep('details')}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  checkoutStep !== 'details'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#A64B3C] text-[#FFFCF7]'
                }`}
              >
                {checkoutStep !== 'details' ? <Check className="w-3 h-3" /> : '1'}
              </span>
              <span className={checkoutStep === 'details' ? 'text-[#A64B3C] font-bold' : 'text-[#292929]'}>
                Details &amp; Method
              </span>
            </button>

            <span className="text-[#EADCC8]">/</span>

            <button
              type="button"
              disabled={!isStep1Valid && checkoutStep === 'details'}
              onClick={() => {
                if (checkoutStep === 'details') {
                  handleProceedToReview();
                } else {
                  setCheckoutStep('review');
                }
              }}
              className="flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  checkoutStep === 'payment'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : checkoutStep === 'review'
                      ? 'bg-[#A64B3C] text-[#FFFCF7]'
                      : 'bg-[#EADCC8]/50 text-[#777777]'
                }`}
              >
                {checkoutStep === 'payment' ? <Check className="w-3 h-3" /> : '2'}
              </span>
              <span
                className={
                  checkoutStep === 'review'
                    ? 'text-[#A64B3C] font-bold'
                    : checkoutStep === 'payment'
                      ? 'text-[#292929] font-bold'
                      : ''
                }
              >
                Review Order
              </span>
            </button>

            <span className="text-[#EADCC8]">/</span>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  checkoutStep === 'payment'
                    ? 'bg-[#A64B3C] text-[#FFFCF7]'
                    : 'bg-[#EADCC8]/50 text-[#777777]'
                }`}
              >
                3
              </span>
              <span className={checkoutStep === 'payment' ? 'text-[#A64B3C] font-bold' : ''}>
                Payment
              </span>
            </div>

            <span className="text-[#EADCC8]">/</span>

            <div className="flex items-center gap-1.5 text-[#777777]/70">
              <span className="w-5 h-5 rounded-full bg-[#EADCC8]/50 text-[#777777] text-[11px] font-bold flex items-center justify-center">
                4
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

          {/* Left Column: Steam-style Details -> Review -> Payment Flow */}
          <div className="lg:col-span-7 space-y-6">

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-2.5 text-xs text-red-800 font-medium shadow-2xs"
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

            {/* STAGE 1: Details & Payment Method */}
            {checkoutStep === 'details' && (
              <>
                <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
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
                    Your download link and receipt will be dispatched to this email right after checkout.
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

                {/* Payment Method Selection Card */}
                <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <h2 className="font-heading font-bold text-lg text-[#292929]">
                        Choose Payment Method
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Lock className="w-3.5 h-3.5" />
                      <span>256-Bit SSL Encrypted</span>
                    </div>
                  </div>

                  {isZeroTotal ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Your order total is {formatUsd(0)}!</p>
                        <p className="mt-0.5 text-emerald-800">
                          No payment method is needed. Review your order on the next step to unlock your digital downloads immediately.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {isPaypalEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setSelectedMethod('paypal');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            selectedMethod === 'paypal'
                              ? 'bg-[#FFFCF7] border-[#A64B3C] ring-2 ring-[#A64B3C]/20 shadow-xs'
                              : 'bg-[#FFFCF7]/70 border-[#EADCC8] hover:border-[#A64B3C]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <PaypalIcon size={18} />
                            <span className="text-[10px] font-bold uppercase text-[#777777]">USD</span>
                          </div>
                          <div>
                            <span className="font-heading font-bold text-xs text-[#292929] block">
                              PayPal &amp; Cards
                            </span>
                            <span className="text-[10px] text-[#777777] font-medium block">
                              Instant Unlock
                            </span>
                          </div>
                        </button>
                      )}

                      {isPaypalEnabled && isGooglePayEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setSelectedMethod('google_pay');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            selectedMethod === 'google_pay'
                              ? 'bg-[#FFFCF7] border-[#A64B3C] ring-2 ring-[#A64B3C]/20 shadow-xs'
                              : 'bg-[#FFFCF7]/70 border-[#EADCC8] hover:border-[#A64B3C]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <GooglePayIcon width={34} height={17} />
                            <span className="text-[10px] font-bold uppercase text-[#777777]">USD</span>
                          </div>
                          <div>
                            <span className="font-heading font-bold text-xs text-[#292929] block">
                              Google Pay
                            </span>
                            <span className="text-[10px] text-[#777777] font-medium block">
                              1-Tap Instant
                            </span>
                          </div>
                        </button>
                      )}

                      {isGcashEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setSelectedMethod('gcash');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            selectedMethod === 'gcash'
                              ? 'bg-[#FFFCF7] border-[#007DFE] ring-2 ring-[#007DFE]/20 shadow-xs'
                              : 'bg-[#FFFCF7]/70 border-[#EADCC8] hover:border-[#007DFE]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <GcashIcon size={18} />
                            <span className="text-[10px] font-bold uppercase text-[#0057C2]">PHP ₱</span>
                          </div>
                          <div>
                            <span className="font-heading font-bold text-xs text-[#292929] block">
                              GCash QR
                            </span>
                            <span className="text-[10px] text-[#777777] font-medium block">
                              Auto-Amount · Instant
                            </span>
                          </div>
                        </button>
                      )}

                      {isMayaEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setSelectedMethod('maya');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            selectedMethod === 'maya'
                              ? 'bg-[#FFFCF7] border-[#0F172A] ring-2 ring-[#0F172A]/15 shadow-xs'
                              : 'bg-[#FFFCF7]/70 border-[#EADCC8] hover:border-[#0F172A]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <MayaIcon size={18} />
                            <span className="text-[10px] font-bold uppercase text-[#0F172A]">PHP ₱</span>
                          </div>
                          <div>
                            <span className="font-heading font-bold text-xs text-[#292929] block">
                              Maya QR
                            </span>
                            <span className="text-[10px] text-[#777777] font-medium block">
                              Auto-Amount · Instant
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleProceedToReview}
                      className="w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span>Continue to Review Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STAGE 2: Steam-Style Review Your Order Before Payment */}
            {checkoutStep === 'review' && (
              <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h2 className="font-heading font-bold text-lg text-[#292929]">
                      Review Your Order
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('details')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details / Method</span>
                  </button>
                </div>

                {/* Delivery & Selected Payment Method Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EADCC8] space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block">
                      Digital Delivery To
                    </span>
                    <p className="font-bold text-[#292929] text-sm">{customerName.trim()}</p>
                    <p className="text-[#555555] font-medium">{customerEmail.trim()}</p>
                    <p className="text-[11px] text-[#777777]">{billingCountry}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EADCC8] space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block">
                      Payment Method
                    </span>
                    <div className="flex items-center gap-2 font-bold text-[#292929] text-sm">
                      {!isZeroTotal && selectedMethod === 'gcash' && <GcashIcon size={18} />}
                      {!isZeroTotal && selectedMethod === 'maya' && <MayaIcon size={18} />}
                      {!isZeroTotal && selectedMethod === 'google_pay' && <GooglePayIcon width={28} height={14} />}
                      {!isZeroTotal && selectedMethod === 'paypal' && <PaypalIcon size={18} />}
                      {isZeroTotal && <Sparkles className="w-4 h-4 text-emerald-700" />}
                      <span>{selectedMethodLabel}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-semibold">
                      {isZeroTotal
                        ? 'Instant unlock — $0.00 balance due'
                        : isManualQrSelected
                          ? `QR code pre-fills ${formatOrderMoney(phpTotal, 'PHP')} automatically`
                          : 'Unlocks digital downloads immediately'}
                    </p>
                  </div>
                </div>

                {/* Itemized Order Review */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#777777] block">
                    Items ({cart.length})
                  </span>
                  <div className="divide-y divide-[#EADCC8]/70 rounded-2xl border border-[#EADCC8] bg-[#FFFCF7] overflow-hidden">
                    {cart.map(item => {
                      const lineItem = breakdown.items.find(b => b.productId === item.product.id);
                      const lineUsd = lineItem ? lineItem.lineUsd : 0;
                      return (
                        <div key={item.product.id} className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.product.images[0]}
                              alt={item.product.title}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 object-cover rounded-xl border border-[#EADCC8] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#292929] truncate">
                                {item.product.title}
                              </p>
                              <p className="text-[11px] text-[#777777] font-medium truncate">
                                {item.product.fileFormat || 'High-Res Digital'} · {item.product.deviceTypes?.join(', ')}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs sm:text-sm font-extrabold text-[#292929] tabular-nums shrink-0">
                            {formatUsd(lineUsd, false)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Final Total Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FCF3E2]/60 border border-[#EADCC8] space-y-2 text-xs">
                  <div className="flex justify-between text-[#555555] font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#292929] tabular-nums">{formatUsd(breakdown.subtotalUsd)}</span>
                  </div>
                  {breakdown.discountUsd > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>Single-Use Promo ({appliedDiscount?.code})</span>
                      <span className="tabular-nums">-{formatUsd(breakdown.discountUsd)}</span>
                    </div>
                  )}
                  <div className="pt-2.5 border-t border-[#EADCC8] flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-heading font-bold text-sm sm:text-base text-[#292929]">
                      Final Total to Pay
                    </span>
                    <div className="text-right">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#A64B3C] tabular-nums block">
                        {reviewTotalDisplay}
                      </span>
                      {!isZeroTotal && isManualQrSelected && (
                        <span className="text-[11px] font-semibold text-[#777777] tabular-nums block">
                          ({formatUsd(breakdown.totalUsd)} at ₱{phLocalConfig.phpExchangeRate.toFixed(2)}/$1)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Instant Digital Delivery: once you confirm your payment on the next step, your files unlock automatically with no manual approval waiting.
                  </span>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('details')}
                    className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-[#292929] bg-[#FFFCF7] hover:bg-[#FCF3E2] border border-[#EADCC8] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Details</span>
                  </button>

                  {isZeroTotal ? (
                    <button
                      type="button"
                      disabled={submittingZeroOrder}
                      onClick={() => {
                        void handleSubmitZeroTotalOrder();
                      }}
                      className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      {submittingZeroOrder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>
                        {submittingZeroOrder
                          ? 'Unlocking Downloads...'
                          : 'Complete Free Order & Unlock Downloads'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setCheckoutStep('payment');
                        if (typeof window !== 'undefined') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span>Proceed to Payment · {reviewTotalDisplay}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 3: Complete Payment */}
            {checkoutStep === 'payment' && (
              <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <h2 className="font-heading font-bold text-lg text-[#292929]">
                        Complete Payment
                      </h2>
                      <p className="text-[11px] text-[#777777] font-medium">
                        {selectedMethodLabel} · {customerEmail.trim()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setCheckoutStep('review');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#A64B3C] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Review</span>
                  </button>
                </div>

                {/* Sandbox Notice (PayPal / Google Pay only) */}
                {!isZeroTotal && !isManualQrSelected && isTestMode && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>PayPal Sandbox Active · Test mode active for USD checkouts</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                      Test Mode
                    </span>
                  </div>
                )}

                {/* Capturing Verification Card */}
                {capturing && (
                  <div className="p-6 bg-white border border-[#EADCC8] rounded-2xl shadow-sm text-center space-y-3">
                    <div className="relative w-12 h-12 mx-auto">
                      <ShroomLogoIcon size={48} className="animate-pulse" />
                      <Loader2 className="w-6 h-6 animate-spin text-[#A64B3C] absolute -bottom-1 -right-1" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-base text-[#292929]">
                        Completing your order...
                      </h4>
                      <p className="text-xs text-[#777777] font-medium mt-1">
                        Confirming payment capture and unlocking your high-resolution digital files.
                      </p>
                    </div>
                  </div>
                )}

                {/* $0.00 Total Handler */}
                {isZeroTotal ? (
                  <div className="p-5 rounded-2xl bg-[#FFFCF7] border border-[#EADCC8] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-heading font-bold text-sm text-[#292929] block">
                          Promo / Complimentary Order
                        </span>
                        <span className="text-[11px] text-[#777777]">
                          Total balance due is $0.00. Click below to unlock your files instantly.
                        </span>
                      </div>
                      <span className="text-lg font-extrabold text-emerald-700 tabular-nums">
                        {formatUsd(0)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={submittingZeroOrder}
                      onClick={() => {
                        void handleSubmitZeroTotalOrder();
                      }}
                      className="w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      {submittingZeroOrder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>
                        {submittingZeroOrder
                          ? 'Unlocking Downloads...'
                          : 'Complete Free Order & Unlock Downloads'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* METHOD 1: PayPal & Debit/Credit Card */}
                    {selectedMethod === 'paypal' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-4 rounded-2xl border border-[#EADCC8] bg-[#FFFCF7] flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center gap-2 mb-2">
                              <PaypalIcon size={20} />
                              <span className="font-heading font-bold text-sm text-[#003087]">PayPal Account</span>
                            </div>
                            <p className="text-[11px] text-[#777777] font-medium leading-relaxed">
                              Pay securely using your PayPal balance, linked bank account, or Pay in 4 installments.
                            </p>
                          </div>

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

                        {!configLoading && isPaypalEnabled && paymentConfig && !paymentConfig.configured && (
                          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-bold">PayPal gateway credentials are not configured on the server yet.</p>
                              <p className="text-amber-900">
                                Add <code className="font-mono font-bold">PAYPAL_CLIENT_ID</code> and{' '}
                                <code className="font-mono font-bold">PAYPAL_CLIENT_SECRET</code> in server environment variables, or pay via GCash / Maya QR.
                              </p>
                            </div>
                          </div>
                        )}

                        {isPaypalEnabled && paymentConfig?.configured && (
                          <div className="space-y-3 pt-1">
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

                            {sdkError && (
                              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 font-medium space-y-3">
                                <p className="font-bold">{sdkError}</p>
                                <button
                                  type="button"
                                  disabled={hostedLoading || capturing}
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
                      </div>
                    )}

                    {/* METHOD 2: Google Pay (USD via PayPal) */}
                    {selectedMethod === 'google_pay' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl border border-[#EADCC8] bg-[#FFFCF7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FCF3E2] border border-[#EADCC8] flex items-center justify-center shrink-0">
                              <GooglePayIcon width={36} height={18} />
                            </div>
                            <div>
                              <h3 className="font-heading font-bold text-sm text-[#292929]">
                                Express Google Pay Checkout
                              </h3>
                              <p className="text-[11px] text-[#777777] font-medium">
                                Pay seamlessly in USD ({formatUsd(breakdown.totalUsd)}) using cards saved to your Google Account.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-center">
                            Instant Download
                          </span>
                        </div>

                        {!configLoading && paymentConfig && !paymentConfig.configured && (
                          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <p>
                              Server PayPal API credentials (<code className="font-mono font-bold">PAYPAL_CLIENT_ID</code>) are required for Google Pay processing.
                            </p>
                          </div>
                        )}

                        {paymentConfig?.configured && (
                          <div className="space-y-3">
                            {gpayLoading && (
                              <div className="p-5 bg-white border border-[#EADCC8] rounded-2xl flex items-center justify-center gap-2.5 text-xs font-semibold text-[#777777]">
                                <Loader2 className="w-4 h-4 animate-spin text-[#A64B3C]" />
                                <span>Checking Google Pay availability...</span>
                              </div>
                            )}

                            <div
                              ref={googlePayContainerRef}
                              className={capturing ? 'pointer-events-none opacity-40' : 'min-h-[48px]'}
                            />

                            {gpayError && (
                              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 font-medium space-y-2.5">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                  <p>{gpayError}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setErrorMessage(null);
                                    setSelectedMethod('paypal');
                                  }}
                                  className="px-4 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] rounded-xl text-xs font-bold cursor-pointer"
                                >
                                  Switch to PayPal / Debit &amp; Credit Card
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* METHOD 3 & 4: PH Local QR Payments (GCash QR / Maya QR — Auto-Populated Amount + Instant Unlock) */}
                    {(selectedMethod === 'gcash' || selectedMethod === 'maya') && (() => {
                      const isGcash = selectedMethod === 'gcash';
                      const brandLabel = isGcash ? 'GCash' : 'Maya';
                      const baseQrUrl = isGcash ? phLocalConfig.gcashQrImage : phLocalConfig.mayaQrImage;
                      const resolvedQrUrl = dynamicQrUrl || baseQrUrl;
                      const accountName = isGcash ? phLocalConfig.gcashAccountName : phLocalConfig.mayaAccountName;
                      const accountNumber = isGcash ? phLocalConfig.gcashAccountNumber : phLocalConfig.mayaAccountNumber;
                      const instructions = isGcash ? phLocalConfig.gcashInstructions : phLocalConfig.mayaInstructions;
                      const isConfigured = Boolean(resolvedQrUrl || accountNumber);

                      return (
                        <form onSubmit={handleSubmitManualQrOrder} className="space-y-4">
                          {/* PHP Amount Banner */}
                          <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EADCC8] flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {isGcash ? <GcashIcon size={28} /> : <MayaIcon size={28} />}
                              <div>
                                <span className="font-heading font-bold text-sm text-[#292929] block">
                                  Pay via {brandLabel} QR Code (Philippines)
                                </span>
                                <span className="text-[11px] text-[#777777] font-medium">
                                  Exact PHP conversion: {formatUsd(breakdown.totalUsd)} × ₱{phLocalConfig.phpExchangeRate.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block">
                                Exact Amount
                              </span>
                              <span className="text-lg font-extrabold text-[#A64B3C] tabular-nums">
                                {formatOrderMoney(phpTotal, 'PHP')}
                              </span>
                            </div>
                          </div>

                          {!isConfigured ? (
                            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">
                                  {brandLabel} QR details have not been added yet by the store owner.
                                </p>
                                <p className="text-amber-900 mt-0.5">
                                  Please choose PayPal, Debit/Credit Card, or another enabled payment method, or contact {settings?.contactEmail || 'shop.sleepyshroom@gmail.com'}.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Scannable QR & Account Info Card */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 sm:p-5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8]">
                                {/* QR Display */}
                                <div className="sm:col-span-5 flex flex-col items-center gap-2">
                                  {resolvedQrUrl ? (
                                    <>
                                      <div className="p-3 bg-white rounded-2xl border border-[#EADCC8] shadow-2xs relative group">
                                        <img
                                          src={resolvedQrUrl}
                                          alt={`${brandLabel} Payment QR Code`}
                                          className="w-44 h-44 object-contain rounded-lg"
                                        />
                                        {qrGenerating ? (
                                          <div className="mt-2 py-1 px-2 rounded-lg bg-[#FCF3E2] text-[#777777] text-[10px] font-bold flex items-center justify-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>Encoding amount...</span>
                                          </div>
                                        ) : qrAutoPopulated ? (
                                          <div className="mt-2 py-1 px-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold text-center tabular-nums">
                                            {formatOrderMoney(phpTotal, 'PHP')} auto-filled in QR ✓
                                          </div>
                                        ) : null}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEnlargedQrModal({
                                              title: `${brandLabel} Official QR Code`,
                                              url: resolvedQrUrl,
                                            })
                                          }
                                          className="mt-2 w-full py-1.5 px-2.5 bg-[#FCF3E2] hover:bg-[#EADCC8] text-[#292929] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                        >
                                          <Maximize2 className="w-3 h-3" />
                                          <span>Enlarge QR</span>
                                        </button>
                                      </div>
                                      <a
                                        href={resolvedQrUrl}
                                        download={`sleepyshroom_${selectedMethod}_${phpTotal.toFixed(2)}_qr.png`}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A64B3C] hover:underline"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Save QR image to phone</span>
                                      </a>
                                    </>
                                  ) : (
                                    <div className="w-44 h-44 bg-[#FCF3E2] rounded-2xl border border-dashed border-[#EADCC8] flex flex-col items-center justify-center p-4 text-center text-[11px] text-[#777777]">
                                      <QrCode className="w-8 h-8 text-[#A64B3C] mb-1.5" />
                                      <span>Send directly using the {brandLabel} account number shown.</span>
                                    </div>
                                  )}
                                </div>

                                {/* Account Number, Account Name & Instructions */}
                                <div className="sm:col-span-7 space-y-3 text-xs">
                                  {accountName && (
                                    <div className="p-3 rounded-xl bg-[#FCF3E2] border border-[#EADCC8] flex items-center justify-between gap-2">
                                      <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block">
                                          Account Name
                                        </span>
                                        <span className="font-bold text-[#292929] text-sm">
                                          {accountName}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyDetail('accName', accountName)}
                                        className="px-2.5 py-1.5 bg-[#FFFCF7] hover:bg-[#EADCC8]/50 text-[#292929] rounded-lg border border-[#EADCC8] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        {copiedField === 'accName' ? (
                                          <Check className="w-3 h-3 text-emerald-700" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>{copiedField === 'accName' ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>
                                  )}

                                  {accountNumber && (
                                    <div className="p-3 rounded-xl bg-[#FCF3E2] border border-[#EADCC8] flex items-center justify-between gap-2">
                                      <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777] block">
                                          {brandLabel} Number
                                        </span>
                                        <span className="font-mono font-bold text-[#292929] text-sm">
                                          {accountNumber}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyDetail('accNum', accountNumber)}
                                        className="px-2.5 py-1.5 bg-[#FFFCF7] hover:bg-[#EADCC8]/50 text-[#292929] rounded-lg border border-[#EADCC8] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        {copiedField === 'accNum' ? (
                                          <Check className="w-3 h-3 text-emerald-700" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>{copiedField === 'accNum' ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="p-3 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] text-[11px] text-[#555555] leading-relaxed space-y-1">
                                    <p className="font-bold text-[#292929]">Payment Steps:</p>
                                    <p>{instructions}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Optional Reference Details + Instant Download Confirmation Button */}
                              <div className="p-4 sm:p-5 bg-[#FFFCF7] rounded-2xl border border-[#EADCC8] space-y-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 text-xs text-[#292929]">
                                    <Download className="w-4 h-4 text-[#A64B3C] shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-[#555555] font-medium">
                                      Scan &amp; pay <strong>{formatOrderMoney(phpTotal, 'PHP')}</strong> in your {brandLabel} app{qrAutoPopulated ? ' (amount already populated in QR)' : ''}, then click below to unlock your downloads immediately.
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setShowOptionalRef(prev => !prev)}
                                  className="text-[11px] font-bold text-[#777777] hover:text-[#292929] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {showOptionalRef ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                  <span>Add optional {brandLabel} reference number or note</span>
                                </button>

                                {showOptionalRef && (
                                  <div className="space-y-3 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label htmlFor="manual-ref" className="block text-xs font-bold text-[#292929] mb-1">
                                          {brandLabel} Reference No. <span className="font-normal text-[#777777]">(optional)</span>
                                        </label>
                                        <input
                                          id="manual-ref"
                                          type="text"
                                          placeholder="e.g. 9012 3456 7890"
                                          value={manualReference}
                                          onChange={e => setManualReference(e.target.value)}
                                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-[#FCF3E2]/50 border border-[#EADCC8] rounded-xl text-[#292929] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                                        />
                                      </div>
                                      <div>
                                        <label htmlFor="manual-sender" className="block text-xs font-bold text-[#292929] mb-1">
                                          Sender Name / Mobile <span className="font-normal text-[#777777]">(optional)</span>
                                        </label>
                                        <input
                                          id="manual-sender"
                                          type="text"
                                          placeholder="Account name or last 4 digits"
                                          value={manualSenderName}
                                          onChange={e => setManualSenderName(e.target.value)}
                                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#FCF3E2]/50 border border-[#EADCC8] rounded-xl text-[#292929] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label htmlFor="manual-note" className="block text-xs font-bold text-[#292929] mb-1">
                                        Payment Note <span className="font-normal text-[#777777]">(optional)</span>
                                      </label>
                                      <input
                                        id="manual-note"
                                        type="text"
                                        placeholder="Any helpful note for your receipt"
                                        value={manualProofNote}
                                        onChange={e => setManualProofNote(e.target.value)}
                                        className="w-full px-3.5 py-2 text-xs bg-[#FCF3E2]/50 border border-[#EADCC8] rounded-xl text-[#292929] focus:outline-none focus:ring-2 focus:ring-[#A64B3C]/40"
                                      />
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={submittingManualQr}
                                  className="w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold text-[#FFFCF7] bg-[#A64B3C] hover:bg-[#8E3E30] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
                                >
                                  {submittingManualQr ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                  <span>
                                    {submittingManualQr
                                      ? `Unlocking ${brandLabel} Downloads...`
                                      : `Confirm Payment & Unlock Downloads · ${formatOrderMoney(phpTotal, 'PHP')}`}
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </form>
                      );
                    })()}
                  </>
                )}

                {/* Trust Badges Strip (4 Pillars) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[#EADCC8]">
                  <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                    <Download className="w-3.5 h-3.5 text-[#A64B3C] mx-auto mb-1" />
                    <span className="block text-[10px] font-bold text-[#292929]">Instant Unlock</span>
                    <span className="text-[9px] text-[#777777]">300 DPI Lossless</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                    <ShieldLockIcon size={14} className="mx-auto mb-1" />
                    <span className="block text-[10px] font-bold text-[#292929]">Encrypted</span>
                    <span className="text-[9px] text-[#777777]">256-Bit SSL</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                    <CreditCard className="w-3.5 h-3.5 text-[#A64B3C] mx-auto mb-1" />
                    <span className="block text-[10px] font-bold text-[#292929]">Flexible Options</span>
                    <span className="text-[9px] text-[#777777]">Cards, GPay &amp; PH QR</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFCF7] rounded-xl border border-[#EADCC8] text-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#A64B3C] mx-auto mb-1" />
                    <span className="block text-[10px] font-bold text-[#292929]">Money-Back</span>
                    <span className="text-[9px] text-[#777777]">Duplicate Protection</span>
                  </div>
                </div>

                <p className="text-[11px] text-center text-[#777777] font-medium">
                  By completing checkout, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => setShowPolicyAccordion(prev => !prev)}
                    className="text-[#A64B3C] font-bold hover:underline cursor-pointer"
                  >
                    Digital Goods Return Policy
                  </button>
                  .
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary (Sticky Desktop Panel) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-5">

              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="font-heading font-bold text-lg text-[#292929]">
                  Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
                </h3>
                <span className="text-xs font-bold text-[#A64B3C] bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-200">
                  {isZeroTotal ? 'FREE' : isManualQrSelected ? 'PHP (₱)' : 'USD ($)'}
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
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#A64B3C] tabular-nums block">
                      {reviewTotalDisplay}
                    </span>
                    {!isZeroTotal && isManualQrSelected && (
                      <span className="text-[11px] font-semibold text-[#777777] tabular-nums block">
                        ({formatUsd(breakdown.totalUsd)} at ₱{phLocalConfig.phpExchangeRate.toFixed(2)}/$1)
                      </span>
                    )}
                  </div>
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
                      <strong>Digital Access:</strong> PayPal, Google Pay, GCash QR, Maya QR, and 100% promo orders unlock downloads immediately upon checkout completion.
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
                  Your high-resolution digital downloads unlock automatically on your confirmation screen right after completing checkout—no manual approval waiting.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Enlarged QR Modal */}
      {enlargedQrModal && (
        <div
          className="fixed inset-0 z-50 bg-[#292929]/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEnlargedQrModal(null)}
        >
          <div
            className="bg-[#FFFCF7] rounded-3xl border border-[#EADCC8] p-6 max-w-sm w-full space-y-4 shadow-2xl text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-[#292929]">
                {enlargedQrModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setEnlargedQrModal(null)}
                aria-label="Close QR zoom"
                className="p-1.5 rounded-xl bg-[#FCF3E2] text-[#292929] hover:bg-[#EADCC8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#EADCC8] flex items-center justify-center">
              <img
                src={enlargedQrModal.url}
                alt={enlargedQrModal.title}
                className="w-64 h-64 object-contain"
              />
            </div>
            <p className="text-xs font-bold text-[#A64B3C] tabular-nums">
              {qrAutoPopulated
                ? `${formatOrderMoney(phpTotal, 'PHP')} auto-filled when scanned`
                : `Send exactly ${formatOrderMoney(phpTotal, 'PHP')}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

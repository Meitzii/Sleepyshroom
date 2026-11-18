import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Package, 
  Sliders, 
  Home, 
  FolderKanban, 
  Settings as SettingsIcon, 
  ShoppingBag, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Check, 
  AlertCircle,
  ImagePlus,
  Lock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Mail,
  Star,
  Globe,
  FileText,
  ExternalLink,
  QrCode,
  X,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { supabase } from '../lib/supabase.ts';
import { parseJsonResponse } from '../utils/apiClient.ts';
import { uploadStoreAsset } from '../utils/uploadHelper.ts';
import { formatOrderMoney, formatUsd } from '../utils/currency.ts';
import {
  SOCIAL_PLATFORMS_META,
  isValidSocialHttpUrl,
  normalizeSocialMediaSettings,
} from '../utils/socialMedia.ts';
import { ContactMessagesPanel } from '../components/admin/ContactMessagesPanel.tsx';
import { CollectionsBundlesAdminPanel } from '../components/admin/CollectionsBundlesAdminPanel.tsx';
import { NewsletterEmailsAdminPanel } from '../components/admin/NewsletterEmailsAdminPanel.tsx';
import { ReviewsFaqsAdminPanel } from '../components/admin/ReviewsFaqsAdminPanel.tsx';
import { ImageUploadField } from '../components/admin/ImageUploadField.tsx';
import {
  PaypalIcon,
  GooglePayIcon,
  GcashIcon,
  MayaIcon,
  SocialPlatformIcon,
} from '../components/common/Icons.tsx';
import { initialSettings } from '../data/initialData.ts';
import type { 
  Product, 
  CarouselSlide, 
  Collection, 
  WebsiteSettings, 
  Order, 
  ContactMessage,
  ContactMessageStatus,
} from '../types/index.ts';

export const AdminDashboard: React.FC = () => {
  const { user, settings: storefrontSettings, carouselSlides: storefrontSlides, navigateTo, refreshData, applyUpdatedSettings } = useShop();

  const normalizeAdminSettings = (raw: Partial<WebsiteSettings> | null | undefined): WebsiteSettings => {
    const base: WebsiteSettings = {
      ...initialSettings,
      ...(storefrontSettings || {}),
    };
    const src = (raw || {}) as Partial<WebsiteSettings>;
    return {
      ...base,
      ...src,
      seo: {
        ...(base.seo || {}),
        ...(src.seo || {}),
      },
      paymentProviders: {
        ...base.paymentProviders,
        ...(src.paymentProviders || {}),
      },
      artworkProtection: {
        watermarkEnabled: true,
        watermarkOpacity: 0.22,
        watermarkStyle: 'diagonal',
        disableContextMenu: true,
        disableDrag: true,
        ...(base.artworkProtection || {}),
        ...(src.artworkProtection || {}),
      },
      aboutMe: {
        ...base.aboutMe,
        ...(src.aboutMe || {}),
      },
      returnPolicy: {
        ...base.returnPolicy,
        ...(src.returnPolicy || {}),
      },
      socialMedia: src.socialMedia ?? base.socialMedia,
      privacyPolicy: src.privacyPolicy ?? base.privacyPolicy,
      termsOfService: src.termsOfService ?? base.termsOfService,
    };
  };

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'carousel'
    | 'products'
    | 'collections'
    | 'homepage'
    | 'orders'
    | 'messages'
    | 'newsletter'
    | 'reviews_faqs'
    | 'settings'
  >('overview');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Editable state loaded from server (seeded with live storefront settings so Settings tab never stays blank)
  const [slides, setSlides] = useState<CarouselSlide[]>(storefrontSlides || []);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(() => normalizeAdminSettings(storefrontSettings));
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesSetupError, setMessagesSetupError] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [emailUsingSandbox, setEmailUsingSandbox] = useState(false);

  // Orders section filter & search state
  const [orderFilterStatus, setOrderFilterStatus] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Feedback notifications
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsTableMissing, setSettingsTableMissing] = useState(false);
  const [copiedSiteSettingsSql, setCopiedSiteSettingsSql] = useState(false);
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [confirmingManualOrderId, setConfirmingManualOrderId] = useState<string | null>(null);
  const [rejectManualOrderKey, setRejectManualOrderKey] = useState<string | null>(null);
  const [rejectManualReasonInput, setRejectManualReasonInput] = useState<string>('');
  const [refundConfirmOrderKey, setRefundConfirmOrderKey] = useState<string | null>(null);
  const [refundReasonInput, setRefundReasonInput] = useState<string>('');
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<{
    configured: boolean;
    environment?: 'sandbox' | 'live';
    testMode: boolean;
    allowCards?: boolean;
    webhookConfigured: boolean;
  } | null>(null);

  // Product modal & image upload state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
  const [brokenSlideIds, setBrokenSlideIds] = useState<Record<string, boolean>>({});
  const [uploadingProductGallery, setUploadingProductGallery] = useState(false);
  const [uploadingProductDownloadFile, setUploadingProductDownloadFile] = useState(false);

  const isAuthorizedAdminUser = Boolean(
    user &&
      (user.role === 'admin' ||
        user.isAdmin ||
        user.email.toLowerCase() === 'shop.sleepyshroom@gmail.com')
  );

  const getFreshAdminToken = async (): Promise<string | null> => {
    if (!supabase) return adminToken;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || null;
    if (token !== adminToken) {
      setAdminToken(token);
    }
    return token;
  };

  const fetchAdminMessages = async (tokenOverride?: string | null) => {
    const token = tokenOverride ?? (await getFreshAdminToken());
    if (!token) {
      setMessages([]);
      setMessagesSetupError('Please sign in with an administrator account to access inquiries.');
      return;
    }

    try {
      setMessagesLoading(true);
      setMessagesSetupError(null);
      const msgsRes = await fetch('/api/admin/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const msgsData = await msgsRes.json().catch(() => null);
      if (msgsData) {
        setEmailConfigured(Boolean(msgsData.emailConfigured));
        setEmailProvider(msgsData.emailProvider || null);
        setEmailUsingSandbox(Boolean(msgsData.emailUsingSandbox));
      }
      if (!msgsRes.ok || !msgsData?.success) {
        setMessages([]);
        setMessagesSetupError(
          msgsData?.error || 'Unable to load contact messages from Supabase.'
        );
        return;
      }

      setMessages(Array.isArray(msgsData.messages) ? msgsData.messages : []);
    } catch (err: any) {
      setMessagesSetupError(err?.message || 'Unable to load contact messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  // Load all admin data strictly when an authenticated admin session is present
  const loadAdminData = async (tokenOverride?: string | null) => {
    const token = tokenOverride ?? (await getFreshAdminToken());
    if (!isAuthorizedAdminUser || !token) {
      setLoadingStats(false);
      return;
    }

    try {
      setLoadingStats(true);
      const authHeaders = { Authorization: `Bearer ${token}` };
      const bust = `t=${Date.now()}`;
      const [statsRes, contentRes, prodsRes, colsRes, ordersRes, checkoutCfgRes] = await Promise.all([
        fetch(`/api/admin/stats?${bust}`, { headers: authHeaders, cache: 'no-store' }),
        fetch(`/api/admin/content?${bust}`, { headers: authHeaders, cache: 'no-store' }),
        fetch(`/api/products?includeDrafts=true&${bust}`, { cache: 'no-store' }),
        fetch(`/api/collections?includeAll=true&${bust}`, { cache: 'no-store' }),
        fetch(`/api/orders?${bust}`, { headers: authHeaders, cache: 'no-store' }),
        fetch(`/api/checkout?${bust}`, { cache: 'no-store' }),
      ]);

      const [statsParsed, contentParsed, prodsParsed, colsParsed, ordersParsed, checkoutParsed] = await Promise.all([
        parseJsonResponse(statsRes),
        parseJsonResponse(contentRes),
        parseJsonResponse(prodsRes),
        parseJsonResponse(colsRes),
        parseJsonResponse(ordersRes),
        parseJsonResponse(checkoutCfgRes),
      ]);

      if (statsParsed.ok && statsParsed.isJson && statsParsed.data) setStats(statsParsed.data);
      if (contentParsed.ok && contentParsed.isJson && contentParsed.data) {
        if (contentParsed.data.settings) setSettings(normalizeAdminSettings(contentParsed.data.settings));
        if (Array.isArray(contentParsed.data.carouselSlides)) setSlides(contentParsed.data.carouselSlides);
      } else {
        const publicContentRes = await fetch(`/api/content?${bust}`, { cache: 'no-store' });
        const publicContentParsed = await parseJsonResponse<any>(publicContentRes);
        if (publicContentParsed.ok && publicContentParsed.isJson && publicContentParsed.data) {
          if (publicContentParsed.data.settings) setSettings(normalizeAdminSettings(publicContentParsed.data.settings));
          if (Array.isArray(publicContentParsed.data.carouselSlides)) setSlides(publicContentParsed.data.carouselSlides);
        } else if (storefrontSettings) {
          setSettings(prev => prev || normalizeAdminSettings(storefrontSettings));
        }
      }
      if (prodsParsed.ok && prodsParsed.isJson && Array.isArray(prodsParsed.data)) setAllProducts(prodsParsed.data);
      if (colsParsed.ok && colsParsed.isJson && Array.isArray(colsParsed.data)) setAllCollections(colsParsed.data);
      if (ordersParsed.ok && ordersParsed.isJson && Array.isArray(ordersParsed.data)) setOrders(ordersParsed.data);
      if (checkoutParsed.ok && checkoutParsed.isJson && checkoutParsed.data) setGatewayStatus(checkoutParsed.data);

      await fetchAdminMessages(token);
    } catch (err: any) {
      setErrorMessage('Failed to load admin data: ' + err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    let active = true;
    const verifyAndLoad = async () => {
      setVerifyingAdmin(true);
      try {
        if (!isAuthorizedAdminUser) {
          if (active) {
            setAdminToken(null);
            setLoadingStats(false);
          }
          return;
        }
        const token = await getFreshAdminToken();
        if (!active) return;
        if (!token) {
          setLoadingStats(false);
          return;
        }
        await loadAdminData(token);
      } finally {
        if (active) setVerifyingAdmin(false);
      }
    };
    void verifyAndLoad();
    return () => {
      active = false;
    };
  }, [user?.id, user?.role, user?.email]);

  const handleUpdateMessageStatus = async (
    id: string,
    status: ContactMessageStatus
  ): Promise<{ success: boolean; error?: string }> => {
    const token = await getFreshAdminToken();
    if (!token) return { success: false, error: 'Administrator session expired.' };

    const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Could not update message status.' };
    }
    if (data.message) {
      setMessages(prev => prev.map(m => (m.id === id ? data.message : m)));
    }
    return { success: true };
  };

  const handleDeleteMessage = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const token = await getFreshAdminToken();
    if (!token) return { success: false, error: 'Administrator session expired.' };

    const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Could not delete message.' };
    }
    setMessages(prev => prev.filter(m => m.id !== id));
    return { success: true };
  };

  const handleSendReply = async (
    id: string,
    replySubject: string,
    replyBody: string
  ): Promise<{ success: boolean; error?: string }> => {
    const token = await getFreshAdminToken();
    if (!token) return { success: false, error: 'Administrator session expired.' };

    const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replySubject, replyBody }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || !data?.emailDelivered) {
      return {
        success: false,
        error: data?.error || 'Failed to send reply email.',
      };
    }
    if (data.message) {
      setMessages(prev => prev.map(m => (m.id === id ? data.message : m)));
    }
    return { success: true };
  };

  const triggerSaveNotification = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // 1. CAROUSEL ACTIONS
  const handleSlideChange = (id: string, field: keyof CarouselSlide, val: any) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleAddNewSlide = () => {
    const newSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      themeTitle: 'New Wallpaper Theme',
      description: 'A cozy description for this theme collection.',
      imageUrl: '',
      linkDestination: '/collections',
      exploreButtonText: 'Explore Theme',
      order: slides.length + 1,
      visible: true,
      status: 'draft',
    };
    setSlides([...slides, newSlide]);
  };

  const handleDeleteSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const copy = [...slides];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    copy.forEach((s, i) => { s.order = i + 1; });
    setSlides(copy);
  };

  const handleSaveCarousel = async (publishAll = false) => {
    try {
      const token = await getFreshAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = publishAll
        ? slides.map(s => ({ ...s, status: 'published' }))
        : slides;

      const res = await fetch('/api/admin/slides', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSlides(payload as any);
        triggerSaveNotification(publishAll ? 'Carousel changes published to live site!' : 'Carousel draft saved successfully!');
        refreshData();
      } else {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Save failed');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not update carousel slides.');
    }
  };

  // Image upload helper for carousel slides (uploads & immediately persists slide array)
  const handleUploadImageForSlide = async (slideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMessage(null);
    setUploadingSlideId(slideId);
    try {
      const token = await getFreshAdminToken();
      const uploaded = await uploadStoreAsset(file, {
        token,
        folder: 'carousel',
        optimizeImage: true,
      });

      const updatedSlides = slides.map(s =>
        s.id === slideId ? { ...s, imageUrl: uploaded.url } : s
      );
      setSlides(updatedSlides);
      setBrokenSlideIds(prev => {
        const next = { ...prev };
        delete next[slideId];
        return next;
      });

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const saveRes = await fetch('/api/admin/slides', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedSlides),
      });
      if (saveRes.ok) {
        triggerSaveNotification('Carousel slide picture uploaded & saved!');
        refreshData();
      } else {
        triggerSaveNotification('Picture uploaded! Click "Publish Changes" to save.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload slide image.');
    } finally {
      setUploadingSlideId(null);
    }
  };

  // 2. PRODUCT ACTIONS
  const handleOpenAddProduct = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      title: '',
      slug: '',
      description: '',
      price: 4.00,
      compareAtPrice: 5.00,
      theme: allCollections[0]?.name || 'Mushroom Dreams',
      collection: allCollections[0]?.name || 'Dreamy Night',
      collectionId: allCollections[0]?.id || '',
      category: 'desktop',
      productType: 'wallpaper',
      deviceTypes: ['desktop'],
      resolutions: ['4K UHD (3840 x 2160)', '5K Retina'],
      fileFormat: 'Lossless PNG (300 DPI)',
      fileSize: '32.0 MB',
      whatsIncluded: ['High-res wallpaper variant', 'Setup guide'],
      images: ['/src/assets/images/hero_mushroom_cottage_1794020164209.jpg'],
      featured: false,
      isNew: true,
      popularity: 90,
      status: 'published',
      createdAt: new Date().toISOString(),
      downloadFileName: 'sleepyshroom_wallpaper.zip',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProductModal = async () => {
    if (!editingProduct || !editingProduct.title) {
      setErrorMessage('Please provide a product title');
      return;
    }

    try {
      const token = await getFreshAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const isExisting = allProducts.some(p => p.id === editingProduct.id);
      const url = isExisting ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(editingProduct),
      });

      if (res.ok) {
        setIsProductModalOpen(false);
        triggerSaveNotification(`Product "${editingProduct.title}" saved successfully!`);
        void loadAdminData(token);
        refreshData();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.error || 'Error saving product');
      }
    } catch {
      setErrorMessage('Error saving product');
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const token = await getFreshAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        triggerSaveNotification(`Deleted product "${title}"`);
        void loadAdminData(token);
        refreshData();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.error || 'Error deleting product');
      }
    } catch {
      setErrorMessage('Error deleting product');
    }
  };

  // 3. HOMEPAGE & WEBSITE SETTINGS
  const handleSaveSettings = async () => {
    if (!settings) return;
    setErrorMessage(null);
    setSettingsTableMissing(false);

    const normalizedSocial = normalizeSocialMediaSettings(settings.socialMedia);
    for (const meta of SOCIAL_PLATFORMS_META) {
      const entry = normalizedSocial[meta.key];
      if (entry.url && !isValidSocialHttpUrl(entry.url)) {
        setErrorMessage(
          `Please enter a valid http:// or https:// profile URL for ${meta.label} (for example, ${meta.placeholder}).`
        );
        return;
      }
    }

    setSavingSettings(true);
    try {
      const token = await getFreshAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload: WebsiteSettings = {
        ...settings,
        socialMedia: normalizedSocial,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        settings?: WebsiteSettings;
        needsTableSetup?: boolean;
        error?: string;
      }>(res);
      if (parsed.ok && parsed.data?.settings) {
        const normalizedSaved = normalizeAdminSettings(parsed.data.settings);
        setSettings(normalizedSaved);
        applyUpdatedSettings(normalizedSaved);
        triggerSaveNotification('Website settings saved cleanly!');
        await refreshData();
        const cfgRes = await fetch(`/api/checkout?t=${Date.now()}`, { cache: 'no-store' });
        const cfgParsed = await parseJsonResponse<typeof gatewayStatus>(cfgRes);
        if (cfgParsed.ok && cfgParsed.isJson && cfgParsed.data) {
          setGatewayStatus(cfgParsed.data);
        }
      } else {
        if (parsed.data?.needsTableSetup) {
          setSettingsTableMissing(true);
        }
        setErrorMessage(parsed.data?.error || 'Could not save website settings. Please verify your admin session and Supabase setup.');
      }
    } catch {
      setErrorMessage('Network error while saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVerifyOrderWithPaypal = async (order: Order) => {
    const key = order.id || order.downloadToken || order.orderNumber;
    if (!key) return;
    setVerifyingOrderId(key);
    setErrorMessage(null);
    try {
      const token = await getFreshAdminToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/orders/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'verify' }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        verifiedPaid?: boolean;
        order?: Order;
        error?: string;
      }>(res);

      if (!parsed.ok || !parsed.isJson || !parsed.data?.order) {
        setErrorMessage(parsed.data?.error || 'Could not reconcile order with PayPal.');
        return;
      }

      const updated = parsed.data.order;
      setOrders(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      triggerSaveNotification(
        `Order ${updated.orderNumber} checked: status is now ${String(updated.paymentStatus).toUpperCase()}.`
      );
      void loadAdminData(token);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error verifying order status with PayPal.');
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const handleRefundOrderWithPaypal = async (order: Order, reasonText: string) => {
    const key = order.id || order.downloadToken || order.orderNumber;
    if (!key) return;
    setRefundingOrderId(key);
    setErrorMessage(null);
    try {
      const token = await getFreshAdminToken();
      if (!token) {
        setErrorMessage('Administrator session expired. Please sign in again.');
        return;
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'refund',
          reason: reasonText.trim() || 'Refunded by administrator via Sleepyshroom',
        }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        refundId?: string;
        order?: Order;
        error?: string;
      }>(res);

      if (!parsed.ok || !parsed.isJson || !parsed.data?.success || !parsed.data?.order) {
        setErrorMessage(parsed.data?.error || 'Could not process PayPal refund.');
        return;
      }

      const updated = parsed.data.order;
      setOrders(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      setRefundConfirmOrderKey(null);
      setRefundReasonInput('');
      triggerSaveNotification(
        `Order ${updated.orderNumber} refunded via PayPal${parsed.data.refundId ? ` (${parsed.data.refundId})` : ''}.`
      );
      void loadAdminData(token);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error issuing PayPal refund.');
    } finally {
      setRefundingOrderId(null);
    }
  };

  const handleConfirmManualPayment = async (order: Order) => {
    const key = order.id || order.downloadToken || order.orderNumber;
    if (!key) return;
    setConfirmingManualOrderId(key);
    setErrorMessage(null);
    try {
      const token = await getFreshAdminToken();
      if (!token) {
        setErrorMessage('Administrator session expired. Please sign in again.');
        return;
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'confirm_manual_payment' }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        verifiedPaid?: boolean;
        order?: Order;
        error?: string;
      }>(res);

      if (!parsed.ok || !parsed.isJson || !parsed.data?.success || !parsed.data?.order) {
        setErrorMessage(parsed.data?.error || 'Could not confirm manual QR payment.');
        return;
      }

      const updated = parsed.data.order;
      setOrders(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      triggerSaveNotification(
        `Order ${updated.orderNumber} confirmed! Digital downloads are now unlocked for ${updated.customerEmail}.`
      );
      void loadAdminData(token);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error confirming QR payment.');
    } finally {
      setConfirmingManualOrderId(null);
    }
  };

  const handleRejectManualPayment = async (order: Order, reasonText: string) => {
    const key = order.id || order.downloadToken || order.orderNumber;
    if (!key) return;
    setConfirmingManualOrderId(key);
    setErrorMessage(null);
    try {
      const token = await getFreshAdminToken();
      if (!token) {
        setErrorMessage('Administrator session expired. Please sign in again.');
        return;
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'reject_manual_payment',
          reason:
            reasonText.trim() ||
            'Payment reference could not be verified. Please contact support or retry checkout.',
        }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        order?: Order;
        error?: string;
      }>(res);

      if (!parsed.ok || !parsed.isJson || !parsed.data?.success || !parsed.data?.order) {
        setErrorMessage(parsed.data?.error || 'Could not reject manual QR payment.');
        return;
      }

      const updated = parsed.data.order;
      setOrders(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      setRejectManualOrderKey(null);
      setRejectManualReasonInput('');
      triggerSaveNotification(`Order ${updated.orderNumber} marked as rejected.`);
      void loadAdminData(token);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error rejecting QR payment.');
    } finally {
      setConfirmingManualOrderId(null);
    }
  };

  const handleUploadQrCodeImage = (
    provider: 'gcash' | 'maya',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) return;
      const img = new Image();
      img.onload = () => {
        const maxDim = 520;
        const scale = Math.min(1, maxDim / Math.max(img.width || maxDim, img.height || maxDim));
        const width = Math.max(1, Math.round((img.width || maxDim) * scale));
        const height = Math.max(1, Math.round((img.height || maxDim) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/png');
        if (compressed.length > 400000) {
          compressed = canvas.toDataURL('image/webp', 0.85);
        }
        setSettings(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            paymentProviders: {
              ...prev.paymentProviders,
              ...(provider === 'gcash'
                ? { gcashQrImage: compressed }
                : { mayaQrImage: compressed }),
            },
          };
        });
        triggerSaveNotification(
          `${provider === 'gcash' ? 'GCash' : 'Maya'} QR image ready! Click Save Changes to publish.`
        );
      };
      img.onerror = () => {
        setErrorMessage('Could not read image file. Please select a valid PNG, JPG, or WebP QR code.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Image upload helper for hero banner (retained for compatibility)
  const handleUploadImageForHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;

    setErrorMessage(null);
    try {
      const token = await getFreshAdminToken();
      const uploaded = await uploadStoreAsset(file, {
        token,
        folder: 'hero',
        optimizeImage: true,
      });
      setSettings({ ...settings, heroImage: uploaded.url });
      triggerSaveNotification('Hero image uploaded! Click Save Homepage Changes to apply.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload hero image.');
    }
  };

  if (verifyingAdmin) {
    return (
      <div className="py-20 bg-[#FFFCF7] min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-7 h-7 text-[#A64B3C] animate-spin" />
        <p className="text-xs font-bold text-[#777777]">Verifying administrator access...</p>
      </div>
    );
  }

  if (!isAuthorizedAdminUser || !adminToken) {
    return (
      <div className="py-16 bg-[#FFFCF7] min-h-[70vh] px-4">
        <div className="max-w-md mx-auto bg-[#FCF3E2] rounded-3xl p-8 border border-[#EADCC8] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#A64B3C]/10 text-[#A64B3C] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-heading font-bold text-xl text-[#292929]">
            Administrator Access Required
          </h1>
          <p className="text-xs text-[#777777] font-medium leading-relaxed">
            {user
              ? `Signed in as ${user.email}, which does not have administrator privileges.`
              : 'Please sign in with an authorized administrator account to view store management and customer inquiries.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigateTo('account')}
              className="px-5 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              {user ? 'Switch Account' : 'Admin Sign In'}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="px-5 py-2.5 bg-[#FFFCF7] hover:bg-[#EADCC8]/40 text-[#292929] border border-[#EADCC8] text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Back to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const newMessagesCount = messages.filter(m => m.status === 'new').length;

  return (
    <div className="py-8 sm:py-12 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header */}
        <div className="bg-[#FCF3E2] rounded-3xl p-6 border border-[#EADCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#A64B3C] text-[#FFFCF7] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-xl sm:text-2xl text-[#292929]">
                  sleepyshroom Admin
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-xs text-[#777777] font-medium mt-0.5">
                Simple visual website management for graphic designers. No code editing needed.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#A64B3C] text-[#FFFCF7] border-[#A64B3C]'
                  : 'bg-[#FFFCF7] text-[#292929] border-[#EADCC8] hover:bg-[#FCF3E2]'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 ${activeTab === 'settings' ? 'text-[#FFFCF7]' : 'text-[#A64B3C]'}`} />
              <span>Settings</span>
            </button>
            <button
              onClick={() => navigateTo('home')}
              className="px-4 py-2 bg-[#FFFCF7] text-xs font-bold text-[#292929] rounded-xl border border-[#EADCC8] hover:bg-[#FCF3E2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#A64B3C]" />
              <span>View Storefront</span>
            </button>
          </div>
        </div>

        {/* Global Save feedback alerts */}
        {saveStatus && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-950 shadow-xs">
            <Check className="w-4 h-4 text-emerald-800" />
            <span>{saveStatus}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Navigation Tabs (wrapped so Website Settings & all tabs remain visible without horizontal scroll) */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-[#EADCC8]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('carousel')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'carousel'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Carousel Management</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({allProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'collections'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Collections &amp; Bundles</span>
          </button>

          <button
            onClick={() => setActiveTab('homepage')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'homepage'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Homepage</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages ({messages.length})</span>
            {newMessagesCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${
                  activeTab === 'messages'
                    ? 'bg-[#FFFCF7] text-[#A64B3C]'
                    : 'bg-[#A64B3C] text-[#FFFCF7]'
                }`}
              >
                {newMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('newsletter')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'newsletter'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Newsletter &amp; Emails</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews_faqs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'reviews_faqs'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Reviews &amp; FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#A64B3C] text-[#FFFCF7] shadow-xs'
                : 'text-[#292929] hover:bg-[#FCF3E2]'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Website Settings</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] shadow-xs">
                <span className="text-xs text-[#1E1419] font-bold">Total Revenue (USD)</span>
                {/* Distinctive Revenue Value */}
                <p className="font-heading font-extrabold text-2xl sm:text-3xl text-[#945367] mt-1 tabular-nums">
                  {formatUsd(stats ? Number(stats.totalRevenue || 0) : 0, false)}
                </p>
                <span className="text-[11px] text-emerald-900 font-bold mt-1 block">Verified PayPal Sales</span>
              </div>

              <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] shadow-xs">
                <span className="text-xs text-[#1E1419] font-bold">Total Orders</span>
                <p className="font-heading font-bold text-2xl text-[#1E1419] mt-1 tabular-nums">
                  {stats ? stats.totalOrders : 0}
                </p>
                <span className="text-[11px] text-[#45313D] font-semibold mt-1 block">
                  {stats?.paidOrdersCount ?? 0} verified paid
                </span>
              </div>

              <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] shadow-xs">
                <span className="text-xs text-[#1E1419] font-bold">Products</span>
                <p className="font-heading font-bold text-2xl text-[#1E1419] mt-1 tabular-nums">
                  {stats ? stats.publishedProducts : 0} <span className="text-xs font-medium text-[#45313D]">({stats?.draftProducts || 0} drafts)</span>
                </p>
                <span className="text-[11px] text-[#45313D] font-semibold mt-1 block">Active Catalog</span>
              </div>

              <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] shadow-xs">
                <span className="text-xs text-[#1E1419] font-bold">Total Customers</span>
                <p className="font-heading font-bold text-2xl text-[#1E1419] mt-1 tabular-nums">
                  {stats ? stats.totalCustomers : 0}
                </p>
                <span className="text-[11px] text-[#45313D] font-semibold mt-1 block">Registered &amp; Guests</span>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="bg-[#F9F6F0] p-6 rounded-3xl border border-[#E8C9C1] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-[#1E1419]">
                  Recent Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#1E1419] hover:underline cursor-pointer"
                >
                  View all ({orders.length})
                </button>
              </div>

              {orders.length > 0 ? (
                <div className="divide-y divide-[#E8C9C1]/70">
                  {orders.slice(0, 5).map(o => {
                    const st = String(o.paymentStatus || 'pending').toLowerCase();
                    const isPaid = st === 'paid' || st === 'completed';
                    return (
                      <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#1E1419]">{o.orderNumber}</span>
                          <span className="text-[#33222C] font-medium ml-2">{o.customerEmail}</span>
                          <p className="text-[11px] text-[#33222C] font-medium">
                            {o.items.length} wallpaper{o.items.length > 1 ? 's' : ''} · {o.paymentMethod}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#945367] tabular-nums text-sm">
                            {formatOrderMoney(o.total, o.currency)}
                          </span>
                          <span
                            className={`block text-[10px] font-bold uppercase ${
                              isPaid
                                ? 'text-emerald-900'
                                : st === 'pending'
                                ? 'text-amber-800'
                                : st === 'refunded'
                                ? 'text-stone-600'
                                : 'text-red-700'
                            }`}
                          >
                            {isPaid ? 'Paid' : st}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#33222C] font-medium">No orders placed yet.</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('carousel')}
                className="p-5 bg-white rounded-2xl border border-[#D5C2BB] text-left hover:border-[#8B6F7A] transition-colors cursor-pointer"
              >
                <Sliders className="w-5 h-5 text-[#8B6F7A] mb-2" />
                <h4 className="font-bold text-sm text-[#1E1419]">Manage Carousel Slides</h4>
                <p className="text-xs text-[#33222C] font-medium mt-1">Upload and rearrange theme carousel slides.</p>
              </button>

              <button
                onClick={handleOpenAddProduct}
                className="p-5 bg-white rounded-2xl border border-[#D5C2BB] text-left hover:border-[#8B6F7A] transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5 text-[#8B6F7A] mb-2" />
                <h4 className="font-bold text-sm text-[#1E1419]">Add New Product</h4>
                <p className="text-xs text-[#33222C] font-medium mt-1">Publish a new desktop or mobile wallpaper.</p>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="p-5 bg-white rounded-2xl border border-[#D5C2BB] text-left hover:border-[#8B6F7A] transition-colors cursor-pointer"
              >
                <SettingsIcon className="w-5 h-5 text-[#8B6F7A] mb-2" />
                <h4 className="font-bold text-sm text-[#1E1419]">Store &amp; Payment Settings</h4>
                <p className="text-xs text-[#33222C] font-medium mt-1">PayPal, Google Pay, GCash &amp; Maya QR, social links, and policies.</p>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: CAROUSEL MANAGEMENT (VERY IMPORTANT REQUIREMENT) */}
        {activeTab === 'carousel' && (
          <div className="space-y-6">
            
            {/* Top Toolbar */}
            <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                  Visual Carousel Editor
                </h2>
                <p className="text-xs text-[#33222C]">
                  Edit, reorder, upload images, and control visibility for the "Explore the Themes" section.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddNewSlide}
                  className="px-4 py-2 bg-white hover:bg-[#F4EAE6] text-[#8B6F7A] border border-[#E8C9C1] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Slide</span>
                </button>

                <button
                  onClick={() => handleSaveCarousel(false)}
                  className="px-4 py-2 bg-[#E8C9C1] hover:bg-[#D8B9B1] text-[#1E1419] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>

                <button
                  onClick={() => handleSaveCarousel(true)}
                  className="px-5 py-2 bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish Changes</span>
                </button>
              </div>
            </div>

            {/* Slides Cards List */}
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`bg-[#F9F6F0] rounded-3xl p-5 border transition-all ${
                    slide.visible ? 'border-[#E8C9C1]' : 'border-dashed border-[#8B6F7A]/40 opacity-70'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    
                    {/* Reorder and Sequence */}
                    <div className="md:col-span-1 flex md:flex-col items-center justify-center gap-2 text-xs font-bold text-[#8B6F7A]">
                      <button
                        onClick={() => handleMoveSlide(index, 'up')}
                        disabled={index === 0}
                        aria-label="Move slide up"
                        className="p-1 hover:bg-[#E8C9C1]/50 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <span className="w-6 h-6 rounded-full bg-[#E8C9C1]/50 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => handleMoveSlide(index, 'down')}
                        disabled={index === slides.length - 1}
                        aria-label="Move slide down"
                        className="p-1 hover:bg-[#E8C9C1]/50 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Image Preview & Upload / Replace Button */}
                    <div className="md:col-span-3 space-y-2">
                      <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-[#E8C9C1]/30 border border-[#E8C9C1] flex items-center justify-center">
                        {slide.imageUrl && !brokenSlideIds[slide.id] ? (
                          <img
                            src={slide.imageUrl}
                            alt={slide.themeTitle}
                            onError={() =>
                              setBrokenSlideIds(prev => ({ ...prev, [slide.id]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : brokenSlideIds[slide.id] ? (
                          <div className="text-center p-3 space-y-1">
                            <AlertCircle className="w-5 h-5 text-amber-700 mx-auto" />
                            <p className="text-[10px] font-bold text-amber-900">
                              Image failed to load — upload a file below
                            </p>
                          </div>
                        ) : (
                          /* Image Placeholder if empty */
                          <div className="text-center p-3">
                            <ImagePlus className="w-6 h-6 text-[#8B6F7A] mx-auto mb-1 opacity-70" />
                            <p className="text-[10px] font-bold text-[#8B6F7A]">
                              Upload your theme image here
                            </p>
                          </div>
                        )}

                        {uploadingSlideId === slide.id && (
                          <div className="absolute inset-0 bg-[#FFFCF7]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-[#A64B3C]">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[10px] font-bold">Uploading...</span>
                          </div>
                        )}
                      </div>

                      {/* File upload trigger */}
                      <label className="cursor-pointer block">
                        <span className="w-full py-1.5 px-3 bg-white hover:bg-[#F4EAE6] text-[#A64B3C] border border-[#E8C9C1] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                          {uploadingSlideId === slide.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {uploadingSlideId === slide.id
                              ? 'Uploading...'
                              : slide.imageUrl
                                ? 'Replace Picture'
                                : 'Upload Picture'}
                          </span>
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingSlideId === slide.id}
                          onChange={e => void handleUploadImageForSlide(slide.id, e)}
                          className="hidden"
                        />
                      </label>

                      <input
                        type="text"
                        value={slide.imageUrl}
                        onChange={e => {
                          setBrokenSlideIds(prev => {
                            const next = { ...prev };
                            delete next[slide.id];
                            return next;
                          });
                          handleSlideChange(slide.id, 'imageUrl', e.target.value);
                        }}
                        placeholder="/uploads/... or URL"
                        className="w-full px-2.5 py-1 text-[10px] bg-white border border-[#E8C9C1] rounded-lg text-[#45313D] font-mono"
                      />
                    </div>

                    {/* Text Inputs */}
                    <div className="md:col-span-6 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#1E1419] mb-0.5">
                          Theme Title
                        </label>
                        <input
                          type="text"
                          value={slide.themeTitle}
                          onChange={e => handleSlideChange(slide.id, 'themeTitle', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#1E1419] mb-0.5">
                          Short Description
                        </label>
                        <textarea
                          rows={2}
                          value={slide.description}
                          onChange={e => handleSlideChange(slide.id, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#1E1419] mb-0.5">
                            Button Label
                          </label>
                          <input
                            type="text"
                            value={slide.exploreButtonText}
                            onChange={e => handleSlideChange(slide.id, 'exploreButtonText', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#1E1419] mb-0.5">
                            Link Destination
                          </label>
                          <input
                            type="text"
                            value={slide.linkDestination}
                            onChange={e => handleSlideChange(slide.id, 'linkDestination', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Visibility & Delete Controls */}
                    <div className="md:col-span-2 flex md:flex-col items-center justify-end gap-2">
                      <button
                        onClick={() => handleSlideChange(slide.id, 'visible', !slide.visible)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          slide.visible
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {slide.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{slide.visible ? 'Visible' : 'Hidden'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="p-2 text-[#8B6F7A]/60 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 3: PRODUCT MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                  Product Catalog
                </h2>
                <p className="text-xs text-[#33222C]">
                  Manage all downloadable digital wallpapers, pricing, device tags, and files.
                </p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="px-5 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs font-bold hover:bg-[#785E69] flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Wallpaper</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] overflow-hidden shadow-xs">
              <div className="divide-y divide-[#E8C9C1]/50">
                {allProducts.map(prod => (
                  <div key={prod.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={prod.images[0]}
                        alt={prod.title}
                        className="w-16 h-12 object-cover rounded-xl shrink-0 border border-[#D5C2BB]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-[#1E1419]">
                            {prod.title}
                          </h4>
                          {Boolean(prod.isFree || prod.price === 0) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFD58A] text-[#1E1419] border border-[#E6A020]/40">
                              Freebie Gift 🎁
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            prod.status === 'published' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-stone-200 text-stone-800'
                          }`}>
                            {prod.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#33222C] font-medium mt-0.5">
                          <span>{prod.theme}</span>
                          <span>·</span>
                          <span className="capitalize">{prod.deviceTypes.join(', ')}</span>
                          <span>·</span>
                          <span className="text-emerald-800 font-bold">{(prod.downloadCount || 0).toLocaleString()} downloads</span>
                          <span>·</span>
                          {/* Distinctive Product Price */}
                          <span className="font-extrabold text-[#945367] tabular-nums">
                            {Boolean(prod.isFree || prod.price === 0) ? 'FREE' : `$${prod.price.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setEditingProduct({ ...prod });
                          setIsProductModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white border border-[#D5C2BB] text-xs font-bold text-[#1E1419] rounded-xl hover:bg-[#F4EAE6] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#8B6F7A]" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.title)}
                        className="p-1.5 text-[#8B6F7A] hover:text-red-700 rounded-xl hover:bg-red-50 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HOMEPAGE MANAGEMENT */}
        {activeTab === 'homepage' && settings && (
          <div className="bg-[#F9F6F0] p-6 sm:p-8 rounded-3xl border border-[#E8C9C1] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8C9C1]/50 pb-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                  Homepage Content & Layout
                </h2>
                <p className="text-xs text-[#33222C]">
                  Edit hero banners, text, button labels, and section toggles without coding.
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] text-xs font-bold rounded-xl hover:bg-[#785E69] flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Homepage Changes</span>
              </button>
            </div>

            {/* Hero Banner Controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                Hero Section
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5">
                  <ImageUploadField
                    label="Hero Banner Picture"
                    value={settings.heroImage}
                    onChange={url => setSettings({ ...settings, heroImage: url })}
                    getToken={getFreshAdminToken}
                    folder="hero"
                  />
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1E1419] mb-1">
                      Hero Tagline / Headline
                    </label>
                    <input
                      type="text"
                      value={settings.heroHeadline}
                      onChange={e => setSettings({ ...settings, heroHeadline: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E1419] mb-1">
                      Supporting Text
                    </label>
                    <textarea
                      rows={3}
                      value={settings.heroSupportingText}
                      onChange={e => setSettings({ ...settings, heroSupportingText: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1E1419] mb-1">
                        Primary Button Label
                      </label>
                      <input
                        type="text"
                        value={settings.heroPrimaryBtnText}
                        onChange={e => setSettings({ ...settings, heroPrimaryBtnText: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1E1419] mb-1">
                        Secondary Button Label
                      </label>
                      <input
                        type="text"
                        value={settings.heroSecondaryBtnText}
                        onChange={e => setSettings({ ...settings, heroSecondaryBtnText: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Intro Content */}
            <div className="border-t border-[#E8C9C1]/50 pt-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                Brand Introduction Section
              </h3>
              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1">
                  Intro Heading
                </label>
                <input
                  type="text"
                  value={settings.brandIntroHeading}
                  onChange={e => setSettings({ ...settings, brandIntroHeading: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1">
                  Intro Description
                </label>
                <textarea
                  rows={3}
                  value={settings.brandIntroText}
                  onChange={e => setSettings({ ...settings, brandIntroText: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                />
              </div>
            </div>

            {/* About Me Page Editor */}
            <div className="border-t border-[#E8C9C1]/50 pt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A64B3C]">
                    About Me Page (Artist Picture &amp; Intro)
                  </h3>
                  <p className="text-[11px] text-[#5C4952] font-medium mt-0.5">
                    Update your portrait photo and introduction displayed on the About Me page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingSettings ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save About &amp; Homepage</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5">
                  <ImageUploadField
                    label="About Me Portrait Picture"
                    value={settings.aboutMe?.profileImage || ''}
                    onChange={url =>
                      setSettings({
                        ...settings,
                        aboutMe: {
                          ...settings.aboutMe,
                          profileImage: url,
                        },
                      })
                    }
                    getToken={getFreshAdminToken}
                    folder="about"
                    aspectClass="aspect-square max-w-[240px]"
                  />
                </div>
                <div className="md:col-span-7 space-y-2">
                  <label className="block text-xs font-bold text-[#1E1419]">
                    About Me Introduction Text
                  </label>
                  <textarea
                    rows={8}
                    value={settings.aboutMe?.introduction || ''}
                    onChange={e =>
                      setSettings({
                        ...settings,
                        aboutMe: {
                          ...settings.aboutMe,
                          introduction: e.target.value,
                        },
                      })
                    }
                    placeholder="Hi, I'm Mei or Cheumeitzii the artist behind Sleepy Shroom!..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] leading-relaxed"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: ORDERS & DOWNLOADS */}
        {activeTab === 'orders' && (() => {
          const paidOrders = orders.filter(o => ['paid', 'completed'].includes(String(o.paymentStatus || '').toLowerCase()));
          const totalPaidUsd = paidOrders
            .filter(o => String(o.currency || 'USD').toUpperCase() !== 'PHP')
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const totalPaidPhp = paidOrders
            .filter(o => String(o.currency || 'USD').toUpperCase() === 'PHP')
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const paidOrdersCount = paidOrders.length;
          const pendingOrdersCount = orders.filter(o => String(o.paymentStatus || '').toLowerCase() === 'pending').length;
          const refundedOrdersCount = orders.filter(o => String(o.paymentStatus || '').toLowerCase() === 'refunded').length;

          const filteredOrders = orders.filter(o => {
            const st = String(o.paymentStatus || 'pending').toLowerCase();
            const isPaid = st === 'paid' || st === 'completed';
            const isRefunded = st === 'refunded';
            const isPending = st === 'pending';

            if (orderFilterStatus === 'paid' && !isPaid) return false;
            if (orderFilterStatus === 'pending' && !isPending) return false;
            if (orderFilterStatus === 'refunded' && !isRefunded) return false;

            if (orderSearchQuery.trim()) {
              const q = orderSearchQuery.toLowerCase().trim();
              const matchOrderNum = o.orderNumber?.toLowerCase().includes(q);
              const matchEmail = o.customerEmail?.toLowerCase().includes(q);
              const matchName = o.customerName?.toLowerCase().includes(q);
              const matchCapture = o.paypalCaptureId?.toLowerCase().includes(q);
              const matchPaypalOrder = o.paypalOrderId?.toLowerCase().includes(q);
              const matchRef = o.paymentReference?.toLowerCase().includes(q);
              const matchTx = o.transactionId?.toLowerCase().includes(q);
              const matchSender = o.senderName?.toLowerCase().includes(q);
              const matchProvider = o.paymentProvider?.toLowerCase().includes(q);
              const matchToken = o.downloadToken?.toLowerCase().includes(q);
              return (
                matchOrderNum ||
                matchEmail ||
                matchName ||
                matchCapture ||
                matchPaypalOrder ||
                matchRef ||
                matchTx ||
                matchSender ||
                matchProvider ||
                matchToken
              );
            }
            return true;
          });

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                      Customer Orders &amp; Payment Verification
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#003087] bg-[#003087]/10 px-2.5 py-0.5 rounded-full border border-[#003087]/20">
                      <PaypalIcon className="w-3 h-3" />
                      <span>PayPal · Google Pay · PH QR</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#33222C] mt-0.5">
                    Verified PayPal USD, Google Pay, and PH Local GCash/Maya QR orders, reference approvals, refunds, and download unlocks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void loadAdminData();
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Orders</span>
                </button>
              </div>

              {/* KPI Cards Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#F9F6F0] p-4 rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B6F7A] block">
                    Verified Revenue
                  </span>
                  <span className="text-xl font-extrabold text-[#945367] tabular-nums mt-1 block">
                    {formatUsd(totalPaidUsd)}
                  </span>
                  {totalPaidPhp > 0 && (
                    <span className="text-xs font-bold text-[#1E1419] tabular-nums block">
                      + {formatOrderMoney(totalPaidPhp, 'PHP')}
                    </span>
                  )}
                  <span className="text-[11px] text-[#45313D] font-medium mt-0.5 block">
                    From {paidOrdersCount} completed orders
                  </span>
                </div>

                <div className="bg-[#F9F6F0] p-4 rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B6F7A] block">
                    Total Orders
                  </span>
                  <span className="text-xl font-extrabold text-[#1E1419] tabular-nums mt-1 block">
                    {orders.length}
                  </span>
                  <span className="text-[11px] text-[#45313D] font-medium mt-0.5 block">
                    Stored in Supabase
                  </span>
                </div>

                <div className="bg-[#F9F6F0] p-4 rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Downloads Unlocked
                  </span>
                  <span className="text-xl font-extrabold text-emerald-800 tabular-nums mt-1 block">
                    {paidOrdersCount}
                  </span>
                  <span className="text-[11px] text-[#45313D] font-medium mt-0.5 block">
                    Verified payments
                  </span>
                </div>

                <div className="bg-[#F9F6F0] p-4 rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Pending / Refunded
                  </span>
                  <span className="text-xl font-extrabold text-[#1E1419] tabular-nums mt-1 block">
                    {pendingOrdersCount} <span className="text-xs font-normal text-[#8B6F7A]">/ {refundedOrdersCount}</span>
                  </span>
                  <span className="text-[11px] text-[#45313D] font-medium mt-0.5 block">
                    {pendingOrdersCount} awaiting verification · {refundedOrdersCount} refunded
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="bg-[#F9F6F0] p-3.5 rounded-2xl border border-[#E8C9C1] flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <button
                    type="button"
                    onClick={() => setOrderFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderFilterStatus === 'all'
                        ? 'bg-[#8B6F7A] text-[#F7F3E9] shadow-xs'
                        : 'bg-white text-[#1E1419] hover:bg-[#F4EAE6] border border-[#D5C2BB]'
                    }`}
                  >
                    All Orders ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilterStatus('paid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderFilterStatus === 'paid'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-[#1E1419] hover:bg-[#F4EAE6] border border-[#D5C2BB]'
                    }`}
                  >
                    Paid ({paidOrdersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilterStatus('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderFilterStatus === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-[#1E1419] hover:bg-[#F4EAE6] border border-[#D5C2BB]'
                    }`}
                  >
                    Pending ({pendingOrdersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilterStatus('refunded')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderFilterStatus === 'refunded'
                        ? 'bg-stone-700 text-white shadow-xs'
                        : 'bg-white text-[#1E1419] hover:bg-[#F4EAE6] border border-[#D5C2BB]'
                    }`}
                  >
                    Refunded ({refundedOrdersCount})
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-[#8B6F7A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    placeholder="Search order #, email, name, or Ref ID..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] placeholder-[#8B6F7A]/60 focus:outline-hidden focus:ring-1 focus:ring-[#8B6F7A]"
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8B6F7A] hover:text-[#1E1419]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Order List or Empty Feedback */}
              {filteredOrders.length === 0 ? (
                <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] p-8 text-center text-xs text-[#33222C] font-medium space-y-2">
                  <p>
                    {orders.length === 0
                      ? 'No orders recorded yet. New PayPal, Google Pay, GCash, and Maya checkouts will appear here automatically.'
                      : 'No orders found matching the selected filter or search query.'}
                  </p>
                  {(orderFilterStatus !== 'all' || orderSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderFilterStatus('all');
                        setOrderSearchQuery('');
                      }}
                      className="text-xs font-bold text-[#8B6F7A] underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
                  {filteredOrders.map(o => {
                  const st = String(o.paymentStatus || 'pending').toLowerCase();
                  const isPaid = st === 'paid' || st === 'completed';
                  const isRefunded = st === 'refunded';
                  const providerKey = String(o.paymentProvider || 'paypal').toLowerCase();
                  const isGcash = providerKey === 'gcash';
                  const isMaya = providerKey === 'maya';
                  const isGooglePay = providerKey === 'google_pay';
                  const isManualQr = isGcash || isMaya;
                  const badgeClass = isPaid
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : st === 'pending'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : isRefunded
                    ? 'bg-stone-200 text-stone-800 border-stone-300'
                    : 'bg-red-50 text-red-700 border-red-200';
                  const orderKey = o.id || o.downloadToken || o.orderNumber;
                  const isVerifyingThis = verifyingOrderId === orderKey;
                  const isManualConfirmingThis = confirmingManualOrderId === orderKey;
                  const isRefundingThis = refundingOrderId === orderKey;
                  const showRefundConfirm = refundConfirmOrderKey === orderKey;
                  const showRejectConfirm = rejectManualOrderKey === orderKey;
                  const payRef = o.paypalCaptureId || o.paypalOrderId || o.paymentReference || o.transactionId;
                  const txDate = o.paidAt || o.createdAt;

                  return (
                    <div key={orderKey} className="p-5 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading font-bold text-sm text-[#1E1419]">{o.orderNumber}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {isPaid ? 'Paid' : st}
                            </span>
                            <span className="text-xs text-[#33222C] font-semibold">{o.customerName}</span>
                            <span className="text-[11px] text-[#45313D] font-medium tabular-nums">
                              · {new Date(txDate).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-[#33222C] font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>Email: <strong className="text-[#1E1419] font-bold">{o.customerEmail}</strong></span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1.5 font-bold text-[#1E1419]">
                              {isGcash && <GcashIcon size={14} />}
                              {isMaya && <MayaIcon size={14} />}
                              {isGooglePay && <GooglePayIcon width={26} height={13} />}
                              {!isManualQr && !isGooglePay && <PaypalIcon className="w-3.5 h-3.5" />}
                              <span>{o.paymentMethod}</span>
                            </span>
                          </div>
                          <p className="text-xs text-[#33222C] font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>
                              {isManualQr ? 'QR Ref No.:' : 'Payment Ref:'}{' '}
                              <span className="font-mono text-[11px] bg-white text-[#1E1419] px-1.5 py-0.5 rounded border border-[#D5C2BB] font-bold">
                                {payRef || 'n/a'}
                              </span>
                            </span>
                            {o.senderName && (
                              <span>
                                · Sender:{' '}
                                <span className="font-semibold text-[#1E1419]">{o.senderName}</span>
                              </span>
                            )}
                            {o.paypalOrderId && o.paypalCaptureId && (
                              <span>
                                · Order ID:{' '}
                                <span className="font-mono text-[11px] bg-white text-[#1E1419] px-1.5 py-0.5 rounded border border-[#D5C2BB]">
                                  {o.paypalOrderId}
                                </span>
                              </span>
                            )}
                            <span>
                              · Token:{' '}
                              <span className="font-mono text-[11px] bg-white text-[#1E1419] px-1.5 py-0.5 rounded border border-[#D5C2BB]">
                                {o.downloadToken}
                              </span>
                            </span>
                          </p>
                          {o.paymentProofNote && (
                            <p className="text-[11px] text-[#45313D] italic">
                              Customer Note: &ldquo;{o.paymentProofNote}&rdquo;
                            </p>
                          )}
                          {isRefunded && (
                            <p className="text-[11px] text-stone-700 font-medium">
                              Refunded{o.refundedAt ? ` on ${new Date(o.refundedAt).toLocaleString()}` : ''}
                              {o.paypalRefundId ? ` · Refund ID: ${o.paypalRefundId}` : ''}
                              {o.refundReason ? ` · Reason: ${o.refundReason}` : ''}
                            </p>
                          )}
                          <p className="text-[11px] text-[#45313D] font-medium">
                            Items: {o.items.map(i => i.title).join(', ')}
                          </p>
                        </div>

                        <div className="flex flex-col lg:items-end gap-2 shrink-0">
                          <div className="text-left lg:text-right">
                            <span className="text-base font-extrabold text-[#945367] tabular-nums block">
                              {formatOrderMoney(o.total, o.currency)}
                            </span>
                            {o.usdTotal !== undefined && String(o.currency || '').toUpperCase() === 'PHP' && (
                              <span className="text-[10px] text-[#8B6F7A] font-semibold tabular-nums block">
                                ({formatUsd(o.usdTotal)})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {isManualQr && !isPaid && !isRefunded && (
                              <>
                                <button
                                  type="button"
                                  disabled={isManualConfirmingThis}
                                  onClick={() => handleConfirmManualPayment(o)}
                                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shadow-xs"
                                >
                                  {isManualConfirmingThis ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Confirm Payment &amp; Unlock</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isManualConfirmingThis}
                                  onClick={() => {
                                    if (showRejectConfirm) {
                                      setRejectManualOrderKey(null);
                                      setRejectManualReasonInput('');
                                    } else {
                                      setRejectManualOrderKey(orderKey);
                                      setRejectManualReasonInput('');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            {!isManualQr && !isPaid && !isRefunded && o.paypalOrderId && (
                              <button
                                type="button"
                                disabled={isVerifyingThis}
                                onClick={() => handleVerifyOrderWithPaypal(o)}
                                className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] text-[#1E1419] border border-[#D5C2BB] rounded-xl text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingThis ? 'animate-spin' : ''}`} />
                                <span>{isVerifyingThis ? 'Checking...' : 'Verify with PayPal'}</span>
                              </button>
                            )}
                            {isPaid && (o.paypalCaptureId || o.paypalOrderId) && (
                              <button
                                type="button"
                                disabled={isRefundingThis}
                                onClick={() => {
                                  if (showRefundConfirm) {
                                    setRefundConfirmOrderKey(null);
                                    setRefundReasonInput('');
                                  } else {
                                    setRefundConfirmOrderKey(orderKey);
                                    setRefundReasonInput('');
                                  }
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Refund</span>
                              </button>
                            )}
                            <button
                              onClick={() => navigateTo('confirmation', o.downloadToken)}
                              className="px-3 py-1.5 bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] rounded-xl text-[11px] font-bold cursor-pointer whitespace-nowrap"
                            >
                              View Customer Order Page
                            </button>
                          </div>
                        </div>
                      </div>

                      {showRejectConfirm && (
                        <div className="p-4 bg-white rounded-2xl border border-red-200 space-y-3 text-xs">
                          <div className="space-y-1">
                            <p className="font-bold text-red-800">
                              Reject {isGcash ? 'GCash' : 'Maya'} Reference ({payRef || 'n/a'})
                            </p>
                            <p className="text-[#45313D] font-medium">
                              Downloads remain locked for {o.customerEmail}. Enter a clear reason if the transfer amount or reference number was not found.
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Reason (e.g. Reference number not found in GCash history)"
                              value={rejectManualReasonInput}
                              onChange={e => setRejectManualReasonInput(e.target.value)}
                              className="flex-1 px-3 py-2 text-xs bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={isManualConfirmingThis}
                                onClick={() => {
                                  setRejectManualOrderKey(null);
                                  setRejectManualReasonInput('');
                                }}
                                className="px-3 py-2 bg-[#F9F6F0] hover:bg-[#E8C9C1]/40 text-[#1E1419] border border-[#D5C2BB] rounded-xl font-bold cursor-pointer whitespace-nowrap"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isManualConfirmingThis}
                                onClick={() => {
                                  void handleRejectManualPayment(o, rejectManualReasonInput);
                                }}
                                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                              >
                                {isManualConfirmingThis && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Confirm Reject</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {showRefundConfirm && (
                        <div className="p-4 bg-white rounded-2xl border border-red-200 space-y-3 text-xs">
                          <div className="space-y-1">
                            <p className="font-bold text-red-800">
                              Confirm PayPal Full Refund ({formatOrderMoney(o.total, o.currency)})
                            </p>
                            <p className="text-[#45313D] font-medium">
                              This refunds payment <code className="font-mono">{o.paypalCaptureId || o.paypalOrderId}</code> via PayPal and revokes wallpaper download access for {o.customerEmail}.
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Optional refund reason (e.g. Duplicate purchase)"
                              value={refundReasonInput}
                              onChange={e => setRefundReasonInput(e.target.value)}
                              className="flex-1 px-3 py-2 text-xs bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={isRefundingThis}
                                onClick={() => {
                                  setRefundConfirmOrderKey(null);
                                  setRefundReasonInput('');
                                }}
                                className="px-3 py-2 bg-[#F9F6F0] hover:bg-[#E8C9C1]/40 text-[#1E1419] border border-[#D5C2BB] rounded-xl font-bold cursor-pointer whitespace-nowrap"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isRefundingThis}
                                onClick={() => {
                                  void handleRefundOrderWithPaypal(o, refundReasonInput);
                                }}
                                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                              >
                                {isRefundingThis && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>{isRefundingThis ? 'Refunding...' : 'Confirm Refund'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })()}

        {/* TAB: COLLECTIONS & BUNDLES */}
        {activeTab === 'collections' && (
          <CollectionsBundlesAdminPanel
            collections={allCollections}
            allProducts={allProducts}
            getToken={getFreshAdminToken}
            onNotify={triggerSaveNotification}
            onError={msg => setErrorMessage(msg)}
            onRefresh={async () => {
              await loadAdminData();
              await refreshData();
            }}
          />
        )}

        {/* TAB 6: INCOMING MESSAGES */}
        {activeTab === 'messages' && (
          <ContactMessagesPanel
            messages={messages}
            loading={messagesLoading}
            setupError={messagesSetupError}
            emailConfigured={emailConfigured}
            emailProvider={emailProvider}
            emailUsingSandbox={emailUsingSandbox}
            onRefresh={() => fetchAdminMessages()}
            onUpdateStatus={handleUpdateMessageStatus}
            onDelete={handleDeleteMessage}
            onSendReply={handleSendReply}
          />
        )}

        {/* TAB: NEWSLETTER & EMAIL LOGS */}
        {activeTab === 'newsletter' && (
          <NewsletterEmailsAdminPanel
            orders={orders}
            getToken={getFreshAdminToken}
            onNotify={triggerSaveNotification}
            onError={msg => setErrorMessage(msg)}
          />
        )}

        {/* TAB: CUSTOMER REVIEWS & FAQs */}
        {activeTab === 'reviews_faqs' && (
          <ReviewsFaqsAdminPanel
            allProducts={allProducts}
            getToken={getFreshAdminToken}
            onNotify={triggerSaveNotification}
            onError={msg => setErrorMessage(msg)}
          />
        )}

        {/* TAB 7: WEBSITE SETTINGS */}
        {activeTab === 'settings' && !settings && (
          <div className="bg-[#F9F6F0] p-8 rounded-3xl border border-[#E8C9C1] text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#A64B3C] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#1E1419]">Loading store &amp; payment settings...</p>
            <button
              type="button"
              onClick={() => {
                const fallback = normalizeAdminSettings(storefrontSettings);
                if (fallback) setSettings(fallback);
                else void loadAdminData();
              }}
              className="px-4 py-2 bg-[#A64B3C] text-[#FFFCF7] text-xs font-bold rounded-xl cursor-pointer"
            >
              Load Settings
            </button>
          </div>
        )}
        {activeTab === 'settings' && settings && (
          <div className="bg-[#F9F6F0] p-6 sm:p-8 rounded-3xl border border-[#E8C9C1] shadow-xs space-y-8">
            <div className="flex items-center justify-between border-b border-[#E8C9C1]/50 pb-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                  Store & Integration Settings
                </h2>
                <p className="text-xs text-[#33222C]">
                  Configure store name, email recipients, payment providers, and editable policies.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60 cursor-pointer shrink-0"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{savingSettings ? 'Saving...' : 'Save Website Settings'}</span>
              </button>
            </div>

            {settingsTableMissing && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5 text-xs text-amber-950">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">Supabase Table Setup Required (`public.site_settings`)</p>
                    <p className="text-[11px] text-amber-900 mt-0.5">
                      Run this SQL once in your Supabase SQL Editor so social links, QR codes, and settings save permanently on Vercel:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sql = `create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$\n  select exists (select 1 from public.profiles p where p.id = auth.uid() and (lower(coalesce(p.role, '')) = 'admin' or lower(coalesce(p.email, '')) = 'shop.sleepyshroom@gmail.com'));\n$$;\nrevoke all on function public.is_admin() from public;\ngrant execute on function public.is_admin() to authenticated;\ncreate table if not exists public.site_settings (\n  id text primary key default 'default',\n  settings_json jsonb not null default '{}'::jsonb,\n  updated_at timestamptz not null default now()\n);\nalter table public.site_settings enable row level security;\nrevoke all on table public.site_settings from anon, authenticated;\ngrant select on table public.site_settings to anon, authenticated;\ngrant insert, update, delete on table public.site_settings to authenticated;\ndrop policy if exists "Public can read site settings" on public.site_settings;\ncreate policy "Public can read site settings" on public.site_settings for select using (true);\ndrop policy if exists "Admins can manage site settings" on public.site_settings;\ncreate policy "Admins can manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());`;
                      void navigator.clipboard.writeText(sql);
                      setCopiedSiteSettingsSql(true);
                      setTimeout(() => setCopiedSiteSettingsSql(false), 3000);
                    }}
                    className="px-3.5 py-2 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] font-bold rounded-xl text-[11px] cursor-pointer shrink-0"
                  >
                    {copiedSiteSettingsSql ? 'Copied SQL!' : 'Copy Site Settings SQL'}
                  </button>
                </div>
              </div>
            )}

            {/* General Store info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                General Store Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E1419] mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E1419] mb-1">
                    Store Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1">
                  Contact Receiving Email Address (Forward destination)
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                />
                <p className="text-[11px] text-[#8B6F7A]/80 mt-1">
                  All messages sent via the Contact page and order alerts are forwarded here.
                </p>
              </div>
            </div>

            {/* Social Media Accounts Management */}
            {(() => {
              const currentSocial = normalizeSocialMediaSettings(settings.socialMedia);
              const activeCount = SOCIAL_PLATFORMS_META.filter(meta => {
                const entry = currentSocial[meta.key];
                return entry.enabled && isValidSocialHttpUrl(entry.url);
              }).length;

              return (
                <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                        Social Media Accounts (Footer)
                      </h3>
                      <p className="text-[11px] text-[#45313D] mt-0.5">
                        Configure your official Sleepyshroom profile links. Only enabled platforms with a valid URL appear in the storefront footer.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#292929] tabular-nums">
                      {activeCount} of {SOCIAL_PLATFORMS_META.length} active in footer
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SOCIAL_PLATFORMS_META.map(meta => {
                      const entry = currentSocial[meta.key];
                      const hasValue = entry.url.trim().length > 0;
                      const urlValid = isValidSocialHttpUrl(entry.url);
                      const showUrlWarning = hasValue && !urlValid;
                      const isLiveInFooter = entry.enabled && urlValid;

                      return (
                        <div
                          key={meta.key}
                          className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#FCF3E2] border border-[#EADCC8] flex items-center justify-center text-[#A64B3C]">
                                <SocialPlatformIcon platform={meta.key} size={17} />
                              </div>
                              <div>
                                <span className="block text-xs font-bold text-[#1E1419]">
                                  {meta.label}
                                </span>
                                <span
                                  className={`block text-[11px] font-semibold ${
                                    showUrlWarning
                                      ? 'text-red-700'
                                      : isLiveInFooter
                                      ? 'text-emerald-800'
                                      : entry.enabled
                                      ? 'text-amber-800'
                                      : 'text-[#777777]'
                                  }`}
                                >
                                  {showUrlWarning
                                    ? 'Invalid URL (use https://...)'
                                    : isLiveInFooter
                                    ? 'Shown in footer'
                                    : entry.enabled
                                    ? 'Enabled · Add URL to display'
                                    : 'Hidden in footer'}
                                </span>
                              </div>
                            </div>

                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1E1419] bg-[#F9F6F0] px-3 py-1.5 rounded-xl border border-[#E8C9C1]">
                              <input
                                type="checkbox"
                                checked={entry.enabled}
                                onChange={e =>
                                  setSettings({
                                    ...settings,
                                    socialMedia: {
                                      ...currentSocial,
                                      [meta.key]: {
                                        ...entry,
                                        enabled: e.target.checked,
                                      },
                                    },
                                  })
                                }
                                className="accent-[#A64B3C] w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>Enabled</span>
                            </label>
                          </div>

                          <div className="space-y-1.5">
                            <label
                              htmlFor={`social-url-${meta.key}`}
                              className="block text-[11px] font-bold text-[#1E1419]"
                            >
                              {meta.label} Profile URL
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                id={`social-url-${meta.key}`}
                                type="url"
                                placeholder={meta.placeholder}
                                value={entry.url}
                                onChange={e =>
                                  setSettings({
                                    ...settings,
                                    socialMedia: {
                                      ...currentSocial,
                                      [meta.key]: {
                                        ...entry,
                                        url: e.target.value,
                                      },
                                    },
                                  })
                                }
                                className={`flex-1 px-3 py-2 text-xs bg-[#F9F6F0] border rounded-xl text-[#1E1419] placeholder-[#777777]/70 focus:outline-none focus:ring-2 ${
                                  showUrlWarning
                                    ? 'border-red-300 focus:ring-red-200'
                                    : 'border-[#E8C9C1] focus:ring-[#A64B3C]/30'
                                }`}
                              />
                              {urlValid && (
                                <a
                                  href={entry.url.trim()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Preview ${meta.label} link in a new tab`}
                                  className="p-2 bg-[#FCF3E2] hover:bg-[#A64B3C] text-[#292929] hover:text-[#FFFCF7] border border-[#EADCC8] rounded-xl transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* PayPal, Google Pay & PH Local QR Gateway Configuration */}
            <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                    PayPal &amp; Google Pay Checkout (USD)
                  </h3>
                  <p className="text-[11px] text-[#45313D] mt-0.5">
                    Keep PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_WEBHOOK_ID in server environment variables.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-[#E8C9C1]">
                  <input
                    type="checkbox"
                    checked={settings.paymentProviders.testMode !== false}
                    onChange={e => setSettings({
                      ...settings,
                      paymentProviders: { ...settings.paymentProviders, testMode: e.target.checked }
                    })}
                    className="accent-[#8B6F7A]"
                  />
                  <span className="text-xs text-[#1E1419] font-bold">PayPal Sandbox Mode</span>
                </label>
              </div>

              {/* Live Server Environment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase text-[#8B6F7A] block">PayPal API Credentials</span>
                  <span className={`font-bold ${gatewayStatus?.configured ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {gatewayStatus
                      ? gatewayStatus.configured
                        ? `Configured (${gatewayStatus.environment === 'live' ? 'Live' : 'Sandbox'})`
                        : 'Not Set (PAYPAL_CLIENT_ID / SECRET)'
                      : 'Checking...'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase text-[#8B6F7A] block">Webhook Signature Verification</span>
                  <span className={`font-bold ${gatewayStatus?.webhookConfigured ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {gatewayStatus
                      ? gatewayStatus.webhookConfigured
                        ? 'Configured (PAYPAL_WEBHOOK_ID)'
                        : 'Not Set (PAYPAL_WEBHOOK_ID)'
                      : 'Checking...'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-[#E8C9C1]">
                  <span className="text-[10px] font-bold uppercase text-[#8B6F7A] block">Currencies Supported</span>
                  <span className="font-bold text-[#1E1419] block mt-0.5 tabular-nums">
                    USD ($) &amp; PHP (₱) · Min $0.50 USD
                  </span>
                </div>
              </div>

              {/* PayPal & Google Pay Controls */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F9F6F0] border border-[#E8C9C1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentProviders.paypalEnabled !== false}
                      onChange={e => setSettings({
                        ...settings,
                        paymentProviders: {
                          ...settings.paymentProviders,
                          paypalEnabled: e.target.checked,
                        },
                      })}
                      className="accent-[#8B6F7A] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#1E1419] block">Enable PayPal Checkout</span>
                      <span className="text-[11px] text-[#45313D]">
                        PayPal Orders v2 &amp; Smart Buttons.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F9F6F0] border border-[#E8C9C1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentProviders.paypalAllowCards !== false}
                      onChange={e => setSettings({
                        ...settings,
                        paymentProviders: {
                          ...settings.paymentProviders,
                          paypalAllowCards: e.target.checked,
                        },
                      })}
                      className="accent-[#8B6F7A] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#1E1419] block">Allow Debit &amp; Credit Cards</span>
                      <span className="text-[11px] text-[#45313D]">
                        Visa, Mastercard &amp; Amex via PayPal.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F9F6F0] border border-[#E8C9C1] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentProviders.googlePayEnabled !== false}
                      onChange={e => setSettings({
                        ...settings,
                        paymentProviders: {
                          ...settings.paymentProviders,
                          googlePayEnabled: e.target.checked,
                        },
                      })}
                      className="accent-[#8B6F7A] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#1E1419] inline-flex items-center gap-1.5">
                        <GooglePayIcon width={28} height={14} />
                        <span>Enable Google Pay</span>
                      </span>
                      <span className="text-[11px] text-[#45313D] block">
                        1-Tap Google Pay (processed in USD via PayPal).
                      </span>
                    </div>
                  </label>
                </div>

                {/* Optional Google Pay Merchant Overrides */}
                {settings.paymentProviders.googlePayEnabled !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                        Google Pay Merchant Name
                      </label>
                      <input
                        type="text"
                        placeholder="sleepyshroom"
                        value={settings.paymentProviders.googlePayMerchantName ?? 'sleepyshroom'}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: {
                            ...settings.paymentProviders,
                            googlePayMerchantName: e.target.value,
                          },
                        })}
                        className="w-full px-3 py-2 text-xs bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                        Google Pay Merchant ID <span className="font-normal text-[#8B6F7A]">(optional in Sandbox)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="BCR2DN..."
                        value={settings.paymentProviders.googlePayMerchantId ?? ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: {
                            ...settings.paymentProviders,
                            googlePayMerchantId: e.target.value,
                          },
                        })}
                        className="w-full px-3 py-2 text-xs font-mono bg-[#F9F6F0] border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#F9F6F0] border border-[#E8C9C1] space-y-1 text-[11px] text-[#45313D]">
                  <p className="font-bold text-[#1E1419]">PayPal Webhook Endpoint</p>
                  <p className="font-mono text-[#1E1419] break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/paypal` : '/api/webhooks/paypal'}
                  </p>
                  <p>
                    Subscribe to <code className="font-mono">CHECKOUT.ORDER.APPROVED</code>,{' '}
                    <code className="font-mono">CHECKOUT.ORDER.COMPLETED</code>,{' '}
                    <code className="font-mono">PAYMENT.CAPTURE.COMPLETED</code>,{' '}
                    <code className="font-mono">PAYMENT.CAPTURE.DENIED</code>, and{' '}
                    <code className="font-mono">PAYMENT.CAPTURE.REFUNDED</code>.
                  </p>
                </div>
              </div>

              {/* PH Local QR Payments (GCash & Maya) */}
              <div className="p-5 bg-white rounded-2xl border border-[#E8C9C1] space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8C9C1]/60 pb-3">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-[#1E1419] flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#945367]" />
                      <span>PH Local QR Code Payments (GCash &amp; Maya · PHP ₱)</span>
                    </h4>
                    <p className="text-[11px] text-[#45313D] mt-0.5">
                      Upload your official GCash and Maya QR codes so Filipino buyers can scan &amp; submit their reference number. Downloads stay locked until you confirm receipt in Orders.
                    </p>
                  </div>

                  {/* USD -> PHP Exchange Rate */}
                  <div className="flex items-center gap-2 bg-[#F9F6F0] px-3 py-2 rounded-xl border border-[#E8C9C1] shrink-0">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#8B6F7A] block">
                        $1 USD Rate (PHP)
                      </label>
                      <span className="text-[10px] text-[#45313D] tabular-nums">
                        $4.50 → {formatOrderMoney(4.5 * (settings.paymentProviders.phpExchangeRate ?? 56.5), 'PHP')}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="20"
                      max="150"
                      step="0.1"
                      value={settings.paymentProviders.phpExchangeRate ?? 56.5}
                      onChange={e => setSettings({
                        ...settings,
                        paymentProviders: {
                          ...settings.paymentProviders,
                          phpExchangeRate: Number(e.target.value) || 56.5,
                        },
                      })}
                      className="w-20 px-2.5 py-1.5 text-xs font-bold tabular-nums bg-white border border-[#D5C2BB] rounded-lg text-[#1E1419]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* GCash QR Setup Card */}
                  <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E8C9C1] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GcashIcon size={20} />
                        <span className="font-heading font-bold text-sm text-[#1E1419]">GCash QR Code</span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.paymentProviders.gcashEnabled !== false}
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              gcashEnabled: e.target.checked,
                            },
                          })}
                          className="accent-[#007DFE]"
                        />
                        <span className="text-[11px] font-bold text-[#1E1419]">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                          GCash Account Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Maria C."
                          value={settings.paymentProviders.gcashAccountName ?? ''}
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              gcashAccountName: e.target.value,
                            },
                          })}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                          GCash Mobile Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 0917 123 4567"
                          value={settings.paymentProviders.gcashAccountNumber ?? ''}
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              gcashAccountNumber: e.target.value,
                            },
                          })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                        Customer Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={settings.paymentProviders.gcashInstructions ?? ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: {
                            ...settings.paymentProviders,
                            gcashInstructions: e.target.value,
                          },
                        })}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                      />
                    </div>

                    {/* GCash QR Image Upload + Preview */}
                    <div className="p-3 bg-white rounded-xl border border-[#D5C2BB] flex flex-col sm:flex-row items-center gap-3">
                      {settings.paymentProviders.gcashQrImage ? (
                        <img
                          src={settings.paymentProviders.gcashQrImage}
                          alt="GCash QR Preview"
                          className="w-20 h-20 object-contain rounded-lg border border-[#E8C9C1] shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border border-dashed border-[#D5C2BB] flex items-center justify-center text-[#8B6F7A] shrink-0">
                          <QrCode className="w-7 h-7" />
                        </div>
                      )}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 bg-[#007DFE] hover:bg-[#0066D1] text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload GCash QR Image</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={e => handleUploadQrCodeImage('gcash', e)}
                              className="hidden"
                            />
                          </label>
                          {settings.paymentProviders.gcashQrImage && (
                            <button
                              type="button"
                              onClick={() => setSettings({
                                ...settings,
                                paymentProviders: {
                                  ...settings.paymentProviders,
                                  gcashQrImage: '',
                                },
                              })}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Or paste QR image URL (https://...)"
                          value={
                            settings.paymentProviders.gcashQrImage?.startsWith('data:')
                              ? ''
                              : settings.paymentProviders.gcashQrImage ?? ''
                          }
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              gcashQrImage: e.target.value,
                            },
                          })}
                          className="w-full px-2.5 py-1.5 text-[11px] bg-[#F9F6F0] border border-[#D5C2BB] rounded-lg text-[#1E1419]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Maya QR Setup Card */}
                  <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E8C9C1] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MayaIcon size={20} />
                        <span className="font-heading font-bold text-sm text-[#1E1419]">Maya QR Code</span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.paymentProviders.mayaEnabled !== false}
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              mayaEnabled: e.target.checked,
                            },
                          })}
                          className="accent-[#0F172A]"
                        />
                        <span className="text-[11px] font-bold text-[#1E1419]">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                          Maya Account Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Maria C."
                          value={settings.paymentProviders.mayaAccountName ?? ''}
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              mayaAccountName: e.target.value,
                            },
                          })}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                          Maya Mobile / Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 0917 123 4567"
                          value={settings.paymentProviders.mayaAccountNumber ?? ''}
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              mayaAccountNumber: e.target.value,
                            },
                          })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#33222C] block mb-1">
                        Customer Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={settings.paymentProviders.mayaInstructions ?? ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: {
                            ...settings.paymentProviders,
                            mayaInstructions: e.target.value,
                          },
                        })}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419]"
                      />
                    </div>

                    {/* Maya QR Image Upload + Preview */}
                    <div className="p-3 bg-white rounded-xl border border-[#D5C2BB] flex flex-col sm:flex-row items-center gap-3">
                      {settings.paymentProviders.mayaQrImage ? (
                        <img
                          src={settings.paymentProviders.mayaQrImage}
                          alt="Maya QR Preview"
                          className="w-20 h-20 object-contain rounded-lg border border-[#E8C9C1] shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border border-dashed border-[#D5C2BB] flex items-center justify-center text-[#8B6F7A] shrink-0">
                          <QrCode className="w-7 h-7" />
                        </div>
                      )}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-[#2FF38A] rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Maya QR Image</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={e => handleUploadQrCodeImage('maya', e)}
                              className="hidden"
                            />
                          </label>
                          {settings.paymentProviders.mayaQrImage && (
                            <button
                              type="button"
                              onClick={() => setSettings({
                                ...settings,
                                paymentProviders: {
                                  ...settings.paymentProviders,
                                  mayaQrImage: '',
                                },
                              })}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Or paste QR image URL (https://...)"
                          value={
                            settings.paymentProviders.mayaQrImage?.startsWith('data:')
                              ? ''
                              : settings.paymentProviders.mayaQrImage ?? ''
                          }
                          onChange={e => setSettings({
                            ...settings,
                            paymentProviders: {
                              ...settings.paymentProviders,
                              mayaQrImage: e.target.value,
                            },
                          })}
                          className="w-full px-2.5 py-1.5 text-[11px] bg-[#F9F6F0] border border-[#D5C2BB] rounded-lg text-[#1E1419]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Artwork & Product Preview Protection */}
            <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Artwork &amp; Product Preview Protection</span>
                  </h3>
                  <p className="text-[11px] text-[#45313D] mt-0.5">
                    Protect original art on public storefront pages. Purchased downloads are always delivered 100% unwatermarked and lossless.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-bold text-[#1E1419]">Enable Watermark Overlay</span>
                    <input
                      type="checkbox"
                      checked={settings.artworkProtection?.watermarkEnabled !== false}
                      onChange={e => setSettings({
                        ...settings,
                        artworkProtection: {
                          watermarkEnabled: e.target.checked,
                          watermarkOpacity: settings.artworkProtection?.watermarkOpacity ?? 0.22,
                          watermarkStyle: settings.artworkProtection?.watermarkStyle ?? 'diagonal',
                          disableContextMenu: settings.artworkProtection?.disableContextMenu !== false,
                          disableDrag: settings.artworkProtection?.disableDrag !== false,
                        }
                      })}
                      className="accent-[#8B6F7A] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <p className="text-[11px] text-[#777777]">
                    Renders an integrated watermark pattern across all catalog and mockup preview images.
                  </p>

                  <div className="pt-2 border-t border-[#E8C9C1]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1E1419]">Watermark Opacity</span>
                      <span className="font-mono text-[#8B6F7A]">
                        {Math.round((settings.artworkProtection?.watermarkOpacity ?? 0.22) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.45"
                      step="0.05"
                      value={settings.artworkProtection?.watermarkOpacity ?? 0.22}
                      onChange={e => setSettings({
                        ...settings,
                        artworkProtection: {
                          watermarkEnabled: settings.artworkProtection?.watermarkEnabled !== false,
                          watermarkOpacity: parseFloat(e.target.value),
                          watermarkStyle: settings.artworkProtection?.watermarkStyle ?? 'diagonal',
                          disableContextMenu: settings.artworkProtection?.disableContextMenu !== false,
                          disableDrag: settings.artworkProtection?.disableDrag !== false,
                        }
                      })}
                      className="w-full accent-[#8B6F7A]"
                    />
                    <div className="flex justify-between text-[10px] text-[#777777]">
                      <span>Subtle (10%)</span>
                      <span>Balanced (22%)</span>
                      <span>Prominent (45%)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1E1419] mb-1">
                      Watermark Pattern Style
                    </label>
                    <select
                      value={settings.artworkProtection?.watermarkStyle ?? 'diagonal'}
                      onChange={e => setSettings({
                        ...settings,
                        artworkProtection: {
                          watermarkEnabled: settings.artworkProtection?.watermarkEnabled !== false,
                          watermarkOpacity: settings.artworkProtection?.watermarkOpacity ?? 0.22,
                          watermarkStyle: e.target.value as 'diagonal' | 'center' | 'corner',
                          disableContextMenu: settings.artworkProtection?.disableContextMenu !== false,
                          disableDrag: settings.artworkProtection?.disableDrag !== false,
                        }
                      })}
                      className="w-full px-3 py-2 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                    >
                      <option value="diagonal">Repeating Diagonal Grid (Recommended)</option>
                      <option value="center">Centered Studio Emblem</option>
                      <option value="corner">Subtle Corner Badge</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-[#E8C9C1]/40">
                    <span className="text-xs font-bold text-[#1E1419]">Deterrence Layer (Anti-Save)</span>
                    <input
                      type="checkbox"
                      checked={settings.artworkProtection?.disableContextMenu !== false}
                      onChange={e => setSettings({
                        ...settings,
                        artworkProtection: {
                          watermarkEnabled: settings.artworkProtection?.watermarkEnabled !== false,
                          watermarkOpacity: settings.artworkProtection?.watermarkOpacity ?? 0.22,
                          watermarkStyle: settings.artworkProtection?.watermarkStyle ?? 'diagonal',
                          disableContextMenu: e.target.checked,
                          disableDrag: e.target.checked,
                        }
                      })}
                      className="accent-[#8B6F7A] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <p className="text-[11px] text-[#777777]">
                    Disables browser right-click context menu and drag-to-desktop on previews, showing a polite notification.
                  </p>
                </div>
              </div>
            </div>

            {/* Editable Return & Refund Policy */}
            <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                Digital Goods Return Policy Content
              </h3>
              <div>
                <label className="block text-xs font-bold text-[#1E1419] mb-1">
                  Policy Body (Markdown Supported)
                </label>
                <textarea
                  rows={8}
                  value={settings.returnPolicy.content}
                  onChange={e => setSettings({
                    ...settings,
                    returnPolicy: { ...settings.returnPolicy, content: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* SEO & Metadata Settings */}
            <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#A64B3C]" />
                <span>SEO &amp; Storefront Metadata</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Canonical Store URL</label>
                  <input
                    type="text"
                    value={settings.seo?.siteUrl || 'https://sleepyshroom.vercel.app'}
                    onChange={e => setSettings({
                      ...settings,
                      seo: { ...settings.seo, siteUrl: e.target.value }
                    })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Default Meta Title</label>
                  <input
                    type="text"
                    value={settings.seo?.defaultTitle || ''}
                    onChange={e => setSettings({
                      ...settings,
                      seo: { ...settings.seo, defaultTitle: e.target.value }
                    })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1E1419] mb-1">Default Meta Description</label>
                  <textarea
                    rows={2}
                    value={settings.seo?.defaultDescription || ''}
                    onChange={e => setSettings({
                      ...settings,
                      seo: { ...settings.seo, defaultDescription: e.target.value }
                    })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Editable Privacy Policy & Terms of Service */}
            <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#A64B3C]" />
                <span>Privacy Policy &amp; Terms of Service Editors</span>
              </h3>

              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E8C9C1] text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Privacy Policy Title</label>
                    <input
                      type="text"
                      value={settings.privacyPolicy?.title || 'Privacy Policy'}
                      onChange={e => setSettings({
                        ...settings,
                        privacyPolicy: {
                          title: e.target.value,
                          lastUpdated: settings.privacyPolicy?.lastUpdated || new Date().toISOString().split('T')[0],
                          content: settings.privacyPolicy?.content || '',
                          ownerReviewRequiredNotice: settings.privacyPolicy?.ownerReviewRequiredNotice,
                        }
                      })}
                      className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Privacy Last Updated</label>
                    <input
                      type="text"
                      value={settings.privacyPolicy?.lastUpdated || ''}
                      onChange={e => setSettings({
                        ...settings,
                        privacyPolicy: {
                          title: settings.privacyPolicy?.title || 'Privacy Policy',
                          lastUpdated: e.target.value,
                          content: settings.privacyPolicy?.content || '',
                          ownerReviewRequiredNotice: settings.privacyPolicy?.ownerReviewRequiredNotice,
                        }
                      })}
                      className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Privacy Policy Body</label>
                  <textarea
                    rows={8}
                    value={settings.privacyPolicy?.content || ''}
                    onChange={e => setSettings({
                      ...settings,
                      privacyPolicy: {
                        title: settings.privacyPolicy?.title || 'Privacy Policy',
                        lastUpdated: settings.privacyPolicy?.lastUpdated || new Date().toISOString().split('T')[0],
                        content: e.target.value,
                        ownerReviewRequiredNotice: settings.privacyPolicy?.ownerReviewRequiredNotice,
                      }
                    })}
                    className="w-full px-3.5 py-2 bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl font-mono leading-relaxed"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E8C9C1] text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Terms of Service Title</label>
                    <input
                      type="text"
                      value={settings.termsOfService?.title || 'Terms of Service'}
                      onChange={e => setSettings({
                        ...settings,
                        termsOfService: {
                          title: e.target.value,
                          lastUpdated: settings.termsOfService?.lastUpdated || new Date().toISOString().split('T')[0],
                          content: settings.termsOfService?.content || '',
                          ownerReviewRequiredNotice: settings.termsOfService?.ownerReviewRequiredNotice,
                        }
                      })}
                      className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Terms Last Updated</label>
                    <input
                      type="text"
                      value={settings.termsOfService?.lastUpdated || ''}
                      onChange={e => setSettings({
                        ...settings,
                        termsOfService: {
                          title: settings.termsOfService?.title || 'Terms of Service',
                          lastUpdated: e.target.value,
                          content: settings.termsOfService?.content || '',
                          ownerReviewRequiredNotice: settings.termsOfService?.ownerReviewRequiredNotice,
                        }
                      })}
                      className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Terms of Service Body</label>
                  <textarea
                    rows={8}
                    value={settings.termsOfService?.content || ''}
                    onChange={e => setSettings({
                      ...settings,
                      termsOfService: {
                        title: settings.termsOfService?.title || 'Terms of Service',
                        lastUpdated: settings.termsOfService?.lastUpdated || new Date().toISOString().split('T')[0],
                        content: e.target.value,
                        ownerReviewRequiredNotice: settings.termsOfService?.ownerReviewRequiredNotice,
                      }
                    })}
                    className="w-full px-3.5 py-2 bg-[#F9F6F0] border border-[#E8C9C1] rounded-xl font-mono leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Bottom Save Bar */}
            <div className="sticky bottom-4 z-20 bg-[#FCF3E2]/95 backdrop-blur-sm border border-[#EADCC8] rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                {errorMessage ? (
                  <p className="font-bold text-red-700">{errorMessage}</p>
                ) : (
                  <p className="font-bold text-[#1E1419]">
                    {saveStatus ? saveStatus : 'Ready to publish changes to your storefront?'}
                  </p>
                )}
                <p className="text-[11px] text-[#45313D]">
                  Saves store info, social links, PayPal &amp; Google Pay, GCash/Maya QR codes, SEO, and policies.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-6 py-2.5 bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7] text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-60 cursor-pointer shrink-0"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{savingSettings ? 'Saving Settings...' : 'Save Website Settings'}</span>
              </button>
            </div>

          </div>
        )}

        {/* MODAL: PRODUCT EDIT / ADD */}
        {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
            <div className="bg-[#F7F3E9] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E8C9C1] shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
              
              <div className="flex items-center justify-between border-b border-[#E8C9C1]/60 pb-3">
                <h3 className="font-heading font-bold text-lg text-[#1E1419]">
                  {allProducts.some(p => p.id === editingProduct.id) ? 'Edit Product' : 'Add New Wallpaper'}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-[#8B6F7A] font-bold">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title}
                    onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Theme Collection</label>
                    <select
                      value={editingProduct.collectionId || ''}
                      onChange={e => {
                        const col = allCollections.find(c => c.id === e.target.value);
                        setEditingProduct({
                          ...editingProduct,
                          collectionId: e.target.value || undefined,
                          collection: col ? col.name : editingProduct.collection,
                          theme: col ? col.name : editingProduct.theme,
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                    >
                      <option value="">Custom / Manual</option>
                      {allCollections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Category Filter</label>
                    <select
                      value={editingProduct.category || 'desktop'}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                    >
                      <option value="desktop">Desktop Wallpapers</option>
                      <option value="phone_tablet">Phone &amp; Tablet Wallpapers</option>
                      <option value="icon_pack">Icon Packs</option>
                      <option value="bundle">Bundles</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Product Type</label>
                    <select
                      value={editingProduct.productType || 'wallpaper'}
                      onChange={e => setEditingProduct({ ...editingProduct, productType: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                    >
                      <option value="wallpaper">Wallpaper</option>
                      <option value="icon_pack">Icon Pack</option>
                      <option value="bundle">Bundle</option>
                      <option value="stationery">Stationery</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Theme Label</label>
                    <input
                      type="text"
                      value={editingProduct.theme}
                      onChange={e => setEditingProduct({ ...editingProduct, theme: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Collection Label</label>
                    <input
                      type="text"
                      value={editingProduct.collection}
                      onChange={e => setEditingProduct({ ...editingProduct, collection: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                </div>

                {/* Freebie Wallpaper Setting */}
                <div className="p-3 bg-[#E8C9C1]/30 rounded-2xl border border-[#E8C9C1] flex items-center justify-between">
                  <div>
                    <label className="font-bold text-[#1E1419] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingProduct.isFree || editingProduct.price === 0)}
                        onChange={e => {
                          const isFreeVal = e.target.checked;
                          setEditingProduct({
                            ...editingProduct,
                            isFree: isFreeVal,
                            price: isFreeVal ? 0 : (editingProduct.price || 3.50),
                            collection: isFreeVal ? 'Free Wallpapers' : editingProduct.collection,
                          });
                        }}
                        className="accent-[#8B6F7A] w-4 h-4 cursor-pointer"
                      />
                      <span>Make this a Freebie Wallpaper (Price = $0.00)</span>
                    </label>
                    <p className="text-[11px] text-[#33222C] mt-0.5 ml-6 font-medium">
                      Customers get a 1-click "Free Download" button with no payment needed!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">
                      Price ($) * {Boolean(editingProduct.isFree || editingProduct.price === 0) && '(Free)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      disabled={Boolean(editingProduct.isFree)}
                      value={editingProduct.price}
                      onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419] disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Compare-at Price ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingProduct.compareAtPrice || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, compareAtPrice: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl text-[#1E1419]"
                    />
                  </div>
                </div>

                {/* Social Proof Stats: Download Numbers & Live Text */}
                <div className="grid grid-cols-2 gap-4 bg-[#F4EAE6]/60 p-3.5 rounded-2xl border border-[#D5C2BB]">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">
                      Downloads / Sales Count (Social Proof) *
                    </label>
                    <input
                      type="number"
                      value={editingProduct.downloadCount ?? 120}
                      onChange={e => setEditingProduct({ ...editingProduct, downloadCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-bold"
                    />
                    <p className="text-[10px] text-[#45313D] font-medium mt-0.5">
                      Card will display: "{(editingProduct.downloadCount || 0).toLocaleString()} downloaded"
                    </p>
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">
                      Recent Activity Time Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2m ago, or just now"
                      value={editingProduct.recentDownloadTime || 'just now'}
                      onChange={e => setEditingProduct({ ...editingProduct, recentDownloadTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#D5C2BB] rounded-xl text-[#1E1419] font-medium"
                    />
                    <p className="text-[10px] text-[#45313D] font-medium mt-0.5">
                      Pulsing live text: "Live: Downloaded {editingProduct.recentDownloadTime || 'just now'}"
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingProduct.description}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Device Compatibility</label>
                  <div className="flex gap-4">
                    {['desktop', 'mobile', 'tablet'].map((dev: any) => (
                      <label key={dev} className="flex items-center gap-1.5 cursor-pointer capitalize">
                        <input
                          type="checkbox"
                          checked={editingProduct.deviceTypes.includes(dev)}
                          onChange={e => {
                            const cur = editingProduct.deviceTypes;
                            const next = e.target.checked ? [...cur, dev] : cur.filter(d => d !== dev);
                            setEditingProduct({ ...editingProduct, deviceTypes: next });
                          }}
                          className="accent-[#8B6F7A]"
                        />
                        <span>{dev}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Primary Picture Upload & Preview */}
                <div className="p-4 bg-[#FCF3E2]/55 rounded-2xl border border-[#E8C9C1] space-y-4">
                  <ImageUploadField
                    label="Primary Wallpaper / Product Cover Picture *"
                    value={editingProduct.images[0] || ''}
                    onChange={url => {
                      const rest = editingProduct.images.slice(1);
                      setEditingProduct({
                        ...editingProduct,
                        images: [url, ...rest],
                      });
                    }}
                    getToken={getFreshAdminToken}
                    folder="products"
                    helperText="Drag & drop a PNG/JPG/WebP mockup, click Upload Picture, or paste an image URL."
                  />

                  {/* Additional Gallery Pictures */}
                  <div className="pt-2 border-t border-[#E8C9C1]/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#1E1419] text-xs">
                          Additional Gallery Previews ({Math.max(0, editingProduct.images.length - 1)})
                        </p>
                        <p className="text-[10px] text-[#5C4952]">
                          Optional extra device screenshots or closeup previews shown on the product page.
                        </p>
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="px-3 py-1.5 bg-white hover:bg-[#F4EAE6] text-[#A64B3C] border border-[#E8C9C1] rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5">
                          {uploadingProductGallery ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ImagePlus className="w-3.5 h-3.5" />
                          )}
                          <span>{uploadingProductGallery ? 'Uploading...' : 'Add Gallery Picture'}</span>
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingProductGallery}
                          onChange={async e => {
                            const files = Array.from(e.target.files || []);
                            e.target.value = '';
                            if (files.length === 0) return;

                            setErrorMessage(null);
                            setUploadingProductGallery(true);
                            try {
                              const token = await getFreshAdminToken();
                              const newUrls: string[] = [];
                              for (const file of files) {
                                const uploaded = await uploadStoreAsset(file, {
                                  token,
                                  folder: 'products',
                                  optimizeImage: true,
                                });
                                newUrls.push(uploaded.url);
                              }
                              setEditingProduct(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      images: [...prev.images.filter(Boolean), ...newUrls],
                                    }
                                  : prev
                              );
                            } catch (err: any) {
                              setErrorMessage(err?.message || 'Failed to upload gallery image.');
                            } finally {
                              setUploadingProductGallery(false);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {editingProduct.images.slice(1).length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {editingProduct.images.slice(1).map((imgUrl, idx) => (
                          <div
                            key={`${idx}-${imgUrl.slice(0, 24)}`}
                            className="relative group rounded-xl overflow-hidden border border-[#E8C9C1] bg-white aspect-4/3"
                          >
                            <img
                              src={imgUrl}
                              alt={`Gallery ${idx + 2}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  const actualIdx = idx + 1;
                                  const copy = [...editingProduct.images];
                                  const [picked] = copy.splice(actualIdx, 1);
                                  setEditingProduct({
                                    ...editingProduct,
                                    images: [picked, ...copy],
                                  });
                                }}
                                className="px-1.5 py-0.5 bg-[#1E1419]/85 text-white text-[9px] font-bold rounded-md cursor-pointer"
                              >
                                Make Cover
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const actualIdx = idx + 1;
                                  setEditingProduct({
                                    ...editingProduct,
                                    images: editingProduct.images.filter((_, i) => i !== actualIdx),
                                  });
                                }}
                                aria-label="Remove gallery picture"
                                className="p-1 bg-red-600 text-white rounded-md cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Dedicated High-Res Wallpaper / ZIP Download File */}
                <div className="p-4 bg-[#F4EAE6]/55 rounded-2xl border border-[#D5C2BB] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#1E1419] text-xs">
                        Downloadable Wallpaper File (Optional)
                      </p>
                      <p className="text-[10px] text-[#45313D] font-medium">
                        Upload the exact full-res wallpaper (.png / .jpg / .webp) or .zip bundle customers receive. Leave blank to deliver the primary wallpaper picture above.
                      </p>
                    </div>
                    {editingProduct.downloadUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({ ...editingProduct, downloadUrl: undefined })
                        }
                        className="text-[11px] font-bold text-[#8B6F7A] hover:text-red-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Separate File</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="cursor-pointer block">
                      <span className="w-full py-2 px-3 bg-white hover:bg-[#FCF3E2] text-[#A64B3C] border border-[#E8C9C1] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                        {uploadingProductDownloadFile ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {uploadingProductDownloadFile
                            ? 'Uploading Wallpaper File...'
                            : editingProduct.downloadUrl
                              ? 'Replace Wallpaper / ZIP File'
                              : 'Upload Wallpaper / ZIP File'}
                        </span>
                      </span>
                      <input
                        type="file"
                        accept="image/*,.zip"
                        disabled={uploadingProductDownloadFile}
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;

                          setErrorMessage(null);
                          setUploadingProductDownloadFile(true);
                          try {
                            const token = await getFreshAdminToken();
                            const uploaded = await uploadStoreAsset(file, {
                              token,
                              folder: 'wallpapers',
                              optimizeImage: false,
                            });
                            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
                            setEditingProduct(prev =>
                              prev
                                ? {
                                    ...prev,
                                    downloadUrl: uploaded.url,
                                    downloadFileName: file.name || prev.downloadFileName,
                                    fileSize: Number(sizeMb) > 0.1 ? `${sizeMb} MB` : prev.fileSize,
                                  }
                                : prev
                            );
                            triggerSaveNotification(`Wallpaper file "${file.name}" attached!`);
                          } catch (err: any) {
                            setErrorMessage(err?.message || 'Failed to upload wallpaper file.');
                          } finally {
                            setUploadingProductDownloadFile(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="text"
                      value={editingProduct.downloadFileName || ''}
                      onChange={e =>
                        setEditingProduct({ ...editingProduct, downloadFileName: e.target.value })
                      }
                      placeholder="Download filename (e.g. cozy_theme.png)"
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl font-mono text-[11px]"
                    />
                  </div>

                  {editingProduct.downloadUrl && (
                    <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg truncate">
                      Attached download source: {editingProduct.downloadUrl}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.status === 'published'}
                      onChange={e => setEditingProduct({ ...editingProduct, status: e.target.checked ? 'published' : 'draft' })}
                      className="accent-[#8B6F7A]"
                    />
                    <span className="font-bold text-[#1E1419]">Publish to Storefront</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsProductModalOpen(false)}
                      className="px-4 py-2 bg-white border border-[#E8C9C1] rounded-xl text-xs font-bold text-[#33222C] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProductModal}
                      disabled={uploadingProductGallery || uploadingProductDownloadFile}
                      className="px-5 py-2 bg-[#A64B3C] text-[#FFFCF7] rounded-xl text-xs font-bold hover:bg-[#8E3E30] disabled:opacity-60 cursor-pointer"
                    >
                      Save Product
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

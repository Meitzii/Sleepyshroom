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
  Sparkles, 
  AlertCircle,
  DollarSign,
  Users,
  ImagePlus,
  Lock,
  Loader2
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { supabase } from '../lib/supabase.ts';
import { parseJsonResponse } from '../utils/apiClient.ts';
import { ContactMessagesPanel } from '../components/admin/ContactMessagesPanel.tsx';
import type { 
  Product, 
  CarouselSlide, 
  Collection, 
  WebsiteSettings, 
  Order, 
  ContactMessage,
  ContactMessageStatus
} from '../types/index.ts';

export const AdminDashboard: React.FC = () => {
  const { user, navigateTo, refreshData } = useShop();

  const [activeTab, setActiveTab] = useState<'overview' | 'carousel' | 'products' | 'homepage' | 'collections' | 'orders' | 'messages' | 'settings'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Editable state loaded from server
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesSetupError, setMessagesSetupError] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailProvider, setEmailProvider] = useState<string | null>(null);
  const [emailUsingSandbox, setEmailUsingSandbox] = useState(false);

  // Feedback notifications
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Collection modal state
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

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
      const [statsRes, contentRes, prodsRes, colsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders }),
        fetch('/api/admin/content', { headers: authHeaders }),
        fetch('/api/products?includeDrafts=true'),
        fetch('/api/collections'),
        fetch('/api/orders', { headers: authHeaders }),
      ]);

      const [statsParsed, contentParsed, prodsParsed, colsParsed, ordersParsed] = await Promise.all([
        parseJsonResponse(statsRes),
        parseJsonResponse(contentRes),
        parseJsonResponse(prodsRes),
        parseJsonResponse(colsRes),
        parseJsonResponse(ordersRes),
      ]);

      if (statsParsed.ok && statsParsed.isJson && statsParsed.data) setStats(statsParsed.data);
      if (contentParsed.ok && contentParsed.isJson && contentParsed.data) {
        if (contentParsed.data.settings) setSettings(contentParsed.data.settings);
        if (Array.isArray(contentParsed.data.carouselSlides)) setSlides(contentParsed.data.carouselSlides);
      }
      if (prodsParsed.ok && prodsParsed.isJson && Array.isArray(prodsParsed.data)) setAllProducts(prodsParsed.data);
      if (colsParsed.ok && colsParsed.isJson && Array.isArray(colsParsed.data)) setAllCollections(colsParsed.data);
      if (ordersParsed.ok && ordersParsed.isJson && Array.isArray(ordersParsed.data)) setOrders(ordersParsed.data);

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
      const payload = publishAll
        ? slides.map(s => ({ ...s, status: 'published' }))
        : slides;

      const res = await fetch('/api/admin/slides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSlides(payload as any);
        triggerSaveNotification(publishAll ? 'Carousel changes published to live site!' : 'Carousel draft saved successfully!');
        refreshData();
      } else {
        throw new Error('Save failed');
      }
    } catch {
      setErrorMessage('Could not update carousel slides.');
    }
  };

  // Image upload helper for any card / slide
  const handleUploadImageForSlide = (slideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: reader.result,
            filename: file.name,
          }),
        });
        const parsed = await parseJsonResponse<{ url?: string; error?: string }>(res);
        if (parsed.ok && parsed.isJson && parsed.data?.url) {
          handleSlideChange(slideId, 'imageUrl', parsed.data.url);
          triggerSaveNotification('Image uploaded! Click "Publish Changes" to make it live.');
        } else {
          setErrorMessage(parsed.data?.error || 'Failed to upload image.');
        }
      } catch (err) {
        setErrorMessage('Failed to upload image.');
      }
    };
    reader.readAsDataURL(file);
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
      theme: 'Mushroom Dreams',
      collection: 'Dreamy Night',
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
      const isExisting = allProducts.some(p => p.id === editingProduct.id);
      const url = isExisting ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });

      if (res.ok) {
        setIsProductModalOpen(false);
        triggerSaveNotification(`Product "${editingProduct.title}" saved successfully!`);
        loadAdminData();
        refreshData();
      }
    } catch {
      setErrorMessage('Error saving product');
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSaveNotification(`Deleted product "${title}"`);
        loadAdminData();
        refreshData();
      }
    } catch {
      setErrorMessage('Error deleting product');
    }
  };

  // 3. HOMEPAGE & WEBSITE SETTINGS
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        triggerSaveNotification('Settings and homepage content saved to database!');
        refreshData();
      }
    } catch {
      setErrorMessage('Error updating settings');
    }
  };

  // Image upload helper for hero or settings
  const handleUploadImageForHero = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result, filename: file.name }),
        });
        const parsed = await parseJsonResponse<{ url?: string; error?: string }>(res);
        if (parsed.ok && parsed.isJson && parsed.data?.url) {
          setSettings({ ...settings, heroImage: parsed.data.url });
          triggerSaveNotification('Hero image uploaded! Click Save to apply.');
        } else {
          setErrorMessage(parsed.data?.error || 'Failed to upload image.');
        }
      } catch {
        setErrorMessage('Failed to upload image.');
      }
    };
    reader.readAsDataURL(file);
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

          <div className="flex items-center gap-2">
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#EADCC8]">
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
                <span className="text-xs text-[#1E1419] font-bold">Total Revenue</span>
                {/* Distinctive Revenue Value */}
                <p className="font-heading font-extrabold text-2xl sm:text-3xl text-[#945367] mt-1 tabular-nums">
                  ${stats ? stats.totalRevenue.toFixed(2) : '0.00'}
                </p>
                <span className="text-[11px] text-emerald-900 font-bold mt-1 block">Verified Digital Sales</span>
              </div>

              <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1] shadow-xs">
                <span className="text-xs text-[#1E1419] font-bold">Total Orders</span>
                <p className="font-heading font-bold text-2xl text-[#1E1419] mt-1 tabular-nums">
                  {stats ? stats.totalOrders : 0}
                </p>
                <span className="text-[11px] text-[#45313D] font-semibold mt-1 block">Lifetime Purchases</span>
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
                <span className="text-[11px] text-[#45313D] font-semibold mt-1 block">Registered & Guests</span>
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
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#1E1419]">{o.orderNumber}</span>
                        <span className="text-[#33222C] font-medium ml-2">{o.customerEmail}</span>
                        <p className="text-[11px] text-[#33222C] font-medium">
                          {o.items.length} wallpaper{o.items.length > 1 ? 's' : ''} · {o.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        {/* Distinctive order price */}
                        <span className="font-extrabold text-[#945367] tabular-nums text-sm">${o.total.toFixed(2)}</span>
                        <span className="block text-[10px] text-emerald-900 font-bold">Completed</span>
                      </div>
                    </div>
                  ))}
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
                <h4 className="font-bold text-sm text-[#1E1419]">Configure Store</h4>
                <p className="text-xs text-[#33222C] font-medium mt-1">Payment providers, receiving email, and policies.</p>
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
                        {slide.imageUrl ? (
                          <img
                            src={slide.imageUrl}
                            alt={slide.themeTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          /* Image Placeholder if empty */
                          <div className="text-center p-3">
                            <ImagePlus className="w-6 h-6 text-[#8B6F7A] mx-auto mb-1 opacity-70" />
                            <p className="text-[10px] font-bold text-[#8B6F7A]">
                              Upload your theme image here
                            </p>
                          </div>
                        )}
                      </div>

                      {/* File upload trigger */}
                      <label className="cursor-pointer block">
                        <span className="w-full py-1.5 px-3 bg-white hover:bg-[#F4EAE6] text-[#8B6F7A] border border-[#E8C9C1] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{slide.imageUrl ? 'Replace Image' : 'Upload Image'}</span>
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleUploadImageForSlide(slide.id, e)}
                          className="hidden"
                        />
                      </label>
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4">
                  <div className="aspect-16/10 rounded-2xl overflow-hidden bg-white border border-[#E8C9C1]">
                    <img src={settings.heroImage} alt="Hero banner" className="w-full h-full object-cover" />
                  </div>
                  <label className="cursor-pointer block mt-2">
                    <span className="w-full py-2 bg-white hover:bg-[#F4EAE6] text-[#8B6F7A] border border-[#E8C9C1] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                      <Upload className="w-4 h-4" />
                      <span>Upload New Hero Image</span>
                    </span>
                    <input type="file" accept="image/*" onChange={handleUploadImageForHero} className="hidden" />
                  </label>
                </div>

                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1E1419] mb-1">
                      Hero Headline
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

          </div>
        )}

        {/* TAB 5: ORDERS & DOWNLOADS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-[#F9F6F0] p-5 rounded-3xl border border-[#E8C9C1]">
              <h2 className="font-heading font-bold text-lg text-[#1E1419]">
                Customer Orders & Digital Deliveries
              </h2>
              <p className="text-xs text-[#33222C]">
                All completed orders, customer emails, transactions, and download tokens.
              </p>
            </div>

            <div className="bg-[#F9F6F0] rounded-3xl border border-[#E8C9C1] divide-y divide-[#E8C9C1]/70 overflow-hidden">
              {orders.map(o => (
                <div key={o.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-[#1E1419]">{o.orderNumber}</span>
                      <span className="text-xs text-[#33222C] font-semibold">{o.customerName}</span>
                    </div>
                    <p className="text-xs text-[#33222C] font-medium mt-0.5">
                      Email: <strong className="text-[#1E1419] font-bold">{o.customerEmail}</strong> · Download Token: <span className="font-mono text-[11px] bg-white text-[#1E1419] px-1.5 py-0.5 rounded border border-[#D5C2BB]">{o.downloadToken}</span>
                    </p>
                    <p className="text-[11px] text-[#45313D] font-medium mt-1">
                      {o.items.map(i => i.title).join(', ')}
                    </p>
                  </div>

                  <div className="text-right">
                    {/* Distinctive Order Total Price */}
                    <span className="text-base font-extrabold text-[#945367] tabular-nums">${o.total.toFixed(2)}</span>
                    <button
                      onClick={() => navigateTo('confirmation', o.downloadToken)}
                      className="block text-xs font-bold text-[#1E1419] hover:underline mt-1 cursor-pointer"
                    >
                      View Customer Download Page
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {/* TAB 7: WEBSITE SETTINGS */}
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
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-[#8B6F7A] text-[#F7F3E9] text-xs font-bold rounded-xl hover:bg-[#785E69] flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </button>
            </div>

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

            {/* Payment Providers Configuration */}
            <div className="border-t border-[#E8C9C1]/50 pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6F7A]">
                  Payment Providers &amp; Billing Configuration
                </h3>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-[#E8C9C1]">
                  <input
                    type="checkbox"
                    checked={settings.paymentProviders.testMode}
                    onChange={e => setSettings({
                      ...settings,
                      paymentProviders: { ...settings.paymentProviders, testMode: e.target.checked }
                    })}
                    className="accent-[#8B6F7A]"
                  />
                  <span className="text-xs text-[#1E1419] font-bold">Sandbox / Demo Test Mode</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Stripe */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1E1419]">Credit / Debit Card</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.paymentProviders.stripeEnabled}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, stripeEnabled: e.target.checked }
                        })}
                        className="accent-[#8B6F7A]"
                      />
                      <span className="text-xs text-[#8B6F7A] font-semibold">Enabled</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B6F7A] mb-0.5">Publishable Key</label>
                    <input
                      type="text"
                      value={settings.paymentProviders.stripePublishableKey}
                      onChange={e => setSettings({
                        ...settings,
                        paymentProviders: { ...settings.paymentProviders, stripePublishableKey: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-lg"
                    />
                  </div>
                </div>

                {/* PayPal */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1E1419]">PayPal</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.paymentProviders.paypalEnabled}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, paypalEnabled: e.target.checked }
                        })}
                        className="accent-[#8B6F7A]"
                      />
                      <span className="text-xs text-[#8B6F7A] font-semibold">Enabled</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B6F7A] mb-0.5">Receiving PayPal Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="shop.sleepyshroom@gmail.com"
                      value={settings.paymentProviders.paypalEmail || ''}
                      onChange={e => setSettings({
                        ...settings,
                        paymentProviders: { ...settings.paymentProviders, paypalEmail: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-lg"
                    />
                  </div>
                </div>

                {/* GCash */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1E1419]">GCash Mobile Payment</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.paymentProviders.gcashEnabled}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, gcashEnabled: e.target.checked }
                        })}
                        className="accent-[#8B6F7A]"
                      />
                      <span className="text-xs text-[#8B6F7A] font-semibold">Enabled</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8B6F7A] mb-0.5">Account Name</label>
                      <input
                        type="text"
                        placeholder="Merchant Name"
                        value={settings.paymentProviders.gcashAccountName || ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, gcashAccountName: e.target.value }
                        })}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8B6F7A] mb-0.5">GCash Number</label>
                      <input
                        type="text"
                        placeholder="09XX XXX XXXX"
                        value={settings.paymentProviders.gcashNumber || ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, gcashNumber: e.target.value }
                        })}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Maya */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8C9C1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1E1419]">Maya Digital Payment</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.paymentProviders.mayaEnabled}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, mayaEnabled: e.target.checked }
                        })}
                        className="accent-[#8B6F7A]"
                      />
                      <span className="text-xs text-[#8B6F7A] font-semibold">Enabled</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8B6F7A] mb-0.5">Account Name</label>
                      <input
                        type="text"
                        placeholder="Merchant Name"
                        value={settings.paymentProviders.mayaAccountName || ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, mayaAccountName: e.target.value }
                        })}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8B6F7A] mb-0.5">Maya Number</label>
                      <input
                        type="text"
                        placeholder="09XX XXX XXXX"
                        value={settings.paymentProviders.mayaNumber || ''}
                        onChange={e => setSettings({
                          ...settings,
                          paymentProviders: { ...settings.paymentProviders, mayaNumber: e.target.value }
                        })}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#F9F6F0] border border-[#E8C9C1] rounded-lg"
                      />
                    </div>
                  </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Theme</label>
                    <input
                      type="text"
                      value={editingProduct.theme}
                      onChange={e => setEditingProduct({ ...editingProduct, theme: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1E1419] mb-1">Collection</label>
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

                <div>
                  <label className="block font-bold text-[#1E1419] mb-1">Preview Image Path / URL</label>
                  <input
                    type="text"
                    value={editingProduct.images[0] || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                    className="w-full px-3 py-2 bg-white border border-[#E8C9C1] rounded-xl"
                  />
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
                      onClick={() => setIsProductModalOpen(false)}
                      className="px-4 py-2 bg-white border border-[#E8C9C1] rounded-xl text-xs font-bold text-[#33222C]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProductModal}
                      className="px-5 py-2 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-xs font-bold hover:bg-[#785E69]"
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

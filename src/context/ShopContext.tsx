import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { 
  Product, 
  CarouselSlide, 
  Collection, 
  WebsiteSettings, 
  CartItem, 
  DiscountCode, 
  UserAccount,
  Order 
} from '../types/index.ts';
import { 
  initialSettings, 
  initialCarouselSlides, 
  initialProducts, 
  initialCollections 
} from '../data/initialData.ts';
import { downloadWallpaperFile } from '../utils/downloadHelper.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

export interface GoogleSignInResult {
  success: boolean;
  error?: string;
  needsNewTab?: boolean;
  externalTabUrl?: string;
}

interface ShopContextType {
  products: Product[];
  collections: Collection[];
  carouselSlides: CarouselSlide[];
  settings: WebsiteSettings | null;
  loading: boolean;
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  discount: number;
  appliedDiscount: DiscountCode | null;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyDiscount: (code: string) => Promise<{ success: boolean; message: string }>;
  removeDiscount: () => void;
  user: UserAccount | null;
  login: (email: string, name?: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  logout: () => Promise<void>;
  oauthError: string | null;
  clearOAuthError: () => void;
  activeView: string;
  viewParam: string | null;
  navigateTo: (view: string, param?: string | null) => void;
  refreshData: () => Promise<void>;
  latestOrder: Order | null;
  setLatestOrder: (order: Order | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  downloadFreebie: (product: Product) => void;
  liveToast: string | null;
  setLiveToast: (toast: string | null) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>(initialCarouselSlides);
  const [settings, setSettings] = useState<WebsiteSettings | null>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const clearOAuthError = () => setOauthError(null);

  // Cart state persisted to localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sleepyshroom_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);

  // User auth state persisted to localStorage
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('sleepyshroom_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation state (SPA routing via hash or internal state)
  const [activeView, setActiveView] = useState<string>('home');
  const [viewParam, setViewParam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (
        hash.startsWith('access_token=') ||
        hash.startsWith('error=') ||
        hash.includes('refresh_token=') ||
        hash.includes('error_description=')
      ) {
        return;
      }
      if (!hash) {
        setActiveView('home');
        setViewParam(null);
        return;
      }

      const parts = hash.split('/');
      const view = parts[0] || 'home';
      const param = parts[1] ? decodeURIComponent(parts[1]) : null;

      setActiveView(view);
      setViewParam(param);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: string, param: string | null = null) => {
    setActiveView(view);
    setViewParam(param);
    const hash = param ? `#${view}/${encodeURIComponent(param)}` : `#${view}`;
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sleepyshroom_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Sync user to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('sleepyshroom_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('sleepyshroom_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Fetch initial data
  const refreshData = async () => {
    try {
      const [contentRes, prodsRes, colsRes] = await Promise.all([
        fetch('/api/content'),
        fetch('/api/products?includeDrafts=false'),
        fetch('/api/collections'),
      ]);

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        if (contentData.settings) setSettings(contentData.settings);
        if (Array.isArray(contentData.carouselSlides) && contentData.carouselSlides.length > 0) {
          setCarouselSlides(contentData.carouselSlides);
        }
      }
      if (prodsRes.ok) {
        const prodData = await prodsRes.json();
        if (Array.isArray(prodData) && prodData.length > 0) {
          setProducts(prodData);
        }
      }
      if (colsRes.ok) {
        const colData = await colsRes.json();
        if (Array.isArray(colData) && colData.length > 0) {
          setCollections(colData);
        }
      }
    } catch (err) {
      // Running statically (e.g. Vercel, GitHub Pages) - initial state is already loaded!
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Cart actions
  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
    setDiscountAmount(0);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Number(cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2));

  // Recalculate discount if cart changes
  useEffect(() => {
    if (appliedDiscount) {
      if (subtotal < appliedDiscount.minSpend) {
        setAppliedDiscount(null);
        setDiscountAmount(0);
      } else if (appliedDiscount.type === 'percentage') {
        const disc = (subtotal * appliedDiscount.value) / 100;
        setDiscountAmount(Number(disc.toFixed(2)));
      } else {
        const disc = Math.min(subtotal, appliedDiscount.value);
        setDiscountAmount(Number(disc.toFixed(2)));
      }
    } else {
      setDiscountAmount(0);
    }
  }, [subtotal, appliedDiscount]);

  const applyDiscount = async (code: string) => {
    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedDiscount({
          code: data.discountCode,
          type: data.type,
          value: data.value,
          minSpend: 0,
          active: true,
        });
        setDiscountAmount(data.discountAmount);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Invalid code' };
    } catch {
      return { success: false, message: 'Could not validate promo code' };
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountAmount(0);
  };

  const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  // Sync authenticated Supabase Google user into Sleepyshroom customer profile
  const syncSupabaseUser = async (supaUser: SupabaseUser): Promise<UserAccount | null> => {
    const email = supaUser.email?.trim();
    if (!email) return null;

    const meta = supaUser.user_metadata || {};
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      email.split('@')[0] ||
      'Cozy Friend';
    const avatarUrl =
      (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
      (typeof meta.picture === 'string' && meta.picture.trim()) ||
      undefined;
    const isOwnerEmail = email.toLowerCase() === 'shop.sleepyshroom@gmail.com';
    const provider =
      (typeof supaUser.app_metadata?.provider === 'string' && supaUser.app_metadata.provider) ||
      'google';

    let syncedUser: UserAccount = {
      id: supaUser.id,
      name: isOwnerEmail ? 'Sleepyshroom Owner' : fullName,
      email,
      createdAt: supaUser.created_at || new Date().toISOString(),
      isAdmin: isOwnerEmail,
      role: isOwnerEmail ? 'admin' : 'customer',
      avatarUrl,
      authProvider: provider,
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data?.user) {
          const serverUser = data.user as UserAccount;
          const emailPrefix = email.split('@')[0];
          const resolvedName =
            serverUser.name && serverUser.name !== emailPrefix
              ? serverUser.name
              : syncedUser.name;
          syncedUser = {
            ...serverUser,
            name: resolvedName,
            avatarUrl: avatarUrl || serverUser.avatarUrl,
            authProvider: provider,
            isAdmin: Boolean(serverUser.isAdmin || isOwnerEmail),
            role: isOwnerEmail || serverUser.isAdmin ? 'admin' : serverUser.role || 'customer',
          };
        }
      }
    } catch {
      // Static deployments (e.g. Vercel without Express) gracefully use Supabase profile metadata directly
    }

    setUser(syncedUser);
    return syncedUser;
  };

  // Listen to Supabase OAuth callbacks & session changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    const hashParams = new URLSearchParams(rawHash.includes('=') ? rawHash : '');

    const urlError =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error_description') ||
      hashParams.get('error');

    if (urlError) {
      const readable = urlError.replace(/\+/g, ' ');
      setOauthError(readable);
      setActiveView('account');
      setViewParam(null);
      try {
        window.history.replaceState(null, '', `${window.location.pathname}#account`);
      } catch {
        window.location.hash = '#account';
      }
    }

    const hadOAuthCallbackParams =
      searchParams.has('code') ||
      rawHash.startsWith('access_token=') ||
      rawHash.includes('refresh_token=');

    if (!supabase) return;

    let isMounted = true;
    let handledPostOAuthRedirect = false;
    let lastSyncedSessionKey: string | null = null;

    const completePostOAuthNavigation = (isSignInEvent: boolean) => {
      if (handledPostOAuthRedirect) return;

      let shouldOpenAccount = false;
      try {
        shouldOpenAccount = sessionStorage.getItem('sleepyshroom_post_auth_view') === 'account';
        sessionStorage.removeItem('sleepyshroom_post_auth_view');
      } catch {
        // Ignore storage errors
      }

      const currentSearch = new URLSearchParams(window.location.search);
      const currentHash = window.location.hash.replace(/^#\/?/, '');
      const hasUrlTokens =
        currentSearch.has('code') ||
        currentSearch.has('state') ||
        currentHash.startsWith('access_token=') ||
        currentHash.includes('refresh_token=');

      if (shouldOpenAccount || hadOAuthCallbackParams || hasUrlTokens || isSignInEvent) {
        handledPostOAuthRedirect = true;
        setActiveView('account');
        setViewParam(null);
        try {
          window.history.replaceState(null, '', `${window.location.pathname}#account`);
        } catch {
          window.location.hash = '#account';
        }
      }
    };

    const syncIfNeeded = (sessionUser: SupabaseUser, accessToken: string, isSignInEvent: boolean) => {
      const sessionKey = `${sessionUser.id}:${accessToken}`;
      if (lastSyncedSessionKey === sessionKey) {
        if (isSignInEvent) {
          completePostOAuthNavigation(true);
        }
        return;
      }
      lastSyncedSessionKey = sessionKey;
      setOauthError(null);
      void syncSupabaseUser(sessionUser).then(() => {
        if (isMounted) {
          completePostOAuthNavigation(isSignInEvent);
        }
      });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        lastSyncedSessionKey = null;
        setUser(null);
        return;
      }

      if (session?.user) {
        syncIfNeeded(session.user, session.access_token || '', event === 'SIGNED_IN');
      } else if (event === 'INITIAL_SESSION') {
        setUser(prev => (prev?.authProvider && prev.authProvider !== 'email' ? null : prev));
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error && !urlError) {
        setOauthError(error.message || 'Unable to complete Google sign-in.');
        if (hadOAuthCallbackParams) {
          setActiveView('account');
          setViewParam(null);
          try {
            window.history.replaceState(null, '', `${window.location.pathname}#account`);
          } catch {
            window.location.hash = '#account';
          }
        }
        return;
      }
      if (data.session?.user) {
        syncIfNeeded(data.session.user, data.session.access_token || '', false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // User authentication (preserves existing email/password login)
  const login = async (email: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setUser({ ...data.user, authProvider: 'email' });
        return true;
      }
      if (!res.ok) {
        return false;
      }
    } catch {
      // Static fallback when Express backend is unavailable (e.g. static Vercel deploy)
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) return false;
    const isOwnerEmail = trimmedEmail.toLowerCase() === 'shop.sleepyshroom@gmail.com';
    setUser({
      id: isOwnerEmail ? 'usr-admin' : `usr-${Date.now()}`,
      name: isOwnerEmail ? 'Sleepyshroom Owner' : (name?.trim() || trimmedEmail.split('@')[0]),
      email: trimmedEmail,
      createdAt: new Date().toISOString(),
      isAdmin: isOwnerEmail,
      role: isOwnerEmail ? 'admin' : 'customer',
      authProvider: 'email',
    });
    return true;
  };

  // Google OAuth 2.0 via Supabase Auth
  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    setOauthError(null);

    if (!isSupabaseConfigured || !supabase) {
      const msg =
        'Google Sign-In requires Supabase client configuration. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
      setOauthError(msg);
      return { success: false, error: msg };
    }

    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }

    if (inIframe) {
      return {
        success: false,
        error:
          'Google Sign-In cannot open inside an embedded preview frame. Please open Sleepyshroom in a new browser tab to sign in with Google.',
        needsNewTab: true,
        externalTabUrl: `${window.location.origin}/#account`,
      };
    }

    try {
      try {
        sessionStorage.setItem('sleepyshroom_post_auth_view', 'account');
      } catch {
        // Ignore storage errors
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        try {
          sessionStorage.removeItem('sleepyshroom_post_auth_view');
        } catch {
          // Ignore
        }
        const msg = error.message || 'Unable to start Google Sign-In.';
        setOauthError(msg);
        return { success: false, error: msg };
      }

      if (!data?.url) {
        const msg = 'No Google authentication redirect URL was returned.';
        setOauthError(msg);
        return { success: false, error: msg };
      }

      return { success: true };
    } catch (err: any) {
      try {
        sessionStorage.removeItem('sleepyshroom_post_auth_view');
      } catch {
        // Ignore
      }
      const msg = err?.message || 'An error occurred while connecting to Google.';
      setOauthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    setUser(null);
    setOauthError(null);
    try {
      localStorage.removeItem('sleepyshroom_user');
    } catch {
      // Ignore
    }
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase sign-out error:', err);
      }
    }
  };

  const downloadFreebie = async (product: Product) => {
    try {
      // 1. Download real image file directly as valid binary image (works offline & on Vercel)
      const imageSrc = product.images[0] || `/wallpapers/${product.downloadFileName.replace(/\.zip$/i, '.jpg')}`;
      await downloadWallpaperFile(imageSrc, product.downloadFileName);

      // 2. Notify backend if available (non-blocking)
      fetch(`/api/free-download/${product.id}`).catch(() => {});

      // 3. Optimistically update local download count and live activity indicator
      setProducts(prev => prev.map(p => {
        if (p.id === product.id) {
          return {
            ...p,
            downloadCount: (p.downloadCount || 0) + 1,
            recentDownloadTime: 'just now',
          };
        }
        return p;
      }));

      // 4. Show live notification toast
      setLiveToast(`🎉 Freebie downloaded! "${product.title}" has started downloading.`);
      setTimeout(() => setLiveToast(null), 5000);
    } catch (e) {
      console.error('Freebie download error:', e);
    }
  };

  // Periodic gentle live social proof simulation
  useEffect(() => {
    const liveEvents = [
      { text: 'Someone in Kyoto just downloaded Little Clover Nap · 1m ago', prodId: 'prod-free-1' },
      { text: 'Someone in Seattle purchased Sleepy Garden Sanctuary · 3m ago', prodId: 'prod-desktop-1' },
      { text: 'Someone in London downloaded Acorn Lantern Lullaby · just now', prodId: 'prod-free-2' },
      { text: 'Someone in Melbourne purchased Midnight Firefly Forest · 2m ago', prodId: 'prod-mobile-1' },
      { text: 'Someone in Portland purchased Mushroom Dreams Slumber · 4m ago', prodId: 'prod-desktop-3' },
    ];

    let index = 0;
    const interval = setInterval(() => {
      // Gently update recentDownloadTime and increment count on product to show live proof
      const event = liveEvents[index % liveEvents.length];
      index++;

      setProducts(prev => prev.map(p => {
        if (p.id === event.prodId) {
          return {
            ...p,
            downloadCount: (p.downloadCount || 0) + 1,
            recentDownloadTime: 'just now',
          };
        }
        return p;
      }));

      // Subtle live toast for visitors
      setLiveToast(event.text);
      setTimeout(() => setLiveToast(null), 4500);
    }, 24000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ShopContext.Provider
      value={{
        products,
        collections,
        carouselSlides,
        settings,
        loading,
        cart,
        cartCount,
        subtotal,
        discount: discountAmount,
        appliedDiscount,
        total,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyDiscount,
        removeDiscount,
        user,
        login,
        signInWithGoogle,
        logout,
        oauthError,
        clearOAuthError,
        activeView,
        viewParam,
        navigateTo,
        refreshData,
        latestOrder,
        setLatestOrder,
        searchQuery,
        setSearchQuery,
        downloadFreebie,
        liveToast,
        setLiveToast,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

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

export interface AuthActionResult {
  success: boolean;
  error?: string;
  needsEmailVerification?: boolean;
  pendingEmail?: string;
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
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<AuthActionResult>;
  resendVerificationEmail: (email: string) => Promise<AuthActionResult>;
  sendPasswordResetEmail: (email: string) => Promise<AuthActionResult>;
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

  // Sync authenticated Supabase user (Email/Password or Google) into public.profiles
  const syncSupabaseUser = async (supaUser: SupabaseUser): Promise<UserAccount | null> => {
    const email = supaUser.email?.trim();
    if (!email) return null;

    const meta = supaUser.user_metadata || {};
    const metaName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
      email.split('@')[0] ||
      'Cozy Friend';
    const avatarUrl =
      (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
      (typeof meta.picture === 'string' && meta.picture.trim()) ||
      undefined;
    const isOwnerEmail = email.toLowerCase() === 'shop.sleepyshroom@gmail.com';
    const provider =
      (typeof supaUser.app_metadata?.provider === 'string' && supaUser.app_metadata.provider) ||
      'email';

    let resolvedName =
      isOwnerEmail && metaName === email.split('@')[0] ? 'Sleepyshroom Owner' : metaName;
    let resolvedRole: 'admin' | 'customer' = isOwnerEmail ? 'admin' : 'customer';
    let resolvedCreatedAt = supaUser.created_at || new Date().toISOString();

    if (supabase) {
      try {
        const { data: existingProfile, error: selectError } = await supabase
          .from('profiles')
          .select('id, email, display_name, role, created_at')
          .eq('id', supaUser.id)
          .maybeSingle();

        if (!selectError && existingProfile) {
          if (typeof existingProfile.display_name === 'string' && existingProfile.display_name.trim()) {
            resolvedName = existingProfile.display_name.trim();
          } else if (metaName) {
            await supabase
              .from('profiles')
              .update({ display_name: metaName })
              .eq('id', supaUser.id);
          }

          if (existingProfile.role === 'admin' || isOwnerEmail) {
            resolvedRole = 'admin';
          }
          if (existingProfile.created_at) {
            resolvedCreatedAt = existingProfile.created_at;
          }
        } else if (!selectError && !existingProfile) {
          const targetRole: 'admin' | 'customer' = isOwnerEmail ? 'admin' : 'customer';
          const { data: upsertedProfile, error: upsertError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: supaUser.id,
                email,
                display_name: resolvedName,
                role: targetRole,
              },
              { onConflict: 'id', ignoreDuplicates: true }
            )
            .select('id, email, display_name, role, created_at')
            .maybeSingle();

          if (!upsertError && upsertedProfile) {
            if (typeof upsertedProfile.display_name === 'string' && upsertedProfile.display_name.trim()) {
              resolvedName = upsertedProfile.display_name.trim();
            }
            if (upsertedProfile.role === 'admin' || isOwnerEmail) {
              resolvedRole = 'admin';
            }
            if (upsertedProfile.created_at) {
              resolvedCreatedAt = upsertedProfile.created_at;
            }
          } else if (upsertError) {
            console.warn('Could not sync public.profiles row:', upsertError.message);
          }
        } else if (selectError) {
          console.warn('Could not read public.profiles row:', selectError.message);
        }
      } catch (err) {
        console.warn('Profile sync warning:', err);
      }
    }

    const syncedUser: UserAccount = {
      id: supaUser.id,
      name: resolvedName,
      email,
      createdAt: resolvedCreatedAt,
      isAdmin: resolvedRole === 'admin',
      role: resolvedRole,
      avatarUrl,
      authProvider: provider,
    };

    setUser(syncedUser);
    return syncedUser;
  };

  // Listen to Supabase Auth callbacks & persistent session changes
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

    const hadAuthCallbackParams =
      searchParams.has('code') ||
      searchParams.get('type') === 'signup' ||
      searchParams.get('type') === 'email' ||
      searchParams.get('type') === 'recovery' ||
      rawHash.startsWith('access_token=') ||
      rawHash.includes('refresh_token=');

    if (!supabase) {
      setUser(null);
      return;
    }

    let isMounted = true;
    let handledPostAuthRedirect = false;
    let lastSyncedSessionKey: string | null = null;

    const completePostAuthNavigation = (isSignInEvent: boolean) => {
      if (handledPostAuthRedirect) return;

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

      if (shouldOpenAccount || hadAuthCallbackParams || hasUrlTokens || isSignInEvent) {
        handledPostAuthRedirect = true;
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
          completePostAuthNavigation(true);
        }
        return;
      }
      lastSyncedSessionKey = sessionKey;
      setOauthError(null);
      void syncSupabaseUser(sessionUser).then(() => {
        if (isMounted) {
          completePostAuthNavigation(isSignInEvent);
        }
      });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        lastSyncedSessionKey = null;
        handledPostAuthRedirect = false;
        setUser(null);
        return;
      }

      if (session?.user) {
        syncIfNeeded(session.user, session.access_token || '', event === 'SIGNED_IN');
      } else if (event === 'INITIAL_SESSION') {
        setUser(null);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error && !urlError) {
        setOauthError(error.message || 'Unable to verify authentication session.');
        if (hadAuthCallbackParams) {
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
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Email & Password Sign Up via Supabase Auth
  const signUpWithEmail = async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    setOauthError(null);

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error:
          'Authentication requires Supabase configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).',
      };
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      return { success: false, error: 'Please enter your name.' };
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: trimmedName,
            name: trimmedName,
            display_name: trimmedName,
          },
        },
      });

      if (error) {
        console.error('Supabase signUp error:', error);
        const msg = error.message || 'Could not create your account.';
        const lower = msg.toLowerCase();

        if (error.code === 'user_already_exists' || lower.includes('already registered')) {
          return {
            success: false,
            error: 'An account with this email already exists. Please sign in instead.',
          };
        }
        if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
          return {
            success: false,
            error: 'Too many verification emails were requested. Please wait a few minutes and try again.',
          };
        }
        return { success: false, error: msg };
      }

      // Supabase returns identities: [] when signing up with an already-existing confirmed email
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error:
            'An account with this email already exists. Please switch to Sign In or use Continue with Google.',
        };
      }

      if (data.session && data.user) {
        await syncSupabaseUser(data.user);
        navigateTo('account');
        return { success: true };
      }

      if (data.user && !data.session) {
        return {
          success: true,
          needsEmailVerification: true,
          pendingEmail: trimmedEmail,
        };
      }

      return { success: false, error: 'Could not complete registration. Please try again.' };
    } catch (err: any) {
      console.error('Unexpected signUp error:', err);
      return {
        success: false,
        error: err?.message || 'An unexpected error occurred during registration.',
      };
    }
  };

  // Email & Password Login via Supabase Auth
  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    setOauthError(null);

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error:
          'Authentication requires Supabase configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).',
      };
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        console.error('Supabase signInWithPassword error:', error);
        const msg = error.message || 'Sign in failed.';
        const lower = msg.toLowerCase();

        if (error.code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
          return {
            success: false,
            needsEmailVerification: true,
            pendingEmail: trimmedEmail,
            error:
              'Please verify your email before signing in. Check your inbox for the confirmation link or resend it below.',
          };
        }
        if (error.code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
          return {
            success: false,
            error:
              'Invalid email or password. If you signed up using Google, click "Continue with Google" below.',
          };
        }
        return { success: false, error: msg };
      }

      if (data.session && data.user) {
        await syncSupabaseUser(data.user);
        navigateTo('account');
        return { success: true };
      }

      return { success: false, error: 'Unable to establish a sign-in session.' };
    } catch (err: any) {
      console.error('Unexpected signInWithPassword error:', err);
      return {
        success: false,
        error: err?.message || 'An unexpected error occurred during sign in.',
      };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured.',
      };
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        return { success: false, error: error.message || 'Could not resend verification email.' };
      }
      return { success: true, pendingEmail: trimmedEmail };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not resend verification email.' };
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured.',
      };
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter your email address above first.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        return { success: false, error: error.message || 'Could not send reset email.' };
      }
      return { success: true, pendingEmail: trimmedEmail };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not send reset email.' };
    }
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
        signInWithEmail,
        signUpWithEmail,
        resendVerificationEmail,
        sendPasswordResetEmail,
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

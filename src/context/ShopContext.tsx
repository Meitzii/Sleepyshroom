import React, { createContext, useContext, useState, useEffect } from 'react';
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
  logout: () => void;
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

  // User authentication
  const login = async (email: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
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
        logout,
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

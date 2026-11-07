export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  theme: string;
  collection: string;
  deviceTypes: DeviceType[];
  resolutions: string[];
  fileFormat: string;
  fileSize: string;
  whatsIncluded: string[];
  images: string[];
  featured: boolean;
  isNew: boolean;
  popularity: number;
  status: 'published' | 'draft';
  createdAt: string;
  downloadFileName: string;
  isFree?: boolean;
  downloadCount?: number;
  recentDownloadTime?: string;
}

export interface CarouselSlide {
  id: string;
  themeTitle: string;
  description: string;
  imageUrl: string;
  linkDestination: string;
  exploreButtonText: string;
  order: number;
  visible: boolean;
  status: 'published' | 'draft';
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  featured: boolean;
  order: number;
  productCount?: number;
}

export interface WebsiteSettings {
  storeName: string;
  tagline: string;
  contactEmail: string;
  currency: string;
  currencySymbol: string;
  heroHeadline: string;
  heroSupportingText: string;
  heroPrimaryBtnText: string;
  heroSecondaryBtnText: string;
  heroImage: string;
  brandIntroHeading: string;
  brandIntroText: string;
  showHero: boolean;
  showCarousel: boolean;
  showDesktopSection: boolean;
  showMobileSection: boolean;
  showBrandIntro: boolean;
  paymentProviders: {
    stripeEnabled: boolean;
    stripePublishableKey: string;
    stripeSecretKeyConfigured: boolean;
    paypalEnabled: boolean;
    paypalClientId: string;
    gcashEnabled: boolean;
    mayaEnabled: boolean;
    testMode: boolean;
  };
  socialLinks: {
    instagram: string;
    twitter: string;
    pinterest: string;
  };
  aboutMe: {
    heading: string;
    introduction: string;
    whyStarted: string;
    designInspiration: string;
    profileImage: string;
  };
  returnPolicy: {
    title: string;
    lastUpdated: string;
    content: string;
  };
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  deviceTypes: DeviceType[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: 'completed' | 'pending' | 'refunded';
  transactionId: string;
  downloadToken: string;
  downloadCount: number;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
  status: 'new' | 'read' | 'replied';
  createdAt: string;
}

export interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  active: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export type PaymentProviderKey = 'paypal';

export type OrderPaymentStatus =
  | 'pending'
  | 'paid'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

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
    paypalEnabled: boolean;
    paypalAllowCards: boolean;
    testMode: boolean;
  };
  socialLinks: {
    instagram: string;
    twitter: string;
    pinterest: string;
  };
  artworkProtection?: {
    watermarkEnabled: boolean;
    watermarkOpacity: number;
    watermarkStyle: 'diagonal' | 'center' | 'corner';
    disableContextMenu: boolean;
    disableDrag: boolean;
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

export interface BillingDetails {
  country: string;
  city?: string;
  postalCode?: string;
  addressLine1?: string;
  phone?: string;
}

export interface OrderItem {
  productId: string;
  slug?: string;
  title: string;
  price: number;
  unitUsd?: number;
  quantity?: number;
  image: string;
  deviceTypes: DeviceType[];
  downloadFileName?: string;
}

export interface Order {
  id: string;
  userId?: string | null;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  billingDetails?: BillingDetails;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  total: number;
  currency?: string;
  paymentProvider?: PaymentProviderKey | string;
  paymentMethod: string;
  paymentStatus: OrderPaymentStatus;
  isTestOrder?: boolean;
  transactionId: string;
  paymentReference?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  paypalPayerId?: string;
  paypalEventId?: string;
  paypalRefundId?: string;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
  failureReason?: string;
  downloadToken: string;
  downloadCount: number;
  createdAt: string;
}

export type ContactMessageStatus = 'new' | 'in_progress' | 'replied';

export interface ContactMessage {
  id: string;
  submissionId?: string;
  userId?: string | null;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
  status: ContactMessageStatus;
  emailSent?: boolean;
  emailSentAt?: string | null;
  emailError?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
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
  isAdmin?: boolean;
  role?: 'admin' | 'customer';
  avatarUrl?: string;
  authProvider?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

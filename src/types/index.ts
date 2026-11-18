export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export type PaymentProviderKey = 'paypal' | 'google_pay' | 'gcash' | 'maya';

export type OrderPaymentStatus =
  | 'pending'
  | 'paid'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type StationeryCategorySlug =
  | 'digital-notes'
  | 'digital-journals'
  | 'calendars-schedules'
  | 'to-do-lists'
  | 'habit-mood-trackers'
  | 'digital-stickers'
  | 'budget-planners';

export type ProductCategory =
  | 'all'
  | 'phone_tablet'
  | 'desktop'
  | 'icon_pack'
  | 'bundle'
  | StationeryCategorySlug;

export type ProductType = 'wallpaper' | 'icon_pack' | 'bundle' | 'stationery';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  theme: string;
  collection: string;
  collectionId?: string;
  category?: ProductCategory | string;
  productType?: ProductType | string;
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
  downloadUrl?: string;
  isFree?: boolean;
  downloadCount?: number;
  recentDownloadTime?: string;
  // Bundle attributes
  isBundle?: boolean;
  bundleItemCount?: number;
  bundleProductIds?: string[];
  bundleSavingsPercent?: number;
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
  bannerImage?: string;
  featured: boolean;
  isNew?: boolean;
  isLimitedEdition?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  status?: 'published' | 'draft' | 'archived';
  order: number;
  productCount?: number;
  createdAt?: string;
  theme?: string;
  collectionType?: 'wallpaper' | 'stationery';
}

export interface ThemeBundle {
  id: string;
  title: string;
  slug: string;
  collectionId: string;
  collectionSlug: string;
  collectionName: string;
  description: string;
  previewImage: string;
  originalPrice: number;
  bundlePrice: number;
  savingsAmount: number;
  savingsPercent: number;
  productIds: string[];
  includedItems: string[];
  status: 'published' | 'draft';
  featured?: boolean;
  createdAt: string;
}

export interface LegalPageContent {
  title: string;
  lastUpdated: string;
  content: string;
  ownerReviewRequiredNotice?: string;
}

export type SocialPlatformKey =
  | 'pinterest'
  | 'instagram'
  | 'linktree'
  | 'kofi'
  | 'tiktok'
  | 'facebook';

export interface SocialMediaLinkConfig {
  enabled: boolean;
  url: string;
}

export type SocialMediaSettings = Record<SocialPlatformKey, SocialMediaLinkConfig>;

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
    googlePayEnabled?: boolean;
    googlePayMerchantId?: string;
    googlePayMerchantName?: string;
    gcashEnabled?: boolean;
    gcashQrImage?: string;
    gcashAccountName?: string;
    gcashAccountNumber?: string;
    gcashInstructions?: string;
    mayaEnabled?: boolean;
    mayaQrImage?: string;
    mayaAccountName?: string;
    mayaAccountNumber?: string;
    mayaInstructions?: string;
    phpExchangeRate?: number;
  };
  socialMedia?: SocialMediaSettings;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    pinterest?: string;
  };
  seo?: {
    siteUrl?: string;
    defaultTitle?: string;
    defaultDescription?: string;
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
  privacyPolicy?: LegalPageContent;
  termsOfService?: LegalPageContent;
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
  isBundle?: boolean;
  bundleProductIds?: string[];
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
  usdTotal?: number;
  currency?: string;
  paymentProvider?: PaymentProviderKey | string;
  paymentMethod: string;
  paymentStatus: OrderPaymentStatus;
  isTestOrder?: boolean;
  transactionId: string;
  paymentReference?: string;
  senderName?: string;
  paymentProofNote?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  paypalPayerId?: string;
  paypalEventId?: string;
  paypalRefundId?: string;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
  failureReason?: string;
  confirmationEmailSentAt?: string;
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

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  consent: boolean;
  status: 'subscribed' | 'unsubscribed';
  source?: string;
  unsubscribeToken: string;
  subscribedAt: string;
  unsubscribedAt?: string | null;
  createdAt?: string;
}

export interface EmailLog {
  id: string;
  emailType: 'order_confirmation_customer' | 'order_confirmation_store' | 'contact_reply' | 'contact_notification' | 'newsletter_welcome' | string;
  recipientEmail: string;
  orderId?: string | null;
  orderNumber?: string | null;
  subject: string;
  provider: string;
  providerMessageId?: string | null;
  status: 'sent' | 'failed' | 'skipped';
  errorMessage?: string | null;
  attemptedAt: string;
  deliveredAt?: string | null;
}

export interface ProductReview {
  id: string;
  productId: string;
  productTitle?: string;
  orderId?: string | null;
  userId: string;
  reviewerName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'published' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

export type FaqCategory =
  | 'Orders and Payments'
  | 'Downloads and Access'
  | 'Wallpaper Compatibility'
  | 'Licensing and Usage'
  | 'Refunds and Cancellations'
  | 'Account and Technical Support';

export interface FaqItem {
  id: string;
  category: FaqCategory | string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}


import React from 'react';

// Cute sleeping mushroom logo
export const ShroomLogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Soft Glow */}
    <ellipse cx="50" cy="50" rx="46" ry="46" fill="#FCF3E2" fillOpacity="0.8" />
    
    {/* Stem / Body */}
    <path
      d="M38 48C38 48 37 75 39 82C40 85 43 87 50 87C57 87 60 85 61 82C63 75 62 48 62 48"
      fill="#FCF3E2"
      stroke="#292929"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    
    {/* Gentle Smiling Eyes on Stem */}
    <path
      d="M44 65C45.5 67 47.5 67 49 65"
      stroke="#292929"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M52 65C53.5 67 55.5 67 57 65"
      stroke="#292929"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    
    {/* Rosy Cheeks */}
    <circle cx="42" cy="69" r="2.5" fill="#A64B3C" fillOpacity="0.5" />
    <circle cx="59" cy="69" r="2.5" fill="#A64B3C" fillOpacity="0.5" />

    {/* Mushroom Cap (Official Mushroom Red) */}
    <path
      d="M18 52C18 30 31 16 50 16C69 16 82 30 82 52C82 55 79 56 74 55C66 53 58 55 50 54C42 55 34 53 26 55C21 56 18 55 18 52Z"
      fill="#A64B3C"
      stroke="#292929"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Dots on Cap (Soft White) */}
    <circle cx="34" cy="32" r="5" fill="#FFFCF7" stroke="#292929" strokeWidth="1.5" />
    <circle cx="52" cy="27" r="6" fill="#FFFCF7" stroke="#292929" strokeWidth="1.5" />
    <circle cx="68" cy="36" r="4.5" fill="#FFFCF7" stroke="#292929" strokeWidth="1.5" />
    <circle cx="48" cy="42" r="3.5" fill="#FCF3E2" />
    <circle cx="28" cy="45" r="3" fill="#FCF3E2" />

    {/* Sparkle */}
    <path
      d="M78 19L80 23L84 25L80 27L78 31L76 27L72 25L76 23L78 19Z"
      fill="#A64B3C"
    />
  </svg>
);

// Cozy Sparkle icon
export const SparkleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-[#A64B3C]' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0L14.5 8.5L23 11L14.5 13.5L12 22L9.5 13.5L1 11L9.5 8.5L12 0Z" />
  </svg>
);

// Empty Cart Illustration
export const EmptyCartShroom: React.FC<{ className?: string }> = ({ className = 'w-44 h-44' }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <ellipse cx="100" cy="170" rx="65" ry="12" fill="#FCF3E2" fillOpacity="0.8" />
    
    {/* Cozy Teacup Basket */}
    <path
      d="M55 110C55 145 75 165 100 165C125 165 145 145 145 110H55Z"
      fill="#FFFCF7"
      stroke="#292929"
      strokeWidth="3.5"
    />
    <path
      d="M145 120C155 120 165 128 165 138C165 148 155 155 143 152"
      stroke="#292929"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    
    {/* Sleeping Mushroom inside Basket */}
    <path
      d="M85 105C85 105 85 125 87 130C88 132 94 133 100 133C106 133 112 132 113 130C115 125 115 105 115 105"
      fill="#FCF3E2"
      stroke="#292929"
      strokeWidth="3"
    />
    
    {/* Cap (Mushroom Red) */}
    <path
      d="M70 105C70 85 82 72 100 72C118 72 130 85 130 105C126 107 120 106 115 107C105 108 95 108 85 107C80 106 74 107 70 105Z"
      fill="#A64B3C"
      stroke="#292929"
      strokeWidth="3.5"
    />
    <circle cx="88" cy="88" r="3.5" fill="#FFFCF7" stroke="#292929" strokeWidth="1.5" />
    <circle cx="108" cy="84" r="4" fill="#FFFCF7" stroke="#292929" strokeWidth="1.5" />
    <circle cx="116" cy="94" r="2.5" fill="#FCF3E2" />

    {/* Sleeping Eyes */}
    <path d="M93 118C95 120 97 120 98 118" stroke="#292929" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M102 118C104 120 106 120 107 118" stroke="#292929" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Zzz */}
    <text x="135" y="75" fill="#A64B3C" fontSize="18" fontFamily="Comfortaa" fontWeight="bold">z</text>
    <text x="145" y="60" fill="#A64B3C" fontSize="14" fontFamily="Comfortaa" fontWeight="bold">z</text>
    <text x="155" y="48" fill="#A64B3C" fontSize="12" fontFamily="Comfortaa" fontWeight="bold">z</text>
  </svg>
);

// Official Vector Payment Icons (crisp SVG for retina screens)
export const PaypalIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="PayPal"
  >
    <path
      d="M7.076 21.337H3.47a.78.78 0 0 1-.772-.894L5.614 3.42a.89.89 0 0 1 .878-.753h7.242c2.41 0 4.148.563 5.166 1.674.965 1.054 1.258 2.585.871 4.55-.776 3.938-3.414 5.942-7.842 5.942H9.012a.89.89 0 0 0-.877.754l-1.06 5.75z"
      fill="#003087"
    />
    <path
      d="M19.77 8.89c-.776 3.938-3.414 5.942-7.842 5.942H9.012a.89.89 0 0 0-.877.754l-1.06 5.75-.246 1.334a.78.78 0 0 0 .77.893h3.606a.89.89 0 0 0 .878-.753l.72-3.896.046-.245a.89.89 0 0 1 .878-.754h.55c3.87 0 6.896-1.572 7.781-6.071.37-1.88.163-3.447-.692-4.509a5.21 5.21 0 0 0-.67-.64z"
      fill="#0079C1"
    />
    <path
      d="M18.893 8.358c-.23-.058-.475-.1-.734-.127-.27-.027-.562-.04-.875-.04H10.96a.89.89 0 0 0-.878.754l-1.39 7.513-.393 2.128a.78.78 0 0 0 .77.893h3.197a.89.89 0 0 0 .878-.753l.72-3.896.046-.245a.89.89 0 0 1 .878-.754h.55c3.87 0 6.896-1.572 7.781-6.071.18-.912.185-1.745.024-2.474-.473 1.385-1.927 2.476-3.67 2.872z"
      fill="#00457C"
    />
  </svg>
);

export const VisaIcon: React.FC<{ className?: string; width?: number; height?: number }> = ({
  className = '',
  width = 32,
  height = 20,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 36 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="Visa"
  >
    <rect width="36" height="24" rx="4" fill="#FFFFFF" />
    <path
      d="M14.65 16.32h-2.14l1.34-8.25h2.14l-1.34 8.25zm8.1-8.08a5.2 5.2 0 0 0-1.87-.34c-2.06 0-3.51 1.07-3.52 2.6-.02 1.13 1.04 1.76 1.83 2.14.81.39 1.08.64 1.08.99 0 .54-.66.78-1.28.78-.85 0-1.31-.13-2-.43l-.28-.13-.3 1.82c.5.23 1.43.43 2.39.44 2.19 0 3.61-1.06 3.63-2.69.01-.9-.55-1.58-1.75-2.14-.73-.37-1.18-.62-1.18-.99 0-.34.39-.7 1.23-.7.7 0 1.22.15 1.62.32l.2.1.33-1.76zm4.84 5.34l.86-2.31c-.01.02.18-.48.29-.8l.15.72.5 2.39h-1.8zm2.74-5.51h-1.66c-.52 0-.9.15-1.13.7l-3.21 7.55h2.25l.45-1.23h2.75l.26 1.23h1.98l-1.69-8.25zm-17.72 0l-2.09 5.63-.23-1.12c-.39-1.32-1.6-2.75-2.96-3.46l1.92 7.2h2.26l3.36-8.25h-2.26z"
      fill="#1A1F71"
    />
    <path
      d="M6.55 8.07H3.1l-.04.19c2.65.66 4.4 2.27 5.13 4.2l-.74-3.69c-.13-.52-.51-.68-.9-.7z"
      fill="#F7B600"
    />
  </svg>
);

export const MastercardIcon: React.FC<{ className?: string; width?: number; height?: number }> = ({
  className = '',
  width = 32,
  height = 20,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 36 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="Mastercard"
  >
    <rect width="36" height="24" rx="4" fill="#FFFFFF" />
    <circle cx="14" cy="12" r="7" fill="#EB001B" />
    <circle cx="22" cy="12" r="7" fill="#F79E1B" fillOpacity="0.88" />
  </svg>
);

export const AmexIcon: React.FC<{ className?: string; width?: number; height?: number }> = ({
  className = '',
  width = 32,
  height = 20,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 36 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="American Express"
  >
    <rect width="36" height="24" rx="4" fill="#016FD0" />
    <path
      d="M8.2 16.5l2.1-4.8 2.1 4.8h2.3l-3.3-7.2h-2.2L6 16.5h2.2zm1.6-3.7l.6 1.5h-1.2l.6-1.5zm11.7 3.7v-7.2h-4.8v7.2h2v-2.3h1v2.3h1.8zm-2.8-3.9v-1.6h1v1.6h-1zm10.3 3.9v-1.7h-3.4v-1.2h3.2v-1.5h-3.2v-1.1h3.4v-1.7h-5.4v7.2h5.4zm-14.7 0l2-3.6-1.9-3.6h-2.1l2.8 4.6-2.9 2.6h2.1z"
      fill="#FFFFFF"
    />
  </svg>
);

export const ShieldLockIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-[#A64B3C]',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// Payment Badges
export const PaymentBadges: React.FC<{ className?: string; showAllCards?: boolean }> = ({
  className = '',
  showAllCards = true,
}) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
    <div
      title="PayPal Verified"
      className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-[#EADCC8] shadow-2xs hover:border-[#A64B3C]/50 transition-colors"
    >
      <PaypalIcon size={14} />
      <span className="text-[11px] font-bold text-[#003087]">PayPal</span>
    </div>

    {showAllCards && (
      <>
        <div
          title="Visa"
          className="inline-flex items-center px-1.5 py-0.5 bg-white rounded-lg border border-[#EADCC8] shadow-2xs"
        >
          <VisaIcon width={28} height={18} />
        </div>
        <div
          title="Mastercard"
          className="inline-flex items-center px-1.5 py-0.5 bg-white rounded-lg border border-[#EADCC8] shadow-2xs"
        >
          <MastercardIcon width={28} height={18} />
        </div>
        <div
          title="American Express"
          className="inline-flex items-center px-1.5 py-0.5 bg-white rounded-lg border border-[#EADCC8] shadow-2xs"
        >
          <AmexIcon width={28} height={18} />
        </div>
      </>
    )}
  </div>
);


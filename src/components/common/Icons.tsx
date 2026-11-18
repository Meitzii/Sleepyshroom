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

import type { WebsiteSettings } from '../../types/index.ts';

export const GooglePayIcon: React.FC<{ className?: string; width?: number; height?: number }> = ({
  className = '',
  width = 36,
  height = 20,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 48 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="Google Pay"
  >
    <path
      d="M21.48 11.77v4.06h-1.29V5.8h3.41c.85 0 1.61.28 2.21.84.61.55.92 1.24.92 2.09s-.31 1.56-.92 2.1c-.6.55-1.36.82-2.21.82h-2.12v.12zm0-4.74v3.49h2.15c.5 0 .93-.17 1.27-.52.35-.35.52-.76.52-1.23 0-.46-.17-.87-.52-1.21a1.73 1.73 0 0 0-1.27-.53h-2.15zM29.41 8.81c.95 0 1.7.25 2.25.76.55.51.83 1.21.83 2.1v4.16h-1.23v-.94h-.06c-.53.78-1.24 1.17-2.13 1.17-.75 0-1.38-.22-1.88-.67-.51-.44-.76-1-.76-1.67 0-.7.26-1.26.79-1.68.53-.42 1.24-.63 2.12-.63.76 0 1.38.14 1.87.42v-.29c0-.44-.17-.81-.53-1.12a1.88 1.88 0 0 0-1.25-.45c-.71 0-1.28.3-1.69.9l-1.14-.71c.62-.9 1.54-1.35 2.81-1.35zm-1.66 4.94c0 .33.14.61.42.83.28.22.61.33.99.33.54 0 1.02-.2 1.44-.6.42-.4.63-.87.63-1.4-.4-.32-.96-.47-1.68-.47-.52 0-.96.13-1.3.38-.33.24-.5.55-.5.93zM39.96 9.03l-4.29 9.86h-1.33l1.59-3.45-2.82-6.41h1.4l2.04 4.92h.03l1.99-4.92h1.39z"
      fill="#3C4043"
    />
    <path
      d="M15.48 11.49c0-.4-.03-.8-.1-1.18H10.1v2.24h3.02c-.13.7-.53 1.3-1.13 1.7v1.42h1.83c1.07-.98 1.66-2.43 1.66-4.18z"
      fill="#4285F4"
    />
    <path
      d="M10.1 17c1.51 0 2.79-.5 3.72-1.36l-1.83-1.42c-.5.34-1.15.54-1.89.54-1.45 0-2.69-.98-3.13-2.3H5.08v1.46A5.62 5.62 0 0 0 10.1 17z"
      fill="#34A853"
    />
    <path
      d="M6.97 12.46a3.38 3.38 0 0 1 0-2.16V8.84H5.08a5.64 5.64 0 0 0 0 5.08l1.89-1.46z"
      fill="#FBBC04"
    />
    <path
      d="M10.1 8c.82 0 1.56.28 2.14.84l1.61-1.61A5.42 5.42 0 0 0 10.1 5.76c-2.2 0-4.1 1.26-5.02 3.08l1.89 1.46c.44-1.32 1.68-2.3 3.13-2.3z"
      fill="#EA4335"
    />
  </svg>
);

export const GcashIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="GCash"
  >
    <rect width="24" height="24" rx="6" fill="#007DFE" />
    <path
      d="M12.2 6.2a5.8 5.8 0 1 0 5.5 7.5h-4.9v-2.1h7.2v1.2A7.8 7.8 0 1 1 12.2 4.2c2.1 0 4 .8 5.4 2.1l-1.6 1.5a3.7 3.7 0 0 0-3.8-1.6z"
      fill="#FFFFFF"
    />
  </svg>
);

export const MayaIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="Maya"
  >
    <rect width="24" height="24" rx="6" fill="#0F172A" />
    <path
      d="M5.2 16.5V7.5h2.5l4.3 5.2 4.3-5.2h2.5v9h-2.3v-5.3l-3.7 4.4h-1.6l-3.7-4.4v5.3H5.2z"
      fill="#2FF38A"
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
export const PaymentBadges: React.FC<{
  className?: string;
  showAllCards?: boolean;
  providers?: WebsiteSettings['paymentProviders'];
}> = ({ className = '', showAllCards = true, providers }) => {
  const paypalEnabled = providers ? providers.paypalEnabled !== false : true;
  const allowCards = providers ? providers.paypalAllowCards !== false && showAllCards : showAllCards;
  // Google Pay via PayPal is unsupported for Philippines merchant accounts
  const googlePayEnabled = false;
  const gcashEnabled = providers ? providers.gcashEnabled !== false : true;
  const mayaEnabled = providers ? providers.mayaEnabled !== false : true;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {paypalEnabled && (
        <div
          title="PayPal Verified"
          className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs hover:border-[#A64B3C]/50 transition-colors"
        >
          <PaypalIcon size={13} />
          <span className="text-[11px] font-bold text-[#003087]">PayPal</span>
        </div>
      )}

      {paypalEnabled && allowCards && (
        <>
          <div
            title="Visa"
            className="inline-flex items-center px-1.5 py-0.5 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs"
          >
            <VisaIcon width={26} height={17} />
          </div>
          <div
            title="Mastercard"
            className="inline-flex items-center px-1.5 py-0.5 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs"
          >
            <MastercardIcon width={26} height={17} />
          </div>
          <div
            title="American Express"
            className="inline-flex items-center px-1.5 py-0.5 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs"
          >
            <AmexIcon width={26} height={17} />
          </div>
        </>
      )}

      {googlePayEnabled && (
        <div
          title="Google Pay"
          className="inline-flex items-center px-1.5 py-0.5 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs hover:border-[#A64B3C]/50 transition-colors"
        >
          <GooglePayIcon width={36} height={17} />
        </div>
      )}

      {gcashEnabled && (
        <div
          title="GCash QR (Philippines)"
          className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs hover:border-[#007DFE]/50 transition-colors"
        >
          <GcashIcon size={13} />
          <span className="text-[11px] font-bold text-[#0057C2]">GCash</span>
        </div>
      )}

      {mayaEnabled && (
        <div
          title="Maya QR (Philippines)"
          className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFFCF7] rounded-lg border border-[#EADCC8] shadow-2xs hover:border-[#0F172A]/40 transition-colors"
        >
          <MayaIcon size={13} />
          <span className="text-[11px] font-bold text-[#0F172A]">Maya</span>
        </div>
      )}
    </div>
  );
};

export const PinterestIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M12.017 2C6.486 2 2 6.486 2 12.017c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.176-4.068-2.845 0-4.516 2.135-4.516 4.34 0 .859.331 1.781.745 2.281a.3.3 0 0 1 .069.288l-.278 1.133c-.044.183-.145.223-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.525-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.531 0 10.017-4.486 10.017-10.017C22.034 6.486 17.548 2 12.017 2z" />
  </svg>
);

export const InstagramIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
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
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const TikTokIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .593.048.875.14V9.4a6.33 6.33 0 0 0-.875-.06A6.34 6.34 0 0 0 3.14 15.68 6.34 6.34 0 0 0 9.48 22a6.34 6.34 0 0 0 6.34-6.33V8.73a8.16 8.16 0 0 0 4.77 1.52V6.79c-.34 0-.67-.04-1-.1z" />
  </svg>
);

export const FacebookIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M22 12.061C22 6.505 17.523 2 12 2S2 6.505 2 12.061c0 5.022 3.657 9.184 8.438 9.939v-7.03H7.898v-2.909h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.775-1.63 1.57v1.888h2.773l-.443 2.908h-2.33V22c4.78-.755 8.437-4.917 8.437-9.939z" />
  </svg>
);

export const LinktreeIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="m13.736 5.853 4.005-4.117 2.325 2.38-4.2 4.005h5.908v3.305h-5.937l4.229 4.108-2.325 2.334-5.741-5.769-5.741 5.769-2.325-2.325 4.229-4.108H2.226V8.121h5.909l-4.2-4.004 2.324-2.381 4.005 4.117V0h3.472zm-3.472 10.306h3.472V24h-3.472z" />
  </svg>
);

export const KofiIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 18,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
  </svg>
);

export const SocialPlatformIcon: React.FC<{
  platform: 'pinterest' | 'instagram' | 'linktree' | 'kofi' | 'tiktok' | 'facebook';
  className?: string;
  size?: number;
}> = ({ platform, className = '', size = 18 }) => {
  switch (platform) {
    case 'pinterest':
      return <PinterestIcon size={size} className={className} />;
    case 'instagram':
      return <InstagramIcon size={size} className={className} />;
    case 'linktree':
      return <LinktreeIcon size={size} className={className} />;
    case 'kofi':
      return <KofiIcon size={size} className={className} />;
    case 'tiktok':
      return <TikTokIcon size={size} className={className} />;
    case 'facebook':
      return <FacebookIcon size={size} className={className} />;
  }
};



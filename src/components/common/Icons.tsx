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

// Payment Badges
export const PaymentBadges: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#292929] bg-[#FCF3E2] rounded-md border border-[#EADCC8]">
      PayPal
    </span>
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#292929] bg-[#FCF3E2] rounded-md border border-[#EADCC8]">
      Visa
    </span>
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#292929] bg-[#FCF3E2] rounded-md border border-[#EADCC8]">
      Mastercard
    </span>
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#292929] bg-[#FCF3E2] rounded-md border border-[#EADCC8]">
      Debit &amp; Credit Cards
    </span>
  </div>
);

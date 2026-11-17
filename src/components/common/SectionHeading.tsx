import React from 'react';

interface SectionHeadingProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  headingClassName?: string;
  subtitleClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<SectionHeadingProps['size']>, string> = {
  sm: 'text-2xl sm:text-[28px]',
  md: 'text-2xl sm:text-3xl lg:text-[38px]',
  lg: 'text-3xl sm:text-4xl lg:text-[44px]',
  xl: 'text-3xl sm:text-4xl lg:text-[48px]',
};

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  as: Tag = 'h2',
  subtitle,
  size = 'md',
  className = '',
  headingClassName = '',
  subtitleClassName = '',
}) => {
  return (
    <div className={`text-center mx-auto py-1 ${className}`}>
      <Tag
        className={`font-section-serif font-normal tracking-[0.015em] leading-[1.2] text-[#292929] inline-flex items-center justify-center gap-3 sm:gap-4 max-w-full ${SIZE_CLASSES[size]} ${headingClassName}`}
      >
        <span
          aria-hidden="true"
          className="text-[0.54em] text-[#A64B3C] select-none shrink-0 leading-none"
        >
          ✦
        </span>
        <span className="text-balance">{children}</span>
        <span
          aria-hidden="true"
          className="text-[0.54em] text-[#A64B3C] select-none shrink-0 leading-none"
        >
          ✦
        </span>
      </Tag>
      {subtitle && (
        <p
          className={`mt-2.5 text-sm sm:text-base text-[#777777] font-medium max-w-2xl mx-auto leading-relaxed ${subtitleClassName}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

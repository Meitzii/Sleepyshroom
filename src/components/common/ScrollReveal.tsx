import React, { ReactNode } from 'react';
import { useScrollReveal, ScrollRevealOptions } from '../../hooks/useScrollReveal.ts';

export interface ScrollRevealProps extends ScrollRevealOptions {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  durationMs?: number;
  delayMs?: number;
}

/**
 * ScrollReveal
 * 
 * Intersection-Observer based wrapper component that triggers a gentle, cottagecore-inspired
 * fade and glide animation as the section scrolls into the viewport.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  as: Component = 'div',
  direction = 'up',
  distance = 24,
  durationMs = 700,
  delayMs = 0,
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  disabled = false,
  initialVisible = false,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
    threshold,
    rootMargin,
    triggerOnce,
    disabled,
    initialVisible,
  });

  const getTransform = () => {
    if (isVisible) return 'none';
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`;
      case 'none':
      default:
        return 'none';
    }
  };

  const style: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: getTransform(),
    transitionProperty: 'opacity, transform',
    transitionDuration: `${durationMs}ms`,
    transitionDelay: `${delayMs}ms`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <Component
      ref={ref}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
};

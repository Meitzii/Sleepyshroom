import { useEffect, useRef, useState } from 'react';

export interface ScrollRevealOptions {
  /**
   * Percentage of the target's visibility needed before triggering (0.0 to 1.0).
   * Default: 0.12 (12% of section in viewport)
   */
  threshold?: number;
  /**
   * Margin around the root. Positive values expand, negative values contract.
   * Default: '0px 0px -50px 0px' (triggers slightly before bottom of viewport)
   */
  rootMargin?: string;
  /**
   * If true, unobserve once the element enters viewport (animation plays once).
   * Default: true
   */
  triggerOnce?: boolean;
  /**
   * If true, skips observation and reveals immediately (e.g. for accessibility).
   * Default: false
   */
  disabled?: boolean;
  /**
   * Initial visibility state. Set to true for above-the-fold content (e.g. HeroSection)
   * to eliminate any first-paint flicker.
   * Default: false
   */
  initialVisible?: boolean;
}

/**
 * useScrollReveal
 * 
 * IntersectionObserver hook designed for smooth section & component scroll reveals.
 * Features:
 * - Auto-detects IntersectionObserver support with graceful fallback
 * - Automatically respects user's `prefers-reduced-motion` accessibility preference
 * - Configurable rootMargin and threshold
 * - One-time reveal to prevent distracting re-animation during scroll up
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.12,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  disabled = false,
  initialVisible = false,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(initialVisible);

  useEffect(() => {
    // If disabled, reveal immediately
    if (disabled) {
      setIsVisible(true);
      return;
    }

    // SSR or browsers without IntersectionObserver support
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    // Accessibility: Respect prefers-reduced-motion
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setIsVisible(true);
        return;
      }
    } catch {
      // Ignore mediaQuery errors in unsupported environments
    }

    const node = ref.current;
    if (!node) return;

    // Check if element is already within the viewport on initial mount
    const rect = node.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top <= windowHeight * 0.95 && rect.bottom >= 0) {
      setIsVisible(true);
      if (triggerOnce) {
        return;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, disabled]);

  return { ref, isVisible };
}

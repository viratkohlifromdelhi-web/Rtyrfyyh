import { useEffect, useState, type RefObject } from 'react';

interface UseInViewAnimationOptions {
  /** Additional gate (e.g. siteRevealed); when false, animations pause immediately */
  enabled?: boolean;
  /** Optional margin around viewport to resume smoothly right before entering */
  rootMargin?: string;
  /** Minimum intersection ratio */
  threshold?: number;
}

/**
 * Reusable viewport + page-visibility animation gate.
 * Automatically pauses continuous ambient CSS/SVG animations whenever a section
 * scrolls offscreen OR when `document.hidden === true`, saving mobile GPU/CPU battery.
 */
export function useInViewAnimation(
  ref: RefObject<Element | null>,
  options: UseInViewAnimationOptions = {},
): boolean {
  const { enabled = true, rootMargin = '80px 0px', threshold = 0.01 } = options;

  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setTabVisible(!document.hidden);
    };
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        setInView(visible);
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [ref, rootMargin, threshold]);

  return enabled && inView && tabVisible;
}

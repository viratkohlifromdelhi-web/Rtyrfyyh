/**
 * Silky Custom Eased Smooth-Scrolling Engine (Mobile & In-App Browser Safe).
 *
 * Uses requestAnimationFrame with a luxury easeInOutQuart curve, dynamic sticky
 * header clearance, and instant cancellation on user touchstart or wheel input
 * so the page never fights the user's thumb.
 */

export const DEFAULT_HEADER_OFFSET_PX = 80;
export const HEADER_EXTRA_GAP_PX = 16;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Luxury smooth S-curve acceleration & gentle deceleration.
 */
export function easeInOutQuart(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

/**
 * Fast-entry, long velvety deceleration curve.
 */
export function easeOutQuint(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 5);
}

/**
 * Computes the clamped scroll destination Y coordinate, clearing the fixed top navbar.
 */
export function computeScrollDestinationY(params: {
  elementTopInDoc: number;
  headerHeight: number;
  extraGap?: number;
  maxScrollY: number;
}): number {
  const gap = params.extraGap ?? HEADER_EXTRA_GAP_PX;
  const headerOffset =
    params.headerHeight > 0 ? params.headerHeight + gap : DEFAULT_HEADER_OFFSET_PX;
  const rawTarget = params.elementTopInDoc - headerOffset;
  const safeMax = Math.max(0, params.maxScrollY);
  return Math.round(Math.min(safeMax, Math.max(0, rawTarget)));
}

/**
 * Computes the interpolated scroll position at a given elapsed time.
 */
export function interpolateScrollY(
  startY: number,
  targetY: number,
  elapsedMs: number,
  durationMs: number,
): { y: number; done: boolean } {
  if (durationMs <= 0 || elapsedMs >= durationMs) {
    return { y: targetY, done: true };
  }
  const progress = clamp01(elapsedMs / durationMs);
  const eased = easeInOutQuart(progress);
  return {
    y: startY + (targetY - startY) * eased,
    done: progress >= 1,
  };
}

let cancelActiveScroll: (() => void) | null = null;

/**
 * Smoothly scrolls the window to `element` over `durationMs` using rAF + easeInOutQuart.
 * Dynamically offsets for the sticky `<header>` and immediately cancels on manual
 * `touchstart` or `wheel` input. Returns a cancel function.
 */
export function smoothScrollToTarget(
  element: HTMLElement | null,
  durationMs = 850,
): () => void {
  if (cancelActiveScroll) {
    cancelActiveScroll();
    cancelActiveScroll = null;
  }

  if (!element || typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const headerEl = document.querySelector('header');
  const headerHeight = headerEl instanceof HTMLElement ? headerEl.offsetHeight : 0;

  const startY = window.scrollY || window.pageYOffset || 0;
  const rect = element.getBoundingClientRect();
  const elementTopInDoc = rect.top + startY;
  const docHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  const maxScrollY = Math.max(0, docHeight - window.innerHeight);

  const targetY = computeScrollDestinationY({
    elementTopInDoc,
    headerHeight,
    extraGap: HEADER_EXTRA_GAP_PX,
    maxScrollY,
  });

  if (Math.abs(targetY - startY) < 2) {
    return () => {};
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setScrollYImmediate = (y: number) => {
    try {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, y);
    }
  };

  if (prefersReducedMotion || durationMs <= 0) {
    setScrollYImmediate(targetY);
    return () => {};
  }

  let rafId: number | null = null;
  let cancelled = false;
  let startTime: number | null = null;

  const cleanup = () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('touchstart', handleInterrupt);
    window.removeEventListener('wheel', handleInterrupt);
    if (cancelActiveScroll === cancel) {
      cancelActiveScroll = null;
    }
  };

  const handleInterrupt = () => {
    cancelled = true;
    cleanup();
  };

  const cancel = () => {
    cancelled = true;
    cleanup();
  };

  cancelActiveScroll = cancel;

  window.addEventListener('touchstart', handleInterrupt, { passive: true, once: true });
  window.addEventListener('wheel', handleInterrupt, { passive: true, once: true });

  const step = (now: number) => {
    if (cancelled) return;
    if (startTime === null) {
      startTime = now;
    }
    const elapsedMs = now - startTime;
    const { y, done } = interpolateScrollY(startY, targetY, elapsedMs, durationMs);
    setScrollYImmediate(y);

    if (done) {
      cleanup();
      return;
    }

    rafId = window.requestAnimationFrame(step);
  };

  rafId = window.requestAnimationFrame(step);
  return cancel;
}

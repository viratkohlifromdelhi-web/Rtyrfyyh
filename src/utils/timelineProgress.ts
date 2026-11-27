/**
 * Pure scroll-linked timeline progress math for the Backstory section's
 * self-drawing vertical luminous beam (0 at entry -> 1 when Chapter 3 is in view).
 */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Computes normalized [0, 1] fill progress for the vertical timeline rail
 * given the rail list's bounding rect top/height and current viewport height.
 *
 * - Returns 0 while the top of the rail is at or below 78% of the viewport height.
 * - Reaches 1 once the bottom of the rail scrolls up to 68% of the viewport height
 *   (Chapter 3 comfortably in view).
 */
export function computeTimelineRailProgress(
  railTop: number,
  railHeight: number,
  viewportHeight: number,
): number {
  const safeHeight = Math.max(railHeight, 1);
  const safeViewport = Math.max(viewportHeight, 1);
  const startTop = safeViewport * 0.78;
  const endTop = safeViewport * 0.68 - safeHeight;
  const span = startTop - endTop;
  if (span <= 0) return 1;
  return clamp01((startTop - railTop) / span);
}

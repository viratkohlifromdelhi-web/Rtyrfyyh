/**
 * Pure 60fps GPU-composited choreography evaluator for the Closing Sign-Off
 * Footer best-friend characters (tall slender Boy `adinomide` + petite 5'2"
 * Girl `Anamika`).
 *
 * ViewBox coordinate system: 0 0 260 198 (unified ground baseline y = 186).
 * Boy total height: 166u (y = 20..186). Girl total height: 140u (y = 46..186)
 * -> ~15.7% height contrast so she reads naturally as petite 5'2" beside him.
 */

export type ChibiStage = 'ready' | 'step-in' | 'wave-greet' | 'settle' | 'resting';

export const CHIBI_TIMING = {
  stepInStartMs: 0,
  stepInEndMs: 460,
  greetStartMs: 460,
  greetEndMs: 1300,
  settleStartMs: 1300,
  settleEndMs: 1620,
  totalDurationMs: 1620,
} as const;

export const CHIBI_GEOMETRY = {
  viewBoxWidth: 260,
  viewBoxHeight: 198,
  groundY: 186,
  boyBaseX: 92,
  girlBaseX: 166,
  boyHeightPx: 166,
  girlHeightPx: 140,
} as const;

export interface ChibiPose {
  stage: ChibiStage;
  isIdleBreathing: boolean;

  // Horizontal & vertical character shifts (GPU translate3d)
  boyShiftX: number;
  boyBounceY: number;
  girlShiftX: number;
  girlBounceY: number;

  // Ground shadow horizontal scale & opacity synced with gentle bounce
  shadowScaleX: number;
  shadowOpacity: number;

  // Girl's slender layered back-hair gentle follow-through sway (deg)
  girlBackHairDeg: number;

  // Head tilts / friendly chuckle-nod anchored at each neck base (deg)
  boyHeadDeg: number;
  girlHeadDeg: number;

  // Facial eye crossfade (0..1) for Boy warm chuckle & Girl joyful happy blink
  boyOpenEyesOpacity: number;
  boyHappyEyesOpacity: number;
  girlOpenEyesOpacity: number;
  girlHappyEyesOpacity: number;

  // Outer waving arm rotations around each shoulder/elbow pivot (deg)
  // Boy outer left arm wave (0deg = relaxed cool wave, negative = lively outward swing)
  boyWaveArmDeg: number;
  // Girl outer right arm joyful petite wave (0deg = poised wave, positive/negative = cheerful wag)
  girlWaveArmDeg: number;

  // Girl inner arm subtle poise sway (deg)
  girlInnerArmDeg: number;

  // Tiny champagne-gold & rose sparkle popping near Girl's waving hand
  girlHandSparkleOpacity: number;
  girlHandSparkleScale: number;

  // Floating platonic pastel star & sparkle accents gently drifting above them
  ambientSparklesProgress01: number;
  ambientSparklesOpacity: number;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth cubic-bezier(0.22, 1, 0.36, 1) ease-out approximation for silky pastel motion.
 */
export function easeOutCubicExpo(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3.2);
}

/**
 * Smooth S-curve ease-in-out for weightless glides and settles.
 */
export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

/**
 * Soft bell-curve pulse (0 -> 1 -> 0) over [0, 1].
 */
function smoothBell(t: number): number {
  const x = clamp01(t);
  return Math.sin(x * Math.PI);
}

/**
 * Calm, warm side-by-side resting pose (Stage 4 & prefers-reduced-motion).
 */
export function getRestingPose(enableIdleBreathing = true): ChibiPose {
  return {
    stage: 'resting',
    isIdleBreathing: enableIdleBreathing,
    boyShiftX: 0,
    boyBounceY: 0,
    girlShiftX: 0,
    girlBounceY: 0,
    shadowScaleX: 1,
    shadowOpacity: 1,
    girlBackHairDeg: 0,
    boyHeadDeg: 1.5,
    girlHeadDeg: -1.5,
    boyOpenEyesOpacity: 1,
    boyHappyEyesOpacity: 0,
    girlOpenEyesOpacity: 1,
    girlHappyEyesOpacity: 0,
    boyWaveArmDeg: 0,
    girlWaveArmDeg: 0,
    girlInnerArmDeg: 0,
    girlHandSparkleOpacity: 0,
    girlHandSparkleScale: 0.6,
    ambientSparklesProgress01: 0,
    ambientSparklesOpacity: 0,
  };
}

/**
 * Evaluates the exact 60fps GPU character rig pose at `elapsedMs` from start.
 */
export function computeFooterChibiPose(
  elapsedMs: number,
  reducedMotion = false,
): ChibiPose {
  if (reducedMotion) {
    return getRestingPose(false);
  }

  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  // Stage 4: Calm Idle Resting Pose (1.62s onward)
  if (t >= CHIBI_TIMING.totalDurationMs) {
    return getRestingPose(true);
  }

  // Stage 1: Lively Entrance Step & Soft Bounce (0.00s -> 0.46s)
  if (t < CHIBI_TIMING.stepInEndMs) {
    const p = clamp01(t / CHIBI_TIMING.stepInEndMs);
    const move = easeOutCubicExpo(p);
    const boyShiftX = lerp(-10, 0, move);
    const girlShiftX = lerp(10, 0, move);
    // Joyful spring hop (-7.2px / -8.2px peak -> 0px settle)
    const boyBounceY = -7.2 * Math.sin(p * Math.PI);
    const girlBounceY = -8.2 * Math.sin(Math.min(1, p * 1.06) * Math.PI);
    const shadowScaleX = 0.90 + 0.10 * move - 0.05 * Math.sin(p * Math.PI);
    const girlBackHairDeg = 3.4 * Math.sin(p * Math.PI * 1.75) * (1 - p * 0.4);

    return {
      stage: p < 0.03 ? 'ready' : 'step-in',
      isIdleBreathing: false,
      boyShiftX,
      boyBounceY,
      girlShiftX,
      girlBounceY,
      shadowScaleX,
      shadowOpacity: 0.72 + 0.28 * move,
      girlBackHairDeg,
      boyHeadDeg: lerp(-2.2, 1.2, move),
      girlHeadDeg: lerp(2.8, -3.0, move),
      boyOpenEyesOpacity: 1,
      boyHappyEyesOpacity: 0,
      girlOpenEyesOpacity: 1,
      girlHappyEyesOpacity: 0,
      boyWaveArmDeg: lerp(16, -5, move),
      girlWaveArmDeg: lerp(-18, 7, move),
      girlInnerArmDeg: lerp(-3.5, 1.8, move),
      girlHandSparkleOpacity: 0,
      girlHandSparkleScale: 0.55,
      ambientSparklesProgress01: 0,
      ambientSparklesOpacity: 0,
    };
  }

  // Stage 2: Joyful Friendly Wave, Warm Chuckle-Nod & Sparkle Pop (0.46s -> 1.30s)
  if (t < CHIBI_TIMING.greetEndMs) {
    const localMs = t - CHIBI_TIMING.greetStartMs; // 0..840ms
    const p = clamp01(localMs / (CHIBI_TIMING.greetEndMs - CHIBI_TIMING.greetStartMs));

    // Girl: 2.5 joyful petite waves (±14deg) + happy eye-blink around p = 0.26..0.64
    const girlWaveArmDeg = Math.sin(p * Math.PI * 5) * 14 * (1 - p * 0.15);
    const girlHeadDeg = -2.5 - Math.sin(p * Math.PI * 2) * 3.8;
    const girlBounceY = -2.4 * Math.abs(Math.sin(p * Math.PI * 2));
    const girlBackHairDeg = Math.sin(p * Math.PI * 2.5) * 2.4;

    const girlBlinkT = clamp01((p - 0.26) / 0.36);
    const girlHappyEyes = p >= 0.26 && p <= 0.62 ? smoothBell(girlBlinkT) : 0;

    // Boy: warm chuckle-nod (+5.4deg nod) + cool casual outer wave (±12deg) + brief chuckle smile crinkle
    const boyHeadDeg = 1.0 + Math.sin(p * Math.PI * 3) * 5.2 * (1 - p * 0.2);
    const boyWaveArmDeg = -4 + Math.sin(p * Math.PI * 3.5) * 12 * (1 - p * 0.18);
    const boyBounceY = -1.8 * Math.abs(Math.sin(p * Math.PI * 2));

    const boyChuckleT = clamp01((p - 0.2) / 0.4);
    const boyHappyEyes = p >= 0.2 && p <= 0.6 ? smoothBell(boyChuckleT) : 0;

    // Tiny sparkle popping right beside Girl's waving hand (p = 0.10..0.90)
    let girlHandSparkleOpacity = 0;
    let girlHandSparkleScale = 0.55;
    if (p >= 0.1 && p <= 0.9) {
      const sp = clamp01((p - 0.1) / 0.8);
      girlHandSparkleOpacity =
        sp < 0.25 ? sp / 0.25 : sp > 0.7 ? (1 - sp) / 0.3 : 1;
      girlHandSparkleScale = 0.68 + 0.52 * Math.sin(sp * Math.PI);
    }

    // Subtle floating pastel stars/sparkles rising above them (p = 0.18..1.0)
    const ambientProgress = clamp01((p - 0.16) / 0.84);
    const ambientOpacity =
      p < 0.16
        ? 0
        : ambientProgress < 0.25
          ? ambientProgress / 0.25
          : ambientProgress > 0.78
            ? (1 - ambientProgress) / 0.22
            : 1;

    return {
      stage: 'wave-greet',
      isIdleBreathing: false,
      boyShiftX: 0,
      boyBounceY,
      girlShiftX: 0,
      girlBounceY,
      shadowScaleX: 1 - 0.015 * Math.abs(Math.sin(p * Math.PI * 2)),
      shadowOpacity: 1,
      girlBackHairDeg,
      boyHeadDeg,
      girlHeadDeg,
      boyOpenEyesOpacity: 1 - boyHappyEyes,
      boyHappyEyesOpacity: boyHappyEyes,
      girlOpenEyesOpacity: 1 - girlHappyEyes,
      girlHappyEyesOpacity: girlHappyEyes,
      boyWaveArmDeg,
      girlWaveArmDeg,
      girlInnerArmDeg: Math.sin(p * Math.PI * 2) * 2.2,
      girlHandSparkleOpacity: clamp01(girlHandSparkleOpacity),
      girlHandSparkleScale,
      ambientSparklesProgress01: ambientProgress * 0.78,
      ambientSparklesOpacity: clamp01(ambientOpacity),
    };
  }

  // Stage 3: Smooth Settle into Warm Resting Stance (1.30s -> 1.62s)
  const settleP = clamp01(
    (t - CHIBI_TIMING.settleStartMs) /
      (CHIBI_TIMING.settleEndMs - CHIBI_TIMING.settleStartMs),
  );
  const ease = easeInOutSine(settleP);
  const trailingAmbient = clamp01(1 - settleP * 1.4);

  return {
    stage: 'settle',
    isIdleBreathing: false,
    boyShiftX: 0,
    boyBounceY: 0,
    girlShiftX: 0,
    girlBounceY: 0,
    shadowScaleX: 1,
    shadowOpacity: 1,
    girlBackHairDeg: lerp(0.8, 0, ease),
    boyHeadDeg: lerp(2.2, 1.5, ease),
    girlHeadDeg: lerp(-2.5, -1.5, ease),
    boyOpenEyesOpacity: 1,
    boyHappyEyesOpacity: 0,
    girlOpenEyesOpacity: 1,
    girlHappyEyesOpacity: 0,
    boyWaveArmDeg: lerp(-3, 0, ease),
    girlWaveArmDeg: lerp(4, 0, ease),
    girlInnerArmDeg: lerp(1.0, 0, ease),
    girlHandSparkleOpacity: 0,
    girlHandSparkleScale: 0.6,
    ambientSparklesProgress01: lerp(0.78, 1, ease),
    ambientSparklesOpacity: trailingAmbient * 0.75,
  };
}

export const FOOTER_INTERSECTION_THRESHOLD = 0.45;
export const FOOTER_INTERSECTION_ROOT_MARGIN = '0px 0px -40px 0px';
export const FOOTER_BOTTOM_PROXIMITY_PX = 140;

/**
 * Scroll travel direction relative to page progression:
 * - 'up': user is swiping up / scrolling DOWN the page toward the footer (scrollY increasing)
 * - 'down': user is swiping down / scrolling BACK UP toward Chicken Farm (scrollY decreasing)
 * - 'idle': initial state before meaningful scroll delta
 */
export type ScrollAdvanceDirection = 'idle' | 'up' | 'down';

export function computeScrollAdvanceDirection(
  currentY: number,
  lastY: number,
  previous: ScrollAdvanceDirection = 'idle',
  deadzonePx = 1,
): ScrollAdvanceDirection {
  if (!Number.isFinite(currentY) || !Number.isFinite(lastY)) {
    return previous;
  }
  const delta = currentY - lastY;
  if (delta > deadzonePx) return 'up';
  if (delta < -deadzonePx) return 'down';
  return previous;
}

export interface FooterAutoPlayGateInput {
  hasAutoPlayed: boolean;
  isSiteRevealed: boolean;
  isFooterWellInView: boolean;
  isFooterVisibleAtAll: boolean;
  distanceFromBottomPx: number;
  scrollDirection: ScrollAdvanceDirection;
}

/**
 * Strict one-time trigger gate for the Closing Sign-Off Footer.
 * Prevents accidental firing when the user is still focused on "The Little Coop"
 * or scrolling back upward past the footer.
 */
export function shouldAutoPlayFooterChibi(input: FooterAutoPlayGateInput): boolean {
  if (input.hasAutoPlayed || !input.isSiteRevealed) {
    return false;
  }
  if (input.scrollDirection === 'down') {
    return false;
  }

  const nearBottomWhileVisible =
    input.isFooterVisibleAtAll &&
    Number.isFinite(input.distanceFromBottomPx) &&
    input.distanceFromBottomPx <= FOOTER_BOTTOM_PROXIMITY_PX;

  if (nearBottomWhileVisible) {
    return true;
  }

  return input.isFooterWellInView && input.scrollDirection === 'up';
}

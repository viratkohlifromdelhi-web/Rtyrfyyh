/**
 * Pure 60fps choreography timeline evaluator for the Closing Sign-Off Footer
 * storybook chibi characters (Boy `adinomide` + Girl `Anamika / Morgan`).
 *
 * ViewBox coordinate system: 0 0 260 150 (ground baseline y = 140).
 * Base handshake centers: Boy cx = 94, Girl cx = 164.
 * Handshake clasp target: (130, 92).
 */

export type ChibiStage = 'ready' | 'step-in' | 'handshake' | 'hug' | 'resting';

export const CHIBI_TIMING = {
  stepInStartMs: 0,
  stepInEndMs: 550,
  handshakeStartMs: 550,
  handshakeEndMs: 1850,
  hugStartMs: 1850,
  hugEndMs: 3450,
  totalDurationMs: 3450,
  handshakeTickStartMs: 1240,
  handshakeTickDurationMs: 360,
} as const;

export const CHIBI_GEOMETRY = {
  viewBoxWidth: 260,
  viewBoxHeight: 150,
  groundY: 140,
  boyBaseX: 94,
  girlBaseX: 164,
  boyHeightPx: 116,
  girlHeightPx: 102,
  boyShoulderOffsetX: 10,
  boyShoulderY: 85,
  boyArmLength: 26,
  girlShoulderOffsetX: -10,
  girlShoulderY: 90,
  girlArmLength: 24,
  claspX: 130,
  claspY: 92,
} as const;

export interface ChibiPose {
  stage: ChibiStage;
  isIdleBreathing: boolean;

  // Horizontal & vertical character shifts relative to base handshake stance
  boyShiftX: number;
  boyBounceY: number;
  girlShiftX: number;
  girlBounceY: number;

  // Ground shadow blending (0 = two separate foot shadows, 1 = merged hug oval)
  shadowMerge01: number;

  // Girl's flowing backHair subtle sway (degrees around crown)
  girlBackHairDeg: number;

  // Head tilts anchored at neck base (degrees)
  boyHeadDeg: number;
  girlHeadDeg: number;

  // Facial eye crossfade (0..1)
  openEyesOpacity: number;
  hugEyesOpacity: number;

  // Front arm angles around each shoulder pivot (degrees)
  // Boy arm drawn along +X: +76deg = hanging rest, +15deg = handshake clasp (130, 92)
  boyFrontArmDeg: number;
  // Girl arm drawn along -X: -74deg = hanging rest, -5deg = handshake clasp (130, 92)
  girlFrontArmDeg: number;

  // Far-side arm subtle tuck angles (degrees)
  boyFarArmDeg: number;
  girlFarArmDeg: number;

  // Soft handshake clasp overlap pill opacity at (130, 92)
  claspOverlapOpacity: number;
  claspOverlapOffsetY: number;

  // 3 Champagne-Gold radial ticks popping on second handshake pump
  handshakeTicksOpacity: number;
  handshakeTicksScale: number;

  // 4 rising pastel star glints & soft confetti dots during the hug
  hugParticlesProgress01: number;
  hugParticlesOpacity: number;
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
 * Smooth S-curve ease-in-out for weightless glides and transitions.
 */
export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

/**
 * Computes the world-space SVG coordinates of both front mitten hand tips
 * for verification of the (130, 92) handshake lock.
 */
export function computeFrontHandPositions(pose: Pick<
  ChibiPose,
  'boyShiftX' | 'boyBounceY' | 'boyFrontArmDeg' | 'girlShiftX' | 'girlBounceY' | 'girlFrontArmDeg'
>): {
  boyHand: { x: number; y: number };
  girlHand: { x: number; y: number };
} {
  const boyRad = (pose.boyFrontArmDeg * Math.PI) / 180;
  const boyShoulderX = CHIBI_GEOMETRY.boyBaseX + pose.boyShiftX + CHIBI_GEOMETRY.boyShoulderOffsetX;
  const boyShoulderY = CHIBI_GEOMETRY.boyShoulderY + pose.boyBounceY;
  const boyHand = {
    x: boyShoulderX + CHIBI_GEOMETRY.boyArmLength * Math.cos(boyRad),
    y: boyShoulderY + CHIBI_GEOMETRY.boyArmLength * Math.sin(boyRad),
  };

  const girlRad = (pose.girlFrontArmDeg * Math.PI) / 180;
  const girlShoulderX =
    CHIBI_GEOMETRY.girlBaseX + pose.girlShiftX + CHIBI_GEOMETRY.girlShoulderOffsetX;
  const girlShoulderY = CHIBI_GEOMETRY.girlShoulderY + pose.girlBounceY;
  // Girl arm vector starts at (-armLength, 0); SVG rotation by θ maps (-L, 0) -> (-L cos θ, -L sin θ)
  const girlHand = {
    x: girlShoulderX - CHIBI_GEOMETRY.girlArmLength * Math.cos(girlRad),
    y: girlShoulderY - CHIBI_GEOMETRY.girlArmLength * Math.sin(girlRad),
  };

  return { boyHand, girlHand };
}

/**
 * Cozy side-by-side resting pose (Stage 4 & prefers-reduced-motion).
 */
export function getRestingPose(enableIdleBreathing = true): ChibiPose {
  return {
    stage: 'resting',
    isIdleBreathing: enableIdleBreathing,
    boyShiftX: 4,
    boyBounceY: 0,
    girlShiftX: -4,
    girlBounceY: 0,
    shadowMerge01: 0.15,
    girlBackHairDeg: 0,
    boyHeadDeg: 1.5,
    girlHeadDeg: -1.5,
    openEyesOpacity: 1,
    hugEyesOpacity: 0,
    boyFrontArmDeg: 76,
    girlFrontArmDeg: -74,
    boyFarArmDeg: 0,
    girlFarArmDeg: 0,
    claspOverlapOpacity: 0,
    claspOverlapOffsetY: 0,
    handshakeTicksOpacity: 0,
    handshakeTicksScale: 0.5,
    hugParticlesProgress01: 0,
    hugParticlesOpacity: 0,
  };
}

/**
 * Evaluates the exact character rig pose at `elapsedMs` from animation start.
 */
export function computeFooterChibiPose(
  elapsedMs: number,
  reducedMotion = false,
): ChibiPose {
  if (reducedMotion) {
    return getRestingPose(false);
  }

  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  // Stage 4: Cozy Resting Pose (3.45s onward)
  if (t >= CHIBI_TIMING.totalDurationMs) {
    return getRestingPose(true);
  }

  // Stage 1: Ready & Step In (0.00s -> 0.55s)
  if (t < CHIBI_TIMING.stepInEndMs) {
    const p = clamp01(t / CHIBI_TIMING.stepInEndMs);
    const move = easeOutCubicExpo(p);
    // Start 24px further apart (-12px left, +12px right) and glide smoothly inward to 0
    const boyShiftX = lerp(-12, 0, move);
    const girlShiftX = lerp(12, 0, move);
    // Light playful bounce (-3px back to 0)
    const bounce = -3 * Math.sin(p * Math.PI);
    // Subtle follow-through sway on girl's backHair (±2deg)
    const girlBackHairDeg = 2.2 * Math.sin(p * Math.PI * 1.85) * (1 - p * 0.45);

    return {
      stage: p < 0.02 ? 'ready' : 'step-in',
      isIdleBreathing: false,
      boyShiftX,
      boyBounceY: bounce,
      girlShiftX,
      girlBounceY: bounce * 0.92,
      shadowMerge01: 0,
      girlBackHairDeg,
      boyHeadDeg: lerp(0, 1.5, move),
      girlHeadDeg: lerp(0, -1.5, move),
      openEyesOpacity: 1,
      hugEyesOpacity: 0,
      boyFrontArmDeg: lerp(76, 62, move),
      girlFrontArmDeg: lerp(-74, -60, move),
      boyFarArmDeg: lerp(4, 0, move),
      girlFarArmDeg: lerp(-4, 0, move),
      claspOverlapOpacity: 0,
      claspOverlapOffsetY: 0,
      handshakeTicksOpacity: 0,
      handshakeTicksScale: 0.5,
      hugParticlesProgress01: 0,
      hugParticlesOpacity: 0,
    };
  }

  // Stage 2: Best-Friend Handshake (0.55s -> 1.85s)
  if (t < CHIBI_TIMING.handshakeEndMs) {
    const localMs = t - CHIBI_TIMING.handshakeStartMs; // 0..1300ms

    // 0..300ms: smooth reach forward to lock at (130, 92)
    // 300..1120ms: 2 crisp upbeat pumps (+10deg -> -12deg -> +8deg -> 0deg)
    // 1120..1300ms: smooth brief hold/release lead-out
    let boyArmOffsetDeg = 0;
    let headNodDeg = 0;
    let boyFrontArmDeg = 15;
    let girlFrontArmDeg = -5;
    let claspOverlapOpacity = 1;

    if (localMs < 300) {
      const reach = easeOutCubicExpo(localMs / 300);
      boyFrontArmDeg = lerp(62, 15, reach);
      girlFrontArmDeg = lerp(-60, -5, reach);
      claspOverlapOpacity = clamp01((reach - 0.72) / 0.28);
      headNodDeg = lerp(1.5, 0, reach);
    } else if (localMs < 1120) {
      const pumpMs = localMs - 300; // 0..820ms across 4 pump beats
      if (pumpMs < 210) {
        // Beat 1 down: 0 -> +10deg
        const u = easeInOutSine(pumpMs / 210);
        boyArmOffsetDeg = lerp(0, 10, u);
        headNodDeg = lerp(0, 3, u);
      } else if (pumpMs < 430) {
        // Beat 1 up: +10deg -> -12deg
        const u = easeInOutSine((pumpMs - 210) / 220);
        boyArmOffsetDeg = lerp(10, -12, u);
        headNodDeg = lerp(3, -1.2, u);
      } else if (pumpMs < 640) {
        // Beat 2 down: -12deg -> +8deg (triggers radial ticks!)
        const u = easeInOutSine((pumpMs - 430) / 210);
        boyArmOffsetDeg = lerp(-12, 8, u);
        headNodDeg = lerp(-1.2, 3, u);
      } else {
        // Settle back: +8deg -> 0deg
        const u = easeInOutSine((pumpMs - 640) / 180);
        boyArmOffsetDeg = lerp(8, 0, u);
        headNodDeg = lerp(3, 0, u);
      }
      boyFrontArmDeg = 15 + boyArmOffsetDeg;
      girlFrontArmDeg = -5 - boyArmOffsetDeg;
      claspOverlapOpacity = 1;
    } else {
      // 1120..1300ms: gentle release from clasp before gliding into hug
      const rel = easeInOutSine((localMs - 1120) / 180);
      boyFrontArmDeg = lerp(15, 38, rel);
      girlFrontArmDeg = lerp(-5, -34, rel);
      claspOverlapOpacity = 1 - clamp01(rel * 1.5);
      headNodDeg = 0;
    }

    // Clasp overlap pill tracks exact vertical pump offset
    const claspOverlapOffsetY =
      CHIBI_GEOMETRY.boyArmLength * (Math.sin((boyFrontArmDeg * Math.PI) / 180) - Math.sin((15 * Math.PI) / 180));

    // 3 tiny Champagne-Gold radial motion ticks on 2nd pump (360ms window)
    let handshakeTicksOpacity = 0;
    let handshakeTicksScale = 0.5;
    if (
      t >= CHIBI_TIMING.handshakeTickStartMs &&
      t <= CHIBI_TIMING.handshakeTickStartMs + CHIBI_TIMING.handshakeTickDurationMs
    ) {
      const tp = clamp01(
        (t - CHIBI_TIMING.handshakeTickStartMs) / CHIBI_TIMING.handshakeTickDurationMs,
      );
      handshakeTicksScale = lerp(0.5, 1.1, easeOutCubicExpo(tp));
      handshakeTicksOpacity =
        tp < 0.35 ? lerp(0, 0.9, tp / 0.35) : lerp(0.9, 0, (tp - 0.35) / 0.65);
    }

    return {
      stage: 'handshake',
      isIdleBreathing: false,
      boyShiftX: 0,
      boyBounceY: 0,
      girlShiftX: 0,
      girlBounceY: 0,
      shadowMerge01: 0,
      girlBackHairDeg: boyArmOffsetDeg * 0.08,
      boyHeadDeg: headNodDeg,
      girlHeadDeg: -headNodDeg,
      openEyesOpacity: 1,
      hugEyesOpacity: 0,
      boyFrontArmDeg,
      girlFrontArmDeg,
      boyFarArmDeg: 0,
      girlFarArmDeg: 0,
      claspOverlapOpacity,
      claspOverlapOffsetY,
      handshakeTicksOpacity,
      handshakeTicksScale,
      hugParticlesProgress01: 0,
      hugParticlesOpacity: 0,
    };
  }

  // Stage 3: Warm Friendly Hug (1.85s -> 3.45s, 1600ms duration)
  const hugLocalMs = t - CHIBI_TIMING.hugStartMs; // 0..1600ms

  // Sub-phases:
  // 0..340ms: glide 14px closer, arms wrap around backs, eyes crossfade to ^ ^, heads tilt ±6deg
  // 340..1180ms: warm snug hold + 2 gentle back-pats (±5deg) + 4 rising pastel star/confetti flecks
  // 1180..1600ms: ease smoothly into Stage 4 cozy resting stance
  let boyShiftX = 14;
  let girlShiftX = -14;
  let shadowMerge01 = 1;
  let eyeHugFactor = 1;
  let boyHeadDeg = 6;
  let girlHeadDeg = -6;
  let boyFrontArmDeg = 20;
  let girlFrontArmDeg = -26;
  let boyFarArmDeg = -8;
  let girlFarArmDeg = 8;
  let girlBackHairDeg = 0;

  if (hugLocalMs < 340) {
    const enter = easeOutCubicExpo(hugLocalMs / 340);
    boyShiftX = lerp(0, 14, enter);
    girlShiftX = lerp(0, -14, enter);
    shadowMerge01 = enter;
    eyeHugFactor = clamp01((enter - 0.25) / 0.75);
    boyHeadDeg = lerp(0, 6, enter);
    girlHeadDeg = lerp(0, -6, enter);
    boyFrontArmDeg = lerp(38, 20, enter);
    girlFrontArmDeg = lerp(-34, -26, enter);
    boyFarArmDeg = lerp(0, -8, enter);
    girlFarArmDeg = lerp(0, 8, enter);
    girlBackHairDeg = 1.8 * Math.sin(enter * Math.PI);
  } else if (hugLocalMs < 1180) {
    // 2 gentle friendly back-pats (±5deg) by boy's wrapping front arm
    const patProgress = (hugLocalMs - 340) / 840; // 0..1
    const patWave = Math.sin(patProgress * Math.PI * 4) * 5;
    boyFrontArmDeg = 20 + patWave;
    girlFrontArmDeg = -26 + Math.sin(patProgress * Math.PI * 2) * 1.5;
    girlBackHairDeg = Math.sin(patProgress * Math.PI * 2) * 0.9;
  } else {
    const exit = easeInOutSine((hugLocalMs - 1180) / 420);
    boyShiftX = lerp(14, 4, exit);
    girlShiftX = lerp(-14, -4, exit);
    shadowMerge01 = lerp(1, 0.15, exit);
    eyeHugFactor = 1 - clamp01(exit * 1.35);
    boyHeadDeg = lerp(6, 1.5, exit);
    girlHeadDeg = lerp(-6, -1.5, exit);
    boyFrontArmDeg = lerp(20, 76, exit);
    girlFrontArmDeg = lerp(-26, -74, exit);
    boyFarArmDeg = lerp(-8, 0, exit);
    girlFarArmDeg = lerp(8, 0, exit);
    girlBackHairDeg = -1.2 * Math.sin(exit * Math.PI);
  }

  // 4 tiny pastel star glints & confetti dots rising gently behind shoulders (320ms..1420ms)
  let hugParticlesProgress01 = 0;
  let hugParticlesOpacity = 0;
  if (hugLocalMs >= 320 && hugLocalMs <= 1420) {
    hugParticlesProgress01 = clamp01((hugLocalMs - 320) / 1100);
    hugParticlesOpacity =
      hugParticlesProgress01 < 0.22
        ? hugParticlesProgress01 / 0.22
        : hugParticlesProgress01 > 0.72
          ? (1 - hugParticlesProgress01) / 0.28
          : 1;
  }

  return {
    stage: 'hug',
    isIdleBreathing: false,
    boyShiftX,
    boyBounceY: 0,
    girlShiftX,
    girlBounceY: 0,
    shadowMerge01,
    girlBackHairDeg,
    boyHeadDeg,
    girlHeadDeg,
    openEyesOpacity: 1 - eyeHugFactor,
    hugEyesOpacity: eyeHugFactor,
    boyFrontArmDeg,
    girlFrontArmDeg,
    boyFarArmDeg,
    girlFarArmDeg,
    claspOverlapOpacity: 0,
    claspOverlapOffsetY: 0,
    handshakeTicksOpacity: 0,
    handshakeTicksScale: 0.5,
    hugParticlesProgress01,
    hugParticlesOpacity: clamp01(hugParticlesOpacity),
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
 * Strict one-time trigger gate for the Handshake-to-Hug Closing Sign-Off Footer.
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


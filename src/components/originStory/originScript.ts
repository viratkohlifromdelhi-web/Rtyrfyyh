/**
 * Locked 11-Scene Interactive Storybook Script, Proportional Height Chart Math,
 * Exact 1-Second-Per-Year Growth Timing, Keyword Highlighting, and Live IST Finale Copy
 * for The Origin Story Play.
 *
 * STRICT RULE: ZERO visible dashes (—, –, -) in ANY user-facing string.
 */

export type OriginSceneId =
  | 'prologue'
  | 'meet_father'
  | 'meet_mother'
  | 'happy_together'
  | 'starry_kiss'
  | 'nine_months'
  | 'anamika_born'
  | 'baby_to_toddler'
  | 'growing_to_14'
  | 'padlock_freeze'
  | 'grand_finale';

export type OriginBackdropMood =
  | 'sunrise'
  | 'meadow'
  | 'starry_twilight'
  | 'celebration_dawn'
  | 'gala_finale';

export interface OriginSceneSpec {
  readonly index: number;
  readonly sceneNumber: number;
  readonly id: OriginSceneId;
  readonly label: string;
  readonly backdropMood: OriginBackdropMood;
  readonly settleDurationMs: number;
  readonly caption: string;
  readonly secondaryCaption?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly nameplateTitle?: string;
  readonly nameplateSubtitle?: string;
  readonly stampTitle?: string;
}

export interface GrowthStep {
  readonly age: number;
  readonly year: number;
  readonly inches: number;
  readonly heightLabel: string;
  readonly durationMs: number;
  readonly stage: 'newborn' | 'toddler' | 'girl' | 'teen';
  readonly locked?: boolean;
}

export interface RulerTick {
  readonly inches: number;
  readonly label: string;
  readonly major: boolean;
  readonly isFiveTwo?: boolean;
}

export const ORIGIN_TOTAL_SCENES = 11;

export const ORIGIN_CAST = {
  father: {
    name: 'SHIVJEE KUMAR',
    subtitle: 'Peaceful, proud, and smiling',
  },
  mother: {
    name: 'ARCHANA',
    subtitle: 'Kind, graceful, and glowing',
  },
  birthdayGirl: {
    name: 'Anamika Singh',
    birthDateStamp: '03 DECEMBER 2009',
  },
} as const;

export const ORIGIN_KISS_AUDIO_FILENAME =
  'In The Night No Control 🖤🔥  Song Lyrics Status #shorts_ #lyrics_.mp3';

/**
 * URL-safe route backed directly by `public/${ORIGIN_KISS_AUDIO_FILENAME}` via Vite's
 * dev middleware and production build copy hook (avoids `#` fragment stripping in URLs).
 */
export const ORIGIN_KISS_AUDIO_ROUTE = 'origin-kiss-track.mp3';

function getViteBaseUrl(): string {
  const env =
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: { BASE_URL?: string } }).env
      : undefined;
  return env?.BASE_URL || '/';
}

/**
 * Safely resolves the kissing scene MP3 URL using Vite's BASE_URL so it works reliably
 * on both root and subpath deployments without `#` or emoji URL issues.
 */
export function buildOriginKissTrackSrc(baseUrl: string = getViteBaseUrl()): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${ORIGIN_KISS_AUDIO_ROUTE}`;
}

export type KissPhase = 'idle' | 'approach' | 'leanIn' | 'kissing' | 'afterglow';

export type KissWalkStage = 'moonlight' | 'stepping' | 'leanIn' | 'kissing' | 'afterglow';

/**
 * Exact 5-Phase Realistic Kiss Choreography Timing (Scene 5):
 * - Audio starts immediately at 0ms when Scene 5 opens (180ms smooth fade-in to 0.82)
 * - Phase 1 (0ms -> 750ms): Moonlight eye contact (standing apart)
 * - Phase 2 (750ms -> 1850ms): 2.5 gentle walking steps closer together
 * - Phase 3 (1850ms -> 2400ms): Tender lean-in + neck-pivoted head tilts
 * - Phase 4 (2400ms -> 5900ms): 3.5s realistic kiss hold + rising hearts + 2 shooting stars
 * - Phase 5 (5900ms -> 6600ms+): Shy pull-back & glowing afterglow while full kiss audio finishes naturally
 */
export const SCENE5_KISS_TIMING = {
  phase1MoonlightMs: 0,
  phase2StepStartMs: 750,
  phase2StepDurationMs: 1100,
  phase3LeanInStartMs: 1850,
  phase3LeanInDurationMs: 550,
  audioSwellStartMs: 0,
  phase4KissStartMs: 2400,
  phase4KissHoldMs: 3500,
  phase5AfterglowStartMs: 5900,
  phase5PullBackDurationMs: 700,
  settleMs: 6600,
} as const;

export interface Scene5SyncedTimings {
  readonly phase1MoonlightMs: number;
  readonly phase2StepStartMs: number;
  readonly phase3LeanInStartMs: number;
  readonly phase4KissStartMs: number;
  readonly phase5AfterglowStartMs: number;
  readonly settleMs: number;
}

/**
 * Syncs Scene 5's kiss-to-afterglow pull-back with the actual trimmed Web Audio clip
 * duration so Shivjee & Archana ease into afterglow right as the final notes fade out,
 * falling back cleanly to `SCENE5_KISS_TIMING` defaults if the clip is not yet decoded
 * or shorter than 3200ms.
 */
export function computeScene5SyncedTimings(clipDurationMs: number): Scene5SyncedTimings {
  const phase5AfterglowStartMs =
    Number.isFinite(clipDurationMs) && clipDurationMs >= 3200
      ? Math.min(Math.max(3600, Math.round(clipDurationMs) - 700), 9500)
      : SCENE5_KISS_TIMING.phase5AfterglowStartMs;

  return {
    phase1MoonlightMs: SCENE5_KISS_TIMING.phase1MoonlightMs,
    phase2StepStartMs: SCENE5_KISS_TIMING.phase2StepStartMs,
    phase3LeanInStartMs: SCENE5_KISS_TIMING.phase3LeanInStartMs,
    phase4KissStartMs: SCENE5_KISS_TIMING.phase4KissStartMs,
    phase5AfterglowStartMs,
    settleMs: phase5AfterglowStartMs + SCENE5_KISS_TIMING.phase5PullBackDurationMs,
  };
}

export interface Scene5CharacterPose {
  /** Horizontal offset from stage center in SVG viewBox units (160u character width) */
  readonly dxUnits: number;
  /** Vertical offset in SVG viewBox units (negative = upward tiptoe lift) */
  readonly dyUnits: number;
  /** Horizontal offset as percentage of the character's 160u box width */
  readonly translateXPct: number;
  /** Vertical offset as percentage of the character's 230u box height */
  readonly translateYPct: number;
  /** Torso lean rotation around feet baseline in degrees */
  readonly torsoRotateDeg: number;
  /** Head tilt rotation around neck pivot in degrees */
  readonly headTiltDeg: number;
}

export interface Scene5KissPosePair {
  readonly shivjee: Scene5CharacterPose;
  readonly archana: Scene5CharacterPose;
}

const CHAR_VIEWBOX_W = 160;
const CHAR_VIEWBOX_H = 230;

function makeCharacterPose(
  dxUnits: number,
  dyUnits: number,
  torsoRotateDeg: number,
  headTiltDeg: number,
): Scene5CharacterPose {
  return {
    dxUnits,
    dyUnits,
    translateXPct: Number(((dxUnits / CHAR_VIEWBOX_W) * 100).toFixed(3)),
    translateYPct: Number(((dyUnits / CHAR_VIEWBOX_H) * 100).toFixed(3)),
    torsoRotateDeg,
    headTiltDeg,
  };
}

/**
 * Pure resolution-independent pose calculator for Shivjee (left) and Archana (right)
 * inside the unified 320x230 Scene 5 Kiss Stage.
 *
 * Geometry verification (viewBox="0 0 160 230"):
 * - Shivjee right cheek/lip edge sits at x=104 (+24u from center); torso +3.5deg around feet y=220
 *   adds +9.1u forward, head +7deg around neck (80,92) adds +2.9u -> total inner reach +36.0u.
 * - Archana left cheek/lip edge sits at x=58 (-22u from center); torso -3.5deg around feet y=220
 *   adds -8.7u forward, head -7deg around neck (80,102) adds -3.6u -> total inner reach -34.3u.
 * - At dx = +/-36u (72u center-to-center), inner faces and lips meet cleanly at stage x = 0 with
 *   zero awkward gap and zero hair/eye occlusion, while Archana's -3.2u graceful tiptoe lift aligns
 *   both mouths vertically within ~1.4u.
 */
export function getScene5KissPose(stage: KissWalkStage): Scene5KissPosePair {
  switch (stage) {
    case 'moonlight':
      return {
        shivjee: makeCharacterPose(-74, 0, 0, 0),
        archana: makeCharacterPose(74, 0, 0, 0),
      };
    case 'stepping':
      return {
        shivjee: makeCharacterPose(-41, 0, 0.8, 1.5),
        archana: makeCharacterPose(41, 0, -0.8, -1.5),
      };
    case 'leanIn':
      return {
        shivjee: makeCharacterPose(-37.5, 0, 3.2, 6.2),
        archana: makeCharacterPose(37.5, -2.5, -3.2, -6.2),
      };
    case 'kissing':
      return {
        shivjee: makeCharacterPose(-36, 0, 3.5, 7),
        archana: makeCharacterPose(36, -3.2, -3.5, -7),
      };
    case 'afterglow':
      return {
        shivjee: makeCharacterPose(-47, 0, 0, 0),
        archana: makeCharacterPose(47, 0, 0, 0),
      };
  }
}

export const ORIGIN_AUDIO_CONFIG = {
  kissTrackFilename: ORIGIN_KISS_AUDIO_FILENAME,
  kissTrackSrc: buildOriginKissTrackSrc(),
  kissDurationMs: SCENE5_KISS_TIMING.settleMs,
  shyGlanceDelayMs: SCENE5_KISS_TIMING.phase2StepStartMs,
  kissStartDelayMs: SCENE5_KISS_TIMING.phase4KissStartMs,
  kissHoldMs: SCENE5_KISS_TIMING.phase4KissHoldMs,
  audioSwellStartMs: SCENE5_KISS_TIMING.audioSwellStartMs,
  playFullTrackToEnd: true,
  fallbackSynthDurationMs: 5000,
  fadeInMs: 180,
  interruptFadeOutMs: 140,
  fadeOutMs: 140,
  maxVolume: 0.82,
} as const;

/**
 * Keywords highlighted in Warm Rose Berry (#D94B7D) inside the editorial subtitle card.
 */
export const ORIGIN_CAPTION_KEYWORDS: readonly string[] = [
  "5'2 feet",
  '03 December 2009',
  'Shivjee Kumar',
  'Archana',
  'Anamika Singh',
  '17th',
  '17',
] as const;

export const ORIGIN_SCENES: readonly OriginSceneSpec[] = [
  {
    index: 0,
    sceneNumber: 1,
    id: 'prologue',
    label: 'Opening',
    backdropMood: 'sunrise',
    settleDurationMs: 1400,
    eyebrow: 'A TRUE STORY',
    title: 'Before the Cake and the Chaos',
    caption:
      'Every iconic story has a quiet beginning. Tap Next to see how it all started.',
  },
  {
    index: 1,
    sceneNumber: 2,
    id: 'meet_father',
    label: 'Her Father',
    backdropMood: 'sunrise',
    settleDurationMs: 1500,
    nameplateTitle: 'SHIVJEE KUMAR',
    nameplateSubtitle: 'Peaceful, proud, and smiling',
    caption:
      'First, meet her father, Shivjee Kumar. A calm man enjoying a very peaceful life.',
  },
  {
    index: 2,
    sceneNumber: 3,
    id: 'meet_mother',
    label: 'Her Mother',
    backdropMood: 'sunrise',
    settleDurationMs: 1500,
    nameplateTitle: 'ARCHANA',
    nameplateSubtitle: 'Kind, graceful, and glowing',
    caption:
      'And meet her mother, Archana. Warm smiles, soft mornings, and zero chaos anywhere.',
  },
  {
    index: 3,
    sceneNumber: 4,
    id: 'happy_together',
    label: 'Happy Together',
    backdropMood: 'meadow',
    settleDurationMs: 1800,
    caption:
      'Together, they were truly happy. Life was gentle, bright, and completely quiet.',
  },
  {
    index: 4,
    sceneNumber: 5,
    id: 'starry_kiss',
    label: 'Starry Night',
    backdropMood: 'starry_twilight',
    settleDurationMs: SCENE5_KISS_TIMING.settleMs,
    caption:
      'Until one magical starry night... the moon glowed, they forgot the whole world, and shared one unforgettable kiss.',
  },
  {
    index: 5,
    sceneNumber: 6,
    id: 'nine_months',
    label: 'Nine Months',
    backdropMood: 'meadow',
    settleDurationMs: 3600,
    caption:
      'Soon, Archana was glowing with a tiny secret. Month after month, for 9 magical months, they waited for their little miracle.',
  },
  {
    index: 6,
    sceneNumber: 7,
    id: 'anamika_born',
    label: '03 Dec 2009',
    backdropMood: 'celebration_dawn',
    settleDurationMs: 2100,
    stampTitle: '03 DECEMBER 2009',
    caption:
      'And then, on 03 December 2009, Anamika Singh was born! The cutest little legend had officially arrived.',
  },
  {
    index: 7,
    sceneNumber: 8,
    id: 'baby_to_toddler',
    label: 'Baby Years',
    backdropMood: 'celebration_dawn',
    settleDurationMs: 2800,
    caption:
      'For her first 3 years, she grew like the sweetest little baby. Tiny steps, chubby cheeks, and endless giggles.',
  },
  {
    index: 8,
    sceneNumber: 9,
    id: 'growing_to_14',
    label: 'Growing Up',
    backdropMood: 'celebration_dawn',
    settleDurationMs: 7400,
    caption:
      'Every single year, she grew faster and brighter. Everyone thought she was going to touch the sky.',
    secondaryCaption:
      "Year by year she climbed higher, until at age 14, she proudly reached 5'2 feet!",
  },
  {
    index: 9,
    sceneNumber: 10,
    id: 'padlock_freeze',
    label: 'Height Locked',
    backdropMood: 'celebration_dawn',
    settleDurationMs: 3200,
    caption:
      "Then at age 14, destiny pressed pause. The years kept flying to 17, but her height stayed locked forever at 5'2 feet!",
  },
  {
    index: 10,
    sceneNumber: 11,
    id: 'grand_finale',
    label: 'Happy 17th',
    backdropMood: 'gala_finale',
    settleDurationMs: 900,
    caption:
      "Still 5'2 feet. Still pure sunshine and chaos. Welcome to Anamika's 17th Birthday!",
  },
] as const;

export const PREGNANCY_MONTH_DURATION_MS = 380;

/**
 * Scene 8: Baby to 3 Years (2800ms total = 700ms per age step)
 */
export const SCENE_8_GROWTH_STEPS: readonly GrowthStep[] = [
  { age: 0, year: 2009, inches: 20, heightLabel: "1'8\"", durationMs: 700, stage: 'newborn' },
  { age: 1, year: 2010, inches: 30, heightLabel: "2'6\"", durationMs: 700, stage: 'toddler' },
  { age: 2, year: 2011, inches: 34, heightLabel: "2'10\"", durationMs: 700, stage: 'toddler' },
  { age: 3, year: 2012, inches: 37, heightLabel: "3'1\"", durationMs: 700, stage: 'toddler' },
] as const;

/**
 * Scene 9: Growing Up to 14 Years
 * - Phase A (Ages 4 to 9): 400ms per year (2400ms total)
 * - Phase B (Ages 10 to 14): STRICTLY 1000ms (1 full second) per year (5000ms total)
 */
export const SCENE_9_GROWTH_STEPS: readonly GrowthStep[] = [
  { age: 4, year: 2013, inches: 40, heightLabel: "3'4\"", durationMs: 400, stage: 'girl' },
  { age: 5, year: 2014, inches: 43, heightLabel: "3'7\"", durationMs: 400, stage: 'girl' },
  { age: 6, year: 2015, inches: 46, heightLabel: "3'10\"", durationMs: 400, stage: 'girl' },
  { age: 7, year: 2016, inches: 49, heightLabel: "4'1\"", durationMs: 400, stage: 'girl' },
  { age: 8, year: 2017, inches: 52, heightLabel: "4'4\"", durationMs: 400, stage: 'girl' },
  { age: 9, year: 2018, inches: 55, heightLabel: "4'7\"", durationMs: 400, stage: 'girl' },
  { age: 10, year: 2019, inches: 57, heightLabel: "4'9\"", durationMs: 1000, stage: 'girl' },
  { age: 11, year: 2020, inches: 58, heightLabel: "4'10\"", durationMs: 1000, stage: 'girl' },
  { age: 12, year: 2021, inches: 59, heightLabel: "4'11\"", durationMs: 1000, stage: 'girl' },
  { age: 13, year: 2022, inches: 61, heightLabel: "5'1\"", durationMs: 1000, stage: 'girl' },
  { age: 14, year: 2023, inches: 62, heightLabel: "5'2\"", durationMs: 1000, stage: 'teen' },
] as const;

/**
 * Scene 10 of 11: Age 14 to 17 frozen dead-flat at 5'2" (62 inches),
 * STRICTLY 1000ms (1 full second) per year, stopping peacefully on Age 17.
 */
export const SCENE_10_FREEZE_STEPS: readonly GrowthStep[] = [
  { age: 14, year: 2023, inches: 62, heightLabel: "5'2\"", durationMs: 1000, stage: 'teen', locked: true },
  { age: 15, year: 2024, inches: 62, heightLabel: "Still 5'2\"", durationMs: 1000, stage: 'teen', locked: true },
  { age: 16, year: 2025, inches: 62, heightLabel: "Still 5'2\"", durationMs: 1000, stage: 'teen', locked: true },
  { age: 17, year: 2026, inches: 62, heightLabel: "Still 5'2\"", durationMs: 1000, stage: 'teen', locked: true },
] as const;

export const RULER_MIN_INCHES = 12; // 1'0"
export const RULER_MAX_INCHES = 72; // 6'0"
export const FIVE_TWO_INCHES = 62; // 5'2"

export const ORIGIN_RULER_TICKS: readonly RulerTick[] = [
  { inches: 72, label: "6'0\"", major: true },
  { inches: 62, label: "5'2\"", major: true, isFiveTwo: true },
  { inches: 60, label: "5'0\"", major: true },
  { inches: 48, label: "4'0\"", major: true },
  { inches: 36, label: "3'0\"", major: true },
  { inches: 24, label: "2'0\"", major: true },
  { inches: 12, label: "1'0\"", major: true },
] as const;

/**
 * Maps real height in inches (12" to 72") linearly to chart height ratio
 * such that 5'2" (62") equals EXACTLY 0.79 (79%) and 1'0" (12") equals 0.14.
 */
export function inchesToChartRatio(inches: number): number {
  const clamped = Math.max(RULER_MIN_INCHES, Math.min(RULER_MAX_INCHES, inches));
  return 0.14 + ((clamped - RULER_MIN_INCHES) / (RULER_MAX_INCHES - RULER_MIN_INCHES)) * 0.78;
}

/**
 * Unified SVG coordinate geometry (viewBox="0 0 160 230", ground baseline y = 220).
 * Returns exact SVG Y coordinate of the character's crown so the figure, ruler ticks,
 * horizontal height tracker, and 5'2" padlock barrier align to the exact pixel.
 */
export const ORIGIN_SVG_VIEWBOX_HEIGHT = 230;
export const ORIGIN_SVG_GROUND_Y = 220;

export function inchesToSvgCrownY(inches: number): number {
  const ratio = inchesToChartRatio(inches);
  return ORIGIN_SVG_GROUND_Y - ratio * ORIGIN_SVG_GROUND_Y;
}

/**
 * Converts a height in inches into CSS `bottom: X%` relative to the unified
 * 230-unit character & ruler stage frame.
 */
export function inchesToStageBottomPct(inches: number): number {
  const crownY = inchesToSvgCrownY(inches);
  return ((ORIGIN_SVG_VIEWBOX_HEIGHT - crownY) / ORIGIN_SVG_VIEWBOX_HEIGHT) * 100;
}

export interface OriginFinaleCopy {
  readonly isBirthdayToday: boolean;
  readonly headline: string;
  readonly subcaption: string;
  readonly badgeLabel: string;
  readonly ctaLabel: string;
}

/**
 * Computes live India Standard Time (Asia/Kolkata) month and day so the finale
 * displays the exact birthday message on 03 December and the timeless message on all other dates.
 */
export function getIstMonthDay(now: Date = new Date()): { month: string; day: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    if (month && day) {
      return { month, day };
    }
    const formatted = formatter.format(now);
    const match = formatted.match(/(\d{2})\D(\d{2})/);
    if (match) {
      return { month: match[1], day: match[2] };
    }
  } catch {
    // Fallback to UTC+5:30 offset math if Intl timezone data is unavailable
  }

  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  return {
    month: String(istDate.getUTCMonth() + 1).padStart(2, '0'),
    day: String(istDate.getUTCDate()).padStart(2, '0'),
  };
}

export function getOriginFinaleCopy(now: Date = new Date()): OriginFinaleCopy {
  const { month, day } = getIstMonthDay(now);
  const isBirthdayToday = month === '12' && day === '03';

  if (isBirthdayToday) {
    return {
      isBirthdayToday: true,
      headline: 'Today, she is turning 17!',
      subcaption:
        "Still 5'2 feet. Still pure sunshine and chaos. Happy 17th Birthday, Anamika!",
      badgeLabel: 'CHAPTER 17 · UNLOCKED',
      ctaLabel: 'Enter Birthday World',
    };
  }

  return {
    isBirthdayToday: false,
    headline: 'She has turned 17 on 03 Dec 2026!',
    subcaption:
      "Still 5'2 feet. Still pure sunshine and chaos. Welcome to Anamika's 17th Birthday!",
    badgeLabel: 'CHAPTER 17 · UNLOCKED',
    ctaLabel: 'Enter Birthday World',
  };
}

export type OriginRomanticGlowLevel =
  | 'ambient'
  | 'twilight'
  | 'building'
  | 'peak'
  | 'afterglow';

/**
 * Maps the active scene and Scene 5 kiss beat to the romantic soft-pink
 * radial gradient lighting intensity level.
 */
export function getOriginRomanticGlowIntensity(
  sceneId: OriginSceneId,
  kissBeat: 'twilight' | 'shyGlance' | 'leanIn' | 'kissing' | 'afterglow',
): OriginRomanticGlowLevel {
  if (sceneId !== 'starry_kiss') {
    return 'ambient';
  }
  if (kissBeat === 'kissing') return 'peak';
  if (kissBeat === 'shyGlance' || kissBeat === 'leanIn') return 'building';
  if (kissBeat === 'afterglow') return 'afterglow';
  return 'twilight';
}


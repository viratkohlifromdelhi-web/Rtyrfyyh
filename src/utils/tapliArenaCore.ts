/**
 * Pure game-state, 8-stage progression, smooth skin/blush/aura palette interpolation,
 * directional tap resolver, non-repeating dialogue engine, Combo Overdrive tracker,
 * stage-matched pop words, Modino milestone lines, and pooled FX helpers for
 * Tapli Arena 2.0.
 *
 * Strictly zero visible dashes (—, –, -) in every user-facing string.
 */

import type { ModinoReaction } from './modinoReactions';

export type TapliStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type TapliDirection = -1 | 1;

export interface TapliStageConfig {
  id: TapliStageId;
  minTaplis: number;
  nextStageAt: number | null;
  moodLabel: string;
  unlockToast: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  stageAuraCenter: string;
  stageAuraOpacity: number;
  popWords: readonly string[];
  dialogues: readonly string[];
}

export interface TapliVisualPalette {
  stageId: TapliStageId;
  heat: number;
  skinTop: string;
  skinMid: string;
  skinBottom: string;
  blushColor: string;
  blushOpacity: number;
  moodBarPct: number;
  moodBarStart: string;
  moodBarEnd: string;
  auraCenter: string;
  auraOpacity: number;
  showAngerMark: boolean;
  showHeadBump: boolean;
  showSteamPuffs: boolean;
  showDizzyRing: boolean;
  showOrbitStars: boolean;
  showDramaStreaks: boolean;
  showBandage: boolean;
  showGhostSoul: boolean;
  showZenHalo: boolean;
  showZenRays: boolean;
}

export interface TapliComboState {
  count: number;
  label: string | null;
  isOverdrive: boolean;
}

export interface TapliStageProgress {
  stageIndex: TapliStageId;
  totalStages: 8;
  moodLabel: string;
  pct: number;
  nextHint: string;
}

export const TAPLI_HEAT_MAX_TAPS = 75;
export const TAPLI_COMBO_WINDOW_MS = 680;
export const TAPLI_OVERDRIVE_THRESHOLD = 10;
export const TAPLI_FX_POOL_SIZE = 10;
export const TAPLI_COOL_DOWN_LINE = 'Aahh... thanda thanda, shanti mili!';
export const TAPLI_DEFAULT_IDLE_LINE = 'Ready for birthday pats? Go easy!';

export const TAPLI_MILESTONES = [1, 5, 15, 30, 50, 75, 100, 150] as const;
export type TapliMilestone = (typeof TAPLI_MILESTONES)[number];

export const TAPLI_STAGE_UNLOCK_THRESHOLDS = [5, 15, 30, 50, 75, 100, 150] as const;

export const TAPLI_ANALYTICS_MILESTONES = [1, 15, 30, 50, 100, 150] as const;

export const TAPLI_STAGES: readonly TapliStageConfig[] = [
  {
    id: 1,
    minTaplis: 0,
    nextStageAt: 5,
    moodLabel: 'Sweet & Clueless',
    unlockToast: 'Stage 1 · Sweet & Clueless',
    badgeBg: '#FFF4EA',
    badgeText: '#8C4A3B',
    badgeBorder: 'rgba(230, 155, 130, 0.38)',
    stageAuraCenter: '#FFD6E6',
    stageAuraOpacity: 0.42,
    popWords: ['PAT!', 'TAPLI!', 'HEYY!'],
    dialogues: [
      'Oye! Ye kya tha?!',
      'Wait, why did you just bonk my head?',
      'Excuse me, birthday girl hu main!',
      'Ek aur mara toh dekh lena!',
      'Hair set kiya tha maine, haath hatao!',
    ],
  },
  {
    id: 2,
    minTaplis: 5,
    nextStageAt: 15,
    moodLabel: 'Side Eye Alert',
    unlockToast: 'Stage 2 Unlocked · Side Eye Alert 👀',
    badgeBg: '#FFF0F5',
    badgeText: '#B53864',
    badgeBorder: 'rgba(217, 75, 125, 0.36)',
    stageAuraCenter: '#FFC8DC',
    stageAuraOpacity: 0.48,
    popWords: ['OYE!', 'BONK!', 'RUK JA!'],
    dialogues: [
      'Bas kar bhai, sar kharab kar diya!',
      "Height waise hi 5'2 hai, aur chhota mat kar!",
      'Itni himmat? Birthday ke din tapli?!',
      'Tanya ko bula lungi main, warning de rahi hu!',
      'Side eye mil rahi hai full HD me!',
    ],
  },
  {
    id: 3,
    minTaplis: 15,
    nextStageAt: 30,
    moodLabel: 'Pouty & Offended',
    unlockToast: 'Stage 3 Unlocked · Pouty & Offended 😤',
    badgeBg: '#FFEBF0',
    badgeText: '#C23155',
    badgeBorder: 'rgba(216, 65, 98, 0.42)',
    stageAuraCenter: '#FFBACB',
    stageAuraOpacity: 0.54,
    popWords: ['THAP!', "5'2 ALERT!", 'GAWAAR!'],
    dialogues: [
      'AB MAIN SACCHI ME GUSSA HO JAUNGI!',
      'Gawaar insaan, haath rok apna!',
      'Mera dimaag hil gaya poora!',
      'Tapli marne ka contract liya hai kya?',
      'Case File #0721 me add karungi ye crime!',
      'Baad me hisaab barabar karungi tera!',
    ],
  },
  {
    id: 4,
    minTaplis: 30,
    nextStageAt: 50,
    moodLabel: 'Full Tomato Mode',
    unlockToast: 'Stage 4 Unlocked · Full Tomato Mode 🍅',
    badgeBg: '#FFE5E4',
    badgeText: '#B92B34',
    badgeBorder: 'rgba(229, 85, 85, 0.45)',
    stageAuraCenter: '#FFA8A2',
    stageAuraOpacity: 0.62,
    popWords: ['TAMATAR!', 'STEAM ON!', 'BAAD ME!'],
    dialogues: [
      'POORA TAMATAR BANA DIYA MUJHE!',
      'Bhaap nikal rahi hai kaan se ab!',
      "5'2 se seedha 4'11 kar diya tune!",
      'SOS! Koi iski ungli band karo!',
      'Headache sponsored by you today!',
    ],
  },
  {
    id: 5,
    minTaplis: 50,
    nextStageAt: 75,
    moodLabel: 'Dizzy Chaos',
    unlockToast: 'Stage 5 Unlocked · Dizzy Chaos 💫',
    badgeBg: '#FFE7EE',
    badgeText: '#B52B52',
    badgeBorder: 'rgba(226, 86, 122, 0.45)',
    stageAuraCenter: '#FFA8BE',
    stageAuraOpacity: 0.6,
    popWords: ['CHAKKAR!', "4'11 CLUB!", 'SOS!'],
    dialogues: [
      'Sab ghoom raha hai... AYUSH bhi do dikh rahe!',
      'Taare zameen par dikha diye tune!',
      'Network gaya mera, dimaag buffering...',
      'Chakkar aa rahe hai, bas kar yaar!',
      'Duniya gol hai par mera sar zyada ghoom raha!',
    ],
  },
  {
    id: 6,
    minTaplis: 75,
    nextStageAt: 100,
    moodLabel: 'Drama Queen Tears',
    unlockToast: 'Stage 6 Unlocked · Drama Queen Tears 🎭',
    badgeBg: '#FFEAF4',
    badgeText: '#A82E6B',
    badgeBorder: 'rgba(216, 84, 152, 0.44)',
    stageAuraCenter: '#FFB8D6',
    stageAuraOpacity: 0.58,
    popWords: ['MUMMY!!', 'CASE FILE!', 'DRAMA!'],
    dialogues: [
      'Mummy!! Dekho birthday par maar raha hai!',
      'Bandage lagwana padega ab maathe par!',
      'Isse accha toh 2 ghante chat hi kar leti!',
      'Itna zulm ek chhoti si 17 saal ki ladki par?!',
      'Court me milungi ab seedha!',
    ],
  },
  {
    id: 7,
    minTaplis: 100,
    nextStageAt: 150,
    moodLabel: 'Soul Left The Body',
    unlockToast: 'Stage 7 Unlocked · Soul Left The Body 👻',
    badgeBg: '#F4EEFB',
    badgeText: '#6F4994',
    badgeBorder: 'rgba(155, 118, 198, 0.46)',
    stageAuraCenter: '#DFD2F2',
    stageAuraOpacity: 0.64,
    popWords: ['SOUL OUT!', '100+ CLUB!', 'NO BRAIN!'],
    dialogues: [
      'Aatma sharir chhod ke nikal gayi meri...',
      'No thoughts, only empty brain now.',
      '100 taplis?! Berozgari ka world record!',
      'System hang ho gaya Anamika.exe ka.',
      'Haan haan aur maar lo, main toh upar hu ab.',
    ],
  },
  {
    id: 8,
    minTaplis: 150,
    nextStageAt: null,
    moodLabel: 'Tapli Zen Goddess',
    unlockToast: 'Stage 8 Unlocked · Tapli Zen Goddess 👑',
    badgeBg: '#FFF7E6',
    badgeText: '#9E621C',
    badgeBorder: 'rgba(230, 184, 92, 0.56)',
    stageAuraCenter: '#FFE39D',
    stageAuraOpacity: 0.68,
    popWords: ['ZEN MODE!', 'IMMUNE!', 'LEGEND!'],
    dialogues: [
      'Theek hai maar le, ab aadat ho gayi hai...',
      'Inner peace unlocked. Tapli proof hu ab.',
      'Official Tapli Zen Queen 2026 achieved!',
      'Ungli nahi dukh rahi kya teri 150 par?!',
      'Enlightenment achieved through pure tapli.',
    ],
  },
] as const;

export const TAPLI_POP_WORDS: readonly string[] = TAPLI_STAGES.flatMap((s) => [...s.popWords]);

export const TAPLI_MODINO_MILESTONES: Record<TapliMilestone, ModinoReaction> = {
  1: {
    text: 'Oye! Birthday girl ko pehli tapli pad gayi! 👋😂',
    mood: 'surprised',
    sfx: 'surprise_bling',
  },
  5: {
    text: 'Side eye alert! Haath halka rakho bhai! 👀😆',
    mood: 'laugh',
    sfx: 'giggle',
  },
  15: {
    text: 'Tapli combo unlocked! Pouty mode ON ho gaya! 😤👋',
    mood: 'jump',
    sfx: 'jump',
  },
  30: {
    text: 'Oye! Poora tamatar bana diya Anamika ko! 🍅😂',
    mood: 'laugh',
    sfx: 'giggle',
  },
  50: {
    text: "5'2 se 4'11 kar doge kya birthday pe?! Chakkar aa gaye! 💫😂",
    mood: 'surprised',
    sfx: 'surprise_bling',
  },
  75: {
    text: 'Drama Queen mode active! Forehead bandage bulao! 🩹🎭',
    mood: 'laugh',
    sfx: 'giggle',
  },
  100: {
    text: '100 taplis?! Aatma nikal gayi Anamika ki! 👻😂',
    mood: 'surprised',
    sfx: 'confetti_burst',
  },
  150: {
    text: 'Tapli Zen Queen ban gayi wo ab, haar maan le! 👑✨',
    mood: 'happy_smile',
    sfx: 'confetti_burst',
  },
};

export function getTapliStage(sessionTaplis: number): TapliStageConfig {
  const safeCount = Math.max(0, Math.floor(sessionTaplis));
  if (safeCount >= 150) return TAPLI_STAGES[7];
  if (safeCount >= 100) return TAPLI_STAGES[6];
  if (safeCount >= 75) return TAPLI_STAGES[5];
  if (safeCount >= 50) return TAPLI_STAGES[4];
  if (safeCount >= 30) return TAPLI_STAGES[3];
  if (safeCount >= 15) return TAPLI_STAGES[2];
  if (safeCount >= 5) return TAPLI_STAGES[1];
  return TAPLI_STAGES[0];
}

export function getTapliMilestone(sessionTaplis: number): TapliMilestone | null {
  const safe = Math.floor(sessionTaplis);
  for (const milestone of TAPLI_MILESTONES) {
    if (safe === milestone) return milestone;
  }
  return null;
}

export function isTapliStageUnlock(sessionTaplis: number): boolean {
  const safe = Math.floor(sessionTaplis);
  return (TAPLI_STAGE_UNLOCK_THRESHOLDS as readonly number[]).includes(safe);
}

export function isTapliAnalyticsMilestone(sessionTaplis: number): boolean {
  const safe = Math.floor(sessionTaplis);
  return (TAPLI_ANALYTICS_MILESTONES as readonly number[]).includes(safe);
}

export function getTapliStageProgress(sessionTaplis: number): TapliStageProgress {
  const safe = Math.max(0, Math.floor(sessionTaplis));
  const stage = getTapliStage(safe);

  if (stage.nextStageAt === null) {
    return {
      stageIndex: stage.id,
      totalStages: 8,
      moodLabel: stage.moodLabel,
      pct: 100,
      nextHint: 'Max zen unlocked',
    };
  }

  const stageSpan = Math.max(1, stage.nextStageAt - stage.minTaplis);
  const inStagePct = Math.min(1, Math.max(0, (safe - stage.minTaplis) / stageSpan));
  const overallPct = Math.min(100, Math.round((((stage.id - 1) + inStagePct) / 7) * 100));

  return {
    stageIndex: stage.id,
    totalStages: 8,
    moodLabel: stage.moodLabel,
    pct: Math.max(safe === 0 ? 5 : 8, overallPct),
    nextHint: `Next mood at ${stage.nextStageAt}`,
  };
}

/**
 * Resolves directional swing side from pointer X relative to stage center.
 * Left half (< 42%) swings from left (-1), right half (> 58%) swings from right (+1),
 * center zone alternates cleanly with tap count.
 */
export function resolveTapliDirection(
  relativeX01: number | null,
  tapCount: number,
): TapliDirection {
  if (relativeX01 !== null && Number.isFinite(relativeX01)) {
    if (relativeX01 < 0.42) return -1;
    if (relativeX01 > 0.58) return 1;
  }
  return tapCount % 2 === 0 ? 1 : -1;
}

interface RgbTuple {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RgbTuple {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RgbTuple): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpNum(a: number, b: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return a + (b - a) * clamped;
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: lerpNum(a.r, b.r, t),
    g: lerpNum(a.g, b.g, t),
    b: lerpNum(a.b, b.b, t),
  });
}

interface HeatStop {
  taps: number;
  skinTop: string;
  skinBottom: string;
  blushColor: string;
  blushOpacity: number;
}

const HEAT_STOPS: readonly HeatStop[] = [
  { taps: 0, skinTop: '#FDE1CE', skinBottom: '#F4C7AD', blushColor: '#FF8CAE', blushOpacity: 0.34 },
  { taps: 5, skinTop: '#FCD5C2', skinBottom: '#F3B7A4', blushColor: '#F7799B', blushOpacity: 0.52 },
  { taps: 15, skinTop: '#FBC1B2', skinBottom: '#EE9A8E', blushColor: '#EE5D7D', blushOpacity: 0.72 },
  { taps: 30, skinTop: '#FA9E94', skinBottom: '#E86F6A', blushColor: '#E84D5B', blushOpacity: 0.94 },
  { taps: 50, skinTop: '#FA9289', skinBottom: '#E66460', blushColor: '#E64658', blushOpacity: 0.92 },
  { taps: 75, skinTop: '#FBA79F', skinBottom: '#EB7E7A', blushColor: '#EA5E78', blushOpacity: 0.86 },
  { taps: 99, skinTop: '#FBA79F', skinBottom: '#EB7E7A', blushColor: '#EA5E78', blushOpacity: 0.86 },
];

/**
 * Computes continuous smooth skin/blush/aura palette & stage prop flags for all 8 stages.
 */
export function computeTapliVisualPalette(sessionTaplis: number): TapliVisualPalette {
  const taps = Math.max(0, sessionTaplis);
  const stage = getTapliStage(taps);
  const heat = Math.min(1, taps / TAPLI_HEAT_MAX_TAPS);

  let skinTop: string;
  let skinBottom: string;
  let blushColor: string;
  let blushOpacity: number;

  if (stage.id === 7) {
    skinTop = '#F2EBF5';
    skinBottom = '#DDD1E8';
    blushColor = '#C5B0D6';
    blushOpacity = 0.42;
  } else if (stage.id === 8) {
    skinTop = '#FDE0CF';
    skinBottom = '#F5C4AC';
    blushColor = '#F383A6';
    blushOpacity = 0.58;
  } else {
    let lower = HEAT_STOPS[0];
    let upper = HEAT_STOPS[HEAT_STOPS.length - 1];

    for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
      const a = HEAT_STOPS[i];
      const b = HEAT_STOPS[i + 1];
      if (taps >= a.taps && taps <= b.taps) {
        lower = a;
        upper = b;
        break;
      }
    }
    if (taps >= HEAT_STOPS[HEAT_STOPS.length - 1].taps) {
      lower = HEAT_STOPS[HEAT_STOPS.length - 1];
      upper = HEAT_STOPS[HEAT_STOPS.length - 1];
    }

    const span = Math.max(1, upper.taps - lower.taps);
    const localT = upper.taps === lower.taps ? 1 : Math.max(0, Math.min(1, (taps - lower.taps) / span));

    skinTop = lerpHex(lower.skinTop, upper.skinTop, localT);
    skinBottom = lerpHex(lower.skinBottom, upper.skinBottom, localT);
    blushColor = lerpHex(lower.blushColor, upper.blushColor, localT);
    blushOpacity = Number(lerpNum(lower.blushOpacity, upper.blushOpacity, localT).toFixed(3));
  }

  const skinMid = lerpHex(skinTop, skinBottom, 0.52);

  const progress = getTapliStageProgress(taps);
  let moodBarStart = lerpHex('#F6B99F', '#F06A7A', Math.min(1, taps / 50));
  let moodBarEnd = lerpHex('#E67C9F', '#E44E58', Math.min(1, taps / 50));

  if (stage.id === 7) {
    moodBarStart = '#B89BD9';
    moodBarEnd = '#8D6BB8';
  } else if (stage.id === 8) {
    moodBarStart = '#F2C063';
    moodBarEnd = '#E68FA8';
  }

  return {
    stageId: stage.id,
    heat: Number(heat.toFixed(4)),
    skinTop,
    skinMid,
    skinBottom,
    blushColor,
    blushOpacity,
    moodBarPct: progress.pct,
    moodBarStart,
    moodBarEnd,
    auraCenter: stage.stageAuraCenter,
    auraOpacity: stage.stageAuraOpacity,
    showAngerMark: stage.id === 3 || stage.id === 4,
    showHeadBump: stage.id === 4 || stage.id === 5,
    showSteamPuffs: stage.id === 4,
    showDizzyRing: stage.id === 5,
    showOrbitStars: stage.id === 5,
    showDramaStreaks: stage.id === 6,
    showBandage: stage.id === 6,
    showGhostSoul: stage.id === 7,
    showZenHalo: stage.id === 8,
    showZenRays: stage.id === 8,
  };
}

/**
 * Picks a witty dialogue for the current stage, strictly never repeating
 * the exact previous dialogue line back-to-back.
 */
export function pickNextTapliDialogue(
  stageId: TapliStageId,
  previousLine: string,
  randomFn: () => number = Math.random,
): string {
  const stage = TAPLI_STAGES.find((s) => s.id === stageId) ?? TAPLI_STAGES[0];
  const candidates = stage.dialogues.filter((line) => line !== previousLine);
  const pool = candidates.length > 0 ? candidates : stage.dialogues;
  const idx = Math.min(pool.length - 1, Math.floor(Math.max(0, randomFn()) * pool.length));
  return pool[idx];
}

/**
 * Computes rapid-tapping combo state within the 680ms chain window.
 * Starting at 10x combo, activates Golden Combo Overdrive.
 */
export function computeTapliCombo(
  prevCombo: number,
  lastTapMs: number | null,
  nowMs: number,
): TapliComboState {
  const withinWindow =
    lastTapMs !== null && nowMs >= lastTapMs && nowMs - lastTapMs <= TAPLI_COMBO_WINDOW_MS;
  const count = withinWindow ? prevCombo + 1 : 1;
  const isOverdrive = count >= TAPLI_OVERDRIVE_THRESHOLD;

  if (count >= 30) {
    return { count, label: `${count}x Unstoppable!`, isOverdrive };
  }
  if (count >= 15) {
    return { count, label: `${count}x Turbo Tapli!`, isOverdrive };
  }
  if (count >= 5) {
    return { count, label: `${count}x Streak!`, isOverdrive };
  }
  if (count >= 3) {
    return { count, label: `Combo x${count}`, isOverdrive };
  }
  return { count, label: null, isOverdrive: false };
}

export function pickTapliPopWord(stageId: TapliStageId, tapIndex: number): string {
  const stage = TAPLI_STAGES.find((s) => s.id === stageId) ?? TAPLI_STAGES[0];
  const safe = Math.abs(Math.floor(tapIndex));
  return stage.popWords[safe % stage.popWords.length];
}

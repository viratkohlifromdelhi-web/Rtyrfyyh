import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AnamikaGrowingGirl,
  AnamikaNewborn,
  AnamikaTeen,
  AnamikaToddler,
  ArchanaCharacter,
  ShivjeeCharacter,
  type AnamikaTeenExpression,
  type ArchanaMood,
  type ShivjeeMood,
} from './OriginCharacters';
import { OriginStageBackdrop, type OriginKissBeat } from './OriginStageBackdrop';
import {
  FIVE_TWO_INCHES,
  ORIGIN_CAPTION_KEYWORDS,
  ORIGIN_RULER_TICKS,
  ORIGIN_SCENES,
  ORIGIN_TOTAL_SCENES,
  PREGNANCY_MONTH_DURATION_MS,
  SCENE5_KISS_TIMING,
  SCENE_10_FREEZE_STEPS,
  SCENE_8_GROWTH_STEPS,
  SCENE_9_GROWTH_STEPS,
  computeScene5SyncedTimings,
  getOriginFinaleCopy,
  getOriginRomanticGlowIntensity,
  getScene5KissPose,
  inchesToStageBottomPct,
  type GrowthStep,
  type KissPhase,
  type KissWalkStage,
  type OriginBackdropMood,
} from './originScript';
import {
  getKissAudioDurationMs,
  stopKissAudio,
  unlockKissAudioContext,
} from './kissAudioSingleton';
import { OriginStoryAudioController } from './originAudio';
import { haptics } from '../../utils/haptics';

export interface OriginStoryPlayProps {
  onComplete: () => void;
  onSkip: (skippedAtMs: number) => void;
  /** Interrupts any lingering Stage 2 trailing intro video audio with a fast 150ms fade */
  onInterruptIntroAudio?: () => void;
}

interface HeartSpec {
  id: number;
  leftPct: number;
  delaySec: number;
  durSec: number;
  dxMid: number;
  dxEnd: number;
  color: string;
  sizePx: number;
}

interface ConfettiSpec {
  id: number;
  leftPct: number;
  topPct: number;
  dx: number;
  dy: number;
  rot: number;
  delaySec: number;
  durSec: number;
  color: string;
  widthPx: number;
  heightPx: number;
  wave: 1 | 2;
}

/**
 * 9 delicate small pastel rose & champagne-gold hearts rising directly from the
 * center lip-contact point during the 3.5s Phase 4 kiss hold (2.4s -> 5.9s).
 */
const KISS_HEARTS: readonly HeartSpec[] = [
  { id: 1, leftPct: 49, delaySec: 0.0, durSec: 1.95, dxMid: -9, dxEnd: -15, color: '#F9A8C9', sizePx: 13 },
  { id: 2, leftPct: 51, delaySec: 0.24, durSec: 2.0, dxMid: 10, dxEnd: 16, color: '#F7D994', sizePx: 11 },
  { id: 3, leftPct: 50, delaySec: 0.52, durSec: 2.05, dxMid: -5, dxEnd: 8, color: '#F48EB8', sizePx: 14 },
  { id: 4, leftPct: 48.5, delaySec: 0.85, durSec: 1.95, dxMid: -11, dxEnd: -13, color: '#FFE7A8', sizePx: 12 },
  { id: 5, leftPct: 51.5, delaySec: 1.18, durSec: 2.0, dxMid: 9, dxEnd: 14, color: '#F9B5D2', sizePx: 13 },
  { id: 6, leftPct: 50, delaySec: 1.52, durSec: 2.05, dxMid: -7, dxEnd: 10, color: '#E6B85C', sizePx: 11 },
  { id: 7, leftPct: 49, delaySec: 1.88, durSec: 1.9, dxMid: -10, dxEnd: -12, color: '#F27BA9', sizePx: 14 },
  { id: 8, leftPct: 51, delaySec: 2.22, durSec: 1.8, dxMid: 8, dxEnd: 11, color: '#FCE0A2', sizePx: 12 },
  { id: 9, leftPct: 50, delaySec: 2.55, durSec: 1.65, dxMid: -4, dxEnd: 6, color: '#F49AC0', sizePx: 12 },
];

interface BokehOrbSpec {
  id: number;
  leftPct: number;
  bottomPct: number;
  sizePx: number;
  color: string;
  delaySec: number;
  durSec: number;
  dx: number;
}

interface CornerBurstSpec {
  id: number;
  side: 'left' | 'right';
  dx: number;
  dy: number;
  rot: number;
  delaySec: number;
  color: string;
  widthPx: number;
  heightPx: number;
}

/**
 * 26 lightweight pastel rose, blush, champagne-gold, lilac, and ivory ribbons/petals
 * rising and fluttering strictly in Layer 1 behind typography and character.
 */
const FINALE_CONFETTI: readonly ConfettiSpec[] = Array.from({ length: 26 }, (_, idx) => {
  const palette = ['#F27BA9', '#E6B85C', '#F7D994', '#E3B8F2', '#FFF9EE', '#F8BDD6', '#E25B8B'];
  const wave: 1 | 2 = idx < 13 ? 1 : 2;
  const spread = ((idx % 13) - 6) * 22;
  return {
    id: idx + 1,
    leftPct: 5 + ((idx * 19) % 90),
    topPct: 6 + ((idx * 13) % 26),
    dx: Math.round(spread * 0.44),
    dy: 165 + (idx % 5) * 28,
    rot: (idx % 2 === 0 ? 1 : -1) * (150 + (idx % 6) * 42),
    delaySec: Number(((wave === 2 ? 0.42 : 0.08) + (idx % 7) * 0.14).toFixed(2)),
    durSec: Number((2.4 + (idx % 4) * 0.45).toFixed(2)),
    color: palette[idx % palette.length],
    widthPx: idx % 3 === 0 ? 9 : 6.5,
    heightPx: idx % 3 === 0 ? 5 : 10,
    wave,
  };
});

/**
 * Twin bottom-left and bottom-right corner confetti bursts curving gently upward along the outer edges.
 */
const FINALE_CORNER_BURSTS: readonly CornerBurstSpec[] = [
  { id: 1, side: 'left', dx: 26, dy: -115, rot: -140, delaySec: 0.02, color: '#F27BA9', widthPx: 9, heightPx: 5 },
  { id: 2, side: 'left', dx: 44, dy: -150, rot: 120, delaySec: 0.06, color: '#F6D38A', widthPx: 7, heightPx: 10 },
  { id: 3, side: 'left', dx: 18, dy: -172, rot: -95, delaySec: 0.1, color: '#E3B8F2', widthPx: 8, heightPx: 5 },
  { id: 4, side: 'left', dx: 58, dy: -124, rot: 165, delaySec: 0.14, color: '#FFF7E8', widthPx: 6.5, heightPx: 9 },
  { id: 5, side: 'left', dx: 34, dy: -195, rot: -155, delaySec: 0.18, color: '#E25B8B', widthPx: 8.5, heightPx: 5 },
  { id: 6, side: 'left', dx: 14, dy: -135, rot: 110, delaySec: 0.22, color: '#F8BDD6', widthPx: 7, heightPx: 7 },
  { id: 7, side: 'right', dx: -26, dy: -115, rot: 140, delaySec: 0.02, color: '#F27BA9', widthPx: 9, heightPx: 5 },
  { id: 8, side: 'right', dx: -44, dy: -150, rot: -120, delaySec: 0.06, color: '#F6D38A', widthPx: 7, heightPx: 10 },
  { id: 9, side: 'right', dx: -18, dy: -172, rot: 95, delaySec: 0.1, color: '#E3B8F2', widthPx: 8, heightPx: 5 },
  { id: 10, side: 'right', dx: -58, dy: -124, rot: -165, delaySec: 0.14, color: '#FFF7E8', widthPx: 6.5, heightPx: 9 },
  { id: 11, side: 'right', dx: -34, dy: -195, rot: 155, delaySec: 0.18, color: '#E25B8B', widthPx: 8.5, heightPx: 5 },
  { id: 12, side: 'right', dx: -14, dy: -135, rot: -110, delaySec: 0.22, color: '#F8BDD6', widthPx: 7, heightPx: 7 },
];

/**
 * Soft drifting champagne-gold and blush bokeh orbs continuously rising behind Scene 11.
 */
const FINALE_BOKEH_ORBS: readonly BokehOrbSpec[] = [
  { id: 1, leftPct: 12, bottomPct: 8, sizePx: 16, color: 'rgba(246, 211, 138, 0.32)', delaySec: 0.1, durSec: 4.6, dx: 10 },
  { id: 2, leftPct: 24, bottomPct: 16, sizePx: 12, color: 'rgba(249, 184, 212, 0.34)', delaySec: 0.9, durSec: 5.1, dx: -12 },
  { id: 3, leftPct: 82, bottomPct: 12, sizePx: 18, color: 'rgba(246, 211, 138, 0.28)', delaySec: 0.4, durSec: 4.9, dx: -10 },
  { id: 4, leftPct: 72, bottomPct: 22, sizePx: 11, color: 'rgba(227, 184, 242, 0.32)', delaySec: 1.4, durSec: 4.4, dx: 9 },
  { id: 5, leftPct: 18, bottomPct: 34, sizePx: 10, color: 'rgba(255, 245, 224, 0.45)', delaySec: 1.9, durSec: 5.4, dx: 8 },
  { id: 6, leftPct: 88, bottomPct: 30, sizePx: 13, color: 'rgba(249, 184, 212, 0.3)', delaySec: 1.1, durSec: 4.8, dx: -8 },
  { id: 7, leftPct: 36, bottomPct: 10, sizePx: 9, color: 'rgba(246, 211, 138, 0.3)', delaySec: 2.3, durSec: 4.7, dx: 6 },
  { id: 8, leftPct: 64, bottomPct: 8, sizePx: 14, color: 'rgba(249, 184, 212, 0.28)', delaySec: 2.0, durSec: 5.2, dx: -7 },
];

/**
 * Highlights storytelling keywords in Warm Rose Berry (#D94B7D) inside the editorial subtitle card.
 */
function renderHighlightedCaption(caption: string): ReactNode {
  const escaped = ORIGIN_CAPTION_KEYWORDS.map((kw) =>
    kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = caption.split(pattern);

  return parts.map((part, idx) => {
    const isKeyword = ORIGIN_CAPTION_KEYWORDS.includes(part);
    if (isKeyword) {
      return (
        <span key={idx} className="font-bold text-[#D94B7D]">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function OriginStoryPlay({
  onComplete,
  onSkip,
  onInterruptIntroAudio,
}: OriginStoryPlayProps) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneRunKey, setSceneRunKey] = useState(0);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Scene 5 (5-Phase Realistic Step-Closer Starry Kiss) state
  const [kissWalkStage, setKissWalkStage] = useState<KissWalkStage>('moonlight');
  const [kissPhase, setKissPhase] = useState<KissPhase>('approach');
  const [kissBeat, setKissBeat] = useState<OriginKissBeat>('twilight');
  const [isKissAudioPlaying, setIsKissAudioPlaying] = useState(false);

  // Scene 6 (Nine Months) state
  const [pregnancyMonth, setPregnancyMonth] = useState(1);

  // Scene 8, 9, 10 growth timeline state
  const [activeGrowthStep, setActiveGrowthStep] = useState<GrowthStep>(SCENE_8_GROWTH_STEPS[0]);
  const [scene9SecondaryActive, setScene9SecondaryActive] = useState(false);

  // Scene 10 (Padlock Freeze) state
  const [teenExpression, setTeenExpression] = useState<AnamikaTeenExpression>('happy');
  const [isBonkHopping, setIsBonkHopping] = useState(false);
  const [barrierJiggleKey, setBarrierJiggleKey] = useState(0);

  const audioRef = useRef<OriginStoryAudioController | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  const exitingRef = useRef(false);
  const kissVisitCounterRef = useRef(0);
  const activeKissSessionRef = useRef<string | null>(null);
  const isMutedRef = useRef(false);

  const finaleCopy = useMemo(() => getOriginFinaleCopy(), []);
  const currentScene = ORIGIN_SCENES[sceneIndex] ?? ORIGIN_SCENES[0];
  const isStarryScene = currentScene.id === 'starry_kiss';
  const isPadlockScene = currentScene.id === 'padlock_freeze';
  const isFinaleScene = currentScene.id === 'grand_finale';
  const fiveTwoBottomPct = useMemo(() => inchesToStageBottomPct(FIVE_TWO_INCHES), []);

  const activeBackdropMood: OriginBackdropMood = currentScene.backdropMood;

  const clearScheduledTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, delayMs);
    timersRef.current.add(id);
    return id;
  }, []);

  // Initialize & dispose audio controller once
  useEffect(() => {
    const controller = new OriginStoryAudioController();
    audioRef.current = controller;
    return () => {
      clearScheduledTimers();
      controller.dispose();
      audioRef.current = null;
    };
  }, [clearScheduledTimers]);

  // Sync mute state cleanly
  useEffect(() => {
    isMutedRef.current = isMuted;
    audioRef.current?.setMuted(isMuted);
  }, [isMuted]);

  /**
   * Starts Scene 5's singleton kiss track immediately (0ms) with a unique session key.
   * Calling this directly inside user-tap handlers (`Next >`, `< Back`, `Replay Kiss`)
   * unlocks instant mobile playback while preventing Scene 5's `useEffect` from double-starting.
   */
  const startScene5KissAudio = useCallback(
    (restart: boolean) => {
      onInterruptIntroAudio?.();
      if (isMutedRef.current) {
        setIsKissAudioPlaying(false);
        return;
      }

      if (!restart && activeKissSessionRef.current) {
        return;
      }

      kissVisitCounterRef.current += 1;
      const sessionKey = `kiss-visit-${kissVisitCounterRef.current}`;
      activeKissSessionRef.current = sessionKey;
      setIsKissAudioPlaying(true);
      audioRef.current?.startKissCue({
        restart: true,
        sessionKey,
        onEnded: () => {
          if (activeKissSessionRef.current === sessionKey) {
            setIsKissAudioPlaying(false);
          }
        },
      });
    },
    [onInterruptIntroAudio],
  );

  // Lock body scroll while theatrical overlay is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Scene-by-scene dedicated choreography runner (never auto-advances between scenes)
  useEffect(() => {
    clearScheduledTimers();
    const scene = ORIGIN_SCENES[sceneIndex];
    if (!scene) return;

    if (scene.id !== 'starry_kiss') {
      activeKissSessionRef.current = null;
      setIsKissAudioPlaying(false);
      audioRef.current?.fadeOutAllAndStop(140);
    }
    setSceneSettled(false);

    if (scene.id === 'prologue') {
      schedule(() => setSceneSettled(true), scene.settleDurationMs);
      return clearScheduledTimers;
    }

    if (scene.id === 'meet_father' || scene.id === 'meet_mother') {
      schedule(() => {
        audioRef.current?.playMorningPop();
      }, 240);
      schedule(() => setSceneSettled(true), scene.settleDurationMs);
      return clearScheduledTimers;
    }

    if (scene.id === 'happy_together') {
      schedule(() => {
        audioRef.current?.playMorningPop();
      }, 220);
      schedule(() => setSceneSettled(true), scene.settleDurationMs);
      return clearScheduledTimers;
    }

    if (scene.id === 'starry_kiss') {
      // 0ms Instant Start: Silence any lingering Stage 2 trailing intro audio and start Scene 5 song immediately.
      // If `handleNext` / `handleBack` / `handleReplayScene` already started it synchronously on tap,
      // `startScene5KissAudio(false)` is a clean no-op with zero double-start.
      startScene5KissAudio(false);

      // Sync kiss-to-afterglow transition with actual decoded & silence-trimmed clip duration
      const syncedTiming = computeScene5SyncedTimings(getKissAudioDurationMs());

      // Phase 1 (0ms -> 750ms): Moonlight Eye Contact (standing apart, glancing shyly toward each other)
      setKissWalkStage('moonlight');
      setKissPhase('approach');
      setKissBeat('twilight');

      // Phase 2 (750ms -> 1850ms): 2.5 gentle walking steps closer together
      schedule(() => {
        setKissWalkStage('stepping');
        setKissPhase('approach');
        setKissBeat('shyGlance');
      }, syncedTiming.phase2StepStartMs);

      // Phase 3 (1850ms -> 2400ms): Tender Lean-In, neck-pivoted head tilts & inner arm embrace
      schedule(() => {
        setKissWalkStage('leanIn');
        setKissPhase('leanIn');
        setKissBeat('leanIn');
      }, syncedTiming.phase3LeanInStartMs);

      // Phase 4 (2400ms -> afterglow): Realistic Kiss Hold + soft haptic + hearts + 2 shooting stars
      schedule(() => {
        setKissWalkStage('kissing');
        setKissPhase('kissing');
        setKissBeat('kissing');
        try {
          haptics.light();
        } catch {
          // silent haptic fallback
        }
      }, syncedTiming.phase4KissStartMs);

      // Phase 5 (synced with final notes of decoded clip): Shy Pull-Back & Glowing Afterglow
      schedule(() => {
        setKissWalkStage('afterglow');
        setKissPhase('afterglow');
        setKissBeat('afterglow');
      }, syncedTiming.phase5AfterglowStartMs);

      // Mark Scene 5 settled once shy pull-back completes (Next button stays tappable at any time)
      schedule(() => {
        setSceneSettled(true);
      }, syncedTiming.settleMs);

      return clearScheduledTimers;
    }

    if (scene.id === 'nine_months') {
      setPregnancyMonth(1);
      schedule(() => {
        audioRef.current?.playMonthFlipTick(1);
      }, 120);

      for (let month = 2; month <= 9; month += 1) {
        const delay = (month - 1) * PREGNANCY_MONTH_DURATION_MS;
        schedule(() => {
          setPregnancyMonth(month);
          audioRef.current?.playMonthFlipTick(month);
          haptics.tick();
        }, delay);
      }

      schedule(() => setSceneSettled(true), scene.settleDurationMs);
      return clearScheduledTimers;
    }

    if (scene.id === 'anamika_born') {
      schedule(() => {
        audioRef.current?.playArrivalBell();
        haptics.celebrate();
      }, 260);
      schedule(() => setSceneSettled(true), scene.settleDurationMs);
      return clearScheduledTimers;
    }

    if (scene.id === 'baby_to_toddler') {
      setActiveGrowthStep(SCENE_8_GROWTH_STEPS[0]);
      let elapsed = 0;

      SCENE_8_GROWTH_STEPS.forEach((step, idx) => {
        if (idx > 0) {
          const triggerAt = elapsed;
          schedule(() => {
            setActiveGrowthStep(step);
            audioRef.current?.playYearTick(step.age);
            haptics.tick();
          }, triggerAt);
        }
        elapsed += step.durationMs;
      });

      schedule(() => setSceneSettled(true), elapsed);
      return clearScheduledTimers;
    }

    if (scene.id === 'growing_to_14') {
      setScene9SecondaryActive(false);
      setActiveGrowthStep(SCENE_9_GROWTH_STEPS[0]);
      let elapsed = 0;

      SCENE_9_GROWTH_STEPS.forEach((step, idx) => {
        const triggerAt = elapsed;
        if (idx > 0) {
          schedule(() => {
            setActiveGrowthStep(step);
            if (step.age >= 10) {
              setScene9SecondaryActive(true);
              audioRef.current?.playYearTick(step.age);
              haptics.light();
            } else {
              audioRef.current?.playMonthFlipTick(step.age);
            }
          }, triggerAt);
        }
        elapsed += step.durationMs;
      });

      schedule(() => setSceneSettled(true), elapsed);
      return clearScheduledTimers;
    }

    if (scene.id === 'padlock_freeze') {
      // Scene 10 of 11: Plays ONLY the 14 -> 17 height-lock sequence (1000ms exact per year), then STOPS peacefully!
      setTeenExpression('happy');
      setIsBonkHopping(false);
      setBarrierJiggleKey(0);
      setActiveGrowthStep(SCENE_10_FREEZE_STEPS[0]);

      // Age 14 · 2023 · 5'2" (0.0s -> 1.0s): Padlock barrier snaps cleanly above her crown
      schedule(() => {
        audioRef.current?.playPadlockSlam();
        haptics.medium();
      }, 120);

      // Age 15 · 2024 · Still 5'2" (1.0s -> 2.0s): Year flips + cute question sparkle pops
      schedule(() => {
        setActiveGrowthStep(SCENE_10_FREEZE_STEPS[1]);
        setTeenExpression('happy');
        audioRef.current?.playYearTick(15);
        haptics.light();
      }, 1000);

      // Age 16 · 2025 · Still 5'2" (2.0s -> 3.0s): Tiptoe jump & bonk against the level 5'2" barrier
      schedule(() => {
        setActiveGrowthStep(SCENE_10_FREEZE_STEPS[2]);
        setTeenExpression('determined');
        setIsBonkHopping(true);
        audioRef.current?.playYearTick(16);
      }, 2000);

      // Peak of Age 16 -10px tiptoe hop: crown taps underside of level barrier + comic boing SFX + bonk haptic
      schedule(() => {
        setTeenExpression('bonkBlush');
        setBarrierJiggleKey((k) => k + 1);
        audioRef.current?.playComicBonk();
        haptics.bonk();
      }, 2240);

      schedule(() => {
        setIsBonkHopping(false);
      }, 2820);

      // Age 17 · 2026 · Still 5'2" (3.0s+): Cheeky proud 5'2" pose, golden shimmer telemetry lock, then STOP on Scene 10
      schedule(() => {
        setActiveGrowthStep(SCENE_10_FREEZE_STEPS[3]);
        setTeenExpression('proud52');
        audioRef.current?.playYearTick(17);
        haptics.light();
      }, 3000);

      // Pulse Next › softly once Scene 10 settles (NEVER auto-advances to Scene 11!)
      schedule(() => {
        setSceneSettled(true);
      }, scene.settleDurationMs);

      return clearScheduledTimers;
    }

    if (scene.id === 'grand_finale') {
      // Scene 11 of 11: Choreographed 3-Beat Grand Finale Entrance
      // Beat 1 (0 -> 400ms): Curtain shimmer + golden radial bloom + twin corner confetti bursts
      // Beat 2 (200 -> 650ms): Headline glide up + warm major-7th harp/bell sparkle chime + celebratory haptic
      schedule(() => {
        audioRef.current?.playFinaleSparkle();
        haptics.celebrate();
      }, 200);

      // Beat 3 (400 -> 900ms): AnamikaTeen celebratory bouncy hop + steady bokeh orbs
      schedule(() => {
        setSceneSettled(true);
      }, scene.settleDurationMs);

      return clearScheduledTimers;
    }

    return clearScheduledTimers;
  }, [sceneIndex, sceneRunKey, clearScheduledTimers, schedule, startScene5KissAudio]);

  const handleNext = useCallback(() => {
    if (exitingRef.current) return;
    haptics.tap();
    unlockKissAudioContext();

    if (sceneIndex < ORIGIN_TOTAL_SCENES - 1) {
      const nextScene = ORIGIN_SCENES[sceneIndex + 1];
      if (nextScene?.id === 'starry_kiss') {
        // Direct user-gesture unlock: starts pre-decoded Web Audio buffer in < 5ms right inside the tap
        startScene5KissAudio(true);
      } else {
        activeKissSessionRef.current = null;
        setIsKissAudioPlaying(false);
        stopKissAudio(false);
        audioRef.current?.fadeOutAllAndStop();
      }
      setSceneIndex((prev) => prev + 1);
    }
  }, [sceneIndex, startScene5KissAudio]);

  const handleBack = useCallback(() => {
    if (exitingRef.current || sceneIndex <= 0) return;
    haptics.tap();
    unlockKissAudioContext();

    const prevScene = ORIGIN_SCENES[sceneIndex - 1];
    if (prevScene?.id === 'starry_kiss') {
      // Direct user-gesture unlock when stepping back into Scene 5
      startScene5KissAudio(true);
    } else {
      activeKissSessionRef.current = null;
      setIsKissAudioPlaying(false);
      stopKissAudio(false);
      audioRef.current?.fadeOutAllAndStop();
    }
    setSceneIndex((prev) => Math.max(0, prev - 1));
  }, [sceneIndex, startScene5KissAudio]);

  const handleReplayScene = useCallback(() => {
    if (exitingRef.current) return;
    haptics.tap();
    unlockKissAudioContext();

    if (ORIGIN_SCENES[sceneIndex]?.id === 'starry_kiss') {
      // Direct user-gesture restart for "Replay Kiss"
      startScene5KissAudio(true);
    } else {
      activeKissSessionRef.current = null;
      setIsKissAudioPlaying(false);
      stopKissAudio(false);
      audioRef.current?.fadeOutAllAndStop();
    }
    setSceneRunKey((k) => k + 1);
  }, [sceneIndex, startScene5KissAudio]);

  const handleEnterBirthdayWorld = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    try {
      haptics.celebrate();
    } catch {
      // silent haptic fallback
    }
    activeKissSessionRef.current = null;
    setIsKissAudioPlaying(false);
    stopKissAudio(false);
    onInterruptIntroAudio?.();
    audioRef.current?.fadeOutAllAndStop();
    audioRef.current?.playFinaleSparkle();
    clearScheduledTimers();
    setIsExiting(true);
    onComplete();
  }, [clearScheduledTimers, onComplete, onInterruptIntroAudio]);

  const handleSkipStory = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    try {
      haptics.celebrate();
    } catch {
      // silent haptic fallback
    }
    activeKissSessionRef.current = null;
    setIsKissAudioPlaying(false);
    stopKissAudio(false);
    onInterruptIntroAudio?.();
    audioRef.current?.fadeOutAllAndStop();
    audioRef.current?.playFinaleSparkle();
    clearScheduledTimers();
    setIsExiting(true);
    onSkip(sceneIndex * 1000);
  }, [clearScheduledTimers, onInterruptIntroAudio, onSkip, sceneIndex]);

  const handleToggleMute = useCallback(() => {
    haptics.tap();
    setIsMuted((prev) => {
      const nextMuted = !prev;
      isMutedRef.current = nextMuted;
      if (nextMuted) {
        activeKissSessionRef.current = null;
        setIsKissAudioPlaying(false);
        stopKissAudio(false);
        onInterruptIntroAudio?.();
      } else {
        unlockKissAudioContext();
      }
      return nextMuted;
    });
  }, [onInterruptIntroAudio]);

  // Derive moods for Shivjee & Archana
  const shivjeeMood: ShivjeeMood =
    currentScene.id === 'happy_together'
      ? 'happyTogether'
      : currentScene.id === 'starry_kiss'
        ? kissBeat === 'kissing'
          ? 'blushKiss'
          : 'happyTogether'
        : currentScene.id === 'nine_months'
          ? pregnancyMonth >= 8
            ? 'amazed'
            : pregnancyMonth >= 4
              ? 'happyTogether'
              : 'calm'
          : currentScene.id === 'anamika_born'
            ? 'proudDad'
            : 'calm';

  const archanaMood: ArchanaMood =
    currentScene.id === 'happy_together'
      ? 'happyTogether'
      : currentScene.id === 'starry_kiss'
        ? kissBeat === 'kissing'
          ? 'blushKiss'
          : 'happyTogether'
        : currentScene.id === 'nine_months'
          ? 'glowingPregnant'
          : currentScene.id === 'anamika_born'
            ? 'proudMom'
            : 'calm';

  const activeCaption = useMemo(() => {
    if (isFinaleScene) {
      return finaleCopy.subcaption;
    }
    if (
      currentScene.id === 'growing_to_14' &&
      scene9SecondaryActive &&
      currentScene.secondaryCaption
    ) {
      return currentScene.secondaryCaption;
    }
    return currentScene.caption;
  }, [currentScene, isFinaleScene, finaleCopy.subcaption, scene9SecondaryActive]);

  const isGrowthRulerScene =
    currentScene.id === 'baby_to_toddler' ||
    currentScene.id === 'growing_to_14' ||
    isPadlockScene;

  const pointerBottomPct = inchesToStageBottomPct(activeGrowthStep.inches);
  const isAge17GoldLock = isPadlockScene && activeGrowthStep.age === 17;

  const isPregnancyMilestonePulse =
    currentScene.id === 'nine_months' &&
    (pregnancyMonth === 3 || pregnancyMonth === 6 || pregnancyMonth === 9);

  const romanticGlowLevel = getOriginRomanticGlowIntensity(currentScene.id, kissBeat);
  const isRomanticPeak = romanticGlowLevel === 'peak';
  const viewportGlowOpacity =
    romanticGlowLevel === 'peak'
      ? 1
      : romanticGlowLevel === 'building'
        ? 0.62
        : romanticGlowLevel === 'afterglow'
          ? 0.46
          : romanticGlowLevel === 'twilight'
            ? 0.36
            : 0.16;
  const stageWashOpacity =
    romanticGlowLevel === 'peak'
      ? 1
      : romanticGlowLevel === 'building'
        ? 0.58
        : romanticGlowLevel === 'afterglow'
          ? 0.38
          : romanticGlowLevel === 'twilight'
            ? 0.3
            : 0;

  return (
    <section
      aria-label="The Origin Story Play"
      data-testid="origin-story-play"
      data-scene-id={currentScene.id}
      data-scene-number={currentScene.sceneNumber}
      data-kiss-beat={isStarryScene ? kissBeat : undefined}
      data-scene-settled={sceneSettled ? 'true' : 'false'}
      className={`fixed inset-0 z-[9500] flex h-[100dvh] flex-col justify-between gap-[clamp(10px,2vh,16px)] overflow-hidden transition-all duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isExiting ? 'scale-[1.035] opacity-0 pointer-events-none' : 'scale-100 opacity-100'
      }`}
      style={{
        background: isStarryScene
          ? 'linear-gradient(180deg, #271334 0%, #562A55 54%, #A85781 100%)'
          : 'radial-gradient(circle at 50% 18%, #FFFDF9 0%, #FFF5FA 48%, #FCE9F2 100%)',
        transition:
          'background 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 380ms cubic-bezier(0.22, 1, 0.36, 1), transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Dynamic Pulsating Soft-Pink Romantic Lighting Overlay (intensifies during Scene 5 kiss) */}
      <div
        aria-hidden="true"
        data-testid="origin-romantic-glow"
        data-intensity={romanticGlowLevel}
        className="pointer-events-none fixed inset-0 z-[5] overflow-hidden transition-opacity duration-700 ease-out"
        style={{ opacity: viewportGlowOpacity }}
      >
        <div
          className={`absolute -inset-12 ${
            isRomanticPeak
              ? 'origin-story-romantic-pulse-peak'
              : 'origin-story-romantic-pulse-ambient'
          }`}
          style={{
            background: isStarryScene
              ? 'radial-gradient(circle at 50% 45%, rgba(255, 194, 222, 0.52) 0%, rgba(244, 114, 182, 0.32) 32%, rgba(217, 75, 125, 0.14) 56%, rgba(39, 19, 52, 0) 78%)'
              : 'radial-gradient(circle at 50% 42%, rgba(252, 198, 222, 0.42) 0%, rgba(249, 168, 201, 0.18) 44%, rgba(255, 248, 251, 0) 76%)',
          }}
        />
      </div>

      {/* Top Chrome: Single-line Sound On/Muted pill, 11-Scene Progress Counter, Single-line Skip Story pill */}
      <header className="relative z-30 mx-auto flex w-[min(94vw,640px)] shrink-0 items-center justify-between gap-2 px-1 pt-[max(10px,env(safe-area-inset-top))] sm:pt-3.5">
        <button
          type="button"
          onClick={handleToggleMute}
          data-testid="origin-mute-btn"
          aria-label={isMuted ? 'Unmute story audio' : 'Mute story audio'}
          className={`inline-flex min-h-[34px] sm:min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] sm:text-[13px] font-semibold tracking-wide whitespace-nowrap transition-colors cursor-pointer ${
            isStarryScene
              ? 'border-white/25 bg-white/15 text-[#FFF8FB] hover:bg-white/25'
              : 'border-[#D94B7D]/20 bg-[#FFFDFB]/92 text-[#3A1233] shadow-2xs hover:bg-white'
          }`}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> : <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />}
          <span>{isMuted ? 'Muted' : 'Sound On'}</span>
        </button>

        <div
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
          data-testid="origin-scene-counter"
          aria-live="polite"
        >
          <span
            className={`text-[10.5px] sm:text-[12.5px] font-bold tracking-[0.12em] whitespace-nowrap uppercase ${
              isStarryScene ? 'text-[#FFE7B8]' : 'text-[#A03D67]'
            }`}
          >
            Scene {currentScene.sceneNumber} of {ORIGIN_TOTAL_SCENES}
          </span>
          <div className="flex items-center gap-[3px] sm:gap-[4px]" aria-hidden="true">
            {ORIGIN_SCENES.map((s) => {
              const isCompleted = s.index < sceneIndex;
              const isCurrent = s.index === sceneIndex;
              return (
                <span
                  key={s.id}
                  className={`h-[5px] sm:h-[6px] rounded-full transition-all duration-300 ${
                    isCurrent
                      ? isStarryScene
                        ? 'w-3.5 sm:w-5 bg-[#F7D994]'
                        : 'w-3.5 sm:w-5 bg-[#D94B7D]'
                      : isCompleted
                        ? isStarryScene
                          ? 'w-1.5 sm:w-2 bg-[#F7D994]/70'
                          : 'w-1.5 sm:w-2 bg-[#E6B85C]'
                        : isStarryScene
                          ? 'w-1.5 sm:w-2 bg-white/30'
                          : 'w-1.5 sm:w-2 bg-[#D94B7D]/20'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkipStory}
          data-testid="origin-skip-btn"
          className={`inline-flex min-h-[34px] sm:min-h-[38px] shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] sm:text-[13px] font-semibold tracking-wide whitespace-nowrap transition-colors cursor-pointer ${
            isStarryScene
              ? 'border-white/25 bg-white/15 text-[#FFF8FB] hover:bg-white/25'
              : 'border-[#D94B7D]/20 bg-[#FFFDFB]/92 text-[#3A1233] shadow-2xs hover:bg-white'
          }`}
        >
          <span>Skip Story</span>
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        </button>
      </header>

      {/* Main Illustrated Storybook Cinema Stage */}
      <main className="relative z-10 mx-auto flex min-h-0 w-[min(94vw,640px)] flex-1 items-center justify-center px-1">
        <div
          className={`relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-[var(--card-radius)] border transition-all duration-700 ${
            isRomanticPeak
              ? 'border-[#F9B5D2]/55 shadow-[0_22px_58px_rgba(244,114,182,0.38)]'
              : isStarryScene
                ? 'border-[#F7D994]/35 shadow-[0_22px_50px_rgba(32,12,40,0.42)]'
                : isFinaleScene
                  ? 'border-[#E6B85C]/55 shadow-[0_20px_50px_rgba(217,75,125,0.18)]'
                  : 'border-[#D94B7D]/20 shadow-[0_18px_45px_rgba(181,74,119,0.12)]'
          }`}
          style={{
            height: 'var(--origin-stage-h)',
            maxHeight: '100%',
          }}
        >
          {/* 5-Layer Depth-Staged Atmospheric Backdrop Engine */}
          <OriginStageBackdrop
            mood={activeBackdropMood}
            sceneId={currentScene.id}
            isRulerStage={isGrowthRulerScene}
            kissRunKey={sceneRunKey}
            kissBeat={kissBeat}
          />

          {/* In-Stage Pulsating Soft-Pink Romantic Lighting Wash over the Kissing Scene */}
          <div
            aria-hidden="true"
            data-testid="origin-stage-romantic-wash"
            className="pointer-events-none absolute inset-0 z-[15] overflow-hidden mix-blend-screen transition-opacity duration-700 ease-out"
            style={{ opacity: stageWashOpacity }}
          >
            <div
              className={`absolute -inset-6 ${
                isRomanticPeak
                  ? 'origin-story-romantic-pulse-peak'
                  : 'origin-story-romantic-pulse-ambient'
              }`}
              style={{
                background:
                  'radial-gradient(ellipse at 50% 56%, rgba(255, 204, 228, 0.4) 0%, rgba(249, 152, 198, 0.24) 38%, rgba(244, 114, 182, 0.08) 64%, rgba(255, 248, 251, 0) 82%)',
              }}
            />
          </div>

          {/* Scene Content Layer */}
          <div
            key={`${currentScene.id}_${sceneRunKey}`}
            className="relative z-10 flex h-full w-full flex-col items-center justify-end"
          >
            {/* ================= SCENE 1: PROLOGUE ================= */}
            {currentScene.id === 'prologue' && (
              <div className="origin-story-iris-open relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#E6B85C]/45 bg-[#FFF8E8]/90 text-[#D94B7D] shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>

                <span className="origin-story-prologue-in text-[11px] font-bold tracking-[0.26em] text-[#B8577E] uppercase">
                  {currentScene.eyebrow}
                </span>

                <h1
                  className="origin-story-headline-shimmer font-display mt-3 text-[1.85rem] leading-tight font-bold tracking-tight sm:text-[2.2rem]"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {currentScene.title}
                </h1>

                <div className="origin-story-underline mt-4 h-[2px] w-32 rounded-full bg-gradient-to-r from-transparent via-[#E6B85C] to-transparent" />

                <p className="mt-5 max-w-[270px] text-[11px] font-semibold tracking-[0.16em] text-[#8A4465] uppercase">
                  Chapter 01 · The Story of Anamika
                </p>
              </div>
            )}

            {/* ================= SCENE 2: MEET HER FATHER ================= */}
            {currentScene.id === 'meet_father' && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-5 pt-5 pb-4">
                {/* Warm champagne spotlight bloom */}
                <div
                  aria-hidden="true"
                  className="origin-story-arrival-glow pointer-events-none absolute top-0 left-1/2 h-[84%] w-[78%] -translate-x-1/2 rounded-full"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 28%, rgba(247,217,148,0.42) 0%, rgba(255,248,251,0) 72%)',
                  }}
                />

                {/* Crisp glassmorphic ivory nameplate with gold accent line */}
                <div className="origin-story-nameplate-in relative z-20 overflow-hidden rounded-2xl border border-[#E6B85C]/50 bg-[#FFFDF9]/90 px-5 py-2.5 text-center shadow-sm backdrop-blur-md">
                  <div className="mx-auto mb-1.5 h-[2px] w-12 rounded-full bg-gradient-to-r from-transparent via-[#E6B85C] to-transparent" />
                  <p className="text-xs font-extrabold tracking-[0.18em] text-[#3A1233] uppercase">
                    {currentScene.nameplateTitle}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#8C4D6A]">
                    {currentScene.nameplateSubtitle}
                  </p>
                </div>

                {/* Lively 3-step storybook walk-in + continuous breathing */}
                <div className="origin-story-step-walk-left relative z-10 flex h-[74%] items-end justify-center">
                  <div className="origin-story-torso-breathe h-full">
                    <ShivjeeCharacter mood="calm" className="h-full w-auto" />
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENE 3: MEET HER MOTHER ================= */}
            {currentScene.id === 'meet_mother' && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pt-5 pb-4">
                {/* Soft petal-blush spotlight bloom on Archana */}
                <div
                  aria-hidden="true"
                  className="origin-story-arrival-glow pointer-events-none absolute top-0 right-4 h-[84%] w-[64%] rounded-full"
                  style={{
                    background:
                      'radial-gradient(ellipse at 55% 28%, rgba(247,188,214,0.44) 0%, rgba(255,248,251,0) 72%)',
                  }}
                />

                {/* Crisp glassmorphic ivory nameplate with gold accent line */}
                <div className="origin-story-nameplate-in relative z-20 overflow-hidden rounded-2xl border border-[#D94B7D]/28 bg-[#FFFDF9]/90 px-5 py-2.5 text-center shadow-sm backdrop-blur-md">
                  <div className="mx-auto mb-1.5 h-[2px] w-12 rounded-full bg-gradient-to-r from-transparent via-[#E6B85C] to-transparent" />
                  <p className="text-xs font-extrabold tracking-[0.2em] text-[#3A1233] uppercase">
                    {currentScene.nameplateTitle}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#8C4D6A]">
                    {currentScene.nameplateSubtitle}
                  </p>
                </div>

                <div className="relative z-10 flex h-[72%] w-full items-end justify-center gap-1 sm:gap-3">
                  <div className="origin-story-torso-breathe h-[96%] opacity-95">
                    <ShivjeeCharacter mood="calm" className="h-full w-auto" />
                  </div>
                  <div className="origin-story-step-walk-right h-[96%]">
                    <div
                      className="origin-story-torso-breathe h-full"
                      style={{ animationDelay: '0.5s' }}
                    >
                      <ArchanaCharacter mood="calm" pregnancyMonth={0} className="h-full w-auto" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENE 4: HAPPY TOGETHER ================= */}
            {currentScene.id === 'happy_together' && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-4 pt-6 pb-4">
                {/* Tiny sparkles drifting between them */}
                <div
                  aria-hidden="true"
                  className="origin-story-orbit-star pointer-events-none absolute bottom-[44%] left-1/2 z-20 -translate-x-1/2"
                >
                  <Sparkles className="h-4 w-4 text-[#E6B85C]" />
                </div>

                <div className="relative z-10 flex h-[76%] w-full items-end justify-center">
                  <div className="origin-story-sway-gentle -mr-3.5 h-full">
                    <div className="origin-story-torso-breathe h-full">
                      <ShivjeeCharacter mood="happyTogether" className="h-full w-auto" />
                    </div>
                  </div>
                  <div
                    className="origin-story-sway-gentle -ml-3.5 h-[97%]"
                    style={{ animationDelay: '0.4s' }}
                  >
                    <div
                      className="origin-story-torso-breathe h-full"
                      style={{ animationDelay: '0.6s' }}
                    >
                      <ArchanaCharacter
                        mood="happyTogether"
                        pregnancyMonth={0}
                        className="h-full w-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENE 5: 5-PHASE REALISTIC STEP-CLOSER STARRY KISS ================= */}
            {currentScene.id === 'starry_kiss' && (() => {
              const kissPose = getScene5KissPose(kissWalkStage);
              const isSteppingPhase = kissWalkStage === 'stepping';
              const isLeanOrKissPhase = kissWalkStage === 'leanIn' || kissWalkStage === 'kissing';
              const isKissHoldPhase = kissWalkStage === 'kissing';
              const isAfterglowPhase = kissWalkStage === 'afterglow';
              const poseTransition = isSteppingPhase
                ? `transform ${SCENE5_KISS_TIMING.phase2StepDurationMs}ms cubic-bezier(0.37, 0, 0.63, 1)`
                : isAfterglowPhase
                  ? `transform ${SCENE5_KISS_TIMING.phase5PullBackDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                  : `transform ${SCENE5_KISS_TIMING.phase3LeanInDurationMs}ms cubic-bezier(0.37, 0, 0.63, 1)`;

              return (
                <div
                  data-testid="origin-kiss-stage"
                  data-kiss-phase={kissPhase}
                  data-kiss-walk-stage={kissWalkStage}
                  data-kiss-audio-playing={isKissAudioPlaying ? 'true' : 'false'}
                  data-kiss-duration-ms={getKissAudioDurationMs()}
                  className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pt-4 pb-4"
                >
                  {/* Compact Replay Kiss pill tucked in top-left of stage */}
                  <div className="relative z-20 flex w-full justify-start">
                    <button
                      type="button"
                      onClick={handleReplayScene}
                      data-testid="origin-replay-kiss-btn"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#F7D994]/40 bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-[#FFF7FA] backdrop-blur-xs transition-colors hover:bg-white/25 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3 text-[#F7D994]" />
                      <span>Replay Kiss</span>
                    </button>
                  </div>

                  {/* Soft Luminous Rose-Gold Moonlight Aura Halo behind silhouettes during Phase 4 Kiss */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute bottom-[22%] left-1/2 z-10 h-56 w-56 -translate-x-1/2 rounded-full transition-opacity duration-500 ${
                      isKissHoldPhase
                        ? 'origin-story-heart-halo opacity-100'
                        : isAfterglowPhase
                          ? 'opacity-40'
                          : isLeanOrKissPhase
                            ? 'opacity-45'
                            : 'opacity-0'
                    }`}
                    style={{
                      background:
                        'radial-gradient(circle, rgba(249,168,201,0.46) 0%, rgba(247,217,148,0.28) 46%, rgba(45,24,59,0) 74%)',
                    }}
                  />

                  {/* 9 Delicate Small Pastel Rose & Champagne-Gold Hearts rising from center contact point */}
                  {(isKissHoldPhase || isAfterglowPhase) && (
                    <div
                      className={`pointer-events-none absolute inset-x-0 bottom-[42%] z-20 h-44 transition-opacity duration-700 ${
                        isAfterglowPhase ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      {KISS_HEARTS.map((heart) => (
                        <svg
                          key={heart.id}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="origin-story-heart absolute bottom-0"
                          style={{
                            left: `${heart.leftPct}%`,
                            width: `${heart.sizePx}px`,
                            height: `${heart.sizePx}px`,
                            ['--heart-delay' as string]: `${heart.delaySec}s`,
                            ['--heart-dur' as string]: `${heart.durSec}s`,
                            ['--heart-dx-mid' as string]: `${heart.dxMid}px`,
                            ['--heart-dx-end' as string]: `${heart.dxEnd}px`,
                          }}
                        >
                          <path
                            d="M12 21s-6.8-4.5-9.2-8.4C.9 9.5 2.4 5.5 6 4.8c2.1-.4 4.2.6 6 2.5 1.8-1.9 3.9-2.9 6-2.5 3.6.7 5.1 4.7 3.2 7.8C18.8 16.5 12 21 12 21z"
                            fill={heart.color}
                          />
                        </svg>
                      ))}
                    </div>
                  )}

                  {/* Centered Unified 320x230 Kiss Stage: 100% Resolution-Independent Contact Math */}
                  <div className="relative z-10 flex h-[76%] w-full items-end justify-center">
                    <div
                      className="relative h-full max-w-full"
                      style={{ aspectRatio: '320 / 230' }}
                    >
                      {/* Shivjee Kumar (Left -> steps inward & leans forward +3.5deg, head +7deg) */}
                      <div
                        data-testid="origin-kiss-shivjee"
                        className="absolute bottom-0 left-[25%] z-10 h-full w-[50%] will-change-transform"
                        style={{
                          transformOrigin: '50% 95.65%',
                          transform: `translate3d(${kissPose.shivjee.translateXPct}%, ${kissPose.shivjee.translateYPct}%, 0) rotate(${kissPose.shivjee.torsoRotateDeg}deg)`,
                          transition: poseTransition,
                        }}
                      >
                        <div
                          className={`h-full w-full ${
                            isSteppingPhase
                              ? 'origin-story-kiss-footsteps'
                              : isKissHoldPhase
                                ? 'origin-story-kiss-breathe'
                                : 'origin-story-torso-breathe'
                          }`}
                        >
                          <ShivjeeCharacter
                            mood={shivjeeMood}
                            kissPhase={kissPhase}
                            headTiltDeg={kissPose.shivjee.headTiltDeg}
                            className="h-full w-full"
                          />
                        </div>
                      </div>

                      {/* Archana (Right -> steps inward, graceful tiptoe lift & leans forward -3.5deg, head -7deg) */}
                      <div
                        data-testid="origin-kiss-archana"
                        className="absolute bottom-0 left-[25%] z-20 h-full w-[50%] will-change-transform"
                        style={{
                          transformOrigin: '50% 95.65%',
                          transform: `translate3d(${kissPose.archana.translateXPct}%, ${kissPose.archana.translateYPct}%, 0) rotate(${kissPose.archana.torsoRotateDeg}deg)`,
                          transition: poseTransition,
                        }}
                      >
                        <div
                          className={`h-full w-full ${
                            isSteppingPhase
                              ? 'origin-story-kiss-footsteps'
                              : isKissHoldPhase
                                ? 'origin-story-kiss-breathe'
                                : 'origin-story-torso-breathe'
                          }`}
                          style={{ animationDelay: isSteppingPhase ? '0.09s' : '0.45s' }}
                        >
                          <ArchanaCharacter
                            mood={archanaMood}
                            pregnancyMonth={0}
                            kissPhase={kissPhase}
                            headTiltDeg={kissPose.archana.headTiltDeg}
                            className="h-full w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ================= SCENE 6: NINE MONTHS ================= */}
            {currentScene.id === 'nine_months' && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pt-4 pb-4">
                {/* Vintage 3D card-flip calendar showing MONTH 1 to MONTH 9 */}
                <div
                  key={`month_${pregnancyMonth}`}
                  data-testid="origin-month-calendar"
                  className="origin-story-month-flip relative z-20 flex flex-col items-center overflow-hidden rounded-2xl border border-[#D94B7D]/25 bg-[#FFFDF9]/95 px-6 py-2 shadow-sm backdrop-blur-xs"
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#E6B85C] via-[#F29BBF] to-[#E6B85C]" />
                  <span className="mt-1 text-[10px] font-bold tracking-[0.2em] text-[#B0577D] uppercase">
                    Waiting Together
                  </span>
                  <span className="text-base font-extrabold tracking-[0.14em] text-[#3A1233]">
                    MONTH {pregnancyMonth}
                  </span>
                </div>

                {/* Radiant golden aura pulse on Months 3, 6, and 9 */}
                {isPregnancyMilestonePulse && (
                  <div
                    key={`pulse_${pregnancyMonth}`}
                    aria-hidden="true"
                    className="origin-story-arrival-glow pointer-events-none absolute right-[16%] bottom-[16%] z-10 h-44 w-44 rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(247,217,148,0.52) 0%, rgba(249,184,212,0.22) 52%, rgba(255,248,251,0) 76%)',
                    }}
                  />
                )}

                <div className="relative z-10 flex h-[74%] w-full items-end justify-center gap-1">
                  <div className="origin-story-sway-gentle relative h-full">
                    {/* Celebratory sparkles above amazed Shivjee at Month 9 */}
                    {pregnancyMonth === 9 && (
                      <div
                        aria-hidden="true"
                        className="origin-story-bump-star pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
                      >
                        <Sparkles className="h-5 w-5 text-[#E6B85C]" />
                      </div>
                    )}
                    <div className="origin-story-torso-breathe h-full">
                      <ShivjeeCharacter mood={shivjeeMood} className="h-full w-auto" />
                    </div>
                  </div>
                  <div className="origin-story-torso-breathe h-[97%]">
                    <ArchanaCharacter
                      mood="glowingPregnant"
                      pregnancyMonth={pregnancyMonth}
                      className="h-full w-auto"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENE 7: 03 DECEMBER 2009 ================= */}
            {currentScene.id === 'anamika_born' && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-3 pt-4 pb-4">
                {/* Warm champagne-gold radial arrival burst */}
                <div
                  aria-hidden="true"
                  className="origin-story-arrival-glow pointer-events-none absolute top-1/2 left-1/2 h-68 w-68 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(247,217,148,0.68) 0%, rgba(252,214,230,0.32) 48%, rgba(255,248,251,0) 76%)',
                  }}
                />

                {/* Bold editorial date stamp with sparkling gold sweep */}
                <div className="origin-story-prologue-in relative z-20 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-[#B8577E] uppercase">
                    A Legend Arrives
                  </span>
                  <h2
                    className="origin-story-headline-shimmer font-display mt-1 text-xl font-bold tracking-[0.06em] sm:text-2xl"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {currentScene.stampTitle}
                  </h2>
                  <div className="origin-story-underline mt-1.5 h-[2px] w-32 rounded-full bg-gradient-to-r from-transparent via-[#E6B85C] to-transparent" />
                </div>

                {/* Proud parents framing glowing newborn Anamika */}
                <div className="relative z-10 flex h-[70%] w-full items-end justify-center px-2">
                  <div className="origin-story-sway-gentle -mr-10 h-[90%] sm:-mr-7">
                    <div className="origin-story-torso-breathe h-full">
                      <ShivjeeCharacter mood="proudDad" className="h-full w-auto" />
                    </div>
                  </div>
                  <div className="origin-story-baby-pop relative z-20 h-[88%]">
                    <AnamikaNewborn className="h-full w-auto" />
                  </div>
                  <div
                    className="origin-story-sway-gentle -ml-10 h-[88%] sm:-ml-7"
                    style={{ animationDelay: '0.35s' }}
                  >
                    <div
                      className="origin-story-torso-breathe h-full"
                      style={{ animationDelay: '0.45s' }}
                    >
                      <ArchanaCharacter
                        mood="proudMom"
                        pregnancyMonth={0}
                        className="h-full w-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENES 8, 9, 10: PROPORTIONAL HEIGHT RULER STAGE ================= */}
            {isGrowthRulerScene && (
              <div className="relative z-10 flex h-full w-full flex-col justify-end px-3 pt-3 pb-3">
                {/* Top-left Age · Year · Height telemetry pill with crisp digit-roll animation */}
                <div
                  data-testid="origin-growth-telemetry"
                  className={`absolute top-3.5 left-3.5 z-30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-extrabold tracking-wide whitespace-nowrap shadow-xs transition-all duration-300 ${
                    isAge17GoldLock
                      ? 'border-[#E6B85C] bg-gradient-to-r from-[#FFF4C8] via-[#FFF9E6] to-[#FFE8F1] text-[#3A1233] shadow-[0_0_22px_rgba(230,184,92,0.52)]'
                      : 'border-[#D94B7D]/25 bg-white/95 text-[#3A1233]'
                  }`}
                >
                  {isAge17GoldLock && (
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                  )}
                  <span
                    key={`age_${activeGrowthStep.age}`}
                    className="origin-story-digit-roll inline-block text-[#D94B7D]"
                  >
                    AGE {activeGrowthStep.age}
                  </span>
                  <span className="text-[#C899AF]">·</span>
                  <span
                    key={`yr_${activeGrowthStep.year}`}
                    className="origin-story-digit-roll inline-block"
                  >
                    {activeGrowthStep.year}
                  </span>
                  <span className="text-[#C899AF]">·</span>
                  <span
                    key={`ht_${activeGrowthStep.heightLabel}`}
                    className="origin-story-digit-roll inline-block text-[#A83862]"
                  >
                    {activeGrowthStep.heightLabel}
                  </span>
                </div>

                {/* Unified 230-unit proportional growth & height-ruler coordinate frame */}
                <div className="relative mx-auto flex h-[86%] w-full max-w-[360px] sm:max-w-[460px] items-end justify-center">
                  {/* Right-edge pastel height ruler (renders ALL foot ticks 1'0" through 6'0" + pixel-aligned 5'2") */}
                  <div
                    aria-hidden="true"
                    data-testid="origin-height-ruler"
                    className="origin-story-ruler-slide-in pointer-events-none absolute top-0 right-1 bottom-0 z-10 w-16 border-l border-[#D94B7D]/22"
                  >
                    {ORIGIN_RULER_TICKS.map((tick) => {
                      const bottomPct = inchesToStageBottomPct(tick.inches);
                      const tickBottomStyle = tick.isFiveTwo
                        ? `calc(${bottomPct}% + 6px)`
                        : `${bottomPct}%`;
                      return (
                        <div
                          key={tick.label}
                          data-testid={tick.isFiveTwo ? 'origin-ruler-5-2' : undefined}
                          className="absolute left-0 flex w-full translate-y-1/2 items-center gap-1"
                          style={{ bottom: tickBottomStyle }}
                        >
                          <span
                            className={`block h-[1.5px] shrink-0 ${
                              tick.isFiveTwo
                                ? 'w-4 bg-[#D94B7D]'
                                : 'w-3 bg-[#C58CA5]'
                            }`}
                          />
                          <span
                            className={`leading-none font-bold whitespace-nowrap ${
                              tick.isFiveTwo
                                ? 'rounded-full bg-[#D94B7D] px-1.5 py-[2px] text-[9.5px] font-extrabold text-white shadow-xs'
                                : 'text-[9.5px] text-[#8C5A72]'
                            }`}
                          >
                            {tick.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Glowing animated rose-gold height tracker beam connecting crown to ruler (Scenes 8 & 9) */}
                  {!isPadlockScene && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-[68px] left-5 z-10 flex items-center transition-all duration-300 ease-out"
                      style={{ bottom: `${pointerBottomPct}%` }}
                    >
                      <div
                        className="h-[2px] w-full rounded-full"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(230,184,92,0.25) 0%, rgba(217,75,125,0.65) 55%, rgba(230,184,92,0.95) 100%)',
                          boxShadow: '0 0 8px rgba(230, 184, 92, 0.55)',
                        }}
                      />
                      <span className="absolute -top-2.5 left-0 rounded-full border border-[#E6B85C]/50 bg-[#FFF8E4] px-2 py-0.5 text-[10px] font-bold text-[#9A6A1D] shadow-2xs">
                        {activeGrowthStep.heightLabel}
                      </span>
                      {/* Upward sparkle trail when Ages 10 to 14 tick at 1s per year */}
                      {activeGrowthStep.age >= 10 && (
                        <span
                          key={`spark_${activeGrowthStep.age}`}
                          className="origin-story-bump-star absolute -top-3 right-3 text-[#E6B85C]"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Scene 10 of 11: Strictly Level 5'2" Dashed Barrier 6px ABOVE crown + 10px pill gap */}
                  {isPadlockScene && (
                    <div
                      key={`barrier_${barrierJiggleKey}`}
                      data-testid="origin-padlock-barrier"
                      className={`pointer-events-none absolute right-[68px] left-3 z-30 ${
                        barrierJiggleKey > 0
                          ? 'origin-story-barrier-jiggle'
                          : 'origin-story-padlock-slam'
                      }`}
                      style={{ bottom: `calc(${fiveTwoBottomPct}% + 6px)` }}
                    >
                      <div className="relative flex w-full items-center">
                        <div
                          className="h-[2px] w-full border-t-2 border-dashed border-[#D94B7D]"
                          style={{
                            filter: 'drop-shadow(0 0 5px rgba(217, 75, 125, 0.32))',
                          }}
                        />
                        <div
                          data-testid="origin-padlock-pill"
                          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#E6B85C] bg-gradient-to-r from-[#FFF7DF] via-[#FFF8FB] to-[#FFE7F0] px-3 py-1 whitespace-nowrap shadow-sm"
                          style={{ bottom: '10px' }}
                        >
                          <Lock className="h-3 w-3 shrink-0 text-[#D94B7D]" />
                          <span className="text-[10px] font-extrabold tracking-[0.12em] text-[#3A1233] uppercase">
                            HEIGHT LOCKED · 5&apos;2&quot;
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Anamika Proportional Character Stage (shifted -18px left so she never crowds the right ruler) */}
                  <div
                    className="relative z-20 flex h-full items-end justify-center"
                    style={{ transform: 'translate3d(-18px, 0, 0)' }}
                  >
                    <div
                      className={`flex h-full items-end justify-center ${
                        activeGrowthStep.stage === 'toddler'
                          ? 'origin-story-toddler-squash-hop'
                          : isBonkHopping
                            ? 'origin-story-tiptoe-bonk'
                            : ''
                      }`}
                    >
                      <div className="origin-story-torso-breathe h-full">
                        {activeGrowthStep.stage === 'newborn' && (
                          <AnamikaNewborn className="h-full w-auto" />
                        )}
                        {activeGrowthStep.stage === 'toddler' && (
                          <AnamikaToddler age={activeGrowthStep.age} className="h-full w-auto" />
                        )}
                        {activeGrowthStep.stage === 'girl' && (
                          <AnamikaGrowingGirl age={activeGrowthStep.age} className="h-full w-auto" />
                        )}
                        {activeGrowthStep.stage === 'teen' && (
                          <AnamikaTeen
                            expression={isPadlockScene ? teenExpression : 'happy'}
                            showQuestionSparkle={isPadlockScene && activeGrowthStep.age === 15}
                            className="h-full w-auto"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENE 11 OF 11: DEDICATED 3-BAND GRAND FINALE ================= */}
            {isFinaleScene && (
              <div
                data-testid="origin-finale-stage"
                className="relative z-10 flex h-full w-full flex-col items-center justify-between overflow-hidden px-4 pt-[18px] pb-[14px]"
              >
                {/* LAYER 1 (z-index: 1): Curtain Shimmer, Radial Bloom, 26 Top-Masked Confetti, Twin Corner Bursts & Rising Bokeh */}
                <div
                  className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
                  aria-hidden="true"
                >
                  {/* Soft celebratory curtain-shimmer crossfade veil on Scene 11 open */}
                  <div
                    className="origin-story-finale-curtain-shimmer absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(118deg, rgba(255,253,247,0) 15%, rgba(246,211,138,0.34) 48%, rgba(255,244,249,0.22) 62%, rgba(255,253,247,0) 85%)',
                    }}
                  />

                  {/* Beat 1 (0 -> 400ms): Golden radial bloom behind stage center */}
                  <div
                    className="origin-story-finale-bloom absolute top-[34%] left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(246, 211, 138, 0.44) 0%, rgba(249, 184, 212, 0.24) 48%, rgba(255, 248, 251, 0) 74%)',
                    }}
                  />

                  {/* 26 Pastel Rose, Blush, Gold & Lilac Confetti Ribbons with top-band soft opacity mask */}
                  <div
                    className="absolute inset-0"
                    style={{
                      maskImage:
                        'linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.42) 24%, rgba(0,0,0,0.94) 40%, rgba(0,0,0,1) 100%)',
                      WebkitMaskImage:
                        'linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.42) 24%, rgba(0,0,0,0.94) 40%, rgba(0,0,0,1) 100%)',
                    }}
                  >
                    {FINALE_CONFETTI.map((piece) => (
                      <span
                        key={piece.id}
                        className="origin-story-confetti-flutter absolute rounded-[3px]"
                        style={{
                          left: `${piece.leftPct}%`,
                          top: `${piece.topPct}%`,
                          width: `${piece.widthPx}px`,
                          height: `${piece.heightPx}px`,
                          backgroundColor: piece.color,
                          ['--cf-x' as string]: `${piece.dx}px`,
                          ['--cf-y' as string]: `${piece.dy}px`,
                          ['--cf-rot' as string]: `${piece.rot}deg`,
                          ['--cf-delay' as string]: `${piece.delaySec}s`,
                          ['--cf-dur' as string]: `${piece.durSec}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Twin Corner Bursts (Bottom-Left & Bottom-Right curving gently up outer edges) */}
                  {FINALE_CORNER_BURSTS.map((burst) => (
                    <span
                      key={burst.id}
                      className={`absolute bottom-2 rounded-[3px] ${
                        burst.side === 'left'
                          ? 'origin-story-corner-burst-left left-2'
                          : 'origin-story-corner-burst-right right-2'
                      }`}
                      style={{
                        width: `${burst.widthPx}px`,
                        height: `${burst.heightPx}px`,
                        backgroundColor: burst.color,
                        ['--cb-x' as string]: `${burst.dx}px`,
                        ['--cb-y' as string]: `${burst.dy}px`,
                        ['--cb-rot' as string]: `${burst.rot}deg`,
                        ['--cb-delay' as string]: `${burst.delaySec}s`,
                      }}
                    />
                  ))}

                  {/* Continuous Soft Rising Pastel Gold & Rose Bokeh Orbs */}
                  {FINALE_BOKEH_ORBS.map((orb) => (
                    <span
                      key={orb.id}
                      className="origin-story-bokeh-drift absolute rounded-full"
                      style={{
                        left: `${orb.leftPct}%`,
                        bottom: `${orb.bottomPct}%`,
                        width: `${orb.sizePx}px`,
                        height: `${orb.sizePx}px`,
                        backgroundColor: orb.color,
                        filter: 'blur(1px)',
                        ['--bk-dx' as string]: `${orb.dx}px`,
                        ['--bk-delay' as string]: `${orb.delaySec}s`,
                        ['--bk-dur' as string]: `${orb.durSec}s`,
                      }}
                    />
                  ))}
                </div>

                {/* LAYER 2 (z-index: 3): Top Headline Safe Zone (Beat 2: 200 -> 650ms upward glide) */}
                <div className="origin-story-finale-headline-in relative z-[3] flex w-full flex-col items-center text-center">
                  <span
                    data-testid="origin-finale-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E6B85C]/65 bg-gradient-to-r from-[#FFF9E4] via-[#FFFDF7] to-[#FFF2F7] px-3.5 py-1 text-[10px] font-extrabold tracking-[0.18em] whitespace-nowrap text-[#8A5A12] uppercase shadow-xs"
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-[#D94B7D]" />
                    <span>{finaleCopy.badgeLabel}</span>
                  </span>
                  <h2
                    data-testid="origin-finale-headline"
                    className="font-display font-bold tracking-[-0.01em] text-[#3A1233]"
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 'clamp(20px, 3.6vw, 30px)',
                      lineHeight: 1.22,
                      textWrap: 'balance',
                      maxWidth: 'min(88%, 420px)',
                      margin: '8px auto 0',
                      textShadow: '0 2px 14px rgba(255, 248, 251, 0.95)',
                    }}
                  >
                    {finaleCopy.headline}
                  </h2>
                </div>

                {/* LAYER 3 (z-index: 2): Character Band (Beat 3: 400 -> 900ms joyful bouncy celebration hop) */}
                <div className="origin-story-finale-queen-hop relative z-[2] flex h-[67%] items-end justify-center">
                  <div className="origin-story-torso-breathe h-full">
                    <AnamikaTeen expression="birthdayQueen" className="h-full w-auto" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Editorial Storybook Subtitle Card + Redesigned Rose-Berry Satin Controls */}
      <footer className="relative z-30 mx-auto w-[min(94vw,640px)] shrink-0 px-1 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-4">
        <div
          key={`caption_${currentScene.id}_${scene9SecondaryActive ? 's2' : 's1'}`}
          data-testid="origin-caption-box"
          className="origin-story-caption-in px-4 py-2.5 text-center sm:px-6 sm:py-3.5"
          style={{
            background: 'rgba(255, 253, 250, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(217, 75, 125, 0.18)',
            borderRadius: '20px',
            boxShadow: '0 12px 30px -14px rgba(130, 42, 82, 0.18)',
          }}
        >
          <p
            className="leading-[1.46] font-medium text-[#3A1233]"
            style={{ fontSize: 'clamp(13.5px, 1.85vw, 17px)' }}
          >
            {renderHighlightedCaption(activeCaption)}
          </p>
        </div>

        {/* Navigation Bar: Crisp Back + Circular Replay on Left, Warm Rose Berry Satin CTA on Right */}
        <div className="mt-2.5 flex w-full items-center justify-between gap-[10px]">
          <div className="flex shrink-0 items-center gap-2">
            {sceneIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                data-testid="origin-back-btn"
                aria-label="Previous scene"
                className={`inline-flex min-h-[42px] sm:min-h-[46px] items-center gap-1 rounded-full border px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-[0.97] ${
                  isStarryScene
                    ? 'border-white/25 bg-white/15 text-[#FFF8FB] backdrop-blur-xs hover:bg-white/25'
                    : 'border-[#D94B7D]/22 bg-[#FFFDFB] text-[#3A1233] shadow-2xs hover:bg-white'
                }`}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Back</span>
              </button>
            ) : (
              <div className="w-2" aria-hidden="true" />
            )}

            {sceneIndex > 0 && (
              <button
                type="button"
                onClick={handleReplayScene}
                data-testid="origin-replay-scene-btn"
                aria-label="Replay current scene"
                title="Replay scene"
                className={`inline-flex h-[42px] w-[42px] sm:h-[46px] sm:w-[46px] shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-[0.96] ${
                  isStarryScene
                    ? 'border-white/25 bg-white/15 text-[#FFF8FB] backdrop-blur-xs hover:bg-white/25'
                    : 'border-[#D94B7D]/22 bg-[#FFFDFB] text-[#3A1233] shadow-2xs hover:bg-white'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>

          {isFinaleScene ? (
            <button
              type="button"
              onClick={handleEnterBirthdayWorld}
              data-testid="origin-enter-world-btn"
              className="relative inline-flex min-h-[44px] sm:min-h-[48px] shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-5 sm:px-6 py-2.5 text-[13.5px] sm:text-[15.5px] font-bold tracking-[0.01em] whitespace-nowrap text-[#FFFDFB] transition-transform cursor-pointer active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #DE4F82 0%, #B82E60 100%)',
                border: '1.5px solid rgba(246, 211, 138, 0.72)',
                boxShadow:
                  '0 12px 26px -10px rgba(184, 46, 96, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
              }}
            >
              <span
                aria-hidden="true"
                className="origin-story-cta-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2"
              />
              <span className="relative z-10">{finaleCopy.ctaLabel}</span>
              <ChevronRight className="origin-story-arrow-nudge relative z-10 h-4 w-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              data-testid="origin-next-btn"
              data-settled={sceneSettled ? 'true' : 'false'}
              className={`inline-flex min-h-[44px] sm:min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-full px-5 sm:px-6 py-2.5 text-[13.5px] sm:text-[15.5px] font-bold tracking-[0.01em] whitespace-nowrap text-[#FFFDFB] transition-transform cursor-pointer active:scale-[0.97] ${
                sceneSettled ? 'origin-story-next-glow' : ''
              }`}
              style={{
                background: 'linear-gradient(135deg, #E25B8B 0%, #C93B6B 100%)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                boxShadow:
                  '0 8px 20px -8px rgba(201, 59, 107, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.32)',
              }}
            >
              <span>Next</span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 ${sceneSettled ? 'origin-story-arrow-nudge' : ''}`}
              />
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

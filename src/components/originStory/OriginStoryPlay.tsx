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
import { OriginStageBackdrop } from './OriginStageBackdrop';
import {
  FIVE_TWO_INCHES,
  ORIGIN_AUDIO_CONFIG,
  ORIGIN_CAPTION_KEYWORDS,
  ORIGIN_RULER_TICKS,
  ORIGIN_SCENES,
  ORIGIN_TOTAL_SCENES,
  PREGNANCY_MONTH_DURATION_MS,
  SCENE_10_FREEZE_STEPS,
  SCENE_8_GROWTH_STEPS,
  SCENE_9_GROWTH_STEPS,
  getOriginFinaleCopy,
  getOriginRomanticGlowIntensity,
  inchesToStageBottomPct,
  type GrowthStep,
  type OriginBackdropMood,
} from './originScript';
import { OriginStoryAudioController } from './originAudio';
import { haptics } from '../../utils/haptics';

export interface OriginStoryPlayProps {
  onComplete: () => void;
  onSkip: (skippedAtMs: number) => void;
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
 * 12 staggered pastel rose & champagne-gold hearts timed across the 3.55s kiss hold
 * (1.1s -> 4.65s) in three musical waves so every heart finishes fading right at 5.0s.
 */
const KISS_HEARTS: readonly HeartSpec[] = [
  // Wave 1: immediate lip-touch burst right on the 1.1s song swell
  { id: 1, leftPct: 47, delaySec: 0.0, durSec: 1.9, dxMid: -11, dxEnd: -18, color: '#F9A8C9', sizePx: 14 },
  { id: 2, leftPct: 52, delaySec: 0.16, durSec: 1.95, dxMid: 12, dxEnd: 19, color: '#F7D994', sizePx: 12 },
  { id: 3, leftPct: 49, delaySec: 0.34, durSec: 2.05, dxMid: -6, dxEnd: 9, color: '#F48EB8', sizePx: 16 },
  { id: 4, leftPct: 51, delaySec: 0.54, durSec: 1.95, dxMid: 10, dxEnd: -12, color: '#FFE7A8', sizePx: 13 },
  // Wave 2: warm mid-kiss floating drift (1.9s -> 2.7s of scene)
  { id: 5, leftPct: 46, delaySec: 0.82, durSec: 2.0, dxMid: -14, dxEnd: -8, color: '#F9B5D2', sizePx: 15 },
  { id: 6, leftPct: 54, delaySec: 1.06, durSec: 2.05, dxMid: 9, dxEnd: 16, color: '#E6B85C', sizePx: 12 },
  { id: 7, leftPct: 50, delaySec: 1.32, durSec: 2.1, dxMid: -8, dxEnd: 11, color: '#F27BA9', sizePx: 15 },
  { id: 8, leftPct: 48, delaySec: 1.56, durSec: 2.0, dxMid: -12, dxEnd: -15, color: '#FCE0A2', sizePx: 13 },
  // Wave 3: golden-rose peak burst right on the 3.0s musical swell, fading by 5.0s
  { id: 9, leftPct: 52, delaySec: 1.78, durSec: 1.95, dxMid: 11, dxEnd: 14, color: '#F49AC0', sizePx: 15 },
  { id: 10, leftPct: 49, delaySec: 1.96, durSec: 1.85, dxMid: -9, dxEnd: -14, color: '#F7D994', sizePx: 14 },
  { id: 11, leftPct: 51, delaySec: 2.14, durSec: 1.75, dxMid: 8, dxEnd: 12, color: '#F9A8C9', sizePx: 13 },
  { id: 12, leftPct: 50, delaySec: 2.32, durSec: 1.55, dxMid: -5, dxEnd: 6, color: '#FFE7A8', sizePx: 12 },
];

/**
 * 30 lightweight pastel rose, champagne-gold, lilac, and ivory petals in two staggered waves.
 */
const FINALE_CONFETTI: readonly ConfettiSpec[] = Array.from({ length: 30 }, (_, idx) => {
  const palette = ['#F27BA9', '#E6B85C', '#F7D994', '#E3B8F2', '#FFF9EE', '#D94B7D', '#F8BDD6'];
  const wave: 1 | 2 = idx < 15 ? 1 : 2;
  const spread = ((idx % 15) - 7) * 26;
  return {
    id: idx + 1,
    leftPct: 6 + ((idx * 17) % 88),
    topPct: 4 + ((idx * 11) % 24),
    dx: Math.round(spread * 0.46),
    dy: 175 + (idx % 5) * 32,
    rot: (idx % 2 === 0 ? 1 : -1) * (160 + (idx % 6) * 45),
    delaySec: Number(((wave === 2 ? 0.38 : 0) + (idx % 8) * 0.13).toFixed(2)),
    durSec: Number((2.2 + (idx % 4) * 0.42).toFixed(2)),
    color: palette[idx % palette.length],
    widthPx: idx % 3 === 0 ? 10 : 7,
    heightPx: idx % 3 === 0 ? 5.5 : 11,
    wave,
  };
});

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

export default function OriginStoryPlay({ onComplete, onSkip }: OriginStoryPlayProps) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneRunKey, setSceneRunKey] = useState(0);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Scene 5 (4-Beat Choreographed Starry Kiss) state
  const [kissBeat, setKissBeat] = useState<'twilight' | 'shyGlance' | 'kissing' | 'afterglow'>(
    'twilight',
  );

  // Scene 6 (Nine Months) state
  const [pregnancyMonth, setPregnancyMonth] = useState(1);

  // Scene 8, 9, 10 growth timeline state
  const [activeGrowthStep, setActiveGrowthStep] = useState<GrowthStep>(SCENE_8_GROWTH_STEPS[0]);
  const [scene9SecondaryActive, setScene9SecondaryActive] = useState(false);

  // Scene 10 (4-Beat Showstopper Finale) state
  const [scene10Beat, setScene10Beat] = useState<'freeze' | 'curtainLift' | 'finale'>('freeze');
  const [teenExpression, setTeenExpression] = useState<AnamikaTeenExpression>('happy');
  const [isBonkHopping, setIsBonkHopping] = useState(false);
  const [barrierJiggleKey, setBarrierJiggleKey] = useState(0);

  const audioRef = useRef<OriginStoryAudioController | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  const exitingRef = useRef(false);

  const finaleCopy = useMemo(() => getOriginFinaleCopy(), []);
  const currentScene = ORIGIN_SCENES[sceneIndex] ?? ORIGIN_SCENES[0];
  const isStarryScene = currentScene.id === 'starry_kiss';
  const isFinaleReveal =
    currentScene.id === 'freeze_and_finale' &&
    (scene10Beat === 'curtainLift' || scene10Beat === 'finale');
  const fiveTwoBottomPct = useMemo(() => inchesToStageBottomPct(FIVE_TWO_INCHES), []);

  const activeBackdropMood: OriginBackdropMood = isFinaleReveal
    ? 'gala_finale'
    : currentScene.backdropMood;

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
    audioRef.current?.setMuted(isMuted);
  }, [isMuted]);

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
      audioRef.current?.fadeOutAllAndStop(150);
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
      // Beat 1 (0.0s -> 0.55s): Full song starts immediately and plays continuously until skipped/left or natural end
      setKissBeat('twilight');
      audioRef.current?.startKissCue({
        restart: true,
        onEnded: () => {
          setKissBeat('afterglow');
          setSceneSettled(true);
        },
      });

      // Beat 2 (0.55s -> 1.1s): Shy glance & tiny steps closer into the moonlight beam
      schedule(() => {
        setKissBeat('shyGlance');
      }, ORIGIN_AUDIO_CONFIG.shyGlanceDelayMs);

      // Beat 3 (1.1s+): Sweet kiss + pulsating soft-pink romantic glow + continuously rising pastel hearts
      // Held smoothly for the entire duration of the song until the user leaves/skips or the track ends.
      schedule(() => {
        setKissBeat('kissing');
        haptics.tap();
      }, ORIGIN_AUDIO_CONFIG.kissStartDelayMs);

      // Highlight the Next button once the opening 5s kiss moment has unfolded (without cutting off the song)
      schedule(() => {
        setSceneSettled(true);
      }, ORIGIN_AUDIO_CONFIG.kissDurationMs);

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
              haptics.vibrateSafe(10);
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

    if (scene.id === 'freeze_and_finale') {
      setScene10Beat('freeze');
      setTeenExpression('happy');
      setIsBonkHopping(false);
      setActiveGrowthStep(SCENE_10_FREEZE_STEPS[0]);

      // Beat 1 (0.0s -> 3.0s): Comedic 14 -> 17 Padlock Freeze (1.0s exact per year)
      schedule(() => {
        audioRef.current?.playPadlockSlam();
        haptics.vibrateSafe(22);
      }, 120);

      // Age 15 · 2024 (1.0s): Year flips cleanly + question-mark sparkle pops above Anamika's head
      schedule(() => {
        setActiveGrowthStep(SCENE_10_FREEZE_STEPS[1]);
        setTeenExpression('happy');
        audioRef.current?.playYearTick(15);
        haptics.vibrateSafe(10);
      }, 1000);

      // Age 16 · 2025 (2.0s): The Tiptoe Bonk Gag!
      schedule(() => {
        setActiveGrowthStep(SCENE_10_FREEZE_STEPS[2]);
        setTeenExpression('determined');
        setIsBonkHopping(true);
        audioRef.current?.playYearTick(16);
      }, 2000);

      // Peak of Age 16 tiptoe hop: BONKS directly into the 5'2" padlock bar + 4 comic impact stars
      schedule(() => {
        setTeenExpression('bonkBlush');
        setBarrierJiggleKey((k) => k + 1);
        audioRef.current?.playComicBonk();
        haptics.vibrateSafe(18);
      }, 2250);

      schedule(() => {
        setIsBonkHopping(false);
      }, 2880);

      // Age 17 · 2026 (3.0s): Year counter flashes golden and locks on 2026 · AGE 17 · 5'2"
      schedule(() => {
        setActiveGrowthStep(SCENE_10_FREEZE_STEPS[3]);
        setTeenExpression('happy');
        audioRef.current?.playYearTick(17);
        haptics.vibrateSafe(12);
      }, 3000);

      // Beat 2 (3.5s -> 4.0s): Dramatic Curtain-Lift Transformation
      schedule(() => {
        setScene10Beat('curtainLift');
        setTeenExpression('birthdayQueen');
      }, 3500);

      // Beat 3 (4.0s -> 5.0s): Multi-Wave Confetti, Starbursts & Headline Reveal
      schedule(() => {
        setScene10Beat('finale');
        setTeenExpression('birthdayQueen');
        audioRef.current?.playFinaleSparkle();
        haptics.celebrate();
      }, 4000);

      // Beat 4: Holding state ready for Enter the Birthday World ›
      schedule(() => {
        setSceneSettled(true);
      }, scene.settleDurationMs);

      return clearScheduledTimers;
    }

    return clearScheduledTimers;
  }, [sceneIndex, sceneRunKey, clearScheduledTimers, schedule]);

  const handleNext = useCallback(() => {
    if (exitingRef.current) return;
    haptics.tap();
    audioRef.current?.fadeOutAllAndStop(150);

    if (sceneIndex < ORIGIN_TOTAL_SCENES - 1) {
      setSceneIndex((prev) => prev + 1);
      return;
    }

    // On Scene 10 Beat 1, tapping Next jumps directly into the Grand Finale
    if (scene10Beat === 'freeze') {
      clearScheduledTimers();
      setActiveGrowthStep(SCENE_10_FREEZE_STEPS[3]);
      setIsBonkHopping(false);
      setScene10Beat('finale');
      setTeenExpression('birthdayQueen');
      setSceneSettled(true);
      audioRef.current?.playFinaleSparkle();
      haptics.celebrate();
    }
  }, [sceneIndex, scene10Beat, clearScheduledTimers]);

  const handleBack = useCallback(() => {
    if (exitingRef.current || sceneIndex <= 0) return;
    haptics.tap();
    audioRef.current?.fadeOutAllAndStop(150);
    setSceneIndex((prev) => Math.max(0, prev - 1));
  }, [sceneIndex]);

  const handleReplayScene = useCallback(() => {
    if (exitingRef.current) return;
    haptics.tap();
    if (ORIGIN_SCENES[sceneIndex]?.id !== 'starry_kiss') {
      audioRef.current?.fadeOutAllAndStop(150);
    }
    setSceneRunKey((k) => k + 1);
  }, [sceneIndex]);

  const handleEnterBirthdayWorld = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    haptics.celebrate();
    audioRef.current?.fadeOutAllAndStop(150);
    audioRef.current?.playFinaleSparkle();
    clearScheduledTimers();
    setIsExiting(true);

    window.setTimeout(() => {
      onComplete();
    }, 450);
  }, [clearScheduledTimers, onComplete]);

  const handleSkipStory = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    haptics.tap();
    audioRef.current?.fadeOutAllAndStop(150);
    clearScheduledTimers();
    onSkip(sceneIndex * 1000);
  }, [clearScheduledTimers, onSkip, sceneIndex]);

  const handleToggleMute = useCallback(() => {
    haptics.tap();
    setIsMuted((prev) => !prev);
  }, []);

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
    if (isFinaleReveal) {
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
  }, [currentScene, isFinaleReveal, finaleCopy.subcaption, scene9SecondaryActive]);

  const isGrowthRulerScene =
    currentScene.id === 'baby_to_toddler' ||
    currentScene.id === 'growing_to_14' ||
    (currentScene.id === 'freeze_and_finale' && scene10Beat !== 'finale');

  const isRulerDissolving =
    currentScene.id === 'freeze_and_finale' && scene10Beat === 'curtainLift';

  const pointerBottomPct = inchesToStageBottomPct(activeGrowthStep.inches);
  const isAge17GoldLock =
    currentScene.id === 'freeze_and_finale' &&
    scene10Beat === 'freeze' &&
    activeGrowthStep.age === 17;

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
      className={`fixed inset-0 z-[95] flex flex-col justify-between overflow-hidden transition-all duration-[450ms] ease-out ${
        isExiting ? 'scale-[1.03] opacity-0 pointer-events-none' : 'scale-100 opacity-100'
      }`}
      style={{
        background: isStarryScene
          ? 'linear-gradient(180deg, #271334 0%, #562A55 54%, #A85781 100%)'
          : 'radial-gradient(circle at 50% 18%, #FFFDF9 0%, #FFF5FA 48%, #FCE9F2 100%)',
        transition:
          'background 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 450ms ease-out, transform 450ms ease-out',
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

      {/* Magical Warm Ivory-Rose Light Bloom Overlay on Exit */}
      {isExiting && (
        <div
          aria-hidden="true"
          className="origin-story-exit-bloom pointer-events-none fixed inset-0 z-[110]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #FFFDF7 0%, #FFF2F7 55%, rgba(255,248,251,0.96) 100%)',
          }}
        />
      )}

      {/* Top Chrome: Mute toggle, Stepped Chapter Progress, Skip Story */}
      <header className="relative z-30 mx-auto flex w-full max-w-[520px] items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
        <button
          type="button"
          onClick={handleToggleMute}
          data-testid="origin-mute-btn"
          aria-label={isMuted ? 'Unmute story audio' : 'Mute story audio'}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
            isStarryScene
              ? 'border-white/25 bg-white/15 text-[#FFF8FB] hover:bg-white/25'
              : 'border-[#D94B7D]/20 bg-white/85 text-[#3A1233] shadow-xs hover:bg-white'
          }`}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{isMuted ? 'Muted' : 'Sound On'}</span>
        </button>

        <div
          className="flex flex-col items-center gap-1"
          data-testid="origin-scene-counter"
          aria-live="polite"
        >
          <span
            className={`text-[11px] font-bold tracking-[0.14em] uppercase ${
              isStarryScene ? 'text-[#FFE7B8]' : 'text-[#A03D67]'
            }`}
          >
            Scene {currentScene.sceneNumber} of {ORIGIN_TOTAL_SCENES}
          </span>
          <div className="flex items-center gap-1" aria-hidden="true">
            {ORIGIN_SCENES.map((s) => {
              const isCompleted = s.index < sceneIndex;
              const isCurrent = s.index === sceneIndex;
              return (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? isStarryScene
                        ? 'w-5 bg-[#F7D994]'
                        : 'w-5 bg-[#D94B7D]'
                      : isCompleted
                        ? isStarryScene
                          ? 'w-2 bg-[#F7D994]/70'
                          : 'w-2 bg-[#E6B85C]'
                        : isStarryScene
                          ? 'w-1.5 bg-white/30'
                          : 'w-1.5 bg-[#D94B7D]/20'
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
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
            isStarryScene
              ? 'border-white/25 bg-white/15 text-[#FFF8FB] hover:bg-white/25'
              : 'border-[#D94B7D]/20 bg-white/85 text-[#3A1233] shadow-xs hover:bg-white'
          }`}
        >
          <span>Skip Story</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Main Illustrated Storybook Cinema Stage */}
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[480px] flex-1 items-center justify-center px-4 py-2">
        <div
          className={`relative flex h-full max-h-[415px] w-full flex-col items-center justify-end overflow-hidden rounded-[28px] border transition-all duration-700 sm:max-h-[465px] ${
            isRomanticPeak
              ? 'border-[#F9B5D2]/55 shadow-[0_22px_58px_rgba(244,114,182,0.38)]'
              : isStarryScene
                ? 'border-[#F7D994]/35 shadow-[0_22px_50px_rgba(32,12,40,0.42)]'
                : isFinaleReveal
                  ? 'border-[#E6B85C]/50 shadow-[0_20px_50px_rgba(217,75,125,0.18)]'
                  : 'border-[#D94B7D]/20 shadow-[0_18px_45px_rgba(181,74,119,0.12)]'
          }`}
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
                  className="origin-story-headline-shimmer mt-3 font-serif text-[1.85rem] leading-tight font-bold tracking-tight sm:text-[2.2rem]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
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

            {/* ================= SCENE 5: 4-BEAT STARRY NIGHT KISS ================= */}
            {currentScene.id === 'starry_kiss' && (
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pt-4 pb-4">
                {/* Compact Replay Kiss pill tucked in top-left of stage */}
                <div className="relative z-20 flex w-full justify-start">
                  <button
                    type="button"
                    onClick={handleReplayScene}
                    data-testid="origin-replay-kiss-btn"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#F7D994]/40 bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-[#FFF7FA] backdrop-blur-xs transition-colors hover:bg-white/25"
                  >
                    <RotateCcw className="h-3 w-3 text-[#F7D994]" />
                    <span>Replay Kiss</span>
                  </button>
                </div>

                {/* Pulsing Warm Rose-Gold Heart Halo behind Shivjee & Archana during Beat 3 Kiss */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute bottom-[22%] left-1/2 z-10 h-56 w-56 -translate-x-1/2 rounded-full transition-opacity duration-500 ${
                    kissBeat === 'kissing'
                      ? 'origin-story-heart-halo opacity-100'
                      : kissBeat === 'afterglow'
                        ? 'opacity-35'
                        : 'opacity-0'
                  }`}
                  style={{
                    background:
                      'radial-gradient(circle, rgba(249,168,201,0.42) 0%, rgba(247,217,148,0.24) 48%, rgba(45,24,59,0) 74%)',
                  }}
                />

                {/* 12 Continuously Rising Pastel Rose & Gold Hearts while the song plays */}
                {(kissBeat === 'kissing' || kissBeat === 'afterglow') && (
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-[38%] z-20 h-48 transition-opacity duration-700 ${
                      kissBeat === 'afterglow' ? 'opacity-0' : 'opacity-100'
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

                {/* 4-Beat Romance-Comedy Character Positioning synced to the 5-second audio */}
                <div className="relative z-10 flex h-[74%] w-full items-end justify-center">
                  <div
                    className="h-full transition-transform duration-[540ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      transform:
                        kissBeat === 'kissing'
                          ? 'translate3d(21px, 0, 0) rotate(2.4deg)'
                          : kissBeat === 'shyGlance'
                            ? 'translate3d(8px, -2px, 0) rotate(0.8deg)'
                            : kissBeat === 'afterglow'
                              ? 'translate3d(12px, 0, 0)'
                              : 'translate3d(-14px, 0, 0)',
                    }}
                  >
                    <div className="origin-story-torso-breathe h-full">
                      <ShivjeeCharacter mood={shivjeeMood} className="h-full w-auto" />
                    </div>
                  </div>
                  <div
                    className="h-[97%] transition-transform duration-[540ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      transform:
                        kissBeat === 'kissing'
                          ? 'translate3d(-21px, 0, 0) rotate(-2.4deg)'
                          : kissBeat === 'shyGlance'
                            ? 'translate3d(-8px, -2px, 0) rotate(-0.8deg)'
                            : kissBeat === 'afterglow'
                              ? 'translate3d(-12px, 0, 0)'
                              : 'translate3d(14px, 0, 0)',
                    }}
                  >
                    <div
                      className="origin-story-torso-breathe h-full"
                      style={{ animationDelay: '0.5s' }}
                    >
                      <ArchanaCharacter
                        mood={archanaMood}
                        pregnancyMonth={0}
                        className="h-full w-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                    className="origin-story-headline-shimmer mt-1 font-serif text-xl font-bold tracking-[0.06em] sm:text-2xl"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
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

            {/* ================= SCENES 8, 9, 10 BEAT 1: PROPORTIONAL HEIGHT RULER STAGE ================= */}
            {isGrowthRulerScene && (
              <div className="relative z-10 flex h-full w-full flex-col justify-end px-3 pt-3 pb-3">
                {/* Top-left Age · Year · Height telemetry pill with crisp digit-roll animation */}
                <div
                  data-testid="origin-growth-telemetry"
                  className={`absolute top-3.5 left-3.5 z-30 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-extrabold tracking-wide shadow-xs transition-all duration-300 ${
                    isRulerDissolving
                      ? 'translate-x-4 opacity-0'
                      : isAge17GoldLock
                        ? 'border-[#E6B85C] bg-gradient-to-r from-[#FFF4C8] via-[#FFF9E6] to-[#FFE8F1] text-[#3A1233] shadow-[0_0_22px_rgba(230,184,92,0.55)]'
                        : 'border-[#D94B7D]/25 bg-white/95 text-[#3A1233]'
                  }`}
                >
                  <span
                    key={`age_${activeGrowthStep.age}`}
                    className="origin-story-digit-roll inline-block text-[#D94B7D]"
                  >
                    {isAge17GoldLock
                      ? `${activeGrowthStep.year} · AGE ${activeGrowthStep.age} · ${activeGrowthStep.heightLabel}`
                      : `AGE ${activeGrowthStep.age}`}
                  </span>
                  {!isAge17GoldLock && (
                    <>
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
                    </>
                  )}
                </div>

                {/* Unified 230-unit proportional growth & height-ruler coordinate frame */}
                <div className="relative mx-auto flex h-[86%] w-full max-w-[360px] items-end justify-center">
                  {/* Right-edge pastel height ruler (slides in from right, dissolves out in Beat 2) */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-0 right-1 bottom-0 z-10 w-16 border-l border-[#D94B7D]/22 transition-all duration-500 ${
                      isRulerDissolving
                        ? 'origin-story-ruler-dissolve'
                        : 'origin-story-ruler-slide-in'
                    }`}
                  >
                    {ORIGIN_RULER_TICKS.map((tick) => {
                      const bottomPct = inchesToStageBottomPct(tick.inches);
                      return (
                        <div
                          key={tick.label}
                          className="absolute left-0 flex w-full translate-y-1/2 items-center gap-1.5"
                          style={{ bottom: `${bottomPct}%` }}
                        >
                          <span
                            className={`block h-[1.5px] ${
                              tick.isFiveTwo
                                ? 'w-5 bg-[#D94B7D]'
                                : tick.major
                                  ? 'w-3.5 bg-[#C58CA5]'
                                  : 'w-2 bg-[#DEC0CE]'
                            }`}
                          />
                          {tick.major && (
                            <span
                              className={`text-[10px] leading-none font-bold ${
                                tick.isFiveTwo
                                  ? 'rounded-full bg-[#D94B7D] px-1.5 py-0.5 text-[9.5px] text-white shadow-xs'
                                  : 'text-[#8C5A72]'
                              }`}
                            >
                              {tick.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Glowing animated rose-gold height tracker beam connecting crown to ruler */}
                  {currentScene.id !== 'freeze_and_finale' && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-14 left-6 z-10 flex items-center transition-all duration-300 ease-out"
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

                  {/* Scene 10 Beat 1: 5'2" Dashed Laser/Tape Padlock Barrier right at Anamika's crown */}
                  {currentScene.id === 'freeze_and_finale' && (
                    <div
                      key={`barrier_${barrierJiggleKey}`}
                      data-testid="origin-padlock-barrier"
                      className={`pointer-events-none absolute right-12 left-4 z-30 transition-all duration-500 ${
                        isRulerDissolving
                          ? 'origin-story-ruler-dissolve'
                          : barrierJiggleKey > 0
                            ? 'origin-story-barrier-jiggle'
                            : 'origin-story-padlock-slam'
                      }`}
                      style={{ bottom: `${fiveTwoBottomPct}%` }}
                    >
                      <div className="relative flex w-full items-center">
                        <div
                          className="h-[2.5px] w-full border-t-2 border-dashed border-[#D94B7D]"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(217, 75, 125, 0.35))',
                          }}
                        />
                        <div className="absolute -top-7 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#E6B85C] bg-gradient-to-r from-[#FFF7DF] via-[#FFF8FB] to-[#FFE7F0] px-3 py-1 whitespace-nowrap shadow-sm">
                          <Lock className="h-3 w-3 text-[#D94B7D]" />
                          <span className="text-[10px] font-extrabold tracking-[0.12em] text-[#3A1233] uppercase">
                            HEIGHT LOCKED · 5&apos;2&quot;
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Anamika Proportional Character Stage (ZERO CSS scale() height stretching!) */}
                  <div
                    className={`relative z-20 flex h-full items-end justify-center transition-all duration-500 ${
                      isRulerDissolving
                        ? 'ml-0 scale-[1.05]'
                        : '-ml-10'
                    } ${
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
                          expression={
                            currentScene.id === 'freeze_and_finale' ? teenExpression : 'happy'
                          }
                          showQuestionSparkle={
                            currentScene.id === 'freeze_and_finale' &&
                            scene10Beat === 'freeze' &&
                            activeGrowthStep.age === 15
                          }
                          className="h-full w-auto"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SCENE 10 BEATS 3 & 4: SHOWSTOPPER BIRTHDAY QUEEN FINALE ================= */}
            {currentScene.id === 'freeze_and_finale' && scene10Beat === 'finale' && (
              <div
                data-testid="origin-finale-stage"
                className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pt-4 pb-3"
              >
                {/* 30 Fluttering Pastel Rose, Champagne-Gold, Lilac & Ivory Confetti Petals (2 Staggered Waves) */}
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  aria-hidden="true"
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

                {/* Staggered Glowing Editorial Finale Typography: CHAPTER 17 · UNLOCKED + Shimmer Headline */}
                <div className="origin-story-prologue-in relative z-20 flex flex-col items-center text-center">
                  <span
                    data-testid="origin-finale-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E6B85C]/65 bg-gradient-to-r from-[#FFF9E4] via-[#FFFDF7] to-[#FFF2F7] px-3.5 py-1 text-[10px] font-extrabold tracking-[0.18em] text-[#8A5A12] uppercase shadow-xs"
                  >
                    <Sparkles className="h-3 w-3 text-[#D94B7D]" />
                    <span>{finaleCopy.badgeLabel}</span>
                  </span>
                  <h2
                    data-testid="origin-finale-headline"
                    className="origin-story-headline-shimmer mt-2 font-serif text-xl leading-snug font-bold sm:text-2xl"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {finaleCopy.headline}
                  </h2>
                </div>

                {/* Beaming Anamika Birthday Queen with Theatrical Zoom-In (scale 1.07) & Glowing 17 Crown */}
                <div className="origin-story-finale-queen-in relative z-20 flex h-[71%] items-end justify-center">
                  <div className="origin-story-torso-breathe h-full">
                    <AnamikaTeen expression="birthdayQueen" className="h-full w-auto" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Editorial Storybook Subtitle Card + Interactive Navigation Controls */}
      <footer className="relative z-30 mx-auto w-full max-w-[480px] px-4 pt-1 pb-5 sm:pb-6">
        <div
          key={`caption_${currentScene.id}_${isFinaleReveal ? 'finale' : scene9SecondaryActive ? 's2' : 's1'}`}
          data-testid="origin-caption-box"
          className="origin-story-caption-in px-4 py-3.5 text-center"
          style={{
            background: 'rgba(255, 253, 250, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(217, 75, 125, 0.18)',
            borderRadius: '20px',
            boxShadow: '0 12px 30px -14px rgba(130, 42, 82, 0.18)',
          }}
        >
          <p className="text-[13.5px] leading-[1.5] font-medium text-[#3A1233] sm:text-[14.5px]">
            {renderHighlightedCaption(activeCaption)}
          </p>
        </div>

        {/* Navigation Bar: Muted Back, Replay Scene, Radiant Next / Enter the Birthday World › */}
        <div className="mt-3 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {sceneIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                data-testid="origin-back-btn"
                aria-label="Previous scene"
                className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isStarryScene
                    ? 'border-white/25 bg-white/15 text-[#FFF8FB] opacity-80 hover:opacity-100'
                    : 'border-[#D94B7D]/20 bg-white/85 text-[#5D2949] opacity-70 hover:opacity-100'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
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
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                  isStarryScene
                    ? 'border-white/25 bg-white/15 text-[#FFF8FB] opacity-75 hover:opacity-100'
                    : 'border-[#D94B7D]/20 bg-white/85 text-[#7A3A5C] opacity-70 hover:opacity-100'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {currentScene.id === 'freeze_and_finale' && scene10Beat === 'finale' ? (
            <button
              type="button"
              onClick={handleEnterBirthdayWorld}
              data-testid="origin-enter-world-btn"
              className="origin-story-cta-shimmer origin-story-next-glow relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-[#D94B7D] via-[#E56995] to-[#E6B85C] px-4 py-2.5 text-[13px] font-bold tracking-wide whitespace-nowrap text-white shadow-[0_10px_28px_rgba(217,75,125,0.38)] transition-transform active:scale-[0.98] sm:px-6 sm:text-sm"
            >
              <span>{finaleCopy.ctaLabel}</span>
              <ChevronRight className="origin-story-arrow-nudge h-4 w-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              data-testid="origin-next-btn"
              data-settled={sceneSettled ? 'true' : 'false'}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-all active:scale-[0.97] ${
                sceneSettled
                  ? 'origin-story-next-glow bg-gradient-to-r from-[#D94B7D] to-[#E878A0] shadow-[0_8px_24px_rgba(217,75,125,0.35)]'
                  : 'bg-[#D94B7D]/82 shadow-sm hover:bg-[#D94B7D]'
              }`}
            >
              <span>Next</span>
              <ChevronRight
                className={`h-4 w-4 ${sceneSettled ? 'origin-story-arrow-nudge' : ''}`}
              />
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

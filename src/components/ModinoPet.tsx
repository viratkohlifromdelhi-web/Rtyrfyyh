import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import {
  MODINO_EVENT_NAME,
  type ModinoEventDetail,
  type ModinoReactionCategory,
} from '../utils/modinoBus';
import {
  MODINO_MAX_ACTIVE_HEARTS,
  createModinoMicroHearts,
  getModinoMicroHeartCount,
  modinoReactionEngine,
  type ModinoMicroHeart,
  type ModinoMood,
  type ModinoReaction,
} from '../utils/modinoReactions';
import { playUiSfx, type UiSfxName } from '../utils/uiSoundEngine';
import {
  LIVE_BROADCAST_LOCAL_EVENT,
  computeLiveBroadcastHoldMs,
  isLiveBroadcastDeliverable,
  markLiveBroadcastIdSeen,
  parseLiveBroadcastData,
  readSeenLiveBroadcastIds,
  subscribeToLiveBroadcast,
  type LiveBroadcastMood,
  type LiveBroadcastRecord,
} from '../utils/liveBroadcastService';
import {
  STAGE3_TO_MAIN_TIMING,
  computeModinoEntranceDelayMs,
} from '../utils/preloader';
import { ModinoAvatarSvg } from './ModinoAvatarSvg';

interface LiveConfettiParticle {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  delayMs: number;
  durationMs: number;
  color: string;
  shape: 'petal' | 'star' | 'dot';
}

const LIVE_CONFETTI_COLORS = [
  '#F59EBD',
  '#E6B85C',
  '#C7B6F5',
  '#F9B493',
  '#D94B7D',
  '#F4D078',
] as const;

const LIVE_MOOD_TO_AVATAR_MOOD: Record<LiveBroadcastMood, ModinoMood> = {
  cheer: 'happy_smile',
  tease: 'laugh',
  hype: 'jump',
  whisper: 'shy_blush',
};

const LIVE_MOOD_TO_SFX: Record<LiveBroadcastMood, UiSfxName> = {
  cheer: 'wake_chirp',
  tease: 'giggle',
  hype: 'surprise_bling',
  whisper: 'awww_chime',
};

const LIVE_MOOD_ANIM_CLASS: Record<LiveBroadcastMood, string> = {
  cheer: 'animate-modino-live-cheer',
  tease: 'animate-modino-live-tease',
  hype: 'animate-modino-live-hype',
  whisper: 'animate-modino-live-whisper',
};

function createLiveConfettiBurst(nextId: () => number): LiveConfettiParticle[] {
  const count = 14;
  const shapes: ReadonlyArray<LiveConfettiParticle['shape']> = ['petal', 'star', 'dot'];
  const particles: LiveConfettiParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    const spreadRatio = (i / (count - 1)) * 2 - 1; // -1..1
    const dx = Math.round(spreadRatio * 58 + (i % 2 === 0 ? 5 : -5));
    const dy = -Math.round(44 + Math.cos(spreadRatio * 1.2) * 34 + (i % 3) * 8);
    const rot = Math.round(spreadRatio * 185 + (i % 2 === 0 ? 40 : -40));
    particles.push({
      id: nextId(),
      dx,
      dy,
      rot,
      size: i % 3 === 1 ? 10 : 7 + (i % 3),
      delayMs: (i % 5) * 28,
      durationMs: 820 + (i % 4) * 70,
      color: LIVE_CONFETTI_COLORS[i % LIVE_CONFETTI_COLORS.length],
      shape: shapes[i % shapes.length],
    });
  }
  return particles;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const MODINO_INACTIVITY_SLEEP_MS = 3500;
/**
 * Default entrance delay strictly AFTER the Stage 3 -> Stage 4 silk curtain transition completes
 * (1850ms silk curtain reveal + 2000ms post-curtain breathing window = 3850ms from transition start).
 */
export const MODINO_DEFAULT_ENTRANCE_DELAY_MS = STAGE3_TO_MAIN_TIMING.modinoDelayAfterCurtainMs;
const BUBBLE_DURATION_MS = 3400;
const SLEEP_BUBBLE_DURATION_MS = 1800;
const SLEEP_MUTTER_CYCLE_MS = 4600;
const WAKE_BUBBLE_DURATION_MS = 2400;
const WAKE_FOLLOWUP_DELAY_MS = 650;
const ANALYTICS_THROTTLE_MS = 4000;

interface ModinoPetProps {
  isSiteRevealed: boolean;
  /** True strictly once the Stage 3 -> Stage 4 silk curtain / crossfade transition has finished */
  isCurtainComplete?: boolean;
  /** Epoch ms timestamp recorded when the silk curtain transition completed (`null` while still running) */
  curtainCompletedAtMs?: number | null;
  isBlockedByOverlay: boolean;
  /** Delay after silk curtain completion before Modino glides into view and delivers its welcome greeting */
  entranceDelayMs?: number;
}

const SECTION_OBSERVER_MAP: ReadonlyArray<{
  id: string;
  category: ModinoReactionCategory;
}> = [
  { id: 'backstory', category: 'backstory' },
  { id: 'case-file', category: 'backstory' },
  { id: 'wheel', category: 'spin' },
  { id: 'gift', category: 'interaction_hype' },
  { id: 'make-a-wish', category: 'cute' },
  { id: 'little-coop', category: 'last_playback' },
  { id: 'closing-signoff', category: 'ending' },
];

export function ModinoPet({
  isSiteRevealed,
  isCurtainComplete = true,
  curtainCompletedAtMs,
  isBlockedByOverlay,
  entranceDelayMs = MODINO_DEFAULT_ENTRANCE_DELAY_MS,
}: ModinoPetProps) {
  const [mood, setMood] = useState<ModinoMood>('idle');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [tapRippleKey, setTapRippleKey] = useState(0);
  const [isBubbleSleepy, setIsBubbleSleepy] = useState(false);
  const [isBubbleLive, setIsBubbleLive] = useState(false);
  const [activeLiveMood, setActiveLiveMood] = useState<LiveBroadcastMood | null>(null);
  const [liveAnimKey, setLiveAnimKey] = useState(0);
  const [liveConfetti, setLiveConfetti] = useState<LiveConfettiParticle[]>([]);
  const [isTucked, setIsTucked] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );
  const [microHearts, setMicroHearts] = useState<ModinoMicroHeart[]>([]);

  const dockRef = useRef<HTMLDivElement | null>(null);
  const moodRef = useRef<ModinoMood>('idle');

  const applyMood = useCallback((nextMood: ModinoMood) => {
    moodRef.current = nextMood;
    setMood(nextMood);
  }, []);

  const isReadyAfterCurtain = isCurtainComplete && curtainCompletedAtMs !== null;
  const isActive = isSiteRevealed && isReadyAfterCurtain && !isBlockedByOverlay && !isTabHidden;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const isTuckedRef = useRef(isTucked);
  isTuckedRef.current = isTucked;

  const hasEnteredRef = useRef(hasEntered);
  hasEnteredRef.current = hasEntered;

  const isLiveBroadcastActiveRef = useRef(false);
  const pendingLiveBroadcastRef = useRef<LiveBroadcastRecord | null>(null);
  const seenBroadcastIdsRef = useRef<Set<string>>(readSeenLiveBroadcastIds());

  const bubbleVisibleRef = useRef(false);
  bubbleVisibleRef.current = Boolean(bubbleText && !isBubbleSleepy);

  const sleepTimerRef = useRef<number | null>(null);
  const sleepMutterTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const moodResetTimerRef = useRef<number | null>(null);
  const wakeFollowupTimerRef = useRef<number | null>(null);
  const greetingTimerRef = useRef<number | null>(null);
  const untuckTimerRef = useRef<number | null>(null);
  const liveConfettiTimerRef = useRef<number | null>(null);
  const liveConfettiIdCounterRef = useRef(1);
  const heartTimersRef = useRef<Map<number, number>>(new Map());
  const heartIdCounterRef = useRef(1);
  const heartColorCursorRef = useRef(0);
  const hasGreetedRef = useRef(false);
  const lastScrollActivityRef = useRef(0);
  const lastAnalyticsRef = useRef(-Infinity);
  const observedSectionsRef = useRef<Set<string>>(new Set());

  const clearTimer = (ref: { current: number | null }) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const clearAllHeartTimers = useCallback(() => {
    for (const timerId of heartTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    heartTimersRef.current.clear();
    setMicroHearts([]);
  }, []);

  const clearAllTimers = useCallback(() => {
    clearTimer(sleepTimerRef);
    clearTimer(sleepMutterTimerRef);
    clearTimer(bubbleTimerRef);
    clearTimer(moodResetTimerRef);
    clearTimer(wakeFollowupTimerRef);
    clearTimer(greetingTimerRef);
    clearTimer(untuckTimerRef);
    clearTimer(liveConfettiTimerRef);
    setLiveConfetti([]);
    isLiveBroadcastActiveRef.current = false;
    setIsBubbleLive(false);
    setActiveLiveMood(null);
    clearAllHeartTimers();
  }, [clearAllHeartTimers]);

  const emitMicroHearts = useCallback(
    (params: {
      trigger: 'direct_tap' | 'category';
      mood: ModinoMood;
      category?: ModinoReactionCategory;
    }) => {
      if (!isActiveRef.current || isTuckedRef.current) return;

      const reduced = prefersReducedMotion();
      const count = getModinoMicroHeartCount({
        trigger: params.trigger,
        mood: params.mood,
        category: params.category,
        reducedMotion: reduced,
      });

      if (count <= 0) return;

      const colorOffset = heartColorCursorRef.current;
      heartColorCursorRef.current = (heartColorCursorRef.current + count) % 4;

      const spawned = createModinoMicroHearts(
        count,
        () => {
          const next = heartIdCounterRef.current;
          heartIdCounterRef.current += 1;
          return next;
        },
        { reducedMotion: reduced, colorOffset },
      );

      if (spawned.length === 0) return;

      setMicroHearts((prev) => {
        const combined = [...prev, ...spawned];
        if (combined.length > MODINO_MAX_ACTIVE_HEARTS) {
          const overflowCount = combined.length - MODINO_MAX_ACTIVE_HEARTS;
          const dropped = combined.slice(0, overflowCount);
          for (const d of dropped) {
            const existingTimer = heartTimersRef.current.get(d.id);
            if (existingTimer !== undefined) {
              window.clearTimeout(existingTimer);
              heartTimersRef.current.delete(d.id);
            }
          }
          return combined.slice(overflowCount);
        }
        return combined;
      });

      for (const heart of spawned) {
        const lifetimeMs = heart.delayMs + heart.durationMs + 90;
        const timerId = window.setTimeout(() => {
          heartTimersRef.current.delete(heart.id);
          setMicroHearts((prev) => prev.filter((item) => item.id !== heart.id));
        }, lifetimeMs);
        heartTimersRef.current.set(heart.id, timerId);
      }
    },
    [],
  );

  const logModinoAnalytics = useCallback((reaction: ModinoReaction) => {
    const now = Date.now();
    if (now - lastAnalyticsRef.current < ANALYTICS_THROTTLE_MS) return;
    lastAnalyticsRef.current = now;
    try {
      trackEvent('modino_pet_interacted', 'Modino Pet', {
        mood: reaction.mood,
        text: reaction.text,
      });
    } catch {
      // silent
    }
  }, []);

  /**
   * Displays the next non-repeating sleepy mutter while Modino stays in `sleepy_zzz`,
   * then schedules the next periodic mutter until user activity wakes Modino up.
   */
  const showNextSleepMutter = useCallback((playSigh: boolean) => {
    clearTimer(sleepMutterTimerRef);
    clearTimer(bubbleTimerRef);
    if (!isActiveRef.current || isTuckedRef.current || moodRef.current !== 'sleepy_zzz') {
      return;
    }

    if (playSigh) {
      playUiSfx('sleep_sigh');
    }

    const mutter = modinoReactionEngine.nextSleepMutter();
    setIsBubbleSleepy(true);
    setBubbleText(mutter);
    setBubbleKey((k) => k + 1);

    bubbleTimerRef.current = window.setTimeout(() => {
      bubbleTimerRef.current = null;
      setBubbleText(null);
      setIsBubbleSleepy(false);

      // Keep cycling through sleepy mutters gently while Modino stays asleep
      if (isActiveRef.current && !isTuckedRef.current && moodRef.current === 'sleepy_zzz') {
        sleepMutterTimerRef.current = window.setTimeout(() => {
          sleepMutterTimerRef.current = null;
          showNextSleepMutter(false);
        }, SLEEP_MUTTER_CYCLE_MS);
      }
    }, SLEEP_BUBBLE_DURATION_MS);
  }, []);

  const scheduleSleepCountdown = useCallback(() => {
    clearTimer(sleepTimerRef);
    clearTimer(sleepMutterTimerRef);
    if (!isActiveRef.current || isTuckedRef.current || !hasEnteredRef.current) return;
    if (isLiveBroadcastActiveRef.current) return;
    if (moodRef.current === 'sleepy_zzz') return;

    sleepTimerRef.current = window.setTimeout(() => {
      sleepTimerRef.current = null;
      if (!isActiveRef.current || isTuckedRef.current || isLiveBroadcastActiveRef.current) return;
      if (bubbleVisibleRef.current) {
        // Wait gently until the active important speech bubble finishes
        scheduleSleepCountdown();
        return;
      }

      clearTimer(moodResetTimerRef);
      clearTimer(wakeFollowupTimerRef);
      applyMood('sleepy_zzz');
      showNextSleepMutter(true);
    }, MODINO_INACTIVITY_SLEEP_MS);
  }, [applyMood, showNextSleepMutter]);

  const showReaction = useCallback(
    (
      reaction: ModinoReaction,
      options?: {
        triggerRipple?: boolean;
        logAnalytics?: boolean;
        heartTrigger?: 'direct_tap' | 'category';
        heartMood?: ModinoMood;
        category?: ModinoReactionCategory;
      },
    ) => {
      if (!isActiveRef.current) return;

      clearTimer(sleepTimerRef);
      clearTimer(sleepMutterTimerRef);
      clearTimer(moodResetTimerRef);
      clearTimer(bubbleTimerRef);
      clearTimer(wakeFollowupTimerRef);

      isLiveBroadcastActiveRef.current = false;
      setIsBubbleLive(false);
      setActiveLiveMood(null);
      applyMood(reaction.mood);
      setIsBubbleSleepy(false);
      setBubbleText(reaction.text);
      setBubbleKey((k) => k + 1);

      if (options?.triggerRipple) {
        setTapRippleKey((k) => k + 1);
      }

      emitMicroHearts({
        trigger: options?.heartTrigger ?? 'category',
        mood: options?.heartMood ?? reaction.mood,
        category: options?.category,
      });

      playUiSfx(reaction.sfx);

      if (options?.logAnalytics) {
        logModinoAnalytics(reaction);
      }

      const settleDelayMs = reaction.mood === 'jump' || reaction.mood === 'surprised' ? 1400 : 2800;
      moodResetTimerRef.current = window.setTimeout(() => {
        moodResetTimerRef.current = null;
        if (moodRef.current !== 'sleepy_zzz') {
          applyMood('idle');
        }
      }, settleDelayMs);

      bubbleTimerRef.current = window.setTimeout(() => {
        setBubbleText(null);
        setIsBubbleSleepy(false);
        bubbleTimerRef.current = null;
        scheduleSleepCountdown();
      }, BUBBLE_DURATION_MS);

      scheduleSleepCountdown();
    },
    [applyMood, emitMicroHearts, logModinoAnalytics, scheduleSleepCountdown],
  );

  const wakeUpStartled = useCallback(
    (followup?: () => void) => {
      if (!isActiveRef.current || isTuckedRef.current) return;
      if (moodRef.current !== 'sleepy_zzz') {
        followup?.();
        return;
      }

      clearTimer(sleepTimerRef);
      clearTimer(sleepMutterTimerRef);
      clearTimer(wakeFollowupTimerRef);
      clearTimer(moodResetTimerRef);
      clearTimer(bubbleTimerRef);

      const wakeReaction = modinoReactionEngine.nextWakeUp();
      applyMood(wakeReaction.mood);
      setIsBubbleSleepy(false);
      setBubbleText(wakeReaction.text);
      setBubbleKey((k) => k + 1);

      try {
        haptics.light();
      } catch {
        // silent
      }
      playUiSfx(wakeReaction.sfx);

      if (followup) {
        wakeFollowupTimerRef.current = window.setTimeout(() => {
          wakeFollowupTimerRef.current = null;
          if (!isActiveRef.current || isTuckedRef.current) return;
          followup();
        }, WAKE_FOLLOWUP_DELAY_MS);
      } else {
        const wakeSettleMs = wakeReaction.mood === 'jump' ? 1400 : 1200;
        moodResetTimerRef.current = window.setTimeout(() => {
          moodResetTimerRef.current = null;
          if (moodRef.current !== 'sleepy_zzz') {
            applyMood('idle');
          }
        }, wakeSettleMs);

        bubbleTimerRef.current = window.setTimeout(() => {
          setBubbleText(null);
          setIsBubbleSleepy(false);
          bubbleTimerRef.current = null;
          scheduleSleepCountdown();
        }, WAKE_BUBBLE_DURATION_MS);
      }
    },
    [applyMood, scheduleSleepCountdown],
  );

  const triggerCategoryReaction = useCallback(
    (category: ModinoReactionCategory, options?: { triggerRipple?: boolean; logAnalytics?: boolean }) => {
      if (!isActiveRef.current || isTuckedRef.current) return;
      // Preserve active owner live broadcast against passive section/scroll chatter
      if (isLiveBroadcastActiveRef.current && category !== 'direct_tap') return;

      const deliver = () => {
        const reaction = modinoReactionEngine.next(category);
        showReaction(reaction, {
          ...options,
          heartTrigger: category === 'direct_tap' ? 'direct_tap' : 'category',
          heartMood: reaction.mood,
          category,
        });
      };

      if (moodRef.current === 'sleepy_zzz') {
        wakeUpStartled(deliver);
        return;
      }

      deliver();
    },
    [showReaction, wakeUpStartled],
  );

  const deliverLiveBroadcastNow = useCallback(
    (record: LiveBroadcastRecord) => {
      if (!isActiveRef.current || !hasEnteredRef.current) return;

      clearTimer(sleepTimerRef);
      clearTimer(sleepMutterTimerRef);
      clearTimer(moodResetTimerRef);
      clearTimer(bubbleTimerRef);
      clearTimer(wakeFollowupTimerRef);
      clearTimer(liveConfettiTimerRef);

      const avatarMood = LIVE_MOOD_TO_AVATAR_MOOD[record.mood];
      isLiveBroadcastActiveRef.current = true;
      setIsBubbleLive(true);
      setActiveLiveMood(record.mood);
      setLiveAnimKey((k) => k + 1);
      setIsBubbleSleepy(false);
      applyMood(avatarMood);
      setBubbleText(record.message);
      setBubbleKey((k) => k + 1);
      setTapRippleKey((k) => k + 1);

      emitMicroHearts({
        trigger: 'direct_tap',
        mood: avatarMood,
      });

      if (record.confetti && !prefersReducedMotion()) {
        const burst = createLiveConfettiBurst(() => {
          const next = liveConfettiIdCounterRef.current;
          liveConfettiIdCounterRef.current += 1;
          return next;
        });
        setLiveConfetti(burst);
        liveConfettiTimerRef.current = window.setTimeout(() => {
          liveConfettiTimerRef.current = null;
          setLiveConfetti([]);
        }, 1250);
      } else {
        setLiveConfetti([]);
      }

      try {
        haptics.success();
      } catch {
        // silent
      }
      playUiSfx(LIVE_MOOD_TO_SFX[record.mood]);

      const holdMs = computeLiveBroadcastHoldMs(record.message);

      moodResetTimerRef.current = window.setTimeout(() => {
        moodResetTimerRef.current = null;
        if (moodRef.current !== 'sleepy_zzz') {
          applyMood('idle');
        }
      }, 2200);

      bubbleTimerRef.current = window.setTimeout(() => {
        bubbleTimerRef.current = null;
        isLiveBroadcastActiveRef.current = false;
        setIsBubbleLive(false);
        setActiveLiveMood(null);
        setBubbleText(null);
        setIsBubbleSleepy(false);
        scheduleSleepCountdown();
      }, holdMs);
    },
    [applyMood, emitMicroHearts, scheduleSleepCountdown],
  );

  const handleIncomingLiveBroadcast = useCallback(
    (record: LiveBroadcastRecord | null) => {
      if (!record) return;
      if (!isSiteRevealed || !isReadyAfterCurtain || isBlockedByOverlay || !hasEnteredRef.current) {
        return;
      }

      if (!isLiveBroadcastDeliverable(record, seenBroadcastIdsRef.current, Date.now())) {
        return;
      }

      // Mark seen immediately in both memory and sessionStorage so reloads never replay
      seenBroadcastIdsRef.current = markLiveBroadcastIdSeen(record.broadcastId);

      // If Modino was tucked away, auto-untuck first and deliver cleanly once mounted
      if (isTuckedRef.current) {
        pendingLiveBroadcastRef.current = record;
        setIsTucked(false);
        return;
      }

      deliverLiveBroadcastNow(record);
    },
    [deliverLiveBroadcastNow, isBlockedByOverlay, isReadyAfterCurtain, isSiteRevealed],
  );

  // Track document visibility so timers pause cleanly when tab is hidden
  useEffect(() => {
    const onVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Reset entrance state cleanly whenever a full Replay Intro clears `curtainCompletedAtMs` back to `null`
  useEffect(() => {
    if (curtainCompletedAtMs === null) {
      clearTimer(greetingTimerRef);
      hasGreetedRef.current = false;
      hasEnteredRef.current = false;
      setHasEntered(false);
    }
  }, [curtainCompletedAtMs]);

  // Staggered entrance + signature welcome greeting strictly 2.0s AFTER silk curtain completion.
  // Anchored to `curtainCompletedAtMs` so lazy-chunk mount timing, brief lightboxes, or tab switches
  // never cause timing drift or leave Modino stuck invisible.
  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      applyMood('idle');
      setBubbleText(null);
      setIsBubbleSleepy(false);
      return;
    }

    if (!hasGreetedRef.current && !isTucked) {
      const remainingDelayMs =
        typeof curtainCompletedAtMs === 'number'
          ? computeModinoEntranceDelayMs({
              curtainCompletedAtMs,
              nowMs: Date.now(),
              delayAfterCurtainMs: entranceDelayMs,
            })
          : Math.max(0, entranceDelayMs);

      if (remainingDelayMs === null) {
        return;
      }

      greetingTimerRef.current = window.setTimeout(() => {
        greetingTimerRef.current = null;
        if (!isActiveRef.current || isTuckedRef.current) return;
        hasGreetedRef.current = true;
        hasEnteredRef.current = true;
        setHasEntered(true);

        const greeting = modinoReactionEngine.next('greeting');
        showReaction(greeting, {
          heartTrigger: 'category',
          heartMood: greeting.mood,
          category: 'greeting',
        });
      }, remainingDelayMs);
    } else if (hasEnteredRef.current) {
      scheduleSleepCountdown();
    }

    return () => {
      clearAllTimers();
    };
  }, [
    isActive,
    isTucked,
    entranceDelayMs,
    curtainCompletedAtMs,
    applyMood,
    clearAllTimers,
    scheduleSleepCountdown,
    showReaction,
  ]);

  // Listen to global Modino CustomEvent bus.
  // If user interacts on the Hero during the 1s grace window, appear smoothly and handle it cleanly without double-greeting!
  useEffect(() => {
    const handleBusEvent = (event: Event) => {
      const detail = (event as CustomEvent<ModinoEventDetail>).detail;
      if (!detail?.category) return;
      if (!isActiveRef.current || isTuckedRef.current) return;

      if (!hasEnteredRef.current) {
        clearTimer(greetingTimerRef);
        hasGreetedRef.current = true;
        hasEnteredRef.current = true;
        setHasEntered(true);
      }

      if (detail.customReaction) {
        const custom = detail.customReaction;
        const deliverCustom = () => {
          showReaction(custom, {
            triggerRipple: true,
            logAnalytics: false,
            heartTrigger: 'category',
            heartMood: custom.mood,
            category: detail.category,
          });
        };
        if (moodRef.current === 'sleepy_zzz') {
          wakeUpStartled(deliverCustom);
        } else {
          deliverCustom();
        }
        return;
      }

      triggerCategoryReaction(detail.category, {
        logAnalytics: detail.category === 'direct_tap',
      });
    };

    window.addEventListener(MODINO_EVENT_NAME, handleBusEvent);
    return () => {
      window.removeEventListener(MODINO_EVENT_NAME, handleBusEvent);
    };
  }, [showReaction, triggerCategoryReaction, wakeUpStartled]);

  // Flush any live broadcast that triggered an auto-untuck once Modino is untucked and active
  useEffect(() => {
    if (!isActive || isTucked || !hasEntered) return;
    const pending = pendingLiveBroadcastRef.current;
    if (!pending) return;
    pendingLiveBroadcastRef.current = null;
    const frameId = window.requestAnimationFrame(() => {
      deliverLiveBroadcastNow(pending);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [deliverLiveBroadcastNow, hasEntered, isActive, isTucked]);

  // Real-time Firestore listener for Remote Modino Live Broadcasts (/site_config/live_broadcast).
  // Strictly gated to Stage 4 after Modino's +2s post-curtain arrival (never interrupts Stages 1, 2, or 3).
  // Remains active even when Modino is sleeping or tucked so live messages auto-wake and untuck her.
  useEffect(() => {
    if (!isSiteRevealed || !isReadyAfterCurtain || isBlockedByOverlay || !hasEntered) {
      return;
    }

    const unsubscribe = subscribeToLiveBroadcast(
      (record) => {
        handleIncomingLiveBroadcast(record);
      },
      () => {
        // Silent graceful fallback on transient offline or rule rejections
      },
    );

    const onLocalBroadcast = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      const parsed = parseLiveBroadcastData(detail);
      if (parsed) {
        handleIncomingLiveBroadcast(parsed);
      }
    };
    window.addEventListener(LIVE_BROADCAST_LOCAL_EVENT, onLocalBroadcast);

    return () => {
      unsubscribe();
      window.removeEventListener(LIVE_BROADCAST_LOCAL_EVENT, onLocalBroadcast);
    };
  }, [
    handleIncomingLiveBroadcast,
    hasEntered,
    isBlockedByOverlay,
    isReadyAfterCurtain,
    isSiteRevealed,
  ]);

  // Global passive activity tracker for 3.5s inactivity sleep & instant wake-up
  useEffect(() => {
    if (!isActive || isTucked || !hasEntered) return;

    const handleActivity = (source: 'scroll' | 'input', event?: Event) => {
      if (source === 'scroll') {
        const now = performance.now();
        if (now - lastScrollActivityRef.current < 250) return;
        lastScrollActivityRef.current = now;
      }

      // Let direct interactions on Modino's own controls flow through their dedicated handlers
      if (
        source === 'input' &&
        event?.target instanceof Node &&
        dockRef.current?.contains(event.target)
      ) {
        return;
      }

      if (moodRef.current === 'sleepy_zzz') {
        wakeUpStartled();
        return;
      }

      scheduleSleepCountdown();
    };

    const onPointerDown = (e: Event) => handleActivity('input', e);
    const onTouchStart = (e: Event) => handleActivity('input', e);
    const onClick = (e: Event) => handleActivity('input', e);
    const onKeyDown = (e: Event) => handleActivity('input', e);
    const onScroll = () => handleActivity('scroll');

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [isActive, isTucked, hasEntered, scheduleSleepCountdown, wakeUpStartled]);

  // Single lightweight IntersectionObserver fallback for non-clicked sections (once per section)
  useEffect(() => {
    if (!isActive || isTucked || !hasEntered || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const id = entry.target.id;
          if (!id || observedSectionsRef.current.has(id)) continue;
          const mapping = SECTION_OBSERVER_MAP.find((item) => item.id === id);
          if (!mapping) continue;

          observedSectionsRef.current.add(id);
          // Do not interrupt an already-visible active speech bubble
          if (!bubbleVisibleRef.current) {
            triggerCategoryReaction(mapping.category);
          }
        }
      },
      { threshold: [0.55] },
    );

    const attached = new Set<Element>();
    const attachAvailableSections = () => {
      for (const { id } of SECTION_OBSERVER_MAP) {
        const el = document.getElementById(id);
        if (el && !attached.has(el)) {
          attached.add(el);
          observer.observe(el);
        }
      }
    };

    attachAvailableSections();
    // Re-scan once after lazy chunks finish mounting
    const rescanTimer = window.setTimeout(attachAvailableSections, 1800);

    return () => {
      window.clearTimeout(rescanTimer);
      observer.disconnect();
    };
  }, [isActive, isTucked, hasEntered, triggerCategoryReaction]);

  const handlePetTap = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    setTapRippleKey((k) => k + 1);

    const runDirectTap = () => {
      const reaction = modinoReactionEngine.next('direct_tap');
      // Always perform a snappy spring jump on direct tap, then settle into reaction mood if different
      if (reaction.mood !== 'jump') {
        showReaction(
          { ...reaction, mood: 'jump' },
          {
            triggerRipple: true,
            logAnalytics: true,
            heartTrigger: 'direct_tap',
            heartMood: reaction.mood,
            category: 'direct_tap',
          },
        );
        clearTimer(moodResetTimerRef);
        moodResetTimerRef.current = window.setTimeout(() => {
          applyMood(reaction.mood);
          moodResetTimerRef.current = window.setTimeout(() => {
            moodResetTimerRef.current = null;
            if (moodRef.current !== 'sleepy_zzz') {
              applyMood('idle');
            }
          }, 2100);
        }, 420);
      } else {
        showReaction(reaction, {
          triggerRipple: true,
          logAnalytics: true,
          heartTrigger: 'direct_tap',
          heartMood: reaction.mood,
          category: 'direct_tap',
        });
      }
    };

    if (moodRef.current === 'sleepy_zzz') {
      wakeUpStartled(runDirectTap);
      return;
    }

    runDirectTap();
  }, [applyMood, showReaction, wakeUpStartled]);

  const handleTuck = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    playUiSfx('toggle_click');
    clearAllTimers();
    applyMood('idle');
    setBubbleText(null);
    setIsBubbleSleepy(false);
    setIsTucked(true);
  }, [applyMood, clearAllTimers]);

  const handleUntuck = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    setIsTucked(false);
    clearTimer(untuckTimerRef);
    untuckTimerRef.current = window.setTimeout(() => {
      untuckTimerRef.current = null;
      if (!isActiveRef.current || isTuckedRef.current) return;
      const reaction = modinoReactionEngine.next('direct_tap');
      showReaction(reaction, {
        triggerRipple: true,
        logAnalytics: true,
        heartTrigger: 'direct_tap',
        heartMood: reaction.mood,
        category: 'direct_tap',
      });
    }, 80);
  }, [showReaction]);

  const handleDismissBubble = useCallback(() => {
    clearTimer(bubbleTimerRef);
    isLiveBroadcastActiveRef.current = false;
    setIsBubbleLive(false);
    setActiveLiveMood(null);
    setBubbleText(null);
    setIsBubbleSleepy(false);
    if (moodRef.current === 'sleepy_zzz') {
      wakeUpStartled();
      return;
    }
    scheduleSleepCountdown();
  }, [scheduleSleepCountdown, wakeUpStartled]);

  if (!isSiteRevealed || !isReadyAfterCurtain || isBlockedByOverlay) {
    return null;
  }

  // Collapsed ear-peek tab on left viewport edge for clean card screenshots
  if (isTucked) {
    return (
      <div
        className="pointer-events-none fixed z-[36]"
        style={{
          left: 'var(--safe-left)',
          bottom: 'calc(24px + var(--safe-bottom))',
        }}
      >
        <button
          type="button"
          data-testid="modino-peek-tab"
          onClick={handleUntuck}
          aria-label="Bring Modino back"
          title="Bring Modino back"
          className="pointer-events-auto flex min-h-[44px] items-center gap-1 rounded-r-[14px] rounded-l-none border border-l-0 border-[rgba(217,75,125,0.28)] bg-[#FFFDFB]/95 py-1.5 pr-2.5 pl-2 text-[9px] font-bold tracking-[0.03em] text-[#3A1233] shadow-[0_8px_20px_-8px_rgba(176,62,106,0.28)] backdrop-blur-sm transition-transform duration-150 hover:translate-x-0.5 active:scale-95 cursor-pointer"
        >
          <span>Modino</span>
          <span
            aria-hidden="true"
            className="inline-block h-4 w-2.5 rotate-12 rounded-full bg-gradient-to-b from-[#E6DCFA] to-[#D1C1F2]"
          />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dockRef}
      data-testid="modino-pet-dock"
      data-mood={mood}
      data-modino-entered={hasEntered ? 'true' : 'false'}
      data-sleep-state={mood === 'sleepy_zzz' ? 'sleeping' : 'awake'}
      aria-hidden={!hasEntered || undefined}
      className={`pointer-events-none fixed z-[36] flex flex-col items-start ${
        hasEntered
          ? 'animate-modino-entrance opacity-100'
          : 'translate-y-[22px] opacity-0'
      }`}
      style={{
        left: 'calc(clamp(10px, 2.2vmin, 24px) + var(--safe-left))',
        bottom: 'calc(clamp(12px, 2.2vmin, 24px) + var(--safe-bottom))',
      }}
    >
      {/* Crisp Pastel Speech Bubble anchored above and to the right of Modino */}
      {bubbleText && (
        <button
          key={bubbleKey}
          type="button"
          data-testid="modino-speech-bubble"
          data-sleepy={isBubbleSleepy ? 'true' : 'false'}
          data-live-broadcast={isBubbleLive ? 'true' : 'false'}
          data-live-mood={isBubbleLive && activeLiveMood ? activeLiveMood : ''}
          onClick={handleDismissBubble}
          aria-label={isBubbleLive ? 'Dismiss live broadcast message' : 'Dismiss Modino speech bubble'}
          className={`animate-modino-bubble pointer-events-auto absolute left-[4px] right-auto z-10 w-max origin-bottom-left rounded-[18px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-left text-[12px] sm:text-[14px] lg:text-[14.5px] leading-[1.35] font-semibold text-[#3A1233] cursor-pointer transition-opacity duration-200 ${
            isBubbleLive
              ? 'border-[1.5px] border-[rgba(230,184,92,0.72)] bg-[#FFFDF8] shadow-[0_14px_30px_-8px_rgba(217,156,64,0.34),0_6px_14px_-6px_rgba(217,75,125,0.2)]'
              : 'max-w-[min(195px,calc(100vw-32px))] sm:max-w-[min(260px,calc(100vw-32px))] lg:max-w-[min(285px,calc(100vw-32px))] border-[1.2px] border-[rgba(217,75,125,0.24)] bg-[#FFFDFB] shadow-[0_10px_26px_-10px_rgba(176,62,106,0.24)]'
          } ${isBubbleSleepy ? 'opacity-85' : 'opacity-100'}`}
          style={{
            bottom: 'calc(clamp(58px, 10.5vmin, 100px) + 28px)',
            ...(isBubbleLive
              ? {
                  maxWidth: 'min(300px, calc(100vw - 32px - var(--safe-left) - var(--safe-right)))',
                }
              : {}),
          }}
        >
          {isBubbleLive && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[17px]"
            >
              <span className="modino-live-shimmer-sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#FBE9C0]/45 to-transparent" />
            </span>
          )}
          {isBubbleLive && (
            <span
              data-testid="modino-live-badge"
              className="modino-live-badge-pulse relative z-[1] mb-1 inline-flex items-center gap-1 rounded-full border border-[rgba(230,184,92,0.58)] bg-gradient-to-r from-[#FFF3DB] to-[#FFE9F1] px-2 py-[1.5px] text-[9.5px] font-extrabold tracking-[0.08em] text-[#9A5B1A] shadow-[0_2px_8px_-3px_rgba(230,184,92,0.55)]"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#E05387]"
              />
              <span>LIVE ✨</span>
            </span>
          )}
          <span className="relative z-[1] block break-words">{bubbleText}</span>
          {/* Tiny rotated cream pointer tail aiming straight down toward Modino's head */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-[22px] sm:left-[28px] right-auto -bottom-[6px] h-3 w-3 rotate-45 rounded-[2px] ${
              isBubbleLive
                ? 'border-r-[1.5px] border-b-[1.5px] border-[rgba(230,184,92,0.72)] bg-[#FFFDF8]'
                : 'border-r-[1.2px] border-b-[1.2px] border-[rgba(217,75,125,0.24)] bg-[#FFFDFB]'
            }`}
          />
        </button>
      )}

      {/* Main Tappable Modino Character + Floating Micro-Hearts & Mini Confetti Emitter */}
      <div
        className={`relative flex flex-col items-center ${
          hasEntered ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Lightweight GPU-only Mini Confetti Burst Layer for Live Broadcasts */}
        {liveConfetti.length > 0 && (
          <div
            data-testid="modino-live-confetti"
            aria-hidden="true"
            className="pointer-events-none absolute top-[6px] left-1/2 z-[5] h-0 w-0 overflow-visible"
          >
            {liveConfetti.map((p) => {
              const pStyle = {
                '--lc-dx': `${p.dx}px`,
                '--lc-dy': `${p.dy}px`,
                '--lc-rot': `${p.rot}deg`,
                '--lc-dur': `${p.durationMs}ms`,
                '--lc-delay': `${p.delayMs}ms`,
              } as CSSProperties;
              return (
                <span
                  key={p.id}
                  data-testid="modino-live-confetti-particle"
                  style={pStyle}
                  className="animate-modino-live-confetti pointer-events-none absolute -top-[4px] -left-[4px] inline-flex items-center justify-center opacity-0"
                >
                  {p.shape === 'star' ? (
                    <svg
                      viewBox="0 0 12 12"
                      width={p.size}
                      height={p.size}
                      aria-hidden="true"
                      className="block overflow-visible"
                    >
                      <path
                        d="M6 0.5L7.4 4.3L11.4 6L7.4 7.7L6 11.5L4.6 7.7L0.6 6L4.6 4.3Z"
                        fill={p.color}
                      />
                    </svg>
                  ) : p.shape === 'petal' ? (
                    <span
                      style={{
                        width: `${p.size}px`,
                        height: `${Math.max(4, Math.round(p.size * 0.62))}px`,
                        backgroundColor: p.color,
                      }}
                      className="block rounded-full"
                    />
                  ) : (
                    <span
                      style={{
                        width: `${Math.max(4, p.size - 2)}px`,
                        height: `${Math.max(4, p.size - 2)}px`,
                        backgroundColor: p.color,
                      }}
                      className="block rounded-full"
                    />
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* 60fps Progressive-Fade Pastel Micro-Hearts Layer above Modino's ears/head */}
        <div
          data-testid="modino-micro-hearts"
          aria-hidden="true"
          className="pointer-events-none absolute top-[2px] left-1/2 z-[4] h-0 w-0 overflow-visible"
        >
          {microHearts.map((heart) => {
            const style = {
              left: `${heart.startX}px`,
              '--dx': `${heart.dx}px`,
              '--dx-mid': `${heart.dxMid}px`,
              '--dy': `${heart.dy}px`,
              '--rot': `${heart.rot}deg`,
              '--heart-dur': `${heart.durationMs}ms`,
              '--heart-delay': `${heart.delayMs}ms`,
            } as CSSProperties;

            return (
              <span
                key={heart.id}
                data-testid="modino-micro-heart"
                style={style}
                className={`pointer-events-none absolute -top-[4px] -ml-[6px] inline-flex items-center justify-center opacity-0 ${
                  heart.reducedMotion
                    ? 'animate-modino-micro-heart-reduced'
                    : 'animate-modino-micro-heart'
                }`}
              >
                <svg
                  viewBox="0 0 16 16"
                  width={heart.size}
                  height={heart.size}
                  aria-hidden="true"
                  className="block overflow-visible"
                >
                  <path
                    d="M8 14.1C7.7 14.1 7.4 14 7.2 13.8C4.4 11.4 1.6 8.8 1.6 5.6C1.6 3.5 3.2 2 5.2 2C6.4 2 7.4 2.6 8 3.5C8.6 2.6 9.6 2 10.8 2C12.8 2 14.4 3.5 14.4 5.6C14.4 8.8 11.6 11.4 8.8 13.8C8.6 14 8.3 14.1 8 14.1Z"
                    fill={heart.color}
                  />
                </svg>
              </span>
            );
          })}
        </div>

        <button
          key={isBubbleLive && activeLiveMood ? `live-${liveAnimKey}` : 'normal'}
          type="button"
          data-testid="modino-avatar-btn"
          onClick={handlePetTap}
          aria-label="Tap Modino companion pet"
          className={`relative flex items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] ${
            isBubbleLive && activeLiveMood ? LIVE_MOOD_ANIM_CLASS[activeLiveMood] : ''
          }`}
          style={{
            width: 'clamp(58px, 10.5vmin, 100px)',
            height: 'clamp(58px, 10.5vmin, 100px)',
          }}
        >
          <ModinoAvatarSvg mood={mood} tapRippleKey={tapRippleKey} paused={!isActive} />
        </button>

        {/* Layer 9: Compact Modino Name Label + Clean Edge-Tuck Control (No Mute Icon) */}
        <div className="-mt-2 flex items-center justify-center">
          <span
            data-testid="modino-name-pill"
            className="inline-flex items-center rounded-full border border-[rgba(217,75,125,0.18)] bg-[rgba(255,253,250,0.92)] px-[7px] py-[2px] sm:px-[10px] sm:py-[3px] text-[8.5px] sm:text-[10.5px] leading-[1.1] font-bold tracking-[0.04em] text-[#3A1233]/90 shadow-[0_2px_6px_-2px_rgba(176,62,106,0.16)] select-none"
          >
            Modino
          </span>

          <button
            type="button"
            data-testid="modino-tuck-btn"
            onClick={handleTuck}
            aria-label="Hide Modino to left edge"
            title="Hide Modino"
            className="-ml-0.5 group flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D94B7D]"
          >
            <span className="flex h-[20px] w-[20px] sm:h-[24px] sm:w-[24px] items-center justify-center rounded-full border border-[rgba(217,75,125,0.22)] bg-[rgba(255,253,250,0.95)] text-[#7A4A63] shadow-xs transition-colors group-hover:border-[#D94B7D] group-hover:text-[#3A1233] group-active:scale-95">
              <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

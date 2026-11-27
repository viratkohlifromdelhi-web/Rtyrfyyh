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
import { playUiSfx } from '../utils/uiSoundEngine';
import { ModinoAvatarSvg } from './ModinoAvatarSvg';

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
 * Default entrance delay after Stage 4 mounts (360ms veil swap + 1640ms = 2000ms total
 * from Stage 3 -> Stage 4 transition start, giving Milky audio & confetti a full +1000ms
 * extra breathing moment before Modino glides in and greets).
 */
export const MODINO_DEFAULT_ENTRANCE_DELAY_MS = 1640;
const BUBBLE_DURATION_MS = 3400;
const SLEEP_BUBBLE_DURATION_MS = 1800;
const SLEEP_MUTTER_CYCLE_MS = 4600;
const WAKE_BUBBLE_DURATION_MS = 2400;
const WAKE_FOLLOWUP_DELAY_MS = 650;
const ANALYTICS_THROTTLE_MS = 4000;

interface ModinoPetProps {
  isSiteRevealed: boolean;
  isBlockedByOverlay: boolean;
  /** Delay before Modino glides into view and delivers its welcome greeting */
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
  isBlockedByOverlay,
  entranceDelayMs = MODINO_DEFAULT_ENTRANCE_DELAY_MS,
}: ModinoPetProps) {
  const [mood, setMood] = useState<ModinoMood>('idle');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [tapRippleKey, setTapRippleKey] = useState(0);
  const [isBubbleSleepy, setIsBubbleSleepy] = useState(false);
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

  const isActive = isSiteRevealed && !isBlockedByOverlay && !isTabHidden;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const isTuckedRef = useRef(isTucked);
  isTuckedRef.current = isTucked;

  const hasEnteredRef = useRef(hasEntered);
  hasEnteredRef.current = hasEntered;

  const bubbleVisibleRef = useRef(false);
  bubbleVisibleRef.current = Boolean(bubbleText && !isBubbleSleepy);

  const sleepTimerRef = useRef<number | null>(null);
  const sleepMutterTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const moodResetTimerRef = useRef<number | null>(null);
  const wakeFollowupTimerRef = useRef<number | null>(null);
  const greetingTimerRef = useRef<number | null>(null);
  const untuckTimerRef = useRef<number | null>(null);
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
    if (moodRef.current === 'sleepy_zzz') return;

    sleepTimerRef.current = window.setTimeout(() => {
      sleepTimerRef.current = null;
      if (!isActiveRef.current || isTuckedRef.current) return;
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
        haptics.vibrateSafe(10);
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

  // Staggered entrance + signature welcome greeting after the +1000ms post-curtain grace delay.
  // Keeps Modino strictly invisible with zero sleep countdown during the grace window.
  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      applyMood('idle');
      setBubbleText(null);
      setIsBubbleSleepy(false);
      return;
    }

    if (!hasGreetedRef.current && !isTucked) {
      const safeDelay = Math.max(0, entranceDelayMs);
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
      }, safeDelay);
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

      triggerCategoryReaction(detail.category, {
        logAnalytics: detail.category === 'direct_tap',
      });
    };

    window.addEventListener(MODINO_EVENT_NAME, handleBusEvent);
    return () => {
      window.removeEventListener(MODINO_EVENT_NAME, handleBusEvent);
    };
  }, [triggerCategoryReaction]);

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
    setBubbleText(null);
    setIsBubbleSleepy(false);
    if (moodRef.current === 'sleepy_zzz') {
      wakeUpStartled();
      return;
    }
    scheduleSleepCountdown();
  }, [scheduleSleepCountdown, wakeUpStartled]);

  if (!isSiteRevealed || isBlockedByOverlay) {
    return null;
  }

  // Collapsed ear-peek tab on left viewport edge for clean card screenshots
  if (isTucked) {
    return (
      <div className="pointer-events-none fixed left-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-[36]">
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
      className={`pointer-events-none fixed left-[12px] bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-[36] flex flex-col items-start ${
        hasEntered
          ? 'animate-modino-entrance opacity-100'
          : 'translate-y-[22px] opacity-0'
      }`}
    >
      {/* Crisp Pastel Speech Bubble anchored above and to the right of Modino */}
      {bubbleText && (
        <button
          key={bubbleKey}
          type="button"
          data-testid="modino-speech-bubble"
          data-sleepy={isBubbleSleepy ? 'true' : 'false'}
          onClick={handleDismissBubble}
          aria-label="Dismiss Modino speech bubble"
          className={`animate-modino-bubble pointer-events-auto absolute left-[4px] right-auto bottom-[92px] z-10 w-max max-w-[min(76vw,252px)] origin-bottom-left rounded-[18px] border-[1.2px] border-[rgba(217,75,125,0.24)] bg-[#FFFDFB] px-3.5 py-2 text-left text-[12.5px] leading-[1.35] font-semibold text-[#3A1233] shadow-[0_10px_26px_-10px_rgba(176,62,106,0.24)] cursor-pointer transition-opacity duration-200 ${
            isBubbleSleepy ? 'opacity-85' : 'opacity-100'
          }`}
        >
          <span className="block break-words">{bubbleText}</span>
          {/* Tiny rotated cream pointer tail aiming straight down toward Modino's head */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[22px] right-auto -bottom-[6px] h-3 w-3 rotate-45 rounded-[2px] border-r-[1.2px] border-b-[1.2px] border-[rgba(217,75,125,0.24)] bg-[#FFFDFB]"
          />
        </button>
      )}

      {/* Main Tappable Modino Character + Floating Micro-Hearts Emitter */}
      <div
        className={`relative flex flex-col items-center ${
          hasEntered ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
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
          type="button"
          data-testid="modino-avatar-btn"
          onClick={handlePetTap}
          aria-label="Tap Modino companion pet"
          className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
        >
          <ModinoAvatarSvg mood={mood} tapRippleKey={tapRippleKey} paused={!isActive} />
        </button>

        {/* Layer 9: Compact Modino Name Label + Clean Edge-Tuck Control (No Mute Icon) */}
        <div className="-mt-2 flex items-center justify-center">
          <span
            data-testid="modino-name-pill"
            className="inline-flex items-center rounded-full border border-[rgba(217,75,125,0.18)] bg-[rgba(255,253,250,0.92)] px-[6px] py-[1.5px] text-[8px] leading-[1.1] font-bold tracking-[0.04em] text-[#3A1233]/90 shadow-[0_2px_6px_-2px_rgba(176,62,106,0.16)] select-none"
          >
            Modino
          </span>

          <button
            type="button"
            data-testid="modino-tuck-btn"
            onClick={handleTuck}
            aria-label="Hide Modino to left edge"
            title="Hide Modino"
            className="-ml-0.5 group flex h-8 w-8 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D94B7D]"
          >
            <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full border border-[rgba(217,75,125,0.22)] bg-[rgba(255,253,250,0.95)] text-[#7A4A63] shadow-xs transition-colors group-hover:border-[#D94B7D] group-hover:text-[#3A1233] group-active:scale-95">
              <X className="h-2.5 w-2.5" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

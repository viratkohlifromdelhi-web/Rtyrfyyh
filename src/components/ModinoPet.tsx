import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import {
  MODINO_EVENT_NAME,
  type ModinoEventDetail,
  type ModinoReactionCategory,
} from '../utils/modinoBus';
import {
  modinoReactionEngine,
  type ModinoMood,
  type ModinoReaction,
} from '../utils/modinoReactions';
import {
  isUiSfxMuted,
  playUiSfx,
  subscribeUiSfxMute,
  toggleUiSfxMute,
} from '../utils/uiSoundEngine';
import { ModinoAvatarSvg } from './ModinoAvatarSvg';

export const MODINO_INACTIVITY_SLEEP_MS = 3500;
const BUBBLE_DURATION_MS = 3400;
const SLEEP_BUBBLE_DURATION_MS = 1800;
const ANALYTICS_THROTTLE_MS = 4000;

interface ModinoPetProps {
  isSiteRevealed: boolean;
  isBlockedByOverlay: boolean;
}

const SECTION_OBSERVER_MAP: ReadonlyArray<{
  id: string;
  category: ModinoReactionCategory;
}> = [
  { id: 'backstory', category: 'backstory' },
  { id: 'case-file', category: 'backstory' },
  { id: 'spin-wheel', category: 'spin' },
  { id: 'gift', category: 'interaction_hype' },
  { id: 'make-a-wish', category: 'cute' },
  { id: 'little-coop', category: 'last_playback' },
  { id: 'closing-signoff', category: 'ending' },
];

export function ModinoPet({ isSiteRevealed, isBlockedByOverlay }: ModinoPetProps) {
  const [mood, setMood] = useState<ModinoMood>('idle');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [tapRippleKey, setTapRippleKey] = useState(0);
  const [isBubbleSleepy, setIsBubbleSleepy] = useState(false);
  const [isTucked, setIsTucked] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );
  const [sfxMuted, setSfxMuted] = useState(() => isUiSfxMuted());

  const moodRef = useRef<ModinoMood>('idle');
  moodRef.current = mood;

  const isActive = isSiteRevealed && !isBlockedByOverlay && !isTabHidden;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const isTuckedRef = useRef(isTucked);
  isTuckedRef.current = isTucked;

  const bubbleVisibleRef = useRef(false);
  bubbleVisibleRef.current = Boolean(bubbleText && !isBubbleSleepy);

  const sleepTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const moodResetTimerRef = useRef<number | null>(null);
  const wakeFollowupTimerRef = useRef<number | null>(null);
  const greetingTimerRef = useRef<number | null>(null);
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

  const clearAllTimers = useCallback(() => {
    clearTimer(sleepTimerRef);
    clearTimer(bubbleTimerRef);
    clearTimer(moodResetTimerRef);
    clearTimer(wakeFollowupTimerRef);
    clearTimer(greetingTimerRef);
  }, []);

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

  const scheduleSleepCountdown = useCallback(() => {
    clearTimer(sleepTimerRef);
    if (!isActiveRef.current || isTuckedRef.current) return;

    sleepTimerRef.current = window.setTimeout(() => {
      sleepTimerRef.current = null;
      if (!isActiveRef.current || isTuckedRef.current) return;
      if (bubbleVisibleRef.current) {
        // Wait gently until the active important speech bubble finishes
        scheduleSleepCountdown();
        return;
      }

      setMood('sleepy_zzz');
      playUiSfx('sleep_sigh');

      const mutter = modinoReactionEngine.nextSleepMutter();
      setIsBubbleSleepy(true);
      setBubbleText(mutter);
      setBubbleKey((k) => k + 1);

      clearTimer(bubbleTimerRef);
      bubbleTimerRef.current = window.setTimeout(() => {
        setBubbleText(null);
        setIsBubbleSleepy(false);
        bubbleTimerRef.current = null;
      }, SLEEP_BUBBLE_DURATION_MS);
    }, MODINO_INACTIVITY_SLEEP_MS);
  }, []);

  const showReaction = useCallback(
    (reaction: ModinoReaction, options?: { triggerRipple?: boolean; logAnalytics?: boolean }) => {
      if (!isActiveRef.current) return;

      clearTimer(moodResetTimerRef);
      clearTimer(bubbleTimerRef);
      clearTimer(wakeFollowupTimerRef);

      setMood(reaction.mood);
      setIsBubbleSleepy(false);
      setBubbleText(reaction.text);
      setBubbleKey((k) => k + 1);

      if (options?.triggerRipple) {
        setTapRippleKey((k) => k + 1);
      }

      playUiSfx(reaction.sfx);

      if (options?.logAnalytics) {
        logModinoAnalytics(reaction);
      }

      const settleDelayMs = reaction.mood === 'jump' || reaction.mood === 'surprised' ? 1400 : 2800;
      moodResetTimerRef.current = window.setTimeout(() => {
        setMood((current) => (current === 'sleepy_zzz' ? current : 'idle'));
        moodResetTimerRef.current = null;
      }, settleDelayMs);

      bubbleTimerRef.current = window.setTimeout(() => {
        setBubbleText(null);
        setIsBubbleSleepy(false);
        bubbleTimerRef.current = null;
        scheduleSleepCountdown();
      }, BUBBLE_DURATION_MS);

      scheduleSleepCountdown();
    },
    [logModinoAnalytics, scheduleSleepCountdown],
  );

  const wakeUpStartled = useCallback(
    (followup?: () => void) => {
      clearTimer(wakeFollowupTimerRef);
      clearTimer(moodResetTimerRef);
      clearTimer(bubbleTimerRef);

      setMood('surprised');
      try {
        haptics.vibrateSafe(10);
      } catch {
        // silent
      }
      playUiSfx('wake_chirp');

      if (followup) {
        wakeFollowupTimerRef.current = window.setTimeout(() => {
          wakeFollowupTimerRef.current = null;
          followup();
        }, 450);
      } else {
        const wakeReaction = modinoReactionEngine.nextWakeUp();
        setIsBubbleSleepy(false);
        setBubbleText(wakeReaction.text);
        setBubbleKey((k) => k + 1);

        moodResetTimerRef.current = window.setTimeout(() => {
          setMood('idle');
          moodResetTimerRef.current = null;
        }, 1200);

        bubbleTimerRef.current = window.setTimeout(() => {
          setBubbleText(null);
          bubbleTimerRef.current = null;
          scheduleSleepCountdown();
        }, 2400);
        scheduleSleepCountdown();
      }
    },
    [scheduleSleepCountdown],
  );

  const triggerCategoryReaction = useCallback(
    (category: ModinoReactionCategory, options?: { triggerRipple?: boolean; logAnalytics?: boolean }) => {
      if (!isActiveRef.current || isTuckedRef.current) return;

      const deliver = () => {
        const reaction = modinoReactionEngine.next(category);
        showReaction(reaction, options);
      };

      if (moodRef.current === 'sleepy_zzz') {
        wakeUpStartled(deliver);
        return;
      }

      deliver();
    },
    [showReaction, wakeUpStartled],
  );

  // Sync mute state
  useEffect(() => subscribeUiSfxMute(setSfxMuted), []);

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

  // Initial signature greeting 900ms after site reveals from Opening Curtain
  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      return;
    }

    scheduleSleepCountdown();

    if (!hasGreetedRef.current && !isTucked) {
      hasGreetedRef.current = true;
      greetingTimerRef.current = window.setTimeout(() => {
        greetingTimerRef.current = null;
        if (!isActiveRef.current || isTuckedRef.current) return;
        const greeting = modinoReactionEngine.next('greeting');
        showReaction(greeting);
      }, 900);
    }

    return () => {
      clearAllTimers();
    };
  }, [isActive, isTucked, clearAllTimers, scheduleSleepCountdown, showReaction]);

  // Listen to global Modino CustomEvent bus
  useEffect(() => {
    const handleBusEvent = (event: Event) => {
      const detail = (event as CustomEvent<ModinoEventDetail>).detail;
      if (!detail?.category) return;
      if (!isActiveRef.current || isTuckedRef.current) return;
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
    if (!isActive || isTucked) return;

    const handleActivity = (source: 'scroll' | 'input') => {
      if (source === 'scroll') {
        const now = performance.now();
        if (now - lastScrollActivityRef.current < 250) return;
        lastScrollActivityRef.current = now;
      }

      if (moodRef.current === 'sleepy_zzz') {
        wakeUpStartled();
        return;
      }

      scheduleSleepCountdown();
    };

    const onPointerDown = () => handleActivity('input');
    const onTouchStart = () => handleActivity('input');
    const onClick = () => handleActivity('input');
    const onKeyDown = () => handleActivity('input');
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
  }, [isActive, isTucked, scheduleSleepCountdown, wakeUpStartled]);

  // Single lightweight IntersectionObserver fallback for non-clicked sections (once per section)
  useEffect(() => {
    if (!isActive || isTucked || typeof IntersectionObserver === 'undefined') return;

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
  }, [isActive, isTucked, triggerCategoryReaction]);

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
        showReaction({ ...reaction, mood: 'jump' }, { triggerRipple: true, logAnalytics: true });
        clearTimer(moodResetTimerRef);
        moodResetTimerRef.current = window.setTimeout(() => {
          setMood(reaction.mood);
          moodResetTimerRef.current = window.setTimeout(() => {
            setMood((curr) => (curr === 'sleepy_zzz' ? curr : 'idle'));
            moodResetTimerRef.current = null;
          }, 2100);
        }, 420);
      } else {
        showReaction(reaction, { triggerRipple: true, logAnalytics: true });
      }
    };

    if (moodRef.current === 'sleepy_zzz') {
      wakeUpStartled(runDirectTap);
      return;
    }

    runDirectTap();
  }, [showReaction, wakeUpStartled]);

  const handleToggleMute = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    const nextMuted = toggleUiSfxMute();
    if (!nextMuted) {
      playUiSfx('toggle_click');
    }
  }, []);

  const handleTuck = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    playUiSfx('toggle_click');
    clearAllTimers();
    setBubbleText(null);
    setIsTucked(true);
  }, [clearAllTimers]);

  const handleUntuck = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    setIsTucked(false);
    window.setTimeout(() => {
      const reaction = modinoReactionEngine.next('direct_tap');
      showReaction(reaction, { triggerRipple: true, logAnalytics: true });
    }, 80);
  }, [showReaction]);

  const handleDismissBubble = useCallback(() => {
    clearTimer(bubbleTimerRef);
    setBubbleText(null);
    setIsBubbleSleepy(false);
    scheduleSleepCountdown();
  }, [scheduleSleepCountdown]);

  if (!isSiteRevealed || isBlockedByOverlay) {
    return null;
  }

  // Collapsed ear-peek tab on right edge for clean card screenshots
  if (isTucked) {
    return (
      <div className="pointer-events-none fixed right-0 bottom-[74px] z-[36]">
        <button
          type="button"
          data-testid="modino-peek-tab"
          onClick={handleUntuck}
          aria-label="Bring Modino back"
          title="Bring Modino back"
          className="pointer-events-auto flex min-h-[44px] items-center gap-1 rounded-l-full border border-r-0 border-[rgba(217,75,125,0.28)] bg-[#FFFDFB]/95 py-1.5 pr-2 pl-2.5 text-[10px] font-bold text-[#3A1233] shadow-[0_8px_20px_-8px_rgba(176,62,106,0.28)] backdrop-blur-sm transition-transform duration-150 hover:-translate-x-0.5 active:scale-95 cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="inline-block h-4 w-2.5 -rotate-12 rounded-full bg-gradient-to-b from-[#E6DCFA] to-[#D1C1F2]"
          />
          <span>Modino</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="modino-pet-dock"
      data-mood={mood}
      className="pointer-events-none fixed right-[12px] bottom-[66px] z-[36] flex flex-col items-end"
    >
      {/* Crisp Pastel Speech Bubble anchored above-left of Modino */}
      {bubbleText && (
        <button
          key={bubbleKey}
          type="button"
          data-testid="modino-speech-bubble"
          onClick={handleDismissBubble}
          aria-label="Dismiss Modino speech bubble"
          className={`animate-modino-bubble pointer-events-auto absolute right-[4px] bottom-[92px] w-max max-w-[min(82vw,272px)] rounded-[18px] border-[1.2px] border-[rgba(217,75,125,0.24)] bg-[#FFFDFB] px-3.5 py-2 text-left text-[12.5px] leading-[1.35] font-semibold text-[#3A1233] shadow-[0_10px_26px_-10px_rgba(176,62,106,0.24)] cursor-pointer transition-opacity duration-200 ${
            isBubbleSleepy ? 'opacity-85' : 'opacity-100'
          }`}
        >
          <span className="block break-words">{bubbleText}</span>
          {/* Tiny rotated cream pointer tail aiming toward Modino's head */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-[24px] -bottom-[6px] h-3 w-3 rotate-45 rounded-[2px] border-r-[1.2px] border-b-[1.2px] border-[rgba(217,75,125,0.24)] bg-[#FFFDFB]"
          />
        </button>
      )}

      {/* Main Tappable Modino Character */}
      <div className="pointer-events-auto relative flex flex-col items-center">
        <button
          type="button"
          data-testid="modino-avatar-btn"
          onClick={handlePetTap}
          aria-label="Tap Modino companion pet"
          className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
        >
          <ModinoAvatarSvg mood={mood} tapRippleKey={tapRippleKey} paused={!isActive} />
        </button>

        {/* Layer 9: Tiny Modino Name Pill + Discreet 22px Mute & Collapse Controls */}
        <div className="-mt-1 flex items-center gap-1">
          <button
            type="button"
            data-testid="modino-sfx-mute-btn"
            onClick={handleToggleMute}
            aria-pressed={sfxMuted}
            aria-label={sfxMuted ? 'Unmute Modino sound effects' : 'Mute Modino sound effects'}
            title={sfxMuted ? 'Unmute UI SFX' : 'Mute UI SFX'}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[rgba(217,75,125,0.22)] bg-[rgba(255,253,250,0.92)] text-[#7A4A63] shadow-xs transition-colors hover:border-[#D94B7D] hover:text-[#3A1233] active:scale-95 cursor-pointer"
          >
            {sfxMuted ? (
              <VolumeX className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3 w-3 text-[#C93B6B]" aria-hidden="true" />
            )}
          </button>

          <span
            data-testid="modino-name-pill"
            className="inline-flex items-center rounded-full border border-[rgba(217,75,125,0.22)] bg-[rgba(255,253,250,0.92)] px-2 py-[2px] text-[9.5px] leading-none font-bold tracking-tight text-[#3A1233] shadow-xs select-none"
          >
            Modino
          </span>

          <button
            type="button"
            data-testid="modino-tuck-btn"
            onClick={handleTuck}
            aria-label="Hide Modino to side edge"
            title="Hide Modino"
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[rgba(217,75,125,0.22)] bg-[rgba(255,253,250,0.92)] text-[#7A4A63] shadow-xs transition-colors hover:border-[#D94B7D] hover:text-[#3A1233] active:scale-95 cursor-pointer"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

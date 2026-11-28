import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { trackEvent } from '../utils/analytics';
import { TAPLI_DEBOUNCE_MS, triggerHaptic } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';
import {
  TAPLI_COOL_DOWN_LINE,
  TAPLI_DEFAULT_IDLE_LINE,
  TAPLI_FX_POOL_SIZE,
  TAPLI_MODINO_MILESTONES,
  computeTapliCombo,
  computeTapliVisualPalette,
  getTapliMilestone,
  getTapliStage,
  getTapliStageProgress,
  isTapliAnalyticsMilestone,
  isTapliStageUnlock,
  pickNextTapliDialogue,
  pickTapliPopWord,
  resolveTapliDirection,
} from '../utils/tapliArenaCore';
import {
  connectLiveTapliCounter,
  type LiveTapliCounterHandle,
  type TapliCounterSnapshot,
} from '../utils/tapliCounterService';

const POOL_INDICES = Array.from({ length: TAPLI_FX_POOL_SIZE }, (_, idx) => idx);

const FX_WORD_COLORS = [
  '#C93B6B',
  '#B85A1E',
  '#B43159',
  '#8E3572',
  '#C8434E',
  '#7D4AA8',
  '#B57A1A',
] as const;

const ICE_SPARKLES = [
  { x: 76, y: 24, delay: '60ms', size: 1 },
  { x: 146, y: 22, delay: '140ms', size: 0.9 },
  { x: 94, y: 12, delay: '220ms', size: 0.85 },
  { x: 130, y: 14, delay: '290ms', size: 1.05 },
  { x: 110, y: 8, delay: '180ms', size: 0.95 },
] as const;

const ZEN_RAY_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TapliArenaSection() {
  const uid = useId().replace(/:/g, '');
  const prefix = `tapliAnamika_${uid}`;

  const [sessionTaplis, setSessionTaplis] = useState(0);
  const [dialogue, setDialogue] = useState(TAPLI_DEFAULT_IDLE_LINE);
  const [isImpactFlashing, setIsImpactFlashing] = useState(false);
  const [comboLabel, setComboLabel] = useState<string | null>(null);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [coolDownKey, setCoolDownKey] = useState(0);
  const [counterState, setCounterState] = useState<TapliCounterSnapshot>({
    serverCount: 0,
    pendingDelta: 0,
    inFlightDelta: 0,
    displayedGlobalCount: 0,
    hasSynced: false,
    offlineFallback: false,
  });

  const counterHandleRef = useRef<LiveTapliCounterHandle | null>(null);
  const innerStageShakeRef = useRef<HTMLDivElement | null>(null);
  const stageButtonRef = useRef<HTMLButtonElement | null>(null);
  const headPivotRef = useRef<SVGGElement | null>(null);
  const backHairRef = useRef<SVGGElement | null>(null);
  const frontHairRef = useRef<SVGGElement | null>(null);
  const shouldersRef = useRef<SVGGElement | null>(null);
  const handWrapperRef = useRef<HTMLDivElement | null>(null);
  const shockwaveRef = useRef<HTMLDivElement | null>(null);
  const globalCountNumRef = useRef<HTMLSpanElement | null>(null);
  const fxSlotRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const sessionTaplisRef = useRef(0);
  const dialogueRef = useRef(TAPLI_DEFAULT_IDLE_LINE);
  const comboCountRef = useRef(0);
  const lastTapMsRef = useRef<number | null>(null);
  const lastHapticMsRef = useRef<number>(-Infinity);
  const fxCursorRef = useRef(0);

  const impactTimerRef = useRef<number | null>(null);
  const comboHideTimerRef = useRef<number | null>(null);
  const toastHideTimerRef = useRef<number | null>(null);
  const coolMeltTimerRef = useRef<number | null>(null);
  const coolEndTimerRef = useRef<number | null>(null);

  const activeHeadAnimRef = useRef<Animation | null>(null);
  const activeBackHairAnimRef = useRef<Animation | null>(null);
  const activeFrontHairAnimRef = useRef<Animation | null>(null);
  const activeShouldersAnimRef = useRef<Animation | null>(null);
  const activeHandAnimRef = useRef<Animation | null>(null);
  const activeShockwaveAnimRef = useRef<Animation | null>(null);
  const activeShakeAnimRef = useRef<Animation | null>(null);
  const activeGlobalPopAnimRef = useRef<Animation | null>(null);
  const activeFxAnimsRef = useRef<(Animation | null)[]>(Array(TAPLI_FX_POOL_SIZE).fill(null));
  const reducedMotionRef = useRef(false);

  const stage = useMemo(() => getTapliStage(sessionTaplis), [sessionTaplis]);
  const palette = useMemo(() => computeTapliVisualPalette(sessionTaplis), [sessionTaplis]);
  const progress = useMemo(() => getTapliStageProgress(sessionTaplis), [sessionTaplis]);

  // Connect live Firestore global counter on mount and flush cleanly on unmount
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotionNow();
    const handle = connectLiveTapliCounter((snapshot) => {
      setCounterState(snapshot);
    });
    counterHandleRef.current = handle;
    setCounterState(handle.getSnapshot());

    return () => {
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
      if (comboHideTimerRef.current !== null) window.clearTimeout(comboHideTimerRef.current);
      if (toastHideTimerRef.current !== null) window.clearTimeout(toastHideTimerRef.current);
      if (coolMeltTimerRef.current !== null) window.clearTimeout(coolMeltTimerRef.current);
      if (coolEndTimerRef.current !== null) window.clearTimeout(coolEndTimerRef.current);
      handle.destroy();
      counterHandleRef.current = null;
    };
  }, []);

  const animateGlobalCountPop = useCallback(() => {
    if (reducedMotionRef.current) return;
    const el = globalCountNumRef.current;
    if (!el || typeof el.animate !== 'function') return;
    activeGlobalPopAnimRef.current?.cancel();
    activeGlobalPopAnimRef.current = el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.16)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );
  }, []);

  const triggerTapli = useCallback(
    (clientX?: number, clientY?: number) => {
      const nowMs =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();

      const nextSessionTaplis = sessionTaplisRef.current + 1;
      const nextStage = getTapliStage(nextSessionTaplis);
      const stageUnlocked = isTapliStageUnlock(nextSessionTaplis);

      // Line 1 synchronous Android haptics right inside pointerdown user gesture
      if (stageUnlocked) {
        triggerHaptic(nextStage.id >= 7 ? 'celebrate' : 'unlock');
        lastHapticMsRef.current = nowMs;
      } else if (nowMs - lastHapticMsRef.current >= TAPLI_DEBOUNCE_MS) {
        lastHapticMsRef.current = nowMs;
        if (nextStage.id <= 2 || nextStage.id === 8) {
          triggerHaptic('light');
        } else if (nextStage.id === 3) {
          triggerHaptic('tapli');
        } else {
          triggerHaptic('medium');
        }
      }

      sessionTaplisRef.current = nextSessionTaplis;

      // Cancel any active ice-pack cooldown immediately so tapping stays instant
      if (coolMeltTimerRef.current !== null) {
        window.clearTimeout(coolMeltTimerRef.current);
        coolMeltTimerRef.current = null;
      }
      if (coolEndTimerRef.current !== null) {
        window.clearTimeout(coolEndTimerRef.current);
        coolEndTimerRef.current = null;
      }
      setIsCoolingDown(false);

      const milestone = getTapliMilestone(nextSessionTaplis);
      const combo = computeTapliCombo(comboCountRef.current, lastTapMsRef.current, nowMs);
      comboCountRef.current = combo.count;
      lastTapMsRef.current = nowMs;

      // Update global optimistic counter at 0ms latency (Firestore batched increment intact)
      const updatedGlobal = counterHandleRef.current?.recordTap();
      if (updatedGlobal) {
        setCounterState(updatedGlobal);
      } else {
        setCounterState((prev) => ({
          ...prev,
          pendingDelta: prev.pendingDelta + 1,
          displayedGlobalCount: prev.displayedGlobalCount + 1,
          hasSynced: true,
        }));
      }
      animateGlobalCountPop();

      // Update local spree, stage unlock toast & non-repeating dialogue
      const shouldRotateDialogue =
        nextSessionTaplis <= 6 || milestone !== null || nextSessionTaplis % 2 === 1;
      if (shouldRotateDialogue) {
        const nextLine = pickNextTapliDialogue(nextStage.id, dialogueRef.current);
        dialogueRef.current = nextLine;
        setDialogue(nextLine);
      }

      setSessionTaplis(nextSessionTaplis);
      setComboLabel(combo.label);
      setIsOverdrive(combo.isOverdrive);

      if (comboHideTimerRef.current !== null) {
        window.clearTimeout(comboHideTimerRef.current);
      }
      comboHideTimerRef.current = window.setTimeout(() => {
        setComboLabel(null);
        setIsOverdrive(false);
        comboHideTimerRef.current = null;
      }, 940);

      if (stageUnlocked) {
        setUnlockToast(nextStage.unlockToast);
        if (toastHideTimerRef.current !== null) {
          window.clearTimeout(toastHideTimerRef.current);
        }
        toastHideTimerRef.current = window.setTimeout(() => {
          setUnlockToast(null);
          toastHideTimerRef.current = null;
        }, 1600);
      }

      // Flash impact facial expression cleanly for 210ms (single resettable timeout)
      setIsImpactFlashing(true);
      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
      }
      impactTimerRef.current = window.setTimeout(() => {
        setIsImpactFlashing(false);
        impactTimerRef.current = null;
      }, 210);

      // Zero-latency stage-reactive Web Audio SFX
      soundEngine.playTapliBonk(combo.count, nextStage.id);
      if (stageUnlocked) {
        soundEngine.playTapliStageUnlock();
      }

      // Gently nudge Modino & log analytics ONLY at exact milestones (never spam!)
      if (milestone !== null) {
        emitModinoEvent('tapli_milestone', {
          force: milestone >= 30,
          source: `tapli-milestone-${milestone}`,
          customReaction: TAPLI_MODINO_MILESTONES[milestone],
        });
      }
      if (isTapliAnalyticsMilestone(nextSessionTaplis)) {
        try {
          trackEvent('tapli_milestone', `Tapli Arena ${nextSessionTaplis}`, {
            taplis: nextSessionTaplis,
            stage: nextStage.moodLabel,
          });
        } catch {
          // Silent fallback
        }
      }

      if (reducedMotionRef.current) {
        return;
      }

      // Resolve directional side from tap X relative to stage center
      let relativeX01: number | null = null;
      let rect: DOMRect | null = null;
      if (stageButtonRef.current) {
        rect = stageButtonRef.current.getBoundingClientRect();
        if (typeof clientX === 'number' && rect.width > 0) {
          relativeX01 = (clientX - rect.left) / rect.width;
        }
      }
      // sideSign: -1 means tapped on left (hand swings from left), +1 means tapped on right
      const sideSign = resolveTapliDirection(relativeX01, nextSessionTaplis);
      // Character head tilts AWAY from the slap side
      const awaySign = -sideSign;
      const isZen = nextStage.id === 8;

      // 1A. Head & Face Articulated Recoil (Neck Pivot)
      const headEl = headPivotRef.current;
      if (headEl && typeof headEl.animate === 'function') {
        activeHeadAnimRef.current?.cancel();
        if (isZen) {
          activeHeadAnimRef.current = headEl.animate(
            [
              { transform: 'translate3d(0, 0, 0) scale(1, 1) rotate(0deg)', offset: 0 },
              {
                transform: `translate3d(${awaySign * 1.4}px, 2.2px, 0) scale(1.02, 0.985) rotate(${awaySign * 1.8}deg)`,
                offset: 0.3,
              },
              {
                transform: `translate3d(${-awaySign * 0.6}px, -0.8px, 0) scale(0.995, 1.01) rotate(${-awaySign * 0.7}deg)`,
                offset: 0.68,
              },
              { transform: 'translate3d(0, 0, 0) scale(1, 1) rotate(0deg)', offset: 1 },
            ],
            {
              duration: 220,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
          );
        } else {
          const hitShiftX = awaySign * (nextStage.id >= 4 ? 4.4 : 3.8);
          const hitTilt = awaySign * (nextStage.id >= 4 ? 7.4 : 6.5);
          activeHeadAnimRef.current = headEl.animate(
            [
              { transform: 'translate3d(0, 0, 0) scale(1, 1) rotate(0deg)', offset: 0 },
              {
                transform: `translate3d(${hitShiftX}px, 9px, 0) scale(1.10, 0.88) rotate(${hitTilt}deg)`,
                offset: 0.22,
              },
              {
                transform: `translate3d(${-awaySign * 2}px, -3px, 0) scale(0.96, 1.05) rotate(${-awaySign * 3}deg)`,
                offset: 0.58,
              },
              { transform: 'translate3d(0, 0, 0) scale(1, 1) rotate(0deg)', offset: 1 },
            ],
            {
              duration: 260,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
          );
        }
      }

      // 1B. Hair Locks & Wispy Bangs Secondary Follow-Through (+28ms delay)
      const hairRot = isZen ? awaySign * 1.2 : awaySign * 4.2;
      const hairKeyframes: Keyframe[] = [
        { transform: 'rotate(0deg) scaleY(1)', offset: 0 },
        { transform: `rotate(${hairRot}deg) scaleY(${isZen ? 1.01 : 1.04})`, offset: 0.34 },
        { transform: `rotate(${-hairRot * 0.45}deg) scaleY(0.985)`, offset: 0.7 },
        { transform: 'rotate(0deg) scaleY(1)', offset: 1 },
      ];
      const hairTiming: KeyframeAnimationOptions = {
        duration: 270,
        delay: 28,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      };
      if (backHairRef.current && typeof backHairRef.current.animate === 'function') {
        activeBackHairAnimRef.current?.cancel();
        activeBackHairAnimRef.current = backHairRef.current.animate(hairKeyframes, hairTiming);
      }
      if (frontHairRef.current && typeof frontHairRef.current.animate === 'function') {
        activeFrontHairAnimRef.current?.cancel();
        activeFrontHairAnimRef.current = frontHairRef.current.animate(hairKeyframes, hairTiming);
      }

      // 1C. Shoulders & Kurti Collar Organic Cushion Squish (210ms)
      const shouldersEl = shouldersRef.current;
      if (shouldersEl && typeof shouldersEl.animate === 'function') {
        activeShouldersAnimRef.current?.cancel();
        activeShouldersAnimRef.current = shouldersEl.animate(
          [
            { transform: 'translate3d(0, 0, 0) scale(1, 1)', offset: 0 },
            {
              transform: isZen
                ? 'translate3d(0, 1px, 0) scale(1.01, 0.99)'
                : 'translate3d(0, 3.5px, 0) scale(1.03, 0.96)',
              offset: 0.28,
            },
            { transform: 'translate3d(0, 0, 0) scale(1, 1)', offset: 1 },
          ],
          {
            duration: 210,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
      }

      // 2. Directional Curved Tapli Hand Swing (~190ms)
      const handEl = handWrapperRef.current;
      if (handEl && typeof handEl.animate === 'function') {
        activeHandAnimRef.current?.cancel();
        const flipX = sideSign > 0 ? 1 : -1;
        const startX = sideSign * 56;
        const midX = sideSign * 26;
        const hitX = sideSign * 8;
        activeHandAnimRef.current = handEl.animate(
          [
            {
              opacity: 0,
              transform: `translate3d(${startX}px, -28px, 0) scaleX(${flipX}) rotate(28deg) scale(0.84)`,
              offset: 0,
            },
            {
              opacity: 1,
              transform: `translate3d(${midX}px, -16px, 0) scaleX(${flipX}) rotate(14deg) scale(1.04)`,
              offset: 0.2,
            },
            {
              opacity: 1,
              transform: `translate3d(${hitX}px, 15px, 0) scaleX(${flipX}) rotate(-19deg) scale(0.95)`,
              offset: 0.5,
            },
            {
              opacity: 0.88,
              transform: `translate3d(${midX * 1.15}px, -11px, 0) scaleX(${flipX}) rotate(11deg) scale(0.94)`,
              offset: 0.8,
            },
            {
              opacity: 0,
              transform: `translate3d(${startX}px, -24px, 0) scaleX(${flipX}) rotate(24deg) scale(0.84)`,
              offset: 1,
            },
          ],
          {
            duration: 190,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
      }

      // 3. Radial Impact Shockwave Ring / Golden Mandala Ring (240ms)
      const waveEl = shockwaveRef.current;
      if (waveEl && typeof waveEl.animate === 'function') {
        activeShockwaveAnimRef.current?.cancel();
        activeShockwaveAnimRef.current = waveEl.animate(
          [
            {
              opacity: 0.85,
              transform: 'translate3d(-50%, -50%, 0) scale(0.3) rotate(0deg)',
            },
            {
              opacity: 0,
              transform: isZen
                ? 'translate3d(-50%, -50%, 0) scale(1.65) rotate(24deg)'
                : 'translate3d(-50%, -50%, 0) scale(1.55) rotate(0deg)',
            },
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          },
        );
      }

      // 4. Micro Stage Shake on Heavy Hits (Inner Stage ONLY — Stage 4-7 or 10x+ Overdrive)
      const shouldMicroShake = (nextStage.id >= 4 && nextStage.id <= 7) || combo.isOverdrive;
      const shakeEl = innerStageShakeRef.current;
      if (shouldMicroShake && shakeEl && typeof shakeEl.animate === 'function') {
        activeShakeAnimRef.current?.cancel();
        const amp = combo.isOverdrive ? 2.6 : 2.2;
        activeShakeAnimRef.current = shakeEl.animate(
          [
            { transform: 'translate3d(0, 0, 0)' },
            { transform: `translate3d(${awaySign * amp}px, ${amp * 0.45}px, 0)`, offset: 0.25 },
            { transform: `translate3d(${-awaySign * amp * 0.85}px, ${-amp * 0.35}px, 0)`, offset: 0.55 },
            { transform: `translate3d(${awaySign * amp * 0.4}px, 0, 0)`, offset: 0.8 },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          {
            duration: 130,
            easing: 'ease-out',
          },
        );
      }

      // 5. Fixed 10-Slot Ring-Buffer Pooled FX (Zero DOM Allocation!)
      const slotIdx = fxCursorRef.current % TAPLI_FX_POOL_SIZE;
      fxCursorRef.current += 1;
      const slotEl = fxSlotRefs.current[slotIdx];
      if (slotEl && typeof slotEl.animate === 'function') {
        activeFxAnimsRef.current[slotIdx]?.cancel();
        const popWord = pickTapliPopWord(nextStage.id, nextSessionTaplis);
        const iconPrefix = combo.isOverdrive ? '★' : isZen ? '✿' : '✦';
        slotEl.textContent = `${iconPrefix} ${popWord}`;
        slotEl.style.color = combo.isOverdrive
          ? '#B87814'
          : FX_WORD_COLORS[(nextStage.id + nextSessionTaplis) % FX_WORD_COLORS.length];

        let originX = 50 + sideSign * (10 + (slotIdx % 3) * 7);
        let originY = 24 + (slotIdx % 2) * 8;

        if (typeof clientX === 'number' && typeof clientY === 'number' && rect && rect.width > 0 && rect.height > 0) {
          const pctX = ((clientX - rect.left) / rect.width) * 100;
          const pctY = ((clientY - rect.top) / rect.height) * 100;
          originX = Math.max(18, Math.min(82, pctX));
          originY = Math.max(14, Math.min(48, pctY));
        }

        slotEl.style.left = `${originX}%`;
        slotEl.style.top = `${originY}%`;

        const driftX = awaySign * (14 + (slotIdx % 3) * 8);
        const tilt = awaySign * (6 + (slotIdx % 2) * 5);

        activeFxAnimsRef.current[slotIdx] = slotEl.animate(
          [
            {
              opacity: 0,
              transform: `translate3d(-50%, -50%, 0) scale(0.55) rotate(${-tilt}deg)`,
              offset: 0,
            },
            {
              opacity: 1,
              transform: `translate3d(calc(-50% + ${driftX * 0.45}px), calc(-50% - 14px), 0) scale(1.12) rotate(${tilt}deg)`,
              offset: 0.25,
            },
            {
              opacity: 0,
              transform: `translate3d(calc(-50% + ${driftX}px), calc(-50% - 36px), 0) scale(0.92) rotate(${tilt * 1.2}deg)`,
              offset: 1,
            },
          ],
          {
            duration: 460,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          },
        );
      }
    },
    [animateGlobalCountPop],
  );

  const handleStagePointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      triggerTapli(e.clientX, e.clientY);
    },
    [triggerTapli],
  );

  const handleStageKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerTapli();
      }
    },
    [triggerTapli],
  );

  const handleCoolHerDown = useCallback(() => {
    // Synchronous haptic + cooling sigh Web Audio SFX
    triggerHaptic('light');
    soundEngine.playTapliCooldownSigh();

    if (impactTimerRef.current !== null) {
      window.clearTimeout(impactTimerRef.current);
      impactTimerRef.current = null;
    }
    if (comboHideTimerRef.current !== null) {
      window.clearTimeout(comboHideTimerRef.current);
      comboHideTimerRef.current = null;
    }
    if (toastHideTimerRef.current !== null) {
      window.clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }
    if (coolMeltTimerRef.current !== null) {
      window.clearTimeout(coolMeltTimerRef.current);
      coolMeltTimerRef.current = null;
    }
    if (coolEndTimerRef.current !== null) {
      window.clearTimeout(coolEndTimerRef.current);
      coolEndTimerRef.current = null;
    }

    comboCountRef.current = 0;
    lastTapMsRef.current = null;
    dialogueRef.current = TAPLI_COOL_DOWN_LINE;

    setIsImpactFlashing(false);
    setComboLabel(null);
    setIsOverdrive(false);
    setUnlockToast(null);
    setDialogue(TAPLI_COOL_DOWN_LINE);
    setIsCoolingDown(true);
    setCoolDownKey((k) => k + 1);

    // Smoothly melt local session taps & face props back to Stage 1 while preserving Global Counter
    coolMeltTimerRef.current = window.setTimeout(() => {
      sessionTaplisRef.current = 0;
      setSessionTaplis(0);
      coolMeltTimerRef.current = null;
    }, 140);

    coolEndTimerRef.current = window.setTimeout(() => {
      setIsCoolingDown(false);
      coolEndTimerRef.current = null;
    }, 960);
  }, []);

  const formattedGlobalCount = counterState.hasSynced
    ? counterState.displayedGlobalCount.toLocaleString('en-US')
    : 'Syncing...';

  return (
    <section
      id="tapli-arena"
      data-testid="tapli-arena-section"
      data-stage={stage.id}
      data-mood={stage.moodLabel}
      data-heat={palette.heat}
      data-overdrive={isOverdrive ? 'true' : 'false'}
      data-cooling={isCoolingDown ? 'true' : 'false'}
      className="relative z-[2] px-4 py-3"
    >
      <div
        className="mx-auto w-full text-center"
        style={{
          maxWidth: 'var(--card-max)',
          margin: '28px auto',
          padding: 'var(--card-pad-y) var(--card-pad-x)',
          borderRadius: 'var(--card-radius)',
          background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF5F8 100%)',
          border: '1px solid rgba(217, 75, 125, 0.22)',
          boxShadow: '0 14px 34px -16px rgba(176, 62, 106, 0.16)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Header */}
        <p
          className="uppercase"
          style={{
            fontSize: 'var(--text-eyebrow)',
            letterSpacing: '0.18em',
            color: '#C93B6B',
            fontWeight: 700,
          }}
        >
          OFFICIAL DIGITAPLI ARENA
        </p>

        <h2
          className="font-display mt-1 font-semibold tracking-tight"
          style={{
            fontSize: 'clamp(22px, 3.2vw, 31px)',
            lineHeight: 1.2,
            color: '#3A1233',
          }}
        >
          Give Anamika a Tapli
        </h2>

        <p
          className="mt-1 italic"
          style={{
            fontSize: 'var(--text-sub)',
            color: '#7A4A63',
          }}
        >
          Tap her head lightly. Watch her mood and face color evolve.
        </p>

        {/* Live Counter Bar (2 Crisp Pills Side-by-Side) */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 text-left">
          {/* Pill 1: Global Taplis (Firebase Synced) */}
          <div
            data-testid="tapli-global-pill"
            className="flex flex-col justify-between rounded-2xl px-3 py-2.5"
            style={{
              background:
                'linear-gradient(135deg, #FFF8EC 0%, #FFECF3 55%, #FFF4E4 100%)',
              border: '1px solid rgba(230, 184, 92, 0.44)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #F7D994 0%, #F4A6C1 100%)',
                  boxShadow: '0 0 10px rgba(230, 184, 92, 0.45)',
                }}
              >
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
                  <path
                    d="M10 2.5L11.5 6.8L15.8 8.3L11.5 9.8L10 14.1L8.5 9.8L4.2 8.3L8.5 6.8L10 2.5Z"
                    fill="#FFFDF9"
                  />
                  <circle cx="15.2" cy="14.6" r="1.4" fill="#FFFDF9" opacity="0.9" />
                </svg>
              </span>
              <span className="text-[10.5px] font-bold tracking-wide text-[#9A5622]">
                Global Taplis
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                ref={globalCountNumRef}
                data-testid="tapli-global-count"
                className="inline-block font-bold tabular-nums text-[#3A1233]"
                style={{
                  fontSize: counterState.hasSynced ? '18px' : '13px',
                  lineHeight: 1.15,
                  willChange: 'transform',
                }}
              >
                {formattedGlobalCount}
              </span>
            </div>
          </div>

          {/* Pill 2: Your Spree + Current Mood Badge */}
          <div
            data-testid="tapli-spree-pill"
            className="flex flex-col justify-between rounded-2xl px-3 py-2.5"
            style={{
              background: '#FFFDF9',
              border: '1px solid rgba(217, 75, 125, 0.22)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span
                data-testid="tapli-session-count"
                className="text-[11px] font-bold tabular-nums text-[#3A1233]"
              >
                Your Taplis: {sessionTaplis}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-1">
              <span
                data-testid="tapli-mood-tag"
                className="inline-flex max-w-full truncate items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                style={{
                  backgroundColor: stage.badgeBg,
                  color: stage.badgeText,
                  border: `1px solid ${stage.badgeBorder}`,
                  transition: 'background-color 240ms ease, color 240ms ease, border-color 240ms ease',
                }}
              >
                {stage.moodLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Sleek 8-Stage Progress Bar Row */}
        <div
          data-testid="tapli-stage-progress"
          className="mt-2.5 rounded-2xl px-3 py-2 text-left"
          style={{
            background: 'rgba(255, 253, 249, 0.85)',
            border: '1px solid rgba(217, 75, 125, 0.14)',
          }}
        >
          <div className="flex items-center justify-between gap-2 text-[10.5px] font-semibold">
            <span className="truncate text-[#4D1F42]">
              Stage {progress.stageIndex} of 8 &middot; {progress.moodLabel}
            </span>
            <span
              data-testid="tapli-next-hint"
              className="shrink-0 tabular-nums text-[#9B5D7C]"
            >
              {progress.nextHint}
            </span>
          </div>
          <div
            className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(217, 75, 125, 0.12)' }}
          >
            <div
              data-testid="tapli-mood-bar"
              className="h-full rounded-full"
              style={{
                width: `${progress.pct}%`,
                background: `linear-gradient(90deg, ${palette.moodBarStart} 0%, ${palette.moodBarEnd} 100%)`,
                transition: 'width 200ms cubic-bezier(0.22, 1, 0.36, 1), background 260ms ease',
              }}
            />
          </div>
        </div>

        {/* Dedicated Fixed-Height Speech Bubble (ZERO layout shift across viewports) */}
        <div className="relative mt-4 flex justify-center">
          <div
            data-testid="tapli-speech-bubble"
            className="relative flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-center sm:px-6"
            style={{
              minHeight: 'clamp(56px, 7.5vw, 76px)',
              background: isCoolingDown ? '#F2FBFF' : '#FFFFFF',
              border: isCoolingDown
                ? '1px solid rgba(92, 179, 224, 0.42)'
                : '1px solid rgba(217, 75, 125, 0.24)',
              boxShadow: '0 6px 18px -12px rgba(176, 62, 106, 0.25)',
              transition: 'background-color 220ms ease, border-color 220ms ease',
            }}
          >
            <p
              className="text-[clamp(13.5px,1.9vw,17.5px)] font-semibold leading-snug text-[#3A1233]"
              style={{ margin: 0 }}
            >
              {dialogue}
            </p>
            {/* Soft downward speech bubble pointer */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
              style={{
                background: isCoolingDown ? '#F2FBFF' : '#FFFFFF',
                borderRight: isCoolingDown
                  ? '1px solid rgba(92, 179, 224, 0.42)'
                  : '1px solid rgba(217, 75, 125, 0.24)',
                borderBottom: isCoolingDown
                  ? '1px solid rgba(92, 179, 224, 0.42)'
                  : '1px solid rgba(217, 75, 125, 0.24)',
                transition: 'background-color 220ms ease, border-color 220ms ease',
              }}
            />
          </div>
        </div>

        {/* Interactive Zero-Lag Tap Stage (Micro-Shake Targets Inner Container ONLY) */}
        <div
          ref={innerStageShakeRef}
          className="relative mt-2.5 flex justify-center"
          style={{ willChange: 'transform' }}
        >
          {/* Floating Non-Shifting Stage Unlock Toast Pill (1.6s auto-fade) */}
          <div
            data-testid="tapli-unlock-toast"
            aria-live="polite"
            className="pointer-events-none absolute top-0 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10.5px] font-bold tracking-wide shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #FFF7E4 0%, #FFE8F1 100%)',
              color: '#8D335B',
              border: '1px solid rgba(230, 184, 92, 0.58)',
              boxShadow: '0 8px 18px -10px rgba(176, 62, 106, 0.42)',
              opacity: unlockToast ? 1 : 0,
              transform: unlockToast
                ? 'translate3d(0, 0, 0) scale(1)'
                : 'translate3d(0, -6px, 0) scale(0.92)',
              transition: 'opacity 180ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {unlockToast ?? 'Stage 2 Unlocked · Side Eye Alert'}
          </div>

          <button
            ref={stageButtonRef}
            type="button"
            data-testid="tapli-stage-button"
            onPointerDown={handleStagePointerDown}
            onKeyDown={handleStageKeyDown}
            aria-label="Tap Anamika's head lightly to give a tapli"
            className="relative mx-auto flex w-full max-w-[clamp(288px,46vw,390px)] items-center justify-center overflow-visible rounded-3xl px-2 pt-11 pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C93B6B]"
            style={{
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
              background:
                stage.id === 8
                  ? 'radial-gradient(circle at 50% 56%, rgba(255, 229, 158, 0.45) 0%, rgba(255, 248, 251, 0) 72%)'
                  : stage.id === 7
                    ? 'radial-gradient(circle at 50% 56%, rgba(215, 198, 240, 0.42) 0%, rgba(255, 248, 251, 0) 72%)'
                    : 'radial-gradient(circle at 50% 58%, rgba(255, 224, 236, 0.42) 0%, rgba(255, 248, 251, 0) 70%)',
              transition: 'background 280ms ease',
            }}
          >
            {/* Temporary Rapid Combo / Overdrive Pill (upper-right clear zone below unlock toast & above Modino) */}
            <div
              data-testid="tapli-combo-pill"
              aria-live="polite"
              className="pointer-events-none absolute top-8 right-0 z-20 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold tracking-wide"
              style={{
                background: isOverdrive
                  ? 'linear-gradient(135deg, #FCE49C 0%, #F3B84E 100%)'
                  : 'linear-gradient(135deg, #FFF3D6 0%, #FFE2EE 100%)',
                color: isOverdrive ? '#5C3104' : '#B43159',
                border: isOverdrive
                  ? '1px solid rgba(212, 146, 36, 0.78)'
                  : '1px solid rgba(230, 184, 92, 0.55)',
                boxShadow: isOverdrive
                  ? '0 6px 16px -6px rgba(226, 162, 46, 0.58)'
                  : '0 6px 14px -8px rgba(217, 75, 125, 0.35)',
                opacity: comboLabel ? 1 : 0,
                transform: comboLabel
                  ? 'translate3d(0, 0, 0) scale(1)'
                  : 'translate3d(0, 6px, 0) scale(0.88)',
                transition: 'opacity 160ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {comboLabel ?? 'Combo x3'}
            </div>

            {/* Radial Pastel / Golden Overdrive / Zen Mandala Impact Shockwave Ring */}
            <div
              ref={shockwaveRef}
              aria-hidden="true"
              className="pointer-events-none absolute z-10 rounded-full"
              style={{
                left: '50%',
                top: '32%',
                width: '68px',
                height: '68px',
                opacity: 0,
                borderWidth: isOverdrive || stage.id === 8 ? '3px' : '2.5px',
                borderStyle: stage.id === 8 ? 'dashed' : 'solid',
                borderColor:
                  isOverdrive || stage.id === 8
                    ? 'rgba(235, 182, 72, 0.88)'
                    : 'rgba(234, 118, 158, 0.8)',
                boxShadow:
                  isOverdrive || stage.id === 8
                    ? '0 0 0 4px rgba(252, 224, 150, 0.35)'
                    : '0 0 0 3px rgba(255, 214, 230, 0.32)',
                willChange: 'transform, opacity',
              }}
            />

            {/* Directional Curved Open Tapli Hand SVG (Auto-transforms to Champagne Gold at 10x+ Combo!) */}
            <div
              ref={handWrapperRef}
              data-testid="tapli-hand-overlay"
              data-golden={isOverdrive ? 'true' : 'false'}
              aria-hidden="true"
              className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2"
              style={{
                width: 'clamp(56px, 7.5vw, 74px)',
                height: 'clamp(56px, 7.5vw, 74px)',
                opacity: 0,
                willChange: 'transform, opacity',
              }}
            >
              <svg viewBox="0 0 68 68" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id={`${prefix}_handSkin`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE8D9" />
                    <stop offset="100%" stopColor="#F4C5A8" />
                  </linearGradient>
                  <linearGradient id={`${prefix}_handGold`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF5CC" />
                    <stop offset="50%" stopColor="#F5CA63" />
                    <stop offset="100%" stopColor="#D6972C" />
                  </linearGradient>
                </defs>
                {/* Motion-smear comic whoosh trails */}
                <path
                  d="M 52 10 Q 59 18 55 29"
                  fill="none"
                  stroke={isOverdrive ? '#F5C95F' : '#F3A1BE'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.72"
                />
                <path
                  d="M 57 15 Q 63 23 59 33"
                  fill="none"
                  stroke={isOverdrive ? '#FFE7A3' : '#FAD0E0'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                {/* Soft wrist cuff */}
                <rect
                  x="24"
                  y="47"
                  width="18"
                  height="9"
                  rx="4.5"
                  fill={isOverdrive ? '#FFF2C6' : '#D6CCF7'}
                  stroke={isOverdrive ? '#D99F38' : '#B3A3E8'}
                  strokeWidth="1.2"
                />
                {/* Cute pastel / Champagne Gold Overdrive open palm */}
                <path
                  d="M 22 41
                     C 19 38 16 32 18 28
                     C 19.5 25.5 22.8 27.2 24.5 30.8
                     L 23.8 19.8
                     C 23.8 16.8 27.6 16.5 28.4 19.5
                     L 30.2 28.2
                     L 30.8 16.5
                     C 31.0 13.4 35.0 13.4 35.4 16.5
                     L 36.2 27.8
                     L 38.4 18.5
                     C 39.0 15.6 42.8 16.3 42.4 19.4
                     L 41.2 29.6
                     L 44.2 23.8
                     C 45.4 21.3 48.8 22.8 47.6 25.8
                     L 43.2 40.4
                     C 41.8 45.4 38.2 48.5 32.8 48.5
                     C 27.0 48.5 23.8 45.5 22 41 Z"
                  fill={`url(#${prefix}_${isOverdrive ? 'handGold' : 'handSkin'})`}
                  stroke={isOverdrive ? '#B87918' : '#D99C7E'}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                {/* Tiny palm crease & overdrive glint */}
                <path
                  d="M 27 38 Q 33 36 38 38.5"
                  fill="none"
                  stroke={isOverdrive ? '#FFF6D6' : '#DDA489'}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                {isOverdrive && (
                  <path
                    d="M 15 16 L 16.8 20 L 20.8 21.8 L 16.8 23.6 L 15 27.6 L 13.2 23.6 L 9.2 21.8 L 13.2 20 Z"
                    fill="#F7C948"
                  />
                )}
              </svg>
            </div>

            {/* Fixed 10-Slot Pooled Impact FX Overlay (ZERO DOM Bloat!) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 overflow-visible"
            >
              {POOL_INDICES.map((slotIndex) => (
                <span
                  key={slotIndex}
                  ref={(el) => {
                    fxSlotRefs.current[slotIndex] = el;
                  }}
                  className="pointer-events-none absolute select-none whitespace-nowrap font-extrabold tracking-wide"
                  style={{
                    left: '50%',
                    top: '24%',
                    fontSize: 'clamp(12px, 1.5vw, 15px)',
                    opacity: 0,
                    textShadow: '0 2px 6px rgba(255, 255, 255, 0.96)',
                    willChange: 'transform, opacity',
                  }}
                />
              ))}
            </div>

            {/* Slender Ultra-Cute Anamika Portrait SVG (8 Escalating Stages + 3-Layer Articulated Rig) */}
            <svg
              viewBox="0 0 220 212"
              role="img"
              aria-label={`Anamika looking ${stage.moodLabel.toLowerCase()}`}
              className="block h-[clamp(260px,42vmin,400px)] w-auto max-w-full select-none overflow-visible"
            >
              <defs>
                {/* Soft ambient aura behind Anamika */}
                <radialGradient id={`${prefix}_aura`} cx="50%" cy="48%" r="48%">
                  <stop
                    offset="0%"
                    stopColor={palette.auraCenter}
                    stopOpacity={palette.auraOpacity}
                  />
                  <stop offset="100%" stopColor="#FFF5F8" stopOpacity="0" />
                </radialGradient>

                {/* Base warm peach-ivory skin gradient */}
                <linearGradient id={`${prefix}_skinBase`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FDE1CE" />
                  <stop offset="62%" stopColor="#F8D4BC" />
                  <stop offset="100%" stopColor="#F4C7AD" />
                </linearGradient>

                {/* Deep espresso-plum layered silk hair gradient */}
                <linearGradient id={`${prefix}_hair`} x1="18%" y1="0%" x2="82%" y2="100%">
                  <stop offset="0%" stopColor="#3E2538" />
                  <stop offset="52%" stopColor="#2A1926" />
                  <stop offset="100%" stopColor="#1B0F19" />
                </linearGradient>

                {/* Pastel rose-ivory Anarkali kurti gradient */}
                <linearGradient id={`${prefix}_kurti`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFF9FB" />
                  <stop offset="52%" stopColor="#FFEBF2" />
                  <stop offset="100%" stopColor="#FFD7E6" />
                </linearGradient>

                {/* Sheer blush chiffon dupatta gradient */}
                <linearGradient id={`${prefix}_dupatta`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFC7DC" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="#F398B9" stopOpacity="0.72" />
                </linearGradient>

                {/* Champagne gold trim, crown & halo gradient */}
                <linearGradient id={`${prefix}_gold`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FCE8B2" />
                  <stop offset="55%" stopColor="#E6B85C" />
                  <stop offset="100%" stopColor="#C99438" />
                </linearGradient>

                {/* Glossy plum eye iris gradient */}
                <linearGradient id={`${prefix}_eye`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2A1424" />
                  <stop offset="68%" stopColor="#461E3C" />
                  <stop offset="100%" stopColor="#6D2E5E" />
                </linearGradient>

                {/* Feathered blush radial gradient */}
                <radialGradient id={`${prefix}_blush`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={palette.blushColor} stopOpacity="0.92" />
                  <stop offset="65%" stopColor={palette.blushColor} stopOpacity="0.46" />
                  <stop offset="100%" stopColor={palette.blushColor} stopOpacity="0" />
                </radialGradient>

                {/* Pastel icy blue cartoon ice pack gradient */}
                <linearGradient id={`${prefix}_icePack`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E3F8FF" />
                  <stop offset="55%" stopColor="#9EDDF9" />
                  <stop offset="100%" stopColor="#67BCE9" />
                </linearGradient>

                {/* Translucent floating mini ghost-Anamika soul gradient */}
                <linearGradient id={`${prefix}_ghostBody`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#E3D7F7" stopOpacity="0.68" />
                </linearGradient>
              </defs>

              {/* Soft Pastel Portrait Aura */}
              <circle cx="110" cy="112" r="78" fill={`url(#${prefix}_aura)`} />

              {/* Stage 8: Slowly Rotating Soft Champagne-Gold Zen Rays */}
              {palette.showZenRays && (
                <g data-testid="tapli-zen-rays" className="tapli-zen-rays pointer-events-none" opacity="0.52">
                  {ZEN_RAY_ANGLES.map((deg) => (
                    <polygon
                      key={deg}
                      points="110,108 104,24 116,24"
                      fill={`url(#${prefix}_gold)`}
                      opacity="0.28"
                      transform={`rotate(${deg} 110 108)`}
                    />
                  ))}
                </g>
              )}

              {/* Stage 5: Soft Swirling Pastel Dizzy Ring Backdrop */}
              {palette.showDizzyRing && (
                <g className="pointer-events-none" opacity="0.45">
                  <circle
                    cx="110"
                    cy="104"
                    r="66"
                    fill="none"
                    stroke="#F48FB1"
                    strokeWidth="2"
                    strokeDasharray="10 9"
                  />
                  <circle
                    cx="110"
                    cy="104"
                    r="54"
                    fill="none"
                    stroke="#F8B4C9"
                    strokeWidth="1.5"
                    strokeDasharray="6 8"
                  />
                </g>
              )}

              {/* Stage 6: Theatrical Pastel Anime Sparkle Streaks Behind Her */}
              {palette.showDramaStreaks && (
                <g className="pointer-events-none" stroke="#F08CB8" strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
                  <line x1="36" y1="68" x2="50" y2="82" />
                  <line x1="32" y1="108" x2="48" y2="106" />
                  <line x1="184" y1="68" x2="170" y2="82" />
                  <line x1="188" y1="108" x2="172" y2="106" />
                  <path d="M 42 132 L 44 136 L 48 138 L 44 140 L 42 144 L 40 140 L 36 138 L 40 136 Z" fill="#F4A5C8" stroke="none" />
                  <path d="M 178 132 L 180 136 L 184 138 L 180 140 L 178 144 L 176 140 L 172 138 L 176 136 Z" fill="#F4A5C8" stroke="none" />
                </g>
              )}

              {/* Stage 4: Warm Glowing Coral Tomato Aura Ring */}
              {stage.id === 4 && (
                <circle
                  cx="110"
                  cy="100"
                  r="58"
                  fill="none"
                  stroke="#F47C76"
                  strokeWidth="2.5"
                  opacity="0.34"
                />
              )}

              {/* Soft Grounded Bust Shadow */}
              <ellipse cx="110" cy="201" rx="48" ry="6.5" fill="rgba(176, 62, 108, 0.12)" />

              {/* ============================================================
                  LAYER 3: SHOULDERS & PASTEL ANARKALI KURTI COLLAR (Cushion Squish)
                  ============================================================ */}
              <g
                ref={shouldersRef}
                data-layer="anamikaShoulders"
                style={{
                  transformOrigin: '110px 190px',
                  willChange: 'transform',
                }}
              >
                {/* LAYER 2A: Flowing Back Hair Curtain Behind Shoulders (Secondary Follow-Through) */}
                <g
                  ref={backHairRef}
                  data-layer="anamikaBackHair"
                  style={{ transformOrigin: '110px 82px', willChange: 'transform' }}
                >
                  <path
                    d="M 65 98
                       C 60 130 58 162 64 192
                       C 76 197 92 198 110 198
                       C 128 198 144 197 156 192
                       C 162 162 160 130 155 98 Z"
                    fill={`url(#${prefix}_hair)`}
                  />
                  {/* Soft vertical silk-hair highlight strands */}
                  <path
                    d="M 70 122 C 68 146 68 168 71 186"
                    fill="none"
                    stroke="rgba(255, 224, 240, 0.10)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 150 122 C 152 146 152 168 149 186"
                    fill="none"
                    stroke="rgba(255, 224, 240, 0.10)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>

                {/* Narrow gracefully sloped kurti shoulders & upper torso */}
                <path
                  d="M 96 152
                     C 81 154 70 163 67 181
                     L 64 198
                     Q 110 205 156 198
                     L 153 181
                     C 150 163 139 154 124 152 Z"
                  fill={`url(#${prefix}_kurti)`}
                  stroke="#EBB6CB"
                  strokeWidth="1.0"
                  strokeLinejoin="round"
                />

                {/* Sheer blush chiffon dupatta draped gently over left shoulder */}
                <path
                  d="M 75 159
                     C 86 174 106 188 134 200
                     L 116 201
                     C 93 191 78 178 68 166 Z"
                  fill={`url(#${prefix}_dupatta)`}
                />
                <path
                  d="M 75 159 C 86 174 106 188 134 200"
                  fill="none"
                  stroke={`url(#${prefix}_gold)`}
                  strokeWidth="1.1"
                  opacity="0.72"
                />

                {/* Scalloped gold-trimmed sweetheart neckline */}
                <path
                  d="M 94 152.8
                     Q 102 168 110 170.5
                     Q 118 168 126 152.8"
                  fill="none"
                  stroke={`url(#${prefix}_gold)`}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="110" cy="171.4" r="2.8" fill="#D94B7D" stroke="#F8D88A" strokeWidth="1" />

                {/* Slender graceful neck with soft chin shadow */}
                <path
                  d="M 101.5 136 L 118.5 136 L 120 154.5 Q 110 160 100 154.5 Z"
                  fill={`url(#${prefix}_skinBase)`}
                />
                <path
                  d="M 101.5 136 L 118.5 136 L 120 154.5 Q 110 160 100 154.5 Z"
                  fill={palette.skinBottom}
                  opacity={sessionTaplis === 0 ? 0 : stage.id === 7 ? 0.85 : Math.min(0.7, palette.heat * 0.72)}
                  style={{ transition: 'fill 260ms ease, opacity 240ms ease' }}
                />
                <path
                  d="M 102 140.5 Q 110 147.5 118 140.5"
                  fill="none"
                  stroke="rgba(190, 120, 105, 0.30)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>

              {/* ============================================================
                  LAYER 1: ANAMIKA HEAD PIVOT (GPU Squash-and-Stretch Anchor at 110, 144)
                  ============================================================ */}
              <g
                ref={headPivotRef}
                data-layer="anamikaHead"
                style={{
                  transformOrigin: '110px 144px',
                  willChange: 'transform',
                }}
              >
                {/* Stage 4: Rising White Cartoon Steam Puffs From Both Ears */}
                {palette.showSteamPuffs && (
                  <g data-testid="tapli-steam-puffs" className="pointer-events-none">
                    <g
                      className="tapli-steam-left"
                      fill="#FFFDFB"
                      stroke="#EE8A9B"
                      strokeWidth="1.4"
                    >
                      <circle cx="48" cy="92" r="7.6" opacity="0.96" />
                      <circle cx="40" cy="83" r="6.2" opacity="0.94" />
                      <circle cx="49" cy="78" r="5.0" opacity="0.92" />
                    </g>
                    <g
                      className="tapli-steam-right"
                      fill="#FFFDFB"
                      stroke="#EE8A9B"
                      strokeWidth="1.4"
                    >
                      <circle cx="172" cy="92" r="7.6" opacity="0.96" />
                      <circle cx="180" cy="83" r="6.2" opacity="0.94" />
                      <circle cx="171" cy="78" r="5.0" opacity="0.92" />
                    </g>
                  </g>
                )}

                {/* Stage 5: 3 Orbiting Golden Cartoon Stars Around Crown */}
                {palette.showOrbitStars && (
                  <g data-testid="tapli-orbit-stars" className="tapli-dizzy-orbit pointer-events-none">
                    <ellipse
                      cx="110"
                      cy="38"
                      rx="38"
                      ry="9"
                      fill="none"
                      stroke="#F6C86E"
                      strokeWidth="1.3"
                      strokeDasharray="4 5"
                      opacity="0.7"
                    />
                    <path
                      d="M 72 34 L 74.2 38.6 L 78.8 40.8 L 74.2 43 L 72 47.6 L 69.8 43 L 65.2 40.8 L 69.8 38.6 Z"
                      fill="#F7C948"
                      stroke="#FFFDF9"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 148 30 L 150 34.4 L 154.4 36.4 L 150 38.4 L 148 42.8 L 146 38.4 L 141.6 36.4 L 146 34.4 Z"
                      fill="#F5B841"
                      stroke="#FFFDF9"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 110 21 L 111.8 25 L 115.8 26.8 L 111.8 28.6 L 110 32.6 L 108.2 28.6 L 104.2 26.8 L 108.2 25 Z"
                      fill="#FFE07D"
                      stroke="#D89A2A"
                      strokeWidth="0.7"
                    />
                  </g>
                )}

                {/* Stage 7: Cute Tiny Translucent Floating Mini Ghost-Anamika Soul Wearing 5'2" Tag */}
                {palette.showGhostSoul && (
                  <g data-testid="tapli-ghost-soul" className="tapli-ghost-soul pointer-events-none">
                    {/* Floating mini ghost body */}
                    <path
                      d="M 110 6
                         C 98 6 93 14 93 24
                         L 93 36
                         Q 97 32 101 36
                         Q 105.5 32 110 36
                         Q 114.5 32 119 36
                         Q 123 32 127 36
                         L 127 24
                         C 127 14 122 6 110 6 Z"
                      fill={`url(#${prefix}_ghostBody)`}
                      stroke="#B39CD8"
                      strokeWidth="1.2"
                    />
                    {/* Cute tiny ghost hair swoop & bindi */}
                    <path
                      d="M 97 16 Q 104 10 110 13 Q 116 10 123 16"
                      fill="none"
                      stroke="#7D62A6"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="110" cy="17.5" r="1.2" fill="#C94575" />
                    {/* Blank cute dot eyes & tiny 'o' mouth */}
                    <circle cx="104.5" cy="22" r="1.5" fill="#4D356B" />
                    <circle cx="115.5" cy="22" r="1.5" fill="#4D356B" />
                    <circle cx="110" cy="26.5" r="1.6" fill="none" stroke="#6E5291" strokeWidth="1.2" />
                    {/* Miniature 5'2" tag beside floating ghost */}
                    <g transform="translate(128, 12)">
                      <rect
                        x="0"
                        y="0"
                        width="27"
                        height="13.5"
                        rx="6.75"
                        fill="#FFFFFF"
                        stroke="#B496DA"
                        strokeWidth="1.1"
                      />
                      <text
                        x="13.5"
                        y="9.5"
                        textAnchor="middle"
                        fontSize="7.8"
                        fontWeight="800"
                        fill="#6F4994"
                      >
                        5&apos;2&quot;
                      </text>
                    </g>
                  </g>
                )}

                {/* Stage 8: Serene Champagne-Gold Halo + Tiny 17 Birthday Crown */}
                {palette.showZenHalo && (
                  <g data-testid="tapli-zen-halo" className="tapli-zen-halo-bob pointer-events-none">
                    {/* Floating Champagne-Gold Halo */}
                    <ellipse
                      cx="110"
                      cy="17"
                      rx="28"
                      ry="6.5"
                      fill="none"
                      stroke={`url(#${prefix}_gold)`}
                      strokeWidth="3.2"
                    />
                    <ellipse
                      cx="110"
                      cy="17"
                      rx="28"
                      ry="6.5"
                      fill="none"
                      stroke="#FFF8DC"
                      strokeWidth="1.1"
                      opacity="0.88"
                    />
                    {/* Tiny 17 Birthday Crown Perched Above Crown */}
                    <g transform="translate(94, 21)">
                      <path
                        d="M 2 16 L 0 5 L 9 10 L 16 2 L 23 10 L 32 5 L 30 16 Z"
                        fill={`url(#${prefix}_gold)`}
                        stroke="#B88224"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                      />
                      <circle cx="0" cy="4.5" r="1.7" fill="#FFF7DA" />
                      <circle cx="16" cy="1.8" r="2.1" fill="#F27BA8" stroke="#FFF7DA" strokeWidth="0.8" />
                      <circle cx="32" cy="4.5" r="1.7" fill="#FFF7DA" />
                      <text
                        x="16"
                        y="14"
                        textAnchor="middle"
                        fontSize="7.4"
                        fontWeight="800"
                        fill="#5E3608"
                      >
                        17
                      </text>
                    </g>
                    {/* Tiny floating golden zen sparkles */}
                    <path
                      d="M 62 38 L 63.8 42 L 67.8 43.8 L 63.8 45.6 L 62 49.6 L 60.2 45.6 L 56.2 43.8 L 60.2 42 Z"
                      fill="#E6B85C"
                    />
                    <path
                      d="M 158 36 L 159.8 40 L 163.8 41.8 L 159.8 43.6 L 158 47.6 L 156.2 43.6 L 152.2 41.8 L 156.2 40 Z"
                      fill="#F08CB2"
                    />
                  </g>
                )}

                {/* Back Crown Hair Volume */}
                <path
                  d="M 62 102
                     C 58 62 76 40 110 40
                     C 144 40 162 62 158 102
                     C 155 118 149 130 142 138
                     L 78 138
                     C 71 130 65 118 62 102 Z"
                  fill={`url(#${prefix}_hair)`}
                />

                {/* Stage 4 & 5: Cute Tiny Pink Cartoon Head-Bump On Crown */}
                {palette.showHeadBump && (
                  <g data-testid="tapli-head-bump">
                    <path
                      d="M 100 42 C 101 30 119 30 120 42 Z"
                      fill="#FFA8B8"
                      stroke="#E0657E"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M 105 37 Q 109 33.5 113 36.5"
                      fill="none"
                      stroke="#FFF4F7"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.88"
                    />
                  </g>
                )}

                {/* Delicate Ears + Tiny Golden Jhumka Pearl-Drop Earrings */}
                <g>
                  <ellipse cx="67.5" cy="104" rx="5.2" ry="7.2" fill={`url(#${prefix}_skinBase)`} />
                  <ellipse cx="152.5" cy="104" rx="5.2" ry="7.2" fill={`url(#${prefix}_skinBase)`} />
                  <ellipse
                    cx="67.5"
                    cy="104"
                    rx="5.2"
                    ry="7.2"
                    fill={palette.skinTop}
                    opacity={sessionTaplis === 0 ? 0 : stage.id === 7 ? 0.92 : Math.min(0.85, palette.heat * 0.9)}
                    style={{ transition: 'fill 260ms ease, opacity 240ms ease' }}
                  />
                  <ellipse
                    cx="152.5"
                    cy="104"
                    rx="5.2"
                    ry="7.2"
                    fill={palette.skinTop}
                    opacity={sessionTaplis === 0 ? 0 : stage.id === 7 ? 0.92 : Math.min(0.85, palette.heat * 0.9)}
                    style={{ transition: 'fill 260ms ease, opacity 240ms ease' }}
                  />

                  {/* Left gold jhumka + pearl drop */}
                  <circle cx="66.2" cy="111.5" r="2.3" fill={`url(#${prefix}_gold)`} />
                  <path
                    d="M 62.8 115.5 Q 66.2 112.5 69.6 115.5 L 70.6 119.5 Q 66.2 121.2 61.8 119.5 Z"
                    fill={`url(#${prefix}_gold)`}
                  />
                  <circle cx="64.0" cy="121.0" r="1.2" fill="#FFFDF8" />
                  <circle cx="66.2" cy="121.6" r="1.2" fill="#FFFDF8" />
                  <circle cx="68.4" cy="121.0" r="1.2" fill="#FFFDF8" />

                  {/* Right gold jhumka + pearl drop */}
                  <circle cx="153.8" cy="111.5" r="2.3" fill={`url(#${prefix}_gold)`} />
                  <path
                    d="M 150.4 115.5 Q 153.8 112.5 157.2 115.5 L 158.2 119.5 Q 153.8 121.2 149.4 119.5 Z"
                    fill={`url(#${prefix}_gold)`}
                  />
                  <circle cx="151.6" cy="121.0" r="1.2" fill="#FFFDF8" />
                  <circle cx="153.8" cy="121.6" r="1.2" fill="#FFFDF8" />
                  <circle cx="156.0" cy="121.0" r="1.2" fill="#FFFDF8" />
                </g>

                {/* Sculpted Slender Heart/Oval Face Base */}
                <path
                  d="M 70 94
                     C 70 66 85 54 110 54
                     C 135 54 150 66 150 94
                     C 150 118 136 136 118 142
                     Q 110 144.8 102 142
                     C 84 136 70 118 70 94 Z"
                  fill={`url(#${prefix}_skinBase)`}
                />

                {/* Smooth Continuous Heat / Shock / Zen Face-Color Shift Overlay */}
                <path
                  data-testid="tapli-face-heat-layer"
                  d="M 70 94
                     C 70 66 85 54 110 54
                     C 135 54 150 66 150 94
                     C 150 118 136 136 118 142
                     Q 110 144.8 102 142
                     C 84 136 70 118 70 94 Z"
                  fill={palette.skinTop}
                  opacity={
                    sessionTaplis === 0
                      ? 0
                      : stage.id === 7
                        ? 0.96
                        : stage.id === 8
                          ? 0.35
                          : Math.min(0.92, 0.25 + palette.heat * 0.68)
                  }
                  style={{ transition: 'fill 260ms ease, opacity 240ms ease' }}
                />

                {/* Subtle lower-face warm flush depth */}
                <path
                  d="M 72 102
                     C 74 122 86 137 102 142
                     Q 110 144.8 118 142
                     C 134 137 146 122 148 102
                     C 138 118 126 128 110 130
                     C 94 128 82 118 72 102 Z"
                  fill={palette.skinBottom}
                  opacity={stage.id === 7 ? 0.52 : stage.id === 8 ? 0.22 : Math.min(0.62, 0.12 + palette.heat * 0.5)}
                  style={{ transition: 'fill 260ms ease, opacity 240ms ease' }}
                />

                {/* Stage 3 & 4 Forehead Heat Tension Tint */}
                {(stage.id === 3 || stage.id === 4) && (
                  <ellipse
                    cx="110"
                    cy="76"
                    rx="30"
                    ry="11"
                    fill="#E85A64"
                    opacity={stage.id === 4 ? 0.24 : 0.13}
                    style={{ transition: 'opacity 240ms ease' }}
                  />
                )}

                {/* Feathered Rosy -> Tomato Cheek Blush */}
                <ellipse
                  cx="84.5"
                  cy="113.5"
                  rx={stage.id >= 3 && stage.id <= 6 ? 12.2 : 10.2}
                  ry={stage.id >= 3 && stage.id <= 6 ? 6.8 : 5.6}
                  fill={`url(#${prefix}_blush)`}
                  opacity={palette.blushOpacity}
                  style={{ transition: 'opacity 240ms ease' }}
                />
                <ellipse
                  cx="135.5"
                  cy="113.5"
                  rx={stage.id >= 3 && stage.id <= 6 ? 12.2 : 10.2}
                  ry={stage.id >= 3 && stage.id <= 6 ? 6.8 : 5.6}
                  fill={`url(#${prefix}_blush)`}
                  opacity={palette.blushOpacity}
                  style={{ transition: 'opacity 240ms ease' }}
                />

                {/* LAYER 2B: Center-Parted Layered Curtain Bangs & Wispy Side Locks (Secondary Follow-Through) */}
                <g
                  ref={frontHairRef}
                  data-layer="anamikaFrontHair"
                  style={{ transformOrigin: '110px 58px', willChange: 'transform' }}
                >
                  <path
                    d="M 65 98
                       C 64 62 80 45 110 45
                       C 140 45 156 62 155 98
                       C 149 80 139 68 113 62.5
                       L 110 67.5
                       L 107 62.5
                       C 81 68 71 80 65 98 Z"
                    fill={`url(#${prefix}_hair)`}
                  />
                  {/* Delicate face-slimming wispy side locks */}
                  <path
                    d="M 71 80 C 67 96 67 115 73 131 C 75.5 119 75 102 76 86 Z"
                    fill={`url(#${prefix}_hair)`}
                  />
                  <path
                    d="M 149 80 C 153 96 153 115 147 131 C 144.5 119 145 102 144 86 Z"
                    fill={`url(#${prefix}_hair)`}
                  />
                  {/* Crown Silk Hair Shine Arcs */}
                  <path
                    d="M 82 58 Q 94 51.5 105 56"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    opacity="0.24"
                  />
                  <path
                    d="M 115 56 Q 126 51.5 138 58"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    opacity="0.24"
                  />
                </g>

                {/* Sparkling Rose-Maroon Bindi */}
                <circle cx="110" cy="82.5" r="2.8" fill="#C82D62" />
                <circle cx="109.1" cy="81.6" r="0.9" fill="#FFD9E8" />

                {/* Stage 3 & 4: Pulsing Cute Anime Irritation Cross-Mark Near Right Temple */}
                {palette.showAngerMark && (
                  <g
                    data-testid="tapli-anger-vein"
                    className="tapli-anger-pulse"
                    stroke="#D9324A"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  >
                    <path d="M 134 73 Q 137 76 134 79" />
                    <path d="M 142 73 Q 139 76 142 79" />
                    <path d="M 135 71 Q 138 74 141 71" />
                    <path d="M 135 81 Q 138 78 141 81" />
                  </g>
                )}

                {/* Stage 6: Cute Pastel Pink Criss-Cross Bandage Sticker On Forehead Beside Bindi */}
                {palette.showBandage && (
                  <g data-testid="tapli-bandage-sticker" transform="translate(124, 71)">
                    <rect
                      x="-8"
                      y="-3"
                      width="16"
                      height="6"
                      rx="3"
                      fill="#FFD6E7"
                      stroke="#DF7BA5"
                      strokeWidth="1"
                      transform="rotate(28)"
                    />
                    <rect
                      x="-8"
                      y="-3"
                      width="16"
                      height="6"
                      rx="3"
                      fill="#FFE4EF"
                      stroke="#DF7BA5"
                      strokeWidth="1"
                      transform="rotate(-28)"
                    />
                    <rect
                      x="-3"
                      y="-2.4"
                      width="6"
                      height="4.8"
                      rx="1.2"
                      fill="#FFF8FB"
                      stroke="#E99BBE"
                      strokeWidth="0.7"
                    />
                  </g>
                )}

                {/* Tiny Cute Nose Dot */}
                <path
                  d="M 109 108.5 Q 110 110 111.2 108.5"
                  fill="none"
                  stroke="#C98A74"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                />

                {/* ==========================================================
                    EXPRESSIVE EYEBROWS, EYES & MOUTH (8 STAGES + IMPACT FLASH)
                    ========================================================== */}
                {isImpactFlashing ? (
                  /* --- IMPACT FLASH EXPRESSION (210ms) --- */
                  <g data-expression="impact">
                    {stage.id === 8 ? (
                      /* Stage 8 Zen Goddess: Completely serene calm smile even on tap */
                      <>
                        <path d="M 83 90 Q 91 86.8 98 89.8" fill="none" stroke="#3A1A2F" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M 122 89.8 Q 129 86.8 137 90" fill="none" stroke="#3A1A2F" strokeWidth="1.8" strokeLinecap="round" />
                        <g fill="none" stroke="#3A1A2F" strokeWidth="2.3" strokeLinecap="round">
                          <path d="M 84 101 Q 91 107.5 98 101" />
                          <path d="M 122 101 Q 129 107.5 136 101" />
                        </g>
                        <path d="M 103 122 Q 110 127.5 117 122" fill="none" stroke="#A83A60" strokeWidth="2.1" strokeLinecap="round" />
                      </>
                    ) : stage.id === 7 ? (
                      /* Stage 7 Soul Left The Body: Deadpan unbothered blank shock */
                      <>
                        <path d="M 83 89 L 97 89" stroke="#5A4573" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M 123 89 L 137 89" stroke="#5A4573" strokeWidth="1.7" strokeLinecap="round" />
                        <circle cx="91" cy="101" r="2.4" fill="#3A2552" />
                        <circle cx="129" cy="101" r="2.4" fill="#3A2552" />
                        <line x1="104" y1="123" x2="116" y2="123" stroke="#7A5A96" strokeWidth="2" strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        {/* Tight squeezed brows */}
                        <path d="M 82 87 L 96 92" stroke="#3A1A2F" strokeWidth="2.1" strokeLinecap="round" />
                        <path d="M 138 87 L 124 92" stroke="#3A1A2F" strokeWidth="2.1" strokeLinecap="round" />

                        {stage.id === 3 || stage.id === 4 ? (
                          /* Dramatic comic X X / dual-spark squint */
                          <g stroke="#3A1A2F" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M 85 95 L 97 105 M 97 95 L 85 105" />
                            <path d="M 123 95 L 135 105 M 135 95 L 123 105" />
                          </g>
                        ) : (
                          /* Cute > < squeeze wince */
                          <g fill="none" stroke="#3A1A2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M 84 95 L 96 100.5 L 84 106" />
                            <path d="M 136 95 L 124 100.5 L 136 106" />
                          </g>
                        )}

                        {/* Impact Mouth */}
                        {stage.id === 1 ? (
                          <ellipse cx="110" cy="123.5" rx="4.4" ry="5.2" fill="#C9456E" />
                        ) : (
                          <path
                            d="M 102 124.5 Q 106 120.5 110 124 Q 114 127 118 123"
                            fill="none"
                            stroke="#A83A60"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Popping Yellow Comic Impact Star(s) Above Crown */}
                        <path
                          d="M 110 29 L 112.4 35.2 L 118.6 37.6 L 112.4 40 L 110 46.2 L 107.6 40 L 101.4 37.6 L 107.6 35.2 Z"
                          fill="#F7C948"
                          stroke="#FFFDF9"
                          strokeWidth="0.9"
                        />
                        {stage.id >= 3 && (
                          <>
                            <path d="M 84 36 L 90 42" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M 136 36 L 130 42" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
                          </>
                        )}
                      </>
                    )}
                  </g>
                ) : stage.id === 1 ? (
                  /* --- STAGE 1: SWEET & CLUELESS (0 to 4 taps) --- */
                  <g data-expression="stage-1">
                    <path d="M 82 89.5 Q 90.5 85.5 98.5 88.8" fill="none" stroke="#3A1A2F" strokeWidth="1.9" strokeLinecap="round" />
                    <path d="M 121.5 88.8 Q 129.5 85.5 138 89.5" fill="none" stroke="#3A1A2F" strokeWidth="1.9" strokeLinecap="round" />
                    <g>
                      <ellipse cx="91" cy="101" rx="6.2" ry="7.4" fill={`url(#${prefix}_eye)`} />
                      <circle cx="88.8" cy="98.2" r="2.2" fill="#FFFFFF" />
                      <circle cx="93.4" cy="103.8" r="1.1" fill="#FFE6F2" />
                      <path d="M 83.5 97 Q 85.2 93.8 89 93.4" fill="none" stroke="#2B1325" strokeWidth="1.7" strokeLinecap="round" />

                      <ellipse cx="129" cy="101" rx="6.2" ry="7.4" fill={`url(#${prefix}_eye)`} />
                      <circle cx="126.8" cy="98.2" r="2.2" fill="#FFFFFF" />
                      <circle cx="131.4" cy="103.8" r="1.1" fill="#FFE6F2" />
                      <path d="M 136.5 97 Q 134.8 93.8 131 93.4" fill="none" stroke="#2B1325" strokeWidth="1.7" strokeLinecap="round" />
                    </g>
                    <path d="M 102.5 121.8 Q 110 128.4 117.5 121.8" fill="none" stroke="#A93C64" strokeWidth="2.1" strokeLinecap="round" />
                  </g>
                ) : stage.id === 2 ? (
                  /* --- STAGE 2: SIDE EYE ALERT (5 to 14 taps) --- */
                  <g data-expression="stage-2">
                    {/* One raised eyebrow + one angled sassy brow */}
                    <path d="M 81.5 85.2 Q 90 80.5 98.5 85.5" fill="none" stroke="#3A1A2F" strokeWidth="2.1" strokeLinecap="round" />
                    <path d="M 138.5 87.8 L 121.5 91.5" fill="none" stroke="#3A1A2F" strokeWidth="2.2" strokeLinecap="round" />
                    {/* Sassy side-eye glare */}
                    <g>
                      <ellipse cx="91" cy="101.5" rx="6.4" ry="5.6" fill="#FFFFFF" stroke="#3A1A2F" strokeWidth="1.4" />
                      <circle cx="94.2" cy="101.5" r="3.6" fill={`url(#${prefix}_eye)`} />
                      <circle cx="95.4" cy="100" r="1.2" fill="#FFFFFF" />

                      <ellipse cx="129" cy="101.5" rx="6.4" ry="5.6" fill="#FFFFFF" stroke="#3A1A2F" strokeWidth="1.4" />
                      <circle cx="132.2" cy="101.5" r="3.6" fill={`url(#${prefix}_eye)`} />
                      <circle cx="133.4" cy="100" r="1.2" fill="#FFFFFF" />
                    </g>
                    {/* Cute pouty frown */}
                    <path d="M 103.5 124.2 Q 110 119.2 116.5 124.2" fill="none" stroke="#A93C64" strokeWidth="2.2" strokeLinecap="round" />
                  </g>
                ) : stage.id === 3 ? (
                  /* --- STAGE 3: POUTY & OFFENDED (15 to 29 taps) --- */
                  <g data-expression="stage-3">
                    <path d="M 80 85.5 L 100 94.2" fill="none" stroke="#3A1A2F" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 140 85.5 L 120 94.2" fill="none" stroke="#3A1A2F" strokeWidth="2.5" strokeLinecap="round" />
                    <g>
                      <path d="M 83 97 L 98.5 100.5 C 98 105.5 85 106.5 83 97 Z" fill={`url(#${prefix}_eye)`} />
                      <circle cx="89" cy="100.5" r="1.6" fill="#FFFFFF" />

                      <path d="M 137 97 L 121.5 100.5 C 122 105.5 135 106.5 137 97 Z" fill={`url(#${prefix}_eye)`} />
                      <circle cx="128" cy="100.5" r="1.6" fill="#FFFFFF" />
                    </g>
                    {/* Puffed angry-cute hamster cheek arcs */}
                    <path d="M 79 115 Q 75.5 118 79 121" fill="none" stroke="#D1627C" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M 141 115 Q 144.5 118 141 121" fill="none" stroke="#D1627C" strokeWidth="1.6" strokeLinecap="round" />
                    {/* Grumbling small frown */}
                    <path d="M 103.5 124.8 Q 110 119.5 116.5 124.8" fill="none" stroke="#9B2D4F" strokeWidth="2.3" strokeLinecap="round" />
                  </g>
                ) : stage.id === 4 ? (
                  /* --- STAGE 4: FULL TOMATO MODE (30 to 49 taps) --- */
                  <g data-expression="stage-4">
                    <path d="M 79 84.5 L 101 94.5" fill="none" stroke="#3A1A2F" strokeWidth="2.7" strokeLinecap="round" />
                    <path d="M 141 84.5 L 119 94.5" fill="none" stroke="#3A1A2F" strokeWidth="2.7" strokeLinecap="round" />
                    {/* Fiery narrowed eyes */}
                    <g>
                      <path d="M 82 96.5 L 99 100.8 C 98 106.5 84 107.2 82 96.5 Z" fill={`url(#${prefix}_eye)`} />
                      <circle cx="89" cy="100.5" r="1.7" fill="#FFF3B8" />
                      <path d="M 138 96.5 L 121 100.8 C 122 106.5 136 107.2 138 96.5 Z" fill={`url(#${prefix}_eye)`} />
                      <circle cx="131" cy="100.5" r="1.7" fill="#FFF3B8" />
                    </g>
                    {/* Shouting cartoon D mouth */}
                    <path
                      d="M 100.5 119.5 L 119.5 119.5 C 119.5 129.5 100.5 129.5 100.5 119.5 Z"
                      fill="#C6314C"
                      stroke="#7E1C35"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <path d="M 104 126.2 Q 110 123 116 126.2" fill="#FF8AA4" />
                  </g>
                ) : stage.id === 5 ? (
                  /* --- STAGE 5: DIZZY CHAOS (50 to 74 taps) --- */
                  <g data-expression="stage-5">
                    <path d="M 82 89 Q 90 85 98 91" fill="none" stroke="#3A1A2F" strokeWidth="2.1" strokeLinecap="round" />
                    <path d="M 138 89 Q 130 85 122 91" fill="none" stroke="#3A1A2F" strokeWidth="2.1" strokeLinecap="round" />
                    {/* Animated spinning spiral eyes (GPU rotate!) */}
                    <g fill="none" stroke="#3A1A2F" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="91" cy="101" r="6.6" fill="#FFFDF9" strokeWidth="1.4" />
                      <g className="tapli-spiral-left" style={{ transformOrigin: '91px 101px' }}>
                        <path d="M 91 101 C 91 99 93.8 99 93.8 101 C 93.8 103.6 88.2 103.8 88.2 100.8 C 88.2 97.8 94.4 97 95.5 100.8" />
                      </g>

                      <circle cx="129" cy="101" r="6.6" fill="#FFFDF9" strokeWidth="1.4" />
                      <g className="tapli-spiral-right" style={{ transformOrigin: '129px 101px' }}>
                        <path d="M 129 101 C 129 99 131.8 99 131.8 101 C 131.8 103.6 126.2 103.8 126.2 100.8 C 126.2 97.8 132.4 97 133.5 100.8" />
                      </g>
                    </g>
                    {/* Wobbly squiggle mouth */}
                    <path
                      d="M 100.5 123.8 Q 105.2 119.5 110 123.5 Q 114.8 127.5 119.5 123.2"
                      fill="none"
                      stroke="#8D2542"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </g>
                ) : stage.id === 6 ? (
                  /* --- STAGE 6: DRAMA QUEEN TEARS (75 to 99 taps) --- */
                  <g data-expression="stage-6">
                    {/* Theatrical raised inner dramatic brows */}
                    <path d="M 81 91.5 Q 90 86.5 99 88.5" fill="none" stroke="#3A1A2F" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 139 91.5 Q 130 86.5 121 88.5" fill="none" stroke="#3A1A2F" strokeWidth="2" strokeLinecap="round" />
                    {/* Over-the-top comical sparkling anime pouty eyes */}
                    <g>
                      <ellipse cx="91" cy="101" rx="6.8" ry="7.8" fill={`url(#${prefix}_eye)`} />
                      <circle cx="88.4" cy="97.8" r="2.6" fill="#FFFFFF" />
                      <circle cx="93.6" cy="103.8" r="1.6" fill="#E6F6FF" />
                      <circle cx="88.8" cy="104.6" r="1.2" fill="#FFFFFF" />

                      <ellipse cx="129" cy="101" rx="6.8" ry="7.8" fill={`url(#${prefix}_eye)`} />
                      <circle cx="126.4" cy="97.8" r="2.6" fill="#FFFFFF" />
                      <circle cx="131.6" cy="103.8" r="1.6" fill="#E6F6FF" />
                      <circle cx="126.8" cy="104.6" r="1.2" fill="#FFFFFF" />
                    </g>
                    {/* Tiny cute comical anime teardrop glints */}
                    <g className="tapli-teardrop-glint" fill="#94D8FA" stroke="#FFFFFF" strokeWidth="0.7">
                      <path d="M 83 106 C 81 109.5 81 112 83 112 C 85 112 85 109.5 83 106 Z" />
                      <path d="M 137 106 C 135 109.5 135 112 137 112 C 139 112 139 109.5 137 106 Z" />
                    </g>
                    {/* Dramatic wobbly pout */}
                    <path
                      d="M 103 125.2 Q 106.5 120.8 110 123.2 Q 113.5 120.8 117 125.2"
                      fill="none"
                      stroke="#A93C64"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </g>
                ) : stage.id === 7 ? (
                  /* --- STAGE 7: SOUL LEFT THE BODY (100 to 149 taps) --- */
                  <g data-expression="stage-7">
                    {/* Flat unbothered shock brows */}
                    <line x1="83" y1="90.5" x2="97" y2="90.5" stroke="#5A4573" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="123" y1="90.5" x2="137" y2="90.5" stroke="#5A4573" strokeWidth="1.8" strokeLinecap="round" />
                    {/* Deadpan blank dot eyes */}
                    <circle cx="91" cy="101.5" r="2.5" fill="#3A2552" />
                    <circle cx="129" cy="101.5" r="2.5" fill="#3A2552" />
                    {/* Tiny flat unbothered line mouth */}
                    <line x1="104" y1="123.5" x2="116" y2="123.5" stroke="#7A5A96" strokeWidth="2.1" strokeLinecap="round" />
                  </g>
                ) : (
                  /* --- STAGE 8: TAPLI ZEN GODDESS (150+ taps) --- */
                  <g data-expression="stage-8">
                    <path d="M 83 90 Q 91 86.8 98 89.8" fill="none" stroke="#3A1A2F" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 122 89.8 Q 129 86.8 137 90" fill="none" stroke="#3A1A2F" strokeWidth="1.8" strokeLinecap="round" />
                    {/* Peaceful closed-eye Zen smile (u   u) */}
                    <g fill="none" stroke="#3A1A2F" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M 84.5 100.8 Q 91 107 97.5 100.8" />
                      <path d="M 122.5 100.8 Q 129 107 135.5 100.8" />
                    </g>
                    {/* Serene content smile */}
                    <path d="M 103.5 122.2 Q 110 128 116.5 122.2" fill="none" stroke="#A93C64" strokeWidth="2.1" strokeLinecap="round" />
                  </g>
                )}

                {/* ANIMATED CARTOON ICE PACK COOLDOWN OVERLAY (~950ms drop + 5 chilled cyan-white sparkles) */}
                {isCoolingDown && (
                  <g key={coolDownKey} data-testid="tapli-ice-pack" className="pointer-events-none">
                    {/* 5 chilled cyan-white sparkles */}
                    {ICE_SPARKLES.map((sp, i) => (
                      <g
                        key={i}
                        className="tapli-ice-sparkle"
                        style={{ animationDelay: sp.delay }}
                      >
                        <path
                          d={`M ${sp.x} ${sp.y - 5 * sp.size} L ${sp.x + 1.5 * sp.size} ${sp.y - 1.5 * sp.size} L ${sp.x + 5 * sp.size} ${sp.y} L ${sp.x + 1.5 * sp.size} ${sp.y + 1.5 * sp.size} L ${sp.x} ${sp.y + 5 * sp.size} L ${sp.x - 1.5 * sp.size} ${sp.y + 1.5 * sp.size} L ${sp.x - 5 * sp.size} ${sp.y} L ${sp.x - 1.5 * sp.size} ${sp.y - 1.5 * sp.size} Z`}
                          fill={i % 2 === 0 ? '#7ED7FA' : '#FFFFFF'}
                          stroke="#56B5E6"
                          strokeWidth="0.6"
                        />
                      </g>
                    ))}
                    {/* Cute pastel ice-blue cartoon ice pack resting on her crown */}
                    <g className="tapli-icepack-drop">
                      {/* Pleated icy water-bag pouch */}
                      <path
                        d="M 84 48
                           C 82 34 94 27 110 27
                           C 126 27 138 34 136 48
                           C 134 55 124 58 110 58
                           C 96 58 86 55 84 48 Z"
                        fill={`url(#${prefix}_icePack)`}
                        stroke="#4BA3D6"
                        strokeWidth="1.6"
                      />
                      {/* Soft vertical pleats */}
                      <path d="M 96 32 Q 94 43 97 54" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
                      <path d="M 124 32 Q 126 43 123 54" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
                      {/* Snowflake emblem in center */}
                      <g stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.92">
                        <line x1="110" y1="36" x2="110" y2="48" />
                        <line x1="104" y1="42" x2="116" y2="42" />
                        <line x1="106" y1="38" x2="114" y2="46" />
                        <line x1="114" y1="38" x2="106" y2="46" />
                      </g>
                      {/* Cute white twist-top cap */}
                      <rect
                        x="102"
                        y="20"
                        width="16"
                        height="8"
                        rx="3.5"
                        fill="#FFFFFF"
                        stroke="#5BB0DF"
                        strokeWidth="1.3"
                      />
                      <line x1="106" y1="22" x2="106" y2="26" stroke="#8CCFF0" strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="110" y1="22" x2="110" y2="26" stroke="#8CCFF0" strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="114" y1="22" x2="114" y2="26" stroke="#8CCFF0" strokeWidth="1.2" strokeLinecap="round" />
                    </g>
                  </g>
                )}
              </g>
            </svg>
          </button>
        </div>

        {/* Subtle Helper Prompt + Fixed-Height Cool Her Down Pill Slot (ZERO layout shift) */}
        <div className="mt-3 flex flex-col items-center gap-2.5">
          <p className="text-[clamp(11.5px,1.45vw,13.5px)] font-medium tracking-wide text-[#9A6881]">
            {isCoolingDown
              ? 'Cooling her down with an ice pack...'
              : sessionTaplis === 0
                ? 'Tap Anamika to start the spree'
                : sessionTaplis >= 150
                  ? 'Tapli Zen Goddess achieved!'
                  : 'Keep tapping for the next reaction'}
          </p>

          <div className="flex min-h-[42px] items-center justify-center">
            {sessionTaplis >= 5 && (
              <button
                type="button"
                data-testid="tapli-cool-down-btn"
                onClick={handleCoolHerDown}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-[clamp(12px,1.5vw,14px)] font-semibold text-[#8C3D63] transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
                style={{
                  background: '#FFFDF9',
                  border: '1px solid rgba(217, 75, 125, 0.28)',
                  boxShadow: '0 4px 12px -8px rgba(176, 62, 106, 0.22)',
                }}
              >
                <span>Cool Her Down</span>
                <span aria-hidden="true">🧊</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TapliArenaSection;

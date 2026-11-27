import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Delete, KeyRound, Lock, X } from 'lucide-react';
import {
  CLAIMED_DATE_LABEL,
  INFINITY_STONES,
  ORBIT_BASE_SPEED_RAD,
  ORBIT_STOP_DURATION_SEC,
  PRIZE_POOL_TIERS,
  RIGGED_GIFT_DISPLAY,
  clearSummaryConsumed,
  clearVaultClaim,
  clampVaultDt,
  computeStoneOrbitPosition,
  computeStoppingAngularVelocity,
  consumeOneTimeSummary,
  evaluateVaultPasscode,
  generateGiftCardCode,
  getStoneById,
  readVaultClaim,
  resolveVaultRewardValue,
  spawnStoneDustParticles,
  stepDustParticles,
  writeVaultClaim,
  type DustParticle,
  type InfinityStoneId,
  type OneTimeSummaryGiftData,
  type VaultClaimRecord,
} from '../utils/infinityVault';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { InfinityStoneSvg } from './InfinityStoneSvg';

type VaultPhase =
  | 'locked'
  | 'orbiting'
  | 'stopping'
  | 'picking'
  | 'revealing'
  | 'dusting'
  | 'claimed'
  | 'alreadyClaimed';

interface InfinityVaultSectionProps {
  onRevealConfetti?: (originX?: number, originY?: number) => void;
  onFirstClaimUnlock?: (summary: OneTimeSummaryGiftData) => void;
  onVaultReset?: () => void;
  showFooterSummaryJump?: boolean;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'] as const;

export function InfinityVaultSection({
  onRevealConfetti,
  onFirstClaimUnlock,
  onVaultReset,
  showFooterSummaryJump = false,
}: InfinityVaultSectionProps) {
  const grainFilterId = useId().replace(/:/g, '');
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dustCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stoneWrapRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Stable refs for zero-re-render 60fps orbital & canvas loops
  const phaseRef = useRef<VaultPhase>('locked');
  const isVisibleRef = useRef(true);
  const orbitRafRef = useRef<number | null>(null);
  const orbitLastTsRef = useRef<number>(0);
  const orbitAngleRef = useRef<number>(0);
  const orbitSpeedRef = useRef<number>(ORBIT_BASE_SPEED_RAD);
  const stopElapsedRef = useRef<number>(0);
  const bobClockRef = useRef<number>(0);
  const orbitRadiusRef = useRef<number>(112);

  const dustRafRef = useRef<number | null>(null);
  const dustLastTsRef = useRef<number>(0);
  const dustParticlesRef = useRef<DustParticle[]>([]);
  const timersRef = useRef<number[]>([]);
  const pickedGuardRef = useRef<boolean>(false);

  // React UI state (only changes on discrete milestones — never per animation frame)
  const [phase, setPhase] = useState<VaultPhase>('locked');
  const [claimRecord, setClaimRecord] = useState<VaultClaimRecord | null>(() => readVaultClaim());
  const [pickedStoneId, setPickedStoneId] = useState<InfinityStoneId | null>(null);
  const [unselectedFading, setUnselectedFading] = useState(false);
  const [chosenBursting, setChosenBursting] = useState(false);
  const [shockwaveColor, setShockwaveColor] = useState<string | null>(null);

  // Main lock keypad state
  const [codeDigits, setCodeDigits] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // Secret reset toast & emerald flash
  const [resetToastVisible, setResetToastVisible] = useState(false);
  const [emeraldFlashKey, setEmeraldFlashKey] = useState(0);

  // Discreet corner 🔑 reset modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [modalDigits, setModalDigits] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalShakeCount, setModalShakeCount] = useState(0);

  const setVaultPhase = useCallback((next: VaultPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number): number => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delayMs);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const stopDustLoop = useCallback((clearCanvas = false) => {
    if (dustRafRef.current !== null) {
      window.cancelAnimationFrame(dustRafRef.current);
      dustRafRef.current = null;
    }
    if (clearCanvas) {
      dustParticlesRef.current = [];
      const canvas = dustCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const stopOrbitLoop = useCallback(() => {
    if (orbitRafRef.current !== null) {
      window.cancelAnimationFrame(orbitRafRef.current);
      orbitRafRef.current = null;
    }
  }, []);

  // Measure responsive orbital radius: min(34vw, 128px), clamped to stay comfortably inside vault stage
  const updateOrbitRadius = useCallback(() => {
    const stageEl = stageRef.current;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const stageWidth = stageEl ? stageEl.clientWidth : vw - 48;
    const desired = Math.min(vw * 0.34, 128);
    const maxSafe = Math.max(88, stageWidth / 2 - 42);
    orbitRadiusRef.current = Math.min(desired, maxSafe);
  }, []);

  // Apply orbital positions directly to DOM refs without triggering React re-renders
  const applyStoneTransforms = useCallback((angleRad: number, bobSec = 0) => {
    const radius = orbitRadiusRef.current;
    for (let i = 0; i < INFINITY_STONES.length; i++) {
      const el = stoneWrapRefs.current[i];
      if (!el) continue;
      const pos = computeStoneOrbitPosition(i, angleRad, radius);
      const bobY = bobSec > 0 ? Math.sin(bobSec * 2.4 + i * 1.05) * 5.5 : 0;
      el.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${(pos.y + bobY).toFixed(2)}px, 0)`;
    }
  }, []);

  // Start / resume the 60fps orbital rAF loop (only while visible & in orbiting/stopping)
  const ensureOrbitLoop = useCallback(() => {
    const activePhase = phaseRef.current;
    const shouldRun =
      isVisibleRef.current && (activePhase === 'orbiting' || activePhase === 'stopping');

    if (!shouldRun) {
      stopOrbitLoop();
      return;
    }

    if (orbitRafRef.current !== null) return;
    orbitLastTsRef.current = performance.now();

    const tick = (now: number) => {
      const current = phaseRef.current;
      if (!isVisibleRef.current || (current !== 'orbiting' && current !== 'stopping')) {
        orbitRafRef.current = null;
        return;
      }

      const dt = clampVaultDt(now - orbitLastTsRef.current);
      orbitLastTsRef.current = now;

      if (current === 'orbiting') {
        orbitAngleRef.current += ORBIT_BASE_SPEED_RAD * dt;
        applyStoneTransforms(orbitAngleRef.current, 0);
      } else if (current === 'stopping') {
        stopElapsedRef.current += dt;
        const speed = computeStoppingAngularVelocity(
          stopElapsedRef.current,
          orbitSpeedRef.current,
          ORBIT_STOP_DURATION_SEC,
        );
        orbitAngleRef.current += speed * dt;
        applyStoneTransforms(orbitAngleRef.current, 0);

        if (stopElapsedRef.current >= ORBIT_STOP_DURATION_SEC) {
          bobClockRef.current = 0;
          orbitRafRef.current = null;
          setVaultPhase('picking');
          return;
        }
      }

      orbitRafRef.current = window.requestAnimationFrame(tick);
    };

    orbitRafRef.current = window.requestAnimationFrame(tick);
  }, [applyStoneTransforms, setVaultPhase, stopOrbitLoop]);

  // Size dust canvas cleanly with DPR capped at 2
  const syncDustCanvasSize = useCallback(() => {
    const canvas = dustCanvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return null;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { rect, width, height, ctx };
  }, []);

  // 2D Canvas Thanos-snap dust particle animation loop (auto-stops when particles fade out)
  const ensureDustLoop = useCallback(() => {
    if (dustRafRef.current !== null) return;
    dustLastTsRef.current = performance.now();

    const step = (now: number) => {
      const canvas = dustCanvasRef.current;
      if (!canvas) {
        dustRafRef.current = null;
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        dustRafRef.current = null;
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;

      const dt = clampVaultDt(now - dustLastTsRef.current);
      dustLastTsRef.current = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const remaining = stepDustParticles(dustParticlesRef.current, dt);
      dustParticlesRef.current = remaining;

      for (let i = 0; i < remaining.length; i++) {
        const p = remaining[i];
        if (p.delaySec > 0) continue;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (remaining.length > 0) {
        dustRafRef.current = window.requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, cssW, cssH);
        dustRafRef.current = null;
      }
    };

    dustRafRef.current = window.requestAnimationFrame(step);
  }, []);

  // Pause orbital rAF automatically when off-screen via IntersectionObserver
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        isVisibleRef.current = visible;
        if (visible) {
          ensureOrbitLoop();
        } else {
          stopOrbitLoop();
        }
      },
      { threshold: 0.05 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [ensureOrbitLoop, stopOrbitLoop]);

  // Initial stone layout & resize observer
  useEffect(() => {
    updateOrbitRadius();
    applyStoneTransforms(orbitAngleRef.current, 0);

    const handleResize = () => {
      updateOrbitRadius();
      if (
        phaseRef.current === 'locked' ||
        phaseRef.current === 'orbiting' ||
        phaseRef.current === 'stopping' ||
        phaseRef.current === 'picking'
      ) {
        applyStoneTransforms(orbitAngleRef.current, bobClockRef.current);
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [applyStoneTransforms, updateOrbitRadius]);

  // Sync orbital loop whenever phase changes
  useEffect(() => {
    if (phase === 'locked' || phase === 'picking') {
      updateOrbitRadius();
      applyStoneTransforms(orbitAngleRef.current, 0);
      stopOrbitLoop();
    } else if (phase === 'orbiting' || phase === 'stopping') {
      updateOrbitRadius();
      applyStoneTransforms(orbitAngleRef.current, 0);
      ensureOrbitLoop();
    } else {
      stopOrbitLoop();
    }
  }, [applyStoneTransforms, ensureOrbitLoop, phase, stopOrbitLoop, updateOrbitRadius]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      stopOrbitLoop();
      stopDustLoop(true);
      bgMusicPlayer.endVaultSequenceImmediate();
    };
  }, [clearAllTimers, stopDustLoop, stopOrbitLoop]);

  // Secret Reset (`9876`): wipes localStorage, resets refs/canvas/timers, plays reverse-time shimmer
  const executeSecretReset = useCallback(() => {
    trackEvent('vault_reset_triggered', 'Infinity Gift Vault Reset');
    clearAllTimers();
    stopOrbitLoop();
    stopDustLoop(true);
    clearVaultClaim();
    clearSummaryConsumed();
    onVaultReset?.();
    bgMusicPlayer.endVaultSequenceImmediate();

    pickedGuardRef.current = false;
    orbitAngleRef.current = 0;
    orbitSpeedRef.current = ORBIT_BASE_SPEED_RAD;
    stopElapsedRef.current = 0;
    bobClockRef.current = 0;

    setClaimRecord(null);
    setPickedStoneId(null);
    setUnselectedFading(false);
    setChosenBursting(false);
    setShockwaveColor(null);
    setCodeDigits('');
    setCodeError(null);
    setCopied(false);
    setResetModalOpen(false);
    setModalDigits('');
    setModalError(null);
    setVaultPhase('locked');

    soundEngine.playVaultTimeReset();
    setEmeraldFlashKey((k) => k + 1);
    setResetToastVisible(true);

    scheduleTimer(() => {
      setResetToastVisible(false);
    }, 1500);
  }, [clearAllTimers, onVaultReset, scheduleTimer, setVaultPhase, stopDustLoop, stopOrbitLoop]);

  // Evaluate 4-digit code on the main locked keypad
  const submitMainCode = useCallback(
    (fourDigits: string) => {
      const latestClaim = readVaultClaim();
      setClaimRecord(latestClaim);
      const resolution = evaluateVaultPasscode(fourDigits, latestClaim);
      const trackedResult =
        resolution === 'unlock'
          ? 'unlocked'
          : resolution === 'alreadyClaimed'
            ? 'already_claimed'
            : resolution === 'reset'
              ? 'reset'
              : 'wrong';
      trackEvent('vault_passcode_attempt', 'Infinity Vault Keypad', {
        codeEntered: fourDigits,
        result: trackedResult,
      });

      if (resolution === 'reset') {
        executeSecretReset();
        return;
      }

      if (resolution === 'alreadyClaimed') {
        soundEngine.playVaultUnlock();
        haptics.vaultUnlock();
        setCodeDigits('');
        setCodeError(null);
        setVaultPhase('alreadyClaimed');
        return;
      }

      if (resolution === 'unlock') {
        soundEngine.playVaultUnlock();
        haptics.vaultUnlock();
        bgMusicPlayer.beginVaultSequence();
        pickedGuardRef.current = false;
        setCodeDigits('');
        setCodeError(null);
        setPickedStoneId(null);
        setUnselectedFading(false);
        setChosenBursting(false);
        setShockwaveColor(null);
        orbitSpeedRef.current = ORBIT_BASE_SPEED_RAD;
        stopElapsedRef.current = 0;
        setVaultPhase('orbiting');
        return;
      }

      // Wrong passcode
      soundEngine.playVaultWrongCode();
      haptics.vaultWrongCode();
      setCodeError('Wrong passcode, try again.');
      setShakeCount((c) => c + 1);
      scheduleTimer(() => {
        setCodeDigits('');
      }, 360);
    },
    [executeSecretReset, scheduleTimer, setVaultPhase],
  );

  // Append digit to main locked keypad
  const handleMainDigitInput = useCallback(
    (nextDigits: string) => {
      const cleaned = nextDigits.replace(/\D/g, '').slice(0, 4);
      setCodeError(null);
      setCodeDigits(cleaned);
      if (cleaned.length === 4) {
        submitMainCode(cleaned);
      }
    },
    [submitMainCode],
  );

  const handleMainKeyTap = useCallback(
    (key: (typeof KEYPAD_KEYS)[number]) => {
      soundEngine.playVaultKeypadTap();
      haptics.vaultKeypadTap();
      if (key === 'CLEAR') {
        setCodeDigits('');
        setCodeError(null);
        return;
      }
      if (key === 'BACK') {
        setCodeDigits((prev) => prev.slice(0, -1));
        setCodeError(null);
        return;
      }
      if (codeDigits.length >= 4) return;
      handleMainDigitInput(codeDigits + key);
    },
    [codeDigits, handleMainDigitInput],
  );

  // Evaluate 4-digit code inside the discreet corner 🔑 reset modal
  const submitModalCode = useCallback(
    (fourDigits: string) => {
      const latestClaim = readVaultClaim();
      const resolution = evaluateVaultPasscode(fourDigits, latestClaim);
      const trackedResult =
        resolution === 'unlock'
          ? 'unlocked'
          : resolution === 'alreadyClaimed'
            ? 'already_claimed'
            : resolution === 'reset'
              ? 'reset'
              : 'wrong';
      trackEvent('vault_passcode_attempt', 'Infinity Vault Reset Modal', {
        codeEntered: fourDigits,
        result: trackedResult,
      });

      if (resolution === 'reset') {
        executeSecretReset();
        return;
      }

      if (resolution === 'alreadyClaimed') {
        soundEngine.playBubbleClick(0.95);
        setModalDigits('');
        setModalError(null);
        setResetModalOpen(false);
        setVaultPhase('alreadyClaimed');
        return;
      }

      if (resolution === 'unlock') {
        // Vault wasn't claimed yet — close modal
        setModalDigits('');
        setModalError(null);
        setResetModalOpen(false);
        return;
      }

      soundEngine.playVaultWrongCode();
      haptics.vaultWrongCode();
      setModalError('Wrong passcode, try again.');
      setModalShakeCount((c) => c + 1);
      scheduleTimer(() => {
        setModalDigits('');
      }, 360);
    },
    [executeSecretReset, scheduleTimer, setVaultPhase],
  );

  const handleModalDigitInput = useCallback(
    (nextDigits: string) => {
      const cleaned = nextDigits.replace(/\D/g, '').slice(0, 4);
      setModalError(null);
      setModalDigits(cleaned);
      if (cleaned.length === 4) {
        submitModalCode(cleaned);
      }
    },
    [submitModalCode],
  );

  const handleModalKeyTap = useCallback(
    (key: (typeof KEYPAD_KEYS)[number]) => {
      soundEngine.playVaultKeypadTap();
      haptics.vaultKeypadTap();
      if (key === 'CLEAR') {
        setModalDigits('');
        setModalError(null);
        return;
      }
      if (key === 'BACK') {
        setModalDigits((prev) => prev.slice(0, -1));
        setModalError(null);
        return;
      }
      if (modalDigits.length >= 4) return;
      handleModalDigitInput(modalDigits + key);
    },
    [handleModalDigitInput, modalDigits],
  );

  // Stop the orbital ring smoothly over 1.4s cubic ease-out
  const handleStopRing = useCallback(() => {
    if (phaseRef.current !== 'orbiting') return;
    trackEvent('vault_ring_stopped', 'Infinity Vault Stop Ring Button');
    soundEngine.playVaultRingDecel();
    haptics.vaultStopRing();
    orbitSpeedRef.current = ORBIT_BASE_SPEED_RAD;
    stopElapsedRef.current = 0;
    setVaultPhase('stopping');
  }, [setVaultPhase]);

  // Pick any 1 Infinity Stone -> glide to center, Thanos-snap dust disintegration, unveil ₹250
  const handlePickStone = useCallback(
    (stoneIndex: number) => {
      if (phaseRef.current !== 'picking' || pickedGuardRef.current) return;
      pickedGuardRef.current = true;

      const chosenStone = INFINITY_STONES[stoneIndex];
      if (!chosenStone) return;

      stopOrbitLoop();
      const canvasMetrics = syncDustCanvasSize();

      // Snapshot exact pixel centers of all 6 stones relative to stage canvas BEFORE glide
      const stoneCenters: { cx: number; cy: number; stoneIndex: number }[] = [];
      if (canvasMetrics) {
        for (let i = 0; i < INFINITY_STONES.length; i++) {
          const wrapEl = stoneWrapRefs.current[i];
          if (!wrapEl) continue;
          const r = wrapEl.getBoundingClientRect();
          stoneCenters.push({
            stoneIndex: i,
            cx: r.left + r.width / 2 - canvasMetrics.rect.left,
            cy: r.top + r.height / 2 - canvasMetrics.rect.top,
          });
        }
      }

      // 0.0s: Glide chosen stone to center & fire colored shockwave
      setPickedStoneId(chosenStone.id);
      setShockwaveColor(chosenStone.bodyStart);
      setVaultPhase('revealing');
      soundEngine.playVaultUnlock();

      // Move chosen stone wrapper smoothly to dead center & scale 1.45
      const chosenWrap = stoneWrapRefs.current[stoneIndex];
      if (chosenWrap) {
        chosenWrap.style.transform = 'translate3d(0px, 0px, 0) scale(1.45)';
      }

      // 0.15s: Thanos-snap dust disintegration on the 5 unselected stones (42 × 5 = 210 particles)
      scheduleTimer(() => {
        setUnselectedFading(true);
        soundEngine.playVaultDustSnap();
        haptics.vaultDustSnap();

        if (canvasMetrics) {
          const spawned: DustParticle[] = [];
          for (const entry of stoneCenters) {
            if (entry.stoneIndex === stoneIndex) continue;
            const otherStone = INFINITY_STONES[entry.stoneIndex];
            spawned.push(
              ...spawnStoneDustParticles({
                cx: entry.cx,
                cy: entry.cy,
                spreadPx: 20,
                count: 42,
                palette: otherStone.dustPalette,
                intensity: 'unselected',
              }),
            );
          }
          dustParticlesRef.current = [...dustParticlesRef.current, ...spawned];
          ensureDustLoop();
        }
      }, 150);

      // 0.65s: Chosen stone flashes, chimes, bursts into 160 glowing dust particles & unveils ₹250 card
      scheduleTimer(() => {
        setVaultPhase('dusting');
        setChosenBursting(true);
        soundEngine.playVaultRewardChime();
        soundEngine.playVaultDustSnap();

        const liveMetrics = syncDustCanvasSize();
        if (liveMetrics) {
          const burstCx = liveMetrics.width / 2;
          const burstCy = liveMetrics.height / 2;
          const chosenBurst = spawnStoneDustParticles({
            cx: burstCx,
            cy: burstCy,
            spreadPx: 28,
            count: 160,
            palette: chosenStone.dustPalette,
            intensity: 'chosen',
          });
          dustParticlesRef.current = [...dustParticlesRef.current, ...chosenBurst];
          ensureDustLoop();
        }

        // Strict rigged outcome: resolveVaultRewardValue always yields ₹250
        const rewardValue = resolveVaultRewardValue(chosenStone.id);
        void rewardValue;
        const generatedCode = generateGiftCardCode();
        const nextRecord: VaultClaimRecord = {
          claimed: true,
          code: generatedCode,
          stoneName: chosenStone.name,
          stoneId: chosenStone.id,
          claimedOn: CLAIMED_DATE_LABEL,
        };
        writeVaultClaim(nextRecord);
        setClaimRecord(nextRecord);
        trackEvent('vault_stone_picked', chosenStone.name, {
          stoneName: chosenStone.name,
          rewardValue: RIGGED_GIFT_DISPLAY,
          generatedCode,
        });

        // Reveal the ₹250 physical gift card smoothly right as the chosen stone bursts
        scheduleTimer(() => {
          setVaultPhase('claimed');
          haptics.vaultRewardReveal();

          // One-time footer screenshot summary card: trigger strictly once on unclaimed -> claimed
          if (consumeOneTimeSummary()) {
            onFirstClaimUnlock?.({
              value: RIGGED_GIFT_DISPLAY,
              code: nextRecord.code,
              stoneId: chosenStone.id,
              stoneName: chosenStone.name,
              stoneColor: chosenStone.bodyStart,
              stoneGlow: chosenStone.glow,
            });
          }

          // Fire existing confetti burst centered on vault
          const rect = stageRef.current?.getBoundingClientRect();
          if (rect) {
            onRevealConfetti?.(rect.left + rect.width / 2, rect.top + rect.height * 0.42);
          } else {
            onRevealConfetti?.();
          }

          // Restore music 1.5s after the ₹250 card finishes revealing (550ms reveal + 1500ms hold)
          scheduleTimer(() => {
            bgMusicPlayer.scheduleVaultRestore();
          }, 550);
        }, 220);
      }, 650);
    },
    [
      ensureDustLoop,
      onFirstClaimUnlock,
      onRevealConfetti,
      scheduleTimer,
      setVaultPhase,
      stopOrbitLoop,
      syncDustCanvasSize,
    ],
  );

  // Copy 12-digit gift code cleanly with clipboard fallback
  const handleCopyCode = useCallback(() => {
    const code = claimRecord?.code;
    if (!code) return;
    trackEvent('vault_code_copied', 'Infinity Vault Copy Code Button');
    soundEngine.playBubbleClick(1.1);

    const markCopied = () => {
      setCopied(true);
      scheduleTimer(() => setCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(code)
        .then(markCopied)
        .catch(() => {
          try {
            const ta = document.createElement('textarea');
            ta.value = code;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            markCopied();
          } catch {
            markCopied();
          }
        });
    } else {
      markCopied();
    }
  }, [claimRecord?.code, scheduleTimer]);

  const handleMainKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key >= '0' && e.key <= '9') {
        soundEngine.playVaultKeypadTap();
        haptics.vaultKeypadTap();
      } else if (e.key === 'Backspace') {
        soundEngine.playVaultKeypadTap();
        haptics.vaultKeypadTap();
      }
    },
    [],
  );

  const activeStone = getStoneById(claimRecord?.stoneId ?? pickedStoneId ?? 'reality');
  const isOrbitStageMounted =
    phase === 'orbiting' ||
    phase === 'stopping' ||
    phase === 'picking' ||
    phase === 'revealing' ||
    phase === 'dusting';

  const showRewardCard = phase === 'claimed' || phase === 'alreadyClaimed';
  const formattedVoucherCode = claimRecord ? claimRecord.code.replace(/\s*-\s*/g, ' · ') : '';

  return (
    <section
      ref={sectionRef}
      id="infinity-vault"
      data-testid="infinity-vault-section"
      data-vault-phase={phase}
      className="relative z-[2] bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Clean Editorial Section Header on Soft Rose-Cream (#FFF6F9) */}
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8F5A6E]">
            The Collector&rsquo;s Vault &nbsp;&middot;&nbsp; Six Infinity Stones
          </p>

          <h2 className="font-display mt-2.5 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
            The Infinity <span className="italic text-[#7A2D4F]">Gift Vault</span>
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-[#7A4A63] sm:text-[15px]">
            Six cosmic stones, one birthday gift voucher sealed inside. Enter the passcode, bring
            the astrolabe to rest, and claim your stone.
          </p>
        </div>

        {/* Bespoke Matte Velvet Espresso-Obsidian & Brushed Champagne-Gold Collector's Case */}
        <div
          className="relative overflow-hidden rounded-[26px] px-5 py-8 text-[#FAF3EA] sm:px-10 sm:py-11"
          style={{
            background: 'linear-gradient(165deg, #161017 0%, #0E0A10 100%)',
            border: '1px solid rgba(232, 200, 146, 0.24)',
            boxShadow:
              'inset 0 1px 0 rgba(255, 240, 212, 0.14), 0 30px 68px -26px rgba(22, 16, 23, 0.56), 0 10px 26px -14px rgba(58, 18, 51, 0.22)',
          }}
        >
          {/* Subtle 3% Fine Film-Grain Noise Texture (Matte Velvet / Anodized Metal Materiality) */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.035]"
          >
            <filter id={`vault-grain-${grainFilterId}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.84"
                numOctaves="3"
                stitchTiles="stitch"
              />
            </filter>
            <rect width="100%" height="100%" filter={`url(#vault-grain-${grainFilterId})`} />
          </svg>

          {/* Reverse-time emerald shimmer overlay on 9876 reset */}
          {emeraldFlashKey > 0 && (
            <div
              key={emeraldFlashKey}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 rounded-[26px] animate-vault-emerald-reset"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(12, 230, 126, 0.38), rgba(0, 117, 58, 0.1) 58%, transparent 78%)',
              }}
            />
          )}

          {/* 1.5s Secret Reset Toast */}
          {resetToastVisible && (
            <div
              role="status"
              data-testid="vault-reset-toast"
              className="pointer-events-none absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#19F08A]/45 bg-[#081F14]/92 px-4 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#C9FFE4] shadow-lg backdrop-blur-md animate-pop-in"
            >
              Vault Reset
            </div>
          )}

          {/* Interactive Vault Stage (Luxury Lock Dial OR Celestial Astrolabe OR Physical Foil Voucher) */}
          <div
            ref={stageRef}
            className="relative z-10 mx-auto flex min-h-[430px] w-full max-w-[480px] flex-col items-center justify-center sm:min-h-[452px]"
          >
            {/* Transparent 2D Canvas layered strictly over the vault stage for Thanos-snap dust */}
            <canvas
              ref={dustCanvasRef}
              data-testid="vault-dust-canvas"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 h-full w-full"
            />

            {/* =========================================================================
                1. LOCKED PASSCODE SCREEN — Luxury Vault Dial (Zero Rainbow Blobs)
                ========================================================================= */}
            {phase === 'locked' && (
              <div
                data-testid="vault-lock-overlay"
                className="relative z-20 flex w-full flex-col items-center justify-center py-2"
              >
                {/* Delicate Engraved Champagne-Gold Concentric Celestial Ring Backdrop (opacity 0.14) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 420 420"
                  fill="none"
                  className="pointer-events-none absolute top-1/2 left-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 opacity-[0.14] sm:h-[420px] sm:w-[420px]"
                >
                  <circle cx="210" cy="210" r="196" stroke="#E6C690" strokeWidth="0.75" />
                  <circle
                    cx="210"
                    cy="210"
                    r="168"
                    stroke="#E6C690"
                    strokeWidth="0.6"
                    strokeDasharray="2 7"
                  />
                  <circle cx="210" cy="210" r="134" stroke="#E6C690" strokeWidth="0.5" strokeOpacity="0.65" />
                  {/* Subtle compass ticks */}
                  {Array.from({ length: 24 }).map((_, i) => {
                    const deg = i * 15;
                    const isMajor = i % 6 === 0;
                    return (
                      <line
                        key={deg}
                        x1="210"
                        y1={isMajor ? 10 : 14}
                        x2="210"
                        y2={isMajor ? 22 : 19}
                        stroke="#E6C690"
                        strokeWidth={isMajor ? '1' : '0.6'}
                        transform={`rotate(${deg} 210 210)`}
                      />
                    );
                  })}
                </svg>

                {/* Minimal Top Header */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D7B57E] sm:text-[11px]">
                    The Infinity Vault
                  </p>

                  {/* Whisper-thin horizontal prize tiers line — visible ONLY while locked */}
                  <div
                    data-testid="vault-prize-strip"
                    className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium tabular-nums tracking-[0.06em] text-[#FAF3EA]/72 sm:text-xs"
                  >
                    {PRIZE_POOL_TIERS.map((tier, idx) => (
                      <span key={tier} className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span>{tier}</span>
                        {idx < PRIZE_POOL_TIERS.length - 1 && (
                          <span aria-hidden="true" className="text-[#D7B57E]/45">
                            &middot;
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Minimalist Champagne-Gold Lock + Crisp Warm Ivory Prompt */}
                  <div className="mt-6 flex items-center gap-2 text-[#FAF3EA]">
                    <Lock className="h-3.5 w-3.5 text-[#E6C690]" strokeWidth={1.75} aria-hidden="true" />
                    <span className="text-[13px] font-normal tracking-[0.03em] text-[#FAF3EA]/92">
                      Enter 4 digit passcode
                    </span>
                  </div>
                </div>

                {/* Minimalist Circular Champagne-Gold PIN Display + Accessible Keyboard Input */}
                <div className="relative z-10 mt-5 mb-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoComplete="one-time-code"
                    aria-label="Vault 4-digit passcode"
                    data-testid="vault-passcode-input"
                    value={codeDigits}
                    onKeyDown={handleMainKeyDown}
                    onChange={(e) => handleMainDigitInput(e.target.value)}
                    className="absolute -inset-2 z-10 cursor-pointer opacity-0"
                  />
                  <div
                    key={shakeCount}
                    className={`flex items-center justify-center gap-4 ${
                      shakeCount > 0 && codeError ? 'animate-vault-shake' : ''
                    }`}
                  >
                    {[0, 1, 2, 3].map((slot) => {
                      const filled = Boolean(codeDigits[slot]);
                      const isActive = codeDigits.length === slot;
                      return (
                        <div
                          key={slot}
                          data-testid={`vault-digit-${slot}`}
                          className={`h-4 w-4 rounded-full border transition-all duration-150 ${
                            codeError
                              ? 'border-[#E88B98] bg-[#E88B98]/25 shadow-[0_0_12px_rgba(232,139,152,0.45)]'
                              : filled
                                ? 'scale-110 border-[#FAF3EA] bg-gradient-to-br from-[#FAF3EA] to-[#D7B57E] shadow-[0_0_14px_rgba(230,198,144,0.55)]'
                                : isActive
                                  ? 'border-[#E6C690]/85 bg-transparent'
                                  : 'border-[#E6C690]/32 bg-transparent'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Error Feedback */}
                <div className="relative z-10 mb-4 min-h-[18px] text-center">
                  {codeError && (
                    <p
                      role="alert"
                      data-testid="vault-passcode-error"
                      className="text-xs font-medium tracking-[0.02em] text-[#E8B4BE]"
                    >
                      {codeError}
                    </p>
                  )}
                </div>

                {/* Sleek Circular Tactile Keypad (iPhone / Luxury Safe Style — 58px × 58px) */}
                <div className="relative z-10 grid grid-cols-3 place-items-center gap-x-5 gap-y-3.5">
                  {KEYPAD_KEYS.map((key) => {
                    const isUtility = key === 'CLEAR' || key === 'BACK';
                    return (
                      <button
                        key={key}
                        type="button"
                        data-testid={`vault-key-${key.toLowerCase()}`}
                        onClick={() => handleMainKeyTap(key)}
                        className={
                          isUtility
                            ? 'flex h-[58px] w-[58px] items-center justify-center rounded-full text-xs font-medium tracking-[0.08em] text-[#D7B57E]/80 transition-all duration-150 hover:text-[#FAF3EA] active:scale-[0.94] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690]'
                            : 'flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[rgba(232,200,146,0.18)] bg-[rgba(255,246,238,0.04)] text-[22px] font-light tabular-nums text-[#FAF3EA] transition-all duration-150 hover:border-[rgba(232,200,146,0.36)] hover:bg-[rgba(232,200,146,0.1)] active:scale-[0.94] active:bg-[rgba(232,200,146,0.16)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690]'
                        }
                        aria-label={
                          key === 'BACK'
                            ? 'Backspace'
                            : key === 'CLEAR'
                              ? 'Clear passcode'
                              : `Digit ${key}`
                        }
                      >
                        {key === 'BACK' ? (
                          <Delete className="h-[19px] w-[19px]" strokeWidth={1.6} aria-hidden="true" />
                        ) : key === 'CLEAR' ? (
                          'Clear'
                        ) : (
                          key
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================================
                2. ORBITING CELESTIAL ASTROLABE STAGE (Unlocked — Prize Strip Hidden)
                ========================================================================= */}
            {isOrbitStageMounted && (
              <div className="relative flex h-[350px] w-full items-center justify-center sm:h-[380px]">
                {/* Engraved Antique-Gold Celestial Astrolabe Ring SVG */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 320 320"
                  fill="none"
                  className={`pointer-events-none absolute transition-opacity duration-500 ${
                    phase === 'revealing' || phase === 'dusting' ? 'opacity-15' : 'opacity-90'
                  }`}
                  style={{
                    width: 'min(78vw, 310px)',
                    height: 'min(78vw, 310px)',
                  }}
                >
                  {/* Outer ultra-thin engraved orbital ring (1px) */}
                  <circle
                    cx="160"
                    cy="160"
                    r="132"
                    stroke="#E6C690"
                    strokeOpacity="0.34"
                    strokeWidth="1"
                  />
                  {/* Secondary inner celestial hairline ring (0.75px) */}
                  <circle
                    cx="160"
                    cy="160"
                    r="102"
                    stroke="#D7B57E"
                    strokeOpacity="0.22"
                    strokeWidth="0.75"
                  />
                  {/* Subtle precision degree tick marks around the astrolabe */}
                  {Array.from({ length: 36 }).map((_, i) => {
                    const deg = i * 10;
                    const isCardinal = i % 9 === 0;
                    const isMid = i % 3 === 0;
                    return (
                      <line
                        key={deg}
                        x1="160"
                        y1={isCardinal ? 21 : isMid ? 24 : 26}
                        x2="160"
                        y2="29"
                        stroke="#E6C690"
                        strokeOpacity={isCardinal ? '0.62' : isMid ? '0.36' : '0.18'}
                        strokeWidth={isCardinal ? '1' : '0.65'}
                        transform={`rotate(${deg} 160 160)`}
                      />
                    );
                  })}
                  {/* Sparse pinprick starlight dust motes */}
                  <circle cx="56" cy="78" r="1" fill="#FAF3EA" opacity="0.45" className="animate-vault-spark" />
                  <circle
                    cx="266"
                    cy="92"
                    r="0.9"
                    fill="#E6C690"
                    opacity="0.5"
                    className="animate-vault-spark"
                    style={{ animationDelay: '0.9s' }}
                  />
                  <circle
                    cx="248"
                    cy="250"
                    r="1.1"
                    fill="#FAF3EA"
                    opacity="0.4"
                    className="animate-vault-spark"
                    style={{ animationDelay: '1.5s' }}
                  />
                  <circle
                    cx="72"
                    cy="240"
                    r="0.85"
                    fill="#E6C690"
                    opacity="0.45"
                    className="animate-vault-spark"
                    style={{ animationDelay: '0.4s' }}
                  />
                </svg>

                {/* Expanding circular shockwave flash in chosen stone's color */}
                {shockwaveColor && (phase === 'revealing' || phase === 'dusting') && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute h-24 w-24 rounded-full border-2 animate-vault-shockwave"
                    style={{
                      borderColor: shockwaveColor,
                      boxShadow: `0 0 28px ${shockwaveColor}`,
                    }}
                  />
                )}

                {/* All 6 Movie-Grade 6-Layer Infinity Stones positioned via direct DOM refs */}
                {INFINITY_STONES.map((stone, idx) => {
                  const isChosen = pickedStoneId === stone.id;
                  const isOther = pickedStoneId !== null && !isChosen;
                  const isInteractive = phase === 'picking';

                  return (
                    <div
                      key={stone.id}
                      ref={(node) => {
                        stoneWrapRefs.current[idx] = node;
                      }}
                      data-testid={`vault-stone-wrap-${stone.id}`}
                      className={`absolute left-1/2 top-1/2 -ml-[30px] -mt-[30px] flex h-[60px] w-[60px] items-center justify-center will-change-transform ${
                        phase === 'revealing' || phase === 'dusting'
                          ? isChosen
                            ? 'z-20 transition-[transform,opacity] duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                            : 'z-10 transition-opacity duration-[350ms] ease-out'
                          : 'z-10'
                      } ${
                        isOther && unselectedFading
                          ? 'opacity-0 pointer-events-none'
                          : isChosen && chosenBursting
                            ? 'opacity-0 scale-150 pointer-events-none'
                            : 'opacity-100'
                      }`}
                    >
                      <button
                        type="button"
                        data-testid={`vault-stone-${stone.id}`}
                        disabled={!isInteractive}
                        onClick={() => handlePickStone(idx)}
                        aria-label={`Pick the ${stone.name}`}
                        className={`group relative flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C690] ${
                          isInteractive
                            ? 'cursor-pointer transition-transform duration-200 hover:scale-112 active:scale-95'
                            : 'cursor-default'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center ${
                            isInteractive ? 'animate-float-gentle' : ''
                          }`}
                          style={
                            isInteractive ? { animationDelay: `${(idx * 0.42).toFixed(2)}s` } : undefined
                          }
                        >
                          <InfinityStoneSvg stone={stone} size={58} />
                        </span>
                        {isInteractive && (
                          <span className="pointer-events-none absolute -bottom-5 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#FAF3EA]/90 drop-shadow-[0_1px_4px_rgba(14,10,16,0.95)]">
                            {stone.name.replace(' Stone', '')}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* Center Stage Controls — Brushed Champagne-Gold & Deep Obsidian Medallion */}
                {phase === 'orbiting' && (
                  <button
                    type="button"
                    data-testid="vault-stop-btn"
                    onClick={handleStopRing}
                    className="group relative z-20 inline-flex items-center justify-center rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FAF3EA] transition-transform duration-150 hover:scale-[1.03] active:scale-[0.96] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#E6C690]"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 0%, rgba(230, 198, 144, 0.2), rgba(20, 13, 21, 0.94) 72%)',
                      border: '1px solid rgba(232, 200, 146, 0.5)',
                      boxShadow:
                        'inset 0 1px 0 rgba(255, 245, 224, 0.24), 0 14px 30px -12px rgba(0, 0, 0, 0.72)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 rounded-full border border-[#E6C690]/25 animate-vault-medallion-aura"
                    />
                    <span className="relative z-10 whitespace-nowrap">Stop the Ring</span>
                  </button>
                )}

                {phase === 'stopping' && (
                  <div
                    data-testid="vault-stopping-label"
                    className="relative z-20 max-w-[168px] text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#D7B57E]/90"
                  >
                    Slowing the ring&hellip;
                  </div>
                )}

                {phase === 'picking' && (
                  <div
                    data-testid="vault-pick-prompt"
                    className="relative z-20 max-w-[164px] px-2 text-center animate-pop-in"
                  >
                    <p className="font-display text-sm italic leading-snug text-[#FAF3EA]">
                      Tap any stone
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#D7B57E]/80">
                      to unveil your gift
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                3. BESPOKE PHYSICAL FOIL VOUCHER (Fresh Claim & Already Claimed Views)
                ========================================================================= */}
            {showRewardCard && claimRecord && (
              <div
                data-testid={
                  phase === 'alreadyClaimed' ? 'vault-already-claimed-view' : 'vault-claimed-view'
                }
                className="relative z-20 flex w-full max-w-[400px] flex-col items-center animate-vault-card-reveal"
              >
                {phase === 'alreadyClaimed' && (
                  <div className="mb-5 text-center">
                    <p
                      data-testid="vault-already-claimed-badge"
                      className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#D7B57E]"
                    >
                      Already Claimed &nbsp;&middot;&nbsp; {claimRecord.claimedOn.toUpperCase()}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#FAF3EA]/72 sm:text-[13px]">
                      You already claimed your Infinity Stone voucher. No second tries allowed.
                    </p>
                  </div>
                )}

                {/* Matte Deep Burgundy-Obsidian Physical Birthday Foil Voucher */}
                <div
                  className="relative w-full overflow-hidden rounded-[20px] text-left"
                  style={{
                    background:
                      'linear-gradient(145deg, #24101B 0%, #140910 60%, #1F0D18 100%)',
                    border: '1px solid rgba(232, 200, 146, 0.34)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255, 242, 218, 0.14), 0 24px 52px -20px rgba(0, 0, 0, 0.78)',
                  }}
                >
                  {/* Subtle fine paper-grain noise texture */}
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.032]"
                  >
                    <rect
                      width="100%"
                      height="100%"
                      filter={`url(#vault-grain-${grainFilterId})`}
                    />
                  </svg>

                  {/* Slow restrained diagonal champagne-gold foil sheen every 5s */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#F7E2B8]/30 to-transparent animate-vault-foil"
                  />

                  {/* Tiny classic corner hairline accents (no double-nested rounded borders) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3 left-3 h-2.5 w-2.5 border-t border-l border-[#E6C690]/40"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3 right-3 h-2.5 w-2.5 border-t border-r border-[#E6C690]/40"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-3 left-3 h-2.5 w-2.5 border-b border-l border-[#E6C690]/40"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 bottom-3 h-2.5 w-2.5 border-r border-b border-[#E6C690]/40"
                  />

                  {/* Top Section: Floating Movie-Grade Chosen Stone + Minimal Date Mark */}
                  <div className="relative z-10 px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <InfinityStoneSvg
                          stone={activeStone}
                          size={44}
                          showSparks={false}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FAF3EA]">
                            {claimRecord.stoneName}
                          </p>
                          <p className="mt-0.5 text-[11px] font-normal tracking-[0.04em] text-[#D7B57E]/78">
                            Infinity Vault Edition
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-[10.5px] font-medium tabular-nums tracking-[0.2em] text-[#D7B57E]/85">
                        03 &middot; 12 &middot; 26
                      </span>
                    </div>

                    {/* Hero Value Centerpiece */}
                    <div className="mt-6 mb-2 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#D7B57E]">
                        Gift Voucher
                      </p>
                      <p
                        data-testid="vault-reward-amount"
                        className="font-display mt-1 bg-clip-text text-6xl leading-none font-semibold italic tracking-tight text-transparent sm:text-[4.25rem]"
                        style={{
                          backgroundImage:
                            'linear-gradient(180deg, #FFF7E4 0%, #E7C382 52%, #B98C47 100%)',
                          filter: 'drop-shadow(0 4px 14px rgba(185, 140, 71, 0.24))',
                        }}
                      >
                        {RIGGED_GIFT_DISPLAY}
                      </p>
                    </div>
                  </div>

                  {/* Perforated Gold Divider with Left/Right Semi-Circular Ticket Notches */}
                  <div className="relative z-10 flex items-center">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-3 h-6 w-6 rounded-full border border-[rgba(232,200,146,0.34)] bg-[#110C13]"
                    />
                    <div className="mx-5 w-full border-t border-dashed border-[#E6C690]/32" />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-3 h-6 w-6 rounded-full border border-[rgba(232,200,146,0.34)] bg-[#110C13]"
                    />
                  </div>

                  {/* Bottom Ticket Stub — Airy & Unboxed (Zero Nested Inner Rectangle) */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-6 sm:px-7">
                    <div className="min-w-0">
                      <span className="block text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#D7B57E]/80">
                        Activation Code
                      </span>
                      <span
                        data-testid="vault-gift-code"
                        className="mt-1 block whitespace-nowrap font-mono text-[15px] font-medium tabular-nums tracking-[0.14em] text-[#FAF3EA] sm:text-base"
                      >
                        {formattedVoucherCode}
                      </span>
                    </div>

                    <button
                      type="button"
                      data-testid="vault-copy-btn"
                      onClick={handleCopyCode}
                      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690] ${
                        copied
                          ? 'border-[#E6C690] bg-[#E6C690]/18 text-[#FFF7E4]'
                          : 'border-[#E6C690]/55 bg-transparent text-[#E6C690] hover:border-[#E6C690] hover:bg-[#E6C690]/12 hover:text-[#FAF3EA]'
                      }`}
                    >
                      {copied ? 'Copied ✓' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                {/* Clean Editorial Activation Note (Outside Voucher — No Clunky Highlight Box) */}
                <p
                  data-testid="vault-activation-note"
                  className="mt-5 max-w-[340px] text-center text-xs leading-relaxed text-[#FAF3EA]/78 sm:text-[13px]"
                >
                  Send this code to{' '}
                  <span className="font-semibold tracking-[0.02em] text-[#E6C690]">adinomide</span>{' '}
                  to activate your {RIGGED_GIFT_DISPLAY} gift card.
                </p>

                {/* Subtle champagne-gold jump button strictly on first-time unlock */}
                {phase === 'claimed' && showFooterSummaryJump && (
                  <button
                    type="button"
                    data-testid="vault-jump-summary-btn"
                    onClick={() => {
                      soundEngine.playBubbleClick(1.04);
                      haptics.summaryCopyTap();
                      document
                        .getElementById('birthday-summary-card')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E6C690]/40 bg-[#E6C690]/[0.08] px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#E6C690] transition-all duration-150 hover:border-[#E6C690]/70 hover:bg-[#E6C690]/16 hover:text-[#FAF3EA] active:scale-95 cursor-pointer"
                  >
                    <span>View Screenshot Card in Footer &darr;</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Discreet Corner 🔑 Reset Button on Claimed / Already Claimed Views (subtle opacity 0.3) */}
          {showRewardCard && (
            <button
              type="button"
              data-testid="vault-reset-key-btn"
              onClick={() => {
                soundEngine.playBubbleClick(1.0);
                setModalDigits('');
                setModalError(null);
                setResetModalOpen(true);
              }}
              aria-label="Open vault passcode key"
              title="Vault key"
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#E6C690]/25 bg-transparent text-[#E6C690] opacity-30 transition-all duration-200 hover:border-[#E6C690]/60 hover:opacity-90 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Portaled Minimal Luxury 4-Digit Reset Modal (z-[9500] so TopBar never intercepts clicks) */}
      {resetModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vault key passcode"
            data-testid="vault-reset-modal"
            className="fixed inset-0 z-[9500] flex items-center justify-center bg-[#09060B]/82 p-4 backdrop-blur-sm"
            onClick={() => setResetModalOpen(false)}
          >
            <div
              className="relative w-full max-w-[312px] rounded-[24px] p-6 text-center text-[#FAF3EA] shadow-2xl animate-pop-in"
              style={{
                background: 'linear-gradient(165deg, #18111A 0%, #0E0A10 100%)',
                border: '1px solid rgba(232, 200, 146, 0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255, 240, 212, 0.14), 0 28px 60px rgba(0, 0, 0, 0.72)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                data-testid="vault-reset-modal-close"
                aria-label="Close vault key modal"
                onClick={() => setResetModalOpen(false)}
                className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full text-[#D7B57E]/75 transition-colors hover:bg-white/[0.06] hover:text-[#FAF3EA] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <KeyRound
                className="mx-auto mb-2.5 h-4 w-4 text-[#E6C690]"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <h3 className="font-display text-xl font-semibold text-[#FAF3EA]">Vault Key</h3>
              <p className="mt-1 mb-5 text-xs text-[#D7B57E]/80">Enter 4 digit passcode</p>

              {/* 4 Circular Champagne-Gold PIN Dots + Keyboard Input */}
              <div className="relative mb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  aria-label="Modal 4-digit passcode"
                  data-testid="vault-modal-passcode-input"
                  value={modalDigits}
                  onKeyDown={handleMainKeyDown}
                  onChange={(e) => handleModalDigitInput(e.target.value)}
                  className="absolute -inset-2 z-10 cursor-pointer opacity-0"
                />
                <div
                  key={modalShakeCount}
                  className={`flex items-center justify-center gap-3.5 ${
                    modalShakeCount > 0 && modalError ? 'animate-vault-shake' : ''
                  }`}
                >
                  {[0, 1, 2, 3].map((slot) => {
                    const filled = Boolean(modalDigits[slot]);
                    return (
                      <div
                        key={slot}
                        className={`h-3.5 w-3.5 rounded-full border transition-all duration-150 ${
                          modalError
                            ? 'border-[#E88B98] bg-[#E88B98]/25'
                            : filled
                              ? 'scale-110 border-[#FAF3EA] bg-gradient-to-br from-[#FAF3EA] to-[#D7B57E] shadow-[0_0_10px_rgba(230,198,144,0.5)]'
                              : 'border-[#E6C690]/35 bg-transparent'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mb-3.5 min-h-[16px]">
                {modalError && (
                  <p data-testid="vault-modal-error" className="text-xs font-medium text-[#E8B4BE]">
                    {modalError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 place-items-center gap-x-3 gap-y-3">
                {KEYPAD_KEYS.map((key) => {
                  const isUtility = key === 'CLEAR' || key === 'BACK';
                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid={`vault-modal-key-${key.toLowerCase()}`}
                      onClick={() => handleModalKeyTap(key)}
                      className={
                        isUtility
                          ? 'flex h-[50px] w-[50px] items-center justify-center rounded-full text-[11px] font-medium tracking-[0.06em] text-[#D7B57E]/80 transition-all hover:text-[#FAF3EA] active:scale-[0.94] cursor-pointer'
                          : 'flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[rgba(232,200,146,0.18)] bg-[rgba(255,246,238,0.04)] text-lg font-light tabular-nums text-[#FAF3EA] transition-all hover:border-[rgba(232,200,146,0.36)] hover:bg-[rgba(232,200,146,0.1)] active:scale-[0.94] active:bg-[rgba(232,200,146,0.16)] cursor-pointer'
                      }
                    >
                      {key === 'BACK' ? (
                        <Delete className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                      ) : key === 'CLEAR' ? (
                        'Clear'
                      ) : (
                        key
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

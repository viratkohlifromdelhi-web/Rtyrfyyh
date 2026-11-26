import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Delete, KeyRound, Lock, Sparkles, X } from 'lucide-react';
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

        // Reveal the ₹250 physical gift card smoothly right as the chosen stone bursts
        scheduleTimer(() => {
          setVaultPhase('claimed');
          haptics.vaultRewardReveal();

          // One-time footer screenshot summary card: trigger strictly once on unclaimed -> claimed
          if (consumeOneTimeSummary()) {
            onFirstClaimUnlock?.({
              value: RIGGED_GIFT_DISPLAY,
              code: nextRecord.code,
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
    phase === 'locked' ||
    phase === 'orbiting' ||
    phase === 'stopping' ||
    phase === 'picking' ||
    phase === 'revealing' ||
    phase === 'dusting';

  const showRewardCard = phase === 'claimed' || phase === 'alreadyClaimed';

  return (
    <section
      ref={sectionRef}
      id="infinity-vault"
      data-testid="infinity-vault-section"
      data-vault-phase={phase}
      className="relative z-10 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header harmonized with Rose-Cream / Deep Plum / Rose Berry palette */}
        <div className="mb-8 text-center sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#F5C2D7] bg-[#FCE7F0] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#D94B7D] shadow-xs">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Secret Vault &bull; 6 Infinity Stones</span>
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight text-[#3A1233] sm:text-4xl">
            The Infinity Gift Vault
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-[#7A4A63] sm:text-base">
            Six Avengers Infinity Stones, one mystery birthday gift card locked inside. Unlock the
            vault, stop the cosmic ring, and pick your stone.
          </p>
        </div>

        {/* Deep Cosmic-Plum Glass Vault Card */}
        <div
          className="relative overflow-hidden rounded-[28px] border border-[#E8A3BE]/35 bg-gradient-to-b from-[#1B0920] via-[#230B2B] to-[#2B0E34] px-4 py-6 text-[#FFF6F9] shadow-[0_24px_60px_-20px_rgba(43,14,52,0.55)] sm:px-8 sm:py-8"
        >
          {/* Subtle cosmic starlight dots & soft ambient violet/rose glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 18%, rgba(217, 75, 125, 0.22), transparent 44%), radial-gradient(circle at 82% 80%, rgba(169, 51, 255, 0.22), transparent 46%)',
            }}
          />

          {/* Reverse-time emerald shimmer overlay on 9876 reset */}
          {emeraldFlashKey > 0 && (
            <div
              key={emeraldFlashKey}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 rounded-[28px] animate-vault-emerald-reset"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(0, 222, 115, 0.45), rgba(0, 122, 61, 0.12) 60%, transparent 80%)',
              }}
            />
          )}

          {/* 1.5s Secret Reset Toast */}
          {resetToastVisible && (
            <div
              role="status"
              data-testid="vault-reset-toast"
              className="pointer-events-none absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#4DF5A3]/55 bg-[#092C1D]/92 px-4 py-1.5 text-xs font-bold tracking-wide text-[#B7FFDB] shadow-lg backdrop-blur-md animate-pop-in"
            >
              Vault reset ✨
            </div>
          )}

          {/* Top Prize Pool Strip — uniform styling across all 6 tiers (zero hint of rigging) */}
          <div className="relative z-10 mb-5 flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F2B7CE]/80">
              Vault Prize Pool
            </span>
            <div
              data-testid="vault-prize-strip"
              className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-full border border-[#F5C2D7]/22 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold tracking-tight text-[#FFE9F2] backdrop-blur-sm sm:gap-x-3 sm:px-4 sm:text-sm sm:tracking-wide"
            >
              {PRIZE_POOL_TIERS.map((tier, idx) => (
                <span key={tier} className="inline-flex items-center gap-1.5 whitespace-nowrap sm:gap-3">
                  <span>{tier}</span>
                  {idx < PRIZE_POOL_TIERS.length - 1 && (
                    <span aria-hidden="true" className="text-[#D94B7D]/80">
                      &bull;
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Vault Stage (Orbital Arena + 2D Dust Canvas + Lock Overlay OR Gift Card) */}
          <div
            ref={stageRef}
            className="relative z-10 mx-auto flex min-h-[404px] w-full max-w-[460px] flex-col items-center justify-center sm:min-h-[420px]"
          >
            {/* Transparent 2D Canvas layered strictly over the vault stage for Thanos-snap dust */}
            <canvas
              ref={dustCanvasRef}
              data-testid="vault-dust-canvas"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 h-full w-full"
            />

            {/* Orbital Stage + 6 Faceted Avengers Infinity Stones */}
            {isOrbitStageMounted && (
              <div
                className={`relative flex h-[310px] w-full items-center justify-center sm:h-[340px] ${
                  phase === 'locked' ? 'pointer-events-none select-none' : ''
                }`}
              >
                {/* Glowing dashed rose-gold & cosmic-violet orbital track */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute rounded-full border-2 border-dashed transition-opacity duration-500 ${
                    phase === 'revealing' || phase === 'dusting'
                      ? 'border-[#F2B7CE]/10 opacity-20'
                      : 'border-[#E8A3BE]/40 opacity-95'
                  }`}
                  style={{
                    width: 'min(68vw, 256px)',
                    height: 'min(68vw, 256px)',
                    boxShadow:
                      '0 0 36px rgba(169, 51, 255, 0.22), inset 0 0 28px rgba(217, 75, 125, 0.16)',
                  }}
                />

                {/* Secondary subtle inner cosmic ring */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute rounded-full border border-[#C984FF]/20 transition-opacity duration-500 ${
                    phase === 'revealing' || phase === 'dusting' ? 'opacity-10' : 'opacity-70'
                  }`}
                  style={{
                    width: 'min(52vw, 196px)',
                    height: 'min(52vw, 196px)',
                  }}
                />

                {/* Expanding circular shockwave flash in chosen stone's color */}
                {shockwaveColor && (phase === 'revealing' || phase === 'dusting') && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute h-24 w-24 rounded-full border-4 animate-vault-shockwave"
                    style={{
                      borderColor: shockwaveColor,
                      boxShadow: `0 0 32px ${shockwaveColor}`,
                    }}
                  />
                )}

                {/* All 6 Bespoke Layered SVG Infinity Stones positioned via direct DOM refs */}
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
                      className={`absolute left-1/2 top-1/2 -ml-7 -mt-7 flex h-14 w-14 items-center justify-center will-change-transform ${
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
                        className={`group relative flex h-14 w-14 flex-col items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE4F0] ${
                          isInteractive
                            ? 'cursor-pointer transition-transform duration-200 hover:scale-115 active:scale-95'
                            : 'cursor-default'
                        }`}
                        style={{
                          filter: `drop-shadow(0 0 12px ${stone.glow})`,
                        }}
                      >
                        <span
                          className={`inline-flex items-center justify-center ${
                            isInteractive ? 'animate-float-gentle' : ''
                          }`}
                          style={
                            isInteractive ? { animationDelay: `${(idx * 0.42).toFixed(2)}s` } : undefined
                          }
                        >
                          <InfinityStoneSvg stone={stone} size={52} />
                        </span>
                        {isInteractive && (
                          <span className="pointer-events-none absolute -bottom-4.5 whitespace-nowrap rounded-full bg-[#1B0920]/85 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#FFE9F2] opacity-90 shadow-sm">
                            {stone.name.replace(' Stone', '')}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* Center Stage Controls / Status Prompts */}
                {phase === 'orbiting' && (
                  <button
                    type="button"
                    data-testid="vault-stop-btn"
                    onClick={handleStopRing}
                    className="relative z-20 inline-flex items-center justify-center rounded-full border border-[#FFD1E3]/70 bg-gradient-to-r from-[#D94B7D] via-[#B83B8A] to-[#8C31B8] px-5 py-2.5 text-sm font-extrabold tracking-wide text-white shadow-[0_0_28px_rgba(217,75,125,0.65)] transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>Stop the Ring ⚡</span>
                  </button>
                )}

                {phase === 'stopping' && (
                  <div
                    data-testid="vault-stopping-label"
                    className="relative z-20 max-w-[165px] rounded-2xl border border-white/15 bg-[#1B0920]/75 px-3.5 py-2 text-center text-xs font-bold tracking-wide text-[#FFE4F0] backdrop-blur-sm"
                  >
                    Slowing the ring...
                  </div>
                )}

                {phase === 'picking' && (
                  <div
                    data-testid="vault-pick-prompt"
                    className="relative z-20 max-w-[170px] rounded-2xl border border-[#F5C2D7]/35 bg-[#1B0920]/80 px-3.5 py-2.5 text-center text-xs font-extrabold leading-snug text-[#FFF6F9] shadow-md backdrop-blur-sm animate-pop-in"
                  >
                    Tap any 1 stone to reveal your gift card ✨
                  </div>
                )}
              </div>
            )}

            {/* Frosted Glass Passcode Gate Overlay (Default Locked State) */}
            {phase === 'locked' && (
              <div
                data-testid="vault-lock-overlay"
                className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border border-[#F5C2D7]/20 bg-[#1B0920]/68 px-4 py-5 backdrop-blur-md"
              >
                <div className="mb-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F5C2D7]/35 bg-[#D94B7D]/25 text-[#FFD7E7] shadow-[0_0_20px_rgba(217,75,125,0.35)]">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>

                <p className="mb-3.5 max-w-[270px] text-center text-xs font-semibold leading-relaxed text-[#FFE9F2] sm:text-sm">
                  Enter the 4-digit passcode to unlock the Infinity Stones.
                </p>

                {/* 4 Glowing Digit Boxes + Hidden/Accessible Numeric Input for Keyboard Typing */}
                <div className="relative mb-2">
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
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    key={shakeCount}
                    className={`flex items-center justify-center gap-2.5 ${
                      shakeCount > 0 && codeError ? 'animate-vault-shake' : ''
                    }`}
                  >
                    {[0, 1, 2, 3].map((slot) => {
                      const char = codeDigits[slot] ?? '';
                      const isActive = codeDigits.length === slot;
                      return (
                        <div
                          key={slot}
                          data-testid={`vault-digit-${slot}`}
                          className={`flex h-12 w-11 items-center justify-center rounded-xl border text-lg font-extrabold tracking-widest transition-all duration-150 ${
                            codeError
                              ? 'border-[#FF5C77] bg-[#FF5C77]/15 text-[#FFD7DE] shadow-[0_0_16px_rgba(255,92,119,0.4)]'
                              : char
                                ? 'border-[#F5A8C7] bg-[#D94B7D]/25 text-white shadow-[0_0_18px_rgba(217,75,125,0.45)]'
                                : isActive
                                  ? 'border-[#E8A3BE]/80 bg-white/10 text-white shadow-[0_0_14px_rgba(232,163,190,0.3)]'
                                  : 'border-white/20 bg-white/[0.06] text-white/60'
                          }`}
                        >
                          {char ? '•' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error Feedback */}
                <div className="mb-2.5 min-h-[18px] text-center">
                  {codeError && (
                    <p
                      role="alert"
                      data-testid="vault-passcode-error"
                      className="text-xs font-bold text-[#FF8CA0]"
                    >
                      {codeError}
                    </p>
                  )}
                </div>

                {/* Mobile-Friendly Tactile 3×4 Numeric Keypad */}
                <div className="grid w-full max-w-[236px] grid-cols-3 gap-2">
                  {KEYPAD_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`vault-key-${key.toLowerCase()}`}
                      onClick={() => handleMainKeyTap(key)}
                      className={`flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-all duration-100 active:scale-92 cursor-pointer ${
                        key === 'CLEAR' || key === 'BACK'
                          ? 'border-white/15 bg-white/[0.06] text-[11px] font-semibold text-[#F2C6D8] hover:bg-white/[0.12]'
                          : 'border-[#F5C2D7]/22 bg-white/[0.09] text-white hover:border-[#F5C2D7]/45 hover:bg-[#D94B7D]/25'
                      }`}
                      aria-label={
                        key === 'BACK'
                          ? 'Backspace'
                          : key === 'CLEAR'
                            ? 'Clear passcode'
                            : `Digit ${key}`
                      }
                    >
                      {key === 'BACK' ? (
                        <Delete className="h-4 w-4" aria-hidden="true" />
                      ) : key === 'CLEAR' ? (
                        'Clear'
                      ) : (
                        key
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Physical-Style ₹250 Gift Card (Fresh Claim & Already Claimed Views) */}
            {showRewardCard && claimRecord && (
              <div
                data-testid={
                  phase === 'alreadyClaimed' ? 'vault-already-claimed-view' : 'vault-claimed-view'
                }
                className="relative z-20 flex w-full max-w-[390px] flex-col items-center animate-vault-card-reveal"
              >
                {phase === 'alreadyClaimed' && (
                  <div className="mb-4 text-center">
                    <div
                      data-testid="vault-already-claimed-badge"
                      className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#4DF5A3]/45 bg-[#0C3B26]/80 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#A8FFD3]"
                    >
                      <span>✅ ALREADY CLAIMED &bull; {claimRecord.claimedOn.toUpperCase()}</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-[#F4D2E1] sm:text-sm">
                      You already claimed your Infinity Stone gift card! No second tries allowed.
                    </p>
                  </div>
                )}

                {/* Metallic Rose-Gold Foil Deep Plum & Rose Berry Gift Card */}
                <div
                  className="relative w-full overflow-hidden rounded-[22px] border border-[#F5C7A9]/60 p-5 text-left shadow-[0_22px_48px_-14px_rgba(217,75,125,0.55)] sm:p-6"
                  style={{
                    background:
                      'linear-gradient(135deg, #3A1233 0%, #6D1D4C 45%, #B83A6E 82%, #D94B7D 100%)',
                  }}
                >
                  {/* Animated metallic rose-gold foil sheen sweep */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FFE7D6]/35 to-transparent animate-vault-foil"
                  />

                  {/* Subtle inner rose-gold hairline frame */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-2 rounded-[16px] border border-[#F6CFAF]/30"
                  />

                  {/* Top Row: Picked Infinity Stone Icon + INFINITY VAULT REWARD */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-[#1B0920]/55"
                        style={{ boxShadow: `0 0 14px ${activeStone.glow}` }}
                      >
                        <InfinityStoneSvg stone={activeStone} size={28} showSparks={false} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FFE0C8]">
                          Infinity Vault Reward
                        </p>
                        <p className="text-[11px] font-semibold text-[#FFD5E7]/90">
                          Unlocked with {claimRecord.stoneName}
                        </p>
                      </div>
                    </div>

                    {/* Decorative metallic rose-gold card chip */}
                    <div
                      aria-hidden="true"
                      className="h-6 w-8 rounded-md border border-[#FFE5C8]/60 bg-gradient-to-br from-[#F7D7B5] via-[#E5A78A] to-[#C27866] opacity-90 shadow-inner"
                    />
                  </div>

                  {/* Center Shimmering ₹250 Value */}
                  <div className="relative z-10 my-5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFE5D4]/80">
                      Gift Card Value
                    </p>
                    <p
                      data-testid="vault-reward-amount"
                      className="font-display mt-0.5 bg-gradient-to-b from-[#FFFDF9] via-[#FFE7C7] to-[#F4B694] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent drop-shadow-[0_4px_14px_rgba(255,215,175,0.35)] sm:text-6xl"
                    >
                      {RIGGED_GIFT_DISPLAY}
                    </p>
                  </div>

                  {/* 12-Digit Code Box + Copy Button */}
                  <div className="relative z-10 rounded-xl border border-white/20 bg-[#1B0920]/55 px-3.5 py-3 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#F5C2D7]/75">
                          12-Digit Gift Code
                        </span>
                        <span
                          data-testid="vault-gift-code"
                          className="font-mono text-base font-extrabold tracking-[0.14em] text-[#FFF6F9] sm:text-lg"
                        >
                          {claimRecord.code}
                        </span>
                      </div>

                      <button
                        type="button"
                        data-testid="vault-copy-btn"
                        onClick={handleCopyCode}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition-all duration-150 active:scale-95 cursor-pointer ${
                          copied
                            ? 'border-[#4DF5A3]/60 bg-[#0D4A2F] text-[#B7FFDB]'
                            : 'border-[#F7CFAF]/50 bg-[#FFF6F9] text-[#3A1233] hover:bg-[#FFE6F0]'
                        }`}
                      >
                        {copied ? <span>Copied! ✓</span> : <span>Copy Code 📋</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clear Activation Instruction */}
                <p
                  data-testid="vault-activation-note"
                  className="mt-4 max-w-[350px] text-center text-xs font-semibold leading-relaxed text-[#FFE5F0] sm:text-sm"
                >
                  Send this 12-digit code to{' '}
                  <span className="rounded-md bg-white/12 px-1.5 py-0.5 font-mono font-extrabold text-[#FFD7EA]">
                    adinomide
                  </span>{' '}
                  to activate your {RIGGED_GIFT_DISPLAY} gift card.
                </p>

                {/* Subtle pulsing jump button strictly on first-time unlock */}
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
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#F6CFD7]/45 bg-[#D94B7D]/25 px-4 py-2 text-xs font-extrabold tracking-wide text-[#FFE9F2] shadow-[0_0_20px_rgba(217,75,125,0.35)] transition-all duration-150 hover:bg-[#D94B7D]/40 active:scale-95 animate-pulse cursor-pointer"
                  >
                    <span>View Screenshot Card in Footer ↓</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Unobtrusive Corner 🔑 Button on Claimed / Already Claimed Views for Secret Reset */}
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
              className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xs text-[#F2B7CE]/75 transition-all hover:border-[#F5C2D7]/40 hover:bg-white/[0.14] hover:text-white cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Portaled Minimal 4-Digit Reset Modal (z-[9500] so TopBar never intercepts clicks) */}
      {resetModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vault key passcode"
            data-testid="vault-reset-modal"
            className="fixed inset-0 z-[9500] flex items-center justify-center bg-[#120416]/78 p-4 backdrop-blur-sm"
            onClick={() => setResetModalOpen(false)}
          >
            <div
              className="relative w-full max-w-[300px] rounded-3xl border border-[#E8A3BE]/35 bg-gradient-to-b from-[#230B2B] to-[#1B0920] p-5 text-center text-[#FFF6F9] shadow-2xl animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                data-testid="vault-reset-modal-close"
                aria-label="Close vault key modal"
                onClick={() => setResetModalOpen(false)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#FFE4F0] transition-colors hover:bg-white/20 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#F5C2D7]/35 bg-[#D94B7D]/25 text-[#FFD7E7]">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#FFF6F9]">Vault Key</h3>
              <p className="mt-1 mb-3.5 text-xs text-[#F2C6D8]/85">Enter 4-digit passcode</p>

              {/* 4 Digit Boxes + Keyboard Input */}
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
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div
                  key={modalShakeCount}
                  className={`flex items-center justify-center gap-2 ${
                    modalShakeCount > 0 && modalError ? 'animate-vault-shake' : ''
                  }`}
                >
                  {[0, 1, 2, 3].map((slot) => {
                    const char = modalDigits[slot] ?? '';
                    return (
                      <div
                        key={slot}
                        className={`flex h-11 w-10 items-center justify-center rounded-xl border text-lg font-extrabold ${
                          modalError
                            ? 'border-[#FF5C77] bg-[#FF5C77]/15 text-[#FFD7DE]'
                            : char
                              ? 'border-[#F5A8C7] bg-[#D94B7D]/25 text-white'
                              : 'border-white/20 bg-white/[0.06] text-white/60'
                        }`}
                      >
                        {char ? '•' : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-2.5 min-h-[16px]">
                {modalError && (
                  <p data-testid="vault-modal-error" className="text-xs font-bold text-[#FF8CA0]">
                    {modalError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {KEYPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`vault-modal-key-${key.toLowerCase()}`}
                    onClick={() => handleModalKeyTap(key)}
                    className={`flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-all active:scale-92 cursor-pointer ${
                      key === 'CLEAR' || key === 'BACK'
                        ? 'border-white/15 bg-white/[0.06] text-[11px] font-semibold text-[#F2C6D8] hover:bg-white/[0.12]'
                        : 'border-[#F5C2D7]/22 bg-white/[0.09] text-white hover:border-[#F5C2D7]/45 hover:bg-[#D94B7D]/25'
                    }`}
                  >
                    {key === 'BACK' ? (
                      <Delete className="h-4 w-4" aria-hidden="true" />
                    ) : key === 'CLEAR' ? (
                      'Clear'
                    ) : (
                      key
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

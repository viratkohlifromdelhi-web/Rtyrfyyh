import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { getActiveAnalyticsSessionId, trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import {
  DEFAULT_TIME_CAPSULE_CATEGORY,
  TIME_CAPSULE_CATEGORIES,
  TIME_CAPSULE_COLLECTION,
  TIME_CAPSULE_COPY,
  TIME_CAPSULE_MAX_CHARS,
  TIME_CAPSULE_MODINO_REACTION,
  TIME_CAPSULE_STARTERS,
  appendSealedCapsule,
  applyStarterPrompt,
  buildTimeCapsulePayload,
  createTimeCapsuleId,
  formatUnlockCountdownPill,
  readSealedCapsules,
  validateTimeCapsuleLetter,
  type SealedTimeCapsuleRecord,
  type TimeCapsuleCategory,
} from '../utils/timeCapsuleCore';
import { playUiSfx } from '../utils/uiSoundEngine';

type CapsuleViewPhase = 'compose' | 'sealing' | 'sealed';

const WAX_SPARKLES = [
  { dx: '-58px', dy: '-72px', delay: '440ms', color: '#E6B85C', size: 12 },
  { dx: '62px', dy: '-66px', delay: '470ms', color: '#D94B7D', size: 11 },
  { dx: '-36px', dy: '-88px', delay: '500ms', color: '#F59BB9', size: 10 },
  { dx: '40px', dy: '-90px', delay: '520ms', color: '#E6B85C', size: 13 },
  { dx: '-74px', dy: '-42px', delay: '490ms', color: '#C6A3FF', size: 10 },
  { dx: '76px', dy: '-44px', delay: '510ms', color: '#F59BB9', size: 11 },
  { dx: '-12px', dy: '-94px', delay: '540ms', color: '#D94B7D', size: 9 },
  { dx: '16px', dy: '-82px', delay: '460ms', color: '#C6A3FF', size: 10 },
] as const;

function detectVisitorDeviceType(): 'Mobile' | 'Tablet' | 'Desktop' {
  if (typeof navigator === 'undefined') return 'Mobile';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function WaxSealedEnvelopeIllustration({
  svgPrefix,
  animateSequence,
}: {
  svgPrefix: string;
  animateSequence: boolean;
}) {
  return (
    <div className="relative mx-auto flex h-[clamp(172px,24vw,224px)] w-[clamp(244px,34vw,320px)] items-center justify-center">
      {animateSequence && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
          {WAX_SPARKLES.map((sp, idx) => (
            <svg
              key={idx}
              width={sp.size}
              height={sp.size}
              viewBox="0 0 24 24"
              fill="none"
              className="tc-sparkle-rise absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
              style={
                {
                  '--tc-dx': sp.dx,
                  '--tc-dy': sp.dy,
                  '--tc-delay': sp.delay,
                } as CSSProperties
              }
            >
              <path
                d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
                fill={sp.color}
              />
            </svg>
          ))}
        </div>
      )}

      <svg
        viewBox="0 0 280 184"
        fill="none"
        className="h-auto w-[clamp(234px,32vw,304px)] drop-shadow-[0_16px_26px_rgba(143,49,95,0.18)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`${svgPrefix}_envBody`}
            x1="20"
            y1="28"
            x2="260"
            y2="168"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="58%" stopColor="#FFF1F7" />
            <stop offset="100%" stopColor="#FADCE9" />
          </linearGradient>
          <linearGradient
            id={`${svgPrefix}_envFlap`}
            x1="140"
            y1="28"
            x2="140"
            y2="118"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFDFB" />
            <stop offset="100%" stopColor="#F6CBE0" />
          </linearGradient>
          <radialGradient id={`${svgPrefix}_waxMain`} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#F26F9C" />
            <stop offset="52%" stopColor="#D94B7D" />
            <stop offset="100%" stopColor="#A62453" />
          </radialGradient>
          <linearGradient id={`${svgPrefix}_goldRing`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FCE4A6" />
            <stop offset="50%" stopColor="#E6B85C" />
            <stop offset="100%" stopColor="#C8933B" />
          </linearGradient>
        </defs>

        {/* Cream Letter sliding smoothly inside during seal animation */}
        {animateSequence && (
          <g className="tc-letter-tuck will-change-transform">
            <rect
              x="54"
              y="18"
              width="172"
              height="96"
              rx="10"
              fill="#FFFDF9"
              stroke="#E6B85C"
              strokeWidth="1.4"
            />
            <line x1="74" y1="42" x2="206" y2="42" stroke="#F0D2DF" strokeWidth="2" strokeLinecap="round" />
            <line x1="74" y1="58" x2="190" y2="58" stroke="#F0D2DF" strokeWidth="2" strokeLinecap="round" />
            <line x1="74" y1="74" x2="174" y2="74" stroke="#F0D2DF" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Envelope Body */}
        <rect
          x="22"
          y="28"
          width="236"
          height="140"
          rx="18"
          fill={`url(#${svgPrefix}_envBody)`}
          stroke="#E6B85C"
          strokeWidth="1.8"
        />
        <path
          d="M28 162 L116 98 M252 162 L164 98"
          stroke="#EAC1D3"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Top Sealed Flap */}
        <path
          d="M26 36 C26 31 30 28 36 28 L244 28 C250 28 254 31 254 36 L146 112 C142 115 138 115 134 112 Z"
          fill={`url(#${svgPrefix}_envFlap)`}
          stroke="#E6B85C"
          strokeWidth="1.6"
          strokeLinejoin="round"
          className={animateSequence ? 'tc-flap-close will-change-transform' : undefined}
        />
        <path
          d="M38 35 L140 105 L242 35"
          stroke="rgba(230,184,92,0.52)"
          strokeWidth="1"
          fill="none"
        />

        {/* Expanding Golden Shimmer Ring */}
        {animateSequence && (
          <circle
            cx="140"
            cy="104"
            r="32"
            fill="none"
            stroke="#E6B85C"
            strokeWidth="2.4"
            className="tc-gold-ring will-change-transform"
          />
        )}

        {/* Glossy Rose Crimson & Champagne Gold Wax Seal embossed with "18" */}
        <g
          className={animateSequence ? 'tc-wax-stamp will-change-transform' : undefined}
        >
          <path
            d="M140 72 C151 71 162 77 168 87 C173 96 172 109 167 120 C161 130 151 136 139 135 C127 135 116 129 111 119 C106 109 107 95 113 86 C120 77 130 73 140 72 Z"
            fill={`url(#${svgPrefix}_waxMain)`}
            stroke={`url(#${svgPrefix}_goldRing)`}
            strokeWidth="2.2"
          />
          <circle
            cx="140"
            cy="104"
            r="23"
            fill="none"
            stroke="rgba(252,228,166,0.74)"
            strokeWidth="1.3"
          />
          <circle
            cx="140"
            cy="104"
            r="19.5"
            fill="none"
            stroke="rgba(255,253,249,0.36)"
            strokeWidth="0.9"
            strokeDasharray="2.5 2.5"
          />
          <text
            x="140"
            y="112"
            textAnchor="middle"
            fontFamily="Fraunces, Georgia, serif"
            fontSize="24"
            fontWeight="700"
            fill="#FFFDF9"
          >
            18
          </text>
        </g>
      </svg>
    </div>
  );
}

export function TimeCapsuleSection() {
  const rawUid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svgPrefix = `timeCapsule_${rawUid}`;

  const [sealedCapsules, setSealedCapsules] = useState<SealedTimeCapsuleRecord[]>(() =>
    readSealedCapsules(),
  );
  const [phase, setPhase] = useState<CapsuleViewPhase>(() =>
    readSealedCapsules().length > 0 ? 'sealed' : 'compose',
  );
  const [activeCapsule, setActiveCapsule] = useState<SealedTimeCapsuleRecord | null>(
    () => readSealedCapsules()[0] ?? null,
  );
  const [category, setCategory] = useState<TimeCapsuleCategory>(DEFAULT_TIME_CAPSULE_CATEGORY);
  const [letter, setLetter] = useState('');
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [peekActiveCapsule, setPeekActiveCapsule] = useState(false);
  const [vaultExpanded, setVaultExpanded] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const sealTimerRef = useRef<number | null>(null);
  const countdownPillLabel = useMemo(() => formatUnlockCountdownPill(Date.now()), []);

  useEffect(() => {
    return () => {
      if (sealTimerRef.current !== null) {
        window.clearTimeout(sealTimerRef.current);
        sealTimerRef.current = null;
      }
    };
  }, []);

  const handleSelectCategory = useCallback((nextCategory: TimeCapsuleCategory) => {
    haptics.tap();
    playUiSfx('tap');
    setCategory(nextCategory);
  }, []);

  const handleApplyStarter = useCallback((starter: string) => {
    haptics.tap();
    playUiSfx('tap');
    setValidationMsg(null);
    setNetworkError(null);
    setLetter((prev) => applyStarterPrompt(prev, starter));
  }, []);

  const handleSubmitCapsule = useCallback(async () => {
    if (isSaving) return;

    const validation = validateTimeCapsuleLetter(letter);
    if (!validation.valid) {
      haptics.error();
      setValidationMsg(validation.error);
      setShakeCount((n) => n + 1);
      return;
    }

    setValidationMsg(null);
    setNetworkError(null);
    setIsSaving(true);

    const nowMs = Date.now();
    const capsuleId = createTimeCapsuleId(nowMs);
    const nextNumber = Math.min(100, sealedCapsules.length + 1);
    const payload = buildTimeCapsulePayload({
      capsuleId,
      category,
      letter: validation.trimmed,
      capsuleNumber: nextNumber,
      sealedAtMs: nowMs,
      sessionId: getActiveAnalyticsSessionId() ?? 'direct_session',
      deviceType: detectVisitorDeviceType(),
    });

    try {
      if (!db) {
        throw new Error('Firestore unavailable');
      }

      // Always write to Firestore even if ignore_owner_analytics is enabled so her capsule is never lost
      await setDoc(doc(db, TIME_CAPSULE_COLLECTION, capsuleId), {
        ...payload,
        sealedAt: serverTimestamp(),
      });

      const updatedList = appendSealedCapsule(payload);
      setSealedCapsules(updatedList);
      setActiveCapsule(payload);
      setPeekActiveCapsule(false);
      setLetter('');
      setPhase('sealing');

      haptics.celebrate();
      playUiSfx('awww_chime');
      emitModinoEvent('cute', {
        force: true,
        source: 'time-capsule-sealed',
        customReaction: TIME_CAPSULE_MODINO_REACTION,
      });

      try {
        trackEvent('time_capsule_sealed', '18th Birthday Time Capsule', {
          category: payload.category,
          capsuleNumber: payload.capsuleNumber,
        });
      } catch {
        // silent analytics guard
      }

      if (sealTimerRef.current !== null) {
        window.clearTimeout(sealTimerRef.current);
      }
      sealTimerRef.current = window.setTimeout(() => {
        setPhase('sealed');
        sealTimerRef.current = null;
      }, 1050);
    } catch {
      // Preserve typed text cleanly on network error so user can retry immediately
      haptics.error();
      setNetworkError(TIME_CAPSULE_COPY.networkErrorFallback);
    } finally {
      setIsSaving(false);
    }
  }, [category, isSaving, letter, sealedCapsules.length]);

  const handleStartAnother = useCallback(() => {
    haptics.tap();
    playUiSfx('tap');
    setValidationMsg(null);
    setNetworkError(null);
    setPeekActiveCapsule(false);
    setCategory(DEFAULT_TIME_CAPSULE_CATEGORY);
    setPhase('compose');
  }, []);

  const toggleVaultItemReveal = useCallback((capsuleId: string) => {
    haptics.tap();
    playUiSfx('tap');
    setRevealedIds((prev) => ({ ...prev, [capsuleId]: !prev[capsuleId] }));
  }, []);

  return (
    <section
      id="time-capsule"
      data-testid="time-capsule-section"
      aria-labelledby="time-capsule-heading"
      className="relative z-[2] mx-auto w-full max-w-[var(--card-max)] px-4 py-9 sm:px-6 sm:py-12"
    >
      <div
        className="relative mx-auto w-full overflow-hidden rounded-[var(--card-radius)] border border-[#EBC6D8] text-left shadow-[0_22px_52px_-26px_rgba(122,42,84,0.28)]"
        style={{
          padding: 'var(--card-pad-y) var(--card-pad-x)',
          background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF4F8 100%)',
        }}
      >
        {/* Inner Champagne Gold Stationery Frame */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[8px] sm:inset-[10px] rounded-[calc(var(--card-radius)-7px)]"
          style={{ border: '1px solid rgba(230, 184, 92, 0.42)' }}
        />

        <div className="relative z-10">
          {/* Eyebrow & Countdown Pill */}
          <div className="text-center">
            <p className="text-[length:var(--text-eyebrow)] font-extrabold uppercase tracking-[0.17em] text-[#C43D6E]">
              {TIME_CAPSULE_COPY.eyebrow}
            </p>
            <h2
              id="time-capsule-heading"
              className="font-display mt-1.5 text-[length:var(--text-h2)] leading-tight font-bold tracking-tight text-[#3A1233]"
            >
              {TIME_CAPSULE_COPY.headline}
            </h2>
            <p className="mx-auto mt-2 max-w-[48ch] text-[length:var(--text-sub)] leading-relaxed text-[#7A4A63]">
              {TIME_CAPSULE_COPY.subtitle}
            </p>

            {/* Dynamic Countdown Pill + Cheeky Height Stamp */}
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <span
                data-testid="time-capsule-countdown-pill"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E6B85C]/55 bg-[#FFFBF1] px-4 py-1.5 text-[clamp(11.5px,1.5vw,14px)] font-bold tracking-wide text-[#8C5A1E] shadow-[0_4px_12px_-6px_rgba(230,184,92,0.45)]"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                <span>{countdownPillLabel}</span>
              </span>
              <span className="text-[clamp(11.5px,1.5vw,13.5px)] font-semibold text-[#8A5472]">
                {TIME_CAPSULE_COPY.heightStamp}
              </span>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="mx-auto my-5 h-px w-20 bg-gradient-to-r from-transparent via-[#E6B85C] to-transparent"
          />

          {/* STATE 1: COMPOSE LETTER */}
          {phase === 'compose' && (
            <div data-testid="time-capsule-compose-view" className="space-y-4 sm:space-y-5">
              {/* 4 Capsule Theme Chips */}
              <div>
                <p className="mb-2 text-[clamp(11px,1.4vw,13px)] font-bold uppercase tracking-[0.14em] text-[#8E5673]">
                  Pick a Capsule Vibe
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Capsule theme">
                  {TIME_CAPSULE_CATEGORIES.map((cat) => {
                    const selected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-testid={`time-capsule-cat-${cat}`}
                        onClick={() => handleSelectCategory(cat)}
                        className={`cursor-pointer rounded-full border px-3.5 py-2 text-[clamp(12px,1.55vw,14.5px)] font-semibold transition-all duration-150 active:scale-96 ${
                          selected
                            ? 'border-[#D94B7D] bg-[#D94B7D] text-[#FFFDF9] shadow-[0_8px_18px_-10px_rgba(217,75,125,0.7)]'
                            : 'border-[#EBC6D8] bg-[#FFFDFB] text-[#5C294A] hover:border-[#D94B7D]/55 hover:bg-[#FFF0F6]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lined Vintage-Pastel Stationery Letter Textarea */}
              <div
                key={shakeCount}
                className={shakeCount > 0 && validationMsg ? 'animate-midnight-shake' : undefined}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor={`${svgPrefix}_textarea`}
                    className="text-[clamp(11px,1.4vw,13px)] font-bold uppercase tracking-[0.14em] text-[#8E5673]"
                  >
                    Your Letter to 18 Year Old You
                  </label>
                  <span
                    data-testid="time-capsule-char-count"
                    className="text-[clamp(11.5px,1.45vw,13.5px)] font-semibold tabular-nums text-[#8E5673]"
                  >
                    {letter.length} / {TIME_CAPSULE_MAX_CHARS}
                  </span>
                </div>

                <textarea
                  id={`${svgPrefix}_textarea`}
                  data-testid="time-capsule-textarea"
                  rows={4}
                  maxLength={TIME_CAPSULE_MAX_CHARS}
                  value={letter}
                  onChange={(e) => {
                    setLetter(e.target.value);
                    if (validationMsg) setValidationMsg(null);
                    if (networkError) setNetworkError(null);
                  }}
                  placeholder={TIME_CAPSULE_COPY.textareaPlaceholder}
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, transparent 0px, transparent 29px, rgba(235, 198, 216, 0.45) 30px)',
                    backgroundPositionY: '6px',
                  }}
                  className="w-full resize-none rounded-2xl border border-[#E7C0D3] bg-[#FFFDFB] px-4 py-3 text-[clamp(14.5px,1.9vw,17px)] leading-[30px] text-[#3A1233] placeholder:text-[#A47992] focus:border-[#D94B7D] focus:outline-none focus:ring-2 focus:ring-[#D94B7D]/20"
                />

                {validationMsg && (
                  <p
                    role="alert"
                    data-testid="time-capsule-validation-error"
                    className="mt-1.5 text-xs sm:text-sm font-semibold text-[#C43D6E]"
                  >
                    {validationMsg}
                  </p>
                )}

                {networkError && (
                  <p
                    role="alert"
                    data-testid="time-capsule-network-error"
                    className="mt-1.5 rounded-xl border border-[#F2B7CD] bg-[#FFF0F6] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#A52957]"
                  >
                    {networkError}
                  </p>
                )}
              </div>

              {/* 3 Zero-Dash Starter Prompt Chips */}
              <div>
                <p className="mb-2 text-[clamp(11px,1.4vw,13px)] font-bold uppercase tracking-[0.14em] text-[#8E5673]">
                  Need a Spark? Tap a Starter
                </p>
                <div className="flex flex-col gap-2">
                  {TIME_CAPSULE_STARTERS.map((starter, idx) => (
                    <button
                      key={starter}
                      type="button"
                      data-testid={`time-capsule-starter-${idx}`}
                      onClick={() => handleApplyStarter(starter)}
                      className="cursor-pointer rounded-xl border border-[#F0D1DF] bg-[#FFF8FB] px-3.5 py-2.5 text-left text-[clamp(12px,1.55vw,14.5px)] font-medium text-[#6B3B64] transition-colors hover:border-[#D94B7D]/50 hover:bg-[#FFEFF6] hover:text-[#3A1233] active:scale-[0.99]"
                    >
                      &ldquo;{starter}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary CTA: Lock & Wax Seal */}
              <button
                type="button"
                data-testid="time-capsule-submit-btn"
                disabled={isSaving}
                onClick={() => void handleSubmitCapsule()}
                className="btn-rose-berry inline-flex min-h-[var(--btn-min-h)] w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-[clamp(14px,1.8vw,16.5px)] font-bold tracking-wide text-[#FFFDF9] shadow-[0_14px_28px_-12px_rgba(217,75,125,0.62)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
              >
                <span>{isSaving ? TIME_CAPSULE_COPY.ctaSealing : TIME_CAPSULE_COPY.ctaIdle}</span>
              </button>
            </div>
          )}

          {/* STATE 2: 60FPS GPU WAX SEAL ENVELOPE SEQUENCE (~1.05s) */}
          {phase === 'sealing' && (
            <div
              data-testid="time-capsule-sealing-stage"
              className="flex flex-col items-center py-4 text-center"
            >
              <WaxSealedEnvelopeIllustration svgPrefix={svgPrefix} animateSequence={true} />
              <p className="font-display mt-3 text-lg font-semibold text-[#3A1233]">
                Pressing Wax Seal 18...
              </p>
              <p className="mt-1 text-xs font-medium text-[#7A4A63]">
                Locking your letter safely for 03 Dec 2027
              </p>
            </div>
          )}

          {/* STATE 3: SEALED VAULT CONFIRMATION VIEW */}
          {phase === 'sealed' && activeCapsule && (
            <div
              data-testid="time-capsule-sealed-view"
              className="animate-pop-in flex flex-col items-center text-center"
            >
              <WaxSealedEnvelopeIllustration svgPrefix={svgPrefix} animateSequence={false} />

              <span className="mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#E6B85C]/60 bg-[#FFFBF0] px-3 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.11em] text-[#9A6520] sm:text-[10px]">
                <Lock className="h-3 w-3 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                <span>{TIME_CAPSULE_COPY.sealedEyebrow}</span>
              </span>

              <h3 className="font-display mt-2.5 text-xl font-bold text-[#3A1233]">
                {TIME_CAPSULE_COPY.sealedHeadline}
              </h3>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full border border-[#EBC6D8] bg-[#FFF0F6] px-2.5 py-0.5 text-[#B83265]">
                  {activeCapsule.category}
                </span>
                <span className="text-[#8E5673]">
                  Capsule #{activeCapsule.capsuleNumber} &middot; {activeCapsule.sealedAtIST}
                </span>
              </div>

              {/* Letter Hidden by Default with Peek Toggle */}
              <div className="mt-4 w-full rounded-2xl border border-[#ECC6D8] bg-[#FFFDFB] p-4 text-left shadow-inner">
                {peekActiveCapsule ? (
                  <p
                    data-testid="time-capsule-sealed-letter-revealed"
                    className="whitespace-pre-wrap break-words text-[length:var(--text-body)] leading-relaxed text-[#3A1233]"
                  >
                    {activeCapsule.letter}
                  </p>
                ) : (
                  <div
                    data-testid="time-capsule-sealed-letter-hidden"
                    className="flex items-center justify-center gap-2 py-2.5 text-center text-[length:var(--text-sub)] font-medium text-[#8A5472]"
                  >
                    <Lock className="h-4 w-4 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                    <span>Sealed inside the 03 Dec 2027 wax envelope</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex w-full flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  data-testid="time-capsule-peek-btn"
                  onClick={() => {
                    haptics.tap();
                    playUiSfx('tap');
                    setPeekActiveCapsule((prev) => !prev);
                  }}
                  className="inline-flex min-h-[var(--btn-min-h)] w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#E6B85C]/70 bg-[#FFFBF2] px-5 py-2.5 text-[clamp(12.5px,1.6vw,14.5px)] font-bold text-[#7A4A63] transition-colors hover:bg-[#FFF2DE] active:scale-[0.98]"
                >
                  {peekActiveCapsule ? (
                    <>
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      <span>{TIME_CAPSULE_COPY.peekHideLabel}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>{TIME_CAPSULE_COPY.peekOpenLabel}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="time-capsule-seal-another-btn"
                  onClick={handleStartAnother}
                  className="btn-rose-berry inline-flex min-h-[var(--btn-min-h)] w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-[clamp(12.5px,1.6vw,14.5px)] font-bold text-[#FFFDF9] active:scale-[0.98]"
                >
                  <span>{TIME_CAPSULE_COPY.sealAnotherLabel}</span>
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Local Vault Drawer: Your Sealed Capsules (X) */}
          {sealedCapsules.length > 0 && phase !== 'sealing' && (
            <div className="mt-5 border-t border-[#F1D5E3] pt-3.5">
              <button
                type="button"
                data-testid="time-capsule-vault-toggle"
                aria-expanded={vaultExpanded}
                onClick={() => {
                  haptics.tap();
                  playUiSfx('tap');
                  setVaultExpanded((prev) => !prev);
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-[#FFF6FA] px-3.5 py-2.5 text-left text-xs font-bold text-[#5C294A] transition-colors hover:bg-[#FFEBF4]"
              >
                <span>Your Sealed Capsules ({sealedCapsules.length})</span>
                {vaultExpanded ? (
                  <ChevronUp className="h-4 w-4 text-[#B83265]" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#B83265]" aria-hidden="true" />
                )}
              </button>

              {vaultExpanded && (
                <div
                  data-testid="time-capsule-vault-list"
                  className="mt-2.5 space-y-2.5"
                >
                  {sealedCapsules.map((cap) => {
                    const isRevealed = Boolean(revealedIds[cap.capsuleId]);
                    return (
                      <article
                        key={cap.capsuleId}
                        className="rounded-2xl border border-[#F0D3E1] bg-[#FFFDFB] p-3 text-left"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="rounded-full border border-[#F0CFE0] bg-[#FFF2F8] px-2.5 py-0.5 text-[10.5px] font-bold text-[#B83265]">
                            {cap.category}
                          </span>
                          <span className="text-[10.5px] font-medium text-[#8E5673]">
                            #{cap.capsuleNumber} &middot; {cap.sealedAtIST}
                          </span>
                        </div>

                        <div className="mt-2">
                          {isRevealed ? (
                            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#3A1233]">
                              {cap.letter}
                            </p>
                          ) : (
                            <p className="text-[11.5px] italic text-[#8A5472]">
                              Wax sealed until 03 Dec 2027
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleVaultItemReveal(cap.capsuleId)}
                          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#C43D6E] hover:underline"
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                              <span>{TIME_CAPSULE_COPY.peekHideLabel}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" aria-hidden="true" />
                              <span>{TIME_CAPSULE_COPY.peekOpenLabel}</span>
                            </>
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

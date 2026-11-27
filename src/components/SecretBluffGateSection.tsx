import { useCallback, useId, useRef, useState, type FormEvent } from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import {
  BLUFF_GATE_COPY,
  BLUFF_PASSCODE_MAX_LENGTH,
  evaluateBluffPasscode,
  sanitizeBluffPasscodeInput,
} from '../utils/secretBluffGate';
import { soundEngine } from '../utils/soundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

function PastelClownIllustration({ animate }: { animate: boolean }) {
  const uid = useId().replace(/:/g, '');
  const auraId = `clown-aura-${uid}`;
  const faceId = `clown-face-${uid}`;
  const hairId = `clown-hair-${uid}`;
  const hatId = `clown-hat-${uid}`;
  const noseId = `clown-nose-${uid}`;
  const collarId = `clown-collar-${uid}`;

  return (
    <div className="mx-auto flex justify-center">
      <svg
        viewBox="0 0 220 150"
        width="220"
        height="150"
        role="img"
        aria-label="Playful pastel storybook clown grinning"
        data-testid="bluff-clown-svg"
        className="h-auto w-full max-w-[220px] overflow-visible select-none"
      >
        <defs>
          <radialGradient id={auraId} cx="50%" cy="52%" r="50%">
            <stop offset="0%" stopColor="#FFF2CE" stopOpacity="0.95" />
            <stop offset="62%" stopColor="#FFE5EF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFF5F8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={faceId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="100%" stopColor="#FFEFE5" />
          </linearGradient>
          <linearGradient id={hairId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE6B8" />
            <stop offset="55%" stopColor="#FFD2DE" />
            <stop offset="100%" stopColor="#F8BBD0" />
          </linearGradient>
          <linearGradient id={hatId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E45C8B" />
            <stop offset="100%" stopColor="#C43868" />
          </linearGradient>
          <radialGradient id={noseId} cx="36%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#F57AA3" />
            <stop offset="55%" stopColor="#D94B7D" />
            <stop offset="100%" stopColor="#B83265" />
          </radialGradient>
          <linearGradient id={collarId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF7DC" />
            <stop offset="100%" stopColor="#FFDDE9" />
          </linearGradient>
        </defs>

        {/* Soft sunlit storybook backdrop halo */}
        <ellipse cx="110" cy="84" rx="88" ry="56" fill={`url(#${auraId})`} />

        {/* Subtle pastel confetti specks & 4-point sparkles */}
        <g opacity="0.88">
          <circle cx="34" cy="48" r="3.4" fill="#F4C76C" />
          <circle cx="186" cy="44" r="3.2" fill="#F29CB9" />
          <circle cx="42" cy="112" r="2.8" fill="#B9DFC4" />
          <circle cx="180" cy="110" r="3" fill="#DAC6F5" />
          <rect
            x="24"
            y="78"
            width="7"
            height="4"
            rx="2"
            fill="#F4A5C0"
            transform="rotate(-24 27 80)"
          />
          <rect
            x="189"
            y="76"
            width="7"
            height="4"
            rx="2"
            fill="#F4C76C"
            transform="rotate(22 192 78)"
          />
          <path
            d="M172 24 L174 29 L179 31 L174 33 L172 38 L170 33 L165 31 L170 29 Z"
            fill="#E8B858"
          />
          <path
            d="M48 26 L49.6 30 L53.6 31.6 L49.6 33.2 L48 37.2 L46.4 33.2 L42.4 31.6 L46.4 30 Z"
            fill="#E06C94"
          />
        </g>

        {/* Gently bobbing clown figure (GPU-composited translate3d + rotate) */}
        <g
          className={animate ? 'animate-bluff-clown-nod' : undefined}
          style={{ transformOrigin: '110px 104px' }}
        >
          {/* Cute scalloped ruffled pastel collar */}
          <g>
            <path
              d="M66 116 C64 128 74 136 84 132 C90 140 102 141 110 135 C118 141 130 140 136 132 C146 136 156 128 154 116 C144 110 76 110 66 116 Z"
              fill={`url(#${collarId})`}
              stroke="#B87490"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M84 131 Q88 122 93 118 M110 134 L110 118 M136 131 Q132 122 127 118"
              fill="none"
              stroke="#D89AB3"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Rose-berry collar pom-pom bow accent */}
            <circle cx="110" cy="122" r="4.6" fill="#D94B7D" />
            <circle cx="108.6" cy="120.6" r="1.3" fill="#FFFDF8" opacity="0.85" />
          </g>

          {/* Fluffy pastel blush-buttercream side hair puffs */}
          <g stroke="#B87490" strokeWidth="1.6" strokeLinejoin="round">
            {/* Left fluffy curls */}
            <circle cx="66" cy="70" r="15" fill={`url(#${hairId})`} />
            <circle cx="57" cy="84" r="14.5" fill={`url(#${hairId})`} />
            <circle cx="67" cy="96" r="12.5" fill={`url(#${hairId})`} />
            {/* Right fluffy curls */}
            <circle cx="154" cy="70" r="15" fill={`url(#${hairId})`} />
            <circle cx="163" cy="84" r="14.5" fill={`url(#${hairId})`} />
            <circle cx="153" cy="96" r="12.5" fill={`url(#${hairId})`} />
          </g>
          {/* Soft inner hair highlights to keep puffs airy & storybook-shaded */}
          <g fill="#FFF7DF" opacity="0.65">
            <circle cx="62" cy="66" r="4.5" />
            <circle cx="54" cy="80" r="4" />
            <circle cx="158" cy="66" r="4.5" />
            <circle cx="166" cy="80" r="4" />
          </g>

          {/* Soft ears */}
          <circle cx="71" cy="86" r="7.5" fill="#FFEBE0" stroke="#B87490" strokeWidth="1.5" />
          <circle cx="149" cy="86" r="7.5" fill="#FFEBE0" stroke="#B87490" strokeWidth="1.5" />

          {/* Main soft-ivory round clown head */}
          <ellipse
            cx="110"
            cy="82"
            rx="38"
            ry="36"
            fill={`url(#${faceId})`}
            stroke="#A55E7B"
            strokeWidth="1.7"
          />

          {/* Soft chin blush shadow */}
          <path
            d="M84 106 Q110 119 136 106"
            fill="none"
            stroke="#F6D4E0"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Warm rosy cheeks */}
          <ellipse cx="86" cy="91" rx="8.5" ry="5.5" fill="#F8A8C5" opacity="0.58" />
          <ellipse cx="134" cy="91" rx="8.5" ry="5.5" fill="#F8A8C5" opacity="0.58" />

          {/* Playful curved storybook eyebrows */}
          <path
            d="M86 64 Q93 58 100 63"
            fill="none"
            stroke="#8B4364"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M120 63 Q127 58 134 64"
            fill="none"
            stroke="#8B4364"
            strokeWidth="1.9"
            strokeLinecap="round"
          />

          {/* Expressive happy eyes (left bright eye + right cheeky wink arc) */}
          <g>
            <circle cx="94" cy="76" r="4.4" fill="#461A3A" />
            <circle cx="95.4" cy="74.4" r="1.5" fill="#FFFDF8" />
            <path
              d="M119 76.5 Q126 69.5 133 76.5"
              fill="none"
              stroke="#461A3A"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>

          {/* Big playful storybook grin */}
          <path
            d="M93 95 Q110 112 127 95"
            fill="#FFE2EC"
            stroke="#B83265"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M101 101 Q110 107.5 119 101"
            fill="#F48FB2"
            opacity="0.7"
          />

          {/* Signature glossy rose-berry clown nose (#D94B7D) */}
          <circle
            cx="110"
            cy="86"
            r="8.8"
            fill={`url(#${noseId})`}
            stroke="#A12B59"
            strokeWidth="1.2"
          />
          <ellipse
            cx="107.2"
            cy="83.2"
            rx="2.6"
            ry="1.7"
            fill="#FFFDF8"
            opacity="0.88"
            transform="rotate(-24 107.2 83.2)"
          />

          {/* Cheerful tilted pastel rose-berry & gold party/clown hat */}
          <g transform="translate(110 47) rotate(11) translate(-110 -47)">
            {/* Hat cone */}
            <path
              d="M89 48 L110 13 L131 48 Z"
              fill={`url(#${hatId})`}
              stroke="#A12B59"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Soft gold festive stripes */}
            <path
              d="M99 31 L120 35 M94 41 L126 45"
              fill="none"
              stroke="#F7D583"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Scalloped buttercream-gold hat brim */}
            <path
              d="M84 48 Q91 43 97 48 Q103.5 43 110 48 Q116.5 43 123 48 Q129 43 136 48 Q123 54 110 53.5 Q97 54 84 48 Z"
              fill="#FFE9AE"
              stroke="#C9943A"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Fluffy cream pom-pom tip */}
            <circle cx="110" cy="11.5" r="6" fill="#FFFDF8" stroke="#D89AB3" strokeWidth="1.4" />
            <circle cx="108.4" cy="10" r="1.8" fill="#FFE6B8" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function SecretBluffGateSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef);

  const [code, setCode] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ownerMessage, setOwnerMessage] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  const handleInputChange = useCallback((value: string) => {
    setCode(sanitizeBluffPasscodeInput(value));
    setErrorMessage(null);
    setOwnerMessage(null);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const outcome = evaluateBluffPasscode(code);

      if (outcome === 'unlock_bluff') {
        try {
          haptics.celebrate();
        } catch {
          // silent
        }
        try {
          soundEngine.playBluffClownTrombone();
        } catch {
          // silent
        }
        try {
          trackEvent('bluff_passcode_1507_unlocked', 'Secret Bluff Page');
        } catch {
          // silent
        }
        setErrorMessage(null);
        setOwnerMessage(null);
        setRevealed(true);
        return;
      }

      if (outcome === 'ignore_owner') {
        try {
          haptics.tap();
        } catch {
          // silent
        }
        setErrorMessage(null);
        setOwnerMessage(BLUFF_GATE_COPY.ownerCodeNote);
        setCode('');
        return;
      }

      try {
        haptics.error();
      } catch {
        // silent
      }
      try {
        soundEngine.playBubbleClick(0.78);
      } catch {
        // silent
      }
      setOwnerMessage(null);
      setErrorMessage(BLUFF_GATE_COPY.wrongCodeHint);
      setShakeCount((count) => count + 1);
    },
    [code],
  );

  const handleReset = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    try {
      soundEngine.playBubbleClick(1.02);
    } catch {
      // silent
    }
    setRevealed(false);
    setCode('');
    setErrorMessage(null);
    setOwnerMessage(null);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="secret-bluff-gate"
      data-testid="secret-bluff-gate"
      aria-label="Secret Passcode Check"
      className="relative z-[2] px-4 pt-2 pb-1"
    >
      <div
        key={shakeCount > 0 && !revealed ? `bluff-shake-${shakeCount}` : 'bluff-card'}
        className={`mx-auto mt-6 mb-3 w-full max-w-[370px] rounded-[24px] border border-[rgba(217,75,125,0.20)] bg-gradient-to-b from-[#FFFDF9] to-[#FFF5F8] px-[18px] py-[20px] text-center shadow-[0_12px_30px_-14px_rgba(176,62,106,0.14)] ${
          shakeCount > 0 && errorMessage && !revealed ? 'animate-bluff-shake' : ''
        }`}
      >
        {!revealed ? (
          <div data-testid="bluff-gate-locked">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C93B6B]">
              {BLUFF_GATE_COPY.eyebrow}
            </p>
            <h2 className="font-display mt-1.5 text-[22px] leading-tight font-semibold text-[#3A1233]">
              {BLUFF_GATE_COPY.title}
            </h2>
            <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-[#7A4A63]">
              {BLUFF_GATE_COPY.helper}
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-4 flex items-center gap-2.5"
            >
              <label htmlFor="secret-bluff-passcode-input" className="sr-only">
                Secret 4 digit passcode
              </label>
              <input
                id="secret-bluff-passcode-input"
                data-testid="bluff-passcode-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={BLUFF_PASSCODE_MAX_LENGTH}
                autoComplete="off"
                value={code}
                onChange={(event) => handleInputChange(event.target.value)}
                placeholder="0000"
                aria-invalid={Boolean(errorMessage)}
                className="min-h-[44px] min-w-0 flex-1 rounded-full border border-[#EBC6D8] bg-[#FFFDFB] px-4 py-2 text-center font-mono text-[15px] font-semibold tabular-nums tracking-[0.26em] text-[#3A1233] placeholder:text-[#C59BB0] transition-colors focus:border-[#D94B7D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D94B7D]/25"
              />
              <button
                type="submit"
                data-testid="bluff-unlock-btn"
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#D94B7D] px-5 py-2 text-xs font-semibold tracking-wide text-[#FFFDF9] shadow-[0_8px_18px_-8px_rgba(217,75,125,0.65),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-150 hover:bg-[#C93B6B] active:scale-[0.97] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{BLUFF_GATE_COPY.unlockLabel}</span>
              </button>
            </form>

            {errorMessage && (
              <p
                role="alert"
                data-testid="bluff-error-msg"
                className="mt-2.5 text-xs font-semibold text-[#C93B6B]"
              >
                {errorMessage}
              </p>
            )}

            {ownerMessage && (
              <p
                role="status"
                data-testid="bluff-owner-note"
                className="mt-2.5 text-xs font-medium text-[#7A4A63]"
              >
                {ownerMessage}
              </p>
            )}
          </div>
        ) : (
          <div
            data-testid="bluff-reveal-stage"
            className="animate-bluff-reveal flex flex-col items-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C93B6B]">
              {BLUFF_GATE_COPY.eyebrow}
            </p>

            <div className="mt-1 w-full">
              <PastelClownIllustration animate={animationsActive} />
            </div>

            <h3
              data-testid="bluff-reveal-headline"
              className="font-display mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#3A1233]"
            >
              <span>{BLUFF_GATE_COPY.revealHeadlineLead}</span>{' '}
              <span className="inline-block italic text-[#C93B6B]">
                {BLUFF_GATE_COPY.revealHeadlinePunch}
              </span>
            </h3>

            <p
              data-testid="bluff-reveal-subtext"
              className="mx-auto mt-2 max-w-[300px] text-[12.5px] leading-relaxed text-[#7A4A63]"
            >
              {BLUFF_GATE_COPY.revealSubtext}
            </p>

            <button
              type="button"
              data-testid="bluff-reset-btn"
              onClick={handleReset}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#E7B6CB] bg-[#FFFDF9] px-5 py-2 text-xs font-semibold text-[#6B3B64] shadow-[0_4px_12px_-6px_rgba(176,62,106,0.2)] transition-all duration-150 hover:border-[#D94B7D] hover:bg-[#FFF0F6] hover:text-[#3A1233] active:scale-[0.97] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#C93B6B]" aria-hidden="true" />
              <span>{BLUFF_GATE_COPY.resetLabel}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

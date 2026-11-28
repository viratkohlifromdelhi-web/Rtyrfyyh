import { useId } from 'react';
import { COUNTDOWN_BLUFF_COPY, type ActiveBluffCode } from '../utils/midnightLock';

interface CountdownBluffViewProps {
  variant: ActiveBluffCode;
  onBackToCountdown: () => void;
}

/**
 * Outline-free soft-pastel storybook chibi clown SVG for passcode `1507`.
 */
function PastelClownSvg() {
  const uid = useId().replace(/:/g, '');
  const auraId = `cb-clown-aura-${uid}`;
  const faceId = `cb-clown-face-${uid}`;
  const hairId = `cb-clown-hair-${uid}`;
  const hatId = `cb-clown-hat-${uid}`;
  const noseId = `cb-clown-nose-${uid}`;
  const collarId = `cb-clown-collar-${uid}`;

  return (
    <div className="mx-auto flex justify-center">
      <svg
        viewBox="0 0 220 150"
        width="220"
        height="150"
        role="img"
        aria-label="Playful soft pastel storybook clown grinning"
        data-testid="countdown-bluff-clown-svg"
        className="h-auto w-[clamp(200px,34vw,270px)] overflow-visible select-none"
      >
        <defs>
          <radialGradient id={auraId} cx="50%" cy="54%" r="50%">
            <stop offset="0%" stopColor="#FFE1EC" stopOpacity="0.88" />
            <stop offset="60%" stopColor="#FFF2D6" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#FFF8FB" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={faceId} cx="46%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FFF9F4" />
            <stop offset="68%" stopColor="#FCE7DA" />
            <stop offset="100%" stopColor="#F5D3C2" />
          </radialGradient>
          <radialGradient id={hairId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFF0C8" />
            <stop offset="58%" stopColor="#F8C6D8" />
            <stop offset="100%" stopColor="#E9A3BF" />
          </radialGradient>
          <linearGradient id={hatId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E65D8D" />
            <stop offset="100%" stopColor="#C43B6D" />
          </linearGradient>
          <radialGradient id={noseId} cx="34%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#FF97B9" />
            <stop offset="48%" stopColor="#D94B7D" />
            <stop offset="100%" stopColor="#B53162" />
          </radialGradient>
          <linearGradient id={collarId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="100%" stopColor="#E8DDF8" />
          </linearGradient>
        </defs>

        {/* Ambient pastel aura */}
        <ellipse cx="110" cy="86" rx="84" ry="56" fill={`url(#${auraId})`} />

        {/* Subtle confetti sparkles */}
        <g aria-hidden="true">
          <path
            d="M36 44 L38.5 50.5 L45 53 L38.5 55.5 L36 62 L33.5 55.5 L27 53 L33.5 50.5 Z"
            fill="#E8749E"
            opacity="0.72"
          />
          <path
            d="M184 36 L186.2 42 L192 44.2 L186.2 46.4 L184 52.4 L181.8 46.4 L176 44.2 L181.8 42 Z"
            fill="#E6B85C"
            opacity="0.82"
          />
          <circle cx="48" cy="112" r="3.4" fill="#F2D28B" opacity="0.8" />
          <circle cx="176" cy="108" r="3.6" fill="#E8A2BE" opacity="0.75" />
        </g>

        {/* Gently nodding pastel chibi clown */}
        <g className="animate-bluff-clown-nod" style={{ transformOrigin: '110px 96px' }}>
          {/* Ground shadow */}
          <ellipse cx="110" cy="138" rx="44" ry="6.5" fill="#D998B4" opacity="0.2" />

          {/* Ruffled ivory-lilac collar */}
          <g>
            <path
              d="M66 116 Q76 135 90 126 Q99 138 110 128 Q121 138 130 126 Q144 135 154 116 Q134 113 110 114 Q86 113 66 116 Z"
              fill={`url(#${collarId})`}
            />
            <path
              d="M78 122 Q94 128 110 123 Q126 128 142 122"
              fill="none"
              stroke="#D8C8EF"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.75"
            />
            <circle cx="110" cy="122" r="4.4" fill="#E66996" />
            <circle cx="108.8" cy="120.8" r="1.3" fill="#FFD3E2" />
          </g>

          {/* Fluffy blush-buttercream side hair puffs */}
          <g>
            <circle cx="62" cy="84" r="17" fill={`url(#${hairId})`} />
            <circle cx="53" cy="95" r="13.5" fill={`url(#${hairId})`} />
            <circle cx="64" cy="104" r="12" fill={`url(#${hairId})`} />
            <circle cx="158" cy="84" r="17" fill={`url(#${hairId})`} />
            <circle cx="167" cy="95" r="13.5" fill={`url(#${hairId})`} />
            <circle cx="156" cy="104" r="12" fill={`url(#${hairId})`} />
          </g>

          {/* Soft warm peach head */}
          <ellipse cx="110" cy="86" rx="42" ry="37" fill={`url(#${faceId})`} />
          {/* Soft top light highlight */}
          <ellipse cx="104" cy="63" rx="22" ry="9" fill="#FFFFFF" opacity="0.45" />

          {/* Rosy glowing blush cheeks */}
          <ellipse cx="83" cy="93" rx="10" ry="6.2" fill="#F49CB8" opacity="0.52" />
          <ellipse cx="137" cy="93" rx="10" ry="6.2" fill="#F49CB8" opacity="0.52" />

          {/* Left cheeky wide eye & right playful wink */}
          <g>
            <circle cx="93" cy="81" r="6.2" fill="#3A1233" />
            <circle cx="95.2" cy="78.8" r="2.1" fill="#FFFFFF" />
            <circle cx="91.4" cy="83.4" r="1.0" fill="#FFE6F0" />
            <path
              d="M86 71.5 Q93 67.5 100 71"
              fill="none"
              stroke="#7A4460"
              strokeWidth="2.1"
              strokeLinecap="round"
            />

            <path
              d="M120 82 Q127 75.5 134 82"
              fill="none"
              stroke="#3A1233"
              strokeWidth="2.9"
              strokeLinecap="round"
            />
            <path
              d="M120 71 Q127 67.5 134 71.5"
              fill="none"
              stroke="#7A4460"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
          </g>

          {/* Big cheeky grin */}
          <g>
            <path
              d="M90 99 Q110 117 130 99 Q124 103.5 110 103.5 Q96 103.5 90 99 Z"
              fill="#D94B7D"
            />
            <path
              d="M90 99 Q110 116 130 99"
              fill="none"
              stroke="#A12B59"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M98 103 Q110 108 122 103"
              fill="none"
              stroke="#FFFDF9"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>

          {/* Glossy rose-berry clown nose */}
          <circle cx="110" cy="90" r="8.6" fill={`url(#${noseId})`} />
          <ellipse
            cx="107.2"
            cy="87"
            rx="2.9"
            ry="1.9"
            transform="rotate(-24 107.2 87)"
            fill="#FFFFFF"
            opacity="0.72"
          />

          {/* Tiny festive striped cone hat in Rose Berry & Champagne Gold */}
          <g transform="rotate(7 110 52)">
            <path d="M88 50 L110 13 L132 50 Z" fill={`url(#${hatId})`} />
            <path
              d="M98 33 L121 37 M93 43 L127 47"
              fill="none"
              stroke="#F2D28B"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <path
              d="M84 50 Q91 45 97 50 Q103.5 45 110 50 Q116.5 45 123 50 Q129 45 136 50 Q123 56 110 55.5 Q97 56 84 50 Z"
              fill="#FCE7B2"
            />
            <circle cx="110" cy="11.5" r="6.4" fill="#FFFDF8" />
            <circle cx="108.5" cy="10" r="2.2" fill="#FFE6B8" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * Outline-free soft-pastel cartoon hand giving a crisp, unmistakable middle finger
 * gesture for passcode `0312`, shaded with warm peach gradients and 4 comic spark lines.
 */
function PastelMiddleFingerSvg() {
  const uid = useId().replace(/:/g, '');
  const auraId = `cb-hand-aura-${uid}`;
  const skinMainId = `cb-hand-skin-${uid}`;
  const skinFingerId = `cb-hand-finger-${uid}`;
  const skinShadeId = `cb-hand-shade-${uid}`;
  const cuffId = `cb-hand-cuff-${uid}`;

  return (
    <div className="mx-auto flex justify-center">
      <svg
        viewBox="0 0 220 160"
        width="220"
        height="160"
        role="img"
        aria-label="Playful soft pastel cartoon hand giving the middle finger"
        data-testid="countdown-bluff-hand-svg"
        className="h-auto w-[clamp(200px,34vw,270px)] overflow-visible select-none"
      >
        <defs>
          <radialGradient id={auraId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE1EC" stopOpacity="0.88" />
            <stop offset="58%" stopColor="#FFF0D1" stopOpacity="0.46" />
            <stop offset="100%" stopColor="#FFF8FB" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={skinMainId} x1="20%" y1="0%" x2="82%" y2="100%">
            <stop offset="0%" stopColor="#FCE0CE" />
            <stop offset="52%" stopColor="#F8D5C0" />
            <stop offset="100%" stopColor="#EBB99F" />
          </linearGradient>
          <linearGradient id={skinFingerId} x1="18%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#FDE4D3" />
            <stop offset="55%" stopColor="#F7D2BC" />
            <stop offset="100%" stopColor="#EAB79C" />
          </linearGradient>
          <linearGradient id={skinShadeId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F1C2A8" />
            <stop offset="100%" stopColor="#DF9F82" />
          </linearGradient>
          <linearGradient id={cuffId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E7DCFA" />
            <stop offset="55%" stopColor="#DFD1F6" />
            <stop offset="100%" stopColor="#FADCE9" />
          </linearGradient>
        </defs>

        {/* Warm pastel backdrop aura */}
        <ellipse cx="110" cy="84" rx="76" ry="60" fill={`url(#${auraId})`} />

        {/* Entrance spring pop wrapper */}
        <g className="animate-bluff-hand-pop" style={{ transformOrigin: '110px 104px' }}>
          {/* Cheeky continuous side-to-side wag */}
          <g className="animate-bluff-hand-wag">
            {/* 4 crisp champagne-gold & rose-berry comic motion spark lines radiating outward */}
            <g aria-hidden="true" strokeLinecap="round">
              <path d="M74 34 L61 23" stroke="#E6B85C" strokeWidth="3.2" />
              <path d="M67 56 L51 52" stroke="#D94B7D" strokeWidth="2.8" opacity="0.82" />
              <path d="M146 34 L159 23" stroke="#D94B7D" strokeWidth="3.2" opacity="0.85" />
              <path d="M153 56 L169 52" stroke="#E6B85C" strokeWidth="2.8" />
              <circle cx="84" cy="20" r="2.6" fill="#E6B85C" opacity="0.85" />
              <circle cx="137" cy="21" r="2.4" fill="#D94B7D" opacity="0.78" />
            </g>

            {/* Soft ground shadow under cuff */}
            <ellipse cx="110" cy="148" rx="34" ry="5.5" fill="#D998B4" opacity="0.22" />

            {/* Wrist base */}
            <rect x="92" y="118" width="36" height="19" rx="9" fill={`url(#${skinShadeId})`} />

            {/* Cute pastel lilac & blush wrist cuff */}
            <path
              d="M84 128 Q110 123 136 128 L140 144 Q110 149 80 144 Z"
              fill={`url(#${cuffId})`}
            />
            <path
              d="M83 132.5 Q110 128 137 132.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.72"
            />
            <circle cx="129" cy="138" r="2.8" fill="#F29EB8" opacity="0.85" />

            {/* Extended upright middle finger centered cleanly */}
            <g>
              <rect
                x="98.5"
                y="18"
                width="23"
                height="68"
                rx="11.5"
                fill={`url(#${skinFingerId})`}
              />
              {/* Soft inner highlight down left edge of raised finger */}
              <rect
                x="102.5"
                y="24"
                width="4.5"
                height="48"
                rx="2.25"
                fill="#FFF5EE"
                opacity="0.48"
              />
              {/* Subtle warm shading along right side */}
              <path
                d="M116 24 C120 34 120 66 117 80 L121.5 80 L121.5 28 C121.5 23 118.5 21 116 24 Z"
                fill="#DF9F82"
                opacity="0.28"
              />
              {/* Soft pastel fingernail oval at fingertip */}
              <rect
                x="103.5"
                y="21.5"
                width="13"
                height="13.5"
                rx="6.2"
                fill="#FFF1EB"
                opacity="0.72"
              />
              {/* Gentle middle knuckle crease */}
              <path
                d="M104 49 Q110 47.2 116 49"
                fill="none"
                stroke="#D9987B"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                d="M105 64 Q110 62.6 115 64"
                fill="none"
                stroke="#D9987B"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.42"
              />
            </g>

            {/* Rounded palm base */}
            <path
              d="M74 86 C74 74 84 68 110 68 C136 68 146 74 146 86 L144 107 C142 121 130 128 110 128 C90 128 78 121 76 107 Z"
              fill={`url(#${skinMainId})`}
            />

            {/* Subtle warm lower palm depth shadow */}
            <path
              d="M80 108 C88 120 132 120 140 108 C136 121 125 127 110 127 C95 127 84 121 80 108 Z"
              fill="#DF9F82"
              opacity="0.34"
            />

            {/* Neatly folded Index finger (left of middle finger) */}
            <g>
              <rect
                x="76"
                y="65"
                width="22.5"
                height="31"
                rx="11"
                fill={`url(#${skinFingerId})`}
              />
              <path
                d="M78.5 87 Q87 95 96.5 88"
                fill="none"
                stroke="#D99779"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.62"
              />
              <ellipse cx="84.5" cy="72" rx="4.5" ry="2.2" fill="#FFF4ED" opacity="0.48" />
            </g>

            {/* Neatly folded Ring finger (right of middle finger) */}
            <g>
              <rect
                x="121.5"
                y="67"
                width="21.5"
                height="30"
                rx="10.5"
                fill={`url(#${skinFingerId})`}
              />
              <path
                d="M123.5 88 Q132 95.5 141 88.5"
                fill="none"
                stroke="#D99779"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.62"
              />
              <ellipse cx="130" cy="74" rx="4.2" ry="2" fill="#FFF4ED" opacity="0.46" />
            </g>

            {/* Neatly folded Pinky finger (far right) */}
            <g>
              <rect
                x="136.5"
                y="75"
                width="18.5"
                height="26"
                rx="9.2"
                fill={`url(#${skinShadeId})`}
              />
              <rect
                x="137.5"
                y="75"
                width="15.5"
                height="22"
                rx="7.8"
                fill={`url(#${skinFingerId})`}
              />
              <path
                d="M138.5 92 Q145.5 98 153 92"
                fill="none"
                stroke="#D69274"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.58"
              />
            </g>

            {/* Knuckle separation shadows between curled fingers */}
            <path
              d="M98.5 72 L98.5 90 M121.5 72 L121.5 91 M137 78 L137 94"
              stroke="#DF9F82"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Soft shadow cast by tucked thumb onto palm */}
            <path
              d="M78 96 Q98 92 117 101 Q112 110 92 111 Q79 110 78 96 Z"
              fill="#D99476"
              opacity="0.24"
            />

            {/* Neatly tucked thumb curving across the front of the palm */}
            <g>
              <path
                d="M72 96 C70 84 82 80 96 84 L112 89 C120 91.5 121 101 114 105 C106 109.5 92 108.5 82 105.5 C75 103.5 72.5 100.5 72 96 Z"
                fill={`url(#${skinFingerId})`}
              />
              {/* Soft specular sheen along top edge of thumb */}
              <path
                d="M80 87.5 Q95 86 110 91.5"
                fill="none"
                stroke="#FFF6F0"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.56"
              />
              {/* Soft thumb tip nail hint */}
              <ellipse
                cx="111.5"
                cy="96.5"
                rx="4.2"
                ry="3.1"
                transform="rotate(14 111.5 96.5)"
                fill="#FFF1EB"
                opacity="0.6"
              />
              {/* Warm lower crease under thumb */}
              <path
                d="M81 105.5 Q98 110 114 105"
                fill="none"
                stroke="#D89578"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.58"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * Fullscreen Midnight Countdown Lock Bluff View (`1507` Clown Bluff & `0312` Middle Finger Bluff).
 * Imported exclusively by `MidnightLockOverlay` so zero bluff UI ever appears on the unlocked site.
 */
export function CountdownBluffView({
  variant,
  onBackToCountdown,
}: CountdownBluffViewProps) {
  const isClown = variant === '1507';
  const copy = COUNTDOWN_BLUFF_COPY[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isClown ? 'Access Granted Bluff Screen' : 'Nice Try Detective Bluff Screen'}
      data-testid="countdown-bluff-view"
      data-bluff-variant={variant}
      className="fixed inset-0 z-[10020] flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto"
      style={{
        padding: '24px 18px',
        background:
          'radial-gradient(circle at 12% 10%, rgba(255, 206, 226, 0.35) 0%, transparent 48%), radial-gradient(circle at 88% 88%, rgba(255, 236, 186, 0.32) 0%, transparent 48%), #FFF8FB',
      }}
    >
      <div
        data-testid="countdown-bluff-card"
        className="animate-bluff-reveal stage-short-landscape-card flex w-[min(90vw,500px)] flex-col items-center overflow-y-auto overscroll-contain text-center"
        style={{
          maxHeight: 'calc(88dvh - var(--safe-top) - var(--safe-bottom))',
          padding: 'var(--card-pad-y) var(--card-pad-x)',
          borderRadius: 'var(--card-radius)',
          background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF5F8 100%)',
          border: '1px solid rgba(217, 75, 125, 0.20)',
          boxShadow: '0 18px 40px -18px rgba(176, 62, 106, 0.18)',
        }}
      >
        <p
          data-testid="countdown-bluff-eyebrow"
          className="font-bold tracking-[0.18em] text-[#C93B6B] uppercase"
          style={{ fontSize: 'var(--text-eyebrow)' }}
        >
          {copy.eyebrow}
        </p>

        <div className="mt-3">
          {isClown ? <PastelClownSvg /> : <PastelMiddleFingerSvg />}
        </div>

        <h1
          data-testid="countdown-bluff-headline"
          className="font-display mt-3 leading-[1.18] font-bold tracking-tight text-[#3A1233]"
          style={{ fontSize: 'clamp(24px, 3.8vw, 34px)' }}
        >
          <span>{copy.headlineLead} </span>
          <span className="text-[#C93B6B]">{copy.headlinePunch}</span>
        </h1>

        <p
          data-testid="countdown-bluff-subtext"
          className={
            isClown
              ? 'mt-2.5 max-w-[36ch] leading-relaxed font-medium text-[#7A4A63]'
              : 'mt-2.5 max-w-[36ch] leading-relaxed font-semibold text-[#7A4A63]'
          }
          style={{ fontSize: 'var(--text-body)' }}
        >
          {copy.subtext}
        </p>

        {!isClown && (
          <p
            data-testid="countdown-bluff-footnote"
            className="mt-2 max-w-[36ch] leading-relaxed font-medium text-[#9A6B82]"
            style={{ fontSize: 'var(--text-sub)' }}
          >
            {COUNTDOWN_BLUFF_COPY['0312'].footnote}
          </p>
        )}

        <button
          type="button"
          data-testid="countdown-bluff-back-btn"
          onClick={onBackToCountdown}
          className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#E5B8CC] bg-[#FFFDF8] px-7 py-2.5 font-semibold text-[#5E2846] shadow-[0_6px_16px_-10px_rgba(176,62,106,0.28)] transition-all duration-150 hover:border-[#D94B7D]/60 hover:bg-[#FFF3F7] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
          style={{ minHeight: 'var(--btn-min-h)', fontSize: 'var(--text-body)' }}
        >
          {copy.returnLabel}
        </button>
      </div>
    </div>
  );
}

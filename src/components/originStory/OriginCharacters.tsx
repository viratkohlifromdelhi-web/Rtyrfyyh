import { useId, type ReactNode } from 'react';
import {
  FIVE_TWO_INCHES,
  ORIGIN_SVG_GROUND_Y,
  SCENE_8_GROWTH_STEPS,
  SCENE_9_GROWTH_STEPS,
  inchesToSvgCrownY,
  type KissPhase,
} from './originScript';

export type ShivjeeMood = 'calm' | 'happyTogether' | 'blushKiss' | 'amazed' | 'proudDad';
export type ArchanaMood = 'calm' | 'happyTogether' | 'blushKiss' | 'glowingPregnant' | 'proudMom';
export type AnamikaTeenExpression =
  | 'happy'
  | 'determined'
  | 'bonkBlush'
  | 'proud52'
  | 'birthdayQueen';

interface CharacterClassProps {
  className?: string;
}

function GlossyEyes({
  leftX,
  rightX,
  y,
  radiusX = 3.5,
  radiusY = 4.2,
  mode = 'open',
  lookOffsetX = 0,
  showLashes = false,
  blinkDurSec = 4.0,
  blinkDelaySec = 0.6,
}: {
  leftX: number;
  rightX: number;
  y: number;
  radiusX?: number;
  radiusY?: number;
  mode?: 'open' | 'happyArc' | 'halfClosed' | 'closedSweet' | 'squeezed' | 'wide';
  lookOffsetX?: number;
  showLashes?: boolean;
  blinkDurSec?: number;
  blinkDelaySec?: number;
}) {
  if (mode === 'happyArc') {
    return (
      <g fill="none" stroke="#3A1233" strokeWidth="2.1" strokeLinecap="round">
        <path d={`M ${leftX - 4.2} ${y + 1.2} Q ${leftX} ${y - 4.2} ${leftX + 4.2} ${y + 1.2}`} />
        <path d={`M ${rightX - 4.2} ${y + 1.2} Q ${rightX} ${y - 4.2} ${rightX + 4.2} ${y + 1.2}`} />
      </g>
    );
  }

  if (mode === 'halfClosed') {
    return (
      <g>
        {[leftX, rightX].map((cx, idx) => (
          <g key={idx}>
            <ellipse
              cx={cx + lookOffsetX * 0.75}
              cy={y + 0.8}
              rx={radiusX * 0.92}
              ry={radiusY * 0.44}
              fill="#3A1233"
            />
            <circle
              cx={cx + lookOffsetX * 0.75 - radiusX * 0.22}
              cy={y + 0.35}
              r={0.85}
              fill="#FFFFFF"
              opacity="0.88"
            />
            <path
              d={`M ${cx - 4.3} ${y - 0.6} Q ${cx} ${y + 1.3} ${cx + 4.3} ${y - 0.6}`}
              fill="none"
              stroke="#3A1233"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            {showLashes && (
              <path
                d={
                  idx === 0
                    ? `M ${cx - 4.3} ${y - 0.4} L ${cx - 5.5} ${y + 0.8}`
                    : `M ${cx + 4.3} ${y - 0.4} L ${cx + 5.5} ${y + 0.8}`
                }
                fill="none"
                stroke="#3A1233"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}
      </g>
    );
  }

  if (mode === 'closedSweet') {
    return (
      <g fill="none" stroke="#3A1233" strokeWidth="2" strokeLinecap="round">
        <path d={`M ${leftX - 4.1} ${y - 0.5} Q ${leftX} ${y + 3.4} ${leftX + 4.1} ${y - 0.5}`} />
        <path d={`M ${rightX - 4.1} ${y - 0.5} Q ${rightX} ${y + 3.4} ${rightX + 4.1} ${y - 0.5}`} />
        {showLashes && (
          <>
            <path d={`M ${leftX - 4.2} ${y} L ${leftX - 5.5} ${y + 1.2}`} strokeWidth="1.2" />
            <path d={`M ${rightX + 4.2} ${y} L ${rightX + 5.5} ${y + 1.2}`} strokeWidth="1.2" />
          </>
        )}
      </g>
    );
  }

  if (mode === 'squeezed') {
    return (
      <g
        fill="none"
        stroke="#3A1233"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={`M ${leftX - 4.2} ${y - 2.8} L ${leftX + 3.2} ${y + 0.2} L ${leftX - 4.2} ${y + 3.2}`} />
        <path
          d={`M ${rightX + 4.2} ${y - 2.8} L ${rightX - 3.2} ${y + 0.2} L ${rightX + 4.2} ${y + 3.2}`}
        />
      </g>
    );
  }

  const rx = mode === 'wide' ? radiusX * 1.15 : radiusX;
  const ry = mode === 'wide' ? radiusY * 1.18 : radiusY;

  return (
    <g
      className="origin-story-eye-blink"
      style={{
        transformOrigin: `80px ${y}px`,
        ['--blink-dur' as string]: `${blinkDurSec}s`,
        ['--blink-delay' as string]: `${blinkDelaySec}s`,
      }}
    >
      {[leftX, rightX].map((cx, idx) => (
        <g key={idx}>
          <ellipse cx={cx + lookOffsetX} cy={y} rx={rx} ry={ry} fill="#3A1233" />
          {/* Lower soft rose-plum iris glow */}
          <ellipse
            cx={cx + lookOffsetX}
            cy={y + ry * 0.42}
            rx={rx * 0.62}
            ry={ry * 0.28}
            fill="#8D456F"
            opacity="0.65"
          />
          {/* Dual white specular catchlights */}
          <circle
            cx={cx + lookOffsetX - rx * 0.32}
            cy={y - ry * 0.34}
            r={Math.max(1.15, rx * 0.38)}
            fill="#FFFFFF"
          />
          <circle
            cx={cx + lookOffsetX + rx * 0.34}
            cy={y + ry * 0.26}
            r={Math.max(0.65, rx * 0.2)}
            fill="#FFF7FA"
            opacity="0.92"
          />
          {showLashes && (
            <path
              d={
                idx === 0
                  ? `M ${cx - rx - 1.1} ${y - ry * 0.45} Q ${cx} ${y - ry - 1.4} ${cx + rx + 0.4} ${y - ry * 0.55}`
                  : `M ${cx - rx - 0.4} ${y - ry * 0.55} Q ${cx} ${y - ry - 1.4} ${cx + rx + 1.1} ${y - ry * 0.45}`
              }
              fill="none"
              stroke="#3A1233"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          )}
        </g>
      ))}
    </g>
  );
}

function CharacterShadow({ rx = 30, cy = 221 }: { rx?: number; cy?: number }) {
  return (
    <ellipse
      cx="80"
      cy={cy}
      rx={rx}
      ry="6.2"
      fill="rgba(154, 62, 102, 0.17)"
      className="origin-story-ground-shadow"
      style={{ transformOrigin: `80px ${cy}px` }}
    />
  );
}

/* ==========================================================================
   1. ShivjeeCharacter (Father — Shivjee Kumar)
   ========================================================================== */

export interface ShivjeeCharacterProps extends CharacterClassProps {
  mood?: ShivjeeMood;
  kissPhase?: KissPhase;
  headTiltDeg?: number;
}

export function ShivjeeCharacter({
  mood = 'calm',
  kissPhase = 'idle',
  headTiltDeg = 0,
  className = '',
}: ShivjeeCharacterProps) {
  const uid = useId().replace(/:/g, '');
  const skinId = `${uid}_shivjee_skin`;
  const hairId = `${uid}_shivjee_hair`;
  const kurtaId = `${uid}_shivjee_kurta`;
  const vestId = `${uid}_shivjee_vest`;
  const pantsId = `${uid}_shivjee_pants`;
  const shoeId = `${uid}_shivjee_shoe`;
  const isKissPhaseActive = kissPhase !== 'idle';
  const isKissApproach = kissPhase === 'approach';
  const isKissLeanIn = kissPhase === 'leanIn';
  const isKissing = kissPhase === 'kissing' || (!isKissPhaseActive && mood === 'blushKiss');
  const isKissAfterglow = kissPhase === 'afterglow';
  const isKissEmbrace = isKissLeanIn || isKissing;
  const isHappy = mood === 'happyTogether' || mood === 'proudDad';
  const isAmazed = mood === 'amazed';

  const blushOpacity = isKissing
    ? 0.88
    : isKissLeanIn
      ? 0.72
      : isKissAfterglow
        ? 0.68
        : isKissApproach
          ? 0.46
          : isHappy
            ? 0.44
            : 0.32;
  const eyeMode: 'open' | 'happyArc' | 'halfClosed' | 'closedSweet' | 'wide' = isKissing
    ? 'closedSweet'
    : isKissLeanIn
      ? 'halfClosed'
      : isKissApproach || isKissAfterglow
        ? 'open'
        : isHappy
          ? 'happyArc'
          : isAmazed
            ? 'wide'
            : 'open';
  const lookOffsetX = isKissApproach || isKissLeanIn || isKissAfterglow ? 2.1 : mood === 'happyTogether' ? 1 : 0;
  const resolvedHeadTilt = headTiltDeg !== 0 ? headTiltDeg : isKissing ? 7 : isKissLeanIn ? 6.2 : 0;

  return (
    <svg
      viewBox="0 0 160 230"
      aria-label="Shivjee Kumar"
      className={`block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={skinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCE0CC" />
          <stop offset="70%" stopColor="#F5CCB0" />
          <stop offset="100%" stopColor="#EBB897" />
        </linearGradient>
        <linearGradient id={hairId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#412438" />
          <stop offset="55%" stopColor="#2B1525" />
          <stop offset="100%" stopColor="#1E0D1A" />
        </linearGradient>
        <linearGradient id={kurtaId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFBF3" />
          <stop offset="65%" stopColor="#F8ECDA" />
          <stop offset="100%" stopColor="#EED9BC" />
        </linearGradient>
        <linearGradient id={vestId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#77968E" />
          <stop offset="55%" stopColor="#5D7B74" />
          <stop offset="100%" stopColor="#49645E" />
        </linearGradient>
        <linearGradient id={pantsId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ECE1CE" />
          <stop offset="100%" stopColor="#D3C2A8" />
        </linearGradient>
        <linearGradient id={shoeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#865A48" />
          <stop offset="100%" stopColor="#5E3B2E" />
        </linearGradient>
      </defs>

      <CharacterShadow rx={31} />

      {/* Legs & tailored cream trousers */}
      <g>
        <rect x="61" y="156" width="16" height="54" rx="7.5" fill={`url(#${pantsId})`} />
        <rect x="83" y="156" width="16" height="54" rx="7.5" fill={`url(#${pantsId})`} />
        {/* Warm brown loafers */}
        <path
          d="M 58 209 C 58 205 64 204 71 204 C 77 204 79 207 79 213 C 79 218 75 220 67 220 C 60 220 58 216 58 209 Z"
          fill={`url(#${shoeId})`}
        />
        <path
          d="M 81 213 C 81 207 83 204 89 204 C 96 204 102 205 102 209 C 102 216 100 220 93 220 C 85 220 81 218 81 213 Z"
          fill={`url(#${shoeId})`}
        />
        <ellipse cx="67" cy="208" rx="4.5" ry="1.6" fill="#FFFFFF" opacity="0.2" />
        <ellipse cx="93" cy="208" rx="4.5" ry="1.6" fill="#FFFFFF" opacity="0.2" />
      </g>

      {/* Arms (ivory kurta sleeves + warm hands) */}
      <g>
        {/* Left arm */}
        <path
          d={
            mood === 'proudDad' || isAmazed
              ? 'M 55 104 C 42 114 38 128 45 140 C 49 145 55 143 57 137 C 58 129 60 120 62 112 Z'
              : 'M 55 104 C 46 116 44 134 48 148 C 50 153 56 153 58 148 C 60 136 60 122 62 111 Z'
          }
          fill={`url(#${kurtaId})`}
        />
        <circle
          cx={mood === 'proudDad' || isAmazed ? 49 : 53}
          cy={mood === 'proudDad' || isAmazed ? 142 : 151}
          r="5.6"
          fill={`url(#${skinId})`}
        />

        {/* Right inner arm (dedicated kissArmGroup reaching gently toward Archana's waist/shoulder during leanIn & kissing) */}
        <g data-layer="kissArmGroup">
          <path
            d={
              isKissEmbrace
                ? 'M 103 105 C 115 113 125 123 127 132 C 128 137 123 141 118 139 C 111 134 105 125 99 114 Z'
                : mood === 'proudDad' || isAmazed
                  ? 'M 105 104 C 118 114 122 128 115 140 C 111 145 105 143 103 137 C 102 129 100 120 98 112 Z'
                  : 'M 105 104 C 114 116 116 134 112 148 C 110 153 104 153 102 148 C 100 136 100 122 98 111 Z'
            }
            fill={`url(#${kurtaId})`}
          />
          <circle
            cx={isKissEmbrace ? 124 : mood === 'proudDad' || isAmazed ? 111 : 107}
            cy={isKissEmbrace ? 136 : mood === 'proudDad' || isAmazed ? 142 : 151}
            r="5.6"
            fill={`url(#${skinId})`}
          />
        </g>
      </g>

      {/* Ivory Kurta Base + Muted Sage-Teal Nehru Vest */}
      <g>
        {/* Lower kurta hem */}
        <path
          d="M 55 101 C 55 96 63 93 80 93 C 97 93 105 96 105 101 L 107 166 C 107 170 96 173 80 173 C 64 173 53 170 53 166 Z"
          fill={`url(#${kurtaId})`}
        />
        {/* Sage-teal Nehru vest */}
        <path
          d="M 56 101 C 57 96 66 93 80 93 C 94 93 103 96 104 101 L 103 153 C 103 156 93 158 80 158 C 67 158 57 156 57 153 Z"
          fill={`url(#${vestId})`}
        />
        {/* Crisp ivory Mandarin collar peek */}
        <path
          d="M 70 93 Q 80 101 90 93 L 88 89 Q 80 95 72 89 Z"
          fill="#FFFDF8"
        />
        {/* Center vest placket subtle seam */}
        <line
          x1="80"
          y1="99"
          x2="80"
          y2="155"
          stroke="rgba(255, 251, 243, 0.24)"
          strokeWidth="1.1"
        />
        {/* Delicate gold Nehru buttons */}
        {[107, 119, 131, 143].map((by) => (
          <circle key={by} cx="80" cy={by} r="2" fill="#E6B85C" />
        ))}
        {/* Refined pocket square trim */}
        <path d="M 88 114 L 97 114 L 96 111 L 91 111 Z" fill="#F7D994" opacity="0.9" />
        <line x1="87.5" y1="114.5" x2="97.5" y2="114.5" stroke="#3E5650" strokeWidth="1" />
      </g>

      {/* Neck Anchor & Dedicated Neck-Pivoted Head Group (transform-origin at base of neck 80,92) */}
      <g>
        <rect x="74" y="83" width="12" height="13" rx="5.5" fill={`url(#${skinId})`} />
        {/* Soft neck shadow */}
        <path d="M 74 86 Q 80 91 86 86 L 86 83 L 74 83 Z" fill="rgba(180, 112, 82, 0.22)" />

        <g
          data-layer="headGroup"
          style={{
            transformOrigin: '80px 92px',
            transform: `rotate(${resolvedHeadTilt}deg)`,
            transition: 'transform 550ms cubic-bezier(0.37, 0, 0.63, 1)',
          }}
        >
          {/* Ears */}
          <ellipse cx="55.5" cy="65" rx="4.2" ry="5.5" fill={`url(#${skinId})`} />
          <ellipse cx="104.5" cy="65" rx="4.2" ry="5.5" fill={`url(#${skinId})`} />

          {/* Rounded warm anime-chibi face */}
          <path
            d="M 56 59 C 56 42 66 34 80 34 C 94 34 104 42 104 59 C 104 76 94 87 80 87 C 66 87 56 76 56 59 Z"
            fill={`url(#${skinId})`}
          />

          {/* Softly layered dark espresso-plum hair */}
          <path
            d="M 54 57 C 53 38 64 26 80 26 C 96 26 107 38 106 57 C 105 51 102 45 97 43 C 92 48 83 49 74 46 C 67 44 60 48 56 57 Z"
            fill={`url(#${hairId})`}
          />
          {/* Side swoop lock */}
          <path
            d="M 62 35 C 72 30 89 30 98 40 C 90 42 79 42 70 39 Z"
            fill="#4A2B40"
            opacity="0.55"
          />
          {/* Subtle hair shine highlight arc */}
          <path
            d="M 67 34 Q 80 29 93 35"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.22"
          />

          {/* Friendly eyebrows */}
          <g fill="none" stroke="#361A2E" strokeWidth="1.7" strokeLinecap="round">
            <path
              d={
                isAmazed
                  ? 'M 65 54 Q 70 50.5 75 54'
                  : isKissEmbrace
                    ? 'M 65 56.6 Q 70 55.2 75 56.8'
                    : 'M 65 56 Q 70 54 75 55.8'
              }
            />
            <path
              d={
                isAmazed
                  ? 'M 85 54 Q 90 50.5 95 54'
                  : isKissEmbrace
                    ? 'M 85 56.8 Q 90 55.2 95 56.6'
                    : 'M 85 55.8 Q 90 54 95 56'
              }
            />
          </g>

          {/* Glossy plum eyes (staggered 4.3s natural blink) */}
          <GlossyEyes
            leftX={70}
            rightX={90}
            y={63}
            radiusX={3.4}
            radiusY={4.1}
            mode={eyeMode}
            lookOffsetX={lookOffsetX}
            blinkDurSec={4.3}
            blinkDelaySec={0.35}
          />

          {/* Rosy blush cheeks */}
          <ellipse cx="63.5" cy="70" rx="5.5" ry="3.2" fill="#E8779F" opacity={blushOpacity} />
          <ellipse cx="96.5" cy="70" rx="5.5" ry="3.2" fill="#E8779F" opacity={blushOpacity} />

          {/* Shy afterglow cheek glints */}
          {isKissAfterglow && (
            <g className="origin-story-afterglow-twinkle">
              <path d="M 52 58 L 53.3 61 L 56.3 62.3 L 53.3 63.6 L 52 66.6 L 50.7 63.6 L 47.7 62.3 L 50.7 61 Z" fill="#FFE7A8" />
              <circle cx="109" cy="68" r="1.8" fill="#F9B5D2" />
            </g>
          )}

          {/* Friendly neat mustache (shifts gently right toward inner profile during kiss) */}
          <path
            d={
              isKissing
                ? 'M 77.5 74 Q 81.2 71.5 85 73.5 Q 88.8 71.5 92.5 74 Q 88.8 75.6 85 74.9 Q 81.2 75.6 77.5 74 Z'
                : 'M 72.5 73.8 Q 76.2 71.2 80 73.2 Q 83.8 71.2 87.5 73.8 Q 83.8 75.5 80 74.7 Q 76.2 75.5 72.5 73.8 Z'
            }
            fill="#2D1526"
          />

          {/* Expressive smile / inner-facing kiss curve */}
          {isKissing ? (
            <path
              d="M 94.5 78.2 Q 99.6 79.4 97.6 80.7 Q 99.6 82.0 94.8 82.8"
              fill="none"
              stroke="#C93B6B"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ) : isKissLeanIn ? (
            <path
              d="M 80.5 78 Q 86.2 81.2 91.5 78.8"
              fill="none"
              stroke="#8B385C"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          ) : isKissAfterglow ? (
            <path
              d="M 75.5 77.5 Q 81.5 82.6 87.2 77.5"
              fill="none"
              stroke="#6C2D4E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ) : isAmazed ? (
            <ellipse cx="80" cy="79.5" rx="3.2" ry="3.6" fill="#D96B8C" />
          ) : (
            <path
              d={
                isHappy
                  ? 'M 74.5 77.4 Q 80 82.8 85.5 77.4'
                  : 'M 75.5 78 Q 80 81.4 84.5 78'
              }
              fill="none"
              stroke="#592842"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          )}
        </g>
      </g>
    </svg>
  );
}

/* ==========================================================================
   2. ArchanaCharacter (Mother — Archana, smooth anatomical bellyLayer 0..9)
   ========================================================================== */

export interface ArchanaCharacterProps extends CharacterClassProps {
  mood?: ArchanaMood;
  pregnancyMonth?: number;
  kissPhase?: KissPhase;
  headTiltDeg?: number;
}

export function ArchanaCharacter({
  mood = 'calm',
  pregnancyMonth = 0,
  kissPhase = 'idle',
  headTiltDeg = 0,
  className = '',
}: ArchanaCharacterProps) {
  const uid = useId().replace(/:/g, '');
  const skinId = `${uid}_archana_skin`;
  const hairId = `${uid}_archana_hair`;
  const sareeId = `${uid}_archana_saree`;
  const blouseId = `${uid}_archana_blouse`;
  const zariId = `${uid}_archana_zari`;
  const glowId = `${uid}_archana_glow`;
  const clampedMonth = Math.max(0, Math.min(9, pregnancyMonth));
  const pregT = clampedMonth / 9;
  const bellyBulge = pregT * 17.5;

  const isKissPhaseActive = kissPhase !== 'idle';
  const isKissApproach = kissPhase === 'approach';
  const isKissLeanIn = kissPhase === 'leanIn';
  const isKissing = kissPhase === 'kissing' || (!isKissPhaseActive && mood === 'blushKiss');
  const isKissAfterglow = kissPhase === 'afterglow';
  const isKissEmbrace = isKissLeanIn || isKissing;
  const isGlowing = mood === 'glowingPregnant' || clampedMonth > 0;
  const isHappy = mood === 'happyTogether' || mood === 'proudMom' || isGlowing;

  const blushOpacity = isKissing
    ? 0.88
    : isKissLeanIn
      ? 0.72
      : isKissAfterglow
        ? 0.72
        : isKissApproach
          ? 0.48
          : isHappy
            ? 0.5
            : 0.38;
  const eyeMode: 'open' | 'happyArc' | 'halfClosed' | 'closedSweet' = isKissing
    ? 'closedSweet'
    : isKissLeanIn
      ? 'halfClosed'
      : isKissApproach || isKissAfterglow
        ? 'open'
        : mood === 'proudMom' || mood === 'happyTogether'
          ? 'happyArc'
          : 'open';
  const lookOffsetX = isKissApproach || isKissLeanIn || isKissAfterglow ? -2.1 : 0;
  const resolvedHeadTilt = headTiltDeg !== 0 ? headTiltDeg : isKissing ? -7 : isKissLeanIn ? -6.2 : 0;

  return (
    <svg
      viewBox="0 0 160 230"
      aria-label="Archana"
      className={`block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={skinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE2CE" />
          <stop offset="72%" stopColor="#F5CCB0" />
          <stop offset="100%" stopColor="#EAB898" />
        </linearGradient>
        <linearGradient id={hairId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3F2136" />
          <stop offset="55%" stopColor="#2A1324" />
          <stop offset="100%" stopColor="#1D0C19" />
        </linearGradient>
        <linearGradient id={sareeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE2ED" />
          <stop offset="50%" stopColor="#F4B6D0" />
          <stop offset="100%" stopColor="#E390B4" />
        </linearGradient>
        <linearGradient id={blouseId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E787AE" />
          <stop offset="100%" stopColor="#CE6592" />
        </linearGradient>
        <linearGradient id={zariId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F7DC98" />
          <stop offset="50%" stopColor="#E6B85C" />
          <stop offset="100%" stopColor="#F5D78E" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF0C2" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#FAD0E0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Warm radiant glow when pregnant */}
      {isGlowing && (
        <ellipse
          cx={80 - bellyBulge * 0.35}
          cy="152"
          rx={32 + pregT * 14}
          ry={34 + pregT * 10}
          fill={`url(#${glowId})`}
          opacity={0.35 + pregT * 0.55}
        />
      )}

      <CharacterShadow rx={30 + pregT * 4} />

      {/* Back flowing hair + neat low side bun with tiny champagne-gold pearl pin */}
      <g>
        <circle cx="101" cy="86" r="11" fill={`url(#${hairId})`} />
        <circle cx="98" cy="79" r="2.2" fill="#F7D994" />
        <circle cx="103" cy="81" r="2" fill="#FFF4D1" />
        <circle cx="106" cy="85" r="1.8" fill="#F7D994" />
        <path
          d="M 57 73 C 54 92 56 108 61 116 L 99 116 C 103 107 104 92 103 73 Z"
          fill={`url(#${hairId})`}
        />
      </g>

      {/* Delicate sandals peeking cleanly at baseline y = 220 */}
      <g>
        <ellipse cx="70" cy="217.5" rx="7.5" ry="3.2" fill="#D5957A" />
        <ellipse cx="90" cy="217.5" rx="7.5" ry="3.2" fill="#D5957A" />
        <path d="M 65 217 Q 70 214.5 75 217" fill="none" stroke="#E8C170" strokeWidth="1.2" />
        <path d="M 85 217 Q 90 214.5 95 217" fill="none" stroke="#E8C170" strokeWidth="1.2" />
      </g>

      {/* Graceful blush saree drape + integrated smooth anatomical bellyLayer */}
      <g data-layer="sareeAndBelly">
        {/* Blouse torso */}
        <path
          d="M 61 109 C 62 102 70 100 80 100 C 90 100 98 102 99 109 L 97 132 L 63 132 Z"
          fill={`url(#${blouseId})`}
        />
        {/* Left & right short blush sleeves */}
        <ellipse cx="59" cy="113" rx="6.8" ry="8.2" transform="rotate(16 59 113)" fill={`url(#${blouseId})`} />
        <ellipse cx="101" cy="113" rx="6.8" ry="8.2" transform="rotate(-16 101 113)" fill={`url(#${blouseId})`} />

        {/* Flowing saree skirt with smooth curved maternity contour */}
        <path
          d={`M 63 130
              C ${58 - bellyBulge} ${145 + pregT * 2} ${55 - bellyBulge * 0.95} ${168} ${56 - bellyBulge * 0.2} 214
              Q 80 219 105 214
              C 105 182 103 152 97 130 Z`}
          fill={`url(#${sareeId})`}
        />

        {/* Soft pleated drape folds */}
        <path
          d={`M ${76 - bellyBulge * 0.25} 138 Q ${73 - bellyBulge * 0.2} 175 74 215`}
          fill="none"
          stroke="rgba(182, 82, 122, 0.2)"
          strokeWidth="1.3"
        />
        <path
          d="M 86 138 Q 88 175 88 215"
          fill="none"
          stroke="rgba(182, 82, 122, 0.18)"
          strokeWidth="1.3"
        />

        {/* Smooth maternity belly warm sheen integrated directly inside saree drape */}
        {pregT > 0.02 && (
          <path
            d={`M ${64 - bellyBulge * 0.2} 135
                C ${58 - bellyBulge * 0.95} 145 ${58 - bellyBulge * 0.9} 166 ${72 - bellyBulge * 0.15} 173
                C ${80} 166 ${80} 144 ${64 - bellyBulge * 0.2} 135 Z`}
            fill="#FFF7FA"
            opacity={0.18 + pregT * 0.34}
          />
        )}

        {/* Diagonal blush pallu drape with champagne-gold zari border */}
        <path
          d={`M 61 105 L 74 103 C 86 120 ${96 - bellyBulge * 0.12} 142 103 166 L 91 171 C 82 148 ${71 - bellyBulge * 0.32} 130 61 105 Z`}
          fill={`url(#${sareeId})`}
        />
        {/* Zari gold diagonal border */}
        <path
          d={`M 62 106 C 72 128 ${83 - bellyBulge * 0.2} 148 92 170`}
          fill="none"
          stroke={`url(#${zariId})`}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {/* Champagne-gold saree bottom hem border */}
        <path
          d={`M ${56 - bellyBulge * 0.18} 211 Q 80 216 105 211`}
          fill="none"
          stroke={`url(#${zariId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </g>

      {/* Graceful arms & hands (inner left arm rests gently near Shivjee's chest/shoulder during leanIn & kissing) */}
      <g>
        {/* Left inner arm (kissArmGroup) */}
        <g data-layer="kissArmGroup">
          <path
            d={
              isKissEmbrace
                ? 'M 59 116 C 47 121 38 124 34 119 C 32 115 36 111 41 113 C 47 115 54 114 62 112 Z'
                : 'M 58 117 C 52 130 51 144 55 155 C 57 159 62 158 63 154 C 62 143 62 131 63 120 Z'
            }
            fill={`url(#${skinId})`}
          />
          {/* Gold bangle left */}
          <ellipse
            cx={isKissEmbrace ? 41 : 59}
            cy={isKissEmbrace ? 117.5 : 152}
            rx="3.4"
            ry="1.3"
            transform={isKissEmbrace ? 'rotate(-16 41 117.5)' : undefined}
            fill="#E6B85C"
          />
        </g>

        {/* Right arm (cradles belly smoothly when pregnant) */}
        <path
          d={
            pregT > 0.05
              ? `M 101 117 C 107 132 102 149 ${76 - bellyBulge * 0.48} 156 C ${71 - bellyBulge * 0.48} 157 ${69 - bellyBulge * 0.48} 152 ${74 - bellyBulge * 0.48} 149 C 93 144 98 133 96 119 Z`
              : 'M 101 117 C 107 130 108 144 104 155 C 102 159 97 158 96 154 C 97 143 97 131 96 120 Z'
          }
          fill={`url(#${skinId})`}
        />
        <ellipse
          cx={pregT > 0.05 ? 77 - bellyBulge * 0.45 : 100}
          cy={pregT > 0.05 ? 152 : 152}
          rx="3.4"
          ry="1.3"
          fill="#E6B85C"
        />
      </g>

      {/* Neck Anchor & Dedicated Neck-Pivoted Head Group (transform-origin at base of neck 80,102) */}
      <g>
        <rect x="74.5" y="92" width="11" height="12" rx="5" fill={`url(#${skinId})`} />
        {/* Delicate gold necklace */}
        <path
          d="M 71 102 Q 80 108 89 102"
          fill="none"
          stroke="#E6B85C"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="80" cy="105.6" r="1.7" fill="#D94B7D" />

        <g
          data-layer="headGroup"
          style={{
            transformOrigin: '80px 102px',
            transform: `rotate(${resolvedHeadTilt}deg)`,
            transition: 'transform 550ms cubic-bezier(0.37, 0, 0.63, 1)',
          }}
        >
          {/* Tiny gold jhumka earrings */}
          <circle cx="57" cy="80.5" r="2.2" fill="#E6B85C" />
          <path d="M 55 82.2 L 59 82.2 L 57 85.4 Z" fill="#F7D994" />
          <circle cx="103" cy="80.5" r="2.2" fill="#E6B85C" />
          <path d="M 101 82.2 L 105 82.2 L 103 85.4 Z" fill="#F7D994" />

          {/* Soft oval face */}
          <path
            d="M 58 69 C 58 53 67 45 80 45 C 93 45 102 53 102 69 C 102 85 93 95 80 95 C 67 95 58 85 58 69 Z"
            fill={`url(#${skinId})`}
          />

          {/* Center-parted flowing dark hair framing face */}
          <path
            d="M 55 72 C 54 50 65 38 80 38 C 95 38 106 50 105 72 C 102 62 96 54 81 51 C 79 51 79 51 79 51 C 64 54 58 62 55 72 Z"
            fill={`url(#${hairId})`}
          />
          {/* Soft glossy hair sheen arcs */}
          <path
            d="M 65 46 Q 72 42 78 45"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            opacity="0.24"
          />
          <path
            d="M 82 45 Q 88 42 95 46"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            opacity="0.24"
          />

          {/* Delicate Warm Rose Berry bindi */}
          <circle cx="80" cy="60.5" r="1.9" fill="#D94B7D" />

          {/* Soft arched eyebrows */}
          <g fill="none" stroke="#3A1A2F" strokeWidth="1.35" strokeLinecap="round">
            <path d="M 66 64.8 Q 70.5 62.6 75 64.5" />
            <path d="M 85 64.5 Q 89.5 62.6 94 64.8" />
          </g>

          {/* Expressive glossy eyes with subtle lashes (staggered 3.6s natural blink) */}
          <GlossyEyes
            leftX={70.5}
            rightX={89.5}
            y={71.5}
            radiusX={3.4}
            radiusY={4.2}
            mode={eyeMode}
            lookOffsetX={lookOffsetX}
            showLashes
            blinkDurSec={3.6}
            blinkDelaySec={1.45}
          />

          {/* Rosy blush cheeks */}
          <ellipse cx="64.5" cy="78" rx="5.5" ry="3.2" fill="#EC7CA4" opacity={blushOpacity} />
          <ellipse cx="95.5" cy="78" rx="5.5" ry="3.2" fill="#EC7CA4" opacity={blushOpacity} />

          {/* Shy afterglow cheek glints */}
          {isKissAfterglow && (
            <g className="origin-story-afterglow-twinkle" style={{ animationDelay: '0.35s' }}>
              <path
                d="M 108 66 L 109.3 69 L 112.3 70.3 L 109.3 71.6 L 108 74.6 L 106.7 71.6 L 103.7 70.3 L 106.7 69 Z"
                fill="#FFE7A8"
              />
              <circle cx="51" cy="74" r="1.8" fill="#F9B5D2" />
            </g>
          )}

          {/* Sweet smile / inner-facing kiss pucker */}
          {isKissing ? (
            <path
              d="M 65.5 83.4 Q 60.4 84.6 62.4 86.0 Q 60.4 87.3 65.2 88.2"
              fill="none"
              stroke="#D94B7D"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ) : isKissLeanIn ? (
            <path
              d="M 68.8 84.6 Q 74.0 87.2 79.4 84.0"
              fill="none"
              stroke="#B43E6E"
              strokeWidth="1.65"
              strokeLinecap="round"
            />
          ) : isKissAfterglow ? (
            <path
              d="M 73.2 83.2 Q 79.0 88.5 84.8 83.2"
              fill="none"
              stroke="#B43E6E"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          ) : (
            <path
              d={
                isHappy
                  ? 'M 74.8 83.6 Q 80 88.8 85.2 83.6'
                  : 'M 75.8 84 Q 80 87.4 84.2 84'
              }
              fill="none"
              stroke="#9B3960"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          )}
        </g>
      </g>
    </svg>
  );
}

/* ==========================================================================
   3A. AnamikaNewborn (Age 0 — ~28% chart height, unified baseline y = 220)
   ========================================================================== */

export function AnamikaNewborn({ className = '' }: CharacterClassProps) {
  const uid = useId().replace(/:/g, '');
  const swaddleId = `${uid}_newborn_swaddle`;
  const skinId = `${uid}_newborn_skin`;
  const haloId = `${uid}_newborn_halo`;
  return (
    <svg
      viewBox="0 0 160 230"
      aria-label="Baby Anamika"
      className={`block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={swaddleId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF9E8" />
          <stop offset="55%" stopColor="#FDE7F0" />
          <stop offset="100%" stopColor="#F9CBE0" />
        </linearGradient>
        <linearGradient id={skinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE9DA" />
          <stop offset="100%" stopColor="#F8D0B9" />
        </linearGradient>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF2C6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FCE0EB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft golden aura behind cradle */}
      <circle cx="80" cy="186" r="44" fill={`url(#${haloId})`} />
      <CharacterShadow rx={30} cy={220} />

      {/* Soft cloud-rose cradle cushion grounded at y = 220 */}
      <path
        d="M 48 214 C 48 202 60 197 80 197 C 100 197 112 202 112 214 C 112 219 102 221 80 221 C 58 221 48 219 48 214 Z"
        fill="#FFF7FA"
      />
      <path
        d="M 52 213 Q 80 218 108 213"
        fill="none"
        stroke="#F2B8CF"
        strokeWidth="1.4"
        opacity="0.7"
      />

      {/* Swaddled newborn cocoon (crown sits near y = 158 = ~28% chart height) */}
      <g>
        <path
          d="M 54 196 C 53 177 63 166 80 166 C 97 166 107 177 106 196 C 105 210 95 216 80 216 C 65 216 55 210 54 196 Z"
          fill={`url(#${swaddleId})`}
        />
        {/* Cozy diagonal blanket fold */}
        <path
          d="M 57 192 Q 80 202 103 190"
          fill="none"
          stroke="#ECACC7"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M 60 203 Q 80 209 100 202"
          fill="none"
          stroke="#E8C170"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Tiny pink peeking mittens */}
        <circle cx="62" cy="195" r="4.6" fill="#FFDDE9" />
        <circle cx="98" cy="195" r="4.6" fill="#FFDDE9" />

        {/* Satin rose ribbon bow on swaddle */}
        <g transform="translate(80 202)">
          <ellipse cx="-6.5" cy="0" rx="5.5" ry="3.4" fill="#EB82AA" />
          <ellipse cx="6.5" cy="0" rx="5.5" ry="3.4" fill="#EB82AA" />
          <circle cx="0" cy="0" r="2.8" fill="#D94B7D" />
        </g>

        {/* Adorable round baby head */}
        <circle cx="80" cy="176" r="17.5" fill={`url(#${skinId})`} />
        {/* Sweet baby forehead curl */}
        <path
          d="M 79 158.5 C 74 159 73 165 78 166.5 C 82 167.5 85 164 82.5 161.8"
          fill="none"
          stroke="#35192D"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Tiny side hair tufts */}
        <path d="M 64 170 Q 67 162 74 160" fill="none" stroke="#35192D" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M 96 170 Q 93 162 86 160" fill="none" stroke="#35192D" strokeWidth="2.2" strokeLinecap="round" />

        {/* Peaceful happy curved baby lashes */}
        <GlossyEyes leftX={73.2} rightX={86.8} y={176} mode="happyArc" />

        {/* Chubby rosy baby cheeks */}
        <ellipse cx="68.5" cy="180.8" rx="4.4" ry="2.7" fill="#F085AC" opacity="0.58" />
        <ellipse cx="91.5" cy="180.8" rx="4.4" ry="2.7" fill="#F085AC" opacity="0.58" />

        {/* Sweet tiny baby smile */}
        <path
          d="M 76.5 182.8 Q 80 186.2 83.5 182.8"
          fill="none"
          stroke="#9E3B63"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {/* Orbiting delicate baby sparkles */}
      <g fill="#E6B85C">
        <path
          d="M 46 168 L 47.6 171.6 L 51.2 173.2 L 47.6 174.8 L 46 178.4 L 44.4 174.8 L 40.8 173.2 L 44.4 171.6 Z"
          className="origin-story-orbit-star"
        />
        <path
          d="M 114 164 L 115.4 167.2 L 118.6 168.6 L 115.4 170 L 114 173.2 L 112.6 170 L 109.4 168.6 L 112.6 167.2 Z"
          fill="#EC82A9"
          className="origin-story-orbit-star"
          style={{ ['--orbit-delay' as string]: '0.5s' }}
        />
        <circle cx="80" cy="150" r="2.1" fill="#F7D994" className="origin-story-orbit-star" />
      </g>
    </svg>
  );
}

/* ==========================================================================
   3B. AnamikaToddler (Ages 1 to 3 — true proportional growth, zero scale())
   ========================================================================== */

export interface AnamikaToddlerProps extends CharacterClassProps {
  age: number; // 1..3
}

export function AnamikaToddler({ age, className = '' }: AnamikaToddlerProps) {
  const uid = useId().replace(/:/g, '');
  const skinId = `${uid}_toddler_skin`;
  const hairId = `${uid}_toddler_hair`;
  const frockId = `${uid}_toddler_frock`;
  const clampedAge = Math.max(1, Math.min(3, Math.round(age)));
  const step = SCENE_8_GROWTH_STEPS.find((s) => s.age === clampedAge) ?? SCENE_8_GROWTH_STEPS[1];
  const crownY = inchesToSvgCrownY(step.inches);
  const totalHeight = ORIGIN_SVG_GROUND_Y - crownY;

  // Natural toddler head-to-body ratio (cute chubby head, growing frock & toddler legs)
  const headRy = 18.8 + (clampedAge - 1) * 0.9;
  const headRx = headRy * 1.04;
  const headCy = crownY + headRy + 3;
  const neckY = headCy + headRy - 2;
  const shoeTopY = ORIGIN_SVG_GROUND_Y - 7;
  const bodySpan = shoeTopY - neckY;
  const frockBottomY = neckY + bodySpan * 0.66;
  const kneeY = frockBottomY + (shoeTopY - frockBottomY) * 0.45;
  const waveLift = clampedAge % 2 === 1 ? -5 : 2;

  return (
    <svg
      viewBox="0 0 160 230"
      aria-label={`Toddler Anamika age ${clampedAge}`}
      className={`block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={skinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE7D6" />
          <stop offset="100%" stopColor="#F5CBB1" />
        </linearGradient>
        <linearGradient id={hairId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3E2036" />
          <stop offset="100%" stopColor="#220E1D" />
        </linearGradient>
        <linearGradient id={frockId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE8DF" />
          <stop offset="55%" stopColor="#FBC6DC" />
          <stop offset="100%" stopColor="#F2A4C5" />
        </linearGradient>
      </defs>

      <CharacterShadow rx={22 + clampedAge * 1.5} />

      {/* Cute twin mini-pigtails with champagne-gold bows */}
      <g>
        <circle cx={80 - headRx - 5} cy={headCy - 4} r={7.5 + clampedAge * 0.4} fill={`url(#${hairId})`} />
        <circle cx={80 + headRx + 5} cy={headCy - 4} r={7.5 + clampedAge * 0.4} fill={`url(#${hairId})`} />
        {/* Champagne-gold mini bows */}
        <g transform={`translate(${80 - headRx - 1} ${headCy - 9}) rotate(-18)`}>
          <ellipse cx="-3.6" cy="0" rx="3.4" ry="2.2" fill="#F7D994" />
          <ellipse cx="3.6" cy="0" rx="3.4" ry="2.2" fill="#F7D994" />
          <circle cx="0" cy="0" r="1.7" fill="#E6B85C" />
        </g>
        <g transform={`translate(${80 + headRx + 1} ${headCy - 9}) rotate(18)`}>
          <ellipse cx="-3.6" cy="0" rx="3.4" ry="2.2" fill="#F7D994" />
          <ellipse cx="3.6" cy="0" rx="3.4" ry="2.2" fill="#F7D994" />
          <circle cx="0" cy="0" r="1.7" fill="#E6B85C" />
        </g>
      </g>

      {/* Toddler legs, rosy knees, cream socks & tiny Mary-Jane shoes */}
      <g>
        <rect
          x="67"
          y={frockBottomY - 5}
          width="9.5"
          height={shoeTopY - frockBottomY + 8}
          rx="4.6"
          fill={`url(#${skinId})`}
        />
        <rect
          x="83.5"
          y={frockBottomY - 5}
          width="9.5"
          height={shoeTopY - frockBottomY + 8}
          rx="4.6"
          fill={`url(#${skinId})`}
        />
        {/* Cute rosy knees */}
        <ellipse cx="71.8" cy={kneeY} rx="3.2" ry="1.8" fill="#F198B9" opacity="0.45" />
        <ellipse cx="88.2" cy={kneeY} rx="3.2" ry="1.8" fill="#F198B9" opacity="0.45" />
        {/* White socks */}
        <rect x="66.8" y={shoeTopY - 5} width="9.9" height="8" rx="3" fill="#FFFDFB" />
        <rect x="83.3" y={shoeTopY - 5} width="9.9" height="8" rx="3" fill="#FFFDFB" />
        {/* Blush Mary-Jane shoes */}
        <ellipse cx="71.2" cy={ORIGIN_SVG_GROUND_Y - 2.2} rx="7.2" ry="4.1" fill="#D95E8D" />
        <ellipse cx="88.8" cy={ORIGIN_SVG_GROUND_Y - 2.2} rx="7.2" ry="4.1" fill="#D95E8D" />
        <path
          d={`M 66 ${ORIGIN_SVG_GROUND_Y - 3.6} Q 71.2 ${ORIGIN_SVG_GROUND_Y - 5.2} 76 ${ORIGIN_SVG_GROUND_Y - 3.6}`}
          fill="none"
          stroke="#FCE4EF"
          strokeWidth="1.2"
        />
        <path
          d={`M 84 ${ORIGIN_SVG_GROUND_Y - 3.6} Q 88.8 ${ORIGIN_SVG_GROUND_Y - 5.2} 94 ${ORIGIN_SVG_GROUND_Y - 3.6}`}
          fill="none"
          stroke="#FCE4EF"
          strokeWidth="1.2"
        />
      </g>

      {/* Cheerful waving toddler arms */}
      <g>
        <path
          d={`M 64 ${neckY + 7} Q 49 ${neckY + 8 + waveLift} 48 ${neckY + 18 + waveLift}`}
          fill="none"
          stroke={`url(#${skinId})`}
          strokeWidth="7.6"
          strokeLinecap="round"
        />
        <path
          d={`M 96 ${neckY + 7} Q 111 ${neckY + 5 - waveLift} 112 ${neckY + 15 - waveLift}`}
          fill="none"
          stroke={`url(#${skinId})`}
          strokeWidth="7.6"
          strokeLinecap="round"
        />
        <circle cx="48" cy={neckY + 18 + waveLift} r="4.2" fill={`url(#${skinId})`} />
        <circle cx="112" cy={neckY + 15 - waveLift} r="4.2" fill={`url(#${skinId})`} />
      </g>

      {/* Ruffled pastel peach-blush baby frock */}
      <g>
        <path
          d={`M 66 ${neckY + 2}
              Q 80 ${neckY - 1} 94 ${neckY + 2}
              L ${102 + clampedAge * 1.4} ${frockBottomY}
              Q 80 ${frockBottomY + 7} ${58 - clampedAge * 1.4} ${frockBottomY} Z`}
          fill={`url(#${frockId})`}
        />
        {/* Cute ivory Peter Pan collar */}
        <path
          d={`M 71 ${neckY + 2} Q 75 ${neckY + 9} 80 ${neckY + 4} Q 85 ${neckY + 9} 89 ${neckY + 2} Z`}
          fill="#FFFDF9"
        />
        {/* Delicate ruffled hem trim */}
        <path
          d={`M ${59 - clampedAge * 1.2} ${frockBottomY - 1} Q 70 ${frockBottomY + 4} 80 ${frockBottomY + 1} Q 90 ${frockBottomY + 4} ${101 + clampedAge * 1.2} ${frockBottomY - 1}`}
          fill="none"
          stroke="#FFFDF9"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>

      {/* Toddler Head */}
      <g>
        <ellipse cx="80" cy={headCy} rx={headRx} ry={headRy} fill={`url(#${skinId})`} />
        {/* Soft rounded bangs */}
        <path
          d={`M ${80 - headRx - 0.5} ${headCy - 2}
              C ${80 - headRx - 1} ${crownY + 1} ${80 - 9} ${crownY} 80 ${crownY}
              C ${80 + 9} ${crownY} ${80 + headRx + 1} ${crownY + 1} ${80 + headRx + 0.5} ${headCy - 2}
              C ${80 + headRx - 5} ${headCy - 9} ${80 + 7} ${headCy - 10} 80 ${headCy - 8}
              C ${80 - 7} ${headCy - 10} ${80 - headRx + 5} ${headCy - 9} ${80 - headRx - 0.5} ${headCy - 2} Z`}
          fill={`url(#${hairId})`}
        />
        {/* Hair shine arc */}
        <path
          d={`M ${80 - 11} ${crownY + 8} Q 80 ${crownY + 4} ${80 + 11} ${crownY + 8}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.24"
        />

        {/* Sparkling glossy eyes */}
        <GlossyEyes
          leftX={71.5}
          rightX={88.5}
          y={headCy + 2.5}
          radiusX={3.6}
          radiusY={4.2}
          mode="open"
          showLashes
        />

        {/* Chubby rosy blush cheeks */}
        <ellipse cx="65.5" cy={headCy + 8.5} rx="4.7" ry="2.8" fill="#F080A8" opacity="0.54" />
        <ellipse cx="94.5" cy={headCy + 8.5} rx="4.7" ry="2.8" fill="#F080A8" opacity="0.54" />

        {/* Big cheerful toddler grin */}
        <path
          d={`M 75.2 ${headCy + 10.2} Q 80 ${headCy + 15.8} 84.8 ${headCy + 10.2}`}
          fill="none"
          stroke="#9B3960"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>

      {/* Subtle floating sparkle when tall enough */}
      {totalHeight > 70 && (
        <path
          d="M 114 10 L 115.4 13.2 L 118.6 14.6 L 115.4 16 L 114 19.2 L 112.6 16 L 109.4 14.6 L 112.6 13.2 Z"
          transform={`translate(0 ${crownY - 4})`}
          fill="#E6B85C"
          opacity="0.82"
        />
      )}
    </svg>
  );
}

/* ==========================================================================
   3C. AnamikaGrowingGirl (Ages 4 to 13 — true proportional torso/leg/hair elongation)
   ========================================================================== */

export interface AnamikaGrowingGirlProps extends CharacterClassProps {
  age: number; // 4..13
}

export function AnamikaGrowingGirl({ age, className = '' }: AnamikaGrowingGirlProps) {
  const uid = useId().replace(/:/g, '');
  const skinId = `${uid}_girl_skin`;
  const hairId = `${uid}_girl_hair`;
  const dressId = `${uid}_girl_dress`;
  const sashId = `${uid}_girl_sash`;
  const clampedAge = Math.max(4, Math.min(13, Math.round(age)));
  const step = SCENE_9_GROWTH_STEPS.find((s) => s.age === clampedAge) ?? SCENE_9_GROWTH_STEPS[0];
  const progress01 = (clampedAge - 4) / 9; // 0 at age 4 -> 1 at age 13

  const crownY = inchesToSvgCrownY(step.inches);
  // Keep head naturally proportional (never ballooning!) while body & legs elongate smoothly
  const headRy = 20.5 + progress01 * 2.2;
  const headRx = 19.8 + progress01 * 1.9;
  const headCy = crownY + headRy + 2;
  const neckTopY = headCy + headRy - 2;
  const shoulderY = neckTopY + 7 + progress01 * 2;
  const shoeTopY = ORIGIN_SVG_GROUND_Y - 7;
  const belowShoulder = shoeTopY - shoulderY;

  // Smoothly shift proportion from younger child (shorter legs) to pre-teen (longer graceful legs)
  const dressLength = belowShoulder * (0.64 - progress01 * 0.08);
  const waistY = shoulderY + dressLength * 0.42;
  const hemY = shoulderY + dressLength;
  const hairBottomY = shoulderY + 14 + progress01 * 48; // hair grows steadily longer!
  const armEndY = waistY + 14 + progress01 * 12;

  return (
    <svg
      viewBox="0 0 160 230"
      aria-label={`Anamika age ${clampedAge}`}
      className={`block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={skinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE7D6" />
          <stop offset="100%" stopColor="#F4C9AE" />
        </linearGradient>
        <linearGradient id={hairId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3E2036" />
          <stop offset="60%" stopColor="#281223" />
          <stop offset="100%" stopColor="#1D0B18" />
        </linearGradient>
        <linearGradient id={dressId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFBF6" />
          <stop offset="48%" stopColor="#FDE4EE" />
          <stop offset="100%" stopColor="#F4B7D0" />
        </linearGradient>
        <linearGradient id={sashId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E97FA8" />
          <stop offset="100%" stopColor="#D94B7D" />
        </linearGradient>
      </defs>

      <CharacterShadow rx={24 + progress01 * 4} />

      {/* Flowing dark hair growing steadily longer with age */}
      <path
        d={`M ${80 - headRx - 1} ${headCy - 2}
            C ${80 - headRx - 4} ${shoulderY + 8} ${80 - headRx - 5 - progress01 * 3} ${hairBottomY - 12} ${80 - 18 - progress01 * 4} ${hairBottomY}
            Q 80 ${hairBottomY + 7} ${80 + 18 + progress01 * 4} ${hairBottomY}
            C ${80 + headRx + 5 + progress01 * 3} ${hairBottomY - 12} ${80 + headRx + 4} ${shoulderY + 8} ${80 + headRx + 1} ${headCy - 2} Z`}
        fill={`url(#${hairId})`}
      />

      {/* Proportionally elongating legs, neat white socks & pastel ribbon shoes */}
      <g>
        <rect
          x="68.5"
          y={hemY - 6}
          width="9"
          height={shoeTopY - hemY + 9}
          rx="4.4"
          fill={`url(#${skinId})`}
        />
        <rect
          x="82.5"
          y={hemY - 6}
          width="9"
          height={shoeTopY - hemY + 9}
          rx="4.4"
          fill={`url(#${skinId})`}
        />
        {/* Neat white socks */}
        <rect x="68.2" y={shoeTopY - 8} width="9.6" height="11" rx="3" fill="#FFFDFB" />
        <rect x="82.2" y={shoeTopY - 8} width="9.6" height="11" rx="3" fill="#FFFDFB" />
        {/* Pastel rose shoes */}
        <ellipse cx="72.4" cy={ORIGIN_SVG_GROUND_Y - 2.2} rx="7.6" ry="4.1" fill="#D95B8B" />
        <ellipse cx="87.6" cy={ORIGIN_SVG_GROUND_Y - 2.2} rx="7.6" ry="4.1" fill="#D95B8B" />
        <circle cx="72.4" cy={ORIGIN_SVG_GROUND_Y - 3.6} r="1.4" fill="#F7D994" />
        <circle cx="87.6" cy={ORIGIN_SVG_GROUND_Y - 3.6} r="1.4" fill="#F7D994" />
      </g>

      {/* Graceful arms */}
      <g>
        <path
          d={`M 65 ${shoulderY + 4} Q 54 ${(shoulderY + armEndY) / 2} 57 ${armEndY}`}
          fill="none"
          stroke={`url(#${skinId})`}
          strokeWidth="6.8"
          strokeLinecap="round"
        />
        <path
          d={`M 95 ${shoulderY + 4} Q 106 ${(shoulderY + armEndY) / 2} 103 ${armEndY}`}
          fill="none"
          stroke={`url(#${skinId})`}
          strokeWidth="6.8"
          strokeLinecap="round"
        />
        <circle cx="57" cy={armEndY} r="3.8" fill={`url(#${skinId})`} />
        <circle cx="103" cy={armEndY} r="3.8" fill={`url(#${skinId})`} />
      </g>

      {/* Pastel ivory-and-rose dress/tunic with blush ribbon waist sash & gold hem trim */}
      <g>
        {/* Puff sleeves */}
        <ellipse cx="63" cy={shoulderY + 5} rx="6" ry="6.6" fill="#FFF7FA" />
        <ellipse cx="97" cy={shoulderY + 5} rx="6" ry="6.6" fill="#FFF7FA" />

        {/* Bodice + gently flared pleated skirt */}
        <path
          d={`M 65 ${shoulderY}
              Q 80 ${shoulderY - 2} 95 ${shoulderY}
              L 93 ${waistY}
              L ${103 + progress01 * 3} ${hemY}
              Q 80 ${hemY + 6} ${57 - progress01 * 3} ${hemY}
              L 67 ${waistY} Z`}
          fill={`url(#${dressId})`}
        />
        {/* Delicate rose waist sash */}
        <rect x="66.5" y={waistY - 2} width="27" height="4.4" rx="2.2" fill={`url(#${sashId})`} />
        {/* Champagne-gold hem border */}
        <path
          d={`M ${58 - progress01 * 2.5} ${hemY - 2} Q 80 ${hemY + 3.5} ${102 + progress01 * 2.5} ${hemY - 2}`}
          fill="none"
          stroke="#E8C170"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </g>

      {/* Neck & Balanced Head */}
      <g>
        <rect x="75.5" y={neckTopY} width="9" height="10" rx="4.2" fill={`url(#${skinId})`} />
        <ellipse cx="80" cy={headCy} rx={headRx} ry={headRy} fill={`url(#${skinId})`} />

        {/* Soft center-parted hair bangs */}
        <path
          d={`M ${80 - headRx - 0.8} ${headCy - 1}
              C ${80 - headRx - 1} ${crownY} ${80 - 9} ${crownY - 1} 80 ${crownY - 1}
              C ${80 + 9} ${crownY - 1} ${80 + headRx + 1} ${crownY} ${80 + headRx + 0.8} ${headCy - 1}
              C ${80 + headRx - 4} ${headCy - 10} ${80 + 8} ${headCy - 11} 80 ${headCy - 9}
              C ${80 - 8} ${headCy - 11} ${80 - headRx + 4} ${headCy - 10} ${80 - headRx - 0.8} ${headCy - 1} Z`}
          fill={`url(#${hairId})`}
        />
        {/* Glossy hair highlight ribbons */}
        <path
          d={`M ${80 - 11} ${crownY + 8} Q ${80 - 5} ${crownY + 4} ${80 - 1} ${crownY + 7}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.24"
        />
        <path
          d={`M ${80 + 1} ${crownY + 7} Q ${80 + 6} ${crownY + 4} ${80 + 11} ${crownY + 8}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.24"
        />

        {/* Delicate blush satin hair ribbon bow perched softly on right side */}
        <g transform={`translate(${80 + headRx * 0.62} ${crownY + 8}) rotate(22)`}>
          <ellipse cx="-4.5" cy="0" rx="4.2" ry="2.6" fill="#F29BBF" />
          <ellipse cx="4.5" cy="0" rx="4.2" ry="2.6" fill="#F29BBF" />
          <circle cx="0" cy="0" r="2.1" fill="#D94B7D" />
        </g>

        {/* Soft brows */}
        <g fill="none" stroke="#3A1A2F" strokeWidth="1.25" strokeLinecap="round">
          <path d={`M 67 ${headCy - 4.5} Q 71.2 ${headCy - 6.4} 75.2 ${headCy - 4.8}`} />
          <path d={`M 84.8 ${headCy - 4.8} Q 88.8 ${headCy - 6.4} 93 ${headCy - 4.5}`} />
        </g>

        {/* Glossy sparkling eyes */}
        <GlossyEyes
          leftX={71.2}
          rightX={88.8}
          y={headCy + 2.4}
          radiusX={3.5}
          radiusY={4.2}
          mode="open"
          showLashes
        />

        {/* Soft rosy blush cheeks */}
        <ellipse cx="65.2" cy={headCy + 8.6} rx="4.6" ry="2.6" fill="#EC7CA4" opacity="0.48" />
        <ellipse cx="94.8" cy={headCy + 8.6} rx="4.6" ry="2.6" fill="#EC7CA4" opacity="0.48" />

        {/* Warm cheerful smile */}
        <path
          d={`M 75.4 ${headCy + 11.4} Q 80 ${headCy + 16} 84.6 ${headCy + 11.4}`}
          fill="none"
          stroke="#9B3960"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/* ==========================================================================
   3D. AnamikaTeen (Ages 14 to 17 — slender, petite 5'2" locked at exact crownY)
   ========================================================================== */

export interface AnamikaTeenProps extends CharacterClassProps {
  expression?: AnamikaTeenExpression;
  showQuestionSparkle?: boolean;
}

export function AnamikaTeen({
  expression = 'happy',
  showQuestionSparkle = false,
  className = '',
}: AnamikaTeenProps) {
  const uid = useId().replace(/:/g, '');
  const defPrefix = `anamikaTeen_${uid}`;
  const skinId = `${defPrefix}_skin`;
  const armSkinId = `${defPrefix}_armSkin`;
  const hairId = `${defPrefix}_hair`;
  const hairDeepId = `${defPrefix}_hairDeep`;
  const kurtiId = `${defPrefix}_kurti`;
  const dupattaId = `${defPrefix}_dupatta`;
  const churidarId = `${defPrefix}_churidar`;
  const jootiId = `${defPrefix}_jooti`;
  const blushId = `${defPrefix}_blush`;
  const irisId = `${defPrefix}_iris`;
  const crownId = `${defPrefix}_crown`;
  const tiaraBandId = `${defPrefix}_tiaraBand`;
  const tiaraGlowId = `${defPrefix}_tiaraGlow`;

  // Exact 5'2" crown Y = 46.2 on unified 230-unit coordinate frame
  const crownY = inchesToSvgCrownY(FIVE_TWO_INCHES);
  const headCy = crownY + 23.0; // 69.2

  const isDetermined = expression === 'determined';
  const isBonk = expression === 'bonkBlush';
  const isProud = expression === 'proud52';
  const isQueen = expression === 'birthdayQueen';

  const blushOpacity = isBonk ? 0.94 : isQueen ? 0.78 : isProud ? 0.74 : 0.64;
  const blushRx = isBonk ? 5.8 : 5.0;
  const blushRy = isBonk ? 3.5 : 3.0;

  let topDecoration: ReactNode = null;
  if (isBonk) {
    // 4 tiny golden comic impact stars strictly outside her left & right temples/crown
    // (>= 12px clearance below the HEIGHT LOCKED pill and clear of her dainty raised hands)
    topDecoration = (
      <g className="origin-story-bump-star">
        <path
          d={`M 43 ${crownY + 5} L 44.6 ${crownY + 9.4} L 49 ${crownY + 11} L 44.6 ${crownY + 12.6} L 43 ${crownY + 17} L 41.4 ${crownY + 12.6} L 37 ${crownY + 11} L 41.4 ${crownY + 9.4} Z`}
          fill="#F7D994"
          stroke="#D94B7D"
          strokeWidth="0.95"
        />
        <path
          d={`M 117 ${crownY + 5} L 118.6 ${crownY + 9.4} L 123 ${crownY + 11} L 118.6 ${crownY + 12.6} L 117 ${crownY + 17} L 115.4 ${crownY + 12.6} L 111 ${crownY + 11} L 115.4 ${crownY + 9.4} Z`}
          fill="#F7D994"
          stroke="#D94B7D"
          strokeWidth="0.95"
        />
        <path
          d={`M 34 ${crownY + 20} L 35.2 ${crownY + 23} L 38.2 ${crownY + 24.2} L 35.2 ${crownY + 25.4} L 34 ${crownY + 28.4} L 32.8 ${crownY + 25.4} L 29.8 ${crownY + 24.2} L 32.8 ${crownY + 23} Z`}
          fill="#FFE49C"
          stroke="#E6B85C"
          strokeWidth="0.85"
        />
        <path
          d={`M 126 ${crownY + 20} L 127.2 ${crownY + 23} L 130.2 ${crownY + 24.2} L 127.2 ${crownY + 25.4} L 126 ${crownY + 28.4} L 124.8 ${crownY + 25.4} L 121.8 ${crownY + 24.2} L 124.8 ${crownY + 23} Z`}
          fill="#FFE49C"
          stroke="#E6B85C"
          strokeWidth="0.85"
        />
      </g>
    );
  } else if (showQuestionSparkle) {
    topDecoration = (
      <g className="origin-story-bump-star">
        <circle cx="115" cy={crownY + 14} r="7.8" fill="#FFF8E6" stroke="#E6B85C" strokeWidth="1.25" />
        <text
          x="115"
          y={crownY + 17.3}
          textAnchor="middle"
          fill="#D94B7D"
          fontSize="9.8"
          fontWeight="800"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          ?
        </text>
        <path
          d={`M 126.5 ${crownY + 7} L 127.6 ${crownY + 9.8} L 130.4 ${crownY + 10.9} L 127.6 ${crownY + 12} L 126.5 ${crownY + 14.8} L 125.4 ${crownY + 12} L 122.6 ${crownY + 10.9} L 125.4 ${crownY + 9.8} Z`}
          fill="#E6B85C"
        />
      </g>
    );
  } else if (isQueen) {
    topDecoration = (
      <g className="origin-story-crown-float" data-layer="birthdayTiara">
        {/* Soft warm golden shimmer aura around tiara */}
        <ellipse cx="80" cy={crownY - 15} rx="25" ry="13" fill={`url(#${tiaraGlowId})`} />
        {/* Delicate champagne-gold & rose-jewel 17 tiara */}
        <path
          d={`M 63.5 ${crownY - 6.2}
              C 65.2 ${crownY - 15.2} 69.6 ${crownY - 20} 74 ${crownY - 14.2}
              C 76.2 ${crownY - 20.6} 78.3 ${crownY - 25.4} 80 ${crownY - 26.8}
              C 81.7 ${crownY - 25.4} 83.8 ${crownY - 20.6} 86 ${crownY - 14.2}
              C 90.4 ${crownY - 20} 94.8 ${crownY - 15.2} 96.5 ${crownY - 6.2}
              Q 80 ${crownY - 3.4} 63.5 ${crownY - 6.2} Z`}
          fill={`url(#${crownId})`}
          stroke="#C88B2E"
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        {/* Delicate filigree rose-gold rim band */}
        <path
          d={`M 65 ${crownY - 7.5} Q 80 ${crownY - 4.7} 95 ${crownY - 7.5}`}
          fill="none"
          stroke={`url(#${tiaraBandId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Crown jewels (rose-berry center gem + ivory pearl crests) */}
        <circle cx="80" cy={crownY - 26.8} r="2.4" fill="#D94B7D" stroke="#FFF9FC" strokeWidth="0.85" />
        <circle cx="68.5" cy={crownY - 18.2} r="1.65" fill="#FFFDF9" stroke="#E6B85C" strokeWidth="0.65" />
        <circle cx="91.5" cy={crownY - 18.2} r="1.65" fill="#FFFDF9" stroke="#E6B85C" strokeWidth="0.65" />
        {/* Crisp 17 emblem */}
        <text
          x="80"
          y={crownY - 10.6}
          textAnchor="middle"
          fill="#3A1233"
          fontSize="8.4"
          fontWeight="800"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          17
        </text>
        {/* Tiny orbiting 4-point sparkles */}
        <g className="origin-story-orbit-star">
          <path
            d={`M 55 ${crownY - 17} L 56.2 ${crownY - 14.1} L 59.1 ${crownY - 12.9} L 56.2 ${crownY - 11.7} L 55 ${crownY - 8.8} L 53.8 ${crownY - 11.7} L 50.9 ${crownY - 12.9} L 53.8 ${crownY - 14.1} Z`}
            fill="#F3C46B"
          />
        </g>
        <g className="origin-story-orbit-star" style={{ ['--orbit-delay' as string]: '0.55s' }}>
          <path
            d={`M 105 ${crownY - 18} L 106.1 ${crownY - 15.2} L 108.9 ${crownY - 14.1} L 106.1 ${crownY - 13} L 105 ${crownY - 10.2} L 103.9 ${crownY - 13} L 101.1 ${crownY - 14.1} L 103.9 ${crownY - 15.2} Z`}
            fill="#E86A98"
          />
        </g>
        <g className="origin-story-orbit-star" style={{ ['--orbit-delay' as string]: '1.05s' }}>
          <path
            d={`M 80 ${crownY - 35.5} L 80.8 ${crownY - 33.4} L 82.9 ${crownY - 32.6} L 80.8 ${crownY - 31.8} L 80 ${crownY - 29.7} L 79.2 ${crownY - 31.8} L 77.1 ${crownY - 32.6} L 79.2 ${crownY - 33.4} Z`}
            fill="#FFE29A"
          />
        </g>
      </g>
    );
  }

  return (
    <svg
      viewBox="0 0 160 230"
      aria-label="Anamika Singh"
      className={`block select-none overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={skinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE8DA" />
          <stop offset="68%" stopColor="#F8D2BA" />
          <stop offset="100%" stopColor="#ECBA9E" />
        </linearGradient>
        <linearGradient id={armSkinId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE1CE" />
          <stop offset="58%" stopColor="#F4CBB2" />
          <stop offset="100%" stopColor="#EEBDA1" />
        </linearGradient>
        <linearGradient id={hairId} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#3E2538" />
          <stop offset="48%" stopColor="#2A1926" />
          <stop offset="100%" stopColor="#1B0F19" />
        </linearGradient>
        <linearGradient id={hairDeepId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2E1B2A" />
          <stop offset="100%" stopColor="#1B0F19" />
        </linearGradient>
        <linearGradient id={kurtiId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="46%" stopColor="#FDE8F1" />
          <stop offset="100%" stopColor="#F5C0D7" />
        </linearGradient>
        <linearGradient id={dupattaId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FAD2E4" />
          <stop offset="55%" stopColor="#F1ACC9" />
          <stop offset="100%" stopColor="#E68EB4" />
        </linearGradient>
        <linearGradient id={churidarId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFBF8" />
          <stop offset="65%" stopColor="#F6E5ED" />
          <stop offset="100%" stopColor="#ECD2DF" />
        </linearGradient>
        <linearGradient id={jootiId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EA6A9A" />
          <stop offset="60%" stopColor="#CF3F74" />
          <stop offset="100%" stopColor="#A52957" />
        </linearGradient>
        <radialGradient id={blushId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8CAE" stopOpacity="0.72" />
          <stop offset="55%" stopColor="#FF8CAE" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FF8CAE" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={irisId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#260C20" />
          <stop offset="58%" stopColor="#43183A" />
          <stop offset="100%" stopColor="#6D2E5E" />
        </linearGradient>
        <linearGradient id={crownId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4C8" />
          <stop offset="55%" stopColor="#F3C969" />
          <stop offset="100%" stopColor="#D79E3B" />
        </linearGradient>
        <linearGradient id={tiaraBandId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F29BC0" />
          <stop offset="50%" stopColor="#FFF5D6" />
          <stop offset="100%" stopColor="#F29BC0" />
        </linearGradient>
        <radialGradient id={tiaraGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F7D994" stopOpacity="0.46" />
          <stop offset="68%" stopColor="#F7D994" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#F7D994" stopOpacity="0" />
        </radialGradient>
      </defs>

      {isQueen && (
        <ellipse cx="80" cy="134" rx="48" ry="70" fill="rgba(247, 217, 148, 0.14)" />
      )}

      {/* Soft grounded rose floor shadow underneath petite jootis */}
      {isQueen ? (
        <ellipse
          cx="80"
          cy="221.3"
          rx="24.5"
          ry="4.5"
          fill="rgba(184, 58, 108, 0.22)"
          className="origin-story-ground-shadow"
        />
      ) : (
        <CharacterShadow rx={22.5} />
      )}

      {/* Slender flowing layered espresso-silk back hair (tapers cleanly behind shoulders so slim waist stays visible) */}
      <g className="origin-story-hair-sway" style={{ transformOrigin: '80px 72px' }}>
        {/* Inner soft depth layer tucked slimly behind upper back */}
        <path
          d="M 64.5 72 C 62.2 95 63.4 117 65.8 136 Q 80 140.5 94.2 136 C 96.6 117 97.8 95 95.5 72 Z"
          fill={`url(#${hairDeepId})`}
        />
        {/* Left layered flowing lock curving gently outward only near the tips */}
        <path
          d="M 63.0 70
             C 59.6 92 61.6 117 63.2 136
             C 64.0 145 61.0 153 57.6 158.5
             C 62.8 156.6 67.2 151.4 68.8 143.2
             C 70.4 133.5 70.0 114 69.8 96 Z"
          fill={`url(#${hairId})`}
        />
        {/* Right layered flowing lock curving gently outward only near the tips */}
        <path
          d="M 97.0 70
             C 100.4 92 98.4 117 96.8 136
             C 96.0 145 99.0 153 102.4 158.5
             C 97.2 156.6 92.8 151.4 91.2 143.2
             C 89.6 133.5 90.0 114 90.2 96 Z"
          fill={`url(#${hairId})`}
        />
        {/* Subtle secondary wispy lower tips + silky strand sheen */}
        <path
          d="M 65.2 137 C 66.0 146 64.2 154.5 61.4 160.8 C 65.8 158.2 69.4 152.2 70.8 144 Z"
          fill={`url(#${hairId})`}
          opacity="0.92"
        />
        <path
          d="M 94.8 137 C 94.0 146 95.8 154.5 98.6 160.8 C 94.2 158.2 90.6 152.2 89.2 144 Z"
          fill={`url(#${hairId})`}
          opacity="0.92"
        />
        <path
          d="M 64.6 110 C 64.8 124 65.4 136 62.6 150"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.95"
          strokeLinecap="round"
          opacity="0.14"
        />
        <path
          d="M 95.4 110 C 95.2 124 94.6 136 97.4 150"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.95"
          strokeLinecap="round"
          opacity="0.14"
        />
      </g>

      {/* Slender naturally tapered churidar legs & petite almond rose-berry jootis */}
      <g>
        {/* Left tapered churidar leg */}
        <path
          d="M 69.4 170.5
             L 77.6 170.5
             C 77.4 184 76.9 197.5 76.2 208.8
             Q 74.0 210.2 71.7 208.8
             C 70.8 197.5 70.0 184 69.4 170.5 Z"
          fill={`url(#${churidarId})`}
          stroke="#E5C8D6"
          strokeWidth="0.65"
        />
        {/* Right tapered churidar leg */}
        <path
          d="M 82.4 170.5
             L 90.6 170.5
             C 90.0 184 89.2 197.5 88.3 208.8
             Q 86.0 210.2 83.8 208.8
             C 83.1 197.5 82.6 184 82.4 170.5 Z"
          fill={`url(#${churidarId})`}
          stroke="#E5C8D6"
          strokeWidth="0.65"
        />
        {/* Subtle soft pastel inner leg shading + dainty churidar ankle gathers */}
        <path
          d="M 76.5 174 C 76.2 186 75.8 198 75.2 208"
          fill="none"
          stroke="rgba(198, 142, 168, 0.28)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 83.5 174 C 83.8 186 84.2 198 84.8 208"
          fill="none"
          stroke="rgba(198, 142, 168, 0.28)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path d="M 71.9 205.2 Q 74.0 206.4 76.1 205.2" fill="none" stroke="#E0BDD0" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 71.8 207.4 Q 74.0 208.5 76.2 207.4" fill="none" stroke="#E0BDD0" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 83.9 205.2 Q 86.0 206.4 88.1 205.2" fill="none" stroke="#E0BDD0" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 83.8 207.4 Q 86.0 208.5 88.2 207.4" fill="none" stroke="#E0BDD0" strokeWidth="0.8" strokeLinecap="round" />

        {/* Petite warm peach ankles peeking into almond jootis */}
        <path
          d="M 72.1 208.4 L 75.9 208.4 L 75.6 213.8 L 72.4 213.8 Z"
          fill={`url(#${armSkinId})`}
        />
        <path
          d="M 84.1 208.4 L 87.9 208.4 L 87.6 213.8 L 84.4 213.8 Z"
          fill={`url(#${armSkinId})`}
        />

        {/* Petite almond-shaped left rose-berry jooti (grounded strictly at y = 220.4) */}
        <path
          d="M 65.4 217.2
             C 65.4 214.2 68.5 212.5 72.2 212.7
             C 75.4 212.9 77.6 214.5 77.6 217.3
             C 77.6 219.6 75.1 220.4 71.2 220.4
             C 67.4 220.4 65.4 219.2 65.4 217.2 Z"
          fill={`url(#${jootiId})`}
          stroke="#96234E"
          strokeWidth="0.65"
        />
        {/* Petite almond-shaped right rose-berry jooti (grounded strictly at y = 220.4) */}
        <path
          d="M 82.4 217.3
             C 82.4 214.5 84.6 212.9 87.8 212.7
             C 91.5 212.5 94.6 214.2 94.6 217.2
             C 94.6 219.2 92.6 220.4 88.8 220.4
             C 84.9 220.4 82.4 219.6 82.4 217.3 Z"
          fill={`url(#${jootiId})`}
          stroke="#96234E"
          strokeWidth="0.65"
        />
        {/* Soft jooti satin highlight + tiny champagne-gold motif */}
        <path
          d="M 67.4 216.2 Q 71.0 214.1 74.6 215.3"
          fill="none"
          stroke="#FFD9E9"
          strokeWidth="1.05"
          strokeLinecap="round"
          opacity="0.76"
        />
        <path
          d="M 85.4 215.3 Q 89.0 214.1 92.6 216.2"
          fill="none"
          stroke="#FFD9E9"
          strokeWidth="1.05"
          strokeLinecap="round"
          opacity="0.76"
        />
        <path d="M 70.2 216.6 L 71.5 215.6 L 72.8 216.6 L 71.5 217.6 Z" fill="#F7D994" />
        <path d="M 87.2 216.6 L 88.5 215.6 L 89.8 216.6 L 88.5 217.6 Z" fill="#F7D994" />
      </g>

      {/* Back-layer slender arms (behind kurti bodice for natural poses) */}
      <g>
        {isQueen && (
          <>
            {/* Graceful slender V-cheer raised left arm */}
            <path
              d="M 68.5 102.2
                 C 61.5 99.8 55.2 94.4 50.8 86.2
                 C 48.8 82.4 47.4 78.6 46.5 75.4
                 L 50.2 74.4
                 C 51.4 77.8 52.8 81.4 54.8 84.6
                 C 58.6 90.6 64.0 95.2 70.0 97.8 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.85"
              strokeLinejoin="round"
            />
            {/* Graceful slender V-cheer raised right arm */}
            <path
              d="M 91.5 102.2
                 C 98.5 99.8 104.8 94.4 109.2 86.2
                 C 111.2 82.4 112.6 78.6 113.5 75.4
                 L 109.8 74.4
                 C 108.6 77.8 107.2 81.4 105.2 84.6
                 C 101.4 90.6 96.0 95.2 90.0 97.8 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.85"
              strokeLinejoin="round"
            />
            {/* Delicate fitted pastel flutter sleeves for V-cheer */}
            <path
              d="M 68.5 98.4 C 63.4 96.4 59.6 93.2 58.0 89.8 L 54.4 93.8 C 57.4 98.4 62.6 101.8 67.6 103.2 Z"
              fill="#FFF7FA"
              stroke="#E9AAC6"
              strokeWidth="0.82"
            />
            <path
              d="M 91.5 98.4 C 96.6 96.4 100.4 93.2 102.0 89.8 L 105.6 93.8 C 102.6 98.4 97.4 101.8 92.4 103.2 Z"
              fill="#FFF7FA"
              stroke="#E9AAC6"
              strokeWidth="0.82"
            />
            {/* Tiny champagne-gold wrist bangles */}
            <path d="M 46.8 79.4 L 50.8 78.2" stroke="#E6B85C" strokeWidth="1.35" strokeLinecap="round" />
            <path d="M 109.2 78.2 L 113.2 79.4" stroke="#E6B85C" strokeWidth="1.35" strokeLinecap="round" />
            {/* Cute dainty open celebrating hands (palm + delicate thumb) */}
            <path
              d="M 46.2 75.8 C 44.2 73.8 43.8 71.0 45.4 69.8 C 46.6 69.0 48.0 69.6 48.8 71.0 C 49.4 70.0 50.6 70.0 51.1 71.2 C 51.6 72.6 51.0 74.6 49.6 76.0 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            <path
              d="M 113.8 75.8 C 115.8 73.8 116.2 71.0 114.6 69.8 C 113.4 69.0 112.0 69.6 111.2 71.0 C 110.6 70.0 109.4 70.0 108.9 71.2 C 108.4 72.6 109.0 74.6 110.4 76.0 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* Tiny celebratory sparkles dancing near her fingertips */}
            <path
              d="M 39.5 63.8 L 40.4 66.1 L 42.7 67.0 L 40.4 67.9 L 39.5 70.2 L 38.6 67.9 L 36.3 67.0 L 38.6 66.1 Z"
              fill="#F3C46B"
            />
            <path
              d="M 120.5 63.8 L 121.4 66.1 L 123.7 67.0 L 121.4 67.9 L 120.5 70.2 L 119.6 67.9 L 117.3 67.0 L 119.6 66.1 Z"
              fill="#F3C46B"
            />
            <circle cx="43.5" cy="62.8" r="1.2" fill="#E86A98" opacity="0.85" />
            <circle cx="116.5" cy="62.8" r="1.2" fill="#E86A98" opacity="0.85" />
          </>
        )}

        {isBonk && (
          <>
            {/* Slender bent arms lifting dainty hands gently beside temples/crown */}
            <path
              d="M 68.4 102.4
                 C 60.8 104.0 55.6 100.6 55.2 94.4
                 C 54.9 89.2 57.0 84.0 59.5 79.4
                 L 62.6 81.0
                 C 60.4 85.0 59.2 89.4 59.6 93.4
                 C 60.0 96.8 63.4 98.4 69.2 98.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            <path
              d="M 91.6 102.4
                 C 99.2 104.0 104.4 100.6 104.8 94.4
                 C 105.1 89.2 103.0 84.0 100.5 79.4
                 L 97.4 81.0
                 C 99.6 85.0 100.8 89.4 100.4 93.4
                 C 100.0 96.8 96.6 98.4 90.8 98.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* Dainty angled sleeves hugging the raised upper arms */}
            <path d="M 68.4 98.4 C 63.4 98.8 60.2 100.6 60.8 104.4 L 67.8 104.0 Z" fill="#FFF7FA" stroke="#E9AAC6" strokeWidth="0.8" />
            <path d="M 91.6 98.4 C 96.6 98.8 99.8 100.6 99.2 104.4 L 92.2 104.0 Z" fill="#FFF7FA" stroke="#E9AAC6" strokeWidth="0.8" />
            {/* Dainty hands beside temples */}
            <path
              d="M 59.0 80.4 C 58.2 77.8 59.4 75.4 61.4 75.2 C 63.0 75.0 64.2 76.4 63.8 78.6 C 63.5 80.2 62.2 81.4 60.6 81.4 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.75"
            />
            <path
              d="M 101.0 80.4 C 101.8 77.8 100.6 75.4 98.6 75.2 C 97.0 75.0 95.8 76.4 96.2 78.6 C 96.5 80.2 97.8 81.4 99.4 81.4 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.75"
            />
          </>
        )}

        {isDetermined && (
          <>
            {/* Focused pre-hop arms bent cleanly at elbows */}
            <path
              d="M 68.2 101.2 C 62.0 106.8 58.8 114.2 59.8 121.2 C 60.2 123.8 61.6 126.4 63.6 128.4 L 66.2 126.0 C 64.6 124.2 63.8 122.4 63.7 120.4 C 63.4 115.3 65.8 109.4 70.0 105.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
            />
            <path
              d="M 91.8 101.2 C 98.0 106.8 101.2 114.2 100.2 121.2 C 99.8 123.8 98.4 126.4 96.4 128.4 L 93.8 126.0 C 95.4 124.2 96.2 122.4 96.3 120.4 C 96.6 115.3 94.2 109.4 90.0 105.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
            />
            {/* Cute determined little fists */}
            <ellipse cx="65.2" cy="128.4" rx="2.9" ry="2.7" fill={`url(#${armSkinId})`} stroke="#D69A7D" strokeWidth="0.8" />
            <ellipse cx="94.8" cy="128.4" rx="2.9" ry="2.7" fill={`url(#${armSkinId})`} stroke="#D69A7D" strokeWidth="0.8" />
          </>
        )}

        {isProud && (
          <>
            {/* Left arm akimbo: petite hand resting confidently on slim waist */}
            <path
              d="M 68.2 101.2
                 C 61.2 106.0 57.6 112.8 58.6 118.4
                 C 59.4 122.8 64.2 126.2 69.8 127.8
                 L 70.8 124.6
                 C 66.4 123.2 63.0 120.4 62.5 117.6
                 C 62.0 114.0 64.8 109.2 70.0 105.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* Right arm bent playfully up into a cute little peace / wave pose */}
            <path
              d="M 91.6 101.6
                 C 97.6 105.6 102.2 103.6 104.2 97.2
                 C 105.0 94.4 105.6 91.8 106.2 89.4
                 L 102.8 88.8
                 C 102.1 91.2 101.6 93.4 100.8 95.6
                 C 99.2 99.4 96.0 100.0 90.6 97.8 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* Fitted raised right flutter sleeve cleanly following her waving arm */}
            <path
              d="M 91.5 98.2 C 96.4 99.2 99.6 100.4 100.4 103.4 L 93.8 104.8 L 90.8 101.6 Z"
              fill="#FFF7FA"
              stroke="#E9AAC6"
              strokeWidth="0.78"
            />
            {/* Gold bangle on waving wrist */}
            <path d="M 102.4 91.4 L 105.9 92.0" stroke="#E6B85C" strokeWidth="1.25" strokeLinecap="round" />
            {/* Cute playful peace / dainty wave hand */}
            <path
              d="M 102.4 89.2
                 C 101.8 87.0 102.2 84.0 103.4 83.6
                 C 104.4 83.3 104.8 85.0 104.9 86.4
                 C 105.4 84.8 106.4 83.6 107.4 84.1
                 C 108.2 84.5 107.8 87.0 107.0 88.8
                 C 106.2 90.2 103.6 90.4 102.4 89.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          </>
        )}

        {!isQueen && !isBonk && !isDetermined && !isProud && (
          <>
            {/* Happy relaxed slender feminine pose: left arm flowing lightly down, right hand resting gracefully by slim waist */}
            <path
              d="M 68.2 101.4
                 C 63.2 109.2 60.8 121.0 61.6 134.8
                 L 64.9 134.6
                 C 64.4 122.4 66.2 111.8 70.2 105.0 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.78"
              strokeLinejoin="round"
            />
            <path
              d="M 91.8 101.4
                 C 97.6 107.4 100.4 114.8 99.0 120.0
                 C 97.8 124.4 93.8 127.0 89.2 128.0
                 L 88.6 124.8
                 C 92.2 123.9 94.8 121.8 95.4 119.0
                 C 96.2 115.2 94.2 109.8 89.8 105.2 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.78"
              strokeLinejoin="round"
            />
            {/* Delicate gold wrist bangle on left hand */}
            <path d="M 61.5 131.8 L 64.9 131.6" stroke="#E6B85C" strokeWidth="1.2" strokeLinecap="round" />
            {/* Dainty relaxed left hand */}
            <path
              d="M 61.5 134.6 C 60.8 136.8 61.4 139.4 63.0 139.6 C 64.6 139.8 65.6 138.0 65.2 134.8 Z"
              fill={`url(#${armSkinId})`}
              stroke="#D69A7D"
              strokeWidth="0.75"
            />
          </>
        )}
      </g>

      {/* Tailored slender-waisted pastel rose-ivory Anarkali kurti + sheer draped chiffon dupatta */}
      <g>
        {/* Fitted delicate pastel kurti sleeves (matched per pose so raised right arm never has a dangling sleeve) */}
        {!isQueen && !isBonk && (
          <path
            d="M 68.5 98.8 C 64.2 101.4 61.8 107.0 62.6 113.0 L 68.0 111.6 C 68.4 106.8 69.2 102.8 69.8 99.8 Z"
            fill="#FFF7FA"
            stroke="#E9AAC6"
            strokeWidth="0.75"
          />
        )}
        {!isQueen && !isBonk && !isProud && (
          <path
            d="M 91.5 98.8 C 95.8 101.4 98.2 107.0 97.4 113.0 L 92.0 111.6 C 91.6 106.8 90.8 102.8 90.2 99.8 Z"
            fill="#FFF7FA"
            stroke="#E9AAC6"
            strokeWidth="0.75"
          />
        )}

        {/* Slim-waisted Anarkali kurti silhouette (narrow bodice -> gentle inward waist curve -> soft pleated A-line skirt) */}
        <path
          d="M 67.8 99.4
             Q 80 97.2 92.2 99.4
             C 91.4 109.2 89.6 118.8 88.6 126.8
             C 92.2 142.6 96.4 159.4 99.6 175.4
             Q 80 180.6 60.4 175.4
             C 63.6 159.4 67.8 142.6 71.4 126.8
             C 70.4 118.8 68.6 109.2 67.8 99.4 Z"
          fill={`url(#${kurtiId})`}
          stroke="#E8ABC6"
          strokeWidth="0.75"
        />

        {/* Subtle vertical soft-pleat fabric shading folds on A-line skirt */}
        <path
          d="M 75.5 129.2 C 74.2 144.8 72.2 160 70.0 175.2"
          fill="none"
          stroke="rgba(220, 138, 174, 0.24)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <path
          d="M 80 129.8 L 80 176.8"
          fill="none"
          stroke="rgba(220, 138, 174, 0.20)"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        <path
          d="M 84.5 129.2 C 85.8 144.8 87.8 160 90.0 175.2"
          fill="none"
          stroke="rgba(220, 138, 174, 0.24)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />

        {/* Delicate scalloped neckline & tiny champagne-gold embroidery trim */}
        <path
          d="M 73.6 99.2 Q 76.8 104.8 80 106.6 Q 83.2 104.8 86.4 99.2"
          fill="none"
          stroke="#E6B85C"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
        <circle cx="80" cy="107.0" r="1.35" fill="#D94B7D" />
        <circle cx="76.5" cy="104.2" r="0.85" fill="#F3C969" />
        <circle cx="83.5" cy="104.2" r="0.85" fill="#F3C969" />

        {/* Subtle waist empire piping accentuating her slim waist */}
        <path
          d="M 71.5 126.8 Q 80 129.6 88.5 126.8"
          fill="none"
          stroke="#E8BD68"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.82"
        />

        {/* Champagne-gold gota border along soft-pleated A-line hem */}
        <path
          d="M 61.6 172.6 Q 80 177.8 98.4 172.6"
          fill="none"
          stroke="#E6B85C"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M 62.8 169.6 Q 80 174.4 97.2 169.6"
          fill="none"
          stroke="#F6D893"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.9"
        />

        {/* Light semi-sheer blush-rose chiffon dupatta (opacity 0.78) neatly pleated over left shoulder */}
        <g
          className="origin-story-hair-sway"
          style={{ transformOrigin: '70px 100px' }}
          opacity="0.78"
        >
          <path
            d="M 67.6 99.2
               L 73.2 99.2
               C 72.0 115.5 69.8 133.5 66.2 152.2
               C 64.8 159.2 62.6 165.2 60.2 169.4
               L 55.6 166.6
               C 58.8 158.4 61.6 145.6 64.0 131.0
               C 65.8 119.5 67.0 108.4 67.6 99.2 Z"
            fill={`url(#${dupattaId})`}
          />
          {/* Subtle diagonal drape pleat across bodice hugging her slender frame */}
          <path
            d="M 72.2 100.6 C 74.6 111.0 79.4 120.2 87.6 125.8 L 86.2 127.8 C 77.6 122.0 72.6 113.2 70.0 102.2 Z"
            fill={`url(#${dupattaId})`}
            opacity="0.65"
          />
          {/* Delicate thin gold gota edge along chiffon drape */}
          <path
            d="M 67.6 100.2 C 65.8 122.5 62.2 146.0 56.2 166.6"
            fill="none"
            stroke="#F7D994"
            strokeWidth="1.05"
            strokeLinecap="round"
          />
        </g>

        {/* Foreground dainty hand overlays resting cleanly on slim waist for happy / proud52 */}
        {isProud && (
          <path
            d="M 68.8 124.4 C 71.2 124.2 73.2 125.4 72.8 127.0 C 72.4 128.4 70.2 128.8 68.4 128.0 Z"
            fill={`url(#${armSkinId})`}
            stroke="#D69A7D"
            strokeWidth="0.72"
          />
        )}
        {!isQueen && !isBonk && !isDetermined && !isProud && (
          <path
            d="M 90.2 124.6 C 87.8 124.4 86.0 125.6 86.4 127.2 C 86.8 128.6 89.0 128.9 90.6 128.0 Z"
            fill={`url(#${armSkinId})`}
            stroke="#D69A7D"
            strokeWidth="0.72"
          />
        )}
      </g>

      {/* Slender graceful neck, delicate ears + golden jhumka/pearl drops, slimmer heart/oval face & layered silk hair */}
      <g>
        {/* Slender graceful neck (well-proportioned between chin and scalloped kurti collar) */}
        <path
          d="M 76.7 88.8 L 83.3 88.8 L 83.8 100.0 Q 80 102.2 76.2 100.0 Z"
          fill={`url(#${skinId})`}
        />
        {/* Soft curved chin shadow beneath jawline */}
        <path
          d="M 76.6 91.2 Q 80 95.0 83.4 91.2 L 83.4 89.0 L 76.6 89.0 Z"
          fill="rgba(190, 120, 105, 0.28)"
        />

        {/* Delicate ears peeking beneath side strands */}
        <ellipse cx="62.4" cy={headCy + 4.8} rx="2.4" ry="3.6" fill={`url(#${skinId})`} stroke="#E0AA8F" strokeWidth="0.6" />
        <ellipse cx="97.6" cy={headCy + 4.8} rx="2.4" ry="3.6" fill={`url(#${skinId})`} stroke="#E0AA8F" strokeWidth="0.6" />

        {/* Soft slimmer heart/oval face with gentle tapered chin */}
        <path
          d={`M 62.6 ${headCy - 1.0}
              C 62.6 ${crownY + 6.4} 69.4 ${crownY + 1.8} 80 ${crownY + 1.8}
              C 90.6 ${crownY + 1.8} 97.4 ${crownY + 6.4} 97.4 ${headCy - 1.0}
              C 97.4 ${headCy + 11.4} 91.4 ${headCy + 21.4} 80 ${headCy + 22.8}
              C 68.6 ${headCy + 21.4} 62.6 ${headCy + 11.4} 62.6 ${headCy - 1.0} Z`}
          fill={`url(#${skinId})`}
        />

        {/* Soft parted espresso-silk crown hair with graceful curtain bangs (top locked strictly at y = crownY = 46.2) */}
        <path
          d={`M 59.8 ${headCy + 2.4}
              C 59.0 ${crownY + 6.2} 66.8 ${crownY} 80 ${crownY}
              C 93.2 ${crownY} 101.0 ${crownY + 6.2} 100.2 ${headCy + 2.4}
              C 97.6 ${headCy - 7.4} 91.4 ${headCy - 12.6} 80.5 ${headCy - 13.8}
              Q 80 ${headCy - 11.8} 79.5 ${headCy - 13.8}
              C 68.6 ${headCy - 12.6} 62.4 ${headCy - 7.4} 59.8 ${headCy + 2.4} Z`}
          fill={`url(#${hairId})`}
        />
        {/* Airy wispy face-framing cheek-slimming side strands */}
        <path
          d={`M 61.6 ${headCy - 3.0}
              C 60.0 ${headCy + 10.2} 61.4 ${headCy + 23.0} 64.4 ${headCy + 30.8}
              C 64.2 ${headCy + 21.6} 63.4 ${headCy + 11.4} 64.8 ${headCy - 0.6} Z`}
          fill={`url(#${hairId})`}
        />
        <path
          d={`M 98.4 ${headCy - 3.0}
              C 100.0 ${headCy + 10.2} 98.6 ${headCy + 23.0} 95.6 ${headCy + 30.8}
              C 95.8 ${headCy + 21.6} 96.6 ${headCy + 11.4} 95.2 ${headCy - 0.6} Z`}
          fill={`url(#${hairId})`}
        />
        {/* Soft sweeping curtain-bang wisps framing upper forehead */}
        <path
          d={`M 71.2 ${headCy - 12.4} Q 65.8 ${headCy - 8.2} 63.6 ${headCy - 1.4} Q 67.2 ${headCy - 6.0} 73.0 ${headCy - 11.2} Z`}
          fill={`url(#${hairId})`}
        />
        <path
          d={`M 88.8 ${headCy - 12.4} Q 94.2 ${headCy - 8.2} 96.4 ${headCy - 1.4} Q 92.8 ${headCy - 6.0} 87.0 ${headCy - 11.2} Z`}
          fill={`url(#${hairId})`}
        />

        {/* Tiny cute golden jhumka / pearl-drop earrings peeking brightly beneath her side strands */}
        <g>
          {/* Left golden jhumka + pearl drop */}
          <circle cx="62.2" cy={headCy + 9.2} r="1.05" fill="#F3C969" />
          <path d={`M 60.4 ${headCy + 12.6} Q 62.2 ${headCy + 9.8} 64.0 ${headCy + 12.6} Z`} fill="#F6CF72" stroke="#C88B2E" strokeWidth="0.48" />
          <circle cx="62.2" cy={headCy + 14.0} r="1.25" fill="#FFFDF9" stroke="#E6B85C" strokeWidth="0.48" />
          {/* Right golden jhumka + pearl drop */}
          <circle cx="97.8" cy={headCy + 9.2} r="1.05" fill="#F3C969" />
          <path d={`M 96.0 ${headCy + 12.6} Q 97.8 ${headCy + 9.8} 99.6 ${headCy + 12.6} Z`} fill="#F6CF72" stroke="#C88B2E" strokeWidth="0.48" />
          <circle cx="97.8" cy={headCy + 14.0} r="1.25" fill="#FFFDF9" stroke="#E6B85C" strokeWidth="0.48" />
        </g>

        {/* Delicate translucent curved silk hair-shine arcs across crown */}
        <path
          d={`M 66.8 ${crownY + 9.2} Q 72.4 ${crownY + 5.2} 77.6 ${crownY + 8.0}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.21"
        />
        <path
          d={`M 82.4 ${crownY + 8.0} Q 87.6 ${crownY + 5.2} 93.2 ${crownY + 9.2}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.21"
        />
        <path
          d={`M 71.5 ${crownY + 12.2} Q 75.5 ${crownY + 10.2} 78.2 ${crownY + 11.8}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.05"
          strokeLinecap="round"
          opacity="0.16"
        />

        {/* Petite sparkling rose-maroon bindi */}
        <circle cx="80" cy={headCy - 6.6} r="2.1" fill="#C9376B" />
        <circle cx="79.4" cy={headCy - 7.2} r="0.65" fill="#FFF7FB" opacity="0.92" />

        {/* Dainty thin curved eyebrows */}
        <g fill="none" stroke="#3A1A2F" strokeWidth="1.2" strokeLinecap="round">
          {isDetermined ? (
            <>
              <path d={`M 68.0 ${headCy - 4.0} L 75.6 ${headCy - 1.6}`} />
              <path d={`M 92.0 ${headCy - 4.0} L 84.4 ${headCy - 1.6}`} />
            </>
          ) : isBonk ? (
            <>
              <path d={`M 68.0 ${headCy - 2.6} Q 71.8 ${headCy - 5.0} 75.6 ${headCy - 4.2}`} />
              <path d={`M 92.0 ${headCy - 2.6} Q 88.2 ${headCy - 5.0} 84.4 ${headCy - 4.2}`} />
            </>
          ) : (
            <>
              <path d={`M 68.0 ${headCy - 3.0} Q 71.8 ${headCy - 5.2} 75.6 ${headCy - 3.4}`} />
              <path d={`M 84.4 ${headCy - 3.4} Q 88.2 ${headCy - 5.2} 92.0 ${headCy - 3.0}`} />
            </>
          )}
        </g>

        {/* Ultra-cute expressive eyes tailored per scene */}
        {isBonk ? (
          /* Crisp cute curved > < comic squeeze eyes */
          <g fill="none" stroke="#3A1233" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={`M 68.2 ${headCy + 0.6} Q 72.0 ${headCy + 2.4} 75.2 ${headCy + 3.2} Q 72.0 ${headCy + 4.2} 68.2 ${headCy + 6.0}`} />
            <path d={`M 91.8 ${headCy + 0.6} Q 88.0 ${headCy + 2.4} 84.8 ${headCy + 3.2} Q 88.0 ${headCy + 4.2} 91.8 ${headCy + 6.0}`} />
          </g>
        ) : isQueen ? (
          /* Joyful sparkling crescent-smile eyes with tiny dainty eyelash flicks */
          <g fill="none" stroke="#3A1233" strokeWidth="1.95" strokeLinecap="round">
            <path d={`M 68.0 ${headCy + 4.2} Q 72.0 ${headCy - 0.8} 76.0 ${headCy + 4.2}`} />
            <path d={`M 84.0 ${headCy + 4.2} Q 88.0 ${headCy - 0.8} 92.0 ${headCy + 4.2}`} />
            {/* Tiny dainty outer eyelash flicks */}
            <path d={`M 68.1 ${headCy + 3.8} L 66.4 ${headCy + 2.4}`} strokeWidth="1.15" />
            <path d={`M 91.9 ${headCy + 3.8} L 93.6 ${headCy + 2.4}`} strokeWidth="1.15" />
          </g>
        ) : (
          /* Bright sparkling glossy eyes (deep plum iris + crisp starlight catchlights + gentle blink) */
          <g
            className="origin-story-eye-blink"
            style={{
              transformOrigin: `80px ${headCy + 3.2}px`,
              ['--blink-dur' as string]: '4.2s',
              ['--blink-delay' as string]: '0.5s',
            }}
          >
            {[72.0, 88.0].map((cx, idx) => (
              <g key={cx}>
                {/* Subtle soft warm-ivory sclera rim */}
                <ellipse cx={cx} cy={headCy + 3.3} rx="3.45" ry="4.05" fill="#FFF9F7" />
                {/* Deep lustrous plum iris */}
                <ellipse cx={cx} cy={headCy + 3.3} rx="3.2" ry="3.85" fill={`url(#${irisId})`} />
                {/* Warm lower iris sheen */}
                <path
                  d={`M ${cx - 2.0} ${headCy + 5.3} Q ${cx} ${headCy + 6.6} ${cx + 2.0} ${headCy + 5.3}`}
                  fill="none"
                  stroke="#C46AA0"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.58"
                />
                {/* Crisp upper lash arch + cute outer eyelash flick */}
                <path
                  d={`M ${cx - 3.5} ${headCy + 1.5} Q ${cx} ${headCy - 1.5} ${cx + 3.5} ${headCy + 1.5}`}
                  fill="none"
                  stroke="#2B0E24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d={
                    idx === 0
                      ? `M ${cx - 3.4} ${headCy + 1.3} L ${cx - 4.8} ${headCy - 0.1}`
                      : `M ${cx + 3.4} ${headCy + 1.3} L ${cx + 4.8} ${headCy - 0.1}`
                  }
                  fill="none"
                  stroke="#2B0E24"
                  strokeWidth="1.12"
                  strokeLinecap="round"
                />
                {/* Starlight primary & micro catchlights */}
                <circle cx={cx - 1.05} cy={headCy + 1.8} r="1.35" fill="#FFFFFF" />
                <circle cx={cx + 1.15} cy={headCy + 4.9} r="0.6" fill="#FFFFFF" opacity="0.9" />
              </g>
            ))}
          </g>
        )}

        {/* Tiny subtle nose dot/shadow */}
        <ellipse cx="80" cy={headCy + 7.6} rx="0.95" ry="0.58" fill="rgba(182, 114, 96, 0.34)" />

        {/* Soft feathered radial-gradient rosy cheek blush (zero harsh rectangles or stripes) */}
        <ellipse cx="67.2" cy={headCy + 9.0} rx={blushRx} ry={blushRy} fill={`url(#${blushId})`} opacity={blushOpacity} />
        <ellipse cx="92.8" cy={headCy + 9.0} rx={blushRx} ry={blushRy} fill={`url(#${blushId})`} opacity={blushOpacity} />

        {/* Expressive cute mouths */}
        {isBonk ? (
          /* Tiny surprised o mouth */
          <ellipse
            cx="80"
            cy={headCy + 14.2}
            rx="2.0"
            ry="2.5"
            fill="#F6A2C3"
            stroke="#96345B"
            strokeWidth="1.25"
          />
        ) : isDetermined ? (
          /* Cute focused determined mouth */
          <path
            d={`M 76.8 ${headCy + 14.4} Q 80 ${headCy + 13.4} 83.2 ${headCy + 14.4}`}
            fill="none"
            stroke="#96345B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ) : isProud ? (
          /* Adorable cheeky proud smile for Age 17 final 5'2" hold */
          <g>
            <path
              d={`M 75.6 ${headCy + 13.0} Q 80 ${headCy + 18.4} 84.6 ${headCy + 12.8} Q 80 ${headCy + 14.0} 75.6 ${headCy + 13.0} Z`}
              fill="#B2426D"
            />
            <ellipse cx="80" cy={headCy + 15.6} rx="2.2" ry="1.15" fill="#F8A2C2" />
            <path
              d={`M 75.2 ${headCy + 12.8} Q 80 ${headCy + 14.4} 84.8 ${headCy + 12.6}`}
              fill="none"
              stroke="#8F2E56"
              strokeWidth="1.15"
              strokeLinecap="round"
            />
          </g>
        ) : isQueen ? (
          /* Warm beaming celebratory birthday smile */
          <g>
            <path
              d={`M 74.8 ${headCy + 12.6} Q 80 ${headCy + 19.6} 85.2 ${headCy + 12.6} Q 80 ${headCy + 13.6} 74.8 ${headCy + 12.6} Z`}
              fill="#9B3960"
            />
            <ellipse cx="80" cy={headCy + 16.0} rx="2.6" ry="1.45" fill="#F596B8" />
            <path
              d={`M 74.6 ${headCy + 12.5} Q 80 ${headCy + 13.8} 85.4 ${headCy + 12.5}`}
              fill="none"
              stroke="#892B51"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </g>
        ) : (
          /* Sweet warm smile */
          <path
            d={`M 75.8 ${headCy + 13.2} Q 80 ${headCy + 17.4} 84.2 ${headCy + 13.2}`}
            fill="none"
            stroke="#96345B"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        )}
      </g>

      {/* Top expression prop (comic bump stars, Age 15 ? sparkle, or floating golden 17 tiara) */}
      {topDecoration}
    </svg>
  );
}

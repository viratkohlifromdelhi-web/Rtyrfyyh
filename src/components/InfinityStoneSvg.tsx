import { useId } from 'react';
import type { InfinityStoneSpec } from '../utils/infinityVault';

interface InfinityStoneSvgProps {
  stone: InfinityStoneSpec;
  size?: number;
  showSparks?: boolean;
  className?: string;
}

/**
 * Bespoke, multi-faceted layered SVG crystal gemstones for all 6 Avengers Infinity Stones.
 * Each stone has a distinct crystal silhouette, inner geometric facet planes,
 * white-hot glowing core, specular star glints, volumetric radial halo, and tiny energy sparks.
 */
export function InfinityStoneSvg({
  stone,
  size = 54,
  showSparks = true,
  className = '',
}: InfinityStoneSvgProps) {
  const uid = useId().replace(/:/g, '');
  const haloId = `halo-${stone.id}-${uid}`;
  const bodyId = `body-${stone.id}-${uid}`;
  const coreId = `core-${stone.id}-${uid}`;
  const shineId = `shine-${stone.id}-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stone.core} stopOpacity="0.92" />
          <stop offset="38%" stopColor={stone.bodyStart} stopOpacity="0.62" />
          <stop offset="72%" stopColor={stone.bodyEnd} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stone.bodyEnd} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={bodyId} x1="18%" y1="10%" x2="84%" y2="92%">
          <stop offset="0%" stopColor={stone.core} />
          <stop offset="28%" stopColor={stone.bodyStart} />
          <stop offset="100%" stopColor={stone.bodyEnd} />
        </linearGradient>

        <radialGradient id={coreId} cx="46%" cy="44%" r="44%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
          <stop offset="38%" stopColor={stone.core} stopOpacity="0.88" />
          <stop offset="82%" stopColor={stone.bodyStart} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stone.bodyEnd} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.88" />
          <stop offset="100%" stopColor={stone.core} stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Volumetric radial halo */}
      <circle cx="40" cy="40" r="38" fill={`url(#${haloId})`} />

      {/* Bespoke faceted crystal silhouette per Avengers stone */}
      {stone.id === 'space' && (
        <g>
          {/* Space Stone: Faceted sapphire-cyan asymmetric prism */}
          <polygon
            points="40,10 61,21 64,47 46,69 22,63 16,35 25,17"
            fill={`url(#${bodyId})`}
            stroke={stone.core}
            strokeOpacity="0.72"
            strokeWidth="1.2"
          />
          <polygon points="40,10 61,21 47,30 25,17" fill={`url(#${shineId})`} opacity="0.78" />
          <polygon points="16,35 25,17 31,37 22,63" fill={stone.bodyStart} opacity="0.65" />
          <polygon points="61,21 64,47 47,48 47,30" fill={stone.bodyEnd} opacity="0.7" />
          <polygon points="64,47 46,69 36,53 47,48" fill={stone.bodyEnd} opacity="0.86" />
          <polygon points="22,63 46,69 36,53 31,37" fill={stone.bodyStart} opacity="0.48" />
          <polygon points="31,37 47,30 47,48 36,53" fill={`url(#${coreId})`} />
          <path
            d="M40 10L47 30L64 47M25 17L31 37L46 69M16 35L31 37L47 30L61 21M22 63L36 53L47 48"
            stroke="#FFFFFF"
            strokeOpacity="0.45"
            strokeWidth="0.9"
          />
        </g>
      )}

      {stone.id === 'mind' && (
        <g>
          {/* Mind Stone: Radiant faceted vertical diamond-kite jewel */}
          <polygon
            points="40,8 61,32 54,60 40,72 26,60 19,32"
            fill={`url(#${bodyId})`}
            stroke={stone.core}
            strokeOpacity="0.78"
            strokeWidth="1.2"
          />
          <polygon points="40,8 61,32 48,34 40,22" fill={`url(#${shineId})`} opacity="0.82" />
          <polygon points="40,8 40,22 32,34 19,32" fill="#FFFFFF" opacity="0.45" />
          <polygon points="61,32 54,60 45,51 48,34" fill={stone.bodyEnd} opacity="0.68" />
          <polygon points="54,60 40,72 40,56 45,51" fill={stone.bodyEnd} opacity="0.85" />
          <polygon points="19,32 32,34 35,51 26,60" fill={stone.bodyStart} opacity="0.58" />
          <polygon points="40,22 48,34 45,51 40,56 35,51 32,34" fill={`url(#${coreId})`} />
          <path
            d="M40 8V22M40 56V72M19 32L32 34L40 22L48 34L61 32M26 60L35 51L40 56L45 51L54 60"
            stroke="#FFFFFF"
            strokeOpacity="0.5"
            strokeWidth="0.9"
          />
        </g>
      )}

      {stone.id === 'reality' && (
        <g>
          {/* Reality Stone: Sharp jagged crimson Aether crystal */}
          <polygon
            points="43,9 63,25 58,56 38,71 19,58 17,29 29,14"
            fill={`url(#${bodyId})`}
            stroke={stone.core}
            strokeOpacity="0.72"
            strokeWidth="1.2"
          />
          <polygon points="43,9 29,14 34,31 48,26" fill={`url(#${shineId})`} opacity="0.8" />
          <polygon points="43,9 63,25 48,26" fill="#FFFFFF" opacity="0.4" />
          <polygon points="63,25 58,56 46,49 48,26" fill={stone.bodyEnd} opacity="0.76" />
          <polygon points="58,56 38,71 37,54 46,49" fill={stone.bodyEnd} opacity="0.9" />
          <polygon points="17,29 29,14 34,31 29,48 19,58" fill={stone.bodyStart} opacity="0.56" />
          <polygon points="34,31 48,26 46,49 37,54 29,48" fill={`url(#${coreId})`} />
          <path
            d="M29 14L34 31L48 26L63 25M17 29L29 48L37 54L58 56M43 9L48 26L46 49L38 71"
            stroke="#FFFFFF"
            strokeOpacity="0.46"
            strokeWidth="0.9"
          />
        </g>
      )}

      {stone.id === 'power' && (
        <g>
          {/* Power Stone: Bold hexagonal amethyst energy gem */}
          <polygon
            points="40,10 63,23 63,56 40,70 17,56 17,23"
            fill={`url(#${bodyId})`}
            stroke={stone.core}
            strokeOpacity="0.78"
            strokeWidth="1.2"
          />
          <polygon points="40,10 63,23 50,31 40,23" fill={`url(#${shineId})`} opacity="0.76" />
          <polygon points="40,10 40,23 30,31 17,23" fill="#FFFFFF" opacity="0.5" />
          <polygon points="63,23 63,56 50,49 50,31" fill={stone.bodyEnd} opacity="0.72" />
          <polygon points="63,56 40,70 40,56 50,49" fill={stone.bodyEnd} opacity="0.88" />
          <polygon points="17,23 30,31 30,49 17,56" fill={stone.bodyStart} opacity="0.6" />
          <polygon points="40,23 50,31 50,49 40,56 30,49 30,31" fill={`url(#${coreId})`} />
          <path
            d="M40 10V23M40 56V70M17 23L30 31L40 23L50 31L63 23M17 56L30 49L40 56L50 49L63 56"
            stroke="#FFFFFF"
            strokeOpacity="0.48"
            strokeWidth="0.9"
          />
        </g>
      )}

      {stone.id === 'time' && (
        <g>
          {/* Time Stone: Tapered emerald-oval multifaceted mystic crystal */}
          <polygon
            points="40,9 56,18 62,40 56,62 40,71 24,62 18,40 24,18"
            fill={`url(#${bodyId})`}
            stroke={stone.core}
            strokeOpacity="0.78"
            strokeWidth="1.2"
          />
          <polygon points="40,9 56,18 47,27 33,27 24,18" fill={`url(#${shineId})`} opacity="0.8" />
          <polygon points="56,18 62,40 51,40 47,27" fill={stone.bodyEnd} opacity="0.52" />
          <polygon points="62,40 56,62 47,53 51,40" fill={stone.bodyEnd} opacity="0.82" />
          <polygon points="56,62 40,71 33,53 47,53" fill={stone.bodyEnd} opacity="0.88" />
          <polygon points="24,18 33,27 29,40 18,40" fill="#FFFFFF" opacity="0.34" />
          <polygon points="33,27 47,27 51,40 47,53 33,53 29,40" fill={`url(#${coreId})`} />
          <path
            d="M24 18L33 27H47L56 18M18 40H29L33 53H47L51 40H62M40 9L33 27M40 9L47 27M40 71L33 53M40 71L47 53"
            stroke="#FFFFFF"
            strokeOpacity="0.48"
            strokeWidth="0.9"
          />
        </g>
      )}

      {stone.id === 'soul' && (
        <g>
          {/* Soul Stone: Radiant marquise-teardrop amber crystal */}
          <polygon
            points="40,8 59,26 62,48 40,72 18,48 21,26"
            fill={`url(#${bodyId})`}
            stroke={stone.core}
            strokeOpacity="0.78"
            strokeWidth="1.2"
          />
          <polygon points="40,8 59,26 48,32 40,22" fill={`url(#${shineId})`} opacity="0.78" />
          <polygon points="40,8 40,22 32,32 21,26" fill="#FFFFFF" opacity="0.48" />
          <polygon points="59,26 62,48 49,47 48,32" fill={stone.bodyEnd} opacity="0.65" />
          <polygon points="62,48 40,72 40,56 49,47" fill={stone.bodyEnd} opacity="0.88" />
          <polygon points="21,26 32,32 31,47 18,48" fill={stone.bodyStart} opacity="0.54" />
          <polygon points="40,22 48,32 49,47 40,56 31,47 32,32" fill={`url(#${coreId})`} />
          <path
            d="M40 8V22M40 56V72M21 26L32 32L40 22L48 32L59 26M18 48L31 47L40 56L49 47L62 48"
            stroke="#FFFFFF"
            strokeOpacity="0.48"
            strokeWidth="0.9"
          />
        </g>
      )}

      {/* White-hot specular star glint on upper-left facet */}
      <g opacity="0.94">
        <path
          d="M31 21L32.6 25.4L37 27L32.6 28.6L31 33L29.4 28.6L25 27L29.4 25.4L31 21Z"
          fill="#FFFFFF"
        />
        <circle cx="48" cy="49" r="1.8" fill={stone.core} opacity="0.82" />
      </g>

      {/* Tiny orbiting energy sparks */}
      {showSparks && (
        <g>
          <circle
            cx="14"
            cy="20"
            r="2"
            fill={stone.sparkColor}
            className="animate-vault-spark"
            style={{ animationDelay: '0s' }}
          />
          <circle
            cx="67"
            cy="26"
            r="1.7"
            fill="#FFFFFF"
            className="animate-vault-spark"
            style={{ animationDelay: '0.7s' }}
          />
          <circle
            cx="63"
            cy="64"
            r="2.1"
            fill={stone.sparkColor}
            className="animate-vault-spark"
            style={{ animationDelay: '1.3s' }}
          />
        </g>
      )}
    </svg>
  );
}

import { useId } from 'react';
import type { InfinityStoneId, InfinityStoneSpec } from '../utils/infinityVault';

interface InfinityStoneSvgProps {
  stone: InfinityStoneSpec;
  size?: number;
  showSparks?: boolean;
  className?: string;
}

interface FacetPolygon {
  points: string;
  tone: 'dark' | 'deep' | 'mid' | 'light' | 'bright' | 'glint';
  opacity: number;
}

interface CrystalGeometry {
  /** Unique asymmetrical organic rough-cut outer silhouette in 0..100 coordinate space */
  silhouette: string;
  /** Tight inner rim bounce-light arc along the lower-right bevel */
  bounceRimPath: string;
  /** Top-left curved specular glass ridge */
  specularCurvePath: string;
  /** Crisp pinpoint glint center */
  glintPos: { x: number; y: number };
  /** Off-center glowing plasma knot */
  plasmaPos: { cx: number; cy: number; rx: number; ry: number; rot: number };
  /** 2-3 ultra-thin luminous internal crystalline fracture/energy veins */
  veinPaths: readonly string[];
  /** 10-14 interlocking asymmetrical shaded crystal facets */
  facets: readonly FacetPolygon[];
  /** Crisp 0.5px internal facet ridge lines */
  ridgePath: string;
}

/**
 * Six bespoke rough-cut asymmetrical crystal geometries — no symmetrical hexagons,
 * no two silhouettes identical — modeled after the uncut cosmic Avengers Infinity Stones.
 */
const CRYSTAL_GEOMETRIES: Record<InfinityStoneId, CrystalGeometry> = {
  // Space Stone: Rough-cut tilted sapphire ovoid-prism with broad shoulder & tapered foot
  space: {
    silhouette:
      'M48 11 L66 19 L77 37 L74 61 L59 83 L40 89 L25 74 L21 48 L29 24 Z',
    bounceRimPath: 'M72 56 L58 80 L43 85',
    specularCurvePath: 'M32 27 Q39 18 50 16',
    glintPos: { x: 38, y: 27 },
    plasmaPos: { cx: 46, cy: 46, rx: 13, ry: 17, rot: -14 },
    veinPaths: [
      'M45 45 L35 31 L39 20',
      'M47 47 L62 41 L71 48',
      'M45 49 L41 66 L48 77',
    ],
    facets: [
      { points: '48,11 66,19 54,31 38,24', tone: 'bright', opacity: 0.44 },
      { points: '29,24 48,11 38,24 31,41', tone: 'glint', opacity: 0.52 },
      { points: '66,19 77,37 61,44 54,31', tone: 'mid', opacity: 0.34 },
      { points: '77,37 74,61 59,58 61,44', tone: 'dark', opacity: 0.34 },
      { points: '74,61 59,83 51,69 59,58', tone: 'dark', opacity: 0.42 },
      { points: '59,83 40,89 41,72 51,69', tone: 'deep', opacity: 0.46 },
      { points: '40,89 25,74 34,62 41,72', tone: 'dark', opacity: 0.36 },
      { points: '25,74 21,48 33,51 34,62', tone: 'mid', opacity: 0.28 },
      { points: '21,48 29,24 31,41 33,51', tone: 'light', opacity: 0.26 },
      { points: '38,24 54,31 53,48 36,44 31,41', tone: 'light', opacity: 0.22 },
      { points: '54,31 61,44 59,58 53,48', tone: 'deep', opacity: 0.24 },
      { points: '36,44 53,48 51,69 41,72 34,62', tone: 'mid', opacity: 0.16 },
    ],
    ridgePath:
      'M48 11 L38 24 L31 41 L33 51 L34 62 L41 72 L51 69 L59 58 L61 44 L54 31 L38 24 M36 44 L53 48 L51 69 M54 31 L66 19 M61 44 L77 37 M59 58 L74 61 M41 72 L40 89',
  },

  // Mind Stone: Elongated asymmetrical rough teardrop-almond crystal (Vision's forehead gem)
  mind: {
    silhouette:
      'M52 9 L68 24 L76 47 L69 72 L51 90 L32 76 L24 51 L31 27 L41 14 Z',
    bounceRimPath: 'M68 67 L52 86 L37 77',
    specularCurvePath: 'M34 30 Q41 18 51 14',
    glintPos: { x: 42, y: 26 },
    plasmaPos: { cx: 49, cy: 48, rx: 12, ry: 18, rot: 8 },
    veinPaths: [
      'M49 46 L42 29 L48 18',
      'M50 49 L64 44 L70 55',
      'M48 51 L39 67 L46 80',
    ],
    facets: [
      { points: '52,9 41,14 45,27 56,25', tone: 'glint', opacity: 0.56 },
      { points: '52,9 68,24 56,25', tone: 'bright', opacity: 0.36 },
      { points: '41,14 31,27 37,40 45,27', tone: 'bright', opacity: 0.44 },
      { points: '68,24 76,47 62,46 56,25', tone: 'mid', opacity: 0.3 },
      { points: '76,47 69,72 57,63 62,46', tone: 'dark', opacity: 0.36 },
      { points: '69,72 51,90 48,73 57,63', tone: 'dark', opacity: 0.42 },
      { points: '51,90 32,76 41,66 48,73', tone: 'deep', opacity: 0.4 },
      { points: '32,76 24,51 36,54 41,66', tone: 'dark', opacity: 0.28 },
      { points: '24,51 31,27 37,40 36,54', tone: 'light', opacity: 0.28 },
      { points: '45,27 56,25 62,46 47,44 37,40', tone: 'light', opacity: 0.24 },
      { points: '47,44 62,46 57,63 48,73 41,66 36,54', tone: 'mid', opacity: 0.14 },
    ],
    ridgePath:
      'M52 9 L56 25 L62 46 L57 63 L48 73 L41 66 L36 54 L37 40 L45 27 L56 25 M37 40 L47 44 L62 46 M47 44 L48 73 M45 27 L41 14 M57 63 L69 72',
  },

  // Reality Stone: Jagged, slightly skewed crimson Aether shard with razor bevels
  reality: {
    silhouette:
      'M55 10 L73 25 L79 49 L66 75 L46 90 L26 78 L20 54 L27 29 L41 15 Z',
    bounceRimPath: 'M65 71 L47 86 L32 78',
    specularCurvePath: 'M30 33 Q39 20 53 15',
    glintPos: { x: 40, y: 28 },
    plasmaPos: { cx: 48, cy: 49, rx: 14, ry: 16, rot: -18 },
    veinPaths: [
      'M47 48 L36 35 L43 21',
      'M50 47 L67 39 L72 52',
      'M48 52 L53 70 L45 81',
    ],
    facets: [
      { points: '55,10 41,15 44,29 59,28', tone: 'glint', opacity: 0.52 },
      { points: '55,10 73,25 59,28', tone: 'bright', opacity: 0.36 },
      { points: '41,15 27,29 36,42 44,29', tone: 'bright', opacity: 0.44 },
      { points: '73,25 79,49 63,47 59,28', tone: 'mid', opacity: 0.34 },
      { points: '79,49 66,75 56,64 63,47', tone: 'dark', opacity: 0.4 },
      { points: '66,75 46,90 45,73 56,64', tone: 'dark', opacity: 0.44 },
      { points: '46,90 26,78 36,66 45,73', tone: 'deep', opacity: 0.42 },
      { points: '26,78 20,54 32,54 36,66', tone: 'dark', opacity: 0.32 },
      { points: '20,54 27,29 36,42 32,54', tone: 'light', opacity: 0.24 },
      { points: '44,29 59,28 56,47 36,42', tone: 'light', opacity: 0.22 },
      { points: '56,47 63,47 56,64 45,73', tone: 'deep', opacity: 0.26 },
      { points: '36,42 56,47 45,73 36,66 32,54', tone: 'mid', opacity: 0.16 },
    ],
    ridgePath:
      'M41 15 L44 29 L59 28 L63 47 L56 64 L45 73 L36 66 L32 54 L36 42 L44 29 M36 42 L56 47 L59 28 M56 47 L45 73 M63 47 L79 49 M45 73 L46 90',
  },

  // Power Stone: Heavy rough-hewn amethyst nugget-crystal (NOT a symmetrical hexagon)
  power: {
    silhouette:
      'M45 12 L67 17 L79 38 L75 65 L56 86 L34 84 L21 63 L22 36 L32 19 Z',
    bounceRimPath: 'M72 61 L55 82 L38 81',
    specularCurvePath: 'M27 36 Q33 21 46 17',
    glintPos: { x: 37, y: 29 },
    plasmaPos: { cx: 49, cy: 49, rx: 15, ry: 15, rot: 12 },
    veinPaths: [
      'M48 48 L35 36 L34 24',
      'M50 47 L66 35 L73 46',
      'M48 51 L41 69 L53 78',
    ],
    facets: [
      { points: '45,12 67,17 57,30 41,27', tone: 'bright', opacity: 0.42 },
      { points: '32,19 45,12 41,27 32,39', tone: 'glint', opacity: 0.54 },
      { points: '67,17 79,38 64,43 57,30', tone: 'mid', opacity: 0.34 },
      { points: '79,38 75,65 62,59 64,43', tone: 'dark', opacity: 0.36 },
      { points: '75,65 56,86 52,70 62,59', tone: 'dark', opacity: 0.44 },
      { points: '56,86 34,84 40,71 52,70', tone: 'deep', opacity: 0.42 },
      { points: '34,84 21,63 34,59 40,71', tone: 'dark', opacity: 0.36 },
      { points: '21,63 22,36 32,39 34,59', tone: 'light', opacity: 0.22 },
      { points: '22,36 32,19 32,39', tone: 'bright', opacity: 0.32 },
      { points: '41,27 57,30 64,43 53,51 39,46', tone: 'light', opacity: 0.22 },
      { points: '32,39 41,27 39,46 34,59', tone: 'mid', opacity: 0.18 },
      { points: '39,46 53,51 62,59 52,70 40,71 34,59', tone: 'deep', opacity: 0.2 },
    ],
    ridgePath:
      'M45 12 L41 27 L57 30 L64 43 L62 59 L52 70 L40 71 L34 59 L32 39 L41 27 M39 46 L53 51 L64 43 M53 51 L52 70 M32 39 L39 46 L34 59 M57 30 L67 17',
  },

  // Time Stone: Tall organic uncut emerald-lozenge crystal (Eye of Agamotto gem)
  time: {
    silhouette:
      'M50 8 L66 20 L74 44 L71 69 L54 91 L36 85 L25 62 L26 35 L36 17 Z',
    bounceRimPath: 'M69 65 L54 87 L40 82',
    specularCurvePath: 'M31 35 Q36 20 49 14',
    glintPos: { x: 41, y: 25 },
    plasmaPos: { cx: 49, cy: 49, rx: 12, ry: 19, rot: -6 },
    veinPaths: [
      'M49 48 L41 31 L46 17',
      'M50 49 L64 44 L67 60',
      'M48 52 L41 71 L51 82',
    ],
    facets: [
      { points: '50,8 36,17 43,28 56,26', tone: 'glint', opacity: 0.56 },
      { points: '50,8 66,20 56,26', tone: 'bright', opacity: 0.36 },
      { points: '36,17 26,35 37,43 43,28', tone: 'bright', opacity: 0.42 },
      { points: '66,20 74,44 61,45 56,26', tone: 'mid', opacity: 0.32 },
      { points: '74,44 71,69 59,62 61,45', tone: 'dark', opacity: 0.36 },
      { points: '71,69 54,91 50,74 59,62', tone: 'dark', opacity: 0.44 },
      { points: '54,91 36,85 41,71 50,74', tone: 'deep', opacity: 0.42 },
      { points: '36,85 25,62 36,59 41,71', tone: 'dark', opacity: 0.32 },
      { points: '25,62 26,35 37,43 36,59', tone: 'light', opacity: 0.24 },
      { points: '43,28 56,26 61,45 48,47 37,43', tone: 'light', opacity: 0.22 },
      { points: '48,47 61,45 59,62 50,74', tone: 'deep', opacity: 0.24 },
      { points: '37,43 48,47 50,74 41,71 36,59', tone: 'mid', opacity: 0.16 },
    ],
    ridgePath:
      'M50 8 L43 28 L56 26 L61 45 L59 62 L50 74 L41 71 L36 59 L37 43 L43 28 M37 43 L48 47 L61 45 M48 47 L50 74 M56 26 L66 20 M59 62 L71 69',
  },

  // Soul Stone: Sculpted asymmetrical amber-orange flame-ovoid gem (Vormir crystal)
  soul: {
    silhouette:
      'M47 9 L66 22 L77 45 L72 71 L52 90 L31 80 L22 55 L26 30 L38 15 Z',
    bounceRimPath: 'M70 67 L52 86 L36 78',
    specularCurvePath: 'M29 33 Q37 19 48 14',
    glintPos: { x: 39, y: 27 },
    plasmaPos: { cx: 48, cy: 49, rx: 14, ry: 17, rot: 10 },
    veinPaths: [
      'M47 47 L38 33 L44 19',
      'M49 48 L65 40 L71 53',
      'M47 51 L43 69 L53 81',
    ],
    facets: [
      { points: '47,9 38,15 43,28 56,27', tone: 'glint', opacity: 0.56 },
      { points: '47,9 66,22 56,27', tone: 'bright', opacity: 0.38 },
      { points: '38,15 26,30 36,42 43,28', tone: 'bright', opacity: 0.44 },
      { points: '66,22 77,45 63,46 56,27', tone: 'mid', opacity: 0.32 },
      { points: '77,45 72,71 59,63 63,46', tone: 'dark', opacity: 0.38 },
      { points: '72,71 52,90 49,73 59,63', tone: 'dark', opacity: 0.44 },
      { points: '52,90 31,80 39,67 49,73', tone: 'deep', opacity: 0.42 },
      { points: '31,80 22,55 34,56 39,67', tone: 'dark', opacity: 0.3 },
      { points: '22,55 26,30 36,42 34,56', tone: 'light', opacity: 0.26 },
      { points: '43,28 56,27 63,46 49,47 36,42', tone: 'light', opacity: 0.22 },
      { points: '49,47 63,46 59,63 49,73', tone: 'deep', opacity: 0.24 },
      { points: '36,42 49,47 49,73 39,67 34,56', tone: 'mid', opacity: 0.16 },
    ],
    ridgePath:
      'M47 9 L43 28 L56 27 L63 46 L59 63 L49 73 L39 67 L34 56 L36 42 L43 28 M36 42 L49 47 L63 46 M49 47 L49 73 M56 27 L66 22 M59 63 L72 71',
  },
};

function resolveFacetFill(tone: FacetPolygon['tone'], stone: InfinityStoneSpec): string {
  switch (tone) {
    case 'dark':
      return '#000000';
    case 'deep':
      return stone.darkEdge;
    case 'mid':
      return stone.bodyEnd;
    case 'light':
      return '#FFFFFF';
    case 'bright':
      return stone.core;
    case 'glint':
      return '#FFFFFF';
  }
}

/**
 * Movie-grade 6-layer optical SVG renderer for all 6 Avengers Infinity Stones:
 * 1. Atmospheric outer bloom casting colored light onto dark velvet
 * 2. Tight intense core halo hugging the crystal perimeter
 * 3. Deep 3D off-center radial crystal body (incandescent core -> saturated mid -> deep refractive -> dark edge)
 * 4. 11-12 interlocking asymmetrical shaded crystal facets + 0.5px facet ridge lines
 * 5. Off-center internal cosmic plasma knot + breathing fracture/energy veins
 * 6. Razor-sharp top-left glass specular glint & curve + bottom-right bounce-light rim
 */
export function InfinityStoneSvg({
  stone,
  size = 58,
  showSparks = true,
  className = '',
}: InfinityStoneSvgProps) {
  const uid = useId().replace(/:/g, '');
  const bloomId = `bloom-${stone.id}-${uid}`;
  const bodyGradId = `body-${stone.id}-${uid}`;
  const plasmaGradId = `plasma-${stone.id}-${uid}`;
  const clipId = `clip-${stone.id}-${uid}`;
  const rimBlurId = `rimblur-${stone.id}-${uid}`;

  const geo = CRYSTAL_GEOMETRIES[stone.id];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Layer 1: Atmospheric Outer Bloom */}
        <radialGradient id={bloomId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stone.aura} stopOpacity="0.58" />
          <stop offset="42%" stopColor={stone.aura} stopOpacity="0.26" />
          <stop offset="74%" stopColor={stone.bodyEnd} stopOpacity="0.08" />
          <stop offset="100%" stopColor={stone.bodyEnd} stopOpacity="0" />
        </radialGradient>

        {/* Layer 2: Soft tight halo filter */}
        <filter id={rimBlurId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>

        {/* Layer 3: Deep 3D off-center radial crystal body */}
        <radialGradient id={bodyGradId} cx="42%" cy="38%" r="58%" fx="38%" fy="34%">
          <stop offset="0%" stopColor={stone.core} />
          <stop offset="22%" stopColor={stone.bodyStart} />
          <stop offset="68%" stopColor={stone.bodyEnd} />
          <stop offset="100%" stopColor={stone.darkEdge} />
        </radialGradient>

        {/* Layer 5: Internal glowing cosmic plasma knot */}
        <radialGradient id={plasmaGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
          <stop offset="32%" stopColor={stone.core} stopOpacity="0.78" />
          <stop offset="68%" stopColor={stone.aura} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stone.bodyEnd} stopOpacity="0" />
        </radialGradient>

        {/* Crystal Silhouette Clip Path */}
        <clipPath id={clipId}>
          <path d={geo.silhouette} />
        </clipPath>
      </defs>

      {/* 1. Atmospheric Outer Bloom */}
      <circle cx="50" cy="50" r="47" fill={`url(#${bloomId})`} opacity="0.78" />

      {/* 2. Tight Intense Core Halo hugging the crystal perimeter */}
      <path
        d={geo.silhouette}
        fill={stone.aura}
        fillOpacity="0.24"
        stroke={stone.aura}
        strokeWidth="3.2"
        strokeOpacity="0.72"
        filter={`url(#${rimBlurId})`}
      />

      {/* 3. Deep 3D Crystal Body */}
      <path
        d={geo.silhouette}
        fill={`url(#${bodyGradId})`}
        stroke={stone.core}
        strokeOpacity="0.48"
        strokeWidth="0.75"
      />

      {/* 4 & 5. Clipped Interlocking Facets + Internal Cosmic Plasma Core & Breathing Fracture Veins */}
      <g clipPath={`url(#${clipId})`}>
        {geo.facets.map((facet, index) => (
          <polygon
            key={index}
            points={facet.points}
            fill={resolveFacetFill(facet.tone, stone)}
            fillOpacity={facet.opacity}
          />
        ))}

        {/* Razor-thin 0.5px facet ridge lines */}
        <path
          d={geo.ridgePath}
          stroke="#FFFFFF"
          strokeOpacity="0.42"
          strokeWidth="0.55"
          strokeLinejoin="round"
        />

        {/* Layer 5: Internal glowing cosmic plasma knot + breathing fracture veins */}
        <g className="animate-stone-vein">
          <ellipse
            cx={geo.plasmaPos.cx}
            cy={geo.plasmaPos.cy}
            rx={geo.plasmaPos.rx}
            ry={geo.plasmaPos.ry}
            transform={`rotate(${geo.plasmaPos.rot} ${geo.plasmaPos.cx} ${geo.plasmaPos.cy})`}
            fill={`url(#${plasmaGradId})`}
          />
          {geo.veinPaths.map((d, idx) => (
            <path
              key={idx}
              d={d}
              stroke={stone.core}
              strokeWidth="0.75"
              strokeOpacity="0.82"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Bottom-right bounce-light rim inside crystal bevel */}
        <path
          d={geo.bounceRimPath}
          stroke={stone.aura}
          strokeWidth="1.6"
          strokeOpacity="0.72"
          strokeLinecap="round"
        />
      </g>

      {/* 6. Razor-Sharp Glass Specular Highlights on Top-Left Facet Ridge */}
      <path
        d={geo.specularCurvePath}
        stroke="#FFFFFF"
        strokeWidth="1.35"
        strokeOpacity="0.86"
        strokeLinecap="round"
      />
      <g>
        <path
          d={`M${geo.glintPos.x} ${geo.glintPos.y - 5.5} L${geo.glintPos.x + 1.15} ${geo.glintPos.y - 1.15} L${geo.glintPos.x + 5.5} ${geo.glintPos.y} L${geo.glintPos.x + 1.15} ${geo.glintPos.y + 1.15} L${geo.glintPos.x} ${geo.glintPos.y + 5.5} L${geo.glintPos.x - 1.15} ${geo.glintPos.y + 1.15} L${geo.glintPos.x - 5.5} ${geo.glintPos.y} L${geo.glintPos.x - 1.15} ${geo.glintPos.y - 1.15} Z`}
          fill="#FFFFFF"
          opacity="0.96"
        />
        <circle cx={geo.glintPos.x} cy={geo.glintPos.y} r="1.4" fill="#FFFFFF" />
      </g>

      {/* Restrained delicate cosmic pinprick dust motes around orbiting stones */}
      {showSparks && (
        <g>
          <circle
            cx="15"
            cy="24"
            r="1.3"
            fill={stone.sparkColor}
            className="animate-vault-spark"
            style={{ animationDelay: '0s' }}
          />
          <circle
            cx="84"
            cy="30"
            r="1.1"
            fill="#FFFFFF"
            className="animate-vault-spark"
            style={{ animationDelay: '0.8s' }}
          />
          <circle
            cx="79"
            cy="78"
            r="1.35"
            fill={stone.sparkColor}
            className="animate-vault-spark"
            style={{ animationDelay: '1.5s' }}
          />
        </g>
      )}
    </svg>
  );
}

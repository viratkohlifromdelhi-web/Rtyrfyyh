import type { OriginBackdropMood, OriginSceneId } from './originScript';

export type OriginKissBeat = 'twilight' | 'shyGlance' | 'kissing' | 'afterglow';

export interface OriginStageBackdropProps {
  mood: OriginBackdropMood;
  sceneId: OriginSceneId;
  isRulerStage: boolean;
  kissRunKey?: number;
  kissBeat?: OriginKissBeat;
}

interface StarNode {
  id: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  delaySec: number;
  durSec: number;
  isFourPoint: boolean;
}

interface AmbientParticleNode {
  id: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  delaySec: number;
  durSec: number;
  driftX: number;
  driftY: number;
  isForeground: boolean;
}

/**
 * 28 staggered twinkling stars for Scene 5 (mix of pinprick dots and delicate 4-point glints).
 */
const TWILIGHT_STARS: readonly StarNode[] = Array.from({ length: 28 }, (_, idx) => {
  const leftPct = 5 + ((idx * 19 + (idx % 4) * 7) % 90);
  const topPct = 6 + ((idx * 13 + (idx % 3) * 5) % 52);
  const isFourPoint = idx % 4 === 0;
  const sizePx = isFourPoint ? 7 + (idx % 3) * 2 : 2.5 + (idx % 3) * 0.9;
  return {
    id: idx + 1,
    leftPct,
    topPct,
    sizePx,
    delaySec: Number(((idx % 9) * 0.23).toFixed(2)),
    durSec: Number((1.8 + (idx % 5) * 0.35).toFixed(2)),
    isFourPoint,
  };
});

/**
 * 14 lightweight GPU-composited parallax ambient particles (background + foreground depth).
 */
const AMBIENT_PARTICLES: readonly AmbientParticleNode[] = Array.from({ length: 14 }, (_, idx) => ({
  id: idx + 1,
  leftPct: 7 + ((idx * 17) % 86),
  topPct: 14 + ((idx * 23) % 70),
  sizePx: idx % 3 === 0 ? 10 : idx % 2 === 0 ? 7.5 : 6,
  delaySec: Number(((idx % 7) * 0.45).toFixed(2)),
  durSec: Number((4.4 + (idx % 5) * 0.65).toFixed(2)),
  driftX: (idx % 2 === 0 ? 1 : -1) * (14 + (idx % 4) * 6),
  driftY: -44 - (idx % 5) * 14,
  isForeground: idx % 3 === 0,
}));

export function OriginStageBackdrop({
  mood,
  sceneId,
  isRulerStage,
  kissRunKey = 0,
  kissBeat = 'twilight',
}: OriginStageBackdropProps) {
  const isSunrise = mood === 'sunrise';
  const isMeadow = mood === 'meadow';
  const isStarry = mood === 'starry_twilight';
  const isDawn = mood === 'celebration_dawn';
  const isGala = mood === 'gala_finale';
  const isKissingPeak = isStarry && kissBeat === 'kissing';
  const isKissApproach = isStarry && kissBeat === 'shyGlance';
  const isKissAfterglow = isStarry && kissBeat === 'afterglow';

  return (
    <div
      aria-hidden="true"
      data-testid="origin-stage-backdrop"
      data-backdrop-mood={mood}
      data-kiss-beat={isStarry ? kissBeat : undefined}
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* =====================================================================
          LAYER 1: DYNAMIC MORPHING SKY CANVAS (900ms crossfade across 5 moods)
          ===================================================================== */}

      {/* 1A. Scenes 1–3: Luminous Warm Ivory & Soft Champagne Sunrise */}
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
          isSunrise ? 'opacity-100' : 'opacity-0 anim-paused'
        }`}
        style={{
          background:
            'linear-gradient(165deg, #FFFDF9 0%, #FFF3F7 52%, #FDEEE4 100%)',
        }}
      >
        {/* Top-left slow-drifting soft golden light leak */}
        <div
          className="origin-story-light-leak absolute -top-16 -left-16 h-72 w-72 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(247,217,148,0.44) 0%, rgba(255,235,196,0.16) 48%, rgba(255,253,249,0) 74%)',
          }}
        />
        {/* Bottom-right warm rose-blush corner haze */}
        <div
          className="origin-story-light-leak absolute -right-14 -bottom-12 h-64 w-64 rounded-full"
          style={{
            animationDelay: '1.6s',
            background:
              'radial-gradient(circle, rgba(242,167,198,0.34) 0%, rgba(252,226,238,0.14) 52%, rgba(255,253,249,0) 76%)',
          }}
        />
      </div>

      {/* 1B. Scenes 4 & 6: Radiant Golden Morning Meadow + Volumetric Sunbeams + Pastel Hills */}
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
          isMeadow ? 'opacity-100' : 'opacity-0 anim-paused'
        }`}
        style={{
          background:
            'linear-gradient(180deg, #FFFDF7 0%, #FFF4EA 48%, #FCE9F1 100%)',
        }}
      >
        {/* Soft diagonal animated volumetric sunbeams (0.14 opacity) */}
        <div
          className="origin-story-sunbeams absolute -inset-x-16 -top-20 h-[120%] opacity-[0.14]"
          style={{
            background:
              'repeating-linear-gradient(122deg, rgba(247,217,148,0) 0px, rgba(247,217,148,0) 36px, rgba(247,212,136,0.95) 54px, rgba(255,244,214,0.8) 72px, rgba(247,217,148,0) 104px)',
          }}
        />
        {/* Drifting translucent pastel clouds */}
        <div
          className="origin-story-cloud-drift absolute top-9 left-6 h-10 w-28 rounded-full opacity-65"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.92) 0%, rgba(255,248,251,0) 75%)',
          }}
        />
        <div
          className="origin-story-cloud-drift absolute top-16 right-8 h-9 w-24 rounded-full opacity-55"
          style={{
            animationDelay: '2.2s',
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.88) 0%, rgba(255,248,251,0) 75%)',
          }}
        />
        {/* Layered translucent pastel hills along the lower horizon */}
        <svg
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-[14%] h-24 w-full"
        >
          <path
            d="M 0 74 Q 95 26 215 62 T 400 54 L 400 120 L 0 120 Z"
            fill="rgba(247, 206, 223, 0.28)"
          />
          <path
            d="M 0 88 Q 140 48 265 76 T 400 72 L 400 120 L 0 120 Z"
            fill="rgba(247, 217, 148, 0.22)"
          />
        </svg>
      </div>

      {/* 1C. Scene 5: One Starry Night Kiss Velvet-Twilight Sky (synced to 5s audio beats) */}
      <div
        className={`absolute inset-0 transition-opacity duration-[550ms] ease-out ${
          isStarry ? 'opacity-100' : 'opacity-0 anim-paused'
        }`}
        style={{
          background:
            'linear-gradient(180deg, #2D183B 0%, #5E2E5C 48%, #B25E89 82%, #E8A4BD 100%)',
        }}
      >
        {/* Romantic rose-gold twilight bloom swelling right as the kiss & song peak hit (1.1s -> 4.65s) */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            isKissingPeak ? 'opacity-100' : isKissAfterglow ? 'opacity-45' : isKissApproach ? 'opacity-30' : 'opacity-0'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at 50% 62%, rgba(244,142,184,0.34) 0%, rgba(247,217,148,0.18) 42%, rgba(45,24,59,0) 76%)',
          }}
        />

        {/* Soft radial rose-gold moonbeam spotlight focusing smoothly across the 4 beats */}
        <div
          className="absolute inset-x-0 top-6 mx-auto h-[84%] w-[80%] rounded-full transition-all duration-700 ease-out"
          style={{
            opacity: isKissingPeak ? 1 : isKissApproach ? 0.86 : isKissAfterglow ? 0.72 : 0.65,
            transform: isKissingPeak
              ? 'scale(1.06)'
              : isKissApproach
                ? 'scale(1.02)'
                : 'scale(0.98)',
            background:
              'radial-gradient(ellipse at 52% 48%, rgba(255,224,186,0.3) 0%, rgba(242,158,198,0.15) 46%, rgba(45,24,59,0) 76%)',
          }}
        />

        {/* Luminous glowing crescent moon with multi-ring soft buttercream aura */}
        <div
          className={`absolute top-5 right-6 h-16 w-16 transition-all duration-700 ease-out ${
            isKissingPeak
              ? 'translate-y-0 scale-108'
              : isStarry
                ? 'translate-y-0 scale-100'
                : '-translate-y-4 scale-90'
          }`}
        >
          <div
            className={`absolute -inset-4 rounded-full transition-opacity duration-700 ${
              isKissingPeak ? 'opacity-85' : 'opacity-55'
            }`}
            style={{
              background:
                'radial-gradient(circle, rgba(255,243,204,0.58) 0%, rgba(255,222,173,0.22) 52%, rgba(255,243,204,0) 75%)',
            }}
          />
          <div
            className={`absolute -inset-1.5 rounded-full transition-opacity duration-700 ${
              isKissingPeak ? 'opacity-95' : 'opacity-70'
            }`}
            style={{
              background:
                'radial-gradient(circle, rgba(255,246,214,0.72) 0%, rgba(255,246,214,0) 72%)',
            }}
          />
          <svg
            viewBox="0 0 48 48"
            className="relative h-full w-full drop-shadow-[0_0_14px_rgba(255,238,186,0.75)]"
          >
            <path
              d="M 30 6 C 18 7 9 17 10 29 C 11 39 20 45 31 44 C 22 41 18 33 19 23 C 20 15 24 10 30 6 Z"
              fill="#FFF4CE"
            />
          </svg>
        </div>

        {/* 28 Staggered Twinkling Stars (pinpricks + 4-point glints) */}
        {TWILIGHT_STARS.map((star) =>
          star.isFourPoint ? (
            <svg
              key={star.id}
              viewBox="0 0 16 16"
              className="origin-story-star absolute"
              style={{
                left: `${star.leftPct}%`,
                top: `${star.topPct}%`,
                width: `${star.sizePx}px`,
                height: `${star.sizePx}px`,
                ['--star-delay' as string]: `${star.delaySec}s`,
                ['--star-dur' as string]: `${star.durSec}s`,
              }}
            >
              <path
                d="M 8 0 L 9.8 6.2 L 16 8 L 9.8 9.8 L 8 16 L 6.2 9.8 L 0 8 L 6.2 6.2 Z"
                fill="#FFF6D6"
              />
            </svg>
          ) : (
            <span
              key={star.id}
              className="origin-story-star absolute rounded-full bg-[#FFF8E4]"
              style={{
                left: `${star.leftPct}%`,
                top: `${star.topPct}%`,
                width: `${star.sizePx}px`,
                height: `${star.sizePx}px`,
                ['--star-delay' as string]: `${star.delaySec}s`,
                ['--star-dur' as string]: `${star.durSec}s`,
              }}
            />
          ),
        )}

        {/* 2 Shooting Stars synced to Beat 1 entry (0.25s) and mid-kiss musical peak (2.65s) */}
        {isStarry && (
          <div key={`shooting_${kissRunKey}`} className="absolute inset-0">
            <span
              className="origin-story-shooting-star absolute top-[14%] left-[18%] h-[2px] w-16 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,248,224,0) 0%, rgba(255,248,224,0.95) 75%, #FFFFFF 100%)',
                ['--shoot-delay' as string]: '0.25s',
              }}
            />
            <span
              className="origin-story-shooting-star absolute top-[24%] left-[44%] h-[2px] w-14 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,235,200,0) 0%, rgba(255,241,210,0.92) 75%, #FFFFFF 100%)',
                ['--shoot-delay' as string]: '2.65s',
              }}
            />
          </div>
        )}
      </div>

      {/* 1D. Scenes 7–9 (& Scene 10 Beat 1): Pastel Celebration Dawn + Studio Ruler Grid */}
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
          isDawn ? 'opacity-100' : 'opacity-0 anim-paused'
        }`}
        style={{
          background:
            'linear-gradient(175deg, #FFF9FC 0%, #FFF5F9 52%, #FFF3E8 100%)',
        }}
      >
        {/* Warm rising golden stardust bokeh */}
        <div
          className="absolute top-8 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(247,217,148,0.34) 0%, rgba(249,192,216,0.16) 52%, rgba(255,249,252,0) 76%)',
          }}
        />
        {/* Subtle editorial height-chart studio wash during the ruler scenes */}
        {isRulerStage && (
          <div
            className="absolute inset-0 opacity-[0.28] transition-opacity duration-500"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(217,75,125,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(230,184,92,0.12) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        )}
      </div>

      {/* 1E. Scene 10 Grand Finale: Champagne-Gold & Rose-Petal Gala Sky with Rotating Light Rays */}
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
          isGala ? 'opacity-100' : 'opacity-0 anim-paused'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 42%, #FFFDF4 0%, #FFF3F8 54%, #FCE2EE 100%)',
        }}
      >
        {/* Rotating soft radial light-burst rays (conic-gradient spinning gently at 26s, 0.18 opacity) */}
        <div
          className="origin-story-gala-rays absolute -inset-[35%] opacity-[0.18]"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(230,184,92,0.85) 0deg, rgba(255,248,251,0) 20deg, rgba(217,75,125,0.55) 40deg, rgba(255,248,251,0) 60deg, rgba(230,184,92,0.85) 80deg, rgba(255,248,251,0) 100deg, rgba(217,75,125,0.55) 120deg, rgba(255,248,251,0) 140deg, rgba(230,184,92,0.85) 160deg, rgba(255,248,251,0) 180deg, rgba(217,75,125,0.55) 200deg, rgba(255,248,251,0) 220deg, rgba(230,184,92,0.85) 240deg, rgba(255,248,251,0) 260deg, rgba(217,75,125,0.55) 280deg, rgba(255,248,251,0) 300deg, rgba(230,184,92,0.85) 320deg, rgba(255,248,251,0) 340deg, rgba(230,184,92,0.85) 360deg)',
          }}
        />
        {/* Warm golden center spotlight halo */}
        <div
          className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(247,217,148,0.55) 0%, rgba(248,187,213,0.26) 48%, rgba(255,248,251,0) 74%)',
          }}
        />
      </div>

      {/* =====================================================================
          LAYER 2: AMBIENT FLOATING PARTICLE DEPTH (14 GPU-composited particles)
          ===================================================================== */}
      <div className="absolute inset-0">
        {AMBIENT_PARTICLES.map((p) => {
          const color = isStarry
            ? p.id % 2 === 0
              ? 'rgba(255, 236, 179, 0.72)'
              : 'rgba(249, 172, 208, 0.65)'
            : isGala
              ? p.id % 2 === 0
                ? 'rgba(230, 184, 92, 0.65)'
                : 'rgba(217, 75, 125, 0.45)'
              : sceneId === 'happy_together'
                ? p.id % 2 === 0
                  ? 'rgba(246, 174, 205, 0.68)'
                  : 'rgba(247, 217, 148, 0.62)'
                : p.id % 2 === 0
                  ? 'rgba(247, 217, 148, 0.58)'
                  : 'rgba(244, 182, 209, 0.52)';

          return (
            <span
              key={p.id}
              className="origin-story-ambient-mote absolute rounded-full"
              style={{
                left: `${p.leftPct}%`,
                top: `${p.topPct}%`,
                width: `${p.sizePx}px`,
                height: `${sceneId === 'happy_together' ? p.sizePx * 0.72 : p.sizePx}px`,
                backgroundColor: color,
                boxShadow: isStarry
                  ? '0 0 8px rgba(255, 236, 185, 0.55)'
                  : p.isForeground
                    ? '0 0 10px rgba(247, 217, 148, 0.35)'
                    : 'none',
                opacity: p.isForeground ? 0.75 : 0.48,
                ['--mote-delay' as string]: `${p.delaySec}s`,
                ['--mote-dur' as string]: `${p.durSec}s`,
                ['--mote-dx' as string]: `${p.driftX}px`,
                ['--mote-dy' as string]: `${p.driftY}px`,
              }}
            />
          );
        })}
      </div>

      {/* =====================================================================
          LAYER 3: SOFT GROUND STAGE HORIZON & WARM PEARL-ROSE VIGNETTE
          ===================================================================== */}
      {sceneId !== 'prologue' && (
        <div
          className="absolute inset-x-0 bottom-0 h-[21%] transition-all duration-700"
          style={{
            background: isStarry
              ? 'radial-gradient(ellipse at 50% 0%, rgba(247,217,148,0.18) 0%, rgba(56,24,64,0.42) 85%)'
              : isGala
                ? 'radial-gradient(ellipse at 50% 0%, rgba(247,217,148,0.42) 0%, rgba(247,196,219,0.28) 85%)'
                : 'radial-gradient(ellipse at 50% 0%, rgba(247,217,148,0.24) 0%, rgba(244,189,213,0.24) 85%)',
          }}
        >
          {/* Delicate curved horizon rim line */}
          <div
            className="mx-auto h-[1.5px] w-[86%] rounded-full"
            style={{
              background: isStarry
                ? 'linear-gradient(90deg, transparent 0%, rgba(247,217,148,0.34) 50%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(217,75,125,0.18) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Delicate warm pearl-rose cinema vignette around the outer frame edges */}
      <div
        className="absolute inset-0 rounded-[28px]"
        style={{
          boxShadow: isStarry
            ? 'inset 0 0 38px rgba(42, 16, 52, 0.36)'
            : 'inset 0 0 34px rgba(217, 118, 158, 0.14)',
        }}
      />
    </div>
  );
}

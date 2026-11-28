import type { CSSProperties } from 'react';

export type StageBridgeMode = 'curtain' | 'reduced' | 'replay';
export type StageBridgePhase = 'gather' | 'parting';

interface BridgeParticleSpec {
  id: number;
  kind: 'stardust' | 'petal';
  leftPct: number;
  topPct: number;
  dx: number;
  dy: number;
  rot: number;
  sizePx: number;
  delayMs: number;
  durMs: number;
  color: string;
}

/**
 * 16 delicate floating champagne-gold stardust sparkles and soft blush petals
 * drifting upward across the center seam during the 1850ms silk curtain reveal.
 */
const BRIDGE_PARTICLES: readonly BridgeParticleSpec[] = [
  { id: 1, kind: 'stardust', leftPct: 49, topPct: 72, dx: -18, dy: -130, rot: 45, sizePx: 11, delayMs: 60, durMs: 1580, color: '#F6D38A' },
  { id: 2, kind: 'petal', leftPct: 51, topPct: 68, dx: 22, dy: -145, rot: 140, sizePx: 10, delayMs: 120, durMs: 1620, color: '#F9B8D4' },
  { id: 3, kind: 'stardust', leftPct: 47, topPct: 58, dx: -30, dy: -120, rot: -60, sizePx: 9, delayMs: 180, durMs: 1520, color: '#FFE8B6' },
  { id: 4, kind: 'petal', leftPct: 53, topPct: 62, dx: 34, dy: -135, rot: -125, sizePx: 11, delayMs: 220, durMs: 1580, color: '#FAD2E4' },
  { id: 5, kind: 'stardust', leftPct: 50, topPct: 52, dx: 12, dy: -155, rot: 85, sizePx: 12, delayMs: 140, durMs: 1640, color: '#E6B85C' },
  { id: 6, kind: 'petal', leftPct: 48, topPct: 46, dx: -26, dy: -115, rot: 160, sizePx: 9, delayMs: 260, durMs: 1500, color: '#F29BBF' },
  { id: 7, kind: 'stardust', leftPct: 52, topPct: 42, dx: 28, dy: -125, rot: -75, sizePx: 10, delayMs: 200, durMs: 1560, color: '#FFF5DA' },
  { id: 8, kind: 'petal', leftPct: 49.5, topPct: 78, dx: -14, dy: -165, rot: 120, sizePx: 10, delayMs: 90, durMs: 1680, color: '#FCE0EC' },
  { id: 9, kind: 'stardust', leftPct: 46, topPct: 64, dx: -38, dy: -110, rot: 55, sizePx: 8.5, delayMs: 310, durMs: 1480, color: '#F6D38A' },
  { id: 10, kind: 'petal', leftPct: 54, topPct: 56, dx: 40, dy: -128, rot: -150, sizePx: 10.5, delayMs: 280, durMs: 1540, color: '#F9B8D4' },
  { id: 11, kind: 'stardust', leftPct: 50.5, topPct: 36, dx: -12, dy: -105, rot: 90, sizePx: 11, delayMs: 320, durMs: 1480, color: '#FFE7B0' },
  { id: 12, kind: 'petal', leftPct: 48.5, topPct: 32, dx: 18, dy: -98, rot: 135, sizePx: 9, delayMs: 360, durMs: 1450, color: '#F6C6DC' },
  { id: 13, kind: 'stardust', leftPct: 51.5, topPct: 74, dx: 30, dy: -150, rot: -45, sizePx: 9.5, delayMs: 160, durMs: 1600, color: '#E6B85C' },
  { id: 14, kind: 'petal', leftPct: 47.5, topPct: 50, dx: -34, dy: -132, rot: -115, sizePx: 9.5, delayMs: 240, durMs: 1560, color: '#FAD7E7' },
  { id: 15, kind: 'stardust', leftPct: 52.5, topPct: 48, dx: 24, dy: -140, rot: 70, sizePx: 10, delayMs: 340, durMs: 1480, color: '#FFF6DF' },
  { id: 16, kind: 'petal', leftPct: 50, topPct: 60, dx: -20, dy: -148, rot: 150, sizePx: 10, delayMs: 190, durMs: 1580, color: '#F4A6C9' },
];

export interface StageBridgeTransitionProps {
  mode: StageBridgeMode;
  phase: StageBridgePhase;
}

/**
 * 1850ms 3-Beat Rose-Cream & Champagne-Gold Silk Curtain Reveal (Stage 3 -> Stage 4).
 * Uses `overflow-hidden` strictly on its own `fixed inset-0 z-[9600]` layer so
 * Backstory's `position: sticky` ancestor chain is never affected.
 */
export function StageBridgeTransition({ mode, phase }: StageBridgeTransitionProps) {
  if (mode === 'reduced' || mode === 'replay') {
    return (
      <div
        aria-hidden="true"
        data-testid="stage-bridge-transition"
        data-bridge-mode={mode}
        data-bridge-phase={phase}
        className={`stage-bridge-crossfade pointer-events-none fixed inset-0 z-[9600] h-[100dvh] w-[100vw] overflow-hidden ${
          phase === 'parting' ? 'stage-bridge-crossfade-out' : 'stage-bridge-crossfade-in'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255, 253, 247, 0.96) 0%, rgba(255, 244, 249, 0.96) 56%, rgba(252, 232, 241, 0.98) 100%)',
        }}
      />
    );
  }

  const isParting = phase === 'parting';

  return (
    <div
      aria-hidden="true"
      data-testid="stage-bridge-transition"
      data-bridge-mode="curtain"
      data-bridge-phase={phase}
      className={`fixed inset-0 z-[9600] h-[100dvh] w-[100vw] overflow-hidden ${
        isParting ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      {/* Beat 1 -> Beat 3: Luminous Warm Ivory, Petal Blush & Champagne-Gold Veil Glow */}
      <div
        className={`stage-bridge-veil absolute inset-0 ${
          isParting ? 'stage-bridge-veil-parting' : 'stage-bridge-veil-gather'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 46%, rgba(255, 253, 246, 0.92) 0%, rgba(255, 242, 248, 0.84) 48%, rgba(250, 224, 236, 0.72) 100%)',
        }}
      />

      {/* Beat 2: Dual Feathered Translucent Rose-Cream & Champagne-Gold Silk Curtain Panels */}
      <div
        data-testid="stage-bridge-curtain-left"
        className={`stage-bridge-curtain-left absolute inset-y-0 left-0 w-[53%] will-change-transform ${
          isParting ? 'stage-bridge-curtain-left-open' : 'stage-bridge-curtain-gather'
        }`}
        style={{
          background:
            'linear-gradient(90deg, rgba(255, 248, 251, 0.98) 0%, rgba(253, 235, 243, 0.96) 68%, rgba(255, 247, 232, 0.92) 92%, rgba(255, 253, 248, 0) 100%)',
          boxShadow: 'inset -10px 0 28px -12px rgba(230, 184, 92, 0.45)',
        }}
      >
        {/* Subtle vertical silk sheen fold highlights */}
        <div
          className="absolute inset-0 opacity-55"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0) 26px, rgba(242,155,191,0.12) 54px, rgba(255,255,255,0.22) 82px)',
          }}
        />
        {/* Delicate glowing champagne-gold inner rim */}
        <div
          className="absolute inset-y-0 right-[4%] w-[2px]"
          style={{
            background:
              'linear-gradient(180deg, rgba(246,211,138,0.15) 0%, rgba(246,211,138,0.88) 45%, rgba(255,244,214,0.92) 60%, rgba(246,211,138,0.15) 100%)',
            boxShadow: '0 0 18px 2px rgba(246, 211, 138, 0.55)',
          }}
        />
      </div>

      <div
        data-testid="stage-bridge-curtain-right"
        className={`stage-bridge-curtain-right absolute inset-y-0 right-0 w-[53%] will-change-transform ${
          isParting ? 'stage-bridge-curtain-right-open' : 'stage-bridge-curtain-gather'
        }`}
        style={{
          background:
            'linear-gradient(270deg, rgba(255, 248, 251, 0.98) 0%, rgba(253, 235, 243, 0.96) 68%, rgba(255, 247, 232, 0.92) 92%, rgba(255, 253, 248, 0) 100%)',
          boxShadow: 'inset 10px 0 28px -12px rgba(230, 184, 92, 0.45)',
        }}
      >
        <div
          className="absolute inset-0 opacity-55"
          style={{
            background:
              'repeating-linear-gradient(270deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0) 26px, rgba(242,155,191,0.12) 54px, rgba(255,255,255,0.22) 82px)',
          }}
        />
        <div
          className="absolute inset-y-0 left-[4%] w-[2px]"
          style={{
            background:
              'linear-gradient(180deg, rgba(246,211,138,0.15) 0%, rgba(246,211,138,0.88) 45%, rgba(255,244,214,0.92) 60%, rgba(246,211,138,0.15) 100%)',
            boxShadow: '0 0 18px 2px rgba(246, 211, 138, 0.55)',
          }}
        />
      </div>

      {/* 16 Delicate Champagne-Gold Stardust Sparkles & Soft Blush Petals along the center seam */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {BRIDGE_PARTICLES.map((p) => {
          const style = {
            left: `${p.leftPct}%`,
            top: `${p.topPct}%`,
            ['--bp-dx' as string]: `${p.dx}px`,
            ['--bp-dy' as string]: `${p.dy}px`,
            ['--bp-rot' as string]: `${p.rot}deg`,
            ['--bp-delay' as string]: `${p.delayMs}ms`,
            ['--bp-dur' as string]: `${p.durMs}ms`,
          } as CSSProperties;

          if (p.kind === 'stardust') {
            return (
              <svg
                key={p.id}
                viewBox="0 0 16 16"
                width={p.sizePx}
                height={p.sizePx}
                style={style}
                className="stage-bridge-particle absolute"
              >
                <path
                  d="M8 0.8L9.6 6.4L15.2 8L9.6 9.6L8 15.2L6.4 9.6L0.8 8L6.4 6.4Z"
                  fill={p.color}
                />
              </svg>
            );
          }

          return (
            <span
              key={p.id}
              style={{
                ...style,
                width: `${p.sizePx}px`,
                height: `${Math.round(p.sizePx * 0.62)}px`,
                backgroundColor: p.color,
              }}
              className="stage-bridge-particle absolute rounded-[999px_999px_999px_2px]"
            />
          );
        })}
      </div>
    </div>
  );
}

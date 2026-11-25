import type { CSSProperties } from 'react';
import { SparkleStarSvg } from './DoodleSvgs';

interface DriftItem {
  id: string;
  left: string;
  dur: string;
  delay: string;
  color: string;
  size: string;
  kind: 'star' | 'ribbon' | 'dot';
}

const DRIFT_ITEMS: DriftItem[] = [
  { id: 'd1', left: '9%', dur: '18s', delay: '0s', color: '#F59AC4', size: 'w-4 h-4', kind: 'star' },
  { id: 'd2', left: '20%', dur: '22s', delay: '-5s', color: '#C6AEFF', size: 'w-3 h-3', kind: 'ribbon' },
  { id: 'd3', left: '33%', dur: '20s', delay: '-10s', color: '#F6CF5D', size: 'w-3.5 h-3.5', kind: 'star' },
  { id: 'd4', left: '48%', dur: '24s', delay: '-2s', color: '#F59AC4', size: 'w-3 h-3', kind: 'dot' },
  { id: 'd5', left: '62%', dur: '19s', delay: '-8s', color: '#B799FF', size: 'w-4 h-4', kind: 'star' },
  { id: 'd6', left: '74%', dur: '23s', delay: '-13s', color: '#F6CF5D', size: 'w-3 h-3', kind: 'ribbon' },
  { id: 'd7', left: '84%', dur: '17s', delay: '-4s', color: '#EC77AF', size: 'w-3.5 h-3.5', kind: 'star' },
];

interface AmbientOverlayProps {
  enabled: boolean;
}

export function AmbientOverlay({ enabled }: AmbientOverlayProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div
      data-testid="sparkle-rain-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-x-hidden px-4 select-none"
    >
      <div className="relative h-full w-full">
        {DRIFT_ITEMS.map((item) => {
          const style = {
            left: item.left,
            color: item.color,
            '--drift-dur': item.dur,
            '--drift-delay': item.delay,
          } as CSSProperties;

          return (
            <div
              key={item.id}
              style={style}
              className="animate-drift-confetti absolute -top-6 opacity-40"
            >
              {item.kind === 'star' && <SparkleStarSvg className={item.size} />}
              {item.kind === 'ribbon' && (
                <span
                  className="block h-2 w-3.5 rounded-xs"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {item.kind === 'dot' && (
                <span
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

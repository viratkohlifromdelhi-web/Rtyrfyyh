import type { CSSProperties } from 'react';
import { HandDrawnHeartSvg, SparkleStarSvg } from './DoodleSvgs';

interface DriftItem {
  id: string;
  left: string;
  dur: string;
  delay: string;
  color: string;
  size: string;
  kind: 'star' | 'heart' | 'dot';
}

const DRIFT_ITEMS: DriftItem[] = [
  { id: 'd1', left: '6%', dur: '20s', delay: '0s', color: '#E8A8BC', size: 'w-3.5 h-3.5', kind: 'star' },
  { id: 'd2', left: '19%', dur: '24s', delay: '-6s', color: '#F2C6B6', size: 'w-3 h-3', kind: 'dot' },
  { id: 'd3', left: '34%', dur: '22s', delay: '-11s', color: '#D98A9C', size: 'w-3.5 h-3.5', kind: 'heart' },
  { id: 'd4', left: '53%', dur: '26s', delay: '-3s', color: '#E6B89C', size: 'w-3 h-3', kind: 'star' },
  { id: 'd5', left: '72%', dur: '21s', delay: '-9s', color: '#F4A6C1', size: 'w-3 h-3', kind: 'dot' },
  { id: 'd6', left: '86%', dur: '25s', delay: '-14s', color: '#D689A3', size: 'w-3.5 h-3.5', kind: 'star' },
  { id: 'd7', left: '94%', dur: '19s', delay: '-4s', color: '#E9B9BE', size: 'w-3.5 h-3.5', kind: 'heart' },
];

export function AmbientOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
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
            className="animate-drift-confetti absolute -top-6 opacity-50"
          >
            {item.kind === 'star' && <SparkleStarSvg className={item.size} />}
            {item.kind === 'heart' && <HandDrawnHeartSvg className={item.size} filled />}
            {item.kind === 'dot' && (
              <span
                className="block w-2.5 h-1.5 rounded-xs"
                style={{ backgroundColor: item.color }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

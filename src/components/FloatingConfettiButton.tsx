import type { MouseEvent } from 'react';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { playUiSfx } from '../utils/uiSoundEngine';
import { ConfettiSparkleMinimalSvg } from './DoodleSvgs';

interface FloatingConfettiButtonProps {
  onPop: (originX?: number, originY?: number) => void;
}

export function FloatingConfettiButton({ onPop }: FloatingConfettiButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    haptics.tap();
    playUiSfx('confetti_burst');
    emitModinoEvent('interaction_hype');
    const rect = e.currentTarget.getBoundingClientRect();
    onPop(rect.left + rect.width / 2, rect.top);
  };

  return (
    <div className="fixed right-[14px] bottom-[calc(14px+env(safe-area-inset-bottom,0px))] z-40">
      <button
        type="button"
        data-testid="floating-confetti-btn"
        onClick={handleClick}
        aria-label="Pop Confetti!"
        title="Pop Confetti!"
        style={{
          backgroundColor: 'rgba(255, 253, 250, 0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        className="group inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#F2B5CC] opacity-85 shadow-[0_6px_16px_-4px_rgba(58,18,51,0.16)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#D94B7D] hover:opacity-100 hover:shadow-[0_10px_20px_-4px_rgba(217,75,125,0.24)] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
      >
        <ConfettiSparkleMinimalSvg className="h-[19px] w-[19px] transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
      </button>
    </div>
  );
}

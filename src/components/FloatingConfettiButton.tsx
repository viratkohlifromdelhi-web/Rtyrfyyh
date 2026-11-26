import type { MouseEvent } from 'react';
import { ConfettiSparkleMinimalSvg } from './DoodleSvgs';

interface FloatingConfettiButtonProps {
  onPop: (originX?: number, originY?: number) => void;
}

export function FloatingConfettiButton({ onPop }: FloatingConfettiButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onPop(rect.left + rect.width / 2, rect.top);
  };

  return (
    <div className="fixed right-[14px] bottom-[14px] z-40 sm:right-5 sm:bottom-5">
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
        className="group inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border-[1.5px] border-[#F2B5CC] shadow-[0_6px_18px_-4px_rgba(58,18,51,0.18)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#D94B7D] hover:shadow-[0_10px_22px_-4px_rgba(217,75,125,0.26)] active:scale-[0.94] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
      >
        <ConfettiSparkleMinimalSvg className="h-5 w-5 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
      </button>
    </div>
  );
}

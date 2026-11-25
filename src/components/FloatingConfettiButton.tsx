import type { MouseEvent } from 'react';

interface FloatingConfettiButtonProps {
  onPop: (originX?: number, originY?: number) => void;
}

export function FloatingConfettiButton({ onPop }: FloatingConfettiButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onPop(rect.left + rect.width / 2, rect.top);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Pop Confetti!"
      title="Pop Confetti!"
      className="fixed right-4 bottom-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#FFE898] bg-[#3B1535] text-[#FFFDF8] shadow-[0_8px_20px_-6px_rgba(59,21,53,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#57214F] active:scale-95 sm:right-6 sm:bottom-6 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C2377E]"
    >
      <span aria-hidden="true" className="text-xl leading-none">
        🎉
      </span>
    </button>
  );
}

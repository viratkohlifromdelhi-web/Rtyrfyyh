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
      className="fixed right-4 bottom-4 z-40 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[#F3C6D7] bg-[#4A122C] px-5 py-3 text-xs font-semibold text-[#FFFDF9] shadow-[0_14px_30px_-8px_rgba(74,18,44,0.52)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#64193C] active:scale-95 sm:right-6 sm:bottom-6 sm:text-sm whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#B7416E]"
    >
      <span>🎉 Pop Confetti!</span>
    </button>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { haptics } from '../utils/haptics';
import type { OneTimeSummaryGiftData } from '../utils/infinityVault';
import { soundEngine } from '../utils/soundEngine';

interface BirthdaySummaryCardProps {
  data: OneTimeSummaryGiftData;
}

export function BirthdaySummaryCard({ data }: BirthdaySummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!data.code) return;
    haptics.summaryCopyTap();
    soundEngine.playBubbleClick(1.1);

    const markCopied = () => {
      setCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 2000);
    };

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(data.code)
        .then(markCopied)
        .catch(() => {
          try {
            const ta = document.createElement('textarea');
            ta.value = data.code;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            markCopied();
          } catch {
            markCopied();
          }
        });
    } else {
      markCopied();
    }
  }, [data.code]);

  return (
    <div
      id="birthday-summary-card"
      data-testid="birthday-summary-card"
      className="mx-auto flex w-full justify-center px-4 pt-6 pb-9 sm:pt-8 sm:pb-11 scroll-mt-20"
    >
      <div
        className="animate-summary-card-enter relative w-[min(92vw,375px)] overflow-hidden rounded-[26px] border-[1.5px] border-[#F6CFD7]/55 px-5 py-6 text-center text-[#FFF6F9] shadow-[0_24px_56px_-18px_rgba(58,18,51,0.52)]"
        style={{
          background:
            'linear-gradient(150deg, #3A1233 0%, #5D1947 46%, #A83467 84%, #D94B7D 100%)',
        }}
      >
        {/* Faint diagonal glossy sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(125deg, rgba(255,246,249,0.14) 0%, rgba(255,246,249,0.03) 34%, transparent 52%, rgba(246,207,215,0.12) 100%)',
          }}
        />

        {/* Subtle inner rose-gold hairline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 rounded-[18px] border border-[#F6CFD7]/25"
        />

        {/* 1. Top Warning Pill */}
        <div className="relative z-10 flex justify-center">
          <span
            data-testid="summary-warning-pill"
            className="inline-flex items-center gap-1 rounded-full border border-[#F6CFD7]/45 bg-[#2A0B26]/75 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#FFE8F0] shadow-xs whitespace-nowrap"
          >
            📸 SCREENSHOT NOW — SHOWS ONLY ONCE
          </span>
        </div>

        {/* 2. Header */}
        <div className="relative z-10 mt-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FFDCE9]">
            🎀 MORGAN&rsquo;S 17TH BIRTHDAY &bull; GIFT RECEIPT
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#F6CFD7]/85">
            03 DECEMBER 2026
          </p>
        </div>

        {/* 3. Won Gift Card Hero Box */}
        <div className="relative z-10 mt-4 rounded-2xl border border-[#F6CFD7]/35 bg-[#240921]/65 px-3.5 py-4 backdrop-blur-xs">
          <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#FFE5F0]">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: data.stoneColor,
                boxShadow: `0 0 10px ${data.stoneGlow}, 0 0 4px #FFF6F9`,
              }}
            />
            <span data-testid="summary-stone-label">Unlocked via {data.stoneName}</span>
          </div>

          <p
            data-testid="summary-gift-value"
            className="font-display mt-2 bg-gradient-to-b from-[#FFFDF9] via-[#FFE8C8] to-[#F3BA94] bg-clip-text text-[1.95rem] leading-tight font-extrabold tracking-tight text-transparent drop-shadow-[0_3px_12px_rgba(255,216,178,0.3)] sm:text-[2.1rem]"
          >
            {data.value} GIFT CARD
          </p>

          {/* Single-line Monospace 12-Digit Code Pill + Compact Copy Button */}
          <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-[#F6CFD7]/30 bg-[#1B0619]/80 px-2.5 py-2">
            <span
              data-testid="summary-gift-code"
              className="whitespace-nowrap font-mono text-[13px] font-extrabold tracking-[0.06em] text-[#FFF6F9] sm:text-sm sm:tracking-[0.08em]"
            >
              {data.code}
            </span>
            <button
              type="button"
              data-testid="summary-copy-btn"
              onClick={handleCopyCode}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-extrabold transition-all duration-150 active:scale-95 cursor-pointer ${
                copied
                  ? 'border-[#4DF5A3]/60 bg-[#0D4A2F] text-[#B7FFDB]'
                  : 'border-[#F6CFD7]/50 bg-[#FFF6F9] text-[#3A1233] hover:bg-[#FFE6F0]'
              }`}
            >
              {copied ? 'Copied ✓' : 'Copy 📋'}
            </button>
          </div>
        </div>

        {/* 4. Activation Instruction */}
        <p
          data-testid="summary-activation-note"
          className="relative z-10 mt-4 px-1 text-xs font-semibold leading-relaxed text-[#FFF6F9]"
        >
          Send this screenshot or 12-digit code to{' '}
          <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono font-extrabold text-[#FFE4F0]">
            adinomide
          </span>{' '}
          to activate it.
        </p>

        {/* 5. Playful Mini Footer Strip Inside Card + Semicircular Ticket Tear Notches */}
        <div className="relative z-10 mt-5 border-t border-dashed border-[#F6CFD7]/45 pt-3.5">
          {/* Semicircular side ticket notches aligned exactly with the dashed tear line */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -left-8 h-6 w-6 -translate-y-1/2 rounded-full border-r border-[#F6CFD7]/55 bg-[#FFF6F9]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -right-8 h-6 w-6 -translate-y-1/2 rounded-full border-l border-[#F6CFD7]/55 bg-[#FFF6F9]"
          />

          <div className="flex items-center justify-center gap-1.5 text-[9.5px] font-bold tracking-tight text-[#FFE4F0]/95 sm:text-[10px]">
            <span className="whitespace-nowrap rounded-full border border-[#F6CFD7]/30 bg-white/10 px-2 py-0.5">
              Bauni-Meter: 99%
            </span>
            <span aria-hidden="true" className="text-[#F6CFD7]/75">
              &bull;
            </span>
            <span className="whitespace-nowrap rounded-full border border-[#F6CFD7]/30 bg-white/10 px-2 py-0.5">
              Best Friend Rank: #2 (Behind Abhay)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

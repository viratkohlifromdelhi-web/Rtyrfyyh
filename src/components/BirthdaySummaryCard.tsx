import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import {
  INFINITY_STONES,
  formatVaultGiftCodeDisplay,
  getRawCopyableVaultCode,
  getStoneById,
  type OneTimeSummaryGiftData,
} from '../utils/infinityVault';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';
import { InfinityStoneSvg } from './InfinityStoneSvg';

interface BirthdaySummaryCardProps {
  data: OneTimeSummaryGiftData;
  onOpenKeepsakeModal?: () => void;
}

export function BirthdaySummaryCard({ data, onOpenKeepsakeModal }: BirthdaySummaryCardProps) {
  const grainId = useId().replace(/:/g, '');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    trackEvent('summary_card_viewed', 'One-Time Footer Summary Card');
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!data.code) return;
    trackEvent('summary_card_code_copied', 'Footer Summary Copy Code Button');
    haptics.summaryCopyTap();
    soundEngine.playBubbleClick(1.1);
    emitModinoEvent('cute', { force: true, source: 'summary-copy-code' });

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

    const rawCopyValue = getRawCopyableVaultCode(data.code);
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = rawCopyValue;
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
    };

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(rawCopyValue).then(markCopied).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }, [data.code]);

  const stoneSpec =
    data.stoneId
      ? getStoneById(data.stoneId)
      : (INFINITY_STONES.find((s) => s.name === data.stoneName) ?? INFINITY_STONES[2]);

  const formattedCode = formatVaultGiftCodeDisplay(data.code);

  return (
    <div
      id="birthday-summary-card"
      data-testid="birthday-summary-card"
      className="mx-auto flex w-full justify-center px-4 pt-6 pb-10 sm:pt-8 sm:pb-12 scroll-mt-20"
    >
      <div
        className="animate-summary-card-enter relative w-[min(92vw,390px)] overflow-hidden rounded-[22px] text-center text-[#FAF3EA]"
        style={{
          background: 'linear-gradient(155deg, #24101B 0%, #140910 58%, #1C0C16 100%)',
          border: '1px solid rgba(232, 200, 146, 0.34)',
          boxShadow:
            'inset 0 1px 0 rgba(255, 242, 218, 0.14), 0 28px 60px -22px rgba(22, 16, 23, 0.56)',
        }}
      >
        {/* Subtle 3% fine film-grain noise texture */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.035]"
        >
          <filter id={`receipt-grain-${grainId}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.84"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#receipt-grain-${grainId})`} />
        </svg>

        {/* Restrained 5s champagne-gold diagonal specular sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#F7E2B8]/25 to-transparent animate-vault-foil"
        />

        {/* Classic minimal corner hairline accents */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 h-2.5 w-2.5 border-t border-l border-[#E6C690]/40"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3 h-2.5 w-2.5 border-t border-r border-[#E6C690]/40"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-3 h-2.5 w-2.5 border-b border-l border-[#E6C690]/40"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 bottom-3 h-2.5 w-2.5 border-r border-b border-[#E6C690]/40"
        />

        {/* Upper Voucher Body */}
        <div className="relative z-10 px-6 pt-6 pb-5 sm:px-7">
          {/* 1. Understated One-Time Screenshot Notice */}
          <p
            data-testid="summary-warning-pill"
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D7B57E]"
          >
            Screenshot Now &nbsp;&middot;&nbsp; Shows Only Once
          </p>

          <div className="mx-auto mt-3.5 h-px w-16 bg-[#E6C690]/25" aria-hidden="true" />

          {/* 2. Editorial Header */}
          <h3 className="font-display mt-4 text-2xl font-semibold italic tracking-tight text-[#FAF3EA]">
            Morgan&rsquo;s 17th Birthday
          </h3>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D7B57E]/82">
            Gift Receipt &nbsp;&middot;&nbsp; 03 December 2026
          </p>

          {/* 3. Floating Movie-Grade Chosen Stone + Brushed Champagne Gold Value */}
          <div className="mt-5 flex flex-col items-center">
            <InfinityStoneSvg stone={stoneSpec} size={44} showSparks={false} />

            <p
              data-testid="summary-stone-label"
              className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#E8B4BE]"
            >
              Unlocked via {data.stoneName}
            </p>

            <p className="mt-4 text-[9.5px] font-semibold uppercase tracking-[0.26em] text-[#D7B57E]/80">
              Gift Voucher
            </p>
            <p
              data-testid="summary-gift-value"
              className="font-display mt-0.5 bg-clip-text text-[3.5rem] leading-none font-semibold italic tracking-tight text-transparent sm:text-[3.85rem]"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, #FFF7E4 0%, #E7C382 52%, #B98C47 100%)',
                filter: 'drop-shadow(0 4px 14px rgba(185, 140, 71, 0.24))',
              }}
            >
              {data.value}
            </p>
          </div>
        </div>

        {/* Dashed Champagne-Gold Perforated Tear Line with Side Ticket Notches */}
        <div className="relative z-10 flex items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-3 h-6 w-6 rounded-full border border-[rgba(232,200,146,0.34)] bg-[#FFF5F8]"
          />
          <div className="mx-5 w-full border-t border-dashed border-[#E6C690]/32" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-3 h-6 w-6 rounded-full border border-[rgba(232,200,146,0.34)] bg-[#FFF5F8]"
          />
        </div>

        {/* Lower Ticket Stub — Airy & Unboxed (Zero Nested Boxes) */}
        <div className="relative z-10 px-6 pt-5 pb-6 sm:px-7">
          <span className="block text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#D7B57E]/80">
            Activation Code
          </span>

          <div className="mt-2 flex items-center justify-center gap-3">
            <span
              data-testid="summary-gift-code"
              className="whitespace-nowrap font-mono text-[14px] font-medium tabular-nums tracking-[0.12em] text-[#FAF3EA] sm:text-[15px]"
            >
              {formattedCode}
            </span>

            <button
              type="button"
              data-testid="summary-copy-btn"
              onClick={handleCopyCode}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690] ${
                copied
                  ? 'border-[#E6C690] bg-[#E6C690]/18 text-[#FFF7E4]'
                  : 'border-[#E6C690]/55 bg-transparent text-[#E6C690] hover:border-[#E6C690] hover:bg-[#E6C690]/12 hover:text-[#FAF3EA]'
              }`}
            >
              {copied ? 'Copied ✓' : 'Copy Code'}
            </button>
          </div>

          {/* 4. Clean Editorial Activation Instruction */}
          <p
            data-testid="summary-activation-note"
            className="mt-4 text-xs leading-relaxed text-[#FAF3EA]/78"
          >
            Send this screenshot or code to{' '}
            <span className="font-semibold tracking-[0.02em] text-[#E6C690]">adinomide</span> to
            activate your {data.value} gift card.
          </p>

          {onOpenKeepsakeModal && (
            <button
              type="button"
              data-testid="summary-keepsake-btn"
              onClick={() => {
                try {
                  haptics.tap();
                } catch {
                  // silent
                }
                try {
                  soundEngine.playBubbleClick(1.06);
                } catch {
                  // silent
                }
                onOpenKeepsakeModal();
              }}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E6C690]/55 bg-[#E6C690]/[0.12] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FAF3EA] transition-all duration-150 hover:border-[#E6C690] hover:bg-[#E6C690]/22 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690]"
            >
              <Download className="h-3.5 w-3.5 text-[#E6C690]" aria-hidden="true" />
              <span>Save Keepsake Card</span>
            </button>
          )}

          {/* 5. Quiet Unboxed Keepsake Metadata Footer */}
          <p className="mt-4 border-t border-[#E6C690]/15 pt-3.5 text-[10px] font-medium tracking-[0.06em] text-[#D7B57E]/72">
            Bauni Meter: 99% &nbsp;&middot;&nbsp; Best Friend Rank: #2 (Behind Abhay)
          </p>
        </div>
      </div>
    </div>
  );
}

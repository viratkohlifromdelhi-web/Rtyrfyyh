import { useEffect, useId, useRef, useState } from 'react';
import { BACKSTORY_CHAPTERS, type BackstoryChapter } from '../data/celebrationData';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { smoothScrollToTarget } from '../utils/smoothScroll';
import { soundEngine } from '../utils/soundEngine';
import { computeTimelineRailProgress } from '../utils/timelineProgress';

function DownwardReceiptArrowSvg({ className = 'h-[13px] w-[13px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 3.25v9.25" />
      <path d="M4.25 8.75L8 12.5l3.75-3.75" />
    </svg>
  );
}

function getCardVisualStyles(variant: BackstoryChapter['variant']) {
  if (variant === 'climax') {
    return {
      surface: {
        background:
          'linear-gradient(145deg, rgba(217, 75, 125, 0.16) 0%, rgba(42, 14, 38, 0.72) 65%, rgba(232, 200, 146, 0.12) 100%)',
        border: '1px solid rgba(232, 200, 146, 0.45)',
        boxShadow: '0 20px 44px -22px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(232, 200, 146, 0.08)',
      },
      eyebrowColor: '#F3D293',
      titleColor: '#FFFDF9',
      bodyColor: 'rgba(255, 244, 249, 0.92)',
      watermarkColor: '#F7D994',
      nodeLitClass:
        'border-[#FFF5DC] bg-[#F7D994] shadow-[0_0_14px_rgba(247,217,148,0.8),0_0_0_3px_rgba(247,217,148,0.22)]',
    };
  }

  if (variant === 'quiet') {
    return {
      surface: {
        background: 'rgba(255, 246, 249, 0.03)',
        border: '1px solid rgba(218, 198, 224, 0.12)',
      },
      eyebrowColor: '#C9B3CE',
      titleColor: '#F8EEF9',
      bodyColor: 'rgba(244, 232, 246, 0.82)',
      watermarkColor: '#E5D3EC',
      nodeLitClass:
        'border-[#ECD4F7] bg-[#DFC0EE] shadow-[0_0_12px_rgba(223,192,238,0.6),0_0_0_3px_rgba(223,192,238,0.16)]',
    };
  }

  // archival (Chapter 01)
  return {
    surface: {
      background: 'rgba(255, 246, 249, 0.045)',
      border: '1px solid rgba(255, 246, 249, 0.14)',
    },
    eyebrowColor: '#DFC49A',
    titleColor: '#FFFBF8',
    bodyColor: 'rgba(252, 239, 246, 0.86)',
    watermarkColor: '#F8E3EB',
    nodeLitClass:
      'border-[#FFF5F9] bg-[#FBEAF2] shadow-[0_0_12px_rgba(251,234,242,0.58),0_0_0_3px_rgba(251,234,242,0.16)]',
  };
}

export function BackstorySection() {
  const grainId = useId().replace(/:/g, '');
  const railListRef = useRef<HTMLOListElement | null>(null);
  const railFillRef = useRef<HTMLSpanElement | null>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const climaxHapticFiredRef = useRef(false);
  const cancelScrollRef = useRef<(() => void) | null>(null);

  const [litNodes, setLitNodes] = useState<Record<string, boolean>>({});

  // 60fps scroll-linked luminous vertical timeline beam (zero React setState inside scroll/rAF)
  useEffect(() => {
    let rafId: number | null = null;

    const updateRailProgress = () => {
      rafId = null;
      const listEl = railListRef.current;
      const fillEl = railFillRef.current;
      if (!listEl || !fillEl) return;

      const rect = listEl.getBoundingClientRect();
      const progress = computeTimelineRailProgress(rect.top, rect.height, window.innerHeight);
      fillEl.style.transform = `scaleY(${progress.toFixed(4)})`;
      fillEl.setAttribute('data-progress', progress.toFixed(3));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateRailProgress);
    };

    updateRailProgress();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (cancelScrollRef.current) {
        cancelScrollRef.current();
        cancelScrollRef.current = null;
      }
    };
  }, []);

  // Sequential per-card IntersectionObserver (threshold 0.45) for staggered card glide + node ignition
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      const allLit: Record<string, boolean> = {};
      for (const ch of BACKSTORY_CHAPTERS) {
        allLit[ch.id] = true;
      }
      setLitNodes(allLit);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const chapterId = entry.target.getAttribute('data-chapter-id');
          if (!chapterId) continue;

          setLitNodes((prev) => {
            if (prev[chapterId]) return prev;
            return { ...prev, [chapterId]: true };
          });

          if (chapterId === 'ch-3' && !climaxHapticFiredRef.current) {
            climaxHapticFiredRef.current = true;
            haptics.timelineNodeClimax();
          }

          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.45 },
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handleJumpToReceipt = () => {
    haptics.timelineReceiptJump();
    soundEngine.playBubbleClick(1.04);
    trackEvent('timeline_receipt_clicked', 'Chapter 3 Jump');

    const caseFileSection = document.getElementById('case-file');
    if (caseFileSection) {
      if (cancelScrollRef.current) {
        cancelScrollRef.current();
      }
      cancelScrollRef.current = smoothScrollToTarget(caseFileSection, 950);
    }
  };

  return (
    <section
      id="backstory"
      data-testid="backstory-section"
      className="relative z-[2] scroll-mt-16 bg-transparent px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div
        data-testid="backstory-velvet-container"
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] px-5 pt-10 pb-14 text-[#FFFDF8] sm:px-10 sm:pt-14 sm:pb-16 lg:px-14 lg:pt-16"
        style={{
          background: 'linear-gradient(170deg, #1E0B1C 0%, #150814 55%, #240D20 100%)',
          border: '1px solid rgba(232, 200, 146, 0.14)',
          boxShadow:
            '0 28px 64px -26px rgba(21, 8, 20, 0.56), 0 8px 20px -10px rgba(58, 18, 51, 0.25)',
        }}
      >
        {/* Subtle 2.5% Editorial Fine Paper Grain Overlay */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025]"
        >
          <filter id={`backstory-grain-${grainId}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#backstory-grain-${grainId})`} />
        </svg>

        <div className="relative z-10">
          {/* Section Header */}
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#DFC49A] uppercase">
              HOW WE GOT HERE
            </p>
            <h2 className="font-display mt-2.5 text-balance text-3xl font-semibold tracking-tight text-[#FFFDF9] sm:text-4xl lg:text-[2.75rem]">
              From Classmates to Greatest HG
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#EAD8E8]/80 sm:text-base">
              How a normal classmate from school ended up being my closest friend.
            </p>
          </div>

          {/* 3-Chapter Progressive Timeline with Self-Drawing Luminous Rail */}
          <ol
            ref={railListRef}
            data-testid="backstory-timeline-list"
            className="relative mt-10 space-y-5 sm:mt-12 sm:space-y-6"
          >
            {/* Quiet Base Vertical Rail + Self-Drawing Luminous Progress Rail */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[26px] bottom-[26px] left-[15px] w-[2px] -translate-x-1/2 sm:left-[21px]"
            >
              <span
                className="block h-full w-full rounded-full"
                style={{ background: 'rgba(255, 246, 249, 0.12)' }}
              />
              <span
                ref={railFillRef}
                data-testid="timeline-progress-rail"
                data-progress="0.000"
                className="absolute inset-0 block h-full w-full origin-top rounded-full will-change-transform"
                style={{
                  background: 'linear-gradient(180deg, #F3B8CE 0%, #D94B7D 52%, #F3D293 100%)',
                  transform: 'scaleY(0)',
                  boxShadow: '0 0 10px rgba(243, 184, 206, 0.35)',
                }}
              />
            </div>

            {BACKSTORY_CHAPTERS.map((chapter, index) => {
              const isLit = Boolean(litNodes[chapter.id]);
              const isClimax = chapter.variant === 'climax';
              const styles = getCardVisualStyles(chapter.variant);

              return (
                <li
                  key={chapter.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  data-chapter-id={chapter.id}
                  data-testid={`backstory-chapter-${chapter.numeral}`}
                  data-lit={String(isLit)}
                  className="relative pl-10 sm:pl-14"
                >
                  {/* Left Timeline Node Dot (Center-aligned with eyebrow/title header at top: 26px) */}
                  <span
                    aria-hidden="true"
                    data-testid={`timeline-node-${chapter.numeral}`}
                    className="pointer-events-none absolute top-[26px] left-[15px] z-20 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:left-[21px]"
                  >
                    {/* Chapter 3 Radiant Breathing Halo + One-Shot Expanding Ring Ripple */}
                    {isClimax && isLit && (
                      <>
                        <span
                          className="animate-timeline-gold-breathe absolute inset-[-5px] rounded-full will-change-[transform,opacity]"
                          style={{
                            background:
                              'radial-gradient(circle, rgba(247, 217, 148, 0.55) 0%, rgba(247, 217, 148, 0) 72%)',
                          }}
                        />
                        <span
                          data-testid="timeline-climax-ripple"
                          className="animate-timeline-node-ripple absolute inset-0 rounded-full border border-[#F7D994] will-change-[transform,opacity]"
                        />
                      </>
                    )}

                    <span
                      className={`relative block rounded-full border-2 transition-[transform,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isClimax ? 'h-[15px] w-[15px]' : 'h-[13px] w-[13px]'
                      } ${
                        isLit
                          ? `${styles.nodeLitClass} scale-100`
                          : 'scale-90 border-[#FFF6F9]/30 bg-[#230E20]'
                      }`}
                    />
                  </span>

                  {/* Ambient Radial Glow Strictly Behind Chapter 3 Climax Card */}
                  {isClimax && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-3 z-0 rounded-[28px] transition-opacity duration-700"
                      style={{
                        opacity: isLit ? 1 : 0.25,
                        background:
                          'radial-gradient(ellipse at 32% 50%, rgba(217, 75, 125, 0.22) 0%, rgba(232, 200, 146, 0.10) 48%, rgba(21, 8, 20, 0) 76%)',
                      }}
                    />
                  )}

                  {/* Staggered Glide-In Chapter Card (GPU transform & opacity only) */}
                  <article
                    className="relative z-10 overflow-hidden rounded-[20px] px-5 py-5 will-change-[transform,opacity] sm:px-7 sm:py-6"
                    style={{
                      ...styles.surface,
                      transform: isLit ? 'translate3d(0, 0, 0)' : 'translate3d(14px, 10px, 0)',
                      opacity: isLit ? 1 : 0,
                      transition:
                        'transform 550ms cubic-bezier(0.22, 1, 0.36, 1), opacity 550ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {/* Subtle 3px Warm Rose-Berry-to-Gold Left Accent Bar on Chapter 3 */}
                    {isClimax && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-4 bottom-4 left-0 w-[3px] rounded-r-full"
                        style={{
                          background: 'linear-gradient(180deg, #D94B7D 0%, #F3D293 100%)',
                        }}
                      />
                    )}

                    {/* Oversized Ultra-Faint Serif Watermark Numeral (01, 02, 03) */}
                    <span
                      aria-hidden="true"
                      className="font-display pointer-events-none absolute top-2 right-4 select-none text-[56px] leading-none font-semibold tracking-tight sm:top-2.5 sm:right-6"
                      style={{
                        color: styles.watermarkColor,
                        opacity: 0.055,
                      }}
                    >
                      {chapter.numeral}
                    </span>

                    {/* Single-Line Eyebrow Header */}
                    <p
                      data-testid={`chapter-eyebrow-${chapter.numeral}`}
                      className="relative z-10 pr-12 text-[10.5px] leading-snug font-semibold tracking-[0.14em] uppercase sm:text-[11px]"
                      style={{ color: styles.eyebrowColor }}
                    >
                      {chapter.eyebrow}
                    </p>

                    <h3
                      className="font-display relative z-10 mt-2 text-xl font-semibold tracking-tight sm:text-[24px]"
                      style={{ color: styles.titleColor }}
                    >
                      {chapter.title}
                    </h3>

                    <p
                      className="relative z-10 mt-2 max-w-2xl text-[14.5px] leading-[1.65] sm:text-[15.5px]"
                      style={{ color: styles.bodyColor }}
                    >
                      {chapter.description}
                    </p>

                    {/* Chapter 3 Interactive Jump Pill to Case File #0721 */}
                    {isClimax && (
                      <div className="relative z-10 mt-5">
                        <button
                          type="button"
                          data-testid="timeline-receipt-jump-btn"
                          onClick={handleJumpToReceipt}
                          className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-full bg-[#F7D994]/[0.07] px-4 py-1.5 text-xs font-semibold tracking-[0.02em] text-[#F5DBA3] transition-all duration-200 hover:bg-[#F7D994]/[0.15] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7D994]"
                          style={{ border: '1px solid rgba(232, 200, 146, 0.48)' }}
                        >
                          <span>See the 12:29 AM receipt</span>
                          <DownwardReceiptArrowSvg className="h-[13px] w-[13px] shrink-0 text-[#F7D994]" />
                        </button>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

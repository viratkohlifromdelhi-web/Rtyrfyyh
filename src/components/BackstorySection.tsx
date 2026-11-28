import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { BACKSTORY_CHAPTERS, type BackstoryChapter } from '../data/celebrationData';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { smoothScrollToTarget } from '../utils/smoothScroll';
import { soundEngine } from '../utils/soundEngine';
import { playUiSfx } from '../utils/uiSoundEngine';
import { computeStickyCardScale } from '../utils/timelineProgress';

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

const CHAPTER_3_TAB_FLECKS = [
  { id: 'f1', fx: '-34px', fy: '-24px', fr: '-72deg', delay: '0ms', color: '#E8749E', w: 6, h: 3.5 },
  { id: 'f2', fx: '-18px', fy: '-36px', fr: '48deg', delay: '25ms', color: '#F2C97D', w: 5, h: 5 },
  { id: 'f3', fx: '-4px', fy: '-40px', fr: '-110deg', delay: '45ms', color: '#D94B7D', w: 6.5, h: 3.5 },
  { id: 'f4', fx: '12px', fy: '-38px', fr: '84deg', delay: '20ms', color: '#F7B7CF', w: 5, h: 5 },
  { id: 'f5', fx: '26px', fy: '-30px', fr: '126deg', delay: '55ms', color: '#E9BA6C', w: 6, h: 3.5 },
  { id: 'f6', fx: '36px', fy: '-16px', fr: '-64deg', delay: '35ms', color: '#E8749E', w: 4.5, h: 4.5 },
  { id: 'f7', fx: '-26px', fy: '-12px', fr: '92deg', delay: '65ms', color: '#F4D497', w: 4.5, h: 4.5 },
  { id: 'f8', fx: '18px', fy: '-18px', fr: '-95deg', delay: '75ms', color: '#D94B7D', w: 5.5, h: 3 },
] as const;

const PAPER_STACK_SHADOW =
  '0 -8px 22px -10px rgba(154, 48, 88, 0.14), 0 14px 28px -12px rgba(154, 48, 88, 0.14)';

function getNotebookSheetTheme(variant: BackstoryChapter['variant']) {
  if (variant === 'buttercream') {
    return {
      tabBg: '#FBF0D9',
      tabBridgeBg: '#FFFDF5',
      tabBorderColor: 'rgba(196, 146, 74, 0.34)',
      tabInk: '#8C5A28',
      cardStyle: {
        backgroundColor: '#FFFDF5',
        backgroundImage:
          'repeating-linear-gradient(transparent, transparent 27px, rgba(217, 75, 125, 0.065) 28px)',
        border: '1px solid rgba(196, 146, 74, 0.30)',
        boxShadow: PAPER_STACK_SHADOW,
      } as CSSProperties,
      cardRadiusClass: 'rounded-[18px] rounded-tl-[14px]',
      eyebrowColor: '#9C6A30',
      watermarkColor: '#B88446',
      hasRuledMargin: true,
    };
  }

  if (variant === 'lilac') {
    return {
      tabBg: '#F0E4F7',
      tabBridgeBg: '#FAF5FD',
      tabBorderColor: 'rgba(154, 118, 192, 0.34)',
      tabInk: '#6E498C',
      cardStyle: {
        backgroundColor: '#FCF9FE',
        backgroundImage:
          'radial-gradient(rgba(154, 118, 192, 0.14) 1px, transparent 1px), linear-gradient(165deg, #FCF9FE 0%, #F5ECF9 100%)',
        backgroundSize: '18px 18px, 100% 100%',
        border: '1px solid rgba(154, 118, 192, 0.28)',
        boxShadow: PAPER_STACK_SHADOW,
      } as CSSProperties,
      cardRadiusClass: 'rounded-[18px]',
      eyebrowColor: '#765196',
      watermarkColor: '#8B66AB',
      hasRuledMargin: false,
    };
  }

  // roseClimax (Sheet 3 — Radiant Petal Rose-Blush)
  return {
    tabBg: '#FCDCE8',
    tabBridgeBg: '#FFF2F6',
    tabBorderColor: 'rgba(209, 68, 118, 0.38)',
    tabInk: '#B52C5C',
    cardStyle: {
      background: 'linear-gradient(150deg, #FFF1F6 0%, #FFF8EE 100%)',
      border: '1.5px solid rgba(209, 68, 118, 0.34)',
      boxShadow: `inset 0 0 0 5px rgba(255, 255, 255, 0.55), ${PAPER_STACK_SHADOW}`,
    } as CSSProperties,
    cardRadiusClass: 'rounded-[18px] rounded-tr-[14px]',
    eyebrowColor: '#C23467',
    watermarkColor: '#D14476',
    hasRuledMargin: false,
  };
}

interface BackstorySectionProps {
  isSiteRevealed?: boolean;
}

export function BackstorySection({ isSiteRevealed = true }: BackstorySectionProps = {}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const anchorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stickyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sheetScaleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const viewedChaptersRef = useRef<Set<string>>(new Set());
  const climaxArrivalFiredRef = useRef(false);
  const cancelScrollRef = useRef<(() => void) | null>(null);
  const fleckTimerRef = useRef<number | null>(null);

  const [showClimaxFlecks, setShowClimaxFlecks] = useState(false);

  // 60fps scroll-linked subtle scale settle (1 -> 0.965) via direct DOM refs — zero setState per scroll frame
  useEffect(() => {
    let rafId: number | null = null;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updateStackDepth = () => {
      rafId = null;
      if (prefersReducedMotion) return;

      for (let i = 0; i < BACKSTORY_CHAPTERS.length; i++) {
        const scaleEl = sheetScaleRefs.current[i];
        if (!scaleEl) continue;

        const nextStickyEl = stickyRefs.current[i + 1];
        if (!nextStickyEl) {
          scaleEl.style.transform = 'scale(1)';
          scaleEl.setAttribute('data-stack-scale', '1.000');
          continue;
        }

        const nextRect = nextStickyEl.getBoundingClientRect();
        const scale = computeStickyCardScale({
          nextTop: nextRect.top,
          currentStickyTop: BACKSTORY_CHAPTERS[i].stickyTopPx,
          nextStickyTop: BACKSTORY_CHAPTERS[i + 1].stickyTopPx,
        });

        scaleEl.style.transform = `scale(${scale.toFixed(4)})`;
        scaleEl.setAttribute('data-stack-scale', scale.toFixed(3));
      }
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateStackDepth);
    };

    let listenersAttached = false;
    const attachListeners = () => {
      if (listenersAttached) return;
      listenersAttached = true;
      updateStackDepth();
      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate, { passive: true });
    };
    const detachListeners = () => {
      if (!listenersAttached) return;
      listenersAttached = false;
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    updateStackDepth();

    let visibilityObserver: IntersectionObserver | null = null;
    const sectionEl = sectionRef.current;
    if (sectionEl && typeof IntersectionObserver !== 'undefined') {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          const isNearViewport = entries.some((entry) => entry.isIntersecting);
          if (isNearViewport) {
            attachListeners();
          } else {
            detachListeners();
          }
        },
        { rootMargin: '250px 0px' },
      );
      visibilityObserver.observe(sectionEl);
    } else {
      attachListeners();
    }

    return () => {
      visibilityObserver?.disconnect();
      detachListeners();
      if (cancelScrollRef.current) {
        cancelScrollRef.current();
        cancelScrollRef.current = null;
      }
      if (fleckTimerRef.current !== null) {
        window.clearTimeout(fleckTimerRef.current);
        fleckTimerRef.current = null;
      }
    };
  }, []);

  // Track viewed chapters + trigger Chapter 3 arrival haptic tick & 8 tiny confetti flecks once (after reveal)
  useEffect(() => {
    if (!isSiteRevealed || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const chapterNum = entry.target.getAttribute('data-chapter-numeral');
          if (!chapterNum) continue;

          if (!viewedChaptersRef.current.has(chapterNum)) {
            viewedChaptersRef.current.add(chapterNum);
            trackEvent('timeline_chapter_viewed', 'Backstory Notebook', {
              chapter: chapterNum,
            });
          }

          if (chapterNum === '03' && !climaxArrivalFiredRef.current) {
            climaxArrivalFiredRef.current = true;
            haptics.timelineNodeClimax();
            setShowClimaxFlecks(true);
            fleckTimerRef.current = window.setTimeout(() => {
              setShowClimaxFlecks(false);
              fleckTimerRef.current = null;
            }, 950);
          }

          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.55 },
    );

    for (const el of stickyRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [isSiteRevealed]);

  const handleTabJump = (index: number, chapter: BackstoryChapter) => {
    haptics.timelineReceiptJump();
    soundEngine.playNotebookTabTurn();
    playUiSfx('tap');
    emitModinoEvent('backstory', { force: true });
    trackEvent('timeline_chapter_viewed', 'Backstory Notebook Tab Tap', {
      chapter: chapter.numeral,
    });

    const anchorEl = anchorRefs.current[index];
    if (anchorEl) {
      if (cancelScrollRef.current) {
        cancelScrollRef.current();
      }
      cancelScrollRef.current = smoothScrollToTarget(anchorEl, 760);
    }
  };

  const handleJumpToReceipt = () => {
    haptics.timelineReceiptJump();
    soundEngine.playBubbleClick(1.04);
    playUiSfx('tap');
    emitModinoEvent('backstory', { force: true });
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
      ref={sectionRef}
      id="backstory"
      data-testid="backstory-section"
      className="relative z-[2] scroll-mt-16 overflow-x-clip bg-transparent px-4 py-14 sm:px-6 sm:py-18 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[var(--card-wide-max)]">
        {/* Airy Centered Editorial Header Directly on Warm Page Canvas */}
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="font-semibold tracking-[0.16em] text-[#C93B6B] uppercase"
            style={{ fontSize: 'var(--text-eyebrow)' }}
          >
            HOW WE GOT HERE
          </p>
          <h2
            className="font-display mt-2.5 text-balance leading-[1.15] font-semibold tracking-tight text-[#3A1233]"
            style={{ fontSize: 'clamp(26px, 4.2vw, 40px)' }}
          >
            From Classmates to Greatest HG
          </h2>
          <p
            className="mx-auto mt-2.5 max-w-xl leading-relaxed text-[#7A4A63]"
            style={{ fontSize: 'var(--text-body)' }}
          >
            Scroll through the notebook, or tap any divider tab to jump back.
          </p>
        </div>

        {/* Sticky Stacking Pastel Notebook Sheets (NO overflow: hidden on ancestors so sticky works reliably) */}
        <div
          data-testid="backstory-notebook-stack"
          className="relative mt-9 flex flex-col pb-8 sm:mt-11"
        >
          {BACKSTORY_CHAPTERS.map((chapter, index) => {
            const theme = getNotebookSheetTheme(chapter.variant);
            const isClimax = chapter.variant === 'roseClimax';

            const tabRowJustify =
              chapter.tabAlign === 'left'
                ? 'justify-start pl-[14px]'
                : chapter.tabAlign === 'center'
                  ? 'justify-center'
                  : 'justify-end pr-[14px]';

            return (
              <Fragment key={chapter.id}>
                {/* Invisible Natural Unstacked Flow Scroll Anchor */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none relative h-0 w-full ${index > 0 ? 'mt-[36px]' : ''}`}
                >
                  <span
                    ref={(el) => {
                      anchorRefs.current[index] = el;
                    }}
                    data-testid={`notebook-anchor-${chapter.numeral}`}
                    className="pointer-events-none absolute left-0 h-px w-px"
                    style={{ top: `${72 - chapter.stickyTopPx}px` }}
                  />
                </div>

                {/* Sticky Sheet Wrapper (Direct Child of Flex Column for Genuine CSS Sticky Stacking) */}
                <div
                  ref={(el) => {
                    stickyRefs.current[index] = el;
                  }}
                  data-chapter-id={chapter.id}
                  data-chapter-numeral={chapter.numeral}
                  data-testid={`backstory-chapter-${chapter.numeral}`}
                  className="sticky"
                  style={{
                    top: `calc(${chapter.stickyTopPx}px + clamp(0px, 1.5vw, 18px))`,
                    zIndex: index + 1,
                  }}
                >
                  <div
                    ref={(el) => {
                      sheetScaleRefs.current[index] = el;
                    }}
                    data-testid={`notebook-scale-${chapter.numeral}`}
                    data-stack-scale="1.000"
                    className="origin-top"
                  >
                    {/* Physical Protruding Divider Tab (Fused Seamlessly into Sheet Top Edge) */}
                    <div className={`relative z-[2] flex ${tabRowJustify}`}>
                      <button
                        type="button"
                        data-testid={`notebook-tab-${chapter.numeral}`}
                        onClick={() => handleTabJump(index, chapter)}
                        aria-label={`Jump to ${chapter.tabLabel}`}
                        className="relative inline-flex h-[34px] sm:h-[42px] cursor-pointer items-center whitespace-nowrap rounded-t-[12px] sm:rounded-t-[14px] px-[14px] sm:px-[18px] text-[11.5px] sm:text-[13.5px] font-semibold tracking-[0.04em] transition-transform duration-150 active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
                        style={{
                          marginBottom: '-1px',
                          backgroundColor: theme.tabBg,
                          color: theme.tabInk,
                          borderTop: `1px solid ${theme.tabBorderColor}`,
                          borderLeft: `1px solid ${theme.tabBorderColor}`,
                          borderRight: `1px solid ${theme.tabBorderColor}`,
                          borderBottom: 'none',
                          boxShadow: '0 -4px 12px -6px rgba(154, 48, 88, 0.14)',
                        }}
                      >
                        <span>{chapter.tabLabel}</span>

                        {/* Seamless cardstock fusion bridge covering the card top border beneath the tab */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-0 -bottom-[2px] left-0 h-[4px]"
                          style={{
                            background: `linear-gradient(180deg, ${theme.tabBg} 0%, ${theme.tabBridgeBg} 100%)`,
                          }}
                        />

                        {/* Chapter 3 Arrival Celebration: 8 Delicate Blush & Champagne Confetti Flecks */}
                        {isClimax && showClimaxFlecks && (
                          <span
                            aria-hidden="true"
                            data-testid="notebook-climax-flecks"
                            className="pointer-events-none absolute inset-x-0 top-1 flex items-center justify-center"
                          >
                            {CHAPTER_3_TAB_FLECKS.map((fleck) => (
                              <span
                                key={fleck.id}
                                className="animate-notebook-fleck absolute rounded-[2px]"
                                style={
                                  {
                                    width: `${fleck.w}px`,
                                    height: `${fleck.h}px`,
                                    backgroundColor: fleck.color,
                                    '--fx': fleck.fx,
                                    '--fy': fleck.fy,
                                    '--fr': fleck.fr,
                                    '--fdelay': fleck.delay,
                                  } as CSSProperties
                                }
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Pastel Stationery Postcard Body */}
                    <article
                      data-testid={`notebook-card-${chapter.numeral}`}
                      className={`relative z-[1] min-h-[245px] sm:min-h-[290px] overflow-hidden px-5 sm:px-9 lg:px-10 ${
                        isClimax ? 'py-[24px] sm:py-8' : 'pt-[44px] pb-[24px] sm:pt-[52px] sm:pb-8'
                      } ${theme.cardRadiusClass}`}
                      style={theme.cardStyle}
                    >
                      {/* Subtle Vertical Left Pink Notebook Margin Line (Sheet 1 Only) */}
                      {theme.hasRuledMargin && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0 bottom-0 left-[16px] w-px sm:left-[26px]"
                          style={{ backgroundColor: 'rgba(217, 75, 125, 0.16)' }}
                        />
                      )}

                      {/* Subtle Top-Right Faint Archival Serif Numeral */}
                      <span
                        aria-hidden="true"
                        className={`font-display pointer-events-none absolute right-4 select-none text-[50px] leading-none font-semibold tracking-tight sm:right-7 sm:text-[64px] ${
                          isClimax ? 'top-3 sm:top-4' : 'top-[42px] sm:top-[48px]'
                        }`}
                        style={{
                          color: theme.watermarkColor,
                          opacity: 0.11,
                        }}
                      >
                        {chapter.numeral}
                      </span>

                      <div
                        className={`relative z-10 ${theme.hasRuledMargin ? 'pl-3 sm:pl-5' : ''}`}
                      >
                        <p
                          data-testid={`chapter-eyebrow-${chapter.numeral}`}
                          className="pr-12 leading-snug font-semibold tracking-[0.14em] uppercase"
                          style={{ color: theme.eyebrowColor, fontSize: 'var(--text-eyebrow)' }}
                        >
                          {chapter.eyebrow}
                        </p>

                        <h3
                          className="font-display mt-2 leading-snug font-semibold tracking-tight text-[#3A1233]"
                          style={{ fontSize: 'clamp(22px, 2.9vw, 31px)' }}
                        >
                          {chapter.title}
                        </h3>

                        {chapter.metaPill && (
                          <p className="mt-2.5">
                            <span
                              data-testid="chapter-3-meta-pill"
                              className="inline-flex items-center rounded-full px-3.5 py-1 text-[11px] sm:text-[13px] font-semibold tracking-[0.03em] text-[#B52C5C]"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.78)',
                                border: '1px solid rgba(209, 68, 118, 0.24)',
                              }}
                            >
                              {chapter.metaPill}
                            </span>
                          </p>
                        )}

                        <p
                          className="mt-3.5 max-w-[60ch] leading-[1.7] text-[#4F2547]"
                          style={{ fontSize: 'clamp(14.5px, 1.9vw, 18px)' }}
                        >
                          {chapter.description}
                        </p>

                        {/* Chapter 3 Interactive Jump Pill to Case File #0721 */}
                        {isClimax && (
                          <div className="mt-5 sm:mt-6">
                            <button
                              type="button"
                              data-testid="timeline-receipt-jump-btn"
                              onClick={handleJumpToReceipt}
                              className="inline-flex min-h-[42px] sm:min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-[#FFFFFF] px-5 py-2.5 text-xs sm:text-sm font-semibold tracking-[0.02em] text-[#B52F5E] shadow-[0_6px_16px_-8px_rgba(181,47,94,0.28)] transition-all duration-150 hover:bg-[#FFF8FB] active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
                              style={{ border: '1px solid rgba(201, 59, 107, 0.34)' }}
                            >
                              <span>See the 12:29 AM receipt</span>
                              <DownwardReceiptArrowSvg className="h-[14px] w-[14px] shrink-0 text-[#C93B6B]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

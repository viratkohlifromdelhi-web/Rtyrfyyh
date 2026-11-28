import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { ANAMIKA, HERO_STICKERS } from '../data/celebrationData';
import { trackEvent } from '../utils/analytics';
import { splitHeadlineWords } from '../utils/celebration';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { smoothScrollToTarget } from '../utils/smoothScroll';
import { soundEngine } from '../utils/soundEngine';
import { playUiSfx } from '../utils/uiSoundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';
import { AnamikaEditorialCard } from './AnamikaEditorialCard';
import { RibbonSquiggleSvg } from './DoodleSvgs';

interface PerimeterEmojiConfig {
  id: string;
  emoji: string;
  label: string;
  positionClass: string;
  durSec: number;
  delaySec: number;
  rotA: string;
  rotB: string;
  idleOpacityClass: string;
}

/**
 * 8 soft, background-blended perimeter emojis (16px–19px, opacity 0.42–0.50)
 * pinned strictly outside the central text safe-zone on both mobile and desktop.
 */
const PERIMETER_EMOJIS: readonly PerimeterEmojiConfig[] = [
  {
    id: 'heart-hands',
    emoji: '🫶',
    label: 'Pop heart hands celebration spark',
    positionClass: 'top-[12px] left-[3%] sm:top-[18px] lg:top-[4%] lg:left-[4%]',
    durSec: 4.2,
    delaySec: 0,
    rotA: '-5deg',
    rotB: '5deg',
    idleOpacityClass: 'opacity-[0.46]',
  },
  {
    id: 'cake',
    emoji: '🎂',
    label: 'Pop birthday cake celebration spark',
    positionClass: 'top-[12px] right-[3%] sm:top-[18px] lg:top-[4%] lg:right-[4%]',
    durSec: 4.6,
    delaySec: -1.1,
    rotA: '4deg',
    rotB: '-6deg',
    idleOpacityClass: 'opacity-[0.48]',
  },
  {
    id: 'popper',
    emoji: '🎉',
    label: 'Pop party popper celebration spark',
    positionClass: 'top-[196px] left-[2.5%] sm:top-[214px] lg:top-[26%] lg:left-[2%]',
    durSec: 3.9,
    delaySec: -0.6,
    rotA: '-6deg',
    rotB: '4deg',
    idleOpacityClass: 'opacity-[0.44]',
  },
  {
    id: 'crown',
    emoji: '👑',
    label: 'Pop crown celebration spark',
    positionClass: 'top-[192px] right-[2.5%] sm:top-[210px] lg:top-[25%] lg:right-[2%]',
    durSec: 4.4,
    delaySec: -2.0,
    rotA: '6deg',
    rotB: '-5deg',
    idleOpacityClass: 'opacity-[0.46]',
  },
  {
    id: 'crying-laugh',
    emoji: '😭',
    label: 'Pop crying emoji celebration spark',
    positionClass: 'top-[316px] left-[3%] sm:top-[346px] lg:top-[64%] lg:left-[2%]',
    durSec: 4.9,
    delaySec: -1.5,
    rotA: '-4deg',
    rotB: '6deg',
    idleOpacityClass: 'opacity-[0.42]',
  },
  {
    id: 'ribbon',
    emoji: '🎀',
    label: 'Pop ribbon bow celebration spark',
    positionClass: 'top-[314px] right-[3%] sm:top-[344px] lg:top-[63%] lg:right-[2%]',
    durSec: 3.7,
    delaySec: -2.6,
    rotA: '5deg',
    rotB: '-5deg',
    idleOpacityClass: 'opacity-[0.48]',
  },
  {
    id: 'dino',
    emoji: '🦖',
    label: 'Pop dinosaur celebration spark',
    positionClass: 'top-[502px] left-[4%] sm:top-[492px] lg:top-auto lg:bottom-[10%] lg:left-[5%]',
    durSec: 4.7,
    delaySec: -0.9,
    rotA: '-6deg',
    rotB: '5deg',
    idleOpacityClass: 'opacity-[0.45]',
  },
  {
    id: 'balloon',
    emoji: '🎈',
    label: 'Pop birthday balloon celebration spark',
    positionClass: 'top-[486px] right-[4%] sm:top-[478px] lg:top-auto lg:bottom-[14%] lg:right-[4%]',
    durSec: 4.1,
    delaySec: -1.8,
    rotA: '5deg',
    rotB: '-6deg',
    idleOpacityClass: 'opacity-[0.48]',
  },
];

const EMOJI_SPARK_VECTORS: readonly { x: string; y: string; color: string }[] = [
  { x: '-16px', y: '-16px', color: '#D94B7D' },
  { x: '16px', y: '-15px', color: '#E8C892' },
  { x: '-15px', y: '15px', color: '#C69CE6' },
  { x: '15px', y: '14px', color: '#F39CB8' },
];

/**
 * Bespoke crisp inline SVG angled party-popper / ribbon burst icon (18px).
 */
function PartyPopperIconSvg({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.6 19.6L8.2 7.8L16.2 15.8L4.4 20.4C3.85 20.62 3.38 20.15 3.6 19.6Z"
        fill="#F4D7A1"
        fillOpacity="0.22"
        stroke="#F4D7A1"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 11.4L12.6 17.2M5.5 14.8L9.2 18.5"
        stroke="#F9B8CE"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M12.4 7.6C13.6 5.2 15.8 4.4 17.8 4.6"
        stroke="#F4D7A1"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M15.4 10.6C17.4 9.2 19.4 9.4 20.8 10.6"
        stroke="#F9B8CE"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <circle cx="15.8" cy="7.4" r="1.15" fill="#F9B8CE" />
      <circle cx="19.6" cy="6.6" r="1" fill="#F4D7A1" />
      <circle cx="18.2" cy="13.4" r="1.05" fill="#F4D7A1" />
    </svg>
  );
}

/**
 * Delicate inline SVG minimalist gift-box with ribbon bow (17px).
 */
function MinimalGiftBoxIconSvg({ className = 'h-[17px] w-[17px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 7.5C10.1 4.4 6.6 4.6 7 6.8C7.3 8.1 9.6 7.9 12 7.5Z"
        stroke="#D94B7D"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.5C13.9 4.4 17.4 4.6 17 6.8C16.7 8.1 14.4 7.9 12 7.5Z"
        stroke="#D94B7D"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <rect
        x="3.75"
        y="7.75"
        width="16.5"
        height="4"
        rx="1.5"
        stroke="#D94B7D"
        strokeWidth="1.65"
      />
      <path
        d="M5.25 11.75H18.75V18.25C18.75 19.35 17.85 20.25 16.75 20.25H7.25C6.15 20.25 5.25 19.35 5.25 18.25V11.75Z"
        stroke="#D94B7D"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M12 7.75V20.25" stroke="#D94B7D" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

interface HeroSectionProps {
  isBirthdayTruce: boolean;
  onPopConfetti: (originX?: number, originY?: number) => void;
  isSiteRevealed?: boolean;
  onPhotoLightboxChange?: (open: boolean) => void;
}

export function HeroSection({
  onPopConfetti,
  isSiteRevealed = true,
  onPhotoLightboxChange,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef, { enabled: isSiteRevealed });
  const lineOneWords = splitHeadlineWords('Happy 17th Birthday,');
  const lineTwoWords = splitHeadlineWords(`${ANAMIKA.firstName}!`);

  const [popBurstCount, setPopBurstCount] = useState(0);
  const [isPoppedState, setIsPoppedState] = useState(false);
  const [primaryPressed, setPrimaryPressed] = useState(false);
  const [secondaryPressed, setSecondaryPressed] = useState(false);
  const [emojiBursts, setEmojiBursts] = useState<Record<string, number>>({});
  const [brightEmojis, setBrightEmojis] = useState<Record<string, boolean>>({});

  const labelTimerRef = useRef<number | null>(null);
  const scrollDelayTimerRef = useRef<number | null>(null);
  const cancelScrollRef = useRef<(() => void) | null>(null);
  const emojiBrightTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const brightTimers = emojiBrightTimersRef.current;
    return () => {
      if (labelTimerRef.current !== null) {
        window.clearTimeout(labelTimerRef.current);
      }
      if (scrollDelayTimerRef.current !== null) {
        window.clearTimeout(scrollDelayTimerRef.current);
      }
      if (cancelScrollRef.current) {
        cancelScrollRef.current();
      }
      Object.values(brightTimers).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const handlePerimeterEmojiTap = (id: string, idx: number) => {
    soundEngine.playBubbleClick(1.04 + (idx % 4) * 0.05);
    haptics.emojiBounce();
    emitModinoEvent('friends_and_banter', { source: `hero-emoji-${id}` });
    setEmojiBursts((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));

    // Briefly brighten to opacity 0.95 then ease smoothly back into soft ambient fade
    setBrightEmojis((prev) => ({ ...prev, [id]: true }));
    if (emojiBrightTimersRef.current[id]) {
      window.clearTimeout(emojiBrightTimersRef.current[id]);
    }
    emojiBrightTimersRef.current[id] = window.setTimeout(() => {
      setBrightEmojis((prev) => ({ ...prev, [id]: false }));
      delete emojiBrightTimersRef.current[id];
    }, 520);
  };

  const handleConfettiClick = (e: MouseEvent<HTMLButtonElement>) => {
    haptics.heroPopConfetti();
    playUiSfx('confetti_burst');
    emitModinoEvent('interaction_hype', { force: true });
    const buttonEl = e.currentTarget;
    const rect = buttonEl.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    setPopBurstCount((n) => n + 1);
    onPopConfetti(originX, originY);
    trackEvent('hero_confetti_popped', 'Hero Pop Confetti Button');

    setIsPoppedState(true);
    if (labelTimerRef.current !== null) {
      window.clearTimeout(labelTimerRef.current);
    }
    labelTimerRef.current = window.setTimeout(() => {
      setIsPoppedState(false);
      labelTimerRef.current = null;
    }, 1200);

    if (scrollDelayTimerRef.current !== null) {
      window.clearTimeout(scrollDelayTimerRef.current);
    }
    scrollDelayTimerRef.current = window.setTimeout(() => {
      scrollDelayTimerRef.current = null;
      const photoSlot = document.querySelector<HTMLElement>('[data-testid="single-photo-slot"]');
      const nextSection = document.getElementById('toggles');

      let target: HTMLElement | null = nextSection;
      if (photoSlot) {
        const photoRect = photoSlot.getBoundingClientRect();
        const btnRect = buttonEl.getBoundingClientRect();
        if (photoRect.top > btnRect.bottom + 12) {
          target = photoSlot;
        }
      }

      if (target) {
        cancelScrollRef.current = smoothScrollToTarget(target, 850);
      }
    }, 550);
  };

  const handleOpenGiftClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    haptics.heroOpenGift();
    soundEngine.playBubbleClick(1.04);
    playUiSfx('tap');
    emitModinoEvent('interaction_hype');
    trackEvent('hero_open_gift_clicked', 'Hero Open Your Gift Button');

    if (scrollDelayTimerRef.current !== null) {
      window.clearTimeout(scrollDelayTimerRef.current);
      scrollDelayTimerRef.current = null;
    }

    const giftSection = document.getElementById('gift');
    if (giftSection) {
      cancelScrollRef.current = smoothScrollToTarget(giftSection, 1050);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="top"
      data-testid="hero-section"
      data-animations-active={String(animationsActive)}
      className={`hero-pastel-mesh hero-short-landscape-section relative scroll-mt-16 overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-22 ${
        animationsActive ? '' : 'anim-paused'
      }`}
    >
      {/* Soft, Background-Blended Perimeter Floating Emojis (16px–19px, opacity 0.42–0.50) */}
      <div
        data-testid="hero-perimeter-emojis"
        className="pointer-events-none absolute inset-0 z-[2] overflow-hidden select-none"
      >
        {PERIMETER_EMOJIS.map((item, idx) => {
          const burstCount = emojiBursts[item.id] ?? 0;
          const isBright = Boolean(brightEmojis[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`hero-perimeter-emoji-${item.id}`}
              data-emoji={item.emoji}
              data-burst-count={burstCount}
              data-bright={String(isBright)}
              aria-label={item.label}
              onClick={() => handlePerimeterEmojiTap(item.id, idx)}
              style={
                {
                  '--bob-dur': `${item.durSec}s`,
                  '--bob-delay': `${item.delaySec}s`,
                  '--bob-rot-a': item.rotA,
                  '--bob-rot-b': item.rotB,
                  filter: isBright ? 'saturate(1) contrast(1)' : 'saturate(0.78) contrast(0.92)',
                } as CSSProperties
              }
              className={`animate-hero-emoji-bob pointer-events-auto absolute inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-[16px] leading-none transition-[opacity,filter] duration-500 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] sm:text-[18px] lg:text-[19px] ${item.positionClass} ${
                isBright ? 'opacity-95' : item.idleOpacityClass
              }`}
            >
              {/* Tiny 4-spark pastel burst on tap */}
              {burstCount > 0 && (
                <span
                  key={`sparks-${burstCount}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  {EMOJI_SPARK_VECTORS.map((vec, sIdx) => (
                    <span
                      key={sIdx}
                      style={
                        {
                          backgroundColor: vec.color,
                          '--sp-x': vec.x,
                          '--sp-y': vec.y,
                        } as CSSProperties
                      }
                      className="animate-hero-emoji-spark absolute h-1.5 w-1.5 rounded-full"
                    />
                  ))}
                </span>
              )}

              <span
                key={`glyph-${burstCount}`}
                aria-hidden="true"
                className={`inline-block ${
                  burstCount > 0 ? 'animate-hero-emoji-bounce' : ''
                }`}
              >
                {item.emoji}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none relative z-[3] mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Balanced 2x2 Top Tag Pills on mobile, generous row on tablet & desktop */}
        <div
          data-testid="hero-tag-pills"
          aria-label="Anamika's official titles"
          className="hero-short-landscape-pills mx-auto mb-7 flex max-w-[340px] sm:max-w-[640px] flex-wrap items-center justify-center gap-2 sm:gap-3 lg:mx-0 lg:max-w-none lg:justify-start"
        >
          {HERO_STICKERS.map((sticker, idx) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => {
                haptics.tap();
                soundEngine.playBubbleClick(1.06);
                emitModinoEvent('friends_and_banter', { source: `hero-sticker-${sticker.id}` });
              }}
              style={{ animationDelay: `${idx * 0.45}s` }}
              className={`pointer-events-auto inline-flex cursor-pointer items-center rounded-2xl border px-[13px] py-[6px] text-[13px] leading-tight font-semibold whitespace-nowrap text-[#3B1535] shadow-xs transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] lg:text-sm ${sticker.bg} ${sticker.border} ${sticker.rotate} ${
                idx % 2 === 0 ? 'animate-float-gentle' : 'animate-float-reverse'
              }`}
            >
              {sticker.label}
            </button>
          ))}
        </div>

        {/* Two-column balanced hero on desktop, clean stacked mobile-first */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Clean Uncluttered Center Safe-Zone for Headline, Subtitle & Tactile Stationery CTAs */}
          <div
            data-testid="hero-text-safe-zone"
            className="relative z-[3] px-5 text-center sm:px-8 lg:col-span-7 lg:px-0 lg:text-left"
          >
            <p
              data-testid="hero-eyebrow-date"
              className="hero-eyebrow-line pointer-events-auto mx-auto mb-3 inline-block text-[12px] font-medium tracking-[0.01em] whitespace-nowrap text-[#8C3B71] sm:text-sm lg:mx-0"
            >
              <span>
                {ANAMIKA.fullName} &middot; {ANAMIKA.birthdayLabel}
              </span>
              <span className="hero-eyebrow-dot-2"> &middot; </span>
              <span className="hero-eyebrow-age">Turning {ANAMIKA.age}</span>
            </p>

            <h1
              aria-label={`Happy ${ANAMIKA.age}th Birthday, ${ANAMIKA.firstName}!`}
              className="hero-short-landscape-h1 font-display pointer-events-auto mx-auto block w-fit text-balance leading-[1.06] font-semibold tracking-tight text-[#3B1535] lg:mx-0"
              style={{ fontSize: 'clamp(2.5rem, 6.2vw, 4.1rem)' }}
            >
              <span className="block">
                {lineOneWords.map((w, wi) => (
                  <span key={`l1-${wi}`} className="mr-[0.25em] inline-block">
                    {w.letters.map((char, ci) => (
                      <span key={`l1-${wi}-${ci}`} className="bouncy-letter">
                        {char}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span className="mt-1 block italic text-[#C2377E]">
                {lineTwoWords.map((w, wi) => (
                  <span key={`l2-${wi}`} className="mr-[0.22em] inline-block">
                    {w.letters.map((char, ci) => (
                      <span key={`l2-${wi}-${ci}`} className="bouncy-letter">
                        {char}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            </h1>

            <div className="mt-4 flex justify-center lg:justify-start">
              <RibbonSquiggleSvg className="h-5 w-28 text-[#E089B6]" />
            </div>

            <p className="hero-short-landscape-sub pointer-events-auto mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#52244B] sm:text-lg lg:mx-0">
              {ANAMIKA.heroSubtitle}
            </p>

            {/* Luxury Tactile Stationery CTA Button Pair (Preserved untouched) */}
            <div className="hero-short-landscape-ctas mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 lg:justify-start">
              {/* Primary Tactile Confetti Popper Button */}
              <div className="pointer-events-auto relative inline-flex">
                {popBurstCount > 0 && (
                  <span
                    key={`ripple-${popBurstCount}`}
                    aria-hidden="true"
                    data-testid="hero-confetti-ripple"
                    className="animate-hero-btn-ripple pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-[#E8C892] will-change-[transform,opacity]"
                  />
                )}

                <button
                  type="button"
                  data-testid="hero-pop-confetti-btn"
                  data-pressed={String(primaryPressed)}
                  data-popped={String(isPoppedState)}
                  onClick={handleConfettiClick}
                  onPointerDown={() => setPrimaryPressed(true)}
                  onPointerUp={() => setPrimaryPressed(false)}
                  onPointerLeave={() => setPrimaryPressed(false)}
                  onPointerCancel={() => setPrimaryPressed(false)}
                  className="hero-btn-primary relative inline-flex min-w-[220px] cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-full px-[26px] py-[14px] text-sm font-medium tracking-[0.01em] whitespace-nowrap shrink-0 select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#D94B7D]"
                >
                  {popBurstCount > 0 && (
                    <span
                      key={`sheen-${popBurstCount}`}
                      aria-hidden="true"
                      className="animate-hero-btn-tap-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F6DFB5]/45 to-transparent will-change-[transform,opacity]"
                    />
                  )}

                  <span
                    key={`icon-${popBurstCount}`}
                    className={`relative z-10 inline-flex shrink-0 items-center justify-center ${
                      popBurstCount > 0 ? 'animate-hero-popper-recoil' : ''
                    }`}
                  >
                    <PartyPopperIconSvg className="h-[18px] w-[18px]" />
                  </span>

                  <span
                    data-testid="hero-pop-confetti-label"
                    className="relative z-10 transition-opacity duration-200"
                  >
                    {isPoppedState ? 'Celebration On 🎉' : 'Pop Confetti'}
                  </span>

                  <span
                    aria-hidden="true"
                    className="relative z-10 ml-0.5 text-xs leading-none opacity-65"
                  >
                    ↓
                  </span>
                </button>
              </div>

              {/* Secondary Matching Tactile Stationery Pill (Open Your Gift) */}
              <a
                href="#gift"
                data-testid="hero-open-gift-btn"
                data-pressed={String(secondaryPressed)}
                onClick={handleOpenGiftClick}
                onPointerDown={() => setSecondaryPressed(true)}
                onPointerUp={() => setSecondaryPressed(false)}
                onPointerLeave={() => setSecondaryPressed(false)}
                onPointerCancel={() => setSecondaryPressed(false)}
                className="hero-btn-secondary pointer-events-auto inline-flex min-w-[220px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-[26px] py-[13px] text-sm font-medium tracking-[0.01em] whitespace-nowrap shrink-0 select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3A1233]"
              >
                <MinimalGiftBoxIconSvg className="h-[17px] w-[17px] shrink-0" />
                <span>Open Your Gift</span>
              </a>
            </div>
          </div>

          {/* Right Column: Anamika's Authentic Printed Photo Card */}
          <div className="relative z-[3] mx-auto flex w-full justify-center lg:col-span-5">
            <div className="hero-short-landscape-photo pointer-events-auto w-full flex justify-center">
              <AnamikaEditorialCard onLightboxChange={onPhotoLightboxChange} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

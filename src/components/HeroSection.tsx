import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { ImagePlus, RotateCcw } from 'lucide-react';
import { ANAMIKA, HERO_STICKERS, MODE_MESSAGES } from '../data/celebrationData';
import { splitHeadlineWords } from '../utils/celebration';
import {
  PolaroidCameraDoodle,
  RibbonSquiggleSvg,
  SparkleBurstIconSvg,
  SparkleStarSvg,
} from './DoodleSvgs';

interface FloatingEmojiSpec {
  id: string;
  emoji: string;
  positionClass: string;
  sizeClass: string;
  animClass: 'animate-emoji-a' | 'animate-emoji-b' | 'animate-emoji-c';
  dur: string;
  delay: string;
}

const HERO_FLOATING_EMOJIS: FloatingEmojiSpec[] = [
  {
    id: 'em-heart-hands',
    emoji: '🫶🏻',
    positionClass: 'top-6 left-2 sm:top-10 sm:left-4 lg:left-6',
    sizeClass: 'text-2xl sm:text-3xl',
    animClass: 'animate-emoji-a',
    dur: '5.4s',
    delay: '0s',
  },
  {
    id: 'em-cake',
    emoji: '🎂',
    positionClass: 'top-6 right-2 sm:top-8 sm:right-5 lg:right-8',
    sizeClass: 'text-2xl sm:text-3xl',
    animClass: 'animate-emoji-b',
    dur: '6.2s',
    delay: '-1.1s',
  },
  {
    id: 'em-crown',
    emoji: '👑',
    positionClass: 'top-[27%] right-2 sm:top-10 sm:right-[28%] lg:top-8 lg:left-[64%] lg:right-auto',
    sizeClass: 'text-xl sm:text-2xl lg:text-3xl',
    animClass: 'animate-emoji-c',
    dur: '5.9s',
    delay: '-2.3s',
  },
  {
    id: 'em-unicorn',
    emoji: '🦄',
    positionClass: 'top-[58%] right-2 sm:right-5 lg:bottom-14 lg:top-auto lg:right-8',
    sizeClass: 'text-2xl sm:text-3xl',
    animClass: 'animate-emoji-a',
    dur: '6.8s',
    delay: '-0.7s',
  },
  {
    id: 'em-sob',
    emoji: '😭',
    positionClass: 'top-[32%] left-2 sm:top-[44%] sm:left-4 lg:top-[52%] lg:left-5',
    sizeClass: 'text-xl sm:text-2xl lg:text-3xl',
    animClass: 'animate-emoji-b',
    dur: '5.6s',
    delay: '-1.8s',
  },
  {
    id: 'em-wilted-rose',
    emoji: '🥀',
    positionClass: 'top-[18%] left-[12%] sm:top-[22%] sm:left-[44%] lg:top-[18%] lg:left-[46%]',
    sizeClass: 'text-xl sm:text-2xl',
    animClass: 'animate-emoji-c',
    dur: '6.4s',
    delay: '-1.5s',
  },
  {
    id: 'em-devil',
    emoji: '😈',
    positionClass: 'bottom-[31%] left-2 sm:bottom-16 sm:left-6 lg:bottom-10 lg:left-[10%]',
    sizeClass: 'text-xl sm:text-2xl lg:text-3xl',
    animClass: 'animate-emoji-c',
    dur: '6.1s',
    delay: '-3.1s',
  },
  {
    id: 'em-heart-box',
    emoji: '💟',
    positionClass: 'bottom-6 left-4 sm:bottom-8 sm:left-[38%] lg:bottom-8 lg:left-[48%]',
    sizeClass: 'text-xl sm:text-2xl',
    animClass: 'animate-emoji-a',
    dur: '5.2s',
    delay: '-0.4s',
  },
  {
    id: 'em-snake-1',
    emoji: '🐍',
    positionClass: 'top-[47%] left-2 sm:top-[28%] sm:right-6 sm:left-auto lg:top-[38%] lg:left-[54%]',
    sizeClass: 'text-xl sm:text-2xl',
    animClass: 'animate-emoji-b',
    dur: '6.6s',
    delay: '-2.5s',
  },
  {
    id: 'em-snake-2',
    emoji: '🐍',
    positionClass: 'bottom-[15%] right-2 sm:bottom-24 sm:right-4 lg:top-[44%] lg:bottom-auto lg:right-5',
    sizeClass: 'text-xl sm:text-2xl',
    animClass: 'animate-emoji-c',
    dur: '5.7s',
    delay: '-1.3s',
  },
  {
    id: 'em-snake-3',
    emoji: '🐍',
    positionClass: 'bottom-5 right-14 sm:bottom-7 sm:right-[24%] lg:bottom-7 lg:left-[31%] lg:right-auto',
    sizeClass: 'text-xl sm:text-2xl',
    animClass: 'animate-emoji-a',
    dur: '7.0s',
    delay: '-3.6s',
  },
];

interface HeroSectionProps {
  isWholesomeMode: boolean;
  onPopConfetti: (originX?: number, originY?: number) => void;
}

export function HeroSection({ isWholesomeMode, onPopConfetti }: HeroSectionProps) {
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lineOneWords = splitHeadlineWords('Happy 17th Birthday,');
  const lineTwoWords = splitHeadlineWords(`${ANAMIKA.firstName}!`);

  useEffect(() => {
    return () => {
      if (uploadedPhotoUrl) {
        URL.revokeObjectURL(uploadedPhotoUrl);
      }
    };
  }, [uploadedPhotoUrl]);

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedPhotoUrl) {
      URL.revokeObjectURL(uploadedPhotoUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setUploadedPhotoUrl(nextUrl);
  };

  const handleClearPhoto = () => {
    if (uploadedPhotoUrl) {
      URL.revokeObjectURL(uploadedPhotoUrl);
    }
    setUploadedPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfettiClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onPopConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const modeNote = isWholesomeMode
    ? MODE_MESSAGES.wholesome.polaroidNote
    : MODE_MESSAGES.roast.polaroidNote;

  return (
    <section
      id="top"
      className="relative scroll-mt-16 overflow-hidden bg-gradient-to-b from-[#FFF6F9] via-[#FFF0F6] to-[#FFF6F9] pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-22"
    >
      {/* Soft pastel ambient washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#FFE6F0]/85 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-24 -right-24 h-96 w-96 rounded-full bg-[#F1E9FF]/85 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#FFF3C4]/50 blur-3xl"
      />

      {/* Chaotic Playful Floating Emoji Layer */}
      <div
        data-testid="hero-floating-emojis"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-x-hidden px-4 select-none sm:px-6"
      >
        <div className="relative h-full w-full">
          {HERO_FLOATING_EMOJIS.map((item) => {
            const style = {
              '--emoji-dur': item.dur,
              '--emoji-delay': item.delay,
            } as CSSProperties;
            return (
              <span
                key={item.id}
                style={style}
                className={`absolute leading-none opacity-45 drop-shadow-[0_4px_10px_rgba(59,21,53,0.1)] sm:opacity-55 ${item.positionClass} ${item.sizeClass} ${item.animClass}`}
              >
                {item.emoji}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Floating Animated Sticker Badges around the Header */}
        <div
          aria-label="Anamika's official titles"
          className="mb-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 lg:justify-start"
        >
          {HERO_STICKERS.map((sticker, idx) => (
            <span
              key={sticker.id}
              style={{ animationDelay: `${idx * 0.45}s` }}
              className={`inline-flex items-center rounded-2xl border px-3.5 py-1.5 text-xs font-semibold text-[#3B1535] shadow-xs transition-transform duration-200 hover:scale-105 sm:text-sm ${sticker.bg} ${sticker.border} ${sticker.rotate} ${
                idx % 2 === 0 ? 'animate-float-gentle' : 'animate-float-reverse'
              }`}
            >
              {sticker.label}
            </span>
          ))}
        </div>

        {/* Two-column balanced hero on desktop, clean stacked mobile-first */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Playful Headline, Cheeky Subtitle & Pop Confetti CTA */}
          <div className="text-center lg:col-span-7 lg:text-left">
            <p className="mb-3 text-sm font-medium text-[#8C3B71]">
              {ANAMIKA.fullName} &middot; {ANAMIKA.birthdayLabel} &middot; Turning {ANAMIKA.age}
            </p>

            <h1
              aria-label={`Happy ${ANAMIKA.age}th Birthday, ${ANAMIKA.firstName}!`}
              className="font-display text-balance text-5xl leading-[1.06] font-semibold tracking-tight text-[#3B1535] sm:text-6xl lg:text-[4.25rem]"
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

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#52244B] sm:text-lg lg:mx-0">
              {ANAMIKA.heroSubtitle}
            </p>

            {/* Primary CTA */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
              <button
                type="button"
                data-testid="hero-pop-confetti-btn"
                onClick={handleConfettiClick}
                className="group inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#3A1233] to-[#9E2A5B] px-7 py-3 text-sm font-semibold text-[#FFFDFB] shadow-[0_10px_24px_-10px_rgba(58,18,51,0.48)] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_28px_-10px_rgba(158,42,91,0.52)] active:scale-[0.96] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#D94B7D]"
              >
                <SparkleBurstIconSvg className="h-5 w-5 shrink-0 text-[#FFFDFB] transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
                <span>Pop Confetti</span>
              </button>

              <a
                href="#gift"
                className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[#DEC9EC] bg-[#F1E9FF]/80 px-6 py-3 text-sm font-semibold text-[#3A1233] transition-colors duration-200 hover:bg-[#F1E9FF] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233]"
              >
                Open Your Gift 🎁
              </a>
            </div>
          </div>

          {/* Right Column: THE ONLY PHOTO SLOT ON THE ENTIRE WEBSITE */}
          <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
            <SparkleStarSvg className="animate-twinkle pointer-events-none absolute -top-5 left-1 z-0 h-8 w-8 text-[#E878B0] opacity-70 sm:-left-2 sm:h-9 sm:w-9" />
            <SparkleStarSvg
              className="animate-twinkle pointer-events-none absolute right-1 -bottom-4 z-0 h-7 w-7 text-[#E8BE44] opacity-70 sm:-right-2 sm:h-8 sm:w-8"
              style={{ animationDelay: '0.9s' }}
            />
            <SparkleStarSvg
              className="animate-twinkle pointer-events-none absolute top-10 right-1 z-0 h-5 w-5 text-[#A385F2] opacity-70 sm:-right-3 sm:h-6 sm:w-6"
              style={{ animationDelay: '1.5s' }}
            />

            {/* Decorative pastel masking tape */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-3 left-1/2 z-20 h-7 w-28 -translate-x-1/2 -rotate-2 rounded-xs bg-[#FFE898]/85 shadow-xs"
            />

            <figure
              data-testid="single-photo-slot"
              className="relative z-10 -rotate-2 rounded-3xl border border-[#ECD6EA] bg-[#FFFDF8] p-3.5 pb-6 shadow-[0_24px_50px_-20px_rgba(59,21,53,0.24)] transition-transform duration-300 hover:rotate-0 sm:p-4 sm:pb-7"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                aria-label="Add Anamika's photo to the Polaroid frame"
                className="sr-only"
              />

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-dashed border-[#DFB9D8] bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF]">
                {uploadedPhotoUrl ? (
                  <>
                    <img
                      src={uploadedPhotoUrl}
                      alt="Anamika Singh — aka Morgan"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center"
                    />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      aria-label="Reset Anamika's photo placeholder"
                      className="absolute right-2.5 bottom-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#3B1535]/85 px-3 py-1.5 text-xs font-semibold text-[#FFFDF8] backdrop-blur-xs transition-colors hover:bg-[#3B1535] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Swap Photo</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Add Anamika's photo here"
                    className="group flex h-full w-full flex-col items-center justify-center p-5 text-center transition-colors hover:bg-[#FFE4F0]/45 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#C2377E]"
                  >
                    <PolaroidCameraDoodle className="h-24 w-24 transition-transform duration-300 group-hover:scale-105" />
                    <span className="font-display mt-2 text-lg font-semibold text-[#3B1535]">
                      Anamika&rsquo;s Photo
                    </span>
                    <span className="mt-1 max-w-[230px] text-xs leading-relaxed text-[#6E3C66]">
                      Add 1 picture of Anamika (aka Morgan) here.
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#3B1535] px-4 py-1.5 text-xs font-semibold text-[#FFFDF8] shadow-xs transition-transform group-hover:scale-105">
                      <ImagePlus className="h-3.5 w-3.5 text-[#FFE898]" aria-hidden="true" />
                      <span>Add Photo</span>
                    </span>
                  </button>
                )}
              </div>

              <figcaption className="mt-4 px-1">
                <p className="font-display text-base italic text-[#3B1535] sm:text-lg">
                  {ANAMIKA.polaroidCaption}
                </p>
                <p className="mt-1 text-xs font-medium text-[#8C3B71]">
                  {modeNote}
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useId } from 'react';
import type { ModinoMood } from '../utils/modinoReactions';

interface ModinoAvatarSvgProps {
  mood: ModinoMood;
  tapRippleKey: number;
  paused?: boolean;
}

export function ModinoAvatarSvg({ mood, tapRippleKey, paused = false }: ModinoAvatarSvgProps) {
  const uid = useId().replace(/:/g, '');
  const bodyGradId = `modino-body-${uid}`;
  const earGradId = `modino-ear-${uid}`;
  const bellyGradId = `modino-belly-${uid}`;
  const bowGradId = `modino-bow-${uid}`;

  const isSleep = mood === 'sleepy_zzz';
  const isJump = mood === 'jump';
  const isGreeting = mood === 'greeting';
  const isHappy = mood === 'happy_smile';
  const isLaugh = mood === 'laugh';
  const isSurprised = mood === 'surprised';
  const isShy = mood === 'shy_blush';
  const isKiss = mood === 'kiss';
  const isEw = mood === 'ew_cringe';
  const isIdle = mood === 'idle';

  const bodyAnimClass = paused
    ? ''
    : isSleep
      ? 'animate-modino-sleep'
      : isJump
        ? 'animate-modino-jump'
        : isGreeting
          ? 'animate-modino-greeting'
          : isHappy
            ? 'animate-modino-happy'
            : isSurprised
              ? 'animate-modino-surprised'
              : isLaugh
                ? 'animate-modino-laugh'
                : isShy
                  ? 'animate-modino-shy'
                  : isKiss
                    ? 'animate-modino-kiss'
                    : isEw
                      ? 'animate-modino-ew'
                      : 'animate-modino-idle';

  const shadowAnimClass = paused
    ? ''
    : isJump || isGreeting || isSurprised
      ? 'animate-modino-shadow-jump'
      : isSleep
        ? 'animate-modino-shadow-sleep'
        : 'animate-modino-shadow-idle';

  const leftEarClass = paused
    ? ''
    : isSleep
      ? 'modino-ear-left-sleep'
      : isSurprised
        ? 'modino-ear-left-perk'
        : isJump || isGreeting
          ? 'animate-modino-ear-left-flop'
          : 'animate-modino-ear-left-idle';

  const rightEarClass = paused
    ? ''
    : isSleep
      ? 'modino-ear-right-sleep'
      : isSurprised
        ? 'modino-ear-right-perk'
        : isJump || isGreeting
          ? 'animate-modino-ear-right-flop'
          : 'animate-modino-ear-right-idle';

  const leftArmClass = paused
    ? ''
    : isShy
      ? 'modino-arm-left-shy'
      : isJump || isLaugh
        ? 'modino-arm-left-cheer'
        : '';

  const rightArmClass = paused
    ? ''
    : isGreeting || isKiss
      ? 'animate-modino-arm-wave'
      : isShy
        ? 'modino-arm-right-shy'
        : isJump || isLaugh
          ? 'modino-arm-right-cheer'
          : '';

  const showNormalEyes = isIdle || isJump;
  const showHappyEyes = isHappy || isGreeting;
  const showLaughEyes = isLaugh;
  const showSurprisedEyes = isSurprised;
  const showShyEyes = isShy;
  const showKissEyes = isKiss;
  const showEwEyes = isEw;
  const showSleepEyes = isSleep;

  const showSmileMouth = isIdle || isGreeting || isHappy || isShy || isJump;
  const showLaughMouth = isLaugh;
  const showSurprisedMouth = isSurprised;
  const showKissMouth = isKiss;
  const showEwMouth = isEw;
  const showSleepMouth = isSleep;

  const blushFill = isShy || isKiss ? 'rgba(235, 92, 145, 0.78)' : 'rgba(240, 128, 168, 0.42)';
  const blushRx = isShy || isKiss ? 9.2 : 7.4;
  const blushRy = isShy || isKiss ? 5.6 : 4.2;

  return (
    <svg
      viewBox="0 0 120 120"
      width="68"
      height="68"
      overflow="visible"
      aria-hidden="true"
      className="block h-[68px] w-[68px] overflow-visible select-none"
    >
      <defs>
        <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="68%" stopColor="#FFF4F8" />
          <stop offset="100%" stopColor="#FFEBF3" />
        </linearGradient>
        <linearGradient id={earGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E6DCFA" />
          <stop offset="100%" stopColor="#D1C1F2" />
        </linearGradient>
        <radialGradient id={bellyGradId} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFF9F0" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFF0E4" stopOpacity="0.15" />
        </radialGradient>
        <linearGradient id={bowGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF1C2" />
          <stop offset="52%" stopColor="#FCE5A6" />
          <stop offset="100%" stopColor="#E6B85C" />
        </linearGradient>
      </defs>

      {/* Layer 10: Subtle tap ripple ring behind Modino */}
      {tapRippleKey > 0 && !paused && (
        <circle
          key={tapRippleKey}
          cx="60"
          cy="68"
          r="34"
          fill="none"
          stroke="rgba(217, 75, 125, 0.42)"
          strokeWidth="2.5"
          className="animate-modino-tap-ripple"
          style={{ transformOrigin: '60px 68px' }}
        />
      )}

      {/* Layer 1: Soft rose ground shadow (shrinks on jump) */}
      <ellipse
        data-layer="groundShadow"
        cx="60"
        cy="107"
        rx="28"
        ry="6.5"
        fill="rgba(166, 58, 98, 0.16)"
        className={shadowAnimClass}
        style={{ transformOrigin: '60px 107px' }}
      />

      {/* Main animated character rig pivoted cleanly at bottom-center (60px 104px) */}
      <g
        data-layer="characterRig"
        className={bodyAnimClass}
        style={{ transformOrigin: '60px 104px' }}
      >
        {/* Layer 2: Floppy Pastel Lilac Ears pivoted at ear roots */}
        <g data-layer="backEars">
          <g className={leftEarClass} style={{ transformOrigin: '42px 39px' }}>
            <ellipse
              cx="34"
              cy="25"
              rx="11.5"
              ry="20"
              transform="rotate(-22 34 25)"
              fill={`url(#${earGradId})`}
            />
            <ellipse
              cx="34.5"
              cy="26"
              rx="6"
              ry="12.5"
              transform="rotate(-22 34.5 26)"
              fill="#F9C6DA"
              opacity="0.88"
            />
          </g>

          <g className={rightEarClass} style={{ transformOrigin: '78px 39px' }}>
            <ellipse
              cx="86"
              cy="25"
              rx="11.5"
              ry="20"
              transform="rotate(22 86 25)"
              fill={`url(#${earGradId})`}
            />
            <ellipse
              cx="85.5"
              cy="26"
              rx="6"
              ry="12.5"
              transform="rotate(22 85.5 26)"
              fill="#F9C6DA"
              opacity="0.88"
            />
          </g>
        </g>

        {/* Layer 3: Squishy Marshmallow Teardrop Torso + Soft Peach Belly Highlight */}
        <g data-layer="squishBody">
          <path
            d="M60 32 C84 32 96 50 96 74 C96 95 82 104 60 104 C38 104 24 95 24 74 C24 50 36 32 60 32 Z"
            fill={`url(#${bodyGradId})`}
            filter="drop-shadow(0 4px 10px rgba(176, 62, 106, 0.14))"
          />
          {/* Subtle top-head rim shine */}
          <ellipse cx="52" cy="41" rx="14" ry="5.5" fill="#FFFFFF" opacity="0.72" />
          {/* Soft peach belly patch */}
          <ellipse cx="60" cy="87" rx="20" ry="13" fill={`url(#${bellyGradId})`} />

          {/* Mini Buttercream-Gold Bow / Sparkle Pin perched gently near right ear */}
          <g transform="translate(77 35) rotate(14)">
            <ellipse cx="-6.5" cy="0" rx="6.2" ry="4.4" fill={`url(#${bowGradId})`} />
            <ellipse cx="6.5" cy="0" rx="6.2" ry="4.4" fill={`url(#${bowGradId})`} />
            <circle cx="0" cy="0" r="3.4" fill="#F2C86B" />
            <circle cx="-1" cy="-1" r="1.1" fill="#FFFDF9" opacity="0.9" />
          </g>
        </g>

        {/* Layer 4: Stubby Rounded Paws pivoted at shoulders */}
        <g
          data-layer="leftArm"
          className={leftArmClass}
          style={{ transformOrigin: '31px 76px' }}
        >
          <ellipse
            cx="26"
            cy="79"
            rx="8.5"
            ry="6.2"
            transform="rotate(24 26 79)"
            fill="#FFF3F8"
          />
          <ellipse
            cx="25"
            cy="78"
            rx="4.2"
            ry="2.6"
            transform="rotate(24 25 78)"
            fill="#FFFFFF"
            opacity="0.65"
          />
        </g>

        <g
          data-layer="rightArm"
          className={rightArmClass}
          style={{ transformOrigin: '89px 76px' }}
        >
          <ellipse
            cx="94"
            cy="79"
            rx="8.5"
            ry="6.2"
            transform="rotate(-24 94 79)"
            fill="#FFF3F8"
          />
          <ellipse
            cx="95"
            cy="78"
            rx="4.2"
            ry="2.6"
            transform="rotate(-24 95 78)"
            fill="#FFFFFF"
            opacity="0.65"
          />
        </g>

        {/* Layer 5: Dual Petal Rose Blush Cheeks + Optional Shy Lines (///) */}
        <g data-layer="blushCheeks" className="transition-opacity duration-200">
          <ellipse cx="38" cy="73" rx={blushRx} ry={blushRy} fill={blushFill} />
          <ellipse cx="82" cy="73" rx={blushRx} ry={blushRy} fill={blushFill} />

          <g
            stroke="rgba(217, 75, 125, 0.72)"
            strokeWidth="1.35"
            strokeLinecap="round"
            opacity={isShy || isKiss ? 1 : 0}
            className="transition-opacity duration-200"
          >
            <line x1="33.5" y1="75" x2="36" y2="71.2" />
            <line x1="37" y1="75.2" x2="39.5" y2="71.4" />
            <line x1="40.5" y1="75" x2="43" y2="71.2" />

            <line x1="77" y1="75" x2="79.5" y2="71.2" />
            <line x1="80.5" y1="75.2" x2="83" y2="71.4" />
            <line x1="84" y1="75" x2="86.5" y2="71.2" />
          </g>
        </g>

        {/* Layer 6: 8 Crisp Eye Groups crossfaded cleanly via opacity */}
        <g data-layer="eyeLayer">
          {/* eyes_normal (with periodic 3.8s blink) */}
          <g
            opacity={showNormalEyes ? 1 : 0}
            className={showNormalEyes && !paused ? 'animate-modino-blink' : ''}
            style={{ transformOrigin: '60px 63px' }}
          >
            <ellipse cx="46" cy="63" rx="4.4" ry="5.2" fill="#3A1233" />
            <circle cx="47.4" cy="61.2" r="1.5" fill="#FFFFFF" />
            <circle cx="44.8" cy="64.6" r="0.8" fill="#FFFFFF" opacity="0.7" />

            <ellipse cx="74" cy="63" rx="4.4" ry="5.2" fill="#3A1233" />
            <circle cx="75.4" cy="61.2" r="1.5" fill="#FFFFFF" />
            <circle cx="72.8" cy="64.6" r="0.8" fill="#FFFFFF" opacity="0.7" />
          </g>

          {/* eyes_happy (^ ^) */}
          <g
            opacity={showHappyEyes ? 1 : 0}
            fill="none"
            stroke="#3A1233"
            strokeWidth="2.6"
            strokeLinecap="round"
          >
            <path d="M40.5 64.5 Q46 57.5 51.5 64.5" />
            <path d="M68.5 64.5 Q74 57.5 79.5 64.5" />
          </g>

          {/* eyes_laugh (> <) */}
          <g
            opacity={showLaughEyes ? 1 : 0}
            fill="none"
            stroke="#3A1233"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M40.5 59.5 L49.5 63.5 L40.5 67.5" />
            <path d="M79.5 59.5 L70.5 63.5 L79.5 67.5" />
          </g>

          {/* eyes_surprised (wide sparkling O O) */}
          <g opacity={showSurprisedEyes ? 1 : 0}>
            <circle cx="46" cy="62.5" r="5.6" fill="#3A1233" />
            <circle cx="47.8" cy="60.5" r="1.8" fill="#FFFFFF" />
            <circle cx="44.3" cy="64.4" r="1" fill="#FCE5A6" />

            <circle cx="74" cy="62.5" r="5.6" fill="#3A1233" />
            <circle cx="75.8" cy="60.5" r="1.8" fill="#FFFFFF" />
            <circle cx="72.3" cy="64.4" r="1" fill="#FCE5A6" />
          </g>

          {/* eyes_shy (averted glossy puppy eyes) */}
          <g opacity={showShyEyes ? 1 : 0}>
            <ellipse cx="47.5" cy="64" rx="4.4" ry="4.9" fill="#3A1233" />
            <circle cx="49" cy="62.5" r="1.6" fill="#FFFFFF" />
            <circle cx="46.2" cy="65.6" r="0.9" fill="#FFFFFF" opacity="0.8" />

            <ellipse cx="75.5" cy="64" rx="4.4" ry="4.9" fill="#3A1233" />
            <circle cx="77" cy="62.5" r="1.6" fill="#FFFFFF" />
            <circle cx="74.2" cy="65.6" r="0.9" fill="#FFFFFF" opacity="0.8" />
          </g>

          {/* eyes_kiss (playful wink: curved ^ + bright sparkly eye) */}
          <g opacity={showKissEyes ? 1 : 0}>
            <path
              d="M40.5 64 Q46 58 51.5 64"
              fill="none"
              stroke="#3A1233"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <ellipse cx="74" cy="63" rx="4.6" ry="5.3" fill="#3A1233" />
            <circle cx="75.5" cy="61.2" r="1.7" fill="#FFFFFF" />
            <circle cx="72.6" cy="64.8" r="0.9" fill="#FCE5A6" />
          </g>

          {/* eyes_ew (scrunched unimpressed/cringe eyes) */}
          <g
            opacity={showEwEyes ? 1 : 0}
            fill="none"
            stroke="#3A1233"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M40.5 61 L51 64.5" />
            <path d="M41.5 66.5 L50.5 64.5" />
            <path d="M79.5 61 L69 64.5" />
            <path d="M78.5 66.5 L69.5 64.5" />
          </g>

          {/* eyes_sleep (peaceful downward u u) */}
          <g
            opacity={showSleepEyes ? 1 : 0}
            fill="none"
            stroke="#593353"
            strokeWidth="2.3"
            strokeLinecap="round"
          >
            <path d="M41 64 Q46 68.8 51 64" />
            <path d="M69 64 Q74 68.8 79 64" />
          </g>
        </g>

        {/* Layer 7: 6 Clean Mouth Expressions synced to mood */}
        <g data-layer="mouthLayer">
          {/* mouth_smile (cute tiny w cat-smile) */}
          <path
            d="M54.5 72 Q57.2 75.5 60 72.6 Q62.8 75.5 65.5 72"
            fill="none"
            stroke="#3A1233"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={showSmileMouth ? 1 : 0}
          />

          {/* mouth_open_laugh (happy open D grin with soft rose tongue tint) */}
          <g opacity={showLaughMouth ? 1 : 0}>
            <path
              d="M53.5 71 Q60 82.5 66.5 71 Z"
              fill="#3A1233"
              stroke="#3A1233"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <ellipse cx="60" cy="76.5" rx="3.4" ry="2.2" fill="#F28BB1" />
          </g>

          {/* mouth_o_surprise (tiny cute round o) */}
          <ellipse
            cx="60"
            cy="74"
            rx="3.3"
            ry="4"
            fill="#F4A0BD"
            stroke="#3A1233"
            strokeWidth="1.8"
            opacity={showSurprisedMouth ? 1 : 0}
          />

          {/* mouth_kiss (cute tiny 3 pucker mouth) */}
          <path
            d="M58 70.5 Q62.5 72 59.5 74 Q62.5 76 58 77.5"
            fill="none"
            stroke="#C93B6B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={showKissMouth ? 1 : 0}
          />

          {/* mouth_ew (wavy squiggle cringe mouth) */}
          <path
            d="M53 74.5 Q55.5 71.5 58 74.5 Q60.5 77.5 63 74.5 Q65.5 71.5 67.5 74.5"
            fill="none"
            stroke="#3A1233"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity={showEwMouth ? 1 : 0}
          />

          {/* mouth_sleep (tiny peaceful resting dot / soft breathing o) */}
          <ellipse
            cx="60"
            cy="74"
            rx="2.3"
            ry="1.8"
            fill="#9E6287"
            opacity={showSleepMouth ? 0.85 : 0}
          />
        </g>
      </g>

      {/* Layer 8: Mood-driven floating SVG prop particles */}
      <g data-layer="propParticles">
        {/* kiss mode: 2 pastel blush-rose kiss hearts + soft sparkle puff */}
        {isKiss && !paused && (
          <g>
            <path
              d="M25 60 C25 57.5 22 56.5 20.5 58.5 C19 56.5 16 57.5 16 60 C16 63 20.5 66 20.5 66 C20.5 66 25 63 25 60 Z"
              fill="#EA6594"
              className="animate-modino-kiss-heart-a"
            />
            <path
              d="M16 49 C16 47.2 13.8 46.5 12.7 48 C11.6 46.5 9.4 47.2 9.4 49 C9.4 51.2 12.7 53.4 12.7 53.4 C12.7 53.4 16 51.2 16 49 Z"
              fill="#F7A7C4"
              className="animate-modino-kiss-heart-b"
            />
            <circle cx="29" cy="53" r="2.2" fill="#FCE5A6" className="animate-modino-sparkle" />
          </g>
        )}

        {/* surprised mode: crisp rose-berry & gold ! + ? pop badge */}
        {isSurprised && (
          <g className={paused ? '' : 'animate-modino-badge-pop'} style={{ transformOrigin: '96px 26px' }}>
            <text
              x="92"
              y="28"
              fill="#D94B7D"
              fontSize="16"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              !
            </text>
            <text
              x="100"
              y="22"
              fill="#E6B85C"
              fontSize="13"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              ?
            </text>
          </g>
        )}

        {/* happy / greeting / jump mode: 3 delicate champagne-gold 4-point sparkles */}
        {(isHappy || isGreeting || isJump) && !paused && (
          <g>
            <path
              d="M16 32 L17.6 36 L21.6 37.6 L17.6 39.2 L16 43.2 L14.4 39.2 L10.4 37.6 L14.4 36 Z"
              fill="#E6B85C"
              className="animate-modino-sparkle"
            />
            <path
              d="M104 30 L105.4 33.4 L108.8 34.8 L105.4 36.2 L104 39.6 L102.6 36.2 L99.2 34.8 L102.6 33.4 Z"
              fill="#F08CB0"
              className="animate-modino-sparkle-delay"
            />
            <path
              d="M60 8 L61.3 11.2 L64.5 12.5 L61.3 13.8 L60 17 L58.7 13.8 L55.5 12.5 L58.7 11.2 Z"
              fill="#FCE5A6"
              className="animate-modino-sparkle"
            />
          </g>
        )}

        {/* sleepy_zzz mode: 3 staggered floating pastel lilac/plum z Z z letters */}
        {isSleep && (
          <g
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="700"
            fill="#8D6AA8"
          >
            <text
              x="84"
              y="38"
              fontSize="11"
              className={paused ? '' : 'animate-modino-zzz-1'}
            >
              z
            </text>
            <text
              x="94"
              y="26"
              fontSize="14"
              fill="#6D4B8C"
              className={paused ? '' : 'animate-modino-zzz-2'}
            >
              Z
            </text>
            <text
              x="104"
              y="14"
              fontSize="11"
              className={paused ? '' : 'animate-modino-zzz-3'}
            >
              z
            </text>
          </g>
        )}

        {/* ew_cringe mode: tiny comic pastel sweat-drop gliding gently down temple */}
        {isEw && (
          <path
            d="M84 48 C84 48 88 54 88 57 C88 59.3 86.2 61 84 61 C81.8 61 80 59.3 80 57 C80 54 84 48 84 48 Z"
            fill="#BEE4F7"
            className={paused ? '' : 'animate-modino-sweat'}
          />
        )}
      </g>
    </svg>
  );
}

import type { SVGProps } from 'react';

export function SparkleStarSvg({
  className = 'w-6 h-6',
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        d="M20 3C21.2 13.4 26.6 18.8 37 20C26.6 21.2 21.2 26.6 20 37C18.8 26.6 13.4 21.2 3 20C13.4 18.8 18.8 13.4 20 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function RibbonSquiggleSvg({ className = 'w-28 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 14C16 4 28 22 40 12C52 2 64 22 76 12C88 2 100 22 112 12C122 4 130 14 136 10"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WavyDivider({
  fill = '#3B1535',
  flip = false,
}: {
  fill?: string;
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden leading-none select-none ${flip ? 'rotate-180' : ''}`}
    >
      <svg
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        className="block h-10 w-full sm:h-14 md:h-16"
      >
        <path
          d="M0,36 C180,74 360,2 540,36 C720,70 900,4 1080,36 C1260,68 1350,22 1440,36 L1440,72 L0,72 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

export function PolaroidCameraDoodle({ className = 'w-24 h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 130" fill="none" aria-hidden="true" className={className}>
      {/* Sparkles around camera */}
      <path d="M22 24L24.5 31L31.5 33.5L24.5 36L22 43L19.5 36L12.5 33.5L19.5 31L22 24Z" fill="#E669A5" />
      <path d="M120 22L122 28L128 30L122 32L120 38L118 32L112 30L118 28L120 22Z" fill="#9A7CE8" />
      {/* Camera body */}
      <rect x="24" y="42" width="92" height="66" rx="16" fill="#FFFDF8" stroke="#3B1535" strokeWidth="3" />
      {/* Pastel pink top band */}
      <path d="M25.5 58C25.5 49.5 32.5 43.5 40 43.5H100C107.5 43.5 114.5 49.5 114.5 58V63H25.5V58Z" fill="#FFE4F0" />
      {/* Viewfinder & flash */}
      <rect x="38" y="34" width="22" height="9" rx="4" fill="#FFE898" stroke="#3B1535" strokeWidth="2.6" />
      <circle cx="98" cy="54" r="5" fill="#EBE3FF" stroke="#3B1535" strokeWidth="2.2" />
      {/* Lens */}
      <circle cx="70" cy="77" r="20" fill="#EBE3FF" stroke="#3B1535" strokeWidth="3" />
      <circle cx="70" cy="77" r="11" fill="#FFE4F0" stroke="#3B1535" strokeWidth="2.4" />
      <circle cx="66" cy="73" r="3" fill="#FFFDF8" />
      {/* Little cute ribbon bow on top right */}
      <path
        d="M99 41C92 34 86 38 89 43C92 46 97 43 99 41ZM99 41C106 34 112 38 109 43C106 46 101 43 99 41Z"
        fill="#FF9FCA"
        stroke="#3B1535"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Card 1: Ribbon / Crown SVG ("Daughter Morgan") */
export function RibbonCrownDoodle({ className = 'w-32 h-32' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 160" fill="none" aria-hidden="true" className={className}>
      <circle cx="90" cy="86" r="56" fill="#FFFDF8" fillOpacity="0.7" />
      {/* Cute Princess Crown */}
      <path
        d="M42 106L32 58L66 80L90 42L114 80L148 58L138 106H42Z"
        fill="#FFE898"
        stroke="#3B1535"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="40" y="106" width="100" height="16" rx="6" fill="#FFB5D8" stroke="#3B1535" strokeWidth="2.8" />
      <circle cx="32" cy="53" r="5.5" fill="#FFFDF8" stroke="#3B1535" strokeWidth="2.4" />
      <circle cx="90" cy="36" r="6.5" fill="#FF8FC2" stroke="#3B1535" strokeWidth="2.4" />
      <circle cx="148" cy="53" r="5.5" fill="#FFFDF8" stroke="#3B1535" strokeWidth="2.4" />
      {/* Coquette Ribbon Bow below crown */}
      <path
        d="M90 124C74 114 60 122 65 133C70 142 84 134 90 124ZM90 124C106 114 120 122 115 133C110 142 96 134 90 124Z"
        fill="#D6C2FF"
        stroke="#3B1535"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M84 129L74 148M96 129L106 148" stroke="#3B1535" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="90" cy="126" r="5" fill="#FFE898" stroke="#3B1535" strokeWidth="2.4" />
      {/* Sparkle */}
      <path d="M144 26L146.5 33L153.5 35.5L146.5 38L144 45L141.5 38L134.5 35.5L141.5 33L144 26Z" fill="#E04D92" />
    </svg>
  );
}

/* Card 2: Ruler / Sparkle SVG ("Certified Bauni") */
export function RulerSparkleDoodle({ className = 'w-32 h-32' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 160" fill="none" aria-hidden="true" className={className}>
      <circle cx="90" cy="84" r="56" fill="#FFFDF8" fillOpacity="0.72" />
      {/* Tilted cute pastel ruler */}
      <g transform="rotate(-14 90 84)">
        <rect x="64" y="24" width="52" height="120" rx="12" fill="#FFE898" stroke="#3B1535" strokeWidth="3" />
        {/* Tick marks */}
        <line x1="65" y1="42" x2="86" y2="42" stroke="#3B1535" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="65" y1="56" x2="78" y2="56" stroke="#3B1535" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="65" y1="70" x2="86" y2="70" stroke="#3B1535" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="65" y1="84" x2="78" y2="84" stroke="#3B1535" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="65" y1="98" x2="86" y2="98" stroke="#3B1535" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="65" y1="112" x2="78" y2="112" stroke="#3B1535" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="65" y1="126" x2="86" y2="126" stroke="#3B1535" strokeWidth="2.6" strokeLinecap="round" />
        {/* Cute tiny star sticker on ruler */}
        <circle cx="100" cy="118" r="8" fill="#FFE4F0" stroke="#3B1535" strokeWidth="2" />
      </g>
      {/* Sparkles popping around */}
      <path d="M36 48L39.5 58L49.5 61.5L39.5 65L36 75L32.5 65L22.5 61.5L32.5 58L36 48Z" fill="#E04D92" />
      <path d="M144 46L146.5 54L154.5 56.5L146.5 59L144 67L141.5 59L133.5 56.5L141.5 54L144 46Z" fill="#9A7CE8" />
      <path d="M142 114L144 120L150 122L144 124L142 130L140 124L134 122L140 120L142 114Z" fill="#E04D92" />
    </svg>
  );
}

/* Card 3: Rainbow / Sunglasses SVG ("Lesbian Daughter") */
export function RainbowShadesDoodle({ className = 'w-32 h-32' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 160" fill="none" aria-hidden="true" className={className}>
      {/* Pastel Sunset Rainbow Arch */}
      <path d="M30 96C30 58 57 32 90 32C123 32 150 58 150 96" stroke="#FF8FC2" strokeWidth="10" strokeLinecap="round" />
      <path d="M42 96C42 65 64 44 90 44C116 44 138 65 138 96" stroke="#FFBFA0" strokeWidth="10" strokeLinecap="round" />
      <path d="M54 96C54 72 70 56 90 56C110 56 126 72 126 96" stroke="#FFE898" strokeWidth="10" strokeLinecap="round" />
      <path d="M66 96C66 79 77 68 90 68C103 68 114 79 114 96" stroke="#D1BAFF" strokeWidth="10" strokeLinecap="round" />

      {/* Cool Sassy Sunglasses */}
      <g transform="translate(0, 14)">
        <path
          d="M28 84H78L73 112C71 120 63 125 53 125C41 125 32 118 30 108L28 84Z"
          fill="#3B1535"
          stroke="#3B1535"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M102 84H152L150 108C148 118 139 125 127 125C117 125 109 120 107 112L102 84Z"
          fill="#3B1535"
          stroke="#3B1535"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Frame bridge & rim */}
        <path d="M24 84H156" stroke="#3B1535" strokeWidth="5" strokeLinecap="round" />
        <path d="M77 92C83 87 97 87 103 92" stroke="#3B1535" strokeWidth="4" strokeLinecap="round" />
        {/* Sassy glint lines on lenses */}
        <path d="M42 94L52 112M54 94L60 104" stroke="#FFE4F0" strokeWidth="3" strokeLinecap="round" />
        <path d="M116 94L126 112M128 94L134 104" stroke="#FFE898" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* Card 4: Trophy SVG ("Greatest HG") */
export function TrophyDoodle({ className = 'w-32 h-32' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 160" fill="none" aria-hidden="true" className={className}>
      <circle cx="90" cy="82" r="56" fill="#FFFDF8" fillOpacity="0.72" />
      {/* Handles */}
      <path d="M56 54C36 54 34 86 58 90" stroke="#3B1535" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M124 54C144 54 146 86 122 90" stroke="#3B1535" strokeWidth="3.2" strokeLinecap="round" />
      {/* Cup */}
      <path
        d="M54 42H126V74C126 95 110 110 90 110C70 110 54 95 54 74V42Z"
        fill="#FFE898"
        stroke="#3B1535"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Stem & Pedestal */}
      <rect x="82" y="110" width="16" height="18" fill="#F4C753" stroke="#3B1535" strokeWidth="2.8" />
      <rect x="60" y="128" width="60" height="14" rx="5" fill="#FFB5D8" stroke="#3B1535" strokeWidth="2.8" />
      {/* #1 Star inside cup */}
      <path
        d="M90 56L94.5 66.5L106 67.5L97 75L100 86.5L90 80.5L80 86.5L83 75L74 67.5L85.5 66.5L90 56Z"
        fill="#FFFDF8"
        stroke="#3B1535"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Sparkles */}
      <path d="M36 32L38.5 39L45.5 41.5L38.5 44L36 51L33.5 44L26.5 41.5L33.5 39L36 32Z" fill="#E04D92" />
      <path d="M146 30L148 36L154 38L148 40L146 46L144 40L138 38L144 36L146 30Z" fill="#9A7CE8" />
    </svg>
  );
}

/* Section 6: Soft Illustrated Pastel Gift Box SVG (Matches Bakery Cake — Zero Thick Black Strokes) */
export function WrappedGiftBoxSvg({ className = 'w-44 h-44' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 210" fill="none" aria-hidden="true" className={className}>
      <defs>
        {/* Warm grounded contact shadow */}
        <radialGradient id="giftGroundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6B3258" stopOpacity="0.2" />
          <stop offset="65%" stopColor="#6B3258" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#6B3258" stopOpacity="0" />
        </radialGradient>

        {/* Plush blush-pink box base shading */}
        <linearGradient id="giftBoxBase" x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0%" stopColor="#FAD0E2" />
          <stop offset="26%" stopColor="#FFEBF3" />
          <stop offset="68%" stopColor="#FFE1EE" />
          <stop offset="100%" stopColor="#F5BDD5" />
        </linearGradient>

        {/* Plush pastel lid shading */}
        <linearGradient id="giftLidFill" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#F8C8DD" />
          <stop offset="28%" stopColor="#FFF2F7" />
          <stop offset="72%" stopColor="#FDE5F0" />
          <stop offset="100%" stopColor="#F3B8D3" />
        </linearGradient>

        {/* Satin cream-gold vertical ribbon */}
        <linearGradient id="giftRibbonGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F0CE89" />
          <stop offset="32%" stopColor="#FFF6DC" />
          <stop offset="68%" stopColor="#FAE6B5" />
          <stop offset="100%" stopColor="#E6BD74" />
        </linearGradient>

        {/* Soft lilac satin accent ribbon */}
        <linearGradient id="giftRibbonLilac" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2E7FF" />
          <stop offset="55%" stopColor="#DEC8FA" />
          <stop offset="100%" stopColor="#C9AEEB" />
        </linearGradient>

        {/* Soft layered pastel bow loop gradient */}
        <linearGradient id="giftBowLoop" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FFF8E2" />
          <stop offset="52%" stopColor="#F9DF9F" />
          <stop offset="100%" stopColor="#E9C074" />
        </linearGradient>

        {/* Warm blush-rose center bow knot */}
        <radialGradient id="giftBowKnot" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFD9E8" />
          <stop offset="58%" stopColor="#F39CC0" />
          <stop offset="100%" stopColor="#DB729E" />
        </radialGradient>
      </defs>

      {/* Soft Grounded Shadow Ellipse */}
      <ellipse cx="110" cy="190" rx="76" ry="11" fill="url(#giftGroundShadow)" />

      {/* Gift Box Base */}
      <rect x="44" y="88" width="132" height="98" rx="16" fill="url(#giftBoxBase)" />

      {/* Soft underside shading along bottom curve */}
      <path
        d="M44 166C44 177 51 186 60 186H160C169 186 176 177 176 166V171C176 179.3 169.3 186 161 186H59C50.7 186 44 179.3 44 171V166Z"
        fill="#D88AB0"
        fillOpacity="0.24"
      />

      {/* Soft studio light highlight on left front */}
      <rect x="54" y="102" width="13" height="72" rx="6.5" fill="#FFFFFF" fillOpacity="0.48" />

      {/* Delicate pearl dots on box */}
      <circle cx="72" cy="120" r="4" fill="#FFFDF8" fillOpacity="0.85" />
      <circle cx="80" cy="154" r="3.4" fill="#F6D893" fillOpacity="0.85" />
      <circle cx="150" cy="122" r="3.8" fill="#F6D893" fillOpacity="0.85" />
      <circle cx="142" cy="156" r="4" fill="#FFFDF8" fillOpacity="0.85" />
      <circle cx="64" cy="166" r="2.6" fill="#DEC8FA" fillOpacity="0.75" />
      <circle cx="156" cy="142" r="2.6" fill="#DEC8FA" fillOpacity="0.75" />

      {/* Vertical Cream-Gold & Lilac Satin Ribbon on Box */}
      <rect x="94" y="88" width="32" height="98" fill="url(#giftRibbonLilac)" fillOpacity="0.7" />
      <rect x="97.5" y="88" width="25" height="98" fill="url(#giftRibbonGold)" />
      <rect x="103" y="92" width="4.5" height="90" rx="2.2" fill="#FFFFFF" fillOpacity="0.45" />

      {/* Soft Cast Shadow of Lid Overhang onto Box Base */}
      <rect x="44" y="91" width="132" height="10" fill="#B55B86" fillOpacity="0.16" />

      {/* Plush Pastel Gift Lid */}
      <rect x="34" y="60" width="152" height="34" rx="13" fill="url(#giftLidFill)" />
      {/* Lid top specular rim highlight */}
      <path
        d="M48 66H172"
        stroke="#FFFFFF"
        strokeOpacity="0.72"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Subtle underside lip shading on lid */}
      <path
        d="M36 86C38 91 42 94 47 94H173C178 94 182 91 184 86C181 89 177 90.5 172 90.5H48C43 90.5 39 89 36 86Z"
        fill="#D683AB"
        fillOpacity="0.24"
      />

      {/* Lid Satin Ribbon Center Band */}
      <rect x="92.5" y="60" width="35" height="34" rx="3" fill="url(#giftRibbonLilac)" fillOpacity="0.72" />
      <rect x="96.5" y="60" width="27" height="34" rx="2" fill="url(#giftRibbonGold)" />
      <rect x="102.5" y="63" width="4.5" height="28" rx="2.2" fill="#FFFFFF" fillOpacity="0.5" />

      {/* Soft Cast Shadow Beneath Bow */}
      <ellipse cx="110" cy="63" rx="38" ry="5.5" fill="#B86B92" fillOpacity="0.18" />

      {/* Soft Lilac Satin Bow Tails Tucked Behind Loops */}
      <path
        d="M104 59C90 67 78 74 71 81C77 83 84 81 91 77C98 72 103 66 108 61Z"
        fill="url(#giftRibbonLilac)"
      />
      <path
        d="M116 59C130 67 142 74 149 81C143 83 136 81 129 77C122 72 117 66 112 61Z"
        fill="url(#giftRibbonLilac)"
      />

      {/* Plush Layered Left & Right Satin Bow Loops */}
      <path
        d="M109 59C84 26 52 34 59 54C64 68 92 64 109 59Z"
        fill="url(#giftBowLoop)"
      />
      <path
        d="M105 58C88 42 70 44 73 53C76 60 91 59 105 58Z"
        fill="#DDA95E"
        fillOpacity="0.28"
      />
      <path
        d="M72 41C81 36 93 41 101 50"
        stroke="#FFFFFF"
        strokeOpacity="0.65"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <path
        d="M111 59C136 26 168 34 161 54C156 68 128 64 111 59Z"
        fill="url(#giftBowLoop)"
      />
      <path
        d="M115 58C132 42 150 44 147 53C144 60 129 59 115 58Z"
        fill="#DDA95E"
        fillOpacity="0.28"
      />
      <path
        d="M148 41C139 36 127 41 119 50"
        stroke="#FFFFFF"
        strokeOpacity="0.65"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Plump Rose-Blush Center Knot */}
      <rect x="98.5" y="47.5" width="23" height="21" rx="9.5" fill="url(#giftBowKnot)" />
      <ellipse cx="106.5" cy="53.5" rx="4.5" ry="2.2" fill="#FFFFFF" fillOpacity="0.52" />
    </svg>
  );
}

/* Bauni-Meter Scanner: Fingerprint + Sparkle Inline SVG */
export function FingerprintSparkleSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" className={className}>
      {/* Concentric stylized fingerprint ridges */}
      <path
        d="M25 56C24 41 34 26 48 26C62 26 72 41 71 56"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M32 63C31 46 37 33 48 33C59 33 65 46 64 62C63.5 68 61 73 57 77"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M39 68C38 52 41 40 48 40C55 40 58 51 57 63C56.5 70 53 76 48 80"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M46 72C45.5 60 46 48 48 48C50 48 51 56 50.5 65C50 71 47 76 42 79"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M22 46C22 29 33 18 48 18C63 18 74 29 74 46"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="6 6"
      />
      {/* Cute sparkle accents */}
      <path
        d="M78 14L80 20L86 22L80 24L78 30L76 24L70 22L76 20L78 14Z"
        fill="#E04D92"
      />
      <path
        d="M17 66L18.5 71L23.5 72.5L18.5 74L17 79L15.5 74L10.5 72.5L15.5 71L17 66Z"
        fill="#9A7CE8"
      />
    </svg>
  );
}

/* Official Adoption Certificate: Coquette Pastel Ribbon SVG */
export function CertificateRibbonSvg({ className = 'w-32 h-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 96" fill="none" aria-hidden="true" className={className}>
      {/* Ribbon tails */}
      <path
        d="M74 52L46 86L66 80L78 90L88 54"
        fill="#FFB5D8"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M106 52L134 86L114 80L102 90L92 54"
        fill="#FFB5D8"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Left bow loop */}
      <path
        d="M90 46C66 18 28 22 32 48C36 68 70 60 90 46Z"
        fill="#FFE4F0"
        stroke="#3B1535"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M82 46C64 34 46 37 47 47C48 56 66 53 82 46Z"
        fill="#FF9FCA"
      />
      {/* Right bow loop */}
      <path
        d="M90 46C114 18 152 22 148 48C144 68 110 60 90 46Z"
        fill="#FFE4F0"
        stroke="#3B1535"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M98 46C116 34 134 37 133 47C132 56 114 53 98 46Z"
        fill="#FF9FCA"
      />
      {/* Center knot */}
      <rect
        x="79"
        y="35"
        width="22"
        height="22"
        rx="9"
        fill="#FFE898"
        stroke="#3B1535"
        strokeWidth="3"
      />
      {/* Flanking sparkles */}
      <path d="M18 22L20.5 29L27.5 31.5L20.5 34L18 41L15.5 34L8.5 31.5L15.5 29L18 22Z" fill="#E04D92" />
      <path d="M162 22L164.5 29L171.5 31.5L164.5 34L162 41L159.5 34L152.5 31.5L159.5 29L162 22Z" fill="#9A7CE8" />
    </svg>
  );
}

/* Official Adoption Certificate: Glossy Pink Wax Seal Stamp SVG */
export function WaxSealStampSvg({ className = 'w-32 h-32' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="waxGlow" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF9AD0" />
          <stop offset="52%" stopColor="#E04390" />
          <stop offset="100%" stopColor="#A81F66" />
        </radialGradient>
        <radialGradient id="waxInner" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#F56AB1" />
          <stop offset="100%" stopColor="#B82470" />
        </radialGradient>
      </defs>

      {/* Organic melted wax outer silhouette */}
      <path
        d="M80 10C93 9 102 17 114 21C126 25 138 33 142 46C146 58 152 68 150 82C148 95 144 108 136 119C127 130 116 141 102 145C88 149 74 152 60 147C46 142 32 135 23 122C14 109 10 95 11 80C12 65 15 51 24 39C33 27 45 18 59 14C67 11 73 10 80 10Z"
        fill="url(#waxGlow)"
        stroke="#7C144A"
        strokeWidth="2.5"
      />
      {/* Raised inner wax rim */}
      <circle
        cx="80"
        cy="80"
        r="53"
        fill="url(#waxInner)"
        stroke="#FFC5E3"
        strokeWidth="2.5"
        strokeOpacity="0.7"
      />
      <circle
        cx="80"
        cy="80"
        r="46"
        fill="none"
        stroke="#FFE898"
        strokeWidth="1.8"
        strokeDasharray="4 4"
        strokeOpacity="0.9"
      />
      {/* Glossy highlight arc */}
      <path
        d="M42 54C49 39 63 30 80 29"
        stroke="#FFFDF8"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      {/* Mini crown at top of seal */}
      <path
        d="M68 58L65 46L74 52L80 43L86 52L95 46L92 58H68Z"
        fill="#FFE898"
      />
      {/* Embossed text inside wax seal */}
      <text
        x="80"
        y="79"
        textAnchor="middle"
        fill="#FFFDF8"
        fontSize="15.5"
        fontWeight="800"
        letterSpacing="1.4"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        APPROVED
      </text>
      <text
        x="80"
        y="97"
        textAnchor="middle"
        fill="#FFE898"
        fontSize="10.5"
        fontWeight="700"
        letterSpacing="0.8"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        MORGAN &middot; HG
      </text>
      {/* Cute tiny heart/star dot at bottom */}
      <path
        d="M80 106L81.6 110.4L86 112L81.6 113.6L80 118L78.4 113.6L74 112L78.4 110.4L80 106Z"
        fill="#FFE4F0"
      />
    </svg>
  );
}

/* Scratch Card 1: Chat + Coffee SVG Doodle */
export function CoffeeChatDoodleSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 96" fill="none" aria-hidden="true" className={className}>
      {/* Pastel chat bubble floating upper-right */}
      <path
        d="M58 14H94C99 14 103 18 103 23V41C103 46 99 50 94 50H74L64 58V50H58C53 50 49 46 49 41V23C49 18 53 14 58 14Z"
        fill="#EBE3FF"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <circle cx="67" cy="32" r="3" fill="#C2377E" />
      <circle cx="76" cy="32" r="3" fill="#9A7CE8" />
      <circle cx="85" cy="32" r="3" fill="#C2377E" />
      {/* Cute pastel coffee mug */}
      <path
        d="M16 42H54V68C54 78 46 86 35 86C24 86 16 78 16 68V42Z"
        fill="#FFE4F0"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M54 48H60C65 48 68 52 68 57C68 62 65 66 60 66H54"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Coffee sleeve heart & steam */}
      <rect x="20" y="54" width="30" height="16" rx="6" fill="#FFE898" stroke="#3B1535" strokeWidth="2.2" />
      <path d="M27 34C27 29 31 28 31 23" stroke="#C2377E" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38 34C38 29 42 28 42 23" stroke="#9A7CE8" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* Scratch Card 2: Cupcake / Sweet Treat SVG Doodle */
export function CupcakeTreatDoodleSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 96" fill="none" aria-hidden="true" className={className}>
      {/* Cupcake wrapper */}
      <path
        d="M28 54H84L76 84C75 87 72 88 69 88H43C40 88 37 87 36 84L28 54Z"
        fill="#FFE898"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path d="M43 55L46 87M56 55V87M69 55L66 87" stroke="#3B1535" strokeWidth="2" strokeOpacity="0.45" />
      {/* Swirly pastel pink frosting */}
      <path
        d="M24 54C22 44 30 37 38 37C41 26 51 20 56 20C61 20 71 26 74 37C82 37 90 44 88 54H24Z"
        fill="#FFB5D8"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Sprinkles */}
      <line x1="42" y1="42" x2="48" y2="46" stroke="#3B1535" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="65" y1="40" x2="71" y2="44" stroke="#9A7CE8" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="53" y1="35" x2="58" y2="39" stroke="#FFFDF8" strokeWidth="2.6" strokeLinecap="round" />
      {/* Cherry on top */}
      <circle cx="56" cy="18" r="7.5" fill="#E04D92" stroke="#3B1535" strokeWidth="2.5" />
      <path d="M59 12C63 7 69 7 72 10" stroke="#3B1535" strokeWidth="2.4" strokeLinecap="round" />
      {/* Sparkles */}
      <path d="M94 22L96 28L102 30L96 32L94 38L92 32L86 30L92 28L94 22Z" fill="#E04D92" />
      <path d="M18 26L19.5 31L24.5 32.5L19.5 34L18 39L16.5 34L11.5 32.5L16.5 31L18 26Z" fill="#9A7CE8" />
    </svg>
  );
}

/* Scratch Card 3: Sassy Crown & Sparkles SVG Doodle */
export function CrownSparkleDoodleSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 96" fill="none" aria-hidden="true" className={className}>
      <g transform="rotate(-5 56 50)">
        <path
          d="M22 68L16 32L40 48L56 22L72 48L96 32L90 68H22Z"
          fill="#FFE898"
          stroke="#3B1535"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="20" y="68" width="72" height="12" rx="5" fill="#FFB5D8" stroke="#3B1535" strokeWidth="2.8" />
        <circle cx="16" cy="27" r="4.5" fill="#EBE3FF" stroke="#3B1535" strokeWidth="2.2" />
        <circle cx="56" cy="16" r="5.5" fill="#FF8FC2" stroke="#3B1535" strokeWidth="2.2" />
        <circle cx="96" cy="27" r="4.5" fill="#EBE3FF" stroke="#3B1535" strokeWidth="2.2" />
      </g>
      <path d="M98 54L100 60L106 62L100 64L98 70L96 64L90 62L96 60L98 54Z" fill="#E04D92" />
      <path d="M14 58L15.5 63L20.5 64.5L15.5 66L14 71L12.5 66L7.5 64.5L12.5 63L14 58Z" fill="#9A7CE8" />
    </svg>
  );
}

/* Life Stats Hero Card: Pastel Hourglass Doodle SVG */
export function HourglassDoodleSvg({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 88" fill="none" aria-hidden="true" className={className}>
      <rect x="20" y="10" width="48" height="8" rx="4" fill="#FFB5D8" stroke="#3B1535" strokeWidth="2.6" />
      <rect x="20" y="70" width="48" height="8" rx="4" fill="#FFB5D8" stroke="#3B1535" strokeWidth="2.6" />
      <path
        d="M26 18C26 32 39 38 44 44C49 38 62 32 62 18H26Z"
        fill="#FFFDF8"
        stroke="#3B1535"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M26 70C26 56 39 50 44 44C49 50 62 56 62 70H26Z"
        fill="#FFFDF8"
        stroke="#3B1535"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Golden butter sand */}
      <path d="M33 26H55C53 33 47 38 44 41C41 38 35 33 33 26Z" fill="#FFE898" />
      <path d="M31 68C34 59 40 55 44 53C48 55 54 59 57 68H31Z" fill="#FFE898" />
      <line x1="44" y1="44" x2="44" y2="54" stroke="#F4B936" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M74 26L76 31L81 33L76 35L74 40L72 35L67 33L72 31L74 26Z" fill="#E04D92" />
    </svg>
  );
}

/* Life Stats Card 4: Pastel Full Moon Doodle SVG */
export function MoonPhaseDoodleSvg({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <circle cx="32" cy="32" r="20" fill="#FFE898" stroke="#3B1535" strokeWidth="2.6" />
      <circle cx="25" cy="26" r="4" fill="#F4C753" fillOpacity="0.65" />
      <circle cx="39" cy="37" r="5" fill="#F4C753" fillOpacity="0.55" />
      <circle cx="37" cy="23" r="2.5" fill="#F4C753" fillOpacity="0.65" />
      <path d="M54 10L55.5 14.5L60 16L55.5 17.5L54 22L52.5 17.5L48 16L52.5 14.5L54 10Z" fill="#9A7CE8" />
      <path d="M11 46L12.2 49.5L15.8 50.8L12.2 52L11 55.5L9.8 52L6.2 50.8L9.8 49.5L11 46Z" fill="#E04D92" />
    </svg>
  );
}

/* Minimalist Sparkle-Burst Icon for the Hero "Pop Confetti" Button */
export function SparkleBurstIconSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      {/* Main crisp 4-point sparkle */}
      <path
        d="M11 2.5L12.9 8.1L18.5 10L12.9 11.9L11 17.5L9.1 11.9L3.5 10L9.1 8.1L11 2.5Z"
        fill="currentColor"
      />
      {/* Secondary accent sparkle */}
      <path
        d="M18.5 14L19.4 16.6L22 17.5L19.4 18.4L18.5 21L17.6 18.4L15 17.5L17.6 16.6L18.5 14Z"
        fill="#FFF3C4"
      />
      {/* Minimal confetti flecks */}
      <circle cx="18.2" cy="5.4" r="1.4" fill="#FFE6F0" />
      <circle cx="5.2" cy="17.8" r="1.2" fill="#FFF3C4" />
    </svg>
  );
}

/* Crisp Minimalist Deep Plum / Rose Berry Confetti-Sparkle Icon for the Floating Button */
export function ConfettiSparkleMinimalSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      {/* Main Deep Plum 4-point sparkle */}
      <path
        d="M10.5 3L12.3 8.2L17.5 10L12.3 11.8L10.5 17L8.7 11.8L3.5 10L8.7 8.2L10.5 3Z"
        fill="#3A1233"
      />
      {/* Warm Rose Berry accent star */}
      <path
        d="M17.8 14L18.6 16.4L21 17.2L18.6 18L17.8 20.4L17 18L14.6 17.2L17 16.4L17.8 14Z"
        fill="#D94B7D"
      />
      {/* Tiny crisp celebratory dots */}
      <circle cx="18.4" cy="5.8" r="1.5" fill="#D94B7D" />
      <circle cx="5.2" cy="17.6" r="1.25" fill="#3A1233" fillOpacity="0.65" />
    </svg>
  );
}

/* Scratch Card 1: Bold Playful Tilted Comic-Sticker "LOL!" Inline SVG */
export function LolComicStickerSvg({ className = 'w-16 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 92" fill="none" aria-hidden="true" className={className}>
      {/* Soft tilted comic sticker starburst backing */}
      <g transform="rotate(-7 60 46)">
        <path
          d="M16 28L28 16L46 21L60 10L74 20L93 15L103 29L112 45L102 61L106 76L88 74L72 84L57 74L39 83L29 70L12 69L19 52L9 39L16 28Z"
          fill="#FFF3C4"
          stroke="#3A1233"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Inner blush sticker pill */}
        <rect
          x="18"
          y="25"
          width="84"
          height="42"
          rx="14"
          fill="#FFE6F0"
          stroke="#D94B7D"
          strokeWidth="2.2"
        />
        {/* Chunky comic shadow text */}
        <text
          x="62"
          y="55"
          textAnchor="middle"
          fill="#3A1233"
          fontSize="27"
          fontWeight="900"
          letterSpacing="1.5"
          fontFamily="Plus Jakarta Sans, -apple-system, sans-serif"
        >
          LOL!
        </text>
        {/* Crisp Rose Berry foreground highlight text */}
        <text
          x="60"
          y="53"
          textAnchor="middle"
          fill="#D94B7D"
          stroke="#3A1233"
          strokeWidth="1.2"
          paintOrder="stroke"
          fontSize="27"
          fontWeight="900"
          letterSpacing="1.5"
          fontFamily="Plus Jakarta Sans, -apple-system, sans-serif"
        >
          LOL!
        </text>
      </g>

      {/* Cute surrounding sparkles & stars */}
      <path d="M13 15L14.6 19.4L19 21L14.6 22.6L13 27L11.4 22.6L7 21L11.4 19.4L13 15Z" fill="#D94B7D" />
      <path d="M107 11L108.4 15L112.4 16.4L108.4 17.8L107 21.8L105.6 17.8L101.6 16.4L105.6 15L107 11Z" fill="#3A1233" />
      <circle cx="105" cy="79" r="3" fill="#D94B7D" />
      <circle cx="15" cy="76" r="2.6" fill="#3A1233" />
    </svg>
  );
}

/* Scratch Card 2: Celebratory Pizza Slice + Party Drink Inline SVG ("YOU Give Me a Party") */
export function PartyTreatDoodleSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 104" fill="none" aria-hidden="true" className={className}>
      <circle cx="56" cy="54" r="42" fill="#FFF2BE" fillOpacity="0.6" />
      {/* Fizzy party drink cup (back right) */}
      <path
        d="M66 36H94L90 80C89.6 83.4 86.8 86 83.4 86H76.6C73.2 86 70.4 83.4 70 80L66 36Z"
        fill="#FFE4F0"
        stroke="#3B1535"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path d="M68 50H92" stroke="#FF8FC2" strokeWidth="5" />
      {/* Bent party straw */}
      <path
        d="M80 36L84 18L94 14"
        stroke="#9A7CE8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="63" y="31" width="34" height="7" rx="3.5" fill="#EBE3FF" stroke="#3B1535" strokeWidth="2.6" />

      {/* Big cheesy pizza slice (front left) */}
      <g transform="rotate(-10 46 58)">
        {/* Crust */}
        <path
          d="M18 38C30 28 54 28 68 38L64 46C52 38 32 38 22 46L18 38Z"
          fill="#F4B956"
          stroke="#3B1535"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Cheesy triangle */}
        <path
          d="M22 45C32 38 52 38 64 45L43 88L22 45Z"
          fill="#FFE898"
          stroke="#3B1535"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Toppings */}
        <circle cx="38" cy="52" r="4.5" fill="#E04D92" stroke="#3B1535" strokeWidth="1.8" />
        <circle cx="51" cy="57" r="4.2" fill="#E04D92" stroke="#3B1535" strokeWidth="1.8" />
        <circle cx="43" cy="70" r="4" fill="#E04D92" stroke="#3B1535" strokeWidth="1.8" />
        <circle cx="34" cy="61" r="2.2" fill="#4CAF7D" />
        <circle cx="49" cy="48" r="2.2" fill="#4CAF7D" />
      </g>

      {/* Sparkles */}
      <path d="M19 22L21 28L27 30L21 32L19 38L17 32L11 30L17 28L19 22Z" fill="#E04D92" />
      <path d="M98 46L99.5 51L104.5 52.5L99.5 54L98 59L96.5 54L91.5 52.5L96.5 51L98 46Z" fill="#9A7CE8" />
    </svg>
  );
}




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

export function HandDrawnHeartSvg({
  className = 'w-6 h-6',
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 38"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        d="M20.2 33.5C15.5 29.5 5.4 22.8 5.2 13.5C5.1 8.4 9 4.8 13.6 5.1C16.7 5.3 18.9 7.2 20.1 9.6C21.5 7 24 5.1 27.1 5.1C31.7 5.1 35.1 8.7 34.8 13.8C34.4 22.5 24.5 29.8 20.2 33.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BalloonClusterDoodle({ className = 'w-20 h-24' }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 130" fill="none" aria-hidden="true" className={className}>
      {/* Back blush balloon */}
      <ellipse
        cx="34"
        cy="38"
        rx="21"
        ry="25"
        transform="rotate(-11 34 38)"
        fill="#FAD4E2"
        stroke="#4A122C"
        strokeWidth="2"
      />
      <path d="M27 25C25 30 25 36 27 41" stroke="#FFFDF9" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M38 63L35 67L41 66Z" fill="#FAD4E2" stroke="#4A122C" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M38 67C36 84 44 96 42 118"
        stroke="#C8848E"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />

      {/* Right champagne balloon */}
      <ellipse
        cx="78"
        cy="44"
        rx="19"
        ry="23"
        transform="rotate(10 78 44)"
        fill="#FBE8D3"
        stroke="#4A122C"
        strokeWidth="2"
      />
      <path d="M74 31C72 35 72 40 73 45" stroke="#FFFDF9" strokeWidth="2" strokeLinecap="round" />
      <path d="M74 67L71 71L77 71Z" fill="#FBE8D3" stroke="#4A122C" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M74 71C74 88 64 100 66 122"
        stroke="#C8848E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Center rose balloon */}
      <ellipse
        cx="55"
        cy="31"
        rx="20"
        ry="24"
        fill="#F2A4BE"
        stroke="#4A122C"
        strokeWidth="2"
      />
      <path d="M47 19C44 24 44 30 46 35" stroke="#FFFDF9" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M55 55L52 60H58L55 55Z" fill="#F2A4BE" stroke="#4A122C" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M55 60C57 78 50 96 54 124"
        stroke="#4A122C"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MiniCakeDoodle({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 90" fill="none" aria-hidden="true" className={className}>
      {/* Plate */}
      <ellipse cx="45" cy="74" rx="34" ry="7" fill="#F7D8E2" stroke="#4A122C" strokeWidth="2" />
      {/* Cake body */}
      <path
        d="M21 44H69V68C69 71 58 74 45 74C32 74 21 71 21 68V44Z"
        fill="#FFFDF9"
        stroke="#4A122C"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Frosting drips */}
      <path
        d="M21 44C21 41 32 38 45 38C58 38 69 41 69 44V51C65 55 61 50 57 53C53 56 49 51 45 54C41 57 37 51 33 54C29 56 25 51 21 52V44Z"
        fill="#F6B4C9"
        stroke="#4A122C"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Candles */}
      <rect x="33" y="24" width="5" height="16" rx="2" fill="#FBE2BA" stroke="#4A122C" strokeWidth="1.8" />
      <rect x="43" y="20" width="5" height="20" rx="2" fill="#FAD1DF" stroke="#4A122C" strokeWidth="1.8" />
      <rect x="53" y="25" width="5" height="15" rx="2" fill="#E8C6DF" stroke="#4A122C" strokeWidth="1.8" />
      {/* Flames */}
      <path d="M35.5 14C37.5 17 38 19.5 35.5 21.5C33 19.5 33.5 17 35.5 14Z" fill="#F7B750" stroke="#4A122C" strokeWidth="1.3" />
      <path d="M45.5 10C47.5 13 48 15.5 45.5 17.5C43 15.5 43.5 13 45.5 10Z" fill="#F7B750" stroke="#4A122C" strokeWidth="1.3" />
      <path d="M55.5 15C57.5 18 58 20.5 55.5 22.5C53 20.5 53.5 18 55.5 15Z" fill="#F7B750" stroke="#4A122C" strokeWidth="1.3" />
    </svg>
  );
}

export function ChampagneToastDoodle({ className = 'w-44 h-44' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" aria-hidden="true" className={className}>
      {/* Sparkles above clink */}
      <path
        d="M110 18L113 30L125 33L113 36L110 48L107 36L95 33L107 30L110 18Z"
        fill="#D98A9C"
      />
      <path
        d="M148 28L150 35L157 37L150 39L148 46L146 39L139 37L146 35L148 28Z"
        fill="#E4B37D"
      />
      <path
        d="M72 30L74 36L80 38L74 40L72 46L70 40L64 38L70 36L72 30Z"
        fill="#C8848E"
      />

      {/* Left coupe glass tilted right */}
      <g transform="rotate(14 78 115)">
        {/* Rose champagne liquid */}
        <path
          d="M42 74H110C108 94 94 106 76 106C58 106 44 94 42 74Z"
          fill="#F9C5D5"
        />
        {/* Glass bowl */}
        <path
          d="M38 64H114C112 91 96 108 76 108C56 108 40 91 38 64Z"
          stroke="#4A122C"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bubbles */}
        <circle cx="64" cy="84" r="2.8" fill="#FFFDF9" />
        <circle cx="78" cy="79" r="2.2" fill="#FFFDF9" />
        <circle cx="88" cy="89" r="3" fill="#FFFDF9" />
        {/* Stem & base */}
        <path d="M76 108V162" stroke="#4A122C" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M56 164C64 161 88 161 96 164" stroke="#4A122C" strokeWidth="2.8" strokeLinecap="round" />
        {/* Little bow on stem */}
        <path
          d="M76 130C68 124 62 128 65 133C68 136 74 132 76 130ZM76 130C84 124 90 128 87 133C84 136 78 132 76 130Z"
          fill="#E89CB5"
          stroke="#4A122C"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </g>

      {/* Right coupe glass tilted left */}
      <g transform="rotate(-14 144 115)">
        {/* Golden champagne liquid */}
        <path
          d="M110 74H178C176 94 162 106 144 106C126 106 112 94 110 74Z"
          fill="#FCE0C4"
        />
        {/* Glass bowl */}
        <path
          d="M106 64H182C180 91 164 108 144 108C124 108 108 91 106 64Z"
          stroke="#4A122C"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bubbles */}
        <circle cx="136" cy="83" r="2.6" fill="#FFFDF9" />
        <circle cx="152" cy="88" r="2.2" fill="#FFFDF9" />
        <circle cx="145" cy="76" r="2.8" fill="#FFFDF9" />
        {/* Stem & base */}
        <path d="M144 108V162" stroke="#4A122C" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M124 164C132 161 156 161 164 164" stroke="#4A122C" strokeWidth="2.8" strokeLinecap="round" />
      </g>

      {/* Clink lines */}
      <path d="M104 54L99 47" stroke="#4A122C" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M116 54L121 47" stroke="#4A122C" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function HeartsCrownDoodle({ className = 'w-44 h-44' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" aria-hidden="true" className={className}>
      {/* Soft blush aura */}
      <circle cx="110" cy="108" r="64" fill="#FCE7F0" />

      {/* Princess crown */}
      <path
        d="M52 136L40 76L82 104L110 56L138 104L180 76L168 136H52Z"
        fill="#F8D8A8"
        stroke="#4A122C"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="50"
        y="136"
        width="120"
        height="18"
        rx="6"
        fill="#F4A9C1"
        stroke="#4A122C"
        strokeWidth="2.8"
      />
      {/* Crown pearls */}
      <circle cx="40" cy="71" r="6" fill="#FFFDF9" stroke="#4A122C" strokeWidth="2.4" />
      <circle cx="110" cy="50" r="7.5" fill="#F48FB1" stroke="#4A122C" strokeWidth="2.4" />
      <circle cx="180" cy="71" r="6" fill="#FFFDF9" stroke="#4A122C" strokeWidth="2.4" />
      {/* Crown center jewel */}
      <path
        d="M110 100L119 113L110 125L101 113L110 100Z"
        fill="#E57A9E"
        stroke="#4A122C"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="145" r="3" fill="#FFFDF9" />
      <circle cx="110" cy="145" r="3.5" fill="#FFFDF9" />
      <circle cx="140" cy="145" r="3" fill="#FFFDF9" />

      {/* Floating doodle hearts */}
      <path
        d="M56 54C52 50 44 45 44 38C44 34 47 31 51 31C53.5 31 55 32.5 56 34.5C57 32.5 58.5 31 61 31C65 31 68 34 68 38C68 45 60 50 56 54Z"
        fill="#F497B6"
        stroke="#4A122C"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M168 46C165 43 159 39 159 34C159 31 161.5 29 164.5 29C166.2 29 167.3 30 168 31.4C168.7 30 169.8 29 171.5 29C174.5 29 177 31 177 34C177 39 171 43 168 46Z"
        fill="#FAD4E2"
        stroke="#4A122C"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Twinkle star */}
      <path
        d="M110 14L112.5 23L121.5 25.5L112.5 28L110 37L107.5 28L98.5 25.5L107.5 23L110 14Z"
        fill="#C8848E"
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
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WavyDivider({
  fill = '#4A122C',
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
        className="block w-full h-10 sm:h-14 md:h-16"
      >
        <path
          d="M0,36 C180,74 360,2 540,36 C720,70 900,4 1080,36 C1260,68 1350,22 1440,36 L1440,72 L0,72 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

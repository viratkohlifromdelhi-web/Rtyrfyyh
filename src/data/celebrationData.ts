import type { FriendRankEntry } from '../utils/birthdayMath';

export const ANAMIKA = {
  fullName: 'Anamika Singh',
  firstName: 'Anamika',
  nickname: 'Morgan',
  age: 17,
  birthdayLabel: '03 December 2026',
  birthDateLabel: '03 Dec 2009',
  heroSubtitle:
    'Happy birthday to my lesbian daughter Morgan, permanent bauni, and somehow my greatest HG.',
  polaroidCaption: 'Anamika aka Morgan, my greatest HG.',
};

export interface HeroSticker {
  id: string;
  label: string;
  bg: string;
  border: string;
  rotate: string;
}

export const HERO_STICKERS: HeroSticker[] = [
  {
    id: 'sticker-hg',
    label: '👑 Greatest HG',
    bg: 'bg-[#FFF3C4]',
    border: 'border-[#E6C96E]',
    rotate: '-rotate-2',
  },
  {
    id: 'sticker-bauni',
    label: '📏 Bauni',
    bg: 'bg-[#FFE6F0]',
    border: 'border-[#F2B5CC]',
    rotate: 'rotate-2',
  },
  {
    id: 'sticker-morgan',
    label: '🎀 Daughter: Morgan',
    bg: 'bg-[#F1E9FF]',
    border: 'border-[#D5C3F5]',
    rotate: '-rotate-1',
  },
  {
    id: 'sticker-bachhaww',
    label: '✨ Bachhaww',
    bg: 'bg-[#FFFDFB]',
    border: 'border-[#ECC6D7]',
    rotate: 'rotate-2',
  },
];

export const MODE_MESSAGES = {
  noFilter: {
    badge: 'No Filter',
    title: 'No Filter Notes',
    body: 'Happy 17th, Morgan. Still a bauni, still a gawaar, still my lesbian daughter, and still zero height growth since 8th class.',
    polaroidNote: 'Still zero height growth since 8th class.',
  },
  birthdayTruce: {
    badge: 'Birthday Truce',
    title: '24 Hour Birthday Truce',
    body: "Okay, 24 hour truce because it's your birthday. Happy 17th, Anamika. Genuinely glad I sent that 12:29 AM message on 21 July.",
    polaroidNote: 'Always my greatest HG.',
  },
};

/**
 * Base 5-person friend list (before the 21 July override).
 * When Friend List Override is ON (the default), Morgan sits right at #2 behind Abhay:
 * 1. Abhay, 2. Morgan, 3. Ankit, 4. Ayush, 5. Harsh
 */
export const FRIEND_LEADERBOARD_BASE: FriendRankEntry[] = [
  {
    id: 'friend-abhay',
    name: 'Abhay',
    tag: 'Day one bro',
    avatarSrc: '/abhay.png',
    instagramHandle: '@abhay._.911',
    instagramUrl: 'https://www.instagram.com/abhay._.911/',
  },
  {
    id: 'friend-ankit',
    name: 'Ankit',
    tag: 'Old buddy',
    avatarSrc: '/ankit.png',
    instagramHandle: '@ankit_raj0i84',
    instagramUrl: 'https://www.instagram.com/ankit_raj0i84/',
  },
  {
    id: 'friend-ayush',
    name: 'Ayush',
    tag: 'Group chat regular',
    avatarSrc: '/ayush.png',
    instagramHandle: '@minimilistic_ay',
    instagramUrl: 'https://www.instagram.com/minimilistic_ay/',
  },
  {
    id: 'friend-harsh',
    name: 'Harsh',
    tag: 'School friend',
    avatarSrc: '/harsh.png',
    instagramHandle: '@conect.harsh',
    instagramUrl: 'https://www.instagram.com/conect.harsh/',
  },
  {
    id: 'anamika-morgan',
    name: 'Morgan',
    tag: '12:29 AM first DM · 21 July',
    avatarSrc: '/Anamika.png',
    instagramHandle: '@i_hinata.i',
    instagramUrl: 'https://www.instagram.com/i_hinata.i/',
    isAnamika: true,
  },
];

export interface BackstoryChapter {
  id: string;
  numeral: '01' | '02' | '03';
  tabLabel: string;
  tabAlign: 'left' | 'center' | 'right';
  stickyTopPx: number;
  eyebrow: string;
  title: string;
  description: string;
  metaPill?: string;
  variant: 'buttercream' | 'lilac' | 'roseClimax';
  highlight?: boolean;
}

export const BACKSTORY_CHAPTERS: BackstoryChapter[] = [
  {
    id: 'ch-1',
    numeral: '01',
    tabLabel: '01 · Till 8th',
    tabAlign: 'left',
    stickyTopPx: 82,
    eyebrow: 'CHAPTER 01 · TILL CLASS 8TH',
    title: 'Pioneer Academy, Lalganj',
    description:
      'We studied together till Class 8th and were just normal classmates.',
    variant: 'buttercream',
  },
  {
    id: 'ch-2',
    numeral: '02',
    tabLabel: '02 · After 8th',
    tabAlign: 'center',
    stickyTopPx: 122,
    eyebrow: 'CHAPTER 02 · AFTER CLASS 8TH',
    title: 'Different Schools',
    description:
      'Then I moved to another school and we barely even talked.',
    variant: 'lilac',
  },
  {
    id: 'ch-3',
    numeral: '03',
    tabLabel: '03 · 21 July',
    tabAlign: 'right',
    stickyTopPx: 162,
    eyebrow: 'CHAPTER 03 · 21 JULY 2026',
    title: '21 July 2026',
    metaPill: '12:29 AM · Instagram DM',
    description:
      'Then we reconnected on Instagram when I messaged you first at 12:29 AM, and everything changed.',
    variant: 'roseClimax',
    highlight: true,
  },
];

export interface StarterPackCard {
  id: string;
  icon: 'ribbonCrown' | 'rulerSparkle' | 'rainbowShades' | 'trophy';
  title: string;
  description: string;
  bonusQuip: string;
  bgClass: string;
  accentClass: string;
}

export const MORGAN_STARTER_PACK: StarterPackCard[] = [
  {
    id: 'sp-morgan',
    icon: 'ribbonCrown',
    title: 'Daughter "Morgan"',
    description:
      "Started calling you my daughter as a joke and now you're stuck with the name forever.",
    bonusQuip: 'Basically your real name now: Morgan Singh.',
    bgClass: 'bg-[#FFE6F0]',
    accentClass: 'text-[#D94B7D]',
  },
  {
    id: 'sp-bauni',
    icon: 'rulerSparkle',
    title: 'Permanent Bauni',
    description:
      'Short height, loud voice, and full bachhaww vibes.',
    bonusQuip: 'Still waiting on that growth spurt.',
    bgClass: 'bg-[#FFF3C4]/80',
    accentClass: 'text-[#8F6500]',
  },
  {
    id: 'sp-lesbian-daughter',
    icon: 'rainbowShades',
    title: 'Lesbian Daughter',
    description:
      "The joke that's never getting old. Happy birthday to my lesbian daughter Morgan.",
    bonusQuip: "Zero chance I'm ever dropping this nickname.",
    bgClass: 'bg-[#F1E9FF]',
    accentClass: 'text-[#6A3D8A]',
  },
  {
    id: 'sp-hg',
    icon: 'trophy',
    title: 'Greatest HG',
    description:
      'Right at #2 on my friend list behind Abhay. Zero filter, I can tell you anything.',
    bonusQuip: "Best friend I've had till now, no doubt.",
    bgClass: 'bg-[#FFF3C4]/65',
    accentClass: 'text-[#9B4E15]',
  },
];

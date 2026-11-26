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
  polaroidCaption: 'Anamika aka Morgan — my greatest HG.',
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
  roast: {
    badge: 'Roast Mode 🔥',
    title: 'Birthday Roast for Morgan',
    body: 'Happy 17th birthday Morgan. Still a bauni, still a Gawaar, still my lesbian daughter, and still zero height growth.',
    polaroidNote: 'Still zero height growth since 8th class.',
  },
  wholesome: {
    badge: 'Wholesome Mode 🫶',
    title: 'Being Real for a Second',
    body: "Jokes apart, you're genuinely my greatest HG and the best friend I've had till now. I can tell you anything without a second thought. Happy birthday, Anamika.",
    polaroidNote: 'Always my greatest HG.',
  },
};

/**
 * Base 5-person friend list (before the 22 July override).
 * When Friend List Override is ON (the default), Morgan sits right at #2 behind Abhay:
 * 1. Abhay, 2. Morgan, 3. Ankit, 4. Ayush, 5. Harsh
 */
export const FRIEND_LEADERBOARD_BASE: FriendRankEntry[] = [
  { id: 'friend-abhay', name: 'Abhay', tag: 'Day-one bro' },
  { id: 'friend-ankit', name: 'Ankit', tag: 'Old buddy' },
  { id: 'friend-ayush', name: 'Ayush', tag: 'Group chat regular' },
  { id: 'friend-harsh', name: 'Harsh', tag: 'School friend' },
  {
    id: 'anamika-morgan',
    name: 'Morgan',
    tag: 'Texted first on 22 July',
    isAnamika: true,
  },
];

export interface BackstoryChapter {
  id: string;
  chapterLabel: string;
  title: string;
  period: string;
  description: string;
  tag: string;
  highlight?: boolean;
}

export const BACKSTORY_CHAPTERS: BackstoryChapter[] = [
  {
    id: 'ch-1',
    chapterLabel: 'Chapter 1',
    title: 'Pioneer Academy, Lalganj',
    period: 'Till Class 8th',
    description:
      'We studied together till 8th class and were just normal classmates.',
    tag: 'School Days',
  },
  {
    id: 'ch-2',
    chapterLabel: 'Chapter 2',
    title: 'Different Schools',
    period: 'After Class 8th',
    description:
      'Then I moved to another school and we barely even talked.',
    tag: 'Barely Talked',
  },
  {
    id: 'ch-3',
    chapterLabel: 'Chapter 3',
    title: '22 July 2026',
    period: 'Instagram DM',
    description:
      'Then we met again on Instagram when she messaged me first, and everything changed.',
    tag: 'Everything Changed',
    highlight: true,
  },
  {
    id: 'ch-4',
    chapterLabel: 'Now',
    title: 'Greatest HG',
    period: 'Still Counting',
    description:
      "Now she's my greatest HG and I share literally everything with her without even thinking twice.",
    tag: 'Closest Friend',
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
      "The joke that's never getting old—happy birthday to my lesbian daughter Morgan.",
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

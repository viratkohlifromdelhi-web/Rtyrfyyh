import type { FriendRankEntry } from '../utils/birthdayMath';

export const ANAMIKA = {
  fullName: 'Anamika Singh',
  firstName: 'Anamika',
  nickname: 'Morgan',
  age: 17,
  birthdayLabel: '03 December 2026',
  birthDateLabel: '03 Dec 2009',
  heroSubtitle:
    'Wishing the loudest birthday to my sarcastic lesbian daughter Morgan, certified bauni, and somehow my greatest HG of all time.',
  polaroidCaption: 'The #1 Homegirl (bachawww status: permanent).',
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
    bg: 'bg-[#FFE898]',
    border: 'border-[#E6C75A]',
    rotate: '-rotate-2',
  },
  {
    id: 'sticker-bauni',
    label: '📏 Certified Bauni',
    bg: 'bg-[#FFE4F0]',
    border: 'border-[#F3B5D0]',
    rotate: 'rotate-2',
  },
  {
    id: 'sticker-morgan',
    label: '🎀 Daughter: Morgan',
    bg: 'bg-[#EBE3FF]',
    border: 'border-[#CDBBF9]',
    rotate: '-rotate-1',
  },
  {
    id: 'sticker-bachawww',
    label: '✨ Bachawww Energy',
    bg: 'bg-[#FFFDF8]',
    border: 'border-[#E7D3E3]',
    rotate: 'rotate-2',
  },
];

export const MODE_MESSAGES = {
  roast: {
    badge: 'Roast Mode 🔥',
    title: 'Certified Bauni & Sarcastic Lesbian Daughter Morgan',
    body: 'Turning 17 and still operating at maximum bachawww chaos and fun-sized height. Started calling you my lesbian daughter Morgan purely for sarcasm, and honestly you earned the title permanently. Still a certified Gawaar though — happy birthday, bauni!',
    polaroidNote: 'Bachawww mode active · Zero height gained since Class 8th.',
  },
  wholesome: {
    badge: 'Wholesome Mode 🫶',
    title: 'Genuinely the Greatest HG Anyone Could Ask For',
    body: 'Jokes aside for five seconds: you are literally the greatest HG of all time. The one friend I can tell anything to without a second thought, zero judgment, and 100% real loyalty. Wild how one Instagram message turned an old classmate into my #1 person on the friend list.',
    polaroidNote: 'Greatest HG status · 100% unfiltered trust & best-friend respect.',
  },
};

export const FRIEND_LEADERBOARD_BASE: FriendRankEntry[] = [
  { id: 'friend-1', name: 'Aarav', tag: 'Old school bro' },
  { id: 'friend-2', name: 'Rohan', tag: 'Late-night gaming squad' },
  { id: 'friend-3', name: 'Kabir', tag: 'Group chat menace' },
  { id: 'friend-4', name: 'Dev', tag: 'Day-one homie' },
  {
    id: 'anamika-morgan',
    name: 'Anamika (Morgan)',
    tag: 'Undisputed #1 Greatest HG',
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
      'We studied together till Class 8th, just normal classmates with zero idea we’d end up here.',
    tag: 'Origin Story',
  },
  {
    id: 'ch-2',
    chapterLabel: 'Chapter 2',
    title: 'Different Schools',
    period: 'The Quiet Arc',
    description:
      'I moved to another school, and for a long time we were just old classmates doing our own thing.',
    tag: 'Plot Pause',
  },
  {
    id: 'ch-3',
    chapterLabel: 'Chapter 3',
    title: '22 July 2026 — The Instagram Plot Twist',
    period: '22 July 2026',
    description:
      'She messaged me first on Instagram, and literally everything changed.',
    tag: 'Game Changer',
    highlight: true,
  },
  {
    id: 'ch-4',
    chapterLabel: 'Now',
    title: 'Undisputed Greatest HG',
    period: 'Present Day & Counting',
    description:
      'She overtook every single male friend to claim the #1 spot on my friend list—my greatest homegirl who I share everything with without a second thought.',
    tag: 'Rank #1 Forever',
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
      "Started calling you my daughter just for fun and sarcasm, and now you're stuck with the name forever.",
    bonusQuip: 'Official legal alias in the group lore: Morgan Singh.',
    bgClass: 'bg-[#FFE4F0]',
    accentClass: 'text-[#C2377E]',
  },
  {
    id: 'sp-bauni',
    icon: 'rulerSparkle',
    title: 'Certified Bauni',
    description:
      'Fun-sized height, oversized chaos, peak bachawww behavior.',
    bonusQuip: 'Vertical measurement: compact. Loudness: stadium level.',
    bgClass: 'bg-[#FFE898]/65',
    accentClass: 'text-[#8F6500]',
  },
  {
    id: 'sp-lesbian-icon',
    icon: 'rainbowShades',
    title: 'Sarcastic Lesbian Icon',
    description:
      'The running joke that never dies—happy birthday to my favorite sarcastic lesbian daughter.',
    bonusQuip: 'Zero chance this joke ever gets retired. Ever.',
    bgClass: 'bg-[#EBE3FF]',
    accentClass: 'text-[#623EA8]',
  },
  {
    id: 'sp-hg',
    icon: 'trophy',
    title: 'Greatest HG',
    description:
      'Beat every single guy friend for the #1 spot. Zero filter, zero second thoughts.',
    bonusQuip: 'Undefeated, undisputed #1 Homegirl Hall of Fame.',
    bgClass: 'bg-[#FFF3E0]',
    accentClass: 'text-[#9B4E15]',
  },
];

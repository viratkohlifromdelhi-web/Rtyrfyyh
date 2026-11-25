import type { GuestbookWish } from '../utils/guestbook';

export const CELEBRANT = {
  name: 'Kiara',
  age: 24,
  heroPhoto: '/src/assets/images/hero_besties_polaroid_1795583505452.jpg',
  heroCaption: 'Kiara & the besties · Golden hour vibes',
  subtitle:
    'A sparkling celebration for the absolute best, the group chat favorite, and the sweetest soul.',
};

export interface EventDetail {
  label: string;
  value: string;
  note?: string;
}

export const EVENT_DETAILS: EventDetail[] = [
  {
    label: 'When',
    value: 'Saturday, Nov 28',
    note: 'Save the date',
  },
  {
    label: 'Time',
    value: '6:00 PM – Late',
    note: 'Golden hour onward',
  },
  {
    label: 'Where',
    value: 'The Rose Conservatory',
    note: 'Rooftop Garden Salon',
  },
  {
    label: 'Dress Code',
    value: 'Cutest outfits + sparkles',
    note: 'Blush, satin & rose gold',
  },
];

export interface TimelineSlot {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  insiderNote: string;
  highlight?: boolean;
}

export const TIMELINE_SLOTS: TimelineSlot[] = [
  {
    id: 'slot-600',
    time: '6:00 PM',
    title: 'Arrivals & Rose Spritzes',
    subtitle: 'Pink bubbly welcome on the terrace as the fairy lights flicker on.',
    insiderNote: 'Grab a signature hibiscus-peach spritz and sign the Polaroid guestbook by the door.',
  },
  {
    id: 'slot-615',
    time: '6:15 PM',
    title: 'Polaroid Booth & Golden Hour Snaps',
    subtitle: 'Bestie portraits before the sun dips behind the skyline.',
    insiderNote: 'Extra instant film packs are stocked — take one for yourself and pin one for Kiara!',
  },
  {
    id: 'slot-700',
    time: '7:00 PM',
    title: 'Candlelight Dinner & Heartfelt Toasts',
    subtitle: 'Long table feast, peony centerpieces, and the sweetest speeches.',
    insiderNote: 'Keep tissues nearby — Maya and Priya have been rehearsing their toast all week.',
    highlight: true,
  },
  {
    id: 'slot-830',
    time: '8:30 PM',
    title: 'Cake Cutting & 24 Wishes',
    subtitle: 'Strawberry-champagne layer cake, sparkler candles, and big wishes.',
    insiderNote: 'Everyone crowds around the center table for the birthday song chorus!',
    highlight: true,
  },
  {
    id: 'slot-915',
    time: '9:15 PM',
    title: 'Throwback Karaoke & Dance Floor',
    subtitle: '2000s pop anthems, glitter mics, and zero judgment.',
    insiderNote: 'Kiara already claimed the opening duet — add your queue favorites at the DJ stand.',
  },
  {
    id: 'slot-1030',
    time: '10:30 PM',
    title: 'Rooftop Sparklers & Late-Night Sweets',
    subtitle: 'Warm churros, espresso martinis, and midnight rooftop wishes.',
    insiderNote: 'Cozy pink pashminas are waiting in the basket if the night breeze rolls in.',
  },
];

export interface LoveCard {
  id: string;
  kind: 'photo' | 'doodle';
  imageUrl?: string;
  imageAlt?: string;
  doodleType?: 'champagne' | 'crown';
  caption: string;
  backTitle: string;
  backNote: string;
  accentBg: string;
}

export const WHY_WE_LOVE_CARDS: LoveCard[] = [
  {
    id: 'love-1',
    kind: 'photo',
    imageUrl: '/src/assets/images/card_facetime_besties_1795583505974.jpg',
    imageAlt: 'Best friends laughing together on a sunlit cream sofa with iced lattes',
    caption: "She's always down for a chaotic FaceTime or late-night chat.",
    backTitle: 'Always One Call Away',
    backNote:
      'Whether it is a 10-minute outfit emergency or a 2-hour life debrief over iced oat lattes, Kiara picks up on the second ring.',
    accentBg: 'bg-[#FFF3F6]',
  },
  {
    id: 'love-2',
    kind: 'doodle',
    doodleType: 'champagne',
    caption: 'Can turn any boring Tuesday into a core memory.',
    backTitle: 'Spontaneous Magic',
    backNote:
      'A quick grocery run somehow becomes sunset pastries, playlist sing-alongs, and a photo roll we talk about all year.',
    accentBg: 'bg-[#FFF7EE]',
  },
  {
    id: 'love-3',
    kind: 'photo',
    imageUrl: '/src/assets/images/card_kiara_laughing_1795583505648.jpg',
    imageAlt: 'Kiara laughing joyfully at a candlelit dinner table with blush peonies',
    caption: 'Her laughter is infectious, from inside jokes to 2 AM gossip.',
    backTitle: 'Pure Sunshine Energy',
    backNote:
      'The second Kiara starts giggling, the entire table loses it. Half our group chat voice notes are just her laughing.',
    accentBg: 'bg-[#FDF0F5]',
  },
  {
    id: 'love-4',
    kind: 'doodle',
    doodleType: 'crown',
    caption: "She makes every single person feel like they're the main character.",
    backTitle: 'Biggest Cheerleader',
    backNote:
      'She remembers the tiny details, celebrates every win like it is an Oscar, and leaves handwritten notes when you need them most.',
    accentBg: 'bg-[#F8F0FA]',
  },
];

export const SEEDED_WISHES: GuestbookWish[] = [
  {
    id: 'seed-maya',
    name: 'Maya',
    message:
      'Happy 24th to my forever coffee date and voice-note comedian! May this year be drenched in pink sunsets and main-character moments.',
    tone: 'blush',
    createdAt: '2026-11-24T17:20:00.000Z',
    rotation: -2.1,
  },
  {
    id: 'seed-chloe',
    name: 'Chloe',
    message:
      'Nobody hypes up the group chat like you do. So grateful for every late-night laugh and spontaneous pastry run. Love you endlessly!',
    tone: 'champagne',
    createdAt: '2026-11-24T18:05:00.000Z',
    rotation: 1.7,
  },
  {
    id: 'seed-priya',
    name: 'Priya',
    message:
      '24 looks ridiculously good on you, Kiara! Cannot wait to sing terrible karaoke with you tonight under the rooftop lights.',
    tone: 'cream',
    createdAt: '2026-11-24T18:45:00.000Z',
    rotation: -1.3,
  },
  {
    id: 'seed-tessa',
    name: 'Tessa',
    message:
      'Thank you for always making everyone feel seen, loved, and celebrated. Tonight it is 100% your turn to shine!',
    tone: 'lavender',
    createdAt: '2026-11-24T19:12:00.000Z',
    rotation: 2.0,
  },
];

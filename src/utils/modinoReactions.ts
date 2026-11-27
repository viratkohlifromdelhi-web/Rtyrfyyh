/**
 * Modino Personality Brain, Two-Layer Anti-Repetition Shuffle Engine,
 * and 60fps Floating Micro-Hearts Generator.
 * Strictly zero visible dashes (—, –, -) in every rendered dialogue string.
 */

import type { ModinoReactionCategory } from './modinoBus';
import type { UiSfxName } from './uiSoundEngine';

export type ModinoMood =
  | 'idle'
  | 'greeting'
  | 'jump'
  | 'happy_smile'
  | 'surprised'
  | 'laugh'
  | 'shy_blush'
  | 'kiss'
  | 'ew_cringe'
  | 'sleepy_zzz';

export interface ModinoReaction {
  text: string;
  mood: ModinoMood;
  sfx: UiSfxName;
  /** Original handwritten signature lines prioritized subtly on first visits */
  priority?: boolean;
}

export const GLOBAL_HISTORY_SIZE = 18;
export const MODINO_MAX_ACTIVE_HEARTS = 12;

export const MODINO_HEART_COLORS = [
  '#D94B7D',
  '#F39AB8',
  '#F9C2D6',
  '#F6B5A8',
] as const;

export const MODINO_SIGNATURE_GREETING: ModinoReaction = {
  text: "Hey Bra, Happy B'day! 🎂✨",
  mood: 'greeting',
  sfx: 'awww_chime',
  priority: true,
};

export const MODINO_SLEEP_MUTTERS: readonly string[] = [
  'zzzz... 💤',
  'hmmm... 😴',
  'Ummm... 💤',
  '5 more minutes... 😴',
  'Modino battery low... 💤',
];

export const MODINO_WAKE_LINES: readonly ModinoReaction[] = [
  { text: 'Ummm... I was totally awake! 👀', mood: 'surprised', sfx: 'wake_chirp' },
  { text: 'hmmm... kya hua? 🫣', mood: 'surprised', sfx: 'wake_chirp' },
  { text: "Whoa! Don't scare Modino like that! 😆", mood: 'surprised', sfx: 'wake_chirp' },
  { text: 'Back online! Lessssgooooo... ⚡🐾', mood: 'jump', sfx: 'wake_chirp' },
  { text: 'Arey, sapne mein cake kha raha tha! 🎂😴', mood: 'surprised', sfx: 'wake_chirp' },
];

export const MODINO_REACTION_BANKS: Record<ModinoReactionCategory, readonly ModinoReaction[]> = {
  greeting: [
    MODINO_SIGNATURE_GREETING,
    {
      text: 'HELLLLWWWW BACHHAWWW! Happy 17th! 🎉🎀',
      mood: 'jump',
      sfx: 'confetti_burst',
      priority: true,
    },
    {
      text: '17 yrs ki Bauni officially unlocked! 🎂👑',
      mood: 'happy_smile',
      sfx: 'confetti_burst',
      priority: true,
    },
    {
      text: 'Welcome to the greatest 17th birthday site ever made! ✨🎉',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Dec 3 is finally here! Lessssgooooo... 🥳💖',
      mood: 'jump',
      sfx: 'jump',
    },
    {
      text: 'Modino reporting for birthday duty, Morgan! 🐾🎂',
      mood: 'greeting',
      sfx: 'awww_chime',
    },
  ],

  cute: [
    { text: 'Auuuuww... 🥺💗', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: 'Achhaw Cutie 🌸✨', mood: 'shy_blush', sfx: 'awww_chime', priority: true },
    { text: 'Pani Piyogi Cutie... 💧😊', mood: 'shy_blush', sfx: 'giggle', priority: true },
    { text: 'Cutie, aap pani pite ho? 🥤🤭', mood: 'shy_blush', sfx: 'giggle', priority: true },
    {
      text: 'Auuuuww... why is this actually so wholesome? 🥹🎀',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Achhaw Cutie, smile thoda aur! 📸💖',
      mood: 'kiss',
      sfx: 'kiss_pop',
    },
    {
      text: 'Certified cutest birthday girl in Lalganj! 🌸👑',
      mood: 'happy_smile',
      sfx: 'confetti_burst',
    },
    {
      text: 'Stop looking that cute, Modino is blushing! 🫣💗',
      mood: 'shy_blush',
      sfx: 'awww_chime',
    },
    {
      text: 'Best friend energy hitting 1000 percent right now! ✨🥹',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Okay wait, that actually made Modino smile! 😊🎀',
      mood: 'kiss',
      sfx: 'kiss_pop',
    },
  ],

  gift_ew: [
    { text: 'Ewwww... 💀😂', mood: 'ew_cringe', sfx: 'ew_boing', priority: true },
    { text: 'Re gawarr 😹🙌', mood: 'laugh', sfx: 'giggle', priority: true },
    {
      text: 'Ewwww... itna buildup aur yeh nikla? 😭🤣',
      mood: 'ew_cringe',
      sfx: 'ew_boing',
    },
    {
      text: 'Hehe Lol full scam ho gaya! 🤡😂',
      mood: 'laugh',
      sfx: 'ew_boing',
    },
    {
      text: 'Re gawarr, really thought it would be easy? 😜💀',
      mood: 'laugh',
      sfx: 'giggle',
    },
    {
      text: 'Arey bhai bhai, expectation vs reality! 😂📦',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'Ummm... should we ask for a refund? 🤔😂',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'Ewwww... Modino refuses to take responsibility for this! 🙈🤣',
      mood: 'ew_cringe',
      sfx: 'ew_boing',
    },
  ],

  backstory: [
    { text: "memories, let's go 📖✨", mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    {
      text: 'Baad me finally aa gaya! Case closed! 📱😂',
      mood: 'laugh',
      sfx: 'giggle',
      priority: true,
    },
    {
      text: '12:29 AM on 21 July really rewrote the whole timeline! 🕰️✨',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'From Class 8th normal classmates to this! Wild plot! 📚🥹',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: "memories, let's go! Pioneer Academy lore hits different! 🏫💭",
      mood: 'shy_blush',
      sfx: 'awww_chime',
    },
    {
      text: 'One Instagram DM at midnight changed everything! 📱✨',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'hmmm... greatest comeback story since Class 8th! 👀📖',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Ummm... who knew 12:29 AM would become history? 🌙💗',
      mood: 'shy_blush',
      sfx: 'awww_chime',
    },
  ],

  interaction_hype: [
    { text: 'Lessssgooooo... 🚀🎉', mood: 'jump', sfx: 'jump', priority: true },
    { text: 'One more periods left ⏳😂', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Nanki hi bhagwaan hai 👑🙏✨', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: 'Hehe Lol 😂✨', mood: 'laugh', sfx: 'giggle', priority: true },
    {
      text: 'Lessssgooooo... keep tapping everything! 🔥😆',
      mood: 'jump',
      sfx: 'confetti_burst',
    },
    {
      text: 'Full VIP birthday treatment unlocked! 🎟️✨',
      mood: 'happy_smile',
      sfx: 'confetti_burst',
    },
    {
      text: 'Main character energy detected! 🌟👑',
      mood: 'jump',
      sfx: 'jump',
    },
    {
      text: "Wait, don't skip anything, there is more! 👀🎉",
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'Tap tap tap! Modino approves this speed! ⚡🐾',
      mood: 'jump',
      sfx: 'jump',
    },
    {
      text: 'Okay rich kid, 250 rupees secured! 💸😂',
      mood: 'laugh',
      sfx: 'giggle',
    },
  ],

  spin: [
    { text: 'Acchaww Bauni 🎡😂', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: '17 yrs ki Bauni testing her luck! 🌀😆', mood: 'jump', sfx: 'jump', priority: true },
    {
      text: 'Wait wait wait, look at that last second twist! 👀🎡',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'Acchaww Bauni, rigged nahi hai, trust Modino! 🤭✨',
      mood: 'shy_blush',
      sfx: 'giggle',
    },
    {
      text: 'Spin faster, destiny is loading! 🌀🚀',
      mood: 'jump',
      sfx: 'jump',
    },
    {
      text: 'Hehe Lol plot twist at the final peg! 🤣🎡',
      mood: 'laugh',
      sfx: 'confetti_burst',
    },
  ],

  friends_and_banter: [
    {
      text: 'Aapki friend ka number milega? 📱😏',
      mood: 'shy_blush',
      sfx: 'giggle',
      priority: true,
    },
    { text: 'Kuttii 😂🐾', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Bauni 🤏😆', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Amino 💖✨', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: 'Re gawarr 😤😂', mood: 'ew_cringe', sfx: 'ew_boing', priority: true },
    { text: 'Nanki hi bhagwaan hai 👑🙏', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: '17 yrs ki Bauni 🎂📏', mood: 'jump', sfx: 'jump', priority: true },
    {
      text: 'Height growth since Class 8th: still loading... 📏😂',
      mood: 'laugh',
      sfx: 'giggle',
    },
    {
      text: 'No filter mode is dangerous, brace yourself! ⚠️😆',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'Aapki friend ka number milega? Asking for Modino! 🐾📱',
      mood: 'shy_blush',
      sfx: 'giggle',
    },
    {
      text: 'Kuttii energy off the charts today! 😂🔥',
      mood: 'laugh',
      sfx: 'confetti_burst',
    },
    {
      text: 'Bauni hi bhagwaan hai, official verdict! 👑✨',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Amino detected! Sending maximum chaos! 🎀😂',
      mood: 'jump',
      sfx: 'jump',
    },
  ],

  last_playback: [
    { text: 'Hechehehe 🐣🤭', mood: 'laugh', sfx: 'giggle', priority: true },
    {
      text: 'Hechehehe AYUSH lore officially canon! 🐥😂',
      mood: 'laugh',
      sfx: 'confetti_burst',
    },
    {
      text: 'Wait... that escalated in 3 seconds flat! 🥚🤣',
      mood: 'surprised',
      sfx: 'surprise_bling',
    },
    {
      text: 'Meet AYUSH, newest member of the coop! 🐣👑',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Hechehehe best plot twist on the entire page! 🤭🐥',
      mood: 'laugh',
      sfx: 'giggle',
    },
    {
      text: 'Replay the coop, AYUSH deserves an Oscar! 🏆🐣',
      mood: 'jump',
      sfx: 'confetti_burst',
    },
  ],

  ending: [
    { text: 'byeee bachhaww 👋💗✨', mood: 'kiss', sfx: 'kiss_pop', priority: true },
    { text: 'Hechehehe byeee bachhaww! 😘🎀', mood: 'kiss', sfx: 'kiss_pop', priority: true },
    {
      text: 'byeee bachhaww! Hope this made your 17th unforgettable! 🥹💖',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Handshake to hug unlocked! Official best friend stamp! 🤝✨',
      mood: 'happy_smile',
      sfx: 'awww_chime',
    },
    {
      text: 'Created by adinomide, approved by Modino! byeee bachhaww! 👋🎉',
      mood: 'kiss',
      sfx: 'kiss_pop',
    },
  ],

  direct_tap: [
    { text: "Hey Bra, Happy B'day! 🎂😆", mood: 'greeting', sfx: 'awww_chime', priority: true },
    { text: 'Achhaw Cutie 🌸😊', mood: 'shy_blush', sfx: 'awww_chime', priority: true },
    { text: 'Kuttii 😂🐾', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Re gawarr 😹✨', mood: 'ew_cringe', sfx: 'ew_boing', priority: true },
    { text: 'Bauni 🤏😂', mood: 'jump', sfx: 'jump', priority: true },
    { text: 'Amino 💖🎀', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: 'Nanki hi bhagwaan hai 👑🙏', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: 'Aapki friend ka number milega? 📱😉', mood: 'shy_blush', sfx: 'giggle', priority: true },
    { text: 'Pani Piyogi Cutie... 💧🥺', mood: 'shy_blush', sfx: 'awww_chime', priority: true },
    { text: 'Cutie, aap pani pite ho? 🥤🤭', mood: 'shy_blush', sfx: 'giggle', priority: true },
    { text: 'One more periods left ⏳🔔', mood: 'surprised', sfx: 'surprise_bling', priority: true },
    { text: '17 yrs ki Bauni 🎂📏✨', mood: 'jump', sfx: 'confetti_burst', priority: true },
    { text: 'Hehe Lol 😆🎉', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Hechehehe 🤭✨', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Ummm... 🤔💭', mood: 'surprised', sfx: 'tap', priority: true },
    { text: 'hmmm... 👀✨', mood: 'shy_blush', sfx: 'tap', priority: true },
    { text: 'Auuuuww... 🥺💗', mood: 'happy_smile', sfx: 'awww_chime', priority: true },
    { text: 'Lessssgooooo... 🚀🔥', mood: 'jump', sfx: 'jump', priority: true },
    { text: 'Acchaww Bauni 🎡😂', mood: 'laugh', sfx: 'giggle', priority: true },
    { text: 'Mwah! Mini birthday kiss from Modino! 😘💗', mood: 'kiss', sfx: 'kiss_pop' },
    { text: 'Hehe that tickles! Stop poking Modino! 🫣🐾', mood: 'shy_blush', sfx: 'giggle' },
    { text: 'Hydration check! Cutie, aap pani pite ho? 💧🥤', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Breaking news: Bauni turns 17 today! 📰🎂', mood: 'surprised', sfx: 'surprise_bling' },
    { text: "Modino works overtime for Morgan's birthday! 🎀✨", mood: 'jump', sfx: 'jump' },
    { text: 'Boop! One free smile delivered! 😊💖', mood: 'kiss', sfx: 'kiss_pop' },
    { text: 'Ummm... are you just tapping me for fun now? 👀😆', mood: 'laugh', sfx: 'giggle' },
    { text: 'hmmm... 10 out of 10 tap technique! 👏✨', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'byeee bachhaww... jk I am still right here! 👋😜', mood: 'laugh', sfx: 'giggle' },
  ],
};

export function getModinoDialogueStats(): { totalEntries: number; uniqueTexts: number } {
  const unique = new Set<string>();
  let totalEntries = 0;

  for (const bank of Object.values(MODINO_REACTION_BANKS)) {
    totalEntries += bank.length;
    for (const item of bank) {
      unique.add(item.text);
    }
  }
  totalEntries += MODINO_SLEEP_MUTTERS.length + MODINO_WAKE_LINES.length;
  for (const mutter of MODINO_SLEEP_MUTTERS) {
    unique.add(mutter);
  }
  for (const wake of MODINO_WAKE_LINES) {
    unique.add(wake.text);
  }

  return { totalEntries, uniqueTexts: unique.size };
}

function fisherYatesShuffle(indices: number[], randomFn: () => number): number[] {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Interleaves original priority lines toward the front half on the very first visit
 * while keeping fresh lines seamlessly mixed in, preserving 100% full-deck coverage.
 * Note: Deck is popped from the END (highest index first).
 */
function buildInitialWeightedDeck(
  bank: readonly ModinoReaction[],
  indices: number[],
  randomFn: () => number,
): number[] {
  const priorityIndices = fisherYatesShuffle(
    indices.filter((i) => bank[i].priority),
    randomFn,
  );
  const freshIndices = fisherYatesShuffle(
    indices.filter((i) => !bank[i].priority),
    randomFn,
  );

  if (priorityIndices.length === 0 || freshIndices.length === 0) {
    return fisherYatesShuffle(indices, randomFn);
  }

  // Build draw order (pop-first at index 0, then reverse for end-popping stack):
  // Draw ~2 priority lines for every 1 fresh line while both pools have items.
  const drawOrder: number[] = [];
  let p = 0;
  let f = 0;
  while (p < priorityIndices.length || f < freshIndices.length) {
    if (p < priorityIndices.length) drawOrder.push(priorityIndices[p++]);
    if (p < priorityIndices.length) drawOrder.push(priorityIndices[p++]);
    if (f < freshIndices.length) drawOrder.push(freshIndices[f++]);
  }
  return drawOrder.reverse();
}

/**
 * Re-orders a direct_tap deck so consecutive draws avoid sharing the same mood,
 * ensuring smooth visual variety across rapid tapping.
 */
function deClumpMoods(
  bank: readonly ModinoReaction[],
  stackOrder: number[],
  previousMood: ModinoMood | null,
): number[] {
  // Work in draw order (first drawn at index 0), then reverse back to pop-from-end stack
  const remaining = [...stackOrder].reverse();
  const arranged: number[] = [];
  let prevMood = previousMood;

  while (remaining.length > 0) {
    let pickIdx = remaining.findIndex((idx) => bank[idx].mood !== prevMood);
    if (pickIdx === -1) {
      pickIdx = 0;
    }
    const [chosen] = remaining.splice(pickIdx, 1);
    arranged.push(chosen);
    prevMood = bank[chosen].mood;
  }

  return arranged.reverse();
}

export interface ModinoReactionEngine {
  next: (category: ModinoReactionCategory) => ModinoReaction;
  nextWakeUp: () => ModinoReaction;
  nextSleepMutter: () => string;
  getRecentTexts: () => readonly string[];
  reset: () => void;
}

/**
 * Two-layer anti-repetition engine:
 * 1. Per-category Fisher-Yates shuffle bags (every line spoken once before reshuffling)
 * 2. Global 18-item recent-memory ring buffer across ALL categories + wakeup
 * 3. Zero back-to-back mood repeats on consecutive direct taps
 */
export function createModinoReactionEngine(
  randomFn: () => number = Math.random,
): ModinoReactionEngine {
  const decks = new Map<ModinoReactionCategory, number[]>();
  const initializedCategories = new Set<ModinoReactionCategory>();
  const lastIndexByCategory = new Map<ModinoReactionCategory, number>();
  const recentTexts: string[] = [];
  let hasDeliveredFirstGreeting = false;
  let lastDirectTapMood: ModinoMood | null = null;
  let wakeDeck: number[] = [];
  let lastWakeIndex: number | undefined;
  let sleepDeck: number[] = [];
  let lastSleepIndex: number | undefined;

  const pushRecent = (text: string) => {
    const existingIdx = recentTexts.indexOf(text);
    if (existingIdx !== -1) {
      recentTexts.splice(existingIdx, 1);
    }
    recentTexts.push(text);
    if (recentTexts.length > GLOBAL_HISTORY_SIZE) {
      recentTexts.shift();
    }
  };

  const refillDeck = (category: ModinoReactionCategory): number[] => {
    const bank = MODINO_REACTION_BANKS[category];
    const allIndices = bank.map((_, i) => i);
    const isFirstVisit = !initializedCategories.has(category);
    initializedCategories.add(category);

    let shuffled = isFirstVisit
      ? buildInitialWeightedDeck(bank, allIndices, randomFn)
      : fisherYatesShuffle(allIndices, randomFn);

    const lastIdx = lastIndexByCategory.get(category);

    // Ensure the top of the fresh shuffle (end of array) never equals lastIdx
    if (shuffled.length > 1 && lastIdx !== undefined && shuffled[shuffled.length - 1] === lastIdx) {
      const tmp = shuffled[0];
      shuffled[0] = shuffled[shuffled.length - 1];
      shuffled[shuffled.length - 1] = tmp;
    }

    if (category === 'direct_tap') {
      shuffled = deClumpMoods(bank, shuffled, lastDirectTapMood);
    }

    decks.set(category, shuffled);
    return shuffled;
  };

  const pickBestPosition = (
    category: ModinoReactionCategory,
    deck: number[],
    bank: readonly ModinoReaction[],
  ): number => {
    const isDirectTap = category === 'direct_tap';

    // Pass 1 (direct_tap): not in global 18-line history AND mood differs from last direct tap
    if (isDirectTap && lastDirectTapMood !== null) {
      for (let pos = deck.length - 1; pos >= 0; pos--) {
        const candidate = bank[deck[pos]];
        if (!recentTexts.includes(candidate.text) && candidate.mood !== lastDirectTapMood) {
          return pos;
        }
      }
    }

    // Pass 2: not in global 18-line history
    for (let pos = deck.length - 1; pos >= 0; pos--) {
      const candidate = bank[deck[pos]];
      if (!recentTexts.includes(candidate.text)) {
        return pos;
      }
    }

    // Pass 3 (small category fallback): least-recently-used line in global history
    // (preferring a different mood on direct_tap)
    let bestPos = deck.length - 1;
    let bestRecency = Infinity;
    let bestMoodPenalty = Infinity;

    for (let pos = deck.length - 1; pos >= 0; pos--) {
      const candidate = bank[deck[pos]];
      const recencyIdx = recentTexts.indexOf(candidate.text);
      const moodPenalty =
        isDirectTap && lastDirectTapMood !== null && candidate.mood === lastDirectTapMood ? 1 : 0;

      if (
        moodPenalty < bestMoodPenalty ||
        (moodPenalty === bestMoodPenalty && recencyIdx < bestRecency)
      ) {
        bestMoodPenalty = moodPenalty;
        bestRecency = recencyIdx;
        bestPos = pos;
      }
    }

    return bestPos;
  };

  const next = (category: ModinoReactionCategory): ModinoReaction => {
    const bank = MODINO_REACTION_BANKS[category];

    // Primary signature birthday greeting ALWAYS plays first on site reveal
    if (category === 'greeting' && !hasDeliveredFirstGreeting) {
      hasDeliveredFirstGreeting = true;
      initializedCategories.add('greeting');
      lastIndexByCategory.set('greeting', 0);
      const remainingIndices = bank.map((_, i) => i).filter((i) => i !== 0);
      decks.set('greeting', buildInitialWeightedDeck(bank, remainingIndices, randomFn));
      pushRecent(MODINO_SIGNATURE_GREETING.text);
      return MODINO_SIGNATURE_GREETING;
    }

    let deck = decks.get(category);
    if (!deck || deck.length === 0) {
      deck = refillDeck(category);
    }

    const chosenPos = pickBestPosition(category, deck, bank);
    const [chosenIndex] = deck.splice(chosenPos, 1);
    lastIndexByCategory.set(category, chosenIndex);
    const reaction = bank[chosenIndex];

    if (category === 'direct_tap') {
      lastDirectTapMood = reaction.mood;
    }

    pushRecent(reaction.text);
    return reaction;
  };

  const nextWakeUp = (): ModinoReaction => {
    if (wakeDeck.length === 0) {
      wakeDeck = fisherYatesShuffle(
        MODINO_WAKE_LINES.map((_, i) => i),
        randomFn,
      );
      if (wakeDeck.length > 1 && lastWakeIndex !== undefined && wakeDeck[wakeDeck.length - 1] === lastWakeIndex) {
        const tmp = wakeDeck[0];
        wakeDeck[0] = wakeDeck[wakeDeck.length - 1];
        wakeDeck[wakeDeck.length - 1] = tmp;
      }
    }

    let chosenPos = wakeDeck.length - 1;
    for (let pos = wakeDeck.length - 1; pos >= 0; pos--) {
      if (!recentTexts.includes(MODINO_WAKE_LINES[wakeDeck[pos]].text)) {
        chosenPos = pos;
        break;
      }
    }

    const [idx] = wakeDeck.splice(chosenPos, 1);
    lastWakeIndex = idx;
    const reaction = MODINO_WAKE_LINES[idx];
    pushRecent(reaction.text);
    return reaction;
  };

  const nextSleepMutter = (): string => {
    if (sleepDeck.length === 0) {
      sleepDeck = fisherYatesShuffle(
        MODINO_SLEEP_MUTTERS.map((_, i) => i),
        randomFn,
      );
      if (
        sleepDeck.length > 1 &&
        lastSleepIndex !== undefined &&
        sleepDeck[sleepDeck.length - 1] === lastSleepIndex
      ) {
        const tmp = sleepDeck[0];
        sleepDeck[0] = sleepDeck[sleepDeck.length - 1];
        sleepDeck[sleepDeck.length - 1] = tmp;
      }
    }
    const idx = sleepDeck.pop() ?? 0;
    lastSleepIndex = idx;
    return MODINO_SLEEP_MUTTERS[idx];
  };

  const reset = (): void => {
    decks.clear();
    initializedCategories.clear();
    lastIndexByCategory.clear();
    recentTexts.length = 0;
    hasDeliveredFirstGreeting = false;
    lastDirectTapMood = null;
    wakeDeck = [];
    lastWakeIndex = undefined;
    sleepDeck = [];
    lastSleepIndex = undefined;
  };

  return {
    next,
    nextWakeUp,
    nextSleepMutter,
    getRecentTexts: () => [...recentTexts],
    reset,
  };
}

export const modinoReactionEngine = createModinoReactionEngine();

/* ==========================================================================
   Floating Micro-Hearts With Progressive Fade ("More on Modino")
   ========================================================================== */

export interface ModinoMicroHeart {
  id: number;
  size: number;
  color: string;
  startX: number;
  dx: number;
  dxMid: number;
  dy: number;
  rot: number;
  durationMs: number;
  delayMs: number;
  reducedMotion: boolean;
}

const WARM_HEART_MOODS: ReadonlySet<ModinoMood> = new Set([
  'greeting',
  'kiss',
  'shy_blush',
  'happy_smile',
]);

const WARM_HEART_CATEGORIES: ReadonlySet<ModinoReactionCategory> = new Set([
  'cute',
  'greeting',
  'ending',
]);

const POSITIVE_MILESTONE_CATEGORIES: ReadonlySet<ModinoReactionCategory> = new Set([
  'backstory',
  'interaction_hype',
  'spin',
  'friends_and_banter',
  'last_playback',
]);

/**
 * Determines how many pastel micro-hearts Modino should release:
 * - Never emits during `sleepy_zzz` or `ew_cringe`
 * - Direct interaction: 2 to 4 hearts (max 1 if prefers-reduced-motion)
 * - Warm/expressive states (`cute`, `greeting`, `kiss`, `shy_blush`, `happy_smile`, `ending`): 2 to 3 hearts
 * - Positive section milestones: ~35% chance of 1 subtle ambient heart
 */
export function getModinoMicroHeartCount(params: {
  trigger: 'direct_tap' | 'category';
  mood: ModinoMood;
  category?: ModinoReactionCategory;
  reducedMotion?: boolean;
  randomFn?: () => number;
}): number {
  const { trigger, mood, category, reducedMotion = false, randomFn = Math.random } = params;

  if (mood === 'sleepy_zzz' || mood === 'ew_cringe') {
    return 0;
  }

  if (trigger === 'direct_tap') {
    if (reducedMotion) return 1;
    return 2 + Math.floor(randomFn() * 3); // 2, 3, or 4
  }

  if (WARM_HEART_MOODS.has(mood) || (category && WARM_HEART_CATEGORIES.has(category))) {
    if (reducedMotion) return 1;
    return 2 + Math.floor(randomFn() * 2); // 2 or 3
  }

  if (category && POSITIVE_MILESTONE_CATEGORIES.has(category)) {
    return randomFn() < 0.35 ? 1 : 0;
  }

  return 0;
}

/**
 * Generates randomized organic motion parameters for a burst of tiny pastel hearts.
 */
export function createModinoMicroHearts(
  count: number,
  nextId: () => number,
  options?: {
    reducedMotion?: boolean;
    randomFn?: () => number;
    colorOffset?: number;
  },
): ModinoMicroHeart[] {
  if (count <= 0) return [];
  const reducedMotion = options?.reducedMotion ?? false;
  const rand = options?.randomFn ?? Math.random;
  const safeCount = reducedMotion ? Math.min(1, count) : count;
  const colorOffset = options?.colorOffset ?? Math.floor(rand() * MODINO_HEART_COLORS.length);

  const particles: ModinoMicroHeart[] = [];
  let cumulativeDelay = 0;

  for (let i = 0; i < safeCount; i++) {
    const id = nextId();
    const size = Math.round(8 + rand() * 5); // 8px to 13px
    const color = MODINO_HEART_COLORS[(colorOffset + i) % MODINO_HEART_COLORS.length];

    if (reducedMotion) {
      particles.push({
        id,
        size: Math.min(11, size),
        color,
        startX: Math.round((rand() - 0.5) * 10),
        dx: 0,
        dxMid: 0,
        dy: -12,
        rot: 0,
        durationMs: 900,
        delayMs: 0,
        reducedMotion: true,
      });
      continue;
    }

    // Bias micro-hearts gently upward and inward (toward center-right) from Modino's bottom-left dock
    const fanBias =
      safeCount > 1 ? 2 + (i / (safeCount - 1)) * 20 : 6 + rand() * 14;
    const dx = Math.max(-26, Math.min(26, Math.round(fanBias + (rand() - 0.35) * 10)));
    const curveWobble = Math.round((rand() - 0.4) * 10);
    const dxMid = Math.max(-28, Math.min(28, Math.round(dx * 0.52 + curveWobble)));
    const dy = -Math.round(48 + rand() * 34); // -48px to -82px
    const rot = Math.round((rand() * 36) - 18); // -18deg to +18deg
    const durationMs = Math.round(1350 + rand() * 500); // 1350ms to 1850ms
    const startX = Math.round(rand() * 18 - 4);

    if (i > 0) {
      cumulativeDelay += Math.round(70 + rand() * 70); // 70ms to 140ms stagger
    }

    particles.push({
      id,
      size,
      color,
      startX,
      dx,
      dxMid,
      dy,
      rot,
      durationMs,
      delayMs: cumulativeDelay,
      reducedMotion: false,
    });
  }

  return particles;
}

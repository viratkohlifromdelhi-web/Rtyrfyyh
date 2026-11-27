/**
 * Modino Personality Brain & Non-Repeating Fisher-Yates Shuffle-Bag Engine.
 * Strictly zero visible dashes (—, –, -) in every speech line.
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
}

export const MODINO_SIGNATURE_GREETING: ModinoReaction = {
  text: "Hey Bra, (Not Bro) Happy B'day! 🎂✨",
  mood: 'greeting',
  sfx: 'awww_chime',
};

export const MODINO_SLEEP_MUTTERS: readonly string[] = [
  'zzzz... 💤',
  'hmmm... 😴',
  'Ummm... 💤',
];

export const MODINO_WAKE_LINES: readonly ModinoReaction[] = [
  { text: 'Ummm... I was awake! 👀', mood: 'surprised', sfx: 'wake_chirp' },
  { text: 'hmmm... kya hua? 🫣', mood: 'surprised', sfx: 'wake_chirp' },
  { text: "Hey! Don't wake Modino! 😆", mood: 'surprised', sfx: 'wake_chirp' },
];

export const MODINO_REACTION_BANKS: Record<ModinoReactionCategory, readonly ModinoReaction[]> = {
  greeting: [
    MODINO_SIGNATURE_GREETING,
    {
      text: '17 yrs ki Bauni officially unlocked! 🎉👑',
      mood: 'happy_smile',
      sfx: 'confetti_burst',
    },
    {
      text: "Hey Bra, (Not Bro) Happy B'day! Ready for chaos? 🎀😆",
      mood: 'jump',
      sfx: 'jump',
    },
  ],

  cute: [
    { text: 'Auuuuww... 🥺💗', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Achhaw Cutie 🌸✨', mood: 'shy_blush', sfx: 'awww_chime' },
    { text: 'Auuuuww... so cute! 🥹🎀', mood: 'kiss', sfx: 'kiss_pop' },
    { text: 'Pani Piyogi Cutie... 💧😊', mood: 'shy_blush', sfx: 'giggle' },
    { text: 'Cutie, aap pani pite ho? 🥤🤭', mood: 'shy_blush', sfx: 'giggle' },
  ],

  gift_ew: [
    { text: 'Ewwww... 💀😂', mood: 'ew_cringe', sfx: 'ew_boing' },
    { text: 'Re gawarr 😹🙌', mood: 'laugh', sfx: 'giggle' },
    { text: 'Ewwww... kuch nahi mila kya? 😭🤣', mood: 'ew_cringe', sfx: 'ew_boing' },
    { text: 'Hehe Lol scammed! 🤡😂', mood: 'laugh', sfx: 'ew_boing' },
    { text: 'Ummm... better luck next birthday! 🫣💀', mood: 'surprised', sfx: 'surprise_bling' },
  ],

  backstory: [
    { text: "memories, let's go 📖✨", mood: 'happy_smile', sfx: 'awww_chime' },
    {
      text: "memories, let's go! 12:29 AM lore hits different 🕰️🥹",
      mood: 'shy_blush',
      sfx: 'awww_chime',
    },
    { text: 'Ummm... nostalgia overload! 💭💗', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'hmmm... iconic plot twist right there 👀✨', mood: 'surprised', sfx: 'surprise_bling' },
  ],

  interaction_hype: [
    { text: 'Lessssgooooo... 🚀🎉', mood: 'jump', sfx: 'jump' },
    { text: 'Lessssgooooo... full chaos mode! 🔥😆', mood: 'jump', sfx: 'confetti_burst' },
    { text: 'One more periods left ⏳😂', mood: 'laugh', sfx: 'giggle' },
    { text: 'Nanki hi bhagwaan hai 👑🙏✨', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Hehe Lol 😂✨', mood: 'laugh', sfx: 'giggle' },
  ],

  spin: [
    { text: 'Acchaww Bauni 🎡😂', mood: 'laugh', sfx: 'giggle' },
    { text: '17 yrs ki Bauni spinning destiny! 🌀😆', mood: 'surprised', sfx: 'surprise_bling' },
    { text: 'Bauni energy maxed out! 📏🤣', mood: 'jump', sfx: 'jump' },
    { text: 'Lessssgooooo... plot twist incoming! 👀✨', mood: 'surprised', sfx: 'surprise_bling' },
  ],

  friends_and_banter: [
    { text: 'Aapki friend ka number milega? 📱😏', mood: 'shy_blush', sfx: 'giggle' },
    { text: 'Kuttii 😂🐾', mood: 'laugh', sfx: 'giggle' },
    { text: 'Amino 💖✨', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Bauni 🤏😆', mood: 'laugh', sfx: 'giggle' },
    { text: 'Re gawarr 😤😂', mood: 'ew_cringe', sfx: 'ew_boing' },
    { text: 'Nanki hi bhagwaan hai 👑✨', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: '17 yrs ki Bauni 🎂📏', mood: 'jump', sfx: 'jump' },
    { text: 'One more periods left 😅🔔', mood: 'surprised', sfx: 'surprise_bling' },
  ],

  last_playback: [
    { text: 'Hechehehe 🐣🤭', mood: 'laugh', sfx: 'giggle' },
    { text: 'Hechehehe AYUSH lore unlocked! 🐥😂', mood: 'laugh', sfx: 'confetti_burst' },
    { text: 'Hehe Lol plot twist of the century! 🤣🥚', mood: 'surprised', sfx: 'surprise_bling' },
    { text: 'Auuuuww... tiny chicken family! 🥺🐣', mood: 'shy_blush', sfx: 'awww_chime' },
  ],

  ending: [
    { text: 'byeee bachhaww 👋💗✨', mood: 'kiss', sfx: 'kiss_pop' },
    { text: 'byeee bachhaww! Modino loves this birthday! 🥹🎀', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Hechehehe byeee bachhaww! 😘🎉', mood: 'kiss', sfx: 'kiss_pop' },
  ],

  direct_tap: [
    { text: "Hey Bra, (Not Bro) Happy B'day! 🎂😆", mood: 'greeting', sfx: 'awww_chime' },
    { text: 'Achhaw Cutie 🌸😊', mood: 'shy_blush', sfx: 'awww_chime' },
    { text: 'Kuttii 😂🐾', mood: 'laugh', sfx: 'giggle' },
    { text: 'Re gawarr 😹✨', mood: 'ew_cringe', sfx: 'ew_boing' },
    { text: 'Bauni 🤏😂', mood: 'jump', sfx: 'jump' },
    { text: 'Amino 💖🎀', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Nanki hi bhagwaan hai 👑🙏', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Aapki friend ka number milega? 📱😉', mood: 'shy_blush', sfx: 'giggle' },
    { text: 'Pani Piyogi Cutie... 💧🥺', mood: 'shy_blush', sfx: 'awww_chime' },
    { text: 'Cutie, aap pani pite ho? 🥤🤭', mood: 'shy_blush', sfx: 'giggle' },
    { text: 'One more periods left ⏳🔔', mood: 'surprised', sfx: 'surprise_bling' },
    { text: '17 yrs ki Bauni 🎂📏✨', mood: 'jump', sfx: 'confetti_burst' },
    { text: 'Hehe Lol 😆🎉', mood: 'laugh', sfx: 'giggle' },
    { text: 'Hechehehe 🤭✨', mood: 'laugh', sfx: 'giggle' },
    { text: 'Ummm... 🤔💭', mood: 'surprised', sfx: 'tap' },
    { text: 'hmmm... 👀✨', mood: 'shy_blush', sfx: 'tap' },
    { text: 'Auuuuww... 🥺💗', mood: 'happy_smile', sfx: 'awww_chime' },
    { text: 'Lessssgooooo... 🚀🔥', mood: 'jump', sfx: 'jump' },
    { text: 'Acchaww Bauni 🎡😂', mood: 'laugh', sfx: 'giggle' },
    { text: 'Mwah! Birthday kiss from Modino! 😘💗', mood: 'kiss', sfx: 'kiss_pop' },
    { text: 'Stop poking Modino, cutie! 🫣💖', mood: 'shy_blush', sfx: 'giggle' },
    { text: 'Ewwww... kidding! Happy 17th! 😜🎂', mood: 'ew_cringe', sfx: 'ew_boing' },
  ],
};

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

export interface ModinoReactionEngine {
  next: (category: ModinoReactionCategory) => ModinoReaction;
  nextWakeUp: () => ModinoReaction;
  nextSleepMutter: () => string;
  getRecentTexts: () => readonly string[];
  reset: () => void;
}

/**
 * Creates a non-repeating Fisher-Yates shuffle-bag reaction engine with a 6-item
 * recentTexts ring buffer so consecutive taps and section visits never feel repetitive.
 */
export function createModinoReactionEngine(randomFn: () => number = Math.random): ModinoReactionEngine {
  const decks = new Map<ModinoReactionCategory, number[]>();
  const lastIndexByCategory = new Map<ModinoReactionCategory, number>();
  const recentTexts: string[] = [];
  let hasDeliveredFirstGreeting = false;
  let wakeDeck: number[] = [];
  let sleepMutterIdx = 0;

  const pushRecent = (text: string) => {
    recentTexts.push(text);
    if (recentTexts.length > 6) {
      recentTexts.shift();
    }
  };

  const refillDeck = (category: ModinoReactionCategory): number[] => {
    const bank = MODINO_REACTION_BANKS[category];
    const allIndices = bank.map((_, i) => i);
    const shuffled = fisherYatesShuffle(allIndices, randomFn);
    const lastIdx = lastIndexByCategory.get(category);

    // Ensure the first popped item of a fresh shuffle (at the end of array) never equals lastIdx
    if (shuffled.length > 1 && lastIdx !== undefined && shuffled[shuffled.length - 1] === lastIdx) {
      const swapWith = 0;
      const tmp = shuffled[swapWith];
      shuffled[swapWith] = shuffled[shuffled.length - 1];
      shuffled[shuffled.length - 1] = tmp;
    }

    decks.set(category, shuffled);
    return shuffled;
  };

  const next = (category: ModinoReactionCategory): ModinoReaction => {
    const bank = MODINO_REACTION_BANKS[category];

    // Primary signature birthday greeting ALWAYS plays first on site reveal
    if (category === 'greeting' && !hasDeliveredFirstGreeting) {
      hasDeliveredFirstGreeting = true;
      lastIndexByCategory.set('greeting', 0);
      const remaining = fisherYatesShuffle(
        bank.map((_, i) => i).filter((i) => i !== 0),
        randomFn,
      );
      decks.set('greeting', remaining);
      pushRecent(MODINO_SIGNATURE_GREETING.text);
      return MODINO_SIGNATURE_GREETING;
    }

    let deck = decks.get(category);
    if (!deck || deck.length === 0) {
      deck = refillDeck(category);
    }

    // Prefer an item in the current deck not present in the 6-item recentTexts ring buffer
    let chosenPos = deck.length - 1;
    for (let pos = deck.length - 1; pos >= 0; pos--) {
      const candidateText = bank[deck[pos]].text;
      if (!recentTexts.includes(candidateText)) {
        chosenPos = pos;
        break;
      }
    }

    const [chosenIndex] = deck.splice(chosenPos, 1);
    lastIndexByCategory.set(category, chosenIndex);
    const reaction = bank[chosenIndex];
    pushRecent(reaction.text);
    return reaction;
  };

  const nextWakeUp = (): ModinoReaction => {
    if (wakeDeck.length === 0) {
      wakeDeck = fisherYatesShuffle(
        MODINO_WAKE_LINES.map((_, i) => i),
        randomFn,
      );
    }
    const idx = wakeDeck.pop() ?? 0;
    const reaction = MODINO_WAKE_LINES[idx];
    pushRecent(reaction.text);
    return reaction;
  };

  const nextSleepMutter = (): string => {
    const text = MODINO_SLEEP_MUTTERS[sleepMutterIdx % MODINO_SLEEP_MUTTERS.length];
    sleepMutterIdx += 1;
    return text;
  };

  const reset = (): void => {
    decks.clear();
    lastIndexByCategory.clear();
    recentTexts.length = 0;
    hasDeliveredFirstGreeting = false;
    wakeDeck = [];
    sleepMutterIdx = 0;
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

import { useEffect, useState, type FormEvent } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { CELEBRANT, SEEDED_WISHES } from '../data/celebrationData';
import {
  addWishToWall,
  createWishEntry,
  loadWishesFromStorage,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  removeWishFromWall,
  saveWishesToStorage,
  validateWishInput,
  type GuestbookWish,
  type NoteTone,
} from '../utils/guestbook';
import { HandDrawnHeartSvg, SparkleStarSvg } from './DoodleSvgs';

interface GuestbookSectionProps {
  onWishPosted: (originX?: number, originY?: number) => void;
}

const NOTE_TONE_STYLES: Record<
  NoteTone,
  { label: string; cardBg: string; border: string; swatch: string; tape: string }
> = {
  blush: {
    label: 'Blush Pink',
    cardBg: 'bg-[#FFF0F5]',
    border: 'border-[#F3C5D6]',
    swatch: 'bg-[#F8C8D8]',
    tape: 'bg-[#F4A6C1]/70',
  },
  cream: {
    label: 'Warm Cream',
    cardBg: 'bg-[#FFFDF5]',
    border: 'border-[#EFE2C8]',
    swatch: 'bg-[#F7E9CE]',
    tape: 'bg-[#E8C89E]/70',
  },
  champagne: {
    label: 'Champagne Rose',
    cardBg: 'bg-[#FFF4EE]',
    border: 'border-[#F1D2C5]',
    swatch: 'bg-[#F4C8B6]',
    tape: 'bg-[#E5B09B]/70',
  },
  lavender: {
    label: 'Soft Lilac',
    cardBg: 'bg-[#F9F2FC]',
    border: 'border-[#E5CEF0]',
    swatch: 'bg-[#E2C2F0]',
    tape: 'bg-[#CFA6E4]/70',
  },
};

const TONE_KEYS: NoteTone[] = ['blush', 'cream', 'champagne', 'lavender'];

export function GuestbookSection({ onWishPosted }: GuestbookSectionProps) {
  const [wishes, setWishes] = useState<GuestbookWish[]>(() =>
    loadWishesFromStorage(SEEDED_WISHES)
  );
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<NoteTone>('blush');
  const [nameError, setNameError] = useState<string | undefined>();
  const [messageError, setMessageError] = useState<string | undefined>();
  const [justPostedId, setJustPostedId] = useState<string | null>(null);

  useEffect(() => {
    saveWishesToStorage(wishes);
  }, [wishes]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validation = validateWishInput(name, message);
    setNameError(validation.nameError);
    setMessageError(validation.messageError);

    if (!validation.valid) {
      return;
    }

    const entry = createWishEntry({
      name,
      message,
      tone,
      existingCount: wishes.length,
    });

    setWishes((prev) => addWishToWall(prev, entry));
    setJustPostedId(entry.id);
    setName('');
    setMessage('');

    const rect = e.currentTarget.getBoundingClientRect();
    onWishPosted(rect.left + rect.width / 2, rect.top + 80);
  };

  const handleDelete = (wishId: string) => {
    setWishes((prev) => removeWishFromWall(prev, wishId));
  };

  return (
    <section
      id="guestbook"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFFDF9] to-[#FFF2F6] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#B7416E]">
              Digital Guestbook
            </p>
            <h2 className="font-display mt-2 text-balance text-3xl font-semibold tracking-tight text-[#4A122C] sm:text-4xl lg:text-5xl">
              Leave a Wish on the Memory Wall
            </h2>
          </div>
          <p
            data-testid="wish-count"
            className="text-sm font-medium text-[#7A3F58] tabular-nums"
          >
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'} pinned &middot; Saved on this
            device
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Leave a Wish Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-3xl border border-[#F0D5DF] bg-[#FFFDF9] p-6 shadow-[0_18px_42px_-20px_rgba(74,18,44,0.18)] sm:p-7 lg:col-span-5"
          >
            <h3 className="font-display text-2xl font-semibold text-[#4A122C]">
              Write a note for {CELEBRANT.name}
            </h3>
            <p className="mt-1 text-sm text-[#6B334D]">
              Add a birthday wish or favorite memory — it pins right onto the wall.
            </p>

            <div className="mt-6 space-y-5">
              {/* Name Input */}
              <div>
                <label
                  htmlFor="guestbook-name"
                  className="block text-sm font-semibold text-[#4A122C]"
                >
                  Your Name
                </label>
                <input
                  id="guestbook-name"
                  name="name"
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(undefined);
                  }}
                  placeholder="e.g. Sienna"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? 'guestbook-name-error' : undefined}
                  className="mt-1.5 w-full rounded-xl border border-[#E5C6D2] bg-[#FFFDF9] px-4 py-3 text-sm text-[#3B1325] placeholder:text-[#A87D8E] transition-colors focus:border-[#B7416E] focus:outline-none focus:ring-2 focus:ring-[#F7C6D7]"
                />
                {nameError && (
                  <p
                    id="guestbook-name-error"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-[#B5224E]"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="guestbook-message"
                    className="block text-sm font-semibold text-[#4A122C]"
                  >
                    Your Birthday Message
                  </label>
                  <span className="text-xs text-[#9A5A72] tabular-nums">
                    {message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <textarea
                  id="guestbook-message"
                  name="message"
                  rows={4}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (messageError) setMessageError(undefined);
                  }}
                  placeholder="Share a favorite memory, inside joke, or wish for year 24..."
                  aria-invalid={Boolean(messageError)}
                  aria-describedby={messageError ? 'guestbook-message-error' : undefined}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#E5C6D2] bg-[#FFFDF9] px-4 py-3 text-sm leading-relaxed text-[#3B1325] placeholder:text-[#A87D8E] transition-colors focus:border-[#B7416E] focus:outline-none focus:ring-2 focus:ring-[#F7C6D7]"
                />
                {messageError && (
                  <p
                    id="guestbook-message-error"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-[#B5224E]"
                  >
                    {messageError}
                  </p>
                )}
              </div>

              {/* Sticky Note Paper Color Picker */}
              <div>
                <span className="block text-sm font-semibold text-[#4A122C]">
                  Note Paper Shade
                </span>
                <div className="mt-2 flex items-center gap-3">
                  {TONE_KEYS.map((key) => {
                    const meta = NOTE_TONE_STYLES[key];
                    const selected = tone === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTone(key)}
                        aria-pressed={selected}
                        aria-label={`Select ${meta.label} note paper`}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A122C] ${
                          selected
                            ? 'scale-110 border-[#4A122C]'
                            : 'border-transparent hover:scale-105'
                        }`}
                      >
                        <span
                          className={`block h-7 w-7 rounded-full border border-[#4A122C]/15 ${meta.swatch}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#4A122C] px-6 py-3.5 text-sm font-semibold text-[#FFFDF9] shadow-[0_12px_26px_-8px_rgba(74,18,44,0.42)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#61193A] active:scale-[0.99] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7416E]"
              >
                <Send className="h-4 w-4 text-[#F7C6D7]" aria-hidden="true" />
                <span>Pin Wish to Memory Wall</span>
              </button>
            </div>
          </form>

          {/* Right Column: Sparkling Virtual Memory Wall */}
          <div className="lg:col-span-7">
            {wishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E5B8C8] bg-[#FFFDF9]/80 px-6 py-16 text-center">
                <HandDrawnHeartSvg className="h-10 w-10 text-[#DF94AB]" />
                <p className="font-display mt-3 text-xl font-medium text-[#4A122C]">
                  The Memory Wall is ready for the first wish
                </p>
                <p className="mt-1 text-sm text-[#7A3F58]">
                  Write a note on the left to kick off {CELEBRANT.name}&rsquo;s 24th wall.
                </p>
              </div>
            ) : (
              <ul
                data-testid="memory-wall"
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              >
                {wishes.map((wish) => {
                  const style = NOTE_TONE_STYLES[wish.tone] ?? NOTE_TONE_STYLES.blush;
                  const isFresh = justPostedId === wish.id;
                  return (
                    <li
                      key={wish.id}
                      style={{ transform: `rotate(${wish.rotation}deg)` }}
                      className={`group relative rounded-2xl border p-5 pt-7 shadow-[0_14px_30px_-18px_rgba(74,18,44,0.22)] transition-transform duration-200 hover:rotate-0 hover:-translate-y-1 ${style.cardBg} ${style.border} ${
                        isFresh ? 'animate-pop-in' : ''
                      }`}
                    >
                      {/* Decorative pastel tape strip */}
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rounded-xs ${style.tape}`}
                      />

                      <SparkleStarSvg
                        aria-hidden="true"
                        className="animate-twinkle pointer-events-none absolute top-3 right-3 h-4 w-4 text-[#D98A9C]/75"
                      />

                      <p className="text-sm leading-relaxed text-[#451A2E]">
                        &ldquo;{wish.message}&rdquo;
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-[#4A122C]/10 pt-3">
                        <span className="font-display text-base font-semibold italic text-[#4A122C]">
                          — {wish.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDelete(wish.id)}
                          aria-label={`Remove wish from ${wish.name}`}
                          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-[#9A5A72] transition-colors hover:bg-[#4A122C]/10 hover:text-[#4A122C] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4A122C]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

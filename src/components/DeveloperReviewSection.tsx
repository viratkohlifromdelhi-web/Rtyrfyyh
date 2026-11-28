import React, { useCallback, useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getActiveAnalyticsSessionId, trackEvent } from '../utils/analytics';
import {
  DEVELOPER_REVIEW_COLLECTION,
  DEVELOPER_REVIEW_FAVORITES,
  DEVELOPER_REVIEW_STARTERS,
  MAX_FAVORITE_SELECTIONS,
  MAX_REVIEW_MESSAGE_LENGTH,
  appendSentReviewHistory,
  applyStarterChip,
  buildDeveloperReviewWriteFields,
  computeNextStarRating,
  detectReviewDeviceType,
  getModinoReviewReaction,
  getNextNoteNumber,
  getRatingReactionCaption,
  readSentReviewsHistory,
  readSessionTapliCount,
  toggleFavoriteChip,
  type DeveloperReviewFavorite,
  type DeveloperReviewRating,
  type LocalSentDeveloperReview,
  type ValidSubmittedRating,
} from '../utils/developerReviewCore';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { playUiSfx } from '../utils/uiSoundEngine';

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

const RECEIPT_SPARKLES: ReadonlyArray<{
  left: string;
  top: string;
  dx: string;
  dy: string;
  delay: string;
  dur: string;
  size: number;
}> = [
  { left: '8%', top: '62%', dx: '-8px', dy: '-34px', delay: '0ms', dur: '1950ms', size: 10 },
  { left: '17%', top: '46%', dx: '6px', dy: '-38px', delay: '260ms', dur: '2100ms', size: 8 },
  { left: '26%', top: '68%', dx: '-6px', dy: '-30px', delay: '520ms', dur: '1800ms', size: 9 },
  { left: '36%', top: '52%', dx: '8px', dy: '-36px', delay: '140ms', dur: '2050ms', size: 7 },
  { left: '47%', top: '64%', dx: '-5px', dy: '-40px', delay: '740ms', dur: '1900ms', size: 10 },
  { left: '58%', top: '48%', dx: '7px', dy: '-32px', delay: '380ms', dur: '2150ms', size: 8 },
  { left: '68%', top: '66%', dx: '-7px', dy: '-35px', delay: '920ms', dur: '1850ms', size: 9 },
  { left: '78%', top: '50%', dx: '6px', dy: '-38px', delay: '190ms', dur: '2000ms', size: 8 },
  { left: '86%', top: '64%', dx: '-6px', dy: '-32px', delay: '640ms', dur: '1920ms', size: 10 },
  { left: '93%', top: '46%', dx: '5px', dy: '-30px', delay: '420ms', dur: '2080ms', size: 7 },
];

function ChampagneStarIcon({ filled, bonus }: { filled: boolean; bonus: boolean }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className="h-[clamp(28px,4vw,38px)] w-[clamp(28px,4vw,38px)] transition-transform duration-150"
      aria-hidden="true"
    >
      <path
        d="M14 2.4l3.35 6.82 7.53 1.09-5.44 5.31 1.29 7.5L14 19.58 7.27 23.12l1.29-7.5-5.44-5.31 7.53-1.09L14 2.4z"
        fill={filled ? (bonus ? '#F7C948' : '#F3BA49') : '#FFF8EE'}
        stroke={filled ? (bonus ? '#B97812' : '#C98A22') : 'rgba(217, 75, 125, 0.36)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M14 5.2l2.1 4.4 4.8.7-3.45 3.35.8 4.75-4.25-2.22"
          fill="none"
          stroke="rgba(255, 252, 236, 0.72)"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function DeveloperReviewSection() {
  const [rating, setRating] = useState<DeveloperReviewRating>(0);
  const [poppingStar, setPoppingStar] = useState<number | null>(null);
  const [bonusBurstKey, setBonusBurstKey] = useState(0);
  const [shakeStarsKey, setShakeStarsKey] = useState(0);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const [selectedFavorites, setSelectedFavorites] = useState<DeveloperReviewFavorite[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deliveredReview, setDeliveredReview] = useState<LocalSentDeveloperReview | null>(null);
  const [sentHistory, setSentHistory] = useState<LocalSentDeveloperReview[]>(() =>
    readSentReviewsHistory(),
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const starPopTimerRef = useRef<number | null>(null);
  const focusScrollTimerRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (starPopTimerRef.current !== null) {
        window.clearTimeout(starPopTimerRef.current);
      }
      if (focusScrollTimerRef.current !== null) {
        window.clearTimeout(focusScrollTimerRef.current);
      }
    };
  }, []);

  const handleTextareaFocus = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    if (focusScrollTimerRef.current !== null) {
      window.clearTimeout(focusScrollTimerRef.current);
    }
    focusScrollTimerRef.current = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      focusScrollTimerRef.current = null;
    }, 220);
  }, []);

  const handleStarTap = useCallback(
    (starValue: 1 | 2 | 3 | 4 | 5) => {
      const { rating: nextRating, triggeredBonus } = computeNextStarRating(rating, starValue);
      if (triggeredBonus) {
        haptics.celebrate();
      } else {
        haptics.tap();
      }

      setRating(nextRating);
      setValidationMessage(null);
      setSubmitError(null);
      setPoppingStar(starValue);

      if (starPopTimerRef.current !== null) {
        window.clearTimeout(starPopTimerRef.current);
      }
      starPopTimerRef.current = window.setTimeout(() => {
        setPoppingStar(null);
        starPopTimerRef.current = null;
      }, 300);

      if (triggeredBonus) {
        setBonusBurstKey((k) => k + 1);
        playUiSfx('confetti_burst');
      } else {
        playUiSfx(starValue === 5 ? 'awww_chime' : 'tap');
      }
    },
    [rating],
  );

  const handleFavoriteToggle = useCallback((chip: DeveloperReviewFavorite) => {
    haptics.tap();
    setSelectedFavorites((prev) => toggleFavoriteChip(prev, chip, MAX_FAVORITE_SELECTIONS));
    setSubmitError(null);
    playUiSfx('toggle_click');
  }, []);

  const handleStarterTap = useCallback((starter: string) => {
    haptics.tap();
    setMessage((prev) => applyStarterChip(prev, starter, MAX_REVIEW_MESSAGE_LENGTH));
    setSubmitError(null);
    playUiSfx('tap');
    window.setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 10);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitting) return;

      if (rating === 0) {
        haptics.bump();
        setValidationMessage('Pick a star rating first!');
        setShakeStarsKey((k) => k + 1);
        playUiSfx('ew_boing');
        return;
      }

      if (!db) {
        haptics.bump();
        setSubmitError('Network hiccup! Tap again in a second.');
        return;
      }

      // Synchronous 0ms user-gesture haptic right on tap BEFORE async Firestore write
      haptics.medium();

      setSubmitting(true);
      setSubmitError(null);
      setValidationMessage(null);

      const validRating: ValidSubmittedRating = rating;
      const noteNumber = getNextNoteNumber(sentHistory);
      const writeFields = buildDeveloperReviewWriteFields({
        rating: validRating,
        bestThings: selectedFavorites,
        message,
        noteNumber,
        nowMs: Date.now(),
        sessionId: getActiveAnalyticsSessionId(),
        deviceType: detectReviewDeviceType(),
        sessionTaplis: readSessionTapliCount(),
      });

      try {
        await setDoc(doc(db, DEVELOPER_REVIEW_COLLECTION, writeFields.reviewId), {
          ...writeFields,
          submittedAt: serverTimestamp(),
        });

        const localEntry: LocalSentDeveloperReview = {
          reviewId: writeFields.reviewId,
          rating: writeFields.rating,
          isBonusRating: writeFields.isBonusRating,
          bestThings: writeFields.bestThings,
          message: writeFields.message,
          noteNumber: writeFields.noteNumber,
          submittedAtMs: writeFields.submittedAtMs,
          submittedAtIST: writeFields.submittedAtIST,
          deviceType: writeFields.deviceType,
          sessionTaplis: writeFields.sessionTaplis,
        };

        setSentHistory((prev) => appendSentReviewHistory(prev, localEntry));
        setDeliveredReview(localEntry);

        haptics.celebrate();
        playUiSfx(validRating >= 5 ? 'confetti_burst' : 'awww_chime');

        emitModinoEvent('ending', {
          force: true,
          source: 'developer-review-submit',
          customReaction: getModinoReviewReaction(validRating),
        });

        try {
          trackEvent('developer_review_submitted', 'Developer Review Card', {
            rating: writeFields.rating,
            isBonusRating: writeFields.isBonusRating,
            bestThingsCount: writeFields.bestThings.length,
            hasMessage: writeFields.message.length > 0,
            noteNumber: writeFields.noteNumber,
          });
        } catch {
          // Strictly non blocking
        }
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.CREATE,
          `${DEVELOPER_REVIEW_COLLECTION}/${writeFields.reviewId}`,
          { silent: true },
        );
        setSubmitError('Network hiccup! Tap again in a second.');
        haptics.bump();
      } finally {
        setSubmitting(false);
      }
    },
    [message, rating, selectedFavorites, sentHistory, submitting],
  );

  const handleWriteAnother = useCallback(() => {
    haptics.tap();
    setDeliveredReview(null);
    setRating(0);
    setSelectedFavorites([]);
    setMessage('');
    setValidationMessage(null);
    setSubmitError(null);
    playUiSfx('tap');
  }, []);

  const liveCaption = validationMessage ?? getRatingReactionCaption(rating);
  const isBonus = rating === 10;

  return (
    <section
      id="developer-review"
      data-testid="developer-review-section"
      aria-labelledby="developer-review-heading"
      className="mx-auto w-full max-w-[var(--card-max)] px-4 sm:px-6"
    >
      <div
        ref={cardRef}
        className="card-container relative z-[2] mx-auto w-full overflow-hidden rounded-[var(--card-radius)] border border-[rgba(217,75,125,0.22)]"
        style={{
          margin: '26px auto 18px',
          padding: 'var(--card-pad-y) var(--card-pad-x)',
          background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF5F8 100%)',
          boxShadow: '0 14px 34px -16px rgba(176, 62, 106, 0.16)',
        }}
      >
        {/* Whisper-soft pastel postcard ribbon accent at top edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-80"
          style={{
            background:
              'repeating-linear-gradient(135deg, rgba(226, 91, 139, 0.45) 0 12px, rgba(255, 253, 249, 0.9) 12px 20px, rgba(246, 211, 138, 0.65) 20px 32px, rgba(255, 253, 249, 0.9) 32px 40px)',
          }}
        />

        {/* Header */}
        <header className="text-center">
          <p className="text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[0.18em] text-[#C93B6B]">
            BEFORE YOU SAY BYE &middot; NOTE FOR ADINOMIDE
          </p>
          <h2
            id="developer-review-heading"
            className="font-display mt-1.5 text-[length:var(--text-h2)] font-semibold leading-tight text-[#3A1233]"
          >
            Rate Your Birthday World
          </h2>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[length:var(--text-sub)] leading-relaxed text-[#7A4A63]">
            Drop a quick rating, pick your favorite moment, and leave a note for the maker.
          </p>
        </header>

        {deliveredReview ? (
          /* Part 2: Animated Stamped Keepsake Receipt */
          <div
            data-testid="review-delivered-receipt"
            className="relative mt-5 overflow-hidden rounded-[22px] border border-[rgba(229,184,105,0.48)] px-4 py-5"
            style={{
              background: 'linear-gradient(180deg, #FFFDF8 0%, #FFF7EC 58%, #FFF4F7 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 20px -12px rgba(176, 62, 106, 0.18)',
            }}
          >
            {/* 10 subtle rising champagne-gold sparkles behind receipt header */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden">
              {RECEIPT_SPARKLES.map((sp, idx) => (
                <span
                  key={idx}
                  className="review-receipt-sparkle absolute select-none text-[#E5AD45]"
                  style={
                    {
                      left: sp.left,
                      top: sp.top,
                      fontSize: `${sp.size}px`,
                      '--rsp-dx': sp.dx,
                      '--rsp-dy': sp.dy,
                      '--rsp-delay': sp.delay,
                      '--rsp-dur': sp.dur,
                    } as React.CSSProperties
                  }
                >
                  ✦
                </span>
              ))}
            </div>

            {/* Tilted Rose-Gold Rubber Stamp */}
            <div className="relative z-[1] flex flex-col items-center text-center">
              <div
                data-testid="review-delivered-stamp"
                className="review-stamp-slam inline-flex items-center gap-1.5 rounded-xl border-2 border-[#C93B6B] bg-[#FFFDF9]/90 px-3.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#C93B6B] shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#D89A2B]" aria-hidden="true" />
                <span>DELIVERED TO ADINOMIDE</span>
              </div>

              <p className="mt-3 text-[11px] font-medium text-[#7A4A63]">
                Note #{deliveredReview.noteNumber} &middot; {deliveredReview.submittedAtIST}
              </p>

              {/* Rating Pill Badge */}
              <div
                data-testid="review-receipt-rating-badge"
                className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold ${
                  deliveredReview.isBonusRating
                    ? 'border-[#E6B44C] bg-gradient-to-r from-[#FFF6D6] to-[#FFE7B3] text-[#8F5A0B]'
                    : 'border-[rgba(217,75,125,0.28)] bg-[#FFFDFB] text-[#3A1233]'
                }`}
              >
                <span>
                  {deliveredReview.rating} / 5 ★
                  {deliveredReview.isBonusRating ? ' · Certified Bestie Bonus ✨' : ''}
                </span>
              </div>
            </div>

            {/* Chosen Favorites */}
            {deliveredReview.bestThings.length > 0 && (
              <div className="relative z-[1] mt-4">
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A5D7A]">
                  Favorite Moments
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {deliveredReview.bestThings.map((fav) => (
                    <span
                      key={fav}
                      className="rounded-full border border-[rgba(217,75,125,0.24)] bg-[#FFFDFB] px-2.5 py-1 text-[11px] font-semibold text-[#5A1E4E]"
                    >
                      {fav}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quoted Postcard Message */}
            {deliveredReview.message && (
              <blockquote
                data-testid="review-receipt-message"
                className="relative z-[1] mt-4 rounded-2xl border border-[rgba(217,75,125,0.18)] bg-[#FFFDFB]/95 px-3.5 py-3 text-left text-[12.5px] leading-relaxed text-[#3A1233]"
              >
                <span className="font-display mr-1 text-base leading-none text-[#D94B7D]">“</span>
                <span className="whitespace-pre-wrap break-words">{deliveredReview.message}</span>
                <span className="font-display ml-1 text-base leading-none text-[#D94B7D]">”</span>
              </blockquote>
            )}

            <p className="relative z-[1] mt-3.5 text-center text-[11.5px] font-medium text-[#7A4A63]">
              Safely sealed in Adinomide&apos;s keepsake box forever.
            </p>

            {/* Write Another Note CTA */}
            <div className="relative z-[1] mt-4">
              <button
                type="button"
                data-testid="review-write-another-btn"
                onClick={handleWriteAnother}
                className="flex min-h-[var(--btn-min-h)] w-full cursor-pointer items-center justify-center rounded-full border border-[rgba(217,75,125,0.34)] bg-[#FFFDFB] px-5 py-2.5 text-[clamp(13.5px,1.75vw,15.5px)] font-semibold text-[#B82E60] transition-transform duration-150 hover:bg-[#FFF5F8] active:scale-[0.98]"
              >
                Write Another Note ✨
              </button>
            </div>
          </div>
        ) : (
          /* Part 1: Interactive Pastel Stationery Form */
          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-5 space-y-5">
            {/* 1. Tactile 5-Star Rating + Secret 10/5 Easter Egg */}
            <div className="flex flex-col items-center">
              <div
                key={`star-row-${shakeStarsKey}`}
                role="radiogroup"
                aria-label="Rate your birthday world from 1 to 5 stars"
                className={`cq-star-row flex items-center justify-center gap-1.5 sm:gap-2.5 ${
                  shakeStarsKey > 0 && rating === 0 ? 'review-star-shake' : ''
                }`}
              >
                {STAR_VALUES.map((starVal) => {
                  const filled = rating >= starVal;
                  const isPopping = poppingStar === starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      role="radio"
                      aria-checked={rating === starVal || (starVal === 5 && rating === 10)}
                      aria-label={
                        starVal === 5 && rating === 5
                          ? 'Tap 5th star again for secret 10 out of 5 bonus'
                          : `Rate ${starVal} out of 5 stars`
                      }
                      data-testid={`review-star-${starVal}`}
                      onClick={() => handleStarTap(starVal)}
                      className={`relative flex h-[clamp(48px,6.5vw,62px)] w-[clamp(48px,6.5vw,62px)] cursor-pointer items-center justify-center rounded-full transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] ${
                        isPopping ? 'review-star-pop' : ''
                      }`}
                    >
                      <ChampagneStarIcon filled={filled} bonus={isBonus} />
                    </button>
                  );
                })}
              </div>

              {/* Secret 10 / 5 Bonus Pill */}
              {isBonus && (
                <div
                  key={`bonus-${bonusBurstKey}`}
                  data-testid="review-bonus-badge"
                  className="animate-pop-in mt-2.5 inline-flex items-center gap-1 rounded-full border border-[#E5B24A] bg-gradient-to-r from-[#FFF6D6] via-[#FFE8B4] to-[#FFF4D1] px-3.5 py-1.5 text-[clamp(11.5px,1.5vw,13.5px)] font-bold text-[#8E5608] shadow-xs"
                >
                  <span>10 / 5 &middot; Certified Bestie Bonus ✨</span>
                </div>
              )}

              {/* Fixed-height live reaction caption */}
              <p
                data-testid={validationMessage ? 'review-validation-error' : 'review-rating-caption'}
                role={validationMessage ? 'alert' : 'status'}
                aria-live="polite"
                className={`mt-2 flex min-h-[30px] items-center justify-center px-2 text-center text-[clamp(12.5px,1.65vw,15px)] font-semibold leading-snug ${
                  validationMessage ? 'text-[#C93B6B]' : 'text-[#5A1E4E]'
                }`}
              >
                {liveCaption}
              </p>
            </div>

            {/* 2. Favorite Part Picker (Pick up to 3) */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[clamp(12.5px,1.65vw,15px)] font-bold text-[#3A1233]">
                  What was your favorite part? (Pick up to 3)
                </span>
                <span className="shrink-0 text-[clamp(11.5px,1.5vw,13.5px)] font-semibold tabular-nums text-[#9A5D7A]">
                  {selectedFavorites.length} / {MAX_FAVORITE_SELECTIONS}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-2">
                {DEVELOPER_REVIEW_FAVORITES.map((chip) => {
                  const active = selectedFavorites.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      aria-pressed={active}
                      data-testid={`review-fav-chip-${chip.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`}
                      onClick={() => handleFavoriteToggle(chip)}
                      className={`cursor-pointer rounded-full px-3.5 py-2 text-[clamp(12px,1.55vw,14.5px)] font-semibold transition-all duration-150 active:scale-95 ${
                        active
                          ? 'border border-transparent text-[#FFFDFB] shadow-xs'
                          : 'border border-[rgba(217,75,125,0.24)] bg-[#FFFDFB] text-[#3A1233] hover:border-[rgba(217,75,125,0.44)] hover:bg-[#FFF7FA]'
                      }`}
                      style={
                        active
                          ? { background: 'linear-gradient(135deg, #E25B8B 0%, #C93B6B 100%)' }
                          : undefined
                      }
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Lined Pastel Postcard Message Box */}
            <div>
              <label
                htmlFor="developer-review-message"
                className="block text-[clamp(12.5px,1.65vw,15px)] font-bold text-[#3A1233]"
              >
                Message for the developer (adinomide)
              </label>

              <div className="relative mt-2">
                <textarea
                  ref={textareaRef}
                  id="developer-review-message"
                  data-testid="review-message-textarea"
                  rows={4}
                  maxLength={MAX_REVIEW_MESSAGE_LENGTH}
                  value={message}
                  onFocus={handleTextareaFocus}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder="Write anything honest, funny, or chaotic for adinomide..."
                  className="w-full resize-none rounded-[18px] border border-[rgba(217,75,125,0.26)] bg-[#FFFDFB] px-4 pt-3 pb-8 text-[clamp(14.5px,1.9vw,17px)] leading-[28px] text-[#3A1233] placeholder:text-[#A97B93] focus:border-[#D94B7D] focus:outline-none focus:ring-2 focus:ring-[#D94B7D]/20"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(180deg, transparent 0px, transparent 27px, rgba(217, 75, 125, 0.11) 27px, rgba(217, 75, 125, 0.11) 28px)',
                    backgroundPosition: '0 10px',
                  }}
                />
                <span
                  data-testid="review-char-counter"
                  className="pointer-events-none absolute right-3.5 bottom-2.5 text-[clamp(11px,1.4vw,13px)] font-semibold tabular-nums text-[#9A5D7A]"
                >
                  {message.length} / {MAX_REVIEW_MESSAGE_LENGTH}
                </span>
              </div>

              {/* 3 Tap-to-Fill Starter Chips */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {DEVELOPER_REVIEW_STARTERS.map((starter, idx) => (
                  <button
                    key={starter}
                    type="button"
                    data-testid={`review-starter-${idx}`}
                    onClick={() => handleStarterTap(starter)}
                    className="cursor-pointer rounded-full border border-[rgba(217,75,125,0.2)] bg-[#FFF8FB] px-3 py-1.5 text-[clamp(11.5px,1.5vw,13.5px)] font-medium text-[#7A4A63] transition-colors hover:border-[rgba(217,75,125,0.38)] hover:bg-[#FFF0F6] hover:text-[#3A1233] active:scale-95"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>

            {/* Network Error Banner (preserves all typed content) */}
            {submitError && (
              <p
                role="alert"
                data-testid="review-submit-error"
                className="rounded-2xl border border-[rgba(201,59,107,0.3)] bg-[#FFF0F5] px-4 py-2.5 text-center text-[length:var(--text-sub)] font-semibold text-[#B82E60]"
              >
                {submitError}
              </p>
            )}

            {/* 4. Warm Rose Berry Satin Submit CTA */}
            <button
              type="submit"
              data-testid="review-submit-btn"
              disabled={submitting}
              className="flex min-h-[var(--btn-min-h)] w-full cursor-pointer items-center justify-center rounded-full px-6 py-3 text-[clamp(14px,1.8vw,16.5px)] font-bold tracking-[0.01em] text-[#FFFDFB] transition-transform duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: 'linear-gradient(135deg, #DE4F82 0%, #B82E60 100%)',
                border: '1.5px solid rgba(246, 211, 138, 0.65)',
                boxShadow: '0 10px 20px -10px rgba(184, 46, 96, 0.52)',
              }}
            >
              {submitting ? 'Sending Note...' : 'Send to Developer ✨'}
            </button>
          </form>
        )}

        {/* Part 3: Persistent Collapsible Local Sent History */}
        {sentHistory.length >= 1 && (
          <div className="mt-5 border-t border-[rgba(217,75,125,0.16)] pt-3.5">
            <button
              type="button"
              data-testid="review-sent-history-toggle"
              aria-expanded={historyOpen}
              onClick={() => {
                setHistoryOpen((prev) => !prev);
                haptics.tap();
                playUiSfx('tap');
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl bg-[#FFFDFB]/80 px-3.5 py-2.5 text-left text-[12px] font-bold text-[#5A1E4E] transition-colors hover:bg-[#FFF5F8]"
            >
              <span>Your Sent Notes ({sentHistory.length})</span>
              {historyOpen ? (
                <ChevronUp className="h-4 w-4 text-[#C93B6B]" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#C93B6B]" aria-hidden="true" />
              )}
            </button>

            {historyOpen && (
              <div
                data-testid="review-sent-history-list"
                className="mt-2.5 space-y-2.5"
              >
                {sentHistory.map((item) => (
                  <article
                    key={item.reviewId}
                    className="rounded-2xl border border-[rgba(217,75,125,0.18)] bg-[#FFFDFB] p-3 text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-[#3A1233]">
                        Note #{item.noteNumber} &middot; {item.rating} / 5 ★
                      </span>
                      <span className="text-[10.5px] font-medium text-[#8C5B74]">
                        {item.submittedAtIST}
                      </span>
                    </div>

                    {item.bestThings.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.bestThings.map((fav) => (
                          <span
                            key={fav}
                            className="rounded-full bg-[#FFF2F7] px-2 py-0.5 text-[10px] font-semibold text-[#9C335E]"
                          >
                            {fav}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.message && (
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#4C2243]">
                        {item.message}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default DeveloperReviewSection;

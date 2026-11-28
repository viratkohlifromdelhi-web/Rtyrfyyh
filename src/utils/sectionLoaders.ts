/**
 * Named reusable chunk loaders for React.lazy() and the idle background preloader.
 * Every below-the-fold section lives in its own code-split chunk so initial boot
 * only parses Midnight Lock, Theatre Intro, Header, and Hero.
 */

export const loadInteractiveTogglesSection = () =>
  import('../components/InteractiveTogglesSection');

export const loadCalendarAndCounterSection = () =>
  import('../components/CalendarAndCounterSection');

export const loadLifeStatsSection = () => import('../components/LifeStatsSection');

export const loadBackstorySection = () => import('../components/BackstorySection');

export const loadStarterPackGrid = () => import('../components/StarterPackGrid');

export const loadRunawayAgreementSection = () =>
  import('../components/RunawayAgreementSection');

export const loadBauniMeterSection = () => import('../components/BauniMeterSection');

export const loadAdoptionCertificateSection = () =>
  import('../components/AdoptionCertificateSection');

export const loadCaseFileSection = () => import('../components/CaseFileSection');

export const loadBaadMeRevealSection = () => import('../components/BaadMeRevealSection');

export const loadScratchCouponsSection = () => import('../components/ScratchCouponsSection');

export const loadInfinityVaultSection = () => import('../components/InfinityVaultSection');

export const loadSpinWheelSection = () => import('../components/SpinWheelSection');

export const loadSurpriseGiftSection = () => import('../components/SurpriseGiftSection');

export const loadMakeAWishCake = () => import('../components/MakeAWishCake');

export const loadBirthdaySummaryCard = () => import('../components/BirthdaySummaryCard');

export const loadTapliArenaSection = () => import('../components/TapliArenaSection');

export const loadChickenFarmSection = () => import('../components/ChickenFarmSection');

export const loadTimeCapsuleSection = () => import('../components/TimeCapsuleSection');

export const loadDeveloperReviewSection = () => import('../components/DeveloperReviewSection');

export const loadClosingSignOffFooter = () => import('../components/ClosingSignOffFooter');

export const loadModinoPet = () => import('../components/ModinoPet');

/**
 * Isolated owner-only secret analytics dashboard (?insights=9876).
 * Strictly excluded from BACKGROUND_SECTION_LOADERS so normal visitors download 0 bytes.
 */
export const loadOwnerAnalyticsDashboard = () =>
  import('../components/OwnerAnalyticsDashboard');

/**
 * On-demand 1080x1920 Keepsake Poster Preview Modal (loads only when opened).
 */
export const loadKeepsakePreviewModal = () =>
  import('../components/KeepsakePreviewModal');

/**
 * Priority Tier 1 (starts 350ms after Origin Story Scene 1 mounts):
 * Above-the-fold lazy controls + Modino companion chunk (HeroSection, TopBar,
 * and SparkleRainCanvas are already eagerly bundled).
 */
export const TIER1_MAIN_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  loadInteractiveTogglesSection,
  loadModinoPet,
];

/**
 * Priority Tier 2 (runs in staggered 180ms requestIdleCallback slices during Origin Story):
 * All remaining below-the-fold Main Birthday Page sections in top-to-bottom visual scroll order.
 * Strictly excludes OwnerAnalyticsDashboard (?insights=9876).
 */
export const TIER2_MAIN_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  loadCalendarAndCounterSection,
  loadLifeStatsSection,
  loadBackstorySection,
  loadStarterPackGrid,
  loadRunawayAgreementSection,
  loadBauniMeterSection,
  loadAdoptionCertificateSection,
  loadCaseFileSection,
  loadBaadMeRevealSection,
  loadScratchCouponsSection,
  loadInfinityVaultSection,
  loadSpinWheelSection,
  loadSurpriseGiftSection,
  loadMakeAWishCake,
  loadBirthdaySummaryCard,
  loadTapliArenaSection,
  loadChickenFarmSection,
  loadTimeCapsuleSection,
  loadDeveloperReviewSection,
  loadClosingSignOffFooter,
];

/**
 * Wave 3 Intro-Video Preload Order (runs in 160ms requestIdleCallback slices starting at +1600ms
 * after Intro Video confirms smooth playback; strictly excludes OwnerAnalyticsDashboard):
 *   1. Above-the-fold first: InteractiveTogglesSection (Quick Switches, Note Deck, Friend List), ModinoPet
 *      (HeroSection, TopBar / StickyHeader, and SparkleRainCanvas are already eagerly bundled)
 *   2. Mid-page next: Backstory Notebook, December 2026 Calendar, Life Stats, GAWAAR Gift Box,
 *      Bakery Cake (MakeAWishCake), Case File #0721, BaadMeRevealSection
 *   3. Lower-page last: Infinity Gift Vault, Spin Wheel, Bauni Meter, Starter Pack,
 *      Runaway Agreement, Adoption Certificate, Scratch Coupons, Summary/Keepsake Card,
 *      Tapli Arena, Mini Chicken Farm, Developer Review Card, Closing Footer
 */
export const WAVE3_MAIN_PAGE_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  // 1. Above-the-fold first
  loadInteractiveTogglesSection,
  loadModinoPet,
  // 2. Mid-page next
  loadBackstorySection,
  loadCalendarAndCounterSection,
  loadLifeStatsSection,
  loadSurpriseGiftSection,
  loadMakeAWishCake,
  loadCaseFileSection,
  loadBaadMeRevealSection,
  // 3. Lower-page last
  loadInfinityVaultSection,
  loadSpinWheelSection,
  loadBauniMeterSection,
  loadStarterPackGrid,
  loadRunawayAgreementSection,
  loadAdoptionCertificateSection,
  loadScratchCouponsSection,
  loadBirthdaySummaryCard,
  loadTapliArenaSection,
  loadChickenFarmSection,
  loadTimeCapsuleSection,
  loadDeveloperReviewSection,
  loadClosingSignOffFooter,
];

/**
 * Top-to-bottom visual scroll order used by the staggered idle background preloader.
 */
export const BACKGROUND_SECTION_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  ...TIER1_MAIN_LOADERS,
  ...TIER2_MAIN_LOADERS,
];

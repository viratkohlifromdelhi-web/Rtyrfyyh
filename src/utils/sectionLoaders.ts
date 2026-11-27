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

export const loadScratchCouponsSection = () => import('../components/ScratchCouponsSection');

export const loadInfinityVaultSection = () => import('../components/InfinityVaultSection');

export const loadSpinWheelSection = () => import('../components/SpinWheelSection');

export const loadSurpriseGiftSection = () => import('../components/SurpriseGiftSection');

export const loadMakeAWishCake = () => import('../components/MakeAWishCake');

export const loadBirthdaySummaryCard = () => import('../components/BirthdaySummaryCard');

export const loadSecretBluffGateSection = () =>
  import('../components/SecretBluffGateSection');

export const loadChickenFarmSection = () => import('../components/ChickenFarmSection');

export const loadClosingSignOffFooter = () => import('../components/ClosingSignOffFooter');

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
 * Top-to-bottom visual scroll order used by the staggered idle background preloader.
 */
export const BACKGROUND_SECTION_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  loadInteractiveTogglesSection,
  loadCalendarAndCounterSection,
  loadLifeStatsSection,
  loadBackstorySection,
  loadStarterPackGrid,
  loadRunawayAgreementSection,
  loadBauniMeterSection,
  loadAdoptionCertificateSection,
  loadCaseFileSection,
  loadScratchCouponsSection,
  loadInfinityVaultSection,
  loadSpinWheelSection,
  loadSurpriseGiftSection,
  loadMakeAWishCake,
  loadBirthdaySummaryCard,
  loadSecretBluffGateSection,
  loadChickenFarmSection,
  loadClosingSignOffFooter,
];

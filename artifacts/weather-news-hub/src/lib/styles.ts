// Cross-component Tailwind class constants.
// Only semantic combos that repeat across multiple files belong here.
// Component-specific combos stay as local consts inside their own file.

/** Secondary/label text: extra-small, muted */
export const MUTED_LABEL = "text-xs text-muted-foreground";

/** Body text: standard size, muted — used across cards, placeholders, etc. */
export const TEXT_SM_MUTED = "text-sm text-muted-foreground";

/** Empty / error state card body: centred column with padding */
export const EMPTY_STATE = "p-8 flex flex-col items-center gap-3 text-center";

/** Section heading above each card (e.g. "7-Day Forecast", "Air Quality") */
export const SECTION_HEADING = "text-sm font-medium text-muted-foreground mb-3";

/** Heart / favourite toggle button — shared between news-feed and dashboard */
export const FAVOURITE_BTN_CLASSES = {
  base:     "w-7 h-7 transition-colors",
  active:   "text-rose-500 hover:text-rose-600",
  inactive: "text-muted-foreground hover:text-rose-500",
} as const;

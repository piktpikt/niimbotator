// PIKT: TypeScript mirror of design tokens (docs/UX-GUIDELINES.md). The CSS source of truth is the
// Skeleton theme (src/themes/niimbotator.css) + Tailwind defaults; these constants are for use in
// TS/Svelte logic (motion timing, touch sizing, overlay layering). (Chantier 0)

/** Minimum touch target in px/dp — UX-GUIDELINES §2.2 (never below 48). */
export const TOUCH_TARGET = 48;

/** M3 motion durations in ms — UX-GUIDELINES §7.1. */
export const MOTION = {
  short: 200,
  medium: 300,
  long: 500,
} as const;

/** Overlay stacking order, lowest to highest. */
export const Z_INDEX = {
  topAppBar: 30,
  bottomNav: 30,
  fab: 40,
  bottomSheet: 50,
  modal: 60,
  snackbar: 70,
} as const;

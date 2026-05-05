/**
 * Centralized motion configuration
 *
 * All framer-motion spring configs, easing curves, and duration tokens.
 * Every animated component should reference these instead of inline values.
 */
import type { Transition } from "framer-motion";

// ── Spring presets ──────────────────────────────────────────────────
export const SPRING = {
  /** Snappy UI feedback — breadcrumb entries, badges, toggles */
  snappy: { type: "spring" as const, stiffness: 280, damping: 22 },
  /** Quick interactive response — hover nudges, button taps */
  quick: { type: "spring" as const, stiffness: 400, damping: 26 },
  /** Gentle entrance — cards, panels, overlays */
  gentle: { type: "spring" as const, stiffness: 300, damping: 20 },
};

// ── Duration presets (seconds) ──────────────────────────────────────
export const DURATION = {
  instant: 0.15,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  ring: 0.8,
};

// ── Easing curves ───────────────────────────────────────────────────
export const EASE = {
  out: "easeOut" as const,
  inOut: "easeInOut" as const,
};

// ── Composed transitions ────────────────────────────────────────────
export const TRANSITION = {
  /** Default card/element entrance */
  enterCard: { duration: DURATION.normal, ease: EASE.out } satisfies Transition,
  /** Fast list item appearance */
  enterItem: { duration: DURATION.fast, ease: EASE.out } satisfies Transition,
  /** Progress bar / smooth value changes */
  progress: { duration: DURATION.slow, ease: EASE.out } satisfies Transition,
  /** Quick feedback (sound toggle pulse, tap) */
  feedback: { duration: DURATION.normal } satisfies Transition,
  /** Cross-fade between views */
  crossfade: { duration: DURATION.instant } satisfies Transition,
  /** Expanding/collapsing panels (accordion) */
  collapse: { duration: DURATION.normal, ease: EASE.inOut } satisfies Transition,
} as const;

// ── Looping / ambient animations ────────────────────────────────────
export const LOOP = {
  /** Slow ambient pulse (idle timer ring, breathing effects) */
  breathe: { duration: 2, repeat: Infinity, ease: EASE.inOut } satisfies Transition,
  /** Faster pulse for attention (warning state) */
  pulse: { duration: 1.5, repeat: Infinity, ease: EASE.inOut } satisfies Transition,
  /** Quick glow oscillation (warning glow) */
  glow: { duration: 1, repeat: Infinity, ease: EASE.inOut } satisfies Transition,
  /** Periodic wobble (timer warning shake) */
  wobble: { duration: DURATION.slow, repeat: Infinity, repeatDelay: 3 } satisfies Transition,
};

// ── Stagger helpers ─────────────────────────────────────────────────
export const STAGGER = {
  /** Per-item delay for breadcrumb, list entries */
  fast: 0.06,
};

// ── Delay presets ───────────────────────────────────────────────────
export const DELAY = {
  short: 0.2,
  medium: 0.3,
  long: 0.5,
};

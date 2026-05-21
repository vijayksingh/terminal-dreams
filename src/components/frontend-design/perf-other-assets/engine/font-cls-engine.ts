/**
 * Font CLS engine — deterministic simulation of font-display strategies.
 *
 * Each strategy returns the playback profile (visible-at, swap-at, CLS) plus
 * the per-strategy explanation surfaced when the reader picks it. The lab
 * imports these to drive the live text-swap visualization and CLS counter.
 *
 * Source of CLS heuristics: web.dev font-display guide (2024), CrUX field data
 * showing Inter-vs-system metric drift produces ~0.05-0.12 shift per swap. We
 * intentionally use representative whole values so the demo is legible.
 */
export type FontStrategy =
  | "default"
  | "swap"
  | "fallback"
  | "optional"
  | "size-adjusted";

export type RenderedFont =
  | "invisible"
  | "system"
  | "system-adjusted"
  | "custom";

export interface FontSimulation {
  strategy: FontStrategy;
  /** ms before any text renders (FOIT window). */
  textVisibleAtMs: number;
  /** ms when the custom font swaps in (null = no swap). */
  fontSwapAtMs: number | null;
  /** simulated CLS contribution from this swap. */
  clsValue: number;
  /** total ms the playback runs. */
  totalDurationMs: number;
  /** family used after the swap settles. */
  finalFont: RenderedFont;
}

export const FONT_SIMULATIONS: Record<FontStrategy, FontSimulation> = {
  default: {
    strategy: "default",
    // Block period (~3s in real UAs, compressed to 1500ms for demo legibility):
    // text is invisible, then once the font arrives the UA swaps in — same
    // shape as `block`, hence a non-trivial CLS contribution on swap.
    textVisibleAtMs: 1500,
    fontSwapAtMs: 1500,
    clsValue: 0.12,
    totalDurationMs: 2000,
    finalFont: "custom",
  },
  swap: {
    strategy: "swap",
    textVisibleAtMs: 0,
    fontSwapAtMs: 1000,
    clsValue: 0.12,
    totalDurationMs: 1500,
    finalFont: "custom",
  },
  fallback: {
    strategy: "fallback",
    textVisibleAtMs: 0,
    fontSwapAtMs: 400,
    clsValue: 0.06,
    totalDurationMs: 1200,
    finalFont: "custom",
  },
  optional: {
    strategy: "optional",
    textVisibleAtMs: 0,
    fontSwapAtMs: null,
    clsValue: 0.0,
    totalDurationMs: 1200,
    finalFont: "system",
  },
  "size-adjusted": {
    strategy: "size-adjusted",
    textVisibleAtMs: 0,
    fontSwapAtMs: 800,
    clsValue: 0.0,
    totalDurationMs: 1200,
    finalFont: "custom",
  },
};

/**
 * MDN, May 2026: `font-display` controls how the user-agent waits/swaps a
 * custom font. The descriptions below are the actually-correct UA behaviors;
 * the previous lab had `optional` wrong.
 */
export const FONT_DISPLAY_NOTES: Record<FontStrategy, string> = {
  default:
    "No descriptor set. UA uses a ~3s block period — text is invisible until the font loads or the timer expires. After the timer, swap-equivalent kicks in: the custom font replaces fallback whenever it arrives, producing the same CLS shift as `swap`. Worst FOIT plus a late shift.",
  swap:
    "0ms block, infinite swap. Fallback renders immediately and is replaced as soon as the custom font arrives. The shift on swap is what produces CLS.",
  fallback:
    "100ms block, ~3s swap window. Fallback renders fast; the UA only swaps if the font arrives within the swap window. After that it stays fallback for this page view.",
  optional:
    "100ms block period, then the UA may skip the custom font entirely. On slow connections the request is often deferred so the font is cached for the next navigation. Zero CLS, no guaranteed custom font on first paint.",
  "size-adjusted":
    "swap + the @font-face metric overrides (size-adjust, ascent-override, descent-override, line-gap-override) tuned so the fallback occupies the same box as the custom font. Swap is invisible. Zero CLS.",
};

/**
 * Frame the lab renders at a given playback time. Pure function — no React,
 * no DOM, easy to unit-test if we ever want to.
 */
export interface FontFrame {
  font: RenderedFont;
  cls: number;
  textVisible: boolean;
  fontSwapped: boolean;
}

export function computeFontFrame(
  strategy: FontStrategy,
  playbackMs: number,
): FontFrame {
  const sim = FONT_SIMULATIONS[strategy];
  const textVisible = playbackMs >= sim.textVisibleAtMs;
  const fontSwapped =
    sim.fontSwapAtMs !== null && playbackMs >= sim.fontSwapAtMs;

  let font: RenderedFont = "invisible";
  if (textVisible) {
    if (strategy === "size-adjusted") {
      font = fontSwapped ? "custom" : "system-adjusted";
    } else if (strategy === "default") {
      font = fontSwapped ? "custom" : "invisible";
    } else {
      font = fontSwapped ? "custom" : "system";
    }
  }

  const cls = fontSwapped ? sim.clsValue : 0;
  return { font, cls, textVisible, fontSwapped };
}

export const FONT_STRATEGY_LABEL: Record<FontStrategy, string> = {
  default: "default (block)",
  swap: "swap",
  fallback: "fallback",
  optional: "optional",
  "size-adjusted": "swap + size-adjust",
};

/**
 * The headline @font-face declaration the lab teaches. We surface this verbatim
 * in the reveal panel so a reader can copy it.
 */
export const SIZE_ADJUST_SNIPPET = `@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107.4%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body { font-family: "Inter", "Inter Fallback", sans-serif; }`;

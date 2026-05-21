// ── Specificity parsing ──────────────────────────────────────────────
//
// CSS Selectors Level 4 specificity is a tuple (id, class, element):
//   - id:      #ids
//   - class:   .classes, [attrs], :pseudo-classes (except :is/:where/:not container)
//   - element: type selectors (div, span), ::pseudo-elements
//   - :is(), :not(), :has(): take the highest specificity of their args
//   - :where(): always [0,0,0]
//   - * and combinators (> + ~) do not count
//
// Teaching simulator — handles the patterns used in the lab's mock data
// (#main .card.active, .nav .item a, :is/:where/:not, ::before).

export type SpecificityTuple = [id: number, cls: number, el: number];

export type TokenKind =
  | "id"
  | "class"
  | "element"
  | "pseudo-class"
  | "pseudo-element"
  | "combinator"
  | "universal"
  | "attribute";

export interface SelectorToken {
  text: string;
  kind: TokenKind;
  weight: SpecificityTuple;
}

const PSEUDO_ELEMENTS = new Set([
  "before",
  "after",
  "first-line",
  "first-letter",
  "placeholder",
  "selection",
  "marker",
  "backdrop",
  "file-selector-button",
]);

const ZERO_WEIGHT_PSEUDOS = new Set(["where"]);
const HIGHEST_ARG_PSEUDOS = new Set(["is", "not", "has"]);

function emptyTuple(): SpecificityTuple {
  return [0, 0, 0];
}

function addTuple(a: SpecificityTuple, b: SpecificityTuple): SpecificityTuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function maxTuple(a: SpecificityTuple, b: SpecificityTuple): SpecificityTuple {
  if (compareSpecificity(a, b) >= 0) return a;
  return b;
}

export function tokenizeSelector(selector: string): SelectorToken[] {
  const tokens: SelectorToken[] = [];
  const src = selector.trim();
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch === " " || ch === "\t") {
      tokens.push({ text: " ", kind: "combinator", weight: emptyTuple() });
      while (i < src.length && (src[i] === " " || src[i] === "\t")) i++;
      continue;
    }

    if (ch === ">" || ch === "+" || ch === "~") {
      if (tokens.length && tokens[tokens.length - 1].kind === "combinator" && tokens[tokens.length - 1].text === " ") {
        tokens.pop();
      }
      tokens.push({ text: ch, kind: "combinator", weight: emptyTuple() });
      i++;
      while (i < src.length && (src[i] === " " || src[i] === "\t")) i++;
      continue;
    }

    if (ch === "*") {
      tokens.push({ text: "*", kind: "universal", weight: emptyTuple() });
      i++;
      continue;
    }

    if (ch === "#") {
      const start = i;
      i++;
      while (i < src.length && /[\w-]/.test(src[i])) i++;
      tokens.push({ text: src.slice(start, i), kind: "id", weight: [1, 0, 0] });
      continue;
    }

    if (ch === ".") {
      const start = i;
      i++;
      while (i < src.length && /[\w-]/.test(src[i])) i++;
      tokens.push({ text: src.slice(start, i), kind: "class", weight: [0, 1, 0] });
      continue;
    }

    if (ch === "[") {
      const start = i;
      i++;
      while (i < src.length && src[i] !== "]") i++;
      if (i < src.length) i++;
      tokens.push({ text: src.slice(start, i), kind: "attribute", weight: [0, 1, 0] });
      continue;
    }

    if (ch === ":") {
      const start = i;
      i++;
      const isElement = src[i] === ":";
      if (isElement) i++;
      while (i < src.length && /[\w-]/.test(src[i])) i++;
      const name = src.slice(isElement ? start + 2 : start + 1, i);

      let args: string | null = null;
      if (src[i] === "(") {
        const open = i;
        let depth = 1;
        i++;
        while (i < src.length && depth > 0) {
          if (src[i] === "(") depth++;
          else if (src[i] === ")") depth--;
          if (depth > 0) i++;
        }
        args = src.slice(open + 1, i);
        if (i < src.length) i++;
      }

      const text = args !== null ? src.slice(start, i) : src.slice(start, i);

      if (isElement || PSEUDO_ELEMENTS.has(name)) {
        tokens.push({ text, kind: "pseudo-element", weight: [0, 0, 1] });
      } else if (ZERO_WEIGHT_PSEUDOS.has(name)) {
        tokens.push({ text, kind: "pseudo-class", weight: emptyTuple() });
      } else if (args !== null && HIGHEST_ARG_PSEUDOS.has(name)) {
        const branches = splitTopLevel(args, ",");
        let best = emptyTuple();
        for (const branch of branches) {
          const sub = computeSpecificity(branch.trim());
          best = maxTuple(best, sub);
        }
        tokens.push({ text, kind: "pseudo-class", weight: best });
      } else {
        tokens.push({ text, kind: "pseudo-class", weight: [0, 1, 0] });
      }
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      const start = i;
      while (i < src.length && /[\w-]/.test(src[i])) i++;
      tokens.push({ text: src.slice(start, i), kind: "element", weight: [0, 0, 1] });
      continue;
    }

    i++;
  }

  return tokens;
}

function splitTopLevel(input: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

export function computeSpecificity(selector: string): SpecificityTuple {
  if (!selector || !selector.trim()) return emptyTuple();
  return tokenizeSelector(selector).reduce(
    (acc, tok) => addTuple(acc, tok.weight),
    emptyTuple(),
  );
}

export function compareSpecificity(a: SpecificityTuple, b: SpecificityTuple): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

export function isValidSelector(selector: string): boolean {
  const trimmed = selector.trim();
  if (!trimmed) return false;
  if (/[>+~]\s*$/.test(trimmed)) return false;
  if ((trimmed.match(/\[/g) ?? []).length !== (trimmed.match(/\]/g) ?? []).length) return false;
  if ((trimmed.match(/\(/g) ?? []).length !== (trimmed.match(/\)/g) ?? []).length) return false;
  return /[\w*#.\[:]/.test(trimmed);
}

export function formatTuple(t: SpecificityTuple): string {
  return `[${t[0]}, ${t[1]}, ${t[2]}]`;
}

// ── Critical CSS rule shape ──────────────────────────────────────────

export interface CSSRuleMock {
  id: string;
  selector: string;
  bodyPreview: string;
  sizeBytes: number;
  /** Above-the-fold at the target viewport. */
  aboveFold: boolean;
  /** Number of elements matched in the mock page DOM. 0 = candidate dead. */
  matchCount: number;
  /** When true, the rule looks unused but is added by JS at runtime. The trap. */
  toggledByJS: boolean;
  /** Plain-language reason JS adds the matching state. */
  jsReason?: string;
  /** Visible artefact when the rule is missing — used in the failure preview. */
  breaks?: string;
}

// 15 mock rules — 8 above-the-fold (critical) + 7 below-the-fold (deferred).
// Byte sizes are scaled so the above-fold subset is ~20% of a ~180 KB sheet.
export const CRITICAL_RULES: CSSRuleMock[] = [
  { id: "nav", selector: ".nav", bodyPreview: "display: flex; height: 56px;", sizeBytes: 4800, aboveFold: true, matchCount: 1, toggledByJS: false },
  { id: "nav-link", selector: ".nav__link", bodyPreview: "color: #fff; padding: 8px 12px;", sizeBytes: 3200, aboveFold: true, matchCount: 5, toggledByJS: false },
  { id: "hero", selector: ".hero", bodyPreview: "padding: 64px 24px; background: #111;", sizeBytes: 5400, aboveFold: true, matchCount: 1, toggledByJS: false },
  { id: "hero-h1", selector: ".hero h1", bodyPreview: "font-size: 56px; line-height: 1.05;", sizeBytes: 2900, aboveFold: true, matchCount: 1, toggledByJS: false },
  { id: "hero-img", selector: ".hero__img", bodyPreview: "aspect-ratio: 16/9; object-fit: cover;", sizeBytes: 3100, aboveFold: true, matchCount: 1, toggledByJS: false },
  { id: "hero-cta", selector: ".hero__cta", bodyPreview: "background: #f25; padding: 12px 24px;", sizeBytes: 2400, aboveFold: true, matchCount: 1, toggledByJS: false },
  { id: "tokens", selector: ":root", bodyPreview: "--accent: #f25; --bg: #0e0e10;", sizeBytes: 9600, aboveFold: true, matchCount: 1, toggledByJS: false },
  { id: "type", selector: "h1, h2, p", bodyPreview: "font-family: Inter, sans-serif;", sizeBytes: 5500, aboveFold: true, matchCount: 14, toggledByJS: false },

  { id: "card-grid", selector: ".card-grid", bodyPreview: "display: grid; grid-template-columns: 1fr 1fr 1fr;", sizeBytes: 14000, aboveFold: false, matchCount: 1, toggledByJS: false },
  { id: "card", selector: ".card", bodyPreview: "padding: 24px; border-radius: 12px; background: #1a1a1d;", sizeBytes: 28000, aboveFold: false, matchCount: 6, toggledByJS: false },
  { id: "card-title", selector: ".card__title", bodyPreview: "font-size: 22px; font-weight: 700;", sizeBytes: 9200, aboveFold: false, matchCount: 6, toggledByJS: false },
  { id: "card-meta", selector: ".card__meta", bodyPreview: "color: #777; font-size: 13px;", sizeBytes: 8400, aboveFold: false, matchCount: 6, toggledByJS: false },
  { id: "footer", selector: "footer", bodyPreview: "padding: 48px 24px; color: #888;", sizeBytes: 18000, aboveFold: false, matchCount: 1, toggledByJS: false },
  { id: "footer-links", selector: "footer ul li a", bodyPreview: "color: #aaa; text-decoration: none;", sizeBytes: 22000, aboveFold: false, matchCount: 8, toggledByJS: false },
  { id: "newsletter", selector: ".newsletter__input", bodyPreview: "background: #222; border-radius: 8px;", sizeBytes: 48000, aboveFold: false, matchCount: 1, toggledByJS: false },
];

export const CRITICAL_TOTAL_BYTES = CRITICAL_RULES.reduce((s, r) => s + r.sizeBytes, 0);
export const CRITICAL_ABOVE_BYTES = CRITICAL_RULES
  .filter((r) => r.aboveFold)
  .reduce((s, r) => s + r.sizeBytes, 0);

export function criticalRatio(): number {
  return CRITICAL_ABOVE_BYTES / CRITICAL_TOTAL_BYTES;
}

export function extractCritical(rules: CSSRuleMock[]): {
  critical: CSSRuleMock[];
  deferred: CSSRuleMock[];
  ratio: number;
  inlineBytes: number;
  deferredBytes: number;
} {
  const critical = rules.filter((r) => r.aboveFold);
  const deferred = rules.filter((r) => !r.aboveFold);
  const inlineBytes = critical.reduce((s, r) => s + r.sizeBytes, 0);
  const deferredBytes = deferred.reduce((s, r) => s + r.sizeBytes, 0);
  return {
    critical,
    deferred,
    inlineBytes,
    deferredBytes,
    ratio: inlineBytes / (inlineBytes + deferredBytes),
  };
}

// ── FCP simulator ────────────────────────────────────────────────────
//
// FCP timeline anchored on the brief: ~180 KB sheet → ~1.8s blocking,
// ~36 KB critical (~20%) inlined → 620 ms hit. Slopes tuned so the
// inline path lands at the 620 ms quoted throughout the lesson when
// fed the lab's default critical (~36 KB) + non-critical (~144 KB)
// split.

export function simulateFCP(
  bytesInline: number,
  bytesDeferred: number,
  options: { renderBlocking?: boolean } = {},
): number {
  const { renderBlocking = true } = options;
  if (renderBlocking) {
    const totalKB = (bytesInline + bytesDeferred) / 1024;
    return Math.round(300 + totalKB * 8.5);
  }
  const criticalKB = bytesInline / 1024;
  return Math.round(280 + criticalKB * 9.43);
}

// ── Unused CSS detector with the JS-toggled trap ─────────────────────

// 20 rules:
//   - 8 truly dead (matchCount 0, toggledByJS false) — safe to remove
//   - 6 JS-toggled (matchCount 0 BUT toggledByJS true) — needed for runtime states
//   - 6 currently matching (matchCount > 0) — not unused at all
//
// `staticUnusedRules()` returns the union of dead + JS-toggled —
// that's what DevTools Coverage reports as "unused" at page load.
// `trulyDeadRules()` is what you can actually safely delete.

export const UNUSED_RULES: CSSRuleMock[] = [
  { id: "u-old-banner", selector: ".legacy-promo-banner", bodyPreview: "background: gold;", sizeBytes: 280, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-v1-card", selector: ".card--v1", bodyPreview: "border: 2px solid #f00;", sizeBytes: 320, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-old-pricing", selector: ".pricing-2019", bodyPreview: "font-family: Comic Sans MS;", sizeBytes: 260, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-print", selector: ".print-only", bodyPreview: "display: none;", sizeBytes: 180, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-grid-fallback", selector: ".no-grid .card", bodyPreview: "float: left; width: 33%;", sizeBytes: 240, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-ie-shim", selector: "html.ie .nav", bodyPreview: "display: block;", sizeBytes: 200, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-dead-modal", selector: ".cookie-prompt-v1", bodyPreview: "position: fixed; bottom: 0;", sizeBytes: 310, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },
  { id: "u-old-form", selector: ".signup-form--alpha", bodyPreview: "padding: 8px;", sizeBytes: 220, aboveFold: false, matchCount: 0, toggledByJS: false, breaks: "" },

  { id: "u-modal-open", selector: "body.modal-open", bodyPreview: "overflow: hidden;", sizeBytes: 140, aboveFold: false, matchCount: 0, toggledByJS: true, jsReason: "Added by JS when a modal opens", breaks: "Page scrolls underneath the modal" },
  { id: "u-modal", selector: ".modal--open", bodyPreview: "display: grid; place-items: center;", sizeBytes: 340, aboveFold: false, matchCount: 0, toggledByJS: true, jsReason: "Toggled by JS when the user clicks 'Open modal'", breaks: "Modal renders unstyled in the top-left corner" },
  { id: "u-dark", selector: "[data-theme=\"dark\"]", bodyPreview: "--bg: #0e0e10; --fg: #f4f4f5;", sizeBytes: 420, aboveFold: false, matchCount: 0, toggledByJS: true, jsReason: "Set by the theme toggle button", breaks: "Dark mode flashes white" },
  { id: "u-toast-show", selector: ".toast--visible", bodyPreview: "transform: translateY(0); opacity: 1;", sizeBytes: 280, aboveFold: false, matchCount: 0, toggledByJS: true, jsReason: "Added by JS when a toast pops", breaks: "Toast appears but never animates in" },
  { id: "u-focus-form", selector: ".form--focused", bodyPreview: "outline: 2px solid var(--accent);", sizeBytes: 220, aboveFold: false, matchCount: 0, toggledByJS: true, jsReason: "Added on input focus by the form controller", breaks: "Keyboard users lose the focus ring" },
  { id: "u-dragging", selector: ".dragging", bodyPreview: "cursor: grabbing; opacity: 0.6;", sizeBytes: 200, aboveFold: false, matchCount: 0, toggledByJS: true, jsReason: "Added during pointer drag", breaks: "Drag interactions look frozen" },

  { id: "u-nav", selector: ".nav", bodyPreview: "display: flex;", sizeBytes: 280, aboveFold: true, matchCount: 1, toggledByJS: false, breaks: "" },
  { id: "u-card", selector: ".card", bodyPreview: "padding: 24px;", sizeBytes: 380, aboveFold: false, matchCount: 6, toggledByJS: false, breaks: "" },
  { id: "u-h1", selector: "h1", bodyPreview: "font-size: 56px;", sizeBytes: 220, aboveFold: true, matchCount: 1, toggledByJS: false, breaks: "" },
  { id: "u-body", selector: "body", bodyPreview: "margin: 0; font-family: Inter;", sizeBytes: 240, aboveFold: true, matchCount: 1, toggledByJS: false, breaks: "" },
  { id: "u-btn", selector: ".btn", bodyPreview: "padding: 12px 24px;", sizeBytes: 260, aboveFold: true, matchCount: 4, toggledByJS: false, breaks: "" },
  { id: "u-link", selector: "a", bodyPreview: "color: inherit;", sizeBytes: 180, aboveFold: true, matchCount: 12, toggledByJS: false, breaks: "" },
];

export const UNUSED_TOTAL_BYTES = UNUSED_RULES.reduce((s, r) => s + r.sizeBytes, 0);

export function staticUnusedRules(): CSSRuleMock[] {
  return UNUSED_RULES.filter((r) => r.matchCount === 0);
}

export function trulyDeadRules(): CSSRuleMock[] {
  return UNUSED_RULES.filter((r) => r.matchCount === 0 && !r.toggledByJS);
}

export function jsToggledRules(): CSSRuleMock[] {
  return UNUSED_RULES.filter((r) => r.matchCount === 0 && r.toggledByJS);
}

export function safeBytes(): number {
  return trulyDeadRules().reduce((s, r) => s + r.sizeBytes, 0);
}

export function trapBytes(): number {
  return jsToggledRules().reduce((s, r) => s + r.sizeBytes, 0);
}

/**
 * Run an audit pass. For each rule the reader judged either "safe" or
 * "needed-by-js". Returns the totals plus a list of incorrect judgments
 * (i.e. the rules the reader marked safe that are actually JS-toggled).
 */
export type AuditJudgment = "safe" | "needed-by-js";

export function detectUnused(
  rules: CSSRuleMock[],
  judgments: Record<string, AuditJudgment>,
): {
  removed: CSSRuleMock[];
  kept: CSSRuleMock[];
  brokenJsRules: CSSRuleMock[];
  bytesRemoved: number;
  bytesSavedSafely: number;
  bytesAtRisk: number;
} {
  const removed: CSSRuleMock[] = [];
  const kept: CSSRuleMock[] = [];
  const brokenJsRules: CSSRuleMock[] = [];

  for (const r of rules) {
    if (r.matchCount > 0) {
      kept.push(r);
      continue;
    }
    const j = judgments[r.id];
    if (j === "safe") {
      removed.push(r);
      if (r.toggledByJS) brokenJsRules.push(r);
    } else {
      kept.push(r);
    }
  }

  const bytesRemoved = removed.reduce((s, r) => s + r.sizeBytes, 0);
  const bytesSavedSafely = removed
    .filter((r) => !r.toggledByJS)
    .reduce((s, r) => s + r.sizeBytes, 0);
  const bytesAtRisk = brokenJsRules.reduce((s, r) => s + r.sizeBytes, 0);

  return { removed, kept, brokenJsRules, bytesRemoved, bytesSavedSafely, bytesAtRisk };
}

// ── Render-blocking simulator ────────────────────────────────────────

export type RenderBlockingMode = "blocking" | "deferred" | "inline";

export interface RenderBlockingTimeline {
  mode: RenderBlockingMode;
  parserReadyMs: number;
  stylesheetReadyMs: number;
  paintAt: number;
  fcpLabel: string;
  caption: string;
  paintedStyled: boolean;
}

export function simulateRenderBlocking(mode: RenderBlockingMode): RenderBlockingTimeline {
  if (mode === "blocking") {
    return {
      mode,
      parserReadyMs: 240,
      stylesheetReadyMs: 1800,
      paintAt: 1800,
      fcpLabel: "1.8s",
      caption: "The HTML parser is done at 240ms but the browser holds the first paint until the stylesheet finishes loading at 1.8s.",
      paintedStyled: true,
    };
  }
  if (mode === "deferred") {
    return {
      mode,
      parserReadyMs: 240,
      stylesheetReadyMs: 1800,
      paintAt: 280,
      fcpLabel: "0.3s",
      caption: "media=\"print\" tells the browser this sheet doesn't apply to screens, so it doesn't block first paint. But the first paint is unstyled — content snaps to styled when the sheet arrives.",
      paintedStyled: false,
    };
  }
  return {
    mode,
    parserReadyMs: 240,
    stylesheetReadyMs: 1800,
    paintAt: 620,
    fcpLabel: "0.6s",
    caption: "The critical 20% is inlined into a <style> tag — paint releases as soon as the parser sees it, with full above-the-fold styling. The rest streams in behind the paint.",
    paintedStyled: true,
  };
}

// ── Modern CSS demos (step 5) ────────────────────────────────────────

export interface LayerRule {
  layer: string;
  selector: string;
  property: string;
  value: string;
  specificity: SpecificityTuple;
}

// Target element: <button class="button"> — every selector below
// genuinely matches it, so the resolver's winner is the rule that would
// actually apply in a real browser.
export const LAYER_DEMO_RULES: LayerRule[] = [
  { layer: "framework", selector: ".button", property: "padding", value: "12px 24px", specificity: [0, 1, 0] },
  { layer: "framework", selector: ".button", property: "background", value: "#444", specificity: [0, 1, 0] },
  { layer: "components", selector: "button.button", property: "padding", value: "10px 20px", specificity: [0, 1, 1] },
  { layer: "overrides", selector: "button", property: "padding", value: "16px 28px", specificity: [0, 0, 1] },
];

export const LAYER_ORDER = ["reset", "framework", "components", "utilities", "overrides"];

/**
 * Resolve which rule wins for a `<button class="button">` element under
 * layered cascade vs unlayered cascade. With layers, "overrides" wins
 * regardless of selector specificity. Without layers, the highest
 * specificity wins — every selector in LAYER_DEMO_RULES matches the
 * target element, so the resolver's pick is the one a real browser
 * would actually apply.
 */
export function resolveLayerWinner(
  rules: LayerRule[],
  layersEnabled: boolean,
): { winner: LayerRule; reason: string } {
  if (layersEnabled) {
    const last = [...rules]
      .map((r) => ({ r, idx: LAYER_ORDER.indexOf(r.layer) }))
      .sort((a, b) => b.idx - a.idx)[0];
    return {
      winner: last.r,
      reason: `Layer '${last.r.layer}' beats every earlier layer regardless of specificity`,
    };
  }
  const best = rules.reduce((acc, r) => (compareSpecificity(r.specificity, acc.specificity) >= 0 ? r : acc));
  return {
    winner: best,
    reason: `Highest specificity ${formatTuple(best.specificity)} wins; later same-spec source order would tiebreak`,
  };
}

export interface VisibilityCard {
  id: string;
  title: string;
  inViewport: boolean;
  renderMs: number;
}

export function buildVisibilityCards(): VisibilityCard[] {
  // 16 cards in a long list. 4 fit above the fold; the rest are offscreen.
  // Off-screen cards carry more layout/paint cost (images, grid children)
  // so the toggle lands the ~85% reduction the Chrome HTML-spec study cites.
  return Array.from({ length: 16 }, (_, i) => {
    const inViewport = i < 4;
    return {
      id: `card-${i}`,
      title: `Card ${i + 1}`,
      inViewport,
      renderMs: inViewport ? 12 + (i % 4) * 1 : 24 + (i % 4) * 2,
    };
  });
}

export function totalRenderMs(cards: VisibilityCard[], cvEnabled: boolean): number {
  if (cvEnabled) {
    return cards.filter((c) => c.inViewport).reduce((s, c) => s + c.renderMs, 0);
  }
  return cards.reduce((s, c) => s + c.renderMs, 0);
}

export interface CSSInJSMode {
  id: "runtime" | "zero-runtime";
  label: string;
  description: string;
  hydrationCostMs: number;
  fcpDeltaMs: number;
}

export const CSS_IN_JS_MODES: CSSInJSMode[] = [
  {
    id: "runtime",
    label: "Runtime (styled-components, @emotion/styled)",
    description: "Inject CSSOM rules at hydration on the main thread",
    hydrationCostMs: 180,
    fcpDeltaMs: 220,
  },
  {
    id: "zero-runtime",
    label: "Zero-runtime (vanilla-extract, linaria, Tailwind v4)",
    description: "Static .css file at build time — browser treats it like any stylesheet",
    hydrationCostMs: 0,
    fcpDeltaMs: 0,
  },
];

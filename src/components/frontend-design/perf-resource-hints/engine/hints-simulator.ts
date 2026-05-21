// ── Resource Hints Simulator ──────────────────────────────────────
// Pure, deterministic timeline math for the perf-hints lesson.
// Given a baseline set of resources + active hints, returns timed bars
// (with separate connection + download phases) the UI can render.

// ── Types ─────────────────────────────────────────────────────────

export type ResourceKind = "document" | "css" | "js" | "module" | "font" | "image" | "third-party";

export type HintKind =
  | "dns-prefetch"
  | "preconnect"
  | "preload"
  | "modulepreload"
  | "prefetch"
  | "fetchpriority-high"
  | "speculation-prerender";

export type PriorityTier = "high" | "medium" | "low" | "idle";

export type ConnectionPhase = {
  /** "dns" | "tcp" | "tls" — only present for cross-origin first hits. */
  kind: "dns" | "tcp" | "tls";
  startMs: number;
  durationMs: number;
};

export type ResourceTemplate = {
  id: string;
  label: string;
  url: string;
  kind: ResourceKind;
  sizeKB: number;
  /** Cross-origin requires DNS+TCP+TLS handshake on first connection. */
  crossOrigin: boolean;
  /** Origin grouping — shared origin can share a warmed connection. */
  origin: string;
  /** Resources blocking initial render. */
  blocking: boolean;
  /** Discovery: how late the browser finds this without a hint. */
  discoveredAt: number;
  /** Default priority tier. */
  defaultPriority: PriorityTier;
  /** For next-page resources — they're for a future navigation. */
  forNextNav?: boolean;
  /** Module dependency: a chunk this depends on. */
  moduleParent?: string;
};

export type HintApplication = {
  hint: HintKind;
  targetResourceId: string;
  /** Optional eagerness for speculation rules. */
  eagerness?: "immediate" | "eager" | "moderate" | "conservative";
};

export type Bar = {
  resourceId: string;
  label: string;
  kind: ResourceKind;
  priority: PriorityTier;
  /** DNS+TCP+TLS phases (omitted when connection is warm). */
  connectionPhases: ConnectionPhase[];
  /** Body download (or compile, for module/prerender). */
  downloadStartMs: number;
  downloadDurationMs: number;
  /** Total span: connection start (if any) → download end. */
  startMs: number;
  endMs: number;
  /** Ghost positions of the baseline run, used to render the "before" overlay. */
  baselineStartMs: number;
  baselineEndMs: number;
  /** True if a hint moved this bar. */
  hinted: boolean;
  /** Highest-impact hint applied (for badge labels). */
  hintsApplied: HintKind[];
  /** For modulepreload: parse-and-compile overlay alongside download. */
  hasParseOverlay: boolean;
  /** For prefetch / speculation prerender. */
  forNextNav: boolean;
  /** True if this resource was demoted by priority inversion. */
  invertedDown: boolean;
};

export type TimelineResult = {
  bars: Bar[];
  /** Total page-load endpoint (max non-next-nav download end). */
  loadEndMs: number;
  /** Same, but for the prerendered next page. */
  nextPageEndMs: number;
  /** "Time saved" per bar (negative = slower). */
  savedMs: Record<string, number>;
  /** True if too many hints are active and bandwidth is saturated. */
  priorityInversion: boolean;
  /** Count of high-priority hints active. */
  highPriorityCount: number;
};

// ── Tunable network model ─────────────────────────────────────────

const DNS_MS = 50;
const TCP_MS = 50;
const TLS_MS = 100;
/**
 * Simulated 3G download model. The constant is tuned so a 220KB script lands
 * around 880ms — enough to make the bandwidth tradeoffs in the timeline
 * legible at the scale the SVG renders.
 */
const MS_PER_KB = 4.0;
const REQ_OVERHEAD_MS = 30;

/** Convert sizeKB → ms of download. */
function bytesToMs(sizeKB: number): number {
  return Math.max(20, Math.round(sizeKB * MS_PER_KB + REQ_OVERHEAD_MS));
}

// ── Baseline page ─────────────────────────────────────────────────
//
// Eleven resources stage a typical page load. Three are cross-origin
// (font CDN, analytics). The hero is the LCP element. Three card
// images sit below-the-fold — used by the Priority Inversion step,
// which preloads ALL of them to demonstrate bandwidth saturation.

export const BASELINE_RESOURCES: ResourceTemplate[] = [
  {
    id: "doc",
    label: "index.html",
    url: "/index.html",
    kind: "document",
    sizeKB: 14,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 0,
    defaultPriority: "high",
  },
  {
    id: "css",
    label: "styles.css",
    url: "/styles.css",
    kind: "css",
    sizeKB: 48,
    crossOrigin: false,
    origin: "self",
    blocking: true,
    discoveredAt: 60,
    defaultPriority: "high",
  },
  {
    id: "app",
    label: "app.js",
    url: "/app.mjs",
    kind: "module",
    sizeKB: 220,
    crossOrigin: false,
    origin: "self",
    blocking: true,
    discoveredAt: 60,
    defaultPriority: "high",
  },
  {
    id: "admin",
    label: "admin.mjs",
    url: "/chunks/admin.mjs",
    kind: "module",
    sizeKB: 95,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 580,
    defaultPriority: "medium",
    moduleParent: "app",
  },
  {
    id: "font",
    label: "Inter.woff2",
    url: "https://cdn.example.com/Inter.woff2",
    kind: "font",
    sizeKB: 28,
    crossOrigin: true,
    origin: "fonts-cdn",
    blocking: false,
    discoveredAt: 320,
    defaultPriority: "medium",
  },
  {
    id: "hero",
    label: "hero.webp",
    url: "/img/hero.webp",
    kind: "image",
    sizeKB: 84,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 520,
    defaultPriority: "medium",
  },
  {
    id: "analytics",
    label: "analytics.js",
    url: "https://a.example.com/m.js",
    kind: "third-party",
    sizeKB: 38,
    crossOrigin: true,
    origin: "analytics",
    blocking: false,
    discoveredAt: 80,
    defaultPriority: "low",
  },
  // Below-the-fold card images — dormant in early steps, mass-preloaded
  // in step 5 to demonstrate the priority-inversion trap.
  {
    id: "card-1",
    label: "card-1.webp",
    url: "/img/card-1.webp",
    kind: "image",
    sizeKB: 60,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 640,
    defaultPriority: "low",
  },
  {
    id: "card-2",
    label: "card-2.webp",
    url: "/img/card-2.webp",
    kind: "image",
    sizeKB: 58,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 680,
    defaultPriority: "low",
  },
  {
    id: "card-3",
    label: "card-3.webp",
    url: "/img/card-3.webp",
    kind: "image",
    sizeKB: 62,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 720,
    defaultPriority: "low",
  },
  {
    id: "next-page",
    label: "products.mjs",
    url: "/chunks/products.mjs",
    kind: "module",
    sizeKB: 72,
    crossOrigin: false,
    origin: "self",
    blocking: false,
    discoveredAt: 0,
    defaultPriority: "idle",
    forNextNav: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function isCrossOriginUnwarmed(
  template: ResourceTemplate,
  warmedOrigins: Set<string>,
): boolean {
  return template.crossOrigin && !warmedOrigins.has(template.origin);
}

function connectionPhases(
  template: ResourceTemplate,
  startMs: number,
  warmedOrigins: Set<string>,
): { phases: ConnectionPhase[]; readyAt: number } {
  if (!isCrossOriginUnwarmed(template, warmedOrigins)) {
    return { phases: [], readyAt: startMs };
  }
  const dns: ConnectionPhase = { kind: "dns", startMs, durationMs: DNS_MS };
  const tcp: ConnectionPhase = { kind: "tcp", startMs: startMs + DNS_MS, durationMs: TCP_MS };
  const tls: ConnectionPhase = { kind: "tls", startMs: startMs + DNS_MS + TCP_MS, durationMs: TLS_MS };
  return {
    phases: [dns, tcp, tls],
    readyAt: startMs + DNS_MS + TCP_MS + TLS_MS,
  };
}

// ── Compute baseline timeline (no hints) ──────────────────────────

function computeBaselineTimings(): Map<string, { startMs: number; endMs: number }> {
  const result = new Map<string, { startMs: number; endMs: number }>();
  const warmed = new Set<string>();
  for (const r of BASELINE_RESOURCES) {
    if (r.forNextNav) {
      // Next-page chunks aren't loaded by default.
      result.set(r.id, { startMs: 2000, endMs: 2000 });
      continue;
    }
    const { phases, readyAt } = connectionPhases(r, r.discoveredAt, warmed);
    const dlStart = readyAt;
    const dlMs = bytesToMs(r.sizeKB);
    const endMs = dlStart + dlMs;
    const startMs = phases.length > 0 ? phases[0].startMs : dlStart;
    if (r.crossOrigin) warmed.add(r.origin);
    result.set(r.id, { startMs, endMs });
  }
  return result;
}

const BASELINE_TIMINGS = computeBaselineTimings();

// ── Compute hinted timeline ───────────────────────────────────────

export function computeTimeline(hints: HintApplication[]): TimelineResult {
  const byTarget = new Map<string, HintApplication[]>();
  for (const h of hints) {
    const list = byTarget.get(h.targetResourceId) ?? [];
    list.push(h);
    byTarget.set(h.targetResourceId, list);
  }

  // Track active high-priority preloads — > 4 triggers inversion.
  const preloadIds = hints
    .filter((h) => h.hint === "preload" || h.hint === "fetchpriority-high")
    .map((h) => h.targetResourceId);
  const distinctPreloads = new Set(preloadIds);
  const highPriorityCount = distinctPreloads.size;
  const priorityInversion = highPriorityCount >= 5;
  const inversionPenalty = priorityInversion ? 1.35 : 1.0;

  // Pre-warmed origins from preconnect / speculation prerender.
  const warmedOrigins = new Set<string>();
  for (const h of hints) {
    if (h.hint === "preconnect") {
      const tpl = BASELINE_RESOURCES.find((r) => r.id === h.targetResourceId);
      if (tpl?.crossOrigin) warmedOrigins.add(tpl.origin);
    }
  }
  // dns-prefetch also handles DNS early; the TCP+TLS still happen at request
  // time but DNS itself overlaps with parse — model this with `dnsPrewarmed`.
  const dnsPrewarmedOrigins = new Set<string>();
  for (const h of hints) {
    if (h.hint === "dns-prefetch") {
      const tpl = BASELINE_RESOURCES.find((r) => r.id === h.targetResourceId);
      if (tpl?.crossOrigin) dnsPrewarmedOrigins.add(tpl.origin);
    }
  }

  const bars: Bar[] = [];
  const savedMs: Record<string, number> = {};
  let loadEndMs = 0;
  let nextPageEndMs = 0;
  const warmedDuringRun = new Set<string>();

  for (const r of BASELINE_RESOURCES) {
    const applied = byTarget.get(r.id) ?? [];
    const hasPreload = applied.some((h) => h.hint === "preload");
    const hasModulePreload = applied.some((h) => h.hint === "modulepreload");
    const hasFetchPriorityHigh = applied.some((h) => h.hint === "fetchpriority-high");
    const hasPrefetch = applied.some((h) => h.hint === "prefetch");
    const hasPrerender = applied.some((h) => h.hint === "speculation-prerender");

    // Next-nav resources only load if a future-nav hint applies, otherwise the
    // browser doesn't speculatively fetch them at all.
    if (r.forNextNav && !hasPrefetch && !hasPrerender) {
      bars.push({
        resourceId: r.id,
        label: r.label,
        kind: r.kind,
        priority: r.defaultPriority,
        connectionPhases: [],
        downloadStartMs: 0,
        downloadDurationMs: 0,
        startMs: 0,
        endMs: 0,
        baselineStartMs: 0,
        baselineEndMs: 0,
        hinted: false,
        hintsApplied: [],
        hasParseOverlay: false,
        forNextNav: true,
        invertedDown: false,
      });
      savedMs[r.id] = 0;
      continue;
    }

    // Determine priority.
    let priority: PriorityTier = r.defaultPriority;
    if (hasPreload || hasFetchPriorityHigh) priority = "high";
    else if (hasModulePreload) priority = "high";
    else if (hasPrefetch || hasPrerender) priority = "idle";

    // Determine discovery / fetch start.
    // - preload / modulepreload: starts at HTML parse (~30ms after doc start).
    // - default: starts at template.discoveredAt.
    // - prefetch / prerender: starts after main load (idle bandwidth).
    // - fetchpriority=high alone: discovery is unchanged but the queue
    //   reorder lets the resource skip ~half of the queueing delay vs its
    //   default tier — modelled by pulling discovery in by ~40% of the gap.
    let fetchStart: number;
    if (hasPrefetch || hasPrerender) {
      // Idle: start near the end of the critical path.
      fetchStart = 1450;
    } else if (hasPreload || hasModulePreload) {
      fetchStart = 30;
    } else if (hasFetchPriorityHigh) {
      // Image still discovered during HTML parse, but bandwidth reallocation
      // lets it start ~40% earlier than its default queued slot.
      fetchStart = Math.max(60, Math.round(r.discoveredAt * 0.4));
    } else {
      fetchStart = r.discoveredAt;
    }

    // Queue-ordering pre-emption: render-blocking resources sit at a STRICTLY
    // higher tier than preloads. When the queue saturates (priorityInversion),
    // non-blocking preloads get pushed BEHIND the blocking CSS bar to make the
    // tier hierarchy visible in the timeline.
    if ((hasPreload || hasFetchPriorityHigh) && priorityInversion && !r.blocking) {
      // Blocking CSS starts ~30ms into HTML parse and downloads through ~250ms.
      // Push preloads to start where blocking CSS has had a head start.
      const blockingHeadStart = 220;
      fetchStart = Math.max(fetchStart, blockingHeadStart);
      // Plus the bandwidth-saturation queue penalty.
      fetchStart += 60;
    }

    // Connection phases.
    let phases: ConnectionPhase[] = [];
    let readyAt = fetchStart;
    if (r.crossOrigin && !warmedOrigins.has(r.origin) && !warmedDuringRun.has(r.origin)) {
      if (dnsPrewarmedOrigins.has(r.origin)) {
        // dns-prefetch: DNS already resolved, TCP+TLS still happen at request.
        phases = [
          { kind: "tcp", startMs: fetchStart, durationMs: TCP_MS },
          { kind: "tls", startMs: fetchStart + TCP_MS, durationMs: TLS_MS },
        ];
        readyAt = fetchStart + TCP_MS + TLS_MS;
      } else {
        const c = connectionPhases(r, fetchStart, warmedOrigins);
        phases = c.phases;
        readyAt = c.readyAt;
      }
    } else if (r.crossOrigin && warmedOrigins.has(r.origin)) {
      // Preconnect already warmed the connection — no phases here.
      phases = [];
      readyAt = fetchStart;
    }

    // Download with bandwidth saturation if inverted.
    let downloadDuration = Math.round(bytesToMs(r.sizeKB) * inversionPenalty);
    // modulepreload also parses + compiles during download (no extra wall time).
    if (hasModulePreload) {
      downloadDuration = bytesToMs(r.sizeKB);
    }
    // Speculation prerender does full work — represent as a single longer bar
    // for the next page so the contrast vs prefetch is visible.
    if (hasPrerender) {
      downloadDuration = bytesToMs(r.sizeKB) + 220; // includes parse + render + hydrate
    }

    const downloadStartMs = readyAt;
    const downloadEndMs = downloadStartMs + downloadDuration;

    if (r.crossOrigin) warmedDuringRun.add(r.origin);

    const startMs = phases.length > 0 ? phases[0].startMs : downloadStartMs;
    const endMs = downloadEndMs;

    const baseline = BASELINE_TIMINGS.get(r.id) ?? { startMs: 0, endMs: 0 };

    const bar: Bar = {
      resourceId: r.id,
      label: r.label,
      kind: r.kind,
      priority,
      connectionPhases: phases,
      downloadStartMs,
      downloadDurationMs: downloadDuration,
      startMs,
      endMs,
      baselineStartMs: baseline.startMs,
      baselineEndMs: baseline.endMs,
      hinted: applied.length > 0,
      hintsApplied: applied.map((h) => h.hint),
      hasParseOverlay: hasModulePreload,
      forNextNav: r.forNextNav === true,
      invertedDown: priorityInversion && priority === "medium",
    };

    bars.push(bar);
    if (r.forNextNav) {
      nextPageEndMs = Math.max(nextPageEndMs, endMs);
    } else {
      loadEndMs = Math.max(loadEndMs, endMs);
    }

    savedMs[r.id] = baseline.endMs - endMs;
  }

  return { bars, loadEndMs, nextPageEndMs, savedMs, priorityInversion, highPriorityCount };
}

// ── Step → hint scenarios ─────────────────────────────────────────
//
// Each step in the lesson maps to a cumulative set of hints. The lab
// shows the timeline shifting as the reader advances.

export type StepScenario = {
  id: number;
  /**
   * Two-letter code for the StepBar — title-initials of the step title.
   * Bs=Baseline, Pc=Pre-connect, Pl=Preload, Fp=Fetchpriority,
   * Pi=Priority-inversion, Pf=Prefetch, Sr=Speculation-Rules.
   * Kept terse so the StepBar fits in the 56px-tall lab header.
   */
  code: string;
  /** Long-form label for aria-labels. */
  label: string;
  /** Cumulative hints applied at this step. */
  hints: HintApplication[];
  /** A one-line callout describing what changed. */
  callout: string;
  /** The "code panel" snippet displayed. */
  snippet: string;
  /** Resource the user should focus on. */
  focusId: string;
};

// Each step maps 1:1 to a section in resource-hints.mdx. Hints are
// cumulative so the timeline progressively reveals the optimization.
// Step 5 deliberately piles 3 extra preloads on the card images to push
// highPriorityCount past 5 and trigger the priority-inversion guardrail.
export const STEP_SCENARIOS: StepScenario[] = [
  {
    id: 1,
    code: "Bs",
    label: "Baseline",
    hints: [],
    callout:
      "Eleven resources, no hints. The font waits ~320ms before the browser even discovers it. The hero waits ~520ms.",
    snippet:
      "<!-- no resource hints — every origin pays the full connection tax -->\n<head>\n  <link rel=\"stylesheet\" href=\"/styles.css\">\n  <script type=\"module\" src=\"/app.mjs\"></script>\n</head>",
    focusId: "font",
  },
  {
    id: 2,
    code: "Pc",
    label: "Pre-connect (dns-prefetch + preconnect)",
    hints: [
      { hint: "dns-prefetch", targetResourceId: "analytics" },
      { hint: "preconnect", targetResourceId: "font" },
    ],
    callout:
      "dns-prefetch on analytics + preconnect on the font CDN. ~50ms saved on the third-party, ~200ms saved on the font (full DNS+TCP+TLS).",
    snippet:
      "<link rel=\"dns-prefetch\" href=\"//a.example.com\">\n<link rel=\"preconnect\" href=\"https://cdn.example.com\" crossorigin>\n<!-- preconnect = strict superset of dns-prefetch -->\n<!-- crossorigin is REQUIRED for CORS resources (fonts always CORS) -->",
    focusId: "font",
  },
  {
    id: 3,
    code: "Pl",
    label: "Preload + modulepreload",
    hints: [
      { hint: "dns-prefetch", targetResourceId: "analytics" },
      { hint: "preconnect", targetResourceId: "font" },
      { hint: "preload", targetResourceId: "font" },
      { hint: "modulepreload", targetResourceId: "admin" },
    ],
    callout:
      "preload starts the font download alongside CSS — discovery chain collapses. modulepreload also parses + resolves the admin chunk's import graph during idle.",
    snippet:
      "<link rel=\"preload\" href=\"/Inter.woff2\"\n      as=\"font\" type=\"font/woff2\" crossorigin>\n<link rel=\"modulepreload\" href=\"/chunks/admin.mjs\">\n<!-- as=\"...\" is mandatory; crossorigin REQUIRED for fonts -->",
    focusId: "font",
  },
  {
    id: 4,
    code: "Fp",
    label: "Fetchpriority",
    hints: [
      { hint: "dns-prefetch", targetResourceId: "analytics" },
      { hint: "preconnect", targetResourceId: "font" },
      { hint: "preload", targetResourceId: "font" },
      { hint: "modulepreload", targetResourceId: "admin" },
      { hint: "fetchpriority-high", targetResourceId: "hero" },
    ],
    callout:
      "fetchpriority=\"high\" promotes the LCP image inside the browser's queue without a preload tag. The modern 2024+ pattern.",
    snippet:
      "<img src=\"/img/hero.webp\"\n     fetchpriority=\"high\"\n     width=\"1200\" height=\"675\"\n     alt=\"Hero\">\n<!-- replaces <link rel=preload as=image> for LCP images -->",
    focusId: "hero",
  },
  {
    id: 5,
    code: "Pi",
    label: "Priority Inversion",
    hints: [
      { hint: "dns-prefetch", targetResourceId: "analytics" },
      { hint: "preconnect", targetResourceId: "font" },
      { hint: "preload", targetResourceId: "font" },
      { hint: "modulepreload", targetResourceId: "admin" },
      { hint: "fetchpriority-high", targetResourceId: "hero" },
      // The reader thinks "more preloads = faster". Piling preload onto
      // every card image pushes highPriorityCount to 5 and trips the trap.
      { hint: "preload", targetResourceId: "card-1" },
      { hint: "preload", targetResourceId: "card-2" },
      { hint: "preload", targetResourceId: "card-3" },
    ],
    callout:
      "Five+ high-priority hints saturate the queue. Bandwidth slows EVERY download by ~35% — even the render-blocking app.js. The card preloads also sit behind the blocking CSS bar instead of starting at parse time.",
    snippet:
      "<!-- ❌ priority inversion in progress -->\n<link rel=\"preload\" as=\"image\" href=\"/card-1.webp\">\n<link rel=\"preload\" as=\"image\" href=\"/card-2.webp\">\n<link rel=\"preload\" as=\"image\" href=\"/card-3.webp\">\n<!-- now competing with font preload + hero fetchpriority -->\n<!-- render-blocking CSS still beats them all -->",
    focusId: "app",
  },
  {
    id: 6,
    code: "Pf",
    label: "Prefetch",
    hints: [
      { hint: "dns-prefetch", targetResourceId: "analytics" },
      { hint: "preconnect", targetResourceId: "font" },
      { hint: "preload", targetResourceId: "font" },
      { hint: "modulepreload", targetResourceId: "admin" },
      { hint: "fetchpriority-high", targetResourceId: "hero" },
      { hint: "prefetch", targetResourceId: "next-page" },
    ],
    callout:
      "prefetch on the /products chunk loads it AFTER the current page's critical work — idle bandwidth, lowest priority. The next-page bar appears past the load endpoint.",
    snippet:
      "<link rel=\"prefetch\" href=\"/chunks/products.mjs\" as=\"script\">\n<link rel=\"prefetch\" href=\"/api/products.json\"\n      as=\"fetch\" crossorigin>\n<!-- as=\"...\" mandatory: 'script' for JS, 'fetch' for JSON+CORS -->",
    focusId: "next-page",
  },
  {
    id: 7,
    code: "Sr",
    label: "Speculation Rules",
    hints: [
      { hint: "dns-prefetch", targetResourceId: "analytics" },
      { hint: "preconnect", targetResourceId: "font" },
      { hint: "preload", targetResourceId: "font" },
      { hint: "modulepreload", targetResourceId: "admin" },
      { hint: "fetchpriority-high", targetResourceId: "hero" },
      {
        hint: "speculation-prerender",
        targetResourceId: "next-page",
        eagerness: "moderate",
      },
    ],
    callout:
      "Speculation Rules prerender the /products page in a hidden tab — download + parse + execute + layout. Click → instant tab swap, ~0ms navigation.",
    snippet:
      "<script type=\"speculationrules\">\n{\n  \"prerender\": [{\n    \"source\": \"document\",\n    \"where\": { \"href_matches\": \"/products/*\" },\n    \"eagerness\": \"moderate\"\n  }]\n}\n</script>\n<!-- eagerness: immediate | eager | moderate | conservative -->",
    focusId: "next-page",
  },
];

export const TOTAL_STEPS = STEP_SCENARIOS.length;

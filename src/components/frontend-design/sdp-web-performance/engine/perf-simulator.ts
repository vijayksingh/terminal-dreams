// ── Types ───────────────────────────────────────────────────────────

export type ResourceType =
  | "document"
  | "css"
  | "js"
  | "font"
  | "image"
  | "third-party";

export type OptimizationId =
  | "codeSplitting"
  | "criticalCSS"
  | "imageOptimization"
  | "fontLoading"
  | "thirdPartyDefer"
  | "longTaskBreaking"
  | "layoutStability"
  | "caching"
  | "prefetching";

type ResourceTemplate = {
  id: string;
  label: string;
  type: ResourceType;
  sizeKB: number;
  blocking: boolean;
  waitFor: string | null;
  deferBy: number;
};

export type WaterfallResource = {
  id: string;
  label: string;
  type: ResourceType;
  sizeKB: number;
  blocking: boolean;
  startMs: number;
  endMs: number;
  optimized: boolean;
  dependsOn: string | null;
};

export type CLSSource = {
  source: string;
  viewportFrac: number;
  distFrac: number;
  shift: number;
  fixed: boolean;
};

export type FontDisplayStrategy = "block" | "swap" | "fallback" | "optional";

export type OptimizationParams = {
  codeSplitPct: number;
  criticalCssKB: number;
  imageFormat: "jpeg" | "webp" | "avif";
  imageQuality: number;
  yieldMs: number;
  fontStrategy: FontDisplayStrategy;
  thirdPartyStrategies: Record<string, "eager" | "defer" | "idle" | "interaction">;
};

export const DEFAULT_OPT_PARAMS: OptimizationParams = {
  codeSplitPct: 30,
  criticalCssKB: 4,
  imageFormat: "avif",
  imageQuality: 75,
  yieldMs: 50,
  fontStrategy: "optional",
  thirdPartyStrategies: {
    "analytics": "idle",
    "ads": "defer",
    "chatbot": "interaction",
  },
};

export type PerfMetrics = {
  fcp: number;
  lcp: number;
  inp: number;
  cls: number;
  clsSources: CLSSource[];
  tbt: number;
  totalSizeKB: number;
  jsSizeKB: number;
  requestCount: number;
};

// ── Network conditions ──────────────────────────────────────────

export type NetworkCondition = "slow-3g" | "3g" | "4g" | "wifi";

export type NetworkProfile = {
  label: string;
  multiplier: number;
  rtt: number;
};

export const NETWORK_PROFILES: Record<NetworkCondition, NetworkProfile> = {
  "slow-3g": { label: "Slow 3G", multiplier: 8.0, rtt: 150 },
  "3g": { label: "3G (mobile)", multiplier: 4.2, rtt: 60 },
  "4g": { label: "4G", multiplier: 1.2, rtt: 40 },
  wifi: { label: "Wi-Fi", multiplier: 0.5, rtt: 10 },
};

export type OptimizationMeta = {
  id: OptimizationId;
  label: string;
  step: number;
  description: string;
};

export const OPTIMIZATIONS: OptimizationMeta[] = [
  { id: "codeSplitting", label: "Code Splitting", step: 5, description: "Split monolithic bundle into route-based chunks" },
  { id: "criticalCSS", label: "Critical CSS", step: 6, description: "Inline critical styles, async load the rest" },
  { id: "imageOptimization", label: "Image Optimization", step: 7, description: "WebP/AVIF, responsive srcset, lazy loading" },
  { id: "fontLoading", label: "Font Strategy", step: 8, description: "Preload, subset, font-display: swap" },
  { id: "thirdPartyDefer", label: "Third-Party Defer", step: 9, description: "Defer analytics, ads, chat to idle time" },
  { id: "longTaskBreaking", label: "Long Task Breaking", step: 10, description: "Break computation into smaller chunks via scheduler" },
  { id: "layoutStability", label: "Layout Stability", step: 11, description: "Reserve space, CSS contain, aspect-ratio" },
  { id: "caching", label: "Caching Strategy", step: 12, description: "Service worker + stale-while-revalidate" },
  { id: "prefetching", label: "Prefetching", step: 13, description: "Route prediction + speculation rules" },
];

const SLIDER_STOPS: { pos: number; profile: NetworkProfile }[] = [
  { pos: 0, profile: NETWORK_PROFILES["slow-3g"] },
  { pos: 33, profile: NETWORK_PROFILES["3g"] },
  { pos: 66, profile: NETWORK_PROFILES["4g"] },
  { pos: 100, profile: NETWORK_PROFILES.wifi },
];

export function interpolateNetwork(sliderValue: number): NetworkProfile {
  const clamped = Math.max(0, Math.min(100, sliderValue));
  let lo = SLIDER_STOPS[0];
  let hi = SLIDER_STOPS[SLIDER_STOPS.length - 1];
  for (let i = 0; i < SLIDER_STOPS.length - 1; i++) {
    if (clamped >= SLIDER_STOPS[i].pos && clamped <= SLIDER_STOPS[i + 1].pos) {
      lo = SLIDER_STOPS[i];
      hi = SLIDER_STOPS[i + 1];
      break;
    }
  }
  const range = hi.pos - lo.pos;
  const t = range === 0 ? 0 : (clamped - lo.pos) / range;
  const multiplier = lo.profile.multiplier + t * (hi.profile.multiplier - lo.profile.multiplier);
  const rtt = lo.profile.rtt + t * (hi.profile.rtt - lo.profile.rtt);
  const speed = 1000 / multiplier;
  const label = speed >= 1000 ? `${(speed / 1000).toFixed(1)} MB/s` : `${Math.round(speed)} KB/s`;
  return { label, multiplier: Math.round(multiplier * 100) / 100, rtt: Math.round(rtt) };
}

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  document: "var(--diagram-layer-0)",
  css: "var(--diagram-layer-3)",
  js: "var(--diagram-layer-4)",
  font: "var(--diagram-layer-2)",
  image: "var(--diagram-layer-5)",
  "third-party": "var(--diagram-layer-7)",
};

// ── Bandwidth model ─────────────────────────────────────────────

function downloadMs(sizeKB: number, profile: NetworkProfile): number {
  return Math.round(sizeKB * profile.multiplier + profile.rtt);
}

// ── Baseline Resources ──────────────────────────────────────────

const BASELINE: ResourceTemplate[] = [
  { id: "html", label: "index.html", type: "document", sizeKB: 12, blocking: false, waitFor: null, deferBy: 0 },
  { id: "css-bundle", label: "styles.css", type: "css", sizeKB: 48, blocking: true, waitFor: "html", deferBy: 0 },
  { id: "main-js", label: "main.js", type: "js", sizeKB: 385, blocking: true, waitFor: "html", deferBy: 0 },
  { id: "analytics", label: "analytics.js", type: "third-party", sizeKB: 38, blocking: false, waitFor: "html", deferBy: 0 },
  { id: "font", label: "Inter.woff2", type: "font", sizeKB: 82, blocking: false, waitFor: "css-bundle", deferBy: 0 },
  { id: "hero-img", label: "hero.jpg", type: "image", sizeKB: 245, blocking: false, waitFor: "main-js", deferBy: 20 },
  { id: "img-2", label: "card-1.jpg", type: "image", sizeKB: 95, blocking: false, waitFor: "main-js", deferBy: 20 },
  { id: "img-3", label: "card-2.jpg", type: "image", sizeKB: 110, blocking: false, waitFor: "main-js", deferBy: 20 },
  { id: "img-4", label: "banner.jpg", type: "image", sizeKB: 88, blocking: false, waitFor: "main-js", deferBy: 20 },
  { id: "chatbot", label: "chatbot.js", type: "third-party", sizeKB: 125, blocking: false, waitFor: "main-js", deferBy: 0 },
  { id: "ads", label: "ads.js", type: "third-party", sizeKB: 52, blocking: false, waitFor: "main-js", deferBy: 0 },
];

// ── Optimization transforms ─────────────────────────────────────

function applyCodeSplitting(resources: ResourceTemplate[], params: OptimizationParams): ResourceTemplate[] {
  const totalJS = 385;
  const coreKB = Math.round(totalJS * (params.codeSplitPct / 100));
  const lazyKB = totalJS - coreKB;
  return resources.flatMap((r) => {
    if (r.id === "main-js") {
      return [
        { ...r, id: "core-js", label: "core.js", sizeKB: coreKB },
        {
          id: "route-chunk",
          label: "routes.js",
          type: "js" as ResourceType,
          sizeKB: lazyKB,
          blocking: false,
          waitFor: "core-js",
          deferBy: 10,
        },
      ];
    }
    if (r.waitFor === "main-js") return [{ ...r, waitFor: "core-js" }];
    return [r];
  });
}

function applyCriticalCSS(resources: ResourceTemplate[], params: OptimizationParams): ResourceTemplate[] {
  const inlineKB = params.criticalCssKB;
  const asyncKB = 48 - inlineKB;
  return resources.flatMap((r) => {
    if (r.id === "css-bundle") {
      return [
        { ...r, id: "critical-css", label: "critical.css", sizeKB: inlineKB, blocking: inlineKB > 0 },
        {
          id: "async-css",
          label: "styles.css",
          type: "css" as ResourceType,
          sizeKB: asyncKB,
          blocking: false,
          waitFor: "html",
          deferBy: 0,
        },
      ];
    }
    if (r.id === "font" && r.waitFor === "css-bundle") {
      return [{ ...r, waitFor: "critical-css" }];
    }
    return [r];
  });
}

function applyImageOptimization(
  resources: ResourceTemplate[],
  params: OptimizationParams,
): ResourceTemplate[] {
  const formatRatio: Record<string, number> = { jpeg: 1, webp: 0.65, avif: 0.5 };
  const ratio = formatRatio[params.imageFormat] ?? 0.5;
  const qualityFactor = 0.5 + (params.imageQuality / 100) * 0.8;
  const ext = params.imageFormat === "jpeg" ? ".jpg" : `.${params.imageFormat}`;
  return resources.map((r) => {
    if (r.id === "hero-img") {
      return { ...r, label: `hero${ext}`, sizeKB: Math.round(r.sizeKB * ratio * qualityFactor), deferBy: 0 };
    }
    if (r.id === "img-2" || r.id === "img-3" || r.id === "img-4") {
      return {
        ...r,
        label: r.label.replace(".jpg", ext),
        sizeKB: Math.round(r.sizeKB * ratio * qualityFactor),
        deferBy: 1200,
      };
    }
    return r;
  });
}

function applyFontLoading(resources: ResourceTemplate[], params: OptimizationParams): ResourceTemplate[] {
  return resources.map((r) => {
    if (r.id === "font") {
      return { ...r, label: "Inter-sub.woff2", sizeKB: 28, waitFor: "html", deferBy: 0 };
    }
    return r;
  });
}

const DEFER_DELAYS: Record<string, number> = { eager: 0, defer: 1500, idle: 2500, interaction: 4000 };

function applyThirdPartyDefer(
  resources: ResourceTemplate[],
  params: OptimizationParams,
): ResourceTemplate[] {
  return resources.map((r) => {
    const strategy = params.thirdPartyStrategies[r.id];
    if (strategy && strategy !== "eager") {
      return { ...r, deferBy: DEFER_DELAYS[strategy] ?? 2000 };
    }
    return r;
  });
}

function applyCachingFirst(resources: ResourceTemplate[]): ResourceTemplate[] {
  return resources;
}

function applyCachingRepeat(resources: ResourceTemplate[]): ResourceTemplate[] {
  return resources.map((r) => {
    if (r.id === "html") return { ...r, sizeKB: 1 };
    if (r.type === "third-party") return r;
    if (r.type === "css" || r.type === "js") return { ...r, sizeKB: 0, deferBy: 0 };
    return { ...r, sizeKB: 0, deferBy: 0 };
  });
}

function applyPrefetching(resources: ResourceTemplate[]): ResourceTemplate[] {
  return resources.map((r) => {
    if (r.id === "route-chunk") {
      return { ...r, sizeKB: 2, deferBy: 0, waitFor: "html" };
    }
    return r;
  });
}

const WATERFALL_TRANSFORMS: Partial<
  Record<OptimizationId, (r: ResourceTemplate[], p: OptimizationParams) => ResourceTemplate[]>
> = {
  codeSplitting: applyCodeSplitting,
  criticalCSS: applyCriticalCSS,
  imageOptimization: applyImageOptimization,
  fontLoading: applyFontLoading,
  thirdPartyDefer: applyThirdPartyDefer,
  caching: (r) => applyCachingFirst(r),
  prefetching: (r) => applyPrefetching(r),
};

const TRANSFORM_ORDER: OptimizationId[] = [
  "codeSplitting",
  "criticalCSS",
  "imageOptimization",
  "fontLoading",
  "thirdPartyDefer",
  "prefetching",
  "caching",
];

// ── Timing computation ──────────────────────────────────────────

const MAX_THIRD_PARTY_CONNECTIONS = 2;
const BANDWIDTH_SHARING_PENALTY = 0.08;

function computeTimings(templates: ResourceTemplate[], profile: NetworkProfile): WaterfallResource[] {
  const endTimes = new Map<string, number>();
  const result: WaterfallResource[] = [];
  const queue = [...templates];
  const thirdPartySlots: number[] = [];
  let concurrentSameOrigin = 0;

  let safety = queue.length * queue.length;
  while (queue.length > 0 && safety-- > 0) {
    const deferred: ResourceTemplate[] = [];

    for (const r of queue) {
      if (r.waitFor !== null && !endTimes.has(r.waitFor)) {
        deferred.push(r);
        continue;
      }

      const depEnd = r.waitFor !== null ? endTimes.get(r.waitFor)! : 0;
      const readyAt = depEnd + r.deferBy;
      const isThirdParty = r.type === "third-party";

      let startMs = readyAt;

      if (isThirdParty) {
        if (thirdPartySlots.length >= MAX_THIRD_PARTY_CONNECTIONS) {
          thirdPartySlots.sort((a, b) => a - b);
          const earliest = thirdPartySlots.shift()!;
          startMs = Math.max(readyAt, earliest);
        }
      } else {
        concurrentSameOrigin++;
      }

      const bandwidthPenalty = isThirdParty ? 0 : concurrentSameOrigin * BANDWIDTH_SHARING_PENALTY;
      const endMs = startMs + Math.round(downloadMs(r.sizeKB, profile) * (1 + bandwidthPenalty));

      if (isThirdParty) thirdPartySlots.push(endMs);

      endTimes.set(r.id, endMs);
      result.push({
        id: r.id,
        label: r.label,
        type: r.type,
        sizeKB: r.sizeKB,
        blocking: r.blocking,
        startMs,
        endMs,
        optimized: false,
        dependsOn: r.waitFor,
      });
    }

    queue.length = 0;
    queue.push(...deferred);
    concurrentSameOrigin = 0;
  }

  return result;
}

// ── Metric derivation ───────────────────────────────────────────

function deriveMetrics(
  resources: WaterfallResource[],
  enabled: Set<OptimizationId>,
  params: OptimizationParams,
): PerfMetrics {
  const blockingResources = resources.filter((r) => r.blocking);
  const blockingEnd =
    blockingResources.length > 0
      ? Math.max(...blockingResources.map((r) => r.endMs))
      : 60;

  const cssBlocking = blockingResources.filter((r) => r.type === "css");
  const htmlEnd = resources.find((r) => r.id === "html")?.endMs ?? 60;
  const cssBlockingEnd = cssBlocking.length > 0
    ? Math.max(...cssBlocking.map((r) => r.endMs))
    : htmlEnd;
  const fcp = cssBlockingEnd + 50;

  const hero = resources.find(
    (r) => r.id === "hero-img",
  );
  const lcp = hero ? Math.max(hero.endMs + 20, blockingEnd) : blockingEnd + 200;

  const blockingDurations = resources
    .filter((r) => r.blocking && (r.type === "js" || r.type === "css"))
    .map((r) => r.endMs - r.startMs);
  const longTaskTime = blockingDurations
    .filter((d) => d > 50)
    .reduce((sum, d) => sum + (d - 50), 0);
  const thirdPartyExec = enabled.has("thirdPartyDefer") ? 0 : 90;
  const totalBlocking = longTaskTime + thirdPartyExec;
  let inp = Math.round(50 + totalBlocking * 0.65);
  if (enabled.has("longTaskBreaking")) {
    const yieldMs = params.yieldMs;
    const reductionFactor = Math.max(0.05, yieldMs / 400);
    inp = Math.round(50 + (totalBlocking * 0.65) * reductionFactor);
  }
  inp = Math.max(inp, 45);

  const heroHasDimensions = enabled.has("imageOptimization") || enabled.has("layoutStability");
  const heroViewportFrac = hero ? Math.min(hero.sizeKB / 600, 0.42) : 0;
  const heroDistFrac = 0.30;
  const heroShift = heroHasDimensions ? 0 : Math.round(heroViewportFrac * heroDistFrac * 100) / 100;

  const fontRes = resources.find((r) => r.id === "font");
  const fontHasOverrides = enabled.has("fontLoading") || enabled.has("layoutStability");
  const fontViewportFrac = fontRes ? Math.min(fontRes.sizeKB / 100, 0.40) : 0;
  const fontDistFrac = 0.27;
  const fontStrategyClsFactor = fontHasOverrides
    ? ({ block: 0.3, swap: 1.0, fallback: 0.15, optional: 0 })[params.fontStrategy] ?? 0
    : 1;
  const fontShift = fontHasOverrides
    ? Math.round(fontViewportFrac * fontDistFrac * fontStrategyClsFactor * 100) / 100
    : Math.round(fontViewportFrac * fontDistFrac * 100) / 100;

  const adViewportFrac = 0.25;
  const adDistFrac = 0.32;
  const adShift = enabled.has("layoutStability") ? 0 : Math.round(adViewportFrac * adDistFrac * 100) / 100;
  const widgetViewportFrac = 0.08;
  const widgetDistFrac = 0.20;
  const widgetShift = enabled.has("layoutStability") ? 0 : Math.round(widgetViewportFrac * widgetDistFrac * 100) / 100;
  const clsSources: CLSSource[] = [
    { source: "Hero image", viewportFrac: heroViewportFrac, distFrac: heroDistFrac, shift: heroShift, fixed: heroHasDimensions },
    { source: "Font swap", viewportFrac: fontViewportFrac, distFrac: fontDistFrac, shift: fontShift, fixed: fontHasOverrides },
    { source: "Ad injection", viewportFrac: adViewportFrac, distFrac: adDistFrac, shift: adShift, fixed: enabled.has("layoutStability") },
    { source: "Late widget", viewportFrac: widgetViewportFrac, distFrac: widgetDistFrac, shift: widgetShift, fixed: enabled.has("layoutStability") },
  ];
  let cls = heroShift + fontShift + adShift + widgetShift;
  cls = Math.max(cls, 0.01);
  cls = Math.round(cls * 100) / 100;

  const blockingTasks = resources
    .filter((r) => r.blocking && (r.type === "js" || r.type === "css"))
    .map((r) => r.endMs - r.startMs);
  const thirdPartyTasks = resources
    .filter((r) => r.type === "third-party")
    .map((r) => Math.round((r.endMs - r.startMs) * 0.4));
  const allTasks = enabled.has("thirdPartyDefer")
    ? blockingTasks
    : [...blockingTasks, ...thirdPartyTasks];
  let tbt = allTasks
    .filter((d) => d > 50)
    .reduce((sum, d) => sum + (d - 50), 0);
  if (enabled.has("longTaskBreaking")) {
    const yieldFactor = Math.max(0.02, params.yieldMs / 400);
    tbt = Math.round(tbt * yieldFactor);
  }
  tbt = Math.max(tbt, 0);

  const cutoff = blockingEnd + 1500;
  const initialResources = resources.filter((r) => r.startMs < cutoff);
  const totalSizeKB = Math.round(
    initialResources.reduce((sum, r) => sum + r.sizeKB, 0),
  );
  const jsSizeKB = Math.round(
    initialResources
      .filter((r) => r.type === "js" || r.type === "third-party")
      .reduce((sum, r) => sum + r.sizeKB, 0),
  );

  return {
    fcp: Math.round(fcp),
    lcp: Math.round(lcp),
    inp: Math.round(inp),
    cls,
    clsSources,
    tbt: Math.round(tbt),
    totalSizeKB,
    jsSizeKB,
    requestCount: resources.length,
  };
}

// ── CWV rating ──────────────────────────────────────────────────

export function getCWVRating(
  metric: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    fcp: [1800, 3000],
    lcp: [2500, 4000],
    inp: [200, 500],
    cls: [0.1, 0.25],
    tbt: [200, 600],
  };
  const t = thresholds[metric];
  if (!t) return "good";
  return value <= t[0] ? "good" : value <= t[1] ? "needs-improvement" : "poor";
}

// ── Public API ──────────────────────────────────────────────────

export function computePerformance(
  enabled: Set<OptimizationId>,
  network: NetworkCondition | NetworkProfile = "3g",
  visitType: "first" | "repeat" = "first",
  params: OptimizationParams = DEFAULT_OPT_PARAMS,
): {
  resources: WaterfallResource[];
  metrics: PerfMetrics;
  timelineEndMs: number;
} {
  const profile = typeof network === "string" ? NETWORK_PROFILES[network] : network;
  let templates: ResourceTemplate[] = BASELINE.map((r) => ({ ...r }));

  for (const opt of TRANSFORM_ORDER) {
    const fn = WATERFALL_TRANSFORMS[opt];
    if (enabled.has(opt) && fn) {
      templates = fn(templates, params);
    }
  }

  if (enabled.has("caching") && visitType === "repeat") {
    templates = applyCachingRepeat(templates);
  }

  const resources = computeTimings(templates, profile);

  const baselineIds = new Set(BASELINE.map((r) => r.id));
  const baselineSizes = new Map(BASELINE.map((r) => [r.id, r.sizeKB]));
  for (const r of resources) {
    if (!baselineIds.has(r.id)) {
      r.optimized = true;
    } else {
      const origSize = baselineSizes.get(r.id);
      if (origSize !== undefined && origSize !== r.sizeKB) {
        r.optimized = true;
      }
    }
  }

  const metrics = deriveMetrics(resources, enabled, params);
  const timelineEndMs = Math.max(...resources.map((r) => r.endMs), 500);

  return { resources, metrics, timelineEndMs };
}

// ─── perf-js: flame chart + drag-zone engine ──────────────────────
// Pure data + pure derivations. No React, no DOM, no side effects.
// All durations simulate a mid-tier Android device on 4G (Web Almanac
// 2024 p75 baseline). Numbers are illustrative, not benchmarks.

export type ScriptId =
  | "vendor-react"
  | "route-home"
  | "route-dashboard"
  | "route-settings"
  | "charting-lib"
  | "data-processor"
  | "dom-renderer"
  | "app-shell";

export type Zone = "critical" | "deferred" | "worker";
export type Lane = "main" | "worker";

export interface ScriptMeta {
  id: ScriptId;
  label: string;
  sizeKB: number;
  parseMs: number;
  executeMs: number;
  color: string;
  isRouteCritical: boolean;
  canWorker: boolean;
  defaultZone: Zone;
}

export const scriptCost = (s: ScriptMeta) => s.parseMs + s.executeMs;

export const SCRIPTS: ScriptMeta[] = [
  {
    id: "vendor-react",
    label: "vendor-react.js",
    sizeKB: 140,
    parseMs: 200,
    executeMs: 100,
    color: "var(--diagram-layer-0)",
    isRouteCritical: true,
    canWorker: false,
    defaultZone: "critical",
  },
  {
    id: "route-home",
    label: "route-home.js",
    sizeKB: 90,
    parseMs: 150,
    executeMs: 60,
    color: "var(--diagram-layer-1)",
    isRouteCritical: true,
    canWorker: false,
    defaultZone: "critical",
  },
  {
    id: "route-dashboard",
    label: "route-dashboard.js",
    sizeKB: 320,
    parseMs: 280,
    executeMs: 150,
    color: "var(--diagram-layer-2)",
    isRouteCritical: false,
    canWorker: false,
    defaultZone: "critical",
  },
  {
    id: "route-settings",
    label: "route-settings.js",
    sizeKB: 180,
    parseMs: 200,
    executeMs: 100,
    color: "var(--diagram-layer-9)",
    isRouteCritical: false,
    canWorker: false,
    defaultZone: "critical",
  },
  {
    id: "charting-lib",
    label: "charting-lib.js",
    sizeKB: 340,
    parseMs: 220,
    executeMs: 110,
    color: "var(--diagram-layer-3)",
    isRouteCritical: false,
    canWorker: false,
    defaultZone: "critical",
  },
  {
    id: "data-processor",
    label: "data-processor.js",
    sizeKB: 180,
    parseMs: 180,
    executeMs: 280,
    color: "var(--diagram-layer-4)",
    isRouteCritical: true,
    canWorker: true,
    defaultZone: "critical",
  },
  {
    id: "dom-renderer",
    label: "dom-renderer.js",
    sizeKB: 60,
    parseMs: 80,
    executeMs: 60,
    color: "var(--diagram-layer-5)",
    isRouteCritical: true,
    canWorker: false,
    defaultZone: "critical",
  },
];

// app-shell represents the framework's runtime shell + hydration work
// that happens after the primary scripts execute. It is not a draggable
// script in step 6 — it is a synthesized timeline block used by steps
// 2–5 to make the end-of-chain timing match the lesson's claimed TTI
// without inventing duplicate identities on the chart.
const APP_SHELL_META: ScriptMeta = {
  id: "app-shell",
  label: "app-shell + hydration",
  sizeKB: 60,
  parseMs: 80,
  executeMs: 60,
  color: "var(--diagram-layer-6)",
  isRouteCritical: true,
  canWorker: false,
  defaultZone: "critical",
};

export const SCRIPT_BY_ID: Record<ScriptId, ScriptMeta> = SCRIPTS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  { "app-shell": APP_SHELL_META } as Record<ScriptId, ScriptMeta>,
);

export interface FlameBlock {
  scriptId: ScriptId;
  startMs: number;
  durationMs: number;
  lane: Lane;
  isLongTask: boolean;
}

// ─── Per-step flame layouts ──────────────────────────────────────
// Headline TTI numbers (align with MDX prose + predictions):
//   step 1 (single bundle)   ~ 2.1 s  (poor — one block, no yields)
//   step 2 (route split)     ~ 2.1 s  (still poor — bundle's just smaller; dashboard/settings now deferred)
//   step 3 (defer charting)  ~ 1.4 s  (needs-improvement)
//   step 4 (yielding)        ~ 1.4 s  (same TTI, but no long tasks)
//   step 5 (worker)          ~ 1.5 s  (good — main thread clears in ~0.7 s but TTI floors at firstPaint=1.5s)
//   step 6 (drag interactive — variable, seeded from post-step-5 state)

export function buildSingleBundle(): FlameBlock[] {
  return [
    {
      scriptId: "vendor-react",
      startMs: 0,
      durationMs: 2100,
      lane: "main",
      isLongTask: true,
    },
  ];
}

export function buildRouteSplit(): FlameBlock[] {
  // Step 2: framework + shell + route-home + data-processor ship sync on the
  // home route. charting-lib + dashboard + settings ship as separate chunks
  // past first paint (faded "deferred" blocks) — charting-lib is its own
  // chunk per the MDX prediction's bundle composition.
  const order: ScriptId[] = ["vendor-react", "route-home", "dom-renderer", "data-processor"];
  let cursor = 0;
  const blocks: FlameBlock[] = [];
  for (const id of order) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({ scriptId: id, startMs: cursor, durationMs: cost, lane: "main", isLongTask: cost > 50 });
    cursor += cost + 8;
  }
  // charting-lib + dashboard + settings shipped as separate chunks the home
  // route doesn't pull. Past first paint, faded, never long tasks.
  let deferredCursor = 1700;
  for (const id of ["charting-lib", "route-dashboard", "route-settings"] as ScriptId[]) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({
      scriptId: id,
      startMs: deferredCursor,
      durationMs: cost,
      lane: "main",
      isLongTask: false,
    });
    deferredCursor += cost + 12;
  }
  return blocks;
}

export function buildDeferred(): FlameBlock[] {
  const critical: ScriptId[] = ["vendor-react", "route-home", "dom-renderer", "data-processor"];
  let cursor = 0;
  const blocks: FlameBlock[] = [];
  for (const id of critical) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({ scriptId: id, startMs: cursor, durationMs: cost, lane: "main", isLongTask: cost > 50 });
    cursor += cost + 8;
  }
  // charting-lib + dashboard + settings deferred past first paint
  let deferredCursor = 1620;
  for (const id of ["charting-lib", "route-dashboard", "route-settings"] as ScriptId[]) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({
      scriptId: id,
      startMs: deferredCursor,
      durationMs: cost,
      lane: "main",
      isLongTask: false,
    });
    deferredCursor += cost + 12;
  }
  return blocks;
}

// Step 4: data-processor chunked into ~40 ms slices via scheduler.yield().
// No single block exceeds the 50 ms long-task threshold. A simulated user
// click lands at 100 ms — it waits ~50 ms until the next yield point.
export function buildYielded(): FlameBlock[] {
  const critical: ScriptId[] = ["vendor-react", "route-home", "dom-renderer"];
  let cursor = 0;
  const blocks: FlameBlock[] = [];
  for (const id of critical) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({ scriptId: id, startMs: cursor, durationMs: cost, lane: "main", isLongTask: cost > 50 });
    cursor += cost + 8;
  }
  // chunked data-processor: 11 chunks of ~40 ms each = ~460 ms total
  const dp = SCRIPT_BY_ID["data-processor"];
  const total = scriptCost(dp);
  const chunkMs = 40;
  const chunks = Math.ceil(total / chunkMs);
  for (let i = 0; i < chunks; i += 1) {
    blocks.push({
      scriptId: "data-processor",
      startMs: cursor,
      durationMs: chunkMs,
      lane: "main",
      isLongTask: false,
    });
    cursor += chunkMs + 4; // 4 ms yield gap
  }
  // deferred past first paint
  let deferredCursor = 1620;
  for (const id of ["charting-lib", "route-dashboard", "route-settings"] as ScriptId[]) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({
      scriptId: id,
      startMs: deferredCursor,
      durationMs: cost,
      lane: "main",
      isLongTask: false,
    });
    deferredCursor += cost + 12;
  }
  return blocks;
}

export function buildWorker(): FlameBlock[] {
  const critical: ScriptId[] = ["vendor-react", "route-home", "dom-renderer"];
  let cursor = 0;
  const blocks: FlameBlock[] = [];
  for (const id of critical) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({ scriptId: id, startMs: cursor, durationMs: cost, lane: "main", isLongTask: cost > 50 });
    cursor += cost + 8;
  }
  // data-processor runs on the worker lane, in parallel
  const dp = SCRIPT_BY_ID["data-processor"];
  blocks.push({
    scriptId: "data-processor",
    startMs: 80,
    durationMs: scriptCost(dp),
    lane: "worker",
    isLongTask: false,
  });
  // deferred past first paint on the main lane
  let deferredCursor = 1620;
  for (const id of ["charting-lib", "route-dashboard", "route-settings"] as ScriptId[]) {
    const s = SCRIPT_BY_ID[id];
    const cost = scriptCost(s);
    blocks.push({
      scriptId: id,
      startMs: deferredCursor,
      durationMs: cost,
      lane: "main",
      isLongTask: false,
    });
    deferredCursor += cost + 12;
  }
  return blocks;
}

// Step 6: derive the flame chart from zone assignments — what the user
// just configured. Workers run in parallel, deferred scripts are placed
// past first paint, critical scripts stack on the main lane.
export function buildFromZones(zones: Map<ScriptId, Zone>): FlameBlock[] {
  const blocks: FlameBlock[] = [];
  let mainCursor = 0;
  let workerCursor = 80;
  let deferredCursor = 1620;
  const sorted = [...SCRIPTS].sort((a, b) => {
    const za = zones.get(a.id) ?? a.defaultZone;
    const zb = zones.get(b.id) ?? b.defaultZone;
    // vendor first, then routes, then libs, then renderer
    const orderA = ["vendor-react", "route-home", "route-dashboard", "route-settings", "data-processor", "charting-lib", "dom-renderer"].indexOf(a.id);
    const orderB = ["vendor-react", "route-home", "route-dashboard", "route-settings", "data-processor", "charting-lib", "dom-renderer"].indexOf(b.id);
    if (za !== zb) return za === "critical" ? -1 : zb === "critical" ? 1 : 0;
    return orderA - orderB;
  });

  for (const s of sorted) {
    const zone = zones.get(s.id) ?? s.defaultZone;
    const cost = scriptCost(s);
    if (zone === "critical") {
      blocks.push({
        scriptId: s.id,
        startMs: mainCursor,
        durationMs: cost,
        lane: "main",
        isLongTask: cost > 50,
      });
      mainCursor += cost + 8;
    } else if (zone === "worker") {
      blocks.push({
        scriptId: s.id,
        startMs: workerCursor,
        durationMs: cost,
        lane: "worker",
        isLongTask: false,
      });
      workerCursor += cost + 8;
    } else {
      // deferred: stagger past first paint so blocks don't overlap, and
      // never mark them as long tasks — they're off the critical path.
      blocks.push({
        scriptId: s.id,
        startMs: deferredCursor,
        durationMs: cost,
        lane: "main",
        isLongTask: false,
      });
      deferredCursor += cost + 12;
    }
  }
  return blocks;
}

// ─── TTI helpers ─────────────────────────────────────────────────

export function computeTTI(blocks: FlameBlock[], firstPaintMs?: number): number {
  const main = blocks.filter((b) => b.lane === "main");
  if (main.length === 0) return 0;
  // TTI = end of last critical-path block before first paint.
  // Semantically TTI can never precede first paint, so clamp result.
  if (firstPaintMs !== undefined) {
    const beforePaint = main.filter((b) => b.startMs + b.durationMs <= firstPaintMs + 80);
    if (beforePaint.length > 0) {
      const rawTTI = Math.max(...beforePaint.map((b) => b.startMs + b.durationMs));
      return Math.max(rawTTI, firstPaintMs);
    }
  }
  return Math.max(...main.map((b) => b.startMs + b.durationMs));
}

export function countLongTasks(blocks: FlameBlock[]): number {
  return blocks.filter((b) => b.lane === "main" && b.isLongTask).length;
}

export type TTIRating = "good" | "needs-improvement" | "poor";

export function ttiRating(ms: number): TTIRating {
  if (ms < 2000) return "good";
  if (ms <= 3000) return "needs-improvement";
  return "poor";
}

// ─── Drag-zone derivation ─────────────────────────────────────────

export function ttiFromZones(zones: Map<ScriptId, Zone>): number {
  let sum = 0;
  for (const s of SCRIPTS) {
    if (zones.get(s.id) === "critical") sum += scriptCost(s);
  }
  return sum;
}

export function defaultZoneMap(): Map<ScriptId, Zone> {
  const m = new Map<ScriptId, Zone>();
  for (const s of SCRIPTS) m.set(s.id, s.defaultZone);
  return m;
}

// Seeds step 6 with the state taught across steps 2–5 so the user
// continues their narrative instead of regressing to "everything critical".
// Steps 2–3 deferred route-dashboard, route-settings, and charting-lib.
// data-processor stays on critical so the step-6 prediction has a real puzzle
// (the MDX gate asks the reader where to put it — Worker is the right answer,
// but only if the lab doesn't pre-answer it).
export function postLessonZoneMap(): Map<ScriptId, Zone> {
  const m = new Map<ScriptId, Zone>();
  m.set("vendor-react", "critical");
  m.set("route-home", "critical");
  m.set("dom-renderer", "critical");
  m.set("data-processor", "critical");
  m.set("route-dashboard", "deferred");
  m.set("route-settings", "deferred");
  m.set("charting-lib", "deferred");
  return m;
}

// ─── Worker drop validation ────────────────────────────────────────

export interface WorkerDropResult {
  accepted: boolean;
  message: string;
  shake: boolean;
}

export function dropOnWorker(scriptId: ScriptId): WorkerDropResult {
  const s = SCRIPT_BY_ID[scriptId];
  if (!s) return { accepted: false, message: "Unknown script.", shake: true };
  if (s.canWorker) {
    return {
      accepted: true,
      message: `${s.label} moved to worker — main thread frees up ${scriptCost(s)} ms.`,
      shake: false,
    };
  }
  if (scriptId === "dom-renderer") {
    return {
      accepted: false,
      message: "Workers can't access the DOM — they have no `document`. Anything that touches `appendChild`, `querySelector`, or `innerHTML` must stay on the main thread.",
      shake: true,
    };
  }
  return {
    accepted: false,
    message: `${s.label} needs DOM or window access. Workers run pure computation only — no DOM, no window, no localStorage.`,
    shake: true,
  };
}

// ─── Chart sizing ──────────────────────────────────────────────────

export function chartSpanMs(blocks: FlameBlock[]): number {
  if (blocks.length === 0) return 1000;
  const end = Math.max(...blocks.map((b) => b.startMs + b.durationMs));
  return Math.ceil(end / 500) * 500;
}

// ─── Step 4: simulated click & wait band ────────────────────────────
// Step 4 visualises an input event landing during a yielded long task.
// The click arrives at clickMs, waits until the next yield gap, then
// the handler runs. With scheduler.yield() chunks of ~40 ms, worst-case
// delay is ~one chunk (~50 ms).

export interface InputEvent {
  clickMs: number;
  handledMs: number;
  delayMs: number;
}

export function buildClickEvent(): InputEvent {
  const clickMs = 100;
  const handledMs = 150;
  return { clickMs, handledMs, delayMs: handledMs - clickMs };
}

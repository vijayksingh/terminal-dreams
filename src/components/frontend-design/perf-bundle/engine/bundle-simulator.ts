/**
 * Bundle optimization simulator.
 *
 * Pure functions that derive a bundle's module graph, chunk assignments, and
 * treemap layout from a `stage`. The lab is a sequential narrative: each stage
 * applies one more optimization on top of the previous, so the treemap visibly
 * fractures and shrinks as the reader scrolls.
 *
 * No React, no DOM, no animation — those live in `bundle-context.tsx` and the
 * UI primitives. Everything here is deterministic and easy to test.
 */

// ── Types ───────────────────────────────────────────────────────────

export type ChunkId =
  | "monolith"
  | "initial"
  | "route-home"
  | "route-dashboard"
  | "route-settings"
  | "route-admin"
  | "on-demand-chart"
  | "vendor";

export type ChunkRole = "monolith" | "initial" | "route" | "on-demand" | "vendor";

export type ModuleCategory =
  | "framework"
  | "library"
  | "library-dead"
  | "app-route"
  | "app-shared"
  | "feature-heavy";

export interface BundleModule {
  id: string;
  label: string;
  /** Size in KB after gzip — what actually crosses the wire. */
  sizeKB: number;
  category: ModuleCategory;
  /** Used in 2+ routes — extracts to vendor in step 4. */
  shared: boolean;
  /** Has unused exports — tree-shakes away in step 2. */
  hasDeadCode: boolean;
  /** Size in KB after tree shaking (if hasDeadCode). */
  shakenSizeKB: number;
  /** Heavy route-specific feature — pulls out on demand in step 3. */
  dynamicImportCandidate: boolean;
  /** Which route owns this module pre-split (route key from ROUTES). */
  ownerRoute: "home" | "dashboard" | "settings" | "admin" | "shared";
}

export interface BundleChunk {
  id: ChunkId;
  label: string;
  role: ChunkRole;
  /** Loaded on first paint. */
  isInitial: boolean;
  /** Cached independently with content-hash + immutable header. */
  isCached: boolean;
  /** Maps to a diagram-layer-N color via the UI. */
  colorKey: string;
}

export interface ModuleSlice {
  module: BundleModule;
  /** Live size after any optimizations applied at this stage. */
  liveSizeKB: number;
  /** Has this module been shaken away (size === 0) at this stage? */
  shaken: boolean;
}

export interface ChunkSlice {
  chunk: BundleChunk;
  modules: ModuleSlice[];
  /** Sum of live module sizes in this chunk. */
  sizeKB: number;
}

export interface BundleState {
  stage: number;
  chunks: ChunkSlice[];
  /** Cold first-paint cost: sum of every initial chunk. */
  initialLoadKB: number;
  /**
   * Warm first-paint cost: cached chunks (vendor) are skipped. Only meaningful
   * for stages with `isCached` chunks — otherwise equal to `initialLoadKB`.
   */
  warmLoadKB: number;
  /** Total of every chunk — what the user eventually downloads (incl. lazy). */
  totalKB: number;
  /** Number of files served by the build (excludes css). */
  requestCount: number;
}

// ── Master module list ──────────────────────────────────────────────

/**
 * A realistic dashboard bundle. Sizes are gzipped KB and chosen to make the
 * scrollytelling numbers honest: 1200 KB monolith → 165 KB initial load by the
 * end. Every step removes exactly the bytes the MDX claims.
 */
export const MODULES: readonly BundleModule[] = [
  // ── Framework (shared, never dead, never lazy) ────────────────────
  { id: "react", label: "react", sizeKB: 12, shakenSizeKB: 12, category: "framework", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },
  { id: "react-dom", label: "react-dom", sizeKB: 44, shakenSizeKB: 44, category: "framework", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },
  { id: "router", label: "react-router", sizeKB: 18, shakenSizeKB: 18, category: "framework", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },

  // ── App shell, used on every route ─────────────────────────────────
  { id: "shell", label: "app-shell", sizeKB: 22, shakenSizeKB: 22, category: "app-shared", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },
  { id: "ui-kit", label: "ui-kit", sizeKB: 38, shakenSizeKB: 38, category: "app-shared", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },
  { id: "utils", label: "utils", sizeKB: 18, shakenSizeKB: 18, category: "app-shared", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },

  // ── Library code with HEAVY dead weight ──────────────────────────
  // lodash full IIFE is ~72 KB gzipped; we use 4 functions, so tree-shake to ~4 KB.
  { id: "lodash", label: "lodash", sizeKB: 72, shakenSizeKB: 4, category: "library-dead", shared: false, hasDeadCode: true, dynamicImportCandidate: false, ownerRoute: "home" },
  // moment + every locale on the dashboard route; only English date formatting actually used.
  { id: "moment", label: "moment + locales", sizeKB: 232, shakenSizeKB: 16, category: "library-dead", shared: false, hasDeadCode: true, dynamicImportCandidate: false, ownerRoute: "dashboard" },
  // core-js polyfilling every feature, ignored once browserslist is set up.
  { id: "polyfill", label: "core-js polyfills", sizeKB: 45, shakenSizeKB: 6, category: "library-dead", shared: true, hasDeadCode: true, dynamicImportCandidate: false, ownerRoute: "shared" },
  // barrel re-export icon library; 4 icons actually rendered.
  { id: "icons", label: "icon-library", sizeKB: 30, shakenSizeKB: 4, category: "library-dead", shared: true, hasDeadCode: true, dynamicImportCandidate: false, ownerRoute: "shared" },
  // Apollo client used only by dashboard, full barrel imported with 30+ exports.
  { id: "apollo", label: "apollo-client", sizeKB: 60, shakenSizeKB: 18, category: "library-dead", shared: false, hasDeadCode: true, dynamicImportCandidate: false, ownerRoute: "dashboard" },

  // ── Library code that's "fine as is" ─────────────────────────────
  { id: "date-fns", label: "date-fns/format", sizeKB: 6, shakenSizeKB: 6, category: "library", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },
  { id: "zod", label: "zod", sizeKB: 14, shakenSizeKB: 14, category: "library", shared: true, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "shared" },

  // ── Heavy feature libraries — dynamic-import candidates ──────────
  // chart-lib is currently in the shared chunk because the original `import`
  // sat at the top of the route map, dragging it into every page's graph. The
  // dynamic-import stage will lift it into its own on-demand chunk.
  { id: "chart", label: "chart-lib", sizeKB: 90, shakenSizeKB: 90, category: "feature-heavy", shared: true, hasDeadCode: false, dynamicImportCandidate: true, ownerRoute: "shared" },
  { id: "editor", label: "rich-editor", sizeKB: 145, shakenSizeKB: 145, category: "feature-heavy", shared: false, hasDeadCode: false, dynamicImportCandidate: true, ownerRoute: "admin" },
  { id: "pdf", label: "pdf-renderer", sizeKB: 130, shakenSizeKB: 130, category: "feature-heavy", shared: false, hasDeadCode: false, dynamicImportCandidate: true, ownerRoute: "admin" },

  // ── Route-specific app code ──────────────────────────────────────
  { id: "home-route", label: "/home", sizeKB: 38, shakenSizeKB: 38, category: "app-route", shared: false, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "home" },
  { id: "dashboard-route", label: "/dashboard", sizeKB: 65, shakenSizeKB: 65, category: "app-route", shared: false, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "dashboard" },
  { id: "settings-route", label: "/settings", sizeKB: 22, shakenSizeKB: 22, category: "app-route", shared: false, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "settings" },
  { id: "admin-route", label: "/admin", sizeKB: 30, shakenSizeKB: 30, category: "app-route", shared: false, hasDeadCode: false, dynamicImportCandidate: false, ownerRoute: "admin" },
] as const;

// ── Chunk catalog ───────────────────────────────────────────────────

const CHUNKS: Record<ChunkId, BundleChunk> = {
  monolith: { id: "monolith", label: "main.js", role: "monolith", isInitial: true, isCached: false, colorKey: "muted" },
  initial: { id: "initial", label: "initial.js", role: "initial", isInitial: true, isCached: false, colorKey: "layer-1" },
  "route-home": { id: "route-home", label: "/home", role: "route", isInitial: true, isCached: false, colorKey: "layer-1" },
  "route-dashboard": { id: "route-dashboard", label: "/dashboard", role: "route", isInitial: false, isCached: false, colorKey: "layer-2" },
  "route-settings": { id: "route-settings", label: "/settings", role: "route", isInitial: false, isCached: false, colorKey: "layer-7" },
  "route-admin": { id: "route-admin", label: "/admin", role: "route", isInitial: false, isCached: false, colorKey: "layer-6" },
  "on-demand-chart": { id: "on-demand-chart", label: "on-demand", role: "on-demand", isInitial: false, isCached: false, colorKey: "layer-3" },
  vendor: { id: "vendor", label: "vendor.js", role: "vendor", isInitial: true, isCached: true, colorKey: "layer-5" },
};

// ── Stage → state ───────────────────────────────────────────────────

export const TOTAL_STAGES = 6;

/**
 * Each stage compounds onto the last. Stage 1 is the worst case; stage 5 is
 * production-grade. Stage 6 is the analyzer/sequencing capstone — same layout
 * as stage 5 but with the offender breakdown surfaced.
 *
 * Stage progression follows the scrollytelling brief:
 *   1. Monolith (every byte in main.js)
 *   2. Route split (per-route chunks; only home + shared loads upfront)
 *   3. Tree shake (lodash/moment/icons/polyfill barrels shed dead exports)
 *   4. Dynamic import (chart, editor, pdf lift out to on-demand chunks)
 *   5. Vendor chunk (framework + utils extract for cache stability)
 *   6. Analyzer + sequencing capstone (visualizes offenders, reorderable)
 */
export function bundleAtStage(stage: number): BundleState {
  const s = Math.max(1, Math.min(TOTAL_STAGES, Math.round(stage)));

  if (s === 1) return buildStage1Monolith();
  if (s === 2) return buildStage2RouteSplit();
  if (s === 3) return buildStage3TreeShake();
  if (s === 4) return buildStage4DynamicImport();
  if (s === 5) return buildStage5VendorChunk();
  return buildStage6Capstone();
}

// ── Helpers ─────────────────────────────────────────────────────────

function liveSize(mod: BundleModule, treeShake: boolean): number {
  if (treeShake && mod.hasDeadCode) return mod.shakenSizeKB;
  return mod.sizeKB;
}

function packChunk(chunkId: ChunkId, modules: BundleModule[], treeShake: boolean): ChunkSlice {
  const slices = modules.map<ModuleSlice>((module) => ({
    module,
    liveSizeKB: liveSize(module, treeShake),
    shaken: treeShake && module.hasDeadCode && module.shakenSizeKB < module.sizeKB,
  }));
  return {
    chunk: CHUNKS[chunkId],
    modules: slices,
    sizeKB: round(slices.reduce((s, m) => s + m.liveSizeKB, 0)),
  };
}

function rollup(chunks: ChunkSlice[]): Pick<BundleState, "initialLoadKB" | "warmLoadKB" | "totalKB" | "requestCount"> {
  const initialChunks = chunks.filter((c) => c.chunk.isInitial);
  const initialLoadKB = round(initialChunks.reduce((s, c) => s + c.sizeKB, 0));
  const warmLoadKB = round(initialChunks.filter((c) => !c.chunk.isCached).reduce((s, c) => s + c.sizeKB, 0));
  const totalKB = round(chunks.reduce((s, c) => s + c.sizeKB, 0));
  return { initialLoadKB, warmLoadKB, totalKB, requestCount: chunks.length };
}

function round(n: number): number {
  return Math.round(n);
}

// ── Stage builders ──────────────────────────────────────────────────

function buildStage1Monolith(): BundleState {
  // Every module in one chunk, no tree shaking. This is the worst case the
  // lesson opens with: every dependency every route might want, eagerly loaded.
  const monolith = packChunk("monolith", [...MODULES], false);
  return { stage: 1, chunks: [monolith], ...rollup([monolith]) };
}

function buildStage2RouteSplit(): BundleState {
  // Route-based code splitting: every page gets its own chunk. The shared
  // chunk (framework + app-shell + libs used everywhere) is still load-blocking
  // on the home route, but admin/settings code stays out of the initial payload.
  // No tree-shaking yet — barrels still ship every export.
  const initialMods = MODULES.filter((m) => m.shared);
  const homeMods = MODULES.filter((m) => m.ownerRoute === "home" && !m.shared);
  const dashMods = MODULES.filter((m) => m.ownerRoute === "dashboard" && !m.shared);
  const setMods = MODULES.filter((m) => m.ownerRoute === "settings" && !m.shared);
  const adminMods = MODULES.filter((m) => m.ownerRoute === "admin" && !m.shared);

  const chunks: ChunkSlice[] = [
    packChunk("initial", initialMods, false),
    packChunk("route-home", homeMods, false),
    packChunk("route-dashboard", dashMods, false),
    packChunk("route-settings", setMods, false),
    packChunk("route-admin", adminMods, false),
  ];
  return { stage: 2, chunks, ...rollup(chunks) };
}

function buildStage3TreeShake(): BundleState {
  // Same route boundaries as stage 2, but now with tree-shaking: lodash full
  // shrinks to its 4 used methods, moment locales disappear, icon barrel
  // becomes per-icon imports, polyfills targeted to browserslist.
  const initialMods = MODULES.filter((m) => m.shared);
  const homeMods = MODULES.filter((m) => m.ownerRoute === "home" && !m.shared);
  const dashMods = MODULES.filter((m) => m.ownerRoute === "dashboard" && !m.shared);
  const setMods = MODULES.filter((m) => m.ownerRoute === "settings" && !m.shared);
  const adminMods = MODULES.filter((m) => m.ownerRoute === "admin" && !m.shared);

  const chunks: ChunkSlice[] = [
    packChunk("initial", initialMods, true),
    packChunk("route-home", homeMods, true),
    packChunk("route-dashboard", dashMods, true),
    packChunk("route-settings", setMods, true),
    packChunk("route-admin", adminMods, true),
  ];
  return { stage: 3, chunks, ...rollup(chunks) };
}

function buildStage4DynamicImport(): BundleState {
  // Lift feature-heavy modules (chart, editor, pdf) out of every chunk into a
  // dedicated on-demand chunk that loads only when the user opens that view.
  // The chart was sitting in the shared/initial chunk before; it now leaves.
  const initialMods = MODULES.filter((m) => m.shared && !m.dynamicImportCandidate);
  const homeMods = MODULES.filter((m) => m.ownerRoute === "home" && !m.shared && !m.dynamicImportCandidate);
  const dashMods = MODULES.filter((m) => m.ownerRoute === "dashboard" && !m.shared && !m.dynamicImportCandidate);
  const setMods = MODULES.filter((m) => m.ownerRoute === "settings" && !m.shared && !m.dynamicImportCandidate);
  const adminMods = MODULES.filter((m) => m.ownerRoute === "admin" && !m.shared && !m.dynamicImportCandidate);
  const onDemandMods = MODULES.filter((m) => m.dynamicImportCandidate);

  const chunks: ChunkSlice[] = [
    packChunk("initial", initialMods, true),
    packChunk("route-home", homeMods, true),
    packChunk("route-dashboard", dashMods, true),
    packChunk("route-settings", setMods, true),
    packChunk("route-admin", adminMods, true),
    packChunk("on-demand-chart", onDemandMods, true),
  ];
  return { stage: 4, chunks, ...rollup(chunks) };
}

function buildStage5VendorChunk(): BundleState {
  // Framework + shared utilities migrate into a separately-cached vendor chunk.
  // Initial chunk holds the app-shell + ui-kit + zod (rebuild-on-deploy code).
  const vendorMods = MODULES.filter(
    (m) => m.category === "framework" || m.id === "utils" || m.id === "icons" || m.id === "polyfill" || m.id === "date-fns",
  );
  const vendorIds = new Set(vendorMods.map((m) => m.id));
  const initialMods = MODULES.filter((m) => m.shared && !vendorIds.has(m.id) && !m.dynamicImportCandidate);
  const homeMods = MODULES.filter((m) => m.ownerRoute === "home" && !m.shared && !m.dynamicImportCandidate);
  const dashMods = MODULES.filter((m) => m.ownerRoute === "dashboard" && !m.shared && !m.dynamicImportCandidate);
  const setMods = MODULES.filter((m) => m.ownerRoute === "settings" && !m.shared && !m.dynamicImportCandidate);
  const adminMods = MODULES.filter((m) => m.ownerRoute === "admin" && !m.shared && !m.dynamicImportCandidate);
  const onDemandMods = MODULES.filter((m) => m.dynamicImportCandidate);

  const chunks: ChunkSlice[] = [
    packChunk("vendor", vendorMods, true),
    packChunk("initial", initialMods, true),
    packChunk("route-home", homeMods, true),
    packChunk("route-dashboard", dashMods, true),
    packChunk("route-settings", setMods, true),
    packChunk("route-admin", adminMods, true),
    packChunk("on-demand-chart", onDemandMods, true),
  ];
  return { stage: 5, chunks, ...rollup(chunks) };
}

function buildStage6Capstone(): BundleState {
  // Same shape as stage 5; the lab augments with an analyzer view and
  // sequencing reorder. Marking stage explicitly aids the UI's switch.
  const base = buildStage5VendorChunk();
  return { ...base, stage: 6 };
}

// ── Stage label / accent metadata ────────────────────────────────────

export const STAGE_LABELS = ["BA", "CS", "TS", "DI", "VC", "AN"] as const;

export const STAGE_TITLES: Record<number, string> = {
  1: "Bundle Anatomy",
  2: "Code Splitting",
  3: "Tree Shaking",
  4: "Dynamic Imports",
  5: "Vendor Chunk",
  6: "Bundle Analysis",
};

// ── Treemap layout (squarified) ─────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreemapNode {
  id: string;
  parentChunkId: ChunkId;
  label: string;
  sizeKB: number;
  rect: Rect;
  category: ModuleCategory;
  /** True when this module is part of an initial-load chunk. */
  isInitial: boolean;
  /** True when this module sits in the immutable vendor chunk. */
  isCached: boolean;
  /** True after tree-shaking removed its dead weight. */
  shaken: boolean;
}

export interface ChunkBox {
  chunkId: ChunkId;
  label: string;
  role: ChunkRole;
  rect: Rect;
  isInitial: boolean;
  isCached: boolean;
  colorKey: string;
  sizeKB: number;
}

export interface TreemapLayout {
  width: number;
  height: number;
  chunks: ChunkBox[];
  modules: TreemapNode[];
}

interface Padding {
  /** Inner padding between chunk border and its children. */
  inner: number;
  /** Vertical space reserved for the chunk label. */
  header: number;
  /** Outer gap between sibling chunks. */
  gap: number;
}

const DEFAULT_PADDING: Padding = { inner: 6, header: 16, gap: 4 };

/**
 * Lays a `BundleState` onto a `width × height` canvas. Chunks pack first using
 * the squarified algorithm, then each chunk's modules pack inside their parent
 * rect with the same algorithm. The result is stable enough for framer-motion
 * to interpolate between stages: keys are module ids, so React keeps DOM
 * elements alive and animates rects.
 */
export function layoutTreemap(
  state: BundleState,
  width: number,
  height: number,
  padding: Padding = DEFAULT_PADDING,
): TreemapLayout {
  const totalSize = state.chunks.reduce((s, c) => s + Math.max(c.sizeKB, 1), 0);
  const containerRect: Rect = { x: 0, y: 0, width, height };
  const chunkOrder = [...state.chunks].sort((a, b) => b.sizeKB - a.sizeKB);

  const chunkRects = squarify(
    chunkOrder.map((c) => ({ id: c.chunk.id, value: Math.max(c.sizeKB, 1) })),
    containerRect,
    totalSize,
    padding.gap,
  );

  const chunkBoxes: ChunkBox[] = [];
  const moduleNodes: TreemapNode[] = [];

  for (const c of chunkOrder) {
    const rect = chunkRects.get(c.chunk.id) ?? containerRect;
    chunkBoxes.push({
      chunkId: c.chunk.id,
      label: c.chunk.label,
      role: c.chunk.role,
      rect,
      isInitial: c.chunk.isInitial,
      isCached: c.chunk.isCached,
      colorKey: c.chunk.colorKey,
      sizeKB: c.sizeKB,
    });

    // Inner rect minus header + padding.
    const inner: Rect = {
      x: rect.x + padding.inner,
      y: rect.y + padding.header,
      width: Math.max(0, rect.width - padding.inner * 2),
      height: Math.max(0, rect.height - padding.header - padding.inner),
    };

    if (inner.width <= 0 || inner.height <= 0) continue;

    const modulesSorted = [...c.modules].sort((a, b) => b.liveSizeKB - a.liveSizeKB);
    const visibleMods = modulesSorted.filter((m) => m.liveSizeKB > 0);
    const innerTotal = visibleMods.reduce((s, m) => s + Math.max(m.liveSizeKB, 0.5), 0);
    if (innerTotal <= 0) continue;

    const moduleRects = squarify(
      visibleMods.map((m) => ({ id: m.module.id, value: Math.max(m.liveSizeKB, 0.5) })),
      inner,
      innerTotal,
      1,
    );

    for (const slice of visibleMods) {
      const r = moduleRects.get(slice.module.id);
      if (!r) continue;
      moduleNodes.push({
        id: slice.module.id,
        parentChunkId: c.chunk.id,
        label: slice.module.label,
        sizeKB: slice.liveSizeKB,
        rect: r,
        category: slice.module.category,
        isInitial: c.chunk.isInitial,
        isCached: c.chunk.isCached,
        shaken: slice.shaken,
      });
    }
  }

  return { width, height, chunks: chunkBoxes, modules: moduleNodes };
}

// ── Squarified treemap (Bruls, Huizing, van Wijk 2000) ──────────────

interface Cell {
  id: string;
  value: number;
}

function squarify(cells: Cell[], rect: Rect, totalValue: number, gap: number): Map<string, Rect> {
  const result = new Map<string, Rect>();
  if (cells.length === 0 || totalValue <= 0 || rect.width <= 0 || rect.height <= 0) return result;

  // Scale values so the sum equals the rect area.
  const area = rect.width * rect.height;
  const scale = area / totalValue;

  const scaled = cells.map((c) => ({ id: c.id, value: c.value * scale }));
  scaled.sort((a, b) => b.value - a.value);

  let remaining: Rect = { ...rect };
  let row: Cell[] = [];
  const tail = scaled.slice();

  while (tail.length > 0) {
    const next = tail[0];
    const rowWithNext = [...row, next];
    const w = Math.min(remaining.width, remaining.height);
    if (row.length === 0 || worst(rowWithNext, w) <= worst(row, w)) {
      row = rowWithNext;
      tail.shift();
    } else {
      placeRow(row, remaining, gap, result);
      remaining = consumeRect(remaining, row);
      row = [];
    }
  }
  if (row.length > 0) {
    placeRow(row, remaining, gap, result);
  }

  return result;
}

function worst(row: Cell[], w: number): number {
  if (row.length === 0) return Infinity;
  const s = row.reduce((sum, c) => sum + c.value, 0);
  const max = row.reduce((m, c) => Math.max(m, c.value), 0);
  const min = row.reduce((m, c) => Math.min(m, c.value), Infinity);
  const w2 = w * w;
  const s2 = s * s;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

function placeRow(row: Cell[], rect: Rect, gap: number, out: Map<string, Rect>): void {
  const total = row.reduce((s, c) => s + c.value, 0);
  if (total <= 0) return;
  const horizontal = rect.width >= rect.height;
  if (horizontal) {
    const rowWidth = total / rect.height;
    let y = rect.y;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      const cellHeight = cell.value / rowWidth;
      const gapTop = i === 0 ? 0 : gap / 2;
      const gapBottom = i === row.length - 1 ? 0 : gap / 2;
      out.set(cell.id, {
        x: rect.x,
        y: y + gapTop,
        width: Math.max(0, rowWidth - gap / 2),
        height: Math.max(0, cellHeight - gapTop - gapBottom),
      });
      y += cellHeight;
    }
  } else {
    const rowHeight = total / rect.width;
    let x = rect.x;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      const cellWidth = cell.value / rowHeight;
      const gapLeft = i === 0 ? 0 : gap / 2;
      const gapRight = i === row.length - 1 ? 0 : gap / 2;
      out.set(cell.id, {
        x: x + gapLeft,
        y: rect.y,
        width: Math.max(0, cellWidth - gapLeft - gapRight),
        height: Math.max(0, rowHeight - gap / 2),
      });
      x += cellWidth;
    }
  }
}

function consumeRect(rect: Rect, row: Cell[]): Rect {
  const total = row.reduce((s, c) => s + c.value, 0);
  if (total <= 0) return rect;
  const horizontal = rect.width >= rect.height;
  if (horizontal) {
    const rowWidth = total / rect.height;
    return {
      x: rect.x + rowWidth,
      y: rect.y,
      width: Math.max(0, rect.width - rowWidth),
      height: rect.height,
    };
  }
  const rowHeight = total / rect.width;
  return {
    x: rect.x,
    y: rect.y + rowHeight,
    width: rect.width,
    height: Math.max(0, rect.height - rowHeight),
  };
}

// ── Optimization order matrix (capstone) ─────────────────────────────

export type OptimizationKey = "treeShake" | "routeSplit" | "dynamicImport" | "vendorChunk";

export interface OptStep {
  key: OptimizationKey;
  title: string;
  blurb: string;
}

export const OPT_STEPS: readonly OptStep[] = [
  { key: "routeSplit", title: "Route split", blurb: "Each page gets its own chunk; the bundler can now reason per-route." },
  { key: "treeShake", title: "Tree shake", blurb: "Dead exports + barrel imports drop. lodash falls from 72 KB to 4 KB." },
  { key: "dynamicImport", title: "Dynamic import", blurb: "Heavy features (chart, editor, PDF) load only when their route renders." },
  { key: "vendorChunk", title: "Vendor chunk", blurb: "Framework + utils extracted; deploys leave the cache hot." },
] as const;

/**
 * Per-module residual that survives monolith-wide tree-shaking when route
 * splitting has not yet happened. Models the real-world claim in the MDX:
 * "tree-shake before route-split and the shared chunk hides waste that
 * per-route shaking would have caught". When the entire app's dependency
 * graph is reachable in a single chunk, the bundler must keep exports any
 * route could touch — so a few KB per offender library survive that
 * per-route shaking would have eliminated.
 *
 * Tuned so the canonical order (routeSplit → treeShake → dynamicImport →
 * vendorChunk) lands warm ≤ 130 KB and ALL six other 4-step permutations
 * miss that gate, while still clearing the 250 KB initial budget. The
 * difference between optimal and suboptimal is the residual lump.
 */
const PRE_SPLIT_TREE_SHAKE_RESIDUAL_KB: Readonly<Record<string, number>> = {
  // polyfill leaves the largest residual: monolith-wide shaking can't tell
  // which routes need which polyfills, so it keeps the union of every route's
  // browserslist target rather than each route's tighter floor.
  polyfill: 12,
  // icon barrel keeps every icon any route might render. Per-route shaking
  // would drop the 2/3 of glyphs only used by /admin from the home chunk.
  icons: 4,
  // route-owned dead-weight libraries (lodash, moment, apollo) still shake
  // imperfectly when their owner is mixed with siblings in the monolith.
  lodash: 2,
  moment: 4,
  apollo: 2,
};

/**
 * Apply an arbitrary ordered sequence of optimizations to the monolith and
 * return the final state. Used by the capstone to show that order matters:
 * tree-shake first then route-split misses per-route dead-code paths, while
 * route-split first lets each chunk shed its own offenders independently.
 */
export function applyOptimizations(seq: OptimizationKey[]): BundleState {
  // Build module/chunk state imperatively. Each transform mutates a single
  // mutable Map<ChunkId, BundleModule[]> so the order of `seq` matters: tree
  // shaking a chunk pre-split sees ALL modules at once and may catch dead code
  // that per-chunk shaking would have missed.
  let chunksMap = new Map<ChunkId, BundleModule[]>([
    ["monolith", MODULES.map((m) => ({ ...m }))],
  ]);

  // Whether the bundler-residual penalty applies to a given module. Set when
  // treeShake fires before routeSplit; never cleared (the bytes are already
  // baked into the chunk by the time route-split runs).
  const residualBytes = new Map<string, number>();

  const treeShakeChunk = (mods: BundleModule[], preSplit: boolean): BundleModule[] =>
    mods.map((m) => {
      if (!m.hasDeadCode) return m;
      const residual = preSplit ? (PRE_SPLIT_TREE_SHAKE_RESIDUAL_KB[m.id] ?? 0) : 0;
      if (residual > 0) residualBytes.set(m.id, residual);
      const shaken = Math.min(m.sizeKB, m.shakenSizeKB + residual);
      return { ...m, sizeKB: shaken, hasDeadCode: false };
    });

  let treeShookGlobally = false;
  let routeSplit = false;
  let dynamicSplit = false;
  let vendorSplit = false;

  for (const step of seq) {
    if (step === "treeShake") {
      const next = new Map<ChunkId, BundleModule[]>();
      for (const [id, mods] of chunksMap) next.set(id, treeShakeChunk(mods, !routeSplit));
      chunksMap = next;
      treeShookGlobally = true;
    } else if (step === "routeSplit" && !routeSplit) {
      // Re-bucket every module from monolith / initial into route chunks.
      const all = Array.from(chunksMap.values()).flat();
      const sharedMods = all.filter((m) => m.shared);
      const homeMods = all.filter((m) => m.ownerRoute === "home" && !m.shared);
      const dashMods = all.filter((m) => m.ownerRoute === "dashboard" && !m.shared);
      const setMods = all.filter((m) => m.ownerRoute === "settings" && !m.shared);
      const adminMods = all.filter((m) => m.ownerRoute === "admin" && !m.shared);

      chunksMap = new Map<ChunkId, BundleModule[]>([
        ["initial", sharedMods],
        ["route-home", homeMods],
        ["route-dashboard", dashMods],
        ["route-settings", setMods],
        ["route-admin", adminMods],
      ]);
      routeSplit = true;
    } else if (step === "dynamicImport" && !dynamicSplit) {
      const onDemand: BundleModule[] = [];
      const entries = Array.from(chunksMap.entries());
      for (const [chunkId, mods] of entries) {
        const remaining: BundleModule[] = [];
        for (const m of mods) {
          if (m.dynamicImportCandidate) onDemand.push(m);
          else remaining.push(m);
        }
        chunksMap.set(chunkId, remaining);
      }
      chunksMap.set("on-demand-chart", onDemand);
      dynamicSplit = true;
    } else if (step === "vendorChunk" && !vendorSplit) {
      const vendorIds = new Set(["react", "react-dom", "router", "utils", "icons", "polyfill", "date-fns"]);
      const vendor: BundleModule[] = [];
      const entries = Array.from(chunksMap.entries());
      for (const [chunkId, mods] of entries) {
        const remaining: BundleModule[] = [];
        for (const m of mods) {
          // Modules tainted by monolith-wide tree-shaking residual stay out of
          // the immutable vendor chunk: the bundler treats them as app-touched
          // code, since their resolved module identity changed from the clean
          // node_modules export. They get re-downloaded on every deploy and
          // count toward warm-cache load.
          const tainted = residualBytes.has(m.id);
          if (vendorIds.has(m.id) && !tainted) vendor.push(m);
          else remaining.push(m);
        }
        chunksMap.set(chunkId, remaining);
      }
      chunksMap.set("vendor", vendor);
      vendorSplit = true;
    }
  }

  // Realize chunks → slices.
  const chunks: ChunkSlice[] = [];
  for (const [id, mods] of chunksMap) {
    if (mods.length === 0) continue;
    const slices: ModuleSlice[] = mods.map((m) => ({
      module: m,
      liveSizeKB: m.sizeKB,
      shaken: treeShookGlobally && MODULES.find((x) => x.id === m.id)?.hasDeadCode === true,
    }));
    chunks.push({
      chunk: CHUNKS[id],
      modules: slices,
      sizeKB: round(slices.reduce((s, m) => s + m.liveSizeKB, 0)),
    });
  }

  return { stage: 6, chunks, ...rollup(chunks) };
}

/** Reduces well-typed sequence into displayable optimization labels. */
export function describeSequence(seq: OptimizationKey[]): string {
  if (seq.length === 0) return "No optimization yet";
  return seq.map((k) => OPT_STEPS.find((s) => s.key === k)?.title ?? k).join(" → ");
}

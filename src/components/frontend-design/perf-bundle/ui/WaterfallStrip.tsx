"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { BundleState, ChunkSlice } from "../engine/bundle-simulator";
import styles from "./WaterfallStrip.module.css";

interface WaterfallStripProps {
  state: BundleState;
  /** Stage 1-6; stage ≥ 5 means the second visit shows a cache hit on vendor. */
  stage: number;
}

const COLOR_KEY_VAR: Record<string, string> = {
  muted: "var(--color-muted)",
  "layer-0": "var(--diagram-layer-0)",
  "layer-1": "var(--diagram-layer-1)",
  "layer-2": "var(--diagram-layer-2)",
  "layer-3": "var(--diagram-layer-3)",
  "layer-4": "var(--diagram-layer-4)",
  "layer-5": "var(--diagram-layer-5)",
  "layer-6": "var(--diagram-layer-6)",
  "layer-7": "var(--diagram-layer-7)",
};

/**
 * Network waterfall over time — the cost the treemap hides. Initial chunks
 * appear as parallel bars; on-demand chunks render as a separate, deferred
 * row. From stage 5 onward the vendor chunk shows as a cache hit on the
 * second visit (icon + greyed bar), making the warm-cache story visible
 * without leaving the lab.
 */
export function WaterfallStrip({ state, stage }: WaterfallStripProps) {
  const reducedMotion = usePrefersReducedMotion();
  const showCache = stage >= 5;

  const rows = useMemo(() => buildRows(state), [state]);
  const maxKB = useMemo(() => rows.reduce((m, r) => Math.max(m, r.startKB + r.sizeKB), 1), [rows]);

  return (
    <div
      className={styles.strip}
      role="figure"
      aria-label={showCache ? "Network waterfall — second visit, vendor served from cache" : "Network waterfall — first visit, every chunk downloaded"}
    >
      <div className={styles.caption}>
        <span className={styles.title}>Network waterfall</span>
        <span className={styles.hint}>
          {showCache ? "Second visit — vendor served from cache" : "First visit — every chunk downloaded"}
        </span>
      </div>
      <div className={styles.track}>
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const cached = showCache && row.isCached;
            const leftPct = (row.startKB / maxKB) * 100;
            const widthPct = Math.max(2, (row.sizeKB / maxKB) * 100);
            const accent = COLOR_KEY_VAR[row.colorKey] ?? "var(--diagram-layer-5)";

            return (
              <motion.div
                key={row.id}
                className={styles.row}
                layout
                data-initial={row.isInitial ? "true" : undefined}
                data-cached={cached ? "true" : undefined}
                initial={reducedMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -4 }}
                transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
              >
                <span className={styles.label}>{row.label}</span>
                <div className={styles.barTrack}>
                  <span
                    className={styles.bar}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      "--bar-accent": accent,
                    } as React.CSSProperties}
                  >
                    {cached && (
                      <span className={styles.cacheIcon} aria-label="cache hit">
                        <CacheGlyph />
                      </span>
                    )}
                  </span>
                </div>
                <span className={styles.kb}>
                  {cached ? "0 KB" : `${row.sizeKB} KB`}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Layout ──────────────────────────────────────────────────────────

interface Row {
  id: string;
  label: string;
  startKB: number;
  sizeKB: number;
  isInitial: boolean;
  isCached: boolean;
  colorKey: string;
}

/**
 * Convert chunks into a stacked waterfall. Initial chunks share the cold
 * row (parallel HTTP/2 requests, drawn as overlapping bars by start offset
 * so the eye still sees a row per chunk). On-demand chunks live in a later
 * row to represent the user-triggered fetch after first paint.
 */
function buildRows(state: BundleState): Row[] {
  const initialChunks = state.chunks.filter((c) => c.chunk.isInitial);
  const lazyChunks = state.chunks.filter((c) => !c.chunk.isInitial);

  const initialOrder = orderInitial(initialChunks);
  const initialRows = stackParallel(initialOrder, 0);

  // Lazy chunks start after the initial row's longest bar, with a small gap.
  const initialEnd = initialRows.reduce((m, r) => Math.max(m, r.startKB + r.sizeKB), 0);
  const lazyStart = initialEnd + Math.max(initialEnd * 0.12, 12);
  const lazyRows = stackParallel(lazyChunks, lazyStart);

  return [...initialRows, ...lazyRows];
}

/**
 * Stable order for initial chunks: vendor first (HTTP/2 prioritizes it), then
 * the initial chunk, then routes by size descending. Avoids jittery row order
 * as the treemap reflows.
 */
function orderInitial(chunks: ChunkSlice[]): ChunkSlice[] {
  return [...chunks].sort((a, b) => {
    const rank = (c: ChunkSlice): number => {
      if (c.chunk.role === "vendor") return 0;
      if (c.chunk.role === "monolith") return 0;
      if (c.chunk.role === "initial") return 1;
      if (c.chunk.role === "route") return 2;
      return 3;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return b.sizeKB - a.sizeKB;
  });
}

function stackParallel(chunks: ChunkSlice[], baseKB: number): Row[] {
  return chunks.map((c, idx) => ({
    id: c.chunk.id,
    label: c.chunk.label,
    // Stagger each bar's start so the eye reads them as parallel rather than overlapping.
    startKB: baseKB + idx * Math.max(2, c.sizeKB * 0.04),
    sizeKB: c.sizeKB,
    isInitial: c.chunk.isInitial,
    isCached: c.chunk.isCached,
    colorKey: c.chunk.colorKey,
  }));
}

// ── Cache icon ──────────────────────────────────────────────────────

function CacheGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden focusable="false">
      <path
        d="M3 3.5h6M3 6h6M3 8.5h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="6" cy="2" rx="3.5" ry="1.2" stroke="currentColor" strokeWidth="1" fill="none" />
      <ellipse cx="6" cy="10" rx="3.5" ry="1.2" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { ChunkBox, TreemapLayout, TreemapNode } from "../engine/bundle-simulator";
import styles from "./Treemap.module.css";

interface TreemapProps {
  layout: TreemapLayout;
  /** When the stage transitions, framer-motion re-layouts every rect. */
  stageKey: string | number;
  /** Optional override for nodes that should pulse (capstone offenders). */
  highlightedModuleIds?: ReadonlySet<string>;
  /** Reports the rendered canvas size so the context can recompute layout. */
  onResize?: (width: number, height: number) => void;
}

const COLOR_KEY_VAR: Record<string, string> = {
  "muted": "var(--color-muted)",
  "layer-0": "var(--diagram-layer-0)",
  "layer-1": "var(--diagram-layer-1)",
  "layer-2": "var(--diagram-layer-2)",
  "layer-3": "var(--diagram-layer-3)",
  "layer-4": "var(--diagram-layer-4)",
  "layer-5": "var(--diagram-layer-5)",
  "layer-6": "var(--diagram-layer-6)",
  "layer-7": "var(--diagram-layer-7)",
};

export function Treemap({ layout, stageKey, highlightedModuleIds, onResize }: TreemapProps) {
  const reducedMotion = usePrefersReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Watch the wrapper's size and bubble it up so the context can compute layout
  // against the actual canvas dimensions.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !onResize) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) onResize(Math.round(width), Math.round(height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onResize]);

  const sortedChunks = useMemo(
    () => [...layout.chunks].sort((a, b) => (a.chunkId > b.chunkId ? 1 : -1)),
    [layout.chunks],
  );

  return (
    <div className={styles.canvas} ref={wrapperRef} role="figure" aria-label="Bundle treemap">
      <LayoutGroup id={`treemap-${stageKey}`}>
        {/* Chunk frames render first so module rects stack above them. */}
        <AnimatePresence>
          {sortedChunks.map((chunk) => (
            <ChunkFrame key={chunk.chunkId} chunk={chunk} reducedMotion={reducedMotion} />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {layout.modules.map((module) => (
            <ModuleRect
              key={module.id}
              node={module}
              reducedMotion={reducedMotion}
              highlighted={highlightedModuleIds?.has(module.id) ?? false}
            />
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

interface ChunkFrameProps {
  chunk: ChunkBox;
  reducedMotion: boolean;
}

function ChunkFrame({ chunk, reducedMotion }: ChunkFrameProps) {
  const color = COLOR_KEY_VAR[chunk.colorKey] ?? "var(--diagram-layer-1)";

  return (
    <motion.div
      layout
      layoutId={`chunk-${chunk.chunkId}`}
      className={styles.chunkFrame}
      data-role={chunk.role}
      data-initial={chunk.isInitial ? "true" : undefined}
      data-cached={chunk.isCached ? "true" : undefined}
      style={{
        left: chunk.rect.x,
        top: chunk.rect.y,
        width: chunk.rect.width,
        height: chunk.rect.height,
        // Outline color tracks chunk identity for visual continuity across stages.
        "--chunk-accent": color,
      } as React.CSSProperties}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
    >
      <div className={styles.chunkHeader}>
        <span className={styles.chunkLabel}>{chunk.label}</span>
        <span className={styles.chunkMeta}>
          {chunk.sizeKB} KB
          {chunk.isCached && <span className={styles.cacheBadge} aria-label="cached chunk">cached</span>}
          {chunk.isInitial && !chunk.isCached && <span className={styles.initialBadge}>initial</span>}
        </span>
      </div>
    </motion.div>
  );
}

interface ModuleRectProps {
  node: TreemapNode;
  reducedMotion: boolean;
  highlighted: boolean;
}

function ModuleRect({ node, reducedMotion, highlighted }: ModuleRectProps) {
  const showLabel = node.rect.width >= 48 && node.rect.height >= 24;
  const showSize = node.rect.width >= 64 && node.rect.height >= 36;

  return (
    <motion.div
      layout
      layoutId={`module-${node.id}`}
      className={styles.moduleRect}
      data-category={node.category}
      data-initial={node.isInitial ? "true" : undefined}
      data-cached={node.isCached ? "true" : undefined}
      data-shaken={node.shaken ? "true" : undefined}
      data-highlighted={highlighted ? "true" : undefined}
      style={{
        left: node.rect.x,
        top: node.rect.y,
        width: node.rect.width,
        height: node.rect.height,
      }}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
      aria-label={`${node.label}, ${node.sizeKB} kilobytes`}
    >
      {showLabel && (
        <span className={styles.moduleLabel}>
          {node.label}
          {node.shaken && <span className={styles.shakenMark} aria-hidden>×</span>}
        </span>
      )}
      {showSize && <span className={styles.moduleSize}>{node.sizeKB} KB</span>}
    </motion.div>
  );
}

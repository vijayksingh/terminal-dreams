"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { BundleState } from "../engine/bundle-simulator";
import styles from "./ChunkList.module.css";

interface ChunkListProps {
  state: BundleState;
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

export function ChunkList({ state }: ChunkListProps) {
  const reducedMotion = usePrefersReducedMotion();
  const totalKB = state.totalKB;
  const ordered = useMemo(() => {
    return [...state.chunks].sort((a, b) => {
      if (a.chunk.isInitial !== b.chunk.isInitial) return a.chunk.isInitial ? -1 : 1;
      return b.sizeKB - a.sizeKB;
    });
  }, [state.chunks]);

  return (
    <div className={styles.list} role="list" aria-label="Bundle chunks">
      <div className={styles.header}>
        <span>chunk</span>
        <span>size</span>
        <span>role</span>
      </div>
      {ordered.map((c) => {
        const pct = totalKB > 0 ? Math.round((c.sizeKB / totalKB) * 100) : 0;
        const accent = COLOR_KEY_VAR[c.chunk.colorKey] ?? "var(--diagram-layer-5)";
        return (
          <motion.div
            key={c.chunk.id}
            className={styles.row}
            role="listitem"
            data-initial={c.chunk.isInitial ? "true" : undefined}
            data-cached={c.chunk.isCached ? "true" : undefined}
            style={{ "--chunk-accent": accent } as React.CSSProperties}
            layout="position"
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
          >
            <div className={styles.cell}>
              <span className={styles.swatch} aria-hidden />
              <span className={styles.name}>{c.chunk.label}</span>
            </div>
            <div className={styles.cell}>
              <span className={styles.size}>{c.sizeKB} KB</span>
              <span className={styles.pct}>{pct}%</span>
            </div>
            <div className={styles.cell}>
              {c.chunk.isInitial ? (
                <span className={styles.tag} data-variant="initial">
                  {c.chunk.isCached ? "vendor · cached" : "initial"}
                </span>
              ) : (
                <span className={styles.tag} data-variant="lazy">on demand</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

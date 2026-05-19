"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import type { FlowNode } from "@/mdx/shared/flow-diagram";
import type { ArchPayload, ArchStateEntry } from "./types";
import { diffRows, hasStateChange, BubbleStateRow } from "./state-diff";
import styles from "./styles.module.css";

type AnchoredDetailCardProps = {
  node: FlowNode | undefined;
  caption: string;
  stepNumber: number;
  totalSteps: number;
  payload?: ArchPayload;
  stateAfter?: ArchStateEntry[];
  prevState?: ArchStateEntry[];
  stepKey: string;
  reducedMotion: boolean;
  /** Vertical center of the card, expressed as percent of canvas height. */
  anchorYPercent: number;
};

export function AnchoredDetailCard({
  node,
  caption,
  stepNumber,
  totalSteps,
  payload,
  stateAfter,
  prevState,
  stepKey,
  reducedMotion,
  anchorYPercent,
}: AnchoredDetailCardProps) {
  const rows = stateAfter ? diffRows(stateAfter, prevState ?? []) : [];
  const stateHasChange = hasStateChange(rows);

  // Clamp so card never escapes the canvas at edge rows.
  const clampedY = Math.max(8, Math.min(92, anchorYPercent));

  return (
    <motion.div
      className={styles.floatingCard}
      animate={{ top: `${clampedY}%` }}
      transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
      style={{ top: `${clampedY}%` }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          className={styles.floatingCardInner}
          initial={reducedMotion ? false : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 4 }}
          transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
        >
          <div className={styles.bubbleHeader}>
            <span className={styles.bubbleNodeRef}>
              <span className={styles.bubbleArrow}>↑</span>
              {node?.label ?? "node"}
            </span>
            <span className={styles.bubbleStepCount}>
              step {stepNumber} <span className={styles.bubbleSlash}>/</span>{" "}
              {totalSteps}
            </span>
          </div>

          <p className={styles.bubbleCaption}>{caption}</p>

          {payload && (
            <section className={styles.bubbleSection}>
              <header className={styles.bubbleSectionHead}>
                <span className={styles.bubbleSectionLabel}>
                  {payload.type.kind ?? "inbound"}
                </span>
                <span className={styles.bubbleSectionTitle}>
                  {payload.type.name}
                </span>
                {payload.type.extends && (
                  <span className={styles.bubbleSectionExtends}>
                    extends <em>{payload.type.extends}</em>
                  </span>
                )}
              </header>
              <div className={styles.bubbleFields}>
                {payload.type.fields.map((f, i) => (
                  <div key={i} className={styles.bubbleField}>
                    <span className={styles.bubbleFieldName}>{f.name}</span>
                    <span className={styles.bubbleFieldType}>{f.type}</span>
                    {f.note && (
                      <span className={styles.bubbleFieldNote}>{f.note}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {stateHasChange && (
            <section className={styles.bubbleSection}>
              <header className={styles.bubbleSectionHead}>
                <span className={styles.bubbleSectionLabel}>state</span>
              </header>
              <div className={styles.bubbleFields}>
                {rows.map((row) => (
                  <BubbleStateRow
                    key={row.key}
                    row={row}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

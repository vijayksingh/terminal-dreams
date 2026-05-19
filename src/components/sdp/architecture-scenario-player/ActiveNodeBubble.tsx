"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { FlowNode } from "@/mdx/shared/flow-diagram";
import type { ArchPayload, ArchStateEntry } from "./types";
import styles from "./styles.module.css";

type ActiveNodeBubbleProps = {
  /** The node this bubble is attached to. */
  node: FlowNode | undefined;
  /** Step caption — what's happening on this beat. */
  caption: string;
  /** Step counter (1-indexed) and total — shown as "step N of M" in header. */
  stepNumber: number;
  totalSteps: number;
  /** Inbound payload (type that arrived at this node). */
  payload?: ArchPayload;
  /** Current state snapshot (if relevant — only Gallery typically). */
  stateAfter?: ArchStateEntry[];
  /** Previous step's state snapshot for diffing. */
  prevState?: ArchStateEntry[];
  /** Stable key for AnimatePresence swap between steps. */
  stepKey: string;
  /** Horizontal anchor in percent (0-100), points the tail at the node. */
  tailXPercent: number;
  reducedMotion: boolean;
};

type DiffKind = "added" | "changed" | "removed" | "same";

type DiffRow = ArchStateEntry & { kind: DiffKind; prev?: string };

function diffRows(
  current: ArchStateEntry[],
  previous: ArchStateEntry[],
): DiffRow[] {
  const prevMap = new Map(previous.map((e) => [e.key, e.value]));
  const out: DiffRow[] = [];
  for (const e of current) {
    if (!prevMap.has(e.key)) out.push({ ...e, kind: "added" });
    else if (prevMap.get(e.key) !== e.value)
      out.push({ ...e, kind: "changed", prev: prevMap.get(e.key) });
    else out.push({ ...e, kind: "same" });
    prevMap.delete(e.key);
  }
  for (const [key, value] of prevMap) {
    out.push({ key, value: "—", kind: "removed", prev: value });
  }
  return out;
}

export function ActiveNodeBubble({
  node,
  caption,
  stepNumber,
  totalSteps,
  payload,
  stateAfter,
  prevState,
  stepKey,
  tailXPercent,
  reducedMotion,
}: ActiveNodeBubbleProps) {
  const rows = stateAfter ? diffRows(stateAfter, prevState ?? []) : [];
  // Only show the state section when something *changed* — eliminates the
  // noisy "everything updates every step" feeling that the previous panel
  // suffered from.
  const stateHasChange = rows.some(
    (r) => r.kind === "added" || r.kind === "changed" || r.kind === "removed",
  );

  return (
    <div
      className={styles.bubbleZone}
      style={{ ["--bubble-tail-x" as string]: `${tailXPercent}%` }}
    >
      {/* Connector line from diagram bottom into the bubble top */}
      <AnimatePresence mode="wait">
        <motion.span
          key={`connector-${stepKey}`}
          aria-hidden
          className={styles.bubbleConnector}
          initial={reducedMotion ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { scaleY: 0, opacity: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
          style={{ transformOrigin: "top" }}
        />
      </AnimatePresence>

      {/* The bubble itself */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          className={styles.bubble}
          initial={
            reducedMotion ? false : { opacity: 0, scale: 0.95, y: -4 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -3 }
          }
          transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
          style={{
            transformOrigin: `var(--bubble-tail-x) top`,
          }}
        >
          {/* Tail — small triangle pointing up at the node */}
          <span aria-hidden className={styles.bubbleTail} />
          <span aria-hidden className={styles.bubbleTailBorder} />

          {/* Header — node ref + step counter */}
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

          {/* Caption — the step's narration, no longer a separate strip */}
          <p className={styles.bubbleCaption}>{caption}</p>

          {/* Inbound payload section */}
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

          {/* State section — only if something changed this step */}
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
    </div>
  );
}

function BubbleStateRow({
  row,
  reducedMotion,
}: {
  row: DiffRow;
  reducedMotion: boolean;
}) {
  const isMutation = row.kind === "added" || row.kind === "changed";
  return (
    <div className={styles.bubbleStateRow} data-kind={row.kind}>
      {!reducedMotion && isMutation && (
        <motion.span
          key={`flash-${row.kind}-${row.value}`}
          aria-hidden
          className={styles.bubbleStateFlash}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
      <span className={styles.bubbleFieldName}>{row.key}</span>
      {row.kind === "changed" && row.prev ? (
        <span className={styles.bubbleStateValueGroup}>
          <span className={styles.bubbleStateValueOld}>{row.prev}</span>
          <span className={styles.bubbleStateArrow}>→</span>
          <span className={styles.bubbleStateValueNew}>{row.value}</span>
        </span>
      ) : (
        <span
          className={
            row.kind === "added"
              ? styles.bubbleStateValueNew
              : row.kind === "removed"
                ? styles.bubbleStateValueOld
                : styles.bubbleStateValue
          }
        >
          {row.value}
        </span>
      )}
    </div>
  );
}

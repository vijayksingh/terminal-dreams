"use client";

import { motion } from "framer-motion";
import type { ArchStateEntry } from "./types";
import styles from "./styles.module.css";

export type DiffKind = "added" | "changed" | "removed" | "same";

export type DiffRow = ArchStateEntry & { kind: DiffKind; prev?: string };

export function diffRows(
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

export function hasStateChange(rows: DiffRow[]): boolean {
  return rows.some(
    (r) => r.kind === "added" || r.kind === "changed" || r.kind === "removed",
  );
}

export function BubbleStateRow({
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

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { ArchStateEntry } from "./types";
import styles from "./styles.module.css";

type StateDiffPanelProps = {
  /** Current snapshot. Empty array means "no state to show". */
  current: ArchStateEntry[] | undefined;
  /** Previous snapshot for diff highlight. */
  previous: ArchStateEntry[] | undefined;
  /** Per-step key so we re-mount on step changes. */
  stepKey: string;
  reducedMotion: boolean;
};

type DiffKind = "added" | "changed" | "removed" | "same";

function diffRows(
  current: ArchStateEntry[],
  previous: ArchStateEntry[],
): Array<ArchStateEntry & { kind: DiffKind; prev?: string }> {
  const prevMap = new Map(previous.map((e) => [e.key, e.value]));
  const out: Array<ArchStateEntry & { kind: DiffKind; prev?: string }> = [];

  for (const e of current) {
    if (!prevMap.has(e.key)) {
      out.push({ ...e, kind: "added" });
    } else if (prevMap.get(e.key) !== e.value) {
      out.push({ ...e, kind: "changed", prev: prevMap.get(e.key) });
    } else {
      out.push({ ...e, kind: "same" });
    }
    prevMap.delete(e.key);
  }
  // Anything left in prevMap was removed (rare, but we surface it)
  for (const [key, value] of prevMap) {
    out.push({ key, value: "—", kind: "removed", prev: value });
  }
  return out;
}

export function StateDiffPanel({
  current,
  previous,
  stepKey,
  reducedMotion,
}: StateDiffPanelProps) {
  const rows = diffRows(current ?? [], previous ?? []);

  return (
    <div className={styles.statePanel}>
      <div className={styles.statePanelHead}>
        <span className={styles.statePanelKind}>Gallery state</span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.statePanelEmpty}>
          <span className={styles.statePanelEmptyDot} />
          <span>state not yet initialized</span>
        </div>
      ) : (
        <div className={styles.statePanelBody}>
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.div
                key={`${stepKey}-${row.key}`}
                className={styles.stateRow}
                data-kind={row.kind}
                initial={
                  reducedMotion
                    ? false
                    : row.kind === "added"
                      ? { opacity: 0, x: -8 }
                      : row.kind === "changed"
                        ? { opacity: 0.4 }
                        : { opacity: 0 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 6 }}
                transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
              >
                <span className={styles.stateKey}>{row.key}</span>
                <span className={styles.stateColon}>:</span>
                {row.kind === "changed" && row.prev ? (
                  <span className={styles.stateValueGroup}>
                    <span className={styles.stateValueOld}>{row.prev}</span>
                    <span className={styles.stateArrow}>→</span>
                    <span className={styles.stateValueNew}>{row.value}</span>
                  </span>
                ) : (
                  <span
                    className={
                      row.kind === "added"
                        ? styles.stateValueNew
                        : row.kind === "removed"
                          ? styles.stateValueOld
                          : styles.stateValue
                    }
                  >
                    {row.value}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}


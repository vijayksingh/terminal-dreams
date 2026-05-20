"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { InspectorSection } from "./derive-state";
import styles from "./stage.module.css";

type StateInspectorProps = {
  sections: InspectorSection[];
  /** Unique key driving the entrance animation when scene changes. */
  flashKey: string;
  reducedMotion: boolean;
  /** Optional accent override (defaults to var(--color-accent)). */
  accent?: "primary" | "network";
};

export function StateInspector({
  sections,
  flashKey,
  reducedMotion,
  accent = "primary",
}: StateInspectorProps) {
  return (
    <motion.div
      key={flashKey}
      className={styles.inspector}
      data-accent={accent}
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
    >
      {sections.map((section, i) => (
        <div key={`${section.kind}-${i}`} className={styles.inspectorSection}>
          <div className={styles.inspectorOpen}>
            <span className={styles.inspectorKeyword}>{section.kind}</span>
            <span className={styles.inspectorBrace}>{" { "}</span>
          </div>
          <div className={styles.inspectorBody}>
            {section.entries.map((entry, j) => (
              <div
                key={`${entry.key}-${j}`}
                className={styles.inspectorRow}
                data-changed={entry.changed ? "true" : undefined}
              >
                <span className={styles.inspectorPropKey}>{entry.key}</span>
                <span className={styles.inspectorColon}>:</span>
                <span
                  className={styles.inspectorPropValue}
                  data-type={entry.valueType}
                >
                  {entry.value}
                </span>
                {entry.source && (
                  <span className={styles.inspectorSource}>
                    <span className={styles.inspectorSourceArrow}>←</span>
                    {entry.source}
                  </span>
                )}
                {entry.changed && !reducedMotion && (
                  <motion.span
                    key={`flash-${flashKey}-${entry.key}`}
                    className={styles.inspectorRowFlash}
                    aria-hidden
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.95, ease: "easeOut" }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className={styles.inspectorClose}>
            <span className={styles.inspectorBrace}>{"}"}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

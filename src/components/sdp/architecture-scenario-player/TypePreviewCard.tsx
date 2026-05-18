"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import type { ArchPayload } from "./types";
import styles from "./styles.module.css";

type TypePreviewCardProps = {
  payload: ArchPayload | undefined;
  /** Used as the AnimatePresence key so card re-mounts per step. */
  stepKey: string;
  reducedMotion: boolean;
};

export function TypePreviewCard({ payload, stepKey, reducedMotion }: TypePreviewCardProps) {
  return (
    <div className={styles.typeCardSlot}>
      <AnimatePresence mode="wait">
        {payload ? (
          <motion.div
            key={stepKey}
            className={styles.typeCard}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            <div className={styles.typeCardHead}>
              <span className={styles.typeCardKind}>
                {payload.type.kind ?? "payload"}
              </span>
              <span className={styles.typeCardName}>{payload.type.name}</span>
              {payload.type.extends && (
                <span className={styles.typeCardExtends}>
                  extends <em>{payload.type.extends}</em>
                </span>
              )}
            </div>
            <div className={styles.typeCardBody}>
              {payload.type.fields.map((f, i) => (
                <div key={i} className={styles.typeRow}>
                  <span className={styles.typeFieldName}>{f.name}</span>
                  <span className={styles.typeFieldType}>{f.type}</span>
                  {f.note && (
                    <span className={styles.typeFieldNote}>{f.note}</span>
                  )}
                </div>
              ))}
            </div>
            {payload.sample && payload.sample.length > 0 && (
              <pre className={styles.typeSample}>
                {payload.sample.join("\n")}
              </pre>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className={styles.typeCardEmpty}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
          >
            <span className={styles.typeCardEmptyDot} />
            <span>No data in flight on this step.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

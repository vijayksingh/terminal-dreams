"use client";

import { motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "../ResourceHintsLab.module.css";

type Props = {
  stepCode: string;
  stepTitle: string;
  callout: string;
  snippet: string;
  savedMs: number;
  focusLabel: string;
};

export function HintCodePanel({
  stepCode,
  stepTitle,
  callout,
  snippet,
  savedMs,
  focusLabel,
}: Props) {
  const rm = usePrefersReducedMotion();
  const verdict =
    savedMs >= 50
      ? { tone: "good" as const, text: `${Math.abs(savedMs)}ms earlier` }
      : savedMs <= -50
        ? { tone: "bad" as const, text: `${Math.abs(savedMs)}ms slower` }
        : null;

  return (
    <motion.div
      className={styles.codePanel}
      initial={rm ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION.enterCard}
    >
      <div className={styles.codePanelHeader}>
        <span className={styles.codePanelStep}>{stepCode}</span>
        <span className={styles.codePanelTitle}>{stepTitle}</span>
        {verdict && (
          <span className={styles.codePanelBadge} data-tone={verdict.tone}>
            {focusLabel} · {verdict.text}
          </span>
        )}
      </div>
      <pre className={styles.codeSnippet}>
        <code>{snippet}</code>
      </pre>
      <p className={styles.codeCallout}>{callout}</p>
    </motion.div>
  );
}

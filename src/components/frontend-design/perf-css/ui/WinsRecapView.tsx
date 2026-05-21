"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "../CSSPerfLab.module.css";

interface RecapMilestone {
  id: string;
  label: string;
  detail: string;
  achieved: boolean;
}

export function WinsRecapView({
  extracted,
  auditCommitted,
  brokenJsCount,
  bytesSavedSafely,
  layersEnabled,
  cvEnabled,
  fcpMs,
  wins,
}: {
  extracted: boolean;
  auditCommitted: boolean;
  brokenJsCount: number;
  bytesSavedSafely: number;
  layersEnabled: boolean;
  cvEnabled: boolean;
  fcpMs: number;
  wins: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const safeAuditDone = auditCommitted && brokenJsCount === 0 && bytesSavedSafely > 0;
  const modernAdopted = layersEnabled && cvEnabled;
  const budgetMet = fcpMs <= 650;

  const milestones: RecapMilestone[] = [
    {
      id: "blocking",
      label: "Render-blocking",
      detail: `FCP ${fcpMs >= 1000 ? `${(fcpMs / 1000).toFixed(2)}s` : `${fcpMs}ms`} — ${budgetMet ? "budget met" : "still over budget"}`,
      achieved: budgetMet,
    },
    {
      id: "critical",
      label: "Critical CSS extracted",
      detail: extracted ? "Above-fold rules inlined; rest deferred" : "Extract in step 3",
      achieved: extracted,
    },
    {
      id: "audit",
      label: "Unused CSS audit",
      detail: safeAuditDone
        ? `${(bytesSavedSafely / 1024).toFixed(1)}KB removed without breaking runtime states`
        : auditCommitted && brokenJsCount > 0
          ? "Audit broke runtime states — reset and re-judge in step 4"
          : "Run the audit in step 4",
      achieved: safeAuditDone,
    },
    {
      id: "modern",
      label: "Modern CSS features",
      detail: modernAdopted
        ? "@layer and content-visibility both adopted"
        : "Toggle @layer and content-visibility in step 5",
      achieved: modernAdopted,
    },
  ];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>WINS Recap</div>

      <AnimatePresence initial={false}>
        {wins && (
          <motion.div
            key="wins-banner"
            className={styles.winsBanner}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
          >
            <span className={styles.winsBadge}>WINS</span>
            <div>
              <span className={styles.winsTitle}>Budget met cleanly</span>
              <span className={styles.winsSub}>FCP {(fcpMs / 1000).toFixed(2)}s, audit clean, modern features on</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.recapList} role="list">
        {milestones.map((m, idx) => (
          <motion.div
            key={m.id}
            role="listitem"
            className={styles.recapItem}
            data-achieved={m.achieved ? "true" : undefined}
            initial={reducedMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reducedMotion ? { duration: 0 } : { ...TRANSITION.enterCard, delay: idx * 0.05 }}
          >
            <span className={styles.recapMarker} data-achieved={m.achieved ? "true" : undefined} aria-hidden="true">
              {m.achieved ? "✓" : String(idx + 1)}
            </span>
            <div className={styles.recapBody}>
              <span className={styles.recapLabel}>{m.label}</span>
              <span className={styles.recapDetail}>{m.detail}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={styles.recapBudget}>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>FCP</span>
          <span className={styles.statValue} data-tone={budgetMet ? "good" : "bad"}>
            {fcpMs >= 1000 ? `${(fcpMs / 1000).toFixed(2)}s` : `${fcpMs}ms`}
          </span>
          <span className={styles.statCaption}>target ≤ 0.6s</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>Saved bytes</span>
          <span className={styles.statValue} data-tone={bytesSavedSafely > 0 ? "good" : "muted"}>
            {(bytesSavedSafely / 1024).toFixed(1)}KB
          </span>
          <span className={styles.statCaption}>from safe audit</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statLabel}>JS-toggled deleted</span>
          <span className={styles.statValue} data-tone={brokenJsCount === 0 ? "good" : "bad"}>
            {brokenJsCount}
          </span>
          <span className={styles.statCaption}>must stay zero</span>
        </div>
      </div>
    </div>
  );
}

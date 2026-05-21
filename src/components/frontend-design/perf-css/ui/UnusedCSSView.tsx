"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  detectUnused,
  staticUnusedRules,
  type AuditJudgment,
  type CSSRuleMock,
} from "../engine/css-perf-simulator";
import styles from "../CSSPerfLab.module.css";

export function UnusedCSSView({
  rules,
  judgments,
  onJudge,
  onReset,
  onCommit,
  committed,
  auditResult,
}: {
  rules: CSSRuleMock[];
  judgments: Record<string, AuditJudgment>;
  onJudge: (id: string, j: AuditJudgment) => void;
  onReset: () => void;
  onCommit: () => void;
  committed: boolean;
  auditResult: ReturnType<typeof detectUnused>;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const staticUnused = rules.filter((r) => r.matchCount === 0);
  const allJudged = staticUnused.every((r) => judgments[r.id]);
  const brokenIds = new Set(auditResult.brokenJsRules.map((r) => r.id));

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Unused CSS Audit</div>
      <p className={styles.widgetNote}>
        Coverage flags {staticUnused.length} rules as unused. Some are truly dead.
        Some look dead but JS adds them at runtime. Judge each rule before committing.
      </p>

      <div className={styles.auditPreviewRow}>
        <MockPreview broken={committed && brokenIds} />
        <BytesPanel auditResult={auditResult} staticUnused={staticUnused} />
      </div>

      <div className={styles.auditList} role="list">
        {staticUnused.map((r) => {
          const j = judgments[r.id];
          const reveal = committed && j !== undefined;
          const wasBroken = committed && j === "safe" && r.toggledByJS;
          const wasCorrect = committed && (
            (j === "safe" && !r.toggledByJS) ||
            (j === "needed-by-js" && r.toggledByJS)
          );

          return (
            <div
              key={r.id}
              role="listitem"
              className={styles.auditRow}
              data-broken={wasBroken ? "true" : undefined}
              data-correct={wasCorrect ? "true" : undefined}
            >
              <div className={styles.auditRule}>
                <span className={styles.auditSelector}>{r.selector}</span>
                <span className={styles.auditBody}>{r.bodyPreview}</span>
              </div>
              <div className={styles.auditDecision} role="radiogroup" aria-label={`Judge ${r.selector}`}>
                <button
                  type="button"
                  className={styles.judgeButton}
                  data-active={j === "safe" ? "true" : undefined}
                  data-tone="safe"
                  onClick={() => onJudge(r.id, "safe")}
                  disabled={committed}
                  role="radio"
                  aria-checked={j === "safe"}
                >
                  safe to remove
                </button>
                <button
                  type="button"
                  className={styles.judgeButton}
                  data-active={j === "needed-by-js" ? "true" : undefined}
                  data-tone="js"
                  onClick={() => onJudge(r.id, "needed-by-js")}
                  disabled={committed}
                  role="radio"
                  aria-checked={j === "needed-by-js"}
                >
                  needed by JS
                </button>
              </div>
              <AnimatePresence initial={false}>
                {reveal && r.toggledByJS && (
                  <motion.div
                    key="reason"
                    className={styles.auditReveal}
                    data-tone={wasBroken ? "broken" : "ok"}
                    initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={reducedMotion ? { duration: 0 } : TRANSITION.collapse}
                  >
                    <span className={styles.auditReason}>{r.jsReason}</span>
                    {wasBroken && r.breaks && (
                      <span className={styles.auditBreaks}>BROKE — {r.breaks}</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className={styles.auditActions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onCommit}
          disabled={!allJudged || committed}
          data-armed={allJudged && !committed ? "true" : undefined}
        >
          {committed ? "Audit committed" : `Commit (${Object.keys(judgments).length}/${staticUnused.length})`}
        </button>
        <button
          type="button"
          className={styles.actionButtonSecondary}
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <AnimatePresence initial={false}>
        {committed && (
          <motion.div
            key="verdict"
            className={styles.auditVerdict}
            data-tone={auditResult.brokenJsRules.length === 0 ? "good" : "bad"}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            {auditResult.brokenJsRules.length === 0 ? (
              <span>
                Clean audit. {(auditResult.bytesSavedSafely / 1024).toFixed(1)}KB removed safely.
                JS-toggled rules kept — runtime states still styled.
              </span>
            ) : (
              <span>
                Page broken. You deleted {auditResult.brokenJsRules.length} JS-toggled rule
                {auditResult.brokenJsRules.length === 1 ? "" : "s"} —
                {" "}{(auditResult.bytesAtRisk / 1024).toFixed(1)}KB at risk. Reset and try the two-snapshot audit.
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MockPreview({ broken }: { broken: false | Set<string> }) {
  const brokenSet = broken === false ? new Set<string>() : broken;
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.previewFrame}>
      <span className={styles.previewLabel}>Live preview</span>
      <div
        className={styles.previewStage}
        data-broken-modal-scroll={brokenSet.has("u-modal-open") ? "true" : undefined}
        data-broken-dark={brokenSet.has("u-dark") ? "true" : undefined}
      >
        <div
          className={styles.previewModal}
          data-broken={brokenSet.has("u-modal") ? "true" : undefined}
          data-broken-anim={brokenSet.has("u-toast-show") ? "true" : undefined}
        >
          <span>Modal</span>
        </div>
        <div className={styles.previewToast} data-broken={brokenSet.has("u-toast-show") ? "true" : undefined}>
          <span>toast</span>
        </div>
        <div
          className={styles.previewFocus}
          data-broken={brokenSet.has("u-focus-form") ? "true" : undefined}
        >
          input
        </div>
        <div
          className={styles.previewDrag}
          data-broken={brokenSet.has("u-dragging") ? "true" : undefined}
        >
          drag
        </div>
        <AnimatePresence initial={false}>
          {brokenSet.size > 0 && (
            <motion.span
              key="broken-banner"
              className={styles.previewBroken}
              initial={reducedMotion ? false : { opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
            >
              {brokenSet.size} runtime state{brokenSet.size === 1 ? "" : "s"} broken
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BytesPanel({
  auditResult,
  staticUnused,
}: {
  auditResult: ReturnType<typeof detectUnused>;
  staticUnused: CSSRuleMock[];
}) {
  const totalKB = staticUnused.reduce((s, r) => s + r.sizeBytes, 0) / 1024;
  const savedKB = auditResult.bytesSavedSafely / 1024;
  const atRiskKB = auditResult.bytesAtRisk / 1024;

  return (
    <div className={styles.bytesPanel}>
      <div className={styles.bytesRow}>
        <span className={styles.bytesLabel}>Coverage flagged</span>
        <span className={styles.bytesValue} data-tone="warn">
          {totalKB.toFixed(1)}KB
        </span>
      </div>
      <div className={styles.bytesRow}>
        <span className={styles.bytesLabel}>Safe to remove</span>
        <span className={styles.bytesValue} data-tone="good">
          {savedKB.toFixed(1)}KB
        </span>
      </div>
      <div className={styles.bytesRow}>
        <span className={styles.bytesLabel}>At risk if deleted</span>
        <span className={styles.bytesValue} data-tone={atRiskKB > 0 ? "bad" : "muted"}>
          {atRiskKB.toFixed(1)}KB
        </span>
      </div>
    </div>
  );
}

// expose for tree-shake guard
void staticUnusedRules;

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { extractCritical, type CSSRuleMock } from "../engine/css-perf-simulator";
import styles from "../CSSPerfLab.module.css";

export function CriticalCSSView({
  rules,
  extracted,
  onToggle,
  fcpMs,
}: {
  rules: CSSRuleMock[];
  extracted: boolean;
  onToggle: () => void;
  fcpMs: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const { critical, deferred, inlineBytes, deferredBytes, ratio } = extractCritical(rules);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Critical CSS Extractor</div>

      <div className={styles.criticalLayout}>
        {/* Left: mock page with a fold line */}
        <div className={styles.mockPage}>
          <div className={styles.mockNav}>
            <span className={styles.mockNavDot} />
            <span className={styles.mockNavLinks}>
              <span /><span /><span />
            </span>
          </div>
          <div className={styles.mockHero}>
            <span className={styles.mockHeroTitle}>Welcome</span>
            <span className={styles.mockHeroSub} />
            <span className={styles.mockHeroCTA}>Get started</span>
          </div>
          <div className={styles.mockHeroImg} aria-hidden="true">
            <span className={styles.mockHeroImgIcon}>img</span>
          </div>

          <div className={styles.foldLine}>
            <span>--- fold ---</span>
          </div>

          <div className={styles.mockCardGrid} data-dimmed={extracted ? undefined : "true"}>
            <span /><span /><span />
          </div>
          <div className={styles.mockFooter} data-dimmed={extracted ? undefined : "true"} />
        </div>

        {/* Right: rule list */}
        <div className={styles.ruleList} aria-label="Stylesheet rules">
          {critical.map((r) => (
            <RuleRow key={r.id} rule={r} state={extracted ? "inlined" : "above"} />
          ))}
          {deferred.map((r) => (
            <RuleRow key={r.id} rule={r} state={extracted ? "deferred" : "below"} />
          ))}
        </div>
      </div>

      <div className={styles.criticalActions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onToggle}
          data-armed={!extracted ? "true" : undefined}
        >
          {extracted ? "Reset extraction" : "Extract critical CSS"}
        </button>
        <div className={styles.criticalStats}>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Inline</span>
            <span className={styles.statValue} data-tone="good">
              {(inlineBytes / 1024).toFixed(1)}KB
            </span>
            <span className={styles.statCaption}>{Math.round(ratio * 100)}% of sheet</span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Deferred</span>
            <span className={styles.statValue} data-tone="muted">
              {(deferredBytes / 1024).toFixed(1)}KB
            </span>
            <span className={styles.statCaption}>{Math.round((1 - ratio) * 100)}% streams behind</span>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {extracted && (
          <motion.div
            key="fcp-callout"
            className={styles.fcpCallout}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            <span className={styles.fcpCalloutLabel}>FCP</span>
            <motion.span
              key={fcpMs}
              className={styles.fcpCalloutValue}
              initial={reducedMotion ? false : { scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
            >
              {fcpMs >= 1000 ? `${(fcpMs / 1000).toFixed(2)}s` : `${fcpMs}ms`}
            </motion.span>
            <span className={styles.fcpCalloutNote}>
              {fcpMs <= 650 ? "budget met" : "still over budget"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RuleRow({ rule, state }: { rule: CSSRuleMock; state: "above" | "below" | "inlined" | "deferred" }) {
  return (
    <div className={styles.ruleRow} data-state={state}>
      <span className={styles.ruleDot} data-state={state} aria-hidden="true" />
      <span className={styles.ruleSelector}>{rule.selector}</span>
      <span className={styles.ruleBody}>{rule.bodyPreview}</span>
      <span className={styles.ruleSize}>{(rule.sizeBytes / 1024).toFixed(1)}KB</span>
    </div>
  );
}

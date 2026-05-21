"use client";

import { useState, useRef, useEffect } from "react";
import { usePerfContext } from "../perf-context";
import { OPTIMIZATIONS, type OptimizationId } from "../engine/perf-simulator";
import styles from "../WebPerformanceLab.module.css";

type BudgetStrictness = "relaxed" | "standard" | "aggressive";
const BUDGET_PRESETS: Record<BudgetStrictness, { lcp: number; inp: number; cls: number; js: number }> = {
  relaxed: { lcp: 4000, inp: 500, cls: 0.25, js: 400 },
  standard: { lcp: 2500, inp: 200, cls: 0.1, js: 250 },
  aggressive: { lcp: 1500, inp: 100, cls: 0.05, js: 150 },
};

export function BudgetWidget() {
  const { metrics, enabledOptimizations, setOptimizationEnabled } = usePerfContext();
  const [strictness, setStrictness] = useState<BudgetStrictness>("standard");
  const [regressionActive, setRegressionActive] = useState(false);
  const [regressionOpt, setRegressionOpt] = useState<OptimizationId | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabledOptimizations);
  enabledRef.current = enabledOptimizations;

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const simulateRegression = () => {
    if (regressionActive) return;
    const active = OPTIMIZATIONS.filter((o) => enabledOptimizations.has(o.id));
    if (active.length === 0) return;
    const target = active[Math.floor(Math.random() * active.length)];
    setRegressionOpt(target.id);
    setOptimizationEnabled(target.id, false);
    setRegressionActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!enabledRef.current.has(target.id)) {
        setOptimizationEnabled(target.id, true);
      }
      setRegressionActive(false);
      setRegressionOpt(null);
    }, 3000);
  };

  const bp = BUDGET_PRESETS[strictness];
  const budgets = [
    { metric: "LCP", budget: bp.lcp, actual: metrics.lcp, unit: "ms", key: "lcp" },
    { metric: "INP", budget: bp.inp, actual: metrics.inp, unit: "ms", key: "inp" },
    { metric: "CLS", budget: bp.cls, actual: metrics.cls, unit: "", key: "cls" },
    { metric: "JS size", budget: bp.js, actual: metrics.jsSizeKB, unit: "KB", key: "js" },
  ];

  const failCount = budgets.filter((b) => b.actual > b.budget).length;
  const allPass = failCount === 0;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Performance Budget</div>
      <div className={styles.yieldPresets}>
        {(["relaxed", "standard", "aggressive"] as BudgetStrictness[]).map((level) => (
          <button
            key={level}
            type="button"
            className={styles.yieldPresetBtn}
            data-active={level === strictness ? "true" : undefined}
            onClick={() => setStrictness(level)}
            aria-label={`${level} budget strictness`}
            aria-pressed={level === strictness}
          >
            {level}
          </button>
        ))}
      </div>
      <div className={styles.budgetGrid}>
        {budgets.map((b) => {
          const passed = b.actual <= b.budget;
          return (
            <div key={b.metric} className={styles.budgetRow} data-passed={passed ? "true" : undefined}>
              <span className={styles.budgetMetric}>{b.metric}</span>
              <div className={styles.budgetBarWrap}>
                <div
                  className={styles.budgetBar}
                  data-passed={passed ? "true" : undefined}
                  style={{ width: `${Math.min((b.actual / b.budget) * 100, 150)}%` }}
                />
                <div className={styles.budgetThreshold} />
              </div>
              <span className={styles.budgetValues}>
                <span data-status={passed ? "good" : "bad"}>
                  {typeof b.actual === "number" && b.actual % 1 !== 0 ? b.actual.toFixed(2) : b.actual}
                </span>
                {" / "}
                {typeof b.budget === "number" && b.budget % 1 !== 0 ? b.budget.toFixed(2) : b.budget}
                {b.unit && ` ${b.unit}`}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className={styles.budgetVerdict}
        data-all-pass={allPass ? "true" : undefined}
      >
        {allPass
          ? <><span className={styles.verdictPass}>✓ PASS</span> All metrics within budget — safe to merge</>
          : <><span className={styles.verdictFail}>✗ FAIL</span> {failCount} metric(s) over budget — enable more optimizations above</>}
      </div>

      {enabledOptimizations.size > 0 && (
        <button
          type="button"
          className={styles.clickSimButton}
          data-state={regressionActive ? "queued" : "idle"}
          onClick={simulateRegression}
          disabled={regressionActive}
          aria-label={regressionActive ? "Regression simulation in progress" : "Simulate a careless PR disabling a random optimization"}
        >
          {regressionActive
            ? `Careless PR disabled ${regressionOpt ? OPTIMIZATIONS.find((o) => o.id === regressionOpt)?.label : ""}...`
            : "Simulate careless PR"}
        </button>
      )}
      {regressionActive && (
        <p className={styles.widgetNote}>
          A single reverted optimization — this is what performance entropy looks like. Budgets catch this in CI before it ships.
        </p>
      )}
    </div>
  );
}

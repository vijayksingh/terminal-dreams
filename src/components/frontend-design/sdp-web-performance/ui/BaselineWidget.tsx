"use client";

import { usePerfContext } from "../perf-context";
import { MetricsPanel } from "./MetricsPanel";
import styles from "../WebPerformanceLab.module.css";

export function BaselineWidget() {
  const { metrics } = usePerfContext();

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Baseline Audit</div>
      <MetricsPanel metrics={metrics} showAll />
    </div>
  );
}

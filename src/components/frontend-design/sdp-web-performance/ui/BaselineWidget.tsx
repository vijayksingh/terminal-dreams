"use client";

import { useState } from "react";
import { usePerfContext } from "../perf-context";
import { MetricsPanel } from "./MetricsPanel";
import styles from "../WebPerformanceLab.module.css";

const BOTTLENECK_CHOICES = [
  { id: "css-bundle", label: "styles.css (48 KB)" },
  { id: "main-js", label: "main.js (385 KB)" },
  { id: "hero-img", label: "hero.jpg (245 KB)" },
  { id: "chatbot", label: "chatbot.js (125 KB)" },
];

export function BaselineWidget() {
  const { metrics } = usePerfContext();
  const [bottleneckPick, setBottleneckPick] = useState<string | null>(null);
  const correct = bottleneckPick === "main-js";

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Baseline Audit</div>
      <MetricsPanel metrics={metrics} showAll />

      {bottleneckPick === null && (
        <>
          <p className={styles.widgetNote}>Which resource is the biggest bottleneck? Click to identify it.</p>
          <div className={styles.prefetchLinkGrid}>
            {BOTTLENECK_CHOICES.map((c) => (
              <button key={c.id} type="button" className={styles.prefetchLinkBtn} onClick={() => setBottleneckPick(c.id)}>
                <span className={styles.prefetchLinkPath}>{c.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {bottleneckPick !== null && (
        <div className={styles.predictionResult} data-correct={correct ? "true" : undefined}>
          <span className={styles.predictionResultIcon}>{correct ? "✓" : "✗"}</span>
          <span>
            {correct
              ? "Correct — main.js (385 KB) is the largest render-blocking resource. It delays every dependent resource in the waterfall."
              : `Not quite. ${BOTTLENECK_CHOICES.find((c) => c.id === bottleneckPick)?.label} contributes, but main.js (385 KB) is the single largest render-blocking resource that delays everything downstream.`}
          </span>
        </div>
      )}
    </div>
  );
}

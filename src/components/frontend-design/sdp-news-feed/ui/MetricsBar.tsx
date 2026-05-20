import React from "react";
import styles from "../NewsFeedLab.module.css";

export type MetricsBarProps = {
  activeStep: number;
  metrics: {
    domNodes: number;
    networkReqs: number;
    scrollFps: number;
    tti: number;
  };
};

export function MetricCard({
  label,
  value,
  bad,
  good,
}: {
  label: string;
  value: string | number;
  bad: boolean;
  good: boolean;
}) {
  const status = bad ? "bad" : good ? "good" : "neutral";
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-status={status}>
        {value}
      </div>
    </div>
  );
}

export function MetricsBar({ activeStep, metrics }: MetricsBarProps) {
  if (activeStep < 4) return null;

  return (
    <div className={styles.metricsBar}>
      <MetricCard
        label="DOM"
        value={metrics.domNodes}
        bad={metrics.domNodes > 100}
        good={metrics.domNodes <= 50}
      />
      <MetricCard
        label="Network"
        value={metrics.networkReqs}
        bad={metrics.networkReqs > 30}
        good={metrics.networkReqs <= 10}
      />
      <MetricCard
        label="Scroll FPS"
        value={metrics.scrollFps}
        bad={metrics.scrollFps < 50}
        good={metrics.scrollFps >= 58}
      />
      <MetricCard
        label="TTI"
        value={`${metrics.tti}ms`}
        bad={metrics.tti > 2000}
        good={metrics.tti <= 800}
      />
    </div>
  );
}

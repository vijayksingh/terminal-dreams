import React from "react";
import styles from "../ImageGalleryLab.module.css";

interface MetricsBarProps {
  activeStep: number;
  metrics: {
    domNodes: number;
    networkReqs: number;
    memoryMB: number;
    cls: number;
    lcpMs: number;
  };
}

export function MetricsBar({ activeStep, metrics }: MetricsBarProps) {
  if (activeStep < 4) return null;

  return (
    <div className={styles.metricsBar} role="status" aria-label="Simulated performance metrics">
      <MetricCard label="DOM" value={metrics.domNodes} bad={metrics.domNodes > 50} good={metrics.domNodes <= 25} />
      <MetricCard label="Network" value={metrics.networkReqs} bad={metrics.networkReqs > 50} good={metrics.networkReqs <= 20} />
      <MetricCard label="Memory" value={`${metrics.memoryMB}MB`} bad={metrics.memoryMB > 10} good={metrics.memoryMB <= 2} />
      <MetricCard label="CLS" value={metrics.cls.toFixed(2)} bad={metrics.cls > 0.1} good={metrics.cls <= 0.05} />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  bad: boolean;
  good: boolean;
}

function MetricCard({ label, value, bad, good }: MetricCardProps) {
  const status = bad ? "bad" : good ? "good" : "neutral";
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-status={status}>{value}</div>
    </div>
  );
}

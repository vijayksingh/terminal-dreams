"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { MfeTeam, MfeLoadState } from "../microfrontend-context";
import styles from "../MicrofrontendLab.module.css";

// ── Prediction Challenge ─────────────────────────────────────────────

export function PredictionChallenge({
  question,
  options,
  correctIndex,
  explanation,
  onComplete,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  onComplete?: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  useEffect(() => {
    if (revealed && onComplete) onComplete();
  }, [revealed, onComplete]);

  return (
    <div className={styles.prediction}>
      <div className={styles.predictionQ}>{question}</div>
      <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.predictionOption}
            data-correct={revealed && i === correctIndex ? "true" : undefined}
            data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
            onClick={() => !revealed && setSelected(i)}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      {revealed && (
        <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
          {selected === correctIndex ? "Correct " : "Not quite "}{explanation}
        </div>
      )}
    </div>
  );
}

// ── Remote Frame Container ────────────────────────────────────────────

export function RemoteFrameContainer({
  mfeTeams,
  loadStates,
}: {
  mfeTeams: MfeTeam[];
  loadStates: Record<string, MfeLoadState>;
}) {
  return (
    <div className={styles.mfePanelGrid}>
      {mfeTeams.map(team => {
        const state = loadStates[team.id] ?? "idle";
        return (
          <div key={team.id} className={styles.mfePanel} data-state={state}>
            <div className={styles.mfePanelName} style={{ color: team.color }}>{team.name}</div>
            <div className={styles.mfePanelStatus} data-state={state}>{state}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Host Shell / Dashboard ───────────────────────────────────────────

export function HostShellDashboard({
  eventCount,
  bundleSize,
  unsharedTotal = 636,
  readyCount,
  errorCount,
  errorIsolated,
}: {
  eventCount: number;
  bundleSize: number;
  unsharedTotal?: number;
  readyCount: number;
  errorCount: number;
  errorIsolated: boolean;
}) {
  const bundleSavingsPercent = bundleSize < unsharedTotal ? Math.round(((unsharedTotal - bundleSize) / unsharedTotal) * 100) : 0;
  return (
    <div className={styles.dashboardGrid}>
      <div className={styles.dashboardCard}>
        <span className={styles.dashboardLabel}>Events</span>
        <span className={styles.dashboardValue} data-status={eventCount > 0 ? "good" : undefined}>{eventCount}</span>
      </div>
      <div className={styles.dashboardCard}>
        <span className={styles.dashboardLabel}>Bundle Savings</span>
        <span className={styles.dashboardValue} data-status="good">
          {bundleSavingsPercent}%
        </span>
      </div>
      <div className={styles.dashboardCard}>
        <span className={styles.dashboardLabel}>MFEs Ready</span>
        <span className={styles.dashboardValue} data-status={readyCount === 3 ? "good" : errorCount > 0 ? "bad" : undefined}>
          {readyCount}/3
        </span>
      </div>
      <div className={styles.dashboardCard}>
        <span className={styles.dashboardLabel}>Error Isolation</span>
        <span className={styles.dashboardValue} data-status={errorIsolated ? "good" : undefined}>
          {errorIsolated ? "Active" : "Standby"}
        </span>
      </div>
    </div>
  );
}

// ── Log Console ──────────────────────────────────────────────────────

export function LogConsole({
  logs,
  noMotion = false,
}: {
  logs: string[];
  noMotion?: boolean;
}) {
  return (
    <div className={styles.eventLog} role="log" aria-label="Scenario log" aria-live="polite">
      {logs.map((entry, i) => {
        const isDeploy = entry.startsWith("Deploy") || entry.startsWith("Team B");
        const isEvent = entry.startsWith("Event");
        const entryType = isDeploy ? "DEPLOY" : isEvent ? "EVENT" : "STATUS";

        if (noMotion) {
          return (
            <div key={i} className={styles.eventLogEntry}>
              <span className={styles.eventLogType}>{entryType}</span>
              <span>{entry}</span>
            </div>
          );
        }

        return (
          <motion.div
            key={i}
            className={styles.eventLogEntry}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING.quick, delay: i * 0.1 }}
          >
            <span className={styles.eventLogType}>{entryType}</span>
            <span>{entry}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

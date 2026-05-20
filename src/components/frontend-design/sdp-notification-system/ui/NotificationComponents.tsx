"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { ToastEntry, Priority } from "../engine/toast-scheduler";
import styles from "../NotificationLab.module.css";

// ── Toast Countdown Bar ──────────────────────────────────────────
export function ToastCountdownBar({
  toast,
  noMotion,
}: {
  toast: ToastEntry;
  noMotion: boolean;
}) {
  const totalDuration = toast.expiresAt - toast.createdAt;
  const durationSec = Math.max(totalDuration / 1000, 0.5);

  if (noMotion) return null;

  return (
    <div className={styles.toastCountdown} aria-hidden="true">
      <motion.div
        className={styles.toastCountdownInner}
        data-priority={toast.priority}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: durationSec, ease: "linear" }}
      />
    </div>
  );
}

// ── Toast Item ───────────────────────────────────────────────────
export function ToastItem({
  toast,
  noMotion,
  position = "top-right",
  strategy = "slide",
  onDismiss,
}: {
  toast: ToastEntry;
  noMotion: boolean;
  position?: string;
  strategy?: "slide" | "fade" | "scale";
  onDismiss: (id: string) => void;
}) {
  const PRIORITY_ICON: Record<Priority, string> = {
    info: "i",
    warning: "!",
    error: "!!",
    critical: "!!!",
  };

  const animVariants = {
    slide: {
      initial: {
        opacity: 0,
        x: position.includes("right") ? 20 : 0,
        y: position.includes("center") ? -10 : 0,
      },
      exit: {
        opacity: 0,
        x: position.includes("right") ? 20 : 0,
        scale: 0.95,
      },
    },
    fade: {
      initial: { opacity: 0 },
      exit: { opacity: 0 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.5 },
      exit: { opacity: 0, scale: 0.5 },
    },
  };

  const v = animVariants[strategy];

  return (
    <motion.div
      key={toast.id}
      className={styles.toast}
      data-priority={toast.priority}
      role={toast.priority === "critical" ? "alert" : undefined}
      aria-live={toast.priority === "critical" ? undefined : "polite"}
      initial={noMotion ? false : v.initial}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={noMotion ? { opacity: 0 } : v.exit}
      transition={noMotion ? { duration: 0 } : SPRING.snappy}
      layout
    >
      <span className={styles.toastIcon}>{PRIORITY_ICON[toast.priority]}</span>
      <div className={styles.toastBody}>
        <div className={styles.toastTitle}>{toast.title}</div>
        <div className={styles.toastMessage}>{toast.message}</div>
        <ToastCountdownBar toast={toast} noMotion={noMotion} />
      </div>
      <button
        type="button"
        className={styles.toastDismiss}
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss: ${toast.title}`}
        tabIndex={0}
      >
        x
      </button>
    </motion.div>
  );
}

// ── Toaster Container ───────────────────────────────────────────
export function ToasterContainer({
  visibleToasts,
  noMotion,
  position = "top-right",
  strategy = "slide",
  onDismiss,
}: {
  visibleToasts: ToastEntry[];
  noMotion: boolean;
  position?: string;
  strategy?: "slide" | "fade" | "scale";
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className={styles.toastContainer}
      data-position={position}
      aria-label="Toast display area"
    >
      <AnimatePresence>
        {visibleToasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            noMotion={noMotion}
            position={position}
            strategy={strategy}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
      {visibleToasts.length === 0 && (
        <div className={styles.widgetNote}>No toasts yet. Fire one above.</div>
      )}
    </div>
  );
}

// ── Prediction Challenge ─────────────────────────────────────────
export function PredictionChallenge({
  question,
  options,
  correctIndex,
  explanation,
  selected,
  onAnswer,
  noMotion,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  selected: number | null;
  onAnswer: (index: number) => void;
  noMotion: boolean;
}) {
  const revealed = selected !== null;

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
            onClick={() => {
              if (!revealed) {
                onAnswer(i);
              }
            }}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div
            className={styles.predictionResult}
            data-correct={selected === correctIndex ? "true" : undefined}
            initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            {selected === correctIndex ? "✓ " : "✗ "}{explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step Bar ─────────────────────────────────────────────────────
export function StepBar({
  activeStep,
  stepCompleted,
  stepLabels,
  stepTitles,
}: {
  activeStep: number;
  stepCompleted: Record<number, boolean>;
  stepLabels: string[];
  stepTitles: string[];
}) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Build progress">
      {stepLabels.map((label, i) => {
        const step = i + 1;
        const completed = stepCompleted[step] || step < activeStep;
        return (
          <span
            key={i}
            role="listitem"
            className={styles.stepDot}
            data-active={step <= activeStep ? "true" : undefined}
            data-current={step === activeStep ? "true" : undefined}
            data-completed={completed ? "true" : undefined}
            aria-current={step === activeStep ? "step" : undefined}
            aria-label={`Step ${step}: ${stepTitles[i]}${completed ? " (complete)" : ""}`}
          >
            {completed && step < activeStep ? "✓" : label}
          </span>
        );
      })}
    </div>
  );
}

// ── Notification Metrics Bar ─────────────────────────────────────
export function NotificationMetricsBar({
  totalSent,
  visibleCount,
  pendingCount,
  totalDismissed,
  highPriorityCount,
}: {
  totalSent: number;
  visibleCount: number;
  pendingCount: number;
  totalDismissed: number;
  highPriorityCount: number;
}) {
  return (
    <div
      className={styles.metricsBar}
      role="status"
      aria-live="polite"
      aria-label="Notification metrics"
    >
      <div className={styles.metric}>
        <span className={styles.metricValue}>{totalSent}</span>
        <span className={styles.metricLabel}>Sent</span>
      </div>
      <div className={styles.metric}>
        <span
          className={styles.metricValue}
          data-status={visibleCount > 0 ? "warning" : undefined}
        >
          {visibleCount}
        </span>
        <span className={styles.metricLabel}>Visible</span>
      </div>
      <div className={styles.metric}>
        <span
          className={styles.metricValue}
          data-status={pendingCount > 0 ? "warning" : undefined}
        >
          {pendingCount}
        </span>
        <span className={styles.metricLabel}>Pending</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue}>{totalDismissed}</span>
        <span className={styles.metricLabel}>Dismissed</span>
      </div>
      <div className={styles.metric}>
        <span
          className={styles.metricValue}
          data-status={highPriorityCount > 0 ? "bad" : undefined}
        >
          {highPriorityCount}
        </span>
        <span className={styles.metricLabel}>High-Pri</span>
      </div>
    </div>
  );
}

"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import styles from "./ControlPanel.module.css";

type ControlPanelProps = {
  activeStep: number;
  metrics?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
};

export function ControlPanel({ activeStep, metrics, controls, children }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prevStepRef = useRef(activeStep);
  const rm = usePrefersReducedMotion();

  const hasControls = controls != null;
  const hasContent = hasControls || metrics != null;

  useEffect(() => {
    if (activeStep !== prevStepRef.current) {
      prevStepRef.current = activeStep;
      if (hasControls) setIsOpen(true);
    }
  }, [activeStep, hasControls]);

  const expandMotion = rm
    ? { initial: false as const, animate: { opacity: 1, height: "auto" }, exit: { opacity: 0, height: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" },
        exit: { opacity: 0, height: 0 },
        transition: SPRING.gentle,
      };

  return (
    <div className={styles.root}>
      {children}

      {hasContent && (
        <div className={styles.toolbar}>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div className={styles.expandable} {...expandMotion}>
                <div className={styles.expandableInner}>
                  {metrics && <div className={styles.panelMetrics}>{metrics}</div>}
                  {controls && <div className={styles.panelControls}>{controls}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className={styles.toolbarToggle}
            onClick={() => setIsOpen(o => !o)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse control panel" : "Expand control panel"}
          >
            <span className={styles.toolbarIcon} data-open={isOpen}>
              {hasControls ? <GearIcon /> : <ChartIcon />}
            </span>
            <span className={styles.toolbarLabel}>
              {hasControls ? `Step ${activeStep}` : "Metrics"}
            </span>
            <span className={styles.toolbarChevron} data-open={isOpen}>
              <ChevronIcon />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

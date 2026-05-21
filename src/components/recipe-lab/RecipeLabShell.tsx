"use client";

import { useMemo, useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";
import styles from "./recipe-lab.module.css";

// ── Types ──────────────────────────────────────────────────────────

type StepMeta = {
  id: string;
  stepNumber: number;
};

type RecipeLabShellProps = {
  steps: StepMeta[];
  /** The MDX document content — rendered server-side, passed as children */
  children: ReactNode;
  /** Render function for the interactive demo panel */
  renderDemo: (activeStep: number) => ReactNode;
};

// ── Component ──────────────────────────────────────────────────────

const MIN_COL_PCT = 25;
const MAX_COL_PCT = 75;

export function RecipeLabShell({
  steps,
  children,
  renderDemo,
}: RecipeLabShellProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const activeId = useActiveSection(stepIds, scrollContainerRef);
  const activeStep = steps.find((s) => s.id === activeId)?.stepNumber ?? 1;

  const [leftPct, setLeftPct] = useState(50);
  const dragging = useRef(false);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(MIN_COL_PCT, Math.min(MAX_COL_PCT, Math.round(pct))));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div
      ref={gridRef}
      className={styles.labGrid}
      style={{ gridTemplateColumns: `${leftPct}% 0px ${100 - leftPct}%` }}
    >
      <div
        ref={scrollContainerRef}
        className={styles.proseColumn}
      >
        <div className={`max-w-2xl mx-auto px-6 py-8 lg:px-10 lg:py-12 ${styles.prose}`}
          style={{ paddingBottom: "45vh" }}
        >
          {children}
        </div>
        <div aria-hidden className="shrink-0 hidden lg:block" style={{ height: "50vh" }} />
      </div>

      <div
        className={styles.colDivider}
        onPointerDown={onDragStart}
        aria-hidden="true"
      >
        <span className={styles.colDividerGrip}>⁞</span>
      </div>

      <div className={styles.demoDesktop}>
        {renderDemo(activeStep)}
      </div>
    </div>
  );
}

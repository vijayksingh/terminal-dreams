"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { FLOW_SCENARIOS, FLOW_ACTIONS, PATTERNS } from "./pattern-data";
import type { FlowStep } from "./pattern-data";

const INSIGHTS: Record<string, Record<string, string>> = {
  like: {
    mvc: "MVC routes everything through the Controller — but the View also observes the Model directly (step 4). That observer coupling is why MVC views are harder to test.",
    mvvm: "MVVM updates the UI before the API responds (step 3 vs step 4). This optimistic update makes the app feel instant. But if the API fails, you need rollback logic in the ViewModel.",
    clean: "Clean Architecture adds two extra layers (Adapters, Entities) compared to MVC. Each layer is a test boundary — you can verify business rules without touching the UI or database. The trade-off: 6 steps instead of 5.",
  },
  search: {
    mvc: "In MVC, the Controller handles debouncing — a UI concern — because there's nowhere else for it to go. This is one way controllers accumulate non-business responsibilities.",
    mvvm: "Notice how the View and ViewModel handle the entire search flow reactively. The v-for in step 5 re-renders automatically when searchResults changes. No manual DOM update needed.",
    clean: "The Use Cases layer applies business filters (step 4) that the UI layer shouldn't know about — like regional availability. This separation means business rules are testable without rendering a component.",
  },
};

type Props = {
  patterns?: string[];
};

export function DependencyFlow({ patterns: allowedPatterns }: Props) {
  const patternIds = allowedPatterns ?? ["mvc", "mvvm", "clean"];
  const [activePatternId, setActivePatternId] = useState(patternIds[0]);
  const [activeActionId, setActiveActionId] = useState("like");
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = useMemo(
    () =>
      FLOW_SCENARIOS.find(
        (s) => s.patternId === activePatternId && s.actionId === activeActionId,
      ),
    [activePatternId, activeActionId],
  );

  const steps = scenario?.steps ?? [];

  const play = useCallback(() => {
    setActiveStep(-1);
    setShowInsight(false);
    setIsPlaying(true);
  }, []);

  const reset = useCallback(() => {
    setActiveStep(-1);
    setIsPlaying(false);
    setShowInsight(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const stepForward = useCallback(() => {
    if (activeStep < steps.length - 1) {
      setActiveStep((s) => s + 1);
      setShowInsight(false);
    } else {
      setShowInsight(true);
    }
  }, [activeStep, steps.length]);

  const stepBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep((s) => s - 1);
      setShowInsight(false);
    }
  }, [activeStep]);

  useEffect(() => {
    if (!isPlaying) return;

    if (activeStep < steps.length - 1) {
      timerRef.current = setTimeout(
        () => setActiveStep((s) => s + 1),
        activeStep === -1 ? 300 : 800,
      );
    } else {
      setIsPlaying(false);
      setShowInsight(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, activeStep, steps.length]);

  useEffect(() => {
    reset();
  }, [activePatternId, activeActionId, reset]);

  const availableActions = FLOW_ACTIONS.filter((a) =>
    FLOW_SCENARIOS.some(
      (s) => s.patternId === activePatternId && s.actionId === a.id,
    ),
  );

  const insight = INSIGHTS[activeActionId]?.[activePatternId];

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent)",
              background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
              border: "1px solid var(--color-accent)",
              fontSize: 10,
            }}
          >
            Flow
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
          >
            Trace a user action through the layers
          </span>
        </div>
      </div>

      {/* Controls */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
            Pattern:
          </span>
          <div className="flex gap-1">
            {patternIds.map((pid) => {
              const p = PATTERNS[pid];
              if (!p) return null;
              const active = pid === activePatternId;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setActivePatternId(pid)}
                  className="cursor-pointer rounded px-2.5 py-1 text-xs"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: active ? "var(--color-bg)" : "var(--color-text)",
                    background: active ? "var(--color-accent)" : "var(--color-bg)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
            Action:
          </span>
          <div className="flex gap-1">
            {availableActions.map((a) => {
              const active = a.id === activeActionId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveActionId(a.id)}
                  className="cursor-pointer rounded px-2.5 py-1 text-xs"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: active ? "var(--color-bg)" : "var(--color-text)",
                    background: active ? "var(--color-accent)" : "var(--color-bg)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {a.icon} {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step controls */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <button
          type="button"
          onClick={isPlaying ? reset : play}
          className="cursor-pointer rounded px-3 py-1.5 text-xs font-semibold"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-bg)",
            background: isPlaying ? "#e06c75" : "var(--color-accent)",
            border: "none",
            transition: "background 0.2s",
          }}
        >
          {isPlaying ? "Stop" : activeStep >= 0 ? "Replay" : "Auto ▶"}
        </button>

        {!isPlaying && (
          <>
            <button
              type="button"
              onClick={stepBack}
              disabled={activeStep <= 0}
              className="cursor-pointer rounded px-2 py-1.5 text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                color: activeStep > 0 ? "var(--color-text)" : "var(--color-muted)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                opacity: activeStep > 0 ? 1 : 0.4,
              }}
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={stepForward}
              disabled={activeStep >= steps.length - 1 && showInsight}
              className="cursor-pointer rounded px-2 py-1.5 text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                color: activeStep < steps.length - 1 || !showInsight ? "var(--color-text)" : "var(--color-muted)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                opacity: activeStep < steps.length - 1 || !showInsight ? 1 : 0.4,
              }}
            >
              Next →
            </button>
          </>
        )}

        <span
          className="ml-auto text-xs"
          style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
        >
          {activeStep >= 0
            ? `Step ${activeStep + 1} / ${steps.length}`
            : "Click Next → or Auto ▶ to start"}
        </span>
      </div>

      {/* Flow steps — always visible, highlighted when active */}
      <div className="px-4 py-3">
        {!scenario ? (
          <div
            className="py-4 text-center text-xs"
            style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
          >
            No flow data for this combination
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {steps.map((step, i) => (
              <FlowStepRow
                key={`${activePatternId}-${activeActionId}-${i}`}
                step={step}
                index={i}
                active={i <= activeStep}
                current={i === activeStep}
                total={steps.length}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
        )}
      </div>

      {/* Insight callout */}
      {showInsight && insight && (
        <div
          className="px-4 pb-3"
        >
          {reducedMotion ? (
            <InsightBox insight={insight} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={TRANSITION.enterCard}
            >
              <InsightBox insight={insight} />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightBox({ insight }: { insight: string }) {
  return (
    <div
      className="rounded px-3 py-2.5"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
        border: "1px solid var(--color-accent)",
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-accent)",
          fontSize: 9,
          letterSpacing: "0.05em",
        }}
      >
        What to notice:{" "}
      </span>
      <span
        className="text-xs leading-relaxed"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-text)",
          fontSize: 11,
        }}
      >
        {insight}
      </span>
    </div>
  );
}

function FlowStepRow({
  step,
  index,
  active,
  current,
  total,
  reducedMotion,
}: {
  step: FlowStep;
  index: number;
  active: boolean;
  current: boolean;
  total: number;
  reducedMotion: boolean;
}) {
  const dimmed = !active;

  return (
    <div
      className="flex items-start gap-3 rounded px-3 py-2.5"
      style={{
        background: current
          ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
          : active
            ? "var(--color-bg)"
            : "transparent",
        border: `1px solid ${current ? "var(--color-accent)" : active ? "var(--color-border)" : "transparent"}`,
        opacity: dimmed ? 0.35 : 1,
        transition: "all 0.25s",
      }}
    >
      {/* Step number */}
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 700,
          color: current ? "var(--color-bg)" : "var(--color-muted)",
          background: current ? "var(--color-accent)" : "var(--color-surface-2)",
          border: `1px solid ${current ? "var(--color-accent)" : "var(--color-border)"}`,
          transition: "all 0.25s",
        }}
      >
        {index + 1}
      </span>

      {/* Layer badge */}
      <span
        className="inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: current ? "var(--color-accent)" : "var(--color-muted)",
          background: current ? "color-mix(in srgb, var(--color-accent) 15%, transparent)" : "var(--color-surface-2)",
          border: `1px solid ${current ? "var(--color-accent)" : "var(--color-border)"}`,
          minWidth: 70,
          justifyContent: "center",
          transition: "all 0.25s",
        }}
      >
        {step.layerId}
      </span>

      {/* Content */}
      <div className="flex-1">
        <div
          className="text-xs font-semibold"
          style={{
            fontFamily: "var(--font-mono)",
            color: current ? "var(--color-accent)" : active ? "var(--color-text)" : "var(--color-muted)",
            fontSize: 11,
            transition: "color 0.25s",
          }}
        >
          {step.action}
        </div>
        {(active || current) && (
          <div
            className="text-xs leading-relaxed"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-muted)",
              fontSize: 10,
            }}
          >
            {step.detail}
          </div>
        )}
      </div>

      {/* Timing */}
      <span
        className="shrink-0 text-xs tabular-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--color-muted)",
        }}
      >
        {step.timing}
      </span>
    </div>
  );
}

export default DependencyFlow;

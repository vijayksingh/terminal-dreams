"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import {
  useCodeTokens,
  renderTokens,
} from "../code-primitive-1/use-shiki-tokens";
import { StateInspector, type StateEntry } from "../StateInspector";

// ── Feature system ─────────────────────────────────────────────────

type Feature =
  | "clickable"
  | "variable-height"
  | "keyboard"
  | "decorations"
  | "variant";

const FEATURES: { id: Feature; label: string; step: number }[] = [
  { id: "clickable", label: "Line Actions", step: 1 },
  { id: "variable-height", label: "Variable Heights", step: 2 },
  { id: "keyboard", label: "Keyboard Nav", step: 3 },
  { id: "decorations", label: "Decorations", step: 4 },
  { id: "variant", label: "Panel Variant", step: 5 },
];

const STEP_FEATURES: Record<number, Feature[]> = {
  1: ["clickable"],
  2: ["clickable", "variable-height"],
  3: ["clickable", "variable-height", "keyboard"],
  4: ["clickable", "variable-height", "keyboard", "decorations"],
  5: ["clickable", "variable-height", "keyboard", "decorations", "variant"],
  6: ["clickable", "variable-height", "keyboard", "decorations", "variant"],
};

// ── Demo code snippet ──────────────────────────────────────────────

const DEMO_CODE = `function mergeIntervals(intervals: number[][]) {
  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [intervals[0]];

  for (const [start, end] of intervals.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      // Overlapping — extend the current interval
      last[1] = Math.max(last[1], end);
    } else {
      // No overlap — push as new interval
      merged.push([start, end]);
    }
  }
  return merged;
}`;

const LINE_H = 22;
const INTERACTIVE_LINE_H = 44;
const PAD_Y = 8;
const TRACK_HEX = "#7c3aed";

// Lines that are interactive (simulate the GatedCodeBridge use case)
const INTERACTIVE_LINES = new Set([1, 5, 7, 10]);

const LINE_LABELS: Record<number, string> = {
  1: "Sort phase",
  5: "Iteration",
  7: "Merge branch",
  10: "New interval branch",
};

// Line rules for decorations
type LineRule = {
  test: string | ((line: string) => boolean);
  style?: React.CSSProperties;
  tokenColor?: string;
};

const DECORATION_RULES: LineRule[] = [
  {
    test: (line: string) => line.trimStart().startsWith("//"),
    style: { background: "var(--color-surface-2)", borderRadius: "4px" },
  },
  {
    test: (line: string) => line.trim() === "",
    style: { opacity: 0.3 },
  },
];

// ── Main component ─────────────────────────────────────────────────

type ClickableCodeLabProps = {
  activeStep: number;
};

export function ClickableCodeLab({ activeStep }: ClickableCodeLabProps) {
  const [enabled, setEnabled] = useState<Set<Feature>>(new Set());
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [clickLog, setClickLog] = useState<string[]>([]);
  const [userOverride, setUserOverride] = useState(false);
  const [variantMode, setVariantMode] = useState<"default" | "panel">(
    "default",
  );

  const lines = useMemo(() => DEMO_CODE.split("\n"), []);
  const tokens = useCodeTokens(DEMO_CODE, "typescript");

  const hasClickable = enabled.has("clickable");
  const hasVariableHeight = enabled.has("variable-height");
  const hasKeyboard = enabled.has("keyboard");
  const hasDecorations = enabled.has("decorations");
  const hasVariant = enabled.has("variant");

  const variant = hasVariant ? variantMode : "default";

  useEffect(() => {
    if (!userOverride) {
      setEnabled(new Set(STEP_FEATURES[activeStep] ?? []));
    }
  }, [activeStep, userOverride]);

  useEffect(() => {
    setUserOverride(false);
  }, [activeStep]);

  const toggle = useCallback((id: Feature) => {
    setUserOverride(true);
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLineClick = useCallback(
    (lineIdx: number) => {
      if (hasClickable && INTERACTIVE_LINES.has(lineIdx)) {
        setActiveLine(lineIdx);
        setClickLog((prev) =>
          [...prev, `Line ${lineIdx + 1}: ${LINE_LABELS[lineIdx] ?? "clicked"}`].slice(-4),
        );
      }
    },
    [hasClickable],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, lineIdx: number) => {
      if (!hasKeyboard) return;
      if (!INTERACTIVE_LINES.has(lineIdx)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleLineClick(lineIdx);
      }
    },
    [hasKeyboard, handleLineClick],
  );

  // ── Derived layout ─────────────────────────────────────────────

  const lineHeights = useMemo(
    () =>
      lines.map((_, i) =>
        hasClickable && hasVariableHeight && INTERACTIVE_LINES.has(i)
          ? INTERACTIVE_LINE_H
          : LINE_H,
      ),
    [lines, hasClickable, hasVariableHeight],
  );

  const lineTops = useMemo(() => {
    const tops: number[] = [];
    let y = 0;
    for (const h of lineHeights) {
      tops.push(y);
      y += h;
    }
    return tops;
  }, [lineHeights]);

  const barTop = activeLine !== null ? lineTops[activeLine] ?? 0 : 0;
  const barHeight =
    activeLine !== null ? lineHeights[activeLine] ?? LINE_H : LINE_H;

  // ── Decoration matching ────────────────────────────────────────

  const getDecoration = useCallback(
    (line: string): { style?: React.CSSProperties; tokenColor?: string } | null => {
      if (!hasDecorations) return null;
      for (const rule of DECORATION_RULES) {
        const matches =
          typeof rule.test === "function"
            ? rule.test(line)
            : line.includes(rule.test);
        if (matches) return { style: rule.style, tokenColor: rule.tokenColor };
      }
      return null;
    },
    [hasDecorations],
  );

  // ── State inspector ────────────────────────────────────────────

  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [];

    if (hasClickable) {
      entries.push({
        label: "activeLine",
        value: activeLine,
        highlight: activeLine !== null,
      });
      entries.push({
        label: "interactiveLines",
        value: [...INTERACTIVE_LINES],
      });
    }

    if (hasVariableHeight) {
      const heights = `[${lineHeights.slice(0, 4).join(", ")}, ...]`;
      entries.push({
        label: "lineHeights",
        value: heights,
        highlight: lineHeights.some((h) => h !== LINE_H),
      });
      entries.push({
        label: "barHeight",
        value: `${barHeight}px`,
        highlight: barHeight !== LINE_H,
      });
    }

    if (hasKeyboard) {
      entries.push({
        label: "tabIndex",
        value: "0 on interactive",
      });
      entries.push({
        label: 'role',
        value: '"button"',
      });
    }

    if (hasDecorations && clickLog.length > 0) {
      entries.push({
        label: "clickLog",
        value: clickLog,
      });
    }

    if (hasVariant) {
      entries.push({
        label: "variant",
        value: variant,
        highlight: variant === "panel",
      });
    }

    return entries;
  }, [
    hasClickable,
    activeLine,
    hasVariableHeight,
    lineHeights,
    barHeight,
    hasKeyboard,
    hasDecorations,
    clickLog,
    hasVariant,
    variant,
  ]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Feature Toggles */}
      <div
        className="shrink-0 px-4 py-3 flex flex-wrap gap-2"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-wider self-center mr-1"
          style={{ color: "var(--color-muted)" }}
        >
          Features
        </span>
        {FEATURES.map((f) => {
          const isOn = enabled.has(f.id);
          const isStepFeature = (STEP_FEATURES[activeStep] ?? []).includes(
            f.id,
          );
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              className="px-2.5 py-1 text-xs font-mono rounded transition-all"
              style={{
                background: isOn ? "var(--color-surface-2)" : "transparent",
                color: isOn ? "var(--color-text)" : "var(--color-muted)",
                border: `1px solid ${isOn ? "var(--color-border)" : "transparent"}`,
                outline:
                  isStepFeature && !userOverride
                    ? "1px solid var(--color-accent)"
                    : "none",
                outlineOffset: "1px",
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{
                  background: isOn
                    ? "var(--color-accent)"
                    : "var(--color-muted)",
                  opacity: isOn ? 1 : 0.3,
                }}
              />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
        {/* Variant toggle */}
        {hasVariant && (
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: "var(--color-muted)" }}
            >
              Variant
            </span>
            {(["default", "panel"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVariantMode(v)}
                className="px-2.5 py-1 text-xs font-mono rounded transition-all"
                style={{
                  background:
                    variantMode === v
                      ? "var(--color-surface-2)"
                      : "transparent",
                  color:
                    variantMode === v
                      ? "var(--color-text)"
                      : "var(--color-muted)",
                  border: `1px solid ${variantMode === v ? "var(--color-border)" : "transparent"}`,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* Code viewer */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background:
              variant === "panel"
                ? "var(--color-surface-2)"
                : "var(--color-surface)",
            border: `1px solid var(--color-border)`,
            boxShadow:
              variant === "default"
                ? "0 0 0 1px var(--color-surface-2)"
                : "none",
          }}
        >
          {/* Floating highlight bar */}
          <AnimatePresence>
            {activeLine !== null && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  borderLeft: `2px solid ${TRACK_HEX}`,
                  backgroundColor: `${TRACK_HEX}12`,
                  top: PAD_Y,
                }}
                initial={{ y: barTop, opacity: 0, height: barHeight }}
                animate={{ y: barTop, opacity: 1, height: barHeight }}
                exit={{ opacity: 0 }}
                transition={SPRING.snappy}
              />
            )}
          </AnimatePresence>

          {/* Code lines */}
          <div
            className="relative z-10 overflow-x-auto"
            style={{ padding: `${PAD_Y}px 0` }}
          >
            {lines.map((line, i) => {
              const isActive = activeLine === i;
              const isDimmed = activeLine !== null && !isActive;
              const isInteractive =
                hasClickable && INTERACTIVE_LINES.has(i);
              const lineHeight = lineHeights[i];
              const decoration = getDecoration(line);

              return (
                <div key={i}>
                  <div
                    className={`flex items-center ${
                      isInteractive ? "rounded-sm" : ""
                    } ${
                      isInteractive ? "cursor-pointer" : ""
                    }`}
                    style={{
                      height: lineHeight,
                      opacity: isDimmed ? 0.35 : 1,
                      transition: "opacity 300ms ease",
                      ...(isInteractive
                        ? {
                            borderRight: `3px solid ${isActive ? TRACK_HEX : "transparent"}`,
                          }
                        : {}),
                      ...decoration?.style,
                    }}
                    onClick={
                      isInteractive ? () => handleLineClick(i) : undefined
                    }
                    onKeyDown={
                      isInteractive && hasKeyboard
                        ? (e) => handleKeyDown(e, i)
                        : undefined
                    }
                    role={isInteractive ? "button" : undefined}
                    aria-label={
                      isInteractive
                        ? `Select line ${i + 1}: ${LINE_LABELS[i] ?? ""}`
                        : undefined
                    }
                    tabIndex={
                      isInteractive && hasKeyboard ? 0 : undefined
                    }
                  >
                    {/* Line number */}
                    <span
                      className="w-8 shrink-0 text-right pr-2 text-[10px] font-mono select-none tabular-nums"
                      style={{
                        color: isActive ? TRACK_HEX : "var(--color-muted)",
                        transition: "color 300ms ease",
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* Code content */}
                    <pre
                      className={`flex-1 whitespace-pre font-mono pr-2 leading-relaxed ${
                        variant === "panel" ? "text-xs" : "text-[11px]"
                      }`}
                    >
                      {tokens ? (
                        renderTokens(tokens[i], decoration?.tokenColor)
                      ) : (
                        <span style={{ color: "var(--color-text)" }}>
                          {line}
                        </span>
                      )}
                    </pre>

                    {/* Interactive badge */}
                    {isInteractive && (
                      <span
                        className="shrink-0 mr-2 px-1.5 py-0.5 text-[9px] font-mono uppercase rounded"
                        style={{
                          background: isActive
                            ? TRACK_HEX
                            : "var(--color-surface-2)",
                          color: isActive
                            ? "var(--color-bg)"
                            : "var(--color-muted)",
                          transition: "all 200ms ease",
                        }}
                      >
                        {LINE_LABELS[i]}
                      </span>
                    )}
                  </div>

                  {/* Annotation for active interactive line */}
                  <AnimatePresence>
                    {isActive && isInteractive && (
                      <motion.div
                        className="overflow-hidden pl-8"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING.snappy}
                      >
                        <div
                          className="py-1.5 text-xs font-mono"
                          style={{ color: TRACK_HEX }}
                        >
                          └─ Click to explore this section
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Click log */}
        {clickLog.length > 0 && (
          <div
            className="font-mono text-xs"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-1)",
            }}
          >
            <div
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider"
              style={{
                color: "var(--color-muted)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              Click Log
            </div>
            <div className="px-3 py-2 flex flex-col gap-1">
              {clickLog.map((entry, i) => (
                <motion.div
                  key={`${entry}-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={TRANSITION.enterItem}
                  style={{ color: "var(--color-text)" }}
                >
                  <span style={{ color: "var(--color-muted)" }}>{i + 1}.</span>{" "}
                  {entry}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <StateInspector entries={stateEntries} title="CodeTrace" />
      </div>
    </div>
  );
}

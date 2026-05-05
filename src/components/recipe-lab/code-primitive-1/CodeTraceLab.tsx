"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { useCodeTokens, renderTokens } from "./use-shiki-tokens";
import { StateInspector, type StateEntry } from "../StateInspector";

// ── Feature system ─────────────────────────────────────────────────

type Feature = "syntax" | "active-line" | "highlight-bar" | "track-color" | "annotation";

const FEATURES: { id: Feature; label: string; step: number }[] = [
  { id: "syntax", label: "Syntax Highlighting", step: 2 },
  { id: "active-line", label: "Active Line", step: 3 },
  { id: "highlight-bar", label: "Highlight Bar", step: 4 },
  { id: "track-color", label: "Track Color", step: 5 },
  { id: "annotation", label: "Annotation Slot", step: 6 },
];

const STEP_FEATURES: Record<number, Feature[]> = {
  1: [],
  2: ["syntax"],
  3: ["syntax", "active-line"],
  4: ["syntax", "active-line", "highlight-bar"],
  5: ["syntax", "active-line", "highlight-bar", "track-color"],
  6: ["syntax", "active-line", "highlight-bar", "track-color", "annotation"],
};

// ── Demo code snippet ──────────────────────────────────────────────

const DEMO_CODE = `function bfs(graph: Map<string, string[]>, start: string) {
  const visited = new Set<string>();
  const queue: string[] = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);

    for (const neighbor of graph.get(node) ?? []) {
      queue.push(neighbor);
    }
  }
  return visited;
}`;

const LINE_H = 22;
const PAD_Y = 8;

const TRACK_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b"];

const ANNOTATIONS: Record<number, string> = {
  1: "Start node enters the queue",
  4: "Process nodes in FIFO order",
  5: "Dequeue the front node",
  6: "Skip if already visited",
  7: "Mark as visited",
  9: "Enqueue all unvisited neighbors",
};

// ── Main component ─────────────────────────────────────────────────

type CodeTraceLabProps = {
  activeStep: number;
};

export function CodeTraceLab({ activeStep }: CodeTraceLabProps) {
  const [enabled, setEnabled] = useState<Set<Feature>>(new Set());
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [trackColorIdx, setTrackColorIdx] = useState(0);
  const [userOverride, setUserOverride] = useState(false);

  const lines = useMemo(() => DEMO_CODE.split("\n"), []);
  const tokens = useCodeTokens(DEMO_CODE, "typescript");

  const hasSyntax = enabled.has("syntax");
  const hasActiveLine = enabled.has("active-line");
  const hasBar = enabled.has("highlight-bar");
  const hasTrackColor = enabled.has("track-color");
  const hasAnnotation = enabled.has("annotation");

  const trackHex = hasTrackColor
    ? TRACK_COLORS[trackColorIdx % TRACK_COLORS.length]
    : "#7c3aed";

  useEffect(() => {
    if (!userOverride) {
      setEnabled(new Set(STEP_FEATURES[activeStep] ?? []));
    }
  }, [activeStep, userOverride]);

  useEffect(() => {
    setUserOverride(false);
  }, [activeStep]);

  // Set a default active line when "active-line" feature turns on
  useEffect(() => {
    if (hasActiveLine && activeLine === null) {
      setActiveLine(4);
    }
    if (!hasActiveLine) {
      setActiveLine(null);
    }
  }, [hasActiveLine, activeLine]);

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
      if (!hasActiveLine) return;
      setActiveLine(lineIdx);
    },
    [hasActiveLine],
  );

  const cycleTrackColor = useCallback(() => {
    setTrackColorIdx((i) => i + 1);
  }, []);

  // ── Derived layout ───────────────────────────────────────────────

  const lineTops = useMemo(() => {
    const tops: number[] = [];
    let y = 0;
    for (let i = 0; i < lines.length; i++) {
      tops.push(y);
      y += LINE_H;
    }
    return tops;
  }, [lines.length]);

  const barTop = activeLine !== null ? lineTops[activeLine] ?? 0 : 0;
  const annotation =
    hasAnnotation && activeLine !== null ? ANNOTATIONS[activeLine] : null;

  // ── State inspector ──────────────────────────────────────────────

  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [];

    entries.push({ label: "lineCount", value: lines.length });

    if (hasActiveLine) {
      entries.push({
        label: "activeLine",
        value: activeLine,
        highlight: activeLine !== null,
      });
    }

    if (hasBar && activeLine !== null) {
      entries.push({
        label: "barTop",
        value: `${barTop}px`,
        highlight: true,
      });
    }

    if (hasTrackColor) {
      entries.push({
        label: "trackHex",
        value: trackHex,
        highlight: true,
      });
    }

    if (hasAnnotation && activeLine !== null) {
      entries.push({
        label: "annotation",
        value: annotation ?? "—",
        highlight: annotation !== null,
      });
    }

    return entries;
  }, [
    lines.length,
    hasActiveLine,
    activeLine,
    hasBar,
    barTop,
    hasTrackColor,
    trackHex,
    hasAnnotation,
    annotation,
  ]);

  // ── Render ───────────────────────────────────────────────────────

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

      {/* Scrollable content: code viewer + state inspector */}
      <div className="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
        {/* Track color picker */}
        {hasTrackColor && (
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: "var(--color-muted)" }}
            >
              Track
            </span>
            {TRACK_COLORS.map((hex, i) => (
              <button
                key={hex}
                onClick={() => setTrackColorIdx(i)}
                className="w-5 h-5 rounded-full transition-all"
                style={{
                  background: hex,
                  outline:
                    trackColorIdx % TRACK_COLORS.length === i
                      ? `2px solid ${hex}`
                      : "2px solid transparent",
                  outlineOffset: "2px",
                  opacity:
                    trackColorIdx % TRACK_COLORS.length === i ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        )}

        {/* Code viewer */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Floating highlight bar */}
          <AnimatePresence>
            {hasBar && activeLine !== null && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  borderLeft: `2px solid ${trackHex}`,
                  backgroundColor: `${trackHex}12`,
                  top: PAD_Y,
                  height: LINE_H,
                }}
                initial={{ y: barTop, opacity: 0 }}
                animate={{ y: barTop, opacity: 1 }}
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
              const isDimmed = hasActiveLine && activeLine !== null && !isActive;

              return (
                <div key={i}>
                  <div
                    className={`flex items-center ${hasActiveLine ? "cursor-pointer" : ""}`}
                    style={{
                      height: LINE_H,
                      opacity: isDimmed ? 0.55 : 1,
                      background: isActive && hasActiveLine ? "var(--color-surface-2)" : undefined,
                      transition: "opacity 300ms ease, background 300ms ease",
                    }}
                    onClick={() => handleLineClick(i)}
                  >
                    {/* Line number */}
                    <span
                      className="w-6 shrink-0 text-right pr-1.5 text-[9px] font-mono select-none tabular-nums"
                      style={{
                        color:
                          isActive && hasTrackColor
                            ? trackHex
                            : "var(--color-muted)",
                        transition: "color 300ms ease",
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* Code content */}
                    <pre className="flex-1 whitespace-pre font-mono text-xs pr-2">
                      {hasSyntax && tokens ? (
                        renderTokens(tokens[i])
                      ) : (
                        <span style={{ color: "var(--color-text)" }}>
                          {line}
                        </span>
                      )}
                    </pre>
                  </div>

                  {/* Annotation slot */}
                  <AnimatePresence>
                    {isActive && annotation && (
                      <motion.div
                        className="overflow-hidden pl-8"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING.snappy}
                      >
                        <div
                          className="py-1.5 text-xs font-mono"
                          style={{ color: trackHex }}
                        >
                          └─ {annotation}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <StateInspector entries={stateEntries} title="CodeTrace" />
      </div>
    </div>
  );
}

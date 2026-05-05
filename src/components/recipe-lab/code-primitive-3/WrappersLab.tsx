"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import {
  useCodeTokens,
  renderTokens,
} from "../code-primitive-1/use-shiki-tokens";
import { StateInspector, type StateEntry } from "../StateInspector";

// ── Feature system ─────────────────────────────────────────────────

type Feature =
  | "live-code"
  | "step-sync"
  | "code-delay"
  | "gated"
  | "fill"
  | "pattern-compare";

const FEATURES: { id: Feature; label: string; step: number }[] = [
  { id: "live-code", label: "LiveCodePanel", step: 1 },
  { id: "step-sync", label: "Step Sync", step: 2 },
  { id: "code-delay", label: "Code Delay", step: 3 },
  { id: "gated", label: "GatedCodeBridge", step: 4 },
  { id: "fill", label: "CodeFill", step: 5 },
  { id: "pattern-compare", label: "Pattern Matrix", step: 6 },
];

const STEP_FEATURES: Record<number, Feature[]> = {
  1: ["live-code"],
  2: ["live-code", "step-sync"],
  3: ["live-code", "step-sync", "code-delay"],
  4: ["gated"],
  5: ["fill"],
  6: ["pattern-compare"],
};

// ── Shared demo code ───────────────────────────────────────────────

const BFS_CODE = `function bfs(graph, start) {
  const visited = new Set();
  const queue = [start];

  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);

    for (const n of graph.get(node) ?? []) {
      queue.push(n);
    }
  }
  return visited;
}`;

const LINE_H = 22;
const PAD_Y = 8;
const TRACK_HEX = "#7c3aed";

// Step → line mapping for LiveCodePanel
const LINE_MAP = [0, 1, 4, 5, 6, 7, 9, 10, 13];
const ANNOTATIONS = [
  "Define the function",
  "Initialize visited set",
  "Enter the loop",
  "Dequeue front node",
  "Skip visited nodes",
  "Mark as visited",
  "Iterate neighbors",
  "Enqueue neighbor",
  "Return result",
];

// Sections for GatedCodeBridge
const BRIDGE_SECTIONS = [
  { line: 1, label: "Init", narration: "Set up visited tracking and queue with start node" },
  { line: 4, label: "Loop", narration: "Process nodes until the queue empties" },
  { line: 6, label: "Visit", narration: "Guard against revisiting — skip if already seen" },
  { line: 9, label: "Explore", narration: "Push all neighbors onto the queue" },
];

// Blanks for CodeFill
const FILL_BLANKS = [
  {
    id: "ds", label: "data structure", correctIdx: 1,
    options: ["Array", "Set", "Map", "Object"],
    explanations: [
      "Array works but .includes() is O(n) — Set gives O(1) lookup with .has().",
      null,
      "Map stores key-value pairs — we only need to track membership, not values.",
      "Object keys are coerced to strings — Set preserves the original types.",
    ],
  },
  {
    id: "op", label: "queue operation", correctIdx: 1,
    options: [".pop()", ".shift()", ".push()", ".unshift()"],
    explanations: [
      ".pop() removes the LAST element — that's a stack (LIFO), not a queue (FIFO).",
      null,
      ".push() ADDS to the end — we need to REMOVE from the front.",
      ".unshift() ADDS to the front — we need to REMOVE, not add.",
    ],
  },
  {
    id: "check", label: "visited check", correctIdx: 1,
    options: [".includes(node)", ".has(node)", ".get(node)", "[node]"],
    explanations: [
      ".includes() is an Array method — Set uses .has() instead.",
      null,
      ".get() is a Map method that returns a value — Set uses .has() for membership.",
      "Bracket notation accesses object properties — Set uses .has() method.",
    ],
  },
];

// ── Mini CodeTrace (shared renderer) ───────────────────────────────

function MiniCodeTrace({
  code,
  activeLine,
  trackHex,
  annotation,
  dimmed = false,
}: {
  code: string;
  activeLine: number | null;
  trackHex: string;
  annotation?: string | null;
  dimmed?: boolean;
}) {
  const lines = useMemo(() => code.split("\n"), [code]);
  const tokens = useCodeTokens(code, "typescript");

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

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        opacity: dimmed ? 0.4 : 1,
        transition: "opacity 400ms ease",
      }}
    >
      <AnimatePresence>
        {activeLine !== null && (
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
      <div className="relative z-10 overflow-x-auto" style={{ padding: `${PAD_Y}px 0` }}>
        {lines.map((line, i) => {
          const isActive = activeLine === i;
          const isDimActive = activeLine !== null && !isActive;
          return (
            <div key={i}>
              <div
                className="flex items-center"
                style={{
                  height: LINE_H,
                  opacity: isDimActive ? 0.35 : 1,
                  transition: "opacity 300ms ease",
                }}
              >
                <span
                  className="w-6 shrink-0 text-right pr-1.5 text-[9px] font-mono select-none tabular-nums"
                  style={{
                    color: isActive ? trackHex : "var(--color-muted)",
                  }}
                >
                  {i + 1}
                </span>
                <pre className="flex-1 whitespace-pre font-mono text-[10px] pr-2 leading-relaxed">
                  {tokens ? (
                    renderTokens(tokens[i])
                  ) : (
                    <span style={{ color: "var(--color-text)" }}>{line}</span>
                  )}
                </pre>
              </div>
              <AnimatePresence>
                {isActive && annotation && (
                  <motion.div
                    className="overflow-hidden pl-6"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING.snappy}
                  >
                    <div className="py-1 text-[10px] font-mono" style={{ color: trackHex }}>
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
  );
}

// ── Tab system ─────────────────────────────────────────────────────

type Tab = "live-code" | "gated" | "fill" | "compare";

function getActiveTab(features: Set<Feature>): Tab {
  if (features.has("pattern-compare")) return "compare";
  if (features.has("fill")) return "fill";
  if (features.has("gated")) return "gated";
  return "live-code";
}

// ── Main component ─────────────────────────────────────────────────

type WrappersLabProps = {
  activeStep: number;
};

export function WrappersLab({ activeStep }: WrappersLabProps) {
  const [enabled, setEnabled] = useState<Set<Feature>>(new Set());
  const [userOverride, setUserOverride] = useState(false);

  // LiveCodePanel state
  const [liveStep, setLiveStep] = useState(0);
  const [codeDelayVal, setCodeDelayVal] = useState(2);
  const [showDelayed, setShowDelayed] = useState(false);

  // GatedCodeBridge state
  const [bridgeLine, setBridgeLine] = useState<number | null>(null);
  const viewedRef = useRef<Set<number>>(new Set());
  const [viewedCount, setViewedCount] = useState(0);

  // CodeFill state
  const [fillAnswers, setFillAnswers] = useState<Record<string, number | null>>({
    ds: null, op: null, check: null,
  });
  const [fillSubmitted, setFillSubmitted] = useState(false);

  const activeTab = getActiveTab(enabled);

  useEffect(() => {
    if (!userOverride) {
      setEnabled(new Set(STEP_FEATURES[activeStep] ?? []));
    }
  }, [activeStep, userOverride]);

  useEffect(() => {
    setUserOverride(false);
  }, [activeStep]);

  // Code delay logic
  useEffect(() => {
    setShowDelayed(liveStep >= codeDelayVal);
  }, [liveStep, codeDelayVal]);

  const toggle = useCallback((id: Feature) => {
    setUserOverride(true);
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBridgeToggle = useCallback(
    (line: number) => {
      if (bridgeLine === line) {
        setBridgeLine(null);
      } else {
        setBridgeLine(line);
        if (!viewedRef.current.has(line)) {
          viewedRef.current.add(line);
          setViewedCount(viewedRef.current.size);
        }
      }
    },
    [bridgeLine],
  );

  const allViewed = viewedCount >= BRIDGE_SECTIONS.length;
  const activeSection = BRIDGE_SECTIONS.find((s) => s.line === bridgeLine);

  // ── State inspector entries ──────────────────────────────────────

  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [];

    if (activeTab === "live-code") {
      entries.push({ label: "step", value: liveStep, highlight: true });
      entries.push({
        label: "activeLine",
        value: LINE_MAP[Math.min(liveStep, LINE_MAP.length - 1)] ?? null,
      });
      entries.push({
        label: "annotation",
        value: ANNOTATIONS[liveStep] ?? "—",
      });
      if (enabled.has("code-delay")) {
        entries.push({
          label: "codeDelay",
          value: codeDelayVal,
        });
        entries.push({
          label: "visible",
          value: showDelayed,
          highlight: showDelayed,
        });
      }
    }

    if (activeTab === "gated") {
      entries.push({
        label: "bridgeLine",
        value: bridgeLine,
        highlight: bridgeLine !== null,
      });
      entries.push({
        label: "viewed",
        value: `${viewedCount}/${BRIDGE_SECTIONS.length}`,
        highlight: allViewed,
      });
      entries.push({
        label: "allViewed",
        value: allViewed,
        highlight: allViewed,
      });
    }

    if (activeTab === "fill") {
      for (const blank of FILL_BLANKS) {
        const answer = fillAnswers[blank.id];
        entries.push({
          label: blank.id,
          value: answer !== null ? blank.options[answer] : "—",
          highlight: answer === blank.correctIdx,
        });
      }
      if (fillSubmitted) {
        const correct = FILL_BLANKS.every((b) => fillAnswers[b.id] === b.correctIdx);
        entries.push({
          label: "result",
          value: correct ? "all correct" : "has errors",
          highlight: correct,
        });
      }
    }

    if (activeTab === "compare") {
      entries.push({ label: "pattern", value: "composition" });
      entries.push({ label: "wrappers", value: 3 });
    }

    return entries;
  }, [
    activeTab, liveStep, enabled, codeDelayVal, showDelayed,
    bridgeLine, viewedCount, allViewed,
    fillAnswers, fillSubmitted,
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
          Wrapper
        </span>
        {FEATURES.map((f) => {
          const isOn = enabled.has(f.id);
          const isStepFeature = (STEP_FEATURES[activeStep] ?? []).includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              className="px-2.5 py-1 text-xs font-mono rounded transition-all"
              style={{
                background: isOn ? "var(--color-surface-2)" : "transparent",
                color: isOn ? "var(--color-text)" : "var(--color-muted)",
                border: `1px solid ${isOn ? "var(--color-border)" : "transparent"}`,
                outline: isStepFeature && !userOverride ? "1px solid var(--color-accent)" : "none",
                outlineOffset: "1px",
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{
                  background: isOn ? "var(--color-accent)" : "var(--color-muted)",
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
        {/* ── LiveCodePanel demo ──────────────────────────── */}
        {activeTab === "live-code" && (
          <>
            {/* Step stepper */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                Step
              </span>
              <input
                type="range"
                min={0}
                max={LINE_MAP.length - 1}
                value={liveStep}
                onChange={(e) => setLiveStep(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: TRACK_HEX }}
              />
              <span className="text-xs font-mono tabular-nums w-6 text-right" style={{ color: "var(--color-text)" }}>
                {liveStep}
              </span>
            </div>

            {/* Code delay control */}
            {enabled.has("code-delay") && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                  codeDelay
                </span>
                {[0, 1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => setCodeDelayVal(d)}
                    className="px-2 py-0.5 text-xs font-mono rounded"
                    style={{
                      background: codeDelayVal === d ? "var(--color-surface-2)" : "transparent",
                      color: codeDelayVal === d ? "var(--color-text)" : "var(--color-muted)",
                      border: `1px solid ${codeDelayVal === d ? "var(--color-border)" : "transparent"}`,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {/* Panel label */}
            <div className="text-[9px] uppercase tracking-widest font-mono" style={{ color: "var(--color-muted)" }}>
              Code
            </div>

            <AnimatePresence>
              {showDelayed || !enabled.has("code-delay") ? (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={SPRING.gentle}
                >
                  <MiniCodeTrace
                    code={BFS_CODE}
                    activeLine={LINE_MAP[Math.min(liveStep, LINE_MAP.length - 1)] ?? null}
                    trackHex={TRACK_HEX}
                    annotation={enabled.has("step-sync") ? (ANNOTATIONS[liveStep] ?? null) : null}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono py-8 text-center"
                  style={{ color: "var(--color-muted)" }}
                >
                  Hidden until step ≥ {codeDelayVal}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── GatedCodeBridge demo ───────────────────────── */}
        {activeTab === "gated" && (
          <>
            <div className="text-[10px] font-mono" style={{ color: "var(--color-muted)" }}>
              Explore each section of the algorithm
            </div>

            <MiniCodeTrace
              code={BFS_CODE}
              activeLine={bridgeLine}
              trackHex={TRACK_HEX}
              annotation={activeSection?.narration}
            />

            {/* Section buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {BRIDGE_SECTIONS.map(({ line, label }) => {
                const isActive = bridgeLine === line;
                const wasViewed = viewedRef.current.has(line);
                return (
                  <button
                    key={line}
                    onClick={() => handleBridgeToggle(line)}
                    className="px-3 py-1.5 text-xs font-mono rounded transition-all"
                    style={{
                      background: isActive ? `${TRACK_HEX}20` : "var(--color-surface)",
                      color: isActive ? TRACK_HEX : wasViewed ? "var(--color-muted)" : "var(--color-text)",
                      border: `1px solid ${isActive ? TRACK_HEX : "var(--color-border)"}`,
                      opacity: wasViewed && !isActive ? 0.7 : 1,
                    }}
                  >
                    {wasViewed && !isActive ? `✓ ${label}` : label}
                  </button>
                );
              })}
            </div>

            {/* Progress */}
            <div className="text-[10px] font-mono text-center" style={{ color: "var(--color-muted)" }}>
              {allViewed ? (
                <span style={{ color: TRACK_HEX }}>All sections explored — Complete unlocked</span>
              ) : (
                `${viewedCount}/${BRIDGE_SECTIONS.length} sections explored`
              )}
            </div>

            {/* Complete button */}
            <div className="flex justify-center">
              <button
                disabled={!allViewed}
                className="px-4 py-1.5 text-xs font-mono rounded transition-all"
                style={{
                  background: allViewed ? TRACK_HEX : "var(--color-surface-2)",
                  color: allViewed ? "var(--color-bg)" : "var(--color-muted)",
                  border: `1px solid ${allViewed ? TRACK_HEX : "var(--color-border)"}`,
                  cursor: allViewed ? "pointer" : "not-allowed",
                }}
              >
                {allViewed ? "Complete" : `Explore all ${BRIDGE_SECTIONS.length} sections first`}
              </button>
            </div>
          </>
        )}

        {/* ── CodeFill demo ──────────────────────────────── */}
        {activeTab === "fill" && (
          <>
            <div className="text-[10px] font-mono" style={{ color: "var(--color-muted)" }}>
              Fill in the blanks to complete the BFS implementation
            </div>

            <div
              className="rounded-lg p-4 font-mono text-[11px] leading-relaxed"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ color: "var(--color-text)" }}>
                <span style={{ color: "var(--color-muted)" }}>{"const visited = new "}</span>
                <FillBlank
                  blank={FILL_BLANKS[0]}
                  answer={fillAnswers.ds}
                  submitted={fillSubmitted}
                  onSelect={(idx) => setFillAnswers((p) => ({ ...p, ds: idx }))}
                />
                <span style={{ color: "var(--color-muted)" }}>{"();"}</span>
              </div>
              <div className="mt-2" style={{ color: "var(--color-text)" }}>
                <span style={{ color: "var(--color-muted)" }}>{"const node = queue"}</span>
                <FillBlank
                  blank={FILL_BLANKS[1]}
                  answer={fillAnswers.op}
                  submitted={fillSubmitted}
                  onSelect={(idx) => setFillAnswers((p) => ({ ...p, op: idx }))}
                />
                <span style={{ color: "var(--color-muted)" }}>{";"}</span>
              </div>
              <div className="mt-2" style={{ color: "var(--color-text)" }}>
                <span style={{ color: "var(--color-muted)" }}>{"if (visited"}</span>
                <FillBlank
                  blank={FILL_BLANKS[2]}
                  answer={fillAnswers.check}
                  submitted={fillSubmitted}
                  onSelect={(idx) => setFillAnswers((p) => ({ ...p, check: idx }))}
                />
                <span style={{ color: "var(--color-muted)" }}>{") continue;"}</span>
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => setFillSubmitted(true)}
                className="px-4 py-1.5 text-xs font-mono rounded"
                style={{
                  background: TRACK_HEX,
                  color: "var(--color-bg)",
                  border: `1px solid ${TRACK_HEX}`,
                }}
              >
                Check
              </button>
              {fillSubmitted && (
                <button
                  onClick={() => {
                    setFillSubmitted(false);
                    setFillAnswers({ ds: null, op: null, check: null });
                  }}
                  className="px-4 py-1.5 text-xs font-mono rounded"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Pattern comparison ──────────────────────────── */}
        {activeTab === "compare" && (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr style={{ background: "var(--color-surface-2)" }}>
                  <th className="text-left px-3 py-2" style={{ color: "var(--color-muted)" }}>Feature</th>
                  <th className="text-center px-2 py-2" style={{ color: "#7c3aed" }}>LiveCode</th>
                  <th className="text-center px-2 py-2" style={{ color: "#0ea5e9" }}>Gated</th>
                  <th className="text-center px-2 py-2" style={{ color: "#10b981" }}>Fill</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Wraps CodeTrace", live: true, gated: true, fill: false },
                  { feature: "Step-synced", live: true, gated: false, fill: false },
                  { feature: "Clickable lines", live: false, gated: false, fill: false },
                  { feature: "Exploration gating", live: false, gated: true, fill: false },
                  { feature: "Interactive blanks", live: false, gated: false, fill: true },
                  { feature: "Shiki tokens", live: "via CT", gated: "via CT", fill: "direct" },
                  { feature: "Annotation slot", live: true, gated: true, fill: false },
                  { feature: "State tracking", live: "lineMap", gated: "viewedSet", fill: "answers" },
                ].map((row) => (
                  <tr
                    key={row.feature}
                    style={{
                      background: "var(--color-surface)",
                      borderTop: "1px solid var(--color-border)",
                    }}
                  >
                    <td className="px-3 py-1.5" style={{ color: "var(--color-text)" }}>
                      {row.feature}
                    </td>
                    {([row.live, row.gated, row.fill] as (boolean | string)[]).map((val, i) => (
                      <td key={i} className="text-center px-2 py-1.5" style={{ color: "var(--color-muted)" }}>
                        {val === true ? (
                          <span style={{ color: "var(--color-accent)" }}>●</span>
                        ) : val === false ? (
                          <span style={{ opacity: 0.3 }}>○</span>
                        ) : (
                          <span className="text-[9px]">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <StateInspector entries={stateEntries} title="Wrapper State" />
      </div>
    </div>
  );
}

// ── FillBlank subcomponent ──────────────────────────────────────────

function FillBlank({
  blank,
  answer,
  submitted,
  onSelect,
}: {
  blank: typeof FILL_BLANKS[number];
  answer: number | null;
  submitted: boolean;
  onSelect: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isCorrect = answer === blank.correctIdx;
  const showResult = submitted;

  return (
    <span className="relative inline-block mx-1">
      <button
        onClick={() => !submitted && setOpen(!open)}
        className="px-2 py-0.5 rounded text-[11px] font-mono transition-all"
        style={{
          background: showResult
            ? isCorrect ? `${TRACK_HEX}20` : "#ef444420"
            : answer !== null ? "var(--color-surface-2)" : "var(--color-bg)",
          color: showResult
            ? isCorrect ? TRACK_HEX : "#ef4444"
            : answer !== null ? "var(--color-text)" : "var(--color-muted)",
          border: `1px dashed ${
            showResult
              ? isCorrect ? TRACK_HEX : "#ef4444"
              : answer !== null ? "var(--color-border)" : "var(--color-muted)"
          }`,
          minWidth: "80px",
          textAlign: "center",
        }}
      >
        {answer !== null ? blank.options[answer] : `___${blank.label}___`}
      </button>
      <AnimatePresence>
        {showResult && !isCorrect && answer !== null && blank.explanations[answer] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.enterItem}
            className="absolute left-0 top-full mt-1.5 z-30 text-[9px] font-mono px-2.5 py-1.5 rounded shadow-lg pointer-events-none"
            style={{
              color: "#ef4444",
              background: "var(--color-surface)",
              border: "1px solid #ef444440",
              maxWidth: "220px",
              width: "max-content",
              lineHeight: 1.4,
            }}
          >
            {blank.explanations[answer]}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={TRANSITION.enterItem}
            className="absolute left-0 top-full mt-1 z-20 rounded shadow-lg"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: "120px",
            }}
          >
            {blank.options.map((opt, idx) => (
              <button
                key={opt}
                onClick={() => {
                  onSelect(idx);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors"
                style={{
                  color: answer === idx ? TRACK_HEX : "var(--color-text)",
                  background: answer === idx ? `${TRACK_HEX}10` : "transparent",
                }}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

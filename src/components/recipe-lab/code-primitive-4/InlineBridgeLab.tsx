"use client";

import { useState, useCallback, useMemo, useEffect, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import {
  useCodeTokens,
  renderTokens,
} from "../code-primitive-1/use-shiki-tokens";
import { StateInspector, type StateEntry } from "../StateInspector";

// ── Feature system ─────────────────────────────────────────────────

type Feature =
  | "unified-model"
  | "reducer"
  | "chunk-reveal"
  | "motion"
  | "replaces"
  | "lessons";

const FEATURES: { id: Feature; label: string; step: number }[] = [
  { id: "unified-model", label: "Unified Model", step: 1 },
  { id: "reducer", label: "Reducer", step: 2 },
  { id: "chunk-reveal", label: "Chunk Reveal", step: 3 },
  { id: "motion", label: "Motion", step: 4 },
  { id: "replaces", label: "Replaces", step: 5 },
  { id: "lessons", label: "Full Demo", step: 6 },
];

const STEP_FEATURES: Record<number, Feature[]> = {
  1: ["unified-model"],
  2: ["unified-model", "reducer"],
  3: ["unified-model", "reducer", "chunk-reveal"],
  4: ["unified-model", "reducer", "chunk-reveal", "motion"],
  5: ["unified-model", "reducer", "chunk-reveal", "motion", "replaces"],
  6: ["unified-model", "reducer", "chunk-reveal", "motion", "replaces", "lessons"],
};

// ── Chunk data ─────────────────────────────────────────────────────

interface Chunk {
  id: string;
  stepNumber: number;
  title: string;
  revealCode: string;
  revealNote: string;
  replaces?: number;
}

const FUNCTION_SIGNATURE = "function topKFrequent(nums: number[], k: number): number[] {";
const FUNCTION_CLOSE = "}";

const CHUNKS_BASE: Chunk[] = [
  {
    id: "count",
    stepNumber: 1,
    title: "Count Frequencies",
    revealCode: `  // 1 — count how often each number appears
  const freq = new Map<number, number>();
  for (const n of nums) {
    freq.set(n, (freq.get(n) || 0) + 1);
  }`,
    revealNote: "One pass, one source of truth. The Map gives O(1) lookups for step 2.",
  },
  {
    id: "buckets",
    stepNumber: 2,
    title: "Make Buckets",
    revealCode: `  // 2 — bucket sort: index = frequency
  const buckets: number[][] = Array.from(
    { length: nums.length + 1 },
    () => [],
  );
  for (const [num, count] of freq) {
    buckets[count].push(num);
  }`,
    revealNote: "Bucket sort trades space for time — O(n) instead of O(n log n) sorting.",
  },
  {
    id: "sweep",
    stepNumber: 3,
    title: "Sweep Top-K",
    revealCode: `  // 3 — sweep buckets from highest frequency
  const result: number[] = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }
  return result;`,
    revealNote: "Walk backwards from the highest bucket. Stop when we have k elements.",
  },
];

const CHUNK_REPLACER: Chunk = {
  id: "exact-sweep",
  stepNumber: 4,
  title: "Exact-K Sweep",
  replaces: 2,
  revealCode: `  // 4 — exact-k sweep (replaces step 3)
  const result: number[] = [];
  for (let i = buckets.length - 1; i >= 0; i--) {
    for (const num of buckets[i]) {
      result.push(num);
      if (result.length === k) return result;
    }
  }
  return result;`,
  revealNote: "Inner loop + early return — stops at exactly k, no overshoot from spread.",
};

const LINE_H = 20;
const PAD_Y = 6;
const TRACK_HEX = "#7c3aed";
const AMBER = "#f59e0b";

// ── Line model ─────────────────────────────────────────────────────

type LineKind =
  | { type: "signature" }
  | { type: "close" }
  | { type: "committed"; chunkIdx: number }
  | { type: "pending" }
  | { type: "active-label"; chunkIdx: number; replacing?: number };

interface UnifiedLine {
  text: string;
  kind: LineKind;
}

function buildUnifiedCode(
  chunks: Chunk[],
  revealed: Set<number>,
  activeIdx: number | null,
): UnifiedLine[] {
  const lines: UnifiedLine[] = [];

  const replacerMap = new Map<number, number>();
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].replaces !== undefined) {
      replacerMap.set(chunks[i].replaces!, i);
    }
  }

  lines.push({ text: FUNCTION_SIGNATURE, kind: { type: "signature" } });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (chunk.replaces !== undefined) continue;

    const isRevealed = revealed.has(i);
    const isActive = i === activeIdx;

    const replacerIdx = replacerMap.get(i);
    const hasReplacer = replacerIdx !== undefined;
    const replacerRevealed = hasReplacer && revealed.has(replacerIdx);
    const replacerActive = hasReplacer && replacerIdx === activeIdx;

    if (replacerRevealed) {
      const replacer = chunks[replacerIdx!];
      for (const codeLine of replacer.revealCode.split("\n")) {
        lines.push({ text: codeLine, kind: { type: "committed", chunkIdx: replacerIdx! } });
      }
    } else if (isRevealed) {
      for (const codeLine of chunk.revealCode.split("\n")) {
        lines.push({ text: codeLine, kind: { type: "committed", chunkIdx: i } });
      }
      if (replacerActive) {
        const replacer = chunks[replacerIdx!];
        lines.push({
          text: `  // ${replacer.stepNumber} — ${replacer.title.toLowerCase()}`,
          kind: { type: "active-label", chunkIdx: replacerIdx!, replacing: chunk.stepNumber },
        });
      }
    } else if (isActive) {
      lines.push({
        text: `  // ${chunk.stepNumber} — ${chunk.title.toLowerCase()}`,
        kind: { type: "active-label", chunkIdx: i },
      });
    } else {
      lines.push({
        text: `  // step ${chunk.stepNumber} — pending`,
        kind: { type: "pending" },
      });
    }
  }

  lines.push({ text: FUNCTION_CLOSE, kind: { type: "close" } });
  return lines;
}

// ── Reducer ────────────────────────────────────────────────────────

interface State {
  revealed: Set<number>;
  activeIdx: number | null;
  correct: number;
}

type Event =
  | { type: "resolve"; idx: number; total: number }
  | { type: "reset" };

function initialState(): State {
  return { revealed: new Set(), activeIdx: 0, correct: 0 };
}

function reduce(state: State, event: Event): State {
  switch (event.type) {
    case "resolve": {
      if (state.revealed.has(event.idx)) return state;
      const next = new Set(state.revealed);
      next.add(event.idx);
      let nextActive: number | null = null;
      for (let j = 0; j < event.total; j++) {
        if (!next.has(j)) { nextActive = j; break; }
      }
      return { revealed: next, activeIdx: nextActive, correct: state.correct + 1 };
    }
    case "reset":
      return initialState();
    default:
      return state;
  }
}

// ── Choreography constants ──────────────────────────────────────────

const CHOREO = {
  codeStart: 0.08,
  codeStep: 0.04,
  noteDelay: 0.32,
  noteSlide: 12,
};

// ── Main component ─────────────────────────────────────────────────

type InlineBridgeLabProps = {
  activeStep: number;
};

export function InlineBridgeLab({ activeStep }: InlineBridgeLabProps) {
  const [enabled, setEnabled] = useState<Set<Feature>>(new Set());
  const [userOverride, setUserOverride] = useState(false);
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [slowMotion, setSlowMotion] = useState(false);

  const hasUnifiedModel = enabled.has("unified-model");
  const hasReducer = enabled.has("reducer");
  const hasChunkReveal = enabled.has("chunk-reveal");
  const hasMotion = enabled.has("motion");
  const hasReplaces = enabled.has("replaces");
  const hasLessons = enabled.has("lessons");

  const activeChunks = useMemo(
    () => hasReplaces ? [...CHUNKS_BASE, CHUNK_REPLACER] : CHUNKS_BASE,
    [hasReplaces],
  );

  const unifiedLines = useMemo(
    () => buildUnifiedCode(activeChunks, state.revealed, state.activeIdx),
    [activeChunks, state.revealed, state.activeIdx],
  );

  const fullCode = unifiedLines.map((l) => l.text).join("\n");
  const tokens = useCodeTokens(fullCode, "typescript");

  useEffect(() => {
    if (!userOverride) {
      setEnabled(new Set(STEP_FEATURES[activeStep] ?? []));
    }
  }, [activeStep, userOverride]);

  useEffect(() => {
    setUserOverride(false);
  }, [activeStep]);

  useEffect(() => {
    dispatch({ type: "reset" });
  }, [hasReplaces]);

  const toggle = useCallback((id: Feature) => {
    setUserOverride(true);
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleResolve = useCallback(() => {
    if (state.activeIdx !== null) {
      dispatch({ type: "resolve", idx: state.activeIdx, total: activeChunks.length });
    }
  }, [state.activeIdx, activeChunks.length]);

  const handleReset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  // ── State inspector ────────────────────────────────────────────

  const stateEntries = useMemo((): StateEntry[] => {
    const entries: StateEntry[] = [];

    if (hasUnifiedModel) {
      entries.push({
        label: "totalLines",
        value: unifiedLines.length,
      });
      const kinds = new Set(unifiedLines.map((l) => l.kind.type));
      entries.push({
        label: "lineKinds",
        value: [...kinds],
      });
    }

    if (hasReducer) {
      entries.push({
        label: "revealed",
        value: `${state.revealed.size}/${activeChunks.length}`,
        highlight: state.revealed.size > 0,
      });
      entries.push({
        label: "activeIdx",
        value: state.activeIdx,
        highlight: state.activeIdx !== null,
      });
      entries.push({
        label: "correct",
        value: state.correct,
        highlight: state.correct === activeChunks.length,
      });
    }

    if (hasReplaces) {
      const replacerChunk = activeChunks.find(c => c.replaces !== undefined);
      const targetRevealed = replacerChunk && state.revealed.has(replacerChunk.replaces!);
      const replacerRevealed = replacerChunk && state.revealed.has(activeChunks.indexOf(replacerChunk));
      entries.push({
        label: "replaces",
        value: replacerRevealed
          ? `step ${replacerChunk!.stepNumber} replaced step ${CHUNKS_BASE[replacerChunk!.replaces!].stepNumber}`
          : targetRevealed
            ? `step ${replacerChunk!.stepNumber} ready to replace step ${CHUNKS_BASE[replacerChunk!.replaces!].stepNumber}`
            : "pending",
        highlight: !!replacerRevealed,
      });
    }

    if (hasMotion) {
      entries.push({ label: "codeStart", value: `${CHOREO.codeStart}s` });
      entries.push({ label: "codeStep", value: `${CHOREO.codeStep}s` });
      entries.push({ label: "noteDelay", value: `${CHOREO.noteDelay}s` });
    }

    return entries;
  }, [hasUnifiedModel, unifiedLines, hasReducer, state, activeChunks, hasReplaces, hasMotion]);

  // ── Render ───────────────────────────────────────────────────────

  const springMult = slowMotion ? 4 : 1;

  const activeChunk = state.activeIdx !== null ? activeChunks[state.activeIdx] : null;
  const isReplacerActive = activeChunk?.replaces !== undefined;

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
          Layer
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
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasChunkReveal && state.activeIdx !== null && (
            <button
              onClick={handleResolve}
              className="px-3 py-1.5 text-xs font-mono rounded"
              style={{
                background: isReplacerActive ? AMBER : TRACK_HEX,
                color: "var(--color-bg)",
                border: `1px solid ${isReplacerActive ? AMBER : TRACK_HEX}`,
              }}
            >
              {isReplacerActive
                ? `Replace Step ${CHUNKS_BASE[activeChunk!.replaces!].stepNumber}`
                : `Resolve Step ${activeChunks[state.activeIdx].stepNumber}`}
            </button>
          )}
          {state.revealed.size > 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-mono rounded"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              Reset
            </button>
          )}
          {hasMotion && (
            <button
              onClick={() => setSlowMotion((s) => !s)}
              className="px-3 py-1.5 text-xs font-mono rounded ml-auto"
              style={{
                background: slowMotion ? `${TRACK_HEX}20` : "var(--color-surface)",
                color: slowMotion ? TRACK_HEX : "var(--color-muted)",
                border: `1px solid ${slowMotion ? TRACK_HEX : "var(--color-border)"}`,
              }}
            >
              {slowMotion ? "0.25×" : "1×"}
            </button>
          )}
        </div>

        {/* Unified code body */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="relative z-10 overflow-x-auto"
            style={{ padding: `${PAD_Y}px 0` }}
          >
            {unifiedLines.map((uLine, i) => {
              const kind = uLine.kind;
              const isCommitted = kind.type === "committed";
              const isPending = kind.type === "pending";
              const isActiveLabel = kind.type === "active-label";
              const isStructural = kind.type === "signature" || kind.type === "close";
              const isReplacerLabel = isActiveLabel && "replacing" in kind && kind.replacing !== undefined;

              const lineOpacity = isPending ? 0.25 : isCommitted ? 0.85 : 1;

              const animProps = hasMotion && isCommitted
                ? {
                    initial: { height: 0, opacity: 0 },
                    animate: { height: LINE_H, opacity: lineOpacity },
                    transition: {
                      ...SPRING.snappy,
                      delay: (CHOREO.codeStart + i * CHOREO.codeStep) * springMult,
                      duration: slowMotion ? 1.2 : undefined,
                    },
                  }
                : {};

              return (
                <div key={`${kind.type}-${i}-${uLine.text.slice(0, 20)}`}>
                  <motion.div
                    className="flex items-center"
                    style={{
                      height: hasMotion && isCommitted ? undefined : LINE_H,
                      opacity: hasMotion && isCommitted ? undefined : lineOpacity,
                      transition: "opacity 300ms ease",
                    }}
                    {...animProps}
                  >
                    {/* Line number */}
                    <span
                      className="w-6 shrink-0 text-right pr-1.5 text-[9px] font-mono select-none tabular-nums"
                      style={{
                        color: isActiveLabel
                          ? isReplacerLabel ? AMBER : TRACK_HEX
                          : "var(--color-muted)",
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* Code content */}
                    <pre className="flex-1 whitespace-pre font-mono text-[10px] pr-2 leading-relaxed">
                      {tokens ? (
                        renderTokens(
                          tokens[i] ?? [],
                          isPending ? "var(--color-muted)" : undefined,
                        )
                      ) : (
                        <span style={{ color: "var(--color-text)" }}>{uLine.text}</span>
                      )}
                    </pre>

                    {/* Kind badge */}
                    {hasUnifiedModel && (
                      <span
                        className="shrink-0 mr-2 px-1 text-[8px] font-mono uppercase rounded"
                        style={{
                          background:
                            isActiveLabel
                              ? isReplacerLabel ? `${AMBER}20` : `${TRACK_HEX}20`
                            : isPending ? "var(--color-surface-2)"
                            : "transparent",
                          color:
                            isActiveLabel
                              ? isReplacerLabel ? AMBER : TRACK_HEX
                            : isPending ? "var(--color-muted)"
                            : isCommitted ? "var(--color-accent)"
                            : "var(--color-muted)",
                          opacity: isStructural ? 0.4 : 0.7,
                        }}
                      >
                        {isReplacerLabel ? "replaces" : kind.type}
                      </span>
                    )}
                  </motion.div>

                  {/* Active step panel */}
                  {isActiveLabel && hasChunkReveal && (
                    <motion.div
                      className="ml-6 my-1 px-3 py-2 rounded"
                      style={{
                        background: isReplacerLabel ? `${AMBER}08` : `${TRACK_HEX}08`,
                        borderLeft: `2px solid ${isReplacerLabel ? AMBER : TRACK_HEX}`,
                      }}
                      initial={hasMotion ? { opacity: 0, x: -8 } : undefined}
                      animate={hasMotion ? { opacity: 1, x: 0 } : undefined}
                      transition={hasMotion ? { ...SPRING.gentle, delay: 0.1 * springMult } : undefined}
                    >
                      <div
                        className="text-[9px] font-mono uppercase tracking-wider mb-1"
                        style={{ color: isReplacerLabel ? AMBER : TRACK_HEX }}
                      >
                        {isReplacerLabel ? (
                          <>
                            <span style={{ color: AMBER }}>REPLACING </span>
                            <span style={{ color: "var(--color-muted)" }}>
                              STEP {(kind as { replacing: number }).replacing}
                            </span>
                          </>
                        ) : (
                          <>▸ Step {activeChunks[kind.chunkIdx].stepNumber} — {activeChunks[kind.chunkIdx].title}</>
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {isReplacerLabel
                          ? `Upgrade: ${activeChunks[kind.chunkIdx].title}`
                          : "Solve this step to reveal the code"}
                      </div>
                    </motion.div>
                  )}

                  {/* Reveal note for committed chunks */}
                  {isCommitted && (() => {
                    const chunk = activeChunks[kind.chunkIdx];
                    if (!chunk) return null;
                    const codeLines = chunk.revealCode.split("\n");
                    const isLastLineOfChunk = uLine.text === codeLines[codeLines.length - 1];
                    if (!isLastLineOfChunk) return null;

                    return (
                      <motion.div
                        className="ml-6 my-1 text-[10px]"
                        style={{ color: "var(--color-muted)" }}
                        initial={hasMotion ? { opacity: 0, x: -CHOREO.noteSlide } : undefined}
                        animate={hasMotion ? { opacity: 1, x: 0 } : undefined}
                        transition={hasMotion ? {
                          ...SPRING.gentle,
                          delay: CHOREO.noteDelay * springMult,
                          duration: slowMotion ? 1.2 : undefined,
                        } : undefined}
                      >
                        <span style={{ color: chunk.replaces !== undefined ? AMBER : TRACK_HEX, fontStyle: "italic" }}>
                          — {chunk.replaces !== undefined ? "The upgrade:" : "The move:"}
                        </span>{" "}
                        {chunk.revealNote}
                      </motion.div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion state */}
        {state.activeIdx === null && state.revealed.size === activeChunks.length && (
          <motion.div
            className="text-center py-2 text-xs font-mono"
            style={{ color: TRACK_HEX }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={TRANSITION.enterItem}
          >
            All {activeChunks.length} chunks resolved — function complete
          </motion.div>
        )}

        <StateInspector entries={stateEntries} title="InlineCodeBridge" />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TRANSITION } from "@/lib/motion";
import { PATTERN_LIST, TRADEOFF_LABELS, TRADEOFF_EXPLANATIONS } from "./pattern-data";
import type { TradeoffScores } from "./pattern-data";

export function TradeoffCompare() {
  const [leftId, setLeftId] = useState("mvc");
  const [rightId, setRightId] = useState("clean");
  const [expandedDim, setExpandedDim] = useState<keyof TradeoffScores | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const left = PATTERN_LIST.find((p) => p.id === leftId) ?? PATTERN_LIST[0];
  const right = PATTERN_LIST.find((p) => p.id === rightId) ?? PATTERN_LIST[3];

  const dimensions = Object.keys(TRADEOFF_LABELS) as (keyof TradeoffScores)[];

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
        className="flex items-center gap-3 px-4 py-2"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
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
          Compare
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
        >
          Click any dimension to see why
        </span>
      </div>

      {/* Selectors */}
      <div
        className="flex items-center justify-center gap-4 px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <PatternSelect
          value={leftId}
          onChange={(v) => { setLeftId(v); setExpandedDim(null); }}
          color="#56b6c2"
          label="Pattern A"
        />
        <span
          className="text-xs"
          style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
        >
          vs
        </span>
        <PatternSelect
          value={rightId}
          onChange={(v) => { setRightId(v); setExpandedDim(null); }}
          color="#c678dd"
          label="Pattern B"
        />
      </div>

      {/* Bars */}
      <div className="px-4 py-4">
        <div className="flex flex-col gap-2">
          {dimensions.map((dim) => (
            <ComparisonRow
              key={dim}
              dim={dim}
              label={TRADEOFF_LABELS[dim]}
              leftValue={left.scores[dim]}
              rightValue={right.scores[dim]}
              leftId={left.id}
              rightId={right.id}
              leftName={left.name}
              rightName={right.name}
              expanded={expandedDim === dim}
              onToggle={() => setExpandedDim(expandedDim === dim ? null : dim)}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-6 px-4 py-2"
        style={{
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded" style={{ width: 12, height: 12, background: "#56b6c2" }} />
          <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontSize: 11 }}>
            {left.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded" style={{ width: 12, height: 12, background: "#c678dd" }} />
          <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontSize: 11 }}>
            {right.name}
          </span>
        </div>
      </div>
    </div>
  );
}

function PatternSelect({
  value,
  onChange,
  color,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-xs uppercase tracking-wider"
        style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)", fontSize: 9 }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded px-3 py-1.5 text-xs font-semibold"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color,
          background: "var(--color-bg)",
          border: `1px solid ${color}`,
          outline: "none",
        }}
      >
        {PATTERN_LIST.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.year})
          </option>
        ))}
      </select>
    </div>
  );
}

function ComparisonRow({
  dim,
  label,
  leftValue,
  rightValue,
  leftId,
  rightId,
  leftName,
  rightName,
  expanded,
  onToggle,
  reducedMotion,
}: {
  dim: keyof TradeoffScores;
  label: string;
  leftValue: number;
  rightValue: number;
  leftId: string;
  rightId: string;
  leftName: string;
  rightName: string;
  expanded: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
}) {
  const leftPct = (leftValue / 10) * 100;
  const rightPct = (rightValue / 10) * 100;

  const leftExpl = TRADEOFF_EXPLANATIONS[leftId]?.[dim];
  const rightExpl = TRADEOFF_EXPLANATIONS[rightId]?.[dim];

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full cursor-pointer text-left"
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        <div className="mb-1 flex items-center justify-between">
          <span
            className="text-xs font-semibold"
            style={{
              fontFamily: "var(--font-mono)",
              color: expanded ? "var(--color-accent)" : "var(--color-muted)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "color 0.2s",
            }}
          >
            {label}
          </span>
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-muted)",
              fontSize: 9,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            ▶
          </span>
        </div>
        <div className="flex gap-2">
          <Bar pct={leftPct} color="#56b6c2" value={leftValue} reducedMotion={reducedMotion} />
          <Bar pct={rightPct} color="#c678dd" value={rightValue} reducedMotion={reducedMotion} />
        </div>
      </button>

      {/* Expanded explanations */}
      {reducedMotion ? (
        expanded && (leftExpl || rightExpl) ? (
          <div className="mt-2 flex gap-2">
            {leftExpl && <ExplanationBox color="#56b6c2" name={leftName} text={leftExpl} />}
            {rightExpl && <ExplanationBox color="#c678dd" name={rightName} text={rightExpl} />}
          </div>
        ) : null
      ) : (
        <AnimatePresence initial={false}>
          {expanded && (leftExpl || rightExpl) && (
            <motion.div
              key="explanation"
              className="mt-2 flex gap-2"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={TRANSITION.collapse}
              style={{ overflow: "hidden" }}
            >
              {leftExpl && <ExplanationBox color="#56b6c2" name={leftName} text={leftExpl} />}
              {rightExpl && <ExplanationBox color="#c678dd" name={rightName} text={rightExpl} />}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function ExplanationBox({ color, name, text }: { color: string; name: string; text: string }) {
  return (
    <div
      className="flex-1 rounded px-2.5 py-2 text-xs leading-relaxed"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--color-text)",
        background: "var(--color-bg)",
        border: `1px solid ${color}40`,
      }}
    >
      <span style={{ color, fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>
        {name}:{" "}
      </span>
      {text}
    </div>
  );
}

function Bar({
  pct,
  color,
  value,
  reducedMotion,
}: {
  pct: number;
  color: string;
  value: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return (
      <div className="relative flex-1" style={{ height: 20 }}>
        <div className="overflow-hidden rounded" style={{ height: "100%", background: "var(--color-bg)" }}>
          <div
            className="rounded"
            style={{
              height: "100%",
              width: `${pct}%`,
              background: color,
              opacity: 0.7,
              transition: "width 0.3s",
            }}
          />
        </div>
        <span
          className="absolute right-1 top-0.5 text-xs tabular-nums"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontSize: 10 }}
        >
          {value}/10
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex-1" style={{ height: 20 }}>
      <div className="overflow-hidden rounded" style={{ height: "100%", background: "var(--color-bg)" }}>
        <motion.div
          className="rounded"
          style={{ height: "100%", background: color, opacity: 0.7 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={TRANSITION.progress}
        />
      </div>
      <span
        className="absolute right-1 top-0.5 text-xs tabular-nums"
        style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", fontSize: 10 }}
      >
        {value}/10
      </span>
    </div>
  );
}

export default TradeoffCompare;

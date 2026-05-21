"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";

export type StateEntry = {
  label: string;
  value: unknown;
  highlight?: boolean;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: string;
  deltaDirection?: "improved" | "regressed";
};

type StateInspectorProps = {
  entries: StateEntry[];
  title?: string;
  renderCount?: number;
};

function ratingColor(rating?: "good" | "needs-improvement" | "poor"): string | undefined {
  if (rating === "good") return "var(--color-success)";
  if (rating === "needs-improvement") return "var(--color-warning)";
  if (rating === "poor") return "var(--color-error)";
  return undefined;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3) return `[${value.map((v) => formatValue(v)).join(", ")}]`;
    return `[${value.slice(0, 2).map((v) => formatValue(v)).join(", ")}, ...+${value.length - 2}]`;
  }
  return JSON.stringify(value);
}

export function StateInspector({ entries, title = "State", renderCount }: StateInspectorProps) {
  return (
    <div
      className="font-mono text-xs"
      style={{
        borderLeft: "3px solid var(--color-muted)",
        paddingLeft: "var(--space-3)",
      }}
    >
      <div
        className="py-1 font-mono text-[10px] uppercase tracking-wider flex items-center justify-between"
        style={{
          color: "var(--color-muted)",
        }}
      >
        <span>{title}</span>
        {renderCount !== undefined && (
          <motion.span
            key={renderCount}
            initial={{ color: "var(--color-accent)" }}
            animate={{ color: "var(--color-muted)" }}
            transition={{ duration: 0.6 }}
          >
            renders: {renderCount}
          </motion.span>
        )}
      </div>
      <div className="py-1.5 flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => (
            <motion.div
              key={entry.label}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={TRANSITION.enterItem}
              className="flex items-baseline gap-2 leading-tight"
            >
              <span style={{ color: "var(--color-muted)" }}>{entry.label}:</span>
              <motion.span
                key={formatValue(entry.value)}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={TRANSITION.crossfade}
                style={{
                  color: ratingColor(entry.rating) ?? (entry.highlight ? "var(--color-accent)" : "var(--color-text)"),
                  wordBreak: "break-all",
                  fontVariantNumeric: entry.rating ? "tabular-nums" : undefined,
                  fontWeight: entry.rating ? 700 : undefined,
                }}
              >
                {formatValue(entry.value)}
              </motion.span>
              {entry.delta && (
                <motion.span
                  key={`${entry.label}-${entry.delta}`}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 0.85, y: 0 }}
                  transition={TRANSITION.enterItem}
                  style={{
                    fontSize: "0.85em",
                    fontVariantNumeric: "tabular-nums",
                    color:
                      entry.deltaDirection === "improved"
                        ? "var(--color-success)"
                        : entry.deltaDirection === "regressed"
                          ? "var(--color-error)"
                          : "var(--color-muted)",
                  }}
                >
                  {entry.delta}
                </motion.span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <span style={{ color: "var(--color-muted)", fontStyle: "italic" }}>
            (no state)
          </span>
        )}
      </div>
    </div>
  );
}

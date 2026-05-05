"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";

export type StateEntry = {
  label: string;
  value: unknown;
  highlight?: boolean;
};

type StateInspectorProps = {
  entries: StateEntry[];
  title?: string;
  renderCount?: number;
};

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
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-1)",
      }}
    >
      <div
        className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider flex items-center justify-between"
        style={{
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-border)",
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
      <div className="px-3 py-2 flex flex-col gap-1.5">
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
                  color: entry.highlight
                    ? "var(--color-accent)"
                    : "var(--color-text)",
                  wordBreak: "break-all",
                }}
              >
                {formatValue(entry.value)}
              </motion.span>
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

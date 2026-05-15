"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type DialPanelProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
};

export function DialPanel({ title, children, defaultOpen = true, accent }: DialPanelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `dial-panel-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      className="rounded-[var(--radius-2)] border overflow-hidden"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--panel-shadow)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex items-center justify-between w-full px-3 py-2 transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
      >
        <span
          className="font-mono text-xs font-semibold uppercase tracking-wider"
          style={{ color: accent ?? "var(--color-muted)" }}
        >
          {title}
        </span>
        <span
          className="text-xs font-mono transition-transform"
          style={{
            color: "var(--color-muted)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.collapse}
            className="overflow-hidden"
          >
            <div id={contentId} className="px-3 pl-4 pb-3 flex flex-col gap-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type DialToggleProps = {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

export function DialToggle({ label, value, onChange }: DialToggleProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 w-full text-left group rounded focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
    >
      <span
        className="font-mono text-xs shrink-0"
        style={{ color: "var(--color-muted)", minWidth: 52 }}
        aria-hidden="true"
      >
        {label}
      </span>
      <div
        className="relative w-7 h-4 rounded-full transition-colors shrink-0 group-hover:brightness-110"
        style={{ background: value ? "var(--color-accent)" : "var(--color-border)" }}
      >
        <motion.div
          className="absolute top-[3px] w-2.5 h-2.5 rounded-full"
          style={{ background: value ? "var(--color-bg)" : "var(--color-surface)" }}
          animate={{ left: value ? 13 : 3 }}
          transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
        />
      </div>
    </button>
  );
}

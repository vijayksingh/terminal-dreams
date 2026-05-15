"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type DialSegmentProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  formatOption?: (v: T) => string;
};

export function DialSegment<T extends string>({
  label,
  options,
  value,
  onChange,
  formatOption,
}: DialSegmentProps<T>) {
  const reducedMotion = usePrefersReducedMotion();
  const labelId = `seg-label-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = options.indexOf(value);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = options[(idx + 1) % options.length];
        onChange(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = options[(idx - 1 + options.length) % options.length];
        onChange(prev);
      }
    },
    [options, value, onChange],
  );

  return (
    <div className="flex items-center gap-2">
      <span
        id={labelId}
        className="font-mono text-xs shrink-0"
        style={{ color: "var(--color-muted)", minWidth: 52 }}
      >
        {label}
      </span>
      <div
        className="flex rounded-[var(--radius-1)] overflow-hidden border"
        style={{ borderColor: "var(--color-border)" }}
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(opt)}
              onKeyDown={onKeyDown}
              className="relative px-2 py-1 font-mono text-xs transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
              style={{ color: active ? "var(--color-bg)" : "var(--color-muted)" }}
            >
              {active && (
                <motion.div
                  layoutId={reducedMotion ? undefined : `seg-${label}`}
                  className="absolute inset-0"
                  style={{ background: "var(--color-accent)" }}
                  transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
                />
              )}
              <span className="relative">{formatOption ? formatOption(opt) : opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

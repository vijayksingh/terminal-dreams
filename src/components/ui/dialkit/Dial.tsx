"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type DialProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
};

export function Dial({ label, value, min, max, step = 0.01, format, onChange }: DialProps) {
  const reducedMotion = usePrefersReducedMotion();
  const transition = reducedMotion ? { duration: 0 } : SPRING.snappy;
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = (value - min) / (max - min);

  const resolve = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      const v = Math.round((min + clamped * (max - min)) / step) * step;
      onChange(Math.max(min, Math.min(max, +v.toFixed(6))));
    },
    [min, max, step, onChange],
  );

  const nudge = useCallback(
    (direction: 1 | -1) => {
      const v = Math.round((value + direction * step) / step) * step;
      onChange(Math.max(min, Math.min(max, +v.toFixed(6))));
    },
    [value, min, max, step, onChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      resolve(e.clientX);
      const onMove = (ev: PointerEvent) => resolve(ev.clientX);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [resolve],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        nudge(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        nudge(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(min);
      } else if (e.key === "End") {
        e.preventDefault();
        onChange(max);
      }
    },
    [nudge, onChange, min, max],
  );

  const labelId = `dial-label-${label.replace(/\s+/g, "-").toLowerCase()}`;

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
        ref={trackRef}
        className="relative flex-1 h-5 flex items-center cursor-pointer touch-none rounded focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format ? format(value) : value.toFixed(2)}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <div
          className="w-full h-[3px] rounded-full overflow-hidden"
          style={{ background: "var(--color-border)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--color-accent)" }}
            animate={{ width: `${pct * 100}%` }}
            transition={transition}
          />
        </div>
        <motion.div
          className="absolute w-3 h-3 rounded-full border-2 -translate-y-1/2 hover:scale-125 active:scale-110"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-accent)",
            top: "50%",
            transition: "transform 0.15s",
          }}
          animate={{ left: `calc(${pct * 100}% - 6px)` }}
          transition={transition}
          aria-hidden="true"
        />
      </div>
      <span
        className="font-mono text-xs shrink-0 text-right tabular-nums"
        style={{ color: "var(--color-accent)", minWidth: 32 }}
        aria-hidden="true"
      >
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

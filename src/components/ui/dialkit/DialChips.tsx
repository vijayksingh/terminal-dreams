"use client";

import { useCallback } from "react";

type DialChipsProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  colors?: Partial<Record<T, string>>;
};

export function DialChips<T extends string>({
  label,
  options,
  value,
  onChange,
  colors,
}: DialChipsProps<T>) {
  const labelId = `chips-label-${label.replace(/\s+/g, "-").toLowerCase()}`;

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
      <div className="flex gap-1 flex-wrap" role="radiogroup" aria-labelledby={labelId}>
        {options.map((opt) => {
          const active = opt === value;
          const c = colors?.[opt] ?? "var(--color-accent)";
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(opt)}
              onKeyDown={onKeyDown}
              className="px-2 py-0.5 rounded-full font-mono text-xs border transition-all hover:brightness-110 focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
              style={{
                borderColor: active ? c : "var(--color-border)",
                background: active ? `color-mix(in srgb, ${c} 15%, transparent)` : "transparent",
                color: active ? c : "var(--color-muted)",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

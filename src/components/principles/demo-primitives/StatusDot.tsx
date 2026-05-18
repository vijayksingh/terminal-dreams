"use client";

import { LABEL, COLOR_MAP } from "./demo-tokens";

type StatusDotProps = {
  status: "success" | "error";
  label?: string;
};

const icons: Record<StatusDotProps["status"], string> = {
  success: "✓",
  error: "✕",
};

export function StatusDot({ status, label }: StatusDotProps) {
  const c = COLOR_MAP[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 18,
          height: 18,
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.text,
          fontFamily: LABEL.fontFamily,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {icons[status]}
      </span>
      {label && (
        <span
          style={{
            fontFamily: LABEL.fontFamily,
            fontSize: LABEL.fontSize,
            fontWeight: LABEL.fontWeight,
            color: c.text,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

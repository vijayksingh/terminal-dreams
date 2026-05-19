"use client";

import type { ReactNode } from "react";

// Inline acronyms / defined terms (API, DOM, CDN, SSE, etc.).
// No decoration — color + letter-spacing reads as a typographic tag,
// not a spell-check error. The `variant` prop is kept for signature
// stability; reveal animation is handled by the parent motion wrapper.
export function PencilEmphasis({
  children,
}: {
  children: ReactNode;
  variant?: "static" | "reveal" | "interactive";
}) {
  return (
    <span
      style={{
        color: "var(--color-accent)",
        fontWeight: 500,
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </span>
  );
}

"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface SquiggleVariant {
  primary: string;
  ghost: string;
  primaryWidth: number;
  ghostWidth: number;
  primaryOpacity: number;
  ghostOpacity: number;
  bottomOffset: string;
}

const SQUIGGLE_VARIANTS: readonly SquiggleVariant[] = [
  {
    primary: "M1.5 3 Q 18 1.6, 34 3.1 T 62 2.6 T 86 3.2 T 99 2.6",
    ghost: "M3 4.4 Q 22 3.1, 42 4.1 T 68 3.6 T 97 4.1",
    primaryWidth: 1.6, ghostWidth: 1.0,
    primaryOpacity: 0.75, ghostOpacity: 0.45,
    bottomOffset: "-0.22em",
  },
  {
    primary: "M1.5 3.2 L 24 2.4 L 48 3.4 L 72 2.7 L 99 3.3",
    ghost: "M5 4.5 L 30 3.9 L 56 4.6 L 80 4.0 L 98 4.3",
    primaryWidth: 1.5, ghostWidth: 0.9,
    primaryOpacity: 0.72, ghostOpacity: 0.4,
    bottomOffset: "-0.2em",
  },
  {
    primary: "M1.5 2.8 Q 32 4.6, 55 2.9 T 99 3.1",
    ghost: "M4 4.3 Q 38 3.2, 68 4.6 T 97 4.0",
    primaryWidth: 1.7, ghostWidth: 1.0,
    primaryOpacity: 0.78, ghostOpacity: 0.42,
    bottomOffset: "-0.24em",
  },
  {
    primary: "M1.5 3.1 L 58 3 Q 78 2, 92 3.4 T 99 2.8",
    ghost: "M3.5 4.3 L 62 4.25 Q 82 3.6, 95 4.2",
    primaryWidth: 1.5, ghostWidth: 1.0,
    primaryOpacity: 0.7, ghostOpacity: 0.45,
    bottomOffset: "-0.21em",
  },
];

function squiggleIndex(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h + text.charCodeAt(i)) | 0;
  return Math.abs(h) % SQUIGGLE_VARIANTS.length;
}

export function PencilEmphasis({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: "static" | "reveal" | "interactive";
}) {
  const animate = variant === "reveal";
  const text = typeof children === "string" ? children : String(children ?? "");
  const sig = SQUIGGLE_VARIANTS[squiggleIndex(text)];

  return (
    <span
      className="relative inline-block whitespace-nowrap"
      style={{ color: "var(--color-accent)" }}
    >
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-0 right-0"
        style={{ bottom: sig.bottomOffset, width: "100%", height: "0.48em", overflow: "visible" }}
      >
        <motion.path
          d={sig.primary}
          stroke="currentColor"
          strokeWidth={sig.primaryWidth}
          fill="none"
          strokeLinecap="round"
          opacity={sig.primaryOpacity}
          {...(animate
            ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.55, ease: "easeInOut", delay: 0.05 } }
            : {})}
        />
        <motion.path
          d={sig.ghost}
          stroke="currentColor"
          strokeWidth={sig.ghostWidth}
          fill="none"
          strokeLinecap="round"
          opacity={sig.ghostOpacity}
          {...(animate
            ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.55, ease: "easeInOut", delay: 0.22 } }
            : {})}
        />
      </svg>
    </span>
  );
}

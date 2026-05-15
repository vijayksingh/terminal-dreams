"use client";

import { type ReactNode, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";

type WhyBoxProps = {
  question: string;
  children: ReactNode;
};

function Chevron({ expanded }: { expanded: boolean }) {
  const reducedMotion = usePrefersReducedMotion();

  const svg = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M7 5L11 9L7 13"
        stroke="var(--color-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (reducedMotion) {
    return (
      <span
        style={{
          display: "inline-flex",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        }}
      >
        {svg}
      </span>
    );
  }

  return (
    <motion.span
      style={{ display: "inline-flex" }}
      animate={{ rotate: expanded ? 90 : 0 }}
      transition={TRANSITION.collapse}
    >
      {svg}
    </motion.span>
  );
}

export function WhyBox({ question, children }: WhyBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const headerButton = (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHeaderHovered(true)}
      onMouseLeave={() => setHeaderHovered(false)}
      aria-expanded={expanded}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
      style={{
        background: headerHovered ? "var(--color-surface-2)" : "transparent",
        border: "none",
        transition: "background 0.2s",
        borderRadius: "8px 8px 0 0",
      }}
    >
      <span
        className="inline-flex shrink-0 items-center rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-accent)",
          background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          border: "1px solid var(--color-accent)",
          letterSpacing: "0.08em",
          fontSize: 11,
        }}
      >
        Why?
      </span>

      <span
        className="flex-1 text-sm font-medium"
        style={{ color: "var(--color-text)" }}
      >
        {question}
      </span>

      <Chevron expanded={expanded} />
    </button>
  );

  return (
    <div
      className="relative my-6 overflow-hidden rounded-lg"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: "var(--color-accent)" }}
      />

      {reducedMotion ? (
        headerButton
      ) : (
        <motion.div whileHover={{ scale: 1.01 }} transition={SPRING.snappy}>
          {headerButton}
        </motion.div>
      )}

      {reducedMotion ? (
        expanded ? (
          <div
            className="text-sm leading-relaxed"
            style={{
              color: "var(--color-text)",
              background: "var(--color-surface-2)",
              padding: "0 16px 16px 20px",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            {children}
          </div>
        ) : null
      ) : (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="why-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={TRANSITION.collapse}
              style={{ overflow: "hidden" }}
            >
              <div
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--color-text)",
                  background: "var(--color-surface-2)",
                  padding: "12px 16px 16px 20px",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export default WhyBox;

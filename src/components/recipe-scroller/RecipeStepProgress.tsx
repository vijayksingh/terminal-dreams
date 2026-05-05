"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type RefObject, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { RecipeStep } from "@/lib/recipe-types";

const pulseVariants = {
  idle: { scale: 1 },
  active: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.35, ease: "easeInOut" as const },
  },
};

type RecipeStepProgressProps = {
  steps: RecipeStep[];
  activeId: string | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

export function RecipeStepProgress({
  steps,
  activeId,
  scrollContainerRef,
}: RecipeStepProgressProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  function scrollToStep(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const container = scrollContainerRef.current;
    if (container) {
      const containerTop = container.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      const scrollTop = container.scrollTop + (elTop - containerTop) - 80;
      container.scrollTo({ top: scrollTop, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="hidden lg:flex flex-col items-center gap-2 py-8 px-3 lg:sticky lg:top-0 lg:self-start">
      {steps.map((step, i) => {
        const isActive = step.id === activeId;
        const isHovered = step.id === hoveredId;

        return (
          <motion.button
            key={step.id}
            variants={prefersReducedMotion ? undefined : pulseVariants}
            animate={!prefersReducedMotion ? (isActive ? "active" : "idle") : undefined}
            onClick={() => scrollToStep(step.id)}
            onMouseEnter={() => setHoveredId(step.id)}
            onMouseLeave={() => setHoveredId(null)}
            title={step.heading}
            className="group relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono"
            style={
              isActive
                ? {
                    background: "var(--color-text)",
                    color: "var(--color-bg)",
                    border: "1px solid var(--color-text)",
                  }
                : {
                    background: "transparent",
                    color: "var(--color-muted)",
                    border: "1px solid var(--color-border)",
                  }
            }
          >
            {i + 1}

            <AnimatePresence>
              {isHovered && (
                <motion.span
                  initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : -4 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22 }}
                  className="absolute left-full ml-2 whitespace-nowrap text-xs font-mono z-50 pointer-events-none px-2 py-1"
                  style={{
                    color: "var(--color-text)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {step.heading}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

"use client";

import ReactMarkdown from "react-markdown";

import type { RecipeStep } from "@/lib/recipe-types";

type RecipeStepBlockProps = {
  step: RecipeStep;
  stepNumber: number;
  isActive: boolean;
};

export function RecipeStepBlock({ step, stepNumber, isActive }: RecipeStepBlockProps) {
  return (
    <section
      id={step.id}
      className="px-8 py-12 border-l-2 transition-colors duration-300"
      style={{
        borderLeftColor: isActive
          ? "var(--color-text)"
          : "var(--color-border)",
      }}
    >
      <div className="max-w-prose">
        <div className="flex items-baseline gap-3 mb-4">
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: "var(--color-muted)" }}
          >
            {String(stepNumber).padStart(2, "0")}
          </span>
          <h2
            className="text-lg font-semibold leading-snug"
            style={{ color: "var(--color-text)" }}
          >
            {step.heading}
          </h2>
        </div>
        <div
          className="text-sm leading-relaxed prose-step"
          style={{ color: "var(--color-muted)" }}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0" style={{ color: "var(--color-muted)" }}>
                  {children}
                </p>
              ),
              code: ({ children }) => (
                <code
                  className="px-1 py-0.5 rounded text-xs font-mono"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {children}
                </code>
              ),
              em: ({ children }) => (
                <em style={{ color: "var(--color-text)" }}>{children}</em>
              ),
              strong: ({ children }) => (
                <strong style={{ color: "var(--color-text)" }}>{children}</strong>
              ),
            }}
          >
            {step.text}
          </ReactMarkdown>
        </div>
      </div>
    </section>
  );
}

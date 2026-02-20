"use client";

import React from "react";

type FlowchartBlockProps = {
  content: string;
  language?: string;
};

/**
 * FlowchartBlock renders box-drawing ASCII art diagrams as styled <pre> blocks.
 * Used for flowcharts and diagrams that use characters like │▼►◆①②③ etc.
 *
 * If a language prop is provided, this component returns null (delegates to Monaco).
 */
export function FlowchartBlock({ content, language }: FlowchartBlockProps) {
  // If there's a language tag, this should be handled by Monaco instead
  if (language) {
    return null;
  }

  return (
    <figure
      style={{
        margin: "2em 0",
        padding: 0,
      }}
    >
      <pre
        style={{
          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
          fontSize: "14px",
          lineHeight: "1.6",
          padding: "1.5rem",
          backgroundColor: "var(--color-surface-1, #1a1a1a)",
          border: "1px solid var(--color-border, #333)",
          borderRadius: "6px",
          overflow: "auto",
          textAlign: "left",
          whiteSpace: "pre",
          color: "var(--color-text, #e0e0e0)",
        }}
      >
        {content}
      </pre>
    </figure>
  );
}

export default FlowchartBlock;

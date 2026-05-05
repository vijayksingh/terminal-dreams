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
      data-flowchart
      style={{
        margin: "2em 0",
        padding: 0,
        position: "relative",
      }}
    >
      <pre
        style={{
          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
          fontSize: "14px",
          lineHeight: "1.6",
          padding: "1.5rem",
          background: "var(--color-surface, #141414)",
          border: "1px solid var(--color-border, #333)",
          borderRadius: "6px",
          overflow: "auto",
          textAlign: "left",
          whiteSpace: "pre",
          color: "var(--color-text, #e0e0e0)",
          display: "block",
          visibility: "visible",
          opacity: 1,
          minHeight: "2rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        {content}
      </pre>
    </figure>
  );
}

export default FlowchartBlock;

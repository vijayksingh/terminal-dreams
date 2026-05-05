"use client";

import React, { useState, useCallback } from "react";

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
};

type Props = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

export function RecipeCodeBlock({ children }: Props) {
  const codeEl = (
    React.Children.toArray(children).find(React.isValidElement) ?? null
  ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | null;

  const className = (codeEl?.props?.className ?? "") as string;
  const rawLanguage = className.match(/language-(\S+)/)?.[1] ?? "text";
  const _language = LANGUAGE_ALIASES[rawLanguage] ?? rawLanguage;

  const rawCode = codeEl?.props?.children;
  const code = typeof rawCode === "string" ? rawCode.trimEnd() : "";

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div
      style={{
        borderRadius: "var(--radius-1)",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
        margin: "0.75em 0",
        position: "relative",
        background: "var(--color-surface-2)",
      }}
    >
      <pre
        style={{
          margin: 0,
          padding: "12px 16px",
          overflow: "auto",
          fontSize: "13px",
          lineHeight: "1.6",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text)",
          background: "transparent",
          border: "none",
        }}
      >
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          zIndex: 10,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          padding: "2px 8px",
          cursor: "pointer",
          borderRadius: "3px",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

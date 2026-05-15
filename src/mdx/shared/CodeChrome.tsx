"use client";

import { type ReactNode, useCallback, useState } from "react";

type CodeChromeProps = {
  language?: string;
  code?: string;
  filename?: string;
  hint?: string | null;
  children: ReactNode;
};

const LANG_LABELS: Record<string, string> = {
  typescript: "TS",
  javascript: "JS",
  tsx: "TSX",
  jsx: "JSX",
  shell: "SH",
  bash: "SH",
  zsh: "SH",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
  markdown: "MD",
  python: "PY",
  rust: "RS",
  go: "GO",
  sql: "SQL",
  text: "",
};

export function CodeChrome({ language, code, filename, hint, children }: CodeChromeProps) {
  const [copied, setCopied] = useState(false);
  const langLabel = language ? (LANG_LABELS[language] ?? language.toUpperCase()) : "";

  const handleCopy = useCallback(() => {
    if (!code) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);

  return (
    <div className="code-chrome" style={{ margin: "1.25em 0" }}>
      {/* Title bar */}
      <div className="code-chrome-bar">
        <div className="code-chrome-dots">
          <span className="code-chrome-dot code-chrome-dot--red" />
          <span className="code-chrome-dot code-chrome-dot--yellow" />
          <span className="code-chrome-dot code-chrome-dot--green" />
        </div>

        {filename && (
          <span className="code-chrome-filename">{filename}</span>
        )}

        {hint && (
          <span className="code-chrome-hint">
            <span className="code-chrome-hint-dot" />
            {hint}
          </span>
        )}

        <div className="code-chrome-spacer" />

        {langLabel && (
          <span className="code-chrome-lang">{langLabel}</span>
        )}

        {code && (
          <button
            type="button"
            onClick={handleCopy}
            className="code-chrome-copy"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      {/* Editor content */}
      <div className="code-chrome-body">
        {children}
      </div>
    </div>
  );
}

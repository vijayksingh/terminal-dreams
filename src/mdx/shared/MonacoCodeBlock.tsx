"use client";

import dynamic from "next/dynamic";
import React, { useState, useCallback, useRef, useLayoutEffect } from "react";
import type { editor as MonacoEditorApi } from "monaco-editor";
import { setupMonaco } from "@/lib/monaco-setup";
import { VESPER_THEME_NAME } from "@/lib/monaco-vesper";
import { FlowchartBlock } from "./FlowchartBlock";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false }
);

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
};

type Props = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

// Box-drawing and diagram characters used in flowcharts
const FLOWCHART_CHARS = /[│┌┐└┘├┤┬┴┼╔╗╚╝║═▼►◆①②③④⑤⑥⑦⑧⑨]/;

export function MonacoCodeBlock({ children }: Props) {
  // children is the <code> element from the MDX pipeline
  const codeEl = (
    React.Children.toArray(children).find(React.isValidElement) ?? null
  ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | null;

  const className = (codeEl?.props?.className ?? "") as string;
  const rawLanguage = className.match(/language-(\S+)/)?.[1] ?? "text";
  const language = LANGUAGE_ALIASES[rawLanguage] ?? rawLanguage;

  const rawCode = codeEl?.props?.children;
  const code = typeof rawCode === "string" ? rawCode.trimEnd() : "";

  const lineCount = code ? code.split("\n").length : 1;

  const editorRef = useRef<MonacoEditorApi.IStandaloneCodeEditor | null>(null);
  const [editorHeight, setEditorHeight] = useState(() => Math.max(60, lineCount * 20 + 24));

  const handleEditorMount = useCallback((ed: MonacoEditorApi.IStandaloneCodeEditor) => {
    editorRef.current = ed;
    ed.onDidContentSizeChange((e) => {
      setEditorHeight(Math.max(60, e.contentHeight));
    });
    setEditorHeight(Math.max(60, ed.getContentHeight()));
  }, []);

  useLayoutEffect(() => {
    editorRef.current?.layout();
  }, [editorHeight]);

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  // Detect flowcharts: no explicit language and contains box-drawing characters
  const isFlowchart = rawLanguage === "text" && FLOWCHART_CHARS.test(code);

  if (isFlowchart) {
    return <FlowchartBlock content={code} />;
  }

  return (
    <div
      style={{
        height: `${editorHeight}px`,
        borderRadius: "6px",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
        margin: "1em 0",
        position: "relative",
      }}
    >
      <MonacoEditor
        height={`${editorHeight}px`}
        language={language}
        value={code}
        beforeMount={setupMonaco}
        onMount={handleEditorMount}
        theme={VESPER_THEME_NAME}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: "off",
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "none",
          contextmenu: false,
          scrollbar: { vertical: "hidden", horizontal: "hidden", alwaysConsumeMouseWheel: false },
          overviewRulerLanes: 0,
          folding: false,
          guides: { indentation: false },
        }}
      />
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 10,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          color: "var(--color-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          padding: "3px 8px",
          cursor: "pointer",
          borderRadius: "3px",
          transition: "color 0.15s",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default MonacoCodeBlock;

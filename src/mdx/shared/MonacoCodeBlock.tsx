"use client";

import dynamic from "next/dynamic";
import React, { useState, useCallback, useRef, useLayoutEffect } from "react";
import type { editor as MonacoEditorApi } from "monaco-editor";
import { setupMonaco, useMonacoTheme } from "@/lib/monaco-setup";
import { FlowchartBlock } from "./FlowchartBlock";
import { CodeChrome } from "./CodeChrome";
import "./code-chrome.css";

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

const FLOWCHART_CHARS = /[│┌┐└┘├┤┬┴┼╔╗╚╝║═▼►◆①②③④⑤⑥⑦⑧⑨]/;

export function MonacoCodeBlock({ children }: Props) {
  const monacoTheme = useMonacoTheme();
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

  const isFlowchart = rawLanguage === "text" && FLOWCHART_CHARS.test(code);

  if (isFlowchart) {
    return <FlowchartBlock content={code} />;
  }

  return (
    <CodeChrome language={language} code={code}>
      <div style={{ height: `${editorHeight}px` }}>
        <MonacoEditor
          height={`${editorHeight}px`}
          language={language}
          value={code}
          beforeMount={setupMonaco}
          onMount={handleEditorMount}
          theme={monacoTheme}
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
      </div>
    </CodeChrome>
  );
}

export default MonacoCodeBlock;

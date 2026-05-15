"use client";

import React from "react";
import { CodeAnnotator } from "./CodeAnnotator";
import { FlowchartBlock } from "./FlowchartBlock";

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
};

const FLOWCHART_CHARS = /[│┌┐└┘├┤┬┴┼╔╗╚╝║═▼►◆①②③④⑤⑥⑦⑧⑨]/;

type Props = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

export function CodeBlock({ children }: Props) {
  const codeEl = (
    React.Children.toArray(children).find(React.isValidElement) ?? null
  ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | null;

  const className = (codeEl?.props?.className ?? "") as string;
  const rawLanguage = className.match(/language-(\S+)/)?.[1] ?? "text";
  const language = LANGUAGE_ALIASES[rawLanguage] ?? rawLanguage;

  const rawCode = codeEl?.props?.children;
  const code = typeof rawCode === "string" ? rawCode.trimEnd() : "";

  const isFlowchart = rawLanguage === "text" && FLOWCHART_CHARS.test(code);

  if (isFlowchart) {
    return <FlowchartBlock content={code} />;
  }

  return <CodeAnnotator code={code} language={language} />;
}

export default CodeBlock;

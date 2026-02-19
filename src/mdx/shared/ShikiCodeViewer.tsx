"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

type ShikiCodeViewerProps = {
  code: string;
  language: string;
  height: string;
  className?: string;
};

export function ShikiCodeViewer({ code, language, height, className = "" }: ShikiCodeViewerProps) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    codeToHtml(code, {
      lang: language,
      theme: "github-dark",
      transformers: [],
    })
      .then((renderedHtml) => {
        if (!cancelled) {
          setHtml(renderedHtml);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Shiki rendering failed:", err);
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-[#101010] ${className}`}
        style={{ height }}
      >
        <div className="text-xs text-[var(--color-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-auto shiki-code-viewer ${className}`}
      style={{
        height,
        padding: "14px 0",
        fontSize: "14px",
        lineHeight: "1.5",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

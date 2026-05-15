"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

function useShikiTheme() {
  const [theme, setTheme] = useState<"github-dark" | "github-light">("github-dark");
  useEffect(() => {
    const read = () => {
      const val = document.documentElement.getAttribute("data-theme");
      setTheme(val === "light" ? "github-light" : "github-dark");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

type ShikiCodeViewerProps = {
  code: string;
  language: string;
  height: string;
  className?: string;
};

export function ShikiCodeViewer({ code, language, height, className = "" }: ShikiCodeViewerProps) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const shikiTheme = useShikiTheme();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    codeToHtml(code, {
      lang: language,
      theme: shikiTheme,
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
  }, [code, language, shikiTheme]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, background: "var(--color-surface-2)" }}
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

"use client";

import { useState, useEffect, useMemo } from "react";
import type { HighlighterCore, ThemedToken } from "shiki/core";

const THEME_LIGHT = "github-light" as const;
const THEME_DARK = "tokyo-night" as const;

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighterCore } = await import("shiki/core");
      const { createJavaScriptRegexEngine } = await import(
        "shiki/engine/javascript"
      );
      return createHighlighterCore({
        themes: [
          // @ts-expect-error shiki deep imports resolve at runtime
          import("shiki/themes/tokyo-night"),
          // @ts-expect-error shiki deep imports resolve at runtime
          import("shiki/themes/github-light"),
        ],
        // @ts-expect-error shiki deep imports resolve at runtime
        langs: [import("shiki/langs/typescript")],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}

function useIsDark(): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr) {
        setDark(attr === "dark");
      } else {
        setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };
    check();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") { check(); break; }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function useCodeTokens(
  code: string,
  lang = "typescript",
): ThemedToken[][] | null {
  const [hl, setHl] = useState<HighlighterCore | null>(null);
  const isDark = useIsDark();
  const theme = isDark ? THEME_DARK : THEME_LIGHT;

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((instance) => {
      if (!cancelled) setHl(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!hl || !code) return null;
    return hl.codeToTokens(code, { lang, theme }).tokens;
  }, [hl, code, lang, theme]);
}

export function renderTokens(
  tokens: ThemedToken[],
  overrideColor?: string,
): React.ReactNode[] {
  return tokens.map((token, i) => (
    <span key={i} style={{ color: overrideColor ?? token.color }}>
      {token.content}
    </span>
  ));
}

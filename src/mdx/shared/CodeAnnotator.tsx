"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import type { ThemedToken, BundledLanguage, BundledTheme } from "shiki";
import { ANNOTATED_BLOCKS } from "./annotated-blocks";

type Annotation = {
  match: string;
  label: string;
  explanation: string;
};

type ResolvedAnnotation = Annotation & {
  lineIndex: number;
};

type CodeAnnotatorProps = {
  blockId?: string;
  code?: string;
  children?: React.ReactNode;
  language?: string;
  annotations?: Annotation[];
};

const LINE_H = 22;
const PAD_Y = 10;

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
        if (m.attributeName === "data-theme") {
          check();
          break;
        }
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

function resolveAnnotations(
  code: string,
  annotations: Annotation[],
): ResolvedAnnotation[] {
  const lines = code.split("\n");
  const resolved: ResolvedAnnotation[] = [];
  const claimedLines = new Set<number>();

  for (const annotation of annotations) {
    if (!annotation.match) continue;
    const lineIndex = lines.findIndex((line) =>
      line.includes(annotation.match),
    );
    if (lineIndex === -1 || claimedLines.has(lineIndex)) continue;
    claimedLines.add(lineIndex);
    resolved.push({ ...annotation, lineIndex });
  }

  return resolved;
}

function renderTokenLine(tokens: ThemedToken[]): React.ReactNode[] {
  return tokens.map((token, i) => (
    <span key={i} style={{ color: token.color }}>
      {token.content}
    </span>
  ));
}

export function CodeAnnotator({
  blockId,
  code: codeProp,
  children,
  language: langProp,
  annotations: annotProp,
}: CodeAnnotatorProps) {
  const block = blockId ? ANNOTATED_BLOCKS[blockId] : undefined;
  const code = codeProp ?? block?.code ?? (typeof children === "string" ? children : "") ?? "";
  const language = langProp ?? block?.language ?? "typescript";
  const annotations = annotProp ?? block?.annotations ?? [];
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isDark = useIsDark();

  const theme: BundledTheme = isDark ? "tokyo-night" : "github-light";
  const lines = useMemo(() => code.split("\n"), [code]);

  const resolved = useMemo(
    () => resolveAnnotations(code, annotations),
    [code, annotations],
  );

  const lineToAnnotation = useMemo(() => {
    const map = new Map<number, number>();
    resolved.forEach((a, idx) => map.set(a.lineIndex, idx));
    return map;
  }, [resolved]);

  useEffect(() => {
    let cancelled = false;

    import("shiki").then(({ codeToTokens }) =>
      codeToTokens(code, { lang: language as BundledLanguage, theme })
        .then((result) => {
          if (!cancelled) setTokens(result.tokens);
        })
        .catch(() => {}),
    );

    return () => {
      cancelled = true;
    };
  }, [code, language, theme]);

  const handleLineClick = useCallback(
    (lineIdx: number) => {
      const annotIdx = lineToAnnotation.get(lineIdx);
      if (annotIdx === undefined) return;
      setActiveIndex((prev) => (prev === annotIdx ? null : annotIdx));
    },
    [lineToAnnotation],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const activeAnnotation =
    activeIndex !== null ? resolved[activeIndex] : null;
  const activeLineIdx = activeAnnotation?.lineIndex ?? null;

  const annotatedCount = resolved.length;
  const hint =
    activeIndex === null && annotatedCount > 0
      ? `Click a highlighted line to explore (${annotatedCount} annotations)`
      : null;

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        position: "relative",
      }}
    >
      {hint && (
        <div
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--color-muted)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-accent)",
              flexShrink: 0,
            }}
          />
          {hint}
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: hint ? 38 : 8,
          right: 8,
          zIndex: 20,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          padding: "3px 8px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: copied ? "var(--color-accent)" : "var(--color-muted)",
          cursor: "pointer",
          transition: "color 0.15s ease",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>

      <div
        className="relative overflow-x-auto"
        style={{ padding: `${PAD_Y}px 0` }}
      >
        <AnimatePresence>
          {activeLineIdx !== null && (
            <HighlightBar
              lineIndex={activeLineIdx}
              reducedMotion={prefersReducedMotion}
            />
          )}
        </AnimatePresence>

        {lines.map((line, i) => {
          const annotIdx = lineToAnnotation.get(i);
          const isAnnotated = annotIdx !== undefined;
          const isActive = activeLineIdx === i;
          const isDimmed = activeLineIdx !== null && !isActive;
          const isHovered = hoveredLine === i && isAnnotated && !isActive;

          return (
            <div key={i}>
              <div
                role={isAnnotated ? "button" : undefined}
                tabIndex={isAnnotated ? 0 : undefined}
                onClick={isAnnotated ? () => handleLineClick(i) : undefined}
                onKeyDown={
                  isAnnotated
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleLineClick(i);
                        }
                      }
                    : undefined
                }
                onMouseEnter={
                  isAnnotated ? () => setHoveredLine(i) : undefined
                }
                onMouseLeave={
                  isAnnotated ? () => setHoveredLine(null) : undefined
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: LINE_H,
                  position: "relative",
                  zIndex: 10,
                  cursor: isAnnotated ? "pointer" : "default",
                  opacity: isDimmed ? 0.35 : 1,
                  background: isHovered
                    ? "var(--color-surface-2)"
                    : "transparent",
                  transition: "opacity 0.2s ease, background 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 32,
                    textAlign: "right",
                    paddingRight: 8,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: isActive
                      ? "var(--color-accent)"
                      : "var(--color-muted)",
                    userSelect: "none",
                    flexShrink: 0,
                    transition: "color 0.2s ease",
                    fontVariantNumeric: "tabular-nums",
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {i + 1}
                </span>

                <span
                  style={{
                    width: 14,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 4,
                  }}
                >
                  {isAnnotated && (
                    <span
                      style={{
                        width: isHovered || isActive ? 8 : 6,
                        height: isHovered || isActive ? 8 : 6,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        opacity: isActive ? 1 : 0.6,
                        transition: "all 0.15s ease",
                      }}
                    />
                  )}
                </span>

                <span
                  style={{
                    padding: "0 12px 0 0",
                    fontSize: 13,
                    lineHeight: `${LINE_H}px`,
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "pre",
                    flex: 1,
                  }}
                >
                  {tokens ? (
                    renderTokenLine(tokens[i] ?? [])
                  ) : (
                    <span style={{ color: "var(--color-text)" }}>{line}</span>
                  )}
                </span>
              </div>

              <AnimatePresence>
                {isActive && activeAnnotation && (
                  <InlineAnnotation
                    annotation={activeAnnotation}
                    reducedMotion={prefersReducedMotion}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighlightBar({
  lineIndex,
  reducedMotion,
}: {
  lineIndex: number;
  reducedMotion: boolean;
}) {
  const y = lineIndex * LINE_H;

  const style = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: PAD_Y,
    height: LINE_H,
    borderLeft: "3px solid var(--color-accent)",
    background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
    pointerEvents: "none" as const,
  };

  if (reducedMotion) {
    return <div style={{ ...style, top: PAD_Y + y }} />;
  }

  return (
    <motion.div
      style={style}
      initial={{ y, opacity: 0 }}
      animate={{ y, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING.snappy}
    />
  );
}

function InlineAnnotation({
  annotation,
  reducedMotion,
}: {
  annotation: ResolvedAnnotation;
  reducedMotion: boolean;
}) {
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px 10px 50px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      <span
        style={{
          color: "var(--color-accent)",
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        └─
      </span>
      <span style={{ color: "var(--color-text)", opacity: 0.85 }}>
        {annotation.explanation}
      </span>
    </div>
  );

  if (reducedMotion) return content;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={TRANSITION.collapse}
      style={{ overflow: "hidden" }}
    >
      {content}
    </motion.div>
  );
}

export default CodeAnnotator;

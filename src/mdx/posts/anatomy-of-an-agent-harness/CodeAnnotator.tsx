"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { codeToTokens } from "shiki";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import {
  SESSION_TYPE_CODE,
  SESSION_ANNOTATIONS,
  SKILL_FILE_CODE,
  SKILL_ANNOTATIONS,
  BUILD_PIPELINE_CODE,
  BUILD_ANNOTATIONS,
} from "./flue-data";
import type { ThemedToken, BundledLanguage } from "shiki";

type Annotation = {
  match: string;
  label: string;
  explanation: string;
};

type Variant = "session" | "skill" | "build";

const VARIANT_DATA: Record<
  Variant,
  { code: string; language: string; annotations: Annotation[] }
> = {
  session: {
    code: SESSION_TYPE_CODE,
    language: "typescript",
    annotations: SESSION_ANNOTATIONS,
  },
  skill: {
    code: SKILL_FILE_CODE,
    language: "markdown",
    annotations: SKILL_ANNOTATIONS,
  },
  build: {
    code: BUILD_PIPELINE_CODE,
    language: "typescript",
    annotations: BUILD_ANNOTATIONS,
  },
};

type CodeAnnotatorProps = {
  variant?: Variant;
  code?: string;
  language?: string;
  annotations?: Annotation[];
};

type ResolvedAnnotation = Annotation & {
  lineIndex: number;
};

const LINE_H = 22;
const PAD_Y = 10;

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
  variant,
  code: codeProp,
  language: langProp,
  annotations: annotationsProp,
}: CodeAnnotatorProps) {
  const variantData = variant ? VARIANT_DATA[variant] : undefined;
  const code = codeProp ?? variantData?.code ?? "";
  const language = langProp ?? variantData?.language ?? "typescript";
  const annotations = annotationsProp ?? variantData?.annotations ?? [];

  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

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

    codeToTokens(code, { lang: language as BundledLanguage, theme: "github-dark" })
      .then((result) => {
        if (!cancelled) setTokens(result.tokens);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [code, language]);

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

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 8,
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
          transition: "color 0.15s ease, border-color 0.15s ease",
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
                onMouseEnter={isAnnotated ? () => setHoveredLine(i) : undefined}
                onMouseLeave={isAnnotated ? () => setHoveredLine(null) : undefined}
                aria-label={
                  isAnnotated
                    ? `Annotation ${resolved[annotIdx].label}: ${resolved[annotIdx].match}`
                    : undefined
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
                    ? "rgba(201, 149, 107, 0.04)"
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
                    color:
                      isActive
                        ? "var(--color-accent)"
                        : "rgba(255, 255, 255, 0.3)",
                    userSelect: "none",
                    flexShrink: 0,
                    transition: "color 0.2s ease",
                    fontVariantNumeric: "tabular-nums",
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
                        width: isHovered || isActive ? 10 : 8,
                        height: isHovered || isActive ? 10 : 8,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        boxShadow:
                          isHovered || isActive
                            ? "0 0 8px rgba(201, 149, 107, 0.5)"
                            : "none",
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
                  {tokens
                    ? renderTokenLine(tokens[i] ?? [])
                    : <span style={{ color: "#e6edf3" }}>{line}</span>}
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

  if (reducedMotion) {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: PAD_Y + y,
          height: LINE_H,
          borderLeft: "3px solid var(--color-accent)",
          background: "rgba(201, 149, 107, 0.12)",
          boxShadow: "0 0 12px rgba(201, 149, 107, 0.1)",
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <motion.div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: PAD_Y,
        height: LINE_H,
        borderLeft: "3px solid var(--color-accent)",
        background: "rgba(201, 149, 107, 0.12)",
        boxShadow: "0 0 12px rgba(201, 149, 107, 0.1)",
        pointerEvents: "none",
      }}
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
        padding: "10px 14px 10px 36px",
        margin: "2px 8px 2px 36px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.6,
        background: "var(--color-surface-2)",
        borderRadius: 6,
        borderLeft: "2px solid var(--color-accent)",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          background: "var(--color-accent)",
          color: "var(--color-bg)",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {annotation.label}
      </span>
      <span style={{ color: "rgba(255, 255, 255, 0.85)" }}>
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

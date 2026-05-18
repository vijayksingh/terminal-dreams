"use client";

import { SECTIONS, getStopsForSection } from "@/lib/frontend-design-data";
import { useFdProgress } from "@/hooks/use-fd-progress";
import type { FdSectionSlug } from "@/lib/frontend-design-types";
import Link from "next/link";

type Props = {
  sectionSlug: FdSectionSlug;
  currentStopId: string;
};

export function FdArticleNav({ sectionSlug, currentStopId }: Props) {
  const section = SECTIONS.find((s) => s.slug === sectionSlug);
  const { isComplete, markComplete } = useFdProgress();
  if (!section) return null;

  const stops = getStopsForSection(sectionSlug);
  const currentIndex = stops.findIndex((s) => s.id === currentStopId);
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? stops[currentIndex - 1] : null;
  const next = currentIndex < stops.length - 1 ? stops[currentIndex + 1] : null;
  const completed = isComplete(currentStopId);

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: "var(--color-muted)",
        marginTop: "var(--space-8)",
        paddingTop: "var(--space-4)",
        borderTop: "1px solid var(--color-border)",
      }}
      aria-label="Article navigation"
    >
      {/* Mark complete */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => markComplete(currentStopId)}
          disabled={completed}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            padding: "6px 16px",
            border: `1px solid ${completed ? `var(${section.colorToken})` : "var(--color-border)"}`,
            background: completed ? `var(${section.colorToken})` : "transparent",
            color: completed ? "var(--color-bg)" : "var(--color-muted)",
            cursor: completed ? "default" : "pointer",
            transition: "border-color 0.15s, background 0.15s, color 0.15s",
            letterSpacing: "0.02em",
          }}
        >
          {completed ? "✓ Completed" : "Mark as complete"}
        </button>
      </div>

      {/* Prev / dots / next */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {prev ? (
          <Link
            href={`/frontend-design/${prev.slug}`}
            style={{ color: "var(--color-muted)", textDecoration: "none" }}
          >
            ← {prev.label}
          </Link>
        ) : (
          <span />
        )}

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {stops.map((stop) => (
            <span
              key={stop.id}
              style={{
                width: stop.id === currentStopId ? 8 : 5,
                height: stop.id === currentStopId ? 8 : 5,
                borderRadius: "50%",
                backgroundColor:
                  stop.id === currentStopId
                    ? `var(${section.colorToken})`
                    : isComplete(stop.id)
                      ? `var(${section.colorToken})`
                      : "var(--color-border)",
                opacity: stop.id === currentStopId ? 1 : isComplete(stop.id) ? 0.5 : 1,
              }}
            />
          ))}
        </div>

        {next ? (
          <Link
            href={`/frontend-design/${next.slug}`}
            style={{ color: "var(--color-muted)", textDecoration: "none" }}
          >
            {next.label} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}

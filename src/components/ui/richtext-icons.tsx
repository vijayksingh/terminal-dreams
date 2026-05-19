"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// Custom SVG iconography for rich-text personality.
// All icons inherit `currentColor` from context — method theme for
// endpoints, accent for strong marker. Sized in em so they scale
// with surrounding text typography.

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
} as const;

// ── HTTP method icons ────────────────────────────────────────────
// Each glyph signals the verb's *action*:
//   GET     ↓ data flowing down (fetch)
//   POST    ↑ data flowing up (create/send)
//   PUT     ↻ full replace (cycle arrow)
//   PATCH   ✎ partial edit (pencil)
//   DELETE  × remove
//   HEAD    ≡ headers only (stacked lines)
//   OPTIONS ⋯ what's available (dots)

export function MethodIcon({ method }: { method: string }) {
  const common = {
    width: "1em",
    height: "1em",
    viewBox: "0 0 16 16",
    "aria-hidden": true,
  } as const;

  switch (method) {
    case "GET":
      return (
        <svg {...common}>
          <path d="M8 3 L8 11 M4.5 7.5 L8 11 L11.5 7.5" {...STROKE_PROPS} />
        </svg>
      );
    case "POST":
      return (
        <svg {...common}>
          <path d="M8 13 L8 5 M4.5 8.5 L8 5 L11.5 8.5" {...STROKE_PROPS} />
        </svg>
      );
    case "PUT":
      return (
        <svg {...common}>
          <path
            d="M12.5 8 A4.5 4.5 0 1 1 8 3.5 M9.5 1.5 L12.5 3.5 L10.5 6"
            {...STROKE_PROPS}
          />
        </svg>
      );
    case "PATCH":
      return (
        <svg {...common}>
          <path
            d="M3 13 L9.5 6.5 L11.5 8.5 L5 15 Z M9 7 L11 9"
            {...STROKE_PROPS}
          />
        </svg>
      );
    case "DELETE":
      return (
        <svg {...common}>
          <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" {...STROKE_PROPS} />
        </svg>
      );
    case "HEAD":
      return (
        <svg {...common}>
          <path
            d="M3 5 L13 5 M3 8.5 L11 8.5 M3 12 L8 12"
            {...STROKE_PROPS}
          />
        </svg>
      );
    case "OPTIONS":
      return (
        <svg {...common}>
          <circle cx="3.5" cy="8" r="1.4" fill="currentColor" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
          <circle cx="12.5" cy="8" r="1.4" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
        </svg>
      );
  }
}

// ── Strong leading marker ────────────────────────────────────────
// A custom "tag/flag" silhouette pointing into the text — replaces
// the plain 3px CSS rectangle with a distinctive terminal-y mark.
// Asymmetric: wider on the start side, notched on the right edge.

export function StrongMarker() {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) {
    return (
      <svg viewBox="0 0 8 14" width="0.5em" height="0.9em" aria-hidden>
        <path d="M0 0 H6 L8 7 L6 14 H0 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <motion.svg
      viewBox="0 0 8 14"
      width="0.5em"
      height="0.9em"
      aria-hidden
      initial={{ scale: 0.55, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: "50% 50%" }}
    >
      <path d="M0 0 H6 L8 7 L6 14 H0 Z" fill="currentColor" />
    </motion.svg>
  );
}

// ── List bullet (pentagon arrow, same family as StrongMarker) ────
// Static SVG — entrance is orchestrated by the parent RichList's
// motion.ul via `staggerChildren`, not by per-bullet variants.
export function ListBullet() {
  return (
    <svg viewBox="0 0 8 10" width="0.5em" height="0.55em" aria-hidden>
      <path
        d="M0 0 H6 L8 5 L6 10 H0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Prose arrows ─────────────────────────────────────────────────
// Replaces the typographic upgrade (→ → ⟶) with hand-drawn SVG.
// Singles get a tail dot + single chevron head (movement, mapping).
// Doubles get a double chevron head, no tail (implies, therefore).
//
// Falls back to Unicode for arrows we don't have a custom path for
// (↔, ↑, ↓) — the matcher in RichText.tsx may still pass them in.

const ARROW_PATHS: Record<string, string> = {
  // viewBox 0 0 16 6, baseline y=3
  // single right: tail dot + shaft + single chevron
  "→": "M2 3 L12 3 M9 0.6 L12 3 L9 5.4",
  "←": "M14 3 L4 3 M7 0.6 L4 3 L7 5.4",
  // double right/left: no tail dot, double chevron head
  "⇒": "M0 3 L9.5 3 M6 0.6 L8.5 3 L6 5.4 M9 0.6 L11.5 3 L9 5.4",
  "⇐": "M16 3 L6.5 3 M10 0.6 L7.5 3 L10 5.4 M7 0.6 L4.5 3 L7 5.4",
};

const ARROW_HAS_TAIL: Record<string, boolean> = {
  "→": true,
  "←": true,
  "⇒": false,
  "⇐": false,
};

export function CustomArrow({ glyph }: { glyph: string }) {
  const path = ARROW_PATHS[glyph];
  if (!path) {
    return <span style={{ color: "var(--color-accent)" }}>{glyph}</span>;
  }

  const isLeft = glyph === "←" || glyph === "⇐";
  const hasTail = ARROW_HAS_TAIL[glyph];

  return (
    <span className="rich-arrow" aria-hidden>
      <svg
        viewBox="0 0 16 6"
        width="1.15em"
        height="0.45em"
      >
        {hasTail && (
          <circle
            cx={isLeft ? 14.6 : 1.4}
            cy={3}
            r={0.75}
            fill="currentColor"
          />
        )}
        <path d={path} {...STROKE_PROPS} />
      </svg>
    </span>
  );
}

// ── Blockquote opening mark ──────────────────────────────────────
// Two filled "comma" shapes that read as ❝ — sits at the top-left
// of pull-quotes for editorial gravity. Replaces the lonely left bar.

export function BlockquoteMark() {
  return (
    <svg
      viewBox="0 0 24 18"
      width="2.2em"
      height="1.65em"
      aria-hidden
    >
      <path
        d="M0 14 Q0 3 8 1 L8 4 Q3 5 3 14 Z"
        fill="currentColor"
      />
      <path
        d="M12 14 Q12 3 20 1 L20 4 Q15 5 15 14 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── External link arrow ──────────────────────────────────────────
// A small arrow from bottom-left to top-right with a tail dot.
// Mirrors the prose-arrow language — same iconographic motif.

export function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 10 10"
      width="0.72em"
      height="0.72em"
      aria-hidden
    >
      <circle cx="2.2" cy="7.8" r="0.65" fill="currentColor" />
      <path
        d="M2.7 7.3 L7.6 2.4 M4.8 2.4 L7.6 2.4 L7.6 5.2"
        {...STROKE_PROPS}
      />
    </svg>
  );
}

// ── Divider variants ─────────────────────────────────────────────
// Four hand-drawn `<hr>` motifs picked stably per instance via the
// caller's hashed id. Avoids hydration mismatch (no Math.random())
// while still giving each divider on a page its own character.

export const DIVIDER_COUNT = 4;

const DIVIDER_SVG_STYLE = {
  width: "min(100%, 180px)",
  height: "8px",
  overflow: "visible",
} as const;

// Common viewport-once trigger for divider entrance.
const DIVIDER_VIEWPORT = { once: true, margin: "-30px" } as const;

// Shared "draw stroke in" config. Each variant has a target opacity
// (thin lines sit at 0.4, sparks at 0.62, etc.) — animate TO that,
// not to 1, so the final state matches the original static design.
function drawStroke(delay = 0, duration = 0.7, opacity = 1) {
  return {
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity },
    viewport: DIVIDER_VIEWPORT,
    transition: {
      pathLength: { duration, ease: [0.16, 1, 0.3, 1] as const, delay },
      opacity: { duration: 0.2, delay },
    },
  };
}

// Fade+scale for fill-shape elements (e.g. diamonds) since pathLength
// doesn't apply meaningfully to closed fill paths.
function fadeFill(delay = 0, opacity = 1) {
  return {
    initial: { opacity: 0, scale: 0.6 },
    whileInView: { opacity, scale: 1 },
    viewport: DIVIDER_VIEWPORT,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const, delay },
  };
}

export function DividerVariant({ index }: { index: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const i =
    ((index % DIVIDER_COUNT) + DIVIDER_COUNT) % DIVIDER_COUNT;

  // Reduced-motion: emit each variant's static final state — no motion.
  if (reducedMotion) {
    return <StaticDividerVariant index={i} />;
  }

  switch (i) {
    case 1: // asterisk burst — flanking lines first, then central spark
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          <motion.path
            d="M0 4 H80"
            stroke="currentColor"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0, 0.55, 0.4)}
          />
          <motion.path
            d="M120 4 H200"
            stroke="currentColor"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0.15, 0.55, 0.4)}
          />
          <motion.path
            d="M100 1 V7 M96 4 H104 M97 1.5 L103 6.5 M97 6.5 L103 1.5"
            stroke="currentColor"
            strokeWidth={1.1}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0.45, 0.4, 0.62)}
          />
        </svg>
      );
    case 2: // pixel dashes — left-to-right cascade
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          {Array.from({ length: 11 }, (_, n) => (
            <motion.path
              key={n}
              d={`M${n * 18 + 2} 4 H${n * 18 + 14}`}
              stroke="currentColor"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              {...drawStroke(n * 0.04, 0.3, 0.42)}
            />
          ))}
        </svg>
      );
    case 3: // three diamonds — lines draw in, then diamonds bloom
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          <motion.path
            d="M0 4 H82"
            stroke="currentColor"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0, 0.6, 0.4)}
          />
          <motion.path
            d="M118 4 H200"
            stroke="currentColor"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0.15, 0.6, 0.4)}
          />
          <motion.path
            d="M89 4 L92 2 L95 4 L92 6 Z"
            fill="currentColor"
            style={{ transformOrigin: "92px 4px" }}
            {...fadeFill(0.5, 0.58)}
          />
          <motion.path
            d="M97 4 L100 2 L103 4 L100 6 Z"
            fill="currentColor"
            style={{ transformOrigin: "100px 4px" }}
            {...fadeFill(0.6, 0.58)}
          />
          <motion.path
            d="M105 4 L108 2 L111 4 L108 6 Z"
            fill="currentColor"
            style={{ transformOrigin: "108px 4px" }}
            {...fadeFill(0.7, 0.58)}
          />
        </svg>
      );
    case 0: // organic wave — primary first, then ghost trails
    default:
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          <motion.path
            d="M0 4 Q 25 1.5, 50 4 T 100 3.5 T 150 4.2 T 200 3.8"
            stroke="currentColor"
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0, 0.7, 0.4)}
          />
          <motion.path
            d="M4 5.2 Q 30 4.2, 55 5.2 T 105 4.8 T 155 5.4 T 198 5.0"
            stroke="currentColor"
            strokeWidth={0.8}
            fill="none"
            strokeLinecap="round"
            {...drawStroke(0.25, 0.6, 0.2)}
          />
        </svg>
      );
  }
}

// Static fallback for reduced-motion users.
function StaticDividerVariant({ index }: { index: number }) {
  switch (index) {
    case 1:
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          <path d="M0 4 H80" stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.4} />
          <path d="M120 4 H200" stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.4} />
          <path d="M100 1 V7 M96 4 H104 M97 1.5 L103 6.5 M97 6.5 L103 1.5" stroke="currentColor" strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.62} />
        </svg>
      );
    case 2:
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          {Array.from({ length: 11 }, (_, n) => (
            <path key={n} d={`M${n * 18 + 2} 4 H${n * 18 + 14}`} stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.42} />
          ))}
        </svg>
      );
    case 3:
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          <path d="M0 4 H82" stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.4} />
          <path d="M118 4 H200" stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.4} />
          <path d="M89 4 L92 2 L95 4 L92 6 Z M97 4 L100 2 L103 4 L100 6 Z M105 4 L108 2 L111 4 L108 6 Z" fill="currentColor" opacity={0.58} />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          style={DIVIDER_SVG_STYLE}
          aria-hidden
        >
          <path d="M0 4 Q 25 1.5, 50 4 T 100 3.5 T 150 4.2 T 200 3.8" stroke="currentColor" strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.4} />
          <path d="M4 5.2 Q 30 4.2, 55 5.2 T 105 4.8 T 155 5.4 T 198 5.0" stroke="currentColor" strokeWidth={0.8} fill="none" strokeLinecap="round" opacity={0.2} />
        </svg>
      );
  }
}

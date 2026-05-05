"use client";

import { motion } from "framer-motion";
import { type ReactNode, memo } from "react";
import { SPRING, STAGGER } from "@/lib/motion";
import { PencilEmphasis } from "./richtext-pencil";

// ─── Types ────────────────────────────────────
//
// Monochromatic color mapping (retro terminal aesthetic):
//   code/comparison → Accent (warm amber)   — technical inline references
//   keyword/arrow   → Accent (warm amber)   — signal phrases + flow markers
//   emphasis        → Accent + pencil       — defined terms / acronyms
//   boolean         → Muted (gray)          — language literals, soft contrast
//   prose-number    → Text (default weight) — tabular-nums for readability
//
type SegmentType =
  | "text" | "code" | "emphasis" | "keyword"
  | "arrow" | "boolean" | "prose-number" | "comparison";

type RichTextVariant = "static" | "reveal" | "interactive";

interface Segment {
  type: SegmentType;
  display: string;
  start: number;
  end: number;
}

// ─── Hoisted constants ────────────────────────
const ROOT_STYLE = { contain: "layout style paint" } as const;
const INLINE = { display: "inline" } as const;
const HOVER_CODE = { scale: 1.04 } as const;
const REVEAL_FROM = { opacity: 0, y: 4 };
const REVEAL_TO = { opacity: 1, y: 0 };

// ─── Pattern matchers ─────────────────────────
// Adapted for engineering blog prose. Order = priority.

interface MatcherDef {
  re: RegExp;
  type: SegmentType;
  display?: (m: RegExpExecArray) => string;
}

const MATCHERS: MatcherDef[] = [
  // 1. Backtick code — highest priority
  { re: /`([^`]+)`/g, type: "code", display: (m) => m[1] },

  // 2. Quoted keywords — "sorted array", "two-phase commit"
  { re: /"([^"]{2,})"/g, type: "keyword" },

  // 3. Complexity notation — O(n), O(n²), O(n log n)
  { re: /O\([^)]+\)/g, type: "code" },

  // 4. Dot-access / method calls — ctx.auth, map.get(x), node.left
  { re: /\b[a-zA-Z_]\w+\.\w+(?:\([^)]*\))?/g, type: "code" },

  // 5. Function calls — fetch(), spawn(x), useCallback()
  { re: /\b[a-z]\w+\([^)]*\)/g, type: "code" },

  // 6. ALL CAPS technical terms (3+ chars) — API, LLM, SDK, CLI
  { re: /\b[A-Z][A-Z_-]{2,}\b/g, type: "emphasis" },

  // 7. Arrow notation — → ← ⇒ ↔ (typographic upgrade)
  { re: /[←→⇒⇐↔↑↓]+/g, type: "arrow" },

  // 8. Boolean/null literals
  { re: /\b(true|false|null|undefined)\b/g, type: "boolean" },

  // 9. Comparison operators — typographic upgrade (>= → ≥)
  {
    re: />=|<=|!=/g,
    type: "comparison",
    display: (m: RegExpExecArray) =>
      ({ ">=": "≥", "<=": "≤", "!=": "≠" } as Record<string, string>)[m[0]] ?? m[0],
  },

  // 10. Prose numbers — standalone digits
  { re: /\b\d+\b/g, type: "prose-number" },
];

const COMPILED = MATCHERS.map(({ re, type, display }) => ({
  regex: new RegExp(re.source, re.flags),
  type,
  display,
}));

// ─── Parser with module-level cache ───────────

const PARSE_CACHE = new Map<string, readonly Segment[]>();

function parse(text: string): readonly Segment[] {
  const cached = PARSE_CACHE.get(text);
  if (cached) return cached;

  const raw: Segment[] = [];
  for (const { regex, type, display } of COMPILED) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      raw.push({
        type,
        display: display ? display(m) : m[0],
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  raw.sort((a, b) => a.start - b.start);

  const kept: Segment[] = [];
  let cursor = 0;
  for (const seg of raw) {
    if (seg.start >= cursor) {
      kept.push(seg);
      cursor = seg.end;
    }
  }

  const result: Segment[] = [];
  let pos = 0;
  for (const seg of kept) {
    if (pos < seg.start)
      result.push({ type: "text", display: text.slice(pos, seg.start), start: pos, end: seg.start });
    result.push(seg);
    pos = seg.end;
  }
  if (pos < text.length)
    result.push({ type: "text", display: text.slice(pos), start: pos, end: text.length });

  const frozen = Object.freeze(result) as readonly Segment[];
  PARSE_CACHE.set(text, frozen);
  return frozen;
}

// ─── Segment styles (CSS custom properties) ───

const S_CODE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  color: "var(--color-accent)",
};

const S_KEYWORD: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: "1.02em",
  color: "var(--color-accent)",
};

const S_ARROW: React.CSSProperties = {
  color: "var(--color-accent)",
  fontWeight: 500,
  padding: "0 0.15em",
  letterSpacing: "-0.02em",
};

const S_BOOLEAN: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  color: "var(--color-muted)",
  fontVariant: "small-caps",
  letterSpacing: "0.04em",
};

const S_NUMBER: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
};

const S_COMPARISON: React.CSSProperties = {
  color: "var(--color-accent)",
  fontWeight: 600,
  fontSize: "1.1em",
  padding: "0 0.15em",
};

const ARROW_MAP: Record<string, string> = {
  "→": "⟶",  // → to ⟶
  "←": "⟵",  // ← to ⟵
  "⇒": "⟹",  // ⇒ to ⟹
  "⇐": "⟸",  // ⇐ to ⟸
};

// ─── Segment renderer ─────────────────────────

function renderSegment(seg: Segment, variant: RichTextVariant): ReactNode {
  const k = seg.start;

  switch (seg.type) {
    case "code":
      return variant === "interactive"
        ? <motion.code key={k} className="richtext-code-pill" style={S_CODE} whileHover={HOVER_CODE} transition={SPRING.snappy}>{seg.display}</motion.code>
        : <code key={k} style={S_CODE}>{seg.display}</code>;

    case "boolean":
      return <span key={k} style={S_BOOLEAN}>{seg.display}</span>;

    case "emphasis":
      return <PencilEmphasis key={k} variant={variant}>{seg.display}</PencilEmphasis>;

    case "keyword": {
      const curly = seg.display
        .replace(/^"/, "“").replace(/"$/, "”")
        .replace(/^'/, "‘").replace(/'$/, "’");
      return <span key={k} style={S_KEYWORD}>{curly}</span>;
    }

    case "arrow":
      return <span key={k} style={S_ARROW}>{ARROW_MAP[seg.display] ?? seg.display}</span>;

    case "comparison":
      return <span key={k} style={S_COMPARISON}>{seg.display}</span>;

    case "prose-number":
      return <span key={k} style={S_NUMBER}>{seg.display}</span>;

    default:
      return seg.display;
  }
}

// ─── Static render cache ──────────────────────

const STATIC_CACHE = new Map<string, ReactNode[]>();

function getStaticNodes(children: string, segments: readonly Segment[]): ReactNode[] {
  let nodes = STATIC_CACHE.get(children);
  if (!nodes) {
    nodes = segments.map((seg) => renderSegment(seg, "static"));
    STATIC_CACHE.set(children, nodes);
  }
  return nodes;
}

// ─── Component ────────────────────────────────

export const RichText = memo(function RichText({
  children,
  variant = "static",
}: {
  children: string;
  variant?: RichTextVariant;
}) {
  const segments = parse(children);

  if (variant === "static") {
    return <span className="richtext-root" style={ROOT_STYLE}>{getStaticNodes(children, segments)}</span>;
  }

  if (variant === "reveal") {
    let si = 0;
    const nodes = segments.map((seg) => {
      if (seg.type === "text") return seg.display;
      const delay = si++ * STAGGER.fast;
      return (
        <motion.span
          key={seg.start}
          initial={REVEAL_FROM}
          animate={REVEAL_TO}
          transition={{ ...SPRING.snappy, delay }}
          style={INLINE}
        >
          {renderSegment(seg, "reveal")}
        </motion.span>
      );
    });
    return <span className="richtext-root" style={ROOT_STYLE}>{nodes}</span>;
  }

  return (
    <span className="richtext-root" style={ROOT_STYLE}>
      {segments.map((seg) => renderSegment(seg, "interactive"))}
    </span>
  );
});

export default RichText;

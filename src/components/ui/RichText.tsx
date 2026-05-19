"use client";

import { motion } from "framer-motion";
import { type ReactNode, memo } from "react";
import { SPRING, STAGGER } from "@/lib/motion";
import { PencilEmphasis } from "./richtext-pencil";
import {
  ApiEndpoint,
  ENDPOINT_RE,
  DurationBadge,
  SizeBadge,
  PercentileBadge,
  PercentageBadge,
  MultiplierBadge,
  ComplexityBadge,
} from "./richtext-endpoint";
import { CustomArrow } from "./richtext-icons";

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
  | "arrow" | "boolean" | "prose-number" | "comparison"
  | "endpoint" | "duration" | "size"
  | "percentile" | "percentage" | "multiplier" | "complexity";

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

  // 1b. HTTP endpoint — verb + path read as a single semantic atom
  // (must beat the ALL-CAPS matcher below, else `GET` gets pencil-emphasised
  // while `/api/...` falls back to plain text)
  { re: /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^\s,;)\]"']+)/g, type: "endpoint" },

  // 1c. Duration — multi-char units only in bare prose. Bare `s`/`m`/`h`
  // false-positive too aggressively (e.g. "1990s" the decade). Inside
  // backticks SmartCode handles those via the anchored DURATION_RE.
  { re: /\b(\d+(?:\.\d+)?)(ms|μs|us|ns)\b/g, type: "duration" },

  // 1d. Storage size — "200 bytes", "2 KB", "36 KB", "1.5 MB".
  // Conservative case-sensitive units in bare prose; broader inside ticks.
  { re: /\b(\d+(?:\.\d+)?)\s?(bytes?|KB|MB|GB|TB|KiB|MiB|GiB|TiB)\b/g, type: "size" },

  // 1e. Percentile — "p95", "p99", "p99.9". Tight allowlist + negative
  // lookahead so "p5.js" doesn't false-positive on the `5`.
  {
    re: /\bp(5|10|25|50|75|90|95|99(?:\.9{1,3})?)(?![a-zA-Z\d.])/g,
    type: "percentile",
  },

  // 1f. Percentage — "95%", "0.5%", "99.99%". Must win priority over
  // bare prose-number, else only "95" gets chipped and "%" stays text.
  { re: /\b(\d+(?:\.\d+)?)%/g, type: "percentage" },

  // 1g. Multiplier — "10×", "5x" (with trailing space or punctuation,
  // so "100x100" image dims don't false-positive).
  { re: /\b(\d+(?:\.\d+)?)([×x])(?=\s|$|[,.;)\]])/g, type: "multiplier" },

  // 2. Quoted keywords — "sorted array", "two-phase commit"
  { re: /"([^"]{2,})"/g, type: "keyword" },

  // 3. Complexity notation — O(n), O(n²), O(n log n) — math typography
  { re: /O\([^)]+\)/g, type: "complexity" },

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

// Code styling lives entirely in `.richtext-code-pill` (globals.css) so
// the cyan-teal code color, bg tint, and border come from one place.

const S_KEYWORD: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontStyle: "italic",
  fontSize: "1.02em",
  color: "var(--color-accent)",
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

// ─── Segment renderer ─────────────────────────

function renderSegment(seg: Segment, variant: RichTextVariant): ReactNode {
  const k = seg.start;

  switch (seg.type) {
    case "code":
      return variant === "interactive"
        ? <motion.code key={k} className="richtext-code-pill" whileHover={HOVER_CODE} transition={SPRING.snappy}>{seg.display}</motion.code>
        : <code key={k} className="richtext-code-pill">{seg.display}</code>;

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
      return <CustomArrow key={k} glyph={seg.display} />;

    case "comparison":
      return <span key={k} style={S_COMPARISON}>{seg.display}</span>;

    case "prose-number":
      return <span key={k} style={S_NUMBER}>{seg.display}</span>;

    case "endpoint": {
      const m = ENDPOINT_RE.exec(seg.display);
      if (!m) return seg.display;
      return <ApiEndpoint key={k} method={m[1]} path={m[2]} />;
    }

    case "duration": {
      const m = /^(\d+(?:\.\d+)?)(ms|μs|us|ns)$/.exec(seg.display);
      if (!m) return seg.display;
      return <DurationBadge key={k} value={m[1]} unit={m[2]} />;
    }

    case "size": {
      const m = /^(\d+(?:\.\d+)?)\s?(bytes?|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/.exec(seg.display);
      if (!m) return seg.display;
      return <SizeBadge key={k} value={m[1]} unit={m[2]} />;
    }

    case "percentile": {
      const m = /^p(\d+(?:\.\d+)?)$/.exec(seg.display);
      if (!m) return seg.display;
      return <PercentileBadge key={k} value={m[1]} />;
    }

    case "percentage": {
      const m = /^(\d+(?:\.\d+)?)%$/.exec(seg.display);
      if (!m) return seg.display;
      return <PercentageBadge key={k} value={m[1]} />;
    }

    case "multiplier": {
      const m = /^(\d+(?:\.\d+)?)([×x])$/.exec(seg.display);
      if (!m) return seg.display;
      return <MultiplierBadge key={k} value={m[1]} op={m[2]} />;
    }

    case "complexity": {
      const m = /^O\(([^)]+)\)$/.exec(seg.display);
      if (!m) return seg.display;
      return <ComplexityBadge key={k} inner={m[1]} />;
    }

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

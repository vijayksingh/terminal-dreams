"use client";

import { motion } from "framer-motion";
import { Children, Fragment, type ReactNode, type CSSProperties } from "react";
import { SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import {
  ENDPOINT_RE,
  TYPE_RE,
  DURATION_RE,
  SIZE_RE,
  PERCENTILE_RE,
  PERCENTAGE_RE,
  MULTIPLIER_RE,
  COMPLEXITY_RE,
} from "./chip-detect";
import { MethodIcon } from "./richtext-icons";
export {
  ENDPOINT_RE,
  TYPE_RE,
  DURATION_RE,
  SIZE_RE,
  PERCENTILE_RE,
  PERCENTAGE_RE,
  MULTIPLIER_RE,
  COMPLEXITY_RE,
  isChipText,
} from "./chip-detect";

// ── HTTP method palette ───────────────────────────────────────────────
// Mapped to existing feedback tokens — keeps theme switching automatic.
interface MethodTheme {
  accent: string;
  surface: string;
  border: string;
}

const METHOD_THEME: Record<string, MethodTheme> = {
  GET: {
    accent: "var(--color-success)",
    surface:
      "color-mix(in srgb, var(--color-success) 14%, var(--color-surface-2))",
    border:
      "color-mix(in srgb, var(--color-success) 35%, transparent)",
  },
  POST: {
    accent: "var(--color-link)",
    surface:
      "color-mix(in srgb, var(--color-link) 14%, var(--color-surface-2))",
    border:
      "color-mix(in srgb, var(--color-link) 35%, transparent)",
  },
  PUT: {
    accent: "var(--color-warning)",
    surface:
      "color-mix(in srgb, var(--color-warning) 14%, var(--color-surface-2))",
    border:
      "color-mix(in srgb, var(--color-warning) 35%, transparent)",
  },
  PATCH: {
    accent: "var(--color-warning)",
    surface:
      "color-mix(in srgb, var(--color-warning) 14%, var(--color-surface-2))",
    border:
      "color-mix(in srgb, var(--color-warning) 35%, transparent)",
  },
  DELETE: {
    accent: "var(--color-error)",
    surface:
      "color-mix(in srgb, var(--color-error) 14%, var(--color-surface-2))",
    border:
      "color-mix(in srgb, var(--color-error) 35%, transparent)",
  },
  HEAD: {
    accent: "var(--color-muted)",
    surface: "var(--color-surface-2)",
    border: "var(--color-border)",
  },
  OPTIONS: {
    accent: "var(--color-muted)",
    surface: "var(--color-surface-2)",
    border: "var(--color-border)",
  },
};

// ── ApiEndpoint chip ──────────────────────────────────────────────────
// Treats `GET /api/feed` as ONE atom: verb-pill + path with parameter
// highlighting. Hover surfaces a subtle "request-in-flight" dot pulse.
export function ApiEndpoint({
  method,
  path,
}: {
  method: string;
  path: string;
}) {
  const theme = METHOD_THEME[method] ?? METHOD_THEME.GET;

  return (
    <motion.span
      className="api-endpoint"
      style={{
        ["--api-accent" as string]: theme.accent,
        ["--api-surface" as string]: theme.surface,
        ["--api-border" as string]: theme.border,
      } as CSSProperties}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <span className="api-endpoint-method">
        <motion.span
          className="api-endpoint-icon"
          aria-hidden
          variants={{
            rest: { scale: 1 },
            hover: { scale: [1, 1.18, 1] },
          }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
        >
          <MethodIcon method={method} />
        </motion.span>
        {method}
      </span>
      <motion.span
        className="api-endpoint-path"
        variants={{
          rest: { x: 0 },
          hover: { x: 1 },
        }}
        transition={SPRING.snappy}
      >
        <PathSegments path={path} />
      </motion.span>
    </motion.span>
  );
}

function PathSegments({ path }: { path: string }) {
  // Split off query string so we never highlight inside it.
  const [pathPart, queryPart] = path.split("?", 2);
  const parts = pathPart.split("/").filter(Boolean);

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          <span className="api-endpoint-slash">/</span>
          {part.startsWith(":") ? (
            <span className="api-endpoint-param">{part}</span>
          ) : (
            <span className="api-endpoint-segment">{part}</span>
          )}
        </Fragment>
      ))}
      {queryPart ? (
        <span className="api-endpoint-query">?{queryPart}</span>
      ) : null}
    </>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────
// PascalCase identifier with optional generic and/or array brackets.
// Brackets bloom outward on viewport entry — "type opens to reveal its
// shape" gesture. Once per badge per session.
const BRACKET_VARIANTS_LEFT = {
  hidden: { scale: 0.7, opacity: 0, x: 3 },
  visible: { scale: 1, opacity: 1, x: 0 },
};
const BRACKET_VARIANTS_RIGHT = {
  hidden: { scale: 0.7, opacity: 0, x: -3 },
  visible: { scale: 1, opacity: 1, x: 0 },
};
const BRACKET_TRANSITION = {
  duration: 0.38,
  ease: [0.16, 1, 0.3, 1] as const,
};
const BRACKET_VIEWPORT = { once: true, margin: "-30px" } as const;

export function TypeBadge({ text }: { text: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const m = TYPE_RE.exec(text);
  if (!m) {
    return <code className="richtext-code-pill type-chip">{text}</code>;
  }
  const [, name, generic, array] = m;

  if (reducedMotion) {
    return (
      <span className="type-chip">
        <span className="type-chip-marker" aria-hidden>⟨</span>
        <span className="type-chip-name">{name}</span>
        {generic ? <span className="type-chip-generic">{generic}</span> : null}
        {array ? <span className="type-chip-array">[ ]</span> : null}
        <span className="type-chip-marker" aria-hidden>⟩</span>
      </span>
    );
  }

  return (
    <span className="type-chip">
      <motion.span
        className="type-chip-marker"
        aria-hidden
        variants={BRACKET_VARIANTS_LEFT}
        initial="hidden"
        whileInView="visible"
        viewport={BRACKET_VIEWPORT}
        transition={BRACKET_TRANSITION}
        style={{ display: "inline-block", transformOrigin: "right center" }}
      >
        ⟨
      </motion.span>
      <span className="type-chip-name">{name}</span>
      {generic ? (
        <span className="type-chip-generic">{generic}</span>
      ) : null}
      {array ? <span className="type-chip-array">[ ]</span> : null}
      <motion.span
        className="type-chip-marker"
        aria-hidden
        variants={BRACKET_VARIANTS_RIGHT}
        initial="hidden"
        whileInView="visible"
        viewport={BRACKET_VIEWPORT}
        transition={{ ...BRACKET_TRANSITION, delay: 0.08 }}
        style={{ display: "inline-block", transformOrigin: "left center" }}
      >
        ⟩
      </motion.span>
    </span>
  );
}

// ── Metric badges ─────────────────────────────────────────────────────
// One family, multiple members: duration (400ms), size (2 KB),
// percentage (95%), percentile (p95), multiplier (10×). All share the
// "magnitude bold + scale muted" typography but each has its own
// distinguishing layout cue (unit suffix, leading `p`, accent operator).
export function SizeBadge({ value, unit }: { value: string; unit: string }) {
  return <DurationBadge value={value} unit={unit} />;
}

export function PercentageBadge({ value }: { value: string }) {
  return <DurationBadge value={value} unit="%" />;
}

export function PercentileBadge({ value }: { value: string }) {
  return (
    <span className="metric-percentile">
      <span className="metric-percentile-p">p</span>
      <span className="metric-percentile-n">{value}</span>
    </span>
  );
}

export function MultiplierBadge({ value, op }: { value: string; op?: string }) {
  return (
    <span className="metric-multiplier">
      <span className="metric-multiplier-n">{value}</span>
      <span className="metric-multiplier-op">{op === "x" ? "×" : "×"}</span>
    </span>
  );
}

// Big-O complexity: italic-serif `O` + muted parens + mono argument.
// Typeset like a math textbook, not like a runtime expression.
export function ComplexityBadge({ inner }: { inner: string }) {
  return (
    <span className="complexity-badge">
      <span className="complexity-o">O</span>
      <span className="complexity-paren">(</span>
      <span className="complexity-arg">{inner}</span>
      <span className="complexity-paren">)</span>
    </span>
  );
}

export function DurationBadge({
  value,
  unit,
}: {
  value: string;
  unit: string;
}) {
  return (
    <span className="duration-badge">
      <span className="duration-value">{value}</span>
      <span className="duration-unit">{unit}</span>
    </span>
  );
}

// ── SmartCode — routing `<code>` override ─────────────────────────────
// Inline backtick content gets classified into endpoint / type /
// duration / plain. Code blocks (with a `language-*` className) pass
// through untouched so syntax highlighters keep working.
export function SmartCode({
  children,
  className,
  ...rest
}: {
  children?: ReactNode;
  className?: string;
}) {
  if (className && className.startsWith("language-")) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }

  const arr = Children.toArray(children);
  if (arr.length !== 1 || typeof arr[0] !== "string") {
    return (
      <code className={className ?? "richtext-code-pill"} {...rest}>
        {children}
      </code>
    );
  }

  const text = arr[0].trim();

  const endpointMatch = ENDPOINT_RE.exec(text);
  if (endpointMatch) {
    return <ApiEndpoint method={endpointMatch[1]} path={endpointMatch[2]} />;
  }

  if (TYPE_RE.test(text)) {
    return <TypeBadge text={text} />;
  }

  const durationMatch = DURATION_RE.exec(text);
  if (durationMatch) {
    return <DurationBadge value={durationMatch[1]} unit={durationMatch[2]} />;
  }

  const sizeMatch = SIZE_RE.exec(text);
  if (sizeMatch) {
    return <SizeBadge value={sizeMatch[1]} unit={sizeMatch[2]} />;
  }

  const percentileMatch = PERCENTILE_RE.exec(text);
  if (percentileMatch) {
    return <PercentileBadge value={percentileMatch[1]} />;
  }

  const percentageMatch = PERCENTAGE_RE.exec(text);
  if (percentageMatch) {
    return <PercentageBadge value={percentageMatch[1]} />;
  }

  const multiplierMatch = MULTIPLIER_RE.exec(text);
  if (multiplierMatch) {
    return (
      <MultiplierBadge value={multiplierMatch[1]} op={multiplierMatch[2]} />
    );
  }

  const complexityMatch = COMPLEXITY_RE.exec(text);
  if (complexityMatch) {
    return <ComplexityBadge inner={complexityMatch[1]} />;
  }

  return (
    <code className="richtext-code-pill" {...rest}>
      {text}
    </code>
  );
}


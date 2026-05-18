"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { DemoSandbox } from "@/components/principles/demo-primitives";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ── Types ──────────────────────────────────────────────────────────

type CodeToken = { text: string; color: string };
type CodeLine = { key: string; tokens: CodeToken[]; feature?: FeatureId };

type FeatureId = "search" | "footer" | "groups" | "icons" | "keyboard";

type Feature = {
  id: FeatureId;
  label: string;
  propCount: number;
  subComponentCount: number;
};

// ── Feature definitions ────────────────────────────────────────────

const FEATURES: Feature[] = [
  { id: "search", label: "Search", propCount: 2, subComponentCount: 1 },
  { id: "footer", label: "Footer", propCount: 2, subComponentCount: 1 },
  { id: "groups", label: "Groups", propCount: 2, subComponentCount: 2 },
  { id: "icons", label: "Icons", propCount: 3, subComponentCount: 1 },
  { id: "keyboard", label: "Keyboard", propCount: 3, subComponentCount: 0 },
];

// ── Syntax colors (CSS variable references) ────────────────────────

const SYN = {
  keyword: "var(--color-muted)",
  component: "var(--color-accent)",
  prop: "var(--color-success)",
  string: "var(--color-text)",
  punctuation: "var(--color-muted)",
  comment: "var(--color-muted)",
} as const;

// ── Monolithic code lines ──────────────────────────────────────────

const MONOLITHIC_LINES: CodeLine[] = [
  {
    key: "m-open",
    tokens: [
      { text: "<", color: SYN.punctuation },
      { text: "Select", color: SYN.component },
    ],
  },
  {
    key: "m-value",
    tokens: [
      { text: "  value", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "selected", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-onchange",
    tokens: [
      { text: "  onChange", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "setSelected", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-options",
    tokens: [
      { text: "  options", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "items", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-placeholder",
    tokens: [
      { text: "  placeholder", color: SYN.prop },
      { text: "=", color: SYN.punctuation },
      { text: '"Choose..."', color: SYN.string },
    ],
  },
  // ── Search feature props
  {
    key: "m-searchable",
    feature: "search",
    tokens: [
      { text: "  searchable", color: SYN.prop },
    ],
  },
  {
    key: "m-filterfn",
    feature: "search",
    tokens: [
      { text: "  filterFn", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "fuzzyMatch", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  // ── Footer feature props
  {
    key: "m-footer",
    feature: "footer",
    tokens: [
      { text: "  footer", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "<Footer />", color: SYN.component },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-footerSticky",
    feature: "footer",
    tokens: [
      { text: "  footerSticky", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "true", color: SYN.keyword },
      { text: "}", color: SYN.punctuation },
    ],
  },
  // ── Groups feature props
  {
    key: "m-groupBy",
    feature: "groups",
    tokens: [
      { text: "  groupBy", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "item => item.category", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-groupLabel",
    feature: "groups",
    tokens: [
      { text: "  renderGroupLabel", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "groupLabelFn", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  // ── Icons feature props
  {
    key: "m-renderOption",
    feature: "icons",
    tokens: [
      { text: "  renderOption", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "optionWithIcon", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-renderSelected",
    feature: "icons",
    tokens: [
      { text: "  renderSelected", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "selectedWithIcon", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-iconPosition",
    feature: "icons",
    tokens: [
      { text: "  iconPosition", color: SYN.prop },
      { text: "=", color: SYN.punctuation },
      { text: '"leading"', color: SYN.string },
    ],
  },
  // ── Keyboard feature props
  {
    key: "m-keyboard",
    feature: "keyboard",
    tokens: [
      { text: "  enableKeyboard", color: SYN.prop },
    ],
  },
  {
    key: "m-typeahead",
    feature: "keyboard",
    tokens: [
      { text: "  typeaheadDelay", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "300", color: SYN.string },
      { text: "}", color: SYN.punctuation },
    ],
  },
  {
    key: "m-loop",
    feature: "keyboard",
    tokens: [
      { text: "  loopFocus", color: SYN.prop },
    ],
  },
  // ── Closing tag
  {
    key: "m-close",
    tokens: [
      { text: "/>", color: SYN.punctuation },
    ],
  },
];

// ── Compound code lines ────────────────────────────────────────────

const COMPOUND_LINES: CodeLine[] = [
  {
    key: "c-open",
    tokens: [
      { text: "<", color: SYN.punctuation },
      { text: "Select", color: SYN.component },
      { text: " ", color: SYN.punctuation },
      { text: "value", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "selected", color: SYN.string },
      { text: "} ", color: SYN.punctuation },
      { text: "onChange", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "set", color: SYN.string },
      { text: "}>", color: SYN.punctuation },
    ],
  },
  // ── Search feature
  {
    key: "c-search",
    feature: "search",
    tokens: [
      { text: "  <", color: SYN.punctuation },
      { text: "Select.Search", color: SYN.component },
      { text: " ", color: SYN.punctuation },
      { text: "filter", color: SYN.prop },
      { text: "={", color: SYN.punctuation },
      { text: "fuzzy", color: SYN.string },
      { text: "} />", color: SYN.punctuation },
    ],
  },
  // ── Groups feature — group wrapper
  {
    key: "c-group-open",
    feature: "groups",
    tokens: [
      { text: "  <", color: SYN.punctuation },
      { text: "Select.Group", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
  {
    key: "c-group-label",
    feature: "groups",
    tokens: [
      { text: "    <", color: SYN.punctuation },
      { text: "Select.Label", color: SYN.component },
      { text: ">", color: SYN.punctuation },
      { text: "Category", color: SYN.string },
      { text: "</", color: SYN.punctuation },
      { text: "Select.Label", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
  // ── Items (always visible, indentation changes with groups)
  {
    key: "c-item-1",
    tokens: [
      { text: "  <", color: SYN.punctuation },
      { text: "Select.Item", color: SYN.component },
      { text: " ", color: SYN.punctuation },
      { text: "value", color: SYN.prop },
      { text: "=", color: SYN.punctuation },
      { text: '"apple"', color: SYN.string },
      { text: ">", color: SYN.punctuation },
    ],
  },
  // ── Icons feature — icon inside item
  {
    key: "c-icon-1",
    feature: "icons",
    tokens: [
      { text: "    <", color: SYN.punctuation },
      { text: "AppleIcon", color: SYN.component },
      { text: " /> ", color: SYN.punctuation },
      { text: "Apple", color: SYN.string },
    ],
  },
  {
    key: "c-item-1-close",
    tokens: [
      { text: "  </", color: SYN.punctuation },
      { text: "Select.Item", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
  {
    key: "c-item-2",
    tokens: [
      { text: "  <", color: SYN.punctuation },
      { text: "Select.Item", color: SYN.component },
      { text: " ", color: SYN.punctuation },
      { text: "value", color: SYN.prop },
      { text: "=", color: SYN.punctuation },
      { text: '"banana"', color: SYN.string },
      { text: ">", color: SYN.punctuation },
    ],
  },
  {
    key: "c-icon-2",
    feature: "icons",
    tokens: [
      { text: "    <", color: SYN.punctuation },
      { text: "BananaIcon", color: SYN.component },
      { text: " /> ", color: SYN.punctuation },
      { text: "Banana", color: SYN.string },
    ],
  },
  {
    key: "c-item-2-close",
    tokens: [
      { text: "  </", color: SYN.punctuation },
      { text: "Select.Item", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
  // ── Groups closing
  {
    key: "c-group-close",
    feature: "groups",
    tokens: [
      { text: "  </", color: SYN.punctuation },
      { text: "Select.Group", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
  // ── Keyboard feature — built-in, just a comment
  {
    key: "c-keyboard-comment",
    feature: "keyboard",
    tokens: [
      { text: "  {/* keyboard nav is built-in */}", color: SYN.comment },
    ],
  },
  // ── Footer feature
  {
    key: "c-footer",
    feature: "footer",
    tokens: [
      { text: "  <", color: SYN.punctuation },
      { text: "Select.Footer", color: SYN.component },
      { text: " ", color: SYN.punctuation },
      { text: "sticky", color: SYN.prop },
      { text: ">", color: SYN.punctuation },
      { text: "3 selected", color: SYN.string },
      { text: "</", color: SYN.punctuation },
      { text: "Select.Footer", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
  // ── Closing tag
  {
    key: "c-close",
    tokens: [
      { text: "</", color: SYN.punctuation },
      { text: "Select", color: SYN.component },
      { text: ">", color: SYN.punctuation },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function filterLines(
  lines: CodeLine[],
  enabled: Set<FeatureId>,
): CodeLine[] {
  return lines.filter((l) => !l.feature || enabled.has(l.feature));
}

function countProps(enabled: Set<FeatureId>): number {
  // base props: value, onChange, options, placeholder = 4
  let count = 4;
  for (const f of FEATURES) {
    if (enabled.has(f.id)) count += f.propCount;
  }
  return count;
}

function countSubComponents(enabled: Set<FeatureId>): number {
  // base sub-components: Select, Select.Item x2 = 3
  let count = 3;
  for (const f of FEATURES) {
    if (enabled.has(f.id)) count += f.subComponentCount;
  }
  return count;
}

// ── Animated code line ─────────────────────────────────────────────

function AnimatedLine({
  line,
  reducedMotion,
}: {
  line: CodeLine;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={SPRING.snappy}
      style={{
        whiteSpace: "pre",
        lineHeight: 1.7,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
      }}
    >
      {line.tokens.map((token, i) => (
        <span key={i} style={{ color: token.color }}>
          {token.text}
        </span>
      ))}
    </motion.div>
  );
}

// ── Metric badge ───────────────────────────────────────────────────

function MetricBadge({
  label,
  value,
  severity,
  reducedMotion,
}: {
  label: string;
  value: number;
  severity: "calm" | "warn" | "danger";
  reducedMotion: boolean;
}) {
  const colorMap = {
    calm: "var(--color-success)",
    warn: "var(--color-muted)",
    danger: "var(--color-error)",
  };

  const bgMap = {
    calm: "var(--color-success-muted)",
    warn: "var(--color-surface-2)",
    danger: "var(--color-error-muted)",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: colorMap[severity],
      }}
    >
      <span style={{ color: "var(--color-muted)" }}>{label}</span>
      <motion.span
        key={value}
        initial={reducedMotion ? false : { scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={SPRING.snappy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 28,
          padding: "2px 8px",
          borderRadius: "var(--radius-1)",
          background: bgMap[severity],
          color: colorMap[severity],
          fontWeight: 600,
          fontSize: "var(--text-xs)",
          border: `1px solid ${colorMap[severity]}`,
        }}
      >
        {value}
      </motion.span>
    </div>
  );
}

// ── Feature chip toggle ────────────────────────────────────────────

function FeatureChip({
  feature,
  active,
  onToggle,
}: {
  feature: Feature;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: "4px 12px",
        borderRadius: "var(--radius-2)",
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
        background: active ? "var(--color-accent)" : "transparent",
        color: active ? "var(--color-bg)" : "var(--color-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease-out",
        letterSpacing: "0.02em",
        lineHeight: 1.4,
      }}
    >
      {feature.label}
    </button>
  );
}

// ── Code panel ─────────────────────────────────────────────────────

function CodePanel({
  title,
  lines,
  enabled,
  reducedMotion,
}: {
  title: string;
  lines: CodeLine[];
  enabled: Set<FeatureId>;
  reducedMotion: boolean;
}) {
  const visible = filterLines(lines, enabled);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--color-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-2) var(--radius-2) 0 0",
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: "var(--color-bg)",
          borderRadius: "0 0 var(--radius-2) var(--radius-2)",
          border: "1px solid var(--color-border)",
          borderTop: "none",
          padding: "var(--space-3)",
          overflow: "hidden",
          minHeight: 180,
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((line) => (
            <AnimatedLine
              key={line.key}
              line={line}
              reducedMotion={reducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export function PropExplosion() {
  const [enabled, setEnabled] = useState<Set<FeatureId>>(new Set());
  const reducedMotion = usePrefersReducedMotion();

  const toggle = useCallback((id: FeatureId) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const propCount = useMemo(() => countProps(enabled), [enabled]);
  const subCount = useMemo(
    () => countSubComponents(enabled),
    [enabled],
  );

  const propSeverity: "calm" | "warn" | "danger" =
    propCount <= 6 ? "calm" : propCount <= 10 ? "warn" : "danger";

  return (
    <DemoSandbox title="Prop Explosion">
      {/* Feature toggles */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          justifyContent: "center",
          marginBottom: "var(--space-4)",
        }}
      >
        {FEATURES.map((f) => (
          <FeatureChip
            key={f.id}
            feature={f}
            active={enabled.has(f.id)}
            onToggle={() => toggle(f.id)}
          />
        ))}
      </div>

      {/* Code panels — side by side */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          width: "100%",
        }}
      >
        <CodePanel
          title="Monolithic"
          lines={MONOLITHIC_LINES}
          enabled={enabled}
          reducedMotion={reducedMotion}
        />
        <CodePanel
          title="Compound"
          lines={COMPOUND_LINES}
          enabled={enabled}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Metric badges */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "var(--space-6)",
          marginTop: "var(--space-4)",
        }}
      >
        <MetricBadge
          label="Props:"
          value={propCount}
          severity={propSeverity}
          reducedMotion={reducedMotion}
        />
        <MetricBadge
          label="Sub-components:"
          value={subCount}
          severity="calm"
          reducedMotion={reducedMotion}
        />
      </div>
    </DemoSandbox>
  );
}

export default PropExplosion;

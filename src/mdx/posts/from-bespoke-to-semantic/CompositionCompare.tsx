"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import styles from "./composition-compare.module.css";

// ── Diagram data (shared by both renderings) ─────────────────────

type DiagramNode = { id: string; label: string; x: number; y: number };
type DiagramEdge = { from: string; to: string };

const NODES: DiagramNode[] = [
  { id: "session", label: "Session", x: 160, y: 30 },
  { id: "skill", label: "Skill", x: 60, y: 120 },
  { id: "tool", label: "Tool", x: 160, y: 120 },
  { id: "result", label: "Result", x: 260, y: 120 },
  { id: "log", label: "Log", x: 160, y: 210 },
];

const EDGES: DiagramEdge[] = [
  { from: "session", to: "skill" },
  { from: "session", to: "tool" },
  { from: "session", to: "result" },
  { from: "tool", to: "log" },
];

// ── Syntax-highlighted code snippets ──────────────────────────────
// Manual span-based highlighting using Tailwind color classes
// mapped to token roles in the blog's palette.

const MONOLITH_CODE = (
  <>
    <Line>
      <Punct>{"{"}</Punct>
    </Line>
    <Line>
      {"  "}
      <Key>&quot;nodes&quot;</Key>
      <Punct>: [</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;id&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;session&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;label&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;Session&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;x&quot;</Key>
      <Punct>: </Punct>
      <Num>160</Num>
      <Punct>, </Punct>
      <Key>&quot;y&quot;</Key>
      <Punct>: </Punct>
      <Num>30</Num>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;id&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;skill&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;label&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;Skill&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;x&quot;</Key>
      <Punct>: </Punct>
      <Num>60</Num>
      <Punct>, </Punct>
      <Key>&quot;y&quot;</Key>
      <Punct>: </Punct>
      <Num>120</Num>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;id&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;tool&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;label&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;Tool&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;x&quot;</Key>
      <Punct>: </Punct>
      <Num>160</Num>
      <Punct>, </Punct>
      <Key>&quot;y&quot;</Key>
      <Punct>: </Punct>
      <Num>120</Num>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;id&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;result&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;label&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;Result&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;x&quot;</Key>
      <Punct>: </Punct>
      <Num>260</Num>
      <Punct>, </Punct>
      <Key>&quot;y&quot;</Key>
      <Punct>: </Punct>
      <Num>120</Num>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;id&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;log&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;label&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;Log&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;x&quot;</Key>
      <Punct>: </Punct>
      <Num>160</Num>
      <Punct>, </Punct>
      <Key>&quot;y&quot;</Key>
      <Punct>: </Punct>
      <Num>210</Num>
      <Punct>{" }"}</Punct>
    </Line>
    <Line>
      {"  "}
      <Punct>],</Punct>
    </Line>
    <Line>
      {"  "}
      <Key>&quot;edges&quot;</Key>
      <Punct>: [</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;from&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;session&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;to&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;skill&quot;</Str>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;from&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;session&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;to&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;tool&quot;</Str>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;from&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;session&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;to&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;result&quot;</Str>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"    "}
      <Punct>{"{ "}</Punct>
      <Key>&quot;from&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;tool&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;to&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;log&quot;</Str>
      <Punct>{" }"}</Punct>
    </Line>
    <Line>
      {"  "}
      <Punct>],</Punct>
    </Line>
    <Line>
      {"  "}
      <Key>&quot;nodeStyles&quot;</Key>
      <Punct>: {"{ "}</Punct>
      <Key>&quot;fill&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;#1e1b2e&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;stroke&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;#3a3650&quot;</Str>
      <Punct>{" }"}</Punct>
      <Punct>,</Punct>
    </Line>
    <Line>
      {"  "}
      <Key>&quot;layout&quot;</Key>
      <Punct>: {"{ "}</Punct>
      <Key>&quot;direction&quot;</Key>
      <Punct>: </Punct>
      <Str>&quot;TB&quot;</Str>
      <Punct>, </Punct>
      <Key>&quot;padding&quot;</Key>
      <Punct>: </Punct>
      <Num>20</Num>
      <Punct>{" }"}</Punct>
    </Line>
    <Line>
      <Punct>{"}"}</Punct>
    </Line>
  </>
);

const PRIMITIVES_CODE = (
  <>
    <Line>
      <Tag>&lt;Flow.Canvas</Tag>
      <Tag>&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Node</Tag>
      <Attr> id</Attr>
      <Punct>=</Punct>
      <Str>&quot;session&quot;</Str>
      <Attr> label</Attr>
      <Punct>=</Punct>
      <Str>&quot;Session&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Node</Tag>
      <Attr> id</Attr>
      <Punct>=</Punct>
      <Str>&quot;skill&quot;</Str>
      <Attr> label</Attr>
      <Punct>=</Punct>
      <Str>&quot;Skill&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Node</Tag>
      <Attr> id</Attr>
      <Punct>=</Punct>
      <Str>&quot;tool&quot;</Str>
      <Attr> label</Attr>
      <Punct>=</Punct>
      <Str>&quot;Tool&quot;</Str>
      <Tag>&gt;</Tag>
    </Line>
    <Line>
      {"    "}
      <Highlight>
        <Tag>&lt;CustomBadge</Tag>
        <Attr> icon</Attr>
        <Punct>=</Punct>
        <Str>&quot;wrench&quot;</Str>
        <Tag> /&gt;</Tag>
      </Highlight>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;/Flow.Node&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Node</Tag>
      <Attr> id</Attr>
      <Punct>=</Punct>
      <Str>&quot;result&quot;</Str>
      <Attr> label</Attr>
      <Punct>=</Punct>
      <Str>&quot;Result&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Node</Tag>
      <Attr> id</Attr>
      <Punct>=</Punct>
      <Str>&quot;log&quot;</Str>
      <Attr> label</Attr>
      <Punct>=</Punct>
      <Str>&quot;Log&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line />
    <Line>
      {"  "}
      <Tag>&lt;Flow.Edge</Tag>
      <Attr> from</Attr>
      <Punct>=</Punct>
      <Str>&quot;session&quot;</Str>
      <Attr> to</Attr>
      <Punct>=</Punct>
      <Str>&quot;skill&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Edge</Tag>
      <Attr> from</Attr>
      <Punct>=</Punct>
      <Str>&quot;session&quot;</Str>
      <Attr> to</Attr>
      <Punct>=</Punct>
      <Str>&quot;tool&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Edge</Tag>
      <Attr> from</Attr>
      <Punct>=</Punct>
      <Str>&quot;session&quot;</Str>
      <Attr> to</Attr>
      <Punct>=</Punct>
      <Str>&quot;result&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      {"  "}
      <Tag>&lt;Flow.Edge</Tag>
      <Attr> from</Attr>
      <Punct>=</Punct>
      <Str>&quot;tool&quot;</Str>
      <Attr> to</Attr>
      <Punct>=</Punct>
      <Str>&quot;log&quot;</Str>
      <Tag> /&gt;</Tag>
    </Line>
    <Line>
      <Tag>&lt;/Flow.Canvas&gt;</Tag>
    </Line>
  </>
);

// Character counts for the raw source text
const MONOLITH_CHARS = 587;
const PRIMITIVES_CHARS = 384;

// ── Tiny syntax-highlight primitives ──────────────────────────────

function Line({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ minHeight: "1.7em" }}>{children}</div>
  );
}

function Punct({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "var(--color-muted)" }}>{children}</span>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "var(--color-accent)" }}>{children}</span>
  );
}

function Str({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "oklch(76% 0.14 150)" }}>{children}</span>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "oklch(78% 0.12 60)" }}>{children}</span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "oklch(72% 0.12 20)" }}>{children}</span>
  );
}

function Attr({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "oklch(78% 0.10 250)" }}>{children}</span>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background:
          "color-mix(in srgb, var(--color-accent) 15%, transparent)",
        borderRadius: 3,
        padding: "1px 3px",
      }}
    >
      {children}
    </span>
  );
}

// ── Inline SVG diagram (identical for both panels) ────────────────

const NODE_W = 72;
const NODE_H = 28;
const SVG_W = 340;
const SVG_H = 260;

function edgePath(from: DiagramNode, to: DiagramNode): string {
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

function DiagramSVG() {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ maxWidth: 280 }}
      role="img"
      aria-label="Diagram showing Session connected to Skill, Tool, and Result nodes, with Tool connected to Log"
    >
      {EDGES.map((e) => (
        <path
          key={`${e.from}-${e.to}`}
          d={edgePath(nodeMap[e.from], nodeMap[e.to])}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={1.5}
          opacity={0.5}
        />
      ))}
      {NODES.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x}
            y={n.y}
            width={NODE_W}
            height={NODE_H}
            rx={6}
            fill="var(--color-surface-2)"
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <text
            x={n.x + NODE_W / 2}
            y={n.y + NODE_H / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--color-text)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────

type ViewMode = "code" | "result";

export function CompositionCompare() {
  const [mode, setMode] = useState<ViewMode>("code");
  const prefersReducedMotion = usePrefersReducedMotion();

  const isCode = mode === "code";
  const isResult = mode === "result";

  return (
    <div className={styles.wrapper}>
      {/* Toggle bar */}
      <div className={styles.toolbar}>
        <div className={styles.toggleTrack}>
          {!prefersReducedMotion && (
            <motion.div
              className={styles.toggleIndicator}
              layout
              transition={SPRING.snappy}
              style={{
                left: isCode ? 2 : "50%",
                width: "calc(50% - 2px)",
              }}
            />
          )}
          {prefersReducedMotion && (
            <div
              className={styles.toggleIndicator}
              style={{
                left: isCode ? 2 : "50%",
                width: "calc(50% - 2px)",
              }}
            />
          )}
          <button
            type="button"
            className={styles.toggleOption}
            data-active={isCode}
            onClick={() => setMode("code")}
            aria-pressed={isCode}
          >
            Code
          </button>
          <button
            type="button"
            className={styles.toggleOption}
            data-active={isResult}
            onClick={() => setMode("result")}
            aria-pressed={isResult}
          >
            Result
          </button>
        </div>
      </div>

      {/* Side-by-side panels */}
      <div className={styles.panels}>
        {/* Left: Monolith */}
        <div className={`${styles.panel} ${styles.panelMonolith}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Monolith</span>
            <span className={styles.charBadge}>
              {MONOLITH_CHARS} chars
            </span>
          </div>
          <div className={styles.panelBody}>
            <AnimatePresence mode="wait" initial={false}>
              {isCode ? (
                <PanelContent
                  key="mono-code"
                  reducedMotion={prefersReducedMotion}
                >
                  <div className={styles.codeBlock}>
                    {MONOLITH_CODE}
                  </div>
                </PanelContent>
              ) : (
                <PanelContent
                  key="mono-result"
                  reducedMotion={prefersReducedMotion}
                >
                  <div className={styles.resultContainer}>
                    <DiagramSVG />
                  </div>
                </PanelContent>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Primitives */}
        <div className={`${styles.panel} ${styles.panelPrimitives}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Primitives</span>
            <span className={styles.charBadge}>
              {PRIMITIVES_CHARS} chars
            </span>
          </div>
          <div className={styles.panelBody}>
            <AnimatePresence mode="wait" initial={false}>
              {isCode ? (
                <PanelContent
                  key="prim-code"
                  reducedMotion={prefersReducedMotion}
                >
                  <div className={styles.codeBlock}>
                    {PRIMITIVES_CODE}
                  </div>
                </PanelContent>
              ) : (
                <PanelContent
                  key="prim-result"
                  reducedMotion={prefersReducedMotion}
                >
                  <div className={styles.resultContainer}>
                    <DiagramSVG />
                  </div>
                </PanelContent>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Animated panel content wrapper ────────────────────────────────

function PanelContent({
  children,
  reducedMotion,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={TRANSITION.crossfade}
    >
      {children}
    </motion.div>
  );
}

export default CompositionCompare;

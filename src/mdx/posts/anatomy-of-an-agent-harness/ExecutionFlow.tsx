"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { SM_NODES, SM_SCENARIOS } from "./flue-data";
import type { SMNode } from "./flue-data";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Execution Flow State Machine
 *
 * 7 nodes, 8 edges, 3 scenarios tracing different paths.
 * Token springs between nodes; edges light up along the path.
 *
 *    0ms   Graph renders, token at path[0]
 *  user    Select scenario → reset + load new path
 *  user    Step → token springs to next (SPRING.snappy)
 *  100ms   Traversed edge lights up (accent, solid)
 *  200ms   Detail panel crossfades (TRANSITION.enterItem)
 *  user    Play → auto-advance every 1800ms; Pause → stop
 * ───────────────────────────────────────────────────────── */

// ── Layout config ────────────────────────────────────────

const SVG_W = 560;
const SVG_H = 132;
const NODE_W = 54;
const NODE_H = 18;
const HUB_W = 58;
const HUB_H = 20;
const RX = 3;
const AUTO_MS = 1800;

// ── Node positions (horizontal pipeline) ─────────────────

const POS: Record<string, { x: number; y: number }> = {
  prompt:   { x: 56,  y: 42 },
  session:  { x: 160, y: 42 },
  skill:    { x: 264, y: 42 },
  llm:      { x: 368, y: 42 },
  response: { x: 472, y: 42 },
  tool:     { x: 316, y: 106 },
  task:     { x: 420, y: 106 },
};

// ── Edge definitions ─────────────────────────────────────

type EdgeDef = { from: string; to: string; label?: string; loopback?: boolean };

const EDGES: EdgeDef[] = [
  { from: "prompt", to: "session" },
  { from: "session", to: "skill" },
  { from: "skill", to: "llm" },
  { from: "llm", to: "tool", label: "tool call" },
  { from: "llm", to: "response", label: "text" },
  { from: "llm", to: "task", label: "delegate" },
  { from: "tool", to: "llm", label: "result", loopback: true },
  { from: "task", to: "llm", label: "result", loopback: true },
];

const NODE_IDS = Object.keys(SM_NODES);
const SHORT_LABELS: Record<string, string> = {
  prompt: "Prompt", session: "Session", skill: "Skill",
  llm: "LLM", tool: "Tool", response: "Response", task: "Task",
};

// ── Geometry helpers ─────────────────────────────────────

function nw(id: string) { return id === "llm" ? HUB_W : NODE_W; }
function nh(id: string) { return id === "llm" ? HUB_H : NODE_H; }

function rectEdge(cx: number, cy: number, hw: number, hh: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min(
    Math.abs(dx) > 0.01 ? hw / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0.01 ? hh / Math.abs(dy) : Infinity,
  );
  return { x: cx + dx * s, y: cy + dy * s };
}

function getEdgePath(e: EdgeDef): string {
  const f = POS[e.from];
  const t = POS[e.to];
  if (e.loopback && e.from === "tool") {
    const sx = f.x - nw("tool") / 2;
    const ex = t.x - nw("llm") / 2;
    const cpx = sx - 34;
    const ey = t.y + nh("llm") / 2 + 2;
    return `M ${sx} ${f.y} C ${cpx} ${f.y}, ${cpx} ${ey}, ${ex} ${ey}`;
  }
  if (e.loopback && e.from === "task") {
    const sx = f.x + nw("task") / 2;
    const ex = t.x + nw("llm") / 2;
    const cpx = sx + 34;
    const ey = t.y + nh("llm") / 2 + 2;
    return `M ${sx} ${f.y} C ${cpx} ${f.y}, ${cpx} ${ey}, ${ex} ${ey}`;
  }
  const a = rectEdge(f.x, f.y, nw(e.from) / 2 + 2, nh(e.from) / 2 + 2, t.x, t.y);
  const b = rectEdge(t.x, t.y, nw(e.to) / 2 + 2, nh(e.to) / 2 + 2, f.x, f.y);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function getLabelPos(e: EdgeDef): { x: number; y: number } {
  const f = POS[e.from];
  const t = POS[e.to];
  if (e.loopback && e.from === "tool") {
    const sx = f.x - nw("tool") / 2;
    return { x: sx - 44, y: (f.y + t.y) / 2 + 6 };
  }
  if (e.loopback && e.from === "task") {
    const sx = f.x + nw("task") / 2;
    return { x: sx + 44, y: (f.y + t.y) / 2 + 6 };
  }
  const mx = (f.x + t.x) / 2;
  const my = (f.y + t.y) / 2;
  const dx = t.x - f.x;
  const dy = t.y - f.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: mx + (-dy / d) * 10, y: my + (dx / d) * 10 };
}

// ── State helpers ────────────────────────────────────────

function ek(a: string, b: string) { return `${a}→${b}`; }

function buildTraversed(path: string[], step: number) {
  const s = new Set<string>();
  for (let i = 0; i < step; i++) s.add(ek(path[i], path[i + 1]));
  return s;
}

function buildPathEdges(path: string[]) {
  const s = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) s.add(ek(path[i], path[i + 1]));
  return s;
}

type NodeState = "active" | "visited" | "future" | "inactive";

// ── DataFlowCard ─────────────────────────────────────────

function DataFlowCard({ node }: { node: SMNode }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: 12, borderRadius: "var(--radius-1)",
      background: "var(--color-bg)", border: "1px solid var(--color-border)",
      fontFamily: "var(--font-mono)", fontSize: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.08em", color: "var(--color-muted)",
          flexShrink: 0, minWidth: 32, marginTop: 2,
        }}>in</span>
        <span style={{ color: "var(--color-text)", wordBreak: "break-word" }}>{node.dataIn}</span>
      </div>
      <div style={{
        textAlign: "center", fontSize: 11, color: "var(--color-muted)",
        fontStyle: "italic", padding: "2px 0",
      }}>
        ↓ {node.transform}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.08em", color: "var(--color-accent)",
          flexShrink: 0, minWidth: 32, marginTop: 2,
        }}>out</span>
        <span style={{ color: "var(--color-text)", wordBreak: "break-word" }}>{node.dataOut}</span>
      </div>
    </div>
  );
}

// ── ChallengeBox ─────────────────────────────────────────

function ChallengeBox({
  challenge,
  onComplete,
  reducedMotion,
}: {
  challenge: NonNullable<SMNode["challenge"]>;
  onComplete: () => void;
  reducedMotion: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;
  const isCorrect = selected === challenge.correctIndex;

  const content = (
    <div style={{
      marginTop: 8, padding: 12, borderRadius: "var(--radius-1)",
      background: "var(--color-bg)", border: "1px solid var(--color-border)",
    }}>
      <p style={{
        margin: "0 0 10px 0", fontSize: 12, fontWeight: 600,
        color: "var(--color-text)", fontFamily: "var(--font-mono)", lineHeight: 1.5,
      }}>
        {challenge.question}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {challenge.options.map((opt, i) => {
          const isThis = selected === i;
          const showOk = revealed && i === challenge.correctIndex;
          const showBad = revealed && isThis && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              onClick={() => { if (!revealed) setSelected(i); }}
              disabled={revealed}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 10px", borderRadius: "var(--radius-1)",
                border: showOk ? "1px solid var(--color-accent)"
                  : showBad ? "1px solid #e5534b"
                  : "1px solid var(--color-border)",
                background: showOk ? "rgba(201, 149, 107, 0.08)"
                  : showBad ? "rgba(229, 83, 75, 0.06)"
                  : "var(--color-surface)",
                cursor: revealed ? "default" : "pointer",
                textAlign: "left", fontFamily: "var(--font-mono)",
                fontSize: 12, lineHeight: 1.5, color: "var(--color-text)",
                opacity: revealed && !isThis && !showOk ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                background: showOk ? "var(--color-accent)" : showBad ? "#e5534b" : "var(--color-surface-2)",
                color: showOk || showBad ? "var(--color-bg)" : "var(--color-muted)",
              }}>
                {showOk ? "✓" : showBad ? "✗" : String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: "var(--radius-1)",
          borderLeft: `3px solid ${isCorrect ? "var(--color-accent)" : "#e5534b"}`,
          background: "var(--color-surface)", fontSize: 12, lineHeight: 1.6,
          color: "var(--color-text)", fontFamily: "var(--font-mono)",
        }}>
          {challenge.feedback[selected]}
        </div>
      )}
      {revealed && (
        <button
          type="button"
          onClick={onComplete}
          style={{
            marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-accent)", background: "none",
            border: "none", cursor: "pointer", padding: 0,
          }}
        >
          ✓ Done
        </button>
      )}
    </div>
  );

  if (reducedMotion) return content;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={TRANSITION.collapse}
      style={{ overflow: "hidden" }}
    >
      {content}
    </motion.div>
  );
}

// ── NodeDetail ───────────────────────────────────────────

function NodeDetail({
  node,
  isReturn,
  reducedMotion,
}: {
  node: SMNode;
  isReturn: boolean;
  reducedMotion: boolean;
}) {
  const [showChallenge, setShowChallenge] = useState(false);
  const [answered, setAnswered] = useState(false);

  const inner = (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700,
          background: "var(--color-accent)", color: "var(--color-bg)",
          fontFamily: "var(--font-mono)",
          boxShadow: "0 0 10px rgba(201, 149, 107, 0.2)",
        }}>
          {node.icon}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600,
          color: "var(--color-text)",
        }}>
          {node.label}
        </span>
        {isReturn && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "var(--color-accent)", padding: "2px 6px",
            borderRadius: 4, background: "rgba(201, 149, 107, 0.1)",
            border: "1px solid rgba(201, 149, 107, 0.2)",
          }}>
            return
          </span>
        )}
      </div>

      <p style={{
        margin: "0 0 16px 0", fontSize: 13, lineHeight: 1.7,
        color: "var(--color-text)", fontFamily: "var(--font-mono)", opacity: 0.9,
      }}>
        {node.description}
      </p>

      <DataFlowCard node={node} />

      {node.challenge && (
        <div style={{ marginTop: 12 }}>
          {!showChallenge && !answered && (
            <button
              type="button"
              onClick={() => setShowChallenge(true)}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: "var(--color-accent)", background: "none",
                border: "none", cursor: "pointer", padding: 0, opacity: 0.8,
              }}
            >
              ▸ Test yourself
            </button>
          )}
          <AnimatePresence>
            {showChallenge && !answered && (
              <ChallengeBox
                challenge={node.challenge}
                onComplete={() => { setAnswered(true); setShowChallenge(false); }}
                reducedMotion={reducedMotion}
              />
            )}
          </AnimatePresence>
          {answered && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "var(--color-accent)",
              fontFamily: "var(--font-mono)", fontWeight: 600,
            }}>
              ✓ Understanding verified
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (reducedMotion) return inner;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={TRANSITION.enterItem}
    >
      {inner}
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────

export function ExecutionFlow() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const scenario = SM_SCENARIOS[scenarioIdx];
  const path = scenario.path;
  const currentId = path[step];
  const currentNode = SM_NODES[currentId];
  const isLast = step >= path.length - 1;
  const isFirst = step === 0;

  const visitedNodes = useMemo(() => new Set(path.slice(0, step + 1)), [path, step]);
  const traversedEdges = useMemo(() => buildTraversed(path, step), [path, step]);
  const activeEdgeKey = step > 0 ? ek(path[step - 1], path[step]) : null;
  const pathEdges = useMemo(() => buildPathEdges(path), [path]);
  const pathNodes = useMemo(() => new Set(path), [path]);
  const isReturnVisit = path.slice(0, step).includes(currentId);

  const selectScenario = useCallback((idx: number) => {
    setScenarioIdx(idx);
    setStep(0);
    setPlaying(false);
  }, []);

  const stepForward = useCallback(() => {
    if (step < path.length - 1) setStep(s => s + 1);
  }, [step, path]);

  const stepBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  const reset = useCallback(() => {
    setStep(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || isLast) {
      if (isLast) setPlaying(false);
      return;
    }
    const timer = setTimeout(stepForward, AUTO_MS);
    return () => clearTimeout(timer);
  }, [playing, step, isLast, stepForward]);

  function nodeState(id: string): NodeState {
    if (id === currentId) return "active";
    if (visitedNodes.has(id)) return "visited";
    if (pathNodes.has(id)) return "future";
    return "inactive";
  }

  function edgeState(e: EdgeDef): NodeState {
    const key = ek(e.from, e.to);
    if (key === activeEdgeKey) return "active";
    if (traversedEdges.has(key)) return "visited";
    if (pathEdges.has(key)) return "future";
    return "inactive";
  }

  const tokenPos = POS[currentId];

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--color-surface-2)",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
          fontWeight: 600, color: "var(--color-text)",
        }}>
          Prompt Lifecycle
        </span>
        <button type="button" onClick={reset} style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)",
          background: "none", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-1)", cursor: "pointer", padding: "2px 10px",
        }}>
          reset
        </button>
      </div>

      {/* Scenario pills */}
      <div style={{
        padding: "10px 20px", display: "flex", gap: 8, flexWrap: "wrap",
        borderBottom: "1px solid var(--color-border)",
      }}>
        {SM_SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectScenario(i)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              padding: "4px 12px", borderRadius: 12,
              border: i === scenarioIdx
                ? "1px solid var(--color-accent)"
                : "1px solid var(--color-border)",
              background: i === scenarioIdx
                ? "rgba(201, 149, 107, 0.1)" : "transparent",
              color: i === scenarioIdx
                ? "var(--color-accent)" : "var(--color-muted)",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* SVG graph */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ display: "block", background: "var(--color-bg)" }}
      >
        <defs>
          <filter id="sm-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feFlood floodColor="var(--color-accent)" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {EDGES.map(e => {
          const state = edgeState(e);
          const isActive = state === "active";
          const isVisited = state === "visited";
          const isFuture = state === "future";
          const isInactive = state === "inactive";
          const lp = e.label ? getLabelPos(e) : null;

          return (
            <g
              key={ek(e.from, e.to)}
              opacity={isInactive ? 0.06 : isFuture ? 0.18 : 1}
              style={{ transition: "opacity 0.3s" }}
            >
              <path
                d={getEdgePath(e)}
                fill="none"
                stroke={isActive || isVisited ? "var(--color-accent)" : "var(--color-border)"}
                strokeWidth={isActive ? 2.5 : isVisited ? 1.5 : 1}
                strokeDasharray={isFuture || isInactive ? "4 3" : "none"}
                opacity={isVisited && !isActive ? 0.45 : 1}
                style={{ transition: "stroke 0.3s, stroke-width 0.2s, opacity 0.3s" }}
              />
              {lp && (
                <text
                  x={lp.x} y={lp.y}
                  textAnchor="middle" dominantBaseline="central"
                  fill={isActive ? "var(--color-accent)" : "var(--color-muted)"}
                  fontSize={8} fontFamily="var(--font-mono)"
                  opacity={isInactive ? 0.3 : isFuture ? 0.4 : isActive ? 1 : 0.5}
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {NODE_IDS.map((id, i) => {
          const state = nodeState(id);
          const node = SM_NODES[id];
          const pos = POS[id];
          const isHub = node.isHub;
          const nodeW = isHub ? HUB_W : NODE_W;
          const nodeH = isHub ? HUB_H : NODE_H;
          const rx = pos.x - nodeW / 2;
          const ry = pos.y - nodeH / 2;
          const isActive = state === "active";
          const isVisited = state === "visited";
          const isInactive = state === "inactive";
          const isFuture = state === "future";

          const stateOpacity = isInactive ? 0.1 : isFuture ? 0.28 : 1;

          const nodeEl = (
            <g opacity={stateOpacity} style={{ transition: "opacity 0.2s" }}>
              <rect
                x={rx} y={ry} width={nodeW} height={nodeH} rx={RX}
                fill={isActive ? "var(--color-surface-2)" : "var(--color-bg)"}
                stroke={isActive ? "var(--color-accent)" : isVisited ? "var(--color-accent)" : "var(--color-border)"}
                strokeWidth={isActive ? 1.5 : 0.75}
                strokeOpacity={isVisited && !isActive ? 0.5 : 1}
                filter={isActive ? "url(#sm-glow)" : undefined}
                style={{ transition: "fill 0.2s, stroke 0.2s" }}
              />
              {isHub && (
                <line
                  x1={rx + RX} y1={ry} x2={rx + nodeW - RX} y2={ry}
                  stroke="var(--color-accent)" strokeWidth={1.5}
                />
              )}
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                fill={isActive ? "var(--color-accent)" : "var(--color-text)"}
                fontSize={9} fontWeight={isActive ? 600 : 400}
                fontFamily="var(--font-mono)"
                opacity={isVisited && !isActive ? 0.7 : 1}
              >
                {SHORT_LABELS[id] ?? id}
              </text>
            </g>
          );

          if (reducedMotion) return <g key={id}>{nodeEl}</g>;

          return (
            <motion.g
              key={id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.gentle, delay: i * STAGGER.fast }}
            >
              {nodeEl}
            </motion.g>
          );
        })}

        {/* Token */}
        {reducedMotion ? (
          <circle
            cx={tokenPos.x} cy={tokenPos.y} r={3}
            fill="var(--color-accent)"
          />
        ) : (
          <>
            <motion.circle
              r={6}
              fill="var(--color-accent)"
              opacity={0.15}
              animate={{ cx: tokenPos.x, cy: tokenPos.y }}
              transition={SPRING.snappy}
            />
            <motion.circle
              r={3}
              fill="var(--color-accent)"
              animate={{ cx: tokenPos.x, cy: tokenPos.y }}
              transition={SPRING.snappy}
            />
          </>
        )}

        {/* Scenario hint */}
        <text
          x={SVG_W / 2} y={SVG_H - 4}
          textAnchor="middle"
          fill="var(--color-muted)" fontSize={7} fontFamily="var(--font-mono)" opacity={0.3}
        >
          {scenario.hint}
        </text>
      </svg>

      {/* Detail panel */}
      <div style={{
        borderTop: "1px solid var(--color-border)",
        height: 260, overflowY: "auto",
        padding: "16px 20px",
        background: "var(--color-surface)",
      }}>
        <AnimatePresence mode="wait">
          <NodeDetail
            key={step}
            node={currentNode}
            isReturn={isReturnVisit}
            reducedMotion={reducedMotion}
          />
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div style={{
        padding: "12px 20px",
        borderTop: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--color-surface-2)",
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={stepBack}
            disabled={isFirst}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 12,
              padding: "6px 14px", borderRadius: "var(--radius-1)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: isFirst ? "var(--color-muted)" : "var(--color-text)",
              cursor: isFirst ? "default" : "pointer",
              opacity: isFirst ? 0.4 : 1,
            }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setPlaying(p => !p)}
            disabled={isLast}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 12,
              padding: "6px 14px", borderRadius: "var(--radius-1)",
              border: playing ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
              background: playing ? "rgba(201, 149, 107, 0.1)" : "var(--color-surface)",
              color: playing ? "var(--color-accent)" : isLast ? "var(--color-muted)" : "var(--color-text)",
              cursor: isLast ? "default" : "pointer",
              opacity: isLast ? 0.4 : 1,
            }}
          >
            {playing ? "‖ Pause" : "▸ Play"}
          </button>
        </div>

        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {step + 1} / {path.length}
        </span>

        <button
          type="button"
          onClick={stepForward}
          disabled={isLast || playing}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
            padding: "7px 18px", borderRadius: "var(--radius-1)",
            border: "none",
            background: isLast || playing ? "var(--color-surface)" : "var(--color-accent)",
            color: isLast || playing ? "var(--color-muted)" : "var(--color-bg)",
            cursor: isLast || playing ? "default" : "pointer",
          }}
        >
          {isLast ? "Done" : "Step →"}
        </button>
      </div>
    </div>
  );
}

export default ExecutionFlow;

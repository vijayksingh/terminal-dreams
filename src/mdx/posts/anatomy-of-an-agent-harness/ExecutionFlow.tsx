"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TRANSITION } from "@/lib/motion";
import { FlowDiagram } from "@/mdx/shared/flow-diagram";
import type { FlowDiagramDef, ResolvedNode } from "@/mdx/shared/flow-diagram";
import { SM_NODES, SM_SCENARIOS } from "./flue-data";

const POS: Record<string, { x: number; y: number }> = {
  prompt:   { x: 56,  y: 42 },
  session:  { x: 160, y: 42 },
  skill:    { x: 264, y: 42 },
  llm:      { x: 368, y: 42 },
  response: { x: 472, y: 42 },
  tool:     { x: 316, y: 106 },
  task:     { x: 420, y: 106 },
};

const SHORT_LABELS: Record<string, string> = {
  prompt: "Prompt", session: "Session", skill: "Skill",
  llm: "LLM", tool: "Tool", response: "Response", task: "Task",
};

const EXECUTION: FlowDiagramDef = {
  id: "execution-flow",
  title: "Prompt Lifecycle",
  thesis: "Every prompt enters a loop: the LLM decides whether to respond, use a tool, or delegate",
  protagonist: "llm",
  viewBox: "0 0 560 132",
  nodes: Object.entries(SM_NODES).map(([id, sm]) => ({
    id,
    ...POS[id],
    w: sm.isHub ? 58 : 54,
    h: sm.isHub ? 20 : 18,
    label: SHORT_LABELS[id] ?? id,
    accent: sm.isHub,
    data: {
      icon: sm.icon,
      fullLabel: sm.label,
      description: sm.description,
      dataIn: sm.dataIn,
      dataOut: sm.dataOut,
      transform: sm.transform,
      challenge: sm.challenge,
    },
  })),
  edges: [
    { from: "prompt", to: "session", verb: "enters", description: "user prompt is appended to the conversation history" },
    { from: "session", to: "skill", verb: "loads", description: "injects relevant skill instructions into the context" },
    { from: "skill", to: "llm", verb: "sends", description: "full context with instructions sent to the model" },
    { from: "llm", to: "tool", label: "tool call", verb: "invokes", description: "LLM decides to call a tool for more information" },
    { from: "llm", to: "response", label: "text", verb: "emits", description: "LLM produces a final text response" },
    { from: "llm", to: "task", label: "delegate", verb: "delegates", description: "LLM spawns a child task for complex sub-work" },
    {
      from: "tool", to: "llm", label: "result", verb: "returns", description: "tool result feeds back into the LLM loop",
      pathOverride: "M 289 106 C 255 106, 255 54, 339 54",
      midpointOverride: { x: 245, y: 80 },
    },
    {
      from: "task", to: "llm", label: "result", verb: "returns", description: "child task result feeds back into the LLM loop",
      pathOverride: "M 447 106 C 481 106, 481 54, 397 54",
      midpointOverride: { x: 491, y: 80 },
    },
  ],
  timeline: {
    scenarios: SM_SCENARIOS.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.hint,
      path: s.path.map((nodeId) => ({ nodeId })),
    })),
    stepDuration: 1800,
  },
  config: { detailPanelHeight: "auto" },
};

// ── Bespoke teaching interactions (DataFlowCard + ChallengeBox) ─────

type NodeData = {
  icon: string;
  fullLabel: string;
  description: string;
  dataIn: string;
  dataOut: string;
  transform: string;
  challenge?: {
    question: string;
    options: string[];
    correctIndex: number;
    feedback: string[];
  };
};

function DataFlowCard({ data }: { data: NodeData }) {
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
        <span style={{ color: "var(--color-text)", wordBreak: "break-word" }}>{data.dataIn}</span>
      </div>
      <div style={{
        textAlign: "center" as const, fontSize: 11, color: "var(--color-muted)",
        fontStyle: "italic", padding: "2px 0",
      }}>
        ↓ {data.transform}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.08em", color: "var(--color-accent)",
          flexShrink: 0, minWidth: 32, marginTop: 2,
        }}>out</span>
        <span style={{ color: "var(--color-text)", wordBreak: "break-word" }}>{data.dataOut}</span>
      </div>
    </div>
  );
}

function ChallengeBox({
  challenge,
  onComplete,
}: {
  challenge: NonNullable<NodeData["challenge"]>;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
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
                background: showOk ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                  : showBad ? "rgba(229, 83, 75, 0.06)"
                  : "var(--color-surface)",
                cursor: revealed ? "default" : "pointer",
                textAlign: "left" as const, fontFamily: "var(--font-mono)",
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

// ── Custom detail panel content ─────────────────────────────────────

function ExecutionFlowDetail({ node }: { node: ResolvedNode }) {
  const d = node.data as NodeData;
  const [showChallenge, setShowChallenge] = useState(false);
  const [answered, setAnswered] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700,
          background: "var(--color-accent)", color: "var(--color-bg)",
          fontFamily: "var(--font-mono)",
          boxShadow: "0 0 10px color-mix(in srgb, var(--color-accent) 20%, transparent)",
        }}>
          {d.icon}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600,
          color: "var(--color-text)",
        }}>
          {d.fullLabel}
        </span>
      </div>

      <p style={{
        margin: "0 0 16px 0", fontSize: 13, lineHeight: 1.7,
        color: "var(--color-text)", fontFamily: "var(--font-mono)", opacity: 0.9,
      }}>
        {d.description}
      </p>

      <DataFlowCard data={d} />

      {d.challenge && (
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
                challenge={d.challenge}
                onComplete={() => { setAnswered(true); setShowChallenge(false); }}
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
}

export function ExecutionFlow() {
  return (
    <FlowDiagram {...EXECUTION}>
      {(node) => <ExecutionFlowDetail node={node} />}
    </FlowDiagram>
  );
}

export default ExecutionFlow;

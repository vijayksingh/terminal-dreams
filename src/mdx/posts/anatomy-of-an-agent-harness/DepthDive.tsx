"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION, DURATION, EASE } from "@/lib/motion";
import ddStyles from "./depth-dive.module.css";

const MAX_DEPTH = 4;
const INDENT_PX = 24;
const BADGE_SIZE = 18;
const CONNECTOR_LEFT_OFFSET = 9;

type Phase = "spawn" | "predict" | "insight";

const labels = ["Root Agent", "Task", "Task", "Task", "Task"] as const;

const DEPTH_COLORS = [
  "var(--color-accent)",
  "color-mix(in srgb, var(--color-accent) 70%, transparent)",
  "color-mix(in srgb, var(--color-accent) 50%, transparent)",
  "color-mix(in srgb, var(--color-accent) 35%, transparent)",
  "var(--color-accent)",
];

const DEPTH_TEXT_COLORS = [
  "var(--color-bg)",
  "var(--color-bg)",
  "var(--color-bg)",
  "var(--color-text)",
  "var(--color-bg)",
];

const PREDICTION = {
  question:
    "You just hit the depth limit. What would happen without it?",
  options: [
    "Nothing changes — agents rarely spawn more than 4 levels deep anyway",
    "Tasks could recurse infinitely, consuming unbounded tokens and time",
    "The framework would crash with a stack overflow error",
  ],
  correctIndex: 1,
  feedback: [
    "In practice, agents frequently try to recurse deeper. Without a limit, a model that decides 'I need a specialist for this subtask' at every level will spawn children forever. The limit isn't theoretical — it's based on observed behavior.",
    "Correct — without a cap, a model that delegates at every step creates an unbounded chain: each child spawns its own child, each child costs tokens and wall-clock time, and nothing prevents the chain from growing until the budget is exhausted. The depth limit is a design constraint that forces flat, purposeful delegation.",
    "There's no stack overflow — task spawning is async, not recursive function calls. The real danger is economic: each task is a full LLM call, and unbounded spawning means unbounded cost. The framework prevents this at the architectural level, not the runtime level.",
  ],
};

function ConnectorLine({ depth }: { depth: number }) {
  const left = (depth - 1) * INDENT_PX + CONNECTOR_LEFT_OFFSET;

  return (
    <div
      style={{
        position: "relative",
        height: 6,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left,
          top: 0,
          width: 1,
          height: "100%",
          background: "var(--color-border)",
        }}
      />
    </div>
  );
}

function TaskNode({
  depth,
  reducedMotion,
  isLast,
}: {
  depth: number;
  reducedMotion: boolean;
  isLast: boolean;
}) {
  const isRoot = depth === 0;
  const isLimit = depth === MAX_DEPTH;

  const style: React.CSSProperties = {
    marginLeft: depth * INDENT_PX,
    background: isLimit
      ? "rgba(229, 83, 75, 0.04)"
      : "var(--color-surface)",
    border: isLimit
      ? "1px solid rgba(229, 83, 75, 0.25)"
      : "1px solid var(--color-border)",
    borderLeft: isRoot
      ? "3px solid var(--color-accent)"
      : isLimit
        ? "3px solid rgba(229, 83, 75, 0.5)"
        : "1px solid var(--color-border)",
    borderRadius: "var(--radius-1)",
    padding: "6px 10px",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    color: isLimit ? "#e5534b" : "var(--color-text)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    position: "relative",
  };

  const badgeBg = DEPTH_COLORS[depth] ?? "var(--color-surface-2)";
  const badgeColor = DEPTH_TEXT_COLORS[depth] ?? "var(--color-muted)";

  const badge: React.CSSProperties = {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    background: badgeBg,
    color: badgeColor,
    flexShrink: 0,
  };

  const label = `${labels[depth]} (depth ${depth})`;

  const connectorContent = depth > 0 ? (
    <div
      style={{
        position: "absolute",
        left: -INDENT_PX + CONNECTOR_LEFT_OFFSET,
        top: "50%",
        width: INDENT_PX - CONNECTOR_LEFT_OFFSET - 1,
        height: 1,
        background: "var(--color-border)",
      }}
    />
  ) : null;

  if (reducedMotion || isRoot) {
    return (
      <div style={style}>
        {connectorContent}
        <span style={badge}>{depth}</span>
        {label}
      </div>
    );
  }

  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING.snappy}
    >
      {connectorContent}
      <span style={badge}>{depth}</span>
      {label}
    </motion.div>
  );
}

function PredictPhase({
  onComplete,
  reducedMotion,
}: {
  onComplete: () => void;
  reducedMotion: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = selected === PREDICTION.correctIndex;

  const handleSelect = useCallback(
    (index: number) => {
      if (revealed) return;
      setSelected(index);
      setRevealed(true);
    },
    [revealed],
  );

  const feedbackText =
    selected !== null ? PREDICTION.feedback[selected] : "";

  return (
    <div
      style={{
        marginTop: "var(--space-3)",
        padding: "12px",
        borderRadius: "var(--radius-1)",
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text)",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.5,
        }}
      >
        &#9656; {PREDICTION.question}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: "var(--space-3)",
        }}
      >
        {PREDICTION.options.map((option, i) => {
          const isThis = selected === i;
          const showCorrect = revealed && i === PREDICTION.correctIndex;
          const showWrong = revealed && isThis && !isCorrect;

          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={revealed}
              whileHover={
                !revealed && !reducedMotion
                  ? { scale: 1.01, backgroundColor: "color-mix(in srgb, var(--color-accent) 6%, transparent)" }
                  : undefined
              }
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "var(--radius-1)",
                border: showCorrect
                  ? "1px solid var(--color-accent)"
                  : showWrong
                    ? "1px solid #e5534b"
                    : "1px solid var(--color-border)",
                background: showCorrect
                  ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                  : showWrong
                    ? "rgba(229, 83, 75, 0.06)"
                    : "var(--color-surface)",
                cursor: revealed ? "default" : "pointer",
                textAlign: "left",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--color-text)",
                opacity: revealed && !isThis && !showCorrect ? 0.4 : 1,
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  background: showCorrect
                    ? "var(--color-accent)"
                    : showWrong
                      ? "#e5534b"
                      : "var(--color-surface-2)",
                  color:
                    showCorrect || showWrong
                      ? "var(--color-bg)"
                      : "var(--color-muted)",
                }}
              >
                {showCorrect
                  ? "✓"
                  : showWrong
                    ? "✗"
                    : String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={
              reducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }
            }
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.collapse}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                marginTop: "var(--space-3)",
                padding: "8px 12px",
                borderRadius: "var(--radius-1)",
                borderLeft: `3px solid ${isCorrect ? "var(--color-accent)" : "#e5534b"}`,
                background: "var(--color-surface)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--color-text)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {feedbackText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {revealed && (
        <motion.button
          type="button"
          onClick={onComplete}
          whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
          style={{
            marginTop: "var(--space-3)",
            padding: "6px 16px",
            borderRadius: "var(--radius-1)",
            background: "var(--color-accent)",
            color: "var(--color-bg)",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          See the insight &rarr;
        </motion.button>
      )}
    </div>
  );
}

function InsightPhase({ reducedMotion }: { reducedMotion: boolean }) {
  const content = (
    <div
      style={{
        marginTop: "var(--space-3)",
        padding: "12px 16px",
        borderRadius: "var(--radius-1)",
        borderLeft: "3px solid var(--color-accent)",
        background: "var(--color-surface-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.7,
        color: "var(--color-text)",
      }}
    >
      <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>
        The depth limit is a design constraint, not a technical limitation.
      </p>
      <p style={{ margin: 0 }}>
        Flue caps task recursion at {MAX_DEPTH} levels. This forces agents to
        delegate with purpose &mdash; if you can only go 4 levels deep, you have
        to make each level count. The alternative is agents that &quot;think
        by delegating&quot; &mdash; spawning children for every sub-question
        instead of reasoning directly. The cap turns delegation from an
        unbounded escape hatch into a scarce resource that demands
        intentionality.
      </p>
    </div>
  );

  if (reducedMotion) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION.enterItem}
    >
      {content}
    </motion.div>
  );
}

export function DepthDive() {
  const [depth, setDepth] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [phase, setPhase] = useState<Phase>("spawn");
  const reducedMotion = usePrefersReducedMotion();

  const spawn = useCallback(() => {
    if (depth >= MAX_DEPTH) {
      setIsBlocked(true);
      if (phase === "spawn") {
        setPhase("predict");
      }
      return;
    }
    setIsBlocked(false);
    setDepth((d) => d + 1);
  }, [depth, phase]);

  const reset = useCallback(() => {
    setDepth(0);
    setIsBlocked(false);
    setPhase("spawn");
  }, []);

  const shakeAnimation = reducedMotion
    ? {}
    : {
        x: [0, -4, 4, -4, 4, -2, 2, 0],
        transition: { duration: DURATION.fast, ease: EASE.out },
      };

  const spawnAnimate = isBlocked ? shakeAnimation : {};

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          Task Recursion Depth
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-muted)",
          }}
        >
          {depth}/{MAX_DEPTH}
        </span>
      </div>

      <div style={{ padding: "var(--space-4)" }}>
        <div className="flex flex-col" style={{ gap: 0 }}>
          {Array.from({ length: depth + 1 }, (_, i) => (
            <div key={i}>
              {i > 0 && <ConnectorLine depth={i} />}
              <TaskNode
                depth={i}
                reducedMotion={reducedMotion}
                isLast={i === depth}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <motion.button
            type="button"
            onClick={spawn}
            animate={spawnAnimate}
            disabled={phase !== "spawn"}
            whileHover={
              phase === "spawn" && !isBlocked && !reducedMotion
                ? { scale: 1.02 }
                : undefined
            }
            className={`cursor-pointer rounded px-3 py-1.5 text-xs font-medium ${isBlocked && !reducedMotion ? ddStyles.pulseBlocked : ""}`}
            style={{
              background: isBlocked
                ? "#e5534b"
                : "var(--color-surface-2)",
              border: isBlocked
                ? "1px solid #e5534b"
                : "1px solid var(--color-border)",
              color: isBlocked ? "#fff" : "var(--color-text)",
              fontFamily: "var(--font-mono)",
              opacity: phase !== "spawn" ? 0.5 : 1,
              cursor: phase !== "spawn" ? "default" : "pointer",
            }}
          >
            {isBlocked ? "MAX DEPTH — blocked" : "+ Spawn Task"}
          </motion.button>

          {phase !== "spawn" && (
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded px-3 py-1.5 text-xs font-medium"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Try again
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {phase === "predict" && (
            <PredictPhase
              key="predict"
              onComplete={() => setPhase("insight")}
              reducedMotion={reducedMotion}
            />
          )}
          {phase === "insight" && (
            <InsightPhase key="insight" reducedMotion={reducedMotion} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DepthDive;

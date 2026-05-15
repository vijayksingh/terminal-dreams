"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { SCENARIOS, PATTERNS } from "./pattern-data";

export function ScenarioQuiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const scenario = SCENARIOS[currentIdx];

  const handleSelect = useCallback(
    (patternId: string) => {
      if (revealed) return;
      setSelectedId(patternId);
      setRevealed(true);
      if (patternId === scenario.correctId) {
        setScore((s) => s + 1);
      }
    },
    [revealed, scenario],
  );

  const handleNext = useCallback(() => {
    if (currentIdx < SCENARIOS.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedId(null);
      setRevealed(false);
    } else {
      setCompleted(true);
    }
  }, [currentIdx]);

  const handleRestart = useCallback(() => {
    setCurrentIdx(0);
    setSelectedId(null);
    setRevealed(false);
    setScore(0);
    setCompleted(false);
  }, []);

  if (completed) {
    return (
      <CompletionCard
        score={score}
        total={SCENARIOS.length}
        onRestart={handleRestart}
        reducedMotion={reducedMotion}
      />
    );
  }

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
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent)",
              background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
              border: "1px solid var(--color-accent)",
              fontSize: 10,
            }}
          >
            Scenario
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
          >
            {currentIdx + 1} / {SCENARIOS.length}
          </span>
        </div>
        <span
          className="text-xs"
          style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
        >
          Score: {score}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "var(--color-bg)" }}>
        <div
          className="h-full"
          style={{
            width: `${((currentIdx + (revealed ? 1 : 0)) / SCENARIOS.length) * 100}%`,
            background: "var(--color-accent)",
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Scenario content */}
      <AnimatePresence mode="wait">
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          selectedId={selectedId}
          revealed={revealed}
          onSelect={handleSelect}
          onNext={handleNext}
          isLast={currentIdx === SCENARIOS.length - 1}
          reducedMotion={reducedMotion}
        />
      </AnimatePresence>
    </div>
  );
}

function ScenarioCard({
  scenario,
  selectedId,
  revealed,
  onSelect,
  onNext,
  isLast,
  reducedMotion,
}: {
  scenario: (typeof SCENARIOS)[number];
  selectedId: string | null;
  revealed: boolean;
  onSelect: (id: string) => void;
  onNext: () => void;
  isLast: boolean;
  reducedMotion: boolean;
}) {
  const inner = (
    <div>
      {/* Context */}
      <div className="px-4 py-4">
        <h4
          className="m-0 mb-2 text-base font-bold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
        >
          {scenario.title}
        </h4>
        <p
          className="m-0 mb-3 text-sm leading-relaxed"
          style={{ color: "var(--color-text)" }}
        >
          {scenario.context}
        </p>
        <div className="flex flex-wrap gap-2">
          {scenario.constraints.map((c, i) => (
            <span
              key={i}
              className="inline-flex rounded-full px-2.5 py-1 text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--color-muted)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Options */}
      <div
        className="px-4 pb-4"
        style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}
      >
        <div
          className="mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{
            color: "var(--color-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          Which pattern fits best?
        </div>
        <div className="grid grid-cols-2 gap-2">
          {scenario.options.map((opt) => {
            const isCorrect = opt.patternId === scenario.correctId;
            const isSelected = opt.patternId === selectedId;
            const pattern = PATTERNS[opt.patternId];

            let borderColor = "var(--color-border)";
            let bgColor = "var(--color-bg)";
            let textColor = "var(--color-text)";

            if (revealed) {
              if (isCorrect) {
                borderColor = "#98c379";
                bgColor = "#98c37915";
                textColor = "#98c379";
              } else if (isSelected && !isCorrect) {
                borderColor = "#e06c75";
                bgColor = "#e06c7515";
                textColor = "#e06c75";
              } else {
                borderColor = "var(--color-border)";
                bgColor = "var(--color-bg)";
                textColor = "var(--color-muted)";
              }
            }

            return (
              <button
                key={opt.patternId}
                type="button"
                onClick={() => onSelect(opt.patternId)}
                disabled={revealed}
                className="cursor-pointer rounded px-3 py-2.5 text-left"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: textColor,
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  transition: "all 0.2s",
                  opacity: revealed && !isCorrect && !isSelected ? 0.5 : 1,
                }}
              >
                <div className="font-semibold">{opt.label}</div>
                {pattern && (
                  <div
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--color-muted)", fontSize: 10 }}
                  >
                    {pattern.year}
                  </div>
                )}
                {revealed && isCorrect && (
                  <span style={{ fontSize: 10, color: "#98c379" }}> correct</span>
                )}
                {revealed && isSelected && !isCorrect && (
                  <span style={{ fontSize: 10, color: "#e06c75" }}> not quite</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Targeted feedback (revealed) */}
      {revealed && selectedId && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}
        >
          {/* Per-option feedback */}
          <div
            className="rounded text-xs leading-relaxed"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-text)",
              background: "var(--color-bg)",
              padding: "10px 12px",
              border: `1px solid ${selectedId === scenario.correctId ? "#98c379" : "#e06c75"}`,
            }}
          >
            <span
              style={{
                color: selectedId === scenario.correctId ? "#98c379" : "#e06c75",
                fontWeight: 600,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {selectedId === scenario.correctId ? "Why this works: " : "Why not: "}
            </span>
            {scenario.feedback[selectedId] ?? scenario.explanation}
          </div>

          {/* If wrong, also show what actually happened */}
          {selectedId !== scenario.correctId && (
            <div
              className="mt-2 rounded text-xs leading-relaxed"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-text)",
                background: "var(--color-bg)",
                padding: "10px 12px",
                border: "1px solid #98c379",
              }}
            >
              <span
                style={{
                  color: "#98c379",
                  fontWeight: 600,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                What actually happened:{" "}
              </span>
              {scenario.feedback[scenario.correctId] ?? scenario.explanation}
            </div>
          )}

          <button
            type="button"
            onClick={onNext}
            className="mt-3 cursor-pointer rounded px-4 py-2 text-xs font-semibold"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-bg)",
              background: "var(--color-accent)",
              border: "none",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {isLast ? "See Results" : "Next Scenario →"}
          </button>
        </div>
      )}
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={TRANSITION.enterCard}
    >
      {inner}
    </motion.div>
  );
}

function CompletionCard({
  score,
  total,
  onRestart,
  reducedMotion,
}: {
  score: number;
  total: number;
  onRestart: () => void;
  reducedMotion: boolean;
}) {
  const pct = Math.round((score / total) * 100);
  const message =
    pct === 100
      ? "You nailed every scenario. You understand when each pattern shines."
      : pct >= 75
        ? "Strong instincts. You're reading the constraints well."
        : pct >= 50
          ? "Solid foundation. The nuances between patterns take time."
          : "Architecture patterns are tricky. The real lesson: context determines the right answer.";

  const inner = (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div className="px-4 py-6 text-center">
        <div
          className="mb-2 text-3xl font-bold"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}
        >
          {score}/{total}
        </div>
        <div
          className="mb-4 text-sm leading-relaxed"
          style={{ color: "var(--color-text)", maxWidth: 400, margin: "0 auto" }}
        >
          {message}
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="cursor-pointer rounded px-4 py-2 text-xs font-semibold"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-bg)",
            background: "var(--color-accent)",
            border: "none",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING.gentle}
    >
      {inner}
    </motion.div>
  );
}

export default ScenarioQuiz;

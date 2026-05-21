"use client";

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import styles from "./PredictionChallenge.module.css";

type WrongHints = Record<string | number, string>;

export interface PredictionChallengeProps {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  wrongHints?: WrongHints;
  onCorrect?: () => void;
}

class PredictionErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PredictionChallenge]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <aside className={styles.root} style={{ borderLeftColor: "red" }}>
          <p className={styles.label}>Prediction challenge failed to render</p>
          <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap", color: "var(--color-error, red)" }}>
            {this.state.error.message}
          </pre>
        </aside>
      );
    }
    return this.props.children;
  }
}

function PredictionChallengeInner({
  question,
  options,
  correctIndex,
  explanation,
  wrongHints,
  onCorrect,
}: PredictionChallengeProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const noMotion = usePrefersReducedMotion();

  useEffect(() => {
    console.log("[PredictionChallenge] mounted:", question?.substring(0, 40));
  }, [question]);

  if (!options || !question) return null;
  const revealed = selected !== null;
  const isCorrect = selected === correctIndex;
  const feedback = isCorrect
    ? explanation
    : selected !== null && wrongHints && (wrongHints[selected] ?? wrongHints[String(selected)])
      ? wrongHints[selected] ?? wrongHints[String(selected)]
      : explanation;

  const handlePick = (i: number) => {
    if (isCorrect) return;
    setSelected(i);
    if (i === correctIndex) onCorrect?.();
  };

  return (
    <aside className={styles.root} aria-label="Prediction challenge">
      <p className={styles.label}>Predict first</p>
      <p className={styles.question}>{question}</p>
      <div className={styles.options} role="radiogroup" aria-label={question}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.option}
            data-correct={revealed && i === correctIndex ? "true" : undefined}
            data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
            disabled={isCorrect}
            onClick={() => handlePick(i)}
            role="radio"
            aria-checked={selected === i}
          >
            <span className={styles.optionIndex}>{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {revealed && (
          <motion.div
            key={selected}
            className={styles.result}
            data-correct={isCorrect ? "true" : undefined}
            initial={noMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={noMotion ? undefined : { opacity: 0, y: -4 }}
            transition={noMotion ? { duration: 0 } : (isCorrect ? SPRING.quick : TRANSITION.enterCard)}
          >
            <span className={styles.resultIcon}>{isCorrect ? "✓" : "✗"}</span>
            <span className={styles.resultText}>{feedback}</span>
            {!isCorrect && (
              <button
                type="button"
                className={styles.retry}
                onClick={() => setSelected(null)}
              >
                Try again →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

export function PredictionChallenge(props: PredictionChallengeProps) {
  return (
    <PredictionErrorBoundary>
      <PredictionChallengeInner {...props} />
    </PredictionErrorBoundary>
  );
}

export default PredictionChallenge;

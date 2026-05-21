"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { formatTuple, type SelectorToken, type SpecificityTuple } from "../engine/css-perf-simulator";
import styles from "../CSSPerfLab.module.css";

type Winner = "a" | "b" | "tie" | null;

export function SpecificityCalculator({
  selectorA,
  selectorB,
  tokensA,
  tokensB,
  specA,
  specB,
  validA,
  validB,
  winner,
  onChangeA,
  onChangeB,
}: {
  selectorA: string;
  selectorB: string;
  tokensA: SelectorToken[];
  tokensB: SelectorToken[];
  specA: SpecificityTuple;
  specB: SpecificityTuple;
  validA: boolean;
  validB: boolean;
  winner: Winner;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
}) {
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Specificity Calculator</div>
      <p className={styles.widgetNote}>
        Type two selectors. The column counters compare lexicographically — IDs &gt;&gt; classes &gt;&gt; elements.
      </p>

      <div className={styles.versusGrid}>
        <SpecPanel
          which="a"
          selector={selectorA}
          tokens={tokensA}
          spec={specA}
          valid={validA}
          wins={winner === "a"}
          tied={winner === "tie"}
          onChange={onChangeA}
        />
        <span className={styles.versusDivider} aria-hidden="true">VS</span>
        <SpecPanel
          which="b"
          selector={selectorB}
          tokens={tokensB}
          spec={specB}
          valid={validB}
          wins={winner === "b"}
          tied={winner === "tie"}
          onChange={onChangeB}
        />
      </div>
    </div>
  );
}

function SpecPanel({
  which,
  selector,
  tokens,
  spec,
  valid,
  wins,
  tied,
  onChange,
}: {
  which: "a" | "b";
  selector: string;
  tokens: SelectorToken[];
  spec: SpecificityTuple;
  valid: boolean;
  wins: boolean;
  tied: boolean;
  onChange: (v: string) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.specPanel} data-wins={wins ? "true" : undefined} data-tied={tied ? "true" : undefined}>
      <div className={styles.specHeader}>
        <span className={styles.specPanelLabel}>Selector {which.toUpperCase()}</span>
        <AnimatePresence initial={false}>
          {wins && (
            <motion.span
              key="wins"
              className={styles.specBadge}
              initial={reducedMotion ? false : { scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { scale: 0 }}
              transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
            >
              WINS
            </motion.span>
          )}
          {tied && (
            <motion.span
              key="tie"
              className={styles.specBadge}
              data-tied="true"
              initial={reducedMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
            >
              TIE
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <input
        type="text"
        value={selector}
        onChange={(e) => onChange(e.target.value)}
        className={styles.specInput}
        data-invalid={!valid && selector.length > 0 ? "true" : undefined}
        spellCheck={false}
        placeholder="type a selector..."
        aria-label={`Selector ${which.toUpperCase()}`}
      />

      <div className={styles.specColumns}>
        <SpecColumn label="ID" value={spec[0]} tone="id" max={2} />
        <SpecColumn label="Class" value={spec[1]} tone="class" max={4} />
        <SpecColumn label="Element" value={spec[2]} tone="element" max={6} />
      </div>

      <div className={styles.specTuple}>
        <span className={styles.specTupleLabel}>tuple</span>
        <span className={styles.specTupleValue}>{formatTuple(spec)}</span>
      </div>

      <div className={styles.tokenStream}>
        {tokens.length === 0 ? (
          <span className={styles.tokenEmpty}>{valid ? "—" : "invalid selector"}</span>
        ) : (
          tokens.map((tok, i) => (
            <motion.span
              key={`${tok.text}-${i}`}
              className={styles.tokenPill}
              data-kind={tok.kind}
              initial={reducedMotion ? false : { opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { ...TRANSITION.enterItem, delay: i * 0.04 }}
            >
              {tok.text === " " ? "␣" : tok.text}
            </motion.span>
          ))
        )}
      </div>
    </div>
  );
}

function SpecColumn({
  label,
  value,
  tone,
  max,
}: {
  label: string;
  value: number;
  tone: "id" | "class" | "element";
  max: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const fillPct = Math.min(value / max, 1) * 100;

  return (
    <div className={styles.specColumn} data-tone={tone}>
      <span className={styles.specColumnHead}>{label}</span>
      <div className={styles.specColumnBar}>
        <motion.span
          className={styles.specColumnFill}
          data-tone={tone}
          initial={reducedMotion ? false : { height: 0 }}
          animate={{ height: `${fillPct}%` }}
          transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
        />
      </div>
      <motion.span
        key={value}
        className={styles.specColumnValue}
        initial={reducedMotion ? false : { scale: 1.18 }}
        animate={{ scale: 1 }}
        transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
      >
        {value}
      </motion.span>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { useCwvContext, INP_OPTIMIZATIONS } from "../cwv-context";
import { formatInp, rateInp, sumInp } from "../engine/cwv-simulator";
import styles from "../CoreWebVitalsLab.module.css";

export function InpOptimization() {
  const { activeInpOptimization, setActiveInpOptimization } = useCwvContext();
  const active = INP_OPTIMIZATIONS.find((opt) => opt.id === activeInpOptimization)!;
  const beforeTotal = sumInp(active.before);
  const afterTotal = sumInp(active.after);
  const beforeRating = rateInp(beforeTotal);
  const afterRating = rateInp(afterTotal);

  return (
    <div className={styles.inpOptRoot}>
      <div className={styles.inpOptTabs} role="tablist" aria-label="INP optimisation">
        {INP_OPTIMIZATIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            className={styles.inpOptTab}
            data-active={opt.id === activeInpOptimization ? "true" : undefined}
            aria-selected={opt.id === activeInpOptimization}
            onClick={() => setActiveInpOptimization(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className={styles.inpOptDescription}>{active.description}</p>

      <div className={styles.inpOptCompare}>
        <InpTimeline title="Before" data={active.before} total={beforeTotal} rating={beforeRating} />
        <InpTimeline title="After" data={active.after} total={afterTotal} rating={afterRating} />
      </div>

      <div className={styles.inpOptSavings}>
        Interaction latency dropped by <strong>{beforeTotal - afterTotal}ms</strong>
        {" "}
        ({Math.round(((beforeTotal - afterTotal) / beforeTotal) * 100)}%) — the worst interaction now passes the {`<=`} 200ms threshold.
      </div>
    </div>
  );
}

type InpTimelineProps = {
  title: string;
  data: { "input-delay": number; processing: number; presentation: number };
  total: number;
  rating: ReturnType<typeof rateInp>;
};

function InpTimeline({ title, data, total, rating }: InpTimelineProps) {
  const phases = [
    { id: "input-delay", label: "Input delay", value: data["input-delay"] },
    { id: "processing", label: "Processing", value: data.processing },
    { id: "presentation", label: "Presentation", value: data.presentation },
  ] as const;
  return (
    <div className={styles.inpOptColumn}>
      <span className={styles.inpOptColumnTitle}>{title}</span>
      <div className={styles.inpOptTimeline}>
        {phases.map((phase) => (
          <motion.div
            key={phase.id}
            className={styles.inpOptBlock}
            data-phase={phase.id}
            initial={false}
            animate={{ flex: phase.value }}
            transition={TRANSITION.progress}
          >
            <span className={styles.inpOptBlockLabel}>{phase.label}</span>
            <span className={styles.inpOptBlockValue}>{phase.value}ms</span>
          </motion.div>
        ))}
      </div>
      <span className={styles.inpOptColumnTotal} data-rating={rating}>{formatInp(total)}</span>
    </div>
  );
}

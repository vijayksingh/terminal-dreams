"use client";

import type { ProbeCard } from "./types";
import styles from "./styles.module.css";

type PickStripProps = {
  picks: string[];
  pickedProbes: ProbeCard[];
  budget: number;
  canSubmit: boolean;
  onSubmit: () => void;
  onClearAll: () => void;
};

export function PickStrip({
  picks,
  pickedProbes,
  budget,
  canSubmit,
  onSubmit,
  onClearAll,
}: PickStripProps) {
  const slots = Array.from({ length: budget }, (_, i) => i);

  return (
    <div className={styles.pickStripWrap}>
      <div className={styles.pickStripHead}>
        <span className={styles.pickStripLabel}>your {budget} picks</span>
        <span className={styles.pickStripCount}>
          {picks.length} / {budget} chosen
        </span>
      </div>

      <div className={styles.pickStrip}>
        {slots.map((i) => {
          const id = picks[i];
          const probe = id ? pickedProbes.find((p) => p.id === id) : null;
          return (
            <div
              key={i}
              className={styles.pickSlot}
              data-filled={probe ? "true" : undefined}
            >
              <span className={styles.pickSlotRank}>{i + 1}</span>
              <span className={styles.pickSlotText}>
                {probe ? probe.text : <em className={styles.pickSlotEmpty}>empty slot</em>}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.pickActions}>
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClearAll}
          disabled={picks.length === 0}
        >
          clear
        </button>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          submit ranking →
        </button>
      </div>
    </div>
  );
}

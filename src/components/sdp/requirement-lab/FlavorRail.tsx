"use client";

import { FLAVOR_META, FLAVOR_ORDER } from "./types";
import styles from "./styles.module.css";

// Pre-submit primer: shows the 5 probe flavors as a learning meta-taxonomy.
// Not interactive — purely educational. Helps the learner read the wall.
export function FlavorRail() {
  return (
    <div className={styles.flavorRail} aria-label="Probe flavors">
      <span className={styles.flavorRailLabel}>
        five flavors of stress test · senior architects use these reflexively
      </span>
      <div className={styles.flavorChips}>
        {FLAVOR_ORDER.map((flavor) => {
          const meta = FLAVOR_META[flavor];
          return (
            <div
              key={flavor}
              className={styles.flavorChip}
              style={{ "--flavor-tone": meta.tone } as React.CSSProperties}
            >
              <span className={styles.flavorChipLabel}>{meta.label}</span>
              <span className={styles.flavorChipHint}>{meta.one_liner}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

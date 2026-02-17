"use client";

import styles from "@/components/retro/retro.module.css";
import { useState } from "react";

export function InteractiveCounter() {
  const [count, setCount] = useState(0);
  return (
    <div className={styles.widget}>
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
        <button
          onClick={() => setCount((c) => c - 1)}
          className={styles.listLink}
          style={{
            border: "1px solid var(--color-border)",
            padding: "var(--space-1) var(--space-2)",
          }}
        >
          −
        </button>
        <div className={styles.statNumber} style={{ minWidth: 40, textAlign: "center" }}>
          {count}
        </div>
        <button
          onClick={() => setCount((c) => c + 1)}
          className={styles.listLink}
          style={{
            border: "1px solid var(--color-border)",
            padding: "var(--space-1) var(--space-2)",
          }}
        >
          +
        </button>
      </div>
      <div className={styles.statLabel} style={{ marginTop: "var(--space-2)" }}>
        Interactive Counter
      </div>
    </div>
  );
}

export default InteractiveCounter;



"use client";

import styles from "@/components/retro/retro.module.css";
import { useState } from "react";

export function InteractiveCounter() {
  const [count, setCount] = useState(0);
  return (
    <div className={styles.widget}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <button
          onClick={() => setCount((c) => c - 1)}
          className={styles.listLink}
          style={{ border: "1px solid #303030", padding: "0.25rem 0.5rem" }}
        >
          −
        </button>
        <div className={styles.statNumber} style={{ minWidth: 40, textAlign: "center" }}>
          {count}
        </div>
        <button
          onClick={() => setCount((c) => c + 1)}
          className={styles.listLink}
          style={{ border: "1px solid #303030", padding: "0.25rem 0.5rem" }}
        >
          +
        </button>
      </div>
      <div className={styles.statLabel} style={{ marginTop: "0.5rem" }}>
        Interactive Counter
      </div>
    </div>
  );
}



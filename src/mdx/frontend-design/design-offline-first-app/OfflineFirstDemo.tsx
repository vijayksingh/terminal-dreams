"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useCallback } from "react";

type QueueItem = { id: string; action: string; status: "pending" | "synced" | "failed" };

const INITIAL_QUEUE: QueueItem[] = [
  { id: "q1", action: "Update title → 'Weekly Report'", status: "pending" },
  { id: "q2", action: "Add comment → 'Looks good'", status: "pending" },
  { id: "q3", action: "Delete attachment #3", status: "pending" },
];

export function OfflineFirstDemo() {
  const [online, setOnline] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(() => {
    if (!online || syncing) return;
    setSyncing(true);
    let idx = 0;
    const timer = setInterval(() => {
      setQueue((prev) => {
        const next = [...prev];
        if (idx < next.length) {
          next[idx] = { ...next[idx]!, status: Math.random() > 0.15 ? "synced" : "failed" };
          idx++;
        }
        if (idx >= next.length) {
          clearInterval(timer);
          setSyncing(false);
        }
        return next;
      });
    }, 600);
  }, [online, syncing]);

  const reset = () => {
    setQueue(INITIAL_QUEUE);
    setSyncing(false);
  };

  const pending = queue.filter((q) => q.status === "pending").length;
  const synced = queue.filter((q) => q.status === "synced").length;

  return (
    <DemoSandbox title="Offline Sync Queue — toggle online and sync">
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <button
            onClick={() => setOnline(!online)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              backgroundColor: online
                ? "color-mix(in srgb, var(--diagram-layer-1) 15%, transparent)"
                : "color-mix(in srgb, var(--diagram-layer-8) 15%, transparent)",
              color: "var(--color-fg)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "inherit",
              minHeight: 44,
            }}
          >
            {online ? "● Online" : "○ Offline"}
          </button>
          <button
            onClick={sync}
            disabled={!online || syncing || pending === 0}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-fg)",
              cursor: !online || syncing || pending === 0 ? "not-allowed" : "pointer",
              opacity: !online || syncing || pending === 0 ? 0.6 : 1,
              fontFamily: "inherit",
              fontSize: "inherit",
              minHeight: 44,
            }}
          >
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <button
            onClick={reset}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-fg)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "inherit",
              minHeight: 44,
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {queue.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 6,
                backgroundColor:
                  item.status === "synced"
                    ? "color-mix(in srgb, var(--diagram-layer-1) 12%, transparent)"
                    : item.status === "failed"
                      ? "color-mix(in srgb, var(--diagram-layer-8) 12%, transparent)"
                      : "color-mix(in srgb, var(--diagram-layer-4) 12%, transparent)",
                transition: "background-color 0.3s ease-out",
              }}
            >
              <span>{item.action}</span>
              <span style={{ color: "var(--color-muted)" }}>
                {item.status === "synced" ? "✓" : item.status === "failed" ? "✗" : "◌"}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 8, color: "var(--color-muted)", fontSize: 11 }}>
          <span>Pending: {pending}</span>
          <span>Synced: {synced}</span>
          <span>Failed: {queue.filter((q) => q.status === "failed").length}</span>
        </div>
      </div>
    </DemoSandbox>
  );
}

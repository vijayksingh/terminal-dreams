"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useCallback } from "react";

type Tab = { id: string; name: string; counter: number; isLeader: boolean };

export function MultiTabDemo() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "tab-1", name: "Tab 1", counter: 0, isLeader: true },
    { id: "tab-2", name: "Tab 2", counter: 0, isLeader: false },
    { id: "tab-3", name: "Tab 3", counter: 0, isLeader: false },
  ]);
  const [log, setLog] = useState<string[]>([]);

  const broadcast = useCallback((fromId: string, newValue: number) => {
    setTabs((prev) =>
      prev.map((t) => ({ ...t, counter: newValue }))
    );
    const from = tabs.find((t) => t.id === fromId);
    setLog((prev) => [
      `${from?.name ?? fromId} → broadcast(${newValue})`,
      ...prev.slice(0, 9),
    ]);
  }, [tabs]);

  const increment = useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    broadcast(tabId, tab.counter + 1);
  }, [tabs, broadcast]);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (remaining.length === 0) return prev;
      const wasLeader = prev.find((t) => t.id === tabId)?.isLeader;
      if (wasLeader && remaining.length > 0) {
        remaining[0] = { ...remaining[0]!, isLeader: true };
        setLog((l) => [`${remaining[0]!.name} elected as new leader`, ...l.slice(0, 9)]);
      }
      return remaining;
    });
  }, []);

  return (
    <DemoSandbox title="Multi-tab Sync — increment in one tab, all update">
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                backgroundColor: tab.isLeader
                  ? "color-mix(in srgb, var(--diagram-layer-4) 15%, transparent)"
                  : "var(--color-surface)",
                border: "1px solid var(--color-border)",
                minWidth: 120,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>
                  {tab.name} {tab.isLeader ? "👑" : ""}
                </span>
                {tabs.length > 1 && (
                  <button
                    onClick={() => closeTab(tab.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-muted)",
                      fontSize: 14,
                      padding: "2px 4px",
                    }}
                    aria-label={`Close ${tab.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, textAlign: "center", margin: "8px 0" }}>
                {tab.counter}
              </div>
              <button
                onClick={() => increment(tab.id)}
                style={{
                  width: "100%",
                  padding: "6px 12px",
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
                +1
              </button>
            </div>
          ))}
        </div>

        {log.length > 0 && (
          <div style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--color-surface)", fontSize: 11, color: "var(--color-muted)" }}>
            {log.map((entry, i) => (
              <div key={i} style={{ opacity: 1 - i * 0.08 }}>{entry}</div>
            ))}
          </div>
        )}
      </div>
    </DemoSandbox>
  );
}

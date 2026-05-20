"use client";

export function MicrofrontendDemo() {
  return (
    <div
      style={{
        padding: "var(--space-4)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        color: "var(--color-muted)",
        textAlign: "center",
      }}
    >
      Interactive lab available — click the lab button above to explore
      micro-frontend architecture with module federation, shared dependencies,
      and event bus communication.
    </div>
  );
}

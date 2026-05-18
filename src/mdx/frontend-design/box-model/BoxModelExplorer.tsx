"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState } from "react";

type BoxSizing = "content-box" | "border-box";

export function BoxModelExplorer() {
  const [sizing, setSizing] = useState<BoxSizing>("content-box");
  const [padding, setPadding] = useState(20);
  const [borderW, setBorderW] = useState(4);
  const [margin, setMargin] = useState(16);
  const declaredWidth = 200;

  const contentWidth =
    sizing === "content-box"
      ? declaredWidth
      : Math.max(0, declaredWidth - padding * 2 - borderW * 2);

  const totalWidth =
    sizing === "content-box"
      ? declaredWidth + padding * 2 + borderW * 2
      : declaredWidth;

  return (
    <DemoSandbox title="Box Model Explorer">
      <DemoSandbox.Tabs
        options={["content-box", "border-box"] as const}
        value={sizing}
        onChange={(v) => setSizing(v as BoxSizing)}
      />
      <DemoSandbox.Controls>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
          padding
          <input type="range" min={0} max={40} value={padding} onChange={(e) => setPadding(Number(e.target.value))} />
          <span style={{ minWidth: "2.5em", textAlign: "right" }}>{padding}px</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
          border
          <input type="range" min={0} max={12} value={borderW} onChange={(e) => setBorderW(Number(e.target.value))} />
          <span style={{ minWidth: "2.5em", textAlign: "right" }}>{borderW}px</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
          margin
          <input type="range" min={0} max={40} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
          <span style={{ minWidth: "2.5em", textAlign: "right" }}>{margin}px</span>
        </label>
      </DemoSandbox.Controls>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", minHeight: 280 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          {/* Box model visualization */}
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* Margin layer */}
            <div
              style={{
                padding: margin,
                background: "oklch(70% 0.12 30 / 0.25)",
                position: "relative",
              }}
            >
              {/* Border layer */}
              <div
                style={{
                  border: `${borderW}px solid oklch(60% 0.1 60)`,
                  position: "relative",
                }}
              >
                {/* Padding layer */}
                <div
                  style={{
                    padding,
                    background: "oklch(65% 0.15 140 / 0.25)",
                    position: "relative",
                  }}
                >
                  {/* Content */}
                  <div
                    style={{
                      width: contentWidth,
                      height: 80,
                      background: "oklch(65% 0.15 200 / 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text)",
                    }}
                  >
                    content: {contentWidth}px
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation readout */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-muted)",
              textAlign: "center",
              lineHeight: 1.8,
            }}
          >
            <div>
              <span style={{ color: "var(--color-text)" }}>width: {declaredWidth}px</span>
              {" "}({sizing})
            </div>
            <div>
              rendered = {contentWidth} + {padding * 2} + {borderW * 2} ={" "}
              <span style={{ color: "var(--color-accent)" }}>{totalWidth}px</span>
            </div>
            {margin > 0 && (
              <div>
                + {margin * 2}px margin = {totalWidth + margin * 2}px total space
              </div>
            )}
          </div>
        </div>
      </div>

      <DemoSandbox.Caption>
        Toggle between content-box and border-box to see how the declared width is interpreted.
        Drag the sliders to adjust padding, border, and margin.
      </DemoSandbox.Caption>
    </DemoSandbox>
  );
}

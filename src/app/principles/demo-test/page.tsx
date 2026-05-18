"use client";

import { useState } from "react";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { DialToggle } from "@/components/ui/dialkit/DialToggle";
import { DialSegment } from "@/components/ui/dialkit/DialSegment";
import { DialChips } from "@/components/ui/dialkit/DialChips";
import { Dial } from "@/components/ui/dialkit/Dial";
import {
  DemoSandbox,
  DemoTarget,
  Annotation,
  AnnotationGroup,
  StatusDot,
  MeasureLine,
  FormulaBar,
  type DemoColor,
} from "@/components/principles/demo-primitives";
import { AnimatedIconGrid } from "@/components/principles/AnimatedIcons";
import styles from "@/components/retro/retro.module.css";

type AtPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-center"
  | "right-center";

const POSITION_GRID: (AtPosition | null)[][] = [
  ["top-left", "top-center", "top-right"],
  ["left-center", null, "right-center"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const POSITION_LABEL: Record<AtPosition, string> = {
  "top-left": "TL",
  "top-center": "TC",
  "top-right": "TR",
  "left-center": "L",
  "right-center": "R",
  "bottom-left": "BL",
  "bottom-center": "BC",
  "bottom-right": "BR",
};

function PositionPicker({
  value,
  onChange,
}: {
  value: AtPosition;
  onChange: (v: AtPosition) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono text-xs shrink-0"
        style={{ color: "var(--color-muted)", minWidth: 52 }}
      >
        Position
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 28px)",
          gridTemplateRows: "repeat(3, 22px)",
          gap: 2,
        }}
        role="radiogroup"
        aria-label="Annotation position"
      >
        {POSITION_GRID.flat().map((pos, i) =>
          pos ? (
            <button
              key={pos}
              type="button"
              role="radio"
              aria-checked={pos === value}
              aria-label={pos}
              onClick={() => onChange(pos)}
              className="rounded font-mono transition-colors focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
              style={{
                fontSize: 8,
                fontWeight: 600,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${pos === value ? "var(--color-accent)" : "var(--color-border)"}`,
                background:
                  pos === value
                    ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
                    : "transparent",
                color:
                  pos === value ? "var(--color-accent)" : "var(--color-muted)",
              }}
            >
              {POSITION_LABEL[pos]}
            </button>
          ) : (
            <div key={`empty-${i}`} />
          )
        )}
      </div>
    </div>
  );
}

const CONNECTORS = ["none", "line", "corner"] as const;
type ConnectorType = (typeof CONNECTORS)[number];

const COLORS: readonly DemoColor[] = [
  "neutral",
  "success",
  "error",
  "accent",
] as const;

const COLOR_SWATCHES: Partial<Record<DemoColor, string>> = {
  neutral: "var(--color-muted)",
  success: "var(--color-success)",
  error: "var(--color-error)",
  accent: "var(--color-accent)",
};

function DemoBox({
  width = 200,
  height = 140,
  radius = 8,
}: {
  width?: number;
  height?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface-2)",
      }}
    />
  );
}

export default function DemoTestPage() {
  // ── Annotation playground state ──
  const [annPos, setAnnPos] = useState<AtPosition>("top-left");
  const [annConnector, setAnnConnector] = useState<ConnectorType>("corner");
  const [annColor, setAnnColor] = useState<DemoColor>("success");
  const [annBoxW, setAnnBoxW] = useState(200);
  const [annBoxH, setAnnBoxH] = useState(140);
  const [annLabel, setAnnLabel] = useState(true);
  const [annValue, setAnnValue] = useState("12px");

  // ── MeasureLine playground state ──
  const [mlDir, setMlDir] = useState<"horizontal" | "vertical">("horizontal");
  const [mlLength, setMlLength] = useState(180);
  const [mlColor, setMlColor] = useState<DemoColor>("accent");

  // ── Icon animation demo state ──
  const [iconTab, setIconTab] = useState<"motion" | "css" | "svg">("motion");

  // ── Composed demo state ──
  const [showLabels, setShowLabels] = useState(true);
  const [activeTab, setActiveTab] = useState<"formula" | "interactive">(
    "interactive"
  );
  const [outerR, setOuterR] = useState(20);
  const [padding, setPadding] = useState(8);
  const innerR = Math.max(outerR - padding, 0);

  return (
    <div className={styles.container}>
      <ScanlineOverlay />
      <BreadcrumbBar
        items={[
          { label: "principles", href: "/principles" },
          { label: "demo-test" },
        ]}
      />

      <main
        style={{
          padding: "var(--space-6) var(--space-4)",
          maxWidth: "820px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        <div>
          <h1
            className={styles.title}
            style={{ marginBottom: "var(--space-2)" }}
          >
            {"// Demo Primitives v2"}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--color-muted)",
              margin: 0,
            }}
          >
            Smart annotation system — declarative positioning, no manual CSS.
          </p>
        </div>

        {/* ── 1. StatusDot ───────────────────────────────── */}
        <section>
          <DemoSandbox title="StatusDot">
            <div
              style={{
                display: "flex",
                gap: "var(--space-6)",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <StatusDot status="success" label="Correct" />
              <StatusDot status="error" label="Mismatched radii" />
              <StatusDot status="success" />
              <StatusDot status="error" />
            </div>
          </DemoSandbox>
        </section>

        {/* ── 2. Annotation Playground ──────────────────── */}
        <section>
          <DemoSandbox title="Annotation playground">
            <AnnotationGroup visible={annLabel}>
              <DemoTarget>
                <DemoBox
                  width={annBoxW}
                  height={annBoxH}
                  radius={8}
                />
                <Annotation
                  at={annPos}
                  value={annValue}
                  color={annColor}
                  connector={annConnector}
                />
              </DemoTarget>
            </AnnotationGroup>

            <DemoSandbox.Controls>
              <DialToggle
                label="Labels"
                value={annLabel}
                onChange={setAnnLabel}
              />
              <PositionPicker value={annPos} onChange={setAnnPos} />
              <DialSegment
                label="Connector"
                options={CONNECTORS}
                value={annConnector}
                onChange={setAnnConnector}
              />
              <DialChips
                label="Color"
                options={COLORS}
                value={annColor}
                onChange={setAnnColor}
                colors={COLOR_SWATCHES}
              />
              <Dial
                label="Width"
                value={annBoxW}
                onChange={setAnnBoxW}
                min={80}
                max={400}
                step={10}
              />
              <Dial
                label="Height"
                value={annBoxH}
                onChange={setAnnBoxH}
                min={60}
                max={300}
                step={10}
              />
            </DemoSandbox.Controls>
            <DemoSandbox.Caption>
              Pick a position, connector, and color — the annotation handles
              the rest
            </DemoSandbox.Caption>
          </DemoSandbox>
        </section>

        {/* ── 3. MeasureLine Playground ─────────────────── */}
        <section>
          <DemoSandbox title="MeasureLine">
            <MeasureLine
              direction={mlDir}
              length={mlLength}
              label={`${mlLength}px`}
              color={mlColor}
            />

            <DemoSandbox.Controls>
              <DialSegment
                label="Direction"
                options={["horizontal", "vertical"] as const}
                value={mlDir}
                onChange={setMlDir}
                formatOption={(v) => v === "horizontal" ? "H" : "V"}
              />
              <Dial
                label="Length"
                value={mlLength}
                onChange={setMlLength}
                min={40}
                max={400}
                step={10}
              />
              <DialChips
                label="Color"
                options={COLORS}
                value={mlColor}
                onChange={setMlColor}
                colors={COLOR_SWATCHES}
              />
            </DemoSandbox.Controls>
          </DemoSandbox>
        </section>

        {/* ── 4. FormulaBar ──────────────────────────────── */}
        <section>
          <DemoSandbox title="FormulaBar">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <FormulaBar
                tokens={[
                  { label: "outer radius", color: "success" },
                  "=",
                  { label: "inner radius", color: "accent" },
                  "+",
                  { label: "padding", color: "neutral" },
                ]}
              />
              <FormulaBar
                tokens={[
                  { label: "gap", color: "accent" },
                  "=",
                  "8px",
                ]}
              />
            </div>
          </DemoSandbox>
        </section>

        {/* ── 5. DemoSandbox.Tabs — Icon Animation ────────── */}
        <section>
          <DemoSandbox title="Icon animation">
            <DemoSandbox.Tabs
              options={["motion", "css", "svg"] as const}
              value={iconTab}
              onChange={setIconTab}
            />
            <AnimatedIconGrid activeTab={iconTab} />
            <DemoSandbox.Caption>
              Tab: {iconTab} — switching tabs demonstrates DemoSandbox.Tabs
            </DemoSandbox.Caption>
          </DemoSandbox>
        </section>

        {/* ── 6. Composed: Concentric Border Radius ──────── */}
        <section>
          <DemoSandbox title="Concentric border radius">
            <DemoSandbox.Tabs
              options={["formula", "interactive"] as const}
              value={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "formula" ? (
              <FormulaBar
                tokens={[
                  { label: "outer radius", color: "success" },
                  "=",
                  { label: "inner radius", color: "accent" },
                  "+",
                  { label: "padding", color: "neutral" },
                ]}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-8)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <AnnotationGroup visible={showLabels}>
                  <div style={{ textAlign: "center" }}>
                    <DemoTarget>
                      <div
                        style={{
                          width: 160,
                          height: 120,
                          padding,
                          borderRadius: outerR,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-2)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: outerR,
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                          }}
                        />
                      </div>
                      <Annotation
                        at="top-left"
                        value={`outer: ${outerR}px`}
                        color="error"
                        connector="corner"
                      />
                      <Annotation
                        at="bottom-center"
                        value={`inner: ${outerR}px`}
                        color="error"
                      />
                    </DemoTarget>
                    <StatusDot status="error" label="Same radius" />
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <DemoTarget>
                      <div
                        style={{
                          width: 160,
                          height: 120,
                          padding,
                          borderRadius: outerR,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-2)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: innerR,
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                          }}
                        />
                      </div>
                      <Annotation
                        at="top-left"
                        value={`outer: ${outerR}px`}
                        color="success"
                        connector="corner"
                      />
                      <Annotation
                        at="bottom-center"
                        value={`inner: ${innerR}px`}
                        color="success"
                      />
                    </DemoTarget>
                    <StatusDot status="success" label="Concentric" />
                  </div>
                </AnnotationGroup>
              </div>
            )}

            <DemoSandbox.Controls>
              <DialToggle
                label="Labels"
                value={showLabels}
                onChange={setShowLabels}
              />
              <Dial
                label="Outer R"
                value={outerR}
                onChange={setOuterR}
                min={4}
                max={40}
                step={1}
              />
              <Dial
                label="Padding"
                value={padding}
                onChange={setPadding}
                min={0}
                max={24}
                step={1}
              />
            </DemoSandbox.Controls>
            <DemoSandbox.Caption>
              Adjust the sliders to see the concentric radius relationship
            </DemoSandbox.Caption>
          </DemoSandbox>
        </section>
      </main>

      <RetroFooter />
    </div>
  );
}

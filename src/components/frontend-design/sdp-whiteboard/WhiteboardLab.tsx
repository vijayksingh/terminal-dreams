"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  WhiteboardProvider,
  useWhiteboard,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  STEP_PREDICTIONS,
  type Shape,
  type DrawTool,
  type SyncStrategy,
  type TypeDef,
  type Point,
} from "./whiteboard-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { WHITEBOARD_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./WhiteboardLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function WhiteboardLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;

  return (
    <WhiteboardProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          {isPlanning ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`planning-${activeStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={TRANSITION.enterCard}
              >
                <PlanningView activeStep={activeStep} />
              </motion.div>
            </AnimatePresence>
          ) : (
            <WhiteboardEvolution />
          )}
        </div>
      </div>
    </WhiteboardProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "◻", "✎", "△", "⊡",
  "⬡", "▤", "⇌",
  "↺", "⚡", "👤",
  "🌳", "♿",
];

const STEP_TITLES = [
  "Requirements", "API Design", "Architecture",
  "Canvas Render", "Pointer Capture", "Shape Model", "Hit Testing",
  "Selection Handles", "Layer Separation", "Coalesced Events",
  "Undo/Redo", "CRDT Sync", "Cursor Presence",
  "Spatial Index", "Accessible Canvas",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <nav className={styles.stepBar} aria-label="Build steps">
      <ol className={styles.stepBar} role="list" style={{ display: "contents" }}>
        {STEP_LABELS.map((label, i) => (
          <li
            key={i}
            className={styles.stepDot}
            data-active={i + 1 <= activeStep ? "true" : undefined}
            data-current={i + 1 === activeStep ? "true" : undefined}
            aria-current={i + 1 === activeStep ? "step" : undefined}
            aria-label={`Step ${i + 1}: ${STEP_TITLES[i]}${i + 1 < activeStep ? " (complete)" : ""}`}
          >
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Planning views (steps 1-3)
// ═══════════════════════════════════════════════════════════════════

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <RequirementsView />;
  if (activeStep === 2) return <ApiDesignView />;
  return <ArchitectureView />;
}

const SCOPE_COMPLEXITY: Record<string, { canvasOps: number; syncFrames: number; loc: number }> = {
  freehand: { canvasOps: 4, syncFrames: 2, loc: 180 },
  shapes: { canvasOps: 6, syncFrames: 3, loc: 220 },
  multiUser: { canvasOps: 2, syncFrames: 8, loc: 350 },
  transforms: { canvasOps: 5, syncFrames: 3, loc: 160 },
  spatialIndex: { canvasOps: 1, syncFrames: 0, loc: 200 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useWhiteboard();
  const summary = useMemo(() => {
    const enabled = SCOPE_ITEMS.filter((s) => scopeEnabled[s.id]);
    if (enabled.length === 0) return "Toggle items to define scope";
    return enabled.map((s) => s.label).join(" + ");
  }, [scopeEnabled]);

  const complexity = useMemo(() => {
    const base = { canvasOps: 3, syncFrames: 2, loc: 200 };
    let canvasOps = base.canvasOps;
    let syncFrames = base.syncFrames;
    let loc = base.loc;
    for (const item of SCOPE_ITEMS) {
      if (scopeEnabled[item.id]) {
        const c = SCOPE_COMPLEXITY[item.id];
        if (c) { canvasOps += c.canvasOps; syncFrames += c.syncFrames; loc += c.loc; }
      }
    }
    const grade = loc < 600 ? "Low" : loc < 900 ? "Medium" : "High";
    return { canvasOps, syncFrames, loc, grade };
  }, [scopeEnabled]);

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Scope checklist</h3>
      <div className={styles.checklist}>
        {SCOPE_ITEMS.map((item) => (
          <button
            key={item.id}
            className={styles.checkItem}
            data-checked={scopeEnabled[item.id] ? "true" : undefined}
            onClick={() => toggleScope(item.id)}
            type="button"
            aria-pressed={scopeEnabled[item.id]}
          >
            <span className={styles.checkToggle}>
              {scopeEnabled[item.id] && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              <span className={styles.checkLabel}>{item.label}</span>
              <p className={styles.checkDesc}>{item.description}</p>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.scopeSummary}>
        <div className={styles.scopeLabel}>Scope</div>
        <div className={styles.scopeValue}>{summary}</div>
      </div>
      <div className={styles.complexityMeter} aria-live="polite">
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Canvas ops</span>
          <span className={styles.complexityValue}>{complexity.canvasOps}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>WS frames</span>
          <span className={styles.complexityValue}>{complexity.syncFrames}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Est. LOC</span>
          <span className={styles.complexityValue}>{complexity.loc}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Complexity</span>
          <span className={styles.complexityValue} data-grade={complexity.grade.toLowerCase()}>{complexity.grade}</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: API Design ─────────────────────────────────────────────

const API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = API_TABS[(idx + (e.key === "ArrowRight" ? 1 : API_TABS.length - 1)) % API_TABS.length]!;
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="wb-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="wb-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>
          Endpoints
        </button>
        <button type="button" role="tab" id="wb-tab-types" aria-selected={tab === "types"} aria-controls="wb-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>
          Types
        </button>
      </div>
      <div role="tabpanel" id={`wb-panel-${tab}`} aria-labelledby={`wb-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointCards /> : <TypeCards />}
      </div>
    </div>
  );
}

function EndpointCards() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={styles.endpointList}>
      {API_ENDPOINTS.map((ep) => {
        const key = `${ep.method}-${ep.path}`;
        const isOpen = expanded === key;
        return (
          <div key={key} className={styles.endpointCard}>
            <button
              type="button"
              className={styles.endpointHeader}
              onClick={() => setExpanded(isOpen ? null : key)}
              aria-expanded={isOpen}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className={styles.endpointDetail}>
                <div className={styles.endpointDesc}>{ep.description}</div>
                <div className={styles.endpointUsedBy}>Used by: {ep.usedBy}</div>
                {ep.params.length > 0 && (
                  <>
                    <div className={styles.endpointDetailLabel}>Parameters</div>
                    <div className={styles.paramGrid}>
                      {ep.params.map((p) => (
                        <div key={p.name} className={styles.paramRow}>
                          <span className={styles.paramName}>{p.name}</span>
                          <span className={styles.paramType}>{p.type}</span>
                          <span className={styles.paramNote}>{p.note}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className={styles.endpointDetailLabel}>Response</div>
                <div className={styles.responseType}>{ep.responseType}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TYPE_CATEGORY_COLORS: Record<string, string> = {
  api: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-4)",
};

function TypeCards() {
  return (
    <div className={styles.typeCardGrid}>
      {DATA_MODELS.map((t) => (
        <TypeCard key={t.name} typeDef={t} />
      ))}
    </div>
  );
}

function TypeCard({ typeDef }: { typeDef: TypeDef }) {
  const color = TYPE_CATEGORY_COLORS[typeDef.category] ?? "var(--color-accent)";
  return (
    <div className={styles.typeCard} style={{ borderTopColor: color }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} style={{ color }}>{typeDef.category}</span>
      </div>
      <div className={styles.typeCardFields}>
        {typeDef.fields.map((f) => (
          <div key={f.name} className={styles.typeFieldRow}>
            <span className={styles.typeFieldName}>{f.name}</span>
            <span className={styles.typeFieldType}>{f.type}</span>
            {f.note && <span className={styles.typeFieldNote}>{f.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Architecture ───────────────────────────────────────────

function ArchitectureView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={WHITEBOARD_ARCH_CONFIG} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Building views (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function WhiteboardEvolution() {
  const { activeStep, stateEntries } = useWhiteboard();

  return (
    <div className={styles.evolutionStack}>
      <StateInspector entries={stateEntries} title="Whiteboard State" />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={TRANSITION.enterCard}
        >
          <StepContent step={activeStep} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepContent({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <PredictionChallenge step={step} />
      <StepInteractive step={step} />
    </div>
  );
}

function StepInteractive({ step }: { step: number }) {
  switch (step) {
    case 4: return <CanvasRenderStep />;
    case 5: return <PointerCaptureStep />;
    case 6: return <ShapeModelStep />;
    case 7: return <HitTestingStep />;
    case 8: return <SelectionHandlesStep />;
    case 9: return <LayerSeparationStep />;
    case 10: return <CoalescedEventsStep />;
    case 11: return <UndoRedoStep />;
    case 12: return <CrdtSyncStep />;
    case 13: return <CursorPresenceStep />;
    case 14: return <SpatialIndexStep />;
    case 15: return <AccessibleCanvasStep />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Prediction challenge
// ═══════════════════════════════════════════════════════════════════

function PredictionChallenge({ step }: { step: number }) {
  const pred = STEP_PREDICTIONS[step];
  const [picked, setPicked] = useState<number | null>(null);

  if (!pred) return null;

  const isAnswered = picked !== null;
  const isCorrect = picked === pred.correctIndex;

  return (
    <div className={styles.prediction}>
      <div className={styles.predictionQ}>{pred.question}</div>
      <div className={styles.predictionOptions}>
        {pred.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.predictionOption}
            disabled={isAnswered}
            data-correct={isAnswered && i === pred.correctIndex ? "true" : undefined}
            data-wrong={isAnswered && i === picked && !isCorrect ? "true" : undefined}
            onClick={() => setPicked(i)}
          >
            {opt}
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className={styles.predictionResult} data-correct={isCorrect ? "true" : undefined}>
          {pred.explanation}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 4: Canvas Rendering
// ═══════════════════════════════════════════════════════════════════

function CanvasRenderStep() {
  const { shapes, setShapes } = useWhiteboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderMode, setRenderMode] = useState<"canvas" | "svg">("canvas");
  const [extraCount, setExtraCount] = useState(0);
  const [canvasMs, setCanvasMs] = useState<number | null>(null);

  const allShapes = useMemo(() => {
    const extras: Shape[] = [];
    for (let i = 0; i < extraCount; i++) {
      extras.push({
        id: `stress-${i}`,
        kind: i % 2 === 0 ? "rect" : "ellipse",
        points: [],
        x: 10 + (i % 20) * 20,
        y: 10 + Math.floor(i / 20) * 16,
        w: 16 + (i % 5) * 2,
        h: 12 + (i % 3) * 2,
        rotation: 0,
        fill: `var(--diagram-layer-${i % 5})`,
        stroke: `var(--diagram-layer-${i % 5})`,
        strokeWidth: 1,
        selected: false,
        locked: false,
        zIndex: shapes.length + i,
      });
    }
    return [...shapes, ...extras];
  }, [shapes, extraCount]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t0 = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const el = canvas.parentElement;
    const computedStyle = el ? getComputedStyle(el) : null;

    // Grid
    const gridColor = computedStyle?.getPropertyValue("--color-border").trim() || "#888";
    ctx.strokeStyle = gridColor;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const shape of allShapes) {
      ctx.save();
      const fillColor = resolveColor(shape.fill, computedStyle);
      const strokeColor = resolveColor(shape.stroke, computedStyle);

      if (shape.kind === "rect") {
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      } else if (shape.kind === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, shape.w / 2, shape.h / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.stroke();
      } else if (shape.kind === "freehand" && shape.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0]!.x, shape.points[0]!.y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i]!.x, shape.points[i]!.y);
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      } else if (shape.kind === "arrow" && shape.points.length >= 2) {
        const p0 = shape.points[0]!;
        const p1 = shape.points[shape.points.length - 1]!;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.stroke();
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x - headLen * Math.cos(angle - 0.4), p1.y - headLen * Math.sin(angle - 0.4));
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x - headLen * Math.cos(angle + 0.4), p1.y - headLen * Math.sin(angle + 0.4));
        ctx.stroke();
      }
      ctx.restore();
    }

    setCanvasMs(Number((performance.now() - t0).toFixed(2)));
  }, [allShapes]);

  useEffect(() => {
    if (renderMode === "canvas") draw();
  }, [draw, renderMode]);

  const svgDomNodes = allShapes.length * 2 + 1;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Canvas vs SVG Rendering</div>
        <div className={styles.widgetNote}>
          Canvas is a flat bitmap — one DOM node regardless of shape count. SVG retains a DOM tree per shape. Toggle between them and stress-test with hundreds of shapes to see the difference.
        </div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} data-active={renderMode === "canvas" ? "true" : undefined} onClick={() => setRenderMode("canvas")}>Canvas</button>
        <button type="button" className={styles.toolButton} data-active={renderMode === "svg" ? "true" : undefined} onClick={() => setRenderMode("svg")}>SVG</button>
        <button type="button" className={styles.toolButton} onClick={() => setExtraCount((c) => c + 50)}>+50 shapes</button>
        <button type="button" className={styles.toolButton} onClick={() => setExtraCount((c) => c + 200)}>+200</button>
        {extraCount > 0 && (
          <button type="button" className={styles.toolButton} onClick={() => setExtraCount(0)}>Reset</button>
        )}
      </div>
      <div className={styles.canvasWrapper}>
        {renderMode === "canvas" ? (
          <canvas
            ref={canvasRef}
            width={440}
            height={260}
            className={styles.canvas}
            role="img"
            aria-label={`Canvas rendering ${allShapes.length} shapes`}
          />
        ) : (
          <svg viewBox="0 0 440 260" style={{ display: "block", width: "100%", background: "var(--color-surface)" }}>
            {allShapes.map((shape) => {
              if (shape.kind === "rect") return (
                <rect key={shape.id} x={shape.x} y={shape.y} width={shape.w} height={shape.h} fill={shape.fill} fillOpacity={0.3} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
              );
              if (shape.kind === "ellipse") return (
                <ellipse key={shape.id} cx={shape.x + shape.w / 2} cy={shape.y + shape.h / 2} rx={shape.w / 2} ry={shape.h / 2} fill={shape.fill} fillOpacity={0.3} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
              );
              return null;
            })}
          </svg>
        )}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Shapes</div>
          <div className={styles.metricValue}>{allShapes.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>DOM nodes</div>
          <div className={styles.metricValue} data-status={renderMode === "svg" && allShapes.length > 200 ? "bad" : "good"}>
            {renderMode === "canvas" ? 1 : svgDomNodes}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Render time</div>
          <div className={styles.metricValue}>
            {renderMode === "canvas" && canvasMs !== null ? `${canvasMs}ms` : "—"}
          </div>
        </div>
      </div>
    </>
  );
}

function resolveColor(cssVar: string, style: CSSStyleDeclaration | null): string {
  if (!cssVar.startsWith("var(")) return cssVar;
  if (!style) return "#888";
  const prop = cssVar.replace(/^var\(--/, "--").replace(/\)$/, "");
  return style.getPropertyValue(prop).trim() || "#888";
}

// ═══════════════════════════════════════════════════════════════════
// Step 5: Pointer Capture
// ═══════════════════════════════════════════════════════════════════

function PointerCaptureStep() {
  const { shapes, setShapes, pushUndo } = useWhiteboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [captureEnabled, setCaptureEnabled] = useState(true);
  const [stats, setStats] = useState({ pointCount: 0, outsideCount: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "rgba(128,128,128,0.15)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // existing strokes
    const el = canvas.parentElement;
    const cs = el ? getComputedStyle(el) : null;
    for (const shape of shapes) {
      if (shape.kind === "freehand" && shape.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0]!.x, shape.points[0]!.y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i]!.x, shape.points[i]!.y);
        }
        ctx.strokeStyle = resolveColor(shape.stroke, cs);
        ctx.lineWidth = shape.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
    }

    // current stroke
    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0]!.x, currentPath[0]!.y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i]!.x, currentPath[i]!.y);
      }
      ctx.strokeStyle = resolveColor("var(--color-accent)", cs);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }, [shapes, currentPath]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scale = canvasRef.current!.width / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drawing.current = true;
    if (captureEnabled) canvasRef.current?.setPointerCapture(e.pointerId);
    setCurrentPath([getPos(e)]);
    setStats({ pointCount: 1, outsideCount: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const pos = getPos(e);
    const canvas = canvasRef.current!;
    const isOutside = pos.x < 0 || pos.y < 0 || pos.x > canvas.width || pos.y > canvas.height;
    setCurrentPath((prev) => [...prev, pos]);
    setStats((prev) => ({
      pointCount: prev.pointCount + 1,
      outsideCount: prev.outsideCount + (isOutside ? 1 : 0),
    }));
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentPath.length > 1) {
      const newShape: Shape = {
        id: `stroke-${Date.now()}`,
        kind: "freehand",
        points: currentPath,
        x: Math.min(...currentPath.map((p) => p.x)),
        y: Math.min(...currentPath.map((p) => p.y)),
        w: Math.max(...currentPath.map((p) => p.x)) - Math.min(...currentPath.map((p) => p.x)),
        h: Math.max(...currentPath.map((p) => p.y)) - Math.min(...currentPath.map((p) => p.y)),
        rotation: 0,
        fill: "transparent",
        stroke: "var(--color-accent)",
        strokeWidth: 3,
        selected: false,
        locked: false,
        zIndex: shapes.length + 1,
      };
      setShapes((prev) => [...prev, newShape]);
      pushUndo({ type: "add", shapeId: newShape.id, after: newShape });
    }
    setCurrentPath([]);
  };

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Pointer Capture</div>
        <div className={styles.widgetNote}>
          setPointerCapture() routes all pointer events to the canvas even when the pointer leaves its bounds. Toggle it off and try drawing outside the canvas to see the difference.
        </div>
      </div>
      <div className={styles.toggleStrip}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>setPointerCapture</span>
          <button
            type="button"
            className={styles.toggleButton}
            data-on={captureEnabled ? "true" : undefined}
            onClick={() => setCaptureEnabled((v) => !v)}
            aria-pressed={captureEnabled}
            aria-label="Toggle pointer capture"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={440}
          height={260}
          className={styles.canvas}
          role="application"
          aria-label="Drawing canvas — draw freehand strokes"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Points</div>
          <div className={styles.metricValue}>{stats.pointCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Outside bounds</div>
          <div className={styles.metricValue} data-status={stats.outsideCount > 0 && !captureEnabled ? "bad" : "good"}>
            {stats.outsideCount}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Capture</div>
          <div className={styles.metricValue} data-status={captureEnabled ? "good" : "bad"}>
            {captureEnabled ? "ON" : "OFF"}
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 6: Shape Model
// ═══════════════════════════════════════════════════════════════════

function ShapeModelStep() {
  const { shapes, setShapes, pushUndo } = useWhiteboard();
  const [addKind, setAddKind] = useState<"rect" | "ellipse">("rect");

  const addShape = () => {
    const x = 40 + Math.random() * 280;
    const y = 30 + Math.random() * 160;
    const colors = ["var(--diagram-layer-1)", "var(--diagram-layer-2)", "var(--diagram-layer-4)", "var(--diagram-layer-6)"];
    const color = colors[Math.floor(Math.random() * colors.length)]!;
    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      kind: addKind,
      points: [],
      x, y,
      w: addKind === "rect" ? 100 + Math.random() * 60 : 80 + Math.random() * 40,
      h: addKind === "rect" ? 60 + Math.random() * 40 : 80 + Math.random() * 40,
      rotation: 0,
      fill: color,
      stroke: color,
      strokeWidth: 2,
      selected: false,
      locked: false,
      zIndex: shapes.length + 1,
    };
    setShapes((prev) => [...prev, newShape]);
    pushUndo({ type: "add", shapeId: newShape.id, after: newShape });
  };

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Shape Object Model</div>
        <div className={styles.widgetNote}>
          Each shape is a data object: id, kind, bounding box (x, y, w, h), rotation, fill, stroke, z-index. This is what makes selection, transforms, undo, and serialization possible — pixels alone cannot be selected or moved.
        </div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} data-active={addKind === "rect" ? "true" : undefined} onClick={() => setAddKind("rect")}>
          ◻ Rect
        </button>
        <button type="button" className={styles.toolButton} data-active={addKind === "ellipse" ? "true" : undefined} onClick={() => setAddKind("ellipse")}>
          ○ Ellipse
        </button>
        <button type="button" className={styles.toolButton} onClick={addShape}>
          + Add Shape
        </button>
      </div>
      <ShapeListWidget />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 7: Hit Testing
// ═══════════════════════════════════════════════════════════════════

function HitTestingStep() {
  const { shapes, selectedShapeId, setSelectedShapeId } = useWhiteboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hitResult, setHitResult] = useState<string>("none");
  const [queryPoint, setQueryPoint] = useState<Point | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "rgba(128,128,128,0.15)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    const el = canvas.parentElement;
    const cs = el ? getComputedStyle(el) : null;

    // shapes with bounding boxes
    for (const shape of shapes) {
      ctx.save();
      const isSelected = shape.id === selectedShapeId;
      const fillColor = resolveColor(shape.fill, cs);
      const strokeColor = resolveColor(shape.stroke, cs);

      if (shape.kind === "rect") {
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isSelected ? resolveColor("var(--color-accent)", cs) : strokeColor;
        ctx.lineWidth = isSelected ? 3 : shape.strokeWidth;
        ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      } else if (shape.kind === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, shape.w / 2, shape.h / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isSelected ? resolveColor("var(--color-accent)", cs) : strokeColor;
        ctx.lineWidth = isSelected ? 3 : shape.strokeWidth;
        ctx.stroke();
      } else if (shape.kind === "freehand" && shape.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0]!.x, shape.points[0]!.y);
        for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i]!.x, shape.points[i]!.y);
        ctx.strokeStyle = isSelected ? resolveColor("var(--color-accent)", cs) : strokeColor;
        ctx.lineWidth = isSelected ? 4 : shape.strokeWidth;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (shape.kind === "arrow" && shape.points.length >= 2) {
        const p0 = shape.points[0]!;
        const p1 = shape.points[shape.points.length - 1]!;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = isSelected ? resolveColor("var(--color-accent)", cs) : strokeColor;
        ctx.lineWidth = isSelected ? 3 : shape.strokeWidth;
        ctx.stroke();
      }

      // bounding box for hit-test visualization
      if (shape.kind !== "freehand") {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(128,128,128,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(shape.x - 2, shape.y - 2, shape.w + 4, shape.h + 4);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    // query crosshair
    if (queryPoint) {
      ctx.strokeStyle = resolveColor("var(--color-error)", cs);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(queryPoint.x, 0); ctx.lineTo(queryPoint.x, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, queryPoint.y); ctx.lineTo(canvas.width, queryPoint.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [shapes, selectedShapeId, queryPoint]);

  useEffect(() => { draw(); }, [draw]);

  const hitTest = (pt: Point): string | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i]!;
      if (pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) {
        return s.id;
      }
    }
    return null;
  };

  const onClick = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scale = canvasRef.current!.width / rect.width;
    const pt = { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
    setQueryPoint(pt);
    const hit = hitTest(pt);
    setHitResult(hit ?? "empty");
    setSelectedShapeId(hit);
  };

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Bounding Box Hit Testing</div>
        <div className={styles.widgetNote}>
          Click anywhere on the canvas. The hit test iterates shapes in reverse z-order and checks if the click point falls within each bounding box. Dashed outlines show the bounding boxes.
        </div>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={440}
          height={260}
          className={styles.canvas}
          data-tool="select"
          role="application"
          aria-label="Hit testing canvas — click to select shapes"
          onPointerDown={onClick}
        />
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Hit result</div>
          <div className={styles.metricValue} data-status={hitResult === "empty" ? "bad" : "good"}>
            {hitResult === "none" ? "—" : hitResult === "empty" ? "∅ empty" : hitResult}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Checks</div>
          <div className={styles.metricValue}>{shapes.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Complexity</div>
          <div className={styles.metricValue}>O(n)</div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 8: Selection Handles
// ═══════════════════════════════════════════════════════════════════

function SelectionHandlesStep() {
  const { shapes, selectedShapeId, setSelectedShapeId, setShapes, pushUndo } = useWhiteboard();
  const selected = shapes.find((s) => s.id === selectedShapeId);

  const handlePositions = useMemo(() => {
    if (!selected) return [];
    const { x, y, w, h } = selected;
    return [
      { cx: x, cy: y, cursor: "nw-resize", label: "top-left" },
      { cx: x + w / 2, cy: y, cursor: "n-resize", label: "top" },
      { cx: x + w, cy: y, cursor: "ne-resize", label: "top-right" },
      { cx: x + w, cy: y + h / 2, cursor: "e-resize", label: "right" },
      { cx: x + w, cy: y + h, cursor: "se-resize", label: "bottom-right" },
      { cx: x + w / 2, cy: y + h, cursor: "s-resize", label: "bottom" },
      { cx: x, cy: y + h, cursor: "sw-resize", label: "bottom-left" },
      { cx: x, cy: y + h / 2, cursor: "w-resize", label: "left" },
    ];
  }, [selected]);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Selection Handles</div>
        <div className={styles.widgetNote}>
          8 resize handles (4 corners + 4 edge midpoints) plus a rotation handle above top center. Each constrains different axes — corner handles resize both dimensions, edge handles resize only one.
        </div>
      </div>
      <ShapeListWidget selectable />
      {selected && (
        <div className={styles.widgetPanel} style={{ borderLeftColor: "var(--diagram-layer-2)" }}>
          <div className={styles.widgetTitle} style={{ color: "var(--diagram-layer-2)" }}>Handle Map</div>
          <svg viewBox="0 0 200 140" style={{ width: "100%", maxWidth: 300 }} role="img" aria-label="Diagram showing 8 resize handles around a selected shape">
            <rect x="40" y="30" width="120" height="80" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 4" />
            {handlePositions.map((h, i) => {
              const sx = 40 + ((h.cx - selected.x) / selected.w) * 120;
              const sy = 30 + ((h.cy - selected.y) / selected.h) * 80;
              return (
                <g key={i}>
                  <circle cx={sx} cy={sy} r="5" fill="var(--color-accent)" stroke="var(--color-bg)" strokeWidth="2" />
                  <text x={sx} y={sy + 16} textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill="var(--color-muted)">{h.label}</text>
                </g>
              );
            })}
            {/* rotation handle */}
            <line x1="100" y1="30" x2="100" y2="12" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="10" r="4" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
            <text x="100" y="4" textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill="var(--color-muted)">rotate</text>
          </svg>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 9: Layer Separation
// ═══════════════════════════════════════════════════════════════════

const CANVAS_LAYERS = [
  { id: "grid", label: "Grid Layer", color: "var(--color-border)", fps: "0 (static)", desc: "Background grid — rendered once and cached" },
  { id: "shapes", label: "Shape Layer", color: "var(--diagram-layer-1)", fps: "on change", desc: "All vector shapes — only redraws when shapes mutate" },
  { id: "selection", label: "Selection Layer", color: "var(--color-accent)", fps: "on drag", desc: "Handles and selection outlines — redraws during transforms" },
  { id: "cursors", label: "Cursor Layer", color: "var(--diagram-layer-4)", fps: "60fps", desc: "Remote user cursors — redraws every pointermove" },
];

type LayerRedrawState = Record<string, number>;

function LayerSeparationStep() {
  const [redraws, setRedraws] = useState<LayerRedrawState>({ grid: 1, shapes: 0, selection: 0, cursors: 0 });
  const [flashLayer, setFlashLayer] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const triggerAction = useCallback((action: "moveCursor" | "moveShape" | "addShape") => {
    const affected: string[] =
      action === "moveCursor" ? ["cursors"] :
      action === "moveShape" ? ["shapes", "selection"] :
      ["shapes"];

    setRedraws((prev) => {
      const next = { ...prev };
      for (const l of affected) next[l] = (next[l] ?? 0) + 1;
      return next;
    });

    if (!reducedMotion) {
      for (let i = 0; i < affected.length; i++) {
        setTimeout(() => setFlashLayer(affected[i]!), i * 120);
      }
      setTimeout(() => setFlashLayer(null), affected.length * 120 + 400);
    }
  }, [reducedMotion]);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Dual-Canvas Architecture</div>
        <div className={styles.widgetNote}>
          Each layer is a separate &lt;canvas&gt; stacked via absolute positioning. Trigger actions below to see which layers redraw — cursor movement should never touch the shape layer.
        </div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={() => triggerAction("moveCursor")}>Move Cursor</button>
        <button type="button" className={styles.toolButton} onClick={() => triggerAction("moveShape")}>Drag Shape</button>
        <button type="button" className={styles.toolButton} onClick={() => triggerAction("addShape")}>Add Shape</button>
        <button type="button" className={styles.toolButton} onClick={() => setRedraws({ grid: 1, shapes: 0, selection: 0, cursors: 0 })}>Reset</button>
      </div>
      <div className={styles.layerDiagram}>
        {CANVAS_LAYERS.map((layer, i) => (
          <div
            key={layer.id}
            className={styles.layerRow}
            data-active={flashLayer === layer.id ? "true" : undefined}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <div className={styles.layerColor} style={{ background: layer.color }} />
            <span className={styles.layerName}>{layer.label}</span>
            <span className={styles.layerFps}>{layer.fps}</span>
            <span style={{ fontSize: "0.6rem", fontWeight: 800, color: redraws[layer.id]! > 0 ? "var(--color-accent)" : "var(--color-muted)", minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {redraws[layer.id] ?? 0}×
            </span>
          </div>
        ))}
      </div>
      <div className={styles.stepMessage}>
        Moving the cursor triggers {redraws.cursors} cursor redraws but 0 shape redraws. Without layer separation, every cursor move at 60fps would redraw all shapes.
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 10: Coalesced Events
// ═══════════════════════════════════════════════════════════════════

function CoalescedEventsStep() {
  const [regular, setRegular] = useState(0);
  const [coalesced, setCoalesced] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingRef = useRef(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drawingRef.current = true;
    setIsDrawing(true);
    setRegular(0);
    setCoalesced(0);
    areaRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const extra = e.nativeEvent.getCoalescedEvents?.()?.length ?? 1;
    setRegular((r) => r + 1);
    setCoalesced((c) => c + extra);
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    setIsDrawing(false);
  };

  const ratio = regular > 0 ? (coalesced / regular).toFixed(1) : "—";

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>getCoalescedEvents()</div>
        <div className={styles.widgetNote}>
          Browsers batch hardware pointer samples into single events. getCoalescedEvents() recovers the in-between points — typically 2-6x more samples, giving smoother freehand paths.
        </div>
      </div>
      <div
        ref={areaRef}
        style={{
          height: 120,
          borderRadius: "var(--radius-2)",
          background: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "crosshair",
          touchAction: "none",
          fontSize: "0.7rem",
          color: "var(--color-muted)",
          fontFamily: "var(--font-mono)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Draw area — drag to measure coalesced events"
      >
        {isDrawing ? "Drawing..." : "Press and drag to measure"}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>pointermove events</div>
          <div className={styles.metricValue}>{regular}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Coalesced points</div>
          <div className={styles.metricValue} data-status={coalesced > regular ? "good" : undefined}>
            {coalesced}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Ratio</div>
          <div className={styles.metricValue}>{ratio}x</div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 11: Undo/Redo
// ═══════════════════════════════════════════════════════════════════

function UndoRedoStep() {
  const { shapes, setShapes, undoStack, redoStack, undo, redo, pushUndo } = useWhiteboard();

  const addRandomShape = () => {
    const kinds: Shape["kind"][] = ["rect", "ellipse"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    const colors = ["var(--diagram-layer-1)", "var(--diagram-layer-2)", "var(--diagram-layer-4)"];
    const color = colors[Math.floor(Math.random() * colors.length)]!;
    const newShape: Shape = {
      id: `undo-${Date.now()}`,
      kind,
      points: [],
      x: 40 + Math.random() * 200,
      y: 30 + Math.random() * 120,
      w: 60 + Math.random() * 80,
      h: 50 + Math.random() * 60,
      rotation: 0,
      fill: color,
      stroke: color,
      strokeWidth: 2,
      selected: false,
      locked: false,
      zIndex: shapes.length + 1,
    };
    setShapes((prev) => [...prev, newShape]);
    pushUndo({ type: "add", shapeId: newShape.id, after: newShape });
  };

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Command Pattern Undo</div>
        <div className={styles.widgetNote}>
          Each mutation produces an inverse command. Undo reverses YOUR last action (local undo), not the global last action — critical for multi-user contexts. The stack stores operation type, shape ID, and before/after state.
        </div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={addRandomShape}>+ Add Shape</button>
        <button type="button" className={styles.undoButton} onClick={undo} disabled={undoStack.length === 0}>↶ Undo</button>
        <button type="button" className={styles.undoButton} onClick={redo} disabled={redoStack.length === 0}>↷ Redo</button>
      </div>
      <div className={styles.undoStack}>
        {undoStack.length === 0 && redoStack.length === 0 ? (
          <div className={styles.undoEmpty}>No operations yet — add shapes to build the stack</div>
        ) : (
          <>
            {undoStack.map((op, i) => (
              <div key={i} className={styles.undoEntry}>
                <span className={styles.undoIndex}>{i + 1}</span>
                <span className={styles.undoOp}>{op.type}({op.shapeId.slice(0, 12)})</span>
              </div>
            ))}
            {redoStack.length > 0 && (
              <div style={{ fontSize: "0.6rem", color: "var(--color-muted)", padding: "var(--space-1) 0" }}>
                — redo available: {redoStack.length} op{redoStack.length > 1 ? "s" : ""} —
              </div>
            )}
          </>
        )}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Shapes</div>
          <div className={styles.metricValue}>{shapes.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Undo depth</div>
          <div className={styles.metricValue}>{undoStack.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Redo depth</div>
          <div className={styles.metricValue}>{redoStack.length}</div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 12: CRDT Sync
// ═══════════════════════════════════════════════════════════════════

const SYNC_STRATEGIES: { id: SyncStrategy; name: string; desc: string }[] = [
  { id: "lww", name: "LWW", desc: "Last-Writer-Wins per property — simple, lossy on true conflicts" },
  { id: "ot", name: "OT", desc: "Operational Transform — server-ordered, correct, complex" },
  { id: "crdt", name: "CRDT", desc: "Conflict-free — converges without server, peer-to-peer ready" },
];

type ConflictStep = { alice: string; bob: string; server: string; result: string; note: string };

const CONFLICT_SCENARIOS: Record<SyncStrategy, ConflictStep[]> = {
  lww: [
    { alice: "fill: blue", bob: "fill: blue", server: "—", result: "fill: blue", note: "Both see blue rectangle" },
    { alice: "fill → red (t=1)", bob: "fill → green (t=2)", server: "—", result: "fill: blue", note: "Both edit fill concurrently" },
    { alice: "sends red (t=1)", bob: "sends green (t=2)", server: "compares timestamps", result: "pending...", note: "Server receives both ops" },
    { alice: "fill: green ✓", bob: "fill: green ✓", server: "t=2 wins", result: "fill: green", note: "Alice's red LOST — t=2 > t=1" },
  ],
  ot: [
    { alice: "fill: blue", bob: "fill: blue", server: "canonical state", result: "fill: blue", note: "Server is source of truth" },
    { alice: "fill → red", bob: "fill → green", server: "queues ops", result: "fill: blue", note: "Concurrent edits queued" },
    { alice: "transform(red, green)", bob: "transform(green, red)", server: "orders: red first", result: "pending...", note: "Server picks canonical order" },
    { alice: "fill: green ✓", bob: "fill: green ✓", server: "green wins (last)", result: "fill: green", note: "Both converge — server-ordered" },
  ],
  crdt: [
    { alice: "fill: blue {v:1}", bob: "fill: blue {v:1}", server: "—", result: "fill: blue", note: "Both replicas start at v1" },
    { alice: "fill: red {v:2a}", bob: "fill: green {v:2b}", server: "—", result: "fill: blue", note: "Concurrent versions diverge" },
    { alice: "merge(2a, 2b)", bob: "merge(2b, 2a)", server: "no server needed", result: "pending...", note: "Replicas exchange + merge" },
    { alice: "fill: green {v:3}", bob: "fill: green {v:3}", server: "—", result: "fill: green", note: "Deterministic tie-break converges" },
  ],
};

function CrdtSyncStep() {
  const { syncStrategy, setSyncStrategy } = useWhiteboard();
  const [conflictStep, setConflictStep] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const scenario = CONFLICT_SCENARIOS[syncStrategy];

  const runConflict = useCallback(() => {
    setConflictStep(0);
    if (reducedMotion) { setConflictStep(scenario.length - 1); return; }
    for (let i = 1; i < scenario.length; i++) {
      setTimeout(() => setConflictStep(i), i * 800);
    }
  }, [scenario, reducedMotion]);

  useEffect(() => { setConflictStep(0); }, [syncStrategy]);

  const current = scenario[conflictStep]!;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Sync Strategy Comparison</div>
        <div className={styles.widgetNote}>
          Alice and Bob both change a rectangle&apos;s fill color at the same time. Pick a strategy, then run the conflict to see how each resolves it.
        </div>
      </div>
      <div className={styles.strategyGroup}>
        {SYNC_STRATEGIES.map((s) => (
          <button key={s.id} type="button" className={styles.strategyOption} data-active={syncStrategy === s.id ? "true" : undefined} onClick={() => setSyncStrategy(s.id)}>
            <span className={styles.strategyName}>{s.name}</span>
            <span className={styles.strategyDesc}>{s.desc}</span>
          </button>
        ))}
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={runConflict}>
          ▶ Simulate Conflict
        </button>
      </div>
      <div className={styles.crdtComparison}>
        {(["alice", "bob", "server", "result"] as const).map((role) => (
          <div key={role} className={styles.crdtCard}>
            <div className={styles.crdtCardTitle} style={{ color: role === "alice" ? "var(--diagram-layer-2)" : role === "bob" ? "var(--diagram-layer-4)" : role === "server" ? "var(--color-muted)" : "var(--color-accent)" }}>
              {role === "alice" ? "Alice" : role === "bob" ? "Bob" : role === "server" ? "Server" : "Result"}
            </div>
            <div className={styles.crdtRow}>
              <span className={styles.crdtValue} style={{ fontSize: "0.7rem" }}>{current[role]}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Step</div>
          <div className={styles.metricValue}>{conflictStep + 1}/{scenario.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Strategy</div>
          <div className={styles.metricValue}>{syncStrategy.toUpperCase()}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Data loss?</div>
          <div className={styles.metricValue} data-status={syncStrategy === "lww" && conflictStep === 3 ? "bad" : "good"}>
            {syncStrategy === "lww" && conflictStep === 3 ? "Yes" : "No"}
          </div>
        </div>
      </div>
      {conflictStep > 0 && (
        <div className={styles.stepMessage} data-severity={syncStrategy === "lww" && conflictStep === 3 ? "warning" : undefined}>
          {current.note}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 13: Cursor Presence
// ═══════════════════════════════════════════════════════════════════

const SIM_USERS = [
  { id: "alice", name: "Alice", color: "var(--diagram-layer-2)" },
  { id: "bob", name: "Bob", color: "var(--diagram-layer-4)" },
  { id: "carol", name: "Carol", color: "var(--diagram-layer-5)" },
  { id: "dan", name: "Dan", color: "var(--diagram-layer-1)" },
  { id: "eve", name: "Eve", color: "var(--color-warning)" },
];

function CursorPresenceStep() {
  const [throttleMs, setThrottleMs] = useState(33);
  const [userCount, setUserCount] = useState(3);
  const [running, setRunning] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  const reducedMotion = usePrefersReducedMotion();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const msgsPerSec = Math.round((1000 / throttleMs) * userCount);

  const startSim = useCallback(() => {
    setRunning(true);
    setMsgCount(0);
    const angles: Record<string, number> = {};
    SIM_USERS.slice(0, userCount).forEach((u, i) => { angles[u.id] = (i * Math.PI * 2) / userCount; });

    timerRef.current = setInterval(() => {
      const nextCursors: Record<string, { x: number; y: number }> = {};
      SIM_USERS.slice(0, userCount).forEach((u) => {
        angles[u.id] = (angles[u.id] ?? 0) + 0.04 + Math.random() * 0.02;
        const a = angles[u.id]!;
        nextCursors[u.id] = {
          x: 200 + Math.cos(a) * (60 + Math.sin(a * 0.7) * 40),
          y: 60 + Math.sin(a) * (30 + Math.cos(a * 1.3) * 20),
        };
      });
      setCursors(nextCursors);
      setMsgCount((c) => c + userCount);
    }, reducedMotion ? 200 : throttleMs);
  }, [throttleMs, userCount, reducedMotion]);

  const stopSim = useCallback(() => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Cursor Presence</div>
        <div className={styles.widgetNote}>
          Each user broadcasts cursor position. Watch the bandwidth spike as you increase users or reduce throttle interval. Colored dots animate at the selected rate.
        </div>
      </div>
      <div className={styles.toolbar}>
        {!running ? (
          <button type="button" className={styles.toolButton} onClick={startSim}>▶ Start Cursors</button>
        ) : (
          <button type="button" className={styles.toolButton} onClick={stopSim}>■ Stop</button>
        )}
        {[2, 3, 5].map((n) => (
          <button key={n} type="button" className={styles.toolButton} data-active={userCount === n ? "true" : undefined} onClick={() => { setUserCount(n); if (running) { stopSim(); } }}>
            {n} users
          </button>
        ))}
        {[16, 33, 100].map((ms) => (
          <button key={ms} type="button" className={styles.toolButton} data-active={throttleMs === ms ? "true" : undefined} onClick={() => { setThrottleMs(ms); if (running) { stopSim(); } }}>
            {ms}ms
          </button>
        ))}
      </div>
      <div
        ref={areaRef}
        className={styles.canvasWrapper}
        style={{ height: 140, position: "relative" }}
      >
        {SIM_USERS.slice(0, userCount).map((u) => {
          const pos = cursors[u.id];
          if (!pos) return null;
          return (
            <React.Fragment key={u.id}>
              <div className={styles.cursorDot} style={{ left: pos.x, top: pos.y, background: u.color, transition: reducedMotion ? "none" : `left ${throttleMs}ms linear, top ${throttleMs}ms linear` }} />
              <div className={styles.cursorLabel} style={{ left: pos.x, top: pos.y, color: u.color, transition: reducedMotion ? "none" : `left ${throttleMs}ms linear, top ${throttleMs}ms linear` }}>
                {u.name}
              </div>
            </React.Fragment>
          );
        })}
        {!running && Object.keys(cursors).length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "0.7rem", color: "var(--color-muted)" }}>
            Press ▶ to simulate cursor broadcasts
          </div>
        )}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Msgs/sec</div>
          <div className={styles.metricValue} data-status={msgsPerSec > 300 ? "bad" : "good"}>
            {msgsPerSec}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Bandwidth</div>
          <div className={styles.metricValue} data-status={msgsPerSec > 300 ? "bad" : "good"}>
            ~{((msgsPerSec * 40) / 1024).toFixed(1)} KB/s
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total sent</div>
          <div className={styles.metricValue}>{msgCount}</div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 14: Spatial Index (R-tree)
// ═══════════════════════════════════════════════════════════════════

function SpatialIndexStep() {
  const { shapes } = useWhiteboard();
  const [shapeCount, setShapeCount] = useState(500);

  const linearMs = (shapeCount * 60 * 0.005).toFixed(1);
  const rtreeMs = (Math.log2(shapeCount) * 60 * 0.002).toFixed(2);
  const rtreeNodes = Math.ceil(shapeCount / 9);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>R-tree Spatial Index</div>
        <div className={styles.widgetNote}>
          An R-tree partitions shapes by bounding rectangles into a balanced tree. Hit-test queries traverse O(log n) nodes instead of scanning all shapes. The crossover vs linear scan is ~1,000 shapes at 60fps pointermove.
        </div>
      </div>
      <div className={styles.toggleStrip}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Shape count</span>
          <input
            type="range"
            min={10}
            max={10000}
            step={10}
            value={shapeCount}
            onChange={(e) => setShapeCount(Number(e.target.value))}
            style={{ flex: 1, minHeight: 36, accentColor: "var(--color-accent)" }}
            aria-label="Number of shapes"
          />
          <span style={{ fontSize: "0.75rem", fontWeight: 800, minWidth: 48, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {shapeCount.toLocaleString()}
          </span>
        </div>
      </div>
      <div className={styles.rtreeStats}>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>Linear scan/sec</span>
          <span className={styles.rtreeStatValue} data-status={Number(linearMs) > 10 ? "warning" : "good"}>
            {linearMs}ms
          </span>
        </div>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>R-tree/sec</span>
          <span className={styles.rtreeStatValue} data-status="good">{rtreeMs}ms</span>
        </div>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>R-tree nodes</span>
          <span className={styles.rtreeStatValue}>{rtreeNodes}</span>
        </div>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>Speedup</span>
          <span className={styles.rtreeStatValue} data-status="good">
            {(Number(linearMs) / Number(rtreeMs)).toFixed(0)}x
          </span>
        </div>
      </div>
      <RtreeVisualization shapeCount={shapeCount} />
    </>
  );
}

function RtreeVisualization({ shapeCount }: { shapeCount: number }) {
  const depth = Math.max(1, Math.ceil(Math.log(shapeCount) / Math.log(9)));
  const colors = ["var(--diagram-layer-1)", "var(--diagram-layer-2)", "var(--diagram-layer-4)", "var(--color-accent)"];

  return (
    <div className={styles.rtreeVisualizer}>
      <svg viewBox="0 0 400 120" className={styles.rtreeSvg} role="img" aria-label={`R-tree with ${depth} levels for ${shapeCount} shapes`}>
        {/* Root */}
        <rect x="170" y="5" width="60" height="20" rx="3" fill={colors[0]} fillOpacity="0.3" stroke={colors[0]} strokeWidth="1.5" />
        <text x="200" y="18" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-text)">root</text>

        {/* Level 1 */}
        {[0, 1, 2].map((i) => {
          const x = 60 + i * 130;
          return (
            <g key={i}>
              <line x1="200" y1="25" x2={x + 30} y2="40" stroke={colors[1]} strokeWidth="1" strokeOpacity="0.5" />
              <rect x={x} y="40" width="60" height="18" rx="3" fill={colors[1]} fillOpacity="0.2" stroke={colors[1]} strokeWidth="1" />
              <text x={x + 30} y="52" textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill="var(--color-muted)">node</text>
            </g>
          );
        })}

        {/* Level 2 (leaves) */}
        {depth >= 2 && [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const parentIdx = Math.floor(i / 3);
          const parentX = 60 + parentIdx * 130 + 30;
          const x = 10 + i * 42;
          return (
            <g key={`l2-${i}`}>
              <line x1={parentX} y1="58" x2={x + 16} y2="74" stroke={colors[2]} strokeWidth="0.8" strokeOpacity="0.4" />
              <rect x={x} y="74" width="32" height="14" rx="2" fill={colors[2]} fillOpacity="0.15" stroke={colors[2]} strokeWidth="0.8" />
              <text x={x + 16} y="84" textAnchor="middle" fontSize="6" fontFamily="var(--font-mono)" fill="var(--color-muted)">
                {Math.ceil(shapeCount / 9)}
              </text>
            </g>
          );
        })}

        {/* Leaf shapes indicator */}
        <text x="200" y="110" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-muted)">
          {shapeCount.toLocaleString()} shapes across {depth} levels
        </text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 15: Accessible Canvas
// ═══════════════════════════════════════════════════════════════════

function AccessibleCanvasStep() {
  const { shapes, setShapes } = useWhiteboard();
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((msg: string) => {
    setAnnouncements((prev) => [...prev.slice(-4), msg]);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (shapes.length === 0) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const next = e.shiftKey
        ? (focusedIdx === null || focusedIdx === 0 ? shapes.length - 1 : focusedIdx - 1)
        : (focusedIdx === null ? 0 : (focusedIdx + 1) % shapes.length);
      setFocusedIdx(next);
      const s = shapes[next]!;
      announce(`${s.kind} at ${Math.round(s.x)}, ${Math.round(s.y)}, ${s.w} by ${s.h}`);
      return;
    }

    if (focusedIdx === null) return;

    const GRID = 10;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const dx = e.key === "ArrowRight" ? GRID : e.key === "ArrowLeft" ? -GRID : 0;
      const dy = e.key === "ArrowDown" ? GRID : e.key === "ArrowUp" ? -GRID : 0;
      setShapes((prev) => prev.map((s, i) => i === focusedIdx ? { ...s, x: s.x + dx, y: s.y + dy } : s));
      const s = shapes[focusedIdx]!;
      announce(`Moved ${s.kind} to ${Math.round(s.x + dx)}, ${Math.round(s.y + dy)}`);
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const removed = shapes[focusedIdx]!;
      setShapes((prev) => prev.filter((_, i) => i !== focusedIdx));
      setFocusedIdx(null);
      announce(`Removed ${removed.kind}`);
    }

    if (e.key === "Escape") {
      setFocusedIdx(null);
      announce("Deselected");
    }
  }, [shapes, focusedIdx, setShapes, announce]);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Accessible Canvas</div>
        <div className={styles.widgetNote}>
          Canvas is opaque to assistive tech. Try the keyboard navigation below — Tab between shapes, arrow keys to move, Delete to remove. The &quot;Screen Reader Output&quot; panel shows what would be announced.
        </div>
      </div>
      <div
        ref={containerRef}
        className={styles.canvasWrapper}
        style={{ height: 180, position: "relative", outline: "none" }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="application"
        aria-label="Accessible canvas with keyboard navigation"
      >
        {shapes.map((shape, i) => (
          <div
            key={shape.id}
            style={{
              position: "absolute",
              left: shape.x,
              top: shape.y,
              width: shape.w,
              height: shape.h,
              background: shape.fill,
              opacity: 0.3,
              borderRadius: shape.kind === "ellipse" ? "50%" : 4,
              outline: i === focusedIdx ? "3px solid var(--color-accent)" : "1px solid var(--color-border)",
              outlineOffset: i === focusedIdx ? 2 : 0,
              transition: "left 100ms ease, top 100ms ease",
            }}
            role="img"
            aria-label={`${shape.kind} at ${Math.round(shape.x)}, ${Math.round(shape.y)}`}
          />
        ))}
        {shapes.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "0.7rem", color: "var(--color-muted)" }}>
            (no shapes — go to step 6 to add some)
          </div>
        )}
      </div>
      <div className={styles.a11yMirror}>
        <div style={{ fontSize: "0.625rem", fontWeight: 800, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-1)" }}>
          Hidden DOM Mirror
        </div>
        {shapes.map((shape, i) => (
          <div key={shape.id} className={styles.a11yRow} data-active={i === focusedIdx ? "true" : undefined}>
            <span className={styles.a11yRole}>role=&quot;img&quot;</span>
            <span className={styles.a11yLabel}>
              {shape.kind} — {shape.text ?? `${shape.w}×${shape.h}`}
            </span>
            <span className={styles.a11yPos}>
              ({Math.round(shape.x)}, {Math.round(shape.y)})
            </span>
          </div>
        ))}
      </div>
      <div className={styles.widgetPanel} style={{ borderLeftColor: "var(--diagram-layer-2)" }}>
        <div className={styles.widgetTitle} style={{ color: "var(--diagram-layer-2)" }}>Screen Reader Output</div>
        {announcements.length === 0 ? (
          <div style={{ fontSize: "0.65rem", color: "var(--color-muted)", fontStyle: "italic" }}>
            Click the canvas area above, then press Tab to start navigating
          </div>
        ) : (
          announcements.map((msg, i) => (
            <div key={i} style={{ fontSize: "0.65rem", color: i === announcements.length - 1 ? "var(--color-text)" : "var(--color-muted)", fontWeight: i === announcements.length - 1 ? 700 : 500 }}>
              → {msg}
            </div>
          ))
        )}
      </div>
      <div aria-live="polite" className={styles.srOnly}>
        {announcements[announcements.length - 1] ?? ""}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Shared widgets
// ═══════════════════════════════════════════════════════════════════

function ShapeListWidget({ selectable }: { selectable?: boolean }) {
  const { shapes, selectedShapeId, setSelectedShapeId } = useWhiteboard();

  return (
    <div className={styles.widgetPanel} style={{ borderLeftColor: "var(--diagram-layer-1)" }}>
      <div className={styles.widgetTitle} style={{ color: "var(--diagram-layer-1)" }}>
        Scene Graph ({shapes.length} shape{shapes.length !== 1 ? "s" : ""})
      </div>
      <div className={styles.shapeList}>
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className={styles.shapeRow}
            data-selected={shape.id === selectedShapeId ? "true" : undefined}
            onClick={selectable ? () => setSelectedShapeId(shape.id === selectedShapeId ? null : shape.id) : undefined}
            style={selectable ? { cursor: "pointer" } : undefined}
            role={selectable ? "button" : undefined}
            tabIndex={selectable ? 0 : undefined}
          >
            <div className={styles.shapeSwatch} style={{ background: shape.fill }} />
            <span className={styles.shapeKind}>{shape.kind}</span>
            <span className={styles.shapePos}>
              ({Math.round(shape.x)}, {Math.round(shape.y)}) {shape.w}×{shape.h}
            </span>
          </div>
        ))}
        {shapes.length === 0 && (
          <div style={{ fontSize: "0.625rem", color: "var(--color-muted)", fontStyle: "italic" }}>
            (empty scene)
          </div>
        )}
      </div>
    </div>
  );
}

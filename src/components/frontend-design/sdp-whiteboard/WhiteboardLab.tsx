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

const CANVAS_W = 440;
const CANVAS_H = 260;

// ── Public API ──────────────────────────────────────────────────────

export function WhiteboardLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    const firstFocusable = scrollRef.current?.querySelector(
      "button, [tabindex='0'], input, [role='radio']"
    ) as HTMLElement;
    firstFocusable?.focus({ preventScroll: true });
  }, [activeStep]);

  return (
    <WhiteboardProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div ref={scrollRef} className={styles.scrollArea}>
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
  "CAN", "PTR", "SHP", "HIT",
  "SEL", "LAY", "EVT",
  "UND", "SYN", "CUR",
  "IDX", "A11Y",
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
    <div className={styles.stepBar} aria-label="Build progress">
      <ol role="list" className={styles.stepBarList}>
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
    </div>
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
        {tab === "endpoints" ? <EndpointChallenge /> : <TypeCards />}
      </div>
    </div>
  );
}

const WB_METHODS = ["GET", "POST", "PUT", "DELETE", "WS"] as const;

function EndpointChallenge() {
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  return (
    <div className={styles.endpointList}>
      {API_ENDPOINTS.map((ep) => {
        const key = `${ep.method}-${ep.path}`;
        const guess = guesses[key];
        const isRevealed = revealed.has(key);
        const isCorrect = guess === ep.method;

        return (
          <div key={key} className={styles.endpointCard} data-revealed={isRevealed ? "true" : undefined}>
            <div className={styles.endpointPath}>{ep.path}</div>
            {!isRevealed ? (
              <div className={styles.methodPicker} role="radiogroup" aria-label={`HTTP method for ${ep.path}`}>
                {WB_METHODS.map(m => (
                  <button
                    key={m} type="button" role="radio"
                    aria-checked={guess === m}
                    className={styles.methodOption}
                    data-method={m}
                    data-picked={guess === m ? "true" : undefined}
                    onClick={() => {
                      setGuesses(prev => ({ ...prev, [key]: m }));
                      if (m === ep.method) {
                        setTimeout(() => setRevealed(prev => new Set(prev).add(key)), 400);
                      }
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.endpointHeader}>
                <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
                <span className={styles.endpointPath}>{ep.path}</span>
              </div>
            )}
            {guess && !isCorrect && !isRevealed && (
              <div className={styles.methodHint}>Not quite — think about what this route does to the resource.</div>
            )}
            {isRevealed && <div className={styles.endpointDesc}>{ep.description}</div>}
            {isRevealed && (
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
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Revealed</div>
          <div className={styles.metricValue} data-status={revealed.size === API_ENDPOINTS.length ? "good" : undefined}>{revealed.size}/{API_ENDPOINTS.length}</div>
        </div>
      </div>
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

const WB_STEP_SCOPE_MAP: Record<number, string> = {
  5: "freehand", 10: "freehand",
  6: "shapes", 7: "shapes",
  8: "transforms",
  12: "multiUser", 13: "multiUser",
  14: "spatialIndex",
};

function WbScopeBadge({ step, expanded, onToggle }: { step: number; expanded: boolean; onToggle: () => void }) {
  const { scopeEnabled } = useWhiteboard();
  const scopeId = WB_STEP_SCOPE_MAP[step];
  if (!scopeId) return null;
  const inScope = !!scopeEnabled[scopeId];
  if (inScope) {
    return (
      <div className={styles.scopeBadge} data-in-scope="true">
        ✓ In your scope
      </div>
    );
  }
  return (
    <button
      type="button"
      className={styles.scopeBadge}
      data-in-scope="false"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      {expanded ? "▾ Bonus topic (collapse)" : "▸ Bonus topic — click to explore"}
    </button>
  );
}

function StepContent({ step }: { step: number }) {
  const { scopeEnabled } = useWhiteboard();
  const [bonusExpanded, setBonusExpanded] = useState(false);
  const [predictionAnswered, setPredictionAnswered] = useState(false);
  const scopeId = WB_STEP_SCOPE_MAP[step];
  const isOutOfScope = scopeId && !scopeEnabled[scopeId];
  const hasPrediction = !!STEP_PREDICTIONS[step];
  const showWidget = (!isOutOfScope || bonusExpanded) && (!hasPrediction || predictionAnswered);

  return (
    <div className={styles.stepContentStack}>
      <WbScopeBadge step={step} expanded={bonusExpanded} onToggle={() => setBonusExpanded(v => !v)} />
      <PredictionChallenge step={step} onAnswer={() => setPredictionAnswered(true)} />
      {showWidget && <StepInteractive step={step} />}
      {hasPrediction && !predictionAnswered && (
        <div className={styles.widgetNote}>Answer the prediction above to unlock the interactive demo.</div>
      )}
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

function PredictionChallenge({ step, onAnswer }: { step: number; onAnswer: () => void }) {
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
            onClick={() => { setPicked(i); onAnswer(); }}
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
    const cs = canvas.parentElement ? getComputedStyle(canvas.parentElement) : null;
    drawCanvasGrid(ctx, canvas.width, canvas.height, cs);
    for (const shape of allShapes) drawCanvasShape(ctx, shape, cs);
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
            width={CANVAS_W}
            height={CANVAS_H}
            className={styles.canvas}
            role="img"
            aria-label={`Canvas rendering ${allShapes.length} shapes`}
          />
        ) : (
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className={styles.renderSvg}>
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

const CANVAS_FALLBACK = "rgba(128,128,128,0.2)";

function resolveColor(cssVar: string, style: CSSStyleDeclaration | null): string {
  if (!cssVar.startsWith("var(")) return cssVar;
  if (!style) return CANVAS_FALLBACK;
  const prop = cssVar.replace(/^var\(--/, "--").replace(/\)$/, "");
  return style.getPropertyValue(prop).trim() || CANVAS_FALLBACK;
}

function drawCanvasGrid(ctx: CanvasRenderingContext2D, w: number, h: number, cs: CSSStyleDeclaration | null) {
  const gridColor = cs?.getPropertyValue("--color-border").trim() || CANVAS_FALLBACK;
  ctx.save();
  ctx.strokeStyle = gridColor;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function drawCanvasShape(ctx: CanvasRenderingContext2D, shape: Shape, cs: CSSStyleDeclaration | null, opts?: { highlight?: boolean }) {
  ctx.save();
  const fillColor = resolveColor(shape.fill, cs);
  const strokeColor = resolveColor(shape.stroke, cs);

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
    for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i]!.x, shape.points[i]!.y);
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

  if (opts?.highlight && shape.selected) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = cs?.getPropertyValue("--color-accent").trim() || CANVAS_FALLBACK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(shape.x - 2, shape.y - 2, shape.w + 4, shape.h + 4);
    ctx.setLineDash([]);
  }
  ctx.restore();
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
    const cs = canvas.parentElement ? getComputedStyle(canvas.parentElement) : null;
    drawCanvasGrid(ctx, canvas.width, canvas.height, cs);
    for (const shape of shapes) drawCanvasShape(ctx, shape, cs);

    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0]!.x, currentPath[0]!.y);
      for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i]!.x, currentPath[i]!.y);
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
          width={CANVAS_W}
          height={CANVAS_H}
          className={styles.canvas}
          tabIndex={0}
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cs = getComputedStyle(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCanvasGrid(ctx, canvas.width, canvas.height, cs);
    for (const shape of shapes) drawCanvasShape(ctx, shape, cs);
  }, [shapes]);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Shape Object Model</div>
        <div className={styles.widgetNote}>
          Each shape is a data object: id, kind, bounding box (x, y, w, h), rotation, fill, stroke, z-index. Add shapes and watch both the canvas preview and the data list update — this dual representation is what makes selection, transforms, undo, and serialization possible.
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={styles.canvas}
        role="img"
        aria-label={`Shape preview: ${shapes.length} shapes`}
      />
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
    const cs = canvas.parentElement ? getComputedStyle(canvas.parentElement) : null;
    const gridColor = cs?.getPropertyValue("--color-border").trim() || CANVAS_FALLBACK;
    drawCanvasGrid(ctx, canvas.width, canvas.height, cs);

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
        ctx.strokeStyle = gridColor;
        ctx.globalAlpha = 0.4;
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
          width={CANVAS_W}
          height={CANVAS_H}
          className={styles.canvas}
          tabIndex={0}
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

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLE_DEFS: { id: HandleId; cursor: string; label: string; getPos: (x: number, y: number, w: number, h: number) => [number, number] }[] = [
  { id: "nw", cursor: "nwse-resize", label: "top-left", getPos: (x, y) => [x, y] },
  { id: "n",  cursor: "ns-resize",   label: "top",      getPos: (x, y, w) => [x + w / 2, y] },
  { id: "ne", cursor: "nesw-resize", label: "top-right", getPos: (x, y, w) => [x + w, y] },
  { id: "e",  cursor: "ew-resize",   label: "right",    getPos: (x, y, w, h) => [x + w, y + h / 2] },
  { id: "se", cursor: "nwse-resize", label: "bottom-right", getPos: (x, y, w, h) => [x + w, y + h] },
  { id: "s",  cursor: "ns-resize",   label: "bottom",   getPos: (x, y, w, h) => [x + w / 2, y + h] },
  { id: "sw", cursor: "nesw-resize", label: "bottom-left", getPos: (x, y, _w, h) => [x, y + h] },
  { id: "w",  cursor: "ew-resize",   label: "left",     getPos: (x, y, _w, h) => [x, y + h / 2] },
];

function SelectionHandlesStep() {
  const { shapes, selectedShapeId, setSelectedShapeId, setShapes } = useWhiteboard();
  const selected = shapes.find((s) => s.id === selectedShapeId);
  const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
  const [dragCursor, setDragCursor] = useState<string>("default");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStart = useRef<{ mx: number; my: number; shape: Shape } | null>(null);

  const SVG_W = 400;
  const SVG_H = 240;

  const handlePointerDown = useCallback((e: React.PointerEvent, handleId: HandleId) => {
    if (!selected || !svgRef.current) return;
    e.preventDefault();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM()?.inverse();
    const svgPt = ctm ? pt.matrixTransform(ctm) : pt;
    dragStart.current = { mx: svgPt.x, my: svgPt.y, shape: { ...selected } };
    setActiveHandle(handleId);
    const def = HANDLE_DEFS.find(h => h.id === handleId);
    setDragCursor(def?.cursor ?? "default");
  }, [selected]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!activeHandle || !dragStart.current || !selected || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM()?.inverse();
    const svgPt = ctm ? pt.matrixTransform(ctm) : pt;
    const dx = svgPt.x - dragStart.current.mx;
    const dy = svgPt.y - dragStart.current.my;
    const orig = dragStart.current.shape;

    let { x, y, w, h } = orig;
    if (activeHandle.includes("w")) { x = orig.x + dx; w = orig.w - dx; }
    if (activeHandle.includes("e")) { w = orig.w + dx; }
    if (activeHandle === "n" || activeHandle === "ne" || activeHandle === "nw") { y = orig.y + dy; h = orig.h - dy; }
    if (activeHandle === "s" || activeHandle === "se" || activeHandle === "sw") { h = orig.h + dy; }

    w = Math.max(20, w); h = Math.max(20, h);
    setShapes(prev => prev.map(s => s.id === selected.id ? { ...s, x, y, w, h } : s));
  }, [activeHandle, selected, setShapes]);

  const handlePointerUp = useCallback(() => {
    setActiveHandle(null);
    setDragCursor("default");
    dragStart.current = null;
  }, []);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Selection Handles</div>
        <div className={styles.widgetNote}>
          Select a shape below, then drag any handle to resize. Corner handles resize both dimensions, edge handles resize only one. Watch the dimensions update in real time.
        </div>
      </div>
      <ShapeListWidget selectable />
      {selected && (
        <div className={styles.canvasWrapper}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.selectionSvg}
            style={{ cursor: dragCursor }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            role="application"
            aria-label="Drag handles to resize the selected shape"
          >
            {/* Shape */}
            {selected.kind === "ellipse" ? (
              <ellipse cx={selected.x + selected.w / 2} cy={selected.y + selected.h / 2} rx={selected.w / 2} ry={selected.h / 2} fill={selected.fill} fillOpacity={0.3} stroke={selected.stroke} strokeWidth={2} />
            ) : (
              <rect x={selected.x} y={selected.y} width={selected.w} height={selected.h} fill={selected.fill} fillOpacity={0.3} stroke={selected.stroke} strokeWidth={2} />
            )}
            {/* Selection outline */}
            <rect x={selected.x} y={selected.y} width={selected.w} height={selected.h} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="4 4" />
            {/* Handles */}
            {HANDLE_DEFS.map(h => {
              const [hx, hy] = h.getPos(selected.x, selected.y, selected.w, selected.h);
              return (
                <circle
                  key={h.id}
                  cx={hx} cy={hy} r={6}
                  fill={activeHandle === h.id ? "var(--color-accent)" : "var(--color-bg)"}
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  style={{ cursor: h.cursor }}
                  onPointerDown={(e) => handlePointerDown(e, h.id)}
                  role="slider"
                  aria-label={`Resize handle: ${h.label}`}
                  tabIndex={0}
                />
              );
            })}
            {/* Rotation handle */}
            <line x1={selected.x + selected.w / 2} y1={selected.y} x2={selected.x + selected.w / 2} y2={selected.y - 20} stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={selected.x + selected.w / 2} cy={selected.y - 24} r="4" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
            {/* Dimension labels */}
            <text x={selected.x + selected.w / 2} y={selected.y + selected.h + 18} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700" fill="var(--color-accent)">
              {Math.round(selected.w)} × {Math.round(selected.h)}
            </text>
          </svg>
        </div>
      )}
      {selected && (
        <div className={styles.metricsBar}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Position</div>
            <div className={styles.metricValue}>({Math.round(selected.x)}, {Math.round(selected.y)})</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Size</div>
            <div className={styles.metricValue}>{Math.round(selected.w)}×{Math.round(selected.h)}</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Handle</div>
            <div className={styles.metricValue}>{activeHandle ?? "—"}</div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 9: Layer Separation
// ═══════════════════════════════════════════════════════════════════

const CANVAS_LAYERS = [
  { id: "shapes", label: "Shape Canvas", colorVar: "--diagram-layer-1" },
  { id: "cursors", label: "Cursor Canvas", colorVar: "--diagram-layer-4" },
];

const LAYER_CANVAS_W = 300;
const LAYER_CANVAS_H = 140;

function LayerSeparationStep() {
  const shapeCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapeRedraws, setShapeRedraws] = useState(0);
  const [cursorRedraws, setCursorRedraws] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const shapePos = useRef({ x: 120, y: 60, w: 60, h: 40 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const reducedMotion = usePrefersReducedMotion();
  const rafRef = useRef<number>(0);

  const drawShapeLayer = useCallback(() => {
    const canvas = shapeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cs = getComputedStyle(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCanvasGrid(ctx, canvas.width, canvas.height, cs);
    const { x, y, w, h } = shapePos.current;
    ctx.fillStyle = resolveColor("var(--diagram-layer-1)", cs);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = resolveColor("var(--diagram-layer-1)", cs);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    setShapeRedraws(c => c + 1);
  }, []);

  const drawCursorLayer = useCallback(() => {
    const canvas = cursorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cs = getComputedStyle(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { x, y } = cursorPos.current;
    if (x > 0 && y > 0) {
      const color = resolveColor("var(--diagram-layer-4)", cs);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y + 14);
      ctx.lineTo(x + 4, y + 14);
      ctx.lineTo(x + 6, y + 20);
      ctx.lineTo(x + 2, y + 21);
      ctx.lineTo(x, y + 16);
      ctx.lineTo(x - 4, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.font = "bold 9px monospace";
      ctx.fillText("Bob", x + 12, y + 14);
    }
    setCursorRedraws(c => c + 1);
  }, []);

  useEffect(() => {
    drawShapeLayer();
    drawCursorLayer();
  }, [drawShapeLayer, drawCursorLayer]);

  const getScaledPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = LAYER_CANVAS_W / rect.width;
    const scaleY = LAYER_CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { x: px, y: py } = getScaledPos(e);
    const s = shapePos.current;
    if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) {
      setIsDragging(true);
      dragOffset.current = { x: px - s.x, y: py - s.y };
      containerRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x: px, y: py } = getScaledPos(e);

    cursorPos.current = { x: px, y: py };
    drawCursorLayer();

    if (isDragging) {
      shapePos.current = {
        ...shapePos.current,
        x: Math.max(0, px - dragOffset.current.x),
        y: Math.max(0, py - dragOffset.current.y),
      };
      drawShapeLayer();
    }
  };

  const onPointerUp = () => setIsDragging(false);

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Dual-Canvas Architecture</div>
        <div className={styles.widgetNote}>
          Move your pointer over the area — the cursor layer redraws continuously while the shape layer stays untouched. Drag the rectangle to see the shape layer redraw only when needed.
        </div>
      </div>
      <div ref={containerRef} className={styles.dualCanvasDemo}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <canvas ref={shapeCanvasRef} width={LAYER_CANVAS_W} height={LAYER_CANVAS_H} className={styles.layerCanvas} />
        <canvas ref={cursorCanvasRef} width={LAYER_CANVAS_W} height={LAYER_CANVAS_H} className={styles.layerCanvas} />
      </div>
      <div className={styles.layerDiagram}>
        <div className={styles.layerRow}>
          <div className={styles.layerColor} data-layer="shapes" />
          <span className={styles.layerName}>Shape Canvas</span>
          <span className={styles.layerFps}>on drag</span>
          <span className={styles.layerCount} data-active={shapeRedraws > 1 ? "true" : undefined}>
            {shapeRedraws}×
          </span>
        </div>
        <div className={styles.layerRow}>
          <div className={styles.layerColor} data-layer="cursors" />
          <span className={styles.layerName}>Cursor Canvas</span>
          <span className={styles.layerFps}>every move</span>
          <span className={styles.layerCount} data-active={cursorRedraws > 1 ? "true" : undefined}>
            {cursorRedraws}×
          </span>
        </div>
      </div>
      <div className={styles.stepMessage}>
        {cursorRedraws > 5 && shapeRedraws <= 2
          ? `Cursor layer redrew ${cursorRedraws}× while shape layer only ${shapeRedraws}×. Without separation, every cursor move would re-render all shapes.`
          : isDragging
            ? "Both layers are redrawing — shape canvas updates because you're moving the rectangle."
            : "Move your pointer over the canvas to see cursor redraws accumulate independently."}
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={() => { setShapeRedraws(0); setCursorRedraws(0); drawShapeLayer(); }}>Reset Counters</button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 10: Coalesced Events
// ═══════════════════════════════════════════════════════════════════

function CoalescedEventsStep() {
  const [regularPts, setRegularPts] = useState<{x:number;y:number}[]>([]);
  const [coalescedPts, setCoalescedPts] = useState<{x:number;y:number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingRef = useRef(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const getRelPos = (e: PointerEvent | React.PointerEvent, rect: DOMRect) => ({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    drawingRef.current = true;
    setIsDrawing(true);
    setRegularPts([]);
    setCoalescedPts([]);
    areaRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const hw = rect.width / 2;
    const regPt = getRelPos(e.nativeEvent, rect);
    setRegularPts(prev => [...prev, { x: regPt.x > hw ? regPt.x - hw : regPt.x, y: regPt.y }]);

    const coalEvents = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const newCoalesced = coalEvents.map(ce => {
      const p = getRelPos(ce, rect);
      return { x: p.x > hw ? p.x - hw : p.x, y: p.y };
    });
    setCoalescedPts(prev => [...prev, ...newCoalesced]);
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    setIsDrawing(false);
  };

  const toPath = (pts: {x:number;y:number}[]) =>
    pts.length < 2 ? "" : `M${pts.map(p => `${p.x},${p.y}`).join("L")}`;

  const ratio = regularPts.length > 0 ? (coalescedPts.length / regularPts.length).toFixed(1) : "—";

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>getCoalescedEvents()</div>
        <div className={styles.widgetNote}>
          Draw below to compare paths — left uses only pointermove events, right uses getCoalescedEvents() for all hardware samples. The coalesced path is noticeably smoother.
        </div>
      </div>
      <div
        ref={areaRef}
        className={styles.coalescedArea}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Split draw area — drag to compare regular vs coalesced event paths"
      >
        <div className={styles.coalescedSplit}>
          <div className={styles.coalescedHalf}>
            <span className={styles.coalescedLabel}>pointermove only</span>
            <svg className={styles.coalescedSvg} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
              {regularPts.length >= 2 && <path d={toPath(regularPts)} fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" />}
              {regularPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-muted)" />)}
            </svg>
            <span className={styles.coalescedCount}>{regularPts.length} pts</span>
          </div>
          <div className={styles.coalescedDivider} />
          <div className={styles.coalescedHalf}>
            <span className={styles.coalescedLabel}>+ getCoalescedEvents()</span>
            <svg className={styles.coalescedSvg} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
              {coalescedPts.length >= 2 && <path d={toPath(coalescedPts)} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />}
              {coalescedPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="var(--color-accent)" />)}
            </svg>
            <span className={styles.coalescedCount}>{coalescedPts.length} pts</span>
          </div>
        </div>
        {!isDrawing && regularPts.length === 0 && (
          <div className={styles.coalescedPrompt}>Press and drag to draw</div>
        )}
      </div>
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>pointermove events</div>
          <div className={styles.metricValue}>{regularPts.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Coalesced points</div>
          <div className={styles.metricValue} data-status={coalescedPts.length > regularPts.length ? "good" : undefined}>
            {coalescedPts.length}
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

  const deleteLastShape = () => {
    if (shapes.length === 0) return;
    const removed = shapes[shapes.length - 1]!;
    setShapes((prev) => prev.slice(0, -1));
    pushUndo({ type: "remove", shapeId: removed.id, before: removed });
  };

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Command Pattern Undo</div>
        <div className={styles.widgetNote}>
          Each mutation produces an inverse command. Try adding and deleting shapes, then undo — notice both operations are reversible. The stack stores operation type, shape ID, and before/after state.
        </div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={addRandomShape}>+ Add</button>
        <button type="button" className={styles.toolButton} onClick={deleteLastShape} disabled={shapes.length === 0}>− Delete</button>
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
              <div className={styles.redoHint}>
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
  { id: "lww", name: "LWW", desc: "Last-Writer-Wins — simple, lossy on true conflicts" },
  { id: "ot", name: "OT", desc: "Operational Transform — server reorders, correct" },
  { id: "crdt", name: "CRDT", desc: "Conflict-free — converges peer-to-peer" },
];

const CONFLICT_COLORS = ["red", "blue", "green", "orange", "purple"] as const;
type ConflictColor = typeof CONFLICT_COLORS[number];
const COLOR_VAR: Record<ConflictColor, string> = { red: "var(--diagram-layer-8)", blue: "var(--diagram-layer-0)", green: "var(--diagram-layer-1)", orange: "var(--diagram-layer-4)", purple: "var(--diagram-layer-2)" };

function resolveMerge(strategy: SyncStrategy, alice: ConflictColor, bob: ConflictColor): { result: ConflictColor; aliceLost: boolean; bobLost: boolean; explanation: string } {
  if (alice === bob) return { result: alice, aliceLost: false, bobLost: false, explanation: "No conflict — both chose the same color." };
  switch (strategy) {
    case "lww": return { result: bob, aliceLost: true, bobLost: false, explanation: `Bob's timestamp was later → Alice's "${alice}" is silently overwritten. No merge, no notification.` };
    case "ot": return { result: bob, aliceLost: true, bobLost: false, explanation: `Server orders ops sequentially: Alice's "${alice}" applied first, then Bob's "${bob}" overwrites. Both converge, but Alice's intent is lost.` };
    case "crdt": {
      const winner = alice < bob ? alice : bob;
      const loser = alice < bob ? bob : alice;
      const winnerIs = winner === alice ? "Alice" : "Bob";
      return { result: winner, aliceLost: winner !== alice, bobLost: winner !== bob, explanation: `Deterministic tie-break (alphabetical): "${winner}" < "${loser}" → ${winnerIs}'s edit wins. Both replicas converge without a server.` };
    }
  }
}

function CrdtSyncStep() {
  const { syncStrategy, setSyncStrategy } = useWhiteboard();
  const [aliceChoice, setAliceChoice] = useState<ConflictColor>("red");
  const [bobChoice, setBobChoice] = useState<ConflictColor>("green");
  const [merged, setMerged] = useState<ReturnType<typeof resolveMerge> | null>(null);

  useEffect(() => { setMerged(null); }, [syncStrategy, aliceChoice, bobChoice]);

  const doMerge = () => setMerged(resolveMerge(syncStrategy, aliceChoice, bobChoice));

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Create a Conflict</div>
        <div className={styles.widgetNote}>
          Pick what Alice and Bob each set as the rectangle&apos;s fill color, then hit Merge to see how each strategy resolves it.
        </div>
      </div>
      <div className={styles.crdtComparison}>
        <div className={styles.crdtCard}>
          <div className={styles.crdtCardTitle} data-role="alice">Alice picks</div>
          <div className={styles.colorPicker}>
            {CONFLICT_COLORS.map(c => (
              <button key={c} type="button" className={styles.colorSwatch}
                data-active={aliceChoice === c ? "true" : undefined}
                style={{ background: COLOR_VAR[c] }}
                aria-label={`Alice: ${c}`} aria-pressed={aliceChoice === c}
                onClick={() => setAliceChoice(c)} />
            ))}
          </div>
        </div>
        <div className={styles.crdtCard}>
          <div className={styles.crdtCardTitle} data-role="bob">Bob picks</div>
          <div className={styles.colorPicker}>
            {CONFLICT_COLORS.map(c => (
              <button key={c} type="button" className={styles.colorSwatch}
                data-active={bobChoice === c ? "true" : undefined}
                style={{ background: COLOR_VAR[c] }}
                aria-label={`Bob: ${c}`} aria-pressed={bobChoice === c}
                onClick={() => setBobChoice(c)} />
            ))}
          </div>
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
        <button type="button" className={styles.toolButton} onClick={doMerge}>
          ⚡ Merge
        </button>
      </div>
      {merged && (
        <>
          <div className={styles.mergeResult}>
            <div className={styles.mergePreview}>
              <div className={styles.mergeBox} style={{ background: COLOR_VAR[aliceChoice] }} data-lost={merged.aliceLost ? "true" : undefined}>
                <span className={styles.mergeBoxLabel}>Alice</span>
                <span className={styles.mergeBoxColor}>{aliceChoice}</span>
                {merged.aliceLost && <span className={styles.mergeBoxLost}>LOST</span>}
              </div>
              <div className={styles.mergeArrow}>→</div>
              <div className={styles.mergeBox} style={{ background: COLOR_VAR[merged.result] }}>
                <span className={styles.mergeBoxLabel}>Result</span>
                <span className={styles.mergeBoxColor}>{merged.result}</span>
              </div>
              <div className={styles.mergeArrow}>←</div>
              <div className={styles.mergeBox} style={{ background: COLOR_VAR[bobChoice] }} data-lost={merged.bobLost ? "true" : undefined}>
                <span className={styles.mergeBoxLabel}>Bob</span>
                <span className={styles.mergeBoxColor}>{bobChoice}</span>
                {merged.bobLost && <span className={styles.mergeBoxLost}>LOST</span>}
              </div>
            </div>
          </div>
          <div className={styles.metricsBar}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Strategy</div>
              <div className={styles.metricValue}>{syncStrategy.toUpperCase()}</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Data loss?</div>
              <div className={styles.metricValue} data-status={merged.aliceLost || merged.bobLost ? "bad" : "good"}>
                {merged.aliceLost || merged.bobLost ? "Yes" : "No"}
              </div>
            </div>
          </div>
          <div className={styles.stepMessage} data-severity={merged.aliceLost ? "warning" : undefined}>
            {merged.explanation}
          </div>
        </>
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
    if (timerRef.current) clearInterval(timerRef.current);
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
        className={`${styles.canvasWrapper} ${styles.cursorArea}`}
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
          <div className={styles.emptyCenter}>
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
  const [shapeCount, setShapeCount] = useState(500);
  const [queryPath, setQueryPath] = useState<number[]>([]);
  const reducedMotion = usePrefersReducedMotion();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  const linearMs = (shapeCount * 60 * 0.005).toFixed(1);
  const rtreeMs = (Math.log2(shapeCount) * 60 * 0.002).toFixed(2);
  const depth = Math.max(1, Math.ceil(Math.log(shapeCount) / Math.log(9)));

  const runQuery = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const path = [0, Math.floor(Math.random() * 3)];
    if (depth >= 2) path.push(Math.floor(Math.random() * 3));
    if (depth >= 3) path.push(Math.floor(Math.random() * 3));
    if (reducedMotion) { setQueryPath(path); return; }
    setQueryPath([]);
    path.forEach((_, i) => {
      timersRef.current.push(setTimeout(() => setQueryPath(path.slice(0, i + 1)), i * 300));
    });
  }, [depth, reducedMotion]);

  const checksAvoided = shapeCount - Math.ceil(shapeCount / Math.pow(3, depth));

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>R-tree Spatial Index</div>
        <div className={styles.widgetNote}>
          Click &quot;Query&quot; to trace a hit-test through the R-tree. Watch how the search prunes subtrees — at {shapeCount.toLocaleString()} shapes, it skips ~{checksAvoided.toLocaleString()} bounding-box checks per query.
        </div>
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={runQuery}>▶ Query</button>
        <button type="button" className={styles.toolButton} onClick={() => setQueryPath([])}>Reset</button>
      </div>
      <div className={styles.toggleStrip}>
        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel} htmlFor="rtree-shape-count">Shape count</label>
          <input
            id="rtree-shape-count"
            type="range"
            min={10}
            max={10000}
            step={10}
            value={shapeCount}
            onChange={(e) => { setShapeCount(Number(e.target.value)); setQueryPath([]); }}
            className={styles.rangeInput}
          />
          <span className={styles.shapeCountValue}>
            {shapeCount.toLocaleString()}
          </span>
        </div>
      </div>
      <RtreeVisualization shapeCount={shapeCount} depth={depth} queryPath={queryPath} />
      <div className={styles.rtreeStats}>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>Linear scan</span>
          <span className={styles.rtreeStatValue} data-status={Number(linearMs) > 10 ? "warning" : "good"}>{linearMs}ms</span>
        </div>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>R-tree</span>
          <span className={styles.rtreeStatValue} data-status="good">{rtreeMs}ms</span>
        </div>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>Depth</span>
          <span className={styles.rtreeStatValue}>{depth}</span>
        </div>
        <div className={styles.rtreeStat}>
          <span className={styles.rtreeStatLabel}>Speedup</span>
          <span className={styles.rtreeStatValue} data-status="good">{(Number(linearMs) / Number(rtreeMs)).toFixed(0)}x</span>
        </div>
      </div>
    </>
  );
}

function RtreeVisualization({ shapeCount, depth, queryPath }: { shapeCount: number; depth: number; queryPath: number[] }) {
  const colors = ["var(--diagram-layer-1)", "var(--diagram-layer-2)", "var(--diagram-layer-4)", "var(--color-accent)"];
  const l1Count = Math.min(depth >= 1 ? 3 : 0, 3);
  const l2Count = depth >= 2 ? 9 : 0;
  const l3Count = depth >= 3 ? Math.min(27, 9) : 0;
  const svgH = depth >= 3 ? 160 : 120;

  const isOnPath = (level: number, idx: number): boolean => {
    if (queryPath.length <= level) return false;
    if (level === 0) return queryPath.length > 0;
    let pathIdx = 0;
    for (let l = 1; l <= level; l++) pathIdx = (queryPath[l] ?? 0);
    if (level === 1) return queryPath.length > 1 && queryPath[1] === idx;
    if (level === 2) return queryPath.length > 2 && queryPath[1] === Math.floor(idx / 3) && queryPath[2] === idx % 3;
    return false;
  };

  return (
    <div className={styles.rtreeVisualizer}>
      <svg viewBox={`0 0 400 ${svgH}`} className={styles.rtreeSvg} role="img" aria-label={`R-tree with ${depth} levels for ${shapeCount} shapes`}>
        {/* Root */}
        <rect x="170" y="5" width="60" height="20" rx="3"
          fill={colors[0]} fillOpacity={isOnPath(0, 0) ? 0.6 : 0.3}
          stroke={colors[0]} strokeWidth={isOnPath(0, 0) ? 2.5 : 1.5} />
        <text x="200" y="18" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-text)" fontWeight={isOnPath(0, 0) ? "800" : "400"}>root</text>

        {/* Level 1 */}
        {Array.from({ length: l1Count }, (_, i) => {
          const x = 60 + i * 130;
          const onPath = isOnPath(1, i);
          return (
            <g key={i}>
              <line x1="200" y1="25" x2={x + 30} y2="40" stroke={colors[1]} strokeWidth={onPath ? 2 : 1} strokeOpacity={onPath ? 1 : 0.4} />
              <rect x={x} y="40" width="60" height="18" rx="3" fill={colors[1]} fillOpacity={onPath ? 0.5 : 0.15} stroke={colors[1]} strokeWidth={onPath ? 2 : 1} />
              <text x={x + 30} y="52" textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill={onPath ? "var(--color-text)" : "var(--color-muted)"} fontWeight={onPath ? "800" : "400"}>
                {Math.ceil(shapeCount / 3)}
              </text>
            </g>
          );
        })}

        {/* Level 2 */}
        {l2Count > 0 && Array.from({ length: l2Count }, (_, i) => {
          const parentIdx = Math.floor(i / 3);
          const parentX = 60 + parentIdx * 130 + 30;
          const x = 10 + i * 42;
          const onPath = isOnPath(2, i);
          return (
            <g key={`l2-${i}`}>
              <line x1={parentX} y1="58" x2={x + 16} y2="74" stroke={colors[2]} strokeWidth={onPath ? 1.5 : 0.8} strokeOpacity={onPath ? 1 : 0.3} />
              <rect x={x} y="74" width="32" height="14" rx="2" fill={colors[2]} fillOpacity={onPath ? 0.4 : 0.1} stroke={colors[2]} strokeWidth={onPath ? 1.5 : 0.8} />
              <text x={x + 16} y="84" textAnchor="middle" fontSize="6" fontFamily="var(--font-mono)" fill={onPath ? "var(--color-text)" : "var(--color-muted)"}>
                {Math.ceil(shapeCount / 9)}
              </text>
            </g>
          );
        })}

        {/* Level 3 indicator for very large counts */}
        {depth >= 3 && (
          <text x="200" y={svgH - 20} textAnchor="middle" fontSize="7" fontFamily="var(--font-mono)" fill="var(--color-muted)">
            + {Math.ceil(shapeCount / 81)} leaf nodes at depth {depth} (not shown)
          </text>
        )}

        <text x="200" y={svgH - 6} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-muted)">
          {shapeCount.toLocaleString()} shapes · {depth} levels · {queryPath.length > 0 ? `query checked ${queryPath.length} node${queryPath.length > 1 ? "s" : ""}` : "click Query to trace"}
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
        className={`${styles.canvasWrapper} ${styles.a11yCanvasArea}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="application"
        aria-label="Accessible canvas with keyboard navigation"
      >
        {shapes.map((shape, i) => (
          <div
            key={shape.id}
            className={styles.a11yShapeMarker}
            data-focused={i === focusedIdx ? "true" : undefined}
            style={{
              left: shape.x,
              top: shape.y,
              width: shape.w,
              height: shape.h,
              background: shape.fill,
              borderRadius: shape.kind === "ellipse" ? "50%" : 4,
            }}
            role="img"
            aria-label={`${shape.kind} at ${Math.round(shape.x)}, ${Math.round(shape.y)}`}
          />
        ))}
        {shapes.length === 0 && (
          <div className={styles.emptyCenter}>
            (no shapes — go to step 6 to add some)
          </div>
        )}
      </div>
      <div className={styles.a11yMirror}>
        <div className={styles.a11yMirrorHeading}>
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
      <div className={`${styles.widgetPanel} ${styles.srPanelAccent}`}>
        <div className={`${styles.widgetTitle} ${styles.srPanelTitleColor}`}>Screen Reader Output</div>
        {announcements.length === 0 ? (
          <div className={styles.srEmptyHint}>
            Click the canvas area above, then press Tab to start navigating
          </div>
        ) : (
          announcements.map((msg, i) => (
            <div key={i} className={styles.srMessage} data-latest={i === announcements.length - 1 ? "true" : undefined}>
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
    <div className={`${styles.widgetPanel} ${styles.shapeListAccent}`}>
      <div className={`${styles.widgetTitle} ${styles.shapeListTitleColor}`}>
        Scene Graph ({shapes.length} shape{shapes.length !== 1 ? "s" : ""})
      </div>
      <div className={styles.shapeList}>
        {shapes.map((shape) => {
          const isSelected = shape.id === selectedShapeId;
          const toggle = () => setSelectedShapeId(isSelected ? null : shape.id);
          const inner = (
            <>
              <div className={styles.shapeSwatch} style={{ background: shape.fill }} />
              <span className={styles.shapeKind}>{shape.kind}</span>
              <span className={styles.shapePos}>
                ({Math.round(shape.x)}, {Math.round(shape.y)}) {shape.w}×{shape.h}
              </span>
            </>
          );
          return selectable ? (
            <button key={shape.id} type="button" className={styles.shapeRow}
              data-selected={isSelected ? "true" : undefined}
              aria-pressed={isSelected} onClick={toggle}>
              {inner}
            </button>
          ) : (
            <div key={shape.id} className={styles.shapeRow}
              data-selected={isSelected ? "true" : undefined}>
              {inner}
            </div>
          );
        })}
        {shapes.length === 0 && (
          <div className={styles.emptyState}>(empty scene)</div>
        )}
      </div>
    </div>
  );
}

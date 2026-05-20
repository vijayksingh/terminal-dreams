"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  DragDropProvider,
  useDragDrop,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  TOTAL_STEPS,
  type DragItem,
  type DropZone,
  type TypeDef,
  type HitTestStrategy,
  type PreviewStrategy,
} from "./drag-drop-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { DRAG_DROP_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./DragDropLab.module.css";
import { KanbanBoard } from "./ui/KanbanComponents";

// ── Public API ──────────────────────────────────────────────────────

export function DragDropLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const noMotion = usePrefersReducedMotion();

  return (
    <DragDropProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} />
        <div className={styles.scrollArea}>
          {isPlanning ? (
            noMotion ? (
              <PlanningView activeStep={activeStep} />
            ) : (
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
            )
          ) : (
            <DragEvolution />
          )}
        </div>
      </div>
    </DragDropProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "Ptr", "Prv", "Hit", "Reord",
  "Anim", "rAF", "X",
  "Kb", "Tch", "Snap",
  "Undo", "Scl",
];

const STEP_TITLES = [
  "Requirements", "API Design", "Architecture",
  "Pointer Events", "Preview Strategy", "Hit Testing", "Reorder",
  "Animation", "rAF Throttle", "Cross-Container",
  "Keyboard", "Touch", "Constraints",
  "Undo/Redo", "Scale",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <nav className={styles.stepBar} aria-label="Build steps">
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
          aria-label={`Step ${i + 1}: ${STEP_TITLES[i]}${i + 1 < activeStep ? " (complete)" : ""}`}
        >
          {label}
        </span>
      ))}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Planning views (steps 1-3)
// ═══════════════════════════════════════════════════════════════════

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <RequirementsView />;
  if (activeStep === 2) return <ApiDesignView />;
  return <ComponentTreeView />;
}

const DRAG_SCOPE_COMPLEXITY: Record<string, { loc: number; components: number }> = {
  reorder: { loc: 80, components: 2 },
  "cross-container": { loc: 120, components: 2 },
  "multi-select": { loc: 90, components: 1 },
  touch: { loc: 70, components: 1 },
  accessible: { loc: 100, components: 2 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useDragDrop();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter(s => scopeEnabled.has(s.id))
      .map(s => s.label.replace("?", ""))
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    let loc = 150;
    let components = 3;
    scopeEnabled.forEach(id => {
      const c = DRAG_SCOPE_COMPLEXITY[id];
      if (c) { loc += c.loc; components += c.components; }
    });
    const grade = loc < 300 ? "Low" : loc < 450 ? "Medium" : "High";
    return { loc, components, grade };
  }, [scopeEnabled]);

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Scope checklist</h3>
      <div className={styles.checklist}>
        {SCOPE_ITEMS.map(item => (
          <button
            key={item.id}
            className={styles.checkItem}
            data-checked={scopeEnabled.has(item.id) ? "true" : undefined}
            onClick={() => toggleScope(item.id)}
            type="button"
            aria-pressed={scopeEnabled.has(item.id)}
          >
            <span className={styles.checkToggle}>
              {scopeEnabled.has(item.id) && (
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
          <span className={styles.complexityLabel}>Est. LOC</span>
          <span className={styles.complexityValue}>{complexity.loc}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Components</span>
          <span className={styles.complexityValue}>{complexity.components}</span>
        </div>
        <div className={styles.complexityRow}>
          <span className={styles.complexityLabel}>Complexity</span>
          <span className={styles.complexityValue} data-grade={complexity.grade.toLowerCase()}>{complexity.grade}</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: API Design ──────────────────────────────────────────────

const DD_API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = DD_API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = DD_API_TABS[(idx + (e.key === "ArrowRight" ? 1 : DD_API_TABS.length - 1)) % DD_API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="dd-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="dd-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>Endpoints</button>
        <button type="button" role="tab" id="dd-tab-types" aria-selected={tab === "types"} aria-controls="dd-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>Types</button>
      </div>
      <div role="tabpanel" id={`dd-panel-${tab}`} aria-labelledby={`dd-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointCards /> : <TypeCards category="api" />}
      </div>
    </div>
  );
}

function EndpointCards() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={styles.endpointList}>
      {API_ENDPOINTS.map(ep => {
        const key = `${ep.method}-${ep.path}`;
        const isOpen = expanded === key;
        return (
          <div key={key} className={styles.endpointCard} data-expanded={isOpen ? "true" : undefined}>
            <button
              type="button"
              className={styles.endpointHeader}
              onClick={() => setExpanded(isOpen ? null : key)}
              aria-expanded={isOpen}
              aria-controls={`dd-ep-${key}`}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className={styles.endpointDetail} id={`dd-ep-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
                <p className={styles.endpointDesc}>{ep.description}</p>
                <div className={styles.endpointUsedBy}>{ep.usedBy}</div>
                {ep.params.length > 0 && (
                  <>
                    <div className={styles.endpointDetailLabel}>Parameters</div>
                    <div className={styles.paramGrid}>
                      {ep.params.map(p => (
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

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={DRAG_DROP_ARCH_CONFIG} />
    </div>
  );
}

// ── TypeCards ────────────────────────────────────────────────────────

const TYPE_CATEGORY_COLORS: Record<string, string> = {
  api: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-4)",
  props: "var(--diagram-layer-1)",
};

function TypeCards({ category }: { category: "api" | "state" | "props" }) {
  const types = DATA_MODELS.filter(t => t.category === category);
  return (
    <div className={styles.typeCardGrid}>
      {types.map(t => <TypeCard key={t.name} typeDef={t} />)}
    </div>
  );
}

function TypeCard({ typeDef }: { typeDef: TypeDef }) {
  const color = TYPE_CATEGORY_COLORS[typeDef.category];
  return (
    <div className={styles.typeCard} style={{ borderTopColor: color }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} style={{ color }}>{typeDef.category}</span>
      </div>
      {typeDef.extends && (
        <div className={styles.typeCardExtends}>extends <span>{typeDef.extends}</span></div>
      )}
      <div className={styles.typeCardFields}>
        {typeDef.fields.map((f, i) => (
          <div key={i} className={styles.typeFieldRow}>
            {f.name && <span className={styles.typeFieldName}>{f.name}</span>}
            <span className={styles.typeFieldType}>{f.type}</span>
            {f.note && <span className={styles.typeFieldNote}>{f.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Drag evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function DragEvolution() {
  const { activeStep, stateEntries } = useDragDrop();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionStack}>
      <MetricsBar />

      {noMotion ? (
        <StepControls />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={TRANSITION.enterCard}
          >
            <StepControls />
          </motion.div>
        </AnimatePresence>
      )}

      <KanbanBoard />

      {noMotion ? (
        <StepWidget />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`widget-${activeStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.enterCard}
          >
            <StepWidget />
          </motion.div>
        </AnimatePresence>
      )}

      <StateInspector entries={stateEntries} title="Drag & Drop State" />
    </div>
  );
}

// ── Metrics bar ─────────────────────────────────────────────────────

function MetricsBar() {
  const { metrics, isActive } = useDragDrop();
  return (
    <div className={styles.metricsBar} role="status" aria-label="Drag performance metrics">
      <MetricCard label="Pointer" value={metrics.pointerEvents} bad={metrics.pointerEvents > 200} good={metrics.pointerEvents <= 50} />
      <MetricCard label="Renders" value={metrics.renders} bad={metrics.renders > 100} good={metrics.renders <= 30} />
      <MetricCard label="rAF Skip" value={metrics.rafSkipped} bad={false} good={metrics.rafSkipped > 0} />
      <MetricCard label="Drop" value={metrics.dropTime} bad={false} good={metrics.dropTime !== "—"} />
    </div>
  );
}

function MetricCard({ label, value, bad, good }: { label: string; value: string | number; bad: boolean; good: boolean }) {
  const status = bad ? "bad" : good ? "good" : "neutral";
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-status={status}>{value}</div>
    </div>
  );
}

// ── Step controls ───────────────────────────────────────────────────

function StepControls() {
  const { activeStep } = useDragDrop();

  switch (activeStep) {
    case 4: return <PredictionChallenge question="Why use pointer events instead of mouse events for drag & drop?" options={["Pointer events have better browser support", "Pointer events unify mouse, touch, and pen input", "Pointer events fire faster than mouse events", "There is no difference — they are aliases"]} correctIndex={1} explanation="Pointer events are a superset — one API handles mouse, touch, and pen. With mouse events, you'd need separate touch event handlers. Pointer events also provide setPointerCapture(), which ensures events keep arriving even if the cursor leaves the element." />;
    case 5: return <PredictionGatedWidget question="You're building a Kanban board with rich cards (images, avatars, badges). Which preview strategy avoids layout jank during drag?" options={["DOM clone — cloneNode(true) follows cursor", "Canvas rasterization — toDataURL snapshot", "React portal — render a lightweight overlay component"]} correctIndex={2} explanation="A DOM clone copies the entire subtree including images and event listeners, which is expensive. Canvas rasterization requires CORS-clean images. A React portal renders a minimal preview component without cloning DOM — lightest on the main thread."><PreviewStrategyControls /></PredictionGatedWidget>;
    case 6: return <PredictionGatedWidget question="Three hit-test strategies: center-point containment, area overlap, and closest edge. Which works best for narrow columns?" options={["Center-point — simplest to implement", "Area overlap — handles edge cases", "Closest edge — degrades gracefully for thin targets"]} correctIndex={2} explanation="Narrow columns have small areas, making center containment miss often (the pointer center is rarely inside a thin column). Area overlap requires computing intersection rectangles. Closest edge measures distance to the nearest column edge — it always finds the nearest target regardless of column width."><HitTestControls /></PredictionGatedWidget>;
    case 7: return <PredictionChallenge question="When you reorder items, where should the state update happen?" options={["During drag — move items as pointer moves", "On drop — batch the splice at pointerup", "Optimistic — update immediately, reconcile on server response"]} correctIndex={1} explanation="Updating during drag causes O(n) re-renders per frame. Batch the splice on drop — the user sees a drop indicator during drag, and the state updates once. Server reconciliation comes later at scale." />;
    case 8: return <PredictionToggle feature="placeholder" label="Animated Placeholder" question="Without a drop indicator, how does the user know where the item will land?" options={["They guess based on cursor position", "The gap between items shows the insertion point", "They can't — it's a blind drop"]} correctIndex={2} explanation="Without a visual indicator, users have no spatial feedback about insertion position. The drop indicator (an animated line between items) makes the target slot explicit. This is the difference between frustrating and fluid drag & drop." />;
    case 9: return <PredictionChallenge question="Pointer events fire up to 120 times per second. How should you handle this?" options={["Process every event for accuracy", "Debounce with 100ms delay", "Throttle to rAF (16ms budget)"]} correctIndex={2} explanation="rAF throttling gives you one update per visual frame — the display can't show faster than 60fps anyway. Debouncing adds latency. Processing every event wastes CPU on invisible intermediate states." />;
    case 10: return <PredictionToggle feature="crossContainer" label="Cross-Container Transfer" question="When dragging an item from Column A to Column B, what index adjustment is needed?" options={["None — use the hit test index directly", "Subtract 1 if dropping below the dragged item", "Only adjust if source and target are the same column"]} correctIndex={2} explanation="Index adjustment is only needed within the SAME column — removing an item shifts indices below it. Cross-container moves don't need adjustment because the source and target arrays are independent." />;
    case 11: return <PredictionToggle feature="keyboardDrag" label="Keyboard Drag Mode" question="For keyboard-accessible drag & drop, what ARIA pattern is required?" options={["aria-grabbed + aria-dropeffect (old spec)", "aria-roledescription + aria-live announcements", "role='listbox' + aria-selected"]} correctIndex={1} explanation="aria-grabbed is deprecated. The current pattern: aria-roledescription='draggable item' labels the role, and aria-live regions announce grab/move/drop actions so screen reader users understand what changed." />;
    case 12: return <PredictionChallenge question="Touch devices fire touchstart/touchmove instead of pointer events. What's the critical difference?" options={["Touch has no hover state — no preview on long press", "Touch coordinates are in a different format", "Touch needs a delay to distinguish scroll from drag", "Touch events can't be cancelled"]} correctIndex={2} explanation="The 300ms delay problem: on touch, the browser waits to distinguish a tap (which might scroll) from a drag. You need a long-press threshold (~150ms) or touch-action: none on the draggable to disambiguate immediately. Pointer events unify this, but the delay logic is still yours." />;
    case 13: return <PredictionChallenge question="You want to constrain drag to a single axis. How do you implement it?" options={["Set pointer-events: none on the unconstrained axis", "Clamp the pointer coordinate: only update x OR y", "Use CSS transform constraints in the preview", "Detect initial drag direction, then lock that axis"]} correctIndex={3} explanation="Detect the dominant axis in the first 5px of movement, then lock to it. This feels natural — the user 'commits' to a direction. Simply clamping x or y forces a choice before the drag starts, which feels rigid." />;
    case 14: return <PredictionToggle feature="undo" label="Undo (Ctrl+Z)" question="For undo in a drag & drop system, what should each operation store?" options={["Full board snapshot before and after", "Just the item ID and its old position", "Source zone, target zone, item ID, old index, new index"]} correctIndex={2} explanation="Store the minimal diff: which item, where it came from (zone + index), where it went (zone + index). The inverse operation is a move from target back to source at the old index. Full snapshots waste memory; just the item ID loses the 'where from' information." />;
    case 15: return <PredictionChallenge question="Scaling to 10K draggable items across 50 columns. What's the first bottleneck?" options={["DOM nodes — 10K elements overwhelm the tree", "Event listeners — 10K pointer handlers", "State updates — splicing a 10K array on every drop", "All three, but DOM is worst"]} correctIndex={3} explanation="At 10K items: DOM creates 10K+ nodes (use virtualization per column), event listeners multiply (use event delegation on columns, not items), and state updates become expensive (use immutable splicing with structural sharing). DOM is worst because it's the rendering bottleneck — the browser must layout all 10K elements even if only 50 are visible." />;
    default: return null;
  }
}

function PredictionChallenge({ question, options, correctIndex, explanation }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className={styles.prediction}>
      <div className={styles.predictionQ}>{question}</div>
      <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.predictionOption}
            data-correct={revealed && i === correctIndex ? "true" : undefined}
            data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
            onClick={() => !revealed && setSelected(i)}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      {revealed && (
        <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
          {selected === correctIndex ? "✓ " : "✗ "}{explanation}
        </div>
      )}
    </div>
  );
}

function PredictionGatedWidget({ question, options, correctIndex, explanation, children }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className={styles.toggleStrip}>
      <div className={styles.prediction}>
        <div className={styles.predictionQ}>{question}</div>
        <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={styles.predictionOption}
              data-correct={revealed && i === correctIndex ? "true" : undefined}
              data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
              onClick={() => !revealed && setSelected(i)}
              disabled={revealed}
              role="radio"
              aria-checked={selected === i}
            >
              {opt}
            </button>
          ))}
        </div>
        {revealed && (
          <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
            {selected === correctIndex ? "✓ " : "✗ "}{explanation}
          </div>
        )}
      </div>
      {revealed && children}
    </div>
  );
}

function PredictionToggle({ feature, label, question, options, correctIndex, explanation }: {
  feature: string;
  label: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const { isActive, toggleFeature } = useDragDrop();
  const [selected, setSelected] = useState<number | null>(null);
  const on = isActive(feature);
  const revealed = selected !== null;
  const id = useId();

  return (
    <div className={styles.toggleStrip}>
      <div className={styles.toggleRow}>
        <span id={id} className={styles.toggleLabel}>{label}</span>
        <button type="button" className={styles.toggleButton} data-on={on ? "true" : undefined} onClick={() => toggleFeature(feature)} aria-pressed={on} aria-labelledby={id}>
          <span className={styles.toggleKnob} />
        </button>
      </div>
      {!on && (
        <div className={styles.prediction}>
          <div className={styles.predictionQ}>{question}</div>
          <div className={styles.predictionOptions} role="radiogroup" aria-label={question}>
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={styles.predictionOption}
                data-correct={revealed && i === correctIndex ? "true" : undefined}
                data-wrong={revealed && selected === i && i !== correctIndex ? "true" : undefined}
                onClick={() => !revealed && setSelected(i)}
                disabled={revealed}
                role="radio"
                aria-checked={selected === i}
              >
                {opt}
              </button>
            ))}
          </div>
          {revealed && (
            <div className={styles.predictionResult} data-correct={selected === correctIndex ? "true" : undefined}>
              {selected === correctIndex ? "✓ " : "✗ "}{explanation} Toggle the feature to verify.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewStrategyControls() {
  const { previewStrategy, setPreviewStrategy } = useDragDrop();
  return (
    <div className={styles.toggleStrip}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Drag Preview Strategy</span>
      </div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Drag preview strategy">
        {(["clone", "snapshot", "custom"] as PreviewStrategy[]).map(s => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={previewStrategy === s}
            className={styles.strategyOption}
            data-active={previewStrategy === s ? "true" : undefined}
            onClick={() => setPreviewStrategy(s)}
          >
            <span className={styles.strategyName}>{s}</span>
            <span className={styles.strategyDesc}>
              {s === "clone" && "DOM clone follows cursor"}
              {s === "snapshot" && "Canvas rasterization"}
              {s === "custom" && "React portal overlay"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HitTestControls() {
  const { hitTestStrategy, setHitTestStrategy } = useDragDrop();
  return (
    <div className={styles.toggleStrip}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Hit Test Algorithm</span>
      </div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Hit test algorithm">
        {(["center", "overlap", "closest"] as HitTestStrategy[]).map(s => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={hitTestStrategy === s}
            className={styles.strategyOption}
            data-active={hitTestStrategy === s ? "true" : undefined}
            onClick={() => setHitTestStrategy(s)}
          >
            <span className={styles.strategyName}>{s}</span>
            <span className={styles.strategyDesc}>
              {s === "center" && "Drop zone under pointer center"}
              {s === "overlap" && "Zone with most area overlap"}
              {s === "closest" && "Nearest zone edge distance"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════
// Step-specific widgets (below board)
// ═══════════════════════════════════════════════════════════════════

function StepWidget() {
  const { activeStep } = useDragDrop();

  switch (activeStep) {
    case 4: return <PointerEventWidget />;
    case 5: return <PreviewComparisonWidget />;
    case 6: return <HitTestVisualizerWidget />;
    case 7: return <ReorderStateWidget />;
    case 8: return <PlaceholderWidget />;
    case 9: return <RafWidget />;
    case 10: return <CrossContainerWidget />;
    case 11: return <KeyboardWidget />;
    case 12: return <TouchWidget />;
    case 13: return <ConstraintWidget />;
    case 14: return <UndoWidget />;
    case 15: return <ScaleWidget />;
    default: return null;
  }
}

function PointerEventWidget() {
  const { eventLog } = useDragDrop();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Pointer event lifecycle</div>
      <div className={styles.eventTimeline}>
        <div className={styles.lifecycleFlow}>
          {["pointerdown", "pointermove", "pointerup"].map((ev, i) => (
            <React.Fragment key={ev}>
              {i > 0 && <span className={styles.flowArrow}>→</span>}
              <span className={styles.lifecycleNode}>{ev}</span>
            </React.Fragment>
          ))}
          <span className={styles.flowArrow}>↓ (escape)</span>
          <span className={styles.lifecycleNode} data-cancel="true">cancel</span>
        </div>
      </div>
      <EventLog />
      <div className={styles.widgetNote}>
        setPointerCapture ensures events keep firing even if the cursor leaves the drag item. Without it, fast moves lose the drag.
      </div>
    </div>
  );
}

function EventLog() {
  const { eventLog } = useDragDrop();
  if (eventLog.length === 0) return null;
  return (
    <div className={styles.eventList} role="log" aria-live="polite" aria-label="Drag event log">
      {eventLog.slice(0, 6).map((e, i) => (
        <div key={`${e.time}-${i}`} className={styles.eventRow}>
          <span className={styles.eventTime}>{e.time}</span>
          <span className={styles.eventName}>{e.event}</span>
          <span className={styles.eventDetail}>{e.detail}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewComparisonWidget() {
  const { previewStrategy } = useDragDrop();
  const comparisons = [
    { strategy: "clone", pros: "Pixel-perfect, fast", cons: "Includes all children, can be heavy", perf: "O(1) DOM clone" },
    { strategy: "snapshot", pros: "Frozen visual, lightweight", cons: "canvas.toBlob is async, CORS issues", perf: "O(pixels) rasterize" },
    { strategy: "custom", pros: "Full control, themed", cons: "Must build from scratch", perf: "O(1) React portal" },
  ];
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Preview strategies</div>
      <div className={styles.comparisonGrid}>
        {comparisons.map(c => (
          <div key={c.strategy} className={styles.comparisonCard} data-active={previewStrategy === c.strategy ? "true" : undefined}>
            <div className={styles.comparisonName}>{c.strategy}</div>
            <div className={styles.comparisonRow}><span className={styles.comparisonLabel}>Pros</span><span>{c.pros}</span></div>
            <div className={styles.comparisonRow}><span className={styles.comparisonLabel}>Cons</span><span>{c.cons}</span></div>
            <div className={styles.comparisonRow}><span className={styles.comparisonLabel}>Perf</span><span>{c.perf}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HitTestVisualizerWidget() {
  const { hitTestStrategy } = useDragDrop();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Hit testing — {hitTestStrategy}</div>
      <div className={styles.hitTestDiagram}>
        <svg viewBox="0 0 200 80" className={styles.hitTestSvg} role="img" aria-label={`Hit test visualization: ${hitTestStrategy} algorithm`}>
          <rect x="10" y="10" width="60" height="60" rx="4" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <text x="40" y="44" textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">Zone A</text>
          <rect x="130" y="10" width="60" height="60" rx="4" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
          <text x="160" y="44" textAnchor="middle" fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-mono)">Zone B</text>

          {hitTestStrategy === "center" && (
            <>
              <circle cx="95" cy="40" r="4" fill="var(--color-accent)" />
              <line x1="95" y1="40" x2="40" y2="40" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
              <line x1="95" y1="40" x2="160" y2="40" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
              <text x="95" y="75" textAnchor="middle" fill="var(--color-text)" fontSize="7" fontFamily="var(--font-mono)">cursor center → nearest zone</text>
            </>
          )}
          {hitTestStrategy === "overlap" && (
            <>
              <rect x="55" y="20" width="40" height="40" rx="3" fill="var(--color-accent)" opacity="0.2" stroke="var(--color-accent)" strokeWidth="1" />
              <text x="95" y="75" textAnchor="middle" fill="var(--color-text)" fontSize="7" fontFamily="var(--font-mono)">overlap area → zone with most coverage</text>
            </>
          )}
          {hitTestStrategy === "closest" && (
            <>
              <circle cx="98" cy="40" r="3" fill="var(--color-accent)" />
              <line x1="98" y1="40" x2="70" y2="40" stroke="var(--color-success)" strokeWidth="1.5" />
              <line x1="98" y1="40" x2="130" y2="40" stroke="var(--color-error)" strokeWidth="1" strokeDasharray="3 2" />
              <text x="82" y="35" fill="var(--color-success)" fontSize="6" fontFamily="var(--font-mono)">28px</text>
              <text x="112" y="35" fill="var(--color-error)" fontSize="6" fontFamily="var(--font-mono)">32px</text>
              <text x="95" y="75" textAnchor="middle" fill="var(--color-text)" fontSize="7" fontFamily="var(--font-mono)">edge distance → smallest wins</text>
            </>
          )}
        </svg>
      </div>
      <div className={styles.widgetNote}>
        {hitTestStrategy === "center" && "Simple pointer check. Fast but fails for large items dragged by their edge — the center is far from the target."}
        {hitTestStrategy === "overlap" && "Computes intersection area. Accurate but expensive: O(zones × items) rect intersection math every frame."}
        {hitTestStrategy === "closest" && "Measures distance to each zone edge. Good balance — works for edge-dragged items without expensive overlap computation."}
      </div>
    </div>
  );
}

function ReorderStateWidget() {
  const ITEMS = ["A", "B", "C", "D", "E"];
  const [fromIdx, setFromIdx] = useState(1);
  const [toIdx, setToIdx] = useState(4);
  const adjusted = fromIdx < toIdx ? toIdx - 1 : toIdx;

  const afterRemove = ITEMS.filter((_, i) => i !== fromIdx);
  const afterInsert = [...afterRemove.slice(0, adjusted), ITEMS[fromIdx]!, ...afterRemove.slice(adjusted)];

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Reorder: splice strategy</div>
      <div className={styles.reorderControls}>
        <label className={styles.reorderLabel}>
          From:
          <select
            className={styles.reorderSelect}
            value={fromIdx}
            onChange={(e) => setFromIdx(Number(e.target.value))}
          >
            {ITEMS.map((item, i) => (
              <option key={i} value={i}>[{i}] {item}</option>
            ))}
          </select>
        </label>
        <label className={styles.reorderLabel}>
          To:
          <select
            className={styles.reorderSelect}
            value={toIdx}
            onChange={(e) => setToIdx(Number(e.target.value))}
          >
            {ITEMS.map((_, i) => (
              <option key={i} value={i}>index {i}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.reorderTimeline}>
        <div className={styles.reorderStep}>
          <span className={styles.reorderStepLabel}>Before:</span>
          <div className={styles.reorderRow}>
            {ITEMS.map((item, i) => (
              <span
                key={i}
                className={styles.reorderCell}
                data-active={i === fromIdx ? "true" : undefined}
              >
                {item}<sub className={styles.reorderSub}>{i}</sub>
              </span>
            ))}
          </div>
        </div>
        <div className={styles.reorderStep}>
          <span className={styles.reorderStepLabel}>Remove [{fromIdx}]:</span>
          <div className={styles.reorderRow}>
            {afterRemove.map((item, i) => (
              <span key={i} className={styles.reorderCell}>
                {item}<sub className={styles.reorderSub}>{i}</sub>
              </span>
            ))}
            <span className={styles.reorderCell} data-empty="true">_</span>
          </div>
        </div>
        <div className={styles.reorderStep}>
          <span className={styles.reorderStepLabel}>
            Insert at {fromIdx < toIdx ? (
              <><s style={{ opacity: 0.5 }}>{toIdx}</s> → <strong>{adjusted}</strong></>
            ) : (
              <strong>{adjusted}</strong>
            )}:
          </span>
          <div className={styles.reorderRow}>
            {afterInsert.map((item, i) => (
              <span
                key={i}
                className={styles.reorderCell}
                data-active={item === ITEMS[fromIdx] ? "true" : undefined}
              >
                {item}<sub className={styles.reorderSub}>{i}</sub>
              </span>
            ))}
          </div>
        </div>
      </div>

      {fromIdx < toIdx && (
        <div className={styles.widgetNote} style={{ color: "var(--diagram-layer-4)" }}>
          Index adjusted: {toIdx} → {adjusted}. Removing [{fromIdx}] shifted everything after it left by 1.
        </div>
      )}
      {fromIdx >= toIdx && (
        <div className={styles.widgetNote}>
          No adjustment needed — source is after target, so removal doesn&apos;t affect the target index.
        </div>
      )}
    </div>
  );
}

function PlaceholderWidget() {
  const { isActive } = useDragDrop();
  const on = isActive("placeholder");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Drop indicator</div>
      <div className={styles.placeholderDemo}>
        <div className={styles.placeholderCard} />
        <div className={styles.placeholderIndicator} data-visible={on ? "true" : undefined} />
        <div className={styles.placeholderCard} />
        <div className={styles.placeholderCard} />
      </div>
      <div className={styles.widgetNote}>
        {on
          ? "A 2px line with a subtle glow shows exactly where the item will land. Animates with transform for GPU acceleration."
          : "Without a visual indicator, users can't predict where the item will land. Toggle the feature to see the insertion line."}
      </div>
    </div>
  );
}

function RafWidget() {
  const { metrics, isActive } = useDragDrop();
  const on = isActive("rafThrottle");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>requestAnimationFrame throttle</div>
      <div className={styles.rafDiagram}>
        <div className={styles.rafRow}>
          <span className={styles.rafLabel}>Pointer events</span>
          <div className={styles.rafBar}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.rafTick} data-type="pointer" />
            ))}
          </div>
          <span className={styles.rafCount}>~120/s</span>
        </div>
        <div className={styles.rafRow}>
          <span className={styles.rafLabel}>Processed</span>
          <div className={styles.rafBar}>
            {Array.from({ length: on ? 4 : 8 }).map((_, i) => (
              <div key={i} className={styles.rafTick} data-type={on ? "raf" : "pointer"} />
            ))}
          </div>
          <span className={styles.rafCount}>{on ? "~60/s" : "~120/s"}</span>
        </div>
      </div>
      <div className={styles.widgetNote}>
        {on
          ? `rAF throttle active. ${metrics.rafSkipped} events skipped — visual output identical since display refreshes at 60fps.`
          : "Every pointer event triggers a state update. Toggle rAF to drop to one update per display frame."}
      </div>
    </div>
  );
}

function CrossContainerWidget() {
  const { isActive, zones } = useDragDrop();
  const on = isActive("crossContainer");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Cross-container transfer</div>
      <div className={styles.zoneStats}>
        {zones.map(z => (
          <div key={z.id} className={styles.zoneStat}>
            <span className={styles.zoneStatLabel}>{z.label}</span>
            <span className={styles.zoneStatCount}>{z.items.length}</span>
          </div>
        ))}
      </div>
      <div className={styles.widgetNote}>
        {on
          ? "Drag items between columns. The splice logic handles cross-zone transfers — no index adjustment needed when source ≠ target."
          : "Items are locked within their column. Toggle to enable cross-container drag."}
      </div>
    </div>
  );
}

function KeyboardWidget() {
  const { isActive } = useDragDrop();
  const on = isActive("keyboardDrag");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Keyboard accessibility (WAI-ARIA)</div>
      {on && (
        <div className={styles.kbdHints}>
          <span className={styles.kbdHint}><kbd>↑</kbd> <kbd>↓</kbd> reorder within column</span>
          <span className={styles.kbdHint}><kbd>←</kbd> <kbd>→</kbd> move to adjacent column</span>
          <span className={styles.kbdHint}><kbd>Space</kbd> toggle multi-select</span>
          <span className={styles.kbdHint}><kbd>Esc</kbd> cancel drag</span>
        </div>
      )}
      <div className={styles.widgetNote}>
        {on
          ? "aria-roledescription='draggable item' tells screen readers this is draggable. Arrow keys trigger moveItemKeyboard — same state update, different input."
          : "Without keyboard support, drag-and-drop is invisible to screen readers. Toggle to enable."}
      </div>
    </div>
  );
}

function TouchWidget() {
  const [holdPhase, setHoldPhase] = useState<"idle" | "holding" | "dragging">("idle");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const startHold = useCallback(() => {
    setHoldPhase("holding");
    setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);
      if (ms >= 300) {
        setHoldPhase("dragging");
        clearInterval(timerRef.current);
      }
    }, 16);
  }, []);

  const endHold = useCallback(() => {
    clearInterval(timerRef.current);
    setHoldPhase("idle");
    setElapsed(0);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Touch disambiguation</div>
      <div className={styles.touchTimeline}>
        <div className={styles.touchEvent} data-active={holdPhase !== "idle" ? "true" : undefined}><span className={styles.touchTime}>0ms</span> touchstart</div>
        <div className={styles.touchEvent} data-active={elapsed >= 150 ? "true" : undefined}><span className={styles.touchTime}>150ms</span> is it a scroll?</div>
        <div className={styles.touchEvent} data-decision="true" data-active={holdPhase === "dragging" ? "true" : undefined}><span className={styles.touchTime}>300ms</span> long-press → drag mode</div>
        <div className={styles.touchEvent} data-active={holdPhase === "dragging" ? "true" : undefined}><span className={styles.touchTime}>→</span> touchmove → update position</div>
      </div>
      <button
        type="button"
        className={styles.touchTestButton}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        aria-label="Hold to simulate touch drag delay"
      >
        {holdPhase === "idle" && "Hold to simulate touch"}
        {holdPhase === "holding" && `Holding... ${elapsed}ms`}
        {holdPhase === "dragging" && "Drag mode activated!"}
      </button>
      <div className={styles.widgetNote}>
        The 300ms long-press delay disambiguates drag from scroll. Without it, every vertical swipe starts a drag. Try holding the button above to feel the delay.
      </div>
    </div>
  );
}

function ConstraintWidget() {
  const [mode, setMode] = useState<"free" | "axisLock" | "bounds" | "gridSnap">("free");
  const [pos, setPos] = useState({ x: 80, y: 60 });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const GRID = 16;
  const BOX_W = 140;
  const BOX_H = 120;
  const DOT_SIZE = 24;

  const clamp = useCallback((raw: { x: number; y: number }, initial: { x: number; y: number }) => {
    let { x, y } = raw;
    if (mode === "axisLock") {
      const dx = Math.abs(x - initial.x);
      const dy = Math.abs(y - initial.y);
      if (dx > dy) y = initial.y; else x = initial.x;
    }
    if (mode === "bounds") {
      x = Math.max(0, Math.min(BOX_W - DOT_SIZE, x));
      y = Math.max(0, Math.min(BOX_H - DOT_SIZE, y));
    }
    if (mode === "gridSnap") {
      x = Math.round(x / GRID) * GRID;
      y = Math.round(y / GRID) * GRID;
    }
    return { x, y };
  }, [mode]);

  const initialPos = useRef(pos);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    initialPos.current = pos;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const raw = { x: e.clientX - rect.left - DOT_SIZE / 2, y: e.clientY - rect.top - DOT_SIZE / 2 };
    setPos(clamp(raw, initialPos.current));
  }, [clamp]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Constraints & snapping</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Constraint mode">
        {(["free", "axisLock", "bounds", "gridSnap"] as const).map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m}
            className={styles.strategyOption} data-active={mode === m ? "true" : undefined}
            onClick={() => setMode(m)}>
            <span className={styles.strategyName}>{m === "axisLock" ? "axis lock" : m === "gridSnap" ? "grid snap" : m}</span>
          </button>
        ))}
      </div>
      <div ref={boxRef} className={styles.constraintBox} style={{ width: BOX_W, height: BOX_H }}>
        {mode === "gridSnap" && Array.from({ length: Math.floor(BOX_W / GRID) + 1 }, (_, i) => (
          <div key={`v${i}`} className={styles.gridLine} style={{ left: i * GRID, top: 0, width: 1, height: BOX_H }} />
        )).concat(Array.from({ length: Math.floor(BOX_H / GRID) + 1 }, (_, i) => (
          <div key={`h${i}`} className={styles.gridLine} style={{ left: 0, top: i * GRID, width: BOX_W, height: 1 }} />
        )))}
        <div
          className={styles.constraintDot}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, width: DOT_SIZE, height: DOT_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={(e) => {
            const step = mode === "gridSnap" ? GRID : 8;
            const delta = { x: 0, y: 0 };
            if (e.key === "ArrowRight") delta.x = step;
            else if (e.key === "ArrowLeft") delta.x = -step;
            else if (e.key === "ArrowDown") delta.y = step;
            else if (e.key === "ArrowUp") delta.y = -step;
            else return;
            e.preventDefault();
            setPos(prev => clamp({ x: prev.x + delta.x, y: prev.y + delta.y }, prev));
          }}
          role="slider"
          aria-label="Draggable dot — use arrow keys or drag to move"
          aria-valuetext={`x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)}`}
          tabIndex={0}
        />
      </div>
      <div className={styles.widgetNote}>
        Drag the dot. {mode === "free" ? "No constraints — full freedom." : mode === "axisLock" ? "Locked to the dominant axis (horizontal or vertical)." : mode === "bounds" ? "Clamped to the container bounds." : "Snapping to 16px grid intervals."}
      </div>
    </div>
  );
}

function UndoWidget() {
  const { undoStack, undo, isActive } = useDragDrop();
  const on = isActive("undo");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Undo stack</div>
      {on && (
        <>
          <div className={styles.undoStack}>
            {undoStack.length === 0 ? (
              <div className={styles.undoEmpty}>No operations yet — drag an item to add to the stack</div>
            ) : (
              undoStack.map((op, i) => (
                <div key={`${op.itemId}-${i}`} className={styles.undoEntry}>
                  <span className={styles.undoIndex}>{i + 1}</span>
                  <span className={styles.undoOp}>{op.itemId}: {op.fromZone}[{op.fromIndex}] → {op.toZone}[{op.toIndex}]</span>
                </div>
              ))
            )}
          </div>
          {undoStack.length > 0 && (
            <button type="button" className={styles.undoButton} onClick={undo} aria-label="Undo last operation">
              ↩ Undo last
            </button>
          )}
        </>
      )}
      <div className={styles.widgetNote}>
        Each drop pushes a ReorderOp. Undo pops and applies the inverse. At scale, cap the stack (10 entries) and batch server syncs.
      </div>
    </div>
  );
}

function ScaleWidget() {
  const [itemCount, setItemCount] = useState(50);
  const [renderMs, setRenderMs] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.textContent = "";
    const start = performance.now();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < itemCount; i++) {
      const div = document.createElement("div");
      div.className = styles.scaleItem!;
      div.textContent = `Item ${i + 1}`;
      frag.appendChild(div);
    }
    container.appendChild(frag);
    requestAnimationFrame(() => {
      setRenderMs(Math.round((performance.now() - start) * 10) / 10);
    });
    return () => { container.textContent = ""; };
  }, [itemCount]);

  const domNodes = itemCount;
  const virtualizedNodes = Math.min(itemCount, 60);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Scaling to 10K items</div>
      <div className={styles.scaleSliderRow}>
        <label className={styles.scaleSliderLabel} htmlFor="scale-slider">Items:</label>
        <input
          id="scale-slider"
          type="range"
          min={50}
          max={5000}
          step={50}
          value={itemCount}
          onChange={(e) => setItemCount(Number(e.target.value))}
          className={styles.scaleSlider}
          aria-valuetext={`${itemCount} items`}
        />
        <span className={styles.scaleSliderValue}>{itemCount.toLocaleString()}</span>
      </div>
      <div className={styles.scaleMetrics}>
        <div className={styles.scaleMetric}>
          <span className={styles.scaleMetricValue} data-status={domNodes > 500 ? "warning" : domNodes > 2000 ? "error" : "good"}>{domNodes.toLocaleString()}</span>
          <span className={styles.scaleMetricLabel}>DOM nodes (naive)</span>
        </div>
        <div className={styles.scaleMetric}>
          <span className={styles.scaleMetricValue} data-status="good">{virtualizedNodes}</span>
          <span className={styles.scaleMetricLabel}>DOM nodes (virtualized)</span>
        </div>
        <div className={styles.scaleMetric}>
          <span className={styles.scaleMetricValue} data-status={renderMs > 16 ? "warning" : undefined}>{renderMs}ms</span>
          <span className={styles.scaleMetricLabel}>Render time</span>
        </div>
      </div>
      <div ref={containerRef} className={styles.scaleItemContainer} aria-hidden="true" />
      <div className={styles.scaleBarChart}>
        <div className={styles.scaleBar} data-type="naive" style={{ width: `${Math.min(100, (domNodes / 5000) * 100)}%` }}>
          <span>{domNodes.toLocaleString()} DOM</span>
        </div>
        <div className={styles.scaleBar} data-type="virtual" style={{ width: `${(virtualizedNodes / 5000) * 100}%` }}>
          <span>{virtualizedNodes} DOM</span>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Drag the slider — at 2K+ items, render time exceeds the 16ms frame budget. Virtualization caps DOM nodes at ~60 regardless of data size.
      </div>
    </div>
  );
}

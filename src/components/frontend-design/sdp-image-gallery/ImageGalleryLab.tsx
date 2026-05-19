"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  GalleryProvider,
  useGallery,
  SCOPE_ITEMS,
  RESPONSIVE_DATA,
  API_ENDPOINTS,
  DATA_MODELS,
  type GalleryImage,
  type LayoutMode,
  type DeviceType,
  type ImageFormat,
  type TypeDef,
} from "./gallery-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { IMAGE_GALLERY_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./ImageGalleryLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function ImageGalleryLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const noMotion = usePrefersReducedMotion();

  return (
    <GalleryProvider activeStep={activeStep}>
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
            <GalleryEvolution />
          )}
        </div>
      </div>
    </GalleryProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "G", "S", "L", "M",
  "IO", "B", "V",
  "R", "LB", "A11y",
  "E", "∞",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Build steps">
      {STEP_LABELS.map((label, i) => (
        <span
          key={i}
          role="listitem"
          className={styles.stepDot}
          data-active={i + 1 <= activeStep ? "true" : undefined}
          data-current={i + 1 === activeStep ? "true" : undefined}
          aria-current={i + 1 === activeStep ? "step" : undefined}
        >
          {label}
        </span>
      ))}
    </div>
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

const GALLERY_SCOPE_COMPLEXITY: Record<string, { loc: number; components: number }> = {
  layout: { loc: 120, components: 2 },
  upload: { loc: 150, components: 3 },
  scale: { loc: 180, components: 2 },
  mobile: { loc: 60, components: 1 },
  search: { loc: 90, components: 2 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useGallery();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter((s) => scopeEnabled.has(s.id))
      .map((s) => s.label.replace("?", ""))
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    let loc = 160;
    let components = 3;
    scopeEnabled.forEach(id => {
      const c = GALLERY_SCOPE_COMPLEXITY[id];
      if (c) { loc += c.loc; components += c.components; }
    });
    const grade = loc < 300 ? "Low" : loc < 500 ? "Medium" : "High";
    return { loc, components, grade };
  }, [scopeEnabled]);

  return (
    <div className={styles.planningPanel}>
      <h3 className={styles.sectionHeading}>Scope checklist</h3>
      <div className={styles.checklist}>
        {SCOPE_ITEMS.map((item) => (
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

// ── Step 2: API Design (tabbed: Endpoints | Types) ─────────────────

const IG_API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = IG_API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = IG_API_TABS[(idx + (e.key === "ArrowRight" ? 1 : IG_API_TABS.length - 1)) % IG_API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="ig-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="ig-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>
          Endpoints
        </button>
        <button type="button" role="tab" id="ig-tab-types" aria-selected={tab === "types"} aria-controls="ig-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>
          Types
        </button>
      </div>
      <div role="tabpanel" id={`ig-panel-${tab}`} aria-labelledby={`ig-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointCards /> : <TypeCards category="api" />}
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
          <div
            key={key}
            className={styles.endpointCard}
            data-expanded={isOpen ? "true" : undefined}
          >
            <button
              type="button"
              className={styles.endpointHeader}
              onClick={() => setExpanded(isOpen ? null : key)}
              aria-expanded={isOpen}
              aria-controls={`ig-ep-${key}`}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className={styles.endpointDetail} id={`ig-ep-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
                <p className={styles.endpointDesc}>{ep.description}</p>
                <div className={styles.endpointUsedBy}>{ep.usedBy}</div>
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

// ── Step 3: Component Architecture (tabbed: Diagram | Data Model) ───

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={IMAGE_GALLERY_ARCH_CONFIG} />
    </div>
  );
}

// ── TypeCards (used by Step 2's "Types" tab) ──────────────────────

const TYPE_CATEGORY_COLORS: Record<string, string> = {
  api: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-4)",
  props: "var(--diagram-layer-1)",
};

function TypeCards({ category }: { category: "api" | "state" | "props" }) {
  const types = DATA_MODELS.filter((t) => t.category === category);
  return (
    <div className={styles.typeCardGrid}>
      {types.map((t) => (
        <TypeCard key={t.name} typeDef={t} />
      ))}
    </div>
  );
}

function TypeCard({ typeDef }: { typeDef: TypeDef }) {
  const color = TYPE_CATEGORY_COLORS[typeDef.category];
  return (
    <div className={styles.typeCard} style={{ borderTopColor: color }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} style={{ color }}>
          {typeDef.category}
        </span>
      </div>
      {typeDef.extends && (
        <div className={styles.typeCardExtends}>
          extends <span>{typeDef.extends}</span>
        </div>
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
// Gallery evolution (steps 4-15): persistent gallery + step widgets
// ═══════════════════════════════════════════════════════════════════

function GalleryEvolution() {
  const { activeStep, stateEntries } = useGallery();
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

      <PersistentGallery />

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

      <StateInspector entries={stateEntries} title="Gallery State" />
    </div>
  );
}

// ── Metrics bar ─────────────────────────────────────────────────────

function MetricsBar() {
  const { activeStep, metrics } = useGallery();
  if (activeStep < 4) return null;

  return (
    <div className={styles.metricsBar} role="status" aria-label="Simulated performance metrics">
      <MetricCard label="DOM" value={metrics.domNodes} bad={metrics.domNodes > 50} good={metrics.domNodes <= 25} />
      <MetricCard label="Network" value={metrics.networkReqs} bad={metrics.networkReqs > 50} good={metrics.networkReqs <= 20} />
      <MetricCard label="Memory" value={`${metrics.memoryMB}MB`} bad={metrics.memoryMB > 10} good={metrics.memoryMB <= 2} />
      <MetricCard label="CLS" value={metrics.cls.toFixed(2)} bad={metrics.cls > 0.1} good={metrics.cls <= 0.05} />
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

// ── Step-specific controls (above gallery) ──────────────────────────

function StepControls() {
  const { activeStep } = useGallery();

  switch (activeStep) {
    case 4: return <StepMessage text="20 images. Everything works. All metrics green." />;
    case 5: return <PredictionChallenge question="Same code, but now 500 images instead of 20. Which metric degrades most?" options={["DOM nodes — 500 divs overload the tree", "Network — 500 concurrent HTTP requests", "Memory — 500 decoded bitmaps in RAM", "All three degrade roughly equally"]} correctIndex={3} explanation="Every metric degrades linearly with image count. DOM, network, and memory all scale at O(n) because there's no lazy loading, virtualization, or budget. That's the point — naive approaches break at scale everywhere simultaneously." />;
    case 6: return <ReserveSpaceToggle />;
    case 7: return <LayoutModeToggle />;
    case 8: return <PredictionToggle feature="lazyLoading" label="Lazy Loading (IntersectionObserver)" question="With lazy loading, how many images load initially?" options={["All 500 — lazy just defers decode", "~20 — only viewport images", "0 — nothing loads until scroll"]} correctIndex={1} explanation="IntersectionObserver fires for elements currently in (or near) the viewport. With rootMargin: 100px, roughly 20 images load immediately. The other 480 wait until you scroll near them." />;
    case 9: return <PredictionToggle feature="placeholders" label="Blur Placeholders (LQIP)" question="What does a blur placeholder prevent while images load?" options={["Layout shift — reserves space", "White flash — shows color intent", "Both — reserves space AND shows color"]} correctIndex={2} explanation="Blur placeholders (LQIP) serve two purposes: they reserve the exact aspect-ratio space (preventing CLS) AND show a blurred color preview so the page doesn't flash white. The blur is a tiny ~40-byte inline data URL decoded from the BlurHash." />;
    case 10: return <PredictionToggle feature="virtualization" label="Virtualization (DOM recycling)" question="Virtualization removes off-screen DOM nodes. What's the trade-off?" options={["Scroll jank — recycling takes time", "No Cmd+F — browser can't search invisible text", "Memory still high — images stay decoded"]} correctIndex={1} explanation="The browser's Find (Cmd+F) only searches the live DOM. Virtualized content doesn't exist in the tree, so it's invisible to native search. This is the fundamental trade-off of DOM recycling." />;
    case 11: return <ResponsiveControls />;
    case 12: return <PredictionChallenge question="The grid shows 200px thumbnails. User clicks one to open a lightbox. What resolution should it load?" options={["Same 200px — already cached, instant", "Always 1200px — one size fits all", "Viewport-dependent — 800px on mobile, 1600px on 4K", "Original resolution — maximum quality"]} correctIndex={2} explanation="Serving viewport-dependent sizes avoids wasting bandwidth on mobile (800px is sharp enough) and avoids blurriness on 4K displays (1600px+). The srcset pattern: the lightbox uses a separate API call with width hints, not the thumbnail URL." />;
    case 13: return <PredictionChallenge question="The lightbox is open. User presses Tab. Without a focus trap, what happens?" options={["Nothing — modal has no focusable elements", "Focus moves to the next lightbox button (prev/next/close)", "Focus jumps behind the overlay to the gallery grid", "Focus goes to the browser address bar"]} correctIndex={2} explanation="Without a focus trap, Tab follows the DOM order and lands on elements behind the overlay — completely invisible to sighted users and confusing for screen readers. The fix: intercept Tab, cycle focus among prev/next/close buttons, and never let it escape the modal." />;
    case 14: return <FeatureToggleControl feature="errorHandling" label="Simulate Network Errors" />;
    case 15: return <ScaleControls />;
    default: return null;
  }
}

function StepMessage({ text, severity }: { text: string; severity?: "warning" }) {
  return (
    <div className={styles.stepMessage} data-severity={severity}>
      {text}
    </div>
  );
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

function PredictionToggle({ feature, label, question, options, correctIndex, explanation }: {
  feature: string;
  label: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const { isActive, toggleFeature } = useGallery();
  const [selected, setSelected] = useState<number | null>(null);
  const on = isActive(feature);
  const revealed = selected !== null;

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label={label} on={on} onToggle={() => toggleFeature(feature)} />
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

function ReserveSpaceToggle() {
  const { isActive, toggleFeature } = useGallery();
  const on = isActive("reserveSpace");
  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Reserve aspect-ratio space" on={on} onToggle={() => toggleFeature("reserveSpace")} />
      <div className={styles.toggleImpact}>
        CLS: <strong data-status={on ? "good" : "bad"}>{on ? "0.08" : "0.45"}</strong>
        {on ? " — space reserved before images arrive" : " — images pop in and shove content"}
      </div>
    </div>
  );
}

function LayoutModeToggle() {
  const { layoutMode, setLayoutMode } = useGallery();
  return (
    <div className={styles.layoutModes} role="radiogroup" aria-label="Layout mode">
      {(["uniform", "css-columns", "css-grid"] as LayoutMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={layoutMode === mode}
          className={styles.layoutModeButton}
          data-active={layoutMode === mode ? "true" : undefined}
          onClick={() => setLayoutMode(mode)}
        >
          {mode === "uniform" && "Uniform"}
          {mode === "css-columns" && "CSS Columns"}
          {mode === "css-grid" && "CSS Grid"}
        </button>
      ))}
    </div>
  );
}

function FeatureToggleControl({ feature, label }: { feature: string; label: string }) {
  const { isActive, toggleFeature } = useGallery();
  const on = isActive(feature);
  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label={label} on={on} onToggle={() => toggleFeature(feature)} />
    </div>
  );
}

function ResponsiveControls() {
  const { deviceType, setDeviceType, imageFormat, setImageFormat } = useGallery();
  return (
    <div className={styles.responsiveControls}>
      <div className={styles.responsiveSelect}>
        <span className={styles.responsiveSelectLabel}>Device</span>
        <div className={styles.responsiveSelectGroup} role="radiogroup" aria-label="Device type">
          {(["mobile", "tablet", "desktop"] as DeviceType[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={deviceType === d}
              className={styles.responsiveOption}
              data-active={deviceType === d ? "true" : undefined}
              onClick={() => setDeviceType(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.responsiveSelect}>
        <span className={styles.responsiveSelectLabel}>Format</span>
        <div className={styles.responsiveSelectGroup} role="radiogroup" aria-label="Image format">
          {(["jpeg", "webp", "avif"] as ImageFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={imageFormat === f}
              className={styles.responsiveOption}
              data-active={imageFormat === f ? "true" : undefined}
              onClick={() => setImageFormat(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScaleControls() {
  const { scaleLevel, setScaleLevel, paginationMode, setPaginationMode } = useGallery();
  const scaleLabels: Record<number, string> = { 100: "100", 1000: "1K", 10000: "10K", 100000: "100K" };

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value);
      const levels = [100, 1000, 10000, 100000];
      const closest = levels.reduce((prev, curr) =>
        Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev
      );
      setScaleLevel(closest);
    },
    [setScaleLevel]
  );

  return (
    <div className={styles.scaleControls}>
      <div className={styles.scaleSliderHeader}>
        <span className={styles.scaleSliderLabel}>Image Count</span>
        <span className={styles.scaleSliderValue}>{scaleLabels[scaleLevel] ?? scaleLevel.toLocaleString()}</span>
      </div>
      <input
        type="range"
        className={styles.scaleSliderInput}
        min={100}
        max={100000}
        step={1}
        value={scaleLevel}
        onChange={handleSlider}
        aria-label="Scale level"
      />
      <div className={styles.scaleMarks}>
        <span>100</span><span>1K</span><span>10K</span><span>100K</span>
      </div>
      <div className={styles.paginationToggle} role="radiogroup" aria-label="Pagination mode">
        <button
          type="button"
          role="radio"
          aria-checked={paginationMode === "infinite"}
          className={styles.layoutModeButton}
          data-active={paginationMode === "infinite" ? "true" : undefined}
          onClick={() => setPaginationMode("infinite")}
        >
          Infinite Scroll
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={paginationMode === "pages"}
          className={styles.layoutModeButton}
          data-active={paginationMode === "pages" ? "true" : undefined}
          onClick={() => setPaginationMode("pages")}
        >
          Page Buttons
        </button>
      </div>
    </div>
  );
}

// ── Toggle row ──────────────────────────────────────────────────────

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className={styles.toggleRow}>
      <span id={id} className={styles.toggleLabel}>{label}</span>
      <button type="button" className={styles.toggleButton} data-on={on ? "true" : undefined} onClick={onToggle} aria-pressed={on} aria-labelledby={id}>
        <span className={styles.toggleKnob} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Persistent gallery (steps 4+)
// ═══════════════════════════════════════════════════════════════════

function PersistentGallery() {
  const {
    activeStep, images, imageCount, loadedSet, errorSet, retryImage,
    layoutMode, isActive, lightboxOpen, lightboxIndex,
    openLightbox, closeLightbox, lightboxNext, lightboxPrev,
    focusedElement, setFocusedElement, a11yAnnouncement,
  } = useGallery();

  const containerRef = useRef<HTMLDivElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const showMasonry = activeStep >= 7 && layoutMode !== "uniform";
  const showIndex = activeStep === 7;
  const showLazy = isActive("lazyLoading");
  const showPlaceholders = isActive("placeholders");
  const showVirtual = isActive("virtualization");
  const showReserveSpace = isActive("reserveSpace");
  const canOpenLightbox = activeStep >= 12;
  const showErrors = isActive("errorHandling");
  const PICSUM_LIMIT = 48;

  const displayImages = useMemo(() => {
    if (showVirtual) return images.slice(0, 24);
    if (activeStep === 7) return images.slice(0, 36);
    return images;
  }, [images, showVirtual, activeStep]);

  const gridClass = useMemo(() => {
    if (!showMasonry) return styles.uniformGrid;
    if (layoutMode === "css-columns") return styles.cssColumnsGrid;
    return styles.cssGridMasonry;
  }, [showMasonry, layoutMode]);

  const btnRefs = useMemo(() => ({
    prev: prevBtnRef, next: nextBtnRef, close: closeBtnRef,
  }), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "Tab") {
        e.preventDefault();
        const order: ("prev" | "next" | "close")[] = ["prev", "next", "close"];
        const idx = order.indexOf(focusedElement);
        const nextIdx = e.shiftKey
          ? (idx - 1 + order.length) % order.length
          : (idx + 1) % order.length;
        const nextEl = order[nextIdx];
        setFocusedElement(nextEl);
        btnRefs[nextEl].current?.focus();
      }
    },
    [lightboxOpen, closeLightbox, lightboxNext, lightboxPrev, focusedElement, setFocusedElement, btnRefs]
  );

  useEffect(() => {
    if (lightboxOpen) closeBtnRef.current?.focus();
  }, [lightboxOpen]);

  const currentImage = images[lightboxIndex];

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Image gallery"
    >
      <div className={styles.galleryContainer}>
        <div className={styles.galleryScroll}>
          <div className={gridClass}>
            {displayImages.map((img) => {
              const isLoaded = loadedSet.has(img.id);
              const hasError = showErrors && errorSet.has(img.id);
              const rowSpan = layoutMode === "css-grid" && showMasonry
                ? Math.ceil(img.height / 20) + 1
                : undefined;
              const thumbW = 200;
              const thumbH = !showMasonry ? 200 : Math.round(thumbW / img.aspectRatio);
              const picsumUrl = `https://picsum.photos/seed/g${img.index}/${thumbW}/${thumbH}`;

              const isClickable = canOpenLightbox && !hasError;
              return (
                <div
                  key={img.id}
                  className={styles.imageCard}
                  style={{
                    aspectRatio: !showMasonry ? "1" : showReserveSpace ? `${img.width}/${img.height}` : undefined,
                    minHeight: !showMasonry ? "28px" : showReserveSpace ? undefined : "40px",
                    gridRow: rowSpan ? `span ${rowSpan}` : undefined,
                  }}
                  role={isClickable && !hasError ? "button" : undefined}
                  tabIndex={isClickable && !hasError ? 0 : undefined}
                  aria-label={isClickable && !hasError ? `Open image ${img.index + 1} in lightbox` : undefined}
                  onClick={isClickable && !hasError ? () => openLightbox(img.index) : undefined}
                  onKeyDown={isClickable && !hasError ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(img.index); } } : undefined}
                >
                  {hasError ? (
                    <div className={styles.imageCardError} onClick={(e) => { e.stopPropagation(); retryImage(img.id); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); retryImage(img.id); }}} role="button" tabIndex={0} aria-label={`Retry loading image ${img.index + 1}`}><span>⟳ Retry</span></div>
                  ) : !isLoaded && showLazy ? (
                    showPlaceholders ? (
                      <div className={styles.imageCardPlaceholder}>
                        <div
                          className={styles.imageCardBlurFill}
                          style={{ background: `oklch(45% 0.12 ${img.hue})` }}
                        />
                      </div>
                    ) : (
                      <div className={styles.imageCardPending} />
                    )
                  ) : img.index < PICSUM_LIMIT ? (
                    <div className={styles.imageCardInner}>
                      <img
                        src={picsumUrl}
                        alt={`Gallery image ${img.index + 1}`}
                        className={styles.imageCardImg}
                        loading="lazy"
                      />
                      {showIndex && (
                        <span className={styles.imageCardIndex}>{img.index + 1}</span>
                      )}
                    </div>
                  ) : (
                    <div className={styles.imageCardInner}>
                      <div
                        className={styles.imageCardFill}
                        style={{ background: `oklch(50% 0.12 ${img.hue})` }}
                      />
                      {showIndex && (
                        <span className={styles.imageCardIndex}>{img.index + 1}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* IO viewport band overlay (step 8) */}
        {activeStep === 8 && isActive("lazyLoading") && (
          <div className={styles.ioViewportBand}>
            <div className={styles.ioLabel}>IntersectionObserver viewport</div>
            <div className={styles.ioRootMargin}>rootMargin: 100px</div>
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && currentImage && canOpenLightbox && (
        <div className={styles.lightboxOverlay} role="dialog" aria-modal="true" aria-label={`Image ${lightboxIndex + 1} of ${images.length}`} onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}>
          <div className={styles.lightboxInner}>
            <div className={styles.lightboxContent}>
              <img
                src={`https://picsum.photos/seed/g${currentImage.index}/800/${Math.round(800 / currentImage.aspectRatio)}`}
                alt={`Gallery image ${currentImage.index + 1}`}
                className={styles.lightboxImg}
              />
            </div>
            <div className={styles.lightboxControls}>
              <button ref={prevBtnRef} type="button" className={styles.lightboxButton} data-focused={focusedElement === "prev" ? "true" : undefined} onClick={lightboxPrev} aria-label="Previous image">Prev</button>
              <button ref={nextBtnRef} type="button" className={styles.lightboxButton} data-focused={focusedElement === "next" ? "true" : undefined} onClick={lightboxNext} aria-label="Next image">Next</button>
              <button ref={closeBtnRef} type="button" className={styles.lightboxButton} data-focused={focusedElement === "close" ? "true" : undefined} onClick={closeLightbox} aria-label="Close lightbox">Close</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.srOnly} aria-live="assertive" role="status">
        {a11yAnnouncement}
      </div>

      {activeStep === 13 && a11yAnnouncement && (
        <div className={styles.a11yPanel}>
          <div className={styles.a11yPanelLabel}>Screen Reader</div>
          <div className={styles.a11yPanelText}>{a11yAnnouncement}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step-specific widgets (below gallery)
// ═══════════════════════════════════════════════════════════════════

function StepWidget() {
  const { activeStep } = useGallery();

  switch (activeStep) {
    case 5: return <ScaleBreakWidget />;
    case 6: return <CLSExplainerWidget />;
    case 7: return <ReadingOrderWidget />;
    case 8: return <IOExplainerWidget />;
    case 9: return <PlaceholderExplainerWidget />;
    case 10: return <DOMWindowWidget />;
    case 11: return <FormatComparisonWidget />;
    case 12: return null;
    case 13: return <FocusTrapWidget />;
    case 14: return <ErrorStatesWidget />;
    case 15: return <CWVGauges />;
    default: return null;
  }
}

// ── Step 5: Scale break ─────────────────────────────────────────────

function ScaleBreakWidget() {
  const { metrics } = useGallery();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>What broke</div>
      <div className={styles.breakdownGrid}>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownValue} data-status="bad">{metrics.domNodes}</span>
          <span className={styles.breakdownLabel}>DOM nodes (all in tree)</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownValue} data-status="bad">{metrics.networkReqs}</span>
          <span className={styles.breakdownLabel}>concurrent requests</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownValue} data-status="bad">{metrics.memoryMB}MB</span>
          <span className={styles.breakdownLabel}>image memory</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownValue} data-status="bad">{metrics.lcpMs}ms</span>
          <span className={styles.breakdownLabel}>LCP (target &lt;2500)</span>
        </div>
      </div>
      <p className={styles.widgetNote}>
        Same code as step 4. Only the image count changed. Every metric degraded linearly.
      </p>
    </div>
  );
}

// ── Step 6: CLS explainer ───────────────────────────────────────────

function CLSExplainerWidget() {
  const { isActive } = useGallery();
  const reserved = isActive("reserveSpace");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Cumulative Layout Shift</div>
      <div className={styles.clsMeter}>
        <div className={styles.clsTrack}>
          <div
            className={styles.clsFill}
            style={{
              width: reserved ? "8%" : "45%",
              background: reserved ? "var(--color-success)" : "var(--color-error)",
            }}
          />
        </div>
        <div className={styles.clsLabels}>
          <span>0</span>
          <span style={{ left: "10%" }}>0.1 good</span>
          <span style={{ left: "25%" }}>0.25 poor</span>
          <span>1.0</span>
        </div>
      </div>
      <p className={styles.widgetNote}>
        {reserved
          ? "aspect-ratio CSS property reserves space before images load. No content shifting."
          : "Without space reservation, every image arrival shifts content below it."}
      </p>
    </div>
  );
}

// ── Step 7: Reading order ───────────────────────────────────────────

function ReadingOrderWidget() {
  const { layoutMode } = useGallery();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Reading order</div>
      {layoutMode === "uniform" && (
        <p className={styles.widgetNote}>Uniform grid: left-to-right, row by row. Correct order, but all images are the same height — aspect ratios are lost.</p>
      )}
      {layoutMode === "css-columns" && (
        <p className={styles.widgetNote}>
          <strong style={{ color: "var(--color-error)" }}>Wrong order.</strong> CSS Columns fill top-to-bottom within each column. Items 1–12 are in column 1, not row 1. Screen readers traverse DOM order, not visual order.
        </p>
      )}
      {layoutMode === "css-grid" && (
        <p className={styles.widgetNote}>
          <strong style={{ color: "var(--color-success)" }}>Correct order + natural aspect ratios.</strong> CSS Grid with variable row-span places items left-to-right. Each card spans a computed number of 8px row units based on its aspect ratio.
        </p>
      )}
    </div>
  );
}

// ── Step 8: IO explainer ────────────────────────────────────────────

function IOExplainerWidget() {
  const { isActive, metrics, imageCount } = useGallery();
  const on = isActive("lazyLoading");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>IntersectionObserver</div>
      <div className={styles.ioDiagram}>
        <div className={styles.ioRow}>
          <div className={styles.ioDot} data-state="loaded" />
          <span>Loaded ({on ? metrics.networkReqs : imageCount})</span>
        </div>
        <div className={styles.ioRow}>
          <div className={styles.ioDot} data-state="pending" />
          <span>Pending ({on ? imageCount - metrics.networkReqs : 0})</span>
        </div>
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "IO fires callbacks only when elements cross the rootMargin threshold — no per-frame cost."
          : "All images fetched at mount. Toggle lazy loading ON to see the difference."}
      </p>
    </div>
  );
}

// ── Step 9: Placeholder explainer ───────────────────────────────────

function PlaceholderExplainerWidget() {
  const { isActive } = useGallery();
  const on = isActive("placeholders");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Progressive disclosure</div>
      <div className={styles.placeholderDemo}>
        <div className={styles.placeholderStage}>
          <div className={styles.placeholderBox} data-state="pending" />
          <span>Pending</span>
        </div>
        <span className={styles.placeholderArrow}>→</span>
        <div className={styles.placeholderStage}>
          <div className={styles.placeholderBox} data-state={on ? "blur" : "empty"} />
          <span>{on ? "Blur" : "Empty"}</span>
        </div>
        <span className={styles.placeholderArrow}>→</span>
        <div className={styles.placeholderStage}>
          <div className={styles.placeholderBox} data-state="loaded" />
          <span>Loaded</span>
        </div>
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "Blur → sharp is a UX contract. The user sees content is arriving."
          : "Without placeholders, images pop in from nothing — jarring and unpredictable."}
      </p>
    </div>
  );
}

// ── Step 10: DOM window ─────────────────────────────────────────────

function DOMWindowWidget() {
  const { isActive, imageCount, metrics } = useGallery();
  const on = isActive("virtualization");
  const total = Math.min(imageCount, 60);
  const windowSize = on ? Math.min(20, total) : total;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>DOM window</div>
      <div className={styles.domStrip}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={styles.domDot}
            data-active={i < windowSize ? "true" : undefined}
          />
        ))}
      </div>
      <div className={styles.domStripLegend}>
        <span><span className={styles.domDot} data-active="true" style={{ display: "inline-block" }} /> In DOM ({windowSize})</span>
        {on && <span><span className={styles.domDot} style={{ display: "inline-block" }} /> Virtual ({total - windowSize})</span>}
      </div>
      <p className={styles.widgetNote}>
        {on
          ? `Only ${windowSize} nodes exist in the DOM. The rest are height values in an offset table — zero rendering cost.`
          : `All ${total} nodes are in the DOM. Toggle virtualization to see the window shrink.`}
      </p>
    </div>
  );
}

// ── Step 11: Format comparison ──────────────────────────────────────

function FormatComparisonWidget() {
  const { deviceType, imageFormat } = useGallery();
  const data = RESPONSIVE_DATA[deviceType][imageFormat];
  const jpegData = RESPONSIVE_DATA[deviceType]["jpeg"];
  const savings = jpegData.sizeKB > 0
    ? Math.round((1 - data.sizeKB / jpegData.sizeKB) * 100)
    : 0;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Format comparison</div>
      <div className={styles.responsiveStats}>
        <div className={styles.responsiveStat}>
          <div className={styles.responsiveStatValue}>{data.sizeKB} KB</div>
          <div className={styles.responsiveStatLabel}>File size</div>
        </div>
        <div className={styles.responsiveStat}>
          <div className={styles.responsiveStatValue}>{data.decodeMs} ms</div>
          <div className={styles.responsiveStatLabel}>Decode time</div>
        </div>
        <div className={styles.responsiveStat}>
          <div className={styles.responsiveStatValue}>{savings > 0 ? `-${savings}%` : "baseline"}</div>
          <div className={styles.responsiveStatLabel}>vs JPEG</div>
        </div>
      </div>
      <p className={styles.widgetNote}>
        AVIF is smallest but decodes slower. On low-end mobile, decode can block the main thread — use img.decode() to keep the UI responsive.
      </p>
    </div>
  );
}

// ── Step 13: Focus trap ─────────────────────────────────────────────

function FocusTrapWidget() {
  const { focusedElement, lightboxOpen } = useGallery();
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Focus management (WCAG 2.4.3)</div>
      {lightboxOpen && (
        <div className={styles.focusTrap}>
          Focus: <strong>{focusedElement}</strong>
        </div>
      )}
      <div className={styles.kbdHints}>
        <span className={styles.kbdHint}><kbd>Tab</kbd> cycle focus</span>
        <span className={styles.kbdHint}><kbd>Esc</kbd> close</span>
        <span className={styles.kbdHint}><kbd>←</kbd> <kbd>→</kbd> navigate</span>
      </div>
      <p className={styles.widgetNote}>
        {lightboxOpen
          ? "Tab is trapped inside the modal. Focus cannot escape to background content."
          : "Click an image to open the lightbox and test the focus trap."}
      </p>
    </div>
  );
}

// ── Step 14: Error states ───────────────────────────────────────────

function ErrorStatesWidget() {
  const { isActive, errorSet, imageCount } = useGallery();
  const on = isActive("errorHandling");
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Error handling</div>
      <div className={styles.errorStateMachine}>
        {["pending", "loading", "loaded"].map((state, i) => (
          <React.Fragment key={state}>
            {i > 0 && <span className={styles.placeholderArrow}>→</span>}
            <span className={styles.stateNode}>{state}</span>
          </React.Fragment>
        ))}
        <span className={styles.placeholderArrow} style={{ transform: "rotate(90deg)", display: "block", textAlign: "center" }}>↓</span>
        <span className={styles.stateNode} data-error="true">failed → retry</span>
      </div>
      {on && (
        <p className={styles.widgetNote}>
          {errorSet.size} of {imageCount} images failed. Click any red card to retry — it removes the image from the error set and re-renders as loaded.
        </p>
      )}
    </div>
  );
}

// ── Step 15: CWV gauges ─────────────────────────────────────────────

function CWVGauges() {
  const { scaleLevel, paginationMode } = useGallery();

  const lcp = scaleLevel <= 100 ? { v: 1200, pct: 30, c: "var(--color-success)" }
    : scaleLevel <= 1000 ? { v: 1800, pct: 50, c: "var(--color-warning)" }
    : scaleLevel <= 10000 ? { v: 2500, pct: 70, c: "var(--color-error)" }
    : { v: 3800, pct: 95, c: "var(--color-error)" };

  const cls = scaleLevel <= 1000 ? { v: 0.02, pct: 10, c: "var(--color-success)" }
    : scaleLevel <= 10000 ? { v: 0.08, pct: 35, c: "var(--color-warning)" }
    : { v: 0.18, pct: 60, c: "var(--color-error)" };

  const inp = scaleLevel <= 100 ? { v: 45, pct: 15, c: "var(--color-success)" }
    : scaleLevel <= 1000 ? { v: 120, pct: 40, c: "var(--color-warning)" }
    : scaleLevel <= 10000 ? { v: 280, pct: 70, c: "var(--color-error)" }
    : { v: 520, pct: 95, c: "var(--color-error)" };

  const insight = scaleLevel <= 100 ? null
    : scaleLevel <= 1000 ? `Lazy loading essential. ${((scaleLevel * 85) / 1024).toFixed(0)}MB naive payload.`
    : scaleLevel <= 10000 ? `Need server-side cursor pagination. Offset table: ${((scaleLevel * 8) / 1024).toFixed(0)}KB.`
    : "Need LRU cache (200MB budget). Evict images scrolled out of view.";

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Core Web Vitals at {scaleLevel.toLocaleString()} images</div>
      <div className={styles.gaugeRow}>
        <GaugeCard label="LCP" value={`${lcp.v}ms`} pct={lcp.pct} color={lcp.c} />
        <GaugeCard label="CLS" value={String(cls.v)} pct={cls.pct} color={cls.c} />
        <GaugeCard label="INP" value={`${inp.v}ms`} pct={inp.pct} color={inp.c} />
      </div>
      {insight && <p className={styles.widgetNote}>{insight}</p>}
      <p className={styles.widgetNote}>
        Pagination: <strong>{paginationMode === "infinite" ? "infinite scroll" : "page buttons"}</strong>
        {paginationMode === "infinite"
          ? " — seamless browsing, but scroll position is hard to restore."
          : " — each page has a URL, back button works predictably."}
      </p>
    </div>
  );
}

function GaugeCard({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeLabel}>{label}</div>
      <div className={styles.gaugeBar}>
        <div className={styles.gaugeFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.gaugeValue} style={{ color }}>{value}</div>
    </div>
  );
}

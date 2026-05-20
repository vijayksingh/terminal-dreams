"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  MicrofrontendProvider,
  useMicrofrontend,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  MFE_TEAMS,
  type TypeDef,
  type IsolationMode,
  type RoutingStrategy,
} from "./microfrontend-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { MICROFRONTEND_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./MicrofrontendLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function MicrofrontendLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const noMotion = usePrefersReducedMotion();

  return (
    <MicrofrontendProvider activeStep={activeStep}>
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
            <BuildingView />
          )}
        </div>
      </div>
    </MicrofrontendProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "Scp", "API", "Arc",
  "Shl", "Rmt", "Shd", "Evt",
  "Iso", "Rte", "CSS",
  "Err", "Ver", "Prf",
  "Tst", "Ful",
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

const MFE_SCOPE_COMPLEXITY: Record<string, { loc: number; components: number }> = {
  moduleFederation: { loc: 140, components: 3 },
  sharedDeps: { loc: 100, components: 2 },
  eventBus: { loc: 120, components: 2 },
  independentDeploy: { loc: 80, components: 1 },
  routingHandoff: { loc: 90, components: 2 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useMicrofrontend();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter(s => scopeEnabled.has(s.id))
      .map(s => s.label)
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    let loc = 200;
    let components = 4;
    scopeEnabled.forEach(id => {
      const c = MFE_SCOPE_COMPLEXITY[id];
      if (c) { loc += c.loc; components += c.components; }
    });
    const grade = loc < 350 ? "Low" : loc < 550 ? "Medium" : "High";
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

const MFE_API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = MFE_API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = MFE_API_TABS[(idx + (e.key === "ArrowRight" ? 1 : MFE_API_TABS.length - 1)) % MFE_API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <MethodGuessChallenge />

      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="mfe-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="mfe-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>Endpoints</button>
        <button type="button" role="tab" id="mfe-tab-types" aria-selected={tab === "types"} aria-controls="mfe-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>Types</button>
      </div>
      <div role="tabpanel" id={`mfe-panel-${tab}`} aria-labelledby={`mfe-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointCards /> : <TypeCards category="api" />}
      </div>
    </div>
  );
}

// ── Method Guess Challenge ──────────────────────────────────────────

const METHOD_GUESS_ENDPOINTS = API_ENDPOINTS.map(ep => ({
  path: ep.path,
  description: ep.description,
  correctMethod: ep.method,
}));

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

function MethodGuessChallenge() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const current = METHOD_GUESS_ENDPOINTS[currentIndex];
  const totalCorrect = Object.entries(answers).filter(
    ([idx, method]) => METHOD_GUESS_ENDPOINTS[Number(idx)]?.correctMethod === method
  ).length;
  const allDone = revealed.size >= METHOD_GUESS_ENDPOINTS.length;

  const handleGuess = useCallback((method: string) => {
    if (!current || revealed.has(currentIndex)) return;
    setAnswers(prev => ({ ...prev, [currentIndex]: method }));
    setRevealed(prev => new Set(prev).add(currentIndex));
  }, [current, currentIndex, revealed]);

  const handleNext = useCallback(() => {
    if (currentIndex < METHOD_GUESS_ENDPOINTS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  if (!current) return null;

  const isRevealed = revealed.has(currentIndex);
  const userAnswer = answers[currentIndex];
  const isCorrect = userAnswer === current.correctMethod;

  return (
    <div className={styles.methodGuessPanel} aria-live="polite">
      <div className={styles.widgetSubtitle}>Guess the HTTP method for each endpoint</div>
      <div className={styles.methodGuessPath}>{current.path}</div>
      <div className={styles.methodGuessDesc}>{current.description}</div>
      <div className={styles.methodGuessOptions} role="radiogroup" aria-label={`Guess HTTP method for ${current.path}`}>
        {HTTP_METHODS.map(m => (
          <button
            key={m}
            type="button"
            className={styles.methodGuessBtn}
            data-correct={isRevealed && m === current.correctMethod ? "true" : undefined}
            data-wrong={isRevealed && userAnswer === m && m !== current.correctMethod ? "true" : undefined}
            onClick={() => handleGuess(m)}
            disabled={isRevealed}
            role="radio"
            aria-checked={userAnswer === m}
          >
            {m}
          </button>
        ))}
      </div>
      {isRevealed && (
        <div className={styles.methodGuessFeedback} data-correct={isCorrect ? "true" : "false"}>
          {isCorrect ? "Correct!" : `Not quite — the answer is ${current.correctMethod}`}
        </div>
      )}
      {isRevealed && currentIndex < METHOD_GUESS_ENDPOINTS.length - 1 && (
        <button type="button" className={styles.actionButton} onClick={handleNext} aria-label="Next endpoint">
          Next Endpoint
        </button>
      )}
      <div className={styles.methodGuessScore}>
        {revealed.size}/{METHOD_GUESS_ENDPOINTS.length} guessed{allDone ? ` — ${totalCorrect} correct` : ""}
      </div>
    </div>
  );
}

function EndpointCards() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const noMotion = usePrefersReducedMotion();

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
              aria-controls={`mfe-ep-${key}`}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            <AnimatePresence>
              {isOpen && (
                noMotion ? (
                  <div className={styles.endpointDetail} id={`mfe-ep-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
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
                ) : (
                  <motion.div
                    className={styles.endpointDetail}
                    id={`mfe-ep-${key}`}
                    role="region"
                    aria-label={`${ep.method} ${ep.path} details`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={TRANSITION.collapse}
                  >
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
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={MICROFRONTEND_ARCH_CONFIG} />
    </div>
  );
}

// ── TypeCards ────────────────────────────────────────────────────────

function TypeCards({ category }: { category: "api" | "state" | "props" }) {
  const types = DATA_MODELS.filter(t => t.category === category);
  return (
    <div className={styles.typeCardGrid}>
      {types.map(t => <TypeCard key={t.name} typeDef={t} />)}
    </div>
  );
}

function TypeCard({ typeDef }: { typeDef: TypeDef }) {
  return (
    <div className={styles.typeCard} data-type-category={typeDef.category}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} data-type-category={typeDef.category}>{typeDef.category}</span>
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
// Building view (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function BuildingView() {
  const { activeStep, stateEntries } = useMicrofrontend();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.buildingPanel}>
      <MfeMetricsBar />

      {noMotion ? (
        <StepWidget />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`widget-${activeStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.crossfade}
          >
            <StepWidget />
          </motion.div>
        </AnimatePresence>
      )}

      <StateInspector entries={stateEntries} title="MFE State" />
    </div>
  );
}

function MfeMetricsBar() {
  const { bundleSize, totalLoadTime, eventCount, isolationMode, routingStrategy, loadStates } = useMicrofrontend();
  const readyCount = Object.values(loadStates).filter(s => s === "ready").length;
  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="MFE architecture metrics">
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>MFEs</div>
        <div className={styles.metricValue} data-status={readyCount === 3 ? "good" : undefined}>{readyCount}/3</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Bundle</div>
        <div className={styles.metricValue}>{bundleSize}KB</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Load</div>
        <div className={styles.metricValue}>{totalLoadTime}ms</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Events</div>
        <div className={styles.metricValue} data-status={eventCount > 0 ? "good" : undefined}>{eventCount}</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Isolate</div>
        <div className={styles.metricValue}>{isolationMode === "module-federation" ? "MF" : isolationMode === "web-component" ? "WC" : "IF"}</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Route</div>
        <div className={styles.metricValue}>{routingStrategy === "app-shell" ? "Shell" : routingStrategy === "server-side" ? "SSR" : "CSR"}</div>
      </div>
    </div>
  );
}

// ── Step widget router ─────────────────────────────────────────────

function StepWidget() {
  const { activeStep } = useMicrofrontend();

  switch (activeStep) {
    case 4: return <AppShellWidget />;
    case 5: return <RemoteLoadingWidget />;
    case 6: return <SharedDepsWidget />;
    case 7: return <EventBusWidget />;
    case 8: return <IsolationWidget />;
    case 9: return <RoutingWidget />;
    case 10: return <CSSScopingWidget />;
    case 11: return <ErrorBoundaryWidget />;
    case 12: return <VersioningWidget />;
    case 13: return <PerformanceWidget />;
    case 14: return <TestingWidget />;
    case 15: return <IntegrationWidget />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 4 — AppShellWidget
// ═══════════════════════════════════════════════════════════════════

const SLOT_NAMES = ["Header Slot", "Main Content Slot", "Sidebar Slot"];
const SLOT_EXPECTED: Record<number, { teamId: string; reason: string }> = {
  0: { teamId: "header", reason: "Navigation belongs in the header — it's always visible" },
  1: { teamId: "products", reason: "Product catalog is the primary content area" },
  2: { teamId: "cart", reason: "Cart works as a persistent sidebar widget" },
};

function AppShellWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useMicrofrontend();
  const [assignments, setAssignments] = useState<Record<number, string>>({});

  const assign = useCallback((slotIdx: number, teamId: string) => {
    setAssignments(prev => ({ ...prev, [slotIdx]: teamId }));
  }, []);

  const allAssigned = Object.keys(assignments).length === 3;

  useEffect(() => {
    if (allAssigned) markStepComplete(4);
  }, [allAssigned, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="shell">
      <div className={styles.widgetTitle}>App Shell</div>
      <div className={styles.widgetSubtitle}>Assign each team to a slot in the app shell layout</div>

      <div className={styles.mfeSlotGrid}>
        {SLOT_NAMES.map((name, idx) => {
          const assigned = assignments[idx];
          const team = MFE_TEAMS.find(t => t.id === assigned);
          return (
            <div
              key={idx}
              className={styles.mfeSlot}
              data-assigned={assigned ? "true" : undefined}
              style={team ? { borderColor: team.color } : undefined}
            >
              <div className={styles.mfeSlotLabel}>{name}</div>
              {team && (
                noMotion ? (
                  <div className={styles.mfeSlotAssigned} style={{ color: team.color }}>{team.name}</div>
                ) : (
                  <motion.div
                    className={styles.mfeSlotAssigned}
                    style={{ color: team.color }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={SPRING.snappy}
                  >
                    {team.name}
                  </motion.div>
                )
              )}
              <div role="radiogroup" aria-label={`Assign team to ${name}`} className={styles.radioColumn}>
                {MFE_TEAMS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.toolButton}
                    role="radio"
                    aria-checked={assigned === t.id}
                    data-active={assigned === t.id ? "true" : undefined}
                    onClick={() => assign(idx, t.id)}
                    style={assigned === t.id ? { borderColor: t.color, color: t.color } : undefined}
                  >
                    {t.component}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {allAssigned && (() => {
        const mismatches = Object.entries(assignments).filter(
          ([idx, teamId]) => SLOT_EXPECTED[Number(idx)]?.teamId !== teamId
        );
        return mismatches.length > 0 ? (
          <div className={styles.slotFeedback} data-mismatch="true" role="status">
            <div className={styles.slotFeedbackTitle}>Layout mismatch — consider:</div>
            {mismatches.map(([idx]) => {
              const expected = SLOT_EXPECTED[Number(idx)];
              const expectedTeam = MFE_TEAMS.find(t => t.id === expected?.teamId);
              return (
                <div key={idx} className={styles.slotFeedbackItem}>
                  {SLOT_NAMES[Number(idx)]} → {expectedTeam?.name ?? "?"}: {expected?.reason ?? ""}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.widgetNote}>
            All slots correctly assigned. The app shell now orchestrates loading for {MFE_TEAMS.length} independent MFE containers.
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 5 — RemoteLoadingWidget (HERO)
// ═══════════════════════════════════════════════════════════════════

const BUNDLE_SIZES: Record<string, number> = {
  header: 48,
  products: 124,
  cart: 86,
};

function RemoteLoadingWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, setLoadState, loadStates } = useMicrofrontend();
  const [latencies, setLatencies] = useState<Record<string, number>>({
    header: 500,
    products: 1200,
    cart: 800,
  });
  const [progress, setProgress] = useState<Record<string, number>>({
    header: 0,
    products: 0,
    cart: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const cleanup = useCallback(() => {
    timersRef.current.forEach(t => clearInterval(t));
    timersRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const loadAll = useCallback(() => {
    cleanup();
    setIsLoading(true);
    setProgress({ header: 0, products: 0, cart: 0 });
    MFE_TEAMS.forEach(team => setLoadState(team.id, "loading"));

    MFE_TEAMS.forEach(team => {
      const latency = latencies[team.id] ?? 500;
      const steps = 20;
      const interval = latency / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const pct = Math.min(100, Math.round((step / steps) * 100));
        setProgress(prev => ({ ...prev, [team.id]: pct }));

        if (step >= steps) {
          clearInterval(timer);
          setLoadState(team.id, "ready");
        }
      }, interval);

      timersRef.current.push(timer);
    });
  }, [latencies, setLoadState, cleanup]);

  const allReady = Object.values(loadStates).every(s => s === "ready");
  const hasSlowLoaded = useMemo(() => {
    return Object.entries(latencies).some(([id, lat]) => lat > 1000 && loadStates[id] === "ready");
  }, [latencies, loadStates]);

  useEffect(() => {
    if (allReady && hasSlowLoaded) {
      markStepComplete(5);
      setIsLoading(false);
    }
  }, [allReady, hasSlowLoaded, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="loading">
      <div className={styles.widgetTitle}>Remote Container Loader</div>
      <div className={styles.widgetSubtitle}>Adjust latency per MFE and click Load All — watch bundles arrive at different speeds</div>

      <div className={styles.mfePanelGrid}>
        {MFE_TEAMS.map(team => {
          const state = loadStates[team.id] ?? "idle";
          const pct = progress[team.id] ?? 0;
          const lat = latencies[team.id] ?? 500;
          return (
            <div key={team.id} className={styles.mfePanel} data-state={state}>
              <div className={styles.mfePanelName} style={{ color: team.color }}>{team.name}</div>
              <div className={styles.mfePanelStatus} data-state={state}>{state}</div>
              <div className={styles.mfeLoadBar}>
                {noMotion ? (
                  <div className={styles.mfeLoadFill} data-state={state} style={{ width: `${pct}%` }} />
                ) : (
                  <motion.div
                    className={styles.mfeLoadFill}
                    data-state={state}
                    animate={{ width: `${pct}%` }}
                    transition={TRANSITION.progress}
                  />
                )}
              </div>
              <div className={styles.mfeBundleSize}>{BUNDLE_SIZES[team.id]}KB bundle</div>
              <div className={styles.latencyControl}>
                <label className={styles.latencyLabel} htmlFor={`lat-${team.id}`}>
                  Latency: {lat}ms
                </label>
                <input
                  id={`lat-${team.id}`}
                  type="range"
                  className={styles.latencySlider}
                  min={0}
                  max={3000}
                  step={100}
                  value={lat}
                  onChange={e => setLatencies(prev => ({ ...prev, [team.id]: Number(e.target.value) }))}
                  disabled={isLoading}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.actionButton}
        data-variant="primary"
        onClick={loadAll}
        disabled={isLoading}
        aria-label="Load all MFE containers"
      >
        {isLoading ? "Loading..." : "Load All"}
      </button>

      {allReady && !hasSlowLoaded && (
        <div className={styles.widgetNote}>
          Set at least one MFE latency above 1000ms and reload to see how slow-loading remotes behave.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 6 — SharedDepsWidget (CORE)
// ═══════════════════════════════════════════════════════════════════

function SharedDepsWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, sharedDeps, sharingEnabled, toggleSharing, bundleSize } = useMicrofrontend();
  const [sharingMode, setSharingMode] = useState(false);
  const [hasSeenSavings, setHasSeenSavings] = useState(false);

  const unsharedTotal = useMemo(() => {
    return sharedDeps.reduce((sum, d) => sum + d.size * d.loadedBy.length, 0);
  }, [sharedDeps]);

  const savings = unsharedTotal - bundleSize;

  useEffect(() => {
    if (sharingMode && savings > 0) setHasSeenSavings(true);
  }, [sharingMode, savings]);

  useEffect(() => {
    if (sharingMode && hasSeenSavings) markStepComplete(6);
  }, [sharingMode, hasSeenSavings, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="shell">
      <div className={styles.widgetTitle}>Shared Dependencies</div>
      <div className={styles.widgetSubtitle}>Toggle sharing mode to see how deduplication reduces bundle sizes</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Sharing mode">
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={!sharingMode}
          data-active={!sharingMode ? "true" : undefined}
          onClick={() => setSharingMode(false)}
        >
          No Sharing
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={sharingMode}
          data-active={sharingMode ? "true" : undefined}
          onClick={() => setSharingMode(true)}
        >
          Shared Runtime
        </button>
      </div>

      {!sharingMode ? (
        <div className={styles.bundleComparison}>
          <div className={styles.widgetSubtitle}>Each MFE downloads its own copy of every dependency</div>
          {MFE_TEAMS.map(team => {
            const teamDeps = sharedDeps.filter(d => d.loadedBy.includes(team.id));
            const teamSize = teamDeps.reduce((s, d) => s + d.size, 0);
            return (
              <div key={team.id} className={styles.bundleRow}>
                <div className={styles.bundleLabel} style={{ color: team.color }}>{team.name}: {teamSize}KB</div>
                <div className={styles.bundleBar}>
                  {noMotion ? (
                    <div className={styles.bundleFill} data-type="unshared" style={{ width: `${Math.min(100, (teamSize / 220) * 100)}%` }} />
                  ) : (
                    <motion.div
                      className={styles.bundleFill}
                      data-type="unshared"
                      animate={{ width: `${Math.min(100, (teamSize / 220) * 100)}%` }}
                      transition={TRANSITION.progress}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div className={styles.bundleSize}>Total: {unsharedTotal}KB (3 copies of everything)</div>
        </div>
      ) : (
        <>
          <div className={styles.depToggleGrid}>
            {sharedDeps.map(dep => {
              const isShared = sharingEnabled.has(dep.name);
              return (
                <button
                  key={dep.name}
                  type="button"
                  className={styles.depToggle}
                  data-shared={isShared ? "true" : undefined}
                  onClick={() => toggleSharing(dep.name)}
                  aria-pressed={isShared}
                  aria-label={`${dep.name} ${dep.version} — ${isShared ? "shared" : "not shared"}`}
                >
                  <span className={styles.depName}>{dep.name} {dep.version}</span>
                  <span className={styles.depSize}>{dep.size}KB x {dep.loadedBy.length} teams</span>
                  <span className={styles.depStatus} data-shared={isShared ? "true" : "false"}>
                    {isShared ? "SHARED" : "DUPLICATED"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.bundleComparison}>
            <div className={styles.bundleRow}>
              <div className={styles.bundleLabel}>Shared bundle: {bundleSize}KB</div>
              <div className={styles.bundleBar}>
                {noMotion ? (
                  <div className={styles.bundleFill} data-type="shared" style={{ width: `${Math.min(100, (bundleSize / unsharedTotal) * 100)}%` }} />
                ) : (
                  <motion.div
                    className={styles.bundleFill}
                    data-type="shared"
                    animate={{ width: `${Math.min(100, (bundleSize / unsharedTotal) * 100)}%` }}
                    transition={TRANSITION.progress}
                  />
                )}
              </div>
            </div>
          </div>

          {savings > 0 && (
            noMotion ? (
              <div className={styles.savingsBadge}>
                Saved {savings}KB ({Math.round((savings / unsharedTotal) * 100)}% reduction)
              </div>
            ) : (
              <motion.div
                className={styles.savingsBadge}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING.gentle}
              >
                Saved {savings}KB ({Math.round((savings / unsharedTotal) * 100)}% reduction)
              </motion.div>
            )
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 7 — EventBusWidget
// ═══════════════════════════════════════════════════════════════════

const EVENT_TYPES = ["add-to-cart", "navigate", "auth-change", "theme-update"];

function EventBusWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, sendEvent, eventBusMessages, clearEvents } = useMicrofrontend();
  const [source, setSource] = useState("products");
  const [target, setTarget] = useState("cart");
  const [eventType, setEventType] = useState("add-to-cart");
  const [payload, setPayload] = useState('{ "productId": "p-42" }');
  const [lastSent, setLastSent] = useState<string | null>(null);

  const handleSend = useCallback(() => {
    sendEvent({ type: eventType, from: source, to: target, payload });
    setLastSent(`${source} → ${target}: ${eventType}`);
  }, [source, target, eventType, payload, sendEvent]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(eventBusMessages.map(m => m.type));
    return types.size;
  }, [eventBusMessages]);

  useEffect(() => {
    if (eventBusMessages.length >= 3 && uniqueTypes >= 2) markStepComplete(7);
  }, [eventBusMessages.length, uniqueTypes, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="communication">
      <div className={styles.widgetTitle}>Event Bus</div>
      <div className={styles.widgetSubtitle}>Send events between MFEs — need 3+ events of 2+ different types</div>

      <div className={styles.eventControls}>
        <div className={styles.eventRow}>
          <label htmlFor="evt-source" className={styles.eventLabel}>From:</label>
          <select id="evt-source" className={styles.eventSelect} value={source} onChange={e => setSource(e.target.value)}>
            {MFE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className={styles.eventRow}>
          <label htmlFor="evt-target" className={styles.eventLabel}>To:</label>
          <select id="evt-target" className={styles.eventSelect} value={target} onChange={e => setTarget(e.target.value)}>
            {MFE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className={styles.eventRow}>
          <label htmlFor="evt-type" className={styles.eventLabel}>Type:</label>
          <select id="evt-type" className={styles.eventSelect} value={eventType} onChange={e => setEventType(e.target.value)}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.eventRow}>
          <label htmlFor="evt-payload" className={styles.eventLabel}>Payload:</label>
          <input
            id="evt-payload"
            type="text"
            className={styles.eventSelect}
            value={payload}
            onChange={e => setPayload(e.target.value)}
            aria-label="Event payload"
          />
        </div>
      </div>

      <div className={styles.buttonRow}>
        <button type="button" className={styles.actionButton} data-variant="primary" onClick={handleSend} aria-label="Send event">
          Send
        </button>
        <button type="button" className={styles.toolButton} onClick={clearEvents} aria-label="Clear event log">
          Clear
        </button>
      </div>

      <AnimatePresence>
        {lastSent && (
          noMotion ? (
            <div className={styles.eventArc}>{lastSent}</div>
          ) : (
            <motion.div
              className={styles.eventArc}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING.quick}
              key={lastSent + eventBusMessages.length}
            >
              {lastSent}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {eventBusMessages.length > 0 && (
        <div className={styles.eventLog} aria-label="Event log" role="log" aria-live="polite">
          {eventBusMessages.map((msg, i) => (
            noMotion ? (
              <div key={msg.id} className={styles.eventLogEntry}>
                <span className={styles.eventLogType}>{msg.type}</span>
                <span className={styles.eventLogRoute}>{msg.from} → {msg.to}</span>
              </div>
            ) : (
              <motion.div
                key={msg.id}
                className={styles.eventLogEntry}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING.quick, delay: i * STAGGER.fast }}
              >
                <span className={styles.eventLogType}>{msg.type}</span>
                <span className={styles.eventLogRoute}>{msg.from} → {msg.to}</span>
              </motion.div>
            )
          ))}
        </div>
      )}

      <div className={styles.widgetNote}>
        Events sent: {eventBusMessages.length}/3 | Unique types: {uniqueTypes}/2
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 8 — IsolationWidget
// ═══════════════════════════════════════════════════════════════════

const ISOLATION_MODES: { id: IsolationMode; label: string; pros: string[]; cons: string[] }[] = [
  {
    id: "iframe",
    label: "IFrame",
    pros: ["Full CSS/JS isolation", "Security boundary", "Independent crash isolation"],
    cons: ["Performance overhead", "Communication via postMessage only", "SEO unfriendly"],
  },
  {
    id: "web-component",
    label: "Web Component",
    pros: ["Shadow DOM CSS isolation", "Standard web API", "Lightweight"],
    cons: ["No JS isolation", "SSR challenges", "Event handling complexity"],
  },
  {
    id: "module-federation",
    label: "Module Federation",
    pros: ["Shared runtime", "No isolation overhead", "Code splitting built-in"],
    cons: ["No CSS isolation by default", "Shared global scope", "Webpack dependency"],
  },
];

function IsolationWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, isolationMode, setIsolationMode } = useMicrofrontend();
  const [triedModes, setTriedModes] = useState<Set<IsolationMode>>(new Set([isolationMode]));
  const [conflictTested, setConflictTested] = useState(false);

  const handleMode = useCallback((mode: IsolationMode) => {
    setIsolationMode(mode);
    setTriedModes(prev => new Set(prev).add(mode));
    setConflictTested(false);
  }, [setIsolationMode]);

  useEffect(() => {
    if (triedModes.size >= 3) markStepComplete(8);
  }, [triedModes.size, markStepComplete]);

  const currentMode = ISOLATION_MODES.find(m => m.id === isolationMode);
  const isIsolated = isolationMode === "iframe" || isolationMode === "web-component";

  return (
    <div className={styles.widgetPanel} data-category="isolation">
      <div className={styles.widgetTitle}>Isolation Strategy</div>
      <div className={styles.widgetSubtitle}>Try all 3 isolation modes and test for global variable collisions</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Isolation mode">
        {ISOLATION_MODES.map(mode => (
          <button
            key={mode.id}
            type="button"
            className={styles.toggleButton}
            role="radio"
            aria-checked={isolationMode === mode.id}
            data-active={isolationMode === mode.id ? "true" : undefined}
            onClick={() => handleMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {currentMode && (
        <AnimatePresence mode="wait">
          {noMotion ? (
            <div key={currentMode.id}>
              <IsolationDetail mode={currentMode} />
            </div>
          ) : (
            <motion.div
              key={currentMode.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION.crossfade}
            >
              <IsolationDetail mode={currentMode} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className={styles.conflictTest}>
        <div className={styles.widgetSubtitle}>Conflict Test: Both MFEs set window.theme = different values</div>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setConflictTested(true)}
          aria-label="Run conflict test"
        >
          Run Conflict Test
        </button>
        {conflictTested && (
          noMotion ? (
            <div className={styles.conflictResult} data-safe={isIsolated ? "true" : "false"}>
              {isIsolated
                ? "SAFE: Each MFE has its own global scope — no collision detected"
                : "COLLISION: Both MFEs share window.theme — last write wins, Team A's value overwritten"}
            </div>
          ) : (
            <motion.div
              className={styles.conflictResult}
              data-safe={isIsolated ? "true" : "false"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING.quick}
            >
              {isIsolated
                ? "SAFE: Each MFE has its own global scope — no collision detected"
                : "COLLISION: Both MFEs share window.theme — last write wins, Team A's value overwritten"}
            </motion.div>
          )
        )}
      </div>

      <div className={styles.widgetNote}>
        Modes tried: {triedModes.size}/3
      </div>
    </div>
  );
}

function IsolationDetail({ mode }: { mode: typeof ISOLATION_MODES[number] }) {
  return (
    <div className={styles.isolationDiagram}>
      <div className={styles.isolationVisual}>
        {MFE_TEAMS.map(team => (
          <div
            key={team.id}
            className={styles.isolationBox}
            data-mode={mode.id}
            style={{ borderColor: team.color }}
          >
            <span>{team.component}</span>
            <span className={styles.isolationLabel}>
              {mode.id === "iframe" ? "<iframe>" : mode.id === "web-component" ? "<mfe-slot>" : "import()"}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.prosConsList}>
        {mode.pros.map((p, i) => (
          <div key={`pro-${i}`} className={styles.prosConsItem} data-type="pro">+ {p}</div>
        ))}
        {mode.cons.map((c, i) => (
          <div key={`con-${i}`} className={styles.prosConsItem} data-type="con">- {c}</div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 9 — RoutingWidget
// ═══════════════════════════════════════════════════════════════════

const ROUTES = [
  { path: "/", owner: "header", label: "Home" },
  { path: "/products", owner: "products", label: "Products" },
  { path: "/products/:id", owner: "products", label: "Product Detail" },
  { path: "/cart", owner: "cart", label: "Cart" },
  { path: "/checkout", owner: "cart", label: "Checkout" },
];

const ROUTING_STRATEGIES: { id: RoutingStrategy; label: string; desc: string }[] = [
  { id: "app-shell", label: "App Shell Router", desc: "Shell owns all routes, delegates rendering to MFEs based on path matching" },
  { id: "server-side", label: "Server-Side Composition", desc: "Server resolves which MFE serves each route, composes HTML before sending to client" },
  { id: "client-side", label: "Client-Side Router per MFE", desc: "Each MFE owns its routes, app shell arbitrates via URL prefix convention" },
];

function RoutingWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, routingStrategy, setRoutingStrategy } = useMicrofrontend();
  const [predictionDone, setPredictionDone] = useState(false);
  const [activeRoute, setActiveRoute] = useState("/");
  const [triedStrategies, setTriedStrategies] = useState<Set<RoutingStrategy>>(new Set([routingStrategy]));
  const [navigated, setNavigated] = useState(false);

  const handleStrategy = useCallback((s: RoutingStrategy) => {
    setRoutingStrategy(s);
    setTriedStrategies(prev => new Set(prev).add(s));
  }, [setRoutingStrategy]);

  const handleNavigate = useCallback((path: string) => {
    setActiveRoute(path);
    setNavigated(true);
  }, []);

  useEffect(() => {
    if (triedStrategies.size >= 2 && navigated) markStepComplete(9);
  }, [triedStrategies.size, navigated, markStepComplete]);

  const currentRoute = ROUTES.find(r => r.path === activeRoute);
  const ownerTeam = MFE_TEAMS.find(t => t.id === currentRoute?.owner);

  const handoffMessage = useMemo(() => {
    if (!currentRoute || !ownerTeam) return "";
    switch (routingStrategy) {
      case "app-shell":
        return `App Shell matched "${currentRoute.path}" → loaded ${ownerTeam.component} into the main slot`;
      case "server-side":
        return `Server resolved "${currentRoute.path}" → ${ownerTeam.name} rendered HTML, streamed to client`;
      case "client-side":
        return `URL prefix "/${currentRoute.owner}" → ${ownerTeam.name}'s internal router took over`;
    }
  }, [currentRoute, ownerTeam, routingStrategy]);

  return (
    <div className={styles.widgetPanel} data-category="shell">
      <div className={styles.widgetTitle}>Cross-MFE Routing</div>

      {!predictionDone && (
        <PredictionChallenge
          question="If Team B owns /products/*, who handles navigation FROM /products/42 TO /cart?"
          options={[
            "Team B — it started the navigation",
            "Team C — it owns /cart",
            "App Shell — it arbitrates between MFEs",
          ]}
          correctIndex={2}
          explanation="The app shell (or a shared router) handles cross-MFE navigation. Team B emits a navigate intent, the shell resolves the target MFE."
          onComplete={() => setPredictionDone(true)}
        />
      )}

      <div className={styles.widgetSubtitle}>Choose a routing strategy, then navigate between routes</div>

      <div className={styles.strategyColumn} role="radiogroup" aria-label="Routing strategy">
        {ROUTING_STRATEGIES.map(s => (
          <button
            key={s.id}
            type="button"
            className={styles.strategyOption}
            data-active={routingStrategy === s.id ? "true" : undefined}
            onClick={() => handleStrategy(s.id)}
            role="radio"
            aria-checked={routingStrategy === s.id}
          >
            <span className={styles.strategyLabel}>{s.label}</span>
            <span className={styles.strategyDesc}>{s.desc}</span>
          </button>
        ))}
      </div>

      <div className={styles.routeList} role="radiogroup" aria-label="Navigate to route">
        {ROUTES.map(route => {
          const owner = MFE_TEAMS.find(t => t.id === route.owner);
          return (
            <button
              key={route.path}
              type="button"
              className={styles.routeEntry}
              data-active={activeRoute === route.path ? "true" : undefined}
              onClick={() => handleNavigate(route.path)}
              role="radio"
              aria-checked={activeRoute === route.path}
              aria-label={`Navigate to ${route.label}`}
            >
              <span className={styles.routePath}>{route.path}</span>
              <span className={styles.routeOwner} style={owner ? { color: owner.color } : undefined}>
                {owner?.component ?? "?"}
              </span>
            </button>
          );
        })}
      </div>

      {handoffMessage && (
        noMotion ? (
          <div className={styles.routeHandoff}>{handoffMessage}</div>
        ) : (
          <motion.div
            className={styles.routeHandoff}
            key={activeRoute + routingStrategy}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={TRANSITION.enterCard}
          >
            {handoffMessage}
          </motion.div>
        )
      )}

      <div className={styles.widgetNote}>
        Strategies tried: {triedStrategies.size}/2 | Navigated: {navigated ? "yes" : "no"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 10 — CSSScopingWidget
// ═══════════════════════════════════════════════════════════════════

type CssStrategy = "none" | "css-modules" | "shadow-dom" | "bem";

const CSS_STRATEGIES: { id: CssStrategy; label: string }[] = [
  { id: "none", label: "No Scoping" },
  { id: "css-modules", label: "CSS Modules" },
  { id: "shadow-dom", label: "Shadow DOM" },
  { id: "bem", label: "BEM Convention" },
];

function CSSScopingWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useMicrofrontend();
  const [predictionDone, setPredictionDone] = useState(false);
  const [strategy, setStrategy] = useState<CssStrategy>("none");
  const [triedStrategies, setTriedStrategies] = useState<Set<CssStrategy>>(new Set(["none"]));

  const handleStrategy = useCallback((s: CssStrategy) => {
    setStrategy(s);
    setTriedStrategies(prev => new Set(prev).add(s));
  }, []);

  useEffect(() => {
    if (triedStrategies.size >= 3) markStepComplete(10);
  }, [triedStrategies.size, markStepComplete]);

  const hasCollision = strategy === "none";
  const teamAColor = hasCollision ? "var(--color-error)" : "var(--diagram-layer-0)";
  const teamBColor = hasCollision ? "var(--color-error)" : "var(--diagram-layer-2)";

  const scopeExplanation = useMemo(() => {
    switch (strategy) {
      case "none": return "Both MFEs define .button — styles collide, last-loaded wins";
      case "css-modules": return ".button becomes .header_button_x3k2 and .products_button_j8m1 — unique hashes prevent collision";
      case "shadow-dom": return "Each MFE renders inside a Shadow DOM — styles cannot leak in or out";
      case "bem": return ".header__button and .products__button — naming convention avoids collision (but requires discipline)";
    }
  }, [strategy]);

  return (
    <div className={styles.widgetPanel} data-category="isolation">
      <div className={styles.widgetTitle}>CSS Scoping</div>

      {!predictionDone && (
        <PredictionChallenge
          question="Two MFEs both define .button { color: red } and .button { color: blue }. What happens?"
          options={[
            "Both buttons show their own color",
            "Last-loaded stylesheet wins — both buttons same color",
            "Browser throws a CSS error",
          ]}
          correctIndex={1}
          explanation="Without scoping, CSS is global. The last-loaded stylesheet's .button rule overwrites the first — both buttons end up the same color."
          onComplete={() => setPredictionDone(true)}
        />
      )}

      <div className={styles.widgetSubtitle}>Toggle scoping strategy and see how .button renders in each MFE</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="CSS scoping strategy">
        {CSS_STRATEGIES.map(s => (
          <button
            key={s.id}
            type="button"
            className={styles.toggleButton}
            role="radio"
            aria-checked={strategy === s.id}
            data-active={strategy === s.id ? "true" : undefined}
            onClick={() => handleStrategy(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.cssPanels}>
        <div className={styles.cssPanel}>
          <div className={styles.cssPanelLabel}>Team A — Header</div>
          <div
            className={styles.cssButton}
            data-conflict={hasCollision ? "true" : undefined}
            style={{ backgroundColor: teamAColor }}
          >
            .button {"{"}color: red{"}"}
          </div>
          <div className={styles.cssScopeLabel}>
            {strategy === "none" ? ".button" : strategy === "css-modules" ? ".header_button_x3k2" : strategy === "shadow-dom" ? "#shadow-root .button" : ".header__button"}
          </div>
        </div>
        <div className={styles.cssPanel}>
          <div className={styles.cssPanelLabel}>Team B — Products</div>
          <div
            className={styles.cssButton}
            data-conflict={hasCollision ? "true" : undefined}
            style={{ backgroundColor: teamBColor }}
          >
            .button {"{"}color: blue{"}"}
          </div>
          <div className={styles.cssScopeLabel}>
            {strategy === "none" ? ".button" : strategy === "css-modules" ? ".products_button_j8m1" : strategy === "shadow-dom" ? "#shadow-root .button" : ".products__button"}
          </div>
        </div>
      </div>

      {noMotion ? (
        <div className={styles.widgetNote}>{scopeExplanation}</div>
      ) : (
        <motion.div
          className={styles.widgetNote}
          key={strategy}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={TRANSITION.crossfade}
        >
          {scopeExplanation}
        </motion.div>
      )}

      <div className={styles.widgetNote}>
        Strategies tried: {triedStrategies.size}/3
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 11 — ErrorBoundaryWidget
// ═══════════════════════════════════════════════════════════════════

function ErrorBoundaryWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useMicrofrontend();
  const [boundaryEnabled, setBoundaryEnabled] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [crashedWithout, setCrashedWithout] = useState(false);
  const [crashedWith, setCrashedWith] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const handleCrash = useCallback(() => {
    setCrashed(true);
    if (boundaryEnabled) {
      setCrashedWith(true);
      setEventLog(prev => [
        ...prev,
        "Team B threw TypeError: Cannot read 'map' of undefined",
        "Error boundary caught — rendering fallback for Team B",
        "Team A and Team C continue running normally",
      ]);
    } else {
      setCrashedWithout(true);
      setEventLog(prev => [
        ...prev,
        "Team B threw TypeError: Cannot read 'map' of undefined",
        "Error propagated to App Shell — entire application crashed",
        "All 3 MFEs are now showing error state",
      ]);
    }
  }, [boundaryEnabled]);

  const handleReset = useCallback(() => {
    setCrashed(false);
    setEventLog([]);
  }, []);

  useEffect(() => {
    if (crashedWithout && crashedWith) markStepComplete(11);
  }, [crashedWithout, crashedWith, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="isolation">
      <div className={styles.widgetTitle}>Error Boundaries</div>
      <div className={styles.widgetSubtitle}>Toggle error boundary, then crash Team B to see the difference</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Error boundary toggle">
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={!boundaryEnabled}
          data-active={!boundaryEnabled ? "true" : undefined}
          onClick={() => { setBoundaryEnabled(false); handleReset(); }}
        >
          No Boundary
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={boundaryEnabled}
          data-active={boundaryEnabled ? "true" : undefined}
          onClick={() => { setBoundaryEnabled(true); handleReset(); }}
        >
          Error Boundary ON
        </button>
      </div>

      <div className={styles.errorDemoGrid}>
        {MFE_TEAMS.map(team => {
          const isCrashTarget = team.id === "products";
          const showCrash = crashed && (isCrashTarget || !boundaryEnabled);
          const showFallback = crashed && isCrashTarget && boundaryEnabled;
          return (
            <div
              key={team.id}
              className={styles.errorPanel}
              data-crashed={showCrash ? "true" : undefined}
              data-boundary={showFallback ? "true" : undefined}
            >
              <div className={styles.errorPanelLabel} style={{ color: team.color }}>{team.name}</div>
              {showFallback ? (
                noMotion ? (
                  <div className={styles.errorFallback}>Fallback UI — Team B is recovering</div>
                ) : (
                  <motion.div
                    className={styles.errorFallback}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={SPRING.snappy}
                  >
                    Fallback UI — Team B is recovering
                  </motion.div>
                )
              ) : showCrash ? (
                noMotion ? (
                  <div className={styles.errorFallback}>CRASHED</div>
                ) : (
                  <motion.div
                    className={styles.errorFallback}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={SPRING.snappy}
                  >
                    CRASHED
                  </motion.div>
                )
              ) : (
                <div className={styles.errorOk}>{team.component} running</div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.actionButton}
          data-variant="danger"
          onClick={handleCrash}
          disabled={crashed}
          aria-label="Crash Team B"
        >
          Crash Team B
        </button>
        <button
          type="button"
          className={styles.toolButton}
          onClick={handleReset}
          aria-label="Reset all MFEs"
        >
          Reset
        </button>
      </div>

      {eventLog.length > 0 && (
        <div className={styles.eventLog} role="log" aria-label="Error event log">
          {eventLog.map((entry, i) => (
            <div key={i} className={styles.eventLogEntry}>
              <span className={styles.eventLogType}>{i === 0 ? "ERROR" : i === 1 ? "BOUNDARY" : "STATUS"}</span>
              <span>{entry}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.widgetNote}>
        Crashed without boundary: {crashedWithout ? "yes" : "no"} | Crashed with boundary: {crashedWith ? "yes" : "no"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 12 — VersioningWidget
// ═══════════════════════════════════════════════════════════════════

const REACT_VERSIONS = ["18.1.0", "18.2.0", "18.3.0"];
type ResolutionStrategy = "strict" | "loose" | "dual";
const RESOLUTION_STRATEGIES: { id: ResolutionStrategy; label: string }[] = [
  { id: "strict", label: "Strict Singleton" },
  { id: "loose", label: "Loose Match" },
  { id: "dual", label: "Dual Load" },
];

function VersioningWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useMicrofrontend();
  const [versions, setVersions] = useState<Record<string, string>>({
    header: "18.3.0",
    products: "18.3.0",
    cart: "18.3.0",
  });
  const [resolution, setResolution] = useState<ResolutionStrategy>("strict");
  const [triedStrategies, setTriedStrategies] = useState<Set<ResolutionStrategy>>(new Set());
  const [hasConflict, setHasConflict] = useState(false);

  const allSameVersion = new Set(Object.values(versions)).size === 1;

  useEffect(() => {
    if (!allSameVersion) setHasConflict(true);
  }, [allSameVersion]);

  const handleResolution = useCallback((s: ResolutionStrategy) => {
    setResolution(s);
    setTriedStrategies(prev => new Set(prev).add(s));
  }, []);

  useEffect(() => {
    if (hasConflict && triedStrategies.size >= 2) markStepComplete(12);
  }, [hasConflict, triedStrategies.size, markStepComplete]);

  const outcome = useMemo(() => {
    if (allSameVersion) return { status: "ok" as const, message: "All teams on the same version — no conflict" };
    switch (resolution) {
      case "strict":
        return { status: "error" as const, message: "BUILD FAILS: Strict singleton requires all teams on the same React version. Team deployment blocked." };
      case "loose":
        return { status: "warn" as const, message: "Highest version loaded (18.3.0). Lower versions may hit breaking changes at runtime." };
      case "dual":
        return { status: "warn" as const, message: "Multiple React instances loaded. Bundle size increased. Hooks may not work across boundaries." };
    }
  }, [allSameVersion, resolution]);

  return (
    <div className={styles.widgetPanel} data-category="deployment">
      <div className={styles.widgetTitle}>Dependency Version Manager</div>
      <div className={styles.widgetSubtitle}>Set different React versions per team, then choose a resolution strategy</div>

      <div className={styles.versionGrid}>
        {MFE_TEAMS.map(team => (
          <div key={team.id} className={styles.versionRow}>
            <span className={styles.versionTeam} style={{ color: team.color }}>{team.component}</span>
            <select
              className={styles.versionSelect}
              value={versions[team.id]}
              onChange={e => setVersions(prev => ({ ...prev, [team.id]: e.target.value }))}
              aria-label={`React version for ${team.name}`}
            >
              {REACT_VERSIONS.map(v => (
                <option key={v} value={v}>React {v}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!allSameVersion && (
        <>
          <div className={styles.widgetSubtitle}>Version conflict detected! Choose resolution strategy:</div>
          <div className={styles.toggleRow} role="radiogroup" aria-label="Resolution strategy">
            {RESOLUTION_STRATEGIES.map(s => (
              <button
                key={s.id}
                type="button"
                className={styles.toggleButton}
                role="radio"
                aria-checked={resolution === s.id}
                data-active={resolution === s.id ? "true" : undefined}
                onClick={() => handleResolution(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {noMotion ? (
        <div className={styles.versionOutcome} data-status={outcome.status}>
          {outcome.message}
        </div>
      ) : (
        <motion.div
          className={styles.versionOutcome}
          data-status={outcome.status}
          key={`${resolution}-${allSameVersion}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING.quick}
        >
          {outcome.message}
        </motion.div>
      )}

      <div className={styles.widgetNote}>
        Conflict created: {hasConflict ? "yes" : "no"} | Strategies tried: {triedStrategies.size}/2
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 13 — PerformanceWidget
// ═══════════════════════════════════════════════════════════════════

function PerformanceWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useMicrofrontend();
  const [networkSpeed, setNetworkSpeed] = useState(1); // 1 = normal, 0.5 = slow, 2 = fast
  const [prefetch, setPrefetch] = useState<Record<string, boolean>>({
    header: false,
    products: false,
    cart: false,
  });
  const [codeSplit, setCodeSplit] = useState<Record<string, boolean>>({
    header: false,
    products: false,
    cart: false,
  });
  const [triedPrefetch, setTriedPrefetch] = useState(false);
  const [triedCodeSplit, setTriedCodeSplit] = useState(false);

  const togglePrefetch = useCallback((id: string) => {
    setPrefetch(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (Object.values(next).some(v => v)) setTriedPrefetch(true);
      return next;
    });
  }, []);

  const toggleCodeSplit = useCallback((id: string) => {
    setCodeSplit(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (Object.values(next).some(v => v)) setTriedCodeSplit(true);
      return next;
    });
  }, []);

  useEffect(() => {
    if (triedPrefetch && triedCodeSplit) markStepComplete(13);
  }, [triedPrefetch, triedCodeSplit, markStepComplete]);

  const baseTimes: Record<string, number> = { header: 200, products: 600, cart: 400 };

  const getLoadTime = useCallback((id: string) => {
    let time = baseTimes[id] ?? 400;
    time = time / networkSpeed;
    if (prefetch[id]) time *= 0.3;
    if (codeSplit[id]) time *= 0.6;
    return Math.round(time);
  }, [networkSpeed, prefetch, codeSplit]);

  const times = useMemo(() => ({
    header: getLoadTime("header"),
    products: getLoadTime("products"),
    cart: getLoadTime("cart"),
  }), [getLoadTime]);

  const totalTime = Math.max(times.header, times.products, times.cart);
  const firstReady = Math.min(times.header, times.products, times.cart);
  const maxTime = 1200 / networkSpeed;

  return (
    <div className={styles.widgetPanel} data-category="deployment">
      <div className={styles.widgetTitle}>Bundle Performance</div>
      <div className={styles.widgetSubtitle}>Toggle prefetch and code splitting per MFE, adjust network speed</div>

      <div className={styles.sliderRow}>
        <label className={styles.sliderLabel} htmlFor="net-speed">
          Network Speed: {networkSpeed === 0.5 ? "Slow 3G" : networkSpeed === 1 ? "Fast 3G" : "WiFi"}
        </label>
        <input
          id="net-speed"
          type="range"
          className={styles.rangeInput}
          min={0.5}
          max={2}
          step={0.5}
          value={networkSpeed}
          onChange={e => setNetworkSpeed(Number(e.target.value))}
        />
      </div>

      <div className={styles.perfToggles}>
        {MFE_TEAMS.map(team => (
          <div key={team.id} className={styles.perfToggleRow}>
            <button
              type="button"
              className={styles.perfToggle}
              data-enabled={prefetch[team.id] ? "true" : undefined}
              onClick={() => togglePrefetch(team.id)}
              aria-pressed={prefetch[team.id]}
              aria-label={`Prefetch ${team.name}`}
            >
              <span className={styles.perfToggleLabel} style={{ color: team.color }}>{team.component}</span>
              <span className={styles.perfToggleStatus} data-enabled={prefetch[team.id] ? "true" : "false"}>
                {prefetch[team.id] ? "PREFETCH" : "ON-DEMAND"}
              </span>
            </button>
            <button
              type="button"
              className={styles.perfToggle}
              data-enabled={codeSplit[team.id] ? "true" : undefined}
              onClick={() => toggleCodeSplit(team.id)}
              aria-pressed={codeSplit[team.id]}
              aria-label={`Code split ${team.name}`}
            >
              <span className={styles.perfToggleStatus} data-enabled={codeSplit[team.id] ? "true" : "false"}>
                {codeSplit[team.id] ? "SPLIT" : "FULL"}
              </span>
            </button>
          </div>
        ))}
      </div>

      <div className={styles.waterfallContainer}>
        {MFE_TEAMS.map(team => {
          const time = times[team.id as keyof typeof times];
          const startOffset = prefetch[team.id] ? 0 : (team.id === "header" ? 0 : team.id === "products" ? 50 : 100) / networkSpeed;
          const widthPct = Math.min(100, (time / maxTime) * 100);
          const leftPct = Math.min(100 - widthPct, (startOffset / maxTime) * 100);
          return (
            <div key={team.id} className={styles.waterfallRow}>
              <span className={styles.waterfallLabel} style={{ color: team.color }}>{team.component}</span>
              <div className={styles.waterfallBar}>
                {noMotion ? (
                  <div
                    className={styles.waterfallFill}
                    style={{
                      width: `${widthPct}%`,
                      left: `${leftPct}%`,
                      backgroundColor: team.color,
                    }}
                  />
                ) : (
                  <motion.div
                    className={styles.waterfallFill}
                    style={{ backgroundColor: team.color }}
                    animate={{
                      width: `${widthPct}%`,
                      left: `${leftPct}%`,
                    }}
                    transition={TRANSITION.progress}
                  />
                )}
              </div>
              <span className={styles.waterfallTime}>{time}ms</span>
            </div>
          );
        })}
      </div>

      <div className={styles.perfMetrics}>
        <div className={styles.perfMetric}>
          <span className={styles.perfMetricLabel}>First MFE Ready</span>
          <span className={styles.perfMetricValue}>{firstReady}ms</span>
        </div>
        <div className={styles.perfMetric}>
          <span className={styles.perfMetricLabel}>Full Ready</span>
          <span className={styles.perfMetricValue}>{totalTime}ms</span>
        </div>
        <div className={styles.perfMetric}>
          <span className={styles.perfMetricLabel}>Total Time</span>
          <span className={styles.perfMetricValue}>{times.header + times.products + times.cart}ms</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 14 — TestingWidget
// ═══════════════════════════════════════════════════════════════════

type Contract = {
  id: string;
  source: string;
  target: string;
  type: string;
  status: "pending" | "pass" | "fail";
};

function TestingWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useMicrofrontend();
  const [predictionDone, setPredictionDone] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [newSource, setNewSource] = useState("products");
  const [newTarget, setNewTarget] = useState("cart");
  const [newType, setNewType] = useState("add-to-cart");
  const [broken, setBroken] = useState(false);
  const [hasSeenFail, setHasSeenFail] = useState(false);

  const addContract = useCallback(() => {
    setContracts(prev => [
      ...prev,
      { id: `c-${prev.length + 1}`, source: newSource, target: newTarget, type: newType, status: "pending" },
    ]);
  }, [newSource, newTarget, newType]);

  const runTests = useCallback(() => {
    setContracts(prev => prev.map(c => {
      if (broken && c.source === "products") {
        setHasSeenFail(true);
        return { ...c, status: "fail" as const };
      }
      return { ...c, status: "pass" as const };
    }));
  }, [broken]);

  const breakContract = useCallback(() => {
    setBroken(true);
    setContracts(prev => prev.map(c => ({ ...c, status: "pending" as const })));
  }, []);

  useEffect(() => {
    if (contracts.length >= 2 && hasSeenFail) markStepComplete(14);
  }, [contracts.length, hasSeenFail, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="testing">
      <div className={styles.widgetTitle}>Contract Testing</div>

      {!predictionDone && (
        <PredictionChallenge
          question="Team B changes its add-to-cart event payload from { productId } to { itemId }. What breaks?"
          options={[
            "Nothing — events are loosely typed",
            "Team C's cart — it expects productId in the payload",
            "Only the event bus middleware",
          ]}
          correctIndex={1}
          explanation="Without contract tests, Team C won't know about the breaking change until runtime. Contract tests catch this at build time."
          onComplete={() => setPredictionDone(true)}
        />
      )}

      <div className={styles.widgetSubtitle}>Define expected event contracts, then run tests. Break a contract to see failure.</div>

      <div className={styles.eventControls}>
        <div className={styles.eventRow}>
          <select className={styles.eventSelect} value={newSource} onChange={e => setNewSource(e.target.value)} aria-label="Contract source">
            {MFE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className={styles.contractArrowLabel}>→</span>
          <select className={styles.eventSelect} value={newTarget} onChange={e => setNewTarget(e.target.value)} aria-label="Contract target">
            {MFE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className={styles.eventSelect} value={newType} onChange={e => setNewType(e.target.value)} aria-label="Contract event type">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.buttonRowWrap}>
        <button type="button" className={styles.actionButton} onClick={addContract} aria-label="Add contract">
          Add Contract
        </button>
        <button type="button" className={styles.actionButton} data-variant="primary" onClick={runTests} disabled={contracts.length === 0} aria-label="Run contract tests">
          Run Tests
        </button>
        <button type="button" className={styles.actionButton} data-variant="danger" onClick={breakContract} aria-label="Break Team B contract">
          Break Team B&apos;s Contract
        </button>
      </div>

      {broken && (
        <div className={styles.widgetNote}>
          Team B changed event format: productId → itemId. Run tests to see which contracts fail.
        </div>
      )}

      {contracts.length > 0 && (
        <div className={styles.contractList}>
          {contracts.map((c, i) => (
            noMotion ? (
              <div key={c.id} className={styles.contractRow} data-status={c.status}>
                <span className={styles.contractSource}>{c.source}</span>
                <span className={styles.contractArrow}>→</span>
                <span className={styles.contractTarget}>{c.target}</span>
                <span className={styles.contractType}>{c.type}</span>
                <span className={styles.contractStatus} data-status={c.status}>{c.status.toUpperCase()}</span>
              </div>
            ) : (
              <motion.div
                key={c.id}
                className={styles.contractRow}
                data-status={c.status}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING.snappy, delay: i * STAGGER.fast }}
              >
                <span className={styles.contractSource}>{c.source}</span>
                <span className={styles.contractArrow}>→</span>
                <span className={styles.contractTarget}>{c.target}</span>
                <span className={styles.contractType}>{c.type}</span>
                <span className={styles.contractStatus} data-status={c.status}>{c.status.toUpperCase()}</span>
              </motion.div>
            )
          ))}
        </div>
      )}

      <div className={styles.widgetNote}>
        Contracts: {contracts.length}/2 | Seen failure: {hasSeenFail ? "yes" : "no"}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 15 — IntegrationWidget (CAPSTONE)
// ═══════════════════════════════════════════════════════════════════

// ── Scenario prediction data ───────────────────────────────────────

type ScenarioDef = {
  id: "deploy" | "cart" | "network";
  title: string;
  prediction: string;
  options: string[];
  correctIndex: number;
};

const SCENARIO_DEFS: ScenarioDef[] = [
  {
    id: "deploy",
    title: "Independent Deploy",
    prediction: "What will happen when Team B deploys a new version?",
    options: [
      "All MFEs restart to load the new code",
      "Only Team B reloads — Teams A and C are unaffected",
      "The app shell blocks until all teams redeploy together",
    ],
    correctIndex: 1,
  },
  {
    id: "cart",
    title: "Cross-MFE Event",
    prediction: "When the user clicks Add to Cart in Team B, how does Team C know?",
    options: [
      "Team B writes directly to Team C's state",
      "The event bus delivers an add-to-cart event to Team C",
      "The app shell refreshes the cart iframe",
    ],
    correctIndex: 1,
  },
  {
    id: "network",
    title: "Network Failure",
    prediction: "Team C loses network. What happens to Teams A and B?",
    options: [
      "The entire app crashes — they share a process",
      "Nothing — error boundaries isolate Team C's failure",
      "They show a loading spinner until Team C reconnects",
    ],
    correctIndex: 1,
  },
];

type MatrixQuestion = {
  question: string;
  correctAnswer: string;
  options: string[];
};

const DECISION_MATRIX: MatrixQuestion[] = [
  {
    question: "Which principle prevented the network failure from crashing all MFEs?",
    correctAnswer: "Error boundaries",
    options: ["Error boundaries", "Shared deps", "Event bus"],
  },
  {
    question: "Which mechanism let Team B deploy without restarting Team A?",
    correctAnswer: "Independent deployment",
    options: ["CSS scoping", "Independent deployment", "Shared deps"],
  },
  {
    question: "How did Team C's cart know about the new item from Team B?",
    correctAnswer: "Event bus",
    options: ["Shared state", "Event bus", "Error boundaries"],
  },
];

const CAPSTONE_EVENT_TYPES = ["add-to-cart", "remove-item", "update-quantity"] as const;

function IntegrationWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, bundleSize, eventCount, sendEvent, setLoadState, loadStates } = useMicrofrontend();

  // Scenario states
  const [deployTriggered, setDeployTriggered] = useState(false);
  const [cartTriggered, setCartTriggered] = useState(false);
  const [networkFailTriggered, setNetworkFailTriggered] = useState(false);
  const [scenarioLog, setScenarioLog] = useState<string[]>([]);
  const [errorIsolated, setErrorIsolated] = useState(false);

  // Configurable scenario parameters
  const [deployTeam, setDeployTeam] = useState(MFE_TEAMS[1]?.id ?? "products");
  const [eventType, setEventType] = useState<(typeof CAPSTONE_EVENT_TYPES)[number]>("add-to-cart");
  const [failTeam, setFailTeam] = useState(MFE_TEAMS[2]?.id ?? "cart");

  // Prediction states (one per scenario)
  const [predictions, setPredictions] = useState<Record<string, number | null>>({
    deploy: null,
    cart: null,
    network: null,
  });

  // Decision matrix states
  const [matrixAnswers, setMatrixAnswers] = useState<Record<number, string>>({});
  const [matrixRevealed, setMatrixRevealed] = useState<Set<number>>(new Set());

  const deployTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deployTimerRef.current) clearTimeout(deployTimerRef.current);
    };
  }, []);

  const deployTeamObj = MFE_TEAMS.find(t => t.id === deployTeam);
  const failTeamObj = MFE_TEAMS.find(t => t.id === failTeam);
  const otherTeams = MFE_TEAMS.filter(t => t.id !== failTeam);

  // Scenario handlers — use student-selected teams
  const handleDeploy = useCallback(() => {
    setDeployTriggered(true);
    setLoadState(deployTeam, "loading");
    setScenarioLog(prev => [...prev, `Deploying ${deployTeamObj?.name ?? deployTeam} — reloading MFE...`]);
    deployTimerRef.current = setTimeout(() => {
      setLoadState(deployTeam, "ready");
      const others = MFE_TEAMS.filter(t => t.id !== deployTeam).map(t => t.name).join(" and ");
      setScenarioLog(prev => [...prev, `${deployTeamObj?.name ?? deployTeam} v2.3.1 deployed — ${others} unaffected`]);
    }, 1500);
  }, [setLoadState, deployTeam, deployTeamObj]);

  const handleAddToCart = useCallback(() => {
    setCartTriggered(true);
    sendEvent({ type: eventType, from: "products", to: "cart", payload: `{"productId":"p-42","action":"${eventType}"}` });
    setScenarioLog(prev => [...prev, `Event: ${eventType} from products → cart`]);
  }, [sendEvent, eventType]);

  const handleNetworkFail = useCallback(() => {
    setNetworkFailTriggered(true);
    setErrorIsolated(true);
    setLoadState(failTeam, "error");
    setScenarioLog(prev => [
      ...prev,
      `Network failure on ${failTeamObj?.name ?? failTeam} — error boundary activated`,
      `${otherTeams.map(t => t.name).join(" and ")} continue operating normally`,
    ]);
  }, [setLoadState, failTeam, failTeamObj, otherTeams]);

  // Prediction handler
  const handlePrediction = useCallback((scenarioId: string, optionIndex: number) => {
    setPredictions(prev => ({ ...prev, [scenarioId]: optionIndex }));
  }, []);

  // Matrix handler
  const handleMatrixAnswer = useCallback((qIdx: number, answer: string) => {
    setMatrixAnswers(prev => ({ ...prev, [qIdx]: answer }));
    setMatrixRevealed(prev => new Set(prev).add(qIdx));
  }, []);

  const allTriggered = deployTriggered && cartTriggered && networkFailTriggered;

  const matrixCorrectCount = useMemo(() => {
    return DECISION_MATRIX.reduce((count, q, i) => {
      return count + (matrixAnswers[i] === q.correctAnswer ? 1 : 0);
    }, 0);
  }, [matrixAnswers]);

  const matrixComplete = matrixRevealed.size >= DECISION_MATRIX.length;

  useEffect(() => {
    if (allTriggered && matrixComplete && matrixCorrectCount >= 2) {
      markStepComplete(15);
    }
  }, [allTriggered, matrixComplete, matrixCorrectCount, markStepComplete]);

  const readyCount = Object.values(loadStates).filter(s => s === "ready").length;
  const errorCount = Object.values(loadStates).filter(s => s === "error").length;
  const unsharedTotal = 636;

  const scenarioOrder: ("deploy" | "cart" | "network")[] = ["deploy", "cart", "network"];
  const triggeredMap = { deploy: deployTriggered, cart: cartTriggered, network: networkFailTriggered };
  const actionMap = { deploy: handleDeploy, cart: handleAddToCart, network: handleNetworkFail };
  const buttonLabels = {
    deploy: { ready: `Deploy ${deployTeamObj?.name ?? "Team"}`, done: "Deployed" },
    cart: { ready: `Send ${eventType}`, done: "Event Sent" },
    network: { ready: `Crash ${failTeamObj?.name ?? "Team"}`, done: "Failed" },
  };
  const buttonVariants = { deploy: "primary", cart: "primary", network: "danger" };

  return (
    <div className={styles.widgetPanel} data-category="deployment">
      <div className={styles.widgetTitle}>Full System Simulation</div>
      <div className={styles.widgetSubtitle}>Configure each scenario, predict the outcome, then trigger</div>

      <div className={styles.mfePanelGrid}>
        {MFE_TEAMS.map(team => {
          const state = loadStates[team.id] ?? "idle";
          return (
            <div key={team.id} className={styles.mfePanel} data-state={state}>
              <div className={styles.mfePanelName} style={{ color: team.color }}>{team.name}</div>
              <div className={styles.mfePanelStatus} data-state={state}>{state}</div>
            </div>
          );
        })}
      </div>

      {scenarioOrder.map(scenarioId => {
        const def = SCENARIO_DEFS.find(s => s.id === scenarioId);
        if (!def) return null;
        const isTriggered = triggeredMap[scenarioId];
        const prediction = predictions[scenarioId];
        const hasPredicted = prediction !== null;
        const predictionCorrect = prediction === def.correctIndex;
        const variant = buttonVariants[scenarioId];

        return (
          <div key={scenarioId} className={styles.capstoneSection}>
            <div className={styles.capstoneSectionTitle}>{def.title}</div>

            {/* Configuration controls — student picks scenario parameters */}
            {!isTriggered && scenarioId === "deploy" && (
              <div className={styles.scenarioConfig}>
                <label className={styles.scenarioConfigLabel}>
                  Which team deploys?
                  <select className={styles.eventSelect} value={deployTeam} onChange={e => setDeployTeam(e.target.value)} aria-label="Select team to deploy" disabled={deployTriggered}>
                    {MFE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              </div>
            )}
            {!isTriggered && scenarioId === "cart" && (
              <div className={styles.scenarioConfig}>
                <label className={styles.scenarioConfigLabel}>
                  Event type to broadcast:
                  <select className={styles.eventSelect} value={eventType} onChange={e => setEventType(e.target.value as typeof eventType)} aria-label="Select event type" disabled={cartTriggered}>
                    {CAPSTONE_EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
            )}
            {!isTriggered && scenarioId === "network" && (
              <div className={styles.scenarioConfig}>
                <label className={styles.scenarioConfigLabel}>
                  Which team loses network?
                  <select className={styles.eventSelect} value={failTeam} onChange={e => setFailTeam(e.target.value)} aria-label="Select team to fail" disabled={networkFailTriggered}>
                    {MFE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              </div>
            )}

            {/* Prediction prompt */}
            {!hasPredicted && (
              <>
                <div className={styles.scenarioPrediction}>{def.prediction}</div>
                <div className={styles.predictionOptions} role="radiogroup" aria-label={def.prediction}>
                  {def.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.predictionOption}
                      onClick={() => handlePrediction(scenarioId, i)}
                      role="radio"
                      aria-checked={false}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Show prediction result + trigger */}
            {hasPredicted && !isTriggered && (
              <>
                <div className={styles.predictionResult} data-correct={predictionCorrect ? "true" : undefined}>
                  {predictionCorrect ? "Correct! " : "Not quite — "}{def.options[def.correctIndex]}
                </div>
                <button
                  type="button"
                  className={styles.actionButton}
                  data-variant={variant}
                  onClick={actionMap[scenarioId]}
                  aria-label={buttonLabels[scenarioId].ready}
                >
                  {buttonLabels[scenarioId].ready}
                </button>
              </>
            )}

            {/* Scenario already triggered */}
            {isTriggered && (
              noMotion ? (
                <div className={styles.widgetNote}>
                  {buttonLabels[scenarioId].done} — scenario complete
                </div>
              ) : (
                <motion.div
                  className={styles.widgetNote}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={TRANSITION.enterCard}
                >
                  {buttonLabels[scenarioId].done} — scenario complete
                </motion.div>
              )
            )}
          </div>
        );
      })}

      {/* Dashboard */}
      <div className={styles.dashboardGrid}>
        <div className={styles.dashboardCard}>
          <span className={styles.dashboardLabel}>Events</span>
          <span className={styles.dashboardValue} data-status={eventCount > 0 ? "good" : undefined}>{eventCount}</span>
        </div>
        <div className={styles.dashboardCard}>
          <span className={styles.dashboardLabel}>Bundle Savings</span>
          <span className={styles.dashboardValue} data-status="good">
            {bundleSize < unsharedTotal ? Math.round(((unsharedTotal - bundleSize) / unsharedTotal) * 100) : 0}%
          </span>
        </div>
        <div className={styles.dashboardCard}>
          <span className={styles.dashboardLabel}>MFEs Ready</span>
          <span className={styles.dashboardValue} data-status={readyCount === 3 ? "good" : errorCount > 0 ? "bad" : undefined}>
            {readyCount}/3
          </span>
        </div>
        <div className={styles.dashboardCard}>
          <span className={styles.dashboardLabel}>Error Isolation</span>
          <span className={styles.dashboardValue} data-status={errorIsolated ? "good" : undefined}>
            {errorIsolated ? "Active" : "Standby"}
          </span>
        </div>
      </div>

      {/* Scenario log */}
      {scenarioLog.length > 0 && (
        <div className={styles.eventLog} role="log" aria-label="Scenario log" aria-live="polite">
          {scenarioLog.map((entry, i) => (
            noMotion ? (
              <div key={i} className={styles.eventLogEntry}>
                <span className={styles.eventLogType}>{entry.startsWith("Deploy") || entry.startsWith("Team B") ? "DEPLOY" : entry.startsWith("Event") ? "EVENT" : "STATUS"}</span>
                <span>{entry}</span>
              </div>
            ) : (
              <motion.div
                key={i}
                className={styles.eventLogEntry}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING.quick, delay: i * 0.1 }}
              >
                <span className={styles.eventLogType}>{entry.startsWith("Deploy") || entry.startsWith("Team B") ? "DEPLOY" : entry.startsWith("Event") ? "EVENT" : "STATUS"}</span>
                <span>{entry}</span>
              </motion.div>
            )
          ))}
        </div>
      )}

      {/* Decision matrix — shown after all 3 scenarios */}
      {allTriggered && (
        <div className={styles.capstoneSection} aria-live="polite">
          <div className={styles.capstoneSectionTitle}>Decision Matrix</div>
          <div className={styles.widgetSubtitle}>Match each scenario to the principle that made it work. Need 2/3 correct.</div>
          {DECISION_MATRIX.map((q, qIdx) => {
            const isQRevealed = matrixRevealed.has(qIdx);
            const userAnswer = matrixAnswers[qIdx];
            const isQCorrect = userAnswer === q.correctAnswer;
            return (
              <div key={qIdx} className={styles.matrixRow}>
                <div className={styles.matrixQ}>{q.question}</div>
                <div className={styles.matrixOptions} role="radiogroup" aria-label={q.question}>
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={styles.matrixOptionBtn}
                      data-correct={isQRevealed && opt === q.correctAnswer ? "true" : undefined}
                      data-wrong={isQRevealed && userAnswer === opt && opt !== q.correctAnswer ? "true" : undefined}
                      onClick={() => !isQRevealed && handleMatrixAnswer(qIdx, opt)}
                      disabled={isQRevealed}
                      role="radio"
                      aria-checked={userAnswer === opt}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {isQRevealed && (
                  <div className={styles.matrixResult} data-pass={isQCorrect ? "true" : "false"}>
                    {isQCorrect ? "Correct!" : `The answer is: ${q.correctAnswer}`}
                  </div>
                )}
              </div>
            );
          })}
          {matrixComplete && (
            noMotion ? (
              <div className={styles.matrixResult} data-pass={matrixCorrectCount >= 2 ? "true" : "false"}>
                {matrixCorrectCount}/{DECISION_MATRIX.length} correct{matrixCorrectCount >= 2 ? " — lab complete!" : " — need at least 2/3"}
              </div>
            ) : (
              <motion.div
                className={styles.matrixResult}
                data-pass={matrixCorrectCount >= 2 ? "true" : "false"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING.gentle}
              >
                {matrixCorrectCount}/{DECISION_MATRIX.length} correct{matrixCorrectCount >= 2 ? " — lab complete!" : " — need at least 2/3"}
              </motion.div>
            )
          )}
        </div>
      )}

      <div className={styles.widgetNote}>
        Scenarios: {[deployTriggered, cartTriggered, networkFailTriggered].filter(Boolean).length}/3 | Matrix: {matrixRevealed.size}/{DECISION_MATRIX.length} ({matrixCorrectCount} correct)
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Shared: PredictionChallenge
// ═══════════════════════════════════════════════════════════════════

function PredictionChallenge({ question, options, correctIndex, explanation, onComplete }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  onComplete?: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  useEffect(() => {
    if (revealed && onComplete) onComplete();
  }, [revealed, onComplete]);

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
          {selected === correctIndex ? "Correct " : "Not quite "}{explanation}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  OfflineFirstProvider,
  useOfflineFirst,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  type TypeDef,
  type CacheStrategy,
  type SWState,
  type ConflictStrategy,
} from "./offline-first-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { OFFLINE_FIRST_ARCH_CONFIG } from "./architecture-scenarios";
import { StepBar } from "../_shared/StepBar";
import styles from "./OfflineFirstLab.module.css";

const STEP_LABELS = [
  "R", "A", "C",
  "Cache", "SW", "IDB", "Queue",
  "Sync", "Detect", "Resolve",
  "Opti", "BGSync", "Inv",
  "Quota", "Net",
];

// ── Public API ──────────────────────────────────────────────────────

export function OfflineFirstLab({ activeStep }: { activeStep: number }) {
  return (
    <OfflineFirstProvider activeStep={activeStep}>
      <OfflineFirstLabContent activeStep={activeStep} />
    </OfflineFirstProvider>
  );
}

function OfflineFirstLabContent({ activeStep }: { activeStep: number }) {
  const { stepCompleted } = useOfflineFirst();
  const isPlanning = activeStep <= 3;
  const noMotion = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    const firstFocusable = scrollRef.current?.querySelector(
      "button, [tabindex='0'], input, [role='radio']"
    ) as HTMLElement | null;
    firstFocusable?.focus({ preventScroll: true });
  }, [activeStep]);

  return (
    <div className={styles.labRoot}>
      <StepBar activeStep={activeStep} labels={STEP_LABELS} completedSteps={stepCompleted} />
      <div ref={scrollRef} className={styles.scrollArea}>
        {isPlanning ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`planning-${activeStep}`}
              initial={noMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={noMotion ? { duration: 0 } : TRANSITION.enterCard}
            >
              <PlanningView activeStep={activeStep} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <OfflineEvolution />
        )}
      </div>
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

function RequirementsView() {
  const { scopeEnabled, toggleScope, markStepComplete } = useOfflineFirst();

  useEffect(() => {
    if (scopeEnabled.size >= 2) markStepComplete(1);
  }, [scopeEnabled.size, markStepComplete]);

  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter((s) => scopeEnabled.has(s.id))
      .map((s) => s.label.replace("?", ""))
      .join(" + ");
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
    </div>
  );
}

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");
  const rafRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      setTab(tab === "endpoints" ? "types" : "endpoints");
      e.preventDefault();
      rafRef.current = requestAnimationFrame(() => {
        const next = (e.currentTarget as HTMLElement).parentElement?.querySelector('[aria-selected="true"]') as HTMLElement | null;
        next?.focus();
      });
    }
  };

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views">
        <button type="button" role="tab" className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} aria-selected={tab === "endpoints"} onClick={() => setTab("endpoints")} onKeyDown={handleTabKeyDown} tabIndex={tab === "endpoints" ? 0 : -1} id="tab-endpoints" aria-controls="panel-endpoints">
          Endpoints
        </button>
        <button type="button" role="tab" className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} aria-selected={tab === "types"} onClick={() => setTab("types")} onKeyDown={handleTabKeyDown} tabIndex={tab === "types" ? 0 : -1} id="tab-types" aria-controls="panel-types">
          Types
        </button>
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "endpoints" ? <EndpointChallenge /> : <TypeCards />}
      </div>
    </div>
  );
}

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

function EndpointChallenge() {
  const { markStepComplete } = useOfflineFirst();
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (revealed.size === API_ENDPOINTS.length) markStepComplete(2);
  }, [revealed.size, markStepComplete]);

  return (
    <div className={styles.endpointList}>
      {API_ENDPOINTS.map((ep) => {
        const key = `${ep.method}-${ep.path}`;
        const guess = guesses[key];
        const isRevealed = revealed.has(key);

        return (
          <div key={key} className={styles.endpointCard} data-revealed={isRevealed ? "true" : undefined}>
            {!isRevealed ? (
              <>
                <div className={styles.endpointHeader}>
                  <div className={styles.endpointPath}>{ep.path}</div>
                </div>
                <div className={styles.methodPicker} role="radiogroup" aria-label={`HTTP method for ${ep.path}`}>
                  {METHODS.map(m => (
                    <button
                      key={m} type="button" role="radio"
                      aria-checked={guess === m}
                      className={styles.methodOption}
                      data-method={m}
                      data-picked={guess === m ? "true" : undefined}
                      onClick={() => {
                        setGuesses(prev => ({ ...prev, [key]: m }));
                        if (m === ep.method) {
                          timersRef.current.push(setTimeout(() => setRevealed(prev => new Set(prev).add(key)), 400));
                        }
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.endpointHeader}>
                <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
                <span className={styles.endpointPath}>{ep.path}</span>
              </div>
            )}
            {guess && guess !== ep.method && !isRevealed && (
              <div className={styles.methodHint}>Not quite -- think about what this operation does to the resource.</div>
            )}
            {isRevealed && (
              <div className={styles.endpointDetail}>
                <div className={styles.endpointDesc}>{ep.description}</div>
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
      <div className={styles.metricsBar} aria-live="polite">
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
  props: "var(--diagram-layer-1)",
};

/** Build 2-3 type options per field for the TypeCard mini-challenge */
function buildTypeCardOptions(): Record<string, string[]> {
  const allTypes = Array.from(
    new Set(DATA_MODELS.flatMap(t => t.fields.map(f => f.type)))
  );
  const opts: Record<string, string[]> = {};
  for (const model of DATA_MODELS) {
    for (let i = 0; i < model.fields.length; i++) {
      const f = model.fields[i];
      if (!f) continue;
      const key = `${model.name}-${i}`;
      const distractors = allTypes.filter(t => t !== f.type);
      const shuffled = fisherYatesShuffle(distractors).slice(0, 2);
      opts[key] = fisherYatesShuffle([...shuffled, f.type]);
    }
  }
  return opts;
}

function TypeCards() {
  const totalFields = DATA_MODELS.reduce((sum, t) => sum + t.fields.length, 0);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const answeredCount = Object.keys(guesses).length;
  const correctCount = useMemo(() => {
    let count = 0;
    for (const model of DATA_MODELS) {
      for (let i = 0; i < model.fields.length; i++) {
        const f = model.fields[i];
        if (!f) continue;
        const key = `${model.name}-${i}`;
        if (guesses[key] === f.type) count++;
      }
    }
    return count;
  }, [guesses]);
  const fieldOptions = useMemo(buildTypeCardOptions, []);

  const handleGuess = useCallback((key: string, guess: string) => {
    setGuesses(prev => {
      if (prev[key] !== undefined) return prev;
      return { ...prev, [key]: guess };
    });
  }, []);

  return (
    <div className={styles.typeCardGrid}>
      {DATA_MODELS.map((t) => (
        <TypeCard key={t.name} typeDef={t} guesses={guesses} fieldOptions={fieldOptions} onGuess={handleGuess} />
      ))}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Answered</div>
          <div className={styles.metricValue} data-status={answeredCount === totalFields ? "good" : undefined}>
            {answeredCount}/{totalFields}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Correct</div>
          <div className={styles.metricValue} data-status={correctCount === totalFields ? "good" : correctCount > 0 ? "warning" : undefined}>
            {correctCount}/{totalFields}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeCard({ typeDef, guesses, fieldOptions, onGuess }: {
  typeDef: TypeDef;
  guesses: Record<string, string>;
  fieldOptions: Record<string, string[]>;
  onGuess: (key: string, guess: string) => void;
}) {
  const noMotion = usePrefersReducedMotion();
  const color = TYPE_CATEGORY_COLORS[typeDef.category];
  return (
    <div className={styles.typeCard} style={{ ["--type-color" as string]: color }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory}>{typeDef.category}</span>
      </div>
      <div className={styles.typeCardFields}>
        {typeDef.fields.map((f, i) => {
          const key = `${typeDef.name}-${i}`;
          const guess = guesses[key];
          const isAnswered = guess !== undefined;
          const isCorrect = guess === f.type;
          const options = fieldOptions[key] ?? [];
          return (
            <div key={i} className={styles.typeFieldRow} data-revealed={isAnswered ? "true" : undefined}>
              <div className={styles.schemaFieldHeader}>
                {f.name && <span className={styles.typeFieldName}>{f.name}</span>}
                {isAnswered && (
                  <motion.span
                    className={styles.schemaFeedback}
                    data-correct={isCorrect ? "true" : undefined}
                    initial={noMotion ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={noMotion ? { duration: 0 } : SPRING.quick}
                  >
                    {isCorrect ? "✓" : "✗"}
                  </motion.span>
                )}
              </div>
              {!isAnswered ? (
                <div className={styles.typeChoices} role="radiogroup" aria-label={`Type for ${f.name}`}>
                  {options.map(t => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={false}
                      className={styles.typeChoice}
                      onClick={() => onGuess(key, t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <span className={styles.typeFieldType}>{f.type}</span>
                  {f.note && <span className={styles.typeFieldNote}>{f.note}</span>}
                  {!isCorrect && <span className={styles.schemaHint}>You picked: {guess}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComponentTreeView() {
  const { markStepComplete } = useOfflineFirst();
  const scenariosViewed = useRef(new Set<number>());

  const handleScenarioChange = useCallback((idx: number) => {
    scenariosViewed.current.add(idx);
    if (scenariosViewed.current.size >= 2) markStepComplete(3);
  }, [markStepComplete]);

  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={OFFLINE_FIRST_ARCH_CONFIG} onScenarioChange={handleScenarioChange} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Offline evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function OfflineEvolution() {
  const ctx = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionLayout}>
      <OfflineMetricsBar />
      <AnimatePresence mode="wait">
        <motion.div
          key={`widget-${ctx.activeStep}`}
          initial={noMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={noMotion ? { duration: 0 } : TRANSITION.crossfade}
        >
          <StepWidget step={ctx.activeStep} />
        </motion.div>
      </AnimatePresence>
      <StateInspector entries={ctx.stateEntries} title="OfflineState" />
    </div>
  );
}

// ── Metrics bar ────────────────────────────────────────────────────

function OfflineMetricsBar() {
  const { isOnline, syncQueue, totalSyncs, conflictsDetected } = useOfflineFirst();
  const pendingCount = syncQueue.filter(e => e.status === "pending" || e.status === "syncing").length;

  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Offline-first metrics">
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={isOnline ? "good" : "bad"}>{isOnline ? "Online" : "Offline"}</span>
        <span className={styles.metricLabel}>Network</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={pendingCount > 0 ? "warning" : undefined}>{pendingCount}</span>
        <span className={styles.metricLabel}>Pending</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue}>{totalSyncs}</span>
        <span className={styles.metricLabel}>Syncs</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={conflictsDetected > 0 ? "warning" : undefined}>{conflictsDetected}</span>
        <span className={styles.metricLabel}>Conflicts</span>
      </div>
    </div>
  );
}

// ── Prediction challenge ──────────────────────────────────────────

function PredictionChallenge({ question, options, correctIndex, explanation, onAnswer }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  onAnswer?: () => void;
}) {
  const noMotion = usePrefersReducedMotion();
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
            onClick={() => { if (!revealed) { setSelected(i); onAnswer?.(); } }}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div
            className={styles.predictionResult}
            data-correct={selected === correctIndex ? "true" : undefined}
            initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            {selected === correctIndex ? "✓ " : "✗ "}{explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step widgets ──────────────────────────────────────────────────

function StepWidget({ step }: { step: number }) {
  switch (step) {
    case 4: return <CacheStrategyWidget />;
    case 5: return <ServiceWorkerLifecycleWidget />;
    case 6: return <IndexedDBSchemaWidget />;
    case 7: return <OfflineQueueWidget />;
    case 8: return <SyncEngineWidget />;
    case 9: return <ConflictDetectionWidget />;
    case 10: return <ConflictResolutionWidget />;
    case 11: return <OptimisticUIWidget />;
    case 12: return <BackgroundSyncWidget />;
    case 13: return <CacheInvalidationWidget />;
    case 14: return <StorageQuotaWidget />;
    case 15: return <NetworkStatusWidget />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 4: Cache Strategy
// ═══════════════════════════════════════════════════════════════════

const CACHE_STRATEGIES: { id: CacheStrategy; name: string; desc: string }[] = [
  { id: "cache-first", name: "Cache First", desc: "Check cache, fall back to network" },
  { id: "network-first", name: "Network First", desc: "Try network, fall back to cache" },
  { id: "stale-while-revalidate", name: "Stale-While-Revalidate", desc: "Serve stale, refresh in background" },
];

function CacheStrategyWidget() {
  const { cacheStrategy, setCacheStrategy, markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [simStep, setSimStep] = useState(0);
  const [triedStrategies, setTriedStrategies] = useState<Set<string>>(new Set(["stale-while-revalidate"]));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (triedStrategies.size >= 2 && simStep > 0) markStepComplete(4);
  }, [triedStrategies.size, simStep, markStepComplete]);

  const flowSteps = useMemo(() => {
    switch (cacheStrategy) {
      case "cache-first":
        return [
          { label: "Request", value: "GET /api/data", status: "active" },
          { label: "Cache", value: "Check Cache API", status: simStep >= 1 ? "hit" : "pending" },
          { label: "Response", value: simStep >= 1 ? "Serve from cache (2ms)" : "Waiting...", status: simStep >= 1 ? "hit" : "pending" },
          { label: "Network", value: simStep >= 2 ? "Skipped (cache hit)" : "Not reached", status: simStep >= 2 ? "miss" : "pending" },
        ];
      case "network-first":
        return [
          { label: "Request", value: "GET /api/data", status: "active" },
          { label: "Network", value: simStep >= 1 ? "Try server first" : "Connecting...", status: simStep >= 1 ? "active" : "pending" },
          { label: "Timeout", value: simStep >= 2 ? "Server responded (320ms)" : "Waiting...", status: simStep >= 2 ? "hit" : "pending" },
          { label: "Cache", value: simStep >= 2 ? "Updated with fresh data" : "Fallback ready", status: simStep >= 2 ? "hit" : "pending" },
        ];
      default:
        return [
          { label: "Request", value: "GET /api/data", status: "active" },
          { label: "Cache", value: simStep >= 1 ? "Serve stale (2ms)" : "Checking...", status: simStep >= 1 ? "hit" : "pending" },
          { label: "Network", value: simStep >= 2 ? "Fetch fresh in background" : "Pending...", status: simStep >= 2 ? "active" : "pending" },
          { label: "Update", value: simStep >= 3 ? "Cache refreshed for next visit" : "Not yet", status: simStep >= 3 ? "hit" : "pending" },
        ];
    }
  }, [cacheStrategy, simStep]);

  const runSim = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSimStep(0);
    let step = 0;
    const tick = () => {
      step++;
      setSimStep(step);
      if (step < flowSteps.length) {
        timerRef.current = setTimeout(tick, 600);
      }
    };
    timerRef.current = setTimeout(tick, 400);
  };

  return (
    <div className={styles.widgetPanel} data-category="cache">
      <div className={styles.widgetTitle}>Cache strategy -- request flow</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Cache strategy">
        {CACHE_STRATEGIES.map(s => (
          <button key={s.id} type="button" role="radio" aria-checked={cacheStrategy === s.id}
            className={styles.strategyOption} data-active={cacheStrategy === s.id ? "true" : undefined}
            onClick={() => { setCacheStrategy(s.id); setSimStep(0); setTriedStrategies(prev => new Set(prev).add(s.id)); }}>
            <span className={styles.strategyName}>{s.name}</span>
            <span className={styles.strategyDesc}>{s.desc}</span>
          </button>
        ))}
      </div>
      <div className={styles.flowDiagram}>
        {flowSteps.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className={styles.flowArrow}>
                <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
                  <path d="M6 0 L6 16 M2 12 L6 18 L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <motion.div
              className={styles.flowStage}
              data-active={simStep === i ? "true" : undefined}
              data-hit={s.status === "hit" && simStep >= i ? "true" : undefined}
              data-miss={s.status === "miss" && simStep >= i ? "true" : undefined}
              initial={noMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={noMotion ? { duration: 0 } : { ...SPRING.gentle, delay: i * STAGGER.fast }}
            >
              <span className={styles.flowStageLabel}>{s.label}</span>
              <span className={styles.flowStageValue}>{s.value}</span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>
      <button type="button" className={styles.actionButton} onClick={runSim}>
        Simulate request
      </button>
      <div className={styles.widgetNote}>
        Pick a strategy, then simulate a request to see how data flows through cache and network layers. Try all three strategies to compare tradeoffs.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 5: Service Worker Lifecycle
// ═══════════════════════════════════════════════════════════════════

const SW_STATES: SWState[] = ["installing", "waiting", "active", "redundant"];
const SW_TRANSITIONS: Record<SWState, { next: SWState; trigger: string }> = {
  installing: { next: "waiting", trigger: "install event fires, assets cached" },
  waiting: { next: "active", trigger: "clients.claim() or page reload" },
  active: { next: "redundant", trigger: "new SW version registered" },
  redundant: { next: "installing", trigger: "register() called with new script" },
};

type SWPrediction = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const SW_PREDICTIONS: Partial<Record<SWState, SWPrediction>> = {
  waiting: {
    question: "When does a waiting SW take over?",
    options: ["Immediately", "When all tabs close", "After 5 seconds"],
    correctIndex: 1,
    explanation: "A waiting SW activates only after all tabs using the old SW are closed (or skipWaiting() is called). This prevents breaking in-flight requests.",
  },
  active: {
    question: "What can an active SW intercept?",
    options: ["Only fetch events", "All DOM events", "Fetch + push + sync events"],
    correctIndex: 2,
    explanation: "An active SW handles fetch events (network proxy), push events (push notifications), and sync events (background sync). It cannot access the DOM directly.",
  },
  redundant: {
    question: "What happens to an active SW when a new version registers?",
    options: ["It is killed immediately", "It keeps running until tabs close", "It enters redundant state after the new SW activates"],
    correctIndex: 2,
    explanation: "The old SW stays active until the new one activates. Then the old one becomes redundant -- it can no longer intercept events and will be garbage collected.",
  },
};

function ServiceWorkerLifecycleWidget() {
  const { swState, setSWState, markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [visitedStates, setVisitedStates] = useState<Set<SWState>>(new Set(["installing"]));
  const [transitionLog, setTransitionLog] = useState<string[]>([]);
  const [pendingTarget, setPendingTarget] = useState<SWState | null>(null);
  const [predictionAnswers, setPredictionAnswers] = useState<Record<string, boolean>>({});

  const correctPredictions = Object.values(predictionAnswers).filter(Boolean).length;

  useEffect(() => {
    if (visitedStates.size >= 4 && correctPredictions >= 2) markStepComplete(5);
  }, [visitedStates.size, correctPredictions, markStepComplete]);

  const advanceState = (target: SWState) => {
    const transition = SW_TRANSITIONS[swState];
    if (target !== transition.next) return;

    const prediction = SW_PREDICTIONS[target];
    if (prediction && predictionAnswers[target] === undefined) {
      setPendingTarget(target);
      return;
    }

    setTransitionLog(prev => [...prev, `${swState} -> ${target}: ${transition.trigger}`]);
    setSWState(target);
    setVisitedStates(prev => new Set(prev).add(target));
    setPendingTarget(null);
  };

  const handlePredictionAnswer = (target: SWState, isCorrect: boolean) => {
    setPredictionAnswers(prev => ({ ...prev, [target]: isCorrect }));
  };

  const confirmAdvance = () => {
    if (!pendingTarget) return;
    const transition = SW_TRANSITIONS[swState];
    setTransitionLog(prev => [...prev, `${swState} -> ${pendingTarget}: ${transition.trigger}`]);
    setSWState(pendingTarget);
    setVisitedStates(prev => new Set(prev).add(pendingTarget));
    setPendingTarget(null);
  };

  const currentPrediction = pendingTarget ? SW_PREDICTIONS[pendingTarget] ?? null : null;

  return (
    <div className={styles.widgetPanel} data-category="cache">
      <div className={styles.widgetTitle}>Service Worker lifecycle -- state machine</div>
      <div className={styles.stateMachine}>
        {SW_STATES.map((state, i) => (
          <React.Fragment key={state}>
            {i > 0 && <span className={styles.stateArrow}>{"→"}</span>}
            <button
              type="button"
              className={styles.stateNode}
              data-current={swState === state ? "true" : undefined}
              data-visited={visitedStates.has(state) && swState !== state ? "true" : undefined}
              onClick={() => advanceState(state)}
              disabled={pendingTarget !== null && state !== pendingTarget}
              aria-label={`${state}${swState === state ? " (current)" : ""}`}
            >
              {state}
            </button>
          </React.Fragment>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {pendingTarget && currentPrediction ? (
          <motion.div
            key={`prediction-${pendingTarget}`}
            initial={noMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={noMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            <SWInlinePrediction
              prediction={currentPrediction}
              target={pendingTarget}
              onAnswer={handlePredictionAnswer}
              onContinue={confirmAdvance}
            />
          </motion.div>
        ) : (
          <motion.div
            key={swState}
            className={styles.stateTransition}
            initial={noMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={noMotion ? { duration: 0 } : TRANSITION.crossfade}
          >
            <strong>Next transition:</strong> {SW_TRANSITIONS[swState].trigger}
            {" -> "}<strong>{SW_TRANSITIONS[swState].next}</strong>
          </motion.div>
        )}
      </AnimatePresence>
      {transitionLog.length > 0 && (
        <div className={styles.timeline}>
          {transitionLog.map((log, i) => (
            <div key={i} className={styles.timelineEvent} data-success="true">
              <span className={styles.timelineMs}>{i + 1}.</span>
              <span className={styles.timelineLabel}>{log}</span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Current state</div>
          <div className={styles.metricValue}>{swState}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>States visited</div>
          <div className={styles.metricValue} data-status={visitedStates.size >= 4 ? "good" : undefined}>{visitedStates.size}/4</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Predictions</div>
          <div className={styles.metricValue} data-status={correctPredictions >= 2 ? "good" : undefined}>{correctPredictions}/3</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Click each state in order. Before advancing, predict what happens at the next stage. Visit all 4 states and answer 2+ predictions correctly to complete.
      </div>
    </div>
  );
}

function SWInlinePrediction({ prediction, target, onAnswer, onContinue }: {
  prediction: SWPrediction;
  target: SWState;
  onAnswer: (target: SWState, isCorrect: boolean) => void;
  onContinue: () => void;
}) {
  const noMotion = usePrefersReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div className={styles.prediction}>
      <div className={styles.predictionQ}>Before entering &quot;{target}&quot;: {prediction.question}</div>
      <div className={styles.predictionOptions} role="radiogroup" aria-label={prediction.question}>
        {prediction.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={styles.predictionOption}
            data-correct={revealed && i === prediction.correctIndex ? "true" : undefined}
            data-wrong={revealed && selected === i && i !== prediction.correctIndex ? "true" : undefined}
            onClick={() => {
              if (!revealed) {
                setSelected(i);
                onAnswer(target, i === prediction.correctIndex);
              }
            }}
            disabled={revealed}
            role="radio"
            aria-checked={selected === i}
          >
            {opt}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div
            className={styles.predictionResult}
            data-correct={selected === prediction.correctIndex ? "true" : undefined}
            initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            {selected === prediction.correctIndex ? "✓ " : "✗ "}{prediction.explanation}
          </motion.div>
        )}
      </AnimatePresence>
      {revealed && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={onContinue}
        >
          Advance to {target}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 6: IndexedDB Schema
// ═══════════════════════════════════════════════════════════════════

const IDB_STORES = [
  {
    name: "documents",
    fields: [
      { name: "id", type: "string (keyPath)", note: "primary key, UUID" },
      { name: "content", type: "string", note: "JSON-serialized document" },
      { name: "version", type: "number", note: "local version counter" },
      { name: "lastModified", type: "number", note: "ms since epoch" },
      { name: "syncStatus", type: "'synced'|'dirty'|'conflict'", note: "sync state flag" },
    ],
  },
  {
    name: "syncQueue",
    fields: [
      { name: "id", type: "string (keyPath)", note: "auto-generated" },
      { name: "docId", type: "string (indexed)", note: "references documents store" },
      { name: "operation", type: "'create'|'update'|'delete'" },
      { name: "payload", type: "Blob", note: "mutation data" },
      { name: "createdAt", type: "number (indexed)", note: "FIFO ordering" },
    ],
  },
  {
    name: "cacheMetadata",
    fields: [
      { name: "url", type: "string (keyPath)", note: "request URL" },
      { name: "etag", type: "string", note: "server ETag for validation" },
      { name: "cachedAt", type: "number", note: "when cached" },
      { name: "ttl", type: "number", note: "time-to-live in ms" },
    ],
  },
];

const TYPE_OPTIONS = [
  "string (keyPath)", "string (indexed)", "string", "number", "number (indexed)",
  "'synced'|'dirty'|'conflict'", "'create'|'update'|'delete'", "Blob",
];

/** Fisher-Yates shuffle -- unbiased O(n) */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j] as T;
    a[j] = tmp as T;
  }
  return a;
}

function buildFieldOptions(): Record<string, string[]> {
  const opts: Record<string, string[]> = {};
  for (const store of IDB_STORES) {
    for (let i = 0; i < store.fields.length; i++) {
      const f = store.fields[i];
      if (!f) continue;
      const key = `${store.name}-${i}`;
      const distractors = TYPE_OPTIONS.filter(t => t !== f.type);
      const shuffled = fisherYatesShuffle(distractors).slice(0, 3);
      const all = fisherYatesShuffle([...shuffled, f.type]);
      opts[key] = all;
    }
  }
  return opts;
}

function IndexedDBSchemaWidget() {
  const { markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const totalFields = IDB_STORES.reduce((sum, s) => sum + s.fields.length, 0);
  const fieldOptions = useMemo(buildFieldOptions, []);

  useEffect(() => {
    if (correctCount >= Math.ceil(totalFields * 0.6)) markStepComplete(6);
  }, [correctCount, totalFields, markStepComplete]);

  const handleGuess = (key: string, guess: string, correct: string) => {
    if (guesses[key]) return;
    setGuesses(prev => ({ ...prev, [key]: guess }));
    if (guess === correct) setCorrectCount(c => c + 1);
  };

  return (
    <div className={styles.widgetPanel} data-category="storage">
      <div className={styles.widgetTitle}>IndexedDB schema -- assign field types</div>
      <div className={styles.widgetNote}>
        For each field, pick the correct type. KeyPath and indexed fields are what make IndexedDB queries fast without scanning entire stores.
      </div>
      {IDB_STORES.map(store => (
        <div key={store.name}>
          <div className={styles.schemaStoreLabel}>{store.name}</div>
          <div className={styles.schemaTable}>
            {store.fields.map((f, i) => {
              const key = `${store.name}-${i}`;
              const guess = guesses[key];
              const isCorrect = guess === f.type;
              const isAnswered = guess !== undefined;
              const options = fieldOptions[key] ?? [];
              return (
                <div key={key} className={styles.schemaRow} data-revealed={isAnswered ? "true" : undefined}>
                  <div className={styles.schemaFieldHeader}>
                    <span className={styles.schemaField}>{f.name}</span>
                    {isAnswered && (
                      <motion.span
                        className={styles.schemaFeedback}
                        data-correct={isCorrect ? "true" : undefined}
                        initial={noMotion ? false : { scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={noMotion ? { duration: 0 } : SPRING.quick}
                      >
                        {isCorrect ? "✓" : "✗"}
                      </motion.span>
                    )}
                  </div>
                  {!isAnswered ? (
                    <div className={styles.typeChoices} role="radiogroup" aria-label={`Type for ${f.name}`}>
                      {options.map(t => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={false}
                          className={styles.typeChoice}
                          onClick={() => handleGuess(key, t, f.type)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <span className={styles.schemaType}>{f.type}</span>
                      <span className={styles.schemaNote}>{f.note}</span>
                      {!isCorrect && <span className={styles.schemaHint}>You picked: {guess}</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Correct</div>
          <div className={styles.metricValue} data-status={correctCount >= Math.ceil(totalFields * 0.6) ? "good" : undefined}>
            {correctCount}/{totalFields}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Object stores</div>
          <div className={styles.metricValue}>{IDB_STORES.length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Assign the correct type to each field. The answer always reveals the correct type with its purpose, so wrong guesses are still a learning opportunity.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 7: Offline Queue
// ═══════════════════════════════════════════════════════════════════

const QUEUE_OPERATIONS = [
  { operation: "UPDATE", payload: "doc-1: title changed" },
  { operation: "CREATE", payload: "doc-new: new document" },
  { operation: "DELETE", payload: "doc-old: remove draft" },
  { operation: "UPDATE", payload: "doc-2: body edited" },
];

function OfflineQueueWidget() {
  const { syncQueue, addToQueue, removeFromQueue, clearQueue, drainQueue, isOnline, setIsOnline, markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [nextOpIdx, setNextOpIdx] = useState(0);

  useEffect(() => {
    if (syncQueue.length >= 2 && syncQueue.some(e => e.status === "synced")) markStepComplete(7);
  }, [syncQueue, markStepComplete]);

  const addNextOp = () => {
    const op = QUEUE_OPERATIONS[nextOpIdx % QUEUE_OPERATIONS.length];
    if (op) {
      addToQueue({ operation: op.operation, payload: op.payload });
      setNextOpIdx(prev => prev + 1);
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="sync">
      <div className={styles.widgetTitle}>Offline queue -- pending operations</div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Network: {isOnline ? "Online" : "Offline"}</span>
        <button type="button" className={styles.toggleButton}
          data-on={isOnline ? "true" : undefined}
          onClick={() => setIsOnline(!isOnline)}
          aria-pressed={isOnline}>
          <span className={styles.toggleKnob} />
        </button>
      </div>
      <div className={styles.queueList}>
        {syncQueue.length === 0 ? (
          <div className={styles.queueEmpty}>Queue empty -- add operations below</div>
        ) : (
          <AnimatePresence initial={false}>
            {syncQueue.map(entry => (
              <motion.div
                key={entry.id}
                layout
                className={styles.queueEntry}
                data-status={entry.status}
                initial={noMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={noMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={noMotion ? { duration: 0 } : SPRING.snappy}
              >
                <span className={styles.queueOp}>{entry.operation}</span>
                <span className={styles.queuePayload}>{entry.payload}</span>
                <span className={styles.queueStatus} data-status={entry.status}>{entry.status}</span>
                {entry.status === "pending" && (
                  <button type="button" className={styles.removeButton} onClick={() => removeFromQueue(entry.id)} aria-label={`Remove ${entry.payload}`}>
                    x
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className={styles.propControls}>
        <button type="button" className={styles.actionButton} onClick={addNextOp}>
          + Add operation
        </button>
        <button type="button" className={styles.actionButton} onClick={drainQueue}
          disabled={syncQueue.length === 0 || !isOnline}>
          Drain queue
        </button>
        <button type="button" className={styles.toolButton} onClick={clearQueue}
          disabled={syncQueue.length === 0}>
          Clear all
        </button>
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Queue size</div>
          <div className={styles.metricValue} data-status={syncQueue.length > 3 ? "warning" : undefined}>{syncQueue.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Pending</div>
          <div className={styles.metricValue}>{syncQueue.filter(e => e.status === "pending").length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Network</div>
          <div className={styles.metricValue} data-status={isOnline ? "good" : "bad"}>{isOnline ? "ON" : "OFF"}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Add operations while offline. Toggle online to enable draining. Watch how the queue processes entries -- operations persist in IndexedDB and survive page reload.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 8: Sync Engine
// ═══════════════════════════════════════════════════════════════════

type SyncItemStatus = "pending" | "syncing" | "synced" | "failed" | "retrying";
type SyncItem = {
  id: string;
  op: string;
  payload: string;
  status: SyncItemStatus;
  retries: number;
  backoff: number | null;
};

const INITIAL_SYNC_ITEMS: SyncItem[] = [
  { id: "sq-1", op: "PUT", payload: "doc/meeting-notes", status: "pending", retries: 0, backoff: null },
  { id: "sq-2", op: "POST", payload: "doc/new-draft", status: "pending", retries: 0, backoff: null },
  { id: "sq-3", op: "DELETE", payload: "doc/old-archive", status: "pending", retries: 0, backoff: null },
];

function SyncEngineWidget() {
  const { markStepComplete, incrementSyncs } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [items, setItems] = useState<SyncItem[]>(INITIAL_SYNC_ITEMS);
  const [predictionAnswered, setPredictionAnswered] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const [syncComplete, setSyncComplete] = useState(false);
  const [syncRanOnce, setSyncRanOnce] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (syncComplete && predictionAnswered) {
      markStepComplete(8);
      incrementSyncs();
    }
  }, [syncComplete, predictionAnswered, markStepComplete, incrementSyncs]);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!isMountedRef.current) return;
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const processNext = useCallback((queue: SyncItem[], idx: number) => {
    if (!isMountedRef.current) return;
    if (idx >= queue.length) {
      setSyncing(false);
      setActiveIdx(-1);
      setSyncComplete(true);
      setSyncRanOnce(true);
      setLog(prev => [...prev, "Sync complete -- queue drained"]);
      return;
    }

    const item = queue[idx];
    if (!item) return;
    if (item.status === "synced") {
      processNext(queue, idx + 1);
      return;
    }

    setActiveIdx(idx);
    // Mark as syncing
    const syncing_ = queue.map((it, i) =>
      i === idx ? { ...it, status: "syncing" as SyncItemStatus } : it
    );
    setItems(syncing_);
    setLog(prev => [...prev, `Syncing: ${item.op} ${item.payload}...`]);

    // Simulate network delay, then resolve
    const delay = noMotion ? 100 : 600;
    scheduleTimer(() => {
      // Item at index 1 (POST doc/new-draft) fails on first attempt to show retry
      const willFail = idx === 1 && item.retries === 0;

      if (willFail) {
        const backoffMs = 1000 * Math.pow(2, item.retries); // 1s
        const failed = syncing_.map((it, i) =>
          i === idx ? { ...it, status: "failed" as SyncItemStatus, retries: it.retries + 1, backoff: backoffMs } : it
        );
        setItems(failed);
        setLog(prev => [...prev, `Failed: ${item.op} ${item.payload} -- retry in ${backoffMs}ms (exponential backoff)`]);

        // Auto-retry after backoff
        const retryDelay = noMotion ? 200 : 1200;
        scheduleTimer(() => {
          const retrying = failed.map((it, i) =>
            i === idx ? { ...it, status: "retrying" as SyncItemStatus, backoff: null } : it
          );
          setItems(retrying);
          setLog(prev => [...prev, `Retrying: ${item.op} ${item.payload} (attempt ${item.retries + 2})...`]);

          scheduleTimer(() => {
            const succeeded = retrying.map((it, i) =>
              i === idx ? { ...it, status: "synced" as SyncItemStatus } : it
            );
            setItems(succeeded);
            setLog(prev => [...prev, `Synced: ${item.op} ${item.payload}`]);
            scheduleTimer(() => processNext(succeeded, idx + 1), noMotion ? 50 : 300);
          }, delay);
        }, retryDelay);
      } else {
        const succeeded = syncing_.map((it, i) =>
          i === idx ? { ...it, status: "synced" as SyncItemStatus } : it
        );
        setItems(succeeded);
        setLog(prev => [...prev, `Synced: ${item.op} ${item.payload}`]);
        scheduleTimer(() => processNext(succeeded, idx + 1), noMotion ? 50 : 300);
      }
    }, delay);
  }, [noMotion, scheduleTimer]);

  const startSync = () => {
    setSyncing(true);
    setSyncComplete(false);
    setLog(["Sync engine started -- processing queue sequentially..."]);
    processNext(items, 0);
  };

  const resetSim = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setItems(INITIAL_SYNC_ITEMS);
    setSyncing(false);
    setActiveIdx(-1);
    setLog([]);
    setSyncComplete(false);
  };

  return (
    <div className={styles.widgetPanel} data-category="sync">
      <div className={styles.widgetTitle}>Sync engine -- interactive simulation</div>
      <div className={styles.queueList} aria-label="Sync queue">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              className={styles.queueEntry}
              data-status={item.status === "retrying" ? "syncing" : item.status}
              initial={noMotion ? false : { opacity: 0, y: -8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: activeIdx === i && syncing ? 1.02 : 1,
              }}
              transition={noMotion ? { duration: 0 } : SPRING.snappy}
            >
              <span className={styles.queueOp}>{item.op}</span>
              <span className={styles.queuePayload}>{item.payload}</span>
              <span className={styles.queueStatus} data-status={item.status === "retrying" ? "syncing" : item.status}>
                {item.status === "retrying" ? "retrying" : item.status}
              </span>
              {item.backoff !== null && (
                <span className={styles.propCount}>backoff: {item.backoff}ms</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className={styles.propControls}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={startSync}
          disabled={syncing || syncComplete}
          aria-label="Start sync"
        >
          {syncComplete ? "Sync done" : "Start sync"}
        </button>
        <button type="button" className={styles.toolButton} onClick={resetSim} disabled={syncing} aria-label="Reset simulation">
          {"↺ Reset"}
        </button>
      </div>
      {log.length > 0 && (
        <div className={styles.timeline} aria-live="polite">
          {log.map((entry, i) => (
            <div key={i} className={styles.timelineEvent}
              data-active={i === log.length - 1 ? "true" : undefined}
              data-success={entry.startsWith("Synced:") || entry.startsWith("Sync complete") ? "true" : undefined}
              data-rollback={entry.startsWith("Failed:") ? "true" : undefined}>
              <span className={styles.timelineMs}>{i + 1}.</span>
              <span className={styles.timelineLabel}>{entry}</span>
            </div>
          ))}
        </div>
      )}
      {syncRanOnce && (
        <PredictionChallenge
          question="You saw a failure and retry. What should happen when a sync request fails?"
          options={[
            "Drop the item and move on to the next",
            "Retry immediately in an infinite loop",
            "Retry with exponential backoff, then skip after max retries",
          ]}
          correctIndex={2}
          explanation="Exponential backoff avoids overwhelming the server. A max-retry cap prevents infinite loops. Failed items are flagged for manual review."
          onAnswer={() => setPredictionAnswered(true)}
        />
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Synced</div>
          <div className={styles.metricValue} data-status={items.every(i => i.status === "synced") ? "good" : undefined}>
            {items.filter(i => i.status === "synced").length}/{items.length}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Retries</div>
          <div className={styles.metricValue} data-status={items.some(i => i.retries > 0) ? "warning" : undefined}>
            {items.reduce((sum, i) => sum + i.retries, 0)}
          </div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Answer the prediction, then start the sync. Watch items process one at a time -- the second item will fail and retry with exponential backoff, showing how real sync engines handle transient failures.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 9: Conflict Detection
// ═══════════════════════════════════════════════════════════════════

function ConflictDetectionWidget() {
  const { markStepComplete, incrementConflicts } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [localVal, setLocalVal] = useState("Meeting at 3pm");
  const [remoteVal, setRemoteVal] = useState("Meeting at 4pm");
  const [localClock, setLocalClock] = useState({ A: 3, B: 1 });
  const [remoteClock, setRemoteClock] = useState({ A: 2, B: 2 });
  const [detected, setDetected] = useState(false);
  const [clockMods, setClockMods] = useState(0);
  const [conflictFound, setConflictFound] = useState(false);

  const hasConflict = useMemo(() => {
    const localDominates = Object.keys(remoteClock).every(k => (localClock[k as keyof typeof localClock] ?? 0) >= (remoteClock[k as keyof typeof remoteClock] ?? 0));
    const remoteDominates = Object.keys(localClock).every(k => (remoteClock[k as keyof typeof remoteClock] ?? 0) >= (localClock[k as keyof typeof localClock] ?? 0));
    return !localDominates && !remoteDominates;
  }, [localClock, remoteClock]);

  const detect = () => {
    setDetected(true);
    if (hasConflict) {
      incrementConflicts();
      setConflictFound(true);
    }
    if (clockMods >= 2 && hasConflict) markStepComplete(9);
  };

  const incrementClock = (side: "local" | "remote", device: "A" | "B") => {
    if (side === "local") {
      setLocalClock(prev => ({ ...prev, [device]: (prev[device] ?? 0) + 1 }));
    } else {
      setRemoteClock(prev => ({ ...prev, [device]: (prev[device] ?? 0) + 1 }));
    }
    setClockMods(c => c + 1);
    setDetected(false);
  };

  return (
    <div className={styles.widgetPanel} data-category="sync">
      <div className={styles.widgetTitle}>Conflict detection -- vector clocks</div>
      <div className={styles.conflictRow}>
        <div className={styles.conflictSide}>
          <span className={styles.conflictSideLabel} data-side="local">Local version</span>
          <input type="text" className={styles.conflictSideField} value={localVal}
            onChange={e => { setLocalVal(e.target.value); setDetected(false); }}
            aria-label="Local document value" />
          <div className={styles.vectorClock}>
            {(["A", "B"] as const).map(device => (
              <div key={device} className={styles.vectorEntry}>
                <span className={styles.vectorDevice}>Device {device}</span>
                <span className={styles.vectorCount}>{localClock[device]}</span>
                <button type="button" className={styles.toolButton}
                  onClick={() => incrementClock("local", device)}
                  aria-label={`Increment local device ${device} clock`}>+1</button>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.conflictSide}>
          <span className={styles.conflictSideLabel} data-side="remote">Remote version</span>
          <input type="text" className={styles.conflictSideField} value={remoteVal}
            onChange={e => { setRemoteVal(e.target.value); setDetected(false); }}
            aria-label="Remote document value" />
          <div className={styles.vectorClock}>
            {(["A", "B"] as const).map(device => (
              <div key={device} className={styles.vectorEntry}>
                <span className={styles.vectorDevice}>Device {device}</span>
                <span className={styles.vectorCount}>{remoteClock[device]}</span>
                <button type="button" className={styles.toolButton}
                  onClick={() => incrementClock("remote", device)}
                  aria-label={`Increment remote device ${device} clock`}>+1</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className={`${styles.actionButton} ${styles.fullWidthButton}`} onClick={detect}>
        Detect conflict
      </button>
      <AnimatePresence>
        {detected && (
          <motion.div
            className={styles.predictionResult}
            data-correct={hasConflict ? undefined : "true"}
            initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            {hasConflict
              ? `Conflict detected! Neither vector clock dominates -- versions diverged concurrently. Local: [A:${localClock.A}, B:${localClock.B}] vs Remote: [A:${remoteClock.A}, B:${remoteClock.B}]`
              : `No conflict. One version dominates the other -- safe to fast-forward.`}
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Conflict?</div>
          <div className={styles.metricValue} data-status={detected ? (hasConflict ? "bad" : "good") : undefined}>
            {detected ? (hasConflict ? "YES" : "NO") : "---"}
          </div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Edit both sides and adjust vector clocks. A conflict exists when neither clock dominates -- meaning both devices made changes the other has not seen.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 10: Conflict Resolution
// ═══════════════════════════════════════════════════════════════════

const RESOLUTION_STRATEGIES: { id: ConflictStrategy; name: string; desc: string }[] = [
  { id: "lww", name: "Last Writer Wins", desc: "Latest timestamp wins, other is discarded" },
  { id: "merge", name: "Three-Way Merge", desc: "Compute diff from common ancestor, merge both" },
  { id: "manual", name: "Manual Resolution", desc: "Present both versions to user for decision" },
];

function ConflictResolutionWidget() {
  const { conflictStrategy, setConflictStrategy, markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [localDoc, setLocalDoc] = useState("The quick brown fox");
  const [remoteDoc, setRemoteDoc] = useState("The slow brown dog");
  const [resolved, setResolved] = useState<string | null>(null);
  const [manualChoice, setManualChoice] = useState<"local" | "remote" | null>(null);
  const triedStrategies = useRef(new Set<string>());

  const resolve = useCallback(() => {
    triedStrategies.current.add(conflictStrategy);
    switch (conflictStrategy) {
      case "lww":
        setResolved(remoteDoc);
        break;
      case "merge": {
        const localWords = localDoc.split(" ");
        const remoteWords = remoteDoc.split(" ");
        const merged = localWords.map((w, i) => {
          const rw = remoteWords[i];
          if (!rw) return w;
          return w === rw ? w : `${w}|${rw}`;
        });
        if (remoteWords.length > localWords.length) {
          merged.push(...remoteWords.slice(localWords.length));
        }
        setResolved(merged.join(" "));
        break;
      }
      case "manual":
        if (manualChoice === "local") setResolved(localDoc);
        else if (manualChoice === "remote") setResolved(remoteDoc);
        break;
    }
    if (triedStrategies.current.size >= 2) markStepComplete(10);
  }, [conflictStrategy, localDoc, remoteDoc, manualChoice, markStepComplete]);

  useEffect(() => { setResolved(null); setManualChoice(null); }, [conflictStrategy, localDoc, remoteDoc]);

  return (
    <div className={styles.widgetPanel} data-category="sync">
      <div className={styles.widgetTitle}>Conflict resolution -- strategy picker</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Resolution strategy">
        {RESOLUTION_STRATEGIES.map(s => (
          <button key={s.id} type="button" role="radio" aria-checked={conflictStrategy === s.id}
            className={styles.strategyOption} data-active={conflictStrategy === s.id ? "true" : undefined}
            onClick={() => setConflictStrategy(s.id)}>
            <span className={styles.strategyName}>{s.name}</span>
            <span className={styles.strategyDesc}>{s.desc}</span>
          </button>
        ))}
      </div>
      <div className={styles.conflictRow}>
        <div className={styles.conflictSide}>
          <span className={styles.conflictSideLabel} data-side="local">Local</span>
          <input type="text" className={styles.conflictSideField} value={localDoc}
            onChange={e => setLocalDoc(e.target.value)} aria-label="Local document" />
        </div>
        <div className={styles.conflictSide}>
          <span className={styles.conflictSideLabel} data-side="remote">Remote</span>
          <input type="text" className={styles.conflictSideField} value={remoteDoc}
            onChange={e => setRemoteDoc(e.target.value)} aria-label="Remote document" />
        </div>
      </div>
      {conflictStrategy === "manual" && !resolved && (
        <div className={styles.strategyGroup} role="radiogroup" aria-label="Manual choice">
          <button type="button" role="radio" aria-checked={manualChoice === "local"}
            className={styles.strategyOption} data-active={manualChoice === "local" ? "true" : undefined}
            onClick={() => setManualChoice("local")}>
            <span className={styles.strategyName}>Keep local</span>
          </button>
          <button type="button" role="radio" aria-checked={manualChoice === "remote"}
            className={styles.strategyOption} data-active={manualChoice === "remote" ? "true" : undefined}
            onClick={() => setManualChoice("remote")}>
            <span className={styles.strategyName}>Keep remote</span>
          </button>
        </div>
      )}
      <button type="button" className={`${styles.actionButton} ${styles.fullWidthButton}`}
        onClick={resolve}
        disabled={conflictStrategy === "manual" && !manualChoice}>
        Apply {conflictStrategy === "lww" ? "LWW" : conflictStrategy === "merge" ? "merge" : "decision"}
      </button>
      <AnimatePresence mode="wait">
        {resolved !== null && (
          <motion.div
            key={`${conflictStrategy}-${resolved}`}
            className={styles.conflictResult}
            initial={noMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            <span className={styles.conflictResultLabel}>Result</span>
            <span className={styles.conflictResultValue}>{resolved}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.widgetNote}>
        Edit both documents, pick a strategy, and resolve. LWW is simplest but loses data. Merge preserves both but may produce odd results. Manual is safest but requires user attention.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 11: Optimistic UI
// ═══════════════════════════════════════════════════════════════════

function OptimisticUIWidget() {
  const { markStepComplete } = useOfflineFirst();
  const [mode, setMode] = useState<"optimistic" | "pessimistic">("optimistic");
  const [simState, setSimState] = useState<"idle" | "pending" | "success" | "rollback">("idle");
  const [shouldFail, setShouldFail] = useState(false);
  const [uiValue, setUiValue] = useState("Hello World");
  const [serverValue, setServerValue] = useState("Hello World");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [triedModes, setTriedModes] = useState<Set<string>>(new Set(["optimistic"]));

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (triedModes.size >= 2 && simState !== "idle") markStepComplete(11);
  }, [triedModes.size, simState, markStepComplete]);

  const simulate = () => {
    const newVal = `Updated at ${new Date().toLocaleTimeString()}`;
    setSimState("pending");

    if (mode === "optimistic") {
      setUiValue(newVal); // immediate
    }

    timerRef.current = setTimeout(() => {
      if (shouldFail) {
        setSimState("rollback");
        if (mode === "optimistic") {
          setUiValue(serverValue); // rollback
        }
      } else {
        setSimState("success");
        setServerValue(newVal);
        if (mode === "pessimistic") {
          setUiValue(newVal); // only now
        }
      }
    }, 1500);
  };

  const timelineEvents = useMemo(() => {
    if (mode === "optimistic") {
      return [
        { ms: "0ms", label: "User action", status: "active" as const },
        { ms: "0ms", label: `UI updates to "${uiValue}"`, status: simState !== "idle" ? "active" as const : "pending" as const },
        { ms: "0-2s", label: "Network request in flight", status: simState === "pending" ? "active" as const : simState !== "idle" ? "active" as const : "pending" as const },
        { ms: simState === "rollback" ? "1.5s" : "1.5s", label: shouldFail ? "Server rejects -- ROLLBACK" : "Server confirms", status: simState === "success" ? "success" as const : simState === "rollback" ? "rollback" as const : "pending" as const },
      ];
    }
    return [
      { ms: "0ms", label: "User action", status: "active" as const },
      { ms: "0ms", label: "Show loading spinner", status: simState !== "idle" ? "active" as const : "pending" as const },
      { ms: "0-2s", label: "Wait for server response", status: simState === "pending" ? "active" as const : simState !== "idle" ? "active" as const : "pending" as const },
      { ms: "1.5s", label: shouldFail ? "Show error message" : "UI updates with confirmed data", status: simState === "success" ? "success" as const : simState === "rollback" ? "rollback" as const : "pending" as const },
    ];
  }, [mode, simState, shouldFail, uiValue]);

  return (
    <div className={styles.widgetPanel} data-category="network">
      <div className={styles.widgetTitle}>Optimistic vs pessimistic UI</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="UI mode">
        {(["optimistic", "pessimistic"] as const).map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m}
            className={styles.strategyOption} data-active={mode === m ? "true" : undefined}
            onClick={() => { setMode(m); setSimState("idle"); setTriedModes(prev => new Set(prev).add(m)); }}>
            <span className={styles.strategyName}>{m}</span>
            <span className={styles.strategyDesc}>
              {m === "optimistic" ? "Update UI immediately, rollback on failure" : "Wait for server confirmation before updating UI"}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Simulate server failure</span>
        <button type="button" className={styles.toggleButton}
          data-on={shouldFail ? "true" : undefined}
          onClick={() => { setShouldFail(v => !v); setSimState("idle"); }}
          aria-pressed={shouldFail}>
          <span className={styles.toggleKnob} />
        </button>
      </div>
      <div className={styles.timeline}>
        {timelineEvents.map((event, i) => (
          <div key={i} className={styles.timelineEvent}
            data-active={event.status === "active" ? "true" : undefined}
            data-success={event.status === "success" ? "true" : undefined}
            data-rollback={event.status === "rollback" ? "true" : undefined}>
            <span className={styles.timelineMs}>{event.ms}</span>
            <span className={styles.timelineLabel}>{event.label}</span>
          </div>
        ))}
      </div>
      <button type="button" className={`${styles.actionButton} ${styles.fullWidthButton}`}
        onClick={simulate} disabled={simState === "pending"}>
        {simState === "pending" ? "Waiting for server..." : "Simulate mutation"}
      </button>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>UI shows</div>
          <div className={styles.metricValue}>{uiValue.length > 20 ? uiValue.slice(0, 20) + "..." : uiValue}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Server has</div>
          <div className={styles.metricValue}>{serverValue.length > 20 ? serverValue.slice(0, 20) + "..." : serverValue}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Status</div>
          <div className={styles.metricValue} data-status={simState === "success" ? "good" : simState === "rollback" ? "bad" : simState === "pending" ? "warning" : undefined}>
            {simState === "idle" ? "Ready" : simState}
          </div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        {mode === "optimistic"
          ? "UI updates instantly. If the server rejects, the change rolls back. Best for low-latency feel -- but you need rollback logic."
          : "UI stays in loading state until server confirms. Safer but feels sluggish. Toggle failure mode to see error handling."}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 12: Background Sync
// ═══════════════════════════════════════════════════════════════════

function BackgroundSyncWidget() {
  const { markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [failureRate, setFailureRate] = useState(50);
  const [attempts, setAttempts] = useState<{ delay: number; success: boolean }[]>([]);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (attempts.some(a => a.success)) markStepComplete(12);
  }, [attempts, markStepComplete]);

  const runBackoff = useCallback(() => {
    setAttempts([]);
    setRunning(true);
    let attempt = 0;

    const trySync = () => {
      const delay = Math.min(1000 * Math.pow(2, attempt), 32000);
      const success = Math.random() * 100 >= failureRate;
      attempt++;

      setAttempts(prev => [...prev, { delay, success }]);

      if (success || attempt >= 8) {
        setRunning(false);
      } else {
        timerRef.current = setTimeout(trySync, 300); // sped up for demo
      }
    };

    timerRef.current = setTimeout(trySync, 200);
  }, [failureRate]);

  const maxDelay = Math.max(1, ...attempts.map(a => a.delay));

  return (
    <div className={styles.widgetPanel} data-category="network">
      <div className={styles.widgetTitle}>Background sync -- exponential backoff</div>
      <PredictionChallenge
        question="Why use exponential backoff instead of fixed retry intervals?"
        options={[
          "It is simpler to implement",
          "It prevents thundering herd and reduces server load during outages",
          "It guarantees faster recovery times",
        ]}
        correctIndex={1}
        explanation="Fixed intervals cause all clients to retry simultaneously (thundering herd). Exponential backoff spreads retries over time, giving the server room to recover."
      />
      <div className={styles.toggleRow}>
        <label className={styles.widgetSliderLabel} htmlFor="failure-rate">
          Failure rate: {failureRate}%
        </label>
        <input id="failure-rate" type="range" min={0} max={100} step={10}
          value={failureRate} onChange={e => setFailureRate(Number(e.target.value))}
          className={styles.widgetSlider}
          aria-valuetext={`${failureRate}% failure rate`} />
      </div>
      {attempts.length > 0 && (
        <div className={styles.backoffChart}>
          {attempts.map((a, i) => (
            <motion.div
              key={i}
              className={styles.backoffColumn}
              initial={noMotion ? false : { opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={noMotion ? { duration: 0 } : { ...SPRING.gentle, delay: i * STAGGER.fast }}
            >
              <div className={styles.backoffBar}
                data-failed={!a.success ? "true" : undefined}
                data-success={a.success ? "true" : undefined}
                style={{ height: `${(a.delay / maxDelay) * 100}%` }} />
              <span className={styles.backoffLabel}>{a.delay >= 1000 ? `${(a.delay / 1000).toFixed(0)}s` : `${a.delay}ms`}</span>
            </motion.div>
          ))}
        </div>
      )}
      <button type="button" className={`${styles.actionButton} ${styles.fullWidthButton}`}
        onClick={runBackoff} disabled={running}>
        {running ? "Retrying..." : "Start sync attempt"}
      </button>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Attempts</div>
          <div className={styles.metricValue}>{attempts.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Last delay</div>
          <div className={styles.metricValue}>{attempts.length > 0 ? `${((attempts[attempts.length - 1]?.delay ?? 0) / 1000).toFixed(1)}s` : "---"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Result</div>
          <div className={styles.metricValue} data-status={attempts.some(a => a.success) ? "good" : attempts.length > 0 ? "bad" : undefined}>
            {attempts.some(a => a.success) ? "Synced" : attempts.length >= 8 ? "Failed" : running ? "..." : "---"}
          </div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Adjust the failure rate slider and watch retry delays double each attempt. The bar chart shows how delays grow exponentially, giving the server time to recover.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 13: Cache Invalidation
// ═══════════════════════════════════════════════════════════════════

type CacheVersionEntry = { url: string; version: number; cachedAt: number; stale: boolean; ttlRemaining: number };

type ServeResult = { url: string; servedVersion: number; serverVersion: number; wasStale: boolean };

const CACHE_TTL_SECONDS = 10;

function CacheInvalidationWidget() {
  const { markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [entries, setEntries] = useState<CacheVersionEntry[]>([
    { url: "/api/posts", version: 1, cachedAt: 0, stale: false, ttlRemaining: CACHE_TTL_SECONDS },
    { url: "/api/user", version: 1, cachedAt: 0, stale: false, ttlRemaining: CACHE_TTL_SECONDS },
    { url: "/assets/app.js", version: 1, cachedAt: 0, stale: false, ttlRemaining: CACHE_TTL_SECONDS },
    { url: "/assets/styles.css", version: 1, cachedAt: 0, stale: false, ttlRemaining: CACHE_TTL_SECONDS },
  ]);
  const [serverVersion, setServerVersion] = useState(1);
  const [deployCount, setDeployCount] = useState(0);
  const [staleServeCount, setStaleServeCount] = useState(0);
  const [serveLog, setServeLog] = useState<ServeResult[]>([]);
  const ttlIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Tick TTL every second
    ttlIntervalRef.current = setInterval(() => {
      setEntries(prev => prev.map(e => {
        if (e.stale || e.ttlRemaining <= 0) return e;
        const next = e.ttlRemaining - 1;
        if (next <= 0) return { ...e, ttlRemaining: 0, stale: true };
        return { ...e, ttlRemaining: next };
      }));
    }, 1000);
    return () => {
      if (ttlIntervalRef.current) clearInterval(ttlIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (deployCount >= 2 && staleServeCount >= 1) markStepComplete(13);
  }, [deployCount, staleServeCount, markStepComplete]);

  const bumpServer = () => {
    const newVersion = serverVersion + 1;
    setServerVersion(newVersion);
    setDeployCount(c => c + 1);
    // Mark API entries as stale immediately (server changed), static assets keep their TTL
    setEntries(prev => prev.map((e, i) =>
      i < 2 ? { ...e, stale: true, ttlRemaining: 0 } : e
    ));
  };

  const serveRequest = () => {
    // Pick a random entry and serve it to a "user"
    const idx = Math.floor(Math.random() * entries.length);
    const entry = entries[idx];
    if (!entry) return;
    const wasStale = entry.stale || entry.version < serverVersion;
    const result: ServeResult = {
      url: entry.url,
      servedVersion: entry.version,
      serverVersion,
      wasStale,
    };
    setServeLog(prev => [...prev.slice(-4), result]);
    if (wasStale) setStaleServeCount(c => c + 1);
  };

  const refreshStale = () => {
    setEntries(prev => prev.map(e =>
      e.stale ? { ...e, version: serverVersion, stale: false, cachedAt: Date.now(), ttlRemaining: CACHE_TTL_SECONDS } : e
    ));
  };

  const staleCount = entries.filter(e => e.stale).length;

  return (
    <div className={styles.widgetPanel} data-category="cache">
      <div className={styles.widgetTitle}>Cache invalidation -- version-based staleness</div>
      <PredictionChallenge
        question="What is the hardest part of cache invalidation?"
        options={[
          "Storing cached data efficiently",
          "Knowing WHEN to invalidate -- stale data is invisible until it causes bugs",
          "Choosing between localStorage and IndexedDB",
        ]}
        correctIndex={1}
        explanation="The famous two hard things in CS. Stale data looks identical to fresh data. Version tokens, ETags, and TTLs help detect staleness, but getting the timing right is the challenge."
      />
      <div className={styles.versionList}>
        {entries.map(e => (
          <div key={e.url} className={styles.versionEntry}
            data-stale={e.stale ? "true" : undefined}
            data-fresh={!e.stale && e.cachedAt > 0 ? "true" : undefined}>
            <span className={styles.versionKey}>{e.url}</span>
            <span className={styles.versionNumber}>v{e.version}</span>
            <span className={styles.versionAge}>{e.stale ? "STALE" : "fresh"}</span>
            <span className={styles.ttlBadge}
              data-expired={e.ttlRemaining <= 0 ? "true" : undefined}
              data-low={e.ttlRemaining > 0 && e.ttlRemaining <= 3 ? "true" : undefined}>
              TTL: {e.ttlRemaining}s
            </span>
          </div>
        ))}
      </div>
      <div className={styles.propControls}>
        <button type="button" className={styles.actionButton} onClick={bumpServer}>
          Deploy v{serverVersion + 1}
        </button>
        <button type="button" className={styles.actionButton} onClick={serveRequest}>
          Serve request
        </button>
        <button type="button" className={styles.actionButton} onClick={refreshStale}
          disabled={staleCount === 0}>
          Refresh stale ({staleCount})
        </button>
      </div>
      {serveLog.length > 0 && (
        <div className={styles.timeline} aria-live="polite">
          <AnimatePresence initial={false}>
            {serveLog.map((result, i) => (
              <motion.div
                key={`serve-${i}-${result.url}`}
                className={styles.timelineEvent}
                data-rollback={result.wasStale ? "true" : undefined}
                data-success={!result.wasStale ? "true" : undefined}
                initial={noMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={noMotion ? { duration: 0 } : SPRING.snappy}
              >
                <span className={styles.timelineMs}>{i + 1}.</span>
                <span className={styles.timelineLabel}>
                  {result.wasStale
                    ? `User saw v${result.servedVersion} but server has v${result.serverVersion}!`
                    : `Served fresh v${result.servedVersion} for ${result.url}`}
                </span>
                <span className={styles.timelineStatus}>
                  {result.wasStale ? "STALE" : "OK"}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Server version</div>
          <div className={styles.metricValue}>v{serverVersion}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Stale entries</div>
          <div className={styles.metricValue} data-status={staleCount > 0 ? "warning" : "good"}>{staleCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Stale serves</div>
          <div className={styles.metricValue} data-status={staleServeCount > 0 ? "bad" : "good"}>{staleServeCount}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Deploy to bump the server version, then hit &quot;Serve request&quot; to see a user receive stale data. Watch TTL timers count down -- entries auto-expire. Refresh stale to update the cache. Complete by deploying 2+ times and serving at least 1 stale response.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 14: Storage Quota
// ═══════════════════════════════════════════════════════════════════

function StorageQuotaWidget() {
  const { storageEntries, addStorageEntry, removeStorageEntry, storageUsed, storageQuota, markStepComplete } = useOfflineFirst();
  const noMotion = usePrefersReducedMotion();
  const [hitThreshold, setHitThreshold] = useState(false);
  const [evictionRan, setEvictionRan] = useState(false);

  useEffect(() => {
    if ((storageUsed / storageQuota) * 100 > 80) setHitThreshold(true);
  }, [storageUsed, storageQuota]);

  useEffect(() => {
    if (hitThreshold && evictionRan) markStepComplete(14);
  }, [hitThreshold, evictionRan, markStepComplete]);

  const usagePercent = (storageUsed / storageQuota) * 100;
  const isCritical = usagePercent > 90;
  const isWarning = usagePercent > 70;

  const addRandomEntry = () => {
    const size = Math.floor(Math.random() * 8000) + 2000;
    const key = `doc-${Date.now().toString(36)}`;
    addStorageEntry({ key, value: `Content (${(size / 1024).toFixed(1)}KB)`, size, version: 1 });
  };

  const evictLRU = () => {
    // Remove oldest (first) entry
    const sorted = [...storageEntries].sort((a, b) => a.lastAccessed - b.lastAccessed);
    if (sorted.length > 0) {
      const oldest = sorted[0];
      if (!oldest) return;
      removeStorageEntry(oldest.key);
      setEvictionRan(true);
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="storage">
      <div className={styles.widgetTitle}>Storage quota -- LRU eviction</div>
      <div className={styles.storageBarOuter}>
        <div className={styles.storageBarInner}
          data-critical={isCritical ? "true" : undefined}
          data-warning={isWarning && !isCritical ? "true" : undefined}
          style={{ width: `${Math.min(100, usagePercent)}%` }} />
      </div>
      <div className={styles.storageItemList}>
        {storageEntries.length === 0 ? (
          <div className={styles.queueEmpty}>No entries -- add some data below</div>
        ) : (
          <AnimatePresence initial={false}>
            {storageEntries.map(e => (
              <motion.div
                key={e.key}
                layout
                className={styles.storageItem}
                initial={noMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={noMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={noMotion ? { duration: 0 } : SPRING.gentle}
              >
                <span className={styles.storageItemKey}>{e.key}</span>
                <span className={styles.storageItemSize}>{(e.size / 1024).toFixed(1)}KB</span>
                <button type="button" className={styles.removeButton}
                  onClick={() => removeStorageEntry(e.key)}
                  aria-label={`Remove ${e.key}`}>x</button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className={styles.propControls}>
        <button type="button" className={styles.actionButton} onClick={addRandomEntry}>
          + Add data
        </button>
        <button type="button" className={styles.actionButton} onClick={evictLRU}
          disabled={storageEntries.length === 0}>
          Evict LRU
        </button>
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Usage</div>
          <div className={styles.metricValue} data-status={isCritical ? "bad" : isWarning ? "warning" : "good"}>
            {(storageUsed / 1024).toFixed(1)}KB
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Quota</div>
          <div className={styles.metricValue}>{(storageQuota / 1024).toFixed(0)}KB</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Entries</div>
          <div className={styles.metricValue}>{storageEntries.length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Add data until the bar turns red (over quota). Then click &quot;Evict LRU&quot; to remove the least-recently-accessed entry. Real apps trigger this automatically when navigator.storage.estimate() nears the limit.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 15: Network Status
// ═══════════════════════════════════════════════════════════════════

const NETWORK_STATES = [
  { online: true, label: "Online", uiMessage: "All changes saved", queueAction: "Draining queue..." },
  { online: false, label: "Offline", uiMessage: "Working offline -- changes will sync when reconnected", queueAction: "Queue paused" },
  { online: true, label: "Slow 3G", uiMessage: "Poor connection -- some features may be slower", queueAction: "Throttled sync" },
];

function NetworkStatusWidget() {
  const { isOnline, setIsOnline, syncQueue, addToQueue, drainQueue, markStepComplete } = useOfflineFirst();
  const [stateIdx, setStateIdx] = useState(0);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [triedStates, setTriedStates] = useState<Set<number>>(new Set([0]));
  const [predictionAnswered, setPredictionAnswered] = useState(false);

  useEffect(() => {
    if (triedStates.size >= 2 && predictionAnswered) markStepComplete(15);
  }, [triedStates.size, predictionAnswered, markStepComplete]);

  const switchState = (idx: number) => {
    const state = NETWORK_STATES[idx];
    if (!state) return;
    const prevState = NETWORK_STATES[stateIdx];
    setStateIdx(idx);
    setIsOnline(state.online);
    setTriedStates(prev => new Set(prev).add(idx));
    setTransitions(prev => [...prev, `${prevState?.label ?? "?"} -> ${state.label}`]);

    // Auto-add queue items when going offline, auto-drain when going online
    if (!state.online) {
      addToQueue({ operation: "UPDATE", payload: "auto-queued: offline edit" });
    } else if (syncQueue.filter(e => e.status === "pending").length > 0) {
      drainQueue();
    }
  };

  const currentState = NETWORK_STATES[stateIdx];
  const hasInteracted = transitions.length >= 1;

  return (
    <div className={styles.widgetPanel} data-category="network">
      <div className={styles.widgetTitle}>Network status -- adaptive UI</div>
      <div className={styles.networkIndicator} data-online={isOnline ? "true" : "false"}>
        <span className={styles.networkDot} />
        {currentState?.label ?? "Unknown"}: {currentState?.uiMessage ?? ""}
      </div>
      <div className={styles.strategyGroup}>
        {NETWORK_STATES.map((state, i) => (
          <button key={i} type="button"
            className={styles.strategyOption}
            data-active={stateIdx === i ? "true" : undefined}
            onClick={() => switchState(i)}>
            <span className={styles.strategyName}>{state.online ? (i === 2 ? "Slow" : "Online") : "Offline"}</span>
            <span className={styles.strategyDesc}>{state.label}</span>
          </button>
        ))}
      </div>
      {transitions.length > 0 && (
        <div className={styles.timeline}>
          {transitions.map((t, i) => (
            <div key={i} className={styles.timelineEvent} data-active="true">
              <span className={styles.timelineMs}>{i + 1}.</span>
              <span className={styles.timelineLabel}>{t}</span>
            </div>
          ))}
        </div>
      )}
      {hasInteracted && (
        <PredictionChallenge
          question="Now that you have toggled states: how should an offline-first app respond to navigator.onLine returning true?"
          options={[
            "Immediately sync all pending data -- the connection is definitely back",
            "Treat it as a hint and verify with a real network request before syncing",
            "Ignore it -- navigator.onLine is completely unreliable",
          ]}
          correctIndex={1}
          explanation="navigator.onLine only indicates if the device has a network interface up -- it does not mean the server is reachable. Always verify with a lightweight health check (HEAD request) before draining the sync queue."
          onAnswer={() => setPredictionAnswered(true)}
        />
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Status</div>
          <div className={styles.metricValue} data-status={isOnline ? "good" : "bad"}>
            {currentState?.label ?? "---"}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Queue action</div>
          <div className={styles.metricValue}>{currentState?.queueAction ?? "---"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Transitions</div>
          <div className={styles.metricValue}>{transitions.length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Toggle between network states to see how the UI adapts. Going offline pauses sync and queues mutations. After interacting, answer the prediction to complete this step.
      </div>
    </div>
  );
}

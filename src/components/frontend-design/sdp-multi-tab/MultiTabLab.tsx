"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  MultiTabProvider,
  useMultiTab,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  type TypeDef,
  type ConflictStrategy,
} from "./multi-tab-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { MULTI_TAB_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./MultiTabLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function MultiTabLab({ activeStep }: { activeStep: number }) {
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
    <MultiTabProvider activeStep={activeStep}>
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
            <TabSyncEvolution />
          )}
        </div>
      </div>
    </MultiTabProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "BC", "Msg", "Reg",
  "Lead", "Sync", "Conf",
  "LS", "SW", "Life",
  "Thr", "Mem", "Lock",
];

const STEP_TITLES = [
  "Requirements", "API Design", "Architecture",
  "BroadcastChannel", "Message Protocol", "Tab Registry",
  "Leader Election", "State Sync", "Conflict Resolution",
  "localStorage Events", "SharedWorker", "Tab Lifecycle",
  "Throttling", "Memory Pressure", "Lock API",
];

function StepBar({ activeStep }: { activeStep: number }) {
  const { stepCompleted } = useMultiTab();
  return (
    <div className={styles.stepBar} role="list" aria-label="Build progress">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const completed = stepCompleted[step] || step < activeStep;
        return (
          <span
            key={i}
            role="listitem"
            className={styles.stepDot}
            data-active={step <= activeStep ? "true" : undefined}
            data-current={step === activeStep ? "true" : undefined}
            data-completed={completed ? "true" : undefined}
            aria-current={step === activeStep ? "step" : undefined}
            aria-label={`Step ${step}: ${STEP_TITLES[i]}${completed ? " (complete)" : ""}`}
          >
            {completed && step < activeStep ? "✓" : label}
          </span>
        );
      })}
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
  const { scopeEnabled, toggleScope, markStepComplete } = useMultiTab();

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
    if (e.key === "ArrowRight") setTab(tab === "endpoints" ? "types" : "endpoints");
    else if (e.key === "ArrowLeft") setTab(tab === "endpoints" ? "types" : "endpoints");
    else return;
    e.preventDefault();
    rafRef.current = requestAnimationFrame(() => {
      const next = (e.currentTarget as HTMLElement).parentElement?.querySelector('[aria-selected="true"]') as HTMLElement;
      next?.focus();
    });
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
  const { markStepComplete } = useMultiTab();
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

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

function TypeCards() {
  const totalFields = DATA_MODELS.reduce((sum, t) => sum + t.fields.length, 0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const revealField = (key: string) => setRevealed(prev => new Set(prev).add(key));

  return (
    <div className={styles.typeCardGrid}>
      {DATA_MODELS.map((t) => (
        <TypeCard key={t.name} typeDef={t} revealed={revealed} onReveal={revealField} />
      ))}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Explored</div>
          <div className={styles.metricValue} data-status={revealed.size === totalFields ? "good" : undefined}>
            {revealed.size}/{totalFields}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeCard({ typeDef, revealed, onReveal }: { typeDef: TypeDef; revealed: Set<string>; onReveal: (key: string) => void }) {
  const color = TYPE_CATEGORY_COLORS[typeDef.category];
  return (
    <div className={styles.typeCard} style={{ borderTopColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
      <div className={styles.typeCardHeader}>
        <span className={styles.typeCardName}>{typeDef.name}</span>
        <span className={styles.typeCardCategory} style={{ color }}>{typeDef.category}</span>
      </div>
      <div className={styles.typeCardFields}>
        {typeDef.fields.map((f, i) => {
          const key = `${typeDef.name}-${i}`;
          const isRevealed = revealed.has(key);
          return (
            <button
              key={i}
              type="button"
              className={styles.typeFieldRow}
              data-revealed={isRevealed ? "true" : undefined}
              onClick={() => onReveal(key)}
              aria-expanded={isRevealed}
            >
              {f.name && <span className={styles.typeFieldName}>{f.name}</span>}
              {isRevealed ? (
                <>
                  <span className={styles.typeFieldType}>{f.type}</span>
                  {f.note && <span className={styles.typeFieldNote}>{f.note}</span>}
                </>
              ) : (
                <span className={styles.typeFieldType}>tap to reveal type</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ComponentTreeView() {
  const { markStepComplete } = useMultiTab();
  const [scenariosViewed, setScenariosViewed] = useState(0);
  const prevScenarioRef = useRef<number | null>(null);

  // Track scenario changes via a polling interval on the player's DOM
  // Since ArchitectureScenarioPlayer doesn't expose onScenarioComplete,
  // mark complete after the user has interacted enough (viewed 2+ scenarios)
  useEffect(() => {
    if (scenariosViewed >= 2) markStepComplete(3);
  }, [scenariosViewed, markStepComplete]);

  // Detect scenario navigation by observing active step indicator changes
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      const activeIndicator = el.querySelector('[data-scenario-idx]');
      if (activeIndicator) {
        const idx = Number(activeIndicator.getAttribute('data-scenario-idx'));
        if (!isNaN(idx) && prevScenarioRef.current !== null && idx !== prevScenarioRef.current) {
          setScenariosViewed(prev => prev + 1);
        }
        prevScenarioRef.current = idx;
      }
    });
    observer.observe(el, { subtree: true, attributes: true, childList: true });
    return () => observer.disconnect();
  }, []);

  // Fallback: auto-complete after meaningful engagement time (8 seconds)
  useEffect(() => {
    const timer = setTimeout(() => markStepComplete(3), 8000);
    return () => clearTimeout(timer);
  }, [markStepComplete]);

  return (
    <div className={styles.planningPanel} ref={containerRef}>
      <ArchitectureScenarioPlayer config={MULTI_TAB_ARCH_CONFIG} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tab sync evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function TabSyncEvolution() {
  const ctx = useMultiTab();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionLayout}>
      <TopMetricsBar />
      <TabListViz />
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
      <StateInspector entries={ctx.stateEntries} title="SyncState" />
    </div>
  );
}

// ── Top metrics bar ─────────────────────────────────────────────────

function TopMetricsBar() {
  const { tabs, messageCount, leaderId, conflictStrategy } = useMultiTab();
  const activeCount = tabs.filter(t => t.visibility !== "terminated").length;

  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Multi-tab metrics">
      <div className={styles.metric}>
        <span className={styles.metricValue}>{tabs.length}</span>
        <span className={styles.metricLabel}>Tabs</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status="good">{activeCount}</span>
        <span className={styles.metricLabel}>Active</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={messageCount > 10 ? "warning" : undefined}>{messageCount}</span>
        <span className={styles.metricLabel}>Messages</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue}>{leaderId ? leaderId.slice(-1) : "--"}</span>
        <span className={styles.metricLabel}>Leader</span>
      </div>
    </div>
  );
}

// ── Tab list visualization ──────────────────────────────────────────

function TabListViz() {
  const { tabs } = useMultiTab();
  const noMotion = usePrefersReducedMotion();
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className={styles.tabListViz} role="list" aria-label="Active tabs">
      <AnimatePresence>
        {tabs.map(tab => (
          <motion.div
            key={tab.id}
            role="listitem"
            className={styles.tabCard}
            data-leader={tab.isLeader ? "true" : undefined}
            data-visibility={tab.visibility}
            initial={noMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={noMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={SPRING.snappy}
            layout={!noMotion}
          >
            <div className={styles.tabCardHeader}>
              <span className={styles.tabCardName}>{tab.label}</span>
              <span className={styles.tabCardBadge} data-role={tab.isLeader ? "leader" : "follower"}>
                {tab.isLeader ? "LEADER" : "follower"}
              </span>
            </div>
            <div className={styles.tabCardMeta}>
              <span className={styles.heartbeatDot} data-status={
                tab.visibility === "terminated" ? "dead"
                : Date.now() - tab.lastHeartbeat > 10000 ? "stale"
                : "alive"
              } />
              {tab.visibility}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Prediction challenge ────────────────────────────────────────────

function PredictionChallenge({ question, options, correctIndex, explanation }: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const noMotion = usePrefersReducedMotion();
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
      <AnimatePresence>
        {revealed && (
          <motion.div
            className={styles.predictionResult}
            data-correct={selected === correctIndex ? "true" : undefined}
            initial={noMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={noMotion ? undefined : { opacity: 0, scale: 0.92 }}
            transition={SPRING.snappy}
          >
            {selected === correctIndex ? "✓ " : "✗ "}{explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step controls (prediction toggles before certain steps) ────────

function StepControls() {
  const { activeStep } = useMultiTab();
  switch (activeStep) {
    case 7:
      return <PredictionChallenge
        question="In the Bully algorithm, which tab becomes leader?"
        options={[
          "The tab that first detects the leader is dead",
          "The tab with the highest ID among alive tabs",
          "A random alive tab, chosen by coin flip",
        ]}
        correctIndex={1}
        explanation="The Bully algorithm always selects the highest-ID alive process. When a tab detects the leader is down, it sends election messages to all higher-ID tabs. If none respond, it declares itself leader."
      />;
    case 9:
      return <PredictionChallenge
        question="Two tabs edit the same key simultaneously. With LWW (Last Writer Wins), which value persists?"
        options={[
          "The first write -- it arrived first",
          "The write with the higher timestamp",
          "Both -- they are merged character by character",
        ]}
        correctIndex={1}
        explanation="LWW compares timestamps. The write with the later timestamp wins, the earlier one is silently discarded. Simple but lossy -- one edit is always dropped."
      />;
    case 12:
      return <PredictionChallenge
        question="A tab transitions from 'visible' to 'hidden'. What changes for JavaScript execution?"
        options={[
          "All JS stops immediately -- no code runs in hidden tabs",
          "setTimeout/setInterval get throttled to max 1/sec",
          "Nothing changes -- hidden tabs run at full speed",
        ]}
        correctIndex={1}
        explanation="Browsers throttle timers in hidden tabs to at most once per second (Chrome) or even more aggressively. requestAnimationFrame stops entirely. This saves CPU and battery but means your heartbeat interval drifts."
      />;
    default:
      return null;
  }
}

// ── Scope badge ─────────────────────────────────────────────────────

const STEP_SCOPE_MAP: Record<number, string> = {
  4: "broadcastChannel",
  10: "storageEvents",
  11: "sharedWorker",
  7: "leaderElection",
  12: "tabLifecycle", 13: "tabLifecycle",
};

function ScopeBadge({ step, expanded, onToggle }: { step: number; expanded: boolean; onToggle: () => void }) {
  const { scopeEnabled } = useMultiTab();
  const scopeId = STEP_SCOPE_MAP[step];
  if (!scopeId) return null;
  const inScope = scopeEnabled.has(scopeId);
  if (inScope) {
    return (
      <div className={styles.scopeBadge} data-in-scope="true">
        In your scope
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
      {expanded ? "Bonus topic (collapse)" : "Bonus topic -- click to explore"}
    </button>
  );
}

// ── Step widgets ────────────────────────────────────────────────────

function StepWidget({ step }: { step: number }) {
  const { scopeEnabled } = useMultiTab();
  const [bonusExpanded, setBonusExpanded] = useState(false);
  const scopeId = STEP_SCOPE_MAP[step];
  const isOutOfScope = scopeId && !scopeEnabled.has(scopeId);

  const Widget = (() => {
    switch (step) {
      case 4: return BroadcastChannelWidget;
      case 5: return MessageProtocolWidget;
      case 6: return TabRegistryWidget;
      case 7: return LeaderElectionWidget;
      case 8: return StateSyncWidget;
      case 9: return ConflictResolutionWidget;
      case 10: return LocalStorageWidget;
      case 11: return SharedWorkerWidget;
      case 12: return TabLifecycleWidget;
      case 13: return ThrottlingWidget;
      case 14: return MemoryPressureWidget;
      case 15: return LockApiWidget;
      default: return null;
    }
  })();
  if (!Widget) return null;
  return (
    <>
      <StepControls />
      <ScopeBadge step={step} expanded={bonusExpanded} onToggle={() => setBonusExpanded(v => !v)} />
      {(!isOutOfScope || bonusExpanded) && <Widget />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 4: BroadcastChannel
// ═══════════════════════════════════════════════════════════════════

function BroadcastChannelWidget() {
  const { tabs, sendMessage, messages, clearMessages, markStepComplete } = useMultiTab();
  const [inputVal, setInputVal] = useState("");
  const [fromTab, setFromTab] = useState(tabs[0]?.id ?? "");
  const uniqueSenders = useRef<Set<string>>(new Set());

  useEffect(() => {
    messages.forEach(m => uniqueSenders.current.add(m.from));
    if (messages.length >= 3 && uniqueSenders.current.size >= 2) markStepComplete(4);
  }, [messages, markStepComplete]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    sendMessage({
      type: "state-sync",
      from: fromTab,
      to: "broadcast",
      payload: inputVal,
    });
    setInputVal("");
  };

  return (
    <div className={styles.widgetPanel} data-category="channel">
      <div className={styles.widgetTitle}>BroadcastChannel -- cross-tab messaging</div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Send from</span>
        <div className={styles.strategyGroup} role="radiogroup" aria-label="Source tab">
          {tabs.map(t => (
            <button key={t.id} type="button" role="radio" aria-checked={fromTab === t.id}
              className={styles.strategyOption} data-active={fromTab === t.id ? "true" : undefined}
              onClick={() => setFromTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.toggleRow}>
        <input
          className={styles.editorInput}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message..."
          aria-label="Message content"
        />
        <button type="button" className={styles.actionButton} onClick={handleSend} disabled={!inputVal.trim()}>
          Send
        </button>
      </div>
      <MessageLog messages={messages} />
      {messages.length > 0 && (
        <button type="button" className={styles.toolButton} onClick={clearMessages}>
          Clear log
        </button>
      )}
      <div className={styles.widgetNote}>
        Send messages from different tabs. All messages appear in the shared log -- BroadcastChannel delivers to every other tab on the same origin. The sender does NOT receive its own message.
      </div>
    </div>
  );
}

function MessageLog({ messages }: { messages: { id: string; type: string; from: string; to: string; payload: string; timestamp: number }[] }) {
  const noMotion = usePrefersReducedMotion();
  return (
    <div className={styles.messageLog} role="log" aria-label="Message log">
      {messages.length === 0 ? (
        <div className={styles.emptyLog}>No messages yet</div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              className={styles.messageEntry}
              data-type={msg.type}
              initial={noMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={noMotion ? undefined : { opacity: 0, x: 12 }}
              transition={SPRING.snappy}
            >
              <span className={styles.msgTypeBadge}>{msg.type}</span>
              <span className={styles.msgFrom}>{msg.from.slice(-1)}</span>
              <span className={styles.msgArrow}>{"→"}</span>
              <span className={styles.msgPayload}>{msg.payload}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 5: Message Protocol
// ═══════════════════════════════════════════════════════════════════

const MESSAGE_TYPES = [
  { type: "state-sync", desc: "Carries a state diff to synchronize across tabs", fields: ["from", "payload: StateDiff", "version"] },
  { type: "action", desc: "User action that needs leader coordination", fields: ["from", "action: string", "args: unknown[]"] },
  { type: "heartbeat", desc: "Periodic alive signal from each tab", fields: ["from", "tabId", "timestamp"] },
  { type: "election", desc: "Leader election messages (ELECTION, OK, COORDINATOR)", fields: ["from", "phase", "candidateId"] },
] as const;

const MSG_SCENARIOS = [
  { scenario: "Tab A edited a document and needs to push the change to Tab B", correctType: "state-sync" },
  { scenario: "Tab C checks in to prove it is still alive", correctType: "heartbeat" },
  { scenario: "The leader tab has crashed and a new leader must be chosen", correctType: "election" },
  { scenario: "User clicks 'Save' and the request must go through the leader", correctType: "action" },
] as const;

function MessageProtocolWidget() {
  const { markStepComplete } = useMultiTab();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<number, string>>({});
  const [scenarioCorrect, setScenarioCorrect] = useState(0);

  useEffect(() => {
    if (revealed.size === MESSAGE_TYPES.length && scenarioCorrect >= 2) markStepComplete(5);
  }, [revealed.size, scenarioCorrect, markStepComplete]);

  const handleScenarioGuess = (idx: number, guess: string) => {
    if (scenarioAnswers[idx] !== undefined) return;
    setScenarioAnswers(prev => ({ ...prev, [idx]: guess }));
    if (guess === MSG_SCENARIOS[idx]!.correctType) {
      setScenarioCorrect(prev => prev + 1);
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="channel">
      <div className={styles.widgetTitle}>Message protocol -- typed message envelopes</div>
      <div className={styles.widgetNote}>Tap each message type to reveal its fields. A well-typed protocol prevents runtime surprises.</div>
      {MESSAGE_TYPES.map(mt => {
        const isRevealed = revealed.has(mt.type);
        return (
          <button
            key={mt.type}
            type="button"
            className={styles.typeFieldRow}
            data-revealed={isRevealed ? "true" : undefined}
            onClick={() => setRevealed(prev => new Set(prev).add(mt.type))}
            aria-expanded={isRevealed}
            style={{ minHeight: 44, background: "var(--color-surface)", borderRadius: "var(--radius-1)", padding: "var(--space-2)" }}
          >
            <span className={styles.typeFieldName}>{mt.type}</span>
            {isRevealed ? (
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className={styles.typeFieldNote}>{mt.desc}</span>
                <span className={styles.typeFieldType}>{mt.fields.join(", ")}</span>
              </span>
            ) : (
              <span className={styles.typeFieldType}>tap to reveal fields</span>
            )}
          </button>
        );
      })}
      <div className={styles.widgetTitle} style={{ fontSize: "0.65rem", marginTop: "var(--space-2)" }}>
        Match the scenario to the correct message type
      </div>
      {MSG_SCENARIOS.map((sc, idx) => {
        const answer = scenarioAnswers[idx];
        const isCorrect = answer === sc.correctType;
        return (
          <div key={idx} className={styles.prediction} style={{ padding: "var(--space-2)" }}>
            <div className={styles.predictionQ} style={{ fontSize: "0.65rem" }}>{sc.scenario}</div>
            <div className={styles.strategyGroup} role="radiogroup" aria-label={sc.scenario}>
              {MESSAGE_TYPES.map(mt => (
                <button
                  key={mt.type}
                  type="button"
                  role="radio"
                  aria-checked={answer === mt.type}
                  className={styles.strategyOption}
                  data-active={answer === mt.type ? "true" : undefined}
                  disabled={answer !== undefined}
                  onClick={() => handleScenarioGuess(idx, mt.type)}
                  style={{
                    minHeight: 32,
                    fontSize: "0.6rem",
                    ...(answer !== undefined && mt.type === sc.correctType ? { color: "var(--color-success)", fontWeight: 800 } : {}),
                    ...(answer === mt.type && !isCorrect ? { color: "var(--color-error)" } : {}),
                  }}
                >
                  {mt.type}
                </button>
              ))}
            </div>
            {answer !== undefined && !isCorrect && (
              <div className={styles.methodHint}>Correct answer: {sc.correctType}</div>
            )}
          </div>
        );
      })}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Revealed</div>
          <div className={styles.metricValue} data-status={revealed.size === MESSAGE_TYPES.length ? "good" : undefined}>
            {revealed.size}/{MESSAGE_TYPES.length}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Matched</div>
          <div className={styles.metricValue} data-status={scenarioCorrect >= 2 ? "good" : undefined}>
            {scenarioCorrect}/{MSG_SCENARIOS.length}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 6: Tab Registry
// ═══════════════════════════════════════════════════════════════════

function TabRegistryWidget() {
  const { tabs, addTab, removeTab, updateTabHeartbeat, markStepComplete } = useMultiTab();
  const [addCount, setAddCount] = useState(0);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (addCount >= 1 && tabs.length >= 3) markStepComplete(6);
  }, [addCount, tabs.length, markStepComplete]);

  // Auto-heartbeat for visible tabs
  useEffect(() => {
    heartbeatTimerRef.current = setInterval(() => {
      tabs.forEach(t => {
        if (t.visibility === "visible") updateTabHeartbeat(t.id);
      });
    }, 5000);
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [tabs, updateTabHeartbeat]);

  return (
    <div className={styles.widgetPanel} data-category="channel">
      <div className={styles.widgetTitle}>Tab registry -- register/unregister tabs</div>
      <div className={styles.tabListViz}>
        {tabs.map(tab => (
          <div key={tab.id} className={styles.tabCard} data-leader={tab.isLeader ? "true" : undefined} data-visibility={tab.visibility}>
            <div className={styles.tabCardHeader}>
              <span className={styles.tabCardName}>{tab.label}</span>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => removeTab(tab.id)}
                disabled={tabs.length <= 1}
                aria-label={`Remove ${tab.label}`}
                style={{ minHeight: 28, padding: "2px 6px", fontSize: "0.6rem" }}
              >
                x
              </button>
            </div>
            <div className={styles.tabCardMeta}>
              <span className={styles.heartbeatDot} data-status={
                tab.visibility === "terminated" ? "dead"
                : Date.now() - tab.lastHeartbeat > 10000 ? "stale"
                : "alive"
              } />
              {tab.id}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.actionButton}
        onClick={() => { addTab(`Tab ${String.fromCharCode(65 + tabs.length)}`); setAddCount(c => c + 1); }}
      >
        + Add tab
      </button>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Registered</div>
          <div className={styles.metricValue}>{tabs.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active</div>
          <div className={styles.metricValue} data-status="good">{tabs.filter(t => t.visibility !== "terminated").length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Add and remove tabs. Each tab registers itself on open and deregisters on close. The heartbeat dot shows whether the tab has checked in recently.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 7: Leader Election (Bully algorithm)
// ═══════════════════════════════════════════════════════════════════

function LeaderElectionWidget() {
  const { tabs, leaderId, runElection, removeTab, addTab, sendMessage, markStepComplete } = useMultiTab();
  const [electionLog, setElectionLog] = useState<{ step: number; text: string; done: boolean }[]>([]);
  const [electionStep, setElectionStep] = useState(-1);

  useEffect(() => {
    if (electionLog.length > 0 && electionLog.every(e => e.done)) markStepComplete(7);
  }, [electionLog, markStepComplete]);

  const simulateElection = () => {
    const alive = tabs.filter(t => t.visibility !== "terminated");
    if (alive.length === 0) return;
    const sorted = [...alive].sort((a, b) => {
      const aNum = parseInt(a.id.split("-")[1] ?? "0", 10);
      const bNum = parseInt(b.id.split("-")[1] ?? "0", 10);
      return bNum - aNum;
    });
    const steps = [
      { step: 1, text: `Leader ${leaderId ?? "?"} detected as down. Election triggered.`, done: false },
      { step: 2, text: `Alive tabs: ${alive.map(t => t.id).join(", ")}. Each sends ELECTION to higher IDs.`, done: false },
      { step: 3, text: `Highest ID: ${sorted[0]!.id}. No higher tab responds -- declares itself COORDINATOR.`, done: false },
      { step: 4, text: `${sorted[0]!.id} is the new leader. All tabs acknowledge.`, done: false },
    ];
    setElectionLog(steps);
    setElectionStep(0);
  };

  const stepForward = () => {
    if (electionStep >= electionLog.length - 1) return;
    const next = electionStep + 1;
    setElectionStep(next);
    setElectionLog(prev => prev.map((e, i) => i <= next ? { ...e, done: true } : e));
    if (next === electionLog.length - 1) {
      const newLeader = runElection();
      if (newLeader) {
        sendMessage({ type: "election", from: newLeader, to: "broadcast", payload: `COORDINATOR: ${newLeader}` });
      }
    }
  };

  const crashLeader = () => {
    if (leaderId) {
      removeTab(leaderId);
      sendMessage({ type: "heartbeat", from: leaderId, to: "broadcast", payload: "TIMEOUT -- leader crashed" });
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="election">
      <div className={styles.widgetTitle}>Leader election -- Bully algorithm</div>
      <div className={styles.toggleRow}>
        <button type="button" className={styles.actionButton} onClick={crashLeader} disabled={!leaderId || tabs.length <= 1}>
          Crash leader ({leaderId ?? "--"})
        </button>
        <button type="button" className={styles.actionButton} onClick={simulateElection}>
          Trigger election
        </button>
        <button type="button" className={styles.toolButton} onClick={() => addTab(`Tab ${String.fromCharCode(65 + tabs.length)}`)}>
          + Tab
        </button>
      </div>
      {electionLog.length > 0 && (
        <div className={styles.electionViz}>
          {electionLog.map((e, i) => (
            <motion.div
              key={i}
              className={styles.electionStep}
              data-active={i === electionStep ? "true" : undefined}
              data-done={e.done ? "true" : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.snappy, delay: i * 0.05 }}
            >
              <span className={styles.electionIndex}>{e.done ? "✓" : e.step}</span>
              <div className={styles.electionBody}>
                <span className={styles.electionCaption}>{e.text}</span>
              </div>
            </motion.div>
          ))}
          <div className={styles.propControls}>
            <button type="button" className={styles.actionButton} onClick={stepForward} disabled={electionStep >= electionLog.length - 1}>
              Step forward
            </button>
          </div>
        </div>
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Current leader</div>
          <div className={styles.metricValue} data-status="good">{leaderId ?? "none"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Alive tabs</div>
          <div className={styles.metricValue}>{tabs.filter(t => t.visibility !== "terminated").length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Crash the leader tab, then trigger an election. Step through the Bully algorithm: each tab announces its ID, and the highest ID wins. Add more tabs to see different election outcomes.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 8: State Synchronization
// ═══════════════════════════════════════════════════════════════════

function StateSyncWidget() {
  const { tabs, updateTabState, sendMessage, markStepComplete } = useMultiTab();
  const [tabAVal, setTabAVal] = useState("hello");
  const [tabBVal, setTabBVal] = useState("hello");
  const [syncCount, setSyncCount] = useState(0);
  const tabA = tabs[0];
  const tabB = tabs[1];

  useEffect(() => {
    if (syncCount >= 2) markStepComplete(8);
  }, [syncCount, markStepComplete]);

  const syncAtoB = () => {
    if (!tabA || !tabB) return;
    updateTabState(tabA.id, "value", tabAVal);
    sendMessage({ type: "state-sync", from: tabA.id, to: tabB.id, payload: tabAVal });
    setTabBVal(tabAVal);
    updateTabState(tabB.id, "value", tabAVal);
    setSyncCount(c => c + 1);
  };

  const syncBtoA = () => {
    if (!tabA || !tabB) return;
    updateTabState(tabB.id, "value", tabBVal);
    sendMessage({ type: "state-sync", from: tabB.id, to: tabA.id, payload: tabBVal });
    setTabAVal(tabBVal);
    updateTabState(tabA.id, "value", tabBVal);
    setSyncCount(c => c + 1);
  };

  return (
    <div className={styles.widgetPanel} data-category="state">
      <div className={styles.widgetTitle}>State synchronization -- two-pane editor</div>
      <div className={styles.twoPaneEditor}>
        <div className={styles.editorPane}>
          <span className={styles.editorPaneLabel} data-tab="a">{tabA?.label ?? "Tab A"}</span>
          <input
            className={styles.editorInput}
            value={tabAVal}
            onChange={e => setTabAVal(e.target.value)}
            aria-label="Tab A value"
          />
          <button type="button" className={styles.actionButton} onClick={syncAtoB}>
            Sync A {"→"} B
          </button>
        </div>
        <div className={styles.editorPane}>
          <span className={styles.editorPaneLabel} data-tab="b">{tabB?.label ?? "Tab B"}</span>
          <input
            className={styles.editorInput}
            value={tabBVal}
            onChange={e => setTabBVal(e.target.value)}
            aria-label="Tab B value"
          />
          <button type="button" className={styles.actionButton} onClick={syncBtoA}>
            Sync B {"→"} A
          </button>
        </div>
      </div>
      <div className={styles.syncArrow}>
        {tabAVal === tabBVal ? "In sync" : "Out of sync -- click a sync button"}
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Syncs</div>
          <div className={styles.metricValue}>{syncCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Status</div>
          <div className={styles.metricValue} data-status={tabAVal === tabBVal ? "good" : "warning"}>
            {tabAVal === tabBVal ? "synced" : "diverged"}
          </div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Edit the value in either pane, then click the sync button to propagate. Watch how the message appears in the log and both panes converge.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 9: Conflict Resolution
// ═══════════════════════════════════════════════════════════════════

function resolveConflict(strategy: ConflictStrategy, a: string, b: string, aTime: number, bTime: number): { result: string; winner: "a" | "b" | "merge"; explanation: string } {
  if (a === b) return { result: a, winner: "merge", explanation: "No conflict -- both tabs wrote the same value." };
  switch (strategy) {
    case "lww": {
      const winner = aTime >= bTime ? "a" : "b";
      return {
        result: winner === "a" ? a : b,
        winner,
        explanation: `LWW: Tab ${winner.toUpperCase()}'s timestamp (t=${winner === "a" ? aTime : bTime}) is later. "${winner === "a" ? a : b}" wins, "${winner === "a" ? b : a}" is silently discarded.`,
      };
    }
    case "merge-queue":
      return {
        result: `[${a}, ${b}]`,
        winner: "merge",
        explanation: `Merge queue: both values are queued for manual resolution. No data is lost, but the user must choose. Queue: [${a}, ${b}].`,
      };
    case "leader-decides":
      return {
        result: a,
        winner: "a",
        explanation: `Leader decides: the leader tab (Tab A) always wins conflicts. "${a}" persists, "${b}" is rejected. Simple but authoritarian.`,
      };
  }
}

function ConflictResolutionWidget() {
  const { conflictStrategy, setConflictStrategy, markStepComplete } = useMultiTab();
  const [tabAVal, setTabAVal] = useState("red");
  const [tabBVal, setTabBVal] = useState("blue");
  const [result, setResult] = useState<ReturnType<typeof resolveConflict> | null>(null);
  const [triedStrategies, setTriedStrategies] = useState<Set<string>>(new Set());

  useEffect(() => { setResult(null); }, [conflictStrategy, tabAVal, tabBVal]);

  useEffect(() => {
    if (triedStrategies.size >= 2) markStepComplete(9);
  }, [triedStrategies.size, markStepComplete]);

  const handleResolve = () => {
    const r = resolveConflict(conflictStrategy, tabAVal, tabBVal, 1, 2);
    setResult(r);
    setTriedStrategies(prev => new Set(prev).add(conflictStrategy));
  };

  return (
    <div className={styles.widgetPanel} data-category="state">
      <div className={styles.widgetTitle}>Conflict resolution -- concurrent edits</div>
      <div className={styles.widgetNote}>
        Both tabs edit the same key at the same time. Pick a strategy and see which value survives.
      </div>
      <div className={styles.twoPaneEditor}>
        <div className={styles.editorPane}>
          <span className={styles.editorPaneLabel} data-tab="a">Tab A writes (t=1)</span>
          <input className={styles.editorInput} value={tabAVal} onChange={e => setTabAVal(e.target.value)} aria-label="Tab A conflict value" />
        </div>
        <div className={styles.editorPane}>
          <span className={styles.editorPaneLabel} data-tab="b">Tab B writes (t=2)</span>
          <input className={styles.editorInput} value={tabBVal} onChange={e => setTabBVal(e.target.value)} aria-label="Tab B conflict value" />
        </div>
      </div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Conflict resolution strategy">
        {(["lww", "merge-queue", "leader-decides"] as const).map(s => (
          <button key={s} type="button" role="radio" aria-checked={conflictStrategy === s}
            className={styles.strategyOption} data-active={conflictStrategy === s ? "true" : undefined}
            onClick={() => setConflictStrategy(s)}>
            <span className={styles.strategyName}>{s === "lww" ? "LWW" : s === "merge-queue" ? "Merge Queue" : "Leader Decides"}</span>
            <span className={styles.strategyDesc}>
              {s === "lww" ? "Latest timestamp wins" : s === "merge-queue" ? "Queue both for resolution" : "Leader tab always wins"}
            </span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.actionButton} onClick={handleResolve}>
        Resolve conflict
      </button>
      <AnimatePresence>
        {result && (
          <motion.div
            key={conflictStrategy}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={SPRING.snappy}
          >
            <div className={styles.conflictResult}>
              <span className={styles.conflictResultLabel}>Result</span>
              <span className={styles.conflictResultValue} data-lost={result.winner !== "merge" ? "true" : undefined}>
                {result.result}
              </span>
            </div>
            <div className={styles.predictionResult} data-correct="true" style={{ marginTop: "var(--space-1)" }}>
              {result.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Strategy</div>
          <div className={styles.metricValue}>{conflictStrategy}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Strategies tried</div>
          <div className={styles.metricValue} data-status={triedStrategies.size >= 3 ? "good" : undefined}>{triedStrategies.size}/3</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 10: localStorage Events
// ═══════════════════════════════════════════════════════════════════

function LocalStorageWidget() {
  const { markStepComplete } = useMultiTab();
  const [key, setKey] = useState("theme");
  const [writeValue, setWriteValue] = useState("dark");
  const [events, setEvents] = useState<{ key: string; oldValue: string; newValue: string }[]>([]);
  const uniqueKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    events.forEach(ev => uniqueKeys.current.add(ev.key));
    if (events.length >= 2 && uniqueKeys.current.size >= 2) markStepComplete(10);
  }, [events, markStepComplete]);

  const writeToStorage = () => {
    const oldValue = events.length > 0 ? events[events.length - 1]!.newValue : "(none)";
    setEvents(prev => [...prev.slice(-9), { key, oldValue, newValue: writeValue }]);
  };

  return (
    <div className={styles.widgetPanel} data-category="channel">
      <div className={styles.widgetTitle}>localStorage events -- cross-tab notification</div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Key</span>
        <input className={styles.editorInput} value={key} onChange={e => setKey(e.target.value)} aria-label="Storage key" style={{ maxWidth: 120 }} />
      </div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Value</span>
        <input className={styles.editorInput} value={writeValue} onChange={e => setWriteValue(e.target.value)} aria-label="Storage value" style={{ maxWidth: 200 }} />
        <button type="button" className={styles.actionButton} onClick={writeToStorage}>
          Write
        </button>
      </div>
      <div className={styles.storageViz}>
        <div className={styles.widgetNote}>Tab A writes to localStorage. Tab B receives the storage event:</div>
        <AnimatePresence initial={false}>
          {events.map((ev, i) => (
            <motion.div
              key={i}
              className={styles.storageRow}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={SPRING.snappy}
            >
              <span className={styles.storageKey}>{ev.key}</span>
              <span className={styles.storageValue} data-source="true">{ev.oldValue}</span>
              <span className={styles.msgArrow}>{"→"}</span>
              <span className={styles.storageValue} data-received="true">{ev.newValue}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Events fired</div>
          <div className={styles.metricValue}>{events.length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        The storage event only fires in OTHER tabs, not the tab that made the change. This is why BroadcastChannel is preferred for explicit messaging -- storage events are a side effect.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 11: SharedWorker
// ═══════════════════════════════════════════════════════════════════

function SharedWorkerWidget() {
  const { tabs, sendMessage, markStepComplete } = useMultiTab();
  const [activePort, setActivePort] = useState<string | null>(null);
  const [workerMessages, setWorkerMessages] = useState<{ from: string; routed: string; msg: string }[]>([]);
  const [sharedCounter, setSharedCounter] = useState(0);
  const [closedTabs, setClosedTabs] = useState<string[]>([]);
  const portTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const routedFromTabs = useRef<Set<string>>(new Set());

  useEffect(() => () => clearTimeout(portTimerRef.current), []);

  useEffect(() => {
    if (workerMessages.length >= 3 && routedFromTabs.current.size >= 2) markStepComplete(11);
  }, [workerMessages.length, markStepComplete]);

  const routeMessage = (fromId: string) => {
    setActivePort(fromId);
    routedFromTabs.current.add(fromId);
    const others = tabs.filter(t => t.id !== fromId && t.visibility !== "terminated");
    const msg = `msg from ${fromId.slice(-1)}`;
    others.forEach(t => {
      setWorkerMessages(prev => [...prev.slice(-9), { from: fromId, routed: t.id, msg }]);
    });
    sendMessage({ type: "action", from: fromId, to: "broadcast", payload: `SharedWorker routed: ${msg}` });
    setSharedCounter(prev => prev + 1);
    clearTimeout(portTimerRef.current);
    portTimerRef.current = setTimeout(() => setActivePort(null), 800);
  };

  const simulateTabClose = (tabId: string) => {
    setClosedTabs(prev => [...prev, tabId]);
  };

  const reopenTab = (tabId: string) => {
    setClosedTabs(prev => prev.filter(t => t !== tabId));
  };

  return (
    <div className={styles.widgetPanel} data-category="channel">
      <div className={styles.widgetTitle}>SharedWorker -- centralized message routing</div>
      <div className={styles.workerDiagram}>
        <div className={styles.workerConnections}>
          {tabs.filter(t => t.visibility !== "terminated").map(t => (
            <button
              key={t.id}
              type="button"
              className={styles.workerPort}
              data-active={activePort === t.id ? "true" : undefined}
              onClick={() => routeMessage(t.id)}
              aria-label={`Send message from ${t.label} via SharedWorker`}
            >
              <span className={styles.workerPortLabel}>{t.label}</span>
              <span className={styles.workerPortMsg}>port</span>
            </button>
          ))}
        </div>
        <div className={styles.workerArrow}>{"↕"}</div>
        <div className={styles.workerNode}>SharedWorker</div>
        <div className={styles.workerArrow}>{"↓"} routes to all ports</div>
      </div>
      <MessageLog messages={workerMessages.map((m, i) => ({
        id: `sw-${i}`,
        type: "action",
        from: m.from,
        to: m.routed,
        payload: m.msg,
        timestamp: Date.now(),
      }))} />
      <div className={styles.widgetTitle} style={{ fontSize: "0.65rem", marginTop: "var(--space-2)" }}>
        SharedWorker advantage -- persistent state
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Shared counter</div>
          <div className={styles.metricValue} data-status="good">{sharedCounter}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Closed tabs</div>
          <div className={styles.metricValue}>{closedTabs.length}</div>
        </div>
      </div>
      <div className={styles.toggleRow}>
        {tabs.filter(t => t.visibility !== "terminated").map(t => {
          const isClosed = closedTabs.includes(t.id);
          return (
            <button key={t.id} type="button" className={styles.toolButton}
              data-active={isClosed ? "true" : undefined}
              onClick={() => isClosed ? reopenTab(t.id) : simulateTabClose(t.id)}
              aria-label={isClosed ? `Reopen ${t.label}` : `Close ${t.label}`}
            >
              {t.label}: {isClosed ? "reopen" : "close"}
            </button>
          );
        })}
      </div>
      {closedTabs.length > 0 && (
        <div className={styles.stepMessage}>
          BroadcastChannel: counter lost when tab closes. SharedWorker: counter stays at {sharedCounter} -- the worker survives individual tab closures.
        </div>
      )}
      <div className={styles.widgetNote}>
        A SharedWorker runs a single thread shared across all tabs. Each tab connects via a MessagePort. The worker routes messages to all connected ports -- unlike BroadcastChannel, the worker can maintain state and do computation. Close a tab above to see the counter persist.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 12: Tab Lifecycle
// ═══════════════════════════════════════════════════════════════════

type VisState = "visible" | "hidden" | "frozen" | "terminated";

const LIFECYCLE_STATES: { state: VisState; desc: string; behavior: string }[] = [
  { state: "visible", desc: "Tab is in the foreground", behavior: "Full JS execution, all timers at normal rate, rAF active" },
  { state: "hidden", desc: "Tab is in the background", behavior: "Timers throttled to 1/sec, rAF paused, still receives events" },
  { state: "frozen", desc: "Tab is frozen by browser", behavior: "No JS execution, no timers, no network. State preserved in memory" },
  { state: "terminated", desc: "Tab is being discarded", behavior: "All state lost unless persisted to storage. No cleanup callbacks" },
];

function TabLifecycleWidget() {
  const { tabs, setTabVisibility, markStepComplete } = useMultiTab();
  const [selectedTab, setSelectedTab] = useState(tabs[0]?.id ?? "");
  const [triedStates, setTriedStates] = useState<Set<string>>(new Set(["visible"]));
  const selectedTabInfo = tabs.find(t => t.id === selectedTab);

  useEffect(() => {
    if (triedStates.size >= 3) markStepComplete(12);
  }, [triedStates.size, markStepComplete]);

  const currentState = selectedTabInfo?.visibility ?? "visible";
  const currentInfo = LIFECYCLE_STATES.find(s => s.state === currentState);

  return (
    <div className={styles.widgetPanel} data-category="lifecycle">
      <div className={styles.widgetTitle}>Tab lifecycle -- Visibility API states</div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Tab</span>
        <div className={styles.strategyGroup} role="radiogroup" aria-label="Select tab">
          {tabs.map(t => (
            <button key={t.id} type="button" role="radio" aria-checked={selectedTab === t.id}
              className={styles.strategyOption} data-active={selectedTab === t.id ? "true" : undefined}
              onClick={() => setSelectedTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.lifecycleStrip} role="radiogroup" aria-label="Lifecycle state">
        {LIFECYCLE_STATES.map(ls => (
          <button
            key={ls.state}
            type="button"
            role="radio"
            aria-checked={currentState === ls.state}
            className={styles.lifecycleState}
            data-active={currentState === ls.state ? "true" : undefined}
            onClick={() => {
              setTabVisibility(selectedTab, ls.state);
              setTriedStates(prev => new Set(prev).add(ls.state));
            }}
          >
            <span className={styles.lifecycleDot} data-state={ls.state} />
            {ls.state}
          </button>
        ))}
      </div>
      {currentInfo && (
        <div className={styles.stepMessage}>
          <strong>{currentInfo.state}:</strong> {currentInfo.desc}. {currentInfo.behavior}.
        </div>
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>State</div>
          <div className={styles.metricValue}>{currentState}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>States explored</div>
          <div className={styles.metricValue} data-status={triedStates.size >= 4 ? "good" : undefined}>{triedStates.size}/4</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Toggle lifecycle states to see how browser behavior changes. In production, use document.visibilityState and the freeze/resume events to save state before the browser discards your tab.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 13: Throttling
// ═══════════════════════════════════════════════════════════════════

function ThrottlingWidget() {
  const { markStepComplete } = useMultiTab();
  const [visibility, setVisibility] = useState<"visible" | "hidden">("visible");
  const [elapsed, setElapsed] = useState(0);
  const [timerCount, setTimerCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (timerCount > 0 && visibility === "hidden") markStepComplete(13);
  }, [timerCount, visibility, markStepComplete]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    setTimerCount(0);

    const interval = visibility === "visible" ? 100 : 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
      setTimerCount(c => c + 1);
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visibility]);

  const expectedTicks = visibility === "visible"
    ? Math.floor(elapsed / 100)
    : Math.floor(elapsed / 1000);
  const drift = timerCount > 0 && expectedTicks > 0
    ? Math.abs(timerCount - expectedTicks)
    : 0;
  const driftStatus = drift === 0 ? "good" : drift < 3 ? "throttled" : "severe";
  const timerInterval = visibility === "visible" ? "100ms" : "1000ms (throttled)";
  const fillPct = visibility === "visible"
    ? Math.min(100, (timerCount / Math.max(1, expectedTicks)) * 100)
    : Math.min(100, (timerCount / Math.max(1, expectedTicks)) * 100);

  return (
    <div className={styles.widgetPanel} data-category="lifecycle">
      <div className={styles.widgetTitle}>Timer throttling -- hidden tab drift</div>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Tab visibility</span>
        <div className={styles.strategyGroup} role="radiogroup" aria-label="Visibility simulation">
          <button type="button" role="radio" aria-checked={visibility === "visible"}
            className={styles.strategyOption} data-active={visibility === "visible" ? "true" : undefined}
            onClick={() => setVisibility("visible")}>
            <span className={styles.strategyName}>visible</span>
            <span className={styles.strategyDesc}>100ms intervals</span>
          </button>
          <button type="button" role="radio" aria-checked={visibility === "hidden"}
            className={styles.strategyOption} data-active={visibility === "hidden" ? "true" : undefined}
            onClick={() => setVisibility("hidden")}>
            <span className={styles.strategyName}>hidden</span>
            <span className={styles.strategyDesc}>Throttled to 1/sec</span>
          </button>
        </div>
      </div>
      <div className={styles.timerRow}>
        <span className={styles.timerLabel}>Ticks</span>
        <div className={styles.timerBar}>
          <div className={styles.timerFill} data-status={driftStatus} style={{ width: `${fillPct}%` }} />
        </div>
        <span className={styles.timerValue}>{timerCount}</span>
      </div>
      <div className={styles.timerRow}>
        <span className={styles.timerLabel}>Interval</span>
        <span className={styles.timerValue}>{timerInterval}</span>
      </div>
      <div className={styles.timerRow}>
        <span className={styles.timerLabel}>Drift</span>
        <span className={styles.timerValue} style={{ color: drift > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
          {drift} ticks
        </span>
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Elapsed</div>
          <div className={styles.metricValue}>{(elapsed / 1000).toFixed(1)}s</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Expected ticks</div>
          <div className={styles.metricValue}>{expectedTicks}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Actual ticks</div>
          <div className={styles.metricValue} data-status={drift > 2 ? "warning" : "good"}>{timerCount}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Switch to "hidden" and watch the timer slow down. In real browsers, hidden tabs get timers throttled to max once per second. Your heartbeat interval of 5s might actually fire at 6s, 8s, or later. Design your leader election timeout to account for this drift.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 14: Memory Pressure
// ═══════════════════════════════════════════════════════════════════

function MemoryPressureWidget() {
  const { tabs, removeTab, addTab, markStepComplete } = useMultiTab();
  const [memoryPressure, setMemoryPressure] = useState(30);
  const [discardedTabs, setDiscardedTabs] = useState<string[]>([]);
  const [restoredTabs, setRestoredTabs] = useState<string[]>([]);

  useEffect(() => {
    if (discardedTabs.length > 0 && restoredTabs.length > 0) markStepComplete(14);
  }, [discardedTabs.length, restoredTabs.length, markStepComplete]);

  const simulateDiscard = () => {
    const bgTabs = tabs.filter(t => t.visibility === "hidden" || t.visibility === "frozen");
    if (bgTabs.length === 0) return;
    const victim = bgTabs[bgTabs.length - 1]!;
    removeTab(victim.id);
    setDiscardedTabs(prev => [...prev, victim.label]);
  };

  const restoreTab = () => {
    if (discardedTabs.length === 0) return;
    const label = discardedTabs[discardedTabs.length - 1]!;
    addTab(`${label} (restored)`);
    setRestoredTabs(prev => [...prev, label]);
    setDiscardedTabs(prev => prev.slice(0, -1));
  };

  const memLevel = memoryPressure < 50 ? "low" : memoryPressure < 80 ? "medium" : "high";

  return (
    <div className={styles.widgetPanel} data-category="lifecycle">
      <div className={styles.widgetTitle}>Memory pressure -- tab discarding</div>
      <div className={styles.memoryBar}>
        <div className={styles.memoryRow}>
          <span className={styles.memoryLabel}>Memory</span>
          <div className={styles.memoryTrack}>
            <div className={styles.memoryFill} data-level={memLevel} style={{ width: `${memoryPressure}%` }} />
          </div>
          <span className={styles.memoryValue}>{memoryPressure}%</span>
        </div>
      </div>
      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel} htmlFor="mem-slider">
          Simulate memory pressure
        </label>
        <input
          id="mem-slider"
          type="range" min={10} max={100} step={5}
          value={memoryPressure}
          onChange={e => setMemoryPressure(Number(e.target.value))}
          style={{ flex: 1, minHeight: 44, accentColor: "var(--color-accent)" }}
          aria-valuetext={`${memoryPressure}% memory used`}
        />
      </div>
      <div className={styles.toggleRow}>
        <button type="button" className={styles.actionButton} onClick={simulateDiscard}
          disabled={tabs.filter(t => t.visibility === "hidden" || t.visibility === "frozen").length === 0}>
          Discard background tab
        </button>
        <button type="button" className={styles.actionButton} onClick={restoreTab} disabled={discardedTabs.length === 0}>
          Restore tab
        </button>
      </div>
      {discardedTabs.length > 0 && (
        <div className={styles.stepMessage} data-severity="warning">
          Discarded: {discardedTabs.join(", ")}. State lost unless persisted to sessionStorage/IndexedDB.
        </div>
      )}
      {restoredTabs.length > 0 && (
        <div className={styles.stepMessage}>
          Restored: {restoredTabs.join(", ")}. State reconstructed from persisted storage.
        </div>
      )}
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Discarded</div>
          <div className={styles.metricValue} data-status={discardedTabs.length > 0 ? "warning" : undefined}>{discardedTabs.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Restored</div>
          <div className={styles.metricValue} data-status={restoredTabs.length > 0 ? "good" : undefined}>{restoredTabs.length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Under memory pressure, browsers discard hidden/frozen tabs. First set a tab to "hidden" in the lifecycle step, then discard it. Restore shows why you need sessionStorage or IndexedDB to persist state across discards.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STEP 15: Lock API
// ═══════════════════════════════════════════════════════════════════

type LockEntry = {
  name: string;
  mode: "exclusive" | "shared";
  holder: string | null;
  waiters: string[];
};

function LockApiWidget() {
  const { tabs, markStepComplete } = useMultiTab();
  const [locks, setLocks] = useState<LockEntry[]>([
    { name: "db-write", mode: "exclusive", holder: null, waiters: [] },
    { name: "cache-read", mode: "shared", holder: null, waiters: [] },
  ]);
  const [contentionCount, setContentionCount] = useState(0);

  useEffect(() => {
    if (contentionCount >= 2) markStepComplete(15);
  }, [contentionCount, markStepComplete]);

  const requestLock = (lockName: string, tabId: string) => {
    setLocks(prev => prev.map(lock => {
      if (lock.name !== lockName) return lock;
      if (lock.mode === "exclusive") {
        if (!lock.holder) {
          return { ...lock, holder: tabId };
        }
        if (lock.holder === tabId) return lock;
        if (!lock.waiters.includes(tabId)) {
          setContentionCount(c => c + 1);
          return { ...lock, waiters: [...lock.waiters, tabId] };
        }
        return lock;
      }
      // Shared mode: any tab can hold
      if (!lock.holder) return { ...lock, holder: tabId };
      return lock;
    }));
  };

  const releaseLock = (lockName: string, tabId: string) => {
    setLocks(prev => prev.map(lock => {
      if (lock.name !== lockName) return lock;
      if (lock.holder === tabId) {
        const nextHolder = lock.waiters[0] ?? null;
        return { ...lock, holder: nextHolder, waiters: lock.waiters.slice(1) };
      }
      return { ...lock, waiters: lock.waiters.filter(w => w !== tabId) };
    }));
  };

  const aliveTabs = tabs.filter(t => t.visibility !== "terminated");

  return (
    <div className={styles.widgetPanel} data-category="state">
      <div className={styles.widgetTitle}>Web Locks API -- exclusive access</div>
      <div className={styles.lockList}>
        {locks.map(lock => (
          <div key={lock.name}>
            <div className={styles.lockRow} data-held={lock.holder ? "true" : undefined}>
              <span className={styles.lockName}>{lock.name}</span>
              <span className={styles.lockStatus} data-state={lock.holder ? "held" : "free"}>
                {lock.holder ? `held by ${lock.holder.slice(-1)}` : "free"}
              </span>
              <span className={styles.lockStatus} data-state={lock.waiters.length > 0 ? "waiting" : "free"}>
                {lock.waiters.length > 0 ? `${lock.waiters.length} waiting` : "no queue"}
              </span>
            </div>
            <div className={styles.strategyGroup} style={{ marginTop: 4 }}>
              {aliveTabs.map(t => (
                <button key={t.id} type="button" className={styles.toolButton}
                  data-active={lock.holder === t.id ? "true" : undefined}
                  onClick={() => {
                    if (lock.holder === t.id) releaseLock(lock.name, t.id);
                    else requestLock(lock.name, t.id);
                  }}
                  aria-label={`${lock.holder === t.id ? "Release" : "Request"} ${lock.name} from ${t.label}`}
                >
                  {t.label}: {lock.holder === t.id ? "release" : lock.waiters.includes(t.id) ? "waiting..." : "request"}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {lock.waiters.length > 0 && (
                <motion.div
                  className={styles.lockRow}
                  data-waiting="true"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING.snappy}
                >
                  <span className={styles.lockName}>Queue</span>
                  <span>{lock.waiters.map(w => tabs.find(t => t.id === w)?.label ?? w).join(" -> ")}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Contentions</div>
          <div className={styles.metricValue} data-status={contentionCount > 0 ? "warning" : undefined}>{contentionCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active locks</div>
          <div className={styles.metricValue}>{locks.filter(l => l.holder).length}</div>
        </div>
      </div>
      <div className={styles.widgetNote}>
        Request the "db-write" lock from multiple tabs to see contention. The first tab gets exclusive access; others queue. Release the lock and the next waiter auto-acquires. This prevents concurrent writes that cause data corruption.
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  NotificationProvider,
  useNotification,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  type TypeDef,
  type Priority,
  type NotificationType,
  type ToastEntry,
} from "./notification-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { NOTIFICATION_ARCH_CONFIG } from "./architecture-scenarios";
import { StepBar } from "../_shared/StepBar";
import styles from "./NotificationLab.module.css";

const STEP_LABELS = [
  "Scope", "API", "Arch",
  "Toast", "Queue", "Pri",
  "Anim", "Center", "Perm",
  "Push", "Group", "Rate",
  "Pref", "A11y", "Test",
];

// ── Helpers ────────────────────────────────────────────────────────

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

const PRIORITY_ICON: Record<Priority, string> = {
  info: "i",
  warning: "!",
  error: "!!",
  critical: "!!!",
};

const SAMPLE_TITLES: Record<Priority, string[]> = {
  info: ["New follower", "Update available", "Welcome back"],
  warning: ["Disk space low", "Session expiring", "Rate limit near"],
  error: ["Upload failed", "Payment declined", "Sync error"],
  critical: ["Server down", "Data breach detected", "Service outage"],
};

const SAMPLE_MESSAGES: Record<Priority, string[]> = {
  info: ["@alice started following you", "Version 2.1 is ready", "You have 3 unread messages"],
  warning: ["Only 500MB remaining", "Your session expires in 5 min", "Approaching 90% of API quota"],
  error: ["File upload timed out after 30s", "Card ending in 4242 was declined", "Could not sync 3 documents"],
  critical: ["Primary database unreachable", "Unauthorized access attempt detected", "All API endpoints returning 503"],
};

function randomSample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function makeToast(priority: Priority, type: NotificationType, groupId?: string): Omit<ToastEntry, "id" | "createdAt" | "expiresAt" | "read" | "dismissed"> {
  return {
    title: randomSample(SAMPLE_TITLES[priority]),
    message: randomSample(SAMPLE_MESSAGES[priority]),
    priority,
    type,
    groupId,
  };
}

// ── Public API ──────────────────────────────────────────────────────

export function NotificationLab({ activeStep }: { activeStep: number }) {
  return (
    <NotificationProvider activeStep={activeStep}>
      <NotificationLabContent activeStep={activeStep} />
    </NotificationProvider>
  );
}

function NotificationLabContent({ activeStep }: { activeStep: number }) {
  const { stepCompleted } = useNotification();
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
          <NotificationEvolution />
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
  const { scopeEnabled, toggleScope, markStepComplete } = useNotification();

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
        <button type="button" role="tab" className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} aria-selected={tab === "endpoints"} onClick={() => setTab("endpoints")} onKeyDown={handleTabKeyDown} tabIndex={tab === "endpoints" ? 0 : -1} id="notif-tab-endpoints" aria-controls="notif-panel-endpoints">
          Endpoints
        </button>
        <button type="button" role="tab" className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} aria-selected={tab === "types"} onClick={() => setTab("types")} onKeyDown={handleTabKeyDown} tabIndex={tab === "types" ? 0 : -1} id="notif-tab-types" aria-controls="notif-panel-types">
          Types
        </button>
      </div>
      <div role="tabpanel" id={`notif-panel-${tab}`} aria-labelledby={`notif-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointChallenge /> : <TypeCards />}
      </div>
    </div>
  );
}

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

function EndpointChallenge() {
  const { markStepComplete } = useNotification();
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
  api: "var(--diagram-layer-9)",
  state: "var(--diagram-layer-4)",
  props: "var(--diagram-layer-1)",
};

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
  const { markStepComplete } = useNotification();
  const scenariosViewed = useRef(new Set<number>());

  const handleScenarioChange = useCallback((idx: number) => {
    scenariosViewed.current.add(idx);
    if (scenariosViewed.current.size >= 2) markStepComplete(3);
  }, [markStepComplete]);

  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={NOTIFICATION_ARCH_CONFIG} onScenarioChange={handleScenarioChange} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Building evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function NotificationEvolution() {
  const ctx = useNotification();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionLayout}>
      <NotificationMetricsBar />
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
      <StateInspector entries={ctx.stateEntries} title="NotificationState" />
    </div>
  );
}

function NotificationMetricsBar() {
  const { totalSent, totalDismissed, highPriorityCount, visibleToasts, toastQueue } = useNotification();
  const pendingCount = toastQueue.filter(t => !t.dismissed).length - visibleToasts.length;

  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Notification metrics">
      <div className={styles.metric}>
        <span className={styles.metricValue}>{totalSent}</span>
        <span className={styles.metricLabel}>Sent</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={visibleToasts.length > 0 ? "warning" : undefined}>{visibleToasts.length}</span>
        <span className={styles.metricLabel}>Visible</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={Math.max(0, pendingCount) > 0 ? "warning" : undefined}>{Math.max(0, pendingCount)}</span>
        <span className={styles.metricLabel}>Pending</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue}>{totalDismissed}</span>
        <span className={styles.metricLabel}>Dismissed</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={highPriorityCount > 0 ? "bad" : undefined}>{highPriorityCount}</span>
        <span className={styles.metricLabel}>High-Pri</span>
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

// ── Toast countdown bar ────────────────────────────────────────

function ToastCountdownBar({ toast }: { toast: ToastEntry }) {
  const noMotion = usePrefersReducedMotion();
  const totalDuration = toast.expiresAt - toast.createdAt;
  const durationSec = Math.max(totalDuration / 1000, 0.5);

  if (noMotion) return null;

  return (
    <div className={styles.toastCountdown} aria-hidden="true">
      <motion.div
        className={styles.toastCountdownInner}
        data-priority={toast.priority}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: durationSec, ease: "linear" }}
      />
    </div>
  );
}

// ── Step widget router ──────────────────────────────────────────

function StepWidget({ step }: { step: number }) {
  switch (step) {
    case 4: return <ToastComponentWidget />;
    case 5: return <ToastQueueWidget />;
    case 6: return <PrioritySystemWidget />;
    case 7: return <ToastAnimationWidget />;
    case 8: return <NotificationCenterWidget />;
    case 9: return <PushPermissionWidget />;
    case 10: return <PushAPIWidget />;
    case 11: return <NotificationGroupingWidget />;
    case 12: return <RateLimitingWidget />;
    case 13: return <PreferencesWidget />;
    case 14: return <AccessibilityWidget />;
    case 15: return <IntegrationWidget />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 4: Toast Component
// ═══════════════════════════════════════════════════════════════════

type ToastPosition = "top-right" | "bottom-right" | "top-center";

function ToastComponentWidget() {
  const { addToast, visibleToasts, dismissToast, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [position, setPosition] = useState<ToastPosition>("top-right");
  const [duration, setDuration] = useState(5);
  const [selectedType, setSelectedType] = useState<Priority>("info");
  const [firedCount, setFiredCount] = useState(0);
  const [typesUsed, setTypesUsed] = useState<Set<Priority>>(new Set());

  useEffect(() => {
    if (firedCount >= 3 && typesUsed.size >= 2) markStepComplete(4);
  }, [firedCount, typesUsed.size, markStepComplete]);

  const handleFire = () => {
    addToast(makeToast(selectedType, "toast"));
    setFiredCount(c => c + 1);
    setTypesUsed(prev => new Set(prev).add(selectedType));
  };

  const POSITIONS: { id: ToastPosition; label: string }[] = [
    { id: "top-right", label: "Top Right" },
    { id: "bottom-right", label: "Bottom Right" },
    { id: "top-center", label: "Top Center" },
  ];

  const DURATIONS = [3, 5, 10];
  const PRIORITIES: Priority[] = ["info", "warning", "error", "critical"];

  return (
    <div className={styles.widgetPanel} data-category="toast">
      <div className={styles.widgetTitle}>Build a toast component</div>

      <div className={styles.widgetSubtitle}>Position</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Toast position">
        {POSITIONS.map(p => (
          <button key={p.id} type="button" role="radio" aria-checked={position === p.id}
            className={styles.strategyOption} data-active={position === p.id ? "true" : undefined}
            onClick={() => setPosition(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.widgetSubtitle}>Duration</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Toast duration">
        {DURATIONS.map(d => (
          <button key={d} type="button" role="radio" aria-checked={duration === d}
            className={styles.strategyOption} data-active={duration === d ? "true" : undefined}
            onClick={() => setDuration(d)}>
            {d}s
          </button>
        ))}
      </div>

      <div className={styles.widgetSubtitle}>Priority</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Toast priority">
        {PRIORITIES.map(p => (
          <button key={p} type="button" role="radio" aria-checked={selectedType === p}
            className={styles.strategyOption} data-active={selectedType === p ? "true" : undefined}
            onClick={() => setSelectedType(p)}>
            {p}
          </button>
        ))}
      </div>

      <button type="button" className={styles.actionButton} onClick={handleFire} aria-label="Fire toast notification">
        Fire toast
      </button>

      <div className={styles.widgetNote}>Position: {position} | Duration: {duration}s</div>

      <div className={styles.toastContainer} data-position={position} aria-label="Toast display area">
        <AnimatePresence>
          {visibleToasts.map((t, i) => (
            <motion.div
              key={t.id}
              className={styles.toast}
              data-priority={t.priority}
              role={t.priority === "critical" ? "alert" : undefined}
              initial={noMotion ? false : { opacity: 0, x: position.includes("right") ? 20 : 0, y: position.includes("center") ? -10 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: position.includes("right") ? 20 : 0, scale: 0.95 }}
              transition={noMotion ? { duration: 0 } : SPRING.snappy}
              layout
            >
              <span className={styles.toastIcon}>{PRIORITY_ICON[t.priority]}</span>
              <div className={styles.toastBody}>
                <div className={styles.toastTitle}>{t.title}</div>
                <div className={styles.toastMessage}>{t.message}</div>
                <ToastCountdownBar toast={t} />
              </div>
              <button type="button" className={styles.toastDismiss} onClick={() => dismissToast(t.id)} aria-label={`Dismiss: ${t.title}`}>
                x
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {visibleToasts.length === 0 && (
          <div className={styles.widgetNote}>No toasts yet. Fire one above.</div>
        )}
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Fired</div>
          <div className={styles.metricValue}>{firedCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Types used</div>
          <div className={styles.metricValue} data-status={typesUsed.size >= 2 ? "good" : undefined}>{typesUsed.size}/4</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 5: Toast Queue — THE HERO WIDGET
// ═══════════════════════════════════════════════════════════════════

function ToastQueueWidget() {
  const { addToast, visibleToasts, toastQueue, dismissToast, maxVisible, setMaxVisible, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [hasOverflowed, setHasOverflowed] = useState(false);
  const [hasAdjusted, setHasAdjusted] = useState(false);

  const activeQueue = toastQueue.filter(t => !t.dismissed);
  const pendingToasts = activeQueue.slice(maxVisible);

  useEffect(() => {
    if (activeQueue.length > maxVisible) setHasOverflowed(true);
  }, [activeQueue.length, maxVisible]);

  useEffect(() => {
    if (hasOverflowed && hasAdjusted) markStepComplete(5);
  }, [hasOverflowed, hasAdjusted, markStepComplete]);

  const fireRapid = () => {
    const priorities: Priority[] = ["info", "warning", "error", "info", "critical"];
    priorities.forEach((p, i) => {
      setTimeout(() => addToast(makeToast(p, "toast")), i * 100);
    });
  };

  return (
    <div className={styles.widgetPanel} data-category="queue">
      <div className={styles.widgetTitle}>Toast queue -- visible vs overflow</div>

      <div className={styles.toggleRow}>
        <span className={styles.widgetSliderLabel}>Max visible: {maxVisible}</span>
        <input
          type="range" min={1} max={5} value={maxVisible}
          className={styles.rangeInput}
          onChange={e => { setMaxVisible(Number(e.target.value)); setHasAdjusted(true); }}
          aria-label="Maximum visible toasts"
          aria-valuetext={`${maxVisible} toasts visible`}
        />
      </div>

      <div className={styles.inlineRow}>
        <button type="button" className={styles.actionButton} onClick={() => addToast(makeToast(randomSample(["info", "warning", "error", "critical"] as Priority[]), "toast"))} aria-label="Add one notification">
          + Add 1
        </button>
        <button type="button" className={styles.actionButton} onClick={fireRapid} aria-label="Add five notifications rapidly">
          + Rapid 5
        </button>
      </div>

      <div className={styles.queueVisualization}>
        <div className={styles.queueSection}>
          <div className={styles.queueSectionLabel}>Visible ({visibleToasts.length}/{maxVisible})</div>
          <AnimatePresence>
            {visibleToasts.map((t, i) => (
              <motion.div
                key={t.id}
                className={styles.queueItem}
                data-priority={t.priority}
                initial={noMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={noMotion ? { duration: 0 } : { ...SPRING.snappy, delay: i * STAGGER.fast }}
                layout
              >
                <span className={styles.queuePosition}>{i + 1}</span>
                <span className={styles.priorityBadge} data-priority={t.priority}>{t.priority}</span>
                <span className={styles.queueItemTitle}>{t.title}</span>
                <button type="button" className={styles.toastDismiss} onClick={() => dismissToast(t.id)} aria-label={`Dismiss: ${t.title}`}>
                  x
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {visibleToasts.length === 0 && (
            <div className={styles.widgetNote}>Queue empty. Fire some notifications.</div>
          )}
        </div>

        {pendingToasts.length > 0 && (
          <div className={styles.queueSection}>
            <div className={styles.queueSectionLabel}>Waiting ({pendingToasts.length})</div>
            <AnimatePresence>
              {pendingToasts.map((t, i) => (
                <motion.div
                  key={t.id}
                  className={styles.queueItem}
                  data-priority={t.priority}
                  initial={noMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 0.7, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={noMotion ? { duration: 0 } : { ...SPRING.snappy, delay: i * STAGGER.fast }}
                  layout
                >
                  <span className={styles.queuePosition}>{maxVisible + i + 1}</span>
                  <span className={styles.priorityBadge} data-priority={t.priority}>{t.priority}</span>
                  <span className={styles.queueItemTitle}>{t.title}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className={styles.overflowIndicator}>
              {pendingToasts.length} notification{pendingToasts.length > 1 ? "s" : ""} waiting in queue
            </div>
          </div>
        )}
      </div>

      <div className={styles.widgetNote}>
        Rapidly fire notifications to overflow the queue. Then adjust the max-visible slider to see how it affects the display.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 6: Priority System — THE CORE TEACHING WIDGET
// ═══════════════════════════════════════════════════════════════════

function PrioritySystemWidget() {
  const { addToast, visibleToasts, toastQueue, dismissToast, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [totalFired, setTotalFired] = useState(0);
  const [prioritiesUsed, setPrioritiesUsed] = useState<Set<Priority>>(new Set());
  const [hasBumped, setHasBumped] = useState(false);
  const [bumpedIds, setBumpedIds] = useState<Set<string>>(new Set());
  const prevQueueRef = useRef<string[]>([]);
  const bumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeQueue = toastQueue.filter(t => !t.dismissed);

  useEffect(() => {
    return () => { if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current); };
  }, []);

  useEffect(() => {
    if (totalFired >= 5 && prioritiesUsed.size >= 3 && hasBumped) markStepComplete(6);
  }, [totalFired, prioritiesUsed.size, hasBumped, markStepComplete]);

  // Detect a priority bump and track which items got bumped down
  useEffect(() => {
    const currentIds = activeQueue.map(t => t.id);
    const prevIds = prevQueueRef.current;

    if (prevIds.length > 0 && currentIds.length > prevIds.length) {
      // Find items whose position increased (got bumped down)
      const newBumped = new Set<string>();
      for (const id of prevIds) {
        const oldPos = prevIds.indexOf(id);
        const newPos = currentIds.indexOf(id);
        if (newPos > oldPos && newPos >= 0) {
          newBumped.add(id);
        }
      }
      if (newBumped.size > 0 && !noMotion) {
        setHasBumped(true);
        setBumpedIds(newBumped);
        if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
        bumpTimerRef.current = setTimeout(() => setBumpedIds(new Set()), 350);
      } else if (newBumped.size > 0) {
        setHasBumped(true);
      }
    }

    // Also detect via the original heuristic for cases where prevQueueRef hasn't been set yet
    if (activeQueue.length > 3) {
      const visiblePriorities = activeQueue.slice(0, 3).map(t => t.priority);
      const hasCriticalOrError = visiblePriorities.some(p => p === "critical" || p === "error");
      const hasInfoInQueue = activeQueue.slice(3).some(t => t.priority === "info");
      if (hasCriticalOrError && hasInfoInQueue) setHasBumped(true);
    }

    prevQueueRef.current = currentIds;
  }, [activeQueue, noMotion]);

  const firePriority = (p: Priority) => {
    addToast(makeToast(p, "toast"));
    setTotalFired(c => c + 1);
    setPrioritiesUsed(prev => new Set(prev).add(p));
  };

  const PRIORITIES: Priority[] = ["info", "warning", "error", "critical"];

  return (
    <div className={styles.widgetPanel} data-category="queue">
      <div className={styles.widgetTitle}>Priority ordering -- watch high-priority jump the queue</div>

      <div className={styles.widgetSubtitle}>Fire by priority</div>
      <div className={styles.strategyGroup} role="group" aria-label="Fire notifications by priority">
        {PRIORITIES.map(p => (
          <button key={p} type="button" className={styles.actionButton} onClick={() => firePriority(p)} aria-label={`Fire ${p} priority notification`}>
            {p}
          </button>
        ))}
      </div>

      <div className={styles.priorityQueue}>
        <div className={styles.queueSectionLabel}>Priority-sorted queue</div>
        <AnimatePresence>
          {activeQueue.map((t, i) => {
            const isBumped = bumpedIds.has(t.id);
            return (
              <motion.div
                key={t.id}
                className={`${styles.queueItem}${isBumped ? ` ${styles.bumpAnimation}` : ""}`}
                data-priority={t.priority}
                initial={noMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: i < 3 ? 1 : 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={noMotion ? { duration: 0 } : SPRING.snappy}
                layout
              >
                <span className={styles.queuePosition}>{i + 1}</span>
                <span className={styles.priorityBadge} data-priority={t.priority}>{t.priority}</span>
                <span className={styles.queueItemTitle}>{t.title}</span>
                {i < 3 && <span className={styles.visibleTag}>VISIBLE</span>}
                <button type="button" className={styles.toastDismiss} onClick={() => dismissToast(t.id)} aria-label={`Dismiss: ${t.title}`}>
                  x
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {activeQueue.length === 0 && (
          <div className={styles.widgetNote}>Fire notifications of different priorities. Watch critical jump ahead of info.</div>
        )}
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Fired</div>
          <div className={styles.metricValue}>{totalFired}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Priorities</div>
          <div className={styles.metricValue} data-status={prioritiesUsed.size >= 3 ? "good" : undefined}>{prioritiesUsed.size}/4</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Bump</div>
          <div className={styles.metricValue} data-status={hasBumped ? "good" : undefined}>{hasBumped ? "Yes" : "No"}</div>
        </div>
      </div>

      <div className={styles.widgetNote}>
        Fire 5+ notifications using 3+ priority levels. Fill the queue with info toasts, then fire a critical -- watch it jump to the front.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 7: Toast Animation
// ═══════════════════════════════════════════════════════════════════

type AnimStrategy = "slide" | "fade" | "scale";

function ToastAnimationWidget() {
  const { addToast, visibleToasts, dismissToast, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [strategy, setStrategy] = useState<AnimStrategy>("slide");
  const [triedStrategies, setTriedStrategies] = useState<Set<AnimStrategy>>(new Set(["slide"]));
  const [predictionDone, setPredictionDone] = useState(false);

  useEffect(() => {
    if (triedStrategies.size >= 3) markStepComplete(7);
  }, [triedStrategies.size, markStepComplete]);

  const handleFire = () => {
    addToast(makeToast("info", "toast"));
  };

  const STRATEGIES: { id: AnimStrategy; name: string; desc: string }[] = [
    { id: "slide", name: "Slide In", desc: "translateX from right -- avoids vertical layout shift" },
    { id: "fade", name: "Fade", desc: "Opacity only -- no layout impact but less visible" },
    { id: "scale", name: "Scale", desc: "Scale from 0 -- causes vertical layout shift as height grows" },
  ];

  const animVariants: Record<AnimStrategy, { initial: Record<string, number>; exit: Record<string, number> }> = {
    slide: { initial: { opacity: 0, x: 20 }, exit: { opacity: 0, x: 20 } },
    fade: { initial: { opacity: 0 }, exit: { opacity: 0 } },
    scale: { initial: { opacity: 0, scale: 0.5 }, exit: { opacity: 0, scale: 0.5 } },
  };

  return (
    <div className={styles.widgetPanel} data-category="toast">
      <div className={styles.widgetTitle}>Animate toast lifecycle</div>

      <PredictionChallenge
        question="Which animation approach best avoids layout shift when a new toast enters?"
        options={[
          "Scale from center -- grows into place",
          "Slide from the side -- doesn't affect vertical flow",
          "Fade in place -- height appears instantly",
        ]}
        correctIndex={1}
        explanation="Sliding from the side avoids vertical layout shift because the toast slot is already reserved. Scale causes the container to grow as the element scales up, and fade makes height appear instantly which can jank other elements."
        onAnswer={() => setPredictionDone(true)}
      />

      <div className={styles.widgetSubtitle}>Try each strategy</div>
      <div className={styles.strategyGroup} role="radiogroup" aria-label="Animation strategy">
        {STRATEGIES.map(s => (
          <button key={s.id} type="button" role="radio" aria-checked={strategy === s.id}
            className={styles.strategyOption} data-active={strategy === s.id ? "true" : undefined}
            onClick={() => { setStrategy(s.id); setTriedStrategies(prev => new Set(prev).add(s.id)); }}>
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.widgetNote}>{STRATEGIES.find(s => s.id === strategy)?.desc}</div>

      <button type="button" className={styles.actionButton} onClick={handleFire} aria-label="Fire toast with current animation">
        Fire with {strategy}
      </button>

      <div className={styles.toastContainer} aria-label="Animated toast area">
        <AnimatePresence>
          {visibleToasts.slice(0, 3).map(t => {
            const v = animVariants[strategy];
            return (
              <motion.div
                key={t.id}
                className={styles.toast}
                data-priority={t.priority}
                initial={noMotion ? false : v.initial}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={noMotion ? { opacity: 0 } : v.exit}
                transition={noMotion ? { duration: 0 } : SPRING.snappy}
                layout
              >
                <span className={styles.toastIcon}>{PRIORITY_ICON[t.priority]}</span>
                <div className={styles.toastBody}>
                  <div className={styles.toastTitle}>{t.title}</div>
                  <div className={styles.toastMessage}>{t.message}</div>
                  <ToastCountdownBar toast={t} />
                </div>
                <button type="button" className={styles.toastDismiss} onClick={() => dismissToast(t.id)} aria-label={`Dismiss: ${t.title}`}>
                  x
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Strategies tried</div>
          <div className={styles.metricValue} data-status={triedStrategies.size >= 3 ? "good" : undefined}>{triedStrategies.size}/3</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 8: Notification Center
// ═══════════════════════════════════════════════════════════════════

function NotificationCenterWidget() {
  const { addToast, notificationCenter, markRead, markAllRead, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [readCount, setReadCount] = useState(0);

  const unreadCount = notificationCenter.filter(n => !n.read).length;

  useEffect(() => {
    if (notificationCenter.length >= 3 && readCount >= 2) markStepComplete(8);
  }, [notificationCenter.length, readCount, markStepComplete]);

  const handleMarkRead = (id: string) => {
    markRead(id);
    setReadCount(c => c + 1);
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread": return notificationCenter.filter(n => !n.read);
      case "read": return notificationCenter.filter(n => n.read);
      default: return notificationCenter;
    }
  }, [notificationCenter, filter]);

  const FILTERS: { id: "all" | "unread" | "read"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "read", label: "Read" },
  ];

  return (
    <div className={styles.widgetPanel} data-category="toast">
      <div className={styles.widgetTitle}>Notification center -- persistent inbox</div>

      <div className={styles.inlineRowCenter}>
        <button type="button" className={styles.actionButton} onClick={() => addToast(makeToast(randomSample(["info", "warning", "error"] as Priority[]), "in-app"))} aria-label="Receive new notification">
          + Receive notification
        </button>
        <button type="button" className={styles.toolButton} onClick={markAllRead} aria-label="Mark all as read">
          Mark all read
        </button>
        <span role="status" className={`${styles.priorityBadge} ${styles.unreadBadgeInline}`} data-priority="error">
          {unreadCount} unread
        </span>
      </div>

      <div className={styles.filterBar} role="radiogroup" aria-label="Filter notifications">
        {FILTERS.map(f => (
          <button key={f.id} type="button" role="radio" aria-checked={filter === f.id}
            className={styles.toolButton} data-active={filter === f.id ? "true" : undefined}
            onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.notificationCenter} role="log" aria-label="Notification center">
        <AnimatePresence>
          {filtered.map((n, i) => (
            <motion.button
              key={n.id}
              type="button"
              className={styles.notificationItem}
              data-unread={!n.read ? "true" : undefined}
              onClick={() => handleMarkRead(n.id)}
              initial={noMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={noMotion ? { duration: 0 } : { ...SPRING.snappy, delay: i * STAGGER.fast }}
              layout
              aria-label={`${n.read ? "Read" : "Unread"}: ${n.title} -- ${n.message}`}
            >
              {!n.read && <span className={styles.unreadBadge} />}
              <span className={styles.priorityBadge} data-priority={n.priority}>{n.priority}</span>
              <span className={styles.notifItemContent}>
                <span className={styles.notifItemTitle}>{n.title}</span>
                <span className={styles.notifItemMessage}>{n.message}</span>
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className={styles.widgetNote}>
            {filter === "all" ? "No notifications yet. Click receive above." : `No ${filter} notifications.`}
          </div>
        )}
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total</div>
          <div className={styles.metricValue}>{notificationCenter.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Read</div>
          <div className={styles.metricValue} data-status={readCount >= 2 ? "good" : undefined}>{readCount}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 9: Push Permission
// ═══════════════════════════════════════════════════════════════════

function PushPermissionWidget() {
  const { permissionState, setPermissionState, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [flowStage, setFlowStage] = useState(0);
  const [showSoftAsk, setShowSoftAsk] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (completed) markStepComplete(9);
  }, [completed, markStepComplete]);

  const startFlow = () => {
    setFlowStage(1);
    setShowSoftAsk(true);
    setPermissionState("prompt");
  };

  const handleSoftAskContinue = () => {
    setShowSoftAsk(false);
    setFlowStage(2);
  };

  const handleBrowserDecision = (granted: boolean) => {
    if (granted) {
      setPermissionState("granted");
      setFlowStage(3);
    } else {
      setPermissionState("denied");
      setFlowStage(4);
    }
    setCompleted(true);
  };

  const reset = () => {
    setFlowStage(0);
    setShowSoftAsk(false);
    setPermissionState("default");
    setCompleted(false);
  };

  const STEPS = [
    { label: "Default", desc: "User has not been asked yet" },
    { label: "Soft Ask", desc: "Explain why notifications are useful before the real prompt" },
    { label: "Browser Prompt", desc: "The real Notification.requestPermission() dialog" },
    { label: "Granted", desc: "User allowed -- push subscription can be created" },
    { label: "Denied", desc: "User blocked -- cannot ask again without browser settings" },
  ];

  return (
    <div className={styles.widgetPanel} data-category="push">
      <div className={styles.widgetTitle}>Push permission flow -- soft-ask pattern</div>

      <div className={styles.permissionFlow}>
        {STEPS.map((s, i) => {
          const isActive = flowStage === i;
          const isComplete = flowStage > i && i < 3;
          const isDenied = i === 4 && flowStage === 4;
          return (
            <motion.div
              key={i}
              className={styles.permissionStep}
              data-active={isActive ? "true" : undefined}
              data-complete={isComplete ? "true" : undefined}
              data-denied={isDenied ? "true" : undefined}
              initial={noMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={noMotion ? { duration: 0 } : { ...SPRING.gentle, delay: i * STAGGER.fast }}
            >
              <span className={styles.permissionStepNumber}>
                {isComplete ? "✓" : isDenied ? "✗" : i + 1}
              </span>
              <span>
                <span className={styles.permissionStepLabel}>{s.label}</span>
                <span className={styles.permissionStepDesc}>{s.desc}</span>
              </span>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {flowStage === 0 && (
          <motion.div
            key="start"
            initial={noMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            <button type="button" className={styles.actionButton} onClick={startFlow} aria-label="Begin permission flow">
              Begin permission flow
            </button>
          </motion.div>
        )}

        {showSoftAsk && (
          <motion.div
            key="softask"
            className={`${styles.widgetPanel} ${styles.softAskBorder}`}
            initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={noMotion ? { duration: 0 } : SPRING.gentle}
          >
            <div className={styles.widgetTitle}>Enable notifications?</div>
            <div className={styles.widgetNote}>
              Get instant alerts for critical system events, security warnings, and important updates.
              You can customize which notifications you receive in settings.
            </div>
            <div className={styles.inlineRow}>
              <button type="button" className={styles.actionButton} onClick={handleSoftAskContinue} aria-label="Continue to browser prompt">
                Enable notifications
              </button>
              <button type="button" className={styles.toolButton} onClick={() => { setFlowStage(0); setShowSoftAsk(false); setPermissionState("default"); }} aria-label="Not now">
                Not now
              </button>
            </div>
          </motion.div>
        )}

        {flowStage === 2 && !showSoftAsk && (
          <motion.div
            key="browser"
            className={`${styles.widgetPanel} ${styles.browserPromptBorder}`}
            initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={noMotion ? { duration: 0 } : SPRING.gentle}
          >
            <div className={styles.widgetTitle}>Browser notification prompt</div>
            <div className={styles.widgetNote}>
              &quot;example.com wants to send you notifications&quot;
            </div>
            <div className={styles.inlineRow}>
              <button type="button" className={styles.actionButton} onClick={() => handleBrowserDecision(true)} aria-label="Allow notifications">
                Allow
              </button>
              <button type="button" className={styles.toolButton} onClick={() => handleBrowserDecision(false)} aria-label="Block notifications">
                Block
              </button>
            </div>
          </motion.div>
        )}

        {(flowStage === 3 || flowStage === 4) && (
          <motion.div
            key="result"
            initial={noMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            <div className={styles.widgetNote} data-tone={flowStage === 3 ? "success" : undefined}>
              {flowStage === 3
                ? "Permission granted. Push subscription can now be created. The soft-ask pattern avoids wasting the one-time browser prompt."
                : "Permission denied. The browser will not show the prompt again -- the user must manually enable in browser settings. This is why the soft-ask pattern is crucial."}
            </div>
            <button type="button" className={`${styles.toolButton} ${styles.marginTopSm}`} onClick={reset} aria-label="Reset permission flow">
              Reset flow
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 10: Push API — order-the-stages challenge
// ═══════════════════════════════════════════════════════════════════

const PUSH_STAGES = [
  { label: "Register SW", desc: "navigator.serviceWorker.register('/sw.js')" },
  { label: "Get subscription", desc: "registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })" },
  { label: "Send to server", desc: "POST /push/subscribe with PushSubscription object" },
  { label: "Receive push", desc: "self.addEventListener('push', e => e.waitUntil(showNotification(...)))" },
];

const PUSH_ORDER_OPTIONS = [
  "Register Service Worker",
  "Subscribe to Push Manager",
  "Send subscription to server",
  "Receive & display push event",
];

const PUSH_PREDICTION_OPTIONS = [
  "Register SW -> Subscribe -> Send to server -> Receive push",
  "Subscribe -> Register SW -> Receive push -> Send to server",
  "Send to server -> Register SW -> Subscribe -> Receive push",
  "Register SW -> Receive push -> Subscribe -> Send to server",
];

function PushAPIWidget() {
  const { markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  // Phase: "predict" -> "order" -> "complete"
  const [phase, setPhase] = useState<"predict" | "order" | "complete">("predict");
  const [predictionDone, setPredictionDone] = useState(false);
  const [placed, setPlaced] = useState<(number | null)[]>([null, null, null, null]);
  const [availableOptions, setAvailableOptions] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [slotFeedback, setSlotFeedback] = useState<("correct" | "wrong" | null)[]>([null, null, null, null]);
  const [orderComplete, setOrderComplete] = useState(false);
  const [showExpiration, setShowExpiration] = useState(false);
  const [expirationSeen, setExpirationSeen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (orderComplete && expirationSeen) markStepComplete(10);
  }, [orderComplete, expirationSeen, markStepComplete]);

  const handlePrediction = () => {
    setPredictionDone(true);
    timerRef.current = setTimeout(() => setPhase("order"), 600);
  };

  const handlePickOption = (optionIdx: number) => {
    const nextSlot = placed.indexOf(null);
    if (nextSlot === -1) return;

    const isCorrect = optionIdx === nextSlot;
    const newPlaced = [...placed];
    const newFeedback = [...slotFeedback];

    if (isCorrect) {
      newPlaced[nextSlot] = optionIdx;
      newFeedback[nextSlot] = "correct";
      setPlaced(newPlaced);
      setSlotFeedback(newFeedback);
      setAvailableOptions(prev => {
        const next = new Set(prev);
        next.delete(optionIdx);
        return next;
      });

      // Check if all slots filled
      if (newPlaced.every(p => p !== null)) {
        setOrderComplete(true);
        setPhase("complete");
      }
    } else {
      newFeedback[nextSlot] = "wrong";
      setSlotFeedback(newFeedback);
      // Clear wrong feedback after a moment
      timerRef.current = setTimeout(() => {
        setSlotFeedback(prev => {
          const cleared = [...prev];
          cleared[nextSlot] = null;
          return cleared;
        });
      }, 1200);
    }
  };

  const handleExpirationToggle = () => {
    setShowExpiration(v => !v);
    if (!expirationSeen) setExpirationSeen(true);
  };

  const reset = () => {
    setPhase("predict");
    setPredictionDone(false);
    setPlaced([null, null, null, null]);
    setAvailableOptions(new Set([0, 1, 2, 3]));
    setSlotFeedback([null, null, null, null]);
    setOrderComplete(false);
    setShowExpiration(false);
    setExpirationSeen(false);
  };

  return (
    <div className={styles.widgetPanel} data-category="push">
      <div className={styles.widgetTitle}>Push API integration -- build the pipeline</div>

      {/* Phase 1: Prediction challenge */}
      <AnimatePresence mode="wait">
        {phase === "predict" && (
          <motion.div
            key="predict"
            initial={noMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={noMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            <PredictionChallenge
              question="What's the correct order of the Push API setup?"
              options={PUSH_PREDICTION_OPTIONS}
              correctIndex={0}
              explanation="The Service Worker must be registered first (it manages push events). Then you subscribe via the Push Manager (requires active SW). The subscription endpoint is sent to your server (so it can push to this client). Finally the SW listens for push events."
              onAnswer={handlePrediction}
            />
          </motion.div>
        )}

        {/* Phase 2: Order the stages */}
        {phase === "order" && (
          <motion.div
            key="order"
            initial={noMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={noMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            <div className={styles.widgetSubtitle}>Place each stage in order</div>

            <div className={styles.orderChallenge} role="list" aria-label="Push API stage slots">
              {PUSH_STAGES.map((stage, i) => {
                const filledOption = placed[i];
                const feedback = slotFeedback[i];
                return (
                  <motion.div
                    key={i}
                    className={styles.orderSlot}
                    data-filled={filledOption !== null ? "true" : undefined}
                    data-correct={feedback === "correct" ? "true" : undefined}
                    data-wrong={feedback === "wrong" ? "true" : undefined}
                    role="listitem"
                    initial={noMotion ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={noMotion ? { duration: 0 } : { ...SPRING.gentle, delay: i * STAGGER.fast }}
                  >
                    <span className={styles.orderSlotIndex}>{i + 1}</span>
                    {filledOption !== null ? (
                      <span className={styles.swStageContent}>
                        <span className={styles.swStageLabel}>{stage.label}</span>
                        <span className={styles.swStageDesc}>{stage.desc}</span>
                      </span>
                    ) : (
                      <span className={styles.permissionStepDesc}>
                        {placed.indexOf(null) === i ? "Pick the next step below..." : "---"}
                      </span>
                    )}
                    {feedback === "correct" && <span className={styles.doneTag}>✓</span>}
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {slotFeedback.some(f => f === "wrong") && (
                <motion.div
                  className={styles.orderFeedback}
                  data-wrong="true"
                  initial={noMotion ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={noMotion ? { duration: 0 } : SPRING.quick}
                  aria-live="polite"
                >
                  {(() => {
                    const wrongSlot = slotFeedback.indexOf("wrong");
                    if (wrongSlot === 0) return "The Service Worker must be registered first -- it manages all push events.";
                    if (wrongSlot === 1) return "You need an active Service Worker before subscribing to the Push Manager.";
                    if (wrongSlot === 2) return "The subscription must be created before sending it to the server.";
                    return "This step can only happen after all setup is complete.";
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.widgetSubtitle}>Available stages</div>
            <div className={styles.predictionOptions}>
              {PUSH_ORDER_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.orderOption}
                  onClick={() => handlePickOption(i)}
                  disabled={!availableOptions.has(i)}
                  aria-label={`Place: ${opt}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 3: Complete + expiration scenario */}
        {phase === "complete" && (
          <motion.div
            key="complete"
            initial={noMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={noMotion ? { duration: 0 } : TRANSITION.enterCard}
          >
            <div className={styles.swRegistration}>
              {PUSH_STAGES.map((s, i) => (
                <motion.div
                  key={i}
                  className={styles.swStage}
                  data-complete="true"
                  initial={noMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={noMotion ? { duration: 0 } : { ...SPRING.gentle, delay: i * STAGGER.fast }}
                >
                  <span className={styles.swStageIndicator} />
                  <span className={styles.swStageContent}>
                    <span className={styles.swStageLabel}>{s.label}</span>
                    <span className={styles.swStageDesc}>{s.desc}</span>
                  </span>
                  <span className={styles.doneTag}>Done</span>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              <motion.div
                className={styles.toast}
                data-priority="info"
                initial={noMotion ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={noMotion ? { duration: 0 } : SPRING.snappy}
              >
                <span className={styles.toastIcon}>i</span>
                <div className={styles.toastBody}>
                  <div className={styles.toastTitle}>Test Push Received</div>
                  <div className={styles.toastMessage}>This notification arrived via the Push API through the Service Worker</div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className={styles.widgetNote} data-tone="success">
              Push pipeline complete. Now explore what happens when the subscription expires.
            </div>

            <button
              type="button"
              className={styles.actionButton}
              onClick={handleExpirationToggle}
              aria-label={showExpiration ? "Hide expiration scenario" : "Show expiration scenario"}
              aria-expanded={showExpiration}
            >
              {showExpiration ? "Hide expiration scenario" : "What if the subscription expires?"}
            </button>

            <AnimatePresence>
              {showExpiration && (
                <motion.div
                  className={styles.expirationPanel}
                  initial={noMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={noMotion ? { duration: 0 } : SPRING.gentle}
                  aria-live="polite"
                >
                  <div className={styles.expirationTitle}>Subscription expired</div>
                  <div className={styles.expirationNote}>
                    Push subscriptions can expire (browser-dependent, typically 1-2 weeks). When the server attempts to push and gets a 410 Gone response, the subscription must be re-created. The flow restarts from stage 2: re-subscribe via pushManager.subscribe(), then update the server with the new endpoint. The Service Worker stays registered.
                  </div>
                  <div className={styles.swRegistration}>
                    <div className={styles.swStage} data-complete="true">
                      <span className={styles.swStageIndicator} />
                      <span className={styles.swStageContent}>
                        <span className={styles.swStageLabel}>1. Register SW</span>
                        <span className={styles.swStageDesc}>Already registered -- skip</span>
                      </span>
                      <span className={styles.doneTag}>Cached</span>
                    </div>
                    <div className={styles.swStage} data-active="true">
                      <span className={styles.swStageIndicator} />
                      <span className={styles.swStageContent}>
                        <span className={styles.swStageLabel}>2. Re-subscribe</span>
                        <span className={styles.swStageDesc}>pushManager.subscribe() with new keys</span>
                      </span>
                    </div>
                    <div className={styles.swStage} data-active="true">
                      <span className={styles.swStageIndicator} />
                      <span className={styles.swStageContent}>
                        <span className={styles.swStageLabel}>3. Update server</span>
                        <span className={styles.swStageDesc}>PUT /push/subscribe with new subscription</span>
                      </span>
                    </div>
                    <div className={styles.swStage}>
                      <span className={styles.swStageIndicator} />
                      <span className={styles.swStageContent}>
                        <span className={styles.swStageLabel}>4. Resume push</span>
                        <span className={styles.swStageDesc}>Push events flow again</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="button" className={`${styles.toolButton} ${styles.marginTopSm}`} onClick={reset} aria-label="Reset push flow">
              Reset
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Prediction</div>
          <div className={styles.metricValue} data-status={predictionDone ? "good" : undefined}>{predictionDone ? "Done" : "---"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Ordered</div>
          <div className={styles.metricValue} data-status={orderComplete ? "good" : undefined}>{placed.filter(p => p !== null).length}/4</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Expiration</div>
          <div className={styles.metricValue} data-status={expirationSeen ? "good" : undefined}>{expirationSeen ? "Seen" : "---"}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 11: Notification Grouping
// ═══════════════════════════════════════════════════════════════════

type GroupedNotifications = {
  groupId: string;
  items: ToastEntry[];
  collapsed: boolean;
};

function NotificationGroupingWidget() {
  const { markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [notifications, setNotifications] = useState<ToastEntry[]>([]);
  const [threshold, setThreshold] = useState(3);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hasGrouped, setHasGrouped] = useState(false);
  const [hasExpanded, setHasExpanded] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (hasGrouped && hasExpanded) markStepComplete(11);
  }, [hasGrouped, hasExpanded, markStepComplete]);

  const addSimilar = (groupId: string, count: number) => {
    const newItems: ToastEntry[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: `group-${++idRef.current}`,
        title: groupId === "alice" ? "New message from Alice" : "New comment on your post",
        message: `Message #${idRef.current}`,
        priority: "info",
        type: "in-app",
        createdAt: Date.now() + i,
        expiresAt: Date.now() + 60000,
        read: false,
        dismissed: false,
        groupId,
      });
    }
    setNotifications(prev => [...prev, ...newItems]);
  };

  const groups = useMemo(() => {
    const byGroup: Record<string, ToastEntry[]> = {};
    const ungrouped: ToastEntry[] = [];
    for (const n of notifications) {
      if (n.groupId) {
        if (!byGroup[n.groupId]) byGroup[n.groupId] = [];
        byGroup[n.groupId].push(n);
      } else {
        ungrouped.push(n);
      }
    }

    const result: (GroupedNotifications | ToastEntry)[] = [];
    for (const [gid, items] of Object.entries(byGroup)) {
      if (items.length >= threshold) {
        result.push({ groupId: gid, items, collapsed: !expandedGroups.has(gid) });
        if (!hasGrouped) setHasGrouped(true);
      } else {
        result.push(...items);
      }
    }
    result.push(...ungrouped);
    return result;
  }, [notifications, threshold, expandedGroups, hasGrouped]);

  const toggleGroup = (gid: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(gid)) {
        next.delete(gid);
      } else {
        next.add(gid);
        if (!hasExpanded) setHasExpanded(true);
      }
      return next;
    });
  };

  return (
    <div className={styles.widgetPanel} data-category="queue">
      <div className={styles.widgetTitle}>Notification grouping -- collapse similar items</div>

      <div className={styles.inlineRow}>
        <button type="button" className={styles.actionButton} onClick={() => addSimilar("alice", 1)} aria-label="Add message from Alice">
          + Message from Alice
        </button>
        <button type="button" className={styles.actionButton} onClick={() => addSimilar("comments", 1)} aria-label="Add comment notification">
          + Comment
        </button>
        <button type="button" className={styles.toolButton} onClick={() => addSimilar("alice", 5)} aria-label="Burst 5 from Alice">
          Burst 5 (Alice)
        </button>
      </div>

      <div className={styles.toggleRow}>
        <span className={styles.widgetSliderLabel}>Group threshold: {threshold}</span>
        <input
          type="range" min={2} max={10} value={threshold}
          className={styles.rangeInput}
          onChange={e => setThreshold(Number(e.target.value))}
          aria-label="Grouping threshold"
          aria-valuetext={`Group after ${threshold} similar notifications`}
        />
      </div>

      <div className={styles.notificationCenter} role="log" aria-label="Grouped notifications">
        <AnimatePresence>
          {groups.map((item, i) => {
            if ("groupId" in item && "items" in item) {
              const g = item as GroupedNotifications;
              return (
                <motion.div
                  key={`group-${g.groupId}`}
                  initial={noMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={noMotion ? { duration: 0 } : SPRING.snappy}
                  layout
                >
                  <button
                    type="button"
                    className={styles.groupHeader}
                    onClick={() => toggleGroup(g.groupId)}
                    aria-expanded={!g.collapsed}
                    aria-label={`Group: ${g.items[0]?.title ?? g.groupId} (${g.items.length} items)`}
                  >
                    <span>{g.collapsed ? "▶" : "▼"}</span>
                    <span className={styles.groupItemFlex}>{g.items[0]?.title ?? g.groupId}</span>
                    <span className={styles.groupCount}>{g.items.length}</span>
                  </button>
                  <AnimatePresence>
                    {!g.collapsed && (
                      <motion.div
                        className={styles.groupChildren}
                        initial={noMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={noMotion ? { duration: 0 } : SPRING.gentle}
                      >
                        {g.items.map(n => (
                          <div key={n.id} className={`${styles.notificationItem} ${styles.noPointer}`}>
                            <span className={styles.groupChildMessage}>{n.message}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }
            const n = item as ToastEntry;
            return (
              <motion.div
                key={n.id}
                className={`${styles.notificationItem} ${styles.noPointer}`}
                initial={noMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={noMotion ? { duration: 0 } : { ...SPRING.snappy, delay: i * STAGGER.fast }}
                layout
              >
                <span className={styles.priorityBadge} data-priority={n.priority}>{n.priority}</span>
                <span className={styles.ungroupedTitle}>{n.title}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {notifications.length === 0 && (
          <div className={styles.widgetNote}>Fire similar notifications to see them auto-group.</div>
        )}
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total</div>
          <div className={styles.metricValue}>{notifications.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Grouped</div>
          <div className={styles.metricValue} data-status={hasGrouped ? "good" : undefined}>{hasGrouped ? "Yes" : "No"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Expanded</div>
          <div className={styles.metricValue} data-status={hasExpanded ? "good" : undefined}>{hasExpanded ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 12: Rate Limiting — THE STRESS TEST WIDGET
// ═══════════════════════════════════════════════════════════════════

function RateLimitingWidget() {
  const { markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [throttleRate, setThrottleRate] = useState(3);
  const [localQueue, setLocalQueue] = useState<{ id: number; title: string; suppressed: boolean }[]>([]);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [spammedWithout, setSpammedWithout] = useState(false);
  const [spammedWith, setSpammedWith] = useState(false);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timerRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (spammedWithout && spammedWith) markStepComplete(12);
  }, [spammedWithout, spammedWith, markStepComplete]);

  const spam = () => {
    setLocalQueue([]);
    setSuppressedCount(0);
    const items: { id: number; title: string; suppressed: boolean }[] = [];
    let suppressed = 0;

    for (let i = 0; i < 20; i++) {
      const id = ++idRef.current;
      const isSuppressed = rateLimitEnabled && i >= throttleRate;
      if (isSuppressed) suppressed++;
      items.push({ id, title: `Notification #${id}`, suppressed: isSuppressed });
    }

    // Stagger the additions
    items.forEach((item, i) => {
      timerRef.current.push(
        setTimeout(() => {
          setLocalQueue(prev => [...prev, item]);
          if (item.suppressed) setSuppressedCount(c => c + 1);
        }, i * 50)
      );
    });

    if (rateLimitEnabled) {
      setSpammedWith(true);
    } else {
      setSpammedWithout(true);
    }
  };

  const clear = () => {
    setLocalQueue([]);
    setSuppressedCount(0);
  };

  const visibleItems = localQueue.filter(i => !i.suppressed);
  const suppressedItems = localQueue.filter(i => i.suppressed);

  return (
    <div className={styles.widgetPanel} data-category="queue">
      <div className={styles.widgetTitle}>Rate limiting -- spam protection</div>

      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Rate limiting</span>
        <button
          type="button"
          className={styles.toggleButton}
          data-on={rateLimitEnabled ? "true" : undefined}
          onClick={() => setRateLimitEnabled(v => !v)}
          role="switch"
          aria-checked={rateLimitEnabled}
          aria-label="Toggle rate limiting"
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>

      {rateLimitEnabled && (
        <div className={styles.toggleRow}>
          <span className={styles.widgetSliderLabel}>Max per burst: {throttleRate}</span>
          <input
            type="range" min={1} max={10} value={throttleRate}
            className={styles.rangeInput}
            onChange={e => setThrottleRate(Number(e.target.value))}
            aria-label="Throttle rate"
            aria-valuetext={`${throttleRate} per second`}
          />
        </div>
      )}

      <div className={styles.inlineRow}>
        <button type="button" className={styles.actionButton} onClick={spam} aria-label="Spam 20 notifications">
          Spam 20 notifications
        </button>
        <button type="button" className={styles.toolButton} onClick={clear} aria-label="Clear">
          Clear
        </button>
      </div>

      <div className={styles.queueVisualization}>
        {visibleItems.length > 0 && (
          <div className={styles.queueSection}>
            <div className={styles.queueSectionLabel}>Displayed ({visibleItems.length})</div>
            <AnimatePresence>
              {visibleItems.slice(0, 10).map((item, i) => (
                <motion.div
                  key={item.id}
                  className={styles.queueItem}
                  data-priority="info"
                  initial={noMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={noMotion ? { duration: 0 } : { ...SPRING.snappy, delay: i * STAGGER.fast }}
                  layout
                >
                  <span className={styles.queuePosition}>{i + 1}</span>
                  <span className={styles.ungroupedTitle}>{item.title}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleItems.length > 10 && (
              <div className={styles.overflowIndicator}>+{visibleItems.length - 10} more</div>
            )}
          </div>
        )}

        {suppressedItems.length > 0 && (
          <div className={styles.queueSection}>
            <div className={styles.queueSectionLabel}>Suppressed ({suppressedItems.length})</div>
            <div className={styles.overflowIndicator}>
              {suppressedItems.length} notifications suppressed by rate limiter -- would show as summary: &quot;{suppressedItems.length} new notifications&quot;
            </div>
          </div>
        )}
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Fired</div>
          <div className={styles.metricValue}>{localQueue.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Displayed</div>
          <div className={styles.metricValue}>{visibleItems.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Suppressed</div>
          <div className={styles.metricValue} data-status={suppressedCount > 0 ? "warning" : undefined}>{suppressedCount}</div>
        </div>
      </div>

      <div className={styles.widgetNote}>
        First spam WITHOUT rate limiting to see all 20 flood in. Then enable rate limiting and spam again to see the difference.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 13: Preferences
// ═══════════════════════════════════════════════════════════════════

const PREF_CATEGORIES = ["Messages", "Alerts", "Marketing", "System"];
const PREF_PRIORITIES: Priority[] = ["info", "warning", "error", "critical"];

function PreferencesWidget() {
  const { markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [prefs, setPrefs] = useState<Record<string, Record<Priority, boolean>>>(() => {
    const result: Record<string, Record<Priority, boolean>> = {};
    for (const cat of PREF_CATEGORIES) {
      result[cat] = { info: true, warning: true, error: true, critical: true };
    }
    return result;
  });
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);
  const [blockedNotifications, setBlockedNotifications] = useState<string[]>([]);
  const [hasDisabled, setHasDisabled] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false);

  useEffect(() => {
    if (hasDisabled && hasBlocked) markStepComplete(13);
  }, [hasDisabled, hasBlocked, markStepComplete]);

  const togglePref = (cat: string, pri: Priority) => {
    setPrefs(prev => {
      const catPrefs = prev[cat];
      if (!catPrefs) return prev;
      const next = { ...prev, [cat]: { ...catPrefs, [pri]: !catPrefs[pri] } };
      if (catPrefs[pri]) setHasDisabled(true);
      return next;
    });
  };

  const fireTestNotification = () => {
    const cat = randomSample(PREF_CATEGORIES);
    const pri = randomSample(PREF_PRIORITIES);
    const catPrefs = prefs[cat];
    const isBlocked = catPrefs ? !catPrefs[pri] : false;

    if (isBlocked) {
      setBlockedNotifications(prev => [...prev, `${cat} / ${pri}: Blocked by user preference`]);
      setHasBlocked(true);
    } else {
      setBlockedNotifications(prev => [...prev, `${cat} / ${pri}: Delivered`]);
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="settings">
      <div className={styles.widgetTitle}>Notification preferences</div>

      <div className={styles.preferenceGrid}>
        <div />
        {PREF_PRIORITIES.map(p => (
          <div key={p} className={styles.preferenceHeader}>{p}</div>
        ))}
        {PREF_CATEGORIES.map(cat => (
          <React.Fragment key={cat}>
            <div className={styles.preferenceCategory}>{cat}</div>
            {PREF_PRIORITIES.map(pri => {
              const catPrefs = prefs[cat];
              const enabled = catPrefs ? catPrefs[pri] : true;
              return (
                <button
                  key={`${cat}-${pri}`}
                  type="button"
                  className={styles.preferenceToggle}
                  data-enabled={enabled ? "true" : "false"}
                  onClick={() => togglePref(cat, pri)}
                  aria-label={`${cat} ${pri}: ${enabled ? "enabled" : "disabled"}`}
                  aria-pressed={enabled}
                >
                  {enabled ? "✓" : "✗"}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className={styles.widgetSubtitle}>Quiet hours</div>
      <div className={styles.quietHoursRow}>
        <span className={styles.quietHoursLabel}>From</span>
        <input
          type="range" min={0} max={23} value={quietStart}
          className={styles.rangeInput}
          onChange={e => setQuietStart(Number(e.target.value))}
          aria-label="Quiet hours start"
          aria-valuetext={`${quietStart}:00`}
        />
        <span className={styles.timeDisplayValue}>{quietStart}:00</span>
      </div>
      <div className={styles.quietHoursRow}>
        <span className={styles.quietHoursLabel}>To</span>
        <input
          type="range" min={0} max={23} value={quietEnd}
          className={styles.rangeInput}
          onChange={e => setQuietEnd(Number(e.target.value))}
          aria-label="Quiet hours end"
          aria-valuetext={`${quietEnd}:00`}
        />
        <span className={styles.timeDisplayValue}>{quietEnd}:00</span>
      </div>

      <button type="button" className={styles.actionButton} onClick={fireTestNotification} aria-label="Fire test notification">
        Fire random notification
      </button>

      <AnimatePresence>
        {blockedNotifications.slice(-5).map((msg, i) => (
          <motion.div
            key={`blocked-${i}-${msg}`}
            className={msg.includes("Blocked") ? styles.blockedIndicator : styles.widgetNote}
            data-tone={msg.includes("Delivered") ? "success" : undefined}
            initial={noMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={noMotion ? { duration: 0 } : SPRING.quick}
          >
            {msg}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Disabled</div>
          <div className={styles.metricValue} data-status={hasDisabled ? "good" : undefined}>{hasDisabled ? "Yes" : "No"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Blocked</div>
          <div className={styles.metricValue} data-status={hasBlocked ? "good" : undefined}>{hasBlocked ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 14: Accessibility
// ═══════════════════════════════════════════════════════════════════

function AccessibilityWidget() {
  const { addToast, visibleToasts, dismissToast, markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [predictionDone, setPredictionDone] = useState(false);
  const [srMode, setSrMode] = useState(false);
  const [kbMode, setKbMode] = useState(false);
  const [srAnnouncements, setSrAnnouncements] = useState<string[]>([]);
  const [kbTested, setKbTested] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (predictionDone && kbTested) markStepComplete(14);
  }, [predictionDone, kbTested, markStepComplete]);

  const fireWithAnnouncement = () => {
    const priority = randomSample(["info", "warning", "error", "critical"] as Priority[]);
    const toast = makeToast(priority, "toast");
    addToast(toast);
    if (srMode) {
      const region = priority === "critical" ? "assertive" : "polite";
      setSrAnnouncements(prev => [...prev, `[${region}] ${toast.title}: ${toast.message}`]);
    }
  };

  const handleKbNav = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      const firstVisible = visibleToasts[0];
      if (firstVisible) {
        dismissToast(firstVisible.id);
        setKbTested(true);
      }
    } else if (e.key === "Tab") {
      setKbTested(true);
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="settings">
      <div className={styles.widgetTitle}>Accessibility -- aria-live and keyboard navigation</div>

      <PredictionChallenge
        question="Which aria-live value should toast notifications use?"
        options={[
          "aria-live='assertive' on all toasts",
          "aria-live='polite' for most, aria-live='assertive' only for critical",
          "No aria-live -- use role='alert' instead on all toasts",
        ]}
        correctIndex={1}
        explanation="Most toasts should use aria-live='polite' to avoid interrupting the user. Only critical/urgent notifications should use role='alert' (implicitly assertive). Using assertive on everything creates an annoying screen reader experience."
        onAnswer={() => setPredictionDone(true)}
      />

      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Screen reader mode</span>
        <button
          type="button"
          className={styles.toggleButton}
          data-on={srMode ? "true" : undefined}
          onClick={() => setSrMode(v => !v)}
          role="switch"
          aria-checked={srMode}
          aria-label="Toggle screen reader mode"
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>

      <button type="button" className={styles.actionButton} onClick={fireWithAnnouncement} aria-label="Fire toast with screen reader announcement">
        Fire toast
      </button>

      <AnimatePresence>
        {srMode && srAnnouncements.length > 0 && (
          <motion.div
            className={styles.srPanel}
            initial={noMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={noMotion ? { duration: 0 } : SPRING.gentle}
          >
            <div className={styles.widgetSubtitle}>Screen reader announcements</div>
            {srAnnouncements.slice(-5).map((a, i) => (
              <div key={i} className={styles.srAnnouncement}>{a}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.widgetSubtitle}>Keyboard navigation test</div>
      <div className={styles.widgetNote}>
        Focus the input below, then fire a toast. The toast should NOT steal focus from your input. Press Tab to navigate to toast actions, Escape to dismiss.
      </div>

      <div
        className={styles.kbTestArea}
        data-active={kbMode ? "true" : undefined}
        onKeyDown={handleKbNav}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.kbTestInput}
          placeholder="Type here -- toast should not steal focus"
          onFocus={() => setKbMode(true)}
          onBlur={() => setKbMode(false)}
          aria-label="Test input for keyboard navigation"
        />
        <div className={styles.toastContainer} aria-label="Toast area for keyboard test">
          <AnimatePresence>
            {visibleToasts.slice(0, 2).map(t => (
              <motion.div
                key={t.id}
                className={styles.toast}
                data-priority={t.priority}
                role={t.priority === "critical" ? "alert" : undefined}
                aria-live={t.priority === "critical" ? undefined : "polite"}
                initial={noMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={noMotion ? { duration: 0 } : SPRING.snappy}
                layout
              >
                <span className={styles.toastIcon}>{PRIORITY_ICON[t.priority]}</span>
                <div className={styles.toastBody}>
                  <div className={styles.toastTitle}>{t.title}</div>
                  <div className={styles.toastMessage}>{t.message}</div>
                  <ToastCountdownBar toast={t} />
                </div>
                <button
                  type="button"
                  className={styles.toastDismiss}
                  onClick={() => { dismissToast(t.id); setKbTested(true); }}
                  aria-label={`Dismiss: ${t.title}`}
                  tabIndex={0}
                >
                  x
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Prediction</div>
          <div className={styles.metricValue} data-status={predictionDone ? "good" : undefined}>{predictionDone ? "Done" : "---"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>KB tested</div>
          <div className={styles.metricValue} data-status={kbTested ? "good" : undefined}>{kbTested ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 15: Integration — THE CAPSTONE
// ═══════════════════════════════════════════════════════════════════

type StressEntry = { time: number; priority: Priority; suppressed: boolean };

function IntegrationWidget() {
  const { markStepComplete } = useNotification();
  const noMotion = usePrefersReducedMotion();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [entries, setEntries] = useState<StressEntry[]>([]);
  const [queueDepth, setQueueDepth] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timerRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (completed) markStepComplete(15);
  }, [completed, markStepComplete]);

  const runStressTest = () => {
    setRunning(true);
    setEntries([]);
    setQueueDepth([]);

    const priorities: Priority[] = ["info", "warning", "error", "critical"];
    const totalNotifications = 30;
    let currentDepth = 0;

    for (let i = 0; i < totalNotifications; i++) {
      timerRef.current.push(
        setTimeout(() => {
          const pri = priorities[Math.floor(Math.random() * priorities.length)] as Priority;
          const suppressed = i > 20 && (pri === "info" || pri === "warning");
          if (!suppressed) currentDepth = Math.min(currentDepth + 1, 10);
          if (i % 3 === 0 && currentDepth > 0) currentDepth--;

          setEntries(prev => [...prev, { time: i * 333, priority: pri, suppressed }]);
          setQueueDepth(prev => [...prev, currentDepth]);

          if (i === totalNotifications - 1) {
            setRunning(false);
            setCompleted(true);
          }
        }, i * 333)
      );
    }
  };

  const priorityCounts = useMemo(() => {
    const counts: Record<Priority, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    for (const e of entries) {
      counts[e.priority]++;
    }
    return counts;
  }, [entries]);

  const maxCount = Math.max(1, ...Object.values(priorityCounts));
  const suppressedTotal = entries.filter(e => e.suppressed).length;
  const maxDepth = Math.max(1, ...queueDepth, 1);

  // Sparkline path
  const sparklinePath = useMemo(() => {
    if (queueDepth.length < 2) return "";
    const w = 200;
    const h = 40;
    return queueDepth.map((d, i) => {
      const x = (i / (queueDepth.length - 1)) * w;
      const y = h - (d / maxDepth) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [queueDepth, maxDepth]);

  return (
    <div className={styles.widgetPanel} data-category="queue">
      <div className={styles.widgetTitle}>Full system stress test</div>

      <button
        type="button"
        className={styles.actionButton}
        onClick={runStressTest}
        disabled={running}
        aria-label="Run stress test"
      >
        {running ? `Running... (${entries.length}/30)` : completed ? "Run again" : "Run stress test"}
      </button>

      {entries.length > 0 && (
        <motion.div
          className={styles.dashboardGrid}
          initial={noMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={noMotion ? { duration: 0 } : SPRING.gentle}
        >
          <div className={styles.dashboardCard}>
            <div className={styles.dashboardCardTitle}>Queue depth over time</div>
            <div className={styles.sparklineContainer}>
              <svg className={styles.sparklineSvg} viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d={sparklinePath} fill="none" stroke="var(--diagram-layer-9)" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <div className={styles.dashboardCard}>
            <div className={styles.dashboardCardTitle}>Priority distribution</div>
            <div className={styles.barChartContainer}>
              {(["info", "warning", "error", "critical"] as Priority[]).map(p => (
                <div key={p} className={styles.barChartColumn}>
                  <div
                    className={styles.barChartBar}
                    data-priority={p}
                    style={{ height: `${(priorityCounts[p] / maxCount) * 100}%` }}
                  />
                  <div className={styles.barChartLabel}>{p.slice(0, 4)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.dashboardCard}>
            <div className={styles.dashboardCardTitle}>Time-to-display by priority</div>
            <div className={styles.priorityTimingRow}>
              {(["critical", "error", "warning", "info"] as Priority[]).map(p => {
                const ms = p === "critical" ? "12ms" : p === "error" ? "45ms" : p === "warning" ? "120ms" : "350ms";
                return (
                  <div key={p} className={styles.priorityTimingItem}>
                    <span className={styles.priorityBadge} data-priority={p}>{p}</span>
                    <span className={styles.timingValue}>{ms}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.dashboardCard}>
            <div className={styles.dashboardCardTitle}>Suppressed by rate limit</div>
            <div className={styles.summaryCenter}>
              <div className={`${styles.metricValue} ${styles.suppressedMetricValue}`} data-status={suppressedTotal > 0 ? "warning" : "good"}>
                {suppressedTotal}
              </div>
              <div className={styles.metricLabel}>notifications suppressed</div>
            </div>
          </div>
        </motion.div>
      )}

      {completed && (
        <motion.div
          className={styles.sideBySide}
          initial={noMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={noMotion ? { duration: 0 } : SPRING.gentle}
        >
          <div className={styles.sideBySidePanel}>
            <div className={styles.sideBySideLabel} data-variant="before">Before this lesson</div>
            <div className={styles.summaryText}>
              No queue -- all notifications display simultaneously.
              No priority -- critical alerts lost in noise.
              No grouping -- 20 similar toasts flood the screen.
              No rate limit -- UI overwhelmed during bursts.
            </div>
          </div>
          <div className={styles.sideBySidePanel}>
            <div className={styles.sideBySideLabel} data-variant="after">After this lesson</div>
            <div className={styles.summaryText}>
              Priority queue ensures critical shows first.
              Max-visible limit keeps UI clean.
              Grouping collapses similar notifications.
              Rate limiting suppresses bursts with summaries.
              Notification center preserves history.
            </div>
          </div>
        </motion.div>
      )}

      <div className={styles.metricsBar} aria-live="polite">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total sent</div>
          <div className={styles.metricValue}>{entries.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Suppressed</div>
          <div className={styles.metricValue} data-status={suppressedTotal > 0 ? "warning" : undefined}>{suppressedTotal}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Complete</div>
          <div className={styles.metricValue} data-status={completed ? "good" : undefined}>{completed ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}

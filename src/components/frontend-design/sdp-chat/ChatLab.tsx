"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  ChatProvider,
  useChat,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  GROUP_THRESHOLD_MS,
  type ChatMessage,
  type ConnectionState,
  type MessageStatus,
  type TypeDef,
} from "./chat-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { CHAT_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./ChatLab.module.css";

function avatarColor(hue: number): string {
  return `oklch(55% 0.14 ${hue})`;
}

// ── Public API ──────────────────────────────────────────────────────

export function ChatLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;

  return (
    <ChatProvider activeStep={activeStep}>
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
            <ChatEvolution />
          )}
        </div>
      </div>
    </ChatProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "B", "Msg", "Snd", "✓✓",
  "⌨", "↻", "◌",
  "Grp", "♡", "👁",
  "🔒", "∞²",
];

const CHAT_STEP_TITLES = [
  "Requirements", "API Design", "Architecture",
  "Baseline", "Message List", "Send Message", "Delivery Status",
  "Typing Indicator", "Reconnection", "Offline Queue",
  "Message Grouping", "Reactions", "Read Receipts",
  "Encryption", "Scale",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <nav className={styles.stepBar} aria-label="Build steps">
      <ol className={styles.stepList} role="list">
        {STEP_LABELS.map((label, i) => (
          <li
            key={i}
            className={styles.stepDot}
            data-active={i + 1 <= activeStep ? "true" : undefined}
            data-current={i + 1 === activeStep ? "true" : undefined}
            aria-current={i + 1 === activeStep ? "step" : undefined}
            aria-label={`Step ${i + 1}: ${CHAT_STEP_TITLES[i]}${i + 1 < activeStep ? " (complete)" : ""}`}
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
  return <ComponentTreeView />;
}

const CHAT_SCOPE_COMPLEXITY: Record<string, { loc: number; wsFrames: number; components: number }> = {
  "one-on-one": { loc: 90, wsFrames: 3, components: 2 },
  "delivery-status": { loc: 70, wsFrames: 4, components: 1 },
  offline: { loc: 110, wsFrames: 2, components: 2 },
  typing: { loc: 55, wsFrames: 2, components: 1 },
  media: { loc: 130, wsFrames: 3, components: 3 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useChat();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter((s) => scopeEnabled.has(s.id))
      .map((s) => s.label.replace("?", ""))
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    const baseLoc = 220;
    const baseFrames = 4;
    const baseComponents = 4;
    let loc = baseLoc;
    let wsFrames = baseFrames;
    let components = baseComponents;
    scopeEnabled.forEach((id) => {
      const c = CHAT_SCOPE_COMPLEXITY[id];
      if (c) { loc += c.loc; wsFrames += c.wsFrames; components += c.components; }
    });
    const grade = loc < 350 ? "Low" : loc < 550 ? "Medium" : "High";
    return { loc, wsFrames, components, grade };
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
          <span className={styles.complexityLabel}>WS frame types</span>
          <span className={styles.complexityValue}>{complexity.wsFrames}</span>
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

// ── Step 2: API Design ─────────────────────────────────────────────

const CHAT_API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = CHAT_API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = CHAT_API_TABS[(idx + (e.key === "ArrowRight" ? 1 : CHAT_API_TABS.length - 1)) % CHAT_API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="chat-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="chat-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>
          Endpoints
        </button>
        <button type="button" role="tab" id="chat-tab-types" aria-selected={tab === "types"} aria-controls="chat-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>
          Types
        </button>
      </div>
      <div role="tabpanel" id={`chat-panel-${tab}`} aria-labelledby={`chat-tab-${tab}`}>
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
              aria-controls={`chat-ep-${key}`}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            <div className={styles.endpointDesc}>{ep.description}</div>
            <div className={styles.endpointUsedBy}>{ep.usedBy}</div>
            {isOpen && (
              <div className={styles.endpointDetail} id={`chat-ep-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
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

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={CHAT_ARCH_CONFIG} />
    </div>
  );
}

// ── TypeCards ───────────────────────────────────────────────────────

const TYPE_CATEGORY_COLORS: Record<string, string> = {
  api: "var(--diagram-layer-5)",
  state: "var(--diagram-layer-4)",
  props: "var(--diagram-layer-1)",
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
// Chat evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function ChatEvolution() {
  const { activeStep, stateEntries } = useChat();
  const rm = usePrefersReducedMotion();
  const noMotion = { initial: false, animate: {}, exit: {} };

  return (
    <div className={styles.evolutionLayout}>
      <MetricsBar />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          {...(rm ? noMotion : { initial: { opacity: 0, y: 6 }, exit: { opacity: 0, y: -6 } })}
          animate={{ opacity: 1, y: 0 }}
          transition={rm ? { duration: 0 } : TRANSITION.enterItem}
        >
          <StepControls />
        </motion.div>
      </AnimatePresence>

      <PersistentChat />

      <AnimatePresence mode="wait">
        <motion.div
          key={`widget-${activeStep}`}
          {...(rm ? noMotion : { initial: { opacity: 0 }, exit: { opacity: 0 } })}
          animate={{ opacity: 1 }}
          transition={rm ? { duration: 0 } : TRANSITION.crossfade}
        >
          <StepWidget />
        </motion.div>
      </AnimatePresence>

      <StateInspector entries={stateEntries} title="Chat State" />
    </div>
  );
}

// ── Metrics bar ────────────────────────────────────────────────────

function MetricsBar() {
  const { activeStep, metrics, connectionState } = useChat();
  if (activeStep < 4) return null;

  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Chat metrics">
      <MetricCard
        label="WS Latency"
        value={`${metrics.wsLatency}ms`}
        bad={metrics.wsLatency > 100 || metrics.wsLatency === 0}
        good={metrics.wsLatency <= 60 && metrics.wsLatency > 0}
      />
      <MetricCard
        label="Msg/min"
        value={metrics.messageRate}
        bad={metrics.messageRate > 15}
        good={metrics.messageRate <= 5}
      />
      <MetricCard
        label="Queue"
        value={metrics.queueDepth}
        bad={metrics.queueDepth > 0}
        good={metrics.queueDepth === 0}
      />
      <MetricCard
        label="Status"
        value={connectionState === "connected" ? "Live" : connectionState === "connecting" ? "Retry" : "Down"}
        bad={connectionState === "disconnected"}
        good={connectionState === "connected"}
      />
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

// ── Step controls (above chat) ────────────────────────────────────

function StepControls() {
  const { activeStep } = useChat();

  switch (activeStep) {
    case 4: return <BaselineControls />;
    case 5: return <MessageListControls />;
    case 6: return <SendMessageControls />;
    case 7: return <DeliveryStatusControls />;
    case 8: return <TypingIndicatorControls />;
    case 9: return <ReconnectionControls />;
    case 10: return <OfflineQueueControls />;
    case 11: return <MessageGroupingControls />;
    case 12: return <ReactionControls />;
    case 13: return <ReadReceiptControls />;
    case 14: return <EncryptionControls />;
    case 15: return <ScaleControls />;
    default: return null;
  }
}

// ── Step 4: Baseline ────────────────────────────────────────────────

type Transport = "websocket" | "sse" | "longpoll";
const TRANSPORT_INFO: Record<Transport, { label: string; latency: number; overhead: string; direction: string; note: string }> = {
  websocket: { label: "WebSocket", latency: 15, overhead: "2 bytes", direction: "Bidirectional", note: "Persistent TCP, lowest overhead. Ideal for chat." },
  sse: { label: "SSE", latency: 30, overhead: "~50 bytes", direction: "Server → Client", note: "HTTP/2 compatible, but send requires separate POST." },
  longpoll: { label: "Long Poll", latency: 200, overhead: "~400 bytes", direction: "Simulated", note: "New HTTP request per message. High overhead, fallback only." },
};

function BaselineControls() {
  const { messageCount, metrics } = useChat();
  const [transport, setTransport] = useState<Transport>("websocket");
  const info = TRANSPORT_INFO[transport];

  return (
    <div className={styles.baselineControls}>
      <div className={styles.baselineHeader}>
        <span className={styles.baselineBadge}>BASELINE</span>
        <span className={styles.baselineCount}>{messageCount} messages, 4 participants</span>
      </div>
      <div className={styles.transportPicker}>
        {(["websocket", "sse", "longpoll"] as Transport[]).map(t => (
          <button
            key={t}
            type="button"
            className={styles.transportButton}
            data-active={transport === t ? "true" : undefined}
            onClick={() => setTransport(t)}
            aria-pressed={transport === t}
          >
            {TRANSPORT_INFO[t].label}
          </button>
        ))}
      </div>
      <div className={styles.baselineGrid}>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status={info.latency < 50 ? "good" : info.latency < 100 ? "warn" : "bad"}>
            ~{info.latency}ms
          </span>
          <span className={styles.baselineStatLabel}>latency</span>
        </div>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status={info.overhead.includes("2") ? "good" : "warn"}>
            {info.overhead}
          </span>
          <span className={styles.baselineStatLabel}>per-msg overhead</span>
        </div>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status="good">{info.direction}</span>
          <span className={styles.baselineStatLabel}>direction</span>
        </div>
      </div>
      <p className={styles.baselineNote}>{info.note}</p>
    </div>
  );
}

// ── Step 5: Message list ─────────────────────────────────────────────

function MessageListControls() {
  const { isActive, toggleFeature, messageCount, autoScrollEnabled, setAutoScrollEnabled } = useChat();
  const on = isActive("messageList");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Live Message Stream" on={on} onToggle={() => toggleFeature("messageList")} />
      {on && (
        <>
          <div className={styles.streamInfo}>
            <div className={styles.streamStat}>
              <span className={styles.streamStatValue}>{messageCount}</span>
              <span className={styles.streamStatLabel}>total messages</span>
            </div>
            <div className={styles.streamStat}>
              <span className={styles.streamStatValue}>5s</span>
              <span className={styles.streamStatLabel}>incoming interval</span>
            </div>
            <div className={styles.streamStat}>
              <span className={styles.streamStatValue}>{autoScrollEnabled ? "auto" : "paused"}</span>
              <span className={styles.streamStatLabel}>scroll anchor</span>
            </div>
          </div>
          <div className={styles.scrollAnchorToggle}>
            <button
              type="button"
              className={styles.scrollAnchorButton}
              data-active={autoScrollEnabled ? "true" : undefined}
              data-variant="good"
              onClick={() => setAutoScrollEnabled(true)}
            >
              At bottom → auto-scroll
            </button>
            <button
              type="button"
              className={styles.scrollAnchorButton}
              data-active={!autoScrollEnabled ? "true" : undefined}
              data-variant="bad"
              onClick={() => setAutoScrollEnabled(false)}
            >
              Reading history → freeze
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 6: Send message ─────────────────────────────────────────────

function SendMessageControls() {
  const { isActive, toggleFeature, pendingMessages } = useChat();
  const on = isActive("sendMessage");
  const [totalSent, setTotalSent] = useState(0);
  const [confirmed, setConfirmed] = useState(0);

  const prevPending = useRef(pendingMessages.length);

  useEffect(() => {
    if (pendingMessages.length > prevPending.current) {
      setTotalSent(c => c + (pendingMessages.length - prevPending.current));
    }
    if (pendingMessages.length < prevPending.current) {
      setConfirmed(c => c + (prevPending.current - pendingMessages.length));
    }
    prevPending.current = pendingMessages.length;
  }, [pendingMessages.length]);

  useEffect(() => {
    if (!on) { setTotalSent(0); setConfirmed(0); }
  }, [on]);

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Optimistic Send (type below)" on={on} onToggle={() => toggleFeature("sendMessage")} />
      {on && (
        <div className={styles.sendTracker}>
          <div className={styles.sendTrackerStat}>
            <span className={styles.sendTrackerValue}>{totalSent}</span>
            <span className={styles.sendTrackerLabel}>sent</span>
          </div>
          <div className={styles.sendTrackerStat}>
            <span className={styles.sendTrackerValue} data-status="good">{confirmed}</span>
            <span className={styles.sendTrackerLabel}>ACK'd</span>
          </div>
          <div className={styles.sendTrackerStat}>
            <span className={styles.sendTrackerValue}>{pendingMessages.length}</span>
            <span className={styles.sendTrackerLabel}>in-flight</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 7: Delivery status ──────────────────────────────────────────

function DeliveryStatusControls() {
  const { isActive, toggleFeature, deliveryProgress, sendMessage } = useChat();
  const on = isActive("deliveryStatus");
  const [simStep, setSimStep] = useState(0);
  const simTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => { simTimers.current.forEach(clearTimeout); };
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<MessageStatus, number> = { sending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    deliveryProgress.forEach(s => { counts[s]++; });
    return counts;
  }, [deliveryProgress]);

  const stages = [
    { status: "sending" as const, icon: "◌", label: "Sending" },
    { status: "sent" as const, icon: "✓", label: "Sent" },
    { status: "delivered" as const, icon: "✓✓", label: "Delivered" },
    { status: "read" as const, icon: "✓✓", label: "Read" },
  ];

  const advanceSim = useCallback(() => {
    if (simStep === 0) {
      sendMessage("Testing delivery pipeline...");
      setSimStep(1);
    } else if (simStep < 4) {
      setSimStep(prev => prev + 1);
    } else {
      setSimStep(0);
    }
  }, [simStep, sendMessage]);

  const autoPlaySim = useCallback(() => {
    simTimers.current.forEach(clearTimeout);
    simTimers.current.clear();
    sendMessage("Testing delivery pipeline...");
    setSimStep(1);
    const t1 = setTimeout(() => setSimStep(2), 800);
    const t2 = setTimeout(() => setSimStep(3), 1600);
    const t3 = setTimeout(() => setSimStep(4), 2400);
    const t4 = setTimeout(() => setSimStep(0), 3200);
    simTimers.current.add(t1);
    simTimers.current.add(t2);
    simTimers.current.add(t3);
    simTimers.current.add(t4);
  }, [sendMessage]);

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Delivery Receipts" on={on} onToggle={() => toggleFeature("deliveryStatus")} />
      {on && (
        <>
          <div className={styles.deliveryPipeline}>
            {stages.map(({ status, icon, label }, idx) => (
              <React.Fragment key={status}>
                {idx > 0 && <div className={styles.deliveryArrow}>→</div>}
                <button
                  type="button"
                  className={styles.deliveryStage}
                  data-status={status}
                  data-active={simStep === idx + 1 ? "true" : undefined}
                  onClick={advanceSim}
                  aria-label={`${label}: ${statusCounts[status]} messages`}
                >
                  <span className={styles.deliveryIcon}>{icon}</span>
                  <span className={styles.deliveryLabel}>{label}</span>
                  <span className={styles.deliveryCount}>{statusCounts[status]}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className={styles.deliverySimControls}>
            <button
              type="button"
              className={styles.deliverySimButton}
              onClick={advanceSim}
              aria-label={simStep === 0 ? "Step through delivery stages" : simStep < 4 ? `Advance to next stage` : "Reset"}
            >
              {simStep === 0 ? "Step through →" : simStep < 4 ? `Next: ${stages[simStep]?.label ?? "done"} →` : "Reset"}
            </button>
            <button
              type="button"
              className={styles.deliverySimButton}
              data-secondary="true"
              onClick={autoPlaySim}
              aria-label="Auto-play delivery simulation"
            >
              ▶ Auto-play
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 8: Typing indicator ─────────────────────────────────────────

function TypingIndicatorControls() {
  const { isActive, toggleFeature, typingUsers, typingEventCount, debounceMs, setDebounceMs } = useChat();
  const on = isActive("typingIndicator");

  const framesPerSec = on ? Math.round(1000 / debounceMs * 10) / 10 : 0;
  const isSpammy = debounceMs < 200;

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Typing Indicators" on={on} onToggle={() => toggleFeature("typingIndicator")} />
      {on && (
        <>
          <div className={styles.debounceSlider}>
            <div className={styles.debounceSliderHeader}>
              <span className={styles.debounceSliderLabel}>Debounce interval</span>
              <span className={styles.debounceSliderValue} data-spammy={isSpammy ? "true" : undefined}>
                {debounceMs}ms
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={debounceMs}
              onChange={(e) => setDebounceMs(Number(e.target.value))}
              className={styles.debounceSliderInput}
              aria-label="Debounce interval"
              aria-valuetext={`${debounceMs} milliseconds`}
            />
            <div className={styles.debounceSliderMarks}>
              <span>50ms</span><span>300ms</span><span>1000ms</span>
            </div>
          </div>
          <div className={styles.typingMetrics}>
            <div className={styles.typingMetric}>
              <span className={styles.typingMetricValue} data-status={isSpammy ? "bad" : "good"}>
                {framesPerSec}/s
              </span>
              <span className={styles.typingMetricLabel}>frame rate</span>
            </div>
            <div className={styles.typingMetric}>
              <span className={styles.typingMetricValue}>{typingEventCount}</span>
              <span className={styles.typingMetricLabel}>events sent</span>
            </div>
            <div className={styles.typingMetric}>
              <span className={styles.typingMetricValue} data-active={typingUsers.length > 0 ? "true" : undefined}>
                {typingUsers.length > 0 ? typingUsers.map(u => u.name).join(", ") : "—"}
              </span>
              <span className={styles.typingMetricLabel}>currently typing</span>
            </div>
          </div>
          {isSpammy && (
            <div className={styles.spammyWarning}>
              At {debounceMs}ms, fast typers flood the WebSocket with {Math.round(10000 / debounceMs / 10)}+ frames/sec per user
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Step 9: Reconnection ─────────────────────────────────────────────

function ReconnectionControls() {
  const { isActive, toggleFeature, connectionState, setConnectionState, reconnectAttempts } = useChat();
  const on = isActive("reconnection");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Auto-Reconnection" on={on} onToggle={() => toggleFeature("reconnection")} />
      {on && (
        <div className={styles.reconnectControls}>
          <div className={styles.connectionButtons}>
            {(["connected", "disconnected"] as ConnectionState[]).map((state) => (
              <button
                key={state}
                type="button"
                className={styles.connectionButton}
                data-active={connectionState === state ? "true" : undefined}
                data-variant={state === "connected" ? "good" : "bad"}
                onClick={() => setConnectionState(state)}
              >
                {state === "connected" ? "Connected" : "Simulate Disconnect"}
              </button>
            ))}
          </div>
          <div className={styles.backoffTimeline}>
            <div className={styles.backoffHeader}>Exponential backoff</div>
            <div className={styles.backoffSteps}>
              {[
                { attempt: 1, delay: "~1s", label: "First retry" },
                { attempt: 2, delay: "~2s", label: "Second retry" },
                { attempt: 3, delay: "~4s", label: "Third retry + reconnect" },
              ].map(({ attempt, delay, label }) => (
                <div
                  key={attempt}
                  className={styles.backoffStep}
                  data-active={reconnectAttempts >= attempt ? "true" : undefined}
                  data-final={attempt === 3 ? "true" : undefined}
                >
                  <span className={styles.backoffAttempt}>#{attempt}</span>
                  <span className={styles.backoffDelay}>{delay}</span>
                  <span className={styles.backoffLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 10: Offline queue ───────────────────────────────────────────

function OfflineQueueControls() {
  const { isActive, toggleFeature, offlineQueue, connectionState, setConnectionState, sendMessage } = useChat();
  const on = isActive("offlineQueue");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Offline Message Queue" on={on} onToggle={() => toggleFeature("offlineQueue")} />
      {on && (
        <>
          <div className={styles.offlineDemo}>
            <div className={styles.offlineDemoStep} data-active={connectionState !== "connected" ? "true" : undefined}>
              <span className={styles.offlineDemoNumber}>1</span>
              <span className={styles.offlineDemoText}>Disconnect</span>
            </div>
            <div className={styles.offlineDemoArrow}>→</div>
            <div className={styles.offlineDemoStep} data-active={offlineQueue.length > 0 ? "true" : undefined}>
              <span className={styles.offlineDemoNumber}>2</span>
              <span className={styles.offlineDemoText}>Send messages</span>
            </div>
            <div className={styles.offlineDemoArrow}>→</div>
            <div className={styles.offlineDemoStep}>
              <span className={styles.offlineDemoNumber}>3</span>
              <span className={styles.offlineDemoText}>Reconnect & flush</span>
            </div>
          </div>
          <div className={styles.connectionButtons}>
            <button
              type="button"
              className={styles.connectionButton}
              data-active={connectionState === "connected" ? "true" : undefined}
              data-variant="good"
              onClick={() => setConnectionState("connected")}
            >
              Reconnect
            </button>
            <button
              type="button"
              className={styles.connectionButton}
              data-active={connectionState !== "connected" ? "true" : undefined}
              data-variant="bad"
              onClick={() => setConnectionState("disconnected")}
            >
              Go Offline
            </button>
          </div>
          <div className={styles.queueVisual}>
            <div className={styles.queueVisualHeader}>
              <span>Offline Queue</span>
              <span className={styles.queueVisualCount} data-status={offlineQueue.length > 0 ? "warn" : "good"}>
                {offlineQueue.length} messages
              </span>
            </div>
            {offlineQueue.length > 0 ? (
              <div className={styles.queueItems}>
                {offlineQueue.map((msg, i) => (
                  <div key={msg.id} className={styles.queueItem}>
                    <span className={styles.queueItemIcon}>⏱</span>
                    <span className={styles.queueItemContent}>{msg.content.slice(0, 30)}{msg.content.length > 30 ? "..." : ""}</span>
                    <span className={styles.queueItemPos}>#{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.queueEmpty}>
                {connectionState !== "connected"
                  ? "Type messages below — they'll queue here"
                  : "Queue empty — all messages delivered"}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 11: Message grouping ────────────────────────────────────────

type GroupSimMsg = { id: number; author: string; hue: number; text: string; gap: number };

const GROUP_SIM_SEQUENCE: GroupSimMsg[] = [
  { id: 1, author: "Alice", hue: 220, text: "Hey, did you see the PR?", gap: 0 },
  { id: 2, author: "Alice", hue: 220, text: "I refactored the auth module", gap: 5000 },
  { id: 3, author: "Alice", hue: 220, text: "Should be much cleaner now", gap: 8000 },
  { id: 4, author: "Bob", hue: 150, text: "Nice! I'll review it", gap: 30000 },
  { id: 5, author: "Bob", hue: 150, text: "Looks great", gap: 15000 },
  { id: 6, author: "Alice", hue: 220, text: "Thanks!", gap: 180000 },
];


function MessageGroupingControls() {
  const { isActive, toggleFeature, visibleMessages } = useChat();
  const on = isActive("messageGrouping");
  const [simMessages, setSimMessages] = useState<GroupSimMsg[]>([]);
  const [simIndex, setSimIndex] = useState(0);
  const rm = usePrefersReducedMotion();

  const stats = useMemo(() => {
    const total = visibleMessages.length;
    let groups = total > 0 ? 1 : 0;
    let groupedCount = 0;
    for (let i = 1; i < total; i++) {
      if (
        visibleMessages[i].authorId !== visibleMessages[i - 1].authorId ||
        visibleMessages[i].timestamp - visibleMessages[i - 1].timestamp > GROUP_THRESHOLD_MS
      ) {
        groups++;
      } else {
        groupedCount++;
      }
    }
    const savedAvatars = on ? groupedCount : 0;
    const savedPercent = total > 0 ? Math.round((savedAvatars / total) * 100) : 0;
    return { total, groups, savedAvatars, savedPercent };
  }, [on, visibleMessages]);

  const addNextSim = useCallback(() => {
    if (simIndex >= GROUP_SIM_SEQUENCE.length) {
      setSimMessages([]);
      setSimIndex(0);
      return;
    }
    setSimMessages(prev => [...prev, GROUP_SIM_SEQUENCE[simIndex]]);
    setSimIndex(prev => prev + 1);
  }, [simIndex]);

  const isGrouped = useCallback((msgs: GroupSimMsg[], idx: number): boolean => {
    if (!on || idx === 0) return false;
    return msgs[idx].author === msgs[idx - 1].author && msgs[idx].gap < GROUP_THRESHOLD_MS;
  }, [on]);

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Message Grouping" on={on} onToggle={() => toggleFeature("messageGrouping")} />
      <div className={styles.groupingSimulation}>
        <div className={styles.groupingSimHeader}>
          <span className={styles.groupingSimLabel}>Grouping simulator</span>
          <button
            type="button"
            className={styles.groupingSimButton}
            onClick={addNextSim}
            aria-label={simIndex >= GROUP_SIM_SEQUENCE.length ? "Reset simulation" : "Add next message"}
          >
            {simIndex >= GROUP_SIM_SEQUENCE.length ? "Reset" : `+ Message ${simIndex + 1}/${GROUP_SIM_SEQUENCE.length}`}
          </button>
        </div>
        <div className={styles.groupingSimMessages}>
          {simMessages.length === 0 && (
            <span className={styles.groupingSimEmpty}>Click to add messages and see grouping rules</span>
          )}
          <AnimatePresence initial={false}>
            {simMessages.map((msg, idx) => {
              const grouped = isGrouped(simMessages, idx);
              return (
                <motion.div
                  key={msg.id}
                  className={styles.groupingSimMsg}
                  data-grouped={grouped ? "true" : undefined}
                  initial={rm ? false : { opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={rm ? { duration: 0 } : SPRING.snappy}
                >
                  {!grouped && (
                    <div className={styles.groupingSimAvatar} style={{ background: avatarColor(msg.hue) }}>
                      {msg.author[0]}
                    </div>
                  )}
                  {grouped && <div className={styles.groupingSimAvatarSpacer} />}
                  <div className={styles.groupingSimContent}>
                    {!grouped && (
                      <div className={styles.groupingSimAuthor} style={{ color: avatarColor(msg.hue) }}>
                        {msg.author}
                        <span className={styles.groupingSimGap}>
                          {msg.gap >= 60000 ? `+${Math.round(msg.gap / 60000)}m` : msg.gap > 0 ? `+${Math.round(msg.gap / 1000)}s` : ""}
                        </span>
                      </div>
                    )}
                    <div className={styles.groupingSimText}>{msg.text}</div>
                  </div>
                  <div className={styles.groupingSimRule}>
                    {idx === 0
                      ? "first msg → new group"
                      : grouped
                      ? "same author, <2min → grouped"
                      : msg.author !== simMessages[idx - 1].author
                      ? "different author → new group"
                      : "gap ≥2min → new group"}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <div className={styles.groupingStats}>
        <div className={styles.groupingStat}>
          <span className={styles.groupingStatValue}>{stats.total}</span>
          <span className={styles.groupingStatLabel}>total messages</span>
        </div>
        <div className={styles.groupingStat}>
          <span className={styles.groupingStatValue} data-status="good">{stats.groups}</span>
          <span className={styles.groupingStatLabel}>groups ({stats.savedPercent}% avatars saved)</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 12: Reactions ───────────────────────────────────────────────

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function ReactionControls() {
  const { isActive, toggleFeature, visibleMessages, activeEmoji, setActiveEmoji } = useChat();
  const on = isActive("reactions");

  const totalReactions = useMemo(() => {
    let count = 0;
    visibleMessages.forEach(m => {
      Object.values(m.reactions).forEach(c => { count += c; });
    });
    return count;
  }, [visibleMessages]);

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Message Reactions" on={on} onToggle={() => toggleFeature("reactions")} />
      {on && (
        <>
          <div className={styles.emojiPicker}>
            <div className={styles.emojiPickerLabel}>Active reaction:</div>
            <div className={styles.emojiPickerRow}>
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={styles.emojiPickerButton}
                  data-active={activeEmoji === emoji ? "true" : undefined}
                  onClick={() => setActiveEmoji(emoji)}
                  aria-label={`Select ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.reactionPipeline}>
            <div className={styles.reactionPipelineStep}>
              <span className={styles.reactionPipelineIcon}>👆</span>
              <span>Tap bubble</span>
            </div>
            <div className={styles.reactionPipelineArrow}>→</div>
            <div className={styles.reactionPipelineStep}>
              <span className={styles.reactionPipelineIcon}>⚡</span>
              <span>Optimistic +1</span>
            </div>
            <div className={styles.reactionPipelineArrow}>→</div>
            <div className={styles.reactionPipelineStep}>
              <span className={styles.reactionPipelineIcon}>📡</span>
              <span>WS broadcast</span>
            </div>
            <div className={styles.reactionPipelineArrow}>→</div>
            <div className={styles.reactionPipelineStep}>
              <span className={styles.reactionPipelineIcon}>✓</span>
              <span>Reconcile</span>
            </div>
          </div>
          <div className={styles.reactionStats}>
            <span>{totalReactions} total reactions across {visibleMessages.length} messages</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 13: Read receipts ───────────────────────────────────────────

function ReadReceiptControls() {
  const { isActive, toggleFeature, lastReadIndex, advanceReadCursor, visibleMessages } = useChat();
  const on = isActive("readReceipts");

  const readCount = lastReadIndex >= 0 ? Math.min(lastReadIndex + 1, visibleMessages.length) : 0;
  const unreadCount = visibleMessages.length - readCount;

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Read Receipts" on={on} onToggle={() => toggleFeature("readReceipts")} />
      {on && (
        <>
          <div className={styles.readReceiptVisual}>
            <div className={styles.readProgressBar}>
              <div
                className={styles.readProgressFill}
                style={{ width: `${visibleMessages.length > 0 ? (readCount / visibleMessages.length) * 100 : 0}%` }}
              />
            </div>
            <div className={styles.readProgressLabels}>
              <span>Read: {readCount}</span>
              <span>Unread: {unreadCount}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.advanceReadButton}
            onClick={advanceReadCursor}
            disabled={unreadCount <= 0}
          >
            Simulate recipient reading next message →
          </button>
          <div className={styles.readReceiptInfo}>
            <div className={styles.readReceiptInfoRow}>
              <span>✓✓</span>
              <span className={styles.readReceiptGrey}>Grey = delivered</span>
            </div>
            <div className={styles.readReceiptInfoRow}>
              <span>✓✓</span>
              <span className={styles.readReceiptBlue}>Blue = read (cursor passed)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 14: Encryption ──────────────────────────────────────────────

function EncryptionControls() {
  const { isActive, toggleFeature, encryptionOverheadMs, setEncryptionOverheadMs } = useChat();
  const on = isActive("encryption");

  const throughput = on ? Math.round(1000 / Math.max(1, encryptionOverheadMs)) : 0;
  const isHeavy = encryptionOverheadMs > 50;

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="End-to-End Encryption" on={on} onToggle={() => toggleFeature("encryption")} />
      {on && (
        <>
          <div className={styles.encryptionPipeline}>
            <div className={styles.encryptionStep} data-state="complete">
              <span className={styles.encryptionDot} />
              <span>Key exchange</span>
            </div>
            <div className={styles.encryptionArrow}>→</div>
            <div className={styles.encryptionStep} data-state="complete">
              <span className={styles.encryptionDot} />
              <span>AES-256-GCM</span>
            </div>
            <div className={styles.encryptionArrow}>→</div>
            <div className={styles.encryptionStep} data-state="complete">
              <span className={styles.encryptionDot} />
              <span>Send ciphertext</span>
            </div>
          </div>
          <div className={styles.debounceSlider}>
            <div className={styles.debounceSliderHeader}>
              <span className={styles.debounceSliderLabel}>Encrypt/decrypt overhead per message</span>
              <span className={styles.debounceSliderValue} data-spammy={isHeavy ? "true" : undefined}>
                {encryptionOverheadMs}ms
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={encryptionOverheadMs}
              onChange={(e) => setEncryptionOverheadMs(Number(e.target.value))}
              className={styles.debounceSliderInput}
              aria-label="Encryption overhead"
              aria-valuetext={`${encryptionOverheadMs} milliseconds`}
            />
            <div className={styles.debounceSliderMarks}>
              <span>1ms (AES-NI)</span><span>50ms</span><span>200ms (full ratchet)</span>
            </div>
          </div>
          <div className={styles.typingMetrics}>
            <div className={styles.typingMetric}>
              <span className={styles.typingMetricValue} data-status={isHeavy ? "bad" : "good"}>
                {throughput}/s
              </span>
              <span className={styles.typingMetricLabel}>max decrypt throughput</span>
            </div>
            <div className={styles.typingMetric}>
              <span className={styles.typingMetricValue}>
                {encryptionOverheadMs <= 10 ? "AES-256-GCM (hardware)" : encryptionOverheadMs <= 50 ? "AES-256 (software)" : "Double Ratchet + AES"}
              </span>
              <span className={styles.typingMetricLabel}>typical algorithm</span>
            </div>
            <div className={styles.typingMetric}>
              <span className={styles.typingMetricValue} data-status={encryptionOverheadMs > 100 ? "bad" : "neutral"}>
                +{Math.round(encryptionOverheadMs * 2)}ms
              </span>
              <span className={styles.typingMetricLabel}>round-trip added (encrypt+decrypt)</span>
            </div>
          </div>
          <div className={styles.encryptionTradeoffs}>
            <div className={styles.encryptionTradeoff}>
              <span className={styles.encryptionTradeoffIcon} data-good="true">+</span>
              <span>Server never sees plaintext</span>
            </div>
            <div className={styles.encryptionTradeoff}>
              <span className={styles.encryptionTradeoffIcon} data-good="false">−</span>
              <span>No server-side search</span>
            </div>
            <div className={styles.encryptionTradeoff}>
              <span className={styles.encryptionTradeoffIcon} data-good="false">−</span>
              <span>Notifications: &quot;sent a message&quot; (no preview)</span>
            </div>
            <div className={styles.encryptionTradeoff}>
              <span className={styles.encryptionTradeoffIcon} data-good="false">−</span>
              <span>Key backup needed for new devices</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 15: Scale ────────────────────────────────────────────────────

const SCALE_LABELS: Record<number, string> = { 50: "50", 500: "500", 5000: "5K", 50000: "50K" };

function ScaleControls() {
  const { scaleLevel, setScaleLevel, messageCount } = useChat();
  const needsVirtualization = scaleLevel > 500;

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value);
      const levels = [50, 500, 5000, 50000];
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
        <span className={styles.scaleSliderLabel}>Concurrent Users</span>
        <span className={styles.scaleSliderValue}>{SCALE_LABELS[scaleLevel] ?? scaleLevel.toLocaleString()}</span>
      </div>
      <input
        type="range"
        className={styles.scaleSliderInput}
        min={50}
        max={50000}
        step={1}
        value={scaleLevel}
        onChange={handleSlider}
        aria-label="Scale level"
        aria-valuetext={`${SCALE_LABELS[scaleLevel] ?? scaleLevel.toLocaleString()} concurrent users`}
      />
      <div className={styles.scaleMarks}>
        <span>50</span><span>500</span><span>5K</span><span>50K</span>
      </div>
      {needsVirtualization && (
        <div className={styles.virtualizationWarning}>
          <div className={styles.virtualizationHeader}>
            <span className={styles.virtualizationIcon}>⚠</span>
            <span>Virtualization needed at {SCALE_LABELS[scaleLevel] ?? scaleLevel.toLocaleString()} messages</span>
          </div>
          <div className={styles.virtualizationBody}>
            Rendering {messageCount} DOM nodes (capped from {SCALE_LABELS[scaleLevel]}). At this scale, a windowed list (react-window) renders only ~20 visible rows, keeping the DOM at O(viewport) instead of O(n).
          </div>
          <div className={styles.virtualizationComparison}>
            <div className={styles.virtualizationCol}>
              <span className={styles.virtualizationColLabel}>Without virtualization</span>
              <span className={styles.virtualizationColValue} data-status="bad">{SCALE_LABELS[scaleLevel]} DOM nodes</span>
            </div>
            <div className={styles.virtualizationCol}>
              <span className={styles.virtualizationColLabel}>With virtualization</span>
              <span className={styles.virtualizationColValue} data-status="good">~20 DOM nodes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel} id={id}>{label}</span>
      <button type="button" className={styles.toggleButton} data-on={on ? "true" : undefined} onClick={onToggle} aria-pressed={on} aria-labelledby={id}>
        <span className={styles.toggleKnob} />
      </button>
    </div>
  );
}

// ── Step widgets (below chat) ────────────────────────────────────

function StepWidget() {
  const { activeStep } = useChat();

  switch (activeStep) {
    case 5: return <ScrollAnchorWidget />;
    case 6: return <OptimisticSendWidget />;
    case 7: return <DeliveryStatusWidget />;
    case 8: return <DebounceExplainerWidget />;
    case 9: return <BackoffWidget />;
    case 10: return <QueueFlushWidget />;
    case 12: return <ReactionWidget />;
    case 13: return <ReadReceiptWidget />;
    case 14: return <EncryptionWidget />;
    case 15: return <VirtualizationWidget />;
    default: return null;
  }
}

function ScrollAnchorWidget() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const noMotion = usePrefersReducedMotion();
  const [messages, setMessages] = useState(() => Array.from({ length: 5 }, (_, i) => `Message ${i + 1}`));
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showBadge, setShowBadge] = useState(false);
  const [decision, setDecision] = useState<string>("At bottom — will auto-scroll");

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsNearBottom(near);
    setDecision(near ? "At bottom — will auto-scroll" : "Scrolled up — will show badge");
  }, []);

  const addMessage = useCallback(() => {
    const newMsg = `Message ${messages.length + 1}`;
    setMessages(prev => [...prev, newMsg]);
    if (isNearBottom) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: noMotion ? "instant" : "smooth" });
      });
      setShowBadge(false);
    } else {
      setShowBadge(true);
    }
  }, [messages.length, isNearBottom, noMotion]);

  const jumpToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: noMotion ? "instant" : "smooth" });
    setShowBadge(false);
  }, [noMotion]);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Scroll anchor — try it</div>
      <div className={styles.widgetBody}>
        <div className={styles.scrollSandbox}>
          <div className={styles.scrollContainer} ref={scrollRef} onScroll={checkScroll}>
            {messages.map((m, i) => (
              <div key={i} className={styles.scrollMsg}>{m}</div>
            ))}
          </div>
          {showBadge && (
            <button type="button" className={styles.scrollBadge} onClick={jumpToBottom}>
              ↓ New messages
            </button>
          )}
        </div>
        <button type="button" className={styles.simButton} onClick={addMessage} aria-label="Add a new message">
          + New message
        </button>
        <div className={styles.scrollDecision} aria-live="polite" data-near={isNearBottom ? "true" : undefined}>
          {decision}
        </div>
      </div>
    </div>
  );
}

function DebounceExplainerWidget() {
  const [testMs, setTestMs] = useState(300);
  const [isTyping, setIsTyping] = useState(false);
  const [emitsCount, setEmitsCount] = useState(0);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const simulateKeystroke = useCallback(() => {
    setKeystrokeCount(c => c + 1);
    setIsTyping(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsTyping(false);
      setEmitsCount(c => c + 1);
    }, testMs);
  }, [testMs]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTyping(false);
    setEmitsCount(0);
    setKeystrokeCount(0);
  }, []);

  const rating = testMs < 100 ? "bad" : testMs > 800 ? "warn" : "good";
  const desc = testMs < 100
    ? "Too fast — excessive network traffic"
    : testMs > 800
      ? "Too slow — indicator feels laggy"
      : "Natural cadence — minimal overhead";

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Typing indicator debounce</div>
      <div className={styles.widgetBody}>
        <div className={styles.debounceSliderRow}>
          <label className={styles.debounceSliderLabel} htmlFor="typing-debounce">Debounce: {testMs}ms</label>
          <input
            id="typing-debounce"
            type="range"
            min={30}
            max={1200}
            step={10}
            value={testMs}
            onChange={e => setTestMs(Number(e.target.value))}
            className={styles.slider}
          />
        </div>
        <div className={styles.debounceSimRow}>
          <button type="button" className={styles.simButton} onClick={simulateKeystroke} aria-label="Simulate keystroke">
            Keystroke
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset}>Reset</button>
          <span className={styles.debounceIndicator} data-typing={isTyping ? "true" : undefined}>
            {isTyping ? "typing..." : "idle"}
          </span>
        </div>
        <div className={styles.debounceStats}>
          <span>Keystrokes: {keystrokeCount}</span>
          <span>Emits: {emitsCount}</span>
          <span className={styles.debounceRating} data-status={rating}>{desc}</span>
        </div>
      </div>
    </div>
  );
}

function QueueFlushWidget() {
  type QueueItem = { id: number; text: string; status: "queued" | "flushing" | "acked" };
  const [items, setItems] = useState<QueueItem[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isFlushing, setIsFlushing] = useState(false);
  const flushTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => { flushTimers.current.forEach(clearTimeout); };
  }, []);

  const enqueue = useCallback(() => {
    setItems(prev => [...prev, { id: nextId, text: `msg-${nextId}`, status: "queued" }]);
    setNextId(n => n + 1);
  }, [nextId]);

  const flush = useCallback(() => {
    flushTimers.current.forEach(clearTimeout);
    flushTimers.current.clear();
    setIsFlushing(true);
    const queued = itemsRef.current.filter(i => i.status === "queued");
    queued.forEach((item, idx) => {
      const t1 = setTimeout(() => {
        flushTimers.current.delete(t1);
        setItems(p => p.map(i => i.id === item.id ? { ...i, status: "flushing" } : i));
        const t2 = setTimeout(() => {
          flushTimers.current.delete(t2);
          setItems(p => p.map(i => i.id === item.id ? { ...i, status: "acked" } : i));
          if (idx === queued.length - 1) setIsFlushing(false);
        }, 400);
        flushTimers.current.add(t2);
      }, idx * 500);
      flushTimers.current.add(t1);
    });
  }, []);

  const reset = useCallback(() => {
    flushTimers.current.forEach(clearTimeout);
    flushTimers.current.clear();
    setItems([]);
    setNextId(1);
    setIsFlushing(false);
  }, []);

  const hasQueued = items.some(i => i.status === "queued");

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Queue flush simulator</div>
      <div className={styles.widgetBody}>
        <div className={styles.queueVis}>
          {items.length === 0 && <span className={styles.flushEmpty}>Queue empty — add messages while &quot;offline&quot;</span>}
          {items.map(item => (
            <div key={item.id} className={styles.flushItem} data-status={item.status}>
              <span className={styles.flushItemId}>{item.text}</span>
              <span className={styles.flushItemStatus}>
                {item.status === "queued" ? "queued" : item.status === "flushing" ? "sending..." : "ACK"}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.queueActions}>
          <button type="button" className={styles.simButton} onClick={enqueue} disabled={isFlushing} aria-label="Queue a message">
            + Queue message
          </button>
          <button type="button" className={styles.simButton} onClick={flush} disabled={!hasQueued || isFlushing} aria-label="Reconnect and flush queue">
            Reconnect & flush
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset} aria-label="Reset queue">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

const DELIVERY_STAGES = [
  { icon: "◌", label: "sending", desc: "Waiting for server ACK" },
  { icon: "✓", label: "sent", desc: "Server stored the message" },
  { icon: "✓✓", label: "delivered", desc: "Recipient device received" },
  { icon: "✓✓", label: "read", desc: "Recipient scrolled to it", blue: true },
];

function DeliveryStatusWidget() {
  const [stage, setStage] = useState(-1);
  const [isAuto, setIsAuto] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const stepForward = useCallback(() => {
    setStage(prev => Math.min(prev + 1, DELIVERY_STAGES.length - 1));
  }, []);

  const autoPlay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage(-1);
    setIsAuto(true);
    let s = 0;
    const tick = () => {
      setStage(s);
      s++;
      if (s < DELIVERY_STAGES.length) {
        timerRef.current = setTimeout(tick, 700);
      } else {
        setIsAuto(false);
      }
    };
    timerRef.current = setTimeout(tick, 300);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage(-1);
    setIsAuto(false);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Delivery lifecycle — step through</div>
      <div className={styles.widgetBody}>
        <div className={styles.statusLifecycle}>
          {DELIVERY_STAGES.map(({ icon, label, desc, blue }, idx) => (
            <div key={label} className={styles.lifecycleStep} data-active={idx <= stage ? "true" : undefined} data-current={idx === stage ? "true" : undefined} data-blue={blue && idx <= stage ? "true" : undefined}>
              <span className={styles.lifecycleIcon}>{icon}</span>
              <span className={styles.lifecycleLabel}>{label}</span>
              <span className={styles.lifecycleDesc}>{desc}</span>
              {idx < DELIVERY_STAGES.length - 1 && <span className={styles.lifecycleArrow}>↓</span>}
            </div>
          ))}
        </div>
        <div className={styles.lifecycleActions}>
          <button type="button" className={styles.simButton} onClick={stepForward} disabled={stage >= DELIVERY_STAGES.length - 1 || isAuto} aria-label="Advance delivery status">
            {stage < 0 ? "Send message" : "Next stage →"}
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={autoPlay} disabled={isAuto}>Auto</button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
}

const BACKOFF_DELAYS = [1, 2, 4, 8, 16, 30];

function BackoffWidget() {
  const [attempt, setAttempt] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentDelay, setCurrentDelay] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const runBackoff = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAttempt(0);
    setIsRunning(true);
    let a = 0;
    const step = () => {
      if (a >= BACKOFF_DELAYS.length) {
        setIsRunning(false);
        return;
      }
      const jitter = 1 + (Math.random() * 0.4 - 0.2);
      const delay = BACKOFF_DELAYS[a] * jitter;
      setCurrentDelay(Math.round(delay * 100) / 100);
      setAttempt(a + 1);
      a++;
      timerRef.current = setTimeout(step, Math.min(delay * 200, 2000));
    };
    step();
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAttempt(0);
    setIsRunning(false);
    setCurrentDelay(0);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Exponential backoff visualizer</div>
      <div className={styles.widgetBody}>
        <div className={styles.backoffBars}>
          {BACKOFF_DELAYS.map((delay, i) => (
            <div key={i} className={styles.backoffBarItem} data-active={attempt > i ? "true" : undefined} data-current={attempt === i + 1 && isRunning ? "true" : undefined}>
              <div className={styles.backoffBar} style={{ height: `${(delay / 30) * 100}%` }} />
              <span className={styles.backoffBarLabel}>{delay}s</span>
            </div>
          ))}
        </div>
        <div className={styles.backoffInfo} aria-live="polite">
          {isRunning ? (
            <span>Attempt #{attempt}: waiting {currentDelay}s (with jitter)</span>
          ) : attempt > 0 ? (
            <span>All {attempt} retries complete — would show &quot;reconnect manually&quot; UI</span>
          ) : (
            <span>delay = min(2^attempt, 30s) +/- 20% jitter</span>
          )}
        </div>
        <div className={styles.backoffActions}>
          <button type="button" className={styles.simButton} onClick={runBackoff} disabled={isRunning} aria-label="Simulate disconnection with exponential backoff">
            Simulate disconnect
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset} aria-label="Reset backoff">Reset</button>
        </div>
      </div>
    </div>
  );
}

function EncryptionWidget() {
  const [plaintext, setPlaintext] = useState("Hello Bob!");
  const [showPlain, setShowPlain] = useState(true);

  const fakeCipher = useMemo(() => {
    return Array.from(plaintext).map((ch, i) => {
      if (ch === " ") return " ";
      const code = ch.charCodeAt(0);
      return String.fromCharCode(((code - 32 + 47 + i) % 94) + 33);
    }).join("");
  }, [plaintext]);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>E2E encryption — type to see transform</div>
      <div className={styles.widgetBody}>
        <div className={styles.e2eDemo}>
          <div className={styles.e2eSide}>
            <div className={styles.e2eLabel} style={{ color: avatarColor(220) }}>Alice (sender)</div>
            <input
              type="text"
              className={styles.e2eInput}
              value={plaintext}
              onChange={e => setPlaintext(e.target.value)}
              maxLength={40}
              aria-label="Plaintext message"
              placeholder="Type a message..."
            />
          </div>
          <div className={styles.e2eWire}>
            <div className={styles.e2eWireLabel}>network</div>
            <div className={styles.e2eCiphertext}>{fakeCipher || "..."}</div>
          </div>
          <div className={styles.e2eSide}>
            <div className={styles.e2eLabel} style={{ color: avatarColor(150) }}>Bob (receiver)</div>
            <button
              type="button"
              className={styles.e2eDecryptBtn}
              onClick={() => setShowPlain(p => !p)}
              aria-pressed={showPlain}
              aria-label={showPlain ? "Show ciphertext" : "Decrypt message"}
            >
              {showPlain ? "🔓 " + plaintext : "🔒 " + fakeCipher}
            </button>
          </div>
        </div>
        <div className={styles.e2eNote}>
          Server only sees ciphertext. Bob&apos;s private key decrypts locally. Click Bob&apos;s message to toggle.
        </div>
      </div>
    </div>
  );
}

type SendPhase = "idle" | "optimistic" | "in-flight" | "acked" | "failed";

const SEND_PHASES: { phase: SendPhase; label: string; icon: string; desc: string }[] = [
  { phase: "optimistic", label: "Append", icon: "⚡", desc: "Message shown instantly, status = sending" },
  { phase: "in-flight", label: "Send", icon: "📡", desc: "WebSocket frame with clientId" },
  { phase: "acked", label: "ACK", icon: "✓", desc: "Server confirms, clientId → serverId" },
];

function OptimisticSendWidget() {
  const [currentPhase, setCurrentPhase] = useState<SendPhase>("idle");
  const [step, setStep] = useState(-1);
  const stepRef = useRef(step);
  stepRef.current = step;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const advance = useCallback(() => {
    const next = stepRef.current + 1;
    setStep(next);
    if (next < SEND_PHASES.length) {
      setCurrentPhase(SEND_PHASES[next].phase);
    }
  }, []);

  const simulateFail = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep(0);
    setCurrentPhase("optimistic");
    timerRef.current = setTimeout(() => {
      setStep(1);
      setCurrentPhase("in-flight");
      timerRef.current = setTimeout(() => {
        setCurrentPhase("failed");
        setStep(3);
      }, 600);
    }, 400);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep(-1);
    setCurrentPhase("idle");
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Optimistic send — step through</div>
      <div className={styles.widgetBody}>
        <div className={styles.sendPhases}>
          {SEND_PHASES.map((p, i) => (
            <div key={p.phase} className={styles.sendPhase} data-active={step >= i ? "true" : undefined} data-current={step === i ? "true" : undefined}>
              <span className={styles.sendPhaseIcon}>{p.icon}</span>
              <span className={styles.sendPhaseLabel}>{p.label}</span>
              <span className={styles.sendPhaseDesc}>{p.desc}</span>
            </div>
          ))}
          {currentPhase === "failed" && (
            <div className={styles.sendPhase} data-active="true" data-failed="true">
              <span className={styles.sendPhaseIcon}>✗</span>
              <span className={styles.sendPhaseLabel}>Failed</span>
              <span className={styles.sendPhaseDesc}>Show retry button, keep clientId for dedup</span>
            </div>
          )}
        </div>
        <div className={styles.sendActions}>
          <button type="button" className={styles.simButton} onClick={advance} disabled={step >= SEND_PHASES.length - 1 || currentPhase === "failed"} aria-label="Advance to next send phase">
            {step < 0 ? "Send message" : "Next step →"}
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={simulateFail} aria-label="Simulate send failure">
            Simulate failure
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
}

const REACTION_WIDGET_EMOJIS = ["👍", "❤️", "😂", "🎉"];

function ReactionWidget() {
  const [counts, setCounts] = useState<Record<string, number>>({ "👍": 3, "❤️": 1 });
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const myReactionsRef = useRef(myReactions);
  myReactionsRef.current = myReactions;
  const [rollbackEmoji, setRollbackEmoji] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const toggle = useCallback((emoji: string) => {
    const wasActive = myReactionsRef.current.has(emoji);
    setMyReactions(prev => {
      const next = new Set(prev);
      if (wasActive) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    setCounts(c => ({
      ...c,
      [emoji]: (c[emoji] ?? 0) + (wasActive ? -1 : 1),
    }));
  }, []);

  const simulateRollback = useCallback(() => {
    const available = REACTION_WIDGET_EMOJIS.filter(e => !myReactionsRef.current.has(e));
    const emoji = available[0] ?? "👍";
    toggle(emoji);
    setRollbackEmoji(emoji);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      toggle(emoji);
      timerRef.current = setTimeout(() => setRollbackEmoji(null), 600);
    }, 800);
  }, [toggle]);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Optimistic reactions</div>
      <div className={styles.widgetBody}>
        <div className={styles.reactionBar}>
          {REACTION_WIDGET_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              className={styles.reactionBtn}
              data-active={myReactions.has(emoji) ? "true" : undefined}
              data-rollback={rollbackEmoji === emoji ? "true" : undefined}
              onClick={() => toggle(emoji)}
              aria-label={`${emoji} ${counts[emoji] ?? 0}`}
              aria-pressed={myReactions.has(emoji)}
            >
              <span>{emoji}</span>
              <span className={styles.reactionCount}>{counts[emoji] ?? 0}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.simButton} onClick={simulateRollback} aria-label="Simulate server rejection and rollback">
          Simulate server reject → rollback
        </button>
        <div className={styles.reactionModelNote} aria-live="polite">
          {rollbackEmoji
            ? `Server rejected ${rollbackEmoji} — rolling back optimistic update`
            : "Click emojis to see instant updates. Simulate reject to see rollback."}
        </div>
      </div>
    </div>
  );
}

const RECEIPT_MESSAGES = ["Hey!", "What's up?", "Working on the chat lab", "Almost done", "Ship it!"];

function ReadReceiptWidget() {
  const [cursor, setCursor] = useState(-1);
  const [batchedEmits, setBatchedEmits] = useState(0);
  const batchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (batchRef.current) clearTimeout(batchRef.current); };
  }, []);

  const advanceCursor = useCallback((toIndex: number) => {
    if (toIndex <= cursor) return;
    setCursor(toIndex);
    if (batchRef.current) clearTimeout(batchRef.current);
    batchRef.current = setTimeout(() => {
      setBatchedEmits(c => c + 1);
    }, 500);
  }, [cursor]);

  const reset = useCallback(() => {
    if (batchRef.current) clearTimeout(batchRef.current);
    setCursor(-1);
    setBatchedEmits(0);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Cursor-based read receipts</div>
      <div className={styles.widgetBody}>
        <div className={styles.receiptMessages}>
          {RECEIPT_MESSAGES.map((msg, i) => (
            <button
              key={i}
              type="button"
              className={styles.receiptMsg}
              data-read={i <= cursor ? "true" : undefined}
              data-cursor={i === cursor ? "true" : undefined}
              onClick={() => advanceCursor(i)}
              aria-label={`Message ${i + 1}: ${msg}${i <= cursor ? " (read)" : " (unread)"}`}
            >
              <span className={styles.receiptMsgText}>{msg}</span>
              <span className={styles.receiptCheck}>{i <= cursor ? "✓✓" : ""}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.simButtonSecondary} onClick={reset}>Reset</button>
        <div className={styles.receiptStats} aria-live="polite">
          <span>Cursor: {cursor >= 0 ? `msg ${cursor + 1}` : "none"}</span>
          <span>Network emits: {batchedEmits} (batched at 500ms)</span>
          <span className={styles.receiptSaving}>
            {cursor >= 0 && `Saved ${cursor} individual read receipts via cursor`}
          </span>
        </div>
      </div>
    </div>
  );
}

function VirtualizationWidget() {
  const { scaleLevel } = useChat();
  const [domCount, setDomCount] = useState(0);
  const [virtualCount, setVirtualCount] = useState(0);
  const [fps, setFps] = useState<{ naive: number; virtual: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const simulate = useCallback(() => {
    setIsRunning(true);
    setFps(null);
    const total = Math.min(scaleLevel, 50000);
    setDomCount(total);
    setVirtualCount(Math.min(20, total));

    timerRef.current = setTimeout(() => {
      const naiveFps = total <= 100 ? 60 : total <= 500 ? 55 : total <= 5000 ? 30 : total <= 10000 ? 12 : 3;
      const jitter = () => Math.round((Math.random() - 0.5) * 4);
      setFps({
        naive: Math.max(1, naiveFps + jitter()),
        virtual: Math.max(55, 60 + jitter()),
      });
      setIsRunning(false);
    }, 600);
  }, [scaleLevel]);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Virtualization impact — {scaleLevel.toLocaleString()} messages</div>
      <div className={styles.widgetBody}>
        <button type="button" className={styles.simButton} onClick={simulate} disabled={isRunning} aria-label="Simulate scroll performance">
          {isRunning ? "Measuring..." : "Simulate scroll performance"}
        </button>
        {fps && (
          <div className={styles.virtComparison}>
            <div className={styles.virtCol}>
              <span className={styles.virtColLabel}>Naive DOM</span>
              <span className={styles.virtDomCount} data-status="bad">{domCount.toLocaleString()} nodes</span>
              <div className={styles.virtFpsBar}>
                <div className={styles.virtFpsFill} style={{ width: `${(fps.naive / 60) * 100}%` }} data-status={fps.naive >= 50 ? "good" : fps.naive >= 25 ? "warn" : "bad"} />
              </div>
              <span className={styles.virtFpsValue} data-status={fps.naive >= 50 ? "good" : fps.naive >= 25 ? "warn" : "bad"}>
                {fps.naive} fps
              </span>
            </div>
            <div className={styles.virtCol}>
              <span className={styles.virtColLabel}>Windowed</span>
              <span className={styles.virtDomCount} data-status="good">{virtualCount} nodes</span>
              <div className={styles.virtFpsBar}>
                <div className={styles.virtFpsFill} style={{ width: `${(fps.virtual / 60) * 100}%` }} data-status="good" />
              </div>
              <span className={styles.virtFpsValue} data-status="good">{fps.virtual} fps</span>
            </div>
          </div>
        )}
        {fps && fps.naive < 30 && (
          <p className={styles.widgetNote}>
            At {scaleLevel.toLocaleString()} messages, naive rendering drops to {fps.naive} fps.
            The windowed approach renders only visible rows, keeping DOM size constant at ~20 nodes.
          </p>
        )}
        {!fps && !isRunning && (
          <p className={styles.widgetNote}>
            Adjust the scale slider above, then click simulate to see how DOM count affects scroll performance.
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Persistent chat (steps 4+)
// ═══════════════════════════════════════════════════════════════════

function PersistentChat() {
  const {
    activeStep,
    visibleMessages,
    isActive,
    connectionState,
    typingUsers,
    sendMessage,
    pendingMessages,
    lastReadIndex,
    activeEmoji,
    toggleReaction,
    autoScrollEnabled,
    debounceMs,
  } = useChat();
  const rm = usePrefersReducedMotion();

  const showDelivery = isActive("deliveryStatus");
  const showTyping = isActive("typingIndicator");
  const showSend = isActive("sendMessage");
  const showReactions = isActive("reactions");
  const showReadReceipts = isActive("readReceipts");
  const showEncryption = isActive("encryption");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const [ownKeystrokeCount, setOwnKeystrokeCount] = useState(0);
  const [ownEmitCount, setOwnEmitCount] = useState(0);
  const [ownIsTyping, setOwnIsTyping] = useState(false);
  const ownTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (ownTypingTimerRef.current) clearTimeout(ownTypingTimerRef.current); };
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (showTyping && value.length > 0) {
      setOwnKeystrokeCount(c => c + 1);
      setOwnIsTyping(true);
      if (ownTypingTimerRef.current) clearTimeout(ownTypingTimerRef.current);
      ownTypingTimerRef.current = setTimeout(() => {
        setOwnIsTyping(false);
        setOwnEmitCount(c => c + 1);
      }, debounceMs);
    } else if (value.length === 0) {
      setOwnIsTyping(false);
    }
  }, [showTyping, debounceMs]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !showSend) return;
    sendMessage(inputValue.trim());
    setInputValue("");
    setOwnIsTyping(false);
    setOwnKeystrokeCount(0);
    setOwnEmitCount(0);
  }, [inputValue, showSend, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  useEffect(() => {
    if (autoScrollEnabled) {
      chatEndRef.current?.scrollIntoView({ behavior: rm ? "instant" : "smooth" });
    }
  }, [visibleMessages.length, autoScrollEnabled, rm]);

  const isGroupStart = useCallback((msg: ChatMessage) => {
    return !msg.isGrouped;
  }, []);

  const msgTransition = rm ? { duration: 0 } : SPRING.snappy;

  return (
    <div className={styles.chatContainer} role="log" aria-label="Chat messages" data-reduced-motion={rm ? "true" : undefined}>
      <AnimatePresence>
        {connectionState !== "connected" && (
          <motion.div
            key="connection-bar"
            className={styles.connectionBar}
            data-state={connectionState}
            initial={rm ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={rm ? {} : { height: 0, opacity: 0 }}
            transition={rm ? { duration: 0 } : TRANSITION.enterItem}
            role="alert"
          >
            {connectionState === "disconnected" ? "Disconnected — reconnecting..." : "Connecting..."}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.messageScroll} role="region" aria-label="Message history">
        <AnimatePresence initial={false}>
          {visibleMessages.map((msg, idx) => {
            const groupStart = isGroupStart(msg);
            const isPending = pendingMessages.some(p => p.id === msg.id);
            const isRead = showReadReceipts && lastReadIndex >= 0 && idx <= lastReadIndex;

            return (
              <motion.div
                key={msg.id}
                className={styles.messageRow}
                data-own={msg.isOwn ? "true" : undefined}
                data-group-start={groupStart ? "true" : undefined}
                initial={rm ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={rm ? {} : { opacity: 0, y: -8 }}
                transition={idx < 3 && !rm ? { ...msgTransition, delay: idx * 0.03 } : msgTransition}
              >
                {!msg.isOwn && groupStart && (
                  <div
                    className={styles.msgAvatar}
                    style={{ background: avatarColor(msg.avatarHue) }}
                    aria-hidden="true"
                  >
                    {msg.author[0]}
                  </div>
                )}
                {!msg.isOwn && !groupStart && <div className={styles.msgAvatarSpacer} />}

                <div className={styles.msgBubbleWrap}>
                  {!msg.isOwn && groupStart && (
                    <span className={styles.msgAuthor} style={{ color: avatarColor(msg.avatarHue) }}>
                      {msg.author}
                    </span>
                  )}

                  <div className={styles.msgBubbleRow}>
                    <div
                      className={styles.msgBubble}
                      data-own={msg.isOwn ? "true" : undefined}
                      data-pending={isPending ? "true" : undefined}
                    >
                      {showEncryption && (
                        <span className={styles.msgLock} aria-label="Encrypted">🔒</span>
                      )}
                      <span className={styles.msgContent}>{msg.content}</span>
                      <span className={styles.msgTime}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.isOwn && showDelivery && (
                          <span className={styles.msgStatus} data-read={isRead ? "true" : undefined}>
                            {msg.status === "sending" && " ◌"}
                            {msg.status === "sent" && " ✓"}
                            {msg.status === "delivered" && " ✓✓"}
                            {msg.status === "read" && " ✓✓"}
                          </span>
                        )}
                      </span>
                    </div>
                    {showReactions && (
                      <button
                        type="button"
                        className={styles.msgReactTrigger}
                        onClick={() => toggleReaction(msg.id, activeEmoji)}
                        aria-label={`React with ${activeEmoji} to "${msg.content.slice(0, 30)}"`}
                      >
                        {activeEmoji}
                      </button>
                    )}
                  </div>

                  {showReactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={styles.msgReactions}>
                      {Object.entries(msg.reactions).map(([emoji, count]) =>
                        count > 0 ? (
                          <button
                            key={emoji}
                            type="button"
                            className={styles.msgReactionBadge}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            aria-label={`${emoji} ${count} reactions`}
                          >
                            {emoji} {count}
                          </button>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {showTyping && typingUsers.length > 0 && (
          <motion.div
            className={styles.typingIndicator}
            initial={rm ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={rm ? {} : { opacity: 0, y: -4 }}
            transition={rm ? { duration: 0 } : TRANSITION.enterItem}
            aria-live="polite"
          >
            <div className={styles.typingDots} aria-hidden="true">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
            <span className={styles.typingText}>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className={styles.composeBar} data-disabled={!showSend ? "true" : undefined}>
        <input
          type="text"
          className={styles.composeInput}
          placeholder={showSend ? "Type a message..." : "Enable Send Message (step 6) to type"}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!showSend}
          maxLength={500}
          aria-label="Message input"
        />
        <button
          type="button"
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!showSend || !inputValue.trim()}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {showTyping && ownKeystrokeCount > 0 && (
        <div className={styles.ownTypingFeedback} aria-live="polite">
          <span className={styles.ownTypingIndicator} data-typing={ownIsTyping ? "true" : undefined}>
            {ownIsTyping ? "typing..." : "idle"}
          </span>
          <span className={styles.ownTypingStats}>
            {ownKeystrokeCount} keystrokes → {ownEmitCount} WS emits ({debounceMs}ms debounce)
          </span>
        </div>
      )}
    </div>
  );
}

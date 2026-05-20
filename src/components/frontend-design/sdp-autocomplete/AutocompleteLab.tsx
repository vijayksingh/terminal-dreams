"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  AutocompleteProvider,
  useAutocomplete,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  type TrackedRequest,
  type TypeDef,
  type TrieNode,
} from "./autocomplete-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { AUTOCOMPLETE_ARCH_CONFIG } from "./architecture-scenarios";
import {
  PersistentSearch,
  NetworkTimeline,
  TrieVisualizer,
  highlightMatch,
} from "./ui/SearchComponents";
import styles from "./AutocompleteLab.module.css";

// ── Public API ──────────────────────────────────────────────────────

export function AutocompleteLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;

  return (
    <AutocompleteProvider activeStep={activeStep}>
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
            <SearchEvolution />
          )}
        </div>
      </div>
    </AutocompleteProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step indicator bar
// ═══════════════════════════════════════════════════════════════════

const STEP_LABELS = [
  "R", "A", "C",
  "B", "Db", "Ab", "Tr",
  "Kb", "Gen", "Hi",
  "Err", "A11y", "LRU",
  "Cmp", "Scl",
];

const STEP_TITLES = [
  "Requirements", "API Design", "Architecture",
  "Baseline", "Debounce", "AbortController", "Trie Cache",
  "Keyboard Nav", "Generation Counter", "Highlighting",
  "Error Handling", "Accessibility", "LRU Eviction",
  "Compare Mode", "Scale",
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

const SCOPE_COMPLEXITY: Record<string, { loc: number; components: number }> = {
  debounce: { loc: 45, components: 1 },
  abort: { loc: 60, components: 1 },
  cache: { loc: 120, components: 2 },
  keyboard: { loc: 80, components: 1 },
  highlight: { loc: 35, components: 1 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useAutocomplete();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter((s) => scopeEnabled.has(s.id))
      .map((s) => s.label.replace("?", ""))
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    const baseLoc = 180;
    const baseComponents = 3;
    let loc = baseLoc;
    let components = baseComponents;
    scopeEnabled.forEach((id) => {
      const c = SCOPE_COMPLEXITY[id];
      if (c) { loc += c.loc; components += c.components; }
    });
    const grade = loc < 250 ? "Low" : loc < 400 ? "Medium" : "High";
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

// ── Step 2: API Design ─────────────────────────────────────────────

const API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = API_TABS[(idx + (e.key === "ArrowRight" ? 1 : API_TABS.length - 1)) % API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="ac-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="ac-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>
          Endpoints
        </button>
        <button type="button" role="tab" id="ac-tab-types" aria-selected={tab === "types"} aria-controls="ac-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>
          Types
        </button>
      </div>
      <div role="tabpanel" id={`ac-panel-${tab}`} aria-labelledby={`ac-tab-${tab}`}>
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
              aria-controls={`ep-detail-${key}`}
            >
              <span className={styles.httpMethod} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
            </button>
            {isOpen && (
              <div className={styles.endpointDetail} id={`ep-detail-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
                <p className={styles.endpointDesc}>{ep.description}</p>
                <div className={styles.paramTable}>
                  {ep.params.map((p) => (
                    <div key={p.name} className={styles.paramRow}>
                      <span className={styles.paramName}>{p.name}</span>
                      <span className={styles.paramType}>{p.type}</span>
                      <span className={styles.paramNote}>{p.note}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.responseRow}>
                  → <span className={styles.paramType}>{ep.responseType}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TypeCards() {
  return (
    <div className={styles.typeList}>
      {DATA_MODELS.map((t) => (
        <TypeCard key={t.name} def={t} />
      ))}
    </div>
  );
}

function TypeCard({ def }: { def: TypeDef }) {
  return (
    <div className={styles.typeCard}>
      <div className={styles.typeHeader}>
        <span className={styles.typeName}>{def.name}</span>
        <span className={styles.typeCat}>{def.category}</span>
      </div>
      <div className={styles.typeFields}>
        {def.fields.map((f) => (
          <div key={f.name} className={styles.typeFieldRow}>
            <span className={styles.fieldName}>{f.name}</span>
            <span className={styles.fieldType}>{f.type}</span>
            {f.note && <span className={styles.fieldNote}>{f.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Architecture ───────────────────────────────────────────

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={AUTOCOMPLETE_ARCH_CONFIG} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Search Evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function SearchEvolution() {
  const ctx = useAutocomplete();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.evolutionLayout}>
      {/* Metrics bar */}
      <MetricsBar />

      {/* Step controls */}
      <StepControls />

      {/* Persistent autocomplete demo */}
      <PersistentSearch />

      {/* Network timeline */}
      {ctx.activeStep >= 4 && <NetworkTimeline />}

      {/* Trie visualizer */}
      {ctx.isActive("trieCache") && <TrieVisualizer />}

      {/* Step widget */}
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

      {/* State inspector */}
      <StateInspector
        entries={ctx.stateEntries}
        title="AutocompleteState"
      />
    </div>
  );
}

// ── Metrics bar ────────────────────────────────────────────────────

function MetricsBar() {
  const { totalRequests, abortedRequests, cacheHits, networkSaved } = useAutocomplete();

  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Search metrics">
      <div className={styles.metric}>
        <span className={styles.metricValue}>{totalRequests}</span>
        <span className={styles.metricLabel}>Requests</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status="warning">{abortedRequests}</span>
        <span className={styles.metricLabel}>Aborted</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status="good">{cacheHits}</span>
        <span className={styles.metricLabel}>Cache hits</span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue} data-status={networkSaved > 50 ? "good" : undefined}>
          {networkSaved}%
        </span>
        <span className={styles.metricLabel}>Requests avoided</span>
      </div>
    </div>
  );
}

// ── Step controls ──────────────────────────────────────────────────

// ── Prediction challenges per step ────────────────────────────────

const STEP_PREDICTIONS: Record<number, { question: string; options: string[]; correctIndex: number; explanation: string }> = {
  4: {
    question: "You type 'react' at 80 WPM (one char every ~150ms). Without debounce, how many fetch requests fire?",
    options: ["1 — only the final query matters", "5 — one per keystroke", "2 — browser batches rapid inputs"],
    correctIndex: 1,
    explanation: "Without debounce, every keystroke fires a fetch. Typing 'react' sends 5 requests: 'r', 're', 'rea', 'reac', 'react'. Only the last result matters — the other 4 waste bandwidth and can cause race conditions.",
  },
  5: {
    question: "At 300ms debounce delay, typing 'react' at 80 WPM triggers how many fetch requests?",
    options: ["5 — debounce doesn't reduce count", "1 — all keystrokes within the delay window are collapsed", "3 — debounce fires every 2 characters"],
    correctIndex: 1,
    explanation: "Debounce waits until the user stops typing for 300ms before firing. At 150ms between keystrokes, the timer resets on each key. Only after the final 'react' + 300ms silence does one request fire.",
  },
  6: {
    question: "Request A (100ms latency) and Request B (300ms latency) are in flight. The user types more, making B stale. Without AbortController, whose results render?",
    options: ["A's — it resolves first", "B's — it was sent last so it wins", "Whichever resolves last — could be stale B"],
    correctIndex: 2,
    explanation: "Without abort, both requests complete independently. If B resolves last (which is likely since it's slower), its stale results overwrite A's fresh results. This is the race condition: a slower, stale request 'wins' by arriving late.",
  },
  7: {
    question: "You search 'rea' (cached), then search 'react' (not cached). How many network requests does 'react' need?",
    options: ["0 — 'rea' cache contains 'react' results", "1 — 'react' is a new prefix, needs a fresh request", "2 — one for 'reac', one for 'react'"],
    correctIndex: 1,
    explanation: "A trie cache stores results per exact prefix. 'rea' results may CONTAIN items matching 'react', but the cache key is the exact prefix. A prefix-aware trie can filter locally if the parent prefix was a superset, but naive caching requires a new request.",
  },
  8: {
    question: "For keyboard navigation in a combobox dropdown, what happens when the user presses ArrowDown at the last item?",
    options: ["Nothing — stay at the last item", "Wrap to the first item", "Close the dropdown"],
    correctIndex: 0,
    explanation: "WAI-ARIA Combobox pattern specifies that ArrowDown at the last option does NOT wrap — it stays at the last item. This prevents disorientation for screen reader users who would lose their position context. ArrowUp at the first item similarly stays put.",
  },
  9: {
    question: "The user types 'rea', deletes to 're', then types 'red'. Three requests fire. Request 1 ('rea') resolves last due to server load. What displays?",
    options: ["Results for 'rea' — it resolved last", "Results for 'red' — it's the current query", "Results for 're' — it's the shortest match"],
    correctIndex: 1,
    explanation: "A generation counter tags each request with a monotonic sequence number. The response handler checks: if response.generation < currentGeneration, discard it. Only the latest generation's results are displayed, regardless of resolution order.",
  },
  10: {
    question: "User searches 'scr' and results include 'JavaScript'. How should the match be highlighted?",
    options: ["Highlight the entire word 'JavaScript'", "Highlight 'scr' substring within 'JavaScript'", "Bold the entire result item"],
    correctIndex: 1,
    explanation: "Substring highlighting: find where the query appears within each result and wrap that range with a <mark> element. 'Java<mark>Scr</mark>ipt' shows the user exactly WHY this result matched. Use case-insensitive matching for the search, preserve original casing in display.",
  },
  11: {
    question: "Network is down but 'rea' is cached in the trie. User searches 'rea'. What should happen?",
    options: ["Show an error state immediately", "Show cached results with a 'offline' indicator", "Show nothing — cache is not a substitute for fresh data"],
    correctIndex: 1,
    explanation: "Graceful degradation: check the cache first. If cached results exist, show them with a subtle indicator that they may be stale. Only show an error state if both the network AND cache miss. The fallback cascade is: network → cache → stale results → error state.",
  },
  12: {
    question: "Which ARIA role pattern should an autocomplete search use?",
    options: ["role='search' with role='list' for results", "role='combobox' with aria-autocomplete='list'", "role='textbox' with role='menu' for results"],
    correctIndex: 1,
    explanation: "WAI-ARIA specifies role='combobox' for an input that controls a popup list. aria-autocomplete='list' indicates the popup provides completions. The results list uses role='listbox' with role='option' children. aria-activedescendant tracks the highlighted item without moving DOM focus.",
  },
  13: {
    question: "The trie cache has 100 entries and a max of 50. Which eviction strategy minimizes cache misses for autocomplete?",
    options: ["FIFO — remove oldest entries first", "LRU — remove least recently used entries", "LFU — remove least frequently used entries"],
    correctIndex: 1,
    explanation: "LRU (Least Recently Used) works best for autocomplete because search patterns are temporal: users search related terms in clusters. Recently accessed prefixes are likely to be accessed again. LFU would keep historically popular prefixes that may no longer be relevant to the current session.",
  },
  14: {
    question: "In 'compare mode' showing before/after optimization metrics side by side — what's the key metric to highlight?",
    options: ["Total bytes transferred", "Number of requests saved by debounce + cache", "Time from first keystroke to final results displayed"],
    correctIndex: 2,
    explanation: "Time-to-results is the user-perceived metric. It captures the combined effect of debounce delay, network latency, cache hits, and rendering time. Bytes transferred and request counts are implementation details — the user cares about 'how long until I see suggestions.'",
  },
  15: {
    question: "Scaling autocomplete to 1M items in the dataset. Which approach avoids sending 1M entries to the client?",
    options: ["Load all items upfront, search client-side with a trie", "Server-side search with cursor-based pagination", "Use a Web Worker to index items in the background"],
    correctIndex: 1,
    explanation: "At 1M items, client-side indexing requires ~50-100MB of memory and seconds of initialization. Server-side search with pagination keeps the client light: the server runs the trie/inverted index query and returns only the top N results per request. The trie cache on the client stores recent server responses, not the full dataset.",
  },
};

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
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION.enterCard}
            className={styles.predictionResult}
            data-correct={selected === correctIndex ? "true" : undefined}
          >
            {selected === correctIndex ? "✓ " : "✗ "}{explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepControls() {
  const ctx = useAutocomplete();
  const { activeStep, isActive, featureToggled, toggleFeature } = ctx;

  const featureForStep: Record<number, string> = {
    4: "basicSearch",
    5: "debounce",
    6: "abortController",
    7: "trieCache",
    8: "keyboardNav",
    9: "generationCounter",
    10: "matchHighlight",
    11: "networkError",
    12: "accessibility",
    13: "lruEviction",
    14: "compareMode",
  };

  const feature = featureForStep[activeStep];
  const featureLabels: Record<string, string> = {
    basicSearch: "Basic search",
    debounce: "Debounce (300ms)",
    abortController: "AbortController",
    trieCache: "Trie cache",
    keyboardNav: "Keyboard nav",
    generationCounter: "Generation counter",
    matchHighlight: "Match highlighting",
    networkError: "Network errors",
    accessibility: "Full ARIA",
    lruEviction: "LRU eviction",
    compareMode: "Compare mode",
  };

  const prediction = STEP_PREDICTIONS[activeStep];

  return (
    <div className={styles.stepControls}>
      {/* Prediction challenge for current step */}
      {prediction && (
        <PredictionChallenge
          key={activeStep}
          question={prediction.question}
          options={prediction.options}
          correctIndex={prediction.correctIndex}
          explanation={prediction.explanation}
        />
      )}

      {/* Feature toggle for current step */}
      {feature && activeStep <= 14 && (
        <button
          type="button"
          className={styles.featureToggle}
          data-on={isActive(feature) ? "true" : undefined}
          onClick={() => toggleFeature(feature)}
          aria-pressed={isActive(feature)}
          aria-label={`Toggle ${featureLabels[feature]}`}
        >
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleLabel}>{featureLabels[feature]}</span>
        </button>
      )}

      {/* Step-specific controls */}
      {activeStep === 5 && isActive("debounce") && (
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel} htmlFor="debounce-slider">
            Delay: {ctx.debounceMs}ms
          </label>
          <input
            id="debounce-slider"
            type="range"
            min={50}
            max={1000}
            step={50}
            value={ctx.debounceMs}
            onChange={(e) => ctx.setDebounceMs(Number(e.target.value))}
            className={styles.slider}
            aria-label="Debounce delay in milliseconds"
            aria-valuetext={`${ctx.debounceMs} milliseconds`}
          />
        </div>
      )}

      {activeStep === 11 && isActive("networkError") && (
        <div className={styles.sliderGroup}>
          <div className={styles.sliderRow}>
            <label className={styles.sliderLabel} htmlFor="delay-slider">
              Network delay: {ctx.networkDelayMs}ms
            </label>
            <input
              id="delay-slider"
              type="range"
              min={100}
              max={2000}
              step={100}
              value={ctx.networkDelayMs}
              onChange={(e) => ctx.setNetworkDelayMs(Number(e.target.value))}
              className={styles.slider}
              aria-label="Simulated network delay"
              aria-valuetext={`${ctx.networkDelayMs} milliseconds`}
            />
          </div>
          <div className={styles.sliderRow}>
            <label className={styles.sliderLabel} htmlFor="error-slider">
              Error rate: {Math.round(ctx.networkErrorRate * 100)}%
            </label>
            <input
              id="error-slider"
              type="range"
              min={0}
              max={100}
              step={10}
              value={ctx.networkErrorRate * 100}
              onChange={(e) => ctx.setNetworkErrorRate(Number(e.target.value) / 100)}
              className={styles.slider}
              aria-label="Simulated error rate"
              aria-valuetext={`${Math.round(ctx.networkErrorRate * 100)} percent`}
            />
          </div>
        </div>
      )}

      {activeStep === 13 && isActive("lruEviction") && (
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel} htmlFor="lru-slider">
            Max cache entries: {ctx.lruMaxSize}
          </label>
          <input
            id="lru-slider"
            type="range"
            min={5}
            max={200}
            step={5}
            value={ctx.lruMaxSize}
            onChange={(e) => ctx.setLruMaxSize(Number(e.target.value))}
            className={styles.slider}
            aria-label="LRU cache maximum size"
            aria-valuetext={`${ctx.lruMaxSize} entries`}
          />
        </div>
      )}

      {/* Clear button */}
      <button
        type="button"
        className={styles.clearButton}
        onClick={ctx.clearAll}
        aria-label="Clear search and reset"
      >
        Reset
      </button>
    </div>
  );
}

// ── Extracted persistent search, network timeline, and trie visualizer to ui/SearchComponents ──

// ── Step widgets ───────────────────────────────────────────────────

function StepWidget({ step }: { step: number }) {
  switch (step) {
    case 4:
      return <BaselineWidget />;
    case 5:
      return <DebounceWidget />;
    case 6:
      return <AbortWidget />;
    case 7:
      return <TrieCacheWidget />;
    case 8:
      return <KeyboardWidget />;
    case 9:
      return <GenerationWidget />;
    case 10:
      return <HighlightWidget />;
    case 11:
      return <ErrorWidget />;
    case 12:
      return <AccessibilityWidget />;
    case 13:
      return <LruWidget />;
    case 14:
      return <CompareWidget />;
    case 15:
      return <ScaleWidget />;
    default:
      return null;
  }
}

const BASELINE_DEMO_WORD = "react";

function BaselineWidget() {
  const [typed, setTyped] = useState("");
  const [reqCount, setReqCount] = useState(0);
  const [debouncedCount, setDebouncedCount] = useState(0);
  const [requestBursts, setRequestBursts] = useState<{ char: string; ts: number; type: "naive" | "debounced" }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const typedRef = useRef(typed);
  typedRef.current = typed;

  const typeNext = useCallback(() => {
    const prev = typedRef.current;
    const next = BASELINE_DEMO_WORD.slice(0, prev.length + 1);
    if (next.length <= prev.length) return;
    setTyped(next);

    const char = next[next.length - 1];
    setReqCount(c => c + 1);
    setRequestBursts(b => [...b, { char, ts: Date.now(), type: "naive" }]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedCount(c => c + 1);
      setRequestBursts(b => [...b, { char: next, ts: Date.now(), type: "debounced" }]);
    }, 300);
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTyped("");
    setReqCount(0);
    setDebouncedCount(0);
    setRequestBursts([]);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Keystroke cost simulator</div>
      <div className={styles.widgetBody}>
        <div className={styles.baselineInput}>
          <span className={styles.baselinePrefix}>search: &quot;</span>
          <span className={styles.baselineTyped}>{typed}</span>
          <span className={styles.baselineCursor}>|</span>
          <span className={styles.baselinePrefix}>&quot;</span>
        </div>
        <div className={styles.baselineButtons}>
          <button type="button" className={styles.simButton} onClick={typeNext} disabled={typed.length >= BASELINE_DEMO_WORD.length} aria-label={`Type next character: ${BASELINE_DEMO_WORD[typed.length] ?? "done"}`}>
            Type &quot;{BASELINE_DEMO_WORD[typed.length] ?? "done"}&quot;
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset} aria-label="Reset simulator">
            Reset
          </button>
        </div>
        <div className={styles.baselineComparison}>
          <div className={styles.baselineRow} data-variant="bad">
            <span className={styles.baselineRowLabel}>Naive</span>
            <div className={styles.comparisonBar}>
              <div className={styles.comparisonFill} style={{ width: `${(reqCount / BASELINE_DEMO_WORD.length) * 100}%` }} data-bad="true" />
            </div>
            <span className={styles.baselineRowCount}>{reqCount} req{reqCount !== 1 ? "s" : ""}</span>
          </div>
          <div className={styles.baselineRow} data-variant="good">
            <span className={styles.baselineRowLabel}>Debounced</span>
            <div className={styles.comparisonBar}>
              <div className={styles.comparisonFill} style={{ width: `${(debouncedCount / BASELINE_DEMO_WORD.length) * 100}%` }} data-good="true" />
            </div>
            <span className={styles.baselineRowCount}>{debouncedCount} req{debouncedCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className={styles.baselineBurstLog} role="log" aria-live="polite" aria-label="Request log">
          {requestBursts.slice(-6).map((b, i) => (
            <span key={i} className={styles.baselineBurst} data-type={b.type}>
              {b.type === "naive" ? `→ fetch("${b.char}")` : `→ debounced fetch("${b.char}")`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DebounceWidget() {
  const { debounceMs } = useAutocomplete();
  const noMotion = usePrefersReducedMotion();
  const [keystrokes, setKeystrokes] = useState<{ char: string; resets: boolean }[]>([]);
  const [timerProgress, setTimerProgress] = useState(0);
  const [fired, setFired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const typeChar = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    const chars = "javascript";
    const nextChar = chars[keystrokes.length % chars.length];
    setKeystrokes(prev => [...prev, { char: nextChar, resets: prev.length > 0 }]);
    setFired(false);
    setTimerProgress(0);
    startRef.current = Date.now();

    if (noMotion) {
      setTimerProgress(1);
      setFired(true);
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / debounceMs, 1);
      setTimerProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    timerRef.current = setTimeout(() => {
      setTimerProgress(1);
      setFired(true);
    }, debounceMs);
  }, [noMotion, debounceMs, keystrokes.length]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setKeystrokes([]);
    setTimerProgress(0);
    setFired(false);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Debounce timer — watch it reset</div>
      <div className={styles.widgetBody}>
        <div className={styles.debounceVisualTimer}>
          <div className={styles.debounceTimerBar}>
            <div className={styles.debounceTimerFill} style={{ width: `${timerProgress * 100}%` }} data-fired={fired ? "true" : undefined} />
          </div>
          <span className={styles.debounceTimerLabel}>
            {fired ? `FIRED after ${debounceMs}ms` : timerProgress > 0 ? `${Math.round(timerProgress * debounceMs)}ms / ${debounceMs}ms` : "Waiting..."}
          </span>
        </div>
        <div className={styles.debounceControls}>
          <button type="button" className={styles.simButton} onClick={typeChar} aria-label="Simulate keystroke">
            Type &quot;{("javascript")[keystrokes.length % 10]}&quot;
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset}>Reset</button>
        </div>
        <div className={styles.debounceKeyLog} role="log" aria-live="polite">
          {keystrokes.slice(-8).map((k, i) => (
            <span key={i} className={styles.debounceLogEntry}>
              <kbd className={styles.kbd}>{k.char}</kbd>
              {k.resets && <span className={styles.debounceReset}>reset</span>}
            </span>
          ))}
          {fired && <span className={styles.debounceFiredBadge}>fetch()</span>}
        </div>
      </div>
    </div>
  );
}

type RaceReq = { id: string; term: string; delay: number; progress: number; status: "pending" | "in-flight" | "aborted" | "completed" };

function AbortWidget() {
  const { isActive } = useAutocomplete();
  const noMotion = usePrefersReducedMotion();
  const abortOn = isActive("abortController");
  const [raceState, setRaceState] = useState<RaceReq[]>([]);
  const [raceResult, setRaceResult] = useState<string | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const rafsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      rafsRef.current.forEach(cancelAnimationFrame);
    };
  }, []);

  const runRace = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    rafsRef.current.forEach(cancelAnimationFrame);
    timersRef.current.clear();
    rafsRef.current.clear();
    setRaceResult(null);

    const reqs: RaceReq[] = [
      { id: "A", term: "j", delay: 1200, progress: 0, status: "in-flight" },
      { id: "B", term: "ja", delay: 800, progress: 0, status: "in-flight" },
      { id: "C", term: "jav", delay: 400, progress: 0, status: "in-flight" },
    ];
    setRaceState(reqs);

    if (noMotion) {
      setRaceState(reqs.map((req, idx) => ({
        ...req,
        progress: 1,
        status: abortOn && idx < reqs.length - 1 ? "aborted" as const : "completed" as const,
      })));
      setRaceResult(reqs[reqs.length - 1].term);
      return;
    }

    reqs.forEach((req, idx) => {
      const start = Date.now();
      const animate = () => {
        const elapsed = Date.now() - start;
        const p = Math.min(elapsed / req.delay, 1);
        setRaceState(prev => prev.map(r => r.id === req.id && r.status === "in-flight" ? { ...r, progress: p } : r));
        if (p < 1) {
          const raf = requestAnimationFrame(animate);
          rafsRef.current.add(raf);
        }
      };
      const raf = requestAnimationFrame(animate);
      rafsRef.current.add(raf);

      if (abortOn && idx < reqs.length - 1) {
        const abortDelay = (idx + 1) * 200;
        const t = setTimeout(() => {
          setRaceState(prev => prev.map(r => r.id === req.id ? { ...r, status: "aborted", progress: r.progress } : r));
        }, abortDelay);
        timersRef.current.add(t);
      }

      const t2 = setTimeout(() => {
        setRaceState(prev => prev.map(r => {
          if (r.id !== req.id) return r;
          if (r.status === "aborted") return r;
          return { ...r, status: "completed", progress: 1 };
        }));
        if (!abortOn || idx === reqs.length - 1) {
          setRaceResult(req.term);
        }
      }, req.delay);
      timersRef.current.add(t2);
    });
  }, [noMotion, abortOn]);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Race condition simulator</div>
      <div className={styles.widgetBody}>
        <button type="button" className={styles.simButton} onClick={runRace} aria-label="Simulate race condition">
          Simulate: &quot;j&quot; → &quot;ja&quot; → &quot;jav&quot; (3 rapid queries)
        </button>
        <div className={styles.raceTimeline}>
          {raceState.map(req => (
            <div key={req.id} className={styles.raceLine}>
              <span className={styles.raceLabel}>Req {req.id}: &quot;{req.term}&quot;</span>
              <div className={styles.raceBarTrack}>
                <div
                  className={styles.raceBar}
                  style={{ width: `${req.progress * 100}%` }}
                  data-status={req.status}
                />
              </div>
              <span className={styles.raceStatus} data-status={req.status}>
                {req.status === "in-flight" ? `${Math.round(req.progress * 100)}%` : req.status === "aborted" ? "aborted" : "done"}
              </span>
            </div>
          ))}
        </div>
        {raceResult && (
          <div className={styles.raceOutcome} data-correct={raceResult === "jav" ? "true" : undefined}>
            Rendered result: &quot;{raceResult}&quot;
            {raceResult !== "jav" && !abortOn && (
              <span className={styles.raceWarning}> — STALE! Should be &quot;jav&quot;</span>
            )}
            {raceResult === "jav" && abortOn && (
              <span className={styles.raceSuccess}> — correct, older requests aborted</span>
            )}
          </div>
        )}
        {raceState.length === 0 && (
          <p className={styles.widgetNote}>
            Click simulate to fire 3 requests with different latencies.
            {abortOn ? " AbortController will cancel stale ones." : " Without abort, the slowest response wins — even if it is stale."}
          </p>
        )}
      </div>
    </div>
  );
}

function TrieCacheWidget() {
  const { trie } = useAutocomplete();
  const [traceInput, setTraceInput] = useState("");
  const [tracePos, setTracePos] = useState(0);
  const [isTracing, setIsTracing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const startTrace = useCallback(() => {
    if (!traceInput.trim()) return;
    setTracePos(0);
    setIsTracing(true);
    let pos = 0;
    const step = () => {
      pos++;
      setTracePos(pos);
      if (pos < traceInput.length) {
        timerRef.current = setTimeout(step, 400);
      } else {
        timerRef.current = setTimeout(() => setIsTracing(false), 600);
      }
    };
    timerRef.current = setTimeout(step, 400);
  }, [traceInput]);

  const traceChars = traceInput.split("");
  let traceNode: TrieNode | null = trie.root;
  const pathStatus: ("hit" | "miss" | "pending")[] = traceChars.map((ch, i) => {
    if (i >= tracePos) return "pending";
    const child = traceNode?.children.get(ch);
    if (child) { traceNode = child; return "hit"; }
    traceNode = null;
    return "miss";
  });
  const cacheHit = traceNode !== null && traceNode.results !== null && tracePos === traceChars.length && tracePos > 0;

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Trace a trie lookup</div>
      <div className={styles.widgetBody}>
        <div className={styles.trieTraceInput}>
          <input
            type="text"
            className={styles.trieTraceField}
            value={traceInput}
            onChange={(e) => { setTraceInput(e.target.value.toLowerCase()); setTracePos(0); setIsTracing(false); }}
            placeholder="Type a prefix to trace..."
            maxLength={12}
            disabled={isTracing}
            aria-label="Prefix to trace through trie"
          />
          <button
            type="button"
            className={styles.simButton}
            onClick={startTrace}
            disabled={isTracing || !traceInput.trim()}
          >
            {isTracing ? "Tracing..." : "Trace"}
          </button>
        </div>
        {traceInput.length > 0 && (
          <div className={styles.trieTracePath} aria-live="polite">
            <span className={styles.trieTraceNode} data-status="hit">root</span>
            {traceChars.map((ch, i) => (
              <React.Fragment key={i}>
                <span className={styles.trieTraceArrow}>→</span>
                <span className={styles.trieTraceNode} data-status={pathStatus[i]}>
                  {ch}
                  {pathStatus[i] === "hit" && <span className={styles.trieTraceCheck}>✓</span>}
                  {pathStatus[i] === "miss" && <span className={styles.trieTraceMiss}>✗</span>}
                </span>
              </React.Fragment>
            ))}
            {cacheHit && <span className={styles.trieTraceResult}>→ cached results!</span>}
            {tracePos > 0 && tracePos === traceChars.length && !cacheHit && !isTracing && (
              <span className={styles.trieTraceMissResult}>→ cache miss (will fetch)</span>
            )}
          </div>
        )}
        <div className={styles.trieExplainer}>
          <div className={styles.trieExplainerRow}>
            <span className={styles.trieExplainerLabel}>Cost</span>
            <span className={styles.trieExplainerValue}>O({traceInput.length || "k"}) — {traceInput.length || "k"} node{traceInput.length !== 1 ? "s" : ""} visited</span>
          </div>
          <div className={styles.trieExplainerRow}>
            <span className={styles.trieExplainerLabel}>Nodes</span>
            <span className={styles.trieExplainerValue}>{trie.nodeCount}</span>
          </div>
          <div className={styles.trieExplainerRow}>
            <span className={styles.trieExplainerLabel}>Cached</span>
            <span className={styles.trieExplainerValue}>{trie.cacheCount} prefixes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const KB_MOCK_ITEMS = ["React", "React Native", "React Router", "React Query", "React Hook Form"];

function KeyboardWidget() {
  const [highlight, setHighlight] = useState(-1);
  const [isOpen, setIsOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLastKey("↓");
      if (!isOpen) {
        setIsOpen(true);
        setHighlight(0);
        setLastAction("Open dropdown, highlight first");
      } else {
        const next = Math.min(highlightRef.current + 1, KB_MOCK_ITEMS.length - 1);
        setHighlight(next);
        setLastAction(`Highlight → item ${next}`);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLastKey("↑");
      const next = Math.max(highlightRef.current - 1, 0);
      setHighlight(next);
      setLastAction(`Highlight → item ${next}`);
    } else if (e.key === "Enter" && highlightRef.current >= 0 && isOpen) {
      e.preventDefault();
      setLastKey("↵");
      setSelected(KB_MOCK_ITEMS[highlightRef.current]);
      setIsOpen(false);
      setLastAction(`Selected "${KB_MOCK_ITEMS[highlightRef.current]}"`);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setLastKey("Esc");
      setIsOpen(false);
      setHighlight(-1);
      setLastAction("Close dropdown");
    }
  }, [isOpen]);

  const reset = useCallback(() => {
    setHighlight(-1);
    setIsOpen(true);
    setSelected(null);
    setLastKey(null);
    setLastAction(null);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Keyboard navigation sandbox</div>
      <div className={styles.widgetBody}>
        <div
          className={styles.kbSandbox}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="application"
          aria-label="Keyboard navigation practice area. Use arrow keys, Enter, and Escape. Press Tab to exit."
          aria-activedescendant={isOpen && highlight >= 0 ? `kb-option-${highlight}` : undefined}
          ref={listRef}
        >
          <div className={styles.kbInput}>
            {selected ?? "react"}
            <span className={styles.baselineCursor}>|</span>
          </div>
          {isOpen && (
            <div className={styles.kbDropdown} role="listbox" id="kb-listbox">
              {KB_MOCK_ITEMS.map((item, i) => (
                <div
                  key={item}
                  id={`kb-option-${i}`}
                  className={styles.kbOption}
                  data-highlighted={i === highlight ? "true" : undefined}
                  role="option"
                  aria-selected={i === highlight}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
          {!isOpen && <div className={styles.kbClosed}>Dropdown closed — press ↓ to reopen</div>}
        </div>
        <div className={styles.kbFeedback} aria-live="polite">
          {lastKey && (
            <>
              <kbd className={styles.kbd}>{lastKey}</kbd>
              <span className={styles.kbAction}>{lastAction}</span>
            </>
          )}
          {!lastKey && <span className={styles.kbHint}>Click the box above, then press ↑ ↓ Enter Esc</span>}
        </div>
        <button type="button" className={`${styles.simButtonSecondary} ${styles.kbResetButton}`} onClick={reset} aria-label="Reset keyboard sandbox">
          Reset
        </button>
        <div className={styles.kbAriaReadout}>
          <code>aria-activedescendant</code> = {highlight >= 0 ? `"option-${highlight}"` : "(none)"}
        </div>
        <p className={styles.widgetNote}>Practice here, then try the same keys on the real search input above.</p>
      </div>
    </div>
  );
}

function GenerationWidget() {
  const [genCounter, setGenCounter] = useState(0);
  const [simRequests, setSimRequests] = useState<{ gen: number; term: string; status: "flying" | "stale" | "accepted" }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const fireRequest = useCallback(() => {
    const newGen = genCounter + 1;
    setGenCounter(newGen);
    const term = ["re", "rea", "reac", "react"][Math.min(newGen - 1, 3)] ?? "react";
    setSimRequests(prev => [
      ...prev.map(r => r.status === "flying" ? { ...r, status: "stale" as const } : r),
      { gen: newGen, term, status: "flying" as const },
    ]);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSimRequests(prev => prev.map(r =>
        r.gen === newGen && r.status === "flying"
          ? { ...r, status: "accepted" as const }
          : r
      ));
    }, 800);
  }, [genCounter]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setGenCounter(0);
    setSimRequests([]);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Generation counter — last line of defense</div>
      <div className={styles.widgetBody}>
        <div className={styles.genControls}>
          <button type="button" className={styles.simButton} onClick={fireRequest} aria-label="Fire next request">
            Fire request #{genCounter + 1}
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset} aria-label="Reset simulation">
            Reset
          </button>
          <span className={styles.genCounterDisplay}>gen = {genCounter}</span>
        </div>
        <div className={styles.genTimeline}>
          {simRequests.map((req) => (
            <div key={req.gen} className={styles.genRequest} data-status={req.status}>
              <span className={styles.genRequestGen}>gen={req.gen}</span>
              <span className={styles.genRequestTerm}>&quot;{req.term}&quot;</span>
              <span className={styles.genRequestStatus}>
                {req.status === "flying" ? "in flight..." : req.status === "stale" ? "dropped (gen mismatch)" : "accepted"}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.widgetNote}>
          Click rapidly to fire overlapping requests. Only the latest generation is accepted.
          Previous responses arrive but get discarded because <code>gen !== genRef.current</code>.
        </p>
      </div>
    </div>
  );
}

const XSS_PAYLOADS = [
  { label: "Normal", value: "React" },
  { label: "Script tag", value: "<script>alert(1)</script>" },
  { label: "Img onerror", value: '<img onerror="alert(1)">' },
  { label: "Event handler", value: '" onmouseover="alert(1)' },
];

function HighlightWidget() {
  const [selectedPayload, setSelectedPayload] = useState(0);
  const testQuery = XSS_PAYLOADS[selectedPayload].value;
  const sampleText = "Learning React and React Native";

  const dangerousHtml = sampleText.replace(
    testQuery,
    `<b style="color:red">${testQuery}</b>`
  );

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>XSS-safe highlighting</div>
      <div className={styles.widgetBody}>
        <div className={styles.payloadPicker}>
          <span className={styles.payloadLabel}>Try a query payload:</span>
          <div className={styles.payloadButtons}>
            {XSS_PAYLOADS.map((p, i) => (
              <button
                key={i}
                type="button"
                className={styles.payloadButton}
                data-active={selectedPayload === i ? "true" : undefined}
                data-dangerous={i > 0 ? "true" : undefined}
                onClick={() => setSelectedPayload(i)}
                aria-pressed={selectedPayload === i}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.highlightComparison}>
          <div className={styles.highlightBad}>
            <span className={styles.highlightLabel}>innerHTML (dangerous)</span>
            <div className={styles.highlightOutput}>
              <code className={styles.highlightCode}>{dangerousHtml}</code>
            </div>
          </div>
          <div className={styles.highlightGood}>
            <span className={styles.highlightLabel}>React elements (safe)</span>
            <div className={styles.highlightOutput}>
              {highlightMatch(sampleText, testQuery)}
            </div>
          </div>
        </div>
        <p className={styles.widgetNote}>
          {selectedPayload === 0
            ? "Normal text works in both. Try a malicious payload to see the difference."
            : `The innerHTML approach injects "${testQuery}" as raw HTML. React renders it as harmless text.`}
        </p>
      </div>
    </div>
  );
}

const FALLBACK_LEVELS = [
  { id: "network", label: "Network", icon: "📡", desc: "API responds normally" },
  { id: "cache", label: "Trie cache", icon: "🌳", desc: "Serve from cached prefix" },
  { id: "parent", label: "Parent prefix", icon: "🔍", desc: "Filter parent's results" },
  { id: "empty", label: "Unavailable", icon: "∅", desc: "Graceful empty state" },
];

function ErrorWidget() {
  const [disabledLevels, setDisabledLevels] = useState<Set<string>>(new Set());
  const [activeLevel, setActiveLevel] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const simulate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSimulating(true);
    setActiveLevel(0);

    let level = 0;
    const step = () => {
      if (!disabledLevels.has(FALLBACK_LEVELS[level].id) || level >= FALLBACK_LEVELS.length - 1) {
        setActiveLevel(level);
        setIsSimulating(false);
        return;
      }
      setActiveLevel(level);
      level++;
      timerRef.current = setTimeout(step, 500);
    };
    step();
  }, [disabledLevels]);

  const toggleLevel = useCallback((id: string) => {
    if (id === "empty") return;
    setDisabledLevels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisabledLevels(new Set());
    setActiveLevel(0);
    setIsSimulating(false);
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Error cascade simulator</div>
      <div className={styles.widgetBody}>
        <div className={styles.cascadeLevels}>
          {FALLBACK_LEVELS.map((level, i) => (
            <button
              key={level.id}
              type="button"
              className={styles.cascadeLevel}
              data-disabled={disabledLevels.has(level.id) ? "true" : undefined}
              data-active={activeLevel === i && !isSimulating ? "true" : undefined}
              data-checking={activeLevel === i && isSimulating ? "true" : undefined}
              data-final={level.id === "empty" ? "true" : undefined}
              onClick={() => toggleLevel(level.id)}
              aria-pressed={!disabledLevels.has(level.id)}
              aria-label={`${level.label}: ${disabledLevels.has(level.id) ? "disabled" : "enabled"}`}
            >
              <span className={styles.cascadeIcon}>{level.icon}</span>
              <span className={styles.cascadeLabel}>{level.label}</span>
              <span className={styles.cascadeStatus}>
                {disabledLevels.has(level.id) ? "✗ down" : "✓ up"}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.cascadeControls}>
          <button type="button" className={styles.simButton} onClick={simulate} aria-label="Simulate request with current fallback configuration">
            Simulate request →
          </button>
          <button type="button" className={styles.simButtonSecondary} onClick={reset} aria-label="Reset all fallbacks">
            Reset
          </button>
        </div>
        <div className={styles.cascadeResult} aria-live="polite">
          {!isSimulating && activeLevel >= 0 && (
            <span>
              Resolved at level {activeLevel + 1}: <strong>{FALLBACK_LEVELS[activeLevel].desc}</strong>
            </span>
          )}
          {isSimulating && (
            <span className={styles.cascadeChecking}>Checking fallbacks...</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AccessibilityWidget() {
  const { query, isOpen, highlightedIndex, results } = useAutocomplete();
  const [showAria, setShowAria] = useState(true);

  const liveAttrs = [
    { attr: "role", value: "combobox", element: "input", live: true },
    { attr: "aria-expanded", value: String(isOpen), element: "input", live: true },
    { attr: "aria-autocomplete", value: "list", element: "input", live: true },
    { attr: "aria-controls", value: "ac-lab-listbox", element: "input", live: true },
    { attr: "aria-activedescendant", value: highlightedIndex >= 0 ? `ac-lab-result-${highlightedIndex}` : "(none)", element: "input", live: true },
    { attr: "role", value: isOpen ? "listbox" : "(hidden)", element: "dropdown", live: true },
    { attr: "aria-selected", value: highlightedIndex >= 0 ? `true on item ${highlightedIndex}` : "(none)", element: "option", live: true },
  ];

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Live ARIA inspector</div>
      <div className={styles.widgetBody}>
        <div className={styles.ariaToggleRow}>
          <span className={styles.ariaToggleLabel}>Show ARIA attributes</span>
          <button
            type="button"
            className={styles.ariaToggleButton}
            data-on={showAria ? "true" : undefined}
            onClick={() => setShowAria(!showAria)}
            aria-pressed={showAria}
          >
            <span className={styles.toggleTrack}><span className={styles.toggleThumb} /></span>
          </button>
        </div>
        {showAria && (
          <div className={styles.ariaLiveTable}>
            {liveAttrs.map(({ attr, value, element }) => (
              <div key={`${element}-${attr}`} className={styles.ariaLiveRow} data-active={value !== "(none)" && value !== "(hidden)" && value !== "false" ? "true" : undefined}>
                <code className={styles.ariaAttr}>{attr}</code>
                <span className={styles.ariaOn}>{element}</span>
                <span className={styles.ariaLiveValue}>{value}</span>
              </div>
            ))}
          </div>
        )}
        <p className={styles.widgetNote}>
          Type and navigate above — watch the ARIA values update in real time.
          Screen readers use these to announce &quot;{query || "..."}&quot;{isOpen ? `, ${results.length} results available` : ""}.
        </p>
      </div>
    </div>
  );
}

function LruWidget() {
  const { lruMaxSize, trie, lastEviction } = useAutocomplete();
  const usage = Math.min(100, Math.round((trie.cacheCount / lruMaxSize) * 100));
  const [flash, setFlash] = useState(false);
  const prevTs = useRef(0);

  useEffect(() => {
    if (lastEviction && lastEviction.ts !== prevTs.current) {
      prevTs.current = lastEviction.ts;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(t);
    }
  }, [lastEviction]);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>LRU cache pressure</div>
      <div className={styles.widgetBody}>
        <div className={styles.lruMeter}>
          <div className={styles.lruBar}>
            <div
              className={styles.lruFill}
              style={{ width: `${usage}%` }}
              data-pressure={usage > 80 ? "high" : usage > 50 ? "medium" : "low"}
            />
          </div>
          <span className={styles.lruLabel}>
            {trie.cacheCount} / {lruMaxSize} entries ({usage}%)
          </span>
        </div>
        <div className={styles.lruEvictionLog} aria-live="polite" data-flash={flash ? "true" : undefined}>
          {lastEviction
            ? `Evicted ${lastEviction.count} least-recently-used prefix${lastEviction.count > 1 ? "es" : ""}`
            : "No evictions yet — fill the cache to trigger LRU"}
        </div>
      </div>
    </div>
  );
}

function CompareWidget() {
  const [noDebounceCount, setNoDebounceCount] = useState(0);
  const [debouncedCount, setDebouncedCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [compareInput, setCompareInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Set<string>>(new Set());

  const handleCompareInput = useCallback((value: string) => {
    setCompareInput(value);
    if (!value.trim()) return;

    setNoDebounceCount((p) => p + 1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedCount((p) => p + 1);
    }, 300);

    if (cacheDebounceRef.current) clearTimeout(cacheDebounceRef.current);
    cacheDebounceRef.current = setTimeout(() => {
      const key = value.trim().toLowerCase();
      if (!cacheRef.current.has(key)) {
        cacheRef.current.add(key);
        setCachedCount((p) => p + 1);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (cacheDebounceRef.current) clearTimeout(cacheDebounceRef.current);
    };
  }, []);

  const resetCompare = useCallback(() => {
    setCompareInput("");
    setNoDebounceCount(0);
    setDebouncedCount(0);
    setCachedCount(0);
    cacheRef.current.clear();
  }, []);

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Side-by-side comparison</div>
      <div className={styles.widgetBody}>
        <div className={styles.compareInputRow}>
          <input
            className={styles.compareInput}
            type="text"
            value={compareInput}
            onChange={(e) => handleCompareInput(e.target.value)}
            placeholder='Type "javascript" and watch...'
            aria-label="Compare debounce strategies"
          />
          <button type="button" className={styles.compareReset} onClick={resetCompare}>
            Reset
          </button>
        </div>
        <div className={styles.compareColumns}>
          <div className={styles.compareCol}>
            <span className={styles.compareColTitle}>No debounce</span>
            <span className={styles.compareCount} data-high={noDebounceCount > 5 ? "true" : undefined}>
              {noDebounceCount}
            </span>
            <span className={styles.compareUnit}>requests</span>
          </div>
          <div className={styles.compareCol}>
            <span className={styles.compareColTitle}>300ms debounce</span>
            <span className={styles.compareCount}>{debouncedCount}</span>
            <span className={styles.compareUnit}>requests</span>
          </div>
          <div className={styles.compareCol}>
            <span className={styles.compareColTitle}>Debounce + Cache</span>
            <span className={styles.compareCount} data-good="true">{cachedCount}</span>
            <span className={styles.compareUnit}>network requests</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScaleWidget() {
  const [termCount, setTermCount] = useState(100);
  const [benchResults, setBenchResults] = useState<{ map: number; trie: number; linear: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const rafRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const runBenchmark = useCallback(() => {
    setIsRunning(true);
    setBenchResults(null);
    rafRef.current = requestAnimationFrame(() => {
      const data = Array.from({ length: termCount }, (_, i) => `term-${i}-${String.fromCharCode(97 + (i % 26))}`);
      const mapStore = new Map(data.map(d => [d, true]));

      const trieRoot: Record<string, unknown> = {};
      for (const term of data) {
        let node = trieRoot;
        for (const ch of term) {
          if (!node[ch]) node[ch] = {};
          node = node[ch] as Record<string, unknown>;
        }
        node["$"] = true;
      }

      const query = "term-50";
      const iterations = 1000;

      const t0 = performance.now();
      for (let i = 0; i < iterations; i++) mapStore.get(query);
      const mapTime = performance.now() - t0;

      const t1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        let node: Record<string, unknown> = trieRoot;
        for (const ch of query) {
          if (!node[ch]) break;
          node = node[ch] as Record<string, unknown>;
        }
      }
      const trieTime = performance.now() - t1;

      const t2 = performance.now();
      for (let i = 0; i < iterations; i++) data.filter(d => d.includes(query));
      const linearTime = performance.now() - t2;

      if (!mountedRef.current) return;
      setBenchResults({
        map: Math.round(mapTime * 100) / 100,
        trie: Math.round(trieTime * 100) / 100,
        linear: Math.round(linearTime * 100) / 100,
      });
      setIsRunning(false);
    });
  }, [termCount]);

  const maxTime = benchResults ? Math.max(benchResults.map, benchResults.trie, benchResults.linear, 0.01) : 1;

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetTitle}>Live benchmark — feel the difference</div>
      <div className={styles.widgetBody}>
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel} htmlFor="scale-slider">
            Dataset: {termCount.toLocaleString()} terms
          </label>
          <input
            id="scale-slider"
            type="range"
            min={100}
            max={100000}
            step={100}
            value={termCount}
            onChange={(e) => setTermCount(Number(e.target.value))}
            className={styles.slider}
            aria-label="Number of terms in dataset"
            aria-valuetext={`${termCount.toLocaleString()} terms`}
          />
        </div>
        <button type="button" className={styles.simButton} onClick={runBenchmark} disabled={isRunning} aria-label={`Run benchmark with ${termCount} terms`}>
          {isRunning ? "Running..." : `Benchmark 1000 lookups x ${termCount.toLocaleString()} terms`}
        </button>
        {benchResults && (
          <div className={styles.benchResults} aria-live="polite">
            <div className={styles.benchRow}>
              <span className={styles.benchLabel}>Map.get</span>
              <div className={styles.benchBarTrack}>
                <div className={styles.benchBar} data-kind="good" style={{ width: `${Math.max(2, (benchResults.map / maxTime) * 100)}%` }} />
              </div>
              <span className={styles.benchTime}>{benchResults.map}ms</span>
            </div>
            <div className={styles.benchRow}>
              <span className={styles.benchLabel}>Trie walk</span>
              <div className={styles.benchBarTrack}>
                <div className={styles.benchBar} data-kind="neutral" style={{ width: `${Math.max(2, (benchResults.trie / maxTime) * 100)}%` }} />
              </div>
              <span className={styles.benchTime}>{benchResults.trie}ms</span>
            </div>
            <div className={styles.benchRow}>
              <span className={styles.benchLabel}>Array.filter</span>
              <div className={styles.benchBarTrack}>
                <div className={styles.benchBar} data-kind="bad" style={{ width: `${Math.max(2, (benchResults.linear / maxTime) * 100)}%` }} />
              </div>
              <span className={styles.benchTime}>{benchResults.linear}ms</span>
            </div>
          </div>
        )}
        {benchResults && (
          <p className={styles.widgetNote}>
            Array.filter is {benchResults.linear > 0.01 ? `${Math.round(benchResults.linear / Math.max(benchResults.map, 0.01))}x` : "~same as"} slower than Map.
            At {termCount.toLocaleString()} terms, the trie stays proportional to query length, not dataset size.
          </p>
        )}
        {!benchResults && !isRunning && (
          <p className={styles.widgetNote}>
            Click benchmark to measure real lookup times in your browser.
            Increase the dataset to see Array.filter degrade while Map and Trie stay flat.
          </p>
        )}
      </div>
    </div>
  );
}

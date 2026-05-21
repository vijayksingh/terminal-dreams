"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  VideoStreamingProvider,
  useVideoStreaming,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  QUALITY_LEVELS,
  type TypeDef,
} from "./video-streaming-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { VIDEO_STREAMING_ARCH_CONFIG } from "./architecture-scenarios";
import styles from "./VideoStreamingLab.module.css";
import { StepBar } from "../_shared/StepBar";

// ── Public API ──────────────────────────────────────────────────────

export function VideoStreamingLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;
  const noMotion = usePrefersReducedMotion();

  return (
    <VideoStreamingProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} labels={STEP_LABELS} />
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
    </VideoStreamingProvider>
  );
}

const STEP_LABELS = [
  "Scp", "API", "Arc",
  "Man", "Buf", "BW", "ABR",
  "Ftc", "Swt", "Udr",
  "Str", "Sek", "Liv",
  "Prd", "Int",
];

// ═══════════════════════════════════════════════════════════════════
// Planning views (steps 1-3)
// ═══════════════════════════════════════════════════════════════════

function PlanningView({ activeStep }: { activeStep: number }) {
  if (activeStep === 1) return <RequirementsView />;
  if (activeStep === 2) return <ApiDesignView />;
  return <ComponentTreeView />;
}

const VS_SCOPE_COMPLEXITY: Record<string, { loc: number; components: number }> = {
  "abr-algorithm": { loc: 120, components: 2 },
  "buffer-management": { loc: 100, components: 2 },
  "quality-levels": { loc: 60, components: 1 },
  "bandwidth-detection": { loc: 80, components: 1 },
  "segment-prefetching": { loc: 70, components: 1 },
};

function RequirementsView() {
  const { scopeEnabled, toggleScope } = useVideoStreaming();
  const summary = useMemo(() => {
    if (scopeEnabled.size === 0) return "Toggle items to define scope";
    return SCOPE_ITEMS.filter(s => scopeEnabled.has(s.id))
      .map(s => s.label)
      .join(" + ");
  }, [scopeEnabled]);
  const complexity = useMemo(() => {
    let loc = 180;
    let components = 3;
    scopeEnabled.forEach(id => {
      const c = VS_SCOPE_COMPLEXITY[id];
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

const VS_API_TABS = ["endpoints", "types"] as const;

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = VS_API_TABS.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = VS_API_TABS[(idx + (e.key === "ArrowRight" ? 1 : VS_API_TABS.length - 1)) % VS_API_TABS.length];
      setTab(next);
    }
  }, [tab]);

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs} role="tablist" aria-label="API design views" onKeyDown={handleTabKeyDown}>
        <button type="button" role="tab" id="vs-tab-endpoints" aria-selected={tab === "endpoints"} aria-controls="vs-panel-endpoints" tabIndex={tab === "endpoints" ? 0 : -1} className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>Endpoints</button>
        <button type="button" role="tab" id="vs-tab-types" aria-selected={tab === "types"} aria-controls="vs-panel-types" tabIndex={tab === "types" ? 0 : -1} className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>Types</button>
      </div>
      <div role="tabpanel" id={`vs-panel-${tab}`} aria-labelledby={`vs-tab-${tab}`}>
        {tab === "endpoints" ? <EndpointCards /> : <TypeCards category="api" />}
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
              aria-controls={`vs-ep-${key}`}
            >
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </button>
            <AnimatePresence>
              {isOpen && (
                noMotion ? (
                  <div className={styles.endpointDetail} id={`vs-ep-${key}`} role="region" aria-label={`${ep.method} ${ep.path} details`}>
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
                    id={`vs-ep-${key}`}
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
      <ArchitectureScenarioPlayer config={VIDEO_STREAMING_ARCH_CONFIG} />
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
  const { activeStep, stateEntries } = useVideoStreaming();
  const noMotion = usePrefersReducedMotion();

  return (
    <div className={styles.buildingPanel}>
      <StreamMetricsBar />

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

      <StateInspector entries={stateEntries} title="Stream State" />
    </div>
  );
}

function StreamMetricsBar() {
  const { currentQuality, bufferLevel, bandwidth, droppedFrames, bufferUnderruns, totalSegments } = useVideoStreaming();
  return (
    <div className={styles.metricsBar} role="status" aria-live="polite" aria-label="Stream performance metrics">
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Quality</div>
        <div className={styles.metricValue}>{currentQuality}</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Buffer</div>
        <div className={styles.metricValue} data-status={bufferLevel <= 1 ? "bad" : bufferLevel >= 5 ? "good" : "neutral"}>{bufferLevel.toFixed(1)}s</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>BW</div>
        <div className={styles.metricValue}>{bandwidth >= 1000 ? `${(bandwidth / 1000).toFixed(1)}M` : `${bandwidth}k`}</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Seg</div>
        <div className={styles.metricValue}>{totalSegments}</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Drop</div>
        <div className={styles.metricValue} data-status={droppedFrames > 0 ? "bad" : "good"}>{droppedFrames}</div>
      </div>
      <div className={styles.metricCard}>
        <div className={styles.metricLabel}>Stall</div>
        <div className={styles.metricValue} data-status={bufferUnderruns > 0 ? "bad" : "good"}>{bufferUnderruns}</div>
      </div>
    </div>
  );
}

// ── Step widget router ─────────────────────────────────────────────

function StepWidget() {
  const { activeStep } = useVideoStreaming();

  switch (activeStep) {
    case 4: return <ManifestParserWidget />;
    case 5: return <BufferManagerWidget />;
    case 6: return <BandwidthEstimatorWidget />;
    case 7: return <ABRAlgorithmWidget />;
    case 8: return <SegmentFetcherWidget />;
    case 9: return <QualitySwitchingWidget />;
    case 10: return <BufferUnderrunWidget />;
    case 11: return <StartupOptimizationWidget />;
    case 12: return <SeekHandlerWidget />;
    case 13: return <LiveStreamingWidget />;
    case 14: return <BandwidthPredictionWidget />;
    case 15: return <PlayerIntegrationWidget />;
    default: return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 4 — ManifestParserWidget
// ═══════════════════════════════════════════════════════════════════

function ManifestParserWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useVideoStreaming();
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [matches, setMatches] = useState<Map<string, string>>(new Map());
  const [dragQuality, setDragQuality] = useState<string | null>(null);

  const bandwidthRanges = useMemo(() => [
    { label: "Mobile 3G", bw: 400, id: "3g" },
    { label: "WiFi", bw: 3000, id: "wifi" },
    { label: "Fiber", bw: 20000, id: "fiber" },
  ], []);

  const correctMatches: Record<string, string> = useMemo(() => ({
    "3g": "144p",
    wifi: "720p",
    fiber: "4K",
  }), []);

  const toggleLevel = useCallback((label: string) => {
    setExpandedLevels(s => {
      const n = new Set(s);
      if (n.has(label)) { n.delete(label); } else { n.add(label); }
      return n;
    });
  }, []);

  const correctCount = useMemo(() => {
    let count = 0;
    matches.forEach((quality, rangeId) => {
      if (correctMatches[rangeId] === quality) count++;
    });
    return count;
  }, [matches, correctMatches]);

  useEffect(() => {
    if (correctCount >= 3) markStepComplete(4);
  }, [correctCount, markStepComplete]);

  return (
    <div className={styles.widgetPanel} data-category="playback">
      <div className={styles.widgetTitle}>Manifest Parser</div>
      <div className={styles.widgetSubtitle}>Expand quality levels, then match each to a bandwidth range</div>

      <div className={styles.manifestJson}>
        <div className={styles.jsonLine}>{"{"}</div>
        <div className={styles.jsonLine}>&nbsp;&nbsp;{'"videoId": "demo_01",'}</div>
        <div className={styles.jsonLine}>&nbsp;&nbsp;{'"segmentDuration": 4,'}</div>
        <div className={styles.jsonLine}>&nbsp;&nbsp;{'"qualities": ['}</div>
        {QUALITY_LEVELS.map(ql => {
          const isOpen = expandedLevels.has(ql.label);
          return (
            <div key={ql.label}>
              <button
                type="button"
                className={styles.jsonExpandBtn}
                onClick={() => toggleLevel(ql.label)}
                aria-expanded={isOpen}
                aria-label={`${ql.label} quality level details`}
              >
                &nbsp;&nbsp;&nbsp;&nbsp;{isOpen ? "▾" : "▸"} {`{ label: "${ql.label}", ... }`}
              </button>
              <AnimatePresence>
                {isOpen && (
                  noMotion ? (
                    <div className={styles.jsonExpanded}>
                      <div className={styles.jsonLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{`label: "${ql.label}",`}</div>
                      <div className={styles.jsonLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{`bitrate: ${ql.bitrate} kbps,`}</div>
                      <div className={styles.jsonLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{`resolution: "${ql.resolution}"`}</div>
                    </div>
                  ) : (
                    <motion.div
                      className={styles.jsonExpanded}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={TRANSITION.collapse}
                    >
                      <div className={styles.jsonLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{`label: "${ql.label}",`}</div>
                      <div className={styles.jsonLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{`bitrate: ${ql.bitrate} kbps,`}</div>
                      <div className={styles.jsonLine}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{`resolution: "${ql.resolution}"`}</div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <div className={styles.jsonLine}>&nbsp;&nbsp;{']'}</div>
        <div className={styles.jsonLine}>{"}"}</div>
      </div>

      <div className={styles.matchingArea}>
        <div className={styles.widgetSubtitle}>Match quality to bandwidth</div>
        <div className={styles.qualityPicker} role="radiogroup" aria-label="Select quality to assign">
          {QUALITY_LEVELS.map(ql => (
            <button
              key={ql.label}
              type="button"
              className={styles.qualityBadge}
              role="radio"
              aria-checked={dragQuality === ql.label}
              data-selected={dragQuality === ql.label ? "true" : undefined}
              onClick={() => setDragQuality(dragQuality === ql.label ? null : ql.label)}
            >
              {ql.label} ({ql.bitrate}k)
            </button>
          ))}
        </div>
        <div className={styles.bandwidthSlots}>
          {bandwidthRanges.map(br => {
            const assigned = matches.get(br.id);
            const isCorrect = assigned ? correctMatches[br.id] === assigned : undefined;
            return (
              <button
                key={br.id}
                type="button"
                className={styles.bandwidthSlot}
                data-filled={assigned ? "true" : undefined}
                data-correct={isCorrect === true ? "true" : isCorrect === false ? "false" : undefined}
                aria-label={`${br.label} (${br.bw} kbps)${assigned ? `, assigned: ${assigned}` : ", click to assign selected quality"}`}
                onClick={() => {
                  if (dragQuality) {
                    setMatches(prev => {
                      const n = new Map(prev);
                      n.set(br.id, dragQuality);
                      return n;
                    });
                  }
                }}
              >
                <span className={styles.slotLabel}>{br.label}</span>
                <span className={styles.slotBw}>{br.bw} kbps</span>
                {assigned && (
                  <span className={styles.slotAssigned} data-correct={isCorrect === true ? "true" : isCorrect === false ? "false" : undefined}>
                    {assigned} {isCorrect === true ? "✓" : isCorrect === false ? "✗" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {correctCount >= 3 && (
          <div className={styles.widgetNote}>All matched correctly. The ABR algorithm automates this exact decision in real-time.</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 5 — BufferManagerWidget (HERO)
// ═══════════════════════════════════════════════════════════════════

function BufferManagerWidget() {
  const noMotion = usePrefersReducedMotion();
  const { setBufferLevel, markStepComplete, incrementSegments, incrementUnderruns } = useVideoStreaming();

  const [segments, setSegments] = useState<Array<{ id: string; quality: string }>>([]);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [loadCount, setLoadCount] = useState(0);
  const [underrun, setUnderrun] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const completedRef = useRef(false);

  const bufferHealth = segments.length >= 5 ? "green" : segments.length >= 2 ? "yellow" : "red";

  useEffect(() => {
    setBufferLevel(segments.length);
  }, [segments.length, setBufferLevel]);

  useEffect(() => {
    if (!playing) {
      clearInterval(playRef.current);
      return;
    }
    playRef.current = setInterval(() => {
      setSegments(prev => {
        if (prev.length === 0) {
          setUnderrun(true);
          setPlaying(false);
          incrementUnderruns();
          return prev;
        }
        return prev.slice(1);
      });
      setPlayTime(t => t + 1);
    }, 1000);
    return () => clearInterval(playRef.current);
  }, [playing, incrementUnderruns]);

  useEffect(() => {
    if (loadCount >= 5 && playTime >= 5 && !completedRef.current) {
      completedRef.current = true;
      markStepComplete(5);
    }
  }, [loadCount, playTime, markStepComplete]);

  const addSegment = useCallback(() => {
    const qualities = ["360p", "720p", "1080p"];
    const q = qualities[Math.floor(Math.random() * qualities.length)];
    setSegments(prev => [...prev, { id: `seg-${Date.now()}-${Math.random()}`, quality: q }]);
    setLoadCount(c => c + 1);
    incrementSegments();
    setUnderrun(false);
  }, [incrementSegments]);

  const qualityColor = (q: string) => {
    switch (q) {
      case "144p": return "var(--diagram-layer-0)";
      case "360p": return "var(--diagram-layer-1)";
      case "720p": return "var(--diagram-layer-3)";
      case "1080p": return "var(--diagram-layer-5)";
      case "4K": return "var(--diagram-layer-9)";
      default: return "var(--diagram-layer-2)";
    }
  };

  return (
    <div className={styles.widgetPanel} data-category="buffer">
      <div className={styles.widgetTitle}>Buffer Manager</div>
      <div className={styles.widgetSubtitle}>Keep the buffer above 0 while playing. Load segments, then hit Play.</div>

      <div className={styles.bufferBarContainer}>
        <div className={styles.bufferHealthLabel} data-health={bufferHealth}>
          {bufferHealth === "green" ? "Healthy" : bufferHealth === "yellow" ? "Low" : "Critical"}
        </div>
        <div className={styles.bufferBar} role="progressbar" aria-valuenow={segments.length} aria-valuemin={0} aria-valuemax={10} aria-label="Buffer level">
          <AnimatePresence>
            {segments.map((seg, i) => (
              noMotion ? (
                <div
                  key={seg.id}
                  className={styles.bufferSegment}
                  style={{ background: qualityColor(seg.quality), width: `${100 / 10}%` }}
                  title={seg.quality}
                />
              ) : (
                <motion.div
                  key={seg.id}
                  className={styles.bufferSegment}
                  style={{ background: qualityColor(seg.quality), width: `${100 / 10}%` }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  exit={{ scaleX: 0, opacity: 0 }}
                  transition={SPRING.snappy}
                  title={seg.quality}
                  layout
                />
              )
            ))}
          </AnimatePresence>
        </div>
        <div className={styles.bufferLevel}>{segments.length}s / 10s</div>
      </div>

      {underrun && (
        <div className={styles.underrunAlert} role="alert">
          Buffer underrun! Playback stalled. Load more segments before playing.
        </div>
      )}

      <div className={styles.bufferControls}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={addSegment}
          disabled={segments.length >= 10}
          aria-label="Load a segment into buffer"
        >
          Load Segment
        </button>
        <button
          type="button"
          className={styles.actionButton}
          data-variant="primary"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause playback" : "Start playback"}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div className={styles.bufferStats}>
        <span>Loaded: {loadCount}</span>
        <span>Played: {playTime}s</span>
        <span>Buffer: {segments.length}s</span>
      </div>

      {completedRef.current && (
        <div className={styles.widgetNote}>Buffer management complete. In production, ABR automates loading decisions.</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 6 — BandwidthEstimatorWidget
// ═══════════════════════════════════════════════════════════════════

function BandwidthEstimatorWidget() {
  const noMotion = usePrefersReducedMotion();
  const { setBandwidth, markStepComplete } = useVideoStreaming();

  const [samples, setSamples] = useState<number[]>([]);
  const [mode, setMode] = useState<"simple" | "ewma">("simple");
  const [ewmaWeight, setEwmaWeight] = useState(0.5);
  const [triedBoth, setTriedBoth] = useState({ simple: false, ewma: false });
  const [adjustedWeight, setAdjustedWeight] = useState(false);

  const simpleAvg = useMemo(() => {
    if (samples.length === 0) return 0;
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  }, [samples]);

  const ewmaValue = useMemo(() => {
    if (samples.length === 0) return 0;
    let ewma = samples[0];
    for (let i = 1; i < samples.length; i++) {
      ewma = ewmaWeight * samples[i] + (1 - ewmaWeight) * ewma;
    }
    return Math.round(ewma);
  }, [samples, ewmaWeight]);

  const currentEstimate = mode === "simple" ? simpleAvg : ewmaValue;

  useEffect(() => {
    if (currentEstimate > 0) setBandwidth(currentEstimate);
  }, [currentEstimate, setBandwidth]);

  useEffect(() => {
    if (triedBoth.simple && triedBoth.ewma && adjustedWeight) {
      markStepComplete(6);
    }
  }, [triedBoth, adjustedWeight, markStepComplete]);

  const addSample = useCallback(() => {
    const base = 2000 + Math.random() * 3000;
    const spike = Math.random() > 0.7 ? (Math.random() > 0.5 ? 8000 : 300) : 0;
    const value = Math.round(spike || base);
    setSamples(prev => [...prev.slice(-19), value]);
  }, []);

  const handleModeChange = useCallback((m: "simple" | "ewma") => {
    setMode(m);
    setTriedBoth(prev => ({ ...prev, [m]: true }));
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="network">
      <div className={styles.widgetTitle}>Bandwidth Estimator</div>
      <div className={styles.widgetSubtitle}>Simulate downloads and compare estimation algorithms</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Estimation algorithm">
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={mode === "simple"}
          data-active={mode === "simple" ? "true" : undefined}
          onClick={() => handleModeChange("simple")}
        >
          Simple Average
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={mode === "ewma"}
          data-active={mode === "ewma" ? "true" : undefined}
          onClick={() => handleModeChange("ewma")}
        >
          EWMA
        </button>
      </div>

      {mode === "ewma" && (
        <div className={styles.sliderRow}>
          <label className={styles.sliderLabel} htmlFor="ewma-weight">
            EWMA weight: {ewmaWeight.toFixed(1)}
          </label>
          <input
            id="ewma-weight"
            type="range"
            min={0.1}
            max={0.9}
            step={0.1}
            value={ewmaWeight}
            onChange={e => { setEwmaWeight(Number(e.target.value)); setAdjustedWeight(true); }}
            className={styles.rangeInput}
            aria-label="EWMA weight"
            aria-valuetext={`Weight ${ewmaWeight.toFixed(1)}: ${ewmaWeight > 0.5 ? "favors recent" : "favors history"}`}
          />
          <span className={styles.sliderHint}>{ewmaWeight > 0.5 ? "Favors recent" : "Favors history"}</span>
        </div>
      )}

      <button
        type="button"
        className={styles.actionButton}
        onClick={addSample}
        aria-label="Simulate a download sample"
      >
        Simulate Download
      </button>

      <div className={styles.bandwidthGraph} aria-label="Bandwidth samples graph">
        {samples.length === 0 ? (
          <div className={styles.graphEmpty}>Click &quot;Simulate Download&quot; to add samples</div>
        ) : (
          <div className={styles.graphContainer}>
            {samples.map((s, i) => {
              const height = Math.min(100, (s / 10000) * 100);
              return noMotion ? (
                <div
                  key={i}
                  className={styles.sampleBar}
                  style={{ height: `${height}%` }}
                  title={`${s} kbps`}
                />
              ) : (
                <motion.div
                  key={i}
                  className={styles.sampleBar}
                  style={{ height: `${height}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={SPRING.quick}
                  title={`${s} kbps`}
                />
              );
            })}
          </div>
        )}
        {samples.length > 0 && (
          <div className={styles.estimateLine}>
            <span className={styles.estimateLabel}>
              {mode === "simple" ? "Avg" : "EWMA"}: {currentEstimate} kbps
            </span>
          </div>
        )}
      </div>

      <div className={styles.widgetNote}>
        EWMA (high weight) reacts faster to bandwidth spikes. Simple average is smoother but slower to adapt.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 7 — ABRAlgorithmWidget (CORE)
// ═══════════════════════════════════════════════════════════════════

function ABRAlgorithmWidget() {
  const noMotion = usePrefersReducedMotion();
  const { setAbrMode, markStepComplete } = useVideoStreaming();

  const [bw, setBw] = useState(3000);
  const [buf, setBuf] = useState(5);
  const [triedModes, setTriedModes] = useState<Set<string>>(new Set());
  const [selectedMode, setSelectedMode] = useState<"throughput" | "buffer-based" | "hybrid">("throughput");

  useEffect(() => {
    setAbrMode(selectedMode === "throughput" ? "throughput" : selectedMode === "buffer-based" ? "buffer-based" : "hybrid");
  }, [selectedMode, setAbrMode]);

  useEffect(() => {
    if (triedModes.size >= 3) markStepComplete(7);
  }, [triedModes, markStepComplete]);

  const throughputPick = useMemo(() => {
    for (let i = QUALITY_LEVELS.length - 1; i >= 0; i--) {
      if (QUALITY_LEVELS[i].bitrate <= bw * 0.8) return QUALITY_LEVELS[i].label;
    }
    return QUALITY_LEVELS[0].label;
  }, [bw]);

  const bufferPick = useMemo(() => {
    if (buf < 2) return "144p";
    if (buf < 4) return "360p";
    if (buf < 6) return "720p";
    if (buf < 8) return "1080p";
    return "4K";
  }, [buf]);

  const hybridPick = useMemo(() => {
    const tIdx = QUALITY_LEVELS.findIndex(q => q.label === throughputPick);
    const bIdx = QUALITY_LEVELS.findIndex(q => q.label === bufferPick);
    const pick = Math.min(tIdx, bIdx);
    return QUALITY_LEVELS[pick >= 0 ? pick : 0].label;
  }, [throughputPick, bufferPick]);

  const handleModeSelect = useCallback((m: "throughput" | "buffer-based" | "hybrid") => {
    setSelectedMode(m);
    setTriedModes(prev => {
      const n = new Set(prev);
      n.add(m);
      return n;
    });
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="quality">
      <div className={styles.widgetTitle}>ABR Algorithm</div>
      <div className={styles.widgetSubtitle}>Adjust bandwidth and buffer, compare which quality each algorithm picks</div>

      <div className={styles.sliderRow}>
        <label className={styles.sliderLabel} htmlFor="abr-bw">Bandwidth: {bw} kbps</label>
        <input
          id="abr-bw"
          type="range"
          min={100}
          max={20000}
          step={100}
          value={bw}
          onChange={e => setBw(Number(e.target.value))}
          className={styles.rangeInput}
          aria-label="Simulated bandwidth"
          aria-valuetext={`${bw} kilobits per second`}
        />
      </div>

      <div className={styles.sliderRow}>
        <label className={styles.sliderLabel} htmlFor="abr-buf">Buffer: {buf}s</label>
        <input
          id="abr-buf"
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={buf}
          onChange={e => setBuf(Number(e.target.value))}
          className={styles.rangeInput}
          aria-label="Buffer level in seconds"
          aria-valuetext={`${buf} seconds buffered`}
        />
      </div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="ABR mode">
        {(["throughput", "buffer-based", "hybrid"] as const).map(m => (
          <button
            key={m}
            type="button"
            className={styles.toggleButton}
            role="radio"
            aria-checked={selectedMode === m}
            data-active={selectedMode === m ? "true" : undefined}
            onClick={() => handleModeSelect(m)}
          >
            {m === "throughput" ? "Throughput" : m === "buffer-based" ? "Buffer" : "Hybrid"}
          </button>
        ))}
      </div>

      <div className={styles.abrComparison}>
        {noMotion ? (
          <>
            <ABRResultRow label="Throughput-based" quality={throughputPick} reason={`Picks highest quality under 80% of ${bw} kbps`} active={selectedMode === "throughput"} />
            <ABRResultRow label="Buffer-based" quality={bufferPick} reason={`Maps buffer level (${buf}s) to quality tier`} active={selectedMode === "buffer-based"} />
            <ABRResultRow label="Hybrid" quality={hybridPick} reason="Conservative pick of both — avoids overestimating" active={selectedMode === "hybrid"} />
          </>
        ) : (
          <>
            <motion.div layout transition={SPRING.gentle}><ABRResultRow label="Throughput-based" quality={throughputPick} reason={`Picks highest quality under 80% of ${bw} kbps`} active={selectedMode === "throughput"} /></motion.div>
            <motion.div layout transition={SPRING.gentle}><ABRResultRow label="Buffer-based" quality={bufferPick} reason={`Maps buffer level (${buf}s) to quality tier`} active={selectedMode === "buffer-based"} /></motion.div>
            <motion.div layout transition={SPRING.gentle}><ABRResultRow label="Hybrid" quality={hybridPick} reason="Conservative pick of both — avoids overestimating" active={selectedMode === "hybrid"} /></motion.div>
          </>
        )}
      </div>

      {triedModes.size >= 3 && (
        <div className={styles.widgetNote}>
          All three modes tried. Hybrid is safest in practice — it prevents aggressive upgrades when buffer is low.
        </div>
      )}
    </div>
  );
}

function ABRResultRow({ label, quality, reason, active }: { label: string; quality: string; reason: string; active: boolean }) {
  return (
    <div className={styles.abrResultRow} data-active={active ? "true" : undefined}>
      <div className={styles.abrResultLabel}>{label}</div>
      <div className={styles.abrResultQuality}>{quality}</div>
      <div className={styles.abrResultReason}>{reason}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 8 — SegmentFetcherWidget
// ═══════════════════════════════════════════════════════════════════

function SegmentFetcherWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, incrementSegments } = useVideoStreaming();

  type FetchState = { id: string; quality: string; progress: number; status: "downloading" | "done" | "failed" | "retrying" };
  const [fetches, setFetches] = useState<FetchState[]>([]);
  const [abortOnSwitch, setAbortOnSwitch] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(75);
  const [fetchCount, setFetchCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const completedRef = useRef(false);
  const networkQualityRef = useRef(75);

  useEffect(() => {
    networkQualityRef.current = networkQuality;
  }, [networkQuality]);

  useEffect(() => {
    if (fetchCount >= 3 && failCount >= 1 && !completedRef.current) {
      completedRef.current = true;
      markStepComplete(8);
    }
  }, [fetchCount, failCount, markStepComplete]);

  const startFetch = useCallback(() => {
    const id = `fetch-${Date.now()}`;
    const quality = QUALITY_LEVELS[Math.floor(Math.random() * 3) + 1].label;

    setFetches(prev => [...prev.slice(-4), { id, quality, progress: 0, status: "downloading" }]);

    let progress = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      // Failure probability based on live network quality slider
      const failThreshold = networkQualityRef.current / 100;
      const willFailThisTick = Math.random() > failThreshold;

      progress += (10 + Math.random() * 15) * (networkQualityRef.current / 100 + 0.1);
      if (willFailThisTick && progress > 20 && progress < 80) {
        setFetches(prev => prev.map(f => f.id === id ? { ...f, progress: Math.min(progress, 100), status: "failed" } : f));
        setFailCount(c => c + 1);
        // Auto-retry after delay
        setTimeout(() => {
          setFetches(prev => prev.map(f => f.id === id ? { ...f, status: "retrying", progress: 40 } : f));
          let retryProgress = 40;
          const retryTimer = setInterval(() => {
            retryProgress += (15 + Math.random() * 10) * (networkQualityRef.current / 100 + 0.1);
            if (retryProgress >= 100) {
              setFetches(prev => prev.map(f => f.id === id ? { ...f, progress: 100, status: "done" } : f));
              setFetchCount(c => c + 1);
              incrementSegments();
              clearInterval(retryTimer);
            } else {
              setFetches(prev => prev.map(f => f.id === id ? { ...f, progress: retryProgress } : f));
            }
          }, 200);
        }, 800);
        clearInterval(timerRef.current);
        return;
      }
      if (progress >= 100) {
        setFetches(prev => prev.map(f => f.id === id ? { ...f, progress: 100, status: "done" } : f));
        setFetchCount(c => c + 1);
        incrementSegments();
        clearInterval(timerRef.current);
      } else {
        setFetches(prev => prev.map(f => f.id === id ? { ...f, progress: Math.min(progress, 100) } : f));
      }
    }, 200);
  }, [incrementSegments]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="network">
      <div className={styles.widgetTitle}>Segment Fetcher</div>
      <div className={styles.widgetSubtitle}>Fetch segments and observe retry behavior on failures</div>

      <div className={styles.sliderRow}>
        <label className={styles.sliderLabel} htmlFor="network-quality">
          Network quality: {networkQuality}%{networkQuality === 0 ? " (all fail)" : networkQuality <= 25 ? " (most fail)" : ""}
        </label>
        <input
          id="network-quality"
          type="range"
          min={0}
          max={100}
          step={5}
          value={networkQuality}
          onChange={e => setNetworkQuality(Number(e.target.value))}
          className={styles.rangeInput}
          aria-label="Network quality percentage"
          aria-valuetext={`${networkQuality}% network quality`}
        />
        <span className={styles.sliderHint}>Drag during fetching to affect failure rate in real-time</span>
      </div>

      <div className={styles.fetchControls}>
        <button type="button" className={styles.actionButton} onClick={startFetch} aria-label="Fetch a segment">
          Fetch Segment
        </button>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={abortOnSwitch}
            onChange={e => setAbortOnSwitch(e.target.checked)}
            aria-label="Abort on quality switch"
          />
          Abort on quality switch
        </label>
      </div>

      <div className={styles.fetchList} role="list" aria-label="Segment fetch history">
        <AnimatePresence>
          {fetches.map((f, i) => (
            noMotion ? (
              <div key={f.id} className={styles.fetchRow} role="listitem" data-status={f.status}>
                <span className={styles.fetchQuality}>{f.quality}</span>
                <div className={styles.fetchProgressBar}>
                  <div className={styles.fetchProgressFill} style={{ width: `${Math.min(f.progress, 100)}%` }} data-status={f.status} />
                </div>
                <span className={styles.fetchStatus} data-status={f.status}>
                  {f.status === "downloading" ? `${Math.round(f.progress)}%` : f.status === "done" ? "Done" : f.status === "failed" ? "Failed" : "Retrying..."}
                </span>
              </div>
            ) : (
              <motion.div
                key={f.id}
                className={styles.fetchRow}
                role="listitem"
                data-status={f.status}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ ...SPRING.snappy, delay: i * STAGGER.fast }}
              >
                <span className={styles.fetchQuality}>{f.quality}</span>
                <div className={styles.fetchProgressBar}>
                  <div className={styles.fetchProgressFill} style={{ width: `${Math.min(f.progress, 100)}%` }} data-status={f.status} />
                </div>
                <span className={styles.fetchStatus} data-status={f.status}>
                  {f.status === "downloading" ? `${Math.round(f.progress)}%` : f.status === "done" ? "Done" : f.status === "failed" ? "Failed" : "Retrying..."}
                </span>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>

      {abortOnSwitch && (
        <div className={styles.widgetNote}>With abort-on-switch enabled, quality changes cancel pending downloads to avoid wasted bandwidth.</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 9 — QualitySwitchingWidget
// ═══════════════════════════════════════════════════════════════════

function QualitySwitchingWidget() {
  const noMotion = usePrefersReducedMotion();
  const { setCurrentQuality, markStepComplete } = useVideoStreaming();

  const [quality, setQuality] = useState(2);
  const [switchCount, setSwitchCount] = useState(0);
  const [history, setHistory] = useState<string[]>(["720p"]);
  const [showPrediction, setShowPrediction] = useState(false);
  const [predicted, setPredicted] = useState<number | null>(null);

  useEffect(() => {
    if (switchCount >= 3) markStepComplete(9);
  }, [switchCount, markStepComplete]);

  const handleSwitch = useCallback((newIdx: number) => {
    const label = QUALITY_LEVELS[newIdx].label;
    setQuality(newIdx);
    setCurrentQuality(label);
    setSwitchCount(c => c + 1);
    setHistory(prev => [...prev.slice(-9), label]);
  }, [setCurrentQuality]);

  return (
    <div className={styles.widgetPanel} data-category="quality">
      <div className={styles.widgetTitle}>Quality Switching</div>
      <div className={styles.widgetSubtitle}>Drag the slider to switch quality and observe buffer impact</div>

      {!showPrediction && switchCount === 0 && (
        <PredictionChallenge
          question="What happens to the buffer when switching from 1080p to 360p mid-stream?"
          options={[
            "Buffer drains faster since quality dropped",
            "Buffer refills faster — smaller segments download quickly",
            "No change — buffer is independent of quality",
          ]}
          correctIndex={1}
          explanation="Lower quality means smaller segments, so they download faster relative to playback speed. Buffer refills more quickly after a downgrade."
          onComplete={() => setShowPrediction(true)}
        />
      )}

      {(showPrediction || switchCount > 0) && (
        <>
          <div className={styles.qualitySlider}>
            <label className={styles.sliderLabel} htmlFor="quality-switch">
              Current: {QUALITY_LEVELS[quality].label} ({QUALITY_LEVELS[quality].bitrate} kbps)
            </label>
            <input
              id="quality-switch"
              type="range"
              min={0}
              max={4}
              step={1}
              value={quality}
              onChange={e => handleSwitch(Number(e.target.value))}
              className={styles.rangeInput}
              aria-label="Quality level"
              aria-valuetext={QUALITY_LEVELS[quality].label}
            />
            <div className={styles.qualityLabels}>
              {QUALITY_LEVELS.map((q, i) => (
                <span key={q.label} data-active={i === quality ? "true" : undefined}>{q.label}</span>
              ))}
            </div>
          </div>

          <div className={styles.qualityHistory} role="list" aria-label="Quality switch history">
            {history.map((q, i) => (
              noMotion ? (
                <span key={i} className={styles.historyChip} role="listitem">{q}</span>
              ) : (
                <motion.span
                  key={i}
                  className={styles.historyChip}
                  role="listitem"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...SPRING.snappy, delay: i * STAGGER.fast }}
                >
                  {q}
                </motion.span>
              )
            ))}
          </div>

          <div className={styles.widgetNote}>
            Switches: {switchCount}. Mixed-quality segments are visible in the buffer bar above.
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 10 — BufferUnderrunWidget
// ═══════════════════════════════════════════════════════════════════

function BufferUnderrunWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, incrementUnderruns } = useVideoStreaming();

  const [protectionOn, setProtectionOn] = useState(false);
  const [buffer, setBuffer] = useState(6);
  const [networkDrop, setNetworkDrop] = useState(false);
  const [stallEvent, setStallEvent] = useState(false);
  const [qualityDropped, setQualityDropped] = useState(false);
  const [events, setEvents] = useState<Array<{ time: number; label: string; type: string }>>([]);
  const [triedBoth, setTriedBoth] = useState({ on: false, off: false });
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (triedBoth.on && triedBoth.off) markStepComplete(10);
  }, [triedBoth, markStepComplete]);

  const triggerDrop = useCallback(() => {
    setNetworkDrop(true);
    setStallEvent(false);
    setQualityDropped(false);
    setBuffer(6);
    setEvents([{ time: 0, label: "Network drops to 100 kbps", type: "warning" }]);

    const protection = protectionOn;
    setTriedBoth(prev => ({ ...prev, [protection ? "on" : "off"]: true }));

    let buf = 6;
    let tick = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      tick++;
      buf -= 1;

      if (buf <= 1 && protection && !qualityDropped) {
        setQualityDropped(true);
        setEvents(prev => [...prev, { time: tick, label: "Emergency quality drop: 720p -> 144p", type: "recovery" }]);
        buf = buf + 2; // Recovery from lower quality
      }

      if (buf <= 0) {
        buf = 0;
        if (!protection) {
          setStallEvent(true);
          incrementUnderruns();
          setEvents(prev => [...prev, { time: tick, label: "Buffer underrun! Playback stalled.", type: "error" }]);
          clearInterval(timerRef.current);
          // Simulate recovery after stall
          setTimeout(() => {
            setBuffer(2);
            setEvents(prev => [...prev, { time: tick + 2, label: "Rebuffering... resumed at 144p", type: "recovery" }]);
          }, 2000);
          setBuffer(0);
          return;
        }
      }

      setBuffer(Math.max(0, buf));
      if (tick >= 8) {
        clearInterval(timerRef.current);
        setNetworkDrop(false);
        setEvents(prev => [...prev, { time: tick, label: "Network recovered", type: "info" }]);
      }
    }, 600);
  }, [protectionOn, qualityDropped, incrementUnderruns]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="buffer">
      <div className={styles.widgetTitle}>Buffer Underrun Protection</div>
      <div className={styles.widgetSubtitle}>Toggle protection, then trigger a network drop to see the difference</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Underrun protection">
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={!protectionOn}
          data-active={!protectionOn ? "true" : undefined}
          onClick={() => setProtectionOn(false)}
        >
          Protection OFF
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          role="radio"
          aria-checked={protectionOn}
          data-active={protectionOn ? "true" : undefined}
          onClick={() => setProtectionOn(true)}
        >
          Protection ON
        </button>
      </div>

      <button
        type="button"
        className={styles.actionButton}
        data-variant="danger"
        onClick={triggerDrop}
        disabled={networkDrop}
        aria-label="Trigger network drop"
      >
        Network Drop
      </button>

      <div className={styles.bufferBarContainer}>
        <div className={styles.bufferBar} role="progressbar" aria-valuenow={buffer} aria-valuemin={0} aria-valuemax={10} aria-label="Buffer during underrun test">
          {noMotion ? (
            <div className={styles.bufferFill} style={{ width: `${(buffer / 10) * 100}%` }} data-health={buffer > 3 ? "green" : buffer > 1 ? "yellow" : "red"} />
          ) : (
            <motion.div
              className={styles.bufferFill}
              style={{ width: `${(buffer / 10) * 100}%` }}
              data-health={buffer > 3 ? "green" : buffer > 1 ? "yellow" : "red"}
              animate={{ width: `${(buffer / 10) * 100}%` }}
              transition={SPRING.quick}
            />
          )}
        </div>
        <div className={styles.bufferLevel}>{buffer.toFixed(0)}s / 10s</div>
      </div>

      {stallEvent && (
        <div className={styles.underrunAlert} role="alert">
          Playback stalled! Without protection, the player shows a spinner until buffer refills.
        </div>
      )}

      {qualityDropped && (
        <div className={styles.recoveryAlert} role="status">
          Emergency quality drop saved playback. Quality will ramp back up when bandwidth recovers.
        </div>
      )}

      <div className={styles.eventTimeline} role="list" aria-label="Event timeline">
        <AnimatePresence>
          {events.map((ev, i) => (
            noMotion ? (
              <div key={i} className={styles.timelineEvent} role="listitem" data-type={ev.type}>
                <span className={styles.timelineTime}>{ev.time}s</span>
                <span>{ev.label}</span>
              </div>
            ) : (
              <motion.div
                key={i}
                className={styles.timelineEvent}
                role="listitem"
                data-type={ev.type}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING.quick}
              >
                <span className={styles.timelineTime}>{ev.time}s</span>
                <span>{ev.label}</span>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 11 — StartupOptimizationWidget
// ═══════════════════════════════════════════════════════════════════

function StartupOptimizationWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useVideoStreaming();

  const [strategy, setStrategy] = useState<"highest" | "fast-start">("fast-start");
  const [initialBw, setInitialBw] = useState(2000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ highest: 0, fast: 0 });
  const [firstFrame, setFirstFrame] = useState({ highest: 0, fast: 0 });
  const [triedBwSettings, setTriedBwSettings] = useState<Set<number>>(new Set());
  const [triedBoth, setTriedBoth] = useState({ highest: false, "fast-start": false });
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (triedBoth.highest && triedBoth["fast-start"] && triedBwSettings.size >= 2) markStepComplete(11);
  }, [triedBoth, triedBwSettings, markStepComplete]);

  const runSimulation = useCallback(() => {
    setRunning(true);
    setProgress({ highest: 0, fast: 0 });
    setFirstFrame({ highest: 0, fast: 0 });
    setTriedBoth(prev => ({ ...prev, [strategy]: true }));
    // Bucket bandwidth into ranges for counting distinct settings
    const bwBucket = initialBw <= 1000 ? 500 : initialBw <= 3000 ? 2000 : initialBw <= 8000 ? 5000 : 15000;
    setTriedBwSettings(prev => { const n = new Set(prev); n.add(bwBucket); return n; });

    // Scale timing based on bandwidth — lower bw = slower first frame for "highest"
    const bwFactor = Math.max(0.2, initialBw / 10000); // 0.2 at 2000, 1.0 at 10000
    const highFirstFrameTick = Math.max(2, Math.round(5 / bwFactor)); // low bw => very late
    const fastFirstFrameTick = 1; // always fast for 144p

    let tick = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      tick++;
      if (tick === fastFirstFrameTick) {
        setFirstFrame(prev => ({ ...prev, fast: tick }));
      }
      if (tick === highFirstFrameTick) {
        setFirstFrame(prev => ({ ...prev, highest: tick }));
      }

      setProgress(prev => ({
        highest: Math.min(100, prev.highest + (tick < highFirstFrameTick ? 3 * bwFactor : 18 * bwFactor)),
        fast: Math.min(100, prev.fast + (tick <= 1 ? 25 : 12 + 5 * bwFactor)),
      }));

      if (tick >= Math.max(8, highFirstFrameTick + 4)) {
        clearInterval(timerRef.current);
        setRunning(false);
        setProgress({ highest: 100, fast: 100 });
      }
    }, 400);
  }, [strategy, initialBw]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="playback">
      <div className={styles.widgetTitle}>Startup Optimization</div>
      <div className={styles.widgetSubtitle}>Set initial bandwidth, pick a strategy, then run. Try 2+ bandwidth settings to complete.</div>

      <div className={styles.sliderRow}>
        <label className={styles.sliderLabel} htmlFor="startup-bw">
          Initial bandwidth: {initialBw >= 1000 ? `${(initialBw / 1000).toFixed(1)} Mbps` : `${initialBw} kbps`}
        </label>
        <input
          id="startup-bw"
          type="range"
          min={500}
          max={20000}
          step={500}
          value={initialBw}
          onChange={e => setInitialBw(Number(e.target.value))}
          className={styles.rangeInput}
          disabled={running}
          aria-label="Initial bandwidth for startup simulation"
          aria-valuetext={`${initialBw >= 1000 ? `${(initialBw / 1000).toFixed(1)} megabits` : `${initialBw} kilobits`} per second`}
        />
        <span className={styles.sliderHint}>
          {initialBw <= 1000 ? "Slow — fast-start wins big" : initialBw >= 8000 ? "Fast — little difference" : "Medium — moderate advantage for fast-start"}
        </span>
      </div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Startup strategy">
        <button type="button" className={styles.toggleButton} role="radio" aria-checked={strategy === "highest"} data-active={strategy === "highest" ? "true" : undefined} onClick={() => setStrategy("highest")}>
          Start at Highest
        </button>
        <button type="button" className={styles.toggleButton} role="radio" aria-checked={strategy === "fast-start"} data-active={strategy === "fast-start" ? "true" : undefined} onClick={() => setStrategy("fast-start")}>
          Fast Start + Ramp
        </button>
      </div>

      <button type="button" className={styles.actionButton} onClick={runSimulation} disabled={running} aria-label="Run startup simulation">
        {running ? "Running..." : "Run Simulation"}
      </button>

      <div className={styles.strategyComparison}>
        <div className={styles.strategyOption}>
          <div className={styles.strategyLabel}>Start at Highest (4K)</div>
          <div className={styles.strategyBar}>
            {noMotion ? (
              <div className={styles.strategyFill} style={{ width: `${progress.highest}%` }} />
            ) : (
              <motion.div className={styles.strategyFill} animate={{ width: `${progress.highest}%` }} transition={SPRING.quick} />
            )}
          </div>
          <div className={styles.strategyMetric}>
            First frame: {firstFrame.highest > 0 ? `${(firstFrame.highest * 0.4).toFixed(1)}s` : "..."}
          </div>
        </div>

        <div className={styles.strategyOption}>
          <div className={styles.strategyLabel}>Fast Start (144p + ramp)</div>
          <div className={styles.strategyBar}>
            {noMotion ? (
              <div className={styles.strategyFill} data-fast="true" style={{ width: `${progress.fast}%` }} />
            ) : (
              <motion.div className={styles.strategyFill} data-fast="true" animate={{ width: `${progress.fast}%` }} transition={SPRING.quick} />
            )}
          </div>
          <div className={styles.strategyMetric}>
            First frame: {firstFrame.fast > 0 ? `${(firstFrame.fast * 0.4).toFixed(1)}s` : "..."}
          </div>
        </div>
      </div>

      {!running && firstFrame.fast > 0 && (
        <div className={styles.widgetNote}>
          Fast start shows first frame {((firstFrame.highest - firstFrame.fast) * 0.4).toFixed(1)}s earlier.
          {initialBw <= 1000 ? " At low bandwidth, the difference is dramatic." : initialBw >= 8000 ? " At high bandwidth, both are fast." : " Quality ramps up transparently as bandwidth is measured."}
          {triedBwSettings.size < 2 ? " Try a different bandwidth setting to see how it changes." : ""}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 12 — SeekHandlerWidget
// ═══════════════════════════════════════════════════════════════════

function SeekHandlerWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useVideoStreaming();

  const totalDuration = 120;
  const [playhead, setPlayhead] = useState(20);
  const [seekCount, setSeekCount] = useState(0);
  const [seekPenalty, setSeekPenalty] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [bufferRanges, setBufferRanges] = useState<Array<{ start: number; end: number }>>([{ start: 15, end: 30 }]);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (seekCount >= 3) markStepComplete(12);
  }, [seekCount, markStepComplete]);

  const handleSeek = useCallback((pos: number) => {
    setIsSeeking(true);
    const penalty = 0.5 + Math.random() * 1.5;
    setSeekPenalty(penalty);
    setPlayhead(pos);
    setSeekCount(c => c + 1);

    // Simulate buffer flush and refill
    setBufferRanges([]);
    clearTimeout(seekTimerRef.current);
    seekTimerRef.current = setTimeout(() => {
      setBufferRanges([{ start: pos, end: Math.min(pos + 10, totalDuration) }]);
      setIsSeeking(false);
    }, penalty * 1000);
  }, [totalDuration]);

  useEffect(() => {
    return () => clearTimeout(seekTimerRef.current);
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="playback">
      <div className={styles.widgetTitle}>Seek Handler</div>
      <div className={styles.widgetSubtitle}>Click on the timeline to seek. Watch the buffer flush and refill.</div>

      <div className={styles.timeline}>
        <div
          className={styles.timelineTrack}
          role="slider"
          aria-label="Video timeline"
          aria-valuenow={playhead}
          aria-valuemin={0}
          aria-valuemax={totalDuration}
          aria-valuetext={`${playhead} seconds`}
          tabIndex={0}
          onClick={(e) => {
            if (isSeeking) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = (e.clientX - rect.left) / rect.width;
            handleSeek(Math.round(frac * totalDuration));
          }}
          onKeyDown={(e) => {
            if (isSeeking) return;
            let next = playhead;
            switch (e.key) {
              case "ArrowRight": next = Math.min(totalDuration, playhead + 5); break;
              case "ArrowLeft": next = Math.max(0, playhead - 5); break;
              case "Home": next = 0; break;
              case "End": next = totalDuration; break;
              default: return;
            }
            e.preventDefault();
            handleSeek(next);
          }}
        >
          {bufferRanges.map((r, i) => (
            <div
              key={i}
              className={styles.timelineBuffer}
              style={{
                left: `${(r.start / totalDuration) * 100}%`,
                width: `${((r.end - r.start) / totalDuration) * 100}%`,
              }}
            />
          ))}
          {noMotion ? (
            <div className={styles.playheadMarker} style={{ left: `${(playhead / totalDuration) * 100}%` }} />
          ) : (
            <motion.div
              className={styles.playheadMarker}
              animate={{ left: `${(playhead / totalDuration) * 100}%` }}
              transition={SPRING.snappy}
            />
          )}
        </div>
        <div className={styles.timelineLabels}>
          <span>0:00</span>
          <span>{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}</span>
        </div>
      </div>

      {isSeeking && (
        <div className={styles.seekingIndicator} role="status">
          Seeking... flushing buffer, fetching segments at new position
        </div>
      )}

      <div className={styles.seekStats}>
        <span>Seeks: {seekCount}</span>
        <span>Playhead: {playhead}s</span>
        {seekPenalty > 0 && <span>Last seek penalty: {seekPenalty.toFixed(1)}s</span>}
      </div>

      {seekCount >= 3 && (
        <div className={styles.widgetNote}>
          Each seek flushes the buffer and fetches new segments. Minimizing seek penalty requires preloading keyframes.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 13 — LiveStreamingWidget
// ═══════════════════════════════════════════════════════════════════

function LiveStreamingWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useVideoStreaming();

  const [latency, setLatency] = useState(10);
  const [segments, setSegments] = useState<Array<{ id: number; live: boolean }>>(() =>
    Array.from({ length: 10 }, (_, i) => ({ id: i, live: i >= 7 }))
  );
  const [adjustedLatency, setAdjustedLatency] = useState(false);
  const [answeredPrediction, setAnsweredPrediction] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (adjustedLatency && answeredPrediction) markStepComplete(13);
  }, [adjustedLatency, answeredPrediction, markStepComplete]);

  // Simulate sliding window
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSegments(prev => {
        const next = [...prev.slice(1), { id: (prev[prev.length - 1]?.id ?? 0) + 1, live: true }];
        // Mark old ones as not live
        return next.map((s, i) => ({ ...s, live: i >= next.length - 3 }));
      });
    }, 2000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="playback">
      <div className={styles.widgetTitle}>Live Streaming</div>
      <div className={styles.widgetSubtitle}>Observe the sliding window and adjust latency</div>

      <PredictionChallenge
        question="What is the key difference between live and VOD buffering?"
        options={[
          "Live streams use larger buffers for stability",
          "Live streams have a sliding window — old segments expire, new ones appear at the live edge",
          "There is no difference — both buffer the same way",
        ]}
        correctIndex={1}
        explanation="VOD has all segments available upfront. Live streams have a limited window — the player chases the live edge. Too far behind = stale content. Too close = underrun risk."
        onComplete={() => setAnsweredPrediction(true)}
      />

      <div className={styles.sliderRow}>
        <label className={styles.sliderLabel} htmlFor="latency-slider">
          Latency: {latency}s
        </label>
        <input
          id="latency-slider"
          type="range"
          min={1}
          max={30}
          step={1}
          value={latency}
          onChange={e => { setLatency(Number(e.target.value)); setAdjustedLatency(true); }}
          className={styles.rangeInput}
          aria-label="Stream latency"
          aria-valuetext={`${latency} seconds latency${latency < 5 ? " — high risk of underrun" : latency > 15 ? " — safe but stale" : ""}`}
        />
        <span className={styles.sliderHint}>
          {latency < 5 ? "Low latency, high risk" : latency > 15 ? "Safe but stale" : "Balanced"}
        </span>
      </div>

      <div className={styles.liveWindow} role="list" aria-label="Live segment window">
        {segments.map((seg) => (
          noMotion ? (
            <div
              key={seg.id}
              className={styles.liveSegment}
              role="listitem"
              data-live={seg.live ? "true" : undefined}
            >
              {seg.id}
            </div>
          ) : (
            <motion.div
              key={seg.id}
              className={styles.liveSegment}
              role="listitem"
              data-live={seg.live ? "true" : undefined}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={SPRING.snappy}
              layout
            >
              {seg.id}
            </motion.div>
          )
        ))}
        <div className={styles.liveEdgeMarker}>LIVE</div>
      </div>

      <div className={styles.widgetNote}>
        Buffer window: ~{Math.min(latency, 10)}s. {latency < 5 ? "Very thin buffer — any network hiccup causes a stall." : ""}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 14 — BandwidthPredictionWidget
// ═══════════════════════════════════════════════════════════════════

function BandwidthPredictionWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete } = useVideoStreaming();

  const [samples, setSamples] = useState<number[]>(() => {
    const arr: number[] = [];
    let val = 3000;
    for (let i = 0; i < 20; i++) {
      val += (Math.random() - 0.45) * 800;
      val = Math.max(500, Math.min(10000, val));
      arr.push(Math.round(val));
    }
    return arr;
  });

  const [method, setMethod] = useState<"last-value" | "moving-avg" | "linear-reg">("last-value");
  const [reveals, setReveals] = useState(0);
  const [triedMethods, setTriedMethods] = useState<Set<string>>(new Set(["last-value"]));

  useEffect(() => {
    if (triedMethods.size >= 2 && reveals >= 3) markStepComplete(14);
  }, [triedMethods, reveals, markStepComplete]);

  const predictions = useMemo(() => {
    const lastVal = samples[samples.length - 1];
    const movAvg = Math.round(samples.slice(-5).reduce((a, b) => a + b, 0) / 5);

    // Simple linear regression on last 5 points
    const recent = samples.slice(-5);
    const n = recent.length;
    const xMean = (n - 1) / 2;
    const yMean = recent.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    recent.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) * (x - xMean); });
    const slope = den !== 0 ? num / den : 0;
    const linReg = Math.round(yMean + slope * n);

    return { "last-value": lastVal, "moving-avg": movAvg, "linear-reg": Math.max(200, linReg) };
  }, [samples]);

  const reveal = useCallback(() => {
    const actual = samples[samples.length - 1] + (Math.random() - 0.4) * 1000;
    const clamped = Math.max(300, Math.round(actual));
    setSamples(prev => [...prev.slice(1), clamped]);
    setReveals(r => r + 1);
  }, [samples]);

  const handleMethodChange = useCallback((m: "last-value" | "moving-avg" | "linear-reg") => {
    setMethod(m);
    setTriedMethods(prev => { const n = new Set(prev); n.add(m); return n; });
  }, []);

  const maxSample = Math.max(...samples, 1);

  return (
    <div className={styles.widgetPanel} data-category="network">
      <div className={styles.widgetTitle}>Bandwidth Prediction</div>
      <div className={styles.widgetSubtitle}>Pick a prediction method, then reveal actual values to see accuracy</div>

      <div className={styles.toggleRow} role="radiogroup" aria-label="Prediction method">
        <button type="button" className={styles.toggleButton} role="radio" aria-checked={method === "last-value"} data-active={method === "last-value" ? "true" : undefined} onClick={() => handleMethodChange("last-value")}>
          Last Value
        </button>
        <button type="button" className={styles.toggleButton} role="radio" aria-checked={method === "moving-avg"} data-active={method === "moving-avg" ? "true" : undefined} onClick={() => handleMethodChange("moving-avg")}>
          Moving Avg
        </button>
        <button type="button" className={styles.toggleButton} role="radio" aria-checked={method === "linear-reg"} data-active={method === "linear-reg" ? "true" : undefined} onClick={() => handleMethodChange("linear-reg")}>
          Linear Reg
        </button>
      </div>

      <div className={styles.predictionGraph} aria-label="Bandwidth history with prediction">
        <div className={styles.graphContainer}>
          {samples.map((s, i) => {
            const height = (s / maxSample) * 100;
            return noMotion ? (
              <div key={i} className={styles.sampleBar} style={{ height: `${height}%` }} title={`${s} kbps`} />
            ) : (
              <motion.div
                key={i}
                className={styles.sampleBar}
                style={{ height: `${height}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={SPRING.quick}
                title={`${s} kbps`}
              />
            );
          })}
          {/* Prediction marker */}
          <div
            className={styles.predictionMarker}
            style={{ height: `${(predictions[method] / maxSample) * 100}%` }}
            title={`Predicted: ${predictions[method]} kbps`}
          />
        </div>
        <div className={styles.predictionLabel}>
          Prediction ({method}): {predictions[method]} kbps
        </div>
      </div>

      <button type="button" className={styles.actionButton} onClick={reveal} aria-label="Reveal next actual bandwidth value">
        Reveal Next Value
      </button>

      <div className={styles.seekStats}>
        <span>Reveals: {reveals}</span>
        <span>Method: {method}</span>
        <span>Predicted: {predictions[method]} kbps</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Step 15 — PlayerIntegrationWidget (CAPSTONE)
// ═══════════════════════════════════════════════════════════════════

type BwPhase = "good" | "drop" | "recover";
const BW_PHASE_VALUES: Record<BwPhase, number> = { good: 5000, drop: 400, recover: 2000 };
const BW_PHASE_LABELS: Array<{ id: BwPhase; label: string; bw: string }> = [
  { id: "good", label: "Good", bw: "5 Mbps" },
  { id: "drop", label: "Drop", bw: "400 kbps" },
  { id: "recover", label: "Recover", bw: "2 Mbps" },
];

function PlayerIntegrationWidget() {
  const noMotion = usePrefersReducedMotion();
  const { markStepComplete, droppedFrames, bufferUnderruns, totalSegments } = useVideoStreaming();

  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [bwPhase, setBwPhase] = useState<BwPhase>("good");
  const [triggeredDrop, setTriggeredDrop] = useState(false);
  const [abrOff, setAbrOff] = useState<{ quality: string; buffer: number; stalls: number; switches: number }>({ quality: "1080p", buffer: 8, stalls: 0, switches: 0 });
  const [abrOn, setAbrOn] = useState<{ quality: string; buffer: number; stalls: number; switches: number }>({ quality: "720p", buffer: 8, stalls: 0, switches: 0 });
  const [bandwidthHistory, setBandwidthHistory] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const completedRef = useRef(false);
  const phaseRef = useRef<BwPhase>("good");
  const offBufRef = useRef(8);
  const onBufRef = useRef(8);
  const offStallsRef = useRef(0);
  const onStallsRef = useRef(0);
  const onSwitchesRef = useRef(0);
  const onQualityRef = useRef("720p");
  const triggeredDropRef = useRef(false);

  useEffect(() => {
    phaseRef.current = bwPhase;
    if (bwPhase === "drop") triggeredDropRef.current = true;
    setTriggeredDrop(triggeredDropRef.current);
  }, [bwPhase]);

  const startPlayback = useCallback(() => {
    setRunning(true);
    setTick(0);
    setBwPhase("good");
    phaseRef.current = "good";
    triggeredDropRef.current = false;
    setTriggeredDrop(false);
    setAbrOff({ quality: "1080p", buffer: 8, stalls: 0, switches: 0 });
    setAbrOn({ quality: "720p", buffer: 8, stalls: 0, switches: 0 });
    setBandwidthHistory([]);
    offBufRef.current = 8;
    onBufRef.current = 8;
    offStallsRef.current = 0;
    onStallsRef.current = 0;
    onSwitchesRef.current = 0;
    onQualityRef.current = "720p";

    let t = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      t++;
      const bw = BW_PHASE_VALUES[phaseRef.current];
      setBandwidthHistory(prev => [...prev, bw]);

      // ABR OFF: fixed at 1080p (5000kbps)
      if (bw < 5000) {
        offBufRef.current -= 1.5;
      } else {
        offBufRef.current = Math.min(10, offBufRef.current + 0.5);
      }
      if (offBufRef.current <= 0) {
        offBufRef.current = 0;
        offStallsRef.current++;
      }

      // ABR ON: adapts quality
      const prevQ = onQualityRef.current;
      if (bw < 1000) {
        onQualityRef.current = "144p";
        onBufRef.current = Math.min(10, onBufRef.current + 0.5);
      } else if (bw < 3000) {
        onQualityRef.current = "360p";
        onBufRef.current = Math.min(10, onBufRef.current + 0.3);
      } else {
        onQualityRef.current = "720p";
        onBufRef.current = Math.min(10, onBufRef.current + 0.2);
      }
      if (prevQ !== onQualityRef.current) onSwitchesRef.current++;

      // Buffer drain from playback
      onBufRef.current = Math.max(0, onBufRef.current - 0.3);
      if (onBufRef.current <= 0) onStallsRef.current++;

      setAbrOff({ quality: "1080p", buffer: Math.max(0, offBufRef.current), stalls: offStallsRef.current, switches: 0 });
      setAbrOn({ quality: onQualityRef.current, buffer: Math.max(0, onBufRef.current), stalls: onStallsRef.current, switches: onSwitchesRef.current });
      setTick(t);

      if (t >= 30) {
        clearInterval(timerRef.current);
        setRunning(false);
        if (!completedRef.current && triggeredDropRef.current) {
          completedRef.current = true;
          markStepComplete(15);
        }
      }
    }, 500);
  }, [markStepComplete]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className={styles.widgetPanel} data-category="playback">
      <div className={styles.widgetTitle}>Full Player Comparison</div>
      <div className={styles.widgetSubtitle}>Start playback, then toggle bandwidth phases to see ABR OFF stall while ABR ON adapts</div>

      <button type="button" className={styles.actionButton} data-variant="primary" onClick={startPlayback} disabled={running} aria-label="Start player comparison">
        {running ? `Playing... ${tick}/30` : "Start Playback"}
      </button>

      <div className={styles.bwPhaseRow} role="radiogroup" aria-label="Bandwidth phase control">
        {BW_PHASE_LABELS.map(p => (
          <button
            key={p.id}
            type="button"
            className={styles.bwPhaseButton}
            role="radio"
            aria-checked={bwPhase === p.id}
            data-active={bwPhase === p.id ? "true" : undefined}
            data-phase={p.id}
            disabled={!running}
            onClick={() => setBwPhase(p.id)}
          >
            <span className={styles.bwPhaseLabel}>{p.label}</span>
            <span className={styles.bwPhaseBw}>{p.bw}</span>
          </button>
        ))}
      </div>

      {running && !triggeredDrop && (
        <div className={styles.widgetNote}>Toggle to &quot;Drop&quot; during playback to see how each player reacts.</div>
      )}

      <div className={styles.comparisonGrid}>
        <div className={styles.comparisonColumn}>
          <div className={styles.comparisonTitle} data-variant="off">ABR OFF</div>
          <div className={styles.comparisonQuality}>{abrOff.quality}</div>
          <div className={styles.comparisonBufferBar}>
            {noMotion ? (
              <div className={styles.comparisonFill} data-health={abrOff.buffer > 3 ? "green" : abrOff.buffer > 0 ? "yellow" : "red"} style={{ width: `${(abrOff.buffer / 10) * 100}%` }} />
            ) : (
              <motion.div className={styles.comparisonFill} data-health={abrOff.buffer > 3 ? "green" : abrOff.buffer > 0 ? "yellow" : "red"} animate={{ width: `${(abrOff.buffer / 10) * 100}%` }} transition={SPRING.quick} />
            )}
          </div>
          <div className={styles.comparisonStats}>
            <span>Buffer: {abrOff.buffer.toFixed(1)}s</span>
            <span data-bad={abrOff.stalls > 0 ? "true" : undefined}>Stalls: {abrOff.stalls}</span>
          </div>
        </div>

        <div className={styles.comparisonColumn}>
          <div className={styles.comparisonTitle} data-variant="on">ABR ON</div>
          <div className={styles.comparisonQuality}>{abrOn.quality}</div>
          <div className={styles.comparisonBufferBar}>
            {noMotion ? (
              <div className={styles.comparisonFill} data-health={abrOn.buffer > 3 ? "green" : abrOn.buffer > 0 ? "yellow" : "red"} style={{ width: `${(abrOn.buffer / 10) * 100}%` }} />
            ) : (
              <motion.div className={styles.comparisonFill} data-health={abrOn.buffer > 3 ? "green" : abrOn.buffer > 0 ? "yellow" : "red"} animate={{ width: `${(abrOn.buffer / 10) * 100}%` }} transition={SPRING.quick} />
            )}
          </div>
          <div className={styles.comparisonStats}>
            <span>Buffer: {abrOn.buffer.toFixed(1)}s</span>
            <span>Switches: {abrOn.switches}</span>
            <span data-bad={abrOn.stalls > 0 ? "true" : undefined}>Stalls: {abrOn.stalls}</span>
          </div>
        </div>
      </div>

      {bandwidthHistory.length > 0 && (
        <div className={styles.bwTimeline} aria-label="Bandwidth over time">
          {bandwidthHistory.map((bw, i) => (
            <div key={i} className={styles.bwTick} style={{ height: `${(bw / 6000) * 100}%` }} title={`${bw} kbps`} />
          ))}
        </div>
      )}

      <div className={styles.metricsBar} aria-live="polite" aria-label="Accumulated session metrics">
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Seg</div>
          <div className={styles.metricValue}>{totalSegments}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Dropped</div>
          <div className={styles.metricValue} data-status={droppedFrames > 0 ? "bad" : "good"}>{droppedFrames}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Underruns</div>
          <div className={styles.metricValue} data-status={bufferUnderruns > 0 ? "bad" : "good"}>{bufferUnderruns}</div>
        </div>
      </div>

      {completedRef.current && (
        <div className={styles.widgetNote}>
          ABR ON avoided stalls by dynamically adjusting quality. The tradeoff: more quality switches, but continuous playback.
        </div>
      )}
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
          {selected === correctIndex ? "✓ " : "✗ "}{explanation}
        </div>
      )}
    </div>
  );
}

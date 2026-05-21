"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import {
  FeedProvider,
  useFeed,
  SCOPE_ITEMS,
  API_ENDPOINTS,
  DATA_MODELS,
  type FeedPost,
  type FeedMode,
  type PostType,
  type AlgorithmWeights,
  type TypeDef,
} from "./feed-context";
import { ArchitectureScenarioPlayer } from "@/components/sdp/architecture-scenario-player";
import { NEWS_FEED_ARCH_CONFIG } from "./architecture-scenarios";
import { PostCard } from "./ui/PostCard";
import { MetricsBar } from "./ui/MetricsBar";
import { StepBar } from "../_shared/StepBar";
import styles from "./NewsFeedLab.module.css";

const STEP_LABELS = [
  "R", "A", "C",
  "F", "T", "∞", "♡",
  "RT", "Rk", "V",
  "Sk", "E", "A11y",
  "Err", "∞²",
];

// ── Public API ──────────────────────────────────────────────────────

export function NewsFeedLab({ activeStep }: { activeStep: number }) {
  const isPlanning = activeStep <= 3;

  return (
    <FeedProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} labels={STEP_LABELS} />
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
            <FeedEvolution />
          )}
        </div>
      </div>
    </FeedProvider>
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
  const { scopeEnabled, toggleScope } = useFeed();
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

// ── Step 2: API Design ─────────────────────────────────────────────

function ApiDesignView() {
  const [tab, setTab] = useState<"endpoints" | "types">("endpoints");

  return (
    <div className={styles.planningPanel}>
      <div className={styles.panelTabs}>
        <button type="button" className={styles.panelTab} data-active={tab === "endpoints" ? "true" : undefined} onClick={() => setTab("endpoints")}>
          Endpoints
        </button>
        <button type="button" className={styles.panelTab} data-active={tab === "types" ? "true" : undefined} onClick={() => setTab("types")}>
          Types
        </button>
      </div>
      {tab === "endpoints" ? <EndpointCards /> : <TypeCards />}
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
          <button
            key={key}
            type="button"
            className={styles.endpointCard}
            data-expanded={isOpen ? "true" : undefined}
            onClick={() => setExpanded(isOpen ? null : key)}
          >
            <div className={styles.endpointHeader}>
              <span className={styles.methodBadge} data-method={ep.method}>{ep.method}</span>
              <span className={styles.endpointPath}>{ep.path}</span>
              <span className={styles.endpointChevron}>{isOpen ? "▾" : "▸"}</span>
            </div>
            <div className={styles.endpointDesc}>{ep.description}</div>
            <div className={styles.endpointUsedBy}>{ep.usedBy}</div>
            {isOpen && (
              <div className={styles.endpointDetail}>
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
          </button>
        );
      })}
    </div>
  );
}

function ComponentTreeView() {
  return (
    <div className={styles.planningPanel}>
      <ArchitectureScenarioPlayer config={NEWS_FEED_ARCH_CONFIG} />
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
// Feed evolution (steps 4-15)
// ═══════════════════════════════════════════════════════════════════

function FeedEvolution() {
  const { activeStep, stateEntries, metrics } = useFeed();

  return (
    <div className={styles.evolutionLayout}>
      <MetricsBar activeStep={activeStep} metrics={metrics} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={TRANSITION.enterItem}
        >
          <StepControls />
        </motion.div>
      </AnimatePresence>

      <PersistentFeed />

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

      <StateInspector entries={stateEntries} title="Feed State" />
    </div>
  );
}

// Definitions moved to ui/MetricsBar.tsx

// ── Step controls (above feed) ─────────────────────────────────────

function StepControls() {
  const { activeStep } = useFeed();

  switch (activeStep) {
    case 4: return <BaselineControls />;
    case 5: return <PostTypeFilterControls />;
    case 6: return <InfiniteScrollControls />;
    case 7: return <OptimisticLikeControls />;
    case 8: return <RealTimeControls />;
    case 9: return <FeedAlgorithmControls />;
    case 10: return <VirtualizationControls />;
    case 11: return <SkeletonControls />;
    case 12: return <EmbeddingControls />;
    case 13: return <AccessibilityControls />;
    case 14: return <ErrorHandlingControls />;
    case 15: return <ScaleControls />;
    default: return null;
  }
}

// ── Step 4: Baseline ────────────────────────────────────────────────

function BaselineControls() {
  const { metrics, postCount } = useFeed();
  return (
    <div className={styles.baselineControls}>
      <div className={styles.baselineHeader}>
        <span className={styles.baselineBadge}>BASELINE</span>
        <span className={styles.baselineCount}>{postCount} text-only posts</span>
      </div>
      <div className={styles.baselineGrid}>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status="good">{metrics.domNodes}</span>
          <span className={styles.baselineStatLabel}>DOM nodes</span>
        </div>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status="good">{metrics.scrollFps}</span>
          <span className={styles.baselineStatLabel}>scroll FPS</span>
        </div>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status="good">{metrics.tti}ms</span>
          <span className={styles.baselineStatLabel}>TTI</span>
        </div>
        <div className={styles.baselineStat}>
          <span className={styles.baselineStatValue} data-status="good">{metrics.networkReqs}</span>
          <span className={styles.baselineStatLabel}>requests</span>
        </div>
      </div>
      <p className={styles.baselineNote}>All metrics green. This is the target we want to preserve as we add features.</p>
    </div>
  );
}

// ── Step 5: Post type filter chips ──────────────────────────────────

const POST_TYPE_CONFIG: { type: PostType; icon: string; color: string }[] = [
  { type: "text", icon: "T", color: "var(--color-text)" },
  { type: "image", icon: "◻", color: "var(--diagram-layer-2)" },
  { type: "link", icon: "↗", color: "var(--diagram-layer-5)" },
  { type: "poll", icon: "▮", color: "var(--diagram-layer-4)" },
];

function PostTypeFilterControls() {
  const { isActive, toggleFeature, postTypeFilter, togglePostType, posts } = useFeed();
  const on = isActive("postTypes");

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { text: 0, image: 0, link: 0, poll: 0 };
    posts.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
    return counts;
  }, [posts]);

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Post Type Polymorphism" on={on} onToggle={() => toggleFeature("postTypes")} />
      {on && (
        <div className={styles.postTypeChips}>
          {POST_TYPE_CONFIG.map(({ type, icon, color }) => (
            <button
              key={type}
              type="button"
              className={styles.postTypeChip}
              data-active={postTypeFilter.has(type) ? "true" : undefined}
              style={{ "--chip-color": color } as React.CSSProperties}
              onClick={() => togglePostType(type)}
            >
              <span className={styles.postTypeChipIcon}>{icon}</span>
              <span>{type}</span>
              <span className={styles.postTypeChipCount}>{typeCounts[type]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 6: Infinite scroll with batch counter ──────────────────────

function InfiniteScrollControls() {
  const { isActive, toggleFeature, postCount } = useFeed();
  const on = isActive("infiniteScroll");
  const pages = on ? Math.ceil(postCount / 20) : 1;

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Infinite Scroll (IntersectionObserver)" on={on} onToggle={() => toggleFeature("infiniteScroll")} />
      {on && (
        <div className={styles.batchProgress}>
          <div className={styles.batchBar}>
            <div
              className={styles.batchBarFill}
              style={{ width: `${Math.min(100, (1 / pages) * 100)}%` }}
            />
          </div>
          <div className={styles.batchLabels}>
            <span>Page 1 of {pages} loaded</span>
            <span>{postCount} total posts</span>
          </div>
          <div className={styles.batchCompare}>
            <div className={styles.batchCompareItem}>
              <span className={styles.batchCompareValue} data-status="good">1</span>
              <span className={styles.batchCompareLabel}>initial request</span>
            </div>
            <div className={styles.batchCompareItem}>
              <span className={styles.batchCompareValue} data-status="good">20</span>
              <span className={styles.batchCompareLabel}>posts per page</span>
            </div>
            <div className={styles.batchCompareItem}>
              <span className={styles.batchCompareValue}>{pages}</span>
              <span className={styles.batchCompareLabel}>total pages</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 7: Optimistic likes with live counter ──────────────────────

function OptimisticLikeControls() {
  const { isActive, toggleFeature, pendingLikes, failedLikes } = useFeed();
  const on = isActive("optimisticLikes");
  const [totalClicks, setTotalClicks] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const prevPending = useRef(pendingLikes.size);
  const prevFailed = useRef(failedLikes.size);

  React.useEffect(() => {
    if (pendingLikes.size > prevPending.current) {
      setTotalClicks((c) => c + (pendingLikes.size - prevPending.current));
    }
    if (failedLikes.size > prevFailed.current) {
      setFailCount((c) => c + (failedLikes.size - prevFailed.current));
    }
    if (pendingLikes.size < prevPending.current && failedLikes.size <= prevFailed.current) {
      setSuccessCount((c) => c + (prevPending.current - pendingLikes.size));
    }
    prevPending.current = pendingLikes.size;
    prevFailed.current = failedLikes.size;
  }, [pendingLikes.size, failedLikes.size]);

  React.useEffect(() => {
    if (!on) { setTotalClicks(0); setSuccessCount(0); setFailCount(0); }
  }, [on]);

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Optimistic Likes" on={on} onToggle={() => toggleFeature("optimisticLikes")} />
      {on && (
        <div className={styles.likeTracker}>
          <div className={styles.likeTrackerStat}>
            <span className={styles.likeTrackerValue}>{totalClicks}</span>
            <span className={styles.likeTrackerLabel}>clicks</span>
          </div>
          <div className={styles.likeTrackerStat}>
            <span className={styles.likeTrackerValue} data-status="good">{successCount}</span>
            <span className={styles.likeTrackerLabel}>confirmed</span>
          </div>
          <div className={styles.likeTrackerStat}>
            <span className={styles.likeTrackerValue} data-status={failCount > 0 ? "bad" : undefined}>{failCount}</span>
            <span className={styles.likeTrackerLabel}>rolled back</span>
          </div>
          <div className={styles.likeTrackerStat}>
            <span className={styles.likeTrackerValue}>{pendingLikes.size}</span>
            <span className={styles.likeTrackerLabel}>in-flight</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 8: Real-time with auto-insert comparison ───────────────────

function RealTimeControls() {
  const { isActive, toggleFeature, autoInsert, setAutoInsert } = useFeed();
  const on = isActive("realTimePosts");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Real-time New Posts (SSE)" on={on} onToggle={() => toggleFeature("realTimePosts")} />
      {on && (
        <div className={styles.insertModeToggle}>
          <button
            type="button"
            className={styles.insertModeButton}
            data-active={!autoInsert ? "true" : undefined}
            data-variant="good"
            onClick={() => setAutoInsert(false)}
          >
            Queue + Banner
          </button>
          <button
            type="button"
            className={styles.insertModeButton}
            data-active={autoInsert ? "true" : undefined}
            data-variant="bad"
            onClick={() => setAutoInsert(true)}
          >
            Auto-insert (jumpy)
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 9: Algorithm controls with weight sliders ──────────────────

function FeedAlgorithmControls() {
  const { feedMode, setFeedMode, isActive, toggleFeature, algorithmWeights, setAlgorithmWeights } = useFeed();
  const active = isActive("feedAlgorithm");

  const updateWeight = useCallback((key: keyof AlgorithmWeights, val: number) => {
    setAlgorithmWeights({ ...algorithmWeights, [key]: val });
  }, [algorithmWeights, setAlgorithmWeights]);

  return (
    <div className={styles.feedModeControls}>
      <ToggleRow label="Feed Algorithm" on={active} onToggle={() => toggleFeature("feedAlgorithm")} />
      {active && (
        <>
          <div className={styles.feedModeButtons}>
            {(["chronological", "ranked"] as FeedMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={styles.layoutModeButton}
                data-active={feedMode === mode ? "true" : undefined}
                onClick={() => setFeedMode(mode)}
              >
                {mode === "chronological" ? "Chronological" : "Engagement Ranked"}
              </button>
            ))}
          </div>
          {feedMode === "ranked" && (
            <div className={styles.weightSliders}>
              {([
                { key: "likes" as const, label: "Likes", icon: "♡" },
                { key: "comments" as const, label: "Comments", icon: "💬" },
                { key: "shares" as const, label: "Shares", icon: "↗" },
              ]).map(({ key, label, icon }) => (
                <div key={key} className={styles.weightRow}>
                  <span className={styles.weightLabel}>{icon} {label}</span>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={algorithmWeights[key]}
                    onChange={(e) => updateWeight(key, Number(e.target.value))}
                    className={styles.weightSlider}
                    aria-label={`${label} weight`}
                  />
                  <span className={styles.weightValue}>{algorithmWeights[key].toFixed(1)}x</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Step 10: Virtualization controls ────────────────────────────────

function VirtualizationControls() {
  const { isActive, toggleFeature, metrics, posts, virtualWindow } = useFeed();
  const on = isActive("virtualization");
  const total = posts.length;

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Virtualization (DOM Recycling)" on={on} onToggle={() => toggleFeature("virtualization")} />
      <div className={styles.domCompare}>
        <div className={styles.domCompareItem} data-status={on ? "before" : "active"}>
          <span className={styles.domCompareValue}>{on ? total * 4 : metrics.domNodes}</span>
          <span className={styles.domCompareLabel}>without</span>
        </div>
        <div className={styles.domCompareArrow}>{on ? "→" : "..."}</div>
        <div className={styles.domCompareItem} data-status={on ? "active" : "after"}>
          <span className={styles.domCompareValue}>{on ? metrics.domNodes : 48}</span>
          <span className={styles.domCompareLabel}>with virtual</span>
        </div>
        <div className={styles.domCompareSavings}>
          {on ? `${Math.round((1 - 48 / (total * 4)) * 100)}% fewer nodes` : `${total * 4} DOM nodes currently`}
        </div>
      </div>
    </div>
  );
}

// ── Step 11: Skeleton loading controls ─────────────────────────────

function SkeletonControls() {
  const { isActive, toggleFeature, metrics } = useFeed();
  const on = isActive("skeletons");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Skeleton Loading" on={on} onToggle={() => toggleFeature("skeletons")} />
      <div className={styles.clsCompare}>
        <div className={styles.clsCompareCol}>
          <div className={styles.clsCompareLabel}>Without skeletons</div>
          <div className={styles.clsCompareBlock} data-state="bad">
            <div className={styles.clsShift}>content jumps ↓</div>
            <div className={styles.clsMeter}>CLS: 0.25</div>
          </div>
        </div>
        <div className={styles.clsCompareCol}>
          <div className={styles.clsCompareLabel}>With skeletons</div>
          <div className={styles.clsCompareBlock} data-state={on ? "good" : "inactive"}>
            <div className={styles.clsReserved}>layout reserved</div>
            <div className={styles.clsMeter}>CLS: 0.01</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 12: Embedding controls ─────────────────────────────────────

function EmbeddingControls() {
  const { isActive, toggleFeature } = useFeed();
  const on = isActive("embedding");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Rich Content Embedding" on={on} onToggle={() => toggleFeature("embedding")} />
      {on && (
        <div className={styles.embeddingPipeline}>
          <div className={styles.pipelineStep} data-state="complete">
            <span className={styles.pipelineDot} />
            <span>Parse URL</span>
          </div>
          <div className={styles.pipelineArrow}>→</div>
          <div className={styles.pipelineStep} data-state="complete">
            <span className={styles.pipelineDot} />
            <span>Fetch OG tags</span>
          </div>
          <div className={styles.pipelineArrow}>→</div>
          <div className={styles.pipelineStep} data-state="complete">
            <span className={styles.pipelineDot} />
            <span>Render card</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 13: Accessibility controls ─────────────────────────────────

function AccessibilityControls() {
  const { isActive, toggleFeature } = useFeed();
  const on = isActive("a11y");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Accessibility Semantics" on={on} onToggle={() => toggleFeature("a11y")} />
      {on && (
        <div className={styles.ariaPreview}>
          {[
            { attr: 'role="feed"', el: "<section>", desc: "Marks scrollable post stream" },
            { attr: "aria-busy", el: "<section>", desc: "True while loading more" },
            { attr: 'role="article"', el: "<article>", desc: "Each post is an article" },
            { attr: "aria-posinset", el: "<article>", desc: "Position in feed (1, 2, 3...)" },
            { attr: "aria-setsize", el: "<article>", desc: "Total feed length (-1 for infinite)" },
          ].map(({ attr, el, desc }) => (
            <div key={attr} className={styles.ariaRow}>
              <code className={styles.ariaAttr}>{attr}</code>
              <span className={styles.ariaEl}>{el}</span>
              <span className={styles.ariaDesc}>{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 14: Error handling controls ────────────────────────────────

function ErrorHandlingControls() {
  const { isActive, toggleFeature, failedPosts } = useFeed();
  const on = isActive("errorHandling");

  return (
    <div className={styles.toggleStrip}>
      <ToggleRow label="Simulate Errors" on={on} onToggle={() => toggleFeature("errorHandling")} />
      {on && (
        <div className={styles.backoffTimeline}>
          <div className={styles.backoffHeader}>Exponential backoff strategy</div>
          <div className={styles.backoffSteps}>
            {[
              { attempt: 1, delay: "1s", label: "First retry" },
              { attempt: 2, delay: "4s", label: "Second retry" },
              { attempt: 3, delay: "16s", label: "Third retry" },
              { attempt: 4, delay: "—", label: "Give up, show error" },
            ].map(({ attempt, delay, label }) => (
              <div key={attempt} className={styles.backoffStep} data-final={attempt === 4 ? "true" : undefined}>
                <span className={styles.backoffAttempt}>#{attempt}</span>
                <span className={styles.backoffDelay}>{delay}</span>
                <span className={styles.backoffLabel}>{label}</span>
              </div>
            ))}
          </div>
          <div className={styles.backoffStats}>
            {failedPosts.size} posts showing error cards — click retry on them above
          </div>
        </div>
      )}
    </div>
  );
}

function ScaleControls() {
  const { scaleLevel, setScaleLevel } = useFeed();
  const scaleLabels: Record<number, string> = { 50: "50", 500: "500", 5000: "5K", 50000: "50K" };

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
        <span className={styles.scaleSliderLabel}>Post Count</span>
        <span className={styles.scaleSliderValue}>{scaleLabels[scaleLevel] ?? scaleLevel.toLocaleString()}</span>
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
      />
      <div className={styles.scaleMarks}>
        <span>50</span><span>500</span><span>5K</span><span>50K</span>
      </div>
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button type="button" className={styles.toggleButton} data-on={on ? "true" : undefined} onClick={onToggle} aria-pressed={on}>
        <span className={styles.toggleKnob} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Persistent feed (steps 4+)
// ═══════════════════════════════════════════════════════════════════

function PersistentFeed() {
  const {
    activeStep, visiblePosts, isActive,
    newPostQueue, insertNewPosts,
    pendingLikes, failedLikes, toggleLike,
    failedPosts, retryPost,
    feedMode,
  } = useFeed();

  const showTypes = isActive("postTypes");
  const showLikes = isActive("optimisticLikes");
  const showScores = isActive("feedAlgorithm") && feedMode === "ranked";
  const showSkeletons = isActive("skeletons");
  const showErrors = isActive("errorHandling");
  const showEmbedding = isActive("embedding");

  return (
    <div className={styles.feedContainer}>
      {/* New post banner */}
      {newPostQueue.length > 0 && (
        <motion.button
          type="button"
          className={styles.newPostBanner}
          onClick={insertNewPosts}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {newPostQueue.length} new {newPostQueue.length === 1 ? "post" : "posts"}
        </motion.button>
      )}

      <div className={styles.feedScroll}>
        <AnimatePresence initial={false}>
          {visiblePosts.map((post, idx) => {
            const hasError = showErrors && failedPosts.has(post.id);
            const isPending = pendingLikes.has(post.id);
            const hasFailed = failedLikes.has(post.id);

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ ...TRANSITION.enterCard, delay: idx < 3 ? idx * 0.05 : 0 }}
              >
                {hasError ? (
                  <div className={styles.postCardError}>
                    <span>Failed to load post</span>
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={() => retryPost(post.id)}
                    >
                      ⟳ Retry
                    </button>
                  </div>
                ) : (
                  <PostCard
                    post={post}
                    showType={showTypes}
                    showLikes={showLikes}
                    showScore={showScores}
                    showEmbedding={showEmbedding}
                    isPending={isPending}
                    hasFailed={hasFailed}
                    onLike={() => toggleLike(post.id)}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Skeleton loading */}
        {showSkeletons && (
          <div className={styles.skeletonGroup}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonLines}>
                  <div className={styles.skeletonLine} style={{ width: "40%" }} />
                  <div className={styles.skeletonLine} style={{ width: "90%" }} />
                  <div className={styles.skeletonLine} style={{ width: "65%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {isActive("infiniteScroll") && (
          <div className={styles.scrollSentinel}>
            <div className={styles.sentinelLine} />
            <span className={styles.sentinelLabel}>IntersectionObserver sentinel</span>
            <div className={styles.sentinelLine} />
          </div>
        )}
      </div>
    </div>
  );
}

// Definitions moved to ui/PostCard.tsx

// ═══════════════════════════════════════════════════════════════════
// Step-specific widgets (below feed)
// ═══════════════════════════════════════════════════════════════════

function StepWidget() {
  const { activeStep } = useFeed();

  switch (activeStep) {
    case 4: return <BaselineExplainerWidget />;
    case 5: return <PostTypeWidget />;
    case 6: return <InfiniteScrollWidget />;
    case 7: return <OptimisticLikeWidget />;
    case 8: return <RealTimeWidget />;
    case 9: return <FeedAlgorithmWidget />;
    case 10: return <VirtualWindowWidget />;
    case 11: return <SkeletonExplainerWidget />;
    case 12: return <EmbeddingWidget />;
    case 13: return <AccessibilityWidget />;
    case 14: return <ErrorStatesWidget />;
    case 15: return <CWVGauges />;
    default: return null;
  }
}

// ── Step 4: Baseline explainer ─────────────────────────────────────

function BaselineExplainerWidget() {
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Why Start Simple?</div>
      <div className={styles.baselineComparison}>
        <div className={styles.baselineCompareCol}>
          <div className={styles.baselineCompareLabel}>Now (8 posts)</div>
          <div className={styles.baselineCompareItem} data-status="good">32 DOM nodes</div>
          <div className={styles.baselineCompareItem} data-status="good">60 FPS</div>
          <div className={styles.baselineCompareItem} data-status="good">400ms TTI</div>
        </div>
        <div className={styles.baselineCompareCol}>
          <div className={styles.baselineCompareLabel}>At 50K posts</div>
          <div className={styles.baselineCompareItem} data-status="bad">200,000 DOM nodes</div>
          <div className={styles.baselineCompareItem} data-status="bad">8 FPS</div>
          <div className={styles.baselineCompareItem} data-status="bad">12,000ms TTI</div>
        </div>
      </div>
      <p className={styles.widgetNote}>
        Same code, different scale. Each feature we add in steps 5-15 solves a specific scaling problem while preserving these baseline numbers.
      </p>
    </div>
  );
}

// ── Step 5: Post type polymorphism ─────────────────────────────────

function PostTypeWidget() {
  const { isActive, postTypeFilter } = useFeed();
  const on = isActive("postTypes");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Discriminated Union Pattern</div>
      <div className={styles.typeExplainer}>
        {(["text", "image", "link", "poll"] as const).map((type) => {
          const isFiltered = on && !postTypeFilter.has(type);
          return (
            <div key={type} className={styles.typeExplainerRow} data-active={on && !isFiltered ? "true" : undefined}>
              <span className={styles.typeExplainerBadge} data-type={type}>{type}</span>
              <span className={styles.typeExplainerDesc}>
                {type === "text" && "Plain text body. Compact card."}
                {type === "image" && "Aspect-ratio image preview below text."}
                {type === "link" && "OG metadata card — domain, title, description."}
                {type === "poll" && "Horizontal bar chart with vote percentages."}
              </span>
              {isFiltered && <span className={styles.typeFilteredTag}>hidden</span>}
            </div>
          );
        })}
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "One PostCard component dispatches on post.type — filter types above to see cards appear/disappear. No separate TextPost, ImagePost, etc."
          : "All posts render as text-only. Toggle to see how the same PostCard component adapts its shape."}
      </p>
    </div>
  );
}

// ── Step 6: Infinite scroll ────────────────────────────────────────

function InfiniteScrollWidget() {
  const { isActive, postCount } = useFeed();
  const on = isActive("infiniteScroll");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Infinite Scroll</div>
      <div className={styles.sentinelDiagram}>
        <div className={styles.sentinelDiagramViewport}>
          <div className={styles.sentinelDiagramContent}>
            <div className={styles.sentinelDiagramPosts}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.sentinelDiagramPost} />
              ))}
            </div>
            {on && (
              <div className={styles.sentinelDiagramTrigger}>
                ← sentinel crosses viewport → onNearEnd fires
              </div>
            )}
          </div>
        </div>
      </div>
      <p className={styles.widgetNote}>
        {on
          ? `IntersectionObserver watches a sentinel div at the bottom. When it enters the viewport, fetch the next page. Currently showing ${postCount} posts.`
          : "Without infinite scroll, the user sees a fixed list. Toggle to add the sentinel trigger."}
      </p>
    </div>
  );
}

// ── Step 7: Optimistic like ────────────────────────────────────────

function OptimisticLikeWidget() {
  const { isActive, pendingLikes, failedLikes } = useFeed();
  const on = isActive("optimisticLikes");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Optimistic Updates</div>
      <div className={styles.optimisticDiagram}>
        <div className={styles.optimisticStep}>
          <div className={styles.optimisticDot} data-state="user" />
          <span>User taps ♡</span>
        </div>
        <div className={styles.optimisticArrow}>→</div>
        <div className={styles.optimisticStep}>
          <div className={styles.optimisticDot} data-state="optimistic" />
          <span>UI: ♥ +1 (instant)</span>
        </div>
        <div className={styles.optimisticArrow}>→</div>
        <div className={styles.optimisticStep}>
          <div className={styles.optimisticDot} data-state="server" />
          <span>Server confirms</span>
        </div>
        <div className={styles.optimisticArrow}>|</div>
        <div className={styles.optimisticStep}>
          <div className={styles.optimisticDot} data-state="rollback" />
          <span>...or rolls back</span>
        </div>
      </div>
      {on && (
        <div className={styles.optimisticStats}>
          <span>Pending: {pendingLikes.size}</span>
          <span>Failed (rollback): {failedLikes.size}</span>
        </div>
      )}
      <p className={styles.widgetNote}>
        {on
          ? "Click hearts on posts above. Posts ending in 3 or 7 will fail — watch the heart shake and count roll back."
          : "Toggle to enable optimistic likes. The UI updates before the server responds."}
      </p>
    </div>
  );
}

// ── Step 8: Real-time ──────────────────────────────────────────────

function RealTimeWidget() {
  const { isActive, newPostQueue } = useFeed();
  const on = isActive("realTimePosts");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Real-time Post Stream</div>
      <div className={styles.realtimeDiagram}>
        <div className={styles.realtimeSource}>
          <span className={styles.realtimeDot} data-active={on ? "true" : undefined} />
          SSE Connection
        </div>
        <div className={styles.realtimeArrow}>→</div>
        <div className={styles.realtimeQueue}>
          Queue: {newPostQueue.length} pending
        </div>
        <div className={styles.realtimeArrow}>→</div>
        <div className={styles.realtimeBanner}>
          Banner (click to insert)
        </div>
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "New posts arrive every 3.5s via SSE. They queue — never auto-insert while the user is reading. Click the blue banner above to insert."
          : "Toggle to start receiving posts. Posts queue silently until the user requests them."}
      </p>
    </div>
  );
}

// ── Step 9: Feed algorithm ─────────────────────────────────────────

function FeedAlgorithmWidget() {
  const { isActive, feedMode, posts, algorithmWeights } = useFeed();
  const on = isActive("feedAlgorithm");

  const topPosts = useMemo(() => {
    if (!on || feedMode !== "ranked") return [];
    return posts.slice(0, 5);
  }, [on, feedMode, posts]);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Feed Ranking</div>
      {on && (
        <div className={styles.formulaDisplay}>
          score = (likes × {algorithmWeights.likes.toFixed(1)} + comments × {algorithmWeights.comments.toFixed(1)} + shares × {algorithmWeights.shares.toFixed(1)}) / √(minutes + 1)
        </div>
      )}
      {on && feedMode === "ranked" && topPosts.length > 0 && (
        <div className={styles.rankingTable}>
          <div className={styles.rankingHeader}>
            <span>Post</span>
            <span>♡</span>
            <span>💬</span>
            <span>↗</span>
            <span>Score</span>
          </div>
          {topPosts.map((p, i) => (
            <div key={p.id} className={styles.rankingRow}>
              <span className={styles.rankingRank}>#{i + 1}</span>
              <span>{p.likes}</span>
              <span>{p.comments}</span>
              <span>{p.shares}</span>
              <span className={styles.rankingScore}>{p.engagementScore}</span>
            </div>
          ))}
        </div>
      )}
      <p className={styles.widgetNote}>
        {on
          ? feedMode === "ranked"
            ? "Drag weight sliders above to reorder the feed in real time. Watch how shares×5 vs likes×5 produce totally different rankings."
            : "Switch to \"Engagement Ranked\" above to see scores. Then drag weight sliders to reorder posts live."
          : "Toggle to enable the feed algorithm, then switch between chronological and engagement-ranked."}
      </p>
    </div>
  );
}

// ── Step 10: Virtual window ────────────────────────────────────────

function VirtualWindowWidget() {
  const { isActive, posts, virtualWindow, postCount } = useFeed();
  const on = isActive("virtualization");
  const total = posts.length;
  const dotCount = Math.min(total, 60);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>DOM Window</div>
      <div className={styles.virtualStrip}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const isInWindow = on && i >= virtualWindow.start && i < virtualWindow.end;
          return (
            <div
              key={i}
              className={styles.virtualDot}
              data-active={isInWindow ? "true" : undefined}
              data-rendered={!on || isInWindow ? "true" : undefined}
            />
          );
        })}
        {total > dotCount && <span className={styles.virtualOverflow}>+{total - dotCount}</span>}
      </div>
      <p className={styles.widgetNote}>
        {on
          ? `${virtualWindow.end - virtualWindow.start} of ${postCount} posts have DOM nodes. The rest are height placeholders.`
          : `All ${postCount} posts are in the DOM. Toggle to virtualize — only visible posts get real nodes.`}
      </p>
    </div>
  );
}

// ── Step 11: Skeleton explainer ────────────────────────────────────

function SkeletonExplainerWidget() {
  const { isActive } = useFeed();
  const on = isActive("skeletons");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Skeleton Loading</div>
      <div className={styles.skeletonCompare}>
        <div className={styles.skeletonCompareCol}>
          <div className={styles.skeletonCompareLabel}>Without</div>
          <div className={styles.skeletonCompareBox}>
            <div className={styles.skeletonSpinner} />
            <span>Loading...</span>
          </div>
        </div>
        <div className={styles.skeletonCompareCol}>
          <div className={styles.skeletonCompareLabel}>With skeletons</div>
          <div className={styles.skeletonCompareBox}>
            <div className={styles.miniSkeleton} />
            <div className={styles.miniSkeletonLine} style={{ width: "80%" }} />
            <div className={styles.miniSkeletonLine} style={{ width: "55%" }} />
          </div>
        </div>
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "Skeleton cards preview the layout shape before content arrives. This preserves CLS and gives users a mental model of incoming content."
          : "Toggle to see shimmer placeholders at the bottom of the feed."}
      </p>
    </div>
  );
}

// ── Step 12: Embedding widget ─────────────────────────────────────

function EmbeddingWidget() {
  const { isActive, posts } = useFeed();
  const on = isActive("embedding");

  const linkPosts = useMemo(() => posts.filter((p) => p.type === "link" && p.linkPreview), [posts]);

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>OG Metadata Pipeline</div>
      <div className={styles.embeddingExplainer}>
        <div className={styles.embeddingStage}>
          <div className={styles.embeddingStageBadge}>1</div>
          <div>
            <div className={styles.embeddingStageTitle}>Detect URLs</div>
            <div className={styles.embeddingStageDesc}>Regex scan post.content for https:// patterns</div>
          </div>
        </div>
        <div className={styles.embeddingStage}>
          <div className={styles.embeddingStageBadge}>2</div>
          <div>
            <div className={styles.embeddingStageTitle}>Fetch OG Tags</div>
            <div className={styles.embeddingStageDesc}>Server-side: GET → parse &lt;meta property=&quot;og:*&quot;&gt;</div>
          </div>
        </div>
        <div className={styles.embeddingStage}>
          <div className={styles.embeddingStageBadge}>3</div>
          <div>
            <div className={styles.embeddingStageTitle}>Render Preview</div>
            <div className={styles.embeddingStageDesc}>domain + title + description card</div>
          </div>
        </div>
      </div>
      {on && linkPosts.length > 0 && (
        <div className={styles.embeddingStats}>
          <span>{linkPosts.length} link posts enriched</span>
          <span>avg ~120ms per OG fetch</span>
        </div>
      )}
      <p className={styles.widgetNote}>
        {on
          ? "Link posts now show OG preview cards. Scroll up to see the colored left-border cards with domain + title + description."
          : "Toggle embedding above to enrich link posts with Open Graph metadata previews."}
      </p>
    </div>
  );
}

// ── Step 13: Accessibility widget ─────────────────────────────────

function AccessibilityWidget() {
  const { isActive, posts } = useFeed();
  const on = isActive("a11y");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Feed Accessibility Audit</div>
      <div className={styles.a11yChecklist}>
        <A11yCheckRow
          label='role="feed"'
          desc="Screen readers announce this as a social feed"
          passed={on}
        />
        <A11yCheckRow
          label="aria-busy"
          desc="Blocks AT from reading while loading"
          passed={on}
        />
        <A11yCheckRow
          label='role="article"'
          desc={`Each of ${posts.length} posts is a standalone article`}
          passed={on}
        />
        <A11yCheckRow
          label="aria-posinset / aria-setsize"
          desc="Tells AT the position: 'article 3 of 200'"
          passed={on}
        />
        <A11yCheckRow
          label="aria-live polite"
          desc="New post banner announced without interrupting"
          passed={on}
        />
      </div>
      <p className={styles.widgetNote}>
        {on
          ? "All checks passing. A screen reader now announces: 'Feed, article 1 of 200, by Ada Lovelace...'"
          : "Toggle accessibility above to apply ARIA attributes to the feed."}
      </p>
    </div>
  );
}

function A11yCheckRow({ label, desc, passed }: { label: string; desc: string; passed: boolean }) {
  return (
    <div className={styles.a11yCheckRow} data-passed={passed ? "true" : undefined}>
      <span className={styles.a11yCheckIcon}>{passed ? "✓" : "—"}</span>
      <div>
        <code className={styles.a11yCheckLabel}>{label}</code>
        <span className={styles.a11yCheckDesc}>{desc}</span>
      </div>
    </div>
  );
}

// ── Step 14: Error states ──────────────────────────────────────────

function ErrorStatesWidget() {
  const { isActive, failedPosts } = useFeed();
  const on = isActive("errorHandling");

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Error Recovery</div>
      <div className={styles.errorDiagram}>
        <div className={styles.errorStateRow}>
          <span className={styles.errorDot} data-state="pending" />
          <span>pending</span>
          <span className={styles.errorArrow}>→</span>
          <span className={styles.errorDot} data-state="loading" />
          <span>loading</span>
          <span className={styles.errorArrow}>→</span>
          <span className={styles.errorDot} data-state="loaded" />
          <span>loaded</span>
        </div>
        <div className={styles.errorStateBranch}>
          <span className={styles.errorArrow}>↓</span>
          <span className={styles.errorDot} data-state="failed" />
          <span>failed → retry</span>
        </div>
      </div>
      {on && (
        <div className={styles.errorStats}>
          <span>Failed posts: {failedPosts.size}</span>
          <span>Click retry on red cards above</span>
        </div>
      )}
      <p className={styles.widgetNote}>
        {on
          ? "Some posts show error states. Click retry to recover. In production: exponential backoff (1s → 4s → 16s → give up)."
          : "Toggle to simulate network errors on some posts."}
      </p>
    </div>
  );
}

// ── Step 15: CWV gauges ────────────────────────────────────────────

function CWVGauges() {
  const { metrics, scaleLevel } = useFeed();

  const lcpScore = metrics.tti < 2500 ? "good" : metrics.tti < 4000 ? "needs-improvement" : "poor";
  const fpsScore = metrics.scrollFps >= 55 ? "good" : metrics.scrollFps >= 40 ? "needs-improvement" : "poor";

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Core Web Vitals at {scaleLevel.toLocaleString()} posts</div>
      <div className={styles.cwvGauges}>
        <div className={styles.cwvGauge}>
          <div className={styles.cwvLabel}>TTI</div>
          <div className={styles.cwvValue} data-score={lcpScore}>{metrics.tti}ms</div>
          <div className={styles.cwvTarget}>target &lt;2500ms</div>
        </div>
        <div className={styles.cwvGauge}>
          <div className={styles.cwvLabel}>Scroll FPS</div>
          <div className={styles.cwvValue} data-score={fpsScore}>{metrics.scrollFps}</div>
          <div className={styles.cwvTarget}>target ≥55</div>
        </div>
        <div className={styles.cwvGauge}>
          <div className={styles.cwvLabel}>DOM Nodes</div>
          <div className={styles.cwvValue} data-score={metrics.domNodes < 100 ? "good" : "poor"}>{metrics.domNodes}</div>
          <div className={styles.cwvTarget}>target &lt;100</div>
        </div>
      </div>
    </div>
  );
}

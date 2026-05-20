"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  NetworkRegion,
  ChatPaneFrame,
  StatusBar,
  MessageList,
  ComposeBar,
} from "./MockChat";
import { useStageAnchors, FlyingChipsLayer } from "./FlyingChip";
import { deriveInspector } from "./derive-state";
import type { ChatScenarioStageProps, Scene } from "./types";
import styles from "./stage.module.css";

const STEP_DURATION_MS = 1900;

export function ChatScenarioStage({
  scenarios,
  initialScenarioIdx = 0,
}: ChatScenarioStageProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [scenarioIdx, setScenarioIdx] = useState(initialScenarioIdx);
  const [stepIdx, setStepIdx] = useState(0);
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [viewMode, setViewMode] = useState<"ui" | "state">("ui");

  const scenario = scenarios[scenarioIdx];
  const activeScenes: Scene[] =
    splitEnabled || !scenario.scenesWithoutSplit
      ? scenario.scenes
      : scenario.scenesWithoutSplit;
  const scene = activeScenes[Math.min(stepIdx, activeScenes.length - 1)];
  const prevScene = stepIdx > 0 ? activeScenes[stepIdx - 1] : undefined;
  const totalSteps = activeScenes.length;
  const hasCounterfactual = !!scenario.scenesWithoutSplit;

  // Anchor positions are recomputed whenever the layout might have
  // shifted (step or scenario change, split toggle, view mode flip).
  const anchorDep = `${scenarioIdx}-${stepIdx}-${splitEnabled}-${viewMode}`;
  const anchors = useStageAnchors(boardRef, anchorDep);

  // Inspectors are derived when in state mode. Reuses scene + prev scene
  // so the inspector can highlight which entries just changed.
  const isStateMode = viewMode === "state";
  const inspectorKey = anchorDep;

  // Active arms — which child wires should light up this step.
  // Activates on (a) chip from/to that component, or (b) the relevant
  // prop changing (e.g., messages length changed → MessageList arm).
  const activeArms = (() => {
    const set = new Set<string>();
    for (const chip of scene.state.flyingChips) {
      if (chip.from === "composebar" || chip.to === "composebar") {
        set.add("ComposeBar");
      }
      if (chip.from === "messagelist" || chip.to === "messagelist") {
        set.add("MessageList");
      }
      if (chip.from === "statusbar" || chip.to === "statusbar") {
        set.add("StatusBar");
      }
    }
    if (prevScene) {
      const prev = prevScene.state;
      const cur = scene.state;
      if (
        prev.messages.length !== cur.messages.length ||
        prev.activeMessageId !== cur.activeMessageId ||
        prev.typingUsers.join(",") !== cur.typingUsers.join(",")
      ) {
        set.add("MessageList");
      }
      if (prev.chatpane.connection !== cur.chatpane.connection) {
        set.add("StatusBar");
      }
      const prevMsg = prev.messages.find((m) => m.id === prev.activeMessageId);
      const curMsg = cur.messages.find((m) => m.id === cur.activeMessageId);
      if (prevMsg?.status !== curMsg?.status) {
        set.add("MessageList");
      }
    }
    return set;
  })();
  const inspectors = isStateMode
    ? {
        network: deriveInspector("network", scene.state, prevScene?.state),
        ws: deriveInspector("ws", scene.state, prevScene?.state),
        chatpane: deriveInspector("chatpane", scene.state, prevScene?.state),
        statusbar: deriveInspector("statusbar", scene.state, prevScene?.state),
        messagelist: deriveInspector(
          "messagelist",
          scene.state,
          prevScene?.state,
        ),
        messagebubble: deriveInspector(
          "messagebubble",
          scene.state,
          prevScene?.state,
        ),
        composebar: deriveInspector("composebar", scene.state, prevScene?.state),
      }
    : null;

  // Autoplay once when the widget scrolls into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || hasAutoPlayed || reducedMotion) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            setHasAutoPlayed(true);
            setIsPlaying(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasAutoPlayed, reducedMotion]);

  // Auto-advance steps while playing.
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIdx >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }
    const t = window.setTimeout(
      () => setStepIdx((i) => i + 1),
      reducedMotion ? 400 : STEP_DURATION_MS,
    );
    return () => window.clearTimeout(t);
  }, [isPlaying, stepIdx, totalSteps, reducedMotion]);

  const selectScenario = (i: number) => {
    setScenarioIdx(i);
    setStepIdx(0);
    setIsPlaying(false);
  };

  const setSplit = (enabled: boolean) => {
    setSplitEnabled(enabled);
    setStepIdx(0);
    setIsPlaying(false);
  };

  const goPrev = () => {
    setStepIdx((i) => Math.max(0, i - 1));
    setIsPlaying(false);
  };
  const goNext = () => {
    setStepIdx((i) => Math.min(totalSteps - 1, i + 1));
    setIsPlaying(false);
  };
  const scrubTo = (i: number) => {
    setStepIdx(i);
    setIsPlaying(false);
  };
  const replay = () => {
    setStepIdx(0);
    setIsPlaying(true);
  };
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else if (stepIdx >= totalSteps - 1) {
      replay();
    } else {
      setIsPlaying(true);
    }
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {/* Header: scenario tabs + split toggle */}
      <div className={styles.header}>
        <div className={styles.tabs} role="tablist" aria-label="Chat scenarios">
          {scenarios.map((s, i) => {
            const active = i === scenarioIdx;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={styles.tab}
                data-active={active ? "true" : undefined}
                onClick={() => selectScenario(i)}
              >
                <span className={styles.tabIndex}>{i + 1}</span>
                <span className={styles.tabLabel}>{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.headerRight}>
          {hasCounterfactual && (
            <div
              className={styles.splitToggle}
              role="radiogroup"
              aria-label="Send mode"
            >
              <span className={styles.splitToggleLabel}>Mode</span>
              <div className={styles.splitToggleTrack}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={splitEnabled}
                  className={styles.splitToggleOption}
                  data-active={splitEnabled ? "true" : undefined}
                  onClick={() => setSplit(true)}
                >
                  optimistic
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!splitEnabled}
                  className={styles.splitToggleOption}
                  data-active={!splitEnabled ? "true" : undefined}
                  data-mode="blocking"
                  onClick={() => setSplit(false)}
                >
                  blocking
                </button>
              </div>
            </div>
          )}

          {/* X-ray toggle — flips the chat UI into a state-inspector
           * view, revealing each component's props/state. */}
          <div
            className={styles.viewToggle}
            role="radiogroup"
            aria-label="View mode"
          >
            <span className={styles.viewToggleLabel}>View</span>
            <div className={styles.viewToggleTrack}>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "ui"}
                className={styles.viewToggleOption}
                data-active={viewMode === "ui" ? "true" : undefined}
                onClick={() => setViewMode("ui")}
              >
                <span aria-hidden>◐</span> UI
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "state"}
                className={styles.viewToggleOption}
                data-active={viewMode === "state" ? "true" : undefined}
                data-mode="state"
                onClick={() => setViewMode("state")}
              >
                <span aria-hidden>◉</span> state
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blurb */}
      <AnimatePresence mode="wait">
        <motion.p
          key={`blurb-${scenarioIdx}`}
          className={styles.blurb}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
        >
          {scenario.blurb}
        </motion.p>
      </AnimatePresence>

      {/* Stage board: WS wire + ChatPane frame with mock UI inside.
       *
       * Everything is a real-looking chat component. State changes happen
       * inside these components (badges flash, icons morph, bubbles slide
       * in) — there is no separate "info panel". Flying chips overlay
       * the board, arcing between components along the data-flow paths. */}
      <div
        ref={boardRef}
        className={styles.board}
        data-view-mode={viewMode}
      >
        <NetworkRegion
          wsActivity={scene.state.ws}
          reducedMotion={reducedMotion}
          inspector={inspectors?.network}
          wsInspector={inspectors?.ws}
          inspectorKey={inspectorKey}
        />

        <ChatPaneFrame
          snapshot={scene.state.chatpane}
          prevSnapshot={prevScene?.state.chatpane}
          reducedMotion={reducedMotion}
          inspector={inspectors?.chatpane}
          inspectorKey={inspectorKey}
        >
          <StatusBar
            indicator={scene.state.status}
            reducedMotion={reducedMotion}
            inspector={inspectors?.statusbar}
            inspectorKey={inspectorKey}
            armActive={activeArms.has("StatusBar")}
          />
          <MessageList
            messages={scene.state.messages}
            activeMessageId={scene.state.activeMessageId}
            typingUsers={scene.state.typingUsers}
            reducedMotion={reducedMotion}
            inspector={inspectors?.messagelist}
            bubbleInspector={
              inspectors?.messagebubble &&
              inspectors.messagebubble.length > 0
                ? inspectors.messagebubble
                : undefined
            }
            inspectorKey={inspectorKey}
            armActive={activeArms.has("MessageList")}
          />
          <ComposeBar
            text={scene.state.composeText}
            focused={scene.state.composeFocused}
            buttonGlow={scene.state.sendButtonGlow}
            reducedMotion={reducedMotion}
            inspector={inspectors?.composebar}
            inspectorKey={inspectorKey}
            armActive={activeArms.has("ComposeBar")}
          />
        </ChatPaneFrame>

        <FlyingChipsLayer
          chips={scene.state.flyingChips}
          anchors={anchors}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Caption — narration tied to the current scene */}
      <div className={styles.captionWrap}>
        <AnimatePresence mode="wait">
          <motion.p
            key={`caption-${scenarioIdx}-${splitEnabled}-${stepIdx}`}
            className={styles.caption}
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITION.crossfade}
          >
            <span className={styles.captionStep}>
              step {stepIdx + 1} / {totalSteps}
            </span>
            <span className={styles.captionText}>{scene.caption}</span>
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Scrub controls */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={goPrev}
          disabled={stepIdx === 0}
          aria-label="Previous step"
        >
          ←
        </button>
        <div className={styles.scrubTrack} role="group" aria-label="Step scrub">
          {activeScenes.map((_, i) => {
            const isActive = i === stepIdx;
            const isVisited = i < stepIdx;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Jump to step ${i + 1}`}
                aria-current={isActive ? "step" : undefined}
                className={styles.scrubDot}
                data-state={
                  isActive ? "active" : isVisited ? "visited" : "future"
                }
                onClick={() => scrubTo(i)}
              />
            );
          })}
        </div>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={goNext}
          disabled={stepIdx >= totalSteps - 1}
          aria-label="Next step"
        >
          →
        </button>
        <button
          type="button"
          className={styles.controlBtnPrimary}
          onClick={togglePlay}
          aria-label={
            isPlaying
              ? "Pause"
              : stepIdx >= totalSteps - 1
                ? "Replay"
                : "Play"
          }
        >
          {isPlaying ? "❚❚" : stepIdx >= totalSteps - 1 ? "↻" : "▶"}
        </button>
      </div>
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SCRIPTS,
  SCRIPT_BY_ID,
  buildClickEvent,
  buildSingleBundle,
  buildRouteSplit,
  buildDeferred,
  buildYielded,
  buildWorker,
  buildFromZones,
  computeTTI,
  countLongTasks,
  dropOnWorker,
  postLessonZoneMap,
  scriptCost,
  ttiFromZones,
  ttiRating,
  type FlameBlock,
  type InputEvent,
  type ScriptId,
  type TTIRating,
  type Zone,
} from "./engine/js-perf-simulator";

type StepBlocks = {
  blocks: FlameBlock[];
  firstPaintMs?: number;
  highlightId?: ScriptId;
  clickEvent?: InputEvent;
};

function getStepBlocks(activeStep: number, zones: Map<ScriptId, Zone>): StepBlocks {
  switch (activeStep) {
    case 1:
      return { blocks: buildSingleBundle() };
    case 2:
      return { blocks: buildRouteSplit(), firstPaintMs: 2150 };
    case 3:
      return { blocks: buildDeferred(), firstPaintMs: 1500, highlightId: "charting-lib" };
    case 4:
      return {
        blocks: buildYielded(),
        firstPaintMs: 1500,
        highlightId: "data-processor",
        clickEvent: buildClickEvent(),
      };
    case 5:
      return { blocks: buildWorker(), firstPaintMs: 1500, highlightId: "data-processor" };
    case 6:
      return { blocks: buildFromZones(zones), firstPaintMs: 1500 };
    default:
      return { blocks: buildSingleBundle() };
  }
}

type DragState = {
  draggedId: ScriptId | null;
  hoverZone: Zone | null;
  bounceMessage: string | null;
  bounceShakeId: ScriptId | null;
  insightMessage: string | null;
};

type JSPerfContextValue = {
  activeStep: number;
  zones: Map<ScriptId, Zone>;
  stepBlocks: FlameBlock[];
  firstPaintMs?: number;
  highlightId?: ScriptId;
  clickEvent?: InputEvent;
  tti: number;
  ttiRating: TTIRating;
  longTaskCount: number;
  drag: DragState;
  startDrag: (id: ScriptId, source: Zone) => void;
  enterZone: (zone: Zone) => void;
  drop: (target: Zone, scriptId: ScriptId) => void;
  resetZones: () => void;
  dismissBounce: () => void;
};

const JSPerfContext = createContext<JSPerfContextValue | null>(null);

export function useJSPerfContext(): JSPerfContextValue {
  const ctx = useContext(JSPerfContext);
  if (!ctx) throw new Error("useJSPerfContext must be used inside <JSPerfProvider>");
  return ctx;
}

export function JSPerfProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  // Step 6 picks up where step 5 left off — every script the lesson
  // already taught how to relocate stays relocated. The user re-classifies
  // what remains instead of starting from scratch.
  const [zones, setZones] = useState<Map<ScriptId, Zone>>(() => postLessonZoneMap());
  const [draggedId, setDraggedId] = useState<ScriptId | null>(null);
  const [hoverZone, setHoverZone] = useState<Zone | null>(null);
  const [bounceMessage, setBounceMessage] = useState<string | null>(null);
  const [bounceShakeId, setBounceShakeId] = useState<ScriptId | null>(null);
  const [insightMessage, setInsightMessage] = useState<string | null>(null);
  const dragSourceRef = useRef<Zone | null>(null);

  const { blocks, firstPaintMs, highlightId, clickEvent } = useMemo(
    () => getStepBlocks(activeStep, zones),
    [activeStep, zones],
  );

  const tti = useMemo(
    () => (activeStep === 6 ? ttiFromZones(zones) : computeTTI(blocks, firstPaintMs)),
    [activeStep, zones, blocks, firstPaintMs],
  );

  const longTaskCount = useMemo(() => countLongTasks(blocks), [blocks]);

  const startDrag = useCallback((id: ScriptId, source: Zone) => {
    setDraggedId(id);
    dragSourceRef.current = source;
  }, []);

  const enterZone = useCallback((zone: Zone) => {
    setHoverZone(zone);
  }, []);

  const drop = useCallback((target: Zone, scriptId: ScriptId) => {
    const source = dragSourceRef.current;
    const script = SCRIPT_BY_ID[scriptId];
    if (target === source) {
      setDraggedId(null);
      setHoverZone(null);
      return;
    }
    if (target === "worker") {
      const result = dropOnWorker(scriptId);
      if (!result.accepted) {
        setBounceMessage(result.message);
        setBounceShakeId(scriptId);
        window.setTimeout(() => setBounceShakeId(null), 500);
        setDraggedId(null);
        setHoverZone(null);
        return;
      }
      setZones((prev) => new Map(prev).set(scriptId, "worker"));
      setBounceMessage(null);
      setInsightMessage(result.message);
      setDraggedId(null);
      setHoverZone(null);
      return;
    }
    setZones((prev) => new Map(prev).set(scriptId, target));
    setBounceMessage(null);
    setDraggedId(null);
    setHoverZone(null);
    if (target === "critical" && !script.isRouteCritical) {
      setInsightMessage(
        `${script.label} isn't needed for this route — putting it on the critical path adds ${scriptCost(script)} ms of parse + execute the user has to wait through.`,
      );
    } else if (target === "deferred" && script.isRouteCritical) {
      setInsightMessage(
        `Heads up: ${script.label} is needed to render this route. Deferring it means the user sees a loading state. TTI looks faster, but the page is broken until the deferred chunk lands.`,
      );
    } else if (target === "deferred") {
      setInsightMessage(
        `${script.label} deferred — saved ${scriptCost(script)} ms on the critical path. Browser parses it on idle, or when the user reaches the feature.`,
      );
    } else {
      setInsightMessage(
        `${script.label} restored to the critical path — TTI grows by ${scriptCost(script)} ms. The relationship is linear: every ms of script on critical is a ms of waiting.`,
      );
    }
  }, []);

  const resetZones = useCallback(() => {
    setZones(postLessonZoneMap());
    setBounceMessage(null);
    setBounceShakeId(null);
    setInsightMessage(null);
  }, []);

  const dismissBounce = useCallback(() => {
    setBounceMessage(null);
  }, []);

  const value = useMemo<JSPerfContextValue>(
    () => ({
      activeStep,
      zones,
      stepBlocks: blocks,
      firstPaintMs,
      highlightId,
      clickEvent,
      tti,
      ttiRating: ttiRating(tti),
      longTaskCount,
      drag: {
        draggedId,
        hoverZone,
        bounceMessage,
        bounceShakeId,
        insightMessage,
      },
      startDrag,
      enterZone,
      drop,
      resetZones,
      dismissBounce,
    }),
    [
      activeStep,
      zones,
      blocks,
      firstPaintMs,
      highlightId,
      clickEvent,
      tti,
      longTaskCount,
      draggedId,
      hoverZone,
      bounceMessage,
      bounceShakeId,
      insightMessage,
      startDrag,
      enterZone,
      drop,
      resetZones,
      dismissBounce,
    ],
  );

  return <JSPerfContext.Provider value={value}>{children}</JSPerfContext.Provider>;
}

export { SCRIPTS, SCRIPT_BY_ID };
export type { ScriptId, Zone };

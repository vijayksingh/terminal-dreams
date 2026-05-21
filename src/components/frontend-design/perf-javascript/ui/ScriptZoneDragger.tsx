"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DURATION, SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  SCRIPTS,
  SCRIPT_BY_ID,
  scriptCost,
  type ScriptId,
  type Zone,
} from "../engine/js-perf-simulator";
import { useJSPerfContext } from "../js-perf-context";
import styles from "../JavaScriptPerfLab.module.css";

const ZONE_ORDER: Zone[] = ["critical", "deferred", "worker"];

const ZONE_LABEL: Record<Zone, string> = {
  critical: "Critical Path",
  deferred: "Deferred",
  worker: "Web Worker",
};

export function ScriptZoneDragger() {
  const reducedMotion = usePrefersReducedMotion();
  const ctx = useJSPerfContext();
  const { zones, tti, ttiRating, drag, startDrag, enterZone, drop, resetZones } = ctx;
  const [announcement, setAnnouncement] = useState<string>("");

  // Announce TTI / bounce / insight changes for screen readers
  useEffect(() => {
    if (drag.bounceMessage) setAnnouncement(`Rejected: ${drag.bounceMessage}`);
    else if (drag.insightMessage) setAnnouncement(drag.insightMessage);
  }, [drag.bounceMessage, drag.insightMessage]);

  const moveScript = useCallback(
    (scriptId: ScriptId, target: Zone) => {
      const source = (zones.get(scriptId) ?? SCRIPT_BY_ID[scriptId].defaultZone) as Zone;
      if (source === target) return;
      startDrag(scriptId, source);
      drop(target, scriptId);
    },
    [zones, startDrag, drop],
  );

  return (
    <div className={styles.dragInteractive}>
      <div className={styles.interactiveHeader}>
        <span className={styles.interactiveTitle}>Script priority sorter</span>
        <button type="button" className={styles.resetButton} onClick={resetZones}>
          Reset
        </button>
      </div>

      <div className={styles.ttiHeadline}>
        <span className={styles.ttiHeadlineLabel}>Live TTI</span>
        <span
          className={styles.ttiHeadlineValue}
          data-rating={ttiRating}
          aria-live="polite"
        >
          {(tti / 1000).toFixed(2)}s
        </span>
        <span className={styles.ttiFormula}>
          = sum(parse + execute) of every script in <strong>critical</strong>
        </span>
      </div>

      <p className={styles.keyboardHint}>
        Drag with the mouse, or focus a script and press <kbd>1</kbd> Critical · <kbd>2</kbd> Deferred · <kbd>3</kbd> Worker · <kbd>←</kbd>/<kbd>→</kbd> to cycle zones.
      </p>

      <div className={styles.zoneGrid} onDragOver={(e) => e.preventDefault()}>
        <DragZone
          zone="critical"
          label="Critical Path"
          sublabel="Runs before TTI — every ms here is wait time"
          color="var(--color-error)"
          zones={zones}
          hoverZone={drag.hoverZone}
          draggedId={drag.draggedId}
          bounceShakeId={drag.bounceShakeId}
          reducedMotion={reducedMotion}
          onDragStart={startDrag}
          onDragEnter={() => enterZone("critical")}
          onDrop={(id) => drop("critical", id)}
          onMove={moveScript}
        />
        <DragZone
          zone="deferred"
          label="Deferred"
          sublabel="Loads on demand — off the critical path"
          color="var(--color-success)"
          zones={zones}
          hoverZone={drag.hoverZone}
          draggedId={drag.draggedId}
          bounceShakeId={drag.bounceShakeId}
          reducedMotion={reducedMotion}
          onDragStart={startDrag}
          onDragEnter={() => enterZone("deferred")}
          onDrop={(id) => drop("deferred", id)}
          onMove={moveScript}
        />
        <DragZone
          zone="worker"
          label="Web Worker"
          sublabel="Pure computation only — no DOM, no window"
          color="var(--diagram-layer-4)"
          zones={zones}
          hoverZone={drag.hoverZone}
          draggedId={drag.draggedId}
          bounceShakeId={drag.bounceShakeId}
          reducedMotion={reducedMotion}
          onDragStart={startDrag}
          onDragEnter={() => enterZone("worker")}
          onDrop={(id) => drop("worker", id)}
          onMove={moveScript}
        />
      </div>

      <AnimatePresence mode="wait">
        {drag.bounceMessage && (
          <motion.div
            key="bounce"
            className={styles.bounceMessage}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={TRANSITION.enterCard}
            role="alert"
          >
            <span className={styles.bounceIcon}>!</span>
            <span>{drag.bounceMessage}</span>
          </motion.div>
        )}
        {!drag.bounceMessage && drag.insightMessage && (
          <motion.div
            key={drag.insightMessage}
            className={styles.insightMessage}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={TRANSITION.enterCard}
            role="status"
          >
            <span className={styles.insightIcon}>+</span>
            <span>{drag.insightMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <span className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

interface DragZoneProps {
  zone: Zone;
  label: string;
  sublabel: string;
  color: string;
  zones: Map<ScriptId, Zone>;
  hoverZone: Zone | null;
  draggedId: ScriptId | null;
  bounceShakeId: ScriptId | null;
  reducedMotion: boolean;
  onDragStart: (id: ScriptId, source: Zone) => void;
  onDragEnter: () => void;
  onDrop: (id: ScriptId) => void;
  onMove: (id: ScriptId, target: Zone) => void;
}

function DragZone({
  zone,
  label,
  sublabel,
  color,
  zones,
  hoverZone,
  draggedId,
  bounceShakeId,
  reducedMotion,
  onDragStart,
  onDragEnter,
  onDrop,
  onMove,
}: DragZoneProps) {
  const inZone = SCRIPTS.filter((s) => zones.get(s.id) === zone);
  const sumMs = inZone.reduce((s, x) => s + scriptCost(x), 0);

  return (
    <div
      className={styles.dragZone}
      style={{ ["--zone-color" as string]: color }}
      data-empty={inZone.length === 0 ? "true" : undefined}
      data-hover={hoverZone === zone ? "true" : undefined}
      data-zone={zone}
      onDragOver={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain") as ScriptId;
        if (id) onDrop(id);
      }}
      aria-label={`${label} zone, ${inZone.length} script${inZone.length === 1 ? "" : "s"}`}
    >
      <div className={styles.zoneHeader}>
        <span className={styles.zoneTitle}>{label}</span>
        <span className={styles.zoneCount}>
          {inZone.length} {inZone.length === 1 ? "script" : "scripts"}
          {zone === "critical" && (
            <span className={styles.zoneSum}> · {sumMs}ms</span>
          )}
        </span>
      </div>
      <div className={styles.zoneSubtitle}>{sublabel}</div>
      <div className={styles.zoneBody}>
        {inZone.length === 0 ? (
          <div className={styles.zoneEmpty}>drop scripts here</div>
        ) : (
          inZone.map((s) => (
            <ScriptCard
              key={s.id}
              scriptId={s.id}
              sourceZone={zone}
              draggedId={draggedId}
              bounceShakeId={bounceShakeId}
              reducedMotion={reducedMotion}
              onDragStart={onDragStart}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ScriptCardProps {
  scriptId: ScriptId;
  sourceZone: Zone;
  draggedId: ScriptId | null;
  bounceShakeId: ScriptId | null;
  reducedMotion: boolean;
  onDragStart: (id: ScriptId, source: Zone) => void;
  onMove: (id: ScriptId, target: Zone) => void;
}

function ScriptCard({
  scriptId,
  sourceZone,
  draggedId,
  bounceShakeId,
  reducedMotion,
  onDragStart,
  onMove,
}: ScriptCardProps) {
  const s = SCRIPT_BY_ID[scriptId];
  const isDragging = draggedId === scriptId;
  const shaking = bounceShakeId === scriptId;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = keyboardTarget(e.key, sourceZone);
    if (target === null) return;
    e.preventDefault();
    onMove(scriptId, target);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", scriptId);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(scriptId, sourceZone);
  };

  return (
    <motion.div
      animate={
        shaking && !reducedMotion
          ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
          : { x: 0 }
      }
      transition={shaking && !reducedMotion ? { duration: DURATION.slow } : SPRING.snappy}
      layout={!reducedMotion}
    >
      <div
        className={styles.scriptCard}
        style={{ ["--card-color" as string]: s.color }}
        draggable
        tabIndex={0}
        role="button"
        aria-label={`${s.label}, ${s.sizeKB} kilobytes, ${scriptCost(s)} milliseconds, currently in ${ZONE_LABEL[sourceZone]}. Press 1 for Critical, 2 for Deferred, 3 for Worker.`}
        data-dragging={isDragging ? "true" : undefined}
        data-can-worker={s.canWorker ? "true" : undefined}
        data-route-critical={s.isRouteCritical ? "true" : undefined}
        data-shaking={shaking ? "true" : undefined}
        onDragStart={handleDragStart}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.scriptCardDot} aria-hidden />
        <div className={styles.scriptCardBody}>
          <span className={styles.scriptCardLabel}>{s.label}</span>
          <span className={styles.scriptCardMeta}>
            {s.sizeKB}KB · {scriptCost(s)}ms
          </span>
        </div>
        {s.canWorker && (
          <span className={styles.scriptCardBadge} title="Pure computation — can run on a Web Worker">
            worker-safe
          </span>
        )}
      </div>
      <div className={styles.scriptCardActions} aria-label={`Move ${s.label}`}>
        {ZONE_ORDER.filter((z) => z !== sourceZone).map((z) => (
          <button
            key={z}
            type="button"
            className={styles.scriptCardMoveBtn}
            data-target={z}
            onClick={() => onMove(scriptId, z)}
            aria-label={`Move ${s.label} to ${ZONE_LABEL[z]}`}
          >
            → {ZONE_LABEL[z]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function keyboardTarget(key: string, source: Zone): Zone | null {
  if (key === "1") return "critical";
  if (key === "2") return "deferred";
  if (key === "3") return "worker";
  if (key === "ArrowRight") {
    const i = ZONE_ORDER.indexOf(source);
    return ZONE_ORDER[(i + 1) % ZONE_ORDER.length];
  }
  if (key === "ArrowLeft") {
    const i = ZONE_ORDER.indexOf(source);
    return ZONE_ORDER[(i - 1 + ZONE_ORDER.length) % ZONE_ORDER.length];
  }
  return null;
}

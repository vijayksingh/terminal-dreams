"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FlyingChip as FlyingChipData, StageAnchor } from "./types";
import styles from "./stage.module.css";

export type AnchorMap = Partial<Record<StageAnchor, { x: number; y: number }>>;

/** Measure the center of every [data-port] descendant of `container`. */
function readAnchors(container: HTMLElement): AnchorMap {
  const out: AnchorMap = {};
  const rect = container.getBoundingClientRect();
  const ports = container.querySelectorAll<HTMLElement>("[data-port]");
  ports.forEach((el) => {
    const id = el.dataset.port as StageAnchor | undefined;
    if (!id) return;
    const r = el.getBoundingClientRect();
    out[id] = {
      x: r.left - rect.left + r.width / 2,
      y: r.top - rect.top + r.height / 2,
    };
  });
  return out;
}

/** Hook that returns a fresh anchor map whenever the board layout
 *  changes or `dep` (e.g. step index) advances. */
export function useStageAnchors(
  boardRef: React.RefObject<HTMLDivElement | null>,
  dep: unknown,
): AnchorMap {
  const [anchors, setAnchors] = useState<AnchorMap>({});

  // Recompute synchronously after any DOM change that might shift ports.
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    setAnchors(readAnchors(el));
  }, [boardRef, dep]);

  // Track resize of the board itself.
  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setAnchors(readAnchors(el));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [boardRef]);

  return anchors;
}

// Timing constants — chip + impact ripple need to be synced so the
// "land" reads as a single event.
const CHIP_FLIGHT_S = 0.95;
const CHIP_ARRIVAL_S = 0.85; // when chip visually arrives at destination
const IMPACT_DELAY_S = CHIP_ARRIVAL_S; // ripple starts as chip lands

// ── Chip particle ──────────────────────────────────────────────────

type FlyingChipProps = {
  chip: FlyingChipData;
  anchors: AnchorMap;
  reducedMotion: boolean;
};

export function FlyingChip({ chip, anchors, reducedMotion }: FlyingChipProps) {
  const src = anchors[chip.from];
  const dst = anchors[chip.to];
  if (!src || !dst) return null;

  const midX = (src.x + dst.x) / 2;
  const midY = (src.y + dst.y) / 2;
  const dy = dst.y - src.y;
  const arcOffset = Math.abs(dy) > 60 ? -12 : 0;

  return (
    <>
      {/* Trail: a fading line from source to current chip position.
       *
       * We render a dashed line as a backdrop that traces the chip's
       * full path. It appears just before the chip starts moving and
       * fades out as the chip arrives — giving the eye a clear
       * "data flowed THIS way" path, not just a fleeting dot. */}
      <ChipTrail
        src={src}
        dst={dst}
        reducedMotion={reducedMotion}
      />

      <motion.div
        className={styles.chip}
        data-kind={chip.kind}
        initial={
          reducedMotion
            ? { left: dst.x, top: dst.y, opacity: 1, scale: 1 }
            : { left: src.x, top: src.y, opacity: 0, scale: 0.45 }
        }
        animate={
          reducedMotion
            ? { left: dst.x, top: dst.y, opacity: 1, scale: 1 }
            : {
                left: [src.x, midX, dst.x],
                top: [src.y, midY + arcOffset, dst.y],
                opacity: [0, 1, 1, 1, 0],
                scale: [0.45, 1, 1, 1.15, 0],
              }
        }
        exit={
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.4, transition: { duration: 0.12 } }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                duration: CHIP_FLIGHT_S,
                times: [0, 0.5, 1],
                ease: "easeInOut",
                // 5-keyframe opacity/scale: enter, settle, hold, burst, snap.
                opacity: { times: [0, 0.18, 0.78, 0.88, 1], duration: CHIP_FLIGHT_S },
                scale: { times: [0, 0.18, 0.78, 0.88, 1], duration: CHIP_FLIGHT_S },
              }
        }
        style={{ pointerEvents: "none" }}
      >
        <span className={styles.chipLabel}>{chip.label}</span>
        {chip.weightKB != null && (
          <span className={styles.chipWeight}>{chip.weightKB} KB</span>
        )}
      </motion.div>

      {/* Impact ripple — fires when the chip lands. Anchored at the
       * destination, scales outward and fades. Sells the "arrival"
       * moment so the chip doesn't just dissolve into air. */}
      {!reducedMotion && (
        <ChipImpact dst={dst} kind={chip.kind} />
      )}
    </>
  );
}

function ChipTrail({
  src,
  dst,
  reducedMotion,
}: {
  src: { x: number; y: number };
  dst: { x: number; y: number };
  reducedMotion: boolean;
}) {
  if (reducedMotion) return null;
  const dx = dst.x - src.x;
  const dy = dst.y - src.y;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <motion.div
      className={styles.chipTrail}
      style={{
        left: src.x,
        top: src.y,
        width: length,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "0 50%",
      }}
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: [0, 0.6, 0.6, 0], scaleX: [0, 1, 1, 1] }}
      exit={{ opacity: 0 }}
      transition={{
        duration: CHIP_FLIGHT_S,
        times: [0, 0.35, 0.7, 1],
        ease: "easeOut",
      }}
    />
  );
}

function ChipImpact({
  dst,
  kind,
}: {
  dst: { x: number; y: number };
  kind: FlyingChipData["kind"];
}) {
  return (
    <>
      {/* Outer ring ripple */}
      <motion.div
        className={styles.chipImpactRing}
        data-kind={kind}
        style={{ left: dst.x, top: dst.y }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 2.6], opacity: [0, 0.85, 0] }}
        transition={{
          delay: IMPACT_DELAY_S,
          duration: 0.7,
          times: [0, 0.3, 1],
          ease: "easeOut",
        }}
      />
      {/* Solid burst dot */}
      <motion.div
        className={styles.chipImpactDot}
        data-kind={kind}
        style={{ left: dst.x, top: dst.y }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 0.8], opacity: [0, 1, 0] }}
        transition={{
          delay: IMPACT_DELAY_S - 0.04,
          duration: 0.5,
          times: [0, 0.35, 1],
          ease: "easeOut",
        }}
      />
    </>
  );
}

export function FlyingChipsLayer({
  chips,
  anchors,
  reducedMotion,
}: {
  chips: FlyingChipData[];
  anchors: AnchorMap;
  reducedMotion: boolean;
}) {
  return (
    <div className={styles.chipsLayer} aria-hidden>
      <AnimatePresence>
        {chips.map((chip) => (
          <FlyingChip
            key={chip.id}
            chip={chip}
            anchors={anchors}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TRANSITION } from "@/lib/motion";
import type { CSSProperties } from "react";
import { CONNECTOR, COLOR_MAP, type DemoColor } from "./demo-tokens";
import { annotationPill } from "./pill-style";
import { useAnnotationVisibility } from "./annotation-context";

type AtPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-center"
  | "right-center";

type AnnotationProps = {
  value: string;
  at: AtPosition;
  color?: DemoColor;
  connector?: "corner" | "line" | "none";
  visible?: boolean;
};

const NONE_GAP = 4;
const CONNECTOR_GAP = 2;

function atStyles(at: AtPosition, connector: string): CSSProperties {
  const gap = connector === "none" ? NONE_GAP : CONNECTOR_GAP;
  const base: CSSProperties = { position: "absolute" };
  const hGap = NONE_GAP;

  switch (at) {
    case "top-left":
      return { ...base, bottom: `calc(100% + ${gap}px)`, left: 0 };
    case "top-center":
      return { ...base, bottom: `calc(100% + ${gap}px)`, left: "50%", transform: "translateX(-50%)" };
    case "top-right":
      return { ...base, bottom: `calc(100% + ${gap}px)`, right: 0 };
    case "bottom-left":
      return { ...base, top: `calc(100% + ${gap}px)`, left: 0 };
    case "bottom-center":
      return { ...base, top: `calc(100% + ${gap}px)`, left: "50%", transform: "translateX(-50%)" };
    case "bottom-right":
      return { ...base, top: `calc(100% + ${gap}px)`, right: 0 };
    case "left-center":
      return { ...base, right: `calc(100% + ${hGap}px)`, top: "50%", transform: "translateY(-50%)" };
    case "right-center":
      return { ...base, left: `calc(100% + ${hGap}px)`, top: "50%", transform: "translateY(-50%)" };
  }
}

function isVertical(at: AtPosition): boolean {
  return at.startsWith("top") || at.startsWith("bottom");
}

function isBottomPosition(at: AtPosition): boolean {
  return at.startsWith("bottom");
}

function isRightSide(at: AtPosition): boolean {
  return at.includes("right");
}

function connectorTransform(flip: boolean, mirror: boolean): CSSProperties | undefined {
  if (!flip && !mirror) return undefined;
  const parts: string[] = [];
  if (mirror) parts.push("scaleX(-1)");
  if (flip) parts.push("scaleY(-1)");
  return { transform: parts.join(" ") };
}

function ConnectorLine({ color }: { color: DemoColor }) {
  const c = COLOR_MAP[color];
  return (
    <svg
      width={1}
      height={CONNECTOR.lineLength}
      viewBox={`0 0 1 ${CONNECTOR.lineLength}`}
      style={{ display: "block", margin: "0 auto", overflow: "visible" }}
      aria-hidden="true"
    >
      <line
        x1={0.5}
        y1={0}
        x2={0.5}
        y2={CONNECTOR.lineLength}
        stroke={c.border}
        strokeWidth={CONNECTOR.strokeWidth}
        strokeDasharray={CONNECTOR.dashArray}
      />
      <circle cx={0.5} cy={CONNECTOR.lineLength} r={1.5} fill={c.dot} />
    </svg>
  );
}

function ConnectorCorner({ color }: { color: DemoColor }) {
  const c = COLOR_MAP[color];
  const s = CONNECTOR.cornerSize;
  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={{ display: "block", margin: "2px auto 0", overflow: "visible" }}
      aria-hidden="true"
    >
      <path
        d={`M${s / 2} 0 L${s / 2} ${s * 0.5} Q${s / 2} ${s * 0.7} ${s * 0.15} ${s * 0.85}`}
        fill="none"
        stroke={c.border}
        strokeWidth={CONNECTOR.strokeWidth}
        strokeDasharray={CONNECTOR.dashArray}
      />
      <circle cx={s * 0.15} cy={s * 0.85} r={1.5} fill={c.dot} />
    </svg>
  );
}

export function Annotation({
  value,
  at,
  color = "neutral",
  connector = "none",
  visible = true,
}: AnnotationProps) {
  const reducedMotion = usePrefersReducedMotion();
  const groupVisible = useAnnotationVisibility();
  const effectiveVisible = groupVisible && visible;

  const effectiveConnector = isVertical(at) ? connector : "none";
  const flip = isBottomPosition(at);
  const mirror = isRightSide(at);

  const connectorEl =
    effectiveConnector === "line" ? (
      <div style={connectorTransform(flip, false)}>
        <ConnectorLine color={color} />
      </div>
    ) : effectiveConnector === "corner" ? (
      <div style={connectorTransform(flip, mirror)}>
        <ConnectorCorner color={color} />
      </div>
    ) : null;

  const pill = <span style={annotationPill(color)}>{value}</span>;

  const content = flip ? (
    <>
      {connectorEl}
      {pill}
    </>
  ) : (
    <>
      {pill}
      {connectorEl}
    </>
  );

  const positionStyle = atStyles(at, effectiveConnector);

  if (reducedMotion) {
    return (
      <span style={positionStyle}>
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: effectiveVisible ? 1 : 0,
          }}
        >
          {content}
        </span>
      </span>
    );
  }

  return (
    <span style={positionStyle}>
      <motion.span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        initial={{ opacity: 0, y: flip ? 4 : -4 }}
        animate={{
          opacity: effectiveVisible ? 1 : 0,
          y: effectiveVisible ? 0 : flip ? 4 : -4,
        }}
        transition={TRANSITION.enterItem}
      >
        {content}
      </motion.span>
    </span>
  );
}

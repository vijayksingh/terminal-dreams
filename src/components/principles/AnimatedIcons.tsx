"use client";

/**
 * AnimatedIconGrid — Six semantically animated action icons
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ STORYBOARD                                                         │
 * ├──────────┬──────────────────────────────────────────────────────────┤
 * │ Copy     │ Page peel: front page (rect) lifts and rotates like     │
 * │          │ picking up a card, back page stroke draws in (new copy  │
 * │          │ materializing), then front page settles back down.      │
 * ├──────────┼──────────────────────────────────────────────────────────┤
 * │ Share    │ Network broadcast: connection lines draw outward from   │
 * │          │ center via stroke-dashoffset, then the three node       │
 * │          │ circles pulse/scale up with staggered timing.           │
 * ├──────────┼──────────────────────────────────────────────────────────┤
 * │ Bookmark │ Drop into slot: icon drops down 3px (tucking into a    │
 * │          │ pocket) with a subtle scaleY squeeze, then bounces      │
 * │          │ back up with a satisfying overshoot.                    │
 * ├──────────┼──────────────────────────────────────────────────────────┤
 * │ Arrow    │ Fly out & return: icon launches diagonally (+6, -6)    │
 * │          │ while scaling to 0.6, wraps around (opacity 0 midway), │
 * │          │ then enters from the opposite corner and settles.       │
 * ├──────────┼──────────────────────────────────────────────────────────┤
 * │ Sparkles │ Twinkle burst: the three sparkle points scale and      │
 * │          │ rotate individually via staggered keyframes. The whole  │
 * │          │ icon does a gentle 15-degree rock while particles glow. │
 * ├──────────┼──────────────────────────────────────────────────────────┤
 * │ Undo     │ Counter-clockwise spin: icon rotates -360 degrees with │
 * │          │ a spring that overshoots, giving a rewinding feel.      │
 * │          │ Slight scale bump at the end for a "landed" beat.       │
 * └──────────┴──────────────────────────────────────────────────────────┘
 *
 * Tabs:
 *   "motion" — framer-motion (spring physics, variants, AnimatePresence)
 *   "css"    — CSS keyframes via inline style injection (pure CSS animations)
 *   "svg"    — SVG SMIL <animate> elements (declarative SVG animation)
 */

import { useState } from "react";
import { motion, type Transition } from "framer-motion";
import {
  Copy,
  Share2,
  Bookmark,
  ArrowUpRight,
  Sparkles,
  Undo2,
} from "lucide-react";
import { SPRING, DURATION } from "@/lib/motion";

// ── Types ────────────────────────────────────────────────────────────

type AnimationTab = "motion" | "css" | "svg";

interface AnimatedIconGridProps {
  activeTab: AnimationTab;
}

// ── Shared tile styles ───────────────────────────────────────────────

const TILE_SIZE = 48;
const ICON_SIZE = 20;
const STROKE_WIDTH = 1.5;

const tileStyle: React.CSSProperties = {
  width: TILE_SIZE,
  height: TILE_SIZE,
  borderRadius: "var(--radius-2)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--color-foreground)",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--color-muted)",
};

// ── Spring tuned for micro-interactions ──────────────────────────────

const BOUNCY_SPRING: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 15,
};

// ══════════════════════════════════════════════════════════════════════
// FRAMER-MOTION ANIMATED ICONS (tab: "motion")
//
// Every animation is two-state (rest ↔ hover) with spring transitions.
// No keyframe arrays — springs interpolate between exactly two values,
// so every animation is fully interruptible: hover off mid-flight and
// the spring reverses from its current position.
// ══════════════════════════════════════════════════════════════════════

function MotionCopyIcon() {
  const [hovered, setHovered] = useState(false);
  const backPagePath = "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1";
  const backPageLength = 42;

  return (
    <motion.div
      style={tileStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ borderColor: "var(--color-accent)" }}
      transition={{ duration: DURATION.instant }}
    >
      <svg
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d={backPagePath}
          strokeDasharray={backPageLength}
          animate={{
            strokeDashoffset: hovered ? 0 : backPageLength,
            opacity: hovered ? 1 : 0.4,
          }}
          transition={SPRING.snappy}
        />
        <motion.rect
          x="9" y="9" width="13" height="13" rx="2" ry="2"
          style={{ transformOrigin: "22px 22px" }}
          animate={{ y: hovered ? -3 : 0, rotate: hovered ? -6 : 0 }}
          transition={BOUNCY_SPRING}
        />
      </svg>
    </motion.div>
  );
}

function MotionShareIcon() {
  const [hovered, setHovered] = useState(false);
  const lineLength = 10;

  return (
    <motion.div
      style={tileStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ borderColor: "var(--color-accent)" }}
      transition={{ duration: DURATION.instant }}
    >
      <svg
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.line
          x1="8.59" y1="13.51" x2="15.42" y2="17.49"
          strokeDasharray={lineLength}
          animate={{ strokeDashoffset: hovered ? 0 : lineLength }}
          transition={SPRING.snappy}
        />
        <motion.line
          x1="15.41" y1="6.51" x2="8.59" y2="10.49"
          strokeDasharray={lineLength}
          animate={{ strokeDashoffset: hovered ? 0 : lineLength }}
          transition={SPRING.snappy}
        />
        <motion.circle
          cx="6" cy="12" r="3"
          animate={{ scale: hovered ? 1.15 : 1 }}
          transition={SPRING.snappy}
          style={{ transformOrigin: "6px 12px" }}
        />
        <motion.circle
          cx="18" cy="5" r="3"
          animate={{ scale: hovered ? 1.35 : 1 }}
          transition={BOUNCY_SPRING}
          style={{ transformOrigin: "18px 5px" }}
        />
        <motion.circle
          cx="18" cy="19" r="3"
          animate={{ scale: hovered ? 1.35 : 1 }}
          transition={{ ...BOUNCY_SPRING, delay: hovered ? 0.06 : 0 }}
          style={{ transformOrigin: "18px 19px" }}
        />
      </svg>
    </motion.div>
  );
}

function MotionBookmarkIcon() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      style={tileStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ borderColor: "var(--color-accent)" }}
      transition={{ duration: DURATION.instant }}
    >
      <motion.div
        animate={{ y: hovered ? 4 : 0, scaleY: hovered ? 0.88 : 1 }}
        transition={BOUNCY_SPRING}
        style={{ display: "flex" }}
      >
        <Bookmark size={ICON_SIZE} strokeWidth={STROKE_WIDTH} />
      </motion.div>
    </motion.div>
  );
}

function MotionArrowIcon() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      style={tileStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ borderColor: "var(--color-accent)" }}
      transition={{ duration: DURATION.instant }}
    >
      <motion.div
        animate={{
          x: hovered ? 4 : 0,
          y: hovered ? -4 : 0,
          scale: hovered ? 0.85 : 1,
        }}
        transition={BOUNCY_SPRING}
        style={{ display: "flex" }}
      >
        <ArrowUpRight size={ICON_SIZE} strokeWidth={STROKE_WIDTH} />
      </motion.div>
    </motion.div>
  );
}

function MotionSparklesIcon() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      style={tileStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ borderColor: "var(--color-accent)" }}
      transition={{ duration: DURATION.instant }}
    >
      <motion.div
        animate={{
          rotate: hovered ? 15 : 0,
          scale: hovered ? 1.15 : 1,
          filter: hovered
            ? "drop-shadow(0 0 4px var(--color-accent))"
            : "drop-shadow(0 0 0px transparent)",
        }}
        transition={BOUNCY_SPRING}
        style={{ display: "flex" }}
      >
        <Sparkles size={ICON_SIZE} strokeWidth={STROKE_WIDTH} />
      </motion.div>
    </motion.div>
  );
}

function MotionUndoIcon() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      style={tileStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ borderColor: "var(--color-accent)" }}
      transition={{ duration: DURATION.instant }}
    >
      <motion.div
        animate={{ rotate: hovered ? -360 : 0, scale: hovered ? 1.1 : 1 }}
        transition={{
          rotate: BOUNCY_SPRING,
          scale: SPRING.snappy,
        }}
        style={{ display: "flex" }}
      >
        <Undo2 size={ICON_SIZE} strokeWidth={STROKE_WIDTH} />
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// CSS KEYFRAME ANIMATED ICONS (tab: "css")
// ══════════════════════════════════════════════════════════════════════

const CSS_KEYFRAMES = `
@keyframes ai-copy-hover {
  0%   { transform: translateY(0) rotate(0deg); }
  40%  { transform: translateY(-3px) rotate(-6deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
@keyframes ai-share-hover {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.15); }
  60%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
@keyframes ai-bookmark-hover {
  0%   { transform: translateY(0) scaleY(1); }
  35%  { transform: translateY(4px) scaleY(0.9); }
  70%  { transform: translateY(-2px) scaleY(1.05); }
  100% { transform: translateY(0) scaleY(1); }
}
@keyframes ai-arrow-hover {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  30%  { transform: translate(8px, -8px) scale(0.6); opacity: 0; }
  60%  { transform: translate(-6px, 6px) scale(0.6); opacity: 0; }
  100% { transform: translate(0, 0) scale(1); opacity: 1; }
}
@keyframes ai-sparkles-hover {
  0%   { transform: rotate(0deg) scale(1); }
  25%  { transform: rotate(-8deg) scale(1.15); }
  50%  { transform: rotate(8deg) scale(1.05); }
  75%  { transform: rotate(-4deg) scale(1.12); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes ai-undo-hover {
  0%   { transform: rotate(0deg) scale(1); }
  50%  { transform: rotate(-200deg) scale(1.1); }
  100% { transform: rotate(-360deg) scale(1); }
}
`;

function CssIconTile({
  animationName,
  duration = "0.5s",
  children,
}: {
  label: string;
  animationName: string;
  duration?: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...tileStyle,
        borderColor: hovered ? "var(--color-accent)" : "var(--color-border)",
        transition: `border-color ${DURATION.instant}s`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          display: "flex",
          animation: hovered
            ? `${animationName} ${duration} ease-in-out forwards`
            : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SVG SMIL ANIMATED ICONS (tab: "svg")
// ══════════════════════════════════════════════════════════════════════

function SvgIconTile({
  label,
  children,
}: {
  label: string;
  children: (hovered: boolean) => React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...tileStyle,
        borderColor: hovered ? "var(--color-accent)" : "var(--color-border)",
        transition: `border-color ${DURATION.instant}s`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children(hovered)}
    </div>
  );
}

function SvgCopyIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      {/* Back page — stroke draws in */}
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        strokeDasharray="42"
        strokeDashoffset={hovered ? "0" : "42"}
        opacity={hovered ? 1 : 0.4}
        style={{ transition: "stroke-dashoffset 0.4s ease-out, opacity 0.3s" }}
      />
      {/* Front page — lifts and rotates */}
      <g style={{ transformOrigin: "22px 22px" }}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-3; 0,0"
            dur="0.5s"
            repeatCount="1"
            fill="freeze"
          />
        )}
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 22 22; -6 22 22; 0 22 22"
            dur="0.5s"
            additive="sum"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
    </svg>
  );
}

function SvgShareIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      {/* Connection lines — draw via stroke-dashoffset */}
      <line
        x1="8.59" y1="13.51" x2="15.42" y2="17.49"
        strokeDasharray="10"
        strokeDashoffset={hovered ? "0" : "10"}
        style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
      />
      <line
        x1="15.41" y1="6.51" x2="8.59" y2="10.49"
        strokeDasharray="10"
        strokeDashoffset={hovered ? "0" : "10"}
        style={{ transition: "stroke-dashoffset 0.3s ease-out 0.05s" }}
      />
      {/* Center node — steady pulse */}
      <circle cx="6" cy="12" r="3"
        style={{
          transformOrigin: "6px 12px",
          transform: hovered ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.3s ease-out",
        }}
      />
      {/* Top-right node — delayed pulse */}
      <g style={{ transformOrigin: "18px 5px" }}>
        <circle cx="18" cy="5" r="3" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1; 1.4; 1"
            dur="0.4s"
            begin="0.15s"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
      {/* Bottom-right node — second stagger */}
      <g style={{ transformOrigin: "18px 19px" }}>
        <circle cx="18" cy="19" r="3" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1; 1.4; 1"
            dur="0.4s"
            begin="0.25s"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
    </svg>
  );
}

function SvgBookmarkIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <g>
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,3; 0,-1.5; 0,0"
            dur="0.45s"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
    </svg>
  );
}

function SvgArrowIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <g>
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 6,-6; -4,4; 0,0"
            dur="0.55s"
            repeatCount="1"
            fill="freeze"
          />
        )}
        {hovered && (
          <animate
            attributeName="opacity"
            values="1; 0; 0; 1"
            dur="0.55s"
            keyTimes="0; 0.3; 0.6; 1"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
    </svg>
  );
}

function SvgSparklesIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <g>
        {/* Main sparkle */}
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        {/* Small sparkle */}
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 12 12; -8 12 12; 8 12 12; -4 12 12; 0 12 12"
            dur="0.6s"
            repeatCount="1"
            fill="freeze"
          />
        )}
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1; 1.12; 1.05; 1.1; 1"
            dur="0.6s"
            additive="sum"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
    </svg>
  );
}

function SvgUndoIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <g>
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        {hovered && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 12 12; -360 12 12"
            dur="0.5s"
            repeatCount="1"
            fill="freeze"
          />
        )}
      </g>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SHARED LAYOUT — icon tile + label wrapper
// ══════════════════════════════════════════════════════════════════════

const ICON_LABELS = ["Copy", "Share", "Save", "Link", "Magic", "Undo"] as const;

const columnStyle: React.CSSProperties = {
  width: 72,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const gridStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-4)",
  justifyContent: "center",
  flexWrap: "wrap",
};

// ══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════

export function AnimatedIconGrid({ activeTab }: AnimatedIconGridProps) {
  switch (activeTab) {
    case "motion":
      return <MotionIconGrid />;
    case "css":
      return <CssIconGrid />;
    case "svg":
      return <SvgIconGrid />;
  }
}

function MotionIconGrid() {
  const tiles = [
    { label: "Copy", el: <MotionCopyIcon /> },
    { label: "Share", el: <MotionShareIcon /> },
    { label: "Save", el: <MotionBookmarkIcon /> },
    { label: "Link", el: <MotionArrowIcon /> },
    { label: "Magic", el: <MotionSparklesIcon /> },
    { label: "Undo", el: <MotionUndoIcon /> },
  ];

  return (
    <div style={gridStyle}>
      {tiles.map(({ label, el }) => (
        <div key={label} style={columnStyle}>
          {el}
          <span style={labelStyle}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function CssIconGrid() {
  const tiles = [
    { label: "Copy", animationName: "ai-copy-hover", Icon: Copy },
    { label: "Share", animationName: "ai-share-hover", Icon: Share2 },
    { label: "Save", animationName: "ai-bookmark-hover", duration: "0.45s" as const, Icon: Bookmark },
    { label: "Link", animationName: "ai-arrow-hover", duration: "0.55s" as const, Icon: ArrowUpRight },
    { label: "Magic", animationName: "ai-sparkles-hover", duration: "0.6s" as const, Icon: Sparkles },
    { label: "Undo", animationName: "ai-undo-hover", Icon: Undo2 },
  ];

  return (
    <div style={gridStyle}>
      <style dangerouslySetInnerHTML={{ __html: CSS_KEYFRAMES }} />
      {tiles.map(({ label, animationName, duration, Icon }) => (
        <div key={label} style={columnStyle}>
          <CssIconTile
            label={label}
            animationName={animationName}
            duration={duration}
          >
            <Icon size={ICON_SIZE} strokeWidth={STROKE_WIDTH} />
          </CssIconTile>
          <span style={labelStyle}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function SvgIconGrid() {
  const tiles = [
    { label: "Copy", render: (h: boolean) => <SvgCopyIcon hovered={h} /> },
    { label: "Share", render: (h: boolean) => <SvgShareIcon hovered={h} /> },
    { label: "Save", render: (h: boolean) => <SvgBookmarkIcon hovered={h} /> },
    { label: "Link", render: (h: boolean) => <SvgArrowIcon hovered={h} /> },
    { label: "Magic", render: (h: boolean) => <SvgSparklesIcon hovered={h} /> },
    { label: "Undo", render: (h: boolean) => <SvgUndoIcon hovered={h} /> },
  ];

  return (
    <div style={gridStyle}>
      {tiles.map(({ label, render }) => (
        <div key={label} style={columnStyle}>
          <SvgIconTile label={label}>{render}</SvgIconTile>
          <span style={labelStyle}>{label}</span>
        </div>
      ))}
    </div>
  );
}

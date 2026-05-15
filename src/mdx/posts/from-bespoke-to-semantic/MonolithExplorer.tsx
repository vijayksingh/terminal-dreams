"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import styles from "./monolith-explorer.module.css";

// ── Types ──────────────────────────────────────────────────────────────

type ConfigValue =
  | string
  | number
  | boolean
  | ConfigObject
  | ConfigArray;

type ConfigObject = { [key: string]: ConfigValue };
type ConfigArray = ConfigValue[];

interface TreeNodeData {
  key: string;
  value: ConfigValue;
  depth: number;
  /** Path of keys from root, used to identify the target */
  path: string;
}

// ── Hardcoded monolith config ──────────────────────────────────────────

const MONOLITH_CONFIG: ConfigObject = {
  nodes: {
    ids: ["session", "auth", "storage", "api-gateway", "cache", "queue"],
    defaultShape: "rounded-rect",
    defaultSize: { width: 160, height: 48 },
    labelPosition: "center",
    iconSet: "lucide",
    showTooltips: true,
  },
  edges: {
    defaultType: "smoothstep",
    animated: false,
    markerEnd: "arrowclosed",
    strokeWidth: 1.5,
    labelBgColor: "#1a1a2e",
    labelFontSize: 11,
  },
  layout: {
    algorithm: "dagre",
    direction: "TB",
    nodeSpacing: 60,
    rankSpacing: 80,
    edgeRouting: "orthogonal",
    padding: 40,
    alignment: "center",
  },
  viewport: {
    zoomOnFit: true,
    minZoom: 0.25,
    maxZoom: 2.0,
    panOnDrag: true,
    zoomOnScroll: true,
    defaultViewport: { x: 0, y: 0, zoom: 1 },
  },
  nodeStyles: {
    default: {
      background: "#1e1e3a",
      borderColor: "#3a3a5c",
      borderWidth: 1,
      borderRadius: 8,
      fontFamily: "monospace",
      fontSize: 13,
      color: "#e0e0e8",
      padding: "8px 12px",
    },
    hover: {
      borderColor: "#6c63ff",
      boxShadow: "0 0 8px rgba(108,99,255,0.3)",
      scale: 1.02,
    },
    selected: {
      borderColor: "#6c63ff",
      borderWidth: 2,
      boxShadow: "0 0 12px rgba(108,99,255,0.4)",
    },
    overrides: {
      session: {
        background: "#1a1a3e",
        borderColor: "#4a4a7c",
        icon: "user-circle",
        priority: "high",
        animationOverrides: {
          entrance: {
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          },
          exit: { opacity: 0, duration: 0.2 },
          idle: { pulse: true, interval: 3000 },
        },
      },
      auth: {
        background: "#1e1a2e",
        icon: "shield",
        priority: "critical",
      },
    },
  },
  transitionConfig: {
    globalDuration: 300,
    easing: "ease-in-out",
    staggerChildren: 0.05,
    layoutAnimation: true,
    animateOnDataChange: true,
  },
  interaction: {
    selectable: true,
    draggable: true,
    connectable: false,
    deletable: false,
    multiSelect: true,
    selectionMode: "partial",
    snapToGrid: false,
    snapGrid: [15, 15],
  },
  theme: {
    name: "midnight",
    tokenOverrides: {
      bgPrimary: "#0d0d1a",
      bgSecondary: "#1a1a2e",
      textPrimary: "#e0e0e8",
      textMuted: "#6a6a8a",
      accentPrimary: "#6c63ff",
      accentSecondary: "#ff6b9d",
      border: "#2a2a4a",
    },
  },
};

// ── Target path that the reader must find ──────────────────────────────

const TARGET_PATH =
  "nodeStyles.overrides.session.animationOverrides";

const TARGET_DEPTH = 4; // levels deep to reach it

// ── Count all leaf props in a value ────────────────────────────────────

function countProps(value: ConfigValue): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).reduce(
      (sum: number, v) => sum + countProps(v),
      0,
    );
  }
  if (Array.isArray(value)) {
    return value.reduce(
      (sum: number, v) => sum + countProps(v),
      0,
    );
  }
  return 1; // leaf
}

/** Count props visible at the top-level of an object (not recursing into children) */
function countDirectProps(value: ConfigValue): number {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.keys(value).length;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  return 0;
}

// ── Indent helper ──────────────────────────────────────────────────────

const INDENT = 20;

function indentPx(depth: number): number {
  return depth * INDENT;
}

// ── Format a leaf value for display ────────────────────────────────────

function LeafValue({ value }: { value: string | number | boolean }) {
  if (typeof value === "string") {
    return (
      <span className={`${styles.nodeValue} ${styles.string}`}>
        &quot;{value}&quot;
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className={`${styles.nodeValue} ${styles.number}`}>
        {value}
      </span>
    );
  }
  return (
    <span className={`${styles.nodeValue} ${styles.boolean}`}>
      {String(value)}
    </span>
  );
}

// ── Single tree node (recursive) ───────────────────────────────────────

function TreeNode({
  nodeKey,
  value,
  depth,
  path,
  expandedPaths,
  onToggle,
  reducedMotion,
  targetReached,
}: {
  nodeKey: string;
  value: ConfigValue;
  depth: number;
  path: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  reducedMotion: boolean;
  targetReached: boolean;
}) {
  const isObject =
    typeof value === "object" && value !== null && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;
  const isExpanded = expandedPaths.has(path);
  const isTarget = path === TARGET_PATH;
  const isTargetGlow = isTarget && targetReached;

  const entries = isObject
    ? Object.entries(value as ConfigObject)
    : isArray
      ? (value as ConfigArray).map((v, i) => [String(i), v] as const)
      : [];

  const childCount = entries.length;
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  // Guide lines for each ancestor depth
  const guideLines = Array.from({ length: depth }, (_, i) => (
    <div
      key={i}
      className={styles.guideLine}
      style={{ left: indentPx(i) + 7 }}
    />
  ));

  if (!isExpandable) {
    // Leaf node
    return (
      <div
        className={styles.nodeRow}
        style={{ paddingLeft: indentPx(depth) }}
      >
        {guideLines}
        <span style={{ width: 16 }} />
        <span className={styles.nodeKey}>{nodeKey}:&nbsp;</span>
        <LeafValue value={value as string | number | boolean} />
      </div>
    );
  }

  // Expandable node
  return (
    <div style={{ position: "relative" }}>
      {/* Expanded left-border accent */}
      {isExpanded && (
        <div
          className={styles.expandedBorder}
          style={{ left: indentPx(depth) + 7 }}
        />
      )}

      <div
        className={`${styles.nodeRow} ${isTargetGlow ? styles.targetHighlight : ""}`}
        style={{ paddingLeft: indentPx(depth) }}
        onClick={() => onToggle(path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(path);
          }
        }}
        aria-expanded={isExpanded}
      >
        {guideLines}

        <span
          className={styles.toggle}
          data-expanded={isExpanded}
        >
          {isExpanded ? "▾" : "▸"}
        </span>

        <span className={styles.nodeKey}>{nodeKey}:&nbsp;</span>
        {!isExpanded && (
          <span className={`${styles.nodeValue} ${styles.bracket}`}>
            {openBracket}...{closeBracket}{" "}
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              ({childCount})
            </span>
          </span>
        )}
        {isExpanded && (
          <span className={`${styles.nodeValue} ${styles.bracket}`}>
            {openBracket}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={path}
            initial={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 0, height: 0 }
            }
            animate={{ opacity: 1, height: "auto" }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, height: 0 }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : TRANSITION.collapse
            }
            style={{ overflow: "hidden" }}
          >
            {entries.map(([k, v]) => (
              <TreeNode
                key={k}
                nodeKey={k as string}
                value={v as ConfigValue}
                depth={depth + 1}
                path={path ? `${path}.${k}` : String(k)}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                reducedMotion={reducedMotion}
                targetReached={targetReached}
              />
            ))}
            <div
              className={styles.nodeRow}
              style={{ paddingLeft: indentPx(depth) }}
            >
              {guideLines}
              <span style={{ width: 16 }} />
              <span className={`${styles.nodeValue} ${styles.bracket}`}>
                {closeBracket}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function MonolithExplorer() {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set<string>(),
  );
  const [targetReached, setTargetReached] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Count all props the reader has "encountered" by expanding sections
  const visiblePropCount = useMemo(() => {
    let count = 0;

    // Always count the top-level keys
    count += countDirectProps(MONOLITH_CONFIG);

    // For each expanded path, count that section's direct children
    for (const path of expandedPaths) {
      const keys = path.split(".");
      let current: ConfigValue = MONOLITH_CONFIG;
      for (const key of keys) {
        if (
          typeof current === "object" &&
          current !== null &&
          !Array.isArray(current)
        ) {
          current = (current as ConfigObject)[key];
        } else {
          break;
        }
      }
      if (current !== undefined) {
        count += countDirectProps(current);
      }
    }
    return count;
  }, [expandedPaths]);

  const handleToggle = useCallback(
    (path: string) => {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          // Collapse: remove this path and all children
          for (const p of next) {
            if (p === path || p.startsWith(path + ".")) {
              next.delete(p);
            }
          }
        } else {
          next.add(path);
        }

        // Check if target is now reachable
        if (next.has(TARGET_PATH) && !targetReached) {
          setTargetReached(true);
          setShowToast(true);
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
          }, 4000);
        }

        return next;
      });
    },
    [targetReached],
  );

  const handleReset = useCallback(() => {
    setExpandedPaths(new Set<string>());
    setTargetReached(false);
    setShowToast(false);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  return (
    <div className={`${styles.wrapper} my-6`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>DiagramConfig</span>
        <div className={styles.headerRight}>
          <div className={styles.propCounter}>
            <span style={{ opacity: 0.6 }}>props:</span>
            <motion.span
              key={visiblePropCount}
              className={styles.propCounterValue}
              initial={
                reducedMotion ? undefined : { scale: 1.4, color: "var(--color-accent)" }
              }
              animate={{ scale: 1, color: "var(--color-accent)" }}
              transition={SPRING.snappy}
            >
              {visiblePropCount}
            </motion.span>
          </div>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className={styles.treeArea}>
        <div
          className={styles.nodeRow}
          style={{ paddingLeft: 0, cursor: "default" }}
        >
          <span style={{ width: 16 }} />
          <span className={`${styles.nodeValue} ${styles.bracket}`}>
            {"{"}
          </span>
        </div>

        {Object.entries(MONOLITH_CONFIG).map(([key, value]) => (
          <TreeNode
            key={key}
            nodeKey={key}
            value={value}
            depth={1}
            path={key}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
            reducedMotion={reducedMotion}
            targetReached={targetReached}
          />
        ))}

        <div
          className={styles.nodeRow}
          style={{ paddingLeft: 0, cursor: "default" }}
        >
          <span style={{ width: 16 }} />
          <span className={`${styles.nodeValue} ${styles.bracket}`}>
            {"}"}
          </span>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            className={styles.toast}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={
              reducedMotion ? { duration: 0 } : TRANSITION.enterCard
            }
          >
            {TARGET_DEPTH} levels deep to change one animation
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MonolithExplorer;

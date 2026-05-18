"use client";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from "d3-force";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, STAGGER, TRANSITION } from "@/lib/motion";
import { layerColors } from "@/components/recipe-lab/diagram-colors";
import type { GraphData, PrincipleCategory } from "@/lib/principle-types";
import { CATEGORIES } from "@/lib/principle-data";
import styles from "./KnowledgeGraph.module.css";

type GraphNode = GraphData["nodes"][number] & SimulationNodeDatum;
type GraphEdge = {
  source: string | GraphNode;
  target: string | GraphNode;
};

type HoveredNode = {
  slug: string;
  x: number;
  y: number;
};

const NODE_RADIUS = 20;
const VIEWBOX_W = 800;
const VIEWBOX_H = 450;

function getCategoryColor(categories: PrincipleCategory[]) {
  const primary = categories[0];
  if (!primary) return layerColors("--diagram-layer-0");
  const cat = CATEGORIES.find((c) => c.slug === primary);
  return layerColors(cat?.colorToken ?? "--diagram-layer-0");
}

export function KnowledgeGraph({
  graphData,
  activeCategory,
}: {
  graphData: GraphData;
  activeCategory: PrincipleCategory | null;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<HoveredNode | null>(null);
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([]);
  const [simulatedEdges, setSimulatedEdges] = useState<GraphEdge[]>([]);

  useEffect(() => {
    const nodes: GraphNode[] = graphData.nodes.map((n) => ({
      ...n,
      x: n.x,
      y: n.y,
    }));
    const edges: GraphEdge[] = graphData.edges.map((e) => ({ ...e }));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.slug)
          .distance(120)
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(VIEWBOX_W / 2, VIEWBOX_H / 2))
      .force("collide", forceCollide(NODE_RADIUS + 15))
      .alpha(0.8)
      .alphaDecay(0.05);

    sim.on("tick", () => {
      for (const n of nodes) {
        n.x = Math.max(NODE_RADIUS + 10, Math.min(VIEWBOX_W - NODE_RADIUS - 10, n.x ?? 0));
        n.y = Math.max(NODE_RADIUS + 10, Math.min(VIEWBOX_H - NODE_RADIUS - 10, n.y ?? 0));
      }
      setSimulatedNodes([...nodes]);
      setSimulatedEdges([...edges]);
    });

    sim.on("end", () => {
      setSimulatedNodes([...nodes]);
      setSimulatedEdges([...edges]);
    });

    return () => {
      sim.stop();
    };
  }, [graphData]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of simulatedNodes) {
      map.set(n.slug, n);
    }
    return map;
  }, [simulatedNodes]);

  const isNodeActive = useCallback(
    (node: GraphNode) => {
      if (!activeCategory) return true;
      return node.categories.includes(activeCategory);
    },
    [activeCategory]
  );

  const isEdgeActive = useCallback(
    (edge: GraphEdge) => {
      if (!activeCategory) return true;
      const sourceSlug = typeof edge.source === "string" ? edge.source : edge.source.slug;
      const targetSlug = typeof edge.target === "string" ? edge.target : edge.target.slug;
      const sourceNode = nodeMap.get(sourceSlug);
      const targetNode = nodeMap.get(targetSlug);
      return (
        sourceNode?.categories.includes(activeCategory) &&
        targetNode?.categories.includes(activeCategory)
      );
    },
    [activeCategory, nodeMap]
  );

  const hoveredPrinciple = hovered
    ? graphData.nodes.find((n) => n.slug === hovered.slug)
    : null;

  const tooltipPos = useMemo(() => {
    if (!hovered || !svgRef.current) return { left: 0, top: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = rect.width / VIEWBOX_W;
    const scaleY = rect.height / VIEWBOX_H;
    return {
      left: hovered.x * scaleX,
      top: hovered.y * scaleY - 10,
    };
  }, [hovered]);

  return (
    <>
      <div className={styles.graphContainer}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className={styles.graphSvg}
          role="img"
          aria-label="Knowledge graph of design principles"
        >
          <g>
            {simulatedEdges.map((edge, i) => {
              const source = typeof edge.source === "string" ? nodeMap.get(edge.source) : edge.source;
              const target = typeof edge.target === "string" ? nodeMap.get(edge.target) : edge.target;
              if (!source || !target) return null;
              const active = isEdgeActive(edge);

              return prefersReducedMotion ? (
                <line
                  key={i}
                  x1={source.x ?? 0}
                  y1={source.y ?? 0}
                  x2={target.x ?? 0}
                  y2={target.y ?? 0}
                  className={`${styles.edge} ${active ? "" : styles.edgeDimmed}`}
                />
              ) : (
                <motion.line
                  key={i}
                  x1={source.x ?? 0}
                  y1={source.y ?? 0}
                  x2={target.x ?? 0}
                  y2={target.y ?? 0}
                  className={styles.edge}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: active ? 1 : 0.05 }}
                  transition={TRANSITION.enterCard}
                />
              );
            })}
          </g>

          <g>
            {simulatedNodes.map((node, i) => {
              const colors = getCategoryColor(node.categories);
              const active = isNodeActive(node);

              const nodeContent = (
                <>
                  <circle
                    className={styles.nodeCircle}
                    r={NODE_RADIUS}
                    fill={colors.bg}
                    stroke={colors.dot}
                    strokeWidth={2}
                  />
                  <text className={styles.nodeLabel} dy="0.35em">
                    {node.title.length > 14
                      ? node.title.slice(0, 12) + "…"
                      : node.title}
                  </text>
                </>
              );

              if (prefersReducedMotion) {
                return (
                  <Link key={node.slug} href={`/principles/${node.slug}`}>
                    <g
                      className={`${styles.nodeGroup} ${active ? "" : styles.dimmed}`}
                      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                      onMouseEnter={() =>
                        setHovered({ slug: node.slug, x: node.x ?? 0, y: node.y ?? 0 })
                      }
                      onMouseLeave={() => setHovered(null)}
                      tabIndex={0}
                      role="link"
                      aria-label={node.title}
                    >
                      {nodeContent}
                    </g>
                  </Link>
                );
              }

              return (
                <Link key={node.slug} href={`/principles/${node.slug}`}>
                  <motion.g
                    className={styles.nodeGroup}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: active ? 1 : 0.12,
                      scale: 1,
                      x: node.x ?? 0,
                      y: node.y ?? 0,
                    }}
                    whileHover={{ scale: 1.15 }}
                    transition={{
                      ...SPRING.snappy,
                      delay: i * STAGGER.fast,
                      opacity: { duration: 0.3 },
                    }}
                    onMouseEnter={() =>
                      setHovered({ slug: node.slug, x: node.x ?? 0, y: node.y ?? 0 })
                    }
                    onMouseLeave={() => setHovered(null)}
                    tabIndex={0}
                    role="link"
                    aria-label={node.title}
                  >
                    {nodeContent}
                  </motion.g>
                </Link>
              );
            })}
          </g>
        </svg>

        <AnimatePresence>
          {hoveredPrinciple && (
            <motion.div
              className={styles.tooltip}
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: "translate(-50%, -100%)",
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className={styles.tooltipTitle}>{hoveredPrinciple.title}</p>
              <p className={styles.tooltipSummary}>{hoveredPrinciple.summary}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile fallback: simple list when graph is too cramped */}
      <div className={styles.mobileList}>
        {graphData.nodes
          .filter((n) => !activeCategory || n.categories.includes(activeCategory))
          .map((n) => (
            <Link
              key={n.slug}
              href={`/principles/${n.slug}`}
              className={styles.mobileItem}
            >
              <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text)", fontSize: "var(--text-sm)" }}>
                {n.title}
              </p>
              <p style={{ margin: "4px 0 0", color: "var(--color-muted)", fontSize: "var(--text-xs)" }}>
                {n.summary}
              </p>
            </Link>
          ))}
      </div>
    </>
  );
}

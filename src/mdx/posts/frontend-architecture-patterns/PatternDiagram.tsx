"use client";

import { FlowDiagram } from "@/mdx/shared/flow-diagram";
import type { FlowDiagramDef } from "@/mdx/shared/flow-diagram";
import { PATTERNS } from "./pattern-data";
import type { PatternDef } from "./pattern-data";

function toFlowDef(p: PatternDef): FlowDiagramDef {
  return {
    id: p.id,
    title: p.name,
    subtitle: `${p.fullName} · ${p.year}`,
    thesis: p.oneLiner,
    protagonist: p.protagonist,
    viewBox: p.viewBox,
    nodes: p.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      label: n.label,
      accent: n.accent,
      description: n.description,
      detail: (
        <>
          <span
            style={{
              color: "var(--color-accent)",
              fontWeight: 600,
              fontSize: 9,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Real world:{" "}
          </span>
          {n.example}
        </>
      ),
    })),
    edges: p.edges.map((e) => ({
      from: e.from,
      to: e.to,
      label: e.label,
      bidirectional: e.bidirectional,
      problem: e.problem,
      verb: e.verb,
      description: e.description,
    })),
    annotations: p.annotations,
    hint: "Click any layer to see details",
    config: { nodeDefaults: { w: 60, h: 20 } },
  };
}

type Props = { variant: string };

export function PatternDiagram({ variant }: Props) {
  const pattern = PATTERNS[variant];
  if (!pattern) return null;
  return <FlowDiagram {...toFlowDef(pattern)} />;
}

export default PatternDiagram;

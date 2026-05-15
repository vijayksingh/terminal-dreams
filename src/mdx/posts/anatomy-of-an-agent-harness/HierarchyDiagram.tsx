"use client";

import { FlowDiagram } from "@/mdx/shared/flow-diagram";
import type { FlowDiagramDef } from "@/mdx/shared/flow-diagram";

const HIERARCHY: FlowDiagramDef = {
  id: "agent-hierarchy",
  title: "Hierarchy",
  subtitle: "parent-child delegation · shared sandbox",
  thesis: "Agents delegate work downward in a strict tree — the sandbox is the only shared state",
  tension: "Shared mutable state in an otherwise isolated hierarchy — feature or footgun?",
  protagonist: "root",
  hint: "Click any node to explore the hierarchy",
  viewBox: "0 0 480 200",
  nodes: [
    {
      id: "root",
      label: "Root Agent",
      sublabel: "depth: 0",
      x: 160,
      y: 38,
      w: 100,
      h: 32,
      role: "protagonist",
      brief: "Top-level agent that owns the session",
      description: "The top-level agent that receives the initial prompt.",
      detail:
        "Owns the session. Delegates downward via session.task() and collects results upward. There is no peer communication — coordination flows strictly top-down.",
    },
    {
      id: "child",
      label: "Child Task",
      sublabel: "depth: 1",
      x: 160,
      y: 102,
      w: 100,
      h: 32,
      role: "supporting",
      description: "A sub-agent spawned by the root to handle a delegated unit of work.",
      detail:
        "Receives instructions from its parent, does work, and returns a result. Does not know about siblings. Cannot communicate laterally.",
    },
    {
      id: "grandchild",
      label: "Grandchild",
      sublabel: "depth: 2",
      x: 160,
      y: 166,
      w: 100,
      h: 32,
      role: "context",
      description: "A task spawned by a child task — delegation can nest arbitrarily.",
      detail:
        "Same interface as any other task. The depth counter increments automatically. The framework caps depth at 4 to prevent runaway recursion.",
    },
    {
      id: "sandbox",
      label: "Sandbox",
      sublabel: "files · shell",
      x: 370,
      y: 102,
      w: 96,
      h: 32,
      role: "supporting",
      brief: "Shared filesystem and shell access",
      description: "A shared execution environment — filesystem and shell access.",
      detail:
        "All tasks in a session share one sandbox. A child can read files written by its parent. The sandbox is the only shared mutable state in the entire hierarchy.",
    },
  ],
  edges: [
    { from: "root", to: "child", label: "session.task()", verb: "delegates", description: "spawns a child task with instructions and collects the result" },
    { from: "child", to: "grandchild", label: "task()", verb: "delegates", description: "nests further — same interface, incremented depth" },
    { from: "child", to: "sandbox", label: "shared sandbox", dashed: true, verb: "reads/writes", description: "accesses the same files and shell as its parent" },
    { from: "grandchild", to: "sandbox", label: "shared", dashed: true, verb: "reads/writes", description: "shares sandbox state across the full hierarchy" },
  ],
  annotations: [
    { x: 50, y: 40, text: "depth 0" },
    { x: 50, y: 104, text: "depth 1" },
    { x: 50, y: 168, text: "depth 2" },
  ],
};

export function HierarchyDiagram() {
  return <FlowDiagram {...HIERARCHY} />;
}

export default HierarchyDiagram;

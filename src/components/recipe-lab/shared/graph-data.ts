export type NodeRole = "protagonist" | "supporting" | "context";

export type BaseNodeDef = {
  id: string;
  label: string;
  brief: string;
  x: number;
  y: number;
  w: number;
  h: number;
  role: NodeRole;
};

export type BaseEdgeDef = {
  from: string;
  to: string;
  label: string;
  verb: string;
  description: string;
};

export const BASE_NODES: BaseNodeDef[] = [
  { id: "session", label: "Session", brief: "Central hub — message history with compaction", x: 140, y: 30, w: 80, h: 28, role: "protagonist" },
  { id: "skill", label: "Skill", brief: "Markdown instruction sets loaded at startup", x: 55, y: 82, w: 62, h: 26, role: "supporting" },
  { id: "role", label: "Role", brief: "System prompt and behavior constraints", x: 225, y: 82, w: 58, h: 26, role: "supporting" },
  { id: "task", label: "Task", brief: "Stateful operation tracker", x: 90, y: 138, w: 58, h: 26, role: "supporting" },
  { id: "sandbox", label: "Sandbox", brief: "Isolated execution environment", x: 195, y: 138, w: 66, h: 26, role: "context" },
];

export const BASE_EDGES: BaseEdgeDef[] = [
  { from: "session", to: "skill", label: ".skill()", verb: "loads", description: "loads instruction sets into the conversation" },
  { from: "session", to: "role", label: ".role()", verb: "applies", description: "applies behavior constraints to the session" },
  { from: "skill", to: "task", label: "spawns", verb: "spawns", description: "creates tasks from skill definitions" },
  { from: "role", to: "sandbox", label: "configures", verb: "configures", description: "sets execution environment constraints" },
  { from: "task", to: "sandbox", label: "runs in", verb: "executes in", description: "runs task operations inside sandboxed scope" },
];

export const ARC = ["session", "skill", "role", "task", "sandbox"];
export const THESIS = "All five primitives communicate through the Session hub";
export const TENSION = "Single coordination point — bottleneck or feature?";

export const VIEWBOX = { w: 280, h: 170 };
export const ROLE_SCALE = { protagonist: 1.15, supporting: 1.0, context: 0.9 } as const;

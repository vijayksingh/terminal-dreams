import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "taba",
    label: "Tab A",
    sublabel: "visible · state · UI",
    x: 40,
    y: 6,
    w: 160,
    h: 24,
  },
  {
    id: "tabb",
    label: "Tab B",
    sublabel: "visible · state · UI",
    x: 280,
    y: 6,
    w: 160,
    h: 24,
  },
  {
    id: "channel",
    label: "BroadcastChannel",
    sublabel: "postMessage · onmessage",
    x: 140,
    y: 50,
    w: 200,
    h: 24,
  },
  {
    id: "leader",
    label: "LeaderElector",
    sublabel: "bully · heartbeat · failover",
    x: 40,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "sync",
    label: "StateSynchronizer",
    sublabel: "diff · merge · conflict resolve",
    x: 260,
    y: 92,
    w: 180,
    h: 24,
  },
  {
    id: "store",
    label: "SharedStore",
    sublabel: "localStorage · version vector",
    x: 140,
    y: 138,
    w: 200,
    h: 24,
  },
];

const EDGES: FlowEdge[] = [
  { from: "taba", to: "channel", verb: "postMessage" },
  { from: "tabb", to: "channel", verb: "postMessage" },
  { from: "channel", to: "sync", verb: "delivers message" },
  { from: "leader", to: "channel", verb: "election results" },
  { from: "sync", to: "store", verb: "writes merged state" },
  {
    from: "store",
    to: "taba",
    dashed: true,
    verb: "storage event fires",
    pathOverride: "M 140,150 C 6,150 6,18 40,18",
    midpointOverride: { x: 6, y: 84 },
  },
  {
    from: "store",
    to: "tabb",
    dashed: true,
    verb: "storage event fires",
    pathOverride: "M 340,150 C 474,150 474,18 440,18",
    midpointOverride: { x: 474, y: 84 },
  },
];

// ── Type definitions ──────────────────────────────────────────────

const TYPES: ArchTypeDef[] = [
  {
    name: "TabMessage",
    kind: "API message",
    fields: [
      { name: "type", type: "'state-sync' | 'action' | 'heartbeat'" },
      { name: "from", type: "string" },
      { name: "payload", type: "unknown" },
      { name: "timestamp", type: "number" },
    ],
  },
  {
    name: "SyncState",
    kind: "state",
    fields: [
      { name: "version", type: "number" },
      { name: "data", type: "Record<string, unknown>" },
      { name: "leader", type: "string | null" },
    ],
  },
];

// ── Scenarios ─────────────────────────────────────────────────────

const stateSyncScenario: ArchStep[] = [
  {
    nodeId: "taba",
    caption: "User edits a form field in Tab A -- local state updates immediately for responsiveness",
  },
  {
    nodeId: "channel",
    caption: "Tab A posts a state-sync message via BroadcastChannel with the diff and a lamport timestamp",
    payload: { type: TYPES[0]!, sample: ['{ type: "state-sync",', '  from: "tab-1",', '  payload: { field: "name", value: "Alice" } }'] },
  },
  {
    nodeId: "sync",
    caption: "StateSynchronizer receives the message, checks version vector, detects no conflict",
    stateAfter: [{ key: "version", value: "4" }, { key: "conflicts", value: "0" }],
  },
  {
    nodeId: "store",
    caption: "Merged state written to localStorage -- version vector incremented",
    payload: { type: TYPES[1]!, sample: ['{ version: 4,', '  data: { name: "Alice" } }'] },
  },
  {
    nodeId: "tabb",
    caption: "Tab B receives storage event, applies the diff -- UI updates reactively without user action",
  },
];

const leaderElectionScenario: ArchStep[] = [
  {
    nodeId: "leader",
    caption: "Heartbeat timeout -- Tab B's last heartbeat was 10s ago, leader (Tab B) declared dead",
    stateAfter: [{ key: "leaderAlive", value: "false" }, { key: "timeout", value: "10s" }],
  },
  {
    nodeId: "leader",
    caption: "Bully algorithm: each alive tab broadcasts its ID. Highest ID wins the election",
    stateAfter: [{ key: "candidates", value: "[tab-1, tab-3]" }],
  },
  {
    nodeId: "channel",
    caption: "Election result broadcast: tab-3 is the new leader. All tabs acknowledge",
    payload: { type: TYPES[0]!, sample: ['{ type: "election",', '  from: "tab-3",', '  payload: { winner: "tab-3" } }'] },
  },
  {
    nodeId: "taba",
    caption: "Tab A receives election result, updates local leader reference to tab-3",
    stateAfter: [{ key: "leader", value: "tab-3" }],
  },
];

const conflictScenario: ArchStep[] = [
  {
    nodeId: "taba",
    caption: "Tab A sets field 'color' to 'red' at timestamp t=1",
    stateAfter: [{ key: "color", value: "red" }, { key: "t", value: "1" }],
  },
  {
    nodeId: "tabb",
    caption: "Tab B sets field 'color' to 'blue' at timestamp t=2 -- concurrent with Tab A's write",
    stateAfter: [{ key: "color", value: "blue" }, { key: "t", value: "2" }],
  },
  {
    nodeId: "sync",
    caption: "StateSynchronizer receives both writes. Conflict detected: same key, different values, overlapping timestamps",
    stateAfter: [{ key: "conflict", value: "color: red vs blue" }],
  },
  {
    nodeId: "sync",
    caption: "Resolution strategy applied (LWW): t=2 > t=1, so 'blue' wins. Alternative: merge queue or leader-decides",
    stateAfter: [{ key: "resolved", value: "blue (LWW)" }],
  },
  {
    nodeId: "store",
    caption: "Resolved value 'blue' written to shared store. Both tabs converge to the same state",
  },
];

// ── Config ────────────────────────────────────────────────────────

export const MULTI_TAB_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "A multi-tab sync system separates messaging, leader election, state synchronization, and conflict resolution -- the BroadcastChannel carries typed messages while the leader elector coordinates writes and the synchronizer merges state across tabs.",
  viewBox: "0 0 480 170",
  nodes: NODES,
  edges: EDGES,
  layout: "stacked",
  scenarios: [
    {
      id: "state-sync",
      label: "Sync state across tabs",
      blurb: "Edit in Tab A, see the change appear in Tab B via BroadcastChannel",
      steps: stateSyncScenario,
    },
    {
      id: "leader-election",
      label: "Leader election",
      blurb: "Leader tab crashes -- Bully algorithm elects a new coordinator",
      steps: leaderElectionScenario,
    },
    {
      id: "conflict",
      label: "Conflict resolution",
      blurb: "Two tabs edit the same field simultaneously -- synchronizer resolves",
      steps: conflictScenario,
    },
  ],
};

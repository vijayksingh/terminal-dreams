import type {
  ArchScenarioPlayerConfig,
  ArchTypeDef,
  ArchStep,
} from "@/components/sdp/architecture-scenario-player";
import type { FlowNode, FlowEdge } from "@/mdx/shared/flow-diagram";

// ── Geometry ───────────────────────────────────────────────────────

const NODES: FlowNode[] = [
  {
    id: "app-shell",
    label: "App Shell",
    sublabel: "routing · layout · bootstrap",
    x: 140,
    y: 6,
    w: 200,
    h: 28,
  },
  {
    id: "team-a",
    label: "Team A MFE",
    sublabel: "header · nav · auth UI",
    x: 20,
    y: 52,
    w: 130,
    h: 24,
  },
  {
    id: "team-b",
    label: "Team B MFE",
    sublabel: "product catalog · search",
    x: 175,
    y: 52,
    w: 130,
    h: 24,
  },
  {
    id: "team-c",
    label: "Team C MFE",
    sublabel: "cart · checkout",
    x: 330,
    y: 52,
    w: 130,
    h: 24,
  },
  {
    id: "shared-runtime",
    label: "Shared Runtime",
    sublabel: "React · event bus · design tokens",
    x: 120,
    y: 98,
    w: 240,
    h: 24,
  },
  {
    id: "cdn",
    label: "CDN / Build Pipeline",
    sublabel: "webpack · deployment · versioning",
    x: 120,
    y: 140,
    w: 240,
    h: 24,
  },
];

const EDGES: FlowEdge[] = [
  { from: "app-shell", to: "team-a", verb: "loads remote" },
  { from: "app-shell", to: "team-b", verb: "loads remote" },
  { from: "app-shell", to: "team-c", verb: "loads remote" },
  { from: "shared-runtime", to: "team-a", verb: "provides deps" },
  { from: "shared-runtime", to: "team-b", verb: "provides deps" },
  { from: "shared-runtime", to: "team-c", verb: "provides deps" },
  {
    from: "team-b",
    to: "team-c",
    dashed: true,
    verb: "event: add to cart",
  },
  {
    from: "cdn",
    to: "app-shell",
    dashed: true,
    verb: "deploys bundles",
    pathOverride: "M 120,152 C 60,152 60,20 140,20",
    midpointOverride: { x: 60, y: 86 },
  },
];

// ── Type definitions ──────────────────────────────────────────────

const TYPES: ArchTypeDef[] = [
  {
    name: "RemoteContainerConfig",
    kind: "state",
    fields: [
      { name: "name", type: "string" },
      { name: "url", type: "string" },
      { name: "scope", type: "string" },
      { name: "module", type: "string" },
      { name: "version", type: "string" },
    ],
  },
  {
    name: "EventBusPayload",
    kind: "API response",
    fields: [
      { name: "type", type: "string" },
      { name: "source", type: "string" },
      { name: "target", type: "string|'*'" },
      { name: "payload", type: "unknown" },
      { name: "timestamp", type: "number" },
    ],
  },
];

// ── Scenarios ─────────────────────────────────────────────────────

const independentDeployScenario: ArchStep[] = [
  {
    nodeId: "team-b",
    caption: "Team B builds a new product page — they run their own CI/CD pipeline independently",
  },
  {
    nodeId: "cdn",
    caption: "Team B's new bundle is deployed to CDN — only team-b's hash changes, other bundles untouched",
    payload: { type: TYPES[0] as ArchTypeDef, sample: ['{ name: "products",', '  version: "v2.3.1",', '  url: "/mfe/products/remoteEntry.js" }'] },
  },
  {
    nodeId: "app-shell",
    caption: "App Shell fetches updated manifest — discovers Team B has a new version, other teams unchanged",
    stateAfter: [{ key: "team-b", value: "v2.3.1" }, { key: "team-a", value: "v1.8.0 (unchanged)" }],
  },
  {
    nodeId: "team-b",
    caption: "App Shell loads the new Team B bundle — product catalog updates in-place without full page reload",
    stateAfter: [{ key: "loadState", value: "ready" }, { key: "deployedBy", value: "Team B only" }],
  },
  {
    nodeId: "team-a",
    caption: "Team A's header continues running the same version — completely unaffected by Team B's deploy",
  },
];

const sharedDepDedupScenario: ArchStep[] = [
  {
    nodeId: "team-a",
    caption: "Team A imports React 18.3 — without sharing, it bundles its own copy (42KB)",
  },
  {
    nodeId: "team-b",
    caption: "Team B also imports React 18.3 — without sharing, another 42KB downloaded separately",
    stateAfter: [{ key: "reactCopies", value: "2" }, { key: "totalReactSize", value: "84KB" }],
  },
  {
    nodeId: "team-c",
    caption: "Team C joins — third React copy makes 126KB total. Three identical bundles on the wire.",
    stateAfter: [{ key: "reactCopies", value: "3" }, { key: "totalReactSize", value: "126KB" }],
  },
  {
    nodeId: "shared-runtime",
    caption: "Module Federation marks React as a singleton shared dependency — loaded once, provided to all",
    payload: { type: TYPES[0] as ArchTypeDef, sample: ['{ name: "react",', '  singleton: true,', '  requiredVersion: "^18.3" }'] },
  },
  {
    nodeId: "app-shell",
    caption: "With sharing enabled: React loads once (42KB), saving 84KB. Same React instance across all MFEs.",
    stateAfter: [{ key: "reactCopies", value: "1" }, { key: "saved", value: "84KB (67%)" }],
  },
];

const crossMfeEventScenario: ArchStep[] = [
  {
    nodeId: "team-b",
    caption: "User clicks 'Add to Cart' on a product in Team B's catalog — Team B emits an event",
    payload: { type: TYPES[1] as ArchTypeDef, sample: ['{ type: "add-to-cart",', '  source: "products",', '  payload: { productId: "p-42", qty: 1 } }'] },
  },
  {
    nodeId: "shared-runtime",
    caption: "Event bus receives the message and routes it to Team C's cart MFE based on subscription",
    stateAfter: [{ key: "eventType", value: "add-to-cart" }, { key: "routing", value: "products → cart" }],
  },
  {
    nodeId: "team-c",
    caption: "Team C's cart receives the event — adds product p-42 to cart state, re-renders cart UI",
    stateAfter: [{ key: "cartItems", value: "1" }, { key: "lastEvent", value: "add-to-cart" }],
  },
  {
    nodeId: "team-a",
    caption: "Team A's header also subscribes to cart events — updates the cart badge count in the nav bar",
    stateAfter: [{ key: "badgeCount", value: "1" }],
  },
  {
    nodeId: "app-shell",
    caption: "All three MFEs stay in sync through the event bus — no direct imports between team codebases",
  },
];

// ── Config ────────────────────────────────────────────────────────

export const MICROFRONTEND_ARCH_CONFIG: ArchScenarioPlayerConfig = {
  thesis: "A micro-frontend architecture splits a monolithic frontend into independently deployable units — an app shell orchestrates loading, a shared runtime deduplicates common dependencies, and an event bus enables cross-team communication without coupling.",
  viewBox: "0 0 480 172",
  nodes: NODES,
  edges: EDGES,
  layout: "stacked",
  scenarios: [
    {
      id: "independent-deploy",
      label: "Independent deploy",
      blurb: "Team B deploys a new product page — only their bundle updates, other teams unaffected",
      steps: independentDeployScenario,
    },
    {
      id: "shared-dep-dedup",
      label: "Shared dep dedup",
      blurb: "All 3 MFEs import React — with Module Federation, it loads once instead of 3 times",
      steps: sharedDepDedupScenario,
    },
    {
      id: "cross-mfe-event",
      label: "Cross-MFE event",
      blurb: "User adds product from Team B — event bus fires, Team C cart updates, badge increments",
      steps: crossMfeEventScenario,
    },
  ],
};

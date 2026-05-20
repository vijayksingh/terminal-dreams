"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";
import { calculateBundleSize, calculateTotalLoadTime } from "./engine/loader";
import { IframeBridge } from "./engine/iframe-bridge";

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building";

export type MfeTeam = {
  id: string;
  name: string;
  color: string;
  component: string;
};

export type SharedDep = {
  name: string;
  version: string;
  size: number;
  loadedBy: string[];
};

export type EventBusMessage = {
  id: string;
  type: string;
  from: string;
  to: string;
  payload: string;
  timestamp: number;
};

export type IsolationMode = "iframe" | "web-component" | "module-federation";

export type MfeLoadState = "idle" | "loading" | "ready" | "error";

export type RoutingStrategy = "app-shell" | "server-side" | "client-side";

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export type TypeDef = {
  name: string;
  category: string;
  extends?: string;
  fields: { name: string; type: string; note?: string }[];
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const MFE_TEAMS: MfeTeam[] = [
  { id: "header", name: "Team A — Header", color: "var(--diagram-layer-0)", component: "HeaderNav" },
  { id: "products", name: "Team B — Products", color: "var(--diagram-layer-2)", component: "ProductCatalog" },
  { id: "cart", name: "Team C — Cart", color: "var(--diagram-layer-5)", component: "ShoppingCart" },
];

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "moduleFederation", label: "Module Federation?", description: "Webpack 5 container/remote pattern for loading independent builds at runtime" },
  { id: "sharedDeps", label: "Shared dependencies?", description: "Deduplicate React, design tokens, and common libraries across MFEs" },
  { id: "eventBus", label: "Event bus communication?", description: "Pub/sub message passing between independently deployed MFE panels" },
  { id: "independentDeploy", label: "Independent deployment?", description: "Each team deploys their MFE without coordinating with other teams" },
  { id: "routingHandoff", label: "Routing handoff?", description: "Cross-MFE navigation with URL ownership and history management" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/mfe/manifest",
    description: "Fetch the app shell manifest listing all registered MFE remotes and their entry points",
    usedBy: "App Shell → Registry",
    params: [
      { name: "version", type: "string?", note: "optional version filter" },
    ],
    responseType: "{ remotes: RemoteContainer[], sharedDeps: string[] }",
  },
  {
    method: "GET",
    path: "/mfe/:team/bundle",
    description: "Download the compiled JavaScript bundle for a specific MFE team",
    usedBy: "App Shell → CDN",
    params: [
      { name: "team", type: "string", note: "team identifier (header, products, cart)" },
      { name: "cache", type: "boolean?", note: "bypass CDN cache if false" },
    ],
    responseType: "{ url: string, hash: string, size: number }",
  },
  {
    method: "POST",
    path: "/mfe/events",
    description: "Broadcast an event from one MFE to another via the server-side event bus",
    usedBy: "MFE → EventBus → MFE",
    params: [
      { name: "type", type: "string", note: "event type (add-to-cart, navigate, etc.)" },
      { name: "from", type: "string", note: "source MFE identifier" },
      { name: "to", type: "string", note: "target MFE identifier" },
      { name: "payload", type: "unknown", note: "event-specific data" },
    ],
    responseType: "{ delivered: boolean, messageId: string }",
  },
  {
    method: "GET",
    path: "/mfe/shared-deps",
    description: "List all shared dependencies with their versions and which MFEs consume them",
    usedBy: "Build Pipeline → App Shell",
    params: [
      { name: "includeSize", type: "boolean?", note: "include bundle size per dep" },
    ],
    responseType: "{ deps: SharedDependencyMap[], totalSize: number }",
  },
  {
    method: "PUT",
    path: "/mfe/:team/config",
    description: "Update runtime configuration for a specific MFE (feature flags, endpoints, theme)",
    usedBy: "Admin → MFE Runtime",
    params: [
      { name: "team", type: "string", note: "team identifier" },
      { name: "config", type: "Record<string, unknown>", note: "key-value config overrides" },
    ],
    responseType: "{ applied: boolean, version: number }",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "RemoteContainer",
    category: "api",
    fields: [
      { name: "name", type: "string", note: "unique container name" },
      { name: "url", type: "string", note: "remote entry URL" },
      { name: "scope", type: "string", note: "webpack container scope" },
      { name: "module", type: "string", note: "exposed module path" },
      { name: "version", type: "string", note: "deployed version hash" },
    ],
  },
  {
    name: "SharedDependencyMap",
    category: "state",
    fields: [
      { name: "name", type: "string", note: "package name" },
      { name: "version", type: "string", note: "semver version" },
      { name: "singleton", type: "boolean", note: "only one instance allowed" },
      { name: "eager", type: "boolean", note: "loaded at startup" },
      { name: "consumers", type: "string[]", note: "MFE IDs using this dep" },
    ],
  },
  {
    name: "EventBusEvent",
    category: "api",
    fields: [
      { name: "id", type: "string", note: "unique event ID" },
      { name: "type", type: "string", note: "event type key" },
      { name: "source", type: "string", note: "emitting MFE" },
      { name: "target", type: "string|'*'", note: "target MFE or broadcast" },
      { name: "payload", type: "unknown", note: "event data" },
      { name: "timestamp", type: "number", note: "ms since epoch" },
    ],
  },
  {
    name: "MfeRoute",
    category: "props",
    fields: [
      { name: "path", type: "string", note: "URL pattern" },
      { name: "owner", type: "string", note: "MFE that owns this route" },
      { name: "exact", type: "boolean", note: "exact match only" },
      { name: "fallback", type: "string?", note: "fallback MFE if owner fails" },
    ],
  },
];

// ── Context ─────────────────────────────────────────────────────────

type MicrofrontendContextValue = {
  activeStep: number;
  phase: Phase;
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;
  // MFE teams & load states
  mfeTeams: MfeTeam[];
  loadStates: Record<string, MfeLoadState>;
  setLoadState: (teamId: string, state: MfeLoadState) => void;
  // Shared deps
  sharedDeps: SharedDep[];
  sharingEnabled: Set<string>;
  toggleSharing: (depName: string) => void;
  // Event bus
  eventBusMessages: EventBusMessage[];
  sendEvent: (msg: Omit<EventBusMessage, "id" | "timestamp">) => void;
  clearEvents: () => void;
  // Isolation
  isolationMode: IsolationMode;
  setIsolationMode: (m: IsolationMode) => void;
  // Routing
  routingStrategy: RoutingStrategy;
  setRoutingStrategy: (s: RoutingStrategy) => void;
  // Metrics
  bundleSize: number;
  totalLoadTime: number;
  eventCount: number;
  // Step completion
  stepCompleted: Record<number, boolean>;
  markStepComplete: (step: number) => void;
  // State inspector
  stateEntries: StateEntry[];
};

const MicrofrontendContext = createContext<MicrofrontendContextValue | null>(null);

export function useMicrofrontend() {
  const ctx = useContext(MicrofrontendContext);
  if (!ctx) throw new Error("useMicrofrontend must be used within MicrofrontendProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

const DEFAULT_SHARED_DEPS: SharedDep[] = [
  { name: "react", version: "18.3.1", size: 42, loadedBy: ["header", "products", "cart"] },
  { name: "react-dom", version: "18.3.1", size: 130, loadedBy: ["header", "products", "cart"] },
  { name: "design-tokens", version: "2.1.0", size: 8, loadedBy: ["header", "products", "cart"] },
  { name: "event-bus", version: "1.0.0", size: 4, loadedBy: ["header", "products", "cart"] },
  { name: "router", version: "6.20.0", size: 28, loadedBy: ["header", "products"] },
];

export function MicrofrontendProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase: Phase = activeStep <= 3 ? "planning" : "building";

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Load states
  const [loadStates, setLoadStates] = useState<Record<string, MfeLoadState>>({
    header: "idle",
    products: "idle",
    cart: "idle",
  });
  const setLoadState = useCallback((teamId: string, state: MfeLoadState) => {
    setLoadStates(prev => ({ ...prev, [teamId]: state }));
  }, []);

  // Shared deps
  const [sharingEnabled, setSharingEnabled] = useState<Set<string>>(new Set(["react", "react-dom"]));
  const toggleSharing = useCallback((depName: string) => {
    setSharingEnabled(prev => {
      const next = new Set(prev);
      next.has(depName) ? next.delete(depName) : next.add(depName);
      return next;
    });
  }, []);

  // Event bus & postMessage bridge logic coordination
  const [eventBusMessages, setEventBusMessages] = useState<EventBusMessage[]>([]);
  const bridge = useMemo(() => new IframeBridge(), []);

  useEffect(() => {
    return bridge.subscribe((event) => {
      setEventBusMessages(prev => [...prev, event]);
    });
  }, [bridge]);

  const sendEvent = useCallback((msg: Omit<EventBusMessage, "id" | "timestamp">) => {
    bridge.dispatch(msg);
  }, [bridge]);

  const clearEvents = useCallback(() => setEventBusMessages([]), []);

  // Isolation & routing
  const [isolationMode, setIsolationMode] = useState<IsolationMode>("module-federation");
  const [routingStrategy, setRoutingStrategy] = useState<RoutingStrategy>("app-shell");

  // Step completion
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});
  const markStepComplete = useCallback((step: number) => {
    setStepCompleted(prev => prev[step] ? prev : { ...prev, [step]: true });
  }, []);

  // Derived metrics calculated via engine loader
  const bundleSize = useMemo(() => {
    return calculateBundleSize(sharingEnabled, DEFAULT_SHARED_DEPS);
  }, [sharingEnabled]);

  const totalLoadTime = useMemo(() => {
    return calculateTotalLoadTime(loadStates);
  }, [loadStates]);

  const eventCount = eventBusMessages.length;

  // State inspector
  const stateEntries = useMemo<StateEntry[]>(() => {
    const readyCount = Object.values(loadStates).filter(s => s === "ready").length;
    return [
      { label: "loadedMFEs", value: `${readyCount}/3`, highlight: readyCount < 3 },
      { label: "sharedDeps", value: sharingEnabled.size, highlight: sharingEnabled.size > 0 },
      { label: "bundleSize", value: `${bundleSize}KB` },
      { label: "isolation", value: isolationMode },
      { label: "routing", value: routingStrategy },
      { label: "events", value: eventCount, highlight: eventCount > 0 },
      { label: "loadTime", value: `${totalLoadTime}ms` },
    ];
  }, [loadStates, sharingEnabled.size, bundleSize, isolationMode, routingStrategy, eventCount, totalLoadTime]);

  const value = useMemo<MicrofrontendContextValue>(
    () => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      mfeTeams: MFE_TEAMS,
      loadStates,
      setLoadState,
      sharedDeps: DEFAULT_SHARED_DEPS,
      sharingEnabled,
      toggleSharing,
      eventBusMessages,
      sendEvent,
      clearEvents,
      isolationMode,
      setIsolationMode,
      routingStrategy,
      setRoutingStrategy,
      bundleSize,
      totalLoadTime,
      eventCount,
      stepCompleted,
      markStepComplete,
      stateEntries,
    }),
    [
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      loadStates,
      setLoadState,
      sharingEnabled,
      toggleSharing,
      eventBusMessages,
      sendEvent,
      clearEvents,
      isolationMode,
      routingStrategy,
      bundleSize,
      totalLoadTime,
      eventCount,
      stepCompleted,
      markStepComplete,
      stateEntries,
    ]
  );

  return (
    <MicrofrontendContext.Provider value={value}>
      {children}
    </MicrofrontendContext.Provider>
  );
}

import type { FdIntersection, FdSection, FdSectionSlug, FdStop } from "./frontend-design-types";

export const SECTIONS: FdSection[] = [
  { slug: "core-fundamentals", name: "Core Fundamentals", shortName: "Core", description: "Box model, positioning, rendering pipeline, and the event loop — the bedrock of every pixel on screen", colorToken: "--diagram-layer-0", order: 1 },
  { slug: "dom-api", name: "DOM API", shortName: "DOM", description: "Querying, traversing, and mutating the document efficiently", colorToken: "--diagram-layer-1", order: 2 },
  { slug: "web-apis", name: "Web APIs for Complex UI", shortName: "Web APIs", description: "Observer APIs and browser primitives that power advanced UI patterns", colorToken: "--diagram-layer-2", order: 3 },
  { slug: "virtualisation", name: "Virtualisation", shortName: "Virtual", description: "Rendering thousands of elements without melting the browser", colorToken: "--diagram-layer-3", order: 4 },
  { slug: "state-design", name: "Application State Design", shortName: "State", description: "Search, storage, and memory strategies for client-side data", colorToken: "--diagram-layer-4", order: 5 },
  { slug: "network", name: "Network", shortName: "Network", description: "Browser networking, protocols, and real-time communication", colorToken: "--diagram-layer-5", order: 6 },
  { slug: "performance", name: "Web Application Performance", shortName: "Perf", description: "Optimizing JavaScript, CSS, images, bundles, and Core Web Vitals", colorToken: "--diagram-layer-6", order: 7 },
  { slug: "rendering-strategies", name: "Rendering Strategies", shortName: "Rendering", description: "CSR, SSR, SSG, ISR, streaming, and React Server Components", colorToken: "--diagram-layer-7", order: 8 },
  { slug: "security-auth", name: "Security & Auth", shortName: "Security", description: "XSS, CSRF, CSP, CORS, cookies, and OAuth token flows", colorToken: "--diagram-layer-8", order: 9 },
  { slug: "system-design-problems", name: "System Design Problems", shortName: "Problems", description: "Real-world frontend design challenges combining concepts across all sections", colorToken: "--diagram-layer-9", order: 10 },
];

export const STOPS: FdStop[] = [
  // ── 1. Core Fundamentals ────────────────────────────────────────
  { id: "core-box-model", sectionSlug: "core-fundamentals", label: "Box Model", slug: "box-model", order: 1, kind: "article", intersections: ["perf-css"] },
  { id: "core-positioning", sectionSlug: "core-fundamentals", label: "Positioning System", slug: "positioning-system", order: 2, kind: "article", intersections: [] },
  { id: "core-formatting-ctx", sectionSlug: "core-fundamentals", label: "Formatting Context", slug: "formatting-context", order: 3, kind: "article", intersections: [] },
  { id: "core-stacking-ctx", sectionSlug: "core-fundamentals", label: "Stacking Context", slug: "stacking-context", order: 4, kind: "article", intersections: [] },
  { id: "core-render-cycle", sectionSlug: "core-fundamentals", label: "Rendering Cycle & Reflow", slug: "rendering-cycle-reflow", order: 5, kind: "article", intersections: ["perf-js", "dom-query-perf"] },
  { id: "core-composition", sectionSlug: "core-fundamentals", label: "Composition Layers", slug: "composition-layers", order: 6, kind: "article", intersections: ["core-gpu"] },
  { id: "core-gpu", sectionSlug: "core-fundamentals", label: "GPU Acceleration", slug: "gpu-acceleration", order: 7, kind: "article", intersections: ["core-composition", "perf-css"] },
  { id: "core-event-loop", sectionSlug: "core-fundamentals", label: "Event Loop & Task Queues", slug: "event-loop", order: 8, kind: "article", intersections: ["core-microtasks", "net-long-polling"] },
  { id: "core-microtasks", sectionSlug: "core-fundamentals", label: "Microtasks & Promise Scheduling", slug: "microtasks", order: 9, kind: "article", intersections: ["core-event-loop"] },

  // ── 2. DOM API ──────────────────────────────────────────────────
  { id: "dom-refresher", sectionSlug: "dom-api", label: "API Refresher", slug: "dom-api-refresher", order: 1, kind: "overview", intersections: [] },
  { id: "dom-querying", sectionSlug: "dom-api", label: "Querying Methods Comparison", slug: "querying-methods", order: 2, kind: "article", intersections: [] },
  { id: "dom-query-perf", sectionSlug: "dom-api", label: "Optimizing Query Performance", slug: "query-performance", order: 3, kind: "article", intersections: ["core-render-cycle", "perf-js"] },
  { id: "dom-assignment-1", sectionSlug: "dom-api", label: "Coding Assignment #1", slug: "dom-coding-assignment", order: 4, kind: "coding-assignment", intersections: [] },

  // ── 3. Web APIs for Complex UI ──────────────────────────────────
  { id: "api-observer-overview", sectionSlug: "web-apis", label: "Observer API Overview", slug: "observer-api-overview", order: 1, kind: "overview", intersections: [] },
  { id: "api-intersection", sectionSlug: "web-apis", label: "Intersection Observer", slug: "intersection-observer", order: 2, kind: "article", intersections: ["virt-windowing", "sdp-image-gallery"] },
  { id: "api-assignment-2", sectionSlug: "web-apis", label: "Coding Assignment #2", slug: "observer-coding-assignment-2", order: 3, kind: "coding-assignment", intersections: [] },
  { id: "api-mutation", sectionSlug: "web-apis", label: "Mutation Observer", slug: "mutation-observer", order: 4, kind: "article", intersections: [] },
  { id: "api-assignment-3", sectionSlug: "web-apis", label: "Coding Assignment #3", slug: "observer-coding-assignment-3", order: 5, kind: "coding-assignment", intersections: [] },
  { id: "api-resize", sectionSlug: "web-apis", label: "Resize Observer", slug: "resize-observer", order: 6, kind: "article", intersections: ["virt-variable-height"] },
  { id: "api-assignment-4", sectionSlug: "web-apis", label: "Coding Assignment #4", slug: "observer-coding-assignment-4", order: 7, kind: "coding-assignment", intersections: [] },

  // ── 4. Virtualisation ───────────────────────────────────────────
  { id: "virt-windowing", sectionSlug: "virtualisation", label: "Windowing Fundamentals", slug: "windowing-fundamentals", order: 1, kind: "system-design-problem", intersections: ["api-intersection"] },
  { id: "virt-fixed-vs-variable", sectionSlug: "virtualisation", label: "Fixed vs Variable Height Rows", slug: "fixed-vs-variable-height", order: 2, kind: "system-design-problem", intersections: ["virt-variable-height"] },
  { id: "virt-variable-height", sectionSlug: "virtualisation", label: "Virtual Scroll Implementation", slug: "virtual-scroll-implementation", order: 3, kind: "system-design-problem", intersections: ["api-resize", "virt-fixed-vs-variable"] },
  { id: "virt-tree-grid", sectionSlug: "virtualisation", label: "Tree & Grid Virtualization", slug: "tree-grid-virtualization", order: 4, kind: "system-design-problem", intersections: ["sdp-spreadsheet"] },
  { id: "virt-canvas-dom", sectionSlug: "virtualisation", label: "Canvas vs DOM Rendering", slug: "canvas-vs-dom", order: 5, kind: "system-design-problem", intersections: ["sdp-whiteboard"] },

  // ── 5. Application State Design ─────────────────────────────────
  { id: "state-search", sectionSlug: "state-design", label: "Search / Access Optimization", slug: "search-access-optimization", order: 1, kind: "article", intersections: ["sdp-autocomplete"] },
  { id: "state-storage", sectionSlug: "state-design", label: "Browser Storage API Overview", slug: "browser-storage-api", order: 2, kind: "article", intersections: ["sdp-offline-first", "sdp-multi-tab"] },
  { id: "state-memory", sectionSlug: "state-design", label: "Memory Offloading", slug: "memory-offloading", order: 3, kind: "article", intersections: [] },

  // ── 6. Network ──────────────────────────────────────────────────
  { id: "net-intro", sectionSlug: "network", label: "Introduction to Browser Networking", slug: "browser-networking-intro", order: 1, kind: "overview", intersections: [] },
  { id: "net-protocols", sectionSlug: "network", label: "Protocols Overview", slug: "protocols-overview", order: 2, kind: "article", intersections: ["sdp-video-streaming"] },
  { id: "net-long-polling", sectionSlug: "network", label: "Long-polling / WebSockets / SSE", slug: "realtime-communication", order: 3, kind: "article", intersections: ["core-event-loop", "sdp-chat", "sdp-whiteboard"] },
  { id: "net-rest-graphql", sectionSlug: "network", label: "REST / GraphQL", slug: "rest-graphql", order: 4, kind: "article", intersections: [] },

  // ── 7. Web Application Performance ──────────────────────────────
  { id: "perf-js", sectionSlug: "performance", label: "JavaScript", slug: "perf-javascript", order: 1, kind: "article", intersections: ["core-render-cycle", "dom-query-perf"] },
  { id: "perf-css", sectionSlug: "performance", label: "CSS", slug: "perf-css", order: 2, kind: "article", intersections: ["core-box-model", "core-gpu"] },
  { id: "perf-images", sectionSlug: "performance", label: "Images", slug: "perf-images", order: 3, kind: "article", intersections: ["sdp-image-gallery"] },
  { id: "perf-assets", sectionSlug: "performance", label: "Other Assets", slug: "perf-other-assets", order: 4, kind: "article", intersections: [] },
  { id: "perf-cwv", sectionSlug: "performance", label: "Core Web Vitals", slug: "core-web-vitals", order: 5, kind: "article", intersections: ["render-ssr-streaming"] },
  { id: "perf-bundle", sectionSlug: "performance", label: "Bundle Optimization", slug: "bundle-optimization", order: 6, kind: "article", intersections: ["render-csr-ssr-ssg", "sdp-microfrontend"] },
  { id: "perf-hints", sectionSlug: "performance", label: "Resource Hints", slug: "resource-hints", order: 7, kind: "article", intersections: ["net-intro"] },

  // ── 8. Rendering Strategies ─────────────────────────────────────
  { id: "render-csr-ssr-ssg", sectionSlug: "rendering-strategies", label: "CSR vs SSR vs SSG", slug: "csr-ssr-ssg", order: 1, kind: "article", intersections: ["perf-bundle"] },
  { id: "render-isr", sectionSlug: "rendering-strategies", label: "ISR & On-Demand Revalidation", slug: "isr-revalidation", order: 2, kind: "article", intersections: [] },
  { id: "render-ssr-streaming", sectionSlug: "rendering-strategies", label: "Streaming SSR & Selective Hydration", slug: "streaming-ssr", order: 3, kind: "article", intersections: ["perf-cwv"] },
  { id: "render-rsc", sectionSlug: "rendering-strategies", label: "React Server Components", slug: "react-server-components", order: 4, kind: "article", intersections: [] },
  { id: "render-edge", sectionSlug: "rendering-strategies", label: "Edge Rendering", slug: "edge-rendering", order: 5, kind: "article", intersections: [] },

  // ── 9. Security & Auth ──────────────────────────────────────────
  { id: "sec-xss", sectionSlug: "security-auth", label: "XSS & Sanitization", slug: "xss-sanitization", order: 1, kind: "article", intersections: [] },
  { id: "sec-csrf", sectionSlug: "security-auth", label: "CSRF & Same-Origin Policy", slug: "csrf-same-origin", order: 2, kind: "article", intersections: [] },
  { id: "sec-csp", sectionSlug: "security-auth", label: "CSP & Security Headers", slug: "csp-security-headers", order: 3, kind: "article", intersections: [] },
  { id: "sec-cors", sectionSlug: "security-auth", label: "CORS Deep Dive", slug: "cors-deep-dive", order: 4, kind: "article", intersections: ["net-protocols"] },
  { id: "sec-cookies", sectionSlug: "security-auth", label: "Cookie Security & Session Management", slug: "cookie-security", order: 5, kind: "article", intersections: ["state-storage"] },
  { id: "sec-oauth", sectionSlug: "security-auth", label: "OAuth & Token Flows", slug: "oauth-token-flows", order: 6, kind: "article", intersections: [] },

  // ── 10. System Design Problems ──────────────────────────────────
  { id: "sdp-news-feed", sectionSlug: "system-design-problems", label: "Design a News Feed", slug: "design-news-feed", order: 1, kind: "system-design-problem", intersections: ["virt-windowing", "net-long-polling", "perf-js"] },
  { id: "sdp-autocomplete", sectionSlug: "system-design-problems", label: "Design an Autocomplete", slug: "design-autocomplete", order: 2, kind: "system-design-problem", intersections: ["dom-query-perf", "state-search", "net-rest-graphql"] },
  { id: "sdp-spreadsheet", sectionSlug: "system-design-problems", label: "Design a Spreadsheet", slug: "design-spreadsheet", order: 3, kind: "system-design-problem", intersections: ["virt-tree-grid", "state-search", "perf-js"] },
  { id: "sdp-chat", sectionSlug: "system-design-problems", label: "Design a Real-time Chat", slug: "design-realtime-chat", order: 4, kind: "system-design-problem", intersections: ["state-storage", "net-long-polling"] },
  { id: "sdp-whiteboard", sectionSlug: "system-design-problems", label: "Design a Collaborative Whiteboard", slug: "design-collaborative-whiteboard", order: 5, kind: "system-design-problem", intersections: ["virt-canvas-dom", "net-long-polling", "core-render-cycle"] },
  { id: "sdp-offline-first", sectionSlug: "system-design-problems", label: "Design an Offline-First App", slug: "design-offline-first-app", order: 6, kind: "system-design-problem", intersections: ["state-storage", "net-intro", "render-csr-ssr-ssg"] },
  { id: "sdp-multi-tab", sectionSlug: "system-design-problems", label: "Design Multi-tab Sync", slug: "design-multi-tab-sync", order: 7, kind: "system-design-problem", intersections: ["api-mutation", "state-storage"] },
  { id: "sdp-video-streaming", sectionSlug: "system-design-problems", label: "Design Adaptive Video Streaming", slug: "design-video-streaming", order: 8, kind: "system-design-problem", intersections: ["net-protocols", "perf-js"] },
  { id: "sdp-drag-drop", sectionSlug: "system-design-problems", label: "Design a Drag & Drop System", slug: "design-drag-drop", order: 9, kind: "system-design-problem", intersections: ["core-render-cycle", "dom-refresher", "api-intersection"] },
  { id: "sdp-notifications", sectionSlug: "system-design-problems", label: "Design a Notification System", slug: "design-notification-system", order: 10, kind: "system-design-problem", intersections: ["api-observer-overview", "net-long-polling", "render-edge"] },
  { id: "sdp-microfrontend", sectionSlug: "system-design-problems", label: "Design a Micro-frontend Architecture", slug: "design-microfrontend", order: 11, kind: "system-design-problem", intersections: ["state-memory", "perf-bundle", "render-csr-ssr-ssg"] },
  { id: "sdp-image-gallery", sectionSlug: "system-design-problems", label: "Design an Image Gallery", slug: "design-image-gallery", order: 12, kind: "system-design-problem", intersections: ["api-intersection", "virt-windowing", "perf-images"] },
  { id: "sdp-booking-platform", sectionSlug: "system-design-problems", label: "Design a Booking Platform", slug: "design-booking-platform", order: 13, kind: "system-design-problem", intersections: ["state-storage", "net-long-polling", "perf-js", "api-intersection"] },
];

// Slugs that have full interactive lab implementations
export const INTERACTIVE_LAB_SLUGS = new Set([
  "design-image-gallery",
  "design-booking-platform",
  "design-news-feed",
  "design-realtime-chat",
  "design-autocomplete",
  "design-drag-drop",
  "design-spreadsheet",
  "design-collaborative-whiteboard",
  "design-offline-first-app",
  "design-multi-tab-sync",
  "design-video-streaming",
  "design-notification-system",
  "design-microfrontend",
  "windowing-fundamentals",
  "fixed-vs-variable-height",
  "virtual-scroll-implementation",
  "tree-grid-virtualization",
  "canvas-vs-dom",
  "perf-javascript",
  "perf-css",
  "perf-images",
  "perf-other-assets",
  "core-web-vitals",
  "bundle-optimization",
  "resource-hints",
]);

// Slugs that have published MDX content (may or may not have a lab)
export const PUBLISHED_CONTENT_SLUGS = new Set([
  "box-model",
  "design-image-gallery",
  "design-booking-platform",
  "design-news-feed",
  "design-realtime-chat",
  "design-autocomplete",
  "design-drag-drop",
  "design-spreadsheet",
  "design-collaborative-whiteboard",
  "design-offline-first-app",
  "design-multi-tab-sync",
  "design-video-streaming",
  "design-notification-system",
  "design-microfrontend",
  "windowing-fundamentals",
  "fixed-vs-variable-height",
  "virtual-scroll-implementation",
  "tree-grid-virtualization",
  "canvas-vs-dom",
  "perf-javascript",
  "perf-css",
  "perf-images",
  "perf-other-assets",
  "core-web-vitals",
  "bundle-optimization",
  "resource-hints",
]);

export type StopAvailability = "interactive" | "article-only" | "coming-soon";

export function getStopAvailability(slug: string): StopAvailability {
  if (INTERACTIVE_LAB_SLUGS.has(slug)) return "interactive";
  if (PUBLISHED_CONTENT_SLUGS.has(slug)) return "article-only";
  return "coming-soon";
}

export function getSectionBySlug(slug: FdSectionSlug): FdSection | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}

export function getStopById(id: string): FdStop | undefined {
  return STOPS.find((s) => s.id === id);
}

export function getStopsForSection(sectionSlug: FdSectionSlug): FdStop[] {
  return STOPS.filter((s) => s.sectionSlug === sectionSlug).sort((a, b) => a.order - b.order);
}

export function computeIntersections(): FdIntersection[] {
  const seen = new Set<string>();
  const result: FdIntersection[] = [];

  for (const stop of STOPS) {
    for (const targetId of stop.intersections) {
      const target = STOPS.find((s) => s.id === targetId);
      if (!target || target.sectionSlug === stop.sectionSlug) continue;

      const key = [stop.id, targetId].sort().join("--");
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        stopA: stop.id,
        stopB: targetId,
        sectionA: stop.sectionSlug,
        sectionB: target.sectionSlug,
      });
    }
  }

  return result;
}

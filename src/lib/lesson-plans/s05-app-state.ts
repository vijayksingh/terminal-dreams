import type { LessonMeta } from "./types";

export const APP_STATE: Record<string, LessonMeta> = {
  "state-search": {
    stopId: "state-search",
    format: "battle",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "DataStructureBattle",
        description:
          "Three data structures racing: Array, Map/Object, Trie. " +
          "Reader types a search query (e.g., 'java'). All three structures search simultaneously " +
          "with ANIMATED TRAVERSAL: " +
          "- Array: linear scan, elements lighting up one-by-one (visible O(n)) " +
          "- Map: hash function animation → instant bucket jump → result (O(1)) " +
          "- Trie: character-by-character tree descent: j→a→v→a→... (O(k) where k=word length) " +
          "OPERATION COUNT BARS (not simulated time): Array shows '47,231 comparisons', " +
          "Map shows '1 hash + 1 lookup', Trie shows '4 node traversals'. " +
          "Bars race proportional to operation count — truthful and DevTools-proof. " +
          "Mode selector: Prefix / Exact / Insert / Delete — each mode has a different winner. " +
          "PREDICTION GATE before EACH MODE (not just first race). When reader switches to a new " +
          "mode (Prefix / Exact / Insert / Delete), a prediction prompt fires: " +
          "Prefix: 'Which structure wins for prefix search?' " +
          "Exact: 'For exact key lookup on 100K items, which wins?' " +
          "Insert: 'Which has the cheapest insertion?' " +
          "Delete: 'Which has the cheapest deletion?' " +
          "4 modes = 4 testable hypotheses, not 1 prediction + 3 passive observations. " +
          "Reader commits each prediction, then sees the race. Wrong predictions get specific feedback. " +
          "Dataset size slider: at small sizes, Array wins (cache locality). At large sizes, Map wins. " +
          "INSERT mode discovery: Array shows element shifting animation (cells slide right from " +
          "insertion point). DELETE mode: Array shows gap-closing animation. Both teach O(n) mutation cost. " +
          "Trie reframed as 'what a search library does internally' — not prescriptive, educational. " +
          "Trie construction happens in a Web Worker to avoid blocking the main thread on mount.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Predict which structure wins for prefix search, then run the race",
        reaction: "Trie returns all 'jav*' matches in 4 traversals. Map shows 'N/A — Maps cannot do prefix search'. Array does 47K comparisons",
        teaches: "Prediction → surprise is the teaching moment. Tries are purpose-built for prefix search; Maps can't do this at all",
      },
      {
        action: "Switch to exact lookup and try Map vs Array on 100k items",
        reaction: "Map: 1 hash + 1 lookup. Array: 47,231 comparisons. Operation count makes the O(1) vs O(n) gap visceral",
        teaches: "For exact key lookups, Map/Object is O(1) — use it for any lookup-heavy access pattern",
      },
      {
        action: "Try small dataset (20 items) where Array beats Map",
        reaction: "Array: 10 comparisons (fast). Map: 1 hash + 1 lookup (also fast, but hash has overhead). Array wins",
        teaches: "Data structure choice depends on dataset size — small arrays outperform hashmaps due to CPU cache effects and hash overhead",
      },
      {
        action: "Switch to Insert mode and watch Array vs Map",
        reaction: "Array: 47,231 elements shift right to make room (visible slide animation). Map: 1 hash + 1 insert. The mutation cost gap is even larger than search",
        teaches: "Array insertion is O(n) because every element after the insertion point must shift — this is why Maps are preferred for frequently-changing collections",
      },
    ],
    learningOutcome: "Choose Array vs Map vs Trie based on access pattern (exact lookup, prefix search, ordered iteration) and dataset size",
    agentNotes:
      "OPERATION COUNTS, NOT SIMULATED TIME. '47,231 comparisons' is truthful and cannot be " +
      "contradicted by a DevTools benchmark. The animated traversal is the visual reward; the " +
      "operation count is the honest metric. Prediction gate fires for EACH MODE SWITCH — " +
      "4 modes = 4 predictions, each committal makes the correction stick. " +
      "Trie is reframed as 'what search libraries do internally' — educational, not prescriptive. " +
      "Build Trie in a Web Worker on mount to avoid blocking the main thread.",
  },

  "state-storage": {
    stopId: "state-storage",
    format: "anatomy",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "StorageAnatomyViewer",
        description:
          "Five storage 'drawers' arranged like a filing cabinet: localStorage, sessionStorage, " +
          "IndexedDB, Cookies, Cache API. " +
          "STREAMLINED: each drawer has only 2 views (not 4): " +
          "- 'Try It' panel: write test data + size limit stress test (combined). " +
          "  localStorage: type key/value, click save, see it appear. Click 'Fill to limit' → " +
          "  watch bar fill to 5MB → QuotaExceededError. IndexedDB blinks 'I can handle this.' " +
          "- 'Traits' card: sync/async, size limit, persistence, scope — as a compact comparison card. " +
          "Cookies drawer is HONEST about JS limitations: shows only name-value pairs from " +
          "document.cookie with a note: 'HttpOnly, Secure, and SameSite flags are set by the " +
          "server and not visible to JavaScript. Check DevTools > Application > Cookies.' " +
          "This limitation itself teaches why HttpOnly exists. " +
          "Mock data with meaningful labels ('theme: dark', 'cart: [{id: 42, qty: 2}]') instead of " +
          "reading real browser data (which is opaque analytics garbage on most browsers). " +
          "QUIZ-FIRST DESIGN: The quiz IS the opening experience — 8 scenario cards appear " +
          "before the drawers are fully explored. Reader drags each to a storage bucket. " +
          "Wrong answers get specific feedback explaining WHY that storage is wrong. " +
          "'Auth token → localStorage' gets: 'localStorage is accessible to any JavaScript on the " +
          "page — an XSS attack could steal the token. Use HttpOnly cookies instead.' " +
          "After each wrong answer, the RELEVANT DRAWER opens automatically as a reference — " +
          "the drawers become resources for understanding errors, not a browsable reference. " +
          "SENIOR-TRICKY SCENARIOS (3 of the 8 designed to catch experienced developers): " +
          "- 'Cache API responses that MUST revalidate on every load' — not localStorage or IndexedDB. " +
          "  Answer: Cache API with explicit validation (stale-while-revalidate pattern). " +
          "  Wrong: 'localStorage has no built-in revalidation — you'd build a custom TTL check.' " +
          "- 'Store a preference that a Service Worker reads during offline fetch' — not localStorage. " +
          "  Answer: IndexedDB (SW cannot access localStorage synchronously). " +
          "  Wrong: 'Service Workers run on a separate thread with no synchronous storage access.' " +
          "- 'Persist state that survives browser profile migration to a new device' — trick question. " +
          "  Answer: None of these — you need server-side persistence. " +
          "  Wrong: 'All browser storage APIs are device-local. Cross-device = server.' " +
          "This inverts the flow from 'browse then quiz' to 'quiz then browse to understand.'",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Click 'Fill to limit' on localStorage and watch it hit 5MB",
        reaction: "QuotaExceededError — IndexedDB drawer blinks 'I can handle this'",
        teaches: "localStorage is limited to ~5MB — use IndexedDB for anything larger",
      },
      {
        action: "Write to localStorage, close the drawer, reopen it",
        reaction: "Data persists — it survived the drawer close. A 'storage event' badge flashes showing cross-tab sync",
        teaches: "localStorage persists across sessions and fires storage events in OTHER tabs — useful for cross-tab communication but also a security surface",
      },
      {
        action: "Try to read HttpOnly cookie data from the Cookies drawer",
        reaction: "Drawer shows only name-value pairs with a note: 'HttpOnly cookies are invisible to JavaScript — that's the point'",
        teaches: "JavaScript cannot see HttpOnly cookies. This is a feature, not a bug — it protects auth tokens from XSS",
      },
      {
        action: "Drag 'auth token' to localStorage in the quiz",
        reaction: "Wrong — feedback: 'localStorage is readable by any script on the page. An XSS vulnerability would expose every token. HttpOnly cookies are server-set and JS-invisible.'",
        teaches: "The quiz teaches through correction — wrong answers with specific feedback are more memorable than right answers",
      },
    ],
    learningOutcome: "Pick the right browser storage API based on data size, persistence, security, and access pattern",
    agentNotes:
      "TWO views per drawer, not four. 'Try It' (write + stress test) and 'Traits' (compact card). " +
      "QUIZ-FIRST: quiz IS the opening experience. Drawers open ON wrong answers, not before. " +
      "3 of 8 scenarios are SENIOR-TRICKY: Cache API revalidation, SW storage access, " +
      "cross-device persistence (trick question — none work). These catch experienced devs. " +
      "Ghost feature 'second tab preview panel' REMOVED from discovery 2 — replaced with " +
      "persist-across-close + storage event badge. " +
      "Use MOCK data with meaningful labels, not real browser data (which is opaque). " +
      "Cookies drawer must be honest about JS visibility limitations.",
  },

  "state-memory": {
    stopId: "state-memory",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "MemoryTierAllocator",
        description:
          "INTERACTIVE-FIRST, not scroll-first. The three-tier allocator is the OPENING experience. " +
          "Three memory tiers as horizontal bars: Main Thread (small, fast), Web Worker (medium, " +
          "parallel), IndexedDB (large, persistent). " +
          "PHASE 1 — BREAK IT: Reader starts with all data in Main Thread (100% allocation). " +
          "Memory pressure gauge is red. GC pause triangles appear. " +
          "SIMULATED UI FREEZE: a mock todo-app preview panel (3 items, an input, a button) runs " +
          "at 60fps normally. As memory pressure rises, frame-rate visibly degrades: input latency " +
          "increases (typed characters appear after a delay), button clicks stall, scroll judders. " +
          "At 100% main-thread allocation, the preview drops to ~5fps with a 'Long Task' badge. " +
          "This connects abstract memory pressure to USER-FACING consequence, not just gauge readings. " +
          "The reader drags data blobs from Main Thread down to Worker and IndexedDB tiers. " +
          "As they redistribute: pressure gauge drops, GC pauses disappear, UI unfreezes. " +
          "Constraint: three sliders must sum to total — moving one forces tradeoffs on others. " +
          "PHASE 2 — DISCOVER COSTS: When data moves between tiers, a serialization cost counter " +
          "shows operation overhead: 'postMessage: ~1,200 structured clone ops for 5MB' (not fake ms). " +
          "Moving data to IndexedDB shows 'async read: ~3 ops, but latency varies.' " +
          "PHASE 3 — LRU CACHE: Toggle on 'Auto-manage with LRU.' Watch hot items stay in Main " +
          "Thread, cold items auto-evict to IndexedDB. Access a cold item → it promotes back to " +
          "Main Thread, pushing the least-recent item down. " +
          "BELOW the interactive: 3 short prose sections explaining the mechanics the reader " +
          "just experienced. SharedArrayBuffer is a one-line footnote: " +
          "'For zero-copy sharing, see SharedArrayBuffer (requires COOP/COEP headers).'",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Start with 100% Main Thread and watch the UI freeze",
        reaction: "Memory pressure gauge maxes out, GC pause triangles spike, simulated UI stutters visibly",
        teaches: "Too much data in main thread memory causes GC pauses that directly block rendering",
      },
      {
        action: "Drag data from Main Thread to Worker and watch serialization cost",
        reaction: "Counter shows '~1,200 structured clone ops for 5MB' — the transfer isn't free",
        teaches: "postMessage uses structured cloning — transferring large data to Workers has a real serialization overhead",
      },
      {
        action: "Toggle LRU cache on and access a cold item from IndexedDB",
        reaction: "Item promotes to Main Thread (fast lane), least-recent item evicts down to IndexedDB",
        teaches: "LRU caching keeps frequently-accessed data fast while automatically managing memory pressure",
      },
      {
        action: "Try to get all three gauges green simultaneously",
        reaction: "Reader discovers the sweet spot: ~30% Main Thread (hot), ~20% Worker (compute), ~50% IndexedDB (cold)",
        teaches: "Memory architecture is about tradeoffs — there's no single right answer, but there's always a balance point",
      },
    ],
    learningOutcome: "Design a multi-tier memory strategy: main thread for hot data, Worker for computation, IndexedDB for cold storage",
    agentNotes:
      "FORMAT CHANGED from scrollytelling to explorable. The allocator IS the lesson — " +
      "the reader breaks the system first (100% main thread), then fixes it by redistributing. " +
      "Prose comes AFTER interaction, answering questions the reader already formed. " +
      "Use operation counts, not simulated milliseconds. " +
      "SharedArrayBuffer is a footnote, not a full step — it requires infrastructure most " +
      "frontend apps don't have (COOP/COEP headers) and is not actionable for the target audience.",
  },

  "state-shape": {
    stopId: "state-shape",
    format: "explorable",
    effort: "large",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "StateShapeExplorable",
        description:
          "The state design lesson this section was missing. " +
          "PHASE 1 — ENCOUNTER THE BUG: A mock social app with a denormalized state blob. " +
          "User objects duplicated across posts, comments, friends list. " +
          "Reader clicks 'Rename user Alice → Alicia' → name updates in the profile but stays " +
          "'Alice' in 3 comments and 1 post. The bug is visible, immediate, and infuriating. " +
          "PHASE 2 — NORMALIZE: Reader drags entities into a normalized structure: " +
          "users: { byId: {}, allIds: [] }, posts: { byId: {}, allIds: [] }. " +
          "A visual shows references (arrows) replacing duplicated data (copied blobs). " +
          "Reader clicks 'Rename' again → all references update from one source. Bug gone. " +
          "PHASE 3 — DERIVED STATE: Reader sees a 'feed' view that needs posts + author names + " +
          "comment counts. Toggle 'compute on render' vs 'memoized selector.' " +
          "A render counter shows: without memoization, feed recomputes on ANY state change. " +
          "With memoized selector, it only recomputes when posts or users actually change. " +
          "PHASE 4 — OPTIMISTIC UPDATES (connected back to normalization): Like a post. " +
          "Two strategies side by side: 'Wait for server' vs 'Optimistic'. " +
          "SERVER TOGGLE: 'Server: Reliable / Flaky' (replaces 10% random chance). " +
          "Reliable mode (default): all likes succeed. Reader sees optimistic UI working smoothly. " +
          "Flaky mode (reader toggles): every 3rd like fails with visible rejection. Deterministic " +
          "pattern ensures reader ALWAYS sees rollback — no hoping for random distribution. " +
          "Controlled discovery ('I turned on flaky mode') teaches more than random surprise. " +
          "KEY CONNECTION: On each rollback, show TWO rollback paths SIDE BY SIDE: " +
          "LEFT: 'Normalized rollback' — 1 operation, one cell flashes (~200ms), done. " +
          "  Decrement posts.byId[id].likes — one source of truth, one update. " +
          "RIGHT: 'Denormalized rollback' — 3+ operations, cells flash sequentially (~800ms), " +
          "  'hunting...' label appears as it finds and decrements in posts feed, comments sidebar, " +
          "  profile view. One might be missed (a '⚠ stale' badge appears on the missed copy). " +
          "FEASIBILITY FALLBACK: if side-by-side animation is too expensive, a textual comparison " +
          "after the rollback captures 80% of the teaching: 'Normalized: 1 operation. Denormalized: " +
          "3+ operations, and you might miss one.' " +
          "This connects Phase 4 back to Phase 2 — normalization doesn't just prevent stale reads, " +
          "it makes optimistic rollbacks trivial. Phase 4 isn't a 'bonus topic' — it's PROOF " +
          "that normalization matters for writes, not just reads.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Rename a user in denormalized state and see stale data everywhere",
        reaction: "Profile says 'Alicia' but comments still say 'Alice' — the update anomaly is immediately visible",
        teaches: "Denormalized state creates update anomalies — duplicate data drifts out of sync",
      },
      {
        action: "Drag entities into normalized structure and rename again",
        reaction: "One update, all references follow. Zero stale data",
        teaches: "Normalized state stores each entity once with ID references — updates propagate automatically",
      },
      {
        action: "Toggle memoized selector on/off and watch the render counter",
        reaction: "Without: feed recomputes on every keystroke in an unrelated input. With: only on post/user changes",
        teaches: "Derived state should be memoized — recomputing on every render is wasted work when source data hasn't changed",
      },
      {
        action: "Toggle server to 'Flaky' and spam the like button with optimistic updates enabled",
        reaction: "Every 3rd like rolls back (count decrements with a red flash) — deterministic failure so you always see the rollback pattern",
        teaches: "Optimistic UI gives instant feedback but must handle server rejection gracefully — the deterministic toggle ensures you experience rollback every time",
      },
    ],
    learningOutcome: "Design normalized state shapes with memoized selectors and optimistic update strategies",
    agentNotes:
      "This stop fills the section's biggest gap: actual state DESIGN. The denormalized bug is " +
      "the hook — the reader encounters a real problem before learning the solution. " +
      "The normalization drag interaction makes the refactoring physical, not abstract. " +
      "SERVER TOGGLE replaces 10% random failure: 'Reliable / Flaky' gives reader CONTROL over " +
      "when to see rollbacks. Flaky mode: every 3rd like fails deterministically. " +
      "TWO-PATH ROLLBACK shown SIDE BY SIDE: normalized (1 op, 200ms, left) vs denormalized " +
      "(3+ ops, 800ms, hunting label, right). The missed-copy '⚠ stale' badge is visceral. " +
      "FEASIBILITY FALLBACK: textual comparison if animation too expensive. " +
      "Phase 4 isn't a bonus — it's proof that normalization matters for writes, not just reads. " +
      "This stop transforms the section from 'data structures + storage' into genuine state architecture.",
  },
};

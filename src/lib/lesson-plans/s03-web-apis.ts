import type { LessonMeta } from "./types";

export const WEB_APIS: Record<string, LessonMeta> = {
  "api-observer-overview": {
    stopId: "api-observer-overview",
    format: "explorable",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "ObserverRouterExplorable",
        description:
          "FORMAT CHANGED from anatomy to explorable. No more glossary cards. " +
          "ROUTE THE SCENARIO: 5 live mini-simulations of UI problems. Each is a 120px-tall " +
          "interactive vignette showing a real UI issue: " +
          "1. Images loading below the fold (visible scroll area, images popping in too early) " +
          "2. A sidebar resizing and its content overflowing (layout breaking visibly) " +
          "3. A user injecting spam nodes into a comment section (DOM changing live) " +
          "4. An element appearing/disappearing as a panel opens/closes " +
          "5. A component that needs to know its own width to pick a layout " +
          "PREDICTION GATE before buckets appear: 'Look at these 5 problems. Which two do you " +
          "think use the SAME observer?' Reader commits a grouping prediction, THEN the buckets " +
          "appear. This forces reasoning about observer PURPOSE before classification by label. " +
          "Reader drags each scenario to one of three observer buckets (IO, MO, RO). " +
          "WRONG MATCHES VISIBLY FAIL with VISUAL demonstrations (not just text): " +
          "- Resize scenario → IO: IO fires on visibility change, but the sidebar stays broken " +
          "  (layout overflow still visible). Text: 'IO tracks visibility, not size.' " +
          "- Images scenario → MO: MO watches for DOM changes but images already exist — " +
          "  all images load at once (no lazy loading). Page weight counter shows 12MB. " +
          "- Spam nodes scenario → RO: RO fires on resize caused by new nodes, but callback " +
          "  says 'width changed' not 'new node added' — can't identify WHAT changed. " +
          "At least 3 of 15 wrong combinations have fully animated visual failure states. " +
          "Others show text explanation. " +
          "RIGHT MATCHES SUCCEED: dragging resize to RO shows the component adapting correctly. " +
          "PerformanceObserver is NOT included — it belongs in Section 7 (Performance). " +
          "Removing it eliminates the 'taught in overview, never deepened' gap. " +
          "OBSERVER LIFECYCLE COMPARISON: after all 5 are routed, a summary appears showing " +
          "the shared construct→observe→callback→disconnect pattern with each observer's " +
          "specific cleanup quirk highlighted (IO: unobserve per-element, MO: disconnect+reconnect " +
          "for mutations, RO: debounce or threshold-check in callback).",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Drag the 'images loading below fold' scenario to MutationObserver",
        reaction: "MO watches for DOM changes, not visibility — the images still load all at once. Try IntersectionObserver instead",
        teaches: "Wrong matches fail visibly — learning through consequence, not classification",
      },
      {
        action: "Successfully route all 5 scenarios to the right observers",
        reaction: "Summary appears showing the shared construct→observe→callback→disconnect lifecycle with per-observer cleanup differences",
        teaches: "All observers share one pattern but differ in WHAT they watch and HOW to clean up",
      },
    ],
    learningOutcome: "Route real UI problems to the correct Observer API by seeing wrong choices fail",
    agentNotes:
      "The key change: wrong matches VISIBLY FAIL. The observer tries and cannot solve the " +
      "problem — the reader sees the consequence. This teaches through experience, not quizzing. " +
      "PREDICTION GATE before buckets: forces grouping-by-concept before classification-by-label. " +
      "Effort upgraded from small to medium: 5 mini-sims with 15 outcome paths (3 animated, 12 text). " +
      "PerformanceObserver is removed entirely — it confused the section by being taught at " +
      "surface level and never deepened. It belongs in S07.",
  },

  "api-intersection": {
    stopId: "api-intersection",
    format: "explorable",
    effort: "large",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "IntersectionExplorable",
        description:
          "A 300px-tall viewport container with 3 colored blocks below it (cut from 5 — " +
          "once you've seen one ratio bar fill, you understand the mechanic). " +
          "Reader scrolls the container and sees: " +
          "- Threshold lines overlaid on each element (dashed horizontals at configured thresholds) " +
          "- Intersection ratio bar per element (uses ACTUAL IO callback data, not rAF-synced — " +
          "  the async lag between scroll and callback is itself a teaching moment) " +
          "- isIntersecting badge flipping green/red per element " +
          "- A callback log styled as a browser console (timestamped, color-coded per element) " +
          "ROOTMARGIN VISUALIZATION: a translucent colored border around the viewport showing " +
          "the rootMargin expanding/contracting the observation zone. " +
          "PREDICTION GATE before rootMargin drag: '200px rootMargin — will callbacks fire " +
          "earlier or later than without it?' Reader commits, THEN drags handles to see. " +
          "PREDICTION GATE before root toggle: 'Switching to container root — rootMargin " +
          "expands from where?' Reader predicts viewport vs container before toggling. " +
          "PREDICTION GATE before fast scroll: 'Scroll fast past 3 threshold lines — how " +
          "many callbacks fire?' Options: (a) 3 (b) 1 (c) depends on speed. Reader predicts, " +
          "THEN scrolls fast to see threshold skipping. " +
          "PREDICTION GATE before threshold placement: 'Thresholds at [0, 0.5, 1] — how " +
          "many callbacks as element scrolls fully into view?' Reader predicts, THEN places. " +
          "READ-ONLY CODE BRIDGE: as reader manipulates controls, a read-only annotation shows " +
          "the corresponding IO constructor: new IntersectionObserver(cb, { rootMargin: '200px', " +
          "threshold: [0, 0.5, 1] }). Maps controls to API shape — not an editor, just a mirror. " +
          "Drag the margin handles to change rootMargin — watch callbacks fire EARLIER (positive margin) or LATER (negative). " +
          "Implementation note: changing rootMargin requires disconnecting and re-observing with " +
          "a new IO instance — handle closure cleanup to avoid zombie observers. " +
          "THRESHOLD BUILDER: click to place threshold lines on an element. " +
          "ROOT OPTION: toggle between root: null (viewport) and root: container (custom scroll root). " +
          "Switch to custom root → observation zone snaps to the container bounds. " +
          "This teaches the critical 'lazy loading inside a scrollable div' pattern. " +
          "Right panel SIMPLIFIED: rootMargin drag handles + threshold presets + callback log. " +
          "No live config code block (redundant with controls).",
        reuses: ["DemoSandbox", "Dial", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Set rootMargin to 200px and scroll slowly",
        reaction: "Elements trigger callbacks while still 200px BELOW the visible area — the observation zone is bigger than the viewport",
        teaches: "rootMargin expands the invisible observation area — perfect for lazy-loading ahead of scroll",
      },
      {
        action: "Place thresholds at 0, 0.5, and 1.0 on an element",
        reaction: "Three separate callbacks fire as the element enters, reaches halfway, and is fully visible",
        teaches: "Multiple thresholds give you granular scroll-linked feedback without a scroll listener",
      },
      {
        action: "Scroll fast vs slow through the same element",
        reaction: "Fast scrolling might skip intermediate thresholds — callback fires with the final ratio, not every threshold",
        teaches: "IntersectionObserver is asynchronous — fast scroll can skip intermediate thresholds. The ratio bar's slight lag from actual scroll position demonstrates this",
      },
      {
        action: "Toggle root from null (viewport) to the custom scroll container",
        reaction: "Observation zone snaps from full page to just the container bounds — rootMargin now extends from the container, not the viewport",
        teaches: "The root option controls WHICH scrollable ancestor is the observation boundary — critical for lazy loading inside scrollable panels, chat windows, or dashboards",
      },
    ],
    learningOutcome: "Configure IntersectionObserver thresholds, rootMargin, and root for lazy loading, infinite scroll, and scroll-triggered animations",
    agentNotes:
      "3 blocks, not 5. Use ACTUAL IO callback data for ratio bars (let the async lag teach). " +
      "The root toggle is a must-have — it covers the most impactful gap from the critique. " +
      "4 PREDICTION GATES throughout the explorable: rootMargin (earlier/later), root toggle " +
      "(expands from where), fast scroll (how many callbacks), threshold placement (how many callbacks). " +
      "READ-ONLY CODE BRIDGE: shows IO constructor updating as controls change. Maps visual " +
      "manipulation to API shape. Not an editor — just a mirror that connects explorable to code. " +
      "Right panel simplified: no live config code block (code bridge replaces it).",
  },

  "api-assignment-2": {
    stopId: "api-assignment-2",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "IOChallengeChain",
        description:
          "3 progressive challenges (cut from 4 — merged basic IO into challenge 1 as starter code): " +
          "1. Lazy images with rootMargin: starter code has basic IO observe. Reader adds " +
          "   rootMargin=200px and unobserve after load. Tests verify both. " +
          "2. Infinite scroll: observe a sentinel, load more on intersect, re-observe sentinel " +
          "   after DOM update. Tests verify sentinel re-observation. " +
          "3. Scroll-progress indicator: use multiple thresholds (0, 0.1, 0.2, ..., 1.0) to " +
          "   calculate section progress and update a progress bar. Tests verify threshold " +
          "   granularity and progress accuracy. THIS REPLACES the CSS stagger challenge — " +
          "   it tests IO thresholds, not CSS transitions. " +
          "Preview panel is scrollable. Each challenge has a FALSIFIABLE prediction prompt: " +
          "Challenge 1: 'What happens if you forget to unobserve?' — 3 options: " +
          "(a) Memory leak (b) Images reload on scroll-back (c) Unnecessary callbacks fire. " +
          "Reader's answer is STORED and compared after coding. If they predicted (a) but " +
          "actual is (c), correction: 'Not a leak — but each scroll fires callbacks for " +
          "already-loaded images. The cost is CPU, not memory.' " +
          "Challenge 2: 'What happens when sentinel is removed and re-added?' " +
          "Challenge 3: 'With thresholds [0, 1], can you show 50% progress?' " +
          "Stored-and-compared answers turn predictions into testable hypotheses. " +
          "STRETCH GOAL (optional, after Challenge 3): 'Batch observe 200 images in one rAF " +
          "to reduce callback count.' Tests performance thinking, not just IO API knowledge.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Forget to unobserve after lazy-loading an image",
        reaction: "Test warns: 'observer is still watching loaded images — unnecessary callbacks on every scroll'",
        teaches: "Always unobserve elements after their one-time callback (lazy loading, entrance animations)",
      },
      {
        action: "Use a single threshold [0] for scroll progress instead of granular thresholds",
        reaction: "Progress bar only shows 0% or 100% — no intermediate values. Reader adds more thresholds and progress becomes smooth",
        teaches: "Threshold granularity determines how many progress updates you get — more thresholds = smoother tracking",
      },
    ],
    learningOutcome: "Implement lazy loading, infinite scroll, and scroll-progress tracking with IntersectionObserver",
    agentNotes:
      "3 challenges, not 4. Challenge 1 starts with basic IO as starter code — the reader's " +
      "job is to ADD rootMargin and unobserve, not write IO from scratch (that was taught in " +
      "the explorable). Challenge 3 tests IO thresholds specifically, not CSS. " +
      "Prediction prompts before each challenge raise engagement.",
  },

  "api-mutation": {
    stopId: "api-mutation",
    format: "explorable",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "MutationExplorable",
        description:
          "Left: an interactive DOM tree (click to expand/collapse nodes). " +
          "Action buttons use SCENARIO-BASED LABELS (not mutation-type labels): " +
          "'Add a todo item', 'Edit the title', 'Nest a sub-item', 'Tag the list', 'Delete an item'. " +
          "This hides the mutation type so the reader must figure out which config option " +
          "catches which action. " +
          "Right: MutationRecord live log showing core fields only: type, target, " +
          "addedNodes/removedNodes, attributeName, oldValue. A 'show all fields' toggle " +
          "reveals previousSibling, nextSibling (only relevant for advanced use). " +
          "THE TEACHING MECHANIC: config toggles at the top. " +
          "childList / attributes / characterData / subtree / attributeOldValue " +
          "Start with ALL toggles OFF. Reader tries 'Add a todo item' → nothing logged. " +
          "They discover they need childList. Then 'Nest a sub-item' → still nothing → subtree. " +
          "Then 'Edit the title' (characterData) → discover characterData toggle. " +
          "DETACHED ELEMENT BEHAVIOR: a 'Remove + Re-add' button removes an element the observer " +
          "is watching, then re-adds it. Does the observer still fire? (No — it was disconnected " +
          "when the element left the DOM. Must re-observe.) This teaches a real SPA edge case. " +
          "takeRecords() DEMO: PREDICTION GATE before flush: 'When you flush, will the records " +
          "appear in the callback log below, or somewhere else?' The answer (they appear " +
          "immediately and synchronously, NOT in the async callback) is counter-intuitive. " +
          "Reader predicts, clicks 'Flush pending', sees records appear instantly in a " +
          "SEPARATE synchronous log — not the async callback log below. " +
          "Useful for testing, SSR hydration, and cleanup scenarios. " +
          "CODE BRIDGE for detached element re-observation: inline annotation shows " +
          "'// After reinsertion: observer.observe(node)' connecting visual discovery to code. ",
        reuses: ["DemoSandbox", "DialToggle"],
      },
    ],
    discoveries: [
      {
        action: "Click 'Add a todo item' with all config toggles off",
        reaction: "Nothing logged. Nudge: 'The observer isn't watching for this — which config option would catch this action?'",
        teaches: "MutationObserver only watches what you explicitly configure — childList for child changes",
      },
      {
        action: "Turn on childList then click 'Nest a sub-item'",
        reaction: "Nothing logged. Nudge: 'childList only watches direct children by default'",
        teaches: "subtree:true is needed to observe the entire descendant tree, not just direct children",
      },
      {
        action: "Remove an observed element then re-add it, check if observer still fires",
        reaction: "No mutations logged after re-add — the observer lost track when the element left the DOM",
        teaches: "Observers on detached elements stop working — you must re-observe after re-insertion. This is a common SPA bug",
      },
      {
        action: "Click 'Flush pending' (takeRecords) while mutations are queued",
        reaction: "Records appear immediately in the log instead of waiting for the async microtask callback",
        teaches: "takeRecords() synchronously returns pending records — useful for testing, cleanup, and SSR hydration",
      },
    ],
    learningOutcome: "Configure MutationObserver through discovery, handle detached elements, and use takeRecords for synchronous access",
    agentNotes:
      "Scenario-based button labels, not mutation-type labels. Core fields only in the log " +
      "(toggle for advanced). Detached element behavior and takeRecords() fill real coverage gaps.",
  },

  "api-assignment-3": {
    stopId: "api-assignment-3",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "MOChallengeChain",
        description:
          "3 progressive challenges (cut from 4, scoped down): " +
          "STRUCTURAL DIFFERENTIATOR: live DOM tree sidebar (miniature version of explorable's tree) " +
          "shows real-time mutations as the learner's code executes. This connects the challenge " +
          "back to the explorable and provides visual feedback beyond pass/fail. " +
          "1. Watch for class changes: observe an element with attributeFilter: ['class']. " +
          "   STRONGER VERSION: element changes BOTH class AND data-state. Reader must observe " +
          "   ONLY class changes. attributeFilter becomes a decision (what to include/exclude) " +
          "   not a configuration (set the one correct value). Tests verify attributeOldValue captured. " +
          "2. Highlight new elements: observe childList + subtree, add a 'new-item' CSS class " +
          "   to any dynamically-added DOM nodes. Tests verify the class is added to new nodes " +
          "   only (not existing ones). SPECIFICITY: 'new nodes are elements added by the Add Item " +
          "   button, not text nodes or framework artifacts.' THIS REPLACES contenteditable URL. " +
          "3. Infinite loop: PREDICTION GATE before running: 'This code looks correct. Will it " +
          "   work? Predict what happens.' Options: (a) works fine (b) throws an error (c) runs " +
          "   forever. Reader commits, THEN runs. Prediction shatters the 'works fine' assumption. " +
          "   INVERTED FLOW. Reader sees the loop (safely caught at 500 iterations), then must " +
          "   DEBUG rather than build. Fix: disconnect() before DOM modification, reconnect after. " +
          "   DOM tree sidebar shows mutations cascading out of control. " +
          "STRETCH GOAL (optional, after Challenge 3): 'Use takeRecords + requestIdleCallback to " +
          "defer heavy MO processing.' Tests architectural thinking, not just API knowledge.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Run the 'looks correct' code in challenge 3 and watch the DOM tree sidebar",
        reaction: "DOM tree explodes with mutations — the sidebar shows cascading changes until the 500-iteration safety cap triggers",
        teaches: "Debugging an infinite loop is harder than preventing one — the disconnect/reconnect pattern is essential",
      },
      {
        action: "Add 'new-item' class to ALL nodes instead of just new ones in challenge 2",
        reaction: "Test fails: 'Class added to 15 nodes, expected 3 — you're highlighting existing nodes too'",
        teaches: "MutationObserver callbacks include addedNodes — use them to target only the NEW elements",
      },
    ],
    learningOutcome: "Use MutationObserver for DOM augmentation without infinite loops, with targeted node selection",
    agentNotes:
      "3 challenges, not 4. DOM undo is cut (too ambitious). Challenge 3 is DEBUG, not BUILD — " +
      "reader is given buggy code and must find and fix the infinite loop. The live DOM tree " +
      "sidebar differentiates this chain from IO and RO chains structurally.",
  },

  "api-resize": {
    stopId: "api-resize",
    format: "explorable",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "ResizeExplorable",
        description:
          "MAIN DEMO reduced to 280px height (from 400px) to bring comparison above the fold. " +
          "A resizable container with a card that changes layout based on its own width: " +
          "- > 600px: horizontal layout (image left, text right) " +
          "- 300-600px: vertical layout (image top, text bottom) " +
          "- < 300px: compact mode (image hidden, only title visible) " +
          "Purely ResizeObserver driven, no media queries. " +
          "Callback counter shows how many resize callbacks fire. " +
          "Side panel: live contentBoxSize/borderBoxSize values (contentRect cut — redundant). " +
          "CONTENTBOXSIZE vs BORDERBOXSIZE interaction: Add padding to the container via a slider. " +
          "PREDICTION GATE before padding slider: 'Add 20px padding. Will contentBoxSize shrink, " +
          "grow, or stay the same?' Options: (a) Shrink by 40px (b) Grow by 40px (c) Stay the same. " +
          "Answer: (a) — contentBoxSize excludes padding, so padding eats into the content box. " +
          "contentBoxSize changes differently than borderBoxSize. Reader must choose which to use " +
          "for layout breakpoints. Discovery: '20px padding means borderBoxSize says 320px but " +
          "contentBoxSize says 280px — which one should drive your breakpoint?' This is a real " +
          "decision RO users face and no other tutorial covers. " +
          "DEBOUNCE COST experience: " +
          "PREDICTION GATE before heavy callback toggle: 'This callback adds 5ms of work. You " +
          "resize continuously (smooth drag). What do you expect? (a) Smooth as before (b) " +
          "Noticeable stutter (c) Browser freeze.' Answer: (b) — RO fires on every pixel change, " +
          "5ms × hundreds of callbacks = visible jank. " +
          "'Heavy callback' toggle adds 5ms artificial delay per callback. " +
          "Rapid resizing with heavy callback shows visible jank (callback counter climbs, layout " +
          "stutters, frames drop). A debounce toggle fixes it. Discovery: debouncing is not advice, " +
          "it's a response to EXPERIENCED jank. Without the jank, 'debounce your callback' is abstract. " +
          "READ-ONLY CODE BRIDGE: shows RO constructor updating as controls change: " +
          "new ResizeObserver(entries => { entries[0].contentBoxSize... }). " +
          "THE COMPARISON with GUIDED TWO-STEP: " +
          "Step 1 appears first: 'Resize the container using the slider.' Reader drags, sees " +
          "RO version adapt while MQ version stays frozen. " +
          "Step 2 appears after slider interaction: 'Now try resizing your browser window. " +
          "Which version responds?' with an annotation arrow pointing to the MQ version. " +
          "Reader resizes browser → BOTH versions respond. The guided sequence ensures both " +
          "actions happen and the full comparison is experienced. " +
          "NATIVE CSS CONTAINER QUERIES note: after the comparison, a small callout shows " +
          "'CSS container queries (@container) now do this natively — but RO gives you JS control.'",
        reuses: ["DemoSandbox", "MeasureLine", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Resize just the container (step 1)",
        reaction: "RO-based component adapts; media query-based component doesn't respond",
        teaches: "ResizeObserver responds to ELEMENT size, not viewport — true component-level responsiveness",
      },
      {
        action: "Resize the browser window (step 2)",
        reaction: "BOTH versions respond — media queries track the viewport, RO tracks the element. Different inputs, overlapping for window resizes",
        teaches: "MQ and RO overlap for viewport changes but diverge for container changes — RO is strictly more capable",
      },
      {
        action: "Resize rapidly and watch callback counter climb",
        reaction: "Counter fires for every pixel of change — potentially hundreds of calls",
        teaches: "RO fires on every size change — debouncing may be needed for expensive callbacks",
      },
      {
        action: "Add 20px padding via the slider, compare contentBoxSize vs borderBoxSize",
        reaction: "borderBoxSize says 320px but contentBoxSize says 280px — they diverge when padding is non-zero",
        teaches: "contentBoxSize excludes padding/border — choose the right measurement for your breakpoint logic",
      },
      {
        action: "Toggle 'Heavy callback' on and resize rapidly",
        reaction: "Visible jank — layout stutters, frame counter drops, resize feels sluggish. Toggle debounce: jank disappears",
        teaches: "Debouncing RO isn't abstract advice — it's a direct response to callback cost × fire rate = dropped frames",
      },
    ],
    learningOutcome: "Use ResizeObserver for element-level responsive behavior that media queries can't achieve",
    agentNotes:
      "Main demo 280px, not 400px — brings comparison above the fold. GUIDED TWO-STEP " +
      "comparison ensures both slider and window resize happen. Container query callout " +
      "prevents teaching RO as the ONLY solution when native CSS now handles the common case. " +
      "TWO PREDICTION GATES: (1) before padding slider — 'Will contentBoxSize shrink?' tests " +
      "box model understanding applied to measurement API. (2) before heavy callback — 'What " +
      "will you see?' tests callback cost intuition. These bring RO to prediction parity with " +
      "IO (4 gates) and MO (1 gate). " +
      "TRANSITION BRIDGE from MO: 'MutationObserver watches WHAT changed in the DOM. " +
      "ResizeObserver watches HOW BIG things are. Both observe elements — but MO cares about " +
      "structure, RO cares about geometry.' One sentence at the start of the RO context. " +
      "DEEPENED from 3 to 5 discoveries: contentBoxSize vs borderBoxSize (padding-change " +
      "scenario) and debounce cost (heavy callback toggle). Active time rises from ~65% to ~85%. " +
      "READ-ONLY CODE BRIDGE: shows RO constructor shape updating as controls change.",
  },

  "api-assignment-4": {
    stopId: "api-assignment-4",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "ROChallengeChain",
        description:
          "3 challenges (cut from 4, off-topic challenges replaced): " +
          "STRUCTURAL DIFFERENTIATOR: resizable preview panel (already specified) PLUS " +
          "native CSS container query comparison panel for challenge 3. " +
          "1. Data-columns attribute: observe container, set data-columns='1'/'2'/'3' based " +
          "   on width. STRONGER VERSION: observer reports borderBoxSize but layout depends on " +
          "   contentBoxSize (padding varies). Reader must choose which size to use — a decision " +
          "   the explorable covered but the challenge makes concrete. Tests verify correct " +
          "   breakpoints and initial size handling. " +
          "2. Responsive sidebar: observe sidebar element. CSS layout (transition between " +
          "   icon-only and icon+label) provided as starter code. Challenge focuses on RO-specific " +
          "   concerns: handle initial size before first callback, prevent layout flash, debounce " +
          "   expensive style recalculations. Tests verify smooth layout switches at threshold. " +
          "3. Container-query polyfill: observe parent, apply child styles from JS based on " +
          "   parent width. Side panel shows native CSS @container producing identical results. " +
          "   Reader sees their JS polyfill and the native approach converge — teaches both RO " +
          "   and the existence of native container queries. " +
          "STRETCH GOAL (optional, after Challenge 3): 'Add a size-change threshold: only " +
          "re-render when width crosses a breakpoint, not every pixel.' Tests architectural " +
          "thinking — filtering callbacks instead of processing every one. " +
          "Preview panel is RESIZABLE so reader tests their RO at different sizes.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Forget to handle the initial size (before any resize)",
        reaction: "Test fails: 'Component has wrong layout on first render — did you read the initial size?'",
        teaches: "RO fires on observe() for the initial size — use this to set the correct layout immediately",
      },
      {
        action: "See the container-query polyfill match native @container output",
        reaction: "Both panels show identical responsive behavior — the JS version and CSS version converge",
        teaches: "Native container queries now handle the common case, but RO gives JS-level control for complex logic",
      },
    ],
    learningOutcome: "Implement responsive sidebars and container-query polyfills with ResizeObserver",
    agentNotes:
      "3 challenges, not 4. All challenges test RO specifically — no off-topic canvas or text " +
      "measurement. Challenge 3's native CQ comparison differentiates this chain structurally " +
      "and teaches that native CSS has caught up for the simple case.",
  },

  "api-observer-synthesis": {
    stopId: "api-observer-synthesis",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [100, 200],
    interactives: [
      {
        component: "ObserverSynthesisChallenge",
        description:
          "CAPSTONE phased into 3 VERIFIABLE STEPS (not monolithic). " +
          "Build an image gallery combining all three observers: " +
          "PHASE 1 (IO only): Wire IntersectionObserver for lazy loading. Starter code has " +
          "gallery HTML with placeholder images. Reader adds IO with rootMargin + unobserve. " +
          "Tests verify: images lazy-load on scroll, unobserved after load. Green checkpoint ✓. " +
          "PHASE 2 (+ RO): Add ResizeObserver for responsive grid (1/2/3 columns by width). " +
          "Gallery container is resizable. Tests verify layout adapts at breakpoints. " +
          "Phase 2 starter includes Phase 1 solution if reader struggled. Second checkpoint. " +
          "PREDICTION GATE before Phase 3: 'You have IO for lazy loading and RO for layout. " +
          "A button adds new images. Will they lazy-load? Why or why not?' Options: " +
          "(a) Yes — IO watches the viewport (b) No — IO only observes elements passed to observe() " +
          "(c) Depends on rootMargin. Reader commits, THEN clicks 'CMS inject'. This is the " +
          "section's CLICK MOMENT — testing whether the reader understands IO's observe() model. " +
          "PHASE 3 (+ MO bridge): 'CMS inject' button adds images dynamically. Reader adds MO " +
          "to detect new images and pass them to IO for lazy loading. Tests verify new images " +
          "lazy-load just like originals. THIS is the synthesis — MO bridges IO and dynamic DOM. " +
          "CROSS-OBSERVER INTERACTION BUGS (2 additional discoveries in Phase 3): " +
          "- 'What if MO fires before RO has set the column count?' New images land in wrong layout. " +
          "- 'Disconnect MO but not IO — do existing images still lazy-load?' Tests lifecycle understanding. " +
          "CLEANUP TEST: Phase 3 test verifies 'on unmount, all three observers are disconnected.' " +
          "Closes the lifecycle loop that every explorable taught. " +
          "Each phase has its own test suite + checkpoint. Reader can stop after any phase. " +
          "STRETCH GOAL (optional, after Phase 3): 'Profile: which observer is the bottleneck? " +
          "Prove it with Performance API marks.' Tests systems thinking over API knowledge. " +
          "Phased structure makes the capstone buildable and debuggable, not all-or-nothing.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Wire up IO and RO but forget MO — then click 'CMS inject'",
        reaction: "New images appear but don't lazy-load — they load all at once because IO doesn't know about them",
        teaches: "MO bridges the gap between dynamic DOM changes and other observers — without it, newly-added elements are invisible to IO",
      },
    ],
    learningOutcome: "Combine IO, MO, and RO in a single component to handle lazy loading, responsive layout, and dynamic content",
    agentNotes:
      "This is the SYNTHESIS CAPSTONE the section was missing. One challenge, not a chain — " +
      "but it requires combining all three observers. The 'CMS inject' button forces MO usage " +
      "because IO alone can't detect new elements. This cements the section's implicit thesis: " +
      "these APIs are designed to compose. " +
      "PREDICTION GATE before Phase 3 is the section's click moment: tests observe() model understanding. " +
      "CROSS-OBSERVER BUGS in Phase 3 teach composition hazards (MO before RO, disconnect lifecycle). " +
      "CLEANUP TEST closes the lifecycle loop. STRETCH GOAL tests profiling/systems thinking.",
  },
};

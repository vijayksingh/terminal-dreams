import type { LessonMeta } from "./types";

export const DOM_API: Record<string, LessonMeta> = {
  "dom-refresher": {
    stopId: "dom-refresher",
    format: "anatomy",
    effort: "large",
    proseTarget: [200, 400],
    interactives: [
      {
        component: "DOMAnatomyViewer",
        description:
          "A rendered DOM tree visualization (15-20 nodes, like DevTools Elements panel). " +
          "Each node clickable. Clicking reveals available DOM methods in a slide-out panel. " +
          "Categories: Create (green), Read (blue), Update (yellow), Delete (red). " +
          "Each method in the panel is RUNNABLE — click to execute on the tree. " +
          "A search bar: type a method name, tree highlights what it would return. " +
          "DOM DETECTIVE MODE — 3 goal-oriented puzzles that turn browsing into problem-solving: " +
          "Puzzle 1: 'Move all .card elements from main into aside.sidebar' — shows tree state A " +
          "and ghost overlay of target state B. Reader must use appendChild (teaches: it MOVES nodes). " +
          "Puzzle 2: 'Clone the .card-list and put the copy in aside.sidebar' — reader tries cloneNode(false) " +
          "and gets an empty container (shallow clone surprise!). They discover cloneNode(true) for deep. " +
          "Teaches: cloneNode shallow vs deep, the most common DOM copy gotcha. " +
          "Puzzle 3: 'Remove all children of <header> without removing <header> itself' — " +
          "teaches removeChild vs remove, subtree awareness. " +
          "BONUS DISCOVERY after Puzzle 3: MutationObserver teaser. Reader activates a MutationObserver " +
          "on <header>, then runs removeChild on one of header's children. The observer callback fires " +
          "and a panel shows the MutationRecord: { type: 'childList', removedNodes: [<nav>], target: <header> }. " +
          "Reader sees their DOM change FROM THE OBSERVER'S PERSPECTIVE. Teaches: MutationObserver " +
          "watches for changes you make — Section 3 goes deep. This uses the existing puzzle infrastructure " +
          "(the reader already made a DOM change, now they see it observed). " +
          "MVP SCOPE: 12 runnable methods (3 per CRUD category). Skip traversal SVG lines " +
          "and queued method execution for v1. Add later.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "In Puzzle 1, try appendChild on a .card element",
        reaction: "The card MOVES from main to sidebar — it doesn't copy. The original disappears from main",
        teaches: "appendChild on an existing node MOVES it — DOM nodes can only exist in one place",
      },
      {
        action: "In Puzzle 3, try removeChild on header's children one by one",
        reaction: "Children disappear but header stays. Discover that remove() on header would delete the whole subtree",
        teaches: "removeChild removes a specific child; remove() on a parent takes everything. Know the difference",
      },
      {
        action: "Type querySelector('.card') in the search bar",
        reaction: "First matching .card node glows — only the first one",
        teaches: "querySelector returns the FIRST match, querySelectorAll returns all",
      },
      {
        action: "After Puzzle 3, activate MutationObserver on <header> then removeChild a child",
        reaction: "Observer callback fires — panel shows MutationRecord with removedNodes and target",
        teaches: "MutationObserver watches for DOM changes you make — the observer's perspective reveals the structure of mutations (Section 3 goes deep)",
      },
    ],
    learningOutcome: "Navigate the DOM API through goal-oriented puzzles, not passive browsing",
    agentNotes:
      "Anatomy format WITH DOM Detective puzzles. The puzzles transform passive browsing into active " +
      "problem-solving using the same visual infrastructure. " +
      "Each puzzle shows state A → target state B (ghost overlay). Reader must figure out which " +
      "methods to use. The method panel becomes a toolbox with a purpose, not a menu to browse. " +
      "MutationObserver bonus after Puzzle 3: reuses puzzle infrastructure to preview Section 3. " +
      "Reader activates MO on header via a 'Watch this node' button that appears after selecting " +
      "<header>. Runs removeChild — sees the MutationRecord. MO panel slides in below the puzzle area. " +
      "DECOMPOSITION GUIDANCE — 3 sub-components: " +
      "(1) DOMTreeViewer: tree rendering, node selection, method panel, search bar. " +
      "    State: tree nodes, selected node, search query. " +
      "(2) PuzzleRunner: puzzle sequencing, state A/B ghost overlays, validation. " +
      "    State: current puzzle, progress, ghost visibility. Depends on DOMTreeViewer (reads tree, triggers methods). " +
      "(3) MutationObserverDemo: 'Watch this node' button, record panel, callback animation. " +
      "    State: MO active flag, pending records. Depends on DOMTreeViewer (reads tree mutations). " +
      "    Entry condition: Puzzle 3 completed. " +
      "MVP SCOPE: 12 methods (3 per CRUD), slide-out panel, search bar, 3 puzzles + MO bonus. " +
      "Skip: traversal SVG lines, void-element edge cases, queued execution. Add later. " +
      "Effort upgraded from medium to large to account for puzzle infrastructure.",
  },

  "dom-querying": {
    stopId: "dom-querying",
    format: "battle",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "QueryMethodBattle",
        description:
          "A DOM tree with 25 nodes (was 50 — reduced for visual clarity). " +
          "PREDICTION-FIRST: Before each race, reader predicts 'Which method checks fewest nodes?' " +
          "or 'Which methods return different types?' Reader commits, THEN the race runs. " +
          "Methods race in PAIRS, not all 4 simultaneously (sequential comparison is clearer). " +
          "Round 1: getElementById vs querySelector — instant jump vs tree traversal. " +
          "Round 2: getElementsByClassName vs querySelectorAll — PREDICTION: 'What is different about their results?' " +
          "(not 'which is faster?' — they're similar speed, the real difference is live vs static). " +
          "WRONG-ANSWER FEEDBACK: 'getElementsByClassName is faster' → 'Speed is nearly identical — the REAL " +
          "difference is what happens AFTER the query: one collection stays alive, one freezes.' " +
          "'querySelectorAll supports more syntax' → 'True but trivial — the live vs static behavior is " +
          "the difference that causes bugs in production (live collections mutate mid-iteration).' " +
          "Round 3: All four methods targeting `.sidebar > .card:not(.hidden)` — full comparison. " +
          "Only querySelector/querySelectorAll handle compound selectors. getElementById and " +
          "getElementsByClassName cannot — reader discovers that complex selectors REQUIRE query* methods. " +
          "KEY DISCOVERY: 'Live vs Static' demo — run getElementsByClassName, then ADD " +
          "a matching element. Live HTMLCollection updates. querySelectorAll does NOT. " +
          "Preset target buttons prevent 'what do I type?' stall, custom input also available.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Predict getElementById is faster, then watch the Round 1 race",
        reaction: "getElementById jumps instantly (hash map). querySelector walks 14 nodes to find the same element",
        teaches: "getElementById is O(1) via hash map; querySelector requires tree traversal. Prediction before observation locks in the lesson",
      },
      {
        action: "Add a matching element after getElementsByClassName",
        reaction: "HTMLCollection length increases automatically — it's alive",
        teaches: "getElementsBy* returns a LIVE collection that auto-updates when the DOM changes",
      },
      {
        action: "Add a matching element after querySelectorAll",
        reaction: "NodeList length stays the same — frozen at query time",
        teaches: "querySelectorAll returns a STATIC snapshot — safe to iterate, won't change mid-loop",
      },
    ],
    learningOutcome: "Choose query methods based on live vs static needs and performance characteristics",
    agentNotes:
      "Battle format with PREDICTION GATES. Ask reader to predict before each race round. " +
      "Run methods in PAIRS not all 4 at once (clearer visual comparison). " +
      "Tree reduced to 25 nodes (was 50) for visual clarity. " +
      "The live/static demo is the crown jewel — give it a prominent 'add element' button. " +
      "Three race rounds: simple→complex creates a difficulty ramp within the stop.",
  },

  "dom-query-perf": {
    stopId: "dom-query-perf",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "QueryPerfScrolly",
        description:
          "Sticky visual: a DOM tree (50 nodes — was 100+, reduced for performance/readability). " +
          "Scroll steps reveal optimization strategies one at a time: " +
          "1. Naive: document.querySelector in a loop → tree fully traversed each time " +
          "2. Scope narrowing: cache a parent, query from it → only subtree traversed " +
          "3. ID caching: getElementById once, store reference → zero traversal " +
          "After scrollytelling: STRUCTURED DECISIONS replace the freeform refactor editor. " +
          "Show 'bad' code with 3 highlighted decision points: " +
          "Decision 1: 'Where does querySelector live?' — drag it outside the loop. " +
          "  Tree re-triggers: nodes lit drop from 50 per iteration to 12 once. " +
          "Decision 2: 'Which method?' — pick from dropdown (querySelector vs getElementById). " +
          "  Nodes lit drop from 12 to 1. " +
          "Decision 3: 'Read/write order?' — drag code lines to reorder (interleaved → batched). " +
          "  Pipeline runs drop from 6 to 1. " +
          "  PREDICTION MICRO-GATE before tooltip reveal: 'Which of these reads trigger layout? " +
          "  Pick all that apply: element.id, offsetHeight, textContent, getBoundingClientRect, getComputedStyle.' " +
          "  Most readers select ALL reads — reveal shows only geometry/style reads are expensive. " +
          "  WRONG-ANSWER FEEDBACK: selecting element.id or textContent → 'These access cached properties — " +
          "  no layout calculation needed.' Missing getComputedStyle → 'getComputedStyle forces BOTH style " +
          "  recalculation AND layout — it is the most expensive read.' " +
          "  LAYOUT-TRIGGERING PROPERTIES: Decision 3 also surfaces WHICH reads are expensive. " +
          "  After batching, a tooltip on each read shows its cost: " +
          "  element.id → FREE (no layout), element.textContent → FREE, " +
          "  element.offsetHeight → TRIGGERS LAYOUT (forces synchronous calculation), " +
          "  getBoundingClientRect() → TRIGGERS LAYOUT, " +
          "  getComputedStyle(el).height → TRIGGERS STYLE + LAYOUT. " +
          "  The reader learns not just 'batch reads before writes' but WHICH reads actually matter. " +
          "Each decision immediately re-triggers the tree visualization.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "PREDICTION GATE: 'Your scroll handler calls querySelector on every frame. How many of these 50 nodes will the browser check each time?'",
        narrative: "Querying from 'document' scans the entire tree every time. In a scroll handler firing 60x/second, this adds up fast.",
        interaction: "Prediction: (a) Just 1 — it stops at the first match (b) About 12 — only the subtree (c) All 50 — document-level query checks everything. " +
          "WRONG-ANSWER FEEDBACK: (a) 'querySelector DOES stop at the first match, but it still walks the tree in document order to FIND that match — 50 nodes checked, 1 returned.' " +
          "(b) 'Scoping to a subtree would give you 12, but querySelector from document starts at the root — the whole tree is in play.'",
      },
      {
        visual: "PREDICTION GATE: 'How many nodes will the browser check if we scope to a parent?'",
        narrative: "Scope your queries. Cache a reference to the closest parent and query from there.",
        interaction: "Prediction: How many nodes? (a) Still all 50 (b) Only children of parent (~12) (c) Just 1 (the parent). " +
          "WRONG-ANSWER FEEDBACK: (a) 'Scoping to a parent means querySelector starts its walk FROM that node — only descendants are checked.' " +
          "(c) 'The parent itself isn't the result — querySelector walks the parent's subtree to find a match.'",
      },
      {
        visual: "PREDICTION GATE: 'If we cache the element reference itself, how many nodes per query?'",
        narrative: "IDs are hash-map lookups. One operation, regardless of tree size. Cache the result and you never even do that.",
        interaction: "Prediction: (a) 12 — still the subtree (b) 1 — getElementById is a hash lookup (c) 0 — we skip the query entirely. " +
          "WRONG-ANSWER FEEDBACK: (a) 'getElementById doesn't walk any subtree — it's a direct hash-map jump.' " +
          "(b) 'Close — getElementById IS O(1), but if we CACHE the reference, we don't even call getElementById again. Zero DOM queries.'",
      },
      {
        visual: "Structured decision panel appears with 3 decision points highlighted in the code",
        narrative: "Your turn. Three decisions that each cut the cost. Make each choice and watch the tree visualization respond.",
        interaction: "Decision 1: Move querySelector outside the loop. Decision 2: Switch method. Decision 3: Batch reads/writes.",
      },
    ],
    discoveries: [
      {
        action: "Drag querySelector outside the loop in Decision 1",
        reaction: "Nodes lit per frame drop from 50 to 12 — immediate visual shrinkage",
        teaches: "Querying from a cached parent is proportional to SUBTREE size, not document size",
      },
      {
        action: "Pick getElementById in Decision 2",
        reaction: "Nodes lit drop from 12 to 1 — tree barely blinks",
        teaches: "IDs are O(1) hash lookups — the fastest possible DOM query",
      },
      {
        action: "Drag code lines to batch reads before writes in Decision 3",
        reaction: "Pipeline runs drop from 6 to 1 — forced reflows eliminated",
        teaches: "Layout thrashing from interleaved reads/writes is usually worse than the query cost itself",
      },
      {
        action: "Hover over different read operations in Decision 3 to see their cost tooltips",
        reaction: "element.id → FREE. element.offsetHeight → TRIGGERS LAYOUT (red). getBoundingClientRect() → TRIGGERS LAYOUT. getComputedStyle() → STYLE + LAYOUT",
        teaches: "Not all DOM reads trigger layout — only geometry/style reads force synchronous calculation. Knowing WHICH reads are expensive prevents cargo-cult batching",
      },
    ],
    learningOutcome: "Scope queries to the smallest subtree, cache references, and batch DOM reads/writes",
    agentNotes:
      "Scrollytelling BUT with structured decisions replacing the freeform refactor editor. " +
      "NO eval, NO syntax parsing, NO sandboxed execution. Three decision points: " +
      "drag-to-reorder, dropdown selection, drag-to-reorder. Each re-triggers the tree visualization. " +
      "PREDICTION GATES before ALL 3 scroll steps (not just step 2). Each step is now " +
      "prediction → observation, not passive scroll → observation. This breaks the passive " +
      "stretches into active hypothesis-testing throughout. " +
      "BRIDGE MICRO-EDITOR at the end: after Decision 3, a single textarea with one test appears: " +
      "'Write querySelector scoped to #sidebar that caches the result.' This previews the " +
      "challenge-chain format of stop 4 and smooths the gear change from decisions to coding. " +
      "LAYOUT-TRIGGERING TOOLTIPS in Decision 3: each read operation shows a cost tooltip. " +
      "element.id/textContent are FREE. offsetHeight, getBoundingClientRect, getComputedStyle " +
      "TRIGGER LAYOUT. This fills the DOM measurement APIs coverage gap — teaches WHICH reads " +
      "are expensive, not just 'batch reads before writes.' " +
      "Tree reduced to 50 nodes (was 100+) for rendering performance. " +
      "Layout thrashing demo should reuse pipeline visual from core-render-cycle.",
  },

  "dom-assignment-1": {
    stopId: "dom-assignment-1",
    format: "challenge-chain",
    effort: "large",
    proseTarget: [200, 400],
    interactives: [
      {
        component: "DOMChallengeChain",
        description:
          "4 progressive challenges (was 6 — cut keyboard nav and drag-to-reorder): " +
          "Challenge 1: Render a list from data array (createElement + appendChild). " +
          "SUBOPTIMAL DETECTION: if reader calls appendChild inside a loop (forEach/for/while), " +
          "test passes but feedback says: 'You appended 5 elements individually — each append " +
          "triggers a potential reflow. Build them in a DocumentFragment first: " +
          "const frag = document.createDocumentFragment(); ... frag.appendChild(li); ... " +
          "list.appendChild(frag); — one reflow instead of five.' " +
          "SENIOR SKIP-GATE: before Challenge 1, show this snippet: " +
          "'const frag = document.createDocumentFragment(); " +
          "todos.forEach(t => { const li = document.createElement(\"li\"); li.textContent = t; frag.appendChild(li); }); " +
          "app.appendChild(frag);' " +
          "Question: 'What does this code do and WHY use DocumentFragment instead of direct appendChild?' " +
          "If reader selects 'Batch-inserts to avoid per-item reflows' → skip to Challenge 2 with note: " +
          "'You already know the pattern. Here is the optimized base code for Challenge 2.' " +
          "If wrong → stay for Challenge 1 (they will discover DocumentFragment via SuboptimalPattern feedback). " +
          "Challenge 2: Add 'delete' buttons to each item (event delegation vs per-element) " +
          "Challenge 3: Add a search input that filters items (live filtering as you type). " +
          "SUBOPTIMAL DETECTION: if reader calls querySelectorAll on every keystroke to find matching items, " +
          "test passes but feedback says: 'You re-query the DOM on every keystroke — cache the item " +
          "references once and filter from the cached array. querySelectorAll costs 50 node checks " +
          "× 60 keystrokes/minute = 3,000 wasted traversals per minute.' " +
          "Challenge 4: Add sort buttons (A-Z, Z-A) without re-querying the DOM " +
          "Each challenge: starter code + editable section + live preview + 3-4 tests. " +
          "Failed tests show SPECIFIC feedback. " +
          "SUBOPTIMAL-PASS feedback is the teaching device: " +
          "'Tests pass, but you added 5 handlers — try event delegation.' " +
          "When swapping in optimal code for next challenge, show a DIFF OVERLAY: " +
          "'We upgraded your solution — here is what changed.' Visible and educational, not silent. " +
          "Each completed challenge unlocks the next. Progress bar at top. " +
          "BONUS CHALLENGES (deferred): keyboard navigation (arrow keys) and drag-to-reorder " +
          "belong in a separate 'DOM Advanced' stop or Section 3 (Web APIs with pointer events).",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Complete challenge 2 with per-element click handlers",
        reaction: "Test passes but hint says 'try event delegation — add one handler to the parent instead'",
        teaches: "Event delegation: one handler on a parent is more efficient than N handlers on children",
      },
      {
        action: "Try sorting by clearing innerHTML and re-rendering",
        reaction: "Test passes but hint says 'you destroyed all DOM state (focus, scroll position). Try moving existing nodes'",
        teaches: "appendChild on an existing node MOVES it — no need to recreate elements for reordering",
      },
      {
        action: "See the diff overlay when code is swapped for the next challenge",
        reaction: "Clear visual diff: your approach (left) vs optimal approach (right) with highlighted differences",
        teaches: "Seeing the diff between your solution and the optimal one teaches through comparison, not just correction",
      },
    ],
    learningOutcome: "Fluently build interactive DOM features without any framework, using efficient patterns",
    agentNotes:
      "Challenge-chain format. 4 challenges (was 6). Keyboard nav and drag-to-reorder " +
      "cut to reduce scope and avoid difficulty cliff between challenges 4 and 5. " +
      "DocumentFragment SUBOPTIMAL DETECTION in Challenge 1: detect appendChild called inside " +
      "a loop construct (.forEach, for, while). Feedback teaches the batch-insert pattern. " +
      "This fills the section's second-biggest coverage gap (after MutationObserver). " +
      "SENIOR SKIP-GATE before Challenge 1: shows a DocumentFragment code snippet and asks " +
      "'What does this do and WHY use DocumentFragment?' Correct answer ('batch-inserts to avoid " +
      "per-item reflows') → skip to Challenge 2 with optimized base code. Wrong → stay for Challenge 1. " +
      "The snippet IS the DocumentFragment pattern, so seniors who skip have already proven they know it. " +
      "The DIFF OVERLAY when swapping in optimal code is new and critical — " +
      "silent code replacement confuses learners. Make the swap visible and educational. " +
      "Challenge infrastructure (editor + sandbox + test runner + hints + diff) is reusable " +
      "across future challenge chains. First build is still expensive but pays dividends. " +
      "Effort stays 'large' — the infrastructure is the investment, not the challenge count.",
  },
};

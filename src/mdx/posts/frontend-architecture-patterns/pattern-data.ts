export type PatternNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  accent?: boolean;
  description: string;
  example: string;
};

export type PatternEdge = {
  from: string;
  to: string;
  label?: string;
  bidirectional?: boolean;
  problem?: boolean;
  verb?: string;
  description?: string;
};

export type PatternAnnotation = {
  x: number;
  y: number;
  text: string;
};

export type TradeoffScores = {
  simplicity: number;
  testability: number;
  scalability: number;
  teamFriendly: number;
  flexibility: number;
};

export type RealWorldCase = {
  company: string;
  story: string;
};

export type PatternDef = {
  id: string;
  name: string;
  fullName: string;
  year: number;
  oneLiner: string;
  protagonist?: string;
  nodes: PatternNode[];
  edges: PatternEdge[];
  annotations?: PatternAnnotation[];
  viewBox: string;
  scores: TradeoffScores;
  realWorld: RealWorldCase[];
};

// ── MVC ────────────────────────────────────────────────────────────

const mvc: PatternDef = {
  id: "mvc",
  name: "MVC",
  fullName: "Model–View–Controller",
  year: 1979,
  oneLiner: "The grandfather. Three layers, clear roles, one big controller.",
  protagonist: "controller",
  viewBox: "0 0 520 170",
  nodes: [
    {
      id: "model",
      label: "Model",
      x: 260,
      y: 32,
      description:
        "Holds data and business logic. Doesn't know the UI exists.",
      example:
        "In Backbone.js, Models were JavaScript objects that synced with a REST API — your Todo, Card, or Board. They fired 'change' events that Views could observe, keeping the UI in sync without manual DOM manipulation.",
    },
    {
      id: "view",
      label: "View",
      x: 100,
      y: 148,
      description:
        "Renders UI. Can observe the Model for changes (observer pattern).",
      example:
        "In Backbone.js, Views listened to Model change events and re-rendered their templates. Trello's kanban UI was Backbone Views bound to Card and Board Models — when a card moved, the View re-rendered automatically.",
    },
    {
      id: "controller",
      label: "Controller",
      x: 420,
      y: 148,
      description:
        "Receives user input, updates the Model, tells the View what to display.",
      example:
        "In Backbone.js, the Router acted as Controller — mapping URLs like #board/123 to application state, instantiating Views with the right Models when the user navigated between boards.",
    },
  ],
  edges: [
    { from: "view", to: "controller", label: "user input", verb: "forwards", description: "View captures DOM events and delegates them to the Controller" },
    { from: "controller", to: "model", label: "updates", verb: "mutates", description: "Controller writes new state into the Model" },
    { from: "model", to: "view", label: "notifies", problem: true, verb: "notifies", description: "Model pushes change events to observing Views — the coupling that breaks at scale" },
    { from: "controller", to: "view", label: "renders", verb: "renders", description: "Controller selects and configures which View to display" },
  ],
  annotations: [
    { x: 60, y: 90, text: "observer coupling →" },
  ],
  scores: {
    simplicity: 9,
    testability: 4,
    scalability: 3,
    teamFriendly: 5,
    flexibility: 4,
  },
  realWorld: [
    {
      company: "Trello (2011–2017)",
      story:
        "Built entirely on Backbone.js MVC. Models represented cards, lists, and boards. Views rendered the kanban UI and observed Models for real-time updates via WebSocket. Worked beautifully at Fog Creek's small team. But as the app grew — activity feeds, power-ups, multi-board views — Views became tangled with observation logic, making the rendering layer increasingly unpredictable.",
    },
    {
      company: "Ember.js (2011–present)",
      story:
        "Ember doubled down on MVC conventions for the browser — Routes (Controller), Templates (View), and Models with Ember Data. Apple Music's web player and Intercom both chose Ember precisely because its opinionated MVC structure prevented the architectural drift that plagued Backbone apps at scale.",
    },
    {
      company: "Angular 1.x (2010–2016)",
      story:
        "AngularJS brought MVC to the mainstream frontend. Controllers managed scope, templates were Views, and services held business logic. At Google scale it worked — they had hundreds of internal Angular apps. But the two-way binding between Model and View created cascade bugs: one data change could trigger re-renders across seemingly unrelated components.",
    },
  ],
};

// ── MVP ────────────────────────────────────────────────────────────

const mvp: PatternDef = {
  id: "mvp",
  name: "MVP",
  fullName: "Model–View–Presenter",
  year: 1996,
  oneLiner: "MVC's disciplined sibling. The View goes passive, the Presenter takes charge.",
  protagonist: "presenter",
  viewBox: "0 0 520 115",
  nodes: [
    {
      id: "view",
      label: "View",
      x: 80,
      y: 80,
      description:
        "Pure UI. Displays data, captures input, and immediately delegates everything to the Presenter. Contains zero logic.",
      example:
        "In React's Container/Presentational pattern, the View is a 'dumb' component — a ProductCard that takes title, price, and onAddToCart as props. No useState, no useEffect, no fetch. Renders in Storybook without any provider setup.",
    },
    {
      id: "presenter",
      label: "Presenter",
      x: 260,
      y: 80,
      accent: true,
      description:
        "The brain. Receives input from View, processes it, fetches/updates the Model, formats data, and pushes it back to the View.",
      example:
        "The Container component or custom hook that owns all logic — useProducts() fetches data, manages loading/error states, formats prices for display, and passes everything down to the dumb component as props.",
    },
    {
      id: "model",
      label: "Model",
      x: 440,
      y: 80,
      description:
        "Data and business rules. Completely unaware of the UI.",
      example:
        "The API layer and state stores — TanStack Query caches, Zustand stores, or plain fetch wrappers. Business rules like 'max 10 items per cart' live here, decoupled from any component.",
    },
  ],
  edges: [
    { from: "view", to: "presenter", bidirectional: true, label: "delegates / updates", verb: "delegates", description: "View forwards all user actions to the Presenter; Presenter pushes formatted data back" },
    { from: "presenter", to: "model", bidirectional: true, label: "fetch / mutate", verb: "orchestrates", description: "Presenter reads from and writes to the Model on the View's behalf" },
  ],
  annotations: [
    { x: 260, y: 30, text: "no direct View ↔ Model link" },
  ],
  scores: {
    simplicity: 7,
    testability: 7,
    scalability: 5,
    teamFriendly: 6,
    flexibility: 5,
  },
  realWorld: [
    {
      company: "React Container/Presentational (2015–2019)",
      story:
        "Dan Abramov's influential blog post 'Presentational and Container Components' was MVP for React. Presentational components (Views) received data via props and rendered UI — zero logic, zero state. Container components (Presenters) handled all logic and passed formatted data down. This pattern dominated React architecture for years and made Storybook possible.",
    },
    {
      company: "Angular Smart/Dumb Components",
      story:
        "Angular's style guide recommends a structurally MVP pattern: 'smart' components (Presenters) that inject services and manage state, paired with 'dumb' components (Views) that only receive @Input() and emit @Output(). The service layer acts as Model. This separation made Angular apps at Google consistently testable at scale.",
    },
  ],
};

// ── MVVM ───────────────────────────────────────────────────────────

const mvvm: PatternDef = {
  id: "mvvm",
  name: "MVVM",
  fullName: "Model–View–ViewModel",
  year: 2005,
  oneLiner: "Two-way binding magic. Change the data, the UI updates. Change the UI, the data updates.",
  protagonist: "viewmodel",
  viewBox: "0 0 520 115",
  nodes: [
    {
      id: "view",
      label: "View",
      x: 80,
      y: 80,
      description:
        "The template/component. Binds directly to ViewModel properties. When ViewModel changes, the View re-renders automatically.",
      example:
        "In Vue.js, your <template> is the View. Write {{ username }} and it reactively displays whatever is in the ViewModel. No manual DOM manipulation.",
    },
    {
      id: "viewmodel",
      label: "ViewModel",
      x: 260,
      y: 80,
      accent: true,
      description:
        "Holds UI state and UI logic. Exposes reactive properties the View binds to. The key innovation: two-way data binding means changes flow both directions automatically.",
      example:
        "In Vue.js, the <script setup> block IS your ViewModel — ref(), computed(), watch() create reactive state. v-model on an input creates two-way binding: type in the field, the data updates; change the data programmatically, the field updates.",
    },
    {
      id: "model",
      label: "Model",
      x: 440,
      y: 80,
      description:
        "Business logic and server data. The ViewModel mediates between View and Model.",
      example:
        "In a Vue.js e-commerce app, the Model is your API layer + Pinia store — product catalog, cart state, order history. Business rules like 'max 10 items per cart' live here.",
    },
  ],
  edges: [
    {
      from: "view",
      to: "viewmodel",
      bidirectional: true,
      label: "two-way binding ⟷",
      verb: "binds",
      description: "Changes flow both directions automatically — edit the input, data updates; change the data, input updates",
    },
    { from: "viewmodel", to: "model", bidirectional: true, label: "read / write", verb: "mediates", description: "ViewModel reads business data and pushes mutations back to the Model" },
  ],
  annotations: [
    { x: 170, y: 30, text: "⟵ reactive binding ⟶" },
  ],
  scores: {
    simplicity: 6,
    testability: 7,
    scalability: 6,
    teamFriendly: 7,
    flexibility: 6,
  },
  realWorld: [
    {
      company: "Vue.js (2014–present)",
      story:
        "Evan You built Vue.js after working at Google on AngularJS. He loved Angular's two-way binding but hated the complexity. Vue is pure MVVM — the Options API literally maps to Model (data/methods), ViewModel (computed/watch), and View (template).",
    },
    {
      company: "KnockoutJS (2010–2015)",
      story:
        "Steve Sanderson built KnockoutJS at Microsoft as a pure MVVM JavaScript library — before Angular, before React, before Vue. It brought two-way binding to the browser and influenced every framework that followed.",
    },
    {
      company: "Svelte (2019–present)",
      story:
        "Svelte's reactivity model is MVVM with the ceremony removed. Declare a variable and it's reactive. Bind it to an input with bind:value and it's two-way. The compiler generates the subscription wiring that Vue and Knockout handle at runtime.",
    },
  ],
};

// ── Clean Architecture ─────────────────────────────────────────────

const clean: PatternDef = {
  id: "clean",
  name: "Clean",
  fullName: "Clean Architecture",
  year: 2012,
  oneLiner: "Dependencies point inward. The core business logic depends on nothing external.",
  protagonist: "entities",
  viewBox: "0 0 520 220",
  nodes: [
    {
      id: "entities",
      label: "Entities",
      x: 260,
      y: 36,
      accent: true,
      w: 72,
      description:
        "Pure business rules. No imports from frameworks, UI, or storage. If the business rule exists, it belongs here.",
      example:
        "In a spreadsheet app: 'A cell formula must not create circular references.' This rule doesn't care if you're using React or Vue, Canvas or DOM. It's pure TypeScript with zero imports.",
    },
    {
      id: "usecases",
      label: "Use Cases",
      x: 260,
      y: 92,
      w: 72,
      description:
        "Application-specific logic. Orchestrates entities to fulfill a user goal. One use case = one user intention.",
      example:
        "'PasteRange' use case: validate target cells, check if paste overflows sheet bounds, apply cell formatting rules, recalculate affected formulas. It calls Entity methods but doesn't know about React or the clipboard API.",
    },
    {
      id: "adapters",
      label: "Adapters",
      x: 260,
      y: 148,
      w: 72,
      description:
        "Translators between the inner layers and the outside world. Convert data formats between what use cases expect and what frameworks provide.",
      example:
        "A React hook (useSpreadsheet) that translates between the component's needs — loading states, formatted cell values, event handlers — and the use case layer's raw domain operations.",
    },
    {
      id: "frameworks",
      label: "Frameworks",
      x: 260,
      y: 204,
      w: 72,
      description:
        "The outermost ring. React, Canvas renderer, IndexedDB, WebSocket — all replaceable. The inner layers never import from here.",
      example:
        "Swap Canvas rendering for DOM tables? Only this layer changes. Move from localStorage to IndexedDB? Write a new adapter, inner layers stay untouched. That's the promise.",
    },
  ],
  edges: [
    { from: "frameworks", to: "adapters", label: "depends on", verb: "imports", description: "Framework layer calls adapters to translate between external APIs and domain types" },
    { from: "adapters", to: "usecases", label: "depends on", verb: "invokes", description: "Adapters translate external requests into use case calls" },
    { from: "usecases", to: "entities", label: "depends on", verb: "orchestrates", description: "Use cases coordinate entity methods to fulfill a user intention" },
  ],
  annotations: [
    { x: 420, y: 36, text: "← innermost (no deps)" },
    { x: 420, y: 204, text: "← outermost (all deps)" },
    { x: 80, y: 120, text: "dependencies →\npoint inward" },
  ],
  scores: {
    simplicity: 3,
    testability: 9,
    scalability: 8,
    teamFriendly: 6,
    flexibility: 9,
  },
  realWorld: [
    {
      company: "Figma (2016–present)",
      story:
        "Figma's rendering engine is a constraint solver and vector math library compiled to WebAssembly — pure domain logic with zero browser dependencies. The React UI is the outermost framework layer. WebGL rendering is another adapter. Business rules about snapping, alignment, and auto-layout live in the innermost layer, testable without a browser.",
    },
    {
      company: "Offline-First PWAs",
      story:
        "Apps that work offline — note editors, field inspection tools, form builders — naturally benefit from Clean Architecture. Sync algorithms, conflict resolution, and validation must work identically online or offline. Putting that logic in a framework-free inner layer means testing sync with plain unit tests, no browser or service worker required.",
    },
  ],
};

// ── Hexagonal ──────────────────────────────────────────────────────

const hexagonal: PatternDef = {
  id: "hexagonal",
  name: "Hexagonal",
  fullName: "Hexagonal Architecture (Ports & Adapters)",
  year: 2005,
  oneLiner: "Your app defines ports. The outside world plugs in adapters. Swap anything.",
  protagonist: "core",
  viewBox: "0 0 520 180",
  nodes: [
    {
      id: "driving",
      label: "Driving Side",
      x: 60,
      y: 90,
      w: 72,
      description:
        "Adapters that trigger your application — user interactions, route changes, keyboard shortcuts, test harnesses. They call input ports.",
      example:
        "In a rich text editor, the driving side includes the toolbar (click Bold), keyboard shortcuts (Cmd+B), slash commands (/heading), and collaborative cursors from other users — all different triggers for the same core formatting logic.",
    },
    {
      id: "input-ports",
      label: "Input Ports",
      x: 175,
      y: 90,
      w: 66,
      description:
        "Interfaces that define how the outside world can talk to your app. The contract between driving adapters and business logic.",
      example:
        "An interface like EditorCommands with methods toggleBold(), insertBlock(), applyStyle(). Multiple adapters (toolbar, keyboard, API) can trigger the same commands through the same port.",
    },
    {
      id: "core",
      label: "Core Logic",
      x: 300,
      y: 90,
      w: 66,
      accent: true,
      description:
        "Pure business rules. Knows nothing about the DOM, browser APIs, or rendering. Only talks through ports.",
      example:
        "The document model and transformation engine — how blocks nest, how formatting applies, how undo/redo works. Runs identically in the browser, in Node.js tests, or in a Web Worker.",
    },
    {
      id: "output-ports",
      label: "Output Ports",
      x: 430,
      y: 48,
      w: 70,
      description:
        "Interfaces for things the app needs from the outside — storage, rendering, analytics, collaboration sync.",
      example:
        "A StoragePort — the core calls save(doc) without knowing if it writes to IndexedDB, localStorage, or a REST API.",
    },
    {
      id: "driven",
      label: "Driven Side",
      x: 430,
      y: 132,
      w: 70,
      description:
        "Adapters that fulfill output ports — storage clients, rendering engines, analytics providers, sync protocols.",
      example:
        "The IndexedDB adapter for persistence, the Canvas adapter for rendering, the WebSocket adapter for real-time sync. All swappable without touching core logic.",
    },
  ],
  edges: [
    { from: "driving", to: "input-ports", label: "calls", verb: "calls", description: "User interactions and external triggers invoke input port methods" },
    { from: "input-ports", to: "core", label: "triggers", verb: "triggers", description: "Input ports define the contract — core logic implements the behavior" },
    { from: "core", to: "output-ports", label: "uses", verb: "depends on", description: "Core logic calls output port interfaces without knowing the implementation" },
    { from: "output-ports", to: "driven", label: "fulfilled by", verb: "implements", description: "Concrete adapters fulfill the output port contract — swappable by design" },
  ],
  annotations: [
    { x: 60, y: 38, text: "drives the app →" },
    { x: 430, y: 165, text: "← driven by the app" },
  ],
  scores: {
    simplicity: 3,
    testability: 9,
    scalability: 9,
    teamFriendly: 8,
    flexibility: 10,
  },
  realWorld: [
    {
      company: "TipTap / ProseMirror Editors",
      story:
        "ProseMirror (the engine behind TipTap, Notion's editor, and others) is textbook hexagonal. The core is a document model with transformation rules — zero DOM dependency. Input adapters handle keyboard events, toolbar clicks, and collaborative edits. Output adapters render to DOM, export to HTML/Markdown, or persist to any backend. You can swap the rendering layer without touching the document model.",
    },
    {
      company: "Mock Service Worker (MSW)",
      story:
        "MSW is hexagonal thinking applied to frontend testing. Your components talk through ports (API calls). MSW plugs in as a driven-side adapter that intercepts network requests and returns mock data. Same components, same code paths, different adapter. No code changes needed — just swap the network layer.",
    },
  ],
};

// ── Vertical Slices ────────────────────────────────────────────────

const verticalSlices: PatternDef = {
  id: "vertical-slices",
  name: "Vertical Slices",
  fullName: "Vertical Slice Architecture",
  year: 2018,
  oneLiner: "Forget layers. Each feature is a self-contained slice from UI to data.",
  viewBox: "0 0 460 195",
  nodes: [
    {
      id: "slice-a-ui",
      label: "Search UI",
      x: 80,
      y: 35,
      w: 66,
      description: "Each slice owns its own UI components.",
      example:
        "The search feature has its own SearchBar, SearchResults, and FilterPanel components. No shared 'components/' dumping ground.",
    },
    {
      id: "slice-a-logic",
      label: "Search Logic",
      x: 80,
      y: 90,
      w: 66,
      description: "Each slice owns its business logic and state.",
      example:
        "useSearch() hook, search validation, debouncing, filter logic — all co-located in the search feature directory.",
    },
    {
      id: "slice-a-data",
      label: "Search API",
      x: 80,
      y: 145,
      w: 66,
      description: "Each slice owns its data access.",
      example:
        "The search API client, response types, caching strategy — all inside features/search/api/.",
    },
    {
      id: "slice-b-ui",
      label: "Cart UI",
      x: 230,
      y: 35,
      w: 66,
      description: "Cart's own components — independent of search.",
      example:
        "CartDrawer, CartItem, CartSummary — owned by the cart team, never imported by the search feature.",
    },
    {
      id: "slice-b-logic",
      label: "Cart Logic",
      x: 230,
      y: 90,
      w: 66,
      description: "Cart's own business logic and state management.",
      example:
        "useCart() hook, add/remove item logic, price calculation, promo code validation.",
    },
    {
      id: "slice-b-data",
      label: "Cart API",
      x: 230,
      y: 145,
      w: 66,
      description: "Cart's own API layer.",
      example: "Cart service client, optimistic updates, retry logic.",
    },
    {
      id: "slice-c-ui",
      label: "Auth UI",
      x: 380,
      y: 35,
      w: 66,
      description: "Auth's own UI — login form, OAuth buttons.",
      example:
        "LoginForm, SignupFlow, OAuthCallback — owned by the identity team.",
    },
    {
      id: "slice-c-logic",
      label: "Auth Logic",
      x: 380,
      y: 90,
      w: 66,
      description: "Auth's own logic — token management, session handling.",
      example:
        "Token refresh logic, session expiry, role-based access checks.",
    },
    {
      id: "slice-c-data",
      label: "Auth API",
      x: 380,
      y: 145,
      w: 66,
      description: "Auth's own API layer.",
      example: "OAuth client, JWT decoder, session storage adapter.",
    },
  ],
  edges: [
    { from: "slice-a-ui", to: "slice-a-logic", verb: "calls", description: "UI components invoke feature hooks and handlers" },
    { from: "slice-a-logic", to: "slice-a-data", verb: "fetches", description: "Logic layer owns data access for this feature" },
    { from: "slice-b-ui", to: "slice-b-logic", verb: "calls", description: "UI components invoke feature hooks and handlers" },
    { from: "slice-b-logic", to: "slice-b-data", verb: "fetches", description: "Logic layer owns data access for this feature" },
    { from: "slice-c-ui", to: "slice-c-logic", verb: "calls", description: "UI components invoke feature hooks and handlers" },
    { from: "slice-c-logic", to: "slice-c-data", verb: "fetches", description: "Logic layer owns data access for this feature" },
  ],
  annotations: [
    { x: 80, y: 175, text: "Feature A" },
    { x: 230, y: 175, text: "Feature B" },
    { x: 380, y: 175, text: "Feature C" },
  ],
  scores: {
    simplicity: 6,
    testability: 8,
    scalability: 9,
    teamFriendly: 10,
    flexibility: 7,
  },
  realWorld: [
    {
      company: "Shopify Hydrogen",
      story:
        "Shopify's Hydrogen framework for headless storefronts encourages vertical slices — each route is a self-contained feature with its own loader, component, and data dependencies. Teams own features end-to-end.",
    },
    {
      company: "Feature-Sliced Design (FSD)",
      story:
        "FSD became the dominant frontend architecture in the Russian/European dev community. Companies like Tinkoff Bank, Yandex, and VK adopted it for large React/Vue codebases. Each feature is a vertical slice: UI + model + API, isolated from other features.",
    },
    {
      company: "Next.js App Router (2023+)",
      story:
        "The App Router naturally encourages vertical slices — each route segment has its own page, layout, loading, and error boundary. Co-locate your components, hooks, and API calls next to the route that uses them.",
    },
  ],
};

// ── Exports ────────────────────────────────────────────────────────

export const PATTERNS: Record<string, PatternDef> = {
  mvc,
  mvp,
  mvvm,
  clean,
  hexagonal,
  "vertical-slices": verticalSlices,
};

export const PATTERN_LIST: PatternDef[] = [
  mvc,
  mvp,
  mvvm,
  clean,
  hexagonal,
  verticalSlices,
];

export const TRADEOFF_LABELS: Record<keyof TradeoffScores, string> = {
  simplicity: "Simplicity",
  testability: "Testability",
  scalability: "Scalability",
  teamFriendly: "Team-friendly",
  flexibility: "Flexibility",
};

export const TRADEOFF_EXPLANATIONS: Record<string, Record<keyof TradeoffScores, string>> = {
  mvc: {
    simplicity: "Three layers, well-understood, built into most frameworks. A new developer can be productive in hours.",
    testability: "Components mix rendering, event handling, and business logic — testing one concern requires mocking the others. Views observe the Model, adding coupling.",
    scalability: "God components emerge quickly. No clear boundary prevents one layer from absorbing responsibilities meant for another.",
    teamFriendly: "Small teams thrive with MVC's simplicity. Larger teams collide in shared component directories.",
    flexibility: "Tightly coupled layers make swapping frameworks or data sources a rewrite, not a refactor.",
  },
  mvp: {
    simplicity: "One extra concept (Presenter) over MVC. The passive View simplifies UI code but moves complexity to the Presenter.",
    testability: "The passive View can be rendered in Storybook with zero setup. All logic lives in the Presenter/hook, testable without rendering.",
    scalability: "Better than MVC — the Presenter is more focused. But Presenters (or container components) can still become God objects.",
    teamFriendly: "Clear View/Presenter split helps small-to-medium teams. Doesn't address feature isolation for large teams.",
    flexibility: "Still tightly coupled — the Presenter knows intimate details about both the View's interface and the Model.",
  },
  mvvm: {
    simplicity: "Two-way binding is elegant but has a learning curve. Reactive systems can be hard to debug when bindings cascade.",
    testability: "ViewModels are pure logic with no UI dependency — highly testable. The binding layer itself is framework-tested.",
    scalability: "Better than MVC/MVP for UI-heavy apps. But MVVM doesn't address feature isolation or team boundaries.",
    teamFriendly: "Designers can work on templates while developers work on ViewModels. The binding contract is the handshake.",
    flexibility: "Tightly coupled to the binding framework (Vue, Svelte). Swapping frameworks means rewriting the ViewModel layer.",
  },
  clean: {
    simplicity: "Four layers with strict dependency rules. Significant boilerplate. Not justified for simple apps.",
    testability: "Each layer is independently testable. Business rules (Entities, Use Cases) can run in Node.js — no browser needed.",
    scalability: "Excellent layer isolation prevents architectural erosion. But doesn't address feature-level organization within layers.",
    teamFriendly: "Requires disciplined developers. The dependency rule is easy to state, hard to enforce without tooling.",
    flexibility: "The core promise: swap any outer layer without touching inner layers. Renderer migration? Only the framework layer changes.",
  },
  hexagonal: {
    simplicity: "Ports, adapters, driving/driven sides — the vocabulary alone is a barrier. Worthwhile at scale, overkill for small apps.",
    testability: "Core logic is tested through ports with in-memory adapters. No DOM, no network, no browser APIs needed.",
    scalability: "Designed for complex applications. Each boundary is independently evolvable with stable port contracts.",
    teamFriendly: "Teams can work independently as long as they respect port contracts. UI and logic teams are decoupled by definition.",
    flexibility: "The most flexible pattern. Swap any adapter (REST→GraphQL, localStorage→IndexedDB) without touching core logic.",
  },
  "vertical-slices": {
    simplicity: "Conceptually simple — each feature is self-contained. But cross-cutting concerns (auth, theming) need shared layers.",
    testability: "Each slice is testable in isolation. No hidden dependencies between features.",
    scalability: "Excellent — adding features means adding slices, not modifying existing layers. The codebase grows horizontally.",
    teamFriendly: "Each squad owns a slice end-to-end. No cross-team coordination needed for feature work. The best pattern for squad-based ownership.",
    flexibility: "Individual slices can use different internal patterns. But shared infrastructure is harder to evolve.",
  },
};

// ── Scenario Quiz Data ─────────────────────────────────────────────

export type Scenario = {
  id: string;
  title: string;
  context: string;
  constraints: string[];
  options: { patternId: string; label: string }[];
  correctId: string;
  explanation: string;
  feedback: Record<string, string>;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "trello",
    title: "Trello, 2011",
    context:
      "You're at Fog Creek Software, building a real-time kanban board as a single-page app. Your team is 6 people. You've picked Backbone.js. Cards, lists, boards — a CRUD app with real-time updates via WebSockets. Ship fast and iterate with user feedback.",
    constraints: [
      "Small team, fast iteration",
      "SPA with real-time updates",
      "Backbone.js conventions available",
    ],
    options: [
      { patternId: "mvc", label: "MVC" },
      { patternId: "clean", label: "Clean Architecture" },
      { patternId: "hexagonal", label: "Hexagonal" },
      { patternId: "vertical-slices", label: "Vertical Slices" },
    ],
    correctId: "mvc",
    explanation:
      "Trello was built on Backbone.js MVC — and it was the right call. At 6 people, MVC's simplicity let them ship weekly. Models for cards, Views for the kanban UI, Router for navigation. They evolved the architecture later as the team and features grew.",
    feedback: {
      mvc: "Exactly right. Backbone gives you MVC for free, and at 6 people, the simplicity pays for itself. Trello became one of the most successful Backbone apps ever — Models for cards/lists/boards, Views for the kanban UI, Router for navigation. You don't need enterprise architecture at startup speed.",
      clean: "Clean Architecture adds layers of indirection — entities, use cases, adapters — for a 6-person team that needs to ship in weeks. The testability gains are real, but a startup's biggest risk isn't untestable code, it's running out of runway. Trello didn't need swappable rendering layers in 2011. They needed to ship a kanban board.",
      hexagonal: "Ports and adapters shine when you have multiple input surfaces and complex external integrations. In 2011, Trello had one interface (a web app) and 6 people in one room. The port/adapter overhead would be solving a problem they didn't have yet.",
      "vertical-slices": "Vertical slices exist to give large teams isolation — squad A doesn't block squad B. At 6 people, everyone knows the whole codebase. Slice boundaries would be organizational bureaucracy protecting against conflicts that can't happen with 6 engineers.",
    },
  },
  {
    id: "vue",
    title: "Evan You's Side Project, 2013",
    context:
      "You're a Google engineer frustrated with AngularJS complexity. You love two-way data binding but hate the boilerplate. You want to build a framework where typing in an input field automatically updates a JavaScript variable — and vice versa — with zero ceremony.",
    constraints: [
      "Reactive data binding is the core feature",
      "Must be simpler than Angular",
      "Templates should feel like enhanced HTML",
    ],
    options: [
      { patternId: "mvc", label: "MVC" },
      { patternId: "mvp", label: "MVP" },
      { patternId: "mvvm", label: "MVVM" },
      { patternId: "clean", label: "Clean Architecture" },
    ],
    correctId: "mvvm",
    explanation:
      "This is how Vue.js was born. Evan You took MVVM's two-way binding concept and made it the foundation of Vue. The Options API maps directly: data() is the Model, computed/watch are the ViewModel, and the template is the View. Vue proved MVVM could be simple AND powerful.",
    feedback: {
      mvc: "MVC separates concerns but doesn't provide reactive data binding — the one thing Evan wanted most. In MVC, you manually push data from Controller to View. Evan's core frustration with Angular was ceremony, not separation of concerns. He wanted the binding to be automatic, and MVC's Controller makes it manual.",
      mvp: "MVP makes the View passive — the Presenter explicitly calls view.update(). That's the opposite of what Evan wanted. He wanted the View to reactively reflect data changes with zero ceremony. MVP would have meant more explicit wiring, not less. The 'v-model magic' that defines Vue requires MVVM's two-way binding, not MVP's one-way delegation.",
      mvvm: "Evan You literally built Vue.js as a pure MVVM framework. His key insight: take Angular's two-way binding (the part that worked) and strip away everything else. Vue's Options API is MVVM made explicit — data() is your Model, computed/watch are the ViewModel, template is the View.",
      clean: "This is a framework design decision, not an application architecture decision. Clean Architecture tells you how to structure an app's internal layers. Evan wasn't building an app — he was designing a framework around a specific interaction model. MVVM defines that model: data changes flow automatically to the view and back.",
    },
  },
  {
    id: "design-tool",
    title: "A Browser-Based Design Tool, 2020",
    context:
      "You're building a Figma-like vector design tool that runs in the browser. Complex client-side algorithms: shape intersection math, constraint solving for auto-layout, real-time collaboration via CRDTs, offline persistence with IndexedDB. The React UI is a thin rendering shell. Your 10-person team needs the design algorithms testable without a browser.",
    constraints: [
      "Heavy client-side domain logic",
      "Algorithms must be testable without a browser",
      "UI framework is a thin rendering layer",
    ],
    options: [
      { patternId: "mvp", label: "MVP" },
      { patternId: "mvvm", label: "MVVM" },
      { patternId: "clean", label: "Clean Architecture" },
      { patternId: "vertical-slices", label: "Vertical Slices" },
    ],
    correctId: "clean",
    explanation:
      "Figma's own architecture reflects this: a WebAssembly core (entities + use cases) with zero browser dependencies, a React UI as the outermost framework layer, and WebGL rendering as another adapter. The design algorithms run in Node.js tests in milliseconds while the full app requires a browser.",
    feedback: {
      mvp: "MVP separates UI from logic, but doesn't address how to layer the logic itself. Your constraint solver, CRDT sync engine, and shape math library have their own internal dependencies. MVP gives you 'Presenter has logic' but not 'how to layer that logic so algorithms are independently testable without a browser.'",
      mvvm: "MVVM handles reactive UI beautifully but focuses on the View↔ViewModel binding. Your real complexity isn't in the UI layer — it's in pure algorithms that don't care about views at all. MVVM doesn't have an opinion about how to structure a CRDT engine or a constraint solver.",
      clean: "The design algorithms (entities) have zero browser dependencies — pure TypeScript math and data structures. The use cases orchestrate them ('resolve auto-layout for this frame'). React is the outermost framework layer. Your algorithms run in Node.js tests in milliseconds. This is exactly what 'dependencies point inward' buys you.",
      "vertical-slices": "Vertical slices organize by feature (shape tools, text tools, export). But your core problem is cross-cutting: the constraint solver is used by every feature. Slicing by feature would duplicate or awkwardly share the algorithm layer. You need layers first, then optional feature slicing within the UI layer.",
    },
  },
  {
    id: "scale-up",
    title: "Your Next.js App, 2025",
    context:
      "You're leading frontend at a Series B startup. 15 engineers, growing to 40 this year. The app is a complex SaaS dashboard with features like analytics, user management, billing, and integrations. Squads are forming around each product area. You need each squad to own their feature end-to-end without blocking others.",
    constraints: [
      "15→40 engineers, squad-based ownership",
      "Each squad owns a product area end-to-end",
      "Must not create cross-team dependencies",
    ],
    options: [
      { patternId: "mvc", label: "MVC" },
      { patternId: "mvvm", label: "MVVM" },
      { patternId: "clean", label: "Clean Architecture" },
      { patternId: "vertical-slices", label: "Vertical Slices" },
    ],
    correctId: "vertical-slices",
    explanation:
      "Vertical slices map perfectly to squad-based ownership. Each squad gets a feature directory: analytics/, billing/, integrations/. Inside, they own everything from UI components to API calls to state management. Next.js App Router naturally supports this — each route segment is a slice. Feature-Sliced Design (FSD) formalizes this for frontend with layers within each slice.",
    feedback: {
      mvc: "MVC's shared component/hook/service layers would force squads to coordinate on every change. When the analytics squad and the billing squad both modify the same hooks directory, you get constant merge conflicts and broken deploys. At 40 engineers, that coordination overhead dominates development time.",
      mvvm: "MVVM addresses how UI and data stay in sync — it's a data-flow pattern. Whether you use two-way binding or one-way flow, squads still collide if features aren't structurally isolated. The problem here is organizational (5 squads, shared codebase), and MVVM doesn't have an opinion about feature boundaries.",
      clean: "Clean Architecture gives you excellent layer separation, but it doesn't tell you how to divide features within those layers. Five squads sharing one 'hooks' or 'use-cases' directory still creates merge conflicts. Clean Architecture answers 'how should code depend on other code?' but not 'how should teams own code?' Vertical slices answer both.",
      "vertical-slices": "Each squad gets a self-contained feature directory — analytics/, billing/, integrations/ — with its own components, hooks, API calls, and tests. Next.js App Router encourages this naturally. Feature-Sliced Design formalizes it. At 40 engineers, the squad-to-slice mapping is what prevents organizational scaling from becoming a bottleneck.",
    },
  },
];

// ── Fat Controller Demo Data ───────────────────────────────────────

export type ControllerFeature = {
  id: string;
  name: string;
  responsibilities: string[];
  linesAdded: number;
  code: string;
  consequence: string;
};

export const CONTROLLER_FEATURES: ControllerFeature[] = [
  {
    id: "basic",
    name: "Basic Render",
    responsibilities: ["Fetch product data", "Show loading state", "Render product grid", "Handle empty state"],
    linesAdded: 35,
    code: `function ProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  return <ProductGrid items={products} />
}`,
    consequence: "Clean and focused. One component, one job. Easy to test with React Testing Library.",
  },
  {
    id: "auth",
    name: "Auth Guard",
    responsibilities: ["Check auth state", "Redirect if unauthenticated", "Verify permissions", "Show forbidden state"],
    linesAdded: 25,
    code: `  // ... now also guards access
  const { user, isLoading: authLoading } = useAuth()
  if (authLoading) return <Spinner />
  if (!user) return <Navigate to="/login" />
  if (!user.canViewProducts)
    return <Forbidden />
  // ... same fetch + render as before`,
    consequence: "Still manageable. But notice: testing the product list now requires wrapping it in an AuthProvider mock.",
  },
  {
    id: "search",
    name: "Search & Filters",
    responsibilities: ["Manage search input state", "Debounce keystrokes", "Sync with URL params", "Filter products client-side"],
    linesAdded: 55,
    code: `  // ... now also manages search + URL sync
  const [searchParams, setSearchParams] =
    useSearchParams()
  const [query, setQuery] = useState(
    searchParams.get('q') ?? ''
  )
  const debounced = useDebounce(query, 300)

  useEffect(() => {
    setSearchParams({ q: debounced })
  }, [debounced])
  // fetch now depends on debounced query...`,
    consequence: "The component now owns URL state, debounce timing, and data fetching. Testing 'does it show products?' requires mocking auth + router + fetch.",
  },
  {
    id: "realtime",
    name: "Live Prices",
    responsibilities: ["Open WebSocket connection", "Handle price update messages", "Merge updates into state", "Manage reconnection"],
    linesAdded: 60,
    code: `  // ... now also manages WebSocket
  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    ws.onmessage = (e) => {
      const update = JSON.parse(e.data)
      setProducts(prev =>
        prev.map(p => p.id === update.id
          ? { ...p, price: update.price }
          : p
        ))
    }
    ws.onclose = () => reconnect()
    return () => ws.close()
  }, [])`,
    consequence: "The component now manages WebSocket lifecycle. A connection error can break the product list render. These concerns have nothing in common.",
  },
  {
    id: "analytics",
    name: "Analytics",
    responsibilities: ["Track page view", "Track product clicks", "Monitor scroll-based impressions", "Report performance metrics"],
    linesAdded: 45,
    code: `  // ... now also tracks everything
  useEffect(() => {
    analytics.page('product_list')
  }, [])
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting)
        analytics.track('impression',
          { id: e.target.dataset.productId })
    })
  )`,
    consequence: "Want to test if products display correctly? You now need to mock: auth, router, fetch, WebSocket, IntersectionObserver, and analytics. Six mocks for one test.",
  },
  {
    id: "cart",
    name: "Cart + Sync",
    responsibilities: ["Add to cart with optimistic update", "Rollback on failure", "Cross-tab sync via BroadcastChannel", "Persist cart to localStorage"],
    linesAdded: 45,
    code: `  // ... now also manages cart state
  const addToCart = async (id) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, inCart: true } : p
    ))
    await cartApi.add(id).catch(() =>
      // rollback optimistic update
      setProducts(prev => prev.map(p =>
        p.id === id ? { ...p, inCart: false } : p
      ))
    )
  }
  // cross-tab sync via BroadcastChannel...`,
    consequence: "One component. 265 lines touching 7 systems. A junior dev asked to 'add wishlist support' has to understand auth, URL sync, WebSockets, analytics, cart state, and cross-tab sync before writing a single line.",
  },
];

// ── Dependency Flow Data ───────────────────────────────────────────

export type FlowStep = {
  layerId: string;
  action: string;
  detail: string;
  timing: string;
};

export type UserAction = {
  id: string;
  label: string;
  icon: string;
};

export const FLOW_ACTIONS: UserAction[] = [
  { id: "like", label: "Like a post", icon: "♡" },
  { id: "search", label: "Search products", icon: "⌕" },
];

export type FlowScenario = {
  patternId: string;
  actionId: string;
  steps: FlowStep[];
};

export const FLOW_SCENARIOS: FlowScenario[] = [
  {
    patternId: "mvc",
    actionId: "like",
    steps: [
      { layerId: "view", action: "Click captured", detail: "View captures the click event on the heart icon", timing: "0ms" },
      { layerId: "controller", action: "Handler fires", detail: "onClick handler in the component processes the event", timing: "1ms" },
      { layerId: "model", action: "State updated", detail: "Store dispatches updateLikeCount(postId) to update state", timing: "2ms" },
      { layerId: "view", action: "Observer triggered", detail: "Component subscribed to store re-renders with new count", timing: "15ms" },
      { layerId: "view", action: "UI updated", detail: "Like count re-renders: 41 → 42", timing: "16ms" },
    ],
  },
  {
    patternId: "mvvm",
    actionId: "like",
    steps: [
      { layerId: "view", action: "Click captured", detail: "Template @click handler fires", timing: "0ms" },
      { layerId: "viewmodel", action: "State mutated", detail: "likeCount.value++ (reactive ref updates)", timing: "1ms" },
      { layerId: "view", action: "Auto-updated", detail: "Two-way binding re-renders {{ likeCount }} instantly", timing: "2ms" },
      { layerId: "model", action: "Persisted async", detail: "ViewModel calls api.likePost(id) in background", timing: "3ms" },
      { layerId: "viewmodel", action: "Confirmed", detail: "API response confirms — no rollback needed", timing: "150ms" },
    ],
  },
  {
    patternId: "clean",
    actionId: "like",
    steps: [
      { layerId: "frameworks", action: "Click captured", detail: "React onClick handler fires in the UI framework layer", timing: "0ms" },
      { layerId: "adapters", action: "Request adapted", detail: "Hook converts click into LikePostCommand { postId }", timing: "1ms" },
      { layerId: "usecases", action: "Use case executes", detail: "LikePost use case: validate post exists, check rate limit, increment", timing: "2ms" },
      { layerId: "entities", action: "Business rule checked", detail: "Post entity enforces: user can't like own post, max 1 like per user", timing: "3ms" },
      { layerId: "adapters", action: "Response formatted", detail: "Hook updates component state: { liked: true, count: 42 }", timing: "4ms" },
      { layerId: "frameworks", action: "UI updated", detail: "React component re-renders with new like count", timing: "5ms" },
    ],
  },
  {
    patternId: "mvc",
    actionId: "search",
    steps: [
      { layerId: "view", action: "Keystroke captured", detail: "User types 'blue shoes' in search input", timing: "0ms" },
      { layerId: "controller", action: "Input debounced", detail: "onChange handler waits 300ms for typing to stop", timing: "300ms" },
      { layerId: "model", action: "API called", detail: "Store dispatches searchProducts('blue shoes') → fetch", timing: "301ms" },
      { layerId: "view", action: "Results rendered", detail: "Component re-renders with 24 matching products", timing: "350ms" },
    ],
  },
  {
    patternId: "mvvm",
    actionId: "search",
    steps: [
      { layerId: "view", action: "v-model update", detail: "User types — searchQuery ref updates via two-way binding", timing: "0ms" },
      { layerId: "viewmodel", action: "Computed triggers", detail: "watch(searchQuery) fires debounced search after 300ms", timing: "300ms" },
      { layerId: "model", action: "API called", detail: "searchProducts(query) hits the backend", timing: "301ms" },
      { layerId: "viewmodel", action: "Results stored", detail: "searchResults.value = response.products (reactive)", timing: "350ms" },
      { layerId: "view", action: "Auto-rendered", detail: "v-for=\"product in searchResults\" reactively updates the grid", timing: "351ms" },
    ],
  },
  {
    patternId: "clean",
    actionId: "search",
    steps: [
      { layerId: "frameworks", action: "Input captured", detail: "React input onChange fires", timing: "0ms" },
      { layerId: "adapters", action: "Request adapted", detail: "useSearch hook creates SearchProductsQuery { query, filters }", timing: "1ms" },
      { layerId: "usecases", action: "Use case runs", detail: "SearchProducts: validate query length, apply business filters, call repository port", timing: "2ms" },
      { layerId: "entities", action: "Rules applied", detail: "Product entity filters: only published products, check user's region availability", timing: "3ms" },
      { layerId: "adapters", action: "Results formatted", detail: "Hook maps domain products to ProductCardProps for the UI", timing: "50ms" },
      { layerId: "frameworks", action: "Grid rendered", detail: "React ProductGrid component renders with formatted results", timing: "51ms" },
    ],
  },
];

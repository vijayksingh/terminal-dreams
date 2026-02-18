import type { RecipeArticle } from "@/lib/recipe-types";

const mainTsx = `import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`;

const step1App = `const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Fruit List</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
`;

const step2App = `import { useState } from "react";

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

export default function App() {
  const [query, setQuery] = useState("");

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Fruit List</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          display: "block",
          marginBottom: "1rem",
          padding: "0.5rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
`;

const step3App = `import { useState } from "react";

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

export default function App() {
  const [query, setQuery] = useState("");
  const results = items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Fruit List</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          display: "block",
          marginBottom: "1rem",
          padding: "0.5rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <ul>
        {results.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
`;

const step4Highlight = `export type Segment = { text: string; match: boolean };

export function highlight(text: string, query: string): Segment[] {
  if (!query.trim()) return [{ text, match: false }];
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  const idx = lt.indexOf(lq);
  if (idx === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + query.length), match: true },
    { text: text.slice(idx + query.length), match: false },
  ].filter((s) => s.text.length > 0);
}
`;

const step4App = `import { useState } from "react";
import { highlight } from "./highlight";

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

export default function App() {
  const [query, setQuery] = useState("");
  const results = items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Fruit List</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          display: "block",
          marginBottom: "1rem",
          padding: "0.5rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <ul>
        {results.map((item) => (
          <li key={item}>
            {highlight(item, query).map((seg, i) =>
              seg.match ? (
                <mark key={i}>{seg.text}</mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const step5App = `import { useState } from "react";
import { highlight } from "./highlight";

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

export default function App() {
  const [query, setQuery] = useState("");
  const results = items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Fruit List</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          display: "block",
          marginBottom: "1rem",
          padding: "0.5rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      {results.length > 0 ? (
        <ul>
          {results.map((item) => (
            <li key={item}>
              {highlight(item, query).map((seg, i) =>
                seg.match ? (
                  <mark key={i}>{seg.text}</mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#888", fontStyle: "italic" }}>
          No results for "{query}".
        </p>
      )}
    </div>
  );
}
`;

const step6UseSearch = `import { useState } from "react";

export function useSearch(items: string[]) {
  const [query, setQuery] = useState("");
  const results = items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );
  return { query, setQuery, results };
}
`;

const step6App = `import { highlight } from "./highlight";
import { useSearch } from "./useSearch";

const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

export default function App() {
  const { query, setQuery, results } = useSearch(items);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>Fruit List</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        style={{
          display: "block",
          marginBottom: "1rem",
          padding: "0.5rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      {results.length > 0 ? (
        <ul>
          {results.map((item) => (
            <li key={item}>
              {highlight(item, query).map((seg, i) =>
                seg.match ? (
                  <mark key={i}>{seg.text}</mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#888", fontStyle: "italic" }}>
          No results for "{query}".
        </p>
      )}
    </div>
  );
}
`;

function makeWorkspace(mainId: string, appId: string, appContent: string) {
  return {
    version: 1 as const,
    preset: "react-ts" as const,
    entry: "/src/main.tsx",
    activeFileId: appId,
    folders: ["/src"],
    files: [
      {
        id: mainId,
        path: "/src/main.tsx",
        language: "typescript" as const,
        content: mainTsx,
      },
      {
        id: appId,
        path: "/src/App.tsx",
        language: "typescript" as const,
        content: appContent,
      },
    ],
    dependencies: {
      react: "19.1.0",
      "react-dom": "19.1.0",
    },
  };
}

function makeWorkspaceWithHighlight(
  mainId: string,
  appId: string,
  appContent: string,
  highlightId: string,
  highlightContent: string,
  focusOnHighlight = true
) {
  return {
    version: 1 as const,
    preset: "react-ts" as const,
    entry: "/src/main.tsx",
    activeFileId: focusOnHighlight ? highlightId : appId,
    folders: ["/src"],
    files: [
      {
        id: mainId,
        path: "/src/main.tsx",
        language: "typescript" as const,
        content: mainTsx,
      },
      {
        id: appId,
        path: "/src/App.tsx",
        language: "typescript" as const,
        content: appContent,
      },
      {
        id: highlightId,
        path: "/src/highlight.ts",
        language: "typescript" as const,
        content: highlightContent,
      },
    ],
    dependencies: {
      react: "19.1.0",
      "react-dom": "19.1.0",
    },
  };
}

function makeWorkspaceWithHook(
  mainId: string,
  appId: string,
  appContent: string,
  highlightId: string,
  highlightContent: string,
  hookId: string,
  hookContent: string
) {
  return {
    version: 1 as const,
    preset: "react-ts" as const,
    entry: "/src/main.tsx",
    activeFileId: hookId,
    folders: ["/src"],
    files: [
      {
        id: mainId,
        path: "/src/main.tsx",
        language: "typescript" as const,
        content: mainTsx,
      },
      {
        id: appId,
        path: "/src/App.tsx",
        language: "typescript" as const,
        content: appContent,
      },
      {
        id: highlightId,
        path: "/src/highlight.ts",
        language: "typescript" as const,
        content: highlightContent,
      },
      {
        id: hookId,
        path: "/src/useSearch.ts",
        language: "typescript" as const,
        content: hookContent,
      },
    ],
    dependencies: {
      react: "19.1.0",
      "react-dom": "19.1.0",
    },
  };
}

export const article: RecipeArticle = {
  slug: "live-search",
  title: "Building a Live Search Filter",
  summary:
    "Walk through building an interactive search filter in React — from a static list to a fully functional live search with highlight, empty-state handling, and a reusable custom hook.",
  date: "2026-02-18",
  tags: ["react", "hooks", "beginner"],
  steps: [
    {
      id: "step-1-static-list",
      heading: "Start with a static list",
      text: `Before adding any interactivity, render a plain list of items. This is our starting point — a simple \`<ul>\` that maps over a fixed array.\n\nNo state, no event handlers. Just markup and data. Starting here forces us to separate the rendering concern from the filtering concern, which makes each layer easier to add and easier to test in isolation. This foundation makes it easy to see exactly what changes as we layer on features.`,
      workspace: makeWorkspace("s1-main-aaaaaaaaaaaa", "s1-app--aaaaaaaaaaaa", step1App),
      focusFile: "/src/App.tsx",
    },
    {
      id: "step-2-search-input",
      heading: "Wire up a controlled input",
      text: `Wire up a \`useState\` hook to track the search query. The \`<input>\` is a *controlled* component — its \`value\` is always driven by React state, and every keystroke fires \`onChange\` to keep them in sync.\n\nThis pattern is fundamental to React forms: the component, not the DOM, is the single source of truth for the field's value. At this stage the list doesn't filter yet, but the input is fully connected. You can verify this by adding a \`console.log(query)\` inside the component — it will log on every keystroke.`,
      workspace: makeWorkspace("s2-main-bbbbbbbbbbbb", "s2-app--bbbbbbbbbbbb", step2App),
      focusFile: "/src/App.tsx",
    },
    {
      id: "step-3-filter-results",
      heading: "Filter the list on every keystroke",
      text: `Derive the visible items with \`Array.filter\`. Because \`results\` is computed directly from \`query\` state, React re-renders and recomputes it on every keystroke — no extra \`useEffect\` needed.\n\nThis is *derived state*: instead of storing both \`query\` and \`results\` as independent pieces of state (which can get out of sync), we compute results from the single source of truth. The \`.toLowerCase()\` calls make the match case-insensitive. Try typing "a" — Apple, Banana, and Date should all remain.`,
      workspace: makeWorkspace("s3-main-cccccccccccc", "s3-app--cccccccccccc", step3App),
      focusFile: "/src/App.tsx",
    },
    {
      id: "step-4-highlight",
      heading: "Highlight the matching text",
      text: `Filtering tells users *which* results survived — but highlighting the query inside each result tells them *why*, which makes the search feel responsive and trustworthy. We move the highlight logic into a separate \`highlight.ts\` utility: it splits a string around regex matches and returns an array of \`{ text, match }\` segments. Back in \`App.tsx\` we map over those segments, wrapping matched parts in a \`<mark>\` element.\n\nSplitting the concern into its own module demonstrates a key React pattern: keep pure, side-effect-free logic out of components. This file is now independently testable, and the tab switcher in the editor makes it easy to see how \`App.tsx\` imports and uses it.`,
      workspace: makeWorkspaceWithHighlight(
        "s4-main-eeeeeeeeeeee",
        "s4-app--eeeeeeeeeeee",
        step4App,
        "s4-hl---eeeeeeeeeeee",
        step4Highlight,
        true
      ),
      focusFile: "/src/highlight.ts",
    },
    {
      id: "step-5-empty-state",
      heading: "Handle the empty state",
      text: `A search that silently shows an empty list is confusing — users wonder whether the query failed, the data is missing, or something is broken. Conditional rendering solves this with a single ternary: when \`results.length === 0\`, we swap the \`<ul>\` for a friendly message.\n\nNotice the message echoes the query back to the user — this confirms what was typed and signals that the system understood the input. This is a first-class React pattern for communicating UI state. Try typing "xyz" to see the empty state in action, then clear the field to watch the list return.`,
      workspace: makeWorkspaceWithHighlight(
        "s5-main-ffffffffffff",
        "s5-app--ffffffffffff",
        step5App,
        "s5-hl---ffffffffffff",
        step4Highlight,
        false
      ),
      focusFile: "/src/App.tsx",
    },
    {
      id: "step-6-custom-hook",
      heading: "Extract to a reusable hook",
      text: `As components grow, mixing UI markup with data-transformation logic makes both harder to reason about. Custom hooks are React's answer: a function whose name starts with \`use\` that can call other hooks and returns whatever shape the caller needs.\n\nHere we extract query state and filtering into \`useSearch\` — a seven-line module that \`App.tsx\` consumes via a single destructure. The component is now purely about rendering; the logic lives somewhere independently testable. This pattern scales: \`useSearch\` could later accept a custom comparator, handle async data sources, debounce keystrokes, or be published as a standalone library.`,
      workspace: makeWorkspaceWithHook(
        "s6-main-gggggggggggg",
        "s6-app--gggggggggggg",
        step6App,
        "s6-hl---gggggggggggg",
        step4Highlight,
        "s6-hook-gggggggggggg",
        step6UseSearch
      ),
      focusFile: "/src/useSearch.ts",
    },
  ],
};

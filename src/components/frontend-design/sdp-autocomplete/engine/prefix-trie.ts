export interface TrieNode {
  children: Map<string, TrieNode>;
  results: string[] | null;
  insertedAt: number;
  accessCount: number;
}

export function createTrieNode(): TrieNode {
  return { children: new Map(), results: null, insertedAt: Date.now(), accessCount: 0 };
}

export interface TrieState {
  root: TrieNode;
  nodeCount: number;
  cacheCount: number;
}

export function createTrie(): TrieState {
  return { root: createTrieNode(), nodeCount: 1, cacheCount: 0 };
}

export function trieCollectCached(
  node: TrieNode,
  prefix: string,
  out: { prefix: string; node: TrieNode }[]
): void {
  if (node.results !== null) out.push({ prefix, node });
  for (const [char, child] of node.children) {
    trieCollectCached(child, prefix + char, out);
  }
}

export function trieEvict(trie: TrieState, maxSize: number): TrieState {
  if (trie.cacheCount <= maxSize) return trie;
  const cached: { prefix: string; node: TrieNode }[] = [];
  trieCollectCached(trie.root, "", cached);
  cached.sort((a, b) => a.node.insertedAt - b.node.insertedAt);
  let evicted = 0;
  const toEvict = trie.cacheCount - maxSize;
  for (let i = 0; i < cached.length && evicted < toEvict; i++) {
    cached[i].node.results = null;
    cached[i].node.accessCount = 0;
    evicted++;
  }
  return {
    root: trie.root,
    nodeCount: trie.nodeCount,
    cacheCount: trie.cacheCount - evicted,
  };
}

export function trieInsert(trie: TrieState, key: string, results: string[], maxSize?: number): TrieState {
  let current = trie.root;
  let added = 0;
  const lower = key.toLowerCase();
  for (const char of lower) {
    if (!current.children.has(char)) {
      current.children.set(char, createTrieNode());
      added++;
    }
    current = current.children.get(char)!;
  }
  const isNew = current.results === null;
  current.results = results;
  current.insertedAt = Date.now();
  current.accessCount++;
  let next: TrieState = {
    root: trie.root,
    nodeCount: trie.nodeCount + added,
    cacheCount: trie.cacheCount + (isNew ? 1 : 0),
  };
  if (maxSize !== undefined) next = trieEvict(next, maxSize);
  return next;
}

export function trieLookup(trie: TrieState, prefix: string): string[] | null {
  let current = trie.root;
  const lower = prefix.toLowerCase();
  for (const char of lower) {
    if (!current.children.has(char)) return null;
    current = current.children.get(char)!;
  }
  if (current.results !== null) {
    current.accessCount++;
    current.insertedAt = Date.now();
  }
  return current.results;
}

// ── Mock search data ────────────────────────────────────────────────

export const TERMS: readonly string[] = [
  "Abstract Syntax Tree", "Angular", "Apollo GraphQL", "Astro",
  "Babel", "Backbone.js", "Binary Search", "Bun",
  "CSS Grid", "CSS Modules", "Closure", "Compiler", "Concurrency", "Currying",
  "D3.js", "Deno", "Docker",
  "Electron", "Elm", "ESLint", "Event Loop", "Express",
  "FastAPI", "Fiber", "Flexbox", "Flutter",
  "Garbage Collector", "Git", "Go", "GraphQL",
  "Haskell", "HTML", "HTTP/2", "Hydration",
  "Interpreter",
  "Java", "JavaScript", "Jest", "JSON", "JSX",
  "Kotlin", "Kubernetes",
  "Lazy Loading", "Linked List", "Linux", "Lisp", "LLVM", "Lua",
  "Memoization", "Microservices", "MongoDB", "Mutex", "MySQL",
  "Nest.js", "Next.js", "Node.js", "Nuxt",
  "OCaml",
  "Perl", "PHP", "PostgreSQL", "Prettier", "Promise", "Protocol Buffers", "Python",
  "React", "React Query", "Redis", "Redux", "Remix", "REST API", "Ruby", "Rust",
  "Sass", "Scala", "Semaphore", "Server Components", "Service Worker",
  "Solid.js", "SQLite", "Streaming SSR", "Svelte", "Swift",
  "Tailwind CSS", "TCP/IP", "Terraform", "Three.js", "Tree Shaking", "Trie", "TypeScript",
  "V8 Engine", "Virtual DOM", "Vite", "Vue.js",
  "WASM", "WebSocket", "Webpack",
  "XState",
  "Zig", "Zod", "Zustand",
] as const;

export function searchTerms(query: string): string[] {
  const lower = query.toLowerCase();
  return TERMS.filter((t) => t.toLowerCase().includes(lower)).slice(0, 8);
}

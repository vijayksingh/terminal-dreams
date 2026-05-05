export type Primitive = {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  properties: string[];
};

export type FlowStage = {
  id: string;
  label: string;
  icon: string;
  description: string;
  dataIn: string;
  dataOut: string;
  transform: string;
  challenge?: {
    question: string;
    options: string[];
    correctIndex: number;
    feedback: string[];
  };
};

export type Annotation = {
  match: string;
  label: string;
  explanation: string;
};

export const PRIMITIVES: Primitive[] = [
  {
    id: "session",
    name: "Session",
    icon: "S",
    tagline: "Message history with built-in compaction",
    properties: [
      "Persists message history across requests",
      "Three operations: prompt(), skill(), task()",
      "Compaction summarizes old messages near token limits",
      "Exclusive: one operation at a time per session",
    ],
  },
  {
    id: "task",
    name: "Task",
    icon: "T",
    tagline: "One-shot child agents with depth limits",
    properties: [
      "Created via session.task() for delegated work",
      "Max 4 levels deep — prevents infinite recursion",
      "Shares parent sandbox and secrets",
      "Separate message history from parent",
    ],
  },
  {
    id: "skill",
    name: "Skill",
    icon: "K",
    tagline: "Markdown-defined instruction sets",
    properties: [
      "Lives in .agents/skills/ as .md files",
      "Invoked via session.skill(name)",
      "Replaces complex prompt engineering",
      "Bundles instructions, context, and examples",
    ],
  },
  {
    id: "role",
    name: "Role",
    icon: "R",
    tagline: "System prompt overlays applied per-call",
    properties: [
      "Character profiles with scoped instructions",
      "Optionally overrides model selection",
      "Applied per-call, not persisted to history",
      "Composes with skills without inheritance",
    ],
  },
  {
    id: "sandbox",
    name: "Sandbox",
    icon: "B",
    tagline: "One interface, three runtimes",
    properties: [
      "Virtual: just-bash, lightweight, fast default",
      "Local: mounts host filesystem for CI/CD",
      "Container: full Linux via Daytona connector",
      "Unified SessionEnv interface across all three",
    ],
  },
];

export const FLOW_STAGES: FlowStage[] = [
  {
    id: "prompt",
    label: "User Prompt",
    icon: "→",
    description:
      "A text prompt arrives — either from a human operator, an API call, or a CI trigger. This is the raw input that enters the system.",
    dataIn: '"Review this PR for security issues"',
    dataOut: '{ role: "user", content: "Review this PR..." }',
    transform: "Wrap raw text into a Message object",
  },
  {
    id: "session",
    label: "Session",
    icon: "S",
    description:
      "The session loads its message history and appends the new prompt. If the history is approaching the token limit, compaction fires — summarizing older messages into a condensed form.",
    dataIn: "1 new message",
    dataOut: "47 messages (history + new)",
    transform: "Load history → check token budget → compact if needed → append",
    challenge: {
      question: "The session has 45 old messages and just received a new one. Token count is near the limit. What happens first?",
      options: [
        "The new message is dropped to stay under the limit",
        "Old messages are compacted into a summary, then the new message is appended",
        "The session starts fresh with only the new message",
      ],
      correctIndex: 1,
      feedback: [
        "Messages are never dropped silently — that would lose user intent. The framework preserves new input and compresses old context instead.",
        "Correct — compaction summarizes older messages to free token budget, then the new message appends normally. History is preserved in compressed form, never discarded.",
        "Starting fresh would lose all conversation context. Sessions are persistent precisely to avoid this.",
      ],
    },
  },
  {
    id: "skill",
    label: "Skill Resolution",
    icon: "K",
    description:
      "If the operation is a skill() call, the framework loads the matching .md file from .agents/skills/ and injects its instructions into the system prompt. This shapes HOW the model responds.",
    dataIn: 'skill("code-review")',
    dataOut: "system prompt += code-review.md instructions",
    transform: "Find .md file → parse frontmatter → inject into system prompt",
    challenge: {
      question: "A skill is loaded via session.skill('code-review'). Where do its instructions end up?",
      options: [
        "Appended to the conversation history as a user message",
        "Injected into the system prompt for this call only",
        "Stored in the session permanently for all future calls",
      ],
      correctIndex: 1,
      feedback: [
        "Putting instructions in the conversation history would pollute the message log. Other operations would see irrelevant skill text.",
        "Correct — skills are per-call system prompt overlays. They shape the model's behavior for one operation, then vanish. The same session can use different skills for different calls.",
        "Skills are intentionally ephemeral. Persisting them would make sessions rigid — you want 'code-review' for this call and 'summarize' for the next.",
      ],
    },
  },
  {
    id: "llm",
    label: "LLM Call",
    icon: "◆",
    description:
      "The assembled messages — system prompt, role overlay, skill instructions, and conversation history — are sent to the model. The model reasons and decides whether to respond directly or use tools.",
    dataIn: "system prompt + 47 messages + skill overlay",
    dataOut: 'response OR tool_call("session.task", {...})',
    transform: "Model receives full context → reasons → chooses action",
  },
  {
    id: "task",
    label: "Task Spawn",
    icon: "T",
    description:
      "If the model calls session.task(), a child agent is created with its own message history but shared sandbox. The child executes independently and returns its result to the parent. Depth is capped at 4.",
    dataIn: '"Analyze auth middleware for injection vulnerabilities"',
    dataOut: "child result → appended to parent messages",
    transform: "Create child session → run to completion → return result to parent",
    challenge: {
      question: "The parent agent spawns a child task. What does the child inherit from the parent?",
      options: [
        "The full message history and sandbox",
        "Only the sandbox — the child gets its own empty message history",
        "Nothing — the child is completely independent",
      ],
      correctIndex: 1,
      feedback: [
        "Sharing message history would let the child see the parent's full conversation, which breaks encapsulation. The child needs focused context, not the parent's entire thread.",
        "Correct — the child gets a fresh message history (so it has focused context) but shares the parent's sandbox (so it can access the same files and tools). This is delegation with shared workspace.",
        "Complete independence would mean the child can't access the codebase the parent is working on. The shared sandbox is what makes delegation practical.",
      ],
    },
  },
  {
    id: "sandbox",
    label: "Sandbox Exec",
    icon: "B",
    description:
      "Tool calls (shell commands, file operations) execute inside the sandbox. Virtual sandboxes use just-bash for speed. Container sandboxes provide full isolation via Daytona. The interface is identical.",
    dataIn: "exec(\"grep -r 'sql' src/auth/\")",
    dataOut: "ExecResult { stdout, stderr, exitCode }",
    transform: "Route to sandbox runtime → execute → capture output",
  },
  {
    id: "response",
    label: "Response",
    icon: "✓",
    description:
      "The final response is assembled from the model's output and any tool results. Messages are persisted to the session store. The session is now ready for the next operation.",
    dataIn: "model output + tool results + child task results",
    dataOut: "final response to caller",
    transform: "Assemble response → persist all new messages → release session lock",
  },
];

export const ARCHITECTURE_EDGES: Array<{ from: string; to: string }> = [
  { from: "session", to: "task" },
  { from: "session", to: "skill" },
  { from: "session", to: "role" },
  { from: "task", to: "sandbox" },
  { from: "session", to: "sandbox" },
];

export const SESSION_TYPE_CODE = `interface SessionData {
  id: string;
  agentId: string;
  messages: Message[];
  version: number;
  createdAt: number;
  lastActiveAt: number;
}

interface Session {
  prompt(text: string, options?: PromptOptions): Promise<Response>;
  skill(name: string, args?: Record<string, string>): Promise<Response>;
  task(instructions: string, options?: TaskOptions): Promise<Response>;
}`;

export const SESSION_ANNOTATIONS: Annotation[] = [
  {
    match: "messages: Message[]",
    label: "1",
    explanation:
      "The entire conversation history lives here as an append-only array. This is the core design choice: sessions are message logs, not state machines. Every prompt, response, and tool call is a message. This makes debugging trivial — you can replay any session by re-reading its messages.",
  },
  {
    match: "version: number",
    label: "2",
    explanation:
      "Optimistic concurrency control. Each write increments the version. If two operations try to write simultaneously, one fails with a version conflict. This enforces the exclusive-operation-per-session invariant without distributed locks.",
  },
  {
    match: "prompt(text: string",
    label: "3",
    explanation:
      "The most common operation. Sends text to the model with the full message history. The options parameter controls model selection, temperature, and tool availability — but the session manages history automatically.",
  },
  {
    match: "skill(name: string",
    label: "4",
    explanation:
      "Loads a markdown skill file and injects its instructions into the system prompt for this call only. The skill doesn't persist in message history — it's a per-call overlay. This means the same session can use different skills for different operations.",
  },
  {
    match: "task(instructions: string",
    label: "5",
    explanation:
      "Spawns a child agent with its own message history but shared sandbox. The child runs to completion and returns its result. This is how agents delegate — not by multithreading, but by creating short-lived specialized children.",
  },
];

export const SKILL_FILE_CODE = `---
name: code-review
description: Reviews code for bugs and style issues
---

# Code Review

You are a senior engineer reviewing a pull request.

## Instructions

1. Read the diff carefully
2. Flag bugs, not style preferences
3. Explain WHY something is wrong, not just WHAT

## Output Format

For each issue:
- **File**: path
- **Line**: number
- **Severity**: error | warning | nit
- **Explanation**: what and why`;

export const SKILL_ANNOTATIONS: Annotation[] = [
  {
    match: "name: code-review",
    label: "1",
    explanation:
      "This is the identifier used when calling session.skill('code-review'). The framework auto-discovers skill files from .agents/skills/ — no registration needed. The filename and the name field must match.",
  },
  {
    match: "You are a senior engineer",
    label: "2",
    explanation:
      "This entire markdown body becomes a system prompt injection. It's not code — it's instructions in natural language. The insight: most agent behavior is better expressed as prose instructions than as TypeScript control flow. A product manager can edit this file without touching code.",
  },
  {
    match: "## Output Format",
    label: "3",
    explanation:
      "Structured output constraints expressed in markdown. The model follows this format reliably because it appears in the system prompt, not buried in a long conversation. Skills keep behavioral instructions close to where the model sees them.",
  },
];

export const SANDBOX_INTERFACE_CODE = `interface SessionEnv {
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(pattern: string): Promise<string[]>;
  getWorkingDirectory(): string;
}

// Same interface, three implementations:
// VirtualEnv  — just-bash, millisecond startup, pennies per hour
// LocalEnv    — mounts host FS, full network, for CI/CD
// ContainerEnv — Daytona, isolated Linux, for untrusted code`;

export const BUILD_PIPELINE_CODE = `// @flue/cli entry — what "flue dev" and "flue build" invoke
export async function build(config: BuildConfig): Promise<BuildArtifact> {
  const workspace = await discoverWorkspace(config.root);
  const agents = await loadAgents(workspace);
  const skills = await loadSkills(workspace);

  for (const agent of agents) {
    validateAgent(agent, skills);
  }

  return config.target === "cloudflare"
    ? bundleForCloudflare(agents, skills)
    : bundleForNode(agents, skills);
}`;

export const BUILD_ANNOTATIONS: Annotation[] = [
  {
    match: "discoverWorkspace(config.root)",
    label: "1",
    explanation:
      "Workspace auto-discovery walks the directory tree looking for .flue/agents/ and .agents/skills/ directories. No explicit registration — drop a file in the right place and it's part of the system. This is the 'convention over configuration' philosophy.",
  },
  {
    match: "validateAgent(agent, skills)",
    label: "2",
    explanation:
      "Build-time validation catches misconfigurations before deployment: missing skill references, invalid role definitions, circular task dependencies. Fail fast at build, not at runtime when an agent is mid-conversation.",
  },
  {
    match: 'config.target === "cloudflare"',
    label: "3",
    explanation:
      "Runtime-agnostic deployment. The same agent code compiles to a Node.js HTTP server (Hono-based) or a Cloudflare Worker with Durable Objects for session persistence. The abstraction boundary is clean: agents never import platform-specific code.",
  },
];

// ── State Machine Data ─────────────────────────────────────

export type SMNode = {
  id: string;
  label: string;
  icon: string;
  description: string;
  dataIn: string;
  dataOut: string;
  transform: string;
  isHub?: boolean;
  challenge?: {
    question: string;
    options: string[];
    correctIndex: number;
    feedback: string[];
  };
};

export type SMScenario = {
  id: string;
  name: string;
  hint: string;
  path: string[];
};

export const SM_NODES: Record<string, SMNode> = {
  prompt: {
    id: "prompt",
    label: "Prompt Received",
    icon: "→",
    description:
      "A text prompt enters the system — from a human operator, an API call, or a CI trigger. Raw text is wrapped into a structured Message before anything else happens.",
    dataIn: '"Review this PR for security issues"',
    dataOut: '{ role: "user", content: "Review this PR..." }',
    transform: "Wrap raw text into a Message object",
  },
  session: {
    id: "session",
    label: "Session Lookup",
    icon: "S",
    description:
      "The session loads its message history and appends the new prompt. If approaching the token limit, compaction fires — summarizing older messages into condensed form. Nothing is discarded.",
    dataIn: "1 new message",
    dataOut: "47 messages (history + new)",
    transform: "Load history → check budget → compact if needed → append",
    challenge: {
      question:
        "45 old messages, 1 new, near the token limit. What happens first?",
      options: [
        "New message is dropped to stay under the limit",
        "Old messages are compacted, then the new one appends",
        "Session starts fresh with only the new message",
      ],
      correctIndex: 1,
      feedback: [
        "Messages are never dropped — that loses user intent. The framework compresses old context instead.",
        "Correct — compaction summarizes older messages to free budget. History is preserved in compressed form, never discarded.",
        "Starting fresh loses all context. Sessions are persistent precisely to avoid this.",
      ],
    },
  },
  skill: {
    id: "skill",
    label: "Skill Resolution",
    icon: "K",
    description:
      "If the operation invokes a skill, the framework loads the matching .md file and injects its instructions into the system prompt for this call only. Skills are ephemeral overlays.",
    dataIn: 'skill("code-review")',
    dataOut: "system prompt += code-review.md",
    transform: "Find .md → parse frontmatter → inject into system prompt",
    challenge: {
      question: "Where do loaded skill instructions end up?",
      options: [
        "Appended to conversation history as a user message",
        "Injected into the system prompt for this call only",
        "Stored permanently for all future calls",
      ],
      correctIndex: 1,
      feedback: [
        "Putting instructions in history pollutes the message log.",
        "Correct — skills are per-call overlays. Same session, different skills per operation.",
        "Persisting skills makes sessions rigid. You want code-review now, summarize next.",
      ],
    },
  },
  llm: {
    id: "llm",
    label: "LLM Decision",
    icon: "◆",
    description:
      "The assembled context — system prompt, role overlay, skill instructions, conversation history — goes to the model. It reasons and chooses: respond directly, call a tool, or spawn a child task. This is the branching point.",
    dataIn: "system prompt + 47 messages + skill overlay",
    dataOut: "text | tool_call | task_spawn",
    transform: "Model receives full context → reasons → chooses action",
    isHub: true,
  },
  tool: {
    id: "tool",
    label: "Tool Execution",
    icon: "B",
    description:
      "The model requested a tool — shell command, file read, or API call. The sandbox executes it and captures the result. Output loops back to the LLM for the next decision.",
    dataIn: "exec(\"grep -r 'sql' src/auth/\")",
    dataOut: "{ stdout, stderr, exitCode } → back to LLM",
    transform: "Route to sandbox → execute → capture → return",
  },
  response: {
    id: "response",
    label: "Response",
    icon: "✓",
    description:
      "The final answer is assembled from the model's output and any tool or task results. Messages are persisted, and the session lock is released — ready for the next prompt.",
    dataIn: "model output + tool/task results",
    dataOut: "final response to caller",
    transform: "Assemble → persist messages → release lock",
  },
  task: {
    id: "task",
    label: "Task Spawn",
    icon: "T",
    description:
      "A child agent is created with its own message history but shared sandbox. It runs to completion and returns results. The parent LLM continues with the child's output. Depth is capped at 4.",
    dataIn: '"Analyze auth middleware for vulnerabilities"',
    dataOut: "child result → back to LLM",
    transform: "Create child → run to completion → return result",
    challenge: {
      question: "What does the child task inherit from its parent?",
      options: [
        "Full message history and sandbox",
        "Only the sandbox — child gets empty history",
        "Nothing — completely independent",
      ],
      correctIndex: 1,
      feedback: [
        "Sharing history breaks encapsulation. The child needs focused context.",
        "Correct — fresh history (focused) + shared sandbox (same files/tools). Delegation with shared workspace.",
        "Independence means the child can't access the codebase. Shared sandbox makes delegation practical.",
      ],
    },
  },
};

export const SM_SCENARIOS: SMScenario[] = [
  {
    id: "direct",
    name: "Direct Answer",
    hint: "Model responds with text — no tools, no delegation",
    path: ["prompt", "session", "skill", "llm", "response"],
  },
  {
    id: "tool-use",
    name: "Tool Use",
    hint: "Model calls a tool, gets result, then responds",
    path: ["prompt", "session", "skill", "llm", "tool", "llm", "response"],
  },
  {
    id: "delegation",
    name: "Delegation",
    hint: "Model spawns a child agent, gets result, then responds",
    path: ["prompt", "session", "skill", "llm", "task", "llm", "response"],
  },
];

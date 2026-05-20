import type { SceneState, StageAnchor } from "./types";

export type InspectorKind = "state" | "props" | "events";

export type InspectorEntry = {
  key: string;
  /** Pre-formatted display value (already quoted/formatted). */
  value: string;
  /** Inferred type for syntax-highlight colour. */
  valueType: "string" | "number" | "boolean" | "ref" | "fn";
  /** When this entry came from a parent (props), say which one. */
  source?: string;
  /** Mark which entry just changed vs the previous scene (driven by caller). */
  changed?: boolean;
};

export type InspectorSection = {
  kind: InspectorKind;
  entries: InspectorEntry[];
};

/** Derive the inspector content for a given component from the
 *  current scene. Returns one or more sections (e.g. props + state). */
export function deriveInspector(
  componentId: StageAnchor,
  scene: SceneState,
  prevScene?: SceneState,
): InspectorSection[] {
  switch (componentId) {
    case "network": {
      const onlineCount = scene.chatpane.connection === "connected" ? 1247 : 0;
      return [
        {
          kind: "state",
          entries: [
            { key: "endpoint", value: '"ws.chat.app"', valueType: "string" },
            { key: "region", value: '"us-east-1"', valueType: "string" },
            { key: "port", value: "443", valueType: "number" },
            {
              key: "clientsOnline",
              value: onlineCount.toLocaleString(),
              valueType: "number",
              changed: prevScene
                ? (prevScene.chatpane.connection === "connected") !==
                  (scene.chatpane.connection === "connected")
                : false,
            },
          ],
        },
      ];
    }

    case "ws": {
      return [
        {
          kind: "state",
          entries: [
            {
              key: "readyState",
              value:
                scene.chatpane.connection === "connected"
                  ? '"OPEN"'
                  : scene.chatpane.connection === "connecting"
                    ? '"CONNECTING"'
                    : '"CLOSED"',
              valueType: "string",
              changed:
                prevScene?.chatpane.connection !== scene.chatpane.connection,
            },
            { key: "protocol", value: '"wss"', valueType: "string" },
            { key: "bufferedAmount", value: "0", valueType: "number" },
          ],
        },
      ];
    }

    case "chatpane": {
      const msgChanged =
        prevScene && prevScene.messages.length !== scene.messages.length;
      const queueChanged =
        prevScene &&
        prevScene.chatpane.pendingQueue.join(",") !==
          scene.chatpane.pendingQueue.join(",");
      const connChanged =
        prevScene && prevScene.chatpane.connection !== scene.chatpane.connection;
      const modeChanged =
        prevScene && prevScene.chatpane.mode !== scene.chatpane.mode;
      const typingChanged =
        prevScene &&
        prevScene.typingUsers.join(",") !== scene.typingUsers.join(",");
      return [
        {
          kind: "state",
          entries: [
            {
              key: "messages",
              value: `Message[${scene.messages.length}]`,
              valueType: "ref",
              changed: !!msgChanged,
            },
            {
              key: "pendingQueue",
              value:
                scene.chatpane.pendingQueue.length === 0
                  ? "[]"
                  : `[${scene.chatpane.pendingQueue.map((c) => `"${c}"`).join(", ")}]`,
              valueType: "ref",
              changed: !!queueChanged,
            },
            {
              key: "connection",
              value: `"${scene.chatpane.connection}"`,
              valueType: "string",
              changed: !!connChanged,
            },
            {
              key: "typingUsers",
              value: `[${scene.typingUsers.map((u) => `"${u}"`).join(", ")}]`,
              valueType: "ref",
              changed: !!typingChanged,
            },
            {
              key: "mode",
              value: `"${scene.chatpane.mode}"`,
              valueType: "string",
              changed: !!modeChanged,
            },
          ],
        },
      ];
    }

    case "statusbar": {
      const changed =
        prevScene && prevScene.chatpane.connection !== scene.chatpane.connection;
      return [
        {
          kind: "props",
          entries: [
            {
              key: "connection",
              value: `"${scene.chatpane.connection}"`,
              valueType: "string",
              source: "ChatPane",
              changed: !!changed,
            },
          ],
        },
      ];
    }

    case "messagelist": {
      const msgChanged =
        prevScene && prevScene.messages.length !== scene.messages.length;
      const activeChanged =
        prevScene && prevScene.activeMessageId !== scene.activeMessageId;
      const typingChanged =
        prevScene &&
        prevScene.typingUsers.join(",") !== scene.typingUsers.join(",");
      return [
        {
          kind: "props",
          entries: [
            {
              key: "messages",
              value: `Message[${scene.messages.length}]`,
              valueType: "ref",
              source: "ChatPane",
              changed: !!msgChanged,
            },
            {
              key: "activeMessageId",
              value: scene.activeMessageId ? `"${scene.activeMessageId}"` : "null",
              valueType: scene.activeMessageId ? "string" : "ref",
              source: "ChatPane",
              changed: !!activeChanged,
            },
            {
              key: "typingUsers",
              value: `[${scene.typingUsers.map((u) => `"${u}"`).join(", ")}]`,
              valueType: "ref",
              source: "ChatPane",
              changed: !!typingChanged,
            },
          ],
        },
      ];
    }

    case "messagebubble": {
      const active = scene.messages.find((m) => m.id === scene.activeMessageId);
      if (!active) {
        return [
          {
            kind: "props",
            entries: [
              { key: "—", value: "no active bubble", valueType: "ref" },
            ],
          },
        ];
      }
      const prevActive = prevScene?.messages.find(
        (m) => m.id === prevScene?.activeMessageId,
      );
      return [
        {
          kind: "props",
          entries: [
            { key: "id", value: `"${active.id}"`, valueType: "string" },
            { key: "author", value: `"${active.author}"`, valueType: "string" },
            { key: "text", value: `"${active.text}"`, valueType: "string" },
            {
              key: "status",
              value: `"${active.status ?? "—"}"`,
              valueType: "string",
              changed: prevActive?.status !== active.status,
            },
            { key: "time", value: `"${active.time}"`, valueType: "string" },
          ],
        },
      ];
    }

    case "composebar": {
      const textChanged =
        prevScene && prevScene.composeText !== scene.composeText;
      const focusChanged =
        prevScene && prevScene.composeFocused !== scene.composeFocused;
      return [
        {
          kind: "state",
          entries: [
            {
              key: "text",
              value: `"${scene.composeText}"`,
              valueType: "string",
              changed: !!textChanged,
            },
            {
              key: "focused",
              value: String(scene.composeFocused),
              valueType: "boolean",
              changed: !!focusChanged,
            },
            { key: "debounce", value: "null", valueType: "ref" },
          ],
        },
        {
          kind: "events",
          entries: [
            {
              key: "onSend",
              value: "(content: string) => void",
              valueType: "fn",
              source: "ChatPane",
            },
          ],
        },
      ];
    }

    default:
      return [];
  }
}

export interface BridgeEvent {
  id: string;
  type: string;
  from: string;
  to: string;
  payload: string;
  timestamp: number;
}

export type BridgeHandler = (event: BridgeEvent) => void;

export class IframeBridge {
  private handlers = new Set<BridgeHandler>();
  private messageCounter = 0;

  /**
   * Subscribe to event bus messages
   */
  public subscribe(handler: BridgeHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Dispatches an event to all subscribers, validating its structure
   */
  public dispatch(msg: Omit<BridgeEvent, "id" | "timestamp">): BridgeEvent {
    // Basic validation of payload JSON if necessary
    if (msg.payload && typeof msg.payload === "string") {
      try {
        JSON.parse(msg.payload);
      } catch (e) {
        // Log warning but allow dispatching as plain string if that fails
      }
    }

    this.messageCounter++;
    const event: BridgeEvent = {
      ...msg,
      id: `evt-${this.messageCounter}`,
      timestamp: Date.now(),
    };

    // Trigger subscribers
    this.handlers.forEach(h => {
      try {
        h(event);
      } catch (e) {
        console.error("Error in bridge subscriber handler:", e);
      }
    });

    return event;
  }

  /**
   * Formats a postMessage payload safely
   */
  public formatPostMessage(type: string, payload: any): string {
    return JSON.stringify({
      type,
      payload,
      sentAt: Date.now(),
    });
  }

  /**
   * Parses a safe postMessage event
   */
  public parsePostMessage(data: string): { type: string; payload: any } | null {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.type === "string") {
        return parsed;
      }
    } catch {
      // not a JSON bridge message
    }
    return null;
  }
}

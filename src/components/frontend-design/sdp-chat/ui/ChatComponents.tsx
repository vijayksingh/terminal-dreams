import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION, SPRING } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useChat } from "../chat-context";
import { avatarColor } from "../engine/chat-helpers";
import type { ChatMessage } from "../chat-context";
import styles from "../ChatLab.module.css";

export function PersistentChat() {
  const {
    visibleMessages,
    isActive,
    connectionState,
    typingUsers,
    sendMessage,
    pendingMessages,
    lastReadIndex,
    activeEmoji,
    toggleReaction,
    autoScrollEnabled,
    debounceMs,
  } = useChat();
  const rm = usePrefersReducedMotion();

  const showDelivery = isActive("deliveryStatus");
  const showTyping = isActive("typingIndicator");
  const showSend = isActive("sendMessage");
  const showReactions = isActive("reactions");
  const showReadReceipts = isActive("readReceipts");
  const showEncryption = isActive("encryption");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const [ownKeystrokeCount, setOwnKeystrokeCount] = useState(0);
  const [ownEmitCount, setOwnEmitCount] = useState(0);
  const [ownIsTyping, setOwnIsTyping] = useState(false);
  const ownTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ownTypingTimerRef.current) clearTimeout(ownTypingTimerRef.current);
    };
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (showTyping && value.length > 0) {
      setOwnKeystrokeCount(c => c + 1);
      setOwnIsTyping(true);
      if (ownTypingTimerRef.current) clearTimeout(ownTypingTimerRef.current);
      ownTypingTimerRef.current = setTimeout(() => {
        setOwnIsTyping(false);
        setOwnEmitCount(c => c + 1);
      }, debounceMs);
    } else if (value.length === 0) {
      setOwnIsTyping(false);
    }
  }, [showTyping, debounceMs]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !showSend) return;
    sendMessage(inputValue.trim());
    setInputValue("");
    setOwnIsTyping(false);
    setOwnKeystrokeCount(0);
    setOwnEmitCount(0);
  }, [inputValue, showSend, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  useEffect(() => {
    if (autoScrollEnabled) {
      chatEndRef.current?.scrollIntoView({ behavior: rm ? "instant" : "smooth" });
    }
  }, [visibleMessages.length, autoScrollEnabled, rm]);

  const isGroupStart = useCallback((msg: ChatMessage) => {
    return !msg.isGrouped;
  }, []);

  const msgTransition = rm ? { duration: 0 } : SPRING.snappy;

  return (
    <div className={styles.chatContainer} role="log" aria-label="Chat messages" data-reduced-motion={rm ? "true" : undefined}>
      <AnimatePresence>
        {connectionState !== "connected" && (
          <motion.div
            key="connection-bar"
            className={styles.connectionBar}
            data-state={connectionState}
            initial={rm ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={rm ? {} : { height: 0, opacity: 0 }}
            transition={rm ? { duration: 0 } : TRANSITION.enterItem}
            role="alert"
          >
            {connectionState === "disconnected" ? "Disconnected — reconnecting..." : "Connecting..."}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.messageScroll} role="region" aria-label="Message history">
        <AnimatePresence initial={false}>
          {visibleMessages.map((msg, idx) => {
            const groupStart = isGroupStart(msg);
            const isPending = pendingMessages.some(p => p.id === msg.id);
            const isRead = showReadReceipts && lastReadIndex >= 0 && idx <= lastReadIndex;

            return (
              <motion.div
                key={msg.id}
                className={styles.messageRow}
                data-own={msg.isOwn ? "true" : undefined}
                data-group-start={groupStart ? "true" : undefined}
                initial={rm ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={rm ? {} : { opacity: 0, y: -8 }}
                transition={idx < 3 && !rm ? { ...msgTransition, delay: idx * 0.03 } : msgTransition}
              >
                {!msg.isOwn && groupStart && (
                  <div
                    className={styles.msgAvatar}
                    style={{ background: avatarColor(msg.avatarHue) }}
                    aria-hidden="true"
                  >
                    {msg.author[0]}
                  </div>
                )}
                {!msg.isOwn && !groupStart && <div className={styles.msgAvatarSpacer} />}

                <div className={styles.msgBubbleWrap}>
                  {!msg.isOwn && groupStart && (
                    <span className={styles.msgAuthor} style={{ color: avatarColor(msg.avatarHue) }}>
                      {msg.author}
                    </span>
                  )}

                  <div className={styles.msgBubbleRow}>
                    <div
                      className={styles.msgBubble}
                      data-own={msg.isOwn ? "true" : undefined}
                      data-pending={isPending ? "true" : undefined}
                    >
                      {showEncryption && (
                        <span className={styles.msgLock} aria-label="Encrypted">🔒</span>
                      )}
                      <span className={styles.msgContent}>{msg.content}</span>
                      <span className={styles.msgTime}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.isOwn && showDelivery && (
                          <span className={styles.msgStatus} data-read={isRead ? "true" : undefined}>
                            {msg.status === "sending" && " ◌"}
                            {msg.status === "sent" && " ✓"}
                            {msg.status === "delivered" && " ✓✓"}
                            {msg.status === "read" && " ✓✓"}
                          </span>
                        )}
                      </span>
                    </div>
                    {showReactions && (
                      <button
                        type="button"
                        className={styles.msgReactTrigger}
                        onClick={() => toggleReaction(msg.id, activeEmoji)}
                        aria-label={`React with ${activeEmoji} to "${msg.content.slice(0, 30)}"`}
                      >
                        {activeEmoji}
                      </button>
                    )}
                  </div>

                  {showReactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={styles.msgReactions}>
                      {Object.entries(msg.reactions).map(([emoji, count]) =>
                        count > 0 ? (
                          <button
                            key={emoji}
                            type="button"
                            className={styles.msgReactionBadge}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            aria-label={`${emoji} ${count} reactions`}
                          >
                            {emoji} {count}
                          </button>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {showTyping && typingUsers.length > 0 && (
          <motion.div
            className={styles.typingIndicator}
            initial={rm ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={rm ? {} : { opacity: 0, y: -4 }}
            transition={rm ? { duration: 0 } : TRANSITION.enterItem}
            aria-live="polite"
          >
            <div className={styles.typingDots} aria-hidden="true">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
            <span className={styles.typingText}>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className={styles.composeBar} data-disabled={!showSend ? "true" : undefined}>
        <input
          type="text"
          className={styles.composeInput}
          placeholder={showSend ? "Type a message..." : "Enable Send Message (step 6) to type"}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!showSend}
          maxLength={500}
          aria-label="Message input"
        />
        <button
          type="button"
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!showSend || !inputValue.trim()}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {showTyping && ownKeystrokeCount > 0 && (
        <div className={styles.ownTypingFeedback} aria-live="polite">
          <span className={styles.ownTypingIndicator} data-typing={ownIsTyping ? "true" : undefined}>
            {ownIsTyping ? "typing..." : "idle"}
          </span>
          <span className={styles.ownTypingStats}>
            {ownKeystrokeCount} keystrokes → {ownEmitCount} WS emits ({debounceMs}ms debounce)
          </span>
        </div>
      )}
    </div>
  );
}

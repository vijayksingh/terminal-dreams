"use client";

import { motion } from "framer-motion";
import { useSound } from "@/hooks/use-sound";

/**
 * Sound toggle button for cookbook
 * Shows mute/unmute state with icon animation
 */
export function SoundToggle() {
  const { isMuted, toggleMute } = useSound();

  return (
    <motion.button
      onClick={toggleMute}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/30 transition-colors"
      whileTap={{ scale: 0.95 }}
      aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
      title={isMuted ? "Unmute sounds" : "Mute sounds"}
    >
      {isMuted ? (
        // Muted icon (speaker with X)
        <svg
          className="w-5 h-5 text-[var(--color-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        // Unmuted icon (speaker with waves)
        <motion.svg
          className="w-5 h-5 text-[var(--color-accent)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.3 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </motion.svg>
      )}
    </motion.button>
  );
}

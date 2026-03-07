"use client";

import { useCallback, useEffect, useState } from "react";
import { soundManager, type SoundName } from "@/lib/sound-manager";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * Hook for playing cookbook sounds
 * Respects mute state and prefers-reduced-motion
 */
export function useSound() {
  const [isMuted, setIsMuted] = useState(soundManager.isMutedState());
  const prefersReducedMotion = usePrefersReducedMotion();

  // Sync mute state on mount
  useEffect(() => {
    setIsMuted(soundManager.isMutedState());
  }, []);

  /**
   * Play a sound with optional volume override
   * Respects prefers-reduced-motion by reducing frequency (not implemented here, caller decides)
   */
  const play = useCallback(
    (soundName: SoundName, volume?: number) => {
      if (!isMuted) {
        soundManager.play(soundName, volume);
      }
    },
    [isMuted]
  );

  /**
   * Toggle mute state
   */
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    soundManager.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  /**
   * Set mute state explicitly
   */
  const setMute = useCallback((muted: boolean) => {
    soundManager.setMuted(muted);
    setIsMuted(muted);
  }, []);

  return {
    play,
    isMuted,
    toggleMute,
    setMute,
    prefersReducedMotion,
  };
}

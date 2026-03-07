/**
 * Sound Manager for Cookbook
 *
 * Handles sound loading, playback, and mute state using Web Audio API
 * Sounds are primarily synthesized to avoid large asset files
 */

const MUTE_STORAGE_KEY = "cookbook-sound-muted";

export type SoundName =
  | "page-turn"
  | "knife-tap"
  | "match-strike"
  | "ceramic-clink"
  | "whoosh"
  | "bell-ding"
  | "sizzle-chime"
  | "celebration"
  | "knife-chop";

type SoundCache = {
  [K in SoundName]?: AudioBuffer;
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundCache: SoundCache = {};
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Initialize audio context lazily (after user interaction)
      this.isMuted = localStorage.getItem(MUTE_STORAGE_KEY) === "true";
    }
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      // Support for webkit-prefixed AudioContext in older browsers
      const AudioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextConstructor();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
    }
    return this.audioContext;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    }
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  /**
   * Get current mute state
   */
  isMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * Play a sound by name
   */
  async play(soundName: SoundName, volume: number = 1) {
    if (this.isMuted) return;

    try {
      const context = this.ensureAudioContext();

      // Get or generate the sound
      let buffer = this.soundCache[soundName];
      if (!buffer) {
        buffer = await this.generateSound(soundName, context);
        this.soundCache[soundName] = buffer;
      }

      // Create source and play
      const source = context.createBufferSource();
      source.buffer = buffer;

      const gainNode = context.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.masterGain!);

      source.start(0);
    } catch (error) {
      console.warn("Sound playback failed:", error);
    }
  }

  /**
   * Generate sounds using Web Audio API
   */
  private async generateSound(soundName: SoundName, context: AudioContext): Promise<AudioBuffer> {
    const sampleRate = context.sampleRate;

    switch (soundName) {
      case "page-turn":
        return this.generatePageTurn(context, sampleRate);
      case "knife-tap":
        return this.generateKnifeTap(context, sampleRate);
      case "match-strike":
        return this.generateMatchStrike(context, sampleRate);
      case "ceramic-clink":
        return this.generateCeramicClink(context, sampleRate);
      case "whoosh":
        return this.generateWhoosh(context, sampleRate);
      case "bell-ding":
        return this.generateBellDing(context, sampleRate);
      case "sizzle-chime":
        return this.generateSizzleChime(context, sampleRate);
      case "celebration":
        return this.generateCelebration(context, sampleRate);
      case "knife-chop":
        return this.generateKnifeChop(context, sampleRate);
      default:
        return this.generateSilence(context);
    }
  }

  /**
   * Generate page turn sound (soft swoosh + paper rustle)
   */
  private generatePageTurn(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 0.3;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Filtered noise for paper rustle
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 8);
      // Low frequency swoosh
      const swoosh = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 6);
      data[i] = (noise * 0.2 + swoosh * 0.3) * 0.5;
    }

    return buffer;
  }

  /**
   * Generate knife tap sound (short percussive click)
   */
  private generateKnifeTap(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 0.08;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Sharp metallic tap
      const tap = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 50);
      const tap2 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 40);
      data[i] = (tap + tap2 * 0.5) * 0.4;
    }

    return buffer;
  }

  /**
   * Generate match strike sound (scratch + ignite)
   */
  private generateMatchStrike(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 0.4;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Scratchy noise for strike
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 12);
      // Quick burst for ignition
      const burst = Math.sin(2 * Math.PI * 500 * t) * Math.exp(-Math.max(0, t - 0.15) * 20);
      data[i] = (noise * 0.3 + burst * 0.2) * 0.6;
    }

    return buffer;
  }

  /**
   * Generate ceramic clink sound (bright tap)
   */
  private generateCeramicClink(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 0.15;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Multiple harmonics for ceramic resonance
      const freq1 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 15);
      const freq2 = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 12);
      const freq3 = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 10);
      data[i] = (freq1 + freq2 * 0.6 + freq3 * 0.4) * 0.3;
    }

    return buffer;
  }

  /**
   * Generate whoosh sound (air movement)
   */
  private generateWhoosh(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 0.4;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Filtered noise with envelope
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 5);
      const envelope = Math.sin(Math.PI * t / duration);
      data[i] = noise * envelope * 0.4;
    }

    return buffer;
  }

  /**
   * Generate bell ding sound (warm chime)
   */
  private generateBellDing(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 1.5;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Bell harmonics (multiple partials)
      const fundamental = Math.sin(2 * Math.PI * 523 * t); // C5
      const partial2 = Math.sin(2 * Math.PI * 784 * t) * 0.6; // G5
      const partial3 = Math.sin(2 * Math.PI * 1047 * t) * 0.4; // C6
      const envelope = Math.exp(-t * 2);
      data[i] = (fundamental + partial2 + partial3) * envelope * 0.4;
    }

    return buffer;
  }

  /**
   * Generate sizzle chime sound (sizzle + bell)
   */
  private generateSizzleChime(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 1.0;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Sizzle (filtered noise)
      const sizzle = (Math.random() * 2 - 1) * Math.exp(-t * 4);
      // Chime
      const chime = Math.sin(2 * Math.PI * 659 * t) * Math.exp(-t * 3); // E5
      const chime2 = Math.sin(2 * Math.PI * 988 * t) * Math.exp(-t * 2.5); // B5
      data[i] = (sizzle * 0.2 + chime * 0.4 + chime2 * 0.3) * 0.5;
    }

    return buffer;
  }

  /**
   * Generate celebration sound (layered chimes)
   */
  private generateCelebration(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 2.0;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Major chord (C, E, G, C)
    const frequencies = [523, 659, 784, 1047];

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Layered chimes with staggered timing
      frequencies.forEach((freq, idx) => {
        const delay = idx * 0.15;
        if (t > delay) {
          const adjustedT = t - delay;
          sample += Math.sin(2 * Math.PI * freq * adjustedT) * Math.exp(-adjustedT * 2);
        }
      });

      // Add sparkle noise
      const sparkle = (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.1;
      data[i] = (sample + sparkle) * 0.3;
    }

    return buffer;
  }

  /**
   * Generate knife chop sequence (ta-ta-ta-tat)
   */
  private generateKnifeChop(context: AudioContext, sampleRate: number): AudioBuffer {
    const duration = 0.6;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    const chopTimes = [0, 0.15, 0.3, 0.4]; // Four chops, last one faster

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      chopTimes.forEach((chopTime) => {
        if (t >= chopTime && t < chopTime + 0.08) {
          const localT = t - chopTime;
          // Percussive chop sound
          const chop = Math.sin(2 * Math.PI * 600 * localT) * Math.exp(-localT * 40);
          const woodTone = Math.sin(2 * Math.PI * 200 * localT) * Math.exp(-localT * 30);
          sample += (chop + woodTone * 0.5) * 0.4;
        }
      });

      data[i] = sample;
    }

    return buffer;
  }

  /**
   * Generate silence (fallback)
   */
  private generateSilence(context: AudioContext): AudioBuffer {
    return context.createBuffer(1, context.sampleRate * 0.1, context.sampleRate);
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

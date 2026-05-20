"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────

export type Phase = "planning" | "building";

export type QualityLevel = {
  label: string;
  bitrate: number;
  resolution: string;
};

export type BufferSegment = {
  id: string;
  quality: string;
  startTime: number;
  duration: number;
  loaded: boolean;
};

export type ABRMode = "manual" | "throughput" | "buffer-based" | "hybrid";

export type NetworkCondition = "excellent" | "good" | "poor" | "offline";

export type StreamMetrics = {
  currentQuality: string;
  bufferLevel: number;
  bandwidth: number;
  droppedFrames: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

export type ApiEndpoint = {
  method: "GET" | "POST" | "PUT";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export type TypeField = {
  name: string;
  type: string;
  note?: string;
};

export type TypeDef = {
  name: string;
  category: "api" | "state" | "props";
  extends?: string;
  fields: TypeField[];
};

// ── Constants ───────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const QUALITY_LEVELS: QualityLevel[] = [
  { label: "144p", bitrate: 200, resolution: "256x144" },
  { label: "360p", bitrate: 800, resolution: "640x360" },
  { label: "720p", bitrate: 2500, resolution: "1280x720" },
  { label: "1080p", bitrate: 5000, resolution: "1920x1080" },
  { label: "4K", bitrate: 15000, resolution: "3840x2160" },
];

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "abr-algorithm", label: "ABR algorithm", description: "Adaptive bitrate selection based on network and buffer conditions" },
  { id: "buffer-management", label: "Buffer management", description: "Segment queue, underrun detection, and health monitoring" },
  { id: "quality-levels", label: "Quality levels", description: "Multiple resolutions from 144p to 4K with bitrate ladder" },
  { id: "bandwidth-detection", label: "Bandwidth detection", description: "EWMA-based throughput estimation from download samples" },
  { id: "segment-prefetching", label: "Segment prefetching", description: "Look-ahead fetching to maintain buffer health during playback" },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/manifest/:videoId",
    description: "Fetch video manifest with available quality levels and segment info",
    usedBy: "Player UI -> ABR Controller",
    params: [
      { name: "videoId", type: "string", note: "unique video identifier" },
    ],
    responseType: "VideoManifest",
  },
  {
    method: "GET",
    path: "/segment/:quality/:index",
    description: "Fetch a specific segment at a given quality level",
    usedBy: "Segment Fetcher -> CDN",
    params: [
      { name: "quality", type: "string", note: "quality label (e.g. 720p)" },
      { name: "index", type: "number", note: "segment index in timeline" },
    ],
    responseType: "ArrayBuffer",
  },
  {
    method: "POST",
    path: "/analytics/bandwidth",
    description: "Report bandwidth measurement samples for analytics",
    usedBy: "Bandwidth Estimator -> Analytics",
    params: [
      { name: "samples", type: "BandwidthSample[]", note: "recent measurements" },
      { name: "sessionId", type: "string", note: "player session" },
    ],
    responseType: "{ received: boolean }",
  },
  {
    method: "GET",
    path: "/stream/live/:channelId",
    description: "Get live stream manifest with sliding window of segments",
    usedBy: "Player UI -> Live Edge Tracker",
    params: [
      { name: "channelId", type: "string", note: "live channel identifier" },
    ],
    responseType: "LiveManifest",
  },
  {
    method: "PUT",
    path: "/player/preferences",
    description: "Update player quality and buffering preferences",
    usedBy: "Player UI -> Settings",
    params: [
      { name: "maxQuality", type: "string?", note: "cap quality level" },
      { name: "preferLowLatency", type: "boolean?", note: "for live streams" },
      { name: "autoplay", type: "boolean?", note: "auto-start playback" },
    ],
    responseType: "PlayerPreferences",
  },
];

export const DATA_MODELS: TypeDef[] = [
  {
    name: "VideoManifest",
    category: "api",
    fields: [
      { name: "videoId", type: "string" },
      { name: "title", type: "string", note: "display title" },
      { name: "qualities", type: "QualityLevel[]", note: "bitrate ladder" },
      { name: "segmentDuration", type: "number", note: "seconds per segment" },
      { name: "totalDuration", type: "number", note: "total video length" },
      { name: "totalSegments", type: "number" },
    ],
  },
  {
    name: "Segment",
    category: "api",
    fields: [
      { name: "index", type: "number" },
      { name: "quality", type: "string", note: "quality label" },
      { name: "url", type: "string", note: "CDN URL" },
      { name: "byteSize", type: "number", note: "bytes" },
      { name: "duration", type: "number", note: "seconds" },
      { name: "startTime", type: "number", note: "timeline offset" },
    ],
  },
  {
    name: "BandwidthSample",
    category: "state",
    fields: [
      { name: "timestamp", type: "number", note: "ms since epoch" },
      { name: "bytesTransferred", type: "number" },
      { name: "durationMs", type: "number", note: "download time" },
      { name: "throughputKbps", type: "number", note: "computed kbps" },
    ],
  },
  {
    name: "PlayerState",
    category: "state",
    fields: [
      { name: "currentTime", type: "number", note: "playhead position" },
      { name: "bufferLevel", type: "number", note: "seconds buffered" },
      { name: "currentQuality", type: "string" },
      { name: "isPlaying", type: "boolean" },
      { name: "isBuffering", type: "boolean" },
      { name: "droppedFrames", type: "number" },
      { name: "abrMode", type: "ABRMode" },
    ],
  },
];

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  return "building";
}

// ── Context ─────────────────────────────────────────────────

type VideoStreamingContextValue = {
  activeStep: number;
  phase: Phase;

  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  currentQuality: string;
  setCurrentQuality: (q: string) => void;
  bufferLevel: number;
  setBufferLevel: (l: number) => void;
  bandwidth: number;
  setBandwidth: (b: number) => void;
  abrMode: ABRMode;
  setAbrMode: (m: ABRMode) => void;
  networkCondition: NetworkCondition;
  setNetworkCondition: (c: NetworkCondition) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;

  droppedFrames: number;
  totalSegments: number;
  bufferUnderruns: number;
  incrementSegments: () => void;
  incrementDropped: () => void;
  incrementUnderruns: () => void;

  completedSteps: Set<number>;
  markStepComplete: (step: number) => void;

  stateEntries: StateEntry[];
};

const VideoStreamingContext = createContext<VideoStreamingContextValue | null>(null);

export function useVideoStreaming() {
  const ctx = useContext(VideoStreamingContext);
  if (!ctx) throw new Error("useVideoStreaming must be within VideoStreamingProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────

export function VideoStreamingProvider({ activeStep, children }: { activeStep: number; children: ReactNode }) {
  const phase = getPhase(activeStep);

  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(
    new Set(["abr-algorithm", "buffer-management", "quality-levels"])
  );
  const toggleScope = useCallback((id: string) => {
    setScopeEnabled(s => {
      const n = new Set(s);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }, []);

  const [currentQuality, setCurrentQuality] = useState("720p");
  const [bufferLevel, setBufferLevel] = useState(5);
  const [bandwidth, setBandwidth] = useState(3000);
  const [abrMode, setAbrMode] = useState<ABRMode>("manual");
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition>("good");
  const [isPlaying, setIsPlaying] = useState(false);

  const [droppedFrames, setDroppedFrames] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [bufferUnderruns, setBufferUnderruns] = useState(0);

  const incrementSegments = useCallback(() => setTotalSegments(s => s + 1), []);
  const incrementDropped = useCallback(() => setDroppedFrames(d => d + 1), []);
  const incrementUnderruns = useCallback(() => setBufferUnderruns(u => u + 1), []);

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps(s => {
      if (s.has(step)) return s;
      const n = new Set(s);
      n.add(step);
      return n;
    });
  }, []);

  const stateEntries: StateEntry[] = useMemo(() => {
    const e: StateEntry[] = [
      { label: "step", value: activeStep },
      { label: "phase", value: phase },
      { label: "quality", value: currentQuality },
      { label: "bufferLevel", value: `${bufferLevel.toFixed(1)}s` },
      { label: "bandwidth", value: `${bandwidth} kbps` },
      { label: "abrMode", value: abrMode },
      { label: "network", value: networkCondition },
      { label: "playing", value: isPlaying },
    ];
    if (totalSegments > 0) e.push({ label: "segments", value: totalSegments });
    if (droppedFrames > 0) e.push({ label: "dropped", value: droppedFrames, highlight: true });
    if (bufferUnderruns > 0) e.push({ label: "underruns", value: bufferUnderruns, highlight: true });
    return e;
  }, [activeStep, phase, currentQuality, bufferLevel, bandwidth, abrMode, networkCondition, isPlaying, totalSegments, droppedFrames, bufferUnderruns]);

  const value: VideoStreamingContextValue = useMemo(() => ({
    activeStep, phase,
    scopeEnabled, toggleScope,
    currentQuality, setCurrentQuality,
    bufferLevel, setBufferLevel,
    bandwidth, setBandwidth,
    abrMode, setAbrMode,
    networkCondition, setNetworkCondition,
    isPlaying, setIsPlaying,
    droppedFrames, totalSegments, bufferUnderruns,
    incrementSegments, incrementDropped, incrementUnderruns,
    completedSteps, markStepComplete,
    stateEntries,
  }), [
    activeStep, phase,
    scopeEnabled, toggleScope,
    currentQuality, setCurrentQuality,
    bufferLevel, setBufferLevel,
    bandwidth, setBandwidth,
    abrMode, setAbrMode,
    networkCondition, setNetworkCondition,
    isPlaying, setIsPlaying,
    droppedFrames, totalSegments, bufferUnderruns,
    incrementSegments, incrementDropped, incrementUnderruns,
    completedSteps, markStepComplete,
    stateEntries,
  ]);

  return (
    <VideoStreamingContext.Provider value={value}>
      {children}
    </VideoStreamingContext.Provider>
  );
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StateEntry } from "@/components/recipe-lab/StateInspector";

// ── Types ───────────────────────────────────────────────────────────

export type Phase = "planning" | "building" | "optimizing" | "polishing" | "production";

export type LayoutMode = "uniform" | "css-columns" | "css-grid";
export type DeviceType = "mobile" | "tablet" | "desktop";
export type ImageFormat = "jpeg" | "webp" | "avif";

export type GalleryImage = {
  id: string;
  index: number;
  hue: number;
  width: number;
  height: number;
  aspectRatio: number;
};

export type ScopeItem = {
  id: string;
  label: string;
  description: string;
};

// ── Constants ───────────────────────────────────────────────────────

export const TOTAL_STEPS = 15;

export const SCOPE_ITEMS: ScopeItem[] = [
  { id: "layout", label: "Masonry or uniform grid?", description: "Masonry preserves aspect ratios but adds complexity" },
  { id: "upload", label: "Upload support?", description: "Adds drag-and-drop, progress bars, validation" },
  { id: "scale", label: "Scale: 100s vs 100Ks?", description: "Virtualization and pagination strategy depends on this" },
  { id: "mobile", label: "Mobile support?", description: "Touch gestures, responsive breakpoints, bandwidth" },
  { id: "search", label: "Search and filtering?", description: "Tag system, full-text search, filter UI" },
];

export const COMPONENT_TREE = `App
└─ Gallery
   ├─ Grid (masonry layout)
   │  └─ ImageCard[] (lazy loaded)
   ├─ Lightbox (modal overlay)
   └─ Pagination (cursor-based)`;

export const API_RESPONSE = {
  images: [
    {
      id: "abc",
      src: "/photos/abc-1200.webp",
      thumb: "/photos/abc-200.webp",
      width: 800,
      height: 600,
      alt: "Mountain landscape at sunset",
      blurhash: "LEHV6nWB2y...",
    },
  ],
  nextCursor: "eyJpZCI6MTIzfQ==",
};

// ── API Endpoints ──────────────────────────────────────────────────

export type ApiEndpoint = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
  usedBy: string;
  params: { name: string; type: string; note: string }[];
  responseType: string;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/gallery",
    description: "Paginated image list for the grid",
    usedBy: "Gallery → Grid",
    params: [
      { name: "cursor", type: "string?", note: "opaque pagination token" },
      { name: "limit", type: "number", note: "default 50, max 200" },
      { name: "sort", type: "string?", note: "created_at | name" },
    ],
    responseType: "GalleryListResponse",
  },
  {
    method: "GET",
    path: "/api/gallery/:id",
    description: "Full image detail with all resolutions",
    usedBy: "Gallery → Lightbox",
    params: [
      { name: "id", type: "string", note: "image identifier" },
    ],
    responseType: "ImageDetailResponse",
  },
  {
    method: "GET",
    path: "/api/gallery/dimensions",
    description: "Batch dimensions for masonry pre-computation",
    usedBy: "Gallery → Grid (masonry)",
    params: [
      { name: "ids", type: "string[]", note: "image IDs" },
      { name: "viewport", type: "number", note: "client viewport width" },
    ],
    responseType: "DimensionsResponse",
  },
  {
    method: "GET",
    path: "/api/gallery/srcset/:id",
    description: "Responsive image variants for a given image",
    usedBy: "Lightbox → <picture>",
    params: [
      { name: "id", type: "string", note: "image identifier" },
      { name: "formats", type: "string[]?", note: "jpeg, webp, avif" },
    ],
    responseType: "SrcSetResponse",
  },
];

// ── Data Models (used by Step 2's "Types" tab) ────────────────────

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

export const DATA_MODELS: TypeDef[] = [
  {
    name: "ImageSummary",
    category: "api",
    fields: [
      { name: "id", type: "string" },
      { name: "thumb", type: "string", note: "200px thumbnail URL" },
      { name: "width", type: "number", note: "intrinsic px" },
      { name: "height", type: "number", note: "intrinsic px" },
      { name: "alt", type: "string", note: "accessible description" },
      { name: "blurhash", type: "string", note: "4×3 compact placeholder" },
      { name: "dominantColor", type: "string", note: "CSS fallback" },
    ],
  },
  {
    name: "ImageDetail",
    category: "api",
    extends: "ImageSummary",
    fields: [
      { name: "src", type: "string", note: "full-resolution URL" },
      { name: "srcSet", type: "SrcSetEntry[]", note: "responsive variants" },
      { name: "exif", type: "ExifData?", note: "camera metadata" },
      { name: "createdAt", type: "number", note: "unix ms" },
    ],
  },
  {
    name: "SrcSetEntry",
    category: "api",
    fields: [
      { name: "url", type: "string" },
      { name: "width", type: "number", note: "px" },
      { name: "format", type: "'jpeg' | 'webp' | 'avif'" },
    ],
  },
];

export const RESPONSIVE_DATA: Record<DeviceType, Record<ImageFormat, { sizeKB: number; decodeMs: number }>> = {
  mobile: {
    jpeg: { sizeKB: 45, decodeMs: 12 },
    webp: { sizeKB: 28, decodeMs: 8 },
    avif: { sizeKB: 18, decodeMs: 15 },
  },
  tablet: {
    jpeg: { sizeKB: 120, decodeMs: 25 },
    webp: { sizeKB: 75, decodeMs: 18 },
    avif: { sizeKB: 48, decodeMs: 28 },
  },
  desktop: {
    jpeg: { sizeKB: 280, decodeMs: 45 },
    webp: { sizeKB: 165, decodeMs: 32 },
    avif: { sizeKB: 95, decodeMs: 52 },
  },
};

// ── Phase + feature computation ─────────────────────────────────────

export function getPhase(step: number): Phase {
  if (step <= 3) return "planning";
  if (step <= 7) return "building";
  if (step <= 10) return "optimizing";
  if (step <= 13) return "polishing";
  return "production";
}

const FEATURE_UNLOCK: Record<string, number> = {
  reserveSpace: 6,
  masonry: 7,
  lazyLoading: 8,
  placeholders: 9,
  virtualization: 10,
  responsive: 11,
  lightbox: 12,
  focusTrap: 13,
  errorHandling: 14,
};

function isFeatureActive(feature: string, step: number, toggled: boolean): boolean {
  const unlock = FEATURE_UNLOCK[feature];
  if (!unlock) return false;
  if (step > unlock) return true;
  if (step === unlock) return toggled;
  return false;
}

// ── Image generation ────────────────────────────────────────────────

function generateImages(count: number): GalleryImage[] {
  const images: GalleryImage[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 37 + 15) % 360;
    const widthBase = 150 + ((i * 73) % 100);
    const heightBase = 100 + ((i * 51) % 150);
    images.push({
      id: `img-${i}`,
      index: i,
      hue,
      width: widthBase,
      height: heightBase,
      aspectRatio: widthBase / heightBase,
    });
  }
  return images;
}

// ── Context shape ───────────────────────────────────────────────────

type GalleryContextValue = {
  activeStep: number;
  phase: Phase;

  // Step 1: Requirements
  scopeEnabled: Set<string>;
  toggleScope: (id: string) => void;

  // Read-only data
  componentTree: string;
  apiResponse: typeof API_RESPONSE;

  // Gallery images
  images: GalleryImage[];
  imageCount: number;
  loadedSet: Set<string>;
  errorSet: Set<string>;

  // Feature toggles (one per step)
  featureToggled: Record<string, boolean>;
  toggleFeature: (feature: string) => void;
  isActive: (feature: string) => boolean;

  // Step 7: Layout mode
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;

  // Step 11: Responsive
  deviceType: DeviceType;
  setDeviceType: (d: DeviceType) => void;
  imageFormat: ImageFormat;
  setImageFormat: (f: ImageFormat) => void;

  // Step 12-13: Lightbox
  lightboxOpen: boolean;
  lightboxIndex: number;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  lightboxNext: () => void;
  lightboxPrev: () => void;
  focusedElement: "prev" | "next" | "close";
  setFocusedElement: (el: "prev" | "next" | "close") => void;
  a11yAnnouncement: string;

  // Step 15: Scaling
  scaleLevel: number;
  setScaleLevel: (n: number) => void;
  paginationMode: "infinite" | "pages";
  setPaginationMode: (m: "infinite" | "pages") => void;

  // Computed metrics
  metrics: {
    domNodes: number;
    networkReqs: number;
    memoryMB: number;
    cls: number;
    lcpMs: number;
  };

  // Scroll state (virtualization)
  scrollTop: number;
  setScrollTop: (v: number) => void;
  viewportHeight: number;

  // State inspector
  stateEntries: StateEntry[];
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery must be used within <GalleryProvider>");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function GalleryProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const phase = getPhase(activeStep);

  // Step 1
  const [scopeEnabled, setScopeEnabled] = useState<Set<string>>(new Set());

  // Feature toggles — each starts OFF at its unlock step, user turns it ON
  const [featureToggled, setFeatureToggled] = useState<Record<string, boolean>>({});

  const toggleFeature = useCallback((feature: string) => {
    setFeatureToggled((prev) => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  const isActive = useCallback(
    (feature: string) => isFeatureActive(feature, activeStep, !!featureToggled[feature]),
    [activeStep, featureToggled]
  );

  // Layout
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("uniform");

  // Responsive
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [imageFormat, setImageFormat] = useState<ImageFormat>("jpeg");

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [focusedElement, setFocusedElement] = useState<"prev" | "next" | "close">("close");
  const [a11yAnnouncement, setA11yAnnouncement] = useState("");

  // Scale (step 15)
  const [scaleLevel, setScaleLevel] = useState(100);
  const [paginationMode, setPaginationMode] = useState<"infinite" | "pages">("infinite");

  // Virtualization scroll
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = 280;

  // Image count depends on step
  const imageCount = useMemo(() => {
    if (activeStep <= 3) return 0;
    if (activeStep === 4) return 20;
    if (activeStep === 15) return scaleLevel;
    return 500;
  }, [activeStep, scaleLevel]);

  const images = useMemo(() => generateImages(imageCount), [imageCount]);

  // Loaded set — depends on lazy loading
  const loadedSet = useMemo(() => {
    if (imageCount === 0) return new Set<string>();
    if (!isActive("lazyLoading")) {
      return new Set(images.map((i) => i.id));
    }
    const visible = Math.min(Math.ceil(viewportHeight / 60) * 3 + 6, imageCount);
    return new Set(images.slice(0, visible).map((i) => i.id));
  }, [imageCount, images, viewportHeight, isActive]);

  // Error set — depends on error handling step
  const errorSet = useMemo(() => {
    if (!isActive("errorHandling")) return new Set<string>();
    const errors = new Set<string>();
    images.forEach((img) => {
      if (img.index % 5 === 2 || img.index % 7 === 3) {
        errors.add(img.id);
      }
    });
    return errors;
  }, [images, isActive]);

  // Reset per-step state on step transitions
  const prevStepRef = useRef(activeStep);
  useEffect(() => {
    if (prevStepRef.current !== activeStep) {
      prevStepRef.current = activeStep;
      setLightboxOpen(false);
      setA11yAnnouncement("");
      if (activeStep === 7) setLayoutMode("uniform");
      if (activeStep === 15) setScaleLevel(100);
    }
  }, [activeStep]);

  const toggleScope = useCallback((id: string) => {
    setScopeEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openLightbox = useCallback((index: number) => {
    setLightboxOpen(true);
    setLightboxIndex(index);
    setFocusedElement("close");
    setA11yAnnouncement(`Image ${index + 1} opened in lightbox`);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setA11yAnnouncement("Lightbox closed");
  }, []);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => {
      const next = Math.min(prev + 1, images.length - 1);
      setA11yAnnouncement(`Image ${next + 1} of ${images.length}`);
      return next;
    });
  }, [images.length]);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      setA11yAnnouncement(`Image ${next + 1} of ${images.length}`);
      return next;
    });
  }, [images.length]);

  // ── Metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (imageCount === 0) return { domNodes: 0, networkReqs: 0, memoryMB: 0, cls: 0, lcpMs: 0 };

    const avgKB = RESPONSIVE_DATA[deviceType][imageFormat].sizeKB;
    let domNodes = imageCount;
    let networkReqs = imageCount;
    let memoryMB = parseFloat(((imageCount * avgKB) / 1024).toFixed(1));
    let cls = imageCount > 100 ? 0.45 : 0;
    let lcpMs = imageCount > 100 ? 3200 : 800;

    if (isActive("reserveSpace")) cls = 0.08;
    if (isActive("lazyLoading")) {
      const visible = Math.min(15, imageCount);
      networkReqs = visible;
      memoryMB = parseFloat(((visible * avgKB) / 1024).toFixed(1));
      lcpMs = 900;
    }
    if (isActive("placeholders")) cls = Math.min(cls, 0.02);
    if (isActive("virtualization")) domNodes = Math.min(20, imageCount);

    return { domNodes, networkReqs, memoryMB, cls, lcpMs };
  }, [imageCount, deviceType, imageFormat, isActive]);

  // ── State inspector entries ─────────────────────────────────────
  const stateEntries = useMemo((): StateEntry[] => {
    if (activeStep <= 3) return [];
    const e: StateEntry[] = [];
    e.push({ label: "images", value: imageCount });
    e.push({ label: "DOM nodes", value: metrics.domNodes, highlight: metrics.domNodes > 50 });
    e.push({ label: "network", value: metrics.networkReqs, highlight: metrics.networkReqs > 30 });
    e.push({ label: "memory", value: `${metrics.memoryMB} MB`, highlight: metrics.memoryMB > 10 });
    e.push({ label: "CLS", value: metrics.cls, highlight: metrics.cls > 0.1 });
    e.push({ label: "LCP", value: `${metrics.lcpMs} ms`, highlight: metrics.lcpMs > 2500 });

    if (activeStep >= 7) e.push({ label: "layout", value: layoutMode });
    if (activeStep >= 8) e.push({ label: "lazy", value: isActive("lazyLoading") });
    if (activeStep >= 9) e.push({ label: "placeholders", value: isActive("placeholders") });
    if (activeStep >= 10) e.push({ label: "virtualized", value: isActive("virtualization") });

    return e;
  }, [activeStep, imageCount, metrics, layoutMode, isActive]);

  const value = useMemo(
    (): GalleryContextValue => ({
      activeStep,
      phase,
      scopeEnabled,
      toggleScope,
      componentTree: COMPONENT_TREE,
      apiResponse: API_RESPONSE,
      images,
      imageCount,
      loadedSet,
      errorSet,
      featureToggled,
      toggleFeature,
      isActive,
      layoutMode,
      setLayoutMode,
      deviceType,
      setDeviceType,
      imageFormat,
      setImageFormat,
      lightboxOpen,
      lightboxIndex,
      openLightbox,
      closeLightbox,
      lightboxNext,
      lightboxPrev,
      focusedElement,
      setFocusedElement,
      a11yAnnouncement,
      scaleLevel,
      setScaleLevel,
      paginationMode,
      setPaginationMode,
      metrics,
      scrollTop,
      setScrollTop,
      viewportHeight,
      stateEntries,
    }),
    [
      activeStep, phase,
      scopeEnabled, toggleScope,
      images, imageCount, loadedSet, errorSet,
      featureToggled, toggleFeature, isActive,
      layoutMode, deviceType, imageFormat,
      lightboxOpen, lightboxIndex, openLightbox, closeLightbox,
      lightboxNext, lightboxPrev, focusedElement, a11yAnnouncement,
      scaleLevel, paginationMode,
      metrics, scrollTop, viewportHeight, stateEntries,
    ]
  );

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  );
}

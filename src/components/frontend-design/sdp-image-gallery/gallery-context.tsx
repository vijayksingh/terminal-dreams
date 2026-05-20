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

import {
  type Phase,
  type LayoutMode,
  type DeviceType,
  type ImageFormat,
  type GalleryImage,
  type ScopeItem,
  type ApiEndpoint,
  type TypeField,
  type TypeDef,
  TOTAL_STEPS,
  SCOPE_ITEMS,
  COMPONENT_TREE,
  API_RESPONSE,
  API_ENDPOINTS,
  DATA_MODELS,
  RESPONSIVE_DATA,
  getPhase,
  isFeatureActive,
  generateImages,
  PriorityLoader,
} from "./engine/priority-loader";

export {
  type Phase,
  type LayoutMode,
  type DeviceType,
  type ImageFormat,
  type GalleryImage,
  type ScopeItem,
  type ApiEndpoint,
  type TypeField,
  type TypeDef,
  TOTAL_STEPS,
  SCOPE_ITEMS,
  COMPONENT_TREE,
  API_RESPONSE,
  API_ENDPOINTS,
  DATA_MODELS,
  RESPONSIVE_DATA,
  getPhase,
  isFeatureActive,
  generateImages,
  PriorityLoader,
};

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
  retryImage: (id: string) => void;

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

  // Image count depends on step
  const imageCount = useMemo(() => {
    if (activeStep <= 3) return 0;
    if (activeStep === 4) return 20;
    if (activeStep === 15) return scaleLevel;
    return 500;
  }, [activeStep, scaleLevel]);

  const images = useMemo(() => generateImages(imageCount), [imageCount]);

  // State for loaded and error sets that React components read
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());
  const [errorSet, setErrorSet] = useState<Set<string>>(new Set());

  // Ref to hold the loader instance
  const loaderRef = useRef<PriorityLoader | null>(null);

  // Initialize PriorityLoader
  useEffect(() => {
    const errorTrigger = (id: string) => {
      if (!isActive("errorHandling")) return false;
      const match = id.match(/img-(\d+)/);
      if (!match) return false;
      const idx = parseInt(match[1], 10);
      return idx % 5 === 2 || idx % 7 === 3;
    };

    const loader = new PriorityLoader(
      (loaded, errors) => {
        setLoadedSet(loaded);
        setErrorSet(errors);
      },
      errorTrigger
    );

    loaderRef.current = loader;

    return () => {
      loader.clear();
    };
  }, [isActive]);

  // Handle active images changes and lightbox preloading priority updates
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    if (imageCount === 0) {
      loader.clear();
      return;
    }

    if (!isActive("lazyLoading")) {
      loader.setLoadedImmediately(images.map(i => i.id));
      return;
    }

    // Standard grid queue loading
    images.forEach((img, idx) => {
      // First 6 images get high priority, others normal
      const priority = idx < 6 ? "high" : "normal";
      loader.add(img.id, priority);
    });

    // If lightbox is open, we can elevate priorities of the active lightbox images
    if (lightboxOpen) {
      const currentImg = images[lightboxIndex];
      const prevImg = images[lightboxIndex - 1];
      const nextImg = images[lightboxIndex + 1];

      if (currentImg) loader.add(currentImg.id, "high");
      if (prevImg) loader.add(prevImg.id, "high");
      if (nextImg) loader.add(nextImg.id, "high");
    }
  }, [imageCount, images, isActive, lightboxOpen, lightboxIndex]);

  const retryImage = useCallback((id: string) => {
    loaderRef.current?.retry(id);
  }, []);

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
      retryImage,
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
      stateEntries,
    }),
    [
      activeStep, phase,
      scopeEnabled, toggleScope,
      images, imageCount, loadedSet, errorSet, retryImage,
      featureToggled, toggleFeature, isActive,
      layoutMode, deviceType, imageFormat,
      lightboxOpen, lightboxIndex, openLightbox, closeLightbox,
      lightboxNext, lightboxPrev, focusedElement, a11yAnnouncement,
      scaleLevel, paginationMode,
      metrics, stateEntries,
    ]
  );

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  );
}

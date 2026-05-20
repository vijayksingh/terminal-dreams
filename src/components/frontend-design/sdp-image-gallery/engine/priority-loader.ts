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

export type ApiEndpoint = {
  method: "GET" | "POST" | "DELETE";
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

export function isFeatureActive(feature: string, step: number, toggled: boolean): boolean {
  const unlock = FEATURE_UNLOCK[feature];
  if (!unlock) return false;
  if (step > unlock) return true;
  if (step === unlock) return toggled;
  return false;
}

export function generateImages(count: number): GalleryImage[] {
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

// ── Priority preloader and queue manager ────────────────────────────

export type Priority = "high" | "normal" | "low";
export type LoadingStatus = "pending" | "loading" | "loaded" | "error";

export interface QueueEntry {
  id: string;
  priority: Priority;
  status: LoadingStatus;
  retryCount: number;
}

export class PriorityLoader {
  private queue: Map<string, QueueEntry> = new Map();
  private activeCount = 0;
  private maxConcurrency = 3;
  private loadedSet = new Set<string>();
  private errorSet = new Set<string>();
  private onUpdate: (loaded: Set<string>, errors: Set<string>) => void;
  private errorTrigger: (id: string) => boolean;

  constructor(
    onUpdate: (loaded: Set<string>, errors: Set<string>) => void,
    errorTrigger: (id: string) => boolean = () => false
  ) {
    this.onUpdate = onUpdate;
    this.errorTrigger = errorTrigger;
  }

  public setConcurrency(concurrency: number) {
    this.maxConcurrency = concurrency;
    this.process();
  }

  public setErrorTrigger(trigger: (id: string) => boolean) {
    this.errorTrigger = trigger;
  }

  public add(id: string, priority: Priority = "normal") {
    if (this.loadedSet.has(id)) return;
    
    const existing = this.queue.get(id);
    if (existing) {
      if (existing.status === "pending" && existing.priority !== priority) {
        existing.priority = priority;
      }
      return;
    }

    this.queue.set(id, {
      id,
      priority,
      status: "pending",
      retryCount: 0,
    });
    
    // Defer processing so that multiple adds in a single render tick are processed together
    setTimeout(() => this.process(), 0);
  }

  public remove(id: string) {
    this.queue.delete(id);
  }

  public retry(id: string) {
    this.errorSet.delete(id);
    this.queue.set(id, {
      id,
      priority: "high",
      status: "pending",
      retryCount: 1,
    });
    this.onUpdate(new Set(this.loadedSet), new Set(this.errorSet));
    setTimeout(() => this.process(), 0);
  }

  public clear() {
    this.queue.clear();
    this.loadedSet.clear();
    this.errorSet.clear();
    this.activeCount = 0;
    this.onUpdate(new Set(), new Set());
  }

  public setLoadedImmediately(ids: string[]) {
    this.queue.clear();
    this.errorSet.clear();
    this.loadedSet = new Set(ids);
    this.activeCount = 0;
    this.onUpdate(new Set(this.loadedSet), new Set());
  }

  private process() {
    if (this.activeCount >= this.maxConcurrency) return;

    const pendingTasks = Array.from(this.queue.values()).filter(t => t.status === "pending");
    if (pendingTasks.length === 0) return;

    // Priority ordering
    const priorityWeight: Record<Priority, number> = { high: 3, normal: 2, low: 1 };
    pendingTasks.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    const task = pendingTasks[0];
    task.status = "loading";
    this.activeCount++;

    // Simulated network/metadata fetch delay based on priority
    const delay = task.priority === "high" ? 40 : 120;
    
    setTimeout(() => {
      this.activeCount--;
      this.queue.delete(task.id);

      const isError = this.errorTrigger(task.id);
      if (isError) {
        task.status = "error";
        this.errorSet.add(task.id);
      } else {
        task.status = "loaded";
        this.loadedSet.add(task.id);
      }

      this.onUpdate(new Set(this.loadedSet), new Set(this.errorSet));
      this.process();
    }, delay);

    // Recurse to fill concurrency limits
    this.process();
  }
}

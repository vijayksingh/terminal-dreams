import '@testing-library/jest-dom';

// Provide matchMedia stub for usePrefersReducedMotion and similar hooks
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Provide ResizeObserver stub for useDimensions and similar hooks
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  (window as unknown as Record<string, unknown>).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Provide IntersectionObserver stub
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  (window as unknown as Record<string, unknown>).IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

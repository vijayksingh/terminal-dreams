import '@testing-library/jest-dom';

// Default fetch stub: returns a minimal non-ok Response-shaped object.
// Components that call `/api/...` on mount (RetroSidebar visitor counter,
// RetroAboutCard profile) silently fall back to placeholders, so tests that
// don't care about those fetches stay green. Built by hand rather than
// `new Response()` because jsdom in the current Node version doesn't expose
// the Fetch Response constructor as a global.
if (typeof global !== 'undefined' && !('__td_fetch_stubbed' in global)) {
  (global as unknown as Record<string, unknown>).__td_fetch_stubbed = true;
  (global as unknown as { fetch: typeof fetch }).fetch = (() =>
    Promise.resolve({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as unknown as Response)) as typeof fetch;
}

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

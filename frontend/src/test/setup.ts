import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill;
}

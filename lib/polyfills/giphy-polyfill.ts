// lib/polyfills/giphy-polyfill.ts
if (typeof global === "undefined" && typeof globalThis !== "undefined") {
(globalThis as any).global = globalThis;
}
if (typeof globalThis.process === 'undefined') {
(globalThis as any).process = {
env: {},
browser: true,
};
if (typeof window !== 'undefined') {
console.log('[Giphy Polyfill] Minimal process object created.');
}
} else {
if (typeof (globalThis as any).process.env === 'undefined') {
(globalThis as any).process.env = {};
}
if (typeof (globalThis as any).process.browser === 'undefined') {
(globalThis as any).process.browser = (typeof window !== 'undefined');
}
}
export const giphyPolyfillApplied = true;
// lib/polyfills/edge-runtime-polyfill.ts
if (typeof globalThis.process === 'undefined') {
// Provide a minimal process object, primarily for 'process.env' checks
// and other common properties libraries might look for.
(globalThis as any).process = {
env: {}, // Essential for libraries checking process.env.NODE_ENV
browser: true, // Indicate browser-like environment
versions: { node: undefined }, // Indicate not Node.js
nextTick: (callback: (...args: any[]) => void, ...args: any[]) => setTimeout(() => callback(...args), 0),
// Add other stubs if specific libraries complain, but keep it minimal.
// Avoid trying to replicate the full Node.js process object.
};
if (typeof window !== 'undefined') {
console.log('[Polyfill] Minimal process object polyfilled for edge/browser runtime.');
}
} else {
// If process exists, ensure process.env also exists for robustness
if (typeof (globalThis as any).process.env === 'undefined') {
(globalThis as any).process.env = {};
}
if (typeof (globalThis as any).process.browser === 'undefined') {
(globalThis as any).process.browser = (typeof window !== 'undefined'); // True in browser, false in Node
}
}
if (typeof global === "undefined" && typeof globalThis !== "undefined") {
(globalThis as any).global = globalThis;
}
// Polyfill for Buffer if necessary - often handled by bundlers, but good to have a fallback
if (typeof Buffer === 'undefined' && typeof globalThis !== 'undefined') {
(globalThis as any).Buffer = {
from: function (arg: any, enc?: any, len?: any) {
if (typeof arg === 'string') {
// Basic UTF-8 string to Uint8Array. This is a simplification.
const encoder = new TextEncoder();
return encoder.encode(arg);
}
return new Uint8Array(arg); // For ArrayBuffer or array-like
},
alloc: function (size: number) {
return new Uint8Array(size);
},
isBuffer: function (obj: any) {
return obj instanceof Uint8Array;
},
// Add other Buffer methods if a library specifically needs them
};
if (typeof window !== 'undefined') {
console.log('[Polyfill] Minimal Buffer object polyfilled for edge/browser runtime.');
}
}
export const edgeRuntimePolyfillApplied = true;
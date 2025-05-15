// lib/polyfills/giphy-polyfill.ts
// Polyfill pour l'objet global dans l'environnement Edge Runtime
if (typeof global === "undefined") {
  (globalThis as any).global = globalThis;
}

// Polyfill pour d'autres objets qui pourraient être manquants dans l'environnement Edge Runtime
if (typeof process === "undefined") {
  (globalThis as any).process = { env: {} };
}

// Export pour indiquer que le polyfill a été appliqué
export const giphyPolyfillApplied = true;

// lib/polyfills/edge-runtime-polyfill.ts
// Polyfill pour l'environnement Edge Runtime

// Polyfill pour l'objet global
if (typeof global === "undefined") {
  (globalThis as any).global = globalThis;
}

// Polyfill pour l'objet process
if (typeof process === "undefined") {
  (globalThis as any).process = {
    env: {},
    platform: "browser",
    browser: true,
    versions: {},
    nextTick: (callback: Function) => setTimeout(callback, 0),
    cwd: () => "/",
    exit: () => {},
    on: () => {},
    off: () => {},
    once: () => {},
    emit: () => false,
    addListener: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    listeners: () => [],
    listenerCount: () => 0,
    getMaxListeners: () => 0,
    setMaxListeners: () => {},
    defaultMaxListeners: 10,
    eventNames: () => [],
    rawListeners: () => [],
    prependListener: () => {},
    prependOnceListener: () => {},
    emitWarning: () => {},
    binding: () => ({}),
    hrtime: () => [0, 0],
    hrtimeBigInt: () => BigInt(0),
    cpuUsage: () => ({ user: 0, system: 0 }),
    resourceUsage: () => ({
      fsRead: 0,
      fsWrite: 0,
      voluntaryContextSwitches: 0,
      involuntaryContextSwitches: 0,
      userDiff: 0,
      systemDiff: 0,
      externalMemory: 0,
    }),
    uptime: () => 0,
    memoryUsage: () => ({
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    }),
    kill: () => {},
    send: () => {},
    disconnect: () => {},
    unref: () => {},
    ref: () => {},
    hasRef: () => false,
    title: "",
    pid: 0,
    ppid: 0,
    stderr: { write: () => true },
    stdout: { write: () => true },
    stdin: { read: () => null },
    argv: [],
    argv0: "",
    execArgv: [],
    execPath: "",
    debugPort: 0,
    features: {},
    arch: "x64",
    config: {},
    connected: false,
    allowedNodeEnvironmentFlags: new Set(),
    mainModule: null,
    moduleLoadList: [],
    noDeprecation: false,
    throwDeprecation: false,
    traceDeprecation: false,
    traceProcessWarnings: false,
    version: "",
  };
}

// Polyfill pour Buffer si nécessaire
if (typeof Buffer === "undefined") {
  (globalThis as any).Buffer = {
    from: (data: any) => new Uint8Array(data),
    alloc: (size: number) => new Uint8Array(size),
    allocUnsafe: (size: number) => new Uint8Array(size),
    isBuffer: (obj: any) => obj instanceof Uint8Array,
  };
}

// Export pour indiquer que le polyfill a été appliqué
export const edgeRuntimePolyfillApplied = true;

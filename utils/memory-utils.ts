// Memory monitoring and cleanup utilities
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private intervals: Set<NodeJS.Timeout> = new Set();
  private observers: Set<IntersectionObserver> = new Set();
  private eventListeners: Set<{ element: EventTarget; event: string; handler: EventListener }> = new Set();

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  // Track intervals for cleanup
  trackInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.intervals.add(interval);
    return interval;
  }

  // Track observers for cleanup
  trackObserver(observer: IntersectionObserver): IntersectionObserver {
    this.observers.add(observer);
    return observer;
  }

  // Track event listeners for cleanup
  trackEventListener(element: EventTarget, event: string, handler: EventListener): void {
    this.eventListeners.add({ element, event, handler });
    element.addEventListener(event, handler);
  }

  // Clean up a specific interval
  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  // Clean up a specific observer
  disconnectObserver(observer: IntersectionObserver): void {
    observer.disconnect();
    this.observers.delete(observer);
  }

  // Clean up a specific event listener
  removeEventListener(element: EventTarget, event: string, handler: EventListener): void {
    element.removeEventListener(event, handler);
    this.eventListeners.delete({ element, event, handler });
  }

  // Clean up all tracked resources
  cleanup(): void {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.clear();
  }

  // Get memory usage statistics
  getMemoryStats(): {
    intervals: number;
    observers: number;
    eventListeners: number;
    heapUsed?: number;
    heapTotal?: number;
  } {
    const stats = {
      intervals: this.intervals.size,
      observers: this.observers.size,
      eventListeners: this.eventListeners.size,
    };

    // Add Node.js memory info if available (development only)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return {
        ...stats,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      };
    }

    return stats;
  }

  // Log memory statistics
  logMemoryStats(): void {
    const stats = this.getMemoryStats();
    console.log('🔍 Memory Monitor Stats:', stats);
  }
}

// Debounce utility to prevent excessive function calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility to limit function execution rate
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Hook for using memory monitor in React components
export function useMemoryMonitor() {
  const monitor = MemoryMonitor.getInstance();
  
  return {
    trackInterval: monitor.trackInterval.bind(monitor),
    trackObserver: monitor.trackObserver.bind(monitor),
    trackEventListener: monitor.trackEventListener.bind(monitor),
    clearInterval: monitor.clearInterval.bind(monitor),
    disconnectObserver: monitor.disconnectObserver.bind(monitor),
    removeEventListener: monitor.removeEventListener.bind(monitor),
    cleanup: monitor.cleanup.bind(monitor),
    getMemoryStats: monitor.getMemoryStats.bind(monitor),
    logMemoryStats: monitor.logMemoryStats.bind(monitor),
  };
}

// Cleanup helper for React components
export function useCleanup(cleanupFn: () => void) {
  const { useEffect } = require('react');
  
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
}

// Performance monitoring utility
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();

  static startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
  }

  static endMeasurement(name: string): number {
    const start = this.measurements.get(name);
    if (!start) {
      console.warn(`No measurement started for: ${name}`);
      return 0;
    }
    
    const duration = performance.now() - start;
    this.measurements.delete(name);
    
    if (duration > 100) { // Log slow operations
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => this.endMeasurement(name));
  }

  static measure<T>(name: string, fn: () => T): T {
    this.startMeasurement(name);
    try {
      return fn();
    } finally {
      this.endMeasurement(name);
    }
  }
}

// Global cleanup function for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).memoryMonitor = MemoryMonitor.getInstance();
  (window as any).performanceMonitor = PerformanceMonitor;
} 
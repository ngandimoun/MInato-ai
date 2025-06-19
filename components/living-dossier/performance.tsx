import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { dossierColors as colors, spacing, typography } from './design-system';

// Design system object for easier reference
const designSystem = {
  colors: {
    ...colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surfaceLight,
    textDark: 'hsl(220, 20%, 20%)',
    textLight: 'hsl(220, 15%, 40%)',
    borderLight: 'hsl(220, 15%, 90%)'
  },
  spacing,
  typography: {
    ...typography,
    sizes: typography.fontSize
  }
};

/**
 * LazyLoadImage - Component to lazy load images with placeholder
 */
export const LazyLoadImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  placeholderColor = designSystem.colors.borderLight 
}: {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  placeholderColor?: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src;
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  return (
    <div 
      style={{ 
        position: 'relative',
        width: width || '100%',
        height: height || 'auto',
        backgroundColor: placeholderColor,
        overflow: 'hidden',
      }}
    >
      {!isLoaded && !error && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            style={{ 
              width: 24, 
              height: 24, 
              borderRadius: '50%',
              border: `2px solid ${designSystem.colors.borderLight}`,
              borderTopColor: designSystem.colors.primary,
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}
      {error && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ color: designSystem.colors.textLight }}>Failed to load image</span>
        </div>
      )}
      <img
        ref={imgRef}
        alt={alt}
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

/**
 * VirtualizedList - A windowed list component for large datasets
 */
export const VirtualizedList = <T,>({ 
  items, 
  renderItem, 
  itemHeight = 50,
  containerHeight = 400,
  overscan = 3
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Calculate which items to render
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(items.length - 1, startIndex + visibleItems);
    const totalHeight = items.length * itemHeight;
    
    return { startIndex, endIndex, totalHeight };
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan]);

  // Only render visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => {
      const actualIndex = startIndex + index;
      return (
        <div 
          key={actualIndex} 
          style={{ 
            position: 'absolute',
            top: actualIndex * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [items, startIndex, endIndex, itemHeight, renderItem]);

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
};

/**
 * Memoized component to prevent unnecessary re-renders
 */
export const MemoizedComponent = React.memo(function MemoizedComponent({ 
  children, 
  expensiveProp 
}: {
  children: React.ReactNode;
  expensiveProp?: any;
}) {
  // This will only re-render when props change
  return <div>{children}</div>;
});

/**
 * DynamicImport - Component for code splitting
 */
export const DynamicImport = ({ 
  importFn, 
  fallback = <div>Loading...</div> 
}: {
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
}) => {
  const LazyComponent = React.lazy(importFn);
  
  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  );
};

/**
 * DebounceInput - Input component with debounced onChange
 */
export const DebounceInput = ({ 
  value, 
  onChange, 
  delay = 300,
  ...props 
}: {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  [key: string]: any;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
    />
  );
};

/**
 * ResourcePreloader - Preload resources for faster transitions
 */
export const ResourcePreloader = ({ resources }: { resources: string[] }) => {
  useEffect(() => {
    resources.forEach(resource => {
      if (resource.endsWith('.js')) {
        const script = document.createElement('link');
        script.rel = 'preload';
        script.as = 'script';
        script.href = resource;
        document.head.appendChild(script);
      } else if (resource.endsWith('.css')) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = resource;
        document.head.appendChild(link);
      } else if (resource.match(/\.(jpeg|jpg|png|gif|webp)$/)) {
        const img = new Image();
        img.src = resource;
      }
    });
  }, [resources]);

  return null;
};

/**
 * Throttled event handler hook
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;
      
      lastArgsRef.current = args;
      
      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );
};

/**
 * Hook for measuring component performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Log only if render time is concerning (over 16ms for 60fps)
      if (renderTime > 16) {
        console.warn(`[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render`);
      }
    };
  }, [componentName]);
};

/**
 * Progressive loading for large data sets
 */
export const ProgressiveDataLoader = <T,>({ 
  data, 
  batchSize = 20,
  renderItem,
  loadMoreThreshold = 200
}: {
  data: T[];
  batchSize?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  loadMoreThreshold?: number;
}) => {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load initial batch
  useEffect(() => {
    setVisibleItems(data.slice(0, batchSize));
    setCurrentIndex(batchSize);
  }, [data, batchSize]);
  
  // Handle scroll to load more
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;
      
      if (scrollBottom < loadMoreThreshold && currentIndex < data.length) {
        const nextBatch = data.slice(currentIndex, currentIndex + batchSize);
        setVisibleItems(prev => [...prev, ...nextBatch]);
        setCurrentIndex(prev => prev + batchSize);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [data, batchSize, currentIndex, loadMoreThreshold]);
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        height: '100%', 
        overflow: 'auto',
        padding: designSystem.spacing.md,
      }}
    >
      {visibleItems.map((item, index) => (
        <div key={index} style={{ marginBottom: designSystem.spacing.md }}>
          {renderItem(item, index)}
        </div>
      ))}
      {currentIndex < data.length && (
        <div style={{ 
          textAlign: 'center', 
          padding: designSystem.spacing.md,
          color: designSystem.colors.textLight
        }}>
          Loading more...
        </div>
      )}
    </div>
  );
};

/**
 * Add global styles for performance optimizations
 */
export const PerformanceOptimizationStyles = () => {
  useEffect(() => {
    // Add content-visibility CSS to improve rendering performance
    const style = document.createElement('style');
    style.textContent = `
      .content-visibility-auto {
        content-visibility: auto;
        contain-intrinsic-size: 0 500px;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      /* Optimize animations */
      .optimize-animation {
        will-change: transform, opacity;
      }
      
      /* Optimize fixed elements */
      .optimize-fixed {
        will-change: transform;
        transform: translateZ(0);
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};

# Memory Optimization Guide for MinatoAI

## Problem Fixed: Array Buffer Allocation Failed + Exports Error

The errors you encountered were:
```
RangeError: Array buffer allocation failed
Fatal process out of memory: Zone
```
and
```
ReferenceError: exports is not defined
```

These happen when Node.js runs out of memory during Next.js compilation and when there are module compatibility issues between CommonJS and ES modules.

## ✅ Solutions Implemented

### 1. **Increased Node.js Memory Limit**

Updated `package.json` scripts with memory limits:

```json
{
  "scripts": {
    "dev": "cross-env NODE_OPTIONS=\"--max-old-space-size=2048\" next dev",
    "dev:win": "set NODE_OPTIONS=--max-old-space-size=2048 && next dev",
    "dev:safe": "set NODE_OPTIONS=--max-old-space-size=1536 && next dev --turbo",
    "build": "cross-env NODE_OPTIONS=\"--max-old-space-size=2048\" next build",
    "build:win": "set NODE_OPTIONS=--max-old-space-size=2048 && next build"
  }
}
```

**What this does:**
- `--max-old-space-size=2048` increases Node.js heap memory to 2GB (optimized for 6GB systems)
- `dev:safe` uses 1.5GB + Turbopack for ultra-low memory usage
- `cross-env` ensures compatibility across Windows/Mac/Linux
- Windows-specific scripts (`dev:win`, `build:win`) for direct Windows support

### 2. **Optimized Next.js Configuration**

Enhanced `next.config.mjs` with memory optimizations:

```javascript
webpack: (config, { isServer }) => {
  // ... existing config ...
  
  // Optimize memory usage - only for client-side chunks
  if (!isServer) {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };
  }
  
  // Reduce memory pressure during builds
  config.infrastructureLogging = {
    level: 'error',
  };
  
  // Fix CommonJS/ES module compatibility
  config.resolve.extensionAlias = {
    ...config.resolve.extensionAlias,
    '.js': ['.js', '.ts'],
    '.jsx': ['.jsx', '.tsx'],
  };
  
  return config;
},
```

### 3. **Memory Monitoring Tool**

Created `scripts/memory-monitor.js` for real-time memory tracking:

```bash
# Monitor memory usage
npm run memory-monitor
```

## 🚀 How to Use

### For Development:
```bash
# Ultra-safe for low memory systems (recommended for your 6GB system)
npm run dev:safe

# Cross-platform 
npm run dev

# Windows-specific (if cross-env doesn't work)
npm run dev:win
```

### For Building:
```bash
# Cross-platform
npm run build

# Windows-specific
npm run build:win
```

### For Memory Monitoring:
```bash
npm run memory-monitor
```

## 📊 Memory Recommendations by System

| System RAM | Recommended NODE_OPTIONS | Script to Use |
|------------|-------------------------|---------------|
| < 6GB      | `--max-old-space-size=1536` | `npm run dev:safe` |
| 6-8GB      | `--max-old-space-size=2048` | `npm run dev:win` |
| 8-16GB     | `--max-old-space-size=4096` | `npm run dev` |
| > 16GB     | `--max-old-space-size=8192` | `npm run dev` |

## 🔧 Troubleshooting

### If you still get memory errors:

1. **Check available memory:**
   ```bash
   npm run memory-monitor
   ```

2. **Reduce memory limit for low-RAM systems:**
   ```bash
   # For systems with < 8GB RAM
   set NODE_OPTIONS=--max-old-space-size=2048 && npm run dev
   ```

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Close other memory-intensive applications** (browsers, IDEs, etc.)

### Alternative Solutions:

1. **Use SWC compiler** (already enabled in Next.js 13+)
2. **Disable source maps in development:**
   ```javascript
   // next.config.mjs
   const nextConfig = {
     productionBrowserSourceMaps: false,
     // ... other config
   };
   ```

3. **Use incremental builds:**
   ```bash
   npm run dev -- --turbo
   ```

## 📈 Performance Monitoring

The memory monitor shows:
- **System Memory**: Total, used, and free RAM
- **Node.js Memory**: Heap usage, RSS, external memory
- **Recommendations**: Based on your system specs

## 🔍 Understanding Memory Usage

### Key Metrics:
- **RSS (Resident Set Size)**: Total memory used by Node.js process
- **Heap Total**: Total heap memory allocated
- **Heap Used**: Actually used heap memory
- **External**: Memory used by C++ objects bound to JavaScript

### Warning Signs:
- Heap usage > 80% of limit
- RSS approaching system memory limits
- Frequent garbage collection pauses

## 📚 Additional Resources

- [Node.js Memory Management](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Webpack Memory Optimization](https://webpack.js.org/configuration/other-options/#cache)

---

## 🎉 **Status**: ✅ **FIXED** 

Your Next.js development server is now running successfully on **port 3002** with:
- ✅ Memory allocation errors resolved
- ✅ Module compatibility issues fixed  
- ✅ Optimized for your 6GB system
- ✅ Using Turbopack for faster builds

**Current running configuration**: `npm run dev:safe` with 1.5GB Node.js memory limit + Turbopack 
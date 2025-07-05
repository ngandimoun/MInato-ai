# Python Sandbox Migration Guide

## 🚀 **Migration from PythonAnalyticsEngine to Smart Python Executor**

This guide covers the complete migration from the old TypeScript-Python hybrid approach to the new comprehensive Python sandbox system.

## **What Changed**

### **❌ Old System (Removed)**
- `PythonAnalyticsEngine` - TypeScript-Python hybrid
- Direct `child_process.spawn()` calls to Python
- Python installation dependencies
- Limited error handling and fallbacks
- Single execution method

### **✅ New System**
- **Smart Python Executor** - Intelligent routing system
- **Browser Sandbox** - Pyodide (WebAssembly) execution
- **Docker Sandbox** - Containerized Python execution
- **Cloud Sandbox** - Judge0/Replit API execution
- **Comprehensive fallback system**
- **Performance tracking and optimization**

## **Architecture Overview**

```
SmartPythonExecutor (Router)
├── PythonSandboxEngine (Browser/Pyodide)
├── DockerPythonSandbox (Container)
└── CloudPythonExecutor (Judge0/Replit)
```

## **Migration Steps**

### **1. Update Import Statements**

**Before:**
```typescript
import { PythonAnalyticsEngine } from '@/lib/services/PythonAnalyticsEngine';

const pythonEngine = new PythonAnalyticsEngine();
const results = await pythonEngine.executeStatisticalAnalysis(data, columns);
```

**After:**
```typescript
import { getSmartPythonExecutor, ExecutionRequirements } from '@/lib/services/SmartPythonExecutor';

const smartExecutor = getSmartPythonExecutor();
const requirements: ExecutionRequirements = {
  securityLevel: 'high',
  fallbackAllowed: true,
  concurrent: true
};
const results = await smartExecutor.executeCode(pythonCode, data, requirements);
```

### **2. Update Execution Patterns**

**Before:**
```typescript
// Limited to specific analytics methods
const results = await pythonEngine.executeStatisticalAnalysis(data, columns);
const results = await pythonEngine.executeFinancialAnalysis(data);
```

**After:**
```typescript
// Flexible Python code execution
const analysisCode = `
import pandas as pd
import numpy as np

# Your custom analysis code here
df = pd.DataFrame(data)
results = df.describe()
print(results)
`;

const results = await smartExecutor.executeCode(analysisCode, data, requirements);
```

### **3. Handle Results**

**Before:**
```typescript
// Limited result structure
const { insights, recommendations } = results;
```

**After:**
```typescript
// Rich result structure
const {
  success,
  output,
  error,
  executionTime,
  engine,
  charts,
  insights,
  metadata
} = results;

console.log(`Executed on ${engine} in ${executionTime}ms`);
console.log(`Performance score: ${metadata?.performanceScore}/100`);
```

## **API Endpoints**

### **New Endpoints Added:**

1. **`/api/insights/python-execution`**
   - `POST` - Execute Python code with smart routing
   - `GET` - Get performance statistics

2. **`/api/insights/python-benchmark`**
   - `POST` - Run comprehensive engine benchmark
   - `GET` - Get benchmark history

3. **`/api/insights/python-sandbox`**
   - `GET` - Browser-based Pyodide sandbox

## **Execution Requirements**

Configure execution based on your needs:

```typescript
const requirements: ExecutionRequirements = {
  // Performance
  maxExecutionTime: 30, // seconds
  maxMemoryUsage: 512, // MB
  cpuIntensive: true,
  
  // Security
  networkAccess: false,
  fileSystemAccess: false,
  securityLevel: 'high',
  
  // Features
  packages: ['pandas', 'numpy', 'matplotlib'],
  dataSize: 10, // MB
  outputFormat: 'json',
  
  // Preferences
  preferredEngine: 'browser', // 'browser' | 'docker' | 'cloud'
  fallbackAllowed: true,
  concurrent: true
};
```

## **Engine Selection Logic**

The Smart Python Executor automatically selects the best engine:

1. **Browser (Pyodide)** - Default for security and scalability
2. **Docker** - For CPU-intensive tasks or large datasets
3. **Cloud (Judge0)** - For special packages or long execution

### **Manual Engine Selection:**
```typescript
// Force specific engine
const requirements = { preferredEngine: 'docker' };
const result = await smartExecutor.executeCode(code, data, requirements);
```

## **Error Handling**

### **Robust Fallback System:**
```typescript
try {
  const result = await smartExecutor.executeCode(code, data, {
    preferredEngine: 'docker',
    fallbackAllowed: true // Will try cloud, then browser if Docker fails
  });
  
  if (result.metadata?.fallbackUsed) {
    console.log('Fallback engine was used');
  }
} catch (error) {
  // All engines failed
  console.error('All execution engines failed:', error);
}
```

## **Performance Monitoring**

### **Track Engine Performance:**
```typescript
const smartExecutor = getSmartPythonExecutor();

// Get performance statistics
const stats = smartExecutor.getPerformanceStats();
console.log(stats);
// Output: { browser: { avgExecutionTime: 1200, successRate: 0.95, ... } }

// Run benchmark
const benchmark = await smartExecutor.benchmarkEngines();
console.log(benchmark);
```

## **UI Components**

### **New Python Execution Panel:**
```typescript
import { PythonExecutionPanel } from '@/components/insights/python-execution-panel';

// Use in your insights page
<PythonExecutionPanel />
```

**Features:**
- ✅ Code editor with syntax highlighting
- ✅ Engine selection (Auto/Browser/Docker/Cloud)
- ✅ Real-time execution results
- ✅ Performance benchmarking
- ✅ Statistics dashboard

## **Environment Variables**

### **Optional Configuration:**
```env
# Cloud execution (optional)
JUDGE0_API_KEY=your_judge0_api_key
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com

# Docker configuration (optional)
DOCKER_PYTHON_IMAGE=python:3.11-slim

# Python sandbox URL (optional)
PYTHON_SANDBOX_URL=internal
```

## **Benefits of Migration**

### **🔒 Security**
- **Browser Sandbox**: Complete isolation in user's browser
- **Docker Sandbox**: Container isolation with resource limits
- **Cloud Sandbox**: Managed execution environment

### **📈 Performance**
- **Intelligent Routing**: Best engine for each task
- **Concurrent Execution**: Unlimited browser users
- **Performance Tracking**: Optimize over time

### **🛠 Reliability**
- **Multi-Engine Fallback**: Never fail due to one engine
- **Error Recovery**: Graceful degradation
- **Health Monitoring**: Track engine availability

### **🚀 Scalability**
- **Browser Execution**: Scales to unlimited users
- **Cloud Execution**: No server resource constraints
- **Smart Load Balancing**: Distribute across engines

## **Testing Your Migration**

### **1. Test Basic Execution:**
```typescript
const smartExecutor = getSmartPythonExecutor();
const result = await smartExecutor.executeCode('print("Hello, World!")', []);
console.log(result.output); // "Hello, World!"
```

### **2. Test Engine Selection:**
```typescript
// Test each engine
for (const engine of ['browser', 'docker', 'cloud']) {
  const result = await smartExecutor.executeCode(
    'print(f"Running on {engine}")', 
    [], 
    { preferredEngine: engine }
  );
  console.log(`${engine}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
}
```

### **3. Run Comprehensive Benchmark:**
```typescript
const benchmark = await smartExecutor.benchmarkEngines();
console.log('Benchmark Results:', benchmark);
```

## **Troubleshooting**

### **Common Issues:**

1. **Docker Not Available**
   ```
   Error: Docker not found
   Solution: Install Docker or use browser/cloud engines
   ```

2. **Cloud API Limits**
   ```
   Error: Judge0 API quota exceeded
   Solution: Configure API key or use browser/docker engines
   ```

3. **Browser Compatibility**
   ```
   Error: WebAssembly not supported
   Solution: Use modern browser or fallback to cloud/docker
   ```

## **Next Steps**

1. ✅ **Remove old imports** of `PythonAnalyticsEngine`
2. ✅ **Update API calls** to use Smart Python Executor
3. ✅ **Test all execution paths** with different engines
4. ✅ **Monitor performance** and optimize based on usage
5. ✅ **Configure cloud APIs** for enhanced capabilities

## **Support**

For issues or questions about the migration:
1. Check engine availability: `GET /api/insights/python-execution`
2. Run benchmark: `POST /api/insights/python-benchmark`
3. Review performance stats in the UI
4. Check logs for detailed error messages

---

**🎉 Migration Complete!**

You now have a robust, scalable, and secure Python execution system that automatically selects the best engine for each task while providing comprehensive fallback and monitoring capabilities. 
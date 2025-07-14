#!/usr/bin/env node

/**
 * Memory Optimization Script for Minato AI
 * 
 * This script helps identify and fix memory leaks in the Next.js application
 * Run with: node scripts/memory-optimization.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Memory Optimization Script for Minato AI');
console.log('='.repeat(50));

// Configuration
const CONFIG = {
  maxFileSize: 1024 * 1024, // 1MB
  maxBundleSize: 5 * 1024 * 1024, // 5MB
  suspiciousPatterns: [
    'setInterval',
    'setTimeout',
    'addEventListener',
    'IntersectionObserver',
    'MutationObserver',
    'WebSocket',
    'EventSource',
    'fetch(',
    'useEffect',
    'useCallback',
    'useMemo'
  ],
  memoryLeakPatterns: [
    'setInterval\\(',
    'setTimeout\\(',
    'addEventListener\\(',
    'new IntersectionObserver\\(',
    'new MutationObserver\\(',
    'new WebSocket\\(',
    'new EventSource\\(',
    'useEffect\\(\\s*\\(\\)\\s*=>\\s*\\{[^}]*\\}\\s*,\\s*\\[\\]\\s*\\)' // useEffect with empty deps
  ]
};

// File scanner
function scanDirectory(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .next directories
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(item)) {
          scan(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

// Analyze file for memory issues
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check file size
  if (content.length > CONFIG.maxFileSize) {
    issues.push({
      type: 'size',
      severity: 'warning',
      message: `Large file: ${(content.length / 1024).toFixed(2)}KB`
    });
  }
  
  // Check for potential memory leaks
  CONFIG.memoryLeakPatterns.forEach(pattern => {
    const regex = new RegExp(pattern, 'g');
    const matches = content.match(regex);
    
    if (matches) {
      issues.push({
        type: 'memory-leak',
        severity: 'error',
        message: `Potential memory leak: ${pattern} (${matches.length} occurrences)`,
        occurrences: matches.length
      });
    }
  });
  
  // Check for missing cleanup in useEffect
  const useEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([\s\S]*?)\]\s*\)/g;
  let match;
  
  while ((match = useEffectRegex.exec(content)) !== null) {
    const effectBody = match[1];
    const deps = match[2];
    
    // Check if effect has cleanup but no return statement
    if (effectBody.includes('setInterval') || effectBody.includes('setTimeout') || 
        effectBody.includes('addEventListener') || effectBody.includes('IntersectionObserver')) {
      
      if (!effectBody.includes('return')) {
        issues.push({
          type: 'missing-cleanup',
          severity: 'error',
          message: 'useEffect with side effects but no cleanup function'
        });
      }
    }
  }
  
  return issues;
}

// Generate optimization report
function generateReport() {
  const projectRoot = process.cwd();
  const files = scanDirectory(projectRoot);
  
  console.log(`📁 Scanning ${files.length} files...`);
  
  const report = {
    totalFiles: files.length,
    totalIssues: 0,
    fileIssues: {},
    summary: {
      errors: 0,
      warnings: 0,
      largeFiles: 0,
      memoryLeaks: 0,
      missingCleanups: 0
    }
  };
  
  files.forEach(file => {
    const issues = analyzeFile(file);
    
    if (issues.length > 0) {
      const relativePath = path.relative(projectRoot, file);
      report.fileIssues[relativePath] = issues;
      report.totalIssues += issues.length;
      
      issues.forEach(issue => {
        if (issue.severity === 'error') report.summary.errors++;
        if (issue.severity === 'warning') report.summary.warnings++;
        if (issue.type === 'size') report.summary.largeFiles++;
        if (issue.type === 'memory-leak') report.summary.memoryLeaks++;
        if (issue.type === 'missing-cleanup') report.summary.missingCleanups++;
      });
    }
  });
  
  return report;
}

// Display results
function displayReport(report) {
  console.log('\n📊 Memory Optimization Report');
  console.log('='.repeat(50));
  
  console.log(`Total Files Scanned: ${report.totalFiles}`);
  console.log(`Total Issues Found: ${report.totalIssues}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Large Files: ${report.summary.largeFiles}`);
  console.log(`Potential Memory Leaks: ${report.summary.memoryLeaks}`);
  console.log(`Missing Cleanups: ${report.summary.missingCleanups}`);
  
  if (report.totalIssues > 0) {
    console.log('\n🔍 Detailed Issues:');
    console.log('-'.repeat(50));
    
    Object.entries(report.fileIssues).forEach(([file, issues]) => {
      console.log(`\n📄 ${file}:`);
      
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${issue.message}`);
      });
    });
  }
  
  console.log('\n💡 Optimization Recommendations:');
  console.log('-'.repeat(50));
  
  if (report.summary.memoryLeaks > 0) {
    console.log('• Fix memory leaks by adding proper cleanup functions');
    console.log('• Use the MemoryMonitor utility from utils/memory-utils.ts');
  }
  
  if (report.summary.missingCleanups > 0) {
    console.log('• Add return statements to useEffect hooks with side effects');
    console.log('• Clear intervals, remove event listeners, and disconnect observers');
  }
  
  if (report.summary.largeFiles > 0) {
    console.log('• Consider code splitting for large files');
    console.log('• Use dynamic imports for heavy components');
  }
  
  console.log('• Monitor memory usage with the browser DevTools');
  console.log('• Use React DevTools Profiler to identify performance bottlenecks');
  console.log('• Consider using React.memo() for expensive components');
}

// Generate optimization suggestions
function generateOptimizations() {
  const suggestions = [
    {
      title: 'Enable Memory Monitoring',
      description: 'Add memory monitoring to your development environment',
      code: `
// In your component
import { useMemoryMonitor } from '@/utils/memory-utils';

const { trackInterval, trackObserver, cleanup } = useMemoryMonitor();

useEffect(() => {
  const interval = trackInterval(setInterval(() => {
    // Your code here
  }, 1000));
  
  return () => cleanup();
}, []);
      `.trim()
    },
    {
      title: 'Optimize useEffect Hooks',
      description: 'Always clean up side effects in useEffect',
      code: `
// Bad
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
}, []);

// Good
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
      `.trim()
    },
    {
      title: 'Use Debouncing for Frequent Operations',
      description: 'Prevent excessive function calls with debouncing',
      code: `
import { debounce } from '@/utils/memory-utils';

const debouncedFunction = debounce((value) => {
  // Expensive operation
}, 300);
      `.trim()
    }
  ];
  
  console.log('\n🛠️ Optimization Code Examples:');
  console.log('='.repeat(50));
  
  suggestions.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. ${suggestion.title}`);
    console.log(`   ${suggestion.description}`);
    console.log(`\n   Example:`);
    console.log(suggestion.code.split('\n').map(line => `   ${line}`).join('\n'));
  });
}

// Main execution
function main() {
  try {
    const report = generateReport();
    displayReport(report);
    generateOptimizations();
    
    console.log('\n✅ Memory optimization analysis complete!');
    
    // Exit with error code if critical issues found
    if (report.summary.errors > 0) {
      console.log('\n❌ Critical memory issues detected. Please fix before deploying.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error during memory optimization analysis:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, generateReport, displayReport }; 
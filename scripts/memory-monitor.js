#!/usr/bin/env node

// Memory monitoring script for Next.js development
// Usage: node scripts/memory-monitor.js

const { spawn } = require('child_process');
const os = require('os');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getSystemMemoryInfo() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  console.log('\n=== System Memory Information ===');
  console.log(`Total Memory: ${formatBytes(totalMemory)}`);
  console.log(`Used Memory: ${formatBytes(usedMemory)}`);
  console.log(`Free Memory: ${formatBytes(freeMemory)}`);
  console.log(`Usage: ${((usedMemory / totalMemory) * 100).toFixed(1)}%`);
}

function getNodeMemoryInfo() {
  const memUsage = process.memoryUsage();
  
  console.log('\n=== Node.js Memory Usage ===');
  console.log(`RSS (Resident Set Size): ${formatBytes(memUsage.rss)}`);
  console.log(`Heap Total: ${formatBytes(memUsage.heapTotal)}`);
  console.log(`Heap Used: ${formatBytes(memUsage.heapUsed)}`);
  console.log(`External: ${formatBytes(memUsage.external)}`);
  console.log(`Array Buffers: ${formatBytes(memUsage.arrayBuffers)}`);
}

function getRecommendations() {
  const totalMemory = os.totalmem();
  const totalGB = totalMemory / (1024 * 1024 * 1024);
  
  console.log('\n=== Memory Optimization Recommendations ===');
  
  if (totalGB < 8) {
    console.log('⚠️  Low system memory detected (< 8GB)');
    console.log('   Recommended: Use npm run dev:win for Windows-specific optimization');
    console.log('   Consider: NODE_OPTIONS="--max-old-space-size=2048"');
  } else if (totalGB < 16) {
    console.log('✅ Adequate system memory (8-16GB)');
    console.log('   Current setting: NODE_OPTIONS="--max-old-space-size=4096" should work well');
  } else {
    console.log('✅ High system memory (> 16GB)');
    console.log('   You can increase: NODE_OPTIONS="--max-old-space-size=8192" if needed');
  }
  
  console.log('\n=== Available Scripts ===');
  console.log('npm run dev        - Cross-platform with 4GB Node.js memory limit');
  console.log('npm run dev:win    - Windows-specific with 4GB Node.js memory limit');
  console.log('npm run build      - Cross-platform build with 4GB Node.js memory limit');
  console.log('npm run build:win  - Windows-specific build with 4GB Node.js memory limit');
}

function monitorMemory() {
  console.log('🔍 Memory Monitor - Press Ctrl+C to stop');
  
  const interval = setInterval(() => {
    console.clear();
    console.log('='.repeat(60));
    console.log('Memory Monitor - ' + new Date().toLocaleTimeString());
    console.log('='.repeat(60));
    
    getSystemMemoryInfo();
    getNodeMemoryInfo();
    getRecommendations();
    
    console.log('\n⏱️  Updating every 5 seconds...');
  }, 5000);
  
  // Initial display
  getSystemMemoryInfo();
  getNodeMemoryInfo();
  getRecommendations();
  
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n👋 Memory monitoring stopped');
    process.exit(0);
  });
}

// Check if running as main module
if (require.main === module) {
  monitorMemory();
} else {
  module.exports = {
    getSystemMemoryInfo,
    getNodeMemoryInfo,
    getRecommendations,
    formatBytes
  };
} 
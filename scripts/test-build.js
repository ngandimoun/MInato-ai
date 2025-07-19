#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing build process...');

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  execSync('rm -rf .next', { stdio: 'inherit' });
  
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install --ignore-engines', { stdio: 'inherit' });
  
  // Test build
  console.log('🔨 Running build test...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ Build test completed successfully!');
  console.log('🚀 Ready for deployment');
  
} catch (error) {
  console.error('❌ Build test failed:', error.message);
  console.log('🔍 Check the error above and fix any issues before deploying');
  process.exit(1);
} 
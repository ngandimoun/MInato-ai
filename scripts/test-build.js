#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing build process...');

// Critical dependencies that must be available for build
const criticalDeps = [
  'critters',
  'postcss',
  'tailwindcss',
  'typescript',
  'cross-env'
];

try {
  // Check if critical dependencies are installed
  console.log('🔍 Checking critical dependencies...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const missingDeps = criticalDeps.filter(dep => !allDeps[dep]);
  if (missingDeps.length > 0) {
    console.error('❌ Missing critical dependencies:', missingDeps.join(', '));
    console.log('💡 These dependencies are required for the build process');
    process.exit(1);
  }
  
  console.log('✅ All critical dependencies are available');
  
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
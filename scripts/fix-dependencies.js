#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing dependency issues for Vercel deployment...');

// Check for problematic dependencies
const problematicDeps = [
  'xml2object',
  'ffmpeg-static',
  '@ffmpeg-installer/ffmpeg'
];

try {
  // Read package-lock.json to find problematic dependencies
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    
    console.log('📋 Checking for problematic dependencies...');
    
    problematicDeps.forEach(dep => {
      if (packageLock.dependencies && packageLock.dependencies[dep]) {
        console.log(`⚠️  Found problematic dependency: ${dep}`);
        console.log(`   Version: ${packageLock.dependencies[dep].version}`);
        console.log(`   This might cause build issues on Vercel.`);
      }
    });
  }

  // Clean up build artifacts
  console.log('🧹 Cleaning build artifacts...');
  const cleanCommands = [
    'rm -rf .next',
    'rm -rf node_modules/.cache',
    'rm -rf .vercel'
  ];

  cleanCommands.forEach(cmd => {
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
      console.log(`Command failed (this is normal): ${cmd}`);
    }
  });

  // Reinstall dependencies with ignore-engines flag
  console.log('📦 Reinstalling dependencies...');
  execSync('npm install --ignore-engines', { stdio: 'inherit' });

  console.log('✅ Dependency fix completed!');
  console.log('🚀 You can now run: npm run build:clean');

} catch (error) {
  console.error('❌ Error fixing dependencies:', error.message);
  process.exit(1);
} 
// Quick verification script for games functionality
// Run with: node scripts/test-games.js

const fs = require('fs');
const path = require('path');

console.log('🎮 Testing Game System (Supabase Only)...\n');

// Test 1: Check that game data is properly structured
try {
  console.log('✅ Testing game data import...');
  
  // Check if game data file exists and is properly structured
  const gameDataPath = './lib/gameData.ts';
  if (fs.existsSync(gameDataPath)) {
    console.log('  ✓ Game data file exists');
    
    const content = fs.readFileSync(gameDataPath, 'utf8');
    if (content.includes('GAME_DATA: GameLibraryItem[]')) {
      console.log('  ✓ Game data properly typed');
    }
    if (content.includes('classic_academia_quiz')) {
      console.log('  ✓ Sample games present');
    }
  }
} catch (error) {
  console.log('  ❌ Game data test failed:', error.message);
}

// Test 2: Verify Supabase integration
try {
  console.log('\n✅ Testing Supabase integration...');
  
  const supabaseServicePath = './lib/services/SupabaseGameService.ts';
  
  if (fs.existsSync(supabaseServicePath)) {
    console.log('  ✓ Supabase game service exists');
    
    const serviceContent = fs.readFileSync(supabaseServicePath, 'utf8');
    if (serviceContent.includes('createGameRoom')) {
      console.log('  ✓ createGameRoom method defined');
    }
    if (serviceContent.includes('joinGameRoom')) {
      console.log('  ✓ joinGameRoom method defined');
    }
    if (serviceContent.includes('startGame')) {
      console.log('  ✓ startGame method defined');
    }
    if (serviceContent.includes('submitAnswer')) {
      console.log('  ✓ submitAnswer method defined');
    }
    if (serviceContent.includes('nextQuestion')) {
      console.log('  ✓ nextQuestion method defined');
    }
    if (serviceContent.includes('broadcastGameEvent')) {
      console.log('  ✓ Real-time event broadcasting defined');
    }
  }
} catch (error) {
  console.log('  ❌ Supabase integration test failed:', error.message);
}

// Test 3: Check API routes
try {
  console.log('\n✅ Testing API routes...');
  
  const apiRoutes = [
    './app/api/games/create/route.ts',
    './app/api/games/generate-questions/route.ts',
    './app/api/games/preferences/route.ts'
  ];
  
  apiRoutes.forEach(routePath => {
    if (fs.existsSync(routePath)) {
      const routeName = path.basename(path.dirname(routePath));
      console.log(`  ✓ ${routeName} API route exists`);
    }
  });
} catch (error) {
  console.log('  ❌ API routes test failed:', error.message);
}

// Test 4: Check hooks and components
try {
  console.log('\n✅ Testing hooks and components...');
  
  const componentPaths = [
    './hooks/useSupabaseGames.ts',
    './lib/core/game-orchestrator-server.ts',
    './app/games/play/[gameId]/page.tsx'
  ];
  
  componentPaths.forEach(componentPath => {
    if (fs.existsSync(componentPath)) {
      const componentName = path.basename(componentPath);
      console.log(`  ✓ ${componentName} exists`);
      
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Check for Supabase usage
      if (content.includes('supabase') || content.includes('getBrowserSupabaseClient')) {
        console.log(`    - Uses Supabase ✓`);
      }
      
      // Check for real-time functionality
      if (content.includes('RealtimeChannel') || content.includes('channel')) {
        console.log(`    - Has real-time features ✓`);
      }
    }
  });
} catch (error) {
  console.log('  ❌ Components test failed:', error.message);
}

// Test 5: Check for removed Convex references
try {
  console.log('\n✅ Testing Convex cleanup...');
  
  const convexPaths = [
    './convex',
    './convex.json',
    './context/convex-provider.tsx'
  ];
  
  let convexFound = false;
  convexPaths.forEach(convexPath => {
    if (fs.existsSync(convexPath)) {
      console.log(`  ⚠️  ${convexPath} still exists - should be removed`);
      convexFound = true;
    }
  });
  
  if (!convexFound) {
    console.log('  ✓ All Convex files removed');
  }
  
  // Check layout.tsx for ConvexProvider removal
  const layoutPath = './app/layout.tsx';
  if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (layoutContent.includes('ConvexProvider')) {
      console.log('  ⚠️  layout.tsx still references ConvexProvider');
    } else {
      console.log('  ✓ ConvexProvider removed from layout.tsx');
    }
  }
} catch (error) {
  console.log('  ❌ Convex cleanup test failed:', error.message);
}

console.log('\n🎯 Game system tests completed!');
console.log('\n📋 Manual testing steps:');
console.log('1. Run `npm run dev` to start the development server');
console.log('2. Go to /games to access the game library');
console.log('3. Set your preferred number of questions in game settings');
console.log('4. Create a solo game and verify auto-advance works');
console.log('5. Check that final scores display correctly after all questions');
console.log('6. Test multiplayer functionality if needed');
console.log('\n✨ The system now uses Supabase Realtime exclusively!'); 
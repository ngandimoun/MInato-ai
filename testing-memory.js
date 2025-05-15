// Simple script to test memory framework functionality
// To run: node testing-memory.js

const { getGlobalMemoryFramework } = require('./lib/memory-framework-global');

async function testMemoryFramework() {
  try {
    console.log('Initializing memory framework...');
    const memoryFramework = getGlobalMemoryFramework();
    console.log('Memory framework initialized successfully');
    
    // Test userId - use a test ID or one from your environment 
    const testUserId = 'dd111baf-c8d5-42b6-89ae-7d3bc2c99d70';
    
    // Add a test memory
    console.log('Adding test memory...');
    const testMemoryContent = 'This is a test memory created at ' + new Date().toISOString();
    const success = await memoryFramework.add_memory(
      [{ role: 'user', content: testMemoryContent }],
      testUserId,
      'test-run-id'
    );
    
    console.log('Memory added successfully:', success);
    
    // Search for the memory
    console.log('Searching for memories...');
    const searchResults = await memoryFramework.search_memory(
      'test memory',
      testUserId,
      { limit: 10, offset: 0 }
    );
    
    console.log('Search results:', JSON.stringify(searchResults, null, 2));
    
    console.log('Memory framework test completed!');
  } catch (error) {
    console.error('Error testing memory framework:', error);
  }
}

testMemoryFramework().catch(console.error); 
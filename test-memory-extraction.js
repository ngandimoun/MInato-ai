// Test script to verify memory extraction schema fix
// To run: node test-memory-extraction.js

const { getGlobalMemoryFramework } = require('./lib/memory-framework-global');

async function testMemoryExtraction() {
  try {
    console.log('Initializing memory framework...');
    const memoryFramework = getGlobalMemoryFramework();
    console.log('Memory framework initialized successfully');
    
    // Test userId - use a test ID or one from your environment 
    const testUserId = 'dd111baf-c8d5-42b6-89ae-7d3bc2c99d70';
    
    // Test adding memory with information that should trigger extraction
    console.log('Adding test memory with information to extract...');
    const testMemoryContent = 'My name is John. I live in New York and I really love Italian pasta. I visited Rome last summer.';
    
    const conversationTurn = [
      { role: 'user', content: testMemoryContent }
    ];
    
    const success = await memoryFramework.add_memory(
      conversationTurn,
      testUserId,
      'test-extraction-run-id'
    );
    
    console.log('Memory added successfully:', success);
    
    // Search for the memory to verify it was stored
    console.log('Searching for memories to verify extraction...');
    const searchResults = await memoryFramework.search_memory(
      'John New York pasta',
      testUserId,
      { limit: 5, offset: 0 }
    );
    
    console.log('Search results:', JSON.stringify(searchResults, null, 2));
    
    console.log('Memory extraction test completed!');
  } catch (error) {
    console.error('Error testing memory extraction:', error);
  }
}

testMemoryExtraction().catch(console.error); 
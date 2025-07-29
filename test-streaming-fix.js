// Simple test to verify the streaming_platforms fix
const { getGameOrchestratorServer } = require('./lib/core/game-orchestrator-server');

async function testStreamingFix() {
  console.log('🧪 Testing streaming_platforms fix...');
  
  try {
    const orchestrator = getGameOrchestratorServer();
    
    // Test with the old streaming_platforms value
    const oldPrompt = orchestrator.getGameSpecificPrompt('pop_culture_trivia', 'streaming_platforms', 'beginner');
    console.log('✅ Old streaming_platforms prompt length:', oldPrompt.length);
    console.log('✅ Prompt contains "movies, TV shows":', oldPrompt.includes('movies, TV shows'));
    console.log('✅ Prompt contains "actors, directors":', oldPrompt.includes('actors, directors'));
    
    // Test with the new streaming_content value
    const newPrompt = orchestrator.getGameSpecificPrompt('pop_culture_trivia', 'streaming_content', 'beginner');
    console.log('✅ New streaming_content prompt length:', newPrompt.length);
    console.log('✅ Prompt contains "movies, TV shows":', newPrompt.includes('movies, TV shows'));
    console.log('✅ Prompt contains "actors, directors":', newPrompt.includes('actors, directors'));
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testStreamingFix(); 
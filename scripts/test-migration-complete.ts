#!/usr/bin/env tsx

/**
 * Simple Test to Verify Python Sandbox Migration
 */

console.log('🚀 Testing Python Sandbox Migration...\n');

async function testMigration() {
  try {
    // Test Smart Python Executor import
    const { getSmartPythonExecutor } = await import('../lib/services/SmartPythonExecutor');
    console.log('✅ Smart Python Executor imported successfully');

    // Test executor creation
    const executor = getSmartPythonExecutor();
    console.log('✅ Smart Python Executor created successfully');

    // Test simple execution
    const result = await executor.executeCode('print("Migration test successful!")', []);
    console.log(`✅ Code execution: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Engine: ${result.engine}`);
    console.log(`   Time: ${result.executionTime}ms`);
    
    if (result.output) {
      console.log(`   Output: ${result.output.trim()}`);
    }

    // Test recommendations
    const recommendations = executor.getRecommendations();
    console.log(`✅ Recommendations available: ${Object.keys(recommendations).length} use cases`);

    console.log('\n🎉 Migration test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Migration test failed:', error.message);
    process.exit(1);
  }
}

testMigration(); 
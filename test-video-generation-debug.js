const fetch = require('node-fetch');

// Test configuration
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const FAILED_TASK_ID = '291040f9-02e1-4839-8518-0bbb03453709'; // The task ID from the logs

async function testFailedTask() {
  console.log('🔍 Testing failed video generation task...');
  console.log(`Task ID: ${FAILED_TASK_ID}`);
  
  if (!RUNWAY_API_KEY) {
    console.error('❌ RUNWAY_API_KEY environment variable not set');
    return;
  }
  
  try {
    console.log('\n📡 Checking task status with Runway API...');
    
    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${FAILED_TASK_ID}`, {
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Runway API Error:', errorText);
      return;
    }
    
    const result = await response.json();
    
    console.log('\n📊 Task Details:');
    console.log('================');
    console.log(`Status: ${result.status}`);
    console.log(`Progress: ${result.progress || 0}`);
    console.log(`Created At: ${result.createdAt}`);
    console.log(`Updated At: ${result.updatedAt}`);
    
    if (result.failure_reason) {
      console.log(`❌ Failure Reason: ${result.failure_reason}`);
    } else if (result.status === 'FAILED') {
      console.log('❌ Status is FAILED but no failure_reason provided');
    }
    
    if (result.output && result.output.length > 0) {
      console.log(`✅ Output URL: ${result.output[0]}`);
    }
    
    console.log('\n🔍 Full Response:');
    console.log(JSON.stringify(result, null, 2));
    
    // Analyze the failure
    if (result.status === 'FAILED') {
      console.log('\n🔍 Failure Analysis:');
      console.log('===================');
      
      if (!result.failure_reason) {
        console.log('• No specific failure reason provided by Runway');
        console.log('• This typically indicates:');
        console.log('  - Image format/compatibility issues');
        console.log('  - Content policy violations');
        console.log('  - Temporary service issues');
        console.log('  - Invalid prompt or parameters');
      } else {
        console.log(`• Specific failure reason: ${result.failure_reason}`);
      }
      
      console.log('\n💡 Recommendations:');
      console.log('• Try with a different image format (JPEG/PNG)');
      console.log('• Ensure image is under 10MB');
      console.log('• Check if prompt violates content policies');
      console.log('• Try a simpler prompt');
      console.log('• Retry the generation');
    }
    
  } catch (error) {
    console.error('❌ Error testing failed task:', error.message);
  }
}

async function testNewGeneration() {
  console.log('\n🧪 Testing new video generation...');
  
  if (!RUNWAY_API_KEY) {
    console.error('❌ RUNWAY_API_KEY environment variable not set');
    return;
  }
  
  // Test with a simple prompt and a public image
  const testPayload = {
    model: 'gen4_turbo',
    promptImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    promptText: 'Add gentle zoom motion to this landscape',
    ratio: '1280:720',
    duration: 5,
    seed: Math.floor(Math.random() * 4294967295)
  };
  
  try {
    console.log('📡 Creating new test generation...');
    console.log(`Prompt: "${testPayload.promptText}"`);
    console.log(`Image: ${testPayload.promptImage}`);
    
    const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Generation failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ New generation started successfully!');
    console.log(`Task ID: ${result.id}`);
    console.log(`Status: ${result.status}`);
    
    // Monitor the new generation for a few iterations
    console.log('\n📊 Monitoring new generation...');
    await monitorGeneration(result.id);
    
  } catch (error) {
    console.error('❌ Error testing new generation:', error.message);
  }
}

async function monitorGeneration(taskId, maxChecks = 10) {
  let checks = 0;
  
  while (checks < maxChecks) {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'X-Runway-Version': '2024-11-06'
        }
      });
      
      if (!response.ok) {
        console.error(`❌ Status check failed: ${response.status}`);
        break;
      }
      
      const result = await response.json();
      checks++;
      
      console.log(`Check ${checks}: Status=${result.status}, Progress=${result.progress || 0}`);
      
      if (result.status === 'SUCCEEDED') {
        console.log('✅ Generation completed successfully!');
        console.log(`Video URL: ${result.output[0]}`);
        break;
      } else if (result.status === 'FAILED') {
        console.log('❌ Generation failed');
        if (result.failure_reason) {
          console.log(`Failure reason: ${result.failure_reason}`);
        }
        break;
      }
      
    } catch (error) {
      console.error(`❌ Error checking status: ${error.message}`);
      break;
    }
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting Video Generation Debug Tests');
  console.log('========================================');
  
  // Test 1: Check the failed task
  await testFailedTask();
  
  // Test 2: Try a new generation
  await testNewGeneration();
  
  console.log('\n✅ Debug tests completed!');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testFailedTask, testNewGeneration, monitorGeneration }; 
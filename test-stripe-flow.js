// Test script to verify the Stripe payment link to seller onboarding flow
const path = require('path');

// Add TypeScript support for running directly with Node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true
  }
});

// Now import the modules (use direct imports from the TS files)
const { Orchestrator } = require('./lib/core/orchestrator.ts');
const { logger } = require('./memory-framework/config.ts');

async function testStripeFlow() {
  logger.info("=== Starting Stripe Flow Test ===");
  
  // Create an orchestrator instance
  const orchestrator = new Orchestrator();
  
  // User ID for testing
  const userId = "test-user-" + Date.now();
  
  // Simulate a conversation where user wants to create a payment link
  const initialMessage = "I want to create a payment link for my handmade soap that costs $10";
  
  logger.info(`Test user message: "${initialMessage}"`);
  
  try {
    // Execute the orchestration
    const response = await orchestrator.processTextMessage(
      userId,
      initialMessage,
      [], // empty history
      "test-session-" + Date.now(),
      { userName: "TestUser" }
    );
    
    logger.info("Response received, checking for StripePaymentLinkTool execution...");
    
    // Check if the response includes the expected tools
    if (response.debugInfo?.tool_executions) {
      const tools = response.debugInfo.tool_executions;
      const paymentLinkTool = tools.find(t => t.tool_name === "StripePaymentLinkTool");
      
      if (paymentLinkTool) {
        logger.info("✅ StripePaymentLinkTool was executed as expected");
        
        // Check if the tool indicated onboarding is needed
        if (paymentLinkTool.structured_data?.next_step === "redirect_to_onboarding") {
          logger.info("✅ StripePaymentLinkTool correctly identified need for onboarding");
          
          // Verify saved product details
          if (paymentLinkTool.structured_data?.saved_product_details) {
            logger.info("✅ Product details saved successfully:", 
              JSON.stringify(paymentLinkTool.structured_data.saved_product_details));
          } else {
            logger.error("❌ Product details were not saved for later use");
          }
          
          // Now simulate the user agreeing to set up a Stripe account
          const onboardingMessage = "Yes, let's set up my Stripe account";
          logger.info(`Test user message: "${onboardingMessage}"`);
          
          // Continue the conversation
          const onboardingResponse = await orchestrator.processTextMessage(
            userId,
            onboardingMessage,
            [{ role: "user", content: initialMessage }, response.response], // include history
            "test-session-" + Date.now(),
            { userName: "TestUser" }
          );
          
          // Check if the onboarding tool was triggered
          if (onboardingResponse.debugInfo?.tool_executions) {
            const onboardingTools = onboardingResponse.debugInfo.tool_executions;
            const sellerOnboardingTool = onboardingTools.find(t => 
              t.tool_name === "StripeSellerOnboardingTool");
            
            if (sellerOnboardingTool) {
              logger.info("✅ StripeSellerOnboardingTool was triggered as expected");
              logger.info("Test completed successfully!");
            } else {
              logger.error("❌ StripeSellerOnboardingTool was not triggered");
            }
          }
        } else {
          logger.error("❌ StripePaymentLinkTool did not redirect to onboarding");
        }
      } else {
        logger.error("❌ StripePaymentLinkTool was not executed");
      }
    } else {
      logger.error("❌ No tool executions found in response");
    }
  } catch (error) {
    logger.error("Error during test:", error);
  }
  
  logger.info("=== Stripe Flow Test Completed ===");
}

// Run the test
testStripeFlow().catch(err => {
  logger.error("Unhandled error during test:", err);
}); 
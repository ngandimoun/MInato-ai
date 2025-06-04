# Stripe Payment Link & Seller Onboarding Flow

## Overview

This documentation outlines the implementation of a seamless flow between Stripe payment link creation and Stripe seller onboarding in Minato. The goal is to provide users with a frictionless experience when they attempt to create payment links but haven't yet set up a Stripe account.

## Key Components

1. **StripePaymentLinkTool**: For creating payment links via Stripe API
2. **StripeSellerOnboardingTool**: For guiding users through Stripe account setup
3. **Orchestrator**: Manages the transition between these tools

## Implementation Details

### 1. Stripe Configuration Verification

The `StripePaymentLinkTool` now includes a `verifyStripeConfiguration()` method that:
- Checks if Stripe is properly configured (API key exists)
- Verifies if the account is properly set up
- Returns a structured response indicating if onboarding is needed

```typescript
private async verifyStripeConfiguration(): Promise<{ isConfigured: boolean; message: string; needsOnboarding: boolean }> {
  const logPrefix = `[StripePaymentLinkTool]`;
  
  if (!this.stripe) {
    logger.error(`${logPrefix} Stripe is not configured. Missing API key.`);
    return {
      isConfigured: false,
      needsOnboarding: true,
      message: "You need to set up a Stripe account first before creating payment links."
    };
  }
  
  try {
    // Attempt to retrieve account information to verify API key is valid
    const account = await this.stripe.accounts.retrieve('account');
    logger.info(`${logPrefix} Stripe account verified: ${account.id}`);
    
    // Check if account is properly set up
    if (!account.charges_enabled) {
      return {
        isConfigured: false,
        needsOnboarding: true,
        message: "Your Stripe account is not fully set up to accept payments. Let's complete your account setup first."
      };
    }
    
    return {
      isConfigured: true,
      needsOnboarding: false,
      message: "Stripe account properly configured."
    };
  } catch (error: any) {
    logger.error(`${logPrefix} Error checking Stripe configuration:`, error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      return {
        isConfigured: false,
        needsOnboarding: true,
        message: "Your Stripe API key appears to be invalid. Let's set up your Stripe account properly."
      };
    }
    
    return {
      isConfigured: false,
      needsOnboarding: true,
      message: "There was an issue with your Stripe account. Let's set it up properly."
    };
  }
}
```

### 2. Payment Link Creation with Onboarding Redirection

The `createPaymentLink` method now checks for Stripe configuration before attempting to create a link:

```typescript
private async createPaymentLink(input: StripePaymentLinkInput): Promise<ToolOutput> {
  const logPrefix = `[StripePaymentLinkTool]`;
  const productName = input.product_name || "";
  const price = input.price || 0;
  const currency = (input.currency || "usd").toLowerCase();
  
  // Verify Stripe configuration before attempting to create payment link
  const stripeConfig = await this.verifyStripeConfiguration();
  
  if (!stripeConfig.isConfigured) {
    logger.warn(`${logPrefix} Stripe is not configured properly: ${stripeConfig.message}`);
    
    // If user needs to set up Stripe account, guide them through onboarding
    if (stripeConfig.needsOnboarding) {
      // Save the current product details to use after onboarding
      const savedProductDetails = {
        product_name: input.product_name,
        price: input.price,
        currency: input.currency,
        recurring: input.recurring,
        description: input.description
      };
      
      return {
        result: `${stripeConfig.message} Let me help you set up your Stripe account first.`,
        error: null,
        structuredData: {
          result_type: "payment_link",
          source_api: "stripe",
          query: input,
          next_step: "redirect_to_onboarding",
          needs_onboarding: true,
          saved_product_details: savedProductDetails,
          error: {
            type: "account_setup_required",
            message: stripeConfig.message
          }
        }
      };
    }
    
    // For other configuration issues
    return {
      result: `Unable to create payment link: ${stripeConfig.message}`,
      error: stripeConfig.message,
      structuredData: {
        result_type: "payment_link",
        source_api: "stripe",
        query: input,
        error: {
          type: "configuration_error",
          message: stripeConfig.message
        }
      }
    };
  }
  
  // Rest of the payment link creation code...
}
```

### 3. Orchestrator Changes for Tool Transitions

The orchestrator now includes special handling for transitioning between Stripe tools:

```typescript
// In the for loop that processes tool results
if (
  data && 
  data.result_type === "payment_link" && 
  'next_step' in data && 
  data.next_step === "redirect_to_onboarding" && 
  'needs_onboarding' in data && 
  data.needs_onboarding === true &&
  'saved_product_details' in data &&
  data.saved_product_details
) {
  logger.info(`[Orchestrator] Detected need to transition from StripePaymentLinkTool to StripeSellerOnboardingTool`);
  needsStripeOnboarding = true;
  savedProductDetails = data.saved_product_details;
  previousToolName = "StripePaymentLinkTool";
}

// After the for loop, special transitions are handled
if (needsStripeOnboarding && savedProductDetails) {
  logger.info(`[Orchestrator] Triggering StripeSellerOnboardingTool after StripePaymentLinkTool`);
  
  // Prepare arguments for the StripeSellerOnboardingTool
  const onboardingArgs = {
    intent: "start_selling",
    country: null,
    entity_type: null,
    business_description: savedProductDetails.product_name ? `selling ${savedProductDetails.product_name}` : null,
    _context: {
      savedProductDetails: savedProductDetails,
      previous_tool: previousToolName,
      userState: userState,
      userId: userId,
      userName: apiContext.userName || "friend"
    },
    _rawUserInput: currentTurnUserInput
  };
  
  // Find and execute the StripeSellerOnboardingTool
  const { tool } = await this.getResolvedTool("StripeSellerOnboardingTool", userId);
  
  if (tool) {
    // Execute tool and handle response...
  }
}
```

### 4. StripeSellerOnboardingTool Enhancements

The `StripeSellerOnboardingTool` has been enhanced to:
- Recognize when it's being called after a payment link attempt
- Store product details for later use
- Signal when to return to payment link creation

```typescript
// In the StripeSellerOnboardingTool execute method
// When account creation/verification is complete
if (onboardingStep === "account_created" || onboardingStep === "account_verified") {
  // If we came from payment link tool and have saved product details
  if (comingFromPaymentLinkTool && savedProductDetails) {
    return {
      result: `Great! Your Stripe account is now set up. Let's continue creating your payment link for ${savedProductDetails.product_name}.`,
      error: null,
      structuredData: {
        result_type: "seller_onboarding",
        source_api: "stripe",
        query: input,
        onboarding_step: onboardingStep,
        return_to_payment_link_after: true,
        saved_product_details: savedProductDetails
      }
    };
  }
}
```

## User Experience Flow

1. User attempts to create a payment link: "I want to create a payment link for my soap that costs $10"
2. System detects no Stripe account is configured
3. System automatically guides user to set up a Stripe account, preserving product details
4. After Stripe account setup is complete, system automatically returns to payment link creation
5. Payment link is created and presented to the user

## Benefits

1. **Seamless Experience**: Users don't need to know about the separate tools
2. **Context Preservation**: Product details are maintained between tool transitions
3. **Guided Flow**: Clear instructions guide users through the entire process
4. **Error Handling**: Specific error messages for different Stripe configuration issues

## Schema Updates

The schema service has been updated to include types for the structured data returned by both tools:

```typescript
export interface StripePaymentLinkOutput {
  result_type: "payment_link";
  source_api: "stripe";
  query: any;
  next_step?: "redirect_to_onboarding";
  needs_onboarding?: boolean;
  saved_product_details?: any;
  payment_link?: {
    id: string;
    url: string;
    // Other payment link properties...
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface StripeSellerOnboardingOutput {
  result_type: "seller_onboarding";
  source_api: "stripe";
  query: any;
  onboarding_step: string;
  return_to_payment_link_after?: boolean;
  saved_product_details?: any;
  error?: {
    type: string;
    message: string;
  };
}
```

## Testing

The flow can be tested by:
1. Starting with a request to create a payment link
2. Verifying the system detects the need for a Stripe account
3. Checking that product details are preserved
4. Confirming automatic transition back to payment link creation after account setup

## Conclusion and Future Improvements

The implemented solution provides a seamless experience for users transitioning between Stripe payment link creation and seller onboarding. However, there are several potential improvements that could be made in the future:

### Recommended Future Enhancements

1. **Progress Persistence**: Implement a database solution to save onboarding progress in case the conversation is interrupted and resumed later.

2. **UX Improvements**:
   - Add more conversational transitions between tools
   - Provide visual cues in the UI to indicate the transition between different processes
   - Show a progress indicator for the multi-step flow

3. **Error Handling**:
   - Implement more specific error recovery mechanisms for various Stripe API failures
   - Add a "retry" mechanism for failed API calls
   - Provide more detailed troubleshooting guidance for common issues

4. **User State Management**:
   - Store Stripe account status in the user state for quicker verification
   - Implement a caching mechanism to reduce API calls to Stripe
   - Add periodic verification of Stripe account status

5. **Expanded Features**:
   - Add support for updating existing payment links
   - Implement management of multiple payment links
   - Add analytics for payment link usage

6. **Testing**:
   - Create comprehensive unit tests for each component
   - Implement integration tests for the full flow
   - Add mock responses for Stripe API calls in test environments

By implementing these enhancements, the system can provide an even more robust and user-friendly experience for managing Stripe payment links and seller onboarding. 
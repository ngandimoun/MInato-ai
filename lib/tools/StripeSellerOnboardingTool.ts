import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";
import { appConfig } from "../config";
import Stripe from "stripe";

interface StripeSellerOnboardingInput extends ToolInput {
  intent: string;
  country?: string | null;
  entity_type?: string | null;
  business_description?: string | null;
  context?: {
    user_selling_intent?: string;
    previous_conversation?: string;
    savedProductDetails?: any;
    previous_tool?: string;
    // Don't define userState here as it's already part of ToolInput context
  };
}

interface StripeSellerOnboardingOutput {
  result_type: "seller_onboarding";
  source_api: "stripe_connect";
  query: any;
  onboarding_step: string;
  onboarding_data?: {
    country?: string;
    entity_type?: string;
    requires_embedded_component?: boolean;
    client_secret?: string;
    connected_account_id?: string;
  };
  conversational_response: string;
  next_action?: "collect_country_entity" | "trigger_embedded_component" | "complete" | "error";
  error?: string;
  saved_product_details?: any;
  return_to_payment_link_after?: boolean;
}

export class StripeSellerOnboardingTool extends BaseTool {
  name = "StripeSellerOnboardingTool";
  description = "Handles Stripe seller account onboarding and setup for users who want to start selling. Guides users through country/entity selection and initiates the embedded Stripe Connect onboarding flow for account verification and bank account linking.";
  argsSchema = {
    type: "object" as const,
    properties: {
      intent: { 
        type: ["string", "null"] as const, 
        description: "The main selling intent (e.g., 'start_selling', 'become_seller', 'setup_account')." 
      } as OpenAIToolParameterProperties,
      country: { 
        type: ["string", "null"] as const, 
        description: "The two-letter ISO country code (e.g., 'US', 'GB', 'CA') where the seller is located."
      } as OpenAIToolParameterProperties,
      entity_type: { 
        type: ["string", "null"] as const, 
        description: "The type of entity the seller represents - 'individual' or 'company'."
      } as OpenAIToolParameterProperties,
      business_description: { 
        type: ["string", "null"] as const, 
        description: "Brief description of the business or what the seller plans to sell."
      } as OpenAIToolParameterProperties
    },
    required: ["intent", "country", "entity_type", "business_description"],
    additionalProperties: false as const
  };
  
  cacheTTLSeconds = 0; // Don't cache onboarding results
  categories = ["payment", "e-commerce", "onboarding"];
  version = "1.0.0";
  metadata = { provider: "Stripe Connect", flowType: "conversational_onboarding" };

  private stripe: Stripe | null = null;

  constructor() {
    super();
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    
    if (!stripeSecretKey) {
      this.log("error", "Stripe API Key (STRIPE_SECRET_KEY) is missing. Tool will fail.");
    } else {
      // Create Stripe instance with consistent API version
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-05-28.basil', // Use the same API version as lib/stripe.ts
        typescript: true,
        appInfo: {
          name: 'Minato AI Companion',
          version: '1.0.0',
        },
      });
    }
  }
  
  private async extractOnboardingParameters(userInput: string): Promise<Partial<StripeSellerOnboardingInput>> {
    const extractionPrompt = `
You are an expert parameter extractor for Minato's StripeSellerOnboardingTool which helps users set up seller accounts.

User Request: "${userInput.replace(/\"/g, '\\"')}"

For router purposes, extract ONLY:
- intent: User's intent (start_selling, become_seller, setup_account)
- country: Optional 2-letter country code if clearly mentioned
- entity_type: Optional business type (individual or company) if clearly mentioned
- business_description: Brief description of what they plan to sell

KEEP IT SIMPLE with minimal inference.
`;

    try {
      // Define schema for extraction
      const onboardingParamsSchema = {
        type: "object" as const,
        properties: {
          intent: { type: ["string", "null"] as const },
          country: { type: ["string", "null"] as const },
          entity_type: { type: ["string", "null"] as const },
          business_description: { type: ["string", "null"] as const }
        },
        required: ["intent", "country", "entity_type", "business_description"]
      };

      let extractionResult: Partial<StripeSellerOnboardingInput> | null = null;
      
      try {
        extractionResult = await generateStructuredJson<Partial<StripeSellerOnboardingInput>>(
          extractionPrompt,
          userInput,
          onboardingParamsSchema,
          "StripeSellerOnboardingToolParameters",
          [], // no history context needed
          "gpt-4o-mini"
        );
      } catch (error) {
        logger.error("[StripeSellerOnboardingTool] JSON generation failed:", error);
        extractionResult = null;
      }
      
      // Make sure we have values for all required parameters, even if they're null
      const result: Partial<StripeSellerOnboardingInput> = extractionResult || {};
      
      // Set defaults for any missing parameters
      if (!('intent' in result)) result.intent = "start_selling";
      if (!('country' in result)) result.country = "";
      if (!('entity_type' in result)) result.entity_type = "";
      if (!('business_description' in result)) result.business_description = "";
      
      return result;
    } catch (error) {
      logger.error("[StripeSellerOnboardingTool] Parameter extraction failed:", error);
      // Return all required parameters with empty strings instead of null
      return {
        intent: "start_selling",
        country: "",
        entity_type: "",
        business_description: ""
      };
    }
  }

  async execute(input: StripeSellerOnboardingInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = `[StripeSellerOnboardingTool]`;
    
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      const extractedParams = await this.extractOnboardingParameters(input._rawUserInput);
      
      // Only use extracted parameters if they're not already specified
      if (extractedParams.intent && input.intent === undefined) {
        input.intent = extractedParams.intent;
      }
      if (extractedParams.country && input.country === undefined) {
        input.country = extractedParams.country;
      }
      if (extractedParams.entity_type && input.entity_type === undefined) {
        input.entity_type = extractedParams.entity_type;
      }
      if (extractedParams.business_description && input.business_description === undefined) {
        input.business_description = extractedParams.business_description;
      }
      if (extractedParams.context && input.context === undefined) {
        input.context = extractedParams.context;
      }
    }
    
    // Check if we were called from StripePaymentLinkTool and have saved product details
    const comingFromPaymentLinkTool = input._context?.previous_tool === "StripePaymentLinkTool";
    const savedProductDetails = input._context?.savedProductDetails;
    
    if (comingFromPaymentLinkTool && savedProductDetails) {
      logger.info(`${logPrefix} Called from StripePaymentLinkTool with saved product details: ${JSON.stringify(savedProductDetails)}`);
      
      // If no business description provided but we have product details, use that
      if (!input.business_description && savedProductDetails.product_name) {
        input.business_description = `selling ${savedProductDetails.product_name}`;
        logger.info(`${logPrefix} Using product name as business description: ${input.business_description}`);
      }
    }
    
    const userNameForResponse = input._context?.userName || "friend";
    const intent = input.intent || "start_selling";
    
    if (abortSignal?.aborted) { 
      return { 
        error: "Seller onboarding cancelled.", 
        result: "Seller onboarding cancelled." 
      }; 
    }

    try {
      this.log("info", `${logPrefix} Processing seller onboarding intent: ${intent}`);
      
      // Determine the current onboarding step based on available information
      let onboardingStep = "initial_intent";
      let conversationalResponse = "";
      let nextAction: "collect_country_entity" | "trigger_embedded_component" | "complete" | "error" = "collect_country_entity";
      
      const hasCountry = input.country && input.country.length === 2;
      const hasEntityType = input.entity_type && ["individual", "company"].includes(input.entity_type);
      
      if (!hasCountry || !hasEntityType) {
        // Step 1: Need to collect country and entity type information
        onboardingStep = "collect_country_entity";
        nextAction = "collect_country_entity";
        
        const businessContext = input.business_description 
          ? ` for your ${input.business_description}` 
          : input.context?.user_selling_intent 
            ? ` for ${input.context.user_selling_intent}`
            : "";
            
        conversationalResponse = `Fantastic that you're looking to start selling${businessContext}, ${userNameForResponse}! To enable you to receive payments securely and seamlessly, Minato partners with Stripe, a global leader in online payments. We'll need to set up a Stripe Express account for you.

To get started and tailor the Stripe setup correctly, could you please tell me:

1. **In which country** is your business primarily based, or where do you reside if you're selling as an individual? (e.g., United States, Canada, Germany, Japan)

2. **Are you planning to sell as an individual person**, or do you have a registered business/company (like an LLC, corporation, etc.)?

Once I have this information, I'll guide you through the secure Stripe onboarding process!`;
        
      } else {
        // Step 2: Have country and entity type, ready for embedded component
        onboardingStep = "ready_for_embedded_component";
        nextAction = "trigger_embedded_component";
        
        const countryName = input.country ? this.getCountryName(input.country) : "your country";
        const entityTypeText = input.entity_type === "individual" ? "as an individual" : "as a business/company";
        
        conversationalResponse = `Perfect! Selling ${entityTypeText} based in ${countryName}.

Before we proceed with the secure Stripe setup form, it's important to be aware that Stripe has specific guidelines on prohibited and restricted businesses and activities. Please ensure that what you plan to sell is compliant with these guidelines.

Ready to move to the Stripe setup form now? Stripe will ask for some details to verify your identity and to link your bank account for receiving payouts. All the information you provide is sent directly and securely to Stripe; Minato doesn't store these sensitive details.

The secure onboarding form will appear in just a moment!`;
      }
      
      // Prepare structured output data
      const structuredData: StripeSellerOnboardingOutput = {
        result_type: "seller_onboarding",
        source_api: "stripe_connect",
        query: { ...input },
        onboarding_step: onboardingStep,
        onboarding_data: {
          country: input.country || undefined,
          entity_type: input.entity_type || undefined,
          requires_embedded_component: nextAction === "trigger_embedded_component"
        },
        conversational_response: conversationalResponse,
        next_action: nextAction
      };
      
      // If onboarding is complete and we came from payment link tool, indicate readiness to return
      if (
        (onboardingStep === "account_created" || onboardingStep === "account_verified") && 
        comingFromPaymentLinkTool && 
        savedProductDetails
      ) {
        const productName = savedProductDetails.product_name;
        const price = savedProductDetails.price;
        const formattedPrice = price ? `$${(price / 100).toFixed(2)}` : "";
        
        logger.info(`${logPrefix} Onboarding complete, ready to return to payment link creation for ${productName}`);
        
        const responseWithTransition = `**Great news!** Your Stripe account setup is complete.

Now that your Stripe account is ready, let's get back to creating your payment link for "${productName}"${formattedPrice ? ` priced at ${formattedPrice}` : ""}.

Would you like to continue creating your payment link? I've saved all the details you provided earlier.`;
        
        // Prepare structured output data
        const structuredData: StripeSellerOnboardingOutput = {
          result_type: "seller_onboarding",
          source_api: "stripe_connect",
          query: { ...input },
          onboarding_step: onboardingStep,
          onboarding_data: {
            country: input.country || undefined,
            entity_type: input.entity_type || undefined,
            requires_embedded_component: false
          },
          conversational_response: responseWithTransition,
          next_action: "complete",
          saved_product_details: savedProductDetails,
          return_to_payment_link_after: true
        };
        
        return {
          result: responseWithTransition,
          structuredData: structuredData,
        };
      }
      
      // If we have saved product details, include them in the response
      if (comingFromPaymentLinkTool && savedProductDetails) {
        structuredData.saved_product_details = savedProductDetails;
        structuredData.return_to_payment_link_after = true;
      }
      
      return {
        result: conversationalResponse,
        structuredData: structuredData,
      };
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      this.log("error", `${logPrefix} Error in seller onboarding: ${errorMessage}`, error);
      
      return {
        error: `Error in seller onboarding: ${errorMessage}`,
        result: `Sorry, ${userNameForResponse}, Minato encountered an issue setting up your seller account: ${errorMessage}`,
        structuredData: { 
          result_type: "seller_onboarding", 
          source_api: "stripe_connect", 
          query: { ...input }, 
          onboarding_step: "error",
          conversational_response: `Error: ${errorMessage}`,
          next_action: "error",
          error: errorMessage 
        }
      };
    }
  }
  
  private getCountryName(countryCode: string): string {
    const countryNames: { [key: string]: string } = {
      'US': 'United States',
      'CA': 'Canada', 
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'IT': 'Italy',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'JP': 'Japan',
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'NZ': 'New Zealand',
      'IE': 'Ireland',
      'AT': 'Austria',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'LU': 'Luxembourg',
      'PT': 'Portugal',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'SK': 'Slovakia',
      'HU': 'Hungary',
      'SI': 'Slovenia',
      'EE': 'Estonia',
      'LV': 'Latvia',
      'LT': 'Lithuania',
      'MT': 'Malta',
      'CY': 'Cyprus',
      'BG': 'Bulgaria',
      'RO': 'Romania',
      'HR': 'Croatia'
    };
    
    return countryNames[countryCode.toUpperCase()] || countryCode;
  }
} 
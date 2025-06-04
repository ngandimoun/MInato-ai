import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import Stripe from "stripe";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";

interface StripePaymentLinkInput extends ToolInput {
  product_name?: string;
  price?: number;
  currency?: string | null;
  description?: string | null;
  image_url?: string | null;
  quantity_adjustable?: boolean | null;
  payment_link_name?: string | null;
  // Enhanced Phase 3 parameters
  inventory_quantity?: number | null;
  enable_stripe_limit?: boolean | null;
  inactive_message?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  shipping_countries?: string[] | null;
  enable_tax_collection?: boolean | null;
  allow_promotion_codes?: boolean | null;
  enable_pdf_invoices?: boolean | null;
  step?: string | null; // For conversational flow tracking
  _rawUserInput?: string; // Add this to match what's being passed
  
  // Advanced Stripe parameters
  is_subscription?: boolean | null;
  interval_type?: 'day' | 'week' | 'month' | 'year' | null;
  interval_count?: number | null;
  trial_days?: number | null;
  collect_shipping?: boolean | null;
  collect_billing?: boolean | null;
  collect_phone?: boolean | null;
  custom_fields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'numeric' | 'dropdown' | 'checkbox';
    optional?: boolean;
    options?: string[]; // For dropdown type
  }> | null;
  after_completion_url?: string | null;
  after_completion_type?: 'hosted_confirmation' | 'redirect' | null;
  save_payment_method?: boolean | null;
  
  context?: {
    previous_products?: string[];
    flow_step?: string;
    current_draft?: any;
    // Don't define userState here as it's already part of ToolInput context
  };
}

interface StripePaymentLinkOutput {
  result_type: "payment_link";
  source_api: "stripe";
  query: any;
  payment_link: {
    id: string;
    url: string;
    product: {
      id: string;
      name: string;
      description?: string;
    };
    price: {
      id: string;
      unit_amount: number;
      currency: string;
    };
    created: number;
    active: boolean;
    features: {
      tax_collection: boolean;
      promotion_codes: boolean;
      pdf_invoices: boolean;
      shipping_required: boolean;
      quantity_adjustable: boolean;
      inventory_tracking: boolean;
      is_subscription?: boolean;
    };
  };
  error?: string;
  next_step?: string;
  ui_action?: "show_review_modal" | "upload_images" | "none";
}

export class StripePaymentLinkTool extends BaseTool {
  name = "StripePaymentLinkTool";
  description = "Creates Stripe payment links for selling products or services. This tool guides the user through a conversational flow to collect product name, price, description and other details. USE THIS TOOL when users want to create payment links, sell products, or set up e-commerce - even if initial details are minimal. The tool will collect missing information conversationally. NOTE: This tool creates payment links only, it does not handle Stripe account setup or seller onboarding.";
  argsSchema = {
    type: "object" as const,
    properties: {
      product_name: { 
        type: ["string", "null"] as const, 
        description: "The name of the product or service to create a payment link for." 
      } as OpenAIToolParameterProperties,
      price: { 
        type: ["number", "null"] as const, 
        description: "The price of the product in the smallest currency unit (e.g., cents for USD). For example, $10.00 should be specified as 1000."
      } as OpenAIToolParameterProperties,
      currency: { 
        type: ["string", "null"] as const, 
        description: "The three-letter ISO currency code (e.g., 'usd', 'eur', 'gbp'). Defaults to 'usd' if not specified."
      } as OpenAIToolParameterProperties,
      description: { 
        type: ["string", "null"] as const, 
        description: "A description of the product that will be visible to customers."
      } as OpenAIToolParameterProperties,
      image_url: {
        type: ["string", "null"] as const,
        description: "URL to an image of the product."
      } as OpenAIToolParameterProperties,
      quantity_adjustable: {
        type: ["boolean", "null"] as const,
        description: "Whether customers can adjust the quantity of the product."
      } as OpenAIToolParameterProperties,
      payment_link_name: {
        type: ["string", "null"] as const,
        description: "Optional name for the payment link."
      } as OpenAIToolParameterProperties,
      inventory_quantity: {
        type: ["number", "null"] as const,
        description: "Optional inventory quantity for the product."
      } as OpenAIToolParameterProperties,
      enable_stripe_limit: {
        type: ["boolean", "null"] as const,
        description: "Whether to enable purchase limits."
      } as OpenAIToolParameterProperties,
      inactive_message: {
        type: ["string", "null"] as const,
        description: "Message to display when the payment link is inactive."
      } as OpenAIToolParameterProperties,
      min_quantity: {
        type: ["number", "null"] as const,
        description: "Minimum quantity a customer can purchase."
      } as OpenAIToolParameterProperties,
      max_quantity: {
        type: ["number", "null"] as const,
        description: "Maximum quantity a customer can purchase."
      } as OpenAIToolParameterProperties,
      enable_tax_collection: {
        type: ["boolean", "null"] as const,
        description: "Whether to enable tax collection."
      } as OpenAIToolParameterProperties,
      allow_promotion_codes: {
        type: ["boolean", "null"] as const,
        description: "Whether to allow promotion codes."
      } as OpenAIToolParameterProperties,
      enable_pdf_invoices: {
        type: ["boolean", "null"] as const,
        description: "Whether to enable PDF invoices."
      } as OpenAIToolParameterProperties,
      // New advanced Stripe options
      is_subscription: {
        type: ["boolean", "null"] as const,
        description: "Whether this is a subscription product with recurring payments."
      } as OpenAIToolParameterProperties,
      interval_type: {
        type: ["string", "null"] as const,
        description: "For subscription products, the billing interval type (day, week, month, year)."
      } as OpenAIToolParameterProperties,
      interval_count: {
        type: ["number", "null"] as const,
        description: "For subscription products, the number of intervals between subscription billings."
      } as OpenAIToolParameterProperties,
      trial_days: {
        type: ["number", "null"] as const,
        description: "For subscription products, the number of trial days before the first charge."
      } as OpenAIToolParameterProperties,
      collect_shipping: {
        type: ["boolean", "null"] as const,
        description: "Whether to collect shipping address information from customers."
      } as OpenAIToolParameterProperties,
      shipping_countries: {
        type: ["array", "null"] as const,
        items: {
          type: "string" as const
        },
        description: "List of two-letter country codes where shipping is available."
      } as OpenAIToolParameterProperties,
      collect_billing: {
        type: ["boolean", "null"] as const,
        description: "Whether to collect billing address information from customers."
      } as OpenAIToolParameterProperties,
      collect_phone: {
        type: ["boolean", "null"] as const,
        description: "Whether to collect phone number from customers."
      } as OpenAIToolParameterProperties,
      save_payment_method: {
        type: ["boolean", "null"] as const,
        description: "Whether to allow customers to save payment method for future purchases."
      } as OpenAIToolParameterProperties,
      after_completion_type: {
        type: ["string", "null"] as const,
        description: "What happens after payment completion: 'hosted_confirmation' or 'redirect'."
      } as OpenAIToolParameterProperties,
      after_completion_url: {
        type: ["string", "null"] as const,
        description: "URL to redirect customers to after successful payment (when after_completion_type is 'redirect')."
      } as OpenAIToolParameterProperties,
      step: {
        type: ["string", "null"] as const,
        description: "Current step in the conversational flow."
      } as OpenAIToolParameterProperties,
      _rawUserInput: {
        type: ["string", "null"] as const,
        description: "Raw user input for conversational processing."
      } as OpenAIToolParameterProperties
    },
    required: ["step"],
    additionalProperties: false as const
  };
  
  cacheTTLSeconds = 0; // Don't cache payment link results
  private stripe: Stripe | null;
  categories = ["payment", "e-commerce", "finance", "stripe", "business"];
  version = "2.0.0"; // Updated version for Phase 3
  metadata = { 
    provider: "Stripe API", 
    paymentLinkType: "comprehensive",
    features: ["tax_collection", "shipping", "inventory", "conversational_flow"],
    phase: "3",
    requires_stripe_account: true,
    handles_seller_onboarding: false,
    purpose: "payment_links_only"
  };

  constructor() {
    super();
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    
    if (!stripeSecretKey) {
      this.log("error", "Stripe API Key (STRIPE_SECRET_KEY) is missing. Tool will fail.");
      this.stripe = null;
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-05-28.basil',
        typescript: true,
        appInfo: {
          name: 'Minato AI Companion',
          version: '2.0.0',
        },
      });
    }
  }
  
  private async extractStripeParameters(userInput: string, currentStep?: string): Promise<Partial<StripePaymentLinkInput>> {
    // First, check for direct product name response patterns
    if (currentStep === "collect_product_name" || currentStep === "initial") {
      // Check for common confirmation patterns for product names
      const confirmationRegex = /^(?:yes|yeah|correct|that's right|right|ok|okay|sure|fine)(?:\s+(?:the\s+)?(?:title|name|product|item)\s+(?:is|will be|should be)?)?\s+(.+)$/i;
      const directNameRegex = /^(?:my\s+product\s+(?:is|will be|should be)?\s+)?(.+)$/i;
      
      const confirmMatch = userInput.match(confirmationRegex);
      if (confirmMatch && confirmMatch[1]) {
        logger.info(`[StripePaymentLinkTool] Detected confirmation pattern with product name: ${confirmMatch[1]}`);
        return {
          product_name: confirmMatch[1].trim(),
          step: "collect_price"
        };
      }
      
      const directMatch = userInput.match(directNameRegex);
      if (directMatch && directMatch[1]) {
        logger.info(`[StripePaymentLinkTool] Detected direct product name: ${directMatch[1]}`);
        return {
          product_name: directMatch[1],
          step: "collect_price"
        };
      }
    }
    
    // Handle price extraction when in price collection step
    if (currentStep === "collect_price") {
      // Pattern to extract price information - handles various formats
      // Examples: $25, 25 dollars, 25.99, $25.99 USD, etc.
      const priceRegex = /(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd|€|£|euro?s?|pounds?)?/i;
      const match = userInput.match(priceRegex);
      
      if (match && match[1]) {
        const price = parseFloat(match[1]) * 100; // Convert to cents
        
        // Try to extract currency
        let currency = "usd"; // Default
        if (userInput.includes("€") || /euro/i.test(userInput)) {
          currency = "eur";
        } else if (userInput.includes("£") || /pound/i.test(userInput)) {
          currency = "gbp";
        }
        
        logger.info(`[StripePaymentLinkTool] Extracted price: ${price} cents (${currency})`);
        return {
          price: price,
          currency: currency,
          step: "collect_description"
        };
      }
    }
    
    // Handle description collection
    if (currentStep === "collect_description") {
      // Check if user wants to skip description
      if (/^(skip|no description|no thanks|none|no|pass)$/i.test(userInput.trim())) {
        logger.info(`[StripePaymentLinkTool] User chose to skip description`);
        return {
          description: "",
          step: "review_details"
        };
      } 
      // Check if user is confirming a description with phrases like "ok let keep this description"
      else if (/^(ok|okay|yes|sure|fine|good|great|perfect|nice|awesome|let'?s? keep|use) .*(descrip|bio)/i.test(userInput)) {
        // Extract the description part after confirmation phrase
        const match = userInput.match(/^(?:ok|okay|yes|sure|fine|good|great|perfect|nice|awesome|let'?s? keep|use) .*(descrip|bio)[^:]*:?\s*([\s\S]+)$/i);
        if (match && match[2]) {
          const description = match[2].trim();
          logger.info(`[StripePaymentLinkTool] User confirmed description: ${description.substring(0, 50)}...`);
          return {
            description: description,
            step: "review_details"
          };
        }
      }
      
      // If the input is more than 20 characters, it's probably a description
      if (userInput.trim().length > 20) {
        logger.info(`[StripePaymentLinkTool] Using input as description: ${userInput.substring(0, 50)}...`);
        return {
          description: userInput.trim(),
          step: "review_details"
        };
      }
      
      // For shorter inputs, use the entire input as the description
      logger.info(`[StripePaymentLinkTool] Using short input as description: ${userInput}`);
      return {
        description: userInput.trim(),
        step: "review_details"
      };
    }
    
    // Handle review step responses
    if (currentStep === "review_details") {
      // Improved "create link" command detection - HIGH PRIORITY CHECK
      // This now captures more variations like "let's create the link", "i'm ready to create the link", etc.
      if (/(?:(?:let'?s|i'?m ready to|please|can you|now|go ahead and|you can|just)?\s+)?(?:create|generate|make|build|finalize|finish|proceed with)(?:\s+(?:the|a|my|this))?\s+(?:stripe\s+)?(?:payment\s+)?link/i.test(userInput) ||
          /(?:create|generate|make) (?:it|one|this)/i.test(userInput) ||
          /^(?:create|generate|make|build|done|finished|ready|proceed|let'?s go)$/i.test(userInput.trim())) {
        logger.info(`[StripePaymentLinkTool] User requested to create the payment link (expanded patterns)`);
        return {
          step: "ready_to_create"
        };
      }
      
      // Check for "add image" instruction to move to image upload step
      if (/(?:add|upload|include|attach|put|place)(?:\s+(?:an|a|the|product|some))?\s+(?:image|picture|photo)/i.test(userInput)) {
        logger.info(`[StripePaymentLinkTool] User requested to add an image`);
        return {
          step: "upload_image"
        };
      }
      
      // Check for showing advanced options
      if (/(?:show|display|view|see|what are|tell me about)(?:\s+(?:the|all|more))?\s+(?:advanced|additional|other|more|extra)\s+(?:options|features|settings|configurations)/i.test(userInput)) {
        logger.info(`[StripePaymentLinkTool] User requested to see advanced options`);
        return {
          step: "review_details"
        };
      }
      
      // Extract feature requests from input
      const features: Partial<StripePaymentLinkInput> = {};
      let featureRequested = false;
      let create_after_feature_update = false;
      
      // First pass - check for explicit quantity settings, which indicate a feature toggle
      const quantityMatch = /(?:quantity|items?|let(?:'s)?|do)(?:\s+(?:the|a|my|do))?\s+(?:quantity|items?)?(?:\s+(?:to|of|limit|max|maximum|set\s+to))?\s+(\d+)/i.exec(userInput);
      if (quantityMatch && quantityMatch[1]) {
        const maxQuantity = parseInt(quantityMatch[1], 10);
        if (!isNaN(maxQuantity) && maxQuantity > 0) {
          features.quantity_adjustable = true;
          features.max_quantity = maxQuantity;
          features.min_quantity = 1;
          featureRequested = true;
          create_after_feature_update = true; // User provided specific details, likely wants to proceed
          logger.info(`[StripePaymentLinkTool] User requested quantity adjustment with max: ${maxQuantity}`);
        }
      }
      
      // Check for subscription features
      const subscriptionRegex = /(?:add|enable|setup|set\s+up|create|make it|i want)(?:\s+(?:a|an))?\s+subscription(?:\s+(?:with|for|as))?\s+(daily|weekly|monthly|yearly|annual)/i;
      const subscriptionMatch = userInput.match(subscriptionRegex);
      if (subscriptionMatch && subscriptionMatch[1]) {
        let intervalType = subscriptionMatch[1].toLowerCase();
        // Convert 'annual' to 'year'
        if (intervalType === 'annual') intervalType = 'year';
        // For consistency with Stripe API
        if (intervalType === 'yearly') intervalType = 'year';
        if (intervalType === 'monthly') intervalType = 'month';
        if (intervalType === 'weekly') intervalType = 'week';
        if (intervalType === 'daily') intervalType = 'day';
        
        features.is_subscription = true;
        features.interval_type = intervalType as any;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested subscription with interval: ${intervalType}`);
      } else if (/(?:add|enable|setup|set\s+up|create|make it|i want)(?:\s+(?:a|an))?\s+subscription/i.test(userInput)) {
        // Default to monthly if no interval specified
        features.is_subscription = true;
        features.interval_type = 'month';
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested subscription (defaulting to monthly)`);
      }
      
      // Check for trial period
      const trialRegex = /(?:add|enable|set\s+up|include)(?:\s+(?:a|an))?\s+(\d+)(?:-|\s+)?day(?:s)?\s+(?:free\s+)?trial/i;
      const trialMatch = userInput.match(trialRegex);
      if (trialMatch && trialMatch[1]) {
        const trialDays = parseInt(trialMatch[1], 10);
        if (!isNaN(trialDays) && trialDays > 0) {
          features.trial_days = trialDays;
          // If adding a trial, ensure it's a subscription
          if (!features.is_subscription) {
            features.is_subscription = true;
            features.interval_type = 'month';
          }
          featureRequested = true;
          logger.info(`[StripePaymentLinkTool] User requested ${trialDays}-day free trial`);
        }
      }
      
      // Check for shipping and billing address collection
      if (/(?:collect|gather|add|request|enable|include|need)(?:\s+(?:a|an|the))?\s+shipping\s+(?:address|info|details|information)/i.test(userInput)) {
        features.collect_shipping = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to collect shipping address`);
        
        // Check if specific countries are mentioned
        const countriesRegex = /(?:for|in|to|available\s+in)\s+(?:the\s+)?(US|USA|United\s+States|UK|United\s+Kingdom|Canada|Australia|Germany|France|Japan|worldwide|global)/i;
        const countriesMatch = userInput.match(countriesRegex);
        if (countriesMatch && countriesMatch[1]) {
          const countryName = countriesMatch[1].toLowerCase();
          let countryCode = '';
          
          // Map common country names to ISO codes
          if (countryName.includes('us') || countryName.includes('united states')) {
            countryCode = 'US';
          } else if (countryName.includes('uk') || countryName.includes('united kingdom')) {
            countryCode = 'GB';
          } else if (countryName.includes('canada')) {
            countryCode = 'CA';
          } else if (countryName.includes('australia')) {
            countryCode = 'AU';
          } else if (countryName.includes('germany')) {
            countryCode = 'DE';
          } else if (countryName.includes('france')) {
            countryCode = 'FR';
          } else if (countryName.includes('japan')) {
            countryCode = 'JP';
          } else if (countryName.includes('worldwide') || countryName.includes('global')) {
            // For worldwide, add major countries
            features.shipping_countries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'];
          }
          
          if (countryCode && !features.shipping_countries) {
            features.shipping_countries = [countryCode];
            logger.info(`[StripePaymentLinkTool] Set shipping to country: ${countryCode}`);
          }
        } else {
          // Default to US if no country specified
          features.shipping_countries = ['US'];
        }
      }
      
      if (/(?:collect|gather|add|request|enable|include|need)(?:\s+(?:a|an|the))?\s+billing\s+(?:address|info|details|information)/i.test(userInput)) {
        features.collect_billing = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to collect billing address`);
      }
      
      // Check for phone number collection
      if (/(?:collect|gather|add|request|enable|include|need)(?:\s+(?:a|an|the))?\s+phone\s+(?:number|#)/i.test(userInput)) {
        features.collect_phone = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to collect phone numbers`);
      }
      
      // Check for tax collection
      if (/(?:enable|add|setup|set\s+up|configure|turn\s+on|include)(?:\s+(?:automatic|auto))?\s+tax(?:\s+collection)?/i.test(userInput)) {
        features.enable_tax_collection = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to enable tax collection`);
      }
      
      // Check for save payment method
      if (/(?:save|store|remember|keep)(?:\s+(?:customer|client|user))?\s+(?:payment|card|credit\s+card)(?:\s+(?:method|details|info|information))?/i.test(userInput)) {
        features.save_payment_method = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to save payment methods`);
      }
      
      // Check for redirect after payment
      const redirectRegex = /(?:redirect|send)(?:\s+(?:customers?|users?|clients?|people))?\s+(?:to|after\s+payment\s+to)\s+(https?:\/\/\S+)/i;
      const redirectMatch = userInput.match(redirectRegex);
      if (redirectMatch && redirectMatch[1]) {
        const redirectUrl = redirectMatch[1].trim();
        features.after_completion_type = 'redirect';
        features.after_completion_url = redirectUrl;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested redirect after payment to: ${redirectUrl}`);
      }
      
      // Check for disabling promotion codes
      if (/(?:no|disable|remove|without|but\s+no)\s+(?:promotion|promo)/i.test(userInput)) {
        features.allow_promotion_codes = false;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to disable promotion codes`);
      } 
      // Only check for enabling if there's no disabling request
      else if (/(?:promotion|promo)\s+codes?/i.test(userInput)) {
        features.allow_promotion_codes = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to add promotion codes`);
      }
      
      // Check for disabling PDF invoices
      if (/(?:no|disable|remove|without|but\s+no)\s+(?:pdf\s+invoices?|invoices?)/i.test(userInput)) {
        features.enable_pdf_invoices = false;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to disable PDF invoices`);
      }
      // Only check for enabling if there's no disabling request
      else if (/(?:pdf\s+invoices?|invoices?)/i.test(userInput)) {
        features.enable_pdf_invoices = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to add PDF invoices`);
      }
      
      // Check for disabling quantity adjustment (if not already set by specific quantity)
      if (!features.quantity_adjustable && /(?:no|disable|remove|without|but\s+no)\s+(?:quantity|multiple)/i.test(userInput)) {
        features.quantity_adjustable = false;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to disable quantity adjustment`);
      }
      // Only check for enabling if there's no disabling request and no specific quantity
      else if (!features.quantity_adjustable && /(?:quantity\s+adjustment|multiple\s+items?)/i.test(userInput)) {
        features.quantity_adjustable = true;
        featureRequested = true;
        logger.info(`[StripePaymentLinkTool] User requested to add quantity adjustment`);
      }
      
      // If any features were detected, return them
      if (featureRequested) {
        logger.info(`[StripePaymentLinkTool] Features requested: ${JSON.stringify(features)}`);
        
        // If the user provided specific settings, proceed to image upload
        if (create_after_feature_update) {
          logger.info(`[StripePaymentLinkTool] User provided specific feature settings, proceeding to image upload`);
          return {
            ...features,
            step: "upload_image"
          };
        }
        
        return {
          ...features,
          step: "review_details"
        };
      }
    }
    
    // Handle image upload step
    if (currentStep === "upload_image") {
      // Check if the user is providing an image URL directly
      if (userInput.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i)) {
        const imageUrl = userInput.trim();
        logger.info(`[StripePaymentLinkTool] User provided image URL directly: ${imageUrl}`);
        return {
          image_url: imageUrl,
          step: "ready_to_create"
        };
      }
      
      // Improved skip pattern detection for image upload
      if (/^(skip|no image|no thanks|none|no|pass|later|continue without|proceed without|don'?t need|not now)$/i.test(userInput.trim()) || 
          /(?:skip|don'?t need|proceed without)\s+(?:the\s+)?(?:image|photo|picture)/i.test(userInput)) {
        logger.info(`[StripePaymentLinkTool] User chose to skip image upload`);
        return {
          step: "ready_to_create"
        };
      }
      
      // Check for "create link" in image upload step as well
      if (/(?:(?:let'?s|i'?m ready to|please|can you|now|go ahead and|you can|just)?\s+)?(?:create|generate|make|build|finalize|finish|proceed with)(?:\s+(?:the|a|my|this))?\s+(?:stripe\s+)?(?:payment\s+)?link/i.test(userInput) ||
          /(?:create|generate|make) (?:it|one|this)/i.test(userInput) ||
          /^(?:create|generate|make|build|done|finished|ready|proceed|let'?s go)$/i.test(userInput.trim())) {
        logger.info(`[StripePaymentLinkTool] User requested to create the payment link from image upload step`);
        return {
          step: "ready_to_create"
        };
      }
    }
    
    // Generic "create link" check for any step - more comprehensive pattern
    if (/(?:(?:let'?s|i'?m ready to|please|can you|now|go ahead and|you can|just)?\s+)?(?:create|generate|make|build|finalize|finish|proceed with)(?:\s+(?:the|a|my|this))?\s+(?:stripe\s+)?(?:payment\s+)?link/i.test(userInput) ||
        /(?:create|generate|make) (?:it|one|this)/i.test(userInput) ||
        /^(?:create|generate|make|build|done|finished|ready|proceed|let'?s go)$/i.test(userInput.trim())) {
      logger.info(`[StripePaymentLinkTool] User requested to create the payment link (generic check)`);
      return {
        step: "ready_to_create"
      };
    }
    
    // Improved check for specific "next step" or "proceed" triggers
    if (/(?:next|proceed|continue|go ahead|move on|let'?s go|what'?s next|next step|ready|move forward|i'?m done|okay|ok)/i.test(userInput)) {
      logger.info(`[StripePaymentLinkTool] User requested to proceed to next step`);
      // For review details, proceed to image upload
      if (currentStep === "review_details") {
        return {
          step: "upload_image"
        };
      }
      // For image upload, proceed to create
      else if (currentStep === "upload_image") {
        return {
          step: "ready_to_create"
        };
      }
    }
    
    // Enhanced extraction prompt for comprehensive Stripe Payment Link creation
    const extractionPrompt = `
You are an expert parameter extractor for Minato's StripePaymentLinkTool which creates payment links for products or services.

Current Step: ${currentStep || 'initial'}
User Request: "${userInput.replace(/\"/g, '\\"')}"

For router purposes, extract ONLY:
- product_name: The name of the product or service
- price: Price in cents (e.g., $25 = 2500)
- currency: Optional 3-letter currency code
- description: Optional product description
- image_url: URL of product image if provided

For multi-step conversation, KEEP IT SIMPLE with minimal inference.
`;

    try {
      // Define schema for extraction based on the input interface
      const paramSchema = {
        type: "object" as const,
        properties: {
          product_name: { type: ["string", "null"] as const },
          price: { type: ["number", "null"] as const },
          currency: { type: ["string", "null"] as const },
          description: { type: ["string", "null"] as const },
          image_url: { type: ["string", "null"] as const },
          step: { type: ["string", "null"] as const }
        },
        required: ["product_name", "price", "currency", "description", "step"]
      };

      let extractionResult: Partial<StripePaymentLinkInput> | null = null;
      
      // Create timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("Parameter extraction timed out")), 5000); // 5 second timeout
      });
      
      // Race the extraction against the timeout
      try {
        extractionResult = await Promise.race([
          generateStructuredJson<Partial<StripePaymentLinkInput>>(
            extractionPrompt,
            userInput,
            paramSchema,
            "StripePaymentLinkParameters",
            [], // no history context needed
            "gpt-4o-mini"
          ),
          timeoutPromise
        ]) as Partial<StripePaymentLinkInput>;
      } catch (error) {
        logger.error("[StripePaymentLinkTool] JSON generation failed or timed out:", error);
        extractionResult = null;
      }
      
      // Make sure we have values for all required parameters, even if they're null
      const result: Partial<StripePaymentLinkInput> = extractionResult || {};
      
      // Set defaults for any missing parameters
      if (!('product_name' in result)) result.product_name = "";
      if (!('price' in result)) result.price = undefined;
      if (!('currency' in result)) result.currency = "";
      if (!('description' in result)) result.description = "";
      if (!('image_url' in result)) result.image_url = null;
      if (!('step' in result)) result.step = currentStep || "initial";
      
      // Validate that we have proper types
      if (result.product_name === null) result.product_name = "";
      if (result.currency === null) result.currency = "";
      if (result.description === null) result.description = "";
      if (result.step === null) result.step = currentStep || "initial";
      
      logger.info("[StripePaymentLinkTool] Successfully extracted parameters:", JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error("[StripePaymentLinkTool] Parameter extraction failed:", error);
      // Return default parameters with empty strings instead of null
      return {
        product_name: "",
        price: undefined,
        currency: "",
        description: "",
        image_url: null,
        step: currentStep || "initial"
      };
    }
  }

  private validateCountryCode(country: string): string | null {
    // Convert common country names/formats to ISO codes
    const countryMap: { [key: string]: string } = {
      'united states': 'US',
      'usa': 'US',
      'us': 'US',
      'america': 'US',
      'canada': 'CA',
      'ca': 'CA',
      'united kingdom': 'GB',
      'uk': 'GB',
      'gb': 'GB',
      'britain': 'GB',
      'england': 'GB',
      'germany': 'DE',
      'de': 'DE',
      'france': 'FR',
      'fr': 'FR',
      'australia': 'AU',
      'au': 'AU',
      'japan': 'JP',
      'jp': 'JP',
      'worldwide': 'WORLDWIDE'
    };
    
    const normalized = country.toLowerCase().trim();
    return countryMap[normalized] || (country.length === 2 ? country.toUpperCase() : null);
  }

  // Helper method to extract product info from context or previous messages
  private extractProductInfoFromContext(input: StripePaymentLinkInput): Partial<StripePaymentLinkInput> {
    const logPrefix = `[StripePaymentLinkTool]`;
    const result: Partial<StripePaymentLinkInput> = {};
    
    // First check if we already have info in the current input
    if (input.product_name && input.product_name.trim() !== "") {
      result.product_name = input.product_name;
    }
    if (input.price !== undefined && input.price !== null && input.price > 0) {
      result.price = input.price;
      result.currency = input.currency || "usd";
    }
    if (input.description !== undefined && input.description !== null) {
      result.description = input.description;
    }
    
    // If we don't have complete info, try to extract from context
    if ((!result.product_name || !result.price) && input._context) {
      logger.info(`${logPrefix} Attempting to extract product info from context`);
      
      // Check if there's a current draft in the context
      if (input._context.current_draft) {
        const draft = input._context.current_draft;
        logger.info(`${logPrefix} Found current_draft in context: ${JSON.stringify(draft)}`);
        
        if (draft.product_name && !result.product_name) {
          result.product_name = draft.product_name;
          logger.info(`${logPrefix} Extracted product name from draft: ${result.product_name}`);
        }
        if (draft.price && !result.price) {
          result.price = draft.price;
          logger.info(`${logPrefix} Extracted price from draft: ${result.price}`);
        }
        if (draft.currency && !result.currency) {
          result.currency = draft.currency;
        }
        if (draft.description && !result.description) {
          result.description = draft.description;
        }
      }
      
      // Try to extract from previous messages in conversation history
      if (input._context.conversationHistory && Array.isArray(input._context.conversationHistory)) {
        logger.info(`${logPrefix} Searching conversation history for product details`);
        
        // Look for patterns in previous messages that might indicate product details
        for (const message of input._context.conversationHistory) {
          const messageContent = typeof message.content === 'string' ? message.content : '';
          
          // Look for product name patterns
          if (!result.product_name) {
            const productPatterns = [
              /(?:product|item)\s+(?:name|called|titled)[:"]?\s+["']?([^"'.!?]+)["']?/i,
              /selling\s+(?:a|an|my)?\s+["']?([^"'.!?]+)["']?/i,
              /create\s+(?:a|an)?\s+payment\s+link\s+for\s+(?:my|a|an)?\s+["']?([^"'.!?]+)["']?/i
            ];
            
            for (const pattern of productPatterns) {
              const match = messageContent.match(pattern);
              if (match && match[1] && match[1].trim().length > 0) {
                result.product_name = match[1].trim();
                logger.info(`${logPrefix} Extracted product name from history: ${result.product_name}`);
                break;
              }
            }
          }
          
          // Look for price patterns
          if (!result.price) {
            const pricePatterns = [
              /(?:price|cost|selling for)[:"]?\s+\$?(\d+(?:\.\d{1,2})?)/i,
              /\$(\d+(?:\.\d{1,2})?)(?:\s+(?:USD|dollars))?/i
            ];
            
            for (const pattern of pricePatterns) {
              const match = messageContent.match(pattern);
              if (match && match[1]) {
                // Convert to cents
                result.price = Math.round(parseFloat(match[1]) * 100);
                logger.info(`${logPrefix} Extracted price from history: ${result.price} cents`);
                break;
              }
            }
          }
        }
      }
    }
    
    return result;
  }

  // Helper method to extract saved product details from user state
  private extractProductDetailsFromState(userId: string, userState: any): Partial<StripePaymentLinkInput> {
    const logPrefix = `[StripePaymentLinkTool]`;
    const result: Partial<StripePaymentLinkInput> = {};
    
    try {
      // Check if we have stripe_seller_details in userState
      if (userState && userState.stripe_seller_details) {
        const sellerDetails = userState.stripe_seller_details;
        
        // If we have saved product details from a previous session
        if (sellerDetails.saved_product_details) {
          const savedDetails = sellerDetails.saved_product_details;
          logger.info(`${logPrefix} Found saved product details in user state: ${JSON.stringify(savedDetails)}`);
          
          if (savedDetails.product_name) {
            result.product_name = savedDetails.product_name;
          }
          if (savedDetails.price) {
            result.price = savedDetails.price;
          }
          if (savedDetails.currency) {
            result.currency = savedDetails.currency;
          }
          if (savedDetails.description) {
            result.description = savedDetails.description;
          }
          if (savedDetails.image_url) {
            result.image_url = savedDetails.image_url;
          }
          if (savedDetails.quantity_adjustable !== undefined) {
            result.quantity_adjustable = savedDetails.quantity_adjustable;
          }
          if (savedDetails.allow_promotion_codes !== undefined) {
            result.allow_promotion_codes = savedDetails.allow_promotion_codes;
          }
          if (savedDetails.enable_pdf_invoices !== undefined) {
            result.enable_pdf_invoices = savedDetails.enable_pdf_invoices;
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`${logPrefix} Error extracting product details from user state:`, error);
      return {};
    }
  }

  async execute(input: StripePaymentLinkInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = `[StripePaymentLinkTool]`;
    
    // Set default step to 'initial' if not provided
    if (!input.step) {
      input.step = "initial";
    }
    
    // Ensure _rawUserInput is preserved throughout the flow
    if (input._rawUserInput) {
      logger.info(`${logPrefix} Received raw user input: "${input._rawUserInput.substring(0, 50)}${input._rawUserInput.length > 50 ? '...' : ''}"`);
    } else if (input._context?.lastUserMessage) {
      // If _rawUserInput is missing but we have lastUserMessage in context, use that
      input._rawUserInput = input._context.lastUserMessage;
      logger.info(`${logPrefix} Using lastUserMessage as raw input: "${input._rawUserInput?.substring(0, 50)}${input._rawUserInput && input._rawUserInput.length > 50 ? '...' : ''}"`);
    }
    
    // Check for resume patterns after Stripe account setup
    const isResumeAfterSetup = input._rawUserInput && 
                              (
                                /(?:yes|yeah|sure|ok|okay|continue|proceed|let'?s (?:continue|proceed|resume))/i.test(input._rawUserInput) ||
                                /(?:back|return) to (?:payment|link)/i.test(input._rawUserInput) ||
                                /(?:create|make|generate|finish) (?:the|my) (?:payment|link)/i.test(input._rawUserInput) ||
                                /(?:resume|continue) (?:creating|making|setting up) (?:payment|link)/i.test(input._rawUserInput)
                              );
    
    // Check if returning from seller onboarding and look for saved product details
    const comingFromSellerOnboarding = input._context?.previous_tool === "StripeSellerOnboardingTool";
    const savedProductDetails = input._context?.savedProductDetails;
    
    if ((comingFromSellerOnboarding || isResumeAfterSetup) && (savedProductDetails || input._context?.userState)) {
      logger.info(`${logPrefix} Detected return from StripeSellerOnboardingTool or resuming after setup`);
      
      // First try to get saved details from the context
      const details = savedProductDetails || {};
      
      // Then try to get from user state if available
      if (!details.product_name && input._context?.userState && input._context?.userId) {
        const stateDetails = this.extractProductDetailsFromState(input._context.userId, input._context.userState);
        
        // Merge the details
        Object.keys(stateDetails).forEach(key => {
          if (!details[key]) {
            details[key] = stateDetails[key as keyof StripePaymentLinkInput];
          }
        });
      }
      
      // Apply saved details to current input if they exist and current values are missing
      if (details.product_name && !input.product_name) {
        input.product_name = details.product_name;
        logger.info(`${logPrefix} Restored product_name: ${input.product_name}`);
      }
      if (details.price && !input.price) {
        input.price = details.price;
        logger.info(`${logPrefix} Restored price: ${input.price}`);
      }
      if (details.currency && !input.currency) {
        input.currency = details.currency;
        logger.info(`${logPrefix} Restored currency: ${input.currency}`);
      }
      if (details.description && !input.description) {
        input.description = details.description;
        logger.info(`${logPrefix} Restored description: ${input.description}`);
      }
      if (details.image_url && !input.image_url) {
        input.image_url = details.image_url;
        logger.info(`${logPrefix} Restored image_url`);
      }
      
      // If we have enough details, move to the right step
      const hasProductName = input.product_name && input.product_name.trim() !== "";
      const hasPrice = input.price !== undefined && input.price !== null && input.price > 0;
      const hasDescription = input.description !== undefined && input.description !== null;
      
      if (hasProductName && hasPrice) {
        if (hasDescription) {
          input.step = "review_details";
          logger.info(`${logPrefix} Resuming at review_details step with saved details`);
        } else {
          input.step = "collect_description";
          logger.info(`${logPrefix} Resuming at collect_description step with saved details`);
        }
      } else if (hasProductName) {
        input.step = "collect_price";
        logger.info(`${logPrefix} Resuming at collect_price step with saved details`);
      } else {
        input.step = "collect_product_name";
        logger.info(`${logPrefix} Resuming at collect_product_name step with saved details`);
      }
      
      // If resuming from Stripe setup and we have all the key details, show a welcome back message
      if (isResumeAfterSetup && hasProductName && hasPrice) {
        const formattedPrice = ((input.price || 0) / 100).toFixed(2);
        const currencySymbol = input.currency === "eur" ? "€" : input.currency === "gbp" ? "£" : "$";
        
        return {
          result: `**Great! Let's continue creating your payment link.**

I've saved the details you provided earlier:
- Product: ${input.product_name}
- Price: ${currencySymbol}${formattedPrice}
${input.description ? `- Description: ${input.description}` : ''}

Let's pick up where we left off.`,
          structuredData: { 
            result_type: "payment_link", 
            source_api: "stripe", 
            query: { ...input }, 
            payment_link: null, 
            next_step: hasDescription ? "review_details" : "collect_description",
            ui_action: "none"
          }
        };
      }
    }
    
    // Check if this appears to be a restart of the conversation
    const isRestart = input._rawUserInput && 
                      (
                        /stripe account|set ?up (?:a|my) (?:stripe|account)/i.test(input._rawUserInput) ||
                        /let'?s (?:start|begin|create)/i.test(input._rawUserInput)
                      );
    
    // Extract any product info from the context to maintain conversation continuity
    if (isRestart) {
      logger.info(`${logPrefix} Detected possible conversation restart. Checking for existing product info in context.`);
      const contextInfo = this.extractProductInfoFromContext(input);
      
      // Only use context info if we don't already have this information
      if (contextInfo.product_name && !input.product_name) {
        input.product_name = contextInfo.product_name;
        logger.info(`${logPrefix} Using product name from context: ${input.product_name}`);
      }
      if (contextInfo.price && !input.price) {
        input.price = contextInfo.price;
        input.currency = contextInfo.currency || "usd";
        logger.info(`${logPrefix} Using price from context: ${input.price} ${input.currency}`);
      }
      if (contextInfo.description && !input.description) {
        input.description = contextInfo.description;
        logger.info(`${logPrefix} Using description from context: ${input.description?.substring(0, 30)}...`);
      }
    }
    
    // Track if we have the key pieces of information
    const hasProductName = input.product_name && input.product_name.trim() !== "";
    const hasPrice = input.price !== undefined && input.price !== null && input.price > 0;
    const hasDescription = input.description !== undefined && input.description !== null;
    
    logger.info(`${logPrefix} Execute called with step: ${input.step}, product_name: ${input.product_name || 'none'}, price: ${input.price || 'none'}, description: ${input.description ? 'provided' : 'none'}`);
    
    // First check: Always check for "create link" request, no matter what step we're on
    // This takes priority over all other checks, but first validate Stripe account if creating
    if (input._rawUserInput && typeof input._rawUserInput === 'string' && 
        /\b(?:create|generate|make|build|done|proceed|finish)(?:\s+(?:the|a|my))?\s+(?:stripe\s+)?(?:payment\s+)?link/i.test(input._rawUserInput) && 
        hasProductName && hasPrice) {
      
      // Check for Stripe account configuration first
      try {
        const stripeConfig = await this.verifyStripeConfiguration();
        if (!stripeConfig.isConfigured && stripeConfig.needsOnboarding) {
          logger.info(`${logPrefix} User needs to set up Stripe account before creating payment link`);
          
          // Save their product details so they don't lose progress
          const formattedPrice = ((input.price || 0) / 100).toFixed(2);
          const currencySymbol = input.currency === "eur" ? "€" : input.currency === "gbp" ? "£" : "$";
          
          return {
            result: `**Stripe Account Setup Required**

I see you want to create a payment link for "${input.product_name}" priced at ${currencySymbol}${formattedPrice}. 

Before we can create your payment link, you'll need to set up a Stripe account first. This is a quick process that will allow you to:

1. Receive payments securely
2. Get paid directly to your bank account
3. Manage your products and payment links

Would you like me to guide you through setting up your Stripe account now? Once that's done, we can immediately create your payment link with all the details you've already provided.`,
            structuredData: { 
              result_type: "payment_link", 
              source_api: "stripe", 
              query: { ...input, _rawUserInput: input._rawUserInput }, 
              payment_link: null, 
              next_step: "redirect_to_onboarding",
              needs_onboarding: true,
              ui_action: "none",
              saved_product_details: {
                product_name: input.product_name,
                price: input.price,
                currency: input.currency || "usd",
                description: input.description
              }
            }
          };
        }
      } catch (error) {
        // Log but continue - don't stop the flow if verification fails
        logger.error(`${logPrefix} Error during Stripe verification:`, error);
      }
      
      logger.info(`${logPrefix} User requested to create link. Moving to ready_to_create step.`);
      input.step = "ready_to_create";
      return this.continueProductLinkFlow(input);
    }
    
    // Handle specific case where user is trying to set up a Stripe account
    if (input._rawUserInput && typeof input._rawUserInput === 'string' &&
        /(?:setup|set up|create|make|get|register|open)(?:\s+(?:a|my|an))?\s+(?:new\s+)?(?:stripe\s+)?account/i.test(input._rawUserInput)) {
      
      logger.info(`${logPrefix} User is asking about setting up a Stripe account, redirecting to StripeSellerOnboardingTool`);
      
      // Save any product details they might have already provided
      const savedDetails = hasProductName ? {
        product_name: input.product_name,
        price: input.price,
        currency: input.currency || "usd",
        description: input.description
      } : undefined;
      
      return {
        result: `I'll help you set up your Stripe account so you can start accepting payments.

First, let me ask you a couple of quick questions to personalize your Stripe account setup:

1. **In which country** is your business primarily based, or where do you reside if you're selling as an individual?
   
2. **Are you selling as an individual**, or do you have a registered business/company?`,
        structuredData: { 
          result_type: "payment_link", 
          source_api: "stripe", 
          query: { ...input }, 
          payment_link: null, 
          next_step: "redirect_to_onboarding",
          needs_onboarding: true,
          ui_action: "none",
          saved_product_details: savedDetails
        }
      };
    }

    // For initial router calls with empty parameters, start conversational flow
    const isInitialCall = !hasProductName && !hasPrice && (input.step === "initial");
    
    if (isInitialCall) {
      logger.info(`${logPrefix} Starting initial product link flow`);
      return this.startProductLinkFlow(input);
    }
    
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      try {
        // Set a timeout for parameter extraction to prevent hanging
        const extractionTimeout = 8000; // 8 seconds
        const extractionPromise = this.extractStripeParameters(input._rawUserInput, input.step || undefined);
        
        // Create a timeout promise
        const timeoutPromise = new Promise<Partial<StripePaymentLinkInput>>((resolve) => {
          setTimeout(() => {
            logger.warn(`${logPrefix} Parameter extraction timed out after ${extractionTimeout}ms, using defaults`);
            resolve({});
          }, extractionTimeout);
        });
        
        // Race the extraction against the timeout
        const extractedParams = await Promise.race([extractionPromise, timeoutPromise]);
        
        logger.info(`${logPrefix} Extracted parameters: ${JSON.stringify(extractedParams)}`);
        
        // Only use extracted parameters if they're not already specified
        // and update the step if extraction provides a new step
        Object.keys(extractedParams).forEach(key => {
          if (key === 'step' && extractedParams.step) {
            // Always update step if provided in extraction
            input.step = extractedParams.step;
            logger.info(`${logPrefix} Updated step from extraction: ${input.step}`);
          } else if (key === 'description' && extractedParams.description) {
            // Always update description if provided
            input.description = extractedParams.description;
            logger.info(`${logPrefix} Updated description from extraction: ${input.description?.substring(0, 50)}...`);
            // If we got a description from extraction and we were in collect_description step, move to review step
            if (input.step === 'collect_description') {
              input.step = 'review_details';
              logger.info(`${logPrefix} Moving to review_details after description extraction`);
            }
          } else if (extractedParams[key as keyof StripePaymentLinkInput] !== undefined && 
              extractedParams[key as keyof StripePaymentLinkInput] !== "" &&
              extractedParams[key as keyof StripePaymentLinkInput] !== 0 &&
              (!input[key as keyof StripePaymentLinkInput] || 
               input[key as keyof StripePaymentLinkInput] === "" || 
               input[key as keyof StripePaymentLinkInput] === 0)) {
            (input as any)[key] = extractedParams[key as keyof StripePaymentLinkInput];
            logger.info(`${logPrefix} Updated parameter from extraction: ${key}=${extractedParams[key as keyof StripePaymentLinkInput]}`);
          }
        });
      } catch (error) {
        // Log error but continue - don't fail the whole tool execution if parameter extraction fails
        logger.error(`${logPrefix} Parameter extraction error:`, error);
      }
    }
    
    // Update progress based on the data we have
    // If we have product name but no price and we're in initial step, go to price collection
    if (hasProductName && !hasPrice && (input.step === "initial" || input.step === "collect_product_name")) {
      input.step = "collect_price";
      logger.info(`${logPrefix} Setting step to collect_price because we have product name but no price`);
    }
    
    // If we have both product name and price but still in early steps, go to description collection
    if (hasProductName && hasPrice && 
       (input.step === "initial" || input.step === "collect_product_name" || input.step === "collect_price")) {
      input.step = "collect_description";
      logger.info(`${logPrefix} Setting step to collect_description because we have both product name and price`);
    }
    
    // If we have product name, price, and description, go to review details
    if (hasProductName && hasPrice && hasDescription && 
       (input.step === "initial" || input.step === "collect_product_name" || 
        input.step === "collect_price" || input.step === "collect_description")) {
      input.step = "review_details";
      logger.info(`${logPrefix} Setting step to review_details because we have product, price, and description`);
    }
    
    // Now proceed with the multi-step flow based on the current step or missing parameters
    return await this.continueProductLinkFlow(input);
  }
  
  // Helper method to start the product link creation flow
  private startProductLinkFlow(input: StripePaymentLinkInput): ToolOutput {
    logger.info(`[StripePaymentLinkTool] Starting product link flow for user`);
    
    // First verify if the user has a Stripe account set up
    return {
      result: `**Let's create a payment link!**

Before we begin, I'll need some details about what you're selling:

**What's the name of the product or service you want to sell?** 

Examples: "Premium Online Course", "Handmade Ceramic Mug", "1-Hour Consultation", etc.

Note: To accept payments, you'll need a Stripe account. If you don't have one yet, I'll help you set that up along the way - no worries!`,
      structuredData: { 
        result_type: "payment_link", 
        source_api: "stripe", 
        query: { ...input }, 
        payment_link: null, 
        next_step: "collect_product_name",
        ui_action: "none"
      }
    };
  }
  
  // Helper method to continue the multi-step flow based on current state
  private async continueProductLinkFlow(input: StripePaymentLinkInput): Promise<ToolOutput> {
    const currentStep = input.step || "initial";
    const logPrefix = `[StripePaymentLinkTool]`;
    
    logger.info(`${logPrefix} Continuing flow with step: ${currentStep}, product_name: ${input.product_name}, price: ${input.price}`);
    
    // Determine what information we're missing
    const missingProductName = !input.product_name || input.product_name === "";
    const missingPrice = input.price === undefined || input.price === null || input.price === 0;
    const hasDescription = input.description !== undefined && input.description !== null;
    
    // Step 1: Product name collection - only if we're still missing the product name
    if (missingProductName && (currentStep === "initial" || currentStep === "collect_product_name")) {
      return {
        result: `**What's the name of the product or service you want to sell?** 

This name will appear on the payment page that your customers see.

Examples: "Premium Online Course", "Handmade Ceramic Mug", "1-Hour Consultation", etc.`,
        structuredData: { 
          result_type: "payment_link", 
          source_api: "stripe", 
          query: { ...input }, 
          payment_link: null, 
          next_step: "collect_product_name",
          ui_action: "none"
        }
      };
    }
    
    // Step 2: Price collection - only if we have product name but no price
    if (!missingProductName && missingPrice && 
        (currentStep === "initial" || currentStep === "collect_product_name" || currentStep === "collect_price")) {
      return {
        result: `**What price would you like to charge for "${input.product_name}"?** 

Please specify the amount (e.g., "$25", "€50", "£15").`,
        structuredData: { 
          result_type: "payment_link", 
          source_api: "stripe", 
          query: { ...input }, 
          payment_link: null, 
          next_step: "collect_price",
          ui_action: "none"
        }
      };
    }
    
    // Step 3: Description collection - only if we have product name and price
    if (!missingProductName && !missingPrice && 
        (currentStep === "collect_description" || 
         currentStep === "initial" || 
         currentStep === "collect_price")) {
      const formattedPrice = ((input.price || 0) / 100).toFixed(2);
      const currencySymbol = input.currency === "eur" ? "€" : input.currency === "gbp" ? "£" : "$";
      
      return {
        result: `**Would you like to add a description for your "${input.product_name}" (${currencySymbol}${formattedPrice})?** 

This helps customers understand what they're buying and can increase conversions.

You can include:
• What the customer will receive
• Key features or benefits
• Any important details

Type your description, or say "skip" if you'd prefer to add it later.`,
        structuredData: { 
          result_type: "payment_link", 
          source_api: "stripe", 
          query: { ...input, _rawUserInput: input._rawUserInput }, // Preserve raw user input
          payment_link: null, 
          next_step: "collect_description",
          ui_action: "none"
        }
      };
    }
    
    // Step 4: Review & Options - when we have product, price, and (maybe) description
    if (currentStep === "review_details" || 
        (currentStep === "collect_description" && (hasDescription || input.description === ""))) {
      const formattedPrice = ((input.price || 0) / 100).toFixed(2);
      const currencySymbol = input.currency === "eur" ? "€" : input.currency === "gbp" ? "£" : "$";
      const currentDescription = input.description || "No description provided";
      
      // Check which features are enabled and format their display
      const enabledFeatures: string[] = [];
      
      // Basic features
      if (input.allow_promotion_codes) {
        enabledFeatures.push("✅ Promotion codes - Customers can use discount codes");
      }
      
      if (input.enable_pdf_invoices) {
        enabledFeatures.push("✅ PDF invoices - Customers receive automatic invoices");
      }
      
      if (input.quantity_adjustable) {
        const quantityText = input.max_quantity ? 
          `✅ Quantity adjustment - Customers can buy 1-${input.max_quantity} items` :
          "✅ Quantity adjustment - Customers can buy multiple items";
        enabledFeatures.push(quantityText);
      }
      
      // Advanced features
      if (input.image_url) {
        enabledFeatures.push("✅ Product image - Image will be displayed on payment page");
      }
      
      if (input.is_subscription) {
        const interval = input.interval_type || 'month';
        const count = input.interval_count || 1;
        enabledFeatures.push(`✅ Subscription - Recurring payment every ${count > 1 ? count + ' ' : ''}${interval}${count > 1 ? 's' : ''}`);
      }
      
      if (input.trial_days) {
        enabledFeatures.push(`✅ Free trial - ${input.trial_days} days free trial before first charge`);
      }
      
      if (input.collect_shipping) {
        enabledFeatures.push("✅ Shipping address - Collect shipping details from customers");
      }
      
      if (input.collect_billing) {
        enabledFeatures.push("✅ Billing address - Collect billing details from customers");
      }
      
      if (input.collect_phone) {
        enabledFeatures.push("✅ Phone number - Collect customer phone numbers");
      }
      
      if (input.enable_tax_collection) {
        enabledFeatures.push("✅ Tax collection - Automatically calculate taxes");
      }
      
      if (input.save_payment_method) {
        enabledFeatures.push("✅ Save payment method - Allow customers to save payment info for future purchases");
      }
      
      if (input.after_completion_type === 'redirect' && input.after_completion_url) {
        enabledFeatures.push(`✅ Redirect after payment - Send customers to ${input.after_completion_url}`);
      }
      
      // Format enabled features text
      const featuresText = enabledFeatures.length > 0 
        ? `\n\n**Enabled Features:**\n${enabledFeatures.join('\n')}`
        : '';
        
      // Prepare available features to display
      const availableFeatures = [];
      
      // Basic features
      if (!input.allow_promotion_codes) {
        availableFeatures.push('🎟️ **Promotion codes** - Allow customers to use discount codes');
      }
      
      if (!input.enable_pdf_invoices) {
        availableFeatures.push('📄 **PDF invoices** - Automatically send invoices to customers');
      }
      
      if (!input.quantity_adjustable) {
        availableFeatures.push('🔢 **Quantity adjustment** - Let customers buy multiple items');
      }
      
      if (!input.image_url) {
        availableFeatures.push('🖼️ **Product image** - Add an image of your product');
      }
      
      // Advanced features
      if (!input.is_subscription) {
        availableFeatures.push('🔄 **Subscription** - Set up recurring payments instead of one-time');
      }
      
      if (!input.collect_shipping) {
        availableFeatures.push('📦 **Shipping address** - Collect shipping information');
      }
      
      if (!input.collect_billing) {
        availableFeatures.push('📝 **Billing address** - Collect billing information');
      }
      
      if (!input.collect_phone) {
        availableFeatures.push('📞 **Phone number** - Collect customer phone numbers');
      }
      
      if (!input.enable_tax_collection) {
        availableFeatures.push('💰 **Tax collection** - Automatically calculate taxes');
      }
      
      if (!input.save_payment_method) {
        availableFeatures.push('💳 **Save payment** - Let customers save payment info');
      }
      
      // Prepare available features text
      const availableFeaturesText = availableFeatures.length > 0
        ? `\n\n**Available Features:**\n${availableFeatures.join('\n')}`
        : '';
        
      // Determine if we're showing basic or advanced view
      const showAdvancedOptions = input.is_subscription || 
                                input.collect_shipping || 
                                input.collect_billing || 
                                input.collect_phone || 
                                input.enable_tax_collection || 
                                input.save_payment_method ||
                                input._rawUserInput?.includes('advanced') ||
                                input._rawUserInput?.includes('more options');
                                
      // Show simplified or detailed view based on current options
      if (showAdvancedOptions) {
        // Advanced view
        return {
          result: `**Here's what we have so far:**

📦 **Product:** ${input.product_name}
💰 **Price:** ${currencySymbol}${formattedPrice} ${(input.currency || "USD").toUpperCase()}
📝 **Description:** ${currentDescription}${featuresText}

**Would you like to add any ${enabledFeatures.length > 0 ? 'more' : 'of these'} options?**
${availableFeaturesText}

**Advanced Options:**
- For subscription: "add subscription monthly/yearly" or "add 7-day free trial"
- For addresses: "collect shipping address" or "collect billing address"
- For tax: "enable tax collection" or "collect phone numbers"
- For checkout: "save payment method" or "redirect after payment to [URL]"

Say "add [feature name]" for any you'd like, or **"create link"** if you're ready to proceed!

⚠️ **Note:** To create a payment link, you must have a valid Stripe account with API keys properly configured in your environment.

${enabledFeatures.length > 0 ? '✨ Your Stripe payment link is almost ready! Just say "create link" when you\'re satisfied with the setup.' : ''}`,
          structuredData: { 
            result_type: "payment_link", 
            source_api: "stripe", 
            query: { ...input, _rawUserInput: input._rawUserInput }, // Preserve raw user input
            payment_link: null, 
            next_step: "review_details",
            ui_action: "show_review_modal"
          }
        };
      } else {
        // Basic view (original)
        return {
          result: `**Here's what we have so far:**

📦 **Product:** ${input.product_name}
💰 **Price:** ${currencySymbol}${formattedPrice} ${(input.currency || "USD").toUpperCase()}
📝 **Description:** ${currentDescription}${featuresText}

**Would you like to add any ${enabledFeatures.length > 0 ? 'more' : 'of these'} basic features?**

${!input.allow_promotion_codes ? '🎟️ **Promotion codes** - Allow customers to use discount codes\n' : ''}${!input.enable_pdf_invoices ? '📄 **PDF invoices** - Automatically send invoices to customers\n' : ''}${!input.quantity_adjustable ? '🔢 **Quantity adjustment** - Let customers buy multiple items\n' : ''}${!input.image_url ? '🖼️ **Product image** - Add an image of your product\n' : ''}

Or type **"show advanced options"** to see more configurations.

Say "add [feature name]" for any you'd like, or **"create link"** if you're ready to proceed!

⚠️ **Note:** To create a payment link, you must have a valid Stripe account with API keys properly configured in your environment.

${enabledFeatures.length > 0 ? '✨ Your Stripe payment link is almost ready! Just say "create link" when you\'re satisfied with the setup.' : ''}`,
          structuredData: { 
            result_type: "payment_link", 
            source_api: "stripe", 
            query: { ...input, _rawUserInput: input._rawUserInput }, // Preserve raw user input
            payment_link: null, 
            next_step: "review_details",
            ui_action: "show_review_modal"
          }
        };
      }
    }
    
    // Step 5: Image upload
    if (currentStep === "upload_image") {
      return {
        result: `**Let's add an image for your "${input.product_name}" product**

Adding a product image can significantly increase sales conversion rates.

Please upload an image of your product, or provide an image URL. You can also say "skip" if you prefer not to add an image right now.

If you already have an image URL, simply paste it below. Otherwise, click the upload button that appears.`,
        structuredData: { 
          result_type: "payment_link", 
          source_api: "stripe", 
          query: { ...input, _rawUserInput: input._rawUserInput }, // Preserve raw user input
          payment_link: null, 
          next_step: "upload_image",
          ui_action: "upload_images" // This triggers the Shadcn UI uploader in the frontend
        }
      };
    }
    
    // Ready to create step - proceed with creating the payment link
    if (currentStep === "ready_to_create") {
      // Validation before creation
      const productName = input.product_name || "";
      const price = input.price || 0;
      const currency = (input.currency || "usd").toLowerCase();
      
      logger.info(`${logPrefix} Entering ready_to_create step with product: ${productName}, price: ${price}, currency: ${currency}`);
      
      if (!productName.trim()) {
        return {
          result: `Please provide a product name to create your payment link.`,
          structuredData: { 
            result_type: "payment_link", 
            source_api: "stripe", 
            query: { ...input, _rawUserInput: input._rawUserInput }, // Preserve raw user input
            payment_link: null, 
            next_step: "collect_product_name"
          }
        };
      }
      
      if (price <= 0) {
        return {
          result: `Please provide a valid price greater than $0 for "${productName}".`,
          structuredData: { 
            result_type: "payment_link", 
            source_api: "stripe", 
            query: { ...input, _rawUserInput: input._rawUserInput }, // Preserve raw user input
            payment_link: null, 
            next_step: "collect_price"
          }
        };
      }
      
      // Verify Stripe configuration before proceeding
      if (!this.stripe) {
        logger.error(`${logPrefix} Stripe is not configured. Cannot create payment link.`);
        return {
          error: "Stripe is not configured",
          result: `Error: Stripe integration is not configured. The STRIPE_SECRET_KEY environment variable is missing.

Please make sure to:
1. Set up a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add your Stripe secret key to your environment variables`,
          structuredData: {
            result_type: "payment_link",
            source_api: "stripe",
            query: input,
            payment_link: null,
            error: "Stripe integration is not configured"
          }
        };
      }
      
      // Check account verification asynchronously
      try {
        const stripeConfig = await this.verifyStripeConfiguration();
        if (!stripeConfig.isConfigured) {
          logger.error(`${logPrefix} Stripe configuration verification failed: ${stripeConfig.message}`);
          return {
            error: "Stripe configuration error",
            result: `Error: ${stripeConfig.message}

Please make sure you have:
1. Set up a Stripe account
2. Added your Stripe secret key to your environment variables
3. Verified your account is in good standing`,
            structuredData: {
              result_type: "payment_link",
              source_api: "stripe",
              query: input,
              payment_link: null,
              error: stripeConfig.message
            }
          };
        }
      } catch (error: any) {
        logger.error(`${logPrefix} Error during Stripe verification: ${error?.message || 'Unknown error'}`);
        return {
          error: "Stripe verification error",
          result: `Error: Failed to verify your Stripe account configuration. ${error?.message || 'Unknown error'}

Please check your Stripe account setup and try again.`,
          structuredData: {
            result_type: "payment_link",
            source_api: "stripe",
            query: input,
            payment_link: null,
            error: error?.message || 'Unknown error'
          }
        };
      }
      
      // Prepare feature summary for the confirmation message
      const featureSummary: string[] = [];
      if (input.quantity_adjustable) {
        const maxQty = input.max_quantity ? ` (maximum: ${input.max_quantity})` : '';
        featureSummary.push(`• Quantity adjustment${maxQty}`);
      }
      if (input.allow_promotion_codes) {
        featureSummary.push(`• Promotion codes support`);
      }
      if (input.enable_pdf_invoices) {
        featureSummary.push(`• Automatic PDF invoices`);
      }
      if (input.image_url) {
        featureSummary.push(`• Product image`);
      }
      
      const featuresText = featureSummary.length > 0 ? 
        `\n\n**Enabled Features:**\n${featureSummary.join('\n')}` : '';
      
      logger.info(`${logPrefix} About to create payment link with Stripe for ${productName} (${price} ${currency})`);
      
      // Create the payment link directly instead of showing an intermediate message
      // This ensures errors are properly displayed to the user
      try {
        const result = await this.createPaymentLink(input);
        logger.info(`${logPrefix} Payment link creation result: ${JSON.stringify(result)}`);
        return result;
      } catch (error: any) {
        // Capture and display any errors that occur during payment link creation
        const errorMessage = error?.message || 'Unknown error occurred';
        logger.error(`${logPrefix} Failed to create payment link: ${errorMessage}`, error);
        
        return {
          error: `Error creating payment link: ${errorMessage}`,
          result: `Error: Failed to create payment link: ${errorMessage}\n\nPlease check:\n1. Your Stripe account is properly set up\n2. Your connection is stable`,
          structuredData: {
            result_type: "payment_link",
            source_api: "stripe",
            query: input,
            payment_link: null,
            error: errorMessage
          }
        };
      }
    }
    
    // Fallback if step isn't recognized - start over
    logger.warn(`${logPrefix} Unrecognized step: ${currentStep}, restarting flow`);
    return this.startProductLinkFlow(input);
  }
  
  // Method to start the payment link creation asynchronously
  // DEPRECATED: We now use direct synchronous calls to createPaymentLink instead
  private startPaymentLinkCreation(input: StripePaymentLinkInput): void {
    // Check if Stripe is properly configured first
    if (!this.stripe) {
      logger.error(`[StripePaymentLinkTool] Stripe not configured. Cannot create payment link.`);
      return;
    }
    
    // Launch the async process without waiting for it
    this.createPaymentLink(input)
      .then((result) => {
        // In a real implementation, you would need to store this result
        // and make it available to the user through some callback mechanism
        this.log("info", `Payment link created successfully`);
      })
      .catch((error) => {
        this.log("error", `Failed to create payment link: ${error.message}`);
      });
  }
  
  // Helper method to verify Stripe configuration
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
      if (!account.details_submitted) {
        logger.warn(`${logPrefix} Stripe account exists but details are not submitted`);
        return {
          isConfigured: false,
          needsOnboarding: true,
          message: "Your Stripe account exists but needs to be completed. Let's set it up properly before creating payment links."
        };
      }
      
      // Check if charges are enabled (account can process payments)
      if (!account.charges_enabled) {
        logger.warn(`${logPrefix} Stripe account exists but charges are not enabled`);
        return {
          isConfigured: false,
          needsOnboarding: true,
          message: "Your Stripe account exists but is not fully verified to accept payments. Let's complete your account setup."
        };
      }
      
      // Check if payouts are enabled (account can receive money)
      if (!account.payouts_enabled) {
        logger.warn(`${logPrefix} Stripe account exists but payouts are not enabled`);
        return {
          isConfigured: false, 
          needsOnboarding: true,
          message: "Your Stripe account exists but is not set up to receive payments. Let's connect your bank account to complete setup."
        };
      }
      
      // If we get here, account is fully configured
      return {
        isConfigured: true,
        needsOnboarding: false,
        message: "Your Stripe account is properly configured."
      };
    } catch (error: any) {
      logger.error(`${logPrefix} Error verifying Stripe configuration:`, error);
      
      // If it's an authentication error, the API key is invalid
      if (error.type === 'StripeAuthenticationError') {
        return {
          isConfigured: false,
          needsOnboarding: true,
          message: "Your Stripe API key is invalid. You need to set up a Stripe account."
        };
      }
      
      // For other errors, assume the configuration is not valid
      return {
        isConfigured: false,
        needsOnboarding: true,
        message: `Stripe configuration error: ${error.message}. Let's set up your Stripe account.`
      };
    }
  }
  
  // Helper method to create the actual payment link once we have all required info
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
          product_name: input.product_name || "",
          price: input.price || 0,
          currency: input.currency || "usd",
          description: input.description || "",
          image_url: input.image_url || "",
          quantity_adjustable: input.quantity_adjustable || false,
          allow_promotion_codes: input.allow_promotion_codes || false,
          enable_pdf_invoices: input.enable_pdf_invoices || false,
          // Include any other relevant fields
        };
        
        logger.info(`${logPrefix} User needs Stripe account setup. Saving product details: ${JSON.stringify(savedProductDetails)}`);
        
        // Craft a helpful message explaining the next steps
        return {
          result: `**Stripe Account Setup Required**

I see you want to create a payment link for "${productName}" priced at $${(price / 100).toFixed(2)} ${currency.toUpperCase()}.

However, you need to set up a Stripe account first. This is necessary to:
- Process payments securely
- Receive money from customers
- Create professional payment links

Would you like me to help you set up your Stripe account? I'll keep all your product details saved so we can create your payment link immediately after setup.`,
          structuredData: { 
            result_type: "payment_link", 
            source_api: "stripe", 
            query: { ...input }, 
            payment_link: null, 
            next_step: "redirect_to_onboarding",
            needs_onboarding: true,
            ui_action: "none",
            saved_product_details: savedProductDetails
          }
        };
      }
      
      return { 
        error: "Stripe configuration error", 
        result: `Error: ${stripeConfig.message}\n\nPlease make sure you have:\n1. Set up a Stripe account\n2. Added your Stripe secret key to your environment variables\n3. Verified your account is in good standing` 
      }; 
    }

    if (!this.stripe) { 
      logger.error(`${logPrefix} Stripe instance is null. STRIPE_SECRET_KEY is likely missing.`);
      return { 
        error: "Stripe Tool is not configured.", 
        result: `Error: Stripe integration is not configured. The STRIPE_SECRET_KEY environment variable is missing or invalid.` 
      }; 
    }

    try {
      this.log("info", `${logPrefix} Creating comprehensive payment link for product: ${productName}, price: ${price} ${currency}...`);
      
      // Use the imported Stripe module to create a payment link
      // This will use the platform account, not a Connect account
      try {
        const { createPaymentLink } = await import('../stripe');
        logger.info(`${logPrefix} Successfully imported createPaymentLink function from ../stripe`);
      } catch (importError: any) {
        logger.error(`${logPrefix} Failed to import createPaymentLink function: ${importError.message}`, importError);
        return {
          error: `Import Error: ${importError.message}`,
          result: `Error: Failed to import Stripe payment module. Please contact support.`
        };
      }
      
      const { createPaymentLink } = await import('../stripe');
      
      try {
        // Use null for the accountId to create on the platform account
        logger.info(`${logPrefix} Calling Stripe API to create payment link for product: ${productName}`);
        
        // Prepare custom fields if any
        const customFields = input.custom_fields ? input.custom_fields : undefined;
        
        // Collect shipping countries - normalize country codes
        const shippingCountries = input.shipping_countries ? 
          input.shipping_countries.map(country => {
            const normalizedCountry = this.validateCountryCode(country);
            return normalizedCountry || country.toUpperCase();
          }).filter(c => c) : 
          undefined;
        
        // Create options object with all advanced features
        const options = {
          description: input.description || undefined,
          imageUrl: input.image_url || undefined,
          quantityAdjustable: input.quantity_adjustable || false,
          linkName: input.payment_link_name || undefined,
          
          // Advanced options
          isSubscription: input.is_subscription || false,
          intervalType: input.interval_type || undefined,
          intervalCount: input.interval_count || undefined,
          trialDays: input.trial_days || undefined,
          
          // Address collection
          collectShipping: input.collect_shipping || false,
          collectBilling: input.collect_billing || false,
          shippingCountries: shippingCountries,
          
          // Customer information
          collectPhoneNumber: input.collect_phone || false,
          customFields: customFields,
          
          // Payment features
          enableTaxCollection: input.enable_tax_collection || false,
          allowPromotionCodes: input.allow_promotion_codes || false,
          savePaymentMethod: input.save_payment_method || false,
          
          // After payment behavior
          afterCompletionType: input.after_completion_type || 'hosted_confirmation',
          afterCompletionUrl: input.after_completion_url || undefined,
        };
        
        logger.info(`${logPrefix} Payment link options: ${JSON.stringify(options)}`);
        
        const { product, price: priceObj, paymentLink } = await createPaymentLink(
          null, // No Connected account ID - use platform account
          productName,
          price,
          currency,
          options
        );
        
        this.log("info", `${logPrefix} Successfully created comprehensive payment link: ${paymentLink.url}`);
        
        // Get inventory status
        const hasInventory = typeof input.inventory_quantity === 'number' && input.inventory_quantity > 0;
        
        // Prepare enhanced structured output data
        const structuredData: StripePaymentLinkOutput = {
          result_type: "payment_link",
          source_api: "stripe",
          query: input,
          payment_link: {
            id: paymentLink.id,
            url: paymentLink.url,
            product: {
              id: product.id,
              name: productName,
              description: input.description || undefined
            },
            price: {
              id: priceObj.id,
              unit_amount: price,
              currency: currency
            },
            created: Math.floor(Date.now() / 1000),
            active: true,
            features: {
              tax_collection: !!input.enable_tax_collection,
              promotion_codes: !!input.allow_promotion_codes,
              pdf_invoices: !!input.enable_pdf_invoices,
              shipping_required: !!input.collect_shipping,
              quantity_adjustable: !!input.quantity_adjustable,
              inventory_tracking: hasInventory,
              is_subscription: !!input.is_subscription
            }
          },
          next_step: "complete"
        };
        
        // Prepare success message with appropriate subscription or one-time wording
        const paymentDescription = input.is_subscription 
          ? `subscribe to ${productName} for $${(price / 100).toFixed(2)} ${currency.toUpperCase()}/${input.interval_type || 'month'}`
          : `purchase ${productName} for $${(price / 100).toFixed(2)} ${currency.toUpperCase()}`;
        
        // List all features in a human-readable way
        const featuresList = [
          '• Secure payment processing',
          '• Email receipt for customers'
        ];
        
        if (input.quantity_adjustable) featuresList.push('• Quantity adjustment options');
        if (input.allow_promotion_codes) featuresList.push('• Support for promotion codes');
        if (input.enable_pdf_invoices) featuresList.push('• Automatic PDF invoices');
        if (input.collect_shipping) featuresList.push('• Shipping address collection');
        if (input.collect_billing) featuresList.push('• Billing address collection');
        if (input.collect_phone) featuresList.push('• Phone number collection');
        if (input.enable_tax_collection) featuresList.push('• Automatic tax calculation');
        if (input.is_subscription) featuresList.push('• Recurring billing subscription');
        if (input.save_payment_method) featuresList.push('• Save payment method for future purchases');
        if (input.custom_fields && input.custom_fields.length > 0) featuresList.push('• Custom checkout fields');
        
        return {
          result: `**Payment Link Created Successfully**

**Payment Link**: ${paymentLink.url}

Your customers can ${paymentDescription}.

**Features included:**
${featuresList.join('\n')}`,
          structuredData: structuredData
        };
      } catch (directError: any) {
        // Log the specific error when trying to create the payment link
        const errorMessage = directError?.message || 'Unknown error occurred';
        this.log("error", `${logPrefix} Error creating payment link directly: ${errorMessage}`, directError);
        
        // Try to extract more details from the error
        const stripeError = directError?.raw || directError;
        const errorDetails = stripeError?.param 
          ? `Invalid parameter: ${stripeError.param}` 
          : stripeError?.code 
            ? `Error code: ${stripeError.code}` 
            : '';
        
        logger.error(`${logPrefix} Stripe API error details: ${JSON.stringify(stripeError || {})}`);
        
        // Provide specific guidance based on common error types
        let troubleshootingTips = '';
        if (stripeError?.code === 'authentication_required') {
          troubleshootingTips = "\n\nIt appears your Stripe account requires additional verification. Please log in to your Stripe Dashboard and complete any pending verification steps.";
        } else if (stripeError?.code === 'rate_limit_exceeded') {
          troubleshootingTips = "\n\nYou've hit Stripe's rate limits. Please wait a few minutes before trying again.";
        } else if (stripeError?.type === 'invalid_request_error') {
          troubleshootingTips = "\n\nThere was an issue with the request data. Please check your product details and try again with valid information.";
        }
        
        return {
          error: `Error creating payment link: ${errorMessage}`,
          result: `Error: Failed to create payment link: ${errorMessage}

Please check:
1. The product name and price are valid
2. Your Stripe account is properly set up and verified
3. You have the necessary permissions to create payment links${troubleshootingTips}${errorDetails ? '\n\nTechnical details: ' + errorDetails : ''}`,
          structuredData: {
            result_type: "payment_link",
            source_api: "stripe",
            query: input,
            payment_link: null,
            error: errorMessage,
            error_details: errorDetails || undefined
          }
        };
      }
    } catch (error: any) {
      // Handle any other errors (like failing to import the module)
      const errorMessage = error?.message || 'Unknown error occurred';
      this.log("error", `${logPrefix} Error during payment link creation setup: ${errorMessage}`, error);
      
      return {
        error: `Error creating payment link: ${errorMessage}`,
        result: `Error: Failed to set up payment link creation: ${errorMessage}

Please check:
1. The Stripe integration is properly configured with a valid API key
2. Your Stripe account is verified and in good standing
3. There are no server connectivity issues`,
        structuredData: {
          result_type: "payment_link",
          source_api: "stripe",
          query: input,
          payment_link: null,
          error: errorMessage
        }
      };
    }
  }
} 
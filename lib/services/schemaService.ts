import Ajv, { ValidateFunction } from "ajv";
// import { SchemaService } from "../services/schemaService"; // SUPPRIMÉ car circulaire
import { logger } from "../../memory-framework/config";
import { TOOL_ROUTER_PROMPT_TEMPLATE } from "../prompts"; // To see if it's related
import { generateStructuredJson } from "../providers/llm_clients"; // Potentially test this directly
import { ENTITY_EXTRACTION_SCHEMA_OPENAI } from "../prompts"; // Import entity extraction schema

const TOOL_ROUTER_SCHEMA_NAME = "tool_router_v1_1"; // Consistent name
const SYNTHESIS_SCHEMA_NAME = "minato_gpt4o_synthesis_v1";
const ENTITY_EXTRACTION_SCHEMA_NAME = ENTITY_EXTRACTION_SCHEMA_OPENAI.name; // Use name from imported schema
const MINATO_NEWS_QUERY_EXTRACTION_SCHEMA_NAME = "minato_news_query_extraction_v1";
const MINATO_YOUTUBE_QUERY_EXTRACTION_SCHEMA_NAME = "minato_youtube_query_extraction_v1";
const MINATO_REDDIT_QUERY_EXTRACTION_SCHEMA_NAME = "minato_reddit_query_extraction_v1";
const MINATO_RECIPE_QUERY_EXTRACTION_SCHEMA_NAME = "minato_recipe_query_extraction_v1";
const MINATO_PEXELS_QUERY_EXTRACTION_SCHEMA_NAME = "minato_pexels_query_extraction_v1";
const EVENTFINDER_ARG_EXTRACTION_SCHEMA_NAME = "eventfinder_arg_extraction";
const MINATO_REMINDER_READER_EXTRACTION_SCHEMA_NAME = "minato_reminder_reader_extraction_v1";
const MINATO_REMINDER_SETTER_EXTRACTION_SCHEMA_NAME = "minato_reminder_setter_extraction_v1";
const MINATO_DATETIME_PARSE_ADVANCED_SCHEMA_NAME = "minato_datetime_parse_advanced_v2";
const MINATO_WEBSEARCH_EXTRACTION_SCHEMA_NAME = "minato_websearch_extraction_v1";
const MINATO_GOOGLE_CALENDAR_EXTRACTION_SCHEMA_NAME = "minato_google_calendar_extraction_v1";
const MINATO_GOOGLE_GMAIL_EXTRACTION_SCHEMA_NAME = "minato_google_gmail_extraction_v1";
const MINATO_SPORTS_QUERY_EXTRACTION_SCHEMA_NAME = "minato_sports_query_extraction_v1";

// The schema definition as expected by the test and generateStructuredJson
const TOOL_ROUTER_SCHEMA_DEFINITION = {
  type: "object" as const,
  properties: {
    planned_tools: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          tool_name: { type: "string" as const },
          arguments: {
            type: "object" as const,
            additionalProperties: true, // Allow additional parameters that might be needed for specific tools
            properties: {
              product_name: { type: ["string", "null"] },
              price: { type: ["number", "null"] },
              currency: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
              step: { type: ["string", "null"] },
              intent: { type: ["string", "null"] },
              country: { type: ["string", "null"] },
              entity_type: { type: ["string", "null"] },
              business_description: { type: ["string", "null"] }
            }
          },
          reason: { type: "string" as const }
        },
        required: ["tool_name", "reason", "arguments"],
        additionalProperties: false
      }
    },
    // Include tool aliases to redirect to proper tools
    tool_aliases: {
      type: "object" as const,
      additionalProperties: true,
      properties: {
        "StripeSellerOnboardingTool": { type: "string" as const },
        "StripeAccountSetupTool": { type: "string" as const },
        "StripeOnboardingTool": { type: "string" as const }
      }
    }
  },
  required: ["planned_tools"],
  additionalProperties: false
};

// Ajout de l'interface SchemaDefinition
interface SchemaDefinition {
  name: string;
  version: string;
  schema: object;
  validator?: (data: any) => boolean;
}

// Ajout de la constante SCHEMA_VERSIONS
const SCHEMA_VERSIONS: Record<string, SchemaDefinition> = {
  [TOOL_ROUTER_SCHEMA_NAME]: {
    name: 'tool_router',
    version: '1.1',
    schema: TOOL_ROUTER_SCHEMA_DEFINITION
  },
  [SYNTHESIS_SCHEMA_NAME]: {
    name: 'minato_gpt4o_synthesis',
    version: '1',
    schema: {
      type: "object",
      properties: {
        responseText: { type: "string" },
        intentType: { 
          type: "string",
          enum: [
            "neutral", "greeting", "farewell", "confirmation_positive", "confirmation_negative",
            "clarification", "celebratory", "happy", "encouraging", "apologetic", "empathy",
            "concerned", "disappointed", "urgent", "calm", "gentle", "informative",
            "instructional", "questioning", "assertive", "formal", "whispering",
            "sarcastic", "humorous", "roasting", "flirtatious", "intimate", "thinking",
            "error", "workflow_update"
          ]
        }
      },
      required: ["responseText", "intentType"],
      additionalProperties: false,
    }
  },
  [ENTITY_EXTRACTION_SCHEMA_NAME]: {
    name: 'entity_relationship_extraction',
    version: '3_strict_metadata',
    schema: ENTITY_EXTRACTION_SCHEMA_OPENAI.schema // Use the imported schema object directly
  },
  [MINATO_NEWS_QUERY_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_news_query_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        keywords: { type: "string" },
        sources: { type: "string" },
        category: {
          type: "string",
          enum: [
            "general", "business", "entertainment", "health", "science", "sports", "technology", ""
          ]
        }
      },
      required: ["keywords", "sources", "category"],
      additionalProperties: false
    }
  },
  [MINATO_YOUTUBE_QUERY_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_youtube_query_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" }
      },
      required: ["query", "limit"],
      additionalProperties: false
    }
  },
  // --- Version 2: Enhanced for category, description_keywords, and context ---
  [MINATO_YOUTUBE_QUERY_EXTRACTION_SCHEMA_NAME + '_v2']: {
    name: 'minato_youtube_query_extraction',
    version: '2',
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
        category: { type: "string" }, // e.g., "music", "sports", "education"
        description_keywords: { type: "string" }, // comma-separated keywords for video description
        context: {
          type: "object",
          properties: {
            previous_query: { type: "string" },
            previous_video_title: { type: "string" }
          },
          required: [],
          additionalProperties: false
        }
      },
      required: ["query", "limit"],
      additionalProperties: false
    }
  },
  [MINATO_REDDIT_QUERY_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_reddit_query_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        subreddit: { type: "string" },
        filter: { type: "string", enum: ["hot", "new", "top", "rising"] },
        time: { type: ["string", "null"], enum: ["hour", "day", "week", "month", "year", "all", null] },
        limit: { type: "number", minimum: 1, maximum: 10 }
      },
      required: ["subreddit", "filter", "time", "limit"],
      additionalProperties: false
    }
  },
  [MINATO_RECIPE_QUERY_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_recipe_query_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        random: { type: "boolean" }
      },
      required: ["query", "random"],
      additionalProperties: false
    }
  },
  [MINATO_PEXELS_QUERY_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_pexels_query_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 5 },
        orientation: { type: ["string", "null"], enum: ["landscape", "portrait", "square", null] },
        size: { type: ["string", "null"], enum: ["large", "medium", "small", null] }
      },
      required: ["query", "limit", "orientation", "size"],
      additionalProperties: false
    }
  },
  // Add StripePaymentLinkParameters schema
  ["StripePaymentLinkParameters"]: {
    name: 'StripePaymentLinkParameters',
    version: '2',
    schema: {
      type: "object",
      properties: {
        product_name: { type: ["string", "null"] },
        price: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        image_url: { type: ["string", "null"] },
        step: { type: ["string", "null"] },
        quantity_adjustable: { type: ["boolean", "null"] },
        allow_promotion_codes: { type: ["boolean", "null"] },
        enable_pdf_invoices: { type: ["boolean", "null"] },
        inventory_quantity: { type: ["number", "null"] },
        max_quantity: { type: ["number", "null"] },
        min_quantity: { type: ["number", "null"] },
        // Advanced parameters
        is_subscription: { type: ["boolean", "null"] },
        interval_type: { type: ["string", "null"] },
        interval_count: { type: ["number", "null"] },
        trial_days: { type: ["number", "null"] },
        collect_shipping: { type: ["boolean", "null"] },
        collect_billing: { type: ["boolean", "null"] },
        collect_phone: { type: ["boolean", "null"] },
        shipping_countries: { 
          type: ["array", "null"],
          items: { type: "string" }
        },
        after_completion_type: { type: ["string", "null"] },
        after_completion_url: { type: ["string", "null"] },
        save_payment_method: { type: ["boolean", "null"] },
        enable_tax_collection: { type: ["boolean", "null"] }
      },
      required: ["product_name", "price", "currency", "description", "step"],
      additionalProperties: true
    }
  },
  [EVENTFINDER_ARG_EXTRACTION_SCHEMA_NAME]: {
    name: 'eventfinder_arg_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        keyword: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        countryCode: { type: ["string", "null"] },
        postalCode: { type: ["string", "null"] },
        relativeDateDescription: { type: ["string", "null"] },
        classificationName: { type: ["string", "null"] }
      },
      required: [
        "keyword",
        "city",
        "countryCode",
        "postalCode",
        "relativeDateDescription",
        "classificationName"
      ],
      additionalProperties: false
    }
  },
  ["SubredditSelection"]: {
    name: 'SubredditSelection',
    version: '1',
    schema: {
      type: "object",
      properties: {
        subreddits: {
          type: "array",
          items: { type: "string" },
          description: "Array of subreddit names without r/ prefix"
        }
      },
      required: ["subreddits"],
      additionalProperties: false
    }
  },
  ["LeadAnalysis"]: {
    name: 'LeadAnalysis',
    version: '1',
    schema: {
      type: "object",
      properties: {
        lead_score: { type: "number", minimum: 0, maximum: 100 },
        urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        pain_points: { type: "array", items: { type: "string" } },
        decision_maker_indicators: { type: "array", items: { type: "string" } },
        engagement_potential: { type: "number", minimum: 0, maximum: 100 },
        platform_insights: {
          type: "object",
          properties: {
            subreddit_relevance: { type: "number", minimum: 0, maximum: 100 },
            community_engagement: { type: "number", minimum: 0, maximum: 100 },
            author_authority: { type: "number", minimum: 0, maximum: 100 },
            post_quality: { type: "number", minimum: 0, maximum: 100 }
          },
          required: ["subreddit_relevance", "community_engagement", "author_authority", "post_quality"],
          additionalProperties: false
        },
        tags: { type: "array", items: { type: "string" } },
        reasoning: { type: "string" }
      },
      required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning"],
      additionalProperties: false
    }
  },
  ["HNLeadAnalysis"]: {
    name: 'HNLeadAnalysis',
    version: '1',
    schema: {
      type: "object",
      properties: {
        lead_score: { type: "number", minimum: 0, maximum: 100 },
        urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        pain_points: { type: "array", items: { type: "string" } },
        decision_maker_indicators: { type: "array", items: { type: "string" } },
        engagement_potential: { type: "number", minimum: 0, maximum: 100 },
        platform_insights: {
          type: "object",
          properties: {
            story_relevance: { type: "number", minimum: 0, maximum: 100 },
            community_engagement: { type: "number", minimum: 0, maximum: 100 },
            author_authority: { type: "number", minimum: 0, maximum: 100 },
            technical_depth: { type: "number", minimum: 0, maximum: 100 },
            business_impact: { type: "number", minimum: 0, maximum: 100 }
          },
          required: ["story_relevance", "community_engagement", "author_authority", "technical_depth", "business_impact"],
          additionalProperties: false
        },
        tags: { type: "array", items: { type: "string" } },
        reasoning: { type: "string" },
        company_stage_indicators: { type: "array", items: { type: "string" } },
        tech_stack_mentions: { type: "array", items: { type: "string" } }
      },
      required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning", "company_stage_indicators", "tech_stack_mentions"],
      additionalProperties: false
    }
  },
  ["YouTubeLeadAnalysis"]: {
    name: 'YouTubeLeadAnalysis',
    version: '1',
    schema: {
      type: "object",
      properties: {
        video_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        channel_title: { type: "string" },
        published_at: { type: "string" },
        video_url: { type: "string" },
        thumbnail_url: { type: "string" },
        lead_score: { type: "number", minimum: 0, maximum: 100 },
        urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        pain_points: { type: "array", items: { type: "string" } },
        decision_maker_indicators: { type: "array", items: { type: "string" } },
        engagement_potential: { type: "number", minimum: 0, maximum: 100 },
        business_opportunity: { type: "string" },
        target_persona: { type: "string" },
        content_type: { type: "string", enum: ["tutorial", "review", "problem", "discussion", "showcase", "other"] },
        viewer_intent: { type: "string", enum: ["learning", "buying", "comparing", "troubleshooting", "entertaining", "other"] }
      },
      required: ["video_id", "title", "description", "channel_title", "published_at", "video_url", "thumbnail_url", "lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "business_opportunity", "target_persona", "content_type", "viewer_intent"],
      additionalProperties: false
    }
  },
  ["TikTokLeadAnalysis"]: {
    name: 'TikTokLeadAnalysis',
    version: '1',
    schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        creator: { type: "string" },
        platform: { type: "string", enum: ["tiktok"] },
        lead_score: { type: "number", minimum: 0, maximum: 100 },
        urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        pain_points: { type: "array", items: { type: "string" } },
        decision_maker_indicators: { type: "array", items: { type: "string" } },
        engagement_potential: { type: "number", minimum: 0, maximum: 100 },
        business_opportunity: { type: "string" },
        target_persona: { type: "string" },
        content_type: { type: "string", enum: ["tutorial", "review", "problem", "discussion", "showcase", "trend", "other"] },
        viewer_intent: { type: "string", enum: ["learning", "buying", "comparing", "troubleshooting", "entertaining", "viral", "other"] },
        hashtags: { type: "array", items: { type: "string" } }
      },
      required: ["url", "title", "description", "creator", "platform", "lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "business_opportunity", "target_persona", "content_type", "viewer_intent", "hashtags"],
      additionalProperties: false
    }
  },
  ["NewsLeadAnalysis"]: {
    name: 'NewsLeadAnalysis',
    version: '1',
    schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        source_name: { type: "string" },
        published_at: { type: "string" },
        image_url: { type: "string" },
        lead_score: { type: "number", minimum: 0, maximum: 100 },
        urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        pain_points: { type: "array", items: { type: "string" } },
        business_opportunities: { type: "array", items: { type: "string" } },
        decision_maker_indicators: { type: "array", items: { type: "string" } },
        market_signals: { type: "array", items: { type: "string" } },
        engagement_potential: { type: "number", minimum: 0, maximum: 100 },
        target_persona: { type: "string" },
        news_type: { type: "string", enum: ["funding", "merger", "expansion", "problem", "regulation", "innovation", "other"] },
        lead_type: { type: "string", enum: ["direct", "indirect", "market_intelligence"] }
      },
      required: ["url", "title", "description", "source_name", "published_at", "lead_score", "urgency_level", "pain_points", "business_opportunities", "decision_maker_indicators", "market_signals", "engagement_potential", "target_persona", "news_type", "lead_type"],
      additionalProperties: false
    }
  },
  [MINATO_REMINDER_READER_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_reminder_reader_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get_pending", "get_overdue", "get_today", "get_all"] },
        daysAhead: { type: "number", minimum: 0, maximum: 30 },
        limit: { type: "number", minimum: 1, maximum: 20 }
      },
      required: ["action", "daysAhead", "limit"],
      additionalProperties: false
    }
  },
  [MINATO_REMINDER_SETTER_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_reminder_setter_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        trigger_datetime_description: { type: "string" },
        recurrence_rule: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", "yearly", null] },
        category: { type: "string", enum: ["task", "habit", "medication", "appointment", "goal"] },
        priority: { type: "string", enum: ["low", "medium", "high"] }
      },
      required: ["content", "trigger_datetime_description", "recurrence_rule", "category", "priority"],
      additionalProperties: false
    }
  },
  [MINATO_WEBSEARCH_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_websearch_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        mode: { type: "string", enum: ["product_search", "tiktok_search", "fallback_search"] },
        minPrice: { type: ["number", "null"] },
        maxPrice: { type: ["number", "null"] },
        color: { type: ["string", "null"] },
        brand: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        language: { type: ["string", "null"] }
      },
      required: ["query", "mode"],
      additionalProperties: false
    }
  },
  [MINATO_GOOGLE_CALENDAR_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_google_calendar_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["get_today_events"],
          description: "Action to perform on Google Calendar"
        },
        maxResults: { 
          type: "number", 
          minimum: 1, 
          maximum: 10,
          description: "Maximum number of events to return (1-10)" 
        },
        calendarId: { 
          type: ["string", "null"],
          description: "Optional Calendar ID (default: 'primary')"
        }
      },
      required: ["action", "maxResults"],
      additionalProperties: false
    }
  },
  [MINATO_GOOGLE_GMAIL_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_google_gmail_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["get_recent_emails"],
          description: "Action to perform on Gmail"
        },
        maxResults: { 
          type: "number", 
          minimum: 1, 
          maximum: 10,
          description: "Maximum number of emails to return (1-10)" 
        },
        query: { 
          type: "string",
          description: "Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')"
        },
        summarize_body: { 
          type: "boolean",
          description: "Whether to summarize email bodies"
        },
        summarize_limit: { 
          type: "number", 
          minimum: 1, 
          maximum: 3,
          description: "Maximum number of email bodies to summarize if summarize_body is true (1-3)"
        }
      },
      required: ["action", "maxResults", "query", "summarize_body", "summarize_limit"],
      additionalProperties: false
    }
  },
  [MINATO_SPORTS_QUERY_EXTRACTION_SCHEMA_NAME]: {
    name: 'minato_sports_query_extraction',
    version: '1',
    schema: {
      type: "object",
      properties: {
        teamName: { type: "string" },
        queryType: { type: "string", enum: ["next_game", "last_game", "team_info"] }
      },
      required: ["teamName", "queryType"],
      additionalProperties: false
    }
  },
  [MINATO_DATETIME_PARSE_ADVANCED_SCHEMA_NAME]: {
    name: 'minato_datetime_parse_advanced',
    version: '2',
    schema: {
      type: "object",
      properties: {
        iso_datetime_utc: { type: ["string", "null"] },
        detected_recurrence: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", "yearly", null] },
        confidence: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["iso_datetime_utc", "detected_recurrence", "confidence"],
      additionalProperties: false
    }
  },
};

// Mock for generateStructuredJson (if we want to test SchemaService in isolation)
// Otherwise, we can directly call the real generateStructuredJson for an integration test.
async function mockGenerateStructuredJson(
  instructions: string,
  userInput: string,
  jsonSchema: object,
  schemaName: string,
  history: any[],
  modelName: string,
  userId?: string
): Promise<any | { error: string }> {
  // Simulate LLM behavior: if instructions contain specific keywords, return a problematic structure
  if (instructions.includes("make_it_fail_with_extra_prop_in_step")) {
    return {
      planned_tools: [{
        tool_name: "test_tool",
        arguments: { arg1: "val1" },
        reason: "A valid reason for testing.",
        unexpected_property: "this should fail validation"
      }]
    };
  }
  if (instructions.includes("make_it_fail_with_extra_prop_in_args")) {
      return {
        planned_tools: [{
            tool_name: "test_tool",
            arguments: { arg1: "val1", unexpected_arg_prop: "should be allowed by schema for now" },
            reason: "A valid reason for testing arguments."
        }]
    };
  }
  // Default valid mock response matching TOOL_ROUTER_SCHEMA_DEFINITION
  return {
    planned_tools: [{
      tool_name: "mock_tool",
      arguments: { mock_param: "mock_value" },
      reason: "This is a mock reason from mockGenerateStructuredJson."
    }]
  };
}


export async function testToolRouterSchema() {
  logger.info("--- Starting Tool Router Schema Validation Tests ---");

  // Test Case 1: Basic Valid Data (as defined in TOOL_ROUTER_SCHEMA_DEFINITION)
  const validData1 = {
    planned_tools: [{
      tool_name: "web_search",
      arguments: { query: "test query", location: "US" }, // Example valid arguments
      reason: "User asked a question that requires web search."
    }]
  };
  let result1 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, validData1);
  if (!result1) {
    logger.error(`Test 1 FAILED: Basic Valid Data. Expected: true, Got: ${result1}`);
    process.exit(1);
  }
  logger.info("Test 1 PASSED: Basic Valid Data.");

  // Test Case 2: Empty arguments object (should be valid)
  const validData2 = {
    planned_tools: [{
      tool_name: "get_current_time",
      arguments: {}, // Empty arguments object
      reason: "User asked for the current time, no specific args needed."
    }]
  };
  let result2 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, validData2);
  if (!result2) {
    logger.error(`Test 2 FAILED: Valid Data with Empty Arguments. Expected: true, Got: ${result2}`);
    process.exit(1);
  }
  logger.info("Test 2 PASSED: Valid Data with Empty Arguments.");


  // Test Case 3: Tool step has an extra property (should fail based on additionalProperties: false for items)
  const invalidData1 = {
    planned_tools: [{
      tool_name: "web_search",
      arguments: { query: "test" },
      reason: "This is a test reason for web search.",
      extra_property_in_step: "this should fail"
    }]
  };
  let result3 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, invalidData1);
  if (result3) { // Should be false
    logger.error(`Test 3 FAILED: Extra property in tool step. Expected: false, Got: ${result3}`);
    process.exit(1);
  }
  logger.info("Test 3 PASSED: Extra property in tool step (correctly failed).");

  // Test Case 4: 'arguments' property itself is missing (should fail due to `required: [..., "arguments"]`)
  const invalidData2_missingArgs = {
    planned_tools: [{
      tool_name: "some_tool",
      // arguments property is missing
      reason: "Testing missing arguments."
    }]
  };
  let result4 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, invalidData2_missingArgs);
  if (result4) { // Should be false if arguments is required
    logger.error(`Test 4 FAILED: 'arguments' is missing. Expected: false, Got: ${result4}`);
    process.exit(1);
  }
  logger.info("Test 4 PASSED: 'arguments' is missing (correctly failed).");
  
  // Test Case 5: arguments object has an extra property (should PASS because additionalProperties: true for arguments' properties in TOOL_ROUTER_SCHEMA_DEFINITION)
  const validData3_extraArgProp = {
      planned_tools: [{
          tool_name: "test_tool",
          arguments: { arg1: "val1", unexpected_arg_prop: "this is okay" },
          reason: "A valid reason with an extra argument property."
      }]
  };
  let result5 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, validData3_extraArgProp);
  if (!result5) {
      logger.error(`Test 5 FAILED: Extra property in arguments object. Expected: true, Got: ${result5}`);
      process.exit(1);
  }
  logger.info("Test 5 PASSED: Extra property in arguments object.");


  // Test Case 6: Integration test with (mocked) generateStructuredJson for a problematic case
  // This tests if the schema passed TO generateStructuredJson AND the validation afterwards works.
  logger.info("--- Starting Integration Test with mocked LLM output ---");
  const failingInstructions = "generate_tool_plan make_it_fail_with_extra_prop_in_step"; // This should produce an invalid step
  const llmOutputInvalidStep = await mockGenerateStructuredJson(
    failingInstructions, "test user input", TOOL_ROUTER_SCHEMA_DEFINITION, TOOL_ROUTER_SCHEMA_NAME, [], "mock-model"
  );

  if ("error" in llmOutputInvalidStep) {
      logger.error("Integration Test FAILED: Mock LLM returned an error itself.");
      process.exit(1);
  }
  
  let result6 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, llmOutputInvalidStep);
  if (result6) { // This specific mock output should fail validation
    logger.error(`Integration Test 6 FAILED: Validation of LLM output with extra step property. Expected: false, Got: ${result6}`);
    process.exit(1);
  }
  logger.info("Integration Test 6 PASSED: LLM output with extra step property (correctly failed).");


  // Test Case 7: Integration test with (mocked) generateStructuredJson for arguments with extra prop
  const instructionsForExtraArg = "generate_tool_plan make_it_fail_with_extra_prop_in_args"; // This should produce an invalid step
  const llmOutputExtraArgProp = await mockGenerateStructuredJson(
    instructionsForExtraArg, "test user input", TOOL_ROUTER_SCHEMA_DEFINITION, TOOL_ROUTER_SCHEMA_NAME, [], "mock-model"
  );

  if ("error" in llmOutputExtraArgProp) {
      logger.error("Integration Test FAILED: Mock LLM returned an error itself for extra arg prop test.");
      process.exit(1);
  }
  
  let result7 = SchemaService.validate(TOOL_ROUTER_SCHEMA_NAME, llmOutputExtraArgProp);
  if (!result7) { // This should pass because arguments allows additionalProperties in TOOL_ROUTER_SCHEMA_DEFINITION
    logger.error(`Integration Test 7 FAILED: Validation of LLM output with extra argument property. Expected: true, Got: ${result7}`);
    process.exit(1);
  }
  logger.info("Integration Test 7 PASSED: LLM output with extra argument property (correctly passed).");


  logger.info("--- All Tool Router Schema Validation Tests PASSED Successfully! ---");
}

// If run directly:
if (require.main === module) {
  (async () => {
    try {
      await testToolRouterSchema();
    } catch (e) {
      logger.error("Error during schema test execution:", e);
      process.exit(1);
    }
  })();
}

// --- SchemaService: centralisé ici ---
export class SchemaService {
  static validate(schemaName: string, data: any): boolean {
    const schemaDef = SCHEMA_VERSIONS[schemaName];
    if (!schemaDef) {
      logger.error(`[SchemaService] Unknown schema: ${schemaName}`);
      return false;
    }

    const ajv = new Ajv();
    // Typage explicite pour la fonction de validation
    const validateFunc: ValidateFunction = ajv.compile(schemaDef.schema);
    const valid = validateFunc(data) as boolean; // Ajv retourne toujours un booléen en mode synchrone

    if (!valid) {
      logger.error(`[SchemaService] Validation failed for ${schemaName}:`, validateFunc.errors);
    }

    return valid;
  }

  static getLatestVersion(schemaType: string): SchemaDefinition | null {
    const versions = Object.values(SCHEMA_VERSIONS)
      .filter(s => s.name === schemaType)
      .sort((a, b) => b.version.localeCompare(a.version));
    
    return versions.length > 0 ? versions[0] : null;
  }
}

// Add these types first before the AnyToolStructuredData type definition
export interface DateTimeStructuredOutput {
  result_type: "datetime";
  source_api: "datetime_parse";
  query: string;
  parsed_datetime: string | null;
  confidence: "high" | "medium" | "low";
  normalized_query?: string;
  detected_recurrence?: "daily" | "weekly" | "monthly" | "yearly" | null;
}

export interface GenericStructuredOutput {
  result_type: string;
  source_api: string;
  query: any;
  [key: string]: any;
}

// Find the AnyToolStructuredData type definition and add these types:
export type AnyToolStructuredData = 
  DateTimeStructuredOutput | 
  GenericStructuredOutput | 
  StripePaymentLinkOutput |
  StripeSellerOnboardingOutput;

// And add these interfaces below the existing ones:
export interface StripePaymentLinkOutput {
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
  } | null;
  error?: string;
  next_step?: string;
  needs_onboarding?: boolean;
  saved_product_details?: any;
  ui_action?: "show_review_modal" | "upload_images" | "none";
}

export interface StripeSellerOnboardingOutput {
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
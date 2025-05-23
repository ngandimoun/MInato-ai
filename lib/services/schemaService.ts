import Ajv, { ValidateFunction } from "ajv";
// import { SchemaService } from "../services/schemaService"; // SUPPRIMÉ car circulaire
import { logger } from "../../memory-framework/config";
import { TOOL_ROUTER_PROMPT_TEMPLATE } from "../prompts"; // To see if it's related
import { generateStructuredJson } from "../providers/llm_clients"; // Potentially test this directly
import { ENTITY_EXTRACTION_SCHEMA_OPENAI } from "../prompts"; // Import entity extraction schema

const TOOL_ROUTER_SCHEMA_NAME = "tool_router_v1_1"; // Consistent name
const SYNTHESIS_SCHEMA_NAME = "minato_gpt4o_synthesis_v1";
const ENTITY_EXTRACTION_SCHEMA_NAME = ENTITY_EXTRACTION_SCHEMA_OPENAI.name; // Use name from imported schema

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
            // Note: the orchestrator.ts was changed to make this false for the *routerSchema* definition used in generateStructuredJson
            // However, the SchemaService's own definition of TOOL_ROUTER_SCHEMA_DEFINITION still had it as true.
            // Let's align this with what the orchestrator now expects if this is the canonical source.
            // For now, keeping it as `true` as per the original file content for arguments, assuming the LLM might add diverse args.
            // The critical `additionalProperties: false` is on the item itself and the root.
            additionalProperties: true, 
            properties: {}, 
          },
          reason: { type: "string" as const },
        },
        // This was also updated in orchestrator.ts to include "arguments"
        // Aligning it here for consistency if SchemaService is the source of truth for validation.
        required: ["tool_name", "reason", "arguments"], 
        additionalProperties: false, 
      },
    },
  },
  required: ["planned_tools"],
  additionalProperties: false, 
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
  }
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
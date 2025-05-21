import { SchemaService } from "../services/schemaService";
import { logger } from "../../memory-framework/config";

export function testToolRouterSchema() {
  // Valid base case
  const validData = {
    planned_tools: [{
      tool_name: "valid_tool_1",
      arguments: { param: "value" },
      reason: "Valid reason with sufficient length (min 10 chars)"
    }]
  };

  // Test cases
  const testCases = [
    {
      name: "Missing reason",
      data: {
        planned_tools: [{
          tool_name: "web_search",
          arguments: { query: "test" }
        }]
      },
      shouldPass: false
    },
    {
      name: "Invalid tool name",
      data: {
        planned_tools: [{
          tool_name: "invalid.tool.name",
          arguments: {},
          reason: "Invalid name test"
        }]
      },
      shouldPass: false
    },
    {
      name: "Extra properties",
      data: {
        planned_tools: [{
          tool_name: "valid_tool",
          arguments: {},
          reason: "Valid reason",
          extra_prop: "should fail"
        }]
      },
      shouldPass: false
    },
    {
      name: "Short reason",
      data: {
        planned_tools: [{
          tool_name: "valid_tool",
          arguments: {},
          reason: "Too short"
        }]
      },
      shouldPass: false
    },
    {
      name: "Valid multi-tool",
      data: {
        planned_tools: [
          {
            tool_name: "tool_1",
            arguments: { param1: "value" },
            reason: "First valid reason with sufficient length"
          },
          {
            tool_name: "tool_2",
            arguments: { param2: 42 },
            reason: "Second valid reason meeting requirements"
          }
        ]
      },
      shouldPass: true
    }
  ];

  // Run all tests
  testCases.forEach(({ name, data, shouldPass }) => {
    const result = SchemaService.validate('tool_router_v1_1', data);
    if (result !== shouldPass) {
      logger.error(`Test failed: ${name}\nExpected: ${shouldPass}\nReceived: ${result}`);
      process.exit(1);
    }
  });

  logger.info("All schema validation tests passed successfully");
} 
import { tools } from "../lib/tools/index";

console.log("\n=== Minato Tool Registry ===\n");

Object.entries(tools).forEach(([name, tool]) => {
  console.log(`Tool: ${name}`);
  console.log(`  Description: ${tool.description}`);
  console.log(`  Enabled: ${typeof tool.enabled === "undefined" ? true : tool.enabled}`);
  console.log(`  argsSchema:`);
  try {
    console.log(
      JSON.stringify(tool.argsSchema, null, 2)
        .split("\n")
        .map((line) => "    " + line)
        .join("\n")
    );
  } catch (e) {
    console.log("    [Error printing argsSchema]");
  }
  console.log("\n-----------------------------\n");
});

console.log("Total tools:", Object.keys(tools).length); 
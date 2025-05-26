import { tools } from "../lib/tools/index";

let hasError = false;

console.log("\n=== Minato Tool Health Check ===\n");

Object.entries(tools).forEach(([name, tool]) => {
  let toolOk = true;
  // Check argsSchema
  if (!tool.argsSchema || tool.argsSchema.type !== "object" || !tool.argsSchema.properties) {
    console.error(`❌ Tool '${name}' is missing a valid argsSchema.`);
    hasError = true;
    toolOk = false;
  }
  // Check enabled
  if (typeof tool.enabled === "undefined") {
    console.warn(`⚠️  Tool '${name}' missing 'enabled' property. Defaulting to true.`);
  }
  // Check instantiability (already instantiated in registry)
  if (!tool.name || typeof tool.name !== "string") {
    console.error(`❌ Tool '${name}' is missing a valid 'name' property.`);
    hasError = true;
    toolOk = false;
  }
  // Optionally, dry-run execute (skip if not safe)
  // (We skip actual execute to avoid side effects)
  if (toolOk) {
    console.log(`✅ Tool '${name}' passed health checks.`);
  }
});

console.log("\nHealth check complete.");
if (hasError) {
  console.error("\nSome tools failed health checks. See above for details.");
  process.exit(1);
} else {
  console.log("\nAll tools passed health checks.");
  process.exit(0);
} 
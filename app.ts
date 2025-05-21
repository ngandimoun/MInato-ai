import { testToolRouterSchema } from "@/lib/utils/schemaTester";

async function initializeApp() {
  try {
    testToolRouterSchema();
    // ... existing initialization code ...
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
} 
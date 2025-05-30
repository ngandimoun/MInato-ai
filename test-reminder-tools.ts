// FILE: test-reminder-tools.ts
import { ReminderReaderTool } from "./lib/tools/ReminderReaderTool";
import { ReminderSetterTool } from "./lib/tools/ReminderSetterTool";
import { ProactiveReminderTool } from "./lib/tools/ProactiveReminderTool";

async function testReminderTools() {
  console.log("Testing Reminder Tools...\n");

  // Test user context
  const testContext = {
    userId: "test-user-123",
    userName: "Test User",
    lang: "en",
    timezone: "America/New_York"
  };

  // Test ReminderSetterTool
  console.log("1. Testing ReminderSetterTool:");
  const setterTool = new ReminderSetterTool();
  
  const setterInput = {
    content: "Call mom",
    trigger_datetime_description: "tomorrow at 9am",
    recurrence_rule: null as any,
    category: "task" as any,
    priority: "high" as any,
    userId: testContext.userId,
    context: testContext,
    lang: testContext.lang,
    sessionId: "test-session-123",
    runId: "test-run-123"
  };

  try {
    const setterResult = await setterTool.execute(setterInput);
    console.log("ReminderSetterTool Result:", setterResult.result);
    console.log("Structured Data:", JSON.stringify(setterResult.structuredData, null, 2));
  } catch (error) {
    console.error("ReminderSetterTool Error:", error);
  }

  console.log("\n2. Testing ReminderReaderTool:");
  const readerTool = new ReminderReaderTool();
  
  const readerInput = {
    action: "get_pending" as any,
    daysAhead: 7,
    limit: 10,
    userId: testContext.userId,
    context: testContext,
    lang: testContext.lang,
    sessionId: "test-session-123"
  };

  try {
    const readerResult = await readerTool.execute(readerInput);
    console.log("ReminderReaderTool Result:", readerResult.result);
    if (readerResult.structuredData) {
      console.log("Found reminders:", (readerResult.structuredData as any).reminders?.length || 0);
    }
  } catch (error) {
    console.error("ReminderReaderTool Error:", error);
  }

  console.log("\n3. Testing ProactiveReminderTool:");
  const proactiveTool = new ProactiveReminderTool();
  
  const proactiveInput = {
    checkType: "due_now" as any,
    windowMinutes: 15,
    userId: testContext.userId,
    context: testContext,
    lang: testContext.lang,
    sessionId: "test-session-123"
  };

  try {
    const proactiveResult = await proactiveTool.execute(proactiveInput);
    console.log("ProactiveReminderTool Result:", proactiveResult.result || "No reminders due now");
    if (proactiveResult.structuredData) {
      console.log("Proactive check found:", (proactiveResult.structuredData as any).reminders?.length || 0, "reminders");
    }
  } catch (error) {
    console.error("ProactiveReminderTool Error:", error);
  }

  console.log("\nTest completed!");
}

// Run the test
testReminderTools().catch(console.error); 
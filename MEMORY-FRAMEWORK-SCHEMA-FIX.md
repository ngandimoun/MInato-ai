# Memory Framework Schema Fix

## Issue Fixed

Fixed the OpenAI API schema validation error:
```
[MINATO-ERROR] [OpenAIService extractInfo] Extraction failed: OpenAI API Error for JSON Gen (400 invalid_json_schema): 400 Invalid schema for response_format 'entity_relationship_extraction_v3_strict_metadata': In context=('properties', 'relationships', 'items', 'properties', 'qualifiers', 'type', '0'), 'additionalProperties' is required to be supplied and to be false.
```

## Root Cause

The `qualifiers` field in the relationship schema was missing:
1. The `additionalProperties: false` constraint
2. An empty `properties` object

This caused OpenAI's API to reject the schema as invalid during extraction, preventing memory storage.

## Solution

Updated `lib/prompts.ts` to include the required properties in the `qualifiers` schema definition:

```typescript
qualifiers: { 
    type: ["object", "null"] as const, 
    description: "Optional: Additional context like time, location, or manner",
    properties: {}, // Added empty properties object
    additionalProperties: false as const // Added additionalProperties constraint
}
```

## Validation

To test this fix:
1. Run a memory operation through the API 
2. Verify that memory extraction succeeds without the schema error
3. Check that memories are being properly saved to the database

## Impact

This fix ensures that the memory extraction pipeline works correctly, allowing Minato to:
- Extract and store important information from conversations
- Build long-term memory based on user interactions
- Recall facts and preferences from previous conversations

## Technical Context

The schema validation error occurred in OpenAIService's `extractInfo` method when calling `generateStructuredJson`. The fix ensures proper JSON schema compliance while maintaining the original functionality. 
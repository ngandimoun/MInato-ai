# Memory Framework Schema Fix - Metadata Update

## Issue Fixed

Fixed another OpenAI API schema validation error:
```
[MINATO-ERROR] [LLM Clients JSON] Exception: OpenAI API Error for JSON Gen (400 invalid_json_schema): 400 Invalid schema for response_format 'entity_relationship_extraction_v3_strict_metadata': In context=('properties', 'metadata'), 'additionalProperties' is required to be supplied and to be false.
```

## Root Cause

After fixing the previous schema validation issues with the `qualifiers` property, we encountered a third validation error. 

This time, the issue was with the `metadata` object definition in the extraction schema. The `additionalProperties` value was set to `true`, but OpenAI API validation requires it to be `false` for strict schema validation.

## Solution

Updated `lib/prompts.ts` to change the `additionalProperties` value in the metadata object:

```typescript
// Changed from:
required: ["reminder_details", "detected_language"],
additionalProperties: true as const

// To:
required: ["reminder_details", "detected_language"],
additionalProperties: false as const
```

## Impact

This fix completes the schema validation for the memory extraction process. The OpenAI API now accepts the schema and can properly extract memory information from conversations.

## Technical Note

This change may limit the ability to add arbitrary fields to the metadata object that aren't explicitly defined in the schema. However, this is necessary to comply with OpenAI's strict schema validation requirements.

If additional metadata fields are needed in the future, they should be explicitly added to the schema's properties object. 
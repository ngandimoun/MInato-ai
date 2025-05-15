// FILE: memory-framework/core/utils.ts
// (Content from finalcodebase.txt, added stableStringify import)
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config';
import stableStringify from 'fast-json-stable-stringify'; // Import stable stringify

/**
 * Generates a standard UUID v4.
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Safely parses a JSON string, returning null if parsing fails or input is not a valid JSON structure.
 */
export function safeJsonParse<T>(jsonString: string | null | undefined): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }
  const trimmed = jsonString.trim();
  // Basic check for object or array structure
  if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
       logger.debug(`safeJsonParse: Input does not look like JSON object/array: "${trimmed.substring(0, 100)}..."`);
       return null;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    logger.error(`safeJsonParse: Failed to parse JSON string: "${trimmed.substring(0, 100)}..."`, error);
    return null;
  }
}

/**
 * Generates a consistent, deterministic cache key from a prefix and structured input.
 * Uses fast-json-stable-stringify to ensure object key order doesn't affect the hash.
 */
export function generateStableCacheKey(prefix: string, input: any): string {
    try {
        // Stringify the input deterministically
        const inputString = stableStringify(input);
        // Combine prefix and stringified input
        // Consider hashing the inputString if keys become excessively long,
        // but direct string is simpler for debugging. Ensure prefix is distinct.
        return `${prefix}:${inputString}`;
    } catch (error) {
         logger.error("Failed to generate stable cache key:", error);
         // Fallback to basic stringify, might not be stable for objects
         return `${prefix}:${JSON.stringify(input)}`;
    }
}


/**
 * Splits text into smaller snippets based on sentences, respecting a max length.
 * Tries to split cleanly at sentence boundaries.
 */
export function createSnippets(text: string | string[], maxLength: number = 300): string[] {
  if (Array.isArray(text)) {
    // If input is already an array, just ensure max length
    return text.map(t => t.length > maxLength ? t.substring(0, maxLength) : t).filter(t => t && t.trim().length > 0);
  }
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Regex to split by sentences, keeping punctuation. Handles ., !, ? and potentially others followed by space/end.
  // More robust splitting might require NLP libraries for complex cases.
  const sentences = text.match(/[^.!?]+(?:[.!?]|\n|\r)+(?=\s+|$)|\S.+$/g) || [text];
  const snippets: string[] = [];
  let currentSnippet = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding the new sentence doesn't exceed max length
    if (currentSnippet.length === 0) {
        // If the first sentence itself is too long
        if (trimmedSentence.length > maxLength) {
            snippets.push(trimmedSentence.substring(0, maxLength));
            currentSnippet = ""; // Reset for next potential snippet
        } else {
             currentSnippet = trimmedSentence;
        }
    } else if (currentSnippet.length + trimmedSentence.length + 1 <= maxLength) {
      currentSnippet += " " + trimmedSentence;
    } else {
      // Current snippet is full, push it
      snippets.push(currentSnippet);
      // Start new snippet, handling sentence > maxLength
      currentSnippet = trimmedSentence.length > maxLength ? trimmedSentence.substring(0, maxLength) : trimmedSentence;
    }
  }

  // Add the last remaining snippet if it exists
  if (currentSnippet.length > 0) {
    snippets.push(currentSnippet);
  }

  // Fallback if splitting somehow failed but original text exists
  if (snippets.length === 0 && text.length > 0) {
     logger.warn("createSnippets: Sentence splitting resulted in empty snippets, returning truncated original text.");
     return [text.substring(0, maxLength)];
  }

  return snippets;
}


/**
 * Gets the current timestamp in ISO 8601 format (UTC).
 */
export function getCurrentISOTimestamp(): string {
    return new Date().toISOString();
}
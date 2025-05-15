// FILE: lib/openai.ts
// (Keeping as a standalone embedding utility - verified)
import OpenAI from "openai";
import { appConfig } from "./config"; // Use centralized config
import { logger } from "@/memory-framework/config"; // Use shared logger

// Type assertion for openai config to include embedderModel and embeddingDims
const openaiConfig = appConfig.openai as typeof appConfig.openai & { embedderModel: string; embeddingDims: number };

const apiKey = openaiConfig.apiKey; // Use centralized config

if (!apiKey && typeof window === 'undefined') {
    logger.error("CRITICAL: OpenAI API Key is missing. Cannot initialize standalone OpenAI client for embedding.");
}

// Initialize client only if key exists
const openai = apiKey ? new OpenAI({ apiKey }) : null;

if (openai && typeof window === 'undefined') {
    logger.info('[OpenAI Client Standalone] Initialized (for embeddings/direct calls).');
} else if (!apiKey && typeof window === 'undefined'){
    logger.error('[OpenAI Client Standalone] NOT initialized due to missing API key.');
}

/**
 * Generates an embedding for the given text using the configured model.
 * @param inputText The text to embed.
 * @returns The embedding vector (list of floats).
 * @throws Error if the OpenAI API call fails or input is invalid.
 */
export async function generateEmbedding(inputText: string): Promise<number[]> {
     if (!openai) {
        throw new Error("Standalone OpenAI client not initialized. Cannot generate embedding.");
     }
     if (!inputText || typeof inputText !== 'string' || inputText.trim().length === 0) {
        logger.error('[OpenAI Embed Standalone] Invalid input text for embedding:', inputText);
        throw new Error('Invalid or empty input text provided for embedding.');
    }

    const cleanedText = inputText.replace(/[\n\r]+/g, ' ').trim();
    if (cleanedText.length === 0) {
         logger.warn("[OpenAI Embed Standalone] Input text became empty after cleaning.");
         throw new Error('Input text became empty after cleaning.');
    }

    try {
        const start = Date.now();
        const embeddingResponse = await openai.embeddings.create({
            model: openaiConfig.embedderModel,
            input: cleanedText,
            encoding_format: "float", // Recommended format
            dimensions: openaiConfig.embeddingDims === 1536 ? undefined : openaiConfig.embeddingDims // Specify if not default for model
        });
        const duration = Date.now() - start;

        const embedding = embeddingResponse?.data?.[0]?.embedding;

        if (!embedding || !Array.isArray(embedding) || embedding.length !== openaiConfig.embeddingDims) { // Compare with config dim
            logger.error("[OpenAI Embed Standalone] Invalid response structure or dimension mismatch from OpenAI embedding API:", embeddingResponse);
            throw new Error(`Invalid response structure or dimension mismatch (expected ${openaiConfig.embeddingDims}, got ${embedding?.length}) from OpenAI embedding API`);
        }

        logger.debug(`[OpenAI Embed Standalone] Embedding generated (${duration}ms). Dim: ${embedding.length}`);
        return embedding;

    } catch (error: any) {
        logger.error("[OpenAI Embed Standalone] Error generating embedding from OpenAI:", error.message);
        if (error.response) { // Check if it's an APIError-like structure
            logger.error("OpenAI API Response Error Status:", error.response.status);
            logger.error("OpenAI API Response Data:", error.response.data);
        }
        throw new Error(`Failed to generate embedding via OpenAI: ${error.message}`);
    }
}

// Export the raw client if needed elsewhere (like STT/TTS services ONLY if they don't use the shared one)
// It's generally better to use the shared client from llm_clients.ts
export { openai as rawOpenAiClient_StandaloneEmbedding }; // Rename export
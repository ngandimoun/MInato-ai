import { logger } from '../../memory-framework/config';
import { askGPT } from '../llm/openai';

/**
 * Generate structured JSON data from a prompt and user input
 * @param prompt The prompt to use for generating the structured data
 * @param userInput The user input to include in the prompt
 * @param schema The JSON schema to validate the response against
 * @param options Additional options
 * @returns The structured data
 */
export async function generateStructuredJson<T>(
  prompt: string,
  userInput: string,
  schema: any,
  options?: {
    model?: string;
    temperature?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
  }
): Promise<T> {
  try {
    // Default options
    const defaultOptions = {
      model: 'gpt-4-turbo',
      temperature: 0.2,
      maxRetries: 3
    };
    
    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create the full prompt
    const fullPrompt = `
${prompt}

User Input: ${userInput}

Response must be valid JSON that matches this schema:
${JSON.stringify(schema, null, 2)}

Respond ONLY with the JSON, no other text.
`;

    // Call the LLM
    const response = await askGPT(fullPrompt);
    
    // Parse the response as JSON
    try {
      // Extract JSON from the response if needed
      let jsonText = response;
      
      // Check if response has markdown code blocks
      if (response.includes('```json')) {
        jsonText = response.split('```json')[1].split('```')[0].trim();
      } else if (response.includes('```')) {
        jsonText = response.split('```')[1].split('```')[0].trim();
      }
      
      // Parse the JSON
      const parsedData = JSON.parse(jsonText) as T;
      return parsedData;
    } catch (parseError) {
      logger.error(`Failed to parse JSON response: ${parseError}`);
      throw new Error(`Failed to parse structured JSON: ${parseError}`);
    }
  } catch (error) {
    logger.error(`Failed to generate structured JSON: ${error}`);
    throw error;
  }
} 
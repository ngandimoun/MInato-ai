///livingdossier/services/llm/index.ts

import { askGPT, generateStructuredData } from './openai';
import { askClaude, generateStructuredDataClaude } from './anthropic';
import { config } from '../../config/config';

/**
 * Ask an LLM for a response based on a prompt
 * @param prompt The prompt to send to the LLM
 * @param provider The provider to use (openai or anthropic)
 * @param model The model to use, defaults to provider's default
 * @returns The response from the LLM
 */
export async function askLLM(
  prompt: string,
  provider: 'openai' | 'anthropic' = 'openai',
  model?: string
): Promise<string> {
  if (provider === 'anthropic') {
    return askClaude(prompt, model);
  }
  return askGPT(prompt, model);
}

/**
 * Generate structured data from an LLM
 * @param prompt The prompt to send to the LLM
 * @param provider The provider to use (openai or anthropic)
 * @param model The model to use, defaults to provider's default
 * @returns The parsed JSON response from the LLM
 */
export async function generateStructuredDataFromLLM<T>(
  prompt: string,
  provider: 'openai' | 'anthropic' = 'openai',
  model?: string
): Promise<T> {
  if (provider === 'anthropic') {
    return generateStructuredDataClaude<T>(prompt, model);
  }
  return generateStructuredData<T>(prompt, model);
}

export { askGPT, generateStructuredData, askClaude, generateStructuredDataClaude };

//The "Model Router" - chooses the right LLM
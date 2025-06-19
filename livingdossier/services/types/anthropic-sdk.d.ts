// Type definitions for @anthropic-ai/sdk
declare module '@anthropic-ai/sdk' {
  export interface AnthropicOptions {
    apiKey: string;
    baseURL?: string;
    timeout?: number;
  }

  export interface MessageParams {
    model: string;
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
    stream?: boolean;
  }

  export interface MessageResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
      type: string;
      text: string;
    }>;
    model: string;
    stop_reason: string | null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  }

  export default class Anthropic {
    constructor(options: AnthropicOptions);
    messages: {
      create(params: MessageParams): Promise<MessageResponse>;
    };
  }
} 
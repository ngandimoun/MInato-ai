/**
 * Configuration for tools
 */

export interface Config {
  apiKey: {
    openweathermap?: string;
    serper?: string;
    finnhub?: string;
  };
  appUrl: string;
  SERPER_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  JINA_API_KEY?: string;
  toolMapping: Record<string, string>;
}

export const appConfig: Config = {
  apiKey: {
    openweathermap: process.env.OPENWEATHERMAP_API_KEY,
    serper: process.env.SERPER_API_KEY,
    finnhub: process.env.FINNHUB_API_KEY,
  },
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://minato.ai',
  SERPER_API_KEY: process.env.SERPER_API_KEY,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
  JINA_API_KEY: process.env.JINA_API_KEY,
  toolMapping: {}
}; 
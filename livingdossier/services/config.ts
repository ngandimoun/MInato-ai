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
  toolApiKeys?: {
    alphaVantage?: string;
    browserUse?: string;
    ticketmaster?: string;
    finnhub?: string;
    geokeo?: string;
    ipLocate?: string;
    gnews?: string;
    newsapiOrg?: string;
    theSportsDb?: string;
    youtube?: string;
  };
  app?: {
    url?: string;
  };
  emailFromAddress?: string;
  defaultLocale?: string;
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
  toolMapping: {},
  toolApiKeys: {
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
    browserUse: process.env.BROWSER_USE_API_KEY,
    ticketmaster: process.env.TICKETMASTER_API_KEY,
    finnhub: process.env.FINNHUB_API_KEY,
    geokeo: process.env.GEOKEO_API_KEY,
    ipLocate: process.env.IPLOCATE_API_KEY,
    gnews: process.env.GNEWS_API_KEY,
    newsapiOrg: process.env.NEWSAPI_ORG_KEY,
    theSportsDb: process.env.THE_SPORTS_DB_KEY,
    youtube: process.env.YOUTUBE_API_KEY,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://minato.ai',
  },
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || "renemakoule@gmail.com",
  defaultLocale: process.env.DEFAULT_LOCALE || "en-US",
}; 
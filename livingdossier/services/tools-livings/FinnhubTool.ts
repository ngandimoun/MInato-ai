//livingdossier/services/tools-livings/FinnhubTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";

type FinnhubFunction = "get_quote" | "get_company_profile" | "get_company_news" | "symbol_lookup";

interface FinnhubInput extends ToolInput {
  function_name: FinnhubFunction;
  symbol?: string | null;      // For quote, profile, news
  query?: string | undefined;  // For symbol lookup - changed from null to undefined to match ToolInput
  from_date?: string | null;   // For news, format YYYY-MM-DD
  to_date?: string | null;     // For news, format YYYY-MM-DD
}

// Interfaces for API responses
interface QuoteResponse {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  error?: string;
}

interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  name: string;
  ticker: string;
  ipo: string;
  marketCapitalization: number;
  shareOutstanding: number;
  logo: string;
  weburl: string;
  finnhubIndustry: string;
  error?: string;
}

interface CompanyNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface SymbolSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

interface SymbolSearchResponse {
    count: number;
    result: SymbolSearchResult[];
    error?: string;
}

export class FinnhubTool extends BaseTool {
  name = "FinnhubTool";
  description = "Provides comprehensive financial data via the Finnhub API. It can fetch real-time stock quotes, company profiles, company-specific news, and search for stock symbols.";
  argsSchema = {
    type: "object" as const,
    properties: {
      function_name: {
        type: "string",
        enum: ["company_news", "company_profile", "price_target", "recommendation_trends", "stock_candles", "stock_quote"],
        description: "The Finnhub API function to call",
      },
      symbol: {
        type: "string",
        description: "The stock symbol to query (e.g., AAPL for Apple Inc.)",
      },
      query: {
        type: "string",
        description: "Free text query to search for company information",
      },
      from_date: {
        type: ["string", "null"],
        description: "Start date for historical data in YYYY-MM-DD format",
      },
      to_date: {
        type: ["string", "null"],
        description: "End date for historical data in YYYY-MM-DD format",
      },
    },
    required: ["function_name"],
    additionalProperties: false as const,
  };

  cacheTTLSeconds = 300; // Cache results for 5 minutes
  private readonly API_KEY: string;
  private readonly API_BASE = "https://finnhub.io/api/v1";
  private readonly USER_AGENT: string;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys?.finnhub || "";
    this.USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app?.url || ''}; mailto:${appConfig.emailFromAddress || "renemakoule@gmail.com"})`;
    if (!this.API_KEY) {
      this.log("error", "Finnhub API Key (FINNHUB_API_KEY) is missing. Tool will fail.");
    }
  }

  private async extractFinnhubParameters(userInput: string): Promise<Partial<FinnhubInput>> {
    const extractionPrompt = `
You are an expert parameter extractor for Minato's FinnhubTool.
Based on the user's query: "${userInput.replace(/\"/g, '\\"')}"

Determine the user's INTENT and extract parameters.

GUIDELINES:

1.  **FUNCTION (function_name):**
    *   For a current price, quote, or stock value: "get_quote".
    *   For company information, profile, or "who is": "get_company_profile".
    *   For "latest news", "what's new with", or news updates: "get_company_news".
    *   To find a ticker symbol for a company: "symbol_lookup".

2.  **SYMBOL (symbol):**
    *   Extract any stock ticker like AAPL, MSFT, GOOGL. This is used for quotes, profiles, and news.

3.  **QUERY (query):**
    *   If the intent is "symbol_lookup", extract the company name or search term as 'query'.

OUTPUT FORMAT: A JSON object.
- "function_name": "get_quote" | "get_company_profile" | "get_company_news" | "symbol_lookup"
- "symbol": (string|null)
- "query": (string|null)

RESPOND ONLY WITH THE JSON OBJECT.`;
    
    try {
      const schema = {
        type: "object",
        properties: {
          function_name: { type: "string", enum: ["get_quote", "get_company_profile", "get_company_news", "symbol_lookup"] },
          symbol: { type: ["string", "null"] },
          query: { type: ["string", "null"] },
        },
      };
      return await generateStructuredJson<Partial<FinnhubInput>>(extractionPrompt, userInput, schema) || {};
    } catch (error) {
      logger.error("[FinnhubTool] Parameter extraction failed:", error);
      return {};
    }
  }

  private async _fetch<T>(endpoint: string, params: URLSearchParams): Promise<T> {
    params.set('token', this.API_KEY);
    const url = `${this.API_BASE}${endpoint}?${params.toString()}`;
    this.log('info', `[FinnhubTool] Calling: ${endpoint}`);

    const response = await fetch(url, { headers: { 'User-Agent': this.USER_AGENT } });
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('API rate limit exceeded.');
        }
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
    }
    const data = await response.json() as T;
    // Finnhub sometimes returns an 'error' field in a 200 OK response
    if (typeof data === 'object' && data && 'error' in data) {
        throw new Error((data as { error: string }).error);
    }
    return data;
  }

  async execute(input: ToolInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    let typedInput = input as FinnhubInput;
    
    if (typedInput._rawUserInput && typeof typedInput._rawUserInput === 'string') {
        const extractedParams = await this.extractFinnhubParameters(typedInput._rawUserInput);
        typedInput = { ...extractedParams, ...typedInput };
    }
    
    const { function_name, symbol, query, from_date, to_date } = typedInput;

    if (!this.API_KEY) {
      return { error: "FinnhubTool is not configured.", result: "Sorry, Minato cannot access detailed financial market data right now." };
    }

    try {
      switch (function_name) {
        case "get_quote": {
          if (!symbol) return { error: "Missing parameter", result: "I need a stock symbol to get a quote." };
          const data = await this._fetch<QuoteResponse>('/quote', new URLSearchParams({ symbol }));
          const resultText = `The current price for ${symbol} is $${data.c.toFixed(2)}. Today's change is ${data.d.toFixed(2)} (${data.dp.toFixed(2)}%).`;
          return { result: resultText, structuredData: { source_api: 'finnhub', query_type: 'quote', symbol, ...data } };
        }
        
        case "get_company_profile": {
          if (!symbol) return { error: "Missing parameter", result: "I need a stock symbol to get a company profile." };
          const data = await this._fetch<CompanyProfile>('/stock/profile2', new URLSearchParams({ symbol }));
          const resultText = `${data.name} (${data.ticker}) is a ${data.finnhubIndustry} company based in ${data.country}. It went public on ${data.ipo}.`;
          return { result: resultText, structuredData: { source_api: 'finnhub', query_type: 'profile', ...data } };
        }
        
        case "get_company_news": {
          if (!symbol) return { error: "Missing parameter", result: "I need a stock symbol to get news." };
          const today = new Date();
          const oneMonthAgo = new Date(today.setMonth(today.getMonth() - 1));
          const params = new URLSearchParams({
              symbol,
              from: from_date || oneMonthAgo.toISOString().split('T')[0],
              to: to_date || new Date().toISOString().split('T')[0]
          });
          const data = await this._fetch<CompanyNews[]>('/company-news', params);
          if (data.length === 0) return { result: `I couldn't find any recent news for ${symbol}.` };
          const latestNews = data[0];
          const resultText = `Here's the latest news for ${symbol}: "${latestNews.headline}". It was published by ${latestNews.source}.`;
          return { result: resultText, structuredData: { source_api: 'finnhub', query_type: 'news', symbol, news: data.slice(0, 5) } };
        }

        case "symbol_lookup": {
          const searchTerm = query || symbol; // Use symbol if query is missing but symbol is present
          if (!searchTerm) return { error: "Missing parameter", result: "I need a company name or keyword to search for." };
          const data = await this._fetch<SymbolSearchResponse>('/search', new URLSearchParams({ q: searchTerm }));
          if (data.count === 0) return { result: `I couldn't find any stock symbols matching "${searchTerm}".` };
          const bestMatch = data.result[0];
          let resultText = `I found a few symbols for "${searchTerm}". The best match is ${bestMatch.description} (${bestMatch.symbol}).`;
          if(data.count > 1) {
              resultText += ` Other results include: ${data.result.slice(1, 4).map(r => r.symbol).join(', ')}.`;
          }
          return { result: resultText, structuredData: { source_api: 'finnhub', query_type: 'search', ...data }};
        }

        default:
          return { error: "Invalid function_name", result: "I'm not sure which financial action you want to perform." };
      }
    } catch (error: any) {
      this.log("error", "[FinnhubTool] Execution failed:", error);
      return { error: `Finnhub API request failed: ${error.message}`, result: "Sorry, I encountered an error while fetching financial data from Finnhub." };
    }
  }
}
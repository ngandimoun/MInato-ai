//livingdossier/services/tools-livings/AlphaVantageTool.ts

import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";

// Define the supported functions from the Alpha Vantage API
type AlphaVantageFunction = "GLOBAL_QUOTE" | "TIME_SERIES_DAILY_ADJUSTED" | "SYMBOL_SEARCH";

// Main input interface for the tool
interface AlphaVantageInput extends ToolInput {
  function_name: AlphaVantageFunction;
  symbol?: string | null;      // For quotes and time series, e.g., "AAPL"
  keywords?: string | null;    // For symbol search, e.g., "Apple"
  outputsize?: "compact" | "full" | null; // For time series
}

// Interfaces for the raw API responses
interface GlobalQuoteResponse {
  "Global Quote"?: {
    "01. symbol": string;
    "05. price": string;
    "09. change": string;
    "10. change percent": string;
  };
  "Error Message"?: string;
  "Note"?: string;
}

interface TimeSeriesDailyResponse {
  "Meta Data"?: {
    "2. Symbol": string;
  };
  "Time Series (Daily)"?: {
    [date: string]: {
      "1. open": string;
      "2. high": string;
      "3. low": string;
      "4. close": string;
      "5. adjusted close": string;
      "6. volume": string;
    };
  };
  "Error Message"?: string;
  "Note"?: string;
}

interface SymbolSearchResponse {
  "bestMatches"?: {
    "1. symbol": string;
    "2. name": string;
    "3. type": string;
    "4. region": string;
    "8. matchScore": string;
  }[];
  "Error Message"?: string;
  "Note"?: string;
}

export class AlphaVantageTool extends BaseTool {
  name = "AlphaVantageTool";
  description = "Fetches stock data, including real-time quotes, historical prices, and company symbol searches using the Alpha Vantage API. Can perform one of three actions: get a quote, get historical data, or search for a stock symbol.";
  argsSchema = {
    type: "object" as const,
    properties: {
      function_name: {
        type: "string" as const,
        description: "The specific financial action to perform.",
        enum: ["GLOBAL_QUOTE", "TIME_SERIES_DAILY_ADJUSTED", "SYMBOL_SEARCH"]
      } as OpenAIToolParameterProperties,
      symbol: {
        type: ["string", "null"] as const,
        description: "The stock ticker symbol (e.g., 'AAPL', 'MSFT', 'TSCO.LON'). Required for GLOBAL_QUOTE and TIME_SERIES_DAILY_ADJUSTED.",
      } as OpenAIToolParameterProperties,
      keywords: {
        type: ["string", "null"] as const,
        description: "Keywords to search for a company or symbol (e.g., 'Apple', 'Microsoft'). Required for SYMBOL_SEARCH.",
      } as OpenAIToolParameterProperties,
      outputsize: {
        type: ["string", "null"] as const,
        description: "For historical data, specifies the number of data points. 'compact' for the last 100, 'full' for 20+ years. Defaults to 'compact'.",
        enum: ["compact", "full", null],
      } as OpenAIToolParameterProperties,
    },
    required: ["function_name"],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 600; // Cache results for 10 minutes
  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.alphavantage.co/query";
  private readonly USER_AGENT: string;

  constructor() {
    super();
    // Initialize API key and user agent
    this.API_KEY = appConfig.toolApiKeys?.alphaVantage || "";
    this.USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app?.url || ''}; mailto:${appConfig.emailFromAddress || "renemakoule@gmail.com"})`;
    if (!this.API_KEY) {
      this.log("error", "Alpha Vantage API Key (ALPHA_VANTAGE_API_KEY) is missing. Tool will fail.");
    }
  }

  private async extractAlphaVantageParameters(userInput: string): Promise<Partial<AlphaVantageInput>> {
    const extractionPrompt = `
You are an expert parameter extractor for Minato's AlphaVantageTool, which fetches financial data.
Based on the user's query: "${userInput.replace(/\"/g, '\\"')}"

Determine the user's INTENT and extract the necessary parameters.

ANALYSIS GUIDELINES:

1.  **FUNCTION SELECTION (function_name):**
    *   If the user asks for the current price, price check, or a quote for a stock, choose: "GLOBAL_QUOTE".
    *   If the user asks for historical data, past performance, or daily prices, choose: "TIME_SERIES_DAILY_ADJUSTED".
    *   If the user is unsure of the ticker or asks to "find a stock" or "look up a company", choose: "SYMBOL_SEARCH".
    *   This is the MOST IMPORTANT parameter to determine.

2.  **SYMBOL EXTRACTION (symbol):**
    *   Identify a stock ticker like AAPL, MSFT, GOOGL.
    *   If a company name is given (e.g., "Apple", "Microsoft"), extract the name as the 'symbol' if the intent is to get a quote or history. The tool will need to search for it first if the exact ticker isn't known. For now, just pass the name.

3.  **KEYWORDS EXTRACTION (keywords):**
    *   If the intent is "SYMBOL_SEARCH", extract the company name or keywords the user wants to search for (e.g., "Tencent", "Boeing").

4.  **OUTPUT SIZE (outputsize):**
    *   If the user asks for "full history" or "all data", set to "full".
    *   Otherwise, leave as null (which defaults to "compact").

OUTPUT FORMAT: A JSON object with these fields:
- "function_name": (string) One of "GLOBAL_QUOTE", "TIME_SERIES_DAILY_ADJUSTED", "SYMBOL_SEARCH".
- "symbol": (string|null) The stock ticker or company name.
- "keywords": (string|null) Search terms, only for SYMBOL_SEARCH.
- "outputsize": (string|null) "compact" or "full".

If a parameter cannot be confidently extracted, set it to null.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      const schema = {
        type: "object",
        properties: {
          function_name: { type: "string", enum: ["GLOBAL_QUOTE", "TIME_SERIES_DAILY_ADJUSTED", "SYMBOL_SEARCH"] },
          symbol: { type: ["string", "null"] },
          keywords: { type: ["string", "null"] },
          outputsize: { type: ["string", "null"], enum: ["compact", "full", null] }
        }
      };
      const result = await generateStructuredJson<Partial<AlphaVantageInput>>(
        extractionPrompt, 
        userInput, 
        schema
      );
      return result || {};
    } catch (error) {
      logger.error("[AlphaVantageTool] Parameter extraction failed:", error);
      return {};
    }
  }

  private async _fetchGlobalQuote(symbol: string): Promise<ToolOutput> {
    const params = new URLSearchParams({ function: "GLOBAL_QUOTE", symbol, apikey: this.API_KEY });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log('info', `Fetching global quote for ${symbol}`);
    
    const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }});
    const data: GlobalQuoteResponse = await response.json() as GlobalQuoteResponse;

    if (data["Error Message"] || !data["Global Quote"]) {
        const errorMsg = data["Error Message"] || `Could not find a quote for symbol: ${symbol}. Note: ${data["Note"] || 'No details.'}`;
        return { error: errorMsg, result: `Sorry, I couldn't get a stock quote for ${symbol}. Please check the ticker symbol.` };
    }

    const quote = data["Global Quote"];
    const price = parseFloat(quote["05. price"]).toFixed(2);
    const change = parseFloat(quote["09. change"]).toFixed(2);
    const changePercent = parseFloat(quote["10. change percent"].replace('%','')).toFixed(2);

    const textResult = `The current price for ${symbol} is $${price}. The change today is $${change} (${changePercent}%).`;
    const structuredData = {
      source_api: "alphavantage",
      query_type: "GLOBAL_QUOTE",
      symbol: quote["01. symbol"],
      price: parseFloat(price),
      change: parseFloat(change),
      change_percent: parseFloat(changePercent),
    };

    return { result: textResult, structuredData };
  }

  private async _fetchSymbolSearch(keywords: string): Promise<ToolOutput> {
      const params = new URLSearchParams({ function: "SYMBOL_SEARCH", keywords, apikey: this.API_KEY });
      const url = `${this.API_BASE}?${params.toString()}`;
      this.log('info', `Searching for symbol with keywords: ${keywords}`);

      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT } });
      const data: SymbolSearchResponse = await response.json() as SymbolSearchResponse;
      
      if (data["Error Message"] || !data.bestMatches || data.bestMatches.length === 0) {
          const errorMsg = data["Error Message"] || `No matching symbols found for "${keywords}". Note: ${data["Note"] || 'No details.'}`;
          return { error: errorMsg, result: `Sorry, I couldn't find any stock symbols matching "${keywords}".` };
      }

      const results = data.bestMatches.map(match => ({
          symbol: match["1. symbol"],
          name: match["2. name"],
          region: match["4. region"],
          matchScore: parseFloat(match["8. matchScore"]),
      })).slice(0, 5); // Limit to top 5

      const topResult = results[0];
      let textResult = `I found a few matches for "${keywords}". The best match is ${topResult.name} (${topResult.symbol}) in ${topResult.region}.`;
      if (results.length > 1) {
        textResult += ` Other potential matches include: ${results.slice(1).map(r => r.symbol).join(', ')}.`;
      }
      textResult += " Would you like to get a quote for one of these?";

      return { result: textResult, structuredData: { source_api: "alphavantage", query_type: "SYMBOL_SEARCH", keywords, results } };
  }

  private async _fetchTimeSeries(symbol: string, outputsize: "compact" | "full"): Promise<ToolOutput> {
    const params = new URLSearchParams({ function: "TIME_SERIES_DAILY_ADJUSTED", symbol, outputsize, apikey: this.API_KEY });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log('info', `Fetching time series for ${symbol} (output: ${outputsize})`);
    
    const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT } });
    const data: TimeSeriesDailyResponse = await response.json() as TimeSeriesDailyResponse;

    if (data["Error Message"] || !data["Time Series (Daily)"]) {
        const errorMsg = data["Error Message"] || `Could not get historical data for ${symbol}. Note: ${data["Note"] || 'No details.'}`;
        return { error: errorMsg, result: `Sorry, I couldn't retrieve historical data for ${symbol}.` };
    }

    const series = data["Time Series (Daily)"];
    const dates = Object.keys(series);
    const latestDate = dates[0];
    const latestClose = parseFloat(series[latestDate]["5. adjusted close"]).toFixed(2);
    
    const textResult = `I have retrieved the daily historical data for ${symbol}. The latest adjusted closing price on ${latestDate} was $${latestClose}.`;
    
    // Clean up the structured data
    const structuredData = {
        source_api: "alphavantage",
        query_type: "TIME_SERIES_DAILY_ADJUSTED",
        symbol: data["Meta Data"]?.["2. Symbol"] || symbol,
        history: dates.slice(0, 10).map(date => ({ // only return first 10 for brevity
            date,
            open: parseFloat(series[date]["1. open"]),
            high: parseFloat(series[date]["2. high"]),
            low: parseFloat(series[date]["3. low"]),
            close: parseFloat(series[date]["4. close"]),
            adjusted_close: parseFloat(series[date]["5. adjusted close"]),
            volume: parseInt(series[date]["6. volume"], 10)
        }))
    };
    
    return { result: textResult, structuredData };
  }

  async execute(input: ToolInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // 1. Parameter Extraction from Natural Language
    const typedInput = input as AlphaVantageInput;
    
    if (typedInput._rawUserInput && typeof typedInput._rawUserInput === 'string') {
        const extractedParams = await this.extractAlphaVantageParameters(typedInput._rawUserInput);
        // Merge extracted params, giving precedence to already existing ones
        Object.assign(typedInput, extractedParams);
    }
    
    const { function_name, symbol, keywords, outputsize } = typedInput;
    
    if (!this.API_KEY) {
      return { error: "Alpha Vantage Tool is not configured.", result: "Sorry, Minato cannot access stock market data right now." };
    }
    
    // 2. Routing based on the chosen function
    try {
      switch (function_name) {
        case "GLOBAL_QUOTE":
          if (!symbol) return { error: "Missing parameter", result: "I need a stock symbol to get a quote. For example, AAPL." };
          return await this._fetchGlobalQuote(symbol);

        case "SYMBOL_SEARCH":
          if (!keywords && symbol) {
            // If user provided a symbol but meant to search, use the symbol as keywords
            this.log('info', `No keywords for SYMBOL_SEARCH, using symbol "${symbol}" as keyword.`);
            return await this._fetchSymbolSearch(symbol);
          }
          if (!keywords) return { error: "Missing parameter", result: "I need a company name or keyword to search for a symbol." };
          return await this._fetchSymbolSearch(keywords);
          
        case "TIME_SERIES_DAILY_ADJUSTED":
          if (!symbol) return { error: "Missing parameter", result: "I need a stock symbol to get historical data." };
          return await this._fetchTimeSeries(symbol, outputsize || "compact");

        default:
          const errorMsg = `Invalid function_name "${function_name}". Must be one of: GLOBAL_QUOTE, TIME_SERIES_DAILY_ADJUSTED, SYMBOL_SEARCH.`;
          this.log('warn', errorMsg);
          return { error: errorMsg, result: "I'm not sure which financial data you're asking for. Please specify if you want a price quote, historical data, or to search for a symbol." };
      }
    } catch (error: any) {
        const errorMsg = `Alpha Vantage API request failed: ${error.message}`;
        this.log("error", "[AlphaVantageTool] Execution failed:", error);
        if (error.name === 'AbortError' || error.name === 'FetchError') {
            return { error: "Request timed out or network error.", result: "Sorry, the request to the stock market data service failed or took too long." };
        }
        return { error: errorMsg, result: "Sorry, I encountered an unexpected error while fetching financial data." };
    }
  }
}
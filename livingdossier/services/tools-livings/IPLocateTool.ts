//livingdossier/services/tools-livings/IPLocateTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";

// Note: This tool does not require parameter extraction via LLM as it has a single, simple function.
// We can rely on the agent's ability to call the tool with the correct parameters directly.

interface IPLocateInput extends ToolInput {
  ip_address?: string | null; // The IP address to look up. If null, the API uses the caller's IP.
}

// Interface for the full API response
interface IPLocateResponse {
  ip: string;
  country: string;
  country_code: string;
  city: string | null;
  continent: string;
  latitude: number;
  longitude: number;
  time_zone: string;
  postal_code: string | null;
  asn: {
    asn: string;
    name: string;
    route: string;
    type: string;
  };
  privacy: {
    is_abuser: boolean;
    is_anonymous: boolean;
    is_datacenter: boolean;
    is_proxy: boolean;
    is_tor: boolean;
    is_vpn: boolean;
  };
  error?: {
    message: string;
  }
}

export class IPLocateTool extends BaseTool {
  name = "IPLocateTool";
  description = "Retrieves detailed geolocation, network, and privacy information for a given IPv4 or IPv6 address. If no IP address is provided, it returns information for the caller's IP.";
  argsSchema = {
    type: "object" as const,
    properties: {
      ip_address: {
        type: ["string", "null"] as const,
        description: "The IP address to look up (e.g., '8.8.8.8'). If not provided, the API will use the IP address of the system making the call.",
      } as OpenAIToolParameterProperties,
    },
    required: [],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 86400; // IP data is fairly stable, cache for a day
  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.iplocate.io/api/lookup/";
  private readonly USER_AGENT: string;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.ipLocate || "";
    this.USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;
    if (!this.API_KEY) {
      this.log("warn", "IPLocate API Key (IPLOCATE_API_KEY) is missing. Requests will be limited.");
    }
  }
  
  async execute(input: IPLocateInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { ip_address } = input;
    const logPrefix = '[IPLocateTool]';

    const url = `${this.API_BASE}${ip_address || ''}`;
    const headers: { [key: string]: string } = { 'User-Agent': this.USER_AGENT };
    
    // The API key can be sent as a header or a query parameter. Header is cleaner.
    if (this.API_KEY) {
      headers['X-API-Key'] = this.API_KEY;
    } else {
      this.log('warn', `${logPrefix} No API key provided. Using limited, unauthenticated access.`);
    }

    try {
      this.log('info', `${logPrefix} Looking up IP: ${ip_address || 'self'}`);
      const response = await fetch(url, { headers, signal: abortSignal });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API rate limit exceeded.');
        }
        const errorData = await response.json();
        throw new Error(`API request failed with status ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data: IPLocateResponse = await response.json() as IPLocateResponse;
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      let resultText = `IP address ${data.ip} is located in ${data.city || 'an unknown city'}, ${data.country}.`;
      resultText += ` It belongs to the network "${data.asn.name}" (${data.asn.asn}).`;
      
      const privacyFlags = [];
      if (data.privacy.is_vpn) privacyFlags.push('VPN');
      if (data.privacy.is_proxy) privacyFlags.push('proxy');
      if (data.privacy.is_tor) privacyFlags.push('Tor node');
      if (data.privacy.is_datacenter) privacyFlags.push('datacenter');
      if (data.privacy.is_abuser) privacyFlags.push('abusive source');

      if (privacyFlags.length > 0) {
        resultText += ` Privacy analysis indicates it is a known ${privacyFlags.join(', ')}.`;
      } else {
        resultText += ` No known privacy services (VPN, proxy, Tor) were detected.`;
      }

      return { result: resultText, structuredData: { source_api: 'iplocate', ...data } };
    } catch (error: any) {
      this.log("error", `${logPrefix} Execution failed:`, error);
      return { error: `IPLocate API request failed: ${error.message}`, result: "Sorry, I encountered an error while fetching IP address information." };
    }
  }
}
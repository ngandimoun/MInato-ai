//livingdossier/services/tools-livings/index.ts

import { AlphaVantageTool } from './AlphaVantageTool';
import { BaseTool } from './base-tool';
import { BrowserTool } from './BrowserTool';
import { FinnhubTool } from './FinnhubTool';
import { GeocodingTool } from './GeocodingTool';
import { GeolocationTool } from './GeolocationTool';
import { IPLocateTool } from './IPLocateTool';
import { SerperWebSearchTool } from './Serper_WebSearchTool';
// tavily_web_search_tool is a Python module, not a TypeScript class

// Export all tools
export {
  AlphaVantageTool,
  BaseTool,
  BrowserTool,
  FinnhubTool,
  GeocodingTool,
  GeolocationTool,
  IPLocateTool,
  SerperWebSearchTool
};

// Create a tool registry for easy access to all tools
export function createToolRegistry(): Record<string, BaseTool> {
  return {
    'AlphaVantageTool': new AlphaVantageTool(),
    'BrowserTool': new BrowserTool(),
    'FinnhubTool': new FinnhubTool(),
    'GeocodingTool': new GeocodingTool(),
    'GeolocationTool': new GeolocationTool(),
    'IPLocateTool': new IPLocateTool(),
    'Serper_WebSearchTool': new SerperWebSearchTool()
    // tavily_web_search_tool is a Python module and should be imported differently
  };
}
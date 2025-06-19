//livingdossier/services/tools-livings/index.ts

import { AlphaVantageTool } from './AlphaVantageTool';
import { BaseTool } from './base-tool';
import { BrowserTool } from './BrowserTool';
import { DateTimeTool } from './DateTimeTool';
import { EventFinderTool } from './EventFinderTool';
import { FinnhubTool } from './FinnhubTool';
import { GeocodingTool } from './GeocodingTool';
import { GeolocationTool } from './GeolocationTool';
import { HackerNewsTool } from './HackerNewsTool';
import { IPLocateTool } from './IPLocateTool';
import { MapLinkTool } from './MapLinkTool';
import { NewsAggregatorTool } from './NewsAggregatorTool';
import { PexelsSearchTool } from './PexelsSearchTool';
import { PlaceSearchTool } from './PlaceSearchTool';
import { PublicHolidayTool } from './PublicHolidayTool';
import { RecipeSearchTool } from './RecipeSearchTool';
import { RedditTool } from './RedditTool';
import { SportsInfoTool } from './SportsInfoTool';
import { WeatherTool } from './WeatherTool';
import { SerperWebSearchTool } from './Serper_WebSearchTool';
import { YouTubeSearchTool } from './YouTubeSearchTool';
// tavily_web_search_tool is a Python module, not a TypeScript class

// Export all tools
export {
  AlphaVantageTool,
  BaseTool,
  BrowserTool,
  DateTimeTool,
  EventFinderTool,
  FinnhubTool,
  GeocodingTool,
  GeolocationTool,
  HackerNewsTool,
  IPLocateTool,
  MapLinkTool,
  NewsAggregatorTool,
  PexelsSearchTool,
  PlaceSearchTool,
  PublicHolidayTool,
  RecipeSearchTool,
  RedditTool,
  SportsInfoTool,
  WeatherTool,
  SerperWebSearchTool,
  YouTubeSearchTool
};

// Create a tool registry for easy access to all tools
export function createToolRegistry(): Record<string, BaseTool> {
  return {
    'AlphaVantageTool': new AlphaVantageTool(),
    'BrowserTool': new BrowserTool(),
    'DateTimeTool': new DateTimeTool(),
    'EventFinderTool': new EventFinderTool(),
    'FinnhubTool': new FinnhubTool(),
    'GeocodingTool': new GeocodingTool(),
    'GeolocationTool': new GeolocationTool(),
    'HackerNewsTool': new HackerNewsTool(),
    'IPLocateTool': new IPLocateTool(),
    'MapLinkTool': new MapLinkTool(),
    'NewsAggregatorTool': new NewsAggregatorTool(),
    'PexelsSearchTool': new PexelsSearchTool(),
    'PlaceSearchTool': new PlaceSearchTool(),
    'PublicHolidayTool': new PublicHolidayTool(),
    'RecipeSearchTool': new RecipeSearchTool(),
    'RedditTool': new RedditTool(),
    'SportsInfoTool': new SportsInfoTool(),
    'WeatherTool': new WeatherTool(),
    'Serper_WebSearchTool': new SerperWebSearchTool(),
    'YouTubeSearchTool': new YouTubeSearchTool()
    // tavily_web_search_tool is a Python module and should be imported differently
  };
}
// livingdossier/services/tools-livings/toolRegistry.ts

import { BaseTool } from './base-tool';
import { Serper_WebSearchTool } from './Serper_WebSearchTool';
import { BrowserTool } from './BrowserTool';
import { AlphaVantageTool } from './AlphaVantageTool';
import { FinnhubTool } from './FinnhubTool';
import { LocationSearchTool } from './LocationSearchTool';
import { WikipediaTool } from './WikipediaTool';
import { NewsApiTool } from './NewsApiTool';
import { TwitterSearchTool } from './TwitterSearchTool';
import { RedditSearchTool } from './RedditSearchTool';
import { GoogleTrendsTool } from './GoogleTrendsTool';
import { GoogleScholarTool } from './GoogleScholarTool';
import { ArXivTool } from './ArXivTool';
import { BlockchainTool } from './BlockchainTool';
import { CryptoMarketTool } from './CryptoMarketTool';
import { PythonREPLTool } from './PythonREPLTool';
import { DataVisualizationTool } from './DataVisualizationTool';
import { PDFGenerationTool } from './PDFGenerationTool';
import { config } from '../../config/config';
import { logger } from '@/memory-framework/config';
import { createToolRegistry } from './index';

// Define the tool registry interface
export interface ToolRegistry {
  [key: string]: BaseTool;
}

// Create the tool registry
const registry: ToolRegistry = {
  Serper_WebSearchTool: new Serper_WebSearchTool(),
  BrowserTool: new BrowserTool(),
  AlphaVantageTool: new AlphaVantageTool(),
  FinnhubTool: new FinnhubTool(),
  LocationSearchTool: new LocationSearchTool(),
  WikipediaTool: new WikipediaTool(),
  NewsApiTool: new NewsApiTool(),
  TwitterSearchTool: new TwitterSearchTool(),
  RedditSearchTool: new RedditSearchTool(),
  GoogleTrendsTool: new GoogleTrendsTool(),
  GoogleScholarTool: new GoogleScholarTool(),
  ArXivTool: new ArXivTool(),
  BlockchainTool: new BlockchainTool(),
  CryptoMarketTool: new CryptoMarketTool(),
  PythonREPLTool: new PythonREPLTool(),
  DataVisualizationTool: new DataVisualizationTool(),
  tavily_web_search_tool: new tavily_web_search_tool(),
  PDFGenerationTool: new PDFGenerationTool()
};

/**
 * A registry for all available tools
 */
class ToolRegistry {
  private tools: Record<string, BaseTool> = {};
  private initialized = false;

  /**
   * Initialize the tool registry
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Load all tools from the registry
      this.tools = createToolRegistry();
      this.initialized = true;
      
      // Log the available tools
      const toolNames = Object.keys(this.tools);
      logger.info(`[ToolRegistry] Initialized with ${toolNames.length} tools: ${toolNames.join(', ')}`);
    } catch (error: any) {
      logger.error('[ToolRegistry] Failed to initialize:', error);
      throw new Error(`Failed to initialize tool registry: ${error.message}`);
    }
  }

  /**
   * Get a tool by name
   * @param name The name of the tool
   * @returns The tool instance
   */
  public getTool(name: string): BaseTool | null {
    if (!this.initialized) {
      this.initialize();
    }

    const tool = this.tools[name];
    if (!tool) {
      // Try to find the tool using the tool mapping
      if (config.toolMapping) {
        const mapping = config.toolMapping as Record<string, string>;
        const mappedName = mapping[name];
        if (mappedName && this.tools[mappedName]) {
          return this.tools[mappedName];
        }
      }
      
      logger.warn(`[ToolRegistry] Tool not found: ${name}`);
      return null;
    }

    return tool;
  }

  /**
   * Get all available tools
   * @returns All tool instances
   */
  public getAllTools(): Record<string, BaseTool> {
    if (!this.initialized) {
      this.initialize();
    }

    return { ...this.tools };
  }

  /**
   * Check if a tool is available
   * @param name The name of the tool
   * @returns True if the tool is available
   */
  public hasToolAvailable(name: string): boolean {
    return this.getTool(name) !== null;
  }
}

// Create a singleton instance of the tool registry
export const toolRegistry = new ToolRegistry();

/**
 * Get a tool by name
 * @param name The name of the tool
 * @returns The tool instance
 */
export function getTool(name: string): BaseTool {
  // Check if the tool exists in the registry
  if (registry[name]) {
    return registry[name];
  }
  
  // Check if the tool exists in the tool mapping
  const mappedName = config.toolMapping[name];
  if (mappedName && registry[mappedName]) {
    return registry[mappedName];
  }
  
  throw new Error(`Tool '${name}' not found in the registry`);
}

/**
 * Get all available tools
 * @returns All tool instances
 */
export function getAllTools(): BaseTool[] {
  return Object.values(registry);
}

/**
 * Get all available tool names
 * @returns All tool names
 */
export function getAllToolNames(): string[] {
  return Object.keys(registry);
}

/**
 * Register a new tool
 * @param name The name of the tool
 * @param tool The tool instance
 */
export function registerTool(name: string, tool: BaseTool): void {
  registry[name] = tool;
}

/**
 * Check if a tool exists
 * @param name The name of the tool
 * @returns True if the tool exists
 */
export function hasTool(name: string): boolean {
  return !!registry[name] || !!config.toolMapping[name];
}

export default {
  getTool,
  getAllTools,
  getAllToolNames,
  registerTool,
  hasTool
};

// Export a function to execute a tool
export async function executeTool(name: string, input: any): Promise<any> {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  try {
    return await tool.execute(input);
  } catch (error: any) {
    logger.error(`[ToolRegistry] Error executing tool ${name}:`, error);
    throw new Error(`Failed to execute tool ${name}: ${error.message}`);
  }
} 
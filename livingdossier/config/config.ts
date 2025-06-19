// Configuration for the Living Dossier

interface Config {
  OPENAI_API_KEY: string;
  DEFAULT_MODEL: string;
  FALLBACK_MODEL: string;
  STREAMLIT_PORT: number;
  FASTAPI_PORT: number;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  MAX_TOOLS_PER_QUERY: number;
  STRATEGY_COMPONENTS_PATH: string;
  ENHANCED_STRATEGY_COMPONENTS_PATH: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL: string;
  DEPLOYMENT_BUCKET: string;
  DOSSIER_STORAGE_PATH: string;
  DOSSIER_BASE_URL: string;
  DEFAULT_TIMEOUT_MS: number;
  API_TIMEOUT: number;
  tools: Record<string, any>;
  app: {
    url: string;
    name: string;
    version: string;
  };
  emailFromAddress: string;
  toolApiKeys: {
    alphaVantage?: string;
    browserUse?: string;
    finnhub?: string;
    geokeo?: string;
    gnews?: string;
    ipLocate?: string;
    newsapiOrg?: string;
    serper?: string;
    theSportsDb?: string;
    ticketmaster?: string;
    youtube?: string;
  };
  defaultLocale: string;
  SERPER_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  JINA_API_KEY?: string;
  toolMapping: Record<string, string>;
}

export const config: Config = {
  // API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // LLM Models
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'gpt-4-turbo-preview',
  FALLBACK_MODEL: process.env.FALLBACK_MODEL || 'gpt-3.5-turbo',
  
  // Streamlit Configuration
  STREAMLIT_PORT: parseInt(process.env.STREAMLIT_PORT || '8501'),
  
  // FastAPI Configuration
  FASTAPI_PORT: parseInt(process.env.FASTAPI_PORT || '8000'),
  
  // Database Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project-id.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  
  // Dossier Settings
  MAX_TOOLS_PER_QUERY: parseInt(process.env.MAX_TOOLS_PER_QUERY || '5'),
  STRATEGY_COMPONENTS_PATH: process.env.STRATEGY_COMPONENTS_PATH || './config/strategy_components.yaml',
  ENHANCED_STRATEGY_COMPONENTS_PATH: process.env.ENHANCED_STRATEGY_COMPONENTS_PATH || './config/enhanced_strategy_components.yaml',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
  DEPLOYMENT_BUCKET: process.env.DEPLOYMENT_BUCKET || 'living-dossier-deployments',
  
  // File Storage
  DOSSIER_STORAGE_PATH: './livingdossier/storage',
  
  // Web Interface
  DOSSIER_BASE_URL: process.env.DOSSIER_BASE_URL || 'http://localhost:3000/dossier',
  
  // Timeouts
  DEFAULT_TIMEOUT_MS: 60000,
  
  // Timeout for API calls in milliseconds
  API_TIMEOUT: 30000,
  
  // Tool configurations
  tools: {
    // AlphaVantage tool configuration
    alphaVantage: {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || ''
    },
    
    // Browser tool configuration
    browser: {
      timeout: 60000
    },
    
    // Finnhub tool configuration
    finnhub: {
      apiKey: process.env.FINNHUB_API_KEY || ''
    },
    
    // Weather tool configuration
    weather: {
      apiKey: process.env.OPENWEATHER_API_KEY || ''
    },
    
    // Web search tool configuration
    webSearch: {
      apiKey: process.env.SERPER_API_KEY || ''
    },
    
    // YouTube search tool configuration
    youtubeSearch: {
      apiKey: process.env.YOUTUBE_API_KEY || ''
    },
    
    // Ticketmaster tool configuration
    ticketmaster: {
      apiKey: process.env.TICKETMASTER_API_KEY || ''
    },
    
    // Pexels search tool configuration
    pexelsSearch: {
      apiKey: process.env.PEXELS_API_KEY || ''
    }
  },
  
  // Tool mapping from strategy components to tool registry
  toolMapping: {
    'WebSearchTool': 'WebSearchTool',
    'BrowserTool': 'BrowserTool',
    'AlphaVantageTool': 'AlphaVantageTool',
    'FinnhubTool': 'FinnhubTool',
    'YouTubeSearchTool': 'YouTubeSearchTool',
    'PexelsSearchTool': 'PexelsSearchTool',
    'LocationSearchTool': 'LocationSearchTool',
    'WeatherTool': 'WeatherTool',
    'WikipediaTool': 'WikipediaTool',
    'NewsApiTool': 'NewsApiTool',
    'TwitterSearchTool': 'TwitterSearchTool',
    'RedditSearchTool': 'RedditSearchTool',
    'GoogleTrendsTool': 'GoogleTrendsTool',
    'GoogleScholarTool': 'GoogleScholarTool',
    'ArXivTool': 'ArXivTool',
    'BlockchainTool': 'BlockchainTool',
    'CryptoMarketTool': 'CryptoMarketTool',
    'PythonREPLTool': 'PythonREPLTool',
    'DataVisualizationTool': 'DataVisualizationTool',
    'PDFGenerationTool': 'PDFGenerationTool'
  },
  
  // Additional properties
  app: {
    url: process.env.APP_URL || '',
    name: process.env.APP_NAME || '',
    version: process.env.APP_VERSION || ''
  },
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || '',
  toolApiKeys: {
    alphaVantage: process.env.TOOL_API_KEYS_ALPHA_VANTAGE || '',
    browserUse: process.env.TOOL_API_KEYS_BROWSER_USE || '',
    finnhub: process.env.TOOL_API_KEYS_FINNHUB || '',
    geokeo: process.env.TOOL_API_KEYS_GEOKEO || '',
    gnews: process.env.TOOL_API_KEYS_GNEWS || '',
    ipLocate: process.env.TOOL_API_KEYS_IP_LOCATE || '',
    newsapiOrg: process.env.TOOL_API_KEYS_NEWSAPI_ORG || '',
    serper: process.env.TOOL_API_KEYS_SERPER || '',
    theSportsDb: process.env.TOOL_API_KEYS_THE_SPORTS_DB || '',
    ticketmaster: process.env.TOOL_API_KEYS_TICKETMASTER || '',
    youtube: process.env.TOOL_API_KEYS_YOUTUBE || ''
  },
  defaultLocale: process.env.DEFAULT_LOCALE || 'en',
  SERPER_API_KEY: process.env.SERPER_API_KEY || '',
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
  JINA_API_KEY: process.env.JINA_API_KEY || '',
} 
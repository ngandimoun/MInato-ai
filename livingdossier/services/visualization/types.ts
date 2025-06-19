// livingdossier/services/visualization/types.ts

/**
 * Data types that can be visualized
 */
export type DataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'object' 
  | 'array'
  | 'geospatial'
  | 'network';

/**
 * Supported visualization types
 */
export type VisualizationType = 
  // Basic charts
  | 'bar' 
  | 'line' 
  | 'pie' 
  | 'scatter'
  | 'area'
  | 'radar'
  | 'donut'
  // Specialized charts
  | 'heatmap'
  | 'treemap'
  | 'sunburst'
  | 'sankey'
  | 'streamgraph'
  | 'parallel-coordinates'
  | 'boxplot'
  | 'violin'
  | 'candlestick'
  // Geospatial
  | 'map'
  | 'choropleth'
  | 'bubble-map'
  | 'flow-map'
  // Network
  | 'network'
  | 'force-directed'
  | 'chord'
  | 'arc'
  // 3D
  | 'scatter3d'
  | 'surface3d'
  | 'bar3d';

/**
 * Options for configuring visualizations
 */
export interface VisualizationOptions {
  // General options
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  animation?: boolean;
  theme?: string;
  
  // Axes options
  xAxis?: {
    title?: string;
    min?: number;
    max?: number;
    format?: string;
    grid?: boolean;
  };
  
  yAxis?: {
    title?: string;
    min?: number;
    max?: number;
    format?: string;
    grid?: boolean;
  };
  
  // Legend options
  legend?: {
    show?: boolean;
    position?: 'top' | 'right' | 'bottom' | 'left';
  };
  
  // Tooltip options
  tooltip?: {
    show?: boolean;
    format?: string;
  };
  
  // Map specific options
  projection?: 'mercator' | 'equirectangular' | 'orthographic' | 'naturalEarth';
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  
  // Network specific options
  layout?: 'force' | 'circular' | 'hierarchical' | 'radial';
  nodeSize?: string | number;
  edgeWidth?: string | number;
  
  // 3D specific options
  cameraPosition?: { x: number; y: number; z: number };
  controlsEnabled?: boolean;
  
  // Any other options
  [key: string]: any;
}

/**
 * Recommendation for a visualization type
 */
export interface VisualizationRecommendation {
  type: VisualizationType;
  confidence: number; // 0 to 1
  rationale: string;
}

/**
 * Data characteristics used for analysis
 */
export interface DataCharacteristics {
  dimensions: number;
  rowCount: number;
  columnCount: number;
  hasTemporalDimension: boolean;
  hasCategoricalDimension: boolean;
  hasGeospatialData: boolean;
  hasNetworkData: boolean;
  hasNumericValues: boolean;
  hasMultipleCategories: boolean;
  categoryCount: number;
  nodeCount: number;
}

export interface AIEnhancedVisualization {
  type: "bar" | "line" | "area" | "pie" | "radar" | "scatter" | "heatmap" | "treemap" | "map" | "choropleth" | "network" | "sankey" | "3d";
  title: string;
  description?: string;
  data: any;
  options?: any;
  aiExplanation?: string;
  insightSummary?: string;
  confidenceScore?: number;
  sectionPlacement: 'executiveSummary' | 'supportingEvidence' | 'simulator' | 'dataAppendix';
  interactiveElements?: {
    sliders?: Array<{
      id: string;
      label: string;
      min: number;
      max: number;
      step: number;
      defaultValue: number;
      description?: string;
    }>;
    inputs?: Array<{
      id: string;
      label: string;
      type: 'number' | 'text' | 'select';
      defaultValue: any;
      options?: Array<{label: string, value: any}>;
      description?: string;
    }>;
    buttons?: Array<{
      id: string;
      label: string;
      action: 'reset' | 'calculate' | 'update' | 'custom';
      customAction?: string;
    }>;
    toggles?: Array<{
      id: string;
      label: string;
      defaultValue: boolean;
      description?: string;
    }>;
    updateFunction?: (params: Record<string, any>) => any;
  };
  annotations?: Array<{
    id: string;
    text: string;
    position: { x: number, y: number } | { elementId: string };
    type: 'insight' | 'comment' | 'warning';
    author?: string;
    timestamp?: string;
  }>;
  responsiveOptions?: {
    mobile: Partial<VisualizationOptions>;
    tablet: Partial<VisualizationOptions>;
    desktop: Partial<VisualizationOptions>;
  };
  dataTransformations?: Array<{
    type: 'filter' | 'aggregate' | 'sort' | 'calculate';
    params: Record<string, any>;
  }>;
  relatedVisualizations?: string[]; // IDs of related visualizations
  tags?: string[];
  sources?: Array<{
    name: string;
    url?: string;
    description?: string;
  }>;
} 
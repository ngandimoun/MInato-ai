import { DataType, VisualizationType, VisualizationOptions, VisualizationRecommendation, DataCharacteristics } from './types';

/**
 * Advanced Visualization Engine for the Living Dossier system
 * Provides specialized visualization components for different data types
 */
export class VisualizationEngine {
  /**
   * Recommend the best visualization type for a given dataset
   * @param data The dataset to visualize
   * @param context Additional context about the data
   * @returns Recommended visualization types with confidence scores
   */
  static recommendVisualization(
    data: any, 
    context: { 
      purpose?: 'comparison' | 'distribution' | 'composition' | 'relationship' | 'trend',
      dataTypes?: Record<string, DataType>,
      dimensions?: number,
      preferences?: { 
        aesthetics?: 'minimal' | 'detailed' | 'vibrant',
        interactivity?: 'low' | 'medium' | 'high'
      }
    }
  ): VisualizationRecommendation[] {
    // Extract data characteristics
    const characteristics = this.analyzeData(data);
    
    // Consider context and preferences
    const purpose = context.purpose || this.inferPurpose(characteristics);
    const dimensions = context.dimensions || characteristics.dimensions;
    const preferences = context.preferences || { aesthetics: 'minimal', interactivity: 'medium' };
    
    // Generate recommendations based on data characteristics and context
    const recommendations: VisualizationRecommendation[] = [];
    
    // Time series data
    if (characteristics.hasTemporalDimension) {
      recommendations.push({
        type: 'line',
        confidence: 0.9,
        rationale: 'Data contains a temporal dimension, line charts are ideal for showing trends over time.'
      });
      
      recommendations.push({
        type: 'area',
        confidence: 0.8,
        rationale: 'Area charts are effective for showing cumulative trends over time.'
      });
      
      if (characteristics.hasMultipleCategories) {
        recommendations.push({
          type: 'streamgraph',
          confidence: 0.7,
          rationale: 'Streamgraphs are effective for showing how multiple categories change over time.'
        });
      }
    }
    
    // Categorical data
    if (characteristics.hasCategoricalDimension) {
      if (purpose === 'comparison') {
        recommendations.push({
          type: 'bar',
          confidence: 0.85,
          rationale: 'Bar charts are ideal for comparing values across categories.'
        });
      }
      
      if (purpose === 'composition') {
        recommendations.push({
          type: 'pie',
          confidence: characteristics.categoryCount <= 7 ? 0.8 : 0.4,
          rationale: characteristics.categoryCount <= 7 
            ? 'Pie charts are good for showing composition with few categories.'
            : 'Pie charts become difficult to read with many categories.'
        });
        
        recommendations.push({
          type: 'treemap',
          confidence: 0.75,
          rationale: 'Treemaps are effective for showing hierarchical composition data.'
        });
      }
    }
    
    // Geospatial data
    if (characteristics.hasGeospatialData) {
      recommendations.push({
        type: 'map',
        confidence: 0.95,
        rationale: 'Data contains geospatial information, maps are the most appropriate visualization.'
      });
      
      if (characteristics.hasNumericValues) {
        recommendations.push({
          type: 'choropleth',
          confidence: 0.9,
          rationale: 'Choropleth maps are ideal for showing values across geographic regions.'
        });
      }
    }
    
    // Network data
    if (characteristics.hasNetworkData) {
      recommendations.push({
        type: 'network',
        confidence: 0.95,
        rationale: 'Data contains network relationships, a network graph is most appropriate.'
      });
      
      if (characteristics.nodeCount > 100) {
        recommendations.push({
          type: 'force-directed',
          confidence: 0.9,
          rationale: 'Force-directed layouts work well for large network datasets.'
        });
      }
    }
    
    // Multivariate data
    if (characteristics.dimensions > 2) {
      recommendations.push({
        type: 'scatter3d',
        confidence: 0.8,
        rationale: 'Data has multiple dimensions, 3D scatter plots can reveal complex relationships.'
      });
      
      recommendations.push({
        type: 'parallel-coordinates',
        confidence: 0.75,
        rationale: 'Parallel coordinate plots are effective for visualizing multivariate data.'
      });
    }
    
    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);
    
    return recommendations;
  }
  
  /**
   * Generate visualization configuration for a specific visualization type
   * @param type The type of visualization
   * @param data The data to visualize
   * @param options Visualization options
   * @returns Configuration for the specified visualization
   */
  static generateVisualizationConfig(
    type: VisualizationType,
    data: any,
    options: VisualizationOptions = {}
  ): any {
    // Base configuration
    const config: any = {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: options.animation !== false,
        ...options
      }
    };
    
    // Apply theme
    const theme = options.theme || 'light';
    config.options.theme = this.getThemeConfig(theme);
    
    // Type-specific configurations
    switch (type) {
      case 'bar':
        config.options = {
          ...config.options,
          scales: {
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }
        };
        break;
        
      case 'line':
        config.options = {
          ...config.options,
          elements: {
            line: {
              tension: 0.4
            }
          },
          plugins: {
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }
        };
        break;
        
      case 'map':
        config.options = {
          ...config.options,
          projection: options.projection || 'mercator',
          center: options.center,
          zoom: options.zoom || 2
        };
        break;
        
      case 'network':
        config.options = {
          ...config.options,
          layout: options.layout || 'force',
          nodeSize: options.nodeSize || 'degree',
          edgeWidth: options.edgeWidth || 'weight'
        };
        break;
        
      case 'scatter3d':
        config.options = {
          ...config.options,
          camera: {
            position: options.cameraPosition || { x: 1, y: 1, z: 1 }
          },
          controls: {
            enabled: options.controlsEnabled !== false
          }
        };
        break;
    }
    
    return config;
  }
  
  /**
   * Analyze a dataset to extract its characteristics
   * @param data The dataset to analyze
   * @returns Data characteristics
   */
  private static analyzeData(data: any): DataCharacteristics {
    // Default characteristics
    const characteristics: DataCharacteristics = {
      dimensions: 0,
      rowCount: 0,
      columnCount: 0,
      hasTemporalDimension: false,
      hasCategoricalDimension: false,
      hasGeospatialData: false,
      hasNetworkData: false,
      hasNumericValues: false,
      hasMultipleCategories: false,
      categoryCount: 0,
      nodeCount: 0
    };
    
    // Check if data is an array
    if (Array.isArray(data)) {
      characteristics.rowCount = data.length;
      
      // Check if array items are objects
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        const firstItem = data[0];
        characteristics.columnCount = Object.keys(firstItem).length;
        characteristics.dimensions = characteristics.columnCount;
        
        // Track categorical columns
        const categoricalColumns = [];
        
        // Analyze columns
        for (const key of Object.keys(firstItem)) {
          // Check for temporal data
          if (
            key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('time') ||
            firstItem[key] instanceof Date
          ) {
            characteristics.hasTemporalDimension = true;
          }
          
          // Check for categorical data
          if (typeof firstItem[key] === 'string' && !key.toLowerCase().includes('id')) {
            characteristics.hasCategoricalDimension = true;
            categoricalColumns.push(key);
            
            // Count unique categories
            const uniqueCategories = new Set(data.map((item: any) => item[key]));
            characteristics.categoryCount = uniqueCategories.size;
          }
          
          // Check for numeric values
          if (typeof firstItem[key] === 'number') {
            characteristics.hasNumericValues = true;
          }
          
          // Check for geospatial data
          if (
            key.toLowerCase().includes('lat') || 
            key.toLowerCase().includes('lon') ||
            key.toLowerCase().includes('location') ||
            key.toLowerCase().includes('coordinates')
          ) {
            characteristics.hasGeospatialData = true;
          }
        }
        
        // Check for multiple categorical dimensions
        characteristics.hasMultipleCategories = categoricalColumns.length > 1;
      }
    }
    
    // Check for network data
    if (
      (data.nodes && Array.isArray(data.nodes)) &&
      (data.links || data.edges) && 
      Array.isArray(data.links || data.edges)
    ) {
      characteristics.hasNetworkData = true;
      characteristics.nodeCount = data.nodes.length;
    }
    
    return characteristics;
  }
  
  /**
   * Infer the purpose of the visualization based on data characteristics
   * @param characteristics Data characteristics
   * @returns Inferred purpose
   */
  private static inferPurpose(characteristics: DataCharacteristics): 'comparison' | 'distribution' | 'composition' | 'relationship' | 'trend' {
    if (characteristics.hasTemporalDimension) {
      return 'trend';
    }
    
    if (characteristics.hasNetworkData) {
      return 'relationship';
    }
    
    if (characteristics.hasCategoricalDimension && characteristics.hasNumericValues) {
      return 'comparison';
    }
    
    if (characteristics.hasNumericValues && !characteristics.hasCategoricalDimension) {
      return 'distribution';
    }
    
    return 'composition';
  }
  
  /**
   * Get theme configuration for visualizations
   * @param theme The theme name
   * @returns Theme configuration
   */
  private static getThemeConfig(theme: string): any {
    const themes: Record<string, any> = {
      light: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        gridColor: '#eeeeee',
        accentColor: '#4e79a7'
      },
      dark: {
        backgroundColor: '#2d3748',
        textColor: '#e2e8f0',
        gridColor: '#4a5568',
        accentColor: '#63b3ed'
      },
      vibrant: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        gridColor: '#eeeeee',
        colorPalette: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628']
      },
      minimal: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        gridColor: '#f7fafc',
        colorPalette: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1']
      }
    };
    
    return themes[theme] || themes.light;
  }
} 
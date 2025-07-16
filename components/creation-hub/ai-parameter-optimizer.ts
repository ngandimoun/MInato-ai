// AI Parameter Optimizer - Intelligent selection of image generation parameters
import type { ImageCategory, CategoryFormValues } from './category-types';

// ===== GPT Image 1 Parameter Types =====

export type GPTImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
export type GPTImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type GPTImageFormat = 'png' | 'jpeg' | 'webp';
export type GPTImageBackground = 'transparent' | 'opaque' | 'auto';

export interface OptimalImageParameters {
  size: GPTImageSize;
  quality: GPTImageQuality;
  format: GPTImageFormat;
  background: GPTImageBackground;
  compression?: number; // 0-100, only for JPEG/WebP
  moderation?: 'auto' | 'low';
  reasoning: string; // AI explanation for parameter choices
}

export interface ImageGenerationContext {
  category: ImageCategory;
  formValues: CategoryFormValues;
  userPrompt: string;
  hasText?: boolean;
  isForPrint?: boolean;
  needsTransparency?: boolean;
  isIcon?: boolean;
  isLogo?: boolean;
  platform?: string;
  targetAudience?: string;
  colorComplexity?: 'simple' | 'moderate' | 'complex';
}

// ===== Category-Specific Parameter Rules =====

const CATEGORY_PARAMETER_RULES: Record<ImageCategory, {
  preferredSize: GPTImageSize;
  preferredQuality: GPTImageQuality;
  preferredFormat: GPTImageFormat;
  preferredBackground: GPTImageBackground;
  needsTransparency: boolean;
  supportsCompression: boolean;
  typicalCompression?: number;
  qualityMapping?: Record<string, GPTImageQuality>;
}> = {
  'social-media': {
    preferredSize: 'auto', // Will be determined by platform
    preferredQuality: 'high',
    preferredFormat: 'jpeg',
    preferredBackground: 'opaque',
    needsTransparency: false,
    supportsCompression: true,
    typicalCompression: 85
  },
  'logo-brand': {
    preferredSize: '1024x1024',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'transparent',
    needsTransparency: true,
    supportsCompression: false
  },
  'ui-components': {
    preferredSize: 'auto',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'transparent',
    needsTransparency: true,
    supportsCompression: false,
    // Enhanced quality mapping based on visualQuality parameter
    qualityMapping: {
      'ultra-premium': 'high',
      'pixel-perfect': 'high',
      'premium': 'high',
      'production': 'high'
    }
  },
  'marketing': {
    preferredSize: 'auto',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'opaque',
    needsTransparency: false,
    supportsCompression: false
  },
  'banners': {
    preferredSize: '1536x1024',
    preferredQuality: 'high',
    preferredFormat: 'jpeg',
    preferredBackground: 'opaque',
    needsTransparency: false,
    supportsCompression: true,
    typicalCompression: 90
  },
  'data-viz': {
    preferredSize: '1024x1024',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'opaque',
    needsTransparency: false,
    supportsCompression: false
  },
  'illustrations': {
    preferredSize: 'auto',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'auto',
    needsTransparency: false,
    supportsCompression: false
  },
  'product-mockups': {
    preferredSize: '1024x1024',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'opaque',
    needsTransparency: false,
    supportsCompression: false
  },
  'letterhead': {
    preferredSize: 'auto', // Will be determined by document format (Letter, A4, etc.)
    preferredQuality: 'high',
    preferredFormat: 'png', // PNG for crisp text and logos
    preferredBackground: 'opaque',
    needsTransparency: false,
    supportsCompression: false,
    // Enhanced quality mapping for business documents
    qualityMapping: {
      'basic-business': 'medium',
      'professional-grade': 'high',
      'enterprise-level': 'high',
      'print-production': 'high',
      'custom-specs': 'high'
    }
  },
  'ai-avatars': {
    preferredSize: '1024x1024',
    preferredQuality: 'high',
    preferredFormat: 'png',
    preferredBackground: 'auto',
    needsTransparency: false,
    supportsCompression: false
  }
};

// ===== Platform-Specific Size Mappings =====

const PLATFORM_SIZE_MAP: Record<string, GPTImageSize> = {
  'instagram-post': '1024x1024',
  'instagram-story': '1024x1536',
  'facebook-post': '1536x1024',
  'tiktok-background': '1024x1536',
  'pinterest-pin': '1024x1536',
  'twitter-post': '1536x1024',
  'linkedin-banner': '1536x1024',
  'facebook-cover': '1536x1024',
  'website-header': '1536x1024'
};

// ===== AI Parameter Optimizer Class =====

export class AIParameterOptimizer {
  
  /**
   * Main method to determine optimal parameters for image generation
   */
  static async optimizeParameters(context: ImageGenerationContext): Promise<OptimalImageParameters> {
    const { category, formValues, userPrompt } = context;
    
    // Get base rules for the category
    const baseRules = CATEGORY_PARAMETER_RULES[category];
    
    // Initialize with base parameters
    let optimal: OptimalImageParameters = {
      size: baseRules.preferredSize,
      quality: baseRules.preferredQuality,
      format: baseRules.preferredFormat,
      background: baseRules.preferredBackground,
      compression: baseRules.typicalCompression,
      moderation: 'auto',
      reasoning: `Base parameters for ${category} category`
    };

    // Apply category-specific optimizations
    optimal = this.applyCategoryOptimizations(optimal, context);
    
    // Apply platform-specific optimizations
    optimal = this.applyPlatformOptimizations(optimal, context);
    
    // Apply content-based optimizations
    optimal = this.applyContentOptimizations(optimal, context);
    
    // Apply performance optimizations
    optimal = this.applyPerformanceOptimizations(optimal, context);
    
    // Validate and finalize parameters
    optimal = this.validateAndFinalize(optimal, context);
    
    return optimal;
  }

  /**
   * Apply category-specific parameter optimizations
   */
  private static applyCategoryOptimizations(
    params: OptimalImageParameters, 
    context: ImageGenerationContext
  ): OptimalImageParameters {
    const { category, formValues } = context;
    let reasoning = params.reasoning;

    switch (category) {
      case 'social-media':
        // Platform determines size and format
        if (formValues.platform) {
          const platformSize = PLATFORM_SIZE_MAP[formValues.platform];
          if (platformSize) {
            params.size = platformSize;
            reasoning += ` | Size optimized for ${formValues.platform}`;
          }
          
          // Instagram stories and TikTok prefer higher quality
          if (formValues.platform.includes('story') || formValues.platform.includes('tiktok')) {
            params.quality = 'high';
            reasoning += ` | High quality for vertical video platform`;
          }
        }
        
        // Text-heavy posts need PNG for clarity
        if (formValues.textOnImage && formValues.textOnImage.length > 10) {
          params.format = 'png';
          params.compression = undefined;
          reasoning += ` | PNG selected for text clarity`;
        }
        break;

      case 'logo-brand':
        // Always use transparent background for logos
        params.background = 'transparent';
        params.format = 'png';
        
        // Logos need maximum quality
        params.quality = 'high';
        
        // Wordmarks might need different aspect ratio
        if (formValues.logoStyle === 'wordmark') {
          params.size = '1536x1024'; // Wider for text-based logos
          reasoning += ` | Landscape orientation for wordmark logo`;
        }
        break;

      case 'ui-components':
        // Enhanced quality optimization based on visualQuality parameter
        if (formValues.visualQuality) {
          const rules = CATEGORY_PARAMETER_RULES[category];
          if (rules.qualityMapping && rules.qualityMapping[formValues.visualQuality]) {
            params.quality = rules.qualityMapping[formValues.visualQuality];
            reasoning += ` | Quality enhanced for ${formValues.visualQuality} rendering`;
          }
        }

        // Component type determines parameters
        if (formValues.componentType === 'icon') {
          params.size = '1024x1024'; // Square for icons
          params.background = 'transparent';
          params.format = 'png';
          reasoning += ` | Square transparent PNG for icon`;
        } else if (formValues.componentType === 'hero-image') {
          params.size = '1536x1024'; // Landscape for hero
          params.background = 'opaque';
          params.format = 'jpeg';
          params.compression = 85;
          reasoning += ` | Landscape JPEG for hero image`;
        } else if (formValues.componentType === 'button') {
          params.size = '1024x1024';
          params.background = 'transparent';
          params.format = 'png';
          reasoning += ` | Square transparent PNG for button`;
        }

        // Multi-state components need larger canvas
        if (formValues.interactionStates && Array.isArray(formValues.interactionStates) && formValues.interactionStates.length > 1) {
          params.size = '1536x1024'; // Wider canvas for multiple states
          reasoning += ` | Wider canvas for ${formValues.interactionStates.length} interaction states`;
        }

        // Multi-variant components need even larger canvas
        if (formValues.componentVariants && Array.isArray(formValues.componentVariants) && formValues.componentVariants.length > 1) {
          params.size = '1536x1024'; // Wide canvas for multiple variants
          reasoning += ` | Wide canvas for ${formValues.componentVariants.length} component variants`;
        }

        // Ultra-premium quality optimizations
        if (formValues.visualQuality === 'ultra-premium') {
          params.format = 'png'; // PNG for maximum quality
          params.compression = undefined;
          reasoning += ` | PNG format for ultra-premium quality`;
        }

        // Pixel-perfect quality optimizations
        if (formValues.visualQuality === 'pixel-perfect') {
          params.format = 'png'; // PNG for sharp edges
          params.compression = undefined;
          reasoning += ` | PNG format for pixel-perfect rendering`;
        }
        break;

      case 'marketing':
        // Print materials need high quality PNG
        if (formValues.materialType === 'business-card' || formValues.isForPrint) {
          params.quality = 'high';
          params.format = 'png';
          params.compression = undefined;
          reasoning += ` | High quality PNG for print material`;
        }
        break;

      case 'banners':
        // Banners are always landscape
        params.size = '1536x1024';
        
        // Profile banners can use JPEG with compression
        params.format = 'jpeg';
        params.compression = 90;
        reasoning += ` | Landscape JPEG with light compression for banner`;
        break;

      case 'ai-avatars':
        // Avatars are always square
        params.size = '1024x1024';
        
        // Professional avatars need transparent background option
        if (formValues.avatarStyle === 'professional' || formValues.avatarStyle === 'business') {
          params.background = 'transparent';
          params.format = 'png';
          reasoning += ` | Transparent background for professional avatar`;
        }
        break;
    }

    params.reasoning = reasoning;
    return params;
  }

  /**
   * Apply platform-specific optimizations
   */
  private static applyPlatformOptimizations(
    params: OptimalImageParameters,
    context: ImageGenerationContext
  ): OptimalImageParameters {
    if (!context.platform) return params;
    
    let reasoning = params.reasoning;

    // Web platforms prefer JPEG for faster loading
    if (context.platform === 'web' || context.platform === 'website') {
      if (params.background !== 'transparent') {
        params.format = 'jpeg';
        params.compression = 85;
        reasoning += ` | JPEG with compression for web performance`;
      }
    }

    // Social media platforms have specific requirements
    if (context.platform === 'instagram' && params.format === 'jpeg') {
      params.compression = 90; // Instagram compresses anyway, start higher
      reasoning += ` | Higher compression baseline for Instagram`;
    }

    params.reasoning = reasoning;
    return params;
  }

  /**
   * Apply content-based optimizations
   */
  private static applyContentOptimizations(
    params: OptimalImageParameters,
    context: ImageGenerationContext
  ): OptimalImageParameters {
    let reasoning = params.reasoning;

    // Text-heavy images need PNG for clarity
    if (context.hasText) {
      params.format = 'png';
      params.compression = undefined;
      reasoning += ` | PNG selected for text readability`;
    }

    // Simple graphics can use higher compression
    if (context.colorComplexity === 'simple') {
      if (params.format === 'jpeg') {
        params.compression = 75;
        reasoning += ` | Higher compression for simple graphics`;
      }
    }

    // Complex graphics need lower compression
    if (context.colorComplexity === 'complex') {
      if (params.format === 'jpeg') {
        params.compression = 95;
        reasoning += ` | Lower compression for complex graphics`;
      }
    }

    // Icons and logos always need transparency
    if (context.isIcon || context.isLogo) {
      params.background = 'transparent';
      params.format = 'png';
      params.compression = undefined;
      reasoning += ` | Transparent background for icon/logo`;
    }

    params.reasoning = reasoning;
    return params;
  }

  /**
   * Apply performance optimizations
   */
  private static applyPerformanceOptimizations(
    params: OptimalImageParameters,
    context: ImageGenerationContext
  ): OptimalImageParameters {
    let reasoning = params.reasoning;

    // For web use, prefer faster formats when transparency isn't needed
    if (context.platform === 'web' && params.background !== 'transparent') {
      // WebP offers better compression than JPEG
      params.format = 'webp';
      params.compression = 80;
      reasoning += ` | WebP for optimal web performance`;
    }

    // Print materials need maximum quality
    if (context.isForPrint) {
      params.quality = 'high';
      params.format = 'png';
      params.compression = undefined;
      reasoning += ` | Maximum quality for print`;
    }

    params.reasoning = reasoning;
    return params;
  }

  /**
   * Validate and finalize parameters
   */
  private static validateAndFinalize(
    params: OptimalImageParameters,
    context: ImageGenerationContext
  ): OptimalImageParameters {
    // Ensure compression is only set for JPEG/WebP
    if (params.format === 'png') {
      params.compression = undefined;
    }

    // Ensure transparency is only for PNG/WebP
    if (params.background === 'transparent' && params.format === 'jpeg') {
      params.format = 'png';
      params.compression = undefined;
      params.reasoning += ` | Switched to PNG for transparency support`;
    }

    // Ensure quality is appropriate for format
    if (params.format === 'jpeg' && params.quality === 'auto') {
      params.quality = 'high'; // JPEG benefits from explicit quality setting
    }

    // Add final reasoning summary
    params.reasoning += ` | Final: ${params.size} ${params.quality} quality ${params.format.toUpperCase()}`;
    if (params.background === 'transparent') {
      params.reasoning += ' with transparency';
    }
    if (params.compression) {
      params.reasoning += ` (${params.compression}% compression)`;
    }

    return params;
  }

  /**
   * Analyze context from form values and user input
   */
  static analyzeContext(
    category: ImageCategory,
    formValues: CategoryFormValues,
    userPrompt: string
  ): ImageGenerationContext {
    const context: ImageGenerationContext = {
      category,
      formValues,
      userPrompt,
      hasText: this.detectTextContent(formValues, userPrompt),
      isForPrint: this.detectPrintUsage(formValues),
      needsTransparency: this.detectTransparencyNeed(category, formValues),
      isIcon: this.detectIconUsage(category, formValues),
      isLogo: category === 'logo-brand',
      platform: this.extractPlatform(formValues),
      colorComplexity: this.analyzeColorComplexity(userPrompt, formValues)
    };

    return context;
  }

  /**
   * Detect if the image will contain text
   */
  private static detectTextContent(formValues: CategoryFormValues, userPrompt: string): boolean {
    // Check form fields for text content
    const textFields = ['textOnImage', 'buttonText', 'eventTitle', 'companyName', 'keyInformation'];
    const hasFormText = textFields.some(field => formValues[field] && formValues[field].length > 0);
    
    // Check prompt for text-related keywords
    const textKeywords = ['text', 'title', 'headline', 'caption', 'label', 'sign', 'words', 'message'];
    const hasPromptText = textKeywords.some(keyword => 
      userPrompt.toLowerCase().includes(keyword)
    );
    
    return hasFormText || hasPromptText;
  }

  /**
   * Detect if this is for print usage
   */
  private static detectPrintUsage(formValues: CategoryFormValues): boolean {
    const printMaterials = ['business-card', 'flyer', 'letterhead', 'brochure'];
    return printMaterials.some(material => 
      formValues.materialType === material || 
      formValues.componentType === material
    );
  }

  /**
   * Detect if transparency is needed
   */
  private static detectTransparencyNeed(category: ImageCategory, formValues: CategoryFormValues): boolean {
    // Categories that typically need transparency
    const transparencyCategories: ImageCategory[] = ['logo-brand', 'ui-components'];
    if (transparencyCategories.includes(category)) return true;
    
    // Component types that need transparency
    const transparencyComponents = ['icon', 'button', 'logo'];
    return transparencyComponents.some(comp => 
      formValues.componentType === comp || formValues.iconRepresents
    );
  }

  /**
   * Detect if this is an icon
   */
  private static detectIconUsage(category: ImageCategory, formValues: CategoryFormValues): boolean {
    return category === 'ui-components' && formValues.componentType === 'icon';
  }

  /**
   * Extract platform information
   */
  private static extractPlatform(formValues: CategoryFormValues): string | undefined {
    return formValues.platform || formValues.targetPlatform;
  }

  /**
   * Analyze color complexity from prompt and form data
   */
  private static analyzeColorComplexity(userPrompt: string, formValues: CategoryFormValues): 'simple' | 'moderate' | 'complex' {
    // Simple indicators
    const simpleKeywords = ['minimal', 'simple', 'clean', 'monochrome', 'black and white', 'single color'];
    if (simpleKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword))) {
      return 'simple';
    }
    
    // Complex indicators
    const complexKeywords = ['colorful', 'vibrant', 'rainbow', 'gradient', 'multicolor', 'detailed', 'rich colors'];
    if (complexKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword))) {
      return 'complex';
    }
    
    // Form-based complexity
    if (formValues.visualStyle === 'vibrant-colorful' || formValues.visualStyle === 'retro-vintage') {
      return 'complex';
    }
    
    if (formValues.visualStyle === 'minimalist-clean' || formValues.logoStyle === 'minimalist-abstract') {
      return 'simple';
    }
    
    return 'moderate';
  }
} 
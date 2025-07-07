// AI Parameter Optimization Test Suite
import { AIParameterOptimizer, type ImageGenerationContext, type OptimalImageParameters } from '@/components/creation-hub/ai-parameter-optimizer';
import { ImageProcessor } from '@/components/creation-hub/image-processor';
import type { ImageCategory, CategoryFormValues } from '@/components/creation-hub/category-types';

describe('AI Parameter Optimization System', () => {
  
  describe('Social Media Optimization', () => {
    test('Instagram post with text should use PNG for text clarity', async () => {
      const context: ImageGenerationContext = {
        category: 'social-media',
        formValues: {
          platform: 'instagram-post',
          postTopic: 'New product launch',
          textOnImage: 'Now Available! 50% Off',
          visualStyle: 'vibrant-colorful'
        },
        userPrompt: 'Create an engaging Instagram post about our new product launch',
        hasText: true,
        isForPrint: false,
        needsTransparency: false,
        isIcon: false,
        isLogo: false,
        platform: 'instagram',
        colorComplexity: 'complex'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1024x1024'); // Square for Instagram
      expect(params.format).toBe('png'); // PNG for text clarity
      expect(params.quality).toBe('high'); // High quality for social media
      expect(params.background).toBe('opaque');
      expect(params.reasoning).toContain('PNG selected for text clarity');
    });

    test('Instagram story without text should use JPEG with compression', async () => {
      const context: ImageGenerationContext = {
        category: 'social-media',
        formValues: {
          platform: 'instagram-story',
          postTopic: 'Sunset beach photo',
          visualStyle: 'bright-airy'
        },
        userPrompt: 'Beautiful sunset at the beach',
        hasText: false,
        platform: 'instagram',
        colorComplexity: 'moderate'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1024x1536'); // Vertical for story
      expect(params.quality).toBe('high');
      expect(params.compression).toBe(90); // Higher compression for Instagram
    });
  });

  describe('Logo & Brand Optimization', () => {
    test('Logo should always use transparent background and PNG', async () => {
      const context: ImageGenerationContext = {
        category: 'logo-brand',
        formValues: {
          companyName: 'TechStart Inc',
          logoStyle: 'minimalist-abstract',
          industry: 'technology',
          coreFeeling: ['modern', 'trustworthy', 'innovative']
        },
        userPrompt: 'Create a modern minimalist logo for TechStart Inc',
        isLogo: true,
        needsTransparency: true,
        colorComplexity: 'simple'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.format).toBe('png');
      expect(params.background).toBe('transparent');
      expect(params.quality).toBe('high');
      expect(params.compression).toBeUndefined(); // No compression for PNG
      expect(params.reasoning).toContain('transparent background');
    });

    test('Wordmark logo should use landscape orientation', async () => {
      const context: ImageGenerationContext = {
        category: 'logo-brand',
        formValues: {
          companyName: 'Creative Agency',
          logoStyle: 'wordmark',
          industry: 'creative',
          coreFeeling: ['creative', 'professional']
        },
        userPrompt: 'Create a wordmark logo for Creative Agency',
        isLogo: true,
        hasText: true,
        needsTransparency: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1536x1024'); // Landscape for wordmark
      expect(params.reasoning).toContain('Landscape orientation for wordmark');
    });
  });

  describe('UI Components Optimization', () => {
    test('Icon should use square transparent PNG', async () => {
      const context: ImageGenerationContext = {
        category: 'ui-components',
        formValues: {
          componentType: 'icon',
          iconRepresents: 'Shopping cart',
          iconStyle: 'line-art'
        },
        userPrompt: 'Create a shopping cart icon',
        isIcon: true,
        needsTransparency: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1024x1024'); // Square for icon
      expect(params.format).toBe('png');
      expect(params.background).toBe('transparent');
      expect(params.reasoning).toContain('Square transparent PNG for icon');
    });

    test('Hero image should use landscape JPEG', async () => {
      const context: ImageGenerationContext = {
        category: 'ui-components',
        formValues: {
          componentType: 'hero-image',
          heroSubject: 'Team collaborating in modern office',
          heroMood: ['professional', 'inspirational']
        },
        userPrompt: 'Create a hero image showing team collaboration',
        platform: 'web'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1536x1024'); // Landscape for hero
      expect(params.format).toBe('jpeg');
      expect(params.background).toBe('opaque');
      expect(params.compression).toBe(85);
      expect(params.reasoning).toContain('Landscape JPEG for hero image');
    });

    test('Button should use transparent PNG', async () => {
      const context: ImageGenerationContext = {
        category: 'ui-components',
        formValues: {
          componentType: 'button',
          buttonText: 'Sign Up Now',
          buttonStyle: ['rounded-corners', 'gradient']
        },
        userPrompt: 'Create a sign up button',
        hasText: true,
        needsTransparency: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.format).toBe('png');
      expect(params.background).toBe('transparent');
      expect(params.reasoning).toContain('Square transparent PNG for button');
    });
  });

  describe('Marketing Materials Optimization', () => {
    test('Business card should use high quality PNG', async () => {
      const context: ImageGenerationContext = {
        category: 'marketing',
        formValues: {
          materialType: 'business-card'
        },
        userPrompt: 'Create a professional business card design',
        isForPrint: true,
        hasText: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.quality).toBe('high');
      expect(params.format).toBe('png');
      expect(params.reasoning).toContain('High quality PNG for print material');
    });
  });

  describe('Banner Optimization', () => {
    test('Banner should use landscape JPEG with compression', async () => {
      const context: ImageGenerationContext = {
        category: 'banners',
        formValues: {},
        userPrompt: 'Create a promotional banner',
        platform: 'web'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1536x1024'); // Landscape
      expect(params.format).toBe('jpeg');
      expect(params.compression).toBe(90);
      expect(params.reasoning).toContain('Landscape JPEG with light compression for banner');
    });
  });

  describe('AI Avatar Optimization', () => {
    test('Professional avatar should support transparency', async () => {
      const context: ImageGenerationContext = {
        category: 'ai-avatars',
        formValues: {
          avatarStyle: 'professional'
        },
        userPrompt: 'Create a professional business avatar',
        targetAudience: 'business'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.size).toBe('1024x1024'); // Square for avatar
      expect(params.background).toBe('transparent');
      expect(params.format).toBe('png');
      expect(params.reasoning).toContain('Transparent background for professional avatar');
    });
  });

  describe('Data Visualization Optimization', () => {
    test('Chart should use PNG for clarity', async () => {
      const context: ImageGenerationContext = {
        category: 'data-viz',
        formValues: {},
        userPrompt: 'Create a bar chart showing quarterly results',
        hasText: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.format).toBe('png');
      expect(params.quality).toBe('high');
      expect(params.reasoning).toContain('PNG selected for text readability');
    });
  });

  describe('Context Analysis', () => {
    test('Should detect text content correctly', () => {
      const formValues = { textOnImage: 'Sale 50% Off!' };
      const prompt = 'Create an image with promotional text';
      
      const hasText = AIParameterOptimizer['detectTextContent'](formValues, prompt);
      expect(hasText).toBe(true);
    });

    test('Should detect print usage correctly', () => {
      const formValues = { materialType: 'business-card' };
      
      const isForPrint = AIParameterOptimizer['detectPrintUsage'](formValues);
      expect(isForPrint).toBe(true);
    });

    test('Should detect transparency need correctly', () => {
      const needsTransparency = AIParameterOptimizer['detectTransparencyNeed']('logo-brand', {});
      expect(needsTransparency).toBe(true);
    });

    test('Should analyze color complexity correctly', () => {
      const complexPrompt = 'vibrant rainbow colors with detailed gradients';
      const complexity = AIParameterOptimizer['analyzeColorComplexity'](complexPrompt, {});
      expect(complexity).toBe('complex');
      
      const simplePrompt = 'minimalist black and white design';
      const simplicityLevel = AIParameterOptimizer['analyzeColorComplexity'](simplePrompt, {});
      expect(simplicityLevel).toBe('simple');
    });
  });

  describe('Image Processing Integration', () => {
    test('Should recommend processing for optimized parameters', () => {
      const params: OptimalImageParameters = {
        size: '1024x1024',
        quality: 'high',
        format: 'webp',
        background: 'transparent',
        compression: 80,
        reasoning: 'Test parameters'
      };
      
      const shouldProcess = ImageProcessor.shouldProcessImage(params);
      expect(shouldProcess).toBe(true);
    });

    test('Should get recommended format correctly', () => {
      // Logo should use PNG
      const logoFormat = ImageProcessor.getRecommendedFormat('logo-brand', true, false);
      expect(logoFormat).toBe('png');
      
      // Social media should use JPEG
      const socialFormat = ImageProcessor.getRecommendedFormat('social-media', false, false);
      expect(socialFormat).toBe('jpeg');
      
      // Text-based should use PNG
      const textFormat = ImageProcessor.getRecommendedFormat('marketing', false, true);
      expect(textFormat).toBe('png');
    });

    test('Should estimate processing time reasonably', () => {
      const time = ImageProcessor.estimateProcessingTime(1024, 1024);
      expect(time).toBeGreaterThan(100);
      expect(time).toBeLessThan(2000);
    });
  });

  describe('Parameter Validation', () => {
    test('Should ensure compression only for JPEG/WebP', async () => {
      const context: ImageGenerationContext = {
        category: 'logo-brand',
        formValues: { logoStyle: 'minimalist-abstract' },
        userPrompt: 'Create a logo',
        isLogo: true,
        needsTransparency: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      // PNG format should not have compression
      if (params.format === 'png') {
        expect(params.compression).toBeUndefined();
      }
    });

    test('Should ensure transparency only for PNG/WebP', async () => {
      const context: ImageGenerationContext = {
        category: 'social-media',
        formValues: { platform: 'instagram-post', visualStyle: 'bright-airy' },
        userPrompt: 'Create an image',
        hasText: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      // If transparent background requested with JPEG, should switch to PNG
      if (params.background === 'transparent') {
        expect(params.format).not.toBe('jpeg');
      }
    });
  });

  describe('Performance and Quality Balance', () => {
    test('Should balance quality vs file size for web usage', async () => {
      const context: ImageGenerationContext = {
        category: 'banners',
        formValues: {},
        userPrompt: 'Create a web banner',
        platform: 'web',
        colorComplexity: 'moderate'
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      // Web banners should prioritize performance
      expect(params.format).toBe('jpeg');
      expect(params.compression).toBeDefined();
      expect(params.compression).toBeGreaterThan(80); // Good quality but compressed
    });

    test('Should prioritize quality for print materials', async () => {
      const context: ImageGenerationContext = {
        category: 'marketing',
        formValues: { materialType: 'flyer' },
        userPrompt: 'Create a print flyer',
        isForPrint: true
      };

      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      expect(params.quality).toBe('high');
      expect(params.format).toBe('png'); // No compression for print
    });
  });
});

// Helper function to run integration tests
export async function runAIOptimizationIntegrationTest(): Promise<{
  success: boolean;
  results: Array<{
    category: ImageCategory;
    testCase: string;
    params: OptimalImageParameters;
    passed: boolean;
    issues?: string[];
  }>;
}> {
  const results = [];
  let allPassed = true;

  // Test all 10 categories with different scenarios
  const testCases = [
    {
      category: 'social-media' as ImageCategory,
      testCase: 'Instagram post with text',
      formValues: { platform: 'instagram-post', textOnImage: 'Sale!' },
      expectedFormat: 'png',
      expectedTransparency: false
    },
    {
      category: 'logo-brand' as ImageCategory,
      testCase: 'Minimalist logo',
      formValues: { logoStyle: 'minimalist-abstract' },
      expectedFormat: 'png',
      expectedTransparency: true
    },
    {
      category: 'ui-components' as ImageCategory,
      testCase: 'Shopping cart icon',
      formValues: { componentType: 'icon' },
      expectedFormat: 'png',
      expectedTransparency: true
    },
    {
      category: 'marketing' as ImageCategory,
      testCase: 'Business card',
      formValues: { materialType: 'business-card' },
      expectedFormat: 'png',
      expectedTransparency: false
    },
    {
      category: 'banners' as ImageCategory,
      testCase: 'Website banner',
      formValues: {},
      expectedFormat: 'jpeg',
      expectedTransparency: false
    },
    {
      category: 'data-viz' as ImageCategory,
      testCase: 'Bar chart',
      formValues: {},
      expectedFormat: 'png',
      expectedTransparency: false
    },
    {
      category: 'illustrations' as ImageCategory,
      testCase: 'Character art',
      formValues: {},
      expectedFormat: 'png',
      expectedTransparency: false
    },
    {
      category: 'product-mockups' as ImageCategory,
      testCase: 'T-shirt design',
      formValues: {},
      expectedFormat: 'png',
      expectedTransparency: false
    },
    {
      category: 'letterhead' as ImageCategory,
      testCase: 'Company letterhead',
      formValues: {},
      expectedFormat: 'png',
      expectedTransparency: false
    },
    {
      category: 'ai-avatars' as ImageCategory,
      testCase: 'Professional avatar',
      formValues: { avatarStyle: 'professional' },
      expectedFormat: 'png',
      expectedTransparency: true
    }
  ];

  for (const testCase of testCases) {
    try {
      const context = AIParameterOptimizer.analyzeContext(
        testCase.category,
        testCase.formValues,
        `Create a ${testCase.testCase}`
      );
      
      const params = await AIParameterOptimizer.optimizeParameters(context);
      
      const issues: string[] = [];
      let passed = true;

      // Validate format
      if (params.format !== testCase.expectedFormat) {
        issues.push(`Expected format ${testCase.expectedFormat}, got ${params.format}`);
        passed = false;
      }

      // Validate transparency
      const hasTransparency = params.background === 'transparent';
      if (hasTransparency !== testCase.expectedTransparency) {
        issues.push(`Expected transparency ${testCase.expectedTransparency}, got ${hasTransparency}`);
        passed = false;
      }

      // Validate reasoning exists
      if (!params.reasoning || params.reasoning.length < 10) {
        issues.push('No proper reasoning provided');
        passed = false;
      }

      results.push({
        category: testCase.category,
        testCase: testCase.testCase,
        params,
        passed,
        issues: issues.length > 0 ? issues : undefined
      });

      if (!passed) {
        allPassed = false;
      }

    } catch (error) {
      results.push({
        category: testCase.category,
        testCase: testCase.testCase,
        params: {} as OptimalImageParameters,
        passed: false,
        issues: [error instanceof Error ? error.message : 'Unknown error']
      });
      allPassed = false;
    }
  }

  return {
    success: allPassed,
    results
  };
} 
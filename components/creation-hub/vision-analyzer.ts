// Vision Analysis Utility - Analyze reference images to enhance prompts

import OpenAI from 'openai';

export interface VisionAnalysisResult {
  description: string;
  keyElements: string[];
  colorPalette: string[];
  styleNotes: string[];
  compositionNotes: string[];
  moodDescription: string;
  technicalQuality: string;
}

export interface VisionAnalysisOptions {
  focusAreas?: ('colors' | 'composition' | 'style' | 'mood' | 'objects' | 'people' | 'text')[];
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  categoryContext?: string;
}

// Default OpenAI client (will be initialized with API key from environment)
let openaiClient: OpenAI | null = null;

export function initializeVisionAnalyzer(apiKey: string) {
  openaiClient = new OpenAI({ apiKey });
}

export async function analyzeImageForVision(
  imageFile: File,
  options: VisionAnalysisOptions = {}
): Promise<VisionAnalysisResult> {
  if (!openaiClient) {
    throw new Error('Vision analyzer not initialized. Call initializeVisionAnalyzer first.');
  }

  const {
    focusAreas = ['colors', 'composition', 'style', 'mood'],
    analysisDepth = 'detailed',
    categoryContext
  } = options;

  // Convert image file to base64 data URL
  const base64Image = await fileToBase64(imageFile);

  // Create analysis prompt based on focus areas and context
  const prompt = createVisionAnalysisPrompt(focusAreas, analysisDepth, categoryContext);

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: analysisDepth === 'comprehensive' ? 'high' : 'auto'
              }
            }
          ]
        }
      ],
      max_tokens: analysisDepth === 'comprehensive' ? 800 : 
                  analysisDepth === 'detailed' ? 500 : 300,
      temperature: 0.7
    });

    const analysisText = response.choices[0]?.message?.content || '';
    return parseVisionAnalysis(analysisText);

  } catch (error) {
    console.error('Vision analysis error:', error);
    
    // Fallback analysis based on basic image properties
    return {
      description: `Reference image provided for visual inspiration`,
      keyElements: ['Visual reference provided'],
      colorPalette: ['Colors from reference image'],
      styleNotes: ['Style reference provided'],
      compositionNotes: ['Composition reference available'],
      moodDescription: 'Mood inspired by reference image',
      technicalQuality: 'Reference image quality varies'
    };
  }
}

export async function analyzeBatchImages(
  imageFiles: File[],
  options: VisionAnalysisOptions = {}
): Promise<VisionAnalysisResult[]> {
  if (imageFiles.length === 0) return [];
  
  // Analyze up to 3 images to avoid API limits
  const imagesToAnalyze = imageFiles.slice(0, 3);
  
  const analysisPromises = imagesToAnalyze.map(file => 
    analyzeImageForVision(file, options)
  );

  try {
    return await Promise.all(analysisPromises);
  } catch (error) {
    console.error('Batch vision analysis error:', error);
    
    // Return fallback analysis for each image
    return imagesToAnalyze.map(() => ({
      description: 'Reference image provided',
      keyElements: ['Visual elements from reference'],
      colorPalette: ['Reference color scheme'],
      styleNotes: ['Reference styling'],
      compositionNotes: ['Reference composition'],
      moodDescription: 'Reference mood and atmosphere',
      technicalQuality: 'Reference image provided'
    }));
  }
}

export function combineVisionAnalyses(analyses: VisionAnalysisResult[]): VisionAnalysisResult {
  if (analyses.length === 0) {
    return {
      description: '',
      keyElements: [],
      colorPalette: [],
      styleNotes: [],
      compositionNotes: [],
      moodDescription: '',
      technicalQuality: ''
    };
  }

  if (analyses.length === 1) {
    return analyses[0];
  }

  // Combine multiple analyses into a comprehensive description
  const combined: VisionAnalysisResult = {
    description: analyses.map(a => a.description).join(' '),
    keyElements: [...new Set(analyses.flatMap(a => a.keyElements))],
    colorPalette: [...new Set(analyses.flatMap(a => a.colorPalette))],
    styleNotes: [...new Set(analyses.flatMap(a => a.styleNotes))],
    compositionNotes: [...new Set(analyses.flatMap(a => a.compositionNotes))],
    moodDescription: analyses.map(a => a.moodDescription).join(', '),
    technicalQuality: analyses[0].technicalQuality // Use first analysis for technical quality
  };

  // Limit arrays to prevent overly long descriptions
  combined.keyElements = combined.keyElements.slice(0, 8);
  combined.colorPalette = combined.colorPalette.slice(0, 6);
  combined.styleNotes = combined.styleNotes.slice(0, 5);
  combined.compositionNotes = combined.compositionNotes.slice(0, 5);

  return combined;
}

// Helper function to convert File to base64 data URL
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Create analysis prompt based on focus areas and context
function createVisionAnalysisPrompt(
  focusAreas: string[],
  analysisDepth: string,
  categoryContext?: string
): string {
  const basePrompt = `Analyze this image and provide detailed information for AI image generation enhancement.`;
  
  const contextPrompt = categoryContext 
    ? `This image will be used as reference for creating ${categoryContext}.`
    : '';

  const focusPrompts = {
    colors: 'Identify the dominant colors, color palette, color temperature, and color relationships.',
    composition: 'Analyze the composition, layout, framing, rule of thirds usage, focal points, and visual balance.',
    style: 'Describe the artistic style, visual aesthetic, design approach, and artistic techniques used.',
    mood: 'Analyze the mood, atmosphere, emotional tone, and feeling conveyed by the image.',
    objects: 'Identify and describe the main objects, elements, and subjects in the image.',
    people: 'Describe any people in the image including their appearance, poses, expressions, and clothing.',
    text: 'Identify any text, typography, or textual elements and describe their style and placement.'
  };

  const selectedFocusAreas = focusAreas
    .filter(area => area in focusPrompts)
    .map(area => focusPrompts[area as keyof typeof focusPrompts]);

  const depthInstructions = {
    basic: 'Provide a concise analysis with key points.',
    detailed: 'Provide a thorough analysis with specific details.',
    comprehensive: 'Provide an exhaustive analysis with comprehensive details for professional use.'
  };

  const formatInstructions = `
Format your response as follows:
DESCRIPTION: [Overall description of the image]
KEY_ELEMENTS: [List key visual elements separated by commas]
COLOR_PALETTE: [List dominant colors separated by commas]
STYLE_NOTES: [List style characteristics separated by commas]
COMPOSITION_NOTES: [List composition elements separated by commas]
MOOD: [Describe the overall mood and atmosphere]
TECHNICAL_QUALITY: [Brief note on image quality and technical aspects]
`;

  return [
    basePrompt,
    contextPrompt,
    selectedFocusAreas.join(' '),
    depthInstructions[analysisDepth as keyof typeof depthInstructions],
    formatInstructions
  ].filter(Boolean).join('\n\n');
}

// Parse the vision analysis response into structured data
function parseVisionAnalysis(responseText: string): VisionAnalysisResult {
  const sections = {
    description: extractSection(responseText, 'DESCRIPTION'),
    keyElements: extractListSection(responseText, 'KEY_ELEMENTS'),
    colorPalette: extractListSection(responseText, 'COLOR_PALETTE'),
    styleNotes: extractListSection(responseText, 'STYLE_NOTES'),
    compositionNotes: extractListSection(responseText, 'COMPOSITION_NOTES'),
    moodDescription: extractSection(responseText, 'MOOD'),
    technicalQuality: extractSection(responseText, 'TECHNICAL_QUALITY')
  };

  return {
    description: sections.description || 'Image analysis provided',
    keyElements: sections.keyElements || ['Visual elements identified'],
    colorPalette: sections.colorPalette || ['Color scheme analyzed'],
    styleNotes: sections.styleNotes || ['Style characteristics noted'],
    compositionNotes: sections.compositionNotes || ['Composition analyzed'],
    moodDescription: sections.moodDescription || 'Mood and atmosphere captured',
    technicalQuality: sections.technicalQuality || 'Image quality assessed'
  };
}

// Extract a section from the response text
function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:\\s*([^\\n]+(?:\\n(?!\\w+:)[^\\n]+)*)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// Extract a list section and split into array
function extractListSection(text: string, sectionName: string): string[] {
  const sectionText = extractSection(text, sectionName);
  if (!sectionText) return [];
  
  return sectionText
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .slice(0, 10); // Limit to prevent overly long lists
}

// Generate enhanced prompt from vision analysis
export function enhancePromptWithVision(
  originalPrompt: string,
  visionAnalysis: VisionAnalysisResult,
  categoryContext?: string
): string {
  const visionEnhancements = [];

  // Add description if meaningful
  if (visionAnalysis.description && visionAnalysis.description !== 'Image analysis provided') {
    visionEnhancements.push(`Visual Reference: ${visionAnalysis.description}`);
  }

  // Add color information
  if (visionAnalysis.colorPalette.length > 0) {
    visionEnhancements.push(`Color Inspiration: ${visionAnalysis.colorPalette.join(', ')}`);
  }

  // Add style notes
  if (visionAnalysis.styleNotes.length > 0) {
    visionEnhancements.push(`Style Elements: ${visionAnalysis.styleNotes.join(', ')}`);
  }

  // Add mood information
  if (visionAnalysis.moodDescription) {
    visionEnhancements.push(`Mood Reference: ${visionAnalysis.moodDescription}`);
  }

  // Add composition notes for certain categories
  if (categoryContext && ['banners', 'marketing', 'ui-components'].includes(categoryContext)) {
    if (visionAnalysis.compositionNotes.length > 0) {
      visionEnhancements.push(`Composition Inspiration: ${visionAnalysis.compositionNotes.join(', ')}`);
    }
  }

  // Combine original prompt with vision enhancements
  const enhancedPrompt = [
    originalPrompt,
    '',
    'Reference Image Analysis:',
    ...visionEnhancements
  ].join('\n');

  return enhancedPrompt;
}

// Category-specific vision analysis configurations
export const CATEGORY_VISION_CONFIGS: Record<string, VisionAnalysisOptions> = {
  'social-media': {
    focusAreas: ['colors', 'composition', 'mood', 'text'],
    analysisDepth: 'detailed',
    categoryContext: 'social media content'
  },
  'logo-brand': {
    focusAreas: ['style', 'colors', 'composition'],
    analysisDepth: 'comprehensive',
    categoryContext: 'logo and brand design'
  },
  'ui-components': {
    focusAreas: ['style', 'composition', 'colors'],
    analysisDepth: 'detailed',
    categoryContext: 'UI components and interface elements'
  },
  'marketing': {
    focusAreas: ['composition', 'colors', 'text', 'style'],
    analysisDepth: 'detailed',
    categoryContext: 'marketing materials'
  },
  'banners': {
    focusAreas: ['composition', 'colors', 'text', 'mood'],
    analysisDepth: 'detailed',
    categoryContext: 'banner design'
  },
  'product-mockups': {
    focusAreas: ['style', 'composition', 'colors', 'objects'],
    analysisDepth: 'comprehensive',
    categoryContext: 'product mockup'
  },
  'illustrations': {
    focusAreas: ['style', 'colors', 'composition', 'mood', 'people'],
    analysisDepth: 'comprehensive',
    categoryContext: 'illustration and artwork'
  },
  'ai-avatars': {
    focusAreas: ['people', 'style', 'colors', 'mood'],
    analysisDepth: 'comprehensive',
    categoryContext: 'avatar and character design'
  },
  'letterhead': {
    focusAreas: ['style', 'composition', 'colors'],
    analysisDepth: 'detailed',
    categoryContext: 'professional letterhead'
  },
  'data-viz': {
    focusAreas: ['colors', 'style', 'composition'],
    analysisDepth: 'detailed',
    categoryContext: 'data visualization'
  }
}; 
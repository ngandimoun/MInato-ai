// Hub Prompts - Optimized prompt templates and enhancement for image generation
import { PromptSuggestion, StylePreset } from './hub-types';

// ===== Core Prompt Enhancement =====

export interface PromptEnhancementOptions {
  style?: 'photographic' | 'artistic' | 'abstract' | 'cinematic' | 'digital_art' | 'sketch' | 'oil_painting' | 'watercolor' | 'anime' | 'cartoon';
  mood?: 'bright' | 'dark' | 'dramatic' | 'peaceful' | 'energetic' | 'melancholic' | 'mysterious' | 'vibrant' | 'muted' | 'warm' | 'cool';
  quality?: 'ultra_detailed' | 'high_detail' | 'standard' | 'artistic_freedom';
  lighting?: 'natural' | 'dramatic' | 'soft' | 'golden_hour' | 'blue_hour' | 'neon' | 'studio' | 'candlelight' | 'backlighting';
  composition?: 'centered' | 'rule_of_thirds' | 'close_up' | 'wide_angle' | 'portrait' | 'landscape' | 'aerial' | 'macro';
  camera?: 'dslr' | 'film' | 'instant' | 'vintage' | 'professional' | 'smartphone' | 'security_camera' | 'drone';
  enhanceDetails?: boolean;
  addArtisticElements?: boolean;
  includeNegativePrompt?: boolean;
}

export function enhancePrompt(
  originalPrompt: string, 
  options: PromptEnhancementOptions = {}
): string {
  let enhancedPrompt = originalPrompt.trim();
  
  // Style enhancement
  if (options.style) {
    const styleModifiers = getStyleModifiers(options.style);
    enhancedPrompt = `${enhancedPrompt}, ${styleModifiers}`;
  }

  // Quality enhancement
  if (options.quality && options.quality !== 'artistic_freedom') {
    const qualityModifiers = getQualityModifiers(options.quality);
    enhancedPrompt = `${enhancedPrompt}, ${qualityModifiers}`;
  }

  // Lighting enhancement
  if (options.lighting) {
    const lightingModifiers = getLightingModifiers(options.lighting);
    enhancedPrompt = `${enhancedPrompt}, ${lightingModifiers}`;
  }

  // Mood enhancement
  if (options.mood) {
    const moodModifiers = getMoodModifiers(options.mood);
    enhancedPrompt = `${enhancedPrompt}, ${moodModifiers}`;
  }

  // Composition enhancement
  if (options.composition) {
    const compositionModifiers = getCompositionModifiers(options.composition);
    enhancedPrompt = `${enhancedPrompt}, ${compositionModifiers}`;
  }

  // Camera/technical enhancement
  if (options.camera) {
    const cameraModifiers = getCameraModifiers(options.camera);
    enhancedPrompt = `${enhancedPrompt}, ${cameraModifiers}`;
  }

  // Detail enhancement
  if (options.enhanceDetails) {
    enhancedPrompt = `${enhancedPrompt}, extremely detailed, intricate details, fine textures, sharp focus`;
  }

  // Artistic elements
  if (options.addArtisticElements) {
    enhancedPrompt = `${enhancedPrompt}, masterpiece, award-winning, professional composition`;
  }

  return enhancedPrompt;
}

// ===== Style Modifiers =====

function getStyleModifiers(style: string): string {
  const modifiers: Record<string, string> = {
    photographic: 'photorealistic, realistic photography, professional photo',
    artistic: 'artistic interpretation, creative style, expressive brushwork',
    abstract: 'abstract art, non-representational, geometric forms, flowing shapes',
    cinematic: 'cinematic lighting, movie scene, dramatic composition, film still',
    digital_art: 'digital painting, concept art, digital illustration, rendered',
    sketch: 'pencil sketch, hand-drawn, sketchy lines, artistic drawing',
    oil_painting: 'oil painting, canvas texture, painterly style, classical art',
    watercolor: 'watercolor painting, flowing colors, wet-on-wet technique, artistic',
    anime: 'anime style, manga art, Japanese animation, stylized characters',
    cartoon: 'cartoon style, animated, colorful, stylized illustration'
  };
  return modifiers[style] || '';
}

function getQualityModifiers(quality: string): string {
  const modifiers: Record<string, string> = {
    ultra_detailed: 'ultra detailed, 8k resolution, hyper realistic, photorealistic details, crystal clear',
    high_detail: 'highly detailed, sharp focus, clear definition, professional quality',
    standard: 'well composed, good quality, balanced colors'
  };
  return modifiers[quality] || '';
}

function getLightingModifiers(lighting: string): string {
  const modifiers: Record<string, string> = {
    natural: 'natural lighting, daylight, soft shadows',
    dramatic: 'dramatic lighting, strong contrast, chiaroscuro',
    soft: 'soft lighting, diffused light, gentle shadows',
    golden_hour: 'golden hour lighting, warm sunlight, magic hour',
    blue_hour: 'blue hour, twilight, cool tones, atmospheric',
    neon: 'neon lighting, cyberpunk atmosphere, electric colors',
    studio: 'studio lighting, controlled illumination, professional setup',
    candlelight: 'candlelight, warm glow, intimate atmosphere',
    backlighting: 'backlighting, rim light, silhouette effect'
  };
  return modifiers[lighting] || '';
}

function getMoodModifiers(mood: string): string {
  const modifiers: Record<string, string> = {
    bright: 'bright and cheerful, uplifting, positive energy',
    dark: 'dark and moody, mysterious atmosphere, shadows',
    dramatic: 'dramatic intensity, powerful emotion, striking',
    peaceful: 'peaceful and serene, calm atmosphere, tranquil',
    energetic: 'dynamic and energetic, movement, vibrant energy',
    melancholic: 'melancholic mood, nostalgic, contemplative',
    mysterious: 'mysterious and enigmatic, hidden secrets, intrigue',
    vibrant: 'vibrant colors, saturated, bold and lively',
    muted: 'muted tones, subtle colors, understated elegance',
    warm: 'warm color palette, cozy atmosphere, inviting',
    cool: 'cool color palette, fresh atmosphere, calming'
  };
  return modifiers[mood] || '';
}

function getCompositionModifiers(composition: string): string {
  const modifiers: Record<string, string> = {
    centered: 'centered composition, symmetrical balance',
    rule_of_thirds: 'rule of thirds composition, dynamic balance',
    close_up: 'close-up shot, detailed view, intimate perspective',
    wide_angle: 'wide angle view, expansive scene, panoramic',
    portrait: 'portrait orientation, vertical composition',
    landscape: 'landscape orientation, horizontal composition',
    aerial: 'aerial view, birds eye perspective, top down',
    macro: 'macro photography, extreme close-up, detailed textures'
  };
  return modifiers[composition] || '';
}

function getCameraModifiers(camera: string): string {
  const modifiers: Record<string, string> = {
    dslr: 'DSLR photography, professional camera, high quality lens',
    film: 'film photography, analog aesthetic, grain texture',
    instant: 'instant camera, polaroid style, vintage feel',
    vintage: 'vintage camera, retro aesthetic, old-fashioned',
    professional: 'professional photography, commercial quality',
    smartphone: 'smartphone photography, modern mobile capture',
    security_camera: 'security camera footage, surveillance style',
    drone: 'drone photography, aerial perspective, elevated view'
  };
  return modifiers[camera] || '';
}

// ===== Multi-turn Enhancement =====

export function enhanceMultiTurnPrompt(
  originalPrompt: string,
  previousPrompts: string[],
  instructions?: string
): string {
  let enhancedPrompt = originalPrompt.trim();

  // Add context from previous generations
  if (previousPrompts.length > 0) {
    enhancedPrompt = `Building upon the previous image: ${originalPrompt}`;
    
    if (instructions) {
      enhancedPrompt += `. ${instructions}`;
    }
  }

  // Add multi-turn specific modifiers
  if (previousPrompts.length > 0) {
    enhancedPrompt += ', maintain consistent style and quality, evolved composition';
  }

  return enhancedPrompt;
}

// ===== Prompt Suggestions =====

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  // Artistic
  {
    id: 'art_portrait',
    text: 'A stunning portrait of a person with dramatic lighting and artistic composition',
    category: 'artistic',
    tags: ['portrait', 'dramatic', 'artistic'],
    popularity: 95
  },
  {
    id: 'art_landscape',
    text: 'A breathtaking landscape with vibrant colors and dramatic sky',
    category: 'landscape',
    tags: ['landscape', 'nature', 'colorful'],
    popularity: 90
  },
  {
    id: 'art_abstract',
    text: 'An abstract composition with flowing colors and geometric shapes',
    category: 'abstract',
    tags: ['abstract', 'geometric', 'colorful'],
    popularity: 75
  },
  
  // Photographic
  {
    id: 'photo_street',
    text: 'A candid street photography scene with natural lighting',
    category: 'photographic',
    tags: ['street', 'candid', 'realistic'],
    popularity: 85
  },
  {
    id: 'photo_nature',
    text: 'A macro photograph of dewdrops on a flower petal',
    category: 'photographic',
    tags: ['macro', 'nature', 'detailed'],
    popularity: 80
  },
  
  // Character
  {
    id: 'char_fantasy',
    text: 'A mysterious fantasy character in an enchanted forest',
    category: 'character',
    tags: ['fantasy', 'character', 'magical'],
    popularity: 88
  },
  {
    id: 'char_sci_fi',
    text: 'A futuristic cyberpunk character with neon lighting',
    category: 'character',
    tags: ['sci-fi', 'cyberpunk', 'futuristic'],
    popularity: 82
  },
  
  // Concept
  {
    id: 'concept_architecture',
    text: 'Futuristic architecture with organic flowing forms',
    category: 'concept',
    tags: ['architecture', 'futuristic', 'design'],
    popularity: 78
  },
  {
    id: 'concept_vehicle',
    text: 'A sleek concept vehicle in a minimalist environment',
    category: 'concept',
    tags: ['vehicle', 'concept', 'design'],
    popularity: 72
  },
  
  // Object
  {
    id: 'obj_product',
    text: 'An elegant product shot with professional studio lighting',
    category: 'object',
    tags: ['product', 'studio', 'commercial'],
    popularity: 70
  }
];

// ===== Style Presets =====

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cinematic_drama',
    name: 'Cinematic Drama',
    description: 'Movie-like scenes with dramatic lighting and composition',
    promptPrefix: 'cinematic shot of',
    promptSuffix: ', dramatic lighting, film still, professional cinematography',
    defaultQuality: 'hd',
    defaultSize: '1792x1024',
    defaultStyle: 'vivid',
    category: 'cinematic',
    tags: ['dramatic', 'film', 'professional']
  },
  {
    id: 'artistic_painting',
    name: 'Artistic Painting',
    description: 'Traditional painting styles with artistic interpretation',
    promptPrefix: 'an artistic painting of',
    promptSuffix: ', oil painting style, masterpiece, fine art, museum quality',
    defaultQuality: 'hd',
    defaultSize: '1024x1024',
    defaultStyle: 'natural',
    category: 'artistic',
    tags: ['painting', 'artistic', 'traditional']
  },
  {
    id: 'photo_realistic',
    name: 'Photorealistic',
    description: 'Ultra-realistic photography with sharp details',
    promptPrefix: 'a photorealistic image of',
    promptSuffix: ', ultra detailed, sharp focus, professional photography, 8k resolution',
    defaultQuality: 'hd',
    defaultSize: '1024x1024',
    defaultStyle: 'natural',
    category: 'photographic',
    tags: ['realistic', 'detailed', 'photography']
  },
  {
    id: 'anime_style',
    name: 'Anime Style',
    description: 'Japanese anime and manga art style',
    promptPrefix: 'anime style illustration of',
    promptSuffix: ', manga art, Japanese animation style, colorful, stylized',
    defaultQuality: 'standard',
    defaultSize: '1024x1024',
    defaultStyle: 'vivid',
    category: 'stylized',
    tags: ['anime', 'manga', 'stylized']
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, simple designs with minimal elements',
    promptPrefix: 'minimalist design of',
    promptSuffix: ', clean lines, simple composition, white background, elegant',
    defaultQuality: 'standard',
    defaultSize: '1024x1024',
    defaultStyle: 'natural',
    category: 'design',
    tags: ['minimal', 'clean', 'simple']
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic neon-lit cyberpunk aesthetic',
    promptPrefix: 'cyberpunk scene with',
    promptSuffix: ', neon lighting, futuristic, dark atmosphere, high tech, digital art',
    defaultQuality: 'hd',
    defaultSize: '1792x1024',
    defaultStyle: 'vivid',
    category: 'sci-fi',
    tags: ['cyberpunk', 'neon', 'futuristic']
  },
  {
    id: 'fantasy_art',
    name: 'Fantasy Art',
    description: 'Magical fantasy worlds and creatures',
    promptPrefix: 'fantasy art depicting',
    promptSuffix: ', magical atmosphere, fantasy world, ethereal lighting, mystical',
    defaultQuality: 'hd',
    defaultSize: '1024x1024',
    defaultStyle: 'vivid',
    category: 'fantasy',
    tags: ['fantasy', 'magical', 'mystical']
  },
  {
    id: 'vintage_film',
    name: 'Vintage Film',
    description: 'Retro film photography with vintage aesthetic',
    promptPrefix: 'vintage film photography of',
    promptSuffix: ', analog film, retro aesthetic, grain texture, warm colors, nostalgic',
    defaultQuality: 'standard',
    defaultSize: '1024x1024',
    defaultStyle: 'natural',
    category: 'vintage',
    tags: ['vintage', 'film', 'retro']
  }
];

// ===== Prompt Validation =====

export function validatePrompt(prompt: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Basic validation
  if (!prompt || prompt.trim().length === 0) {
    errors.push('Prompt cannot be empty');
  }

  if (prompt.length < 3) {
    errors.push('Prompt is too short');
  }

  if (prompt.length > 1000) {
    warnings.push('Very long prompts may not generate expected results');
  }

  // Content validation
  const prohibitedTerms = ['nsfw', 'explicit', 'violence', 'gore', 'hate'];
  const hasProhibitedContent = prohibitedTerms.some(term => 
    prompt.toLowerCase().includes(term)
  );
  
  if (hasProhibitedContent) {
    errors.push('Prompt contains prohibited content');
  }

  // Suggestions for improvement
  if (prompt.split(' ').length < 3) {
    suggestions.push('Consider adding more descriptive details');
  }

  if (!prompt.includes(',') && prompt.split(' ').length > 5) {
    suggestions.push('Consider using commas to separate different aspects');
  }

  const hasStyleKeywords = STYLE_PRESETS.some(preset =>
    prompt.toLowerCase().includes(preset.name.toLowerCase())
  );
  
  if (!hasStyleKeywords) {
    suggestions.push('Consider specifying an artistic style or medium');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// ===== Prompt Templates =====

export const PROMPT_TEMPLATES = {
  PORTRAIT: 'A {adjective} portrait of {subject}, {style}, {lighting}, {quality}',
  LANDSCAPE: 'A {adjective} landscape featuring {subject}, {atmosphere}, {time_of_day}, {style}',
  OBJECT: 'A {adjective} {object} with {details}, {lighting}, {background}, {style}',
  SCENE: 'A {adjective} scene of {activity} in {location}, {mood}, {style}, {composition}',
  ABSTRACT: 'An {adjective} abstract composition with {elements}, {colors}, {forms}, {style}',
  CONCEPT: 'A {adjective} concept design of {subject}, {style}, {purpose}, {aesthetic}'
};

export function applyTemplate(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  // Remove any remaining placeholders
  result = result.replace(/\{[^}]+\}/g, '');
  
  // Clean up extra spaces and commas
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/,\s*$/, '');
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

// ===== Export utilities =====

export function getRandomSuggestion(category?: string): PromptSuggestion {
  const filtered = category 
    ? PROMPT_SUGGESTIONS.filter(s => s.category === category)
    : PROMPT_SUGGESTIONS;
  
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function getPresetByCategory(category: string): StylePreset[] {
  return STYLE_PRESETS.filter(preset => preset.category === category);
}

export function searchSuggestions(query: string): PromptSuggestion[] {
  const lowercaseQuery = query.toLowerCase();
  return PROMPT_SUGGESTIONS.filter(suggestion =>
    suggestion.text.toLowerCase().includes(lowercaseQuery) ||
    suggestion.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  ).sort((a, b) => b.popularity - a.popularity);
} 
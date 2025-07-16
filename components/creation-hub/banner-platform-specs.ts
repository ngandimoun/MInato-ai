// Banner Platform Specifications - Technical requirements for different platforms
export interface PlatformSpec {
  id: string;
  name: string;
  displayName: string;
  category: 'social' | 'web' | 'email' | 'print' | 'display';
  dimensions: {
    width: number;
    height: number;
    unit: 'px' | 'mm' | 'in';
  };
  aspectRatio: string;
  safeZones: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    unit: 'px' | '%';
  };
  fileSpecs: {
    maxFileSize: number; // in MB
    recommendedFormats: string[];
    dpi: number;
    colorSpace: 'RGB' | 'CMYK';
  };
  textSpecs: {
    minFontSize: number;
    maxTextWidth: number; // percentage of banner width
    recommendedFonts: string[];
    textSafeZone: number; // pixels from edge
  };
  designGuidelines: {
    logoMaxSize: number; // percentage of banner height
    brandingPosition: string[];
    visualHierarchy: string[];
  };
}

export interface BrandKit {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    primary: string;
    secondary: string;
    fallbacks: string[];
  };
  logos: {
    primary: string;
    secondary?: string;
    monochrome?: string;
  };
  spacing: {
    unit: number;
    scale: number[];
  };
  guidelines: {
    logoMinSize: number;
    clearSpace: number;
    colorUsage: string[];
  };
}

export interface LayoutGrid {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  gutterWidth: number;
  marginHorizontal: number;
  marginVertical: number;
  baselineGrid: number;
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  // Social Media Platforms
  'facebook-cover': {
    id: 'facebook-cover',
    name: 'Facebook Cover',
    displayName: 'Facebook Cover Photo',
    category: 'social',
    dimensions: { width: 820, height: 312, unit: 'px' },
    aspectRatio: '2.63:1',
    safeZones: { top: 24, right: 24, bottom: 24, left: 24, unit: 'px' },
    fileSpecs: {
      maxFileSize: 8,
      recommendedFormats: ['PNG', 'JPG'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 14,
      maxTextWidth: 60,
      recommendedFonts: ['Arial', 'Helvetica', 'Open Sans'],
      textSafeZone: 40
    },
    designGuidelines: {
      logoMaxSize: 20,
      brandingPosition: ['top-left', 'top-right', 'bottom-right'],
      visualHierarchy: ['logo', 'headline', 'subtext', 'cta']
    }
  },
  'linkedin-banner': {
    id: 'linkedin-banner',
    name: 'LinkedIn Banner',
    displayName: 'LinkedIn Personal/Company Banner',
    category: 'social',
    dimensions: { width: 1584, height: 396, unit: 'px' },
    aspectRatio: '4:1',
    safeZones: { top: 32, right: 32, bottom: 32, left: 32, unit: 'px' },
    fileSpecs: {
      maxFileSize: 8,
      recommendedFormats: ['PNG', 'JPG'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 16,
      maxTextWidth: 50,
      recommendedFonts: ['Arial', 'Helvetica', 'Segoe UI'],
      textSafeZone: 48
    },
    designGuidelines: {
      logoMaxSize: 15,
      brandingPosition: ['top-right', 'bottom-left', 'bottom-right'],
      visualHierarchy: ['headline', 'logo', 'subtext', 'contact']
    }
  },
  'twitter-header': {
    id: 'twitter-header',
    name: 'Twitter Header',
    displayName: 'Twitter/X Header Image',
    category: 'social',
    dimensions: { width: 1500, height: 500, unit: 'px' },
    aspectRatio: '3:1',
    safeZones: { top: 24, right: 24, bottom: 24, left: 24, unit: 'px' },
    fileSpecs: {
      maxFileSize: 5,
      recommendedFormats: ['PNG', 'JPG'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 18,
      maxTextWidth: 65,
      recommendedFonts: ['Arial', 'Helvetica', 'Twitter Chirp'],
      textSafeZone: 40
    },
    designGuidelines: {
      logoMaxSize: 25,
      brandingPosition: ['center', 'top-left', 'bottom-right'],
      visualHierarchy: ['logo', 'tagline', 'social-handles']
    }
  },
  'instagram-story': {
    id: 'instagram-story',
    name: 'Instagram Story',
    displayName: 'Instagram Story Banner',
    category: 'social',
    dimensions: { width: 1080, height: 1920, unit: 'px' },
    aspectRatio: '9:16',
    safeZones: { top: 96, right: 48, bottom: 96, left: 48, unit: 'px' },
    fileSpecs: {
      maxFileSize: 30,
      recommendedFormats: ['PNG', 'JPG'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 24,
      maxTextWidth: 80,
      recommendedFonts: ['Arial', 'Helvetica', 'Proxima Nova'],
      textSafeZone: 64
    },
    designGuidelines: {
      logoMaxSize: 12,
      brandingPosition: ['top-center', 'bottom-center'],
      visualHierarchy: ['visual', 'headline', 'logo', 'cta']
    }
  },
  'youtube-banner': {
    id: 'youtube-banner',
    name: 'YouTube Banner',
    displayName: 'YouTube Channel Art',
    category: 'social',
    dimensions: { width: 2560, height: 1440, unit: 'px' },
    aspectRatio: '16:9',
    safeZones: { top: 156, right: 156, bottom: 156, left: 156, unit: 'px' },
    fileSpecs: {
      maxFileSize: 6,
      recommendedFormats: ['PNG', 'JPG'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 20,
      maxTextWidth: 40,
      recommendedFonts: ['Arial', 'Helvetica', 'Roboto'],
      textSafeZone: 200
    },
    designGuidelines: {
      logoMaxSize: 18,
      brandingPosition: ['center', 'top-left', 'bottom-center'],
      visualHierarchy: ['logo', 'channel-name', 'tagline', 'schedule']
    }
  },

  // Web Platforms
  'website-header': {
    id: 'website-header',
    name: 'Website Header',
    displayName: 'Website Header Banner',
    category: 'web',
    dimensions: { width: 1920, height: 400, unit: 'px' },
    aspectRatio: '4.8:1',
    safeZones: { top: 32, right: 64, bottom: 32, left: 64, unit: 'px' },
    fileSpecs: {
      maxFileSize: 2,
      recommendedFormats: ['PNG', 'JPG', 'WebP'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 16,
      maxTextWidth: 70,
      recommendedFonts: ['Arial', 'Helvetica', 'Inter', 'Roboto'],
      textSafeZone: 48
    },
    designGuidelines: {
      logoMaxSize: 25,
      brandingPosition: ['top-left', 'center', 'top-right'],
      visualHierarchy: ['logo', 'navigation', 'hero-text', 'cta']
    }
  },
  'blog-header': {
    id: 'blog-header',
    name: 'Blog Header',
    displayName: 'Blog Post Header Image',
    category: 'web',
    dimensions: { width: 1200, height: 630, unit: 'px' },
    aspectRatio: '1.91:1',
    safeZones: { top: 40, right: 40, bottom: 40, left: 40, unit: 'px' },
    fileSpecs: {
      maxFileSize: 1,
      recommendedFormats: ['PNG', 'JPG', 'WebP'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 18,
      maxTextWidth: 75,
      recommendedFonts: ['Arial', 'Helvetica', 'Georgia', 'Times'],
      textSafeZone: 32
    },
    designGuidelines: {
      logoMaxSize: 15,
      brandingPosition: ['top-left', 'bottom-right'],
      visualHierarchy: ['title', 'subtitle', 'author', 'date']
    }
  },

  // Email Platforms
  'email-header': {
    id: 'email-header',
    name: 'Email Header',
    displayName: 'Email Newsletter Header',
    category: 'email',
    dimensions: { width: 600, height: 200, unit: 'px' },
    aspectRatio: '3:1',
    safeZones: { top: 16, right: 16, bottom: 16, left: 16, unit: 'px' },
    fileSpecs: {
      maxFileSize: 0.5,
      recommendedFormats: ['PNG', 'JPG'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 14,
      maxTextWidth: 85,
      recommendedFonts: ['Arial', 'Helvetica', 'Verdana'],
      textSafeZone: 24
    },
    designGuidelines: {
      logoMaxSize: 30,
      brandingPosition: ['top-left', 'center'],
      visualHierarchy: ['logo', 'headline', 'date']
    }
  },

  // Display Advertising
  'display-leaderboard': {
    id: 'display-leaderboard',
    name: 'Display Leaderboard',
    displayName: 'Leaderboard Banner Ad (728x90)',
    category: 'display',
    dimensions: { width: 728, height: 90, unit: 'px' },
    aspectRatio: '8.09:1',
    safeZones: { top: 8, right: 8, bottom: 8, left: 8, unit: 'px' },
    fileSpecs: {
      maxFileSize: 0.15,
      recommendedFormats: ['PNG', 'JPG', 'WebP'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 12,
      maxTextWidth: 60,
      recommendedFonts: ['Arial', 'Helvetica', 'Verdana'],
      textSafeZone: 12
    },
    designGuidelines: {
      logoMaxSize: 35,
      brandingPosition: ['left', 'right'],
      visualHierarchy: ['logo', 'headline', 'cta']
    }
  },
  'display-rectangle': {
    id: 'display-rectangle',
    name: 'Display Rectangle',
    displayName: 'Medium Rectangle Banner (300x250)',
    category: 'display',
    dimensions: { width: 300, height: 250, unit: 'px' },
    aspectRatio: '1.2:1',
    safeZones: { top: 12, right: 12, bottom: 12, left: 12, unit: 'px' },
    fileSpecs: {
      maxFileSize: 0.15,
      recommendedFormats: ['PNG', 'JPG', 'WebP'],
      dpi: 72,
      colorSpace: 'RGB'
    },
    textSpecs: {
      minFontSize: 12,
      maxTextWidth: 80,
      recommendedFonts: ['Arial', 'Helvetica', 'Verdana'],
      textSafeZone: 16
    },
    designGuidelines: {
      logoMaxSize: 25,
      brandingPosition: ['top-center', 'bottom-center'],
      visualHierarchy: ['visual', 'headline', 'logo', 'cta']
    }
  },

  // Print Formats
  'print-banner': {
    id: 'print-banner',
    name: 'Print Banner',
    displayName: 'Print Banner (A4 Landscape)',
    category: 'print',
    dimensions: { width: 297, height: 210, unit: 'mm' },
    aspectRatio: '1.41:1',
    safeZones: { top: 5, right: 5, bottom: 5, left: 5, unit: 'mm' },
    fileSpecs: {
      maxFileSize: 50,
      recommendedFormats: ['PNG', 'PDF'],
      dpi: 300,
      colorSpace: 'CMYK'
    },
    textSpecs: {
      minFontSize: 8,
      maxTextWidth: 70,
      recommendedFonts: ['Arial', 'Helvetica', 'Times New Roman'],
      textSafeZone: 8
    },
    designGuidelines: {
      logoMaxSize: 20,
      brandingPosition: ['top-left', 'bottom-right'],
      visualHierarchy: ['headline', 'logo', 'body-text', 'contact']
    }
  }
};

export const LAYOUT_GRIDS: Record<string, LayoutGrid> = {
  'rule-of-thirds': {
    id: 'rule-of-thirds',
    name: 'Rule of Thirds',
    description: 'Classic 3x3 grid for balanced composition',
    columns: 3,
    rows: 3,
    gutterWidth: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    baselineGrid: 24
  },
  'golden-ratio': {
    id: 'golden-ratio',
    name: 'Golden Ratio',
    description: 'Mathematically balanced proportions',
    columns: 5,
    rows: 3,
    gutterWidth: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    baselineGrid: 24
  },
  'symmetric': {
    id: 'symmetric',
    name: 'Symmetric Grid',
    description: 'Balanced symmetrical layout',
    columns: 4,
    rows: 2,
    gutterWidth: 16,
    marginHorizontal: 32,
    marginVertical: 24,
    baselineGrid: 24
  },
  'asymmetric': {
    id: 'asymmetric',
    name: 'Asymmetric Grid',
    description: 'Dynamic asymmetrical composition',
    columns: 5,
    rows: 4,
    gutterWidth: 12,
    marginHorizontal: 24,
    marginVertical: 24,
    baselineGrid: 20
  },
  'modular': {
    id: 'modular',
    name: 'Modular Grid',
    description: 'Flexible modular system',
    columns: 6,
    rows: 4,
    gutterWidth: 20,
    marginHorizontal: 40,
    marginVertical: 30,
    baselineGrid: 24
  }
};

export const DEFAULT_BRAND_KITS: Record<string, BrandKit> = {
  'professional': {
    id: 'professional',
    name: 'Professional',
    colors: {
      primary: '#2563EB',
      secondary: '#64748B',
      accent: '#0EA5E9',
      background: '#FFFFFF',
      text: '#1E293B'
    },
    typography: {
      primary: 'Inter',
      secondary: 'Arial',
      fallbacks: ['Helvetica', 'sans-serif']
    },
    logos: {
      primary: '/brand/logo-primary.svg'
    },
    spacing: {
      unit: 8,
      scale: [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]
    },
    guidelines: {
      logoMinSize: 24,
      clearSpace: 16,
      colorUsage: ['primary-dominant', 'secondary-supporting', 'accent-highlights']
    }
  },
  'creative': {
    id: 'creative',
    name: 'Creative',
    colors: {
      primary: '#7C3AED',
      secondary: '#EC4899',
      accent: '#F59E0B',
      background: '#FAFAFA',
      text: '#374151'
    },
    typography: {
      primary: 'Poppins',
      secondary: 'Open Sans',
      fallbacks: ['Arial', 'sans-serif']
    },
    logos: {
      primary: '/brand/logo-creative.svg'
    },
    spacing: {
      unit: 8,
      scale: [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]
    },
    guidelines: {
      logoMinSize: 32,
      clearSpace: 24,
      colorUsage: ['primary-bold', 'secondary-creative', 'accent-energy']
    }
  },
  'corporate': {
    id: 'corporate',
    name: 'Corporate',
    colors: {
      primary: '#1F2937',
      secondary: '#6B7280',
      accent: '#059669',
      background: '#FFFFFF',
      text: '#111827'
    },
    typography: {
      primary: 'Roboto',
      secondary: 'Arial',
      fallbacks: ['Helvetica', 'sans-serif']
    },
    logos: {
      primary: '/brand/logo-corporate.svg'
    },
    spacing: {
      unit: 8,
      scale: [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16]
    },
    guidelines: {
      logoMinSize: 20,
      clearSpace: 12,
      colorUsage: ['primary-authority', 'secondary-professional', 'accent-growth']
    }
  }
};

// Helper functions
export const getPlatformSpec = (platformId: string): PlatformSpec | null => {
  return PLATFORM_SPECS[platformId] || null;
};

export const getOptimalResolution = (platformId: string): number => {
  const spec = getPlatformSpec(platformId);
  return spec?.fileSpecs.dpi || 72;
};

export const getSafeZones = (platformId: string) => {
  const spec = getPlatformSpec(platformId);
  return spec?.safeZones || { top: 24, right: 24, bottom: 24, left: 24, unit: 'px' };
};

export const getTextScaling = (platformId: string): string => {
  const spec = getPlatformSpec(platformId);
  if (!spec) return 'medium';
  
  const minSize = spec.textSpecs.minFontSize;
  if (minSize <= 12) return 'small';
  if (minSize <= 16) return 'medium';
  return 'large';
};

export const validateBannerDimensions = (platformId: string, width: number, height: number): boolean => {
  const spec = getPlatformSpec(platformId);
  if (!spec) return false;
  
  return spec.dimensions.width === width && spec.dimensions.height === height;
};

export const calculateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

export const getRecommendedFormats = (platformId: string): string[] => {
  const spec = getPlatformSpec(platformId);
  return spec?.fileSpecs.recommendedFormats || ['PNG', 'JPG'];
};

export const getMaxFileSize = (platformId: string): number => {
  const spec = getPlatformSpec(platformId);
  return spec?.fileSpecs.maxFileSize || 5; // Default 5MB
};

export const getBrandKit = (brandKitId: string): BrandKit | null => {
  return DEFAULT_BRAND_KITS[brandKitId] || null;
};

export const getLayoutGrid = (gridId: string): LayoutGrid | null => {
  return LAYOUT_GRIDS[gridId] || null;
};

export const getPlatformsByCategory = (category: string): PlatformSpec[] => {
  return Object.values(PLATFORM_SPECS).filter(spec => spec.category === category);
};

export const getAllPlatforms = (): PlatformSpec[] => {
  return Object.values(PLATFORM_SPECS);
};

export const getColorSpace = (platformId: string): 'RGB' | 'CMYK' => {
  const spec = getPlatformSpec(platformId);
  return spec?.fileSpecs.colorSpace || 'RGB';
};

export const getDPI = (platformId: string): number => {
  const spec = getPlatformSpec(platformId);
  return spec?.fileSpecs.dpi || 72;
}; 
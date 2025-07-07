import type { GeneratedImage, ImageGenerationRequest, HubError } from './hub-types';

// Image validation constants updated for GPT Image 1
export const IMAGE_CONSTANTS = {
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB (GPT Image 1 supports up to 20MB)
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  SUPPORTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  MAX_PROMPT_LENGTH: 1000,
  MIN_PROMPT_LENGTH: 3,
  SUPPORTED_SIZES: ['1024x1024', '1536x1024', '1024x1536', 'auto'],
  QUALITY_OPTIONS: ['low', 'medium', 'high', 'auto'],
  FORMAT_OPTIONS: ['png', 'jpeg', 'webp'],
  BACKGROUND_OPTIONS: ['transparent', 'opaque', 'auto'],
  COMPRESSION_RANGE: { min: 0, max: 100 } // For JPEG/WebP
} as const;

// Image processing utilities
export class ImageUtils {
  /**
   * Validates an image file
   */
  static validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > IMAGE_CONSTANTS.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds ${IMAGE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      };
    }

    // Check file type
    if (!IMAGE_CONSTANTS.SUPPORTED_FORMATS.includes(file.type as any)) {
      return {
        isValid: false,
        error: `Unsupported file format. Please use: ${IMAGE_CONSTANTS.SUPPORTED_FORMATS.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates image generation request
   */
  static validateGenerationRequest(request: ImageGenerationRequest): { isValid: boolean; error?: string } {
    // Check prompt length
    if (!request.prompt || request.prompt.trim().length < IMAGE_CONSTANTS.MIN_PROMPT_LENGTH) {
      return {
        isValid: false,
        error: `Prompt must be at least ${IMAGE_CONSTANTS.MIN_PROMPT_LENGTH} characters long`
      };
    }

    if (request.prompt.length > IMAGE_CONSTANTS.MAX_PROMPT_LENGTH) {
      return {
        isValid: false,
        error: `Prompt cannot exceed ${IMAGE_CONSTANTS.MAX_PROMPT_LENGTH} characters`
      };
    }

    // Check size
    if (request.size && !IMAGE_CONSTANTS.SUPPORTED_SIZES.includes(request.size as any)) {
      return {
        isValid: false,
        error: `Unsupported image size. Please use: ${IMAGE_CONSTANTS.SUPPORTED_SIZES.join(', ')}`
      };
    }

    // Check quality
    if (request.quality && !IMAGE_CONSTANTS.QUALITY_OPTIONS.includes(request.quality as any)) {
      return {
        isValid: false,
        error: `Unsupported quality option. Please use: ${IMAGE_CONSTANTS.QUALITY_OPTIONS.join(', ')}`
      };
    }

    // Check format
    if (request.format && !IMAGE_CONSTANTS.FORMAT_OPTIONS.includes(request.format)) {
      return {
        isValid: false,
        error: `Unsupported format option. Please use: ${IMAGE_CONSTANTS.FORMAT_OPTIONS.join(', ')}`
      };
    }

    // Check background
    if (request.background && !IMAGE_CONSTANTS.BACKGROUND_OPTIONS.includes(request.background)) {
      return {
        isValid: false,
        error: `Unsupported background option. Please use: ${IMAGE_CONSTANTS.BACKGROUND_OPTIONS.join(', ')}`
      };
    }

    // Check compression range
    if (request.compression !== undefined && 
        (request.compression < IMAGE_CONSTANTS.COMPRESSION_RANGE.min || 
         request.compression > IMAGE_CONSTANTS.COMPRESSION_RANGE.max)) {
      return {
        isValid: false,
        error: `Compression must be between ${IMAGE_CONSTANTS.COMPRESSION_RANGE.min} and ${IMAGE_CONSTANTS.COMPRESSION_RANGE.max}`
      };
    }

    return { isValid: true };
  }

  /**
   * Converts a File to base64 string
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Downloads an image from URL
   */
  static async downloadImage(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (error) {
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compresses an image file
   */
  static async compressImage(
    file: File, 
    maxWidth: number = 1024, 
    maxHeight: number = 1024, 
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Gets image dimensions
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

// Text processing utilities
export class TextUtils {
  /**
   * Cleans and optimizes a prompt
   */
  static cleanPrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
      .substring(0, IMAGE_CONSTANTS.MAX_PROMPT_LENGTH);
  }

  /**
   * Enhances a prompt with style suggestions
   */
  static enhancePrompt(prompt: string, style?: string): string {
    const cleaned = this.cleanPrompt(prompt);
    
    // Add style modifiers based on style selection
    const styleModifiers = {
      'vivid': ', vibrant colors, high contrast, dynamic composition',
      'natural': ', natural lighting, realistic colors, photographic style'
    };

    const modifier = style && styleModifiers[style as keyof typeof styleModifiers] 
      ? styleModifiers[style as keyof typeof styleModifiers] 
      : '';

    return cleaned + modifier;
  }

  /**
   * Extracts keywords from a prompt
   */
  static extractKeywords(prompt: string): string[] {
    const cleaned = this.cleanPrompt(prompt).toLowerCase();
    const words = cleaned.split(/\s+/);
    
    // Filter out common words and short words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Truncates text with ellipsis
   */
  static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

// Utility functions for generated images
export class GeneratedImageUtils {
  /**
   * Gets a user-friendly display prompt from image metadata
   */
  static getDisplayPrompt(image: GeneratedImage): string {
    if (image.prompt === 'Category-based generation' && image.metadata) {
      const metadata = image.metadata as any;
      const categoryId = metadata.category_id;
      const formValues = metadata.form_values;
      
      if (categoryId && formValues) {
        // Extract meaningful information from form values
        const parts: string[] = [];
        
        // Add category
        parts.push(this.getCategoryDisplayName(categoryId));
        
        // Add platform for social media
        if (categoryId === 'social-media' && formValues.platform) {
          parts.push(this.getPlatformDisplayName(formValues.platform));
        }
        
        // Add topic/subject if available
        if (formValues.postTopic) {
          parts.push(`"${formValues.postTopic.trim()}"`);
        } else if (formValues.productName) {
          parts.push(`"${formValues.productName.trim()}"`);
        } else if (formValues.subject) {
          parts.push(`"${formValues.subject.trim()}"`);
        }
        
        // Add visual style if available
        if (formValues.visualStyle) {
          parts.push(`(${formValues.visualStyle})`);
        }
        
        return parts.join(' - ');
      }
      
      // Fallback to category only
      if (categoryId) {
        return this.getCategoryDisplayName(categoryId);
      }
    }
    
    // Return original prompt if not category-based
    return image.prompt;
  }

  /**
   * Gets category display name from category ID
   */
  static getCategoryDisplayName(categoryId: string): string {
    const categoryMap: Record<string, string> = {
      'social-media': 'Social Media',
      'marketing': 'Marketing',
      'e-commerce': 'E-commerce',
      'branding': 'Branding',
      'content-creation': 'Content Creation',
      'advertising': 'Advertising',
      'web-design': 'Web Design',
      'print-design': 'Print Design',
      'photography': 'Photography',
      'illustration': 'Illustration'
    };
    return categoryMap[categoryId] || categoryId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Gets platform display name from platform ID
   */
  static getPlatformDisplayName(platform: string): string {
    const platformMap: Record<string, string> = {
      'instagram-post': 'Instagram Post',
      'instagram-story': 'Instagram Story', 
      'pinterest-pin': 'Pinterest Pin',
      'facebook-post': 'Facebook Post',
      'twitter-post': 'Twitter Post',
      'linkedin-post': 'LinkedIn Post',
      'youtube-thumbnail': 'YouTube Thumbnail',
      'tiktok-video': 'TikTok Video'
    };
    return platformMap[platform] || platform.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Sorts images by various criteria
   */
  static sortImages(images: GeneratedImage[], sortBy: 'date' | 'prompt' | 'status' = 'date'): GeneratedImage[] {
    return [...images].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'prompt':
          return a.prompt.localeCompare(b.prompt);
        case 'status':
          const statusOrder: Record<string, number> = { 'completed': 0, 'generating': 1, 'failed': 2, 'streaming': 1 };
          return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        default:
          return 0;
      }
    });
  }

  /**
   * Filters images by status
   */
  static filterByStatus(images: GeneratedImage[], status: GeneratedImage['status']): GeneratedImage[] {
    return images.filter(image => image.status === status);
  }

  /**
   * Groups images by conversation
   */
  static groupByConversation(images: GeneratedImage[]): Record<string, GeneratedImage[]> {
    return images.reduce((groups, image) => {
      const conversationId = image.conversationId || 'no-conversation';
      if (!groups[conversationId]) {
        groups[conversationId] = [];
      }
      groups[conversationId].push(image);
      return groups;
    }, {} as Record<string, GeneratedImage[]>);
  }

  /**
   * Generates a filename for download
   */
  static generateFilename(image: GeneratedImage): string {
    const timestamp = new Date(image.timestamp).toISOString().split('T')[0];
    const displayPrompt = this.getDisplayPrompt(image);
    const keywords = TextUtils.extractKeywords(displayPrompt).slice(0, 3).join('-');
    const sanitized = keywords.replace(/[^\w-]/g, '').toLowerCase();
    return `creation-hub-${timestamp}-${sanitized || 'image'}-${image.id.slice(-6)}.png`;
  }

  /**
   * Calculates generation statistics
   */
  static calculateStats(images: GeneratedImage[]) {
    const total = images.length;
    const completed = images.filter(img => img.status === 'completed').length;
    const failed = images.filter(img => img.status === 'failed').length;
    const generating = images.filter(img => img.status === 'generating').length;

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      generating,
      successRate: Math.round(successRate * 100) / 100
    };
  }
}

// Error handling utilities
export class ErrorUtils {
  /**
   * Creates a user-friendly error message
   */
  static createFriendlyMessage(error: HubError): string {
    const messages = {
      'GENERATION_FAILED': 'Image generation failed. Please try again with a different prompt.',
      'INVALID_PROMPT': 'Please provide a valid prompt between 3-1000 characters.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment before trying again.',
      'CONTENT_POLICY': 'Your prompt violates content policy. Please try a different description.',
      'NETWORK_ERROR': 'Network connection failed. Please check your internet and try again.',
      'STORAGE_ERROR': 'Failed to save image. Please try again.',
      'AUTH_ERROR': 'Authentication failed. Please sign in and try again.',
      'QUOTA_EXCEEDED': 'Generation quota exceeded. Please try again later.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
    };

    return messages[error.code] || error.message || messages['UNKNOWN_ERROR'];
  }

  /**
   * Determines if an error is retryable
   */
  static isRetryable(error: HubError): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'STORAGE_ERROR', 'GENERATION_FAILED'];
    return retryableCodes.includes(error.code);
  }

  /**
   * Gets retry delay in milliseconds
   */
  static getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}

// Local storage utilities
export class StorageUtils {
  private static PREFIX = 'creation-hub-';

  /**
   * Saves user preferences to localStorage
   */
  static savePreferences(preferences: Record<string, any>): void {
    try {
      localStorage.setItem(`${this.PREFIX}preferences`, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save preferences to localStorage');
    }
  }

  /**
   * Loads user preferences from localStorage
   */
  static loadPreferences(): Record<string, any> {
    try {
      const stored = localStorage.getItem(`${this.PREFIX}preferences`);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load preferences from localStorage');
      return {};
    }
  }

  /**
   * Clears all Creation Hub data from localStorage
   */
  static clearAll(): void {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.PREFIX))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage');
    }
  }
}

// Animation and UI utilities
export class UIUtils {
  /**
   * Generates a random animation delay for staggered animations
   */
  static getStaggerDelay(index: number, baseDelay: number = 0.1): number {
    return baseDelay * index;
  }

  /**
   * Formats file size for display
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  /**
   * Formats duration for display
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Debounces a function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }

  /**
   * Throttles a function
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(null, args);
      }
    };
  }
}

// Export all utilities as a single object for convenience
export const HubUtils = {
  Image: ImageUtils,
  Text: TextUtils,
  GeneratedImage: GeneratedImageUtils,
  Error: ErrorUtils,
  Storage: StorageUtils,
  UI: UIUtils,
  Constants: IMAGE_CONSTANTS
};

export default HubUtils; 
// Image Processor - Post-processing for optimal format, compression, and transparency
import type { OptimalImageParameters } from './ai-parameter-optimizer';

export interface ImageProcessingResult {
  processedImageUrl: string;
  finalFormat: string;
  finalSize: number;
  compressionApplied: number | null;
  transparencyDetected: boolean;
  processingTime: number;
  metadata: {
    originalFormat: string;
    originalSize: number;
    compressionRatio: number;
    qualityEnhancement: string;
  };
}

export interface ImageProcessingOptions {
  optimalParams: OptimalImageParameters;
  originalImageData: string; // Base64 image data
  targetQuality: number; // 0-100
  enforceTransparency?: boolean;
  maxFileSize?: number; // In bytes
}

export class ImageProcessor {
  
  /**
   * Process image according to AI-optimized parameters
   */
  static async processImage(options: ImageProcessingOptions): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    const { optimalParams, originalImageData, targetQuality, enforceTransparency, maxFileSize } = options;
    
    // Create canvas for image manipulation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Load original image
    const originalImage = await this.loadImageFromBase64(originalImageData);
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    
    // Apply quality enhancements based on AI parameters
    const qualityEnhancement = this.getQualityEnhancement(optimalParams.quality);
    
    // Draw image with potential enhancements
    if (qualityEnhancement.includes('sharpen')) {
      this.applySharpenFilter(ctx, originalImage);
    } else {
      ctx.drawImage(originalImage, 0, 0);
    }

    // Handle transparency if needed
    let transparencyDetected = false;
    if (optimalParams.background === 'transparent' || enforceTransparency) {
      transparencyDetected = await this.processTransparency(ctx, canvas, optimalParams);
    }

    // Convert to optimal format with compression
    const processedImageData = await this.convertToOptimalFormat(
      canvas, 
      optimalParams, 
      targetQuality,
      maxFileSize
    );

    const processingTime = Date.now() - startTime;
    const originalSize = this.calculateBase64Size(originalImageData);
    const finalSize = this.calculateBase64Size(processedImageData.imageData);

    return {
      processedImageUrl: processedImageData.imageData,
      finalFormat: processedImageData.format,
      finalSize,
      compressionApplied: processedImageData.compressionApplied,
      transparencyDetected,
      processingTime,
      metadata: {
        originalFormat: 'png', // From DALL-E 3
        originalSize,
        compressionRatio: Math.round((1 - finalSize / originalSize) * 100),
        qualityEnhancement: qualityEnhancement
      }
    };
  }

  /**
   * Load image from base64 data
   */
  private static loadImageFromBase64(base64Data: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      // Handle both data URLs and raw base64
      if (base64Data.startsWith('data:')) {
        img.src = base64Data;
      } else {
        img.src = `data:image/png;base64,${base64Data}`;
      }
    });
  }

  /**
   * Get quality enhancement strategy based on AI parameters
   */
  private static getQualityEnhancement(quality: string): string {
    switch (quality) {
      case 'high':
        return 'sharpen, enhance-contrast, color-boost';
      case 'medium':
        return 'enhance-contrast, color-balance';
      case 'low':
        return 'basic-optimization';
      default:
        return 'auto-enhance';
    }
  }

  /**
   * Apply sharpening filter for high-quality images
   */
  private static applySharpenFilter(ctx: CanvasRenderingContext2D, image: HTMLImageElement): void {
    ctx.filter = 'contrast(1.1) saturate(1.05) brightness(1.02)';
    ctx.drawImage(image, 0, 0);
    ctx.filter = 'none';
  }

  /**
   * Process transparency based on AI parameters
   */
  private static async processTransparency(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    optimalParams: OptimalImageParameters
  ): Promise<boolean> {
    // Get image data to check for transparency
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let hasTransparency = false;
    
    // Check if image already has transparency
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasTransparency = true;
        break;
      }
    }

    // If transparent background is requested but not present, try to create it
    if (optimalParams.background === 'transparent' && !hasTransparency) {
      // Simple background removal for logos/icons (remove white/near-white pixels)
      if (optimalParams.format === 'png') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Remove white and near-white backgrounds
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0; // Make transparent
            hasTransparency = true;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
    }

    return hasTransparency;
  }

  /**
   * Convert to optimal format with appropriate compression
   */
  private static async convertToOptimalFormat(
    canvas: HTMLCanvasElement,
    optimalParams: OptimalImageParameters,
    targetQuality: number,
    maxFileSize?: number
  ): Promise<{
    imageData: string;
    format: string;
    compressionApplied: number | null;
  }> {
    let format = optimalParams.format;
    let compressionApplied: number | null = null;
    
    // PNG for transparency or when specified
    if (optimalParams.background === 'transparent' || format === 'png') {
      const pngData = canvas.toDataURL('image/png');
      
      // Check file size and potentially compress
      if (maxFileSize && this.calculateBase64Size(pngData) > maxFileSize) {
        // For PNG, we can't compress much, so potentially suggest WebP
        if (optimalParams.format !== 'png') {
          format = 'webp';
          const webpQuality = Math.max(80, targetQuality);
          const webpData = canvas.toDataURL('image/webp', webpQuality / 100);
          compressionApplied = webpQuality;
          
          return {
            imageData: webpData,
            format: 'webp',
            compressionApplied
          };
        }
      }
      
      return {
        imageData: pngData,
        format: 'png',
        compressionApplied: null
      };
    }

    // JPEG for photos and when compression is needed
    if (format === 'jpeg') {
      const quality = optimalParams.compression || targetQuality;
      const jpegData = canvas.toDataURL('image/jpeg', quality / 100);
      compressionApplied = quality;
      
      return {
        imageData: jpegData,
        format: 'jpeg',
        compressionApplied
      };
    }

    // WebP for optimal compression
    if (format === 'webp') {
      const quality = optimalParams.compression || targetQuality;
      const webpData = canvas.toDataURL('image/webp', quality / 100);
      compressionApplied = quality;
      
      return {
        imageData: webpData,
        format: 'webp',
        compressionApplied
      };
    }

    // Default fallback to PNG
    return {
      imageData: canvas.toDataURL('image/png'),
      format: 'png',
      compressionApplied: null
    };
  }

  /**
   * Calculate file size from base64 data
   */
  private static calculateBase64Size(base64Data: string): number {
    // Remove data URL prefix if present
    const base64Only = base64Data.split(',')[1] || base64Data;
    // Base64 adds ~33% overhead, so actual size is roughly 3/4 of base64 length
    return Math.round((base64Only.length * 3) / 4);
  }

  /**
   * Validate if processing is beneficial
   */
  static shouldProcessImage(optimalParams: OptimalImageParameters): boolean {
    // Process if any optimization is requested
    return optimalParams.format !== 'png' ||
           optimalParams.background === 'transparent' ||
           optimalParams.compression !== undefined ||
           optimalParams.quality === 'high';
  }

  /**
   * Get estimated processing time
   */
  static estimateProcessingTime(imageWidth: number, imageHeight: number): number {
    const pixels = imageWidth * imageHeight;
    // Rough estimate: 1ms per 1000 pixels
    return Math.max(100, Math.round(pixels / 1000));
  }

  /**
   * Get recommended format for category
   */
  static getRecommendedFormat(
    categoryId: string,
    needsTransparency: boolean,
    hasText: boolean
  ): 'png' | 'jpeg' | 'webp' {
    if (needsTransparency || hasText) {
      return 'png';
    }
    
    // Categories that benefit from JPEG compression
    const jpegCategories = ['social-media', 'banners', 'marketing'];
    if (jpegCategories.includes(categoryId)) {
      return 'jpeg';
    }
    
    // Default to WebP for optimal compression
    return 'webp';
  }

  /**
   * Optimize image for web delivery
   */
  static async optimizeForWeb(
    imageData: string,
    targetFormat: 'png' | 'jpeg' | 'webp' = 'webp',
    quality: number = 85
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');

    const img = await this.loadImageFromBase64(imageData);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    switch (targetFormat) {
      case 'jpeg':
        return canvas.toDataURL('image/jpeg', quality / 100);
      case 'webp':
        return canvas.toDataURL('image/webp', quality / 100);
      default:
        return canvas.toDataURL('image/png');
    }
  }
} 
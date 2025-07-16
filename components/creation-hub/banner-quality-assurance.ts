// Banner Quality Assurance - Validation and optimization functions
import { getPlatformSpec, getBrandKit, getLayoutGrid, type PlatformSpec, type BrandKit } from './banner-platform-specs';
import type { GeneratedImage } from './hub-types';

export interface BannerQualityCheck {
  resolution: {
    passed: boolean;
    expected: number;
    actual: number;
    message: string;
  };
  safeZones: {
    passed: boolean;
    violations: string[];
    message: string;
  };
  brandCompliance: {
    passed: boolean;
    violations: string[];
    message: string;
  };
  textScaling: {
    passed: boolean;
    issues: string[];
    message: string;
  };
  fileSize: {
    passed: boolean;
    expected: number;
    actual: number;
    message: string;
  };
  accessibility: {
    passed: boolean;
    issues: string[];
    message: string;
  };
  platformOptimization: {
    passed: boolean;
    issues: string[];
    message: string;
  };
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface BannerValidationRequest {
  platformId: string;
  brandKitId?: string;
  formValues: Record<string, any>;
  image?: GeneratedImage;
  imageData?: {
    width: number;
    height: number;
    fileSize: number;
    format: string;
    dpi: number;
    colorSpace: string;
  };
}

export interface BannerOptimizationSuggestion {
  type: 'dimension' | 'color' | 'text' | 'layout' | 'file' | 'accessibility';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
}

export class BannerQualityAssurance {
  
  /**
   * Comprehensive quality check for banner generation
   */
  static checkBannerQuality(request: BannerValidationRequest): BannerQualityCheck {
    const platformSpec = getPlatformSpec(request.platformId);
    const brandKit = request.brandKitId ? getBrandKit(request.brandKitId) : null;
    
    if (!platformSpec) {
      throw new Error(`Platform specification not found for: ${request.platformId}`);
    }

    const checks = {
      resolution: this.checkResolution(request, platformSpec),
      safeZones: this.checkSafeZones(request, platformSpec),
      brandCompliance: this.checkBrandCompliance(request, brandKit),
      textScaling: this.checkTextScaling(request, platformSpec),
      fileSize: this.checkFileSize(request, platformSpec),
      accessibility: this.checkAccessibility(request, platformSpec),
      platformOptimization: this.checkPlatformOptimization(request, platformSpec)
    };

    const overallScore = this.calculateOverallScore(checks);
    const overallGrade = this.getGrade(overallScore);
    const recommendations = this.generateRecommendations(checks, request, platformSpec);

    return {
      ...checks,
      overallScore,
      overallGrade,
      recommendations
    };
  }

  /**
   * Check if image resolution meets platform requirements
   */
  private static checkResolution(request: BannerValidationRequest, spec: PlatformSpec) {
    const expected = spec.fileSpecs.dpi;
    const actual = request.imageData?.dpi || 72;
    const passed = actual >= expected;

    return {
      passed,
      expected,
      actual,
      message: passed 
        ? `Resolution meets requirements (${actual} DPI)`
        : `Resolution too low. Expected ${expected} DPI, got ${actual} DPI`
    };
  }

  /**
   * Check if design respects safe zones
   */
  private static checkSafeZones(request: BannerValidationRequest, spec: PlatformSpec) {
    const violations: string[] = [];
    const safeZones = spec.safeZones;
    
    // Check if important content is within safe zones
    if (request.formValues.primaryMessage && request.formValues.primaryMessage.length > 50) {
      violations.push('Primary message may be too long for safe zone');
    }
    
    if (request.formValues.callToAction && !this.isWithinSafeZone(request.formValues.callToAction, safeZones)) {
      violations.push('Call to action may be outside safe zone');
    }

    // Check logo placement
    if (request.formValues.brandKit && !this.isLogoInSafeZone(request.formValues, safeZones)) {
      violations.push('Logo placement may violate safe zone requirements');
    }

    const passed = violations.length === 0;

    return {
      passed,
      violations,
      message: passed 
        ? 'All content within safe zones'
        : `Safe zone violations: ${violations.join(', ')}`
    };
  }

  /**
   * Check brand compliance
   */
  private static checkBrandCompliance(request: BannerValidationRequest, brandKit: BrandKit | null) {
    const violations: string[] = [];
    
    if (!brandKit) {
      return {
        passed: true,
        violations: [],
        message: 'No brand kit specified - skipping brand compliance check'
      };
    }

    // Check color usage
    if (request.formValues.colorScheme && !request.formValues.colorScheme.includes('brand')) {
      violations.push('Color scheme not using brand colors');
    }

    // Check typography
    if (request.formValues.typography && !request.formValues.typography.includes('brand')) {
      violations.push('Typography not using brand fonts');
    }

    // Check logo usage
    if (request.formValues.imageStyle !== 'logo-centric' && request.formValues.contentType === 'brand-announcement') {
      violations.push('Brand announcement should be logo-centric');
    }

    const passed = violations.length === 0;

    return {
      passed,
      violations,
      message: passed 
        ? 'Brand guidelines followed'
        : `Brand compliance issues: ${violations.join(', ')}`
    };
  }

  /**
   * Check text scaling and readability
   */
  private static checkTextScaling(request: BannerValidationRequest, spec: PlatformSpec) {
    const issues: string[] = [];
    const minFontSize = spec.textSpecs.minFontSize;
    const maxTextWidth = spec.textSpecs.maxTextWidth;

    // Check primary message length
    if (request.formValues.primaryMessage && request.formValues.primaryMessage.length > 60) {
      issues.push('Primary message may be too long for optimal readability');
    }

    // Check secondary message
    if (request.formValues.secondaryMessage && request.formValues.secondaryMessage.length > 100) {
      issues.push('Secondary message may be too long');
    }

    // Check call to action length
    if (request.formValues.callToAction && request.formValues.callToAction.length > 20) {
      issues.push('Call to action should be concise (under 20 characters)');
    }

    // Check font size requirements
    if (request.formValues.accessibilityFeatures?.includes('large-text') && minFontSize < 16) {
      issues.push('Large text accessibility feature requires minimum 16px font size');
    }

    const passed = issues.length === 0;

    return {
      passed,
      issues,
      message: passed 
        ? 'Text scaling optimized for platform'
        : `Text scaling issues: ${issues.join(', ')}`
    };
  }

  /**
   * Check file size requirements
   */
  private static checkFileSize(request: BannerValidationRequest, spec: PlatformSpec) {
    const expected = spec.fileSpecs.maxFileSize * 1024 * 1024; // Convert MB to bytes
    const actual = request.imageData?.fileSize || 0;
    const passed = actual <= expected;

    return {
      passed,
      expected: spec.fileSpecs.maxFileSize,
      actual: actual / (1024 * 1024), // Convert bytes to MB
      message: passed 
        ? `File size within limits (${(actual / (1024 * 1024)).toFixed(2)} MB)`
        : `File size too large. Max ${spec.fileSpecs.maxFileSize} MB, got ${(actual / (1024 * 1024)).toFixed(2)} MB`
    };
  }

  /**
   * Check accessibility compliance
   */
  private static checkAccessibility(request: BannerValidationRequest, spec: PlatformSpec) {
    const issues: string[] = [];
    const accessibilityFeatures = request.formValues.accessibilityFeatures || [];

    // Check contrast requirements
    if (accessibilityFeatures.includes('high-contrast')) {
      if (request.formValues.colorScheme === 'elegant-black' || request.formValues.colorScheme === 'clean-white') {
        // These should have good contrast
      } else {
        issues.push('High contrast feature selected but color scheme may not provide sufficient contrast');
      }
    }

    // Check text size requirements
    if (accessibilityFeatures.includes('large-text') && spec.textSpecs.minFontSize < 16) {
      issues.push('Large text feature requires minimum 16px font size support');
    }

    // Check colorblind friendly requirements
    if (accessibilityFeatures.includes('colorblind-friendly')) {
      if (request.formValues.colorScheme === 'bold-red' || request.formValues.colorScheme === 'trustworthy-green') {
        issues.push('Selected color scheme may not be colorblind friendly');
      }
    }

    // Check alt text readiness
    if (accessibilityFeatures.includes('alt-text-ready')) {
      if (request.formValues.imageStyle === 'collage-style' || request.formValues.imageStyle === 'geometric') {
        issues.push('Complex image styles may be difficult to describe in alt text');
      }
    }

    const passed = issues.length === 0;

    return {
      passed,
      issues,
      message: passed 
        ? 'Accessibility requirements met'
        : `Accessibility issues: ${issues.join(', ')}`
    };
  }

  /**
   * Check platform-specific optimization
   */
  private static checkPlatformOptimization(request: BannerValidationRequest, spec: PlatformSpec) {
    const issues: string[] = [];

    // Check format optimization
    if (request.formValues.technicalSpecs?.outputFormat === 'auto') {
      // Good - using platform optimization
    } else if (request.formValues.technicalSpecs?.outputFormat) {
      const format = request.formValues.technicalSpecs.outputFormat.toUpperCase();
      if (!spec.fileSpecs.recommendedFormats.includes(format)) {
        issues.push(`Format ${format} not recommended for ${spec.name}`);
      }
    }

    // Check resolution optimization
    if (request.formValues.technicalSpecs?.resolution === 'auto') {
      // Good - using platform optimization
    } else if (request.formValues.technicalSpecs?.resolution) {
      const resolution = parseInt(request.formValues.technicalSpecs.resolution);
      if (resolution !== spec.fileSpecs.dpi) {
        issues.push(`Resolution ${resolution} DPI not optimal for ${spec.name} (recommended: ${spec.fileSpecs.dpi} DPI)`);
      }
    }

    // Check color space
    if (request.formValues.technicalSpecs?.colorSpace === 'auto') {
      // Good - using platform optimization
    } else if (request.formValues.technicalSpecs?.colorSpace) {
      const colorSpace = request.formValues.technicalSpecs.colorSpace.toUpperCase();
      if (colorSpace !== spec.fileSpecs.colorSpace) {
        issues.push(`Color space ${colorSpace} not optimal for ${spec.name} (recommended: ${spec.fileSpecs.colorSpace})`);
      }
    }

    // Check optimization goals alignment
    const optimizationGoals = request.formValues.optimizationGoals || [];
    if (spec.category === 'social' && !optimizationGoals.includes('social-sharing')) {
      issues.push('Social platform detected but social sharing not optimized');
    }

    if (spec.category === 'print' && !optimizationGoals.includes('print-quality')) {
      issues.push('Print platform detected but print quality not optimized');
    }

    const passed = issues.length === 0;

    return {
      passed,
      issues,
      message: passed 
        ? 'Platform optimization complete'
        : `Platform optimization issues: ${issues.join(', ')}`
    };
  }

  /**
   * Calculate overall quality score
   */
  private static calculateOverallScore(checks: any): number {
    const weights = {
      resolution: 0.15,
      safeZones: 0.20,
      brandCompliance: 0.15,
      textScaling: 0.15,
      fileSize: 0.10,
      accessibility: 0.15,
      platformOptimization: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(checks).forEach(([key, check]: [string, any]) => {
      const weight = weights[key as keyof typeof weights];
      const score = check.passed ? 100 : 0;
      totalScore += score * weight;
      totalWeight += weight;
    });

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Get letter grade from score
   */
  private static getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(checks: any, request: BannerValidationRequest, spec: PlatformSpec): string[] {
    const recommendations: string[] = [];

    if (!checks.resolution.passed) {
      recommendations.push(`Increase resolution to ${spec.fileSpecs.dpi} DPI for optimal quality`);
    }

    if (!checks.safeZones.passed) {
      recommendations.push('Ensure all important content is within safe zones');
      recommendations.push(`Maintain ${spec.safeZones.top}px margins from edges`);
    }

    if (!checks.brandCompliance.passed) {
      recommendations.push('Use brand colors and fonts for consistency');
      recommendations.push('Follow brand guidelines for logo placement');
    }

    if (!checks.textScaling.passed) {
      recommendations.push('Optimize text length for platform readability');
      recommendations.push(`Keep primary message under 60 characters`);
    }

    if (!checks.fileSize.passed) {
      recommendations.push(`Reduce file size to under ${spec.fileSpecs.maxFileSize} MB`);
      recommendations.push('Consider using WebP format for better compression');
    }

    if (!checks.accessibility.passed) {
      recommendations.push('Ensure sufficient color contrast for readability');
      recommendations.push('Use colorblind-friendly color combinations');
    }

    if (!checks.platformOptimization.passed) {
      recommendations.push('Use platform-optimized settings for best results');
      recommendations.push(`Use ${spec.fileSpecs.recommendedFormats.join(' or ')} format`);
    }

    return recommendations;
  }

  /**
   * Generate optimization suggestions
   */
  static generateOptimizationSuggestions(request: BannerValidationRequest): BannerOptimizationSuggestion[] {
    const suggestions: BannerOptimizationSuggestion[] = [];
    const platformSpec = getPlatformSpec(request.platformId);
    
    if (!platformSpec) return suggestions;

    // Dimension optimization
    if (request.imageData) {
      const expectedWidth = platformSpec.dimensions.width;
      const expectedHeight = platformSpec.dimensions.height;
      
      if (request.imageData.width !== expectedWidth || request.imageData.height !== expectedHeight) {
        suggestions.push({
          type: 'dimension',
          priority: 'high',
          title: 'Dimension Mismatch',
          description: `Banner dimensions don't match platform requirements`,
          action: `Resize to ${expectedWidth}x${expectedHeight}${platformSpec.dimensions.unit}`,
          impact: 'Ensures proper display across all devices'
        });
      }
    }

    // Color optimization
    if (request.formValues.colorScheme && !request.formValues.colorScheme.includes('brand')) {
      suggestions.push({
        type: 'color',
        priority: 'medium',
        title: 'Brand Color Usage',
        description: 'Consider using brand colors for consistency',
        action: 'Select brand-primary color scheme',
        impact: 'Improves brand recognition and consistency'
      });
    }

    // Text optimization
    if (request.formValues.primaryMessage && request.formValues.primaryMessage.length > 50) {
      suggestions.push({
        type: 'text',
        priority: 'high',
        title: 'Text Length',
        description: 'Primary message may be too long for optimal readability',
        action: 'Shorten primary message to under 50 characters',
        impact: 'Improves readability and engagement'
      });
    }

    // Layout optimization
    if (request.formValues.layoutGrid === 'symmetric' && platformSpec.category === 'social') {
      suggestions.push({
        type: 'layout',
        priority: 'medium',
        title: 'Layout Optimization',
        description: 'Asymmetric layouts often perform better on social platforms',
        action: 'Consider using asymmetric or rule-of-thirds layout',
        impact: 'May improve engagement and visual interest'
      });
    }

    // File optimization
    if (request.imageData && request.imageData.fileSize > platformSpec.fileSpecs.maxFileSize * 1024 * 1024 * 0.8) {
      suggestions.push({
        type: 'file',
        priority: 'high',
        title: 'File Size Optimization',
        description: 'File size is approaching platform limits',
        action: 'Optimize compression or use WebP format',
        impact: 'Ensures faster loading and platform compliance'
      });
    }

    // Accessibility optimization
    if (!request.formValues.accessibilityFeatures || request.formValues.accessibilityFeatures.length === 0) {
      suggestions.push({
        type: 'accessibility',
        priority: 'medium',
        title: 'Accessibility Features',
        description: 'No accessibility features selected',
        action: 'Enable high contrast and large text features',
        impact: 'Makes banner accessible to more users'
      });
    }

    return suggestions;
  }

  /**
   * Helper function to check if content is within safe zone
   */
  private static isWithinSafeZone(content: string, safeZones: any): boolean {
    // This is a simplified check - in a real implementation, you'd analyze the actual layout
    return content.length <= 20; // Simplified rule
  }

  /**
   * Helper function to check logo placement
   */
  private static isLogoInSafeZone(formValues: any, safeZones: any): boolean {
    // This is a simplified check - in a real implementation, you'd analyze the actual layout
    return true; // Simplified - assume logo is properly placed
  }

  /**
   * Validate banner before generation
   */
  static validateBannerRequest(request: BannerValidationRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!request.platformId) {
      errors.push('Platform selection is required');
    }

    if (!request.formValues.primaryMessage) {
      errors.push('Primary message is required');
    }

    if (!request.formValues.visualStyle) {
      errors.push('Visual style selection is required');
    }

    if (!request.formValues.colorScheme) {
      errors.push('Color scheme selection is required');
    }

    if (!request.formValues.typography) {
      errors.push('Typography selection is required');
    }

    if (!request.formValues.layoutGrid) {
      errors.push('Layout structure selection is required');
    }

    // Check platform-specific requirements
    const platformSpec = getPlatformSpec(request.platformId);
    if (platformSpec) {
      // Check content type compatibility
      if (request.formValues.contentType === 'print-banner' && platformSpec.category !== 'print') {
        warnings.push('Print banner content type selected for non-print platform');
      }

      // Check optimization goals
      if (request.formValues.optimizationGoals) {
        const goals = request.formValues.optimizationGoals;
        if (goals.includes('print-quality') && platformSpec.category !== 'print') {
          warnings.push('Print quality optimization selected for non-print platform');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default BannerQualityAssurance; 
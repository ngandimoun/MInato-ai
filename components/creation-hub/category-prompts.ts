// Category Prompt Templates - Robust backend prompts for enhanced image generation

import type { ImageCategory, CategoryFormValues } from './category-types';

export interface PromptTemplate {
  categoryId: ImageCategory;
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => string;
  qualityEnhancements: Record<string, string>;
  styleModifiers: Record<string, string>;
  aspectRatioOptimizations: Record<string, string>;
}

export interface EnhancementOptions {
  includeQualityBoosts?: boolean;
  includeCompositionTips?: boolean;
  includeLightingDetails?: boolean;
  includeColorTheory?: boolean;
  includeProfessionalTerms?: boolean;
}

// ===== Standardized Fields Helper =====
export function getStandardFieldsPromptSection(formValues: CategoryFormValues, visionDescription?: string): string {
  let sections: string[] = [];

  // Language specification
  if (formValues.textLanguage && formValues.textLanguage !== 'en') {
    const languageMap: Record<string, string> = {
      'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 
      'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 
      'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese', 'tr': 'Turkish', 'pl': 'Polish', 
      'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 
      'el': 'Greek', 'he': 'Hebrew', 'cs': 'Czech', 'hu': 'Hungarian', 'ro': 'Romanian', 
      'bg': 'Bulgarian', 'hr': 'Croatian', 'sk': 'Slovak', 'sl': 'Slovenian', 'et': 'Estonian', 
      'lv': 'Latvian', 'lt': 'Lithuanian', 'uk': 'Ukrainian', 'id': 'Indonesian', 'ms': 'Malay', 
      'tl': 'Filipino', 'bn': 'Bengali', 'ur': 'Urdu', 'fa': 'Persian', 'ta': 'Tamil', 
      'te': 'Telugu', 'ml': 'Malayalam', 'kn': 'Kannada', 'gu': 'Gujarati', 'pa': 'Punjabi', 
      'mr': 'Marathi', 'ne': 'Nepali', 'si': 'Sinhala', 'my': 'Burmese', 'km': 'Khmer', 
      'lo': 'Lao', 'ka': 'Georgian', 'hy': 'Armenian', 'az': 'Azerbaijani', 'kk': 'Kazakh', 
      'uz': 'Uzbek', 'ky': 'Kyrgyz', 'tg': 'Tajik', 'mn': 'Mongolian', 'sw': 'Swahili', 
      'af': 'Afrikaans', 'am': 'Amharic', 'ha': 'Hausa', 'ig': 'Igbo', 'yo': 'Yoruba', 
      'zu': 'Zulu', 'xh': 'Xhosa', 'is': 'Icelandic', 'mt': 'Maltese', 'ga': 'Irish', 
      'cy': 'Welsh', 'eu': 'Basque', 'ca': 'Catalan', 'gl': 'Galician', 'br': 'Breton', 
      'co': 'Corsican', 'lb': 'Luxembourgish', 'pt-br': 'Brazilian Portuguese', 'es-mx': 'Mexican Spanish', 
      'es-ar': 'Argentinian Spanish', 'la': 'Latin', 'eo': 'Esperanto', 'jv': 'Javanese', 
      'su': 'Sundanese', 'ceb': 'Cebuano', 'war': 'Waray', 'ilo': 'Ilokano', 'haw': 'Hawaiian', 
      'mi': 'Maori', 'sm': 'Samoan', 'to': 'Tongan', 'fj': 'Fijian'
    };
    
    const languageName = languageMap[formValues.textLanguage] || 'the selected language';
    
    sections.push(`LANGUAGE SPECIFICATION:
- Text Language: All text elements must be in ${languageName}
- Typography: Use appropriate fonts that support ${languageName} characters and writing system
- Cultural Context: Ensure design elements are culturally appropriate for ${languageName}-speaking audiences
- Text Direction: Apply correct text direction and layout conventions for ${languageName} (LTR/RTL)
- Script Support: Proper rendering of ${languageName} script, including diacritics and special characters
- Localization: Cultural adaptation of visual elements, colors, and symbols appropriate for ${languageName} regions`);
  }

  // Human model integration
  if (formValues.includeHuman && formValues.humanDescription) {
    sections.push(`HUMAN MODEL INTEGRATION:
- Model Description: ${formValues.humanDescription}
- Interaction Style: Show the person naturally and authentically interacting with or using the subject matter
- Pose & Expression: Natural, confident positioning that enhances the overall composition and storytelling
- Professional Quality: Commercial photography standards with studio-quality lighting and presentation
- Lighting Consistency: Ensure model lighting seamlessly matches the overall scene atmosphere and mood
- Cultural Sensitivity: Respectful, inclusive, and appropriate representation that reflects diversity
- Engagement Factor: Model should create relatability and emotional connection with viewers
- Product Integration: Seamless interaction between model and product/service being showcased
- Lifestyle Context: Model placement should reinforce the brand's target lifestyle and values`);
  } else if (formValues.includeHuman) {
    sections.push(`HUMAN MODEL INTEGRATION:
- Include a person naturally interacting with or using the subject matter
- Professional, approachable appearance suitable for the context and target audience  
- Natural pose and expression that enhances the composition and creates viewer connection
- Commercial photography standards for lighting, positioning, and overall presentation
- Lifestyle context that reinforces the brand's target demographic and values
- Authentic interaction that demonstrates product use or service benefit
- Cultural sensitivity and inclusive representation in model selection and styling`);
  }

  // Reference images vision description
  if (visionDescription) {
    sections.push(`VISUAL REFERENCE INTEGRATION:
${visionDescription}
- Style Continuity: Maintain consistent visual language from reference materials
- Color Harmony: Extract and enhance dominant color palette from references
- Compositional Elements: Incorporate successful design patterns while ensuring originality
- Quality Standards: Match or exceed the visual quality of reference materials`);
  }

  return sections.join('\n\n');
}

// ===== Social Media Template =====

export const SOCIAL_MEDIA_TEMPLATE: PromptTemplate = {
  categoryId: 'social-media',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    const textOnImageSection = formValues.textOnImage 
      ? `Text Integration Specifications:
- Primary Text: "${formValues.textOnImage}"
- Typography Style: Modern, highly legible sans-serif with strong contrast
- Text Placement: Strategic positioning following rule-of-thirds, never centered unless specifically required
- Readability: Ensure 4.5:1 contrast ratio minimum, with subtle drop shadows or background overlays if needed
- Font Weight: Bold to semi-bold for maximum impact in social feeds
- Text Hierarchy: Primary message prominent, secondary text 60% of primary size
- Mobile Optimization: Text remains legible at thumbnail sizes (150px width minimum)
- Platform Adaptation: Text sizing optimized for ${formValues.platform} viewing distance and context`
      : 'Text-Free Design: Pure visual storytelling without typography, relying on imagery, color, and composition';
    
    return `Create a stunning, scroll-stopping ${formValues.platform} content piece that maximizes engagement and brand impact.

${standardFieldsSection}

CONTENT SPECIFICATIONS:
Subject Matter: ${formValues.postTopic}
Visual Aesthetic: ${formValues.visualStyle}
Platform Target: ${formValues.platform}

VISUAL DESIGN ARCHITECTURE:
Composition Framework:
- Primary focal point positioned using rule-of-thirds for maximum visual impact
- Secondary elements create visual flow guiding eye movement
- Negative space strategically utilized to prevent visual clutter
- Depth layers: Foreground (subject), midground (supporting elements), background (context/atmosphere)

Color Strategy:
- Primary palette: 3-4 dominant colors aligned with ${formValues.visualStyle} aesthetic
- Accent colors: 1-2 high-contrast elements for attention-grabbing details
- Color psychology: Emotions evoked should align with ${formValues.postTopic} messaging
- Platform optimization: Colors that remain vibrant across different devices and screens
- Contrast ratios: Ensure accessibility standards while maintaining visual appeal

Lighting & Atmosphere:
- Lighting direction: Carefully crafted to enhance subject dimensionality
- Shadow play: Strategic use of shadows to create depth and visual interest
- Mood lighting: Atmospheric elements that reinforce the content's emotional tone
- Time of day simulation: If applicable, lighting should suggest specific temporal context
- Color temperature: Warm/cool balance appropriate for ${formValues.visualStyle} and platform context

${textOnImageSection}

TECHNICAL EXCELLENCE STANDARDS:
Resolution & Quality:
- Ultra-high definition rendering suitable for ${formValues.platform}'s highest quality display
- Edge definition: Crisp, clean lines with no pixelation or compression artifacts
- Detail preservation: Fine textures and intricate elements clearly visible
- Scalability: Image quality maintained across different display sizes

${formValues.platform} Algorithm Optimization:
- Visual elements designed to maximize engagement metrics
- Composition attracts immediate attention in fast-scrolling feeds
- Color vibrancy optimized for mobile screen display
- Content density balanced to avoid overwhelming while maintaining interest
- Thumbnail readability: Key elements visible even in compressed preview formats

Professional Production Quality:
- Commercial photography standards for lighting and composition
- Brand-worthy presentation suitable for corporate or professional use
- Marketing campaign quality with attention to every visual detail
- Social media best practices integration for maximum reach potential

ARTISTIC EXECUTION:
Style Implementation:
- ${formValues.visualStyle} aesthetic fully realized with authentic style elements
- Contemporary design trends appropriately incorporated
- Visual sophistication appropriate for target audience expectations
- Artistic coherence throughout all compositional elements

Environmental Context:
- Background elements complement rather than compete with main subject
- Spatial relationships create believable, engaging scene setting
- Props and secondary objects enhance narrative without distraction
- Overall scene staging professional and purposeful

ENGAGEMENT OPTIMIZATION:
Visual Psychology:
- Immediate visual impact designed to stop scroll behavior
- Emotional resonance that encourages sharing and interaction
- Curiosity-generating elements that promote further engagement
- Visual storytelling that communicates message within 3-second attention span

Platform-Specific Adaptation:
- Aspect ratio perfectly optimized for ${formValues.platform} display algorithms
- Content positioning accounts for platform UI overlay elements
- Visual hierarchy designed for ${formValues.platform} user behavior patterns
- Call-to-action visual cues if applicable to content type

FINAL QUALITY ASSURANCE:
- Every pixel contributes to overall message and aesthetic
- No extraneous elements that don't serve the content purpose
- Professional polish suitable for brand representation
- Timeless design approach that won't appear dated quickly
- Cross-platform compatibility while maximizing ${formValues.platform} potential`;
  },
  
  qualityEnhancements: {
    'low': 'good quality, suitable for quick previews',
    'medium': 'professional quality, balanced detail and speed',
    'high': 'ultra-high definition, crisp details, premium visual quality',
    'auto': 'automatically optimized quality for the content'
  },
  
  styleModifiers: {
    'bright-airy': 'bright, airy aesthetic with soft lighting, minimal shadows, clean whites, pastel accents',
    'dark-moody': 'dramatic lighting, deep shadows, rich blacks, moody atmosphere, cinematic feel',
    'vibrant-colorful': 'bold, saturated colors, high contrast, energetic composition, dynamic visual elements',
    'minimalist-clean': 'minimal design, plenty of whitespace, simple composition, elegant typography',
    'retro-vintage': 'vintage color grading, nostalgic elements, classic typography, aged aesthetic',
    'professional-corporate': 'business-appropriate styling, conservative colors, professional typography, clean layout'
  },
  
  aspectRatioOptimizations: {
    'instagram-post': 'Perfect 1:1 square composition, centered focal points',
    'instagram-story': 'Vertical 9:16 format, mobile-first design, thumb-stopping visual',
    'facebook-post': 'Landscape 1.91:1 format, wide composition suitable for feed display',
    'tiktok-background': 'Vertical 9:16 format, dynamic composition, mobile-optimized',
    'pinterest-pin': 'Vertical 2:3 format, eye-catching top section, scrollable design',
    'twitter-post': 'Landscape 16:9 format, immediate visual impact, timeline-optimized'
  }
};

// ===== Logo & Brand Template =====

export const LOGO_BRAND_TEMPLATE: PromptTemplate = {
  categoryId: 'logo-brand',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Target audience integration
    const audienceSection = formValues.targetAudience 
      ? `Target Audience Framework:
Primary Audience: ${formValues.targetAudience}
- Demographic Resonance: Visual elements specifically calibrated for ${formValues.targetAudience} preferences and cultural expectations
- Psychological Appeal: Design approach tapping into ${formValues.targetAudience} values, aspirations, and decision-making factors
- Cultural Sensitivity: Logo design appropriate for ${formValues.targetAudience} cultural background and market context
- Age Appropriateness: Visual sophistication and style aligned with ${formValues.targetAudience} generational preferences
- Economic Positioning: Design quality and approach reflecting ${formValues.targetAudience} purchasing power and value expectations
- Communication Style: Visual language that speaks directly to ${formValues.targetAudience} communication preferences and lifestyle`
      : 'Universal Appeal Design: Logo crafted for broad market appeal and cross-demographic effectiveness';

    // Usage context integration
    const usageSection = formValues.logoUsageContext 
      ? `Usage Context Optimization:
Primary Applications: ${formValues.logoUsageContext}
- Application Versatility: Logo design optimized for ${formValues.logoUsageContext} while maintaining effectiveness across multiple formats
- Scale Performance: Visual elements maintaining clarity and impact from ${formValues.logoUsageContext} to business cards and large signage
- Medium Adaptability: Design approach ensuring effectiveness across print, digital, embroidery, and promotional product applications
- Context Appropriateness: Logo sophistication and style matching ${formValues.logoUsageContext} professional and cultural requirements
- Brand Integration: Logo seamlessly supporting ${formValues.logoUsageContext} marketing goals and brand positioning strategy
- Future Flexibility: Design structure allowing adaptation for evolving ${formValues.logoUsageContext} needs and market expansion`
      : 'Multi-Context Design: Logo optimized for versatile application across various business and marketing contexts';

    // Output formats integration
    const formatsSection = formValues.outputFormats 
      ? `Technical Format Requirements:
Required Outputs: ${formValues.outputFormats}
- Format Optimization: Logo design specifically structured for optimal performance in ${formValues.outputFormats}
- Resolution Independence: Vector-based approach ensuring crisp reproduction across all ${formValues.outputFormats} specifications
- Color Management: Professional color space handling ensuring consistent appearance across ${formValues.outputFormats} applications
- File Preparation: Complete logo package including ${formValues.outputFormats} with appropriate technical specifications
- Production Readiness: Logo files prepared for immediate implementation across ${formValues.outputFormats} without additional processing
- Quality Assurance: Technical validation ensuring logo meets professional standards for all ${formValues.outputFormats} requirements`
      : 'Standard Format Delivery: Logo prepared in essential business formats for comprehensive brand implementation';
    
    const sloganSection = formValues.slogan 
      ? `Brand Messaging Integration:
Primary Slogan: "${formValues.slogan}"
- Typography Harmony: Slogan typography complements but doesn't compete with main brand mark
- Hierarchy: Company name 100% prominence, slogan 40-60% relative size
- Positioning: Strategic placement that enhances overall logo composition
- Readability: Maintains legibility across all scaling scenarios from business card to billboard
- Style Consistency: Typographic treatment aligns with overall brand personality
- Memorability: Supports brand recall when slogan appears separately from logo`
      : 'Logo-Only Design: Standalone brand mark without tagline integration, maximum symbol impact and versatility';
    
    return `Design an iconic, instantly recognizable logo that becomes the cornerstone of ${formValues.companyName}'s brand identity and market presence.

${standardFieldsSection}

${audienceSection}

${usageSection}

${formatsSection}

BRAND IDENTITY SPECIFICATIONS:
Company: ${formValues.companyName}
Industry Sector: ${formValues.industry}
Design Philosophy: ${formValues.logoStyle}
Brand Emotion: ${formValues.coreFeeling}

VISUAL ARCHITECTURE FRAMEWORK:
Logo Structure & Composition:
- Primary Mark: Central brand element that functions independently as recognizable symbol
- Symbol Hierarchy: Clear visual priority ensuring immediate brand recognition
- Geometric Foundation: Underlying mathematical precision creating psychological stability
- Proportional Systems: Golden ratio or modular scaling for inherent visual harmony
- Negative Space Utilization: Strategic white space that enhances rather than diminishes impact
- Scalability Matrix: Design integrity maintained from 16px favicon to 100ft billboard applications

Typography & Wordmark Design:
- Font Selection: Custom or carefully chosen typeface reflecting ${formValues.coreFeeling} brand personality
- Letter Spacing: Optimized kerning for maximum legibility and professional appearance
- Character Modifications: Subtle customizations that enhance uniqueness without sacrificing readability
- Weight Distribution: Balanced stroke weights supporting both digital and print reproduction
- Baseline Alignment: Mathematical precision ensuring consistent typographic presentation

COLOR PSYCHOLOGY & APPLICATION:
Primary Color Strategy:
- Dominant Brand Color: Scientifically selected to evoke ${formValues.coreFeeling} emotional response
- ${formValues.industry} Industry Appropriateness: Colors that resonate with sector expectations while maintaining differentiation
- Cultural Considerations: Color meanings validated across primary market demographics
- Reproduction Fidelity: Colors specified for consistent reproduction across all media types

Secondary Color Framework:
- Supporting Palette: 2-3 complementary colors enhancing primary brand color
- Monochrome Versions: Black, white, and single-color applications maintaining full impact
- Accessibility Standards: Color combinations meeting WCAG guidelines for universal accessibility
- Print Adaptations: CMYK conversions optimized for professional printing applications

SYMBOLIC DESIGN ELEMENTS:
Industry-Specific Iconography:
- ${formValues.industry} Visual Language: Subtle incorporation of sector-relevant symbols without cliché
- Abstract Representation: Conceptual rather than literal interpretation of industry elements
- Universal Recognition: Symbols that transcend language and cultural barriers
- Timeless Symbolism: Avoid trend-dependent elements that may appear dated

Brand Personality Visualization:
- ${formValues.coreFeeling} Emotional Mapping: Visual elements specifically chosen to evoke intended brand feelings
- Geometric vs. Organic: Shape language appropriate to brand personality (angular for strength, curved for approachability)
- Line Quality: Stroke characteristics (bold, delicate, rough, smooth) reflecting brand attributes
- Texture Integration: Subtle textural elements enhancing brand tactile associations

${sloganSection}

TECHNICAL PRECISION STANDARDS:
Vector Construction:
- Mathematical Accuracy: All curves, angles, and proportions geometrically precise
- Anchor Point Optimization: Minimal points ensuring smooth curves and clean scaling
- Path Consistency: Uniform stroke weights and consistent geometric relationships
- File Preparation: Native vector format ensuring infinite scalability without quality loss

Production Specifications:
- Multi-Format Delivery: EPS, AI, SVG, PNG, JPG variants for all application needs
- Color Space Management: RGB for digital, CMYK for print, Pantone for brand consistency
- Minimum Size Requirements: Legible reproduction at 0.5-inch width minimum
- Backdrop Versatility: Effective presentation on light, dark, and colored backgrounds

BRAND APPLICATION VERSATILITY:
Business Implementation:
- Stationery Integration: Seamless incorporation into letterheads, business cards, envelopes
- Digital Optimization: Perfect rendering across websites, social media, and applications
- Merchandise Adaptability: Effective reproduction on promotional items and corporate gifts
- Architectural Application: Suitable for building signage, vehicle graphics, and environmental design

Legal & Trademark Considerations:
- Originality Assurance: Completely unique design avoiding trademark conflicts
- Distinctiveness: Sufficiently unique for trademark protection and legal registration
- Reproduction Rights: Design elements cleared for unlimited commercial use
- International Application: Symbol effectiveness across global markets and cultures

INDUSTRY EXCELLENCE BENCHMARKS:
${formValues.industry} Market Leadership:
- Competitive Differentiation: Distinctly separate from existing ${formValues.industry} brand identities
- Professional Authority: Design sophistication appropriate for industry leadership positioning
- Innovation Reflection: Visual progressiveness suggesting forward-thinking company approach
- Trust Building: Design elements that enhance credibility and professional confidence

Brand Longevity Planning:
- Timeless Design Principles: Avoiding trends that may appear dated within 5-10 years
- Evolution Capacity: Design framework allowing future brand development without complete redesign
- Multi-Generational Appeal: Visual approach suitable for long-term brand building
- Legacy Consideration: Design dignity appropriate for century-long brand presence

FINAL BRAND MARK VALIDATION:
- Instant Recognition: Logo identifiable within 0.5-second viewing window
- Memory Retention: Design elements supporting long-term brand recall
- Emotional Connection: Visual triggers creating positive ${formValues.coreFeeling} brand associations
- Professional Credibility: Design sophistication enhancing ${formValues.companyName} market position
- Competitive Advantage: Unique visual identity providing marketplace differentiation`;
  },

  qualityEnhancements: {
    'low': 'good logo quality, suitable for previews',
    'medium': 'professional logo quality, clean execution',
    'high': 'premium logo design, ultra-crisp details, perfect vector quality',
    'auto': 'automatically optimized quality for logo usage'
  },

  styleModifiers: {
    'minimalist-abstract': 'clean geometric forms, abstract symbolism, minimal detail, modern simplicity',
    'emblem': 'traditional badge/crest format, detailed elements, classic arrangement, heritage styling',
    'wordmark': 'typography-focused design, custom lettering, distinctive font treatment, text-based brand mark',
    'mascot': 'character-based design, friendly personality, memorable figure, brand representative',
    'geometric': 'mathematical precision, angular forms, systematic design, architectural elements'
  },

  aspectRatioOptimizations: {
    'square': 'Balanced square composition perfect for social media',
    'horizontal': 'Wide format suitable for letterheads and headers',
    'vertical': 'Tall format ideal for business cards and vertical applications'
  }
};

// ===== UI Components Template =====

export const UI_COMPONENTS_TEMPLATE: PromptTemplate = {
  categoryId: 'ui-components',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Dimensions integration
    const dimensionsSection = formValues.componentDimensions 
      ? `Component Specifications Framework:
Dimensions: ${formValues.componentDimensions}
- Responsive Design: Component scaling beautifully across ${formValues.componentDimensions} and various screen sizes
- Pixel Perfect: Precise measurements ensuring crisp rendering at ${formValues.componentDimensions} specifications
- Grid Alignment: Component fitting seamlessly into common design system grid structures
- Accessibility Standards: Size specifications meeting touch target and visibility requirements
- Platform Optimization: Dimensions suitable for web, mobile, and desktop application contexts
- Scalability Planning: Component structure supporting future size variations and responsive adaptations`
      : 'Flexible Sizing: Component optimized for various dimensions and responsive design requirements';

    // Content integration
    const contentSection = formValues.componentContent 
      ? `Content Integration Strategy:
Component Content: "${formValues.componentContent}"
- Typography Hierarchy: Text treatment optimized for ${formValues.componentContent} readability and visual impact
- Content Flow: Information architecture supporting natural reading patterns and user comprehension
- Micro-copy Excellence: Every word contributing to user understanding and positive interaction experience
- Localization Ready: Content structure supporting translation and international usage requirements
- Accessibility Compliance: Text treatment meeting screen reader and accessibility standard requirements
- Brand Voice Integration: Content tone and presentation aligned with overall brand personality and communication style`
      : 'Content-Ready Design: Component structure accommodating various text lengths and content types';

    // Enhanced interaction states integration
    const interactionSection = formValues.interactionStates 
      ? `Advanced Interaction Design Framework:
Supported States: ${Array.isArray(formValues.interactionStates) ? formValues.interactionStates.join(', ') : formValues.interactionStates}
- State Clarity: Clear visual differentiation between all selected states ensuring intuitive user understanding
- Transition Smoothness: Elegant animations and micro-interactions enhancing state changes and user feedback
- Accessibility Standards: State changes communicated through multiple sensory channels for universal accessibility
- Performance Optimization: State implementations maintaining smooth performance across various devices and browsers
- User Feedback: Immediate visual confirmation of user actions and system responses through state design
- Error Prevention: State design guiding users toward successful interactions and preventing common mistakes
- State Hierarchy: Visual priority system showing most important states prominently in the component showcase`
      : 'Standard Interaction Design: Component supporting essential interactive states and user feedback';

    // Component variants integration
    const variantsSection = formValues.componentVariants 
      ? `Component Variants System:
Selected Variants: ${Array.isArray(formValues.componentVariants) ? formValues.componentVariants.join(', ') : formValues.componentVariants}
- Variant Differentiation: Clear visual distinction between each variant type while maintaining design consistency
- Hierarchy Communication: Primary variants more prominent than secondary and tertiary variants
- Semantic Meaning: Color and styling choices that communicate the purpose of each variant (destructive = red, success = green, etc.)
- Accessibility Compliance: All variants meet contrast and readability standards
- Brand Integration: Variant styling aligned with brand colors and personality
- Usage Context: Each variant designed for its specific use case and user intent`
      : 'Single Component Focus: Component designed with primary styling and standard variant approach';

    // Micro-interactions integration
    const microInteractionsSection = formValues.microInteractions 
      ? `Micro-interactions Design System:
Selected Effects: ${Array.isArray(formValues.microInteractions) ? formValues.microInteractions.join(', ') : formValues.microInteractions}
- Animation Timing: Smooth 200-300ms transitions that feel natural and responsive
- Easing Functions: Appropriate easing curves for each interaction type (ease-out for entrances, ease-in for exits)
- Visual Feedback: Immediate confirmation of user actions through subtle visual changes
- Performance Optimization: Lightweight animations that don't impact component performance
- Accessibility Respect: Motion effects that respect user's reduced motion preferences
- Platform Consistency: Micro-interactions that feel native to the target platform`
      : 'Standard Interactions: Component with essential hover and click feedback without complex animations';

    // User context and environment integration
    const userContextSection = formValues.userContext 
      ? `User Context Optimization:
Usage Environment: ${formValues.userContext}
- Context-Aware Design: Interface elements specifically optimized for ${formValues.userContext} usage patterns and attention levels
- Environmental Considerations: Design approach accounting for ${formValues.userContext} typical distractions and constraints
- Interaction Patterns: User interface behaviors aligned with ${formValues.userContext} expectations and mental models
- Cognitive Load Management: Information presentation optimized for ${formValues.userContext} cognitive capacity and focus levels
- Task Completion Support: Design elements facilitating successful task completion within ${formValues.userContext} constraints
- Error Recovery: Mistake prevention and recovery mechanisms appropriate for ${formValues.userContext} stress levels and time constraints`
      : 'Universal Context Design: Interface optimized for various user contexts and environments';

    // Performance requirements integration
    const performanceSection = formValues.performanceRequirements 
      ? `Performance Optimization Framework:
Performance Target: ${formValues.performanceRequirements}
- Loading Strategy: Component architecture optimized for ${formValues.performanceRequirements} loading characteristics and user expectations
- Resource Efficiency: Asset optimization and delivery methods aligned with ${formValues.performanceRequirements} constraints
- Interaction Responsiveness: Animation and feedback timing calibrated for ${formValues.performanceRequirements} performance standards
- Network Considerations: Design approach accounting for ${formValues.performanceRequirements} connectivity limitations and data usage
- Device Optimization: Component structure and complexity appropriate for ${formValues.performanceRequirements} device capabilities
- Progressive Enhancement: Graceful degradation strategy ensuring core functionality under ${formValues.performanceRequirements} constraints`
      : 'Standard Performance: Component optimized for typical web performance expectations and device capabilities';

    // Business goal integration
    const businessGoalSection = formValues.businessGoal 
      ? `Business Objective Alignment:
Primary Goal: ${formValues.businessGoal}
- Design Psychology: Visual elements and interaction patterns specifically chosen to support ${formValues.businessGoal} objectives
- User Journey Optimization: Component placement and behavior aligned with ${formValues.businessGoal} conversion funnels and user flows
- Behavioral Triggers: Subtle design cues encouraging user actions that advance ${formValues.businessGoal} business metrics
- Success Metrics: Design elements that can be measured and optimized for ${formValues.businessGoal} key performance indicators
- Competitive Advantage: Design approach that differentiates the product while advancing ${formValues.businessGoal} objectives
- Long-term Value: Component design supporting both immediate ${formValues.businessGoal} goals and sustained user satisfaction`
      : 'General Business Support: Component designed to support overall user experience and business objectives';

    // Technical constraints integration
    const technicalConstraintsSection = formValues.technicalConstraints 
      ? `Technical Implementation Framework:
Constraints: ${formValues.technicalConstraints}
- Constraint Compliance: Component architecture fully compatible with ${formValues.technicalConstraints} technical limitations
- Progressive Enhancement: Graceful functionality degradation ensuring core features work under ${formValues.technicalConstraints} restrictions
- Accessibility Integration: Enhanced accessibility features specifically addressing ${formValues.technicalConstraints} requirements
- Cross-Platform Compatibility: Component design ensuring consistent experience across ${formValues.technicalConstraints} technical environments
- Performance Optimization: Implementation approach optimized for ${formValues.technicalConstraints} performance characteristics
- Future-Proofing: Design structure allowing evolution while maintaining ${formValues.technicalConstraints} compatibility requirements`
      : 'Standard Technical Approach: Component designed for modern web standards with broad compatibility';

    // Visual quality enhancement system
    const visualQualitySection = formValues.visualQuality 
      ? `Ultra-Premium Visual Quality Framework:
Quality Level: ${formValues.visualQuality}
${formValues.visualQuality === 'ultra-premium' ? `
- Ray-traced Shadows: Physically accurate shadow rendering with realistic light scattering
- Ultra-crisp Edges: Pixel-perfect edge rendering with sub-pixel precision
- Advanced Gradients: Smooth, high-fidelity color transitions with multiple color stops
- Premium Materials: Realistic surface textures and material properties
- Professional Polish: Every detail refined to professional design standards` : ''}
${formValues.visualQuality === 'pixel-perfect' ? `
- Pixel Precision: Every element aligned to exact pixel boundaries
- Mathematical Spacing: Precise measurements using consistent grid systems
- Sharp Typography: Crisp text rendering with optimal letter spacing
- Clean Geometry: Perfect geometric shapes with no aliasing or distortion
- Consistent Alignment: All elements precisely positioned using mathematical relationships` : ''}
${formValues.visualQuality === 'premium' ? `
- Enhanced Details: Polished visual elements with refined finishing touches
- Smooth Gradients: High-quality color transitions and surface treatments
- Professional Shadows: Carefully crafted shadow systems for depth and hierarchy
- Quality Typography: Well-spaced, readable text with appropriate weights
- Refined Interactions: Smooth, polished interaction feedback` : ''}
- Rendering Excellence: Component rendered at the highest quality standards for professional use`
      : 'Standard Quality: Professional-grade component rendering suitable for production use';

    // Advanced shadow and elevation system
    const shadowSystemSection = formValues.shadowSystem 
      ? `Advanced Shadow & Elevation System:
Shadow Type: ${formValues.shadowSystem}
${formValues.shadowSystem === 'ray-traced' ? `
- Realistic Light Physics: Shadows calculated using ray-tracing algorithms for maximum realism
- Multiple Light Sources: Complex lighting scenarios with ambient, directional, and point lights
- Soft Shadow Edges: Natural shadow falloff with realistic blur gradients
- Color-accurate Shadows: Shadows that reflect the color temperature of light sources
- Environmental Reflections: Subtle reflections and ambient occlusion effects` : ''}
${formValues.shadowSystem === 'material' ? `
- Material Design Elevation: Consistent elevation system with appropriate shadow depths
- Layered Shadows: Multiple shadow layers creating realistic depth perception
- Ambient Shadows: Soft, diffused shadows for natural lighting effects
- Key Light Shadows: Directional shadows providing clear depth hierarchy
- Elevation Consistency: Shadows that maintain consistent light source direction` : ''}
${formValues.shadowSystem === 'dramatic' ? `
- High Contrast Shadows: Strong, pronounced shadows for dramatic visual impact
- Deep Shadow Depths: Significant shadow offsets creating bold depth effects
- Sharp Shadow Edges: Crisp shadow boundaries for modern, graphic appearance
- Strategic Shadow Placement: Shadows positioned for maximum visual hierarchy
- Bold Lighting: Strong directional lighting creating impactful shadow patterns` : ''}
- Shadow Integration: Shadows seamlessly integrated into overall component design`
      : 'Subtle Shadows: Light, professional shadows that enhance depth without distraction';

    // Advanced gradient system
    const gradientSystemSection = formValues.gradientSystem 
      ? `Advanced Gradient Rendering System:
Gradient Type: ${formValues.gradientSystem}
${formValues.gradientSystem === 'mesh' ? `
- Multi-point Gradients: Complex color transitions with multiple anchor points
- Organic Color Flow: Natural, flowing color transitions that feel organic
- Advanced Color Interpolation: Smooth color blending using advanced algorithms
- Depth Simulation: Gradients that create illusion of three-dimensional depth
- Color Harmony: Carefully selected color combinations for visual appeal` : ''}
${formValues.gradientSystem === 'animated' ? `
- Dynamic Color Transitions: Gradients that suggest motion and energy
- Temporal Color Flow: Color changes that imply movement over time
- Kinetic Visual Elements: Gradients that enhance the sense of interactivity
- Smooth Animation Curves: Color transitions with natural easing functions
- Performance Optimized: Animated effects that maintain smooth performance` : ''}
${formValues.gradientSystem === 'radial' ? `
- Circular Color Transitions: Radial gradients creating focal points and emphasis
- Center-to-edge Flow: Color transitions that draw attention to key elements
- Depth Illusion: Radial gradients that create sense of dimensional depth
- Spotlight Effects: Focused color transitions highlighting important content
- Balanced Color Distribution: Even color flow from center to periphery` : ''}
- Gradient Excellence: Professional-grade gradient rendering with smooth color transitions`
      : 'Standard Gradients: Clean, professional linear gradients where appropriate';

    // Advanced typography system
    const typographySystemSection = formValues.typographySystem 
      ? `Advanced Typography System:
Typography Type: ${formValues.typographySystem}
${formValues.typographySystem === 'variable' ? `
- Variable Font Technology: Advanced font features with dynamic weight and width adjustments
- Optical Size Optimization: Font rendering optimized for different sizes and viewing distances
- Custom Font Variations: Unique font characteristics tailored to specific use cases
- Advanced Kerning: Precise letter spacing for optimal readability
- Responsive Typography: Font characteristics that adapt to different screen sizes` : ''}
${formValues.typographySystem === 'custom' ? `
- Brand-specific Typography: Custom font selection aligned with brand personality
- Hierarchical Font System: Carefully planned font weights and sizes for clear hierarchy
- Cross-platform Font Rendering: Consistent typography across all devices and platforms
- Accessibility-first Typography: Font choices optimized for readability and accessibility
- Professional Font Pairing: Harmonious combination of fonts for different content types` : ''}
${formValues.typographySystem === 'google-fonts' ? `
- Professional Web Typography: High-quality Google Fonts optimized for web use
- Performance-optimized Loading: Efficient font loading for fast page performance
- Cross-browser Compatibility: Consistent font rendering across all browsers
- Extensive Character Support: Full character sets for international content
- Modern Font Features: Advanced typography features like ligatures and kerning` : ''}
- Typography Excellence: Professional-grade text rendering with optimal readability`
      : 'System Typography: Clean, readable fonts optimized for the target platform';

    // Layout grid system
    const layoutGridSection = formValues.layoutGrid 
      ? `Advanced Layout Grid System:
Grid Type: ${formValues.layoutGrid}
${formValues.layoutGrid === 'css-grid' ? `
- Modern CSS Grid Layout: Advanced grid system with precise control over positioning
- Responsive Grid Areas: Grid regions that adapt intelligently to different screen sizes
- Complex Grid Patterns: Sophisticated layouts with overlapping and nested grid areas
- Grid-based Alignment: Perfect alignment using CSS Grid's advanced positioning
- Flexible Grid Sizing: Dynamic grid tracks that resize based on content and viewport` : ''}
${formValues.layoutGrid === '4px' ? `
- Precise 4px Baseline Grid: Ultra-precise spacing system for pixel-perfect alignment
- Mathematical Precision: All spacing calculated using 4px increments for consistency
- Micro-spacing Control: Fine-grained control over element positioning and spacing
- Consistent Rhythm: Visual rhythm created through consistent 4px spacing intervals
- Professional Precision: Design precision that meets the highest professional standards` : ''}
${formValues.layoutGrid === '8px' ? `
- Standard 8px Baseline Grid: Industry-standard spacing system for consistent layouts
- Scalable Spacing System: Spacing that scales appropriately across different screen sizes
- Design System Integration: Grid system that integrates seamlessly with design tokens
- Consistent Visual Rhythm: Harmonious spacing that creates pleasing visual flow
- Cross-component Consistency: Uniform spacing approach across all component types` : ''}
- Grid Excellence: Professional layout system ensuring perfect alignment and spacing`
      : 'Standard Layout: Clean, well-organized layout with consistent spacing';

    // Responsive behavior integration
    const responsiveBehaviorSection = formValues.responsiveBehavior 
      ? `Advanced Responsive Behavior System:
Responsive Features: ${Array.isArray(formValues.responsiveBehavior) ? formValues.responsiveBehavior.join(', ') : formValues.responsiveBehavior}
- Intelligent Adaptation: Component behavior that adapts intelligently to different screen sizes
- Content Prioritization: Most important content remains visible and accessible across all devices
- Interaction Optimization: Touch and mouse interactions optimized for each device type
- Performance Scaling: Component complexity adjusted based on device capabilities
- Accessibility Maintenance: Full accessibility features maintained across all responsive states
- Visual Hierarchy Preservation: Important visual relationships maintained regardless of screen size`
      : 'Standard Responsive: Component scales appropriately across common screen sizes';

    // Platform optimizations integration
    const platformOptimizationsSection = formValues.platformOptimizations 
      ? `Platform-Specific Optimizations:
Optimization Features: ${Array.isArray(formValues.platformOptimizations) ? formValues.platformOptimizations.join(', ') : formValues.platformOptimizations}
- Native Platform Feel: Component behavior that feels native to each target platform
- Accessibility Excellence: Advanced accessibility features meeting and exceeding platform standards
- Performance Optimization: Component performance tuned for each platform's capabilities
- User Experience Consistency: Consistent experience that respects platform conventions
- Future-proof Design: Component architecture that adapts to evolving platform requirements
- Cross-platform Compatibility: Seamless experience across all supported platforms`
      : 'Standard Platform Support: Component designed for broad platform compatibility';

    // Device-specific features integration
    const deviceSpecificSection = formValues.deviceSpecific 
      ? `Device-Specific Feature Integration:
Device Features: ${Array.isArray(formValues.deviceSpecific) ? formValues.deviceSpecific.join(', ') : formValues.deviceSpecific}
- Hardware Integration: Component design that takes advantage of specific device capabilities
- Interaction Optimization: Interactions optimized for each device's input methods
- Display Optimization: Visual design optimized for each device's display characteristics
- Performance Tuning: Component performance optimized for specific device constraints
- Future Device Support: Architecture that can adapt to new device types and capabilities
- Universal Accessibility: Consistent accessibility across all device types and capabilities`
      : 'Universal Device Support: Component designed for broad device compatibility';

    // Enhanced platform-specific design guidelines
    const platformGuidelines = (() => {
      switch (formValues.platform) {
        case 'ios-app':
          return `iOS Human Interface Guidelines Compliance:
- Native iOS Design Language: Components following Apple's design principles and visual hierarchy
- Touch Targets: Minimum 44pt touch targets for optimal finger interaction on all iOS devices
- Typography: San Francisco font family with appropriate weights and optical sizes for iOS readability
- Color Semantics: iOS system colors for semantic meanings (destructive red, blue for links, etc.)
- Spacing: 8pt grid system aligned with iOS interface guidelines and safe area considerations
- Animation: iOS-native motion curves and timing (ease-in-out, spring animations) for familiar feel
- Accessibility: VoiceOver compatibility, Dynamic Type support, and high contrast mode considerations
- Dark Mode: Automatic adaptation between light and dark appearances with proper color schemes`;

        case 'android-app':
          return `Material Design 3 Guidelines Compliance:
- Material You Design System: Components following Google's latest Material Design principles
- Touch Targets: Minimum 48dp touch targets for optimal accessibility across Android devices
- Typography: Roboto font family with Material Design type scale and weight hierarchy
- Color System: Material Design color roles (primary, secondary, tertiary) with proper semantic usage
- Elevation: Material Design elevation system using shadows and surface tinting
- Motion: Material motion principles with emphasis on purposeful, smooth, and responsive animations
- Accessibility: TalkBack support, contrast ratios meeting WCAG guidelines, and scalable text
- Dynamic Color: Adaptive color schemes that respond to user's wallpaper and system preferences`;

        case 'web-desktop':
          return `Modern Web Desktop Interface Standards:
- Desktop Interaction Patterns: Hover states, keyboard navigation, and cursor feedback optimized for mouse/trackpad
- Responsive Grid: CSS Grid and Flexbox layouts adapting to various desktop screen sizes (1280px to 4K)
- Typography: Web-safe fonts with proper line heights and letter spacing for extended reading sessions
- Color Accessibility: WCAG 2.1 AA compliance with 4.5:1 contrast ratios for normal text, 3:1 for large text
- Performance: Optimized for fast loading with CSS animations using transform and opacity properties
- Browser Compatibility: Consistent rendering across Chrome, Firefox, Safari, and Edge latest versions
- Keyboard Navigation: Full tab order, focus indicators, and keyboard shortcuts for power users
- Loading States: Skeleton screens and progressive loading for perceived performance enhancement`;

        case 'web-mobile':
          return `Mobile Web Interface Optimization:
- Touch-First Design: 44px minimum touch targets with adequate spacing to prevent mis-taps
- Mobile Viewport: Responsive design for 320px to 768px widths with proper viewport meta tag considerations
- Performance: Lightweight components optimized for 3G networks and slower mobile processors
- Gesture Support: Swipe, pinch-to-zoom, and long-press interactions where appropriate
- Thumb Navigation: Interface elements positioned within comfortable thumb reach zones
- Mobile Typography: Larger text sizes (16px minimum) to prevent zoom on iOS and improve readability
- Battery Optimization: Reduced animations and efficient CSS to preserve mobile device battery
- Offline Considerations: Progressive enhancement for intermittent connectivity scenarios`;

        default:
          return `Universal Design Principles:
- Cross-Platform Consistency: Design elements that work effectively across all platforms and devices
- Responsive Adaptation: Components that scale and adapt gracefully from mobile to desktop
- Accessibility First: Universal design principles ensuring usability for all users regardless of abilities
- Performance Optimization: Lightweight, efficient components with fast loading and smooth interactions
- Modern Standards: Contemporary design patterns following current UX/UI best practices and conventions`;
      }
    })();

    // Intelligent color system based on design system and UX principles
    const intelligentColorSystem = (() => {
      const userColorTheme = formValues.colorTheme;
      const designSystem = formValues.designSystem;
      
      return `Professional Color Architecture:
Selected Theme: ${userColorTheme}
Design System: ${designSystem}

INTELLIGENT COLOR APPLICATION:
- Color Psychology: Strategic use of colors based on proven psychological impact and user behavior research
- Semantic Color Roles: Error states (red spectrum), success (green spectrum), warning (amber), info (blue) with proper contrast
- Hierarchy Through Color: Primary actions use high-contrast colors, secondary actions use muted tones
- Accessibility First: All color combinations exceed WCAG 2.1 AA standards (4.5:1 contrast ratio minimum)
- Cultural Sensitivity: Color choices appropriate for global audiences avoiding problematic cultural associations
- Brand Integration: User's color preferences intelligently incorporated while maintaining usability standards

PROFESSIONAL COLOR RULES:
- Primary Action Colors: High contrast, attention-grabbing colors for main CTAs (typically blue, green, or brand primary)
- Secondary Actions: Neutral tones (grays) or low-saturation colors to avoid competing with primary actions
- Destructive Actions: Red spectrum colors with adequate warning and confirmation patterns
- Background Hierarchy: Light neutral backgrounds with subtle contrast variations for content organization
- Text Color Optimization: Dark text on light backgrounds (or vice versa) with sufficient contrast for readability
- Interactive State Colors: Hover states 10-15% darker/lighter, active states with immediate visual feedback

DESIGN SYSTEM COLOR COMPLIANCE:
${designSystem === 'material-design' ? '- Material Design Color System: Primary, secondary, and tertiary color roles with proper tonal palettes' :
  designSystem === 'ios-human' ? '- iOS Color System: System colors, semantic colors, and adaptive colors for light/dark modes' :
  designSystem === 'fluent-design' ? '- Fluent Design Color: Neutral palette with accent colors and proper elevation tinting' :
  '- Modern Color System: Professional color palette with semantic roles and accessibility compliance'}

ANTI-PATTERNS AVOIDED:
- Never use user-selected colors blindly without considering contrast, accessibility, or usability
- Avoid rainbow interfaces or excessive color variety that creates visual chaos
- Prevent low-contrast combinations that harm readability and accessibility
- Eliminate colors that don't serve a functional purpose or create visual hierarchy
- Reject color choices that conflict with platform conventions or user expectations`;
    })();

    // Component-specific professional guidelines
    const componentSpecificGuidelines = (() => {
      switch (formValues.componentType) {
        case 'button':
          return `Professional Button Design Standards:
- Visual Hierarchy: Primary buttons with high contrast, secondary buttons with subtle styling
- State Management: Clear visual feedback for hover, active, disabled, and loading states
- Touch Targets: Minimum 44px height with adequate horizontal padding for comfortable interaction
- Typography: Medium to semibold font weights with appropriate letter spacing for button text
- Corner Radius: Consistent with design system (4px for sharp, 8px for moderate, 16px+ for rounded)
- Shadow/Elevation: Subtle shadows or borders to indicate interactivity and provide depth
- Loading States: Spinner or progress indication during async operations with disabled appearance
- Icon Integration: Proper spacing between icons and text, consistent icon sizing and alignment`;

        case 'form-elements':
          return `Form Element UX Excellence:
- Input Field Design: Clear borders, proper padding, and focus states with accessible color indicators
- Label Positioning: Above inputs for optimal scanning, with proper association for screen readers
- Error Handling: Inline validation with clear error messages and recovery guidance
- Placeholder Text: Helpful hints that don't replace labels, with sufficient contrast for visibility
- Field Sizing: Appropriate input sizes based on expected content length and mobile considerations
- Required Field Indicators: Clear asterisks or other indicators with proper explanation
- Progressive Disclosure: Complex forms broken into logical steps with clear progress indication
- Keyboard Navigation: Proper tab order and keyboard shortcuts for efficient form completion`;

        case 'navigation':
          return `Navigation Component Excellence:
- Information Architecture: Clear hierarchy with logical grouping and intuitive categorization
- Active State Indication: Clear visual feedback showing current page/section location
- Responsive Behavior: Graceful adaptation from desktop horizontal to mobile hamburger menu
- Accessibility: Proper ARIA labels, keyboard navigation, and screen reader compatibility
- Visual Weight: Primary navigation more prominent than secondary navigation elements
- Breadcrumb Integration: Clear path indication for deep navigation structures
- Search Integration: Prominent search functionality for content-heavy sites
- Mobile Optimization: Touch-friendly targets with adequate spacing for finger navigation`;

        case 'dashboard':
          return `Dashboard Interface Design:
- Information Density: Balanced layout avoiding both cluttered and sparse extremes
- Data Visualization: Clear charts and metrics with proper labeling and context
- Widget Organization: Logical grouping with consistent sizing and spacing patterns
- Responsive Grid: Flexible layout adapting to various screen sizes and orientations
- Progressive Disclosure: Detailed views accessible through drill-down interactions
- Real-time Updates: Live data with appropriate refresh indicators and loading states
- Customization: User-configurable layouts while maintaining overall design consistency
- Performance: Optimized for fast loading and smooth interactions with large datasets`;

        default:
          return `Universal Component Standards:
- Consistency: Aligned with established design system patterns and conventions
- Usability: Intuitive interactions following platform-specific user expectations
- Accessibility: Full compliance with WCAG 2.1 guidelines and platform accessibility features
- Performance: Optimized for smooth interactions and fast loading across all devices
- Scalability: Design approach supporting future enhancements and system evolution`;
      }
    })();
    
    return `Create a professional, production-ready ${formValues.componentType} that exemplifies modern UX/UI design excellence and follows industry best practices for ${formValues.platform} development.

${standardFieldsSection}

${dimensionsSection}

${contentSection}

${interactionSection}

${variantsSection}

${microInteractionsSection}

${userContextSection}

${performanceSection}

${businessGoalSection}

${technicalConstraintsSection}

ENHANCED COMPONENT SPECIFICATIONS:
Component Type: ${formValues.componentType}
Target Platform: ${formValues.platform}
Design System: ${formValues.designSystem}
User Experience Goal: ${formValues.userExperience}

${visualQualitySection}

${shadowSystemSection}

${gradientSystemSection}

${typographySystemSection}

${layoutGridSection}

${responsiveBehaviorSection}

${platformOptimizationsSection}

${deviceSpecificSection}

${platformGuidelines}

${intelligentColorSystem}

${componentSpecificGuidelines}

PROFESSIONAL UX/UI DESIGN FRAMEWORK:

VISUAL HIERARCHY & INFORMATION ARCHITECTURE:
- Scanning Patterns: Layout optimized for F-pattern and Z-pattern reading behaviors with strategic element placement
- Content Prioritization: Most important elements receive primary visual emphasis through size, color, and positioning
- Whitespace Strategy: Generous negative space creating breathing room, focus, and visual separation between elements
- Grid Alignment: Mathematical precision using 8px/4px grid system for pixel-perfect alignment and consistency
- Typography Hierarchy: Clear information hierarchy using size, weight, and color to guide user attention
- Progressive Disclosure: Information revealed appropriately based on user context and task completion needs

INTERACTION DESIGN EXCELLENCE:
- Micro-interactions: Subtle animations providing immediate feedback for user actions (200-300ms duration)
- State Communication: Clear visual differentiation between idle, hover, active, focus, disabled, and loading states
- Error Prevention: Design patterns that prevent common user mistakes before they occur
- Recovery Mechanisms: Clear pathways for users to correct mistakes or change decisions
- Contextual Help: Tooltips and guidance appearing precisely when users need assistance
- Cognitive Load Reduction: Interface elements immediately understandable without learning curve

ACCESSIBILITY & INCLUSIVE DESIGN:
- Screen Reader Compatibility: Proper semantic HTML structure with ARIA labels, roles, and properties
- Keyboard Navigation: Complete functionality accessible via keyboard-only interaction with logical tab order
- Color Independence: Information conveyed through multiple visual cues beyond color alone
- Motion Sensitivity: Respectful animation implementation with prefer-reduced-motion support
- Zoom Compatibility: Maintains usability at 200% zoom levels required by accessibility standards
- High Contrast Support: Design adaptation for users requiring enhanced visual contrast

TECHNICAL IMPLEMENTATION STANDARDS:
- Performance Budget: Component loads within 200ms on 3G networks with optimized assets
- Cross-Browser Compatibility: Consistent rendering across Chrome, Firefox, Safari, Edge latest versions
- Responsive Design: Graceful scaling across device sizes from 320px mobile to 4K desktop displays
- Code Quality: Semantic HTML structure with maintainable CSS following BEM or atomic design principles
- Asset Optimization: Images compressed and served in next-generation formats (WebP, AVIF)
- Progressive Enhancement: Core functionality available regardless of JavaScript availability

MODERN DESIGN TRENDS INTEGRATION:
- Contemporary Aesthetics: Current design trends balanced with timeless usability principles
- Material Authenticity: Realistic shadows, depth, and surface treatments appropriate for platform
- Motion Design: Purposeful animations that enhance rather than distract from user tasks
- Typography Excellence: Modern font stacks with optimal readability across all devices and contexts
- Iconography: Consistent icon style with proper sizing, alignment, and semantic meaning
- Surface Treatment: Appropriate use of gradients, shadows, and textures for visual interest and depth

BUSINESS IMPACT OPTIMIZATION:
- Conversion Optimization: Design elements proven to increase user engagement and task completion
- Brand Alignment: Visual approach supporting brand identity while maintaining usability standards
- User Retention: Interface design encouraging continued use and positive user experience
- Competitive Advantage: Modern design approach distinguishing product from competitors
- Scalability Planning: Design structure supporting organizational growth and feature expansion
- Maintenance Efficiency: Design approach minimizing long-term maintenance and update costs

QUALITY ASSURANCE VALIDATION:
- Pixel Perfection: Every element precisely positioned and sized according to design specifications
- Interaction Consistency: All interactive elements behave predictably across component instances
- Error Handling: Robust performance under edge cases and unexpected user inputs
- Performance Validation: Component meets or exceeds loading and interaction performance benchmarks
- Accessibility Audit: Full compliance with WCAG 2.1 Level AA standards verified through testing
- User Testing: Design validated through usability testing with representative user groups

PROFESSIONAL DELIVERABLE STANDARDS:
- Developer Handoff: Complete implementation guidance including measurements, colors, and behaviors
- Asset Preparation: All required graphics exported in appropriate formats and resolutions
- Animation Specifications: Detailed timing, easing, and transition requirements documented
- Component Variants: All necessary states and variations clearly defined and delivered
- Documentation: Comprehensive usage guidelines and implementation best practices included
- Future Compatibility: Design approach ensuring compatibility with evolving platform requirements

This component will exemplify professional web and app development standards, creating interfaces that users intuitively understand and enjoy using while meeting all technical and accessibility requirements for modern digital products.`;
  },

  qualityEnhancements: {
    'low': 'clean UI design, suitable for quick mockups',
    'medium': 'professional UI design, polished execution',
    'high': 'pixel-perfect UI design, ultra-crisp details, premium interface quality',
    'ultra-premium': 'ultra-premium UI design, ray-traced shadows, ultra-crisp edges, maximum detail level',
    'pixel-perfect': 'pixel-perfect UI design, mathematical precision, perfect alignment, ultra-sharp edges',
    'premium': 'premium UI design, enhanced details, smooth gradients, professional polish',
    'production': 'production-ready UI design, professional quality, optimized for development handoff',
    'auto': 'automatically optimized quality for UI components'
  },

  styleModifiers: {
    'button': 'interactive element with proper states, hover effects, accessible design',
    'icon': 'clear symbolic representation, consistent line weights, universal recognition',
    'hero-image': 'impactful visual storytelling, engaging composition, brand-aligned aesthetic'
  },

  aspectRatioOptimizations: {}
};

// ===== Marketing Materials Template =====

export const MARKETING_TEMPLATE: PromptTemplate = {
  categoryId: 'marketing',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    const ctaSection = formValues.callToAction 
      ? `Call-to-Action Architecture:
Primary CTA: "${formValues.callToAction}"
- Visual Prominence: CTA button/text receives maximum visual weight using size, color, and positioning
- Psychological Triggers: Design elements tap into urgency, exclusivity, and value proposition psychology
- Action-Oriented Language: Imperative verbs creating immediate behavioral response ("Get," "Start," "Discover")
- Visual Hierarchy Support: Supporting design elements guide eye movement toward primary action
- Contrast Strategy: CTA stands out dramatically from background using complementary color relationships
- Placement Optimization: Positioned following natural reading patterns and content flow
- Secondary Actions: Supporting CTAs clearly subordinated to primary action without competing
- Mobile Optimization: Touch-friendly sizing and positioning for thumb-driven mobile interactions`
      : 'Awareness-Stage Marketing: Focus on brand recognition and value communication without direct sales pressure';
    
    // Enhanced material type handling with robust specialized prompts
    const materialTypeEnhancement = (() => {
      const materialType = formValues.materialType;
      
      switch (materialType) {
        case 'cover-letter':
          return `
COVER LETTER DESIGN EXCELLENCE FRAMEWORK:
Professional Document Architecture:
- Executive Visual Standards: C-suite quality design with sophisticated typography and layout precision
- ATS Optimization: Clean, scannable layout with proper margins and spacing for applicant tracking systems
- Industry-Specific Visual Language: Design elements reflecting the professional standards of the target industry
- Personal Brand Integration: Subtle, tasteful design elements that enhance professional identity without overwhelming content
- Contact Information Hierarchy: Strategic placement and emphasis of professional contact details for maximum accessibility
- White Space Mastery: Strategic use of negative space to create breathing room and enhance readability
- Typography Excellence: Professional font pairing with optimal character spacing and line height for extended reading

Visual Credibility Establishment:
- Trust Building Design: Visual elements that immediately communicate professionalism and competence
- Authority Markers: Subtle design cues that position the applicant as a serious, qualified candidate
- Attention to Detail: Flawless execution demonstrating the applicant's commitment to quality and precision
- Modern Professional Aesthetic: Contemporary design approach that signals up-to-date professional awareness
- Consistent Brand Language: Visual coherence that could extend across resume, portfolio, and other application materials
- Cultural Professional Awareness: Design approach appropriate for the geographic and cultural context of the target role`;

        case 'wedding-invitation':
          return `
WEDDING INVITATION DESIGN MASTERY:
Romantic Elegance Framework:
- Timeless Sophistication: Classic design elements that will remain beautiful for decades in wedding albums
- Cultural Wedding Traditions: Appropriate incorporation of traditional design elements from relevant cultural backgrounds
- Emotional Resonance: Visual approach that captures the romance, joy, and significance of the wedding celebration
- Formality Level Calibration: Design sophistication matching the wedding style (formal, casual, destination, etc.)
- Seasonal Design Integration: Colors, motifs, and styling appropriate for the wedding season and venue type
- Typography Romance: Elegant script fonts balanced with readable sans-serif for information hierarchy
- Color Palette Poetry: Harmonious color combinations that evoke the desired emotional response and aesthetic theme

Sacred Celebration Communication:
- Information Architecture: Clear, beautiful organization of ceremony details, reception information, and RSVP instructions
- Sacred Symbolism: Thoughtful incorporation of meaningful symbols, florals, or motifs significant to the couple
- Guest Experience Design: Layout and design that creates anticipation and excitement for the celebration
- Photo-Worthy Aesthetic: Design quality suitable for social media sharing and keepsake preservation
- Multi-Generational Appeal: Visual approach that resonates across different age groups attending the wedding
- Venue Harmony: Design elements that complement or hint at the wedding venue's aesthetic and atmosphere`;

        case 'birthday-invitation':
          return `
BIRTHDAY CELEBRATION DESIGN FRAMEWORK:
Age-Appropriate Visual Strategy:
- Age-Specific Design Language: Visual elements and color schemes perfectly matched to the birthday celebrant's age and interests
- Celebration Energy: Dynamic, joyful design elements that immediately communicate fun and festivity
- Theme Integration: Seamless incorporation of party themes (superheroes, princesses, milestone ages, etc.)
- Family-Friendly Appeal: Design approach that excites children while appearing tasteful to parents
- Gender-Inclusive Options: Thoughtful color and design choices that appeal broadly without reinforcing stereotypes
- Activity Hint Integration: Visual elements that subtly communicate the type of celebration and expected activities
- Memory-Making Aesthetic: Design quality that encourages guests to save the invitation as a celebration keepsake

Interactive Excitement Generation:
- Anticipation Building: Visual elements that create excitement and curiosity about the upcoming celebration
- RSVP Encouragement: Design elements that make responding feel fun and important
- Gift Guidance Integration: Tasteful incorporation of gift preferences or theme suggestions where appropriate
- Social Sharing Optimization: Design elements that look great when parents share photos on social media
- Inclusive Celebration Messaging: Visual language that welcomes all invited guests warmly and enthusiastically`;

        case 'corporate-invitation':
          return `
CORPORATE EVENT INVITATION EXCELLENCE:
Professional Event Architecture:
- Executive-Level Design Quality: Sophisticated visual approach appropriate for C-suite and senior professional audiences
- Brand Integration Mastery: Seamless incorporation of corporate branding while maintaining event-specific identity
- Industry Leadership Positioning: Design elements that reinforce the hosting organization's market position and expertise
- Value Proposition Communication: Visual hierarchy that emphasizes the event's professional benefits and networking opportunities
- Credibility Signal Integration: Subtle design elements that communicate the event's importance and exclusivity level
- Multi-Stakeholder Appeal: Design approach that resonates with diverse professional backgrounds and seniority levels
- Call-to-Action Optimization: Strategic placement and emphasis of registration, RSVP, or attendance confirmation elements

Professional Network Activation:
- Networking Value Emphasis: Design elements that highlight the caliber of attendees and networking opportunities
- Thought Leadership Communication: Visual approach that positions the event as industry-leading and intellectually valuable
- Time Investment Justification: Design quality that immediately communicates the event's worth to busy professionals
- Sponsor Integration: Tasteful incorporation of sponsor recognition without compromising design integrity
- Digital Integration Ready: Design elements optimized for both print distribution and digital sharing platforms`;

        case 'graduation-invitation':
          return `
GRADUATION CELEBRATION DESIGN FRAMEWORK:
Achievement Honor Architecture:
- Academic Excellence Recognition: Design elements that honor the graduate's educational accomplishment and hard work
- Institutional Pride Integration: Tasteful incorporation of school colors, symbols, or traditions where appropriate
- Future-Forward Optimism: Visual approach that celebrates achievement while looking toward future opportunities
- Family Pride Communication: Design elements that acknowledge the family's support and shared celebration
- Milestone Significance: Visual weight and sophistication appropriate for this major life transition moment
- Generational Appeal: Design approach that resonates with grandparents, parents, and peer groups equally
- Traditional Academic Aesthetics: Appropriate use of academic symbolism (caps, diplomas, books) without cliché

Legacy and Continuation Themes:
- Educational Journey Celebration: Visual storytelling that honors the complete educational experience
- Community Invitation: Design approach that welcomes the graduate's entire support network to celebrate
- Photo-Memory Integration: Design space and approach that accommodates graduation photos beautifully
- School Spirit Balance: Appropriate level of institutional pride without overwhelming personal achievement focus
- Professional Transition Hint: Subtle design elements that acknowledge the transition from student to professional life`;

        case 'baby-shower-invitation':
          return `
BABY SHOWER INVITATION DESIGN MASTERY:
New Life Celebration Framework:
- Gender-Neutral Excellence: Beautiful design options that work perfectly regardless of baby's gender or family preferences
- Tender Emotion Communication: Soft, nurturing visual elements that evoke the wonder and anticipation of new life
- Family Circle Expansion: Design approach that welcomes all family members and friends into the celebration
- Cultural Sensitivity Integration: Respectful incorporation of cultural traditions around birth and family
- Generational Bridge Building: Visual appeal that resonates with grandmothers, mothers, and younger guests equally
- Gift Registry Integration: Tasteful inclusion of registry information that feels helpful rather than demanding
- Mother-Honoring Focus: Design elements that center the expecting mother's comfort and celebration

Nurturing Community Invitation:
- Support Network Activation: Visual messaging that emphasizes community support for the growing family
- Celebration vs. Gift Balance: Design hierarchy that emphasizes celebration over material gift-giving
- Comfort and Joy Emphasis: Visual elements that promise a warm, comfortable, joyful celebration experience
- Memory-Making Potential: Design quality that encourages guests to save the invitation as a baby book keepsake
- Practical Information Clarity: Beautiful organization of shower details that makes attendance planning easy and stress-free`;

        case 'holiday-card':
          return `
HOLIDAY CARD DESIGN EXCELLENCE:
Seasonal Celebration Mastery:
- Cultural Holiday Sensitivity: Respectful and inclusive approach to religious and secular holiday traditions
- Timeless Holiday Aesthetics: Classic design elements that feel fresh while honoring traditional holiday beauty
- Multi-Faith Consideration: Design approaches that can celebrate winter, gratitude, or universal themes of connection
- Family Personality Reflection: Visual style that authentically represents the sending family's personality and values
- Geographic Appropriateness: Holiday imagery and themes suitable for the sender's climate and cultural context
- Intergenerational Appeal: Design approach that delights children while appearing sophisticated to adults
- Traditional-Modern Balance: Contemporary design execution of classic holiday themes and symbols

Connection and Gratitude Communication:
- Relationship Honoring: Visual approach that celebrates the sender's relationship with each recipient
- Year-End Reflection: Design elements that acknowledge the year's journey and express gratitude for connections
- Warmth and Comfort Emphasis: Visual atmosphere that communicates love, warmth, and holiday spirit
- Photo Integration Excellence: Design framework that beautifully showcases family photos when included
- Message Hierarchy: Layout that balances visual beauty with readable holiday messaging and personal notes`;

        case 'anniversary-invitation':
          return `
ANNIVERSARY CELEBRATION DESIGN FRAMEWORK:
Milestone Relationship Honor:
- Love Story Continuation: Design elements that celebrate the ongoing journey of the relationship being honored
- Generational Wisdom Celebration: Visual approach appropriate for celebrating long-term relationship success
- Community Witness Invitation: Design that invites friends and family to witness and celebrate relationship milestones
- Romantic Sophistication: Elegant design elements that honor mature love without appearing overly sentimental
- Legacy Relationship Modeling: Visual approach that positions the celebrating couple as relationship role models
- Family History Integration: Design elements that acknowledge the family and community built around the relationship
- Sacred Commitment Recognition: Visual weight and beauty appropriate for celebrating lasting commitment

Celebration Invitation Excellence:
- Multi-Generational Guest Consideration: Design appeal that works for children, adults, and elderly celebration guests
- Formal-Casual Balance: Sophistication level appropriate for the specific anniversary milestone and celebration style
- Memory Lane Integration: Visual elements that may subtly reference the couple's history and shared experiences
- Gratitude Expression: Design approach that communicates the couple's gratitude for community support over the years`;

        case 'retirement-invitation':
          return `
RETIREMENT CELEBRATION DESIGN MASTERY:
Career Achievement Honor:
- Professional Legacy Celebration: Design elements that honor decades of professional contribution and achievement
- Transition Acknowledgment: Visual approach that celebrates both career completion and future life phase anticipation
- Industry Respect Communication: Design sophistication appropriate for honoring senior professional achievements
- Wisdom and Experience Recognition: Visual elements that acknowledge the retiree's accumulated knowledge and mentorship
- Community Contribution Emphasis: Design approach that honors the retiree's impact on colleagues and community
- Next Chapter Optimism: Forward-looking design elements that celebrate upcoming adventures and opportunities
- Dignified Celebration Framework: Professional visual approach that maintains dignity while encouraging joyful celebration

Colleague and Community Invitation:
- Professional Network Activation: Design that appropriately invites work colleagues, industry contacts, and personal friends
- Cross-Generational Appeal: Visual approach that resonates with junior colleagues, peers, and senior mentors equally
- Achievement Showcase Potential: Design framework that can accommodate career highlights and accomplishment recognition
- Gratitude Expression Platform: Visual elements that communicate the retiree's appreciation for professional relationships`;

        case 'housewarming-invitation':
          return `
HOUSEWARMING INVITATION DESIGN EXCELLENCE:
New Home Celebration Framework:
- Home-as-Haven Communication: Design elements that celebrate the creation of a new family sanctuary and gathering place
- Hospitality Preview: Visual approach that hints at the warmth and welcome guests will experience in the new home
- Community Building Invitation: Design that positions the housewarming as the beginning of new neighborhood relationships
- Personal Style Reflection: Visual elements that hint at the homeowners' aesthetic and personality without overwhelming
- Practical Information Integration: Beautiful organization of address, directions, and timing details for easy navigation
- Gift Guidance Sensitivity: Tasteful approach to gift suggestions that feels helpful rather than presumptuous
- Memory-Making Potential: Design quality that encourages guests to keep the invitation as a memento of the first visit

New Beginning Celebration:
- Fresh Start Energy: Visual elements that communicate excitement about new beginnings and future possibilities
- Gratitude for Support: Design approach that acknowledges friends and family who supported the home-buying process
- Home Tour Anticipation: Visual hints that create excitement about seeing and experiencing the new living space
- Community Integration: Design elements that welcome neighbors and encourage local relationship building`;

        case 'fundraising-invitation':
          return `
FUNDRAISING EVENT INVITATION MASTERY:
Mission-Driven Design Architecture:
- Cause Communication Excellence: Visual hierarchy that immediately communicates the fundraising mission and impact potential
- Donor Respect Integration: Design sophistication that honors potential donors' intelligence and philanthropic experience
- Impact Visualization: Visual elements that help donors understand and connect emotionally with the cause's importance
- Transparency Communication: Design approach that suggests accountability and responsible use of donated funds
- Community Building Emphasis: Visual messaging that positions donors as part of a meaningful community of change-makers
- Action-Oriented Layout: Strategic design elements that guide attendees toward donation and involvement opportunities
- Hope and Solution Focus: Positive visual approach that emphasizes solutions and progress rather than just problems

Philanthropic Engagement Excellence:
- Multi-Level Donor Appeal: Design sophistication that appeals to major donors while remaining accessible to smaller contributors
- Event Value Communication: Visual elements that justify attendance investment through networking, education, or entertainment value
- Mission Authority Establishment: Design quality that communicates the organization's competence and trustworthiness
- Emotional Connection Facilitation: Visual storytelling that helps potential attendees connect personally with the cause`;

        case 'product-launch-invitation':
          return `
PRODUCT LAUNCH INVITATION DESIGN MASTERY:
Innovation Showcase Architecture:
- Product Excellence Preview: Visual elements that hint at the product's quality and innovation without full revelation
- Market Disruption Communication: Design approach that suggests the product's potential industry impact and significance
- Exclusivity and Access: Visual messaging that emphasizes the privileged nature of launch event attendance
- Brand Authority Reinforcement: Design elements that strengthen the launching company's market position and credibility
- Industry Leadership Positioning: Visual sophistication that positions the company as an industry thought leader
- Curiosity Generation: Strategic design elements that create intrigue and anticipation without revealing too much
- Media and Influencer Appeal: Design quality suitable for social media sharing and press coverage potential

Launch Event Experience Promise:
- High-Value Networking: Visual emphasis on the caliber of attendees and networking opportunities available
- First-Access Advantage: Design elements that communicate the benefits of being among the first to experience the product
- Educational Value Integration: Visual hints at the learning and insight opportunities available at the launch event
- Industry Impact Suggestion: Design approach that hints at the product's potential to change industry standards or practices`;

        case 'conference-badge':
          return `
CONFERENCE BADGE DESIGN EXCELLENCE:
Professional Identity Architecture:
- Instant Credibility Communication: Design elements that immediately establish the wearer's professional legitimacy
- Industry Authority Signaling: Visual approach that suggests the wearer's expertise and conference participation value
- Networking Facilitation: Design elements that encourage professional interaction and conversation starting
- Brand Integration Mastery: Seamless incorporation of both conference and attendee professional branding
- Hierarchy Communication: Visual design that respects different attendee levels (speakers, sponsors, general attendees)
- Readability Optimization: Typography and layout that ensures name and title visibility across networking distances
- Professional Photo Integration: Design framework that accommodates professional headshots beautifully

Conference Experience Enhancement:
- Event Navigation Support: Design elements that help attendees navigate conference logistics and programming
- Community Building Visual: Design approach that creates sense of belonging to an elite professional community
- Social Media Optimization: Visual elements that look professional and appealing in conference photos and posts
- Conversation Starter Integration: Design elements that provide natural talking points for networking interactions`;

        case 'thank-you-card':
          return `
THANK YOU CARD DESIGN MASTERY:
Gratitude Expression Excellence:
- Sincere Appreciation Communication: Visual elements that authentically convey genuine thankfulness and recognition
- Relationship Honoring: Design approach that celebrates and strengthens the relationship between sender and recipient
- Emotional Resonance: Visual warmth that makes the recipient feel truly valued and appreciated
- Personal Touch Integration: Design framework that accommodates personal messages beautifully
- Keepsake Quality: Design sophistication that encourages recipients to save the card as a meaningful memento
- Cultural Sensitivity: Visual approach that respects different cultural expressions of gratitude and appreciation
- Timeless Appeal: Classic design elements that won't appear dated when recipients rediscover the card later

Appreciation Impact Maximization:
- Memory Reinforcement: Visual elements that help recipients recall the specific reason for gratitude
- Positive Emotion Amplification: Design choices that enhance the recipient's positive feelings about the appreciated action
- Relationship Investment Communication: Visual approach that demonstrates the sender's investment in the relationship
- Future Interaction Encouragement: Design elements that strengthen the likelihood of continued positive relationship`;

        case 'save-the-date':
          return `
SAVE THE DATE DESIGN EXCELLENCE:
Event Anticipation Architecture:
- Calendar Priority Communication: Visual urgency and importance that encourages immediate calendar blocking
- Event Significance Suggestion: Design sophistication that hints at the event's importance and attendance value
- Anticipation Building: Visual elements that create excitement and curiosity about upcoming event details
- Timeline Respect: Design approach that acknowledges recipients' need for advance planning and preparation time
- Initial Impression Excellence: Design quality that sets high expectations for the actual event experience
- Information Hierarchy: Clear priority given to date, location, and basic event type while maintaining visual appeal
- Follow-Up Promise: Visual approach that suggests more detailed information will follow

Early Engagement Strategy:
- RSVP Encouragement: Design elements that make early response feel important and appreciated
- Calendar Integration: Visual design that encourages immediate addition to personal and professional calendars
- Social Sharing Optimization: Design quality that looks professional when recipients share on social media
- Event Type Communication: Visual hints about event formality, duration, and expected participation level`;

        default:
          if (materialType?.includes('invitation')) {
            return `
INVITATION DESIGN EXCELLENCE FRAMEWORK:
Special Occasion Honor:
- Event Significance Communication: Visual weight and sophistication appropriate for the specific celebration type
- Cultural Celebration Sensitivity: Respectful incorporation of traditions and customs relevant to the event
- Guest Experience Design: Layout and visual approach that creates anticipation and excitement for attendance
- Information Architecture: Clear, beautiful organization of event details that makes attendance planning effortless
- Emotional Connection: Visual elements that help recipients connect with the celebration's emotional significance
- Host Personality Reflection: Design approach that authentically represents the hosting individual or organization
- Memory Creation Potential: Design quality that encourages guests to save the invitation as an event memento

Celebration Community Building:
- Inclusive Welcome Design: Visual approach that makes all invited guests feel valued and excited to attend
- Social Sharing Readiness: Design quality suitable for social media sharing while maintaining invitation privacy
- Multi-Generational Appeal: Visual elements that resonate appropriately across different age groups attending
- Cultural Bridge Building: Design sensitivity that honors diverse backgrounds within the invited community`;
          } else if (materialType?.includes('card')) {
            return `
CARD DESIGN EXCELLENCE FRAMEWORK:
Tactile Communication Mastery:
- Physical Impact Optimization: Design elements that maximize the card's impact as a physical, held object
- Emotional Connection: Visual approach that creates immediate emotional resonance with the card's recipient
- Memorable Visual Impact: Design elements that ensure the card stands out from daily communication noise
- Brand Integration: Seamless incorporation of sender's personal or professional branding identity
- Practical Functionality: Layout optimization for the card's intended use and distribution method
- Keepsake Quality: Design sophistication that encourages recipients to save and treasure the card
- Cultural Communication Sensitivity: Visual approach that respects and appeals to recipient's cultural context`;
          }
          return '';
      }
    })();

    const industryEnhancement = formValues.industrySpecific ? `
INDUSTRY-SPECIFIC DESIGN APPROACH:
Industry Context: ${formValues.industrySpecific}
- Sector Standards: Design adhering to visual conventions and expectations for ${formValues.industrySpecific} industry
- Professional Credibility: Visual elements establishing trust and expertise within ${formValues.industrySpecific} field
- Regulatory Compliance: Design approach meeting industry-specific advertising and communication standards
- Target Professional Alignment: Visual language resonating with ${formValues.industrySpecific} decision-makers and stakeholders
- Industry Color Psychology: Colors and design elements leveraging ${formValues.industrySpecific} sector associations and preferences` : '';

    const formatEnhancement = formValues.formatSize ? `
FORMAT & SIZE OPTIMIZATION:
Output Format: ${formValues.formatSize}
- Dimensional Accuracy: Precise sizing for ${formValues.formatSize} specifications and printing requirements
- Resolution Standards: High-quality output suitable for both digital display and professional printing
- Print Production: Color management and bleed areas appropriate for ${formValues.formatSize} production
- Scalability: Design elements that maintain quality across different size variations
- Platform Optimization: Format-specific adjustments for intended use and distribution method` : '';

    return `Create a high-converting, strategically designed marketing asset that drives measurable business results and advances specific campaign objectives.

${standardFieldsSection}

MARKETING CAMPAIGN SPECIFICATIONS:
Target Audience: ${formValues.targetAudience}
Material Type: ${formValues.materialType}
Campaign Objective: ${formValues.campaignGoal}
Content Description: ${formValues.contentDescription}${materialTypeEnhancement}${industryEnhancement}${formatEnhancement}

STRATEGIC MESSAGING FRAMEWORK:
Value Proposition Communication:
- Primary Benefit: Crystal clear articulation of core customer value within first 3 seconds of viewing
- Problem-Solution Alignment: Visual storytelling connecting customer pain points to product solutions
- Competitive Advantage: Unique selling proposition communicated through distinctive design elements
- Emotional Resonance: Design triggers appropriate emotional response for ${formValues.targetAudience} demographic
- Trust Building: Visual elements establishing credibility and reducing purchase anxiety
- Urgency Creation: Strategic use of scarcity, time-sensitivity, and limited availability messaging

Audience-Specific Targeting:
- ${formValues.targetAudience} Demographics: Visual language, color psychology, and imagery aligned with target preferences
- Psychographic Alignment: Design elements resonating with target audience values, aspirations, and lifestyle
- Communication Style: Tone and visual approach appropriate for audience sophistication and familiarity level
- Cultural Sensitivity: Design elements respecting and appealing to target audience cultural context
- Generation-Specific Elements: Visual references and design trends appropriate for target age demographic

VISUAL PERSUASION ARCHITECTURE:
Attention Capture Mechanics:
- Visual Hierarchy: Clear information prioritization using size, color, contrast, and positioning
- Eye Movement Control: Strategic design elements guiding viewer attention through intended sequence
- Pattern Interruption: Unexpected visual elements breaking through advertising noise and habitual scrolling
- Cognitive Load Management: Information presented in digestible chunks preventing viewer overwhelm
- Visual Breathing Room: Strategic whitespace creating focus and preventing visual claustrophobia

Conversion-Optimized Layout:
- Above-the-Fold Strategy: Critical information visible without scrolling or additional interaction
- Progressive Information Disclosure: Details revealed in logical sequence supporting decision-making process
- Visual Flow: Seamless movement from attention capture through interest building to action taking
- Friction Reduction: Design elements removing barriers to conversion and simplifying response process
- Social Proof Integration: Testimonials, reviews, and credibility indicators strategically positioned

COLOR PSYCHOLOGY & BRAND IMPACT:
Emotional Color Strategy:
- Primary Emotion: ${formValues.campaignGoal} objective supported through scientifically-backed color psychology
- Target Demographic Response: Colors chosen for optimal response from ${formValues.targetAudience} preferences
- Cultural Color Meanings: Color selections validated across target market cultural interpretations
- Competitive Color Differentiation: Palette distinctly separate from primary competitor visual approaches
- Conversion Color Theory: Strategic use of high-converting colors (orange, red, green) for action elements

Brand Integration & Recognition:
- Brand Consistency: Seamless integration with existing brand guidelines while optimizing for conversion
- Brand Recall: Visual elements supporting long-term brand memory and recognition
- Brand Trust Transfer: Established brand equity leveraged to support new campaign objectives
- Visual Brand Extensions: Creative interpretation of brand elements without compromising recognition
- Multi-touchpoint Consistency: Design approach scalable across various marketing channels and formats

${ctaSection}

PLATFORM-SPECIFIC OPTIMIZATION:
${formValues.materialType} Best Practices:
- Format Specifications: Optimal dimensions, file sizes, and technical requirements for intended platform
- Content Consumption Patterns: Design optimized for typical ${formValues.materialType} viewing behaviors
- Platform Algorithm Optimization: Visual elements designed to maximize organic reach and engagement
- Competition Analysis: Distinctive approach within ${formValues.materialType} competitive landscape
- Performance Benchmarks: Design targeting above-average engagement metrics for format and industry

Cross-Platform Adaptability:
- Multi-Format Scalability: Core design concept adaptable across various marketing channels
- Responsive Design Elements: Components that maintain effectiveness across different device sizes
- Print-Digital Compatibility: Colors and elements that reproduce effectively across media types
- Video Animation Potential: Static elements designed for potential motion graphic adaptation
- Social Media Optimization: Elements optimized for thumbnail visibility and social sharing

CONVERSION PSYCHOLOGY IMPLEMENTATION:
Behavioral Trigger Integration:
- Scarcity Messaging: Limited availability, time-sensitive offers, or exclusive access communication
- Social Proof Display: Customer testimonials, user counts, or popularity indicators strategically placed
- Authority Building: Expert endorsements, certifications, or industry recognition prominently featured
- Reciprocity Activation: Free value, helpful information, or exclusive content offered before asking
- Commitment Consistency: Design elements encouraging small initial commitments leading to larger actions

Trust Signal Optimization:
- Credibility Indicators: Professional design quality signaling business legitimacy and reliability
- Security Messaging: Trust badges, guarantees, or risk-reversal offers reducing purchase anxiety
- Transparency Elements: Clear pricing, honest communication, and straightforward terms presentation
- Social Validation: Real customer photos, authentic testimonials, and genuine review integration
- Professional Polish: High-quality execution demonstrating business competence and attention to detail

PERFORMANCE MEASUREMENT DESIGN:
A/B Testing Considerations:
- Variable Elements: Key components designed for easy modification and testing (headlines, CTAs, images)
- Conversion Tracking: Design elements supporting clear attribution and performance measurement
- Analytics Integration: Visual components optimized for heatmap analysis and user behavior tracking
- Performance Baselines: Design targeting specific conversion rate improvements over existing materials
- Iterative Optimization: Framework allowing systematic improvement based on performance data

ROI Optimization Framework:
- Cost-Per-Acquisition Focus: Design efficiency maximizing conversion value relative to advertising spend
- Lifetime Value Consideration: Visual approach attracting high-value, long-term customer relationships
- Viral Potential: Shareable elements encouraging organic reach and word-of-mouth amplification
- Cross-Sell Integration: Design elements supporting additional product or service promotion
- Customer Journey Alignment: Visual approach appropriate for specific funnel stage and customer readiness

PRODUCTION EXCELLENCE STANDARDS:
Technical Quality Assurance:
- Print Production: CMYK color management and high-resolution output for physical materials
- Digital Optimization: RGB color space and web-optimized file sizes for online distribution
- Font Licensing: Properly licensed typography for commercial use and wide distribution
- Image Rights: Stock photography or original imagery with appropriate usage rights
- Brand Compliance: Accurate representation of logos, colors, and brand elements

Campaign Integration Requirements:
- Multi-Channel Consistency: Visual approach supporting integrated marketing campaign across touchpoints
- Campaign Scalability: Design framework enabling rapid deployment across various marketing initiatives
- Brand Evolution Support: Flexible approach allowing brand development without complete redesign
- Seasonal Adaptability: Elements allowing modification for holiday or seasonal campaign variations
- Legal Compliance: Design approach meeting advertising regulations and industry standards`;
  },

  qualityEnhancements: {
    'low': 'good marketing design, suitable for digital use',
    'medium': 'professional marketing design, clear messaging',
    'high': 'premium marketing materials, ultra-sharp print quality, exceptional design',
    'auto': 'automatically optimized quality for marketing materials'
  },

  styleModifiers: {
    'corporate': 'professional, conservative, business-appropriate, trustworthy aesthetic',
    'fun-playful': 'energetic, colorful, dynamic, engaging, approachable design',
    'elegant': 'sophisticated, refined, premium, luxurious, understated quality',
    'minimalist': 'clean, simple, uncluttered, modern, focused messaging',
    'retro': 'vintage-inspired, nostalgic, classic, timeless appeal'
  },

  aspectRatioOptimizations: {
    'cover-letter': 'US Letter format 8.5x11 inches, portrait orientation optimized for professional document standards',
    'wedding-invitation': 'Standard invitation 5x7 inches, elegant portrait format for ceremonial presentation',
    'birthday-invitation': 'Party invitation 4x6 inches, landscape or portrait optimized for celebration themes',
    'corporate-invitation': 'Business invitation 5x7 inches, professional portrait format for corporate events',
    'graduation-invitation': 'Academic invitation 5x7 inches, achievement-focused portrait presentation',
    'baby-shower-invitation': 'Celebration invitation 4x6 inches, nurturing portrait format for family events',
    'holiday-card': 'Greeting card 5x7 inches, seasonal portrait or square format for festive messaging',
    'anniversary-invitation': 'Milestone invitation 5x7 inches, elegant portrait celebrating relationship achievements',
    'retirement-invitation': 'Professional invitation 5x7 inches, dignified portrait honoring career accomplishments',
    'housewarming-invitation': 'Welcome invitation 4x6 inches, landscape format showcasing new home celebration',
    'fundraising-invitation': 'Charitable invitation 5x7 inches, mission-focused portrait for cause promotion',
    'product-launch-invitation': 'Innovation invitation 5x7 inches, dynamic portrait for product unveiling events',
    'conference-badge': 'Badge format 3.5x2.25 inches, landscape orientation for professional networking',
    'thank-you-card': 'Gratitude card 4x6 inches, portrait format for personal appreciation messages',
    'save-the-date': 'Announcement card 4x6 inches, landscape format for advance event notification',
    'standard-letter': 'US Letter 8.5x11 inches, professional document portrait orientation',
    'a4-document': 'A4 International 210x297mm, standard business document format',
    'invitation-5x7': '5x7 inches portrait, premium invitation standard dimensions',
    'invitation-4x6': '4x6 inches landscape/portrait, compact invitation format',
    'square-invitation': '5x5 inches square, modern geometric invitation layout',
    'postcard-4x6': '4x6 inches landscape, direct mail marketing dimensions',
    'greeting-card': '5x7 inches portrait, standard greeting card proportions',
    'business-card': '3.5x2 inches landscape, professional contact card format',
    'digital-social': '1080x1080 square, social media optimized dimensions',
    'digital-email': '600x800 portrait, email newsletter compatible layout',
    'large-poster': '18x24 inches portrait, large format display dimensions'
  }
};

// ===== Banners Template =====

export const BANNERS_TEMPLATE: PromptTemplate = {
  categoryId: 'banners',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Platform-specific optimization
    const platformSection = formValues.platform 
      ? `PLATFORM OPTIMIZATION FRAMEWORK:
Platform: ${formValues.platform}
- Dimensional Precision: Exact specifications for ${formValues.platform} optimal display
- Safe Zone Compliance: Critical content within platform-specific safe zones
- Technical Requirements: Format, resolution, and file size optimized for ${formValues.platform}
- Viewing Context: Design optimized for typical ${formValues.platform} user behavior patterns
- Algorithm Optimization: Visual elements designed to maximize organic reach on ${formValues.platform}
- Cross-Device Compatibility: Perfect rendering across desktop, tablet, and mobile for ${formValues.platform}`
      : '';

    // Brand consistency integration
    const brandSection = formValues.brandKit 
      ? `BRAND CONSISTENCY FRAMEWORK:
Brand Kit: ${formValues.brandKit}
- Color Palette Adherence: Strategic implementation of brand colors while optimizing for conversion
- Typography Harmony: Brand font selections maximizing readability at banner dimensions
- Logo Integration: Brand mark positioned for recognition without competing with primary message
- Style Continuity: Design approach recognizable as part of cohesive brand experience
- Brand Personality Reflection: Visual elements communicating intended brand characteristics
- Recognition Optimization: Design elements supporting brand recall across viewing contexts`
      : '';

    // Layout and grid system
    const layoutSection = formValues.layoutGrid 
      ? `PROFESSIONAL LAYOUT STRUCTURE:
Grid System: ${formValues.layoutGrid}
- Mathematical Precision: ${formValues.layoutGrid} composition framework for optimal balance
- Element Alignment: Strategic positioning following ${formValues.layoutGrid} principles
- Visual Hierarchy: Clear information prioritization using ${formValues.layoutGrid} structure
- Whitespace Strategy: Strategic negative space creating focus and preventing visual overwhelm
- Proportion Optimization: Golden ratio and rule of thirds application for aesthetic appeal
- Responsive Scaling: Layout integrity maintained across various display sizes`
      : '';

    // Message architecture
    const messageSection = formValues.primaryMessage 
      ? `CORE MESSAGE ARCHITECTURE:
Primary Message: "${formValues.primaryMessage}"
${formValues.secondaryMessage ? `Secondary Message: "${formValues.secondaryMessage}"` : ''}
${formValues.callToAction ? `Call to Action: "${formValues.callToAction}"` : ''}
- Headline Hierarchy: Primary message receives 60-70% of total visual weight
- Message Clarity: Communication clear and understandable within 2-second viewing window
- Emotional Resonance: Language and visual treatment aligned to evoke intended audience response
- Value Communication: Immediate benefit or value proposition communicated through primary messaging
- Action Orientation: Message phrasing encourages specific behavioral response from viewers
- Urgency Elements: Time-sensitive language creating appropriate pressure for immediate response`
      : '';

    // Visual style implementation
    const visualStyleSection = formValues.visualStyle 
      ? `VISUAL STYLE IMPLEMENTATION:
Style Approach: ${formValues.visualStyle}
- Aesthetic Consistency: ${formValues.visualStyle} approach maintained throughout all design elements
- Emotional Impact: Visual treatment optimized for ${formValues.visualStyle} emotional response
- Target Alignment: Style approach resonating with intended audience preferences
- Brand Harmony: Visual style supporting overall brand personality and positioning
- Competitive Differentiation: Distinctive approach providing marketplace differentiation
- Conversion Optimization: Style elements proven to increase engagement and click-through rates`
      : '';

    // Color psychology and scheme
    const colorSection = formValues.colorScheme 
      ? `COLOR PSYCHOLOGY FRAMEWORK:
Color Scheme: ${formValues.colorScheme}
- Psychological Impact: ${formValues.colorScheme} palette optimized for intended emotional response
- Conversion Optimization: Colors chosen for maximum click-through and engagement rates
- Brand Integration: Color selections supporting brand recognition and consistency
- Accessibility Compliance: Color contrast ratios meeting WCAG AA standards
- Cultural Sensitivity: Color meanings appropriate for target audience cultural context
- Platform Optimization: Color reproduction optimized for ${formValues.platform || 'digital'} display`
      : '';

    // Typography and readability
    const typographySection = formValues.typography 
      ? `TYPOGRAPHY EXCELLENCE:
Typography Style: ${formValues.typography}
- Readability Optimization: Font selections maximizing legibility at banner dimensions
- Hierarchy Implementation: Clear typographic hierarchy supporting information prioritization
- Brand Consistency: Typography aligned with brand guidelines and personality
- Cross-Platform Compatibility: Font rendering optimized across all viewing contexts
- Accessibility Standards: Text sizing and contrast meeting accessibility requirements
- Conversion Impact: Typography choices proven to increase engagement and response rates`
      : '';

    // Technical specifications
    const technicalSection = formValues.technicalSpecs 
      ? `TECHNICAL SPECIFICATIONS:
Output Format: ${formValues.technicalSpecs.outputFormat || 'auto'}
Resolution: ${formValues.technicalSpecs.resolution || 'auto'} DPI
Color Space: ${formValues.technicalSpecs.colorSpace || 'auto'}
Compression: ${formValues.technicalSpecs.compression || 85}% quality
- Format Optimization: File type chosen for optimal balance of quality, size, and compatibility
- Resolution Standards: DPI settings optimized for intended display context
- Color Management: Color space selection ensuring accurate reproduction
- Compression Balance: Quality preservation while meeting file size requirements
- Loading Optimization: Image compression optimized for sub-2-second loading
- Cross-Device Compatibility: Perfect rendering across desktop, tablet, and mobile`
      : '';

    // Accessibility features
    const accessibilitySection = formValues.accessibilityFeatures 
      ? `ACCESSIBILITY COMPLIANCE:
Features: ${Array.isArray(formValues.accessibilityFeatures) ? formValues.accessibilityFeatures.join(', ') : formValues.accessibilityFeatures}
- High Contrast: WCAG AA compliant contrast ratios for optimal readability
- Large Text: Minimum font sizes ensuring readability for all users
- Colorblind Friendly: Color combinations accessible to users with color vision deficiencies
- Screen Reader Optimization: Design elements supporting assistive technology
- Motion Sensitivity: Minimal animation respecting motion sensitivity preferences
- Universal Design: Inclusive approach ensuring accessibility for all users`
      : '';

    // Optimization goals
    const optimizationSection = formValues.optimizationGoals 
      ? `OPTIMIZATION OBJECTIVES:
Goals: ${Array.isArray(formValues.optimizationGoals) ? formValues.optimizationGoals.join(', ') : formValues.optimizationGoals}
- Performance Metrics: Design optimized for specific measurable outcomes
- Conversion Focus: Visual elements proven to increase desired user actions
- Engagement Optimization: Design approach maximizing user interaction and interest
- Brand Awareness: Visual elements supporting brand recognition and recall
- Technical Performance: Optimization for loading speed and cross-platform compatibility
- ROI Maximization: Design efficiency maximizing results relative to campaign investment`
      : '';

    return `Create a professional, high-performance banner that combines strategic design principles with platform-specific optimization to achieve maximum impact and measurable results.

${standardFieldsSection}

BANNER SPECIFICATIONS:
Content Type: ${formValues.contentType || 'Professional Banner'}
${platformSection}
${brandSection}
${layoutSection}

STRATEGIC DESIGN FRAMEWORK:
${messageSection}
${visualStyleSection}
${colorSection}
${typographySection}

PROFESSIONAL EXECUTION STANDARDS:
${technicalSection}
${accessibilitySection}
${optimizationSection}

ATTENTION-CAPTURE ARCHITECTURE:
Visual Impact Framework:
- Scroll-Stopping Power: Design elements creating immediate pattern interruption in user browsing behavior
- Peripheral Vision Activation: Colors and shapes designed to capture attention even when banner is not primary focus
- Cognitive Load Optimization: Information density balanced to inform without overwhelming viewer processing capacity
- Visual Noise Penetration: Design approach cutting through typical digital advertising clutter and distraction
- Eye Movement Direction: Strategic visual elements guiding attention flow toward most important information
- Contrast Maximization: Strategic use of color, size, and positioning contrasts for maximum visual impact

Engagement Psychology Implementation:
- Curiosity Generation: Visual elements creating information gaps that encourage click-through behavior
- Emotional Trigger Activation: Design elements tapping into core emotional drivers for target audience
- Social Proof Integration: Trust signals and credibility indicators reducing friction to engagement
- Urgency Communication: Visual elements suggesting time-sensitivity or limited availability
- Value Proposition Clarity: Immediate benefit communication within first second of banner visibility
- Pain Point Recognition: Visual storytelling connecting with audience problems and desired solutions

CONVERSION-OPTIMIZED DESIGN STRUCTURE:
Layout & Information Hierarchy:
- Primary Element Dominance: Most important content (offer, CTA) receives 50%+ of total visual attention
- Supporting Element Balance: Secondary information supports without competing with primary message
- Visual Flow Control: Eye movement guided through logical sequence from attention to action
- Whitespace Strategy: Strategic negative space creating focus and preventing visual overwhelm
- Grid System Precision: Mathematical alignment creating subconscious sense of quality and trustworthiness
- Mobile-First Considerations: Design optimized for mobile viewing patterns and thumb-based interaction

Call-to-Action Optimization:
- CTA Visual Prominence: Action button or text clearly distinguishable as most important interactive element
- Color Psychology Application: CTA colors chosen for maximum conversion impact
- Size and Positioning: CTA sized for optimal interaction and positioned following natural reading patterns
- Action Language: Imperative verbs creating immediate behavioral response
- Friction Reduction: CTA design suggesting easy, low-commitment interaction requiring minimal effort
- Urgency Integration: Visual elements around CTA suggesting time-sensitivity or limited availability

QUALITY ASSURANCE FRAMEWORK:
Professional Standards:
- Dimensional Accuracy: Precise sizing for platform specifications and printing requirements
- Resolution Excellence: High-quality output suitable for both digital display and professional printing
- Color Accuracy: Color management ensuring consistent reproduction across viewing contexts
- Typography Precision: Font rendering optimized for clarity and readability at all sizes
- File Optimization: Balanced compression maintaining quality while meeting size requirements
- Cross-Platform Testing: Design validated across multiple devices and viewing contexts

Brand Compliance Validation:
- Logo Usage: Brand mark implementation following established guidelines
- Color Consistency: Brand color implementation maintaining recognition and consistency
- Typography Alignment: Font selections supporting brand personality and readability
- Style Continuity: Design approach recognizable as part of cohesive brand experience
- Message Alignment: Content and tone consistent with brand voice and positioning
- Recognition Optimization: Design elements supporting brand recall and differentiation

PERFORMANCE OPTIMIZATION:
Campaign Effectiveness:
- A/B Testing Framework: Key components designed for systematic testing and optimization
- Performance Baselines: Design targeting specific improvement over existing performance metrics
- Conversion Tracking: Visual elements supporting clear attribution and measurement
- Audience Segmentation: Design approach adaptable for different audience segments
- ROI Maximization: Design efficiency maximizing results relative to campaign investment
- Cross-Campaign Synergy: Visual approach supporting broader marketing objectives

Technical Performance:
- Loading Speed: Image compression optimized for sub-2-second loading across connection types
- Quality Maintenance: Visual clarity preserved across all compression levels and display densities
- Format Selection: File type chosen for optimal balance of quality, size, and compatibility
- Scalability Preservation: Design integrity maintained across various display sizes and resolutions
- Animation Optimization: If animated, movement optimized for attention without distraction
- Cross-Device Compatibility: Perfect rendering across desktop, tablet, and mobile viewing contexts

FINAL VALIDATION CHECKLIST:
✓ Platform specifications met exactly
✓ Brand guidelines followed consistently
✓ Accessibility standards implemented
✓ Technical requirements satisfied
✓ Optimization goals addressed
✓ Professional quality standards achieved
✓ Conversion elements optimized
✓ Performance metrics trackable

Create a banner that not only looks professional but delivers measurable business results through strategic design implementation.`;
  },

  qualityEnhancements: {
    'low': 'good banner design, suitable for web display',
    'medium': 'professional banner with enhanced visual impact and brand consistency',
    'high': 'premium banner with advanced optimization, accessibility compliance, and conversion-focused design',
    'auto': 'platform-optimized banner with intelligent quality and format selection'
  },

  styleModifiers: {
    'minimalist-clean': 'clean, uncluttered design with strategic whitespace',
    'bold-dynamic': 'high-impact, energetic style with strong visual contrast',
    'elegant-sophisticated': 'refined, premium aesthetic with sophisticated typography',
    'playful-creative': 'fun, engaging approach with creative visual elements',
    'professional-corporate': 'business-focused design with corporate credibility',
    'modern-tech': 'contemporary, digital aesthetic with cutting-edge appeal',
    'warm-friendly': 'approachable, welcoming style with human connection',
    'luxury-premium': 'high-end, exclusive feel with premium positioning'
  },

  aspectRatioOptimizations: {
    'facebook-cover': 'horizontal banner optimized for Facebook cover photo dimensions (2.63:1)',
    'linkedin-banner': 'professional banner optimized for LinkedIn header dimensions (4:1)',
    'twitter-header': 'social media banner optimized for Twitter header dimensions (3:1)',
    'instagram-story': 'vertical banner optimized for Instagram story dimensions (9:16)',
    'youtube-banner': 'widescreen banner optimized for YouTube channel art (16:9)',
    'website-header': 'web banner optimized for website header dimensions (4.8:1)',
    'blog-header': 'blog banner optimized for article header dimensions (1.91:1)',
    'email-header': 'email banner optimized for newsletter header dimensions (3:1)',
    'display-leaderboard': 'display ad optimized for leaderboard dimensions (8.09:1)',
    'display-rectangle': 'display ad optimized for medium rectangle dimensions (1.2:1)',
    'print-banner': 'print banner optimized for A4 landscape dimensions (1.41:1)'
  }
};

// ===== Data Visualization Template =====

export const DATA_VIZ_TEMPLATE: PromptTemplate = {
  categoryId: 'data-viz',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Handle time series data completeness
    let timeSeriesSection = '';
    if (formValues.timeSeriesType && ['line-chart', 'bar-chart', 'area-chart', 'timeline'].includes(formValues.chartType)) {
      const timeSeriesMap: Record<string, string> = {
        'daily': 'all days in the specified range',
        'weekly': 'all weeks in the specified range',
        'monthly': 'all 12 months (January through December)',
        'quarterly': 'all 4 quarters (Q1, Q2, Q3, Q4)',
        'yearly': 'all years in the specified range',
        'custom': 'all specified time intervals'
      };
      
      const dataCompletenessMap: Record<string, string> = {
        'complete': 'Show all time periods with complete data',
        'fill-zeros': 'Fill any missing data points with zeros to maintain time series integrity',
        'interpolate': 'Use statistical interpolation to estimate missing values based on surrounding data points',
        'skip-missing': 'Skip missing data points but maintain correct time scale',
        'highlight-missing': 'Highlight gaps where data is missing to maintain analytical integrity'
      };
      
      timeSeriesSection = `
TIME SERIES INTEGRITY:
- Time Period Type: ${formValues.timeSeriesType} (${timeSeriesMap[formValues.timeSeriesType] || 'all time periods'})
- Data Range: ${formValues.dataRange || 'Full available range'}
- Data Completeness Strategy: ${dataCompletenessMap[formValues.dataCompleteness] || 'Ensure all time periods are represented'}
- Missing Data Handling: ${formValues.dataCompleteness === 'interpolate' ? 'Use appropriate statistical methods to estimate missing values' : (formValues.dataCompleteness === 'highlight-missing' ? 'Visually indicate missing data points' : 'Maintain time series continuity')}
- Time Scale Accuracy: Ensure time intervals are proportionally represented
- Sequential Integrity: All ${formValues.timeSeriesType} periods must be included in sequence
- Zero Value Distinction: Clearly differentiate between zero values and missing data
- Pattern Preservation: Maintain trend visibility even with sparse data points`;
    }
    
    // Handle analysis goal
    let analysisGoalSection = '';
    if (formValues.analysisGoal) {
      const analysisGoalMap: Record<string, string> = {
        'trend': `
Trend Analysis Optimization:
- Direction Clarity: Clear visual indication of upward, downward, or stable trends
- Rate of Change: Visual emphasis on acceleration or deceleration of trends
- Seasonality Identification: Patterns of cyclical variation clearly visible
- Anomaly Highlighting: Unusual data points or outliers appropriately emphasized
- Trend Line Integration: Statistical trend lines overlaid to reinforce pattern recognition
- Forecast Extension: Optional projection of trends with appropriate confidence indicators
- Historical Context: Sufficient historical data to establish meaningful trend context
- Comparative Trending: Multiple trend lines clearly distinguishable when comparing series`,
        
        'comparison': `
Comparison Optimization:
- Side-by-Side Clarity: Direct visual comparison between categories or time periods
- Proportional Accuracy: Visual representations precisely scaled to data values
- Ranking Clarity: Clear visual hierarchy between compared elements
- Benchmark Indicators: Reference lines or markers for important comparison thresholds
- Percentage Differences: Relative differences clearly communicated alongside absolute values
- Category Distinction: Clear visual differentiation between comparison categories
- Comparison Grouping: Logical organization of compared elements to facilitate analysis
- Normalized Scales: Appropriate scaling to enable fair comparison between disparate values`,
        
        'composition': `
Composition Analysis Optimization:
- Part-to-Whole Clarity: Clear visual relationship between components and total
- Proportional Accuracy: Area/size precisely corresponding to data values
- Hierarchy Visualization: Important components visually emphasized
- Nested Relationships: Multi-level hierarchical relationships clearly structured
- Percentage Labeling: Clear indication of each component's percentage contribution
- Logical Ordering: Components arranged to maximize analytical insight
- Small Value Handling: Appropriate treatment of very small segments to maintain visibility
- Structural Integrity: Composition elements visually connected to reinforce relationship`,
        
        'distribution': `
Distribution Analysis Optimization:
- Range Visibility: Full data distribution range clearly represented
- Central Tendency: Mean, median, and mode appropriately highlighted
- Outlier Identification: Unusual values clearly visible but not distorting overall view
- Spread Indicators: Standard deviation or variance visually represented
- Density Mapping: Concentration of values appropriately visualized
- Skew Representation: Asymmetry in distribution accurately depicted
- Multi-Modal Clarity: Multiple peaks or clusters clearly distinguished
- Statistical Annotations: Key distribution statistics integrated into visualization`,
        
        'correlation': `
Correlation Analysis Optimization:
- Relationship Clarity: Visual representation of connection strength between variables
- Direction Indication: Positive or negative correlation clearly communicated
- Causation Distinction: Visual cues to avoid implying causation from correlation
- Outlier Impact: Unusual data points identified with their effect on correlation
- Trend Line Integration: Regression or best-fit lines with appropriate statistical indicators
- Correlation Coefficient: R-value or similar metrics integrated into visualization
- Multi-Variable Relationships: Complex relationships between 3+ variables clearly mapped
- Non-Linear Patterns: Curved relationships accurately represented without distortion`,
        
        'ranking': `
Ranking Optimization:
- Order Clarity: Clear visual hierarchy from highest to lowest values
- Magnitude Representation: Value differences accurately reflected in visual elements
- Category Labeling: Each ranked item clearly identified
- Value Annotation: Precise values displayed alongside ranked elements
- Threshold Indicators: Important cutoff points or benchmark levels highlighted
- Grouping Strategy: Logical clustering of ranked items when appropriate
- Rank Change: Historical rank changes indicated when time comparison is relevant
- Top/Bottom Emphasis: Special visual treatment for highest/lowest ranked items`
      };
      
      analysisGoalSection = analysisGoalMap[formValues.analysisGoal] || '';
    }
    
    // Handle key insights
    const insightsSection = formValues.keyInsights 
      ? `Data Story Architecture:
Key Insights: ${formValues.keyInsights}
- Narrative Flow: Data progression tells compelling story leading to specific business conclusions
- Insight Highlighting: Most important findings receive visual emphasis through color, size, and positioning
- Pattern Recognition: Visual elements help viewers quickly identify trends, outliers, and correlations
- Actionable Intelligence: Data presentation enables immediate decision-making and strategic planning
- Comparative Analysis: Design facilitates easy comparison between data points and categories
- Trend Communication: Time-based or sequential data reveals clear directional insights
- Threshold Indicators: Important benchmarks, goals, or limits clearly marked and contextually explained`
      : 'Exploratory Visualization: Open-ended data presentation encouraging user discovery and analysis';
    
    // Handle enhanced visual styling
    let visualStylingSection = '';
    if (formValues.visualStyle || formValues.aspectRatio || formValues.dataQualityIndicators || formValues.animationStyle) {
      const visualStyleMap: Record<string, string> = {
        'modern': 'Clean, minimalist design with contemporary aesthetics',
        'classic': 'Traditional chart styling with timeless appeal',
        'elegant': 'Sophisticated, refined appearance with premium feel',
        'bold': 'High-contrast, impactful design for maximum visibility',
        'soft': 'Gentle, muted styling with subtle visual elements',
        'technical': 'Precise, analytical appearance for technical audiences',
        'creative': 'Artistic, expressive design with unique visual flair',
        'minimal': 'Ultra-clean, simplified styling with essential elements only'
      };
      
      const aspectRatioMap: Record<string, string> = {
        'auto': 'Automatically optimized for chart type and content',
        '16:9': 'Widescreen format ideal for presentations and displays',
        '4:3': 'Traditional balanced format suitable for most uses',
        '1:1': 'Square format perfect for social media and mobile',
        '3:2': 'Photo-like proportions for natural visual appeal',
        '21:9': 'Ultra-wide format excellent for dashboards and analytics',
        '9:16': 'Vertical format optimized for mobile viewing'
      };
      
      const dataQualityMap: Record<string, string> = {
        'none': 'No quality indicators - clean, uncluttered appearance',
        'basic': 'Simple confidence indicators for estimated data points',
        'detailed': 'Comprehensive quality metrics with visual differentiation',
        'advanced': 'Full statistical confidence analysis with error bars and uncertainty bands'
      };
      
      const animationStyleMap: Record<string, string> = {
        'none': 'Static chart with no animations for immediate clarity',
        'subtle': 'Gentle fade-in effects that don\'t distract from data',
        'smooth': 'Smooth transitions and reveals that enhance understanding',
        'dynamic': 'Engaging, interactive animations that guide attention',
        'sequential': 'Data points appear in sequence to tell a story'
      };
      
      visualStylingSection = `
ENHANCED VISUAL STYLING:
- Visual Style: ${formValues.visualStyle || 'modern'} (${visualStyleMap[formValues.visualStyle] || 'Modern clean design'})
- Aspect Ratio: ${formValues.aspectRatio || 'auto'} (${aspectRatioMap[formValues.aspectRatio] || 'Automatically optimized'})
- Data Quality Indicators: ${formValues.dataQualityIndicators || 'none'} (${dataQualityMap[formValues.dataQualityIndicators] || 'No quality indicators'})
- Animation Style: ${formValues.animationStyle || 'none'} (${animationStyleMap[formValues.animationStyle] || 'Static presentation'})
- Color Palette Enhancement: Apply ${formValues.colorPalette || 'corporate-blue'} with intelligent color selection
- Accessibility Considerations: Ensure sufficient contrast and colorblind-friendly design
- Professional Polish: Apply advanced styling techniques for publication-quality output
- Responsive Design: Optimize for various display sizes and contexts`;
    }

    return `Create an executive-quality data visualization that transforms complex information into immediately actionable business intelligence and strategic insights.

${standardFieldsSection}

DATA VISUALIZATION SPECIFICATIONS:
Chart Type: ${formValues.chartType}
Data Domain: ${formValues.dataTopic}
Visualization Title: ${formValues.chartTitle || 'Auto-generated appropriate title'}
Analysis Purpose: ${formValues.analysisGoal || 'General data visualization'}

SMART DATA PROCESSING DIRECTIVES:
- Complete Data Coverage: Ensure ALL data points are represented, with no missing elements
- Time Series Integrity: For time-based data, include ALL time periods (no skipping months/quarters)
- Value Validation: Verify data ranges are logical and consistent
- Outlier Handling: Identify and appropriately represent unusual values without distortion
- Scale Optimization: Select axis ranges that best represent the data without misleading
- Zero Baseline: Include zero in value axis when appropriate for accurate proportion representation
- Consistent Units: Maintain uniform measurement units across all data points
- Data Density: Balance between showing sufficient detail and avoiding visual overload
- Automatic Correction: If data appears incomplete, intelligently fill gaps with appropriate methods

${timeSeriesSection}

${analysisGoalSection}

${visualStylingSection}

INFORMATION ARCHITECTURE FRAMEWORK:
Data Hierarchy & Structure:
- Primary Data Emphasis: Most important metrics receive 60-70% of visual attention through size and prominence
- Supporting Context: Secondary data provides necessary background without overwhelming primary insights
- Information Layering: Progressive disclosure allowing viewers to move from overview to detail on demand
- Cognitive Load Management: Information density optimized for quick comprehension without mental fatigue
- Visual Scanning Optimization: Layout designed for natural eye movement patterns in analytical review
- Data Relationships: Clear visual connections between related data points and categories

Analytical Clarity Framework:
- Zero-Ambiguity Principle: Every visual element has clear, unambiguous meaning and purpose
- Immediate Comprehension: Key insights understandable within 5-second initial viewing
- Error Prevention: Design prevents misinterpretation through clear labeling and appropriate scaling
- Context Provision: Sufficient background information for informed decision-making
- Precision Communication: Exact values accessible while maintaining overall pattern visibility
- Confidence Indicators: Data quality, sample sizes, and uncertainty appropriately communicated

${analysisGoalSection}

${insightsSection}

EXECUTIVE PRESENTATION EXCELLENCE:
Professional Visual Standards:
- C-Suite Quality: Presentation sophistication appropriate for executive boardroom presentation
- Strategic Focus: Visualization directly supports business strategy and decision-making requirements
- Authority Building: Design quality suggesting analytical competence and attention to detail
- Cross-Functional Communication: Visual approach accessible to both technical and non-technical stakeholders
- Decision Support: Clear recommendations or implications evident from data presentation
- Time Efficiency: Busy executives can extract key insights within minimal viewing time

Business Intelligence Integration:
- KPI Alignment: Visualization directly connects to organizational key performance indicators
- Benchmarking Context: Performance compared against industry standards, historical data, or goals
- Trend Analysis: Clear identification of upward, downward, or cyclical patterns in business metrics
- Opportunity Identification: Visual elements highlighting areas for improvement or investment
- Risk Communication: Potential problems or concerning trends clearly identified and contextualized
- ROI Demonstration: Financial impact or business value of insights clearly communicated

COLOR PSYCHOLOGY & DATA COMMUNICATION:
Strategic Color Application:
- Semantic Consistency: Colors follow established business conventions (green=positive, red=negative, blue=neutral)
- Brand Integration: Corporate colors strategically implemented without compromising data readability
- Accessibility Compliance: Color schemes usable by individuals with various forms of color vision deficiency
- Cultural Sensitivity: Color meanings appropriate for international business context and diverse audiences
- Hierarchy Support: Color intensity and saturation supporting information priority and importance levels
- Pattern Recognition: Color choices facilitating quick identification of data categories and relationships

Visual Differentiation Strategy:
- Category Distinction: Clear visual separation between different data series, departments, or time periods
- Performance Indicators: Immediate visual feedback on whether metrics are meeting, exceeding, or missing targets
- Attention Direction: Strategic use of accent colors guiding viewer focus to most important insights
- Data Quality Signaling: Visual indicators for estimated, projected, or uncertain data points
- Interactive Elements: Clear visual cues for clickable or explorable chart components
- Comparative Analysis: Color schemes supporting easy comparison between multiple datasets or scenarios

TECHNICAL EXCELLENCE & SCALABILITY:
Chart Construction Precision:
- Mathematical Accuracy: All scales, proportions, and calculations verified for statistical correctness
- Aspect Ratio Optimization: Chart dimensions chosen for optimal data representation and pattern visibility
- Scale Selection: Appropriate axis ranges avoiding visual distortion or misleading impressions
- Grid Systems: Subtle reference lines supporting accurate value reading without visual clutter
- Label Positioning: Text placement optimized for readability without overlapping or crowding
- Legend Design: Clear, comprehensive explanations positioned for easy reference during analysis

Production-Ready Technical Standards:
- Multi-Format Export: Charts deliverable in PowerPoint, PDF, PNG, SVG formats for various presentation needs
- Resolution Independence: Vector-based design ensuring crisp appearance across all display sizes and print formats
- Animation Readiness: Static design structured to support potential motion graphics or interactive features
- Data Update Capability: Template structure allowing easy refresh with new or updated datasets
- Cross-Platform Compatibility: Consistent appearance across Windows, Mac, and mobile viewing environments
- Print Optimization: Colors and sizing appropriate for high-quality print reproduction

ANALYTICAL METHODOLOGY SUPPORT:
Statistical Visualization Best Practices:
- Appropriate Chart Selection: Visual format perfectly matched to data type and analytical question
- Distribution Representation: Clear communication of data spread, central tendency, and outliers
- Correlation Illustration: Relationship strength and direction immediately apparent from visual design
- Trend Line Integration: Statistical trend analysis visually incorporated where analytically appropriate
- Confidence Intervals: Uncertainty ranges clearly communicated through appropriate visual techniques
- Sample Size Context: Data reliability indicated through visual design elements and annotations

Business Context Integration:
- Industry Benchmarking: Performance metrics compared against relevant industry standards and competitors
- Historical Context: Current performance positioned within appropriate historical timeframes
- Seasonal Adjustments: Time-based data accounting for cyclical business patterns and seasonal variations
- Geographic Considerations: Location-based data presented with appropriate regional context and comparisons
- Market Conditions: External factors affecting data interpretation visually integrated or annotated
- Predictive Elements: Forward-looking trends or projections clearly distinguished from historical data

STAKEHOLDER COMMUNICATION OPTIMIZATION:
${formValues.dataTopic} Domain Expertise:
- Industry-Specific Conventions: Visualization approach following established ${formValues.dataTopic} analytical traditions
- Technical Accuracy: Domain-specific terminology and measurement standards correctly implemented
- Regulatory Compliance: Chart design meeting any relevant industry reporting or disclosure requirements
- Professional Standards: Visualization quality appropriate for external reporting and stakeholder communication
- Audit Trail Support: Design approach supporting data verification and analytical review processes

Cross-Functional Accessibility:
- Executive Summary: Key insights immediately apparent to time-constrained leadership audiences
- Technical Detail: Sufficient precision for analysts and specialists requiring detailed examination
- Financial Translation: Business implications and financial impact clearly communicated
- Operational Relevance: Insights directly applicable to day-to-day business operations and planning
- Strategic Alignment: Visualization supporting long-term organizational goals and strategic initiatives

DATA COMPLETENESS VALIDATION:
- Missing Value Detection: Intelligent identification of gaps in data series
- Consistency Verification: Check for logical consistency across all data points
- Range Validation: Confirm all expected values within specified range are present
- Time Series Completeness: For time data, verify all expected periods are represented
- Automatic Correction: Apply appropriate methods to handle missing or inconsistent data
- Quality Indicators: Visually differentiate between actual and estimated/interpolated values
- Data Source Transparency: Clear indication of data provenance and collection methodology
- Confidence Metrics: Visual indication of data reliability and statistical significance

FINAL ANALYTICAL VALIDATION:
Quality Assurance Framework:
- Data Integrity: All numerical representations verified for accuracy and appropriate statistical treatment
- Visual Clarity: Chart elements tested for comprehension across diverse professional audiences
- Business Relevance: Insights directly applicable to organizational decision-making and strategy development
- Professional Standards: Visualization quality meeting or exceeding industry analytical reporting expectations
- Actionable Intelligence: Clear pathway from data presentation to business action and implementation`;
  },

  qualityEnhancements: {
    'low': 'good chart quality, suitable for quick analysis',
    'medium': 'professional chart illustration, clear data representation',
    'high': 'premium data visualization, ultra-crisp details, exceptional presentation quality',
    'auto': 'automatically optimized quality for data visualization'
  },

  styleModifiers: {
    'professional-clean': 'clean, professional design with corporate styling, subtle grid lines, and business-appropriate colors',
    'modern-gradient': 'contemporary design with smooth color gradients, rounded elements, and modern typography',
    'minimalist': 'minimal design with essential elements only, maximum white space, and restrained color palette',
    'colorful-vibrant': 'bold, vibrant colors with high contrast and energetic visual elements',
    'dark-theme': 'sophisticated dark background with light elements, dramatic contrast, and glowing accents',
    'hand-drawn': 'artistic hand-drawn style with sketch-like elements, organic lines, and textured appearance',
    'isometric-3d': 'three-dimensional perspective with isometric projection, depth, and dimensional elements',
    'flat-design': 'flat visual style with no shadows or gradients, solid colors, and geometric shapes'
  },

  aspectRatioOptimizations: {
    'bar-chart': '4:3 landscape for horizontal bars, 3:4 portrait for vertical bars',
    'line-chart': '16:9 landscape for optimal trend visibility',
    'pie-chart': '1:1 square for optimal proportional representation',
    'donut-chart': '1:1 square with centered key metrics',
    'area-chart': '16:9 landscape for volume trend visualization',
    'scatter-plot': '1:1 square for equal axis representation',
    'heatmap': 'variable based on data dimensions',
    'treemap': '4:3 landscape for hierarchical representation',
    'funnel-chart': '3:4 portrait for conversion flow',
    'gauge-meter': '4:3 landscape with focal center',
    'dashboard': '16:9 landscape for multiple chart integration',
    'infographic': 'variable based on content flow and narrative',
    'comparison': '4:3 landscape for side-by-side comparison',
    'timeline': '16:9 landscape for chronological flow'
  }
};

// ===== Illustrations Template =====

export const ILLUSTRATIONS_TEMPLATE: PromptTemplate = {
  categoryId: 'illustrations',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Purpose and usage context integration
    const purposeSection = formValues.illustrationPurpose 
      ? `Illustration Purpose Framework:
Primary Use Case: ${formValues.illustrationPurpose}
- Communication Objective: Visual elements specifically designed to support ${formValues.illustrationPurpose} messaging and audience engagement
- Context Optimization: Illustration style and content calibrated for ${formValues.illustrationPurpose} viewing environment and usage requirements
- Audience Alignment: Visual approach tailored to ${formValues.illustrationPurpose} target audience sophistication and cultural expectations
- Message Amplification: Artistic elements reinforcing ${formValues.illustrationPurpose} key themes and communication objectives
- Brand Integration: Illustration seamlessly supporting ${formValues.illustrationPurpose} brand identity and marketing goals
- Impact Maximization: Visual design optimized for maximum effectiveness in ${formValues.illustrationPurpose} application context`
      : 'Versatile Illustration Design: Artwork optimized for multiple usage contexts and communication purposes';

    // Target audience integration
    const audienceSection = formValues.targetAudience 
      ? `Target Audience Optimization:
Intended Viewers: ${formValues.targetAudience}
- Cultural Sensitivity: Visual elements appropriate for ${formValues.targetAudience} cultural background and expectations
- Age Appropriateness: Illustration style and content calibrated for ${formValues.targetAudience} demographic preferences
- Sophistication Level: Artistic complexity and messaging depth aligned with ${formValues.targetAudience} intellectual engagement
- Emotional Resonance: Visual approach designed to create meaningful connection with ${formValues.targetAudience} values and interests
- Accessibility Considerations: Illustration ensuring inclusivity and comprehension across ${formValues.targetAudience} diverse needs
- Engagement Strategy: Visual elements encouraging ${formValues.targetAudience} interaction and positive response`
      : 'Universal Appeal Design: Illustration crafted for broad audience engagement and cross-demographic effectiveness';

    // Dimensions and format integration
    const dimensionsSection = formValues.illustrationDimensions 
      ? `Technical Specifications Framework:
Output Dimensions: ${formValues.illustrationDimensions}
- Resolution Optimization: Illustration quality calibrated for ${formValues.illustrationDimensions} display requirements and viewing distance
- Aspect Ratio Mastery: Composition design maximizing visual impact within ${formValues.illustrationDimensions} proportional constraints
- Scale Flexibility: Illustration elements maintaining clarity and impact across various size applications from ${formValues.illustrationDimensions}
- Print Readiness: Technical specifications ensuring excellent reproduction quality for ${formValues.illustrationDimensions} print applications
- Digital Excellence: File preparation optimized for ${formValues.illustrationDimensions} digital display and web usage requirements
- Future Scalability: Design approach allowing effective resizing and format adaptation beyond ${formValues.illustrationDimensions} specifications`
      : 'Adaptive Format Design: Illustration optimized for flexible sizing and multiple output format requirements';

    // Specific requirements integration
    const requirementsSection = formValues.specificRequirements 
      ? `Custom Requirements Implementation:
Special Specifications: ${formValues.specificRequirements}
- Technical Compliance: Illustration meeting all specified ${formValues.specificRequirements} technical and creative constraints
- Creative Integration: Artistic approach seamlessly incorporating ${formValues.specificRequirements} while maintaining visual excellence
- Quality Assurance: Design validation ensuring ${formValues.specificRequirements} are met without compromising artistic integrity
- Professional Standards: Implementation of ${formValues.specificRequirements} following industry best practices and creative excellence
- Client Satisfaction: Illustration approach exceeding ${formValues.specificRequirements} expectations through superior artistic execution
- Innovation Opportunity: Creative interpretation of ${formValues.specificRequirements} adding unique value and artistic distinction`
      : 'Creative Freedom Approach: Illustration design optimized for maximum artistic impact and creative expression';
    
    const moodSection = formValues.mood 
      ? `Atmospheric Design Framework:
Emotional Tone: ${formValues.mood}
- Psychological Impact: Visual elements specifically chosen to evoke ${formValues.mood} emotional response in viewers
- Color Temperature: Warm/cool balance strategically selected to reinforce intended atmospheric feeling
- Lighting Drama: Shadow play and illumination creating emotional depth and supporting ${formValues.mood} ambiance
- Compositional Energy: Visual rhythm and movement aligned with ${formValues.mood} emotional characteristics
- Textural Atmosphere: Surface qualities and material representations enhancing intended emotional experience
- Symbolic Elements: Objects, colors, and forms carrying cultural and psychological meaning appropriate to ${formValues.mood}
- Narrative Resonance: Visual storytelling elements supporting and amplifying intended emotional message`
      : 'Neutral Emotional Tone: Balanced approach allowing viewer interpretation and emotional projection';
    
    const colorSection = formValues.colorPreference 
      ? `Color Psychology Architecture:
Dominant Palette: ${formValues.colorPreference}
- Harmonic Relationships: Color combinations following scientific color theory for maximum visual impact
- Emotional Associations: ${formValues.colorPreference} specifically chosen for psychological and cultural resonance
- Saturation Strategy: Intensity levels calibrated for intended viewing context and emotional response
- Contrast Management: Light/dark relationships creating depth, focus, and visual hierarchy
- Cultural Sensitivity: Color meanings validated across diverse audience interpretation and cultural context
- Brand Integration: Colors supporting any associated brand identity while maintaining artistic integrity
- Accessibility Considerations: Color combinations readable across various forms of color vision deficiency`
      : 'Open Color Exploration: Intuitive color selection based on subject matter and artistic vision';
    
    return `Create a masterpiece-quality artistic illustration that transcends mere visual representation to become compelling artistic storytelling with emotional depth and technical excellence.

${standardFieldsSection}

${purposeSection}

${audienceSection}

${dimensionsSection}

${requirementsSection}

ARTISTIC VISION SPECIFICATIONS:
Subject Matter: ${formValues.subject}
Artistic Style: ${formValues.illustrationStyle}
Creative Direction: ${formValues.creativeDirection}
Intended Application: ${formValues.usageContext}

COMPOSITIONAL MASTERY FRAMEWORK:
Visual Storytelling Architecture:
- Narrative Focus: Central subject positioned and rendered to immediately communicate intended story or message
- Supporting Elements: Secondary visual components enhancing rather than competing with primary narrative
- Emotional Journey: Viewer's eye guided through composition in sequence that builds emotional impact
- Symbolic Integration: Meaningful objects, colors, and forms supporting deeper interpretation and engagement
- Cultural Resonance: Visual references appropriate for intended audience while avoiding stereotypical representations
- Universal Appeal: Artistic approach transcending specific cultural boundaries while maintaining authentic character

Advanced Compositional Techniques:
- Rule of Thirds Mastery: Strategic placement creating natural visual balance and viewer engagement
- Golden Ratio Integration: Mathematical harmony underlying composition for subconscious aesthetic appeal
- Dynamic Symmetry: Asymmetrical balance creating visual interest while maintaining compositional stability
- Depth Layering: Foreground, midground, background relationships creating immersive three-dimensional space
- Visual Weight Distribution: Elements balanced through size, color, texture, and positioning for optimal viewing experience
- Focal Point Hierarchy: Clear primary, secondary, and tertiary areas of interest guiding viewer attention flow

${moodSection}

ARTISTIC TECHNIQUE EXCELLENCE:
${formValues.illustrationStyle} Style Mastery:
- Authentic Technique: Faithful representation of ${formValues.illustrationStyle} artistic traditions and methods
- Contemporary Relevance: Modern interpretation ensuring timeless appeal while honoring style heritage
- Technical Precision: Expert-level execution of style-specific techniques and artistic approaches
- Material Authenticity: Digital rendering convincingly mimicking traditional artistic media and textures
- Historical Accuracy: Style elements consistent with artistic movement origins while allowing creative innovation
- Personal Interpretation: Unique artistic voice within established style parameters

Professional Artistic Standards:
- Brushwork Excellence: Every stroke, line, and mark contributing to overall artistic impact and visual quality
- Texture Mastery: Surface qualities creating tactile visual experience and material authenticity
- Edge Quality: Strategic use of hard, soft, and lost edges creating depth and visual interest
- Value Structure: Light and shadow relationships creating form, drama, and atmospheric perspective
- Color Temperature Modulation: Warm and cool color relationships creating spatial depth and emotional impact
- Paint Handling: Digital technique demonstrating understanding of traditional artistic material properties

${colorSection}

EMOTIONAL IMPACT OPTIMIZATION:
Psychological Design Elements:
- Viewer Connection: Visual elements encouraging emotional investment and personal interpretation
- Memory Triggers: Imagery tapping into universal human experiences and emotional associations
- Aspiration Activation: Visual elements connecting with viewer goals, dreams, and desired experiences
- Empathy Generation: Character expressions and body language creating emotional resonance with audience
- Curiosity Stimulation: Visual mysteries and incomplete information encouraging extended viewing and interpretation
- Comfort Creation: Familiar visual elements balanced with novel approaches for optimal viewer engagement

Narrative Depth Implementation:
- Subtext Communication: Visual storytelling operating on multiple interpretive levels for sustained interest
- Symbolic Layering: Objects and visual elements carrying multiple meanings and interpretive possibilities
- Emotional Arc: Visual progression through composition creating complete emotional experience
- Character Development: Subject representation suggesting personality, history, and emotional state
- Environmental Storytelling: Background and setting elements contributing to overall narrative impact
- Temporal Suggestion: Visual elements implying past events or future possibilities

TECHNICAL ARTISTIC MASTERY:
Digital Artistry Excellence:
- Resolution Superiority: Ultra-high definition rendering suitable for large-scale printing and detailed examination
- Brush Authenticity: Digital tool usage mimicking traditional artistic media with convincing material properties
- Layer Management: Professional digital technique ensuring non-destructive editing and artistic flexibility
- Color Accuracy: Professional color space management ensuring consistent reproduction across various media
- Print Optimization: Technical specifications supporting high-quality reproduction in books, posters, and gallery prints
- Archive Quality: File preparation ensuring long-term preservation and future reproduction capability

Professional Production Standards:
- Commercial Viability: Artistic quality appropriate for professional illustration, publishing, and gallery exhibition
- Licensing Readiness: Artwork prepared for various commercial and editorial usage scenarios
- Format Versatility: Digital file structure supporting multiple output formats and usage requirements
- Scalability Maintenance: Vector-influenced approach ensuring quality preservation across size variations
- Cross-Platform Compatibility: Color and technical specifications ensuring consistent appearance across devices
- Industry Standards: Technical execution meeting or exceeding professional illustration industry expectations

ARTISTIC INNOVATION & ORIGINALITY:
Creative Interpretation Framework:
- Subject Reinvention: Fresh perspective on familiar subjects avoiding clichéd or predictable approaches
- Style Evolution: Personal artistic development within established style traditions
- Technical Innovation: Creative use of digital tools expanding traditional artistic possibilities
- Cultural Bridge-Building: Artistic approach connecting diverse cultural perspectives and experiences
- Contemporary Relevance: Artistic voice addressing current themes while maintaining timeless appeal
- Audience Expansion: Visual approach accessible to diverse viewers while maintaining artistic integrity

Professional Artistic Positioning:
- Gallery Quality: Artistic sophistication appropriate for fine art exhibition and collector interest
- Editorial Excellence: Illustration quality suitable for prestigious publications and professional commissioning
- Brand Integration: Artistic approach supporting commercial applications without compromising creative integrity
- Educational Value: Visual content suitable for textbooks, museums, and educational material development
- Cultural Contribution: Artistic work contributing positively to broader cultural conversation and artistic development

FINAL ARTISTIC VALIDATION:
Masterpiece Quality Assurance:
- Artistic Impact: Visual work creating lasting impression and emotional resonance with viewers
- Technical Excellence: Every aspect of execution demonstrating professional artistic competence and attention to detail
- Creative Originality: Unique artistic vision distinguishing work from contemporary illustration trends
- Cultural Sensitivity: Respectful and appropriate representation of subjects and cultural elements
- Timeless Appeal: Artistic approach ensuring relevance and appreciation across extended time periods
- Professional Credibility: Work quality enhancing artist reputation and supporting career advancement in competitive illustration market`;
  },

  qualityEnhancements: {
    'low': 'good illustration quality, suitable for concepts',
    'medium': 'professional illustration quality, artistic execution',
    'high': 'premium artistic illustration, exceptional detail, masterful technique',
    'auto': 'automatically optimized quality for illustrations'
  },

  styleModifiers: {
    'realistic': 'photorealistic detail, accurate proportions, lifelike rendering',
    'cartoon': 'playful character design, expressive features, animated style',
    'line-art': 'clean line work, minimal color, elegant simplicity',
    'watercolor': 'soft brushstrokes, organic textures, artistic flow',
    'digital-art': 'modern digital techniques, crisp details, contemporary aesthetic',
    'vintage': 'classic illustration style, nostalgic elements, timeless appeal',
    'comic-book': 'bold outlines, dynamic composition, graphic novel aesthetic',
    'architectural': 'technical precision, structural detail, professional drafting',
    'nature': 'organic forms, natural textures, environmental accuracy',
    'abstract': 'conceptual representation, artistic interpretation, creative expression',
    'warm-cozy': 'comfortable lighting, inviting atmosphere, homey feeling, soft warmth',
    'dramatic': 'high contrast lighting, powerful composition, emotional intensity',
    'ethereal': 'mystical lighting, otherworldly atmosphere, dreamy quality, magical elements'
  },

  aspectRatioOptimizations: {}
};

// ===== Product Mockups Template =====

export const PRODUCT_MOCKUPS_TEMPLATE: PromptTemplate = {
  categoryId: 'product-mockups',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Design upload integration
    const designUploadSection = formValues.designUpload 
      ? `User Design Integration Framework:
Provided Design Asset: ${formValues.designUpload}
- Design Preservation: Maintain exact user design integrity while optimizing placement and presentation for mockup effectiveness
- Brand Consistency: Ensure design treatment aligns with existing brand guidelines and product identity standards
- Scale Optimization: Design sizing that maintains recognition while supporting product visibility and professional balance
- Application Realism: Design placement following natural product usage patterns and realistic application methods
- Quality Enhancement: Design reproduction optimized for both print and digital mockup presentation maintaining crisp appearance
- Context Integration: User design seamlessly incorporated into product environment and usage scenario`
      : 'Original Design Creation: Develop compelling design that perfectly complements product mockup and brand objectives';

    // Brand elements integration
    const brandElementsSection = formValues.brandElements 
      ? `Brand Identity Implementation:
Brand Elements: ${formValues.brandElements}
- Consistent Application: ${formValues.brandElements} strategically integrated throughout mockup maintaining brand recognition
- Professional Standards: Brand element treatment following established corporate identity guidelines and market expectations
- Product Harmony: Brand elements complementing product design without overwhelming primary product presentation
- Market Positioning: Brand application reinforcing intended market positioning and customer perception goals
- Cross-Platform Consistency: Brand treatment suitable for various marketing channels and product presentation contexts
- Quality Assurance: Brand element reproduction maintaining clarity and impact across different mockup applications`
      : 'Brand-Neutral Approach: Product mockup optimized for versatile brand application and customization flexibility';

    // Usage context integration
    const usageContextSection = formValues.usageContext 
      ? `Application Context Framework:
Primary Usage: ${formValues.usageContext}
- Context Authenticity: Mockup scenario accurately representing ${formValues.usageContext} real-world application and user experience
- Audience Relevance: Visual approach tailored to ${formValues.usageContext} target customer demographic and lifestyle
- Message Amplification: Mockup elements reinforcing ${formValues.usageContext} key benefits and product value proposition
- Emotional Connection: Scene design creating meaningful connection with ${formValues.usageContext} intended user experience
- Purchase Motivation: Mockup presentation encouraging customer desire and purchase intent for ${formValues.usageContext} application
- Market Differentiation: Unique presentation approach distinguishing product from competitors in ${formValues.usageContext} market`
      : 'Versatile Application Design: Mockup optimized for multiple usage contexts and market applications';
    
    const settingSection = formValues.setting 
      ? `Environmental Context Architecture:
Scene Setting: ${formValues.setting}
- Atmospheric Integration: Product seamlessly integrated into ${formValues.setting} environment with natural, believable placement
- Lifestyle Context: Setting communicates intended product usage and target customer lifestyle authentically
- Spatial Relationships: Product positioning within environment follows natural physics and believable usage patterns
- Supporting Elements: Props and environmental details enhance product story without competing for attention
- Lighting Harmony: Illumination consistent with environment while optimizing product visibility and appeal
- Cultural Authenticity: Setting details appropriate for target market demographics and cultural context
- Seasonal Appropriateness: Environmental elements aligned with current season or marketing campaign timing`
      : 'Studio Environment: Clean, professional studio setting focusing entirely on product excellence and clarity';
    
    const angleSection = formValues.angle 
      ? `Photographic Perspective Framework:
Viewing Angle: ${formValues.angle}
- Hero Shot Optimization: ${formValues.angle} perspective chosen to showcase product's most compelling features and benefits
- Functional Clarity: Product orientation clearly communicates primary usage and key differentiating features
- Dimensional Communication: Three-dimensional form effectively conveyed through strategic ${formValues.angle} positioning
- Brand Personality Reflection: Camera angle supporting intended brand positioning and product personality characteristics
- User Experience Simulation: Perspective matching typical customer interaction and usage viewpoint
- Competitive Differentiation: Unique photographic approach distinguishing product from standard industry presentation`
      : 'Optimal Angle Selection: Camera positioning chosen for maximum product appeal and feature communication';
    
    return `Create a commercial-grade product mockup that transforms ordinary product presentation into compelling, sales-driving visual storytelling with professional photography excellence.

${standardFieldsSection}

${designUploadSection}

${brandElementsSection}

${usageContextSection}

PRODUCT PRESENTATION SPECIFICATIONS:
Product Category: ${formValues.productType}
Marketing Context: ${formValues.marketingGoal}
Brand Positioning: ${formValues.brandPosition}
Target Customer: ${formValues.targetMarket}

COMMERCIAL PHOTOGRAPHY MASTERY:
Visual Storytelling Framework:
- Product Hero Status: Primary product positioned as unquestionable focal point commanding immediate attention and interest
- Feature Communication: Key product benefits and differentiators visually apparent within first 3 seconds of viewing
- Emotional Connection: Visual elements tapping into target customer aspirations, needs, and desired lifestyle outcomes
- Usage Demonstration: Product positioning suggesting natural, effortless integration into customer daily life
- Quality Perception: Every visual element reinforcing premium quality perception and justifying price positioning
- Brand Narrative: Photography supporting broader brand story and positioning within competitive marketplace

Advanced Commercial Composition:
- Hero Product Prominence: Primary product receives 70-80% of visual attention through size, lighting, and positioning
- Supporting Cast Direction: Secondary products or props enhance rather than compete with primary product presentation
- Negative Space Strategy: Strategic emptiness creating breathing room and focusing attention on product excellence
- Visual Weight Distribution: Compositional balance creating subconscious sense of quality and professional presentation
- Eye Movement Choreography: Visual elements guiding viewer attention through intended sequence maximizing product appeal
- Scale Communication: Product size clearly communicated through environmental context or strategic prop inclusion

${settingSection}

${angleSection}

PHOTOGRAPHIC EXCELLENCE STANDARDS:
Professional Lighting Architecture:
- Key Light Mastery: Primary illumination sculpting product form while revealing texture and material quality details
- Fill Light Balance: Shadow management ensuring detail visibility without flattening three-dimensional product form
- Rim Light Definition: Edge lighting separating product from background while creating premium quality perception
- Color Temperature Harmony: Lighting color consistency supporting brand identity while optimizing product color accuracy
- Shadow Play: Strategic shadow usage creating depth, drama, and visual interest without obscuring important features
- Reflection Management: Surface reflections controlled for optimal product presentation and material communication

Material Representation Excellence:
- Texture Authenticity: Surface qualities rendered with tactile realism encouraging viewer desire to touch and experience
- Material Honesty: Accurate representation of metal, plastic, fabric, glass, and other materials without misleading enhancement
- Finish Communication: Matte, glossy, brushed, textured, and other surface treatments clearly differentiated and authentic
- Color Accuracy: Product colors reproduced with scientific precision ensuring customer expectation alignment
- Detail Preservation: Fine product details visible and clearly communicated across all viewing sizes and contexts
- Quality Indicators: Visual elements suggesting superior manufacturing, attention to detail, and premium materials

MARKETING PSYCHOLOGY INTEGRATION:
Purchase Decision Optimization:
- Desire Generation: Visual elements creating immediate emotional response and purchase consideration
- Trust Building: Photography quality suggesting business competence and product reliability
- Value Communication: Visual presentation justifying price point and positioning against competitive alternatives
- Urgency Creation: Environmental context or styling suggesting desirability and potential scarcity
- Social Proof Integration: Context suggesting product popularity and social acceptance among target demographic
- Risk Reduction: Clear, honest product representation reducing purchase anxiety and return likelihood

Brand Equity Enhancement:
- Premium Positioning: Photography sophistication elevating perceived product and brand value
- Lifestyle Aspiration: Visual context connecting product ownership with desired lifestyle and social status
- Quality Assurance: Professional presentation suggesting attention to detail and manufacturing excellence
- Innovation Communication: Modern, progressive photography suggesting forward-thinking brand approach
- Customer Empathy: Visual approach demonstrating understanding of customer needs, preferences, and aspirations

TECHNICAL PRODUCTION MASTERY:
Commercial Photography Standards:
- Resolution Superiority: Ultra-high definition capture suitable for large-scale advertising and detailed examination
- Color Space Management: Professional color workflow ensuring consistent reproduction across print and digital media
- Focus Precision: Critical sharpness on essential product features with strategic depth of field usage
- Exposure Excellence: Perfect tonal range capturing detail in both highlights and shadows without loss
- Noise Elimination: Clean, grain-free imagery appropriate for large-scale reproduction and professional usage
- Lens Distortion Correction: Geometric accuracy ensuring product proportions appear natural and undistorted

Multi-Platform Optimization:
- E-commerce Excellence: Photography optimized for online shopping platforms and mobile device viewing
- Print Advertisement Quality: Color and resolution specifications supporting high-quality magazine and billboard reproduction
- Social Media Adaptation: Visual approach scalable for Instagram, Facebook, and other social platform requirements
- Package Design Integration: Photography suitable for product packaging and point-of-sale marketing materials
- Video Frame Readiness: Static imagery structured for potential motion graphics and video marketing adaptation

COMPETITIVE MARKET POSITIONING:
Industry Differentiation Strategy:
- Category Leadership: Photography approach suggesting market leadership and innovation within product category
- Competitive Analysis: Visual strategy distinctly separate from primary competitor presentation approaches
- Trend Integration: Contemporary photography trends appropriately incorporated without sacrificing timeless appeal
- Brand Distinctive Voice: Photography style immediately recognizable as brand-specific and ownable
- Market Evolution: Visual approach suggesting brand progression and evolution within established category

Customer Acquisition Optimization:
- Target Demographic Appeal: Photography specifically calibrated for intended customer age, income, and lifestyle preferences
- Cross-Demographic Accessibility: Visual approach appealing to diverse customer segments without alienating core audience
- Purchase Funnel Support: Photography appropriate for awareness, consideration, and purchase decision stages
- Retention Marketing: Visual consistency supporting customer loyalty and repeat purchase behavior
- Referral Generation: Photography quality encouraging social sharing and word-of-mouth marketing

FINAL COMMERCIAL VALIDATION:
Sales Performance Optimization:
- Conversion Rate Enhancement: Photography proven to increase purchase consideration and transaction completion
- Return Rate Reduction: Accurate, honest product representation reducing customer disappointment and returns
- Brand Loyalty Building: Visual quality creating positive brand associations and encouraging repeat business
- Premium Price Support: Photography sophistication justifying higher price points and margins
- Market Expansion: Visual approach suitable for new customer acquisition and market segment penetration
- Long-term Brand Building: Photography investment supporting sustained brand equity development and market position advancement`;
  },

  qualityEnhancements: {
    'low': 'good product mockup, suitable for concepts',
    'medium': 'professional product mockup, realistic presentation',
    'high': 'premium commercial mockup, ultra-realistic details, exceptional photography quality',
    'auto': 'automatically optimized quality for product mockups'
  },

  styleModifiers: {
    'plain-studio': 'clean studio background, professional product photography setup',
    'in-use': 'lifestyle photography, product in real-world context, natural usage',
    'flat-lay': 'overhead perspective, styled flat lay composition, design-focused'
  },

  aspectRatioOptimizations: {}
};

// ===== Company Letterhead Template =====

export const LETTERHEAD_TEMPLATE: PromptTemplate = {
  categoryId: 'letterhead',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    // Logo integration section
    const logoSection = formValues.logoUpload 
      ? `Existing Logo Integration Framework:
User-Provided Logo: ${formValues.logoUpload}
- Logo Preservation: Maintain exact logo integrity while optimizing placement and sizing for letterhead hierarchy
- Brand Consistency: Ensure logo treatment aligns with existing brand guidelines and corporate identity standards
- Scale Optimization: Logo sizing that maintains recognition while supporting document readability and professional balance
- Position Strategy: Logo placement maximizing brand recognition while creating elegant document flow and information hierarchy
- Color Harmony: Logo colors integrated seamlessly with overall letterhead color palette and design approach
- Quality Enhancement: Logo reproduction optimized for both print and digital use maintaining crisp, professional appearance
- Brand Authority: Logo positioning reinforcing corporate credibility and market leadership perception`
      : 'Logo Creation Opportunity: Design original logo mark that perfectly complements letterhead design and corporate identity goals';

    // Content and purpose integration
    const contentPurposeSection = formValues.documentPurpose 
      ? `Document Purpose Optimization:
Primary Use Case: ${formValues.documentPurpose}
- Communication Context: Design elements specifically calibrated for ${formValues.documentPurpose} effectiveness and professional impact
- Reader Expectations: Layout and visual hierarchy aligned with ${formValues.documentPurpose} audience sophistication and requirements
- Information Priority: Design emphasis supporting ${formValues.documentPurpose} key messaging and communication objectives
- Professional Tone: Visual approach reinforcing ${formValues.documentPurpose} appropriate level of formality and business relationship
- Action Orientation: Design elements encouraging desired reader response and engagement with ${formValues.documentPurpose} content
- Relationship Building: Visual framework supporting long-term business relationship development through ${formValues.documentPurpose} communications`
      : 'Versatile Communication Design: Letterhead optimized for various business communication purposes and professional contexts';

    // Letter content integration
    const letterContentSection = formValues.letterContent 
      ? `Content Integration Strategy:
Letter Content Preview: "${formValues.letterContent}"
- Content Hierarchy: Letterhead design creating optimal visual flow supporting content readability and message comprehension
- Message Amplification: Header design elements reinforcing letter content themes and business communication objectives
- Reading Experience: Typography and spacing optimized for comfortable consumption of provided content length and complexity
- Professional Context: Letterhead sophistication level appropriate for content tone and business relationship formality
- Visual Balance: Header-to-content ratio ensuring letterhead presence without overwhelming primary message delivery
- Signature Space: Document layout accommodating content length while providing appropriate signature and closing areas`
      : 'Content-Ready Layout: Flexible design accommodating various letter lengths and business communication requirements';

    // Brand colors integration
    const brandColorsSection = formValues.brandColors 
      ? `Corporate Color Implementation:
Brand Color Palette: ${formValues.brandColors}
- Color Psychology: Strategic application of ${formValues.brandColors} reinforcing intended corporate personality and market positioning
- Professional Balance: Color intensity and application ensuring business document appropriateness and readability standards
- Print Optimization: Color specifications ensuring accurate reproduction across various printing methods and paper stocks
- Digital Consistency: Color values maintaining brand integrity across electronic document distribution and screen displays
- Accessibility Compliance: Color contrast ratios meeting professional standards and ensuring universal document accessibility
- Competitive Differentiation: Color application creating distinctive corporate identity while maintaining professional market acceptance
- Brand Equity Building: Consistent color implementation supporting long-term brand recognition and corporate identity development`
      : 'Strategic Color Selection: Professional color palette chosen to enhance corporate credibility and document effectiveness';

    // Industry-specific enhancements
    const industrySection = formValues.industry 
      ? `Industry-Specific Design Framework:
Business Sector: ${formValues.industry}
- Professional Standards: Design approach following established ${formValues.industry} industry conventions and expectations
- Regulatory Compliance: Visual elements and information presentation meeting any sector-specific legal requirements
- Competitive Positioning: Design sophistication appropriate for ${formValues.industry} market leadership and professional standing
- Client Expectations: Visual approach aligned with ${formValues.industry} customer sophistication and business relationship expectations
- Cultural Sensitivity: Design elements appropriate for ${formValues.industry} international business context and cultural considerations
- Trust Building: Visual elements reinforcing ${formValues.industry} professional competence and reliability perception`
      : 'Universal Business Appeal: Design approach suitable for cross-industry professional communication and business development';

    // Contact details integration
    const contactSection = formValues.contactDetails 
      ? `Corporate Contact Architecture:
Contact Information: ${formValues.contactDetails}
- Information Hierarchy: Contact details organized by importance and frequency of use in business correspondence
- Readability Optimization: Font sizes and spacing ensuring contact information remains legible in printed and digital formats
- Professional Formatting: Address, phone, email, and web information formatted following business correspondence standards
- International Standards: Contact presentation appropriate for global business communication and cultural expectations
- Accessibility Compliance: Contact information readable across various vision capabilities and assistive technologies
- Legal Requirements: Corporate registration details and required business disclosures appropriately integrated
- Brand Integration: Contact presentation seamlessly incorporated within overall letterhead design framework`
      : 'Minimal Contact Approach: Essential contact information strategically placed without overwhelming design elegance';
    
    // Enhanced compliance and technical specifications
    const complianceSection = formValues.complianceRequirements 
      ? `REGULATORY COMPLIANCE FRAMEWORK:
Compliance Standards: ${Array.isArray(formValues.complianceRequirements) ? formValues.complianceRequirements.join(', ') : formValues.complianceRequirements}
- Regulatory Adherence: Document design meeting all specified compliance requirements and industry standards
- Legal Documentation: Visual elements supporting legal validity and regulatory acceptance
- Audit Trail Support: Design elements facilitating document verification and compliance auditing
- International Standards: Compliance with global business regulations and cross-border requirements
- Security Classifications: Visual treatment appropriate for specified document security levels
- Retention Compliance: Design supporting specified document retention and archival requirements`
      : 'Standard Business Compliance: Professional document design meeting general business communication standards';

    const technicalSpecsSection = formValues.technicalSpecifications 
      ? `TECHNICAL EXCELLENCE SPECIFICATIONS:
Technical Level: ${formValues.technicalSpecifications}
Resolution Requirements: ${formValues.resolutionRequirements || 'Professional Standard'}
Color Space: ${formValues.colorSpaceManagement || 'Professional RGB/CMYK'}
- Print Production Ready: ${formValues.technicalSpecifications === 'print-production' ? 'Full bleed, trim marks, and production specifications' : 'Standard business printing specifications'}
- Quality Assurance: ${formValues.qualityAssurance ? Array.isArray(formValues.qualityAssurance) ? formValues.qualityAssurance.join(', ') : formValues.qualityAssurance : 'Professional quality standards'}
- File Optimization: ${formValues.fileOptimization ? Array.isArray(formValues.fileOptimization) ? formValues.fileOptimization.join(', ') : formValues.fileOptimization : 'Standard business file formats'}
- Accessibility Standards: ${formValues.accessibilityCompliance ? Array.isArray(formValues.accessibilityCompliance) ? formValues.accessibilityCompliance.join(', ') : formValues.accessibilityCompliance : 'Professional accessibility guidelines'}`
      : 'Professional Technical Standards: High-quality business document specifications';

    const brandIntegrationSection = formValues.brandIdentityLevel 
      ? `ADVANCED BRAND INTEGRATION:
Brand Integration Level: ${formValues.brandIdentityLevel}
Brand Typography: ${formValues.brandTypography || 'Professional Standard'}
Brand Personality: ${formValues.brandPersonality ? Array.isArray(formValues.brandPersonality) ? formValues.brandPersonality.join(', ') : formValues.brandPersonality : 'Professional Corporate'}
- Style Guide Compliance: ${formValues.brandStyleGuide ? 'Strict adherence to uploaded brand guidelines' : 'Professional brand consistency standards'}
- Multi-Brand Support: ${formValues.multiBrandSupport ? 'Coordinated multi-brand presentation' : 'Single brand focus'}
- Brand Asset Integration: ${formValues.brandAssets ? 'Custom brand assets seamlessly integrated' : 'Standard brand element integration'}
- Brand Compliance: ${formValues.brandCompliance || 'Professional brand guideline adherence'}`
      : 'Standard Brand Integration: Professional brand identity implementation';

    const documentStructureSection = formValues.documentStructure 
      ? `DOCUMENT STRUCTURE ARCHITECTURE:
Layout Structure: ${formValues.documentStructure}
Typography Hierarchy: ${formValues.typographyHierarchy || 'Corporate Standard'}
Grid System: ${formValues.gridSystem || 'Professional Grid'}
Margin Specifications: ${formValues.marginSpecifications || 'Standard Business'}
- Header/Footer Elements: ${formValues.headerFooterOptions ? Array.isArray(formValues.headerFooterOptions) ? formValues.headerFooterOptions.join(', ') : formValues.headerFooterOptions : 'Professional standard elements'}
- Watermark Integration: ${formValues.watermarkOptions || 'Clean professional design'}
- Custom Specifications: ${formValues.customGridSpecs || formValues.customMargins || formValues.customTypographyHierarchy || 'Standard professional specifications'}`
      : 'Professional Document Structure: Standard business document layout and organization';

    const internationalSupportSection = formValues.internationalSupport 
      ? `INTERNATIONAL BUSINESS FRAMEWORK:
International Features: ${Array.isArray(formValues.internationalSupport) ? formValues.internationalSupport.join(', ') : formValues.internationalSupport}
- Multi-Language Support: Advanced typography and layout supporting international business communication
- Cultural Sensitivity: Design elements appropriate for global business contexts and cultural considerations
- Regional Compliance: International legal and regulatory requirements integration
- Cross-Border Standards: Professional presentation meeting international business expectations
- Currency and Date Formats: International formatting standards for global business operations
- Time Zone Considerations: International business communication timing and scheduling support`
      : 'Global Business Ready: Professional design suitable for international business communication';

    return `Design an executive-quality corporate letterhead that elevates business correspondence to reflect organizational excellence and professional authority.

${standardFieldsSection}

CORPORATE COMMUNICATION SPECIFICATIONS:
Company Identity: ${formValues.companyName}
Business Sector: ${formValues.industry}
Document Type: ${formValues.documentType}
Document Purpose: ${formValues.documentPurpose}
Security Classification: ${formValues.securityClassification || 'Professional Standard'}

${logoSection}

${contentPurposeSection}

${letterContentSection}

${brandColorsSection}

${complianceSection}

${technicalSpecsSection}

${brandIntegrationSection}

${documentStructureSection}

${internationalSupportSection}

EXECUTIVE PRESENCE FRAMEWORK:
Professional Authority Architecture:
- Institutional Credibility: Design elements suggesting organizational stability, competence, and market leadership
- Executive Communication: Visual sophistication appropriate for C-suite correspondence and high-stakes business communication
- Client Confidence Building: Design quality reinforcing client trust and confidence in business relationship and outcomes
- Partnership Positioning: Visual approach suggesting valuable business partnership rather than vendor-client dynamic
- Market Leadership: Design sophistication indicating industry leadership and innovation capability
- Global Business Readiness: Professional presentation suitable for international business development and communication

Corporate Identity Excellence:
- Brand Equity Maximization: Letterhead design leveraging and enhancing existing brand recognition and market position
- Logo Integration Mastery: Primary brand mark positioned for maximum recognition while supporting overall design harmony
- Typography Authority: Font selections reflecting corporate personality while ensuring professional communication standards
- Color Psychology Application: Corporate colors strategically implemented to reinforce brand values and professional positioning
- Visual Hierarchy Precision: Information organization following business communication best practices and reader expectations
- Whitespace Strategy: Strategic negative space creating elegance and focus while preventing visual overwhelm

${industrySection}

BUSINESS COMMUNICATION OPTIMIZATION:
Correspondence Functionality Excellence:
- Reading Experience: Layout and typography optimized for comfortable, efficient business document review
- Information Scanning: Design elements supporting quick information location and document processing
- Professional Context: Visual framework supporting serious business discussions and formal communication requirements
- Signature Integration: Document design accommodating various signature styles and personal identification approaches
- Attachment Coordination: Letterhead design complementing business cards, envelopes, and other corporate stationery
- Digital Adaptation: Design approach ensuring effectiveness in both printed and digital communication formats

Multi-Format Versatility:
- Print Excellence: Specifications optimized for high-quality offset printing and professional copy reproduction
- Digital PDF Compatibility: Design elements maintaining impact and legibility in electronic document distribution
- Fax Transmission: Design approach ensuring clarity and professionalism even through outdated communication methods
- Email Integration: Header design suitable for digital stationery and electronic business communication
- Scan Resilience: Visual elements maintaining clarity and impact when documents are scanned or photographed
- Archive Quality: Design specifications supporting long-term document storage and historical business record maintenance

${contactSection}

DESIGN EXCELLENCE STANDARDS:
Typography Mastery:
- Corporate Font Selection: Typefaces reflecting organizational personality while ensuring universal readability and professional appeal
- Hierarchy Communication: Clear information prioritization through strategic font sizing, weight, and positioning
- Legibility Optimization: Character spacing and line height calibrated for optimal reading experience across all document sizes
- Brand Voice Reflection: Typography selections supporting intended corporate personality and market positioning
- Cross-Platform Consistency: Font choices ensuring consistent appearance across various computers, printers, and viewing devices
- International Compatibility: Character set support for global business communication and diverse customer bases

Visual System Architecture:
- Grid Foundation: Mathematical precision underlying layout creating subconscious sense of organization and quality
- Proportional Relationships: Golden ratio and other harmonic proportions creating inherently pleasing visual experience
- Color Application Strategy: Corporate colors used strategically for maximum impact without overwhelming document functionality
- Texture Integration: Subtle textural elements adding visual interest and tactile appeal without compromising professionalism
- Icon Implementation: Simple, elegant graphic elements supporting brand recognition and visual interest
- Border Treatment: Frame elements enhancing document distinction while maintaining contemporary design approach

BUSINESS IMPACT OPTIMIZATION:
Professional Relationship Building:
- First Impression Excellence: Letterhead design creating immediate positive perception of organizational competence and attention to detail
- Client Retention Support: Professional presentation reinforcing client confidence and supporting long-term business relationships
- New Business Development: Design sophistication opening doors to higher-value clients and strategic business partnerships
- Employee Pride: Corporate identity supporting staff confidence and pride in organizational affiliation
- Vendor Relationships: Professional presentation earning respect and preferred treatment from business service providers
- Industry Recognition: Design quality supporting award nominations and professional recognition within business community

ROI and Business Value:
- Premium Positioning: Letterhead design supporting higher pricing and premium market positioning
- Competitive Advantage: Professional presentation differentiating organization from competitors and alternatives
- Brand Equity Building: Consistent professional presentation building long-term brand recognition and market value
- Cost Efficiency: Design approach minimizing printing costs while maximizing professional impact and effectiveness
- Scalability Planning: Template structure supporting organizational growth and expanded communication needs
- Legal Protection: Professional presentation supporting intellectual property protection and trademark development

PRODUCTION EXCELLENCE STANDARDS:
Print Production Mastery:
- CMYK Color Management: Professional color space optimization ensuring consistent reproduction across various printing environments
- Bleed and Margin Specifications: Technical requirements ensuring perfect reproduction without cutting or alignment issues
- Paper Stock Optimization: Design approach suitable for premium paper weights and textures enhancing tactile experience
- Embossing Readiness: Design elements structured to support foil stamping, embossing, and other premium finishing techniques
- Volume Printing Efficiency: Specifications optimized for cost-effective large-quantity production without quality compromise
- Quality Control Standards: Color and registration specifications ensuring consistent excellence across all printed materials

Digital Integration Excellence:
- High-Resolution Asset Creation: Vector-based design ensuring crisp reproduction at any size or resolution requirement
- Template Development: Structured design enabling easy customization for different departments or communication purposes
- Brand Guide Integration: Letterhead specifications documented for consistent implementation across organizational communications
- Software Compatibility: Design files prepared for various word processing and business communication software platforms
- Update Flexibility: Template structure allowing easy modification for contact changes, rebranding, or design evolution
- Archive Documentation: Complete technical specifications ensuring accurate reproduction for future printing and digital use

FINAL CORPORATE VALIDATION:
Executive Approval Standards:
- Board-Level Quality: Design sophistication appropriate for board communications and executive-level business correspondence
- Client Presentation Readiness: Professional quality supporting high-stakes business presentations and proposal submissions
- Industry Leadership Positioning: Visual approach reinforcing market leadership and innovation within business sector
- Professional Legacy Building: Design quality contributing to long-term organizational reputation and brand equity development
- Competitive Market Advantage: Letterhead design providing tangible business advantage through superior professional presentation`;
  },

  qualityEnhancements: {
    'low': 'good letterhead design, suitable for basic use',
    'medium': 'professional letterhead design, business quality',
    'high': 'premium executive letterhead, exceptional print quality, luxury presentation',
    'auto': 'automatically optimized quality for letterhead usage'
  },

  styleModifiers: {
    'modern-minimalist': 'contemporary styling, clean lines, minimal design approach',
    'classic-elegant': 'timeless design, sophisticated elements, traditional corporate aesthetic',
    'creative-bold': 'distinctive design, unique elements, memorable brand presentation',
    'formal-corporate': 'conservative styling, traditional business approach, professional formality'
  },

  aspectRatioOptimizations: {}
};

// ===== AI Avatars Template =====

export const AI_AVATARS_TEMPLATE: PromptTemplate = {
  categoryId: 'ai-avatars',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const standardFieldsSection = getStandardFieldsPromptSection(formValues, visionDescription);
    
    const expressionSection = formValues.expression 
      ? `Emotional Expression Architecture:
Character Expression: ${formValues.expression}
- Psychological Authenticity: ${formValues.expression} emotion conveyed through authentic facial muscle movements and micro-expressions
- Professional Appropriateness: Expression intensity calibrated for business and social networking context requirements
- Universal Accessibility: Emotional communication transcending cultural boundaries while maintaining authentic character personality
- Engagement Optimization: Expression designed to encourage positive social interaction and professional connection building
- Personality Reflection: Facial expression supporting intended character traits and professional positioning goals
- Approachability Balance: ${formValues.expression} emotion balanced with professional competence and trustworthiness signals
- Memorable Impact: Expression creating lasting positive impression encouraging social connection and professional networking`
      : 'Neutral Professional Expression: Balanced emotional tone allowing viewer interpretation while maintaining professional competence';
    
    const framingSection = formValues.framing 
      ? `Compositional Framing Framework:
Character Framing: ${formValues.framing}
- Professional Standards: ${formValues.framing} composition following established professional portrait conventions and best practices
- Platform Optimization: Framing specifically calibrated for social media profile picture requirements and viewing contexts
- Visual Impact: ${formValues.framing} perspective maximizing character presence and personality communication within confined space
- Recognition Optimization: Framing ensuring immediate character identification across various display sizes and resolutions
- Background Integration: ${formValues.framing} composition allowing seamless background treatment without compromising character prominence
- Cross-Platform Compatibility: Framing approach effective across LinkedIn, Twitter, Instagram, and professional networking platforms`
      : 'Optimal Framing Selection: Professional portrait composition chosen for maximum character impact and recognition';
    
    return `Create a masterpiece-quality AI avatar that transcends typical profile pictures to become compelling personal branding and professional identity representation.

${standardFieldsSection}

CHARACTER IDENTITY SPECIFICATIONS:
Subject Profile: ${formValues.subjectDescription}
Professional Context: ${formValues.professionalRole}
Platform Purpose: ${formValues.platformUsage}
Brand Alignment: ${formValues.personalBrand}

PROFESSIONAL CHARACTER DESIGN FRAMEWORK:
Identity Excellence Architecture:
- Authentic Personality: Character design reflecting genuine personal characteristics while optimizing for professional success
- Professional Competence: Visual elements suggesting expertise, reliability, and professional capability within intended field
- Approachable Authority: Balance between professional competence and personal warmth encouraging connection and trust
- Memorable Distinction: Character features creating lasting impression and easy recognition across professional networks
- Cross-Cultural Appeal: Character design appropriate for diverse professional environments and international business contexts
- Future-Proof Design: Character approach ensuring relevance and effectiveness across evolving professional landscape

Personal Brand Integration:
- Value Proposition Communication: Character design supporting intended professional positioning and personal brand development
- Industry Appropriateness: Visual approach aligned with professional field expectations and industry cultural norms
- Competitive Differentiation: Character design distinguishing individual from professional peers and industry colleagues
- Career Advancement Support: Professional presentation opening doors to advancement opportunities and strategic connections
- Network Building: Character design encouraging positive professional relationships and business networking success
- Thought Leadership: Visual approach supporting expertise positioning and industry recognition development

${expressionSection}

${framingSection}

ARTISTIC EXCELLENCE STANDARDS:
Portrait Mastery Techniques:
- Anatomical Precision: Character proportions following classical portrait standards while accommodating stylistic interpretation
- Facial Feature Harmony: Balanced facial elements creating inherently pleasing and memorable character appearance
- Skin Texture Authenticity: Surface qualities rendered with appropriate realism for chosen artistic style and professional context
- Hair Design Excellence: Hairstyle design supporting character personality while maintaining professional appropriateness
- Eye Contact Mastery: Gaze direction and eye expression creating immediate connection and positive viewer response
- Smile Optimization: Facial expression calibrated for maximum approachability while maintaining professional credibility

Advanced Character Rendering:
- Lighting Architecture: Professional portrait lighting revealing character features while creating dimensional depth and visual interest
- Color Harmony: Character coloring following scientific color theory for maximum visual appeal and psychological impact
- Detail Precision: Facial features rendered with appropriate detail level for platform usage and viewing distance requirements
- Style Consistency: Artistic approach maintained throughout character elements ensuring cohesive, professional appearance
- Background Integration: Character and background relationship supporting overall composition without competing for attention
- Technical Execution: Digital artistry demonstrating professional competence and attention to detail

PROFESSIONAL PLATFORM OPTIMIZATION:
Social Media Excellence:
- Profile Picture Optimization: Character design specifically calibrated for social media profile picture effectiveness
- Thumbnail Recognition: Character features immediately identifiable even at smallest display sizes and resolutions
- Cross-Platform Consistency: Character design maintaining impact across LinkedIn, Twitter, Instagram, and professional platforms
- Mobile Optimization: Character appearance optimized for mobile device viewing and social media browsing patterns
- Video Call Ready: Character design suitable for video conferencing backgrounds and professional virtual meeting contexts
- Brand Extension: Character approach supporting broader personal branding initiatives and professional marketing efforts

Professional Networking Impact:
- First Impression Excellence: Character design creating immediate positive perception encouraging professional connection
- Trust Building: Visual elements suggesting reliability, competence, and professional integrity
- Connection Encouragement: Character design motivating positive professional networking and relationship building
- Industry Recognition: Character approach supporting professional recognition and thought leadership development
- Career Advancement: Professional presentation opening doors to advancement opportunities and strategic business relationships
- Global Professional Appeal: Character design effective across international professional networks and cultural contexts

PSYCHOLOGICAL IMPACT OPTIMIZATION:
Professional Psychology Implementation:
- Competence Signaling: Visual elements suggesting professional expertise and capability within intended field
- Trustworthiness Communication: Character features encouraging confidence and positive professional relationship development
- Approachability Balance: Professional competence balanced with personal warmth and accessibility for networking success
- Authority Establishment: Character design supporting leadership positioning and professional influence development
- Likability Optimization: Character features encouraging positive social response and professional connection building
- Confidence Projection: Character design reflecting self-assurance while avoiding arrogance or professional intimidation

Personal Connection Facilitation:
- Empathy Generation: Character design encouraging emotional connection and positive interpersonal response
- Conversation Starters: Unique character elements providing natural networking conversation opportunities
- Memory Enhancement: Character features supporting long-term recognition and professional relationship maintenance
- Cultural Bridge Building: Character design facilitating positive connections across diverse professional communities
- Professional Mentorship: Character approach suitable for both seeking and providing professional guidance and support
- Industry Leadership: Character design supporting thought leadership and professional influence within intended field

TECHNICAL EXCELLENCE MASTERY:
Digital Portrait Standards:
- Resolution Superiority: Ultra-high definition character rendering suitable for large-scale display and detailed examination
- Compression Resilience: Character design maintaining quality and impact across various image compression scenarios
- Color Space Management: Professional color workflow ensuring consistent character appearance across devices and platforms
- File Format Optimization: Character delivery in multiple formats supporting various professional and social media requirements
- Scalability Preservation: Character design maintaining impact and clarity across size variations and display contexts
- Archive Quality: Technical specifications ensuring long-term character usability and professional brand consistency

Professional Production Quality:
- Commercial Viability: Character quality appropriate for professional business use and corporate representation
- Brand Guide Integration: Character specifications documented for consistent implementation across professional materials
- Legal Compliance: Character design avoiding trademark conflicts and ensuring appropriate usage rights
- Platform Specifications: Technical requirements optimized for each major social media and professional networking platform
- Future Compatibility: Character design approach ensuring compatibility with evolving platform requirements and technology
- Quality Assurance: Character delivery meeting professional standards for business use and personal brand development

FINAL CHARACTER VALIDATION:
Professional Identity Excellence:
- Personal Brand Advancement: Character design supporting long-term personal brand development and professional growth
- Network Expansion: Character appeal facilitating positive professional relationship development and industry connections
- Career Trajectory Support: Character design opening doors to advancement opportunities and strategic business relationships
- Industry Recognition: Character quality supporting professional recognition and thought leadership development within field
- Global Professional Appeal: Character effectiveness across international business contexts and diverse professional environments
- Professional Legacy Building: Character design contributing to sustained professional reputation and personal brand equity`;
  },

  qualityEnhancements: {
    'low': 'good avatar quality, suitable for casual use',
    'medium': 'professional avatar quality, clear character representation',
    'high': 'premium avatar design, exceptional detail, artistic mastery',
    'auto': 'automatically optimized quality for avatar usage'
  },

  styleModifiers: {
    'photorealistic': 'lifelike appearance, realistic skin textures, natural lighting',
    'professional-headshot': 'business portrait style, professional lighting, corporate presentation',
    'digital-painting': 'artistic painted style, brush textures, artistic interpretation',
    'anime-manga': 'Japanese animation style, stylized features, anime aesthetics',
    '3d-character': 'three-dimensional rendering, game art quality, modern 3D aesthetics',
    'fantasy-art': 'mystical elements, fantasy styling, magical atmosphere'
  },

  aspectRatioOptimizations: {
    'square': 'Perfect square format for most social media profiles',
    'headshot': 'Portrait framing focused on head and shoulders',
    'bust': 'Wider framing including chest area for more context'
  }
};

// Template mapping
export const CATEGORY_PROMPT_TEMPLATES: Record<ImageCategory, PromptTemplate> = {
  'social-media': SOCIAL_MEDIA_TEMPLATE,
  'logo-brand': LOGO_BRAND_TEMPLATE,
  'ui-components': UI_COMPONENTS_TEMPLATE,
  'marketing': MARKETING_TEMPLATE,
  'banners': BANNERS_TEMPLATE,
  'data-viz': DATA_VIZ_TEMPLATE,
  'illustrations': ILLUSTRATIONS_TEMPLATE,
  'product-mockups': PRODUCT_MOCKUPS_TEMPLATE,
  'letterhead': LETTERHEAD_TEMPLATE,
  'ai-avatars': AI_AVATARS_TEMPLATE
};

// Main enhancement function
export function enhanceCategoryPrompt(
  categoryId: ImageCategory,
  formValues: CategoryFormValues,
  visionDescription?: string,
  quality: 'low' | 'medium' | 'high' | 'auto' = 'high',
  additionalEnhancements?: EnhancementOptions
): string {
  const template = CATEGORY_PROMPT_TEMPLATES[categoryId];
  if (!template) {
    throw new Error(`No template found for category: ${categoryId}`);
  }

  // Generate base prompt
  let enhancedPrompt = template.getTemplate(formValues, visionDescription);

  // Add quality enhancements
  const qualityBoost = template.qualityEnhancements[quality];
  if (qualityBoost) {
    enhancedPrompt += `\n\nQuality Enhancement: ${qualityBoost}`;
  }

  // Add professional completion
  enhancedPrompt += `\n\nProfessional Standards: Ultra-high quality, professional execution, industry-standard results, exceptional attention to detail, commercial-grade output.`;

  return enhancedPrompt.trim();
}

// Helper function to get optimal aspect ratio
export function getAspectRatioForCategory(categoryId: ImageCategory, formValues: CategoryFormValues): string {
  const template = CATEGORY_PROMPT_TEMPLATES[categoryId];
  if (!template) return '1024x1024';

  // Check for category-specific aspect ratio optimizations
  const aspectRatios = template.aspectRatioOptimizations;
  
  // For marketing category, prioritize formatSize and materialType
  if (categoryId === 'marketing') {
    // Check formatSize first
    if (formValues.formatSize && aspectRatios[formValues.formatSize]) {
      const format = formValues.formatSize;
      // Return appropriate dimensions based on format
      if (format.includes('letter') || format.includes('a4') || format.includes('5x7') || format.includes('4x6')) {
        return format.includes('landscape') ? '1792x1024' : '1024x1792'; // Portrait orientation for documents and invitations
      }
      if (format.includes('square')) return '1024x1024';
      if (format.includes('digital-social')) return '1024x1024';
      if (format.includes('digital-email')) return '1024x1792';
      if (format.includes('business-card')) return '1792x1024'; // Landscape for business cards
      if (format.includes('large-poster')) return '1024x1792'; // Tall poster format
    }
    
    // Check materialType if formatSize not specified
    if (formValues.materialType && aspectRatios[formValues.materialType]) {
      const material = formValues.materialType;
      if (material === 'cover-letter') return '1024x1792'; // Portrait document
      if (material.includes('invitation') && material !== 'housewarming-invitation') return '1024x1792'; // Most invitations are portrait
      if (material === 'housewarming-invitation') return '1792x1024'; // Landscape for housewarming
      if (material === 'conference-badge' || material === 'business-card') return '1792x1024'; // Landscape
      if (material.includes('card')) return '1024x1792'; // Portrait for most cards
    }
  }
  
  // Try to find a match based on form values for other categories
  for (const [key, value] of Object.entries(aspectRatios)) {
    // Check various form fields that might indicate aspect ratio preference
    if (formValues.platform === key || 
        formValues.bannerType === key || 
        formValues.cardOrientation === key ||
        formValues.framing === key) {
      // Return appropriate dimensions based on the key
      if (key.includes('story') || key.includes('vertical') || key === 'portrait') return '1024x1792';
      if (key.includes('landscape') || key.includes('cover') || key.includes('header')) return '1792x1024';
      return '1024x1024'; // Default square
    }
  }

  // Category-specific defaults
  switch (categoryId) {
    case 'social-media':
      return formValues.platform === 'instagram-story' || formValues.platform === 'tiktok-background' 
        ? '1024x1792' : '1024x1024';
    case 'banners':
      return '1792x1024';
    case 'letterhead':
      return '1024x1792';
    case 'marketing':
      return '1024x1792'; // Default to portrait for marketing materials
    default:
      return '1024x1024';
  }
}

// Helper function to get prompt suggestions
export function getCategoryPromptSuggestions(categoryId: ImageCategory): string[] {
  const suggestions: Record<ImageCategory, string[]> = {
    'social-media': [
      'Create a vibrant Instagram post about healthy lifestyle tips',
      'Design a professional LinkedIn announcement graphic',
      'Make an engaging Facebook story about weekend events'
    ],
    'logo-brand': [
      'Modern tech startup logo with clean geometric design',
      'Elegant restaurant logo with classic typography',
      'Bold fitness brand logo with dynamic elements'
    ],
    'ui-components': [
      'Professional call-to-action button with accessibility features and hover states',
      'Modern navigation bar for responsive web application',
      'Mobile app interface following Material Design 3 guidelines',
      'Dashboard widget with data visualization and loading states',
      'Form elements with inline validation and error handling',
      'Icon set following iOS Human Interface Guidelines',
      'Hero banner optimized for conversion and performance'
    ],
    'marketing': [
      'Elegant wedding invitation with floral design',
      'Professional cover letter header for job application',
      'Birthday invitation for children\'s superhero party',
      'Corporate conference invitation with company branding',
      'Graduation celebration invitation with academic themes',
      'Baby shower invitation with soft pastel colors',
      'Holiday greeting card for winter season',
      'Retirement party invitation honoring career achievements',
      'Product launch invitation for tech startup event',
      'Thank you card expressing sincere gratitude',
      'Eye-catching event flyer for music festival',
      'Professional business card for consultant',
      'Promotional banner for seasonal sale'
    ],
    'banners': [
      'Website header banner for portfolio site',
      'Social media cover photo for business page',
      'Trade show display banner design'
    ],
         'data-viz': [
      'Sales performance bar chart for quarterly report',
      'User engagement pie chart for dashboard',
      'Growth trend line graph for presentation'
    ],
    'illustrations': [
      'Whimsical children\'s book character illustration',
      'Technical diagram for user manual',
      'Artistic portrait in watercolor style'
    ],
    'product-mockups': [
      'Smartphone app interface mockup',
      'Coffee packaging design presentation',
      'T-shirt design on model mockup'
    ],
    'letterhead': [
      'Executive letterhead for law firm',
      'Creative letterhead for design agency',
      'Corporate letterhead for financial services'
    ],
    'ai-avatars': [
      'Professional business avatar for LinkedIn',
      'Artistic character design for gaming',
      'Friendly customer service representative avatar'
    ]
  };

  return suggestions[categoryId] || [];
} 
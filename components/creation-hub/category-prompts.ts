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

// ===== Social Media Template =====

export const SOCIAL_MEDIA_TEMPLATE: PromptTemplate = {
  categoryId: 'social-media',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
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
    
    const visionSection = visionDescription 
      ? `Visual Reference Integration:
${visionDescription}
- Style Continuity: Maintain consistent visual language from reference materials
- Color Harmony: Extract and enhance dominant color palette from references
- Compositional Elements: Incorporate successful design patterns while ensuring originality`
      : '';
    
    return `Create a stunning, scroll-stopping ${formValues.platform} content piece that maximizes engagement and brand impact.

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

${visionSection}

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
    
    const visionSection = visionDescription 
      ? `Design Heritage & Inspiration:
${visionDescription}
- Style Evolution: Incorporate successful elements while ensuring contemporary relevance
- Industry Context: Understand competitive landscape while maintaining differentiation
- Cultural Sensitivity: Respect cultural meanings and avoid unintended associations
- Symbolic Resonance: Build upon established visual metaphors that enhance brand meaning`
      : '';
    
    return `Design an iconic, instantly recognizable logo that becomes the cornerstone of ${formValues.companyName}'s brand identity and market presence.

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

${visionSection}

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
    const functionalitySection = formValues.functionality 
      ? `Interface Functionality Specifications:
Core Function: ${formValues.functionality}
- Interaction States: Default, hover, active, focus, disabled, loading states clearly defined
- State Transitions: Smooth, purposeful animations lasting 200-300ms for optimal user experience
- Feedback Mechanisms: Visual indicators confirming user actions and system responses
- Error States: Clear visual communication of validation issues or system errors
- Success Indicators: Positive reinforcement for completed actions and successful interactions
- Progressive Disclosure: Information revealed appropriately based on user context and need
- Microinteractions: Subtle animations enhancing perceived responsiveness and user delight`
      : 'Static Component Design: Focus on visual excellence and layout perfection for presentation purposes';
    
    const visionSection = visionDescription 
      ? `Design System Integration:
${visionDescription}
- Pattern Consistency: Aligns with established design patterns while introducing thoughtful innovations
- Component Hierarchy: Respects existing design system hierarchy and component relationships
- Style Heritage: Builds upon successful design elements while ensuring contemporary relevance
- Brand Integration: Seamlessly incorporates brand elements without compromising usability`
      : '';
    
    return `Create a pixel-perfect, production-ready UI component that exemplifies modern interface design excellence and optimal user experience.

COMPONENT SPECIFICATIONS:
Component Type: ${formValues.componentType}
Application Context: ${formValues.platform}
Design Framework: ${formValues.designSystem}
User Experience Goal: ${formValues.userExperience}

DESIGN ARCHITECTURE FRAMEWORK:
Visual Hierarchy & Layout:
- Information Architecture: Content organized using clear typographic hierarchy and logical grouping
- Scanning Patterns: Layout optimized for F-pattern and Z-pattern reading behaviors
- Content Prioritization: Most important elements receive primary visual emphasis
- Whitespace Strategy: Generous padding and margins creating breathing room and focus
- Grid Alignment: Mathematical precision using 8px grid system for perfect pixel alignment
- Responsive Considerations: Component scales gracefully across device sizes and orientations

Typography Excellence:
- Font Selection: Production-ready web fonts optimized for screen readability
- Type Scale: Harmonious size relationships using modular scale ratios (1.2, 1.25, or 1.333)
- Line Height: Optimal leading for comfortable reading (1.4-1.6 for body text)
- Letter Spacing: Subtle tracking adjustments enhancing readability without affecting character recognition
- Font Weight Distribution: Strategic use of weights creating clear information hierarchy
- Color Contrast: WCAG AAA compliance ensuring accessibility across vision capabilities

COLOR SYSTEM ARCHITECTURE:
Primary Color Application:
- Brand Integration: ${formValues.designSystem} color palette seamlessly integrated throughout component
- Semantic Colors: Error (red), warning (amber), success (green), info (blue) consistently applied
- Neutral Foundation: Grayscale system providing structural backbone and content hierarchy
- Accent Strategy: Highlight colors used sparingly for maximum impact and visual interest

Interactive Color States:
- Idle States: Subtle, inviting colors encouraging user interaction
- Hover Effects: 10-15% brightness/saturation increase indicating interactivity
- Active States: Deeper color variants providing immediate tactile feedback
- Focus Indicators: High-contrast outlines meeting accessibility requirements
- Disabled States: Reduced opacity (40-60%) clearly communicating unavailable functionality

INTERACTION DESIGN EXCELLENCE:
${functionalitySection}

User Experience Optimization:
- Cognitive Load Reduction: Interface elements immediately understandable without learning curve
- Task Completion Efficiency: Streamlined user flows minimizing steps to goal achievement
- Error Prevention: Design patterns preventing common user mistakes before they occur
- Recovery Mechanisms: Clear pathways for users to correct mistakes or change decisions
- Contextual Help: Tooltips and guidance appearing precisely when users need assistance

Touch & Mouse Interaction:
- Target Sizing: Minimum 44px touch targets for optimal mobile usability
- Gesture Support: Swipe, pinch, and tap gestures appropriately implemented where applicable
- Hover States: Meaningful preview information and visual feedback for desktop users
- Keyboard Navigation: Full accessibility via tab, arrow keys, enter, and escape
- Screen Reader Optimization: Semantic HTML structure supporting assistive technologies

TECHNICAL IMPLEMENTATION STANDARDS:
Code Quality & Performance:
- Semantic HTML: Proper element usage ensuring accessibility and SEO optimization
- CSS Architecture: Modular, maintainable stylesheets using BEM or utility-first methodologies
- Performance Budget: Component loads within 200ms on 3G networks
- Image Optimization: All graphics compressed and served in next-generation formats (WebP, AVIF)
- JavaScript Efficiency: Minimal DOM manipulation with event delegation and debouncing

Cross-Platform Compatibility:
- Browser Support: Consistent rendering across Chrome, Firefox, Safari, Edge latest versions
- Device Testing: Perfect display on iOS, Android, Windows, and macOS across screen densities
- Resolution Independence: Crisp appearance on standard, Retina, and high-DPI displays
- Feature Degradation: Graceful fallbacks for unsupported browser features
- Progressive Enhancement: Core functionality available regardless of JavaScript availability

ACCESSIBILITY EXCELLENCE:
Universal Design Principles:
- Screen Reader Compatibility: Proper ARIA labels, roles, and properties throughout component
- Keyboard Navigation: Complete functionality accessible via keyboard-only interaction
- Color Independence: Information conveyed through multiple visual cues beyond color alone
- Motion Sensitivity: Respectful animation implementation with prefer-reduced-motion support
- Zoom Compatibility: Maintains usability at 200% zoom levels required by accessibility standards

Inclusive Design Considerations:
- Cognitive Accessibility: Simple, predictable interface patterns reducing mental processing load
- Motor Accessibility: Generous click targets and forgiving interaction zones
- Visual Accessibility: High contrast ratios and scalable text supporting various vision needs
- Temporary Disabilities: Design resilience for users with temporary limitations (injury, distraction)

${formValues.platform} PLATFORM OPTIMIZATION:
Native Platform Integration:
- Operating System Conventions: Respects ${formValues.platform} design guidelines and user expectations
- Platform-Specific Patterns: Leverages familiar interaction patterns users already understand
- System Integration: Harmonious coexistence with platform UI and system-level controls
- Performance Characteristics: Optimized for ${formValues.platform} hardware and software capabilities

Design System Compliance:
- ${formValues.designSystem} Standards: Faithful implementation of established design tokens and patterns
- Component Library Integration: Seamless compatibility with existing design system components
- Documentation Standards: Self-documenting design enabling efficient developer handoff
- Maintenance Considerations: Design approach supporting long-term system evolution

PRODUCTION READINESS VALIDATION:
${visionSection}

Quality Assurance Checklist:
- Pixel Perfection: Every element precisely positioned and sized according to design specifications
- Interaction Consistency: All interactive elements behave predictably across component instances
- Error Handling: Robust performance under edge cases and unexpected user inputs
- Performance Validation: Component meets or exceeds loading and interaction performance benchmarks
- Accessibility Audit: Full compliance with WCAG 2.1 Level AA standards verified through testing

Developer Handoff Excellence:
- Technical Specifications: Complete implementation guidance including measurements, colors, and behaviors
- Asset Preparation: All required graphics exported in appropriate formats and resolutions
- Animation Specifications: Detailed timing, easing, and transition requirements documented
- Component Variants: All necessary states and variations clearly defined and delivered
- Integration Notes: Platform-specific implementation considerations and best practices included`;
  },

  qualityEnhancements: {
    'low': 'clean UI design, suitable for quick mockups',
    'medium': 'professional UI design, polished execution',
    'high': 'pixel-perfect UI design, ultra-crisp details, premium interface quality',
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
    
    const visionSection = visionDescription 
      ? `Brand Visual Integration:
${visionDescription}
- Brand Consistency: Seamless integration with existing brand visual language and messaging hierarchy
- Competitive Differentiation: Distinctive visual approach setting apart from industry standard approaches
- Market Positioning: Visual elements reinforce intended market position and target audience alignment
- Cultural Relevance: Design elements appropriate for target demographic cultural context and values`
      : '';
    
    return `Create a high-converting, strategically designed marketing asset that drives measurable business results and advances specific campaign objectives.

MARKETING CAMPAIGN SPECIFICATIONS:
Target Audience: ${formValues.targetAudience}
Material Type: ${formValues.materialType}
Campaign Objective: ${formValues.campaignGoal}
Product/Service Focus: ${formValues.productService}

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

${visionSection}

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

  aspectRatioOptimizations: {}
};

// ===== Banners Template =====

export const BANNERS_TEMPLATE: PromptTemplate = {
  categoryId: 'banners',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
    const messageSection = formValues.primaryMessage 
      ? `Core Message Architecture:
Primary Message: "${formValues.primaryMessage}"
- Headline Hierarchy: Main message receives 60-70% of total visual weight through size and positioning
- Message Clarity: Communication clear and understandable within 2-second viewing window
- Emotional Resonance: Language and visual treatment aligned to evoke intended audience response
- Value Communication: Immediate benefit or value proposition communicated through primary messaging
- Action Orientation: Message phrasing encourages specific behavioral response from viewers
- Brand Voice Integration: Messaging tone consistent with overall brand personality and communication style
- Urgency Elements: Time-sensitive language creating appropriate pressure for immediate response`
      : 'Visual-First Communication: Pure image-based storytelling without relying on text-heavy messaging';
    
    const placementSection = formValues.bannerType 
      ? `Platform Integration Strategy:
Display Context: ${formValues.bannerType}
- Environment Adaptation: Design approach optimized for specific ${formValues.bannerType} viewing context
- Competition Consideration: Visual approach cutting through noise typical of ${formValues.bannerType} environment
- Technical Specifications: Exact dimensional requirements and file specifications for ${formValues.bannerType} platform
- Loading Optimization: Image compression and format optimization for ${formValues.bannerType} technical constraints
- Interaction Expectations: Design accounting for typical user interaction patterns on ${formValues.bannerType}
- Algorithm Optimization: Visual elements designed to maximize organic reach and engagement on ${formValues.bannerType}`
      : '';
    
    const visionSection = visionDescription 
      ? `Brand Visual Continuity:
${visionDescription}
- Design Language Consistency: Seamless integration with existing brand visual approach and guidelines
- Style Evolution: Creative interpretation of brand elements while maintaining recognition and consistency
- Competitive Differentiation: Distinctive visual approach setting apart from industry standard banner approaches
- Cross-Platform Cohesion: Design approach supporting consistent brand experience across multiple touchpoints`
      : '';
    
    return `Create a high-performance banner graphic that stops scrolling, captures attention immediately, and drives specific user actions with measurable conversion impact.

BANNER CAMPAIGN SPECIFICATIONS:
Banner Purpose: ${formValues.bannerPurpose}
Banner Type: ${formValues.bannerType}
Target Audience: ${formValues.targetAudience}
Campaign Objective: ${formValues.bannerGoal}

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
- Emotional Trigger Activation: Design elements tapping into core emotional drivers for ${formValues.targetAudience}
- Social Proof Integration: Trust signals and credibility indicators reducing friction to engagement
- Urgency Communication: Visual elements suggesting time-sensitivity or limited availability
- Value Proposition Clarity: Immediate benefit communication within first second of banner visibility
- Pain Point Recognition: Visual storytelling connecting with audience problems and desired solutions

${messageSection}

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
- Color Psychology Application: CTA colors chosen for maximum conversion impact (typically orange, red, or green)
- Size and Positioning: CTA sized for optimal thumb interaction and positioned following natural reading patterns
- Action Language: Imperative verbs creating immediate behavioral response ("Get," "Start," "Claim," "Download")
- Friction Reduction: CTA design suggesting easy, low-commitment interaction requiring minimal effort
- Urgency Integration: Visual elements around CTA suggesting time-sensitivity or limited availability

BRAND INTEGRATION & RECOGNITION:
Visual Brand Implementation:
- Logo Placement: Brand mark positioned for recognition without competing with primary message or CTA
- Color Palette Consistency: Brand colors strategically implemented while optimizing for conversion performance
- Typography Harmony: Font selections consistent with brand guidelines while maximizing readability at banner sizes
- Style Continuity: Design approach recognizable as part of cohesive brand experience across touchpoints
- Brand Personality Reflection: Visual elements communicating intended brand characteristics and values
- Recognition Optimization: Design elements supporting brand recall even when logo is not clearly visible

Trust & Credibility Signals:
- Professional Polish: Design quality suggesting business competence and reliability
- Industry Appropriateness: Visual approach appropriate for sector and target audience expectations
- Security Indicators: Trust badges, guarantees, or credibility signals reducing interaction anxiety
- Social Validation: Customer counts, testimonials, or popularity indicators where space permits
- Authority Building: Expert endorsements, certifications, or industry recognition prominently featured

${placementSection}

TECHNICAL PERFORMANCE STANDARDS:
File Optimization Excellence:
- Loading Speed: Image compression optimized for sub-2-second loading across connection types
- Quality Maintenance: Visual clarity preserved across all compression levels and display densities
- Format Selection: File type chosen for optimal balance of quality, size, and compatibility
- Scalability Preservation: Design integrity maintained across various display sizes and resolutions
- Animation Optimization: If animated, movement optimized for attention without distraction or annoyance
- Cross-Device Compatibility: Perfect rendering across desktop, tablet, and mobile viewing contexts

Platform-Specific Technical Requirements:
- Dimensional Precision: Exact pixel specifications for intended ${formValues.bannerType} placement
- Color Space Management: RGB optimization for screen display with consistent color reproduction
- Resolution Standards: Retina and high-DPI display optimization ensuring crisp appearance across devices
- Compression Algorithms: Platform-specific optimization accounting for automatic compression systems
- File Size Constraints: Banner optimized for ${formValues.bannerType} file size limitations and loading requirements
- Format Compatibility: File type selection ensuring universal support across target viewing environments

CAMPAIGN PERFORMANCE OPTIMIZATION:
A/B Testing Framework:
- Variable Elements: Key components designed for systematic testing (headlines, colors, CTAs, images)
- Performance Baselines: Design targeting specific improvement over existing banner performance metrics
- Conversion Tracking: Visual elements supporting clear attribution and click-through measurement
- Audience Segmentation: Design approach adaptable for different audience segments and testing scenarios
- Optimization Iteration: Framework enabling continuous improvement based on performance data analysis

ROI Maximization Strategy:
- Cost-Per-Click Efficiency: Design optimized for maximum click-through rates relative to advertising spend
- Quality Score Optimization: Visual approach supporting high platform quality scores and reduced costs
- Conversion Rate Focus: Design elements optimized for post-click conversion rather than clicks alone
- Brand Awareness Balance: Impression value balanced with direct response optimization for campaign ROI
- Cross-Campaign Synergy: Visual approach supporting broader marketing campaign objectives and messaging

AUDIENCE-SPECIFIC CUSTOMIZATION:
${formValues.targetAudience} Optimization:
- Demographic Alignment: Visual language, color preferences, and imagery aligned with target audience characteristics
- Psychographic Resonance: Design elements appealing to target audience values, aspirations, and lifestyle preferences
- Communication Style: Visual tone appropriate for audience sophistication level and brand relationship stage
- Cultural Sensitivity: Design elements respectful and appealing to target audience cultural context
- Generation-Specific Elements: Visual references and design trends appropriate for target age demographic preferences

Behavioral Trigger Integration:
- Purchase Motivation: Visual elements tapping into core motivational drivers for target audience purchasing decisions
- Seasonal Relevance: Design elements appropriate for current season, holidays, or temporal context
- Lifestyle Integration: Visual approach suggesting seamless integration with target audience daily life and routine
- Aspiration Activation: Design elements connecting with audience goals and desired self-image
- Problem Resolution: Visual storytelling addressing specific pain points relevant to target audience experience

${visionSection}

FINAL QUALITY VALIDATION:
Performance Prediction Framework:
- Click-Through Rate Optimization: Design elements proven to increase CTR in ${formValues.bannerType} format
- Engagement Quality: Visual approach attracting high-value prospects rather than casual browsers
- Brand Impact Measurement: Design supporting both immediate response and long-term brand building
- Cross-Platform Effectiveness: Banner performance optimized across various placement opportunities
- Competitive Advantage: Distinctive approach providing marketplace differentiation and attention capture`;
  },

  qualityEnhancements: {
    'low': 'good banner design, suitable for web display',
    'medium': 'professional banner design, clear messaging',
    'high': 'premium banner quality, ultra-sharp details, exceptional visual impact',
    'auto': 'automatically optimized quality for banner usage'
  },

  styleModifiers: {},

  aspectRatioOptimizations: {
    'facebook-cover': 'Facebook cover format 1200x630, timeline optimized',
    'linkedin-banner': 'LinkedIn banner format 1584x396, professional networking optimized',
    'twitter-header': 'Twitter header format 1500x500, profile optimized',
    'physical-banner': 'Vertical banner format, large-scale printing optimized'
  }
};

// ===== Data Visualization Template =====

export const DATA_VIZ_TEMPLATE: PromptTemplate = {
  categoryId: 'data-viz',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
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
    
    const visionSection = visionDescription 
      ? `Analytical Design Integration:
${visionDescription}
- Style Consistency: Seamless integration with existing analytical reporting and dashboard systems
- Brand Alignment: Corporate identity elements appropriately incorporated without compromising data clarity
- Industry Standards: Visualization approach following sector-specific best practices and conventions
- Template Framework: Design approach scalable across multiple datasets and reporting requirements`
      : '';
    
    return `Create an executive-quality data visualization that transforms complex information into immediately actionable business intelligence and strategic insights.

DATA VISUALIZATION SPECIFICATIONS:
Chart Type: ${formValues.chartType}
Data Domain: ${formValues.dataTopic}
Visualization Title: ${formValues.chartTitle}
Analysis Purpose: ${formValues.analysisGoal}

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

${visionSection}

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

  styleModifiers: {},

  aspectRatioOptimizations: {}
};

// ===== Illustrations Template =====

export const ILLUSTRATIONS_TEMPLATE: PromptTemplate = {
  categoryId: 'illustrations',
  getTemplate: (formValues: CategoryFormValues, visionDescription?: string) => {
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
    
    const visionSection = visionDescription 
      ? `Artistic Heritage Integration:
${visionDescription}
- Style Evolution: Contemporary interpretation of established artistic traditions and movements
- Technique Synthesis: Combination of classical artistic principles with modern creative approaches
- Cultural Context: Respectful integration of artistic influences while ensuring original creative expression
- Medium Authenticity: Digital technique mimicking traditional artistic media with faithful material representation`
      : '';
    
    return `Create a masterpiece-quality artistic illustration that transcends mere visual representation to become compelling artistic storytelling with emotional depth and technical excellence.

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

${visionSection}

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
    
    const visionSection = visionDescription 
      ? `Product Photography Heritage:
${visionDescription}
- Style Evolution: Contemporary interpretation of successful product photography while ensuring fresh, distinctive approach
- Industry Standards: Understanding of category photography conventions while maintaining creative differentiation
- Brand Integration: Photography style consistent with overall brand visual language and marketing approach
- Technical Excellence: Professional photography standards elevated through creative interpretation and modern techniques`
      : '';
    
    return `Create a commercial-grade product mockup that transforms ordinary product presentation into compelling, sales-driving visual storytelling with professional photography excellence.

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

${visionSection}

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
    
    const visionSection = visionDescription 
      ? `Corporate Identity Integration:
${visionDescription}
- Brand Consistency: Seamless integration with existing corporate visual identity and marketing materials
- Design Evolution: Contemporary interpretation of established brand elements while maintaining recognition and equity
- Professional Heritage: Letterhead design building upon successful brand communications while ensuring modern relevance
- Cross-Media Coherence: Visual approach supporting consistent brand experience across all business communication touchpoints`
      : '';
    
    return `Design an executive-quality corporate letterhead that elevates business correspondence to reflect organizational excellence and professional authority.

CORPORATE COMMUNICATION SPECIFICATIONS:
Company Identity: ${formValues.companyName}
Business Sector: ${formValues.industry}
Design Philosophy: ${formValues.letterheadStyle}
Communication Context: ${formValues.correspondenceType}

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

${visionSection}

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
    
    const visionSection = visionDescription 
      ? `Character Development Integration:
${visionDescription}
- Personality Synthesis: Character design building upon reference materials while ensuring unique, ownable personal identity
- Professional Evolution: Contemporary interpretation of successful character elements while ensuring modern relevance and appeal
- Cultural Sensitivity: Character representation respectful and appropriate across diverse professional and social contexts
- Brand Alignment: Character design supporting personal or professional brand development without compromising authenticity`
      : '';
    
    return `Create a masterpiece-quality AI avatar that transcends typical profile pictures to become compelling personal branding and professional identity representation.

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

${visionSection}

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
  
  // Try to find a match based on form values
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
      'Call-to-action button with gradient and hover effects',
      'Navigation icons set for mobile app',
      'Hero banner for e-commerce website'
    ],
    'marketing': [
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
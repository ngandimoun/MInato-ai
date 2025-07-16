// Enhanced Category Types - Professional image generation categories with comprehensive options

export type ImageCategory = 
  | 'social-media'
  | 'logo-brand'
  | 'ui-components'
  | 'marketing'
  | 'banners'
  | 'data-viz'
  | 'illustrations'
  | 'product-mockups'
  | 'letterhead'
  | 'ai-avatars';

// ===== Enhanced Language Support =====
export const SUPPORTED_LANGUAGES = [
  // Major World Languages
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  
  // European Languages
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  
  // Asian & Pacific Languages
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
  { code: 'hy', name: 'Հայերեն', flag: '🇦🇲' },
  { code: 'az', name: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'uz', name: 'O\'zbekcha', flag: '🇺🇿' },
  { code: 'ky', name: 'Кыргызча', flag: '🇰🇬' },
  { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'mn', name: 'Монгол', flag: '🇲🇳' },
  
  // African Languages
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh', name: 'isiXhosa', flag: '🇿🇦' },
  
  // European Regional Languages
  { code: 'is', name: 'Íslenska', flag: '🇮🇸' },
  { code: 'mt', name: 'Malti', flag: '🇲🇹' },
  { code: 'ga', name: 'Gaeilge', flag: '🇮🇪' },
  { code: 'cy', name: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'eu', name: 'Euskera', flag: '🇪🇸' },
  { code: 'ca', name: 'Català', flag: '🇪🇸' },
  { code: 'gl', name: 'Galego', flag: '🇪🇸' },
  { code: 'br', name: 'Brezhoneg', flag: '🇫🇷' },
  { code: 'co', name: 'Corsu', flag: '🇫🇷' },
  { code: 'lb', name: 'Lëtzebuergesch', flag: '🇱🇺' },
  
  // Latin American Variants
  { code: 'pt-br', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es-mx', name: 'Español (México)', flag: '🇲🇽' },
  { code: 'es-ar', name: 'Español (Argentina)', flag: '🇦🇷' },
  
  // Other Major Languages
  { code: 'la', name: 'Latina', flag: '🏛️' },
  { code: 'eo', name: 'Esperanto', flag: '🌍' },
  { code: 'jv', name: 'Basa Jawa', flag: '🇮🇩' },
  { code: 'su', name: 'Basa Sunda', flag: '🇮🇩' },
  { code: 'ceb', name: 'Cebuano', flag: '🇵🇭' },
  { code: 'war', name: 'Waray', flag: '🇵🇭' },
  { code: 'ilo', name: 'Ilokano', flag: '🇵🇭' },
  { code: 'haw', name: 'ʻŌlelo Hawaiʻi', flag: '🇺🇸' },
  { code: 'mi', name: 'Te Reo Māori', flag: '🇳🇿' },
  { code: 'sm', name: 'Gagana Samoa', flag: '🇼🇸' },
  { code: 'to', name: 'Lea Faka-Tonga', flag: '🇹🇴' },
  { code: 'fj', name: 'Na Vosa Vakaviti', flag: '🇫🇯' }
];

// ===== Category Metadata =====
export interface CategoryInfo {
  id: ImageCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  examples: string[];
  tags: string[];
}

export const CATEGORY_INFO: Record<ImageCategory, CategoryInfo> = {
  'social-media': {
    id: 'social-media',
    name: 'Social Media Posts',
    description: 'Create engaging content for all social platforms with professional designs',
    icon: 'Share2',
    color: '#FF6B6B',
    gradient: 'from-pink-500 to-orange-400',
    examples: ['Instagram posts', 'Story graphics', 'Facebook covers', 'TikTok backgrounds', 'YouTube thumbnails'],
    tags: ['social', 'posts', 'instagram', 'facebook', 'marketing', 'engagement']
  },
  'logo-brand': {
    id: 'logo-brand',
    name: 'Logo & Brand Kit',
    description: 'Generate unique logos and complete brand identity systems',
    icon: 'Zap',
    color: '#4ECDC4',
    gradient: 'from-teal-400 to-blue-500',
    examples: ['Company logos', 'Brand symbols', 'Wordmarks', 'Emblems', 'Business cards'],
    tags: ['logo', 'brand', 'identity', 'business', 'corporate', 'professional']
  },
  'ui-components': {
    id: 'ui-components',
    name: 'Website & App UI',
    description: 'Create professional, production-ready UI elements following modern UX/UI best practices and platform-specific design guidelines',
    icon: 'Monitor',
    color: '#45B7D1',
    gradient: 'from-blue-400 to-purple-500',
    examples: ['Professional buttons', 'Mobile app interfaces', 'Web layouts', 'Form elements', 'Navigation systems', 'Dashboard components'],
    tags: ['ui', 'ux', 'web', 'app', 'interface', 'design', 'digital', 'professional', 'accessibility', 'responsive']
  },
  'marketing': {
    id: 'marketing',
    name: 'Marketing Materials',
    description: 'Design professional marketing and promotional materials including cover letters, invitations, and industry-specific designs',
    icon: 'Megaphone',
    color: '#96CEB4',
    gradient: 'from-green-400 to-teal-500',
    examples: ['Flyers', 'Business cards', 'Cover letters', 'Wedding invitations', 'Corporate invitations', 'Holiday cards', 'Thank you cards'],
    tags: ['marketing', 'print', 'promotional', 'business', 'advertising', 'events', 'invitations', 'cover-letters', 'cards']
  },
  'banners': {
    id: 'banners',
    name: 'Banners & Headers',
    description: 'Create impactful banners for websites, social media, and events',
    icon: 'Image',
    color: '#FECA57',
    gradient: 'from-yellow-400 to-orange-500',
    examples: ['Website headers', 'Event banners', 'Profile covers', 'Display ads'],
    tags: ['banner', 'header', 'cover', 'large-format', 'profile', 'advertising'],
    formFields: [
      {
        id: 'platform',
        type: 'select',
        label: 'Platform *',
        required: true,
        description: 'Select the platform where your banner will be displayed',
        options: [
          { value: 'facebook-cover', label: 'Facebook Cover', description: '820x312px - Personal/Business profile cover' },
          { value: 'linkedin-banner', label: 'LinkedIn Banner', description: '1584x396px - Professional profile banner' },
          { value: 'twitter-header', label: 'Twitter Header', description: '1500x500px - Twitter/X profile header' },
          { value: 'instagram-story', label: 'Instagram Story', description: '1080x1920px - Story banner template' },
          { value: 'youtube-banner', label: 'YouTube Banner', description: '2560x1440px - Channel art banner' },
          { value: 'website-header', label: 'Website Header', description: '1920x400px - Website hero banner' },
          { value: 'blog-header', label: 'Blog Header', description: '1200x630px - Blog post header image' },
          { value: 'email-header', label: 'Email Header', description: '600x200px - Newsletter header' },
          { value: 'display-leaderboard', label: 'Leaderboard Ad', description: '728x90px - Display advertising' },
          { value: 'display-rectangle', label: 'Rectangle Ad', description: '300x250px - Medium rectangle ad' },
          { value: 'print-banner', label: 'Print Banner', description: '297x210mm - A4 landscape print' }
        ]
      },
      {
        id: 'contentType',
        type: 'select',
        label: 'Content Type *',
        required: true,
        description: 'What type of content will your banner feature?',
        options: [
          { value: 'brand-announcement', label: 'Brand Announcement', description: 'Company news, product launches' },
          { value: 'event-promotion', label: 'Event Promotion', description: 'Conferences, webinars, meetups' },
          { value: 'product-showcase', label: 'Product Showcase', description: 'Product features, benefits' },
          { value: 'personal-branding', label: 'Personal Branding', description: 'Professional profile, portfolio' },
          { value: 'seasonal-campaign', label: 'Seasonal Campaign', description: 'Holiday, seasonal promotions' },
          { value: 'educational-content', label: 'Educational Content', description: 'Tutorials, guides, tips' },
          { value: 'community-building', label: 'Community Building', description: 'Social engagement, networking' },
          { value: 'sales-promotion', label: 'Sales Promotion', description: 'Discounts, offers, deals' }
        ]
      },
      {
        id: 'brandKit',
        type: 'brand-kit-selector',
        label: 'Brand Kit',
        description: 'Select or customize your brand identity',
        options: [
          { value: 'professional', label: 'Professional', description: 'Clean, corporate aesthetic' },
          { value: 'creative', label: 'Creative', description: 'Vibrant, artistic approach' },
          { value: 'corporate', label: 'Corporate', description: 'Traditional business style' },
          { value: 'custom', label: 'Custom Brand Kit', description: 'Upload your own brand assets' }
        ]
      },
      {
        id: 'layoutGrid',
        type: 'visual-cards',
        label: 'Layout Structure *',
        required: true,
        description: 'Choose the composition framework for your banner',
        options: [
          { value: 'rule-of-thirds', label: 'Rule of Thirds', description: 'Classic 3x3 grid composition' },
          { value: 'golden-ratio', label: 'Golden Ratio', description: 'Mathematically balanced proportions' },
          { value: 'symmetric', label: 'Symmetric Grid', description: 'Balanced, centered layout' },
          { value: 'asymmetric', label: 'Asymmetric Grid', description: 'Dynamic, modern composition' },
          { value: 'modular', label: 'Modular Grid', description: 'Flexible, scalable system' }
        ]
      },
      {
        id: 'primaryMessage',
        type: 'textarea',
        label: 'Primary Message *',
        required: true,
        description: 'Main headline or key message for your banner',
        placeholder: 'Enter your primary headline or message...'
      },
      {
        id: 'secondaryMessage',
        type: 'textarea',
        label: 'Secondary Message',
        description: 'Supporting text, tagline, or additional details',
        placeholder: 'Enter supporting text or tagline...'
      },
      {
        id: 'callToAction',
        type: 'text',
        label: 'Call to Action',
        description: 'Action text (e.g., "Learn More", "Sign Up", "Contact Us")',
        placeholder: 'Enter your call to action...'
      },
      {
        id: 'visualStyle',
        type: 'visual-cards',
        label: 'Visual Style *',
        required: true,
        description: 'Choose the overall aesthetic approach',
        options: [
          { value: 'minimalist-clean', label: 'Minimalist Clean', description: 'Simple, uncluttered design' },
          { value: 'bold-dynamic', label: 'Bold Dynamic', description: 'High-impact, energetic style' },
          { value: 'elegant-sophisticated', label: 'Elegant Sophisticated', description: 'Refined, premium feel' },
          { value: 'playful-creative', label: 'Playful Creative', description: 'Fun, engaging approach' },
          { value: 'professional-corporate', label: 'Professional Corporate', description: 'Business-focused design' },
          { value: 'modern-tech', label: 'Modern Tech', description: 'Contemporary, digital aesthetic' },
          { value: 'warm-friendly', label: 'Warm Friendly', description: 'Approachable, welcoming style' },
          { value: 'luxury-premium', label: 'Luxury Premium', description: 'High-end, exclusive feel' }
        ]
      },
      {
        id: 'colorScheme',
        type: 'color-palette-selector',
        label: 'Color Scheme *',
        required: true,
        description: 'Select the color palette for your banner',
        options: [
          { value: 'brand-primary', label: 'Brand Primary', description: 'Use your brand colors' },
          { value: 'professional-blue', label: 'Professional Blue', description: 'Corporate blue tones' },
          { value: 'energetic-orange', label: 'Energetic Orange', description: 'Vibrant, action-oriented' },
          { value: 'trustworthy-green', label: 'Trustworthy Green', description: 'Growth and stability' },
          { value: 'creative-purple', label: 'Creative Purple', description: 'Innovation and creativity' },
          { value: 'bold-red', label: 'Bold Red', description: 'Attention-grabbing, urgent' },
          { value: 'elegant-black', label: 'Elegant Black', description: 'Sophisticated, premium' },
          { value: 'clean-white', label: 'Clean White', description: 'Minimal, spacious feel' },
          { value: 'warm-earth', label: 'Warm Earth', description: 'Natural, organic tones' },
          { value: 'cool-gradient', label: 'Cool Gradient', description: 'Modern gradient effects' }
        ]
      },
      {
        id: 'typography',
        type: 'typography-selector',
        label: 'Typography Style *',
        required: true,
        description: 'Choose fonts that match your brand personality',
        options: [
          { value: 'modern-sans', label: 'Modern Sans-Serif', description: 'Clean, contemporary fonts' },
          { value: 'classic-serif', label: 'Classic Serif', description: 'Traditional, authoritative' },
          { value: 'bold-display', label: 'Bold Display', description: 'High-impact headlines' },
          { value: 'elegant-script', label: 'Elegant Script', description: 'Sophisticated, personal' },
          { value: 'tech-mono', label: 'Tech Monospace', description: 'Digital, technical feel' },
          { value: 'friendly-rounded', label: 'Friendly Rounded', description: 'Approachable, casual' },
          { value: 'luxury-condensed', label: 'Luxury Condensed', description: 'Premium, space-efficient' },
          { value: 'custom-brand', label: 'Custom Brand Font', description: 'Use your brand typography' }
        ]
      },
      {
        id: 'imageStyle',
        type: 'visual-cards',
        label: 'Image Treatment',
        description: 'How should images be styled in your banner?',
        options: [
          { value: 'photographic', label: 'Photographic', description: 'Real photos, high quality' },
          { value: 'illustrated', label: 'Illustrated', description: 'Custom illustrations' },
          { value: 'geometric', label: 'Geometric', description: 'Abstract shapes, patterns' },
          { value: 'minimal-icons', label: 'Minimal Icons', description: 'Simple, clean iconography' },
          { value: 'collage-style', label: 'Collage Style', description: 'Multiple image composition' },
          { value: 'gradient-overlay', label: 'Gradient Overlay', description: 'Color overlays on images' },
          { value: 'text-only', label: 'Text Only', description: 'Typography-focused design' },
          { value: 'logo-centric', label: 'Logo Centric', description: 'Brand logo as main element' }
        ]
      },
      {
        id: 'technicalSpecs',
        type: 'technical-specs',
        label: 'Technical Specifications',
        description: 'Advanced technical requirements',
        fields: [
          {
            id: 'outputFormat',
            type: 'select',
            label: 'Output Format',
            options: [
              { value: 'auto', label: 'Auto (Platform Optimized)' },
              { value: 'png', label: 'PNG (Lossless)' },
              { value: 'jpg', label: 'JPG (Compressed)' },
              { value: 'webp', label: 'WebP (Modern)' },
              { value: 'pdf', label: 'PDF (Print Ready)' }
            ]
          },
          {
            id: 'resolution',
            type: 'select',
            label: 'Resolution',
            options: [
              { value: 'auto', label: 'Auto (Platform Optimized)' },
              { value: '72', label: '72 DPI (Web)' },
              { value: '150', label: '150 DPI (High Quality Web)' },
              { value: '300', label: '300 DPI (Print Ready)' }
            ]
          },
          {
            id: 'colorSpace',
            type: 'select',
            label: 'Color Space',
            options: [
              { value: 'auto', label: 'Auto (Platform Optimized)' },
              { value: 'rgb', label: 'RGB (Digital)' },
              { value: 'cmyk', label: 'CMYK (Print)' }
            ]
          },
          {
            id: 'compression',
            type: 'slider',
            label: 'Compression Quality',
            min: 60,
            max: 100,
            default: 85,
            description: 'Higher values = better quality, larger file size'
          }
        ]
      },
      {
        id: 'accessibilityFeatures',
        type: 'multi-select',
        label: 'Accessibility Features',
        description: 'Ensure your banner is accessible to all users',
        options: [
          { value: 'high-contrast', label: 'High Contrast', description: 'WCAG AA compliant contrast ratios' },
          { value: 'large-text', label: 'Large Text', description: 'Minimum 16px font size' },
          { value: 'alt-text-ready', label: 'Alt Text Ready', description: 'Design optimized for screen readers' },
          { value: 'colorblind-friendly', label: 'Colorblind Friendly', description: 'Accessible color choices' },
          { value: 'motion-reduced', label: 'Motion Reduced', description: 'Minimal animation/effects' }
        ]
      },
      {
        id: 'optimizationGoals',
        type: 'multi-select',
        label: 'Optimization Goals',
        description: 'What should this banner optimize for?',
        options: [
          { value: 'click-through-rate', label: 'Click-Through Rate', description: 'Maximize engagement' },
          { value: 'brand-awareness', label: 'Brand Awareness', description: 'Increase recognition' },
          { value: 'conversion-rate', label: 'Conversion Rate', description: 'Drive specific actions' },
          { value: 'social-sharing', label: 'Social Sharing', description: 'Encourage sharing' },
          { value: 'mobile-performance', label: 'Mobile Performance', description: 'Optimize for mobile' },
          { value: 'load-speed', label: 'Load Speed', description: 'Minimize file size' },
          { value: 'print-quality', label: 'Print Quality', description: 'High-resolution output' }
        ]
      },
      {
        id: 'additionalRequirements',
        type: 'textarea',
        label: 'Additional Requirements',
        description: 'Any specific requirements, constraints, or preferences',
        placeholder: 'Describe any specific needs, brand guidelines, or creative direction...'
      }
    ]
  },
  'data-viz': {
    id: 'data-viz',
    name: 'Data Visualization',
    description: 'Generate beautiful charts, graphs, and infographics',
    icon: 'BarChart3',
    color: '#A8E6CF',
    gradient: 'from-emerald-400 to-green-500',
    examples: ['Bar charts', 'Pie charts', 'Infographics', 'Data dashboards', 'Analytics reports'],
    tags: ['data', 'chart', 'graph', 'visualization', 'analytics', 'infographic', 'reports']
  },
  'illustrations': {
    id: 'illustrations',
    name: 'Illustrations & Art',
    description: 'Create custom artwork, illustrations, and artistic compositions',
    icon: 'Palette',
    color: '#DDA0DD',
    gradient: 'from-purple-400 to-pink-500',
    examples: ['Character art', 'Scene illustrations', 'Storyboards', 'Digital paintings', 'Concept art'],
    tags: ['illustration', 'art', 'drawing', 'creative', 'character', 'scene', 'artistic']
  },
  'product-mockups': {
    id: 'product-mockups',
    name: 'Product Mockups',
    description: 'Visualize products and merchandise with realistic mockups',
    icon: 'Package',
    color: '#FFB347',
    gradient: 'from-orange-400 to-red-500',
    examples: ['T-shirt designs', 'Mug mockups', 'Phone cases', 'Product packaging', 'Ecommerce photos'],
    tags: ['mockup', 'product', 'merchandise', 'apparel', 'branding', 'ecommerce']
  },
  'letterhead': {
    id: 'letterhead',
    name: 'Business Documents',
    description: 'Create professional business documents with enterprise-grade quality, compliance standards, and international business support',
    icon: 'FileText',
    color: '#87CEEB',
    gradient: 'from-sky-400 to-blue-500',
    examples: [
      'Corporate Annual Reports',
      'Financial Statements', 
      'Executive Summaries',
      'Board Meeting Materials',
      'Legal Templates',
      'Compliance Documentation',
      'Professional Letterheads',
      'Governance Documents',
      'Corporate Presentations',
      'Professional Whitepapers'
    ],
    tags: [
      'letterhead', 
      'document', 
      'corporate', 
      'professional', 
      'template', 
      'business',
      'enterprise',
      'compliance',
      'governance',
      'financial',
      'legal',
      'executive',
      'international',
      'standards',
      'quality-assurance',
      'brand-identity',
      'regulatory'
    ]
  },
  'ai-avatars': {
    id: 'ai-avatars',
    name: 'AI Avatars & Profiles',
    description: 'Generate unique avatars and professional profile pictures',
    icon: 'User',
    color: '#DA70D6',
    gradient: 'from-violet-400 to-purple-500',
    examples: ['Profile pictures', 'Digital avatars', 'Character portraits', 'Team photos'],
    tags: ['avatar', 'profile', 'character', 'portrait', 'headshot', 'person', 'team']
  }
};

// ===== Standardized Fields for All Categories =====
export const STANDARD_FIELDS: FormField[] = [
  {
    id: 'referenceImages',
    type: 'upload',
    label: 'Reference Images',
    description: 'Upload images for inspiration and style guidance',
    accept: 'image/*',
    maxFiles: 5,
    multiple: true
  },
  {
    id: 'textLanguage',
    type: 'language-select',
    label: 'Text Language *',
    required: true,
    description: 'Language for company name and tagline',
    defaultValue: 'en'
  },
  {
    id: 'includeHuman',
    type: 'toggle',
    label: 'Include Human Model',
    description: 'Show the product being worn or used by a person to create more engaging, relatable content',
    defaultValue: false
  },
  {
    id: 'humanDescription',
    type: 'textarea',
    label: 'Human Model Description',
    description: 'Describe how the human model should look and interact with the product/scene. Be specific about appearance, pose, and context.',
    placeholder: 'e.g., Young professional woman, 25-30 years old, wearing casual business attire, holding/using the product naturally with a confident smile. Natural lighting, lifestyle setting.',
    conditional: {
      dependsOn: 'includeHuman',
      showWhen: [true, 'true']
    },
    validation: { max: 500, message: 'Description should be under 500 characters' }
  }
];

// ===== Form Field Types =====
export type FormFieldType = 
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'color'
  | 'color-palette'
  | 'upload'
  | 'toggle'
  | 'radio'
  | 'checkbox'
  | 'slider'
  | 'visual-cards'
  | 'language-select'
  | 'design-tokens';

export interface DesignTokenField {
  id: string;
  label: string;
  fields: string[];
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: string;
    preview?: string;
  }>;
  conditional?: {
    dependsOn: string;
    showWhen: string | string[] | boolean | (string | boolean)[];
  };
  defaultValue?: any;
  // Design tokens specific properties
  tokenTypes?: DesignTokenField[];
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  // Color palette specific properties
  maxColors?: number;
  defaultColors?: string[];
}

export interface CategoryForm {
  categoryId: ImageCategory;
  fields: FormField[];
  validation?: (values: Record<string, any>) => { isValid: boolean; errors: Record<string, string> };
}

// ===== Enhanced Form Definitions =====

export const SOCIAL_MEDIA_FORM: CategoryForm = {
  categoryId: 'social-media',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'platform',
      type: 'select',
      label: 'Platform *',
      required: true,
      description: 'Select the social media platform for optimal sizing',
      options: [
        { value: 'instagram-post', label: 'Instagram Post', description: '1080x1080 square format' },
        { value: 'instagram-story', label: 'Instagram Story', description: '1080x1920 vertical format' },
        { value: 'instagram-reel', label: 'Instagram Reel Cover', description: '1080x1920 vertical format' },
        { value: 'facebook-post', label: 'Facebook Post', description: '1200x630 landscape format' },
        { value: 'facebook-story', label: 'Facebook Story', description: '1080x1920 vertical format' },
        { value: 'facebook-cover', label: 'Facebook Cover Photo', description: '1200x315 wide format' },
        { value: 'twitter-post', label: 'Twitter/X Post', description: '1200x675 landscape format' },
        { value: 'twitter-header', label: 'Twitter/X Header', description: '1500x500 wide format' },
        { value: 'linkedin-post', label: 'LinkedIn Post', description: '1200x627 landscape format' },
        { value: 'linkedin-cover', label: 'LinkedIn Cover', description: '1584x396 wide format' },
        { value: 'tiktok-background', label: 'TikTok Background', description: '1080x1920 vertical format' },
        { value: 'youtube-thumbnail', label: 'YouTube Thumbnail', description: '1280x720 landscape format' },
        { value: 'youtube-cover', label: 'YouTube Channel Art', description: '2560x1440 wide format' },
        { value: 'pinterest-pin', label: 'Pinterest Pin', description: '735x1102 vertical format' },
        { value: 'snapchat-ad', label: 'Snapchat Ad', description: '1080x1920 vertical format' },
        { value: 'whatsapp-status', label: 'WhatsApp Status', description: '1080x1920 vertical format' }
      ]
    },
    {
      id: 'contentType',
      type: 'select',
      label: 'Content Type *',
      required: true,
      description: 'What type of content are you creating?',
      options: [
        { value: 'product-showcase', label: 'Product Showcase', description: 'Highlight products or services' },
        { value: 'announcement', label: 'Announcement', description: 'News, updates, or important information' },
        { value: 'promotional', label: 'Promotional', description: 'Sales, discounts, or special offers' },
        { value: 'educational', label: 'Educational', description: 'Tips, tutorials, or informational content' },
        { value: 'inspirational', label: 'Inspirational', description: 'Motivational quotes or uplifting content' },
        { value: 'behind-scenes', label: 'Behind the Scenes', description: 'Company culture or process insights' },
        { value: 'user-generated', label: 'User Generated Content', description: 'Customer testimonials or reviews' },
        { value: 'event-promotion', label: 'Event Promotion', description: 'Webinars, workshops, or live events' },
        { value: 'brand-story', label: 'Brand Story', description: 'Company values and mission' },
        { value: 'seasonal-content', label: 'Seasonal Content', description: 'Holiday or seasonal themed posts' }
      ]
    },
    {
      id: 'postTopic',
      type: 'textarea',
      label: 'Post Description *',
      required: true,
      placeholder: 'Our new sustainable coffee blend made from ethically sourced beans, perfect for morning energy',
      description: 'Describe what your post is about in detail',
      validation: { min: 10, max: 300, message: 'Description should be between 10-300 characters' }
    },

    {
      id: 'textOnImage',
      type: 'textarea',
      label: 'Text on Image',
      placeholder: 'New! Sustainable Coffee Blend. Shop Now!',
      description: 'Enter the exact text you want to appear on the image in the selected language',
      validation: { max: 100, message: 'Text should be under 100 characters for readability' }
    },
    {
      id: 'visualStyle',
      type: 'visual-cards',
      label: 'Visual Style *',
      required: true,
      description: 'Choose the overall aesthetic for your post',
      options: [
        { value: 'bright-airy', label: 'Bright & Airy', description: 'Light, clean, minimal aesthetic' },
        { value: 'dark-moody', label: 'Dark & Moody', description: 'Dramatic shadows and rich contrast' },
        { value: 'vibrant-colorful', label: 'Vibrant & Colorful', description: 'Bold, eye-catching colors' },
        { value: 'minimalist-clean', label: 'Minimalist & Clean', description: 'Simple, uncluttered design' },
        { value: 'retro-vintage', label: 'Retro & Vintage', description: 'Nostalgic, classic styling' },
        { value: 'professional-corporate', label: 'Professional & Corporate', description: 'Business-appropriate styling' },
        { value: 'luxury-premium', label: 'Luxury & Premium', description: 'High-end, sophisticated aesthetic' },
        { value: 'organic-natural', label: 'Organic & Natural', description: 'Earth tones with natural textures' },
        { value: 'tech-modern', label: 'Tech & Modern', description: 'Futuristic, sleek design' },
        { value: 'artistic-creative', label: 'Artistic & Creative', description: 'Abstract, expressive designs' },
        { value: 'playful-fun', label: 'Playful & Fun', description: 'Cheerful, energetic with dynamic shapes' },
        { value: 'elegant-sophisticated', label: 'Elegant & Sophisticated', description: 'Refined, graceful design' }
      ]
    },
    {
      id: 'artStyle',
      type: 'visual-cards',
      label: 'Art Style *',
      required: true,
      description: 'Select the artistic approach for your content',
      options: [
        { value: 'photographic', label: 'Photographic', description: 'Realistic, high-quality photo style' },
        { value: 'illustrated', label: 'Illustrated', description: 'Hand-drawn or digital illustration' },
        { value: 'vector-graphic', label: 'Vector Graphic', description: 'Clean, scalable vector design' },
        { value: 'watercolor', label: 'Watercolor', description: 'Soft, flowing watercolor painting' },
        { value: 'sketch-drawing', label: 'Sketch Drawing', description: 'Hand-drawn sketch or line art' },
        { value: 'comic-cartoon', label: 'Comic/Cartoon', description: 'Stylized, animated character style' },
        { value: 'digital-art', label: 'Digital Art', description: 'Modern digital artwork with effects' },
        { value: 'collage-mixed', label: 'Collage/Mixed Media', description: 'Combination of visual elements' },
        { value: 'typography-focused', label: 'Typography Focused', description: 'Text-based creative design' },
        { value: 'geometric-abstract', label: 'Geometric Abstract', description: 'Shape-based compositions' }
      ]
    },
    {
      id: 'background',
      type: 'visual-cards',
      label: 'Background *',
      required: true,
      description: 'Choose the background treatment',
      options: [
        { value: 'solid-color', label: 'Solid Color', description: 'Clean, single color background' },
        { value: 'gradient', label: 'Gradient', description: 'Smooth color transitions' },
        { value: 'textured', label: 'Textured', description: 'Surface textures like paper or fabric' },
        { value: 'pattern', label: 'Pattern', description: 'Repeating decorative elements' },
        { value: 'photo-backdrop', label: 'Photo Backdrop', description: 'Real environment background' },
        { value: 'transparent', label: 'Transparent', description: 'No background for overlays' },
        { value: 'bokeh-blur', label: 'Bokeh/Blur', description: 'Soft, out-of-focus background' },
        { value: 'geometric-shapes', label: 'Geometric Shapes', description: 'Abstract geometric elements' },
        { value: 'workspace-office', label: 'Workspace/Office', description: 'Professional work environment' },
        { value: 'lifestyle-home', label: 'Lifestyle/Home', description: 'Cozy, residential settings' }
      ]
    },
    {
      id: 'moodLighting',
      type: 'visual-cards',
      label: 'Mood & Lighting *',
      required: true,
      description: 'Set the emotional tone and lighting atmosphere',
      options: [
        { value: 'bright-cheerful', label: 'Bright & Cheerful', description: 'High-key, positive energy' },
        { value: 'warm-inviting', label: 'Warm & Inviting', description: 'Golden hour, cozy tones' },
        { value: 'cool-calm', label: 'Cool & Calm', description: 'Blue tones, peaceful atmosphere' },
        { value: 'dramatic-contrast', label: 'Dramatic Contrast', description: 'Strong shadows, high contrast' },
        { value: 'soft-romantic', label: 'Soft & Romantic', description: 'Diffused, gentle lighting' },
        { value: 'energetic-dynamic', label: 'Energetic & Dynamic', description: 'Vibrant, high-energy lighting' },
        { value: 'professional-clean', label: 'Professional & Clean', description: 'Even, business-appropriate' },
        { value: 'natural-outdoor', label: 'Natural Outdoor', description: 'Natural daylight ambiance' }
      ]
    },
    {
      id: 'colorPalette',
      type: 'visual-cards',
      label: 'Color Palette',
      description: 'Choose a color scheme for your design',
      options: [
        { value: 'brand-colors', label: 'Brand Colors', description: 'Your company color scheme' },
        { value: 'warm-tones', label: 'Warm Tones', description: 'Reds, oranges, yellows' },
        { value: 'cool-tones', label: 'Cool Tones', description: 'Blues, greens, purples' },
        { value: 'earth-tones', label: 'Earth Tones', description: 'Browns, beiges, natural colors' },
        { value: 'pastel-soft', label: 'Pastel Soft', description: 'Light, muted, gentle colors' },
        { value: 'bold-vibrant', label: 'Bold Vibrant', description: 'Bright, saturated colors' },
        { value: 'monochromatic', label: 'Monochromatic', description: 'Single color variations' },
        { value: 'auto-adaptive', label: 'AI Adaptive', description: 'AI chooses best colors' }
      ]
    },

  ]
};

// ===== Validation Functions =====
export function validateCategoryForm(categoryId: ImageCategory, values: Record<string, any>): { 
  isValid: boolean; 
  errors: Record<string, string> 
} {
  const errors: Record<string, string> = {};

  // Universal validation for human model integration
  if (values.includeHuman === true || values.includeHuman === 'true') {
    if (!values.humanDescription || values.humanDescription.trim().length < 10) {
      errors.humanDescription = 'Please provide a description of the human model (at least 10 characters)';
    } else if (values.humanDescription.length > 500) {
      errors.humanDescription = 'Human model description should be under 500 characters';
    }
  }

  // Category-specific validation
  if (categoryId === 'social-media') {
    if (!values.platform) errors.platform = 'Platform is required';
    if (!values.contentType) errors.contentType = 'Content type is required';
    if (!values.postTopic || values.postTopic.length < 10) {
      errors.postTopic = 'Post description must be at least 10 characters';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export type CategoryFormValues = Record<string, any>;

export interface CategoryGenerationRequest {
  categoryId: ImageCategory;
  formValues: CategoryFormValues;
  referenceImages?: File[];
  visionDescription?: string;
}

// ===== Logo & Brand Form =====
export const LOGO_BRAND_FORM: CategoryForm = {
  categoryId: 'logo-brand',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'logoType',
      type: 'select',
      label: 'Logo Type *',
      required: true,
      description: 'What type of logo do you need?',
      options: [
        { value: 'wordmark', label: 'Wordmark', description: 'Text-based logo using company name' },
        { value: 'lettermark', label: 'Lettermark', description: 'Logo using initials or abbreviation' },
        { value: 'pictorial', label: 'Pictorial Mark', description: 'Icon or symbol representing your brand' },
        { value: 'abstract', label: 'Abstract Mark', description: 'Unique geometric shape or form' },
        { value: 'mascot', label: 'Mascot', description: 'Character or illustrated figure' },
        { value: 'combination', label: 'Combination Mark', description: 'Text and symbol combined' },
        { value: 'emblem', label: 'Emblem', description: 'Badge-style with text inside symbol' },
        { value: 'monogram', label: 'Monogram', description: 'Stylized letters intertwined' }
      ]
    },
    {
      id: 'companyName',
      type: 'text',
      label: 'Company/Brand Name *',
      required: true,
      placeholder: 'Acme Corporation',
      description: 'Enter your company or brand name',
      validation: { min: 2, max: 50, message: 'Name should be between 2-50 characters' }
    },
    {
      id: 'tagline',
      type: 'text',
      label: 'Tagline (Optional)',
      placeholder: 'Innovation in every solution',
      description: 'Optional tagline or slogan',
      validation: { max: 60, message: 'Tagline should be under 60 characters' }
    },
    {
      id: 'industry',
      type: 'select',
      label: 'Industry *',
      required: true,
      description: 'What industry is your business in?',
      options: [
        { value: 'technology', label: 'Technology', description: 'Software, IT, hardware' },
        { value: 'healthcare', label: 'Healthcare', description: 'Medical, wellness, pharmaceuticals' },
        { value: 'finance', label: 'Finance', description: 'Banking, investment, insurance' },
        { value: 'education', label: 'Education', description: 'Schools, training, e-learning' },
        { value: 'retail', label: 'Retail', description: 'E-commerce, stores, consumer goods' },
        { value: 'food-beverage', label: 'Food & Beverage', description: 'Restaurants, catering, drinks' },
        { value: 'real-estate', label: 'Real Estate', description: 'Property, construction, architecture' },
        { value: 'consulting', label: 'Consulting', description: 'Business services, advisory' },
        { value: 'creative', label: 'Creative', description: 'Design, media, entertainment' },
        { value: 'non-profit', label: 'Non-Profit', description: 'Charity, community organizations' },
        { value: 'automotive', label: 'Automotive', description: 'Cars, transportation, logistics' },
        { value: 'sports-fitness', label: 'Sports & Fitness', description: 'Gyms, athletics, wellness' },
        { value: 'beauty-fashion', label: 'Beauty & Fashion', description: 'Cosmetics, clothing, accessories' },
        { value: 'other', label: 'Other', description: 'Different industry' }
      ]
    },
    {
      id: 'brandPersonality',
      type: 'multiselect',
      label: 'Brand Personality *',
      required: true,
      description: 'Select characteristics that describe your brand (choose 2-4)',
      multiple: true,
      options: [
        { value: 'professional', label: 'Professional', description: 'Corporate, reliable, trustworthy' },
        { value: 'innovative', label: 'Innovative', description: 'Cutting-edge, forward-thinking' },
        { value: 'friendly', label: 'Friendly', description: 'Approachable, warm, personal' },
        { value: 'luxury', label: 'Luxury', description: 'Premium, exclusive, sophisticated' },
        { value: 'playful', label: 'Playful', description: 'Fun, energetic, youthful' },
        { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple, uncluttered' },
        { value: 'bold', label: 'Bold', description: 'Strong, confident, impactful' },
        { value: 'eco-friendly', label: 'Eco-Friendly', description: 'Sustainable, natural, green' },
        { value: 'traditional', label: 'Traditional', description: 'Classic, timeless, established' },
        { value: 'artistic', label: 'Artistic', description: 'Creative, expressive, unique' }
      ]
    },
    {
      id: 'colorScheme',
      type: 'visual-cards',
      label: 'Color Scheme *',
      required: true,
      description: 'Choose your preferred color approach',
      options: [
        { value: 'blue-trust', label: 'Blue Trust', description: 'Professional blues for reliability' },
        { value: 'green-growth', label: 'Green Growth', description: 'Natural greens for sustainability' },
        { value: 'red-energy', label: 'Red Energy', description: 'Bold reds for passion and power' },
        { value: 'purple-luxury', label: 'Purple Luxury', description: 'Rich purples for premium feel' },
        { value: 'orange-creativity', label: 'Orange Creativity', description: 'Vibrant oranges for innovation' },
        { value: 'black-elegance', label: 'Black Elegance', description: 'Sophisticated black and white' },
        { value: 'multicolor', label: 'Multicolor', description: 'Diverse, colorful palette' },
        { value: 'earth-tones', label: 'Earth Tones', description: 'Natural browns and beiges' },
        { value: 'custom', label: 'Let AI Choose', description: 'AI selects optimal colors' }
      ]
    },
    {
      id: 'logoStyle',
      type: 'visual-cards',
      label: 'Logo Style *',
      required: true,
      description: 'Select the design aesthetic',
      options: [
        { value: 'modern-minimal', label: 'Modern Minimal', description: 'Clean, contemporary design' },
        { value: 'classic-timeless', label: 'Classic Timeless', description: 'Traditional, enduring style' },
        { value: 'geometric', label: 'Geometric', description: 'Shape-based, structured design' },
        { value: 'organic', label: 'Organic', description: 'Natural, flowing forms' },
        { value: 'hand-drawn', label: 'Hand-Drawn', description: 'Artistic, crafted appearance' },
        { value: 'tech-digital', label: 'Tech Digital', description: 'Futuristic, high-tech feel' },
        { value: 'vintage-retro', label: 'Vintage Retro', description: 'Nostalgic, classic styling' },
        { value: 'bold-impact', label: 'Bold Impact', description: 'Strong, attention-grabbing' }
      ]
    },
    {
      id: 'targetAudience',
      type: 'select',
      label: 'Target Audience *',
      required: true,
      description: 'Who is your primary target audience?',
      options: [
        { value: 'business-professionals', label: 'Business Professionals', description: 'Corporate decision makers, B2B' },
        { value: 'general-consumers', label: 'General Consumers', description: 'Everyday customers, B2C' },
        { value: 'young-adults', label: 'Young Adults (18-35)', description: 'Millennials and Gen Z' },
        { value: 'families', label: 'Families', description: 'Parents and family units' },
        { value: 'seniors', label: 'Seniors (55+)', description: 'Mature, established audience' },
        { value: 'tech-enthusiasts', label: 'Tech Enthusiasts', description: 'Early adopters, tech-savvy users' },
        { value: 'creative-professionals', label: 'Creative Professionals', description: 'Designers, artists, creatives' },
        { value: 'luxury-market', label: 'Luxury Market', description: 'High-end, premium customers' },
        { value: 'global-audience', label: 'Global Audience', description: 'International, diverse market' }
      ]
    },
    {
      id: 'logoUsage',
      type: 'multiselect',
      label: 'Primary Usage *',
      required: true,
      description: 'Where will this logo be primarily used? (select multiple)',
      multiple: true,
      options: [
        { value: 'website-digital', label: 'Website & Digital', description: 'Online presence, social media' },
        { value: 'business-cards', label: 'Business Cards', description: 'Professional networking materials' },
        { value: 'letterhead-documents', label: 'Letterhead & Documents', description: 'Official business documents' },
        { value: 'signage-storefront', label: 'Signage & Storefront', description: 'Physical location displays' },
        { value: 'merchandise-products', label: 'Merchandise & Products', description: 'Branded items and packaging' },
        { value: 'vehicle-graphics', label: 'Vehicle Graphics', description: 'Cars, trucks, delivery vehicles' },
        { value: 'advertising-marketing', label: 'Advertising & Marketing', description: 'Promotional materials, ads' },
        { value: 'mobile-app', label: 'Mobile App', description: 'App icons and mobile interfaces' }
      ]
    },
    {
      id: 'competitorInfo',
      type: 'textarea',
      label: 'Competitor Context',
      placeholder: 'Describe 2-3 main competitors and what makes your brand different',
      description: 'Help us understand your competitive landscape (optional)',
      validation: { max: 300, message: 'Competitor info should be under 300 characters' }
    },
    {
      id: 'logoSymbol',
      type: 'textarea',
      label: 'Symbol/Icon Ideas',
      placeholder: 'Shield for security, leaf for sustainability, arrow for growth, etc.',
      description: 'Any specific symbols or concepts you want incorporated (optional)',
      validation: { max: 200, message: 'Symbol ideas should be under 200 characters' },
      conditional: { dependsOn: 'logoType', showWhen: ['pictorial', 'abstract', 'combination', 'emblem', 'mascot'] }
    },
    {
      id: 'fontPreference',
      type: 'select',
      label: 'Font Style Preference',
      description: 'What type of typography appeals to you?',
      conditional: { dependsOn: 'logoType', showWhen: ['wordmark', 'lettermark', 'combination', 'emblem', 'monogram'] },
      options: [
        { value: 'sans-serif-modern', label: 'Sans-Serif Modern', description: 'Clean, contemporary fonts' },
        { value: 'serif-traditional', label: 'Serif Traditional', description: 'Classic, established fonts' },
        { value: 'script-elegant', label: 'Script Elegant', description: 'Flowing, sophisticated fonts' },
        { value: 'display-unique', label: 'Display Unique', description: 'Distinctive, custom-style fonts' },
        { value: 'geometric-structured', label: 'Geometric Structured', description: 'Mathematical, precise fonts' },
        { value: 'handwritten-organic', label: 'Handwritten Organic', description: 'Personal, crafted appearance' }
      ]
    },
    {
      id: 'customColorValues',
      type: 'text',
      label: 'Specific Brand Colors',
      placeholder: '#1a365d, #2d3748, #ffffff',
      description: 'Enter existing brand colors as hex codes (if you have them)',
      validation: { max: 100, message: 'Color values should be under 100 characters' }
    },
    {
      id: 'logoVersions',
      type: 'multiselect',
      label: 'Logo Versions Needed',
      description: 'Which versions do you need? (select multiple)',
      multiple: true,
      options: [
        { value: 'full-color', label: 'Full Color', description: 'Primary logo with all colors' },
        { value: 'single-color', label: 'Single Color', description: 'One-color version' },
        { value: 'black-white', label: 'Black & White', description: 'Monochrome version' },
        { value: 'reverse-white', label: 'Reverse (White)', description: 'White version for dark backgrounds' },
        { value: 'horizontal', label: 'Horizontal Layout', description: 'Wide format version' },
        { value: 'vertical', label: 'Vertical Layout', description: 'Stacked format version' },
        { value: 'icon-only', label: 'Icon Only', description: 'Symbol without text' },
        { value: 'favicon', label: 'Favicon', description: 'Small web icon version' }
      ]
    },
    {
      id: 'outputFormats',
      type: 'multiselect',
      label: 'Output Formats *',
      required: true,
      description: 'What file formats do you need? (select multiple)',
      multiple: true,
      options: [
        { value: 'vector-svg', label: 'Vector (SVG)', description: 'Scalable vector format' },
        { value: 'vector-ai', label: 'Vector (AI)', description: 'Adobe Illustrator format' },
        { value: 'high-res-png', label: 'High-Res PNG', description: 'Transparent background, 300 DPI' },
        { value: 'web-png', label: 'Web PNG', description: 'Optimized for web use' },
        { value: 'print-eps', label: 'Print EPS', description: 'Professional printing format' },
        { value: 'social-media-kit', label: 'Social Media Kit', description: 'Various sizes for platforms' }
      ]
    },
    {
      id: 'budgetRange',
      type: 'select',
      label: 'Project Scope',
      description: 'What level of logo development do you need?',
      options: [
        { value: 'basic-logo', label: 'Basic Logo', description: 'Single logo design' },
        { value: 'logo-variations', label: 'Logo + Variations', description: 'Logo with multiple versions' },
        { value: 'brand-package', label: 'Brand Package', description: 'Logo + color palette + fonts' },
        { value: 'complete-identity', label: 'Complete Identity', description: 'Full brand identity system' }
      ]
    },
    {
      id: 'timelineUrgency',
      type: 'select',
      label: 'Timeline',
      description: 'When do you need this completed?',
      options: [
        { value: 'rush-24h', label: 'Rush (24 hours)', description: 'Urgent delivery needed' },
        { value: 'standard-3-5days', label: 'Standard (3-5 days)', description: 'Normal timeline' },
        { value: 'extended-1-2weeks', label: 'Extended (1-2 weeks)', description: 'More time for refinement' },
        { value: 'flexible', label: 'Flexible', description: 'No specific deadline' }
      ]
    }

  ]
};

// ===== UI Components Form =====
export const UI_COMPONENTS_FORM: CategoryForm = {
  categoryId: 'ui-components',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'componentType',
      type: 'select',
      label: 'Component Type *',
      required: true,
      description: 'What UI element do you need?',
      options: [
        { value: 'button', label: 'Button', description: 'CTA buttons, navigation buttons' },
        { value: 'icon-set', label: 'Icon Set', description: 'Collection of interface icons' },
        { value: 'hero-image', label: 'Hero Image', description: 'Website header background' },
        { value: 'card-design', label: 'Card Design', description: 'Content cards, product cards' },
        { value: 'navigation', label: 'Navigation', description: 'Menu bars, breadcrumbs' },
        { value: 'form-elements', label: 'Form Elements', description: 'Input fields, checkboxes' },
        { value: 'dashboard', label: 'Dashboard', description: 'Admin panel layouts' },
        { value: 'mobile-ui', label: 'Mobile UI', description: 'App interface elements' },
        { value: 'web-layout', label: 'Web Layout', description: 'Page templates, sections' },
        { value: 'loading-states', label: 'Loading States', description: 'Spinners, progress bars' },
        { value: 'modals', label: 'Modals & Overlays', description: 'Popup windows, dialogs' },
        { value: 'data-display', label: 'Data Display', description: 'Tables, lists, grids' },
        { value: 'notification', label: 'Notifications', description: 'Alerts, toasts, banners' },
        { value: 'tabs', label: 'Tabs & Segmented', description: 'Tab controls, segmented controls' },
        { value: 'toggles', label: 'Toggles & Switches', description: 'Toggle switches, radio buttons' },
        { value: 'sliders', label: 'Sliders & Progress', description: 'Range sliders, progress indicators' },
        { value: 'avatars', label: 'Avatars & Badges', description: 'User avatars, status badges' },
        { value: 'chips', label: 'Chips & Tags', description: 'Filter chips, category tags' }
      ]
    },
    {
      id: 'componentVariants',
      type: 'multiselect',
      label: 'Component Variants',
      description: 'Select multiple variants to show different styles',
      multiple: true,
      options: [
        { value: 'primary', label: 'Primary', description: 'Main action variant' },
        { value: 'secondary', label: 'Secondary', description: 'Secondary action variant' },
        { value: 'tertiary', label: 'Tertiary', description: 'Subtle action variant' },
        { value: 'ghost', label: 'Ghost', description: 'Minimal, transparent variant' },
        { value: 'outline', label: 'Outline', description: 'Bordered, transparent variant' },
        { value: 'destructive', label: 'Destructive', description: 'Warning/delete variant' },
        { value: 'success', label: 'Success', description: 'Success/confirmation variant' },
        { value: 'warning', label: 'Warning', description: 'Warning/caution variant' },
        { value: 'info', label: 'Info', description: 'Information variant' },
        { value: 'gradient', label: 'Gradient', description: 'Gradient-filled variant' }
      ]
    },
    {
      id: 'designSystem',
      type: 'select',
      label: 'Design System *',
      required: true,
      description: 'What design framework are you following?',
      options: [
        { value: 'material-design', label: 'Material Design', description: 'Google\'s design system' },
        { value: 'ios-human', label: 'iOS Human Interface', description: 'Apple\'s design guidelines' },
        { value: 'fluent-design', label: 'Fluent Design', description: 'Microsoft\'s design system' },
        { value: 'ant-design', label: 'Ant Design', description: 'Enterprise UI framework' },
        { value: 'bootstrap', label: 'Bootstrap', description: 'Popular CSS framework' },
        { value: 'tailwind', label: 'Tailwind', description: 'Utility-first CSS framework' },
        { value: 'chakra-ui', label: 'Chakra UI', description: 'Modular and accessible component library' },
        { value: 'mantine', label: 'Mantine', description: 'Full-featured React components library' },
        { value: 'custom-modern', label: 'Custom Modern', description: 'Modern, custom styling' },
        { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple design' },
        { value: 'glassmorphism', label: 'Glassmorphism', description: 'Frosted glass effect' },
        { value: 'neumorphism', label: 'Neumorphism', description: 'Soft UI design trend' },
        { value: 'brutalist', label: 'Brutalist', description: 'Bold, raw design aesthetic' },
        { value: 'custom-tokens', label: 'Custom Design Tokens', description: 'Define your own design system' }
      ]
    },
    {
      id: 'designTokens',
      type: 'design-tokens',
      label: 'Custom Design Tokens',
      description: 'Define your custom design system tokens',
      conditional: { dependsOn: 'designSystem', showWhen: ['custom-tokens'] },
      tokenTypes: [
        { id: 'colors', label: 'Colors', fields: ['primary', 'secondary', 'accent', 'neutral', 'semantic'] },
        { id: 'typography', label: 'Typography', fields: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight'] },
        { id: 'spacing', label: 'Spacing', fields: ['base', 'scale', 'component'] },
        { id: 'shadows', label: 'Shadows', fields: ['elevation', 'blur', 'spread'] },
        { id: 'borders', label: 'Borders', fields: ['radius', 'width', 'style'] },
        { id: 'animations', label: 'Animations', fields: ['duration', 'easing', 'delay'] }
      ]
    },
    {
      id: 'visualQuality',
      type: 'select',
      label: 'Visual Quality *',
      required: true,
      description: 'Choose the rendering quality level',
      options: [
        { value: 'production', label: 'Production Ready', description: 'Standard professional quality' },
        { value: 'premium', label: 'Premium Quality', description: 'Enhanced details and polish' },
        { value: 'ultra-premium', label: 'Ultra Premium', description: 'Maximum quality with ray-traced shadows' },
        { value: 'pixel-perfect', label: 'Pixel Perfect', description: 'Ultra-crisp edges and perfect alignment' }
      ]
    },
    {
      id: 'platform',
      type: 'select',
      label: 'Target Platform *',
      required: true,
      description: 'Where will this be used?',
      options: [
        { value: 'web-desktop', label: 'Web Desktop', description: 'Desktop browser interface' },
        { value: 'web-mobile', label: 'Web Mobile', description: 'Mobile browser interface' },
        { value: 'ios-app', label: 'iOS App', description: 'iPhone/iPad application' },
        { value: 'android-app', label: 'Android App', description: 'Android application' },
        { value: 'responsive', label: 'Responsive', description: 'All screen sizes' },
        { value: 'tablet', label: 'Tablet', description: 'Tablet-specific interface' },
        { value: 'desktop-app', label: 'Desktop App', description: 'Native desktop application' }
      ]
    },
    {
      id: 'colorTheme',
      type: 'visual-cards',
      label: 'Color Theme *',
      required: true,
      description: 'Choose the color scheme',
      options: [
        { value: 'light-mode', label: 'Light Mode', description: 'Light backgrounds, dark text' },
        { value: 'dark-mode', label: 'Dark Mode', description: 'Dark backgrounds, light text' },
        { value: 'auto-adaptive', label: 'Auto Adaptive', description: 'Both light and dark versions' },
        { value: 'brand-colors', label: 'Brand Colors', description: 'Company color scheme' },
        { value: 'blue-tech', label: 'Blue Tech', description: 'Professional blue palette' },
        { value: 'green-nature', label: 'Green Nature', description: 'Natural green tones' },
        { value: 'purple-creative', label: 'Purple Creative', description: 'Creative purple scheme' },
        { value: 'monochrome', label: 'Monochrome', description: 'Black, white, and grays' }
      ]
    },
    {
      id: 'componentDescription',
      type: 'textarea',
      label: 'Component Description *',
      required: true,
      placeholder: 'Primary call-to-action button with rounded corners, subtle shadow, and hover effects for an e-commerce checkout flow',
      description: 'Describe the specific UI component you need',
      validation: { min: 20, max: 300, message: 'Description should be between 20-300 characters' }
    },
    {
      id: 'interactionStates',
      type: 'multiselect',
      label: 'Interaction States',
      description: 'Which states should be shown? (select multiple)',
      multiple: true,
      options: [
        { value: 'default', label: 'Default', description: 'Normal state' },
        { value: 'hover', label: 'Hover', description: 'Mouse over state' },
        { value: 'active', label: 'Active/Pressed', description: 'Clicked state' },
        { value: 'focus', label: 'Focus', description: 'Keyboard focus state' },
        { value: 'disabled', label: 'Disabled', description: 'Inactive state' },
        { value: 'loading', label: 'Loading', description: 'Processing state' },
        { value: 'error', label: 'Error', description: 'Error state' },
        { value: 'success', label: 'Success', description: 'Success state' },
        { value: 'warning', label: 'Warning', description: 'Warning state' },
        { value: 'selected', label: 'Selected', description: 'Selected/checked state' },
        { value: 'indeterminate', label: 'Indeterminate', description: 'Partially selected state' }
      ]
    },
    {
      id: 'microInteractions',
      type: 'multiselect',
      label: 'Micro-interactions',
      description: 'Visual feedback and animation effects',
      multiple: true,
      options: [
        { value: 'ripple', label: 'Ripple Effect', description: 'Material Design ripple animation' },
        { value: 'scale', label: 'Scale Animation', description: 'Subtle scale on interaction' },
        { value: 'glow', label: 'Glow Effect', description: 'Soft glow on hover/focus' },
        { value: 'slide', label: 'Slide Transition', description: 'Smooth sliding animation' },
        { value: 'fade', label: 'Fade Transition', description: 'Opacity transition' },
        { value: 'bounce', label: 'Bounce Effect', description: 'Playful bounce animation' },
        { value: 'pulse', label: 'Pulse Effect', description: 'Rhythmic pulsing animation' },
        { value: 'shake', label: 'Shake Effect', description: 'Error indication shake' }
      ]
    },
    {
      id: 'shadowSystem',
      type: 'select',
      label: 'Shadow & Elevation',
      description: 'Choose the shadow rendering quality',
      options: [
        { value: 'flat', label: 'Flat Design', description: 'No shadows, flat appearance' },
        { value: 'subtle', label: 'Subtle Shadows', description: 'Light, minimal shadows' },
        { value: 'material', label: 'Material Elevation', description: 'Material Design elevation system' },
        { value: 'dramatic', label: 'Dramatic Shadows', description: 'Strong, pronounced shadows' },
        { value: 'ray-traced', label: 'Ray-traced Shadows', description: 'Ultra-realistic shadow rendering' },
        { value: 'custom', label: 'Custom Shadow', description: 'Define custom shadow properties' }
      ]
    },
    {
      id: 'gradientSystem',
      type: 'select',
      label: 'Gradient System',
      description: 'Advanced gradient rendering options',
      options: [
        { value: 'none', label: 'No Gradients', description: 'Solid colors only' },
        { value: 'linear', label: 'Linear Gradients', description: 'Smooth linear color transitions' },
        { value: 'radial', label: 'Radial Gradients', description: 'Circular color transitions' },
        { value: 'conic', label: 'Conic Gradients', description: 'Angular color transitions' },
        { value: 'mesh', label: 'Mesh Gradients', description: 'Complex multi-point gradients' },
        { value: 'animated', label: 'Animated Gradients', description: 'Dynamic color transitions' }
      ]
    },
    {
      id: 'typographySystem',
      type: 'select',
      label: 'Typography System',
      description: 'Advanced typography controls',
      options: [
        { value: 'system', label: 'System Fonts', description: 'OS-native font stack' },
        { value: 'web-safe', label: 'Web Safe', description: 'Cross-browser compatible fonts' },
        { value: 'google-fonts', label: 'Google Fonts', description: 'Professional web fonts' },
        { value: 'custom', label: 'Custom Typography', description: 'Brand-specific font system' },
        { value: 'variable', label: 'Variable Fonts', description: 'Advanced variable font features' }
      ]
    },
    {
      id: 'layoutGrid',
      type: 'select',
      label: 'Layout Grid System',
      description: 'Component alignment and spacing system',
      options: [
        { value: '8px', label: '8px Grid', description: 'Standard 8px baseline grid' },
        { value: '4px', label: '4px Grid', description: 'Precise 4px baseline grid' },
        { value: '12-column', label: '12-Column Grid', description: 'Traditional 12-column layout' },
        { value: 'flexbox', label: 'Flexbox Layout', description: 'Modern flexible layout system' },
        { value: 'css-grid', label: 'CSS Grid', description: 'Advanced CSS Grid layout' },
        { value: 'custom', label: 'Custom Grid', description: 'Define custom grid system' }
      ]
    },
    {
      id: 'componentText',
      type: 'text',
      label: 'Button/Component Text',
      placeholder: 'Get Started, Sign Up, Learn More',
      description: 'Text that should appear on buttons or in the component',
      validation: { max: 50, message: 'Component text should be under 50 characters' },
      conditional: { dependsOn: 'componentType', showWhen: ['button', 'navigation', 'form-elements', 'modals'] }
    },
    {
      id: 'responsiveBehavior',
      type: 'multiselect',
      label: 'Responsive Behavior',
      description: 'How should the component adapt across screen sizes?',
      multiple: true,
      options: [
        { value: 'scale', label: 'Scale Proportionally', description: 'Maintain proportions across sizes' },
        { value: 'reflow', label: 'Content Reflow', description: 'Reorganize content for smaller screens' },
        { value: 'collapse', label: 'Collapsible', description: 'Show/hide content based on screen size' },
        { value: 'stack', label: 'Stack Vertically', description: 'Stack elements on mobile' },
        { value: 'hide-text', label: 'Hide Text Labels', description: 'Show icons only on small screens' },
        { value: 'priority', label: 'Priority-based', description: 'Show most important content first' }
      ]
    },
    {
      id: 'platformOptimizations',
      type: 'multiselect',
      label: 'Platform Optimizations',
      description: 'Platform-specific enhancements',
      multiple: true,
      options: [
        { value: 'touch-targets', label: 'Touch Target Optimization', description: 'Optimize for finger interaction' },
        { value: 'keyboard-nav', label: 'Keyboard Navigation', description: 'Full keyboard accessibility' },
        { value: 'screen-reader', label: 'Screen Reader Support', description: 'Enhanced accessibility' },
        { value: 'high-contrast', label: 'High Contrast Mode', description: 'Accessibility color modes' },
        { value: 'reduced-motion', label: 'Reduced Motion Support', description: 'Respect motion preferences' },
        { value: 'dark-mode', label: 'Dark Mode Adaptive', description: 'Automatic dark mode support' },
        { value: 'rtl-support', label: 'RTL Language Support', description: 'Right-to-left language support' }
      ]
    },
    {
      id: 'deviceSpecific',
      type: 'multiselect',
      label: 'Device-Specific Features',
      description: 'Optimize for specific device capabilities',
      multiple: true,
      options: [
        { value: 'retina', label: 'Retina/High-DPI', description: 'High-resolution display optimization' },
        { value: 'mobile-gestures', label: 'Mobile Gestures', description: 'Swipe, pinch, long-press support' },
        { value: 'haptic-feedback', label: 'Haptic Feedback', description: 'Tactile feedback indication' },
        { value: 'voice-control', label: 'Voice Control Ready', description: 'Voice command compatibility' },
        { value: 'foldable', label: 'Foldable Screen', description: 'Foldable device optimization' },
        { value: 'watch-interface', label: 'Watch Interface', description: 'Smartwatch compatibility' }
      ]
    },
    {
      id: 'iconStyle',
      type: 'select',
      label: 'Icon Style',
      description: 'What style of icons do you need?',
      conditional: { dependsOn: 'componentType', showWhen: ['icon-set', 'button', 'navigation'] },
      options: [
        { value: 'outline', label: 'Outline', description: 'Line-based, minimal icons' },
        { value: 'filled', label: 'Filled', description: 'Solid, filled icons' },
        { value: 'duotone', label: 'Duotone', description: 'Two-color icons' },
        { value: 'gradient', label: 'Gradient', description: 'Icons with gradient fills' },
        { value: 'flat', label: 'Flat', description: 'Simple, flat design icons' },
        { value: 'realistic', label: 'Realistic', description: 'Detailed, realistic icons' }
      ]
    },
    {
      id: 'iconList',
      type: 'textarea',
      label: 'Required Icons',
      placeholder: 'home, user, settings, search, heart, shopping cart, notification, etc.',
      description: 'List the specific icons you need (comma-separated)',
      validation: { max: 300, message: 'Icon list should be under 300 characters' },
      conditional: { dependsOn: 'componentType', showWhen: ['icon-set'] }
    },
    {
      id: 'componentSize',
      type: 'select',
      label: 'Component Size *',
      required: true,
      description: 'What size should the component be?',
      options: [
        { value: 'small', label: 'Small', description: 'Compact size for dense layouts' },
        { value: 'medium', label: 'Medium', description: 'Standard size for most uses' },
        { value: 'large', label: 'Large', description: 'Prominent size for main actions' },
        { value: 'extra-large', label: 'Extra Large', description: 'Hero elements and key features' },
        { value: 'responsive', label: 'Responsive', description: 'Multiple sizes for different screens' },
        { value: 'custom', label: 'Custom', description: 'Specify exact dimensions' }
      ]
    },
    {
      id: 'customSize',
      type: 'text',
      label: 'Custom Dimensions',
      placeholder: '320x60px or 200x40px',
      description: 'Specify width x height in pixels',
      conditional: { dependsOn: 'componentSize', showWhen: ['custom'] }
    },
    {
      id: 'outputFormat',
      type: 'select',
      label: 'Output Format *',
      required: true,
      description: 'How should the component be delivered?',
      options: [
        { value: 'png-transparent', label: 'PNG (Transparent)', description: 'High quality with transparency' },
        { value: 'svg-vector', label: 'SVG (Vector)', description: 'Scalable vector format' },
        { value: 'multiple-formats', label: 'Multiple Formats', description: 'PNG, SVG, and other formats' },
        { value: 'design-system', label: 'Design System', description: 'Complete component library' },
        { value: 'code-ready', label: 'Code Ready', description: 'With CSS/HTML specifications' }
      ]
    },
    {
      id: 'brandColorValues',
      type: 'text',
      label: 'Brand Color Values',
      placeholder: '#1a365d, #2d3748, #ffffff',
      description: 'Enter your brand colors as hex codes',
      validation: { max: 100, message: 'Brand colors should be under 100 characters' },
      conditional: { dependsOn: 'colorTheme', showWhen: ['brand-colors'] }
    },
    {
      id: 'accessibilityLevel',
      type: 'select',
      label: 'Accessibility Requirements',
      description: 'What accessibility standards should be met?',
      options: [
        { value: 'basic', label: 'Basic', description: 'Standard color contrast and sizing' },
        { value: 'wcag-aa', label: 'WCAG AA', description: 'Web Content Accessibility Guidelines AA' },
        { value: 'wcag-aaa', label: 'WCAG AAA', description: 'Highest accessibility standards' },
        { value: 'colorblind-friendly', label: 'Colorblind Friendly', description: 'Safe for color vision deficiency' },
        { value: 'high-contrast', label: 'High Contrast', description: 'Enhanced contrast for visibility' }
      ]
    },
    {
      id: 'userContext',
      type: 'select',
      label: 'User Context & Environment',
      description: 'Where and how will users interact with this component?',
      options: [
        { value: 'focused-task', label: 'Focused Task', description: 'Users are concentrated on completing a specific task' },
        { value: 'casual-browsing', label: 'Casual Browsing', description: 'Users are exploring or browsing casually' },
        { value: 'mobile-on-go', label: 'Mobile On-the-Go', description: 'Users are mobile, potentially distracted' },
        { value: 'desktop-work', label: 'Desktop Work', description: 'Professional work environment with full attention' },
        { value: 'tablet-leisure', label: 'Tablet Leisure', description: 'Relaxed tablet usage, often in comfortable settings' },
        { value: 'emergency-critical', label: 'Emergency/Critical', description: 'Time-sensitive or critical user actions' },
        { value: 'first-time-user', label: 'First-time User', description: 'New users learning the interface' },
        { value: 'power-user', label: 'Power User', description: 'Experienced users who value efficiency' }
      ]
    },
    {
      id: 'performanceRequirements',
      type: 'select',
      label: 'Performance Requirements',
      description: 'What are the performance constraints?',
      options: [
        { value: 'standard', label: 'Standard', description: 'Normal web performance expectations' },
        { value: 'fast-loading', label: 'Fast Loading', description: 'Optimized for quick initial load' },
        { value: 'low-bandwidth', label: 'Low Bandwidth', description: 'Optimized for slow internet connections' },
        { value: 'mobile-first', label: 'Mobile First', description: 'Prioritized for mobile device performance' },
        { value: 'high-interaction', label: 'High Interaction', description: 'Smooth animations and micro-interactions' },
        { value: 'data-heavy', label: 'Data Heavy', description: 'Components handling large amounts of data' }
      ]
    },
    {
      id: 'businessGoal',
      type: 'select',
      label: 'Primary Business Goal',
      description: 'What business objective should this component support?',
      options: [
        { value: 'conversion', label: 'Conversion', description: 'Drive users to take specific actions' },
        { value: 'engagement', label: 'Engagement', description: 'Keep users active and involved' },
        { value: 'retention', label: 'Retention', description: 'Encourage users to return' },
        { value: 'onboarding', label: 'Onboarding', description: 'Help new users get started' },
        { value: 'productivity', label: 'Productivity', description: 'Help users complete tasks efficiently' },
        { value: 'discovery', label: 'Discovery', description: 'Help users find relevant content' },
        { value: 'trust-building', label: 'Trust Building', description: 'Establish credibility and confidence' },
        { value: 'brand-awareness', label: 'Brand Awareness', description: 'Reinforce brand identity and values' }
      ]
    },
    {
      id: 'technicalConstraints',
      type: 'multiselect',
      label: 'Technical Constraints',
      description: 'Any technical limitations to consider? (select multiple)',
      multiple: true,
      options: [
        { value: 'legacy-browser', label: 'Legacy Browser Support', description: 'Must work on older browsers' },
        { value: 'no-javascript', label: 'No JavaScript', description: 'Must work without JavaScript' },
        { value: 'offline-capable', label: 'Offline Capable', description: 'Must function without internet' },
        { value: 'print-friendly', label: 'Print Friendly', description: 'Must look good when printed' },
        { value: 'screen-reader', label: 'Screen Reader Optimized', description: 'Enhanced screen reader support' },
        { value: 'keyboard-only', label: 'Keyboard Only', description: 'Must work with keyboard navigation only' },
        { value: 'touch-only', label: 'Touch Only', description: 'Designed for touch-only devices' },
        { value: 'high-dpi', label: 'High DPI Support', description: 'Optimized for high-resolution displays' }
      ]
    }

  ]
};

// ===== Data Visualization Form =====
export const DATA_VIZ_FORM: CategoryForm = {
  categoryId: 'data-viz',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'chartType',
      type: 'select',
      label: 'Chart Type *',
      required: true,
      description: 'What type of data visualization do you need?',
      options: [
        { value: 'bar-chart', label: 'Bar Chart', description: 'Compare categories or show changes over time' },
        { value: 'line-chart', label: 'Line Chart', description: 'Show trends and changes over time' },
        { value: 'pie-chart', label: 'Pie Chart', description: 'Show parts of a whole' },
        { value: 'donut-chart', label: 'Donut Chart', description: 'Modern pie chart with center space' },
        { value: 'area-chart', label: 'Area Chart', description: 'Show volume and trends over time' },
        { value: 'scatter-plot', label: 'Scatter Plot', description: 'Show correlation between variables' },
        { value: 'heatmap', label: 'Heatmap', description: 'Show data density with colors' },
        { value: 'treemap', label: 'Treemap', description: 'Hierarchical data with nested rectangles' },
        { value: 'funnel-chart', label: 'Funnel Chart', description: 'Show process stages and conversion' },
        { value: 'gauge-meter', label: 'Gauge/Meter', description: 'Show single value progress' },
        { value: 'dashboard', label: 'Dashboard', description: 'Multiple charts combined' },
        { value: 'infographic', label: 'Infographic', description: 'Visual story with data and graphics' },
        { value: 'comparison', label: 'Comparison Chart', description: 'Side-by-side data comparison' },
        { value: 'timeline', label: 'Timeline', description: 'Chronological data visualization' }
      ]
    },
    {
      id: 'dataTopic',
      type: 'textarea',
      label: 'Data Description *',
      required: true,
      placeholder: 'Monthly sales revenue by product category showing growth from Q1 to Q4, with Technology leading at $2.5M, followed by Healthcare at $1.8M, and Education at $1.2M',
      description: 'Describe the data you want to visualize in detail',
      validation: { min: 20, max: 400, message: 'Description should be between 20-400 characters' }
    },
    {
      id: 'timeSeriesType',
      type: 'select',
      label: 'Time Series Type',
      description: 'For time-based data, specify the time period to ensure all data points are included',
      conditional: {
        dependsOn: 'chartType',
        showWhen: ['line-chart', 'bar-chart', 'area-chart', 'timeline']
      },
      options: [
        { value: 'daily', label: 'Daily', description: 'Day-by-day data points' },
        { value: 'weekly', label: 'Weekly', description: 'Week-by-week data points' },
        { value: 'monthly', label: 'Monthly', description: 'Month-by-month data points (all 12 months)' },
        { value: 'quarterly', label: 'Quarterly', description: 'Quarter-by-quarter data points (Q1-Q4)' },
        { value: 'yearly', label: 'Yearly', description: 'Year-by-year data points' },
        { value: 'custom', label: 'Custom', description: 'Custom time intervals' }
      ]
    },
    {
      id: 'dataCompleteness',
      type: 'select',
      label: 'Data Completeness',
      description: 'Specify how to handle missing data points',
      options: [
        { value: 'complete', label: 'Complete Dataset', description: 'All data points are available and should be shown' },
        { value: 'fill-zeros', label: 'Fill Missing with Zeros', description: 'Replace missing data points with zeros' },
        { value: 'interpolate', label: 'Interpolate Missing Values', description: 'Estimate missing values based on surrounding data' },
        { value: 'skip-missing', label: 'Skip Missing Values', description: 'Only show available data points' },
        { value: 'highlight-missing', label: 'Highlight Missing Values', description: 'Show gaps and highlight where data is missing' }
      ],
      defaultValue: 'complete'
    },
    {
      id: 'dataRange',
      type: 'text',
      label: 'Data Range',
      description: 'Specify the range of your data (e.g., "Jan 2023 to Dec 2023" or "Q1-Q4 2023")',
      placeholder: 'Jan 2023 to Dec 2023'
    },
    {
      id: 'analysisGoal',
      type: 'select',
      label: 'Analysis Goal',
      description: 'What insight are you trying to communicate?',
      options: [
        { value: 'trend', label: 'Show Trend', description: 'Highlight changes over time' },
        { value: 'comparison', label: 'Compare Categories', description: 'Compare different categories or groups' },
        { value: 'composition', label: 'Show Composition', description: 'Show how parts make up a whole' },
        { value: 'distribution', label: 'Show Distribution', description: 'Display range and frequency of values' },
        { value: 'correlation', label: 'Show Correlation', description: 'Demonstrate relationship between variables' },
        { value: 'ranking', label: 'Show Ranking', description: 'Order items by performance or value' }
      ]
    },
    {
      id: 'chartStyle',
      type: 'visual-cards',
      label: 'Chart Style *',
      required: true,
      description: 'Choose the visual approach',
      options: [
        { value: 'professional-clean', label: 'Professional Clean', description: 'Business presentation style' },
        { value: 'modern-gradient', label: 'Modern Gradient', description: 'Contemporary with gradients' },
        { value: 'minimalist', label: 'Minimalist', description: 'Simple, uncluttered design' },
        { value: 'colorful-vibrant', label: 'Colorful Vibrant', description: 'Bright, engaging colors' },
        { value: 'dark-theme', label: 'Dark Theme', description: 'Dark background, light elements' },
        { value: 'hand-drawn', label: 'Hand-Drawn', description: 'Sketch-like, artistic style' },
        { value: 'isometric-3d', label: 'Isometric 3D', description: '3D perspective charts' },
        { value: 'flat-design', label: 'Flat Design', description: 'Clean, flat visual style' }
      ]
    },
    {
      id: 'colorPalette',
      type: 'visual-cards',
      label: 'Color Palette *',
      required: true,
      description: 'Select the color scheme for your data',
      options: [
        { value: 'corporate-blue', label: 'Corporate Blue', description: 'Professional blue variations' },
        { value: 'rainbow-spectrum', label: 'Rainbow Spectrum', description: 'Full color spectrum' },
        { value: 'earth-tones', label: 'Earth Tones', description: 'Natural, muted colors' },
        { value: 'cool-blues', label: 'Cool Blues & Greens', description: 'Calming cool tones' },
        { value: 'warm-sunset', label: 'Warm Sunset', description: 'Reds, oranges, yellows' },
        { value: 'monochrome', label: 'Monochrome', description: 'Single color variations' },
        { value: 'brand-colors', label: 'Brand Colors', description: 'Company color scheme' },
        { value: 'accessible', label: 'Accessible', description: 'Colorblind-friendly palette' },
        { value: 'trend', label: 'Trend Analysis', description: 'Optimized for trend visualization' },
        { value: 'comparison', label: 'Comparison', description: 'Optimized for comparisons' },
        { value: 'correlation', label: 'Correlation', description: 'Optimized for correlation analysis' },
        { value: 'distribution', label: 'Distribution', description: 'Optimized for distribution analysis' },
        { value: 'seasonal', label: 'Seasonal', description: 'Colors representing seasons/cycles' },
        { value: 'performance', label: 'Performance', description: 'Performance-based color gradients' },
        { value: 'financial', label: 'Financial', description: 'Green/red for gains/losses' },
        { value: 'categorical', label: 'Categorical', description: 'Distinct colors for categories' },
        { value: 'heatmap', label: 'Heatmap', description: 'Gradient colors for intensity' }
      ]
    },
    {
      id: 'visualStyle',
      type: 'select',
      label: 'Visual Style',
      description: 'Choose the overall visual aesthetic',
      options: [
        { value: 'modern', label: 'Modern', description: 'Clean, minimalist design' },
        { value: 'classic', label: 'Classic', description: 'Traditional chart styling' },
        { value: 'elegant', label: 'Elegant', description: 'Sophisticated, refined appearance' },
        { value: 'bold', label: 'Bold', description: 'High-contrast, impactful design' },
        { value: 'soft', label: 'Soft', description: 'Gentle, muted styling' },
        { value: 'technical', label: 'Technical', description: 'Precise, analytical appearance' },
        { value: 'creative', label: 'Creative', description: 'Artistic, expressive design' },
        { value: 'minimal', label: 'Minimal', description: 'Ultra-clean, simplified styling' }
      ]
    },
    {
      id: 'aspectRatio',
      type: 'select',
      label: 'Aspect Ratio',
      description: 'Choose the optimal aspect ratio for your chart type',
      options: [
        { value: 'auto', label: 'Auto', description: 'Automatically optimized for chart type' },
        { value: '16:9', label: '16:9 (Widescreen)', description: 'Wide format, good for presentations' },
        { value: '4:3', label: '4:3 (Standard)', description: 'Traditional format, balanced' },
        { value: '1:1', label: '1:1 (Square)', description: 'Square format, good for social media' },
        { value: '3:2', label: '3:2 (Photo)', description: 'Photo-like proportions' },
        { value: '21:9', label: '21:9 (Ultra-wide)', description: 'Ultra-wide format for dashboards' },
        { value: '9:16', label: '9:16 (Vertical)', description: 'Vertical format for mobile' }
      ]
    },
    {
      id: 'dataQualityIndicators',
      type: 'select',
      label: 'Data Quality Indicators',
      description: 'Show visual indicators for data quality and confidence',
      options: [
        { value: 'none', label: 'None', description: 'No quality indicators' },
        { value: 'basic', label: 'Basic', description: 'Simple confidence indicators' },
        { value: 'detailed', label: 'Detailed', description: 'Comprehensive quality metrics' },
        { value: 'advanced', label: 'Advanced', description: 'Full statistical confidence analysis' }
      ]
    },
    {
      id: 'animationStyle',
      type: 'select',
      label: 'Animation Style',
      description: 'Choose how data appears and transitions',
      options: [
        { value: 'none', label: 'None', description: 'Static chart, no animations' },
        { value: 'subtle', label: 'Subtle', description: 'Gentle fade-in effects' },
        { value: 'smooth', label: 'Smooth', description: 'Smooth transitions and reveals' },
        { value: 'dynamic', label: 'Dynamic', description: 'Engaging, interactive animations' },
        { value: 'sequential', label: 'Sequential', description: 'Data points appear in sequence' }
      ]
    },
    {
      id: 'includeLabels',
      type: 'toggle',
      label: 'Include Data Labels',
      description: 'Show values directly on the chart',
      defaultValue: true
    },
    {
      id: 'chartTitle',
      type: 'text',
      label: 'Chart Title',
      placeholder: 'Q4 Revenue by Product Category',
      description: 'Optional title for your chart',
      validation: { max: 100, message: 'Title should be under 100 characters' }
    },
    {
      id: 'keyInsights',
      type: 'textarea',
      label: 'Key Insights',
      description: 'Important findings or insights you want to highlight in the visualization',
      placeholder: 'Revenue grew 15% in Q4, Technology category outperformed all others by 30%',
      validation: { max: 200, message: 'Insights should be under 200 characters' }
    },
    {
      id: 'textLanguage',
      type: 'language-select',
      label: 'Text Language *',
      required: true,
      description: 'Language for labels and text in the chart',
      defaultValue: 'en'
    },
  ]
};

// ===== Marketing Materials Form =====
export const MARKETING_FORM: CategoryForm = {
  categoryId: 'marketing',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'materialType',
      type: 'select',
      label: 'Material Type *',
      required: true,
      description: 'What marketing material do you need?',
      options: [
        { value: 'flyer', label: 'Flyer', description: 'Single-page promotional material' },
        { value: 'brochure', label: 'Brochure', description: 'Multi-fold informational material' },
        { value: 'business-card', label: 'Business Card', description: 'Professional contact card' },
        { value: 'poster', label: 'Poster', description: 'Large format promotional display' },
        { value: 'postcard', label: 'Postcard', description: 'Direct mail marketing card' },
        { value: 'rack-card', label: 'Rack Card', description: 'Standing display card' },
        { value: 'door-hanger', label: 'Door Hanger', description: 'Direct marketing door hanger' },
        { value: 'menu', label: 'Menu', description: 'Restaurant or service menu' },
        { value: 'catalog', label: 'Catalog', description: 'Product catalog page' },
        { value: 'newsletter', label: 'Newsletter', description: 'Email or print newsletter' },
        { value: 'event-invite', label: 'Event Invitation', description: 'Event or webinar invitation' },
        { value: 'coupon', label: 'Coupon', description: 'Discount or promotion coupon' },
        { value: 'cover-letter', label: 'Cover Letter', description: 'Professional job application cover letter design' },
        { value: 'wedding-invitation', label: 'Wedding Invitation', description: 'Elegant wedding ceremony invitations' },
        { value: 'birthday-invitation', label: 'Birthday Invitation', description: 'Birthday party invitation cards' },
        { value: 'corporate-invitation', label: 'Corporate Invitation', description: 'Business meeting or conference invitations' },
        { value: 'graduation-invitation', label: 'Graduation Invitation', description: 'Graduation ceremony invitations' },
        { value: 'baby-shower-invitation', label: 'Baby Shower Invitation', description: 'Baby shower celebration invitations' },
        { value: 'holiday-card', label: 'Holiday Card', description: 'Seasonal holiday greeting cards' },
        { value: 'anniversary-invitation', label: 'Anniversary Invitation', description: 'Anniversary celebration invitations' },
        { value: 'retirement-invitation', label: 'Retirement Invitation', description: 'Retirement party invitations' },
        { value: 'housewarming-invitation', label: 'Housewarming Invitation', description: 'New home celebration invitations' },
        { value: 'fundraising-invitation', label: 'Fundraising Invitation', description: 'Charity or fundraising event invitations' },
        { value: 'product-launch-invitation', label: 'Product Launch Invitation', description: 'Product unveiling event invitations' },
        { value: 'conference-badge', label: 'Conference Badge', description: 'Professional conference name badges' },
        { value: 'thank-you-card', label: 'Thank You Card', description: 'Appreciation and gratitude cards' },
        { value: 'save-the-date', label: 'Save the Date', description: 'Pre-event announcement cards' }
      ]
    },
    {
      id: 'industrySpecific',
      type: 'select',
      label: 'Industry Context',
      description: 'Select the industry or sector for tailored design approach',
      options: [
        { value: 'general', label: 'General Business', description: 'Universal business application' },
        { value: 'healthcare', label: 'Healthcare & Medical', description: 'Medical, dental, wellness industry' },
        { value: 'education', label: 'Education & Academic', description: 'Schools, universities, training centers' },
        { value: 'technology', label: 'Technology & IT', description: 'Software, tech companies, startups' },
        { value: 'finance', label: 'Finance & Banking', description: 'Financial services, accounting, insurance' },
        { value: 'real-estate', label: 'Real Estate', description: 'Property, construction, architecture' },
        { value: 'hospitality', label: 'Hospitality & Tourism', description: 'Hotels, restaurants, travel services' },
        { value: 'retail', label: 'Retail & E-commerce', description: 'Stores, online businesses, fashion' },
        { value: 'legal', label: 'Legal Services', description: 'Law firms, legal consultancy' },
        { value: 'nonprofit', label: 'Non-profit & NGO', description: 'Charities, foundations, social causes' },
        { value: 'entertainment', label: 'Entertainment & Media', description: 'Events, media, creative industries' },
        { value: 'automotive', label: 'Automotive', description: 'Car dealerships, auto services, transportation' },
        { value: 'beauty', label: 'Beauty & Wellness', description: 'Salons, spas, cosmetics, fitness' },
        { value: 'food-beverage', label: 'Food & Beverage', description: 'Restaurants, catering, food services' },
        { value: 'consulting', label: 'Consulting & Professional Services', description: 'Business consulting, advisory services' }
      ]
    },
    {
      id: 'formatSize',
      type: 'select',
      label: 'Format & Size',
      description: 'Choose the output format and size',
      options: [
        { value: 'standard-letter', label: 'Standard Letter (8.5" x 11")', description: 'US letter size for documents' },
        { value: 'a4-document', label: 'A4 Document (210mm x 297mm)', description: 'International A4 standard' },
        { value: 'invitation-5x7', label: '5" x 7" Invitation', description: 'Standard invitation card size' },
        { value: 'invitation-4x6', label: '4" x 6" Invitation', description: 'Compact invitation card' },
        { value: 'square-invitation', label: 'Square Invitation (5" x 5")', description: 'Modern square format' },
        { value: 'postcard-4x6', label: 'Postcard (4" x 6")', description: 'Standard postcard dimensions' },
        { value: 'greeting-card', label: 'Greeting Card (5" x 7")', description: 'Standard greeting card size' },
        { value: 'business-card', label: 'Business Card (3.5" x 2")', description: 'Standard business card' },
        { value: 'bookmark', label: 'Bookmark (2" x 6")', description: 'Promotional bookmark format' },
        { value: 'tent-card', label: 'Tent Card (4" x 6")', description: 'Folded table display card' },
        { value: 'digital-social', label: 'Digital Social Media', description: 'Optimized for online sharing' },
        { value: 'digital-email', label: 'Digital Email', description: 'Email newsletter format' },
        { value: 'large-poster', label: 'Large Poster (18" x 24")', description: 'Large format display' },
        { value: 'custom-size', label: 'Custom Size', description: 'Specify custom dimensions' }
      ]
    },
    {
      id: 'customDimensions',
      type: 'text',
      label: 'Custom Dimensions',
      placeholder: '8.5x11 inches or 1200x1600 pixels',
      description: 'Specify width x height with units (inches, cm, or pixels)',
      conditional: { dependsOn: 'formatSize', showWhen: ['custom-size'] }
    },
    {
      id: 'campaignGoal',
      type: 'select',
      label: 'Campaign Goal *',
      required: true,
      description: 'What is the primary objective?',
      options: [
        { value: 'brand-awareness', label: 'Brand Awareness', description: 'Increase visibility and recognition' },
        { value: 'lead-generation', label: 'Lead Generation', description: 'Capture customer information' },
        { value: 'sales-promotion', label: 'Sales Promotion', description: 'Drive immediate purchases' },
        { value: 'event-promotion', label: 'Event Promotion', description: 'Promote upcoming events' },
        { value: 'product-launch', label: 'Product Launch', description: 'Introduce new products' },
        { value: 'customer-retention', label: 'Customer Retention', description: 'Maintain existing customers' },
        { value: 'recruitment', label: 'Recruitment', description: 'Attract job candidates' },
        { value: 'education', label: 'Education', description: 'Inform and educate audience' }
      ]
    },
    {
      id: 'targetAudience',
      type: 'select',
      label: 'Target Audience *',
      required: true,
      description: 'Who is your primary audience?',
      options: [
        { value: 'business-professionals', label: 'Business Professionals', description: 'Corporate decision makers' },
        { value: 'small-business', label: 'Small Business Owners', description: 'Entrepreneurs and SMB owners' },
        { value: 'consumers-general', label: 'General Consumers', description: 'Everyday shoppers and users' },
        { value: 'young-adults', label: 'Young Adults (18-35)', description: 'Millennials and Gen Z' },
        { value: 'families', label: 'Families', description: 'Parents and family units' },
        { value: 'seniors', label: 'Seniors (55+)', description: 'Mature adult demographic' },
        { value: 'students', label: 'Students', description: 'College and university students' },
        { value: 'healthcare', label: 'Healthcare Professionals', description: 'Medical and wellness industry' },
        { value: 'tech-industry', label: 'Tech Industry', description: 'IT and technology professionals' }
      ]
    },
    {
      id: 'contentDescription',
      type: 'textarea',
      label: 'Content Description *',
      required: true,
      placeholder: 'Promoting our new cloud software solution for small businesses. Highlighting 30% cost savings, 24/7 support, and easy setup. Include call-to-action for free trial.',
      description: 'Describe the content, key messages, and call-to-action',
      validation: { min: 30, max: 400, message: 'Description should be between 30-400 characters' }
    },
    {
      id: 'designStyle',
      type: 'visual-cards',
      label: 'Design Style *',
      required: true,
      description: 'Choose the visual approach',
      options: [
        { value: 'professional-corporate', label: 'Professional Corporate', description: 'Clean, business-appropriate' },
        { value: 'modern-trendy', label: 'Modern Trendy', description: 'Contemporary, eye-catching' },
        { value: 'luxury-premium', label: 'Luxury Premium', description: 'High-end, sophisticated' },
        { value: 'fun-playful', label: 'Fun Playful', description: 'Colorful, energetic' },
        { value: 'minimalist-clean', label: 'Minimalist Clean', description: 'Simple, uncluttered' },
        { value: 'bold-impactful', label: 'Bold Impactful', description: 'Strong, attention-grabbing' },
        { value: 'vintage-retro', label: 'Vintage Retro', description: 'Classic, nostalgic styling' },
        { value: 'tech-futuristic', label: 'Tech Futuristic', description: 'High-tech, modern' }
      ]
    },
    {
      id: 'colorScheme',
      type: 'visual-cards',
      label: 'Color Scheme *',
      required: true,
      description: 'Select the color palette',
      options: [
        { value: 'brand-colors', label: 'Brand Colors', description: 'Company color scheme' },
        { value: 'blue-trust', label: 'Blue Trust', description: 'Professional blue tones' },
        { value: 'green-growth', label: 'Green Growth', description: 'Success and growth greens' },
        { value: 'red-urgency', label: 'Red Urgency', description: 'Attention-grabbing reds' },
        { value: 'orange-energy', label: 'Orange Energy', description: 'Vibrant, energetic oranges' },
        { value: 'purple-luxury', label: 'Purple Luxury', description: 'Premium purple tones' },
        { value: 'black-white', label: 'Black & White', description: 'Classic monochrome' },
        { value: 'warm-friendly', label: 'Warm Friendly', description: 'Welcoming warm tones' }
      ]
    },

  ]
};

// ===== Banners & Headers Form =====
export const BANNERS_FORM: CategoryForm = {
  categoryId: 'banners',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'bannerType',
      type: 'select',
      label: 'Banner Type *',
      required: true,
      description: 'What type of banner do you need?',
      options: [
        { value: 'website-header', label: 'Website Header', description: 'Main page header banner' },
        { value: 'social-cover', label: 'Social Media Cover', description: 'Profile cover photos' },
        { value: 'event-banner', label: 'Event Banner', description: 'Conference, webinar, or event promotion' },
        { value: 'display-ad', label: 'Display Ad', description: 'Online advertising banners' },
        { value: 'email-header', label: 'Email Header', description: 'Newsletter and email templates' },
        { value: 'trade-show', label: 'Trade Show Banner', description: 'Physical event displays' },
        { value: 'store-front', label: 'Store Front Banner', description: 'Retail and business signage' },
        { value: 'youtube-channel', label: 'YouTube Channel Art', description: 'Channel header design' }
      ]
    },
    {
      id: 'dimensions',
      type: 'select',
      label: 'Dimensions *',
      required: true,
      description: 'Select the banner size',
      options: [
        { value: 'facebook-cover', label: 'Facebook Cover (1200x315)', description: 'Standard Facebook cover photo' },
        { value: 'linkedin-cover', label: 'LinkedIn Cover (1584x396)', description: 'LinkedIn personal/company cover' },
        { value: 'twitter-header', label: 'Twitter Header (1500x500)', description: 'Twitter/X profile header' },
        { value: 'youtube-art', label: 'YouTube Art (2560x1440)', description: 'YouTube channel banner' },
        { value: 'website-hero', label: 'Website Hero (1920x600)', description: 'Full-width website header' },
        { value: 'leaderboard', label: 'Leaderboard (728x90)', description: 'Web advertising banner' },
        { value: 'billboard', label: 'Billboard (970x250)', description: 'Large web ad banner' },
        { value: 'custom', label: 'Custom Size', description: 'Specify custom dimensions' }
      ]
    },
    {
      id: 'customDimensions',
      type: 'text',
      label: 'Custom Dimensions',
      placeholder: '1200x400',
      description: 'Enter width x height (e.g., 1200x400)',
      conditional: { dependsOn: 'dimensions', showWhen: ['custom'] }
    },
    {
      id: 'bannerPurpose',
      type: 'textarea',
      label: 'Banner Purpose *',
      required: true,
      placeholder: 'Welcome banner for our annual tech conference, highlighting keynote speakers and early bird registration discount',
      description: 'Describe the banner purpose and key message',
      validation: { min: 20, max: 300, message: 'Description should be between 20-300 characters' }
    },
    {
      id: 'visualStyle',
      type: 'visual-cards',
      label: 'Visual Style *',
      required: true,
      description: 'Choose the design aesthetic',
      options: [
        { value: 'professional-corporate', label: 'Professional Corporate', description: 'Clean, business-focused design' },
        { value: 'bold-impactful', label: 'Bold & Impactful', description: 'Strong, attention-grabbing design' },
        { value: 'modern-tech', label: 'Modern Tech', description: 'Sleek, technological aesthetic' },
        { value: 'creative-artistic', label: 'Creative Artistic', description: 'Unique, expressive design' },
        { value: 'minimalist-clean', label: 'Minimalist Clean', description: 'Simple, uncluttered layout' },
        { value: 'vibrant-energetic', label: 'Vibrant Energetic', description: 'Bright, dynamic design' }
      ]
    },

  ]
};

// ===== Illustrations & Art Form =====
export const ILLUSTRATIONS_FORM: CategoryForm = {
  categoryId: 'illustrations',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'illustrationType',
      type: 'select',
      label: 'Illustration Type *',
      required: true,
      description: 'What type of illustration do you need?',
      options: [
        { value: 'character-design', label: 'Character Design', description: 'People, mascots, or fictional characters' },
        { value: 'scene-illustration', label: 'Scene Illustration', description: 'Complete environments or scenarios' },
        { value: 'concept-art', label: 'Concept Art', description: 'Visual concepts for products or ideas' },
        { value: 'storyboard', label: 'Storyboard', description: 'Sequential visual narrative' },
        { value: 'technical-diagram', label: 'Technical Diagram', description: 'Instructional or educational visuals' },
        { value: 'editorial-art', label: 'Editorial Art', description: 'Article or blog post illustrations' },
        { value: 'book-cover', label: 'Book Cover Art', description: 'Cover design for books or ebooks' },
        { value: 'pattern-design', label: 'Pattern Design', description: 'Repeating decorative patterns' },
        { value: 'infographic', label: 'Infographic', description: 'Data visualization and information graphics' },
        { value: 'icon-illustration', label: 'Icon Illustration', description: 'Detailed illustrative icons' }
      ]
    },
    {
      id: 'illustrationPurpose',
      type: 'select',
      label: 'Intended Use *',
      required: true,
      description: 'How will this illustration be used?',
      options: [
        { value: 'website-digital', label: 'Website/Digital', description: 'Online use, web graphics' },
        { value: 'print-materials', label: 'Print Materials', description: 'Brochures, flyers, books' },
        { value: 'social-media', label: 'Social Media', description: 'Posts, stories, profiles' },
        { value: 'presentations', label: 'Presentations', description: 'Slides, pitch decks' },
        { value: 'merchandise', label: 'Merchandise', description: 'T-shirts, mugs, products' },
        { value: 'app-ui', label: 'App/UI Design', description: 'Mobile apps, software interfaces' },
        { value: 'marketing-advertising', label: 'Marketing/Advertising', description: 'Campaigns, promotions' },
        { value: 'educational-content', label: 'Educational Content', description: 'Tutorials, courses, guides' }
      ]
    },
    {
      id: 'targetAudience',
      type: 'select',
      label: 'Target Audience *',
      required: true,
      description: 'Who is the primary audience for this illustration?',
      options: [
        { value: 'children', label: 'Children (3-12)', description: 'Young kids, playful and colorful' },
        { value: 'teenagers', label: 'Teenagers (13-19)', description: 'Youth, trendy and dynamic' },
        { value: 'young-adults', label: 'Young Adults (20-35)', description: 'Modern, tech-savvy audience' },
        { value: 'professionals', label: 'Business Professionals', description: 'Corporate, sophisticated audience' },
        { value: 'general-public', label: 'General Public', description: 'Broad, universal appeal' },
        { value: 'seniors', label: 'Seniors (55+)', description: 'Mature, traditional preferences' },
        { value: 'creative-industry', label: 'Creative Industry', description: 'Designers, artists, creatives' },
        { value: 'technical-audience', label: 'Technical Audience', description: 'Engineers, developers, tech workers' }
      ]
    },
    {
      id: 'artStyle',
      type: 'visual-cards',
      label: 'Art Style *',
      required: true,
      description: 'Select the artistic approach',
      options: [
        { value: 'realistic', label: 'Realistic', description: 'Detailed, lifelike rendering' },
        { value: 'cartoon-stylized', label: 'Cartoon/Stylized', description: 'Simplified, expressive style' },
        { value: 'anime-manga', label: 'Anime/Manga', description: 'Japanese animation style' },
        { value: 'watercolor', label: 'Watercolor', description: 'Soft, flowing watercolor effect' },
        { value: 'vector-flat', label: 'Vector/Flat', description: 'Clean, geometric vector style' },
        { value: 'hand-drawn', label: 'Hand Drawn', description: 'Sketchy, artistic line work' },
        { value: 'digital-painting', label: 'Digital Painting', description: 'Rich, painterly digital art' },
        { value: 'minimalist', label: 'Minimalist', description: 'Simple, essential elements only' }
      ]
    },
    {
      id: 'illustrationDescription',
      type: 'textarea',
      label: 'Illustration Description *',
      required: true,
      placeholder: 'A friendly female software developer in her 20s, sitting at a modern desk with dual monitors, coding in a bright, contemporary office with plants and natural lighting',
      description: 'Describe the illustration in detail',
      validation: { min: 30, max: 400, message: 'Description should be between 30-400 characters' }
    },
    {
      id: 'specificElements',
      type: 'textarea',
      label: 'Specific Elements to Include',
      placeholder: 'Must include: company logo, specific objects, text elements, symbols, etc.',
      description: 'List any specific elements that must be included in the illustration',
      validation: { max: 300, message: 'Elements description should be under 300 characters' }
    },
    {
      id: 'textContent',
      type: 'textarea',
      label: 'Text Content',
      placeholder: 'Any text that should appear in the illustration',
      description: 'Enter any text that should be included in the illustration',
      validation: { max: 200, message: 'Text content should be under 200 characters' },
      conditional: { dependsOn: 'illustrationType', showWhen: ['infographic', 'editorial-art', 'technical-diagram'] }
    },
    {
      id: 'dimensions',
      type: 'select',
      label: 'Output Dimensions *',
      required: true,
      description: 'Choose the output size and format',
      options: [
        { value: 'square-1080', label: 'Square (1080x1080)', description: 'Social media posts, Instagram' },
        { value: 'landscape-1920', label: 'Landscape (1920x1080)', description: 'Website headers, presentations' },
        { value: 'portrait-1080', label: 'Portrait (1080x1920)', description: 'Stories, mobile screens' },
        { value: 'print-letter', label: 'Print Letter (8.5x11")', description: 'Standard print documents' },
        { value: 'print-a4', label: 'Print A4 (210x297mm)', description: 'International print standard' },
        { value: 'book-cover', label: 'Book Cover (6x9")', description: 'Standard book cover size' },
        { value: 'banner-web', label: 'Web Banner (1200x300)', description: 'Website banners, headers' },
        { value: 'custom-size', label: 'Custom Size', description: 'Specify custom dimensions' }
      ]
    },
    {
      id: 'customDimensions',
      type: 'text',
      label: 'Custom Dimensions',
      placeholder: '1200x800 pixels or 5x7 inches',
      description: 'Specify width x height with units (pixels, inches, or cm)',
      conditional: { dependsOn: 'dimensions', showWhen: ['custom-size'] }
    },
    {
      id: 'colorPalette',
      type: 'visual-cards',
      label: 'Color Palette *',
      required: true,
      description: 'Choose the color scheme',
      options: [
        { value: 'vibrant-colorful', label: 'Vibrant & Colorful', description: 'Rich, saturated colors' },
        { value: 'pastel-soft', label: 'Pastel & Soft', description: 'Light, gentle color palette' },
        { value: 'earth-natural', label: 'Earth & Natural', description: 'Organic, nature-inspired tones' },
        { value: 'monochromatic', label: 'Monochromatic', description: 'Single color with variations' },
        { value: 'warm-tones', label: 'Warm Tones', description: 'Reds, oranges, yellows' },
        { value: 'cool-tones', label: 'Cool Tones', description: 'Blues, greens, purples' },
        { value: 'brand-colors', label: 'Brand Colors', description: 'Use specific brand colors' }
      ]
    },
    {
      id: 'brandColorValues',
      type: 'text',
      label: 'Brand Color Values',
      placeholder: '#1a365d, #2d3748, #ffffff',
      description: 'Enter your brand colors as hex codes',
      validation: { max: 100, message: 'Brand colors should be under 100 characters' },
      conditional: { dependsOn: 'colorPalette', showWhen: ['brand-colors'] }
    },
    {
      id: 'mood',
      type: 'select',
      label: 'Mood/Atmosphere *',
      required: true,
      description: 'What emotional tone should the illustration convey?',
      options: [
        { value: 'cheerful-upbeat', label: 'Cheerful & Upbeat', description: 'Happy, positive energy' },
        { value: 'calm-peaceful', label: 'Calm & Peaceful', description: 'Serene, tranquil atmosphere' },
        { value: 'professional-serious', label: 'Professional & Serious', description: 'Business-focused tone' },
        { value: 'mysterious-dramatic', label: 'Mysterious & Dramatic', description: 'Intriguing, intense mood' },
        { value: 'playful-fun', label: 'Playful & Fun', description: 'Light-hearted, entertaining' },
        { value: 'inspirational', label: 'Inspirational', description: 'Motivating, aspirational' },
        { value: 'modern-sleek', label: 'Modern & Sleek', description: 'Contemporary, sophisticated' },
        { value: 'warm-friendly', label: 'Warm & Friendly', description: 'Approachable, welcoming' }
      ]
    },
    {
      id: 'complexity',
      type: 'select',
      label: 'Detail Level',
      description: 'How detailed should the illustration be?',
      options: [
        { value: 'simple-minimal', label: 'Simple & Minimal', description: 'Clean, basic elements only' },
        { value: 'moderate-detail', label: 'Moderate Detail', description: 'Balanced complexity' },
        { value: 'highly-detailed', label: 'Highly Detailed', description: 'Rich, intricate artwork' },
        { value: 'photorealistic', label: 'Photorealistic', description: 'Maximum detail and realism' }
      ]
    }
  ]
};

// ===== Product Mockups Form =====
export const PRODUCT_MOCKUPS_FORM: CategoryForm = {
  categoryId: 'product-mockups',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'productType',
      type: 'select',
      label: 'Product Type *',
      required: true,
      description: 'What product do you want to mockup?',
      options: [
        { value: 'apparel', label: 'Apparel', description: 'T-shirts, hoodies, hats, clothing' },
        { value: 'accessories', label: 'Accessories', description: 'Bags, jewelry, watches' },
        { value: 'drinkware', label: 'Drinkware', description: 'Mugs, bottles, cups' },
        { value: 'stationery', label: 'Stationery', description: 'Notebooks, pens, office supplies' },
        { value: 'electronics', label: 'Electronics', description: 'Phone cases, laptop sleeves, gadgets' },
        { value: 'home-decor', label: 'Home Decor', description: 'Pillows, wall art, decorative items' },
        { value: 'packaging', label: 'Packaging', description: 'Boxes, bags, product containers' },
        { value: 'books-media', label: 'Books & Media', description: 'Books, magazines, CDs, DVDs' },
        { value: 'signage', label: 'Signage', description: 'Posters, banners, signs' },
        { value: 'tech-devices', label: 'Tech Devices', description: 'Tablets, phones, laptops' }
      ]
    },
    {
      id: 'specificProduct',
      type: 'text',
      label: 'Specific Product *',
      required: true,
      placeholder: 'Black crew neck t-shirt',
      description: 'Describe the exact product (color, style, material)',
      validation: { min: 5, max: 100, message: 'Product description should be 5-100 characters' }
    },
    {
      id: 'productBrand',
      type: 'text',
      label: 'Product Brand/Name',
      placeholder: 'Nike, Apple, Custom Brand',
      description: 'Brand name or product line (if applicable)',
      validation: { max: 50, message: 'Brand name should be under 50 characters' }
    },
    {
      id: 'designUpload',
      type: 'upload',
      label: 'Design to Apply',
      description: 'Upload your logo, artwork, or design that will be applied to the product',
      accept: 'image/*',
      maxFiles: 3,
      multiple: true
    },
    {
      id: 'designDescription',
      type: 'textarea',
      label: 'Design Description *',
      required: true,
      placeholder: 'Minimalist logo design with company name in modern sans-serif font, positioned center chest, white text on black shirt',
      description: 'Describe the design that will be applied to the product',
      validation: { min: 20, max: 300, message: 'Design description should be 20-300 characters' }
    },
    {
      id: 'designPlacement',
      type: 'select',
      label: 'Design Placement *',
      required: true,
      description: 'Where should the design be positioned on the product?',
      options: [
        { value: 'center-front', label: 'Center Front', description: 'Main front center position' },
        { value: 'left-chest', label: 'Left Chest', description: 'Small logo placement on left chest' },
        { value: 'full-front', label: 'Full Front', description: 'Large design covering front area' },
        { value: 'back-center', label: 'Back Center', description: 'Center of back panel' },
        { value: 'sleeve', label: 'Sleeve', description: 'On sleeve or arm area' },
        { value: 'all-over', label: 'All Over', description: 'Pattern covering entire product' },
        { value: 'bottom-corner', label: 'Bottom Corner', description: 'Small corner placement' },
        { value: 'custom-position', label: 'Custom Position', description: 'Specify exact placement' }
      ]
    },
    {
      id: 'customPlacement',
      type: 'text',
      label: 'Custom Placement Details',
      placeholder: 'Top right corner, 2 inches from edge',
      description: 'Describe the exact placement for your design',
      conditional: { dependsOn: 'designPlacement', showWhen: ['custom-position'] }
    },
    {
      id: 'mockupPurpose',
      type: 'select',
      label: 'Mockup Purpose *',
      required: true,
      description: 'How will this mockup be used?',
      options: [
        { value: 'ecommerce-listing', label: 'E-commerce Listing', description: 'Online store product photos' },
        { value: 'marketing-materials', label: 'Marketing Materials', description: 'Ads, brochures, promotions' },
        { value: 'social-media', label: 'Social Media', description: 'Posts, stories, advertising' },
        { value: 'client-presentation', label: 'Client Presentation', description: 'Showing designs to clients' },
        { value: 'portfolio-showcase', label: 'Portfolio Showcase', description: 'Designer portfolio display' },
        { value: 'print-advertising', label: 'Print Advertising', description: 'Magazines, newspapers, flyers' },
        { value: 'website-display', label: 'Website Display', description: 'Company website, landing pages' },
        { value: 'concept-visualization', label: 'Concept Visualization', description: 'Design concept exploration' }
      ]
    },
    {
      id: 'mockupStyle',
      type: 'visual-cards',
      label: 'Mockup Style *',
      required: true,
      description: 'Choose the presentation style',
      options: [
        { value: 'lifestyle', label: 'Lifestyle', description: 'Product in real-world context with models' },
        { value: 'flat-lay', label: 'Flat Lay', description: 'Product laid flat from above' },
        { value: 'studio-clean', label: 'Studio Clean', description: 'Professional studio photography' },
        { value: 'in-use', label: 'In Use', description: 'Product being used or worn' },
        { value: 'multiple-angles', label: 'Multiple Angles', description: 'Different viewpoints of the product' },
        { value: 'environmental', label: 'Environmental', description: 'Product in specific setting/environment' }
      ]
    },
    {
      id: 'targetAudience',
      type: 'select',
      label: 'Target Audience',
      description: 'Who is the target customer for this product?',
      options: [
        { value: 'young-adults', label: 'Young Adults (18-35)', description: 'Trendy, modern audience' },
        { value: 'professionals', label: 'Business Professionals', description: 'Corporate, sophisticated buyers' },
        { value: 'families', label: 'Families', description: 'Parents and family-oriented customers' },
        { value: 'teens', label: 'Teenagers', description: 'Youth market, trendy styles' },
        { value: 'luxury-buyers', label: 'Luxury Buyers', description: 'High-end, premium market' },
        { value: 'eco-conscious', label: 'Eco-Conscious', description: 'Sustainability-focused consumers' },
        { value: 'tech-enthusiasts', label: 'Tech Enthusiasts', description: 'Technology-focused customers' },
        { value: 'general-market', label: 'General Market', description: 'Broad consumer appeal' }
      ]
    },
    {
      id: 'background',
      type: 'select',
      label: 'Background *',
      required: true,
      description: 'Choose the background setting',
      options: [
        { value: 'white-clean', label: 'White Clean', description: 'Pure white, professional background' },
        { value: 'lifestyle-home', label: 'Lifestyle Home', description: 'Cozy home environment' },
        { value: 'office-workplace', label: 'Office Workplace', description: 'Professional work setting' },
        { value: 'outdoor-natural', label: 'Outdoor Natural', description: 'Nature or outdoor environment' },
        { value: 'urban-city', label: 'Urban City', description: 'Street, cafe, or city environment' },
        { value: 'textured', label: 'Textured', description: 'Wood, marble, or textured surface' },
        { value: 'gradient', label: 'Gradient', description: 'Smooth color transition background' },
        { value: 'transparent', label: 'Transparent', description: 'No background for versatile use' }
      ]
    },
    {
      id: 'lightingStyle',
      type: 'select',
      label: 'Lighting Style',
      description: 'What type of lighting should be used?',
      options: [
        { value: 'natural-soft', label: 'Natural Soft', description: 'Soft, natural lighting' },
        { value: 'studio-professional', label: 'Studio Professional', description: 'Controlled studio lighting' },
        { value: 'dramatic-shadow', label: 'Dramatic Shadow', description: 'Strong shadows and contrast' },
        { value: 'bright-even', label: 'Bright Even', description: 'Evenly lit, minimal shadows' },
        { value: 'warm-cozy', label: 'Warm Cozy', description: 'Warm, inviting atmosphere' },
        { value: 'cool-modern', label: 'Cool Modern', description: 'Cool, contemporary lighting' }
      ]
    },
    {
      id: 'additionalProps',
      type: 'textarea',
      label: 'Additional Props/Elements',
      placeholder: 'Coffee cup, laptop, plants, books, etc.',
      description: 'List any additional items that should appear in the scene',
      validation: { max: 200, message: 'Props description should be under 200 characters' }
    },
    {
      id: 'colorVariations',
      type: 'multiselect',
      label: 'Product Color Variations',
      description: 'Show the product in multiple colors (optional)',
      multiple: true,
      options: [
        { value: 'black', label: 'Black', description: 'Classic black version' },
        { value: 'white', label: 'White', description: 'Clean white version' },
        { value: 'navy', label: 'Navy Blue', description: 'Professional navy option' },
        { value: 'gray', label: 'Gray', description: 'Neutral gray version' },
        { value: 'red', label: 'Red', description: 'Bold red option' },
        { value: 'blue', label: 'Blue', description: 'Classic blue version' },
        { value: 'green', label: 'Green', description: 'Fresh green option' },
        { value: 'custom-colors', label: 'Custom Colors', description: 'Specify custom color palette' }
      ]
    },
    {
      id: 'customColors',
      type: 'text',
      label: 'Custom Color Values',
      placeholder: '#1a365d, #2d3748, #e53e3e',
      description: 'Enter custom colors as hex codes',
      validation: { max: 100, message: 'Custom colors should be under 100 characters' },
      conditional: { dependsOn: 'colorVariations', showWhen: ['custom-colors'] }
    },
    {
      id: 'outputFormat',
      type: 'select',
      label: 'Output Format *',
      required: true,
      description: 'Choose the final image format and orientation',
      options: [
        { value: 'square-1080', label: 'Square (1080x1080)', description: 'Social media posts, Instagram' },
        { value: 'landscape-1920', label: 'Landscape (1920x1080)', description: 'Website banners, presentations' },
        { value: 'portrait-1080', label: 'Portrait (1080x1920)', description: 'Stories, mobile displays' },
        { value: 'ecommerce-standard', label: 'E-commerce Standard (1200x1200)', description: 'Online store listings' },
        { value: 'print-quality', label: 'Print Quality (300 DPI)', description: 'High resolution for printing' },
        { value: 'web-optimized', label: 'Web Optimized (72 DPI)', description: 'Fast loading for websites' }
      ]
    }
  ]
};

// ===== Business Documents Form =====
export const LETTERHEAD_FORM: CategoryForm = {
  categoryId: 'letterhead',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'documentType',
      type: 'select',
      label: 'Document Type *',
      required: true,
      description: 'What type of business document do you need?',
      options: [
        // Core Business Documents
        { value: 'letterhead', label: 'Professional Letterhead', description: 'Company letter template header with brand identity' },
        { value: 'invoice-template', label: 'Invoice Template', description: 'Billing and payment documents with professional formatting' },
        { value: 'proposal-cover', label: 'Business Proposal Cover', description: 'Professional proposal front page with corporate branding' },
        { value: 'presentation-template', label: 'Corporate Presentation Template', description: 'Executive slide deck template with brand consistency' },
        { value: 'memo-template', label: 'Internal Memo Template', description: 'Professional internal communication template' },
        { value: 'contract-header', label: 'Legal Contract Header', description: 'Legal document formatting with compliance standards' },
        { value: 'certificate', label: 'Professional Certificate', description: 'Awards, completion, or recognition certificates' },
        
        // Executive & Corporate Documents
        { value: 'annual-report-cover', label: 'Annual Report Cover', description: 'Corporate annual report front page with executive design' },
        { value: 'executive-summary', label: 'Executive Summary Template', description: 'High-level business summary document template' },
        { value: 'board-materials', label: 'Board Meeting Materials', description: 'Professional board meeting document templates' },
        { value: 'corporate-governance', label: 'Governance Document', description: 'Corporate governance and policy document templates' },
        { value: 'strategic-plan', label: 'Strategic Plan Template', description: 'Corporate strategic planning document template' },
        
        // Financial Documents
        { value: 'financial-statement', label: 'Financial Statement', description: 'Professional financial reporting document template' },
        { value: 'budget-report', label: 'Budget Report Template', description: 'Financial budget and forecasting document template' },
        { value: 'audit-report', label: 'Audit Report Template', description: 'Professional audit documentation template' },
        { value: 'investment-proposal', label: 'Investment Proposal', description: 'Investment opportunity presentation template' },
        
        // Compliance & Legal
        { value: 'compliance-report', label: 'Compliance Report', description: 'Regulatory compliance documentation template' },
        { value: 'policy-document', label: 'Policy Document', description: 'Corporate policy and procedure documentation' },
        { value: 'legal-brief', label: 'Legal Brief Template', description: 'Professional legal document template' },
        { value: 'regulatory-filing', label: 'Regulatory Filing', description: 'Government and regulatory submission template' },
        
        // Professional Communication
        { value: 'whitepaper', label: 'Professional Whitepaper', description: 'Industry expertise and thought leadership document' },
        { value: 'case-study', label: 'Business Case Study', description: 'Professional case study documentation template' },
        { value: 'technical-documentation', label: 'Technical Documentation', description: 'Professional technical specification template' },
        { value: 'project-report', label: 'Project Report Template', description: 'Professional project status and completion reports' },
        
        // International Business
        { value: 'international-agreement', label: 'International Agreement', description: 'Cross-border business agreement template' },
        { value: 'export-documentation', label: 'Export Documentation', description: 'International trade document template' },
        { value: 'multi-language-template', label: 'Multi-Language Template', description: 'International business document with language support' }
      ]
    },
    {
      id: 'complianceRequirements',
      type: 'multiselect',
      label: 'Compliance Requirements',
      description: 'Select applicable compliance standards and regulations',
      options: [
        { value: 'iso-9001', label: 'ISO 9001 (Quality Management)', description: 'International quality management standards' },
        { value: 'iso-14001', label: 'ISO 14001 (Environmental)', description: 'Environmental management system standards' },
        { value: 'iso-27001', label: 'ISO 27001 (Information Security)', description: 'Information security management standards' },
        { value: 'sox', label: 'SOX (Sarbanes-Oxley)', description: 'US corporate financial reporting compliance' },
        { value: 'gdpr', label: 'GDPR (Data Protection)', description: 'European data protection regulation compliance' },
        { value: 'hipaa', label: 'HIPAA (Healthcare)', description: 'Healthcare data privacy and security standards' },
        { value: 'pci-dss', label: 'PCI DSS (Payment Card)', description: 'Payment card industry data security standards' },
        { value: 'sec', label: 'SEC (Securities)', description: 'US Securities and Exchange Commission requirements' },
        { value: 'coso', label: 'COSO (Internal Control)', description: 'Committee of Sponsoring Organizations framework' },
        { value: 'basel-iii', label: 'Basel III (Banking)', description: 'International banking regulation standards' },
        { value: 'mifid-ii', label: 'MiFID II (Financial Services)', description: 'European financial services regulation' },
        { value: 'wcag', label: 'WCAG (Accessibility)', description: 'Web Content Accessibility Guidelines compliance' },
        { value: 'ada', label: 'ADA (Americans with Disabilities)', description: 'Accessibility compliance for US businesses' },
        { value: 'custom', label: 'Custom Compliance', description: 'Specify custom regulatory requirements' }
      ]
    },
    {
      id: 'customCompliance',
      type: 'textarea',
      label: 'Custom Compliance Requirements',
      description: 'Specify any additional compliance standards or regulatory requirements',
      placeholder: 'e.g., Industry-specific regulations, regional compliance standards, internal governance requirements',
      conditional: { dependsOn: 'complianceRequirements', showWhen: ['custom'] },
      validation: { max: 500, message: 'Compliance requirements should be under 500 characters' }
    },
    {
      id: 'securityClassification',
      type: 'select',
      label: 'Document Security Classification',
      description: 'Security level and handling requirements for the document',
      options: [
        { value: 'public', label: 'Public', description: 'Publicly available information' },
        { value: 'internal', label: 'Internal Use Only', description: 'For internal company use only' },
        { value: 'confidential', label: 'Confidential', description: 'Sensitive business information' },
        { value: 'restricted', label: 'Restricted', description: 'Highly sensitive, limited access' },
        { value: 'proprietary', label: 'Proprietary', description: 'Trade secrets and proprietary information' }
      ]
    },
    {
      id: 'auditRequirements',
      type: 'toggle',
      label: 'Audit Trail Required',
      description: 'Document requires audit trail and version control for compliance',
      defaultValue: false
    },
    {
      id: 'digitalSignature',
      type: 'toggle',
      label: 'Digital Signature Support',
      description: 'Document will require digital signature capabilities',
      defaultValue: false
    },
    {
      id: 'retentionPeriod',
      type: 'select',
      label: 'Document Retention Period',
      description: 'Required retention period for compliance and legal purposes',
      options: [
        { value: '1-year', label: '1 Year', description: 'Short-term retention' },
        { value: '3-years', label: '3 Years', description: 'Standard business retention' },
        { value: '5-years', label: '5 Years', description: 'Extended business retention' },
        { value: '7-years', label: '7 Years', description: 'Tax and financial record retention' },
        { value: '10-years', label: '10 Years', description: 'Long-term regulatory retention' },
        { value: 'permanent', label: 'Permanent', description: 'Permanent archive retention' },
        { value: 'custom', label: 'Custom Period', description: 'Specify custom retention period' }
      ]
    },
    {
      id: 'customRetention',
      type: 'text',
      label: 'Custom Retention Period',
      description: 'Specify the custom retention period and requirements',
      placeholder: 'e.g., 15 years, Until project completion, Per regulatory requirement',
      conditional: { dependsOn: 'retentionPeriod', showWhen: ['custom'] }
    },
    {
      id: 'companyName',
      type: 'text',
      label: 'Company Name *',
      required: true,
      placeholder: 'Acme Corporation',
      description: 'Your company or organization name',
      validation: { min: 2, max: 80, message: 'Company name should be 2-80 characters' }
    },
    {
      id: 'companyLogo',
      type: 'upload',
      label: 'Company Logo',
      description: 'Upload your existing company logo to incorporate into the design',
      accept: 'image/*',
      maxFiles: 1,
      multiple: false
    },
    {
      id: 'brandStyleGuide',
      type: 'upload',
      label: 'Brand Style Guide',
      description: 'Upload your brand style guide or brand guidelines document (PDF, DOC, or images)',
      accept: '.pdf,.doc,.docx,image/*',
      maxFiles: 3,
      multiple: true
    },
    {
      id: 'brandAssets',
      type: 'upload',
      label: 'Additional Brand Assets',
      description: 'Upload additional brand assets like patterns, textures, or supporting graphics',
      accept: 'image/*',
      maxFiles: 5,
      multiple: true
    },
    {
      id: 'brandIdentityLevel',
      type: 'select',
      label: 'Brand Identity Integration Level',
      description: 'How prominently should brand identity be featured?',
      options: [
        { value: 'minimal', label: 'Minimal Brand Presence', description: 'Subtle brand integration, focus on content' },
        { value: 'balanced', label: 'Balanced Integration', description: 'Equal emphasis on brand and content' },
        { value: 'prominent', label: 'Prominent Brand Display', description: 'Strong brand presence throughout document' },
        { value: 'dominant', label: 'Brand-Dominant Design', description: 'Brand identity drives the entire design' }
      ]
    },
    {
      id: 'multiBrandSupport',
      type: 'toggle',
      label: 'Multi-Brand Document',
      description: 'Document will feature multiple brands (partnerships, subsidiaries, etc.)',
      defaultValue: false
    },
    {
      id: 'secondaryBrands',
      type: 'textarea',
      label: 'Secondary Brand Information',
      description: 'Provide details about additional brands to be featured',
      placeholder: 'e.g., Partner company names, subsidiary brands, co-branding requirements',
      conditional: { dependsOn: 'multiBrandSupport', showWhen: [true, 'true'] },
      validation: { max: 300, message: 'Secondary brand info should be under 300 characters' }
    },
    {
      id: 'brandColors',
      type: 'color-palette',
      label: 'Primary Brand Colors',
      description: 'Define your primary brand color palette',
      maxColors: 5,
      defaultColors: ['#000000', '#ffffff']
    },
    {
      id: 'secondaryColors',
      type: 'color-palette',
      label: 'Secondary/Accent Colors',
      description: 'Additional colors for supporting elements and accents',
      maxColors: 3
    },
    {
      id: 'brandTypography',
      type: 'select',
      label: 'Brand Typography Style',
      description: 'Typography approach that aligns with your brand',
      options: [
        { value: 'modern-sans', label: 'Modern Sans-Serif', description: 'Clean, contemporary, professional' },
        { value: 'classic-serif', label: 'Classic Serif', description: 'Traditional, trustworthy, established' },
        { value: 'elegant-script', label: 'Elegant Script', description: 'Sophisticated, premium, luxury' },
        { value: 'bold-display', label: 'Bold Display', description: 'Strong, impactful, attention-grabbing' },
        { value: 'technical-mono', label: 'Technical Monospace', description: 'Technology, precision, data-focused' },
        { value: 'friendly-rounded', label: 'Friendly Rounded', description: 'Approachable, warm, casual' },
        { value: 'custom', label: 'Custom Typography', description: 'Specify custom font requirements' }
      ]
    },
    {
      id: 'customTypography',
      type: 'text',
      label: 'Custom Typography Requirements',
      description: 'Specify your custom font requirements or brand typography guidelines',
      placeholder: 'e.g., Helvetica Neue for headers, Times New Roman for body text',
      conditional: { dependsOn: 'brandTypography', showWhen: ['custom'] }
    },
    {
      id: 'brandPersonality',
      type: 'multiselect',
      label: 'Brand Personality Traits',
      description: 'Select traits that best describe your brand personality',
      options: [
        { value: 'professional', label: 'Professional', description: 'Serious, competent, reliable' },
        { value: 'innovative', label: 'Innovative', description: 'Cutting-edge, forward-thinking, creative' },
        { value: 'trustworthy', label: 'Trustworthy', description: 'Dependable, honest, secure' },
        { value: 'approachable', label: 'Approachable', description: 'Friendly, accessible, welcoming' },
        { value: 'premium', label: 'Premium', description: 'Luxury, high-quality, exclusive' },
        { value: 'dynamic', label: 'Dynamic', description: 'Energetic, fast-paced, agile' },
        { value: 'traditional', label: 'Traditional', description: 'Established, classic, time-tested' },
        { value: 'global', label: 'Global', description: 'International, diverse, inclusive' }
      ]
    },
    {
      id: 'brandCompliance',
      type: 'textarea',
      label: 'Brand Compliance Requirements',
      description: 'Specific brand guidelines that must be followed (logo usage, color restrictions, etc.)',
      placeholder: 'e.g., Logo must have 20px minimum clear space, Primary blue (#003366) required for headers',
      validation: { max: 400, message: 'Brand compliance should be under 400 characters' }
    },
    {
      id: 'documentStructure',
      type: 'select',
      label: 'Document Structure Layout',
      description: 'Choose the overall document layout and structure',
      options: [
        { value: 'traditional-letterhead', label: 'Traditional Letterhead', description: 'Header with logo and contact info' },
        { value: 'modern-sidebar', label: 'Modern Sidebar', description: 'Vertical sidebar with branding' },
        { value: 'full-header', label: 'Full Header Design', description: 'Wide header spanning full width' },
        { value: 'minimal-footer', label: 'Minimal with Footer', description: 'Clean design with footer branding' },
        { value: 'executive-premium', label: 'Executive Premium', description: 'High-end executive document layout' },
        { value: 'legal-formal', label: 'Legal Formal', description: 'Formal legal document structure' },
        { value: 'custom-grid', label: 'Custom Grid Layout', description: 'Specify custom grid system' }
      ]
    },
    {
      id: 'marginSpecifications',
      type: 'select',
      label: 'Margin Specifications',
      description: 'Document margin settings for professional printing',
      options: [
        { value: 'standard-business', label: 'Standard Business (1" all sides)', description: 'Standard 1-inch margins' },
        { value: 'narrow-efficient', label: 'Narrow Efficient (0.75" all sides)', description: 'More content space' },
        { value: 'wide-premium', label: 'Wide Premium (1.25" all sides)', description: 'Spacious, premium feel' },
        { value: 'legal-standard', label: 'Legal Standard (1.5" left, 1" others)', description: 'Legal document margins' },
        { value: 'binding-ready', label: 'Binding Ready (1.5" left, 1" others)', description: 'Ready for binding' },
        { value: 'international-a4', label: 'International A4 (2cm all sides)', description: 'A4 standard margins' },
        { value: 'custom-margins', label: 'Custom Margins', description: 'Specify custom margin values' }
      ]
    },
    {
      id: 'customMargins',
      type: 'text',
      label: 'Custom Margin Values',
      description: 'Specify custom margins (e.g., "1.25in top, 1in left, 1in right, 1in bottom")',
      placeholder: 'e.g., 1.25in top, 1in left, 1in right, 1in bottom',
      conditional: { dependsOn: 'marginSpecifications', showWhen: ['custom-margins'] }
    },
    {
      id: 'typographyHierarchy',
      type: 'select',
      label: 'Typography Hierarchy',
      description: 'Text hierarchy and sizing system',
      options: [
        { value: 'corporate-standard', label: 'Corporate Standard', description: 'Professional business typography' },
        { value: 'modern-scale', label: 'Modern Scale', description: 'Contemporary type scale system' },
        { value: 'legal-formal', label: 'Legal Formal', description: 'Formal legal document typography' },
        { value: 'executive-premium', label: 'Executive Premium', description: 'High-end executive typography' },
        { value: 'accessible-clear', label: 'Accessible Clear', description: 'Optimized for accessibility' },
        { value: 'international-multi', label: 'International Multi-Language', description: 'Supports multiple languages' },
        { value: 'custom-hierarchy', label: 'Custom Hierarchy', description: 'Specify custom typography system' }
      ]
    },
    {
      id: 'customTypographyHierarchy',
      type: 'textarea',
      label: 'Custom Typography Hierarchy',
      description: 'Specify custom typography hierarchy (font sizes, weights, spacing)',
      placeholder: 'e.g., Header: 24pt Bold, Subheader: 18pt Semi-Bold, Body: 12pt Regular, Footer: 10pt Regular',
      conditional: { dependsOn: 'typographyHierarchy', showWhen: ['custom-hierarchy'] },
      validation: { max: 300, message: 'Typography hierarchy should be under 300 characters' }
    },
    {
      id: 'gridSystem',
      type: 'select',
      label: 'Grid System',
      description: 'Layout grid system for consistent alignment',
      options: [
        { value: 'single-column', label: 'Single Column', description: 'Simple single-column layout' },
        { value: 'two-column', label: 'Two Column', description: 'Two-column grid system' },
        { value: 'three-column', label: 'Three Column', description: 'Three-column grid system' },
        { value: 'modular-grid', label: 'Modular Grid', description: 'Flexible modular grid system' },
        { value: 'baseline-grid', label: 'Baseline Grid', description: 'Typography-based baseline grid' },
        { value: 'golden-ratio', label: 'Golden Ratio', description: 'Grid based on golden ratio proportions' },
        { value: 'custom-grid', label: 'Custom Grid', description: 'Specify custom grid specifications' }
      ]
    },
    {
      id: 'customGridSpecs',
      type: 'text',
      label: 'Custom Grid Specifications',
      description: 'Specify custom grid system details',
      placeholder: 'e.g., 12-column grid, 20px gutters, 60px baseline',
      conditional: { dependsOn: 'gridSystem', showWhen: ['custom-grid'] }
    },
    {
      id: 'watermarkOptions',
      type: 'select',
      label: 'Watermark Options',
      description: 'Document watermark and background elements',
      options: [
        { value: 'none', label: 'No Watermark', description: 'Clean document without watermark' },
        { value: 'logo-subtle', label: 'Subtle Logo Watermark', description: 'Faint logo in background' },
        { value: 'brand-pattern', label: 'Brand Pattern', description: 'Subtle brand pattern background' },
        { value: 'security-draft', label: 'Security/Draft Marking', description: 'Draft or confidential watermark' },
        { value: 'custom-watermark', label: 'Custom Watermark', description: 'Specify custom watermark text' }
      ]
    },
    {
      id: 'customWatermark',
      type: 'text',
      label: 'Custom Watermark Text',
      description: 'Specify custom watermark text or message',
      placeholder: 'e.g., CONFIDENTIAL, DRAFT, PROPRIETARY',
      conditional: { dependsOn: 'watermarkOptions', showWhen: ['custom-watermark'] }
    },
    {
      id: 'headerFooterOptions',
      type: 'multiselect',
      label: 'Header/Footer Elements',
      description: 'Select elements to include in header and footer',
      options: [
        { value: 'page-numbers', label: 'Page Numbers', description: 'Include page numbering' },
        { value: 'date-time', label: 'Date/Time', description: 'Include document date and time' },
        { value: 'document-title', label: 'Document Title', description: 'Include document title in header' },
        { value: 'company-name', label: 'Company Name', description: 'Include company name' },
        { value: 'confidentiality', label: 'Confidentiality Notice', description: 'Include confidentiality statement' },
        { value: 'version-control', label: 'Version Control', description: 'Include version information' },
        { value: 'approval-signatures', label: 'Approval Signatures', description: 'Include signature lines' },
        { value: 'contact-info', label: 'Contact Information', description: 'Include contact details' }
      ]
    },
    {
      id: 'industry',
      type: 'select',
      label: 'Industry *',
      required: true,
      description: 'What industry is your business in?',
      options: [
        { value: 'technology', label: 'Technology', description: 'Software, IT, hardware' },
        { value: 'healthcare', label: 'Healthcare', description: 'Medical, wellness, pharmaceuticals' },
        { value: 'finance', label: 'Finance', description: 'Banking, investment, insurance' },
        { value: 'education', label: 'Education', description: 'Schools, training, e-learning' },
        { value: 'retail', label: 'Retail', description: 'E-commerce, stores, consumer goods' },
        { value: 'food-beverage', label: 'Food & Beverage', description: 'Restaurants, catering, drinks' },
        { value: 'real-estate', label: 'Real Estate', description: 'Property, construction, architecture' },
        { value: 'consulting', label: 'Consulting', description: 'Business services, advisory' },
        { value: 'creative', label: 'Creative', description: 'Design, media, entertainment' },
        { value: 'non-profit', label: 'Non-Profit', description: 'Charity, community organizations' },
        { value: 'automotive', label: 'Automotive', description: 'Cars, transportation, logistics' },
        { value: 'sports-fitness', label: 'Sports & Fitness', description: 'Gyms, athletics, wellness' },
        { value: 'beauty-fashion', label: 'Beauty & Fashion', description: 'Cosmetics, clothing, accessories' },
        { value: 'legal', label: 'Legal Services', description: 'Law firms, legal consultancy' },
        { value: 'manufacturing', label: 'Manufacturing', description: 'Production, industrial' },
        { value: 'other', label: 'Other', description: 'Different industry' }
      ]
    },
    {
      id: 'documentPurpose',
      type: 'select',
      label: 'Document Purpose *',
      required: true,
      description: 'What will this document be primarily used for?',
      options: [
        { value: 'client-communication', label: 'Client Communication', description: 'Letters to clients and customers' },
        { value: 'business-correspondence', label: 'Business Correspondence', description: 'Professional business letters' },
        { value: 'proposals-quotes', label: 'Proposals & Quotes', description: 'Business proposals and quotations' },
        { value: 'contracts-agreements', label: 'Contracts & Agreements', description: 'Legal documents and contracts' },
        { value: 'invoicing-billing', label: 'Invoicing & Billing', description: 'Financial documents and invoices' },
        { value: 'internal-memos', label: 'Internal Memos', description: 'Company internal communications' },
        { value: 'marketing-materials', label: 'Marketing Materials', description: 'Promotional business documents' },
        { value: 'official-notices', label: 'Official Notices', description: 'Formal announcements and notices' }
      ]
    },
    {
      id: 'letterContent',
      type: 'textarea',
      label: 'Letter Content',
      placeholder: 'Dear [Recipient Name],\n\nI am writing to inform you about...\n\n[Your letter content here]\n\nSincerely,\n[Your Name]\n[Your Title]',
      description: 'Enter the actual content of your letter (optional - this helps create a more realistic template)',
      validation: { max: 1000, message: 'Letter content should be under 1000 characters' },
      conditional: { dependsOn: 'documentType', showWhen: ['letterhead', 'memo-template'] }
    },
    {
      id: 'recipientInfo',
      type: 'textarea',
      label: 'Recipient Information',
      placeholder: '[Recipient Name]\n[Company Name]\n[Address]\n[City, State ZIP]',
      description: 'Sample recipient information for template layout (optional)',
      validation: { max: 200, message: 'Recipient info should be under 200 characters' },
      conditional: { dependsOn: 'documentType', showWhen: ['letterhead', 'proposal-cover'] }
    },
    {
      id: 'contactInfo',
      type: 'textarea',
      label: 'Contact Information',
      placeholder: '123 Business St, Suite 100\nCity, State 12345\nPhone: (555) 123-4567\nEmail: contact@company.com',
      description: 'Address, phone, email, website (optional)',
      validation: { max: 300, message: 'Contact info should be under 300 characters' }
    },
    {
      id: 'designStyle',
      type: 'visual-cards',
      label: 'Design Style *',
      required: true,
      description: 'Choose the professional aesthetic',
      options: [
        { value: 'corporate-traditional', label: 'Corporate Traditional', description: 'Classic, formal business style' },
        { value: 'modern-minimal', label: 'Modern Minimal', description: 'Clean, contemporary design' },
        { value: 'creative-professional', label: 'Creative Professional', description: 'Balanced creativity with professionalism' },
        { value: 'luxury-premium', label: 'Luxury Premium', description: 'High-end, sophisticated appearance' },
        { value: 'tech-innovative', label: 'Tech Innovative', description: 'Modern technology-focused design' },
        { value: 'legal-formal', label: 'Legal Formal', description: 'Conservative, authoritative styling' }
      ]
    },
    {
      id: 'colorScheme',
      type: 'visual-cards',
      label: 'Color Scheme *',
      required: true,
      description: 'Select the color palette',
      options: [
        { value: 'brand-colors', label: 'Brand Colors', description: 'Use company brand colors' },
        { value: 'navy-professional', label: 'Navy Professional', description: 'Navy blue with white accents' },
        { value: 'black-white', label: 'Black & White', description: 'Classic monochrome' },
        { value: 'gray-neutral', label: 'Gray Neutral', description: 'Professional gray tones' },
        { value: 'blue-trust', label: 'Blue Trust', description: 'Trustworthy blue palette' },
        { value: 'green-growth', label: 'Green Growth', description: 'Success-oriented green tones' }
      ]
    },
    {
      id: 'brandColors',
      type: 'text',
      label: 'Brand Colors',
      placeholder: '#1a365d, #2d3748, #ffffff',
      description: 'Enter your brand colors as hex codes (e.g., #1a365d)',
      validation: { max: 100, message: 'Brand colors should be under 100 characters' },
      conditional: { dependsOn: 'colorScheme', showWhen: ['brand-colors'] }
    },
    {
      id: 'includeDesignElements',
      type: 'multiselect',
      label: 'Design Elements',
      description: 'Select elements to include (optional)',
      multiple: true,
      options: [
        { value: 'logo-placeholder', label: 'Logo Placeholder', description: 'Space for company logo' },
        { value: 'decorative-line', label: 'Decorative Line', description: 'Accent lines or borders' },
        { value: 'watermark', label: 'Watermark', description: 'Subtle background branding' },
        { value: 'footer-line', label: 'Footer Line', description: 'Bottom accent or separator' },
        { value: 'header-accent', label: 'Header Accent', description: 'Top decorative element' },
        { value: 'date-field', label: 'Date Field', description: 'Pre-formatted date area' },
        { value: 'signature-line', label: 'Signature Line', description: 'Space for handwritten signature' }
      ]
    },
    {
      id: 'qualityAssurance',
      type: 'multiselect',
      label: 'Quality Assurance Requirements',
      description: 'Select quality standards and validation requirements',
      options: [
        { value: 'print-resolution', label: 'Print Resolution (300 DPI)', description: 'High resolution for professional printing' },
        { value: 'color-profile', label: 'Color Profile Compliance', description: 'CMYK/RGB color space validation' },
        { value: 'typography-consistency', label: 'Typography Consistency', description: 'Consistent font usage and spacing' },
        { value: 'accessibility-wcag', label: 'WCAG Accessibility', description: 'Web Content Accessibility Guidelines compliance' },
        { value: 'brand-compliance', label: 'Brand Compliance Check', description: 'Adherence to brand guidelines' },
        { value: 'layout-validation', label: 'Layout Validation', description: 'Grid system and alignment verification' },
        { value: 'print-production', label: 'Print Production Ready', description: 'Bleed, trim, and production specifications' },
        { value: 'multi-format', label: 'Multi-Format Compatibility', description: 'Optimized for various output formats' }
      ]
    },
    {
      id: 'technicalSpecifications',
      type: 'select',
      label: 'Technical Specifications Level',
      description: 'Level of technical precision and specifications',
      options: [
        { value: 'basic-business', label: 'Basic Business', description: 'Standard business document specifications' },
        { value: 'professional-grade', label: 'Professional Grade', description: 'Enhanced specifications for professional use' },
        { value: 'enterprise-level', label: 'Enterprise Level', description: 'Enterprise-grade technical specifications' },
        { value: 'print-production', label: 'Print Production', description: 'Full print production specifications' },
        { value: 'custom-specs', label: 'Custom Specifications', description: 'Specify custom technical requirements' }
      ]
    },
    {
      id: 'customTechnicalSpecs',
      type: 'textarea',
      label: 'Custom Technical Specifications',
      description: 'Specify custom technical requirements and specifications',
      placeholder: 'e.g., 300 DPI minimum, CMYK color space, 0.125" bleed, specific font licensing requirements',
      conditional: { dependsOn: 'technicalSpecifications', showWhen: ['custom-specs'] },
      validation: { max: 400, message: 'Technical specifications should be under 400 characters' }
    },
    {
      id: 'resolutionRequirements',
      type: 'select',
      label: 'Resolution Requirements',
      description: 'Output resolution and quality settings',
      options: [
        { value: 'web-standard', label: 'Web Standard (72 DPI)', description: 'Optimized for digital viewing' },
        { value: 'print-quality', label: 'Print Quality (300 DPI)', description: 'High quality for professional printing' },
        { value: 'premium-print', label: 'Premium Print (600 DPI)', description: 'Ultra-high quality for premium printing' },
        { value: 'archive-quality', label: 'Archive Quality (1200 DPI)', description: 'Archival-grade resolution' },
        { value: 'custom-resolution', label: 'Custom Resolution', description: 'Specify custom DPI requirements' }
      ]
    },
    {
      id: 'customResolution',
      type: 'text',
      label: 'Custom Resolution (DPI)',
      description: 'Specify custom resolution in dots per inch',
      placeholder: 'e.g., 450 DPI',
      conditional: { dependsOn: 'resolutionRequirements', showWhen: ['custom-resolution'] }
    },
    {
      id: 'colorSpaceManagement',
      type: 'select',
      label: 'Color Space Management',
      description: 'Color profile and space specifications',
      options: [
        { value: 'srgb-web', label: 'sRGB (Web Standard)', description: 'Standard RGB for digital display' },
        { value: 'adobe-rgb', label: 'Adobe RGB', description: 'Extended RGB color space' },
        { value: 'cmyk-print', label: 'CMYK (Print)', description: 'CMYK color space for printing' },
        { value: 'pantone-spot', label: 'Pantone Spot Colors', description: 'Pantone color matching system' },
        { value: 'custom-profile', label: 'Custom Color Profile', description: 'Specify custom color profile' }
      ]
    },
    {
      id: 'customColorProfile',
      type: 'text',
      label: 'Custom Color Profile',
      description: 'Specify custom color profile or ICC profile requirements',
      placeholder: 'e.g., ISO Coated v2 (ECI), GRACoL 2006 Coated1v2',
      conditional: { dependsOn: 'colorSpaceManagement', showWhen: ['custom-profile'] }
    },
    {
      id: 'fileOptimization',
      type: 'multiselect',
      label: 'File Optimization Options',
      description: 'Output file optimization and format requirements',
      options: [
        { value: 'file-size-optimization', label: 'File Size Optimization', description: 'Optimize for smaller file sizes' },
        { value: 'pdf-a-compliance', label: 'PDF/A Compliance', description: 'Long-term archival PDF format' },
        { value: 'editable-text', label: 'Editable Text Layers', description: 'Maintain text editability' },
        { value: 'vector-graphics', label: 'Vector Graphics', description: 'Scalable vector elements' },
        { value: 'embedded-fonts', label: 'Embedded Fonts', description: 'Embed fonts for consistency' },
        { value: 'metadata-inclusion', label: 'Metadata Inclusion', description: 'Include document metadata' },
        { value: 'security-features', label: 'Security Features', description: 'Password protection and permissions' },
        { value: 'multi-language-support', label: 'Multi-Language Support', description: 'Unicode and international text support' }
      ]
    },
    {
      id: 'accessibilityCompliance',
      type: 'multiselect',
      label: 'Accessibility Compliance',
      description: 'Accessibility standards and requirements',
      options: [
        { value: 'wcag-aa', label: 'WCAG 2.1 AA', description: 'Web Content Accessibility Guidelines Level AA' },
        { value: 'wcag-aaa', label: 'WCAG 2.1 AAA', description: 'Web Content Accessibility Guidelines Level AAA' },
        { value: 'ada-compliance', label: 'ADA Compliance', description: 'Americans with Disabilities Act compliance' },
        { value: 'section-508', label: 'Section 508', description: 'US Federal accessibility standards' },
        { value: 'en-301-549', label: 'EN 301 549', description: 'European accessibility standard' },
        { value: 'high-contrast', label: 'High Contrast Support', description: 'High contrast color schemes' },
        { value: 'screen-reader', label: 'Screen Reader Optimized', description: 'Optimized for screen readers' },
        { value: 'large-print', label: 'Large Print Ready', description: 'Optimized for large print versions' }
      ]
    },
    {
      id: 'internationalSupport',
      type: 'multiselect',
      label: 'International Business Support',
      description: 'International standards and multi-regional support',
      options: [
        { value: 'multi-language', label: 'Multi-Language Text', description: 'Support for multiple languages' },
        { value: 'rtl-support', label: 'RTL Text Support', description: 'Right-to-left text direction support' },
        { value: 'international-paper', label: 'International Paper Sizes', description: 'A4, A3, and other international formats' },
        { value: 'currency-formats', label: 'Currency Formats', description: 'International currency formatting' },
        { value: 'date-formats', label: 'Date Formats', description: 'International date formatting' },
        { value: 'cultural-colors', label: 'Cultural Color Considerations', description: 'Culturally appropriate color choices' },
        { value: 'legal-compliance', label: 'International Legal Compliance', description: 'Multi-jurisdictional legal requirements' },
        { value: 'time-zones', label: 'Time Zone Support', description: 'International time zone handling' }
      ]
    },
    {
      id: 'formatSize',
      type: 'select',
      label: 'Document Format *',
      required: true,
      description: 'Choose the output format and size',
      options: [
        { value: 'standard-letter', label: 'US Letter (8.5" x 11")', description: 'Standard US business letter size' },
        { value: 'a4-document', label: 'A4 (210mm x 297mm)', description: 'International A4 standard' },
        { value: 'legal-size', label: 'Legal Size (8.5" x 14")', description: 'US legal document size' },
        { value: 'executive-size', label: 'Executive (7.25" x 10.5")', description: 'Premium executive letterhead' }
      ]
    },
    {
      id: 'printingMethod',
      type: 'select',
      label: 'Intended Printing Method',
      description: 'How will you primarily print this document?',
      options: [
        { value: 'office-printer', label: 'Office Printer', description: 'Standard office inkjet/laser printer' },
        { value: 'professional-printing', label: 'Professional Printing', description: 'Commercial print shop' },
        { value: 'digital-only', label: 'Digital Only', description: 'Primarily for digital use/PDF' },
        { value: 'high-end-printing', label: 'High-End Printing', description: 'Premium printing with special finishes' }
      ]
    }
  ]
};

// ===== AI Avatars & Profiles Form =====
export const AI_AVATARS_FORM: CategoryForm = {
  categoryId: 'ai-avatars',
  fields: [
    ...STANDARD_FIELDS,
    {
      id: 'avatarType',
      type: 'select',
      label: 'Avatar Type *',
      required: true,
      description: 'What type of avatar do you need?',
      options: [
        { value: 'professional-headshot', label: 'Professional Headshot', description: 'Business portrait for LinkedIn, websites' },
        { value: 'casual-portrait', label: 'Casual Portrait', description: 'Relaxed, friendly profile picture' },
        { value: 'artistic-avatar', label: 'Artistic Avatar', description: 'Stylized, creative representation' },
        { value: 'cartoon-character', label: 'Cartoon Character', description: 'Illustrated, animated-style avatar' },
        { value: 'team-member', label: 'Team Member Portrait', description: 'Consistent team profile pictures' },
        { value: 'social-media', label: 'Social Media Avatar', description: 'Profile picture for social platforms' },
        { value: 'gaming-avatar', label: 'Gaming Avatar', description: 'Character for gaming or virtual worlds' },
        { value: 'brand-mascot', label: 'Brand Mascot', description: 'Character representing your brand' }
      ]
    },
    {
      id: 'personDescription',
      type: 'textarea',
      label: 'Person Description *',
      required: true,
      placeholder: 'Professional woman in her 30s, shoulder-length brown hair, confident smile, wearing a navy blazer, warm and approachable expression',
      description: 'Describe the person\'s appearance, age, style, and expression',
      validation: { min: 30, max: 300, message: 'Description should be 30-300 characters' }
    },
    {
      id: 'artStyle',
      type: 'visual-cards',
      label: 'Art Style *',
      required: true,
      description: 'Choose the visual style',
      options: [
        { value: 'photorealistic', label: 'Photorealistic', description: 'Highly detailed, photo-like quality' },
        { value: 'illustrated', label: 'Illustrated', description: 'Artistic, hand-drawn style' },
        { value: 'cartoon', label: 'Cartoon', description: 'Stylized, animated character style' },
        { value: 'minimalist', label: 'Minimalist', description: 'Simple, clean representation' },
        { value: 'artistic-portrait', label: 'Artistic Portrait', description: 'Painterly, artistic interpretation' },
        { value: 'vector-style', label: 'Vector Style', description: 'Clean, geometric vector art' },
        { value: 'sketch-style', label: 'Sketch Style', description: 'Hand-drawn sketch appearance' },
        { value: 'fantasy-style', label: 'Fantasy Style', description: 'Imaginative, creative interpretation' }
      ]
    },
    {
      id: 'background',
      type: 'select',
      label: 'Background *',
      required: true,
      description: 'Choose the background setting',
      options: [
        { value: 'solid-color', label: 'Solid Color', description: 'Clean, professional solid background' },
        { value: 'gradient', label: 'Gradient', description: 'Smooth color transition background' },
        { value: 'office-professional', label: 'Office Professional', description: 'Corporate office setting' },
        { value: 'outdoor-natural', label: 'Outdoor Natural', description: 'Nature or outdoor environment' },
        { value: 'studio-neutral', label: 'Studio Neutral', description: 'Professional studio backdrop' },
        { value: 'transparent', label: 'Transparent', description: 'No background for versatile use' },
        { value: 'abstract-pattern', label: 'Abstract Pattern', description: 'Artistic, decorative background' }
      ]
    },
    {
      id: 'mood',
      type: 'select',
      label: 'Mood/Expression *',
      required: true,
      description: 'What emotion should the avatar convey?',
      options: [
        { value: 'professional-confident', label: 'Professional & Confident', description: 'Business-appropriate, assured' },
        { value: 'friendly-approachable', label: 'Friendly & Approachable', description: 'Warm, welcoming demeanor' },
        { value: 'serious-authoritative', label: 'Serious & Authoritative', description: 'Formal, commanding presence' },
        { value: 'creative-artistic', label: 'Creative & Artistic', description: 'Expressive, imaginative' },
        { value: 'casual-relaxed', label: 'Casual & Relaxed', description: 'Laid-back, comfortable' },
        { value: 'enthusiastic-energetic', label: 'Enthusiastic & Energetic', description: 'Vibrant, dynamic expression' }
      ]
    },
    {
      id: 'ageRange',
      type: 'select',
      label: 'Age Range',
      description: 'Approximate age for the avatar',
      options: [
        { value: 'young-adult', label: 'Young Adult (20-30)', description: 'Early career professional' },
        { value: 'adult', label: 'Adult (30-45)', description: 'Established professional' },
        { value: 'mature-adult', label: 'Mature Adult (45-60)', description: 'Senior professional' },
        { value: 'senior', label: 'Senior (60+)', description: 'Experienced elder' },
        { value: 'unspecified', label: 'Let AI Choose', description: 'AI determines appropriate age' }
      ]
    },
    {
      id: 'outputFormat',
      type: 'select',
      label: 'Output Format *',
      required: true,
      description: 'How will you use this avatar?',
      options: [
        { value: 'square-social', label: 'Square (Social Media)', description: '1:1 ratio for profile pictures' },
        { value: 'portrait-professional', label: 'Portrait (Professional)', description: '4:5 ratio for business use' },
        { value: 'headshot-standard', label: 'Headshot Standard', description: '3:4 ratio for headshots' },
        { value: 'landscape-banner', label: 'Landscape Banner', description: '16:9 ratio for covers' }
      ]
    },

  ]
};

// ===== Category Form Registry =====
export const CATEGORY_FORMS: Record<ImageCategory, CategoryForm> = {
  'social-media': SOCIAL_MEDIA_FORM,
  'logo-brand': LOGO_BRAND_FORM,
  'ui-components': UI_COMPONENTS_FORM,
  'marketing': MARKETING_FORM,
  'banners': BANNERS_FORM,
  'data-viz': DATA_VIZ_FORM,
  'illustrations': ILLUSTRATIONS_FORM,
  'product-mockups': PRODUCT_MOCKUPS_FORM,
  'letterhead': LETTERHEAD_FORM,
  'ai-avatars': AI_AVATARS_FORM,
};

export function getCategoryForm(categoryId: ImageCategory): CategoryForm {
  return CATEGORY_FORMS[categoryId] || SOCIAL_MEDIA_FORM;
} 
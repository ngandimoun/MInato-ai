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
    tags: ['banner', 'header', 'cover', 'large-format', 'profile', 'advertising']
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
    description: 'Create professional letterheads and business document templates',
    icon: 'FileText',
    color: '#87CEEB',
    gradient: 'from-sky-400 to-blue-500',
    examples: ['Letterheads', 'Invoice templates', 'Corporate stationery', 'Document headers'],
    tags: ['letterhead', 'document', 'corporate', 'professional', 'template', 'business']
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
  | 'upload'
  | 'toggle'
  | 'radio'
  | 'checkbox'
  | 'slider'
  | 'visual-cards'
  | 'language-select';

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
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
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
        { value: 'data-display', label: 'Data Display', description: 'Tables, lists, grids' }
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
        { value: 'custom-modern', label: 'Custom Modern', description: 'Modern, custom styling' },
        { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple design' },
        { value: 'glassmorphism', label: 'Glassmorphism', description: 'Frosted glass effect' },
        { value: 'neumorphism', label: 'Neumorphism', description: 'Soft UI design trend' }
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
      id: 'interactionState',
      type: 'multiselect',
      label: 'Interaction States',
      description: 'Which states should be shown? (select multiple)',
      multiple: true,
      options: [
        { value: 'default', label: 'Default', description: 'Normal state' },
        { value: 'hover', label: 'Hover', description: 'Mouse over state' },
        { value: 'active', label: 'Active/Pressed', description: 'Clicked state' },
        { value: 'disabled', label: 'Disabled', description: 'Inactive state' },
        { value: 'loading', label: 'Loading', description: 'Processing state' },
        { value: 'error', label: 'Error', description: 'Error state' },
        { value: 'success', label: 'Success', description: 'Success state' },
        { value: 'focus', label: 'Focus', description: 'Keyboard focus state' }
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
        { value: 'accessible', label: 'Accessible', description: 'Colorblind-friendly palette' }
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
      id: 'textLanguage',
      type: 'language-select',
      label: 'Text Language *',
      required: true,
      description: 'Language for labels and text in the chart',
      defaultValue: 'en'
    },
    {
      id: 'outputFormat',
      type: 'select',
      label: 'Output Format *',
      required: true,
      description: 'How will you use this chart?',
      options: [
        { value: 'presentation', label: 'Presentation', description: 'PowerPoint or Keynote slides' },
        { value: 'report', label: 'Report', description: 'Business reports and documents' },
        { value: 'social-media', label: 'Social Media', description: 'Instagram, LinkedIn posts' },
        { value: 'website', label: 'Website', description: 'Web page integration' },
        { value: 'print', label: 'Print', description: 'Brochures, flyers, posters' },
        { value: 'dashboard', label: 'Dashboard', description: 'Real-time monitoring display' }
      ]
    },
    // {
    //   id: 'referenceImages',
    //   type: 'upload',
    //   label: 'Reference Images',
    //   description: 'Upload chart examples or data screenshots',
    //   accept: 'image/*',
    //   maxFiles: 3,
    //   multiple: true
    // }
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
        { value: 'letterhead', label: 'Letterhead', description: 'Company letter template header' },
        { value: 'invoice-template', label: 'Invoice Template', description: 'Billing and payment documents' },
        { value: 'proposal-cover', label: 'Proposal Cover', description: 'Business proposal front page' },
        { value: 'presentation-template', label: 'Presentation Template', description: 'Slide deck template' },
        { value: 'report-cover', label: 'Report Cover', description: 'Annual report or document cover' },
        { value: 'memo-template', label: 'Memo Template', description: 'Internal communication template' },
        { value: 'contract-header', label: 'Contract Header', description: 'Legal document formatting' },
        { value: 'certificate', label: 'Certificate', description: 'Awards, completion, or recognition certificates' }
      ]
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
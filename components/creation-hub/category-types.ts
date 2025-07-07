// Category Types - TypeScript definitions for the 10 image generation categories and their smart forms

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
    description: 'Create eye-catching images for Instagram, Facebook, TikTok, and other platforms',
    icon: 'Share2',
    color: '#FF6B6B',
    gradient: 'from-pink-500 to-orange-400',
    examples: ['Instagram posts', 'Story graphics', 'Facebook covers', 'TikTok backgrounds'],
    tags: ['social', 'posts', 'instagram', 'facebook', 'marketing']
  },
  'logo-brand': {
    id: 'logo-brand',
    name: 'Logo & Brand Kit',
    description: 'Generate unique logos and brand identity elements',
    icon: 'Zap',
    color: '#4ECDC4',
    gradient: 'from-teal-400 to-blue-500',
    examples: ['Company logos', 'Brand symbols', 'Wordmarks', 'Emblems'],
    tags: ['logo', 'brand', 'identity', 'business', 'corporate']
  },
  'ui-components': {
    id: 'ui-components',
    name: 'Website & App UI',
    description: 'Create buttons, icons, and UI elements for digital interfaces',
    icon: 'Monitor',
    color: '#45B7D1',
    gradient: 'from-blue-400 to-purple-500',
    examples: ['Buttons', 'Icons', 'Hero images', 'UI elements'],
    tags: ['ui', 'ux', 'web', 'app', 'interface', 'design']
  },
  'marketing': {
    id: 'marketing',
    name: 'Marketing Materials',
    description: 'Design flyers, business cards, and promotional materials',
    icon: 'Megaphone',
    color: '#96CEB4',
    gradient: 'from-green-400 to-teal-500',
    examples: ['Flyers', 'Business cards', 'Brochures', 'Promotional materials'],
    tags: ['marketing', 'print', 'promotional', 'business', 'advertising']
  },
  'banners': {
    id: 'banners',
    name: 'Banners',
    description: 'Create large-format graphics for profiles and events',
    icon: 'Image',
    color: '#FECA57',
    gradient: 'from-yellow-400 to-orange-500',
    examples: ['Facebook covers', 'LinkedIn banners', 'Event banners', 'Website headers'],
    tags: ['banner', 'header', 'cover', 'large-format', 'profile']
  },
  'data-viz': {
    id: 'data-viz',
    name: 'Data Visualization',
    description: 'Generate stylized charts, graphs, and infographics',
    icon: 'BarChart3',
    color: '#A8E6CF',
    gradient: 'from-emerald-400 to-green-500',
    examples: ['Bar charts', 'Pie charts', 'Infographics', 'Data illustrations'],
    tags: ['data', 'chart', 'graph', 'visualization', 'analytics', 'infographic']
  },
  'illustrations': {
    id: 'illustrations',
    name: 'Illustrations & Art',
    description: 'Create custom artwork and storyboard illustrations',
    icon: 'Palette',
    color: '#DDA0DD',
    gradient: 'from-purple-400 to-pink-500',
    examples: ['Character art', 'Scene illustrations', 'Storyboards', 'Digital paintings'],
    tags: ['illustration', 'art', 'drawing', 'creative', 'character', 'scene']
  },
  'product-mockups': {
    id: 'product-mockups',
    name: 'Product Mockups',
    description: 'Visualize designs on t-shirts, mugs, and other products',
    icon: 'Package',
    color: '#FFB347',
    gradient: 'from-orange-400 to-red-500',
    examples: ['T-shirt designs', 'Mug mockups', 'Phone cases', 'Product visualization'],
    tags: ['mockup', 'product', 'merchandise', 'apparel', 'branding']
  },
  'letterhead': {
    id: 'letterhead',
    name: 'Company Letterhead',
    description: 'Create professional document headers and templates',
    icon: 'FileText',
    color: '#87CEEB',
    gradient: 'from-sky-400 to-blue-500',
    examples: ['Document headers', 'Letter templates', 'Corporate stationery', 'Official documents'],
    tags: ['letterhead', 'document', 'corporate', 'professional', 'template']
  },
  'ai-avatars': {
    id: 'ai-avatars',
    name: 'AI Avatars & Profiles',
    description: 'Generate unique avatars and profile pictures',
    icon: 'User',
    color: '#DA70D6',
    gradient: 'from-violet-400 to-purple-500',
    examples: ['Profile pictures', 'Digital avatars', 'Character portraits', 'Professional headshots'],
    tags: ['avatar', 'profile', 'character', 'portrait', 'headshot', 'person']
  }
};

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
  | 'visual-cards';

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
    showWhen: string | string[];
  };
  defaultValue?: any;
  multiple?: boolean;
  accept?: string; // for file uploads
  maxFiles?: number;
}

export interface CategoryForm {
  categoryId: ImageCategory;
  fields: FormField[];
  validation?: (values: Record<string, any>) => { isValid: boolean; errors: Record<string, string> };
}

// ===== Smart Form Definitions =====

export const SOCIAL_MEDIA_FORM: CategoryForm = {
  categoryId: 'social-media',
  fields: [
    {
      id: 'platform',
      type: 'select',
      label: 'Platform',
      required: true,
      description: 'Select the social media platform for optimal sizing',
      options: [
        { value: 'instagram-post', label: 'Instagram Post', description: '1080x1080 square format' },
        { value: 'instagram-story', label: 'Instagram Story', description: '1080x1920 vertical format' },
        { value: 'facebook-post', label: 'Facebook Post', description: '1200x630 landscape format' },
        { value: 'tiktok-background', label: 'TikTok Background', description: '1080x1920 vertical format' },
        { value: 'pinterest-pin', label: 'Pinterest Pin', description: '735x1102 vertical format' },
        { value: 'twitter-post', label: 'Twitter/X Post', description: '1200x675 landscape format' }
      ]
    },
    {
      id: 'postTopic',
      type: 'textarea',
      label: 'Post Topic',
      required: true,
      placeholder: 'Our new seasonal coffee blend, Pumpkin Spice',
      description: 'Describe what your post is about',
      validation: { min: 10, max: 200, message: 'Topic should be between 10-200 characters' }
    },
    {
      id: 'textOnImage',
      type: 'textarea',
      label: 'Text on Image (Optional)',
      placeholder: 'New! Pumpkin Spice Latte. Available Now!',
      description: 'Enter the exact text you want to appear on the image',
      validation: { max: 100, message: 'Text should be under 100 characters for readability' }
    },
    {
      id: 'visualStyle',
      type: 'visual-cards',
      label: 'Visual Style',
      required: true,
      description: 'Choose the overall aesthetic for your post',
      options: [
        { value: 'bright-airy', label: 'Bright & Airy', description: 'Light, clean, minimal aesthetic' },
        { value: 'dark-moody', label: 'Dark & Moody', description: 'Dramatic shadows and deep tones' },
        { value: 'vibrant-colorful', label: 'Vibrant & Colorful', description: 'Bold, eye-catching colors' },
        { value: 'minimalist-clean', label: 'Minimalist & Clean', description: 'Simple, uncluttered design' },
        { value: 'retro-vintage', label: 'Retro & Vintage', description: 'Nostalgic, classic styling' },
        { value: 'professional-corporate', label: 'Professional & Corporate', description: 'Business-appropriate styling' }
      ]
    },
    {
      id: 'referenceImages',
      type: 'upload',
      label: 'Reference Images (Optional)',
      description: 'Upload your product or any inspirational images',
      accept: 'image/*',
      maxFiles: 3,
      multiple: true
    }
  ]
};

export const LOGO_BRAND_FORM: CategoryForm = {
  categoryId: 'logo-brand',
  fields: [
    {
      id: 'companyName',
      type: 'text',
      label: 'Company Name',
      required: true,
      placeholder: 'Acme Corporation',
      validation: { min: 2, max: 50, message: 'Company name should be 2-50 characters' }
    },
    {
      id: 'slogan',
      type: 'text',
      label: 'Slogan (Optional)',
      placeholder: 'Innovation at its finest',
      validation: { max: 100, message: 'Slogan should be under 100 characters' }
    },
    {
      id: 'industry',
      type: 'select',
      label: 'Industry',
      required: true,
      options: [
        { value: 'technology', label: 'Technology' },
        { value: 'food-beverage', label: 'Food & Beverage' },
        { value: 'fashion', label: 'Fashion' },
        { value: 'health-wellness', label: 'Health & Wellness' },
        { value: 'real-estate', label: 'Real Estate' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'finance', label: 'Finance' },
        { value: 'education', label: 'Education' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'other', label: 'Other' }
      ]
    },
    {
      id: 'logoStyle',
      type: 'visual-cards',
      label: 'Logo Style',
      required: true,
      options: [
        { value: 'minimalist-abstract', label: 'Minimalist / Abstract', description: 'Clean, simple geometric forms' },
        { value: 'emblem', label: 'Emblem', description: 'Traditional badge or crest style' },
        { value: 'wordmark', label: 'Wordmark (Text-based)', description: 'Typography-focused design' },
        { value: 'mascot', label: 'Mascot', description: 'Character or animal representation' },
        { value: 'geometric', label: 'Geometric', description: 'Sharp, mathematical shapes' }
      ]
    },
    {
      id: 'coreFeeling',
      type: 'tags',
      label: 'Core Feeling',
      required: true,
      description: 'Select the emotions your brand should convey (choose up to 3)',
      options: [
        { value: 'modern', label: 'Modern' },
        { value: 'trustworthy', label: 'Trustworthy' },
        { value: 'playful', label: 'Playful' },
        { value: 'premium', label: 'Premium' },
        { value: 'natural', label: 'Natural' },
        { value: 'bold', label: 'Bold' },
        { value: 'innovative', label: 'Innovative' },
        { value: 'reliable', label: 'Reliable' },
        { value: 'creative', label: 'Creative' },
        { value: 'professional', label: 'Professional' }
      ],
      validation: { max: 3, message: 'Please select up to 3 core feelings' }
    },
    {
      id: 'referenceImages',
      type: 'upload',
      label: 'Inspiration Images (Optional)',
      description: 'Upload logos or images that inspire you',
      accept: 'image/*',
      maxFiles: 3,
      multiple: true
    }
  ]
};

export const UI_COMPONENTS_FORM: CategoryForm = {
  categoryId: 'ui-components',
  fields: [
    {
      id: 'componentType',
      type: 'select',
      label: 'Component Type',
      required: true,
      options: [
        { value: 'button', label: 'Button' },
        { value: 'icon', label: 'Icon' },
        { value: 'hero-image', label: 'Hero Image' }
      ]
    },
    // Button-specific fields
    {
      id: 'buttonText',
      type: 'text',
      label: 'Button Text',
      placeholder: 'Sign Up Now',
      conditional: { dependsOn: 'componentType', showWhen: 'button' },
      validation: { max: 30, message: 'Button text should be under 30 characters' }
    },
    {
      id: 'buttonStyle',
      type: 'tags',
      label: 'Button Style',
      conditional: { dependsOn: 'componentType', showWhen: 'button' },
      options: [
        { value: 'sharp-corners', label: 'Sharp Corners' },
        { value: 'rounded-corners', label: 'Rounded Corners' },
        { value: 'pill-shaped', label: 'Pill-shaped' },
        { value: 'glassmorphism', label: 'Glassmorphism' },
        { value: 'neumorphism', label: 'Neumorphism' },
        { value: 'gradient', label: 'Gradient' }
      ]
    },
    // Icon-specific fields
    {
      id: 'iconRepresents',
      type: 'text',
      label: 'Icon Represents',
      placeholder: 'User Profile, Secure Payment, Shopping Cart',
      conditional: { dependsOn: 'componentType', showWhen: 'icon' },
      required: true,
      description: 'What should this icon symbolize?'
    },
    {
      id: 'iconStyle',
      type: 'visual-cards',
      label: 'Icon Style',
      conditional: { dependsOn: 'componentType', showWhen: 'icon' },
      options: [
        { value: 'line-art', label: 'Line Art', description: 'Clean outline style' },
        { value: 'filled-solid', label: 'Filled (Solid)', description: 'Solid color fills' },
        { value: '3d-render', label: '3D Render', description: 'Three-dimensional appearance' },
        { value: 'hand-drawn', label: 'Hand-drawn', description: 'Organic, sketched look' }
      ]
    },
    // Hero Image-specific fields
    {
      id: 'heroSubject',
      type: 'textarea',
      label: 'Hero Image Subject',
      placeholder: 'A diverse team collaborating around a laptop in a bright, modern office',
      conditional: { dependsOn: 'componentType', showWhen: 'hero-image' },
      required: true,
      description: 'Describe the main scene for the top of a webpage'
    },
    {
      id: 'heroMood',
      type: 'tags',
      label: 'Mood',
      conditional: { dependsOn: 'componentType', showWhen: 'hero-image' },
      options: [
        { value: 'inspirational', label: 'Inspirational' },
        { value: 'calm', label: 'Calm' },
        { value: 'energetic', label: 'Energetic' },
        { value: 'high-tech', label: 'High-tech' },
        { value: 'professional', label: 'Professional' },
        { value: 'creative', label: 'Creative' }
      ]
    },
    {
      id: 'colorPalette',
      type: 'color',
      label: 'Primary Color (Optional)',
      description: 'Suggest a primary color for the component'
    }
  ]
};

export const MARKETING_FORM: CategoryForm = {
  categoryId: 'marketing',
  fields: [
    {
      id: 'materialType',
      type: 'select',
      label: 'Material Type',
      required: true,
      options: [
        { value: 'flyer', label: 'Flyer' },
        { value: 'business-card', label: 'Business Card' }
      ]
    },
    // Flyer-specific fields
    {
      id: 'eventTitle',
      type: 'text',
      label: 'Event Title / Headline',
      placeholder: 'Summer Music Festival 2024',
      conditional: { dependsOn: 'materialType', showWhen: 'flyer' },
      required: true
    },
    {
      id: 'keyInformation',
      type: 'textarea',
      label: 'Key Information',
      placeholder: 'Date: July 15, 2024\nTime: 6:00 PM - 11:00 PM\nLocation: Central Park\nPrice: $35',
      conditional: { dependsOn: 'materialType', showWhen: 'flyer' },
      description: 'Date, time, location, price, website, etc.'
    },
    {
      id: 'callToAction',
      type: 'text',
      label: 'Call to Action',
      placeholder: 'Register Today!',
      conditional: { dependsOn: 'materialType', showWhen: 'flyer' }
    },
    {
      id: 'flyerStyle',
      type: 'visual-cards',
      label: 'Visual Style',
      conditional: { dependsOn: 'materialType', showWhen: 'flyer' },
      options: [
        { value: 'corporate', label: 'Corporate', description: 'Professional and business-like' },
        { value: 'fun-playful', label: 'Fun & Playful', description: 'Colorful and energetic' },
        { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' },
        { value: 'minimalist', label: 'Minimalist', description: 'Clean and simple' },
        { value: 'retro', label: 'Retro', description: 'Vintage and nostalgic' }
      ]
    },
    // Business Card-specific fields
    {
      id: 'fullName',
      type: 'text',
      label: 'Full Name',
      placeholder: 'John Smith',
      conditional: { dependsOn: 'materialType', showWhen: 'business-card' },
      required: true
    },
    {
      id: 'titleRole',
      type: 'text',
      label: 'Title / Role',
      placeholder: 'Senior Marketing Manager',
      conditional: { dependsOn: 'materialType', showWhen: 'business-card' },
      required: true
    },
    {
      id: 'contactInfo',
      type: 'textarea',
      label: 'Contact Info',
      placeholder: 'Phone: (555) 123-4567\nEmail: john@company.com\nWebsite: www.company.com',
      conditional: { dependsOn: 'materialType', showWhen: 'business-card' },
      description: 'Phone, Email, Website, Social Handles'
    },
    {
      id: 'cardOrientation',
      type: 'radio',
      label: 'Orientation',
      conditional: { dependsOn: 'materialType', showWhen: 'business-card' },
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' }
      ],
      defaultValue: 'horizontal'
    },
    {
      id: 'cardStyle',
      type: 'visual-cards',
      label: 'Style',
      conditional: { dependsOn: 'materialType', showWhen: 'business-card' },
      options: [
        { value: 'minimalist', label: 'Minimalist', description: 'Clean and simple' },
        { value: 'luxurious', label: 'Luxurious', description: 'Premium and sophisticated' },
        { value: 'creative', label: 'Creative', description: 'Artistic and unique' },
        { value: 'corporate', label: 'Corporate', description: 'Traditional and professional' }
      ]
    },
    {
      id: 'companyLogo',
      type: 'upload',
      label: 'Company Logo',
      conditional: { dependsOn: 'materialType', showWhen: 'business-card' },
      required: true,
      accept: 'image/*',
      maxFiles: 1,
      description: 'Upload your company logo'
    }
  ]
};

export const BANNERS_FORM: CategoryForm = {
  categoryId: 'banners',
  fields: [
    {
      id: 'bannerType',
      type: 'select',
      label: 'Banner Type',
      required: true,
      options: [
        { value: 'facebook-cover', label: 'Facebook Cover', description: '1200x630 format' },
        { value: 'linkedin-banner', label: 'LinkedIn Banner', description: '1584x396 format' },
        { value: 'twitter-header', label: 'Twitter/X Header', description: '1500x500 format' },
        { value: 'physical-banner', label: 'Physical Roll-up Banner', description: 'Vertical format' }
      ]
    },
    {
      id: 'headline',
      type: 'text',
      label: 'Headline / Main Text',
      placeholder: 'Transform Your Business with AI',
      required: true,
      description: 'The most important text on the banner'
    },
    {
      id: 'subtext',
      type: 'textarea',
      label: 'Sub-text / Key Points (Optional)',
      placeholder: '• Increase efficiency by 50%\n• 24/7 automated support\n• Easy integration',
      description: 'Additional info or bullet points'
    },
    {
      id: 'visualTheme',
      type: 'textarea',
      label: 'Visual Theme',
      placeholder: 'An abstract geometric pattern in blue and purple',
      required: true,
      description: 'Describe the desired background or imagery'
    },
    {
      id: 'mainImage',
      type: 'upload',
      label: 'Company Logo / Main Image',
      description: 'Upload the primary logo or image to feature',
      accept: 'image/*',
      maxFiles: 1
    }
  ]
};

export const DATA_VIZ_FORM: CategoryForm = {
  categoryId: 'data-viz',
  fields: [
    {
      id: 'chartType',
      type: 'select',
      label: 'Chart Type',
      required: true,
      options: [
        { value: 'bar-chart', label: 'Bar Chart' },
        { value: 'pie-chart', label: 'Pie Chart' },
        { value: 'line-graph', label: 'Line Graph' },
        { value: 'infographic', label: 'Infographic' }
      ]
    },
    {
      id: 'chartTitle',
      type: 'text',
      label: 'Chart Title',
      placeholder: 'Quarterly Growth 2024',
      required: true
    },
    {
      id: 'dataStory',
      type: 'textarea',
      label: 'Data Story',
      placeholder: 'Show strong, rising growth from Q1 to Q4, with Q4 being 50% higher than Q1',
      required: true,
      description: 'Describe what the chart should show, NOT the exact data'
    },
    {
      id: 'chartStyle',
      type: 'visual-cards',
      label: 'Style',
      required: true,
      options: [
        { value: 'clean-corporate', label: 'Clean & Corporate', description: 'Professional business style' },
        { value: 'futuristic-digital', label: 'Futuristic & Digital', description: 'High-tech, sci-fi aesthetic' },
        { value: 'hand-drawn-organic', label: 'Hand-drawn & Organic', description: 'Sketch-like, natural feel' },
        { value: '3d-modern', label: '3D Modern', description: 'Three-dimensional, contemporary' }
      ]
    }
  ]
};

export const ILLUSTRATIONS_FORM: CategoryForm = {
  categoryId: 'illustrations',
  fields: [
    {
      id: 'artStyle',
      type: 'text',
      label: 'Art Style',
      placeholder: 'Watercolor, Comic Book, Anime, Photorealistic',
      required: true,
      description: 'Describe the artistic style you want'
    },
    {
      id: 'sceneDescription',
      type: 'textarea',
      label: 'Scene Description',
      placeholder: 'A magical forest with glowing mushrooms and a small fairy sitting on a tree branch under moonlight',
      required: true,
      description: 'Describe everything happening in the scene. Be detailed.'
    },
    {
      id: 'mainCharacters',
      type: 'text',
      label: 'Main Characters/Subjects',
      placeholder: 'A young fairy with blue wings, wearing a green dress',
      description: 'Describe the key people or objects'
    },
    {
      id: 'moodLighting',
      type: 'tags',
      label: 'Mood & Lighting',
      required: true,
      options: [
        { value: 'sunny-bright', label: 'Sunny & Bright' },
        { value: 'dark-stormy', label: 'Dark & Stormy' },
        { value: 'mysterious', label: 'Mysterious' },
        { value: 'warm-cozy', label: 'Warm & Cozy' },
        { value: 'dramatic', label: 'Dramatic' },
        { value: 'ethereal', label: 'Ethereal' }
      ]
    },
    {
      id: 'colorPalette',
      type: 'tags',
      label: 'Color Palette',
      options: [
        { value: 'pastel', label: 'Pastel' },
        { value: 'monochromatic', label: 'Monochromatic' },
        { value: 'vibrant-neon', label: 'Vibrant Neon' },
        { value: 'earthy-tones', label: 'Earthy Tones' },
        { value: 'cool-blues', label: 'Cool Blues' },
        { value: 'warm-oranges', label: 'Warm Oranges' }
      ]
    }
  ]
};

export const PRODUCT_MOCKUPS_FORM: CategoryForm = {
  categoryId: 'product-mockups',
  fields: [
    {
      id: 'designUpload',
      type: 'upload',
      label: 'Design/Logo to Place',
      required: true,
      accept: 'image/*',
      maxFiles: 1,
      description: 'Upload the design you want on the product'
    },
    {
      id: 'productType',
      type: 'select',
      label: 'Product Type',
      required: true,
      options: [
        { value: 't-shirt', label: 'T-Shirt' },
        { value: 'coffee-mug', label: 'Coffee Mug' },
        { value: 'phone-case', label: 'Phone Case' },
        { value: 'tote-bag', label: 'Tote Bag' },
        { value: 'book-cover', label: 'Book Cover' },
        { value: 'hoodie', label: 'Hoodie' },
        { value: 'laptop-sticker', label: 'Laptop Sticker' }
      ]
    },
    {
      id: 'productColor',
      type: 'text',
      label: 'Product Color/Material',
      placeholder: 'Black cotton, White ceramic, Clear plastic',
      description: 'Describe the product color and material'
    },
    {
      id: 'mockupSetting',
      type: 'select',
      label: 'Mockup Setting',
      required: true,
      options: [
        { value: 'plain-studio', label: 'Plain Studio Background', description: 'Clean, professional backdrop' },
        { value: 'in-use', label: 'On a Model / In Use', description: 'Product being worn or used' },
        { value: 'flat-lay', label: 'Flat Lay (Top-down view)', description: 'Overhead perspective' }
      ]
    }
  ]
};

export const LETTERHEAD_FORM: CategoryForm = {
  categoryId: 'letterhead',
  fields: [
    {
      id: 'companyLogo',
      type: 'upload',
      label: 'Company Logo',
      required: true,
      accept: 'image/*',
      maxFiles: 1,
      description: 'Upload your company logo'
    },
    {
      id: 'includeInfo',
      type: 'checkbox',
      label: 'Information to Include',
      options: [
        { value: 'address', label: 'Full Address' },
        { value: 'phone', label: 'Phone Number' },
        { value: 'email', label: 'Email' },
        { value: 'website', label: 'Website' }
      ]
    },
    {
      id: 'companyDetails',
      type: 'textarea',
      label: 'Company Details',
      placeholder: 'Address: 123 Business St, City, State 12345\nPhone: (555) 123-4567\nEmail: info@company.com\nWebsite: www.company.com',
      required: true,
      description: 'Enter the company information you selected above'
    },
    {
      id: 'letterheadStyle',
      type: 'visual-cards',
      label: 'Style',
      required: true,
      options: [
        { value: 'classic-elegant', label: 'Classic & Elegant', description: 'Traditional, timeless design' },
        { value: 'modern-minimalist', label: 'Modern & Minimalist', description: 'Clean, contemporary look' },
        { value: 'creative-bold', label: 'Creative & Bold', description: 'Unique, eye-catching design' },
        { value: 'formal-corporate', label: 'Formal & Corporate', description: 'Conservative, professional style' }
      ]
    },
    {
      id: 'placement',
      type: 'radio',
      label: 'Placement',
      required: true,
      options: [
        { value: 'header-only', label: 'Header Only' },
        { value: 'header-footer', label: 'Header and Footer' }
      ],
      defaultValue: 'header-only'
    }
  ]
};

export const AI_AVATARS_FORM: CategoryForm = {
  categoryId: 'ai-avatars',
  fields: [
    {
      id: 'generationType',
      type: 'select',
      label: 'Generation Type',
      required: true,
      options: [
        { value: 'from-description', label: 'Create From Description', description: 'Generate a character from scratch' },
        { value: 'from-photo', label: 'Create From Photo', description: 'Stylize an uploaded photo of a person' }
      ]
    },
    // From Description fields
    {
      id: 'subjectDescription',
      type: 'textarea',
      label: 'Subject Description',
      placeholder: 'A woman in her late 20s with long, wavy red hair, green eyes, wearing a black leather jacket',
      conditional: { dependsOn: 'generationType', showWhen: 'from-description' },
      required: true,
      description: 'Describe the person\'s appearance in detail'
    },
    {
      id: 'expression',
      type: 'tags',
      label: 'Expression / Mood',
      conditional: { dependsOn: 'generationType', showWhen: 'from-description' },
      options: [
        { value: 'smiling-friendly', label: 'Smiling & Friendly' },
        { value: 'serious-professional', label: 'Serious & Professional' },
        { value: 'thoughtful', label: 'Thoughtful' },
        { value: 'confident', label: 'Confident' },
        { value: 'playful', label: 'Playful' }
      ]
    },
    // From Photo fields
    {
      id: 'photoUpload',
      type: 'upload',
      label: 'Your Photo',
      conditional: { dependsOn: 'generationType', showWhen: 'from-photo' },
      required: true,
      accept: 'image/*',
      maxFiles: 1,
      description: 'Upload a clear, front-facing photo of a person'
    },
    // Common fields for both types
    {
      id: 'artStyle',
      type: 'visual-cards',
      label: 'Art Style',
      required: true,
      options: [
        { value: 'photorealistic', label: 'Photorealistic', description: 'Lifelike, natural appearance' },
        { value: 'professional-headshot', label: 'Professional Headshot', description: 'Business portrait style' },
        { value: 'digital-painting', label: 'Digital Painting', description: 'Artistic, painted look' },
        { value: 'anime-manga', label: 'Anime / Manga', description: 'Japanese animation style' },
        { value: '3d-character', label: '3D Video Game Character', description: 'Three-dimensional game art' },
        { value: 'fantasy-art', label: 'Fantasy Art', description: 'Mystical, otherworldly style' },
        { value: 'cyberpunk', label: 'Cyberpunk', description: 'Futuristic, high-tech aesthetic' },
        { value: 'cartoon-comic', label: 'Cartoon / Comic Book', description: 'Stylized, illustrated look' }
      ]
    },
    {
      id: 'background',
      type: 'select',
      label: 'Background',
      required: true,
      options: [
        { value: 'solid-color', label: 'Solid Color' },
        { value: 'abstract-gradient', label: 'Abstract Gradient' },
        { value: 'office-setting', label: 'Office Setting' },
        { value: 'outdoor-scenery', label: 'Outdoor Scenery' },
        { value: 'scifi-environment', label: 'Sci-fi Environment' }
      ]
    },
    {
      id: 'framing',
      type: 'radio',
      label: 'Framing',
      required: true,
      options: [
        { value: 'headshot', label: 'Headshot (shoulders up)' },
        { value: 'bust', label: 'Bust (chest up)' }
      ],
      defaultValue: 'headshot'
    }
  ]
};

// ===== Complete Form Registry =====

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
  'ai-avatars': AI_AVATARS_FORM
};

// ===== Validation Helpers =====

export function validateCategoryForm(categoryId: ImageCategory, values: Record<string, any>): { 
  isValid: boolean; 
  errors: Record<string, string> 
} {
  const form = CATEGORY_FORMS[categoryId];
  const errors: Record<string, string> = {};

  form.fields.forEach(field => {
    const value = values[field.id];
    
    // Check required fields
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field.id] = `${field.label} is required`;
      return;
    }

    // Check conditional requirements
    if (field.conditional) {
      const dependsOnValue = values[field.conditional.dependsOn];
      const shouldShow = Array.isArray(field.conditional.showWhen) 
        ? field.conditional.showWhen.includes(dependsOnValue)
        : field.conditional.showWhen === dependsOnValue;
      
      if (shouldShow && field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors[field.id] = `${field.label} is required`;
        return;
      }
    }

    // Run field validation
    if (value && field.validation) {
      const validation = field.validation;
      
      if (typeof value === 'string') {
        if (validation.min && value.length < validation.min) {
          errors[field.id] = validation.message || `Minimum ${validation.min} characters required`;
        }
        if (validation.max && value.length > validation.max) {
          errors[field.id] = validation.message || `Maximum ${validation.max} characters allowed`;
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors[field.id] = validation.message || 'Invalid format';
        }
      }
      
      if (Array.isArray(value) && validation.max && value.length > validation.max) {
        errors[field.id] = validation.message || `Maximum ${validation.max} selections allowed`;
      }
    }
  });

  // Run custom form validation if defined
  if (form.validation) {
    const customValidation = form.validation(values);
    if (!customValidation.isValid) {
      Object.assign(errors, customValidation.errors);
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ===== Form Values Type =====

export type CategoryFormValues = Record<string, any>;

export interface CategoryGenerationRequest {
  categoryId: ImageCategory;
  formValues: CategoryFormValues;
  referenceImages?: File[];
  visionDescription?: string;
} 
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Star, 
  Heart, 
  Download, 
  Eye, 
  Copy,
  Palette,
  Type,
  Layout,
  Sparkles,
  Briefcase,
  Zap,
  Crown,
  Layers,
  ImageIcon,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface BannerTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  style: string;
  thumbnail: string;
  isPremium: boolean;
  isPopular: boolean;
  tags: string[];
  specs: {
    platform: string;
    dimensions: string;
    aspectRatio: string;
  };
  designElements: {
    colorScheme: string;
    typography: string;
    layout: string;
    imageStyle: string;
  };
  customization: {
    colors: string[];
    fonts: string[];
    layoutOptions: string[];
  };
  usage: {
    downloads: number;
    rating: number;
    reviews: number;
  };
}

interface TypographyControl {
  id: string;
  name: string;
  category: 'serif' | 'sans-serif' | 'display' | 'script' | 'monospace';
  variants: string[];
  description: string;
  isPremium: boolean;
  preview: string;
}

interface BannerTemplateLibraryProps {
  onTemplateSelect: (template: BannerTemplate) => void;
  onCustomizeTemplate: (template: BannerTemplate, customizations: Record<string, any>) => void;
  selectedPlatform?: string;
  selectedIndustry?: string;
  className?: string;
}

// Sample template data
const BANNER_TEMPLATES: BannerTemplate[] = [
  {
    id: 'tech-startup-hero',
    name: 'Tech Startup Hero',
    description: 'Modern, dynamic banner perfect for technology companies and startups',
    category: 'business',
    industry: 'technology',
    style: 'modern-tech',
    thumbnail: '/templates/tech-startup-hero.jpg',
    isPremium: false,
    isPopular: true,
    tags: ['startup', 'technology', 'modern', 'professional'],
    specs: {
      platform: 'website-header',
      dimensions: '1920x400',
      aspectRatio: '4.8:1'
    },
    designElements: {
      colorScheme: 'professional-blue',
      typography: 'modern-sans',
      layout: 'asymmetric',
      imageStyle: 'geometric'
    },
    customization: {
      colors: ['#2563EB', '#64748B', '#0EA5E9', '#FFFFFF'],
      fonts: ['Inter', 'Roboto', 'Poppins'],
      layoutOptions: ['left-aligned', 'center-aligned', 'split-layout']
    },
    usage: {
      downloads: 1247,
      rating: 4.8,
      reviews: 89
    }
  },
  {
    id: 'luxury-brand-cover',
    name: 'Luxury Brand Cover',
    description: 'Elegant, sophisticated design for premium brands and luxury services',
    category: 'lifestyle',
    industry: 'fashion',
    style: 'luxury-premium',
    thumbnail: '/templates/luxury-brand-cover.jpg',
    isPremium: true,
    isPopular: true,
    tags: ['luxury', 'premium', 'elegant', 'fashion'],
    specs: {
      platform: 'facebook-cover',
      dimensions: '820x312',
      aspectRatio: '2.63:1'
    },
    designElements: {
      colorScheme: 'elegant-black',
      typography: 'classic-serif',
      layout: 'symmetric',
      imageStyle: 'photographic'
    },
    customization: {
      colors: ['#000000', '#FFFFFF', '#D4AF37', '#F5F5F5'],
      fonts: ['Playfair Display', 'Cormorant Garamond', 'Bodoni'],
      layoutOptions: ['centered', 'minimal', 'full-width']
    },
    usage: {
      downloads: 892,
      rating: 4.9,
      reviews: 156
    }
  },
  {
    id: 'creative-agency-banner',
    name: 'Creative Agency Banner',
    description: 'Bold, colorful design perfect for creative agencies and design studios',
    category: 'creative',
    industry: 'design',
    style: 'playful-creative',
    thumbnail: '/templates/creative-agency-banner.jpg',
    isPremium: false,
    isPopular: false,
    tags: ['creative', 'colorful', 'agency', 'design'],
    specs: {
      platform: 'linkedin-banner',
      dimensions: '1584x396',
      aspectRatio: '4:1'
    },
    designElements: {
      colorScheme: 'creative-purple',
      typography: 'bold-display',
      layout: 'modular',
      imageStyle: 'illustrated'
    },
    customization: {
      colors: ['#7C3AED', '#EC4899', '#F59E0B', '#FAFAFA'],
      fonts: ['Montserrat', 'Oswald', 'Raleway'],
      layoutOptions: ['grid-based', 'free-form', 'structured']
    },
    usage: {
      downloads: 634,
      rating: 4.6,
      reviews: 78
    }
  },
  {
    id: 'healthcare-professional',
    name: 'Healthcare Professional',
    description: 'Clean, trustworthy design for healthcare and medical professionals',
    category: 'professional',
    industry: 'healthcare',
    style: 'professional-corporate',
    thumbnail: '/templates/healthcare-professional.jpg',
    isPremium: false,
    isPopular: true,
    tags: ['healthcare', 'medical', 'professional', 'trustworthy'],
    specs: {
      platform: 'website-header',
      dimensions: '1920x400',
      aspectRatio: '4.8:1'
    },
    designElements: {
      colorScheme: 'trustworthy-green',
      typography: 'modern-sans',
      layout: 'rule-of-thirds',
      imageStyle: 'photographic'
    },
    customization: {
      colors: ['#059669', '#FFFFFF', '#6B7280', '#F3F4F6'],
      fonts: ['Source Sans Pro', 'Lato', 'Open Sans'],
      layoutOptions: ['professional', 'clean', 'informative']
    },
    usage: {
      downloads: 1089,
      rating: 4.7,
      reviews: 134
    }
  },
  {
    id: 'e-commerce-promo',
    name: 'E-commerce Promotion',
    description: 'High-converting banner designed for online stores and promotions',
    category: 'marketing',
    industry: 'retail',
    style: 'bold-dynamic',
    thumbnail: '/templates/e-commerce-promo.jpg',
    isPremium: true,
    isPopular: true,
    tags: ['e-commerce', 'promotion', 'sales', 'conversion'],
    specs: {
      platform: 'display-leaderboard',
      dimensions: '728x90',
      aspectRatio: '8.09:1'
    },
    designElements: {
      colorScheme: 'energetic-orange',
      typography: 'bold-display',
      layout: 'asymmetric',
      imageStyle: 'minimal-icons'
    },
    customization: {
      colors: ['#EA580C', '#FFFFFF', '#DC2626', '#FEF3C7'],
      fonts: ['Nunito', 'Rubik', 'Work Sans'],
      layoutOptions: ['cta-focused', 'product-showcase', 'offer-highlight']
    },
    usage: {
      downloads: 2156,
      rating: 4.9,
      reviews: 298
    }
  },
  {
    id: 'restaurant-header',
    name: 'Restaurant Header',
    description: 'Warm, inviting design perfect for restaurants and food businesses',
    category: 'hospitality',
    industry: 'food',
    style: 'warm-friendly',
    thumbnail: '/templates/restaurant-header.jpg',
    isPremium: false,
    isPopular: false,
    tags: ['restaurant', 'food', 'hospitality', 'warm'],
    specs: {
      platform: 'website-header',
      dimensions: '1920x400',
      aspectRatio: '4.8:1'
    },
    designElements: {
      colorScheme: 'warm-earth',
      typography: 'friendly-rounded',
      layout: 'symmetric',
      imageStyle: 'photographic'
    },
    customization: {
      colors: ['#92400E', '#FEF3C7', '#DC2626', '#FFFFFF'],
      fonts: ['Quicksand', 'Comfortaa', 'Varela Round'],
      layoutOptions: ['menu-focused', 'atmosphere', 'location-highlight']
    },
    usage: {
      downloads: 445,
      rating: 4.5,
      reviews: 67
    }
  }
];

const TYPOGRAPHY_CONTROLS: TypographyControl[] = [
  {
    id: 'inter',
    name: 'Inter',
    category: 'sans-serif',
    variants: ['Regular', 'Medium', 'SemiBold', 'Bold'],
    description: 'Modern, highly readable sans-serif perfect for digital interfaces',
    isPremium: false,
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    category: 'serif',
    variants: ['Regular', 'Medium', 'SemiBold', 'Bold'],
    description: 'Elegant serif font with high contrast, perfect for luxury brands',
    isPremium: true,
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'sans-serif',
    variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'],
    description: 'Versatile geometric sans-serif inspired by urban typography',
    isPremium: false,
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    category: 'script',
    variants: ['Regular', 'Medium', 'SemiBold', 'Bold'],
    description: 'Casual script font perfect for friendly, approachable brands',
    isPremium: false,
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    id: 'roboto-mono',
    name: 'Roboto Mono',
    category: 'monospace',
    variants: ['Light', 'Regular', 'Medium', 'Bold'],
    description: 'Modern monospace font ideal for tech and development brands',
    isPremium: false,
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    category: 'display',
    variants: ['Regular'],
    description: 'Bold, condensed display font perfect for impactful headlines',
    isPremium: true,
    preview: 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG'
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: Grid3X3 },
  { id: 'business', name: 'Business', icon: Briefcase },
  { id: 'creative', name: 'Creative', icon: Palette },
  { id: 'marketing', name: 'Marketing', icon: Zap },
  { id: 'professional', name: 'Professional', icon: Crown },
  { id: 'lifestyle', name: 'Lifestyle', icon: Heart },
  { id: 'hospitality', name: 'Hospitality', icon: Star }
];

const INDUSTRIES = [
  'all', 'technology', 'healthcare', 'finance', 'education', 'retail', 
  'fashion', 'food', 'real-estate', 'consulting', 'design', 'marketing'
];

const STYLES = [
  'all', 'minimalist-clean', 'bold-dynamic', 'elegant-sophisticated', 
  'playful-creative', 'professional-corporate', 'modern-tech', 
  'warm-friendly', 'luxury-premium'
];

export function BannerTemplateLibrary({ 
  onTemplateSelect, 
  onCustomizeTemplate, 
  selectedPlatform,
  selectedIndustry,
  className 
}: BannerTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState(selectedIndustry || 'all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BannerTemplate | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, any>>({});

  // Filter templates based on current filters
  const filteredTemplates = BANNER_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesIndustry = selectedIndustryFilter === 'all' || template.industry === selectedIndustryFilter;
    const matchesStyle = selectedStyle === 'all' || template.style === selectedStyle;
    const matchesPlatform = !selectedPlatform || template.specs.platform === selectedPlatform;
    const matchesPremium = !showPremiumOnly || template.isPremium;
    const matchesPopular = !showPopularOnly || template.isPopular;

    return matchesSearch && matchesCategory && matchesIndustry && matchesStyle && 
           matchesPlatform && matchesPremium && matchesPopular;
  });

  const handleTemplateSelect = (template: BannerTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect(template);
  };

  const handleCustomizeTemplate = () => {
    if (selectedTemplate) {
      onCustomizeTemplate(selectedTemplate, customizations);
    }
  };

  const renderTemplateCard = (template: BannerTemplate) => (
    <Card key={template.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleTemplateSelect(template)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Customize {template.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex gap-2 mt-2">
                        {template.customization.colors.map((color, index) => (
                          <div 
                            key={index}
                            className="w-8 h-8 rounded-full border cursor-pointer"
                            style={{ backgroundColor: color }}
                            onClick={() => setCustomizations(prev => ({ ...prev, primaryColor: color }))}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Typography</Label>
                      <Select 
                        value={customizations.typography || template.designElements.typography}
                        onValueChange={(value) => setCustomizations(prev => ({ ...prev, typography: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {template.customization.fonts.map((font) => (
                            <SelectItem key={font} value={font}>{font}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Layout Style</Label>
                    <Select 
                      value={customizations.layout || template.designElements.layout}
                      onValueChange={(value) => setCustomizations(prev => ({ ...prev, layout: value }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {template.customization.layoutOptions.map((layout) => (
                          <SelectItem key={layout} value={layout}>{layout}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Custom Message</Label>
                    <Textarea 
                      placeholder="Enter your custom message..."
                      value={customizations.message || ''}
                      onChange={(e) => setCustomizations(prev => ({ ...prev, message: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button onClick={handleCustomizeTemplate}>
                      Apply Customizations
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {template.isPremium && (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
            {template.isPopular && (
              <Badge variant="secondary" className="bg-red-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm">{template.name}</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {template.usage.rating}
            </div>
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
          
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{template.specs.dimensions}</span>
            <span>{template.usage.downloads} downloads</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTemplateList = (template: BannerTemplate) => (
    <Card key={template.id} className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{template.name}</h3>
                  {template.isPremium && (
                    <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                      Premium
                    </Badge>
                  )}
                  {template.isPopular && (
                    <Badge variant="secondary" className="bg-red-500 text-white text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600">{template.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{template.specs.dimensions}</span>
                  <span>{template.usage.downloads} downloads</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {template.usage.rating}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleTemplateSelect(template)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm" variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Use
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Professional Templates</h2>
          <p className="text-sm text-gray-600">
            Choose from {BANNER_TEMPLATES.length} professionally designed templates
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedIndustryFilter} onValueChange={setSelectedIndustryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry === 'all' ? 'All Industries' : industry.charAt(0).toUpperCase() + industry.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style === 'all' ? 'All Styles' : style.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-7">
          {CATEGORIES.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs">
              <category.icon className="h-4 w-4 mr-1" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid/List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredTemplates.length} templates found
          </p>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPremiumOnly}
                onChange={(e) => setShowPremiumOnly(e.target.checked)}
                className="rounded"
              />
              Premium only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPopularOnly}
                onChange={(e) => setShowPopularOnly(e.target.checked)}
                className="rounded"
              />
              Popular only
            </label>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(renderTemplateCard)}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map(renderTemplateList)}
          </div>
        )}
      </div>

      {/* Typography Controls Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Typography Controls</h3>
          <Button variant="outline" size="sm">
            <Type className="h-4 w-4 mr-2" />
            Font Manager
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TYPOGRAPHY_CONTROLS.map((font) => (
            <Card key={font.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{font.name}</h4>
                      {font.isPremium && (
                        <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {font.category}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-600">{font.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">Preview:</div>
                    <div className="text-sm font-medium" style={{ fontFamily: font.name }}>
                      {font.preview}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {font.variants.length} variants
                    </div>
                    <Button size="sm" variant="outline">
                      Use Font
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your search terms or filters to find the perfect template for your needs.
            </p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedIndustryFilter('all');
              setSelectedStyle('all');
            }}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
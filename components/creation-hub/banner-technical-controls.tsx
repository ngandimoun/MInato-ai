"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Download, 
  FileImage, 
  Palette, 
  Ruler, 
  Zap, 
  Eye, 
  Monitor, 
  Printer,
  Smartphone,
  Globe,
  Layers,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getPlatformSpec, getColorSpace, getDPI, type PlatformSpec } from './banner-platform-specs';

interface TechnicalControlsProps {
  platformId: string;
  currentSpecs: TechnicalSpecs;
  onSpecsChange: (specs: TechnicalSpecs) => void;
  onExport: (specs: TechnicalSpecs) => void;
  className?: string;
}

interface TechnicalSpecs {
  format: 'PNG' | 'JPG' | 'WebP' | 'PDF' | 'SVG';
  quality: number;
  dpi: number;
  colorSpace: 'RGB' | 'CMYK' | 'sRGB' | 'P3';
  compression: 'none' | 'lossless' | 'lossy';
  optimization: 'web' | 'print' | 'social' | 'email';
  dimensions: {
    width: number;
    height: number;
    unit: 'px' | 'mm' | 'in';
  };
  advanced: {
    colorProfile: string;
    gamma: number;
    bitDepth: 8 | 16 | 24 | 32;
    interlaced: boolean;
    progressive: boolean;
    metadata: boolean;
  };
}

interface FormatOption {
  id: string;
  name: string;
  extension: string;
  description: string;
  useCase: string;
  pros: string[];
  cons: string[];
  maxQuality: number;
  supportsTransparency: boolean;
  supportsAnimation: boolean;
  compressionTypes: string[];
}

interface ColorSpaceOption {
  id: string;
  name: string;
  description: string;
  useCase: string;
  gamut: string;
  bitDepth: number[];
}

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  specs: Partial<TechnicalSpecs>;
  category: 'web' | 'print' | 'social' | 'email';
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'png',
    name: 'PNG',
    extension: '.png',
    description: 'Portable Network Graphics - Lossless compression with transparency support',
    useCase: 'Web graphics, logos, images with transparency',
    pros: ['Lossless compression', 'Transparency support', 'Wide compatibility'],
    cons: ['Larger file sizes', 'No animation support'],
    maxQuality: 100,
    supportsTransparency: true,
    supportsAnimation: false,
    compressionTypes: ['lossless']
  },
  {
    id: 'jpg',
    name: 'JPG',
    extension: '.jpg',
    description: 'Joint Photographic Experts Group - Lossy compression, smaller files',
    useCase: 'Photographs, web images, email attachments',
    pros: ['Small file sizes', 'Universal compatibility', 'Good for photos'],
    cons: ['Lossy compression', 'No transparency', 'Quality degradation'],
    maxQuality: 100,
    supportsTransparency: false,
    supportsAnimation: false,
    compressionTypes: ['lossy']
  },
  {
    id: 'webp',
    name: 'WebP',
    extension: '.webp',
    description: 'Modern web format with superior compression and quality',
    useCase: 'Modern web applications, progressive web apps',
    pros: ['Excellent compression', 'Transparency support', 'Animation support'],
    cons: ['Limited browser support', 'Not suitable for email'],
    maxQuality: 100,
    supportsTransparency: true,
    supportsAnimation: true,
    compressionTypes: ['lossless', 'lossy']
  },
  {
    id: 'pdf',
    name: 'PDF',
    extension: '.pdf',
    description: 'Portable Document Format - Vector-based, print-ready',
    useCase: 'Print materials, professional documents, archival',
    pros: ['Vector scalability', 'Print-ready', 'Metadata support'],
    cons: ['Larger file sizes', 'Not suitable for web'],
    maxQuality: 100,
    supportsTransparency: true,
    supportsAnimation: false,
    compressionTypes: ['lossless']
  },
  {
    id: 'svg',
    name: 'SVG',
    extension: '.svg',
    description: 'Scalable Vector Graphics - Infinitely scalable, small file size',
    useCase: 'Icons, logos, simple graphics, responsive design',
    pros: ['Infinite scalability', 'Small file sizes', 'Editable code'],
    cons: ['Limited to simple graphics', 'No photo support'],
    maxQuality: 100,
    supportsTransparency: true,
    supportsAnimation: true,
    compressionTypes: ['lossless']
  }
];

const COLOR_SPACE_OPTIONS: ColorSpaceOption[] = [
  {
    id: 'rgb',
    name: 'RGB',
    description: 'Red, Green, Blue - Standard for digital displays',
    useCase: 'Web, mobile, digital displays',
    gamut: 'Standard RGB gamut',
    bitDepth: [8, 16, 24, 32]
  },
  {
    id: 'srgb',
    name: 'sRGB',
    description: 'Standard RGB - Calibrated color space for web',
    useCase: 'Web browsers, standard displays',
    gamut: 'sRGB color space',
    bitDepth: [8, 24]
  },
  {
    id: 'p3',
    name: 'Display P3',
    description: 'Wide color gamut for modern displays',
    useCase: 'Modern displays, HDR content',
    gamut: 'P3 wide color gamut',
    bitDepth: [8, 16, 24]
  },
  {
    id: 'cmyk',
    name: 'CMYK',
    description: 'Cyan, Magenta, Yellow, Black - Standard for print',
    useCase: 'Print materials, offset printing',
    gamut: 'CMYK print gamut',
    bitDepth: [8, 16]
  }
];

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'Balanced quality and file size for web use',
    icon: Globe,
    category: 'web',
    specs: {
      format: 'WebP',
      quality: 85,
      dpi: 72,
      colorSpace: 'sRGB',
      compression: 'lossy',
      optimization: 'web'
    }
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Optimized for social media platforms',
    icon: Smartphone,
    category: 'social',
    specs: {
      format: 'JPG',
      quality: 90,
      dpi: 72,
      colorSpace: 'sRGB',
      compression: 'lossy',
      optimization: 'social'
    }
  },
  {
    id: 'print-ready',
    name: 'Print Ready',
    description: 'High quality for professional printing',
    icon: Printer,
    category: 'print',
    specs: {
      format: 'PDF',
      quality: 100,
      dpi: 300,
      colorSpace: 'CMYK',
      compression: 'lossless',
      optimization: 'print'
    }
  },
  {
    id: 'email-attachment',
    name: 'Email Attachment',
    description: 'Compressed for email compatibility',
    icon: Monitor,
    category: 'email',
    specs: {
      format: 'JPG',
      quality: 75,
      dpi: 72,
      colorSpace: 'sRGB',
      compression: 'lossy',
      optimization: 'email'
    }
  }
];

export function BannerTechnicalControls({
  platformId,
  currentSpecs,
  onSpecsChange,
  onExport,
  className
}: TechnicalControlsProps) {
  const [activeTab, setActiveTab] = useState('format');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [estimatedFileSize, setEstimatedFileSize] = useState(0);
  const [qualityPreview, setQualityPreview] = useState<string>('');

  const platformSpec = getPlatformSpec(platformId);
  const selectedFormat = FORMAT_OPTIONS.find(f => f.id === currentSpecs.format.toLowerCase());
  const selectedColorSpace = COLOR_SPACE_OPTIONS.find(c => c.id === currentSpecs.colorSpace.toLowerCase());

  // Calculate estimated file size based on current specs
  useEffect(() => {
    const calculateFileSize = () => {
      const { width, height } = currentSpecs.dimensions;
      const pixelCount = width * height;
      const bitsPerPixel = currentSpecs.advanced.bitDepth;
      const compressionRatio = currentSpecs.quality / 100;
      
      let baseSize = (pixelCount * bitsPerPixel) / 8; // bytes
      
      // Apply compression estimates
      switch (currentSpecs.format) {
        case 'PNG':
          baseSize *= 0.7; // PNG compression
          break;
        case 'JPG':
          baseSize *= compressionRatio * 0.3; // JPEG compression
          break;
        case 'WebP':
          baseSize *= compressionRatio * 0.25; // WebP compression
          break;
        case 'PDF':
          baseSize *= 0.8; // PDF compression
          break;
        case 'SVG':
          baseSize *= 0.1; // SVG is much smaller
          break;
      }
      
      setEstimatedFileSize(Math.round(baseSize / 1024)); // KB
    };

    calculateFileSize();
  }, [currentSpecs]);

  const handleSpecChange = (key: string, value: any) => {
    const newSpecs = { ...currentSpecs };
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      newSpecs[parent as keyof TechnicalSpecs] = {
        ...newSpecs[parent as keyof TechnicalSpecs],
        [child]: value
      };
    } else {
      newSpecs[key as keyof TechnicalSpecs] = value;
    }
    onSpecsChange(newSpecs);
  };

  const applyPreset = (preset: ExportPreset) => {
    const newSpecs = { ...currentSpecs, ...preset.specs };
    onSpecsChange(newSpecs);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          onExport(currentSpecs);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 90) return 'Excellent';
    if (quality >= 75) return 'Good';
    if (quality >= 60) return 'Fair';
    return 'Poor';
  };

  const getFileSizeColor = (sizeKB: number) => {
    if (sizeKB < 100) return 'text-green-600';
    if (sizeKB < 500) return 'text-yellow-600';
    if (sizeKB < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  const renderFormatSelection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FORMAT_OPTIONS.map((format) => (
          <Card 
            key={format.id} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              currentSpecs.format.toLowerCase() === format.id && "ring-2 ring-blue-500"
            )}
            onClick={() => handleSpecChange('format', format.name)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{format.name}</CardTitle>
                <Badge variant="outline">{format.extension}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-600">{format.description}</p>
              
              <div className="space-y-2">
                <div className="text-xs font-medium">Best for:</div>
                <div className="text-xs text-gray-600">{format.useCase}</div>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                {format.supportsTransparency && (
                  <Badge variant="secondary" className="text-xs">Transparency</Badge>
                )}
                {format.supportsAnimation && (
                  <Badge variant="secondary" className="text-xs">Animation</Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="text-xs font-medium text-green-600">Pros:</div>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {format.pros.slice(0, 2).map((pro, index) => (
                    <li key={index}>• {pro}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {selectedFormat && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>{selectedFormat.name}</strong>: {selectedFormat.description}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderQualitySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Quality</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentSpecs.quality}%</span>
              <Badge variant="outline">{getQualityLabel(currentSpecs.quality)}</Badge>
            </div>
          </div>
          <Slider
            value={[currentSpecs.quality]}
            onValueChange={([value]) => handleSpecChange('quality', value)}
            max={selectedFormat?.maxQuality || 100}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>DPI / Resolution</Label>
            <span className="text-sm font-medium">{currentSpecs.dpi} DPI</span>
          </div>
          <Select 
            value={currentSpecs.dpi.toString()} 
            onValueChange={(value) => handleSpecChange('dpi', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="72">72 DPI - Web/Screen</SelectItem>
              <SelectItem value="96">96 DPI - High DPI Screen</SelectItem>
              <SelectItem value="150">150 DPI - High Quality Web</SelectItem>
              <SelectItem value="300">300 DPI - Print Quality</SelectItem>
              <SelectItem value="600">600 DPI - High-End Print</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Compression</Label>
          <Select 
            value={currentSpecs.compression} 
            onValueChange={(value) => handleSpecChange('compression', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Compression</SelectItem>
              <SelectItem value="lossless">Lossless Compression</SelectItem>
              <SelectItem value="lossy">Lossy Compression</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Estimated File Size</span>
          <span className={cn("text-sm font-medium", getFileSizeColor(estimatedFileSize))}>
            {estimatedFileSize < 1024 ? `${estimatedFileSize} KB` : `${(estimatedFileSize / 1024).toFixed(1)} MB`}
          </span>
        </div>
        <div className="text-xs text-gray-600">
          Based on current quality and compression settings
        </div>
      </div>
    </div>
  );

  const renderColorSpaceSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLOR_SPACE_OPTIONS.map((colorSpace) => (
          <Card 
            key={colorSpace.id} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              currentSpecs.colorSpace.toLowerCase() === colorSpace.id && "ring-2 ring-blue-500"
            )}
            onClick={() => handleSpecChange('colorSpace', colorSpace.name)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{colorSpace.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-600">{colorSpace.description}</p>
              
              <div className="space-y-2">
                <div className="text-xs font-medium">Best for:</div>
                <div className="text-xs text-gray-600">{colorSpace.useCase}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs font-medium">Gamut:</div>
                <div className="text-xs text-gray-600">{colorSpace.gamut}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs font-medium">Bit Depth:</div>
                <div className="flex gap-1">
                  {colorSpace.bitDepth.map((depth) => (
                    <Badge key={depth} variant="outline" className="text-xs">
                      {depth}-bit
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Bit Depth</Label>
          <Select 
            value={currentSpecs.advanced.bitDepth.toString()} 
            onValueChange={(value) => handleSpecChange('advanced.bitDepth', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedColorSpace?.bitDepth.map((depth) => (
                <SelectItem key={depth} value={depth.toString()}>
                  {depth}-bit ({depth === 8 ? '256' : depth === 16 ? '65K' : depth === 24 ? '16M' : '16M+'} colors)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color Profile</Label>
          <Select 
            value={currentSpecs.advanced.colorProfile} 
            onValueChange={(value) => handleSpecChange('advanced.colorProfile', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="srgb">sRGB IEC61966-2.1</SelectItem>
              <SelectItem value="adobe-rgb">Adobe RGB (1998)</SelectItem>
              <SelectItem value="prophoto-rgb">ProPhoto RGB</SelectItem>
              <SelectItem value="rec2020">Rec. 2020</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Gamma Correction</Label>
          <Slider
            value={[currentSpecs.advanced.gamma]}
            onValueChange={([value]) => handleSpecChange('advanced.gamma', value)}
            max={3.0}
            min={0.5}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.5 (Darker)</span>
            <span>{currentSpecs.advanced.gamma.toFixed(1)}</span>
            <span>3.0 (Lighter)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Progressive/Interlaced</Label>
              <p className="text-xs text-gray-600">Load image progressively</p>
            </div>
            <Switch
              checked={currentSpecs.advanced.progressive}
              onCheckedChange={(checked) => handleSpecChange('advanced.progressive', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Include Metadata</Label>
              <p className="text-xs text-gray-600">EXIF, color profile, etc.</p>
            </div>
            <Switch
              checked={currentSpecs.advanced.metadata}
              onCheckedChange={(checked) => handleSpecChange('advanced.metadata', checked)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Platform Recommendations</h4>
        {platformSpec && (
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Recommended for {platformSpec.displayName}</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Format: {platformSpec.fileSpecs.recommendedFormats.join(' or ')}</li>
              <li>• Resolution: {platformSpec.fileSpecs.dpi} DPI</li>
              <li>• Color Space: {platformSpec.fileSpecs.colorSpace}</li>
              <li>• Max File Size: {platformSpec.fileSpecs.maxFileSize} MB</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Technical Specifications</h3>
            <p className="text-sm text-gray-600">
              Configure format, quality, and export settings
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onSpecsChange(currentSpecs)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Export Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Export Presets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {EXPORT_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  onClick={() => applyPreset(preset)}
                >
                  <preset.icon className="h-5 w-5" />
                  <div className="text-center">
                    <div className="text-xs font-medium">{preset.name}</div>
                    <div className="text-xs text-gray-600">{preset.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Technical Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="format">Format</TabsTrigger>
                <TabsTrigger value="quality">Quality</TabsTrigger>
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="format" className="mt-6">
                {renderFormatSelection()}
              </TabsContent>
              
              <TabsContent value="quality" className="mt-6">
                {renderQualitySettings()}
              </TabsContent>
              
              <TabsContent value="color" className="mt-6">
                {renderColorSpaceSettings()}
              </TabsContent>
              
              <TabsContent value="advanced" className="mt-6">
                {renderAdvancedSettings()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Export Progress */}
        {isExporting && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Exporting Banner...</span>
                  <span className="text-sm text-gray-600">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
                <div className="text-xs text-gray-600">
                  Optimizing for {currentSpecs.optimization} use
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Specs Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-medium">Format</div>
                <div className="text-sm">{currentSpecs.format}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium">Quality</div>
                <div className="text-sm">{currentSpecs.quality}%</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium">Resolution</div>
                <div className="text-sm">{currentSpecs.dpi} DPI</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium">Color Space</div>
                <div className="text-sm">{currentSpecs.colorSpace}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium">Dimensions</div>
                <div className="text-sm">
                  {currentSpecs.dimensions.width}x{currentSpecs.dimensions.height}{currentSpecs.dimensions.unit}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium">Est. File Size</div>
                <div className={cn("text-sm", getFileSizeColor(estimatedFileSize))}>
                  {estimatedFileSize < 1024 ? `${estimatedFileSize} KB` : `${(estimatedFileSize / 1024).toFixed(1)} MB`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
} 
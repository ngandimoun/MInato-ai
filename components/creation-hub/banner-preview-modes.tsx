"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Eye, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  Download,
  Share2,
  Settings,
  Ruler,
  Palette,
  Type,
  Grid3X3,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getPlatformSpec, getAllPlatforms, type PlatformSpec } from './banner-platform-specs';
import { BannerQualityAssurance, type BannerQualityCheck } from './banner-quality-assurance';
import type { GeneratedImage } from './hub-types';

interface BannerPreviewModesProps {
  image: GeneratedImage;
  platformId: string;
  formValues: Record<string, any>;
  className?: string;
  onPlatformChange?: (platformId: string) => void;
  onQualityCheck?: (qualityCheck: BannerQualityCheck) => void;
}

interface DevicePreview {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  width: number;
  height: number;
  scale: number;
  description: string;
}

interface PreviewMode {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }>;
}

const DEVICE_PREVIEWS: DevicePreview[] = [
  {
    id: 'desktop',
    name: 'Desktop',
    icon: Monitor,
    width: 1920,
    height: 1080,
    scale: 0.3,
    description: 'Desktop/laptop viewing experience'
  },
  {
    id: 'tablet',
    name: 'Tablet',
    icon: Tablet,
    width: 1024,
    height: 768,
    scale: 0.4,
    description: 'Tablet viewing experience'
  },
  {
    id: 'mobile',
    name: 'Mobile',
    icon: Smartphone,
    width: 375,
    height: 667,
    scale: 0.8,
    description: 'Mobile phone viewing experience'
  }
];

// Platform-specific preview components
const FacebookCoverPreview: React.FC<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }> = ({ image, platformSpec, scale }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}>
    <div className="relative">
      <img 
        src={image.url} 
        alt="Facebook Cover Preview" 
        className="w-full h-full object-cover"
        style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}
      />
      {/* Profile picture overlay */}
      <div className="absolute bottom-4 left-4 w-12 h-12 bg-gray-300 rounded-full border-2 border-white" style={{ transform: `scale(${scale})` }} />
    </div>
  </div>
);

const LinkedInBannerPreview: React.FC<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }> = ({ image, platformSpec, scale }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}>
    <div className="relative">
      <img 
        src={image.url} 
        alt="LinkedIn Banner Preview" 
        className="w-full h-full object-cover"
        style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}
      />
      {/* Profile section overlay */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-3" style={{ transform: `scale(${scale})` }}>
        <div className="w-16 h-16 bg-gray-300 rounded-full border-2 border-white" />
        <div className="space-y-1">
          <div className="w-32 h-3 bg-gray-300 rounded" />
          <div className="w-24 h-2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const TwitterHeaderPreview: React.FC<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }> = ({ image, platformSpec, scale }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}>
    <div className="relative">
      <img 
        src={image.url} 
        alt="Twitter Header Preview" 
        className="w-full h-full object-cover"
        style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}
      />
      {/* Profile elements */}
      <div className="absolute bottom-4 left-4 w-12 h-12 bg-gray-300 rounded-full border-2 border-white" style={{ transform: `scale(${scale})` }} />
    </div>
  </div>
);

const WebsiteHeaderPreview: React.FC<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }> = ({ image, platformSpec, scale }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}>
    <div className="relative">
      <img 
        src={image.url} 
        alt="Website Header Preview" 
        className="w-full h-full object-cover"
        style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}
      />
      {/* Navigation overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center" style={{ transform: `scale(${scale})` }}>
        <div className="w-20 h-6 bg-gray-300 rounded" />
        <div className="flex space-x-4">
          <div className="w-12 h-4 bg-gray-300 rounded" />
          <div className="w-12 h-4 bg-gray-300 rounded" />
          <div className="w-12 h-4 bg-gray-300 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const DefaultPreview: React.FC<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }> = ({ image, platformSpec, scale }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}>
    <img 
      src={image.url} 
      alt="Banner Preview" 
      className="w-full h-full object-cover"
      style={{ width: platformSpec.dimensions.width * scale, height: platformSpec.dimensions.height * scale }}
    />
  </div>
);

const PREVIEW_COMPONENTS: Record<string, React.ComponentType<{ image: GeneratedImage; platformSpec: PlatformSpec; scale: number }>> = {
  'facebook-cover': FacebookCoverPreview,
  'linkedin-banner': LinkedInBannerPreview,
  'twitter-header': TwitterHeaderPreview,
  'website-header': WebsiteHeaderPreview,
  'default': DefaultPreview
};

export function BannerPreviewModes({ 
  image, 
  platformId, 
  formValues, 
  className,
  onPlatformChange,
  onQualityCheck 
}: BannerPreviewModesProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>('desktop');
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platformId);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [qualityCheck, setQualityCheck] = useState<BannerQualityCheck | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const platformSpec = getPlatformSpec(selectedPlatform);
  const allPlatforms = getAllPlatforms();
  const selectedDevicePreview = DEVICE_PREVIEWS.find(d => d.id === selectedDevice) || DEVICE_PREVIEWS[0];

  // Run quality check when platform or image changes
  useEffect(() => {
    if (platformSpec && image) {
      setIsAnalyzing(true);
      
      // Simulate quality analysis
      setTimeout(() => {
        try {
          const qualityResult = BannerQualityAssurance.checkBannerQuality({
            platformId: selectedPlatform,
            formValues,
            image,
            imageData: {
              width: platformSpec.dimensions.width,
              height: platformSpec.dimensions.height,
              fileSize: 1024 * 1024 * 2, // 2MB estimate
              format: 'PNG',
              dpi: platformSpec.fileSpecs.dpi,
              colorSpace: platformSpec.fileSpecs.colorSpace
            }
          });
          
          setQualityCheck(qualityResult);
          onQualityCheck?.(qualityResult);
        } catch (error) {
          console.error('Quality check failed:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 1000);
    }
  }, [selectedPlatform, image, formValues, platformSpec, onQualityCheck]);

  const handlePlatformChange = (newPlatformId: string) => {
    setSelectedPlatform(newPlatformId);
    onPlatformChange?.(newPlatformId);
  };

  const getPreviewComponent = () => {
    const PreviewComponent = PREVIEW_COMPONENTS[selectedPlatform] || PREVIEW_COMPONENTS.default;
    return PreviewComponent;
  };

  const renderSafeZones = () => {
    if (!showSafeZones || !platformSpec) return null;
    
    const safeZones = platformSpec.safeZones;
    const scale = selectedDevicePreview.scale;
    
    return (
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          border: `${safeZones.top * scale}px solid rgba(255, 0, 0, 0.2)`,
          borderWidth: `${safeZones.top * scale}px ${safeZones.right * scale}px ${safeZones.bottom * scale}px ${safeZones.left * scale}px`
        }}
      >
        <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 py-0.5 rounded-br">
          Safe Zone
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    if (!showGrid || !platformSpec) return null;
    
    const scale = selectedDevicePreview.scale;
    const width = platformSpec.dimensions.width * scale;
    const height = platformSpec.dimensions.height * scale;
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Rule of thirds grid */}
        <svg width={width} height={height} className="absolute inset-0">
          {/* Vertical lines */}
          <line x1={width / 3} y1={0} x2={width / 3} y2={height} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
          <line x1={(width * 2) / 3} y1={0} x2={(width * 2) / 3} y2={height} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
          
          {/* Horizontal lines */}
          <line x1={0} y1={height / 3} x2={width} y2={height / 3} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
          <line x1={0} y1={(height * 2) / 3} x2={width} y2={(height * 2) / 3} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />
        </svg>
      </div>
    );
  };

  if (!platformSpec) {
    return (
      <div className={cn("p-4 text-center text-gray-500", className)}>
        Platform specification not found
      </div>
    );
  }

  const PreviewComponent = getPreviewComponent();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Banner Preview</h3>
          <p className="text-sm text-gray-600">
            Preview your banner across different platforms and devices
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Platform and Device Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPlatforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{platform.displayName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {platform.dimensions.width}x{platform.dimensions.height}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Device Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {DEVICE_PREVIEWS.map((device) => (
                <Button
                  key={device.id}
                  variant={selectedDevice === device.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDevice(device.id)}
                  className="flex-1"
                >
                  <device.icon className="h-4 w-4 mr-2" />
                  {device.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Preview Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="safe-zones">Show Safe Zones</Label>
              <p className="text-xs text-gray-600">Highlight areas where important content should be placed</p>
            </div>
            <Switch 
              id="safe-zones"
              checked={showSafeZones} 
              onCheckedChange={setShowSafeZones} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="grid">Show Composition Grid</Label>
              <p className="text-xs text-gray-600">Display rule of thirds grid for composition guidance</p>
            </div>
            <Switch 
              id="grid"
              checked={showGrid} 
              onCheckedChange={setShowGrid} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {platformSpec.displayName} Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {platformSpec.dimensions.width}x{platformSpec.dimensions.height}{platformSpec.dimensions.unit}
              </Badge>
              <Badge variant="outline">
                {platformSpec.aspectRatio}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
            <div className="relative">
              <PreviewComponent 
                image={image} 
                platformSpec={platformSpec} 
                scale={selectedDevicePreview.scale} 
              />
              {renderSafeZones()}
              {renderGrid()}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Viewing at {Math.round(selectedDevicePreview.scale * 100)}% scale</span>
            <span>{selectedDevicePreview.description}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quality Check Results */}
      {qualityCheck && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Quality Assessment</CardTitle>
              <Badge 
                variant={qualityCheck.overallGrade === 'A' ? 'default' : 
                        qualityCheck.overallGrade === 'B' ? 'secondary' : 
                        qualityCheck.overallGrade === 'C' ? 'outline' : 'destructive'}
              >
                Grade {qualityCheck.overallGrade} ({qualityCheck.overallScore}%)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(qualityCheck).map(([key, check]) => {
                if (key === 'overallScore' || key === 'overallGrade' || key === 'recommendations') return null;
                
                const checkResult = check as any;
                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {checkResult.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <Badge variant={checkResult.passed ? 'default' : 'destructive'}>
                      {checkResult.passed ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {qualityCheck.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recommendations</h4>
                <ul className="space-y-1">
                  {qualityCheck.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Platform Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Dimensions</h4>
              <p className="text-sm text-gray-600">
                {platformSpec.dimensions.width}x{platformSpec.dimensions.height}{platformSpec.dimensions.unit}
              </p>
              <p className="text-sm text-gray-600">
                Aspect Ratio: {platformSpec.aspectRatio}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">File Requirements</h4>
              <p className="text-sm text-gray-600">
                Max Size: {platformSpec.fileSpecs.maxFileSize} MB
              </p>
              <p className="text-sm text-gray-600">
                Formats: {platformSpec.fileSpecs.recommendedFormats.join(', ')}
              </p>
              <p className="text-sm text-gray-600">
                Resolution: {platformSpec.fileSpecs.dpi} DPI
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Safe Zones</h4>
              <p className="text-sm text-gray-600">
                Top: {platformSpec.safeZones.top}{platformSpec.safeZones.unit}
              </p>
              <p className="text-sm text-gray-600">
                Sides: {platformSpec.safeZones.left}{platformSpec.safeZones.unit}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Text Guidelines</h4>
              <p className="text-sm text-gray-600">
                Min Font Size: {platformSpec.textSpecs.minFontSize}px
              </p>
              <p className="text-sm text-gray-600">
                Max Text Width: {platformSpec.textSpecs.maxTextWidth}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
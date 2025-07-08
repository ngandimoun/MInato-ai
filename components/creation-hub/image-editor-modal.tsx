"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Download, 
  RotateCw, 
  RotateCcw, 
  Crop,
  Palette,
  Sliders,
  Sparkles,
  Wand2,
  Copy,
  Save,
  Share2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Settings,
  Filter,
  Contrast,

  Scissors,
  Move,
  Type,
  Layers,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Play,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { GeneratedImage } from "./hub-types";

interface ImageEditorModalProps {
  image: GeneratedImage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (editedImage: GeneratedImage) => void;
  onRegenerate?: (prompt: string, modifications: string) => void;
}

interface EditSettings {
  // Basic adjustments
  brightness: number;
  contrast: number;
  saturation: number;
  vibrance: number;
  exposure: number;
  highlights: number;
  shadows: number;
  warmth: number;
  tint: number;
  
  // Filters
  filter: string;
  filterIntensity: number;
  
  // Enhancements
  sharpen: number;
  denoise: number;
  clarity: number;
  dehaze: number;
  
  // Transform
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  
  // Advanced
  hue: number;
  luminance: number;
  redChannel: number;
  greenChannel: number;
  blueChannel: number;
}

const DEFAULT_SETTINGS: EditSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  warmth: 0,
  tint: 0,
  filter: 'none',
  filterIntensity: 100,
  sharpen: 0,
  denoise: 0,
  clarity: 0,
  dehaze: 0,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  hue: 0,
  luminance: 0,
  redChannel: 0,
  greenChannel: 0,
  blueChannel: 0,
};

const FILTER_PRESETS = [
  { id: 'none', name: 'Original', description: 'No filter applied' },
  { id: 'vivid', name: 'Vivid', description: 'Enhanced colors and contrast' },
  { id: 'dramatic', name: 'Dramatic', description: 'High contrast with deep shadows' },
  { id: 'bright', name: 'Bright', description: 'Increased brightness and warmth' },
  { id: 'vintage', name: 'Vintage', description: 'Retro film aesthetic' },
  { id: 'cinematic', name: 'Cinematic', description: 'Movie-like color grading' },
  { id: 'blackwhite', name: 'B&W', description: 'Classic black and white' },
  { id: 'sepia', name: 'Sepia', description: 'Warm brown tones' },
  { id: 'cool', name: 'Cool', description: 'Blue tinted atmosphere' },
  { id: 'warm', name: 'Warm', description: 'Golden hour feeling' },
  { id: 'soft', name: 'Soft', description: 'Gentle, dreamy effect' },
  { id: 'sharp', name: 'Sharp', description: 'Enhanced detail and clarity' },
];

const ENHANCEMENT_STYLES = [
  { id: 'auto', name: 'Auto Enhance', description: 'AI-powered automatic enhancement' },
  { id: 'portrait', name: 'Portrait', description: 'Optimized for people and faces' },
  { id: 'landscape', name: 'Landscape', description: 'Enhanced nature and scenery' },
  { id: 'product', name: 'Product', description: 'Professional product photography' },
  { id: 'artwork', name: 'Artwork', description: 'Artistic and creative enhancement' },
  { id: 'architecture', name: 'Architecture', description: 'Building and structure focus' },
];

export function ImageEditorModal({ 
  image, 
  isOpen, 
  onClose, 
  onSave, 
  onRegenerate 
}: ImageEditorModalProps) {
  const [settings, setSettings] = useState<EditSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<EditSettings[]>([DEFAULT_SETTINGS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [zoom, setZoom] = useState(100);
  const [enhancementPrompt, setEnhancementPrompt] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Reset settings when image changes
  useEffect(() => {
    if (image) {
      setSettings(DEFAULT_SETTINGS);
      setHistory([DEFAULT_SETTINGS]);
      setHistoryIndex(0);
      setPreviewUrl(image.url);
      setEnhancementPrompt("");
    }
  }, [image]);

  // Apply settings to create preview
  const applySettings = useCallback(async () => {
    if (!image || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        if (settings.rotation) {
          ctx.rotate((settings.rotation * Math.PI) / 180);
        }
        
        if (settings.flipHorizontal) {
          ctx.scale(-1, 1);
        }
        
        if (settings.flipVertical) {
          ctx.scale(1, -1);
        }

        // Apply filters using CSS filter syntax
        const filters = [
          `brightness(${100 + settings.brightness}%)`,
          `contrast(${100 + settings.contrast}%)`,
          `saturate(${100 + settings.saturation}%)`,
          `hue-rotate(${settings.hue}deg)`,
          `blur(${settings.denoise > 0 ? settings.denoise / 20 : 0}px)`,
        ];

        if (settings.filter !== 'none') {
          // Add filter-specific adjustments
          switch (settings.filter) {
            case 'vivid':
              filters.push('saturate(130%)', 'contrast(110%)');
              break;
            case 'dramatic':
              filters.push('contrast(150%)', 'brightness(90%)');
              break;
            case 'bright':
              filters.push('brightness(120%)', 'saturate(110%)');
              break;
            case 'vintage':
              filters.push('sepia(40%)', 'saturate(80%)', 'contrast(90%)');
              break;
            case 'cinematic':
              filters.push('contrast(120%)', 'saturate(90%)', 'brightness(95%)');
              break;
            case 'blackwhite':
              filters.push('grayscale(100%)');
              break;
            case 'sepia':
              filters.push('sepia(100%)');
              break;
            case 'cool':
              filters.push('hue-rotate(180deg)', 'saturate(110%)');
              break;
            case 'warm':
              filters.push('hue-rotate(-30deg)', 'saturate(110%)');
              break;
            case 'soft':
              filters.push('blur(0.5px)', 'brightness(105%)');
              break;
            case 'sharp':
              filters.push('contrast(120%)', 'saturate(105%)');
              break;
          }
        }

        ctx.filter = filters.join(' ');

        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Convert to data URL for preview
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewUrl(dataUrl);
      };

      img.src = image.url;
    } catch (error) {
      console.error('Error applying settings:', error);
      toast({
        title: "Processing Error",
        description: "Failed to apply image adjustments",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [image, settings]);

  // Apply settings when they change
  useEffect(() => {
    applySettings();
  }, [applySettings]);

  const updateSetting = useCallback((key: keyof EditSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Add to history if it's a significant change
    if (historyIndex < history.length - 1) {
      // Remove future history
      setHistory(prev => prev.slice(0, historyIndex + 1));
    }
    
    setHistory(prev => [...prev, newSettings]);
    setHistoryIndex(prev => prev + 1);
  }, [settings, history, historyIndex]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setHistory([DEFAULT_SETTINGS]);
    setHistoryIndex(0);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSettings(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSettings(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleSave = useCallback(async () => {
    if (!image || !onSave) return;

    setIsProcessing(true);
    try {
      // Create a new image object with the current preview
      const editedImage: GeneratedImage = {
        ...image,
        url: previewUrl,
        id: `${image.id}_edited_${Date.now()}`,
        prompt: `${image.prompt} (Enhanced)`,
        metadata: {
          ...image.metadata,
          editedAt: new Date(),
        } as any
      };

      onSave(editedImage);
      
      toast({
        title: "Image Saved",
        description: "Your edited image has been saved to the gallery",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save the edited image",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [image, previewUrl, settings, onSave, onClose]);

  const handleRegenerate = useCallback(() => {
    if (!image || !onRegenerate || !enhancementPrompt.trim()) return;

    const modifications = Object.entries(settings)
      .filter(([_, value]) => {
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value !== 'none' && value !== '';
        return false;
      })
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    onRegenerate(enhancementPrompt, modifications);
    onClose();
  }, [image, enhancementPrompt, settings, onRegenerate, onClose]);

  const downloadImage = useCallback(() => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${image?.id || 'edited'}_enhanced.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: "Your edited image is being downloaded",
    });
  }, [previewUrl, image]);

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl md:h-[90vh] h-[95vh] p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Panel - Image Preview */}
          <div className="flex-1 bg-black/5 relative overflow-hidden">
            <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b p-2 md:p-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Palette className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">Image Editor</span>
                </DialogTitle>
                <div className="flex items-center gap-1 md:gap-2">
                  <Badge variant="outline" className="text-xs px-1 py-0.5">
                    {Math.round(zoom)}%
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                    <ZoomIn className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                    <ZoomOut className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setZoom(100)} className="hidden sm:flex">
                    <span className="text-xs">Fit</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onClose}>
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Image Display */}
            <div className="absolute inset-0 pt-14 md:pt-20 pb-12 md:pb-16 flex items-center justify-center overflow-auto p-2">
              <div className="relative">
                {showComparison ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm font-medium mb-2">Original</p>
                      <img 
                        src={image.url}
                        alt="Original"
                        className="max-h-[30vh] sm:max-h-[60vh] max-w-full rounded-lg shadow-lg"
                        style={{ transform: `scale(${zoom / 100})` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs sm:text-sm font-medium mb-2">Edited</p>
                      <img 
                        src={previewUrl}
                        alt="Edited"
                        className="max-h-[30vh] sm:max-h-[60vh] max-w-full rounded-lg shadow-lg"
                        style={{ transform: `scale(${zoom / 100})` }}
                      />
                    </div>
                  </div>
                ) : (
                  <img 
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[40vh] md:max-h-[70vh] max-w-full rounded-lg shadow-lg transition-transform duration-200"
                    style={{ transform: `scale(${zoom / 100})` }}
                  />
                )}
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-2 md:p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowComparison(!showComparison)}
                    className="text-xs shrink-0"
                  >
                    <span className="hidden sm:inline">{showComparison ? 'Hide' : 'Show'} Comparison</span>
                    <span className="sm:hidden">{showComparison ? 'Hide' : 'Show'}</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
                    <Undo2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
                    <Redo2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetSettings} className="text-xs shrink-0">
                    <span className="hidden sm:inline">Reset All</span>
                    <span className="sm:hidden">Reset</span>
                  </Button>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button size="sm" variant="outline" onClick={downloadImage} className="flex-1 sm:flex-none">
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  {onSave && (
                    <Button size="sm" onClick={handleSave} disabled={isProcessing} className="flex-1 sm:flex-none">
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Save to Gallery</span>
                      <span className="sm:hidden">Save</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div className="w-full md:w-80 border-l md:border-l border-t md:border-t-0 bg-background overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 m-1 md:m-2 h-8 md:h-10">
                <TabsTrigger value="basic" className="text-xs md:text-sm px-1 md:px-3">Basic</TabsTrigger>
                <TabsTrigger value="filters" className="text-xs md:text-sm px-1 md:px-3">Filters</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs md:text-sm px-1 md:px-3">Advanced</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs md:text-sm px-1 md:px-3">AI</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-auto p-2 md:p-4 space-y-2 md:space-y-4">
                <TabsContent value="basic" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Basic Adjustments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Brightness</Label>
                        <Slider
                          value={[settings.brightness]}
                          onValueChange={([value]) => updateSetting('brightness', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.brightness}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Contrast</Label>
                        <Slider
                          value={[settings.contrast]}
                          onValueChange={([value]) => updateSetting('contrast', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.contrast}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Saturation</Label>
                        <Slider
                          value={[settings.saturation]}
                          onValueChange={([value]) => updateSetting('saturation', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.saturation}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Vibrance</Label>
                        <Slider
                          value={[settings.vibrance]}
                          onValueChange={([value]) => updateSetting('vibrance', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.vibrance}</span>
                          <span>100</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Transform</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Rotation</Label>
                        <Slider
                          value={[settings.rotation]}
                          onValueChange={([value]) => updateSetting('rotation', value)}
                          min={-180}
                          max={180}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-180°</span>
                          <span>{settings.rotation}°</span>
                          <span>180°</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSetting('flipHorizontal', !settings.flipHorizontal)}
                          className={cn(settings.flipHorizontal && "bg-primary text-primary-foreground")}
                        >
                          Flip H
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSetting('flipVertical', !settings.flipVertical)}
                          className={cn(settings.flipVertical && "bg-primary text-primary-foreground")}
                        >
                          Flip V
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="filters" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Filter Presets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
                        {FILTER_PRESETS.map((filter) => (
                          <Button
                            key={filter.id}
                            size="sm"
                            variant="outline"
                            onClick={() => updateSetting('filter', filter.id)}
                            className={cn(
                              "h-auto p-1 md:p-2 flex flex-col items-center gap-0.5 md:gap-1",
                              settings.filter === filter.id && "bg-primary text-primary-foreground"
                            )}
                          >
                            <span className="text-xs font-medium leading-tight">{filter.name}</span>
                            <span className="text-xs opacity-80 text-center leading-tight hidden md:block">
                              {filter.description}
                            </span>
                          </Button>
                        ))}
                      </div>
                      
                      {settings.filter !== 'none' && (
                        <div className="mt-4">
                          <Label className="text-xs">Filter Intensity</Label>
                          <Slider
                            value={[settings.filterIntensity]}
                            onValueChange={([value]) => updateSetting('filterIntensity', value)}
                            min={0}
                            max={200}
                            step={5}
                            className="mt-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0%</span>
                            <span>{settings.filterIntensity}%</span>
                            <span>200%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Enhancement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Sharpen</Label>
                        <Slider
                          value={[settings.sharpen]}
                          onValueChange={([value]) => updateSetting('sharpen', value)}
                          min={0}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0</span>
                          <span>{settings.sharpen}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Denoise</Label>
                        <Slider
                          value={[settings.denoise]}
                          onValueChange={([value]) => updateSetting('denoise', value)}
                          min={0}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0</span>
                          <span>{settings.denoise}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Clarity</Label>
                        <Slider
                          value={[settings.clarity]}
                          onValueChange={([value]) => updateSetting('clarity', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.clarity}</span>
                          <span>100</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="advanced" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Color Channels</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Hue</Label>
                        <Slider
                          value={[settings.hue]}
                          onValueChange={([value]) => updateSetting('hue', value)}
                          min={-180}
                          max={180}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-180°</span>
                          <span>{settings.hue}°</span>
                          <span>180°</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Red Channel</Label>
                        <Slider
                          value={[settings.redChannel]}
                          onValueChange={([value]) => updateSetting('redChannel', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.redChannel}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Green Channel</Label>
                        <Slider
                          value={[settings.greenChannel]}
                          onValueChange={([value]) => updateSetting('greenChannel', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.greenChannel}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Blue Channel</Label>
                        <Slider
                          value={[settings.blueChannel]}
                          onValueChange={([value]) => updateSetting('blueChannel', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.blueChannel}</span>
                          <span>100</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Light & Shadow</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Exposure</Label>
                        <Slider
                          value={[settings.exposure]}
                          onValueChange={([value]) => updateSetting('exposure', value)}
                          min={-200}
                          max={200}
                          step={5}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-200</span>
                          <span>{settings.exposure}</span>
                          <span>200</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Highlights</Label>
                        <Slider
                          value={[settings.highlights]}
                          onValueChange={([value]) => updateSetting('highlights', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.highlights}</span>
                          <span>100</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Shadows</Label>
                        <Slider
                          value={[settings.shadows]}
                          onValueChange={([value]) => updateSetting('shadows', value)}
                          min={-100}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>-100</span>
                          <span>{settings.shadows}</span>
                          <span>100</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ai" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">AI Enhancement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                        {ENHANCEMENT_STYLES.map((style) => (
                          <Button
                            key={style.id}
                            size="sm"
                            variant="outline"
                            className="h-auto p-2 md:p-3 flex flex-col items-start gap-0.5 md:gap-1"
                          >
                            <span className="text-xs font-medium">{style.name}</span>
                            <span className="text-xs opacity-80 text-left hidden md:block">
                              {style.description}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {onRegenerate && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">AI Regeneration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-xs">Enhancement Prompt</Label>
                          <Input
                            placeholder="Describe how you want to improve this image..."
                            value={enhancementPrompt}
                            onChange={(e) => setEnhancementPrompt(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        
                        <Button
                          onClick={handleRegenerate}
                          className="w-full"
                          disabled={!enhancementPrompt.trim()}
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          Regenerate with AI
                        </Button>
                        
                        <p className="text-xs text-muted-foreground">
                          This will create a new image based on your current edits and enhancement prompt.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
} 
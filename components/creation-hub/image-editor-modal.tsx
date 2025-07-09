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
  ArrowUpRight,
  Eye,
  EyeOff
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
  const [showComparison, setShowComparison] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        // Apply filters
        const filterString = [
          `brightness(${100 + settings.brightness}%)`,
          `contrast(${100 + settings.contrast}%)`,
          `saturate(${100 + settings.saturation}%)`,
          `hue-rotate(${settings.hue}deg)`,
        ].join(' ');

        ctx.filter = filterString;
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        // Convert to blob and create URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = image.url;
    } catch (error) {
      console.error('Error applying settings:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [image, settings]);

  // Update settings and add to history
  const updateSetting = useCallback((key: keyof EditSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSettings);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [settings, history, historyIndex]);

  // Undo/Redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSettings(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSettings(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Reset all settings
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setHistory([DEFAULT_SETTINGS]);
    setHistoryIndex(0);
  }, []);

  // Apply settings when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applySettings();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [applySettings]);

  const handleSave = useCallback(async () => {
    if (!image || !onSave) return;

    setIsProcessing(true);
    try {
      const editedImage: GeneratedImage = {
        ...image,
        url: previewUrl,
      };

      await onSave(editedImage);
      
      toast({
        title: "Image Saved",
        description: "Your edited image has been saved successfully",
      });

      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save the edited image",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [image, previewUrl, onSave, onClose]);

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
      <DialogContent className="max-w-7xl w-full h-[100dvh] p-0 overflow-hidden rounded-none sm:rounded-lg sm:w-[95vw] sm:h-[95vh]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-b backdrop-blur-sm">
            <DialogHeader className="p-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Image Editor</h2>
                    <p className="text-sm text-muted-foreground">Enhance and transform your image</p>
                  </div>
                </DialogTitle>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1">
                    {Math.round(zoom)}%
                  </Badge>
                  <div className="flex items-center gap-1 bg-background/50 rounded-lg p-1">
                    <Button size="sm" variant="ghost" onClick={() => setZoom(Math.max(25, zoom - 25))} className="h-8 w-8 p-0">
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setZoom(100)} className="h-8 px-3 text-xs">
                      Fit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setZoom(Math.min(200, zoom + 25))} className="h-8 w-8 p-0">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Image Display Area */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-[50vh] lg:min-h-0">
              {/* Image Container */}
              <div className="flex-1 overflow-auto">
                <div className="h-full flex items-center justify-center p-4">
                  <div className="relative">
                    {showComparison ? (
                      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <div className="text-center">
                          <Badge variant="secondary" className="mb-3">Original</Badge>
                          <div className="bg-white p-2 rounded-xl shadow-lg">
                            <img 
                              src={image.url}
                              alt="Original"
                              className="rounded-lg w-full max-w-[350px] h-auto object-contain"
                              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <Badge variant="default" className="mb-3">Edited</Badge>
                          <div className="bg-white p-2 rounded-xl shadow-lg">
                            <img 
                              src={previewUrl}
                              alt="Edited"
                              className="rounded-lg w-full max-w-[350px] h-auto object-contain"
                              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl shadow-lg">
                        <img 
                          src={previewUrl}
                          alt="Preview"
                          className="rounded-lg w-full max-w-[500px] h-auto object-contain transition-transform duration-200"
                          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                        />
                      </div>
                    )}
                    
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-xl">
                        <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-lg">
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="font-medium">Processing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-t p-4">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={showComparison ? "default" : "outline"}
                      onClick={() => setShowComparison(!showComparison)}
                      className="gap-2"
                    >
                      {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      Compare
                    </Button>
                    <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0} className="gap-2">
                      <Undo2 className="w-4 h-4" />
                      Undo
                    </Button>
                    <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1} className="gap-2">
                      <Redo2 className="w-4 h-4" />
                      Redo
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetSettings} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={downloadImage} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    {onSave && (
                      <Button size="sm" onClick={handleSave} disabled={isProcessing} className="gap-2">
                        <Save className="w-4 h-4" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Controls */}
            <div className="w-full lg:w-80 xl:w-96 bg-white border-l flex flex-col max-h-[50vh] lg:max-h-none">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                {/* Tab Headers */}
                <div className="flex-shrink-0 border-b bg-gray-50/50">
                  <TabsList className="grid w-full grid-cols-4 m-3 h-12">
                    <TabsTrigger value="basic" className="flex items-center gap-2 text-xs">
                      <Sliders className="w-4 h-4" />
                      Basic
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="flex items-center gap-2 text-xs">
                      <Filter className="w-4 h-4" />
                      Filters
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2 text-xs">
                      <Settings className="w-4 h-4" />
                      Advanced
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2 text-xs">
                      <Sparkles className="w-4 h-4" />
                      AI
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Tab Content - Fixed height with scrolling */}
                <div className="flex-1 min-h-0">
                  <TabsContent value="basic" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                      <div className="p-4 space-y-6">
                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Contrast className="w-4 h-4 text-blue-500" />
                              Basic Adjustments
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Brightness</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.brightness}</span>
                              </div>
                              <Slider
                                value={[settings.brightness]}
                                onValueChange={([value]) => updateSetting('brightness', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Contrast</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.contrast}</span>
                              </div>
                              <Slider
                                value={[settings.contrast]}
                                onValueChange={([value]) => updateSetting('contrast', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Saturation</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.saturation}</span>
                              </div>
                              <Slider
                                value={[settings.saturation]}
                                onValueChange={([value]) => updateSetting('saturation', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Vibrance</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.vibrance}</span>
                              </div>
                              <Slider
                                value={[settings.vibrance]}
                                onValueChange={([value]) => updateSetting('vibrance', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <RotateCw className="w-4 h-4 text-green-500" />
                              Transform
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Rotation</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.rotation}°</span>
                              </div>
                              <Slider
                                value={[settings.rotation]}
                                onValueChange={([value]) => updateSetting('rotation', value)}
                                min={-180}
                                max={180}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                size="sm"
                                variant={settings.flipHorizontal ? "default" : "outline"}
                                onClick={() => updateSetting('flipHorizontal', !settings.flipHorizontal)}
                                className="w-full gap-2"
                              >
                                <Move className="w-4 h-4" />
                                Flip H
                              </Button>
                              <Button
                                size="sm"
                                variant={settings.flipVertical ? "default" : "outline"}
                                onClick={() => updateSetting('flipVertical', !settings.flipVertical)}
                                className="w-full gap-2"
                              >
                                <Move className="w-4 h-4 rotate-90" />
                                Flip V
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="filters" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                      <div className="p-4 space-y-6">
                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Filter className="w-4 h-4 text-purple-500" />
                              Filter Presets
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                              {FILTER_PRESETS.map((filter) => (
                                <Button
                                  key={filter.id}
                                  size="sm"
                                  variant={settings.filter === filter.id ? "default" : "outline"}
                                  onClick={() => updateSetting('filter', filter.id)}
                                  className="h-auto p-3 flex flex-col items-center gap-1 text-center"
                                >
                                  <span className="text-xs font-medium">{filter.name}</span>
                                  <span className="text-xs opacity-70 leading-tight">
                                    {filter.description}
                                  </span>
                                </Button>
                              ))}
                            </div>
                            
                            {settings.filter !== 'none' && (
                              <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Filter Intensity</Label>
                                  <span className="text-xs text-muted-foreground font-medium">{settings.filterIntensity}%</span>
                                </div>
                                <Slider
                                  value={[settings.filterIntensity]}
                                  onValueChange={([value]) => updateSetting('filterIntensity', value)}
                                  min={0}
                                  max={200}
                                  step={5}
                                  className="w-full"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                      <div className="p-4 space-y-6">
                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Palette className="w-4 h-4 text-orange-500" />
                              Color Channels
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Hue</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.hue}°</span>
                              </div>
                              <Slider
                                value={[settings.hue]}
                                onValueChange={([value]) => updateSetting('hue', value)}
                                min={-180}
                                max={180}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Red Channel</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.redChannel}</span>
                              </div>
                              <Slider
                                value={[settings.redChannel]}
                                onValueChange={([value]) => updateSetting('redChannel', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Green Channel</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.greenChannel}</span>
                              </div>
                              <Slider
                                value={[settings.greenChannel]}
                                onValueChange={([value]) => updateSetting('greenChannel', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Blue Channel</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.blueChannel}</span>
                              </div>
                              <Slider
                                value={[settings.blueChannel]}
                                onValueChange={([value]) => updateSetting('blueChannel', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Layers className="w-4 h-4 text-indigo-500" />
                              Light & Shadow
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Exposure</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.exposure}</span>
                              </div>
                              <Slider
                                value={[settings.exposure]}
                                onValueChange={([value]) => updateSetting('exposure', value)}
                                min={-200}
                                max={200}
                                step={5}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Highlights</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.highlights}</span>
                              </div>
                              <Slider
                                value={[settings.highlights]}
                                onValueChange={([value]) => updateSetting('highlights', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Shadows</Label>
                                <span className="text-xs text-muted-foreground font-medium">{settings.shadows}</span>
                              </div>
                              <Slider
                                value={[settings.shadows]}
                                onValueChange={([value]) => updateSetting('shadows', value)}
                                min={-100}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                      <div className="p-4 space-y-6">
                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-yellow-500" />
                              AI Enhancement
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                              {ENHANCEMENT_STYLES.map((style) => (
                                <Button
                                  key={style.id}
                                  size="sm"
                                  variant="outline"
                                  className="h-auto p-4 flex flex-col items-start gap-2 text-left hover:border-primary"
                                >
                                  <span className="text-sm font-medium">{style.name}</span>
                                  <span className="text-xs opacity-70 text-left leading-relaxed">
                                    {style.description}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {onRegenerate && (
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Wand2 className="w-4 h-4 text-pink-500" />
                                AI Regeneration
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Enhancement Prompt</Label>
                                <Input
                                  placeholder="Describe how you want to improve this image..."
                                  value={enhancementPrompt}
                                  onChange={(e) => setEnhancementPrompt(e.target.value)}
                                  className="w-full"
                                />
                              </div>
                              
                              <Button
                                onClick={handleRegenerate}
                                className="w-full gap-2"
                                disabled={!enhancementPrompt.trim()}
                              >
                                <Wand2 className="w-4 h-4" />
                                Regenerate with AI
                              </Button>
                              
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                This will create a new image based on your current edits and enhancement prompt.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
} 
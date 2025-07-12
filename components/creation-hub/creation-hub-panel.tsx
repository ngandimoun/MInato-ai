"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Palette, 
  Wand2, 
  Download, 
  Film, 
  Settings, 
  Image as ImageIcon, 
  Sparkles,
  RefreshCw,
  Loader2,
  MessageSquare,
  Upload,
  StopCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useImageGeneration } from "./hooks/use-image-generation";
import { useConversation } from "./hooks/use-conversation";
import { useUserImages } from "./hooks/use-user-images";
import { useUserVideos } from "./hooks/use-user-videos";
import { HubUtils } from "./hub-utils";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/memory-framework/config";
import type { GeneratedImage, ImageGenerationRequest, CategoryImageGenerationRequest } from "./hub-types";
import { CategorySelector } from "./category-selector";
import { CategoryForm } from "./category-form";
import type { ImageCategory, CategoryFormValues } from "./category-types";
import { ImageEditorModal } from "./image-editor-modal";
import { VideoGenerator } from "./video-generator";
import CreateVid from "./create-vid";
import { AILeadsInterface } from "./ai-leads-interface";

// Helper function to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface CreationHubPanelProps {
  onClose: () => void;
}

export function CreationHubPanel({ onClose }: CreationHubPanelProps) {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [gallerySubTab, setGallerySubTab] = useState<'images' | 'videos'>('images');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [size, setSize] = useState<string>('1024x1024');
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // New category-based state
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(true);
  const [categoryFormValues, setCategoryFormValues] = useState<CategoryFormValues>({});

  // Use custom hooks for user images (Gallery) - lazy load when needed
  const { 
    images: userImages, 
    loading: userImagesLoading,
    addImage: addUserImage,
    updateImage: updateUserImage,
    refetch: refetchUserImages
  } = useUserImages({
    autoLoad: false, // Don't auto-load, load when gallery tab is accessed
    limit: 100
  });

  // Use user videos hook - lazy load when needed
  const {
    videos: userVideos,
    loading: userVideosLoading,
    addVideo: addUserVideo,
    refresh: refreshUserVideos
  } = useUserVideos({
    autoLoad: false, // Don't auto-load, load when gallery tab is accessed
    limit: 50
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        logger.info('[CreationHubPanel] Auth check', { 
          user: user ? { id: user.id, email: user.email } : null, 
          error 
        });
        
        setAuthUser(user);
        setAuthLoading(false);
      } catch (err) {
        logger.error('[CreationHubPanel] Auth check failed', { err });
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Debug logging for user images
  useEffect(() => {
    logger.info('[CreationHubPanel] User images state updated', {
      count: userImages.length,
      loading: userImagesLoading,
      authUser: authUser ? { id: authUser.id } : null,
      images: userImages.map(img => ({ id: img.id, status: img.status, url: img.url?.substring(0, 50) + '...' }))
    });
  }, [userImages, userImagesLoading, authUser]);

  // Debug logging for user videos
  useEffect(() => {
    logger.info('[CreationHubPanel] User videos state updated', {
      count: userVideos.length,
      loading: userVideosLoading,
      authUser: authUser ? { id: authUser.id } : null,
      videos: userVideos.map(vid => ({ 
        id: vid.id, 
        status: vid.status, 
        filename: vid.filename,
        hasUrl: !!vid.video_url,
        url: vid.video_url?.substring(0, 50) + '...' 
      }))
    });
  }, [userVideos, userVideosLoading, authUser]);

  // Lazy load data when tabs are accessed
  useEffect(() => {
    if (activeTab === "gallery" && gallerySubTab === "images" && !userImagesLoading) {
      logger.info('[CreationHubPanel] Lazy loading user images');
      refetchUserImages();
    }
  }, [activeTab, gallerySubTab, userImagesLoading, refetchUserImages]);

  useEffect(() => {
    if (activeTab === "gallery" && gallerySubTab === "videos" && !userVideosLoading) {
      logger.info('[CreationHubPanel] Lazy loading user videos');
      refreshUserVideos();
    }
  }, [activeTab, gallerySubTab, userVideosLoading, refreshUserVideos]);

  // Use custom hooks for generation and conversations
  const { generate, isGenerating, progress, error: generationError, cancel } = useImageGeneration({
    streaming: true,
    onSuccess: (image) => {
      // Add to both conversation and user images
      addImage(image);
      addUserImage(image);
      toast({
        title: "Image Generated!",
        description: "Your image has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: HubUtils.Error.createFriendlyMessage(error),
        variant: "destructive",
      });
    }
  });

  const { 
    images, 
    addImage, 
    addMessage,
    conversation,
    loading: conversationLoading 
  } = useConversation({
    conversationId: conversationId || undefined,
    autoSave: true
  });

  const handleCategorySubmit = useCallback(async (formValues: CategoryFormValues, referenceImages?: File[]) => {
    if (!selectedCategory) {
      toast({
        title: "No Category Selected",
        description: "Please select a category first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert reference images to base64 if provided
      const base64Images: string[] = [];
      if (referenceImages && referenceImages.length > 0) {
        for (const file of referenceImages) {
          const base64 = await fileToBase64(file);
          base64Images.push(base64);
        }
      }

      const request: any = { // Using any to avoid type conflicts during transition
        prompt: "Category-based generation", // Will be enhanced by backend
        categoryId: selectedCategory,
        formValues,
        referenceImages: base64Images, // Base64 strings for API transport
        quality,
        size: size as '1024x1024' | '256x256' | '512x512' | '1792x1024' | '1024x1792',
        style,
        user: 'current-user' // This should come from auth context
      };

      // Add user message to conversation
      addMessage({
        type: 'user',
        content: `Creating ${selectedCategory.replace('-', ' ')} with form data`
      });

      await generate(request as any); // Type assertion needed due to interface differences
      
      // Store form values for potential reuse
      setCategoryFormValues(formValues);

    } catch (error) {
      console.error('Category generation error:', error);
    }
  }, [selectedCategory, quality, size, style, generate, addMessage]);

  const handleGenerate = useCallback(async () => {
    const validation = HubUtils.Text.cleanPrompt(prompt);
    
    if (!validation || validation.trim().length < 3) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your image (at least 3 characters)",
        variant: "destructive",
      });
      return;
    }

    try {
      const request: ImageGenerationRequest = {
        prompt: validation,
        quality: 'auto', // Let AI decide optimal quality
        size: 'auto', // Let AI decide optimal size  
        format: 'png', // Default format
        background: 'auto', // Let AI decide optimal background
        user: 'current-user', // This should come from auth context
        categoryId: selectedCategory || undefined,
        formValues: categoryFormValues || undefined
      };

      // Validate request
      const requestValidation = HubUtils.Image.validateGenerationRequest(request);
      if (!requestValidation.isValid) {
        toast({
          title: "Invalid Request",
          description: requestValidation.error,
          variant: "destructive",
        });
        return;
      }

      // Add user message to conversation
      addMessage({
        type: 'user',
        content: validation
      });

      await generate(request);
      
      // Clear prompt after successful generation
      setPrompt("");

    } catch (error) {
      console.error('Generation error:', error);
    }
  }, [prompt, quality, size, style, conversationId, generate, addMessage]);

  const handleDownload = useCallback(async (image: GeneratedImage) => {
    if (!image.url) return;

    try {
      const filename = HubUtils.GeneratedImage.generateFilename(image);
      await HubUtils.Image.downloadImage(image.url, filename);

      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download image",
        variant: "destructive",
      });
    }
  }, []);

  const handleImageClick = useCallback((image: GeneratedImage) => {
    setSelectedImage(image);
    setIsImageEditorOpen(true);
  }, []);

  const handleImageEditorSave = useCallback((editedImage: GeneratedImage) => {
    // Add the edited image to the gallery
    addUserImage(editedImage);
    addImage(editedImage);
    
    toast({
      title: "Edited Image Saved",
      description: "Your edited image has been added to the gallery",
    });
  }, [addUserImage, addImage]);

  const handleImageEditorRegenerate = useCallback(async (enhancementPrompt: string, modifications: string) => {
    if (!selectedImage) return;

    try {
      const regenerationPrompt = `${selectedImage.prompt} | Enhancement: ${enhancementPrompt} | Applied modifications: ${modifications}`;
      
      const request: ImageGenerationRequest = {
        prompt: regenerationPrompt,
        quality: quality === 'hd' ? 'high' : 'medium',
        size: size === '1792x1024' ? '1536x1024' : size === '1024x1792' ? '1024x1536' : (size as '1024x1024' | '1536x1024' | '1024x1536'),
        format: 'png',
        background: 'auto',
        user: authUser?.id || 'anonymous'
      };

      // Add message about regeneration
      addMessage({
        type: 'user',
        content: `Regenerating image with enhancement: ${enhancementPrompt}`
      });

      await generate(request);
      
      toast({
        title: "Regenerating Image",
        description: "Creating an enhanced version based on your edits",
      });
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate the image",
        variant: "destructive",
      });
    }
  }, [selectedImage, quality, size, authUser, addMessage, generate]);

  const handleStartNewConversation = useCallback(() => {
    const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(newConversationId);
    setPrompt("");
  }, []);

  const handleCancel = useCallback(() => {
    cancel();
    toast({
      title: "Generation Cancelled",
      description: "Image generation has been stopped.",
    });
  }, [cancel]);

  // Category navigation handlers
  const handleCategorySelect = useCallback((category: ImageCategory) => {
    setSelectedCategory(category);
    setShowCategorySelector(false);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
    setShowCategorySelector(true);
    setCategoryFormValues({});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-background border rounded-2xl border-primary/20 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Creation Hub</h2>
            <p className="text-sm text-muted-foreground">Generate and create stunning images with AI</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={onClose}
          aria-label="Close Creation Hub"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border flex-shrink-0">
          <TabsList className="w-full justify-start rounded-none bg-transparent p-0 px-3 sm:px-4 h-11 sm:h-12">
            <TabsTrigger 
              value="generate" 
              className="relative h-9 sm:h-10 rounded-none border-b-2 border-transparent px-2 sm:px-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm transition-all touch-manipulation"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Generate</span>
                <span className="hidden md:inline">Gen Im</span>
              </div>
            </TabsTrigger>
           
            <TabsTrigger 
              value="video" 
              className="relative h-9 sm:h-10 rounded-none border-b-2 border-transparent px-2 sm:px-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm transition-all touch-manipulation"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Film className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Gen Vid</span>
                <span className="hidden md:inline">Gen Vid</span>
              </div>
            </TabsTrigger>

            <TabsTrigger 
              value="createvid" 
              className="relative h-9 sm:h-10 rounded-none border-b-2 border-transparent px-2 sm:px-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm transition-all touch-manipulation"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Create</span>
                <span className="hidden md:inline">Create</span>
              </div>
            </TabsTrigger>


            <TabsTrigger 
              value="gallery" 
              className="relative h-9 sm:h-10 rounded-none border-b-2 border-transparent px-2 sm:px-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm transition-all touch-manipulation"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Gallery</span>
                <span className="hidden md:inline">Gallery</span>
                {images.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1 py-0.5 h-5">
                    {images.length}
                  </Badge>
                )}
                {userVideos.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1 py-0.5 h-5 bg-primary">
                    {userVideos.length}v
                  </Badge>
                )}
              </div>
            </TabsTrigger>

            <TabsTrigger 
              value="ai-leads" 
              className="relative h-9 sm:h-10 rounded-none border-b-2 border-transparent px-2 sm:px-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm transition-all touch-manipulation"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">AI Leads</span>
                <span className="hidden md:inline">Leads</span>
              </div>
            </TabsTrigger>

            
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="generate" className="mt-0 h-full">
            <AnimatePresence mode="wait">
              {showCategorySelector ? (
                <motion.div
                  key="category-selector"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ScrollArea className="h-full">
                    <CategorySelector onSelectCategory={handleCategorySelect} className="m-4 sm:m-6" />
                  </ScrollArea>
                </motion.div>
              ) : selectedCategory ? (
                <motion.div
                  key="category-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ScrollArea className="h-full">
                    <CategoryForm
                      categoryId={selectedCategory}
                      onSubmit={handleCategorySubmit}
                      onBack={handleBackToCategories}
                      isGenerating={isGenerating}
                      className="m-4 sm:m-6 max-w-2xl mx-auto"
                    />
                  </ScrollArea>
                </motion.div>
              ) : (
                <motion.div
                  key="legacy-interface"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ScrollArea className="h-full p-3 sm:p-4">
                    <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
                      {/* Generation Settings */}
                      <Card className="glass-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Generation Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="quality">Quality</Label>
                              <Select value={quality} onValueChange={(value: 'standard' | 'hd') => setQuality(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="hd">HD</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="size">Size</Label>
                              <Select value={size} onValueChange={setSize}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                                  <SelectItem value="1792x1024">Landscape (1792×1024)</SelectItem>
                                  <SelectItem value="1024x1792">Portrait (1024×1792)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="style">Style</Label>
                              <Select value={style} onValueChange={(value: 'vivid' | 'natural') => setStyle(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="vivid">Vivid</SelectItem>
                                  <SelectItem value="natural">Natural</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Prompt Input */}
                      <Card className="glass-card">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Describe Your Vision
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="prompt">Image Description</Label>
                            <Textarea
                              id="prompt"
                              placeholder="Describe the image you want to create... Be as detailed as possible for better results."
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              className="min-h-[120px] resize-none"
                              disabled={isGenerating}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Tip: Include details about style, colors, composition, and mood</span>
                              <span>{prompt.length}/1000</span>
                            </div>
                          </div>
                          
                          {/* Progress Indicator */}
                          {isGenerating && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Generating...</span>
                                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}

                          {/* Error Display */}
                          {generationError && (
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-sm text-destructive">{HubUtils.Error.createFriendlyMessage(generationError)}</span>
                            </div>
                          )}
                          
                          <div className="flex gap-2 sm:gap-3">
                            <Button 
                              onClick={handleGenerate} 
                              disabled={isGenerating || !prompt.trim()}
                              className={cn(
                                "flex-1 h-11 sm:h-10",
                                "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700",
                                "shadow-lg hover:shadow-xl transition-all duration-200",
                                "active:scale-[0.98] touch-manipulation"
                              )}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4 text-primary" />
                                  Generate Image
                                </>
                              )}
                            </Button>
                            
                            {isGenerating && (
                              <Button 
                                onClick={handleCancel}
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 sm:h-10 sm:w-10 touch-manipulation active:scale-[0.95]"
                              >
                                <StopCircle className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                          </div>

                          {/* Conversation Controls */}
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Button
                              onClick={handleStartNewConversation}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <MessageSquare className="mr-1 h-3 w-3" />
                              New Conversation
                            </Button>
                            {conversation && (
                        <Badge variant="secondary" className="text-xs">
                          {conversation.images.length} images in conversation
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Generations Preview */}
                {images.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader className="pb-4">
                      <CardTitle>Latest Generation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {images.slice(0, 1).map((image) => (
                          <div key={image.id} className="relative group">
                            {image.status === 'generating' ? (
                              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                                  <p className="text-sm text-muted-foreground">Generating...</p>
                                </div>
                              </div>
                            ) : image.status === 'completed' ? (
                              <div className="relative aspect-square rounded-lg overflow-hidden">
                                <img 
                                  src={image.url} 
                                  alt={image.prompt}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <Button
                                    size="sm"
                                    onClick={() => handleDownload(image)}
                                    className="bg-white/20 backdrop-blur-sm border border-white/30"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-square bg-destructive/10 rounded-lg flex items-center justify-center">
                                <p className="text-sm text-destructive">Generation failed</p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {image.prompt}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="gallery" className="mt-0 h-full">
            <div className="flex flex-col h-full">
              {/* Gallery Sub-tabs */}
              <div className="border-b border-border flex-shrink-0 px-4 pt-4">
                <div className="flex gap-1">
                  <Button
                    variant={gallerySubTab === 'images' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setGallerySubTab('images')}
                    className="h-8 relative"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Images
                    {userImages.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                        {userImages.filter(img => img.status === 'completed').length}
                      </Badge>
                    )}
                    {userImagesLoading && gallerySubTab === 'images' && (
                      <div className="absolute -top-1 -right-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                      </div>
                    )}
                  </Button>
                  <Button
                    variant={gallerySubTab === 'videos' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setGallerySubTab('videos')}
                    className="h-8 relative"
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Videos
                    {userVideos.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                        {userVideos.length}
                      </Badge>
                    )}
                    {userVideosLoading && gallerySubTab === 'videos' && (
                      <div className="absolute -top-1 -right-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              {/* Gallery Content */}
              <ScrollArea className="flex-1 p-4">
                {gallerySubTab === 'images' ? (
                  <div className="space-y-6">
                    {/* Images Gallery Stats */}
                    {userImages.length > 0 && (
                      <Card className="glass-card">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 text-center">
                            {(() => {
                              const stats = HubUtils.GeneratedImage.calculateStats(userImages);
                              return (
                                <>
                                  <div>
                                    <div className="text-2xl font-bold text-primary">{stats.total}</div>
                                    <div className="text-xs text-muted-foreground">Total Images</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
                                    <div className="text-xs text-muted-foreground">Completed</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-yellow-500">{stats.generating}</div>
                                    <div className="text-xs text-muted-foreground">Generating</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-blue-500">{stats.successRate}%</div>
                                    <div className="text-xs text-muted-foreground">Success Rate</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Loading State */}
                    {userImagesLoading && userImages.length === 0 && (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading images...</span>
                      </div>
                    )}

                    {/* Generation Progress */}
                    {isGenerating && (
                      <Card className="glass-card border-primary/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-primary">Generating with GPT Image 1</span>
                                {progress > 0 && <span className="text-xs text-muted-foreground">{progress}%</span>}
                              </div>
                              <Progress value={progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">Creating your stunning image...</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancel}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <StopCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Image Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                      <AnimatePresence>
                        {HubUtils.GeneratedImage.sortImages(
                          HubUtils.GeneratedImage.filterByStatus(userImages, 'completed'),
                          'date'
                        ).map((image, index) => (
                          <motion.div
                            key={image.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: HubUtils.UI.getStaggerDelay(index, 0.05) }}
                            className="relative group cursor-pointer touch-manipulation"
                            onClick={() => handleImageClick(image)}
                          >
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={image.url} 
                                alt={HubUtils.GeneratedImage.getDisplayPrompt(image)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 md:group-hover:opacity-100">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(image);
                                }}
                                className="bg-white/20 backdrop-blur-sm border border-white/30 touch-manipulation active:scale-95"
                              >
                                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {HubUtils.Text.truncate(HubUtils.GeneratedImage.getDisplayPrompt(image), 50)}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{image.timestamp.toLocaleDateString()}</span>
                                {image.metadata?.quality && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {image.metadata.quality}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    
                    {/* Auth check */}
                    {!authLoading && !authUser && (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
                        <p className="text-muted-foreground mb-4">
                          Please sign in to view your images
                        </p>
                      </div>
                    )}

                    {/* No images state */}
                    {!userImagesLoading && authUser && HubUtils.GeneratedImage.filterByStatus(userImages, 'completed').length === 0 && (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No images yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Generate your first image to see it here
                        </p>
                        <Button onClick={() => setActiveTab("generate")} variant="outline">
                          <Wand2 className="mr-2 h-4 w-4" />
                          Start Creating
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Debug Section - Enhanced for video troubleshooting */}
                    <Card className="glass-card border-yellow-500/50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                            <h4 className="text-sm font-medium text-yellow-500">Debug Info</h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  console.log('Manual refresh triggered');
                                  console.log('Current videos state:', userVideos);
                                  refreshUserVideos();
                                }}
                              >
                                Refresh
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  console.log('=== VIDEO DEBUG INFO ===');
                                  console.log('userVideos length:', userVideos.length);
                                  console.log('userVideos data:', userVideos);
                                  userVideos.forEach((video, index) => {
                                    console.log(`Video ${index + 1}:`, {
                                      id: video.id,
                                      filename: video.filename,
                                      status: video.status,
                                      hasUrl: !!video.video_url,
                                      url: video.video_url,
                                      created_at: video.created_at
                                    });
                                  });
                                  console.log('authUser:', authUser);
                                  console.log('authLoading:', authLoading);
                                  console.log('userVideosLoading:', userVideosLoading);
                                }}
                              >
                                Log Videos
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  console.log('=== MANUAL DB TEST ===');
                                  try {
                                    const { getBrowserSupabaseClient } = await import('@/lib/supabase/client');
                                    const supabase = getBrowserSupabaseClient();
                                    const { data: { user } } = await supabase.auth.getUser();
                                    
                                    if (user) {
                                      console.log('User ID:', user.id);
                                      const { data, error } = await supabase
                                        .from('created_videos')
                                        .select('*')
                                        .eq('user_id', user.id)
                                        .order('created_at', { ascending: false });
                                      
                                      console.log('DB Query Result:', { data, error });
                                      console.log('Raw videos from DB:', data);
                                    } else {
                                      console.log('No user authenticated');
                                    }
                                  } catch (error) {
                                    console.error('Manual DB test failed:', error);
                                  }
                                }}
                              >
                                Test DB
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Loading: {userVideosLoading ? 'true' : 'false'}</p>
                            <p>Auth User: {authUser ? authUser.id : 'null'}</p>
                            <p>Videos Count: {userVideos.length}</p>
                            <p>Auth Loading: {authLoading ? 'true' : 'false'}</p>
                            {userVideos.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="font-medium">Video Details:</p>
                                {userVideos.slice(0, 3).map((video, index) => (
                                  <div key={video.id} className="text-xs bg-gray-800 p-2 rounded">
                                    <p>Video {index + 1}: {video.filename}</p>
                                    <p>Status: {video.status}</p>
                                    <p>Has URL: {video.video_url ? 'Yes' : 'No'}</p>
                                    <p>URL: {video.video_url ? video.video_url.substring(0, 40) + '...' : 'None'}</p>
                                  </div>
                                ))}
                                {userVideos.length > 3 && (
                                  <p className="text-xs">... and {userVideos.length - 3} more videos</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Videos Gallery Stats */}
                    {userVideos.length > 0 && (
                      <Card className="glass-card">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-primary">{userVideos.length}</div>
                              <div className="text-xs text-muted-foreground">Total Videos</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-500">
                                {userVideos.filter(v => v.status === 'completed').length}
                              </div>
                              <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-blue-500">
                                {Math.round(userVideos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0))}s
                              </div>
                              <div className="text-xs text-muted-foreground">Total Duration</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-purple-500">
                                {Math.round(userVideos.reduce((acc, v) => acc + (v.file_size || 0), 0) / (1024 * 1024))}MB
                              </div>
                              <div className="text-xs text-muted-foreground">Total Size</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Loading State */}
                    {userVideosLoading && userVideos.length === 0 && (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading videos...</span>
                      </div>
                    )}

                    {/* Video Grid - Enhanced Visibility for Debugging */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-2 border-red-500 min-h-[200px] p-4">
                      <div className="col-span-full text-sm text-red-500 mb-2">
                        Video Grid Container - Should contain {userVideos.length} videos
                      </div>
                      <AnimatePresence>
                        {userVideos.map((video, index) => {
                          // Debug logging for each video
                          console.log(`Rendering video ${index + 1}:`, {
                            id: video.id,
                            filename: video.filename,
                            status: video.status,
                            hasUrl: !!video.video_url,
                            url: video.video_url?.substring(0, 50)
                          });
                          
                          return (
                            <motion.div
                              key={video.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: HubUtils.UI.getStaggerDelay(index, 0.1) }}
                              className="relative group border-2 border-blue-500"
                              style={{ minHeight: '300px' }}
                            >
                              <Card className="glass-card overflow-hidden h-full">
                                <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                                  <video
                                    src={video.video_url}
                                    controls
                                    preload="metadata"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('Video error for:', video.filename, e);
                                    }}
                                    onLoadStart={() => {
                                      console.log('Video loading started for:', video.filename);
                                    }}
                                  >
                                    <p>Your browser doesn't support HTML5 video.</p>
                                  </video>
                                </div>
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    {video.original_text && (
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {video.original_text}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{new Date(video.created_at).toLocaleDateString()}</span>
                                      <div className="flex items-center gap-2">
                                        {video.duration_seconds && (
                                          <Badge variant="outline" className="text-xs px-1 py-0">
                                            {video.duration_seconds}s
                                          </Badge>
                                        )}
                                        {video.voice_character && (
                                          <Badge variant="outline" className="text-xs px-1 py-0">
                                            {video.voice_character}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">
                                        {video.file_size ? `${Math.round(video.file_size / (1024 * 1024))}MB` : 'Unknown size'}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(video.video_url, '_blank')}
                                        className="h-7 px-2"
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      
                      {/* Fallback rendering without animation */}
                      {userVideos.length === 0 && (
                        <div className="col-span-full text-center text-yellow-500 p-4">
                          No videos found in userVideos array
                        </div>
                      )}
                    </div>
                    
                    {/* Fallback Static Video Grid (No Animation) */}
                    <div className="mt-6 p-4 border-2 border-green-500">
                      <h4 className="text-green-500 text-sm mb-4">Static Video Grid (No Animation) - {userVideos.length} videos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userVideos.map((video, index) => (
                          <div
                            key={`static-${video.id}`}
                            className="border border-purple-500 bg-gray-900 rounded-lg overflow-hidden"
                          >
                            <div className="aspect-video bg-black">
                              <video
                                src={video.video_url}
                                controls
                                preload="metadata"
                                className="w-full h-full object-cover"
                              >
                                <p>Video not supported</p>
                              </video>
                            </div>
                            <div className="p-3">
                              <p className="text-sm text-white">{video.filename}</p>
                              <p className="text-xs text-gray-400">{video.status}</p>
                              {video.original_text && (
                                <p className="text-xs text-gray-300 mt-1">{video.original_text}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Debug info for video rendering */}
                    {userVideos.length > 0 && (
                      <div className="text-xs text-muted-foreground text-center">
                        Debug: {userVideos.length} videos in state, attempting to render them above
                      </div>
                    )}

                    {/* Auth check */}
                    {!authLoading && !authUser && (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
                        <p className="text-muted-foreground mb-4">
                          Please sign in to view your videos
                        </p>
                      </div>
                    )}

                    {/* No videos state */}
                    {!userVideosLoading && authUser && userVideos.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center">
                        <Film className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No videos yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Create your first video to see it here
                        </p>
                        <Button onClick={() => setActiveTab("createvid")} variant="outline">
                          <Wand2 className="mr-2 h-4 w-4" />
                          Create Video
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="ai-leads" className="mt-0 h-full">
            <AILeadsInterface />
          </TabsContent>

          <TabsContent value="video" className="mt-0 h-full">
            <ScrollArea className="h-full p-4">
              <VideoGenerator />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="createvid" className="mt-0 h-full">
            <ScrollArea className="h-full p-4">
              <CreateVid onVideoCreated={(video) => {
                // Add video to gallery state but DON'T switch tabs
                addUserVideo(video);
                // Refresh video list to ensure sync with database
                refreshUserVideos();
                // DON'T switch tabs - let user see the video on CreateVid page
                toast({
                  title: "Video Created Successfully!",
                  description: "Your video is ready and has been added to the gallery",
                });
              }} />
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Image Editor Modal */}
      <ImageEditorModal
        image={selectedImage}
        isOpen={isImageEditorOpen}
        onClose={() => {
          setIsImageEditorOpen(false);
          setSelectedImage(null);
        }}
        onSave={handleImageEditorSave}
        onRegenerate={handleImageEditorRegenerate}
      />
    </motion.div>
  );
} 
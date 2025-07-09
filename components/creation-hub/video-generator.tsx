"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Play, 
  Download, 
  Loader2, 
  StopCircle, 
  AlertCircle,
  Sparkles,
  Film,
  Clock,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useVideoGeneration, type GeneratedVideo, type VideoGenerationRequest } from "./hooks/use-video-generation";
import { useUserImages } from "./hooks/use-user-images";
import type { GeneratedImage } from "./hub-types";

interface VideoGeneratorProps {
  className?: string;
}

export function VideoGenerator({ className }: VideoGeneratorProps) {
  const [selectedImage, setSelectedImage] = useState<File | GeneratedImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user images for gallery
  const { 
    images: userImages, 
    loading: userImagesLoading 
  } = useUserImages({
    autoLoad: true,
    limit: 50
  });

  // Video generation hook
  const { 
    generate, 
    cancel, 
    isGenerating, 
    progress, 
    error: generationError, 
    currentVideo 
  } = useVideoGeneration({
    streaming: true,
    onSuccess: (video) => {
      toast({
        title: "Video Generated!",
        description: "Your 5-second video has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    setActiveTab("upload");
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleGalleryImageSelect = useCallback((image: GeneratedImage) => {
    setSelectedImage(image);
    setActiveTab("gallery");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || !prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an image and provide a prompt.",
        variant: "destructive",
      });
      return;
    }

    try {
      const request: VideoGenerationRequest = {
        prompt: prompt.trim(),
        duration: 5 // Fixed to 5 seconds
      };

      if (selectedImage instanceof File) {
        request.imageFile = selectedImage;
      } else {
        request.imageUrl = selectedImage.url;
      }

      await generate(request);
    } catch (error) {
      // Error handling is done in the hook
    }
  }, [selectedImage, prompt, generate]);

  const handleDownloadVideo = useCallback(async (video: GeneratedVideo) => {
    if (!video.videoUrl) return;

    try {
      const response = await fetch(video.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your video download has begun.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the video.",
        variant: "destructive",
      });
    }
  }, []);

  const getImageSource = useCallback(() => {
    if (!selectedImage) return null;
    
    if (selectedImage instanceof File) {
      return URL.createObjectURL(selectedImage);
    } else {
      return selectedImage.url;
    }
  }, [selectedImage]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <Film className="h-6 w-6 text-primary" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Gen Video
              </h2>
              <p className="text-sm text-muted-foreground font-normal">
                Create stunning 5-second videos from your images
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              5s
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Image Selection */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Select Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "gallery")} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              {/* File Upload Area */}
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer group",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                  selectedImage instanceof File ? "border-primary bg-primary/5" : ""
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleImageClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={isGenerating}
                />
                
                {selectedImage instanceof File ? (
                  <div className="relative p-4">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={getImageSource()!} 
                        alt="Selected image"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium">{selectedImage.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <h3 className="text-lg font-medium mb-2">Upload Image</h3>
                    <p className="text-muted-foreground mb-4">
                      Drag and drop an image here, or click to browse
                    </p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports JPG, PNG, WebP (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4">
              {userImagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading gallery...</span>
                </div>
              ) : userImages.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {userImages.slice(0, 12).map((image) => (
                      <motion.div
                        key={image.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors",
                          selectedImage === image ? "border-primary shadow-lg" : "border-transparent hover:border-primary/50"
                        )}
                        onClick={() => handleGalleryImageSelect(image)}
                      >
                        <img 
                          src={image.url} 
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                        />
                        {selectedImage === image && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary rounded-full p-1">
                              <Video className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No images in gallery</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setActiveTab("upload")}
                    className="text-xs"
                  >
                    Upload your first image
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Prompt Input */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Video Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-prompt">Describe how the video should animate</Label>
            <Textarea
              id="video-prompt"
              placeholder="Example: Gentle camera zoom-in with subtle lighting changes, professional and clean presentation..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Keep it professional and realistic for best results</span>
              <span>{prompt.length}/500</span>
            </div>
          </div>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Generating video...
                </span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This usually takes 2-3 minutes. You can close this and come back later.
              </p>
            </div>
          )}

          {/* Error Display */}
          {generationError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{generationError.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedImage || !prompt.trim()}
              className={cn(
                "flex-1 h-11",
                "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700",
                "shadow-lg hover:shadow-xl transition-all duration-200",
                "active:scale-[0.98] touch-manipulation"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Film className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
            
            {isGenerating && (
              <Button 
                onClick={cancel}
                variant="outline"
                size="icon"
                className="h-11 w-11 touch-manipulation active:scale-[0.95]"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated Video Result */}
      <AnimatePresence>
        {currentVideo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Generated Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    {currentVideo.status === 'completed' && currentVideo.videoUrl ? (
                      <video 
                        src={currentVideo.videoUrl} 
                        controls
                        className="w-full h-full"
                        poster={getImageSource() || undefined}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : currentVideo.status === 'generating' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                          <p className="text-lg font-medium">Creating your video...</p>
                          <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
                        </div>
                      </div>
                    ) : currentVideo.status === 'failed' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                          <p className="text-lg font-medium">Generation Failed</p>
                          <p className="text-sm text-muted-foreground">{currentVideo.errorMessage}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium line-clamp-2">{currentVideo.prompt}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{currentVideo.status}</Badge>
                        <span>•</span>
                        <span>{currentVideo.duration}s</span>
                        <span>•</span>
                        <span>{currentVideo.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {currentVideo.status === 'completed' && currentVideo.videoUrl && (
                      <Button
                        onClick={() => handleDownloadVideo(currentVideo)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
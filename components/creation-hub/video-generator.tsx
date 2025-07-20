"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
  Wand2,
  Globe,
  Star,
  Heart,
  Zap,
  Camera,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useVideoGeneration, type GeneratedVideo, type VideoGenerationRequest } from "./hooks/use-video-generation";
import { useUserImages } from "./hooks/use-user-images";
import type { GeneratedImage } from "./hub-types";
import { useTranslation } from "@/hooks/useTranslation";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { FeatureGuard } from "@/components/subscription/feature-guard";
import { useSubscription } from '@/hooks/use-subscription';

// Social media platform configurations
interface SocialMediaPlatform {
  id: string;
  name: string;
  formats: SocialMediaFormat[];
}

interface SocialMediaFormat {
  id: string;
  name: string;
  description: string;
  maxCharacters: number;
  recommendedDuration: number; // in seconds
  aspectRatio: string;
  promptModifier: string;
}

const SOCIAL_MEDIA_PLATFORMS: SocialMediaPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    formats: [
      {
        id: 'instagram-post',
        name: 'Post (1:1)',
        description: 'Square format for feed posts',
        maxCharacters: 150,
        recommendedDuration: 5,
        aspectRatio: '1:1',
        promptModifier: 'Create smooth, professional movement suitable for Instagram feed'
      },
      {
        id: 'instagram-story',
        name: 'Story (9:16)',
        description: 'Vertical format for stories',
        maxCharacters: 100,
        recommendedDuration: 5,
        aspectRatio: '9:16',
        promptModifier: 'Create engaging vertical movement for Instagram stories'
      },
      {
        id: 'instagram-reel',
        name: 'Reel (9:16)',
        description: 'Vertical format for reels',
        maxCharacters: 150,
        recommendedDuration: 5,
        aspectRatio: '9:16',
        promptModifier: 'Create dynamic, eye-catching movement for Instagram reels'
      }
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    formats: [
      {
        id: 'tiktok-video',
        name: 'TikTok (9:16)',
        description: 'Vertical format optimized for TikTok',
        maxCharacters: 100,
        recommendedDuration: 5,
        aspectRatio: '9:16',
        promptModifier: 'Create trendy, engaging movement perfect for TikTok'
      }
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    formats: [
      {
        id: 'youtube-short',
        name: 'Short (9:16)',
        description: 'Vertical format for YouTube Shorts',
        maxCharacters: 150,
        recommendedDuration: 5,
        aspectRatio: '9:16',
        promptModifier: 'Create compelling movement for YouTube Shorts'
      },
      {
        id: 'youtube-video',
        name: 'Video (16:9)',
        description: 'Horizontal format for regular videos',
        maxCharacters: 200,
        recommendedDuration: 5,
        aspectRatio: '16:9',
        promptModifier: 'Create professional, cinematic movement for YouTube'
      }
    ]
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    formats: [
      {
        id: 'twitter-video',
        name: 'Video (16:9)',
        description: 'Horizontal format for Twitter videos',
        maxCharacters: 120,
        recommendedDuration: 5,
        aspectRatio: '16:9',
        promptModifier: 'Create attention-grabbing movement for Twitter'
      }
    ]
  }
];

interface VideoGeneratorProps {
  className?: string;
  language?: string;
  onVideoGenerated?: (video: any) => void;
}

export function VideoGenerator({ className, language = "en", onVideoGenerated }: VideoGeneratorProps) {
  const [selectedImage, setSelectedImage] = useState<File | GeneratedImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');
  const [selectedFormat, setSelectedFormat] = useState<string>('instagram-post');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Constants for prompt validation
  const MAX_PROMPT_LENGTH = 150;
  const WARNING_THRESHOLD = 130;
  
  // Translation setup
  const { translateText } = useTranslation();
  const [translatedText, setTranslatedText] = useState({
    genVideo: "Gen Video",
    createVideoDesc: "Create stunning 5-second videos from your images",
    selectImage: "Select Image",
    upload: "Upload",
    gallery: "Gallery",
    uploadImage: "Upload Image",
    dragAndDrop: "Drag and drop an image here, or click to browse",
    chooseFile: "Choose File",
    supportedFormats: "Supports JPG, PNG, WebP (max 10MB)",
    loadingGallery: "Loading gallery...",
    noImagesGallery: "No images in gallery",
    uploadFirstImage: "Upload your first image",
    socialPlatform: "Social Media Platform",
    selectPlatform: "Select platform and format for your video",
    videoPrompt: "Video Prompt",
    describeAnimation: "Describe how the video should animate",
    promptPlaceholder: "Example: Gentle camera zoom-in with subtle lighting changes, professional and clean presentation...",
    keepProfessional: "Keep it professional and realistic for best results",
    generatingVideo: "Generating video...",
    processingTime: "This usually takes 2-3 minutes. You can close this and come back later.",
    generate: "Generate",
    missingInfo: "Missing Information",
    missingInfoDesc: "Please select an image and provide a prompt.",
    invalidFile: "Invalid File",
    invalidFileDesc: "Please select an image file.",
    fileTooLarge: "File Too Large",
    fileTooLargeDesc: "Please select an image smaller than 10MB.",
    videoGenerated: "Video Generated!",
    videoGeneratedDesc: "Your 5-second video has been created successfully."
  });

  const { permissions, loading: subscriptionLoading } = useSubscription();
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Marquer les permissions comme chargées une fois que subscriptionLoading est false
  useEffect(() => {
    if (!subscriptionLoading && permissions !== null) {
      setPermissionsLoaded(true);
    }
  }, [subscriptionLoading, permissions]);

  // Ne pas afficher le bouton tant que les permissions ne sont pas chargées
  const shouldShowGenerateButton = permissionsLoaded && !subscriptionLoading;

  // Helper functions for platform selection
  const getSelectedPlatformData = () => {
    return SOCIAL_MEDIA_PLATFORMS.find(p => p.id === selectedPlatform);
  };

  const getSelectedFormatData = () => {
    const platform = getSelectedPlatformData();
    return platform?.formats.find(f => f.id === selectedFormat);
  };

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    const platform = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === platformId);
    if (platform && platform.formats.length > 0) {
      setSelectedFormat(platform.formats[0].id);
    }
  };

  // Initialize translations
  useEffect(() => {
    const translateUI = async () => {
      try {
        const translations = await Promise.all([
          translateText("Gen Video", language, "en"),
          translateText("Create stunning 5-second videos from your images", language, "en"),
          translateText("Select Image", language, "en"),
          translateText("Upload", language, "en"),
          translateText("Gallery", language, "en"),
          translateText("Upload Image", language, "en"),
          translateText("Drag and drop an image here, or click to browse", language, "en"),
          translateText("Choose File", language, "en"),
          translateText("Supports JPG, PNG, WebP (max 10MB)", language, "en"),
          translateText("Loading gallery...", language, "en"),
          translateText("No images in gallery", language, "en"),
          translateText("Upload your first image", language, "en"),
          translateText("Social Media Platform", language, "en"),
          translateText("Select platform and format for your video", language, "en"),
          translateText("Video Prompt", language, "en"),
          translateText("Describe how the video should animate", language, "en"),
          translateText("Example: Gentle camera zoom-in with subtle lighting changes, professional and clean presentation...", language, "en"),
          translateText("Keep it professional and realistic for best results", language, "en"),
          translateText("Generating video...", language, "en"),
          translateText("This usually takes 2-3 minutes. You can close this and come back later.", language, "en"),
          translateText("Generate", language, "en"),
          translateText("Missing Information", language, "en"),
          translateText("Please select an image and provide a prompt.", language, "en"),
          translateText("Invalid File", language, "en"),
          translateText("Please select an image file.", language, "en"),
          translateText("File Too Large", language, "en"),
          translateText("Please select an image smaller than 10MB.", language, "en"),
          translateText("Video Generated!", language, "en"),
          translateText("Your 5-second video has been created successfully.", language, "en")
        ]);

        setTranslatedText({
          genVideo: translations[0],
          createVideoDesc: translations[1],
          selectImage: translations[2],
          upload: translations[3],
          gallery: translations[4],
          uploadImage: translations[5],
          dragAndDrop: translations[6],
          chooseFile: translations[7],
          supportedFormats: translations[8],
          loadingGallery: translations[9],
          noImagesGallery: translations[10],
          uploadFirstImage: translations[11],
          socialPlatform: translations[12],
          selectPlatform: translations[13],
          videoPrompt: translations[14],
          describeAnimation: translations[15],
          promptPlaceholder: translations[16],
          keepProfessional: translations[17],
          generatingVideo: translations[18],
          processingTime: translations[19],
          generate: translations[20],
          missingInfo: translations[21],
          missingInfoDesc: translations[22],
          invalidFile: translations[23],
          invalidFileDesc: translations[24],
          fileTooLarge: translations[25],
          fileTooLargeDesc: translations[26],
          videoGenerated: translations[27],
          videoGeneratedDesc: translations[28]
        });
      } catch (error) {
        console.error('Translation error:', error);
      }
    };

    translateUI();
  }, [language]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = getBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Hook for video generation
  const {
    currentVideo,
    isGenerating,
    progress,
    error: generationError,
    generate: generateVideo
  } = useVideoGeneration({
    onSuccess: (video) => {
      toast({
        title: translatedText.videoGenerated,
        description: translatedText.videoGeneratedDesc,
      });
      onVideoGenerated?.(video);
    }
  });

  // Hook for user images
  const {
    images: userImages,
    loading: userImagesLoading,
    refetch: refreshUserImages
  } = useUserImages();

  // File handling
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
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect([files[0]]);
    }
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: translatedText.invalidFile,
        description: translatedText.invalidFileDesc,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: translatedText.fileTooLarge,
        description: translatedText.fileTooLargeDesc,
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
  };

  const handleGalleryImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image);
  };

  const getImageSource = () => {
    if (!selectedImage) return null;
    if (selectedImage instanceof File) {
      return URL.createObjectURL(selectedImage);
    }
    return selectedImage.url;
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) {
      toast({
        title: translatedText.missingInfo,
        description: translatedText.missingInfoDesc,
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate videos",
        variant: "destructive",
      });
      return;
    }

    // Traiter correctement l'image selon son type
    const request: VideoGenerationRequest = {
      // Si selectedImage est un File (uploadé), utiliser imageFile
      ...(selectedImage instanceof File 
        ? { imageFile: selectedImage }
        : { imageUrl: selectedImage.url }
      ),
      prompt: prompt.trim(),
      platform: selectedPlatform,
      format: selectedFormat
    };

    await generateVideo(request);
  };

  const handleDownloadVideo = useCallback(async (video: GeneratedVideo) => {
    if (!video.videoUrl) return;

    try {
      const response = await fetch(video.videoUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Generate filename based on video data
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedPrompt = video.prompt 
        ? video.prompt.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 30)
        : 'video';
      const filename = `video-${timestamp}-${sanitizedPrompt}-${video.id.slice(-6)}.mp4`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download video",
        variant: "destructive",
      });
    }
  }, []);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (selectedImage instanceof File) {
        URL.revokeObjectURL(URL.createObjectURL(selectedImage));
      }
    };
  }, [selectedImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-75" />
                  <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-xl">
                    <Film className="h-8 w-8 text-white" />
                    <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                    {translatedText.genVideo}
                  </h1>
                  <p className="text-white/60 text-sm md:text-base">
                    {translatedText.createVideoDesc}
                  </p>
                </div>
              </div>
              
              <Badge variant="secondary" className="bg-white/10 border-white/20 text-white flex items-center gap-2 px-4 py-2">
                <Clock className="h-4 w-4" />
                5s
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Image Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 rounded-2xl blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-75" />
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">{translatedText.selectImage}</h3>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "gallery")} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20 backdrop-blur-sm">
                <TabsTrigger value="upload" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  <Upload className="h-4 w-4" />
                  {translatedText.upload}
                </TabsTrigger>
                <TabsTrigger value="gallery" className="flex items-center gap-2 text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  <Camera className="h-4 w-4" />
                  {translatedText.gallery}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                {/* File Upload Area */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={cn(
                    "relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer group backdrop-blur-sm",
                    dragActive ? "border-purple-400 bg-purple-500/10" : "border-white/30 hover:border-purple-400/60",
                    selectedImage instanceof File ? "border-purple-400 bg-purple-500/10" : ""
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
                    <div className="relative p-6">
                      <div className="relative rounded-lg overflow-hidden bg-black/40 border border-white/10 max-w-2xl mx-auto">
                        <img 
                          src={getImageSource()!} 
                          alt="Selected image"
                          className="w-full max-h-96 object-contain"
                        />
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm font-medium text-white">{selectedImage.name}</p>
                        <p className="text-xs text-white/60">
                          {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <Upload className="h-16 w-16 mx-auto mb-4 text-white/60 group-hover:text-purple-400 transition-colors duration-300" />
                      <h3 className="text-lg font-medium mb-2 text-white">{translatedText.uploadImage}</h3>
                      <p className="text-white/60 mb-4">
                        {translatedText.dragAndDrop}
                      </p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                          {translatedText.chooseFile}
                        </Button>
                      </motion.div>
                      <p className="text-xs text-white/50 mt-3">
                        {translatedText.supportedFormats}
                      </p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4">
                {/* Zone de prévisualisation pour l'image sélectionnée de la galerie */}
                {selectedImage && !(selectedImage instanceof File) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 rounded-xl blur-xl" />
                    <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-75" />
                          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                            <ImageIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-white">Selected Image</h4>
                      </div>
                      <div className="relative rounded-lg overflow-hidden bg-black/40 border border-white/10 max-w-2xl mx-auto">
                        <img 
                          src={selectedImage.url} 
                          alt={selectedImage.prompt || "Selected image"}
                          className="w-full max-h-64 object-contain"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-sm font-medium text-white truncate">
                          {selectedImage.prompt || "Gallery Image"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {userImagesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                    <span className="ml-3 text-sm text-white/80">{translatedText.loadingGallery}</span>
                  </div>
                ) : userImages.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userImages.slice(0, 12).map((image) => (
                        <motion.div
                          key={image.id}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300 shadow-lg",
                            selectedImage === image ? "border-purple-400 shadow-purple-400/50" : "border-transparent hover:border-purple-400/60"
                          )}
                          onClick={() => handleGalleryImageSelect(image)}
                        >
                          <img 
                            src={image.url} 
                            alt={image.prompt}
                            className="w-full aspect-square object-cover"
                          />
                          {selectedImage === image && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center backdrop-blur-sm">
                              <div className="bg-purple-600 rounded-full p-2">
                                <Video className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <ImageIcon className="h-12 w-12 text-white/40 mb-3" />
                    <p className="text-sm text-white/60 mb-2">{translatedText.noImagesGallery}</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setActiveTab("upload")}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      {translatedText.uploadFirstImage}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Platform Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-teal-600/20 rounded-2xl blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur opacity-75" />
                <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
                  <Globe className="h-5 w-5 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">{translatedText.socialPlatform}</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-white/80">{translatedText.selectPlatform}</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Platform Selection */}
                <div className="space-y-3">
                  <Label htmlFor="platform-select" className="text-white/80">Platform</Label>
                  <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                    <SelectTrigger id="platform-select" className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900/95 border-white/20 backdrop-blur-xl">
                      {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id} className="text-white hover:bg-white/10">
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format Selection */}
                <div className="space-y-3">
                  <Label htmlFor="format-select" className="text-white/80">Format</Label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger id="format-select" className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900/95 border-white/20 backdrop-blur-xl">
                      {getSelectedPlatformData()?.formats.map((format) => (
                        <SelectItem key={format.id} value={format.id} className="text-white hover:bg-white/10">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{format.name}</span>
                            <span className="text-xs text-white/60">{format.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Format Info */}
              {getSelectedFormatData() && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 mt-4"
                >
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-200 border-blue-500/30">
                    {getSelectedFormatData()?.aspectRatio}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-200 border-blue-500/30">
                    5s duration (fixed)
                  </Badge>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl" />
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-75" />
                <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">{translatedText.videoPrompt}</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="video-prompt" className="text-white/80">{translatedText.describeAnimation}</Label>
                <Textarea
                  id="video-prompt"
                  placeholder={translatedText.promptPlaceholder}
                  value={prompt}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Allow typing but warn when over limit
                    if (newValue.length <= MAX_PROMPT_LENGTH + 50) { // Allow some buffer for editing
                      setPrompt(newValue);
                    }
                  }}
                  className={cn(
                    "min-h-[100px] resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm transition-all duration-300 focus:bg-white/20",
                    prompt.length > MAX_PROMPT_LENGTH && "border-red-400 focus:border-red-400",
                    prompt.length > WARNING_THRESHOLD && prompt.length <= MAX_PROMPT_LENGTH && "border-yellow-500 focus:border-yellow-500"
                  )}
                  disabled={isGenerating}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">
                    {prompt.length <= WARNING_THRESHOLD ? translatedText.keepProfessional : 
                     prompt.length <= MAX_PROMPT_LENGTH ? "Approaching character limit" : 
                     "Prompt too long - please shorten"}
                  </span>
                  <span className={cn(
                    prompt.length > MAX_PROMPT_LENGTH ? "text-red-400 font-medium" :
                    prompt.length > WARNING_THRESHOLD ? "text-yellow-400" : "text-white/60"
                  )}>
                    {prompt.length}/{MAX_PROMPT_LENGTH}
                  </span>
                </div>
              </div>

              {/* Progress Indicator */}
              {isGenerating && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2 text-white">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      {translatedText.generatingVideo}
                    </span>
                    <span className="text-sm text-white/80">{Math.round(progress)}%</span>
                  </div>
                  <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{translatedText.processingTime}</span>
                    <span>
                      {progress < 25 ? "Initializing..." : 
                       progress < 50 ? "Processing..." : 
                       progress < 75 ? "Generating..." : 
                       progress < 100 ? "Finalizing..." : "Almost done!"}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Success Indicator */}
              {currentVideo && currentVideo.status === 'completed' && currentVideo.videoUrl && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 rounded-lg backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-300">Video Generated Successfully!</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate-to-gallery', { 
                        detail: { tab: 'videos' } 
                      }));
                    }}
                    className="ml-auto text-green-300 border-green-400/30 hover:bg-green-500/10 bg-transparent"
                  >
                    View in Gallery
                  </Button>
                </motion.div>
              )}

              {/* Error Display */}
              {generationError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm"
                >
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-300">{generationError.message}</span>
                </motion.div>
              )}

              {/* Generate Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-cyan-600/30 rounded-xl blur-lg" />
                {shouldShowGenerateButton ? (
                  <Button 
                    onClick={handleGenerate}
                    disabled={(
                      !selectedImage || 
                      !prompt.trim() || 
                      isGenerating || 
                      prompt.trim().length > MAX_PROMPT_LENGTH ||
                      subscriptionLoading ||
                      (permissions ? !permissions.generate_video : false)
                    )}
                    className={cn(
                      "w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 h-12 text-lg font-bold shadow-2xl border-0 relative overflow-hidden group",
                      // Ajouter des styles pour indiquer que le bouton est désactivé pour les utilisateurs non-Pro
                      (permissions ? !permissions.generate_video : false) ? "opacity-50 cursor-not-allowed" : ""
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5 mr-2" />
                    )}
                    {translatedText.generate}
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="w-full h-12 text-lg font-bold bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading...
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Video Preview */}
        {currentVideo && currentVideo.videoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl" />
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                <video
                  src={currentVideo.videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadVideo(currentVideo)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 
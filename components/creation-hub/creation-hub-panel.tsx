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
  AlertCircle,
  Globe
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
import { useTranslation } from "@/hooks/useTranslation";
import { CATEGORY_INFO, CATEGORY_FORMS } from './category-types';

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

// Language options - same as used in other components
const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" }
];

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
  
  // Add language state
  const [language, setLanguage] = useState<string>("en");
  const { translateText, isTranslating, clearCache } = useTranslation();
  
  // Add translated UI text state
  const [translatedText, setTranslatedText] = useState({
    title: "Creation Hub",
    subtitle: "Generate and create stunning images with AI",
    categoryTitle: "Choose Creation Type",
    categorySubtitle: "Select a category to unlock specialized tools and enhanced prompts",
    searchPlaceholder: "Search categories...",
    // Tab names
    genIm: "Gen Im",
    genVid: "Gen Vid",
    create: "Create",
    gallery: "Gallery",
    leads: "Leads",
    images: "Images",
    videos: "Videos"
  });
  
  // Add state for translated categories
  const [translatedCategories, setTranslatedCategories] = useState<Record<string, {name: string, description: string}>>({});
  
  // Add state for translated form fields
  const [translatedFields, setTranslatedFields] = useState<Record<string, Record<string, {
    label?: string;
    description?: string;
    placeholder?: string;
  }>>>({});
  
  // NOUVEAUX ÉTATS À AJOUTER
  const [imagesHaveBeenLoaded, setImagesHaveBeenLoaded] = useState(false);
  const [videosHaveBeenLoaded, setVideosHaveBeenLoaded] = useState(false);
  
  // New category-based state
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(true);
  const [categoryFormValues, setCategoryFormValues] = useState<CategoryFormValues>({});

  // Add state to track when translations are complete
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

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

  // Lazy load data when tabs are accessed (CORRIGÉ)
  useEffect(() => {
    // On charge les images seulement si l'onglet est actif ET qu'on ne les a JAMAIS chargées auparavant.
    if (activeTab === "gallery" && gallerySubTab === "images" && !imagesHaveBeenLoaded) {
      logger.info('[CreationHubPanel] Lazy loading user images');
      refetchUserImages();
      setImagesHaveBeenLoaded(true); // On marque comme "chargé" pour ne plus le refaire.
    }
  }, [activeTab, gallerySubTab, imagesHaveBeenLoaded, refetchUserImages]);

  useEffect(() => {
    // On charge les vidéos seulement si l'onglet est actif ET qu'on ne les a JAMAIS chargées auparavant.
    if (activeTab === "gallery" && gallerySubTab === "videos" && !videosHaveBeenLoaded) {
      logger.info('[CreationHubPanel] Lazy loading user videos');
      refreshUserVideos();
      setVideosHaveBeenLoaded(true); // On marque comme "chargé" pour ne plus le refaire.
    }
  }, [activeTab, gallerySubTab, videosHaveBeenLoaded, refreshUserVideos]);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('creation-hub-language');
    if (savedLanguage && languages.find(lang => lang.code === savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Listen for gallery navigation events
  useEffect(() => {
    const handleNavigateToGallery = (event: CustomEvent) => {
      const { tab } = event.detail;
      setActiveTab('gallery');
      if (tab === 'videos') {
        setGallerySubTab('videos');
      } else if (tab === 'images') {
        setGallerySubTab('images');
      }
    };

    window.addEventListener('navigate-to-gallery', handleNavigateToGallery as EventListener);
    return () => {
      window.removeEventListener('navigate-to-gallery', handleNavigateToGallery as EventListener);
    };
  }, []);

  // Translate UI text when language changes
  useEffect(() => {
    const translateUI = async () => {
      if (language === "en") {
        // First mark as loading to trigger any necessary UI updates
        setTranslationsLoaded(false);
        
        // Reset to default English text
        setTranslatedText({
          title: "Creation Hub",
          subtitle: "Generate and create stunning images with AI",
          categoryTitle: "Choose Creation Type",
          categorySubtitle: "Select a category to unlock specialized tools and enhanced prompts",
          searchPlaceholder: "Search categories...",
          genIm: "Gen Im",
          genVid: "Gen Vid",
          create: "Create",
          gallery: "Gallery",
          leads: "Leads",
          images: "Images",
          videos: "Videos"
        });
        
        // Ensure all translation data is cleared
        setTranslatedCategories({});
        setTranslatedFields({});
        
        // Force immediate UI update with a small delay to ensure React re-renders properly
        setTimeout(() => {
          setTranslationsLoaded(true);
        }, 50);
        return;
      }
      
      // Mark as not loaded, but don't block UI
      setTranslationsLoaded(false);
      
      try {
        // Step 1: Translate basic UI elements first for fast feedback
        const basicTranslations = await Promise.all([
          translateText("Creation Hub", language, "en"),
          translateText("Generate and create stunning images with AI", language, "en"),
          translateText("Gen Im", language, "en"),
          translateText("Gen Vid", language, "en"),
          translateText("Create", language, "en"),
          translateText("Gallery", language, "en"),
          translateText("Leads", language, "en"),
          translateText("Images", language, "en"),
          translateText("Videos", language, "en")
        ]);
        
        // Update critical UI elements immediately
        setTranslatedText(prev => ({
          ...prev,
          title: basicTranslations[0],
          subtitle: basicTranslations[1],
          genIm: basicTranslations[2],
          genVid: basicTranslations[3],
          create: basicTranslations[4],
          gallery: basicTranslations[5],
          leads: basicTranslations[6],
          images: basicTranslations[7],
          videos: basicTranslations[8]
        }));
        
        // Step 2: Translate remaining content
        const [categoryTitle, categorySubtitle, searchPlaceholder] = await Promise.all([
          translateText("Choose Creation Type", language, "en"),
          translateText("Select a category to unlock specialized tools and enhanced prompts", language, "en"),
          translateText("Search categories...", language, "en")
        ]);
        
        // Update secondary UI elements
        setTranslatedText(prev => ({
          ...prev,
          categoryTitle,
          categorySubtitle,
          searchPlaceholder
        }));
        
        // Step 3: Translate other content in the background
        // These won't block the UI
        Promise.all([
          translateCategories(),
          translateFormFields()
        ]).finally(() => {
          // Mark as fully loaded when all translations are complete
          setTranslationsLoaded(true);
        });
      } catch (error) {
        console.error("Error translating UI:", error);
        setTranslationsLoaded(true); // Still mark as loaded even if there was an error
      }
    };
    
    translateUI();
  }, [language, translateText]);
  
  // Function to translate category content
  const translateCategories = async () => {
    if (language === "en") {
      setTranslatedCategories({});
      return;
    }
    
    try {
      const categories = Object.values(CATEGORY_INFO);
      const translatedCategoriesObj: Record<string, {name: string, description: string}> = {};
      
      // Translate all category names and descriptions
      for (const category of categories) {
        const [name, description] = await Promise.all([
          translateText(category.name, language, "en"),
          translateText(category.description, language, "en")
        ]);
        
        translatedCategoriesObj[category.id] = { name, description };
      }
      
      setTranslatedCategories(translatedCategoriesObj);
    } catch (error) {
      console.error("Error translating categories:", error);
    }
  };
  
  // Function to translate form fields
  const translateFormFields = async () => {
    if (language === "en") {
      setTranslatedFields({});
      return;
    }
    
    try {
      console.log("Starting form field translation for language:", language);
      const allTranslatedFields: Record<string, Record<string, {
        label?: string;
        description?: string;
        placeholder?: string;
      }>> = {};
      
      // For each category, translate its form fields
      for (const categoryId in CATEGORY_FORMS) {
        console.log(`Translating fields for category: ${categoryId}`);
        const form = CATEGORY_FORMS[categoryId as keyof typeof CATEGORY_FORMS];
        const categoryFields: Record<string, {
          label?: string;
          description?: string;
          placeholder?: string;
        }> = {};
        
        // Translate each field's label, description, and placeholder
        for (const field of form.fields) {
          console.log(`Translating field: ${field.id}, label: ${field.label}`);
          
          try {
            // Translate label
            let labelTranslation = "";
            if (field.label) {
              labelTranslation = await translateText(field.label, language, "en");
              console.log(`Translated label: ${field.label} -> ${labelTranslation}`);
            }
            
            // Translate description
            let descriptionTranslation = "";
            if (field.description) {
              descriptionTranslation = await translateText(field.description, language, "en");
              console.log(`Translated description: ${field.description} -> ${descriptionTranslation}`);
            }
            
            // Translate placeholder
            let placeholderTranslation = "";
            if (field.placeholder) {
              placeholderTranslation = await translateText(field.placeholder, language, "en");
              console.log(`Translated placeholder: ${field.placeholder} -> ${placeholderTranslation}`);
            }
            
            categoryFields[field.id] = {
              label: labelTranslation || undefined,
              description: descriptionTranslation || undefined,
              placeholder: placeholderTranslation || undefined
            };
          } catch (error) {
            console.error(`Error translating field ${field.id}:`, error);
          }
        }
        
        allTranslatedFields[categoryId] = categoryFields;
      }
      
      console.log("Completed form field translations:", allTranslatedFields);
      setTranslatedFields(allTranslatedFields);
    } catch (error) {
      console.error("Error translating form fields:", error);
    }
  };

  // Function to translate form fields for a specific category
  const translateCategoryFields = useCallback(async (categoryId: string) => {
    if (language === "en" || !selectedCategory) return {};
    
    try {
      console.log(`On-demand translating fields for category: ${categoryId}`);
      const form = CATEGORY_FORMS[categoryId as keyof typeof CATEGORY_FORMS];
      if (!form) {
        console.error(`Form not found for category: ${categoryId}`);
        return {};
      }
      
      const categoryFields: Record<string, {
        label?: string;
        description?: string;
        placeholder?: string;
      }> = {};
      
      // Translate each field's label, description, and placeholder
      for (const field of form.fields) {
        try {
          // Translate label
          let labelTranslation = "";
          if (field.label) {
            labelTranslation = await translateText(field.label, language, "en");
          }
          
          // Translate description
          let descriptionTranslation = "";
          if (field.description) {
            descriptionTranslation = await translateText(field.description, language, "en");
          }
          
          // Translate placeholder
          let placeholderTranslation = "";
          if (field.placeholder) {
            placeholderTranslation = await translateText(field.placeholder, language, "en");
          }
          
          categoryFields[field.id] = {
            label: labelTranslation || undefined,
            description: descriptionTranslation || undefined,
            placeholder: placeholderTranslation || undefined
          };
        } catch (error) {
          console.error(`Error translating field ${field.id}:`, error);
        }
      }
      
      // Update the translated fields state
      setTranslatedFields(prev => ({
        ...prev,
        [categoryId]: categoryFields
      }));
      
      return categoryFields;
    } catch (error) {
      console.error(`Error translating fields for category ${categoryId}:`, error);
      return {};
    }
  }, [language, selectedCategory, translateText]);
  
  // Translate fields when category changes
  useEffect(() => {
    if (selectedCategory && language !== "en") {
      translateCategoryFields(selectedCategory);
    }
  }, [selectedCategory, language, translateCategoryFields]);

  // Save language preference when changed
  const handleLanguageChange = (value: string) => {
    // Store immediately in localStorage
    localStorage.setItem('creation-hub-language', value);
    
    // Update UI state immediately
    setLanguage(value);
    
    // Show appropriate toast based on language selection
    if (value === 'en') {
      // Clear the translation cache to ensure fresh translations if switching back
      clearCache();
      toast({
        title: "Switching to English",
        description: "The interface will return to English.",
        duration: 2000,
      });
    } else {
      toast({
        title: "Translating...",
        description: "The interface is being translated. You can continue using the app.",
        duration: 2000,
      });
    }
  };

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

  const handleVideoDownload = useCallback(async (video: any) => {
    if (!video.video_url) return;

    try {
      const response = await fetch(video.video_url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Generate filename based on video data
      const timestamp = new Date(video.created_at).toISOString().split('T')[0];
      const sanitizedText = video.original_text 
        ? video.original_text.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 30)
        : 'video';
      const filename = `video-${timestamp}-${sanitizedText}-${video.id.slice(-6)}.mp4`;
      
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

  // Tab selection handler
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Refresh videos when switching to gallery tab
    if (value === 'gallery') {
      refreshUserVideos();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-background border rounded-2xl border-primary/20 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-6.5rem)] relative"
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/3 to-blue-500/5"
          animate={{
            background: [
              "linear-gradient(135deg, rgb(147 51 234 / 0.05) 0%, rgb(236 72 153 / 0.03) 50%, rgb(59 130 246 / 0.05) 100%)",
              "linear-gradient(135deg, rgb(236 72 153 / 0.05) 0%, rgb(59 130 246 / 0.03) 50%, rgb(147 51 234 / 0.05) 100%)",
              "linear-gradient(135deg, rgb(59 130 246 / 0.05) 0%, rgb(147 51 234 / 0.03) 50%, rgb(236 72 153 / 0.05) 100%)",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl relative overflow-hidden"
            whileHover={{ 
              scale: 1.05,
              rotate: [0, -5, 5, 0],
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <Palette className="w-5 h-5 text-white relative z-10" />
            </motion.div>
          </motion.div>
          <div>
            <motion.h2
              className="text-lg font-semibold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {translatedText.title}
            </motion.h2>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {translatedText.subtitle}
            </motion.p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Language Selector */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[120px] h-8 text-xs transition-all duration-300 hover:bg-muted/50">
                <motion.div
                  className="flex items-center gap-1"
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isTranslating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-3 w-3" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                      <Globe className="h-3 w-3" />
                    </motion.div>
                  )}
                  <SelectValue>
                    {languages.find(lang => lang.code === language) ? (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {languages.find(lang => lang.code === language)?.flag}{" "}
                        {languages.find(lang => lang.code === language)?.name}
                      </motion.span>
                    ) : (
                      "Language"
                    )}
                  </SelectValue>
                </motion.div>
              </SelectTrigger>
              <SelectContent>
                <AnimatePresence>
                  {languages.map((lang, index) => (
                    <motion.div
                      key={lang.code}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <SelectItem value={lang.code}>
                        <motion.div
                          className="flex items-center gap-2"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 }}
                          >
                            {lang.flag}
                          </motion.span>
                          <span>{lang.name}</span>
                        </motion.div>
                      </SelectItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SelectContent>
            </Select>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onClose}
              aria-label="Close Creation Hub"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden relative z-10">
        <motion.div
          className="border-b border-border flex-shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <TabsList className="w-full justify-start rounded-none bg-transparent p-0 px-3 sm:px-4 h-11 sm:h-12 relative">
            {/* Active tab indicator */}
            <motion.div
              className="absolute bottom-0 h-0.5 bg-primary rounded-full"
              layoutId="activeTabIndicator"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
            
            {[
              { value: "generate", icon: Wand2, label: "Generate", shortLabel: translatedText.genIm },
              { value: "video", icon: Film, label: translatedText.genVid, shortLabel: translatedText.genVid },
              // { value: "createvid", icon: Wand2, label: translatedText.create, shortLabel: translatedText.create },
              { value: "gallery", icon: ImageIcon, label: translatedText.gallery, shortLabel: translatedText.gallery },
              { value: "ai-leads", icon: MessageSquare, label: translatedText.leads, shortLabel: translatedText.leads },
            ].map((tab, index) => (
              <motion.div
                key={tab.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                whileHover={{ y: -1 }}
              >
                <TabsTrigger 
                  value={tab.value}
                  className="relative h-9 sm:h-10 rounded-none border-b-2 border-transparent px-2 sm:px-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm transition-all touch-manipulation hover:bg-muted/50"
                >
                  <motion.div
                    className="flex items-center gap-1 sm:gap-2"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      animate={{ 
                        rotate: activeTab === tab.value ? [0, 360] : 0,
                        scale: activeTab === tab.value ? [1, 1.1, 1] : 1
                      }}
                      transition={{ 
                        duration: activeTab === tab.value ? 2 : 0.3,
                        repeat: activeTab === tab.value ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    >
                      <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </motion.div>
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="text-[10px] md:inline xs:hidden">{tab.shortLabel}</span>
                  </motion.div>
                  {activeTab === tab.value && (
                    <motion.div
                      className="absolute inset-0 bg-primary/5 rounded-md -z-10"
                      layoutId="activeTabBackground"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </TabsTrigger>
              </motion.div>
            ))}
          </TabsList>
        </motion.div>

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
                    <CategorySelector 
                      onSelectCategory={handleCategorySelect} 
                      className="m-4 sm:m-6"
                      titleText={translatedText.categoryTitle}
                      subtitleText={translatedText.categorySubtitle}
                      searchPlaceholder={translatedText.searchPlaceholder}
                      translatedCategories={translatedCategories}
                    />
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
                      translatedFields={translatedFields[selectedCategory] || {}}
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
              <div className="h-full flex flex-col">
                {/* Gallery Sub-tabs */}
                <motion.div
                  className="flex-shrink-0 border-b border-border p-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.button
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                        gallerySubTab === 'images' 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setGallerySubTab('images')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div
                          animate={{ 
                            rotate: gallerySubTab === 'images' ? [0, 360] : 0,
                            scale: gallerySubTab === 'images' ? [1, 1.1, 1] : 1
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: gallerySubTab === 'images' ? Infinity : 0,
                            ease: "easeInOut"
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </motion.div>
                        {translatedText.images}
                        {images.length > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                          >
                            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5">
                              {images.length}
                            </Badge>
                          </motion.div>
                        )}
                      </motion.div>
                      {gallerySubTab === 'images' && (
                        <motion.div
                          className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                          layoutId="galleryTabBackground"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>
                    
                    <motion.button
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                        gallerySubTab === 'videos' 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setGallerySubTab('videos')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <motion.div
                          animate={{ 
                            rotate: gallerySubTab === 'videos' ? [0, 360] : 0,
                            scale: gallerySubTab === 'videos' ? [1, 1.1, 1] : 1
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: gallerySubTab === 'videos' ? Infinity : 0,
                            ease: "easeInOut"
                          }}
                        >
                          <Film className="h-4 w-4" />
                        </motion.div>
                        {translatedText.videos}
                        {userVideos.length > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
                          >
                            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 h-5 bg-blue-500 text-white">
                              {userVideos.length}
                            </Badge>
                          </motion.div>
                        )}
                      </motion.div>
                      {gallerySubTab === 'videos' && (
                        <motion.div
                          className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                          layoutId="galleryTabBackground"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>
                  </div>
                </motion.div>

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
                      {/* Stats Card */}
                      {userVideos.length > 0 && (
                        <Card className="glass-card">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-medium">Video Gallery</h3>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={refreshUserVideos}
                                className="h-8 px-2"
                              >
                                <Loader2 className={cn("h-4 w-4 mr-1", userVideosLoading && "animate-spin")} />
                                Refresh
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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

                      {/* Video Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {userVideos.map((video, index) => (
                            <motion.div
                              key={video.id}
                              initial={{ opacity: 0, scale: 0.8, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -20 }}
                              transition={{ 
                                delay: HubUtils.UI.getStaggerDelay(index, 0.1),
                                duration: 0.5,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                              }}
                              whileHover={{ 
                                y: -5,
                                scale: 1.02,
                                transition: { duration: 0.2 }
                              }}
                              className="relative group"
                            >
                              <Card className="glass-card overflow-hidden h-full relative">
                                {/* Hover glow effect */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 rounded-lg"
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                />
                                
                                {/* Shine effect on hover */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100"
                                  initial={{ x: "-100%" }}
                                  whileHover={{ x: "100%" }}
                                  transition={{ duration: 0.6, ease: "easeInOut" }}
                                />
                                
                                <motion.div
                                  className="aspect-video bg-black rounded-t-lg overflow-hidden relative"
                                  whileHover={{ scale: 1.05 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <video
                                    src={video.video_url}
                                    controls
                                    preload="metadata"
                                    className="w-full h-full object-cover"
                                  >
                                    <p>Your browser doesn't support HTML5 video.</p>
                                  </video>
                                  
                                  {/* Play button overlay */}
                                  <motion.div
                                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    whileHover={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <motion.div
                                      className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm pointer-events-auto"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const videoElement = e.currentTarget.parentElement?.parentElement?.querySelector('video');
                                        if (videoElement) {
                                          if (videoElement.paused) {
                                            videoElement.play();
                                          } else {
                                            videoElement.pause();
                                          }
                                        }
                                      }}
                                    >
                                      <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1" />
                                    </motion.div>
                                  </motion.div>
                                </motion.div>
                                
                                <CardContent className="p-3 relative z-10">
                                  <motion.div
                                    className="space-y-2"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    {video.original_text && (
                                      <motion.p
                                        className="text-sm text-muted-foreground line-clamp-2"
                                        initial={{ opacity: 0.8 }}
                                        whileHover={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        {video.original_text}
                                      </motion.p>
                                    )}
                                    <motion.div
                                      className="flex items-center justify-between text-xs text-muted-foreground"
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.3 }}
                                    >
                                      <span>{new Date(video.created_at).toLocaleDateString()}</span>
                                      <div className="flex items-center gap-2">
                                        {/* Video type indicator */}
                                        <motion.div
                                          whileHover={{ scale: 1.05 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <Badge 
                                            variant={video.video_type === 'generated' ? "default" : "secondary"} 
                                            className="text-xs px-1 py-0"
                                          >
                                            {video.video_type === 'generated' ? 'AI Generated' : 'Text-to-Video'}
                                          </Badge>
                                        </motion.div>
                                        {video.duration_seconds && (
                                          <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <Badge variant="outline" className="text-xs px-1 py-0">
                                              {video.duration_seconds}s
                                            </Badge>
                                          </motion.div>
                                        )}
                                        {video.voice_character && (
                                          <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <Badge variant="outline" className="text-xs px-1 py-0">
                                              {video.voice_character}
                                            </Badge>
                                          </motion.div>
                                        )}
                                      </div>
                                    </motion.div>
                                    <motion.div
                                      className="flex items-center justify-between"
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.4 }}
                                    >
                                      <span className="text-xs text-muted-foreground">
                                        {video.file_size ? `${Math.round(video.file_size / (1024 * 1024))}MB` : 'Unknown size'}
                                      </span>
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleVideoDownload(video)}
                                          className="h-7 px-2 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                                        >
                                          <motion.div
                                            className="flex items-center gap-1"
                                            whileHover={{ x: 1 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <Download className="h-3 w-3" />
                                            Download
                                          </motion.div>
                                        </Button>
                                      </motion.div>
                                    </motion.div>
                                  </motion.div>
                                </CardContent>
                              </Card>
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
            <AILeadsInterface key={`leads-${language}`} />
          </TabsContent>

          <TabsContent value="video" className="mt-0 h-full">
            <ScrollArea className="h-full p-4">
              {/* Reset child component by forcing re-mount when language changes */}
              <VideoGenerator 
                language={language} 
                key={`vid-gen-${language}`}
                onVideoGenerated={(video) => {
                  // Add video to gallery state
                  addUserVideo(video);
                  // Refresh video list to ensure sync with database
                  refreshUserVideos();
                  // Show success toast
                  toast({
                    title: "Video Generated Successfully!",
                    description: "Your video is ready and has been added to the gallery",
                  });
                }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="createvid" className="mt-0 h-full">
            <ScrollArea className="h-full p-4">
              <CreateVid 
                language={language}
                key={`create-vid-${language}`}  /* Force re-mount when language changes */
                onVideoCreated={(video) => {
                  // Add video to gallery state but DON'T switch tabs
                  addUserVideo(video);
                  // Refresh video list to ensure sync with database
                  refreshUserVideos();
                  // DON'T switch tabs - let user see the video on CreateVid page
                  toast({
                    title: "Video Created Successfully!",
                    description: "Your video is ready and has been added to the gallery",
                  });
                }} 
              />
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
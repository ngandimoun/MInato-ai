'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Play, 
  Download, 
  Wand2, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Globe,
  Sparkles,
  Loader2,
  X,
  Check,
  ChevronDown,
  Mic,
  Volume2,
  Camera,
  Settings,
  Zap,
  Star,
  Heart,
  Share2,
  Bot,
  Clipboard,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/auth-provider';
import { useUserImages } from './hooks/use-user-images';
import type { CreatedVideo } from './hooks/use-user-videos';
import { useTranslation } from '@/hooks/useTranslation';

// Language support
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

// Voice options (existing anime-inspired voices)
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Naruto', description: 'Energetic and determined', icon: '⚡' },
  { id: 'echo', name: 'Sasuke', description: 'Cool and composed', icon: '🌙' },
  { id: 'fable', name: 'Sakura', description: 'Bright and caring', icon: '🌸' },
  { id: 'onyx', name: 'Kakashi', description: 'Calm and wise', icon: '🎭' },
  { id: 'nova', name: 'Hinata', description: 'Gentle and soft', icon: '💜' },
  { id: 'shimmer', name: 'Tsunade', description: 'Strong and confident', icon: '💎' },
];

interface MediaFile {
  file: File;
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

interface CreateVidProps {
  onVideoCreated?: (video: CreatedVideo) => void;
  language?: string;
}

// Social media platform configurations
export interface SocialMediaPlatform {
  id: string;
  name: string;
  formats: SocialMediaFormat[];
}

export interface SocialMediaFormat {
  id: string;
  name: string;
  description: string;
  maxCharacters: number;
  recommendedDuration: number; // in seconds
  aspectRatio: string;
  promptModifier: string;
}

export const SOCIAL_MEDIA_PLATFORMS: SocialMediaPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    formats: [
      {
        id: 'instagram-post',
        name: 'Instagram Post',
        description: 'Square video for feed posts',
        maxCharacters: 125,
        recommendedDuration: 15,
        aspectRatio: '1:1',
        promptModifier: 'Create a concise, engaging caption for Instagram post. Use emojis and hashtags. Keep it under 125 characters for optimal engagement.'
      },
      {
        id: 'instagram-story',
        name: 'Instagram Story',
        description: 'Vertical video for stories',
        maxCharacters: 100,
        recommendedDuration: 10,
        aspectRatio: '9:16',
        promptModifier: 'Create a short, punchy text for Instagram Story. Use casual tone with emojis. Keep it under 100 characters for story format.'
      },
      {
        id: 'instagram-reel',
        name: 'Instagram Reel',
        description: 'Short vertical video content',
        maxCharacters: 150,
        recommendedDuration: 20,
        aspectRatio: '9:16',
        promptModifier: 'Create catchy text for Instagram Reel. Hook viewers in first few words. Use trending language and emojis. Keep under 150 characters.'
      }
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    formats: [
      {
        id: 'tiktok-video',
        name: 'TikTok Video',
        description: 'Short vertical video content',
        maxCharacters: 100,
        recommendedDuration: 15,
        aspectRatio: '9:16',
        promptModifier: 'Create engaging TikTok text. Use trending phrases and emojis. Make it catchy and shareable. Keep under 100 characters.'
      }
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    formats: [
      {
        id: 'youtube-short',
        name: 'YouTube Short',
        description: 'Vertical short-form content',
        maxCharacters: 200,
        recommendedDuration: 30,
        aspectRatio: '9:16',
        promptModifier: 'Create compelling YouTube Short description. Hook viewers early, use keywords for discovery. Keep under 200 characters.'
      },
      {
        id: 'youtube-video',
        name: 'YouTube Video',
        description: 'Traditional horizontal video',
        maxCharacters: 300,
        recommendedDuration: 60,
        aspectRatio: '16:9',
        promptModifier: 'Create detailed YouTube video description. Include key points and call-to-action. Optimize for search. Keep under 300 characters for voice generation.'
      }
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook',
    formats: [
      {
        id: 'facebook-post',
        name: 'Facebook Post',
        description: 'Standard feed post',
        maxCharacters: 200,
        recommendedDuration: 30,
        aspectRatio: '16:9',
        promptModifier: 'Create engaging Facebook post text. Use conversational tone, ask questions to encourage engagement. Keep under 200 characters.'
      },
      {
        id: 'facebook-story',
        name: 'Facebook Story',
        description: 'Vertical story content',
        maxCharacters: 100,
        recommendedDuration: 10,
        aspectRatio: '9:16',
        promptModifier: 'Create brief Facebook Story text. Use casual, personal tone. Keep under 100 characters for story format.'
      }
    ]
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    formats: [
      {
        id: 'twitter-post',
        name: 'Twitter Post',
        description: 'Standard tweet with video',
        maxCharacters: 80,
        recommendedDuration: 15,
        aspectRatio: '16:9',
        promptModifier: 'Create concise Twitter text. Be witty and engaging. Use hashtags strategically. Keep under 80 characters for video narration.'
      }
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    formats: [
      {
        id: 'linkedin-post',
        name: 'LinkedIn Post',
        description: 'Professional content',
        maxCharacters: 250,
        recommendedDuration: 45,
        aspectRatio: '16:9',
        promptModifier: 'Create professional LinkedIn content. Focus on value and insights. Use business-appropriate tone. Keep under 250 characters.'
      }
    ]
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    formats: [
      {
        id: 'snapchat-story',
        name: 'Snapchat Story',
        description: 'Vertical story content',
        maxCharacters: 80,
        recommendedDuration: 10,
        aspectRatio: '9:16',
        promptModifier: 'Create fun Snapchat text. Use casual, playful tone with emojis. Keep under 80 characters for story format.'
      }
    ]
  }
];

export default function CreateVid({ onVideoCreated, language = "en" }: CreateVidProps = {}) {
  const { user } = useAuth();
  const { images: galleryImages, loading: galleryLoading } = useUserImages();
  
  // Media selection state - Updated to support multiple files
  const [selectedMedia, setSelectedMedia] = useState<(MediaFile | GalleryImage)[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  
  // Text and enhancement state
  const [text, setText] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedText, setEnhancedText] = useState('');
  
  // Social media platform selection state
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');
  const [selectedFormat, setSelectedFormat] = useState<string>('instagram-post');
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  
  // Language and voice settings
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [audioDuration, setAudioDuration] = useState([5]);
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isFrameSequence, setIsFrameSequence] = useState(false);
  const [frameSequenceInfo, setFrameSequenceInfo] = useState<any>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Translation setup
  const { translateText } = useTranslation();
  const [translatedText, setTranslatedText] = useState({
    createVideo: "Create Video",
    selectMedia: "Select Media",
    upload: "Upload",
    gallery: "Gallery",
    voiceText: "Voice Text",
    enhanceAI: "Enhance AI",
    preview: "Preview",
    targetPlatform: "Target Platform & Format",
    audioSettings: "Audio Settings",
    voice: "Voice",
    duration: "Duration",
    seconds: "seconds",
    generate: "Generate",
    authRequired: "Authentication Required",
    authRequiredDesc: "Please sign in to create videos",
    missingContent: "Missing Content",
    missingContentDesc: "Please add media or text to create a video",
    videoCreated: "Video created!",
    videoCreatedDesc: "Your video has been generated successfully",
    download: "Download",
    createNew: "Create New",
    frameSequenceCreated: "Frame Sequence Created!",
    frameSequenceDesc: "Frame sequences were created successfully. The frames are stored on the server.",
    cannotDownload: "Cannot Download",
    cannotDownloadDesc: "Frame sequences cannot be downloaded directly. Follow the instructions to convert frames to video.",
    instructions: "Instructions:",
    step1: "Find the frame sequence files in your temporary directory",
    step2: "Use the provided instructions to convert frames to video",
    step3: "Or download individual frames for manual editing",
    noFFmpeg: "Note: FFmpeg is not available in the serverless environment, so only frame sequences are generated.",
    languageVoiceSettings: "Language & Voice Settings",
    language: "Language",
    voiceCharacter: "Voice Character",
    audioDuration: "Audio Duration",
    creatingVideo: "Creating Video",
    processingMedia: "Processing Media",
    aiAssist: "AI Assistant",
    aiAssistTooltip: "Refine text to be more compelling",
    copyText: "Copy text",
    applyText: "Apply to input",
    textCopied: "Text copied to clipboard!",
    textApplied: "Enhanced text applied!"
  });

  // Initialize translations
  useEffect(() => {
    translateUI();
  }, [language]);

  const translateUI = async () => {
    try {
      const translations = await Promise.all([
        translateText("Create Video", language, "en"),
          translateText("Select Media", language, "en"),
          translateText("Upload", language, "en"),
          translateText("Gallery", language, "en"),
        translateText("Voice Text", language, "en"),
        translateText("Enhance AI", language, "en"),
        translateText("Preview", language, "en"),
        translateText("Target Platform & Format", language, "en"),
        translateText("Audio Settings", language, "en"),
        translateText("Voice", language, "en"),
        translateText("Duration", language, "en"),
        translateText("seconds", language, "en"),
        translateText("Generate", language, "en"),
        translateText("Authentication Required", language, "en"),
          translateText("Please sign in to create videos", language, "en"),
        translateText("Missing Content", language, "en"),
          translateText("Please add media or text to create a video", language, "en"),
          translateText("Video created!", language, "en"),
        translateText("Your video has been generated successfully", language, "en"),
        translateText("Download", language, "en"),
        translateText("Create New", language, "en"),
        translateText("Frame Sequence Created!", language, "en"),
        translateText("Frame sequences were created successfully. The frames are stored on the server.", language, "en"),
        translateText("Cannot Download", language, "en"),
        translateText("Frame sequences cannot be downloaded directly. Follow the instructions to convert frames to video.", language, "en"),
        translateText("Instructions:", language, "en"),
        translateText("Find the frame sequence files in your temporary directory", language, "en"),
        translateText("Use the provided instructions to convert frames to video", language, "en"),
        translateText("Or download individual frames for manual editing", language, "en"),
        translateText("Note: FFmpeg is not available in the serverless environment, so only frame sequences are generated.", language, "en"),
        translateText("Language & Voice Settings", language, "en"),
        translateText("Language", language, "en"),
        translateText("Voice Character", language, "en"),
        translateText("Audio Duration", language, "en"),
        translateText("Creating Video", language, "en"),
        translateText("Processing Media", language, "en"),
        translateText("AI Assistant", language, "en"),
        translateText("Refine and improve your text", language, "en"),
        translateText("Copy text", language, "en"),
        translateText("Apply to input", language, "en"),
        translateText("Text copied to clipboard!", language, "en"),
        translateText("Enhanced text applied!", language, "en")
      ]);

      setTranslatedText({
        createVideo: translations[0],
        selectMedia: translations[1],
        upload: translations[2],
        gallery: translations[3],
        voiceText: translations[4],
        enhanceAI: translations[5],
        preview: translations[6],
        targetPlatform: translations[7],
        audioSettings: translations[8],
        voice: translations[9],
        duration: translations[10],
        seconds: translations[11],
        generate: translations[12],
        authRequired: translations[13],
        authRequiredDesc: translations[14],
        missingContent: translations[15],
        missingContentDesc: translations[16],
        videoCreated: translations[17],
        videoCreatedDesc: translations[18],
        download: translations[19],
        createNew: translations[20],
        frameSequenceCreated: translations[21],
        frameSequenceDesc: translations[22],
        cannotDownload: translations[23],
        cannotDownloadDesc: translations[24],
        instructions: translations[25],
        step1: translations[26],
        step2: translations[27],
        step3: translations[28],
        noFFmpeg: translations[29],
        languageVoiceSettings: translations[30],
        language: translations[31],
        voiceCharacter: translations[32],
        audioDuration: translations[33],
        creatingVideo: translations[34],
        processingMedia: translations[35],
        aiAssist: translations[36],
        aiAssistTooltip: translations[37],
        copyText: translations[38],
        applyText: translations[39],
        textCopied: translations[40],
        textApplied: translations[41]
      });
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

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

  // File upload handler - Updated to support multiple files (max 5)
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxFiles = 5;
    const currentCount = selectedMedia.length;
    const availableSlots = maxFiles - currentCount;

    if (files.length > availableSlots) {
      toast({
        title: "Too many files",
        description: `You can only upload ${availableSlots} more file(s). Maximum is ${maxFiles} files.`,
        variant: "destructive",
      });
      return;
    }

    const newMediaFiles: MediaFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image or video file`,
          variant: "destructive",
        });
        continue;
      }

      const url = URL.createObjectURL(file);
      const mediaFile: MediaFile = {
        file,
        url,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name
      };

      newMediaFiles.push(mediaFile);
    }

    setSelectedMedia(prev => [...prev, ...newMediaFiles]);
    setShowGallery(false);
  };

  // Gallery selection handler - Updated for multiple selection
  const handleGallerySelect = (image: GalleryImage) => {
    const maxFiles = 5;
    
    if (selectedMedia.length >= maxFiles) {
      toast({
        title: "Maximum files reached",
        description: `You can only select up to ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }

    // Check if image is already selected
    const isAlreadySelected = selectedMedia.some(media => 
      !('file' in media) && media.id === image.id
    );

    if (isAlreadySelected) {
      toast({
        title: "Already selected",
        description: "This image is already selected",
        variant: "destructive",
      });
      return;
    }

    setSelectedMedia(prev => [...prev, image]);
    setShowGallery(false);
  };

  // Clear all media handler
  const handleClearMedia = () => {
    selectedMedia.forEach(media => {
      if ('file' in media) {
        URL.revokeObjectURL(media.url);
      }
    });
    setSelectedMedia([]);
  };

  // Remove single media handler
  const handleRemoveMedia = (index: number) => {
    const mediaToRemove = selectedMedia[index];
    if ('file' in mediaToRemove) {
      URL.revokeObjectURL(mediaToRemove.url);
    }
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Text enhancement handler - Fixed to work with media selection
  const handleEnhanceText = async () => {
    // Only require at least one media file - text is optional
    if (selectedMedia.length === 0) {
      toast({
        title: "Media required",
        description: "Please select at least one media file to enhance text",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);
    try {
      // Get the first media file URL for image analysis
      const firstMedia = selectedMedia[0];
      let imageUrl = firstMedia.url;

      // Convert uploaded file to data URI if it's a blob URL
      if ('file' in firstMedia && firstMedia.file) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(firstMedia.file);
        });
      }
      
      // Get platform and format data for API
      const platformData = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === selectedPlatform);
      const formatData = platformData?.formats.find(f => f.id === selectedFormat);
      
      const response = await fetch('/api/ai/enhance-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          currentText: text.trim() || '', // Send text even if empty
          description: text.trim() || '', // Backward compatibility
          platform: selectedPlatform,
          format: selectedFormat,
          language: selectedLanguage, // This is the selected language code
          maxCharacters: formatData?.maxCharacters || 125,
          platformData: platformData,
          formatData: formatData,
          analysisPrompt: text.trim() 
            ? `Enhance this text for ${platformData?.name} ${formatData?.name}: "${text.trim()}". Make it more engaging and compelling while staying within character limits.`
            : `Analyze this image and create compelling marketing copy for ${platformData?.name} ${formatData?.name}. Focus on benefits, emotions, and persuasive language that would work great for social media. Make it engaging, concise, and sales-oriented.`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Enhancement failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setEnhancedText(data.enhancedText);
        // If original text was empty, also set it as the main text
        if (!text.trim()) {
          setText(data.enhancedText);
        }
        toast({
          title: "Text enhanced!",
          description: `Generated ${data.characterCount}/${data.characterLimit || 'unlimited'} characters`,
        });
      } else {
        throw new Error(data.error || 'Enhancement failed');
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Could not enhance text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  // Voice preview handler
  const handleVoicePreview = async () => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: enhancedText || text,
          voice: selectedVoice,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Preview failed",
        description: "Could not generate voice preview",
        variant: "destructive",
      });
    }
  };

  // Download handler
  const handleDownload = () => {
    if (generatedVideoUrl) {
      const link = document.createElement('a');
      link.href = generatedVideoUrl;
      link.download = 'generated-video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Generate video
  const handleGenerateVideo = useCallback(async () => {
    if (!user) {
      toast({
        title: translatedText.authRequired,
        description: translatedText.authRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    if (selectedMedia.length === 0 && !text.trim()) {
      toast({
        title: translatedText.missingContent,
        description: translatedText.missingContentDesc,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const formData = new FormData();
      
      // Add media if selected
      if (selectedMedia.length > 0) {
        selectedMedia.forEach((media, index) => {
          if ('file' in media) {
            formData.append(`media_${index}`, media.file);
          } else {
            formData.append(`mediaUrl_${index}`, media.url);
          }
        });
        formData.append('mediaCount', selectedMedia.length.toString());
      }
      
      // Add text and settings
      if (text.trim()) {
        formData.append('text', text.trim());
        formData.append('voice', selectedVoice);
        formData.append('language', selectedLanguage);
        formData.append('duration', audioDuration[0].toString());
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/video/create', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Video generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.isFrameSequence) {
          setIsFrameSequence(true);
          setFrameSequenceInfo(result);
        } else {
          setGeneratedVideoUrl(result.videoUrl);
        }
        
                 // Call the callback if provided
         if (onVideoCreated) {
           onVideoCreated({
             id: Date.now().toString(),
             user_id: user.id,
             filename: 'generated-video.mp4',
             video_url: result.videoUrl || '',
             original_text: text,
             voice_character: selectedVoice,
             audio_duration: audioDuration[0],
             status: 'completed',
             media_files_count: selectedMedia.length,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
             completed_at: new Date().toISOString(),
             video_type: 'created',
             prompt: text
           });
         }

        toast({
          title: translatedText.videoCreated,
          description: translatedText.videoCreatedDesc,
        });
      } else {
        throw new Error(result.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [user, selectedMedia, text, selectedVoice, selectedLanguage, audioDuration, selectedPlatform, selectedFormat, onVideoCreated, translatedText]);

  // Add function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: translatedText.textCopied,
      duration: 2000,
    });
  };

  // Add function to apply enhanced text
  const applyEnhancedText = () => {
    setText(enhancedText);
    setEnhancedText(''); // Clear enhanced text since it's now the main text
    toast({
      title: translatedText.textApplied,
      duration: 2000,
    });
  };

  // Helper function to get language name from code
  const getLanguageDisplay = (code: string) => {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
    return language ? `${language.flag} ${language.name}` : 'English';
  };

  // Video player view (when video is generated)
  const renderVideoPlayer = () => {
    if (isFrameSequence) {
      // Frame sequence created (alternative service)
      return (
        <div className="p-6 border border-dashed border-primary/40 rounded-lg flex flex-col items-center justify-center text-center">
          <Sparkles className="h-10 w-10 text-primary/70 mb-4" />
          <h3 className="text-lg font-medium mb-2">{translatedText.frameSequenceCreated}</h3>
          <p className="text-muted-foreground mb-4">
            {translatedText.frameSequenceDesc}
          </p>
          <div className="bg-muted/50 p-4 rounded-md text-sm text-left w-full mb-4">
            <p className="font-medium mb-2">{translatedText.instructions}</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{translatedText.step1}</li>
              <li>{translatedText.step2}</li>
              <li>{translatedText.step3}</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            {translatedText.noFFmpeg}
          </p>
        </div>
      );
    }

    return (
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <video
          src={generatedVideoUrl || undefined}
          className="w-full h-full"
          controls
          autoPlay
          playsInline
          loop
        />
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-4 right-4 bg-background/80 hover:bg-background rounded-full"
          onClick={handleDownload}
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>
    );
  };

  // Main render
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
                    <VideoIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                    {translatedText.createVideo}
                  </h1>
                  <p className="text-white/60 text-sm md:text-base">
                    Generate stunning videos with AI magic ✨
                  </p>
                </div>
              </div>
              
              {/* <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLanguageSelect(prev => !prev)}
                className="cursor-pointer"
              >
                <Badge 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center gap-2 px-4 py-2"
                >
                  <Globe className="h-4 w-4" />
                  {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag || '🌐'}
                  <span className="hidden sm:inline">{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </Badge>
              </motion.div> */}
            </div>
          </div>
        </motion.div>

        {/* Language selector dropdown */}
        <AnimatePresence>
          {showLanguageSelect && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="overflow-hidden"
            >
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <motion.div
                      key={lang.code}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={selectedLanguage === lang.code ? "secondary" : "ghost"}
                        size="sm"
                        className={`w-full justify-start gap-2 transition-all duration-300 ${
                          selectedLanguage === lang.code 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setShowLanguageSelect(false);
                        }}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-xs font-medium">{lang.name}</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Content based on whether video is generated */}
        {generatedVideoUrl ? (
          // Show video player
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
              {renderVideoPlayer()}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedVideoUrl(null);
                  setText('');
                  setEnhancedText('');
                  handleClearMedia();
                  setProgress(0);
                  setIsFrameSequence(false);
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {translatedText.createNew}
              </Button>
              <Button 
                onClick={handleDownload} 
                disabled={isFrameSequence}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              >
                <Download className="mr-2 h-4 w-4" />
                {translatedText.download}
              </Button>
            </div>
          </motion.div>
        ) : (
          // Show creation form
          <div className="space-y-8">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            
            {/* Hidden audio element for voice preview */}
            <audio ref={audioRef} className="hidden" />

            {/* Language & Voice Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-xl" />
              <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-75" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">{translatedText.languageVoiceSettings}</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white/80">{translatedText.language}</label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/95 border-white/20 backdrop-blur-xl">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white/80">{translatedText.voiceCharacter}</label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/95 border-white/20 backdrop-blur-xl">
                        {VOICE_OPTIONS.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id} className="text-white hover:bg-white/10">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{voice.icon}</span>
                              <div>
                                <span className="font-medium">{voice.name}</span>
                                <p className="text-xs text-white/60">{voice.description}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Media Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 rounded-2xl blur-xl" />
              <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-75" />
                      <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">{translatedText.selectMedia}</h3>
                  </div>
                  
                  <div className="flex gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {translatedText.upload}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGallery(!showGallery)}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {translatedText.gallery}
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Selected Media Display */}
                {selectedMedia.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative mb-6"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-black/40 p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-medium">
                          Selected Media ({selectedMedia.length}/5)
                        </h4>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleClearMedia}
                          className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-2 transition-all duration-300"
                        >
                          <X className="h-4 w-4" />
                        </motion.button>
                      </div>
                      
                      {/* Display based on number of selected media */}
                      {selectedMedia.length === 1 ? (
                        /* Single media - display large and natural */
                        <div className="relative group">
                          <div className="relative rounded-lg overflow-hidden bg-black/20 max-w-2xl mx-auto">
                            {('file' in selectedMedia[0] && selectedMedia[0].type === 'image') || (!('file' in selectedMedia[0])) ? (
                              <img
                                src={selectedMedia[0].url}
                                alt={'name' in selectedMedia[0] ? selectedMedia[0].name : 'Selected image'}
                                className="w-full max-h-96 object-contain rounded-lg"
                              />
                            ) : (
                              <video
                                src={selectedMedia[0].url}
                                className="w-full max-h-96 object-contain rounded-lg"
                                controls
                              />
                            )}
                            
                            {/* Remove button for single media */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleRemoveMedia(0)}
                              className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-2 transition-all duration-300"
                            >
                              <X className="h-4 w-4" />
                            </motion.button>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-center gap-2 text-white">
                            {'file' in selectedMedia[0] ? (
                              selectedMedia[0].type === 'image' ? <ImageIcon className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {'name' in selectedMedia[0] ? selectedMedia[0].name : 'Gallery image'}
                            </span>
                            {'prompt' in selectedMedia[0] && (
                              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-200 border-purple-500/30">
                                Gallery
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Multiple media - responsive grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedMedia.map((media, index) => (
                            <div key={index} className="relative group">
                              <div className="relative rounded-lg overflow-hidden bg-black/20">
                                {('file' in media && media.type === 'image') || (!('file' in media)) ? (
                                  <img
                                    src={media.url}
                                    alt={'name' in media ? media.name : 'Selected image'}
                                    className="w-full max-h-48 sm:max-h-56 object-contain rounded-lg"
                                  />
                                ) : (
                                  <video
                                    src={media.url}
                                    className="w-full max-h-48 sm:max-h-56 object-contain rounded-lg"
                                    controls
                                  />
                                )}
                                
                                {/* Remove individual media button */}
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleRemoveMedia(index)}
                                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 transition-all duration-300"
                                >
                                  <X className="h-3 w-3" />
                                </motion.button>
                              </div>
                              
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white">
                                  {'file' in media ? (
                                    media.type === 'image' ? <ImageIcon className="h-3 w-3" /> : <VideoIcon className="h-3 w-3" />
                                  ) : (
                                    <ImageIcon className="h-3 w-3" />
                                  )}
                                  <span className="text-xs font-medium truncate max-w-20">
                                    {'name' in media ? media.name : 'Gallery image'}
                                  </span>
                                </div>
                                
                                {'prompt' in media && (
                                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-200 border-purple-500/30">
                                    Gallery
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Gallery Grid */}
                <AnimatePresence>
                  {showGallery && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/20 pt-6 mt-6">
                        <h4 className="text-sm font-medium mb-4 text-white/80 flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Your Gallery
                        </h4>
                        
                        {galleryLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                          </div>
                        ) : galleryImages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {galleryImages.map((image) => {
                              const isSelected = selectedMedia.some(media => 
                                !('file' in media) && media.id === image.id
                              );
                              
                              return (
                                <motion.div
                                  key={image.id}
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  whileTap={{ scale: 0.95 }}
                                  className={`relative cursor-pointer group ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
                                  onClick={() => handleGallerySelect(image)}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-t from-purple-600/50 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                                                  <img
                                  src={image.url}
                                  alt={image.prompt}
                                  className={`w-full aspect-square object-cover rounded-lg border-2 transition-all duration-300 shadow-lg ${
                                    isSelected 
                                      ? 'border-purple-400 opacity-80' 
                                      : 'border-transparent group-hover:border-purple-400'
                                  }`}
                                />
                                  <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-opacity duration-300 ${
                                    isSelected 
                                      ? 'bg-purple-500/30 opacity-100' 
                                      : 'bg-black/60 opacity-0 group-hover:opacity-100'
                                  }`}>
                                    <Check className={`h-5 w-5 text-white ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <ImageIcon className="h-12 w-12 text-white/40 mx-auto mb-3" />
                            <p className="text-white/60 text-sm">No images in your gallery yet.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Text Input with AI Enhancement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative w-[280px] mx-auto md:w-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl" />
              <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-75" />
                      <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg">
                        <Mic className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">{translatedText.voiceText}</h3>
                  </div>
                  
                  <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnhanceText}
                        disabled={selectedMedia.length === 0 || isEnhancing}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEnhancing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        {translatedText.enhanceAI}
                      </Button>
                    
                    
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVoicePreview}
                        disabled={!text.trim()}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                       <span className='hidden md:inline'> {translatedText.preview}</span>
                      </Button>
                  </div>
                </div>

                {/* Platform Selector */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-4 w-4 text-blue-400" />
                    <label className="text-sm font-medium text-white/80">{translatedText.targetPlatform}</label>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Platform Selection */}
                    <div>
                      <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
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
                    <div>
                      <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900/95 border-white/20 backdrop-blur-xl">
                          {getSelectedPlatformData()?.formats.map((format) => (
                            <SelectItem key={format.id} value={format.id} className="text-white hover:bg-white/10">
                              {format.name}
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
                      className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg backdrop-blur-sm"
                    >
                      <p className="text-xs text-blue-300">
                        {getSelectedFormatData()?.description} • 
                        Max {getSelectedFormatData()?.maxCharacters} chars • 
                        {getSelectedFormatData()?.aspectRatio} • 
                        ~{getSelectedFormatData()?.recommendedDuration}s
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="relative mb-6">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Enter text for voice generation in ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English'}...`}
                    className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none pr-20 backdrop-blur-sm transition-all duration-300 focus:bg-white/20"
                  />
                  
                  {/* AI Button */}
                  <div className="absolute top-3 right-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleEnhanceText}
                      disabled={isEnhancing}
                      className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600/70 to-blue-600/70 hover:from-purple-600/90 hover:to-blue-600/90 border-0 backdrop-blur-sm"
                      title="Refine and improve text"
                    >
                      {isEnhancing ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Character Counter */}
                  {getSelectedFormatData() && (
                    <div className="absolute bottom-3 right-3 text-xs">
                      <span className={text.length > (getSelectedFormatData()?.maxCharacters || 0) ? 'text-red-400' : 'text-white/60'}>
                        {text.length}/{getSelectedFormatData()?.maxCharacters}
                      </span>
                    </div>
                  )}
                </div>

                {enhancedText && enhancedText !== text && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 rounded-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-green-300 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        ✨ AI Enhanced ({getLanguageDisplay(selectedLanguage)}):
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 bg-white/10 hover:bg-white/20 text-green-300"
                          onClick={() => copyToClipboard(enhancedText)}
                        >
                          <Clipboard className="h-3.5 w-3.5 mr-1" />
                          {translatedText.copyText}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 bg-white/10 hover:bg-white/20 text-green-300"
                          onClick={applyEnhancedText}
                        >
                          <ArrowDown className="h-3.5 w-3.5 mr-1" />
                          {translatedText.applyText}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-white/90">{enhancedText}</p>
                  </motion.div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    {translatedText.audioDuration}: {audioDuration[0]}s
                  </label>
                  <div className="px-3">
                    <Slider
                      value={audioDuration}
                      onValueChange={setAudioDuration}
                      max={30}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Generate Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-cyan-600/30 rounded-2xl blur-xl" />
              {/* <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-[300px] mx-auto md:w-full"
              > */}
                <Button
                  onClick={handleGenerateVideo}
                  disabled={(selectedMedia.length === 0 && !text.trim()) || isGenerating}
                  className="w-[280px] md:w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 h-14 text-lg font-bold shadow-2xl border-0 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      {translatedText.creatingVideo} {progress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-6 w-6 mr-3" />
                      {translatedText.generate}
                    </>
                  )}
                </Button>
              {/* </motion.div> */}

              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6"
                >
                  <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-sm text-white/80 mt-3 text-center flex items-center justify-center gap-2">
                    <Heart className="h-4 w-4 text-pink-400 animate-pulse" />
                    {translatedText.processingMedia}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Generated Video */}
            <AnimatePresence>
              {generatedVideoUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl" />
                  <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-75" />
                          <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg">
                            <VideoIcon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-white">Your Video</h3>
                      </div>
                      
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generatedVideoUrl, '_blank')}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {translatedText.download}
                        </Button>
                      </motion.div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden">
                      <video
                        src={generatedVideoUrl}
                        controls
                        preload="metadata"
                        className="w-full rounded-xl shadow-2xl"
                        style={{ maxHeight: '400px' }}
                        onError={(e) => {
                          console.error('Video error:', e);
                          toast({
                            title: "Video playback error",
                            description: "There was an issue loading the video. Check the console for details.",
                            variant: "destructive",
                          });
                        }}
                        onLoadedData={() => {
                          console.log('Video loaded successfully');
                        }}
                        onCanPlay={() => {
                          console.log('Video can start playing');
                        }}
                      >
                        <p>Your browser doesn't support HTML5 video. <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer">Download the video</a></p>
                      </video>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
} 
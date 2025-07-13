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
  ChevronDown
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
  { id: 'alloy', name: 'Naruto', description: 'Energetic and determined' },
  { id: 'echo', name: 'Sasuke', description: 'Cool and composed' },
  { id: 'fable', name: 'Sakura', description: 'Bright and caring' },
  { id: 'onyx', name: 'Kakashi', description: 'Calm and wise' },
  { id: 'nova', name: 'Hinata', description: 'Gentle and soft' },
  { id: 'shimmer', name: 'Tsunade', description: 'Strong and confident' },
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
  
  // Media selection state
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | GalleryImage | null>(null);
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
    settings: "Settings",
    generating: "Generating...",
    processing: "Processing media..."
  });

  // Initialize translations
  useEffect(() => {
    translateUI();
  }, [language]);

  // Translate UI elements - simplified version
  const translateUI = async () => {
    try {
      if (language === 'en') return;
      
      // Implement translation as needed
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  // Helper functions for platform/format data
  const getSelectedPlatformData = () => {
    return SOCIAL_MEDIA_PLATFORMS.find(p => p.id === selectedPlatform);
  };

  const getSelectedFormatData = () => {
    const platform = getSelectedPlatformData();
    return platform?.formats.find(f => f.id === selectedFormat);
  };

  // Handle platform selection
  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    const platform = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === platformId);
    if (platform && platform.formats.length > 0) {
      setSelectedFormat(platform.formats[0].id);
    }
  };

  // Auto-calculate duration based on text length and selected format
  useEffect(() => {
    if (text.trim()) {
      const words = text.trim().split(/\s+/).length;
      // Average speaking speed: 150-160 words per minute, so about 2.5-2.7 words per second
      // Adding some buffer time for natural speech patterns
      const estimatedDuration = Math.max(3, Math.min(30, Math.ceil(words / 2.2)));
      
      // Use format's recommended duration as a guide
      const formatData = getSelectedFormatData();
      const recommendedDuration = formatData?.recommendedDuration || estimatedDuration;
      
      // Balance between estimated and recommended duration
      const finalDuration = Math.max(3, Math.min(30, Math.round((estimatedDuration + recommendedDuration) / 2)));
      setAudioDuration([finalDuration]);
    }
  }, [text, selectedFormat]);

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 50 * 1024 * 1024; // 50MB

    if (file.type.startsWith('image/')) {
      if (file.size > maxImageSize) {
        toast({
          title: "File too large",
          description: "Images must be under 10MB",
          variant: "destructive",
        });
        return;
      }
    } else if (file.type.startsWith('video/')) {
      if (file.size > maxVideoSize) {
        toast({
          title: "File too large", 
          description: "Videos must be under 50MB",
          variant: "destructive",
        });
        return;
      }
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video file",
        variant: "destructive",
      });
      return;
    }

    const mediaFile: MediaFile = {
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name
    };

    setSelectedMedia(mediaFile);
    setShowGallery(false);
  }, []);

  // Handle gallery selection
  const handleGallerySelect = useCallback((image: GalleryImage) => {
    setSelectedMedia(image);
    setShowGallery(false);
  }, []);

  // AI enhance text based on selected media
  const handleEnhanceText = useCallback(async () => {
    if (!selectedMedia) {
      toast({
        title: "No media selected",
        description: "Please select an image or video first",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);
    
    try {
      let analysisPrompt = '';
      let mediaData = null;
      
      // Get platform and format data
      const platformData = getSelectedPlatformData();
      const formatData = getSelectedFormatData();
      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';
      
      // Build platform-specific prompt
      const platformPrompt = formatData?.promptModifier || 'Create engaging social media content.';
      const basePrompt = `Analyze this content and create compelling ${languageName} text for ${platformData?.name} ${formatData?.name}. ${platformPrompt}`;

      // Prepare data based on media type
      if ('file' in selectedMedia) {
        // Uploaded media file
        if (selectedMedia.type === 'image') {
          // Convert image to base64 for vision analysis
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedMedia.file);
          });
          
          mediaData = await base64Promise;
          analysisPrompt = `${basePrompt} Focus on benefits, emotions, and persuasive language that works specifically for ${formatData?.name}.`;
        } else {
          // Video analysis using existing video analysis service
          const formData = new FormData();
          formData.append('video', selectedMedia.file);
          formData.append('prompt', `${basePrompt} Write as if you're trying to sell or promote what's shown in the video. Focus on benefits, emotions, and persuasive language for ${formatData?.name}.`);
          
          const response = await fetch('/api/video/analyze', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Video analysis failed');
          }
          
          const result = await response.json();
          if (result.success && result.summary) {
            setEnhancedText(result.summary);
            setText(result.summary);
            toast({
              title: "Text enhanced!",
              description: "AI analyzed your video and generated a description",
            });
            return;
          } else {
            throw new Error(result.error || 'Video analysis failed');
          }
        }
      } else {
        // Gallery image - already has URL
        mediaData = selectedMedia.url;
        analysisPrompt = `${basePrompt} Original prompt was: "${selectedMedia.prompt}". Transform this into persuasive sales copy that promotes the product/item shown. Focus on benefits and emotions that work for ${formatData?.name}.`;
      }

      // For images, use the insights vision API
      if (mediaData && selectedMedia && (!('file' in selectedMedia) || selectedMedia.type === 'image')) {
        const enhanceResponse = await fetch('/api/ai/enhance-description', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: mediaData,
            currentText: text,
            language: selectedLanguage,
            analysisPrompt,
            platform: selectedPlatform,
            format: selectedFormat,
            maxCharacters: formatData?.maxCharacters,
            platformData: platformData,
            formatData: formatData
          }),
        });

        if (!enhanceResponse.ok) {
          throw new Error('Enhancement failed');
        }

        const enhanceResult = await enhanceResponse.json();
        if (enhanceResult.success && enhanceResult.enhancedText) {
          setEnhancedText(enhanceResult.enhancedText);
          setText(enhanceResult.enhancedText);
          
          const characterInfo = enhanceResult.characterLimit 
            ? ` (${enhanceResult.characterCount}/${enhanceResult.characterLimit} chars)`
            : '';
          
          toast({
            title: "Text enhanced!",
            description: `AI optimized your text for ${enhanceResult.formatInfo?.name || 'social media'}${characterInfo}`,
          });
        } else {
          throw new Error(enhanceResult.error || 'Enhancement failed');
        }
      }

    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Failed to enhance text",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  }, [selectedMedia, text, selectedLanguage, selectedPlatform, selectedFormat]);

  // Voice preview
  const handleVoicePreview = useCallback(async () => {
    if (!text.trim()) {
      toast({
        title: "No text to preview",
        description: "Please enter some text first",
        variant: "destructive",
      });
      return;
    }

    try {
      const previewText = text.substring(0, 100) + (text.length > 100 ? '...' : '');
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: previewText,
          voice: selectedVoice,
          language: selectedLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('Voice preview failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(console.error);
      }

    } catch (error) {
      console.error('Voice preview error:', error);
      toast({
        title: "Preview failed",
        description: "Failed to generate voice preview",
        variant: "destructive",
      });
    }
  }, [text, selectedVoice, selectedLanguage]);

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

    if (!selectedMedia && !text.trim()) {
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
      if (selectedMedia) {
        if ('file' in selectedMedia) {
          formData.append('media', selectedMedia.file);
        } else {
          formData.append('mediaUrl', selectedMedia.url);
        }
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

      // Handle the frame sequence response (now the only option)
      if (result.success) {
        // Set frame sequence mode (we always use this now)
        setIsFrameSequence(true);
        setFrameSequenceInfo({
          metadataPath: result.metadataPath,
          instructionsPath: result.instructionsPath,
          message: result.message
        });
        
        // Create a placeholder video info
        const placeholderVideoInfo = {
          id: `frame_sequence_${Date.now()}`,
          user_id: user.id,
          filename: 'frame_sequence.webm',
          video_url: result.instructionsPath || '#',
          original_text: text || undefined,
          voice_character: selectedVoice || undefined,
          audio_duration: audioDuration[0] || undefined,
          status: 'completed',
          media_files_count: selectedMedia ? 1 : 0,
          metadata: {
            frameSequence: true,
            metadataPath: result.metadataPath,
            instructionsPath: result.instructionsPath,
            message: result.message
          },
          created_at: new Date().toISOString(),
        };

        // Set generated video URL to a special value for the UI
        setGeneratedVideoUrl("frames-created");

        toast({
          title: translatedText.frameSequenceCreated,
          description: translatedText.frameSequenceDesc,
        });

        // Add to gallery if callback provided
        onVideoCreated?.(placeholderVideoInfo as CreatedVideo);
      } else {
        throw new Error(result.error || 'Frame sequence generation failed');
      }

    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate video",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [user, selectedMedia, text, selectedVoice, selectedLanguage, audioDuration, translatedText, onVideoCreated]);

  // Clear selection
  const handleClearMedia = useCallback(() => {
    if (selectedMedia && 'file' in selectedMedia) {
      URL.revokeObjectURL(selectedMedia.url);
    }
    setSelectedMedia(null);
  }, [selectedMedia]);

  // Download video function - this is now redundant since frame sequences can't be downloaded
  const handleDownload = useCallback(() => {
    toast({
      title: translatedText.cannotDownload,
      description: translatedText.cannotDownloadDesc,
      variant: "destructive",
    });
    return;
  }, [translatedText]);

  // Video player view - now always shows frame sequence info
  const renderVideoPlayer = () => {
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
  };

  // Main render - simplified version
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VideoIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{translatedText.createVideo}</h2>
        </div>
        <Badge 
          variant="outline" 
          className="bg-primary/10 hover:bg-primary/20 cursor-pointer flex items-center gap-1"
          onClick={() => setShowLanguageSelect(prev => !prev)}
        >
          <Globe className="h-3 w-3" />
          {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag || '🌐'}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Badge>
      </div>
      
      {/* Language selector dropdown */}
      <AnimatePresence>
        {showLanguageSelect && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <Button
                    key={lang.code}
                    variant={selectedLanguage === lang.code ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      setShowLanguageSelect(false);
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span className="text-xs">{lang.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content based on whether video is generated */}
      {generatedVideoUrl ? (
        // Show video player
        <div className="space-y-4">
          {renderVideoPlayer()}
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedVideoUrl(null);
                setText('');
                setEnhancedText('');
                setSelectedMedia(null);
                setProgress(0);
                setIsFrameSequence(false);
              }}
            >
              {translatedText.createNew}
            </Button>
            <Button 
              onClick={handleDownload} 
              disabled={isFrameSequence}
            >
              <Download className="mr-2 h-4 w-4" />
              {translatedText.download}
            </Button>
          </div>
        </div>
      ) : (
        // Show simplified creation form
        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          {/* Hidden audio element for voice preview */}
          <audio ref={audioRef} className="hidden" />

          {/* Basic form UI */}
          <div className="p-4 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">{translatedText.settings}</h3>
            </div>
            
            {/* Text input */}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text for voice generation..."
              className="min-h-[120px] bg-black/20 border-gray-700 resize-none mb-4"
            />
            
            {/* Duration slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translatedText.duration}: {audioDuration[0]} {translatedText.seconds}
              </label>
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
          
          {/* Generate Button */}
          <Button
            onClick={handleGenerateVideo}
            disabled={(!selectedMedia && !text.trim()) || isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12 text-lg font-semibold shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {translatedText.generating} {progress}%
              </>
            ) : (
              <>
                <VideoIcon className="h-5 w-5 mr-2" />
                {translatedText.createVideo}
              </>
            )}
          </Button>
          
          {/* Progress indicator */}
          {isGenerating && (
            <div className="mt-3 bg-black/20 rounded-lg p-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2 text-center">
                {translatedText.processing}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
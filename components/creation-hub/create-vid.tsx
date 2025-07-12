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

export default function CreateVid({ onVideoCreated }: CreateVidProps = {}) {
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
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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
        title: "Authentication required",
        description: "Please sign in to create videos",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMedia && !text.trim()) {
      toast({
        title: "Missing content",
        description: "Please add media or text to create a video",
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
      
      if (result.success && result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        
        // Use the database record if available, otherwise create a fallback object
        let createdVideo: CreatedVideo;
        
        if (result.record) {
          // Use the actual database record
          createdVideo = result.record;
        } else {
          // Fallback: create video object manually (for when database insert fails)
          createdVideo = {
            id: `video_${Date.now()}`,
            user_id: user.id,
            filename: result.metadata?.filename || 'video.mp4',
            video_url: result.videoUrl,
            original_text: text || undefined,
            voice_character: selectedVoice || undefined,
            audio_duration: audioDuration[0] || undefined,
            duration_seconds: result.metadata?.duration || audioDuration[0] || undefined,
            status: 'completed',
            media_files_count: selectedMedia ? 1 : 0,
            file_size: result.metadata?.fileSize || undefined,
            metadata: result.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          };
        }
        
        toast({
          title: "Video created!",
          description: "Your video has been generated successfully",
        });
        
        // Add to gallery if callback provided
        onVideoCreated?.(createdVideo);
      } else {
        throw new Error(result.error || 'Video generation failed');
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
  }, [user, selectedMedia, text, selectedVoice, selectedLanguage, audioDuration, onVideoCreated]);

  // Clear selection
  const handleClearMedia = useCallback(() => {
    if (selectedMedia && 'file' in selectedMedia) {
      URL.revokeObjectURL(selectedMedia.url);
    }
    setSelectedMedia(null);
  }, [selectedMedia]);

  return (
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

      {/* Language Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 w-full"
      >
        <div className="flex items-center gap-3 mb-3 w-full">
          <Globe className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Language & Voice Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="bg-black/20 border-gray-700">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Voice Character</label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="bg-black/20 border-gray-700">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-xs text-gray-400">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Media Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 w-full"
      >
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold">Select Media</h3>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-black/20 border-gray-700 hover:bg-black/40"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGallery(!showGallery)}
              className="bg-black/20 border-gray-700 hover:bg-black/40"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Gallery
            </Button>
          </div>
        </div>

        {/* Selected Media Display */}
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-4 w-full"
          >
            <div className="relative rounded-lg overflow-hidden bg-black/40 p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearMedia}
                className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </Button>
              
              {('file' in selectedMedia && selectedMedia.type === 'image') || (!('file' in selectedMedia)) ? (
                <img
                  src={selectedMedia.url}
                  alt={'name' in selectedMedia ? selectedMedia.name : 'Selected image'}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  className="w-full h-48 object-cover rounded-lg"
                  controls
                />
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {'file' in selectedMedia ? (
                    selectedMedia.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {'name' in selectedMedia ? selectedMedia.name : 'Gallery image'}
                  </span>
                </div>
                
                {'prompt' in selectedMedia && (
                  <Badge variant="secondary" className="text-xs">
                    Gallery
                  </Badge>
                )}
              </div>
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
              className="overflow-hidden w-full"
            >
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 text-gray-300">Your Gallery</h4>
                
                {galleryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : galleryImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {galleryImages.map((image) => (
                      <motion.div
                        key={image.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative cursor-pointer group"
                        onClick={() => handleGallerySelect(image)}
                      >
                        <img
                          src={image.url}
                          alt={image.prompt}
                          className="w-full h-20 object-cover rounded-lg border-2 border-transparent group-hover:border-blue-400 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm py-4">No images in your gallery yet.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Text Input with AI Enhancement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 w-full"
      >
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold">Voice Text</h3>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnhanceText}
              disabled={!selectedMedia || isEnhancing}
              className="bg-black/20 border-gray-700 hover:bg-black/40"
            >
              {isEnhancing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Enhance AI
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoicePreview}
              disabled={!text.trim()}
              className="bg-black/20 border-gray-700 hover:bg-black/40"
            >
              <Play className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {/* Platform Selector */}
        <div className="mb-4 w-full">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-blue-400" />
            <label className="text-sm font-medium">Target Platform & Format</label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Platform Selection */}
            <div>
              <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                <SelectTrigger className="bg-black/20 border-gray-700">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Selection */}
            <div>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger className="bg-black/20 border-gray-700">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {getSelectedPlatformData()?.formats.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Format Info */}
          {getSelectedFormatData() && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400">
                {getSelectedFormatData()?.description} • 
                Max {getSelectedFormatData()?.maxCharacters} chars • 
                {getSelectedFormatData()?.aspectRatio} • 
                ~{getSelectedFormatData()?.recommendedDuration}s
              </p>
            </div>
          )}
        </div>

        <div className="relative w-full">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Enter text for voice generation in ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English'}...`}
            className="min-h-[120px] bg-black/20 border-gray-700 resize-none pr-20"
          />
          
          {/* Character Counter */}
          {getSelectedFormatData() && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              <span className={text.length > (getSelectedFormatData()?.maxCharacters || 0) ? 'text-red-400' : 'text-gray-400'}>
                {text.length}/{getSelectedFormatData()?.maxCharacters}
              </span>
            </div>
          )}
        </div>

        {enhancedText && enhancedText !== text && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg w-full"
          >
            <p className="text-sm text-green-400 mb-2">✨ AI Enhanced version:</p>
            <p className="text-sm text-gray-300">{enhancedText}</p>
          </motion.div>
        )}

        <div className="mt-4 w-full">
          <label className="block text-sm font-medium mb-2">
            Audio Duration: {audioDuration[0]}s
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
      </motion.div>

      {/* Generate Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleGenerateVideo}
          disabled={(!selectedMedia && !text.trim()) || isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12 text-lg font-semibold shadow-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creating Video... {progress}%
            </>
          ) : (
            <>
              <VideoIcon className="h-5 w-5 mr-2" />
              Create Video
            </>
          )}
        </Button>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 bg-black/20 rounded-lg p-4"
          >
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Processing your media and generating voice...
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Generated Video */}
      <AnimatePresence>
        {generatedVideoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <VideoIcon className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold">Your Video</h3>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(generatedVideoUrl, '_blank')}
                className="bg-black/20 border-gray-700 hover:bg-black/40"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <video
              src={generatedVideoUrl}
              controls
              preload="metadata"
              className="w-full rounded-lg shadow-lg"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
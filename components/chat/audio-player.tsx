// components/chat/audio-player.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Button } from "../ui/button";
import { logger } from "@/memory-framework/config";
interface AudioPlayerProps {
isUser: boolean;
audioUrl?: string;
}
// Fonction utilitaire partagée
const formatTime = (time: number): string => {
if (isNaN(time) || time < 0) return "0:00";
const minutes = Math.floor(time / 60);
const seconds = Math.floor(time % 60);
return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
export function AudioPlayer({ isUser, audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCanPlay = useCallback(() => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (!isNaN(audioDuration) && isFinite(audioDuration)) {
        setDuration(audioDuration);
        setIsReady(true);
      } else {
        logger.warn(`[AudioPlayer] Audio duration not available yet for URL: ${audioUrl?.substring(0,50)}...`);
        if (audioRef.current.readyState >= 2) {
          setIsReady(true);
        }
      }
    }
  }, [audioUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleError = useCallback((e: Event | string) => {
    const audioElement = audioRef.current;
    let errorDetails = "Unknown audio error";
    
    setIsReady(false);
    setErrorState(true);

    if (audioElement && audioElement.error) {
      switch (audioElement.error.code) {
        case MediaError.MEDIA_ERR_ABORTED: errorDetails = "Playback aborted by user."; break;
        case MediaError.MEDIA_ERR_NETWORK: errorDetails = "Network error caused download to fail."; break;
        case MediaError.MEDIA_ERR_DECODE: errorDetails = "Error decoding the media resource."; break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorDetails = "Audio source not supported (format or server issue)."; break;
        default: errorDetails = `Undefined error code: ${audioElement.error.code}`;
      }
      
      const fullUrl = audioUrl || 'No URL provided';
      let additionalInfo = '';
      
      // Check if URL is expired or invalid
      if (audioElement.error.code === MediaError.MEDIA_ERR_NETWORK || 
          audioElement.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        fetch(fullUrl, { method: 'HEAD' })
          .then(response => {
            if (response.status === 403 || response.status === 401) {
              additionalInfo = 'URL may have expired. Please refresh the page or request a new link.';
            } else {
              additionalInfo = `Response status: ${response.status}`;
            }
            logger.error(`[AudioPlayer] Error loading/playing audio. Full URL: ${fullUrl}. Details: ${errorDetails}. ${additionalInfo}. MediaError Object: ${JSON.stringify(audioElement.error)}. Original Event: ${typeof e === 'string' ? e : JSON.stringify(e)}`);
          })
          .catch(fetchError => {
            additionalInfo = `Fetch error: ${fetchError.message}`;
            logger.error(`[AudioPlayer] Error loading/playing audio. Full URL: ${fullUrl}. Details: ${errorDetails}. ${additionalInfo}. MediaError Object: ${JSON.stringify(audioElement.error)}. Original Event: ${typeof e === 'string' ? e : JSON.stringify(e)}`);
          });
      } else {
        logger.error(`[AudioPlayer] Error loading/playing audio. Full URL: ${fullUrl}. Details: ${errorDetails}. MediaError Object: ${JSON.stringify(audioElement.error)}. Original Event: ${typeof e === 'string' ? e : JSON.stringify(e)}`);
      }
    } else if (typeof e === 'string') {
      logger.error(`[AudioPlayer] Error loading/playing audio. Full URL: ${audioUrl || 'No URL provided'}. Error string: ${e}`);
    } else {
      logger.error(`[AudioPlayer] Error loading/playing audio. Full URL: ${audioUrl || 'No URL provided'}. Event: ${JSON.stringify(e)}`);
    }
  }, [audioUrl]);

  const initializeAudio = useCallback(() => {
    if (!audioUrl) {
      setIsReady(false);
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      return undefined;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.preload = "metadata";

    // Add format support check
    const checkFormatSupport = () => {
      const audioTest = document.createElement('audio');
      const canPlayWebm = audioTest.canPlayType('audio/webm; codecs="opus"');
      const canPlayMp3 = audioTest.canPlayType('audio/mpeg');
      const canPlayOgg = audioTest.canPlayType('audio/ogg; codecs="opus"');
      
      logger.debug(`[AudioPlayer] Browser codec support - WebM: ${canPlayWebm}, MP3: ${canPlayMp3}, OGG: ${canPlayOgg}`);
      
      if (audioUrl.includes('.webm') && !canPlayWebm) {
        handleError('Browser does not support WebM audio format. Try using Chrome or Firefox.');
        return false;
      }
      return true;
    };

    if (!checkFormatSupport()) {
      return undefined;
    }
    
    audio.addEventListener("loadedmetadata", handleCanPlay);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleCanPlay);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [audioUrl, handleCanPlay, handleTimeUpdate, handleEnded, handleError]);

  useEffect(() => {
    return initializeAudio();
  }, [initializeAudio]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current && isReady) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current
          .play()
          .catch((error) => logger.error(`[AudioPlayer] Error playing audio: ${error}. URL: ${audioUrl?.substring(0,50)}...`));
      }
      setIsPlaying(!isPlaying);
    } else {
      logger.warn(`[AudioPlayer] Toggle play/pause attempted but audio not ready. URL: ${audioUrl?.substring(0,50)}...`);
    }
  }, [isPlaying, isReady, audioUrl]);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (audioRef.current && isReady) {
        const newTime = value[0];
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [isReady]
  );

  const handleRetry = useCallback(() => {
    setErrorState(false);
    setIsReady(false);
    initializeAudio();
  }, [initializeAudio]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}
    >
      {errorState ? (
        <div className="flex flex-col w-full gap-2">
          <div className="text-red-500 text-sm flex items-center gap-2">
            <span>Failed to load audio.</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRetry}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            type="button"
            onClick={togglePlayPause}
            disabled={!isReady}
            size="icon"
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isUser
                ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                : "bg-primary/10 text-primary hover:bg-primary/20",
              !isReady && "opacity-50 cursor-not-allowed"
            )}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            <AnimatedPlayPauseIcon isPlaying={isPlaying} />
          </Button>
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <Slider
              value={[currentTime]}
              max={duration > 0 ? duration : 1} 
              step={0.1}
              disabled={!isReady}
              onValueChange={handleSliderChange} 
              className={cn(
                "h-1.5 data-[disabled=true]:opacity-50", 
                isUser
                  ? "[&>span:first-child>span]:bg-primary-foreground [&_[role=slider]]:bg-primary-foreground/80 [&_[role=slider]]:border-primary-foreground/50" 
                  : "[&>span:first-child>span]:bg-primary [&_[role=slider]]:bg-primary/80 [&_[role=slider]]:border-primary/50" 
              )}
              aria-label="Audio progress"
            />
            <div className="flex justify-between text-xs opacity-80">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span> 
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function AnimatedPlayPauseIcon({ isPlaying }: { isPlaying: boolean }) {
return (
<div className="relative w-4 h-4">
<motion.div
initial={false}
animate={{ opacity: isPlaying ? 0 : 1, scale: isPlaying ? 0.8 : 1 }}
transition={{ duration: 0.2 }}
className="absolute inset-0 flex items-center justify-center"
>
<Play size={16} className="ml-0.5" />
</motion.div>
<motion.div
initial={false}
animate={{ opacity: isPlaying ? 1 : 0, scale: isPlaying ? 1 : 0.8 }}
transition={{ duration: 0.2 }}
className="absolute inset-0 flex items-center justify-center"
>
<Pause size={16} />
</motion.div>
</div>
);
}
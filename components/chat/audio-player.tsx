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
useEffect(() => {
if (!audioUrl) {
setIsReady(false);
setDuration(0);
setCurrentTime(0);
setIsPlaying(false);
return;
}
const audio = new Audio(audioUrl);
audioRef.current = audio;
audio.preload = "metadata"; 

const onError = (e: Event | string) => {
  const audioElement = audioRef.current;
  let errorDetails = "Unknown audio error";
  
  // Add UI error state
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
    // Use logger instead of console.error
    logger.error(`[AudioPlayer] Error loading/playing audio. URL: ${audioUrl?.substring(0,50)}... Details: ${errorDetails}. MediaError Object: ${JSON.stringify(audioElement.error)}. Original Event: ${typeof e === 'string' ? e : JSON.stringify(e)}`);
  } else if (typeof e === 'string') {
    logger.error(`[AudioPlayer] Error loading/playing audio. URL: ${audioUrl?.substring(0,50)}... Error string: ${e}`);
  } else {
    logger.error(`[AudioPlayer] Error loading/playing audio. URL: ${audioUrl?.substring(0,50)}... Event: ${JSON.stringify(e)}`);
  }
};


audio.addEventListener("loadedmetadata", handleCanPlay); 
audio.addEventListener("canplay", handleCanPlay); 
audio.addEventListener("timeupdate", handleTimeUpdate);
audio.addEventListener("ended", handleEnded);
audio.addEventListener("error", onError);


return () => {
  audio.pause();
  audio.removeEventListener("loadedmetadata", handleCanPlay);
  audio.removeEventListener("canplay", handleCanPlay);
  audio.removeEventListener("timeupdate", handleTimeUpdate);
  audio.removeEventListener("ended", handleEnded);
  audio.removeEventListener("error", onError); 
  audioRef.current = null; 
};

}, [audioUrl, handleCanPlay, handleTimeUpdate, handleEnded]);
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
return (
<div
className={cn(
"flex items-center gap-3 w-full",
isUser ? "text-primary-foreground" : "text-foreground"
)}
>
{errorState ? (
  <div className="text-red-500 text-sm">
    Failed to load audio. Please try again.
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
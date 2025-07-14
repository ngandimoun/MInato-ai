"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logger } from "@/memory-framework/config";

export interface VideoFrameMarker {
  timestamp: number;
  label: string;
  type: 'threat' | 'object' | 'person' | 'action' | 'info';
  description?: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  className?: string;
  markers?: VideoFrameMarker[];
  onMarkerClick?: (marker: VideoFrameMarker) => void;
  onTimeUpdate?: (currentTime: number) => void;
  autoPlay?: boolean;
  loop?: boolean;
}

export function VideoPlayerWithFrameNavigation({
  videoUrl,
  className,
  markers = [],
  onMarkerClick,
  onTimeUpdate,
  autoPlay = false,
  loop = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sort markers by timestamp
  const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
  
  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  };
  
  // Handle time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  };
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          logger.error("[VideoPlayer] Error playing video:", err);
          setError("Error playing video. Please try again.");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handle seeking
  const handleSeek = (newTime: number[]) => {
    if (videoRef.current && newTime.length > 0) {
      videoRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (newVolume: number[]) => {
    if (videoRef.current && newVolume.length > 0) {
      videoRef.current.volume = newVolume[0];
      setVolume(newVolume[0]);
      if (newVolume[0] === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Jump to specific marker
  const jumpToMarker = (marker: VideoFrameMarker) => {
    if (videoRef.current) {
      videoRef.current.currentTime = marker.timestamp;
      setCurrentTime(marker.timestamp);
      
      // If video is paused, start playing
      if (!isPlaying) {
        videoRef.current.play().catch(err => {
          logger.error("[VideoPlayer] Error playing video after marker jump:", err);
        });
        setIsPlaying(true);
      }
      
      // Call the marker click callback
      onMarkerClick?.(marker);
    }
  };
  
  // Skip forward/backward
  const skip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  // Format time display (mm:ss)
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Set up video event listeners
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('ended', () => setIsPlaying(false));
      videoElement.addEventListener('error', () => {
        setError("Error loading video. Please check the URL and try again.");
        logger.error("[VideoPlayer] Video error event triggered");
      });
      
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        videoElement.removeEventListener('ended', () => setIsPlaying(false));
        videoElement.removeEventListener('error', () => {});
      };
    }
  }, []);
  
  // Get marker color based on type
  const getMarkerColor = (type: VideoFrameMarker['type']): string => {
    switch (type) {
      case 'threat':
        return 'bg-red-500';
      case 'object':
        return 'bg-blue-500';
      case 'person':
        return 'bg-green-500';
      case 'action':
        return 'bg-purple-500';
      case 'info':
      default:
        return 'bg-gray-500';
    }
  };
  
  // Get badge variant based on type
  const getBadgeVariant = (type: VideoFrameMarker['type']): "default" | "destructive" | "outline" | "secondary" => {
    switch (type) {
      case 'threat':
        return 'destructive';
      case 'object':
        return 'default';
      case 'person':
        return 'secondary';
      case 'action':
        return 'default';
      case 'info':
      default:
        return 'outline';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative rounded-lg overflow-hidden bg-black",
        className
      )}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        autoPlay={autoPlay}
        loop={loop}
        playsInline
        muted={isMuted}
      />
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setError(null);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}
      
      {/* Video controls overlay */}
      <div className="absolute inset-0 flex flex-col justify-between opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity bg-gradient-to-b from-black/30 via-transparent to-black/80">
        {/* Top controls */}
        <div className="p-3 flex justify-between items-center">
          <div className="flex gap-1">
            {markers.length > 0 && (
              <Badge variant="outline" className="bg-black/50 backdrop-blur-sm">
                {markers.length} markers
              </Badge>
            )}
          </div>
          
          {/* Fullscreen button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-black/30"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Center play/pause button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && (
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-full bg-black/50 text-white hover:bg-black/70 pointer-events-auto"
              onClick={togglePlayPause}
            >
              <Play className="h-8 w-8" />
            </Button>
          )}
        </div>
        
        {/* Bottom controls */}
        <div className="p-3 space-y-2">
          {/* Timeline with markers */}
          <div className="relative h-8 flex items-center">
            {/* Markers */}
            {sortedMarkers.map((marker, index) => {
              const position = (marker.timestamp / (duration || 1)) * 100;
              return (
                <div
                  key={index}
                  className={cn(
                    "absolute h-4 w-1 rounded-full cursor-pointer transform -translate-x-1/2 hover:scale-150 transition-transform",
                    getMarkerColor(marker.type)
                  )}
                  style={{ left: `${position}%` }}
                  onClick={() => jumpToMarker(marker)}
                  title={`${marker.label} (${formatTime(marker.timestamp)})`}
                />
              );
            })}
            
            {/* Timeline slider */}
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.01}
              className="w-full"
              onValueChange={handleSeek}
            />
          </div>
          
          {/* Bottom row controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/pause button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-black/30"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              {/* Skip buttons */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-black/30"
                onClick={() => skip(-10)}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-black/30"
                onClick={() => skip(10)}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              {/* Volume control */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-black/30"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-20"
                  onValueChange={handleVolumeChange}
                />
              </div>
              
              {/* Time display */}
              <div className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
            
            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Markers dropdown/list for small screens */}
              {markers.length > 0 && (
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/50 border-white/20 text-white text-xs hover:bg-black/70"
                  >
                    Markers
                  </Button>
                  
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-black/90 backdrop-blur-sm rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {sortedMarkers.map((marker, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-1 hover:bg-white/10 rounded cursor-pointer"
                          onClick={() => jumpToMarker(marker)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", getMarkerColor(marker.type))} />
                            <span className="text-white text-xs truncate">{marker.label}</span>
                          </div>
                          <Badge variant={getBadgeVariant(marker.type)} className="text-[10px]">
                            {formatTime(marker.timestamp)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
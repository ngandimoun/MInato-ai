// components/call/call-controls.tsx
"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Camera, CameraOff, FileText, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CallControlsProps {
  callMode: "audio" | "video";
  isMuted: boolean;
  cameraOn: boolean;
  showTranscript: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void; // Simplified prop, logic is in parent
  onToggleTranscript: () => void;
  onHangUp: () => void;
}

export function CallControls({
  callMode,
  isMuted,
  cameraOn,
  showTranscript,
  onToggleMute,
  onToggleCamera, // Changed: Now just a simple callback
  onToggleTranscript,
  onHangUp,
}: CallControlsProps) {
  return (
    <div className="flex justify-center">
      <div className="flex items-center justify-center space-x-2 sm:space-x-3 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary shadow-lg">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-full transition-colors",
                  isMuted &&
                    "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                )}
                onClick={onToggleMute}
              >
                <AnimatedMicIcon isMuted={isMuted} />
                <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMuted ? "Unmute" : "Mute"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-full transition-colors",
                  !cameraOn &&
                    callMode === "video" &&
                    "bg-muted text-muted-foreground", 
                  // Removed audio mode specific styling, parent handles mode switch
                )}
                onClick={onToggleCamera} // Directly call the passed function
              >
                <AnimatedCameraIcon cameraOn={cameraOn} />
                <span className="sr-only">
                  {cameraOn
                    ? "Turn off camera"
                    : callMode === "audio" // This text might need adjustment if mode switching is separate
                    ? "Switch to Video & Turn on Camera" 
                    : "Turn on camera"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {cameraOn
                  ? "Turn off camera"
                  : callMode === "audio"
                  ? "Switch to Video Call & Turn on Camera"
                  : "Turn on camera"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-full transition-colors",
                  showTranscript && "bg-primary/10 text-primary"
                )}
                onClick={onToggleTranscript}
              >
                <FileText className="h-4 w-4" />
                <span className="sr-only">
                  {showTranscript ? "Hide transcript" : "Show transcript"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showTranscript ? "Hide transcript" : "Show transcript"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onHangUp}
              >
                <Phone className="h-4 w-4" />
                <span className="sr-only">End call</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>End Call</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function AnimatedMicIcon({ isMuted }: { isMuted: boolean }) {
  return (
    <div className="relative h-4 w-4">
      <motion.div
        initial={false}
        animate={{ opacity: isMuted ? 0 : 1, scale: isMuted ? 0.8 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Mic className="h-4 w-4" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ opacity: isMuted ? 1 : 0, scale: isMuted ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <MicOff className="h-4 w-4" />
      </motion.div>
    </div>
  );
}
function AnimatedCameraIcon({ cameraOn }: { cameraOn: boolean }) {
  return (
    <div className="relative h-4 w-4">
      <motion.div
        initial={false}
        animate={{ opacity: cameraOn ? 1 : 0, scale: cameraOn ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Camera className="h-4 w-4" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ opacity: cameraOn ? 0 : 1, scale: cameraOn ? 0.8 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <CameraOff className="h-4 w-4" />
      </motion.div>
    </div>
  );
}

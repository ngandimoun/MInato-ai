"use client";

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TextareaAutosize from "react-textarea-autosize";
import { Mic, SendHorizonal, Plus, X, ImageIcon, Video, Camera, FileText, Trash, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { useUploadStatus } from "@/context/upload-status-context";
import type { DocumentFile } from "@/components/settings/settings-panel";
import type { MessageAttachment } from "@/lib/types/index";
import { logger } from "@/memory-framework/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client"; // Corrected import
const generateId = () => globalThis.crypto.randomUUID();

type LocalAttachmentType = "image" | "video" | "document";
interface LocalAttachment { id: string; type: LocalAttachmentType; name: string; url?: string; file: File; size: number; mimeType: string; }
export interface InputAreaProps {
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => void;
  onSendAudio?: (audioBlob: Blob) => void;
  onDocumentsSubmit: (documents: DocumentFile[]) => void;
  disabled?: boolean;
  onAssistantReply?: (content: string) => void;
  onVideoAnalysisStatusChange?: (isAnalyzing: boolean) => void;
}
export interface InputAreaHandle { focusTextarea: () => void; }

const playSound = (soundType: "send" | "receive" | "error" | "recordStart" | "recordStop" | "recordCancel" | "recordDelete" | "attachmentAdd" | "attachmentRemove") => {
  logger.debug(`[InputArea] Sound: ${soundType}`);
};
const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const ACCEPTED_IMG_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const ACCEPTED_VID_TYPES = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/avi,video/mov";
const ACCEPTED_DOC_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
const MAX_AUDIO_RECORDING_MS = 60 * 1000; // 60 seconds

// --- Sub-Components (AttachmentPreview, RecordingInProgressUI, RecordingPreviewUI) remain the same as previously provided ---
function AttachmentPreview({ attachment, onRemove }: { attachment: LocalAttachment; onRemove: (id: string) => void; }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const toggleVideoPlayback = () => { if (!videoPreviewRef.current) return; if (isPlaying) videoPreviewRef.current.pause(); else videoPreviewRef.current.play().catch(e => logger.error("Error playing attachment preview:", e)); setIsPlaying(!isPlaying); };
    return ( <motion.div layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="relative group w-16 h-16 shrink-0"> <div className="w-full h-full rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border"> {attachment.type === "image" && attachment.url && (<img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />)} {attachment.type === "video" && attachment.url && (<div className="relative w-full h-full"> <video ref={videoPreviewRef} src={attachment.url} className="w-full h-full object-cover" onEnded={() => setIsPlaying(false)} muted /> <button onClick={toggleVideoPlayback} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors text-white" aria-label={isPlaying ? "Pause preview" : "Play preview"}>{isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}</button> </div>)} {attachment.type === "document" && (<div className="flex flex-col items-center justify-center p-1 text-center"> <FileText className="h-6 w-6 text-muted-foreground mb-1" /> <span className="text-[10px] leading-tight text-muted-foreground truncate w-full px-0.5" title={attachment.name}>{attachment.name.split(".").pop()?.toUpperCase() || "FILE"}</span> </div>)} </div> <Button type="button" size="icon" variant="destructive" className="h-5 w-5 rounded-full absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md" onClick={() => onRemove(attachment.id)} aria-label={`Remove ${attachment.name}`}><X className="h-3 w-3" /></Button> </motion.div> );
}
function RecordingInProgressUI({ duration, formatDuration: formatTime, onCancel }: { duration: number; formatDuration: (seconds: number) => string; onCancel: () => void; }) {
    return ( <motion.div key="recordingInProgress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="flex items-center justify-between rounded-2xl border border-destructive bg-background p-3 shadow-sm"> <div className="flex items-center gap-3"> <div className="relative"><div className="h-3 w-3 rounded-full bg-destructive" /><motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-full bg-destructive/30" /></div> <span className="text-sm font-medium text-destructive tabular-nums">{formatTime(duration)}</span> <span className="text-sm text-muted-foreground">Recording... (Max 60s)</span> </div> <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={onCancel} aria-label="Cancel recording"><X className="h-5 w-5" /></Button> </motion.div> );
}
function RecordingPreviewUI({ blob, duration, formatDuration: formatTime, onDelete, onSend }: { blob: Blob; duration: number; formatDuration: (seconds: number) => string; onDelete: () => void; onSend: () => void; }) {
    const [isPlaying, setIsPlaying] = useState(false); const [currentTime, setCurrentTime] = useState(0); const [isReady, setIsReady] = useState(false); const [audioUrl, setAudioUrl] = useState<string | null>(null); const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => { const url = URL.createObjectURL(blob); setAudioUrl(url); setIsReady(false); setCurrentTime(0); setIsPlaying(false); return () => { URL.revokeObjectURL(url); setAudioUrl(null); }; }, [blob]);
    const handleCanPlay = useCallback(() => setIsReady(true), []); const handleTimeUpdate = useCallback(() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }, []); const handleEnded = useCallback(() => { setIsPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }, []);
    const togglePlayback = useCallback(() => { if (audioRef.current && isReady) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(e => logger.error("Error playing audio preview:", e)); setIsPlaying(!isPlaying); } }, [isPlaying, isReady]);
    const handleSliderChange = useCallback((value: number[]) => { if (audioRef.current && isReady) { const newTime = value[0]; audioRef.current.currentTime = newTime; setCurrentTime(newTime); } }, [isReady]);
    return ( <motion.div key="recordingPreview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="flex items-center justify-between rounded-2xl border border-border bg-background p-3 shadow-sm"> <div className="flex items-center gap-3 flex-1 min-w-0"> <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full flex-shrink-0 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50" onClick={togglePlayback} disabled={!isReady} aria-label={isPlaying ? "Pause preview" : "Play preview"}> <AnimatePresence mode="wait" initial={false}>{isPlaying ? <motion.div key="pause" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}><Pause className="h-4 w-4" /></motion.div> : <motion.div key="play" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}><Play className="h-4 w-4 ml-0.5" /></motion.div>}</AnimatePresence> </Button> <div className="flex-1 flex flex-col gap-1 min-w-0"> <Slider value={[currentTime]} max={duration > 0 ? duration : 1} step={0.1} onValueChange={handleSliderChange} className="h-1.5 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 disabled:opacity-50" disabled={!isReady} aria-label="Audio preview progress" /> <div className="flex justify-between text-xs text-muted-foreground tabular-nums"><span>{formatTime(currentTime)}</span> <span>{formatTime(duration)}</span></div> </div> </div> <div className="flex items-center gap-2 ml-3 flex-shrink-0"> <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete recording"><Trash className="h-4 w-4" /></Button> <Button type="button" size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground" onClick={onSend} disabled={!isReady} aria-label="Send recording"><SendHorizonal className="h-4 w-4" /></Button> </div> {audioUrl && (<audio ref={audioRef} src={audioUrl} onLoadedMetadata={handleCanPlay} onCanPlay={handleCanPlay} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} preload="metadata" className="hidden" />)} </motion.div> );
}


export const InputArea = forwardRef<InputAreaHandle, InputAreaProps>(
  ({ onSendMessage, onSendAudio, onDocumentsSubmit, disabled, onAssistantReply, onVideoAnalysisStatusChange }, ref) => {
    const [message, setMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recordingPreview, setRecordingPreview] = useState<{ blob: Blob; duration: number } | null>(null);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");
    const [isCameraFront, setIsCameraFront] = useState(true);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [videoRecordingDuration, setVideoRecordingDuration] = useState(0);
    const [capturedVideo, setCapturedVideo] = useState<{ blob: Blob; url: string } | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const textareaAutosizeRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const videoElementRef = useRef<HTMLVideoElement>(null);
    const localCameraStreamRef = useRef<MediaStream | null>(null);
    const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoChunksForRecordingRef = useRef<Blob[]>([]);
    const videoRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRecordingTimeoutIdRef = useRef<NodeJS.Timeout | null>(null); // For max duration

    const { triggerUploadIndicator } = useUploadStatus();

    useImperativeHandle(ref, () => ({ focusTextarea: () => { textareaAutosizeRef.current?.focus(); } }));

    const handleSend = useCallback(() => {
      if (disabled) return;
      const textToSend = message.trim();
      const attachmentsToSend: MessageAttachment[] = attachments.filter(att => att.file instanceof File && att.file.size > 0).map(att => ({ id: att.id, type: att.type, name: att.name, url: att.url || "", file: att.file, size: att.file.size, mimeType: att.file.type, storagePath: undefined }));
      if (attachments.length > 0 && attachmentsToSend.length === 0) {
        toast({ title: "Attachment Error", description: "One or more attachments could not be sent. Please use the file picker or camera.", variant: "destructive", });
        return;
      }
      const documentAttachmentsForSubmit = attachments.filter(att => att.type === "document").map(docAtt => ({ id: docAtt.id, name: docAtt.name, file: docAtt.file, type: docAtt.file.type || "application/octet-stream", size: docAtt.file.size, uploadedAt: new Date(), }));
      if (textToSend || attachmentsToSend.length > 0) {
        onSendMessage(textToSend, attachmentsToSend);
        if (documentAttachmentsForSubmit.length > 0) onDocumentsSubmit(documentAttachmentsForSubmit);
        setMessage("");
        setAttachments([]);
        playSound("send");
      }
    }, [message, attachments, onSendMessage, onDocumentsSubmit, disabled]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey && !disabled) { e.preventDefault(); handleSend(); } }, [handleSend, disabled]);
    const startDurationTimer = (setter: React.Dispatch<React.SetStateAction<number>>, timerRef: React.MutableRefObject<NodeJS.Timeout | null>) => { if (timerRef.current) clearInterval(timerRef.current); setter(0); timerRef.current = setInterval(() => setter(prev => prev + 1), 1000); };
    const stopDurationTimer = (timerRef: React.MutableRefObject<NodeJS.Timeout | null>) => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    const getSupportedAudioMimeType = () => {
      const possibleTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      for (const type of possibleTypes) { if (MediaRecorder.isTypeSupported(type)) return type; }
      return "";
    };

    const startRecording = async () => {
      if (disabled || isRecording) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.state !== undefined) {
          mediaRecorderRef.current.stop();
        }
        const mimeType = getSupportedAudioMimeType() || "audio/webm"; // Default to webm if detection fails
        if (!mimeType && !MediaRecorder.isTypeSupported("audio/webm")) { // Final check for webm
            toast({ title: "Audio Format Not Supported", description: "Your browser may not support standard audio recording formats. Please try Chrome or Firefox.", variant: "destructive" });
            return;
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorder.onstop = () => {
          stopDurationTimer(audioRecordingTimerRef);
          if (audioRecordingTimeoutIdRef.current) clearTimeout(audioRecordingTimeoutIdRef.current);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          setRecordingPreview({ blob: audioBlob, duration: recordingDuration });
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
          playSound("recordStop");
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingPreview(null); // Clear any old preview
        startDurationTimer(setRecordingDuration, audioRecordingTimerRef);
        playSound("recordStart");

        // Enforce 60-second limit
        if (audioRecordingTimeoutIdRef.current) clearTimeout(audioRecordingTimeoutIdRef.current);
        audioRecordingTimeoutIdRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            logger.info("[InputArea] Max audio recording time reached (60s). Stopping.");
            mediaRecorderRef.current.stop();
            toast({ title: "Recording Limit", description: "Audio recording automatically stopped after 60 seconds."});
          }
        }, MAX_AUDIO_RECORDING_MS);

      } catch (error: any) {
        console.error("Error accessing microphone:", error);
        setIsRecording(false); stopDurationTimer(audioRecordingTimerRef);
        if (audioRecordingTimeoutIdRef.current) clearTimeout(audioRecordingTimeoutIdRef.current);
        toast({ title: "Microphone Error", description: error.message || "Please check permissions.", variant: "destructive" });
      }
    };

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
        if (audioRecordingTimeoutIdRef.current) clearTimeout(audioRecordingTimeoutIdRef.current);
        setIsRecording(false); stopDurationTimer(audioRecordingTimerRef); setRecordingPreview(null);
        mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
        playSound("recordCancel");
    }, [audioRecordingTimerRef]);
    const sendRecording = useCallback(() => { if (recordingPreview?.blob && onSendAudio) { onSendAudio(recordingPreview.blob); setRecordingPreview(null); playSound("send"); } }, [recordingPreview, onSendAudio]);
    const deleteRecording = useCallback(() => { setRecordingPreview(null); playSound("recordDelete"); }, []);
    const handleFileSelectType = (type: LocalAttachmentType) => {
      setAttachmentMenuOpen(false);
      if (disabled) return;
      if (type === "image" && imageInputRef.current) imageInputRef.current.click();
      else if (type === "video" && videoInputRef.current) videoInputRef.current.click();
      else if (type === "document" && docInputRef.current) docInputRef.current.click();
    };
    const initializeCamera = useCallback(async () => {
      try {
        if (localCameraStreamRef.current) { localCameraStreamRef.current.getTracks().forEach(track => track.stop()); }
        const constraints: MediaStreamConstraints = { video: { facingMode: isCameraFront ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localCameraStreamRef.current = stream;
        if (videoElementRef.current) videoElementRef.current.srcObject = stream;
        setCapturedImage(null);
        setCapturedVideo(null);
        setIsCapturing(false);
        setIsRecordingVideo(false);
        setVideoRecordingDuration(0);
      } catch (error: any) {
        console.error("Error accessing camera:", error);
        toast({ title: "Camera Access Error", description: error.message || "Please check permissions.", variant: "destructive" });
        setCameraOpen(false);
      }
    }, [isCameraFront]);
    const handleCameraOpen = () => {
      if (disabled) return;
      setCameraOpen(true);
      setCameraMode("photo");
      setAttachmentMenuOpen(false);
    };
    const switchCamera = () => { setIsCameraFront(prev => !prev); };
    const capturePhoto = () => {
      if (!videoElementRef.current || !localCameraStreamRef.current || isCapturing) return;
      setIsCapturing(true);
      const canvas = document.createElement("canvas");
      const video = videoElementRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        logger.warn("[InputArea Camera] Video dimensions zero.");
        setIsCapturing(false);
        toast({ title: "Capture Error", description: "Camera not ready.", variant: "destructive" });
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setIsCapturing(false); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(dataUrl);
      setIsCapturing(false);
      playSound("attachmentAdd");
    };
    const startVideoRecording = () => {
      if (!localCameraStreamRef.current || isRecordingVideo) return;
      videoChunksForRecordingRef.current = [];
      try {
        const options = { mimeType: "video/webm;codecs=vp8,opus" };
        let recorder;
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
          recorder = new MediaRecorder(localCameraStreamRef.current, options);
        } else {
          recorder = new MediaRecorder(localCameraStreamRef.current);
        }
        videoMediaRecorderRef.current = recorder;
        recorder.ondataavailable = event => { if (event.data.size > 0) videoChunksForRecordingRef.current.push(event.data); };
        recorder.onstop = () => {
          stopDurationTimer(videoRecordingTimerRef);
          const videoBlob = new Blob(videoChunksForRecordingRef.current, { type: recorder.mimeType || "video/webm" });
          const videoUrl = URL.createObjectURL(videoBlob);
          setCapturedVideo({ blob: videoBlob, url: videoUrl });
          setIsRecordingVideo(false);
          playSound("recordStop");
        };
        recorder.start();
        setIsRecordingVideo(true);
        startDurationTimer(setVideoRecordingDuration, videoRecordingTimerRef);
        playSound("recordStart");
        setTimeout(() => { if (videoMediaRecorderRef.current?.state === "recording") videoMediaRecorderRef.current.stop(); }, 300000);
      } catch (error: any) {
        logger.error("[InputArea Camera] Error starting video rec:", error);
        toast({ title: "Recording Error", description: error.message || "Could not start video rec.", variant: "destructive" });
        setIsRecordingVideo(false);
      }
    };
    const stopVideoRecording = () => { if (videoMediaRecorderRef.current?.state === "recording") videoMediaRecorderRef.current.stop(); };
    const retakeMedia = () => { setCapturedImage(null); setCapturedVideo(null); if (cameraOpen) initializeCamera(); };

    const processVideoForAI = useCallback(async (videoFile: File) => {
        if (!onAssistantReply || !onVideoAnalysisStatusChange) {
            logger.warn("[InputArea] onAssistantReply or onVideoAnalysisStatusChange not provided. Skipping AI video processing.");
            return;
        }
        onVideoAnalysisStatusChange(true);
        try {
            const supabase = getBrowserSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) { toast({ title: "Authentication Required", description: "Please log in to analyze videos.", variant: "destructive" }); onVideoAnalysisStatusChange(false); return; }
            toast({ title: "Processing Video...", description: "Minato is analyzing your video. This might take a moment!", duration: 7000 });
            const formData = new FormData();
            formData.append("video", videoFile);
            logger.debug(`[processVideoForAI] Sending video: ${videoFile.name}, type: ${videoFile.type}, size: ${videoFile.size}`);
            const response = await fetch("/api/video/analyze", { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData });
            if (!response.ok) { const errorText = await response.text(); logger.error(`[processVideoForAI] API error: ${response.status}, ${errorText}`); throw new Error(`API error: ${response.status} - ${errorText.substring(0,100)}`); }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            toast({ title: "Video Analyzed!", description: "Minato has processed your video.", duration: 3000 });
            if (result.summary && result.summary.trim()) {
                onAssistantReply(`Minato's summary of your video "${videoFile.name}": ${result.summary}`);
            } else {
                onAssistantReply(`Minato processed the video "${videoFile.name}" but couldn't generate a detailed summary.`);
            }
        } catch (error: any) {
            logger.error("Error processing video via API:", error);
            toast({ title: "Video Processing Failed", description: error.message || String(error), variant: "destructive" });
            onAssistantReply(`Minato encountered an issue analyzing the video "${videoFile.name}".`);
        } finally {
            onVideoAnalysisStatusChange(false);
        }
    }, [onAssistantReply, onVideoAnalysisStatusChange]);


    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: LocalAttachmentType) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        logger.debug(`[InputArea] File selected: type=${type}, count=${files.length}`);
        const newLocalAttachments: LocalAttachment[] = Array.from(files).map(file => {
            const id = `${Date.now()}-${generateId().substring(0,8)}`;
            const url = (type === "image" || type === "video") ? URL.createObjectURL(file) : undefined;
            if (type === "video") logger.debug(`[InputArea] Video file added: ${file.name}, type=${file.type}, size=${file.size}`);
            return { id, type, name: file.name, url, file, size: file.size, mimeType: file.type };
        });

        if (type === "video" && newLocalAttachments.length > 0 && newLocalAttachments[0].file) {
            const videoFile = newLocalAttachments[0].file;
            const messageAttachment: MessageAttachment = {
                id: newLocalAttachments[0].id, type: "video", name: videoFile.name,
                url: newLocalAttachments[0].url || "", file: videoFile, size: videoFile.size,
                mimeType: videoFile.type, storagePath: undefined,
            };
            onSendMessage(`[Video Attached: ${videoFile.name}]`, [messageAttachment]); // Send message with video
            processVideoForAI(videoFile); // Then process for summary
        } else {
            setAttachments(prev => [...prev, ...newLocalAttachments]); // Add other types directly
        }
        if (newLocalAttachments.length > 0 && type !== "video") { // Don't double trigger for video
            triggerUploadIndicator(); playSound("attachmentAdd");
        }
        if (e.target) e.target.value = ""; // Reset input
    }, [triggerUploadIndicator, processVideoForAI, onSendMessage]);

    const useMedia = useCallback(() => {
        const id = `${Date.now()}-${generateId().substring(0,8)}`;
        let newAttachment: LocalAttachment | null = null;
        if (capturedImage) {
            fetch(capturedImage).then(res => res.blob()).then(blob => {
                if (!blob) throw new Error("Failed to convert data URL to blob for image.");
                const file = new File([blob], `captured_photo_${id}.jpg`, { type: "image/jpeg" });
                newAttachment = { id, type: "image", name: file.name, url: URL.createObjectURL(blob), file, size: file.size, mimeType: file.type };
                setAttachments(prev => [...prev, newAttachment!]);
                triggerUploadIndicator(); playSound("attachmentAdd");
            }).catch(e => { logger.error("Error processing captured image:", e); toast({ title: "Image Error", description: "Could not use captured photo.", variant: "destructive" });
            }).finally(() => { setCapturedImage(null); setCameraOpen(false); });
        } else if (capturedVideo) {
            logger.debug(`[InputArea] Using captured video: type=${capturedVideo.blob.type}, size=${capturedVideo.blob.size}`);
            const file = new File([capturedVideo.blob], `captured_video_${id}.${capturedVideo.blob.type.split('/')[1] || 'webm'}`, { type: capturedVideo.blob.type || "video/webm" });
            const messageAttachment: MessageAttachment = { id, type: "video", name: file.name, url: capturedVideo.url, file, size: file.size, mimeType: file.type, storagePath: undefined };
            onSendMessage(`[Video Captured: ${file.name}]`, [messageAttachment]); // Send message with captured video
            processVideoForAI(file); // Process for summary
            // Don't add to local `attachments` state if it's immediately sent and processed
            triggerUploadIndicator(); playSound("attachmentAdd");
            setCapturedVideo(null); setCameraOpen(false);
        }
     }, [capturedImage, capturedVideo, triggerUploadIndicator, onSendMessage, processVideoForAI]);

    const removeAttachment = useCallback((idToRemove: string) => {
        setAttachments(prev => prev.filter(att => { if (att.id === idToRemove && att.url) URL.revokeObjectURL(att.url); return att.id !== idToRemove; }));
        playSound("attachmentRemove");
    }, []);
    useEffect(() => { return () => { stopDurationTimer(audioRecordingTimerRef); stopDurationTimer(videoRecordingTimerRef); if (audioRecordingTimeoutIdRef.current) clearTimeout(audioRecordingTimeoutIdRef.current); }; }, []);
    useEffect(() => { if (!isRecording && !recordingPreview && !disabled) textareaAutosizeRef.current?.focus(); }, [isRecording, recordingPreview, disabled]);
    useEffect(() => { return () => { attachments.forEach(att => { if (att.url) URL.revokeObjectURL(att.url); }); if (localCameraStreamRef.current) { localCameraStreamRef.current.getTracks().forEach(track => track.stop()); localCameraStreamRef.current = null; } if (capturedVideo?.url) URL.revokeObjectURL(capturedVideo.url); }; }, [attachments, capturedVideo?.url]);
    useEffect(() => { if (cameraOpen) initializeCamera(); else if (localCameraStreamRef.current) { localCameraStreamRef.current.getTracks().forEach(track => track.stop()); localCameraStreamRef.current = null; } }, [cameraOpen, initializeCamera]);

    const canSend = !disabled && (message.trim().length > 0 || attachments.length > 0);

    return (
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          {isRecording ? ( <RecordingInProgressUI key="recordingInProgress" duration={recordingDuration} formatDuration={formatDuration} onCancel={cancelRecording}/>
          ) : recordingPreview ? ( <RecordingPreviewUI key="recordingPreview" blob={recordingPreview.blob} duration={recordingDuration} formatDuration={formatDuration} onDelete={deleteRecording} onSend={sendRecording}/>
          ) : (
            <motion.div key="inputAreaMain" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}
              className="relative flex flex-col rounded-2xl border border-border bg-background shadow-sm focus-within:ring-1 focus-within:ring-primary/50">
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="px-3 pt-3">
                    <ScrollArea className="max-h-24"> <div className="flex gap-2 pb-2"> {attachments.map(attachment => (<AttachmentPreview key={attachment.id} attachment={attachment} onRemove={removeAttachment}/>))} </div> </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-end">
                <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full ml-1 mb-1 flex-shrink-0 text-muted-foreground hover:text-primary" disabled={disabled}>
                      <motion.div animate={{ rotate: attachmentMenuOpen ? 45 : 0 }} transition={{ duration: 0.2 }}><Plus className="h-5 w-5" /></motion.div><span className="sr-only">Add attachment</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-auto p-2 grid grid-cols-2 sm:grid-cols-4 gap-1">
                    <Button variant="ghost" className="h-auto flex flex-col items-center justify-center py-3 px-2 rounded-lg gap-1 hover:bg-muted" onClick={() => handleFileSelectType("image")} disabled={disabled}><div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-primary" /></div><span className="text-xs">Images</span></Button>
                    <Button variant="ghost" className="h-auto flex flex-col items-center justify-center py-3 px-2 rounded-lg gap-1 hover:bg-muted" onClick={() => handleFileSelectType("video")} disabled={disabled}><div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center"><Video className="h-5 w-5 text-primary" /></div><span className="text-xs">Video</span></Button>
                    <Button variant="ghost" className="h-auto flex flex-col items-center justify-center py-3 px-2 rounded-lg gap-1 hover:bg-muted" onClick={() => handleFileSelectType("document")} disabled={disabled}><div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div><span className="text-xs">Document</span></Button>
                    <Button variant="ghost" className="h-auto flex flex-col items-center justify-center py-3 px-2 rounded-lg gap-1 hover:bg-muted" onClick={handleCameraOpen} disabled={disabled}><div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center"><Camera className="h-5 w-5 text-primary" /></div><span className="text-xs">Camera</span></Button>
                  </PopoverContent>
                </Popover>
                <TextareaAutosize ref={textareaAutosizeRef} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message Minato..." className="flex-1 max-h-32 resize-none bg-transparent px-3 py-3 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50" maxRows={5} disabled={disabled}/>
                <div className="flex items-center mb-1 mr-1">
                  {canSend ? ( <Button type="button" size="icon" className="h-10 w-10 rounded-full flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSend} disabled={disabled}><SendHorizonal className="h-5 w-5" /><span className="sr-only">Send</span></Button>
                  ) : ( <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full flex-shrink-0 text-muted-foreground hover:text-primary" onClick={startRecording} disabled={disabled || isRecording}><Mic className="h-5 w-5" /><span className="sr-only">Record</span></Button> )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <input ref={imageInputRef} type="file" accept={ACCEPTED_IMG_TYPES} multiple className="hidden" onChange={e => handleFileChange(e, "image")}/>
        <input ref={videoInputRef} type="file" accept={ACCEPTED_VID_TYPES} className="hidden" onChange={e => handleFileChange(e, "video")}/>
        <input ref={docInputRef} type="file" accept={ACCEPTED_DOC_TYPES} multiple className="hidden" onChange={e => handleFileChange(e, "document")}/>
        <Dialog open={cameraOpen} onOpenChange={openState => { if (!openState && localCameraStreamRef.current) { localCameraStreamRef.current.getTracks().forEach(track => track.stop()); localCameraStreamRef.current = null; } setCameraOpen(openState); }}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden aspect-video">
            <div className="relative bg-black w-full h-full">
              {!capturedImage && !capturedVideo && (<video ref={videoElementRef} autoPlay playsInline muted className={`w-full h-full object-contain ${cameraMode === "photo" && isCameraFront ? "transform scale-x-[-1]" : ""}`} />)}
              {capturedImage && (<img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />)}
              {capturedVideo && (<video src={capturedVideo.url} className="w-full h-full object-contain" controls autoPlay loop muted />)}
              {!videoElementRef.current && !capturedImage && !capturedVideo && (<div className="absolute inset-0 flex items-center justify-center text-white bg-black/80 text-center px-4"><span>Camera not available. Check permissions.</span></div>)}
              {!capturedImage && !capturedVideo && !isRecordingVideo && (
                <div className="absolute top-2 right-2 flex flex-col space-y-2 z-10">
                  <Button variant="outline" size="icon" className="h-12 w-12 bg-black/50 text-white hover:bg-black/70 border-white/30" onClick={switchCamera} aria-label="Switch camera"><RotateCcw className="h-5 w-5" /></Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 bg-black/50 text-white hover:bg-black/70 border-white/30" onClick={() => setCameraMode(cameraMode === "photo" ? "video" : "photo")} aria-label={cameraMode === "photo" ? "Switch to video" : "Switch to photo"}>{cameraMode === "photo" ? <Video className="h-5 w-5" /> : <Camera className="h-5 w-5" />}</Button>
                </div>
              )}
              {isRecordingVideo && (<div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-sm font-medium z-10"><div className="h-2 w-2 rounded-full bg-white animate-pulse" /> REC {formatDuration(videoRecordingDuration)}</div>)}
              <div className="absolute bottom-0 left-0 w-full flex justify-center items-center gap-4 pb-6 z-10">
                {capturedImage || capturedVideo ? (
                  <> <Button variant="outline" size="lg" className="text-base px-6 py-2" onClick={retakeMedia} aria-label="Retake">Retake</Button> <Button variant="default" size="lg" onClick={useMedia} className="bg-primary hover:bg-primary/90 text-base px-6 py-2" aria-label={`Use ${capturedImage ? "Photo" : "Video"}`}>Use {capturedImage ? "Photo" : "Video"}</Button> </>
                ) : (
                  <> <Button variant="outline" size="lg" className="text-base px-6 py-2" onClick={() => setCameraOpen(false)} aria-label="Cancel">Cancel</Button>
                  {cameraMode === "photo" ? ( <Button variant="default" size="lg" onClick={capturePhoto} disabled={isCapturing} className="bg-primary hover:bg-primary/90 text-base px-8 py-3 rounded-full shadow-lg border-4 border-white/30" aria-label="Capture Photo">{isCapturing ? "Capturing..." : "Capture Photo"}</Button>
                  ) : ( <Button variant={isRecordingVideo ? "destructive" : "default"} size="lg" onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording} className={`text-base px-8 py-3 rounded-full shadow-lg border-4 border-white/30 ${isRecordingVideo ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}`} aria-label={isRecordingVideo ? "Stop Recording" : "Start Recording"}>{isRecordingVideo ? "Stop Recording" : "Start Recording"}</Button> )} </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);
InputArea.displayName = "InputArea";
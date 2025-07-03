import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export interface RecordingOptions {
  title?: string;
  description?: string;
}

export class ListeningOrchestrator {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: Date | null = null;
  private onStatusChange: (status: string) => void = () => {};
  private onError: (error: string) => void = () => {};

  constructor() {
    // Initialize with empty handlers
  }

  setStatusChangeHandler(handler: (status: string) => void): void {
    this.onStatusChange = handler;
  }

  setErrorHandler(handler: (error: string) => void): void {
    this.onError = handler;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we're just testing permissions
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      this.onError("Microphone permission denied");
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      });

      this.mediaRecorder.addEventListener("error", (event) => {
        this.onError("Recording error occurred");
        this.stopRecording();
      });

      this.mediaRecorder.start(1000); // Collect data every second
      this.startTime = new Date();
      this.onStatusChange("recording");
      return true;
    } catch (error) {
      this.onError(`Could not start recording: ${(error as Error).message}`);
      return false;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.onStatusChange("stopped");
  }

  getRecordingBlob(): Blob | null {
    if (!this.audioChunks.length) return null;
    
    return new Blob(this.audioChunks, { type: "audio/webm" });
  }

  getRecordingDuration(): number {
    if (!this.startTime) return 0;
    
    const endTime = new Date();
    return Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);
  }

  async uploadRecording(
    options: RecordingOptions = {}
  ): Promise<{ recordingId: string; success: boolean }> {
    const blob = this.getRecordingBlob();
    if (!blob) {
      this.onError("No recording to upload");
      return { recordingId: "", success: false };
    }

    this.onStatusChange("uploading");
    const supabase = getBrowserSupabaseClient();
    
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `recording-${timestamp}.webm`;
      
      // Create recording entry in database
      const { data: recordingData, error: recordingError } = await supabase
        .from("audio_recordings")
        .insert({
          title: options.title || "New Recording",
          description: options.description || null,
          file_path: fileName,
          duration_seconds: this.getRecordingDuration(),
          status: "pending",
        })
        .select("id")
        .single();
      
      if (recordingError) {
        throw new Error(recordingError.message);
      }
      
      const recordingId = recordingData.id;
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Upload file to storage
      const { error: uploadError } = await supabase
        .storage
        .from("audio-recordings")
        .upload(`${user.id}/${fileName}`, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: blob.type,
        });
      
      if (uploadError) {
        // Delete the recording entry if the upload failed
        await supabase
          .from("audio_recordings")
          .delete()
          .eq("id", recordingId);
        
        throw new Error(uploadError.message);
      }
      
      this.onStatusChange("uploaded");
      
      return { recordingId, success: true };
    } catch (error) {
      this.onError(`Upload failed: ${(error as Error).message}`);
      this.onStatusChange("error");
      return { recordingId: "", success: false };
    }
  }

  clearRecording(): void {
    this.audioChunks = [];
    this.startTime = null;
  }
} 
// FILE: lib/services/VideoAnalysisService.ts
import { exec } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { appConfig } from "@/lib/config";
import { logger } from "@/memory-framework/config";
import { generateVisionCompletion } from "@/lib/providers/llm_clients";
import type { ChatMessage } from "@/lib/types/index";
import type { ChatCompletionContentPartImage } from "openai/resources/chat/completions";
import os from "os";

const execPromise = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

export class VideoAnalysisService {
  private readonly maxFrames: number;
  private readonly visionDetail: "auto" | "low" | "high";
  private readonly visionModel: string;
  private readonly maxVisionTokens: number;

  constructor() {
    this.maxFrames = (appConfig.openai as any)['maxVideoFrames'] || 10;
    this.visionDetail = appConfig.openai.visionDetail;
    this.visionModel = appConfig.openai.chatModel; // GPT-4o is used for vision
    this.maxVisionTokens = appConfig.openai.maxVisionTokens;
    logger.info(`[VideoAnalysisService] Initialized. MaxFrames: ${this.maxFrames}, VisionDetail: ${this.visionDetail}, VisionModel: ${this.visionModel}`);
  }

  async analyzeVideo(
    videoBuffer: Buffer,
    originalFileName: string,
    videoMimeType: string,
    userPrompt: string | null,
    userId: string
  ): Promise<{ summary: string | null; error?: string; frameCount?: number; usage?: any }> {
    const logPrefix = `[VideoAnalysisService User:${userId.substring(0, 8)} File:${originalFileName.substring(0,20)}]`;
    const tempDir = join(os.tmpdir(), `video-processing-${uuidv4()}`);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      const ext = videoMimeType.split("/")[1] || "mp4";
      const videoPath = join(tempDir, `input-${Date.now()}.${ext}`);
      await fs.writeFile(videoPath, videoBuffer);

      const framesDir = join(tempDir, "frames");
      await fs.mkdir(framesDir, { recursive: true });

      const fps = 1; // Extract 1 frame per second
      logger.info(`${logPrefix} Extracting up to ${this.maxFrames} frames at ${fps} FPS...`);
      try {
        await execPromise(
          `ffmpeg -i ${videoPath} -vf fps=${fps} -frames:v ${this.maxFrames} ${join(framesDir, "frame-%03d.jpg")}`
        );
      } catch (ffmpegError: any) {
        logger.error(`${logPrefix} ffmpeg error:`, ffmpegError);
        return { summary: null, error: "Failed to extract frames from video. Ensure ffmpeg is installed and the video is valid." };
      }

      const frameFiles = (await fs.readdir(framesDir)).filter(file => file.startsWith("frame-") && file.endsWith(".jpg")).sort();
      const selectedFramesPaths = frameFiles.slice(0, this.maxFrames).map(f => join(framesDir, f));

      if (selectedFramesPaths.length === 0) {
        logger.error(`${logPrefix} No frames were extracted from the video.`);
        return { summary: null, error: "No frames were extracted from the video" };
      }

      const imageContentParts: ChatCompletionContentPartImage[] = [];
      for (const framePath of selectedFramesPaths) {
        const frameData = await fs.readFile(framePath);
        const base64Frame = Buffer.from(frameData).toString("base64");
        imageContentParts.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Frame}`,
            detail: this.visionDetail,
          },
        });
      }

      const visionPromptText = userPrompt || `Analyze these video frames from "${originalFileName}" and provide a concise summary of what is happening. The user is ${userId.substring(0, 8)}.`;
      const visionMessages: ChatMessage[] = [{
        role: "user",
        content: [
          { type: "text", text: visionPromptText },
          ...imageContentParts.map(img => ({ type: "input_image" as const, image_url: img.image_url.url, detail: img.image_url.detail }))
        ],
      }];

      logger.info(`${logPrefix} Sending ${selectedFramesPaths.length} frames to vision model (${this.visionModel}).`);
      const visionResult = await generateVisionCompletion(
        visionMessages,
        this.visionModel,
        this.maxVisionTokens,
        userId
      );

      if (visionResult.error || !visionResult.text) {
        logger.error(`${logPrefix} Vision analysis failed: ${visionResult.error}`);
        return { summary: null, error: visionResult.error || "Vision analysis returned no text.", frameCount: selectedFramesPaths.length, usage: visionResult.usage };
      }

      logger.info(`${logPrefix} Vision analysis successful.`);
      return { summary: visionResult.text.trim(), frameCount: selectedFramesPaths.length, usage: visionResult.usage };

    } catch (error: any) {
      logger.error(`${logPrefix} Error during video analysis:`, error.message, error.stack);
      return { summary: null, error: error?.message || "Error processing video" };
    } finally {
      try {
        if (await fs.stat(tempDir).catch(() => false)) {
          await fs.rm(tempDir, { recursive: true, force: true });
          logger.debug(`${logPrefix} Cleaned up temp directory: ${tempDir}`);
        }
      } catch (cleanupError) {
        logger.error(`${logPrefix} Error cleaning up temp files:`, cleanupError);
      }
    }
  }
}
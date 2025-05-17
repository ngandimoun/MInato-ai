//app/api/video/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // Keep for Supabase storage
import { exec } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid"; 
// OpenAI client is now managed via llm_clients.ts for consistency
import { logger } from "../../../../memory-framework/config"; // Adjusted path
import { appConfig } from "@/lib/config";
import { MEDIA_VIDEO_BUCKET } from "@/lib/constants"; // Using MEDIA_VIDEO_BUCKET
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server"; // For auth
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/server"; // For storage admin ops
import { generateVisionCompletion } from "@/lib/providers/llm_clients";
import type { ChatMessage } from "@/lib/types/index";
import type { ChatCompletionContentPartImage } from "openai/resources/chat/completions";
import os from "os";

// Helper function to run shell commands (for ffmpeg)
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

export async function POST(req: NextRequest) {
  const logPrefix = "[API VideoAnalyze]";
  let userId: string | null = null;
  const tempDir = join(os.tmpdir(), `video-processing-${uuidv4()}`); // Define tempDir early for cleanup

  try {
    const cookieStore = cookies();
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user?.id) {
      logger.warn(`${logPrefix} Unauthorized access attempt. Error: ${authError?.message}`);
      return NextResponse.json({ error: "Unauthorized: Not authenticated" }, { status: 401 });
    }
    userId = user.id;
    if (!userId) throw new Error("userId is null");
    logger.info(`${logPrefix} Request from user: ${userId.substring(0,8)}`);

    const formData = await req.formData();
    const videoFile = formData.get("video") as File;
    const promptFromClient = formData.get("prompt") as string | null; // Optional prompt

    if (!videoFile) {
      logger.warn(`${logPrefix} No video file provided by user ${userId.substring(0,8)}.`);
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }
    logger.info(`${logPrefix} Received video: name=${videoFile.name}, type=${videoFile.type}, size=${videoFile.size} for user ${userId.substring(0,8)}.`);

    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska", "video/avi", "video/mov"];
    const isAllowed = allowedTypes.some(type => videoFile.type.startsWith(type));
    if (!isAllowed) {
      logger.warn(`${logPrefix} Unsupported video type: ${videoFile.type} from user ${userId.substring(0,8)}.`);
      return NextResponse.json({ error: `Unsupported video type: ${videoFile.type}` }, { status: 415 });
    }
    if (videoFile.size > ((appConfig.openai as any)['maxVideoSizeBytes'] || 100 * 1024 * 1024)) { // Use a config value or default
        logger.warn(`${logPrefix} Video file too large: ${videoFile.size} bytes. User: ${userId.substring(0,8)}.`);
        return NextResponse.json({ error: `Video file too large. Max size is ${ ((appConfig.openai as any)['maxVideoSizeBytes'] || 100 * 1024 * 1024) / (1024*1024)}MB.` }, { status: 413 });
    }


    await fs.mkdir(tempDir, { recursive: true });
    
    const baseMimeType = videoFile.type.split(";")[0];
    const mimeToExt: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv", "video/quicktime": "mov", "video/x-matroska": "mkv" };
    const ext = mimeToExt[baseMimeType] || "mp4";
    const videoPath = join(tempDir, `input-${Date.now()}.${ext}`);
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    await fs.writeFile(videoPath, videoBuffer);
    
    const framesDir = join(tempDir, "frames");
    await fs.mkdir(framesDir, { recursive: true });

    const fps = 1; // Extract 1 frame per second
    const maxFramesToExtract = (appConfig.openai as any)['maxVideoFrames'] || 10; // Configurable max frames

    try {
      // Modify ffmpeg command to limit duration of input processing to avoid excessive frame extraction for long videos
      // e.g., -t 30 to process only the first 30 seconds. Max frames will further limit.
      // -vf select='isnan(prev_selected_t)+gte(t-prev_selected_t\,1/N)' where N is fps
      // -r for output frame rate, -frames:v to limit total frames
      await execPromise(
        `ffmpeg -i ${videoPath} -vf fps=${fps} -frames:v ${maxFramesToExtract} ${join(framesDir, "frame-%03d.jpg")}`
      );
    } catch (ffmpegError: any) {
      logger.error(`${logPrefix} ffmpeg error for user ${userId.substring(0,8)}:`, ffmpegError);
      return NextResponse.json({ error: "Failed to extract frames from video. Ensure ffmpeg is installed and the video is valid." }, { status: 500 });
    }

    const frameFiles = (await fs.readdir(framesDir)).filter(file => file.startsWith("frame-") && file.endsWith(".jpg")).sort();
    const selectedFramesPaths = frameFiles.slice(0, maxFramesToExtract).map(f => join(framesDir, f));
    
    if (selectedFramesPaths.length === 0) {
      logger.error(`${logPrefix} No frames were extracted from the video. videoPath=${videoPath}. User: ${userId.substring(0,8)}.`);
      throw new Error("No frames were extracted from the video");
    }

    // Upload original video to Supabase bucket
    const supabaseAdmin = getSupabaseAdminClient();
    if(!supabaseAdmin) { logger.error(`${logPrefix} Supabase admin client failed to initialize.`); throw new Error("Storage admin error."); }

    const videoFileNameForSupabase = `${userId}/${Date.now()}-${uuidv4()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(MEDIA_VIDEO_BUCKET)
      .upload(videoFileNameForSupabase, videoBuffer, { contentType: videoFile.type, cacheControl: "3600" });

    if (uploadError) {
      logger.error(`${logPrefix} Error uploading video for user ${userId.substring(0,8)}:`, uploadError);
      // Continue with frame analysis even if video upload fails, but log it.
    }
    const publicVideoUrl = uploadData?.path ? supabaseAdmin.storage.from(MEDIA_VIDEO_BUCKET).getPublicUrl(uploadData.path).data.publicUrl : null;


    // Prepare frames for GPT-4o vision analysis
    const imageContentParts: ChatCompletionContentPartImage[] = [];
    for (const framePath of selectedFramesPaths) {
        const frameData = await fs.readFile(framePath);
        const base64Frame = Buffer.from(frameData).toString("base64");
        imageContentParts.push({
            type: "image_url",
            image_url: {
                url: `data:image/jpeg;base64,${base64Frame}`,
                detail: appConfig.openai.visionDetail as "auto" | "low" | "high",
            },
        });
    }

    const visionPromptText = promptFromClient || `Analyze these video frames and provide a concise summary of what is happening. The user is ${userId.substring(0,8)}.`;
    const visionMessages: ChatMessage[] = [{
        role: "user",
        content: [
            { type: "text", text: visionPromptText },
            ...imageContentParts.map(img => ({ type: "input_image" as const, image_url: img.image_url.url, detail: img.image_url.detail }))
        ],
    }];
    
    // Use generateVisionCompletion from llm_clients (which uses GPT-4o)
    logger.info(`${logPrefix} Sending ${selectedFramesPaths.length} frames to GPT-4o for analysis. User: ${userId.substring(0,8)}.`);
    const visionResult = await generateVisionCompletion(
        visionMessages, 
        appConfig.openai.chatModel, // GPT-4o
        appConfig.openai.maxVisionTokens,
        userId
    );

    if (visionResult.error || !visionResult.text) {
      logger.error(`${logPrefix} GPT-4o vision analysis failed for user ${userId.substring(0,8)}: ${visionResult.error}`);
      // Return a partial success if video was uploaded but analysis failed
      return NextResponse.json({
        success: false, // Mark as not fully successful
        videoUrl: publicVideoUrl,
        frameCount: selectedFramesPaths.length,
        summary: "Could not generate video summary due to analysis error.",
        error: visionResult.error || "Vision analysis returned no text.",
      }, { status: 500 });
    }
    
    logger.info(`${logPrefix} Video analysis by GPT-4o successful for user ${userId.substring(0,8)}.`);
    
    return NextResponse.json({
      success: true,
      videoUrl: publicVideoUrl,
      frameCount: selectedFramesPaths.length,
      // frameAnalysis is no longer returned, summary is the main output
      summary: visionResult.text.trim(),
      debugUsage: visionResult.usage,
    });

  } catch (error: any) {
    const userIdSuffix = userId ? userId.substring(0,8) + "..." : "UNKNOWN";
    logger.error(`${logPrefix} Error processing video for user ${userIdSuffix}:`, error.message, error.stack);
    return NextResponse.json({ error: error?.message || "Error processing video" }, { status: 500 });
  } finally {
    try {
      if (await fs.stat(tempDir).catch(() => false)) { // Check if dir exists
        await fs.rm(tempDir, { recursive: true, force: true });
        logger.debug(`${logPrefix} Cleaned up temp directory: ${tempDir}`);
      }
    } catch (cleanupError) {
      logger.error(`${logPrefix} Error cleaning up temp files for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:`, cleanupError);
    }
  }
}
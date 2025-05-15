import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid"; 
import OpenAI from "openai";
import os from "os";

// Initialize OpenAI and Supabase clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const MEDIA_VIDEO_BUCKET = process.env.MEDIA_VIDEO_BUCKET || "videos";

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
  try {
    // 1. Authenticate user using Supabase auth
    let userId = null;
    
    // Only use authorization header for security
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }
    // Final check
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Not authenticated" }, { status: 401 });
    }

    // 2. Get the video file from request
    const formData = await req.formData();
    const videoFile = formData.get("video") as File;
    
    // Log incoming video file details for debugging
    if (videoFile) {
      console.log(`[DEBUG /api/video/analyze] Received video: name=${videoFile.name}, type=${videoFile.type}, size=${videoFile.size}`);
    } else {
      console.log(`[DEBUG /api/video/analyze] No video file received in formData.`);
    }
    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate file type (allow only common video types)
    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska"];
    // Accept any type that starts with an allowed type (to handle codecs)
    const isAllowed = allowedTypes.some(type => videoFile.type.startsWith(type));
    if (!isAllowed) {
      console.error(`[DEBUG /api/video/analyze] Unsupported video type: ${videoFile.type}`);
      return NextResponse.json({ error: `Unsupported video type: ${videoFile.type}` }, { status: 400 });
    }

    // 3. Create a temporary working directory
    const tempDir = join(os.tmpdir(), `video-processing-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // 4. Save the video file temporarily with correct extension
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    // Get extension from base mime type (strip codecs)
    const baseMimeType = videoFile.type.split(";")[0];
    const mimeToExt: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/ogg": "ogv",
      "video/quicktime": "mov",
      "video/x-matroska": "mkv",
    };
    const ext = mimeToExt[baseMimeType] || "mp4";
    const videoPath = join(tempDir, `input-${Date.now()}.${ext}`);
    await fs.writeFile(videoPath, videoBuffer);
    
    // 5. Create output directory for frames
    const framesDir = join(tempDir, "frames");
    await fs.mkdir(framesDir, { recursive: true });

    // 6. Extract frames using ffmpeg (1 frame per second)
    // Make sure ffmpeg is installed on your server
    const fps = 1; // Extract 1 frame per second
    try {
      await execPromise(
        `ffmpeg -i ${videoPath} -vf fps=${fps} ${join(framesDir, "frame-%03d.jpg")}`
      );
    } catch (ffmpegError: any) {
      console.error("ffmpeg error:", ffmpegError);
      return NextResponse.json({ error: "Failed to extract frames from video. Ensure ffmpeg is installed and the video is valid." }, { status: 500 });
    }

    // 7. Get list of extracted frames
    const frameFiles = await fs.readdir(framesDir);
    
    // Limit to 10 frames maximum (to avoid API overuse)
    const selectedFrames = frameFiles
      .filter(file => file.startsWith("frame-") && file.endsWith(".jpg"))
      .sort()
      .slice(0, 10);
    
    if (selectedFrames.length === 0) {
      console.error(`[DEBUG /api/video/analyze] No frames were extracted from the video. videoPath=${videoPath}`);
      throw new Error("No frames were extracted from the video");
    }

    // 8. Upload video to Supabase bucket
    const videoFileName = `${userId}/${Date.now()}-${uuidv4()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(MEDIA_VIDEO_BUCKET)
      .upload(videoFileName, videoBuffer, {
        contentType: videoFile.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Error uploading video:", uploadError);
      // Continue anyway - we can still process the frames
    }

    // 9. Read frames and send to OpenAI API for analysis
    const frameAnalysis = [];
    for (const frameFile of selectedFrames) {
      const framePath = join(framesDir, frameFile);
      const frameData = await fs.readFile(framePath);
      
      // Encode frame as base64
      const base64Frame = Buffer.from(frameData).toString("base64");
      
      // Send to OpenAI Vision API
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4.1-mini-2025-04-14", // Use the required vision model
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "What's happening in this video frame?" },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Frame}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        });

        frameAnalysis.push({
          frameNumber: frameFile.replace(/\D/g, ""),
          analysis: response.choices[0].message.content,
        });
      } catch (error) {
        console.error(`[DEBUG /api/video/analyze] Error analyzing frame ${frameFile}:`, error);
      }
    }

    // 10. Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("[DEBUG /api/video/analyze] Error cleaning up temp files:", error);
    }

    // 11. Generate a summary of the video content
    const frameTexts = frameAnalysis.map(frame => frame.analysis).join("\n\n");
    
    let videoSummary;
    try {
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini-2025-04-14", // Use the required vision model
        messages: [
          {
            role: "system",
            content: "You are an assistant that summarizes video content based on frame descriptions.",
          },
          {
            role: "user",
            content: `Summarize what's happening in this video based on these frame descriptions:\n\n${frameTexts}`,
          },
        ],
        max_tokens: 500,
      });
      
      videoSummary = summaryResponse.choices[0].message.content;
    } catch (error) {
      console.error("[DEBUG /api/video/analyze] Error generating video summary:", error);
      videoSummary = "Could not generate video summary.";
    }

    // 12. Return the results
    return NextResponse.json({
      success: true,
      videoUrl: uploadData?.path ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_VIDEO_BUCKET}/${uploadData.path}` : 
        null,
      frameCount: selectedFrames.length,
      frameAnalysis: frameAnalysis,
      summary: videoSummary,
    });
  } catch (error: any) {
    console.error("[DEBUG /api/video/analyze] Error processing video:", error);
    return NextResponse.json(
      { error: error?.message || (typeof error === 'string' ? error : "Error processing video") },
      { status: 500 }
    );
  }
}
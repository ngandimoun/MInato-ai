// FILE: app/api/video/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { appConfig } from "@/lib/config";
import { MEDIA_VIDEO_BUCKET } from "@/lib/constants";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { logger } from "../../../../memory-framework/config";
import { randomUUID } from "crypto";
import { VideoAnalysisService } from "@/lib/services/VideoAnalysisService"; // NEW IMPORT

const videoAnalysisService = new VideoAnalysisService();

export async function POST(req: NextRequest) {
  const logPrefix = "[API VideoAnalyze Route]";
  let userId: string | null = null;

  try {
    const cookieStore = cookies();
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user?.id) {
      logger.warn(`${logPrefix} Unauthorized access attempt. Error: ${authError?.message}`);
      return NextResponse.json({ error: "Unauthorized: Not authenticated" }, { status: 401 });
    }
    userId = user.id;
    if (!userId) {
      logger.error(`${logPrefix} userId is null after authentication. This should not happen.`);
      return NextResponse.json({ error: "User ID is missing after authentication." }, { status: 500 });
    }
    logger.info(`${logPrefix} Request from user: ${userId.substring(0,8)}`);

    const formData = await req.formData();
    const videoFile = formData.get("video") as File;
    const promptFromClient = formData.get("prompt") as string | null;

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }
    // Add size and type validation as before
    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska", "video/avi", "video/mov"];
    const isAllowed = allowedTypes.some(type => videoFile.type.startsWith(type));
    if (!isAllowed) {
      return NextResponse.json({ error: `Unsupported video type: ${videoFile.type}` }, { status: 415 });
    }
    if (videoFile.size > ((appConfig.openai as any)['maxVideoSizeBytes'] || 100 * 1024 * 1024)) {
        return NextResponse.json({ error: `Video file too large.` }, { status: 413 });
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    // Upload original video to Supabase bucket (optional for just analysis, but good for record)
    const supabaseAdmin = getSupabaseAdminClient();
    let publicVideoUrl: string | null = null;
    if (supabaseAdmin) {
      const ext = videoFile.type.split("/")[1] || "mp4";
      const videoFileNameForSupabase = `${userId}/${Date.now()}-${randomUUID()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from(MEDIA_VIDEO_BUCKET)
        .upload(videoFileNameForSupabase, videoBuffer, { contentType: videoFile.type, cacheControl: "3600" });
      if (uploadError) {
        logger.error(`${logPrefix} Error uploading video:`, uploadError);
      } else if (uploadData?.path) {
        publicVideoUrl = supabaseAdmin.storage.from(MEDIA_VIDEO_BUCKET).getPublicUrl(uploadData.path).data.publicUrl;
      }
    }

    const analysisResult = await videoAnalysisService.analyzeVideo(
      videoBuffer,
      videoFile.name,
      videoFile.type,
      promptFromClient,
      userId
    );

    if (analysisResult.error || !analysisResult.summary) {
      return NextResponse.json({
        success: false,
        videoUrl: publicVideoUrl,
        frameCount: analysisResult.frameCount,
        summary: "Could not generate video summary due to analysis error.",
        error: analysisResult.error || "Vision analysis returned no text.",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      videoUrl: publicVideoUrl,
      frameCount: analysisResult.frameCount,
      summary: analysisResult.summary,
      debugUsage: analysisResult.usage,
    });

  } catch (error: any) {
    const userIdSuffix = userId ? userId.substring(0,8) + "..." : "UNKNOWN";
    logger.error(`${logPrefix} Error processing video for user ${userIdSuffix}:`, error.message, error.stack);
    return NextResponse.json({ error: error?.message || "Error processing video" }, { status: 500 });
  }
  // Note: Temp file cleanup is now handled within VideoAnalysisService
}
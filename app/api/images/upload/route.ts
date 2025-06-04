import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { MEDIA_UPLOAD_BUCKET } from "@/lib/constants";
import { logger } from "@/memory-framework/config";
import { randomUUID } from "crypto";

// Maximum file size for images (5MB)
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const logPrefix = "[API ImageUpload]";
  const cookieStore = cookies();
  let userId: string | null = null;

  try {
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError) {
      logger.error(`${logPrefix} Auth Supabase getUser error:`, userError.message);
      throw new Error("Authentication error");
    }
    if (!user?.id) {
      logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
      throw new Error("Unauthorized");
    }
    userId = user.id;
    logger.info(`${logPrefix} Image upload request from user: ${userId ? userId.substring(0, 8) : 'UNKNOWN'}...`);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      logger.warn(`${logPrefix} Invalid file type for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}: ${file.name}, ${file.type}`);
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 415 });
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      logger.warn(`${logPrefix} File too large for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}: ${file.name}, ${file.size} bytes`);
      return NextResponse.json({ error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB` }, { status: 413 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); // Sanitize
    const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const filePath = `images/${userId}/${uniqueFileName}`; // User-specific folder for images

    if (!supabaseAdmin) {
      logger.error(`${logPrefix} Supabase admin client not available for storage operation.`);
      throw new Error("Storage service misconfiguration.");
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(MEDIA_UPLOAD_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error(`${logPrefix} Supabase storage upload failed for ${filePath} (User: ${userId ? userId.substring(0,8) : 'UNKNOWN'}):`, uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(MEDIA_UPLOAD_BUCKET)
      .getPublicUrl(filePath);

    logger.info(`${logPrefix} Image '${originalFileName}' uploaded successfully to '${filePath}' for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);

    return NextResponse.json({
      success: true,
      fileId: filePath,
      fileName: originalFileName,
      fileType: file.type,
      size: file.size,
      publicUrl: publicUrl,
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error during image upload for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
} 
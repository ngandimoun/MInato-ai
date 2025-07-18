import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { checkQuota, incrementMonthlyUsage, checkAndHandleProExpiration } from '@/lib/middleware/subscription-guards';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ VÉRIFICATION AUTOMATIQUE: Contrôler l'expiration Pro avant de traiter la requête
    const { expired, updated } = await checkAndHandleProExpiration(session.user.id);
    
    if (expired) {
      console.warn(`User attempted to access recordings upload with expired Pro subscription: ${session.user.id.substring(0, 8)}`);
      return NextResponse.json({ 
        error: 'Subscription expired',
        code: 'subscription_expired',
        message: 'Your Pro subscription has expired. Please renew to continue accessing premium features.'
      }, { status: 403 });
    }

    // Check subscription quota for recordings
    const quotaCheck = await checkQuota(req, 'recordings');
    if (!quotaCheck.success) {
      return quotaCheck.response!;
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)` },
        { status: 400 }
      );
    }

    // Generate a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError, data: uploadData } = await supabase
      .storage
      .from("audio-recordings")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading file to storage:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    if (!uploadData || !uploadData.path) {
      return NextResponse.json(
        { error: "File uploaded but path not returned" },
        { status: 500 }
      );
    }

    // Increment monthly usage for recordings
    await incrementMonthlyUsage(session.user.id, 'recordings');

    return NextResponse.json({ 
      filePath: fileName, // Return just the filename, not the full path
      size: file.size,
      type: file.type
    });
  } catch (error: any) {
    console.error("Error processing file upload:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
} 
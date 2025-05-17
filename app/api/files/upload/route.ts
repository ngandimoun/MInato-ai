// FILE: app/api/files/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { MEDIA_UPLOAD_BUCKET, MAX_CSV_XLSX_SIZE_BYTES } from "@/lib/constants"; // MAX_CSV_XLSX_SIZE_BYTES à définir
import { logger } from "@/memory-framework/config";
import { randomUUID } from "crypto";

// Définir la constante si elle n'existe pas déjà dans lib/constants.ts
// const MAX_CSV_XLSX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB Example

export async function POST(req: NextRequest) {
  const logPrefix = "[API FileUpload]";
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
    logger.info(`${logPrefix} Upload request from user: ${userId ? userId.substring(0, 8) : 'UNKNOWN'}...`);

    const formData = await req.formData();
    // TypeScript: fallback si File n'est pas reconnu (Next.js API route)
    type AnyFile = File | (Blob & { name?: string; size?: number; type?: string });
    const file = formData.get("file") as AnyFile | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    // Vérifier la présence des propriétés nécessaires
    if (typeof file.size !== 'number' || typeof file.type !== 'string' || typeof file.name !== 'string') {
      return NextResponse.json({ error: "Invalid file object received." }, { status: 400 });
    }
    if (file.size > MAX_CSV_XLSX_SIZE_BYTES) {
      logger.warn(`${logPrefix} File too large for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}: ${file.name}, ${file.size} bytes`);
      return NextResponse.json({ error: `File too large. Max ${MAX_CSV_XLSX_SIZE_BYTES / (1024*1024)}MB` }, { status: 413 });
    }
    // Valider le type de fichier (simplifié ici, pourrait être plus robuste)
    const allowedMimeTypes = [
        "text/csv",
        "application/vnd.ms-excel", // .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
    ];
    if (!allowedMimeTypes.includes(file.type)) {
        logger.warn(`${logPrefix} Unsupported file type for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}: ${file.name}, ${file.type}`);
        return NextResponse.json({ error: `Unsupported file type: ${file.type}. Allowed: CSV, XLS, XLSX.`}, { status: 415 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); // Sanitize
    const fileExtension = originalFileName.split('.').pop() || 'bin';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const filePath = `data_uploads/${userId}/${uniqueFileName}`; // User-specific folder

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

    logger.info(`${logPrefix} File '${originalFileName}' uploaded successfully to '${filePath}' for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);

    return NextResponse.json({
      success: true,
      fileId: filePath,
      fileName: originalFileName,
      fileType: file.type,
      size: file.size,
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error during file upload for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

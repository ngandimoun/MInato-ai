/**
 * Insights Upload API Route
 * Handles document uploads for the insights feature
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { getInsightsService } from "@/lib/services/InsightsService";
import { randomUUID } from "crypto";

// Maximum file size for documents (50MB)
const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;

// Allowed document types
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/json'
];

export async function POST(req: NextRequest) {
  const logPrefix = "[API Insights Upload]";
  const cookieStore = cookies();
  let userId: string | null = null;

  try {
    // Authenticate user
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError) {
      logger.error(`${logPrefix} Auth error:`, userError.message);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    if (!user?.id) {
      logger.warn(`${logPrefix} No authenticated user found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    userId = user.id;
    logger.info(`${logPrefix} Upload request from user: ${userId.substring(0, 8)}...`);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const categories = formData.get("categories") as string | null;
    const tags = formData.get("tags") as string | null;
    const batchTitle = formData.get("batchTitle") as string | null;
    const batchDescription = formData.get("batchDescription") as string | null;
    const batchIndex = formData.get("batchIndex") as string | null;
    const batchTotal = formData.get("batchTotal") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      logger.warn(`${logPrefix} File too large: ${file.name}, ${file.size} bytes`);
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB` 
      }, { status: 413 });
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      logger.warn(`${logPrefix} Unsupported file type: ${file.type}`);
      return NextResponse.json({ 
        error: `Unsupported file type: ${file.type}` 
      }, { status: 415 });
    }

    // Initialize insights service
    const insightsService = getInsightsService();

    // Upload file to storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await insightsService.uploadFile(
      userId!,
      file.name,
      fileBuffer,
      file.type
    );

    if (!uploadResult.success) {
      logger.error(`${logPrefix} File upload failed:`, uploadResult.error);
      return NextResponse.json({ 
        error: `File upload failed: ${uploadResult.error}` 
      }, { status: 500 });
    }

    // Create document record
    const document = await insightsService.createDocument({
      user_id: userId!,
      title: title || file.name,
      original_filename: file.name,
      file_type: file.type,
      file_size: file.size,
      content_type: 'document',
      description: description || undefined,
      categories: categories ? categories.split(',').map(c => c.trim()) : [],
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      batch_context: batchTitle || batchDescription ? {
        batch_title: batchTitle || undefined,
        batch_description: batchDescription || undefined,
        batch_index: batchIndex ? parseInt(batchIndex) : undefined,
        batch_total: batchTotal ? parseInt(batchTotal) : undefined
      } : undefined
    });

    if (!document) {
      logger.error(`${logPrefix} Failed to create document record`);
      return NextResponse.json({ 
        error: "Failed to create document record" 
      }, { status: 500 });
    }

    // Update document with storage path
    await insightsService.updateDocument(document.id, {
      storage_path: uploadResult.path
    });

    logger.info(`${logPrefix} Document uploaded successfully: ${document.id}`);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        filename: document.original_filename,
        file_type: document.file_type,
        file_size: document.file_size,
        status: document.processing_status,
        created_at: document.created_at
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error during upload:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
}

// GET method to retrieve user documents
export async function GET(req: NextRequest) {
  const logPrefix = "[API Insights Upload GET]";
  const cookieStore = cookies();

  try {
    // Authenticate user
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status')?.split(',');
    const categories = searchParams.get('categories')?.split(',');

    // Get documents
    const insightsService = getInsightsService();
    const documents = await insightsService.getUserDocuments({
      user_id: userId,
      limit,
      offset,
      status,
      categories
    });

    logger.info(`${logPrefix} Retrieved ${documents.length} documents for user: ${userId.substring(0, 8)}`);

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.original_filename,
        file_type: doc.file_type,
        file_size: doc.file_size,
        status: doc.processing_status,
        categories: doc.categories,
        tags: doc.tags,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      })),
      total: documents.length
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving documents:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 
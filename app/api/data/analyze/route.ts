// // FILE: app/api/data/analyze/route.ts (CORRECTED)

// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import { cookies } from "next/headers";
// import { supabaseAdmin } from "@/lib/supabaseClient";
// import { logger } from "@/memory-framework/config";
// import { MEDIA_UPLOAD_BUCKET, RATE_LIMIT_ID_DATA_ANALYSIS } from "@/lib/constants"; // *** IMPORT CONSTANT ***
// import { randomUUID } from "crypto";
// import path from "path";
// import { executeN8nWorkflowSync } from "@/lib/n8nClient";
// import { DataAnalysisResponse } from "@/lib/types";
// import { checkRateLimit } from "@/lib/rate-limiter";
// // Removed unused import: import { RATE_LIMIT_ID_CHAT } from "@/lib/constants";

// const ALLOWED_ANALYSIS_TYPES: string | string[]: string | string[] = [ /* ... types ... */ ];
// const MAX_ANALYSIS_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// const DATA_ANALYSIS_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_DATA_ANALYSIS;

// export async function POST(req: NextRequest) {
//   const logPrefix = "[API DataAnalyze]";
//   const cookieStore = cookies();
//   let userId: string | null = null;
//   let uploadPath: string | null = null;
//   const analysisSessionId = `data-${randomUUID()}`;

//   try {
//     // --- Authentication ---
//     try {
//         const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
//         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//         if (sessionError) throw sessionError;
//         if (!session?.user?.id) {
//             logger.warn(`${logPrefix} Auth] No active Supabase session found.`);
//             return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//         }
//         userId = session.user.id;
//         logger.info(`${logPrefix} Request ${analysisSessionId} received from authenticated Supabase user: ${userId.substring(0, 8)}...`);
//     } catch (authError: any) {
//         logger.error(`${logPrefix} Auth Error checking Supabase session:`, authError);
//         return NextResponse.json({ error: "Authentication error" }, { status: 500 });
//     }

//     // --- n8n Config Check ---
//     if (!DATA_ANALYSIS_WORKFLOW_ID) {
//         logger.error(`${logPrefix} N8N_WORKFLOW_ID_DATA_ANALYSIS not configured.`);
//         return NextResponse.json({ error: "Data analysis workflow not configured on server" }, { status: 500 });
//     }
//     if (!process.env.N8N_URL || !process.env.N8N_API_KEY) {
//         logger.error(`${logPrefix} N8N_URL or N8N_API_KEY not configured.`);
//         return NextResponse.json({ error: "n8n connection not configured on server." }, { status: 500 });
//     }

//     // --- Rate Limiting ---
//     // *** USE IMPORTED CONSTANT ***
//     const { success: rateLimitSuccess } = await checkRateLimit(userId, RATE_LIMIT_ID_DATA_ANALYSIS);
//     if (!rateLimitSuccess) {
//         logger.warn(`${logPrefix} Rate limit exceeded for ${RATE_LIMIT_ID_DATA_ANALYSIS} by user ${userId.substring(0, 8)}`);
//         return NextResponse.json({ error: "Rate limit exceeded for data analysis." }, { status: 429 });
//     }

//     // --- Request Validation & File Handling ---
//     if (!req.headers.get("content-type")?.startsWith("multipart/form-data"))
//       return NextResponse.json({ error: "Invalid Content-Type. Expected multipart/form-data." }, { status: 400 });
//     const formData = await req.formData();
//     const dataFile = formData.get("dataFile");
//     const userGoal = formData.get("userGoal");

//     if (!dataFile || !(dataFile instanceof Blob)) return NextResponse.json({ error: 'Missing or invalid "dataFile" part.' }, { status: 400 });
//     if (dataFile.size === 0) return NextResponse.json({ error: "Data file is empty." }, { status: 400 });
//     if (dataFile.size > MAX_ANALYSIS_FILE_SIZE_BYTES) {
//       logger.warn(`${logPrefix} Data file too large (${dataFile.size} bytes) for user ${userId.substring(0, 8)}`);
//       return NextResponse.json({ error: `Data file too large. Max size: ${MAX_ANALYSIS_FILE_SIZE_BYTES / (1024 * 1024)}MB.` }, { status: 413 });
//     }

//     const detectedMimeType = dataFile.type;
//     if (!ALLOWED_ANALYSIS_TYPES.includes(detectedMimeType)) {
//       logger.warn(`${logPrefix} Unsupported data file type (${detectedMimeType}) for user ${userId.substring(0, 8)}`);
//       return NextResponse.json({ error: `Unsupported file type: ${detectedMimeType}. Allowed: CSV, XLSX.` }, { status: 415 });
//     }

//     const originalFilename = dataFile instanceof File ? dataFile.name.replace(/[^a-zA-Z0-9._-]/g, "_") : `data-${randomUUID()}.bin`;
//     const fileBuffer = Buffer.from(await dataFile.arrayBuffer());
//     logger.info(`${logPrefix} Received data file: ${originalFilename} (${dataFile.size} bytes) for user ${userId.substring(0, 8)}`);

//     // --- Upload File to Storage ---
//     if (!supabaseAdmin) throw new Error("Storage admin client not available.");
//     const fileExt = path.extname(originalFilename).toLowerCase() || `.${detectedMimeType.split("/")[1] || "tmp"}`;
//     const uploadFileName = `${analysisSessionId}${fileExt}`;
//     uploadPath = `analysis_uploads/${userId}/${uploadFileName}`;
//     logger.debug(`${logPrefix} Uploading data file to Supabase path: ${uploadPath}`);
//     const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from(MEDIA_UPLOAD_BUCKET).upload(uploadPath, fileBuffer, { contentType: detectedMimeType, upsert: false });
//     if (uploadError || !uploadData?.path) {
//       logger.error(`${logPrefix} Supabase upload error for analysis file: ${uploadError?.message}`, uploadError);
//       throw new Error(`Storage upload failed: ${uploadError?.message || "Unknown error"}`);
//     }
//     const fileId = uploadData.path;
//     logger.debug(`${logPrefix} Upload successful to ${fileId}`);

//     // --- Trigger n8n Data Analysis Workflow ---
//     const n8nPayload = { userId: userId, analysisSessionId: analysisSessionId, fileId: fileId, fileName: originalFilename, fileType: fileExt === ".csv" ? "csv" : "xlsx", userGoal: typeof userGoal === "string" ? userGoal : null };
//     logger.info(`${logPrefix} Triggering n8n data analysis workflow (${DATA_ANALYSIS_WORKFLOW_ID}) for user ${userId.substring(0, 8)}, session ${analysisSessionId}...`);
//     const n8nResult = await executeN8nWorkflowSync( DATA_ANALYSIS_WORKFLOW_ID, n8nPayload, 120000 );

//     // --- Handle n8n Result ---
//     if (!n8nResult.success || n8nResult.error) {
//       const errorMsg = `n8n data analysis workflow failed: ${n8nResult.error || "Unknown n8n execution error"}`;
//       logger.error(`${logPrefix} ${errorMsg} (Execution ID: ${n8nResult.executionId || 'N/A'})`);
//       return NextResponse.json({ error: errorMsg, analysisId: n8nResult.executionId }, { status: 502 });
//     }
//     logger.info(`${logPrefix} n8n data analysis workflow completed successfully for user ${userId.substring(0, 8)}. (Execution ID: ${n8nResult.executionId || 'N/A'})`);

//     // --- Format and Return Response ---
//     const analysisResponseData = n8nResult.data as Partial<DataAnalysisResponse>;
//     if (!analysisResponseData || typeof analysisResponseData !== 'object') {
//       logger.error(`${logPrefix} Invalid response structure received from n8n workflow.`);
//       return NextResponse.json({ error: "Received invalid analysis results from processing service." }, { status: 500 });
//     }

//     const finalResponse: DataAnalysisResponse = {
//       sessionId: analysisSessionId,
//       analysisId: n8nResult.executionId || `n8n-${randomUUID()}`,
//       status: analysisResponseData.status || "complete",
//       message: analysisResponseData.message || "Analysis complete.",
//       analysisResults: analysisResponseData.analysisResults || [],
//       dataProfile: analysisResponseData.dataProfile || undefined,
//       error: analysisResponseData.error || null,
//       debugInfo: { n8nExecutionId: n8nResult.executionId || null },
//     };

//     return NextResponse.json(finalResponse);

//   } catch (error: any) {
//     logger.error(`${logPrefix} Error processing data analysis request for user ${userId ? userId.substring(0, 8) + "..." : "UNKNOWN"}:`, error.message, error.stack);
//     if (uploadPath && supabaseAdmin) {
//       const finalUploadPath = uploadPath;
//       logger.warn(`${logPrefix} Attempting cleanup of ${finalUploadPath} after error.`);
//       supabaseAdmin.storage.from(MEDIA_UPLOAD_BUCKET).remove([finalUploadPath])
//         .catch((cleanupError) => logger.error(`${logPrefix} Error during failed cleanup ${finalUploadPath}:`, cleanupError));
//     }
//     return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
//   } finally {
//     logger.debug(`${logPrefix} Data analysis request processing finished for user ${userId ? userId.substring(0, 8) + "..." : "UNKNOWN"}. Session: ${analysisSessionId}`);
//   }
// }
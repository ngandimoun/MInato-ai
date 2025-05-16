// // FILE: app/api/realtime/analyze_visual/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createServerSupabaseClient } from "@/lib/supabase/server"; // Use createServerSupabaseClient
// import { cookies } from "next/headers";
// import { checkRateLimit } from "@/lib/rate-limiter";
// import {
//   RATE_LIMIT_ID_VISUAL_ANALYSIS_REALTIME,
//   MAX_IMAGE_SIZE_BYTES, // Ensure this is appropriate for base64 encoded data
//   ALLOWED_IMAGE_TYPES,
// } from "@/lib/constants";
// import { appConfig } from "@/lib/config";
// // Use generateVisionCompletion from llm_clients which uses client.responses.create
// import { generateVisionCompletion } from "@/lib/providers/llm_clients";
// import {
//   ChatMessage,
//   ChatMessageContentPartImageUrl,
//   VisualAnalysisRequest, // Type for incoming request body
//   VisualAnalysisResponse, // Type for outgoing response body
// } from "@/lib/types/index";
// import { logger } from "../../../../memory-framework/config";
// import { MEDIA_UPLOAD_BUCKET } from "@/lib/constants"; // For constructing image URLs if needed
// import { supabaseAdmin } from "@/lib/supabaseClient"; // For fetching from storage if needed

// export async function POST(req: NextRequest) {
//   const logPrefix = "[API AnalyzeVisual]";
//   const cookieStore = cookies();
//   let userId: string | null = null;

//   try {
//     // --- Authentication ---
//     const supabase = createServerSupabaseClient();
//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser();
//     if (userError)
//       logger.error(
//         `${logPrefix} Auth] Supabase getUser() error:`,
//         userError.message
//       );
//     if (!user) {
//       logger.warn(`${logPrefix} Auth] No active Supabase user.`);
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     userId = user.id;
//     logger.info(`${logPrefix} Request from user: ${userId.substring(0, 8)}...`);

//     // --- Rate Limiting ---
//     const { success: rateLimitSuccess } = await checkRateLimit(
//       userId,
//       RATE_LIMIT_ID_VISUAL_ANALYSIS_REALTIME
//     );
//     if (!rateLimitSuccess) {
//       logger.warn(
//         `${logPrefix} Rate limit exceeded for user ${userId.substring(0, 8)}`
//       );
//       return NextResponse.json(
//         { error: "Visual analysis rate limit exceeded" },
//         { status: 429 }
//       );
//     }

//     // --- Request Body Parsing & Validation ---
//     let requestData: VisualAnalysisRequest;
//     try {
//       requestData = await req.json();
//       if (
//         !Array.isArray(requestData.mediaFrames) ||
//         requestData.mediaFrames.length === 0
//       ) {
//         return NextResponse.json(
//           { error: "Missing or empty mediaFrames array." },
//           { status: 400 }
//         );
//       }
//       for (const frame of requestData.mediaFrames) {
//         if (
//           !frame.mimeType?.startsWith("image/") ||
//           !frame.data ||
//           typeof frame.data !== "string"
//         ) {
//           logger.warn(
//             `${logPrefix} Invalid frame structure: Missing mimeType or data. User: ${userId.substring(
//               0,
//               8
//             )}`,
//             frame
//           );
//           return NextResponse.json(
//             {
//               error:
//                 "Invalid frame structure (mimeType 'image/*' and base64 data string required).",
//             },
//             { status: 400 }
//           );
//         }
//         if (!ALLOWED_IMAGE_TYPES.includes(frame.mimeType)) {
//           logger.warn(
//             `${logPrefix} Unsupported image type (${
//               frame.mimeType
//             }). User: ${userId.substring(0, 8)}.`
//           );
//           return NextResponse.json(
//             {
//               error: `Unsupported image type: ${
//                 frame.mimeType
//               }. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
//             },
//             { status: 415 }
//           );
//         }
//         // Approximate check, actual base64 string is ~33% larger than binary
//         if (frame.data.length * 0.75 > MAX_IMAGE_SIZE_BYTES) {
//           const frameSizeMB = (
//             (frame.data.length * 0.75) /
//             (1024 * 1024)
//           ).toFixed(2);
//           logger.warn(
//             `${logPrefix} Frame too large (${frameSizeMB}MB). User: ${userId.substring(
//               0,
//               8
//             )}.`
//           );
//           return NextResponse.json(
//             {
//               error: `Image frame too large. Max size approx ${
//                 MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
//               }MB.`,
//             },
//             { status: 413 }
//           );
//         }
//       }
//     } catch (e: any) {
//       logger.error(
//         `${logPrefix} Invalid JSON body. User: ${userId.substring(0, 8)}:`,
//         e.message
//       );
//       return NextResponse.json(
//         { error: `Invalid JSON request body: ${e.message}` },
//         { status: 400 }
//       );
//     }

//     const visionModelToUse = appConfig.llm.visionModel;
//     const prompt =
//       requestData.prompt ||
//       "Describe what you see in this sequence of images from a live camera feed. Be brief and natural, as if narrating observations during a conversation.";

//     // Construct ChatMessage for generateVisionCompletion
//     const imageContentParts: ChatMessageContentPartImageUrl[] =
//       requestData.mediaFrames.map((frame) => ({
//         type: "image_url" as const,
//         image_url: {
//           url: `data:${frame.mimeType};base64,${frame.data}`, // Assuming data is already base64
//           detail: appConfig.openai.visionDetail,
//         },
//       }));

//     const messageForVision: ChatMessage = {
//       role: "user",
//       content: [{ type: "text", text: prompt }, ...imageContentParts],
//       timestamp: Date.now(),
//       experimental_attachments: undefined,
//     };

//     logger.info(
//       `${logPrefix} Sending ${
//         imageContentParts.length
//       } frames to vision model (${visionModelToUse}). User: ${userId.substring(
//         0,
//         8
//       )}`
//     );
//     const start = Date.now();
//     const visionResult = await generateVisionCompletion(
//       [messageForVision], // Pass as an array of ChatMessage
//       visionModelToUse,
//       appConfig.openai.maxVisionTokens, // Max output tokens for vision
//       userId
//     );
//     const duration = Date.now() - start;

//     if (visionResult.error || visionResult.text === null) {
//       // Check for null text as well
//       const errorDetail =
//         visionResult.error || "Vision model provided no description.";
//       logger.error(
//         `${logPrefix} Vision analysis failed. User: ${userId.substring(
//           0,
//           8
//         )}: ${errorDetail}`
//       );
//       return NextResponse.json(
//         { error: `Vision analysis failed: ${errorDetail}` },
//         { status: 500 }
//       );
//     }

//     const description = visionResult.text.trim();
//     logger.info(
//       `${logPrefix} Vision analysis successful (${duration}ms). User: ${userId.substring(
//         0,
//         8
//       )}. Desc: "${description.substring(0, 70)}..."`
//     );
//     logger.debug(
//       `${logPrefix} Vision usage: ${JSON.stringify(visionResult.usage)}`
//     );

//     const responsePayload: VisualAnalysisResponse = {
//       description: description,
//     };
//     return NextResponse.json(responsePayload);
//   } catch (error: any) {
//     const userIdSuffix = userId ? userId.substring(0, 8) + "..." : "UNKNOWN";
//     logger.error(
//       `${logPrefix} Error during vision analysis. User ${userIdSuffix}:`,
//       error.message,
//       error.stack
//     );
//     return NextResponse.json(
//       { error: `An error occurred: ${error.message}` },
//       { status: 500 }
//     );
//   } finally {
//     const userIdSuffix = userId
//       ? userId.substring(0, 8) + "..."
//       : "UNKNOWN_FINALLY";
//     logger.debug(
//       `${logPrefix} Request processing finished for user ${userIdSuffix}.`
//     );
//   }
// }

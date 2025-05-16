// // FILE: app/api/messages/[messageId]/route.ts
// // (Content from finalcodebase.txt - verified)
// import { NextRequest, NextResponse } from "next/server";
// // import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"; // Remove the old import
// import { cookies } from "next/headers";
// import { CompanionCoreMemory } from "@/memory-framework/core/CompanionCoreMemory";
// import { logger } from "@/memory-framework/config";
// import {
//   ChatMessage,
//   ChatMessageContentPart,
//   StoredMemoryUnit,
// } from "@/lib/types"; // Ensure StoredMemoryUnit is imported if used for type casting
// import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

// interface RouteParams {
//   params: { messageId: string };
// }

// // Initialize Memory Framework Instance (Singleton Pattern)
// let memoryFrameworkInstance: CompanionCoreMemory | null = null;
// function getMemoryFramework(): CompanionCoreMemory {
//   if (!memoryFrameworkInstance) {
//     logger.info(
//       "[API Message PUT] Initializing CompanionCoreMemory instance..."
//     );
//     memoryFrameworkInstance = new CompanionCoreMemory();
//   }
//   return memoryFrameworkInstance;
// }

// export async function PUT(req: NextRequest, { params }: RouteParams) {
//   const logPrefix = "[API Message PUT]";
//   const { messageId } = params;
//   const cookieStore = cookies();
//   let userId: string;

//   try {
//     const supabase = createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
//     const { data: { user }, error } = await supabase.auth.getUser();

//     if (error) {
//       logger.error(`${logPrefix} Auth Supabase getUser error:`, error.message);
//       throw new Error("Authentication failed");
//     }
//     if (!user?.id) {
//       logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
//       throw new Error("Unauthorized");
//     }
//     userId = user.id;
//   } catch (authError: any) {
//     logger.error(`${logPrefix} Auth check failed:`, authError.message);
//     const status = authError.message === "Unauthorized" ? 401 : 500;
//     return NextResponse.json({ error: authError.message }, { status });
//   }

//   if (!messageId) {
//     logger.warn(
//       `${logPrefix} Missing messageId parameter for user ${userId.substring(
//         0,
//         8
//       )}`
//     );
//     return NextResponse.json(
//       { error: "Missing messageId parameter" },
//       { status: 400 }
//     );
//   }
//   logger.info(
//     `${logPrefix} Request to edit msg ${messageId} from user: ${userId.substring(
//       0,
//       8
//     )}...`
//   );

//   let newContent: string | ChatMessage["content"]; // Allow string or array
//   try {
//     const body = await req.json();
//     if (!body.hasOwnProperty("newContent"))
//       throw new Error("Missing 'newContent' in request body.");
//     newContent = body.newContent;
//     if (typeof newContent !== "string" && !Array.isArray(newContent))
//       throw new Error("Invalid 'newContent' format. Must be string or array.");
//     logger.info(
//       `${logPrefix} Attempting edit of msg ${messageId} for user ${userId.substring(
//         0,
//         8
//       )}`
//     );
//   } catch (e: any) {
//     logger.error(
//       `${logPrefix} Invalid request body for user ${userId.substring(
//         0,
//         8
//       )} editing message ${messageId}:`,
//       e.message
//     );
//     return NextResponse.json(
//       { error: `Invalid request body: ${e.message}` },
//       { status: 400 }
//     );
//   }

//   try {
//     const memoryFramework = getMemoryFramework();
//     const existingMemory = await memoryFramework.fetchMemoryById(messageId);
//     if (!existingMemory) {
//       logger.warn(`${logPrefix} Message ${messageId} not found.`);
//       return NextResponse.json(
//         { error: "Message not found." },
//         { status: 404 }
//       );
//     }
//     if (existingMemory.user_id !== userId) {
//       logger.warn(
//         `${logPrefix} User ${userId.substring(
//           0,
//           8
//         )} attempted edit msg ${messageId} owned by ${existingMemory.user_id.substring(
//           0,
//           8
//         )}.`
//       );
//       return NextResponse.json(
//         { error: "Forbidden: You can only edit your own messages." },
//         { status: 403 }
//       );
//     }
//     // Use the role from the memory unit directly
//     if (existingMemory.role !== "user") {
//       logger.warn(
//         `${logPrefix} Attempt to edit non-user message ${messageId}. Role: ${existingMemory.role}`
//       );
//       return NextResponse.json(
//         { error: "Forbidden: Only user messages can be edited." },
//         { status: 403 }
//       );
//     }

//     // Update content, preserve existing metadata, ensure role isn't changed inadvertently
//     const updatePayload: Partial<
//       Omit<
//         StoredMemoryUnit,
//         "memory_id" | "user_id" | "run_id" | "created_at" | "updated_at"
//       >
//     > = {
//       content:
//         typeof newContent === "string"
//           ? newContent
//           : JSON.stringify(newContent), // Store content (stringify array)
//       // Do NOT pass metadata/role/etc. unless you explicitly want to allow editing those too
//     };
//     const updatedMemory = await memoryFramework.update_memory(
//       messageId,
//       updatePayload
//     );
//     if (!updatedMemory) {
//       logger.error(
//         `${logPrefix} Failed to update memory for message ${messageId}.`
//       );
//       throw new Error("Memory update failed.");
//     }
//     logger.info(
//       `${logPrefix} Message ${messageId} updated successfully for user ${userId.substring(
//         0,
//         8
//       )}.`
//     );

//     // Parse content back for response consistency
//     let parsedContent: string | ChatMessageContentPart[];
//     try {
//       if (typeof updatedMemory.content === "string") {
//         parsedContent = JSON.parse(updatedMemory.content);
//         if (!Array.isArray(parsedContent)) throw new Error();
//       } else {
//         parsedContent = updatedMemory.content;
//       }
//     } catch {
//       parsedContent = updatedMemory.content as string;
//     } // Fallback to string if not parsable JSON array
//     const updatedChatMessage: ChatMessage = {
//       messageId: updatedMemory.memory_id,
//       role: "user",
//       content: parsedContent,
//       timestamp: updatedMemory.updated_at,
//       id: updatedMemory.memory_id,
//       annotations: undefined,
//       clarificationQuestion: null,
//       experimental_attachments: undefined
//     }; // Use messageId and id
//     return NextResponse.json({
//       success: true,
//       updatedMessage: updatedChatMessage,
//     });
//   } catch (error: any) {
//     logger.error(
//       `${logPrefix} Error editing message ${messageId} for user ${userId.substring(
//         0,
//         8
//       )}:`,
//       error
//     );
//     return NextResponse.json(
//       { error: `Internal Server Error: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(request: NextRequest, { params }: { params: { messageId: string } }) {
//   const logPrefix = `[API Message DELETE ${params.messageId}]`;
//   const cookieStore = cookies();
//   const supabase = createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
//   let userId: string;

//   try {
//     const { data: { user }, error } = await supabase.auth.getUser();
//     if (error) {
//       logger.error(`${logPrefix} Auth Supabase getUser error:`, error.message);
//       throw new Error("Authentication failed");
//     }
//     if (!user?.id) {
//       logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
//       throw new Error("Unauthorized");
//     }
//     userId = user.id;
//   } catch (authError: any) {
//       logger.error(`${logPrefix} Auth check failed:`, authError.message);
//       const status = authError.message === "Unauthorized" ? 401 : 500;
//       return NextResponse.json({ error: authError.message }, { status });
//   }

//   logger.info(`${logPrefix} Request for user: ${userId.substring(0, 8)}`);

//   // ... rest of DELETE handler, uses userId ...
// }

// export async function POST(request: NextRequest, { params }: { params: { messageId: string } }) {
//   const logPrefix = `[API Message POST ${params.messageId}]`;
//   const cookieStore = cookies();
//   const supabase = createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
//   let userId: string;

//   try {
//     const { data: { user }, error } = await supabase.auth.getUser();
//     if (error) {
//       logger.error(`${logPrefix} Auth Supabase getUser error:`, error.message);
//       throw new Error("Authentication failed");
//     }
//     if (!user?.id) {
//       logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
//       throw new Error("Unauthorized");
//     }
//     userId = user.id;
//   } catch (authError: any) {
//       logger.error(`${logPrefix} Auth check failed:`, authError.message);
//       const status = authError.message === "Unauthorized" ? 401 : 500;
//       return NextResponse.json({ error: authError.message }, { status });
//   }
//   logger.info(`${logPrefix} Request for user: ${userId.substring(0, 8)}`);

//   // ... rest of POST handler, uses userId ...
// }

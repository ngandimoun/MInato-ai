// // FILE: app/api/messages/[messageId]/like/route.ts
// // (Content from finalcodebase.txt - verified)
// import { NextRequest, NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { supabase } from "@/lib/supabaseClient";
// import { logger } from "@/memory-framework/config";

// interface RouteParams {
//   params: { messageId: string };
// }

// export async function POST(req: NextRequest, { params }: RouteParams) {
//   const logPrefix = "[API Message Like POST]";
//   const { messageId } = params;
//   const cookieStore = cookies();
//   let userId: string | null = null;
//   try {
//     const {
//       data: { session },
//       error: sessionError,
//     } = await supabase.auth.getSession();
//     if (sessionError) throw sessionError;
//     if (!session?.user?.id) {
//       logger.warn(`${logPrefix} Auth] No active Supabase session found.`);
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     userId = session.user.id;
//   } catch (authError: any) {
//     logger.error(`${logPrefix} Auth Error:`, authError);
//     return NextResponse.json(
//       { error: "Authentication error" },
//       { status: 500 }
//     );
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
//     `${logPrefix} Request to toggle like for msg ${messageId} from user: ${userId.substring(
//       0,
//       8
//     )}...`
//   );
//   if (!supabase) {
//     logger.error(`${logPrefix} Supabase admin client unavailable.`);
//     return NextResponse.json(
//       { error: "Database connection error" },
//       { status: 500 }
//     );
//   }

//   try {
//     const { data: existingLike, error: checkError } = await supabase
//       .from("message_likes")
//       .select("id")
//       .eq("user_id", userId)
//       .eq("message_id", messageId)
//       .maybeSingle();
//     if (checkError) {
//       logger.error(
//         `${logPrefix} Error checking like for user ${userId.substring(
//           0,
//           8
//         )}, msg ${messageId}:`,
//         checkError
//       );
//       throw new Error("Database error checking like status.");
//     }
//     let isLikedNow: boolean;
//     if (existingLike) {
//       logger.debug(
//         `${logPrefix} Message ${messageId} already liked by user ${userId.substring(
//           0,
//           8
//         )}. Unliking...`
//       );
//       const { error: deleteError } = await supabase
//         .from("message_likes")
//         .delete()
//         .match({ id: existingLike.id });
//       if (deleteError) {
//         logger.error(
//           `${logPrefix} Error deleting like for user ${userId.substring(
//             0,
//             8
//           )}, msg ${messageId}:`,
//           deleteError
//         );
//         throw new Error("Database error removing like.");
//       }
//       isLikedNow = false;
//       logger.info(
//         `${logPrefix} Message ${messageId} unliked by user ${userId.substring(
//           0,
//           8
//         )}.`
//       );
//     } else {
//       logger.debug(
//         `${logPrefix} Message ${messageId} not liked by user ${userId.substring(
//           0,
//           8
//         )}. Liking...`
//       );
//       const { error: insertError } = await supabase
//         .from("message_likes")
//         .insert({ user_id: userId, message_id: messageId });
//       if (insertError) {
//         logger.error(
//           `${logPrefix} Error inserting like for user ${userId.substring(
//             0,
//             8
//           )}, msg ${messageId}:`,
//           insertError
//         );
//         if (insertError.message.includes("violates foreign key constraint"))
//           return NextResponse.json(
//             { error: "Cannot like message: Message not found." },
//             { status: 404 }
//           );
//         throw new Error("Database error adding like.");
//       }
//       isLikedNow = true;
//       logger.info(
//         `${logPrefix} Message ${messageId} liked by user ${userId.substring(
//           0,
//           8
//         )}.`
//       );
//     }
//     const { count: totalLikes, error: countError } = await supabase
//       .from("message_likes")
//       .select("*", { count: "exact", head: true })
//       .eq("message_id", messageId);
//     if (countError)
//       logger.warn(
//         `${logPrefix} Could not count total likes for msg ${messageId}:`,
//         countError.message
//       );
//     return NextResponse.json({
//       success: true,
//       isLiked: isLikedNow,
//       totalLikes: totalLikes ?? 0,
//       message: isLikedNow
//         ? "Message liked successfully."
//         : "Message unliked successfully.",
//     });
//   } catch (error: any) {
//     logger.error(
//       `${logPrefix} Error processing like/unlike for msg ${messageId}, user ${userId.substring(
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

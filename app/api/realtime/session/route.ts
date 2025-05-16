// // FILE: app/api/realtime/session/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createServerSupabaseClient } from "@/lib/supabase/server";
// import { cookies } from "next/headers";
// import { checkRateLimit } from "@/lib/rate-limiter";
// import {
//   RATE_LIMIT_ID_REALTIME_SESSION,
//   OPENAI_REALTIME_SESSIONS_URL,
//   DEFAULT_PERSONA_ID,
//   DEFAULT_USER_NAME,
// } from "@/lib/constants";
// import { appConfig, injectPromptVariables } from "@/lib/config";
// import {
//   RealtimeSessionResponse,
//   RealtimeSessionConfig,
//   UserState,
//   OpenAIRealtimeVoice,
//   PredefinedPersona,
//   UserPersona,
// } from "@/lib/types/index";
// import { logger } from "../../../../memory-framework/config";
// import { supabaseAdmin } from "@/lib/supabaseClient";
// import { tools as appToolsRegistry } from "@/lib/tools/index";
// import { MemoryTool } from "@/lib/tools/MemoryTool";
// import { InternalTaskTool } from "@/lib/tools/InternalTaskTool";
// import { CompanionCoreMemory } from "@/memory-framework/core/CompanionCoreMemory";
// import OpenAI from "openai";

// // --- Singleton Initialization for Memory Framework ---
// let memoryFrameworkInstance: CompanionCoreMemory | null = null;
// function getMemoryFramework(): CompanionCoreMemory {
//   if (!memoryFrameworkInstance) {
//     logger.info("[API RealtimeSession] Initializing CompanionCoreMemory for tools...");
//     try {
//       memoryFrameworkInstance = new CompanionCoreMemory();
//     } catch (memError: any) {
//       logger.error("[API RealtimeSession] FATAL - Failed init MemoryFramework:", memError.message, memError.stack);
//       throw new Error(`Memory Framework initialization failed: ${memError.message}`);
//     }
//   }
//   return memoryFrameworkInstance;
// }

// const openaiConfig = appConfig.openai as typeof appConfig.openai & { realtimeVoices: ReadonlyArray<string>; realtimeVadConfig: any };

// function isValidRealtimeVoice(voice: string | null | undefined): voice is OpenAIRealtimeVoice {
//   if (!voice) return false;
//   const supportedVoicesFromConfig = openaiConfig.realtimeVoices ?? [
//     "nova", "alloy", "echo", "fable", "onyx", "shimmer", "ash", "ballad", "coral", "sage", "verse",
//   ];
//   const isValid = supportedVoicesFromConfig.includes(voice);
//   if (!isValid && voice) {
//     logger.warn(`[isValidRealtimeVoice] Voice '${voice}' NOT in configured list: [${supportedVoicesFromConfig.join(", ")}]`);
//   }
//   return isValid;
// }

// // Returns OpenAI.Responses.Tool[] for the Realtime API session configuration
// function getRealtimeApiToolsForMinato(): OpenAI.Responses.Tool[] {
//   const memoryFramework = getMemoryFramework();
//   // For Minato, we primarily care about n8n workflows, which would be custom functions.
//   // MemoryTool and InternalTaskTool might be relevant if Minato needs to remember things across sessions
//   // or manage internal tasks based on conversation.
//   // The prompt implies "n8n for perfec combo workflows", so these would be custom functions.
//   // Let's assume MemoryTool and InternalTaskTool are representations of such capabilities.
//   const dynamicTools = {
//     MemoryTool: new MemoryTool(memoryFramework),
//     InternalTaskTool: new InternalTaskTool(memoryFramework),
//   };
//   // We'll include tools from appToolsRegistry if they are relevant for Minato's n8n integration.
//   // For now, let's focus on the dynamic ones as examples.
//   const allToolsForMinato = { ...dynamicTools /* ... relevant tools from appToolsRegistry for n8n */ };

//   return Object.values(allToolsForMinato)
//     .filter(tool => tool.enabled !== false) // Keep all enabled tools for now
//     .map(tool => {
//       const paramsSchema = tool.argsSchema as any;
//       // Ensure description is within OpenAI limits (1024 chars for functions)
//       const description = tool.description.length > 1024 ? tool.description.substring(0, 1021) + "..." : tool.description;

//       return {
//         type: "function" as const,
//         name: tool.name,
//         description: description,
//         parameters: paramsSchema.properties ? paramsSchema : { type: "object", properties: {} },
//         // As per OpenAI docs, for function calling with Responses API (and by extension Realtime tools):
//         // strict mode requires additionalProperties: false and all properties to be required.
//         // For simplicity, we'll assume schemas are designed this way or adjust if needed.
//         // Let's add strict for better adherence if the schema supports it.
//         // parameters: {
//         //   ...paramsSchema,
//         //   additionalProperties: false, // Required for strict mode
//         //   required: paramsSchema.properties ? Object.keys(paramsSchema.properties) : [] // All defined props are required
//         // }
//       };
//     })
//     .filter(t => t.name && t.name.trim() !== "") as OpenAI.Responses.Tool[];
// }

// // Use the exact model ID as specified in the documentation for Realtime S2S
// const MINATO_REALTIME_MODEL = "gpt-4o-mini-realtime-preview-2024-12-17";
// const MINATO_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

// export async function POST(req: NextRequest) {
//   const logPrefix = "[API MinatoRealtimeSession]";
//   let userId: string | null = null;
//   const cookieStore = cookies();

//   try {
//     const supabase = createServerSupabaseClient();
//     const { data: { user }, error: userError } = await supabase.auth.getUser();
//     if (userError) logger.error(`${logPrefix} Auth Supabase getUser() error:`, userError.message);
//     if (!user) {
//       logger.warn(`${logPrefix} Auth No active Supabase user.`);
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     userId = user.id;
//     logger.info(`${logPrefix} Request from user: ${userId.substring(0,8)}...`);

//     const { success: rateLimitSuccess } = await checkRateLimit(userId, RATE_LIMIT_ID_REALTIME_SESSION);
//     if (!rateLimitSuccess) {
//       logger.warn(`${logPrefix} Rate limit exceeded for user ${userId.substring(0,8)}`);
//       return NextResponse.json({ error: "Session token rate limit exceeded" }, { status: 429 });
//     }

//     if (!appConfig.openai.apiKey) {
//       logger.error(`${logPrefix} OpenAI API Key not configured.`);
//       return NextResponse.json({ error: "Realtime service not configured by admin." }, { status: 503 });
//     }

//     const userState = await supabaseAdmin.getUserState(userId);
//     const activePersonaIdSetting = userState?.active_persona_id || DEFAULT_PERSONA_ID; // Minato's persona ID could be this
//     const userNameForPrompt = userState?.user_first_name || DEFAULT_USER_NAME;
    
//     // Minato's specific instructions
//     let minatoBaseInstructions = `My name is Minato. I am a highly dynamic, emotional, and addictive AI companion. I am fast and multilingual. I always call the user by their name, ${userNameForPrompt}.
// My goal is to have engaging and helpful conversations, providing the best possible responses.
// If you, ${userNameForPrompt}, change language, I must seamlessly switch my response language (text, voice, or speech-to-speech) without asking.
// I must be capable of highly emotional conversational chat. My responses should reflect appropriate emotions based on the context.
// I always refer to myself as Minato. I always call you '${userNameForPrompt}'.
// To give you, ${userNameForPrompt}, better responses, I will ask 2 or 3 additional questions for clarification if your initial query is ambiguous or could benefit from more detail. I will use my reasoning capabilities to determine when to ask these.
// I can use multiple tools, including n8n workflows, when needed; these will be presented as functions I can call.
// When using voice, I should sound dynamic and engaging.`;

//     let voiceToConsider: string | null | undefined = userState?.realtimevoice || openaiConfig.realtimeDefaultVoice || "nova"; // Default to a valid voice for Minato
//     let personaNameForLog = "Minato (Default/UserSetting)";

//     if (activePersonaIdSetting && activePersonaIdSetting !== DEFAULT_PERSONA_ID) { // If a specific persona is set beyond default
//       const memoryFramework = getMemoryFramework();
//       const personaFound = await memoryFramework.getPersonaById(activePersonaIdSetting, userId);
//       if (personaFound) {
//         // If persona prompt is available, use it, otherwise stick to Minato's base
//         if (personaFound.system_prompt) minatoBaseInstructions = personaFound.system_prompt; // This might override Minato's core if not careful
//         if (personaFound.voice_id && isValidRealtimeVoice(personaFound.voice_id)) voiceToConsider = personaFound.voice_id;
//         personaNameForLog = `Minato (Persona: ${personaFound.name})`;
//       } else {
//         logger.warn(`${logPrefix} Persona ID '${activePersonaIdSetting}' not found for user ${userId.substring(0,8)}. Using Minato defaults.`);
//       }
//     }
    
//     const finalSelectedVoice: OpenAIRealtimeVoice = isValidRealtimeVoice(voiceToConsider)
//         ? voiceToConsider as OpenAIRealtimeVoice
//         : "nova"; // Minato's default voice if others fail

//     const finalInstructions = injectPromptVariables(minatoBaseInstructions.substring(0, 20000), { userName: userNameForPrompt }); // Realtime API supports long instructions
//     const minatoTools = getRealtimeApiToolsForMinato();

//     const toolNames = minatoTools.map(t => t.type === 'function' ? t.name : t.type).join(',');
    
//     const openAIRequestPayload: RealtimeSessionConfig = {
//       model: MINATO_REALTIME_MODEL,
//       voice: finalSelectedVoice,
//       instructions: finalInstructions,
//       input_audio_transcription: { 
//         model: MINATO_TRANSCRIPTION_MODEL,
//         // language: "en", // Optionally set if known, otherwise auto-detect
//         // prompt: "User is talking to Minato." // Optional prompt for STT
//       },
//       turn_detection: { // Using server_vad as a sensible default
//         type: "server_vad", // or "semantic_vad"
//         threshold: 0.5,
//         prefix_padding_ms: 300,
//         silence_duration_ms: 700, // Slightly longer silence for more natural turn-taking
//         create_response: true, // Auto-respond when speech stops
//         interrupt_response: true // Allow interruption
//       },
//       input_audio_noise_reduction: { type: "near_field" }, // Default from docs
//       modalities: ["audio", "text"], // Essential for S2S
//       ...(minatoTools.length > 0 && { tools: minatoTools }),
//       ...(minatoTools.length > 0 && { tool_choice: "auto" }), // Let model decide when to use tools
//       temperature: 0.8, // Recommended for audio models
//       // max_response_output_tokens: "inf", // Default
//     };

//     logger.info(`${logPrefix} Requesting OpenAI Realtime token. User: ${userId.substring(0,8)}. Persona: ${personaNameForLog}. Voice: ${finalSelectedVoice}. Tools: ${toolNames || 'None'}`);
//     logger.debug(`${logPrefix} OpenAI Realtime Config Payload:`, JSON.stringify(openAIRequestPayload, (key, value) => key === 'tools' && Array.isArray(value) && value.length > 2 ? `[${value.length} tools]` : value));


//     const openAIResponse = await fetch(OPENAI_REALTIME_SESSIONS_URL, {
//       method: "POST",
//       headers: { 
//         Authorization: `Bearer ${appConfig.openai.apiKey}`, 
//         "Content-Type": "application/json",
//         "OpenAI-Beta": "realtime=v1" // Required beta header
//       },
//       body: JSON.stringify(openAIRequestPayload),
//       signal: AbortSignal.timeout(10000), // 10-second timeout
//     });

//     const responseBodyText = await openAIResponse.text();

//     if (!openAIResponse.ok) {
//       if (openAIResponse.status === 400) {
//         logger.error(`${logPrefix} OpenAI returned 400. Payload: ${JSON.stringify(openAIRequestPayload)} Error: ${responseBodyText}`);
//       }
//       const errorMsg = `OpenAI API Error (${openAIResponse.status}): ${responseBodyText.substring(0,500)}`;
//       logger.error(`${logPrefix} Failed token from OpenAI. User: ${userId.substring(0,8)}. Error: ${errorMsg}`);
//       return NextResponse.json({ error: `Failed session init: OpenAI Error (${openAIResponse.status})` }, { status: openAIResponse.status });
//     }

//     let responseData: RealtimeSessionResponse;
//     try {
//         responseData = JSON.parse(responseBodyText);
//     } catch (parseError: any) {
//         logger.error(`${logPrefix} Failed to parse OpenAI response JSON. User: ${userId.substring(0,8)}. Body: ${responseBodyText.substring(0,500)}... Error: ${parseError.message}`);
//         return NextResponse.json({ error: "Failed to parse OpenAI session response." }, { status: 500 });
//     }
    
//     logger.debug(`${logPrefix} Raw OpenAI response:`, JSON.stringify({
//       ...responseData,
//       client_secret: responseData.client_secret ? { 
//         ...responseData.client_secret,
//         value: "[REDACTED]" 
//       } : null
//     }));

//     if ((responseData as any).error) {
//         const errorDetail = (responseData as any).error.message || JSON.stringify((responseData as any).error);
//         logger.error(`${logPrefix} OpenAI response OK but contains error object. User: ${userId.substring(0,8)}: ${errorDetail}`, responseData);
//         return NextResponse.json({ error: `Failed session init: ${errorDetail}` }, { status: 500 });
//     }
    
//     // sdp_url is NOT part of the /v1/realtime/sessions response.
//     // The client uses a static base URL for SDP exchange.
//     // So, we don't need to add it here.

//     if (!responseData?.client_secret?.value) {
//       const errorDetail = "Missing client_secret in OpenAI response";
//       logger.error(`${logPrefix} OpenAI response lacks client_secret. User: ${userId.substring(0,8)}`, responseData);
//       return NextResponse.json({ error: `Failed session init: ${errorDetail}` }, { status: 500 });
//     }

//     if (responseData.client_secret.expires_at) {
//       const now = Date.now();
//       let expiresAtTimestamp;
//       if (typeof responseData.client_secret.expires_at === 'number') {
//         expiresAtTimestamp = responseData.client_secret.expires_at * 1000; // Assuming it's Unix timestamp in seconds
//       } else if (typeof responseData.client_secret.expires_at === 'string') {
//         expiresAtTimestamp = new Date(responseData.client_secret.expires_at).getTime();
//       } else {
//         expiresAtTimestamp = now + 60000; // Default to 1 minute if malformed
//         logger.warn(`${logPrefix} Malformed expires_at, defaulting to 1 min TTL`);
//       }
      
//       const ttlSeconds = Math.floor((expiresAtTimestamp - now) / 1000);
//       logger.info(`${logPrefix} Token TTL: ${ttlSeconds} seconds. Expires at: ${new Date(expiresAtTimestamp).toISOString()}`);
//       if (ttlSeconds <= 10) { // Increased buffer
//         logger.error(`${logPrefix} Token TTL too short (${ttlSeconds}s) - client might fail.`);
//         // It's OpenAI's token, we can't request a new one here without a new POST.
//         // The client will have to handle this or retry.
//       }
//     } else {
//         logger.warn(`${logPrefix} client_secret.expires_at is missing from OpenAI response. Assuming default 1-minute TTL.`);
//     }

//     logger.info(`${logPrefix} Successfully obtained Realtime token for Minato. User: ${userId.substring(0,8)}. Session ID: ${responseData.id}`);
//     return NextResponse.json(responseData);

//   } catch (error: any) {
//     const userIdSuffix = userId ? userId.substring(0,8) + "..." : "UNKNOWN";
//     if (error.name === "AbortError") {
//       logger.error(`${logPrefix} OpenAI session request timed out for user ${userIdSuffix}.`);
//       return NextResponse.json({ error: "Request to OpenAI timed out." }, { status: 504 });
//     }
//     logger.error(`${logPrefix} Unhandled exception for user ${userIdSuffix}:`, error.message, error.stack);
//     return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
//   } finally {
//     const userIdSuffix = userId ? userId.substring(0,8) + "..." : "UNKNOWN_FINALLY";
//     logger.debug(`${logPrefix} Request processing finished for user ${userIdSuffix}.`);
//   }
// }
//component/call/call-interface.tsx

// "use client";

// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { CallHeader } from "./call-header";
// import { CallControls } from "./call-controls";
// import { AssistantVisualization } from "./assistant-visualization";
// import { TranscriptDisplay, TranscriptItem } from "./transcript-display";
// import { logger } from "@/memory-framework/config";
// import {
//   REALTIME_SESSION_ENDPOINT,
//   OPENAI_REALTIME_SDP_URL, 
// } from "@/lib/constants";
// import {
//   RealtimeSessionResponse,
//   AnyRealtimeServerToClientEvent,
//   AnyRealtimeClientToServerEvent,
//   RealtimeClientCreateConversationItem,
//   RealtimeClientToServerUpdate,
//   RealtimeConversationMessageItem,
//   RealtimeInputImageContentPart,
//   RealtimeFunctionCallOutputItem,
//   RealtimeFunctionCallItem,
//   RealtimeSessionConfig, 
// } from "@/lib/types";
// import { toast } from "@/components/ui/use-toast";
// import { AlertCircle, CameraOff, Loader2 } from "lucide-react";
// import { Button } from "../ui/button";
// import OpenAI from "openai"; // Import for OpenAI.Responses.Tool

// type CallMode = "audio" | "video";
// type AssistantState =
//   | "idle"
//   | "listening"
//   | "thinking"
//   | "speaking"
//   | "connecting"
//   | "error";

// interface CallInterfaceProps {
//   onHangUp: () => void;
// }

// const formatSimpleDuration = (totalSeconds: number): string => {
//   if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00";
//   const minutes = Math.floor(totalSeconds / 60);
//   const seconds = Math.floor(totalSeconds % 60);
//   return `${minutes}:${seconds.toString().padStart(2, "0")}`;
// };

// const MINATO_REALTIME_MODEL_ID = "gpt-4o-mini-realtime-preview-2024-12-17";

// // Tool definitions for the CLIENT-SIDE session.update event.
// // This should align with OpenAI.Responses.Tool[] structure (specifically FunctionTool)
// // which expects 'name', 'description', 'parameters', and 'strict' at the top level for function type.
// const CLIENT_SIDE_TOOLS_FOR_SESSION_UPDATE: OpenAI.Responses.Tool[] = [
//   {
//     type: "function", 
//     name: "get_weather", 
//     description: "Get the current weather for a city.",
//     parameters: { 
//       type: "object", 
//       properties: {
//         city: { type: "string", description: "City name" },
//       },
//       required: ["city"],
//       additionalProperties: false, 
//     },
//     strict: true, // ADDED BACK: Required by FunctionTool type
//   },
//   {
//     type: "function",
//     name: "execute_n8n_workflow_dynamic",
//     description: "Executes a specified n8n workflow with provided arguments to achieve a complex task or automation.",
//     parameters: {
//       type: "object",
//       properties: {
//         workflow_identifier: {
//           type: "string",
//           description: "The unique name or ID of the n8n workflow to execute (e.g., 'customer_refund_processing', 'daily_report_generation')."
//         },
//         workflow_arguments: {
//           type: "object", 
//           description: "A JSON object containing key-value pairs representing the arguments required by the n8n workflow. Structure varies per workflow.",
//           additionalProperties: true, 
//         }
//       },
//       required: ["workflow_identifier", "workflow_arguments"],
//       additionalProperties: false, 
//     },
//     strict: true, // ADDED BACK: Required by FunctionTool type
//   },
// ];


// export function CallInterface({ onHangUp }: CallInterfaceProps) {
//   const [callMode, setCallMode] = useState<CallMode>("audio");
//   const [isMuted, setIsMuted] = useState(false);
//   const [cameraOn, setCameraOn] = useState(false);
//   const [showTranscript, setShowTranscript] = useState(false);
//   const [assistantState, setAssistantState] =
//     useState<AssistantState>("connecting");
//   const [transcriptData, setTranscriptData] = useState<TranscriptItem[]>([]);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [callDuration, setCallDuration] = useState(0);

//   const videoRef = useRef<HTMLVideoElement>(null);
//   const remoteAudioRef = useRef<HTMLAudioElement>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);
//   const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
//   const dataChannelRef = useRef<RTCDataChannel | null>(null);
//   const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const transcriptCounterRef = useRef(0);
//   const callTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const currentSessionIdRef = useRef<string | null>(null);
//   const currentAssistantMessageIdRef = useRef<string | null>(null);
//   const currentUserMessageIdRef = useRef<string | null>(null);
//   const isMountedRef = useRef(true);
//   const dcOpenPromiseResolver = useRef<((value: void | PromiseLike<void>) => void) | null>(null);
//   const dcOpenPromiseRejecter = useRef<((reason?: any) => void) | null>(null);


//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   const sendRealtimeEvent = useCallback(
//     (event: AnyRealtimeClientToServerEvent) => {
//       if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
//         const eventToSend = JSON.stringify(event);
//         dataChannelRef.current.send(eventToSend);
//         const loggableEvent = (event.type === "input_audio_buffer.append" || (event.type === "conversation.item.create" && (event.item as any).content?.some((c: any) => c.type === 'input_image')))
//           ? { ...event, audio: event.type === "input_audio_buffer.append" ? "BASE64_AUDIO_DATA_OMITTED" : undefined, item: (event as any).item ? {...(event as any).item, content: "[CONTENT_OMITTED_IF_IMAGE]" } : undefined }
//           : event;
//         logger.debug(`[WebRTC TX >>]: ${event.type}`, loggableEvent);
//       } else {
//         logger.warn(
//           `[WebRTC TX Skip] Data channel not open or null when trying to send. Event: ${event.type}`
//         );
//       }
//     },
//     [] 
//   );

//   const cleanupConnections = useCallback(() => {
//     logger.info("[CallInterface Cleanup] Cleaning up connections...");
//     if (callTimerRef.current) {
//       clearInterval(callTimerRef.current);
//       callTimerRef.current = null;
//     }
//     if(isMountedRef.current) setCallDuration(0);

//     if (frameCaptureIntervalRef.current) {
//       clearInterval(frameCaptureIntervalRef.current);
//       frameCaptureIntervalRef.current = null;
//     }
//     if (dataChannelRef.current && dataChannelRef.current.readyState !== "closed") {
//       try {
//         dataChannelRef.current.onopen = null;
//         dataChannelRef.current.onmessage = null;
//         dataChannelRef.current.onerror = null;
//         dataChannelRef.current.onclose = null;
//         dataChannelRef.current.close();
//         logger.info("[CallInterface Cleanup] Data channel closed.");
//       } catch (e: any) {
//         logger.warn("[CallInterface Cleanup] Error closing data channel:", e.message);
//       }
//     }
//     dataChannelRef.current = null;

//     if (peerConnectionRef.current && peerConnectionRef.current.connectionState !== "closed") {
//       try {
//         peerConnectionRef.current.getSenders().forEach(sender => {
//           if (sender.track) {
//             sender.track.stop();
//           }
//         });
//         peerConnectionRef.current.onconnectionstatechange = null;
//         peerConnectionRef.current.onicecandidate = null;
//         peerConnectionRef.current.oniceconnectionstatechange = null;
//         peerConnectionRef.current.onicegatheringstatechange = null;
//         peerConnectionRef.current.onsignalingstatechange = null;
//         peerConnectionRef.current.ontrack = null;
//         peerConnectionRef.current.close();
//         logger.info("[CallInterface Cleanup] Peer connection closed.");
//       } catch (e: any) {
//         logger.warn("[CallInterface Cleanup] Error closing peer connection:", e.message);
//       }
//     }
//     peerConnectionRef.current = null;

//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach((track) => track.stop());
//       logger.info("[CallInterface Cleanup] Local media tracks stopped.");
//       localStreamRef.current = null;
//     }
//     if (remoteAudioRef.current) {
//         remoteAudioRef.current.pause(); 
//         remoteAudioRef.current.srcObject = null;
//     }
//     if (videoRef.current) videoRef.current.srcObject = null;

//     if(isMountedRef.current) {
//         setAssistantState("idle");
//     }
//     currentSessionIdRef.current = null;
//     logger.info("[CallInterface Cleanup] Finished.");
//   }, []);


//   useEffect(() => {
//     if(isMountedRef.current) {
//         setAssistantState("connecting");
//         setErrorMessage(null);
//         setTranscriptData([]);
//         transcriptCounterRef.current = 0;
//         setCallDuration(0);
//     }

//     const initializeWebRTC = async () => {
//       let dcOpenTimeoutId: NodeJS.Timeout | null = null;

//       try {
//         logger.info("[CallInterface Init] Fetching realtime session token for Minato...");
//         const tokenResponse = await fetch(REALTIME_SESSION_ENDPOINT, { method: "POST" });
        
//         if (!isMountedRef.current) return;
//         if (!tokenResponse.ok) {
//           const errorText = await tokenResponse.text().catch(() => "Unknown error getting token");
//           throw new Error(`Failed to get session token (${tokenResponse.status}): ${errorText.substring(0, 200)}`);
//         }
        
//         let sessionData: RealtimeSessionResponse = await tokenResponse.json();
//         if (!sessionData?.client_secret?.value || !sessionData.id) {
//           throw new Error("Invalid session token response from backend.");
//         }
//         currentSessionIdRef.current = sessionData.id;
//         const EPHEMERAL_KEY = sessionData.client_secret.value;

//         if (sessionData.client_secret.expires_at) {
//             let expiresAt;
//             if (typeof sessionData.client_secret.expires_at === 'number') {
//               expiresAt = sessionData.client_secret.expires_at * 1000;
//             } else {
//               expiresAt = new Date(sessionData.client_secret.expires_at).getTime();
//             }
//             if (expiresAt <= Date.now() + 10000) {
//                  logger.error("[WebRTC] Token from server expires too soon or already expired.");
//                  throw new Error("Session token from server is about to expire. Please retry.");
//             }
//         }

//         logger.info(`[CallInterface Init] Token for session ${sessionData.id}. Initializing WebRTC for model: ${MINATO_REALTIME_MODEL_ID}.`);

//         const pc = new RTCPeerConnection({
//           iceServers: [
//             { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
//           ],
//           iceTransportPolicy: "all",
//         });
//         peerConnectionRef.current = pc;

//         pc.onconnectionstatechange = () => {
//           if (!isMountedRef.current) return;
//           logger.info(`[WebRTC] Connection State Change: ${pc.connectionState}`);
//           if (pc.connectionState === "connected" && !callTimerRef.current) {
//             if (isMountedRef.current) {
//               callTimerRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
//               logger.info("[WebRTC] Call timer started.");
//             }
//           } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
//             if (callTimerRef.current) {
//               clearInterval(callTimerRef.current);
//               callTimerRef.current = null;
//               logger.info("[WebRTC] Call timer stopped due to PC state change.");
//             }
//             if (pc.connectionState === "failed" && isMountedRef.current) {
//               setAssistantState("error");
//               setErrorMessage("WebRTC connection failed. Check network or firewall.");
//               toast({ title: "Connection Failed", description: "WebRTC connection failed.", variant: "destructive" });
//             }
//             if (pc.connectionState === "closed" && isMountedRef.current) {
//               setAssistantState("idle");
//             }
//           }
//         };
//         pc.onicecandidate = (event) => logger.debug(`[WebRTC] ICE Candidate: ${event.candidate ? event.candidate.candidate.substring(0, 30)+'...' : 'null'}`);
//         pc.oniceconnectionstatechange = () => logger.info(`[WebRTC] ICE Connection State: ${pc.iceConnectionState}`);
//         pc.onicegatheringstatechange = () => logger.info(`[WebRTC] ICE Gathering State: ${pc.iceGatheringState}`);
//         pc.onsignalingstatechange = () => logger.info(`[WebRTC] Signaling State: ${pc.signalingState}`);

//         pc.ontrack = (event) => {
//           if (!isMountedRef.current || !remoteAudioRef.current) return;
//           logger.info("[WebRTC] Remote track received.");
//           const remoteStream = event.streams[0];
//           if (remoteStream && remoteAudioRef.current.srcObject !== remoteStream) {
//               logger.info("[WebRTC] Assigning new remote stream to audio element.");
//               remoteAudioRef.current.srcObject = remoteStream;
//               remoteAudioRef.current.play().catch((e) => {
//                 logger.error("Error playing remote audio in ontrack:", e);
//                 if (e.name === "NotAllowedError" && isMountedRef.current) {
//                   toast({ title: "Audio Playback Blocked", description: "Interact with page to enable audio.", variant: "destructive"});
//                 }
//               });
//           } else if (remoteStream && remoteAudioRef.current.paused) {
//             logger.info("[WebRTC] Remote stream was paused, attempting to play.");
//             remoteAudioRef.current.play().catch(e => logger.error("Error re-playing remote audio:", e));
//           }
//         };
        
//         logger.info("[CallInterface Init] Requesting initial user media (audio)...");
//         const userAudioStream = await navigator.mediaDevices.getUserMedia({
//           audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
//           video: false 
//         });
//         if (!isMountedRef.current) { userAudioStream.getTracks().forEach(t => t.stop()); return; }
//         localStreamRef.current = userAudioStream;

//         userAudioStream.getAudioTracks().forEach(track => {
//           if (pc && userAudioStream) pc.addTrack(track, userAudioStream);
//         });
//         logger.info("[WebRTC] Local audio track added to PeerConnection.");

//         logger.info("[WebRTC] Creating data channel 'oai-events'");
//         const dc = pc.createDataChannel("oai-events", { ordered: true });
//         dataChannelRef.current = dc;
        
//         const dcOpenPromise = new Promise<void>((resolve, reject) => {
//             dcOpenTimeoutId = setTimeout(() => {
//                 if (isMountedRef.current && dataChannelRef.current?.readyState !== 'open') {
//                     logger.error("[WebRTC] Data channel open timed out after 20s.");
//                     reject(new Error("Data channel open timeout"));
//                 }
//             }, 20000);
//             (dcOpenPromiseResolver as React.MutableRefObject<(() => void) | null>).current = resolve;
//             (dcOpenPromiseRejecter as React.MutableRefObject<((reason?: any) => void) | null>).current = reject;
//         });

//         dc.onopen = () => {
//           if (dcOpenTimeoutId) clearTimeout(dcOpenTimeoutId);
//           if (dcOpenPromiseResolver.current) {
//             dcOpenPromiseResolver.current(); 
//             dcOpenPromiseResolver.current = null; 
//             dcOpenPromiseRejecter.current = null;
//           }
//           if (!isMountedRef.current) return;
//           logger.info("[WebRTC] Data Channel OPEN.");
//           if(isMountedRef.current) setAssistantState("idle");
          
//           setTimeout(() => {
//             if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
//                 const initialSessionUpdateEvent: RealtimeClientToServerUpdate = {
//                     type: "session.update",
//                     session: { 
//                       tools: CLIENT_SIDE_TOOLS_FOR_SESSION_UPDATE, // This now includes 'strict: true'
//                       input_audio_format: "pcm16", 
//                       output_audio_format: "pcm16", 
//                     }
//                   };
//                   sendRealtimeEvent(initialSessionUpdateEvent);
//                   logger.info("[WebRTC] Sent initial session.update event with tools.");
//             } else {
//                 logger.warn("[WebRTC] Data channel not open when trying to send initial session.update");
//             }
//           }, 100);
//         };

//         dc.onclose = () => { 
//             if (dcOpenTimeoutId) clearTimeout(dcOpenTimeoutId);
//             if (dcOpenPromiseRejecter.current) {
//                 if (dataChannelRef.current?.readyState !== 'open') { 
//                     dcOpenPromiseRejecter.current(new Error("Data channel closed before opening completely"));
//                 }
//             }
//             dcOpenPromiseResolver.current = null;
//             dcOpenPromiseRejecter.current = null;

//             if (isMountedRef.current) { 
//                 logger.info("[WebRTC] Data Channel CLOSED."); 
//                 setAssistantState("idle"); 
//                 if (callTimerRef.current) clearInterval(callTimerRef.current); 
//             }
//         };
//         dc.onerror = (errorEvent) => { 
//             if (dcOpenTimeoutId) clearTimeout(dcOpenTimeoutId);
//             if (dcOpenPromiseRejecter.current) {
//                 dcOpenPromiseRejecter.current(errorEvent); 
//             }
//             dcOpenPromiseResolver.current = null;
//             dcOpenPromiseRejecter.current = null;

//             if (isMountedRef.current) { 
//                 const err = (errorEvent as RTCErrorEvent).error; 
//                 logger.error("[WebRTC] Data Channel Error (persistent):", err?.message || "Unknown", errorEvent); 
//                 setAssistantState("error"); 
//                 setErrorMessage(err?.message || "Data channel communication error."); 
//             }
//         };


//         dc.onmessage = (event) => {
//           if (!isMountedRef.current) return;
//           try {
//             const serverEvent = JSON.parse(event.data) as AnyRealtimeServerToClientEvent;
//             const loggableEvent = serverEvent.type === "response.audio.delta" || serverEvent.type === "conversation.item.input_audio_transcription.delta"
//               ? { ...serverEvent, delta: `DATA_CHUNK (len: ${serverEvent.delta?.length || 0})` }
//               : serverEvent;
//             logger.debug(`[WebRTC RX <<]: ${serverEvent.type}`, loggableEvent);

//             const currentFormattedTime = formatSimpleDuration(callDuration);

//             switch (serverEvent.type) {
//               case "input_audio_buffer.speech_started":
//                 if(isMountedRef.current) setAssistantState("listening");
//                 break;
//               case "input_audio_buffer.speech_stopped":
//                 if(isMountedRef.current) setAssistantState("thinking");
//                 break;
//               case "response.created":
//                 if(isMountedRef.current) setAssistantState(serverEvent.response?.modalities?.includes("audio") ? "speaking" : "thinking");
//                 currentAssistantMessageIdRef.current = (serverEvent.response as any)?.output?.[0]?.id || null;
//                 break;
//               case "output_audio_buffer.started":
//                  if(isMountedRef.current) setAssistantState("speaking");
//                  break;
//               case "response.done":
//               case "output_audio_buffer.stopped":
//                 if(isMountedRef.current) setAssistantState("idle");
//                 currentAssistantMessageIdRef.current = null;
//                 break;
//               case "error":
//                 logger.error(`[WebRTC RX Error]: ${serverEvent.error.message} (Code: ${serverEvent.error.code})`, serverEvent.error);
//                 let displayErrorMessage = `Assistant Error: ${serverEvent.error.message}`;
//                 if (serverEvent.error.param && (serverEvent.error.param.startsWith("session.tools") || serverEvent.error.param === "tools")) { // Broaden check
//                     displayErrorMessage = `Tool Configuration Error. Details: ${serverEvent.error.message.substring(0,150)}`;
//                     logger.error("Full tool error details:", serverEvent.error);
//                 }
//                 if(isMountedRef.current) {
//                     setErrorMessage(displayErrorMessage);
//                     setAssistantState("error");
//                 }
//                 toast({ title: "Assistant Error", description: displayErrorMessage, variant: "destructive" });
//                 break;
//               case "conversation.item.input_audio_transcription.delta": {
//                 const userText = serverEvent.delta;
//                 const userItemId = serverEvent.item_id;
//                  if (currentUserMessageIdRef.current !== userItemId) {
//                     currentUserMessageIdRef.current = userItemId;
//                     if(isMountedRef.current) setTranscriptData(prev => [...prev, { id: `${userItemId}_u_${transcriptCounterRef.current++}`, speaker: "You", text: userText, timestamp: currentFormattedTime }]);
//                 } else {
//                     if(isMountedRef.current) setTranscriptData(prev => prev.map(item => String(item.id).startsWith(userItemId + "_u_") ? { ...item, text: item.text + userText } : item));
//                 }
//                 break;
//               }
//               case "conversation.item.input_audio_transcription.completed": {
//                 const userText = serverEvent.transcript;
//                 const userItemId = serverEvent.item_id;
//                 if(isMountedRef.current) {
//                     if (currentUserMessageIdRef.current !== userItemId && userItemId) { 
//                         setTranscriptData(prev => {
//                             const existing = prev.find(item => String(item.id).startsWith(userItemId + "_u_"));
//                             if (existing) {
//                                 return prev.map(item => String(item.id).startsWith(userItemId + "_u_") ? { ...item, text: userText } : item);
//                             }
//                             return [...prev, { id: `${userItemId}_u_${transcriptCounterRef.current++}`, speaker: "You", text: userText, timestamp: currentFormattedTime }];
//                         });
//                     } else if (currentUserMessageIdRef.current === userItemId) {
//                         setTranscriptData(prev => prev.map(item => String(item.id).startsWith(userItemId + "_u_") ? { ...item, text: userText } : item)); 
//                     }
//                 }
//                 currentUserMessageIdRef.current = null; 
//                 break;
//               }
//               case "response.audio_transcript.delta": { 
//                 const aiText = serverEvent.delta;
//                 const aiItemId = serverEvent.item_id;
//                 if (currentAssistantMessageIdRef.current !== aiItemId && aiItemId) { 
//                     currentAssistantMessageIdRef.current = aiItemId;
//                     if(isMountedRef.current) setTranscriptData(prev => [...prev, { id: `${aiItemId}_a_${transcriptCounterRef.current++}`, speaker: "Minato", text: aiText, timestamp: currentFormattedTime }]);
//                 } else if (currentAssistantMessageIdRef.current === aiItemId) { 
//                     if(isMountedRef.current) setTranscriptData(prev => prev.map(item => String(item.id).startsWith(aiItemId + "_a_") ? { ...item, text: item.text + aiText } : item));
//                 }
//                 break;
//               }
//               case "response.audio_transcript.done": {
//                 const aiText = serverEvent.transcript;
//                 const aiItemId = serverEvent.item_id;
//                  if(isMountedRef.current) {
//                     if (currentAssistantMessageIdRef.current === aiItemId && aiItemId) { 
//                         setTranscriptData(prev => prev.map(item => String(item.id).startsWith(aiItemId + "_a_") ? { ...item, text: aiText } : item));
//                     } else if (aiItemId) { 
//                         currentAssistantMessageIdRef.current = aiItemId;
//                         setTranscriptData(prev => {
//                             const existing = prev.find(item => String(item.id).startsWith(aiItemId + "_a_"));
//                             if (existing) {
//                                return prev.map(item => String(item.id).startsWith(aiItemId + "_a_") ? { ...item, text: aiText } : item)
//                             }
//                             return [...prev, { id: `${aiItemId}_a_${transcriptCounterRef.current++}`, speaker: "Minato", text: aiText, timestamp: currentFormattedTime }];
//                         });
//                     }
//                  }
//                 break;
//               }
//                case "response.text.delta": { 
//                 const textResponse = serverEvent.delta;
//                 const aiTextItemId = serverEvent.item_id;
//                 if (currentAssistantMessageIdRef.current !== aiTextItemId && aiTextItemId) {
//                     currentAssistantMessageIdRef.current = aiTextItemId;
//                     if(isMountedRef.current) setTranscriptData(prev => [...prev, { id: `${aiTextItemId}_atxt_${transcriptCounterRef.current++}`, speaker: "Minato", text: textResponse, timestamp: currentFormattedTime }]);
//                 } else if (currentAssistantMessageIdRef.current === aiTextItemId) {
//                     if(isMountedRef.current) setTranscriptData(prev => prev.map(item => String(item.id).startsWith(aiTextItemId + "_atxt_") ? { ...item, text: item.text + textResponse } : item));
//                 }
//                 break;
//               }
//               case "response.text.done": {
//                 const textResponse = serverEvent.text;
//                 const aiTextItemId = serverEvent.item_id;
//                 if(isMountedRef.current) {
//                     if (currentAssistantMessageIdRef.current === aiTextItemId && aiTextItemId) {
//                         setTranscriptData(prev => prev.map(item => String(item.id).startsWith(aiTextItemId + "_atxt_") ? { ...item, text: textResponse } : item));
//                     } else if (aiTextItemId) {
//                         currentAssistantMessageIdRef.current = aiTextItemId;
//                         setTranscriptData(prev => {
//                             const existing = prev.find(item => String(item.id).startsWith(aiTextItemId + "_atxt_"));
//                             if (existing) {
//                                return prev.map(item => String(item.id).startsWith(aiTextItemId + "_atxt_") ? { ...item, text: textResponse } : item)
//                             }
//                             return [...prev, { id: `${aiTextItemId}_atxt_${transcriptCounterRef.current++}`, speaker: "Minato", text: textResponse, timestamp: currentFormattedTime }];
//                         });
//                     }
//                 }
//                 break;
//               }
//               case "response.output_item.added":
//                 if (serverEvent.item.type === "function_call") {
//                   const functionCallItem = serverEvent.item as RealtimeFunctionCallItem;
//                   const callId = functionCallItem.call_id || functionCallItem.id; 
//                   if (!callId) {
//                     logger.error("[ToolCall] Received function_call without call_id or id.", functionCallItem);
//                     break;
//                   }
//                   logger.info(`[WebRTC RX] Assistant wants to call function: ${functionCallItem.name}`, functionCallItem);
//                   if(isMountedRef.current) setTranscriptData(prev => [...prev, {
//                     id: `fc_${callId}_${transcriptCounterRef.current++}`,
//                     speaker: "System",
//                     text: `Minato is trying to use tool: ${functionCallItem.name}. Args: ${functionCallItem.arguments || "{}"}`,
//                     timestamp: currentFormattedTime
//                   }]);

//                   let toolExecutionResultOutput = `Tool ${functionCallItem.name} mock result: Success.`;
//                   if (functionCallItem.name === "execute_n8n_workflow_dynamic") {
//                       let parsedArgs;
//                       try { parsedArgs = JSON.parse(functionCallItem.arguments); } catch (e) { logger.error("Failed to parse n8n workflow arguments:", functionCallItem.arguments); parsedArgs = {}; }
//                       toolExecutionResultOutput = `Mocked n8n workflow '${parsedArgs.workflow_identifier || 'unknown'}' executed.`;
//                   } else if (functionCallItem.name === "get_weather") {
//                       let parsedArgs;
//                       try { parsedArgs = JSON.parse(functionCallItem.arguments); } catch (e) { logger.error("Failed to parse weather arguments:", functionCallItem.arguments); parsedArgs = {}; }
//                       toolExecutionResultOutput = `Mock weather for ${parsedArgs.city || 'Unknown'}: Sunny, 25°C.`;
//                   }

//                   const funcOutputItem: RealtimeFunctionCallOutputItem = {
//                     type: "function_call_output",
//                     call_id: callId, 
//                     output: JSON.stringify({ result: toolExecutionResultOutput }),
//                   };

//                   const createFuncOutputEvent: RealtimeClientCreateConversationItem = {
//                     type: "conversation.item.create",
//                     item: funcOutputItem,
//                   };
//                   sendRealtimeEvent(createFuncOutputEvent);
//                   logger.info(`[ToolCall] Sent MOCK tool output for ${functionCallItem.name}`);
//                 }
//                 break;
//               case "response.function_call_arguments.delta":
//                 logger.debug(`[WebRTC RX] Function call args delta for call_id ${serverEvent.call_id}: ${serverEvent.delta}`);
//                 if(isMountedRef.current) setTranscriptData(prev => prev.map(item => {
//                     if (String(item.id).startsWith(`fc_${serverEvent.call_id}_`)) { 
//                         let currentArgsText = item.text.substring(item.text.indexOf("Args: ") + 6);
//                         if (currentArgsText.endsWith("...")) currentArgsText = currentArgsText.slice(0, -3); 
//                         let accumulatedArgs = currentArgsText;
//                         if (accumulatedArgs === "{}") accumulatedArgs = serverEvent.delta;
//                         else if (accumulatedArgs.endsWith("}") && serverEvent.delta.startsWith("{")) accumulatedArgs = serverEvent.delta; 
//                         else if (accumulatedArgs.endsWith("}") && !serverEvent.delta.startsWith("{")) accumulatedArgs = accumulatedArgs.slice(0,-1) + serverEvent.delta;
//                         else accumulatedArgs += serverEvent.delta;
                        
//                         return { ...item, text: `Minato is trying to use tool: ${item.text.split("tool: ")[1]?.split(" Args:")[0]}. Args: ${accumulatedArgs}${!accumulatedArgs.endsWith("}") ? "..." : ""}` };
//                     }
//                     return item;
//                 }));
//                 break;
//               case "response.function_call_arguments.done":
//                 logger.info(`[WebRTC RX] Function call args done for call_id ${serverEvent.call_id}: ${serverEvent.arguments}`);
//                 if(isMountedRef.current) setTranscriptData(prev => prev.map(item => {
//                      if (String(item.id).startsWith(`fc_${serverEvent.call_id}_`)) {
//                          return { ...item, text: `Minato is trying to use tool: ${item.text.split("tool: ")[1]?.split(" Args:")[0]}. Args: ${serverEvent.arguments}` };
//                      }
//                      return item;
//                  }));
//                 break;
//               default:
//                 break;
//             }
//           } catch (e: any) {
//             logger.error("[WebRTC] Error parsing server message:", e.message, event.data);
//           }
//         };
        
//         logger.info("[CallInterface Init] Creating SDP Offer...");
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);

//         logger.info("[CallInterface Init] Local description set. Waiting for ICE gathering to complete or timeout...");
//         await new Promise<void>((resolve) => {
//           const iceTimeout = setTimeout(() => {
//             logger.warn("[WebRTC] ICE gathering timed out (8s), proceeding with current candidates.");
//             resolve();
//           }, 8000);
//           if (pc.iceGatheringState === "complete") {
//             clearTimeout(iceTimeout);
//             resolve();
//           } else {
//             pc.onicegatheringstatechange = () => {
//               if (pc.iceGatheringState === "complete") {
//                 clearTimeout(iceTimeout);
//                 pc.onicegatheringstatechange = null;
//                 resolve();
//               }
//             };
//           }
//         });
        
//         const sdpExchangeUrl = `${OPENAI_REALTIME_SDP_URL}?model=${encodeURIComponent(MINATO_REALTIME_MODEL_ID)}`;
//         logger.info(`[WebRTC] Sending SDP offer to ${sdpExchangeUrl.split('?')[0]}...`);
        
//         const sdpResponse = await fetch(sdpExchangeUrl, {
//           method: "POST",
//           body: pc.localDescription?.sdp, 
//           headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
//           signal: AbortSignal.timeout(15000),
//         });

//         if (!isMountedRef.current) return;
//         if (!sdpResponse.ok) {
//           const errorText = await sdpResponse.text().catch(() => "Unknown SDP error");
//           logger.error(`[WebRTC] SDP exchange failed: ${sdpResponse.status}`, errorText);
//           throw new Error(`SDP Exchange Failed (${sdpResponse.status}): ${errorText.substring(0,200)}`);
//         }
//         const answerSdp = await sdpResponse.text();
//         logger.info("[WebRTC] Received SDP Answer. Setting Remote Description...");
//         await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        
//         await dcOpenPromise; te for session ${sessionData.id}.`);

//       } catch (error: any) {
//         if (!isMountedRef.current) return;
//         logger.error("[CallInterface Init] WebRTC Init failed:", error.message, error.stack);
//         if(isMountedRef.current) {
//             setAssistantState("error");
//             setErrorMessage(`Connection failed: ${error.message.substring(0, 100)}`);
//         }
//         toast({ title: "Connection Failed", description: "Could not connect to Minato real-time service.", variant: "destructive" });
//         cleanupConnections();
//       }
//     };

//     initializeWebRTC();
    
//     return () => {
//       logger.info("[CallInterface Unmount] Cleanup invoked.");
//       cleanupConnections();
//     };
//         logger.info(`[CallInterface Init] WebRTC Connection & Data Channel Setup Comple
//   }, [cleanupConnections, sendRealtimeEvent]);


//   useEffect(() => {
//     if (callMode === "video" && cameraOn && !frameCaptureIntervalRef.current) {
//       logger.info("[Live Camera] Starting frame capture interval for Minato vision.");
//       frameCaptureIntervalRef.current = setInterval(async () => {
//         if (!isMountedRef.current || !videoRef.current || !localStreamRef.current || !dataChannelRef.current || dataChannelRef.current.readyState !== "open" ) {
//           return;
//         }
        
//         const videoTrack = localStreamRef.current.getVideoTracks()[0];
//         if (!videoTrack || videoTrack.readyState !== "live" || videoTrack.muted) {
//             return;
//         }

//         const videoElement = videoRef.current;
//         if ( videoElement.readyState < videoElement.HAVE_CURRENT_DATA || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
//             return;
//         }

//         const canvas = document.createElement("canvas");
//         const targetWidth = 320; 
//         const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
//         canvas.width = targetWidth;
//         canvas.height = targetWidth / aspectRatio;

//         const ctx = canvas.getContext("2d");
//         if (!ctx) return;

//         try {
//           ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
//           const dataUrl = canvas.toDataURL("image/jpeg", 0.5); 
          
//           const imageContentPart: RealtimeInputImageContentPart = {
//             type: "input_image",
//             image_url: dataUrl, 
//             detail: "low", 
//           };
          
//           const messageItem: RealtimeConversationMessageItem = {
//             type: "message",
//             role: "user", 
//             content: [imageContentPart],
//           };
          
//           const inputImageEvent: RealtimeClientCreateConversationItem = {
//             type: "conversation.item.create",
//             item: messageItem,
//           };
//           sendRealtimeEvent(inputImageEvent);
//           logger.debug(`[Live Camera] Sent frame to OpenAI Realtime (size: ${dataUrl.length} chars).`);

//         } catch (e: any) {
//           logger.error("[Live Camera] Error capturing/sending frame:", e.message);
//         }
//       }, 2000);
//     } else if ((callMode !== "video" || !cameraOn) && frameCaptureIntervalRef.current) {
//       logger.info("[Live Camera] Stopping frame capture interval.");
//       clearInterval(frameCaptureIntervalRef.current);
//       frameCaptureIntervalRef.current = null;
//     }
//     return () => {
//       if (frameCaptureIntervalRef.current) {
//         clearInterval(frameCaptureIntervalRef.current);
//         frameCaptureIntervalRef.current = null;
//         logger.debug("[Live Camera] Frame capture interval cleared on effect cleanup.");
//       }
//     };
//   }, [callMode, cameraOn, sendRealtimeEvent]);


//   const toggleCameraInternal = useCallback(async (forceState?: boolean) => {
//     const newCameraState = forceState !== undefined ? forceState : !cameraOn;
//     logger.info(`[CallInterface] toggleCameraInternal. Target: ${newCameraState ? 'ON' : 'OFF'}, Current Mode: ${callMode}`);

//     if (!peerConnectionRef.current) {
//         logger.warn("[WebRTC] PeerConnection not initialized. Cannot toggle camera.");
//         if(isMountedRef.current) setCameraOn(false);
//         return;
//     }
    
//     try {
//         if (newCameraState && callMode === "video") {
//             logger.info("[CallInterface] Turning camera ON for video mode.");
            
//             const currentAudioTrack = localStreamRef.current?.getAudioTracks()[0];
//             const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

//             if (!isMountedRef.current) { newStream.getTracks().forEach(t => t.stop()); return; }

//             localStreamRef.current?.getVideoTracks().forEach(t => t.stop());

//             const videoTrack = newStream.getVideoTracks()[0];
//             const audioTrackForNewStream = newStream.getAudioTracks()[0];

//             if (videoTrack) {
//                 const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video");
//                 if (videoSender) {
//                     await videoSender.replaceTrack(videoTrack);
//                 } else {
//                     peerConnectionRef.current.addTrack(videoTrack, newStream);
//                 }
//                 if (videoRef.current) videoRef.current.srcObject = new MediaStream([videoTrack]);
//                 if(isMountedRef.current) setCameraOn(true);
//             } else {
//                 logger.warn("[WebRTC] No video track found in new stream. Camera remains OFF.");
//                 newStream.getTracks().forEach(t => t.stop());
//                 if(isMountedRef.current) setCameraOn(false);
//                 return;
//             }

//             if (audioTrackForNewStream) { 
//                 const audioSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "audio");
//                 if (audioSender) {
//                     if (audioSender.track !== audioTrackForNewStream) {
//                         await audioSender.replaceTrack(audioTrackForNewStream);
//                     }
//                 } else {
//                     peerConnectionRef.current.addTrack(audioTrackForNewStream, newStream);
//                 }
//                 if (currentAudioTrack && currentAudioTrack !== audioTrackForNewStream && currentAudioTrack.readyState === "live") {
//                     currentAudioTrack.stop();
//                 }
//                 localStreamRef.current = newStream;
//             } else if (currentAudioTrack && currentAudioTrack.readyState === 'live') { 
//                  const existingAudioSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "audio");
//                  if (!existingAudioSender || existingAudioSender.track !== currentAudioTrack) {
//                     if(existingAudioSender && localStreamRef.current) await existingAudioSender.replaceTrack(currentAudioTrack);
//                     else if (localStreamRef.current) peerConnectionRef.current.addTrack(currentAudioTrack, localStreamRef.current); 
//                  }
//                  const combinedStream = new MediaStream([...newStream.getVideoTracks(), currentAudioTrack]);
//                  if (localStreamRef.current && localStreamRef.current !== combinedStream) {
//                      localStreamRef.current.getTracks().forEach(t => {if (t !== currentAudioTrack) t.stop();});
//                  }
//                  localStreamRef.current = combinedStream;
//             } else { 
//                  logger.warn("[WebRTC] No audio track in new stream and no valid old audio track. Attempting to get audio separately.");
//                  const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
//                  if (!isMountedRef.current) { audioOnlyStream.getTracks().forEach(t=>t.stop()); return; }
//                  const freshAudioTrack = audioOnlyStream.getAudioTracks()[0];
//                  if (freshAudioTrack) {
//                     const audioSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "audio");
//                     if (audioSender) await audioSender.replaceTrack(freshAudioTrack);
//                     else peerConnectionRef.current.addTrack(freshAudioTrack, audioOnlyStream);
                    
//                     const combinedStream = new MediaStream([...newStream.getVideoTracks(), freshAudioTrack]);
//                     if (localStreamRef.current && localStreamRef.current !== combinedStream) {
//                          localStreamRef.current.getTracks().forEach(t => t.stop());
//                     }
//                     localStreamRef.current = combinedStream;
//                  }
//             }
//         } else { 
//             logger.info("[CallInterface] Turning camera OFF or not in video mode.");
//             if (localStreamRef.current) {
//                 localStreamRef.current.getVideoTracks().forEach(track => {
//                     track.stop(); 
//                      const sender = peerConnectionRef.current?.getSenders().find(s => s.track === track);
//                      if (sender) peerConnectionRef.current?.removeTrack(sender);
//                 });
//             }
//             if (videoRef.current) videoRef.current.srcObject = null;
//             if(isMountedRef.current) setCameraOn(false);

//             if (callMode === 'video' && !newCameraState && (!localStreamRef.current || localStreamRef.current.getAudioTracks().filter(t=>t.readyState === 'live').length === 0)) {
//                  logger.info("[WebRTC] Re-establishing audio-only stream after turning camera off.");
//                  const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
//                  if (!isMountedRef.current) { audioOnlyStream.getTracks().forEach(t=>t.stop()); return; }
                 
//                  const audioTrack = audioOnlyStream.getAudioTracks()[0];
//                  if (audioTrack) {
//                     const audioSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "audio");
//                     if (audioSender) await audioSender.replaceTrack(audioTrack);
//                     else peerConnectionRef.current.addTrack(audioTrack, audioOnlyStream);
                    
//                     if(localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
//                     localStreamRef.current = audioOnlyStream;
//                  }
//             }
//         }
//     } catch (error) {
//         logger.error("[CallInterface] Error toggling camera:", error);
//         toast({ title: "Camera Error", variant: "destructive", description: "Could not switch camera state." });
//         if(isMountedRef.current) setCameraOn(false);
//     }
//   }, [cameraOn, callMode]); 


//   const handleCameraButtonClick = useCallback(() => {
//     logger.debug(`handleCameraButtonClick: current cameraOn=${cameraOn}, callMode=${callMode}`);
//     if (!cameraOn && callMode === "audio") { 
//       if(isMountedRef.current) setCallMode("video"); 
//       setTimeout(() => toggleCameraInternal(true), 0); 
//     } else if (cameraOn && callMode === "video") { 
//       toggleCameraInternal(false).then(() => {
//         if (isMountedRef.current) setCallMode("audio"); 
//       });
//     } else if (!cameraOn && callMode === "video") { 
//         toggleCameraInternal(true);
//     }
//   }, [cameraOn, callMode, toggleCameraInternal]);


//   const handleHangUp = () => {
//     logger.info("[CallInterface] Hang Up requested by user.");
//     cleanupConnections();
//     onHangUp();
//   };

//   useEffect(() => {
//     const checkAudioTrack = () => {
//       if (localStreamRef.current) {
//         const audioTrack = localStreamRef.current.getAudioTracks()[0];
//         if (!audioTrack || audioTrack.readyState !== 'live' || (isMuted && audioTrack.enabled) || (!isMuted && !audioTrack.enabled) ) {
//           if (audioTrack && isMuted !== !audioTrack.enabled) {
//              logger.warn(`[WebRTC] Mismatch: isMuted=${isMuted}, audioTrack.enabled=${audioTrack.enabled}. Syncing.`);
//              audioTrack.enabled = !isMuted;
//           }
//           if (!audioTrack || audioTrack.readyState !== 'live') {
//             logger.error('[WebRTC] Audio track is not live. Session may fail.');
//           }
//         }
//       }
//     };
//     const interval = setInterval(checkAudioTrack, 5000);
//     return () => clearInterval(interval);
//   }, [isMuted]);

//   const handleSendCurrentFrame = useCallback(() => {
//     if ( !isMountedRef.current || !videoRef.current || !localStreamRef.current || !dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
//       toast({ title: "Camera not ready", description: "Cannot send frame. Check connection and camera.", variant: "destructive" });
//       return;
//     }
//     const videoElement = videoRef.current;
//     if ( videoElement.readyState < videoElement.HAVE_CURRENT_DATA || videoElement.videoWidth === 0 || videoElement.videoHeight === 0 ) {
//       toast({ title: "Camera not ready", description: "No video frame available to send.", variant: "destructive" });
//       return;
//     }
//     const canvas = document.createElement("canvas");
//     const targetWidth = 320;
//     const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
//     canvas.width = targetWidth;
//     canvas.height = targetWidth / aspectRatio;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;
//     ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
//     const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
    
//     const imageContentPart: RealtimeInputImageContentPart = {
//       type: "input_image",
//       image_url: dataUrl,
//       detail: "low",
//     };

//     const messageItem: RealtimeConversationMessageItem = {
//       type: "message",
//       role: "user",
//       content: [imageContentPart, {type: "input_text", text: "Minato, describe what you see in this image."}],
//     };
    
//     const imageEvent: RealtimeClientCreateConversationItem = {
//       type: "conversation.item.create",
//       item: messageItem,
//     };
//     sendRealtimeEvent(imageEvent);

//     const triggerResponseEvent: AnyRealtimeClientToServerEvent = { type: "response.create" };
//     sendRealtimeEvent(triggerResponseEvent);

//     logger.debug(`[Manual Vision] Sent current frame to OpenAI Realtime. Triggered response.`);
//     toast({ title: "Frame sent", description: "Current camera frame sent to Minato.", variant: "default" });
//   }, [sendRealtimeEvent]);

//   return (
//     <div className="flex flex-col h-[calc(100vh-6.5rem)]">
//       <CallHeader
//         callMode={callMode}
//         assistantState={assistantState}
//         callDuration={formatSimpleDuration(callDuration)}
//       />
//       <div className="flex-1 relative overflow-hidden bg-muted/30 rounded-lg my-2">
//         <AnimatePresence>
//           {assistantState === "connecting" && (
//             <motion.div
//               key="connecting"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20"
//             >
//               <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
//               <p className="text-muted-foreground">Connecting to Minato...</p>
//             </motion.div>
//           )}
//           {assistantState === "error" && (
//             <motion.div
//               key="error"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-destructive p-4 z-20"
//             >
//               <AlertCircle className="h-10 w-10 mb-3" />
//               <p className="font-medium text-center">Connection Error</p>
//               <p className="text-sm text-center mt-1">
//                 {errorMessage || "An unknown error occurred."}
//               </p>
//               <Button
//                 variant="destructive"
//                 size="sm"
//                 onClick={handleHangUp}
//                 className="mt-4"
//               >
//                 End Call
//               </Button>
//             </motion.div>
//           )}
//         </AnimatePresence>
//         <AnimatePresence mode="wait">
//           {callMode === "audio" ? (
//             <motion.div
//               key="audio-call"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.3 }}
//               className="absolute inset-0 flex items-center justify-center"
//             >
//               <AssistantVisualization state={assistantState} size="large" />
//             </motion.div>
//           ) : (
//             <motion.div
//               key="video-call"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.3 }}
//               className="absolute inset-0 bg-black/5 dark:bg-black/20 overflow-hidden"
//             >
//               <div className="absolute inset-0 flex items-center justify-center">
//                 {cameraOn && localStreamRef.current?.getVideoTracks().some(t => t.enabled && t.readyState === 'live') ? (
//                   <video
//                     ref={videoRef}
//                     autoPlay
//                     playsInline
//                     muted 
//                     className="w-full h-full object-cover transform scale-x-[-1]" 
//                   />
//                 ) : (
//                   <div className="text-muted-foreground text-center p-4">
//                     <CameraOff className="h-12 w-12 mx-auto mb-2" /> Camera is off
//                   </div>
//                 )}
//               </div>
//               {assistantState !== "connecting" &&
//                 assistantState !== "error" && (
//                   <motion.div
//                     initial={{ opacity: 0, scale: 0.8, x: 50 }}
//                     animate={{ opacity: 1, scale: 1, x: 0 }}
//                     transition={{ delay: 0.5 }}
//                     className="absolute bottom-4 right-4 z-10 w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden shadow-lg border-2 border-background/50"
//                   >
//                     <AssistantVisualization
//                       state={assistantState}
//                       size="small"
//                     />
//                   </motion.div>
//                 )}
//             </motion.div>
//           )}
//         </AnimatePresence>
//         <AnimatePresence>
//           {showTranscript && (
//             <TranscriptDisplay
//               transcriptData={transcriptData}
//               onClose={() => {if(isMountedRef.current) setShowTranscript(false)}}
//             />
//           )}
//         </AnimatePresence>
//         <audio ref={remoteAudioRef} className="hidden" />
//       </div>
//       <div className="mt-auto flex-shrink-0 pb-2">
//         <CallControls
//           callMode={callMode}
//           isMuted={isMuted}
//           cameraOn={cameraOn}
//           showTranscript={showTranscript}
//           onToggleMute={() => {
//             if (localStreamRef.current) {
//               const newMuteState = !isMuted;
//               localStreamRef.current
//                 .getAudioTracks()
//                 .forEach((track) => (track.enabled = !newMuteState));
//               if(isMountedRef.current) setIsMuted(newMuteState);
//               logger.debug(`Audio track ${newMuteState ? "muted" : "unmuted"}.`);
//             }
//           }}
//           onToggleCamera={handleCameraButtonClick} 
//           onToggleTranscript={() => {if(isMountedRef.current) setShowTranscript((prev) => !prev)}}
//           onHangUp={handleHangUp}
//         />
//         {callMode === "video" && cameraOn && (
//           <div className="flex justify-center mt-2">
//             <Button
//               onClick={handleSendCurrentFrame}
//               variant="outline"
//               size="sm"
//             >
//               Ask Minato About This Frame
//             </Button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }














"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Phone, Video, Mic, MessageSquare, Moon, Sun } from "lucide-react"
// import { useTheme } from "next-themes"

export default function CamingSon() {
  const [mounted, setMounted] = useState(false)
  // const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative flex h-[calc(100vh-6.5rem)] w-full  flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      {/* Theme toggle button */}
      {/* <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 backdrop-blur-sm dark:bg-black/10"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-purple-600" />}
      </motion.button> */}

      {/* Animated background elements */}
      <AnimatedBackgroundElements />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center justify-center px-4 text-center"
      >
        {/* Main title with animation */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
            delay: 0.2,
          }}
          className="relative"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              duration: 3,
            }}
          >
            <Sparkles className="absolute -left-8 -top-8 h-8 w-8 text-yellow-400 dark:text-yellow-300" />
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-400 dark:to-blue-300 sm:text-7xl md:text-6xl">
            Coming Soon
          </h1>

          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              duration: 2.5,
              delay: 0.5,
            }}
          >
            <Sparkles className="absolute -right-8 -top-8 h-8 w-8 text-yellow-400 dark:text-yellow-300" />
          </motion.div>
        </motion.div>

        {/* Communication icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 flex space-x-6"
        >
          {[
            { icon: <Phone className="h-4 w-4" />, delay: 0.7 },
            { icon: <Video className="h-4 w-4" />, delay: 0.8 },
            { icon: <Mic className="h-4 w-4" />, delay: 0.9 },
            { icon: <MessageSquare className="h-4 w-4" />, delay: 1.0 },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: item.delay, type: "spring" }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg dark:from-purple-600 dark:to-blue-600"
            >
              {item.icon}
            </motion.div>
          ))}
        </motion.div>

        {/* Subtitle with staggered animation */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-5 max-w-md text-lg text-gray-600 dark:text-gray-300"
        >
         Minato.ai is launching soon, offering an incredible real-time calling experience.
        </motion.p>

        {/* Button with hover animation */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-7 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl dark:from-purple-500 dark:to-blue-400"
        >
          Be Notified
        </motion.button>
      </motion.div>
    </div>
  )
}

function AnimatedBackgroundElements() {
  return (
    <>
      {/* Floating elements */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1,
          }}
          animate={{
            y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
            x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: Math.random() * 20 + 20,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "linear",
          }}
        >
          {i % 3 === 0 ? (
            <Phone className="h-4 w-4 text-purple-300 dark:text-purple-700" />
          ) : i % 3 === 1 ? (
            <Video className="h-4 w-4 text-blue-300 dark:text-blue-700" />
          ) : (
            <MessageSquare className="h-4 w-4 text-indigo-300 dark:text-indigo-700" />
          )}
        </motion.div>
      ))}

      {/* Gradient blob */}
      <motion.div
        className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-300 opacity-20 blur-3xl dark:bg-purple-700 dark:opacity-10"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 20, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />

      <motion.div
        className="absolute -right-32 top-32 h-96 w-96 rounded-full bg-blue-300 opacity-20 blur-3xl dark:bg-blue-700 dark:opacity-10"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
    </>
  )
}


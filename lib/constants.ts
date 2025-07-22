// FILE: lib/constants.ts
// Déclaration de types globaux ou spécifiques à l'application si nécessaire
// These will be superseded by the specific types in lib/types/index.d.ts
// but keep them here for potential direct use of constants if needed.
declare global {
  namespace App { 
      type OpenAITtsVoiceConstant = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse'; 
      type OpenAIRealtimeVoiceConstant = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse'; 
  }
}

// --- Minato Pricing Plans ---
export const MINATO_PLANS = {
  FREE: {
    name: 'Free Plan',
    price: 0,
    currency: 'USD',
    description: 'Permanent free access with core features',
    features: {
      chat: 'unlimited',
      leads: 'unlimited',
      listening_recordings: 5,
      games_solo: true,
      games_multiplayer: false,
      image_generation: false,
      video_generation: false,
    },
    limits: {
      recordings: 5,
      images: 0,
      videos: 0,
    }
  },
  PRO: {
    name: 'Pro Plan',
    price: 25,
    currency: 'USD',
    billing_period: 'month',
    description: 'Full access to all features and higher limits',
    features: {
      chat: 'unlimited',
      leads: 'unlimited',
      listening_recordings: 20,
      games_solo: true,
      games_multiplayer: true,
      image_generation: true,
      video_generation: true,
    },
    limits: {
      recordings: 20,
      images: 30,
      videos: 20,
    }
  }
} as const;

export type MinatoPlan = keyof typeof MINATO_PLANS;

// --- Buckets de Stockage (Supabase) ---
export const MEDIA_UPLOAD_BUCKET = process.env.MEDIA_UPLOAD_BUCKET || "audio-recordings";
export const AUDIO_BUCKET = "audio-recordings";
export const IMAGE_BUCKET = "images";
export const VIDEO_BUCKET = "videos";
export const DOCUMENT_BUCKET = "documents";

// Additional bucket constants for consistency with env variables
export const TTS_AUDIO_BUCKET = process.env.TTS_AUDIO_BUCKET || "ttsaudio";
export const MEDIA_VIDEO_BUCKET = process.env.MEDIA_VIDEO_BUCKET || "videos";
export const MEDIA_IMAGE_BUCKET = process.env.MEDIA_IMAGE_BUCKET || "images2";
export const MEDIA_DOCUMENT_BUCKET = process.env.MEDIA_DOCUMENT_BUCKET || "documents";

// --- URL Expiry Times ---
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour for signed URLs

// --- Limites d'Upload de Fichiers ---
export const ALLOWED_AUDIO_TYPES = [
  "audio/mp3", "audio/mp4", "audio/mpeg", "audio/mpga", "audio/m4a",
  "audio/wav", "audio/webm", "audio/webm;codecs=opus", "audio/ogg", "audio/ogg;codecs=opus",
  "audio/opus", "audio/aac", "audio/flac",
];
export const ALLOWED_IMAGE_TYPES = [ "image/jpeg", "image/png", "image/webp", "image/gif", ]; 
export const ALLOWED_VIDEO_TYPES = [ "video/mp4", "video/mpeg", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/avi", "video/mov", ];
export const ALLOWED_DOCUMENT_TYPES = [ 
    "application/pdf", "text/plain", "text/markdown", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
];
export const ALLOWED_DATA_FILE_TYPES = [ 
    "text/csv",
    "application/vnd.ms-excel", 
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
];


export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; 
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; 
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; 
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; 
export const MAX_CSV_XLSX_SIZE_BYTES = 50 * 1024 * 1024; 

// --- Gestion de Session ---
export const SESSION_ID_PREFIX = "sess_";
export const MAX_CHAT_HISTORY = 10; 
export const DEFAULT_TOOL_TIMEOUT_MS = 12000; // Reduced from 20s to 12s for faster responses 

// --- Constantes API OpenAI Realtime ---
// For WebRTC SDP exchange, the client constructs this with model name query param
export const OPENAI_REALTIME_SDP_URL = "https://api.openai.com/v1/realtime"; 
export const OPENAI_REALTIME_WEBSOCKET_URL = "wss://api.openai.com/v1/realtime"; 
export const OPENAI_REALTIME_SESSIONS_URL = "https://api.openai.com/v1/realtime/sessions"; 

// --- Endpoints API Backend (Internal Application Routing) ---
export const VISUAL_ANALYSIS_ENDPOINT = "/api/realtime/analyze_visual"; // Will be deprecated by sending images via data channel
export const VIDEO_ANALYSIS_ENDPOINT = "/api/video/analyze";         
export const TOOL_EXECUTION_ENDPOINT = "/api/tools/execute";         
export const AUDIO_INPUT_ENDPOINT = "/api/audio";                    
export const STANDARD_CHAT_ENDPOINT = "/api/chat";                   
export const USER_PROFILE_ENDPOINT = "/api/user/profile";            
export const REALTIME_SESSION_ENDPOINT = "/api/realtime/session";    
export const FILE_UPLOAD_ENDPOINT = "/api/files/upload";             
export const PERSONAS_ENDPOINT = "/api/personas";                    
export const PERSONA_DETAIL_ENDPOINT = "/api/personas/[personaId]";  
export const NOTIFICATION_SUBSCRIBE_ENDPOINT = "/api/notifications/subscribe"; 
export const MESSAGE_EDIT_ENDPOINT = "/api/messages/[messageId]";       
export const MESSAGE_LIKE_ENDPOINT = "/api/messages/[messageId]/like";   
export const MEMORY_SEARCH_ENDPOINT = "/api/memory/search";          
export const MEMORY_DELETE_ENDPOINT = "/api/memory/delete";          

export const GOOGLE_CONNECT_ENDPOINT = "/api/auth/connect/google";
export const GOOGLE_CALLBACK_ENDPOINT = "/api/auth/callback/google";
export const GOOGLE_DISCONNECT_ENDPOINT = "/api/auth/disconnect/google";


// --- Identifiants pour le Rate Limiting ---
export const RATE_LIMIT_ID_CHAT = "api_chat";
export const RATE_LIMIT_ID_AUDIO_INPUT = "api_audio_input";
export const RATE_LIMIT_ID_REALTIME_SESSION = "realtime_session_token"; 
export const RATE_LIMIT_ID_VISUAL_ANALYSIS_REALTIME = "realtime_visual_analysis"; 
export const RATE_LIMIT_ID_TOOL_EXECUTION = "tool_execution"; 
export const RATE_LIMIT_ID_VIDEO_ANALYSIS = "api_video_analysis"; 
export const RATE_LIMIT_ID_USER_PROFILE = "api_user_profile"; 
export const RATE_LIMIT_ID_FILE_UPLOAD = "api_file_upload"; 

// --- Valeurs par Défaut ---
export const DEFAULT_PERSONA_ID = "minato_default"; 
export const DEFAULT_TTS_VOICE: App.OpenAITtsVoiceConstant = "nova";
export const DEFAULT_REALTIME_VOICE: App.OpenAIRealtimeVoiceConstant = "nova"; 
export const DEFAULT_USER_NAME = "friend";

// --- Paramètres Audio TTS ---
export const TTS_DEFAULT_FORMAT: "mp3" | "opus" | "aac" | "flac" = "mp3";

// --- Traitement Vidéo ---
export const VIDEO_FRAME_COUNT = 5; 
export const VIDEO_FRAME_FORMAT = "png"; 

// --- Embeddings ---
export const OPENAI_EMBEDDING_DIMENSION = 1536; 

// --- Intégration Framework Mémoire ---
export const MEMORY_SEARCH_LIMIT_DEFAULT = 7;

// --- Valeurs par Défaut Cache Sémantique ---
export const EXTERNAL_CACHE_SIMILARITY_THRESHOLD = 0.88;
export const EXTERNAL_CACHE_DEFAULT_LIMIT = 1;

// --- Quota Checking Utilities ---
export async function checkQuotaRealTime(
  supabase: any,
  userId: string,
  quotaType: 'recordings' | 'images' | 'videos',
  planType: 'FREE' | 'PRO',
  quotaLimits?: any
): Promise<{ isWithinLimit: boolean; currentUsage: number; limit: number; error?: string }> {
  try {
    // Get current month date range
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Determine table name and limit based on quota type
    let tableName: string;
    let limit: number;

    switch (quotaType) {
      case 'recordings':
        tableName = 'audio_recordings';
        limit = planType === 'PRO' ? (quotaLimits?.recordings ?? MINATO_PLANS.PRO.limits.recordings) : MINATO_PLANS.FREE.limits.recordings;
        break;
      case 'images':
        tableName = 'generated_images';
        limit = planType === 'PRO' ? (quotaLimits?.images ?? MINATO_PLANS.PRO.limits.images) : MINATO_PLANS.FREE.limits.images;
        break;
      case 'videos':
        tableName = 'generated_videos';
        limit = planType === 'PRO' ? (quotaLimits?.videos ?? MINATO_PLANS.PRO.limits.videos) : MINATO_PLANS.FREE.limits.videos;
        break;
      default:
        return { isWithinLimit: false, currentUsage: 0, limit: 0, error: 'Invalid quota type' };
    }

    // Count actual usage from database for this month
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);

    if (error && error.code !== '42P01') { // Ignore table not exists error
      return { isWithinLimit: false, currentUsage: 0, limit, error: `Failed to check ${quotaType} quota: ${error.message}` };
    }

    const currentUsage = count || 0;
    const isWithinLimit = currentUsage < limit;

    return { isWithinLimit, currentUsage, limit };
  } catch (error: any) {
    return { isWithinLimit: false, currentUsage: 0, limit: 0, error: `Quota check failed: ${error.message}` };
  }
}
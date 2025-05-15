
Minato: Your Hyper-Personalized AI Companion

Minato is more than just an assistant; it's your intelligent, adaptive, and engaging AI companion designed to seamlessly integrate into your digital life, understand your context, and proactively help you achieve your goals.

Minato combines cutting-edge AI models, a sophisticated memory system, and a wide array of tools to provide a rich, multimodal experience. Whether you're chatting via text, engaging in natural voice conversations, or needing insights from images and videos, Minato is built to learn, adapt, and assist.

✨ Top Features: What Minato Can Do For You

Fluid Real-time Voice Conversations:

How to Use: Simply tap the microphone icon and start talking! Engage in natural back-and-forth voice chats.

Under the Hood: Minato uses advanced speech-to-speech technology (gpt-4o-realtime-preview) for low-latency, natural-sounding interactions. Its voice is powered by gpt-4o-mini-tts with dynamic instructions, allowing it to adapt its tone and expressiveness based on the conversation, making it feel more lifelike and less robotic.

Deep Contextual Memory & Personalized Recall:

How to Use: Just interact naturally! Minato remembers your preferences, key facts from your conversations, and the relationships between important entities (people, places, projects). No more repeating yourself; Minato learns and builds context over time.

Under the Hood: A powerful dual-memory system combines semantic search (Vector DB - Supabase pgvector) for factual recall with a graph database (Neo4j) to understand complex connections. This allows Minato to provide highly relevant and personalized responses.

Intelligent Task Orchestration & Multi-Tool Use:

How to Use: Ask complex questions or give multi-step requests like, "What's the weather in Tokyo, and can you find me a good sushi restaurant there for tomorrow evening, then check my calendar to see if I'm free?"

Under the Hood: Minato's advanced planning brain (o4-mini-2025-04-16 leveraging the OpenAI Responses API) intelligently analyzes your request, breaks it down into sub-tasks, and selects the most appropriate tools (Weather, Places, Calendar, etc.) – even using multiple tools in parallel to get you answers faster and more efficiently.

Hyper-Personalization with Dynamic Personas:

How to Use: Go to Settings -> General. Choose from unique Minato personalities (e.g., "Professional Assistant," "Friendly Buddy," "Sarcastic Coach") or create your own custom persona by defining its name, description, and core instructions! Minato will adapt its response style, tone, and voice to match.

Under the Hood: Your chosen persona's system prompt dynamically guides the main response generation model (gpt-4.1-mini-2025-04-14), and the associated voice_id directs the TTS engine, creating a truly unique companion experience. User-created personas are securely stored in your Supabase database.

Multimodal Understanding (Text, Voice, Vision):

How to Use: Type your messages, use the voice input for hands-free interaction, or upload images/videos for Minato to analyze and discuss.

Under the Hood: Minato processes text directly, transcribes your voice input (gpt-4o-mini-transcribe), and can analyze the content of images and video frames (gpt-4.1-mini vision capabilities).

Proactive Reminders & Assistance:

How to Use: Ask Minato to remind you about something (e.g., "Minato, remind me to call Mom tomorrow at 5 PM").

Under the Hood: Minato extracts reminder details, stores them with a trigger time, and a backend scheduler will (TODO: on full implementation) send you a push notification when it's due.

Seamless Google Integration (Optional & Secure):

How to Use: In Settings -> Privacy & Integrations, connect your Google Account. Then ask Minato: "What's on my calendar today?" or "Find recent emails from Alice about Project Phoenix."

Under the Hood: Uses secure OAuth2 to access your Google Calendar (read-only) and Gmail (read-only for metadata/summaries with your permission). Your tokens are encrypted and stored securely.

Integrated Task Management:

How to Use: "Minato, add 'Finish report by Friday' to my tasks," or "What are my pending tasks?"

Under the Hood: The InternalTaskTool stores and retrieves simple tasks directly within Minato's memory system.

Reliable & Structured Information:

How to Use: When Minato uses tools like Web Search, WolframAlpha, or recipe finders, it will often present key information in clean, easy-to-read cards directly in the chat.

Under the Hood: The OpenAI Responses API with json_schema is used where appropriate to ensure tools return structured data, which the UI then renders into informative cards.

Adaptive Multilingual Capabilities:

How to Use: Converse naturally in many supported languages. Minato detects your language and aims to respond accordingly.

Under the Hood: Language detection is performed on your input, and this context is used to guide both response generation and TTS output.

Secure & Private by Design:

Peace of Mind: Your conversations and personal data are handled with strong security measures, including encryption for sensitive integration tokens.

🚀 Minato's Tech Stack & How It's Leveraged

Minato is built with a modern, powerful, and scalable technology stack:

Frontend:

Next.js (App Router): Provides a robust framework for building a responsive React-based web application, enabling server-side rendering, client-side interactivity, and easy API route creation.

React & TypeScript: For building a type-safe, component-based, and maintainable user interface.

Shadcn/UI & Tailwind CSS: Delivers a sleek, modern, and customizable design system, adhering to Apple-inspired aesthetics.

Framer Motion: Used for fluid animations and delightful micro-interactions.

Lucide Icons: For clean and consistent iconography.

Supabase  (Authentication - Recommended): Manages user sign-up, sign-in (including Google OAuth), session management, and provides secure user identification across frontend and backend.

Supabase Client SDK: For direct, secure interactions with Supabase from the client (e.g., for auth state, realtime subscriptions if used).

WebRTC & Web Audio API: Foundation for real-time voice/video calls and client-side audio processing (recording).

Backend (Vercel Serverless Functions / Edge Functions):

Next.js API Routes: Host the backend logic for chat processing, tool execution, user profile management, etc.

OpenAI API (Primary AI Engine):

Responses API: The core interface for interacting with models like o4-mini and gpt-4.1-mini. Used for planning, response synthesis, information extraction, and vision analysis, supporting stateful conversations and structured outputs.

o4-mini-2025-04-16: The dedicated reasoning and planning model, responsible for analyzing user requests and creating multi-tool execution plans.

gpt-4.1-mini-2025-04-14: Used for general response synthesis, complex text understanding, and vision tasks (analyzing images/video frames).

text-embedding-3-small: Generates vector embeddings for text, powering semantic search in the memory framework.

Audio APIs:

gpt-4o-mini-tts: For high-quality, expressive Text-to-Speech with dynamic instructions for vocal nuances.

gpt-4o-mini-transcribe: For accurate Speech-to-Text transcription.

Realtime API (gpt-4o-realtime-preview-2024-12-17): Enables ultra-low-latency, bidirectional speech-to-speech conversations. The backend facilitates session token creation for client-side WebRTC connections.

Memory Framework (Custom Module):

SupabaseService (using Supabase Postgres & pgvector): Stores StoredMemoryUnits (facts, preferences, reminders, tasks) with their vector embeddings for semantic search. Manages an ExternalContentCache for tool results. Also handles storage for predefined and user-created Personas.

Neo4jService (using Neo4j Graph Database): Stores extracted entities and their relationships, enabling complex contextual understanding and graph-based queries.

CacheService (using Upstash Redis): Provides fast key-value caching for LLM extractions, embeddings, and memory search results to optimize performance and cost.

OpenAIService (within Memory Framework): Internal OpenAI client focused on extraction and embedding tasks for memory population, using gpt-4.1-mini for extraction and text-embedding-3-small.

Supabase (Backend-as-a-Service):

PostgreSQL Database: Primary data store for user_profiles, user_states, user_integrations, user_push_subscriptions, personas, user_personas, and the memory/cache tables used by SupabaseService.

Storage: Used by TTSService to store generated TTS audio files (tts-audio bucket) and by the /api/audio route for temporary user voice uploads (media-uploads bucket).

Admin SDK: Used in backend routes for privileged database operations.

Supabase Backend SDK: Used in API routes to securely verify user sessions and retrieve authenticated userId.

google-auth-library: For handling Google OAuth 2.0 flow on the backend to securely obtain and refresh access/refresh tokens for Google Calendar & Gmail integration.

web-push (for Reminders - TODO): Library for sending W3C standard push notifications.

FFmpeg & fluent-ffmpeg, ffmpeg-static (Video Analysis): Used in the /api/video/analyze route to extract frames from uploaded videos before sending them to the vision model.

🎤 Behind the Mic: How Minato Handles Voice

Minato offers two distinct voice interaction experiences:

Standard Voice Input & TTS Output:

Frontend Recording: When you tap the mic (in idle input state), the InputArea (using a hook like useAudioRecorder) captures audio using your browser's Web Audio API.

Backend /api/audio Flow:

The recorded audio Blob is sent to /api/audio.

The backend uploads this audio to Supabase Storage for temporary access.

It generates a signed URL for the uploaded audio.

The Orchestrator.processAudioMessage is called with this signed URL.

The STTService downloads the audio and uses gpt-4o-mini-transcribe to convert your speech into text.

The Orchestrator then processes this transcribed text like a regular text message (planning, tools, memory).

The final text response from Minato is generated.

The TTSService uses gpt-4o-mini-tts (with a voice selected by your active Persona and dynamic instructions based on the response content) to convert Minato's text reply into speech.

This speech audio is uploaded to Supabase Storage.

The /api/audio route returns the transcription, Minato's text_response, and the audioResponseUrl for the generated speech.

Frontend Playback: The ChatInterface receives the audioResponseUrl and the transcription. The MessageItem then uses the AudioPlayer to play Minato's voice, and displays the transcription.

Real-time Speech-to-Speech (S2S) Call Interface:

Initiation: When you start a "Live Conversation" (Call):

Frontend (useCallState) requests an ephemeral session token from your backend route /api/realtime/session.

/api/realtime/session makes a POST request to OpenAI's /v1/realtime/sessions endpoint. This request includes:

model: gpt-4o-realtime-preview-2024-12-17

voice: Your selected Realtime Persona voice (e.g., "alloy").

instructions: Initial system prompt/persona instructions for the session.

input_audio_transcription.model: gpt-4o-mini-transcribe.

turn_detection: Configured VAD settings (Server VAD, threshold 0.5, prefix 300ms, silence 500ms, create/interrupt response true).

input_audio_noise_reduction: near_field.

Other parameters like temperature: 0.8, max_output_tokens: "inf".

OpenAI returns a client_secret (ephemeral token) and session details.

Your backend (/api/realtime/session) sends this back to the frontend.

WebRTC Connection (Frontend - useCallState):

The frontend uses the client_secret to establish a WebRTC PeerConnection directly with https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17.

It captures your microphone audio using navigator.mediaDevices.getUserMedia.

This local audio stream is added as a track to the RTCPeerConnection.

An RTCDataChannel named "oai-events" is created for sending/receiving JSON control messages and text transcriptions.

SDP Offer/Answer exchange occurs with the OpenAI endpoint.

During the Call:

Your voice audio is streamed to OpenAI via the WebRTC audio track.

OpenAI's VAD detects when you start and stop speaking (sending input_audio_buffer.speech_started/stopped events on the data channel).

OpenAI's internal STT (gpt-4o-mini-transcribe) transcribes your speech in real-time, sending conversation.item.input_audio_transcription.delta and completed events via the data channel. These are displayed in the TranscriptDisplay.

The gpt-4o-realtime-preview model processes your audio (and potentially text from the transcript) and generates a response.

The model's audio response is streamed back to your client via the WebRTC remote audio track (pc.ontrack), which is then played through a hidden <audio> element.

The model's text transcription of its own speech is also streamed back via response.text.delta/done events on the data channel and displayed.

The frontend UI (AssistantLottiePip) visualizes the AI's state (thinking, speaking, listening) based on data channel events like response.created, response.audio.delta, response.done.

Camera in Call: If you toggle your camera ON in the CallInterface:

useCallState calls getUserMedia again, this time requesting video: true (and audio: true).

The local video track is added to the existing RTCPeerConnection.

Your local video feed is displayed in the main view (videoRef). This video is NOT sent to OpenAI for processing by default in the S2S audio models; they primarily process audio.

To analyze video during a call, you would need a separate mechanism:

Capture frames from the local video stream on the client.

Send these frames (e.g., base64 encoded) to your backend /api/realtime/analyze_visual endpoint (which uses gpt-4.1-mini vision).

The text description from the vision analysis would then need to be injected back into the Realtime conversation context, likely as a user message via the conversation.item.create event on the Data Channel, for the Realtime AI to consider.

🖼️ Visuals & Attachments: Image & Video Handling

User Uploads:

You can attach images (up to 5) or a single video (up to 25MB) to your text messages.

The UI shows neat previews in the input area before you send.

AI Processing (Standard Chat - /api/chat):

Images: Sent as base64 data URLs directly with your text to the gpt-4.1-mini-2025-04-14 model (via the Responses API), which can understand their content.

Videos (Backend - /api/video/analyze):

Your uploaded video is sent to a dedicated backend endpoint.

FFmpeg extracts a set number of keyframes (e.g., 5 frames) as images.

These frames are then sent to the gpt-4.1-mini-2025-04-14 vision model for analysis, along with your text prompt.

The textual description of these frames is then used by the Orchestrator as context for Minato's response.

Display: Minato can display images and videos sent by tools (like search results) in clean, interactive cards.

🛠️ Tools & Dynamic Capabilities

Minato leverages a suite of tools to extend its capabilities beyond standard LLM knowledge:

Web Search (WebSearchTool): Finds current information, news, products, or TikTok videos.

Google Calendar & Gmail (GoogleCalendarReaderTool, GoogleGmailReaderTool): Accesses your schedule and emails (with your permission) to provide summaries or find specific information.

Information & Utilities:

YouTubeSearchTool, UnsplashSearchTool, PexelsSearchTool: Find videos and images.

WeatherTool: Gets current weather.

PlaceSearchTool: Finds details about locations.

WolframAlphaTool: For computations, conversions, and factual data.

RecipeSearchTool: Finds recipes.

DateTimeTool: Gets current date/time for locations.

PublicHolidayTool: Checks for public holidays.

GeolocationTool: Estimates your current location.

SunriseSunsetTool: Provides sunrise/sunset times.

MapLinkTool: Generates map links.

HackerNewsTool, RedditTool: Fetches posts from these platforms.

SportsInfoTool, EventFinderTool: Gets sports and event information.

NewsAggregatorTool: Fetches news from multiple sources.

Personal & Productivity:

MemoryTool: Allows Minato to recall specific details from its long-term memory about you.

InternalTaskTool: Manages your simple to-do list within Minato.

ReminderReaderTool: Checks your pending reminders.

MoodJournalTool, HabitTrackerTool, WaterIntakeTool: Simple logging tools for personal well-being.

Dynamic Flow: Minato doesn't just pick one tool. Its Planner (o4-mini) analyzes your request and can decide to:

Use no tools if the answer is general knowledge. a must 

Use a single, most appropriate tool.

Use multiple tools in sequence or even in parallel if different pieces of information are needed to fulfill your request comprehensively.

there are some predefined flows but highly dynamical

Ask you for clarification if your request is ambiguous before proceeding.

🔒 Your Privacy, Our Priority

Minato is designed with your data security and privacy in mind. When you choose to connect external services like Google Calendar or Gmail, we use industry-standard OAuth 2.0, and your sensitive access tokens are always encrypted before being stored. Minato will only access the data you explicitly grant permission for, and only when a tool needs it to fulfill your request. We are committed to transparency and providing you control over your information. (This section can be expanded based on your actual privacy policy).



// FILE: lib/types/index.d.ts (UNIFIED AND CORRECTED)
import OpenAI from "openai";
// Ensure these paths are correct relative to your project structure
import { ToolOutput as BaseToolOutputDef } from "../tools/base-tool";
import {
StoredMemoryUnit as MemoryFrameworkStoredMemoryUnit,
SearchResult as MemoryFrameworkSearchResult,
ExtractedInfo as MemoryFrameworkExtractedInfo,
ReminderDetails as MemoryFrameworkReminderDetails,
ExternalContentCacheEntry as MemoryFrameworkExternalCacheEntryDef,
MemoryFrameworkMessage,
PaginationParams,
PaginatedResults,
SearchOptions,
LatestGraphInfo,
} from "../../memory-framework/core/types";
import { CompletionUsage } from "openai/resources";
// --- Workflow Specific Types ---
export type WorkflowStepType =
| "tool_call"
| "llm_process"
| "clarification_query";
export interface ToolCallStep {
type: "tool_call";
toolName: string;
toolArgs: Record<string, any>;
description?: string;
outputVar?: string;
parallel?: boolean;
depends_on_var?: string;
}
export interface LLMProcessStep {
type: "llm_process";
promptTemplateKey?: string;
customPrompt?: string;
inputVars: string[];
outputVar?: string;
model?: string;
outputSchemaName?: string;
outputSchema?: Record<string, any>;
description?: string;
depends_on_var?: string;
}
export interface ClarificationQueryStep {
type: "clarification_query";
questionToUser: string;
expectedResponseVar: string;
description?: string;
depends_on_var?: string;
}
export type WorkflowStep =
| ToolCallStep
| LLMProcessStep
| ClarificationQueryStep;
export interface WorkflowDefinition {
id: string;
name: string;
description: string;
triggers: string[];
steps: WorkflowStep[];
expectedFinalOutputVars?: string[];
finalResponsePromptTemplateKey?: string;
}
export interface DynamicWorkflowPlan {
id?: string; // Added optional ID for the plan itself
goal: string;
reasoning: string;
steps: WorkflowStep[];
estimatedComplexity?: "low" | "medium" | "high";
requires_clarification?: boolean;
clarification_question?: string | null;
}
export interface WorkflowState {
currentStepIndex: number;
variables: Record<string, any>;
status: "pending" | "running" | "waiting_for_user" | "completed" | "failed";
error?: string | null;
clarificationPending?: string | null;
isPartialPlan?: boolean;
continuationSummary?: string | null;
fullPlanGoal?: string;
executedStepsHistory: string[];
startTime?: number;
activeWorkflowId?: string | null;
dynamicPlan?: DynamicWorkflowPlan | null;
sessionId: string;
userId: string; // Added userId to WorkflowState
}
// --- Locally Defined Types (based on tool usage) ---
export interface SportsTeamData {
id: string;
name: string;
shortName?: string | null;
sport: string;
league: string;
leagueId?: string | null;
formedYear?: string | null;
gender?: string | null;
country?: string | null;
stadium?: string | null;
stadiumLocation?: string | null;
website?: string | null;
description?: string | null;
badgeUrl?: string | null;
logoUrl?: string | null;
bannerUrl?: string | null;
}
export interface SportsEventData {
id: string;
name: string;
sport: string;
league: string;
season: string;
round?: string | null;
homeTeamId: string;
homeTeamName: string;
awayTeamId: string;
awayTeamName: string;
homeScore?: number | null;
awayScore?: number | null;
date: string;
time?: string | null;
dateTimeUtc?: string | null;
venue?: string | null;
city?: string | null;
country?: string | null;
status?: string | null;
postponed?: boolean;
thumbnailUrl?: string | null;
videoUrl?: string | null;
}
export interface RedditPost {
hnLink: any;
id: string;
title: string;
subreddit: string;
author: string | null;
score: number | null;
numComments: number | null;
permalink: string;
url: string | null;
selfText: string | null;
createdUtc: number | null;
isSelf: boolean;
thumbnailUrl: string | null;
}
export interface HolidayData {
date: string;
name: string;
type: string;
rule?: string;
}
export interface HackerNewsStory {
id: number;
objectID: string;
title: string;
url: string | null;
points: number | null;
author: string | null;
numComments: number | null;
createdAt: string | null;
type: string;
text: string | null;
hnLink: string;
}
export interface TicketmasterEvent {
name: string;
type: string;
id: string;
test?: boolean;
url?: string;
locale?: string;
images?: Array<{ url: string; width?: number; height?: number }>;
dates?: {
start?: { localDate: string; localTime?: string; dateTime?: string };
end?: { localDate: string; localTime?: string; dateTime?: string };
timezone?: string;
status?: { code: string };
};
classifications?: Array<{
segment?: { name: string };
genre?: { name: string };
subGenre?: { name: string };
type?: { id: string; name: string };
subType?: { id: string; name: string };
}>;
promoter?: { name: string };
priceRanges?: Array<{
type: string;
currency: string;
min: number;
max: number;
}>;
_embedded?: {
venues?: Array<{
name: string;
city?: { name: string };
state?: { stateCode?: string };
country?: { countryCode: string };
}>;
attractions?: Array<{ name: string }>;
};
}
// --- Workflow Preferences ---
export interface UserWorkflowPreferences {
newsKeywords?: string[];
newsSources?: string[];
newsPreferredCategories?: ("business" | "entertainment" | "general" | "health" | "science" | "sports" | "technology")[];
contentRadarSubreddits?: string[];
contentRadarRssUrls?: string[];
redditPreferredSubreddits?: string[];
youtubePreferredChannels?: string[];
hackernewsPreferredTopics?: string[];
recipePreferredCuisines?: string[];
recipePreferredDiets?: string[];
sportsPreferredTeams?: string[];
sportsPreferredLeagues?: string[];
webSearchPreferredSources?: string[];
interestCategories?: ("sports" | "cinema" | "tvshows" | "politics" | "tech" | "anime" | "gaming" | "music" | "books" | "science" | "travel" | "cooking" | "fashion" | "finance" | "health" | "art")[];
trackedMarketAssets?: {
id: string;
type: "crypto" | "stock" | "nft";
alertThreshold?: number;
}[];
localConditions?: {
type: "aqi" | "pollen" | "transit";
threshold?: number;
transitRouteId?: string;
}[];
webWatchers?: { url: string; selector: string; watchKey: string }[];
learningTopics?: string[];
creativeInterests?: string[];
importantDates?: { label: string; date: string }[];
entertainmentGenres?: {
type: "movie" | "music" | "game";
genres: string[];
}[];
sleepGoalHours?: number;
activityGoalSteps?: number;
dailyBriefingTime?: string; // format: "HH:MM"
dailyBriefingEnabled?: boolean;
dailyBriefingIncludeNews?: boolean;
dailyBriefingIncludeWeather?: boolean;
dailyBriefingIncludeCalendar?: boolean;
dailyBriefingIncludeReminders?: boolean;
}
// --- Data Analysis Types ---
export interface DataAnalysisInput {
userId: string;
fileId?: string;
fileName?: string;
fileType?: string;
userGoal?: string;
dataProfile?: DataProfile;
analysisType?: "sum" | "average" | "count" | "group_by" | "filter" | "time_series" | "top_n";
targetColumn?: string;
groupByColumns?: string[];
dateColumn?: string;
filterCriteria?: Record<string, any>;
topN?: number;
analysisResult?: AnalysisResultData;
visualizationType?: "line" | "bar" | "pie" | "table" | "auto";
title?: string;
xAxisLabel?: string;
yAxisLabel?: string;
}
export interface ParsedDataObject {
headers: string[];
rows: (string | number | null)[][];
rowCount: number;
columnCount: number;
fileName?: string;
fileType?: string;
}
export interface ExtractedRelationship {
subj: string;
pred: string;
obj: string;
qualifiers?: Array<{ key: string; value: any; }> | null;
language?: string | null;
}
export interface DataProfile {
rowCount: number;
columnCount: number;
columnDetails: {
[header: string]: {
originalHeader: string;
inferredType:
| "Number"
| "Text"
| "Date"
| "Currency"
| "Category"
| "Identifier"
| "Location"
| "Boolean"
| "Unknown";
semanticMeaning?:
| "SalesRevenue"
| "ExpenseAmount"
| "Date"
| "ProductName"
| "CustomerID"
| "ExpenseCategory"
| "TransactionID"
| "Quantity"
| "Other";
missingValues?: number;
uniqueValues?: number;
sampleValues?: (string | number | boolean | null)[];
min?: number | string | null;
max?: number | string | null;
mean?: number | null;
median?: number | null;
stddev?: number | null;
};
};
potentialDateColumns?: string[];
potentialRevenueColumns?: string[];
potentialExpenseColumns?: string[];
potentialCategoryColumns?: string[];
potentialIdColumns?: string[];
warnings?: string[];
fileName?: string;
fileType?: string;
}
export interface AnalysisPlanStep {
step: number;
tool:
| "DataParsingTool"
| "DataProfilingTool"
| "DataAnalysisTool"
| "VisualizationTool"
| string;
args: Record<string, any>;
depends_on?: number[] | null;
parallel_group?: string | null;
reasoning?: string | null;
inputDataRef?: string;
outputDataRef?: string;
analysisType?:
| "sum"
| "average"
| "count"
| "group_by"
| "filter"
| "time_series"
| "top_n";
visualizationType?: "line" | "bar" | "pie" | "table" | "auto";
}
export interface AnalysisPlan {
thought_process: string;
plan: AnalysisPlanStep[];
requires_clarification: boolean;
clarification_question: string | null;
dataProfileSummary?: string;
analysisGoal: string;
}
export interface AnalysisResultData {
type: "table" | "chart_data" | "summary" | "text_insight";
title?: string;
description?: string;
data?:
| Record<string, any>[]
| {
x: (string | number | Date)[];
y: (string | number)[];
seriesName?: string;
type: "line" | "bar" | "pie" | "scatter";
}
| string;
chartSpec?: any;
error?: string;
}
export interface DataAnalysisResponse extends OrchestratorResponse {
analysisId: string;
status:
| "parsing"
| "profiling"
| "clarifying_goal"
| "planning_analysis"
| "analyzing_data"
| "generating_visualization"
| "summarizing_results"
| "complete"
| "error";
message?: string;
analysisResults?: AnalysisResultData[];
dataProfile?: DataProfile;
analysisPlan?: AnalysisPlan;
error?: string | null;
}
// --- Basic Message Structures ---
export type ChatMessageContentPartText = { type: "text"; text: string };
export type ChatMessageContentPartInputImage = {
type: "input_image";
image_url: string; // Can be data URI, http(s) URL, or supabase_storage:path
detail?: "auto" | "low" | "high";
};
export type ChatMessageContentPart =
| ChatMessageContentPartText
| ChatMessageContentPartInputImage;
export type MessageAttachment = {
id?: string;
type: 'image' | 'video' | 'audio' | 'document' | 'data_file' | string; 
url: string; 
name?: string;
size?: number;
mimeType?: string;
file?: File | Blob; 
storagePath?: string; 
};

// Refined ChatMessage type
export type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | ChatMessageContentPart[] | null;
  name?: string; // Optional name (e.g., tool name for role 'tool', user name for role 'user')
  timestamp?: string | number;
  structured_data?: AnyToolStructuredData | null;
  attachments?: MessageAttachment[];
  audioUrl?: string;
  debugInfo?: OrchestratorResponse['debugInfo'] | null;
  workflowFeedback?: OrchestratorResponse['workflowFeedback'] | null;
  intentType?: string | null;
  ttsInstructions?: string | null;
  annotations?: any[] | null; // Consider defining a more specific type if used consistently
  clarificationQuestion?: string | null;
  error?: boolean;
  isAudioMessage?: boolean; // Flag to identify if this is an audio message
} & ( // Role-specific properties
  | { role: "assistant"; tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | null; }
  | { role: "tool"; tool_call_id: string; } // `tool_call_id` is required for role 'tool'
  | { role: "user"; tool_calls?: never; tool_call_id?: never; } // User messages should not have tool_calls/tool_call_id
  | { role: "system"; tool_calls?: never; tool_call_id?: never; } // System messages should not have tool_calls/tool_call_id
);


export type ResponseApiInputTextPart = { type: "input_text"; text: string };
export type ResponseApiInputImagePart = {
type: "input_image";
image_url: string;
detail?: "low" | "high" | "auto";
};
export type ResponseApiInputFilePart = {
type: "input_file";
file_id?: string;
filename?: string;
file_data?: string;
};
export type ResponseApiInputContent =
| ResponseApiInputTextPart
| ResponseApiInputImagePart
| ResponseApiInputFilePart;
export type ResponseApiInputMessage =
| { role: "system"; content: string; name?: string }
| { role: "user"; content: string | ResponseApiInputContent[]; name?: string }
| {
role: "assistant";
content: string | null | ChatMessageContentPart[];
name?: string;
tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}
| { role: "tool"; tool_call_id: string; content: string; name?: string }
| { type: "function_call_output"; call_id: string; output: string };
// --- Memory Framework Types Re-export ---
export type ReminderDetails = MemoryFrameworkReminderDetails;
export type ExtractedEntity = MemoryFrameworkExtractedInfo["entities"][number];
export type ExtractedInfo = MemoryFrameworkExtractedInfo;
export type BaseMemoryUnit = Omit<MemoryFrameworkStoredMemoryUnit, "embedding"> & {
embedding?: number[] | null;
};
export type StoredMemoryUnit = MemoryFrameworkStoredMemoryUnit;
export type SearchResult = MemoryFrameworkSearchResult;
export type {
PaginationParams,
PaginatedResults,
SearchOptions,
LatestGraphInfo,
};
// --- Cached Data Structures for Tool Outputs ---
export interface CachedYouTubeVideo {
videoId: string;
title: string;
description: string | null;
channelTitle: string | null;
publishedAt: string | null;
thumbnailUrl: string | null;
videoUrl: string; // Watch URL
embedUrl?: string; // Added for embedding
}
export interface CachedTikTokVideo {
videoId?: string;
title: string | null;
description: string | null;
channel: string | null;
date: string | null;
thumbnailUrl: string | null;
videoUrl: string;
embedUrl?: string; // Added for embedding
source: "TikTok";
duration?: string | null;
result_type: "tiktok_video";
source_api: string;
}
export interface CachedImage {
id: string;
title: string | null;
description: string | null;
imageUrlSmall: string;
imageUrlRegular: string;
imageUrlFull?: string;
photographerName: string | null;
photographerUrl: string | null;
sourceUrl: string;
sourcePlatform: "unsplash" | "pexels" | "serper_images" | "other";
avgColor?: string;
width?: number; // Added
height?: number; // Added
}
export interface CachedProduct {
productId: string | null;
title: string;
price: number | null;
currency: string | null;
source: string;
link: string;
imageUrl: string | null;
rating: number | null;
ratingCount: number | null;
delivery?: string | null;
offers?: string | null;
result_type: "product";
source_api: string;
}
export interface CachedRecipe {
query: any;
title: string;
sourceName: string | null;
sourceUrl: string;
imageUrl: string | null;
ingredients?: string[];
instructions?: string[];
readyInMinutes?: number | null;
servings?: number | null;
category?: string;
area?: string;
tags?: string[];
youtubeUrl?: string;
result_type: "recipe_detail"; // Changed from "recipe" to be more specific if detailed
source_api: string;
error: undefined;
}
export interface CachedWeather {
locationName: string;
description: string;
temperatureCelsius: number | null;
temperatureFahrenheit: number | null;
feelsLikeCelsius: number | null;
feelsLikeFahrenheit: number | null;
humidityPercent: number | null;
windSpeedKph: number | null;
windDirection: string | null;
iconCode?: string | null;
timestamp: string;
}
export interface CachedPlace {
placeId?: string;
osmId?: string;
displayName: string;
latitude: number;
longitude: number;
address?: Record<string, string>;
category?: string;
sourcePlatform: "nominatim" | "google_places" | "other";
}
export interface CachedWebSnippet {
title: string | null;
link: string | null;
snippet: string;
source: "serper_organic" | "serper_news" | "other";
result_type: "web_snippet";
source_api: string;
}
export interface CachedCalculationOrFact {
query: string;
result: string | null;
interpretation?: string | null;
sourcePlatform: "wolframalpha" | "llm" | "internal_calculator" | "other";
error?: string;
}
export interface CachedAnswerBox {
answer?: string;
snippet?: string;
snippetHighlighted?: string[];
title?: string;
link?: string;
sourcePlatform: "serper_answerbox";
result_type: "answerBox";
source_api: string;
}
export interface CachedKnowledgeGraph {
title?: string;
type?: string;
description?: string;
imageUrl?: string;
attributes?: Record<string, string>;
link?: string;
source?: string;
sourcePlatform: "serper_kg";
result_type: "knowledgeGraph";
source_api: string;
}
export interface CalendarEvent {
id: string;
summary: string;
start: string | null;
end: string | null;
location: string | null;
description: string | null;
isAllDay: boolean;
status: string | null;
organizer: string | null;
attendees: string[];
url: string | null;
formattedTime?: string;
}
export interface EmailHeader {
id: string;
threadId: string;
subject: string;
from: string;
fromRaw?: string | null;
to: string | null;
cc?: string | null;
date: string | null;
dateRaw?: string | null;
snippet: string | null;
messageIdHeader?: string | null;
bodySummary?: string | null;
}
export interface NewsArticle {
title: string;
description: string | null;
url: string;
sourceName: string;
publishedAt: string | null;
imageUrl?: string | null;
sourceFavicon?: string;
}
export interface InternalTask {
id: string;
content: string;
status: "pending" | "completed";
due_date: string | null;
created_at: string;
updated_at: string;
}
export interface CachedProductList {
result_type: "product_list";
source_api: string;
products: CachedProduct[];
query?: Record<string, any>;
error?: string;
}
export interface CachedImageList {
result_type: "image_list";
source_api: string;
images: CachedImage[];
query?: Record<string, any>;
error?: string;
}
export interface CachedVideoList {
result_type: "video_list" | "tiktok_video"; // Can be either
source_api: string; // e.g., "youtube", "serper_tiktok"
videos: (CachedYouTubeVideo | CachedTikTokVideo)[]; // Union type for videos
query?: Record<string, any>;
error?: string;
}
export interface CalendarEventList {
result_type: "calendar_events";
source_api: string;
events: CalendarEvent[];
query?: Record<string, any>;
error?: string;
}
export interface EmailHeaderList {
result_type: "email_headers";
source_api: string;
emails: EmailHeader[];
query?: Record<string, any>;
error?: string;
}
export interface NewsArticleList {
result_type: "news_articles";
source_api: string;
articles: NewsArticle[];
query?: Record<string, any>;
error?: string;
}
export interface CachedSingleRecipe {
result_type: "recipe"; // This specific type should be used if a single recipe is fetched
source_api: string;
recipe: CachedRecipe | null;
query?: Record<string, any>;
error?: string;
}
export interface CachedSingleWeather {
result_type: "weather";
source_api: string;
weather: CachedWeather | null;
query?: Record<string, any>;
error?: string;
}
export interface CachedSinglePlace {
result_type: "place";
source_api: string;
place: CachedPlace | null;
query?: Record<string, any>;
error?: string;
}
export interface CachedSingleFact {
result_type: "calculation_or_fact";
source_api: string;
data: CachedCalculationOrFact | null;
query?: Record<string, any>;
error?: string;
}
export interface CachedSingleWebResult {
result_type: "web_snippet" | "answerBox" | "knowledgeGraph";
source_api: string;
data: CachedWebSnippet | CachedAnswerBox | CachedKnowledgeGraph | null;
query?: Record<string, any>;
error?: string;
}
export interface DateTimeStructuredOutput {
result_type: string;
source_api: string;
query: any;
processedTimeUTC: string;
isContextBased: boolean;
primaryLocation: {
inputLocation: string;
resolvedTimezone: string | null;
currentTime: string | null;
currentDate: string | null;
dayOfWeek: string | null;
utcOffset: string | null;
isNighttime?: boolean;
error: string | null;
};
allRequestedLocations?: Array<{
inputLocation: string;
resolvedTimezone: string | null;
currentTime: string | null;
currentDate: string | null;
dayOfWeek: string | null;
utcOffset: string | null;
isNighttime?: boolean;
error: string | null;
}>;
error?: string;
format?: string;
isAudioResponse?: boolean;
}
// export interface GeolocationStructuredOutput {
// result_type: "geolocation";
// source_api: "geolocation_tool";
// queryIP: string | null;
// status: "success" | "local_ip" | "error";
// city: string | null;
// regionCode: string | null;
// regionName: string | null;
// countryCode: string | null;
// countryName: string | null;
// zipCode: string | null;
// latitude: number | null;
// longitude: number | null;
// timezone: string | null;
// isp?: string | null;
// organization?: string | null;
// asn?: string | null;
// errorMessage: string | null;
// query?: Record<string, any>;
// error?: string;
// }
export interface HackerNewsStructuredOutput {
result_type: "hn_stories";
source_api: "hackernews";
query?: Record<string, any>;
sourceDescription: string;
count: number;
stories: HackerNewsStory[];
error: string | null;
}
export interface SportsStructuredOutput {
result_type: "sports_info";
source_api: "thesportsdb";
query?: Record<string, any>;
teamInfo?: SportsTeamData | null;
event?: SportsEventData | null;
eventsList?: SportsEventData[] | null;
error?: string | null;
}
// export interface PublicHolidayStructuredOutput {
// result_type: "holiday";
// source_api: "date-holidays";
// query?: Record<string, any>;
// location: string;
// year?: number | null;
// queryDate?: string | null;
// isHoliday?: boolean | null;
// holiday?: HolidayData | null;
// holidays?: HolidayData[] | null;
// error?: string | null;
// }
export interface RedditStructuredOutput {
result_type: "reddit_posts";
source_api: "reddit";
query?: Record<string, any>;
subreddit: string;
filter: string;
time?: string | undefined;
count: number;
posts: RedditPost[];
error?: string | null;
}
export interface EventFinderStructuredOutput {
result_type: "event_list";
source_api: "ticketmaster";
query?: Record<string, any>;
locationDescription: string;
count: number;
totalFound?: number;
events: TicketmasterEvent[];
error?: string | null;
}
// export interface HabitTrackerStructuredOutput {
// result_type: "habit_log_confirmation" | "habit_log_list";
// source_api: "internal_db";
// query?: Record<string, any>;
// action: "log" | "check" | "status";
// status:
// | "logged"
// | "already_logged"
// | "completed"
// | "not_completed"
// | "retrieved_status"
// | "no_logs"
// | "error";
// habit?: string | null;
// date?: string | null;
// period?: "today" | "week" | "month";
// startDate?: string | null;
// endDate?: string | null;
// wasLogged?: boolean | null;
// loggedHabits?: { [habitName: string]: string[] } | null;
// message?: string;
// errorMessage?: string | null;
// error?: string;
// }
// export interface MapLinkStructuredOutput {
// result_type: "map_link";
// source_api: "map_tool";
// query?: Record<string, any>;
// mapProvider: "google" | "apple";
// mapUrl: string;
// type: "location" | "directions";
// location?: string;
// origin?: string;
// destination?: string;
// error?: string;
// }
// export interface MoodJournalStructuredOutput {
// result_type: "mood_journal_log";
// source_api: "internal_db";
// query?: Record<string, any>;
// status: "success" | "error";
// logId?: number;
// timestamp?: string;
// loggedMood?: string | null;
// loggedRating?: number | null;
// errorMessage?: string | null;
// error?: string;
// }
// export interface SunriseSunsetStructuredOutput {
// result_type: "sun_times";
// source_api: "suncalc";
// query?: Record<string, any>;
// resolvedLat: number | null;
// resolvedLon: number | null;
// resolvedLocation: string;
// date: string;
// timezone: string | null;
// coordSource: string;
// sunriseISO: string | null;
// sunsetISO: string | null;
// sunriseLocal: string | null;
// sunsetLocal: string | null;
// error?: string | null;
// }
// export interface WaterIntakeStructuredOutput {
// message: string;
// result_type: "water_intake_result";
// source_api: "internal_db";
// query?: Record<string, any>;
// action: "log" | "get_total";
// status: "logged" | "retrieved_total" | "error";
// date: string;
// amountLoggedMl?: number | null;
// totalTodayMl?: number | null;
// totalTodayOz?: number | null;
// totalQueriedMl?: number | null;
// totalQueriedOz?: number | null;
// errorMessage?: string | null;
// error?: string;
// }
export interface MemoryToolResult {
result_type: "internal_memory_result";
source_api: "internal_memory";
query?: Record<string, any>;
found: boolean;
count: number;
memories?: Array<{
memory_id: string;
content: string;
updated_at: string;
score?: number | null;
is_latest_fact?: boolean | null;
memory_type?: string | null; // Added from MemoryItemProps
}> | null;
confirmation_message?: string;
memory_id?: string;
error?: string;
}
// export interface InternalTaskResult {
// result_type: "internal_tasks";
// source_api: "internal_memory";
// query: Record<string, any>;
// action: "add_task" | "list_tasks" | "complete_task";
// status:
// | "task_added"
// | "tasks_listed"
// | "task_completed"
// | "already_completed"
// | "not_found"
// | "error";
// tasks?: InternalTask[] | null;
// filter?: "pending" | "completed" | "all";
// error?: string | null;
// }
export interface ReminderInfo {
content: any;
metadata: any;
memory_id: string;
user_id: string;
original_content: string;
trigger_datetime: string;
recurrence_rule: ReminderDetails["recurrence_rule"];
status: ReminderDetails["status"];
last_sent_at?: string | null;
error_message?: string | null;
similarity?: number | null;
}
export interface ReminderResult {
result_type: "reminders";
source_api: "internal_memory";
query?: Record<string, any>;
reminders: ReminderInfo[];
confirmation_message?: string;
reminder_id?: string;
error?: string | null;
}
export interface AnalysisTableResult {
result_type: "analysis_table";
source_api: "data_analysis_tool";
analysis: AnalysisResultData;
error?: string;
}
export interface AnalysisChartResult {
result_type: "analysis_chart";
source_api: "data_analysis_tool";
analysis: AnalysisResultData;
error?: string;
}
export interface AnalysisSummaryResult {
result_type: "analysis_summary";
source_api: "data_analysis_tool";
analysis: AnalysisResultData;
error?: string;
}
// export interface DataParsedOutput {
// result_type: "parsed_data_internal";
// source_api: "internal_parser";
// data: ParsedDataObject;
// error?: string;
// }
export interface DataProfileOutput {
result_type: "data_profile_internal";
source_api: "internal_profiler_llm";
data: DataProfile;
error?: string;
}
export interface GenericStructuredOutput {
result_type: "generic" | string;
source_api?: string;
query?: Record<string, any>;
error?: string | null;
data?: any;
[key: string]: any;
}
export interface PermissionDeniedResult {
result_type: "permission_denied";
source_api: string;
message: string;
query?: Record<string, any>;
error?: string;
}
export type AnyToolStructuredData =
| CachedProductList
| CachedImageList
| CachedVideoList
| CalendarEventList
| EmailHeaderList
| NewsArticleList
| CachedSingleRecipe
| CachedSingleWeather
| CachedSinglePlace
| CachedSingleFact
| CachedSingleWebResult
| DateTimeStructuredOutput
// | GeolocationStructuredOutput
| EventFinderStructuredOutput
| HackerNewsStructuredOutput
// | HabitTrackerStructuredOutput
// | MapLinkStructuredOutput
// | MoodJournalStructuredOutput
// | PublicHolidayStructuredOutput
| RedditStructuredOutput
| SportsStructuredOutput
// | SunriseSunsetStructuredOutput
// | WaterIntakeStructuredOutput
| MemoryToolResult
// | InternalTaskResult
| ReminderResult
| AnalysisTableResult
| AnalysisChartResult
| AnalysisSummaryResult
// | DataParsedOutput
// | DataProfileOutput
| PermissionDeniedResult
| GenericStructuredOutput;
// --- Database Table Schemas ---
export type UserProfile = {
id: string;
email?: string | null;
full_name?: string | null;
first_name?: string | null;
avatar_url?: string | null;
};
export type UserJournalEntry = {
id: number;
user_id: string;
created_at: string;
entry_text: string;
mood_label?: string | null;
mood_rating?: number | null;
};
export type UserHabitLog = {
id: number;
user_id: string;
habit_name: string;
log_date: string;
created_at: string;
};
export type UserWaterLog = {
id: number;
user_id: string;
log_datetime: string;
amount_ml: number;
};
export type UserPushSubscription = {
endpoint: string;
keys: { p256dh: string; auth: string };
user_id?: string;
};
export type UserState = {
user_id: string;
active_persona_id?: string | null;
preferred_locale?: string | null;
last_interaction_at?: string | Date | null;
user_first_name?: string | null;
latitude?: number | null;
longitude?: number | null;
timezone?: string | null;
country_code?: string | null;
onboarding_complete?: boolean | null;
require_tool_confirmation?: boolean | null;
notifications_enabled?: boolean | null;
googlecalendarenabled?: boolean | null;
googleemailenabled?: boolean | null;
chainedvoice?: OpenAITtsVoice | string | null;
realtimevoice?: OpenAIRealtimeVoice | string | null;
toolconfirmation?: boolean | null;
workflow_preferences?: UserWorkflowPreferences | null;
};
export type Streak = {
user_id: string;
streak_type: string;
current_streak: number;
longest_streak: number;
last_incremented_at: string;
};
export type UserIntegration = {
user_id: string;
provider: "google" | string;
created_at: string;
updated_at: string;
access_token_encrypted?: string | null;
refresh_token_encrypted?: string | null;
token_expires_at?: string | null;
scopes?: string[] | null;
status: "active" | "revoked" | "error";
last_error?: string | null;
};
export type PredefinedPersona = {
id: string;
name: string;
description: string;
system_prompt: string;
voice_id: string | null;
is_public: boolean;
};
export type UserPersona = {
id: string;
user_id: string;
name: string;
description?: string | null;
system_prompt: string;
voice_id: string | null;
created_at: string;
updated_at: string;
};
export type Persona =
| PredefinedPersona
| (UserPersona & { isCustom?: boolean; traits?: string[]; preferredTools?: string[]; avoidTools?: string[]; style?: string; tone?: string });
// --- Base Tool Output ---
export type ToolOutput = BaseToolOutputDef;
// --- OpenAI Model Names ---
export type OpenAILLMComplex = "gpt-4.1-2025-04-14" | "gpt-4o" | string;
export type OpenAILLMBalanced = "gpt-4.1-mini-2025-04-14" | "gpt-4o" | "gpt-4o-mini" | string;
export type OpenAILLMFast = "gpt-4.1-nano-2025-04-14" | "gpt-4o-mini" | string;
export type OpenAIEmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large" | string;
export type OpenAISttModel = "gpt-4o-mini-transcribe" | "gpt-4o-transcribe" | "whisper-1" | string;
export type OpenAITtsModel = "gpt-4o-mini-tts" | "tts-1" | "tts-1-hd" | string;
export type OpenAIRealtimeModel = "gpt-4o-mini-realtime-preview-2024-12-17" | "gpt-4o-realtime-preview" | string;
export type OpenAIPlanningModel = "o4-mini-2025-04-16" | OpenAILLMFast | string;
export type OpenAIVisionModel = "gpt-4.1-mini-2025-04-14" | "gpt-4o" | "gpt-4-turbo" | string;
export type OpenAIDeveloperModel = "o3-mini-2025-01-31" | string;
// --- OpenAI Voice IDs ---
export type OpenAITtsVoice =
| "alloy" | "ash" | "ballad" | "coral" | "echo" | "fable"
| "nova" | "onyx" | "sage" | "shimmer" | "verse";
export type OpenAIRealtimeVoice =
| "alloy" | "ash" | "ballad" | "coral" | "echo"
| "fable" | "nova" | "onyx" | "sage" | "shimmer" | "verse";
// --- Orchestrator API Response ---
export type WorkflowFeedback = {
    workflowName?: string;
    currentStepDescription: string;
    status: string;
    progress?: number;
};

export type OrchestratorResponse = {
    sessionId: string;
    response: string | null;
    error?: string | null;
    lang: string;
    intentType?: string | null;
    ttsInstructions?: string | null;
    clarificationQuestion?: string | null;
    clarificationDetails?: {
        reason: string;
        toolName?: string;
        argumentErrors?: any;
        toolResolutionConfidence?: string;
        [key: string]: any;
    } | null;
    audioUrl?: string | null;
    structuredData?: AnyToolStructuredData | null;
    workflowFeedback?: WorkflowFeedback | null;
    debugInfo?: {
        flow_type?: string;
        llmModelUsed?: string;
        workflowPlannerModelUsed?: string;
        llmUsage?: CompletionUsage;
        latencyMs?: number;
        toolCalls?: any[];
        videoSummaryUsed?: string | null;
    };
    transcription?: string | null;
    llmUsage?: CompletionUsage | null;
    attachments?: MessageAttachment[];
    isAudioMessage?: boolean; // Flag to identify if this is an audio message
};
// --- Realtime API Types (aligned with OpenAI documentation) ---
export type RealtimeInputAudioTranscriptionConfig = {
model?: OpenAISttModel;
prompt?: string;
language?: string;
};
export type RealtimeTurnDetectionConfig = {
type: "server_vad" | "semantic_vad";
threshold?: number;
prefix_padding_ms?: number;
silence_duration_ms?: number;
eagerness?: "low" | "medium" | "high" | "auto";
create_response?: boolean;
interrupt_response?: boolean;
};
export type RealtimeInputAudioNoiseReductionConfig = {
type: "near_field" | "far_field";
};
export type RealtimeSessionCreationPayload = {
model: OpenAIRealtimeModel;
voice?: OpenAIRealtimeVoice;
instructions?: string;
modalities?: Array<"audio" | "text">;
input_audio_format?: "pcm16" | "g711_ulaw" | "g711_alaw";
output_audio_format?: "pcm16" | "g711_ulaw" | "g711_alaw";
input_audio_transcription?: RealtimeInputAudioTranscriptionConfig | null;
turn_detection?: RealtimeTurnDetectionConfig | null;
input_audio_noise_reduction?: RealtimeInputAudioNoiseReductionConfig | null;
tools?: (OpenAI.Responses.Tool)[] | null;
tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | null;
temperature?: number;
max_response_output_tokens?: number | "inf";
metadata?: Record<string, any>;
include?: string[];
};
export type RealtimeSessionConfig = RealtimeSessionCreationPayload;
export type RealtimeSessionResponse = {
id: string;
object: "realtime.session" | "realtime.transcription_session";
model: OpenAIRealtimeModel;
voice?: OpenAIRealtimeVoice;
instructions?: string;
modalities?: Array<"audio" | "text">;
input_audio_format?: string;
output_audio_format?: string;
input_audio_transcription?: RealtimeInputAudioTranscriptionConfig | null;
turn_detection?: RealtimeTurnDetectionConfig | null;
input_audio_noise_reduction?: RealtimeInputAudioNoiseReductionConfig | null;
tools?: any[] | null;
tool_choice?: any | null;
temperature?: number;
max_response_output_tokens?: number | "inf";
client_secret: { value: string; expires_at: number | string };
expires_at?: number | string;
include?: string[];
};
export type RealtimeClientEventBase = { event_id?: string; };
export interface RealtimeClientToServerUpdate extends RealtimeClientEventBase {
type: "session.update";
session: Partial<RealtimeSessionConfig>;
}
export interface RealtimeClientInputAudioAppend extends RealtimeClientEventBase {
type: "input_audio_buffer.append";
audio: string;
}
export interface RealtimeClientInputAudioCommit extends RealtimeClientEventBase {
type: "input_audio_buffer.commit";
}
export interface RealtimeClientInputAudioClear extends RealtimeClientEventBase {
type: "input_audio_buffer.clear";
}
export type RealtimeInputTextContentPart = { type: "input_text"; text: string };
export type RealtimeInputImageContentPart = {
type: "input_image";
image_url: string;
detail?: "low" | "high" | "auto";
};
export type RealtimeInputAudioContentPart = {
type: "input_audio";
audio: string;
format?: "pcm16" | "g711_ulaw" | "g711_alaw";
};
export type RealtimeItemReferenceContentPart = { type: "item_reference"; id: string; };
export type RealtimeMessageContentPart =
| RealtimeInputTextContentPart
| RealtimeInputImageContentPart
| RealtimeInputAudioContentPart;
export type RealtimeConversationItemContent = RealtimeMessageContentPart[];
export type RealtimeConversationItemBase = {
id?: string;
status?: "in_progress" | "completed" | "failed";
metadata?: Record<string, any>;
};
export interface RealtimeConversationMessageItem extends RealtimeConversationItemBase {
type: "message";
role: "user" | "assistant";
content: RealtimeConversationItemContent;
}
export interface RealtimeFunctionCallItem extends RealtimeConversationItemBase {
type: "function_call";
name: string;
call_id: string;
arguments: string;
}
export interface RealtimeFunctionCallOutputItem extends RealtimeConversationItemBase {
type: "function_call_output";
call_id: string;
output: string;
}
export type RealtimeConversationItem =
| RealtimeConversationMessageItem
| RealtimeFunctionCallItem
| RealtimeFunctionCallOutputItem;
export interface RealtimeClientCreateConversationItem extends RealtimeClientEventBase {
type: "conversation.item.create";
item: RealtimeConversationItem;
previous_item_id?: string | null;
}
export interface RealtimeClientRetrieveConversationItem extends RealtimeClientEventBase {
type: "conversation.item.retrieve";
item_id: string;
}
export interface RealtimeClientTruncateConversationItem extends RealtimeClientEventBase {
type: "conversation.item.truncate";
item_id: string;
content_index: number;
audio_end_ms: number;
}
export interface RealtimeClientDeleteConversationItem extends RealtimeClientEventBase {
type: "conversation.item.delete";
item_id: string;
}
export interface RealtimeClientCreateResponse extends RealtimeClientEventBase {
type: "response.create";
response?: {
conversation?: "none" | string;
metadata?: Record<string, any>;
modalities?: Array<"text" | "audio">;
input?: Array<RealtimeConversationItem | RealtimeItemReferenceContentPart>;
instructions?: string;
voice?: OpenAIRealtimeVoice;
output_audio_format?: RealtimeSessionConfig["output_audio_format"];
tools?: OpenAI.Responses.Tool[];
tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
temperature?: number;
max_output_tokens?: number | "inf";
};
}
export interface RealtimeClientCancelResponse extends RealtimeClientEventBase {
type: "response.cancel";
response_id?: string;
}
export interface RealtimeClientTranscriptionSessionUpdate extends RealtimeClientEventBase {
type: "transcription_session.update";
session: Partial<{
input_audio_format: RealtimeSessionConfig["input_audio_format"];
input_audio_transcription: RealtimeInputAudioTranscriptionConfig;
turn_detection: RealtimeTurnDetectionConfig;
input_audio_noise_reduction: RealtimeInputAudioNoiseReductionConfig;
include: string[];
}>;
}
export interface RealtimeClientOutputAudioClear extends RealtimeClientEventBase {
type: "output_audio_buffer.clear";
}
export type AnyRealtimeClientToServerEvent =
| RealtimeClientToServerUpdate
| RealtimeClientInputAudioAppend
| RealtimeClientInputAudioCommit
| RealtimeClientInputAudioClear
| RealtimeClientCreateConversationItem
| RealtimeClientRetrieveConversationItem
| RealtimeClientTruncateConversationItem
| RealtimeClientDeleteConversationItem
| RealtimeClientCreateResponse
| RealtimeClientCancelResponse
| RealtimeClientTranscriptionSessionUpdate
| RealtimeClientOutputAudioClear;
export interface RealtimeServerEventBase {
type: string;
event_id: string;
}
export interface RealtimeServerErrorEvent extends RealtimeServerEventBase {
type: "error";
error: {
type: string;
code: string;
message: string;
param: string | null;
event_id?: string;
};
}
export interface RealtimeServerSessionCreatedEvent extends RealtimeServerEventBase {
type: "session.created";
session: RealtimeSessionResponse;
}
export interface RealtimeServerSessionUpdatedEvent extends RealtimeServerEventBase {
type: "session.updated";
session: RealtimeSessionResponse;
}
export interface RealtimeServerConversationCreatedEvent extends RealtimeServerEventBase {
type: "conversation.created";
conversation: { id: string; object: "realtime.conversation" };
}
export interface RealtimeServerConversationItemCreatedEvent extends RealtimeServerEventBase {
type: "conversation.item.created";
previous_item_id: string | null;
item: RealtimeConversationItem;
}
export interface RealtimeServerConversationItemRetrievedEvent extends RealtimeServerEventBase {
type: "conversation.item.retrieved";
item: RealtimeConversationItem;
}
export interface RealtimeServerConversationItemInputAudioTranscriptionCompletedEvent extends RealtimeServerEventBase {
type: "conversation.item.input_audio_transcription.completed";
item_id: string;
content_index: number;
transcript: string;
logprobs?: Array<{ token: string; logprob: number; bytes: number[] | null }> | null;
}
export interface RealtimeServerConversationItemInputAudioTranscriptionDeltaEvent extends RealtimeServerEventBase {
type: "conversation.item.input_audio_transcription.delta";
item_id: string;
content_index: number;
delta: string;
logprobs?: Array<{ token: string; logprob: number; bytes: number[] | null }> | null;
}
export interface RealtimeServerConversationItemInputAudioTranscriptionFailedEvent extends RealtimeServerEventBase {
type: "conversation.item.input_audio_transcription.failed";
item_id: string;
content_index: number;
error: { type: string; code: string; message: string; param: string | null };
}
export interface RealtimeServerConversationItemTruncatedEvent extends RealtimeServerEventBase {
type: "conversation.item.truncated";
item_id: string;
content_index: number;
audio_end_ms: number;
}
export interface RealtimeServerConversationItemDeletedEvent extends RealtimeServerEventBase {
type: "conversation.item.deleted";
item_id: string;
}
export interface RealtimeServerInputAudioCommittedEvent extends RealtimeServerEventBase {
type: "input_audio_buffer.committed";
previous_item_id: string | null;
item_id: string;
}
export interface RealtimeServerInputAudioClearedEvent extends RealtimeServerEventBase {
type: "input_audio_buffer.cleared";
}
export interface RealtimeServerInputAudioSpeechStartedEvent extends RealtimeServerEventBase {
type: "input_audio_buffer.speech_started";
audio_start_ms: number;
item_id: string;
}
export interface RealtimeServerInputAudioSpeechStoppedEvent extends RealtimeServerEventBase {
type: "input_audio_buffer.speech_stopped";
audio_end_ms: number;
item_id: string;
}
export interface RealtimeServerResponseCreatedEvent extends RealtimeServerEventBase {
type: "response.created";
response: {
id: string;
object: "realtime.response";
status: "in_progress" | string;
status_details: any | null;
output: RealtimeConversationItem[];
usage: any | null;
metadata?: Record<string,any> | null;
modalities?: Array<"audio" | "text">;
};
}
export interface RealtimeServerResponseDoneEvent extends RealtimeServerEventBase {
type: "response.done";
response: {
id: string;
object: "realtime.response";
status: "completed" | "failed" | "cancelled" | "incomplete";
status_details: any | null;
output: RealtimeConversationItem[];
usage: any | null;
metadata?: Record<string,any> | null;
};
}
export interface RealtimeServerResponseOutputItemAddedEvent extends RealtimeServerEventBase {
type: "response.output_item.added";
response_id: string;
output_index: number;
item: RealtimeConversationItem;
}
export interface RealtimeServerResponseOutputItemDoneEvent extends RealtimeServerEventBase {
type: "response.output_item.done";
response_id: string;
output_index: number;
item: RealtimeConversationItem;
}
export interface RealtimeServerResponseContentPartAddedEvent extends RealtimeServerEventBase {
type: "response.content_part.added";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
part: RealtimeMessageContentPart;
}
export interface RealtimeServerResponseContentPartDoneEvent extends RealtimeServerEventBase {
type: "response.content_part.done";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
part: RealtimeMessageContentPart;
}
export interface RealtimeServerResponseTextDeltaEvent extends RealtimeServerEventBase {
type: "response.text.delta";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
delta: string;
}
export interface RealtimeServerResponseTextDoneEvent extends RealtimeServerEventBase {
type: "response.text.done";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
text: string;
}
export interface RealtimeServerResponseAudioTranscriptDeltaEvent extends RealtimeServerEventBase {
type: "response.audio_transcript.delta";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
delta: string;
}
export interface RealtimeServerResponseAudioTranscriptDoneEvent extends RealtimeServerEventBase {
type: "response.audio_transcript.done";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
transcript: string;
}
export interface RealtimeServerResponseAudioDeltaEvent extends RealtimeServerEventBase {
type: "response.audio.delta";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
delta: string;
}
export interface RealtimeServerResponseAudioDoneEvent extends RealtimeServerEventBase {
type: "response.audio.done";
response_id: string;
item_id: string;
output_index: number;
content_index: number;
}
export interface RealtimeServerResponseFunctionCallArgumentsDeltaEvent extends RealtimeServerEventBase {
type: "response.function_call_arguments.delta";
response_id: string;
item_id: string;
output_index: number;
call_id: string;
delta: string;
}
export interface RealtimeServerResponseFunctionCallArgumentsDoneEvent extends RealtimeServerEventBase {
type: "response.function_call_arguments.done";
response_id: string;
item_id: string;
output_index: number;
call_id: string;
arguments: string;
}
export interface RealtimeServerTranscriptionSessionUpdatedEvent extends RealtimeServerEventBase {
type: "transcription_session.updated";
session: RealtimeSessionResponse;
}
export interface RealtimeServerRateLimitsUpdatedEvent extends RealtimeServerEventBase {
type: "rate_limits.updated";
rate_limits: Array<{ name: string; limit: number; remaining: number; reset_seconds: number; }>;
}
export interface RealtimeServerOutputAudioStartedEvent extends RealtimeServerEventBase {
type: "output_audio_buffer.started";
response_id: string;
}
export interface RealtimeServerOutputAudioStoppedEvent extends RealtimeServerEventBase {
type: "output_audio_buffer.stopped";
response_id: string;
}
export interface RealtimeServerOutputAudioClearedEvent extends RealtimeServerEventBase {
type: "output_audio_buffer.cleared";
response_id: string;
}
export type AnyRealtimeServerToClientEvent =
| RealtimeServerErrorEvent
| RealtimeServerSessionCreatedEvent
| RealtimeServerSessionUpdatedEvent
| RealtimeServerConversationCreatedEvent
| RealtimeServerConversationItemCreatedEvent
| RealtimeServerConversationItemRetrievedEvent
| RealtimeServerConversationItemInputAudioTranscriptionCompletedEvent
| RealtimeServerConversationItemInputAudioTranscriptionDeltaEvent
| RealtimeServerConversationItemInputAudioTranscriptionFailedEvent
| RealtimeServerConversationItemTruncatedEvent
| RealtimeServerConversationItemDeletedEvent
| RealtimeServerInputAudioCommittedEvent
| RealtimeServerInputAudioClearedEvent
| RealtimeServerInputAudioSpeechStartedEvent
| RealtimeServerInputAudioSpeechStoppedEvent
| RealtimeServerResponseCreatedEvent
| RealtimeServerResponseDoneEvent
| RealtimeServerResponseOutputItemAddedEvent
| RealtimeServerResponseOutputItemDoneEvent
| RealtimeServerResponseContentPartAddedEvent
| RealtimeServerResponseContentPartDoneEvent
| RealtimeServerResponseTextDeltaEvent
| RealtimeServerResponseTextDoneEvent
| RealtimeServerResponseAudioTranscriptDeltaEvent
| RealtimeServerResponseAudioTranscriptDoneEvent
| RealtimeServerResponseAudioDeltaEvent
| RealtimeServerResponseAudioDoneEvent
| RealtimeServerResponseFunctionCallArgumentsDeltaEvent
| RealtimeServerResponseFunctionCallArgumentsDoneEvent
| RealtimeServerTranscriptionSessionUpdatedEvent
| RealtimeServerRateLimitsUpdatedEvent
| RealtimeServerOutputAudioStartedEvent
| RealtimeServerOutputAudioStoppedEvent
| RealtimeServerOutputAudioClearedEvent;
export type { MemoryFrameworkMessage };
export interface FileType {
url: string;
type: "image" | "video" | "audio" | "document" | "data_file";
mimeType?: string;
name?: string | null;
description?: string | null;
isProduct?: boolean;
price?: string;
username?: string;
thumbnailUrl?: string | null;
fileId?: string;
size?: number;
}
export function isStructuredData(data: any): data is AnyToolStructuredData {
return (
data && typeof data === "object" && data !== null && "result_type" in data
);
}
export type User = { id: string; name?: string; avatar?: string; role: "user" };
export type Bot = { id: string; name?: string; avatar?: string; role: "assistant"; };
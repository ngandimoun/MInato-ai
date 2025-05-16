import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { supabase } from "../supabaseClient"; // Ensure this uses the public client or an appropriate admin client if needed for inserts
import { MoodJournalStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface MoodJournalInput extends ToolInput {
  entryText: string;
  mood?: string | null; // Allow null
  rating?: number | null; // Allow null
}

export class MoodJournalTool extends BaseTool {
  name = "MoodJournalTool";
  description =
    "Logs a user's mood or a brief journal entry. Use when the user asks to record feelings or journal ('log my mood', 'journal this', 'write down...').";
  argsSchema = {
    type: "object" as const,
    properties: {
      entryText: { type: "string" as const, description: "The text content of the journal entry or description of the mood." },
      mood: { type: ["string", "null"], description: "Optional. A single word describing the mood (e.g., 'happy', 'stressed', 'excited')." },
      rating: { type: ["number", "null"], minimum: 1, maximum: 5, description: "Optional. A numerical rating of the mood intensity (1=low, 5=high)." },
    },
    required: ["entryText", "mood", "rating"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined; // Actions that modify data shouldn't be cached like this

  async execute(input: MoodJournalInput): Promise<ToolOutput> {
    const { userId: contextUserId, entryText, mood, rating } = input;
    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[MoodTool User:${userId?.substring(0,8)}]`;
    const queryInputForStructuredData = { ...input };

    let outputStructuredData: MoodJournalStructuredOutput = {
      result_type: "mood_journal_log",
      status: "error",
      query: queryInputForStructuredData,
      errorMessage: "Tool execution failed initially.",
      source_api: "internal_db",
      error: "Tool execution failed initially.",
    };

    if (!userId) { /* ... error handling ... */ return { error: "User context missing.", result: "I need to know who you are.", structuredData: { ...outputStructuredData, error: "User ID missing.", errorMessage: "User ID missing." } }; }
    if (!entryText?.trim()) { /* ... error handling ... */ return { error: "The 'entryText' cannot be empty.", result: "What would you like to log?", structuredData: { ...outputStructuredData, error: "Entry text empty.", errorMessage: "Entry text empty." } }; }
    if (rating !== undefined && rating !== null && (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return { error: `Invalid rating: ${rating}. Must be integer 1-5.`, result: "Rating should be an integer from 1 to 5.", structuredData: { ...outputStructuredData, error: `Invalid rating: ${rating}.`, errorMessage: `Invalid rating: ${rating}.` } };
    }

    const cleanMood = mood?.trim().substring(0, 50) || null;
    const entryTextClean = entryText.trim();
    this.log("info", `${logPrefix} Logging entry: Mood=${cleanMood || "N/A"}, Rating=${rating ?? "N/A"}`);

    if (!supabase) { /* ... error handling ... */ return { error: "Database connection error.", result: "Sorry, cannot connect to the journal.", structuredData: { ...outputStructuredData, error: "DB client unavailable.", errorMessage: "DB client unavailable." } }; }

    try {
      const { data, error } = await supabase
        .from("user_journal_entries")
        .insert({ user_id: userId, entry_text: entryTextClean, mood_label: cleanMood, mood_rating: rating })
        .select("id, created_at")
        .single();

      if (error) { this.log("error", `${logPrefix} Supabase insert error:`, error); throw new Error(`DB error: ${error.message}`); }
      if (!data) throw new Error("Insert did not return data.");

      const moodDesc = cleanMood ? ` (Mood: ${cleanMood})` : "";
      const ratingDesc = rating ? ` (Rating: ${rating}/5)` : "";
      const resultString = `Okay, ${input.context?.userName || "User"}, Minato has logged that for you${moodDesc}${ratingDesc}.`;
      this.log("info", `${logPrefix} Entry logged (ID: ${data.id})`);

      outputStructuredData = {
        result_type: "mood_journal_log", status: "success", source_api: "internal_db",
        logId: data.id, timestamp: data.created_at,
        loggedMood: cleanMood, loggedRating: rating ?? undefined, // Ensure rating can be undefined if null
        query: queryInputForStructuredData, errorMessage: null, error: undefined,
      };
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Could not save journal entry: ${error.message}`;
      this.log("error", `${logPrefix} Failed:`, error.message);
      outputStructuredData.errorMessage = errorMsg; outputStructuredData.error = errorMsg; outputStructuredData.status = "error";
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't save that entry.`, structuredData: outputStructuredData };
    }
  }
}
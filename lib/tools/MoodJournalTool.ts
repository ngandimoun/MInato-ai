// FILE: lib/tools/MoodJournalTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabase } from "../supabaseClient";
import { MoodJournalStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";
import { getSupabaseAdminClient } from "../supabase/server"; // Use admin for writes

interface MoodJournalInput extends ToolInput {
  entryText: string;
  mood?: string | null;
  rating?: number | null;
}

export class MoodJournalTool extends BaseTool {
  name = "MoodJournalTool";
  description =
    "Logs a user's mood or a brief journal entry. Use when the user asks to record feelings or journal ('log my mood', 'journal this', 'write down...').";
  argsSchema = {
    type: "object" as const,
    properties: {
      entryText: { type: "string" as const, description: "The text content of the journal entry or description of the mood. This is required." } as OpenAIToolParameterProperties,
      mood: { type: ["string", "null"] as const, description: "Optional. A single word describing the mood (e.g., 'happy', 'stressed', 'excited'). Can be null." } as OpenAIToolParameterProperties,
      rating: { type: ["number", "null"] as const, description: "Optional. A numerical rating of the mood intensity (must be an integer from 1 to 5). Can be null." } as OpenAIToolParameterProperties, // Removed min/max
    },
    required: ["entryText", "mood", "rating"], // All defined properties are required
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined;

  async execute(input: MoodJournalInput): Promise<ToolOutput> {
    const { userId: contextUserId, entryText } = input; // entryText is required
    // Defaulting logic
    const mood = (input.mood === null) ? undefined : input.mood;
    const rating = (input.rating === null) ? undefined : input.rating;


    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[MoodTool User:${userId?.substring(0,8)}]`;
    const queryInputForStructuredData = { ...input };

    let outputStructuredData: MoodJournalStructuredOutput = {
      result_type: "mood_journal_log", status: "error", query: queryInputForStructuredData,
      errorMessage: "Tool execution failed initially.", source_api: "internal_db", error: "Tool execution failed initially.",
    };

    if (!userId) { outputStructuredData.errorMessage = "User ID missing."; outputStructuredData.error = "User ID missing."; return { error: "User context missing.", result: "I need to know who you are.", structuredData: outputStructuredData }; }
    if (!entryText?.trim()) { outputStructuredData.errorMessage = "Entry text empty."; outputStructuredData.error = "Entry text empty."; return { error: "The 'entryText' cannot be empty.", result: "What would you like to log?", structuredData: outputStructuredData }; }
    if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      outputStructuredData.errorMessage = `Invalid rating: ${rating}.`; outputStructuredData.error = `Invalid rating: ${rating}.`;
      return { error: `Invalid rating: ${rating}. Must be integer 1-5.`, result: "Rating should be an integer from 1 to 5.", structuredData: outputStructuredData };
    }

    const cleanMood = mood?.trim().substring(0, 50) || null;
    const entryTextClean = entryText.trim();
    this.log("info", `${logPrefix} Logging entry: Mood=${cleanMood || "N/A"}, Rating=${rating ?? "N/A"}`);

    const client = getSupabaseAdminClient(); // Use admin client for writes
    if (!client) { outputStructuredData.errorMessage = "DB client unavailable."; outputStructuredData.error = "DB client unavailable."; return { error: "Database connection error.", result: "Sorry, cannot connect to the journal.", structuredData: outputStructuredData }; }

    try {
      const { data, error } = await client
        .from("user_journal_entries")
        .insert({ user_id: userId, entry_text: entryTextClean, mood_label: cleanMood, mood_rating: rating ?? null }) // Ensure rating is null if undefined
        .select("id, created_at")
        .single();

      if (error) { this.log("error", `${logPrefix} Supabase insert error:`, error); throw new Error(`DB error: ${error.message}`); }
      if (!data) throw new Error("Insert did not return data.");

      const moodDesc = cleanMood ? ` (Mood: ${cleanMood})` : "";
      const ratingDesc = rating !== undefined ? ` (Rating: ${rating}/5)` : ""; // Check for undefined explicitly for rating
      const resultString = `Okay, ${input.context?.userName || "User"}, Minato has logged that for you${moodDesc}${ratingDesc}.`;
      this.log("info", `${logPrefix} Entry logged (ID: ${data.id})`);

      outputStructuredData = {
        result_type: "mood_journal_log", status: "success", source_api: "internal_db",
        logId: data.id, timestamp: data.created_at,
        loggedMood: cleanMood, loggedRating: rating ?? undefined,
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
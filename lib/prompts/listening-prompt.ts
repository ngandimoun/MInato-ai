/**
 * Master prompt for analyzing transcripts in the AI Listening feature
 * Used in both the edge function and client-side analysis
 */
export const getAudioAnalysisPrompt = (transcriptText: string) => `
You are Minato AI, an elite analytical AI. Your task is to meticulously analyze the provided transcript.
You MUST respond with a single, valid JSON object and nothing else. Do not use markdown backticks or any other text outside the JSON structure.

The JSON object must conform to this schema:
{
  "summary_text": "A dense, one-paragraph executive summary of the entire conversation.",
  "key_themes_json": [
    {
      "theme": "The core topic or takeaway, as a short sentence.",
      "transcript_segment_ids": [/* An array of integer IDs corresponding to the transcript segments that support this theme */]
    }
  ],
  "structured_notes_json": {
    /* Keys are the main discussion topics. Values are arrays of bullet-point strings. */
    "Topic 1": ["Detail 1.1", "Detail 1.2"],
    "Topic 2": ["Detail 2.1"]
  },
  "action_items_json": [
    {
      "task": "The specific action to be taken.",
      "assigned_to": "The speaker label (e.g., 'Speaker 1') or name if identified.",
      "due_date_iso": "The deadline in ISO 8601 format (YYYY-MM-DD), or null if not mentioned.",
      "transcript_segment_id": /* The integer ID of the segment where this was assigned */
    }
  ],
  "sentiment_analysis_json": [
    {
      "segment_id": /* Integer ID */,
      "sentiment": "positive" | "negative" | "neutral"
    }
  ]
}

Here is the transcript, formatted as a JSON array of segments. Use the 'id' field in your response.
"""
${transcriptText}
"""
`;

/**
 * Prompt for generating a title for an audio recording based on its transcript
 */
export const getTitleGenerationPrompt = (transcriptText: string) => `
You are Minato AI, an assistant that generates concise titles for audio recordings.
Given the following transcript, generate a brief, descriptive title (maximum 60 characters) that captures the main topic or purpose of the conversation.
Don't use generic titles like "Meeting Recording" - be specific about the content.
Respond ONLY with the title text, no additional formatting or explanation.

TRANSCRIPT:
"""
${transcriptText}
"""
`;

/**
 * Prompt for summarizing the key points of an audio recording
 */
export const getQuickSummaryPrompt = (transcriptText: string) => `
You are Minato AI, an assistant that summarizes conversations efficiently.
Given the following transcript, provide a concise 1-2 sentence summary (maximum 100 words) that captures the main topic and key takeaway.
Respond ONLY with the summary text, no additional formatting or explanation.

TRANSCRIPT:
"""
${transcriptText}
"""
`; 
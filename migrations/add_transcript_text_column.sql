-- Add transcript_text column to analysis_results table
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS transcript_text TEXT;

-- Backfill transcript_text from transcript_json if possible
UPDATE analysis_results 
SET transcript_text = (
  SELECT string_agg(segment->>'text', ' ')
  FROM jsonb_array_elements(transcript_json) AS segment
)
WHERE transcript_json IS NOT NULL AND transcript_text IS NULL; 
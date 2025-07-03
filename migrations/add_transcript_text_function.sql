-- Create a function to add the transcript_text column and backfill data
CREATE OR REPLACE FUNCTION add_transcript_text_column()
RETURNS void AS $$
BEGIN
  -- Add the column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'analysis_results' 
    AND column_name = 'transcript_text'
  ) THEN
    ALTER TABLE analysis_results ADD COLUMN transcript_text TEXT;
  END IF;

  -- Backfill data
  UPDATE analysis_results 
  SET transcript_text = (
    SELECT string_agg(value->>'text', ' ')
    FROM jsonb_array_elements(transcript_json)
  )
  WHERE transcript_json IS NOT NULL 
  AND (transcript_text IS NULL OR transcript_text = '');

  -- Return success
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
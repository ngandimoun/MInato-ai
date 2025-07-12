-- Clear existing questions from all games to force regeneration
-- This will ensure all games get fresh AI-generated questions

-- Clear questions from all live game rooms
UPDATE live_game_rooms 
SET questions = '[]'::jsonb,
    current_question = NULL,
    current_question_index = 0
WHERE status IN ('lobby', 'in_progress');

-- Optional: Reset games that are in progress back to lobby
-- (uncomment if you want to reset all active games)
-- UPDATE live_game_rooms 
-- SET status = 'lobby',
--     started_at = NULL,
--     current_question = NULL,
--     current_question_index = 0
-- WHERE status = 'in_progress';

SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN status = 'lobby' THEN 1 END) as lobby_games,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_games,
    COUNT(CASE WHEN questions = '[]'::jsonb THEN 1 END) as games_with_cleared_questions
FROM live_game_rooms; 
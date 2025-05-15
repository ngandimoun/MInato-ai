-- Function to get pending reminders for a user within a time horizon
CREATE OR REPLACE FUNCTION get_pending_reminders (
    p_user_id TEXT,
    p_max_results INT DEFAULT 10,
    p_time_horizon_days INT DEFAULT 7
)
RETURNS TABLE (
    memory_id UUID, -- Changed from TEXT to UUID if 'id' is UUID
    user_id TEXT,
    original_content TEXT,
    trigger_datetime TIMESTAMPTZ,
    recurrence_rule TEXT,
    status TEXT,
    last_sent_at TIMESTAMPTZ,
    error_message TEXT
    -- Add similarity column if your search function provides it, e.g.:
    -- similarity REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_future_limit TIMESTAMPTZ := now() + (p_time_horizon_days::TEXT || ' days')::INTERVAL;
BEGIN
    -- Basic validation
    p_user_id := trim(p_user_id);
    IF p_user_id IS NULL OR p_user_id = '' THEN
        RAISE EXCEPTION 'User ID cannot be empty';
    END IF;
    p_max_results := LEAST(GREATEST(p_max_results, 1), 50); -- Limit between 1 and 50
    p_time_horizon_days := LEAST(GREATEST(p_time_horizon_days, 0), 90); -- Limit between 0 and 90 days

    -- Select from the 'memories' table (adjust table name if different)
    RETURN QUERY
    SELECT
        m.id AS memory_id, -- Assumes PK column is 'id' of type UUID
        m.user_id,
        -- Extract original_content, trigger_datetime, recurrence_rule, status from metadata JSONB
        m.metadata->>'original_content' AS original_content,
        (m.metadata->>'trigger_datetime')::TIMESTAMPTZ AS trigger_datetime,
        m.metadata->>'recurrence_rule' AS recurrence_rule,
        m.metadata->>'status' AS status,
        (m.metadata->>'last_sent_at')::TIMESTAMPTZ AS last_sent_at,
        m.metadata->>'error_message' AS error_message
        -- Add similarity if needed: m.similarity -- Make sure 'm' provides this
    FROM
        public.memories m -- ⚠️ Adjust schema and table name if necessary
    WHERE
        m.user_id = p_user_id
        -- Check if the metadata indicates it's a reminder
        AND m.metadata->>'is_reminder' = 'true'
        -- Filter by status (only 'pending' reminders)
        AND m.metadata->>'status' = 'pending'
        -- Filter by trigger time (within the specified horizon)
        AND (m.metadata->>'trigger_datetime')::TIMESTAMPTZ >= v_now -- Trigger time is now or in the future
        AND (m.metadata->>'trigger_datetime')::TIMESTAMPTZ <= v_future_limit -- Trigger time is within the horizon
    ORDER BY
        (m.metadata->>'trigger_datetime')::TIMESTAMPTZ ASC -- Order by soonest first
    LIMIT
        p_max_results;

END;
$$;

-- Optional: Grant execute permission if needed
-- GRANT EXECUTE ON FUNCTION get_pending_reminders(TEXT, INT, INT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_pending_reminders(TEXT, INT, INT) TO service_role;a
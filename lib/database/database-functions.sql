-- Database functions for optimized operations
-- Run this with: psql -d your_database < database-functions.sql

-- Start transaction
BEGIN;

-- Function to safely increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE message_templates 
  SET use_count = use_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
$$;

-- Function to update patient last contact time efficiently
CREATE OR REPLACE FUNCTION update_patient_last_contact(patient_cnumber TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE patients 
  SET last_contact_at = NOW()
  WHERE cnumber = patient_cnumber;
$$;

-- Function to get user message statistics efficiently
CREATE OR REPLACE FUNCTION get_user_message_stats(user_id UUID)
RETURNS TABLE(
  total_messages BIGINT,
  today_messages BIGINT,
  week_messages BIGINT,
  month_messages BIGINT,
  sent_messages BIGINT,
  delivered_messages BIGINT,
  failed_messages BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH stats AS (
    SELECT 
      COUNT(*) as total_messages,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_messages,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_messages,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_messages,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_messages,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered_messages,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_messages
    FROM messages
    WHERE sender_id = user_id
  )
  SELECT 
    total_messages,
    today_messages,
    week_messages,
    month_messages,
    sent_messages,
    delivered_messages,
    failed_messages
  FROM stats;
$$;

-- Function to get patient statistics efficiently
CREATE OR REPLACE FUNCTION get_patient_stats(user_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_patients BIGINT,
  active_patients BIGINT,
  inactive_patients BIGINT,
  recent_patients BIGINT,
  patients_with_messages BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH patient_stats AS (
    SELECT 
      COUNT(*) as total_patients,
      COUNT(*) FILTER (WHERE is_active = true) as active_patients,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_patients,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_patients,
      COUNT(*) FILTER (WHERE last_contact_at IS NOT NULL) as patients_with_messages
    FROM patients p
    WHERE (user_id IS NULL OR p.created_by = user_id)
  )
  SELECT 
    total_patients,
    active_patients,
    inactive_patients,
    recent_patients,
    patients_with_messages
  FROM patient_stats;
$$;

-- Function to clean up old chat messages (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat 
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO config (key, value, updated_by, updated_at)
  VALUES (
    'last_chat_cleanup',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'cleanup_date', NOW(),
      'days_kept', days_to_keep
    )::text,
    '00000000-0000-0000-0000-000000000000', -- System user
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
  
  RETURN deleted_count;
END;
$$;

-- Function to archive old messages (for performance)
CREATE OR REPLACE FUNCTION archive_old_messages(months_to_keep INTEGER DEFAULT 6)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS messages_archive (LIKE messages INCLUDING ALL);
  
  -- Move old messages to archive
  WITH old_messages AS (
    DELETE FROM messages 
    WHERE created_at < NOW() - (months_to_keep || ' months')::INTERVAL
    RETURNING *
  )
  INSERT INTO messages_archive 
  SELECT * FROM old_messages;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log the archival
  INSERT INTO config (key, value, updated_by, updated_at)
  VALUES (
    'last_message_archive',
    jsonb_build_object(
      'archived_count', archived_count,
      'archive_date', NOW(),
      'months_kept', months_to_keep
    )::text,
    '00000000-0000-0000-0000-000000000000', -- System user
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
  
  RETURN archived_count;
END;
$$;

-- Function to get database health metrics
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_size TEXT,
  last_vacuum TIMESTAMP,
  last_analyze TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins + n_tup_upd - n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    last_vacuum,
    last_analyze
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Function to optimize table statistics
CREATE OR REPLACE FUNCTION optimize_table_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update statistics for all main tables
  ANALYZE messages;
  ANALYZE patients;
  ANALYZE patient_phones;
  ANALYZE chat;
  ANALYZE message_templates;
  ANALYZE users;
  
  -- Log the optimization
  INSERT INTO config (key, value, updated_by, updated_at)
  VALUES (
    'last_stats_update',
    jsonb_build_object(
      'update_date', NOW(),
      'tables_analyzed', ARRAY['messages', 'patients', 'patient_phones', 'chat', 'message_templates', 'users']
    )::text,
    '00000000-0000-0000-0000-000000000000', -- System user
    NOW()
  )
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Create a view for user activity summary (for better performance)
CREATE OR REPLACE VIEW user_recent_activity AS
SELECT 
  u.id as user_id,
  u.username,
  u.email,
  u.display_name,
  u.is_active,
  COALESCE(m.message_count, 0) as recent_message_count,
  COALESCE(p.patient_count, 0) as patient_count,
  COALESCE(c.chat_count, 0) as recent_chat_count,
  GREATEST(
    COALESCE(m.last_message, u.created_at),
    COALESCE(c.last_chat, u.created_at)
  ) as last_activity
FROM users u
LEFT JOIN (
  SELECT 
    sender_id,
    COUNT(*) as message_count,
    MAX(created_at) as last_message
  FROM messages 
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY sender_id
) m ON u.id = m.sender_id
LEFT JOIN (
  SELECT 
    created_by,
    COUNT(*) as patient_count
  FROM patients 
  WHERE is_active = true
  GROUP BY created_by
) p ON u.id = p.created_by
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as chat_count,
    MAX(created_at) as last_chat
  FROM chat 
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY user_id
) c ON u.id = c.user_id;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_patient_last_contact(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_message_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_stats(UUID) TO authenticated;
GRANT SELECT ON user_recent_activity TO authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION cleanup_old_chat_messages(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_messages(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_database_health() TO service_role;
GRANT EXECUTE ON FUNCTION optimize_table_stats() TO service_role;

-- Commit transaction
COMMIT;

-- Usage examples:
-- SELECT * FROM get_user_message_stats('user-uuid-here');
-- SELECT * FROM get_patient_stats();
-- SELECT * FROM get_patient_stats('user-uuid-here');
-- SELECT increment_template_usage('template-uuid-here');
-- SELECT update_patient_last_contact('PATIENT123');
-- SELECT * FROM user_recent_activity WHERE user_id = 'user-uuid-here';

-- Admin maintenance examples:
-- SELECT cleanup_old_chat_messages(90); -- Keep 90 days of chat
-- SELECT archive_old_messages(6); -- Keep 6 months of messages
-- SELECT * FROM get_database_health();
-- SELECT optimize_table_stats();
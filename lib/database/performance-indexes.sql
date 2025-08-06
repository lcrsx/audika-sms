-- Performance optimization indexes for Audika SMS application
-- Run this with: psql -d your_database < performance-indexes.sql

-- Start transaction
BEGIN;

-- Messages table optimizations (most frequently queried)
-- 1. Index for sender_id + created_at (for user's message history)
CREATE INDEX IF NOT EXISTS idx_messages_sender_created 
ON messages (sender_id, created_at DESC);

-- 2. Index for status + created_at (for filtering by status)
CREATE INDEX IF NOT EXISTS idx_messages_status_created 
ON messages (status, created_at DESC);

-- 3. Index for patient_cnumber + created_at (for patient message history)
CREATE INDEX IF NOT EXISTS idx_messages_patient_created 
ON messages (patient_cnumber, created_at DESC);

-- 4. Composite index for common filters (sender + status + created_at)
CREATE INDEX IF NOT EXISTS idx_messages_sender_status_created 
ON messages (sender_id, status, created_at DESC);

-- 5. Index for phone number searches
CREATE INDEX IF NOT EXISTS idx_messages_recipient_phone 
ON messages (recipient_phone);

-- Patients table optimizations
-- 1. Index for cnumber search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_patients_cnumber_lower 
ON patients (LOWER(cnumber));

-- 2. Index for active patients with last contact (most common query)
CREATE INDEX IF NOT EXISTS idx_patients_active_contact 
ON patients (is_active, last_contact_at DESC NULLS LAST);

-- 3. Index for created_by + created_at (for user's created patients)
CREATE INDEX IF NOT EXISTS idx_patients_created_by_date 
ON patients (created_by, created_at DESC);

-- 4. Index for city searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_patients_city_lower 
ON patients (LOWER(city)) WHERE city IS NOT NULL;

-- Patient phones table optimizations
-- 1. Index for phone number search
CREATE INDEX IF NOT EXISTS idx_patient_phones_phone 
ON patient_phones (phone);

-- 2. Foreign key index (should already exist but ensure it's optimal)
CREATE INDEX IF NOT EXISTS idx_patient_phones_patient_id 
ON patient_phones (patient_id);

-- Chat table optimizations
-- 1. Index for room + created_at (for chat history)
CREATE INDEX IF NOT EXISTS idx_chat_room_created 
ON chat (room_name, created_at DESC);

-- 2. Index for user_id + created_at (for user's chat history)
CREATE INDEX IF NOT EXISTS idx_chat_user_created 
ON chat (user_id, created_at DESC);

-- 3. Index for username + created_at (for notifications)
CREATE INDEX IF NOT EXISTS idx_chat_username_created 
ON chat (username, created_at DESC);

-- 4. Index for recent messages across all rooms
CREATE INDEX IF NOT EXISTS idx_chat_created_desc 
ON chat (created_at DESC);

-- Message templates optimizations
-- 1. Index for use_count (for popular templates)
CREATE INDEX IF NOT EXISTS idx_templates_use_count 
ON message_templates (use_count DESC);

-- 2. Index for created_by + use_count (for user's popular templates)
CREATE INDEX IF NOT EXISTS idx_templates_created_by_usage 
ON message_templates (created_by, use_count DESC);

-- 3. Text search index for template content (using gin for full text search)
CREATE INDEX IF NOT EXISTS idx_templates_content_search 
ON message_templates USING gin(to_tsvector('simple', content));

-- 4. Text search index for template names
CREATE INDEX IF NOT EXISTS idx_templates_name_search 
ON message_templates USING gin(to_tsvector('simple', name));

-- Users table optimizations
-- 1. Index for username (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_username_lower 
ON users (LOWER(username));

-- 2. Index for email (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON users (LOWER(email));

-- 3. Index for active users
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users (is_active) WHERE is_active = true;

-- 4. Index for role + is_active (for admin queries)
CREATE INDEX IF NOT EXISTS idx_users_role_active 
ON users (role, is_active);

-- Partial indexes for better performance on common queries
-- 1. Only index active patients (most queries filter by is_active = true)
CREATE INDEX IF NOT EXISTS idx_patients_active_only 
ON patients (cnumber, last_contact_at DESC) WHERE is_active = true;

-- 2. Only index recent messages (last 6 months)
CREATE INDEX IF NOT EXISTS idx_messages_recent 
ON messages (sender_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '6 months';

-- 3. Only index sent/delivered messages for statistics
CREATE INDEX IF NOT EXISTS idx_messages_successful 
ON messages (sender_id, status, created_at DESC) 
WHERE status IN ('sent', 'delivered');

-- Create or update statistics for better query planning
ANALYZE messages;
ANALYZE patients;
ANALYZE patient_phones;
ANALYZE chat;
ANALYZE message_templates;
ANALYZE users;

-- Commit transaction
COMMIT;

-- Performance tips for application code:
-- 1. Always use LIMIT clauses for pagination
-- 2. Use specific column names instead of SELECT *
-- 3. Filter by indexed columns first in WHERE clauses
-- 4. Use prepared statements for repeated queries
-- 5. Consider using connection pooling for high concurrent loads

-- Example optimized queries that will use these indexes:

-- Get user's recent messages (uses idx_messages_sender_created)
-- SELECT id, content, created_at, status, recipient_phone 
-- FROM messages 
-- WHERE sender_id = $1 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- Search active patients (uses idx_patients_active_contact)
-- SELECT id, cnumber, city, last_contact_at 
-- FROM patients 
-- WHERE is_active = true 
--   AND LOWER(cnumber) LIKE LOWER($1 || '%')
-- ORDER BY last_contact_at DESC NULLS LAST 
-- LIMIT 10;

-- Get patient message history (uses idx_messages_patient_created)
-- SELECT content, created_at, status, sender_display_name
-- FROM messages 
-- WHERE patient_cnumber = $1 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- Get popular templates (uses idx_templates_use_count)
-- SELECT id, name, content, use_count 
-- FROM message_templates 
-- ORDER BY use_count DESC 
-- LIMIT 10;
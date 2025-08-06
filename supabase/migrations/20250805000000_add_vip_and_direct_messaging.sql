-- =====================================================
-- VIP AND DIRECT MESSAGING SYSTEM MIGRATION
-- Created: 2025-01-05
-- Description: Adds VIP patient marking and direct user messaging capabilities
-- =====================================================

-- Add VIP column to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false NOT NULL;

-- Add index for VIP patients for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_vip ON public.patients(is_vip) WHERE is_vip = true;

-- Add comment for VIP column
COMMENT ON COLUMN public.patients.is_vip IS 'Marks patient as VIP for priority handling';

-- =====================================================
-- DIRECT MESSAGES TABLE
-- =====================================================

-- Create direct messages table for user-to-user communication
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
    type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'system', 'notification')),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent users from messaging themselves
    CONSTRAINT direct_messages_no_self_message CHECK (sender_id != recipient_id)
);

-- Add indexes for direct messages performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(
    LEAST(sender_id, recipient_id), 
    GREATEST(sender_id, recipient_id), 
    created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON public.direct_messages(recipient_id, is_read) WHERE is_read = false;

-- Add comments for direct messages table
COMMENT ON TABLE public.direct_messages IS 'Direct messages between users in the system';
COMMENT ON COLUMN public.direct_messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN public.direct_messages.recipient_id IS 'User who receives the message';
COMMENT ON COLUMN public.direct_messages.content IS 'Message content (1-1000 characters)';
COMMENT ON COLUMN public.direct_messages.type IS 'Message type: direct, system, or notification';
COMMENT ON COLUMN public.direct_messages.is_read IS 'Whether recipient has read the message';

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers
CREATE TRIGGER handle_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_direct_messages_updated_at
    BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on direct messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages they sent or received
CREATE POLICY "Users can view their own direct messages" ON public.direct_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = recipient_id
    );

-- Policy: Users can send direct messages
CREATE POLICY "Users can send direct messages" ON public.direct_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = recipient_id AND is_active = true
        )
    );

-- Policy: Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages" ON public.direct_messages
    FOR UPDATE USING (
        auth.uid() = recipient_id
    ) WITH CHECK (
        auth.uid() = recipient_id
    );

-- Policy: Users can delete messages they sent
CREATE POLICY "Users can delete sent messages" ON public.direct_messages
    FOR DELETE USING (
        auth.uid() = sender_id
    );

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
    p_sender_id UUID,
    p_recipient_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- If no specific sender provided, mark all unread messages as read
    IF p_sender_id IS NULL THEN
        UPDATE public.direct_messages 
        SET is_read = true, updated_at = NOW()
        WHERE recipient_id = COALESCE(p_recipient_id, auth.uid()) 
        AND is_read = false;
    ELSE
        -- Mark messages from specific sender as read
        UPDATE public.direct_messages 
        SET is_read = true, updated_at = NOW()
        WHERE recipient_id = COALESCE(p_recipient_id, auth.uid()) 
        AND sender_id = p_sender_id 
        AND is_read = false;
    END IF;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.direct_messages
        WHERE recipient_id = COALESCE(p_user_id, auth.uid())
        AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation preview
CREATE OR REPLACE FUNCTION public.get_conversation_previews(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    other_user_id UUID,
    other_username TEXT,
    other_display_name TEXT,
    last_message_content TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER,
    is_sender BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH conversations AS (
        SELECT 
            CASE 
                WHEN sender_id = COALESCE(p_user_id, auth.uid()) THEN recipient_id
                ELSE sender_id
            END as other_user_id,
            MAX(created_at) as last_message_at
        FROM public.direct_messages
        WHERE sender_id = COALESCE(p_user_id, auth.uid()) 
           OR recipient_id = COALESCE(p_user_id, auth.uid())
        GROUP BY 1
        ORDER BY last_message_at DESC
        LIMIT p_limit
    ),
    latest_messages AS (
        SELECT DISTINCT ON (
            CASE 
                WHEN dm.sender_id = COALESCE(p_user_id, auth.uid()) THEN dm.recipient_id
                ELSE dm.sender_id
            END
        )
            dm.content,
            dm.created_at,
            dm.sender_id = COALESCE(p_user_id, auth.uid()) as is_sender,
            CASE 
                WHEN dm.sender_id = COALESCE(p_user_id, auth.uid()) THEN dm.recipient_id
                ELSE dm.sender_id
            END as other_user_id
        FROM public.direct_messages dm
        INNER JOIN conversations c ON (
            (dm.sender_id = COALESCE(p_user_id, auth.uid()) AND dm.recipient_id = c.other_user_id) OR
            (dm.recipient_id = COALESCE(p_user_id, auth.uid()) AND dm.sender_id = c.other_user_id)
        )
        ORDER BY other_user_id, dm.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            sender_id as other_user_id,
            COUNT(*)::INTEGER as unread_count
        FROM public.direct_messages
        WHERE recipient_id = COALESCE(p_user_id, auth.uid())
        AND is_read = false
        GROUP BY sender_id
    )
    SELECT 
        c.other_user_id,
        u.username,
        u.display_name,
        lm.content,
        c.last_message_at,
        COALESCE(uc.unread_count, 0),
        COALESCE(lm.is_sender, false)
    FROM conversations c
    LEFT JOIN public.users u ON u.id = c.other_user_id
    LEFT JOIN latest_messages lm ON lm.other_user_id = c.other_user_id
    LEFT JOIN unread_counts uc ON uc.other_user_id = c.other_user_id
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_previews(UUID, INTEGER) TO authenticated;

-- =====================================================
-- DATA VALIDATION
-- =====================================================

-- Add constraint to ensure VIP patients are active
ALTER TABLE public.patients 
ADD CONSTRAINT patients_vip_must_be_active 
CHECK (NOT is_vip OR (is_vip AND is_active));

-- =====================================================
-- CLEANUP AND MAINTENANCE
-- =====================================================

-- Function to clean up old read messages (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_direct_messages(
    p_days_old INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only delete old messages that have been read
    DELETE FROM public.direct_messages
    WHERE is_read = true 
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for cleanup function to service role only
REVOKE EXECUTE ON FUNCTION public.cleanup_old_direct_messages(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_direct_messages(INTEGER) TO service_role;

-- =====================================================
-- FINAL COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.mark_messages_as_read(UUID, UUID) IS 'Marks direct messages as read for a user';
COMMENT ON FUNCTION public.get_unread_message_count(UUID) IS 'Returns count of unread messages for a user';
COMMENT ON FUNCTION public.get_conversation_previews(UUID, INTEGER) IS 'Returns conversation previews with latest message and unread counts';
COMMENT ON FUNCTION public.cleanup_old_direct_messages(INTEGER) IS 'Maintenance function to clean up old read messages';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'VIP and Direct Messaging system successfully installed!';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '- VIP patient marking (patients.is_vip)';
    RAISE NOTICE '- Direct messaging between users';
    RAISE NOTICE '- Message read status tracking';
    RAISE NOTICE '- Conversation management functions';
    RAISE NOTICE '- Comprehensive RLS policies';
END $$;
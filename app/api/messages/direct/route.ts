import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get direct messages between two users
 * GET /api/messages/direct?with=username
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const withUser = searchParams.get('with');
    
    if (!withUser) {
      return NextResponse.json({ error: 'Missing "with" parameter' }, { status: 400 });
    }

    // Create room name for the conversation (sorted to ensure consistency)
    const currentUsername = user.email || user.id;
    const roomName = [currentUsername, withUser].sort().join('_dm_');

    // Get direct messages from chat table
    const { data: messages, error } = await supabase
      .from('chat')
      .select('*')
      .eq('room_name', roomName)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching direct messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error in direct messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Send a direct message to a user
 * POST /api/messages/direct
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, content } = body;
    
    if (!to || !content) {
      return NextResponse.json({ error: 'Missing required fields: to, content' }, { status: 400 });
    }

    // Create room name for the conversation (sorted to ensure consistency)
    const currentUsername = user.email || user.id;
    const roomName = [currentUsername, to].sort().join('_dm_');

    // Insert message into chat table
    const { data: message, error } = await supabase
      .from('chat')
      .insert({
        content,
        username: currentUsername,
        user_id: user.id,
        room_name: roomName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending direct message:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in direct messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* TODO: Implement direct messaging when database table is created
 * 
 * Required database table structure:
 * CREATE TABLE direct_messages (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   sender_id UUID NOT NULL REFERENCES users(id),
 *   recipient_id UUID NOT NULL REFERENCES users(id),
 *   content TEXT NOT NULL,
 *   type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'system', 'notification')),
 *   is_read BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id, created_at DESC);
 * CREATE INDEX idx_direct_messages_recipient ON direct_messages(recipient_id, created_at DESC);
 * CREATE INDEX idx_direct_messages_conversation ON direct_messages(sender_id, recipient_id, created_at DESC);
 */
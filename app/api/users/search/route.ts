import { NextResponse } from 'next/server';

/**
 * Search users API endpoint
 * GET /api/users/search?q=query&limit=20
 * 
 * TEMPORARY: This feature is disabled until the required user columns are added
 */
export async function GET() {
  return NextResponse.json({ 
    error: 'User search feature is not yet implemented' 
  }, { status: 501 });
}

/* TODO: Implement user search when database columns are created
 * 
 * Required database schema changes:
 * ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private'));
 * ALTER TABLE users ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;
 * ALTER TABLE users ADD COLUMN display_name TEXT;
 * ALTER TABLE users ADD COLUMN avatar_url TEXT;
 * ALTER TABLE users ADD COLUMN bio TEXT;
 * ALTER TABLE users ADD COLUMN dark_mode BOOLEAN DEFAULT FALSE;
 * ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE;
 * 
 * CREATE INDEX idx_users_search ON users(username, display_name);
 * CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
 */
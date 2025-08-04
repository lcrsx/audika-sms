-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add RLS policies for user profiles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public profiles
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (profile_visibility = 'public');

-- Policy: Users can view their own profile regardless of visibility
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id); 
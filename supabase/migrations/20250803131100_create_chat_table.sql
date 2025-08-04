-- Create chat table for real-time messaging
CREATE TABLE IF NOT EXISTS public.chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    username TEXT NOT NULL,
    room_name TEXT DEFAULT 'global',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;

-- create policy for authenticated users to select chat entries
create policy "Authenticated users can view chat entries"
on public.chat
for select
to authenticated
using (true);

-- create policy for authenticated users to insert chat entries
create policy "Authenticated users can create chat entries"
on public.chat
for insert
to authenticated
with check (true);

-- create policy for authenticated users to update their own chat entries
create policy "Users can update their own chat entries"
on public.chat
for update
to authenticated
using (auth.jwt() ->> 'email' = username)
with check (auth.jwt() ->> 'email' = username);

-- create policy for authenticated users to delete their own chat entries
create policy "Users can delete their own chat entries"
on public.chat
for delete
to authenticated
using (auth.jwt() ->> 'email' = username);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON public.chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_user ON public.chat(room_name, username);

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER handle_chat_updated_at
    BEFORE UPDATE ON public.chat
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- FIX RLS POLICIES FOR MESSAGES TABLE - PRODUCTION READY
-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.messages;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.messages;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.messages;

-- Create proper RLS policies for messages table
-- Allow authenticated users to read all messages
CREATE POLICY "messages_select_policy" ON public.messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert messages
CREATE POLICY "messages_insert_policy" ON public.messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own messages (by sender_id)
CREATE POLICY "messages_update_policy" ON public.messages
    FOR UPDATE USING (auth.uid()::text = sender_id)
    WITH CHECK (auth.uid()::text = sender_id);

-- Allow users to delete their own messages (by sender_id)
CREATE POLICY "messages_delete_policy" ON public.messages
    FOR DELETE USING (auth.uid()::text = sender_id);

-- FIX RLS POLICIES FOR PATIENTS TABLE - PRODUCTION READY
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.patients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.patients;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.patients;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.patients;

-- Create proper RLS policies for patients table
-- Allow authenticated users to read all patients
CREATE POLICY "patients_select_policy" ON public.patients
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert patients
CREATE POLICY "patients_insert_policy" ON public.patients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update patients
CREATE POLICY "patients_update_policy" ON public.patients
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete patients
CREATE POLICY "patients_delete_policy" ON public.patients
    FOR DELETE USING (auth.role() = 'authenticated');

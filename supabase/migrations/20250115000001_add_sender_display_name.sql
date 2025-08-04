-- Add sender_display_name column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sender_display_name TEXT;

-- Update existing records with a default display name based on sender_tag
UPDATE messages 
SET sender_display_name = COALESCE(sender_tag, 'Unknown User')
WHERE sender_display_name IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE messages 
ALTER COLUMN sender_display_name SET NOT NULL;

-- Set default value for future inserts
ALTER TABLE messages 
ALTER COLUMN sender_display_name SET DEFAULT 'Unknown User';
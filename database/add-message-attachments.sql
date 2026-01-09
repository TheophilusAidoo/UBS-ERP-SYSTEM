-- Add attachments column to messages table
-- Run this in Supabase SQL Editor if the column doesn't exist

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Add comment
COMMENT ON COLUMN messages.attachments IS 'Array of attachments: { type: "file"|"image", url: string, name: string, size: number }';



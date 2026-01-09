-- Enable real-time for messages table
-- This allows real-time subscriptions to message changes
-- Run this in your Supabase SQL Editor

-- Enable real-time replication for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Note: If the above doesn't work, you may need to enable it via Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Find the "messages" table
-- 3. Toggle the switch to enable replication

-- Verify real-time is enabled (this should return the messages table)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';



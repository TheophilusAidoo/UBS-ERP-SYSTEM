-- Update messages table to support client messages
-- Run this SQL in your Supabase SQL editor

-- Make from_user_id nullable (since messages can come from clients)
ALTER TABLE messages 
ALTER COLUMN from_user_id DROP NOT NULL;

-- Make to_user_id nullable (since messages can go to clients instead)
ALTER TABLE messages 
ALTER COLUMN to_user_id DROP NOT NULL;

-- Add client_id column for messages TO clients
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add from_client_id column for messages FROM clients
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS from_client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_client_id ON messages(from_client_id);

-- Note: The application code (message.service.ts) validates that either 
-- (fromUserId OR fromClientId) AND (toUserId OR clientId) are provided
-- This ensures data integrity at the application level

-- Update RLS policies to handle client messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT
  USING (
    from_user_id = auth.uid() 
    OR to_user_id = auth.uid()
    OR client_id IN (
      SELECT id FROM clients 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR from_client_id IN (
      SELECT id FROM clients 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE
  USING (
    to_user_id = auth.uid()
    OR client_id IN (
      SELECT id FROM clients 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );


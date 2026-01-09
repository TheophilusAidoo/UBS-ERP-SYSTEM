-- Clients Table
-- This table stores client information
-- Staff can create clients and assign them to companies
-- Admins can view all clients

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  contact_person VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add client_id to projects table to link projects to clients
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add assigned_to column if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add auth_user_id column if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view clients from their company" ON clients;
DROP POLICY IF EXISTS "Staff can create clients for their company" ON clients;
DROP POLICY IF EXISTS "Staff can update clients from their company" ON clients;
DROP POLICY IF EXISTS "Staff can delete clients from their company" ON clients;

-- RLS Policies for Clients
-- Clients can view their own profile (by auth_user_id or email)
CREATE POLICY "Clients can view own profile" ON clients
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Staff can view clients from their company
CREATE POLICY "Staff can view clients from their company" ON clients
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth_user_id = auth.uid() -- Also allow if it's their own profile
  );

-- Staff can create clients for their company
CREATE POLICY "Staff can create clients for their company" ON clients
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can update their own profile
CREATE POLICY "Clients can update own profile" ON clients
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Staff can update clients from their company, admins can update all
CREATE POLICY "Staff can update clients from their company" ON clients
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth_user_id = auth.uid() -- Also allow if it's their own profile
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth_user_id = auth.uid() -- Also allow if it's their own profile
  );

-- Staff can delete clients from their company, admins can delete all
CREATE POLICY "Staff can delete clients from their company" ON clients
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update messages table to support client messaging
-- Add client_id column to messages table (for messages TO clients)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add from_client_id column to messages table (for messages FROM clients)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS from_client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Update messages RLS to allow messaging clients
-- Staff can send messages to clients from their company
-- Admins can send messages to all clients

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for clients are defined above
-- Note: RLS policies for messages with clients should be updated to allow client messaging


-- Leave Balances Table
-- Run this in Supabase SQL Editor to add leave balance management

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  annual_total INTEGER NOT NULL DEFAULT 20,
  annual_used INTEGER NOT NULL DEFAULT 0,
  sick_total INTEGER NOT NULL DEFAULT 10,
  sick_used INTEGER NOT NULL DEFAULT 0,
  emergency_total INTEGER NOT NULL DEFAULT 5,
  emergency_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own leave balance" ON leave_balances
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all leave balances" ON leave_balances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage leave balances" ON leave_balances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



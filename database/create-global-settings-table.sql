-- Create Global Settings Table
-- This table stores system-wide settings that admin can change
-- All users (admin and staff) will read from this table

CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default global settings
INSERT INTO global_settings (key, value) VALUES
  ('currency', 'USD'),
  ('currency_symbol', '$'),
  ('default_annual_leave', '20'),
  ('default_sick_leave', '10'),
  ('default_emergency_leave', '5'),
  ('login_background_color', '#2563eb'),
  ('login_background_image', NULL),
  ('login_logo', NULL),
  ('sidebar_color', '#2563eb'),
  ('sidebar_logo', NULL),
  ('theme_mode', 'light'),
  ('primary_color', 'blue')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_global_settings_key ON global_settings(key);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_global_settings_updated_at 
  BEFORE UPDATE ON global_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read global settings (admin and staff)
CREATE POLICY "Anyone can read global settings" ON global_settings
  FOR SELECT
  USING (true);

-- Only admins can update global settings
CREATE POLICY "Only admins can update global settings" ON global_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can insert global settings
CREATE POLICY "Only admins can insert global settings" ON global_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can delete global settings
CREATE POLICY "Only admins can delete global settings" ON global_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );



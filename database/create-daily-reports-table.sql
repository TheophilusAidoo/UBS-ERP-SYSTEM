-- Daily Reports Table
-- This table stores daily reports submitted by staff members
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  summary TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- One report per user per day
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_company_id ON daily_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date);

-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_reports
-- Staff can view their own reports
CREATE POLICY "Staff can view own daily reports" ON daily_reports
  FOR SELECT
  USING (user_id = auth.uid());

-- Staff can create their own daily reports
CREATE POLICY "Staff can create own daily reports" ON daily_reports
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Staff can update their own daily reports (only on the same day)
CREATE POLICY "Staff can update own daily reports" ON daily_reports
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND date = CURRENT_DATE
  );

-- Admins can view all daily reports
CREATE POLICY "Admins can view all daily reports" ON daily_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );


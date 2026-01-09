-- Update Daily Reports Table to add structured fields matching Excel format
-- Add all required columns for structured daily reports

ALTER TABLE daily_reports 
ADD COLUMN IF NOT EXISTS tasks TEXT,
ADD COLUMN IF NOT EXISTS clients_contacted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quotes_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS follow_up TEXT,
ADD COLUMN IF NOT EXISTS remark TEXT;

-- Update existing records: migrate summary to tasks if tasks is null
UPDATE daily_reports 
SET tasks = summary 
WHERE tasks IS NULL AND summary IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN daily_reports.tasks IS 'Description of tasks performed (e.g., Sales offers, order taking, and order processing)';
COMMENT ON COLUMN daily_reports.clients_contacted IS 'Number of clients contacted';
COMMENT ON COLUMN daily_reports.quotes_sent IS 'Number of quotes sent';
COMMENT ON COLUMN daily_reports.sales_made IS 'Number of sales made';
COMMENT ON COLUMN daily_reports.follow_up IS 'Follow-up tasks to do';
COMMENT ON COLUMN daily_reports.remark IS 'Additional remarks or notes';


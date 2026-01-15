-- Add salary fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS salary_date INTEGER CHECK (salary_date >= 1 AND salary_date <= 31);

-- Add comment for clarity
COMMENT ON COLUMN users.salary_amount IS 'Monthly salary amount for staff members';
COMMENT ON COLUMN users.salary_date IS 'Day of the month (1-31) when salary is paid';


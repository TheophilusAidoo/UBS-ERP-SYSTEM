-- COMPLETE FIX for Staff Creation Issues
-- Run this entire script in Supabase SQL Editor
-- This will add missing columns and create the function properly

-- Step 1: Add salary columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'salary_amount'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_amount DECIMAL(12,2);
    RAISE NOTICE 'Added salary_amount column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'salary_date'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_date INTEGER;
    RAISE NOTICE 'Added salary_date column';
  END IF;
END $$;

-- Step 2: Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS create_staff_profile(UUID, TEXT, TEXT, TEXT, TEXT, UUID, DECIMAL, INTEGER, BOOLEAN);

-- Step 3: Create the function with proper error handling
CREATE OR REPLACE FUNCTION create_staff_profile(
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_salary_amount DECIMAL DEFAULT NULL,
  p_salary_date INTEGER DEFAULT NULL,
  p_is_sub_admin BOOLEAN DEFAULT FALSE
)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result users%ROWTYPE;
BEGIN
  -- Insert or update users table (SECURITY DEFINER bypasses RLS)
  INSERT INTO users (
    id, email, role, first_name, last_name, job_title, company_id,
    salary_amount, salary_date, is_sub_admin, created_at, updated_at
  )
  VALUES (
    p_user_id, p_email, 'staff', p_first_name, p_last_name, p_job_title, p_company_id,
    p_salary_amount, p_salary_date, p_is_sub_admin, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    job_title = EXCLUDED.job_title,
    company_id = EXCLUDED.company_id,
    salary_amount = EXCLUDED.salary_amount,
    salary_date = EXCLUDED.salary_date,
    is_sub_admin = EXCLUDED.is_sub_admin,
    updated_at = NOW()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION create_staff_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_staff_profile TO service_role;

-- Verify function was created
SELECT proname, proargnames, prosrc 
FROM pg_proc 
WHERE proname = 'create_staff_profile';

-- Test the function (replace with actual auth user ID)
-- SELECT * FROM create_staff_profile(
--   'your-auth-user-id-here'::UUID,
--   'test@example.com',
--   'Test',
--   'User',
--   'Developer',
--   NULL,
--   1000,
--   15,
--   false
-- );

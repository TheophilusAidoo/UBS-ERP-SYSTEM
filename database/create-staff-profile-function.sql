-- Database function to create staff profile (bypasses RLS and FK timing issues)
-- This function uses SECURITY DEFINER to run with elevated privileges
-- Run this COMPLETE script in Supabase SQL Editor

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
    RAISE NOTICE 'Added salary_amount column to users table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'salary_date'
  ) THEN
    ALTER TABLE users ADD COLUMN salary_date INTEGER;
    RAISE NOTICE 'Added salary_date column to users table';
  END IF;
END $$;

-- Step 2: Drop existing function if it exists (to recreate cleanly)
DROP FUNCTION IF EXISTS create_staff_profile(UUID, TEXT, TEXT, TEXT, TEXT, UUID, DECIMAL, INTEGER, BOOLEAN);

-- Step 3: Create the function (SECURITY DEFINER bypasses RLS and FK timing issues)
-- Using RETURNS TABLE for better Supabase RPC compatibility
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
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  role VARCHAR,
  company_id UUID,
  job_title VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  avatar TEXT,
  permissions TEXT[],
  is_sub_admin BOOLEAN,
  salary_amount DECIMAL,
  salary_date INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result users%ROWTYPE;
  v_has_salary_columns BOOLEAN;
  v_wait_count INTEGER := 0;
  v_max_waits INTEGER := 25; -- Wait up to 5 seconds (25 * 200ms) - increased for better reliability
BEGIN
  -- Wait for auth user to be available (with retry logic)
  -- This handles replication delays when using admin.createUser
  WHILE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) AND v_wait_count < v_max_waits LOOP
    PERFORM pg_sleep(0.2); -- Wait 200ms
    v_wait_count := v_wait_count + 1;
  END LOOP;
  
  -- If user still doesn't exist after waiting, raise error
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Authentication user with ID % does not exist in auth.users after waiting. Please ensure the user was created successfully.', p_user_id;
  END IF;
  
  -- Check if salary columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'salary_amount'
  ) INTO v_has_salary_columns;
  
  -- Insert into users table (SECURITY DEFINER bypasses RLS)
  -- Use dynamic approach based on whether salary columns exist
  IF v_has_salary_columns THEN
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
  ELSE
    INSERT INTO users (
      id, email, role, first_name, last_name, job_title, company_id,
      is_sub_admin, created_at, updated_at
    )
    VALUES (
      p_user_id, p_email, 'staff', p_first_name, p_last_name, p_job_title, p_company_id,
      p_is_sub_admin, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      job_title = EXCLUDED.job_title,
      company_id = EXCLUDED.company_id,
      is_sub_admin = EXCLUDED.is_sub_admin,
      updated_at = NOW()
    RETURNING * INTO v_result;
  END IF;
  
  -- Return the result as a table row (Supabase RPC handles TABLE returns better)
  RETURN QUERY SELECT 
    v_result.id,
    v_result.email,
    v_result.role,
    v_result.company_id,
    v_result.job_title,
    v_result.first_name,
    v_result.last_name,
    v_result.avatar,
    v_result.permissions,
    v_result.is_sub_admin,
    v_result.salary_amount,
    v_result.salary_date,
    v_result.created_at,
    v_result.updated_at;
END;
$$;

-- Grant execute permission to authenticated users (admins will be able to use this)
GRANT EXECUTE ON FUNCTION create_staff_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_staff_profile TO service_role;

-- Test the function (uncomment to test):
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

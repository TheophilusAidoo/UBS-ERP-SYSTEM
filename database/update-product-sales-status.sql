-- Update product_sales table to include 'in-progress' status
-- Run this SQL in your Supabase SQL editor

-- Drop the existing check constraint
ALTER TABLE product_sales 
DROP CONSTRAINT IF EXISTS product_sales_status_check;

-- Add the new check constraint with 'in-progress' status
ALTER TABLE product_sales 
ADD CONSTRAINT product_sales_status_check 
CHECK (status IN ('pending', 'in-progress', 'sold', 'cancelled'));


-- Update Products Table for Order Management
-- Remove price, add order-related fields
-- Run this in Supabase SQL Editor

-- First, make price nullable (to support existing data)
ALTER TABLE products 
ALTER COLUMN price DROP NOT NULL;

-- Add new order-related fields
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS size VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(100),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS car_number VARCHAR(100);

-- Update status to be order-focused (available, ordered, fulfilled, cancelled)
-- Note: We keep existing status values for backward compatibility
-- New values: 'available', 'ordered', 'fulfilled', 'cancelled'
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
ADD CONSTRAINT products_status_check 
CHECK (status IN ('available', 'sold', 'pending', 'ordered', 'fulfilled', 'cancelled'));

-- For existing data, you might want to update NULL prices to 0 or keep them NULL
-- UPDATE products SET price = 0 WHERE price IS NULL;

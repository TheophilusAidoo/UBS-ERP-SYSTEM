-- Update Products RLS Policy to allow staff to update any product in their company
-- This allows staff to change product status for all products in their company, not just their own

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can update own products" ON products;
DROP POLICY IF EXISTS "Staff can update company products" ON products;

-- Create new policy that allows staff to update any product in their company
CREATE POLICY "Staff can update company products" ON products
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  );


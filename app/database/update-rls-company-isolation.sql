-- Update RLS Policies for Company-Based Data Isolation
-- Staff can only see data from their own company
-- Admin can see all data
-- Run this in Supabase SQL Editor

-- ============================================
-- HELPER FUNCTIONS (Must be created first)
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT company_id INTO result FROM users WHERE id = auth.uid() LIMIT 1;
  RETURN result;
END;
$$;

-- ============================================
-- PRODUCT SALES (ORDERS) POLICIES
-- ============================================

-- Drop existing policies (drop both old and new names to be safe)
DROP POLICY IF EXISTS "Staff can view own company sales" ON product_sales;
DROP POLICY IF EXISTS "Staff can view own company orders" ON product_sales;
DROP POLICY IF EXISTS "Staff can create sales for own company" ON product_sales;
DROP POLICY IF EXISTS "Staff can create orders for own company" ON product_sales;
DROP POLICY IF EXISTS "Staff can update own sales" ON product_sales;
DROP POLICY IF EXISTS "Staff can update company sales" ON product_sales;
DROP POLICY IF EXISTS "Staff can update company orders" ON product_sales;
DROP POLICY IF EXISTS "Admins can view all sales" ON product_sales;
DROP POLICY IF EXISTS "Admins can manage all sales" ON product_sales;
DROP POLICY IF EXISTS "Admins can manage all orders" ON product_sales;

-- Staff can view orders from their company (all staff in same company see each other's orders)
CREATE POLICY "Staff can view own company orders" ON product_sales
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can create orders for their company
CREATE POLICY "Staff can create orders for own company" ON product_sales
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (company_id = user_company_id() AND sold_by = auth.uid())
  );

-- Staff can update orders from their company (all staff in same company can update)
CREATE POLICY "Staff can update company orders" ON product_sales
  FOR UPDATE
  USING (
    is_admin()
    OR company_id = user_company_id()
  )
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all orders" ON product_sales
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- INVOICES POLICIES
-- ============================================

-- Drop existing policies (drop both old and new names)
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can view company invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can create invoices for company" ON invoices;
DROP POLICY IF EXISTS "Staff can update company invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;

-- Staff can view invoices from their company (all staff in same company see each other's invoices)
CREATE POLICY "Staff can view company invoices" ON invoices
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can create invoices for their company
CREATE POLICY "Staff can create invoices for company" ON invoices
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (company_id = user_company_id() AND created_by = auth.uid())
  );

-- Staff can update invoices from their company (all staff in same company can update)
CREATE POLICY "Staff can update company invoices" ON invoices
  FOR UPDATE
  USING (
    is_admin()
    OR company_id = user_company_id()
  )
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all invoices" ON invoices
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PROJECTS POLICIES
-- ============================================

-- Drop existing policies (drop both old and new names)
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Staff can create projects in own company" ON projects;
DROP POLICY IF EXISTS "Staff can create projects for company" ON projects;
DROP POLICY IF EXISTS "Staff can update assigned projects" ON projects;
DROP POLICY IF EXISTS "Staff can view company projects" ON projects;
DROP POLICY IF EXISTS "Staff can update company projects" ON projects;
DROP POLICY IF EXISTS "Staff can delete company projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;

-- Staff can view projects from their company (all staff in same company see all company projects)
CREATE POLICY "Staff can view company projects" ON projects
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can create projects for their company
CREATE POLICY "Staff can create projects for company" ON projects
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can update projects from their company (all staff in same company can update)
CREATE POLICY "Staff can update company projects" ON projects
  FOR UPDATE
  USING (
    is_admin()
    OR company_id = user_company_id()
  )
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can delete projects from their company (all staff in same company can delete)
CREATE POLICY "Staff can delete company projects" ON projects
  FOR DELETE
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- CLIENTS POLICIES
-- ============================================

-- Drop existing policies (drop both old and new names, but keep client login policies)
-- Note: "Clients can view own profile" and "Clients can update own profile" policies are kept for client login
DROP POLICY IF EXISTS "Staff can view clients from their company" ON clients;
DROP POLICY IF EXISTS "Staff can view company clients" ON clients;
DROP POLICY IF EXISTS "Staff can create clients for their company" ON clients;
DROP POLICY IF EXISTS "Staff can create clients for company" ON clients;
DROP POLICY IF EXISTS "Staff can update clients from their company" ON clients;
DROP POLICY IF EXISTS "Staff can update company clients" ON clients;
DROP POLICY IF EXISTS "Staff can delete clients from their company" ON clients;
DROP POLICY IF EXISTS "Staff can delete company clients" ON clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON clients;

-- Staff can view clients from their company (all staff in same company see all company clients)
CREATE POLICY "Staff can view company clients" ON clients
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
    -- Clients can view their own profile (for login)
    OR (auth_user_id = auth.uid())
  );

-- Staff can create clients for their company
CREATE POLICY "Staff can create clients for company" ON clients
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (company_id = user_company_id() AND created_by = auth.uid())
  );

-- Staff can update clients from their company (all staff in same company can update)
CREATE POLICY "Staff can update company clients" ON clients
  FOR UPDATE
  USING (
    is_admin()
    OR company_id = user_company_id()
    -- Clients can update their own profile
    OR (auth_user_id = auth.uid())
  )
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
    -- Clients can update their own profile
    OR (auth_user_id = auth.uid())
  );

-- Staff can delete clients from their company (all staff in same company can delete)
CREATE POLICY "Staff can delete company clients" ON clients
  FOR DELETE
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all clients" ON clients
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- TRANSACTIONS (FINANCIAL) POLICIES
-- ============================================

-- Drop existing policies (drop both old and new names)
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view company transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can create transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can view company transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can create company transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can update company transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can delete company transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON transactions;

-- Staff can view transactions from their company (all staff in same company see all company transactions)
CREATE POLICY "Staff can view company transactions" ON transactions
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can create transactions for their company
CREATE POLICY "Staff can create company transactions" ON transactions
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can update transactions from their company (all staff in same company can update)
CREATE POLICY "Staff can update company transactions" ON transactions
  FOR UPDATE
  USING (
    is_admin()
    OR company_id = user_company_id()
  )
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can delete transactions from their company (all staff in same company can delete)
CREATE POLICY "Staff can delete company transactions" ON transactions
  FOR DELETE
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all transactions" ON transactions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- DELIVERIES POLICIES (Already has company-based policies, but let's ensure consistency)
-- ============================================

-- Drop existing policies (drop both old and new names)
DROP POLICY IF EXISTS "Staff can view deliveries from their company" ON deliveries;
DROP POLICY IF EXISTS "Staff can view company deliveries" ON deliveries;
DROP POLICY IF EXISTS "Staff can create deliveries for their company" ON deliveries;
DROP POLICY IF EXISTS "Staff can create company deliveries" ON deliveries;
DROP POLICY IF EXISTS "Staff can update their own deliveries" ON deliveries;
DROP POLICY IF EXISTS "Staff can update company deliveries" ON deliveries;
DROP POLICY IF EXISTS "Staff can delete company deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can create deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can update all deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can delete deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON deliveries;

-- Staff can view deliveries from their company (all staff in same company see all company deliveries)
CREATE POLICY "Staff can view company deliveries" ON deliveries
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can create deliveries for their company
CREATE POLICY "Staff can create company deliveries" ON deliveries
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (company_id = user_company_id() AND created_by = auth.uid())
  );

-- Staff can update deliveries from their company (all staff in same company can update)
CREATE POLICY "Staff can update company deliveries" ON deliveries
  FOR UPDATE
  USING (
    is_admin()
    OR company_id = user_company_id()
  )
  WITH CHECK (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can delete deliveries from their company (all staff in same company can delete)
CREATE POLICY "Staff can delete company deliveries" ON deliveries
  FOR DELETE
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all deliveries" ON deliveries
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- ATTENDANCE POLICIES (Update to allow viewing company attendance)
-- ============================================

-- Drop existing policies (drop both old and new names)
DROP POLICY IF EXISTS "Staff can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Staff can view company attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;

-- Staff can view attendance from their company (all staff in same company see all company attendance)
CREATE POLICY "Staff can view company attendance" ON attendance
  FOR SELECT
  USING (
    is_admin()
    OR user_id IN (
      SELECT id FROM users WHERE company_id = user_company_id()
    )
  );

-- Keep existing insert and update policies for staff own attendance
-- They are already correct

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT
  USING (is_admin());

-- ============================================
-- LEAVE REQUESTS POLICIES (Update to allow viewing company leaves)
-- ============================================

-- Drop existing policies (drop both old and new names)
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Staff can view company leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;

-- Staff can view leave requests from their company (all staff in same company see all company leaves)
CREATE POLICY "Staff can view company leave requests" ON leave_requests
  FOR SELECT
  USING (
    is_admin()
    OR user_id IN (
      SELECT id FROM users WHERE company_id = user_company_id()
    )
  );

-- Admins can view all leave requests
CREATE POLICY "Admins can view all leave requests" ON leave_requests
  FOR SELECT
  USING (is_admin());

-- Keep existing create and update policies
-- They are already correct


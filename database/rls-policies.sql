-- Row Level Security Policies for UBS ERP
-- Run this in Supabase SQL Editor after creating the schema

-- Attendance Table Policies
-- Staff can insert their own attendance
DROP POLICY IF EXISTS "Staff can insert own attendance" ON attendance;
CREATE POLICY "Staff can insert own attendance" ON attendance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.id = user_id
    )
  );

-- Staff can view their own attendance
DROP POLICY IF EXISTS "Staff can view own attendance" ON attendance;
CREATE POLICY "Staff can view own attendance" ON attendance
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Staff can update their own attendance (clock out)
DROP POLICY IF EXISTS "Staff can update own attendance" ON attendance;
CREATE POLICY "Staff can update own attendance" ON attendance
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  );

-- Admins can view all attendance
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users Table Policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Companies Table Policies
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;
CREATE POLICY "Admins can manage companies" ON companies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view own company" ON companies;
CREATE POLICY "Staff can view own company" ON companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Leave Requests Policies
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
CREATE POLICY "Users can view own leave requests" ON leave_requests
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can create leave requests" ON leave_requests;
CREATE POLICY "Staff can create leave requests" ON leave_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  );

DROP POLICY IF EXISTS "Admins can update leave requests" ON leave_requests;
CREATE POLICY "Admins can update leave requests" ON leave_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Transactions Policies
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;
CREATE POLICY "Admins can manage transactions" ON transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Invoices Policies
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
CREATE POLICY "Users can create invoices" ON invoices
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
CREATE POLICY "Admins can update invoices" ON invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Projects Policies
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can create projects in own company" ON projects;
CREATE POLICY "Staff can create projects in own company" ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.company_id = company_id
    )
  );

DROP POLICY IF EXISTS "Staff can update assigned projects" ON projects;
CREATE POLICY "Staff can update assigned projects" ON projects
  FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  )
  WITH CHECK (
    id IN (
      SELECT project_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  );

-- Messages Policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE
  USING (to_user_id = auth.uid());

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Project Assignments Policies
DROP POLICY IF EXISTS "Users can view own project assignments" ON project_assignments;
CREATE POLICY "Users can view own project assignments" ON project_assignments
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage project assignments" ON project_assignments;
CREATE POLICY "Admins can manage project assignments" ON project_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can create own project assignments" ON project_assignments;
CREATE POLICY "Staff can create own project assignments" ON project_assignments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'staff'
    )
  );



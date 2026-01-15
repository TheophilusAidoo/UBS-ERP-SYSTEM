# Company-Based Data Isolation Setup

## Overview
This document explains how company-based data isolation is implemented in the UBS ERP system. Staff members can only see data from their own company, while admins can see all data across all companies.

## How It Works

### Row Level Security (RLS) Policies
All data access is controlled at the database level using Supabase Row Level Security (RLS) policies. This ensures that:
- **Staff users** can only see data from their own company
- **Staff users in the same company** can see each other's data
- **Admin users** can see all data from all companies
- Data isolation is enforced at the database level, preventing unauthorized access

### Tables with Company Isolation

The following tables have company-based RLS policies:

1. **Product Sales (Orders)** - `product_sales`
   - Staff can view/create/update orders from their company
   - Staff can see all orders from all staff in their company

2. **Invoices** - `invoices`
   - Staff can view/create/update invoices from their company
   - Staff can see all invoices from all staff in their company

3. **Projects** - `projects`
   - Staff can view/create/update/delete projects from their company
   - Staff can see all projects from all staff in their company

4. **Clients** - `clients`
   - Staff can view/create/update/delete clients from their company
   - Staff can see all clients from all staff in their company
   - Clients can view/update their own profile (for login)

5. **Transactions (Financial)** - `transactions`
   - Staff can view/create/update/delete transactions from their company
   - Staff can see all transactions from all staff in their company

6. **Deliveries** - `deliveries`
   - Staff can view/create/update/delete deliveries from their company
   - Staff can see all deliveries from all staff in their company

7. **Attendance** - `attendance`
   - Staff can view attendance from all users in their company
   - Staff can only insert/update their own attendance

8. **Leave Requests** - `leave_requests`
   - Staff can view leave requests from all users in their company
   - Staff can only create their own leave requests

## Setup Instructions

### Step 1: Run the RLS Migration
1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `database/update-rls-company-isolation.sql`
3. Copy and paste the entire SQL script into the SQL Editor
4. Click "Run" to execute the migration

### Step 2: Verify RLS is Enabled
After running the migration, verify that RLS is enabled on all tables:

```sql
-- Check if RLS is enabled on key tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'product_sales', 'invoices', 'projects', 'clients', 
  'transactions', 'deliveries', 'attendance', 'leave_requests'
);
```

All tables should have `rowsecurity = true`.

### Step 3: Test Company Isolation

#### Test as Staff User:
1. Log in as a staff member from Company A
2. Verify you can only see:
   - Orders from Company A
   - Invoices from Company A
   - Projects from Company A
   - Clients from Company A
   - Transactions from Company A
   - Deliveries from Company A
   - Attendance from Company A staff
   - Leave requests from Company A staff

3. Verify you CANNOT see data from Company B

#### Test as Admin:
1. Log in as an admin user
2. Verify you can see:
   - All orders from all companies
   - All invoices from all companies
   - All projects from all companies
   - All clients from all companies
   - All transactions from all companies
   - All deliveries from all companies
   - All attendance from all companies
   - All leave requests from all companies

## Technical Implementation

### Helper Functions
The RLS policies use two helper functions:

1. **`is_admin()`** - Returns `true` if the current user is an admin
2. **`user_company_id()`** - Returns the company_id of the current user

These functions are defined in the migration SQL file and use `SECURITY DEFINER` to bypass RLS when checking user permissions.

### Policy Structure
Each table has policies following this pattern:

```sql
-- Staff can view company data
CREATE POLICY "Staff can view company [table]" ON [table]
  FOR SELECT
  USING (
    is_admin()
    OR company_id = user_company_id()
  );

-- Staff can create company data
CREATE POLICY "Staff can create company [table]" ON [table]
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (company_id = user_company_id() AND created_by = auth.uid())
  );

-- Staff can update company data
CREATE POLICY "Staff can update company [table]" ON [table]
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
CREATE POLICY "Admins can manage all [table]" ON [table]
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

## Important Notes

1. **RLS is Enforced at Database Level**: Even if the frontend tries to query all data, RLS policies will automatically filter results based on the user's company.

2. **No Frontend Changes Required**: The existing service functions already support filtering by `companyId`, but RLS ensures security even if the frontend doesn't filter.

3. **Performance**: RLS policies use indexes efficiently. Make sure indexes exist on `company_id` columns (they should already exist from the schema setup).

4. **Admin Access**: Admins can always see all data because `is_admin()` returns `true` for admin users.

5. **Company Assignment**: Ensure that all staff users have a valid `company_id` in the `users` table. Users without a company_id may not be able to access company-scoped data.

## Troubleshooting

### Staff Cannot See Data
1. Verify the user has a `company_id` set in the `users` table
2. Verify RLS policies were created successfully
3. Check Supabase logs for any RLS policy errors

### Admin Cannot See All Data
1. Verify the user's `role` is set to `'admin'` in the `users` table
2. Verify the `is_admin()` function is working correctly:
   ```sql
   SELECT is_admin();
   ```

### Data from Multiple Companies Visible to Staff
1. Re-run the RLS migration to ensure policies are correct
2. Check that RLS is enabled on the table:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = '[table_name]';
   ```

## Related Files

- `database/update-rls-company-isolation.sql` - Main RLS migration file
- `database/rls-policies.sql` - Original RLS policies (may be outdated)
- `database/fix-users-rls-no-recursion.sql` - Helper functions for user checks
- `src/services/*.service.ts` - Service files that interact with these tables

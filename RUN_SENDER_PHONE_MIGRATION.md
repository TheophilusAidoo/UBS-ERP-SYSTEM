# Run Sender Phone Migration

## Quick Fix: Add `sender_phone` Column to Deliveries Table

The `sender_phone` column is missing from the `deliveries` table. Follow these steps to add it:

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration
Copy and paste this SQL into the SQL Editor:

```sql
-- Add sender_phone column to deliveries table
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(50);
```

### Step 3: Execute
1. Click **Run** button (or press Ctrl/Cmd + Enter)
2. You should see: "Success. No rows returned"

### Step 4: Verify
1. Go to **Table Editor** in the left sidebar
2. Select the `deliveries` table
3. Check that the `sender_phone` column exists

## Alternative: Run the Migration File Directly

You can also copy the entire contents of `database/add-sender-phone-to-deliveries.sql` and run it in the SQL Editor.

## ✅ After Running

Once the migration is complete, the error should be resolved and you'll be able to:
- Create deliveries with sender phone numbers
- View sender phone numbers in the admin deliveries screen
- See sender phone numbers in delivery PDFs


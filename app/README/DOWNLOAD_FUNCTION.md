# Download Supabase Edge Function

## Install Supabase CLI First

### Option 1: Using npm (Recommended)
```bash
npm install -g supabase
```

### Option 2: Using Homebrew (Mac)
```bash
brew install supabase/tap/supabase
```

### Option 3: Using Direct Download
Visit: https://supabase.com/docs/guides/cli

---

## After Installing, Download the Function

### Step 1: Login to Supabase
```bash
supabase login
```

### Step 2: Link to Your Project
```bash
supabase link --project-ref shejpknspmrlgbjhhptx
```

### Step 3: Download the Function
```bash
supabase functions download smart-task
```

This will download the function to: `supabase/functions/smart-task/`

---

## Alternative: Download via Dashboard

If you prefer not to use CLI:

1. Go to: https://supabase.com/dashboard/project/shejpknspmrlgbjhhptx
2. Click **"Edge Functions"** in left sidebar
3. Find **"smart-task"** function
4. Click on it to view the code
5. Copy the code manually

---

## Quick Install & Download Script

Run this in your terminal:

```bash
# Install Supabase CLI
npm install -g supabase

# Login (will open browser)
supabase login

# Link to project
supabase link --project-ref shejpknspmrlgbjhhptx

# Download function
supabase functions download smart-task
```



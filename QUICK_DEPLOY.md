# ⚡ Quick Deploy - 3 Steps

## 1️⃣ Copy Function Code
- Open: `supabase/functions/send-email/index.ts`
- Select ALL (Ctrl+A) and Copy (Ctrl+C)

## 2️⃣ Deploy in Supabase
- Go to: https://supabase.com/dashboard → Your Project → Edge Functions
- Click: **send-email** function (or Create if it doesn't exist)
- Paste code → Click **Deploy**

## 3️⃣ Set Environment Variables (IMPORTANT!)
- Go to: Settings → Edge Functions → Environment Variables
- Add:
  - **Key**: `SUPABASE_URL` → **Value**: `https://shejpknspmrlgbjhhptx.supabase.co`
  - **Key**: `SUPABASE_SERVICE_ROLE_KEY` → **Value**: (Get from Settings → API → service_role key)
- **Redeploy** the function after adding variables

## ✅ Test
- Edge Functions → send-email → Invoke → GET → Should return success
- Try "Send Test Email" from app Settings page

**That's it!** The function should work now. 🎉


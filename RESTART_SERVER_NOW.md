# 🔄 RESTART EMAIL SERVER - Required!

## ⚠️ IMPORTANT: You MUST restart the server for the fix to work!

The code has been updated to handle large PDF attachments (50MB limit), but **the running server needs to be restarted** to apply the changes.

## 🛑 Step 1: Stop the Current Server

In the terminal where the email server is running:
- Press `Ctrl+C` to stop it

## 🚀 Step 2: Start the Server Again

```bash
cd backend
npm start
```

## ✅ Step 3: Verify It's Running

You should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email Server Started Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🧪 Step 4: Test Again

Try creating an invoice with email - it should work now!

## 🔍 If You're Not Sure Which Server is Running:

Run this to kill all email servers:
```bash
cd backend
npm run kill
```

Then start fresh:
```bash
npm start
```

---

**The fix increases the request body limit from 1MB (default) to 50MB to handle PDF attachments.**

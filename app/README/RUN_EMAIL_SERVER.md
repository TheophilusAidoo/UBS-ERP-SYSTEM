# 🚀 RUN EMAIL SERVER - Step by Step

## ⚡ QUICK START (Copy & Paste):

**Open a NEW terminal window and run these commands:**

```bash
cd "/Users/alphamac/Downloads/UBS ERP /backend"
npm start
```

## ✅ What You Should See:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email Server Started Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server URL: http://localhost:3001
📍 Server PID: [number]
💡 Frontend connects to: http://localhost:3001
💡 Health check: http://localhost:3001/health
✅ SMTP configured and ready to send emails!
   Host: mail.ubscrm.com
   Port: 465
   User: info@ubscrm.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Keep this terminal open - server must stay running!
⚠️  Press Ctrl+C to stop the server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🧪 Verify It's Working:

**In a NEW browser tab or terminal, test:**

```
http://localhost:3001/health
```

**Should return:**
```json
{
  "success": true,
  "message": "Email server is running",
  "smtp": {
    "host": "mail.ubscrm.com",
    "port": 465,
    "user": "info@ubscrm.com",
    "passwordSet": true
  }
}
```

## 📧 Then Test Email:

1. Go to your app (http://localhost:3003)
2. Admin Panel → Settings → Email Configuration
3. Click "Send Test Email"
4. Enter your email address
5. Click "Send Test Email"

## ⚠️ IMPORTANT:

- **Keep the email server terminal OPEN** - don't close it!
- The server must stay running to send emails
- Frontend (port 3003) and Email Server (port 3001) run separately

## 🛑 To Stop Server:

Press `Ctrl+C` in the terminal where the server is running.

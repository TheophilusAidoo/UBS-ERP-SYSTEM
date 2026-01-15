# 🚀 Quick Start Email Server

## ✅ Port Conflict Fixed!

The server now handles port conflicts gracefully and shows helpful error messages.

## 🎯 Start the Server (Choose One Method):

### Method 1: Simple Start (Recommended)
```bash
cd backend
npm start
```

### Method 2: Kill First, Then Start
```bash
cd backend
npm run kill    # Kills all existing processes
npm start       # Starts fresh
```

### Method 3: Restart Script
```bash
cd backend
npm run restart
```

### Method 4: Use Helper Script
```bash
cd backend
./start-clean.sh
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

**Test health endpoint:**
```bash
curl http://localhost:3001/health
```

**Or open in browser:**
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

## ⚠️ If You Get Port Error:

The server will now show helpful instructions:

```
❌ ERROR: Port 3001 is already in use!

💡 Another process is using port 3001.

📋 To fix this, run one of these commands:

   Option 1: Kill the process using port 3001
   lsof -ti:3001 | xargs kill -9

   Option 2: Kill all email server processes
   pkill -f "email-server.js" && pkill -f "app.cjs"

   Option 3: Use npm run kill
   npm run kill

   Option 4: Use a different port
   PORT=3002 npm start
```

## 📧 Test Email in App:

1. Go to Admin Panel → Settings → Email Configuration
2. Click "Send Test Email"
3. Enter your email address
4. Click "Send Test Email"

## 🛑 To Stop Server:

Press `Ctrl+C` in the terminal where the server is running.

**⚠️ IMPORTANT:** Don't use `Ctrl+Z` (suspend) - it keeps the port locked! Always use `Ctrl+C` to stop properly.

## 📝 Notes:

- **Only run ONE server** - Use `npm start` (runs `email-server.js`)
- **Keep terminal open** - Server must stay running to send emails
- **Port 3001** - Frontend connects to this port
- **Don't suspend** - Use Ctrl+C, not Ctrl+Z

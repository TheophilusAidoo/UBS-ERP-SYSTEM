# ✅ Email Server Verification

## 🔍 Check if Server is Running:

**In your browser or terminal, test:**

```bash
curl http://localhost:3001/health
```

**Or open in browser:**
```
http://localhost:3001/health
```

**Expected response:**
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

## 🚀 If Health Check Doesn't Work:

**The server might not be running. Start it:**

### Option 1: Use Startup Script
```bash
./start-email-server.sh
```

### Option 2: Manual Start
```bash
cd backend
npm start
```

**Keep the terminal open** - the server needs to keep running!

## ✅ You Should See:

```
📧 Email server running on http://localhost:3001
✅ Ready to send emails!
💡 Health check: http://localhost:3001/health
```

## 📧 Then Test Email:

1. Go to Admin Panel → Settings → Email Configuration
2. Enter your email in "Test Email To"
3. Click "Send Test Email"

---

**Note:** The email server must be running in a separate terminal window. Keep it running while using the app!

# 🚀 Start Email Server - Quick Guide

## ✅ Email Server is Ready!

The email server has been configured with your SMTP settings:
- **SMTP Host:** mail.ubscrm.com
- **SMTP Port:** 465
- **SMTP User:** info@ubscrm.com
- **SMTP Password:** Aidoo@1998
- **Server Port:** 3000

## 🚀 To Start the Email Server:

### Option 1: Use the Startup Script (Easiest)
```bash
./start-email-server.sh
```

### Option 2: Manual Start
```bash
cd backend
npm start
```

### Option 3: Using Nodemon (Auto-restart on changes)
```bash
cd backend
npm run dev
```

## ✅ Verify Server is Running:

After starting, you should see:
```
📧 Email server running on http://localhost:3000
✅ Ready to send emails!
💡 Health check: http://localhost:3000/health
```

## 🧪 Test the Server:

1. Open: http://localhost:3000/health
2. Should return: `{"success":true,"message":"Email server is running",...}`

## 📧 Send Test Email:

1. Go to Admin Panel → Settings → Email Configuration
2. Make sure settings are saved:
   - SMTP Host: mail.ubscrm.com
   - SMTP Port: 465
   - SMTP Username: info@ubscrm.com
   - SMTP Password: Aidoo@1998
   - Connection Security: SSL (Port 465)
3. Enter your email in "Test Email To"
4. Click "Send Test Email"

## 🛑 To Stop the Server:

Press `Ctrl+C` in the terminal where the server is running.

Or kill the process:
```bash
lsof -ti:3000 | xargs kill -9
```

## ⚠️ Troubleshooting:

### "Cannot connect to email server"
- Make sure the server is running (check terminal)
- Verify port 3000 is not blocked
- Check if another process is using port 3000

### "SMTP timeout"
- Check your internet connection
- Verify SMTP settings in Admin Panel
- Check if firewall allows outbound connections on port 465
- Verify cPanel email account is active

### Server won't start
- Check if port 3000 is already in use
- Verify dependencies are installed: `cd backend && npm install`
- Check `backend/email-server.log` for errors

# ✅ Email Server Status Check

## 🔍 Verify Server is Running:

**Open a NEW terminal and run:**

```bash
# Check if server is running on port 3001
curl http://localhost:3001/health
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

## 🚀 If Server is NOT Running:

**Start it manually:**

```bash
cd "/Users/alphamac/Downloads/UBS ERP /backend"
npm start
```

**Or use the startup script:**

```bash
./start-email-server.sh
```

## 📋 Current Configuration:

- **Email Server Port:** 3001
- **Frontend Port:** 3003
- **SMTP Host:** mail.ubscrm.com
- **SMTP Port:** 465
- **SMTP User:** info@ubscrm.com

## ✅ Server Should Show:

```
📧 Email server running on http://localhost:3001
✅ Ready to send emails!
💡 Health check: http://localhost:3001/health
```

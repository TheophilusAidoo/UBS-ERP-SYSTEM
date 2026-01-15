# 🚀 QUICK START - Email Server

## ⚡ Start Email Server NOW:

**Open a NEW terminal window and run:**

```bash
cd "/Users/alphamac/Downloads/UBS ERP /backend"
npm start
```

**You should see:**
```
📧 Email server running on http://localhost:3001
✅ Ready to send emails!
```

**Note:** Email server runs on port **3001** (separate from frontend on port 3003)

## ✅ Then Test Email:

1. Go to Admin Panel → Settings → Email Configuration
2. Click "Send Test Email"
3. Enter your email address
4. Click "Send Test Email"

---

## 🔧 If Server Won't Start:

**Kill any existing server:**
```bash
lsof -ti:3001 | xargs kill -9
```

**Then start again:**
```bash
cd backend
npm start
```

---

## 📋 Current SMTP Settings:

- **Host:** mail.ubscrm.com
- **Port:** 465
- **User:** info@ubscrm.com  
- **Password:** Aidoo@1998
- **Security:** SSL

**These are already configured in `backend/.env`**

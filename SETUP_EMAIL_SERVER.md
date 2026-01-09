# 🚀 Setup Email Server - NO SUPABASE NEEDED!

## ✅ Simple 3-Step Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Email Settings

Create a `.env` file in the `backend` folder:

```env
SMTP_HOST=mail.stockmartllc.com
SMTP_PORT=465
SMTP_USER=info@stockmartllc.com
SMTP_PASSWORD=your_email_password_here
PORT=3001
```

**Important:** Replace `your_email_password_here` with your actual email password!

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
📧 Email server running on http://localhost:3001
```

## ✅ Done! 

Your email system is now working. The app will automatically use `http://localhost:3001` to send emails.

## 🚀 To Deploy to Production:

You can deploy the `backend` folder to:
- **Heroku** (free tier available)
- **Railway** (free tier)
- **Render** (free tier)
- **Your own server**

Just make sure to set the environment variables in your hosting platform.

## 📝 Optional: Change Server URL

If you deploy to a different URL, add to your `.env` file:

```env
VITE_EMAIL_SERVER_URL=https://your-server-url.com
```

Then restart your frontend app.


# 🔧 Fixed Port Conflict Issue

## ✅ What Was Fixed:

1. **Port conflict detection** - Server now shows helpful error messages when port 3001 is in use
2. **Better error handling** - Both `email-server.js` and `app.cjs` now handle `EADDRINUSE` errors gracefully
3. **Kill scripts** - Added scripts to easily kill existing processes

## 🚀 How to Start the Server Now:

### Option 1: Use npm start (Recommended)
```bash
cd backend
npm start
```

### Option 2: Kill processes first, then start
```bash
cd backend
npm run kill    # Kill all existing processes
npm start       # Start fresh
```

### Option 3: Use restart script
```bash
cd backend
npm run restart
```

### Option 4: Manual kill and start
```bash
cd backend
# Kill all processes on port 3001
lsof -ti:3001 | xargs kill -9

# Kill all email server processes
pkill -f "email-server.js"
pkill -f "app.cjs"

# Start server
npm start
```

## ⚠️ Important Notes:

1. **Only run ONE server at a time** - Either `email-server.js` OR `app.cjs`, not both
2. **Use `npm start`** - This runs `email-server.js` which is the main server
3. **Don't suspend with Ctrl+Z** - Use Ctrl+C to stop properly, or the port will stay locked
4. **Keep terminal open** - The server must stay running to send emails

## 🐛 If You Still Get Port Errors:

Run this command to see what's using port 3001:
```bash
lsof -i:3001
```

Then kill the specific process:
```bash
kill -9 [PID]
```

Or kill everything:
```bash
lsof -ti:3001 | xargs kill -9
```

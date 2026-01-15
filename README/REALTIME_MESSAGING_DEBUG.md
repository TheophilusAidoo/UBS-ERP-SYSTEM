# Real-Time Messaging Debug Guide

## What Was Fixed

1. **Added comprehensive logging** - All real-time events are now logged to the browser console
2. **Added subscription status checking** - The code now monitors subscription status (SUBSCRIBED, ERROR, TIMED_OUT, etc.)
3. **Improved error handling** - All async operations are wrapped in try-catch blocks
4. **Better filter syntax** - Fixed potential issues with real-time filters

## How to Debug

### 1. Open Browser Console

Open the browser developer tools (F12) and check the Console tab.

### 2. Look for These Log Messages

When you open a conversation, you should see:
```
🔔 Setting up real-time subscription for user conversation: [user-id] <-> [other-user-id]
📡 Subscription status for user-conversation:[user-id]:[other-user-id]: SUBSCRIBED
✅ Successfully subscribed to real-time updates
```

### 3. When Sending a Message

You should see:
```
📨 Real-time message received: [payload object]
✅ Processing message in conversation: [message-id]
📩 New message received via real-time: [message-id]
➕ Adding new message: [message-id]
```

### 4. Common Issues and Solutions

#### Issue: No subscription status messages
**Solution**: 
- Check if Supabase real-time is enabled for the messages table
- Run the SQL in `database/enable-realtime-messages.sql`
- Verify in Supabase Dashboard > Database > Replication that "messages" table is enabled

#### Issue: Subscription status shows "CHANNEL_ERROR" or "TIMED_OUT"
**Solution**:
- Check your Supabase connection
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check network connectivity
- Verify RLS policies allow the user to read messages

#### Issue: Messages appear but not in real-time
**Solution**:
- Check console for error messages
- Verify the subscription is actually SUBSCRIBED (not just JOINED)
- Check if messages are being filtered out incorrectly

#### Issue: No messages received at all
**Solution**:
- Verify the user IDs are correct
- Check if the message is actually being saved to the database
- Verify RLS policies allow INSERT on messages table
- Check if the filter is too restrictive

## Testing Steps

1. **Open two browser windows** (or use incognito mode for the second)
2. **Login as different users** in each window
3. **Open the messaging screen** in both windows
4. **Start a conversation** between the two users
5. **Send a message** from one window
6. **Check the console** in both windows for real-time events
7. **Verify the message appears** in the other window without refresh

## Console Commands for Testing

You can also manually test the subscription:

```javascript
// In browser console, check subscription status
const channel = supabase.channel('test-channel');
channel.subscribe((status) => {
  console.log('Status:', status);
});
```

## Verification Checklist

- [ ] Real-time replication enabled for messages table
- [ ] Console shows "SUBSCRIBED" status
- [ ] No errors in console
- [ ] Messages appear in real-time when sent
- [ ] Conversation list updates automatically
- [ ] Works for both user-to-user and client conversations

## Still Not Working?

1. Check the browser console for specific error messages
2. Verify Supabase project settings allow real-time
3. Check network tab for WebSocket connections
4. Verify RLS policies are correct
5. Try refreshing the page and re-subscribing



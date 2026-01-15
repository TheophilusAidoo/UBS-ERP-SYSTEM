# 🔐 Set Admin Password - Browser Console Method

## ✅ Easiest Method: Use Browser Console

1. **Open your app** in the browser (http://localhost:3000 or wherever it's running)
2. **Open Developer Console** (Press `F12` or `Cmd+Option+I` on Mac)
3. **Go to Console tab**
4. **Paste and run this code:**

```javascript
(async () => {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const admin = createClient(
    'https://shejpknspmrlgbjhhptx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzMDU0OSwiZXhwIjoyMDgyNTA2NTQ5fQ.1A4yV38E8lEjlgJnr1g3txHhgNGPmTlSOLkUB_ZrX8A',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  try {
    console.log('🔐 Setting admin password to: adminubs@1234');
    const { data: users } = await admin.auth.admin.listUsers();
    const adminUser = users.users.find(u => u.email?.toLowerCase() === 'admin@ubs.com');
    
    if (!adminUser) {
      console.log('⚠️ Creating new auth user...');
      const { data: newUser, error: e } = await admin.auth.admin.createUser({
        email: 'admin@ubs.com',
        password: 'adminubs@1234',
        email_confirm: true,
        user_metadata: { role: 'admin', first_name: 'Admin', last_name: 'User' }
      });
      if (e) throw e;
      console.log('✅ Created auth user:', newUser.user.id);
      
      // Update profile ID if needed
      const { data: profile } = await admin.from('users').select('id').ilike('email', 'admin@ubs.com').maybeSingle();
      if (profile && profile.id !== newUser.user.id) {
        await admin.from('users').update({ id: newUser.user.id }).eq('id', profile.id);
        console.log('✅ Updated profile ID to match auth user');
      }
    } else {
      console.log('✅ Found auth user, updating password...');
      const { data: updated, error: e } = await admin.auth.admin.updateUserById(
        adminUser.id,
        { password: 'adminubs@1234', email_confirm: true }
      );
      if (e) throw e;
      console.log('✅ Password updated for:', adminUser.id);
    }
    
    console.log('');
    console.log('✅✅✅ SUCCESS! ✅✅✅');
    console.log('🔗 Login credentials:');
    console.log('   Email: admin@ubs.com');
    console.log('   Password: adminubs@1234');
    console.log('');
    console.log('💡 Now try logging in!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }
})();
```

5. **Press Enter** to run
6. **Wait for success message**
7. **Try logging in** with:
   - Email: `admin@ubs.com`
   - Password: `adminubs@1234`

## ✅ Alternative: Terminal Method

If browser console doesn't work, run this in your terminal:

```bash
cd '/Users/alphamac/Downloads/UBS ERP'
npm install @supabase/supabase-js
node set-admin-password.mjs
```

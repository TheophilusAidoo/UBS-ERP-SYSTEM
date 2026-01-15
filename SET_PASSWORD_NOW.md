# 🔐 Set Admin Password - Quick Solution

## ✅ Run This Command in Your Terminal

```bash
cd '/Users/alphamac/Downloads/UBS ERP' && node set-admin-password.mjs
```

**OR** if that doesn't work, run this directly:

```bash
node -e "import('@supabase/supabase-js').then(({createClient})=>{const a=createClient('https://shejpknspmrlgbjhhptx.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzMDU0OSwiZXhwIjoyMDgyNTA2NTQ5fQ.1A4yV38E8lEjlgJnr1g3txHhgNGPmTlSOLkUB_ZrX8A',{auth:{autoRefreshToken:false,persistSession:false}});a.auth.admin.listUsers().then(({data:u})=>{const au=u.users.find(x=>x.email?.toLowerCase()==='admin@ubs.com');if(!au){a.auth.admin.createUser({email:'admin@ubs.com',password:'adminubs@1234',email_confirm:true}).then(({data:d})=>console.log('✅ Created:',d.user.id)).catch(e=>console.error('❌',e.message));}else{a.auth.admin.updateUserById(au.id,{password:'adminubs@1234',email_confirm:true}).then(()=>console.log('✅ Updated password for:',au.id)).catch(e=>console.error('❌',e.message));}}).catch(e=>console.error('❌',e.message));});"
```

## ✅ Alternative: Use Browser Console

1. Open your app in browser
2. Open Developer Console (F12)
3. Paste and run this code:

```javascript
(async () => {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const admin = createClient(
    'https://shejpknspmrlgbjhhptx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzMDU0OSwiZXhwIjoyMDgyNTA2NTQ5fQ.1A4yV38E8lEjlgJnr1g3txHhgNGPmTlSOLkUB_ZrX8A',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  try {
    const { data: users } = await admin.auth.admin.listUsers();
    const adminUser = users.users.find(u => u.email?.toLowerCase() === 'admin@ubs.com');
    if (!adminUser) {
      const { data: newUser } = await admin.auth.admin.createUser({
        email: 'admin@ubs.com',
        password: 'adminubs@1234',
        email_confirm: true
      });
      console.log('✅ Created:', newUser.user.id);
    } else {
      await admin.auth.admin.updateUserById(adminUser.id, {
        password: 'adminubs@1234',
        email_confirm: true
      });
      console.log('✅ Password updated for:', adminUser.id);
    }
    console.log('✅ SUCCESS! Login with: admin@ubs.com / adminubs@1234');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
```

## ✅ After Setting Password

Login with:
- **Email:** `admin@ubs.com`
- **Password:** `adminubs@1234`

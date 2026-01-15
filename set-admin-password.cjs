// Script to set admin password in Supabase
// Run: node set-admin-password.cjs

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shejpknspmrlgbjhhptx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzMDU0OSwiZXhwIjoyMDgyNTA2NTQ5fQ.1A4yV38E8lEjlgJnr1g3txHhgNGPmTlSOLkUB_ZrX8A';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setAdminPassword() {
  try {
    console.log('🔐 Setting admin password...');
    console.log('📧 Email: admin@ubs.com');
    console.log('🔑 New Password: adminubs@1234');
    console.log('');

    // First, find the user by email
    console.log('🔍 Finding admin user...');
    const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const adminUser = usersList.users.find((u) => 
      u.email?.toLowerCase().trim() === 'admin@ubs.com'
    );

    if (!adminUser) {
      console.log('⚠️ Admin user not found in auth, creating it...');
      
      // Create the auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: 'admin@ubs.com',
        password: 'adminubs@1234',
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          first_name: 'Admin',
          last_name: 'User',
        },
      });

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }

      console.log('✅ Auth user created successfully!');
      console.log('📋 User ID:', newUser.user.id);
      
      // Update profile ID to match if needed
      const { data: profile, error: profileError } = await adminClient
        .from('users')
        .select('id')
        .ilike('email', 'admin@ubs.com')
        .maybeSingle();

      if (profile && profile.id !== newUser.user.id) {
        console.log('⚠️ Profile ID mismatch, updating...');
        await adminClient
          .from('users')
          .update({ id: newUser.user.id })
          .eq('id', profile.id);
        console.log('✅ Profile ID updated to match auth user');
      }

      console.log('');
      console.log('✅ SUCCESS! Admin password set to: adminubs@1234');
      console.log('🔗 You can now login with:');
      console.log('   Email: admin@ubs.com');
      console.log('   Password: adminubs@1234');
      return;
    }

    console.log('✅ Found admin user, updating password...');
    console.log('📋 User ID:', adminUser.id);

    // Update the password
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      adminUser.id,
      {
        password: 'adminubs@1234',
        email_confirm: true, // Ensure email is confirmed
      }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('✅ SUCCESS! Admin password set to: adminubs@1234');
    console.log('🔗 You can now login with:');
    console.log('   Email: admin@ubs.com');
    console.log('   Password: adminubs@1234');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check your internet connection');
    console.error('   2. Verify Supabase service is accessible');
    console.error('   3. Check service role key is correct');
    process.exit(1);
  }
}

setAdminPassword();

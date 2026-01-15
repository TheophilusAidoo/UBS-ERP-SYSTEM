import { supabase, TABLES } from './supabase';
import { User, UserRole } from '../types';
import { mapUserFromDB, mapUserToDB } from '../utils/dbMapper';
import { emailService } from './email.service';
import { createClient } from '@supabase/supabase-js';

// Helper to get admin client (bypasses RLS for login verification)
const getAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null; // Admin client not available
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
  jobTitle?: string;
  firstName?: string;
  lastName?: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; session: any }> {
    // Use the supabase client which already has fallback credentials
    console.log('🔐 Attempting login for:', credentials.email);
    console.log('📡 Using Supabase client with fallback credentials');

    try {
      // Normalize email (trim and lowercase)
      const normalizedEmail = credentials.email.trim().toLowerCase();
      const normalizedPassword = credentials.password;

      // Validate inputs
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new Error('❌ Invalid email address. Please enter a valid email.');
      }
      
      if (!normalizedPassword || normalizedPassword.length < 1) {
        throw new Error('❌ Password is required.');
      }

      let loginData: any = null;
      let loginError: any = null;

      // Retry logic for network issues
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 Calling Supabase auth.signInWithPassword... (attempt ${retryCount + 1}/${maxRetries + 1})`);
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
          });

          loginData = data;
          loginError = error;
          
          // If successful or non-retryable error, break
          if (!error || (!error.message?.includes('network') && !error.message?.includes('timeout'))) {
            break;
          }
          
          // If retryable error and we have retries left
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`⚠️ Retryable error, retrying in ${retryCount * 500}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            continue;
          }
          
          break;
        } catch (networkError: any) {
          if (retryCount < maxRetries && (networkError.message?.includes('network') || networkError.message?.includes('timeout'))) {
            retryCount++;
            console.log(`⚠️ Network error, retrying in ${retryCount * 500}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            continue;
          }
          throw networkError;
        }
      }
      
      console.log('📥 Supabase response:', { 
        hasUser: !!loginData?.user, 
        hasSession: !!loginData?.session, 
        error: loginError?.message 
      });

      if (loginError) {
        console.error('❌ Login error:', loginError.message, loginError);
        
        // Provide user-friendly error messages
        if (loginError.message.includes('Email logins are disabled') || 
            loginError.message.includes('Email provider is disabled') ||
            (loginError.message.includes('email provider') && loginError.message.includes('disabled'))) {
          throw new Error('❌ Email logins are disabled in Supabase!\n\n🔧 To fix this:\n1. Go to Supabase Dashboard: https://supabase.com/dashboard\n2. Select your project\n3. Go to Authentication > Providers\n4. Find "Email" provider\n5. Click "Enable" toggle to enable it\n6. Save changes\n7. Try logging in again\n\n💡 Check ENABLE_EMAIL_LOGIN.md for detailed instructions.');
        }
        
        if (loginError.message.includes('Email not confirmed')) {
          // Try to auto-confirm the email using admin client
          console.log('⚠️ Email not confirmed, attempting to auto-confirm...');
          const adminClient = getAdminClient();
          
          if (adminClient) {
            try {
              // Normalize email for matching
              const normalizedEmail = credentials.email.trim().toLowerCase();
              
              // Find the user by email
              const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers();
              if (!listError && usersList?.users) {
                const userToConfirm = usersList.users.find((u: any) => 
                  u.email?.toLowerCase().trim() === normalizedEmail
                );
                
                if (userToConfirm) {
                  console.log('✅ Found user, confirming email...');
                  
                  // Confirm the email with retry logic
                  let confirmed = false;
                  let retryCount = 0;
                  const maxRetries = 3;
                  
                  while (!confirmed && retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                    const { error: confirmError } = await adminClient.auth.admin.updateUserById(
                      userToConfirm.id,
                      { email_confirm: true }
                    );
                    
                    if (confirmError) {
                      retryCount++;
                      console.warn(`⚠️ Failed to confirm email (attempt ${retryCount}/${maxRetries}):`, confirmError);
                      if (retryCount >= maxRetries) {
                        throw new Error(`Failed to confirm email after ${maxRetries} attempts: ${confirmError.message}`);
                      }
                    } else {
                      confirmed = true;
                      console.log('✅ Email confirmed successfully');
                    }
                  }
                  
                  if (confirmed) {
                    // Wait a moment for confirmation to propagate
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    console.log('🔄 Retrying login after email confirmation...');
                    // Retry login after confirming
                    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                      email: credentials.email.trim(), // Use trimmed email
                      password: credentials.password,
                    });
                    
                    if (!retryError && retryData?.user && retryData?.session) {
                      console.log('✅ Login successful after email confirmation!');
                      // Update the login data and clear error
                      loginData = retryData;
                      loginError = null;
                    } else {
                      console.error('❌ Login still failed after email confirmation:', retryError?.message);
                      throw new Error(`Email confirmed, but login still failed: ${retryError?.message || 'Unknown error'}`);
                    }
                  }
                } else {
                  throw new Error('User not found in auth system. Please verify the email address.');
                }
              } else {
                throw new Error(`Failed to find user: ${listError?.message || 'Unknown error'}`);
              }
            } catch (confirmError: any) {
              console.error('❌ Error auto-confirming email:', confirmError);
              throw new Error(`Email not confirmed and auto-confirmation failed: ${confirmError.message}`);
            }
          } else {
            // No admin client available - show helpful error
            if (credentials.email === 'admin@ubs.com') {
              throw new Error('❌ Admin email not confirmed!\n\n🔧 To fix:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Find admin@ubs.com\n3. Click "..." > "Confirm Email"\n\nOR recreate with:\n1. Click "Add User" > "Create new user"\n2. Email: admin@ubs.com\n3. Password: test123 (or your preferred password)\n4. ✅ Check "Auto Confirm User"\n5. Click "Create User"');
            }
            throw new Error('❌ Email not confirmed!\n\nPlease confirm your email in Supabase Dashboard > Authentication > Users, or contact your administrator.');
          }
        }
        
        if (loginError.message.includes('Invalid login credentials') || 
            loginError.message.includes('Invalid password') ||
            loginError.message.includes('User not found') ||
            loginError.message.includes('Email rate limit exceeded')) {
          
          // Try to auto-create auth user if profile exists in database
          console.log('⚠️ Invalid credentials - checking if profile exists in database...');
          const adminClient = getAdminClient();
          
          if (adminClient) {
            try {
              // Check if user profile exists in database
              const { data: existingProfile, error: profileCheckError } = await adminClient
                .from(TABLES.users)
                .select('id, email, role, first_name, last_name')
                .ilike('email', normalizedEmail)
                .maybeSingle();
              
              if (existingProfile && !profileCheckError) {
                console.log('✅ Profile exists in database! Checking if auth user exists...');
                
                // Check if auth user exists
                const { data: authUsersList, error: listError } = await adminClient.auth.admin.listUsers();
                const authUserExists = authUsersList?.users?.some((u: any) => 
                  u.email?.toLowerCase().trim() === normalizedEmail
                );
                
                if (!authUserExists) {
                  console.log('⚠️ Auth user does not exist, creating it...');
                  
                  // Create auth user with the password user entered
                  const { data: authUserData, error: createAuthError } = await adminClient.auth.admin.createUser({
                    email: normalizedEmail,
                    password: normalizedPassword,
                    email_confirm: true,
                    user_metadata: {
                      role: existingProfile.role,
                      first_name: existingProfile.first_name || 'Admin',
                      last_name: existingProfile.last_name || 'User',
                    },
                  });
                  
                  if (!createAuthError && authUserData?.user) {
                    console.log('✅ Auth user created successfully!');
                    
                    // Update profile ID to match auth user ID if they don't match
                    if (existingProfile.id !== authUserData.user.id) {
                      console.log('⚠️ Profile ID mismatch, updating profile ID...');
                      await adminClient
                        .from(TABLES.users)
                        .update({ id: authUserData.user.id })
                        .eq('id', existingProfile.id);
                    }
                    
                    // Retry login with the newly created auth user
                    console.log('🔄 Retrying login after creating auth user...');
                    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                      email: normalizedEmail,
                      password: normalizedPassword,
                    });
                    
                    if (!retryError && retryData?.user && retryData?.session) {
                      console.log('✅ Login successful after creating auth user!');
                      loginData = retryData;
                      loginError = null;
                      // Continue with normal flow below
                    } else {
                      throw new Error(`Auth user created but login failed: ${retryError?.message || 'Unknown error'}`);
                    }
                  } else if (createAuthError?.message?.includes('already registered') || createAuthError?.message?.includes('already exists')) {
                    // Auth user exists but password is wrong
                    console.log('⚠️ Auth user exists but password is incorrect');
                    if (credentials.email === 'admin@ubs.com') {
                      throw new Error('❌ Wrong password for admin@ubs.com!\n\n🔧 To fix:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Find admin@ubs.com\n3. Click "..." > "Reset Password"\n4. Set new password\n5. Try logging in again');
                    }
                    throw new Error('❌ Wrong password!\n\nPlease reset your password in Supabase Dashboard > Authentication > Users');
                  } else {
                    throw createAuthError || new Error('Failed to create auth user');
                  }
                } else {
                  // Auth user exists but password is wrong
                  console.log('⚠️ Auth user exists but password is incorrect');
                  if (credentials.email === 'admin@ubs.com') {
                    throw new Error('❌ Wrong password for admin@ubs.com!\n\n🔧 To fix:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Find admin@ubs.com\n3. Click "..." > "Reset Password"\n4. Set new password\n5. Try logging in again');
                  }
                  throw new Error('❌ Wrong password!\n\nPlease reset your password in Supabase Dashboard > Authentication > Users');
                }
              } else {
                // Profile doesn't exist in database
                console.log('⚠️ Profile not found in database');
                if (credentials.email === 'admin@ubs.com') {
                  throw new Error('❌ Admin user not found!\n\n🔧 To fix:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Create user:\n   - Email: admin@ubs.com\n   - Password: test123 (or your preferred)\n   - ✅ Check "Auto Confirm User"\n3. Then create profile in Table Editor > users with matching ID');
                }
                throw new Error('❌ User not found!\n\nPlease create the user in Supabase Dashboard > Authentication > Users first.');
              }
            } catch (autoCreateError: any) {
              console.error('❌ Error during auto-create auth user:', autoCreateError);
              // Fall through to show error message below
            }
          }
          
          // If we get here, auto-create didn't work or admin client not available
          // Check if this is the admin user and provide specific guidance
          if (credentials.email === 'admin@ubs.com') {
            throw new Error('❌ Wrong password for admin@ubs.com!\n\n🔧 To fix:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Find admin@ubs.com\n3. Click "..." > "Reset Password"\n4. Set new password\n5. Try logging in again\n\n💡 If user doesn\'t exist, create it:\n1. Click "Add User" > "Create new user"\n2. Email: admin@ubs.com\n3. Password: test123 (or your preferred)\n4. ✅ Check "Auto Confirm User"\n5. Click "Create User"');
          }
          throw new Error('❌ Wrong credentials!\n\nPlease check:\n- Email address is correct\n- Password is correct\n- User exists in Supabase Authentication > Users\n\nIf user doesn\'t exist, create it in Supabase Dashboard first.');
        }
        
        // Generic error with full message
        throw new Error(`❌ Login failed: ${loginError.message}\n\nCommon fixes:\n1. Check if email provider is enabled (Authentication > Providers > Email)\n2. Verify user exists (Authentication > Users)\n3. Check password is correct\n4. Ensure "Auto Confirm User" was checked when creating user`);
      }

      if (!loginData || !loginData.user) {
        console.error('❌ No user data returned from Supabase');
        throw new Error('❌ Login failed: No user data returned.\n\nPlease check:\n1. User exists in Supabase Authentication > Users\n2. Email provider is enabled\n3. Try creating the user again in Supabase Dashboard');
      }

      if (!loginData.session) {
        console.error('❌ No session data returned from Supabase');
        throw new Error('❌ Login failed: No session created.\n\nPlease try again or contact administrator.');
      }

      console.log('✅ Auth successful, fetching user profile...', loginData.user.id);

      // Check if user is a client first (clients have auth accounts but are in clients table)
      // Use admin client to bypass RLS for login check (safe - only verifying identity)
      console.log('🔍 Checking if user is a client...', { authUserId: loginData.user.id, email: credentials.email });
      
      // ALWAYS try to get admin client for profile lookup (bypasses RLS)
      const adminClient = getAdminClient();
      if (!adminClient) {
        console.warn('⚠️ Admin client not available - profile lookup may fail due to RLS. Set VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
      }
      const clientSupabase = adminClient || supabase; // Use admin client if available, fallback to regular
      
      console.log('🔍 Using', adminClient ? 'admin client (bypasses RLS)' : 'regular client (subject to RLS)', 'for client check');
      
      // Try to find client by auth_user_id first, then by email
      let clientProfile: any = null;
      let clientError: any = null;
      
      // First attempt: by auth_user_id
      const { data: clientById, error: clientErrorById } = await clientSupabase
        .from(TABLES.clients)
        .select(`
          *,
          company:companies(*)
        `)
        .eq('auth_user_id', loginData.user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (clientById && !clientErrorById) {
        clientProfile = clientById;
        console.log('✅ Client found by auth_user_id');
      } else {
        // Second attempt: by email (case-insensitive, normalized)
        console.log('🔍 Client not found by auth_user_id, trying email...', clientErrorById?.message);
        const normalizedEmail = credentials.email.trim().toLowerCase();
        const { data: clientByEmail, error: clientErrorByEmail } = await clientSupabase
          .from(TABLES.clients)
          .select(`
            *,
            company:companies(*)
          `)
          .ilike('email', normalizedEmail)
          .eq('is_active', true)
          .maybeSingle();
        
        if (clientByEmail && !clientErrorByEmail) {
          clientProfile = clientByEmail;
          console.log('✅ Client found by email');
        } else {
          clientError = clientErrorByEmail || clientErrorById;
          console.log('ℹ️ Client not found:', {
            byId: clientErrorById?.message,
            byEmail: clientErrorByEmail?.message,
            usingAdminClient: !!adminClient
          });
        }
      }

      if (clientError) {
        console.error('❌ Error checking for client profile:', clientError);
      }

      if (clientProfile && !clientError) {
        // This is a client user
        console.log('✅ Client profile found:', { 
          id: clientProfile.id, 
          email: clientProfile.email, 
          authUserId: clientProfile.auth_user_id,
          name: clientProfile.name 
        });
        
        // If client doesn't have auth_user_id set but we know the auth user ID, update it
        if (!clientProfile.auth_user_id && loginData.user.id) {
          console.log('⚠️ Client profile missing auth_user_id, updating...');
          try {
            // Use admin client for update to bypass RLS if available
            const updateClient = adminClient || supabase;
            const { error: updateError } = await updateClient
              .from(TABLES.clients)
              .update({ auth_user_id: loginData.user.id })
              .eq('id', clientProfile.id);
            
            if (updateError) {
              console.warn('⚠️ Failed to update client auth_user_id:', updateError?.message);
            } else {
              console.log('✅ Updated client profile with auth_user_id');
              clientProfile.auth_user_id = loginData.user.id; // Update local object
            }
          } catch (updateError: any) {
            console.warn('⚠️ Failed to update client auth_user_id:', updateError?.message);
            // Don't fail login if update fails
          }
        }
        
        return {
          user: {
            id: clientProfile.id,
            email: clientProfile.email,
            role: 'client' as any, // Client role
            companyId: clientProfile.company_id,
            company: clientProfile.company ? {
              id: clientProfile.company.id,
              name: clientProfile.company.name,
              address: clientProfile.company.address,
              phone: clientProfile.company.phone,
              email: clientProfile.company.email,
              logo: clientProfile.company.logo,
              isActive: clientProfile.company.is_active,
              createdAt: clientProfile.company.created_at,
              updatedAt: clientProfile.company.updated_at,
            } : undefined,
            firstName: clientProfile.name?.split(' ')[0] || '',
            lastName: clientProfile.name?.split(' ').slice(1).join(' ') || '',
            createdAt: clientProfile.created_at,
            updatedAt: clientProfile.updated_at,
          } as User,
          session: loginData.session,
        };
      } else {
        console.log('ℹ️ User is not a client, checking staff/admin users table...');
      }

      // If not a client, fetch user profile from users table
      // CRITICAL: Use admin client to bypass RLS for login verification
      console.log('📋 Fetching user profile from users table...');
      console.log('📋 Auth User ID:', loginData.user.id);
      console.log('📋 Email:', normalizedEmail);
      
      // ALWAYS use admin client if available for profile lookup (bypasses RLS)
      const profileSupabase = adminClient || supabase;
      console.log('🔍 Using', adminClient ? 'admin client (bypasses RLS)' : 'regular client (subject to RLS)', 'for profile lookup');
      
      if (!adminClient) {
        console.warn('⚠️ WARNING: Admin client not available! Profile lookup may fail due to RLS policies.');
        console.warn('⚠️ Set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file to fix this.');
      }
      
      // PRIORITY: Try by email FIRST (email is unique and doesn't depend on ID matching)
      // This handles cases where auth user ID doesn't match profile ID
      let userProfile: any = null;
      let profileError: any = null;
      
      console.log('🔍 Attempting to fetch profile by email (primary method):', normalizedEmail);
      const { data: profileByEmail, error: profileErrorByEmail } = await profileSupabase
        .from(TABLES.users)
        .select(`
          *,
          company:companies(*)
        `)
        .ilike('email', normalizedEmail)
        .maybeSingle();
      
      console.log('📥 Profile by email result:', {
        hasData: !!profileByEmail,
        hasError: !!profileErrorByEmail,
        error: profileErrorByEmail?.message,
        profileId: profileByEmail?.id,
        profileEmail: profileByEmail?.email,
        authUserId: loginData.user.id,
        idsMatch: profileByEmail?.id === loginData.user.id
      });
      
      if (profileByEmail && !profileErrorByEmail) {
        userProfile = profileByEmail;
        console.log('✅ User profile found by email:', userProfile.email, userProfile.role);
        
        // If found by email but ID doesn't match, use profile but update ID to match auth user
        // This ensures session consistency - we use the profile data but with auth user ID
        if (profileByEmail.id !== loginData.user.id) {
          console.warn('⚠️ Profile ID mismatch detected!', {
            profileId: profileByEmail.id,
            authUserId: loginData.user.id,
            email: normalizedEmail
          });
          console.warn('⚠️ Using profile from database but updating ID to match auth user for session consistency.');
          // Update the profile ID to match auth user ID for session consistency
          userProfile.id = loginData.user.id;
        }
      } else {
        // Fallback: Try by ID in case email lookup failed
        console.log('⚠️ Profile not found by email, trying by ID...', profileErrorByEmail?.message);
        profileError = profileErrorByEmail;
        
        console.log('🔍 Attempting to fetch profile by ID:', loginData.user.id);
        const { data: profileById, error: profileErrorById } = await profileSupabase
          .from(TABLES.users)
          .select(`
            *,
            company:companies(*)
          `)
          .eq('id', loginData.user.id)
          .maybeSingle();
        
        console.log('📥 Profile by ID result:', {
          hasData: !!profileById,
          hasError: !!profileErrorById,
          error: profileErrorById?.message,
          profileId: profileById?.id,
          profileEmail: profileById?.email
        });
        
        if (profileById && !profileErrorById) {
          userProfile = profileById;
          console.log('✅ User profile found by ID:', userProfile.email, userProfile.role);
        } else {
          profileError = profileErrorByEmail || profileErrorById;
          console.log('❌ Profile not found by ID either:', profileErrorById?.message);
          console.log('❌ All profile lookup attempts failed. Error details:', {
            byEmail: profileErrorByEmail?.message,
            byId: profileErrorById?.message,
            usingAdminClient: !!adminClient,
            authUserId: loginData.user.id,
            email: normalizedEmail
          });
          
          // If admin client is not available and we got an RLS error, provide helpful message
          if (!adminClient && (profileErrorById?.message?.includes('policy') || profileErrorById?.message?.includes('RLS') || profileErrorById?.code === '42501' || profileErrorByEmail?.message?.includes('policy') || profileErrorByEmail?.message?.includes('RLS') || profileErrorByEmail?.code === '42501')) {
            throw new Error(`❌ Cannot access user profile due to RLS policies!\n\n🔧 To fix:\n1. Set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file\n2. Get it from: Supabase Dashboard > Settings > API > service_role key\n3. Restart your dev server\n4. Try logging in again\n\nOR manually create the profile:\n1. Go to Supabase Dashboard > Table Editor > users\n2. Add row with:\n   - id: ${loginData.user.id}\n   - email: ${normalizedEmail}\n   - role: ${normalizedEmail === 'admin@ubs.com' ? 'admin' : 'staff'}\n3. Save and try again`);
          }
        }
      }

      // If we have a profile, use it (even if there was an error, the profile is what matters)
      if (userProfile) {
        console.log('✅ User profile found:', userProfile.email, userProfile.role);
        const mappedUser = mapUserFromDB(userProfile) as User;
        
        // Check if user is banned (only for staff, not admins)
        if (mappedUser.role === 'staff' && mappedUser.isBanned) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          throw new Error('❌ Your account has been banned. Please contact your administrator for more information.');
        }
        
        return {
          user: mappedUser,
          session: loginData.session,
        };
      }

      // Handle profile not found - try auto-create with retry
      // Only proceed to auto-create if we truly don't have a profile
      console.log('⚠️ User profile not found, attempting to create it...', {
        hasProfile: !!userProfile,
        error: profileError?.message,
        userId: loginData.user.id,
        email: normalizedEmail
      });
      
      // Determine role based on email
      const userRole = normalizedEmail === 'admin@ubs.com' ? 'admin' : 'staff';
      
      // Try with admin client first, then regular client
      let newProfile = null;
      let createError = null;
      
      // First attempt: Use admin client if available (already fetched above)
      if (adminClient) {
        try {
          console.log('🔧 Attempting to auto-create profile with admin client...');
          const { data, error } = await adminClient
            .from(TABLES.users)
            .insert({
              id: loginData.user.id,
              email: normalizedEmail,
              role: userRole,
              first_name: loginData.user.user_metadata?.first_name || (userRole === 'admin' ? 'Admin' : 'Staff'),
              last_name: loginData.user.user_metadata?.last_name || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();
          
          console.log('📥 Auto-create result:', {
            hasData: !!data,
            hasError: !!error,
            error: error?.message,
            profileId: data?.id
          });
          
          if (!error && data) {
            newProfile = data;
            console.log('✅ Profile auto-created successfully:', newProfile.email, newProfile.role);
          } else {
            createError = error;
            console.error('❌ Failed to auto-create profile:', error?.message);
          }
        } catch (err: any) {
          createError = err;
          console.error('❌ Exception during auto-create:', err?.message);
        }
      } else {
        console.warn('⚠️ Admin client not available - cannot auto-create profile');
        createError = new Error('Admin client not available. Set VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
      }
      
      // Second attempt: Use regular client if admin client failed
      if (!newProfile && !createError) {
        try {
          const { data, error } = await supabase
            .from(TABLES.users)
            .insert({
              id: loginData.user.id,
              email: normalizedEmail,
              role: userRole,
              first_name: loginData.user.user_metadata?.first_name || '',
              last_name: loginData.user.user_metadata?.last_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();
          
          if (!error && data) {
            newProfile = data;
          } else {
            createError = error;
          }
        } catch (err: any) {
          createError = err;
        }
      }
      
      if (newProfile) {
        console.log('✅ Auto-created user profile:', newProfile);
        const mappedUser = mapUserFromDB(newProfile) as User;
        return {
          user: mappedUser,
          session: loginData.session,
        };
      } else {
        console.error('❌ Failed to auto-create user profile:', createError);
        const errorDetails = createError?.message || createError?.code || 'Unknown error';
        
        // Provide specific guidance for admin user
        if (normalizedEmail === 'admin@ubs.com') {
          throw new Error(`❌ Admin user profile not found!\n\n🔧 To fix:\n1. Go to Supabase Dashboard > SQL Editor\n2. Run this SQL:\n\nINSERT INTO users (id, email, role, first_name, last_name, created_at, updated_at)\nVALUES ('${loginData.user.id}', '${normalizedEmail}', 'admin', 'Admin', 'User', NOW(), NOW())\nON CONFLICT (id) DO NOTHING;\n\n3. Then try logging in again.\n\nOr create manually:\n1. Supabase Dashboard > Table Editor > users\n2. Add row:\n   - id: ${loginData.user.id}\n   - email: ${normalizedEmail}\n   - role: admin\n   - first_name: Admin\n   - last_name: User\n3. Click Save\n\nError: ${errorDetails}`);
        }
        
        throw new Error(`❌ User profile not found!\n\n🔧 Create manually:\n1. Supabase Dashboard > Table Editor > users\n2. Add row:\n   - id: ${loginData.user.id}\n   - email: ${normalizedEmail}\n   - role: ${userRole}\n3. Click Save\n\nThen try logging in again.\n\nError: ${errorDetails}`);
      }

    } catch (loginError: any) {
      // Re-throw if it's already a formatted error message
      if (loginError.message && loginError.message.includes('❌')) {
        throw loginError;
      }
      
      // Handle network errors
      if (loginError.message?.includes('Failed to fetch') || 
          loginError.message?.includes('NetworkError') ||
          loginError.message?.includes('network')) {
        throw new Error('❌ Network error! Cannot connect to Supabase.\n\nPlease check:\n1. Internet connection\n2. Supabase service status\n3. Try again in a few seconds');
      }
      
      // Handle timeout errors
      if (loginError.message?.includes('timeout') || loginError.name === 'TimeoutError') {
        throw new Error('❌ Request timed out. Please try again.');
      }
      
      // Otherwise wrap in friendly error
      console.error('❌ Unexpected login error:', loginError);
      const errorMsg = loginError.message || 'Unknown error';
      
      // Provide specific guidance based on error
      if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('Invalid password')) {
        throw new Error('❌ Invalid email or password!\n\nPlease verify:\n1. Email address is correct\n2. Password is correct\n3. User exists in Supabase Dashboard > Authentication > Users');
      }
      
      throw new Error(`❌ Login failed: ${errorMsg}\n\nPlease check:\n1. Supabase connection\n2. User exists in Authentication > Users\n3. Email provider is enabled\n4. Try again in a few seconds`);
    }
  }

  async register(data: RegisterData): Promise<{ user: User; session: any }> {
    // Create auth user - DISABLE Supabase email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Disable Supabase email - we'll handle emails via cPanel
        emailRedirectTo: undefined,
        data: {
          role: data.role,
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
    });

    if (authError) {
      // Provide better error messages
      if (authError.message.includes('Email logins are disabled') || 
          authError.message.includes('Email provider is disabled') ||
          authError.message.includes('email provider') && authError.message.includes('disabled')) {
        throw new Error('❌ Email logins are disabled in Supabase!\n\n🔧 To fix this:\n1. Go to Supabase Dashboard: https://supabase.com/dashboard\n2. Select your project\n3. Go to Authentication > Providers\n4. Find "Email" provider\n5. Click "Enable" toggle to enable it\n6. Save changes\n7. Try registering again\n\n💡 Check ENABLE_EMAIL_LOGIN.md for detailed instructions.');
      }
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        throw new Error('User already registered. Please try logging in instead.');
      }
      if (authError.message.includes('invalid') || authError.message.includes('Invalid email')) {
        throw new Error('Email validation failed. Please create the user manually in Supabase Dashboard > Authentication > Users, then try logging in.');
      }
      throw new Error(authError.message || 'Failed to create user account.');
    }

    if (!authData.user) {
      throw new Error('Failed to create user. Please try again.');
    }

    // For staff users, we might need to create or assign a company
    // First, try to get an existing company for staff
    let companyId = data.companyId;
    if (data.role === 'staff' && !companyId) {
      const { data: companies, error: companyError } = await supabase
        .from(TABLES.companies)
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (companies && !companyError) {
        companyId = companies.id;
      } else {
        // Try to create a default company for staff
        const { data: newCompany, error: createCompanyError } = await supabase
          .from(TABLES.companies)
          .insert({
            name: 'UBS Test Company',
            email: 'test@ubs.com',
            is_active: true,
          })
          .select('id')
          .single();
        
        if (newCompany && !createCompanyError) {
          companyId = newCompany.id;
        } else {
          // If company creation fails, log but continue (company_id is nullable)
          console.warn('Could not create or find company for staff user. User will be created without company assignment.');
          if (createCompanyError) {
            console.error('Company creation error:', createCompanyError);
          }
        }
      }
    }

    // Create user profile (using snake_case for database columns)
    const insertData: any = {
      id: authData.user.id,
      email: data.email,
      role: data.role,
    };

    // Only add optional fields if they exist (using snake_case column names)
    if (companyId) insertData.company_id = companyId;
    if (data.jobTitle) insertData.job_title = data.jobTitle;
    if (data.firstName) insertData.first_name = data.firstName;
    if (data.lastName) insertData.last_name = data.lastName;

    const { data: userProfile, error: profileError } = await supabase
      .from(TABLES.users)
      .insert(insertData)
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      
      // If profile creation fails but user was created, try to clean up
      if (authData.user) {
        console.warn('User created in auth but profile creation failed. User may need manual setup.');
      }
      
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    if (!userProfile) {
      throw new Error('User profile was not created. Please contact administrator.');
    }

    return {
      user: mapUserFromDB(userProfile) as User,
      session: authData.session,
    };
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.log('No authenticated user found');
        return null;
      }

      // OPTIMIZATION: Run both queries in parallel instead of sequentially
      // This reduces total query time by ~50% since both queries execute simultaneously
      const [clientResult, userResult] = await Promise.all([
        // Check if user is a client (by auth_user_id or email)
        supabase
          .from(TABLES.clients)
          .select(`
            *,
            company:companies(*)
          `)
          .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email || ''}`)
          .eq('is_active', true)
          .maybeSingle(),
        // Check if user is in users table
        supabase
          .from(TABLES.users)
          .select(`
            *,
            company:companies(*)
          `)
          .eq('id', authUser.id)
          .maybeSingle(),
      ]);

      const { data: clientProfile, error: clientError } = clientResult;
      const { data: userProfile, error: userError } = userResult;

      // Prioritize client profile if found
      if (clientProfile && !clientError) {
        // This is a client user
        return {
          id: clientProfile.id,
          email: clientProfile.email,
          role: 'client' as any,
          companyId: clientProfile.company_id,
          company: clientProfile.company ? {
            id: clientProfile.company.id,
            name: clientProfile.company.name,
            address: clientProfile.company.address,
            phone: clientProfile.company.phone,
            email: clientProfile.company.email,
            logo: clientProfile.company.logo,
            isActive: clientProfile.company.is_active,
            createdAt: clientProfile.company.created_at,
            updatedAt: clientProfile.company.updated_at,
          } : undefined,
          firstName: clientProfile.name?.split(' ')[0] || '',
          lastName: clientProfile.name?.split(' ').slice(1).join(' ') || '',
          createdAt: clientProfile.created_at,
          updatedAt: clientProfile.updated_at,
        } as User;
      }

      // If not a client, use user profile
      if (userError) {
        console.error('Error fetching user profile:', userError);
        return null;
      }

      if (!userProfile) {
        console.warn('User profile not found in database for auth user:', authUser.id);
        return null;
      }

      const mappedUser = mapUserFromDB(userProfile) as User;
      
      // Check if user is banned (only for staff, not admins)
      if (mappedUser.role === 'staff' && mappedUser.isBanned) {
        // Sign out the banned user
        await supabase.auth.signOut();
        return null;
      }

      return mappedUser;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from(TABLES.users)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }

  async resetPassword(email: string): Promise<void> {
    // Check if user exists (staff/admin)
    const { data: users, error: userError } = await supabase
      .from(TABLES.users)
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from(TABLES.clients)
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    // Get user info (staff or client)
    let firstName = 'User';
    let userType = 'user';
    
    // ALWAYS use production URL for reset password links (hardcoded to prevent localhost)
    const resetPasswordUrl = 'https://ubscrm.com/reset-password';
    
    if (users && !userError) {
      firstName = users.first_name || 'User';
      userType = 'staff';
    } else if (client && !clientError) {
      firstName = client.name?.split(' ')[0] || 'User';
      userType = 'client';
    } else {
      // Don't reveal if user exists or not (security best practice)
      // Still generate reset token but don't send email
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordUrl,
      });
      return;
    }

    // Generate password reset token using Supabase's built-in method
    // Supabase will send its own email, but we'll also send one via cPanel
    // The Supabase email will have the proper reset link with tokens
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordUrl,
    });

    // Send password reset email via cPanel (with instructions to use Supabase link)
    // Note: Users should use the Supabase-generated link from the email Supabase sends
    // or we could capture the token, but it's easier to let Supabase handle it
    try {
      const resetUrl = resetPasswordUrl;
      
      const resetEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .info { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Dear ${firstName},</p>
                <p>We received a request to reset your password for your UBS ERP account.</p>
                
                <div class="info">
                  <p style="margin: 0;"><strong>ℹ️ Important:</strong></p>
                  <p style="margin: 10px 0 0 0;">You should receive a separate email from our system with a secure reset link. Please click that link to reset your password.</p>
                </div>
                
                <p>If you received this email, you can also go directly to:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                
                <div class="warning">
                  <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
                  <ul style="margin: 10px 0 0 20px;">
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password will remain unchanged if you don't click the link</li>
                  </ul>
                </div>
                
                <p>Best regards,<br>UBS ERP Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email from UBS ERP System</p>
                <p>If you didn't request this, please contact support immediately.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await emailService.sendEmail({
        to: email,
        subject: 'Password Reset Request - UBS ERP',
        html: resetEmailHtml,
      });

      console.log('Password reset email sent via cPanel to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset email via cPanel:', emailError);
      // Supabase will still send its email with the proper token
    }

    // Supabase error handling (but email already sent via cPanel)
    if (error && !error.message.includes('rate limit')) {
      // Only throw if it's not a rate limit (which is fine, email was sent)
      throw error;
    }
  }

  async changeUserPassword(userId: string, newPassword: string): Promise<void> {
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Use admin client (service role) to change password - same approach as staff creation
    const adminClient = getAdminClient();
    
    if (!adminClient) {
      throw new Error('Admin client not available. Please ensure VITE_SUPABASE_SERVICE_ROLE_KEY is set in your .env file.');
    }

    try {
      // Use admin client to update password - this bypasses RLS and works immediately
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        console.error('❌ Admin client password update error:', error);
        throw new Error(`Failed to update password: ${error.message}`);
      }

      if (!data || !data.user) {
        throw new Error('Password update succeeded but no user data returned');
      }

      console.log('✅ Password updated successfully for user:', data.user.id);
    } catch (err: any) {
      console.error('❌ Password update error:', err);
      // Provide helpful error message
      if (err.message?.includes('Admin client not available')) {
        throw err; // Re-throw with original message
      }
      throw new Error(err?.message || 'Failed to update password. Please try again.');
    }
  }
}

export const authService = new AuthService();


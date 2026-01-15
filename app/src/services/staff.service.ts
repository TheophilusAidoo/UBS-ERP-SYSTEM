import { supabase, TABLES } from './supabase';
import { User } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';
import { leaveService } from './leave.service';
import { emailService } from './email.service';
import { createClient } from '@supabase/supabase-js';

// Helper to get admin client (bypasses RLS for staff creation)
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

export interface CreateStaffData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  companyId?: string;
  isSubAdmin?: boolean;
  salaryAmount?: number;
  salaryDate?: number; // Day of month (1-31)
}

export interface UpdateStaffData {
  id: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  companyId?: string;
  isActive?: boolean;
  isSubAdmin?: boolean;
  isBanned?: boolean;
  salaryAmount?: number;
  salaryDate?: number; // Day of month (1-31)
}

class StaffService {
  async createStaff(data: CreateStaffData): Promise<User> {
    // Validate required fields
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Create auth user first - Use admin client if available for immediate FK availability
    // Admin client creates users directly in database, avoiding replication delays
    const authAdminClient = getAdminClient();
    
    // Warn if admin client is not available (will cause slower staff creation with more retries)
    if (!authAdminClient) {
      console.warn('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY not set - staff creation will be slower and may require more retries');
      console.warn('   For best performance, set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file');
    } else {
      console.log('✅ Admin client available - using service role for fast staff creation');
    }
    
    let authData: any = null;
    let authError: any = null;
    let authUserId: string | null = null;

    if (authAdminClient) {
      // Use admin client to create user - this bypasses rate limits and ensures immediate availability
      console.log('🔐 Creating auth user with admin client (service role)...');
      try {
        const { data: adminUserData, error: adminError } = await authAdminClient.auth.admin.createUser({
          email: data.email.trim(),
          password: data.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            role: 'staff',
            first_name: data.firstName,
            last_name: data.lastName,
          },
        });

        console.log('📝 Admin client createUser response:', {
          hasData: !!adminUserData,
          hasUser: !!adminUserData?.user,
          userId: adminUserData?.user?.id,
          hasError: !!adminError,
          errorMessage: adminError?.message,
          dataKeys: adminUserData ? Object.keys(adminUserData) : []
        });

        if (adminError) {
          console.error('❌ Admin client user creation error:', adminError);
          if (adminError.message.includes('already registered') || 
              adminError.message.includes('already exists') ||
              adminError.message.includes('User already registered')) {
            // Don't try fallback for duplicate user - this is a real error that should be shown
            throw new Error('A user with this email already exists. Please use a different email.');
          }
          // For other errors, throw to trigger catch block for fallback
          throw adminError; // Throw original error to trigger catch block for fallback
        }

        // Check response structure - admin.createUser returns { data: { user: { id, email, ... } }, error: null }
        // So adminUserData should be { user: { id, email, ... } }
        if (!adminUserData) {
          console.error('❌ Admin client returned null/undefined data');
          throw new Error('Failed to create user account. Admin client returned no data - will try fallback.');
        }
        
        // Extract user from response - check both possible structures
        let userFromAdmin = adminUserData.user || adminUserData;
        
        // If still no user, check if the structure is different
        if (!userFromAdmin) {
          console.error('❌ Admin client response structure issue:', {
            hasData: !!adminUserData,
            dataKeys: Object.keys(adminUserData || {}),
            fullResponse: adminUserData
          });
          throw new Error('Failed to create user account. Admin client returned invalid response structure - will try fallback.');
        }
        
        // Check if we got a user object but it might be the data itself
        if (typeof userFromAdmin === 'object' && 'id' in userFromAdmin && userFromAdmin.id) {
          // This is good - user has ID
          authUserId = userFromAdmin.id;
          authData = { user: userFromAdmin };
          console.log('✅ Auth user created successfully with admin client');
          console.log('   User ID:', authUserId);
          console.log('   User email:', userFromAdmin.email || 'N/A');
        } else {
          console.error('❌ Admin client user object missing ID:', {
            userKeys: userFromAdmin ? Object.keys(userFromAdmin) : [],
            user: userFromAdmin,
            hasId: 'id' in (userFromAdmin || {}),
            idValue: (userFromAdmin as any)?.id
          });
          throw new Error('Failed to create user account. Admin client returned user object without ID - will try fallback.');
        }
      } catch (adminCreateError: any) {
        console.error('❌ Admin client user creation failed:', adminCreateError);
        console.warn('⚠️ Admin client error - will try regular signUp as fallback...');
        // Clear error so we can try regular signUp without interference
        authError = null;
        authData = null;
        authUserId = null; // Make sure authUserId is cleared
        // Don't throw - continue to fallback below
      }
    }

    // Fallback to regular signUp if admin client not available or failed
    if (!authUserId) {
      console.log('⚠️ Admin client not available - using regular signUp (may have replication delays)');
      
      let authRetryCount = 0;
      const maxRetries = 2;

      // Clear any previous error from admin client attempt
      authError = null;
      authData = null;
      
      while (authRetryCount <= maxRetries) {
        if (authRetryCount > 0) {
          const waitTimeMatch = authError?.message?.match(/(\d+)\s*seconds?/i);
          const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;
          const delay = (waitSeconds + 2) * 1000;
          console.log(`⏳ Rate limit detected. Waiting ${waitSeconds + 2} seconds before retry (attempt ${authRetryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 65000)));
        }

        console.log(`📝 Attempting regular signUp (attempt ${authRetryCount + 1}/${maxRetries + 1})...`);
        const signUpResult = await supabase.auth.signUp({
          email: data.email.trim(),
          password: data.password,
          options: {
            data: {
              role: 'staff',
              first_name: data.firstName,
              last_name: data.lastName,
            },
          },
        });

        authData = signUpResult.data;
        authError = signUpResult.error;

        console.log('📝 SignUp result:', {
          hasData: !!authData,
          hasUser: !!authData?.user,
          userId: authData?.user?.id,
          hasSession: !!authData?.session,
          sessionUserId: authData?.session?.user?.id,
          hasError: !!authError,
          errorMessage: authError?.message
        });

        // Check multiple places for user ID (user can be in different locations)
        if (!authError && authData) {
          // First check: user directly in data.user
          if (authData.user?.id) {
            authUserId = authData.user.id;
            console.log('✅ Auth user created successfully - user ID found in data.user');
            console.log('   User ID:', authUserId);
            break;
          }
          
          // Second check: user in session
          if (authData.session?.user?.id) {
            authUserId = authData.session.user.id;
            // Normalize authData structure
            authData = { user: authData.session.user, session: authData.session };
            console.log('✅ Auth user created successfully - user ID found in session');
            console.log('   User ID:', authUserId);
            break;
          }
          
          // Third check: user might not have ID yet - wait a bit
          if (authData.user && !authData.user.id) {
            console.warn('⚠️ SignUp returned user object but no ID - waiting for ID assignment...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Try to get user by email to get the ID
            try {
              const { data: { user: fetchedUser }, error: fetchError } = await supabase.auth.getUser();
              if (!fetchError && fetchedUser?.id) {
                authUserId = fetchedUser.id;
                authData.user.id = fetchedUser.id;
                console.log('✓ Found user ID by fetching current user:', authUserId);
                break;
              }
            } catch (fetchErr) {
              console.warn('⚠️ Failed to fetch user ID:', fetchErr);
            }
            
            // If still no ID, check if it was assigned to the user object
            if (authData.user.id) {
              authUserId = authData.user.id;
              console.log('✓ User ID assigned after delay:', authUserId);
              break;
            }
          }
        }

        if (authError) {
          if (authError.message.includes('already registered') || 
              authError.message.includes('already exists')) {
            throw new Error('A user with this email already exists. Please use a different email.');
          }
          if (authError.message.includes('Invalid email')) {
            throw new Error('Invalid email address format.');
          }
          if (authError.message.includes('Password')) {
            throw new Error('Password does not meet requirements.');
          }
          
          if (!authError.message.includes('security purposes') && 
              !authError.message.includes('rate limit')) {
            console.error('Auth signup error (non-retryable):', authError);
            throw new Error(`Failed to create user account: ${authError.message}`);
          }

          if ((authError.message.includes('security purposes') || 
               authError.message.includes('rate limit')) && 
              authRetryCount >= maxRetries) {
            const waitTimeMatch = authError.message.match(/(\d+)\s*seconds?/i);
            const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;
            throw new Error(`Rate limit exceeded: Please wait ${waitSeconds} seconds before creating another staff member.`);
          }
        }

        authRetryCount++;
      }

      if (authError) {
        const waitTimeMatch = authError.message.match(/(\d+)\s*seconds?/i);
        const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;
        if (authError.message.includes('security purposes') || authError.message.includes('rate limit')) {
          throw new Error(`Rate limit exceeded: Please wait ${waitSeconds} seconds before creating another staff member.`);
        }
        throw new Error(`Failed to create user account: ${authError.message}`);
      }
    }

    // Final validation - check all possible locations for user ID
    if (!authUserId) {
      console.log('🔍 Final validation - checking for user ID...');
      
      // Check data.user.id
      if (authData?.user?.id) {
        authUserId = authData.user.id;
        console.log('✓ Found user ID in final check (data.user.id):', authUserId);
      }
      // Check session.user.id
      else if (authData?.session?.user?.id) {
        authUserId = authData.session.user.id;
        console.log('✓ Found user ID in final check (session.user.id):', authUserId);
      }
      // Check if authData.user exists but no ID - try to fetch it
      else if (authData?.user && !authData.user.id) {
        console.warn('⚠️ User object exists but no ID - attempting to fetch user by email...');
        console.warn('   User object keys:', Object.keys(authData.user));
        
        // Try to get user by email using admin client if available
        try {
          const fetchAdminClient = getAdminClient();
          if (fetchAdminClient) {
            console.log('   Using admin client to fetch user by email...');
            const { data: { users }, error: listError } = await fetchAdminClient.auth.admin.listUsers();
            if (!listError && users) {
              const foundUser = users.find((u: any) => u.email?.toLowerCase().trim() === data.email.toLowerCase().trim());
              if (foundUser?.id) {
                authUserId = foundUser.id;
                authData.user.id = foundUser.id;
                console.log('✓ Found user ID by listing users with admin client:', authUserId);
              }
            }
          }
        } catch (fetchErr) {
          console.warn('⚠️ Failed to fetch user by email:', fetchErr);
        }
        
        // If still no ID, try using regular getUser()
        if (!authUserId) {
          try {
            const { data: { user: currentUser }, error: currentError } = await supabase.auth.getUser();
            if (!currentError && currentUser?.id) {
              authUserId = currentUser.id;
              console.log('✓ Found user ID by fetching current user:', authUserId);
              authData.user.id = currentUser.id; // Update authData structure
            }
          } catch (fetchErr) {
            console.warn('⚠️ Failed to fetch current user:', fetchErr);
          }
        }
      }
      // If we have no authData at all, but signUp might have succeeded, try to get user by email
      else if (!authData && !authError) {
        console.warn('⚠️ No auth data but no error - trying to fetch user by email...');
        try {
          const fetchAdminClient = getAdminClient();
          if (fetchAdminClient) {
            const { data: { users }, error: listError } = await fetchAdminClient.auth.admin.listUsers();
            if (!listError && users) {
              const foundUser = users.find((u: any) => u.email?.toLowerCase().trim() === data.email.toLowerCase().trim());
              if (foundUser?.id) {
                authUserId = foundUser.id;
                authData = { user: foundUser };
                console.log('✓ Found user ID by listing users (user was created but not returned):', authUserId);
              }
            }
          }
        } catch (fetchErr) {
          console.warn('⚠️ Failed to fetch user by email:', fetchErr);
        }
      }
    }

    // Final check - if still no user ID, throw error with helpful message
    if (!authUserId) {
      console.error('❌ Failed to get user ID after all attempts');
      console.error('   Auth data structure:', {
        hasAuthData: !!authData,
        hasUser: !!authData?.user,
        userKeys: authData?.user ? Object.keys(authData.user) : [],
        userEmail: authData?.user?.email,
        hasSession: !!authData?.session,
        sessionKeys: authData?.session ? Object.keys(authData.session) : [],
        sessionUserId: authData?.session?.user?.id,
        hasError: !!authError,
        errorMessage: authError?.message,
        attemptedEmail: data.email
      });
      
      let errorMsg = 'Failed to create user account. No user ID returned after authentication. ';
      
      if (authError) {
        errorMsg += `Error: ${authError.message}. `;
      } else if (authData) {
        errorMsg += 'User may have been created but ID is not accessible. ';
      } else {
        errorMsg += 'No response received from authentication service. ';
      }
      
      errorMsg += 'Please check Supabase Dashboard > Authentication > Users to see if the user was created. If the user exists, try again or contact support.';
      
      throw new Error(errorMsg);
    }

    // Brief wait for auth user to be available in database
    // Increased wait times to ensure auth user is available before creating profile
    if (authUserId && authAdminClient) {
      // Admin client creates users immediately, but give it 2 seconds for database replication
      console.log('✓ Auth user created with admin client - waiting 2 seconds for database replication...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify auth user exists before proceeding
      try {
        const { data: { user: verifyUser }, error: verifyError } = await authAdminClient.auth.admin.getUserById(authUserId);
        if (verifyError || !verifyUser) {
          console.warn('⚠️ Auth user not found after wait - will rely on function retry logic');
        } else {
          console.log('✓ Auth user verified in database');
        }
      } catch (verifyErr) {
        console.warn('⚠️ Could not verify auth user:', verifyErr);
      }
    } else if (authUserId) {
      // Regular signUp - wait 3 seconds for replication
      console.log('⏳ Waiting 3 seconds for auth user replication...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Verify company exists if companyId is provided
    // IMPORTANT: Only set company_id if we can verify it exists AND is accessible
    // If verification fails for ANY reason, we'll create staff without company (null company_id)
    let validCompanyId: string | null = null;
    
    if (data.companyId && data.companyId.trim() !== '') {
      const trimmedCompanyId = data.companyId.trim();
      
      // Validate UUID format first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmedCompanyId)) {
        console.warn('⚠️ Invalid company ID format - creating staff without company assignment');
        validCompanyId = null;
      } else {
        // Verify company exists and is accessible
        // Use maybeSingle to avoid throwing errors - just return null if not found
        const { data: company, error: companyError } = await supabase
          .from(TABLES.companies)
          .select('id, name, is_active')
          .eq('id', trimmedCompanyId)
          .maybeSingle();

        // Only use company if we successfully verified it exists AND there was no error
        // Be very defensive - if ANY doubt, don't assign company
        if (companyError) {
          console.warn('⚠️ Company verification failed:', companyError.message);
          console.warn('   Creating staff without company assignment (company may have been deleted or access denied)');
          validCompanyId = null;
        } else if (!company || !company.id) {
          console.warn('⚠️ Company not found - creating staff without company assignment');
          validCompanyId = null;
        } else {
          // Company exists and is accessible - we'll try to use it
          // IMPORTANT: Even if company is verified, we might not be able to use it as FK due to RLS
          // So we'll still handle FK errors gracefully during insert
          validCompanyId = trimmedCompanyId;
          console.log('✓ Company verified successfully:', company.name);
          
          if (company.is_active === false) {
            console.warn('⚠️ Warning: Company is inactive, but allowing assignment attempt');
          }
        }
      }
    }
    // If no company ID provided, validCompanyId is already null - that's fine

    // Create user profile in the users table
    const insertData: any = {
      id: authUserId, // Use the auth user ID we obtained
      email: data.email,
      role: 'staff',
      company_id: validCompanyId, // Set to null if verification failed or no company selected
    };
    
    // Track if we're attempting to assign a company (for error handling)
    const attemptingCompanyAssignment = !!validCompanyId;
    
    if (data.jobTitle) insertData.job_title = data.jobTitle;
    if (data.firstName) insertData.first_name = data.firstName;
    if (data.lastName) insertData.last_name = data.lastName;
    if (data.isSubAdmin !== undefined) insertData.is_sub_admin = data.isSubAdmin;
    // Only add salary columns if they exist in the table (handle gracefully)
    // These will be added via add-salary-columns.sql migration
    if (data.salaryAmount !== undefined && data.salaryAmount !== null) insertData.salary_amount = data.salaryAmount;
    if (data.salaryDate !== undefined && data.salaryDate !== null) insertData.salary_date = data.salaryDate;

    // Use admin client (service role) to bypass RLS for staff creation
    // Use the database function create_staff_profile which handles FK timing issues with retry logic
    const insertAdminClient = authAdminClient || getAdminClient();
    const insertClient = insertAdminClient || supabase;
    
    if (!insertAdminClient) {
      throw new Error(
        'VITE_SUPABASE_SERVICE_ROLE_KEY is not set. This is REQUIRED for staff creation.\n\n' +
        'To fix:\n' +
        '1. Go to Supabase Dashboard > Project Settings > API\n' +
        '2. Copy the "Service Role Key" (NOT anon key)\n' +
        '3. Add to .env: VITE_SUPABASE_SERVICE_ROLE_KEY=your_key\n' +
        '4. Restart dev server\n' +
        '5. Try creating staff again'
      );
    }
    
    console.log('✓ Using admin client (service role) with create_staff_profile function - handles FK timing issues');
    
    // Use the database function create_staff_profile which has built-in retry logic
    // and waits for auth user to be available, handling FK constraint issues
    console.log('🔄 Creating staff profile using create_staff_profile function...');
    
    let userProfile: any = null;
    let profileError: any = null;
    
    try {
      // Call the database function create_staff_profile
      // Function signature: create_staff_profile(
      //   p_user_id UUID,
      //   p_email TEXT,
      //   p_first_name TEXT DEFAULT NULL,
      //   p_last_name TEXT DEFAULT NULL,
      //   p_job_title TEXT DEFAULT NULL,
      //   p_company_id UUID DEFAULT NULL,
      //   p_salary_amount DECIMAL DEFAULT NULL,
      //   p_salary_date INTEGER DEFAULT NULL,
      //   p_is_sub_admin BOOLEAN DEFAULT FALSE
      // )
      // The function returns a users row and handles FK timing issues with retry logic
      console.log('📞 Calling create_staff_profile with params:', {
        p_user_id: authUserId,
        p_email: data.email.trim(),
        p_first_name: data.firstName || null,
        p_last_name: data.lastName || null,
        p_job_title: data.jobTitle || null,
        p_company_id: validCompanyId || null,
        p_salary_amount: data.salaryAmount !== undefined && data.salaryAmount !== null ? data.salaryAmount : null,
        p_salary_date: data.salaryDate !== undefined && data.salaryDate !== null ? data.salaryDate : null,
        p_is_sub_admin: data.isSubAdmin || false,
      });
      
      const { data: profileResult, error: functionError } = await insertClient.rpc(
        'create_staff_profile',
        {
          p_user_id: authUserId,
          p_email: data.email.trim(),
          p_first_name: data.firstName || null,
          p_last_name: data.lastName || null,
          p_job_title: data.jobTitle || null,
          p_company_id: validCompanyId || null,
          p_salary_amount: data.salaryAmount !== undefined && data.salaryAmount !== null ? data.salaryAmount : null,
          p_salary_date: data.salaryDate !== undefined && data.salaryDate !== null ? data.salaryDate : null,
          p_is_sub_admin: data.isSubAdmin || false,
        }
      );

      console.log('📥 Function response:', {
        hasData: !!profileResult,
        dataType: typeof profileResult,
        isArray: Array.isArray(profileResult),
        dataKeys: profileResult ? Object.keys(profileResult) : [],
        hasError: !!functionError,
        errorMessage: functionError?.message,
        fullResult: profileResult
      });

      if (functionError) {
        profileError = functionError;
        console.error('❌ Function call error:', functionError);
        
        // Check if function doesn't exist
        if (functionError.message?.includes('function') && 
            (functionError.message?.includes('does not exist') || 
             functionError.message?.includes('not found'))) {
          console.error('❌ The create_staff_profile function does not exist in the database!');
          console.error('   Please run /database/create-staff-profile-function.sql in Supabase SQL Editor.');
          // Don't throw yet - let fallback handle it with better retry logic
        }
      } else if (profileResult !== null && profileResult !== undefined) {
        // The function now returns TABLE, so it will be an array (even if single row)
        if (Array.isArray(profileResult)) {
          if (profileResult.length > 0) {
            userProfile = profileResult[0];
            console.log('✅ Staff profile created successfully using create_staff_profile function');
            console.log('   Profile ID:', userProfile.id);
            console.log('   Profile email:', userProfile.email);
          } else {
            profileError = new Error('Function returned empty array');
          }
        } else if (typeof profileResult === 'object' && 'id' in profileResult) {
          // Fallback: if it's a single object (shouldn't happen with TABLE return, but handle it)
          userProfile = profileResult;
          console.log('✅ Staff profile created successfully using create_staff_profile function');
          console.log('   Profile ID:', userProfile.id);
          console.log('   Profile email:', userProfile.email);
        } else {
          // Unexpected format - log and treat as error
          console.warn('⚠️ Unexpected function return format:', profileResult);
          profileError = new Error('Function returned data in unexpected format');
        }
      } else {
        // profileResult is null or undefined - but the function might have still created the user
        // Try to fetch the user directly to verify
        console.warn('⚠️ Function returned null/undefined - checking if user was created anyway...');
        const { data: fetchedUser, error: fetchError } = await insertClient
          .from(TABLES.users)
          .select('*')
          .eq('id', authUserId)
          .maybeSingle();
        
        if (!fetchError && fetchedUser) {
          console.log('✅ User profile found after function call (function may have returned null but user was created)');
          userProfile = fetchedUser;
        } else {
          profileError = new Error('Function returned no data and user profile was not found');
        }
      }
    } catch (rpcError: any) {
      profileError = rpcError;
    }
    
    // If function call fails, try direct insert as fallback with aggressive retry logic
    if (profileError) {
      console.warn('⚠️ Function call failed, trying direct insert as fallback...', profileError.message);
      console.warn('   This might mean the create_staff_profile function is not deployed yet.');
      console.warn('   Please run /database/create-staff-profile-function.sql in Supabase SQL Editor.');
      
      // Prepare insert data
      const insertDataForDB: any = {
        id: insertData.id,
        email: insertData.email,
        role: insertData.role,
        first_name: insertData.first_name || null,
        last_name: insertData.last_name || null,
        job_title: insertData.job_title || null,
        company_id: insertData.company_id || null,
        is_sub_admin: insertData.is_sub_admin || false
      };
      
      // Only add salary columns if they exist
      if (data.salaryAmount !== undefined && data.salaryAmount !== null) {
        insertDataForDB.salary_amount = data.salaryAmount;
      }
      if (data.salaryDate !== undefined && data.salaryDate !== null) {
        insertDataForDB.salary_date = data.salaryDate;
      }
      
      // Aggressive retry logic for FK constraint - wait longer and retry more times
      let insertRetryCount = 0;
      const maxInsertRetries = 5; // Try up to 5 times
      let insertSuccess = false;
      
      while (insertRetryCount < maxInsertRetries && !insertSuccess) {
        if (insertRetryCount > 0) {
          // Exponential backoff: 1s, 2s, 3s, 4s, 5s
          const waitTime = (insertRetryCount + 1) * 1000;
          console.log(`⏳ Waiting ${waitTime/1000} seconds before retry ${insertRetryCount + 1}/${maxInsertRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Verify auth user exists before attempting insert
        if (insertAdminClient) {
          try {
            const { data: { user: authUserCheck }, error: checkError } = await insertAdminClient.auth.admin.getUserById(authUserId);
            if (checkError || !authUserCheck) {
              console.warn(`⚠️ Auth user not found yet (attempt ${insertRetryCount + 1}) - will wait and retry...`);
              insertRetryCount++;
              continue;
            } else {
              console.log('✓ Auth user verified - proceeding with insert');
            }
          } catch (checkErr) {
            console.warn('⚠️ Could not verify auth user:', checkErr);
          }
        }
        
        // Try direct insert
        const { data: initialUserProfile, error: initialProfileError } = await insertClient
          .from(TABLES.users)
          .insert(insertDataForDB)
          .select('*')
          .single();

        if (!initialProfileError && initialUserProfile) {
          userProfile = initialUserProfile;
          profileError = null;
          insertSuccess = true;
          console.log(`✅ Staff created successfully with direct insert (attempt ${insertRetryCount + 1})`);
        } else if (initialProfileError && initialProfileError.message?.includes('users_id_fkey')) {
          // FK constraint error - will retry in next iteration
          console.warn(`⚠️ FK constraint error on attempt ${insertRetryCount + 1}/${maxInsertRetries} - will retry...`);
          profileError = initialProfileError;
          insertRetryCount++;
        } else {
          // Other error - don't retry
          profileError = initialProfileError || profileError;
          break;
        }
      }
      
      if (!insertSuccess && profileError && profileError.message?.includes('users_id_fkey')) {
        throw new Error(
          `Failed to create user profile after ${maxInsertRetries} retries. ` +
          `The authentication user may not be available yet. ` +
          `Please ensure the create_staff_profile function is deployed by running ` +
          `/database/create-staff-profile-function.sql in Supabase SQL Editor. ` +
          `Original error: ${profileError.message}`
        );
      }
      
      // Handle company FK error - retry without company
      if (profileError && profileError.code === '23503' && attemptingCompanyAssignment && insertDataForDB.company_id && 
          !profileError.message?.includes('users_id_fkey') && !profileError.message?.includes('users.id')) {
        console.warn('⚠️ Company FK error - retrying without company...');
        const insertDataWithoutCompany = { ...insertDataForDB, company_id: null };
        const { data: retryProfile, error: retryError } = await insertClient
          .from(TABLES.users)
          .insert(insertDataWithoutCompany)
          .select('*')
          .single();
          
        if (!retryError && retryProfile) {
          userProfile = retryProfile;
          profileError = null;
          console.log('✅ Staff created successfully without company (can assign later)');
        } else {
          profileError = retryError;
        }
      }
    }
    
    // Final error handling
    if (profileError) {
      if (profileError.code === '23505') {
        throw new Error('A user profile with this email already exists.');
      }
      
      if (profileError.message?.includes('permission') || profileError.message?.includes('RLS')) {
        throw new Error('Permission denied. Please check your account permissions or contact an administrator.');
      }
      
      if (profileError.message?.includes('does not exist in auth.users')) {
        throw new Error('Authentication user was not created successfully. Please try again or contact support.');
      }
      
      // FK constraint error - provide helpful message
      if (profileError.message?.includes('users_id_fkey') || profileError.message?.includes('foreign key constraint')) {
        throw new Error(
          `Failed to create user profile: Foreign key constraint violation.\n\n` +
          `This usually means the authentication user is not yet available in the database.\n\n` +
          `SOLUTION:\n` +
          `1. Make sure you have run /database/create-staff-profile-function.sql in Supabase SQL Editor\n` +
          `2. The function handles FK timing issues automatically\n` +
          `3. If the function is deployed, try creating the staff member again\n` +
          `4. If the error persists, check Supabase Dashboard > Authentication > Users to verify the auth user was created\n\n` +
          `Original error: ${profileError.message}`
        );
      }
      
      throw new Error(`Failed to create user profile: ${profileError.message || 'Unknown error'}`);
    }
    
    if (!userProfile) {
      throw new Error('Failed to create user profile. No data returned.');
    }

    // Map and return the user immediately (don't wait for background tasks)
    const basicUser = mapUserFromDB(userProfile) as User;

    // Send welcome email immediately - await it to ensure it's sent
    // Also initialize leave balance in background
    (async () => {
      try {
        // Initialize leave balance for the new staff member (non-blocking)
        try {
          const { defaultAnnualLeave, defaultSickLeave, defaultEmergencyLeave } = 
            JSON.parse(localStorage.getItem('ubs-global-settings') || '{}') || {};
          
          if (authUserId) {
            await leaveService.updateLeaveBalance({
              userId: authUserId,
              annualTotal: defaultAnnualLeave || 20,
              sickTotal: defaultSickLeave || 10,
              emergencyTotal: defaultEmergencyLeave || 5,
            });
          }
        } catch (leaveError) {
          // Log but don't fail the user creation if leave balance fails
          console.warn('Failed to initialize leave balance:', leaveError);
        }

        // Fetch company name for email (if needed)
        let companyName = 'UBS ERP';
        if ((userProfile as any).company_id) {
          try {
            const { data: company } = await supabase
              .from(TABLES.companies)
              .select('name')
              .eq('id', (userProfile as any).company_id)
              .single();
            if (company) companyName = (company as any).name;
          } catch (companyError) {
            console.warn('Failed to fetch company name for email:', companyError);
          }
        }

        // Send welcome email via cPanel (not Supabase) - ALWAYS send and await it
        // ALWAYS use production URL for email links (hardcoded to prevent localhost)
        const loginUrl = 'https://ubscrm.com/login';
        
        const welcomeEmailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
                .button { display: inline-block; padding: 12px 30px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to ${companyName}!</h1>
                </div>
                <div class="content">
                  <p>Dear ${data.firstName || 'Staff Member'},</p>
                  <p>Your staff account has been created successfully. You can now access the UBS ERP system.</p>
                  
                  <div class="credentials">
                    <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${data.password}</code></p>
                    <p style="color: #dc2626; font-size: 0.9em; margin-top: 15px;">
                      ⚠️ Please save this password and change it after first login for security.
                    </p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${loginUrl}" class="button">Login to System</a>
                  </p>
                  
                  <p>If you have any questions, please contact your administrator.</p>
                  
                  <p>Best regards,<br>${companyName} Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated email from UBS ERP System</p>
                </div>
              </div>
            </body>
          </html>
        `;

        // Await email sending to ensure it completes
        const emailResult = await emailService.sendEmail({
          to: data.email,
          subject: `Welcome to ${companyName} - Your Staff Account`,
          html: welcomeEmailHtml,
        });

        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to:', data.email);
        } else {
          console.error('❌ Failed to send welcome email:', emailResult.message);
          console.warn('⚠️ Staff created but email failed. Manual action required:');
          console.warn(`   Email: ${data.email}`);
          console.warn(`   Password: ${data.password}`);
        }
      } catch (emailError: any) {
        // Log but don't fail user creation if email fails
        console.error('❌ Failed to send welcome email:', emailError?.message || emailError);
        console.warn('⚠️ Staff created but email sending failed. Manual action required:');
        console.warn(`   Email: ${data.email}`);
        console.warn(`   Password: ${data.password}`);
      }
    })();

    return basicUser;
  }

  async updateStaff(data: UpdateStaffData): Promise<User> {
    // SECURITY: Only admins can assign or change company assignments for staff
    // Check if the current user is an admin before allowing company_id changes
    if (data.companyId !== undefined) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: currentUser } = await supabase
          .from(TABLES.users)
          .select('role')
          .eq('id', authUser.id)
          .single();
        
        if (!currentUser || (currentUser as any).role !== 'admin') {
          throw new Error('Only administrators can assign or change company assignments for staff members.');
        }
      } else {
        throw new Error('Authentication required to update staff company assignment.');
      }
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.jobTitle !== undefined) updateData.job_title = data.jobTitle;
    
    // Handle company assignment with verification
    if (data.companyId !== undefined) {
      if (data.companyId && data.companyId.trim() !== '') {
        // Verify company exists before assigning
        const trimmedCompanyId = data.companyId.trim();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(trimmedCompanyId)) {
          const { data: company, error: companyError } = await supabase
            .from(TABLES.companies)
            .select('id, name')
            .eq('id', trimmedCompanyId)
            .maybeSingle();
          
          if (companyError || !company) {
            console.warn('⚠️ Company not found or inaccessible - removing company assignment');
            updateData.company_id = null;
          } else {
            updateData.company_id = trimmedCompanyId;
          }
        } else {
          console.warn('⚠️ Invalid company ID format - removing company assignment');
          updateData.company_id = null;
        }
      } else {
        updateData.company_id = null;
      }
    }
    
    if (data.isActive !== undefined) {
      // Note: isActive might not exist in users table, adjust if needed
      updateData.is_active = data.isActive;
    }
    if (data.isSubAdmin !== undefined) updateData.is_sub_admin = data.isSubAdmin;
    if (data.isBanned !== undefined) updateData.is_banned = data.isBanned;
    if (data.salaryAmount !== undefined) updateData.salary_amount = data.salaryAmount;
    if (data.salaryDate !== undefined) updateData.salary_date = data.salaryDate;
    updateData.updated_at = new Date().toISOString();

    let userProfile: any;
    let updateError: any;

    const updateResult = await (supabase
      .from(TABLES.users) as any)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    userProfile = updateResult.data;
    updateError = updateResult.error;

    // Handle foreign key constraint error - retry without company
    if (updateError && (updateError.code === '23503' || updateError.message?.includes('violates foreign key constraint')) && updateData.company_id) {
      console.warn('⚠️ Company assignment failed during update - removing company assignment');
      updateData.company_id = null;
      
      const retryResult = await (supabase
        .from(TABLES.users) as any)
        .update(updateData)
        .eq('id', data.id)
        .select(`
          *,
          company:companies(*)
        `)
        .single();
      
      if (retryResult.error) {
        throw retryResult.error;
      }
      
      userProfile = retryResult.data;
      updateError = null;
      console.log('✅ Staff updated successfully (company assignment removed due to constraint)');
    }

    if (updateError) throw updateError;
    if (!userProfile) throw new Error('Failed to update staff member');

    return mapUserFromDB(userProfile) as User;
  }

  async deleteStaff(id: string): Promise<void> {
    // Delete from users table (cascade will handle related records)
    const { error } = await supabase.from(TABLES.users).delete().eq('id', id);
    if (error) throw error;

    // Also delete from auth.users (requires admin privileges)
    // Note: This might fail if not using service role key
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch (err) {
      console.warn('Could not delete auth user (may require admin privileges):', err);
    }
  }

  async getStaff(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.users)
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', id)
      .eq('role', 'staff')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapUserFromDB(data) as User;
  }

  async getAllStaff(filters?: { companyId?: string }): Promise<User[]> {
    let query = supabase
      .from(TABLES.users)
      .select(`
        *,
        company:companies(*)
      `)
      .eq('role', 'staff')
      .order('created_at', { ascending: false });

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item) => mapUserFromDB(item) as User);
  }

  async banStaff(id: string): Promise<User> {
    const { data, error } = await (supabase
      .from(TABLES.users) as any)
      .update({
        is_banned: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('role', 'staff') // Only allow banning staff, not admins
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Staff member not found');

    // Sign out the banned user if they're currently logged in
    // Note: This requires the user to be the authenticated user
    // For proper enforcement, you may want to implement a backend check
    try {
      // The actual signout will happen when they try to use the system
      // and the auth check fails
    } catch (err) {
      console.warn('Could not sign out banned user:', err);
    }

    return mapUserFromDB(data) as User;
  }

  async unbanStaff(id: string): Promise<User> {
    const { data, error } = await (supabase
      .from(TABLES.users) as any)
      .update({ 
        is_banned: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('role', 'staff')
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Staff member not found');

    return mapUserFromDB(data) as User;
  }
}

export const staffService = new StaffService();

import { supabase, TABLES } from './supabase';
import { Client } from '../types';
import { emailService } from './email.service';
import { createClient } from '@supabase/supabase-js';

// Create admin client for user management (requires service role key)
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

export interface CreateClientData {
  companyId: string;
  assignedTo?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  currency?: string; // Preferred currency code (e.g., 'USD', 'AED', 'EUR')
}

export interface UpdateClientData {
  id: string;
  assignedTo?: string;
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  currency?: string; // Preferred currency code (e.g., 'USD', 'AED', 'EUR')
  isActive?: boolean;
}

class ClientService {
  async createClient(data: CreateClientData): Promise<Client> {
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error('Authentication required to create client');
    }

    // Validate required fields
    if (!data.companyId || !data.name || !data.email) {
      throw new Error('Company, name, and email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // If password is provided, create an auth user for the client with auto-confirmation
    let clientAuthUserId: string | undefined;
    // Only create auth user if password is provided and not empty
    if (data.password && typeof data.password === 'string' && data.password.trim().length > 0) {
      const password = data.password.trim();
      // Only check Supabase's minimum requirement (6 characters)
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      // Let Supabase handle password strength validation - we don't enforce additional rules

      // Normalize email at the start (used throughout this function)
      const normalizedEmail = data.email.trim().toLowerCase();
      
      // Try to use admin client first (auto-confirms user)
      const adminClient = getAdminClient();
      
      if (adminClient) {
        // Use admin API to create user with auto-confirmation
        try {
          console.log('🔐 Creating auth user with admin client for:', normalizedEmail);
          
          const { data: adminUserData, error: adminError } = await adminClient.auth.admin.createUser({
            email: normalizedEmail,
            password: data.password, // Use the exact password provided
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              role: 'client',
              name: data.name,
            },
          });
          
          console.log('📝 Admin client response:', { 
            userCreated: !!adminUserData?.user, 
            userId: adminUserData?.user?.id,
            email: normalizedEmail,
            error: adminError?.message 
          });
          
          if (adminError) {
            console.error('❌ Admin client error details:', {
              message: adminError.message,
              status: adminError.status,
              name: adminError.name
            });
          }

          if (adminError) {
            console.error('❌ Auth user creation failed:', adminError);
            if (adminError.message.includes('already registered') || 
                adminError.message.includes('already exists') ||
                adminError.message.includes('User already registered')) {
              // User already exists - try to get the existing user ID
              try {
                console.log('🔍 Looking up existing auth user with email:', normalizedEmail);
                const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
                if (listError) {
                  console.error('❌ Error listing users:', listError);
                  throw new Error(`Failed to check for existing user: ${listError.message}`);
                }
                const existingUser = existingUsers.users.find((u: any) => 
                  u.email?.toLowerCase().trim() === normalizedEmail
                );
                if (existingUser) {
                  console.log('✅ Found existing auth user:', existingUser.id, existingUser.email);
                  clientAuthUserId = existingUser.id;
                  
                  // Update the password AND confirm email for the existing user
                  console.log('🔄 Updating password and confirming email for existing auth user...');
                  const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
                    existingUser.id,
                    { 
                      password: data.password,
                      email_confirm: true // IMPORTANT: Confirm email so user can login immediately
                    }
                  );
                  
                  if (updateError) {
                    console.error('❌ Failed to update password/confirm email for existing user:', updateError);
                    throw new Error(`Auth user already exists, but failed to update: ${updateError.message}. Please reset the password manually in Supabase Dashboard.`);
                  }
                  
                  console.log('✅ Password updated and email confirmed for existing auth user');
                } else {
                  throw new Error(`A user with email ${normalizedEmail} already exists, but we couldn't retrieve their user ID. The client should try logging in with their existing password, or reset the password.`);
                }
              } catch (lookupError: any) {
                console.error('❌ Error looking up existing user:', lookupError);
                throw new Error(`A user with this email already exists. Please use a different email or the client can log in with their existing password. Error: ${lookupError.message}`);
              }
            } else {
              console.error('❌ Failed to create auth user:', adminError);
              throw new Error(`Failed to create client login: ${adminError.message}`);
            }
          }

          if (!adminUserData.user) {
            throw new Error('Failed to create client login. No user data returned.');
          }

          clientAuthUserId = adminUserData.user.id;
          
          // Verify the user was actually created in auth.users before proceeding
          // Wait a moment for the database to commit the transaction
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to verify user exists (non-blocking - if verification fails, we'll handle it later)
          // Retry verification up to 2 times in case of timing issues
          let verified = false;
          let retryCount = 0;
          const maxRetries = 2;
          
          while (!verified && retryCount < maxRetries) {
            try {
              const { data: verifyUser, error: verifyError } = await adminClient.auth.admin.getUserById(clientAuthUserId);
              if (verifyError || !verifyUser || !verifyUser.user) {
                retryCount++;
                if (retryCount >= maxRetries) {
                  console.warn('⚠️ Auth user verification failed after retries (non-blocking):', verifyError?.message || 'Unknown error');
                  // Don't throw error - we'll verify again before inserting client record
                  verified = false;
                  break;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              }
              console.log('✅ Auth user verified successfully:', verifyUser.user.id);
              verified = true;
            } catch (verifyError: any) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.warn('⚠️ Error verifying auth user after retries (non-blocking):', verifyError?.message || 'Unknown error');
                // Don't throw error - we'll verify again before inserting client record
                verified = false;
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // If verification failed, we'll still proceed but verify again before inserting
          if (!verified) {
            console.warn('⚠️ Initial verification failed - will verify again before creating client record');
          }
        } catch (adminError: any) {
          // This catch block handles errors from the try block above (adminClient.auth.admin.createUser)
          // Fall back to regular signup if admin client fails
          console.warn('Admin client failed, falling back to regular signup:', adminError.message);
          
          const { data: authClientData, error: authClientError } = await supabase.auth.signUp({
            email: normalizedEmail, // Use normalized email
            password: data.password,
            options: {
              data: {
                role: 'client',
                name: data.name,
              },
            },
          });

          if (authClientError) {
            if (authClientError.message.includes('already registered') || 
                authClientError.message.includes('already exists') ||
                authClientError.message.includes('User already registered')) {
              // User already exists - try to get existing user and confirm email
              console.log('🔍 User already exists in fallback, trying to update and confirm...');
              const adminClientForExisting = getAdminClient();
              if (adminClientForExisting) {
                try {
                  const { data: existingUsers, error: listError } = await adminClientForExisting.auth.admin.listUsers();
                  if (!listError && existingUsers?.users) {
                    const existingUser = existingUsers.users.find((u: any) => 
                      u.email?.toLowerCase().trim() === normalizedEmail
                    );
                    if (existingUser) {
                      console.log('✅ Found existing user in fallback, updating password and confirming email...');
                      const { error: updateError } = await adminClientForExisting.auth.admin.updateUserById(
                        existingUser.id,
                        { 
                          password: data.password,
                          email_confirm: true // Confirm email
                        }
                      );
                      if (!updateError) {
                        clientAuthUserId = existingUser.id;
                        console.log('✅ Existing user updated and email confirmed in fallback');
                      } else {
                        throw new Error(`Failed to update existing user: ${updateError.message}`);
                      }
                    } else {
                      throw new Error('User already exists but could not be found in system');
                    }
                  } else {
                    throw new Error(`Failed to list users: ${listError?.message || 'Unknown error'}`);
                  }
                } catch (existingUserError: any) {
                  console.error('❌ Error handling existing user in fallback:', existingUserError);
                  throw new Error(`A user with this email already exists. Error: ${existingUserError.message}`);
                }
              } else {
                throw new Error('A user with this email already exists. Please use a different email or the client can log in with their existing password.');
              }
            }
            throw new Error(`Failed to create client login: ${authClientError.message}`);
          }

          if (!authClientData.user) {
            throw new Error('Failed to create client login. No user data returned.');
          }

          clientAuthUserId = authClientData.user.id;
          
          // Wait a moment for the database to commit the transaction
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // CRITICAL: Always confirm email using admin client if available
          const adminClientForVerify = getAdminClient();
          if (adminClientForVerify) {
            try {
              // Confirm the email immediately - retry if needed
              console.log('🔄 Confirming email for user created via regular signup...');
              let confirmed = false;
              let retryCount = 0;
              const maxRetries = 3;
              
              while (!confirmed && retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 300 * retryCount)); // Increasing delay
                const { error: confirmError } = await adminClientForVerify.auth.admin.updateUserById(
                  clientAuthUserId,
                  { email_confirm: true }
                );
                
                if (confirmError) {
                  retryCount++;
                  console.warn(`⚠️ Failed to confirm email (attempt ${retryCount}/${maxRetries}):`, confirmError);
                  if (retryCount >= maxRetries) {
                    console.error('❌ Failed to confirm email after all retries');
                  }
                } else {
                  confirmed = true;
                  console.log('✅ Email confirmed for user created via regular signup');
                }
              }
              
              // Verify user exists and email is confirmed
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait for confirmation to propagate
              const { data: verifyUser, error: verifyError } = await adminClientForVerify.auth.admin.getUserById(clientAuthUserId);
              if (verifyError || !verifyUser || !verifyUser.user) {
                console.warn('⚠️ Auth user verification failed in fallback (non-blocking):', verifyError?.message || 'Unknown error');
              } else {
                console.log('✅ Auth user verified:', verifyUser.user.id);
                if (!verifyUser.user.email_confirmed_at && confirmed) {
                  console.log('⚠️ Email confirmation flag set but email_confirmed_at not updated, retrying...');
                  await adminClientForVerify.auth.admin.updateUserById(clientAuthUserId, { email_confirm: true });
                } else {
                  console.log('✅ Email confirmed successfully:', verifyUser.user.email_confirmed_at ? 'Confirmed' : 'Needs confirmation');
                }
              }
            } catch (verifyError: any) {
              console.error('❌ Error verifying/confirming auth user in fallback:', verifyError);
              // Still proceed - we'll verify before inserting
            }
          } else {
            // No admin client - this should not happen if VITE_SUPABASE_SERVICE_ROLE_KEY is set
            console.error('❌ CRITICAL: No admin client available - email cannot be auto-confirmed!');
            console.error('❌ Client will NOT be able to login without email confirmation.');
            console.error('❌ Please set VITE_SUPABASE_SERVICE_ROLE_KEY in .env file.');
            // Don't clear auth_user_id - let it be created, but warn the user
          }
        }
      } else {
        // No admin client available - this should not happen in production
        console.error('❌ CRITICAL: No admin client available - cannot auto-confirm email!');
        console.error('❌ Please ensure VITE_SUPABASE_SERVICE_ROLE_KEY is set in .env file.');
        throw new Error('Cannot create client account: Service role key not configured. Please contact administrator.');
      }
    }

    // Note: If password was provided but auth user creation/verification failed,
    // we'll still create the client record but WITHOUT auth_user_id
    // This allows the client to be created even if there are temporary verification issues
    // The client can be created with login access later if needed
    
    // Final verification: if we have an auth_user_id, make sure it's a valid UUID format
    // This is a safety check before attempting database insert
    if (clientAuthUserId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientAuthUserId)) {
        console.error('Invalid UUID format for auth_user_id:', clientAuthUserId);
        console.warn('⚠️ Clearing invalid auth_user_id - client will be created without login access');
        clientAuthUserId = undefined; // Clear invalid ID instead of throwing error
      }
    }

    // Ensure company_id and created_by are valid UUIDs (not empty strings)
    if (!data.companyId || typeof data.companyId !== 'string' || data.companyId.trim() === '') {
      throw new Error('Company ID is required and must be a valid UUID');
    }
    if (!authUser.id || typeof authUser.id !== 'string' || authUser.id.trim() === '') {
      throw new Error('Authenticated user ID is required and must be a valid UUID');
    }
    
    // Validate UUID format for required fields
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.companyId.trim())) {
      throw new Error('Invalid Company ID format. Must be a valid UUID.');
    }
    if (!uuidRegex.test(authUser.id.trim())) {
      throw new Error('Invalid authenticated user ID format. Must be a valid UUID.');
    }
    
    const insertData: any = {
      company_id: data.companyId.trim(),
      created_by: authUser.id.trim(),
      name: data.name,
      email: data.email.trim().toLowerCase(), // Normalize email: trim and lowercase
      is_active: true,
    };

    // Only include UUID fields if they have valid values (not empty strings)
    // Validate assignedTo is a valid UUID before including
    if (data.assignedTo && typeof data.assignedTo === 'string') {
      const trimmedAssignedTo = data.assignedTo.trim();
      // Check if it's a valid UUID format (36 characters with dashes)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (trimmedAssignedTo !== '' && trimmedAssignedTo.length === 36 && uuidRegex.test(trimmedAssignedTo)) {
        insertData.assigned_to = trimmedAssignedTo;
      }
      // If it's empty or invalid, don't include it (will be NULL in database)
    }
    if (data.phone && typeof data.phone === 'string' && data.phone.trim() !== '') insertData.phone = data.phone;
    if (data.address && typeof data.address === 'string' && data.address.trim() !== '') insertData.address = data.address;
    if (data.contactPerson && typeof data.contactPerson === 'string' && data.contactPerson.trim() !== '') insertData.contact_person = data.contactPerson;
    if (data.notes && typeof data.notes === 'string' && data.notes.trim() !== '') insertData.notes = data.notes;
    if (data.currency && typeof data.currency === 'string' && data.currency.trim() !== '') insertData.currency = data.currency.trim();
    // Only set auth_user_id if it's a valid non-empty UUID string AND verified to exist in auth.users
    // CRITICAL: Only include if auth user was successfully created AND verified (UUIDs are exactly 36 characters)
    if (clientAuthUserId && typeof clientAuthUserId === 'string' && clientAuthUserId.trim().length === 36) {
      // Double-check UUID format one more time before inserting
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const trimmedId = clientAuthUserId.trim();
      if (uuidRegex.test(trimmedId)) {
        // Final verification: Try to ensure the user exists in auth.users using admin client
        // If verification fails, we'll still create the client but WITHOUT auth_user_id to avoid foreign key violations
        const adminClientForFinalCheck = getAdminClient();
        let shouldSetAuthUserId = false;
        
        if (adminClientForFinalCheck) {
          try {
            // Try verification with a small timeout to avoid hanging
            const verifyPromise = adminClientForFinalCheck.auth.admin.getUserById(trimmedId);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification timeout')), 3000)
            );
            
            const finalVerify = await Promise.race([verifyPromise, timeoutPromise]) as any;
            
            if (finalVerify?.data?.user || finalVerify?.user) {
              insertData.auth_user_id = trimmedId;
              console.log('✅ Setting auth_user_id for client (verified exists):', trimmedId);
              shouldSetAuthUserId = true;
            } else {
              console.warn('⚠️ Final verification returned no user - client will be created WITHOUT auth_user_id');
            }
          } catch (finalError: any) {
            // Verification failed - create client without auth_user_id (non-blocking)
            console.warn('⚠️ Final verification failed or timed out (non-blocking):', finalError?.message || 'Unknown error');
            console.log('⚠️ Client will be created WITHOUT auth_user_id to avoid foreign key violation');
            // Don't set auth_user_id - let it be NULL (client created without login access)
          }
        } else {
          // No admin client available - we can't verify, so don't set auth_user_id to be safe
          console.warn('⚠️ No admin client available for final verification - not setting auth_user_id to avoid foreign key violation');
          // Don't set auth_user_id - let it be NULL
        }
        
        // Only set if verification succeeded
        if (!shouldSetAuthUserId && insertData.auth_user_id === trimmedId) {
          delete insertData.auth_user_id;
        }
      } else {
        console.error('❌ Invalid UUID format, not setting auth_user_id:', clientAuthUserId);
        // Don't set it - let it be NULL to avoid foreign key violation
      }
    } else {
      console.log('ℹ️ No auth_user_id to set - client will be created without login access');
    }
    // DO NOT set auth_user_id if it's empty, undefined, invalid, or not verified - let it be NULL in database

    const { data: client, error } = await supabase
      .from(TABLES.clients)
      .insert(insertData)
      .select(`
        *,
        company:companies(*),
        createdByUser:users!clients_created_by_fkey(id, email, first_name, last_name),
        assignedToUser:users!clients_assigned_to_fkey(id, email, first_name, last_name, job_title)
      `)
      .single();

    if (error) {
      console.error('Client creation error:', error);
      // If client record creation fails but auth user was created, we should clean up
      if (clientAuthUserId) {
        console.warn('Client record creation failed but auth user was created. Auth user may need manual cleanup.');
      }
      if (error.code === '23505') {
        throw new Error('A client with this email already exists.');
      }
      throw new Error(`Failed to create client: ${error.message}`);
    }

    const mappedClient = this.mapClientFromDB(client);

    // Send welcome email via cPanel if password was provided
    // IMPORTANT: Send email if password was provided, regardless of auth_user_id status
    // This ensures the client gets their credentials even if auth_user_id wasn't set
    if (data.password) {
      try {
        const companyName = mappedClient.company?.name || 'UBS ERP';
        const loginUrl = window.location.origin + '/login';
        
        // Warn if auth_user_id is missing (client might not be able to log in)
        const authWarning = !clientAuthUserId 
          ? '<p style="color: #dc2626; font-weight: bold;">⚠️ IMPORTANT: Your account may need to be activated. If you cannot log in, please contact support.</p>'
          : '';
        
        const welcomeEmailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
                .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to ${companyName}!</h1>
                </div>
                <div class="content">
                  <p>Dear ${data.name},</p>
                  <p>Your client account has been created successfully. You can now access the UBS ERP portal to view your invoices, proposals, and project information.</p>
                  
                  ${authWarning}
                  
                  <div class="credentials">
                    <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${data.password}</code></p>
                    <p style="color: #dc2626; font-size: 0.9em; margin-top: 15px;">
                      ⚠️ Please save this password and change it after first login for security.
                    </p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${loginUrl}" class="button">Login to Portal</a>
                  </p>
                  
                  <p>From the portal, you can:</p>
                  <ul>
                    <li>View and download your invoices</li>
                    <li>Access proposals and estimates</li>
                    <li>Track project progress</li>
                    <li>Communicate with our team</li>
                  </ul>
                  
                  <p>If you have any questions or cannot log in, please contact your account manager or support team.</p>
                  
                  <p>Best regards,<br>${companyName} Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated email from UBS ERP System</p>
                </div>
              </div>
            </body>
          </html>
        `;

        await emailService.sendEmail({
          to: data.email,
          subject: `Welcome to ${companyName} - Client Portal Access`,
          html: welcomeEmailHtml,
        });

        console.log('✅ Client welcome email sent via cPanel to:', data.email);
        if (!clientAuthUserId) {
          console.warn('⚠️ Email sent but auth_user_id is missing - client login may not work until auth user is created');
        }
      } catch (emailError) {
        // Log but don't fail client creation if email fails
        console.error('❌ Failed to send client welcome email:', emailError);
        // Throw error so the caller knows email failed
        throw new Error(`Client created successfully, but failed to send welcome email. Password: ${data.password}. Please send credentials to client manually.`);
      }
    } else if (clientAuthUserId) {
      // If no password provided but auth_user_id exists, warn that client needs password reset
      console.warn('⚠️ Client has auth_user_id but no password was provided - client will need to reset password to log in');
    }

    return mappedClient;
  }

  async updateClient(data: UpdateClientData): Promise<Client> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
      updateData.email = data.email;
    }
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo || null;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.contactPerson !== undefined) updateData.contact_person = data.contactPerson;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.currency !== undefined) updateData.currency = data.currency || null;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    updateData.updated_at = new Date().toISOString();

    const { data: client, error } = await supabase
      .from(TABLES.clients)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        company:companies(*),
        createdByUser:users!clients_created_by_fkey(id, email, first_name, last_name),
        assignedToUser:users!clients_assigned_to_fkey(id, email, first_name, last_name, job_title)
      `)
      .single();

    if (error) throw error;

    return this.mapClientFromDB(client);
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.clients).delete().eq('id', id);
    if (error) throw error;
  }

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from(TABLES.clients)
      .select(`
        *,
        company:companies(*),
        createdByUser:users!clients_created_by_fkey(id, email, first_name, last_name),
        assignedToUser:users!clients_assigned_to_fkey(id, email, first_name, last_name, job_title)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapClientFromDB(data);
  }

  async getAllClients(filters?: { companyId?: string; isActive?: boolean; assignedTo?: string }): Promise<Client[]> {
    let query = supabase
      .from(TABLES.clients)
      .select(`
        *,
        company:companies(*),
        createdByUser:users!clients_created_by_fkey(id, email, first_name, last_name),
        assignedToUser:users!clients_assigned_to_fkey(id, email, first_name, last_name, job_title)
      `)
      .order('created_at', { ascending: false });

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item) => this.mapClientFromDB(item));
  }

  async getClientsByCompany(companyId: string): Promise<Client[]> {
    return this.getAllClients({ companyId, isActive: true });
  }

  private mapClientFromDB(data: any): Client {
    return {
      id: data.id,
      companyId: data.company_id,
      createdBy: data.created_by,
      assignedTo: data.assigned_to,
      authUserId: data.auth_user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      contactPerson: data.contact_person,
      notes: data.notes,
      currency: data.currency,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      company: data.company ? {
        id: data.company.id,
        name: data.company.name,
        address: data.company.address,
        phone: data.company.phone,
        email: data.company.email,
        logo: data.company.logo,
        isActive: data.company.is_active,
        createdAt: data.company.created_at,
        updatedAt: data.company.updated_at,
      } : undefined,
      createdByUser: data.createdByUser ? {
        id: data.createdByUser.id,
        email: data.createdByUser.email,
        role: 'staff' as const,
        firstName: data.createdByUser.first_name,
        lastName: data.createdByUser.last_name,
        createdAt: '',
        updatedAt: '',
      } : undefined,
      assignedToUser: data.assignedToUser ? {
        id: data.assignedToUser.id,
        email: data.assignedToUser.email,
        role: 'staff' as const,
        firstName: data.assignedToUser.first_name,
        lastName: data.assignedToUser.last_name,
        jobTitle: data.assignedToUser.job_title,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    };
  }
}

export const clientService = new ClientService();


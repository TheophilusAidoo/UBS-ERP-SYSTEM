import { supabase, TABLES } from './supabase';
import { User } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';
import { leaveService } from './leave.service';
import { emailService } from './email.service';

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

    // Create auth user first - We'll send welcome email via cPanel (not Supabase)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'staff',
          first_name: data.firstName,
          last_name: data.lastName,
        },
        // Note: Supabase may still send a confirmation email
        // But we're sending our own welcome email via cPanel below
      },
    });

    if (authError) {
      // Handle specific error cases
      if (authError.message.includes('already registered') || 
          authError.message.includes('already exists') ||
          authError.message.includes('User already registered')) {
        throw new Error('A user with this email already exists. Please use a different email.');
      }
      if (authError.message.includes('Invalid email')) {
        throw new Error('Invalid email address format.');
      }
      if (authError.message.includes('Password')) {
        throw new Error('Password does not meet requirements.');
      }
      console.error('Auth signup error:', authError);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user account. No user data returned.');
    }

    // Wait a bit to ensure auth user is fully created in the database
    // Reduced delay from 1000ms to 300ms for faster response
    // This is important for RLS policies to recognize the new user
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create user profile in the users table
    const insertData: any = {
      id: authData.user.id,
      email: data.email,
      role: 'staff',
    };

    // Only set company_id if it's a valid non-empty string
    // If companyId is empty string or invalid, set it to null (company_id is nullable)
    // We trust that the company exists since it was selected from the dropdown
    // If it doesn't exist, Supabase will throw a foreign key error which we handle below
    if (data.companyId && data.companyId.trim() !== '') {
      insertData.company_id = data.companyId;
    } else {
      // Explicitly set to null if not provided or empty
      insertData.company_id = null;
    }
    
    if (data.jobTitle) insertData.job_title = data.jobTitle;
    if (data.firstName) insertData.first_name = data.firstName;
    if (data.lastName) insertData.last_name = data.lastName;
    if (data.isSubAdmin !== undefined) insertData.is_sub_admin = data.isSubAdmin;
    if (data.salaryAmount !== undefined) insertData.salary_amount = data.salaryAmount;
    if (data.salaryDate !== undefined) insertData.salary_date = data.salaryDate;

    const { data: userProfile, error: profileError } = await supabase
      .from(TABLES.users)
      .insert(insertData)
      .select('*')
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // If profile creation fails, we can't easily clean up the auth user
      // from the client side (requires admin API), but we'll throw a clear error
      if (profileError.code === '23505') {
        throw new Error('A user profile with this email already exists.');
      }
      if (profileError.code === '23503') {
        // Foreign key constraint violation - means company doesn't exist or RLS is blocking
        // This is rare since companies are selected from a dropdown, but could happen if:
        // 1. Company was deleted between page load and submission
        // 2. RLS policy is preventing the company from being used
        console.error('Foreign key constraint error:', profileError);
        throw new Error('Unable to assign the selected company. This may be due to permissions or the company being deleted. Please try selecting the company again or leave it empty.');
      }
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Map and return the user immediately (don't wait for background tasks)
    const basicUser = mapUserFromDB(userProfile) as User;

    // Perform non-critical operations in the background (non-blocking)
    (async () => {
      try {
        // Initialize leave balance for the new staff member
        try {
          const { defaultAnnualLeave, defaultSickLeave, defaultEmergencyLeave } = 
            JSON.parse(localStorage.getItem('ubs-global-settings') || '{}') || {};
          
          if (authData.user) {
            await leaveService.updateLeaveBalance({
              userId: authData.user.id,
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

        // Send welcome email via cPanel (not Supabase)
        try {
          const loginUrl = window.location.origin + '/login';
          
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
                      <p><strong>Password:</strong> ${data.password}</p>
                      <p style="color: #dc2626; font-size: 0.9em; margin-top: 15px;">
                        ⚠️ Please change your password after first login for security.
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

          await emailService.sendEmail({
            to: data.email,
            subject: `Welcome to ${companyName} - Your Staff Account`,
            html: welcomeEmailHtml,
          });

          console.log('✅ Welcome email sent to:', data.email);
        } catch (emailError) {
          // Log but don't fail user creation if email fails
          console.warn('⚠️ Failed to send welcome email:', emailError);
        }
      } catch (bgError) {
        console.warn('⚠️ Background task error (non-critical):', bgError);
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
    if (data.companyId !== undefined) {
      updateData.company_id = data.companyId || null;
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

    const { data: userProfile, error } = await (supabase
      .from(TABLES.users) as any)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    if (error) throw error;

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
    const { data, error } = await supabase
      .from(TABLES.users)
      (supabase
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
    const { data, error } = await supabase
      .from(TABLES.users)
      (supabase
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

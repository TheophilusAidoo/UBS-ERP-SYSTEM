import { supabase, TABLES } from './supabase';
import { LeaveRequest, LeaveType, LeaveStatus } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateLeaveRequestData {
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateLeaveRequestData {
  leaveId: string;
  status: LeaveStatus;
  approvedBy: string;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  annualTotal: number;
  annualUsed: number;
  sickTotal: number;
  sickUsed: number;
  emergencyTotal: number;
  emergencyUsed: number;
}

export interface UpdateLeaveBalanceData {
  userId: string;
  annualTotal?: number;
  sickTotal?: number;
  emergencyTotal?: number;
}

class LeaveService {
  async createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
    const { data: leaveRequest, error } = await supabase
      .from(TABLES.leave_requests)
      .insert({
        user_id: data.userId,
        type: data.type,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw error;

    // Fetch user separately
    const { data: userData } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('id', leaveRequest.user_id)
      .single();

    return {
      id: leaveRequest.id,
      userId: leaveRequest.user_id,
      user: userData ? mapUserFromDB(userData) : undefined,
      type: leaveRequest.type,
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      approvedBy: leaveRequest.approved_by,
      approvedAt: leaveRequest.approved_at,
      createdAt: leaveRequest.created_at,
      updatedAt: leaveRequest.updated_at,
    };
  }

  async updateLeaveRequest(data: UpdateLeaveRequestData): Promise<LeaveRequest> {
    const updateData: any = {
      status: data.status,
      approved_by: data.approvedBy,
      updated_at: new Date().toISOString(),
    };

    if (data.status === 'approved' || data.status === 'rejected') {
      updateData.approved_at = new Date().toISOString();
    }

    const { data: leaveRequest, error } = await supabase
      .from(TABLES.leave_requests)
      .update(updateData)
      .eq('id', data.leaveId)
      .select('*')
      .single();

    if (error) throw error;

    // Fetch user separately
    const { data: userData } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('id', leaveRequest.user_id)
      .single();

    // Update leave balance if approved
    if (data.status === 'approved') {
      await this.updateLeaveBalanceOnApproval(leaveRequest.user_id, leaveRequest.type);
    }

    return {
      id: leaveRequest.id,
      userId: leaveRequest.user_id,
      user: userData ? mapUserFromDB(userData) : undefined,
      type: leaveRequest.type,
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      approvedBy: leaveRequest.approved_by,
      approvedAt: leaveRequest.approved_at,
      createdAt: leaveRequest.created_at,
      updatedAt: leaveRequest.updated_at,
    };
  }

  async updateLeaveBalanceOnApproval(userId: string, type: LeaveType) {
    // Get the leave request to calculate days
    const { data: leaveRequest } = await supabase
      .from(TABLES.leave_requests)
      .select('start_date, end_date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!leaveRequest) return;

    const startDate = new Date(leaveRequest.start_date);
    const endDate = new Date(leaveRequest.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Get current balance
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    const updateField = type === 'annual' ? 'annual_used' : type === 'sick' ? 'sick_used' : 'emergency_used';

    if (balance) {
      await supabase
        .from('leave_balances')
        .update({
          [updateField]: (balance[updateField] || 0) + days,
        })
        .eq('user_id', userId);
    } else {
      // Create balance if doesn't exist
      const initialData: any = {
        user_id: userId,
        annual_total: 20,
        annual_used: 0,
        sick_total: 10,
        sick_used: 0,
        emergency_total: 5,
        emergency_used: 0,
      };
      initialData[updateField] = days;
      await supabase.from('leave_balances').insert(initialData);
    }
  }

  async getLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from(TABLES.leave_requests)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user data
    const { data: userData } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('id', userId)
      .single();

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: userData ? mapUserFromDB(userData) : undefined,
      type: item.type,
      startDate: item.start_date,
      endDate: item.end_date,
      reason: item.reason,
      status: item.status,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async getAllLeaveRequests(filters?: { status?: LeaveStatus; companyId?: string }): Promise<LeaveRequest[]> {
    let query = supabase
      .from(TABLES.leave_requests)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch all unique user IDs
    const userIds = [...new Set((data || []).map(item => item.user_id))];
    const { data: usersData } = await supabase
      .from(TABLES.users)
      .select('*')
      .in('id', userIds);

    const usersMap = new Map((usersData || []).map(u => [u.id, mapUserFromDB(u)]));

    // Apply company filter if needed
    let filteredData = data || [];
    if (filters?.companyId) {
      filteredData = filteredData.filter(item => {
        const user = usersMap.get(item.user_id);
        return user?.companyId === filters.companyId;
      });
    }

    return filteredData.map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: usersMap.get(item.user_id),
      type: item.type,
      startDate: item.start_date,
      endDate: item.end_date,
      reason: item.reason,
      status: item.status,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async getLeaveBalance(userId: string): Promise<{ annual: { total: number; used: number; remaining: number }; sick: { total: number; used: number; remaining: number }; emergency: { total: number; used: number; remaining: number } }> {
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Return default if no balance record exists
      return {
        annual: { total: 20, used: 0, remaining: 20 },
        sick: { total: 10, used: 0, remaining: 10 },
        emergency: { total: 5, used: 0, remaining: 5 },
      };
    }

    return {
      annual: {
        total: data.annual_total || 20,
        used: data.annual_used || 0,
        remaining: (data.annual_total || 20) - (data.annual_used || 0),
      },
      sick: {
        total: data.sick_total || 10,
        used: data.sick_used || 0,
        remaining: (data.sick_total || 10) - (data.sick_used || 0),
      },
      emergency: {
        total: data.emergency_total || 5,
        used: data.emergency_used || 0,
        remaining: (data.emergency_total || 5) - (data.emergency_used || 0),
      },
    };
  }

  async getAllLeaveBalances(): Promise<LeaveBalance[]> {
    const { data, error } = await supabase
      .from('leave_balances')
      .select(`
        *,
        users!leave_balances_user_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      annualTotal: item.annual_total,
      annualUsed: item.annual_used,
      sickTotal: item.sick_total,
      sickUsed: item.sick_used,
      emergencyTotal: item.emergency_total,
      emergencyUsed: item.emergency_used,
    }));
  }

  async updateLeaveBalance(data: UpdateLeaveBalanceData): Promise<void> {
    const { data: existing } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', data.userId)
      .single();

    const updateData: any = {};
    if (data.annualTotal !== undefined) updateData.annual_total = data.annualTotal;
    if (data.sickTotal !== undefined) updateData.sick_total = data.sickTotal;
    if (data.emergencyTotal !== undefined) updateData.emergency_total = data.emergencyTotal;

    if (existing) {
      const { error } = await supabase
        .from('leave_balances')
        .update(updateData)
        .eq('user_id', data.userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('leave_balances')
        .insert({
          user_id: data.userId,
          annual_total: data.annualTotal || 20,
          annual_used: 0,
          sick_total: data.sickTotal || 10,
          sick_used: 0,
          emergency_total: data.emergencyTotal || 5,
          emergency_used: 0,
        });
      if (error) throw error;
    }
  }
}

export const leaveService = new LeaveService();

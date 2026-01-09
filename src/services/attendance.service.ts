import { supabase, TABLES } from './supabase';
import { Attendance } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface ClockInData {
  userId: string;
  date?: string;
  clockIn?: string;
}

export interface ClockOutData {
  attendanceId: string;
  clockOut: string;
}

class AttendanceService {
  async clockIn(data: ClockInData): Promise<Attendance> {
    const now = new Date();
    const date = data.date || now.toISOString().split('T')[0];
    const clockIn = data.clockIn || now.toISOString();

    // Check if user already has an attendance record for this date
    const { data: existing } = await supabase
      .from(TABLES.attendance)
      .select('*')
      .eq('user_id', data.userId)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      // If they haven't clocked out yet, they can't clock in again
      if (!existing.clock_out) {
        throw new Error('You have already clocked in today. Please clock out first.');
      }
      // If they've already clocked in and out today, they can't clock in again
      throw new Error('You have already completed attendance for today. You can only clock in once per day.');
    }

    const { data: attendanceData, error } = await supabase
      .from(TABLES.attendance)
      .insert({
        user_id: data.userId,
        date,
        clock_in: clockIn,
      })
      .select(`
        *,
        user:users(*)
      `)
      .single();

    if (error) {
      // Handle duplicate key error specifically
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        throw new Error('You have already clocked in for this date. Please refresh the page.');
      }
      throw error;
    }

    return {
      id: attendanceData.id,
      userId: attendanceData.user_id,
      user: attendanceData.user ? mapUserFromDB(attendanceData.user) : undefined,
      clockIn: attendanceData.clock_in,
      clockOut: attendanceData.clock_out,
      date: attendanceData.date,
      totalHours: attendanceData.total_hours,
      createdAt: attendanceData.created_at,
    };
  }

  async clockOut(data: ClockOutData): Promise<Attendance> {
    // Get the attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from(TABLES.attendance)
      .select('*')
      .eq('id', data.attendanceId)
      .single();

    if (fetchError || !attendance) {
      throw new Error('Attendance record not found.');
    }

    if (attendance.clock_out) {
      throw new Error('You have already clocked out for this session.');
    }

    // Calculate total hours
    const clockIn = new Date(attendance.clock_in);
    const clockOut = new Date(data.clockOut);
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    const { data: updated, error } = await supabase
      .from(TABLES.attendance)
      .update({
        clock_out: data.clockOut,
        total_hours: totalHours,
      })
      .eq('id', data.attendanceId)
      .select(`
        *,
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: updated.id,
      userId: updated.user_id,
      user: updated.user ? mapUserFromDB(updated.user) : undefined,
      clockIn: updated.clock_in,
      clockOut: updated.clock_out,
      date: updated.date,
      totalHours: updated.total_hours,
      createdAt: updated.created_at,
    };
  }

  async getTodayAttendance(userId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from(TABLES.attendance)
      .select(`
        *,
        user:users(*)
      `)
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      user: data.user ? mapUserFromDB(data.user) : undefined,
      clockIn: data.clock_in,
      clockOut: data.clock_out,
      date: data.date,
      totalHours: data.total_hours,
      createdAt: data.created_at,
    };
  }

  async getAttendanceHistory(userId: string, limit: number = 30): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from(TABLES.attendance)
      .select(`
        *,
        user:users(*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      clockIn: item.clock_in,
      clockOut: item.clock_out,
      date: item.date,
      totalHours: item.total_hours,
      createdAt: item.created_at,
    }));
  }

  async getAllAttendance(filters?: { companyId?: string; userId?: string; startDate?: string; endDate?: string }): Promise<Attendance[]> {
    let query = supabase
      .from(TABLES.attendance)
      .select(`
        *,
        user:users(*)
      `)
      .order('date', { ascending: false })
      .limit(1000); // Increased limit to get more history

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    if (filters?.companyId) {
      query = query.eq('user.company_id', filters.companyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      clockIn: item.clock_in,
      clockOut: item.clock_out,
      date: item.date,
      totalHours: item.total_hours,
      createdAt: item.created_at,
    }));
  }

  // Get all attendance for a specific user (for admin to see full history)
  async getUserAttendanceHistory(userId: string, startDate?: string, endDate?: string): Promise<Attendance[]> {
    let query = supabase
      .from(TABLES.attendance)
      .select(`
        *,
        user:users(*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      clockIn: item.clock_in,
      clockOut: item.clock_out,
      date: item.date,
      totalHours: item.total_hours,
      createdAt: item.created_at,
    }));
  }

  // Calculate attendance statistics
  async getAttendanceStats(userId: string, period: 'daily' | 'monthly' | 'yearly'): Promise<{
    totalHours: number;
    totalDays: number;
    averageHours: number;
  }> {
    const now = new Date();
    let startDate: string;

    if (period === 'daily') {
      startDate = now.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
    } else {
      // yearly
      const firstDay = new Date(now.getFullYear(), 0, 1);
      startDate = firstDay.toISOString().split('T')[0];
    }

    const attendance = await this.getUserAttendanceHistory(userId, startDate);
    
    const totalHours = attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalDays = attendance.filter(record => record.clockOut).length;
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalDays,
      averageHours: Math.round(averageHours * 100) / 100,
    };
  }

  // Get attendance summary with breaks (days without attendance)
  async getAttendanceSummaryWithBreaks(userId: string, startDate: string, endDate: string): Promise<{
    attendance: Attendance[];
    breaks: string[]; // Dates where user didn't work
    totalDays: number;
    workingDays: number;
    breakDays: number;
    totalHours: number;
  }> {
    const attendance = await this.getUserAttendanceHistory(userId, startDate, endDate);
    
    // Generate all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allDates: string[] = [];
    const attendanceDates = new Set(attendance.map(a => a.date));
    const breaks: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      allDates.push(dateStr);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !attendanceDates.has(dateStr)) {
        breaks.push(dateStr);
      }
    }

    const totalDays = allDates.length;
    const workingDays = attendance.length;
    const breakDays = breaks.length;
    const totalHours = attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0);

    return {
      attendance: attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      breaks,
      totalDays,
      workingDays,
      breakDays,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  }
}

export const attendanceService = new AttendanceService();


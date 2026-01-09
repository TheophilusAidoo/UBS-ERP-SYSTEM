import { supabase, TABLES } from './supabase';
import { WorkReport } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateWorkReportData {
  projectId: string;
  userId: string;
  report: string;
  attachments?: string[];
  hoursWorked?: number;
  date: string;
}

export interface UpdateWorkReportData {
  id: string;
  report?: string;
  attachments?: string[];
  hoursWorked?: number;
  date?: string;
}

class WorkReportService {
  async createWorkReport(data: CreateWorkReportData): Promise<WorkReport> {
    const { data: workReport, error } = await supabase
      .from(TABLES.work_reports)
      .insert({
        project_id: data.projectId,
        user_id: data.userId,
        report: data.report,
        attachments: data.attachments || [],
        hours_worked: data.hoursWorked,
        date: data.date,
      })
      .select(`
        *,
        project:projects(*),
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: workReport.id,
      projectId: workReport.project_id,
      project: workReport.project ? {
        id: workReport.project.id,
        companyId: workReport.project.company_id,
        name: workReport.project.name,
        description: workReport.project.description,
        assignedTo: [],
        status: workReport.project.status,
        startDate: workReport.project.start_date,
        endDate: workReport.project.end_date,
        budget: workReport.project.budget,
        createdAt: workReport.project.created_at,
        updatedAt: workReport.project.updated_at,
      } : undefined,
      userId: workReport.user_id,
      user: workReport.user ? mapUserFromDB(workReport.user) : undefined,
      report: workReport.report,
      attachments: workReport.attachments || [],
      hoursWorked: workReport.hours_worked,
      date: workReport.date,
      createdAt: workReport.created_at,
    };
  }

  async getWorkReports(filters?: { projectId?: string; userId?: string }): Promise<WorkReport[]> {
    let query = supabase
      .from(TABLES.work_reports)
      .select(`
        *,
        project:projects(*),
        user:users(*)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      projectId: item.project_id,
      project: item.project ? {
        id: item.project.id,
        companyId: item.project.company_id,
        name: item.project.name,
        description: item.project.description,
        assignedTo: [],
        status: item.project.status,
        startDate: item.project.start_date,
        endDate: item.project.end_date,
        budget: item.project.budget,
        createdAt: item.project.created_at,
        updatedAt: item.project.updated_at,
      } : undefined,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      report: item.report,
      attachments: item.attachments || [],
      hoursWorked: item.hours_worked,
      date: item.date,
      createdAt: item.created_at,
    }));
  }

  async updateWorkReport(data: UpdateWorkReportData): Promise<WorkReport> {
    const updateData: any = {};

    if (data.report !== undefined) updateData.report = data.report;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.hoursWorked !== undefined) updateData.hours_worked = data.hoursWorked;
    if (data.date !== undefined) updateData.date = data.date;

    const { data: workReport, error } = await supabase
      .from(TABLES.work_reports)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        project:projects(*),
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: workReport.id,
      projectId: workReport.project_id,
      project: workReport.project ? {
        id: workReport.project.id,
        companyId: workReport.project.company_id,
        name: workReport.project.name,
        description: workReport.project.description,
        assignedTo: [],
        status: workReport.project.status,
        startDate: workReport.project.start_date,
        endDate: workReport.project.end_date,
        budget: workReport.project.budget,
        createdAt: workReport.project.created_at,
        updatedAt: workReport.project.updated_at,
      } : undefined,
      userId: workReport.user_id,
      user: workReport.user ? mapUserFromDB(workReport.user) : undefined,
      report: workReport.report,
      attachments: workReport.attachments || [],
      hoursWorked: workReport.hours_worked,
      date: workReport.date,
      createdAt: workReport.created_at,
    };
  }

  async deleteWorkReport(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.work_reports)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const workReportService = new WorkReportService();



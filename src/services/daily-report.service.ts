import { supabase, TABLES } from './supabase';
import { DailyReport, User, Company } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';
import { invoiceService } from './invoice.service';
import { financialService } from './financial.service';

export interface CreateDailyReportData {
  userId: string;
  companyId: string;
  date: string; // YYYY-MM-DD format
  summary?: string; // Keep for backward compatibility
  notes?: string; // Keep for backward compatibility
  tasks?: string; // Tasks of the day
  clientsContacted?: number; // Number of clients contacted
  quotesSent?: number; // Number of quotes sent
  salesMade?: number; // Number of sales made
  followUp?: string; // Follow-up tasks to do
  remark?: string; // Additional remarks
}

export interface UpdateDailyReportData {
  id: string;
  summary?: string; // Keep for backward compatibility
  notes?: string; // Keep for backward compatibility
  tasks?: string; // Tasks of the day
  clientsContacted?: number; // Number of clients contacted
  quotesSent?: number; // Number of quotes sent
  salesMade?: number; // Number of sales made
  followUp?: string; // Follow-up tasks to do
  remark?: string; // Additional remarks
}

export interface DailyReportWithStats extends DailyReport {
  dailySales: number;
  dailySalesCount: number;
  invoicesCreated: number;
  invoicesTotal: number;
  expenses: number;
  expensesCount: number;
}

class DailyReportService {
  async createDailyReport(data: CreateDailyReportData): Promise<DailyReport> {
    const { data: dailyReport, error } = await supabase
      .from(TABLES.daily_reports)
      .insert({
        user_id: data.userId,
        company_id: data.companyId,
        date: data.date,
        summary: data.summary || data.tasks || '', // Use tasks if summary not provided
        notes: data.notes || data.remark || null, // Use remark if notes not provided
        tasks: data.tasks || null,
        clients_contacted: data.clientsContacted || 0,
        quotes_sent: data.quotesSent || 0,
        sales_made: data.salesMade || 0,
        follow_up: data.followUp || null,
        remark: data.remark || null,
      })
      .select(`
        *,
        user:users(*),
        company:companies(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: dailyReport.id,
      userId: dailyReport.user_id,
      user: dailyReport.user ? mapUserFromDB(dailyReport.user) : undefined,
      companyId: dailyReport.company_id,
      company: dailyReport.company ? {
        id: dailyReport.company.id,
        name: dailyReport.company.name,
        address: dailyReport.company.address,
        phone: dailyReport.company.phone,
        email: dailyReport.company.email,
        isActive: dailyReport.company.is_active,
        createdAt: dailyReport.company.created_at,
        updatedAt: dailyReport.company.updated_at,
      } : undefined,
      date: dailyReport.date,
      summary: dailyReport.summary,
      notes: dailyReport.notes,
      tasks: dailyReport.tasks,
      clientsContacted: dailyReport.clients_contacted,
      quotesSent: dailyReport.quotes_sent,
      salesMade: dailyReport.sales_made,
      followUp: dailyReport.follow_up,
      remark: dailyReport.remark,
      createdAt: dailyReport.created_at,
      updatedAt: dailyReport.updated_at,
    };
  }

  async getDailyReports(filters?: {
    userId?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DailyReport[]> {
    let query = supabase
      .from(TABLES.daily_reports)
      .select(`
        *,
        user:users(*),
        company:companies(*)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      companyId: item.company_id,
      company: item.company ? {
        id: item.company.id,
        name: item.company.name,
        address: item.company.address,
        phone: item.company.phone,
        email: item.company.email,
        isActive: item.company.is_active,
        createdAt: item.company.created_at,
        updatedAt: item.company.updated_at,
      } : undefined,
      date: item.date,
      summary: item.summary,
      notes: item.notes,
      tasks: item.tasks,
      clientsContacted: item.clients_contacted,
      quotesSent: item.quotes_sent,
      salesMade: item.sales_made,
      followUp: item.follow_up,
      remark: item.remark,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async getDailyReportWithStats(reportId: string): Promise<DailyReportWithStats> {
    const reports = await this.getDailyReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
      throw new Error('Daily report not found');
    }

    // Get date range for the report date
    const reportDate = new Date(report.date);
    const startDate = new Date(reportDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Get sales for the day and calculate stats manually (only sold products)
    const { data: salesData } = await supabase
      .from(TABLES.product_sales)
      .select('*')
      .eq('status', 'sold')
      .eq('company_id', report.companyId)
      .eq('sold_by', report.userId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);

    const daySales = salesData || [];
    const dailySales = daySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const dailySalesCount = daySales.length;

    // Get invoices created on that day
    const invoices = await invoiceService.getInvoices({
      companyId: report.companyId,
      createdBy: report.userId,
    });
    const dayInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return invDate >= startDate && invDate <= endDate;
    });
    const invoicesTotal = dayInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

    // Get expenses for the day
    const financialSummary = await financialService.getFinancialSummary({
      userId: report.userId,
      companyId: report.companyId,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    // Get transactions to count expenses
    const transactions = await financialService.getTransactions({
      userId: report.userId,
      companyId: report.companyId,
      startDate: startDateStr,
      endDate: endDateStr,
      type: 'expense',
    });

    return {
      ...report,
      dailySales: dailySales,
      dailySalesCount: dailySalesCount,
      invoicesCreated: dayInvoices.length,
      invoicesTotal: invoicesTotal,
      expenses: financialSummary.totalExpenses,
      expensesCount: transactions.length,
    };
  }

  async getAllDailyReportsWithStats(filters?: {
    companyId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DailyReportWithStats[]> {
    const reports = await this.getDailyReports(filters);
    
    // Get stats for each report
    const reportsWithStats = await Promise.all(
      reports.map(async (report) => {
        const reportDate = new Date(report.date);
        const startDate = new Date(reportDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(reportDate);
        endDate.setHours(23, 59, 59, 999);

        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();

        try {
          // Get sales for the day and calculate stats manually (only sold products)
          const { data: salesData } = await supabase
            .from(TABLES.product_sales)
            .select('*')
            .eq('status', 'sold')
            .eq('company_id', report.companyId)
            .eq('sold_by', report.userId)
            .gte('created_at', startDateStr)
            .lte('created_at', endDateStr);

          const daySales = salesData || [];
          const dailySales = daySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
          const dailySalesCount = daySales.length;

          // Get invoices created on that day
          const invoices = await invoiceService.getInvoices({
            companyId: report.companyId,
            createdBy: report.userId,
          });
          const dayInvoices = invoices.filter(inv => {
            const invDate = new Date(inv.createdAt);
            return invDate >= startDate && invDate <= endDate;
          });
          const invoicesTotal = dayInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

          // Get expenses for the day
          const financialSummary = await financialService.getFinancialSummary({
            userId: report.userId,
            companyId: report.companyId,
            startDate: startDateStr,
            endDate: endDateStr,
          });

          // Get transactions to count expenses
          const transactions = await financialService.getTransactions({
            userId: report.userId,
            companyId: report.companyId,
            startDate: startDateStr,
            endDate: endDateStr,
            type: 'expense',
          });

          return {
            ...report,
            dailySales: dailySales,
            dailySalesCount: dailySalesCount,
            invoicesCreated: dayInvoices.length,
            invoicesTotal: invoicesTotal,
            expenses: financialSummary.totalExpenses,
            expensesCount: transactions.length,
          };
        } catch (error) {
          console.error(`Error fetching stats for report ${report.id}:`, error);
          return {
            ...report,
            dailySales: 0,
            dailySalesCount: 0,
            invoicesCreated: 0,
            invoicesTotal: 0,
            expenses: 0,
            expensesCount: 0,
          };
        }
      })
    );

    return reportsWithStats;
  }

  async getDailyReport(id: string): Promise<DailyReport> {
    const { data: dailyReport, error } = await supabase
      .from(TABLES.daily_reports)
      .select(`
        *,
        user:users(*),
        company:companies(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: dailyReport.id,
      userId: dailyReport.user_id,
      user: dailyReport.user ? mapUserFromDB(dailyReport.user) : undefined,
      companyId: dailyReport.company_id,
      company: dailyReport.company ? {
        id: dailyReport.company.id,
        name: dailyReport.company.name,
        address: dailyReport.company.address,
        phone: dailyReport.company.phone,
        email: dailyReport.company.email,
        isActive: dailyReport.company.is_active,
        createdAt: dailyReport.company.created_at,
        updatedAt: dailyReport.company.updated_at,
      } : undefined,
      date: dailyReport.date,
      summary: dailyReport.summary,
      notes: dailyReport.notes,
      tasks: dailyReport.tasks,
      clientsContacted: dailyReport.clients_contacted,
      quotesSent: dailyReport.quotes_sent,
      salesMade: dailyReport.sales_made,
      followUp: dailyReport.follow_up,
      remark: dailyReport.remark,
      createdAt: dailyReport.created_at,
      updatedAt: dailyReport.updated_at,
    };
  }

  async updateDailyReport(data: UpdateDailyReportData): Promise<DailyReport> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.tasks !== undefined) updateData.tasks = data.tasks;
    if (data.clientsContacted !== undefined) updateData.clients_contacted = data.clientsContacted;
    if (data.quotesSent !== undefined) updateData.quotes_sent = data.quotesSent;
    if (data.salesMade !== undefined) updateData.sales_made = data.salesMade;
    if (data.followUp !== undefined) updateData.follow_up = data.followUp;
    if (data.remark !== undefined) updateData.remark = data.remark;

    const { data: dailyReport, error } = await supabase
      .from(TABLES.daily_reports)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        user:users(*),
        company:companies(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: dailyReport.id,
      userId: dailyReport.user_id,
      user: dailyReport.user ? mapUserFromDB(dailyReport.user) : undefined,
      companyId: dailyReport.company_id,
      company: dailyReport.company ? {
        id: dailyReport.company.id,
        name: dailyReport.company.name,
        address: dailyReport.company.address,
        phone: dailyReport.company.phone,
        email: dailyReport.company.email,
        isActive: dailyReport.company.is_active,
        createdAt: dailyReport.company.created_at,
        updatedAt: dailyReport.company.updated_at,
      } : undefined,
      date: dailyReport.date,
      summary: dailyReport.summary,
      notes: dailyReport.notes,
      tasks: dailyReport.tasks,
      clientsContacted: dailyReport.clients_contacted,
      quotesSent: dailyReport.quotes_sent,
      salesMade: dailyReport.sales_made,
      followUp: dailyReport.follow_up,
      remark: dailyReport.remark,
      createdAt: dailyReport.created_at,
      updatedAt: dailyReport.updated_at,
    };
  }

  async deleteDailyReport(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.daily_reports)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getTodayReport(userId: string): Promise<DailyReport | null> {
    const today = new Date().toISOString().split('T')[0];
    const reports = await this.getDailyReports({
      userId,
      startDate: today,
      endDate: today,
    });

    return reports.length > 0 ? reports[0] : null;
  }
}

export const dailyReportService = new DailyReportService();


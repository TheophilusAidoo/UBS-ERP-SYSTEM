import { supabase, TABLES } from './supabase';
import { Transaction, TransactionType } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateTransactionData {
  companyId?: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
  category?: string;
  date: string;
}

export interface UpdateTransactionData {
  id: string;
  amount?: number;
  description?: string;
  category?: string;
  date?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
}

class FinancialService {
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    const { data: transaction, error } = await supabase
      .from(TABLES.transactions)
      .insert({
        company_id: data.companyId,
        user_id: data.userId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date,
      })
      .select(`
        *,
        company:companies(*),
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: transaction.id,
      companyId: transaction.company_id,
      userId: transaction.user_id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
      createdAt: transaction.created_at,
    };
  }

  async updateTransaction(data: UpdateTransactionData): Promise<Transaction> {
    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = data.date;

    const { data: transaction, error } = await supabase
      .from(TABLES.transactions)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        company:companies(*),
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: transaction.id,
      companyId: transaction.company_id,
      userId: transaction.user_id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
      createdAt: transaction.created_at,
    };
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.transactions).delete().eq('id', id);
    if (error) throw error;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from(TABLES.transactions)
      .select(`
        *,
        company:companies(*),
        user:users(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      type: data.type,
      amount: Number(data.amount),
      description: data.description,
      category: data.category,
      date: data.date,
      createdAt: data.created_at,
    };
  }

  async getTransactions(filters?: {
    companyId?: string;
    userId?: string;
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
  }): Promise<Transaction[]> {
    let query = supabase
      .from(TABLES.transactions)
      .select(`
        *,
        company:companies(*),
        user:users(*)
      `)
      .order('date', { ascending: false })
      .limit(500);

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      companyId: item.company_id,
      userId: item.user_id,
      type: item.type,
      amount: Number(item.amount),
      description: item.description,
      category: item.category,
      date: item.date,
      createdAt: item.created_at,
    }));
  }

  async getFinancialSummary(filters?: {
    companyId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialSummary> {
    const transactions = await this.getTransactions(filters);

    const income = transactions.filter((t) => t.type === 'income');
    const expenses = transactions.filter((t) => t.type === 'expense');

    let transactionIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const transactionExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    // Add product sales as income (ONLY products with status 'sold')
    // Products with status 'pending', 'in-progress', or 'cancelled' are NOT included
    // Money is only added to financial reports when the product status is 'sold'
    let productSalesQuery = supabase
      .from(TABLES.product_sales)
      .select('total_amount, company_id, sold_by, created_at, sold_at')
      .eq('status', 'sold'); // CRITICAL: Only count sold products - pending/in-progress are excluded

    if (filters?.companyId) {
      productSalesQuery = productSalesQuery.eq('company_id', filters.companyId);
    }
    if (filters?.userId) {
      productSalesQuery = productSalesQuery.eq('sold_by', filters.userId);
    }
    if (filters?.startDate) {
      productSalesQuery = productSalesQuery.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      productSalesQuery = productSalesQuery.lte('created_at', filters.endDate);
    }

    const { data: productSales, error: salesError } = await productSalesQuery;
    if (!salesError && productSales) {
      const productSalesIncome = productSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      transactionIncome += productSalesIncome;
    }

    // Add approved/paid invoices as income
    let invoicesQuery = supabase
      .from(TABLES.invoices)
      .select('total, company_id, created_by, status, created_at')
      .in('status', ['approved', 'paid']); // Only approved and paid invoices

    if (filters?.companyId) {
      invoicesQuery = invoicesQuery.eq('company_id', filters.companyId);
    }
    if (filters?.userId) {
      invoicesQuery = invoicesQuery.eq('created_by', filters.userId);
    }
    if (filters?.startDate) {
      invoicesQuery = invoicesQuery.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      invoicesQuery = invoicesQuery.lte('created_at', filters.endDate);
    }

    const { data: approvedInvoices, error: invoicesError } = await invoicesQuery;
    if (!invoicesError && approvedInvoices) {
      const invoiceIncome = approvedInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      transactionIncome += invoiceIncome;
    }

    return {
      totalIncome: transactionIncome,
      totalExpenses: transactionExpenses,
      netProfit: transactionIncome - transactionExpenses,
      incomeCount: income.length + (productSales?.length || 0) + (approvedInvoices?.length || 0),
      expenseCount: expenses.length,
    };
  }
}

export const financialService = new FinancialService();



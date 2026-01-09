import { supabase, TABLES } from './supabase';
import { ProductSale, SaleStatus } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateSaleData {
  productId: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

export interface UpdateSaleData {
  id: string;
  status?: SaleStatus;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  notes?: string;
}

class SalesService {
  async createSale(data: CreateSaleData, userId: string, companyId: string): Promise<ProductSale> {
    // Validate required fields
    if (!userId || !companyId) {
      throw new Error('User ID and Company ID are required to create a sale');
    }

    if (!data.productId || !data.clientName) {
      throw new Error('Product ID and client name are required');
    }

    console.log('Creating sale with data:', {
      productId: data.productId,
      userId,
      companyId,
      clientName: data.clientName,
    });

    const { data: sale, error } = await supabase
      .from(TABLES.product_sales)
      .insert({
        product_id: data.productId,
        sold_by: userId,
        company_id: companyId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_address: data.clientAddress,
        client_phone: data.clientPhone,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        total_amount: data.totalAmount,
        status: 'pending',
        notes: data.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sale:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to create sale: ${error.message}`);
    }

    if (!sale) {
      throw new Error('Sale was not created. No data returned from database.');
    }

    // Update product quantity (decrease by the sold quantity)
    const { data: product } = await supabase
      .from(TABLES.products)
      .select('quantity')
      .eq('id', data.productId)
      .single();

    if (product) {
      const newQuantity = Math.max(0, Number(product.quantity) - data.quantity);
      await supabase
        .from(TABLES.products)
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', data.productId);
    }

    return this.mapSaleFromDB(sale);
  }

  async updateSale(data: UpdateSaleData): Promise<ProductSale> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'sold') {
        updateData.sold_at = new Date().toISOString();
      }
    }
    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientEmail !== undefined) updateData.client_email = data.clientEmail;
    if (data.clientAddress !== undefined) updateData.client_address = data.clientAddress;
    if (data.clientPhone !== undefined) updateData.client_phone = data.clientPhone;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: sale, error } = await supabase
      .from(TABLES.product_sales)
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw error;
    return this.mapSaleFromDB(sale);
  }

  async deleteSale(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.product_sales).delete().eq('id', id);
    if (error) throw error;
  }

  async getSale(id: string): Promise<ProductSale> {
    const { data: sale, error } = await supabase
      .from(TABLES.product_sales)
      .select(`
        *,
        product:products!product_sales_product_id_fkey(id, name, image, price),
        sold_by_user:users!product_sales_sold_by_fkey(id, email, first_name, last_name, role),
        company:companies!product_sales_company_id_fkey(id, name, logo)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapSaleFromDB(sale);
  }

  async getSales(filters?: {
    companyId?: string;
    soldBy?: string;
    status?: SaleStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<ProductSale[]> {
    let query = supabase
      .from(TABLES.product_sales)
      .select(`
        *,
        product:products!product_sales_product_id_fkey(id, name, image, price, size, color, reference_number, car_number),
        sold_by_user:users!product_sales_sold_by_fkey(id, email, first_name, last_name, role),
        company:companies!product_sales_company_id_fkey(id, name, logo)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.soldBy) {
      query = query.eq('sold_by', filters.soldBy);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data: sales, error } = await query;

    if (error) throw error;
    return (sales || []).map((s) => this.mapSaleFromDB(s));
  }

  async getSalesStats(filters?: {
    companyId?: string;
    soldBy?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalSales: number;
    totalRevenue: number;
    todaySales: number;
    todayRevenue: number;
    monthlySales: number;
    monthlyRevenue: number;
    staffStats: Array<{
      staffId: string;
      staffName: string;
      salesCount: number;
      revenue: number;
    }>;
  }> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    // Get ONLY sales with status='sold' (money should only be counted when product is sold)
    let query = supabase
      .from(TABLES.product_sales)
      .select('*')
      .eq('status', 'sold'); // Only count sold products

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.soldBy) {
      query = query.eq('sold_by', filters.soldBy);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data: allSales, error } = await query;

    if (error) throw error;

    const sales = allSales || [];
    
    // Filter by date for today - use sold_at if available (when product was actually sold), otherwise created_at
    // Only include sales that occurred TODAY
    const todaySales = sales.filter((s) => {
      const saleDate = s.sold_at || s.created_at;
      if (!saleDate) return false;
      const saleDateObj = new Date(saleDate);
      return saleDateObj >= today && saleDateObj <= todayEnd;
    });
    
    // Filter by date for monthly - use sold_at if available, otherwise created_at
    // Only include sales that occurred THIS MONTH
    const monthlySales = sales.filter((s) => {
      const saleDate = s.sold_at || s.created_at;
      if (!saleDate) return false;
      const saleDateObj = new Date(saleDate);
      return saleDateObj >= monthStart && saleDateObj <= now;
    });

    // Calculate totals (only sold products)
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const todaySalesCount = todaySales.length;
    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const monthlySalesCount = monthlySales.length;
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

    // Staff stats
    const staffMap = new Map<string, { salesCount: number; revenue: number }>();
    sales.forEach((sale) => {
      const staffId = sale.sold_by;
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, { salesCount: 0, revenue: 0 });
      }
      const stats = staffMap.get(staffId)!;
      stats.salesCount += 1;
      stats.revenue += Number(sale.total_amount || 0);
    });

    // Get staff names
    const staffIds = Array.from(staffMap.keys());
    const { data: staff } = await supabase
      .from(TABLES.users)
      .select('id, first_name, last_name')
      .in('id', staffIds);

    const staffStats = Array.from(staffMap.entries()).map(([staffId, stats]) => {
      const staffMember = staff?.find((s) => s.id === staffId);
      return {
        staffId,
        staffName: staffMember
          ? `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        salesCount: stats.salesCount,
        revenue: stats.revenue,
      };
    });

    // Sort by revenue descending
    staffStats.sort((a, b) => b.revenue - a.revenue);

    return {
      totalSales,
      totalRevenue,
      todaySales: todaySalesCount,
      todayRevenue,
      monthlySales: monthlySalesCount,
      monthlyRevenue,
      staffStats,
    };
  }

  private mapSaleFromDB(sale: any): ProductSale {
    return {
      id: sale.id,
      productId: sale.product_id,
      soldBy: sale.sold_by,
      companyId: sale.company_id,
      clientName: sale.client_name,
      clientEmail: sale.client_email,
      clientAddress: sale.client_address,
      clientPhone: sale.client_phone,
      quantity: Number(sale.quantity),
      unitPrice: Number(sale.unit_price),
      totalAmount: Number(sale.total_amount),
      status: sale.status,
      soldAt: sale.sold_at,
      notes: sale.notes,
      createdAt: sale.created_at,
      updatedAt: sale.updated_at,
      product: sale.product
        ? {
            id: sale.product.id,
            companyId: '',
            createdBy: '',
            name: sale.product.name,
            image: sale.product.image,
            price: sale.product.price ? Number(sale.product.price) : undefined,
            size: sale.product.size,
            color: sale.product.color,
            referenceNumber: sale.product.reference_number,
            carNumber: sale.product.car_number,
            quantity: 0,
            status: 'available',
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      soldByUser: sale.sold_by_user ? mapUserFromDB(sale.sold_by_user) : undefined,
      company: sale.company
        ? {
            id: sale.company.id,
            name: sale.company.name,
            logo: sale.company.logo,
            isActive: true,
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
    };
  }
}

export const salesService = new SalesService();



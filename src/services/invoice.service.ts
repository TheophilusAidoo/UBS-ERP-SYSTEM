import { supabase, TABLES } from './supabase';
import { Invoice, InvoiceItem, InvoiceStatus } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateInvoiceData {
  companyId: string;
  createdBy: string;
  clientName: string;
  clientEmail: string;
  clientNumber?: string;
  clientCountry?: string;
  invoiceNumber: string;
  items: Omit<InvoiceItem, 'id'>[];
  subtotal: number;
  tax?: number;
  total: number;
  dueDate?: string;
  currency?: string; // Currency code (e.g., 'USD', 'AED', 'EUR')
}

export interface UpdateInvoiceData {
  id: string;
  clientName?: string;
  clientEmail?: string;
  clientNumber?: string;
  clientCountry?: string;
  items?: Omit<InvoiceItem, 'id'>[];
  subtotal?: number;
  tax?: number;
  total?: number;
  dueDate?: string;
  status?: InvoiceStatus;
  signature?: string;
  signedBy?: string;
  signedAt?: string;
  currency?: string; // Currency code (e.g., 'USD', 'AED', 'EUR')
}

export interface UpdateInvoiceStatusData {
  id: string;
  status: InvoiceStatus;
  updatedBy?: string;
}

class InvoiceService {
  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    // Validate required UUID fields are not empty strings
    if (!data.companyId || typeof data.companyId !== 'string' || data.companyId.trim() === '') {
      throw new Error('Company ID is required and must be a valid UUID');
    }
    if (!data.createdBy || typeof data.createdBy !== 'string' || data.createdBy.trim() === '') {
      throw new Error('Created By user ID is required and must be a valid UUID');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.companyId.trim())) {
      throw new Error('Invalid Company ID format. Must be a valid UUID.');
    }
    if (!uuidRegex.test(data.createdBy.trim())) {
      throw new Error('Invalid Created By user ID format. Must be a valid UUID.');
    }
    
    // Check if client exists by email
    let clientId: string | null = null;
    const { data: existingClient } = await supabase
      .from(TABLES.clients)
      .select('id')
      .eq('email', data.clientEmail)
      .maybeSingle();
    
    if (existingClient && existingClient.id && typeof existingClient.id === 'string' && existingClient.id.trim() !== '') {
      clientId = existingClient.id.trim();
    }

    let invoiceNumber = data.invoiceNumber;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from(TABLES.invoices)
        .insert({
          company_id: data.companyId.trim(), // Already validated above
          created_by: data.createdBy.trim(), // Already validated above
          client_id: (clientId && clientId.trim() !== '') ? clientId.trim() : null,
          client_name: data.clientName,
          client_email: data.clientEmail,
          client_number: (data.clientNumber && data.clientNumber.trim() !== '') ? data.clientNumber.trim() : null,
          client_country: (data.clientCountry && data.clientCountry.trim() !== '') ? data.clientCountry.trim() : null,
          invoice_number: invoiceNumber,
          subtotal: data.subtotal,
          tax: data.tax || 0,
          total: data.total,
          due_date: (data.dueDate && data.dueDate.trim() !== '') ? data.dueDate.trim() : null,
          currency: (data.currency && data.currency.trim() !== '') ? data.currency.trim() : null,
          status: 'draft',
        })
        .select()
        .single();

      // If successful, create invoice items and return
      if (!invoiceError) {
        // Create invoice items
        if (data.items && data.items.length > 0) {
          const itemsToInsert = data.items.map((item) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total,
          }));

          const { error: itemsError } = await supabase.from(TABLES.invoice_items).insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }

        // Fetch complete invoice with items
        return this.getInvoice(invoice.id);
      }

      // If it's a duplicate key error, regenerate invoice number and retry
      if (invoiceError.code === '23505' && invoiceError.message?.includes('invoice_number')) {
        retries++;
        // Regenerate invoice number
        invoiceNumber = await this.generateInvoiceNumber();
        continue;
      }

      // If it's a different error, throw it
      throw invoiceError;
    }

    // If we've exhausted retries, throw an error
    throw new Error('Failed to create invoice: Unable to generate unique invoice number after multiple attempts');
  }

  async updateInvoice(data: UpdateInvoiceData): Promise<Invoice> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientEmail !== undefined) updateData.client_email = data.clientEmail;
    if (data.clientNumber !== undefined) updateData.client_number = (data.clientNumber && data.clientNumber.trim() !== '') ? data.clientNumber.trim() : null;
    if (data.clientCountry !== undefined) updateData.client_country = (data.clientCountry && data.clientCountry.trim() !== '') ? data.clientCountry.trim() : null;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.dueDate !== undefined) updateData.due_date = (data.dueDate && data.dueDate.trim() !== '') ? data.dueDate.trim() : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currency !== undefined) updateData.currency = (data.currency && data.currency.trim() !== '') ? data.currency.trim() : null;

    const { error: updateError } = await supabase.from(TABLES.invoices).update(updateData).eq('id', data.id);
    if (updateError) throw updateError;

    // Update items if provided
    if (data.items) {
      // Delete existing items
      await supabase.from(TABLES.invoice_items).delete().eq('invoice_id', data.id);

      // Insert new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          invoice_id: data.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
        }));

        const { error: itemsError } = await supabase.from(TABLES.invoice_items).insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
    }

    return this.getInvoice(data.id);
  }

  async updateInvoiceStatus(data: UpdateInvoiceStatusData): Promise<Invoice> {
    const updateData: any = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    } else if (data.status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: invoice, error } = await supabase
      .from(TABLES.invoices)
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw error;

    return this.getInvoice(data.id);
  }

  async deleteInvoice(id: string): Promise<void> {
    // Items will be deleted automatically due to CASCADE
    const { error } = await supabase.from(TABLES.invoices).delete().eq('id', id);
    if (error) throw error;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const { data: invoice, error: invoiceError } = await supabase
      .from(TABLES.invoices)
      .select()
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;

    const { data: items, error: itemsError } = await supabase
      .from(TABLES.invoice_items)
      .select()
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    return {
      id: invoice.id,
      companyId: invoice.company_id,
      createdBy: invoice.created_by,
      clientId: invoice.client_id,
      clientName: invoice.client_name,
      clientEmail: invoice.client_email,
      clientNumber: invoice.client_number,
      clientCountry: invoice.client_country,
      invoiceNumber: invoice.invoice_number,
      items: (items || []).map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        total: Number(item.total),
      })),
      subtotal: Number(invoice.subtotal),
      tax: invoice.tax ? Number(invoice.tax) : undefined,
      total: Number(invoice.total),
      status: invoice.status,
      dueDate: invoice.due_date,
      sentAt: invoice.sent_at,
      paidAt: invoice.paid_at,
      signature: invoice.signature,
      signedBy: invoice.signed_by,
      signedAt: invoice.signed_at,
      currency: invoice.currency,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    };
  }

  async getInvoices(filters?: {
    companyId?: string;
    createdBy?: string;
    status?: InvoiceStatus;
  }): Promise<Invoice[]> {
    let query = supabase.from(TABLES.invoices).select().order('created_at', { ascending: false }).limit(500);

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.clientEmail) {
      query = query.eq('client_email', filters.clientEmail);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;

    // Fetch items for each invoice
    const invoicesWithItems = await Promise.all(
      (invoices || []).map(async (invoice) => {
        const { data: items } = await supabase
          .from(TABLES.invoice_items)
          .select()
          .eq('invoice_id', invoice.id)
          .order('created_at', { ascending: true });

        return {
          id: invoice.id,
          companyId: invoice.company_id,
          createdBy: invoice.created_by,
          clientId: invoice.client_id,
          clientName: invoice.client_name,
          clientEmail: invoice.client_email,
          clientNumber: invoice.client_number,
          clientCountry: invoice.client_country,
          invoiceNumber: invoice.invoice_number,
          items: (items || []).map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            total: Number(item.total),
          })),
          subtotal: Number(invoice.subtotal),
          tax: invoice.tax ? Number(invoice.tax) : undefined,
          total: Number(invoice.total),
          status: invoice.status,
          dueDate: invoice.due_date,
          sentAt: invoice.sent_at,
          paidAt: invoice.paid_at,
          signature: invoice.signature,
          signedBy: invoice.signed_by,
          signedAt: invoice.signed_at,
          currency: invoice.currency,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at,
        };
      })
    );

    return invoicesWithItems;
  }

  async generateInvoiceNumber(): Promise<string> {
    // Generate invoice number: INV-YYYYMMDD-XXXX
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `INV-${year}${month}${day}-`;

    // Retry logic to handle race conditions
    const maxRetries = 10;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Get count of invoices with same prefix
      const { count } = await supabase
        .from(TABLES.invoices)
        .select('*', { count: 'exact', head: true })
        .like('invoice_number', `${prefix}%`);

      // Generate sequence number with microsecond-based offset for uniqueness
      const baseSequence = (count || 0) + 1;
      // Use microsecond timestamp component to ensure uniqueness in race conditions
      const microsecondOffset = attempt > 0 ? Math.floor((Date.now() % 1000) / 10) : 0;
      const sequence = String(baseSequence + microsecondOffset).padStart(4, '0');
      const invoiceNumber = `${prefix}${sequence}`;

      // Check if this invoice number already exists
      const { data: existing, error: checkError } = await supabase
        .from(TABLES.invoices)
        .select('id')
        .eq('invoice_number', invoiceNumber)
        .limit(1)
        .maybeSingle();

      // If checkError is not a "not found" error, something went wrong
      if (checkError && checkError.code !== 'PGRST116') {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }

      // If it doesn't exist, return it
      if (!existing) {
        return invoiceNumber;
      }

      // If it exists, wait a bit and try again with a higher sequence
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
    }

    // Fallback: use timestamp-based number to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
}

export const invoiceService = new InvoiceService();


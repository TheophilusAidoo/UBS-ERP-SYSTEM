import { supabase } from './supabase';
import { Delivery, DeliveryItem, DeliveryType, DeliveryStatus } from '../types';

const TABLES = {
  deliveries: 'deliveries',
} as const;

export interface UploadDeliveryItemImageData {
  file: File;
  deliveryId?: string;
  itemIndex?: number;
}

export interface CreateDeliveryData {
  companyId: string;
  createdBy: string;
  deliveryType: DeliveryType;
  date: string;
  clientName: string; // Maps to sender_name in UI
  clientNumber?: string;
  senderPhone?: string;
  items: DeliveryItem[];
  sizeKgVolume?: string;
  departure: 'Dubai' | 'China';
  destination: string;
  receiverDetails?: string;
  estimateArrivalDate?: string;
}

export interface UpdateDeliveryData {
  date?: string;
  clientName?: string;
  clientNumber?: string;
  senderPhone?: string;
  items?: DeliveryItem[];
  sizeKgVolume?: string;
  departure?: 'Dubai' | 'China';
  destination?: string;
  receiverDetails?: string;
  estimateArrivalDate?: string;
  status?: DeliveryStatus;
}

class DeliveryService {
  private mapDeliveryFromDB(delivery: any): Delivery {
    return {
      id: delivery.id,
      companyId: delivery.company_id,
      createdBy: delivery.created_by,
      deliveryType: delivery.delivery_type,
      date: delivery.date,
      clientName: delivery.client_name,
      clientNumber: delivery.client_number,
      senderPhone: delivery.sender_phone,
      items: Array.isArray(delivery.items) ? delivery.items : [],
      sizeKgVolume: delivery.size_kg_volume,
      departure: delivery.departure,
      destination: delivery.destination,
      receiverDetails: delivery.receiver_details,
      estimateArrivalDate: delivery.estimate_arrival_date,
      status: delivery.status,
      createdAt: delivery.created_at,
      updatedAt: delivery.updated_at,
      company: delivery.company ? {
        id: delivery.company.id,
        name: delivery.company.name,
        address: delivery.company.address,
        phone: delivery.company.phone,
        email: delivery.company.email,
        logo: delivery.company.logo,
        isActive: delivery.company.is_active,
        createdAt: delivery.company.created_at,
        updatedAt: delivery.company.updated_at,
      } : undefined,
      createdByUser: delivery.created_by_user ? {
        id: delivery.created_by_user.id,
        email: delivery.created_by_user.email,
        role: delivery.created_by_user.role,
        companyId: delivery.created_by_user.company_id,
        firstName: delivery.created_by_user.first_name,
        lastName: delivery.created_by_user.last_name,
        avatar: delivery.created_by_user.avatar,
        jobTitle: delivery.created_by_user.job_title,
        isSubAdmin: delivery.created_by_user.is_sub_admin,
        createdAt: delivery.created_by_user.created_at,
        updatedAt: delivery.created_by_user.updated_at,
      } : undefined,
    };
  }

  async createDelivery(data: CreateDeliveryData): Promise<Delivery> {
    const { data: delivery, error } = await supabase
      .from(TABLES.deliveries)
      .insert({
        company_id: data.companyId,
        created_by: data.createdBy,
        delivery_type: data.deliveryType,
        date: data.date,
        client_name: data.clientName,
        client_number: data.clientNumber,
        sender_phone: data.senderPhone,
        items: data.items,
        size_kg_volume: data.sizeKgVolume,
        departure: data.departure,
        destination: data.destination,
        receiver_details: data.receiverDetails,
        estimate_arrival_date: data.estimateArrivalDate,
        status: 'pending',
      })
      .select(`
        *,
        company:companies(*),
        created_by_user:users(*)
      `)
      .single();

    if (error) throw error;
    return this.mapDeliveryFromDB(delivery);
  }

  async updateDelivery(id: string, data: UpdateDeliveryData): Promise<Delivery> {
    const updateData: any = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientNumber !== undefined) updateData.client_number = data.clientNumber;
    if (data.senderPhone !== undefined) updateData.sender_phone = data.senderPhone;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.sizeKgVolume !== undefined) updateData.size_kg_volume = data.sizeKgVolume;
    if (data.departure !== undefined) updateData.departure = data.departure;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.receiverDetails !== undefined) updateData.receiver_details = data.receiverDetails;
    if (data.estimateArrivalDate !== undefined) updateData.estimate_arrival_date = data.estimateArrivalDate;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: delivery, error } = await supabase
      .from(TABLES.deliveries)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company:companies(*),
        created_by_user:users(*)
      `)
      .single();

    if (error) throw error;
    return this.mapDeliveryFromDB(delivery);
  }

  async getDelivery(id: string): Promise<Delivery> {
    const { data: delivery, error } = await supabase
      .from(TABLES.deliveries)
      .select(`
        *,
        company:companies(*),
        created_by_user:users(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapDeliveryFromDB(delivery);
  }

  async getDeliveries(filters?: {
    companyId?: string;
    createdBy?: string;
    deliveryType?: DeliveryType;
    status?: DeliveryStatus;
  }): Promise<Delivery[]> {
    let query = supabase
      .from(TABLES.deliveries)
      .select(`
        *,
        company:companies(*),
        created_by_user:users(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.deliveryType) {
      query = query.eq('delivery_type', filters.deliveryType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: deliveries, error } = await query;
    if (error) throw error;
    return deliveries.map((d) => this.mapDeliveryFromDB(d));
  }

  async deleteDelivery(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.deliveries)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async uploadItemImage(data: UploadDeliveryItemImageData): Promise<string> {
    const fileExt = data.file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `delivery-item-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `delivery-items/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, data.file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    if (!uploadData) {
      throw new Error('Upload succeeded but no data returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    return urlData.publicUrl;
  }
}

export const deliveryService = new DeliveryService();


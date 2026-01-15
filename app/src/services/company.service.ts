import { supabase, TABLES } from './supabase';
import { Company } from '../types';

export interface CreateCompanyData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  taxId?: string;
  isActive?: boolean;
}

export interface UpdateCompanyData {
  id: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  taxId?: string;
  isActive?: boolean;
}

export interface UploadCompanyLogoData {
  companyId: string;
  file: File;
}

class CompanyService {
  async uploadLogo(data: UploadCompanyLogoData): Promise<string> {
    const fileExt = data.file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${data.companyId}-${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, data.file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload logo: ${uploadError.message}`);
    }

    if (!uploadData) {
      throw new Error('Upload succeeded but no data returned');
    }

    // Get public URL - ensure we use the correct path
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded logo');
    }

    console.log('Logo uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  }

  async deleteLogo(logoUrl: string): Promise<void> {
    if (!logoUrl) return;
    
    try {
      // Extract the file path from the URL
      const urlParts = logoUrl.split('/company-assets/');
      if (urlParts.length < 2) {
        console.warn('Invalid logo URL format:', logoUrl);
        return;
      }
      
      const filePath = urlParts[1].split('?')[0]; // Remove query params if any
      
      const { error } = await supabase.storage
        .from('company-assets')
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting logo:', error);
        // Don't throw - logo deletion is not critical
      }
    } catch (err) {
      console.error('Error in deleteLogo:', err);
      // Don't throw - logo deletion is not critical
    }
  }

  async createCompany(data: CreateCompanyData): Promise<Company> {
    const { data: company, error } = await supabase
      .from(TABLES.companies)
      .insert({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        website: data.website,
        tax_id: data.taxId,
        is_active: data.isActive !== undefined ? data.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: company.id,
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      logo: company.logo,
      website: company.website,
      taxId: company.tax_id || company.taxId,
      isActive: company.is_active,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
    };
  }

  async updateCompany(data: UpdateCompanyData): Promise<Company> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    // Handle logo: if explicitly set to null/empty, set it to null, otherwise use the value
    if (data.logo !== undefined) {
      updateData.logo = data.logo && data.logo.trim() !== '' ? data.logo : null;
    }
    if (data.website !== undefined) updateData.website = data.website;
    if (data.taxId !== undefined) updateData.tax_id = data.taxId;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    updateData.updated_at = new Date().toISOString();

    const { data: company, error } = await supabase
      .from(TABLES.companies)
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: company.id,
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      logo: company.logo,
      website: company.website,
      taxId: company.tax_id || company.taxId,
      isActive: company.is_active,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
    };
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.companies).delete().eq('id', id);
    if (error) throw error;
  }

  async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from(TABLES.companies)
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getAllCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from(TABLES.companies)
      .select()
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      address: item.address,
      phone: item.phone,
      email: item.email,
      logo: item.logo,
      website: item.website,
      taxId: item.tax_id || item.taxId,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }
}

export const companyService = new CompanyService();


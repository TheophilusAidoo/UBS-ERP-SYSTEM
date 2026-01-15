import { supabase, TABLES } from './supabase';
import { Product, ProductStatus } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateProductData {
  companyId: string;
  name: string;
  description?: string;
  image?: string;
  size?: string;
  color?: string;
  referenceNumber?: string;
  carNumber?: string;
  quantity: number;
  // Price is deprecated but kept for backward compatibility
  price?: number;
}

export interface UpdateProductData {
  id: string;
  name?: string;
  description?: string;
  image?: string;
  size?: string;
  color?: string;
  referenceNumber?: string;
  carNumber?: string;
  quantity?: number;
  status?: ProductStatus;
  // Price is deprecated but kept for backward compatibility
  price?: number;
}

class ProductService {
  async createProduct(data: CreateProductData, userId: string): Promise<Product> {
    const insertData: any = {
      company_id: data.companyId,
      created_by: userId,
      name: data.name,
      quantity: data.quantity,
      status: 'available',
    };
    
    if (data.description) insertData.description = data.description;
    if (data.image) insertData.image = data.image;
    if (data.size) insertData.size = data.size;
    if (data.color) insertData.color = data.color;
    if (data.referenceNumber) insertData.reference_number = data.referenceNumber;
    if (data.carNumber) insertData.car_number = data.carNumber;
    if (data.price !== undefined) insertData.price = data.price; // Optional for backward compatibility
    
    const { data: product, error } = await supabase
      .from(TABLES.products)
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return this.mapProductFromDB(product);
  }

  async updateProduct(data: UpdateProductData): Promise<Product> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.size !== undefined) updateData.size = data.size;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.referenceNumber !== undefined) updateData.reference_number = data.referenceNumber;
    if (data.carNumber !== undefined) updateData.car_number = data.carNumber;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.price !== undefined) updateData.price = data.price; // Optional for backward compatibility

    const { data: product, error } = await supabase
      .from(TABLES.products)
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw error;
    return this.mapProductFromDB(product);
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.products).delete().eq('id', id);
    if (error) throw error;
  }

  async getProduct(id: string): Promise<Product> {
    const { data: product, error } = await supabase
      .from(TABLES.products)
      .select(`
        *,
        created_by_user:users!products_created_by_fkey(id, email, first_name, last_name, role),
        company:companies!products_company_id_fkey(id, name, logo)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapProductFromDB(product);
  }

  async getProducts(filters?: {
    companyId?: string;
    createdBy?: string;
    status?: ProductStatus;
  }): Promise<Product[]> {
    let query = supabase
      .from(TABLES.products)
      .select(`
        *,
        created_by_user:users!products_created_by_fkey(id, email, first_name, last_name, role),
        company:companies!products_company_id_fkey(id, name, logo)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: products, error } = await query;

    if (error) throw error;
    return (products || []).map((p) => this.mapProductFromDB(p));
  }

  private mapProductFromDB(product: any): Product {
    return {
      id: product.id,
      companyId: product.company_id,
      createdBy: product.created_by,
      name: product.name,
      description: product.description,
      image: product.image,
      size: product.size,
      color: product.color,
      referenceNumber: product.reference_number,
      carNumber: product.car_number,
      quantity: Number(product.quantity),
      status: product.status,
      price: product.price !== null && product.price !== undefined ? Number(product.price) : undefined,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      createdByUser: product.created_by_user ? mapUserFromDB(product.created_by_user) : undefined,
      company: product.company ? {
        id: product.company.id,
        name: product.company.name,
        logo: product.company.logo,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    };
  }
}

export const productService = new ProductService();



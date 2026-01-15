import { supabase, TABLES } from './supabase';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface CreateAuditLogData {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  async createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
    const { data: log, error } = await supabase
      .from(TABLES.audit_logs)
      .insert({
        user_id: data.userId || null,
        action: data.action,
        entity_type: data.entityType || null,
        entity_id: data.entityId || null,
        changes: data.changes || null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: log.id,
      userId: log.user_id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      changes: log.changes,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    };
  }

  async getAuditLogs(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    let query = supabase
      .from(TABLES.audit_logs)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(1000); // Default limit
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((log) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      changes: log.changes,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    }));
  }

  async getAuditLog(id: string): Promise<AuditLog> {
    const { data: log, error } = await supabase
      .from(TABLES.audit_logs)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: log.id,
      userId: log.user_id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      changes: log.changes,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    };
  }

  // Helper method to log common actions
  async logAction(
    action: string,
    entityType?: string,
    entityId?: string,
    changes?: Record<string, any>
  ): Promise<void> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const userAgent = navigator.userAgent;
      
      await this.createAuditLog({
        userId: userId || undefined,
        action,
        entityType,
        entityId,
        changes,
        userAgent,
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to create audit log:', error);
    }
  }
}

export const auditService = new AuditService();



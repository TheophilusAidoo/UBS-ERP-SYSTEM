import { supabase, TABLES } from './supabase';
import { Project, ProjectStatus, User } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateProjectData {
  companyId: string;
  clientId?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  assignedTo?: string[];
  createdBy?: string; // User ID of the creator - will be auto-assigned if provided
}

export interface UpdateProjectData {
  id: string;
  clientId?: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  assignedTo?: string[];
}

class ProjectService {
  async createProject(data: CreateProjectData): Promise<Project> {
    // Create project
    const insertData: any = {
      company_id: data.companyId,
      name: data.name,
      description: data.description,
      status: data.status || 'planning',
      start_date: data.startDate,
      end_date: data.endDate,
      budget: data.budget,
    };
    
    if (data.clientId) {
      insertData.client_id = data.clientId;
    }
    
    const { data: project, error: projectError } = await supabase
      .from(TABLES.projects)
      .insert(insertData)
      .select('*')
      .single();

    if (projectError) throw projectError;

    // Collect all users to assign (including creator if provided)
    const usersToAssign = new Set<string>();
    
    // Auto-assign creator if provided (ensures staff can see projects they create)
    if (data.createdBy) {
      usersToAssign.add(data.createdBy);
    }
    
    // Add any explicitly assigned users
    if (data.assignedTo && data.assignedTo.length > 0) {
      data.assignedTo.forEach(userId => usersToAssign.add(userId));
    }

    // Assign users if any
    if (usersToAssign.size > 0) {
      const assignments = Array.from(usersToAssign).map(userId => ({
        project_id: project.id,
        user_id: userId,
      }));

      const { error: assignmentError } = await supabase
        .from(TABLES.project_assignments)
        .insert(assignments);

      if (assignmentError) {
        console.error('Error assigning users to project:', assignmentError);
        // Continue even if assignment fails
      }
    }

    // Fetch project with assignments
    return await this.getProjectById(project.id);
  }

  async getProjectById(id: string): Promise<Project> {
    const { data: project, error } = await supabase
      .from(TABLES.projects)
      .select(`
        *,
        company:companies(*),
        client:clients(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Fetch assigned users
    const { data: assignments } = await supabase
      .from(TABLES.project_assignments)
      .select(`
        user_id,
        user:users(*)
      `)
      .eq('project_id', id);

    const assignedUsers: User[] = (assignments || [])
      .map((a: any) => a.user ? mapUserFromDB(a.user) : null)
      .filter((u: User | null): u is User => u !== null);

    return {
      id: project.id,
      companyId: project.company_id,
      clientId: project.client_id,
      name: project.name,
      description: project.description,
      assignedTo: assignedUsers.map(u => u.id),
      assignedUsers,
      status: project.status,
      startDate: project.start_date,
      endDate: project.end_date,
      budget: project.budget,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      client: project.client ? {
        id: project.client.id,
        companyId: project.client.company_id,
        createdBy: project.client.created_by,
        name: project.client.name,
        email: project.client.email,
        phone: project.client.phone,
        address: project.client.address,
        contactPerson: project.client.contact_person,
        notes: project.client.notes,
        isActive: project.client.is_active,
        createdAt: project.client.created_at,
        updatedAt: project.client.updated_at,
      } : undefined,
    };
  }

  async getProjects(filters?: { companyId?: string; clientId?: string; status?: ProjectStatus; userId?: string }): Promise<Project[]> {
    let query = supabase
      .from(TABLES.projects)
      .select(`
        *,
        company:companies(*),
        client:clients(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    // If filtering by userId, get projects where user is assigned
    let filteredProjects = projects || [];
    if (filters?.userId) {
      const { data: assignments } = await supabase
        .from(TABLES.project_assignments)
        .select('project_id')
        .eq('user_id', filters.userId);

      const assignedProjectIds = new Set((assignments || []).map((a: any) => a.project_id));
      filteredProjects = filteredProjects.filter((p: any) => assignedProjectIds.has(p.id));
    }

    // Fetch assignments for each project
    const projectsWithAssignments = await Promise.all(
      filteredProjects.map(async (project: any) => {
        const { data: assignments } = await supabase
          .from(TABLES.project_assignments)
          .select(`
            user_id,
            user:users(*)
          `)
          .eq('project_id', project.id);

        const assignedUsers: User[] = (assignments || [])
          .map((a: any) => a.user ? mapUserFromDB(a.user) : null)
          .filter((u: User | null): u is User => u !== null);

        return {
          id: project.id,
          companyId: project.company_id,
          clientId: project.client_id,
          name: project.name,
          description: project.description,
          assignedTo: assignedUsers.map(u => u.id),
          assignedUsers,
          status: project.status,
          startDate: project.start_date,
          endDate: project.end_date,
          budget: project.budget,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          client: project.client ? {
            id: project.client.id,
            companyId: project.client.company_id,
            createdBy: project.client.created_by,
            name: project.client.name,
            email: project.client.email,
            phone: project.client.phone,
            address: project.client.address,
            contactPerson: project.client.contact_person,
            notes: project.client.notes,
            isActive: project.client.is_active,
            createdAt: project.client.created_at,
            updatedAt: project.client.updated_at,
          } : undefined,
        };
      })
    );

    return projectsWithAssignments;
  }

  async updateProject(data: UpdateProjectData): Promise<Project> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.clientId !== undefined) updateData.client_id = data.clientId || null;

    const { error } = await supabase
      .from(TABLES.projects)
      .update(updateData)
      .eq('id', data.id);

    if (error) throw error;

    // Update assignments if provided
    if (data.assignedTo !== undefined) {
      // Delete existing assignments
      await supabase
        .from(TABLES.project_assignments)
        .delete()
        .eq('project_id', data.id);

      // Create new assignments
      if (data.assignedTo.length > 0) {
        const assignments = data.assignedTo.map(userId => ({
          project_id: data.id,
          user_id: userId,
        }));

        const { error: assignmentError } = await supabase
          .from(TABLES.project_assignments)
          .insert(assignments);

        if (assignmentError) {
          console.error('Error updating project assignments:', assignmentError);
        }
      }
    }

    return await this.getProjectById(data.id);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.projects)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const projectService = new ProjectService();



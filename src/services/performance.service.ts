import { supabase, TABLES } from './supabase';
import { KPI, Goal, PerformanceReview, GoalType, ReviewCycle } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateKPIData {
  category: string;
  name: string;
  description?: string;
  unit?: string;
  target?: number;
}

export interface CreateGoalData {
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  targetValue?: number;
  currentValue?: number;
  startDate: string;
  endDate: string;
}

export interface UpdateGoalData {
  id: string;
  title?: string;
  description?: string;
  type?: GoalType;
  targetValue?: number;
  currentValue?: number;
  startDate?: string;
  endDate?: string;
  status?: 'not-started' | 'in-progress' | 'completed' | 'cancelled';
}

export interface CreatePerformanceReviewData {
  userId: string;
  reviewedBy: string;
  cycle: ReviewCycle;
  period: string;
  ratings: {
    category: string;
    score: number;
    maxScore: number;
    feedback?: string;
  }[];
  overallRating?: number;
  feedback?: string;
  competencies?: {
    name: string;
    level: number;
    notes?: string;
  }[];
}

export interface UpdatePerformanceReviewData {
  id: string;
  ratings?: {
    category: string;
    score: number;
    maxScore: number;
    feedback?: string;
  }[];
  overallRating?: number;
  feedback?: string;
  competencies?: {
    name: string;
    level: number;
    notes?: string;
  }[];
}

class PerformanceService {
  // KPI Methods
  async createKPI(data: CreateKPIData): Promise<KPI> {
    const { data: kpi, error } = await supabase
      .from(TABLES.kpis)
      .insert({
        category: data.category,
        name: data.name,
        description: data.description,
        unit: data.unit,
        target: data.target,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: kpi.id,
      category: kpi.category,
      name: kpi.name,
      description: kpi.description,
      unit: kpi.unit,
      target: kpi.target,
    };
  }

  async getAllKPIs(): Promise<KPI[]> {
    const { data, error } = await supabase
      .from(TABLES.kpis)
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return data.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description,
      unit: item.unit,
      target: item.target,
    }));
  }

  async updateKPI(id: string, data: Partial<CreateKPIData>): Promise<KPI> {
    const updateData: any = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.target !== undefined) updateData.target = data.target;

    const { data: kpi, error } = await supabase
      .from(TABLES.kpis)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: kpi.id,
      category: kpi.category,
      name: kpi.name,
      description: kpi.description,
      unit: kpi.unit,
      target: kpi.target,
    };
  }

  async deleteKPI(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.kpis).delete().eq('id', id);
    if (error) throw error;
  }

  // Goal Methods
  async createGoal(data: CreateGoalData): Promise<Goal> {
    const { data: goal, error } = await supabase
      .from(TABLES.goals)
      .insert({
        user_id: data.userId,
        title: data.title,
        description: data.description,
        type: data.type,
        target_value: data.targetValue,
        current_value: data.currentValue || 0,
        start_date: data.startDate,
        end_date: data.endDate,
        status: 'not-started',
      })
      .select(`
        *,
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: goal.id,
      userId: goal.user_id,
      user: goal.user ? mapUserFromDB(goal.user) : undefined,
      title: goal.title,
      description: goal.description,
      type: goal.type,
      targetValue: goal.target_value,
      currentValue: goal.current_value,
      startDate: goal.start_date,
      endDate: goal.end_date,
      status: goal.status,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
    };
  }

  async getGoals(filters?: { userId?: string }): Promise<Goal[]> {
    let query = supabase
      .from(TABLES.goals)
      .select(`
        *,
        user:users(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      title: item.title,
      description: item.description,
      type: item.type,
      targetValue: item.target_value,
      currentValue: item.current_value,
      startDate: item.start_date,
      endDate: item.end_date,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async updateGoal(data: UpdateGoalData): Promise<Goal> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.targetValue !== undefined) updateData.target_value = data.targetValue;
    if (data.currentValue !== undefined) updateData.current_value = data.currentValue;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.status !== undefined) updateData.status = data.status;
    updateData.updated_at = new Date().toISOString();

    const { data: goal, error } = await supabase
      .from(TABLES.goals)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        user:users(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: goal.id,
      userId: goal.user_id,
      user: goal.user ? mapUserFromDB(goal.user) : undefined,
      title: goal.title,
      description: goal.description,
      type: goal.type,
      targetValue: goal.target_value,
      currentValue: goal.current_value,
      startDate: goal.start_date,
      endDate: goal.end_date,
      status: goal.status,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
    };
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.goals).delete().eq('id', id);
    if (error) throw error;
  }

  // Performance Review Methods
  async createPerformanceReview(data: CreatePerformanceReviewData): Promise<PerformanceReview> {
    const { data: review, error } = await supabase
      .from(TABLES.performance_reviews)
      .insert({
        user_id: data.userId,
        reviewed_by: data.reviewedBy,
        cycle: data.cycle,
        period: data.period,
        ratings: data.ratings,
        overall_rating: data.overallRating,
        feedback: data.feedback,
        competencies: data.competencies,
      })
      .select(`
        *,
        user:users(*),
        reviewed_by_user:users!performance_reviews_reviewed_by_fkey(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: review.id,
      userId: review.user_id,
      user: review.user ? mapUserFromDB(review.user) : undefined,
      reviewedBy: review.reviewed_by,
      reviewedByUser: review.reviewed_by_user ? mapUserFromDB(review.reviewed_by_user) : undefined,
      cycle: review.cycle,
      period: review.period,
      ratings: review.ratings,
      overallRating: review.overall_rating,
      feedback: review.feedback,
      competencies: review.competencies,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
  }

  async getPerformanceReviews(filters?: { userId?: string; cycle?: ReviewCycle }): Promise<PerformanceReview[]> {
    let query = supabase
      .from(TABLES.performance_reviews)
      .select(`
        *,
        user:users(*),
        reviewed_by_user:users!performance_reviews_reviewed_by_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.cycle) {
      query = query.eq('cycle', filters.cycle);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      user: item.user ? mapUserFromDB(item.user) : undefined,
      reviewedBy: item.reviewed_by,
      reviewedByUser: item.reviewed_by_user ? mapUserFromDB(item.reviewed_by_user) : undefined,
      cycle: item.cycle,
      period: item.period,
      ratings: item.ratings,
      overallRating: item.overall_rating,
      feedback: item.feedback,
      competencies: item.competencies,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async updatePerformanceReview(data: UpdatePerformanceReviewData): Promise<PerformanceReview> {
    const updateData: any = {};
    if (data.ratings !== undefined) updateData.ratings = data.ratings;
    if (data.overallRating !== undefined) updateData.overall_rating = data.overallRating;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;
    if (data.competencies !== undefined) updateData.competencies = data.competencies;
    updateData.updated_at = new Date().toISOString();

    const { data: review, error } = await supabase
      .from(TABLES.performance_reviews)
      .update(updateData)
      .eq('id', data.id)
      .select(`
        *,
        user:users(*),
        reviewed_by_user:users!performance_reviews_reviewed_by_fkey(*)
      `)
      .single();

    if (error) throw error;

    return {
      id: review.id,
      userId: review.user_id,
      user: review.user ? mapUserFromDB(review.user) : undefined,
      reviewedBy: review.reviewed_by,
      reviewedByUser: review.reviewed_by_user ? mapUserFromDB(review.reviewed_by_user) : undefined,
      cycle: review.cycle,
      period: review.period,
      ratings: review.ratings,
      overallRating: review.overall_rating,
      feedback: review.feedback,
      competencies: review.competencies,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
  }

  async deletePerformanceReview(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.performance_reviews).delete().eq('id', id);
    if (error) throw error;
  }
}

export const performanceService = new PerformanceService();



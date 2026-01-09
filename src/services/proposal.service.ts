import { supabase, TABLES } from './supabase';
import { Proposal, ProposalItem } from '../types';
// import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateProposalData {
  companyId: string;
  createdBy: string;
  clientName: string;
  clientEmail: string;
  proposalNumber: string;
  items: Omit<ProposalItem, 'id'>[];
  total: number;
  validUntil?: string;
}

export interface UpdateProposalData {
  id: string;
  clientName?: string;
  clientEmail?: string;
  items?: Omit<ProposalItem, 'id'>[];
  total?: number;
  validUntil?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
}

export interface CreateNewVersionData {
  proposalId: string;
  items: Omit<ProposalItem, 'id'>[];
  total: number;
  validUntil?: string;
}

class ProposalService {
  async createProposal(data: CreateProposalData): Promise<Proposal> {
    // Create proposal (proposal number is generated before calling this function)
    const { data: proposal, error: proposalError } = await supabase
      .from(TABLES.proposals)
      .insert({
        company_id: data.companyId,
        created_by: data.createdBy,
        client_name: data.clientName,
        client_email: data.clientEmail,
        proposal_number: data.proposalNumber,
        total: data.total,
        valid_until: data.validUntil,
        version: 1,
        status: 'draft',
      })
      .select()
      .single();

    if (proposalError) throw proposalError;

    // Create proposal items
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        proposal_id: proposal.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from(TABLES.proposal_items).insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    // Fetch complete proposal with items
    return this.getProposal(proposal.id);
  }

  async updateProposal(data: UpdateProposalData): Promise<Proposal> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientEmail !== undefined) updateData.client_email = data.clientEmail;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;
    if (data.status !== undefined) updateData.status = data.status;

    const { error: updateError } = await supabase.from(TABLES.proposals).update(updateData).eq('id', data.id);
    if (updateError) throw updateError;

    // Update items if provided
    if (data.items) {
      // Delete existing items
      await supabase.from(TABLES.proposal_items).delete().eq('proposal_id', data.id);

      // Insert new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          proposal_id: data.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
        }));

        const { error: itemsError } = await supabase.from(TABLES.proposal_items).insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
    }

    return this.getProposal(data.id);
  }

  async createNewVersion(data: CreateNewVersionData): Promise<Proposal> {
    // Get original proposal
    const original = await this.getProposal(data.proposalId);

    // Create new version
    const { data: newProposal, error: proposalError } = await supabase
      .from(TABLES.proposals)
      .insert({
        company_id: original.companyId,
        created_by: original.createdBy,
        client_name: original.clientName,
        client_email: original.clientEmail,
        proposal_number: original.proposalNumber,
        total: data.total,
        valid_until: data.validUntil || original.validUntil,
        version: original.version + 1,
        status: 'draft',
      })
      .select()
      .single();

    if (proposalError) throw proposalError;

    // Create proposal items
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        proposal_id: newProposal.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from(TABLES.proposal_items).insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    return this.getProposal(newProposal.id);
  }

  async getProposal(id: string): Promise<Proposal> {
    const { data: proposal, error } = await supabase
      .from(TABLES.proposals)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from(TABLES.proposal_items)
      .select('*')
      .eq('proposal_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    return {
      id: proposal.id,
      companyId: proposal.company_id,
      createdBy: proposal.created_by,
      clientName: proposal.client_name,
      clientEmail: proposal.client_email,
      proposalNumber: proposal.proposal_number,
      items: (items || []).map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      total: proposal.total,
      version: proposal.version,
      status: proposal.status,
      validUntil: proposal.valid_until,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    };
  }

  async getProposals(filters?: {
    companyId?: string;
    createdBy?: string;
    status?: 'draft' | 'sent' | 'accepted' | 'rejected';
    clientEmail?: string;
  }): Promise<Proposal[]> {
    let query = supabase
      .from(TABLES.proposals)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.clientEmail) {
      query = query.eq('client_email', filters.clientEmail);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch items for each proposal
    const proposalsWithItems = await Promise.all(
      (data || []).map(async (proposal) => {
        const { data: items } = await supabase
          .from(TABLES.proposal_items)
          .select('*')
          .eq('proposal_id', proposal.id)
          .order('created_at', { ascending: true });

        return {
          id: proposal.id,
          companyId: proposal.company_id,
          createdBy: proposal.created_by,
          clientName: proposal.client_name,
          clientEmail: proposal.client_email,
          proposalNumber: proposal.proposal_number,
          items: (items || []).map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
          })),
          total: proposal.total,
          version: proposal.version,
          status: proposal.status,
          validUntil: proposal.valid_until,
          createdAt: proposal.created_at,
          updatedAt: proposal.updated_at,
        };
      })
    );

    return proposalsWithItems;
  }

  async updateProposalStatus(id: string, status: 'draft' | 'sent' | 'accepted' | 'rejected'): Promise<Proposal> {
    const { error } = await supabase
      .from(TABLES.proposals)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return this.getProposal(id);
  }

  async deleteProposal(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.proposals).delete().eq('id', id);
    if (error) throw error;
  }

  async getProposalVersions(proposalNumber: string): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from(TABLES.proposals)
      .select('*')
      .eq('proposal_number', proposalNumber)
      .order('version', { ascending: true });

    if (error) throw error;

    // Fetch items for each version
    const proposalsWithItems = await Promise.all(
      (data || []).map(async (proposal) => {
        const { data: items } = await supabase
          .from(TABLES.proposal_items)
          .select('*')
          .eq('proposal_id', proposal.id)
          .order('created_at', { ascending: true });

        return {
          id: proposal.id,
          companyId: proposal.company_id,
          createdBy: proposal.created_by,
          clientName: proposal.client_name,
          clientEmail: proposal.client_email,
          proposalNumber: proposal.proposal_number,
          items: (items || []).map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
          })),
          total: proposal.total,
          version: proposal.version,
          status: proposal.status,
          validUntil: proposal.valid_until,
          createdAt: proposal.created_at,
          updatedAt: proposal.updated_at,
        };
      })
    );

    return proposalsWithItems;
  }

  async generateProposalNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PROP-${year}-`;
    
    // Get all unique proposal numbers with the same prefix to find the highest sequence number
    // We use distinct proposal numbers because versions share the same proposal number
    const { data: existingProposals, error } = await supabase
      .from(TABLES.proposals)
      .select('proposal_number')
      .like('proposal_number', `${prefix}%`);

    if (error) {
      console.error('Error fetching proposals for number generation:', error);
      // Fallback: start from 0001
      return `${prefix}0001`;
    }

    // Get unique proposal numbers and find the highest sequence
    const uniqueNumbers = new Set((existingProposals || []).map(p => p.proposal_number));
    let nextSequence = 1;

    if (uniqueNumbers.size > 0) {
      // Extract sequence numbers and find the maximum
      const sequences = Array.from(uniqueNumbers)
        .map(num => {
          const match = num.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)(?:-.*)?$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);

      if (sequences.length > 0) {
        const maxSequence = Math.max(...sequences);
        nextSequence = maxSequence + 1;
      }
    }

    // Generate the proposal number
    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
  }
}

export const proposalService = new ProposalService();


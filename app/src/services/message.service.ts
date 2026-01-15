import { supabase, TABLES } from './supabase';
import { Message, User } from '../types';
import { mapUserFromDB } from '../utils/dbMapper';

export interface CreateMessageData {
  fromUserId?: string; // Optional for client messages
  fromClientId?: string; // For client replies
  toUserId?: string; // Optional for client messages
  clientId?: string; // For client messages
  subject?: string;
  content: string;
  attachments?: Array<{ type: 'file' | 'image'; url: string; name: string; size?: number }>;
}

class MessageService {
  async createMessage(data: CreateMessageData): Promise<Message> {
    // Validate: must have either (fromUserId and toUserId/clientId) OR (fromClientId and toUserId)
    if (!data.fromUserId && !data.fromClientId) {
      throw new Error('Either fromUserId or fromClientId must be provided');
    }
    if (!data.toUserId && !data.clientId) {
      throw new Error('Either toUserId or clientId must be provided');
    }

    const insertData: any = {
      subject: data.subject,
      content: data.content,
      attachments: data.attachments || null,
      is_read: false,
    };

    if (data.fromUserId) {
      insertData.from_user_id = data.fromUserId;
    }
    if (data.fromClientId) {
      insertData.from_client_id = data.fromClientId;
    }
    if (data.toUserId) {
      insertData.to_user_id = data.toUserId;
    }
    if (data.clientId) {
      insertData.client_id = data.clientId;
    }

    const { data: message, error } = await supabase
      .from(TABLES.messages)
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    // Fetch users separately to avoid relationship issues
    const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
    const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

    // Fetch client if message TO client
    let client = null;
    if (message.client_id) {
      const { data: clientData } = await supabase
        .from(TABLES.clients)
        .select('*')
        .eq('id', message.client_id)
        .single();
      if (clientData) {
        client = {
          id: clientData.id,
          companyId: clientData.company_id,
          createdBy: clientData.created_by,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          contactPerson: clientData.contact_person,
          notes: clientData.notes,
          isActive: clientData.is_active,
          createdAt: clientData.created_at,
          updatedAt: clientData.updated_at,
        };
      }
    }

    // Fetch fromClient if message FROM client
    let fromClient = null;
    if (message.from_client_id) {
      const { data: clientData } = await supabase
        .from(TABLES.clients)
        .select('*')
        .eq('id', message.from_client_id)
        .single();
      if (clientData) {
        fromClient = {
          id: clientData.id,
          companyId: clientData.company_id,
          createdBy: clientData.created_by,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          contactPerson: clientData.contact_person,
          notes: clientData.notes,
          isActive: clientData.is_active,
          createdAt: clientData.created_at,
          updatedAt: clientData.updated_at,
        };
      }
    }

    return {
      id: message.id,
      fromUserId: message.from_user_id || undefined,
      fromUser: fromUser || undefined,
      fromClientId: message.from_client_id || undefined,
      fromClient: fromClient || undefined,
      toUserId: message.to_user_id || undefined,
      toUser: toUser || undefined,
      clientId: message.client_id || undefined,
      client: client || undefined,
      subject: message.subject,
      content: message.content,
      attachments: message.attachments || undefined,
      isRead: message.is_read,
      createdAt: message.created_at,
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return null;
    if (!data) return null;

    return mapUserFromDB(data) as User;
  }

  async getMessages(filters?: { userId?: string; conversationWith?: string; clientId?: string; fromClientId?: string; limit?: number }): Promise<Message[]> {
    let query = supabase
      .from(TABLES.messages)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.or(`from_user_id.eq.${filters.userId},to_user_id.eq.${filters.userId}`);
    }

    if (filters?.clientId) {
      // Messages TO this client
      query = query.eq('client_id', filters.clientId);
    }

    if (filters?.fromClientId) {
      // Messages FROM this client
      query = query.eq('from_client_id', filters.fromClientId);
    }

    if (filters?.conversationWith && filters?.userId) {
      query = query.or(
        `and(from_user_id.eq.${filters.userId},to_user_id.eq.${filters.conversationWith}),and(from_user_id.eq.${filters.conversationWith},to_user_id.eq.${filters.userId})`
      );
    }

    // Limit results for better performance
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else if (!filters?.conversationWith) {
      // For conversation list, only fetch recent messages
      query = query.limit(500);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Collect all unique user IDs and client IDs
    const userIds = new Set<string>();
    const clientIds = new Set<string>();
    
    (data || []).forEach((item: any) => {
      if (item.from_user_id) userIds.add(item.from_user_id);
      if (item.to_user_id) userIds.add(item.to_user_id);
      if (item.client_id) clientIds.add(item.client_id);
      if (item.from_client_id) clientIds.add(item.from_client_id);
    });

    // Batch fetch all users at once
    const usersMap = new Map<string, User>();
    if (userIds.size > 0) {
      const { data: usersData } = await supabase
        .from(TABLES.users)
        .select('*')
        .in('id', Array.from(userIds));
      
      if (usersData) {
        usersData.forEach((userData) => {
          const user = mapUserFromDB(userData) as User;
          usersMap.set(user.id, user);
        });
      }
    }

    // Batch fetch all clients at once
    const clientsMap = new Map<string, any>();
    if (clientIds.size > 0) {
      const { data: clientsData } = await supabase
        .from(TABLES.clients)
        .select('*')
        .in('id', Array.from(clientIds));
      
      if (clientsData) {
        clientsData.forEach((clientData) => {
          clientsMap.set(clientData.id, {
            id: clientData.id,
            companyId: clientData.company_id,
            createdBy: clientData.created_by,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            address: clientData.address,
            contactPerson: clientData.contact_person,
            notes: clientData.notes,
            isActive: clientData.is_active,
            createdAt: clientData.created_at,
            updatedAt: clientData.updated_at,
          });
        });
      }
    }

    // Map messages with pre-fetched users and clients
    const messagesWithUsers = (data || []).map((item: any) => {
      const fromUser = item.from_user_id ? usersMap.get(item.from_user_id) : undefined;
      const toUser = item.to_user_id ? usersMap.get(item.to_user_id) : undefined;
      const client = item.client_id ? clientsMap.get(item.client_id) : undefined;
      const fromClient = item.from_client_id ? clientsMap.get(item.from_client_id) : undefined;

      return {
        id: item.id,
        fromUserId: item.from_user_id || undefined,
        fromUser: fromUser || undefined,
        fromClientId: item.from_client_id || undefined,
        fromClient: fromClient || undefined,
        toUserId: item.to_user_id || undefined,
        toUser: toUser || undefined,
        clientId: item.client_id || undefined,
        client: client || undefined,
        subject: item.subject,
        content: item.content,
        attachments: item.attachments || undefined,
        isRead: item.is_read,
        createdAt: item.created_at,
      };
    });

    return messagesWithUsers;
  }

  async getConversations(userId: string): Promise<Array<{ user?: User; client?: any; lastMessage: Message; unreadCount: number }>> {
    // Optimize: Only fetch recent messages for conversation list (limit to 1000 most recent)
    const messages = await this.getMessages({ userId, limit: 1000 });
    
    // Group messages by conversation partner (users and clients)
    const userConversationsMap = new Map<string, {
      user: User;
      messages: Message[];
    }>();
    
    const clientConversationsMap = new Map<string, {
      client: any;
      messages: Message[];
    }>();

    for (const message of messages) {
      if (message.clientId && message.client) {
        // Message TO client
        const clientId = message.clientId;
        if (!clientConversationsMap.has(clientId)) {
          clientConversationsMap.set(clientId, {
            client: message.client,
            messages: [],
          });
        }
        clientConversationsMap.get(clientId)!.messages.push(message);
      } else if (message.fromClientId && message.fromClient) {
        // Message FROM client - this is a client reply
        const clientId = message.fromClientId;
        if (!clientConversationsMap.has(clientId)) {
          clientConversationsMap.set(clientId, {
            client: message.fromClient,
            messages: [],
          });
        }
        clientConversationsMap.get(clientId)!.messages.push(message);
      } else if (message.toUserId) {
        // User conversation
        const partnerId = message.fromUserId === userId ? message.toUserId : message.fromUserId;
        const partner = message.fromUserId === userId ? message.toUser : message.fromUser;

        if (!partner) continue;

        if (!userConversationsMap.has(partnerId)) {
          userConversationsMap.set(partnerId, {
            user: partner,
            messages: [],
          });
        }
        userConversationsMap.get(partnerId)!.messages.push(message);
      }
    }

    // Convert user conversations to array
    const userConversations = Array.from(userConversationsMap.values()).map((conv) => {
      const sortedMessages = conv.messages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastMessage = sortedMessages[0];
      const unreadCount = conv.messages.filter(m => 
        !m.isRead && m.toUserId === userId
      ).length;

      return {
        user: conv.user,
        lastMessage,
        unreadCount,
      };
    });

    // Convert client conversations to array
    const clientConversations = Array.from(clientConversationsMap.values()).map((conv) => {
      const sortedMessages = conv.messages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastMessage = sortedMessages[0];
      // Count unread messages from client (messages where fromClientId exists and toUserId is the current user)
      const unreadCount = conv.messages.filter(m => 
        !m.isRead && m.fromClientId && m.toUserId === userId
      ).length;

      return {
        client: conv.client,
        lastMessage,
        unreadCount,
      };
    });

    // Combine and sort all conversations
    const allConversations = [...userConversations, ...clientConversations];
    return allConversations.sort((a, b) =>
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  async markAsRead(messageId: string): Promise<Message> {
    const { data: message, error } = await supabase
      .from(TABLES.messages)
      .update({ is_read: true })
      .eq('id', messageId)
      .select('*')
      .single();

    if (error) throw error;

    const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
    const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

    // Fetch client if message TO client
    let client = null;
    if (message.client_id) {
      const { data: clientData } = await supabase
        .from(TABLES.clients)
        .select('*')
        .eq('id', message.client_id)
        .single();
      if (clientData) {
        client = {
          id: clientData.id,
          companyId: clientData.company_id,
          createdBy: clientData.created_by,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          contactPerson: clientData.contact_person,
          notes: clientData.notes,
          isActive: clientData.is_active,
          createdAt: clientData.created_at,
          updatedAt: clientData.updated_at,
        };
      }
    }

    // Fetch fromClient if message FROM client
    let fromClient = null;
    if (message.from_client_id) {
      const { data: clientData } = await supabase
        .from(TABLES.clients)
        .select('*')
        .eq('id', message.from_client_id)
        .single();
      if (clientData) {
        fromClient = {
          id: clientData.id,
          companyId: clientData.company_id,
          createdBy: clientData.created_by,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          contactPerson: clientData.contact_person,
          notes: clientData.notes,
          isActive: clientData.is_active,
          createdAt: clientData.created_at,
          updatedAt: clientData.updated_at,
        };
      }
    }

    return {
      id: message.id,
      fromUserId: message.from_user_id || undefined,
      fromUser: fromUser || undefined,
      fromClientId: message.from_client_id || undefined,
      fromClient: fromClient || undefined,
      toUserId: message.to_user_id || undefined,
      toUser: toUser || undefined,
      clientId: message.client_id || undefined,
      client: client || undefined,
      subject: message.subject,
      content: message.content,
      attachments: message.attachments || undefined,
      isRead: message.is_read,
      createdAt: message.created_at,
    };
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.messages)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Subscribe to real-time message updates for a user conversation
   * @param userId Current user ID
   * @param conversationWith User ID to have conversation with
   * @param callback Callback function to handle new/updated messages
   * @returns Subscription channel
   */
  subscribeToUserConversation(
    userId: string,
    conversationWith: string,
    callback: (message: Message) => void
  ) {
    const channelName = `user-conversation:${userId}:${conversationWith}`;
    console.log(`🔔 Creating channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time INSERT event received:', payload);
          
          try {
            const message = payload.new as any;
            if (!message) {
              console.warn('No message data in payload');
              return;
            }

            // Filter messages for this specific conversation
            const isInConversation =
              (message.from_user_id === userId && message.to_user_id === conversationWith) ||
              (message.from_user_id === conversationWith && message.to_user_id === userId);

            if (!isInConversation) {
              console.log('⏭️ Message not in this conversation, skipping');
              return;
            }

            console.log('✅ Processing message in conversation:', message.id);
            
            // Fetch full message with user data
            const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
            const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

            const fullMessage: Message = {
              id: message.id,
              fromUserId: message.from_user_id || undefined,
              fromUser: fromUser || undefined,
              toUserId: message.to_user_id || undefined,
              toUser: toUser || undefined,
              subject: message.subject,
              content: message.content,
              attachments: message.attachments || undefined,
              isRead: message.is_read,
              createdAt: message.created_at,
            };

            callback(fullMessage);
          } catch (error) {
            console.error('❌ Error processing real-time message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time UPDATE event received:', payload);
          
          try {
            const message = payload.new as any;
            if (!message) return;

            const isInConversation =
              (message.from_user_id === userId && message.to_user_id === conversationWith) ||
              (message.from_user_id === conversationWith && message.to_user_id === userId);

            if (isInConversation) {
              const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
              const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

              const fullMessage: Message = {
                id: message.id,
                fromUserId: message.from_user_id || undefined,
                fromUser: fromUser || undefined,
                toUserId: message.to_user_id || undefined,
                toUser: toUser || undefined,
                subject: message.subject,
                content: message.content,
                attachments: message.attachments || undefined,
                isRead: message.is_read,
                createdAt: message.created_at,
              };

              callback(fullMessage);
            }
          } catch (error) {
            console.error('❌ Error processing real-time update:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time DELETE event received:', payload);
          
          try {
            const deletedMessage = payload.old as any;
            const isInConversation =
              (deletedMessage.from_user_id === userId && deletedMessage.to_user_id === conversationWith) ||
              (deletedMessage.from_user_id === conversationWith && deletedMessage.to_user_id === userId);

            if (isInConversation) {
              callback({
                id: deletedMessage.id,
                fromUserId: deletedMessage.from_user_id || undefined,
                toUserId: deletedMessage.to_user_id || undefined,
                content: '',
                isRead: true,
                createdAt: deletedMessage.created_at,
              } as Message);
            }
          } catch (error) {
            console.error('❌ Error processing real-time delete:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${channelName}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Channel closed');
        }
      });

    return channel;
  }

  /**
   * Subscribe to real-time message updates for a client conversation
   * @param userId Current user ID
   * @param clientId Client ID to have conversation with
   * @param callback Callback function to handle new/updated messages
   * @returns Subscription channel
   */
  subscribeToClientConversation(
    userId: string,
    clientId: string,
    callback: (message: Message) => void
  ) {
    const channelName = `client-conversation:${userId}:${clientId}`;
    console.log(`🔔 Creating client channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time client INSERT event received:', payload);
          
          try {
            const message = payload.new as any;
            if (!message) {
              console.warn('No message data in payload');
              return;
            }
            
            // Verify this message is part of the conversation
            const isInConversation =
              (message.from_user_id === userId && message.client_id === clientId) ||
              (message.from_client_id === clientId && message.to_user_id === userId);

            if (!isInConversation) {
              console.log('⏭️ Client message not in this conversation, skipping');
              return;
            }

            console.log('✅ Processing client message in conversation:', message.id);
            
            // Fetch full message with user and client data
            const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
            const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

            // Fetch client if message TO client
            let client = null;
            if (message.client_id) {
              const { data: clientData } = await supabase
                .from(TABLES.clients)
                .select('*')
                .eq('id', message.client_id)
                .single();
              if (clientData) {
                client = {
                  id: clientData.id,
                  companyId: clientData.company_id,
                  createdBy: clientData.created_by,
                  name: clientData.name,
                  email: clientData.email,
                  phone: clientData.phone,
                  address: clientData.address,
                  contactPerson: clientData.contact_person,
                  notes: clientData.notes,
                  isActive: clientData.is_active,
                  createdAt: clientData.created_at,
                  updatedAt: clientData.updated_at,
                };
              }
            }

            // Fetch fromClient if message FROM client
            let fromClient = null;
            if (message.from_client_id) {
              const { data: clientData } = await supabase
                .from(TABLES.clients)
                .select('*')
                .eq('id', message.from_client_id)
                .single();
              if (clientData) {
                fromClient = {
                  id: clientData.id,
                  companyId: clientData.company_id,
                  createdBy: clientData.created_by,
                  name: clientData.name,
                  email: clientData.email,
                  phone: clientData.phone,
                  address: clientData.address,
                  contactPerson: clientData.contact_person,
                  notes: clientData.notes,
                  isActive: clientData.is_active,
                  createdAt: clientData.created_at,
                  updatedAt: clientData.updated_at,
                };
              }
            }

            const fullMessage: Message = {
              id: message.id,
              fromUserId: message.from_user_id || undefined,
              fromUser: fromUser || undefined,
              fromClientId: message.from_client_id || undefined,
              fromClient: fromClient || undefined,
              toUserId: message.to_user_id || undefined,
              toUser: toUser || undefined,
              clientId: message.client_id || undefined,
              client: client || undefined,
              subject: message.subject,
              content: message.content,
              attachments: message.attachments || undefined,
              isRead: message.is_read,
              createdAt: message.created_at,
            };

            callback(fullMessage);
          } catch (error) {
            console.error('❌ Error processing real-time client message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time client UPDATE event received:', payload);
          
          try {
            const message = payload.new as any;
            if (!message) return;

            const isInConversation =
              (message.from_user_id === userId && message.client_id === clientId) ||
              (message.from_client_id === clientId && message.to_user_id === userId);

            if (isInConversation) {
              const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
              const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

              let client = null;
              if (message.client_id) {
                const { data: clientData } = await supabase
                  .from(TABLES.clients)
                  .select('*')
                  .eq('id', message.client_id)
                  .single();
                if (clientData) {
                  client = {
                    id: clientData.id,
                    companyId: clientData.company_id,
                    createdBy: clientData.created_by,
                    name: clientData.name,
                    email: clientData.email,
                    phone: clientData.phone,
                    address: clientData.address,
                    contactPerson: clientData.contact_person,
                    notes: clientData.notes,
                    isActive: clientData.is_active,
                    createdAt: clientData.created_at,
                    updatedAt: clientData.updated_at,
                  };
                }
              }

              let fromClient = null;
              if (message.from_client_id) {
                const { data: clientData } = await supabase
                  .from(TABLES.clients)
                  .select('*')
                  .eq('id', message.from_client_id)
                  .single();
                if (clientData) {
                  fromClient = {
                    id: clientData.id,
                    companyId: clientData.company_id,
                    createdBy: clientData.created_by,
                    name: clientData.name,
                    email: clientData.email,
                    phone: clientData.phone,
                    address: clientData.address,
                    contactPerson: clientData.contact_person,
                    notes: clientData.notes,
                    isActive: clientData.is_active,
                    createdAt: clientData.created_at,
                    updatedAt: clientData.updated_at,
                  };
                }
              }

              const fullMessage: Message = {
                id: message.id,
                fromUserId: message.from_user_id || undefined,
                fromUser: fromUser || undefined,
                fromClientId: message.from_client_id || undefined,
                fromClient: fromClient || undefined,
                toUserId: message.to_user_id || undefined,
                toUser: toUser || undefined,
                clientId: message.client_id || undefined,
                client: client || undefined,
                subject: message.subject,
                content: message.content,
                attachments: message.attachments || undefined,
                isRead: message.is_read,
                createdAt: message.created_at,
              };

              callback(fullMessage);
            }
          } catch (error) {
            console.error('❌ Error processing real-time client update:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time client DELETE event received:', payload);
          
          try {
            const deletedMessage = payload.old as any;
            const isInConversation =
              (deletedMessage.from_user_id === userId && deletedMessage.client_id === clientId) ||
              (deletedMessage.from_client_id === clientId && deletedMessage.to_user_id === userId);

            if (isInConversation) {
              callback({
                id: deletedMessage.id,
                fromUserId: deletedMessage.from_user_id || undefined,
                fromClientId: deletedMessage.from_client_id || undefined,
                toUserId: deletedMessage.to_user_id || undefined,
                clientId: deletedMessage.client_id || undefined,
                content: '',
                isRead: true,
                createdAt: deletedMessage.created_at,
              } as Message);
            }
          } catch (error) {
            console.error('❌ Error processing real-time client delete:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${channelName}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time client updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Channel closed');
        }
      });

    return channel;
  }

  /**
   * Subscribe to real-time updates for all conversations of a user
   * @param userId Current user ID
   * @param callback Callback function to handle conversation updates
   * @returns Subscription channel
   */
  subscribeToAllConversations(
    userId: string,
    callback: (message: Message) => void
  ) {
    const channelName = `all-conversations:${userId}`;
    console.log(`🔔 Creating all conversations channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.messages,
        },
        async (payload) => {
          console.log('📨 Real-time conversation INSERT received:', payload);
          
          try {
            const message = payload.new as any;
            if (!message) {
              console.warn('No message data in payload');
              return;
            }

            // Only process messages involving this user
            const involvesUser = 
              message.from_user_id === userId || 
              message.to_user_id === userId ||
              (message.client_id && message.from_user_id === userId) ||
              (message.from_client_id && message.to_user_id === userId);

            if (!involvesUser) {
              return;
            }
          
            // Fetch full message with user and client data
            const fromUser = message.from_user_id ? await this.getUserById(message.from_user_id) : null;
            const toUser = message.to_user_id ? await this.getUserById(message.to_user_id) : null;

            // Fetch client if message TO client
            let client = null;
            if (message.client_id) {
              const { data: clientData } = await supabase
                .from(TABLES.clients)
                .select('*')
                .eq('id', message.client_id)
                .single();
              if (clientData) {
                client = {
                  id: clientData.id,
                  companyId: clientData.company_id,
                  createdBy: clientData.created_by,
                  name: clientData.name,
                  email: clientData.email,
                  phone: clientData.phone,
                  address: clientData.address,
                  contactPerson: clientData.contact_person,
                  notes: clientData.notes,
                  isActive: clientData.is_active,
                  createdAt: clientData.created_at,
                  updatedAt: clientData.updated_at,
                };
              }
            }

            // Fetch fromClient if message FROM client
            let fromClient = null;
            if (message.from_client_id) {
              const { data: clientData } = await supabase
                .from(TABLES.clients)
                .select('*')
                .eq('id', message.from_client_id)
                .single();
              if (clientData) {
                fromClient = {
                  id: clientData.id,
                  companyId: clientData.company_id,
                  createdBy: clientData.created_by,
                  name: clientData.name,
                  email: clientData.email,
                  phone: clientData.phone,
                  address: clientData.address,
                  contactPerson: clientData.contact_person,
                  notes: clientData.notes,
                  isActive: clientData.is_active,
                  createdAt: clientData.created_at,
                  updatedAt: clientData.updated_at,
                };
              }
            }

            const fullMessage: Message = {
              id: message.id,
              fromUserId: message.from_user_id || undefined,
              fromUser: fromUser || undefined,
              fromClientId: message.from_client_id || undefined,
              fromClient: fromClient || undefined,
              toUserId: message.to_user_id || undefined,
              toUser: toUser || undefined,
              clientId: message.client_id || undefined,
              client: client || undefined,
              subject: message.subject,
              content: message.content,
              attachments: message.attachments || undefined,
              isRead: message.is_read,
              createdAt: message.created_at,
            };

            callback(fullMessage);
          } catch (error) {
            console.error('❌ Error processing real-time conversation update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${channelName}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to all conversations');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Channel closed');
        }
      });

    return channel;
  }
}

export const messageService = new MessageService();


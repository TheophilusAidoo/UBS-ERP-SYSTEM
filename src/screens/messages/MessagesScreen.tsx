import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Avatar,
  Stack,
  Divider,
  Chip,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send,
  Refresh,
  Person,
  ArrowBack,
  AttachFile,
  Image,
  InsertEmoticon,
  Close,
  Download,
  PictureAsPdf,
  Description,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { messageService, CreateMessageData } from '../../services/message.service';
import { staffService } from '../../services/staff.service';
import { clientService } from '../../services/client.service';
import { Message, User, Client } from '../../types';
import { useTheme } from '@mui/material/styles';
import { formatRoleName } from '../../utils/roleFormatter';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useNotificationStore } from '../../store/notification.store';

const MessagesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const theme = useTheme();
  const [conversations, setConversations] = useState<Array<{ user?: User; client?: Client; lastMessage: Message; unreadCount: number }>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messageType, setMessageType] = useState<'user' | 'client'>('user');
  const [selectedClientForNew, setSelectedClientForNew] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedUserForNew, setSelectedUserForNew] = useState<string>('');
  const [attachments, setAttachments] = useState<Array<{ type: 'file' | 'image'; url: string; name: string; size?: number }>>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const allConversationsChannelRef = useRef<RealtimeChannel | null>(null);
  const { checkUnreadMessages, showNotification, stopRinging } = useNotificationStore();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAllUsers();
      fetchAllClients();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages(selectedUser.id);
      setSelectedClient(null);
      setMessageType('user');
    } else if (selectedClient && user) {
      fetchClientMessages(selectedClient.id);
      setSelectedUser(null);
      setMessageType('client');
    }
  }, [selectedUser, selectedClient, user]);

  // Set up real-time subscription for current conversation
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription
    if (conversationChannelRef.current) {
      conversationChannelRef.current.unsubscribe();
      conversationChannelRef.current = null;
    }

    // Subscribe to user conversation
    if (selectedUser && user) {
      console.log(`🔔 Setting up real-time subscription for user conversation: ${user.id} <-> ${selectedUser.id}`);
      const channel = messageService.subscribeToUserConversation(
        user.id,
        selectedUser.id,
        (newMessage) => {
          console.log('📩 New message received via real-time:', newMessage.id);
          setMessages((prev) => {
            // Handle deleted messages (empty content indicates deletion)
            if (!newMessage.content && newMessage.id) {
              console.log('🗑️ Removing deleted message:', newMessage.id);
              return prev.filter((m) => m.id !== newMessage.id);
            }

            // Check if message already exists
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) {
              console.log('🔄 Updating existing message:', newMessage.id);
              // Update existing message
              return prev.map((m) => (m.id === newMessage.id ? newMessage : m));
            } else {
              console.log('➕ Adding new message:', newMessage.id);
              // Add new message and sort by date
              const updated = [...prev, newMessage].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              return updated;
            }
          });

          // Mark as read if message is to current user AND we're viewing this conversation
          if (!newMessage.isRead && newMessage.toUserId === user.id) {
            // Only mark as read if we're viewing this conversation
            // Otherwise, show notification
            if (selectedUser && newMessage.fromUserId === selectedUser.id) {
              messageService.markAsRead(newMessage.id).catch(console.error);
            } else {
              // Show notification for new message
              const senderName = newMessage.fromUser 
                ? (newMessage.fromUser.role === 'admin' 
                    ? 'Supervisor' 
                    : `${newMessage.fromUser.firstName} ${newMessage.fromUser.lastName}`.trim() || newMessage.fromUser.email)
                : 'Someone';
              showNotification(
                'New Message',
                `${senderName}: ${newMessage.content.substring(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`,
                () => {
                  if (newMessage.fromUserId) {
                    setSelectedUser(newMessage.fromUser || null);
                  }
                }
              );
            }
          }

          // Refresh conversations list and update notification count
          fetchConversations();
        }
      );
      conversationChannelRef.current = channel;
    }
    // Subscribe to client conversation
    else if (selectedClient && user) {
      console.log(`🔔 Setting up real-time subscription for client conversation: ${user.id} <-> ${selectedClient.id}`);
      const channel = messageService.subscribeToClientConversation(
        user.id,
        selectedClient.id,
        (newMessage) => {
          console.log('📩 New client message received via real-time:', newMessage.id);
          setMessages((prev) => {
            // Handle deleted messages (empty content indicates deletion)
            if (!newMessage.content && newMessage.id) {
              console.log('🗑️ Removing deleted message:', newMessage.id);
              return prev.filter((m) => m.id !== newMessage.id);
            }

            // Check if message already exists
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) {
              console.log('🔄 Updating existing message:', newMessage.id);
              // Update existing message
              return prev.map((m) => (m.id === newMessage.id ? newMessage : m));
            } else {
              console.log('➕ Adding new message:', newMessage.id);
              // Add new message and sort by date
              const updated = [...prev, newMessage].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              return updated;
            }
          });

          // Mark as read if message is to current user AND we're viewing this conversation
          if (!newMessage.isRead && newMessage.fromClientId && newMessage.toUserId === user.id) {
            // Only mark as read if we're viewing this conversation
            // Otherwise, show notification
            if (selectedClient && newMessage.fromClientId === selectedClient.id) {
              messageService.markAsRead(newMessage.id).catch(console.error);
            } else {
              // Show notification for new client message
              const clientName = newMessage.fromClient 
                ? newMessage.fromClient.name
                : 'A client';
              showNotification(
                'New Message from Client',
                `${clientName}: ${newMessage.content.substring(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`,
                () => {
                  if (newMessage.fromClientId) {
                    setSelectedClient(newMessage.fromClient || null);
                  }
                }
              );
            }
          }

          // Refresh conversations list and update notification count
          fetchConversations();
        }
      );
      conversationChannelRef.current = channel;
    }

    // Cleanup function
    return () => {
      if (conversationChannelRef.current) {
        conversationChannelRef.current.unsubscribe();
        conversationChannelRef.current = null;
      }
    };
  }, [selectedUser, selectedClient, user]);

  // Set up real-time subscription for all conversations (to update conversation list)
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription
    if (allConversationsChannelRef.current) {
      allConversationsChannelRef.current.unsubscribe();
      allConversationsChannelRef.current = null;
    }

    // Subscribe to all conversations for this user
    const channel = messageService.subscribeToAllConversations(user.id, (newMessage) => {
      console.log('🔄 Refreshing conversations list due to new message');
      
      // Show notification if message is to current user and not read
      if (!newMessage.isRead && newMessage.toUserId === user.id) {
        // Check if we're viewing this conversation
        const isViewingConversation = 
          (selectedUser && newMessage.fromUserId === selectedUser.id) ||
          (selectedClient && newMessage.fromClientId === selectedClient.id);
        
        if (!isViewingConversation) {
          // Show notification
          let senderName = 'Someone';
          if (newMessage.fromUser) {
            senderName = newMessage.fromUser.role === 'admin'
              ? 'Supervisor'
              : `${newMessage.fromUser.firstName} ${newMessage.fromUser.lastName}`.trim() || newMessage.fromUser.email;
          } else if (newMessage.fromClient) {
            senderName = newMessage.fromClient.name;
          }
          
          showNotification(
            newMessage.fromClient ? 'New Message from Client' : 'New Message',
            `${senderName}: ${newMessage.content.substring(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`,
            () => {
              if (newMessage.fromUserId) {
                setSelectedUser(newMessage.fromUser || null);
              } else if (newMessage.fromClientId) {
                setSelectedClient(newMessage.fromClient || null);
              }
            }
          );
        }
      }
      
      // Refresh conversations list when any new message arrives
      fetchConversations();
    });

    allConversationsChannelRef.current = channel;

    // Cleanup function
    return () => {
      if (allConversationsChannelRef.current) {
        allConversationsChannelRef.current.unsubscribe();
        allConversationsChannelRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showEmojiPicker && !target.closest('[data-emoji-picker]')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    if (!user) return;
    try {
      // Don't set loading for background refreshes to avoid blocking UI
      const isInitialLoad = conversations.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const data = await messageService.getConversations(user.id);
      setConversations(data);
      
      // Update notification count in background
      checkUnreadMessages(user.id).catch(console.error);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || t('messages.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationWith: string) => {
    if (!user) return;
    try {
      setLoading(true);
      // Limit to last 100 messages for better performance
      const data = await messageService.getMessages({
        userId: user.id,
        conversationWith,
        limit: 100,
      });
      setMessages(data);
      
      // Mark messages as read in batch (don't await to avoid blocking)
      const unreadMessages = data.filter(m => !m.isRead && m.toUserId === user.id);
      Promise.all(unreadMessages.map(m => messageService.markAsRead(m.id))).catch(console.error);
      
      // Stop ringing and update notification count when messages are opened
      stopRinging();
      checkUnreadMessages(user.id).catch(console.error);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || t('messages.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Fetch users in background, don't block UI
      if (isAdmin) {
        // Supervisor can see all staff
        staffService.getAllStaff().then(data => setAllUsers(data)).catch(console.error);
      } else if (user?.companyId) {
        // Staff can only see staff from same company
        staffService.getAllStaff({ companyId: user.companyId })
          .then(data => setAllUsers(data.filter(u => u.id !== user.id)))
          .catch(console.error);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchAllClients = async () => {
    try {
      // Fetch clients in background, don't block UI
      if (isAdmin) {
        // Supervisor can see all clients
        clientService.getAllClients({ isActive: true })
          .then(data => setAllClients(data))
          .catch(console.error);
      } else if (user?.companyId) {
        // Staff can only see clients from their company
        clientService.getClientsByCompany(user.companyId)
          .then(data => setAllClients(data))
          .catch(console.error);
      }
    } catch (err: any) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchClientMessages = async (clientId: string) => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch messages TO client and FROM client (limit for performance)
      const toClientMessages = await messageService.getMessages({
        userId: user.id,
        clientId,
        limit: 100,
      });
      const fromClientMessages = await messageService.getMessages({
        userId: user.id,
        fromClientId: clientId,
        limit: 100,
      });
      
      // Combine and sort by date
      const allMessages = [...toClientMessages, ...fromClientMessages].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setMessages(allMessages);
      
      // Mark messages as read in batch (don't await to avoid blocking)
      const unreadMessages = allMessages.filter(m => !m.isRead && m.fromUserId !== user.id && m.fromClientId);
      Promise.all(unreadMessages.map(m => messageService.markAsRead(m.id))).catch(console.error);
      
      // Stop ringing and update notification count when messages are opened
      stopRinging();
      checkUnreadMessages(user.id).catch(console.error);
    } catch (err: any) {
      console.error('Error fetching client messages:', err);
      setError(err.message || t('messages.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    
    // Store message content before clearing
    const messageContent = newMessage;
    const messageSubject = newMessageSubject;
    const messageAttachments = [...attachments];
    const tempMessageId = `temp-${Date.now()}`;
    
    // Optimistic update - add message immediately to UI
    const optimisticMessage: Message = {
      id: tempMessageId,
      fromUserId: user.id,
      fromUser: user,
      toUserId: messageType === 'user' ? (selectedUser?.id || selectedUserForNew) : undefined,
      toUser: messageType === 'user' ? (selectedUser || allUsers.find(u => u.id === selectedUserForNew)) : undefined,
      clientId: messageType === 'client' ? (selectedClient?.id || selectedClientForNew) : undefined,
      client: messageType === 'client' ? (selectedClient || allClients.find(c => c.id === selectedClientForNew)) : undefined,
      subject: messageSubject || undefined,
      content: messageContent,
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => {
      const updated = [...prev, optimisticMessage].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return updated;
    });

    // Clear input immediately
    setNewMessage('');
    setNewMessageSubject('');
    setAttachments([]);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      setLoading(true);
      setError(null);

      let createdMessage: Message;

      if (messageType === 'user') {
        const toUserId = selectedUser ? selectedUser.id : selectedUserForNew;
        if (!toUserId) {
          setError('Please select a recipient');
          // Remove optimistic message on error
          setMessages((prev) => prev.filter(m => m.id !== tempMessageId));
          return;
        }

        createdMessage = await messageService.createMessage({
          fromUserId: user.id,
          toUserId,
          subject: messageSubject || undefined,
          content: messageContent,
          attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        });

        // Replace optimistic message with real one
        setMessages((prev) => {
          const filtered = prev.filter(m => m.id !== tempMessageId);
          const updated = [...filtered, createdMessage].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return updated;
        });
      } else {
        const clientId = selectedClient ? selectedClient.id : selectedClientForNew;
        if (!clientId) {
          setError('Please select a client');
          // Remove optimistic message on error
          setMessages((prev) => prev.filter(m => m.id !== tempMessageId));
          return;
        }

        createdMessage = await messageService.createMessage({
          fromUserId: user.id,
          clientId,
          subject: messageSubject || undefined,
          content: messageContent,
          attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        });

        // Replace optimistic message with real one
        setMessages((prev) => {
          const filtered = prev.filter(m => m.id !== tempMessageId);
          const updated = [...filtered, createdMessage].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return updated;
        });
      }

      setSuccess(t('messages.messageSent') || 'Message sent');
      setTimeout(() => setSuccess(null), 2000);

      // Refresh conversations list in background (don't wait for it)
      fetchConversations().catch(console.error);
    } catch (err: any) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempMessageId));
      setError(err.message || t('messages.failedToSend') || 'Failed to send message');
      // Restore input on error
      setNewMessage(messageContent);
      setNewMessageSubject(messageSubject);
      setAttachments(messageAttachments);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewConversation = () => {
    setShowNewMessage(true);
    setSelectedUser(null);
    setMessages([]);
    setSelectedUserForNew('');
    setAttachments([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const isImage = file.type.startsWith('image/');
        setAttachments((prev) => [
          ...prev,
          {
            type: isImage ? 'image' : 'file',
            url: result,
            name: file.name,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 3, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('messages.management') || 'Messages'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('messages.description') || 'Communicate with staff and clients'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<MessageIcon />}
              onClick={handleStartNewConversation}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
              }}
            >
              {t('messages.newMessage') || 'New Message'}
            </Button>
            <IconButton
              onClick={fetchConversations}
              disabled={loading}
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { 
                  backgroundColor: 'action.hover',
                  transform: 'rotate(180deg)',
                  transition: 'transform 0.3s ease',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <Refresh />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Conversations List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 3, 
            border: '1px solid rgba(0,0,0,0.08)', 
            height: { xs: '500px', md: 'calc(100vh - 300px)' }, 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ 
                p: 2.5, 
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: '#f8fafc',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {t('messages.title')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {conversations.length} {t('messages.title')}
                </Typography>
              </Box>
              <Box sx={{ 
                flex: 1, 
                overflow: 'auto', 
                backgroundColor: 'background.paper',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  },
                },
              }}>
                {loading && conversations.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : conversations.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                    <Box sx={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: '50%', 
                      backgroundColor: theme.palette.primary.light + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}>
                      <MessageIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      {t('messages.noConversations')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('messages.startConversation')}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={0}>
                    {conversations.map((conv) => {
                      const isClient = !!conv.client;
                      const isSelected = isClient 
                        ? selectedClient?.id === conv.client?.id
                        : selectedUser?.id === conv.user?.id;
                      
                      return (
                        <Box
                          key={isClient ? `client-${conv.client?.id}` : `user-${conv.user?.id}`}
                          onClick={() => {
                            if (isClient && conv.client) {
                              setSelectedClient(conv.client);
                              setSelectedUser(null);
                            } else if (conv.user) {
                              setSelectedUser(conv.user);
                              setSelectedClient(null);
                            }
                            setShowNewMessage(false);
                          }}
                          sx={{
                            p: 2,
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#e0e7ff' : 'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: isSelected ? '#e0e7ff' : '#f8fafc',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ 
                              width: 52, 
                              height: 52, 
                              bgcolor: isClient ? 'secondary.main' : 'primary.main',
                              fontSize: '1rem',
                              fontWeight: 600,
                            }}>
                              {isClient 
                                ? conv.client?.name?.[0]?.toUpperCase() || 'C'
                                : conv.user?.role === 'admin'
                                  ? 'S'
                                  : conv.user?.firstName?.[0]?.toUpperCase() || conv.user?.email?.[0]?.toUpperCase() || 'U'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.25 }}>
                                    {isClient 
                                      ? conv.client?.name || 'Client'
                                      : conv.user?.role === 'admin' 
                                        ? 'Supervisor'
                                        : `${conv.user?.firstName || ''} ${conv.user?.lastName || ''}`.trim() || conv.user?.email}
                                  </Typography>
                                  {isClient ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      Client {conv.client?.company?.name && `• ${conv.client.company.name}`}
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {formatRoleName(conv.user?.role) || 'User'}{conv.user?.jobTitle ? ` • ${conv.user.jobTitle}` : ''}{conv.user?.company?.name ? ` • ${conv.user.company.name}` : ''}
                                    </Typography>
                                  )}
                                </Box>
                                {conv.unreadCount > 0 && (
                                  <Chip
                                    label={conv.unreadCount}
                                    size="small"
                                    color="primary"
                                    sx={{ 
                                      minWidth: 20, 
                                      height: 20, 
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  mb: 0.5,
                                  fontWeight: conv.unreadCount > 0 ? 500 : 400,
                                }}
                              >
                                {conv.lastMessage.content}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {formatDate(conv.lastMessage.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Messages Thread */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            borderRadius: 3, 
            border: '1px solid rgba(0,0,0,0.08)', 
            height: { xs: '600px', md: 'calc(100vh - 300px)' }, 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            {showNewMessage ? (
              <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ 
                  p: 2.5, 
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#f8fafc',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setShowNewMessage(false);
                        setSelectedUserForNew('');
                        setSelectedClientForNew('');
                        setMessageType('user');
                      }}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      }}
                    >
                      <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {t('messages.newMessage')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Message Type</InputLabel>
                    <Select
                      value={messageType}
                      label="Message Type"
                      onChange={(e) => {
                        setMessageType(e.target.value as 'user' | 'client');
                        setSelectedUserForNew('');
                        setSelectedClientForNew('');
                      }}
                    >
                      <MenuItem value="user">Staff/User</MenuItem>
                      <MenuItem value="client">Client</MenuItem>
                    </Select>
                  </FormControl>
                  {messageType === 'user' ? (
                    <FormControl fullWidth>
                      <InputLabel>{t('messages.selectUser')}</InputLabel>
                      <Select
                        value={selectedUserForNew}
                        label={t('messages.selectUser')}
                        onChange={(e) => setSelectedUserForNew(e.target.value)}
                      >
                        {allUsers.length === 0 ? (
                          <MenuItem disabled>{t('common.noResults')}</MenuItem>
                        ) : (
                          allUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                                  {u.firstName?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {u.firstName} {u.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {u.jobTitle && `${u.jobTitle}`}
                                    {u.jobTitle && u.company?.name && ' • '}
                                    {u.company?.name && u.company.name}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth>
                      <InputLabel>Select Client</InputLabel>
                      <Select
                        value={selectedClientForNew}
                        label="Select Client"
                        onChange={(e) => setSelectedClientForNew(e.target.value)}
                      >
                        {allClients.length === 0 ? (
                          <MenuItem disabled>{t('common.noResults')}</MenuItem>
                        ) : (
                          allClients.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.75rem' }}>
                                  {c.name[0].toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {c.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {c.email} {c.company?.name && `• ${c.company.name}`}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  )}
                  <TextField
                    label={`${t('messages.subject')} (${t('common.optional') || 'Optional'})`}
                    fullWidth
                    value={newMessageSubject}
                    onChange={(e) => setNewMessageSubject(e.target.value)}
                  />
                  {attachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {attachments.map((attachment, index) => (
                        <Paper
                          key={index}
                          sx={{
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            borderRadius: 1,
                            border: '1px solid rgba(0,0,0,0.08)',
                          }}
                        >
                          {attachment.type === 'image' ? (
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            <Description sx={{ fontSize: 24, color: 'text.secondary' }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {attachment.name}
                            </Typography>
                            {attachment.size && (
                              <Typography variant="caption" color="text.secondary">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                          </Box>
                          <IconButton size="small" onClick={() => handleRemoveAttachment(index)}>
                            <Close fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                    </Box>
                  )}
                  <TextField
                    label={t('messages.content')}
                    multiline
                    rows={8}
                    fullWidth
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('messages.typeMessage')}
                  />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                      multiple
                    />
                    <input
                      type="file"
                      ref={imageInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleFileUpload}
                      multiple
                    />
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        border: '1px solid rgba(0,0,0,0.08)',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                      title={t('messages.attachFile')}
                    >
                      <AttachFile />
                    </IconButton>
                    <IconButton
                      onClick={() => imageInputRef.current?.click()}
                      sx={{
                        border: '1px solid rgba(0,0,0,0.08)',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                      title={t('messages.attachImage')}
                    >
                      <Image />
                    </IconButton>
                    <Box sx={{ position: 'relative' }} data-emoji-picker>
                      <IconButton
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.08)',
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                        title={t('messages.emoji')}
                      >
                        <InsertEmoticon />
                      </IconButton>
                      {showEmojiPicker && (
                        <Paper
                          data-emoji-picker
                          sx={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            mb: 1,
                            p: 2,
                            maxWidth: 300,
                            maxHeight: 200,
                            overflow: 'auto',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            zIndex: 1000,
                            border: '1px solid rgba(0,0,0,0.08)',
                          }}
                        >
                          {commonEmojis.map((emoji, idx) => (
                            <IconButton
                              key={idx}
                              size="small"
                              onClick={() => handleEmojiClick(emoji)}
                              sx={{ fontSize: '1.2rem', p: 0.5 }}
                            >
                              {emoji}
                            </IconButton>
                          ))}
                        </Paper>
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      variant="contained"
                      startIcon={<Send />}
                      onClick={handleSendMessage}
                      disabled={loading || (!newMessage.trim() && attachments.length === 0) || (messageType === 'user' ? !selectedUserForNew : !selectedClientForNew)}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {loading ? <CircularProgress size={20} /> : t('messages.sendMessage')}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            ) : (selectedUser || selectedClient) ? (
              <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ 
                  p: 2.5, 
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#f8fafc',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ 
                      width: 44, 
                      height: 44, 
                      bgcolor: selectedClient ? 'secondary.main' : 'primary.main',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}>
                      {selectedClient 
                        ? selectedClient.name[0].toUpperCase()
                        : selectedUser?.role === 'admin'
                          ? 'S'
                          : selectedUser?.firstName?.[0]?.toUpperCase() || selectedUser?.email?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
                        {selectedClient 
                          ? selectedClient.name
                          : selectedUser?.role === 'admin'
                            ? 'Supervisor'
                            : `${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim() || selectedUser?.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedClient 
                          ? `Client ${selectedClient.company?.name ? `• ${selectedClient.company.name}` : ''}`
                          : `${selectedUser?.role ? formatRoleName(selectedUser.role) : ''}${selectedUser?.role && selectedUser?.jobTitle ? ' • ' : ''}${selectedUser?.jobTitle || ''}${(selectedUser?.role || selectedUser?.jobTitle) && selectedUser?.company?.name ? ' • ' : ''}${selectedUser?.company?.name || ''}`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  p: 3, 
                  backgroundColor: '#f8fafc',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.3)',
                    },
                  },
                }}>
                  {loading && messages.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Box sx={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: '50%', 
                        backgroundColor: theme.palette.primary.light + '20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                      }}>
                        <MessageIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                      </Box>
                      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
                        {t('messages.noMessages') || 'No messages yet'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('messages.startConversation') || 'Start a conversation by sending a message'}
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {messages.map((message) => {
                        const isOwnMessage = message.fromUserId === user?.id;
                        const isFromClient = !!message.fromClientId;
                        return (
                          <Box
                            key={message.id}
                            sx={{
                              display: 'flex',
                              justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <Paper
                              sx={{
                                p: 2,
                                maxWidth: '70%',
                                backgroundColor: isOwnMessage ? 'primary.main' : isFromClient ? 'secondary.main' : 'white',
                                color: isOwnMessage || isFromClient ? 'white' : 'text.primary',
                                borderRadius: 3,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              }}
                            >
                              {isFromClient && message.fromClient && (
                                <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5, display: 'block' }}>
                                  From: {message.fromClient.name}
                                </Typography>
                              )}
                              {!isFromClient && message.fromUser && (
                                <Typography variant="caption" sx={{ opacity: 0.9, mb: 0.5, display: 'block', fontWeight: 600 }}>
                                  {formatRoleName(message.fromUser.role) || 'User'}
                                </Typography>
                              )}
                              {message.subject && (
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 600,
                                    mb: 0.5,
                                    opacity: isOwnMessage || isFromClient ? 0.9 : 1,
                                  }}
                                >
                                  {message.subject}
                                </Typography>
                              )}
                              <Typography variant="body1" sx={{ mb: message.attachments && message.attachments.length > 0 ? 1 : 0.5, whiteSpace: 'pre-wrap' }}>
                                {message.content}
                              </Typography>
                              {message.attachments && message.attachments.length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                                  {message.attachments.map((attachment, idx) => (
                                    <Box
                                      key={idx}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        p: 1,
                                        borderRadius: 1,
                                        backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                      }}
                                    >
                                      {attachment.type === 'image' ? (
                                        <>
                                          <img
                                            src={attachment.url}
                                            alt={attachment.name}
                                            style={{
                                              width: 60,
                                              height: 60,
                                              objectFit: 'cover',
                                              borderRadius: 4,
                                              cursor: 'pointer',
                                            }}
                                            onClick={() => window.open(attachment.url, '_blank')}
                                          />
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {attachment.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: isOwnMessage ? 0.8 : 0.7 }}>
                                              Image
                                            </Typography>
                                          </Box>
                                        </>
                                      ) : (
                                        <>
                                          <Description sx={{ fontSize: 32, color: isOwnMessage ? 'rgba(255,255,255,0.8)' : 'text.secondary' }} />
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {attachment.name}
                                            </Typography>
                                            {attachment.size && (
                                              <Typography variant="caption" sx={{ opacity: isOwnMessage ? 0.8 : 0.7 }}>
                                                {(attachment.size / 1024).toFixed(1)} KB
                                              </Typography>
                                            )}
                                          </Box>
                                          <IconButton
                                            size="small"
                                            onClick={() => window.open(attachment.url, '_blank')}
                                            sx={{ color: isOwnMessage ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}
                                          >
                                            <Download fontSize="small" />
                                          </IconButton>
                                        </>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  opacity: isOwnMessage ? 0.8 : 0.6,
                                  display: 'block',
                                  textAlign: 'right',
                                }}
                              >
                                {formatDate(message.createdAt)}
                              </Typography>
                            </Paper>
                          </Box>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </Stack>
                  )}
                </Box>
                <Divider />
                <Box sx={{ 
                  p: 2.5, 
                  backgroundColor: 'white',
                  borderTop: '1px solid rgba(0,0,0,0.08)',
                }}>
                  {attachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                      {attachments.map((attachment, index) => (
                        <Paper
                          key={index}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.08)',
                            backgroundColor: '#f8fafc',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            },
                          }}
                        >
                          {attachment.type === 'image' ? (
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            <Description sx={{ fontSize: 24, color: 'text.secondary' }} />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {attachment.name}
                            </Typography>
                            {attachment.size && (
                              <Typography variant="caption" color="text.secondary">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                          </Box>
                          <IconButton 
                            size="small" 
                            onClick={() => handleRemoveAttachment(index)}
                            sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                    </Box>
                  )}
                  <Stack spacing={1.5}>
                    <TextField
                      label={t('messages.typeMessage') || 'Type a message...'}
                      multiline
                      rows={2}
                      fullWidth
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={t('messages.typeMessage') || 'Type a message...'}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&:hover': {
                            backgroundColor: '#f1f5f9',
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'white',
                          },
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        multiple
                      />
                      <input
                        type="file"
                        ref={imageInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleFileUpload}
                        multiple
                      />
                      <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 1.5,
                          '&:hover': { backgroundColor: '#f8fafc' },
                        }}
                        title={t('messages.attachFile')}
                      >
                        <AttachFile />
                      </IconButton>
                      <IconButton
                        onClick={() => imageInputRef.current?.click()}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 1.5,
                          '&:hover': { backgroundColor: '#f8fafc' },
                        }}
                        title={t('messages.attachImage')}
                      >
                        <Image />
                      </IconButton>
                      <Box sx={{ position: 'relative' }} data-emoji-picker>
                        <IconButton
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          sx={{
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 1.5,
                            '&:hover': { backgroundColor: '#f8fafc' },
                          }}
                          title={t('messages.emoji')}
                        >
                          <InsertEmoticon />
                        </IconButton>
                        {showEmojiPicker && (
                          <Paper
                            data-emoji-picker
                            sx={{
                              position: 'absolute',
                              bottom: '100%',
                              left: 0,
                              mb: 1,
                              p: 2,
                              maxWidth: 300,
                              maxHeight: 200,
                              overflow: 'auto',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 0.5,
                              zIndex: 1000,
                              border: '1px solid rgba(0,0,0,0.08)',
                              borderRadius: 2,
                            }}
                          >
                            {commonEmojis.map((emoji, idx) => (
                              <IconButton
                                key={idx}
                                size="small"
                                onClick={() => handleEmojiClick(emoji)}
                                sx={{ fontSize: '1.2rem', p: 0.5 }}
                              >
                                {emoji}
                              </IconButton>
                            ))}
                          </Paper>
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }} />
                      <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={handleSendMessage}
                        disabled={loading || (!newMessage.trim() && attachments.length === 0)}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1.25,
                          textTransform: 'none',
                          fontWeight: 600,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          },
                          '&:disabled': {
                            opacity: 0.6,
                          },
                        }}
                      >
                        {loading ? <CircularProgress size={20} /> : (t('messages.sendMessage') || 'Send')}
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </CardContent>
            ) : (
              <CardContent sx={{ p: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    {t('messages.selectUserToStart')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('messages.startConversation')}
                  </Typography>
                </Box>
              </CardContent>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagesScreen;

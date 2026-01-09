import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  Paper,
  IconButton,
  InputAdornment,
  Chip,
  Divider,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send,
  ArrowBack,
  Email,
  Business,
  Person,
  Dashboard,
} from '@mui/icons-material';
import { clientService } from '../../services/client.service';
import { messageService, CreateMessageData } from '../../services/message.service';
import { Client, Message } from '../../types';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/auth.store';
import { useGlobalSettingsStore } from '../../store/global-settings.store';
import { useTheme } from '@mui/material/styles';

const ClientMessagesScreen: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const theme = useTheme();
  const { initializeSettings } = useGlobalSettingsStore();
  const [client, setClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize global settings to get the primary color
  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  useEffect(() => {
    if (clientId) {
      fetchClient();
      fetchMessages();
    }
  }, [clientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchClient = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const data = await clientService.getClient(clientId);
      if (data) {
        setClient(data);
      } else {
        setError('Client not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      // Get messages TO this client and FROM this client
      const toClientMessages = await messageService.getMessages({ clientId });
      const fromClientMessages = await messageService.getMessages({ fromClientId: clientId });
      
      // Combine and sort by date
      const allMessages = [...toClientMessages, ...fromClientMessages].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setMessages(allMessages);
      
      // Mark messages as read
      for (const message of allMessages) {
        if (!message.isRead && message.clientId === clientId) {
          await messageService.markAsRead(message.id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!clientId || !newMessage.trim() || !client) return;
    
    try {
      setSending(true);
      setError(null);

      // Find who to reply to - look for the most recent message from a user
      let toUserId: string | undefined;

      // Find the most recent message from a user (not from this client)
      const userMessage = messages
        .filter(m => m.fromUserId && m.fromClientId !== clientId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (userMessage?.fromUserId) {
        toUserId = userMessage.fromUserId;
      } else {
        // Try to find any message with a toUserId
        const messageWithToUser = messages.find(m => m.toUserId);
        if (messageWithToUser?.toUserId) {
          toUserId = messageWithToUser.toUserId;
        }
      }

      // If still no user found, we can't send
      if (!toUserId) {
        setError('No previous messages found. Please wait for a message from staff.');
        setSending(false);
        return;
      }

      await messageService.createMessage({
        fromClientId: clientId,
        toUserId,
        content: newMessage,
      });

      setNewMessage('');
      await fetchMessages();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading && !client) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !client) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          p: 4,
          pb: 6,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/client/${clientId}`)}
              sx={{
                textTransform: 'none',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Back to Dashboard
            </Button>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {client?.name?.charAt(0).toUpperCase() || 'C'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                Messages
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {client?.name || 'Client'} - {client?.company?.name || 'Company'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Dashboard />}
              onClick={() => navigate(`/client/${clientId}`)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                textTransform: 'none',
                px: 3,
                py: 1.5,
                borderRadius: 2,
              }}
            >
              Dashboard
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, mt: -4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Messages Card */}
        <Card sx={{ borderRadius: 3, boxShadow: 3, height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
          {/* Messages List */}
          <CardContent sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: 'grey.50' }}>
            {loading && messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 12, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    mx: 'auto',
                  }}
                >
                  <MessageIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.5 }} />
                </Box>
                <Typography variant="h5" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                  No Messages Yet
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                  Messages from staff will appear here. You'll be able to reply once you receive a message.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {messages.map((message, index) => {
                  const isFromClient = message.fromClientId === clientId;
                  const showDateSeparator = index === 0 || 
                    new Date(message.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
                  
                  return (
                    <React.Fragment key={message.id}>
                      {showDateSeparator && (
                        <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                          <Divider sx={{ flex: 1 }} />
                          <Chip
                            label={format(new Date(message.createdAt), 'MMMM dd, yyyy')}
                            size="small"
                            sx={{ mx: 2, bgcolor: 'white' }}
                          />
                          <Divider sx={{ flex: 1 }} />
                        </Box>
                      )}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: isFromClient ? 'flex-end' : 'flex-start',
                          alignItems: 'flex-start',
                          gap: 1.5,
                        }}
                      >
                        {!isFromClient && (
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'primary.main',
                              fontSize: '0.875rem',
                            }}
                          >
                            {message.fromUser?.firstName?.charAt(0) || message.fromUser?.email?.charAt(0) || 'S'}
                          </Avatar>
                        )}
                        <Paper
                          sx={{
                            p: 2.5,
                            maxWidth: '75%',
                            bgcolor: isFromClient ? 'primary.main' : 'white',
                            color: isFromClient ? 'white' : 'text.primary',
                            borderRadius: 3,
                            boxShadow: isFromClient 
                              ? '0 4px 12px rgba(102, 126, 234, 0.3)' 
                              : '0 2px 8px rgba(0,0,0,0.08)',
                            border: isFromClient ? 'none' : '1px solid',
                            borderColor: isFromClient ? 'transparent' : 'divider',
                          }}
                        >
                          {!isFromClient && message.fromUser && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                                display: 'block',
                                opacity: 0.8,
                              }}
                            >
                              {message.fromUser.firstName && message.fromUser.lastName
                                ? `${message.fromUser.firstName} ${message.fromUser.lastName}`
                                : message.fromUser.email}
                            </Typography>
                          )}
                          {message.subject && (
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                mb: 1,
                                opacity: isFromClient ? 0.95 : 1,
                              }}
                            >
                              {message.subject}
                            </Typography>
                          )}
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              mb: 1, 
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.6,
                              wordBreak: 'break-word',
                            }}
                          >
                            {message.content}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              opacity: isFromClient ? 0.85 : 0.6,
                              fontSize: '0.7rem',
                              display: 'block',
                            }}
                          >
                            {format(new Date(message.createdAt), 'h:mm a')}
                          </Typography>
                        </Paper>
                        {isFromClient && (
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'primary.dark',
                              fontSize: '0.875rem',
                            }}
                          >
                            {client?.name?.charAt(0).toUpperCase() || 'Y'}
                          </Avatar>
                        )}
                      </Box>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </CardContent>

          {/* Message Input */}
          <Box 
            sx={{ 
              p: 3, 
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'white',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={4}
                placeholder={messages.length === 0 ? "Wait for a message from staff..." : "Type your message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                    e.preventDefault();
                    if (!sending && newMessage.trim() && messages.length > 0) {
                      handleSendMessage();
                    }
                  }
                }}
                disabled={sending || messages.length === 0}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'grey.50',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                    '&.Mui-focused': {
                      bgcolor: 'white',
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                startIcon={sending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <Send />}
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim() || messages.length === 0}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  minWidth: 120,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                  },
                }}
              >
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </Box>
            {messages.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', textAlign: 'center' }}>
                You'll be able to send messages once you receive a message from staff
              </Typography>
            )}
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default ClientMessagesScreen;


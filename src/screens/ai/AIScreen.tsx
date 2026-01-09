import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Grid,
  Stack,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  SmartToy,
  Send,
  Refresh,
  Delete,
  TrendingUp,
  Assessment,
  Warning,
  AttachMoney,
  Lightbulb,
  Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { aiService, CreateInsightData } from '../../services/ai.service';
import { AIInsight, AIChatMessage } from '../../types';

const AIScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Insights
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightFilter, setInsightFilter] = useState<{ type?: string; severity?: string }>({});
  const [generateInsightDialog, setGenerateInsightDialog] = useState(false);
  const [insightType, setInsightType] = useState<'financial' | 'performance' | 'attendance' | 'risk'>('financial');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchInsights();
    // Add welcome message with staff name
    const staffName = user?.firstName || user?.lastName 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
      : user?.email?.split('@')[0] || 'there';
    const welcomeMessage = t('ai.welcomeMessage', { name: staffName });
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const data = await aiService.getAllInsights(insightFilter);
      setInsights(data);
    } catch (err: any) {
      console.error('Error fetching insights:', err);
      setError(err.message || t('ai.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [insightFilter]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Pass user context to AI service
      const context = {
        userId: user?.id,
        userRole: user?.role,
        companyId: user?.companyId || undefined,
      };
      const response = await aiService.chat(inputMessage, messages, context);
      const aiMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message || t('ai.failedToSend'));
      const errorMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('common.error') || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsight = async () => {
    try {
      setLoading(true);
      setError(null);
      const context = {
        userId: user?.id,
        userRole: user?.role as 'admin' | 'staff',
        companyId: user?.companyId || undefined,
      };
      await aiService.generateInsight(insightType, context);
      setSuccess(t('ai.insightGenerated'));
      setTimeout(() => setSuccess(null), 3000);
      setGenerateInsightDialog(false);
      await fetchInsights();
    } catch (err: any) {
      setError(err.message || t('ai.failedToGenerate'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInsight = async (id: string) => {
    if (!window.confirm(t('common.areYouSure') + '?')) return;
    try {
      setLoading(true);
      await aiService.deleteInsight(id);
      setSuccess(t('ai.insightDeleted') || 'Insight deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await fetchInsights();
    } catch (err: any) {
      setError(err.message || t('ai.failedToDelete') || 'Failed to delete insight');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return <AttachMoney />;
      case 'performance':
        return <Assessment />;
      case 'attendance':
        return <TrendingUp />;
      case 'risk':
        return <Warning />;
      default:
        return <Lightbulb />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('ai.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('ai.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<Lightbulb />}
                onClick={() => setGenerateInsightDialog(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {t('ai.generateInsight')}
              </Button>
            )}
            <IconButton
              onClick={fetchInsights}
              disabled={loading}
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { backgroundColor: 'action.hover' },
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
        {/* Chat Interface */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      backgroundColor: '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SmartToy sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('ai.chat')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('ai.description')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, minHeight: 400, maxHeight: 600 }}>
                <Stack spacing={2}>
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '80%',
                          backgroundColor: message.role === 'user' ? 'primary.main' : 'background.default',
                          color: message.role === 'user' ? 'white' : 'text.primary',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 1,
                            opacity: 0.7,
                          }}
                        >
                          {formatDate(message.timestamp)}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <CircularProgress size={20} />
                      </Paper>
                    </Box>
                  )}
                  <div ref={chatEndRef} />
                </Stack>
              </Box>
              <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder={t('ai.typeMessage')}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={loading || !inputMessage.trim()}
                    sx={{ borderRadius: 2, minWidth: 100 }}
                  >
                    <Send />
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Insights Panel */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        backgroundColor: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Lightbulb sx={{ color: 'warning.main', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('ai.insights')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {insights.length} {t('ai.insights')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>{t('ai.filterByType')}</InputLabel>
                    <Select
                      value={insightFilter.type || ''}
                      label={t('ai.filterByType')}
                      onChange={(e) => setInsightFilter({ ...insightFilter, type: e.target.value || undefined })}
                    >
                      <MenuItem value="">{t('ai.all')}</MenuItem>
                      <MenuItem value="financial">{t('ai.financial')}</MenuItem>
                      <MenuItem value="performance">{t('ai.performance')}</MenuItem>
                      <MenuItem value="attendance">{t('ai.attendance')}</MenuItem>
                      <MenuItem value="risk">{t('ai.risk')}</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>{t('ai.filterBySeverity')}</InputLabel>
                    <Select
                      value={insightFilter.severity || ''}
                      label={t('ai.filterBySeverity')}
                      onChange={(e) => setInsightFilter({ ...insightFilter, severity: e.target.value || undefined })}
                    >
                      <MenuItem value="">{t('ai.all')}</MenuItem>
                      <MenuItem value="low">{t('ai.low')}</MenuItem>
                      <MenuItem value="medium">{t('ai.medium')}</MenuItem>
                      <MenuItem value="high">{t('ai.high')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, minHeight: 400, maxHeight: 600 }}>
                {loading && insights.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : insights.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Lightbulb sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      {t('ai.noInsights')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('ai.description')}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {insights.map((insight) => (
                      <Card key={insight.id} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                              <Box sx={{ color: 'primary.main' }}>{getTypeIcon(insight.type)}</Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {insight.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                  <Chip label={t(`ai.${insight.type}`)} size="small" variant="outlined" />
                                  {insight.severity && (
                                    <Chip
                                      label={t(`ai.${insight.severity}`)}
                                      size="small"
                                      color={getSeverityColor(insight.severity)}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </Box>
                            {isAdmin && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteInsight(insight.id)}
                                sx={{
                                  border: '1px solid rgba(0,0,0,0.08)',
                                  '&:hover': {
                                    backgroundColor: 'error.main',
                                    color: 'white',
                                    borderColor: 'error.main',
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {insight.description}
                          </Typography>
                          {insight.recommendations && insight.recommendations.length > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                                {t('ai.recommendations')}:
                              </Typography>
                              <Stack spacing={0.5}>
                                {insight.recommendations.map((rec, idx) => (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                      • {rec}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                            {formatDate(insight.createdAt)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Generate Insight Dialog */}
      <Dialog
        open={generateInsightDialog}
        onClose={() => setGenerateInsightDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('ai.generateInsight')}
          <IconButton size="small" onClick={() => setGenerateInsightDialog(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>{t('ai.insightType')}</InputLabel>
              <Select
                value={insightType}
                label={t('ai.insightType')}
                onChange={(e) => setInsightType(e.target.value as any)}
              >
                <MenuItem value="financial">{t('ai.financial')}</MenuItem>
                <MenuItem value="performance">{t('ai.performance')}</MenuItem>
                <MenuItem value="attendance">{t('ai.attendance')}</MenuItem>
                <MenuItem value="risk">{t('ai.risk')}</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {t('ai.generateInsightDescription', { type: t(`ai.${insightType}`) })}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setGenerateInsightDialog(false)} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleGenerateInsight}
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : t('ai.generate')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIScreen;

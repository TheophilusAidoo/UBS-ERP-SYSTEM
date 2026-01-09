import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Stack,
  Divider,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import {
  Business,
  Email,
  Phone,
  Person,
  Folder,
  CalendarToday,
  AttachMoney,
  Message,
  Dashboard,
  TrendingUp,
  CheckCircle,
  Pending,
  Cancel,
  LocationOn,
  ContactMail,
  Settings,
  Lock,
  Logout,
  Edit,
  Visibility,
  VisibilityOff,
  Receipt,
  Description,
  Download,
  PictureAsPdf,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { clientService } from '../../services/client.service';
import { projectService } from '../../services/project.service';
import { invoiceService } from '../../services/invoice.service';
import { proposalService } from '../../services/proposal.service';
import { companyService } from '../../services/company.service';
import { invoicePDFService } from '../../services/invoice-pdf.service';
import { Client, Project, Invoice, Proposal, Company } from '../../types';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/auth.store';
import { useGlobalSettingsStore, Currency } from '../../store/global-settings.store';
import { useCurrency } from '../../hooks/useCurrency';
import { useLanguageStore } from '../../store/language.store';
import { useTheme } from '@mui/material/styles';
import { authService } from '../../services/auth.service';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const ClientDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const theme = useTheme();
  const { initializeSettings, currency, getCurrencySymbol } = useGlobalSettingsStore();
  const { currencySymbol } = useCurrency();
  const { initializeLanguage } = useLanguageStore();
  const [client, setClient] = useState<Client | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings/Profile state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [newName, setNewName] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Initialize global settings and language
  useEffect(() => {
    initializeSettings();
    initializeLanguage();
  }, [initializeSettings, initializeLanguage]);
  
  // Set initial name when client loads
  useEffect(() => {
    if (client) {
      setNewName(client.name);
    }
  }, [client]);
  
  // Calculate project statistics
  const projectStats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    onHold: projects.filter(p => p.status === 'on-hold').length,
    cancelled: projects.filter(p => p.status === 'cancelled').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  // Calculate invoice statistics
  const invoiceStats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending' || i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    overdue: invoices.filter(i => 
      i.dueDate && 
      new Date(i.dueDate) < new Date() && 
      i.status !== 'paid'
    ).length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
    pendingAmount: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0),
  };

  useEffect(() => {
    if (clientId) {
      fetchClient();
      fetchProjects();
      fetchCompanies();
    }
  }, [clientId]);

  useEffect(() => {
    if (client?.email) {
      fetchInvoices();
      fetchProposals();
    }
  }, [client?.email]);

  // Auto-update client currency if missing but invoices have currency
  useEffect(() => {
    const updateClientCurrencyIfNeeded = async () => {
      if (!client || !clientId) return;
      
      // If client has currency, no need to update
      if (client.currency) return;
      
      // If no invoices yet, wait
      if (invoices.length === 0) return;
      
      // Find the most common currency from invoices
      const currencyCounts: Record<string, number> = {};
      invoices.forEach(inv => {
        if (inv.currency) {
          currencyCounts[inv.currency] = (currencyCounts[inv.currency] || 0) + 1;
        }
      });
      
      const currencies = Object.keys(currencyCounts);
      if (currencies.length === 0) return;
      
      const mostCommonCurrency = currencies.reduce((a, b) => 
        currencyCounts[a] > currencyCounts[b] ? a : b
      );
      
      // Update client with the most common currency
      if (mostCommonCurrency) {
        try {
          await clientService.updateClient({ id: clientId, currency: mostCommonCurrency });
          // Refresh client data
          const updatedData = await clientService.getClient(clientId);
          if (updatedData) {
            setClient(updatedData);
          }
        } catch (updateErr) {
          console.warn('Could not update client currency:', updateErr);
        }
      }
    };
    
    updateClientCurrencyIfNeeded();
  }, [client, invoices, clientId]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const fetchClient = async () => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);
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

  const fetchProjects = async () => {
    if (!clientId) return;
    
    try {
      const data = await projectService.getProjects({ clientId });
      setProjects(data);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchInvoices = async () => {
    if (!client?.email) return;
    
    try {
      const data = await invoiceService.getInvoices({ clientEmail: client.email });
      setInvoices(data);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    }
  };

  const fetchProposals = async () => {
    if (!client?.email) return;
    
    try {
      const data = await proposalService.getProposals({ clientEmail: client.email });
      setProposals(data);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'primary';
      case 'on-hold':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setPasswordLoading(true);
    try {
      // Verify current password
      const { supabase } = await import('../../services/supabase');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: client?.email || '',
        password: passwordData.currentPassword,
      });
      
      if (signInError) {
        setPasswordError('Current password is incorrect');
        setPasswordLoading(false);
        return;
      }
      
      // Change password
      await authService.changePassword(passwordData.newPassword);
      
      setSnackbar({ open: true, message: 'Password changed successfully!', severity: 'success' });
      setChangePasswordOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError(null);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setSnackbar({ open: true, message: 'Name cannot be empty', severity: 'error' });
      return;
    }
    
    if (!clientId) return;
    
    setNameLoading(true);
    try {
      await clientService.updateClient({
        id: clientId,
        name: newName.trim(),
      });
      
      await fetchClient(); // Refresh client data
      setSnackbar({ open: true, message: 'Name updated successfully!', severity: 'success' });
      setEditNameOpen(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to update name', severity: 'error' });
    } finally {
      setNameLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Failed to logout. Please try again.', severity: 'error' });
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setDownloadingInvoice(invoice.id);
      setError(null);
      
      const company = companies.find(c => c.id === invoice.companyId) || client?.company;
      // Use invoice currency if available, otherwise client's preferred currency, otherwise system currency
      let invoiceCurrency = invoice.currency || client?.currency || currency;
      
      // If client doesn't have currency but has other invoices, use most common currency
      if (!invoiceCurrency || invoiceCurrency === currency) {
        const currencyCounts: Record<string, number> = {};
        invoices.forEach(inv => {
          if (inv.currency) {
            currencyCounts[inv.currency] = (currencyCounts[inv.currency] || 0) + 1;
          }
        });
        const mostCommonCurrency = Object.keys(currencyCounts).reduce((a, b) => 
          currencyCounts[a] > currencyCounts[b] ? a : b, Object.keys(currencyCounts)[0]
        );
        if (mostCommonCurrency) {
          invoiceCurrency = mostCommonCurrency;
        }
      }
      
      invoiceCurrency = (invoiceCurrency || currency).toUpperCase() as Currency;
      const invoiceCurrencySymbol = getCurrencySymbol(invoiceCurrency) || invoiceCurrency;
      
      const pdfData = {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientNumber: invoice.clientNumber,
        clientCountry: invoice.clientCountry,
        items: invoice.items,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        dueDate: invoice.dueDate,
        companyName: company?.name,
        companyAddress: company?.address,
        companyPhone: company?.phone,
        companyEmail: company?.email,
        companyLogo: company?.logo,
        signature: invoice.signature,
        signedBy: invoice.signedBy,
        currencySymbol: invoiceCurrencySymbol,
        currencyCode: invoiceCurrency,
        createdAt: invoice.createdAt,
        status: invoice.status,
      };
      
      const pdfBase64 = await invoicePDFService.generateInvoicePDFBase64(pdfData);
      
      // Convert base64 to blob and download
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: 'Invoice PDF downloaded successfully!', severity: 'success' });
    } catch (err: any) {
      console.error('Error downloading invoice:', err);
      setSnackbar({ open: true, message: err?.message || 'Failed to download invoice PDF', severity: 'error' });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const formatCurrency = (amount: number, invoiceCurrency?: string) => {
    // Priority: invoice currency > client's preferred currency > most common invoice currency > system currency
    let targetCurrency = invoiceCurrency || client?.currency || currency;
    
    // If client doesn't have currency but has invoices, use the most common invoice currency
    if (!targetCurrency || targetCurrency === currency) {
      if (invoices.length > 0 && !invoiceCurrency) {
        // Find the most common currency from invoices
        const currencyCounts: Record<string, number> = {};
        invoices.forEach(inv => {
          if (inv.currency) {
            currencyCounts[inv.currency] = (currencyCounts[inv.currency] || 0) + 1;
          }
        });
        const mostCommonCurrency = Object.keys(currencyCounts).reduce((a, b) => 
          currencyCounts[a] > currencyCounts[b] ? a : b, Object.keys(currencyCounts)[0]
        );
        if (mostCommonCurrency) {
          targetCurrency = mostCommonCurrency;
        }
      }
    }
    
    // Ensure currency is uppercase for proper matching
    targetCurrency = (targetCurrency || currency).toUpperCase() as Currency;
    
    // Get symbol - fallback to currency code if symbol not found
    const symbol = getCurrencySymbol(targetCurrency) || targetCurrency;
    
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading && !client) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Client not found'}
        </Alert>
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
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {client.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('client.dashboard.welcome')}, {client.name}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {client.company?.name || t('client.dashboard.title')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <LanguageSwitcher
                variant="contained"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.3)',
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  textTransform: 'none',
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  '& .MuiButton-startIcon': {
                    color: 'white',
                  },
                }}
              />
              <Button
                variant="contained"
                startIcon={<Message />}
                onClick={() => navigate(`/client/${clientId}/messages`)}
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
                {t('client.dashboard.messages')}
              </Button>
              <Button
                variant="contained"
                startIcon={<Settings />}
                onClick={() => setSettingsOpen(true)}
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
                {t('client.dashboard.settings')}
              </Button>
              <Button
                variant="contained"
                startIcon={<Logout />}
                onClick={handleLogout}
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
                {t('client.dashboard.logout')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3, mt: -4 }}>
        <Grid container spacing={3}>
          {/* Statistics Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Folder sx={{ color: 'primary.main', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {projectStats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.totalProjects')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {projectStats.completed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.completed')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'info.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp sx={{ color: 'info.main', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {projectStats.inProgress}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.inProgress')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'warning.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AttachMoney sx={{ color: 'warning.main', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {formatCurrency(projectStats.totalBudget, client?.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.totalBudget')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Invoice Statistics Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Receipt sx={{ color: 'primary.main' }} />
              {t('client.dashboard.invoiceOverview')}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Receipt sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                      {invoiceStats.total}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {t('client.dashboard.totalInvoices')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                      {invoiceStats.paid}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {t('client.dashboard.paidInvoices')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Pending sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                      {invoiceStats.pending}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {t('client.dashboard.pendingInvoices')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%', background: invoiceStats.overdue > 0 ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #fad961 0%, #f76b1c 100%)', color: 'white' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {invoiceStats.overdue > 0 ? (
                      <Cancel sx={{ color: 'white', fontSize: 28 }} />
                    ) : (
                      <TrendingUp sx={{ color: 'white', fontSize: 28 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                      {invoiceStats.overdue}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {invoiceStats.overdue > 0 ? t('client.dashboard.overdue') : t('client.dashboard.allUpToDate')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Client Information Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ContactMail sx={{ color: 'primary.main' }} />
                  {t('client.dashboard.contactInformation')}
                </Typography>
                <Stack spacing={3}>
                  {client.company && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            bgcolor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Business sx={{ fontSize: 20, color: 'white' }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {t('client.dashboard.company')}
                        </Typography>
                      </Stack>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', ml: 6.5 }}>
                        {client.company.name}
                      </Typography>
                    </Box>
                  )}

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'grey.50',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Email sx={{ fontSize: 20, color: 'white' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Email
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ fontWeight: 500, ml: 6.5, wordBreak: 'break-word', color: 'text.primary' }}>
                      {client.email}
                    </Typography>
                  </Box>

                  {client.phone && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            bgcolor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Phone sx={{ fontSize: 20, color: 'white' }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Phone
                        </Typography>
                      </Stack>
                      <Typography variant="body1" sx={{ fontWeight: 500, ml: 6.5, color: 'text.primary' }}>
                        {client.phone}
                      </Typography>
                    </Box>
                  )}

                  {client.contactPerson && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            bgcolor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Person sx={{ fontSize: 20, color: 'white' }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {t('client.dashboard.contactPerson')}
                        </Typography>
                      </Stack>
                      <Typography variant="body1" sx={{ fontWeight: 500, ml: 6.5, color: 'text.primary' }}>
                        {client.contactPerson}
                      </Typography>
                    </Box>
                  )}

                  {client.address && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            bgcolor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <LocationOn sx={{ fontSize: 20, color: 'white' }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Address
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ ml: 6.5, color: 'text.secondary', lineHeight: 1.6 }}>
                        {client.address}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ pt: 1 }}>
                    <Chip
                      label={client.isActive ? t('client.dashboard.activeClient') : t('client.dashboard.inactiveClient')}
                      size="medium"
                      color={client.isActive ? 'success' : 'default'}
                      sx={{ fontWeight: 600, px: 1 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Projects Section */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Dashboard sx={{ color: 'primary.main' }} />
                    {t('client.dashboard.myProjects')}
                  </Typography>
                  <Chip label={`${projects.length} ${projects.length === 1 ? 'Project' : 'Projects'}`} color="primary" variant="outlined" />
                </Box>

                {projects.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Folder sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      {t('client.dashboard.noProjectsYet')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.projectsWillAppear')}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1 }}>
                    <Stack spacing={2}>
                    {projects.map((project) => (
                      <Card
                        key={project.id}
                        sx={{
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s ease-in-out',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <Stack spacing={1}>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  {project.name}
                                </Typography>
                                {project.description && (
                                  <Typography variant="body2" color="text.secondary" sx={{ 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}>
                                    {project.description}
                                  </Typography>
                                )}
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                                <Chip
                                  icon={getStatusColor(project.status) === 'success' ? <CheckCircle /> : 
                                        getStatusColor(project.status) === 'primary' ? <TrendingUp /> :
                                        getStatusColor(project.status) === 'warning' ? <Pending /> : <Cancel />}
                                  label={project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                  size="medium"
                                  color={getStatusColor(project.status) as any}
                                  sx={{ fontWeight: 600 }}
                                />
                              </Stack>
                            </Grid>
                            <Grid item xs={12}>
                              <Divider sx={{ my: 1 }} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {t('client.dashboard.startDate')}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {project.startDate ? format(new Date(project.startDate), 'MMM dd, yyyy') : t('client.dashboard.notSet')}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {t('client.dashboard.endDate')}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {project.endDate ? format(new Date(project.endDate), 'MMM dd, yyyy') : t('client.dashboard.notSet')}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AttachMoney sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {t('client.dashboard.budget')}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {project.budget ? formatCurrency(project.budget, client?.currency) : t('client.dashboard.notSet')}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => navigate(`/client/${clientId}/messages`)}
                                  sx={{ textTransform: 'none', borderRadius: 2 }}
                                >
                                  {t('client.dashboard.contact')}
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Invoices Section */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt sx={{ color: 'primary.main' }} />
                    {t('client.dashboard.myInvoices')}
                  </Typography>
                  <Chip 
                    label={`${invoices.length} ${invoices.length === 1 ? 'Invoice' : 'Invoices'}`} 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                {invoices.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <PictureAsPdf sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.2, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      {t('client.dashboard.noInvoicesYet')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.invoicesWillAppear')}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>{t('client.dashboard.invoiceNumber')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t('common.date')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">{t('client.dashboard.amount')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">{t('common.status')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t('client.dashboard.dueDate')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">{t('common.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Receipt sx={{ fontSize: 18, color: 'primary.main' }} />
                                <Typography sx={{ fontWeight: 600 }}>{invoice.invoiceNumber}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack>
                                <Typography variant="body2">{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {format(new Date(invoice.createdAt), 'hh:mm a')}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1.1rem' }}>
                              {formatCurrency(invoice.total, invoice.currency)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                size="small"
                                color={
                                  invoice.status === 'paid' ? 'success' :
                                  invoice.status === 'sent' ? 'info' :
                                  invoice.status === 'pending' ? 'warning' : 'default'
                                }
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              {invoice.dueDate ? (
                                <Stack>
                                  <Typography variant="body2">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</Typography>
                                  {new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
                                    <Chip 
                                      label={t('client.dashboard.overdue')} 
                                      size="small" 
                                      color="error" 
                                      sx={{ mt: 0.5, fontSize: '0.7rem', height: 20 }}
                                    />
                                  )}
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleDownloadInvoice(invoice)}
                                disabled={downloadingInvoice === invoice.id}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'primary.main',
                                  '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                  },
                                }}
                                title="Download Invoice PDF"
                              >
                                {downloadingInvoice === invoice.id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <Download fontSize="small" />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Proposals Section */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description sx={{ color: 'primary.main' }} />
                    {t('client.dashboard.myProposals')}
                  </Typography>
                  <Chip label={`${proposals.length} ${proposals.length === 1 ? 'Proposal' : 'Proposals'}`} color="primary" variant="outlined" />
                </Box>

                {proposals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Description sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      {t('client.dashboard.noProposalsYet')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('client.dashboard.proposalsWillAppear')}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'background.default' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Proposal Number</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Valid Until</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {proposals.map((proposal) => (
                          <TableRow key={proposal.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{proposal.proposalNumber}</TableCell>
                            <TableCell>{format(new Date(proposal.createdAt), 'MMM dd, yyyy')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              ${proposal.total.toLocaleString()}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={proposal.status}
                                size="small"
                                color={
                                  proposal.status === 'accepted' ? 'success' :
                                  proposal.status === 'sent' ? 'info' :
                                  proposal.status === 'rejected' ? 'error' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {proposal.validUntil ? format(new Date(proposal.validUntil), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings sx={{ color: 'primary.main' }} />
          {t('client.dashboard.accountSettings')}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Profile Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ fontSize: 20, color: 'primary.main' }} />
                {t('client.dashboard.profileInformation')}
              </Typography>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Name
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                        <Typography variant="body1" sx={{ flex: 1, fontWeight: 500 }}>
                          {client.name}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => setEditNameOpen(true)}
                          sx={{ textTransform: 'none' }}
                        >
                          Edit
                        </Button>
                      </Stack>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Email
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>
                        {client.email}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Security Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lock sx={{ fontSize: 20, color: 'primary.main' }} />
                {t('client.dashboard.security')}
              </Typography>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setChangePasswordOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('client.dashboard.changePassword')}
                  </Button>
                </CardContent>
              </Card>
            </Box>

            {/* Logout Section */}
            <Box>
              <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'error.main' }}>
                <CardContent>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<Logout />}
                    onClick={handleLogout}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setSettingsOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => !passwordLoading && setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock sx={{ color: 'primary.main' }} />
          {t('client.dashboard.changePassword')}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError(null)}>
              {passwordError}
            </Alert>
          )}
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label={t('client.dashboard.currentPassword')}
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              disabled={passwordLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      edge="end"
                      size="small"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label={t('client.dashboard.newPassword')}
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              disabled={passwordLoading}
              helperText={t('client.dashboard.minimumCharacters')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      edge="end"
                      size="small"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label={t('client.dashboard.confirmNewPassword')}
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              disabled={passwordLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      edge="end"
                      size="small"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={() => {
              setChangePasswordOpen(false);
              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordError(null);
            }}
            disabled={passwordLoading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleChangePassword}
            disabled={passwordLoading}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {passwordLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : t('client.dashboard.changePassword')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog
        open={editNameOpen}
        onClose={() => !nameLoading && setEditNameOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit sx={{ color: 'primary.main' }} />
          {t('client.dashboard.editProfileName')}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={nameLoading}
            placeholder="Enter your name"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={() => {
              setEditNameOpen(false);
              setNewName(client?.name || '');
            }}
            disabled={nameLoading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpdateName}
            disabled={nameLoading}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {nameLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientDashboard;


import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Divider,
  Stack,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Description,
  Add,
  Edit,
  Delete,
  Refresh,
  Send,
  CheckCircle,
  Cancel,
  Visibility,
  Email,
  Business,
  AttachMoney,
  CalendarToday,
  History,
  CopyAll,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useCurrency } from '../../hooks/useCurrency';
import { proposalService, CreateProposalData, UpdateProposalData, CreateNewVersionData } from '../../services/proposal.service';
import { emailService } from '../../services/email.service';
import { exportService } from '../../utils/export.service';
import { companyService } from '../../services/company.service';
import { Proposal, ProposalItem, Company } from '../../types';

const ProposalsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [versionDialog, setVersionDialog] = useState<{ open: boolean; proposal: Proposal | null }>({
    open: false,
    proposal: null,
  });
  const [versionsDialog, setVersionsDialog] = useState<{ open: boolean; proposalNumber: string; versions: Proposal[] }>({
    open: false,
    proposalNumber: '',
    versions: [],
  });
  const [viewDialog, setViewDialog] = useState<{ open: boolean; proposal: Proposal | null }>({
    open: false,
    proposal: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; proposal: Proposal | null }>({
    open: false,
    proposal: null,
  });
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [statusFilter, setStatusFilter] = useState<'draft' | 'sent' | 'accepted' | 'rejected' | ''>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    companyId: '',
    clientName: '',
    clientEmail: '',
    proposalNumber: '',
    validUntil: '',
    items: [] as Array<Omit<ProposalItem, 'id'>>,
  });

  const [itemForm, setItemForm] = useState({
    description: '',
    quantity: '1',
    unitPrice: '0',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProposals();
    fetchCompanies(); // Both admin and staff need companies for logo
    setCurrentPage(1); // Reset to first page when filters change
  }, [statusFilter, companyFilter, tabValue]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (companyFilter) filters.companyId = companyFilter;
      if (!isAdmin && user) filters.createdBy = user.id;

      const data = await proposalService.getProposals(filters);
      setProposals(data);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.message || t('proposals.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      if (isAdmin) {
        const data = await companyService.getAllCompanies();
        setCompanies(data);
      } else if (user?.companyId) {
        // Staff can only see their own company
        const data = await companyService.getCompany(user.companyId);
        if (data) {
          setCompanies([data]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleOpenDialog = async (proposal?: Proposal) => {
    if (proposal) {
      setEditingProposal(proposal);
      setFormData({
        companyId: proposal.companyId,
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        proposalNumber: proposal.proposalNumber,
        validUntil: proposal.validUntil || '',
        items: proposal.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
    } else {
      setEditingProposal(null);
      const proposalNumber = await proposalService.generateProposalNumber();
      setFormData({
        companyId: user?.companyId || '',
        clientName: '',
        clientEmail: '',
        proposalNumber,
        validUntil: '',
        items: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProposal(null);
    setFormData({
      companyId: user?.companyId || '',
      clientName: '',
      clientEmail: '',
      proposalNumber: '',
      validUntil: '',
      items: [],
    });
    setItemForm({ description: '', quantity: '1', unitPrice: '0' });
  };

  const addItem = () => {
    if (!itemForm.description || !itemForm.quantity || !itemForm.unitPrice) {
      setError(t('common.pleaseFillAllFields') || 'Please fill in all item fields');
      return;
    }

    const quantity = parseFloat(itemForm.quantity);
    const unitPrice = parseFloat(itemForm.unitPrice);
    const total = quantity * unitPrice;

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: itemForm.description,
          quantity,
          unitPrice,
          total,
        },
      ],
    });

    setItemForm({ description: '', quantity: '1', unitPrice: '0' });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('User not found');
        return;
      }

      const total = calculateTotal();

      if (editingProposal) {
        const updateData: UpdateProposalData = {
          id: editingProposal.id,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          items: formData.items,
          total,
          validUntil: formData.validUntil || undefined,
        };
        await proposalService.updateProposal(updateData);
        setSuccess(t('proposals.proposalUpdated'));
      } else {
        const createData: CreateProposalData = {
          companyId: formData.companyId,
          createdBy: user.id,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          proposalNumber: formData.proposalNumber,
          items: formData.items,
          total,
          validUntil: formData.validUntil || undefined,
        };
        await proposalService.createProposal(createData);
        setSuccess(t('proposals.proposalCreated'));
      }

      setTimeout(() => setSuccess(null), 3000);
      handleCloseDialog();
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || t('proposals.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!versionDialog.proposal) return;
    try {
      setLoading(true);
      setError(null);

      const total = calculateTotal();
      const versionData: CreateNewVersionData = {
        proposalId: versionDialog.proposal.id,
        items: formData.items,
        total,
        validUntil: formData.validUntil || undefined,
      };

      await proposalService.createNewVersion(versionData);
      setSuccess(t('proposals.versionCreated'));
      setTimeout(() => setSuccess(null), 3000);
      setVersionDialog({ open: false, proposal: null });
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || t('proposals.failedToCreateVersion'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVersionDialog = (proposal: Proposal) => {
    setVersionDialog({ open: true, proposal });
    setFormData({
      companyId: proposal.companyId,
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      proposalNumber: proposal.proposalNumber,
      validUntil: proposal.validUntil || '',
      items: proposal.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });
  };

  const handleViewVersions = async (proposalNumber: string) => {
    try {
      setLoading(true);
      const versions = await proposalService.getProposalVersions(proposalNumber);
      setVersionsDialog({ open: true, proposalNumber, versions });
    } catch (err: any) {
      setError(err.message || t('proposals.failedToLoadVersions'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (proposalId: string, status: 'draft' | 'sent' | 'accepted' | 'rejected') => {
    try {
      setLoading(true);
      setError(null);
      await proposalService.updateProposalStatus(proposalId, status);
      setSuccess(t('proposals.proposalUpdated'));
      setTimeout(() => setSuccess(null), 3000);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || `Failed to update proposal status`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (proposal: Proposal) => {
    try {
      setLoading(true);
      setError(null);

      // Get company logo if company is selected
      const selectedCompany = companies.find(c => c.id === proposal.companyId);

      const result = await emailService.sendProposalEmail({
        clientEmail: proposal.clientEmail,
        clientName: proposal.clientName,
        proposalNumber: proposal.proposalNumber,
        version: proposal.version,
        total: proposal.total,
        validUntil: proposal.validUntil,
        items: proposal.items,
        companyLogo: selectedCompany?.logo,
        companyName: selectedCompany?.name,
        currencySymbol,
      });

      if (result.success) {
        await proposalService.updateProposalStatus(proposal.id, 'sent');
        setSuccess(result.message);
        setTimeout(() => setSuccess(null), 3000);
        await fetchProposals();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || t('proposals.failedToSend'));
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!deleteDialog.proposal) return;
    try {
      setLoading(true);
      setError(null);
      await proposalService.deleteProposal(deleteDialog.proposal.id);
      setSuccess(t('proposals.proposalDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, proposal: null });
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || t('proposals.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'sent':
        return 'info';
      case 'rejected':
        return 'error';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const total = calculateTotal();

  // Calculate summary stats
  const summary = {
    total: proposals.reduce((sum, prop) => sum + prop.total, 0),
    accepted: proposals.filter(prop => prop.status === 'accepted').reduce((sum, prop) => sum + prop.total, 0),
    draft: proposals.filter(prop => prop.status === 'draft').length,
    sent: proposals.filter(prop => prop.status === 'sent').length,
  };

  const filteredProposals = proposals.filter(prop => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return prop.status === 'draft';
    if (tabValue === 2) return prop.status === 'sent';
    if (tabValue === 3) return prop.status === 'accepted';
    if (tabValue === 4) return prop.status === 'rejected';
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProposals = filteredProposals.slice(startIndex, endIndex);

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('proposals.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('proposals.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('proposals.create')}
            </Button>
            <IconButton
              onClick={fetchProposals}
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <AttachMoney sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('proposals.total')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(summary.total)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <CheckCircle sx={{ fontSize: 32, color: 'success.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('proposals.accepted')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(summary.accepted)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Description sx={{ fontSize: 32, color: 'warning.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('proposals.draft')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {summary.draft}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Send sx={{ fontSize: 32, color: 'info.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('proposals.sent')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {summary.sent}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Grid container spacing={2}>
            {isAdmin && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('proposals.filterByCompany')}</InputLabel>
                  <Select
                    value={companyFilter}
                    label={t('proposals.filterByCompany')}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('companies.total')}</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('proposals.filterByStatus')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('proposals.filterByStatus')}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <MenuItem value="">{t('proposals.all')}</MenuItem>
                  <MenuItem value="draft">{t('proposals.draft')}</MenuItem>
                  <MenuItem value="sent">{t('proposals.sent')}</MenuItem>
                  <MenuItem value="accepted">{t('proposals.accepted')}</MenuItem>
                  <MenuItem value="rejected">{t('proposals.rejected')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={t('proposals.all')} />
            <Tab label={t('proposals.draft')} />
            <Tab label={t('proposals.sent')} />
            <Tab label={t('proposals.accepted')} />
            <Tab label={t('proposals.rejected')} />
          </Tabs>
        </Box>

        <TableContainer>
          {loading && proposals.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredProposals.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {t('proposals.noProposals')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tabValue === 0 ? t('proposals.description') : t('common.noResults')}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('proposals.proposalNumber')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('proposals.clientName')}</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 600 }}>{t('proposals.filterByCompany')}</TableCell>}
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t('proposals.total')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('proposals.versions')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('proposals.status')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('proposals.validUntil')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProposals.map((proposal) => (
                  <TableRow key={proposal.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Description sx={{ fontSize: 20, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {proposal.proposalNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {proposal.clientName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {proposal.clientEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {(() => {
                          const company = companies.find(c => c.id === proposal.companyId);
                          return company ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {company.logo ? (
                                <Box
                                  component="img"
                                  src={company.logo}
                                  alt={company.name}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    objectFit: 'contain',
                                    borderRadius: 0.5,
                                  }}
                                />
                              ) : (
                                <Business sx={{ fontSize: 20, color: 'text.secondary' }} />
                              )}
                              <Typography variant="body2">{company.name}</Typography>
                            </Box>
                          ) : (
                            <Chip label="N/A" size="small" variant="outlined" />
                          );
                        })()}
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(proposal.total)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`v${proposal.version}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={proposal.status}
                        size="small"
                        color={getStatusColor(proposal.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(proposal.validUntil)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={t('common.view')}>
                          <IconButton
                            size="small"
                            onClick={() => setViewDialog({ open: true, proposal })}
                            sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('proposals.versionHistory')}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewVersions(proposal.proposalNumber)}
                            sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {proposal.status === 'draft' && (
                          <>
                            <Tooltip title={t('common.edit')}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(proposal)}
                                sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('proposals.createNewVersion')}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenVersionDialog(proposal)}
                                sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
                              >
                                <CopyAll fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {proposal.status === 'draft' && (
                          <Tooltip title={t('proposals.send')}>
                            <IconButton
                              size="small"
                              onClick={() => handleSendEmail(proposal)}
                              sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
                            >
                              <Email fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {proposal.status === 'sent' && (
                          <>
                            <Tooltip title={t('proposals.accepted')}>
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateStatus(proposal.id, 'accepted')}
                                sx={{ border: '1px solid rgba(0,0,0,0.08)', color: 'success.main' }}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('proposals.rejected')}>
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateStatus(proposal.id, 'rejected')}
                                sx={{ border: '1px solid rgba(0,0,0,0.08)', color: 'error.main' }}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, proposal })}
                            sx={{ border: '1px solid rgba(0,0,0,0.08)', color: 'error.main' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Pagination */}
        {filteredProposals.length > itemsPerPage && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 3,
            borderTop: '1px solid rgba(0,0,0,0.08)'
          }}>
            <Typography variant="body2" color="text.secondary">
              Showing {startIndex + 1} - {Math.min(endIndex, filteredProposals.length)} of {filteredProposals.length} proposals
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                startIcon={<ChevronLeft />}
                sx={{ textTransform: 'none' }}
              >
                Previous
              </Button>
              <Typography variant="body2" sx={{ px: 2 }}>
                Page {currentPage} of {totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                endIcon={<ChevronRight />}
                sx={{ textTransform: 'none' }}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      {/* Create/Edit Proposal Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Description sx={{ color: 'primary.main' }} />
            <Typography variant="h6">
              {editingProposal ? t('proposals.update') : t('proposals.create')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {isAdmin ? (
              <FormControl fullWidth>
                <InputLabel>{t('proposals.filterByCompany')}</InputLabel>
                <Select
                  value={formData.companyId}
                  label={t('proposals.filterByCompany')}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {company.logo ? (
                          <Box
                            component="img"
                            src={company.logo}
                            alt={company.name}
                            sx={{
                              width: 24,
                              height: 24,
                              objectFit: 'contain',
                              borderRadius: 0.5,
                            }}
                          />
                        ) : (
                          <Business sx={{ fontSize: 20, color: 'text.secondary' }} />
                        )}
                        <Typography>{company.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Company</InputLabel>
                <Select
                  value={formData.companyId}
                  label="Company"
                  disabled
                  sx={{
                    '& .MuiSelect-select': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {company.logo ? (
                          <Box
                            component="img"
                            src={company.logo}
                            alt={company.name}
                            sx={{
                              width: 24,
                              height: 24,
                              objectFit: 'contain',
                              borderRadius: 0.5,
                            }}
                          />
                        ) : (
                          <Business sx={{ fontSize: 20, color: 'text.secondary' }} />
                        )}
                        <Typography>{company.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                  Your assigned company (auto-selected)
                </Typography>
              </FormControl>
            )}
            <TextField
              label={t('proposals.proposalNumber')}
              fullWidth
              value={formData.proposalNumber}
              disabled
              helperText="Proposal number is automatically generated by the system"
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: 'action.hover',
                },
              }}
              required
            />
            <TextField
              label={t('proposals.clientName')}
              fullWidth
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              required
            />
            <TextField
              label={t('proposals.clientEmail')}
              fullWidth
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              required
            />
            <TextField
              label={t('proposals.validUntil')}
              type="date"
              fullWidth
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <Divider />

            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('proposals.items')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={t('proposals.description')}
                fullWidth
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                size="small"
              />
              <TextField
                label={t('proposals.quantity')}
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                size="small"
                sx={{ width: 120 }}
              />
              <TextField
                label={t('proposals.price')}
                type="number"
                value={itemForm.unitPrice}
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                size="small"
                sx={{ width: 120 }}
              />
              <Button variant="outlined" onClick={addItem} sx={{ minWidth: 100 }}>
                {t('proposals.addItem')}
              </Button>
            </Box>

            {formData.items.length > 0 && (
              <TableContainer 
                component={Paper} 
                variant="outlined"
                sx={{ 
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow 
                        key={index}
                        hover
                        sx={{
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2">{item.description}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Typography variant="body2">{item.quantity}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Typography variant="body2">{formatCurrency(item.unitPrice)}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatCurrency(item.total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => removeItem(index)} 
                            color="error"
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 600, py: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {t('proposals.total')}:
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {formatCurrency(calculateTotal())}
                        </Typography>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              textTransform: 'none',
              borderRadius: 1.5,
              px: 3,
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.clientName || !formData.clientEmail || formData.items.length === 0}
            sx={{ 
              textTransform: 'none', 
              borderRadius: 1.5, 
              px: 3,
              minWidth: 120,
            }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Saving...' : editingProposal ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Proposal Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, proposal: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {viewDialog.proposal && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              {t('proposals.title')} {viewDialog.proposal.proposalNumber} - {t('proposals.versions')} {viewDialog.proposal.version}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('proposals.clientName')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {viewDialog.proposal.clientName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('proposals.clientEmail')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {viewDialog.proposal.clientEmail}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('proposals.status')}
                    </Typography>
                    <Chip
                      label={viewDialog.proposal.status}
                      size="small"
                      color={getStatusColor(viewDialog.proposal.status) as any}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('proposals.validUntil')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(viewDialog.proposal.validUntil)}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider />

                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('proposals.items')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('proposals.description')}</TableCell>
                        <TableCell align="right">{t('proposals.quantity')}</TableCell>
                        <TableCell align="right">{t('proposals.price')}</TableCell>
                        <TableCell align="right">{t('proposals.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewDialog.proposal.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                          {t('proposals.total')}:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {formatCurrency(viewDialog.proposal.total)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TableContainer>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setViewDialog({ open: false, proposal: null })} sx={{ textTransform: 'none' }}>
                {t('common.close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Versions Dialog */}
      <Dialog
        open={versionsDialog.open}
        onClose={() => setVersionsDialog({ open: false, proposalNumber: '', versions: [] })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t('proposals.versionHistory')} {versionsDialog.proposalNumber}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('proposals.versions')}</TableCell>
                  <TableCell>{t('proposals.status')}</TableCell>
                  <TableCell align="right">{t('proposals.total')}</TableCell>
                  <TableCell>{t('proposals.validUntil')}</TableCell>
                  <TableCell>{t('common.date')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versionsDialog.versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Chip label={`v${version.version}`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={version.status}
                        size="small"
                        color={getStatusColor(version.status) as any}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(version.total)}</TableCell>
                    <TableCell>{formatDate(version.validUntil)}</TableCell>
                    <TableCell>{formatDate(version.createdAt)}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => setViewDialog({ open: true, proposal: version })}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setVersionsDialog({ open: false, proposalNumber: '', versions: [] })}
            sx={{ textTransform: 'none' }}
          >
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New Version Dialog */}
      <Dialog
        open={versionDialog.open}
        onClose={() => setVersionDialog({ open: false, proposal: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t('proposals.createNewVersion')} (v{versionDialog.proposal ? versionDialog.proposal.version + 1 : 1})
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              {t('proposals.createVersion')}
            </Alert>

            <TextField
              label={t('proposals.validUntil')}
              type="date"
              fullWidth
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <Divider />

            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('proposals.items')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={t('proposals.description')}
                fullWidth
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                size="small"
              />
              <TextField
                label={t('proposals.quantity')}
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                size="small"
                sx={{ width: 120 }}
              />
              <TextField
                label={t('proposals.price')}
                type="number"
                value={itemForm.unitPrice}
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                size="small"
                sx={{ width: 120 }}
              />
              <Button variant="outlined" onClick={addItem} sx={{ minWidth: 100 }}>
                {t('proposals.addItem')}
              </Button>
            </Box>

            {formData.items.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('proposals.description')}</TableCell>
                      <TableCell align="right">{t('proposals.quantity')}</TableCell>
                      <TableCell align="right">{t('proposals.price')}</TableCell>
                      <TableCell align="right">{t('proposals.total')}</TableCell>
                      <TableCell align="center">{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => removeItem(index)} color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                        {t('proposals.total')}:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setVersionDialog({ open: false, proposal: null })} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreateVersion}
            variant="contained"
            disabled={loading || formData.items.length === 0}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : t('proposals.createVersion')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, proposal: null })}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('proposals.deleteProposal')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('proposals.areYouSureDelete')} <strong>{deleteDialog.proposal?.proposalNumber}</strong>? {t('common.thisActionCannotBeUndone')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteDialog({ open: false, proposal: null })} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProposalsScreen;


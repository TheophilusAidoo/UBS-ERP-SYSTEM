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
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
} from '@mui/material';
import {
  People,
  Refresh,
  Search,
  Email,
  Phone,
  Business,
  Person,
  Visibility,
  Add,
  Edit,
  Delete,
  Lock,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { clientService, CreateClientData, UpdateClientData } from '../../services/client.service';
import { companyService } from '../../services/company.service';
import { staffService } from '../../services/staff.service';
import { Client, Company, User } from '../../types';

const AdminClientsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  const [formData, setFormData] = useState({
    companyId: '',
    assignedTo: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    contactPerson: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
    fetchCompanies();
    fetchAllStaff();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchStaffByCompany(selectedCompany);
    }
  }, [selectedCompany]);

  useEffect(() => {
    let filtered = clients;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const name = c.name.toLowerCase();
        const email = c.email.toLowerCase();
        const company = c.company?.name?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || company.includes(query);
      });
    }

    if (companyFilter) {
      filtered = filtered.filter(c => c.companyId === companyFilter);
    }

    setFilteredClients(filtered);
  }, [searchQuery, companyFilter, clients]);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientService.getAllClients();
      setClients(data);
      setFilteredClients(data);
    } catch (err: any) {
      setError(err.message || t('common.errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const data = await staffService.getAllStaff();
      setAllStaff(data);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchStaffByCompany = async (companyId: string) => {
    try {
      const data = await staffService.getAllStaff({ companyId });
      setAllStaff(data);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setSelectedCompany(client.companyId);
      setFormData({
        companyId: client.companyId,
        assignedTo: client.assignedTo || '',
        name: client.name,
        email: client.email,
        password: '', // Don't show existing password
        phone: client.phone || '',
        address: client.address || '',
        contactPerson: client.contactPerson || '',
        notes: client.notes || '',
      });
    } else {
      setEditingClient(null);
      setSelectedCompany('');
      setFormData({
        companyId: '',
        assignedTo: '',
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        contactPerson: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setSelectedCompany('');
    setFormData({
      companyId: '',
      assignedTo: '',
      name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      contactPerson: '',
      notes: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.companyId) {
      setError(t('adminClients.nameRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingClient) {
        const updateData: UpdateClientData = {
          id: editingClient.id,
          name: formData.name,
          email: formData.email,
          assignedTo: formData.assignedTo || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          notes: formData.notes || undefined,
        };
        await clientService.updateClient(updateData);
        setSuccess(t('adminClients.clientUpdated'));
      } else {
        const createData: CreateClientData = {
          companyId: formData.companyId,
          assignedTo: formData.assignedTo || undefined,
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          notes: formData.notes || undefined,
        };
        await clientService.createClient(createData);
        setSuccess(t('adminClients.clientCreated'));
      }
      handleCloseDialog();
      fetchClients();
    } catch (err: any) {
      setError(err.message || t('adminClients.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.client) return;

    setLoading(true);
    try {
      await clientService.deleteClient(deleteDialog.client.id);
      setSuccess(t('adminClients.clientDeleted'));
      setDeleteDialog({ open: false, client: null });
      fetchClients();
    } catch (err: any) {
      setError(err.message || t('adminClients.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t('adminClients.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchClients}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            {t('adminClients.addClient')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder={t('adminClients.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>{t('adminClients.filterByCompany')}</InputLabel>
              <Select
                value={companyFilter}
                label={t('adminClients.filterByCompany')}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <MenuItem value="">{t('adminClients.allCompanies')}</MenuItem>
                {companies.filter(c => c.isActive).map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading && !clients.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {searchQuery || companyFilter ? t('common.noResults') : t('adminClients.noClientsFound')}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.clientName')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.email')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.phone')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.company')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.contactPerson')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.assignedTo')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('adminClients.createdBy')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('adminClients.status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('adminClients.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                            }}
                          >
                            {client.name[0].toUpperCase()}
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {client.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="body2">{client.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {client.phone ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2">{client.phone}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.company?.name ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Business sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {client.company.name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.contactPerson ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2">{client.contactPerson}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.assignedToUser ? (
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {client.assignedToUser.firstName} {client.assignedToUser.lastName}
                            {client.assignedToUser.jobTitle && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {client.assignedToUser.jobTitle}
                              </Typography>
                            )}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.createdByUser ? (
                          <Typography variant="body2">
                            {client.createdByUser.firstName} {client.createdByUser.lastName}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={client.isActive ? t('adminClients.active') : t('adminClients.inactive')}
                          size="small"
                          color={client.isActive ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => navigate(`/client/${client.id}`)}
                            title="View Dashboard"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(client)}
                            title={t('adminClients.editClient')}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, client })}
                            title={t('adminClients.deleteClient')}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {editingClient ? t('adminClients.updateClient') : t('adminClients.createClient')}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                label={`${t('adminClients.company')} *`}
                fullWidth
                required
                select
                SelectProps={{ native: true }}
                value={formData.companyId}
                onChange={(e) => {
                  setFormData({ ...formData, companyId: e.target.value });
                  setSelectedCompany(e.target.value);
                  setFormData(prev => ({ ...prev, assignedTo: '' })); // Reset assigned staff when company changes
                }}
                disabled={!!editingClient}
              >
                <option value="">{t('common.select') || 'Select'} {t('adminClients.company')}</option>
                {companies.filter(c => c.isActive).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign to Staff (Optional)</InputLabel>
                <Select
                  value={formData.assignedTo}
                  label="Assign to Staff (Optional)"
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                >
                  <MenuItem value="">No Assignment</MenuItem>
                  {allStaff
                    .filter(s => !formData.companyId || s.companyId === formData.companyId)
                    .map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} {staff.jobTitle && `(${staff.jobTitle})`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={`${t('adminClients.clientName')} *`}
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('adminClients.name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={`${t('adminClients.email')} *`}
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('adminClients.email')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={`${t('adminClients.password')} (${t('common.optional') || 'Optional'})`}
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('adminClients.password')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('adminClients.phone')}
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('adminClients.phone')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('adminClients.contactPerson')}
                fullWidth
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder={t('adminClients.contactPerson')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('adminClients.address')}
                fullWidth
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('adminClients.address')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={t('adminClients.notes')}
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('adminClients.notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || !formData.email || !formData.companyId}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={20} /> : editingClient ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, client: null })}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('adminClients.deleteClient')}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t('adminClients.areYouSureDelete')} <strong>{deleteDialog.client?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('adminClients.thisActionCannotBeUndone')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, client: null })}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={20} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminClientsScreen;


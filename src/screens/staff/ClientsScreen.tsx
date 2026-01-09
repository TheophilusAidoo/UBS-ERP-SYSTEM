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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Divider,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Delete,
  Refresh,
  Search,
  Email,
  Phone,
  Business,
  Person,
  Visibility,
  Message,
  Lock,
  VisibilityOff,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { clientService, CreateClientData, UpdateClientData } from '../../services/client.service';
import { companyService } from '../../services/company.service';
import { staffService } from '../../services/staff.service';
import { Client, Company, User } from '../../types';
import { useAuthStore } from '../../store/auth.store';

const ClientsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    companyId: user?.companyId || '',
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
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(c => {
        const name = c.name.toLowerCase();
        const email = c.email.toLowerCase();
        const company = c.company?.name?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || company.includes(query);
      });
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
    setCurrentPage(1); // Reset to first page when search or clients change
  }, [searchQuery, clients]);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      // Staff can only see clients from their company
      const data = user?.companyId 
        ? await clientService.getClientsByCompany(user.companyId)
        : await clientService.getAllClients({ isActive: true });
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

  const canAssignStaff = user?.isSubAdmin === true;

  const fetchStaff = async () => {
    if (!user?.companyId || !canAssignStaff) return;
    try {
      const data = await staffService.getAllStaff({ companyId: user.companyId });
      // Filter out current user
      setAllStaff(data.filter(s => s.id !== user?.id));
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleOpenDialog = (client?: Client) => {
    // Fetch staff if sub-admin and opening dialog
    if (user?.isSubAdmin && user?.companyId) {
      fetchStaff();
    }
    
    if (client) {
      setEditingClient(client);
      setFormData({
        companyId: client.companyId,
        assignedTo: canAssignStaff ? (client.assignedTo || '') : '',
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
      setFormData({
        companyId: user?.companyId || '',
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
    setFormData({
      companyId: user?.companyId || '',
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
      setError('Name, email, and company are required');
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
          assignedTo: canAssignStaff ? (formData.assignedTo || undefined) : undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          notes: formData.notes || undefined,
        };
        await clientService.updateClient(updateData);
        setSuccess('Client updated successfully!');
      } else {
        const createData: CreateClientData = {
          companyId: formData.companyId,
          assignedTo: canAssignStaff ? (formData.assignedTo || undefined) : undefined,
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          notes: formData.notes || undefined,
        };
        await clientService.createClient(createData);
        setSuccess('Client created successfully!');
      }
      handleCloseDialog();
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.client) return;

    setLoading(true);
    try {
      await clientService.deleteClient(deleteDialog.client.id);
      setSuccess('Client deleted successfully!');
      setDeleteDialog({ open: false, client: null });
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to delete client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Clients
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
            Add Client
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
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search clients by name, email, or company..."
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
          </Box>

          {loading && !clients.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {searchQuery ? t('common.noResults') : 'No clients found'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery ? 'Try a different search term' : 'Start by adding your first client'}
              </Typography>
              {!searchQuery && (
                <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<Add />}>
                  Add Client
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Client Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Company</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Contact Person</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Assigned To</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredClients
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((client) => (
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
                      <TableCell align="center">
                        <Chip
                          label={client.isActive ? 'Active' : 'Inactive'}
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
                            color="success"
                            onClick={() => navigate(`/messages?clientId=${client.id}`)}
                            title="Message Client"
                          >
                            <Message fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(client)}
                            title="Edit Client"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, client })}
                            title="Delete Client"
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
              {filteredClients.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                  <Pagination
                    count={Math.ceil(filteredClients.length / itemsPerPage)}
                    page={currentPage}
                    onChange={(_, value) => setCurrentPage(value)}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
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
          {editingClient ? 'Edit Client' : 'Add New Client'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                label="Company *"
                fullWidth
                required
                select
                SelectProps={{ native: true }}
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                disabled={!!editingClient || !!user?.companyId}
                helperText={user?.companyId ? 'Company is set based on your account' : 'Select the company this client belongs to'}
              >
                <option value="">Select Company</option>
                {companies.filter(c => c.isActive).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </TextField>
            </Grid>
            {canAssignStaff && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Assign to Staff (Optional)</InputLabel>
                  <Select
                    value={formData.assignedTo}
                    label="Assign to Staff (Optional)"
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  >
                    <MenuItem value="">No Assignment</MenuItem>
                    {allStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} {staff.jobTitle && `(${staff.jobTitle})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Client Name *"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client Company Name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email *"
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
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
                label="Password (Optional - for client login)"
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave empty if client won't login"
                helperText={editingClient ? "Leave empty to keep existing password" : "Minimum 6 characters. Client can use this to log in."}
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
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
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
                label="Contact Person"
                fullWidth
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="John Doe"
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
                label="Address"
                fullWidth
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, City, Country"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the client..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || !formData.email || !formData.companyId}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={20} /> : editingClient ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, client: null })}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Client</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{deleteDialog.client?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. All associated projects and messages will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, client: null })}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientsScreen;


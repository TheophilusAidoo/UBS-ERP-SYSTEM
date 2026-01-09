import React, { useState, useEffect } from 'react';
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
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Print,
  Delete,
  Edit,
  Refresh,
  Flight,
  LocalShipping,
  Search,
  Visibility,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { deliveryService } from '../../services/delivery.service';
import { Delivery, DeliveryType, DeliveryStatus } from '../../types';
import { format } from 'date-fns';
import { deliveryPDFService } from '../../services/delivery-pdf.service';
import { companyService } from '../../services/company.service';
import { Company } from '../../types';

const AdminDeliveriesScreen: React.FC = () => {
  const { t } = useTranslation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewDialog, setViewDialog] = useState<{ open: boolean; delivery: Delivery | null }>({
    open: false,
    delivery: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; delivery: Delivery | null }>({
    open: false,
    delivery: null,
  });

  useEffect(() => {
    fetchCompanies();
    fetchDeliveries();
  }, [tabValue, companyFilter, statusFilter]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {
        deliveryType: tabValue === 0 ? 'air' : 'sea',
      };
      if (companyFilter) filters.companyId = companyFilter;
      if (statusFilter) filters.status = statusFilter;

      const data = await deliveryService.getDeliveries(filters);
      setDeliveries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.delivery) return;
    setLoading(true);
    try {
      await deliveryService.deleteDelivery(deleteDialog.delivery.id);
      setSuccess(t('adminDelivery.deliveryDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, delivery: null });
      fetchDeliveries();
    } catch (err: any) {
      setError(err.message || t('adminDelivery.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (delivery: Delivery) => {
    try {
      await deliveryPDFService.generateDeliveryPDF(delivery);
    } catch (err: any) {
      setError(err.message || 'Failed to generate PDF');
    }
  };

  const handleUpdateStatus = async (delivery: Delivery, status: DeliveryStatus) => {
    setLoading(true);
    try {
      await deliveryService.updateDelivery(delivery.id, { status });
      setSuccess(t('adminDelivery.deliveryStatusUpdated'));
      setTimeout(() => setSuccess(null), 3000);
      fetchDeliveries();
    } catch (err: any) {
      setError(err.message || t('adminDelivery.failedToUpdateStatus'));
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        delivery.clientName.toLowerCase().includes(query) ||
        delivery.destination.toLowerCase().includes(query) ||
        delivery.senderPhone?.toLowerCase().includes(query) ||
        delivery.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_transit':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('adminDelivery.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchDeliveries}
          sx={{ textTransform: 'none' }}
        >
          {t('adminDelivery.refresh')}
        </Button>
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

      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab
            icon={<Flight />}
            iconPosition="start"
            label={t('adminDelivery.airDeliveries')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            icon={<LocalShipping />}
            iconPosition="start"
            label={t('adminDelivery.seaDeliveries')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('adminDelivery.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('adminDelivery.company')}</InputLabel>
                <Select
                  value={companyFilter}
                  label={t('adminDelivery.company')}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <MenuItem value="">{t('adminDelivery.allCompanies')}</MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('adminDelivery.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('adminDelivery.status')}
                  onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | '')}
                >
                  <MenuItem value="">{t('adminDelivery.allStatuses')}</MenuItem>
                  <MenuItem value="pending">{t('adminDelivery.pending')}</MenuItem>
                  <MenuItem value="in_transit">{t('adminDelivery.inTransit')}</MenuItem>
                  <MenuItem value="delivered">{t('adminDelivery.delivered')}</MenuItem>
                  <MenuItem value="cancelled">{t('adminDelivery.cancelled')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredDeliveries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {t('adminDelivery.noDeliveriesFound')}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.date')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.senderName')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.senderNumber')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.departure')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.destination')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.items')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('adminDelivery.company')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">
                      {t('adminDelivery.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id} hover>
                      <TableCell>{format(new Date(delivery.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{delivery.clientName}</TableCell>
                      <TableCell>{delivery.senderPhone || '-'}</TableCell>
                      <TableCell>{delivery.departure}</TableCell>
                      <TableCell>{delivery.destination}</TableCell>
                      <TableCell>{delivery.items.length} {delivery.items.length === 1 ? t('adminDelivery.item') : t('adminDelivery.itemsPlural')}</TableCell>
                      <TableCell>
                        <Chip
                          label={delivery.status.replace('_', ' ')}
                          color={getStatusColor(delivery.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{delivery.company?.name || '-'}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton size="small" onClick={() => setViewDialog({ open: true, delivery })}>
                            <Visibility />
                          </IconButton>
                          <IconButton size="small" onClick={() => handlePrint(delivery)} color="primary">
                            <Print />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, delivery })}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, delivery: null })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t('adminDelivery.deliveryDetails')} - {viewDialog.delivery?.clientName}
        </DialogTitle>
        <DialogContent>
          {viewDialog.delivery && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(new Date(viewDialog.delivery.date), 'MMM dd, yyyy')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Delivery Type
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewDialog.delivery.deliveryType === 'air' ? 'Air ✈️' : 'Sea'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Sender Name
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewDialog.delivery.clientName}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Sender Number
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewDialog.delivery.senderPhone || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Departure
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewDialog.delivery.departure}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Destination
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {viewDialog.delivery.destination}
                </Typography>
              </Grid>
              {viewDialog.delivery.sizeKgVolume && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Size/Kg/Volume
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewDialog.delivery.sizeKgVolume}
                  </Typography>
                </Grid>
              )}
              {viewDialog.delivery.estimateArrivalDate && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estimate Arrival Date
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {format(new Date(viewDialog.delivery.estimateArrivalDate), 'MMM dd, yyyy')}
                  </Typography>
                </Grid>
              )}
              {viewDialog.delivery.receiverDetails && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Receiver Details
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewDialog.delivery.receiverDetails}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Items
                </Typography>
                <Stack spacing={1}>
                  {viewDialog.delivery.items.map((item, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.picture && (
                          <Box
                            component="img"
                            src={item.picture}
                            alt={item.name}
                            sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 1, mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                      value={viewDialog.delivery.status}
                      onChange={(e) =>
                        handleUpdateStatus(viewDialog.delivery!, e.target.value as DeliveryStatus)
                      }
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_transit">In Transit</MenuItem>
                      <MenuItem value="delivered">Delivered</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, delivery: null })} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          {viewDialog.delivery && (
            <Button
              onClick={() => handlePrint(viewDialog.delivery!)}
              variant="contained"
              startIcon={<Print />}
              sx={{ textTransform: 'none' }}
            >
              Print
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, delivery: null })}>
        <DialogTitle>Delete Delivery?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this delivery? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, delivery: null })} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{ textTransform: 'none' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDeliveriesScreen;


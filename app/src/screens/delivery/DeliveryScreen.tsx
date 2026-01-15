import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Input,
  useTheme,
} from '@mui/material';
import {
  Add,
  Print,
  Delete,
  Edit,
  Refresh,
  Flight,
  LocalShipping,
  Image as ImageIcon,
  Close,
  CloudUpload,
  CalendarToday,
  Person,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { deliveryService, CreateDeliveryData } from '../../services/delivery.service';
import { Delivery, DeliveryItem, DeliveryType, DeliveryStatus } from '../../types';
import { format } from 'date-fns';
import { deliveryPDFService } from '../../services/delivery-pdf.service';

const DeliveryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; delivery: Delivery | null }>({
    open: false,
    delivery: null,
  });

  const [formData, setFormData] = useState({
    deliveryType: 'air' as DeliveryType,
    date: format(new Date(), 'yyyy-MM-dd'),
    clientName: '',
    senderPhone: '',
    items: [] as DeliveryItem[],
    sizeKgVolume: '',
    departure: 'Dubai' as 'Dubai' | 'China',
    destination: '',
    receiverDetails: '',
    estimateArrivalDate: '',
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    picture: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, [tabValue]);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryService.getDeliveries({
        createdBy: user?.id,
        deliveryType: tabValue === 0 ? 'air' : 'sea',
      });
      setDeliveries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (delivery?: Delivery) => {
    if (delivery) {
      setEditingDelivery(delivery);
        setFormData({
          deliveryType: delivery.deliveryType,
          date: delivery.date,
          clientName: delivery.clientName,
          senderPhone: delivery.senderPhone || '',
          items: delivery.items,
          sizeKgVolume: delivery.sizeKgVolume || '',
          departure: delivery.departure,
          destination: delivery.destination,
          receiverDetails: delivery.receiverDetails || '',
          estimateArrivalDate: delivery.estimateArrivalDate || '',
        });
      } else {
        setEditingDelivery(null);
        setFormData({
          deliveryType: tabValue === 0 ? 'air' : 'sea',
          date: format(new Date(), 'yyyy-MM-dd'),
          clientName: '',
          senderPhone: '',
        items: [],
        sizeKgVolume: '',
        departure: 'Dubai',
        destination: '',
        receiverDetails: '',
        estimateArrivalDate: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDelivery(null);
    setItemForm({ name: '', picture: '' });
    setItemImageFile(null);
    setItemImagePreview(null);
    // Clear file input
    const fileInput = document.getElementById('item-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleItemImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setItemImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setItemImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addItem = async () => {
    if (!itemForm.name.trim()) {
      setError('Please enter item name');
      return;
    }

    let pictureUrl = itemForm.picture;

    // Upload image if a file is selected
    if (itemImageFile) {
      try {
        setUploadingImage(true);
        pictureUrl = await deliveryService.uploadItemImage({ file: itemImageFile });
        setSuccess('Image uploaded successfully');
        setTimeout(() => setSuccess(null), 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to upload image');
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    setFormData({
      ...formData,
      items: [...formData.items, { name: itemForm.name, picture: pictureUrl || undefined }],
    });
    setItemForm({ name: '', picture: '' });
    setItemImageFile(null);
    setItemImagePreview(null);
    
    // Clear file input
    const fileInput = document.getElementById('item-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.clientName || !formData.destination || formData.items.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editingDelivery) {
        await deliveryService.updateDelivery(editingDelivery.id, {
          date: formData.date,
          clientName: formData.clientName,
          senderPhone: formData.senderPhone || undefined,
          items: formData.items,
          sizeKgVolume: formData.sizeKgVolume || undefined,
          departure: formData.departure,
          destination: formData.destination,
          receiverDetails: formData.receiverDetails || undefined,
          estimateArrivalDate: formData.estimateArrivalDate || undefined,
        });
        setSuccess('Delivery updated successfully');
      } else {
        const createData: CreateDeliveryData = {
          companyId: user?.companyId || '',
          createdBy: user?.id || '',
          deliveryType: formData.deliveryType,
          date: formData.date,
          clientName: formData.clientName,
          senderPhone: formData.senderPhone || undefined,
          items: formData.items,
          sizeKgVolume: formData.sizeKgVolume || undefined,
          departure: formData.departure,
          destination: formData.destination,
          receiverDetails: formData.receiverDetails || undefined,
          estimateArrivalDate: formData.estimateArrivalDate || undefined,
        };
        await deliveryService.createDelivery(createData);
        setSuccess('Delivery created successfully');
      }
      setTimeout(() => setSuccess(null), 3000);
      handleCloseDialog();
      fetchDeliveries();
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.delivery) return;
    setLoading(true);
    try {
      await deliveryService.deleteDelivery(deleteDialog.delivery.id);
      setSuccess('Delivery deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, delivery: null });
      fetchDeliveries();
    } catch (err: any) {
      setError(err.message || 'Failed to delete delivery');
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
      setSuccess('Delivery status updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchDeliveries();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'pending':
        return '#FFA726';
      case 'in_transit':
        return '#42A5F5';
      case 'delivered':
        return '#66BB6A';
      case 'cancelled':
        return '#EF5350';
      default:
        return '#78909C';
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 3, px: { xs: 2, sm: 3 } }}>
      {/* Header Section */}
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
              Delivery
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('delivery.description') || 'Manage air and sea delivery bookings'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
              }}
            >
              New Delivery
            </Button>
            <IconButton
              onClick={fetchDeliveries}
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

      <Card sx={{ 
        mb: 3, 
        borderRadius: 3, 
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f8fafc' }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 64,
                fontSize: '0.95rem',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<Flight />}
              iconPosition="start"
              label="Air Delivery ✈️"
              sx={{ gap: 1 }}
            />
            <Tab
              icon={<LocalShipping />}
              iconPosition="start"
              label="Sea Delivery 🚢"
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Box>
      </Card>

      {loading && !deliveries.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : deliveries.length === 0 ? (
        <Card sx={{ 
          borderRadius: 3, 
          border: '1px solid rgba(0,0,0,0.08)', 
          textAlign: 'center', 
          py: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <CardContent>
            <Box sx={{ 
              width: 120, 
              height: 120, 
              borderRadius: '50%', 
              backgroundColor: theme.palette.primary.light + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}>
              {tabValue === 0 ? (
                <Flight sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
              ) : (
                <LocalShipping sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
              )}
            </Box>
            <Typography variant="h5" color="text.primary" sx={{ mb: 1, fontWeight: 600 }}>
              {t('delivery.noDeliveries') || `No ${tabValue === 0 ? 'Air' : 'Sea'} Deliveries`}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              {t('delivery.createFirst') || `Create your first ${tabValue === 0 ? 'air' : 'sea'} delivery booking to get started`}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => handleOpenDialog()} 
              startIcon={<Add />}
              size="large"
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                },
              }}
            >
              {t('delivery.createDelivery') || 'Create Delivery'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {deliveries.map((delivery) => (
            <Grid item xs={12} sm={6} lg={4} key={delivery.id} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                    transform: 'translateY(-6px)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                {/* Header with gradient */}
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    p: 2.5,
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                        {delivery.clientName}
                      </Typography>
                      <Chip
                        label={delivery.deliveryType === 'air' ? '✈️ Air Delivery' : '🚢 Sea Delivery'}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          fontWeight: 600,
                          backdropFilter: 'blur(10px)',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handlePrint(delivery)}
                        sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                      >
                        <Print fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(delivery)}
                        sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, delivery })}
                        sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Status Selector */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Status
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={delivery.status}
                        onChange={(e) => handleUpdateStatus(delivery, e.target.value as DeliveryStatus)}
                        disabled={loading}
                        sx={{
                          bgcolor: getStatusColor(delivery.status),
                          color: 'white',
                          fontWeight: 600,
                          '& .MuiSelect-select': {
                            color: 'white',
                            py: 1.5,
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: getStatusColor(delivery.status),
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: getStatusColor(delivery.status),
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: getStatusColor(delivery.status),
                          },
                          '& .MuiSvgIcon-root': {
                            color: 'white',
                          },
                        }}
                      >
                        <MenuItem value="pending">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: '#FFA726',
                              }}
                            />
                            <span>Pending</span>
                          </Box>
                        </MenuItem>
                        <MenuItem value="in_transit">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: '#42A5F5',
                              }}
                            />
                            <span>In Transit</span>
                          </Box>
                        </MenuItem>
                        <MenuItem value="delivered">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: '#66BB6A',
                              }}
                            />
                            <span>Delivered</span>
                          </Box>
                        </MenuItem>
                        <MenuItem value="cancelled">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: '#EF5350',
                              }}
                            />
                            <span>Cancelled</span>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Delivery Details */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'grey.50',
                          height: '100%',
                        }}
                      >
                        <CalendarToday sx={{ fontSize: 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Date
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {format(new Date(delivery.date), 'MMM dd, yyyy')}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    {delivery.senderPhone && (
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            height: '100%',
                          }}
                        >
                          <Person sx={{ fontSize: 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Sender Phone
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {delivery.senderPhone}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'grey.50',
                        }}
                      >
                        <Flight sx={{ fontSize: 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Route
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {delivery.departure} → {delivery.destination}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    {delivery.sizeKgVolume && (
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            height: '100%',
                          }}
                        >
                          <LocalShipping sx={{ fontSize: 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Size/Kg/Volume
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {delivery.sizeKgVolume}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {delivery.estimateArrivalDate && (
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            height: '100%',
                          }}
                        >
                          <CalendarToday sx={{ fontSize: 24, color: 'primary.main', mt: 0.5, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Est. Arrival
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {format(new Date(delivery.estimateArrivalDate), 'MMM dd, yyyy')}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {delivery.receiverDetails && (
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Receiver Details
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                            {delivery.receiverDetails}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  {/* Items with Pictures */}
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        mb: 2.5,
                        fontSize: '1.1rem',
                        lineHeight: 1.5,
                        display: 'block',
                      }}
                    >
                      Items ({delivery.items.length})
                    </Typography>
                    {delivery.items.length > 0 ? (
                      <Grid container spacing={2}>
                        {delivery.items.map((item, index) => (
                          <Grid item xs={12} sm={6} key={index}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 2,
                                borderRadius: 2.5,
                                border: '1px solid rgba(0,0,0,0.1)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                                  transform: 'translateY(-3px)',
                                  borderColor: 'primary.main',
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                {item.picture ? (
                                  <Box
                                    component="img"
                                    src={item.picture}
                                    alt={item.name}
                                    sx={{
                                      width: 120,
                                      height: 120,
                                      objectFit: 'cover',
                                      borderRadius: 2,
                                      border: '2px solid rgba(0,0,0,0.08)',
                                      flexShrink: 0,
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 120,
                                      height: 120,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: 'grey.100',
                                      borderRadius: 2,
                                      border: '2px dashed rgba(0,0,0,0.2)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <ImageIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                                  </Box>
                                )}
                                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 600,
                                      mb: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: 'vertical',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {item.name}
                                  </Typography>
                                  <Chip
                                    label={`Item ${index + 1}`}
                                    size="small"
                                    sx={{
                                      bgcolor: 'primary.light',
                                      color: 'primary.contrastText',
                                      fontWeight: 600,
                                      width: 'fit-content',
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 4,
                          textAlign: 'center',
                          borderRadius: 2.5,
                          bgcolor: 'grey.50',
                          border: '1px dashed rgba(0,0,0,0.2)',
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1.5, opacity: 0.5 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No items added to this delivery
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          } 
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700, 
          pb: 2,
          pt: 3,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#f8fafc',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              {formData.deliveryType === 'air' ? (
                <Flight />
              ) : (
                <LocalShipping />
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingDelivery 
                ? (t('delivery.editDelivery') || 'Edit Delivery')
                : `New ${formData.deliveryType === 'air' ? 'Air' : 'Sea'} Delivery`
              }
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('delivery.date') || 'Date'}
                  type="date"
                  fullWidth
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('delivery.senderName') || 'Sender Name *'}
                  fullWidth
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('delivery.senderPhone') || 'Sender Phone Number'}
                  fullWidth
                  value={formData.senderPhone}
                  onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                  placeholder="+1234567890"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('delivery.departure') || 'Departure'}</InputLabel>
                  <Select
                    value={formData.departure}
                    label={t('delivery.departure') || 'Departure'}
                    onChange={(e) => setFormData({ ...formData, departure: e.target.value as 'Dubai' | 'China' })}
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    <MenuItem value="Dubai">Dubai</MenuItem>
                    <MenuItem value="China">China</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={t('delivery.destination') || 'Destination *'}
                  fullWidth
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('delivery.sizeKgVolume') || 'Size/Kg/Volume'}
                  fullWidth
                  value={formData.sizeKgVolume}
                  onChange={(e) => setFormData({ ...formData, sizeKgVolume: e.target.value })}
                  placeholder="e.g., 50kg, 2m³"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('delivery.estimateArrival') || 'Estimate Date of Arrival'}
                  type="date"
                  fullWidth
                  value={formData.estimateArrivalDate}
                  onChange={(e) => setFormData({ ...formData, estimateArrivalDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={t('delivery.receiverDetails') || 'Receiver Details'}
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.receiverDetails}
                  onChange={(e) => setFormData({ ...formData, receiverDetails: e.target.value })}
                  placeholder={t('delivery.receiverPlaceholder') || 'Receiver name, address, phone, etc.'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5, fontSize: '1.1rem' }}>
                {t('delivery.items') || 'Items (Name / Pictures) *'}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: 1.5, 
                mb: 2.5, 
                flexWrap: 'wrap', 
                alignItems: 'flex-start',
              }}>
                <TextField
                  label={t('delivery.itemName') || 'Item Name'}
                  size="small"
                  sx={{ 
                    flex: 1, 
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                />
                <Input
                  id="item-image-upload"
                  type="file"
                  inputProps={{ accept: 'image/*' }}
                  onChange={handleItemImageSelect}
                  sx={{ display: 'none' }}
                />
                <label htmlFor="item-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    size="small"
                    startIcon={<CloudUpload />}
                    disabled={uploadingImage}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: 2,
                      fontWeight: 600,
                      px: 2,
                    }}
                  >
                    {itemImageFile ? (t('delivery.changeImage') || 'Change Image') : (t('delivery.uploadImage') || 'Upload Image')}
                  </Button>
                </label>
                {itemImagePreview && (
                  <Box
                    component="img"
                    src={itemImagePreview}
                    alt="Preview"
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      objectFit: 'cover', 
                      borderRadius: 2, 
                      border: '2px solid',
                      borderColor: 'primary.main',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                )}
                <Button
                  variant="contained"
                  onClick={addItem}
                  disabled={!itemForm.name.trim() || uploadingImage}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                    px: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    },
                  }}
                  startIcon={uploadingImage ? <CircularProgress size={16} color="inherit" /> : <Add />}
                >
                  {uploadingImage ? (t('common.uploading') || 'Uploading...') : (t('common.add') || 'Add')}
                </Button>
              </Box>
              {!itemImageFile && (
                <TextField
                  label={t('delivery.pictureUrl') || 'Or enter Picture URL (optional)'}
                  size="small"
                  fullWidth
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                  value={itemForm.picture}
                  onChange={(e) => setItemForm({ ...itemForm, picture: e.target.value })}
                  placeholder="https://..."
                />
              )}
              {formData.items.length > 0 && (
                <Stack spacing={1}>
                  {formData.items.map((item, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
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
                          {!item.picture && (
                            <Box
                              sx={{
                                width: 50,
                                height: 50,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                              }}
                            >
                              <ImageIcon sx={{ color: 'text.secondary' }} />
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.name}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => removeItem(index)} color="error">
                          <Delete />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          pt: 2, 
          gap: 1.5,
          borderTop: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#f8fafc',
        }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.clientName || !formData.destination || formData.items.length === 0}
            sx={{ 
              textTransform: 'none', 
              borderRadius: 2,
              px: 4,
              py: 1,
              minWidth: 140,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              },
              '&:disabled': {
                opacity: 0.6,
              },
            }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading 
              ? (t('common.saving') || 'Saving...') 
              : editingDelivery 
                ? (t('common.update') || 'Update') 
                : (t('common.create') || 'Create')
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, delivery: null })}
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          } 
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700,
          pb: 2,
          pt: 3,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}>
          {t('delivery.deleteConfirm') || 'Delete Delivery?'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
            {t('delivery.deleteMessage') || 'Are you sure you want to delete this delivery? This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          pt: 2, 
          gap: 1.5,
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}>
          <Button 
            onClick={() => setDeleteDialog({ open: false, delivery: null })} 
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
            }}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained" 
            disabled={loading}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 4,
              py: 1,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              },
            }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? (t('common.deleting') || 'Deleting...') : (t('common.delete') || 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeliveryScreen;


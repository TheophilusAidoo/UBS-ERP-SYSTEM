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
  Switch,
  FormControlLabel,
  InputAdornment,
  Divider,
  Grid,
} from '@mui/material';
import {
  Business,
  Add,
  Edit,
  Delete,
  Refresh,
  Search,
  Email,
  Phone,
  LocationOn,
  CloudUpload,
  Image as ImageIcon,
  Close,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { companyService, CreateCompanyData, UpdateCompanyData, UploadCompanyLogoData } from '../../services/company.service';
import { Company } from '../../types';

const CompaniesScreen: React.FC = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: Company | null }>({
    open: false,
    company: null,
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    isActive: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = companies.filter(company => {
        const name = company.name.toLowerCase();
        const email = company.email?.toLowerCase() || '';
        const phone = company.phone?.toLowerCase() || '';
        const address = company.address?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || phone.includes(query) || address.includes(query);
      });
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await companyService.getAllCompanies();
      setCompanies(data);
      setFilteredCompanies(data);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError(err.message || t('companies.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        logo: company.logo || '',
        isActive: company.isActive,
      });
      setLogoPreview(company.logo || null);
      setLogoFile(null);
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        logo: '',
        isActive: true,
      });
      setLogoPreview(null);
      setLogoFile(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      logo: '',
      isActive: true,
    });
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError(t('common.pleaseSelectImageFile'));
        return;
      }
      setLogoFile(file);
      setError(null); // Clear any previous errors
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setLogoPreview(preview);
        // Also update formData with the preview (temporary until upload)
        setFormData({ ...formData, logo: preview });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData({ ...formData, logo: '' });
    // Clear the file input
    const fileInput = document.getElementById('logo-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      let logoUrl = formData.logo || null;

      // Upload logo if a new file is selected
      if (logoFile) {
        setUploadingLogo(true);
        try {
          let companyId: string;
          
          if (editingCompany) {
            // For existing company, use its ID
            companyId = editingCompany.id;
          } else {
            // For new company, create it first without logo
            const newCompany = await companyService.createCompany({
              name: formData.name,
              address: formData.address || undefined,
              phone: formData.phone || undefined,
              email: formData.email || undefined,
              isActive: formData.isActive,
            });
            companyId = newCompany.id;
          }

          // Upload the logo
          logoUrl = await companyService.uploadLogo({
            companyId,
            file: logoFile,
          });

          // Update company with logo URL
          const updatedCompany = await companyService.updateCompany({
            id: companyId,
            logo: logoUrl,
          });

          setSuccess(editingCompany ? t('companies.updatedSuccessfully') : t('companies.createdSuccessfully'));
          setTimeout(() => setSuccess(null), 3000);
          handleCloseDialog();
          await fetchCompanies();
          return;
        } catch (uploadError: any) {
          console.error('Error uploading logo:', uploadError);
          setError(uploadError.message || t('companies.failedToUploadLogo'));
          setUploadingLogo(false);
          setLoading(false);
          return;
        }
      }

      // If no logo file, just create/update company normally
      // Use formData.logo if it exists (for existing logos), otherwise use logoUrl
      const finalLogoUrl = formData.logo && formData.logo.trim() !== '' ? formData.logo : (logoUrl || undefined);
      
      if (editingCompany) {
        const updateData: UpdateCompanyData = {
          id: editingCompany.id,
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          logo: finalLogoUrl,
          isActive: formData.isActive,
        };
        await companyService.updateCompany(updateData);
        setSuccess(t('companies.updatedSuccessfully'));
      } else {
        const createData: CreateCompanyData = {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          logo: finalLogoUrl,
          isActive: formData.isActive,
        };
        await companyService.createCompany(createData);
        setSuccess(t('companies.createdSuccessfully'));
      }

      setTimeout(() => setSuccess(null), 3000);
      handleCloseDialog();
      await fetchCompanies();
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.message || t('companies.failedToSave'));
    } finally {
      setLoading(false);
      setUploadingLogo(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.company) return;
    try {
      setLoading(true);
      setError(null);
      await companyService.deleteCompany(deleteDialog.company.id);
      setSuccess(t('companies.deletedSuccessfully'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, company: null });
      await fetchCompanies();
    } catch (err: any) {
      setError(err.message || t('companies.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const activeCount = companies.filter(c => c.isActive).length;
  const inactiveCount = companies.length - activeCount;

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('companies.management')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('companies.description')}
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
              }}
            >
              {t('companies.add')}
            </Button>
            <IconButton 
              onClick={fetchCompanies} 
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

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 2, 
                  backgroundColor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Business sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {companies.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('companies.total')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 2, 
                  backgroundColor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Business sx={{ fontSize: 28, color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {activeCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('companies.active')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 2, 
                  backgroundColor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Business sx={{ fontSize: 28, color: 'text.secondary' }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {inactiveCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('companies.inactive')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder={t('common.search') + '...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('companies.title')}
            </Typography>
            <Chip 
              label={`${filteredCompanies.length} ${filteredCompanies.length === 1 ? 'company' : 'companies'}`} 
              size="small" 
              sx={{ ml: 'auto' }}
            />
          </Box>
          <Divider />
          
          {loading && companies.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredCompanies.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Business sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {searchQuery ? t('common.noResults') : t('common.noData')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery ? t('common.search') + '...' : t('companies.description')}
              </Typography>
              {!searchQuery && (
                <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<Add />}>
                  {t('companies.add')}
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('companies.logo')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('companies.name')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('common.email')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('companies.address')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('common.status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow 
                      key={company.id} 
                      hover
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell>
                        {company.logo ? (
                          <Box
                            component="img"
                            src={company.logo}
                            alt={`${company.name} logo`}
                            sx={{
                              width: 50,
                              height: 50,
                              objectFit: 'contain',
                              borderRadius: 1,
                              border: '1px solid rgba(0,0,0,0.08)',
                              p: 0.5,
                              backgroundColor: 'background.paper',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 50,
                              height: 50,
                              borderRadius: 1,
                              border: '1px dashed rgba(0,0,0,0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'action.hover',
                            }}
                          >
                            <ImageIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {company.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {company.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {company.email}
                              </Typography>
                            </Box>
                          )}
                          {company.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {company.phone}
                              </Typography>
                            </Box>
                          )}
                          {!company.email && !company.phone && (
                            <Typography variant="body2" color="text.secondary">
                              No contact info
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {company.address ? (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, maxWidth: 300 }}>
                            <LocationOn sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {company.address}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={company.isActive ? t('common.active') : t('common.inactive')}
                          color={company.isActive ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(company)}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'white',
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, company })}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'error.light',
                                color: 'white',
                              },
                            }}
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
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {editingCompany ? t('companies.update') : t('companies.create')}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label={t('companies.name')}
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('companies.name')}
            />
            
            {/* Logo Upload */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {t('companies.logo')}
              </Typography>
              {logoPreview ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    component="img"
                    src={logoPreview}
                    alt="Company logo preview"
                    sx={{
                      width: 120,
                      height: 120,
                      objectFit: 'contain',
                      borderRadius: 2,
                      border: '2px solid rgba(0,0,0,0.08)',
                      p: 1,
                      backgroundColor: 'background.paper',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveLogo}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: 'error.main',
                      color: 'white',
                      '&:hover': { backgroundColor: 'error.dark' },
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed rgba(0,0,0,0.12)',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => document.getElementById('logo-upload-input')?.click()}
                >
                  <input
                    id="logo-upload-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoSelect}
                  />
                  <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('common.upload')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PNG, JPG up to 5MB
                  </Typography>
                </Box>
              )}
              {!logoPreview && (
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={() => document.getElementById('logo-upload-input')?.click()}
                  sx={{ mt: 1 }}
                  size="small"
                >
                  {t('companies.uploadLogo')}
                </Button>
              )}
            </Box>
            <TextField
              label={t('common.email')}
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('common.email')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label={t('common.phone')}
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('common.phone')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label={t('companies.address')}
              multiline
              rows={3}
              fullWidth
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('companies.address')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', pt: 1 }}>
                    <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'action.hover', 
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.08)',
            }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {t('common.status')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formData.isActive ? t('common.active') : t('common.inactive')}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : editingCompany ? t('companies.update') : t('companies.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, company: null })}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('common.delete')} {t('companies.title')}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: 2, 
              backgroundColor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Delete sx={{ fontSize: 24, color: 'error.main' }} />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                {t('common.areYouSure')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{deleteDialog.company?.name}</strong> {t('common.thisActionCannotBeUndone')}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, company: null })}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="contained" 
            color="error" 
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompaniesScreen;

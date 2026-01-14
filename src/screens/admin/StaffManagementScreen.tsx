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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  InputAdornment,
  Divider,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Delete,
  Refresh,
  Search,
  Email,
  Work,
  Business,
  Event,
  Lock,
  Visibility,
  VisibilityOff,
  AttachMoney,
  CalendarToday,
  Block,
  CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { staffService, CreateStaffData, UpdateStaffData } from '../../services/staff.service';
import { companyService } from '../../services/company.service';
import { leaveService } from '../../services/leave.service';
import { authService } from '../../services/auth.service';
import { User, Company } from '../../types';
import { JOB_TITLES } from '../../constants';

const StaffManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const [staff, setStaff] = useState<User[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; staff: User | null }>({
    open: false,
    staff: null,
  });
  const [banDialog, setBanDialog] = useState<{ open: boolean; staff: User | null }>({
    open: false,
    staff: null,
  });
  const [leaveBalanceDialog, setLeaveBalanceDialog] = useState<{ open: boolean; staffId: string | null; forAll: boolean }>({
    open: false,
    staffId: null,
    forAll: false,
  });
  const [changePasswordDialog, setChangePasswordDialog] = useState<{ open: boolean; staff: User | null }>({
    open: false,
    staff: null,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    companyId: '',
    isSubAdmin: false,
    salaryAmount: '',
    salaryDate: '',
  });

  const [leaveBalanceFormData, setLeaveBalanceFormData] = useState({
    annualTotal: 20,
    sickTotal: 10,
    emergencyTotal: 5,
  });

  useEffect(() => {
    fetchStaff();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = staff.filter(s => {
        const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        const email = s.email.toLowerCase();
        const jobTitle = s.jobTitle?.toLowerCase() || '';
        const company = s.company?.name?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || jobTitle.includes(query) || company.includes(query);
      });
      setFilteredStaff(filtered);
    } else {
      setFilteredStaff(staff);
    }
  }, [searchQuery, staff]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getAllStaff();
      setStaff(data);
      setFilteredStaff(data);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      setError(err.message || 'Failed to load staff');
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

  const handleOpenDialog = (staffMember?: User) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        email: staffMember.email,
        password: '',
        firstName: staffMember.firstName || '',
        lastName: staffMember.lastName || '',
        jobTitle: staffMember.jobTitle || '',
        companyId: staffMember.companyId || '',
        isSubAdmin: staffMember.isSubAdmin || false,
        salaryAmount: staffMember.salaryAmount?.toString() || '',
        salaryDate: staffMember.salaryDate?.toString() || '',
      });
    } else {
      setEditingStaff(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        jobTitle: '',
        companyId: '',
        isSubAdmin: false,
        salaryAmount: '',
        salaryDate: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStaff(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      jobTitle: '',
      companyId: '',
      isSubAdmin: false,
      salaryAmount: '',
      salaryDate: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (editingStaff) {
        const updateData: UpdateStaffData = {
          id: editingStaff.id,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          jobTitle: formData.jobTitle || undefined,
          companyId: formData.companyId || undefined,
          isSubAdmin: formData.isSubAdmin,
          salaryAmount: formData.salaryAmount ? parseFloat(formData.salaryAmount) : undefined,
          salaryDate: formData.salaryDate ? parseInt(formData.salaryDate, 10) : undefined,
        };
        await staffService.updateStaff(updateData);
        setSuccess('Staff member updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
        handleCloseDialog();
        await fetchStaff();
      } else {
        if (!formData.password) {
          setError('Password is required for new staff members');
          setLoading(false);
          return;
        }
        if (!formData.email) {
          setError('Email is required');
          setLoading(false);
          return;
        }
        const createData: CreateStaffData = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          jobTitle: formData.jobTitle || undefined,
          companyId: formData.companyId && formData.companyId.trim() !== '' ? formData.companyId : undefined,
          isSubAdmin: formData.isSubAdmin,
          salaryAmount: formData.salaryAmount ? parseFloat(formData.salaryAmount) : undefined,
          salaryDate: formData.salaryDate ? parseInt(formData.salaryDate, 10) : undefined,
        };
        
        // Create staff - this is the essential operation that must complete
        const newStaff = await staffService.createStaff(createData);
        
        // Check if company assignment was skipped (staff created but without company)
        const companyWasSkipped = formData.companyId && formData.companyId.trim() !== '' && !newStaff.companyId;
        
        // Immediately provide feedback to user
        setLoading(false);
        handleCloseDialog();
        
        let successMessage = `✅ Staff member created successfully!\n\nThey can now login immediately with:\n📧 Email: ${formData.email}\n🔑 Password: ${formData.password}`;
        
        if (companyWasSkipped) {
          successMessage += `\n\n⚠️ Note: Company assignment was skipped due to permissions. You can assign a company later by editing the staff member.`;
        }
        
        successMessage += `\n\nNote: Make sure "Enable email confirmations" is disabled in Supabase Dashboard > Authentication > Settings for immediate login.`;
        
        setSuccess(successMessage);
        setTimeout(() => setSuccess(null), 6000);
        
        // Refresh staff list in background (non-blocking)
        (async () => {
          try {
            await fetchStaff();
          } catch (fetchError) {
            console.warn('Failed to refresh staff list:', fetchError);
          }
        })();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || t('staff.failedToSave'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.staff) return;
    try {
      setLoading(true);
      setError(null);
      await staffService.deleteStaff(deleteDialog.staff.id);
      setSuccess(t('staff.deletedSuccessfully'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, staff: null });
      await fetchStaff();
    } catch (err: any) {
      setError(err.message || t('staff.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const handleBanStaff = async () => {
    if (!banDialog.staff) return;
    try {
      setLoading(true);
      setError(null);
      await staffService.banStaff(banDialog.staff.id);
      setSuccess(`Staff member ${banDialog.staff.firstName || banDialog.staff.email} has been banned successfully. They will not be able to login.`);
      setTimeout(() => setSuccess(null), 5000);
      setBanDialog({ open: false, staff: null });
      await fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to ban staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanStaff = async (staffId: string) => {
    try {
      setLoading(true);
      setError(null);
      await staffService.unbanStaff(staffId);
      setSuccess('Staff member has been unbanned successfully. They can now login again.');
      setTimeout(() => setSuccess(null), 5000);
      await fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to unban staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLeaveBalanceDialog = async (staffId?: string) => {
    if (staffId) {
      // Load current balance for individual staff
      try {
        const balance = await leaveService.getLeaveBalance(staffId);
        setLeaveBalanceFormData({
          annualTotal: balance.annual?.total ?? 20,
          sickTotal: balance.sick?.total ?? 10,
          emergencyTotal: balance.emergency?.total ?? 5,
        });
      } catch (err) {
        // Use defaults if balance doesn't exist
        setLeaveBalanceFormData({
          annualTotal: 20,
          sickTotal: 10,
          emergencyTotal: 5,
        });
      }
    } else {
      setLeaveBalanceFormData({
        annualTotal: 20,
        sickTotal: 10,
        emergencyTotal: 5,
      });
    }
    setLeaveBalanceDialog({ open: true, staffId: staffId || null, forAll: !staffId });
  };

  const handleUpdateLeaveBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      if (leaveBalanceDialog.forAll) {
        // Update all staff
        const allStaffIds = staff.map(s => s.id);
        for (const staffId of allStaffIds) {
          await leaveService.updateLeaveBalance({
            userId: staffId,
            annualTotal: leaveBalanceFormData.annualTotal,
            sickTotal: leaveBalanceFormData.sickTotal,
            emergencyTotal: leaveBalanceFormData.emergencyTotal,
          });
        }
        setSuccess(t('staff.leaveBalanceUpdated'));
      } else if (leaveBalanceDialog.staffId) {
        // Update individual staff
        await leaveService.updateLeaveBalance({
          userId: leaveBalanceDialog.staffId,
          annualTotal: leaveBalanceFormData.annualTotal,
          sickTotal: leaveBalanceFormData.sickTotal,
          emergencyTotal: leaveBalanceFormData.emergencyTotal,
        });
        const staffMember = staff.find(s => s.id === leaveBalanceDialog.staffId);
        setSuccess(t('staff.leaveBalanceUpdated'));
      }

      setTimeout(() => setSuccess(null), 3000);
      setLeaveBalanceDialog({ open: false, staffId: null, forAll: false });
    } catch (err: any) {
      setError(err.message || t('staff.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('staff.management')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('staff.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Event />}
              onClick={() => handleOpenLeaveBalanceDialog()}
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('staff.setLeaveBalance')}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('staff.add')}
            </Button>
            <IconButton 
              onClick={fetchStaff} 
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
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontWeight: 500 }}>
            {success}
          </Typography>
        </Alert>
      )}

      {/* Statistics Card */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
              <People sx={{ fontSize: 28, color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {staff.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('staff.title')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search staff by name, email, job title, or company..."
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

      {/* Staff Table */}
      <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <People sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Staff Members
            </Typography>
            <Chip 
              label={`${filteredStaff.length} ${filteredStaff.length === 1 ? 'member' : 'members'}`} 
              size="small" 
              sx={{ ml: 'auto' }}
            />
          </Box>
          <Divider />
          
          {loading && staff.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredStaff.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {searchQuery ? t('common.noResults') : t('common.noData')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery ? t('common.search') + '...' : t('staff.description')}
              </Typography>
              {!searchQuery && (
                <Button variant="contained" onClick={() => handleOpenDialog()} startIcon={<Add />}>
                  {t('staff.add')}
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('staff.fullName')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('common.email')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('staff.jobTitle')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('staff.company')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('common.status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStaff.map((staffMember) => (
                    <TableRow 
                      key={staffMember.id} 
                      hover
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                            {staffMember.firstName?.[0]?.toUpperCase() || staffMember.email[0].toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {staffMember.firstName && staffMember.lastName
                                ? `${staffMember.firstName} ${staffMember.lastName}`
                                : staffMember.email}
                            </Typography>
                            {staffMember.firstName && staffMember.lastName && (
                              <Typography variant="caption" color="text.secondary">
                                {staffMember.email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {staffMember.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {staffMember.jobTitle ? (
                          <Chip 
                            label={staffMember.jobTitle} 
                            size="small" 
                            icon={<Work sx={{ fontSize: 14 }} />}
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {staffMember.company?.name ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Business sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {staffMember.company.name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Unassigned</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {staffMember.isBanned ? (
                          <Chip 
                            label="Banned" 
                            size="small" 
                            color="error"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : staffMember.isSubAdmin ? (
                          <Chip 
                            label={t('staff.isSubAdmin')} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">Staff</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(staffMember)}
                            sx={{
                              border: '1px solid rgba(0,0,0,0.08)',
                              '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                                borderColor: 'primary.main',
                              },
                            }}
                            title="Edit Staff"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenLeaveBalanceDialog(staffMember.id)}
                            sx={{
                              border: '1px solid rgba(0,0,0,0.08)',
                              '&:hover': {
                                backgroundColor: 'info.main',
                                color: 'white',
                                borderColor: 'info.main',
                              },
                            }}
                            title="Set Leave Balance"
                          >
                            <Event fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setChangePasswordDialog({ open: true, staff: staffMember })}
                            sx={{
                              border: '1px solid rgba(0,0,0,0.08)',
                              '&:hover': {
                                backgroundColor: 'warning.main',
                                color: 'white',
                                borderColor: 'warning.main',
                              },
                            }}
                            title="Change Password"
                          >
                            <Lock fontSize="small" />
                          </IconButton>
                          {staffMember.isBanned ? (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleUnbanStaff(staffMember.id)}
                              sx={{
                                border: '1px solid rgba(0,0,0,0.08)',
                                '&:hover': {
                                  backgroundColor: 'success.main',
                                  color: 'white',
                                  borderColor: 'success.main',
                                },
                              }}
                              title="Unban Staff"
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setBanDialog({ open: true, staff: staffMember })}
                              sx={{
                                border: '1px solid rgba(0,0,0,0.08)',
                                '&:hover': {
                                  backgroundColor: 'error.main',
                                  color: 'white',
                                  borderColor: 'error.main',
                                },
                              }}
                              title="Ban Staff"
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, staff: staffMember })}
                            sx={{
                              border: '1px solid rgba(0,0,0,0.08)',
                              '&:hover': {
                                backgroundColor: 'error.main',
                                color: 'white',
                                borderColor: 'error.main',
                              },
                            }}
                            title="Delete Staff"
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
          {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label={t('common.email')}
              type="email"
              fullWidth
              required
              disabled={!!editingStaff}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="staff@example.com"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              helperText={editingStaff ? 'Email cannot be changed' : 'Required for login'}
            />
            {!editingStaff && (
              <TextField
                label={t('auth.password')}
                type="password"
                fullWidth
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                helperText="Minimum 6 characters"
              />
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('staff.firstName')}
                fullWidth
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
              />
              <TextField
                label={t('staff.lastName')}
                fullWidth
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>{t('staff.jobTitle')}</InputLabel>
              <Select
                value={formData.jobTitle}
                label={t('staff.jobTitle')}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                startAdornment={
                  <InputAdornment position="start">
                    <Work sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">None</MenuItem>
                {JOB_TITLES.map((title) => (
                  <MenuItem key={title} value={title}>
                    {title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('staff.company')} (Admin Only)</InputLabel>
              <Select
                value={formData.companyId}
                label={t('staff.company')}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                startAdornment={
                  <InputAdornment position="start">
                    <Business sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">Unassigned</MenuItem>
                {companies.filter(c => c.isActive).map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Only administrators can assign or change company assignments
              </Typography>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Monthly Salary"
                type="number"
                fullWidth
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                placeholder="0.00"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                helperText="Monthly salary amount"
              />
              <TextField
                label="Salary Date"
                type="number"
                fullWidth
                value={formData.salaryDate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 31)) {
                    setFormData({ ...formData, salaryDate: value });
                  }
                }}
                placeholder="Day (1-31)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                helperText="Day of month (1-31)"
                inputProps={{ min: 1, max: 31 }}
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isSubAdmin}
                  onChange={(e) => setFormData({ ...formData, isSubAdmin: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Sub Admin
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Allow this staff member to assign team members to projects
                  </Typography>
                </Box>
              }
            />
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
            disabled={loading || !formData.email || (!editingStaff && !formData.password)}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : editingStaff ? t('staff.update') : t('staff.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ban Confirmation Dialog */}
      <Dialog 
        open={banDialog.open} 
        onClose={() => setBanDialog({ open: false, staff: null })}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Ban Staff Member</DialogTitle>
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
              <Block sx={{ fontSize: 24, color: 'error.main' }} />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                Are you sure you want to ban this staff member?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{banDialog.staff?.firstName && banDialog.staff?.lastName
                  ? `${banDialog.staff.firstName} ${banDialog.staff.lastName}`
                  : banDialog.staff?.email}</strong> will not be able to login to the system. You can unban them later if needed.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBanDialog({ open: false, staff: null })}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleBanStaff} 
            variant="contained" 
            color="error" 
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Ban Staff'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, staff: null })}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('common.delete')} {t('staff.title')}</DialogTitle>
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
                Are you sure you want to delete this staff member?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{deleteDialog.staff?.firstName && deleteDialog.staff?.lastName
                  ? `${deleteDialog.staff.firstName} ${deleteDialog.staff.lastName}`
                  : deleteDialog.staff?.email}</strong> will be permanently removed. This action cannot be undone.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, staff: null })}>
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

      {/* Leave Balance Dialog */}
      <Dialog
        open={leaveBalanceDialog.open}
        onClose={() => setLeaveBalanceDialog({ open: false, staffId: null, forAll: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {leaveBalanceDialog.forAll ? t('staff.setForAll') : t('staff.setLeaveBalance')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            {!leaveBalanceDialog.forAll && leaveBalanceDialog.staffId && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Setting leave balance for: {staff.find(s => s.id === leaveBalanceDialog.staffId)?.firstName}{' '}
                {staff.find(s => s.id === leaveBalanceDialog.staffId)?.lastName || staff.find(s => s.id === leaveBalanceDialog.staffId)?.email}
              </Alert>
            )}
            {leaveBalanceDialog.forAll && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                This will update leave balances for ALL staff members. Existing used leave days will be preserved.
              </Alert>
            )}
            <TextField
              label={`${t('staff.annualLeave')} ${t('staff.total')} (${t('staff.days')})`}
              type="number"
              fullWidth
              required
              value={leaveBalanceFormData.annualTotal}
              onChange={(e) => setLeaveBalanceFormData({ ...leaveBalanceFormData, annualTotal: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
              helperText={`${t('staff.total')} ${t('staff.annualLeave')} ${t('staff.days')} ${t('common.available') || 'available'}`}
            />
            <TextField
              label={`${t('staff.sickLeave')} ${t('staff.total')} (${t('staff.days')})`}
              type="number"
              fullWidth
              required
              value={leaveBalanceFormData.sickTotal}
              onChange={(e) => setLeaveBalanceFormData({ ...leaveBalanceFormData, sickTotal: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
              helperText={`${t('staff.total')} ${t('staff.sickLeave')} ${t('staff.days')} ${t('common.available') || 'available'}`}
            />
            <TextField
              label={`${t('staff.emergencyLeave')} ${t('staff.total')} (${t('staff.days')})`}
              type="number"
              fullWidth
              required
              value={leaveBalanceFormData.emergencyTotal}
              onChange={(e) => setLeaveBalanceFormData({ ...leaveBalanceFormData, emergencyTotal: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
              helperText={`${t('staff.total')} ${t('staff.emergencyLeave')} ${t('staff.days')} ${t('common.available') || 'available'}`}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setLeaveBalanceDialog({ open: false, staffId: null, forAll: false })}
            sx={{ textTransform: 'none' }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleUpdateLeaveBalance}
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : t('common.update')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordDialog.open}
        onClose={() => !loading && setChangePasswordDialog({ open: false, staff: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Change Password for {changePasswordDialog.staff?.firstName && changePasswordDialog.staff?.lastName
            ? `${changePasswordDialog.staff.firstName} ${changePasswordDialog.staff.lastName}`
            : changePasswordDialog.staff?.email}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPasswordError(null)}>
              {passwordError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              disabled={loading}
              helperText="Minimum 6 characters"
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
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              disabled={loading}
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={() => {
              setChangePasswordDialog({ open: false, staff: null });
              setPasswordData({ newPassword: '', confirmPassword: '' });
              setPasswordError(null);
            }}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setPasswordError(null);
              
              if (!passwordData.newPassword || !passwordData.confirmPassword) {
                setPasswordError('Please fill in all fields');
                return;
              }
              
              if (passwordData.newPassword.length < 6) {
                setPasswordError('Password must be at least 6 characters');
                return;
              }
              
              if (passwordData.newPassword !== passwordData.confirmPassword) {
                setPasswordError('Passwords do not match');
                return;
              }
              
              if (!changePasswordDialog.staff?.id) {
                setPasswordError('Staff member not found');
                return;
              }
              
              setLoading(true);
              try {
                await authService.changeUserPassword(changePasswordDialog.staff.id, passwordData.newPassword);
                setSuccess(`Password changed successfully for ${changePasswordDialog.staff.firstName || changePasswordDialog.staff.email}!`);
                setChangePasswordDialog({ open: false, staff: null });
                setPasswordData({ newPassword: '', confirmPassword: '' });
                setPasswordError(null);
              } catch (err: any) {
                setPasswordError(err?.message || 'Failed to change password. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 1.5,
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffManagementScreen;

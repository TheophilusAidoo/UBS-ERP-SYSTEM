import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  LinearProgress,
  Stack,
  Divider,
  Avatar,
  Paper,
  Pagination,
} from '@mui/material';
import {
  Event,
  Add,
  Refresh,
  CheckCircle,
  Cancel,
  Pending,
  Edit,
  People,
  CalendarToday,
  AccessTime,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { leaveService } from '../../services/leave.service';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../types';
import { staffService } from '../../services/staff.service';
import { User } from '../../types';

const LeavesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<{
    annual: { total: number; used: number; remaining: number };
    sick: { total: number; used: number; remaining: number };
    emergency: { total: number; used: number; remaining: number };
  } | null>(null);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [staffBalances, setStaffBalances] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const leavesPerPage = 5;
  const [createDialog, setCreateDialog] = useState(false);
  const [balanceDialog, setBalanceDialog] = useState<{ open: boolean; staffId: string | null }>({
    open: false,
    staffId: null,
  });
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; leaveId: string | null }>({
    open: false,
    leaveId: null,
  });

  const [formData, setFormData] = useState({
    type: 'annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [balanceFormData, setBalanceFormData] = useState({
    annualTotal: 20,
    sickTotal: 10,
    emergencyTotal: 5,
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
      if (isAdmin) {
        fetchAllStaff();
      } else {
        fetchLeaveBalance();
      }
      setCurrentPage(1); // Reset to first page when user changes
    }
  }, [user, isAdmin]);

  const fetchLeaveRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const requests = isAdmin
        ? await leaveService.getAllLeaveRequests()
        : await leaveService.getLeaveRequests(user.id);
      setLeaveRequests(requests);
    } catch (err: any) {
      console.error('Error fetching leave requests:', err);
      setError(err.message || t('leaves.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    if (!user) return;
    try {
      const balance = await leaveService.getLeaveBalance(user.id);
      setLeaveBalance(balance);
    } catch (err: any) {
      console.error('Error fetching leave balance:', err);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const staff = await staffService.getAllStaff();
      setAllStaff(staff);
      
      // Fetch leave balances for all staff
      const balancesMap = new Map();
      for (const s of staff) {
        try {
          const balance = await leaveService.getLeaveBalance(s.id);
          balancesMap.set(s.id, balance);
        } catch (err) {
          // Use default if balance doesn't exist
          balancesMap.set(s.id, {
            annual: { total: 20, used: 0, remaining: 20 },
            sick: { total: 10, used: 0, remaining: 10 },
            emergency: { total: 5, used: 0, remaining: 5 },
          });
        }
      }
      setStaffBalances(balancesMap);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleCreateLeave = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      await leaveService.createLeaveRequest({
        userId: user.id,
        ...formData,
      });
      setSuccess('Leave request submitted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setCreateDialog(false);
      setFormData({ type: 'annual', startDate: '', endDate: '', reason: '' });
      await fetchLeaveRequests();
      await fetchLeaveBalance();
    } catch (err: any) {
      setError(err.message || t('leaves.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: string, status: LeaveStatus) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      await leaveService.updateLeaveRequest({
        leaveId,
        status,
        approvedBy: user.id,
      });
      setSuccess(`Leave request ${status} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      setApproveDialog({ open: false, leaveId: null });
      await fetchLeaveRequests();
    } catch (err: any) {
      setError(err.message || `Failed to ${status} leave request`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBalanceDialog = async (staffId: string) => {
    try {
      const balance = await leaveService.getLeaveBalance(staffId);
      setBalanceFormData({
        annualTotal: balance.annual?.total ?? 20,
        sickTotal: balance.sick?.total ?? 10,
        emergencyTotal: balance.emergency?.total ?? 5,
      });
      setBalanceDialog({ open: true, staffId });
    } catch (err: any) {
      setError(err.message || t('leaves.failedToLoadBalance'));
    }
  };

  const handleUpdateBalance = async () => {
    if (!balanceDialog.staffId) return;
    try {
      setLoading(true);
      setError(null);
      await leaveService.updateLeaveBalance({
        userId: balanceDialog.staffId,
        ...balanceFormData,
      });
      setSuccess(t('leaves.leaveBalanceUpdated'));
      setTimeout(() => setSuccess(null), 3000);
      setBalanceDialog({ open: false, staffId: null });
      await fetchAllStaff(); // Refresh staff balances
    } catch (err: any) {
      setError(err.message || t('leaves.failedToUpdateBalance'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle />;
      case 'rejected':
        return <Cancel />;
      default:
        return <Pending />;
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('leaves.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isAdmin ? t('leaves.adminDescription') : t('leaves.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isAdmin && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialog(true)}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {t('leaves.requestLeave')}
              </Button>
            )}
            <IconButton 
              onClick={fetchLeaveRequests} 
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

      {/* Leave Balance Cards (Staff View) */}
      {!isAdmin && leaveBalance && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 1.5, 
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Event sx={{ fontSize: 24, color: '#16a34a' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {t('leaves.annual')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {leaveBalance?.annual?.used || 0} {t('leaves.daysUsed')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {leaveBalance?.annual?.remaining ?? 0} / {leaveBalance?.annual?.total ?? 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={leaveBalance?.annual?.total ? ((leaveBalance.annual.remaining / leaveBalance.annual.total) * 100) : 0}
                    sx={{ height: 10, borderRadius: 1 }}
                    color="success"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 1.5, 
                    backgroundColor: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Event sx={{ fontSize: 24, color: '#2563eb' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {t('leaves.sick')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {leaveBalance?.sick?.used || 0} {t('leaves.daysUsed')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {leaveBalance?.sick?.remaining ?? 0} / {leaveBalance?.sick?.total ?? 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={leaveBalance?.sick?.total ? ((leaveBalance.sick.remaining / leaveBalance.sick.total) * 100) : 0}
                    sx={{ height: 10, borderRadius: 1 }}
                    color="info"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 1.5, 
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Event sx={{ fontSize: 24, color: '#ca8a04' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {t('leaves.emergency')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {leaveBalance?.emergency?.used || 0} {t('leaves.daysUsed')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {leaveBalance?.emergency?.remaining ?? 0} / {leaveBalance?.emergency?.total ?? 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={leaveBalance?.emergency?.total ? ((leaveBalance.emergency.remaining / leaveBalance.emergency.total) * 100) : 0}
                    sx={{ height: 10, borderRadius: 1 }}
                    color="warning"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Staff List for Admin (Leave Balance Management) */}
      {isAdmin && (
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', mb: 4 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ 
              p: 3, 
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: 'background.paper',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1.5, 
                  backgroundColor: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <People sx={{ color: 'primary.main', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {t('leaves.leaveBalance')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('leaves.adminDescription')}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'background.default' }}>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('staff.fullName')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('leaves.annual')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('leaves.sick')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('leaves.emergency')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <People sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.3 }} />
                        <Typography variant="body1" color="text.secondary">
                          {t('common.noData')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allStaff.map((staff) => {
                      const balance = staffBalances.get(staff.id);
                      const annualTotal = balance?.annual?.total ?? 20;
                      const annualUsed = balance?.annual?.used ?? 0;
                      const annualRemaining = annualTotal - annualUsed;
                      const sickTotal = balance?.sick?.total ?? 10;
                      const sickUsed = balance?.sick?.used ?? 0;
                      const sickRemaining = sickTotal - sickUsed;
                      const emergencyTotal = balance?.emergency?.total ?? 5;
                      const emergencyUsed = balance?.emergency?.used ?? 0;
                      const emergencyRemaining = emergencyTotal - emergencyUsed;
                      return (
                        <TableRow key={staff.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 600 }}>
                                {staff.firstName?.[0]?.toUpperCase() || staff.email?.[0]?.toUpperCase() || 'S'}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {staff.firstName && staff.lastName
                                    ? `${staff.firstName} ${staff.lastName}`
                                    : staff.email}
                                </Typography>
                                {staff.jobTitle && (
                                  <Typography variant="caption" color="text.secondary">
                                    {staff.jobTitle}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip 
                                label={`${annualRemaining} / ${annualTotal}`} 
                                size="small" 
                                color={annualRemaining > 0 ? "success" : "default"} 
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {annualUsed} used
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip 
                                label={`${sickRemaining} / ${sickTotal}`} 
                                size="small" 
                                color={sickRemaining > 0 ? "info" : "default"} 
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {sickUsed} used
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip 
                                label={`${emergencyRemaining} / ${emergencyTotal}`} 
                                size="small" 
                                color={emergencyRemaining > 0 ? "warning" : "default"} 
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {emergencyUsed} used
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenBalanceDialog(staff.id)}
                              color="primary"
                              sx={{
                                border: '1px solid rgba(0,0,0,0.08)',
                                '&:hover': {
                                  backgroundColor: 'primary.main',
                                  color: 'white',
                                  borderColor: 'primary.main',
                                },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Leave Requests Table */}
      <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'background.paper',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 1.5, 
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CalendarToday sx={{ color: 'primary.main', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {isAdmin ? t('leaves.leaveRequests') : t('leaves.leaveRequests')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAdmin ? 'Review and manage all staff leave requests' : 'Track your leave request history'}
                  {leaveRequests.length > leavesPerPage && ` • Page ${currentPage} of ${Math.ceil(leaveRequests.length / leavesPerPage)}`}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'background.default' }}>
                      {isAdmin && <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('leaves.employee')}</TableCell>}
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Start Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>End Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Reason</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">Status</TableCell>
                      {isAdmin && (
                        <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 6 }}>
                          <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.3 }} />
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
                            {t('leaves.noLeaveRequests')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {!isAdmin && 'Click "Request Leave" to submit a new leave request'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveRequests
                        .slice((currentPage - 1) * leavesPerPage, currentPage * leavesPerPage)
                        .map((request) => {
                        const days = calculateDays(request.startDate, request.endDate);
                        return (
                          <TableRow key={request.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                            {isAdmin && (
                              <TableCell sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {request.user?.firstName?.[0]?.toUpperCase() || request.user?.email?.[0]?.toUpperCase() || 'U'}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {request.user?.firstName} {request.user?.lastName}
                                    </Typography>
                                    {request.user?.jobTitle && (
                                      <Typography variant="caption" color="text.secondary">
                                        {request.user.jobTitle}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                            )}
                            <TableCell sx={{ py: 2 }}>
                              <Chip 
                                label={request.type.charAt(0).toUpperCase() + request.type.slice(1)} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {formatDate(request.startDate)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {formatDate(request.endDate)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Chip 
                                icon={<AccessTime sx={{ fontSize: 14 }} />}
                                label={`${days} ${days === 1 ? 'day' : 'days'}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  maxWidth: 250, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {request.reason || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 2 }}>
                              <Chip
                                icon={getStatusIcon(request.status)}
                                label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                color={getStatusColor(request.status)}
                                size="small"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            {isAdmin && (
                              <TableCell align="center" sx={{ py: 2 }}>
                                {request.status === 'pending' ? (
                                  <Stack direction="row" spacing={1} justifyContent="center">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      onClick={() => handleApprove(request.id, 'approved')}
                                      disabled={loading}
                                      sx={{ 
                                        textTransform: 'none', 
                                        borderRadius: 1.5,
                                        px: 2,
                                        fontWeight: 500,
                                      }}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      onClick={() => handleApprove(request.id, 'rejected')}
                                      disabled={loading}
                                      sx={{ 
                                        textTransform: 'none', 
                                        borderRadius: 1.5,
                                        px: 2,
                                        fontWeight: 500,
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                  </Typography>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {leaveRequests.length > leavesPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, pb: 2 }}>
                <Pagination
                  count={Math.ceil(leaveRequests.length / leavesPerPage)}
                  page={currentPage}
                  onChange={(_, value) => setCurrentPage(value)}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Create Leave Request Dialog */}
      <Dialog 
        open={createDialog} 
        onClose={() => setCreateDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Request Leave</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={formData.type}
                label="Leave Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveType })}
              >
                <MenuItem value="annual">Annual Leave</MenuItem>
                <MenuItem value="sick">Sick Leave</MenuItem>
                <MenuItem value="emergency">Emergency Leave</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Reason"
              multiline
              rows={4}
              fullWidth
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a reason for your leave request..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setCreateDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleCreateLeave}
            variant="contained"
            disabled={loading || !formData.startDate || !formData.endDate}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Leave Balance Dialog (Admin) */}
      <Dialog 
        open={balanceDialog.open} 
        onClose={() => setBalanceDialog({ open: false, staffId: null })} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Set Leave Balance</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              label="Annual Leave Total"
              type="number"
              fullWidth
              value={balanceFormData.annualTotal}
              onChange={(e) => setBalanceFormData({ ...balanceFormData, annualTotal: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              label="Sick Leave Total"
              type="number"
              fullWidth
              value={balanceFormData.sickTotal}
              onChange={(e) => setBalanceFormData({ ...balanceFormData, sickTotal: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
            />
            <TextField
              label="Emergency Leave Total"
              type="number"
              fullWidth
              value={balanceFormData.emergencyTotal}
              onChange={(e) => setBalanceFormData({ ...balanceFormData, emergencyTotal: parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setBalanceDialog({ open: false, staffId: null })} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleUpdateBalance}
            variant="contained"
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Update Balance'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeavesScreen;

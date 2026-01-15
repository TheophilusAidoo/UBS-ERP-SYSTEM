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
  Grid,
  Stack,
  Avatar,
  Divider,
  Tabs,
  Tab,
  Paper,
  LinearProgress,
  Rating,
} from '@mui/material';
import {
  Assessment,
  Add,
  Edit,
  Delete,
  Refresh,
  TrendingUp,
  TrackChanges,
  Star,
  Person,
  CalendarToday,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import {
  performanceService,
  CreateKPIData,
  CreateGoalData,
  UpdateGoalData,
  CreatePerformanceReviewData,
} from '../../services/performance.service';
import { staffService } from '../../services/staff.service';
import { KPI, Goal, PerformanceReview, GoalType, ReviewCycle, User } from '../../types';

const PerformanceScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // KPIs
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [kpiDialog, setKpiDialog] = useState<{ open: boolean; kpi: KPI | null }>({
    open: false,
    kpi: null,
  });
  const [kpiFormData, setKpiFormData] = useState({
    category: '',
    name: '',
    description: '',
    unit: '',
    target: '',
  });

  // Goals
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; goal: Goal | null }>({
    open: false,
    goal: null,
  });
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    type: 'short-term' as GoalType,
    targetValue: '',
    currentValue: '',
    startDate: '',
    endDate: '',
  });

  // Reviews
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; review: PerformanceReview | null }>({
    open: false,
    review: null,
  });
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [selectedStaffForReview, setSelectedStaffForReview] = useState<string>('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('');
  const [reviewFormData, setReviewFormData] = useState({
    cycle: 'monthly' as ReviewCycle,
    period: '',
    overallRating: 0,
    feedback: '',
  });
  const [reviewRatings, setReviewRatings] = useState<
    Array<{ category: string; score: number; maxScore: number; feedback: string }>
  >([]);
  const [reviewCompetencies, setReviewCompetencies] = useState<
    Array<{ name: string; level: number; notes: string }>
  >([]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [tabValue, user, selectedStaffFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (tabValue === 0) {
        // KPIs - Admin only
        if (isAdmin) {
          const data = await performanceService.getAllKPIs();
          setKpis(data);
        }
      } else if (tabValue === 1) {
        // Goals
        const filters = isAdmin 
          ? (selectedStaffFilter ? { userId: selectedStaffFilter } : {})
          : { userId: user?.id };
        const data = await performanceService.getGoals(filters);
        setGoals(data);
        if (isAdmin && !allStaff.length) {
          const staffData = await staffService.getAllStaff();
          setAllStaff(staffData);
        }
      } else if (tabValue === 2) {
        // Reviews
        const filters = isAdmin 
          ? (selectedStaffFilter ? { userId: selectedStaffFilter } : {})
          : { userId: user?.id };
        const data = await performanceService.getPerformanceReviews(filters);
        setReviews(data);
        if (isAdmin) {
          const staffData = await staffService.getAllStaff();
          setAllStaff(staffData);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || t('performance.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // KPI Handlers
  const handleOpenKpiDialog = (kpi?: KPI) => {
    if (kpi) {
      setKpiFormData({
        category: kpi.category,
        name: kpi.name,
        description: kpi.description || '',
        unit: kpi.unit || '',
        target: kpi.target?.toString() || '',
      });
      setKpiDialog({ open: true, kpi });
    } else {
      setKpiFormData({
        category: '',
        name: '',
        description: '',
        unit: '',
        target: '',
      });
      setKpiDialog({ open: true, kpi: null });
    }
  };

  const handleSaveKPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const data: CreateKPIData = {
        category: kpiFormData.category,
        name: kpiFormData.name,
        description: kpiFormData.description || undefined,
        unit: kpiFormData.unit || undefined,
        target: kpiFormData.target ? parseFloat(kpiFormData.target) : undefined,
      };

      if (kpiDialog.kpi) {
        await performanceService.updateKPI(kpiDialog.kpi.id, data);
        setSuccess('KPI updated successfully!');
      } else {
        await performanceService.createKPI(data);
        setSuccess('KPI created successfully!');
      }

      setTimeout(() => setSuccess(null), 3000);
      setKpiDialog({ open: false, kpi: null });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save KPI');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKPI = async (id: string) => {
    if (!window.confirm(t('performance.areYouSureDelete'))) return;
    try {
      setLoading(true);
      await performanceService.deleteKPI(id);
      setSuccess(t('performance.kpiDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || t('performance.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  // Goal Handlers
  const handleOpenGoalDialog = (goal?: Goal) => {
    if (goal) {
      setGoalFormData({
        title: goal.title,
        description: goal.description || '',
        type: goal.type,
        targetValue: goal.targetValue?.toString() || '',
        currentValue: goal.currentValue?.toString() || '',
        startDate: goal.startDate,
        endDate: goal.endDate,
      });
      setGoalDialog({ open: true, goal });
    } else {
      setGoalFormData({
        title: '',
        description: '',
        type: 'short-term',
        targetValue: '',
        currentValue: '',
        startDate: '',
        endDate: '',
      });
      setGoalDialog({ open: true, goal: null });
    }
  };

  const handleSaveGoal = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!goalFormData.title || !goalFormData.startDate || !goalFormData.endDate) {
        setError(t('common.pleaseFillAllFields'));
        return;
      }

      if (!user) {
        setError(t('common.userNotFound') || 'User not found');
        return;
      }

      const data: CreateGoalData = {
        userId: goalDialog.goal?.userId || user.id,
        title: goalFormData.title,
        description: goalFormData.description || undefined,
        type: goalFormData.type,
        targetValue: goalFormData.targetValue ? parseFloat(goalFormData.targetValue) : undefined,
        currentValue: goalFormData.currentValue ? parseFloat(goalFormData.currentValue) : undefined,
        startDate: goalFormData.startDate,
        endDate: goalFormData.endDate,
      };

      if (goalDialog.goal) {
        const updateData: UpdateGoalData = {
          id: goalDialog.goal.id,
          ...data,
        };
        await performanceService.updateGoal(updateData);
        setSuccess(t('performance.goalUpdated'));
      } else {
        await performanceService.createGoal(data);
        setSuccess(t('performance.goalCreated'));
      }

      setTimeout(() => setSuccess(null), 3000);
      setGoalDialog({ open: false, goal: null });
      await fetchData();
    } catch (err: any) {
      setError(err.message || t('performance.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm(t('performance.areYouSureDelete'))) return;
    try {
      setLoading(true);
      await performanceService.deleteGoal(id);
      setSuccess(t('performance.goalDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || t('performance.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  // Review Handlers
  const handleOpenReviewDialog = (review?: PerformanceReview) => {
    if (review) {
      setReviewFormData({
        cycle: review.cycle,
        period: review.period,
        overallRating: review.overallRating || 0,
        feedback: review.feedback || '',
      });
      setReviewRatings(review.ratings || []);
      setReviewCompetencies(review.competencies || []);
      setSelectedStaffForReview(review.userId);
      setReviewDialog({ open: true, review });
    } else {
      setReviewFormData({
        cycle: 'monthly',
        period: '',
        overallRating: 0,
        feedback: '',
      });
      setReviewRatings([]);
      setReviewCompetencies([]);
      setSelectedStaffForReview('');
      setReviewDialog({ open: true, review: null });
    }
  };

  const handleSaveReview = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedStaffForReview || !reviewFormData.period) {
        setError(t('common.pleaseFillAllFields'));
        return;
      }

      if (!user) {
        setError(t('common.userNotFound') || 'User not found');
        return;
      }

      const data: CreatePerformanceReviewData = {
        userId: selectedStaffForReview,
        reviewedBy: user.id,
        cycle: reviewFormData.cycle,
        period: reviewFormData.period,
        ratings: reviewRatings,
        overallRating: reviewFormData.overallRating || undefined,
        feedback: reviewFormData.feedback || undefined,
        competencies: reviewCompetencies,
      };

      if (reviewDialog.review) {
        await performanceService.updatePerformanceReview({
          id: reviewDialog.review.id,
          ratings: data.ratings,
          overallRating: data.overallRating,
          feedback: data.feedback,
          competencies: data.competencies,
        });
        setSuccess(t('performance.reviewUpdated'));
      } else {
        await performanceService.createPerformanceReview(data);
        setSuccess(t('performance.reviewCreated'));
      }

      setTimeout(() => setSuccess(null), 3000);
      setReviewDialog({ open: false, review: null });
      await fetchData();
    } catch (err: any) {
      setError(err.message || t('performance.failedToCreate'));
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

  const getGoalProgress = (goal: Goal) => {
    if (!goal.targetValue || goal.targetValue === 0) return 0;
    const progress = ((goal.currentValue || 0) / goal.targetValue) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'cancelled':
        return 'error';
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
              {t('performance.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('performance.description')}
            </Typography>
          </Box>
          <IconButton
            onClick={fetchData}
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

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          {isAdmin && <Tab label={t('performance.kpis')} icon={<Assessment />} iconPosition="start" />}
          <Tab label={t('performance.goals')} icon={<TrackChanges />} iconPosition="start" />
          <Tab label={t('performance.reviews')} icon={<Star />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* KPIs Tab (Admin Only) */}
      {tabValue === 0 && isAdmin && (
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    <Assessment sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('performance.kpis')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {kpis.length} {t('performance.kpis')}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenKpiDialog()}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('performance.createKPI')}
                </Button>
              </Box>
            </Box>
            <Box sx={{ p: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : kpis.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    {t('performance.noKPIs')}
                  </Typography>
                  <Button variant="contained" onClick={() => handleOpenKpiDialog()} sx={{ borderRadius: 2, textTransform: 'none' }}>
                    {t('performance.createKPI')}
                  </Button>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'background.default' }}>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('performance.category')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('performance.kpiName')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('performance.kpiDescription')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('performance.unit')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }} align="right">
                          {t('performance.target')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">
                          {t('common.actions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kpis.map((kpi) => (
                        <TableRow key={kpi.id} hover>
                          <TableCell>
                            <Chip label={kpi.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{kpi.name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {kpi.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{kpi.unit || '-'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {kpi.target !== undefined ? kpi.target.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenKpiDialog(kpi)}
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
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteKPI(kpi.id)}
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
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Goals Tab */}
      {tabValue === (isAdmin ? 1 : 0) && (
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isAdmin ? 2 : 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      backgroundColor: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrackChanges sx={{ color: 'success.main', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('performance.goals')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {goals.length} {t('performance.goals')}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenGoalDialog()}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('performance.createGoal')}
                </Button>
              </Box>
              {isAdmin && (
                <FormControl size="small" sx={{ minWidth: 250 }}>
                  <InputLabel>{t('performance.filterByStaff') || 'Filter by Staff'}</InputLabel>
                  <Select
                    value={selectedStaffFilter}
                    label={t('performance.filterByStaff') || 'Filter by Staff'}
                    onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('performance.allStaff') || 'All Staff'}</MenuItem>
                    {allStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} {staff.jobTitle && `(${staff.jobTitle})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            <Box sx={{ p: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : goals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <TrackChanges sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    {t('performance.noGoals')}
                  </Typography>
                  <Button variant="contained" onClick={() => handleOpenGoalDialog()} sx={{ borderRadius: 2, textTransform: 'none' }}>
                    {t('performance.createGoal')}
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {goals.map((goal) => {
                    const progress = getGoalProgress(goal);
                    return (
                      <Grid item xs={12} md={6} key={goal.id}>
                        <Card sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {goal.title}
                                </Typography>
                                {goal.description && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {goal.description}
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                  <Chip label={goal.type.replace('-', ' ')} size="small" variant="outlined" />
                                  <Chip
                                    label={goal.status.replace('-', ' ')}
                                    size="small"
                                    color={getStatusColor(goal.status)}
                                  />
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenGoalDialog(goal)}
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
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteGoal(goal.id)}
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
                              </Box>
                            </Box>
                            {goal.targetValue && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {t('performance.progress')}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {goal.currentValue || 0} / {goal.targetValue} ({Math.round(progress)}%)
                                  </Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 1 }} />
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
                                </Typography>
                              </Box>
                            </Box>
                            {isAdmin && goal.user && (
                              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {goal.user.firstName} {goal.user.lastName}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Reviews Tab */}
      {tabValue === (isAdmin ? 2 : 1) && (
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isAdmin ? 2 : 0 }}>
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
                    <Star sx={{ color: 'warning.main', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('performance.reviews')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reviews.length} {t('performance.reviews')}
                    </Typography>
                  </Box>
                </Box>
                {isAdmin && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenReviewDialog()}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('performance.createReview')}
                  </Button>
                )}
              </Box>
              {isAdmin && (
                <FormControl size="small" sx={{ minWidth: 250 }}>
                  <InputLabel>{t('performance.filterByStaff') || 'Filter by Staff'}</InputLabel>
                  <Select
                    value={selectedStaffFilter}
                    label={t('performance.filterByStaff') || 'Filter by Staff'}
                    onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('performance.allStaff') || 'All Staff'}</MenuItem>
                    {allStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} {staff.jobTitle && `(${staff.jobTitle})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            <Box sx={{ p: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : reviews.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Star sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    {t('performance.noReviews')}
                  </Typography>
                  {isAdmin && (
                    <Button
                      variant="contained"
                      onClick={() => handleOpenReviewDialog()}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      {t('performance.createReview')}
                    </Button>
                  )}
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {reviews.map((review) => (
                    <Grid item xs={12} md={6} key={review.id}>
                      <Card sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, height: '100%' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              {review.user && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                    {review.user.firstName?.[0]?.toUpperCase() || review.user.email[0].toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                      {review.user.firstName} {review.user.lastName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {review.cycle} {t('performance.reviews')} - {review.period}
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
                              {review.overallRating !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Rating value={review.overallRating} readOnly precision={0.5} size="small" />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {review.overallRating}/5
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            {isAdmin && (
                              <IconButton
                                size="small"
                                onClick={() => handleOpenReviewDialog(review)}
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
                            )}
                          </Box>
                          {review.feedback && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {review.feedback}
                            </Typography>
                          )}
                          {review.ratings && review.ratings.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                {t('performance.rating')}
                              </Typography>
                              <Stack spacing={0.5}>
                                {review.ratings.map((rating, idx) => (
                                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2">{rating.category}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {rating.score}/{rating.maxScore}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {review.competencies && review.competencies.length > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                {t('performance.competencies')}
                              </Typography>
                              <Stack spacing={0.5}>
                                {review.competencies.map((comp, idx) => (
                                  <Box key={idx}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                      <Typography variant="body2">{comp.name}</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        Level {comp.level}
                                      </Typography>
                                    </Box>
                                    {comp.notes && (
                                      <Typography variant="caption" color="text.secondary">
                                        {comp.notes}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            <Typography variant="caption" color="text.secondary">
                              Reviewed by: {review.reviewedByUser?.firstName} {review.reviewedByUser?.lastName} on{' '}
                              {formatDate(review.createdAt)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* KPI Dialog */}
      <Dialog
        open={kpiDialog.open}
        onClose={() => setKpiDialog({ open: false, kpi: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {kpiDialog.kpi ? t('performance.updateKPI') : t('performance.createKPI')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              label={t('performance.category')}
              fullWidth
              required
              value={kpiFormData.category}
              onChange={(e) => setKpiFormData({ ...kpiFormData, category: e.target.value })}
            />
            <TextField
              label={t('performance.kpiName')}
              fullWidth
              required
              value={kpiFormData.name}
              onChange={(e) => setKpiFormData({ ...kpiFormData, name: e.target.value })}
            />
            <TextField
              label={t('performance.kpiDescription')}
              fullWidth
              multiline
              rows={3}
              value={kpiFormData.description}
              onChange={(e) => setKpiFormData({ ...kpiFormData, description: e.target.value })}
            />
            <TextField
              label={t('performance.unit')}
              fullWidth
              value={kpiFormData.unit}
              onChange={(e) => setKpiFormData({ ...kpiFormData, unit: e.target.value })}
              placeholder="e.g., %, $, hours"
            />
            <TextField
              label={t('performance.target')}
              type="number"
              fullWidth
              value={kpiFormData.target}
              onChange={(e) => setKpiFormData({ ...kpiFormData, target: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setKpiDialog({ open: false, kpi: null })} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveKPI}
            variant="contained"
            disabled={loading || !kpiFormData.category || !kpiFormData.name}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : kpiDialog.kpi ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog
        open={goalDialog.open}
        onClose={() => setGoalDialog({ open: false, goal: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {goalDialog.goal ? t('performance.updateGoal') : t('performance.createGoal')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              label={t('performance.goalTitle')}
              fullWidth
              required
              value={goalFormData.title}
              onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
            />
            <TextField
              label={t('performance.goalDescription')}
              fullWidth
              multiline
              rows={3}
              value={goalFormData.description}
              onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>{t('performance.goalType')}</InputLabel>
              <Select
                value={goalFormData.type}
                label={t('performance.goalType')}
                onChange={(e) => setGoalFormData({ ...goalFormData, type: e.target.value as GoalType })}
              >
                <MenuItem value="short-term">{t('performance.shortTerm')}</MenuItem>
                <MenuItem value="long-term">{t('performance.longTerm')}</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label={t('performance.targetValue')}
                  type="number"
                  fullWidth
                  value={goalFormData.targetValue}
                  onChange={(e) => setGoalFormData({ ...goalFormData, targetValue: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={t('performance.currentValue')}
                  type="number"
                  fullWidth
                  value={goalFormData.currentValue}
                  onChange={(e) => setGoalFormData({ ...goalFormData, currentValue: e.target.value })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label={t('performance.startDate')}
                  type="date"
                  fullWidth
                  required
                  value={goalFormData.startDate}
                  onChange={(e) => setGoalFormData({ ...goalFormData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={t('performance.endDate')}
                  type="date"
                  fullWidth
                  required
                  value={goalFormData.endDate}
                  onChange={(e) => setGoalFormData({ ...goalFormData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setGoalDialog({ open: false, goal: null })} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveGoal}
            variant="contained"
            disabled={loading || !goalFormData.title || !goalFormData.startDate || !goalFormData.endDate}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : goalDialog.goal ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog - Simplified for now, can be expanded */}
      <Dialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, review: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {reviewDialog.review ? t('performance.updateReview') : t('performance.createReview')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            {!reviewDialog.review && (
              <FormControl fullWidth required>
                <InputLabel>{t('performance.employee')}</InputLabel>
                <Select
                  value={selectedStaffForReview}
                  label={t('performance.employee')}
                  onChange={(e) => setSelectedStaffForReview(e.target.value)}
                >
                  {allStaff.map((staff) => (
                    <MenuItem key={staff.id} value={staff.id}>
                      {staff.firstName} {staff.lastName} {staff.jobTitle && `(${staff.jobTitle})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl fullWidth>
              <InputLabel>{t('performance.reviewCycle')}</InputLabel>
              <Select
                value={reviewFormData.cycle}
                label={t('performance.reviewCycle')}
                onChange={(e) => setReviewFormData({ ...reviewFormData, cycle: e.target.value as ReviewCycle })}
              >
                <MenuItem value="monthly">{t('performance.monthly')}</MenuItem>
                <MenuItem value="quarterly">{t('performance.quarterly')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('common.period') || 'Period'}
              fullWidth
              required
              value={reviewFormData.period}
              onChange={(e) => setReviewFormData({ ...reviewFormData, period: e.target.value })}
              placeholder="e.g., 2024-Q1, January 2024"
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('performance.rating')}
              </Typography>
              <Rating
                value={reviewFormData.overallRating}
                onChange={(_, newValue) => setReviewFormData({ ...reviewFormData, overallRating: newValue || 0 })}
                precision={0.5}
              />
            </Box>
            <TextField
              label={t('performance.feedback')}
              fullWidth
              multiline
              rows={4}
              value={reviewFormData.feedback}
              onChange={(e) => setReviewFormData({ ...reviewFormData, feedback: e.target.value })}
            />
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {t('common.note') || 'Note'}: {t('performance.competencies')}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setReviewDialog({ open: false, review: null })} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveReview}
            variant="contained"
            disabled={loading || !selectedStaffForReview || !reviewFormData.period}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : reviewDialog.review ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceScreen;

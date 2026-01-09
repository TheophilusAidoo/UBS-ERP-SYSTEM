import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  IconButton,
  LinearProgress,
  Chip,
  Button,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { 
  Refresh, 
  AccessTime, 
  Event, 
  Folder,
  TrendingUp,
  BarChart,
  ShowChart,
  AttachMoney,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { supabase, TABLES } from '../../services/supabase';
import { financialService } from '../../services/financial.service';
import { useCurrency } from '../../hooks/useCurrency';

const StaffDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const [attendanceSummary, setAttendanceSummary] = useState<any>({});
  const [leaveBalance, setLeaveBalance] = useState<any>({});
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]);
  const [leaveChartData, setLeaveChartData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [financialPeriod, setFinancialPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [totalSales, setTotalSales] = useState<number>(0);

  const getDateRange = (period: 'day' | 'month' | 'year') => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      // Fetch financial summary for staff's personal sales
      const dateRange = getDateRange(financialPeriod);
      const financialSummary = await financialService.getFinancialSummary({
        userId: user.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setTotalSales(financialSummary.totalIncome);

      const { data: attendanceData } = await supabase
        .from(TABLES.attendance)
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      const totalDays = attendanceData?.length || 0;
      const totalHours = attendanceData?.reduce((sum, a) => sum + (a.total_hours || 0), 0) || 0;

      setAttendanceSummary({ totalDays, totalHours });

      // Prepare attendance chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const chartData = last7Days.map(date => {
        const dayData = attendanceData?.filter((a: any) => {
          const recordDate = new Date(a.date).toISOString().split('T')[0];
          return recordDate === date;
        }) || [];
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          hours: dayData.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0),
        };
      });
      setAttendanceChartData(chartData);

      const { data: leaveData } = await supabase
        .from(TABLES.leave_requests)
        .select('*')
        .eq('user_id', user.id);

      const annualUsed = leaveData?.filter((l) => l.type === 'annual' && l.status === 'approved').length || 0;
      const sickUsed = leaveData?.filter((l) => l.type === 'sick' && l.status === 'approved').length || 0;
      const emergencyUsed = leaveData?.filter((l) => l.type === 'emergency' && l.status === 'approved').length || 0;

      setLeaveBalance({
        annual: { total: 20, used: annualUsed, remaining: 20 - annualUsed },
        sick: { total: 10, used: sickUsed, remaining: 10 - sickUsed },
        emergency: { total: 5, used: emergencyUsed, remaining: 5 - emergencyUsed },
      });

      // Prepare leave chart data
      const leaveChart = [
        { name: 'Annual', used: annualUsed, total: 20, remaining: 20 - annualUsed },
        { name: 'Sick', used: sickUsed, total: 10, remaining: 10 - sickUsed },
        { name: 'Emergency', used: emergencyUsed, total: 5, remaining: 5 - emergencyUsed },
      ];
      setLeaveChartData(leaveChart);

      // Performance data (mock for now)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setPerformanceData(months.map(month => ({
        month,
        performance: Math.floor(Math.random() * 30) + 70,
      })));

      // Get projects where user is assigned (via project_assignments table)
      // This includes both projects assigned to the user AND projects created by the user
      // (since creators are automatically assigned when creating projects)
      const { data: assignments } = await supabase
        .from(TABLES.project_assignments)
        .select('project_id')
        .eq('user_id', user.id);

      const assignedProjectIds = (assignments || []).map((a: any) => a.project_id);

      if (assignedProjectIds.length > 0) {
        const { data: projectsData } = await supabase
          .from(TABLES.projects)
          .select('*')
          .in('id', assignedProjectIds)
          .order('created_at', { ascending: false })
          .limit(5);

        setAssignedProjects(projectsData || []);
      } else {
        setAssignedProjects([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, financialPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('dashboard.welcome', { name: user?.firstName || t('common.staff') })} 👋
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('dashboard.overview')}
            </Typography>
          </Box>
          <IconButton 
            onClick={onRefresh} 
            disabled={refreshing || loading}
            sx={{ 
              backgroundColor: 'background.paper',
              border: '1px solid rgba(0,0,0,0.08)',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <Refresh />
          </IconButton>
        </Box>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      </Box>

      {/* Quick Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AccessTime sx={{ fontSize: 24, color: '#2563eb' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('dashboard.totalHours')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {attendanceSummary.totalHours || 0}h
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
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
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('dashboard.leaveBalance')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {((leaveBalance.annual?.remaining || 0) + (leaveBalance.sick?.remaining || 0) + (leaveBalance.emergency?.remaining || 0))} days
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        {user?.salaryAmount && (
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 1.5, 
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <AttachMoney sx={{ fontSize: 24, color: '#ca8a04' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Monthly Salary
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {currencySymbol}{user.salaryAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    {user.salaryDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Paid on day {user.salaryDate} of each month
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Folder sx={{ fontSize: 24, color: '#ca8a04' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('dashboard.activeProjects')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {assignedProjects.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AttachMoney sx={{ fontSize: 24, color: '#16a34a' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('dashboard.totalSales', 'Total Sales')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {currencySymbol}{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Attendance Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('dashboard.attendanceSummary')}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => navigate('/attendance')}
                >
                  {t('dashboard.viewAll')}
                </Button>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                  {attendanceSummary.totalHours || 0}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.daysWorked', { days: attendanceSummary.totalDays || 0 })}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.averagePerDay')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {attendanceSummary.totalDays > 0 
                    ? (attendanceSummary.totalHours / attendanceSummary.totalDays).toFixed(1)
                    : 0}h
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Leave Balance Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('dashboard.leaveBalance')}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => navigate('/leaves')}
                >
                  {t('dashboard.apply')}
                </Button>
              </Box>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {t('dashboard.annualLeave')}
                  </Typography>
                  <Chip 
                    label={`${leaveBalance.annual?.remaining || 0} / ${leaveBalance.annual?.total || 0}`}
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {t('dashboard.sickLeave')}
                  </Typography>
                  <Chip 
                    label={`${leaveBalance.sick?.remaining || 0} / ${leaveBalance.sick?.total || 0}`}
                    color="info"
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {t('dashboard.emergencyLeave')}
                  </Typography>
                  <Chip 
                    label={`${leaveBalance.emergency?.remaining || 0} / ${leaveBalance.emergency?.total || 0}`}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Summary Section */}
      <Box sx={{ mb: 4 }}>
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney sx={{ color: 'success.main', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('dashboard.financialSummary', 'Financial Summary')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.personalSales', 'Your Personal Sales')}
                  </Typography>
                </Box>
              </Box>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Period</InputLabel>
                <Select
                  value={financialPeriod}
                  label="Period"
                  onChange={(e) => setFinancialPeriod(e.target.value as 'day' | 'month' | 'year')}
                >
                  <MenuItem value="day">Today</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ 
              p: 3, 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              textAlign: 'center',
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {financialPeriod === 'day' ? 'Today\'s Sales' : financialPeriod === 'month' ? 'This Month\'s Sales' : 'This Year\'s Sales'}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                {currencySymbol}{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Total sales from products and approved invoices
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Analytics Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
          {t('dashboard.analytics')}
        </Typography>
        <Grid container spacing={3}>
          {/* Attendance Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  {t('dashboard.weeklyAttendance')}
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={attendanceChartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 8,
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#2563eb" 
                      fillOpacity={1} 
                      fill="url(#colorHours)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Leave Usage Chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  {t('dashboard.leaveUsage')}
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsBarChart data={leaveChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 8,
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="used" fill="#dc2626" name={t('dashboard.used')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="remaining" fill="#16a34a" name={t('dashboard.remaining')} radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Trend */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  {t('dashboard.performanceTrend')}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 8,
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="performance" 
                      stroke="#ca8a04" 
                      strokeWidth={3}
                      dot={{ fill: '#ca8a04', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Assigned Projects */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
          {t('dashboard.assignedProjects')}
        </Typography>
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            {assignedProjects.length > 0 ? (
              <Stack spacing={2}>
                {assignedProjects.map((project) => (
                  <Box 
                    key={project.id}
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: '1px solid rgba(0,0,0,0.08)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover',
                        cursor: 'pointer',
                      },
                    }}
                    onClick={() => navigate('/projects')}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {project.name}
                        </Typography>
                        {project.description && (
                          <Typography variant="body2" color="text.secondary">
                            {project.description}
                          </Typography>
                        )}
                      </Box>
                      <Chip 
                        label={project.status || 'active'} 
                        size="small"
                        color={
                          project.status === 'completed' ? 'success' :
                          project.status === 'in-progress' ? 'info' :
                          project.status === 'on-hold' ? 'warning' : 'default'
                        }
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Folder sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {t('dashboard.noProjects')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default StaffDashboard;

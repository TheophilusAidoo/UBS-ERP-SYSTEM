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
  Fab,
  Alert,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import {
  Business,
  People,
  Folder,
  Event,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  BarChart,
  PieChart,
  ShowChart,
  CurrencyExchange,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useCurrency } from '../../hooks/useCurrency';
import { DashboardStats, Company } from '../../types';
import { supabase, TABLES } from '../../services/supabase';
import { financialService } from '../../services/financial.service';
import { companyService } from '../../services/company.service';
import { useGlobalSettingsStore, Currency } from '../../store/global-settings.store';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const { 
    currency, 
    setCurrency, 
    getCurrencyName,
    getCurrencySymbol,
  } = useGlobalSettingsStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalStaff: 0,
    activeProjects: 0,
    pendingLeaves: 0,
    revenue: 0,
    expenses: 0,
    profit: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [staffDistribution, setStaffDistribution] = useState<any[]>([]);
  const [financialPeriod, setFinancialPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFinancials, setCompanyFinancials] = useState<Array<{
    companyId: string;
    companyName: string;
    dailyIncome: number;
    dailyExpenses: number;
  }>>([]);
  const [companyDialog, setCompanyDialog] = useState<{
    open: boolean;
    company: { companyId: string; companyName: string } | null;
    financialData: { income: number; expenses: number; profit: number } | null;
  }>({
    open: false,
    company: null,
    financialData: null,
  });

  const getDateRange = (period: 'day' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
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

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(financialPeriod);
      
      // Get financial summary with date filter
      const financialSummary = await financialService.getFinancialSummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      
      const [
        companiesResult,
        staffResult,
        projectsResult,
        leavesResult,
        allProjectsResult,
        allStaffResult,
      ] = await Promise.allSettled([
        supabase.from(TABLES.companies).select('*', { count: 'exact', head: true }),
        supabase.from(TABLES.users).select('*', { count: 'exact', head: true }).eq('role', 'staff'),
        supabase.from(TABLES.projects).select('*', { count: 'exact', head: true }).in('status', ['planning', 'in-progress']),
        supabase.from(TABLES.leave_requests).select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from(TABLES.projects).select('status'),
        supabase.from(TABLES.users).select('company_id, job_title').eq('role', 'staff'),
      ]);

      const companiesCount = companiesResult.status === 'fulfilled' && !companiesResult.value.error 
        ? (companiesResult.value.count || 0) 
        : 0;
      const staffCount = staffResult.status === 'fulfilled' && !staffResult.value.error
        ? (staffResult.value.count || 0)
        : 0;
      const projectsCount = projectsResult.status === 'fulfilled' && !projectsResult.value.error
        ? (projectsResult.value.count || 0)
        : 0;
      const leavesCount = leavesResult.status === 'fulfilled' && !leavesResult.value.error
        ? (leavesResult.value.count || 0)
        : 0;

      const revenue = financialSummary.totalIncome;
      const expenses = financialSummary.totalExpenses;

      // Get transactions for chart data
      const transactions = await financialService.getTransactions({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      
      const incomeData = transactions.filter((t) => t.type === 'income');
      const expenseData = transactions.filter((t) => t.type === 'expense');
      
      // Create chart data based on period
      let revenueChartData: any[] = [];
      if (financialPeriod === 'day') {
        // Hourly data for the day
        const hours = Array.from({ length: 24 }, (_, i) => i);
        revenueChartData = hours.map((hour) => {
          const hourIncome = incomeData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getHours() === hour;
          });
          const hourExpense = expenseData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getHours() === hour;
          });
          return {
            time: `${hour}:00`,
            revenue: hourIncome.reduce((sum, t) => sum + t.amount, 0),
            expenses: hourExpense.reduce((sum, t) => sum + t.amount, 0),
          };
        });
      } else if (financialPeriod === 'week') {
        // Daily data for the week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        revenueChartData = days.map((day, index) => {
          const dayIncome = incomeData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getDay() === index;
          });
          const dayExpense = expenseData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getDay() === index;
          });
          return {
            day,
            revenue: dayIncome.reduce((sum, t) => sum + t.amount, 0),
            expenses: dayExpense.reduce((sum, t) => sum + t.amount, 0),
          };
        });
      } else if (financialPeriod === 'month') {
        // Daily data for the month
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        revenueChartData = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayIncome = incomeData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getDate() === day;
          });
          const dayExpense = expenseData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getDate() === day;
          });
          return {
            day: day.toString(),
            revenue: dayIncome.reduce((sum, t) => sum + t.amount, 0),
            expenses: dayExpense.reduce((sum, t) => sum + t.amount, 0),
          };
        });
      } else if (financialPeriod === 'year') {
        // Monthly data for the year
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        revenueChartData = months.map((month, index) => {
          const monthIncome = incomeData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getMonth() === index;
          });
          const monthExpense = expenseData.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            return date.getMonth() === index;
          });
          return {
            month,
            revenue: monthIncome.reduce((sum, t) => sum + t.amount, 0),
            expenses: monthExpense.reduce((sum, t) => sum + t.amount, 0),
          };
        });
      }
      setRevenueData(revenueChartData);

      // Project status distribution
      const allProjects = allProjectsResult.status === 'fulfilled' && allProjectsResult.value.data ? allProjectsResult.value.data : [];
      const statusCounts: any = {};
      allProjects.forEach((p: any) => {
        const status = p.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const projectStatusChart = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
        value,
      }));
      setProjectStatusData(projectStatusChart.length > 0 ? projectStatusChart : [
        { name: 'Planning', value: 0 },
        { name: 'In Progress', value: 0 },
        { name: 'Completed', value: 0 },
      ]);

      // Staff distribution by company
      const allStaff = allStaffResult.status === 'fulfilled' && allStaffResult.value.data ? allStaffResult.value.data : [];
      const companyCounts: any = {};
      allStaff.forEach((s: any) => {
        const company = s.company_id ? 'Assigned' : 'Unassigned';
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      });
      const staffDistChart = Object.entries(companyCounts).map(([name, value]) => ({
        name,
        value,
      }));
      setStaffDistribution(staffDistChart.length > 0 ? staffDistChart : [
        { name: 'Assigned', value: 0 },
        { name: 'Unassigned', value: 0 },
      ]);

      // Fetch companies and their financial data
      const allCompanies = await companyService.getAllCompanies();
      setCompanies(allCompanies);

      // Calculate financial data per company
      const companyFinancialData = await Promise.all(
        allCompanies.map(async (company) => {
          const companySummary = await financialService.getFinancialSummary({
            companyId: company.id,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });

          // Calculate number of days in the period
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

          return {
            companyId: company.id,
            companyName: company.name,
            dailyIncome: companySummary.totalIncome / daysDiff,
            dailyExpenses: companySummary.totalExpenses / daysDiff,
          };
        })
      );
      setCompanyFinancials(companyFinancialData);

      setStats({
        totalCompanies: companiesCount,
        totalStaff: staffCount,
        activeProjects: projectsCount,
        pendingLeaves: leavesCount,
        revenue,
        expenses,
        profit: revenue - expenses,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message || 'Failed to load dashboard data.');
      setStats({
        totalCompanies: 0,
        totalStaff: 0,
        activeProjects: 0,
        pendingLeaves: 0,
        revenue: 0,
        expenses: 0,
        profit: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [financialPeriod]);


  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const StatCard = ({ title, value, icon, color, trend, subtitle }: any) => {
    const colorMap: any = {
      primary: { bg: '#dbeafe', iconBg: '#2563eb', text: '#2563eb' },
      info: { bg: '#e0e7ff', iconBg: '#7c3aed', text: '#7c3aed' },
      warning: { bg: '#fef3c7', iconBg: '#ca8a04', text: '#ca8a04' },
      error: { bg: '#fee2e2', iconBg: '#dc2626', text: '#dc2626' },
      success: { bg: '#dcfce7', iconBg: '#16a34a', text: '#16a34a' },
    };

    const colors = colorMap[color] || colorMap.primary;
    const displayValue = typeof value === 'number' ? value.toLocaleString() : (value || '0');

    return (
      <Card 
        sx={{ 
          height: '100%',
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500,
                  mb: 0.5,
                  fontSize: '0.875rem',
                }}
              >
                {title}
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {displayValue}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box 
              sx={{ 
                width: 56,
                height: 56,
                borderRadius: 2,
                backgroundColor: colors.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.iconBg,
              }}
            >
              {icon}
            </Box>
          </Box>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
              {trend > 0 ? (
                <ArrowUpward sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <ArrowDownward sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography variant="caption" sx={{ color: trend > 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#ca8a04', '#dc2626', '#0891b2'];

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Welcome back, {user?.firstName || 'Supervisor'}! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's what's happening with your business today
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Currency Selector */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  '& .MuiSelect-select': {
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  },
                }}
                startAdornment={<CurrencyExchange sx={{ fontSize: 18, mr: 1, color: 'primary.main' }} />}
              >
                <MenuItem value="USD">$ USD - US Dollar</MenuItem>
                <MenuItem value="AED">د.إ AED - UAE Dirham</MenuItem>
                <MenuItem value="XAF">FCFA XAF - Central African CFA Franc</MenuItem>
                <MenuItem value="GHS">₵ GHS - Ghana Cedi</MenuItem>
                <MenuItem value="EUR">€ EUR - Euro</MenuItem>
                <MenuItem value="GBP">£ GBP - British Pound</MenuItem>
                <MenuItem value="SAR">﷼ SAR - Saudi Riyal</MenuItem>
                <MenuItem value="EGP">E£ EGP - Egyptian Pound</MenuItem>
                <MenuItem value="JPY">¥ JPY - Japanese Yen</MenuItem>
                <MenuItem value="CNY">¥ CNY - Chinese Yuan</MenuItem>
              </Select>
            </FormControl>
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
        </Box>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Companies"
            value={stats.totalCompanies ?? 0}
            icon={<Business sx={{ fontSize: 28 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Staff"
            value={stats.totalStaff ?? 0}
            icon={<People sx={{ fontSize: 28 }} />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Active Projects"
            value={stats.activeProjects ?? 0}
            icon={<Folder sx={{ fontSize: 28 }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Pending Leaves"
            value={stats.pendingLeaves ?? 0}
            icon={<Event sx={{ fontSize: 28 }} />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Analytics Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <BarChart sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Analytics Insights
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {/* Revenue vs Expenses Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Revenue Vs Expenses
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {financialPeriod === 'day' ? 'Today' : financialPeriod === 'week' ? 'This Week' : financialPeriod === 'month' ? 'This Month' : 'This Year'}
                    </Typography>
                  </Box>
                  <ShowChart sx={{ color: 'primary.main', fontSize: 32 }} />
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey={financialPeriod === 'day' ? 'time' : financialPeriod === 'week' ? 'day' : financialPeriod === 'month' ? 'day' : 'month'} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 8,
                      }}
                      formatter={(value: any) => `${currencySymbol}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#16a34a" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#dc2626" 
                      fillOpacity={1} 
                      fill="url(#colorExpenses)"
                      name="Expenses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Project Status Distribution */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ 
              borderRadius: 3, 
              border: '1px solid rgba(0,0,0,0.08)', 
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              },
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    backgroundColor: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <PieChart sx={{ fontSize: 24, color: '#7c3aed' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Project Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Distribution Overview
                    </Typography>
                  </Box>
                </Box>
                {projectStatusData.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <PieChart sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.noProjectData')}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={projectStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          innerRadius={40}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {projectStatusData.map((entry: any, index: number) => {
                            // Use colors from PROJECT_STATUSES if available
                            const statusColors: any = {
                              'planning': '#FFA726',
                              'in-progress': '#42A5F5',
                              'on-hold': '#EF5350',
                              'completed': '#66BB6A',
                              'cancelled': '#78909C',
                            };
                            const color = statusColors[entry.name?.toLowerCase().replace(' ', '-')] || COLORS[index % COLORS.length];
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [value, t('dashboard.admin.projects')]}
                          contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {projectStatusData.map((entry: any, index: number) => {
                        const statusColors: any = {
                          'planning': '#FFA726',
                          'in-progress': '#42A5F5',
                          'on-hold': '#EF5350',
                          'completed': '#66BB6A',
                          'cancelled': '#78909C',
                        };
                        const color = statusColors[entry.name?.toLowerCase().replace(' ', '-')] || COLORS[index % COLORS.length];
                        const percent = projectStatusData.reduce((sum: number, item: any) => sum + item.value, 0) > 0
                          ? ((entry.value / projectStatusData.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(1)
                          : 0;
                        return (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {entry.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {entry.value}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({percent}%)
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Staff Distribution */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3, 
              border: '1px solid rgba(0,0,0,0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <People sx={{ color: 'info.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Staff Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assignment Status
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={staffDistribution}>
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
                      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial Summary */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              borderRadius: 3, 
              border: '1px solid rgba(0,0,0,0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney sx={{ color: 'success.main' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Financial Summary
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Current Period Overview
                      </Typography>
                    </Box>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      value={financialPeriod}
                      label="Period"
                      onChange={(e) => setFinancialPeriod(e.target.value as 'day' | 'week' | 'month' | 'year')}
                    >
                      <MenuItem value="day">Today</MenuItem>
                      <MenuItem value="week">This Week</MenuItem>
                      <MenuItem value="month">This Month</MenuItem>
                      <MenuItem value="year">This Year</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, justifyContent: 'center' }}>
                  <Box sx={{ 
                    p: 2.5, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Total Revenue
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {currencySymbol}{(stats.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 2.5, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Total Expenses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {currencySymbol}{(stats.expenses ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 2.5, 
                    borderRadius: 2, 
                    background: (stats.profit ?? 0) > 0 
                      ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
                      : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: (stats.profit ?? 0) > 0 
                      ? '1px solid rgba(107, 114, 128, 0.2)'
                      : '1px solid rgba(245, 158, 11, 0.2)',
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {financialPeriod === 'day' ? 'Daily Profit' : financialPeriod === 'week' ? 'Weekly Profit' : financialPeriod === 'month' ? 'Monthly Profit' : 'Yearly Profit'}
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        color: (stats.profit ?? 0) > 0 ? 'text.primary' : 'warning.main',
                      }}
                    >
                      {currencySymbol}{(stats.profit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Chip 
                      label={(stats.profit ?? 0) > 0 ? 'Profitable' : 'Profit'} 
                      size="small" 
                      sx={{ 
                        mt: 1,
                    backgroundColor: (stats.profit ?? 0) > 0 
                      ? 'rgba(107, 114, 128, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                        color: (stats.profit ?? 0) > 0 ? 'text.secondary' : 'warning.main',
                        fontWeight: 600,
                      }} 
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Company Financial Breakdown */}
      {companyFinancials.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Business sx={{ color: 'primary.main', fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Company Financial Breakdown
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {financialPeriod === 'day' ? 'Today\'s' : financialPeriod === 'week' ? 'This Week\'s' : financialPeriod === 'month' ? 'This Month\'s' : 'This Year\'s'} performance by company
                </Typography>
              </Box>
            </Box>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>Company</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>
                    {financialPeriod === 'day' ? 'Daily Income' : 'Avg Daily Income'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>
                    {financialPeriod === 'day' ? 'Daily Expenses' : 'Avg Daily Expenses'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>
                    {financialPeriod === 'day' ? 'Daily Profit' : 'Avg Daily Profit'}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companyFinancials.map((company) => {
                  const profit = company.dailyIncome - company.dailyExpenses;
                  return (
                    <TableRow 
                      key={company.companyId} 
                      hover
                      onClick={async () => {
                        const dateRange = getDateRange(financialPeriod);
                        const companySummary = await financialService.getFinancialSummary({
                          companyId: company.companyId,
                          startDate: dateRange.startDate,
                          endDate: dateRange.endDate,
                        });
                        setCompanyDialog({
                          open: true,
                          company: { companyId: company.companyId, companyName: company.companyName },
                          financialData: {
                            income: companySummary.totalIncome,
                            expenses: companySummary.totalExpenses,
                            profit: companySummary.totalIncome - companySummary.totalExpenses,
                          },
                        });
                      }}
                      sx={{ 
                        cursor: 'pointer',
                        '&:last-child td': { borderBottom: 0 },
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: 1, 
                            backgroundColor: '#e0e7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Business sx={{ color: '#7c3aed', fontSize: 16 }} />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {company.companyName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {currencySymbol}{company.dailyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {currencySymbol}{company.dailyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${currencySymbol}${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          sx={{
                            fontWeight: 700,
                            backgroundColor: profit >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: profit >= 0 ? 'success.main' : 'error.main',
                            border: `1px solid ${profit >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Company Financial Breakdown Dialog */}
      <Dialog 
        open={companyDialog.open} 
        onClose={() => setCompanyDialog({ open: false, company: null, financialData: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Business sx={{ color: '#2563eb', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {companyDialog.company?.companyName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {financialPeriod === 'day' ? 'Today' : financialPeriod === 'week' ? 'This Week' : financialPeriod === 'month' ? 'This Month' : 'This Year'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, backgroundColor: '#f9fafb' }}>
          {companyDialog.financialData && (
            <Box>
              {/* Pie Chart */}
              <Box sx={{ mb: 3 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Income', value: companyDialog.financialData.income, color: '#16a34a' },
                        { name: 'Expenses', value: companyDialog.financialData.expenses, color: '#dc2626' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {[
                        { name: 'Income', value: companyDialog.financialData.income, color: '#16a34a' },
                        { name: 'Expenses', value: companyDialog.financialData.expenses, color: '#dc2626' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => `${currencySymbol}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Box>

              {/* Financial Details */}
              <Stack spacing={2}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: '#16a34a' 
                    }} />
                    <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      Income
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#16a34a' }}>
                    {currencySymbol}{companyDialog.financialData.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: '#dc2626' 
                    }} />
                    <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      Expenses
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#dc2626' }}>
                    {currencySymbol}{companyDialog.financialData.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: 'white',
                  border: '2px solid',
                  borderColor: companyDialog.financialData.profit >= 0 ? '#16a34a' : '#dc2626',
                }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Net Profit
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: companyDialog.financialData.profit >= 0 ? '#16a34a' : '#dc2626' 
                  }}>
                    {currencySymbol}{companyDialog.financialData.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', backgroundColor: 'white' }}>
          <Button 
            onClick={() => setCompanyDialog({ open: false, company: null, financialData: null })}
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              px: 3,
              textTransform: 'none',
              fontWeight: 500,
              borderColor: '#e5e7eb',
              color: 'text.primary',
              '&:hover': {
                borderColor: '#d1d5db',
                backgroundColor: '#f9fafb',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Actions */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { 
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/companies')}
            >
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Business sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Manage Companies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { 
                  borderColor: 'info.main',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/staff')}
            >
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <People sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Manage Staff
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { 
                  borderColor: 'warning.main',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/projects')}
            >
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Folder sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  View Projects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { 
                  borderColor: 'error.main',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                },
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/leaves')}
            >
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Event sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Review Leaves
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Fab
        color="primary"
        aria-label="AI Assistant"
        sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24,
          width: 56,
          height: 56,
        }}
        onClick={() => navigate('/ai')}
      >
        🤖
      </Fab>
    </Box>
  );
};

export default AdminDashboard;

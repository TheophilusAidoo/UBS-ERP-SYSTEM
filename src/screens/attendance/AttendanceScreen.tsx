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
  InputAdornment,
  Divider,
  Tabs,
  Tab,
  Paper,
  Stack,
  Pagination,
} from '@mui/material';
import {
  AccessTime,
  Login,
  Logout,
  Refresh,
  History,
  People,
  CalendarToday,
  Schedule,
  Search,
  FilterList,
  Visibility,
  Close,
  TrendingUp,
  CheckCircle,
  Cancel,
  BarChart,
  ShowChart,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
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
import { attendanceService } from '../../services/attendance.service';
import { staffService } from '../../services/staff.service';
import { Attendance, User } from '../../types';

const AttendanceScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<Attendance[]>([]);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [clocking, setClocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'in' | 'out' | null }>({
    open: false,
    action: null,
  });
  
  // Admin filters
  const [dateFilter, setDateFilter] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [statusFilter, setStatusFilter] = useState<'all' | 'clocked-in' | 'not-clocked-in'>('all');
  const [selectedFilterDate, setSelectedFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{
    totalStaff: number;
    clockedIn: number;
    notClockedIn: number;
    totalHours: number;
  } | null>(null);
  
  // Stats for staff
  const [dailyStats, setDailyStats] = useState<{ totalHours: number; totalDays: number; averageHours: number } | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<{ totalHours: number; totalDays: number; averageHours: number } | null>(null);
  const [yearlyStats, setYearlyStats] = useState<{ totalHours: number; totalDays: number; averageHours: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Admin detailed view
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [staffHistoryDialog, setStaffHistoryDialog] = useState(false);
  const [staffAttendanceHistory, setStaffAttendanceHistory] = useState<Attendance[]>([]);
  const [staffBreaks, setStaffBreaks] = useState<string[]>([]);
  const [staffSummary, setStaffSummary] = useState<{
    totalDays: number;
    workingDays: number;
    breakDays: number;
    totalHours: number;
  } | null>(null);
  const [staffHistoryLoading, setStaffHistoryLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    end: new Date().toISOString().split('T')[0], // Today
  });
  
  // Pagination state for staff list
  const [staffPage, setStaffPage] = useState(1);
  const staffPerPage = 9;

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        fetchAllAttendance();
        fetchAllStaff();
      } else if (isStaff) {
        fetchTodayAttendance();
        fetchHistory();
        fetchStats();
      }
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recalculate stats when filters or data change
  useEffect(() => {
    if (isAdmin && allStaff.length > 0) {
      calculateAttendanceStats(allStaff);
    }
  }, [dateFilter, selectedFilterDate, allAttendance, allStaff, isAdmin]);

  useEffect(() => {
    if (isAdmin && allAttendance.length > 0) {
      let filtered = allAttendance;
      
      // Filter by date
      if (dateFilter === 'daily') {
        filtered = filtered.filter(record => record.date === selectedFilterDate);
      } else if (dateFilter === 'monthly') {
        const selectedDate = new Date(selectedFilterDate);
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= monthStart && recordDate <= monthEnd;
        });
      } else if (dateFilter === 'yearly') {
        const selectedDate = new Date(selectedFilterDate);
        const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
        const yearEnd = new Date(selectedDate.getFullYear(), 11, 31);
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= yearStart && recordDate <= yearEnd;
        });
      }
      
      // Filter by status
      if (statusFilter === 'clocked-in') {
        filtered = filtered.filter(record => record.clockIn);
      } else if (statusFilter === 'not-clocked-in') {
        filtered = filtered.filter(record => !record.clockIn);
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(record => {
          const name = `${record.user?.firstName || ''} ${record.user?.lastName || ''}`.toLowerCase();
          const email = record.user?.email?.toLowerCase() || '';
          return name.includes(query) || email.includes(query);
        });
      }
      
      setFilteredAttendance(filtered);
    } else {
      setFilteredAttendance(allAttendance);
    }
  }, [searchQuery, allAttendance, isAdmin, dateFilter, selectedFilterDate, statusFilter]);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const attendance = await attendanceService.getTodayAttendance(user.id);
      setTodayAttendance(attendance);
    } catch (err: any) {
      console.error('Error fetching today attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const history = await attendanceService.getAttendanceHistory(user.id, 1000); // Get more history
      setAttendanceHistory(history);
    } catch (err: any) {
      console.error('Error fetching attendance history:', err);
      setError(err.message || t('attendance.failedToLoadHistory'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      setStatsLoading(true);
      const [daily, monthly, yearly] = await Promise.all([
        attendanceService.getAttendanceStats(user.id, 'daily'),
        attendanceService.getAttendanceStats(user.id, 'monthly'),
        attendanceService.getAttendanceStats(user.id, 'yearly'),
      ]);
      setDailyStats(daily);
      setMonthlyStats(monthly);
      setYearlyStats(yearly);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAllAttendance = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const attendance = await attendanceService.getAllAttendance();
      setAllAttendance(attendance);
      setFilteredAttendance(attendance);
    } catch (err: any) {
      console.error('Error fetching all attendance:', err);
      setError(err.message || t('attendance.failedToLoadRecords'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStaff = async () => {
    if (!user) return;
    try {
      const staff = await staffService.getAllStaff();
      setAllStaff(staff);
    } catch (err: any) {
      console.error('Error fetching all staff:', err);
      // Don't show error for this, just log it
    }
  };

  const calculateAttendanceStats = (staff: User[]) => {
    if (!staff.length) return;

    const today = selectedFilterDate;
    const clockedInStaff = new Set<string>();
    
    // Get all attendance for the selected date
    allAttendance.forEach(record => {
      if (record.date === today && record.clockIn) {
        clockedInStaff.add(record.userId);
      }
    });

    const clockedIn = clockedInStaff.size;
    const notClockedIn = staff.length - clockedIn;
    
    // Calculate total hours for the selected date
    const totalHours = allAttendance
      .filter(r => r.date === today && r.totalHours)
      .reduce((sum, r) => sum + (r.totalHours || 0), 0);

    setAttendanceStats({
      totalStaff: staff.length,
      clockedIn,
      notClockedIn,
      totalHours: Math.round(totalHours * 100) / 100,
    });

    // Generate chart data based on date filter
    generateChartData(staff, clockedInStaff);
  };

  const generateChartData = (staff: User[], clockedInStaff: Set<string>) => {
    let data: any[] = [];
    const today = new Date(selectedFilterDate);
    
    if (dateFilter === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayAttendance = allAttendance.filter(a => a.date === dateStr);
        const clockedIn = dayAttendance.filter(a => a.clockIn).length;
        const totalHours = dayAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          clockedIn,
          notClockedIn: staff.length - clockedIn,
          totalHours: Math.round(totalHours * 100) / 100,
        });
      }
    } else if (dateFilter === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthAttendance = allAttendance.filter(a => {
          const recordDate = new Date(a.date);
          return recordDate >= monthStart && recordDate <= monthEnd;
        });
        
        const uniqueStaff = new Set(monthAttendance.map(a => a.userId));
        const totalHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          clockedIn: uniqueStaff.size,
          notClockedIn: staff.length - uniqueStaff.size,
          totalHours: Math.round(totalHours * 100) / 100,
        });
      }
    } else {
      // Last 12 months (yearly view)
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthAttendance = allAttendance.filter(a => {
          const recordDate = new Date(a.date);
          return recordDate >= monthStart && recordDate <= monthEnd;
        });
        
        const uniqueStaff = new Set(monthAttendance.map(a => a.userId));
        const totalHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short' }),
          clockedIn: uniqueStaff.size,
          notClockedIn: staff.length - uniqueStaff.size,
          totalHours: Math.round(totalHours * 100) / 100,
        });
      }
    }
    
    setAttendanceChartData(data);
  };

  const fetchStaffHistory = async (staffId: string) => {
    try {
      setStaffHistoryLoading(true);
      const summary = await attendanceService.getAttendanceSummaryWithBreaks(
        staffId,
        dateRange.start,
        dateRange.end
      );
      setStaffAttendanceHistory(summary.attendance);
      setStaffBreaks(summary.breaks);
      setStaffSummary({
        totalDays: summary.totalDays,
        workingDays: summary.workingDays,
        breakDays: summary.breakDays,
        totalHours: summary.totalHours,
      });
    } catch (err: any) {
      console.error('Error fetching staff history:', err);
      setError(err.message || t('attendance.failedToLoadStaffHistory'));
    } finally {
      setStaffHistoryLoading(false);
    }
  };

  const handleViewStaffHistory = async (staff: User) => {
    setSelectedStaff(staff);
    setStaffHistoryDialog(true);
    await fetchStaffHistory(staff.id);
  };

  const handleClockIn = async () => {
    if (!user || !isStaff) return;
    try {
      setClocking(true);
      setError(null);
      const attendance = await attendanceService.clockIn({ userId: user.id });
      setTodayAttendance(attendance);
      setSuccess(t('attendance.clockInSuccess'));
      setTimeout(() => setSuccess(null), 3000);
      await fetchHistory();
      await fetchStats();
    } catch (err: any) {
      setError(err.message || t('attendance.failedToClockIn'));
    } finally {
      setClocking(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance || !isStaff) return;
    try {
      setClocking(true);
      setError(null);
      const attendance = await attendanceService.clockOut({
        attendanceId: todayAttendance.id,
        clockOut: new Date().toISOString(),
      });
      setTodayAttendance(attendance);
      setSuccess(t('attendance.clockOutSuccess'));
      setTimeout(() => setSuccess(null), 3000);
      await fetchHistory();
      await fetchStats();
    } catch (err: any) {
      setError(err.message || t('attendance.failedToClockOut'));
    } finally {
      setClocking(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDateOnly = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const canClockIn = isStaff && (!todayAttendance || todayAttendance.clockOut);
  const canClockOut = isStaff && todayAttendance && !todayAttendance.clockOut;

  // Generate calendar days for current month
  const getCalendarDays = () => {
    const year = new Date(selectedDate).getFullYear();
    const month = new Date(selectedDate).getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const hasAttendance = attendanceHistory.some(a => a.date === dateStr);
      days.push({ day, date: dateStr, hasAttendance });
    }

    return days;
  };

  // Get all staff members (from registered staff, not just attendance records)
  const getUniqueStaff = () => {
    // Use allStaff if available (all registered staff), otherwise fall back to attendance records
    if (allStaff.length > 0) {
      return allStaff;
    }
    // Fallback: get unique staff from attendance records if staff list not loaded yet
    const staffMap = new Map<string, User>();
    allAttendance.forEach(record => {
      if (record.user && !staffMap.has(record.user.id)) {
        staffMap.set(record.user.id, record.user);
      }
    });
    return Array.from(staffMap.values());
  };

  // Get filtered staff based on status filter and search
  const getFilteredStaff = () => {
    let staff = getUniqueStaff();
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const today = selectedFilterDate;
      const clockedInStaffIds = new Set<string>();
      
      allAttendance.forEach(record => {
        if (record.date === today && record.clockIn) {
          clockedInStaffIds.add(record.userId);
        }
      });
      
      if (statusFilter === 'clocked-in') {
        staff = staff.filter(s => clockedInStaffIds.has(s.id));
      } else if (statusFilter === 'not-clocked-in') {
        staff = staff.filter(s => !clockedInStaffIds.has(s.id));
      }
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      staff = staff.filter(s => {
        const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        const email = s.email.toLowerCase();
        const company = s.company?.name?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || company.includes(query);
      });
    }
    
    return staff;
  };

  // Get paginated staff for display (sorted: clocked-in first, then not clocked-in)
  const getPaginatedStaff = () => {
    const filtered = getFilteredStaff();
    
    // Sort: clocked-in staff first, then not clocked-in
    const today = selectedFilterDate;
    const sortedStaff = [...filtered].sort((a, b) => {
      const aRecord = allAttendance.find(att => att.userId === a.id && att.date === today);
      const bRecord = allAttendance.find(att => att.userId === b.id && att.date === today);
      const aClockedIn = aRecord?.clockIn ? 1 : 0;
      const bClockedIn = bRecord?.clockIn ? 1 : 0;
      
      // Clocked-in first (descending), then by name
      if (aClockedIn !== bClockedIn) {
        return bClockedIn - aClockedIn;
      }
      
      // If same status, sort by name
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
      return aName.localeCompare(bName);
    });
    
    const startIndex = (staffPage - 1) * staffPerPage;
    const endIndex = startIndex + staffPerPage;
    return sortedStaff.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const totalStaffPages = Math.ceil(getFilteredStaff().length / staffPerPage);

  // Reset page when filters change
  useEffect(() => {
    setStaffPage(1);
  }, [statusFilter, searchQuery, selectedFilterDate]);

  // Admin View - All Attendance
  if (isAdmin) {
    return (
      <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                {t('attendance.management')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('attendance.description')}
              </Typography>
            </Box>
            <IconButton 
              onClick={fetchAllAttendance} 
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

        {/* Summary Cards */}
        {attendanceStats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('attendance.totalStaff')}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {attendanceStats.totalStaff}
                      </Typography>
                    </Box>
                    <People sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('attendance.clockedIn')}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {attendanceStats.clockedIn}
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('attendance.notClockedIn')}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {attendanceStats.notClockedIn}
                      </Typography>
                    </Box>
                    <Cancel sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('attendance.totalHours')}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                        {attendanceStats.totalHours}
                      </Typography>
                    </Box>
                    <AccessTime sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters and Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Filters Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <FilterList sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('attendance.filters')}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                
                {/* Date Filter */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    {t('attendance.dateRange')}
                  </Typography>
                  <Tabs
                    value={dateFilter}
                    onChange={(e, newValue) => setDateFilter(newValue)}
                    sx={{ mb: 2 }}
                  >
                    <Tab label={t('attendance.daily')} value="daily" />
                    <Tab label={t('attendance.monthly')} value="monthly" />
                    <Tab label={t('attendance.yearly')} value="yearly" />
                  </Tabs>
                  {dateFilter === 'daily' && (
                    <TextField
                      type="date"
                      label={t('attendance.selectDate')}
                      value={selectedFilterDate}
                      onChange={(e) => setSelectedFilterDate(e.target.value)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>

                {/* Status Filter */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    {t('attendance.status')}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={t('attendance.all')}
                      onClick={() => setStatusFilter('all')}
                      color={statusFilter === 'all' ? 'primary' : 'default'}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label={t('attendance.clockedIn')}
                      onClick={() => setStatusFilter('clocked-in')}
                      color={statusFilter === 'clocked-in' ? 'success' : 'default'}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label={t('attendance.notClockedIn')}
                      onClick={() => setStatusFilter('not-clocked-in')}
                      color={statusFilter === 'not-clocked-in' ? 'error' : 'default'}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Stack>
                </Box>

                {/* Search */}
                <TextField
                  fullWidth
                  placeholder={t('attendance.searchStaff')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Chart Card */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <BarChart sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('attendance.attendanceOverview')}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                {attendanceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={attendanceChartData}>
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
                      <Legend />
                      <Bar dataKey="clockedIn" fill="#16a34a" name={t('attendance.clockedIn')} />
                      <Bar dataKey="notClockedIn" fill="#dc2626" name={t('attendance.notClockedIn')} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <BarChart sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {t('attendance.noDataAvailable')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Staff List with View History Button */}
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <People sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('attendance.staffMembers')}
              </Typography>
              <Chip 
                label={
                  totalStaffPages > 1
                    ? `Showing ${(staffPage - 1) * staffPerPage + 1}-${Math.min(staffPage * staffPerPage, getFilteredStaff().length)} of ${getFilteredStaff().length} staff`
                    : `${getFilteredStaff().length} staff`
                }
                size="small" 
                sx={{ ml: 'auto' }}
              />
            </Box>
            <Divider sx={{ mb: 3 }} />
            {getFilteredStaff().length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <People sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {t('attendance.noStaffFound')}
                </Typography>
              </Box>
            ) : (
              <>
                <Grid container spacing={2}>
                  {getPaginatedStaff().map((staff) => (
                  <Grid item xs={12} sm={6} md={4} key={staff.id}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid rgba(0,0,0,0.08)',
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {staff.firstName && staff.lastName
                              ? `${staff.firstName} ${staff.lastName}`
                              : staff.email}
                          </Typography>
                          {staff.email && (
                            <Typography variant="caption" color="text.secondary">
                              {staff.email}
                            </Typography>
                          )}
                          {staff.company && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {staff.company.name}
                            </Typography>
                          )}
                        </Box>
                        {(() => {
                          const today = selectedFilterDate;
                          const todayAttendance = allAttendance.find(
                            a => a.userId === staff.id && a.date === today
                          );
                          const hasClockedIn = todayAttendance?.clockIn;
                          return (
                            <Chip
                              icon={hasClockedIn ? <CheckCircle /> : <Cancel />}
                              label={hasClockedIn ? t('attendance.clockedIn') : t('attendance.notClockedIn')}
                              color={hasClockedIn ? 'success' : 'error'}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          );
                        })()}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={<Visibility />}
                        onClick={() => handleViewStaffHistory(staff)}
                        sx={{ borderRadius: 2, mt: 1 }}
                      >
                        {t('attendance.viewHistory')}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
                  ))}
                </Grid>
                {totalStaffPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                      count={totalStaffPages}
                      page={staffPage}
                      onChange={(event, value) => setStaffPage(value)}
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

        {/* Attendance Table - Shows All Staff with Clock-In Status */}
        <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('attendance.allStaffAttendance')}
              </Typography>
              <Chip 
                label={
                  totalStaffPages > 1
                    ? `Showing ${(staffPage - 1) * staffPerPage + 1}-${Math.min(staffPage * staffPerPage, getFilteredStaff().length)} of ${getFilteredStaff().length} staff`
                    : `${getFilteredStaff().length} staff`
                }
                size="small" 
                sx={{ ml: 'auto' }}
              />
            </Box>
            <Divider />
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
              </Box>
            ) : getFilteredStaff().length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <People sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {searchQuery ? t('common.noResults') : t('attendance.noStaffFound')}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('attendance.employee')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('staff.company')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('attendance.date')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('attendance.clockInTime')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('attendance.clockOutTime')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="right">{t('attendance.hours')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('attendance.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const paginatedStaff = getPaginatedStaff();
                      const hasClockedIn = paginatedStaff.some(staff => {
                        const record = allAttendance.find(a => a.userId === staff.id && a.date === selectedFilterDate);
                        return !!record?.clockIn;
                      });
                      const hasNotClockedIn = paginatedStaff.some(staff => {
                        const record = allAttendance.find(a => a.userId === staff.id && a.date === selectedFilterDate);
                        return !record?.clockIn;
                      });
                      let clockedInHeaderShown = false;
                      
                      return paginatedStaff.map((staff, index) => {
                        // Find attendance record for this staff member on the selected date
                        const attendanceRecord = allAttendance.find(
                          a => a.userId === staff.id && a.date === selectedFilterDate
                        );
                        const isClockedIn = !!attendanceRecord?.clockIn;
                        
                        // Show "Clocked In" header before first clocked-in staff
                        const showClockedInHeader = hasClockedIn && hasNotClockedIn && isClockedIn && !clockedInHeaderShown;
                        if (showClockedInHeader) clockedInHeaderShown = true;
                        
                        // Check if this is the first not-clocked-in staff (for separator)
                        const prevStaff = index > 0 ? paginatedStaff[index - 1] : null;
                        const prevRecord = prevStaff ? allAttendance.find(
                          a => a.userId === prevStaff.id && a.date === selectedFilterDate
                        ) : null;
                        const showSeparator = index > 0 && prevRecord?.clockIn && !isClockedIn;
                      
                        return (
                          <React.Fragment key={staff.id}>
                            {showClockedInHeader && (
                              <TableRow>
                                <TableCell colSpan={7} sx={{ py: 1.5, backgroundColor: 'rgba(22, 163, 74, 0.1)', borderTop: '2px solid rgba(22, 163, 74, 0.3)' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircle sx={{ color: 'success.main' }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                      Clocked In Staff
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                            {showSeparator && (
                              <TableRow>
                                <TableCell colSpan={7} sx={{ py: 1.5, backgroundColor: 'rgba(211, 47, 47, 0.1)', borderTop: '2px solid rgba(211, 47, 47, 0.3)' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Cancel sx={{ color: 'error.main' }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                      Not Clocked In Staff
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          <TableRow 
                            hover
                            sx={{
                              '&:last-child td': { borderBottom: 0 },
                              backgroundColor: isClockedIn 
                                ? 'rgba(22, 163, 74, 0.08)' 
                                : 'rgba(211, 47, 47, 0.05)',
                              borderLeft: isClockedIn 
                                ? '4px solid rgba(22, 163, 74, 0.5)' 
                                : '4px solid rgba(211, 47, 47, 0.3)',
                              '&:hover': {
                                backgroundColor: isClockedIn 
                                  ? 'rgba(22, 163, 74, 0.12)' 
                                  : 'rgba(211, 47, 47, 0.08)',
                              },
                            }}
                          >
                          <TableCell>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {staff.firstName && staff.lastName
                                  ? `${staff.firstName} ${staff.lastName}`
                                  : (staff.email || t('attendance.unknown'))}
                              </Typography>
                              {staff.email && (
                                <Typography variant="caption" color="text.secondary">
                                  {staff.email}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {staff.company?.name || t('attendance.unassigned')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatDateShort(selectedFilterDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(selectedFilterDate).toLocaleDateString('en-US', { weekday: 'short' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {attendanceRecord?.clockIn ? (
                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                                {formatTime(attendanceRecord.clockIn)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                --
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {attendanceRecord?.clockOut ? (
                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                                {formatTime(attendanceRecord.clockOut)}
                              </Typography>
                            ) : attendanceRecord?.clockIn ? (
                              <Typography variant="body2" color="warning.main">
                                {t('attendance.inProgress')}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                --
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {attendanceRecord?.totalHours ? `${attendanceRecord.totalHours}h` : '--'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {attendanceRecord?.clockIn ? (
                              <Chip
                                icon={attendanceRecord.clockOut ? <CheckCircle /> : <AccessTime />}
                                label={attendanceRecord.clockOut ? t('attendance.completed') : t('attendance.inProgress')}
                                color={attendanceRecord.clockOut ? 'success' : 'warning'}
                                size="small"
                                sx={{ fontWeight: 500 }}
                              />
                            ) : (
                              <Chip
                                icon={<Cancel />}
                                label={t('attendance.notClockedIn')}
                                color="error"
                                size="small"
                                sx={{ fontWeight: 500 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
                {totalStaffPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    <Pagination
                      count={totalStaffPages}
                      page={staffPage}
                      onChange={(event, value) => setStaffPage(value)}
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

        {/* Staff History Dialog */}
        <Dialog
          open={staffHistoryDialog}
          onClose={() => setStaffHistoryDialog(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.08)', pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('attendance.attendanceHistory')} - {selectedStaff?.firstName && selectedStaff?.lastName
                    ? `${selectedStaff.firstName} ${selectedStaff.lastName}`
                    : selectedStaff?.email}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('attendance.completeRecord')}
                </Typography>
              </Box>
              <IconButton onClick={() => setStaffHistoryDialog(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {/* Date Range Selector */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label={t('attendance.startDate')}
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label={t('attendance.endDate')}
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                onClick={() => selectedStaff && fetchStaffHistory(selectedStaff.id)}
                disabled={staffHistoryLoading}
                sx={{ borderRadius: 2 }}
              >
                {t('common.submit')}
              </Button>
            </Box>

            {/* Summary Cards */}
            {staffSummary && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{t('attendance.totalDays')}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {staffSummary.totalDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{t('attendance.workingDays')}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {staffSummary.workingDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{t('attendance.breakDays')}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {staffSummary.breakDays}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{t('attendance.totalHours')}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {staffSummary.totalHours.toFixed(1)}h
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {staffHistoryLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Attendance Records */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Attendance Records ({staffAttendanceHistory.length})
                </Typography>
                <TableContainer sx={{ mb: 3, maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Clock In</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Clock Out</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Hours</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staffAttendanceHistory.map((record) => (
                        <TableRow key={record.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatDateShort(record.date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                              {formatTime(record.clockIn)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: record.clockOut ? 'error.main' : 'text.secondary' }}>
                              {formatTime(record.clockOut)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {record.totalHours ? `${record.totalHours}h` : '--'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={record.clockOut ? 'Completed' : 'In Progress'}
                              color={record.clockOut ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Break Days */}
                {staffBreaks.length > 0 && (
                  <>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      Break Days - Days Without Attendance ({staffBreaks.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflowY: 'auto' }}>
                      {staffBreaks.map((date) => (
                        <Chip
                          key={date}
                          label={formatDateShort(date)}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <Button onClick={() => setStaffHistoryDialog(false)} sx={{ borderRadius: 2 }}>
              {t('common.close')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Staff View - Clock In/Out with Calendar and Stats
  return (
    <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('attendance.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('attendance.description')}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => {
              fetchTodayAttendance();
              fetchHistory();
              fetchStats();
            }} 
            disabled={loading || statsLoading}
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

      {/* Accumulated Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Today
                </Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={24} />
              ) : dailyStats ? (
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Hours</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {dailyStats.totalHours.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Days Worked</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {dailyStats.totalDays}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Average Hours/Day</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {dailyStats.averageHours.toFixed(1)}h
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ color: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  This Month
                </Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={24} />
              ) : monthlyStats ? (
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Hours</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {monthlyStats.totalHours.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Days Worked</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {monthlyStats.totalDays}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Average Hours/Day</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {monthlyStats.averageHours.toFixed(1)}h
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  This Year
                </Typography>
              </Box>
              {statsLoading ? (
                <CircularProgress size={24} />
              ) : yearlyStats ? (
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Hours</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {yearlyStats.totalHours.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Days Worked</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {yearlyStats.totalDays}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Average Hours/Day</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {yearlyStats.averageHours.toFixed(1)}h
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Column - Main Content */}
        <Grid item xs={12} lg={8}>
          {/* Current Time & Date Card */}
          <Card sx={{ mb: 3, borderRadius: 2, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
            <CardContent sx={{ p: 4, color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body1" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
                    {formatDateOnly(currentTime)}
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 2 }}>
                    {formatTimeOnly(currentTime)}
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 64, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Clock In/Out Card */}
          <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  backgroundColor: canClockIn ? 'success.light' : canClockOut ? 'warning.light' : 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}>
                  <AccessTime sx={{ fontSize: 40, color: canClockIn ? 'success.main' : canClockOut ? 'warning.main' : 'text.secondary' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {canClockIn ? 'Ready to Clock In' : canClockOut ? 'Currently Working' : 'Work Day Complete'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {canClockIn
                    ? 'Start your work day by clicking Clock In'
                    : canClockOut
                    ? `Clocked in at ${formatTime(todayAttendance?.clockIn)}`
                    : `Completed at ${formatTime(todayAttendance?.clockOut)}`}
                </Typography>
              </Box>

              {todayAttendance && (
                <Box sx={{ mb: 4, p: 3, backgroundColor: 'action.hover', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Clock In
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                          {formatTime(todayAttendance.clockIn)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Clock Out
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: todayAttendance.clockOut ? 'error.main' : 'text.secondary' }}>
                          {todayAttendance.clockOut ? formatTime(todayAttendance.clockOut) : '--:--'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Total Hours
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {todayAttendance.totalHours ? `${todayAttendance.totalHours}h` : '--'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Login />}
                  onClick={() => setConfirmDialog({ open: true, action: 'in' })}
                  disabled={!canClockIn || clocking || loading}
                  sx={{
                    px: 5,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    minWidth: 160,
                    borderRadius: 2,
                  }}
                >
                  Clock In
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<Logout />}
                  onClick={() => setConfirmDialog({ open: true, action: 'out' })}
                  disabled={!canClockOut || clocking || loading}
                  sx={{
                    px: 5,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    minWidth: 160,
                    borderRadius: 2,
                  }}
                >
                  Clock Out
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <History sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Attendance History
                </Typography>
                <Chip label={`${attendanceHistory.length} records`} size="small" sx={{ ml: 'auto' }} />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : attendanceHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <History sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    No attendance records found
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Clock In</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Clock Out</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Hours</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceHistory.map((record) => (
                        <TableRow key={record.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatDateShort(record.date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                              {formatTime(record.clockIn)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: record.clockOut ? 'error.main' : 'text.secondary' }}>
                              {formatTime(record.clockOut)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {record.totalHours ? `${record.totalHours}h` : '--'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={record.clockOut ? 'Completed' : 'In Progress'}
                              color={record.clockOut ? 'success' : 'warning'}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Calendar */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'sticky', top: 20 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CalendarToday sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Calendar
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center', mb: 2 }}>
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Typography>
                
                <Grid container spacing={0.5}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Grid item xs={12/7} key={day}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {day}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                  
                  {getCalendarDays().map((dayData, index) => (
                    <Grid item xs={12/7} key={index}>
                      {dayData ? (
                        <Box
                          sx={{
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1.5,
                            backgroundColor: dayData.hasAttendance ? 'success.light' : 'transparent',
                            border: dayData.date === selectedDate ? '2px solid' : '1px solid',
                            borderColor: dayData.date === selectedDate ? 'primary.main' : 'divider',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: dayData.hasAttendance ? 'success.main' : 'action.hover',
                              borderColor: 'primary.main',
                              '& .day-text': {
                                color: dayData.hasAttendance ? 'white' : 'primary.main',
                                fontWeight: 700,
                              },
                            },
                          }}
                          onClick={() => setSelectedDate(dayData.date)}
                        >
                          <Typography
                            className="day-text"
                            variant="body2"
                            sx={{
                              fontWeight: dayData.date === selectedDate ? 700 : 400,
                              color: dayData.hasAttendance ? 'success.dark' : 'text.primary',
                              transition: 'all 0.2s',
                            }}
                          >
                            {dayData.day}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ aspectRatio: '1' }} />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Selected Date
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  {formatDate(selectedDate)}
                </Typography>
                {attendanceHistory.find(a => a.date === selectedDate) ? (
                  <Chip 
                    label="✓ Attendance recorded" 
                    size="small" 
                    color="success" 
                    sx={{ mt: 1 }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No attendance for this date
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={() => setConfirmDialog({ open: false, action: null })}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirm {confirmDialog.action === 'in' ? 'Clock In' : 'Clock Out'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'in' ? t('attendance.areYouSureClockIn') : t('attendance.areYouSureClockOut')}
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current time
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
              {formatTimeOnly(currentTime)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>Cancel</Button>
          <Button
            onClick={confirmDialog.action === 'in' ? handleClockIn : handleClockOut}
            variant="contained"
            disabled={clocking}
          >
            {clocking ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceScreen;

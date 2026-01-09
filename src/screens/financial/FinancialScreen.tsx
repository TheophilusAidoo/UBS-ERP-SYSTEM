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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  Divider,
  Pagination,
} from '@mui/material';
import {
  AttachMoney,
  Add,
  Edit,
  Delete,
  Refresh,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Download,
  Business,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
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
import { useCurrency } from '../../hooks/useCurrency';
import { financialService, CreateTransactionData, UpdateTransactionData } from '../../services/financial.service';
import { companyService } from '../../services/company.service';
import { Transaction, TransactionType, Company } from '../../types';

const FinancialScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const isAdmin = user?.role === 'admin';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 6;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0, incomeCount: 0, expenseCount: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    type: 'income' as TransactionType,
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    companyId: '',
  });

  const [filters, setFilters] = useState({
    type: '' as TransactionType | '',
    companyId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchTransactions();
    fetchCompanies();
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      if (filters.type) filterParams.type = filters.type;
      if (filters.companyId) filterParams.companyId = filters.companyId;
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;
      
      // Staff should only see their own transactions, not other people's
      if (!isAdmin && user) {
        filterParams.userId = user.id;
      }

      const data = await financialService.getTransactions(filterParams);
      setTransactions(data);

      // Calculate summary - staff should only see their own summary
      const summaryData = await financialService.getFinancialSummary(filterParams);
      setSummary(summaryData);

      // Prepare chart data (last 6 months from today)
      const chartDataMap: any = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Generate last 6 months
      const last6Months: Array<{ month: string; monthIndex: number; year: number }> = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push({
          month: monthNames[date.getMonth()],
          monthIndex: date.getMonth(),
          year: date.getFullYear(),
        });
        chartDataMap[`${date.getFullYear()}-${date.getMonth()}`] = {
          month: `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`,
          income: 0,
          expenses: 0,
        };
      }

      // Aggregate transaction data by month
      data.forEach((t) => {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (chartDataMap[key]) {
          if (t.type === 'income') {
            chartDataMap[key].income += t.amount;
          } else {
            chartDataMap[key].expenses += t.amount;
          }
        }
      });

      // Convert to array in correct order
      const chartDataArray = last6Months.map(({ month, monthIndex, year }) => {
        const key = `${year}-${monthIndex}`;
        return chartDataMap[key] || {
          month: `${month} ${year.toString().slice(-2)}`,
          income: 0,
          expenses: 0,
        };
      });

      setChartData(chartDataArray);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message || t('financial.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      if (isAdmin) {
        // Admin can see all companies
        const data = await companyService.getAllCompanies();
        setCompanies(data);
      } else if (user?.companyId) {
        // Staff can only see their assigned company
        const data = await companyService.getAllCompanies();
        const staffCompany = data.find(c => c.id === user.companyId);
        setCompanies(staffCompany ? [staffCompany] : []);
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleOpenDialog = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        category: transaction.category || '',
        date: transaction.date,
        companyId: transaction.companyId || '',
      });
    } else {
      setEditingTransaction(null);
      // For staff, pre-select their assigned company
      const defaultCompanyId = !isAdmin && user?.companyId ? user.companyId : '';
      setFormData({
        type: 'income',
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        companyId: defaultCompanyId,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      companyId: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // For staff members, enforce that they can only use their assigned company
      let finalCompanyId = formData.companyId;
      if (!isAdmin && user?.companyId) {
        finalCompanyId = user.companyId;
      }

      if (editingTransaction) {
        const updateData: UpdateTransactionData = {
          id: editingTransaction.id,
          amount: parseFloat(formData.amount),
          description: formData.description || undefined,
          category: formData.category || undefined,
          date: formData.date,
        };
        await financialService.updateTransaction(updateData);
        setSuccess(t('financial.transactionUpdated'));
      } else {
        const createData: CreateTransactionData = {
          companyId: finalCompanyId || undefined,
          userId: user?.id,
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description || undefined,
          category: formData.category || undefined,
          date: formData.date,
        };
        await financialService.createTransaction(createData);
        setSuccess(t('financial.transactionCreated'));
      }

      setTimeout(() => setSuccess(null), 3000);
      handleCloseDialog();
      await fetchTransactions();
    } catch (err: any) {
      setError(err.message || t('financial.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.transaction) return;
    try {
      setLoading(true);
      setError(null);
      await financialService.deleteTransaction(deleteDialog.transaction.id);
      setSuccess(t('financial.transactionDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, transaction: null });
      await fetchTransactions();
    } catch (err: any) {
      setError(err.message || t('financial.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      setError(t('financial.noDataToExport'));
      return;
    }

    // Prepare CSV data
    const headers = [t('financial.date'), t('financial.type'), t('financial.description'), t('financial.category'), t('financial.company'), t('financial.amount')];
    const rows = transactions.map((t) => {
      const companyName = t.companyId 
        ? companies.find(c => c.id === t.companyId)?.name || 'N/A'
        : 'N/A';
      return [
        formatDate(t.date),
        t.type,
        t.description || '',
        t.category || '',
        companyName,
        t.amount.toString(),
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Add summary
    const summaryRow = [
      '\n',
      t('financial.summary'),
      '',
      '',
      '',
      '',
    ];
    const summaryData = [
      [t('financial.totalIncome'), '', '', '', '', summary.totalIncome.toString()],
      [t('financial.totalExpenses'), '', '', '', '', summary.totalExpenses.toString()],
      [t('financial.netProfit'), '', '', '', '', summary.netProfit.toString()],
    ];

    const fullCSV = [
      csvContent,
      summaryRow.join(','),
      ...summaryData.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with date range
    const dateRange = filters.startDate && filters.endDate
      ? `${filters.startDate}_to_${filters.endDate}`
      : 'all';
    const companyName = filters.companyId
      ? companies.find(c => c.id === filters.companyId)?.name.replace(/\s+/g, '_') || 'all'
      : 'all';
    link.setAttribute('download', `financial_report_${companyName}_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess('Report downloaded successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            {t('financial.management')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('financial.description')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportToCSV}
              disabled={transactions.length === 0}
              sx={{
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'primary.light',
                  color: 'white',
                },
              }}
            >
              {t('financial.exportReport')}
            </Button>
          )}
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
            {t('financial.addTransaction')}
          </Button>
          <IconButton
            onClick={fetchTransactions}
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
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('financial.totalIncome')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {formatCurrency(summary.totalIncome)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.incomeCount} {t('financial.transactions')}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('financial.totalExpenses')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.expenseCount} {t('financial.transactions')}
                  </Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.08)',
              background:
                summary.netProfit >= 0
                  ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                  : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('financial.netProfit')}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: summary.netProfit >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {formatCurrency(summary.netProfit)}
                  </Typography>
                </Box>
                {summary.netProfit >= 0 ? (
                  <TrendingUp sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Overview Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Income vs Expenses Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1.5, 
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShowChart sx={{ color: 'primary.main', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {t('financial.reports')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.last6Months')}
                  </Typography>
                </Box>
              </Box>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 8,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 20 }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="income" 
                      fill="#16a34a" 
                      name={t('financial.income')} 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="#dc2626" 
                      name={t('financial.expenses')} 
                      radius={[4, 4, 0, 0]}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <ShowChart sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                    <Typography variant="body1" color="text.secondary">
                      {t('common.noData')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('financial.description')}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Stats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                {t('financial.summary')}
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('financial.totalIncome')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {chartData.length > 0
                      ? formatCurrency(
                          chartData.reduce((sum, d) => sum + d.income, 0) / chartData.length
                        )
                      : formatCurrency(0)}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Average Daily Income
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {transactions.length > 0 && summary.totalIncome > 0
                      ? formatCurrency(summary.totalIncome / transactions.filter(t => t.type === 'income').length)
                      : formatCurrency(0)}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Average Daily Expenses
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {transactions.length > 0 && summary.totalExpenses > 0
                      ? formatCurrency(summary.totalExpenses / transactions.filter(t => t.type === 'expense').length)
                      : formatCurrency(0)}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('financial.totalExpenses')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {chartData.length > 0
                      ? formatCurrency(
                          chartData.reduce((sum, d) => sum + d.expenses, 0) / chartData.length
                        )
                      : formatCurrency(0)}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Profit Margin
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: summary.netProfit >= 0 ? 'success.main' : 'error.main' }}>
                    {summary.totalIncome > 0
                      ? `${((summary.netProfit / summary.totalIncome) * 100).toFixed(1)}%`
                      : '0%'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 4, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Business sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('attendance.filters')}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={isAdmin ? 3 : 4}>
              <FormControl fullWidth>
                <InputLabel>{t('financial.type')}</InputLabel>
                <Select
                  value={filters.type}
                  label={t('financial.type')}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as TransactionType | '' })}
                >
                  <MenuItem value="">{t('financial.all')}</MenuItem>
                  <MenuItem value="income">{t('financial.income')}</MenuItem>
                  <MenuItem value="expense">{t('financial.expenses')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {isAdmin && (
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>{t('financial.company')}</InputLabel>
                  <Select
                    value={filters.companyId}
                    label={t('financial.company')}
                    onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                  >
                    <MenuItem value="">{t('companies.total')}</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={isAdmin ? 3 : 4}>
              <TextField
                label={t('financial.startDate')}
                type="date"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={isAdmin ? 3 : 4}>
              <TextField
                label={t('financial.endDate')}
                type="date"
                fullWidth
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transactions Table */}
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
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AttachMoney sx={{ color: 'success.main', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {t('financial.transactions')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {transactions.length} {t('financial.transactions')}
                  {transactions.length > transactionsPerPage && ` • Page ${currentPage} of ${Math.ceil(transactions.length / transactionsPerPage)}`}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            {loading && transactions.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
              </Box>
            ) : transactions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <AttachMoney sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {t('financial.noTransactions')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {filters.companyId || filters.type || filters.startDate || filters.endDate
                    ? t('common.search') + '...'
                    : t('financial.description')}
                </Typography>
                <Button variant="contained" onClick={() => handleOpenDialog()} sx={{ borderRadius: 2, textTransform: 'none' }}>
                  {t('financial.addTransaction')}
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'background.default' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('financial.date')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('financial.type')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('financial.description')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('financial.category')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('financial.company')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="right">
                        {t('financial.amount')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions
                      .slice((currentPage - 1) * transactionsPerPage, currentPage * transactionsPerPage)
                      .map((transaction) => {
                      const companyName = transaction.companyId 
                        ? companies.find(c => c.id === transaction.companyId)?.name 
                        : null;
                      return (
                        <TableRow key={transaction.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ py: 2 }}>{formatDate(transaction.date)}</TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Chip
                              label={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              color={transaction.type === 'income' ? 'success' : 'error'}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2">
                              {transaction.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {transaction.category || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            {companyName ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {companyName}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 2, fontWeight: 600, color: transaction.type === 'income' ? 'success.main' : 'error.main' }}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenDialog(transaction)}
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
                                onClick={() => setDeleteDialog({ open: true, transaction })}
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {transactions.length > transactionsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, pb: 2 }}>
                <Pagination
                  count={Math.ceil(transactions.length / transactionsPerPage)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTransaction ? t('financial.updateTransaction') : t('financial.createTransaction')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('financial.type')}</InputLabel>
              <Select
                value={formData.type}
                label={t('financial.type')}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
              >
                <MenuItem value="income">{t('financial.income')}</MenuItem>
                <MenuItem value="expense">{t('financial.expenses')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('financial.amount')}
              type="number"
              fullWidth
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>{currencySymbol}</Typography>,
              }}
            />
            <TextField
              label={t('financial.date')}
              type="date"
              fullWidth
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('financial.description')}
              multiline
              rows={2}
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label={t('financial.category')}
              fullWidth
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>{t('financial.company')}</InputLabel>
              <Select
                value={formData.companyId}
                label={t('financial.company')}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                disabled={!isAdmin && !!user?.companyId} // Disable for staff (they can only use their assigned company)
              >
                {isAdmin && <MenuItem value="">{t('common.no')}</MenuItem>}
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading || !formData.amount || !formData.date}>
            {loading ? <CircularProgress size={20} /> : editingTransaction ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, transaction: null })}>
        <DialogTitle>{t('financial.deleteTransaction')}</DialogTitle>
        <DialogContent>
          <Typography>{t('common.areYouSure')} {t('common.thisActionCannotBeUndone')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, transaction: null })}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialScreen;

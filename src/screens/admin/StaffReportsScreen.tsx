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
  Stack,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Refresh,
  Download,
  Description,
  Person,
  AttachMoney,
  Receipt,
  TrendingDown,
  CalendarToday,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { dailyReportService, DailyReportWithStats } from '../../services/daily-report.service';
import { companyService } from '../../services/company.service';
import { exportService } from '../../utils/export.service';
import { Company } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';

const StaffReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const [reports, setReports] = useState<DailyReportWithStats[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; report: DailyReportWithStats | null }>({
    open: false,
    report: null,
  });

  const [filters, setFilters] = useState({
    companyId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchReports();
    fetchCompanies();
  }, [filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      if (filters.companyId) filterParams.companyId = filters.companyId;
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;

      const data = await dailyReportService.getAllDailyReportsWithStats(filterParams);
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
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

  const handleExportExcel = async () => {
    try {
      // Format matching Excel structure: Date, Employee, Tasks, Clients Contacted, Quotes Sent, Sales Made, Follow-up, Remark
      const rows = reports.map((report) => {
        const employeeName = report.user 
          ? `${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.email
          : 'Unknown';
        
        // Format date as DD/MM/YYYY
        const dateObj = new Date(report.date);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        return [
          formattedDate,
          employeeName,
          report.tasks || report.summary || '',
          report.clientsContacted || 0,
          report.quotesSent || 0,
          report.salesMade || 0,
          report.followUp || '',
          report.remark || '',
        ];
      });

      await exportService.exportToExcel({
        title: 'Daily Reports',
        headers: ['Date', 'Employee', 'Tasks of the day', 'Clients contacted', 'Quotes sent', 'Sales made', 'Follow-up to do', 'Remark'],
        rows,
        filename: `daily_reports_${new Date().toISOString().split('T')[0]}.xls`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to export reports');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewReport = (report: DailyReportWithStats) => {
    setViewDialog({ open: true, report });
  };

  const handleCloseViewDialog = () => {
    setViewDialog({ open: false, report: null });
  };

  const handleDownloadSingleReport = async (report: DailyReportWithStats) => {
    try {
      const employeeName = report.user 
        ? `${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.email
        : 'Unknown';
      
      // Format date as DD/MM/YYYY
      const dateObj = new Date(report.date);
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
      
      const row = [
        formattedDate,
        employeeName,
        report.tasks || report.summary || '',
        report.clientsContacted || 0,
        report.quotesSent || 0,
        report.salesMade || 0,
        report.followUp || '',
        report.remark || '',
      ];

      await exportService.exportToExcel({
        title: 'Daily Report',
        headers: ['Date', 'Employee', 'Tasks of the day', 'Clients contacted', 'Quotes sent', 'Sales made', 'Follow-up to do', 'Remark'],
        rows: [row],
        filename: `daily_report_${employeeName.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '_')}.xls`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t('reports.staffReports', 'Staff Daily Reports')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={fetchReports} title="Refresh">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportExcel}
            disabled={reports.length === 0}
          >
            Export to Excel
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Company</InputLabel>
                <Select
                  value={filters.companyId}
                  label="Company"
                  onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                >
                  <MenuItem value="">All Companies</MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                size="small"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                size="small"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">
              No Reports Found
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tasks</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Clients Contacted</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Quotes Sent</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Sales Made</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Follow-up</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Remark</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => {
                return (
                  <TableRow key={report.id} hover>
                    <TableCell>{formatDate(report.date)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {report.user?.firstName?.charAt(0) || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {`${report.user?.firstName || ''} ${report.user?.lastName || ''}`.trim() || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.user?.email || ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{report.company?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300 }}>
                        {report.tasks || report.summary || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {report.clientsContacted || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {report.quotesSent || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {report.salesMade || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 250 }}>
                        {report.followUp || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                        {report.remark || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadSingleReport(report)}
                          color="success"
                          title="Download Report"
                          sx={{
                            border: '1px solid rgba(0,0,0,0.08)',
                            '&:hover': {
                              backgroundColor: 'success.main',
                              color: 'white',
                              borderColor: 'success.main',
                            },
                          }}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleViewReport(report)}
                          color="primary"
                          title="View Details"
                          sx={{
                            border: '1px solid rgba(0,0,0,0.08)',
                            '&:hover': {
                              backgroundColor: 'primary.main',
                              color: 'white',
                              borderColor: 'primary.main',
                            },
                          }}
                        >
                          <Description fontSize="small" />
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

      {/* View Report Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={handleCloseViewDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          background: '#fafafa'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                Daily Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(viewDialog.report?.date || '')}
              </Typography>
            </Box>
            <Chip 
              label={viewDialog.report?.company?.name || 'No Company'} 
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {viewDialog.report && (
            <Stack spacing={3}>
              {/* Staff Info */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid rgba(0,0,0,0.08)'
              }}>
                <Avatar sx={{ 
                  width: 64, 
                  height: 64, 
                  bgcolor: 'primary.main',
                  fontSize: '1.5rem',
                  fontWeight: 600
                }}>
                  {viewDialog.report.user?.firstName?.charAt(0) || 'U'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {`${viewDialog.report.user?.firstName || ''} ${viewDialog.report.user?.lastName || ''}`.trim() || 'Unknown Staff'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewDialog.report.user?.email || ''}
                  </Typography>
                </Box>
              </Box>

              {/* Key Metrics */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Performance Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f0f9ff',
                      border: '1px solid #bae6fd'
                    }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#0284c7', mb: 0.5 }}>
                        {viewDialog.report.clientsContacted || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Clients
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#fffbeb',
                      border: '1px solid #fde68a'
                    }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#d97706', mb: 0.5 }}>
                        {viewDialog.report.quotesSent || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Quotes
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f0fdf4',
                      border: '1px solid #86efac'
                    }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#16a34a', mb: 0.5 }}>
                        {viewDialog.report.salesMade || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Sales
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Tasks */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                  Tasks of the Day
                </Typography>
                <Box sx={{ 
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid rgba(0,0,0,0.08)',
                  minHeight: 100
                }}>
                  <Typography variant="body1" sx={{ 
                    lineHeight: 1.8,
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {viewDialog.report.tasks || viewDialog.report.summary || 'No tasks recorded'}
                  </Typography>
                </Box>
              </Box>

              {/* Follow-up and Remarks */}
              <Grid container spacing={2}>
                {viewDialog.report.followUp && (
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                        Follow-up to Do
                      </Typography>
                      <Box sx={{ 
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#fffbeb',
                        border: '1px solid #fde68a',
                        minHeight: 80
                      }}>
                        <Typography variant="body2" sx={{ 
                          lineHeight: 1.7,
                          color: 'text.primary',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {viewDialog.report.followUp}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                {viewDialog.report.remark && (
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                        Remarks
                      </Typography>
                      <Box sx={{ 
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#f5f3ff',
                        border: '1px solid #c4b5fd',
                        minHeight: 80
                      }}>
                        <Typography variant="body2" sx={{ 
                          lineHeight: 1.7,
                          color: 'text.primary',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {viewDialog.report.remark}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>

              {/* Financial Summary */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Financial Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                          Daily Sales
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', mb: 0.5 }}>
                          {currencySymbol}{(viewDialog.report.dailySales || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {viewDialog.report.dailySalesCount || 0} items
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                          Invoices
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main', mb: 0.5 }}>
                          {currencySymbol}{(viewDialog.report.invoicesTotal || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {viewDialog.report.invoicesCreated || 0} invoices
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                          Expenses
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main', mb: 0.5 }}>
                          {currencySymbol}{(viewDialog.report.expenses || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {viewDialog.report.expensesCount || 0} transactions
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Net Income */}
              <Card sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                borderRadius: 2
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
                        Net Income
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {currencySymbol}
                        {((viewDialog.report.dailySales || 0) + (viewDialog.report.invoicesTotal || 0) - (viewDialog.report.expenses || 0)).toFixed(2)}
                      </Typography>
                    </Box>
                    <AttachMoney sx={{ fontSize: 48, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <Button 
            onClick={() => viewDialog.report && handleDownloadSingleReport(viewDialog.report)}
            variant="outlined"
            startIcon={<Download />}
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
              }
            }}
          >
            Download Report
          </Button>
          <Button 
            onClick={handleCloseViewDialog}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffReportsScreen;


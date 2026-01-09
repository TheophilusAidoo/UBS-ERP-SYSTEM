import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Refresh,
  Description,
  Download,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { dailyReportService, CreateDailyReportData } from '../../services/daily-report.service';
import { DailyReport } from '../../types';
import { exportService } from '../../utils/export.service';

const DailyReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    tasks: '',
    clientsContacted: '',
    quotesSent: '',
    salesMade: '',
    followUp: '',
    remark: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchReports();
    checkTodayReport();
    setCurrentPage(1); // Reset to first page when data changes
  }, [user]);

  const checkTodayReport = async () => {
    if (!user?.id) return;
    try {
      const report = await dailyReportService.getTodayReport(user.id);
      setTodayReport(report);
      if (report) {
        setFormData({
          tasks: report.tasks || report.summary || '',
          clientsContacted: report.clientsContacted?.toString() || '',
          quotesSent: report.quotesSent?.toString() || '',
          salesMade: report.salesMade?.toString() || '',
          followUp: report.followUp || '',
          remark: report.remark || '',
          date: report.date,
        });
      }
    } catch (err: any) {
      console.error('Error checking today report:', err);
    }
  };

  const fetchReports = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await dailyReportService.getDailyReports({ userId: user.id });
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (report?: DailyReport) => {
    if (report) {
      setEditingReport(report);
      setFormData({
        tasks: report.tasks || report.summary || '',
        clientsContacted: report.clientsContacted?.toString() || '',
        quotesSent: report.quotesSent?.toString() || '',
        salesMade: report.salesMade?.toString() || '',
        followUp: report.followUp || '',
        remark: report.remark || '',
        date: report.date,
      });
    } else {
      setEditingReport(null);
      setFormData({
        tasks: '',
        clientsContacted: '',
        quotesSent: '',
        salesMade: '',
        followUp: '',
        remark: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReport(null);
    setFormData({
      tasks: '',
      clientsContacted: '',
      quotesSent: '',
      salesMade: '',
      followUp: '',
      remark: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async () => {
    if (!user?.id || !user?.companyId) return;
    if (!formData.tasks.trim()) {
      setError('Tasks are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (editingReport) {
        // Update existing report (only allowed on the same day)
        const today = new Date().toISOString().split('T')[0];
        if (editingReport.date !== today) {
          setError('You can only update today\'s report');
          return;
        }
        await dailyReportService.updateDailyReport({
          id: editingReport.id,
          tasks: formData.tasks,
          clientsContacted: formData.clientsContacted ? parseInt(formData.clientsContacted) : 0,
          quotesSent: formData.quotesSent ? parseInt(formData.quotesSent) : 0,
          salesMade: formData.salesMade ? parseInt(formData.salesMade) : 0,
          followUp: formData.followUp || undefined,
          remark: formData.remark || undefined,
        });
        setSuccess('Report updated successfully!');
      } else {
        // Create new report
        const reportData: CreateDailyReportData = {
          userId: user.id,
          companyId: user.companyId,
          date: formData.date,
          tasks: formData.tasks,
          clientsContacted: formData.clientsContacted ? parseInt(formData.clientsContacted) : 0,
          quotesSent: formData.quotesSent ? parseInt(formData.quotesSent) : 0,
          salesMade: formData.salesMade ? parseInt(formData.salesMade) : 0,
          followUp: formData.followUp || undefined,
          remark: formData.remark || undefined,
        };
        await dailyReportService.createDailyReport(reportData);
        setSuccess('Report created successfully!');
      }

      handleCloseDialog();
      await fetchReports();
      await checkTodayReport();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (reports.length === 0) {
      setError('No reports to export');
      return;
    }

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

      setSuccess('Report exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Pagination
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = reports.slice(startIndex, endIndex);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {t('reports.dailyReports', 'Daily Reports')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {reports.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportToExcel}
              sx={{ textTransform: 'none' }}
            >
              Export to Excel
            </Button>
          )}
          <IconButton onClick={fetchReports} title="Refresh">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={todayReport ? <Edit /> : <Add />}
            onClick={() => handleOpenDialog(todayReport || undefined)}
          >
            {todayReport ? 'Update Today\'s Report' : 'Create Today\'s Report'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {loading && reports.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Reports Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first daily report to track your daily activities
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
              Create Today's Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
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
                {paginatedReports.map((report) => {
                  const isToday = report.date === new Date().toISOString().split('T')[0];
                  const employeeName = report.user 
                    ? `${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() || report.user.email
                    : 'Unknown';
                  return (
                    <TableRow key={report.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {formatDate(report.date)}
                          {isToday && (
                            <Chip label="Today" size="small" color="primary" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {employeeName}
                        </Typography>
                      </TableCell>
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
                        {isToday && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(report)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {reports.length > itemsPerPage && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              p: 3,
              borderTop: '1px solid rgba(0,0,0,0.08)'
            }}>
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex + 1} - {Math.min(endIndex, reports.length)} of {reports.length} reports
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  startIcon={<ChevronLeft />}
                  sx={{ textTransform: 'none' }}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ px: 2 }}>
                  Page {currentPage} of {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  endIcon={<ChevronRight />}
                  sx={{ textTransform: 'none' }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {editingReport ? 'Update Daily Report' : 'Create Daily Report'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={!!editingReport}
            />
            {user && (
              <TextField
                label="Employee"
                fullWidth
                disabled
                value={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                helperText="This field is automatically filled with your name"
              />
            )}
            <TextField
              label="Tasks of the day"
              fullWidth
              multiline
              rows={3}
              required
              value={formData.tasks}
              onChange={(e) => setFormData({ ...formData, tasks: e.target.value })}
              placeholder="e.g., Sales offers, order taking, and order processing"
              helperText="Describe the tasks you performed today"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Clients Contacted"
                type="number"
                fullWidth
                value={formData.clientsContacted}
                onChange={(e) => setFormData({ ...formData, clientsContacted: e.target.value })}
                inputProps={{ min: 0 }}
                placeholder="0"
              />
              <TextField
                label="Quotes Sent"
                type="number"
                fullWidth
                value={formData.quotesSent}
                onChange={(e) => setFormData({ ...formData, quotesSent: e.target.value })}
                inputProps={{ min: 0 }}
                placeholder="0"
              />
              <TextField
                label="Sales Made"
                type="number"
                fullWidth
                value={formData.salesMade}
                onChange={(e) => setFormData({ ...formData, salesMade: e.target.value })}
                inputProps={{ min: 0 }}
                placeholder="0"
              />
            </Box>
            <TextField
              label="Follow-up to do (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.followUp}
              onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
              placeholder="e.g., 7 invoice reminders, 5 quotes to follow up"
              helperText="List any follow-up tasks that need to be done"
            />
            <TextField
              label="Remark (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="Additional remarks or notes"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.tasks.trim()}
          >
            {loading ? <CircularProgress size={24} /> : editingReport ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyReportsScreen;


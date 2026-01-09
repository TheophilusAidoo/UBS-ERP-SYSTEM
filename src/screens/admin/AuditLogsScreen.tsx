import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import {
  History,
  Refresh,
  Visibility,
  FilterList,
  Download,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { auditService, AuditLog } from '../../services/audit.service';
import { staffService } from '../../services/staff.service';
import { User } from '../../types';

const AuditLogsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; log: AuditLog | null }>({
    open: false,
    log: null,
  });

  const [filters, setFilters] = useState({
    userId: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      if (filters.userId) filterParams.userId = filters.userId;
      if (filters.entityType) filterParams.entityType = filters.entityType;
      if (filters.action) filterParams.action = filters.action;
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;

      const data = await auditService.getAuditLogs(filterParams);
      setLogs(data);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || t('audit.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await staffService.getAllStaff();
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes('create') || action.toLowerCase().includes('add')) return 'success';
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) return 'info';
    if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('remove')) return 'error';
    if (action.toLowerCase().includes('login') || action.toLowerCase().includes('logout')) return 'warning';
    return 'default';
  };

  const exportToCSV = () => {
    const headers = [t('audit.date'), t('audit.user'), t('audit.action'), t('audit.entityType'), t('audit.entityId'), t('audit.ipAddress')];
    const rows = logs.map((log) => {
      const user = users.find((u) => u.id === log.userId);
      return [
        formatDate(log.createdAt),
        user ? `${user.firstName} ${user.lastName}` : t('audit.system'),
        log.action,
        log.entityType || '-',
        log.entityId || '-',
        log.ipAddress || '-',
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('audit.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('audit.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportToCSV}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('audit.exportCSV')}
            </Button>
            <IconButton
              onClick={fetchLogs}
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

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('audit.filterByUser')}</InputLabel>
                <Select
                  value={filters.userId}
                  label={t('audit.filterByUser')}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                >
                  <MenuItem value="">{t('audit.allUsers')}</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('audit.filterByEntityType')}</InputLabel>
                <Select
                  value={filters.entityType}
                  label={t('audit.filterByEntityType')}
                  onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                >
                  <MenuItem value="">{t('audit.allTypes')}</MenuItem>
                  <MenuItem value="company">{t('audit.company')}</MenuItem>
                  <MenuItem value="user">{t('audit.user')}</MenuItem>
                  <MenuItem value="invoice">{t('audit.invoice')}</MenuItem>
                  <MenuItem value="proposal">{t('audit.proposal')}</MenuItem>
                  <MenuItem value="project">{t('audit.project')}</MenuItem>
                  <MenuItem value="transaction">{t('audit.transaction')}</MenuItem>
                  <MenuItem value="leave_request">{t('audit.leaveRequest')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label={t('audit.filterByAction')}
                fullWidth
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder={t('audit.actionPlaceholder')}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                label={t('audit.startDate')}
                type="date"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                label={t('audit.endDate')}
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

      {/* Audit Logs Table */}
      <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <TableContainer>
          {loading && logs.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {t('audit.noLogs')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('audit.noLogsDescription')}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.dateTime')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.user')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.action')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.entityType')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.entityId')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('audit.ipAddress')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => {
                  const user = users.find((u) => u.id === log.userId);
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatDate(log.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {user ? (
                          <Typography variant="body2">
                            {user.firstName} {user.lastName}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t('audit.system')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={getActionColor(log.action) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {log.entityType || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {log.entityId ? log.entityId.substring(0, 8) + '...' : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {log.ipAddress || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => setViewDialog({ open: true, log })}
                          sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* View Log Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, log: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {viewDialog.log && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              {t('audit.details')}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.dateTime')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(viewDialog.log.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.action')}
                    </Typography>
                    <Chip
                      label={viewDialog.log.action}
                      size="small"
                      color={getActionColor(viewDialog.log.action) as any}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.user')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {users.find((u) => u.id === viewDialog.log.userId)
                        ? `${users.find((u) => u.id === viewDialog.log.userId)?.firstName} ${users.find((u) => u.id === viewDialog.log.userId)?.lastName}`
                        : t('audit.system')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.entityType')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {viewDialog.log.entityType || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.entityId')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {viewDialog.log.entityId || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.ipAddress')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {viewDialog.log.ipAddress || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('audit.userAgent')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {viewDialog.log.userAgent || '-'}
                    </Typography>
                  </Grid>
                  {viewDialog.log.changes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('audit.changes')}
                      </Typography>
                      <Paper sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                        <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                          {JSON.stringify(viewDialog.log.changes, null, 2)}
                        </pre>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button
                onClick={() => setViewDialog({ open: false, log: null })}
                sx={{ textTransform: 'none' }}
              >
                {t('common.close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AuditLogsScreen;


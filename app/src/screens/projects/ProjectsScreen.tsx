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
  Pagination,
} from '@mui/material';
import {
  Folder,
  Add,
  Edit,
  Delete,
  Refresh,
  People,
  CalendarToday,
  AttachMoney,
  Description,
  Assignment,
  Assessment,
  CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { projectService, CreateProjectData, UpdateProjectData } from '../../services/project.service';
import { workReportService, CreateWorkReportData } from '../../services/work-report.service';
import { companyService } from '../../services/company.service';
import { staffService } from '../../services/staff.service';
import { clientService } from '../../services/client.service';
import { Project, ProjectStatus, WorkReport, Company, User, Client } from '../../types';
import GanttChart from '../../components/projects/GanttChart';

const ProjectsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });
  const [reportDialog, setReportDialog] = useState<{ open: boolean; projectId: string | null }>({
    open: false,
    projectId: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    companyId: '',
    clientId: '',
    name: '',
    description: '',
    status: 'planning' as ProjectStatus,
    startDate: '',
    endDate: '',
    budget: '',
    assignedTo: [] as string[],
  });

  const [reportFormData, setReportFormData] = useState({
    report: '',
    hoursWorked: '',
    date: new Date().toISOString().split('T')[0],
  });

  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const canAssignProjects = isAdmin || user?.isSubAdmin === true;

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    if (isAdmin) {
      fetchAllStaff();
      fetchAllClients();
    } else {
      // For staff, fetch staff from their company only
      if (user?.companyId) {
        fetchStaffByCompany(user.companyId);
        fetchClientsByCompany(user.companyId);
      }
    }
    setCurrentPage(1); // Reset to first page when user changes
  }, [user]);

  const fetchStaffByCompany = async (companyId: string) => {
    try {
      const data = await staffService.getAllStaff({ companyId });
      setAllStaff(data);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchWorkReports(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (!isAdmin && user?.companyId) {
        filters.companyId = user.companyId;
      }
      if (!isAdmin && !isClient && user?.id) {
        filters.userId = user.id;
      }
      // For clients, filter by client_id
      if (isClient && user?.id) {
        filters.clientId = user.id;
      }
      const data = await projectService.getProjects(filters);
      setProjects(data);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message || t('projects.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkReports = async (projectId: string) => {
    try {
      const reports = await workReportService.getWorkReports({ projectId });
      setWorkReports(reports);
    } catch (err: any) {
      console.error('Error fetching work reports:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      if (isAdmin) {
        const data = await companyService.getAllCompanies();
        setCompanies(data);
      } else if (user?.companyId) {
        // For staff, fetch only their company
        const company = await companyService.getCompany(user.companyId);
        if (company) {
          setCompanies([company]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const data = await staffService.getAllStaff();
      setAllStaff(data);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchAllClients = async () => {
    try {
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchClientsByCompany = async (companyId: string) => {
    try {
      const data = await clientService.getClientsByCompany(companyId);
      setClients(data);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleOpenProjectDialog = async (project?: Project) => {
    // Fetch clients when opening dialog
    if (isAdmin) {
      await fetchAllClients();
    } else if (user?.companyId) {
      await fetchClientsByCompany(user.companyId);
    }

    if (project) {
      setFormData({
        companyId: project.companyId,
        clientId: project.clientId || '',
        name: project.name,
        description: project.description || '',
        status: project.status,
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        budget: project.budget?.toString() || '',
        assignedTo: project.assignedTo || [],
      });
      setProjectDialog({ open: true, project });
    } else {
      // For staff, use their company ID. For admin, allow selection
      setFormData({
        companyId: isAdmin ? '' : (user?.companyId || ''),
        clientId: '',
        name: '',
        description: '',
        status: 'planning',
        startDate: '',
        endDate: '',
        budget: '',
        assignedTo: [],
      });
      setProjectDialog({ open: true, project: null });
    }
  };

  const handleCloseProjectDialog = () => {
    setProjectDialog({ open: false, project: null });
    setFormData({
      companyId: user?.companyId || '',
      clientId: '',
      name: '',
      description: '',
      status: 'planning',
      startDate: '',
      endDate: '',
      budget: '',
      assignedTo: [],
    });
  };

  const handleSaveProject = async () => {
    try {
      setLoading(true);
      setError(null);

      if (projectDialog.project) {
        // Update
        // For staff, only allow status updates; admins can update all fields
        const updateData: any = {
          id: projectDialog.project.id,
        };
        
        if (isAdmin) {
          // Admin can update all fields
          Object.assign(updateData, {
            ...formData,
            clientId: formData.clientId || undefined,
            budget: formData.budget ? parseFloat(formData.budget) : undefined,
          });
        } else {
          // Staff can only update status
          updateData.status = formData.status;
        }
        
        await projectService.updateProject(updateData);
        setSuccess(t('projects.projectUpdated'));
      } else {
        // Create
        // For staff, use their company ID if not provided
        const companyId = formData.companyId || user?.companyId;
        if (!companyId) {
          setError(t('common.pleaseSelectCompany') || 'Please select a company');
          return;
        }
        await projectService.createProject({
          ...formData,
          companyId,
          clientId: formData.clientId || undefined,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          createdBy: !isAdmin && user?.id ? user.id : undefined, // Auto-assign creator if staff
        });
        setSuccess(t('projects.projectCreated'));
      }

      setTimeout(() => setSuccess(null), 3000);
      handleCloseProjectDialog();
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || t('projects.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteDialog.project) return;
    try {
      setLoading(true);
      setError(null);
      await projectService.deleteProject(deleteDialog.project.id);
      setSuccess(t('projects.projectDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, project: null });
      await fetchProjects();
    } catch (err: any) {
      setError(err.message || t('projects.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReportDialog = (projectId: string) => {
    setReportFormData({
      report: '',
      hoursWorked: '',
      date: new Date().toISOString().split('T')[0],
    });
    setReportDialog({ open: true, projectId });
  };

  const handleSaveReport = async () => {
    if (!reportDialog.projectId || !user) return;
    try {
      setLoading(true);
      setError(null);
      await workReportService.createWorkReport({
        projectId: reportDialog.projectId,
        userId: user.id,
        report: reportFormData.report,
        hoursWorked: reportFormData.hoursWorked ? parseFloat(reportFormData.hoursWorked) : undefined,
        date: reportFormData.date,
      });
      setSuccess(t('projects.workReportSubmitted') || 'Work report submitted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setReportDialog({ open: false, projectId: null });
      if (selectedProject) {
        await fetchWorkReports(selectedProject.id);
      }
    } catch (err: any) {
      setError(err.message || t('projects.failedToSubmitReport') || 'Failed to submit work report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'on-hold':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredProjects = projects.filter(p => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return p.status === 'in-progress';
    if (tabValue === 2) return p.status === 'planning';
    if (tabValue === 3) return p.status === 'completed';
    if (tabValue === 4 && !isAdmin) return true; // Gantt Chart - show all
    return false;
  });

  // Pagination for projects
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate summary stats
  const summary = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    planning: projects.filter(p => p.status === 'planning').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('projects.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('projects.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isClient && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenProjectDialog()}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                New Project
              </Button>
            )}
            <IconButton
              onClick={fetchProjects}
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Folder sx={{ fontSize: 24, color: '#2563eb' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Projects
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {summary.total}
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
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Assessment sx={{ fontSize: 24, color: '#2563eb' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    In Progress
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {summary.inProgress}
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
                  <CheckCircle sx={{ fontSize: 24, color: '#16a34a' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Completed
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {summary.completed}
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
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AttachMoney sx={{ fontSize: 24, color: '#ca8a04' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('projects.totalBudget')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    ${summary.totalBudget.toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for filtering */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => {
            setTabValue(newValue);
            setCurrentPage(1); // Reset to first page when tab changes
          }}
          sx={{
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab label={t('projects.all')} />
          <Tab label={t('projects.inProgress')} />
          <Tab label={t('projects.planning')} />
          <Tab label={t('projects.completed')} />
          {!isAdmin && <Tab label={t('projects.ganttChart')} />}
        </Tabs>
      </Paper>

      {/* Gantt Chart View (Staff & Clients) */}
      {!isAdmin && tabValue === 4 && (
        <Box sx={{ mb: 3 }}>
          <GanttChart projects={projects} />
        </Box>
      )}

      {/* Projects Table */}
      {tabValue !== 4 && (
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
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Folder sx={{ color: 'primary.main', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {t('projects.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredProjects.length} {t('projects.title')}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
              </Box>
            ) : filteredProjects.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Folder sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {t('projects.noProjects')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('projects.description')}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'background.default' }}>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.name')}</TableCell>
                        {isAdmin && <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.filterByCompany') || 'Company'}</TableCell>}
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.status')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.assignedTo')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.startDate')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.endDate')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('projects.budget')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">{t('common.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedProjects.map((project) => (
                        <TableRow key={project.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ py: 2 }}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {project.name}
                              </Typography>
                              {project.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ 
                                  display: 'block',
                                  maxWidth: 300,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {project.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          {isAdmin && (
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2">
                                {companies.find(c => c.id === project.companyId)?.name || '-'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2">
                              {project.client?.name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Chip
                              label={project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('-', ' ')}
                              color={getStatusColor(project.status)}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {project.assignedUsers && project.assignedUsers.length > 0 ? (
                                <>
                                  <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2">
                                    {project.assignedUsers.length} member{project.assignedUsers.length !== 1 ? 's' : ''}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{formatDate(project.startDate)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{formatDate(project.endDate)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            {project.budget ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                  {project.budget.toLocaleString()}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedProject(project)}
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
                                <Description fontSize="small" />
                              </IconButton>
                              {isAdmin && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenProjectDialog(project)}
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
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeleteDialog({ open: true, project })}
                                    color="error"
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
                                </>
                              )}
                              {!isAdmin && !isClient && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenProjectDialog(project)}
                                    color="primary"
                                    title="Edit Project"
                                    sx={{
                                      border: '1px solid rgba(0,0,0,0.08)',
                                      backgroundColor: 'background.paper',
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
                                    onClick={() => handleOpenReportDialog(project.id)}
                                    color="primary"
                                    title="Submit Work Report"
                                    sx={{
                                      border: '1px solid rgba(0,0,0,0.08)',
                                      backgroundColor: 'background.paper',
                                      '&:hover': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        borderColor: 'primary.main',
                                      },
                                    }}
                                  >
                                    <Assignment fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                              {isClient && (
                                <IconButton
                                  size="small"
                                  onClick={() => setSelectedProject(project)}
                                  color="primary"
                                  title="View Details"
                                  sx={{
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    backgroundColor: 'background.paper',
                                    '&:hover': {
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      borderColor: 'primary.main',
                                    },
                                  }}
                                >
                                  <Description fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {filteredProjects.length > itemsPerPage && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                    <Pagination
                      count={Math.ceil(filteredProjects.length / itemsPerPage)}
                      page={currentPage}
                      onChange={(_, value) => setCurrentPage(value)}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </CardContent>
      </Card>
      )}

      {/* Project Details Dialog */}
      <Dialog
        open={selectedProject !== null}
        onClose={() => setSelectedProject(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {selectedProject && (
          <>
            <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Folder sx={{ color: 'primary.main' }} />
                <Typography variant="h6">{selectedProject.name}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {selectedProject.description || 'No description provided'}
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Status
                    </Typography>
                    <Chip
                      label={selectedProject.status.charAt(0).toUpperCase() + selectedProject.status.slice(1).replace('-', ' ')}
                      color={getStatusColor(selectedProject.status)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Budget
                    </Typography>
                    <Typography variant="body1">
                      {selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Start Date
                    </Typography>
                    <Typography variant="body1">{formatDate(selectedProject.startDate)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      End Date
                    </Typography>
                    <Typography variant="body1">{formatDate(selectedProject.endDate)}</Typography>
                  </Grid>
                </Grid>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Assigned Team Members
                  </Typography>
                  {selectedProject.assignedUsers && selectedProject.assignedUsers.length > 0 ? (
                    <Stack spacing={1}>
                      {selectedProject.assignedUsers.map((user) => (
                        <Box key={user.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                            {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            {user.jobTitle && (
                              <Typography variant="caption" color="text.secondary">
                                {user.jobTitle}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No team members assigned
                    </Typography>
                  )}
                </Box>
                <Divider />
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Work Reports
                    </Typography>
                    {!isAdmin && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => handleOpenReportDialog(selectedProject.id)}
                        sx={{ textTransform: 'none', borderRadius: 1.5 }}
                      >
                        Add Report
                      </Button>
                    )}
                  </Box>
                  {workReports.length > 0 ? (
                    <Stack spacing={2}>
                      {workReports.map((report) => (
                        <Card key={report.id} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.625rem' }}>
                                  {report.user?.firstName?.[0]?.toUpperCase() || 'U'}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {report.user?.firstName} {report.user?.lastName}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(report.date)}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {report.report}
                            </Typography>
                            {report.hoursWorked && (
                              <Typography variant="caption" color="text.secondary">
                                {report.hoursWorked} hours worked
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No work reports yet
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1 }}>
              <Button onClick={() => setSelectedProject(null)} sx={{ textTransform: 'none' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create/Edit Project Dialog */}
      <Dialog
        open={projectDialog.open}
        onClose={handleCloseProjectDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {projectDialog.project ? 'Edit Project' : 'Create New Project'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <FormControl fullWidth required={isAdmin}>
              <InputLabel>Company</InputLabel>
              <Select
                value={formData.companyId}
                label="Company"
                onChange={(e) => {
                  const newCompanyId = e.target.value;
                  setFormData({ ...formData, companyId: newCompanyId, clientId: '' }); // Reset client when company changes
                  // Fetch clients for the selected company
                  if (newCompanyId) {
                    if (isAdmin) {
                      fetchClientsByCompany(newCompanyId);
                    }
                  }
                }}
                disabled={!isAdmin && !!user?.companyId} // Staff can't change their company
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
              {!isAdmin && user?.companyId && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Your company is automatically selected
                </Typography>
              )}
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Client (Optional)</InputLabel>
              <Select
                value={formData.clientId}
                label="Client (Optional)"
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                disabled={!formData.companyId || (!isAdmin && !!projectDialog.project)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {clients
                  .filter(client => !formData.companyId || client.companyId === formData.companyId)
                  .map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name} {client.email && `(${client.email})`}
                    </MenuItem>
                  ))}
              </Select>
              {!formData.companyId && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Please select a company first
                </Typography>
              )}
            </FormControl>
            <TextField
              label={t('projects.name')}
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={!isAdmin && !!projectDialog.project}
            />
            <TextField
              label={t('projects.description')}
              multiline
              rows={4}
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isAdmin && !!projectDialog.project}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
              >
                <MenuItem value="planning">Planning</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="on-hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label={t('projects.startDate')}
                  type="date"
                  fullWidth
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={!isAdmin && !!projectDialog.project}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={t('projects.endDate')}
                  type="date"
                  fullWidth
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={!isAdmin && !!projectDialog.project}
                />
              </Grid>
            </Grid>
            <TextField
              label={t('projects.budget')}
              type="number"
              fullWidth
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              InputProps={{
                startAdornment: <AttachMoney sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />,
              }}
              disabled={!isAdmin && !!projectDialog.project}
            />
            {canAssignProjects ? (
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  multiple
                  value={formData.assignedTo}
                  label="Assign To"
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((userId) => {
                        const staffMember = allStaff.find(s => s.id === userId);
                        return (
                          <Chip key={userId} label={staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : userId} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {allStaff.length > 0 ? (
                    allStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} {staff.jobTitle && `(${staff.jobTitle})`}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No staff members available</MenuItem>
                  )}
                </Select>
              </FormControl>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Only admins and sub-admins can assign team members to projects. Contact your administrator to request sub-admin privileges.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={handleCloseProjectDialog} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveProject}
            variant="contained"
            disabled={loading || !formData.name || !formData.companyId}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : projectDialog.project ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Work Report Dialog */}
      <Dialog
        open={reportDialog.open}
        onClose={() => setReportDialog({ open: false, projectId: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Submit Work Report</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={reportFormData.date}
              onChange={(e) => setReportFormData({ ...reportFormData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hours Worked"
              type="number"
              fullWidth
              value={reportFormData.hoursWorked}
              onChange={(e) => setReportFormData({ ...reportFormData, hoursWorked: e.target.value })}
            />
            <TextField
              label="Work Report"
              multiline
              rows={6}
              fullWidth
              value={reportFormData.report}
              onChange={(e) => setReportFormData({ ...reportFormData, report: e.target.value })}
              placeholder="Describe the work completed..."
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setReportDialog({ open: false, projectId: null })}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveReport}
            variant="contained"
            disabled={loading || !reportFormData.report}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, project: null })}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.project?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, project: null })}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteProject}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsScreen;

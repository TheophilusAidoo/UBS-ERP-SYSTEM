import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import FolderIcon from '@mui/icons-material/Folder';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DescriptionIcon from '@mui/icons-material/Description';
import MessageIcon from '@mui/icons-material/Message';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from 'react-i18next';
import { attendanceService } from '../../services/attendance.service';
import { Attendance } from '../../types';
import { useThemeStore } from '../../store/theme.store';
import { useGlobalSettingsStore } from '../../store/global-settings.store';
import NotificationBell from '../common/NotificationBell';

const drawerWidth = 280;

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/attendance', label: 'attendance.title', icon: <AccessTimeIcon /> },
  { path: '/leaves', label: 'leaves.title', icon: <EventIcon /> },
  { path: '/financial', label: 'financial.title', icon: <AttachMoneyIcon /> },
  { path: '/products', label: 'Orders', icon: <InventoryIcon /> },
  { path: '/clients', label: 'Clients', icon: <PersonIcon /> },
  { path: '/projects', label: 'projects.title', icon: <FolderIcon /> },
  { path: '/invoices', label: 'invoices.title', icon: <ReceiptIcon /> },
  { path: '/proposals', label: 'common.proposals', icon: <DescriptionIcon /> },
  { path: '/daily-reports', label: 'Daily Reports', icon: <DescriptionIcon /> },
  { path: '/delivery', label: 'Delivery', icon: <LocalShippingIcon /> },
  { path: '/messages', label: 'messages.title', icon: <MessageIcon /> },
  { path: '/performance', label: 'performance.title', icon: <AssessmentIcon /> },
  { path: '/ai', label: 'common.aiAssistant', icon: <SmartToyIcon /> },
  { path: '/settings', label: 'settings.title', icon: <SettingsIcon /> },
];

const StaffLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { t } = useTranslation();
  const { sidebarColor: themeSidebarColor } = useThemeStore();
  const { sidebarLogo, sidebarColor: globalSidebarColor, initializeSettings } = useGlobalSettingsStore();
  
  // Use global sidebar color (admin changes apply to all)
  const sidebarColor = globalSidebarColor || themeSidebarColor;
  
  // Initialize global settings on mount and reload when settings change
  React.useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);
  
  // Reload global settings periodically to catch admin changes (from Supabase)
  React.useEffect(() => {
    const interval = setInterval(() => {
      initializeSettings();
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, [initializeSettings]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [clocking, setClocking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'in' | 'out' | null }>({
    open: false,
    action: null,
  });

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    try {
      setAttendanceLoading(true);
      const attendance = await attendanceService.getTodayAttendance(user.id);
      setTodayAttendance(attendance);
    } catch (err: any) {
      console.error('Error fetching today attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;
    try {
      setClocking(true);
      const attendance = await attendanceService.clockIn({ userId: user.id });
      setTodayAttendance(attendance);
      await fetchTodayAttendance();
    } catch (err: any) {
      console.error('Error clocking in:', err);
      alert(err.message || 'Failed to clock in');
    } finally {
      setClocking(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance || !user) return;
    try {
      setClocking(true);
      const attendance = await attendanceService.clockOut({
        attendanceId: todayAttendance.id,
        clockOut: new Date().toISOString(),
      });
      setTodayAttendance(attendance);
      await fetchTodayAttendance();
    } catch (err: any) {
      console.error('Error clocking out:', err);
      alert(err.message || 'Failed to clock out');
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

  const canClockIn = !todayAttendance || todayAttendance.clockOut;
  const canClockOut = todayAttendance && !todayAttendance.clockOut;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/settings');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          background: sidebarColor || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: 'white',
          minHeight: '64px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {sidebarLogo ? (
          <Box
            component="img"
            src={sidebarLogo}
            alt="Logo"
            sx={{
              maxHeight: 40,
              maxWidth: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
            UBS ERP
          </Typography>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                margin: '4px 8px',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label.includes('.') ? t(item.label) : item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.light',
                color: 'white',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary={t('common.logout')} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important', justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />
          
          {/* Attendance Widget - Right Side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
            {attendanceLoading ? (
              <CircularProgress size={20} />
            ) : (
              <>
                {todayAttendance && !todayAttendance.clockOut && (
                  <Chip
                    icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                    label={`Clocked in: ${formatTime(todayAttendance.clockIn)}`}
                    color="success"
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                )}
                {canClockIn ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<LoginIcon />}
                    onClick={() => setConfirmDialog({ open: true, action: 'in' })}
                    disabled={clocking}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      py: 0.75,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    Clock In
                  </Button>
                ) : canClockOut ? (
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<LogoutIcon />}
                    onClick={() => setConfirmDialog({ open: true, action: 'out' })}
                    disabled={clocking}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      py: 0.75,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    Clock Out
                  </Button>
                ) : null}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => navigate('/attendance')}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      backgroundColor: 'primary.light',
                      color: 'white',
                    },
                  }}
                >
                  Attendance
                </Button>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {user && <NotificationBell userId={user.id} />}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.firstName || user?.email}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {user?.role === 'admin' ? t('common.administrator') : t('common.staff')}
              </Typography>
            </Box>
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ 
                p: 0,
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '1rem',
                }}
              >
                {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'S'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">{t('settings.profileSettings')}</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          overflow: 'auto',
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important' }} />
        <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Clock In/Out Confirmation Dialog */}
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
            Are you sure you want to {confirmDialog.action === 'in' ? 'clock in' : 'clock out'}?
          </Typography>
          {confirmDialog.action === 'in' && todayAttendance && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Current time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
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

export default StaffLayout;

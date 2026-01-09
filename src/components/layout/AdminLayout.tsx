import React, { useState } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import MessageIcon from '@mui/icons-material/Message';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/theme.store';
import { useGlobalSettingsStore } from '../../store/global-settings.store';
import NotificationBell from '../common/NotificationBell';

const drawerWidth = 280;

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/companies', label: 'companies.title', icon: <BusinessIcon /> },
  { path: '/staff', label: 'staff.title', icon: <PeopleIcon /> },
  { path: '/staff-reports', label: 'Staff Reports', icon: <DescriptionIcon /> },
  { path: '/attendance', label: 'attendance.title', icon: <AccessTimeIcon /> },
  { path: '/leaves', label: 'leaves.title', icon: <EventIcon /> },
  { path: '/financial', label: 'financial.title', icon: <AttachMoneyIcon /> },
  { path: '/invoices', label: 'invoices.title', icon: <ReceiptIcon /> },
  { path: '/proposals', label: 'common.proposals', icon: <DescriptionIcon /> },
  { path: '/products', label: 'Orders', icon: <InventoryIcon /> },
  { path: '/clients', label: 'Clients', icon: <PersonIcon /> },
  { path: '/deliveries', label: 'Deliveries', icon: <LocalShippingIcon /> },
  { path: '/projects', label: 'projects.title', icon: <FolderIcon /> },
  { path: '/messages', label: 'messages.title', icon: <MessageIcon /> },
  { path: '/performance', label: 'performance.title', icon: <AssessmentIcon /> },
  { path: '/ai', label: 'ai.title', icon: <SmartToyIcon /> },
  { path: '/audit-logs', label: 'common.audit', icon: <HistoryIcon /> },
  { path: '/settings', label: 'settings.title', icon: <SettingsIcon /> },
];

const AdminLayout: React.FC = () => {
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
      <List sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path || 
            (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
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
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'white' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label.includes('.') ? t(item.label) : item.label} 
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
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
                {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
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
    </Box>
  );
};

export default AdminLayout;


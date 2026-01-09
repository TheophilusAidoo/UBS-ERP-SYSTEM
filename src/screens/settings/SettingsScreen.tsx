import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Button,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Stack,
  Alert,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import {
  Palette,
  Brightness4,
  Brightness7,
  Person,
  Language,
  Notifications,
  Security,
  Edit,
  Business,
  Work,
  Email,
  AttachMoney,
  Event,
  Login as LoginIcon,
  Image as ImageIcon,
  Delete,
  Save,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { useThemeStore, ThemeMode, PrimaryColor } from '../../store/theme.store';
import { useGlobalSettingsStore, Currency } from '../../store/global-settings.store';
import { useUserCurrencyStore } from '../../store/user-currency.store';
import { useLanguageStore } from '../../store/language.store';
import { globalSettingsService } from '../../services/global-settings.service';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { mode, primaryColor, sidebarColor, setMode, setPrimaryColor, setSidebarColor } = useThemeStore();
  const {
    currency: globalCurrency,
    currencySymbol: globalCurrencySymbol,
    defaultAnnualLeave,
    defaultSickLeave,
    defaultEmergencyLeave,
    loginBackgroundColor,
    loginBackgroundImage,
    loginLogo,
    sidebarLogo,
    sidebarColor: globalSidebarColor,
    themeMode: globalThemeMode,
    primaryColor: globalPrimaryColor,
    setCurrency: setGlobalCurrency,
    setLeaveSettings,
    setLoginBackground,
    setLoginLogo,
    setSidebarLogo,
    setFavicon,
    setSidebarColor: setGlobalSidebarColor,
    setThemeMode: setGlobalThemeMode,
    setPrimaryColor: setGlobalPrimaryColor,
    favicon,
  } = useGlobalSettingsStore();
  const {
    currency: userCurrency,
    currencySymbol: userCurrencySymbol,
    setCurrency: setUserCurrency,
    loadCurrency,
  } = useUserCurrencyStore();
  const { language, setLanguage } = useLanguageStore();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Email settings state - cPanel SMTP only
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: 'false', // 'true' for SSL (465), 'false' for TLS (587)
    emailFrom: '',
    emailFromName: 'UBS ERP System',
  });
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  
  // Use global currency for admin, user currency for staff
  const currency = isAdmin ? globalCurrency : userCurrency;
  const currencySymbol = isAdmin ? globalCurrencySymbol : userCurrencySymbol;
  
  // Load user currency on mount
  React.useEffect(() => {
    if (user && !isAdmin) {
      loadCurrency(user.id);
    }
  }, [user, isAdmin, loadCurrency]);

  // Load email settings on mount (admin only)
  React.useEffect(() => {
    if (isAdmin) {
      loadEmailSettings();
    }
  }, [isAdmin]);

  const loadEmailSettings = async () => {
    try {
      const settings = await globalSettingsService.getAllSettings();
      setEmailSettings({
        smtpHost: settings.email_smtp_host || '',
        smtpPort: settings.email_smtp_port || '587',
        smtpUser: settings.email_smtp_user || '',
        smtpPassword: settings.email_smtp_password || '',
        smtpSecure: settings.email_smtp_secure || 'false',
        emailFrom: settings.email_from || '',
        emailFromName: settings.email_from_name || 'UBS ERP System',
      });
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const handleSaveEmailSettings = async () => {
    // Validate required fields
    if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword || !emailSettings.emailFrom) {
      setError('Please fill in all required fields: SMTP Host, SMTP Username, SMTP Password, and From Email');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setEmailSettingsLoading(true);
    try {
      await globalSettingsService.setSettings({
        email_provider: 'smtp', // Always SMTP for cPanel
        email_smtp_host: emailSettings.smtpHost,
        email_smtp_port: emailSettings.smtpPort,
        email_smtp_user: emailSettings.smtpUser,
        email_smtp_password: emailSettings.smtpPassword,
        email_smtp_secure: emailSettings.smtpSecure,
        email_from: emailSettings.emailFrom,
        email_from_name: emailSettings.emailFromName,
      });
      setSuccess('cPanel SMTP settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setSuccess(null);
      setError(error.message || 'Failed to save email settings');
      setTimeout(() => setError(null), 5000);
    } finally {
      setEmailSettingsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailSettings.emailFrom) {
      setError('Please set "From Email" before testing');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Validate test email recipient
    if (!testEmailTo || !testEmailTo.includes('@')) {
      setError('Please enter a valid email address in "Test Email To" field');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Validate SMTP settings are filled
    if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword) {
      setError('Please fill in all SMTP settings (Host, Username, Password) before testing');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    setEmailTestLoading(true);
    setError(null);
    try {
      // Direct API call to email server (no Supabase)
      const emailServerUrl = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
      
      const response = await fetch(`${emailServerUrl}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmailTo.trim(),
          subject: 'Test Email from UBS ERP',
          html: '<h1>Test Email</h1><p>This is a test email from your UBS ERP system. If you received this, your cPanel email configuration is working correctly!</p><p><strong>Sent to:</strong> ' + testEmailTo.trim() + '</p>',
        }),
      });

      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      if (result.success === true) {
        setSuccess('Test email sent successfully! Please check your inbox.');
        setTimeout(() => setSuccess(null), 5000);
        return;
      }

      throw new Error('No response from email service');

      setSuccess('Test email sent successfully! Please check your inbox.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Test email error:', error);
      const errorMessage = error.message || 'Failed to send test email. Please check your cPanel SMTP configuration.';
      setError(errorMessage);
      setTimeout(() => setError(null), 8000);
    } finally {
      setEmailTestLoading(false);
    }
  };
  
  // File refs for uploads
  const loginBgImageRef = useRef<HTMLInputElement>(null);
  const loginLogoRef = useRef<HTMLInputElement>(null);
  const sidebarLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const colorOptions: { value: PrimaryColor; label: string; color: string }[] = [
    { value: 'blue', label: 'Blue', color: '#2563eb' },
    { value: 'purple', label: 'Purple', color: '#7c3aed' },
    { value: 'green', label: 'Green', color: '#16a34a' },
    { value: 'red', label: 'Red', color: '#dc2626' },
    { value: 'orange', label: 'Orange', color: '#ea580c' },
    { value: 'teal', label: 'Teal', color: '#0891b2' },
    { value: 'pink', label: 'Pink', color: '#db2777' },
    { value: 'indigo', label: 'Indigo', color: '#4f46e5' },
    { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { value: 'amber', label: 'Amber', color: '#f59e0b' },
    { value: 'lime', label: 'Lime', color: '#84cc16' },
    { value: 'emerald', label: 'Emerald', color: '#10b981' },
    { value: 'violet', label: 'Violet', color: '#8b5cf6' },
    { value: 'fuchsia', label: 'Fuchsia', color: '#d946ef' },
    { value: 'rose', label: 'Rose', color: '#f43f5e' },
    { value: 'sky', label: 'Sky', color: '#0ea5e9' },
    { value: 'slate', label: 'Slate', color: '#64748b' },
  ];

  const currencyOptions: { value: Currency; label: string; symbol: string }[] = [
    { value: 'USD', label: 'US Dollar', symbol: '$' },
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'GBP', label: 'British Pound', symbol: '£' },
    { value: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
    { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
    { value: 'EGP', label: 'Egyptian Pound', symbol: 'E£' },
    { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
    { value: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
    { value: 'XAF', label: 'Central African CFA Franc (Cameroon)', symbol: 'XAF' },
  ];

  const handleSaveTheme = () => {
    setSuccess(t('settings.themeSaved'));
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleModeChange = async (newMode: ThemeMode) => {
    // Update per-user theme preference (each user has their own theme)
    await setMode(newMode, user?.id, isAdmin);
    handleSaveTheme();
  };

  const handleColorChange = async (newColor: PrimaryColor) => {
    // Update per-user theme preference (each user has their own theme)
    await setPrimaryColor(newColor, user?.id, isAdmin);
    handleSaveTheme();
  };

  const handleSidebarColorChange = async (color: string) => {
    // Update per-user theme preference (each user has their own theme)
    await setSidebarColor(color, user?.id, isAdmin);
    setSuccess(t('settings.sidebarColorUpdated'));
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    if (isAdmin) {
      setGlobalCurrency(newCurrency);
    } else if (user) {
      setUserCurrency(newCurrency, user.id);
    }
    setSuccess(t('settings.currencySaved'));
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleLeaveSettingsSave = () => {
    setSuccess(t('settings.leaveSettingsSaved'));
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleLoginBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLoginBackground(loginBackgroundColor, reader.result as string);
        setSuccess(t('settings.loginBgUploaded'));
        setTimeout(() => setSuccess(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLoginLogo(reader.result as string);
        setSuccess(t('settings.loginLogoUploaded'));
        setTimeout(() => setSuccess(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSidebarLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSidebarLogo(reader.result as string);
        setSuccess(t('settings.sidebarLogoUploaded'));
        setTimeout(() => setSuccess(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (should be image)
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, SVG, ICO, etc.)');
        setTimeout(() => setError(null), 5000);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFavicon(reader.result as string);
        setSuccess(t('settings.faviconUploaded'));
        setTimeout(() => setSuccess(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto', py: 3, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          {t('settings.title') || 'Settings'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('settings.description')}
        </Typography>
      </Box>

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Tabs for Admin */}
      {isAdmin && (
        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 64,
              },
            }}
          >
            <Tab label={t('settings.personalSettings')} />
            <Tab label={t('settings.systemSettings')} />
            <Tab label={t('settings.appearance')} />
            <Tab label={t('settings.loginPage')} />
          </Tabs>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings - Always visible */}
        {(tabValue === 0 || !isAdmin) && (
          <Grid item xs={12} sm={6} lg={4}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Person sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('settings.profileInformation')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {t('settings.accountDetails')}
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                
                <Stack spacing={2.5} sx={{ flex: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      {t('settings.fullName')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('settings.notSet')}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      {t('common.email')}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Email sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                        {user?.email || t('settings.notAvailable')}
                      </Typography>
                    </Stack>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      {t('common.role')}
                    </Typography>
                    <Chip
                      label={user?.role === 'admin' ? t('common.administrator') : t('common.staff')}
                      color={user?.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                  
                  {user?.company && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        {t('staff.company')}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Business sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                          {user.company.name}
                        </Typography>
                      </Stack>
                      {!isAdmin && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                          Company assignment can only be changed by an administrator
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {user?.jobTitle && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        {t('staff.jobTitle')}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Work sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                          {user.jobTitle}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Theme Customization - Tab 2 for Admin, always visible for Staff */}
        {((isAdmin && tabValue === 2) || !isAdmin) && (
          <Grid item xs={12} sm={6} lg={!isAdmin ? 8 : 12}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Palette sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('settings.appearance')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isAdmin ? t('settings.systemAppearance') : t('settings.personalTheme')}
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {/* Theme Mode */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('settings.themeMode')}
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: 'background.default',
                        }}
                      >
                        <RadioGroup
                          value={mode}
                          onChange={(e) => handleModeChange(e.target.value as ThemeMode)}
                        >
                          <FormControlLabel
                            value="light"
                            control={<Radio />}
                            label={
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Brightness7 sx={{ fontSize: 20 }} />
                                <Typography>{t('settings.lightMode')}</Typography>
                              </Stack>
                            }
                            sx={{ mb: 1 }}
                          />
                          <FormControlLabel
                            value="dark"
                            control={<Radio />}
                            label={
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Brightness4 sx={{ fontSize: 20 }} />
                                <Typography>{t('settings.darkMode')}</Typography>
                              </Stack>
                            }
                          />
                        </RadioGroup>
                      </Paper>
                    </Box>
                  </Grid>

                  {/* Primary Color */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('settings.primaryColor')}
                      </Typography>
                      <Grid container spacing={1.5}>
                        {colorOptions.map((option) => (
                          <Grid item xs={4} sm={3} md={3} key={option.value}>
                            <Paper
                              sx={{
                                p: 1.5,
                                cursor: 'pointer',
                                border: primaryColor === option.value ? 2.5 : 1,
                                borderColor: primaryColor === option.value ? option.color : 'divider',
                                borderRadius: 2,
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                backgroundColor: primaryColor === option.value ? `${option.color}10` : 'background.paper',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 3,
                                  borderColor: option.color,
                                },
                              }}
                              onClick={() => handleColorChange(option.value)}
                            >
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  backgroundColor: option.color,
                                  mx: 'auto',
                                  mb: 1,
                                  border: '2px solid white',
                                  boxShadow: 2,
                                }}
                              />
                              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                                {option.label}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Grid>

                  {/* Sidebar Color (Admin Only) */}
                  {isAdmin && (
                    <Grid item xs={12}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                          {t('settings.sidebarColor')}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                          <TextField
                            type="color"
                            value={sidebarColor || '#2563eb'}
                            onChange={(e) => handleSidebarColorChange(e.target.value)}
                            sx={{
                              width: 80,
                              height: 56,
                              '& .MuiInputBase-input': {
                                padding: '12px',
                                cursor: 'pointer',
                              },
                            }}
                          />
                          <TextField
                            label={t('settings.hexColor')}
                            value={sidebarColor || '#2563eb'}
                            onChange={(e) => handleSidebarColorChange(e.target.value)}
                            size="small"
                            sx={{ flex: 1, minWidth: 150, maxWidth: 200 }}
                          />
                          <Button
                            variant="outlined"
                            onClick={() => handleSidebarColorChange('#2563eb')}
                            sx={{ borderRadius: 2 }}
                          >
                            {t('settings.reset')}
                          </Button>
                        </Stack>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Currency Settings - For Staff in Personal Settings */}
        {(tabValue === 0 || !isAdmin) && !isAdmin && (
          <Grid item xs={12} sm={6} lg={4}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AttachMoney sx={{ fontSize: 28, color: 'success.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('settings.currencySettings')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {t('settings.setCurrency')}
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                <FormControl fullWidth sx={{ mt: 'auto' }}>
                  <InputLabel>{t('settings.selectCurrency')}</InputLabel>
                  <Select
                    value={currency}
                    label={t('settings.selectCurrency')}
                    onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                    sx={{ borderRadius: 2 }}
                  >
                    {currencyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography sx={{ fontWeight: 600 }}>{option.symbol}</Typography>
                          <Typography>{option.label}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Current Symbol: <strong>{currencySymbol}</strong>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Language Settings */}
        {(tabValue === 0 || !isAdmin) && (
          <Grid item xs={12} sm={6} lg={4}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Language sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {t('settings.language')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {isAdmin ? t('settings.setSystemLanguage') : t('settings.chooseLanguage')}
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                <FormControl fullWidth sx={{ mt: 'auto' }}>
                  <InputLabel>{t('settings.selectLanguage')}</InputLabel>
                  <Select
                    value={language}
                    label={t('settings.selectLanguage')}
                    onChange={(e) => {
                      setLanguage(e.target.value as 'en' | 'fr' | 'ar');
                      setSuccess(t('settings.languageChanged'));
                      setTimeout(() => setSuccess(null), 3000);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="en">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography>🇬🇧</Typography>
                        <Typography>English</Typography>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="fr">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography>🇫🇷</Typography>
                        <Typography>Français</Typography>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="ar">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography>🇸🇦</Typography>
                        <Typography>العربية</Typography>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* System Settings - Admin Only */}
        {isAdmin && tabValue === 1 && (
          <>
            {/* Currency Settings */}
            <Grid item xs={12} sm={6} lg={6}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'success.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AttachMoney sx={{ fontSize: 28, color: 'success.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('settings.currencySettings')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t('settings.setSystemCurrency')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  <FormControl fullWidth>
                    <InputLabel>{t('settings.defaultCurrency')}</InputLabel>
                    <Select
                      value={currency}
                      label={t('settings.defaultCurrency')}
                      onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                      sx={{ borderRadius: 2 }}
                    >
                      {currencyOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ fontWeight: 600 }}>{option.symbol}</Typography>
                            <Typography>{option.label}</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('settings.currentSymbol')}: <strong>{currencySymbol}</strong>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Leave Settings */}
            <Grid item xs={12} sm={6} lg={6}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'info.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Event sx={{ fontSize: 28, color: 'info.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('leaves.leaveBalance')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t('settings.setDefaultLeave')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  <Stack spacing={2}>
                    <TextField
                      label={t('settings.defaultAnnualLeave')}
                      type="number"
                      value={defaultAnnualLeave}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setLeaveSettings(value, defaultSickLeave, defaultEmergencyLeave);
                      }}
                      fullWidth
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                    <TextField
                      label={t('settings.defaultSickLeave')}
                      type="number"
                      value={defaultSickLeave}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setLeaveSettings(defaultAnnualLeave, value, defaultEmergencyLeave);
                      }}
                      fullWidth
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                    <TextField
                      label={t('settings.defaultEmergencyLeave')}
                      type="number"
                      value={defaultEmergencyLeave}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setLeaveSettings(defaultAnnualLeave, defaultSickLeave, value);
                      }}
                      fullWidth
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleLeaveSettingsSave}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      {t('settings.saveLeaveSettings')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Email Configuration */}
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Email sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        cPanel Email Configuration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure your cPanel SMTP settings for sending invoices and reports
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>Using cPanel SMTP:</strong> Configure your cPanel email server settings below. 
                      All emails will be sent directly through your cPanel email account - no 3rd party services required.
                    </Typography>
                  </Alert>
                  
                  <Grid container spacing={3}>

                    {/* From Email */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="From Email"
                        value={emailSettings.emailFrom}
                        onChange={(e) => setEmailSettings({ ...emailSettings, emailFrom: e.target.value })}
                        placeholder="noreply@yourdomain.com"
                        helperText="This email will appear as the sender. Use your verified domain email."
                      />
                    </Grid>

                    {/* From Name */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="From Name"
                        value={emailSettings.emailFromName}
                        onChange={(e) => setEmailSettings({ ...emailSettings, emailFromName: e.target.value })}
                        placeholder="UBS ERP System"
                      />
                    </Grid>

                    {/* SMTP Configuration - cPanel Only */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="SMTP Host *"
                        value={emailSettings.smtpHost}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                        placeholder="mail.yourdomain.com"
                        helperText="Usually: mail.yourdomain.com or smtp.yourdomain.com"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="SMTP Port *"
                        value={emailSettings.smtpPort}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                        placeholder="587"
                        helperText="587 for TLS (recommended), 465 for SSL"
                        type="number"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="SMTP Username (Email) *"
                        value={emailSettings.smtpUser}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                        placeholder="noreply@yourdomain.com"
                        helperText="Your cPanel email address (full email)"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="SMTP Password *"
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={emailSettings.smtpPassword}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                        placeholder="Your email password"
                        helperText="Password for the cPanel email account"
                        required
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                edge="end"
                                size="small"
                              >
                                {showSmtpPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Connection Security *</InputLabel>
                        <Select
                          value={emailSettings.smtpSecure}
                          label="Connection Security *"
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpSecure: e.target.value })}
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="false">TLS (Port 587 - Recommended)</MenuItem>
                          <MenuItem value="true">SSL (Port 465)</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        TLS is recommended for most cPanel servers. Use SSL if TLS doesn't work.
                      </Typography>
                    </Grid>

                    {/* Test Email Recipient */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Test Email To *"
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                        placeholder="your-email@example.com"
                        helperText="Enter the email address where you want to receive the test email"
                        required
                        sx={{ mb: 2 }}
                      />
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={handleSaveEmailSettings}
                          disabled={emailSettingsLoading}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                          {emailSettingsLoading ? 'Saving...' : 'Save Email Settings'}
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Email />}
                          onClick={handleTestEmail}
                          disabled={emailTestLoading || !emailSettings.emailFrom || !testEmailTo}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                          {emailTestLoading ? 'Sending...' : 'Send Test Email'}
                        </Button>
                      </Stack>
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>cPanel SMTP Only:</strong> All emails are sent directly through your cPanel email server. 
                          No 3rd party services required. After saving, make sure the Edge Function is deployed.
                        </Typography>
                      </Alert>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Login Page Customization - Admin Only */}
        {isAdmin && tabValue === 3 && (
          <>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <LoginIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('settings.loginPageBackground')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t('settings.customizeLoginPage')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('settings.backgroundColor')}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <TextField
                          type="color"
                          value={loginBackgroundColor}
                          onChange={(e) => setLoginBackground(e.target.value, loginBackgroundImage)}
                          sx={{
                            width: 80,
                            height: 56,
                            '& .MuiInputBase-input': {
                              padding: '12px',
                              cursor: 'pointer',
                            },
                          }}
                        />
                        <TextField
                          label="Hex Color"
                          value={loginBackgroundColor}
                          onChange={(e) => setLoginBackground(e.target.value, loginBackgroundImage)}
                          size="small"
                          sx={{ flex: 1, minWidth: 150, maxWidth: 200 }}
                        />
                      </Stack>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        {t('settings.backgroundImageOptional')}
                      </Typography>
                      {loginBackgroundImage ? (
                        <Box sx={{ position: 'relative', mb: 2 }}>
                          <Box
                            component="img"
                            src={loginBackgroundImage}
                            alt="Login background"
                            sx={{
                              width: '100%',
                              maxHeight: 200,
                              objectFit: 'cover',
                              borderRadius: 2,
                              border: '1px solid rgba(0,0,0,0.08)',
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => {
                              setLoginBackground(loginBackgroundColor, null);
                              setSuccess(t('settings.backgroundImageRemoved'));
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: 'error.main',
                              color: 'white',
                              '&:hover': { backgroundColor: 'error.dark' },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              backgroundColor: 'action.hover',
                            },
                          }}
                          onClick={() => loginBgImageRef.current?.click()}
                        >
                          <input
                            ref={loginBgImageRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleLoginBgImageUpload}
                          />
                          <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {t('settings.clickToUploadBg')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('settings.loginPageLogo')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t('settings.uploadLoginLogo')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  
                  {loginLogo ? (
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Box
                        component="img"
                        src={loginLogo}
                        alt="Login logo"
                        sx={{
                          width: '100%',
                          maxHeight: 150,
                          objectFit: 'contain',
                          borderRadius: 2,
                          border: '1px solid rgba(0,0,0,0.08)',
                          p: 2,
                          backgroundColor: 'background.paper',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          setLoginLogo(null);
                          setSuccess(t('settings.loginLogoRemoved'));
                          setTimeout(() => setSuccess(null), 3000);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'error.main',
                          color: 'white',
                          '&:hover': { backgroundColor: 'error.dark' },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => loginLogoRef.current?.click()}
                    >
                      <input
                        ref={loginLogoRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleLoginLogoUpload}
                      />
                      <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('settings.clickToUploadLogo')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sidebar Logo */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('settings.sidebarLogo')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t('settings.replaceSidebarText')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />
                  
                  {sidebarLogo ? (
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Box
                        component="img"
                        src={sidebarLogo}
                        alt="Sidebar logo"
                        sx={{
                          width: '100%',
                          maxHeight: 100,
                          objectFit: 'contain',
                          borderRadius: 2,
                          border: '1px solid rgba(0,0,0,0.08)',
                          p: 2,
                          backgroundColor: 'background.paper',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSidebarLogo(null);
                          setSuccess(t('settings.sidebarLogoRemoved'));
                          setTimeout(() => setSuccess(null), 3000);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'error.main',
                          color: 'white',
                          '&:hover': { backgroundColor: 'error.dark' },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => sidebarLogoRef.current?.click()}
                    >
                      <input
                        ref={sidebarLogoRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleSidebarLogoUpload}
                      />
                      <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('settings.clickToUploadSidebarLogo')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Favicon */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        backgroundColor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('settings.favicon')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('settings.faviconDescription')}
                      </Typography>
                    </Box>
                  </Stack>

                  {favicon ? (
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Box
                        component="img"
                        src={favicon}
                        alt="Favicon"
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 1,
                          objectFit: 'contain',
                          border: '1px solid',
                          borderColor: 'divider',
                          p: 1,
                          backgroundColor: 'background.paper',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await setFavicon(null);
                          setSuccess(t('settings.faviconRemoved'));
                          setTimeout(() => setSuccess(null), 3000);
                        }}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: 'error.main',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'error.dark',
                          },
                        }}
                      >
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => faviconRef.current?.click()}
                    >
                      <input
                        ref={faviconRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFaviconUpload}
                      />
                      <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('settings.clickToUploadFavicon')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Notification Settings - Always visible for non-admin tab */}
        {(tabValue === 0 || !isAdmin) && (
          <Grid item xs={12} sm={6} lg={4}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Notifications sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Manage your notification preferences
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={2} sx={{ flex: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Email Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Receive email updates about important events
                        </Typography>
                      </Box>
                      <Switch defaultChecked color="primary" sx={{ ml: 2, flexShrink: 0 }} />
                    </Stack>
                  </Paper>
                  
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Push Notifications
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Get real-time notifications in the app
                        </Typography>
                      </Box>
                      <Switch defaultChecked color="primary" sx={{ ml: 2, flexShrink: 0 }} />
                    </Stack>
                  </Paper>
                  
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Leave Request Alerts
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Notify when leave requests are approved or rejected
                        </Typography>
                      </Box>
                      <Switch defaultChecked color="primary" sx={{ ml: 2, flexShrink: 0 }} />
                    </Stack>
                  </Paper>
                  
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          Invoice Updates
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Get notified about invoice status changes
                        </Typography>
                      </Box>
                      <Switch defaultChecked color="primary" sx={{ ml: 2, flexShrink: 0 }} />
                    </Stack>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Security Settings (Admin Only) */}
        {isAdmin && tabValue === 0 && (
          <Grid item xs={12}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: 'error.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Security sx={{ fontSize: 28, color: 'error.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Security Settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Manage security and access controls
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <Security sx={{ fontSize: 24, color: 'primary.main' }} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        Change Password
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        Update your account password
                      </Typography>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Edit />}
                        onClick={() => {
                          setChangePasswordOpen(true);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setPasswordError(null);
                        }}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Change Password
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: 'info.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <Security sx={{ fontSize: 24, color: 'info.main' }} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        Two-Factor Authentication
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        Add an extra layer of security
                      </Typography>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Security />}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Enable 2FA
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 3,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: 'warning.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <Security sx={{ fontSize: 24, color: 'warning.main' }} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        Session Management
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        View and manage active sessions
                      </Typography>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Security />}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                      >
                        Manage Sessions
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => !passwordLoading && setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          Change Password
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError(null)}>
              {passwordError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              disabled={passwordLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      edge="end"
                      size="small"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              disabled={passwordLoading}
              helperText="Minimum 6 characters"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      edge="end"
                      size="small"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              disabled={passwordLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      edge="end"
                      size="small"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button
            onClick={() => {
              setChangePasswordOpen(false);
              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordError(null);
            }}
            disabled={passwordLoading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setPasswordError(null);
              
              // Validation
              if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                setPasswordError('Please fill in all fields');
                return;
              }
              
              if (passwordData.newPassword.length < 6) {
                setPasswordError('New password must be at least 6 characters');
                return;
              }
              
              if (passwordData.newPassword !== passwordData.confirmPassword) {
                setPasswordError('New passwords do not match');
                return;
              }
              
              setPasswordLoading(true);
              try {
                // Verify current password by attempting to re-authenticate
                const { supabase } = await import('../../services/supabase');
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: user?.email || '',
                  password: passwordData.currentPassword,
                });
                
                if (signInError) {
                  setPasswordError('Current password is incorrect');
                  setPasswordLoading(false);
                  return;
                }
                
                // Change password
                await authService.changePassword(passwordData.newPassword);
                
                setSuccess('Password changed successfully!');
                setChangePasswordOpen(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordError(null);
              } catch (err: any) {
                setPasswordError(err?.message || 'Failed to change password. Please try again.');
              } finally {
                setPasswordLoading(false);
              }
            }}
            disabled={passwordLoading}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
              },
            }}
          >
            {passwordLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsScreen;

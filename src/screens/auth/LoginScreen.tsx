import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import { LoginCredentials, authService } from '../../services/auth.service';
import { useGlobalSettingsStore } from '../../store/global-settings.store';

const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const { loginBackgroundColor, loginBackgroundImage, loginLogo, sidebarLogo } = useGlobalSettingsStore();
  const [backgroundImageError, setBackgroundImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  // Use sidebar logo as fallback for login logo
  const effectiveLoginLogo = loginLogo || sidebarLogo || (logoError ? null : '/ubs-logo.png');
  
  // Use default background image if no custom one is set
  const effectiveBackgroundImage = loginBackgroundImage || (backgroundImageError ? null : '/login-background.jpg');
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('error');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload images for faster display
  useEffect(() => {
    // Reset error state when background image changes
    if (loginBackgroundImage) {
      setBackgroundImageError(false);
    }
    
    const imagesToPreload: string[] = [];
    
    // Preload login logo (custom, sidebar logo, or default)
    if (loginLogo) {
      imagesToPreload.push(loginLogo);
    } else if (sidebarLogo) {
      imagesToPreload.push(sidebarLogo);
    } else if (!logoError) {
      imagesToPreload.push('/ubs-logo.png');
    }
    
    // Preload background image (custom or default)
    if (loginBackgroundImage) {
      imagesToPreload.push(loginBackgroundImage);
    } else {
      // Always try to preload default background image
      imagesToPreload.push('/login-background.jpg');
    }
    
    if (imagesToPreload.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    const totalImages = imagesToPreload.length;

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        if (src === '/login-background.jpg' && !loginBackgroundImage) {
          setBackgroundImageError(true);
        }
        if (src === '/ubs-logo.png' && !loginLogo && !sidebarLogo) {
          setLogoError(true);
        }
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });
  }, [loginLogo, sidebarLogo, loginBackgroundImage, logoError]);

  // Clear any stale storage on mount - don't block login
  React.useEffect(() => {
    // Don't clear storage automatically - let checkAuth handle it
    // This was causing issues where valid sessions were cleared
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User already authenticated, redirecting...', user.email, user.role);
      // Small delay to ensure state is fully set
      const redirectTimer = setTimeout(() => {
        // Redirect clients to their client dashboard
        if (user.role === 'client') {
          navigate(`/client/${user.id}`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      const msg = 'Please fill in all fields';
      setError(msg);
      setSnackbarMessage(msg);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSnackbarOpen(false);

    try {
      console.log('Attempting login with:', credentials.email);
      
      // Call login function with timeout
      const loginPromise = login(credentials);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login request timed out. Please try again.')), 30000)
      );
      
      await Promise.race([loginPromise, timeoutPromise]);
      
      console.log('Login successful, checking auth state...');
      
      // Wait a moment for state to propagate
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check auth state with retries
      let retries = 0;
      let finalAuthState = useAuthStore.getState();
      
      while ((!finalAuthState.isAuthenticated || !finalAuthState.user) && retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        finalAuthState = useAuthStore.getState();
        retries++;
        console.log(`Checking auth state (attempt ${retries}/5)...`, {
          isAuthenticated: finalAuthState.isAuthenticated,
          hasUser: !!finalAuthState.user
        });
      }
      
      if (finalAuthState.isAuthenticated && finalAuthState.user) {
        console.log('✅ User authenticated, redirecting...', finalAuthState.user.role);
        
        // Show success message briefly
        const successMsg = 'Login successful! Redirecting...';
        setSuccessMessage(successMsg);
        setSnackbarMessage(successMsg);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Small delay before redirect to ensure UI updates
        setTimeout(() => {
          // Redirect based on role
          if (finalAuthState.user.role === 'client') {
            navigate(`/client/${finalAuthState.user.id}`, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          setLoading(false);
        }, 300);
      } else {
        console.error('❌ Login succeeded but user not authenticated in store after retries');
        // Force a page reload to sync state
        const errorMsg = 'Login succeeded but session not established. Refreshing page...';
        setError(errorMsg);
        setSnackbarMessage(errorMsg);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = err?.message || 'Wrong credentials. Please check your email and password.';
      
      // Make error message shorter and more actionable
      if (errorMessage.includes('Wrong password') || errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid login')) {
        errorMessage = '❌ WRONG PASSWORD!\n\nPlease reset the password in Supabase:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Find admin@ubs.com\n3. Click "..." > "Reset Password"\n4. Set password to: admin@ubs1234';
      }
      
      // Show error in both Alert and Snackbar
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setSnackbarMessage('Please enter a valid email address');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await authService.resetPassword(forgotPasswordEmail);
      setSnackbarMessage('Password reset email sent! Please check your inbox.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setForgotPasswordOpen(false);
      setForgotPasswordEmail('');
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Failed to send password reset email. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setForgotPasswordLoading(false);
    }
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: effectiveBackgroundImage 
          ? `url(${effectiveBackgroundImage}) center/cover no-repeat`
          : loginBackgroundColor || 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
        p: 2,
        position: 'relative',
        '&::before': effectiveBackgroundImage ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 0,
        } : {},
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper 
          elevation={24} 
          sx={{ 
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 4,
            background: 'white',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {effectiveLoginLogo ? (
              <Box
                component="img"
                src={effectiveLoginLogo}
                alt="Logo"
                onError={() => setLogoError(true)}
                sx={{
                  maxHeight: 80,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  mb: 2,
                  opacity: imagesLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                }}
                loading="eager"
              />
            ) : (
              <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                UBS ERP
              </Typography>
            )}
            <Typography variant="h5" component="h2" gutterBottom color="text.secondary" sx={{ fontWeight: 500 }}>
              Login
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to access your dashboard
            </Typography>
          </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {successMessage}
            </Typography>
          </Alert>
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={8000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ zIndex: 9999 }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity} 
            sx={{ 
              width: '100%',
              minWidth: '300px',
              fontSize: '1rem',
              fontWeight: 600,
            }}
            variant="filled"
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <Box 
          component="form" 
          sx={{ mt: 3 }}
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <TextField
            fullWidth
            label={t('auth.email')}
            type="email"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            margin="normal"
            disabled={loading}
            autoComplete="email"
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          <TextField
            fullWidth
            label={t('auth.password')}
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            margin="normal"
            disabled={loading}
            autoComplete="current-password"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleLogin();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleLogin}
            disabled={loading}
            sx={{ 
              mt: 3, 
              mb: 1, 
              py: 1.5,
              background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : t('common.login')}
          </Button>

          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setForgotPasswordOpen(true)}
              sx={{
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Forgot Password?
            </Link>
          </Box>
        </Box>

        {/* Forgot Password Dialog */}
        <Dialog 
          open={forgotPasswordOpen} 
          onClose={() => !forgotPasswordLoading && setForgotPasswordOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
            Reset Password
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              disabled={forgotPasswordLoading}
              autoFocus
              placeholder="your.email@example.com"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 2 }}>
            <Button
              onClick={() => setForgotPasswordOpen(false)}
              disabled={forgotPasswordLoading}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading}
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
              {forgotPasswordLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Send Reset Link'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
      </Container>
    </Box>
  );
};

export default LoginScreen;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  Link as MuiLink,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import { useTranslation } from 'react-i18next';
import { useGlobalSettingsStore } from '../../store/global-settings.store';

const ResetPasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginBackgroundColor, loginBackgroundImage, loginLogo } = useGlobalSettingsStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid password reset session from Supabase
    const checkResetSession = async () => {
      try {
        // Supabase password reset uses hash fragments in the URL (#access_token=...&type=recovery)
        // Check for hash fragments first
        const hash = window.location.hash;
        
        // Listen for auth state changes (Supabase will process the hash)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setIsValidToken(true);
          }
        });

        // Give Supabase time to process the hash fragments
        setTimeout(async () => {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session && !sessionError) {
            setIsValidToken(true);
          } else if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
            // Hash is present but session not created yet - wait a bit more
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                setIsValidToken(true);
              } else {
                setIsValidToken(false);
                setError('Invalid or expired reset link. Please request a new password reset.');
              }
            }, 1000);
          } else {
            setIsValidToken(false);
            setError('No reset token found. Please use the link from your email.');
          }
          
          // Cleanup subscription
          subscription.unsubscribe();
        }, 500);
      } catch (err) {
        console.error('Error checking reset session:', err);
        setIsValidToken(false);
        setError('Error validating reset link. Please try again or request a new password reset.');
      }
    };

    checkResetSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password. Please try again or request a new reset link.');
      setLoading(false);
    }
  };

  // Show loading while checking token
  if (isValidToken === null) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: loginBackgroundImage
            ? `linear-gradient(135deg, ${loginBackgroundColor}dd 0%, ${loginBackgroundColor}aa 100%), url(${loginBackgroundImage})`
            : `linear-gradient(135deg, ${loginBackgroundColor} 0%, ${loginBackgroundColor}dd 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Validating reset link...
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Show error if invalid token
  if (isValidToken === false && !success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: loginBackgroundImage
            ? `linear-gradient(135deg, ${loginBackgroundColor}dd 0%, ${loginBackgroundColor}aa 100%), url(${loginBackgroundImage})`
            : `linear-gradient(135deg, ${loginBackgroundColor} 0%, ${loginBackgroundColor}dd 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 3,
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {loginLogo && (
                <Box
                  component="img"
                  src={loginLogo}
                  alt="Logo"
                  sx={{
                    maxWidth: 120,
                    maxHeight: 120,
                    mb: 3,
                    objectFit: 'contain',
                  }}
                />
              )}
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Reset Password
              </Typography>
            </Box>

            <Alert severity="error" sx={{ mb: 3 }}>
              {error || 'Invalid or expired reset link'}
            </Alert>

            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Back to Login
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: loginBackgroundImage
          ? `linear-gradient(135deg, ${loginBackgroundColor}dd 0%, ${loginBackgroundColor}aa 100%), url(${loginBackgroundImage})`
          : `linear-gradient(135deg, ${loginBackgroundColor} 0%, ${loginBackgroundColor}dd 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {loginLogo && (
              <Box
                component="img"
                src={loginLogo}
                alt="Logo"
                sx={{
                  maxWidth: 120,
                  maxHeight: 120,
                  mb: 3,
                  objectFit: 'contain',
                }}
              />
            )}
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your new password below
            </Typography>
          </Box>

          {success ? (
            <Alert severity="success" sx={{ mb: 3 }}>
              Password reset successfully! Redirecting to login...
            </Alert>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  disabled={loading || success}
                  required
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                  helperText="Password must be at least 6 characters"
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  disabled={loading || success}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={loading || success || !password || !confirmPassword}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    mb: 2,
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={() => navigate('/login')}
                    sx={{
                      textDecoration: 'none',
                      cursor: 'pointer',
                      color: 'primary.main',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Back to Login
                  </MuiLink>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordScreen;


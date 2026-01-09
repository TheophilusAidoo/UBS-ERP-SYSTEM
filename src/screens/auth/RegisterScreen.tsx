import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { RegisterData } from '../../services/auth.service';
import { UserRole } from '../../types';

const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState<RegisterData & { confirmPassword: string }>({
    email: '',
    password: '',
    role: 'staff',
    companyId: undefined,
    jobTitle: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        companyId: formData.companyId,
        jobTitle: formData.jobTitle,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          Register
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" sx={{ mt: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={formData.role}
              exclusive
              onChange={(_, value) => value && setFormData({ ...formData, role: value as UserRole })}
              aria-label="role selection"
            >
              <ToggleButton value="admin">Supervisor</ToggleButton>
              <ToggleButton value="staff">Staff</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <TextField
            fullWidth
            label={t('staff.firstName')}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label={t('staff.lastName')}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label={t('auth.email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label={t('auth.password')}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          {formData.role === 'staff' && (
            <TextField
              fullWidth
              label={t('staff.jobTitle')}
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              margin="normal"
              disabled={loading}
            />
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={handleRegister}
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/login')}
          >
            Already have an account? Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterScreen;

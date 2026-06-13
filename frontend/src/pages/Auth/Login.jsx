import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Link, 
  CircularProgress, 
  InputAdornment, 
  IconButton,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { toast } from 'react-hot-toast';
import useAuth from '../../hooks/useAuth.js';

/**
 * Account login page located in pages/Auth.
 * Logs in with credentials, handles UI loaders and validation errors,
 * and tracks the "Remember Me" state using local storage.
 */
export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize form options, recovering the remembered email address if present
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: localStorage.getItem('remember_email') || '',
      password: '',
      rememberMe: !!localStorage.getItem('remember_email'),
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      
      // Update Remember Me local storage flags based on checkbox state
      if (data.rememberMe) {
        localStorage.setItem('remember_email', data.email);
      } else {
        localStorage.removeItem('remember_email');
      }

      toast.success('Signed in successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Authentication failed. Please verify credentials.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, textAlign: 'center', letterSpacing: '-0.01em' }}>
        Welcome Back
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
        Enter credentials to manage your shared expenses
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Email Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          autoComplete="email"
          autoFocus
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email', {
            required: 'Email address is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address',
            },
          })}
          sx={{ mb: 2 }}
        />

        {/* Password Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must contain at least 6 characters',
            },
          })}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password display"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {/* Remember Me Checkbox */}
        <FormControlLabel
          control={
            <Checkbox 
              color="primary" 
              {...register('rememberMe')} 
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Remember me
            </Typography>
          }
          sx={{ mb: 2, display: 'block', textAlign: 'left' }}
        />

        {/* Action Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={submitting}
          sx={{ py: 1.5, mb: 2, position: 'relative', color: '#0f172a', fontWeight: 700 }}
        >
          {submitting ? (
            <CircularProgress size={24} sx={{ color: '#0f172a' }} />
          ) : (
            'Sign In'
          )}
        </Button>

        {/* Link back to registration */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account yet?{' '}
            <Link 
              component={RouterLink} 
              to="/register" 
              variant="body2" 
              color="primary" 
              sx={{ fontWeight: 700, textDecoration: 'none' }}
            >
              Create Account
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;

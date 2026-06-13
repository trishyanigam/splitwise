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
  IconButton 
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { toast } from 'react-hot-toast';
import useAuth from '../../hooks/useAuth.js';

/**
 * Onboarding/registration page located in pages/Auth.
 * Validates fields (name, email, password, confirmPassword) and creates
 * a user account through our backend authentication api routes.
 */
export const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Keep track of the current password field value for equality comparisons
  const passwordValue = watch('password');

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success('Account registered successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to register. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, textAlign: 'center', letterSpacing: '-0.01em' }}>
        Create Account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
        Sign up to start splitting bills and tracking expense groups
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Full Name Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label="Full Name"
          autoComplete="name"
          autoFocus
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register('name', {
            required: 'Full name is required',
            minLength: {
              value: 2,
              message: 'Name must contain at least 2 characters',
            },
          })}
          sx={{ mb: 2 }}
        />

        {/* Email Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          autoComplete="email"
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
          autoComplete="new-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must contain at least 8 characters',
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
          sx={{ mb: 2 }}
        />

        {/* Confirm Password Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="confirmPassword"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => 
              value === passwordValue || 'Passwords do not match',
          })}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password display"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* Submit Button */}
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
            'Sign Up'
          )}
        </Button>

        {/* Back link to login */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link 
              component={RouterLink} 
              to="/login" 
              variant="body2" 
              color="primary" 
              sx={{ fontWeight: 700, textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;

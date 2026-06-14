import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Grid, 
  Avatar, 
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SecurityIcon from '@mui/icons-material/Security';
import { toast } from 'react-hot-toast';
import useAuth from '../../hooks/useAuth.js';

/**
 * Account Profile settings component.
 * Allows logged-in users to update their personal name, email, and password.
 */
export const Profile = () => {
  const { user, updateProfileContext } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is a required field.');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is a required field.');
      return;
    }

    if (password) {
      if (password.length < 6) {
        toast.error('New password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
    }

    try {
      setSaving(true);
      await updateProfileContext(name, email, password || undefined);
      toast.success('Profile settings updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Failed to update profile settings.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Box>
      {/* Header section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
          My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal details, email preferences, and password security.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column: Card Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center', p: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText',
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {user?.email}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2.5} sx={{ textAlign: 'left', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CalendarTodayIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      MEMBER SINCE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDate(user?.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <SecurityIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ACCOUNT STATUS
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      Verified Active
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Edit Settings Form */}
        <Grid item xs={12} md={8}>
          <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Personal Information
              </Typography>

              <Box component="form" onSubmit={handleSave} noValidate>
                <Grid container spacing={3}>
                  {/* Name Input */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={saving}
                      InputProps={{
                        startAdornment: (
                          <PersonIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>

                  {/* Email Input */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={saving}
                      InputProps={{
                        startAdornment: (
                          <EmailIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  {/* Change Password Banner */}
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      Security Credentials
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Leave these fields empty if you do not wish to change your current login password.
                    </Typography>
                  </Grid>

                  {/* Password Input */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="New Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={saving}
                    />
                  </Grid>

                  {/* Confirm Password Input */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Match new password"
                      disabled={saving}
                    />
                  </Grid>

                  {/* Form Submission CTA */}
                  <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={saving}
                      sx={{ py: 1.5, px: 4, minWidth: 160, position: 'relative', color: '#0f172a', fontWeight: 700 }}
                    >
                      {saving ? (
                        <CircularProgress size={24} sx={{ color: '#0f172a' }} />
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;

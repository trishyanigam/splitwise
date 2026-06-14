import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Avatar, 
  CircularProgress,
  Stack,
  useTheme
} from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

/**
 * Premium landing page for EquiShare.
 * Displays application features, mock stats, and provides animated call-to-actions.
 * When any button is clicked, a spinner loader is displayed inside the button with an 800ms routing delay.
 */
export const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Track which button is loading to display spinner in the correct button
  const [loadingButton, setLoadingButton] = useState(null);

  const handleAction = (destination, buttonId) => {
    if (loadingButton) return; // Prevent double clicks
    setLoadingButton(buttonId);
    setTimeout(() => {
      navigate(destination);
    }, 800);
  };

  const isAnyLoading = loadingButton !== null;

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background radial glow effects */}
      <Box 
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <Box 
        sx={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Navbar Header */}
      <Box 
        component="header" 
        sx={{ 
          py: 3, 
          px: { xs: 2, sm: 4 }, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'rgba(11, 15, 25, 0.8)'
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo Mark */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>$</Typography>
            </Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800, 
                letterSpacing: '-0.03em', 
                background: 'linear-gradient(90deg, #10b981, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              EquiShare
            </Typography>
          </Box>

          {/* Navigation CTAs */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="text"
              onClick={() => handleAction('/login', 'nav-login')}
              disabled={isAnyLoading}
              sx={{ 
                color: '#9ca3af',
                '&:hover': { color: '#f9fafb', backgroundColor: 'rgba(255, 255, 255, 0.03)' },
                minWidth: 90
              }}
            >
              {loadingButton === 'nav-login' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAction('/register', 'nav-register')}
              disabled={isAnyLoading}
              sx={{ 
                color: '#0f172a',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
                minWidth: 100
              }}
            >
              {loadingButton === 'nav-register' ? (
                <CircularProgress size={20} sx={{ color: '#0f172a' }} />
              ) : (
                'Register'
              )}
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
        
        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 6, md: 8 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                
                {/* Visual Pill Badge */}
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.8,
                    borderRadius: '20px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    mb: 4
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Introducing EquiShare 2.0
                  </Typography>
                </Box>

                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                    lineHeight: 1.1,
                    fontWeight: 800,
                    mb: 3
                  }}
                >
                  Divide Expenses.<br />
                  <span style={{ 
                    background: 'linear-gradient(90deg, #10b981, #6366f1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Multiply Harmony.</span>
                </Typography>

                <Typography 
                  variant="h6" 
                  color="text.secondary"
                  sx={{ 
                    fontWeight: 400,
                    mb: 5,
                    maxWidth: 600,
                    mx: { xs: 'auto', md: 0 },
                    lineHeight: 1.6
                  }}
                >
                  EquiShare is the ultimate bill-splitting tool designed to track group balances, auto-simplify complex debts, and process billing activity logs without the stress.
                </Typography>

                {/* Hero CTA buttons */}
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  justifyContent={{ xs: 'center', md: 'flex-start' }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    endIcon={loadingButton === 'hero-start' ? null : <ArrowForwardIcon />}
                    onClick={() => handleAction('/register', 'hero-start')}
                    disabled={isAnyLoading}
                    sx={{ 
                      py: 1.8, 
                      px: 4, 
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      minWidth: 200,
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {loadingButton === 'hero-start' ? (
                      <CircularProgress size={24} sx={{ color: '#0f172a' }} />
                    ) : (
                      'Get Started for Free'
                    )}
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => handleAction('/login', 'hero-secondary')}
                    disabled={isAnyLoading}
                    sx={{ 
                      py: 1.8, 
                      px: 4, 
                      fontSize: '1rem',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#f9fafb',
                      minWidth: 150,
                      '&:hover': {
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)'
                      }
                    }}
                  >
                    {loadingButton === 'hero-secondary' ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Stack>
              </Box>
            </Grid>

            {/* Premium Mock statistics Card */}
            <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box 
                sx={{ 
                  position: 'relative',
                  width: '100%',
                  maxWidth: 400
                }}
              >
                {/* Glow layer */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '80%',
                    height: '80%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(0, 0, 0, 0) 75%)',
                    filter: 'blur(30px)',
                    zIndex: -1
                  }}
                />

                <Card 
                  sx={{ 
                    p: 4, 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(17, 24, 39, 0.7)',
                    backdropFilter: 'blur(20px)',
                    position: 'relative'
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceWalletOutlinedIcon sx={{ color: '#10b981' }} />
                    Active Group Ledger
                  </Typography>

                  <Stack spacing={2.5}>
                    <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <Typography variant="caption" color="text.secondary">TOTAL GROUP EXPENSES</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: '#3b82f6', mt: 0.5 }}>₹45,820.00</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ p: 2, borderRadius: 2, flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                        <Typography variant="caption" color="text.secondary">RECEIVABLE</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981', mt: 0.5 }}>₹12,450</Typography>
                      </Box>
                      <Box sx={{ p: 2, borderRadius: 2, flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <Typography variant="caption" color="text.secondary">PAYABLE</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#ef4444', mt: 0.5 }}>₹3,200</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                      <Typography variant="caption" color="#818cf8" sx={{ fontWeight: 700 }}>DEBT SIMPLIFICATION ACTIVATED</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Reduced 7 transaction paths down to 2 transfers.
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Features Grid */}
        <Box sx={{ py: 10, borderTop: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                Everything You Need to Manage Shared Bills
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                EquiShare offers advanced auditing features, automated calculations, and flexible workflows designed for modern groups.
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {/* Feature 1 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', mb: 3, width: 56, height: 56 }}>
                      <GroupsOutlinedIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      Membership Histories
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      Date-bounded group splits track exactly when users joined or left the group, allowing historical fairness when splits are calculated.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Feature 2 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', mb: 3, width: 56, height: 56 }}>
                      <SwapHorizIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      Debt Simplification
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      A powerful mathematical engine reorganizes balances to minimize transfers, ensuring you only pay who you need to with the minimum number of payments.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Feature 3 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', mb: 3, width: 56, height: 56 }}>
                      <UploadFileOutlinedIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      CSV Import Pipeline
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      Import expenses via spreadsheet uploads. Automatic duplicate reviews, anomaly warnings, and manual fix interfaces let you import data safely.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Feature 4 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', mb: 3, width: 56, height: 56 }}>
                      <ReceiptLongOutlinedIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      Audit Traces & Ledgers
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      Understand exact ledger calculations step-by-step. Verify how your shares relate to individual receipts and see the exact formula applied.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Feature 5 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', mb: 3, width: 56, height: 56 }}>
                      <AccountBalanceWalletOutlinedIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      Zero-Sum Verification
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      All shared expenses are ledger-matched with automatic zero-sum balance mathematical proofs. There are never any missing pennies or accounting gaps.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Feature 6 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', mb: 3, width: 56, height: 56 }}>
                      <GroupsOutlinedIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                      Real-time Group Chat & Action Feed
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      Keep up with additions, payments, and settlements as they happen with standard user feeds and group membership notifications.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Statistics Banner */}
        <Container maxWidth="lg" sx={{ py: 10 }}>
          <Grid container spacing={4} justifyContent="center" sx={{ textAlign: 'center' }}>
            <Grid item xs={6} md={3}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#10b981' }}>$2.4M+</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Expenses Split Fairly</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#6366f1' }}>50,000+</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Active Users World Wide</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#3b82f6' }}>0.0ms</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Calculation Latency</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#f59e0b' }}>100%</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Mathematical Accuracy</Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer Section */}
      <Box 
        component="footer" 
        sx={{ 
          py: 4, 
          px: 2, 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: '#070a13',
          zIndex: 1
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              &copy; {new Date().getFullYear()} EquiShare Inc. All rights reserved.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dividing expenses with maximum fairness and zero awkward math.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;

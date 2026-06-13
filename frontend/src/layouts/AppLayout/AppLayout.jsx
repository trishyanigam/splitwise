import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Avatar, 
  Container,
  Menu,
  MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LogoutIcon from '@mui/icons-material/Logout';
import useAuth from '../../hooks/useAuth.js';

/**
 * Main application shell wrapping dashboard content views.
 * Supports:
 * - Desktop: Fixed side-nav drawer and header topbar.
 * - Mobile: Toggle drawer and topbar menu buttons.
 * - Sidebar elements: Dashboard, Groups, Balances, Import CSV.
 * - Profile dropdown menu with logout action.
 */
export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const drawerWidth = 260;

  // Sidebar navigation mapping list
  const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon color="primary" /> },
    { text: 'Groups', path: '/groups', icon: <GroupIcon color="primary" /> },
    { text: 'Balances', path: '/balances', icon: <AccountBalanceWalletIcon color="primary" /> },
    { text: 'Import CSV', path: '/import', icon: <UploadFileIcon color="primary" /> },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#111827' }}>
      {/* Brand logo container */}
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 3, gap: 1.5 }}>
        <Box 
          sx={{ 
            width: 32, 
            height: 32, 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 800, color: '#0f172a' }}>$</Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.02em' }}>
          Splitwise
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Sidebar Navigation Items */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
                selected={isSelected}
                sx={{ 
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    '&:hover': {
                      backgroundColor: 'rgba(16, 185, 129, 0.16)',
                    }
                  },
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.08)' } 
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  secondary={item.disabled ? 'Coming Soon' : null}
                  primaryTypographyProps={{ sx: { fontWeight: 600 } }} 
                  secondaryTypographyProps={{ sx: { fontSize: '10px' } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Divider />
      
      {/* Sidebar User Avatar / Session segment */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' }
        }} 
        onClick={handleMenuOpen}
      >
        <Avatar 
          sx={{ 
            bgcolor: 'secondary.main', 
            color: 'secondary.contrastText',
            fontWeight: 700 
          }}
        >
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: 'text.primary' }}>
            {user?.name}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {user?.email}
          </Typography>
        </Box>
      </Box>

      {/* User Actions Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: -1,
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              minWidth: 160
            }
          }
        }}
      >
        <MenuItem onClick={handleLogout} sx={{ color: '#ef4444', fontWeight: 600, gap: 1.5 }}>
          <LogoutIcon fontSize="small" />
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      {/* Top Navbar Header */}
      <AppBar 
        position="fixed" 
        sx={{ 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          ml: { sm: `${drawerWidth}px` }, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
          backgroundColor: '#0b0f19', 
          backgroundImage: 'none',
          boxShadow: 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton 
            color="inherit" 
            aria-label="open drawer" 
            edge="start" 
            onClick={handleDrawerToggle} 
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, letterSpacing: '-0.015em' }}>
            {menuItems.find((item) => item.path === location.pathname)?.text || 'Shared Expense'}
          </Typography>
          
          {/* User Avatar clickable indicator in Navbar */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleMenuOpen} size="small" sx={{ p: 0.5 }}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  fontSize: '14px',
                  fontWeight: 700 
                }}
              >
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawers Wrapper */}
      <Box 
        component="nav" 
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Temporary Drawer for mobile screens */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ 
            display: { xs: 'block', sm: 'none' }, 
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              backgroundColor: '#111827' 
            } 
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Permanent Drawer for desktop views */}
        <Drawer
          variant="permanent"
          sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              backgroundColor: '#111827' 
            } 
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Page Layout Container */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` } 
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;

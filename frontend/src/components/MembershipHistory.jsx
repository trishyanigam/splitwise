import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Chip, 
  Avatar
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { getMembershipHistory } from '../services/membershipService.js';

/**
 * Reusable MembershipHistory component displaying join/leave records of a group.
 * Supports auto-fetching via groupId, or display of pre-fetched dataset.
 * 
 * Props:
 * @param {number|string} [groupId] - If provided, triggers fetching from backend API.
 * @param {Array} [data] - Static history records list to render directly.
 */
export const MembershipHistory = ({ groupId, data }) => {
  const [history, setHistory] = useState(data || []);
  const [loading, setLoading] = useState(!data && !!groupId);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getMembershipHistory(groupId);
      if (res && res.history) {
        setHistory(res.history);
      }
    } catch (err) {
      console.error('Failed to load membership history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve membership logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      setHistory(data);
      setLoading(false);
    } else if (groupId) {
      fetchHistory();
    }
  }, [groupId, data]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress color="primary" size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <Typography variant="body1">No membership history records found.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer 
      component={Paper} 
      elevation={0}
      sx={{ 
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <Table aria-label="membership history table">
        <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, pl: 3 }}>Member Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Joined Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Left Date</TableCell>
            <TableCell sx={{ fontWeight: 700, pr: 3 }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((record) => {
            const isActive = record.isActive !== undefined ? record.isActive : !record.leftAt;
            return (
              <TableRow 
                key={record.id}
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                }}
              >
                {/* Member Name */}
                <TableCell sx={{ pl: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'text.primary', width: 28, height: 28 }}>
                      <PersonIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {record.user?.name || `User #${record.userId}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {record.user?.email || ''}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                
                {/* Joined Date */}
                <TableCell sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>
                  {formatDate(record.joinedAt)}
                </TableCell>
                
                {/* Left Date */}
                <TableCell sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.875rem' }}>
                  {record.leftAt ? formatDate(record.leftAt) : <Typography variant="body2" component="span" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Present</Typography>}
                </TableCell>
                
                {/* Status */}
                <TableCell sx={{ pr: 3 }}>
                  <Chip 
                    label={isActive ? 'Active' : 'Inactive'} 
                    size="small"
                    color={isActive ? 'success' : 'default'}
                    sx={{ 
                      fontWeight: 700, 
                      fontSize: '0.75rem',
                      height: 24,
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#10b981' : 'text.secondary',
                      border: isActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MembershipHistory;

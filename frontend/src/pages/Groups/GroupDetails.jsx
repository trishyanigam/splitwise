import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  IconButton, 
  CircularProgress, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { toast } from 'react-hot-toast';
import { getGroupById, updateGroup, deleteGroup } from '../../services/groupService.js';

export const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Dialog States
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGroupById(groupId);
      if (data && data.group) {
        setGroup(data.group);
      } else {
        setError('Group details could not be found.');
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  // Handle Edit Action
  const handleEditClick = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Group name is required.');
      return;
    }

    try {
      setEditLoading(true);
      const data = await updateGroup(groupId, {
        name: editName.trim(),
        description: editDescription.trim() || null
      });

      if (data && data.group) {
        // Update local state with the updated group (and preserve owner details)
        setGroup({
          ...data.group,
          owner: group.owner // Preserve the owner object
        });
        toast.success('Group updated successfully.');
        setEditOpen(false);
      }
    } catch (err) {
      console.error('Failed to update group:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update group.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Action
  const handleDeleteClick = () => {
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteGroup(groupId);
      toast.success('Group deleted successfully.');
      navigate('/groups');
    } catch (err) {
      console.error('Failed to delete group:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete group.');
      setDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/groups')} 
          sx={{ mb: 3 }}
        >
          Back to Groups
        </Button>
        <Alert severity="error">{error || 'Group not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Navigation & Action Controls Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton 
            onClick={() => navigate('/groups')}
            sx={{ 
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: 'text.primary'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              {group.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Group Management Dashboard
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditClick}
            sx={{ fontWeight: 600 }}
          >
            Edit Group
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            sx={{ fontWeight: 600 }}
          >
            Delete Group
          </Button>
        </Box>
      </Box>

      {/* Main Grid Layout */}
      <Grid container spacing={4}>
        {/* Left Column: Group Meta Information Details */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* General Description Card */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  About Group
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                  {group.description || 'No description provided for this group.'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Date Created info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', mb: 2 }}>
                  <CalendarTodayIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                      Created Date
                    </Typography>
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                      {formatDate(group.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Owner Details Card */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Group Owner
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
                    {group.owner?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                      {group.owner?.name || 'Unknown User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {group.owner?.email || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          </Box>
        </Grid>

        {/* Right Column: Placeholders for Members, Expenses, Balances */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            {/* Members Placeholder Section */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                backgroundColor: 'background.paper', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '16px' 
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <GroupIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Members
                  </Typography>
                </Box>
                <Button size="small" variant="text" color="primary" disabled sx={{ fontWeight: 600 }}>
                  + Add Member
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List sx={{ p: 0 }}>
                {/* Always include owner as a member */}
                <ListItem sx={{ px: 0, py: 1 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 36, height: 36 }}>
                      {group.owner?.name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={group.owner?.name || 'Owner'} 
                    secondary="Group Owner" 
                    primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                  />
                </ListItem>
              </List>
              
              <Box sx={{ mt: 2, p: 2.5, border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '10px', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No other members in this group yet. Add friends to start splitting bills!
                </Typography>
              </Box>
            </Paper>

            {/* Expenses Placeholder Section */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                backgroundColor: 'background.paper', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '16px' 
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ReceiptLongIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Expenses
                  </Typography>
                </Box>
                <Button size="small" variant="text" color="primary" disabled sx={{ fontWeight: 600 }}>
                  + Add Expense
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No expenses split in this group yet. Track bills here to split them evenly.
                </Typography>
              </Box>
            </Paper>

            {/* Balances Placeholder Section */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                backgroundColor: 'background.paper', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '16px' 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AccountBalanceIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Balances Summary
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  All balances are settled up!
                </Typography>
              </Box>
            </Paper>

          </Box>
        </Grid>
      </Grid>

      {/* Edit Group Info Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={() => !editLoading && setEditOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#111827',
              backgroundImage: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: 1,
              minWidth: { xs: '90%', sm: 450 }
            }
          }
        }}
      >
        <form onSubmit={handleEditSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Group Details</DialogTitle>
          <DialogContent sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="Group Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                fullWidth
                variant="outlined"
                disabled={editLoading}
                autoFocus
              />
              <TextField
                label="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                disabled={editLoading}
                placeholder="Optional description of the group"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button 
              onClick={() => setEditOpen(false)} 
              disabled={editLoading}
              variant="text"
              sx={{ color: 'text.secondary' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={editLoading}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleteLoading && setDeleteOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#111827',
              backgroundImage: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: 1,
              minWidth: { xs: '90%', sm: 400 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Delete Group</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography variant="body1">
            Are you sure you want to delete the group <strong>{group?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 500 }}>
            This action is permanent. All expenses, balances, and details associated with this group will be deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button 
            onClick={() => setDeleteOpen(false)} 
            disabled={deleteLoading}
            variant="text"
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupDetails;

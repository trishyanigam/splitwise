import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  IconButton, 
  CircularProgress, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Tooltip,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { getGroups, updateGroup, deleteGroup } from '../../services/groupService.js';
import { toast } from 'react-hot-toast';

export const GroupsList = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for Edit Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // States for Delete Dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch groups on component mount
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGroups();
      if (data && data.groups) {
        setGroups(data.groups);
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Handle opening Edit Dialog
  const handleEditClick = (group) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditOpen(true);
  };

  // Handle submitting Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Group name is required.');
      return;
    }

    try {
      setEditLoading(true);
      const data = await updateGroup(editingGroup.id, {
        name: editName.trim(),
        description: editDescription.trim() || null
      });

      if (data && data.group) {
        // Update local state
        setGroups(groups.map(g => g.id === editingGroup.id ? data.group : g));
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

  // Handle opening Delete Confirmation Dialog
  const handleDeleteClick = (group) => {
    setDeletingGroup(group);
    setDeleteOpen(true);
  };

  // Handle executing Group Deletion
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteGroup(deletingGroup.id);
      
      // Update local state
      setGroups(groups.filter(g => g.id !== deletingGroup.id));
      toast.success('Group deleted successfully.');
      setDeleteOpen(false);
    } catch (err) {
      console.error('Failed to delete group:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete group.');
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

  return (
    <Box>
      {/* Top Header Segment */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
            Groups
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Manage and view all your shared expense groups.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/groups/create')}
          sx={{ fontWeight: 700 }}
        >
          Create Group
        </Button>
      </Box>

      {/* Main Content Area */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : groups.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0) 100%)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <GroupIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No Groups Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            You aren't a member of any expense groups yet. Create a group to start splitting expenses with friends!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/groups/create')}
          >
            Create Your First Group
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'rgba(16, 185, 129, 0.1)', 
                        color: 'primary.main',
                        width: 48,
                        height: 48
                      }}
                    >
                      <GroupIcon />
                    </Avatar>
                    <Typography 
                      variant="h6" 
                      component="h2" 
                      noWrap 
                      sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
                    >
                      {group.name}
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 3, 
                      height: 40, 
                      overflow: 'hidden', 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4
                    }}
                  >
                    {group.description || 'No description provided.'}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <CalendarTodayIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Created {formatDate(group.createdAt)}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: 'space-between' }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    sx={{ borderRadius: '6px', py: 0.5 }}
                  >
                    View
                  </Button>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Edit Group">
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => handleEditClick(group)}
                        sx={{ 
                          border: '1px solid rgba(99, 102, 241, 0.2)', 
                          borderRadius: '6px',
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.08)'
                          }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Group">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(group)}
                        sx={{ 
                          border: '1px solid rgba(239, 68, 68, 0.2)', 
                          borderRadius: '6px',
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.08)'
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Group Dialog */}
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
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Edit Group</DialogTitle>
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
            Are you sure you want to delete the group <strong>{deletingGroup?.name}</strong>?
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

export default GroupsList;

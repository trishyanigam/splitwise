import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
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
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import { toast } from 'react-hot-toast';
import { getGroupById } from '../../services/groupService.js';
import { getMembers, removeMember } from '../../services/membershipService.js';
import { AddMemberDialog } from '../../components/AddMemberDialog.jsx';
import { MembershipHistory } from '../../components/MembershipHistory.jsx';

export const MembersPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Member Dialog States
  const [addOpen, setAddOpen] = useState(false);

  // History Dialog States
  const [historyOpen, setHistoryOpen] = useState(false);

  // Remove Member Dialog States
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch group details and active members list in parallel
      const [groupRes, membersRes] = await Promise.all([
        getGroupById(groupId),
        getMembers(groupId)
      ]);

      if (groupRes && groupRes.group) {
        setGroup(groupRes.group);
      }
      if (membersRes && membersRes.members) {
        setMembers(membersRes.members);
      }
    } catch (err) {
      console.error('Failed to load members page data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve page data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);



  // Handle Remove Member Click
  const handleRemoveClick = (member) => {
    setRemovingMember(member);
    setRemoveOpen(true);
  };

  // Handle Executing Member Removal
  const handleRemoveConfirm = async () => {
    try {
      setRemoveLoading(true);
      await removeMember(groupId, removingMember.userId);
      toast.success('Member removed successfully.');
      
      // Update local members state
      setMembers(members.filter(m => m.id !== removingMember.id));
      setRemoveOpen(false);
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to remove member.');
    } finally {
      setRemoveLoading(false);
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
          onClick={() => navigate(`/groups/${groupId}`)} 
          sx={{ mb: 3 }}
        >
          Back to Group
        </Button>
        <Alert severity="error">{error || 'Group details not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Top Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton 
            onClick={() => navigate(`/groups/${groupId}`)}
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
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
              Members
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Managing members for <strong>{group.name}</strong>
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setHistoryOpen(true)}
            sx={{ 
              fontWeight: 700,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }
            }}
          >
            View History
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ fontWeight: 700 }}
          >
            Add Member
          </Button>
        </Box>
      </Box>

      {/* Members List Table Card */}
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0} sx={{ backgroundColor: 'transparent' }}>
            <Table aria-label="members table">
              <TableHead sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, pl: 3 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Joined Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => {
                  const isOwner = member.userId === group.ownerId;
                  return (
                    <TableRow 
                      key={member.id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.01)' }
                      }}
                    >
                      {/* Name Column */}
                      <TableCell sx={{ pl: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: isOwner ? 'primary.main' : 'rgba(255, 255, 255, 0.05)', color: isOwner ? 'primary.contrastText' : 'text.primary', width: 32, height: 32 }}>
                            {isOwner ? <StarIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              {member.user?.name}
                              {isOwner && (
                                <Box component="span" sx={{ fontSize: '10px', color: 'primary.main', bgcolor: 'rgba(16, 185, 129, 0.1)', px: 0.8, py: 0.2, borderRadius: '4px', ml: 1, fontWeight: 800 }}>
                                  OWNER
                                </Box>
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      {/* Email Column */}
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {member.user?.email}
                      </TableCell>
                      
                      {/* Joined Date Column */}
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {formatDate(member.joinedAt)}
                      </TableCell>
                      
                      {/* Actions Column */}
                      <TableCell align="right" sx={{ pr: 3 }}>
                        {isOwner ? (
                          <Tooltip title="The group owner cannot be removed">
                            <span>
                              <Button 
                                size="small" 
                                color="error" 
                                disabled
                                sx={{ borderRadius: '6px' }}
                              >
                                Owner
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleRemoveClick(member)}
                            sx={{ 
                              borderRadius: '6px', 
                              py: 0.5, 
                              borderColor: 'rgba(239, 68, 68, 0.2)',
                              '&:hover': {
                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                borderColor: 'error.main'
                              }
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Reusable Add Member Dialog */}
      <AddMemberDialog 
        open={addOpen} 
        onClose={() => setAddOpen(false)} 
        groupId={groupId} 
        onSuccess={fetchData} 
      />

      {/* Remove Member Dialog */}
      <Dialog
        open={removeOpen}
        onClose={() => !removeLoading && setRemoveOpen(false)}
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
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Remove Member</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography variant="body1">
            Are you sure you want to remove <strong>{removingMember?.user?.name}</strong> from this group?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            They will no longer be an active member, but their historical group membership records will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button 
            onClick={() => setRemoveOpen(false)} 
            disabled={removeLoading}
            variant="text"
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRemoveConfirm} 
            variant="contained" 
            color="error"
            disabled={removeLoading}
          >
            {removeLoading ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Membership History Dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#111827',
              backgroundImage: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: 1.5,
              minWidth: { xs: '90%', sm: 600 }
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Membership History</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Box sx={{ mt: 1 }}>
            <MembershipHistory groupId={groupId} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button 
            onClick={() => setHistoryOpen(false)} 
            variant="contained"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MembersPage;

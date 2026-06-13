import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Typography,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { addMember } from '../services/membershipService.js';

/**
 * Reusable AddMemberDialog component using Material UI.
 * Submits membership creation with validation using Axios (membershipService).
 * 
 * Props:
 * @param {boolean} open - Dialog display visibility state
 * @param {function} onClose - Triggers when closing dialog
 * @param {number|string} groupId - Target group context ID
 * @param {function} onSuccess - Callback when member added successfully
 */
export const AddMemberDialog = ({ open, onClose, groupId, onSuccess }) => {
  const [userIdInput, setUserIdInput] = useState('');
  const [joinDateInput, setJoinDateInput] = useState(new Date().toISOString().substring(0, 10)); // Default to today (YYYY-MM-DD)
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedUserId = parseInt(userIdInput, 10);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      toast.error('Please enter a valid User ID.');
      return;
    }

    if (!joinDateInput) {
      toast.error('Join date is required.');
      return;
    }

    try {
      setSubmitting(true);
      // Calls the Axios API wrapper passing target date
      const response = await addMember(groupId, parsedUserId, joinDateInput);
      if (response && response.member) {
        toast.success('Member added successfully!');
        if (onSuccess) onSuccess(response.member);
        handleClose();
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to add member.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setUserIdInput('');
    setJoinDateInput(new Date().toISOString().substring(0, 10));
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
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
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Add Group Member</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter User details and joining date to add them to this group.
            </Typography>
            
            {/* User ID Field */}
            <TextField
              label="User ID"
              type="number"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              required
              fullWidth
              variant="outlined"
              disabled={submitting}
              autoFocus
              slotProps={{
                htmlInput: { min: 1 }
              }}
              placeholder="e.g. 2"
            />

            {/* Join Date Field */}
            <TextField
              label="Join Date"
              type="date"
              value={joinDateInput}
              onChange={(e) => setJoinDateInput(e.target.value)}
              required
              fullWidth
              variant="outlined"
              disabled={submitting}
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={submitting}
            variant="text"
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={submitting}
            sx={{ minWidth: 100 }}
          >
            {submitting ? (
              <CircularProgress size={24} sx={{ color: '#0f172a' }} />
            ) : (
              'Add Member'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddMemberDialog;

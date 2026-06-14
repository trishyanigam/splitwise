import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Autocomplete,
  Avatar,
} from '@mui/material';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { toast } from 'react-hot-toast';
import { addMember } from '../services/membershipService.js';
import { getUsers } from '../services/authService.js';

/**
 * AddMemberDialog — searchable user dropdown variant.
 *
 * Replaces the old numeric User ID text input with a MUI Autocomplete
 * that fetches all registered users from the API and lets the admin
 * search by name or email. The selected user's ID is stored internally
 * and submitted on form submission.
 *
 * Props:
 * @param {boolean}          open      – Dialog open state
 * @param {function}         onClose   – Called when dialog should close
 * @param {number|string}    groupId   – Target group ID
 * @param {function}         onSuccess – Called with the new member record on success
 */
export const AddMemberDialog = ({ open, onClose, groupId, onSuccess }) => {
  // ── User list state ───────────────────────────────────────────────────────
  const [users,        setUsers]        = useState([]);   // all registered users
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError,   setUsersError]   = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState(null); // { id, name, email }
  const [joinDateInput, setJoinDateInput] = useState(
    new Date().toISOString().substring(0, 10)             // default: today
  );
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch users when dialog opens ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);
        const data = await getUsers();
        setUsers(data?.users ?? []);
      } catch (err) {
        console.error('Failed to load users:', err);
        setUsersError('Could not load user list. Please try again.');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [open]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error('Please select a user from the dropdown.');
      return;
    }

    if (!joinDateInput) {
      toast.error('Join date is required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await addMember(groupId, selectedUser.id, joinDateInput);
      if (response?.member) {
        toast.success(`${selectedUser.name} added to the group.`);
        if (onSuccess) onSuccess(response.member);
        handleClose();
      }
    } catch (err) {
      console.error('Failed to add member:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to add member.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Close / reset ─────────────────────────────────────────────────────────
  const handleClose = () => {
    if (submitting) return;
    setSelectedUser(null);
    setJoinDateInput(new Date().toISOString().substring(0, 10));
    setUsersError(null);
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor:  '#111827',
            backgroundImage:  'none',
            border:           '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius:     '16px',
            p:                1,
            minWidth:         { xs: '90%', sm: 440 },
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Add Group Member</DialogTitle>

        <DialogContent sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Search for a registered user by name or email, then set their join date.
            </Typography>

            {/* ── User search Autocomplete ──────────────────────────────── */}
            <Autocomplete
              id="add-member-user-select"
              options={users}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              loading={usersLoading}
              disabled={submitting}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              getOptionLabel={(option) => option.name ?? ''}
              filterOptions={(options, { inputValue }) => {
                const q = inputValue.toLowerCase().trim();
                if (!q) return options;
                return options.filter(
                  (u) =>
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q)
                );
              }}
              noOptionsText={
                usersError
                  ? 'Failed to load users'
                  : 'No users found'
              }
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  key={option.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
                >
                  <Avatar
                    sx={{
                      width:           32,
                      height:          32,
                      fontSize:        '0.8rem',
                      fontWeight:      700,
                      backgroundColor: '#6366f133',
                      color:           '#818cf8',
                      flexShrink:      0,
                    }}
                  >
                    {option.name?.[0]?.toUpperCase() ?? <PersonOutlinedIcon sx={{ fontSize: 16 }} />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                      {option.email}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => {
                const inputProps = params.InputProps || params.slotProps?.input || {};
                const endAdornment = (
                  <>
                    {usersLoading && (
                      <CircularProgress color="primary" size={16} sx={{ mr: 1 }} />
                    )}
                    {inputProps.endAdornment}
                  </>
                );

                if (params.slotProps?.input) {
                  params.slotProps.input.endAdornment = endAdornment;
                } else {
                  params.InputProps = {
                    ...params.InputProps,
                    endAdornment,
                  };
                }

                return (
                  <TextField
                    {...params}
                    label="Search user"
                    placeholder="Type a name or email…"
                    variant="outlined"
                    required
                    autoFocus
                    error={Boolean(usersError)}
                    helperText={usersError ?? undefined}
                  />
                );
              }}
            />

            {/* ── Selected user preview chip ────────────────────────────── */}
            {selectedUser && (
              <Box
                sx={{
                  display:         'flex',
                  alignItems:      'center',
                  gap:             1.5,
                  px:              2,
                  py:              1.25,
                  borderRadius:    '10px',
                  backgroundColor: 'rgba(99,102,241,0.08)',
                  border:          '1px solid rgba(99,102,241,0.2)',
                }}
              >
                <Avatar
                  sx={{
                    width:           34,
                    height:          34,
                    fontSize:        '0.85rem',
                    fontWeight:      700,
                    backgroundColor: '#6366f133',
                    color:           '#818cf8',
                    flexShrink:      0,
                  }}
                >
                  {selectedUser.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {selectedUser.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedUser.email}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* ── Join date ─────────────────────────────────────────────── */}
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
                inputLabel: { shrink: true },
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
            disabled={submitting || !selectedUser}
            sx={{ minWidth: 120 }}
          >
            {submitting ? (
              <CircularProgress size={22} sx={{ color: '#0f172a' }} />
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

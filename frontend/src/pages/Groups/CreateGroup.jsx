import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  Typography, 
  CircularProgress,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-hot-toast';
import { createGroup } from '../../services/groupService.js';

export const CreateGroup = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      description: ''
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const resData = await createGroup(data.name.trim(), data.description.trim() || null);

      if (resData && resData.group) {
        toast.success('Group created successfully!');
        navigate('/groups');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to create group. Please check fields.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {/* Back navigation & Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 1.5 }}>
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
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            Create New Group
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up a new shared expense space
          </Typography>
        </Box>
      </Box>

      {/* Main card containing form fields */}
      <Card sx={{ p: 1 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Group Name input field */}
            <TextField
              required
              fullWidth
              id="name"
              label="Group Name"
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={submitting}
              autoFocus
              {...register('name', {
                required: 'Group name is required',
                validate: {
                  isNotEmpty: (value) => value.trim() !== '' || 'Group name cannot be blank'
                }
              })}
            />

            {/* Description input field */}
            <TextField
              fullWidth
              id="description"
              label="Description"
              multiline
              rows={4}
              placeholder="Provide an optional details summary for this group..."
              disabled={submitting}
              error={!!errors.description}
              helperText={errors.description?.message}
              {...register('description')}
            />

            {/* Form actions panel */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
              <Button
                variant="text"
                onClick={() => navigate('/groups')}
                disabled={submitting}
                sx={{ color: 'text.secondary' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                sx={{ minWidth: 140, fontWeight: 700 }}
              >
                {submitting ? (
                  <CircularProgress size={24} sx={{ color: '#0f172a' }} />
                ) : (
                  'Create Group'
                )}
              </Button>
            </Box>

          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateGroup;

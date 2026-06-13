import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  MergeType as MergeIcon,
  RateReview as RateReviewIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

/**
 * Reusable premium Review Summary dashboard component.
 * Displays metrics cards for staging imports reviews:
 * - Total Anomalies
 * - Approved
 * - Rejected
 * - Merged
 * - Pending Review
 *
 * Supports hover scaling animations, custom gradients, and optional actions.
 */
export const ReviewSummary = ({
  totalAnomalies = 0,
  approved = 0,
  rejected = 0,
  merged = 0,
  pendingReview = 0,
  onActionClick = null,
  actionText = 'View Details'
}) => {
  // Definition for each review status metric card
  const metrics = [
    {
      title: 'Total Anomalies',
      value: totalAnomalies,
      subtitle: 'Total warnings flagged',
      icon: <WarningIcon sx={{ fontSize: 28, color: '#f59e0b' }} />,
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)',
      borderColor: 'rgba(245, 158, 11, 0.22)',
      valueColor: '#fbbf24'
    },
    {
      title: 'Approved',
      value: approved,
      subtitle: 'Marked as acceptable',
      icon: <CheckCircleIcon sx={{ fontSize: 28, color: '#10b981' }} />,
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.22)',
      valueColor: '#34d399'
    },
    {
      title: 'Rejected',
      value: rejected,
      subtitle: 'Skipped on import',
      icon: <CancelIcon sx={{ fontSize: 28, color: '#ef4444' }} />,
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.04) 100%)',
      borderColor: 'rgba(239, 68, 68, 0.22)',
      valueColor: '#f87171'
    },
    {
      title: 'Merged',
      value: merged,
      subtitle: 'Duplicates resolved',
      icon: <MergeIcon sx={{ fontSize: 28, color: '#a855f7' }} />,
      gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(147, 51, 234, 0.04) 100%)',
      borderColor: 'rgba(168, 85, 247, 0.22)',
      valueColor: '#c084fc'
    },
    {
      title: 'Pending Review',
      value: pendingReview,
      subtitle: 'Awaiting reviewer action',
      icon: <RateReviewIcon sx={{ fontSize: 28, color: '#3b82f6' }} />,
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
      borderColor: 'rgba(59, 130, 246, 0.22)',
      valueColor: '#60a5fa'
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(5, 1fr)'
          },
          gap: 3,
          width: '100%'
        }}
      >
        {metrics.map((m) => (
          <Card
            key={m.title}
            elevation={0}
            sx={{
              background: m.gradient,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${m.borderColor}`,
              borderRadius: '16px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 20px ${m.borderColor.replace('0.22', '0.08')}`
              }
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box sx={{ pr: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontSize: '0.7rem',
                      lineHeight: 1.2
                    }}
                  >
                    {m.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      display: 'block',
                      mt: 0.5,
                      lineHeight: 1.2
                    }}
                  >
                    {m.subtitle}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 0.75,
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {m.icon}
                </Box>
              </Stack>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: m.valueColor,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontFamily: '"Outfit", "Inter", sans-serif'
                }}
              >
                {m.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Action Segment if onActionClick callback is supplied */}
      {onActionClick && (
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <Button
            variant="contained"
            onClick={onActionClick}
            endIcon={<ArrowForwardIcon />}
            sx={{
              background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: '10px',
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(90deg, #4f46e5, #4338ca)',
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)'
              }
            }}
          >
            {actionText}
          </Button>
        </Box>
      )}
    </Box>
  );
};

ReviewSummary.propTypes = {
  totalAnomalies: PropTypes.number,
  approved: PropTypes.number,
  rejected: PropTypes.number,
  merged: PropTypes.number,
  pendingReview: PropTypes.number,
  onActionClick: PropTypes.func,
  actionText: PropTypes.string
};

export default ReviewSummary;

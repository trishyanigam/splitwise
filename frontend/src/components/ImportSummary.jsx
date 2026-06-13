import React from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  useTheme,
  Button
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  RateReview as RateReviewIcon,
  Dangerous as DangerousIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

/**
 * Reusable premium Import Summary dashboard component.
 * Displays metrics cards for staging imports:
 * - Rows Processed
 * - Valid Rows
 * - Rows Requiring Review
 * - Critical Issues
 *
 * Support hover scale animations, custom gradients, and optional actions.
 */
export const ImportSummary = ({
  rowsProcessed = 0,
  validRows = 0,
  rowsRequiringReview = 0,
  criticalIssues = 0,
  onActionClick = null,
  actionText = 'Review Anomalies'
}) => {
  const theme = useTheme();

  // Definition for each metric card
  const metrics = [
    {
      title: 'Rows Processed',
      value: rowsProcessed,
      subtitle: 'Total records parsed',
      icon: <AssignmentIcon sx={{ fontSize: 28, color: '#a78bfa' }} />,
      gradient: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
      borderColor: 'rgba(167, 139, 250, 0.25)',
      valueColor: '#c084fc'
    },
    {
      title: 'Valid Rows',
      value: validRows,
      subtitle: 'Ready to commit to ledger',
      icon: <CheckCircleIcon sx={{ fontSize: 28, color: '#34d399' }} />,
      gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
      borderColor: 'rgba(52, 211, 153, 0.25)',
      valueColor: '#34d399'
    },
    {
      title: 'Requiring Review',
      value: rowsRequiringReview,
      subtitle: 'Duplicate or warning rows',
      icon: <RateReviewIcon sx={{ fontSize: 28, color: '#fbbf24' }} />,
      gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
      borderColor: 'rgba(251, 191, 36, 0.25)',
      valueColor: '#fbbf24'
    },
    {
      title: 'Critical Issues',
      value: criticalIssues,
      subtitle: 'Errors skipping on import',
      icon: <DangerousIcon sx={{ fontSize: 28, color: '#f87171' }} />,
      gradient: 'linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
      borderColor: 'rgba(248, 113, 113, 0.25)',
      valueColor: '#f87171'
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {metrics.map((m) => (
          <Grid item xs={12} sm={6} md={3} key={m.title}>
            <Card
              elevation={0}
              sx={{
                background: m.gradient,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${m.borderColor}`,
                borderRadius: '16px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 20px ${m.borderColor.replace('0.25', '0.1')}`
                }
              }}
            >
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.72rem'
                      }}
                    >
                      {m.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        display: 'block',
                        mt: 0.25
                      }}
                    >
                      {m.subtitle}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {m.icon}
                  </Box>
                </Stack>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    color: m.valueColor,
                    letterSpacing: '-0.03em',
                    lineHeight: 1
                  }}
                >
                  {m.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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

ImportSummary.propTypes = {
  rowsProcessed: PropTypes.number,
  validRows: PropTypes.number,
  rowsRequiringReview: PropTypes.number,
  criticalIssues: PropTypes.number,
  onActionClick: PropTypes.func,
  actionText: PropTypes.string
};

export default ImportSummary;

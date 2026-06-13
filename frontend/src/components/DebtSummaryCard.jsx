import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Divider
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * DebtSummaryCard displays the debt optimization summary statistics
 * comparing original transaction count vs simplified outcomes.
 */
export const DebtSummaryCard = ({
  totalMembers,
  rawTransactionsCount,
  simplifiedTransactionsCount
}) => {
  // Calculate transaction reduction percentage
  const reductionPercentage = rawTransactionsCount > 0
    ? Math.max(0, Math.round(((rawTransactionsCount - simplifiedTransactionsCount) / rawTransactionsCount) * 100))
    : 0;

  const statItems = [
    {
      label: 'Total Members',
      value: totalMembers,
      icon: <GroupIcon color="primary" />
    },
    {
      label: 'Raw Transactions',
      value: rawTransactionsCount,
      icon: <ReceiptLongIcon color="disabled" />
    },
    {
      label: 'Simplified Debts',
      value: simplifiedTransactionsCount,
      icon: <ElectricBoltIcon color="secondary" />
    },
    {
      label: 'Reduction Rate',
      value: `${reductionPercentage}%`,
      icon: <TrendingDownIcon sx={{ color: '#10b981' }} />,
      highlight: true
    }
  ];

  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.7) 0%, rgba(17, 24, 39, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Simplification Summary
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {statItems.map((item) => (
            <Grid item xs={6} sm={3} key={item.label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                    {item.label}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: item.highlight ? '#10b981' : 'text.primary',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.05)' }} />

        {/* Visual progress bar of optimization */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Transaction Reduction Effectiveness
            </Typography>
            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 700 }}>
              {reductionPercentage}% Less Transfers
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={reductionPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
              }
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

DebtSummaryCard.propTypes = {
  totalMembers: PropTypes.number.isRequired,
  rawTransactionsCount: PropTypes.number.isRequired,
  simplifiedTransactionsCount: PropTypes.number.isRequired
};

export default DebtSummaryCard;

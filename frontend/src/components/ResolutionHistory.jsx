import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Stack,
  CircularProgress,
  List,
  ListItem,
  Divider,
  useTheme
} from '@mui/material';
import {
  History as HistoryIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  SwapHoriz as SwapHorizIcon,
  TaskAlt as SuccessIcon,
  Notes as NotesIcon
} from '@mui/icons-material';

// Mapping color styles for resolution types
const TYPE_COLORS = {
  APPROVED: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  MERGED: { label: 'Merged', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  CONVERT_TO_SETTLEMENT: { label: 'Converted to Settlement', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  CONVERT_TO_REFUND: { label: 'Converted to Refund', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  MANUAL_CORRECTION: { label: 'Manual Correction', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' }
};

/**
 * Helper to display diffs between original and resolved JSON values.
 */
const ValueDiff = ({ original, resolved }) => {
  if (!original || !resolved) return null;

  // Gather all unique keys from both objects
  const allKeys = Array.from(new Set([...Object.keys(original), ...Object.keys(resolved)]));
  
  // Filter down to fields that actually changed
  const changes = allKeys.filter(key => {
    const origVal = original[key] !== undefined ? String(original[key]) : '';
    const resVal = resolved[key] !== undefined ? String(resolved[key]) : '';
    return origVal !== resVal;
  });

  if (changes.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
        No field changes applied (record state marked as is).
      </Typography>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        mt: 1
      }}
    >
      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.8 }}>
        Field Value Modifications:
      </Typography>
      {changes.map(key => {
        const origVal = original[key] !== undefined ? String(original[key]) : '—';
        const resVal = resolved[key] !== undefined ? String(resolved[key]) : '—';

        return (
          <Stack key={key} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#818cf8',
                fontFamily: 'monospace',
                fontWeight: 600,
                minWidth: 70,
                textTransform: 'capitalize'
              }}
            >
              {key}:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#ef4444',
                textDecoration: 'line-through',
                bgcolor: 'rgba(239, 68, 68, 0.08)',
                px: 0.5,
                borderRadius: 0.5
              }}
            >
              {origVal}
            </Typography>
            <SwapHorizIcon sx={{ fontSize: 14, color: '#64748b' }} />
            <Typography
              variant="caption"
              sx={{
                color: '#10b981',
                fontWeight: 600,
                bgcolor: 'rgba(16, 185, 129, 0.08)',
                px: 0.5,
                borderRadius: 0.5
              }}
            >
              {resVal}
            </Typography>
          </Stack>
        );
      })}
    </Paper>
  );
};

ValueDiff.propTypes = {
  original: PropTypes.object,
  resolved: PropTypes.object
};

/**
 * Reusable Resolution History Component.
 * Displays a styled audit trail timeline of resolutions applied to an anomaly.
 */
export const ResolutionHistory = ({
  history = [],
  loading = false,
  reviewedBy = '',
  resolutionNotes = '',
  emptyMessage = 'No resolution log history available.'
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
        <CircularProgress size={30} thickness={4.5} sx={{ color: '#6366f1' }} />
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Retrieving audit history...
        </Typography>
      </Box>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <HistoryIcon sx={{ color: '#334155', fontSize: 48, mb: 1.5 }} />
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Optional Metadata Header (Reviewer Summary) */}
      {(reviewedBy || resolutionNotes) && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'rgba(99, 102, 241, 0.04)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: 3
          }}
        >
          <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1.2 }}>
            Current Resolution Context
          </Typography>
          <Stack spacing={1}>
            {reviewedBy && (
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon sx={{ fontSize: 16, color: '#64748b' }} />
                <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                  Last reviewed by: <strong>{reviewedBy}</strong>
                </Typography>
              </Stack>
            )}
            {resolutionNotes && (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <NotesIcon sx={{ fontSize: 16, color: '#64748b', mt: 0.2 }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Notes: "{resolutionNotes}"
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {/* Audit Logs List */}
      <List sx={{ p: 0 }}>
        {history.map((log, index) => {
          const typeCfg = TYPE_COLORS[log.resolutionType] || {
            label: log.resolutionType,
            color: '#94a3b8',
            bg: 'rgba(148, 163, 184, 0.12)'
          };

          return (
            <ListItem
              key={log.id}
              disableGutters
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                py: 2,
                '&:first-of-type': { pt: 0 },
                '&:last-of-type': { pb: 0 }
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" width="100%" mb={1.2}>
                <Chip
                  icon={<SuccessIcon sx={{ fontSize: '12px !important', color: `${typeCfg.color} !important` }} />}
                  label={typeCfg.label}
                  size="small"
                  sx={{
                    bgcolor: typeCfg.bg,
                    color: typeCfg.color,
                    border: `1px solid ${typeCfg.color}33`,
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    height: 22
                  }}
                />
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#64748b', ml: 'auto' }}>
                  <AccessTimeIcon sx={{ fontSize: 12 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>

              {/* Diff view */}
              <ValueDiff original={log.originalValue} resolved={log.resolvedValue} />

              {index < history.length - 1 && (
                <Divider sx={{ width: '100%', mt: 2.5, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

ResolutionHistory.propTypes = {
  history: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      resolutionType: PropTypes.string.isRequired,
      originalValue: PropTypes.object,
      resolvedValue: PropTypes.object,
      createdAt: PropTypes.string.isRequired
    })
  ),
  loading: PropTypes.bool,
  reviewedBy: PropTypes.string,
  resolutionNotes: PropTypes.string,
  emptyMessage: PropTypes.string
};

export default ResolutionHistory;

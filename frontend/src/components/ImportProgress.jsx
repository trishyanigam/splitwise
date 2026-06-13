import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  LinearProgress,
  Stack,
  Chip,
  Grid,
  CircularProgress,
  Divider
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SyncIcon from '@mui/icons-material/Sync';
import CancelIcon from '@mui/icons-material/Cancel';

/** Returns a MUI color name for each execution status */
const getStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'RUNNING':   return 'primary';
    case 'PENDING':   return 'warning';
    case 'FAILED':    return 'error';
    default:          return 'default';
  }
};

/** Returns the icon for each execution status */
const StatusIcon = ({ status, size = 18 }) => {
  const iconSx = { fontSize: size };
  switch (status) {
    case 'COMPLETED': return <DoneAllIcon   sx={{ ...iconSx, color: '#34d399' }} />;
    case 'RUNNING':   return <SyncIcon      sx={{ ...iconSx, color: '#10b981', animation: 'spin 1.4s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />;
    case 'PENDING':   return <HourglassEmptyIcon sx={{ ...iconSx, color: '#fbbf24' }} />;
    case 'FAILED':    return <CancelIcon    sx={{ ...iconSx, color: '#f87171' }} />;
    default:          return <HourglassEmptyIcon sx={{ ...iconSx, color: '#9ca3af' }} />;
  }
};

/**
 * Reusable ImportProgress component.
 *
 * Props:
 *  - execution  {Object|null}  – The execution record from the backend (or null if not started).
 *  - isRunning  {boolean}      – Whether the execution is actively in progress.
 *  - compact    {boolean}      – Renders a condensed single-row layout (default: false).
 */
export const ImportProgress = ({ execution = null, isRunning = false, compact = false }) => {
  // Derived values
  const total      = execution?.totalRecords   ?? 0;
  const imported   = execution?.importedRecords ?? 0;
  const skipped    = execution?.skippedRecords  ?? 0;
  const failed     = execution?.failedRecords   ?? 0;
  const status     = execution?.executionStatus ?? (isRunning ? 'RUNNING' : 'PENDING');
  const processed  = imported + skipped + failed;
  const pct        = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : (isRunning ? 0 : 0);

  const elapsedMs =
    execution?.completedAt && execution?.startedAt
      ? new Date(execution.completedAt) - new Date(execution.startedAt)
      : null;

  const formatElapsed = (ms) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  // ─── Compact layout ───────────────────────────────────────────────────────
  if (compact) {
    return (
      <Box
        sx={{
          p: 2.5,
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            {isRunning && <CircularProgress size={14} color="primary" />}
            <StatusIcon status={status} size={16} />
            <Typography variant="body2" fontWeight={700} color={status === 'COMPLETED' ? 'primary.main' : 'text.primary'}>
              {status === 'COMPLETED' ? 'Import Complete' : status === 'FAILED' ? 'Import Failed' : 'Running…'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {pct}%
            </Typography>
            <Chip label={status} size="small" color={getStatusColor(status)} sx={{ fontWeight: 800, fontSize: '10px', height: 20 }} />
          </Stack>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.05)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: status === 'FAILED'
                ? 'linear-gradient(90deg, #f87171, #ef4444)'
                : 'linear-gradient(90deg, #10b981, #34d399)'
            }
          }}
        />
        <Stack direction="row" spacing={3} mt={1.5}>
          {[
            { label: 'Imported', value: imported, color: '#34d399' },
            { label: 'Skipped',  value: skipped,  color: '#fbbf24' },
            { label: 'Failed',   value: failed,   color: '#f87171' }
          ].map(({ label, value, color }) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
              <Typography variant="body2" fontWeight={800} sx={{ color }}>{value}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  // ─── Full layout ─────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden'
      }}
    >
      {/* ── Header bar ── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isRunning && <CircularProgress size={16} color="primary" sx={{ flexShrink: 0 }} />}
            <StatusIcon status={status} size={20} />
            <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.02em">
              {status === 'COMPLETED' ? 'Import Completed' :
               status === 'FAILED'    ? 'Import Failed' :
               status === 'RUNNING'   ? 'Importing Records…' :
                                        'Awaiting Execution'}
            </Typography>
          </Stack>
          <Chip
            label={status}
            size="small"
            color={getStatusColor(status)}
            sx={{ fontWeight: 800, fontSize: '11px' }}
          />
        </Stack>
      </Box>

      {/* ── Progress bar ── */}
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {processed} of {total} records processed
          </Typography>
          <Typography variant="h6" fontWeight={800} color="text.primary" lineHeight={1}>
            {pct}%
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: 'rgba(255,255,255,0.04)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: status === 'FAILED'
                ? 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)'
                : 'linear-gradient(90deg, #10b981 0%, #34d399 60%, #6ee7b7 100%)',
              transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)'
            }
          }}
        />
      </Box>

      {/* ── Stat counters ── */}
      <Grid container sx={{ px: 2, py: 2.5 }} spacing={0}>
        {[
          {
            label:    'Imported',
            value:    imported,
            subtitle: 'Committed to ledger',
            icon:     <CheckCircleOutlineIcon sx={{ fontSize: 22, color: '#34d399' }} />,
            gradient: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.04) 100%)',
            border:   'rgba(52,211,153,0.2)',
            color:    '#34d399'
          },
          {
            label:    'Skipped',
            value:    skipped,
            subtitle: 'Not eligible / review',
            icon:     <SkipNextIcon sx={{ fontSize: 22, color: '#fbbf24' }} />,
            gradient: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(217,119,6,0.04) 100%)',
            border:   'rgba(251,191,36,0.2)',
            color:    '#fbbf24'
          },
          {
            label:    'Failed',
            value:    failed,
            subtitle: 'Encountered errors',
            icon:     <ErrorOutlineIcon sx={{ fontSize: 22, color: '#f87171' }} />,
            gradient: 'linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(220,38,38,0.04) 100%)',
            border:   'rgba(248,113,113,0.2)',
            color:    '#f87171'
          }
        ].map(({ label, value, subtitle, icon, gradient, border, color }, idx, arr) => (
          <Grid item xs={4} key={label}>
            <Box
              sx={{
                mx: 1,
                p: 2,
                borderRadius: '14px',
                background: gradient,
                border: `1px solid ${border}`,
                textAlign: 'center',
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'center' }}>{icon}</Box>
              <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
                {value}
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block', mt: 0.25 }}>
                {label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {subtitle}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ── Footer meta ── */}
      {(execution?.startedAt || elapsedMs !== null) && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ px: 3, py: 1.5 }}
          >
            {execution?.startedAt && (
              <Typography variant="caption" color="text.secondary">
                Started: {new Date(execution.startedAt).toLocaleTimeString()}
              </Typography>
            )}
            {elapsedMs !== null && (
              <Typography variant="caption" color="text.secondary">
                Duration: <strong>{formatElapsed(elapsedMs)}</strong>
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
};

ImportProgress.propTypes = {
  execution: PropTypes.shape({
    executionStatus: PropTypes.string,
    totalRecords:    PropTypes.number,
    importedRecords: PropTypes.number,
    skippedRecords:  PropTypes.number,
    failedRecords:   PropTypes.number,
    startedAt:       PropTypes.string,
    completedAt:     PropTypes.string
  }),
  isRunning: PropTypes.bool,
  compact:   PropTypes.bool
};

export default ImportProgress;

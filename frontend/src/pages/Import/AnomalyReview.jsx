import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  GppBad as CriticalIcon
} from '@mui/icons-material';
import { getSessionAnomalies, updateAnomalyStatus } from '../../services/importService.js';

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: '#450a0a', label: 'Critical', icon: <CriticalIcon fontSize="small" /> },
  HIGH:     { color: '#f97316', bg: '#431407', label: 'High',     icon: <ErrorIcon fontSize="small" /> },
  MEDIUM:   { color: '#eab308', bg: '#422006', label: 'Medium',   icon: <WarningIcon fontSize="small" /> },
  LOW:      { color: '#22c55e', bg: '#052e16', label: 'Low',      icon: <InfoIcon fontSize="small" /> }
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  OPEN:     { color: '#94a3b8', label: 'Open' },
  APPROVED: { color: '#22c55e', label: 'Approved' },
  REJECTED: { color: '#ef4444', label: 'Rejected' },
  FIXED:    { color: '#3b82f6', label: 'Fixed' }
};

// ─── Severity sort order ──────────────────────────────────────────────────────
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function AnomalyReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('ALL');      // ALL | OPEN | APPROVED | REJECTED | FIXED
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Dialog state
  const [dialog, setDialog] = useState({ open: false, anomalyId: null, action: null });
  const [updating, setUpdating] = useState(false);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionAnomalies(sessionId);
      // Sort: severity DESC, then rowNumber ASC
      const sorted = (data.anomalies || []).sort((a, b) => {
        const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return (a.importRecord?.rowNumber ?? 0) - (b.importRecord?.rowNumber ?? 0);
      });
      setAnomalies(sorted);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load anomalies.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // ─── Apply filters ──────────────────────────────────────────────────────────
  const visible = anomalies.filter((a) => {
    const statusOk   = filter === 'ALL'   || a.status === filter;
    const severityOk = severityFilter === 'ALL' || a.severity === severityFilter;
    return statusOk && severityOk;
  });

  // ─── Counts ─────────────────────────────────────────────────────────────────
  const counts = {
    OPEN:     anomalies.filter((a) => a.status === 'OPEN').length,
    APPROVED: anomalies.filter((a) => a.status === 'APPROVED').length,
    REJECTED: anomalies.filter((a) => a.status === 'REJECTED').length,
    FIXED:    anomalies.filter((a) => a.status === 'FIXED').length
  };
  const resolved = counts.APPROVED + counts.REJECTED + counts.FIXED;
  const progress = anomalies.length > 0 ? Math.round((resolved / anomalies.length) * 100) : 0;

  // ─── Dialog handlers ────────────────────────────────────────────────────────
  const openDialog = (anomalyId, action) => setDialog({ open: true, anomalyId, action });
  const closeDialog = () => setDialog({ open: false, anomalyId: null, action: null });

  const confirmAction = async () => {
    if (!dialog.anomalyId || !dialog.action) return;
    setUpdating(true);
    try {
      const result = await updateAnomalyStatus(dialog.anomalyId, dialog.action);
      setAnomalies((prev) =>
        prev.map((a) => (a.id === dialog.anomalyId ? { ...a, status: result.anomaly.status } : a))
      );
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update anomaly status.');
    } finally {
      setUpdating(false);
      closeDialog();
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        p: { xs: 2, md: 4 }
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton
          onClick={() => navigate(`/import/${sessionId}`)}
          sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} color="#f1f5f9">
            Anomaly Review
          </Typography>
          <Typography variant="body2" color="#64748b">
            Session #{sessionId} — Review and resolve flagged issues
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={fetchAnomalies}
            disabled={loading}
            sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Progress summary */}
      {!loading && anomalies.length > 0 && (
        <Paper
          sx={{
            mb: 3,
            p: 3,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
            <Box flex={1}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="#94a3b8">
                  Review Progress
                </Typography>
                <Typography variant="body2" color="#f1f5f9" fontWeight={600}>
                  {resolved} / {anomalies.length} resolved
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
            {/* Status badges */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center">
              {Object.entries(counts).map(([status, count]) => (
                <Chip
                  key={status}
                  label={`${STATUS_CONFIG[status].label}: ${count}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.06)',
                    color: STATUS_CONFIG[status].color,
                    border: `1px solid ${STATUS_CONFIG[status].color}33`,
                    fontWeight: 600,
                    fontSize: '0.72rem'
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ color: '#64748b' }}>Status Filter</InputLabel>
          <Select
            value={filter}
            label="Status Filter"
            onChange={(e) => setFilter(e.target.value)}
            sx={{
              color: '#f1f5f9',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              '.MuiSvgIcon-root': { color: '#94a3b8' }
            }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            {Object.keys(STATUS_CONFIG).map((s) => (
              <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ color: '#64748b' }}>Severity Filter</InputLabel>
          <Select
            value={severityFilter}
            label="Severity Filter"
            onChange={(e) => setSeverityFilter(e.target.value)}
            sx={{
              color: '#f1f5f9',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              '.MuiSvgIcon-root': { color: '#94a3b8' }
            }}
          >
            <MenuItem value="ALL">All Severities</MenuItem>
            {Object.keys(SEVERITY_CONFIG).map((s) => (
              <MenuItem key={s} value={s}>{SEVERITY_CONFIG[s].label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" color="#64748b" alignSelf="center">
          Showing {visible.length} of {anomalies.length} anomalies
        </Typography>
      </Stack>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: '#6366f1' }} />
        </Box>
      )}

      {/* Error */}
      {error && !loading && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3, bgcolor: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' }}
        >
          {error}
        </Alert>
      )}

      {/* No anomalies */}
      {!loading && !error && anomalies.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 3
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 56, color: '#22c55e', mb: 2 }} />
          <Typography variant="h6" color="#f1f5f9" gutterBottom>
            No Anomalies Detected
          </Typography>
          <Typography color="#64748b">
            All records passed validation. You can proceed to import.
          </Typography>
        </Paper>
      )}

      {/* Anomaly cards */}
      {!loading && visible.length > 0 && (
        <Stack spacing={2}>
          {visible.map((anomaly) => {
            const sev = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.MEDIUM;
            const sta = STATUS_CONFIG[anomaly.status]   || STATUS_CONFIG.OPEN;
            const isResolved = anomaly.status !== 'OPEN';

            return (
              <Paper
                key={anomaly.id}
                sx={{
                  p: 3,
                  background: isResolved
                    ? 'rgba(255,255,255,0.02)'
                    : `${sev.bg}66`,
                  border: `1px solid ${isResolved ? 'rgba(255,255,255,0.06)' : sev.color + '44'}`,
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  opacity: isResolved ? 0.7 : 1,
                  '&:hover': { opacity: 1 }
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  {/* Left: info */}
                  <Box flex={1}>
                    {/* Top badges */}
                    <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap">
                      <Chip
                        icon={sev.icon}
                        label={sev.label}
                        size="small"
                        sx={{
                          bgcolor: `${sev.color}22`,
                          color: sev.color,
                          border: `1px solid ${sev.color}55`,
                          fontWeight: 700,
                          fontSize: '0.7rem'
                        }}
                      />
                      <Chip
                        label={sta.label}
                        size="small"
                        sx={{
                          bgcolor: `${sta.color}22`,
                          color: sta.color,
                          border: `1px solid ${sta.color}55`,
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }}
                      />
                      <Chip
                        label={anomaly.anomalyType.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.06)',
                          color: '#94a3b8',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace'
                        }}
                      />
                      {anomaly.importRecord && (
                        <Chip
                          label={`Row ${anomaly.importRecord.rowNumber}`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.06)',
                            color: '#64748b',
                            fontSize: '0.68rem'
                          }}
                        />
                      )}
                    </Stack>

                    <Typography variant="body1" color="#f1f5f9" fontWeight={500} mb={0.5}>
                      {anomaly.description}
                    </Typography>

                    {anomaly.suggestedAction && (
                      <Typography variant="body2" color="#94a3b8">
                        💡 {anomaly.suggestedAction}
                      </Typography>
                    )}
                  </Box>

                  {/* Right: action buttons */}
                  {!isResolved && (
                    <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} flexShrink={0}>
                      <Tooltip title="Approve — mark this anomaly as acceptable">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => openDialog(anomaly.id, 'APPROVED')}
                          sx={{
                            color: '#22c55e',
                            borderColor: '#22c55e55',
                            '&:hover': { bgcolor: '#22c55e22', borderColor: '#22c55e' },
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Approve
                        </Button>
                      </Tooltip>
                      <Tooltip title="Reject — mark this row as invalid, skip on import">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => openDialog(anomaly.id, 'REJECTED')}
                          sx={{
                            color: '#ef4444',
                            borderColor: '#ef444455',
                            '&:hover': { bgcolor: '#ef444422', borderColor: '#ef4444' },
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Reject
                        </Button>
                      </Tooltip>
                      <Tooltip title="Mark as fixed — data will be corrected manually">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<BuildIcon />}
                          onClick={() => openDialog(anomaly.id, 'FIXED')}
                          sx={{
                            color: '#3b82f6',
                            borderColor: '#3b82f655',
                            '&:hover': { bgcolor: '#3b82f622', borderColor: '#3b82f6' },
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Fixed
                        </Button>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Confirmation dialog */}
      <Dialog
        open={dialog.open}
        onClose={closeDialog}
        PaperProps={{
          sx: {
            bgcolor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            color: '#f1f5f9'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#94a3b8' }}>
            {dialog.action === 'APPROVED' && 'Mark this anomaly as Approved? It will be accepted on import.'}
            {dialog.action === 'REJECTED' && 'Mark this anomaly as Rejected? The row will be skipped on import.'}
            {dialog.action === 'FIXED'    && 'Mark this anomaly as Fixed? Confirm the data issue has been corrected.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={updating} sx={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={confirmAction}
            disabled={updating}
            variant="contained"
            sx={{
              bgcolor:
                dialog.action === 'APPROVED' ? '#22c55e' :
                dialog.action === 'REJECTED' ? '#ef4444' : '#3b82f6',
              '&:hover': {
                bgcolor:
                  dialog.action === 'APPROVED' ? '#16a34a' :
                  dialog.action === 'REJECTED' ? '#dc2626' : '#2563eb'
              },
              fontWeight: 700
            }}
          >
            {updating ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

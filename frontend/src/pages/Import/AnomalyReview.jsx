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
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  CheckCircle      as CheckCircleIcon,
  Cancel           as CancelIcon,
  Build            as BuildIcon,
  MergeType        as MergeIcon,
  ArrowBack        as ArrowBackIcon,
  Refresh          as RefreshIcon,
  WarningAmber     as WarningIcon,
  Error            as ErrorIcon,
  InfoOutlined     as InfoIcon,
  GppBad           as CriticalIcon,
  TaskAlt          as TaskAltIcon
} from '@mui/icons-material';
import {
  getSessionAnomalies,
  approveAnomaly,
  rejectAnomaly,
  manualFixAnomaly,
  mergeDuplicateAnomaly
} from '../../services/importService.js';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Critical', icon: <CriticalIcon sx={{ fontSize: 14 }} /> },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  label: 'High',     icon: <ErrorIcon   sx={{ fontSize: 14 }} /> },
  MEDIUM:   { color: '#eab308', bg: 'rgba(234,179,8,0.12)',   label: 'Medium',   icon: <WarningIcon sx={{ fontSize: 14 }} /> },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Low',      icon: <InfoIcon    sx={{ fontSize: 14 }} /> }
};

const STATUS_CONFIG = {
  OPEN:     { color: '#94a3b8', label: 'Open' },
  APPROVED: { color: '#22c55e', label: 'Approved' },
  REJECTED: { color: '#ef4444', label: 'Rejected' },
  FIXED:    { color: '#6366f1', label: 'Fixed' }
};

const ACTION_CONFIG = {
  approve:    { label: 'Approve',     color: '#22c55e', Icon: CheckCircleIcon, needsNotes: false, needsFixData: false, needsTarget: false },
  reject:     { label: 'Reject',      color: '#ef4444', Icon: CancelIcon,      needsNotes: true,  needsFixData: false, needsTarget: false },
  manualFix:  { label: 'Manual Fix',  color: '#6366f1', Icon: BuildIcon,       needsNotes: true,  needsFixData: true,  needsTarget: false },
  merge:      { label: 'Merge',       color: '#f59e0b', Icon: MergeIcon,       needsNotes: true,  needsFixData: false, needsTarget: true  }
};

// ─── DataGrid sx overrides (dark glass theme) ──────────────────────────────────
const dataGridSx = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
  color: '#f1f5f9',
  fontFamily: '"Outfit", "Inter", sans-serif',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'rgba(99,102,241,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  '& .MuiDataGrid-row': {
    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
    '&.row--resolved': { opacity: 0.55 }
  },
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    py: 1.5,
    alignItems: 'center'
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    bgcolor: 'rgba(0,0,0,0.2)'
  },
  '& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    color: '#64748b',
    fontSize: '0.8rem'
  },
  '& .MuiDataGrid-toolbarContainer': {
    px: 2,
    pt: 1.5,
    pb: 1,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    bgcolor: 'rgba(0,0,0,0.15)',
    '& .MuiButton-root': { color: '#94a3b8', fontSize: '0.78rem' },
    '& .MuiInputBase-root': { color: '#f1f5f9' }
  },
  '& .MuiDataGrid-columnSeparator': { color: 'rgba(255,255,255,0.06)' },
  '& .MuiCheckbox-root': { color: '#64748b' },
  '& .MuiDataGrid-selectedRowCount': { color: '#6366f1' },
  bgcolor: 'rgba(255,255,255,0.02)'
};

// ─── Chip renderer helpers ──────────────────────────────────────────────────────
function SeverityChip({ value }) {
  const cfg = SEVERITY_CONFIG[value] || SEVERITY_CONFIG.LOW;
  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}44`,
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 24,
        '& .MuiChip-icon': { color: cfg.color, ml: '6px' }
      }}
    />
  );
}

function StatusChip({ value }) {
  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.OPEN;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: `${cfg.color}1a`,
        color: cfg.color,
        border: `1px solid ${cfg.color}44`,
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 24
      }}
    />
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function AnomalyReview() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  // Data
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [toast, setToast]         = useState({ open: false, message: '', severity: 'success' });

  // DataGrid selection
  const [rowSelectionModel, setRowSelectionModel] = useState([]);

  // Action dialog
  const [dialog, setDialog] = useState({
    open:         false,
    action:       null,      // 'approve' | 'reject' | 'manualFix' | 'merge'
    anomalyId:    null,
    rowNumber:    null,
    notes:        '',
    fixedData:    '',        // JSON string entered by user for manual fix
    targetRecord: ''         // targetRecordId string for merge
  });
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data   = await getSessionAnomalies(sessionId);
      const sorted = (data.anomalies || []).sort((a, b) => {
        const sev = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const d   = (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9);
        return d !== 0 ? d : (a.importRecord?.rowNumber ?? 0) - (b.importRecord?.rowNumber ?? 0);
      });
      setAnomalies(sorted);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load anomalies.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);

  // ── Progress stats ────────────────────────────────────────────────────────
  const counts = {
    OPEN:     anomalies.filter(a => a.status === 'OPEN').length,
    APPROVED: anomalies.filter(a => a.status === 'APPROVED').length,
    REJECTED: anomalies.filter(a => a.status === 'REJECTED').length,
    FIXED:    anomalies.filter(a => a.status === 'FIXED').length
  };
  const resolved = counts.APPROVED + counts.REJECTED + counts.FIXED;
  const progress = anomalies.length > 0 ? Math.round((resolved / anomalies.length) * 100) : 0;

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const openDialog = (action, anomalyId, rowNumber) => {
    setDialog({ open: true, action, anomalyId, rowNumber, notes: '', fixedData: '', targetRecord: '' });
    setDialogError('');
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(d => ({ ...d, open: false }));
    setDialogError('');
  };

  const patchLocalAnomaly = (id, patch) =>
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const confirmAction = async () => {
    const { action, anomalyId, notes, fixedData, targetRecord } = dialog;
    const cfg = ACTION_CONFIG[action];
    setDialogError('');
    setSubmitting(true);

    try {
      let result;

      if (action === 'approve') {
        result = await approveAnomaly(anomalyId, notes || undefined);
        patchLocalAnomaly(anomalyId, { status: 'APPROVED', reviewDecision: 'APPROVED' });

      } else if (action === 'reject') {
        result = await rejectAnomaly(anomalyId, notes || undefined);
        patchLocalAnomaly(anomalyId, { status: 'REJECTED', reviewDecision: 'REJECTED' });

      } else if (action === 'manualFix') {
        let parsed;
        try {
          parsed = JSON.parse(fixedData);
        } catch {
          setDialogError('fixedData must be valid JSON (e.g. {"amount":"150","date":"2026-06-12"})');
          setSubmitting(false);
          return;
        }
        result = await manualFixAnomaly(anomalyId, parsed, notes || undefined);
        patchLocalAnomaly(anomalyId, { status: 'FIXED', reviewDecision: 'MANUAL_FIX' });

      } else if (action === 'merge') {
        const parsedTarget = parseInt(targetRecord, 10);
        if (isNaN(parsedTarget)) {
          setDialogError('Target Record ID must be a valid number.');
          setSubmitting(false);
          return;
        }
        result = await mergeDuplicateAnomaly(anomalyId, parsedTarget, notes || undefined);
        patchLocalAnomaly(anomalyId, { status: 'FIXED', reviewDecision: 'MERGED' });
      }

      showToast(`Anomaly ${cfg.label.toLowerCase()}d successfully.`);
      closeDialog();
    } catch (err) {
      setDialogError(err?.response?.data?.message || `Failed to ${cfg.label.toLowerCase()} anomaly.`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── DataGrid columns ──────────────────────────────────────────────────────
  const columns = [
    {
      field: 'rowNumber',
      headerName: 'Row',
      width: 70,
      valueGetter: (_, row) => row.importRecord?.rowNumber ?? '—',
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
          #{value}
        </Typography>
      )
    },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 115,
      renderCell: ({ value }) => <SeverityChip value={value} />
    },
    {
      field: 'anomalyType',
      headerName: 'Anomaly Type',
      width: 210,
      renderCell: ({ value }) => (
        <Chip
          label={value.replace(/_/g, ' ')}
          size="small"
          sx={{
            bgcolor: 'rgba(99,102,241,0.1)',
            color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            height: 22
          }}
        />
      )
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 220,
      renderCell: ({ value }) => (
        <Tooltip title={value} placement="top-start">
          <Typography
            variant="caption"
            sx={{
              color: '#cbd5e1',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              lineHeight: 1.5
            }}
          >
            {value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'suggestedAction',
      headerName: 'Suggested Action',
      flex: 0.8,
      minWidth: 180,
      renderCell: ({ value }) => value ? (
        <Tooltip title={value} placement="top-start">
          <Typography
            variant="caption"
            sx={{
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              fontStyle: 'italic'
            }}
          >
            💡 {value}
          </Typography>
        </Tooltip>
      ) : <Typography variant="caption" sx={{ color: '#334155' }}>—</Typography>
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 108,
      renderCell: ({ value }) => <StatusChip value={value} />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 260,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => {
        const isResolved = row.status !== 'OPEN';
        if (isResolved) {
          return (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TaskAltIcon sx={{ fontSize: 16, color: STATUS_CONFIG[row.status]?.color ?? '#22c55e' }} />
              <Typography variant="caption" sx={{ color: '#475569' }}>
                {STATUS_CONFIG[row.status]?.label ?? row.status}
              </Typography>
            </Stack>
          );
        }
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
              <Tooltip key={key} title={cfg.label}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (key === 'manualFix') {
                      navigate(`/import/${sessionId}/anomalies/${row.id}/fix`);
                    } else {
                      openDialog(key, row.id, row.importRecord?.rowNumber);
                    }
                  }}
                  sx={{
                    minWidth: 0,
                    px: 1,
                    py: 0.4,
                    fontSize: '0.68rem',
                    color: cfg.color,
                    borderColor: `${cfg.color}55`,
                    '&:hover': { bgcolor: `${cfg.color}18`, borderColor: cfg.color },
                    lineHeight: 1.2
                  }}
                >
                  <cfg.Icon sx={{ fontSize: 14, mr: 0.4 }} />
                  {cfg.label}
                </Button>
              </Tooltip>
            ))}
          </Stack>
        );
      }
    }
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)', p: { xs: 2, md: 4 } }}>

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Tooltip title="Back to session">
          <IconButton
            onClick={() => navigate(`/import/${sessionId}`)}
            sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} color="#f1f5f9" sx={{ letterSpacing: '-0.02em' }}>
            Anomaly Review
          </Typography>
          <Typography variant="body2" color="#475569">
            Session&nbsp;<span style={{ color: '#6366f1', fontWeight: 600 }}>#{sessionId}</span>
            &nbsp;— Review and resolve all flagged issues before import
          </Typography>
        </Box>

        <Tooltip title="Refresh anomalies">
          <span>
            <IconButton
              onClick={fetchAnomalies}
              disabled={loading}
              sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* ── Progress bar ── */}
      {!loading && anomalies.length > 0 && (
        <Paper
          elevation={0}
          sx={{ mb: 3, p: 2.5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Box flex={1}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="#64748b" fontWeight={600}>
                  Review Progress
                </Typography>
                <Typography variant="body2" color="#f1f5f9" fontWeight={700}>
                  {resolved} / {anomalies.length} resolved
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 7,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.06)',
                  '& .MuiLinearProgress-bar': {
                    background: progress === 100
                      ? 'linear-gradient(90deg, #22c55e, #10b981)'
                      : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: 4
                  }
                }}
              />
            </Box>

            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              {Object.entries(counts).map(([status, count]) => (
                <Chip
                  key={status}
                  label={`${STATUS_CONFIG[status].label}: ${count}`}
                  size="small"
                  sx={{
                    bgcolor: `${STATUS_CONFIG[status].color}18`,
                    color: STATUS_CONFIG[status].color,
                    border: `1px solid ${STATUS_CONFIG[status].color}33`,
                    fontWeight: 700,
                    fontSize: '0.72rem'
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {error}
        </Alert>
      )}

      {/* ── DataGrid ── */}
      <Paper
        elevation={0}
        sx={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}
      >
        <DataGrid
          rows={anomalies}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          checkboxSelection
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={setRowSelectionModel}
          getRowClassName={({ row }) => row.status !== 'OPEN' ? 'row--resolved' : ''}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
              sx: { '& .MuiInputBase-input': { color: '#f1f5f9' } }
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'severity', sort: 'asc' }] }
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          sx={dataGridSx}
        />
      </Paper>

      {/* ── Empty state ── */}
      {!loading && anomalies.length === 0 && !error && (
        <Paper
          elevation={0}
          sx={{ p: 8, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, mt: 2 }}
        >
          <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2, opacity: 0.9 }} />
          <Typography variant="h6" color="#f1f5f9" gutterBottom fontWeight={700}>
            No Anomalies Detected
          </Typography>
          <Typography variant="body2" color="#475569">
            All records passed validation — you can proceed to import.
          </Typography>
        </Paper>
      )}

      {/* ── Action Dialog ── */}
      {dialog.open && (() => {
        const cfg = ACTION_CONFIG[dialog.action] || {};
        return (
          <Dialog
            open={dialog.open}
            onClose={closeDialog}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: '#111827',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                color: '#f1f5f9',
                backgroundImage: `linear-gradient(135deg, rgba(${
                  dialog.action === 'approve' ? '34,197,94' :
                  dialog.action === 'reject'  ? '239,68,68' :
                  dialog.action === 'manualFix' ? '99,102,241' : '245,158,11'
                },0.04) 0%, transparent 60%)`
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <cfg.Icon sx={{ color: cfg.color, fontSize: 22 }} />
              {cfg.label} Anomaly
              {dialog.rowNumber && (
                <Chip
                  label={`Row #${dialog.rowNumber}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.7rem', ml: 'auto' }}
                />
              )}
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
              <DialogContentText sx={{ color: '#94a3b8', mb: 2, fontSize: '0.9rem' }}>
                {dialog.action === 'approve'   && 'Mark this anomaly as acceptable. The record will be included on import.'}
                {dialog.action === 'reject'    && 'Reject this anomaly. The parent record will be marked INVALID and skipped on import.'}
                {dialog.action === 'manualFix' && 'Apply corrected field values to the record and mark this anomaly as manually fixed.'}
                {dialog.action === 'merge'     && 'Mark this duplicate record as merged into the target record. The duplicate will be skipped on import.'}
              </DialogContentText>

              {/* Manual fix: JSON field editor */}
              {dialog.action === 'manualFix' && (
                <TextField
                  label='Fixed Data (JSON)'
                  placeholder='{"amount": "150.00", "date": "2026-06-12"}'
                  value={dialog.fixedData}
                  onChange={e => setDialog(d => ({ ...d, fixedData: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                  sx={{ mb: 2 }}
                  helperText='Supported fields: amount, date, currency, participants'
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
              )}

              {/* Merge: target record ID */}
              {dialog.action === 'merge' && (
                <TextField
                  label='Target Record ID'
                  placeholder='e.g. 42'
                  value={dialog.targetRecord}
                  onChange={e => setDialog(d => ({ ...d, targetRecord: e.target.value }))}
                  fullWidth
                  size="small"
                  type="number"
                  sx={{ mb: 2 }}
                  helperText='The ID of the primary (kept) ImportRecord this duplicate merges into'
                />
              )}

              {/* Notes — shown for all actions */}
              <TextField
                label={cfg.needsNotes ? 'Notes (required)' : 'Notes (optional)'}
                placeholder="Add reviewer notes…"
                value={dialog.notes}
                onChange={e => setDialog(d => ({ ...d, notes: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
                size="small"
              />

              {dialogError && (
                <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {dialogError}
                </Alert>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button onClick={closeDialog} disabled={submitting} sx={{ color: '#64748b' }}>
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                disabled={submitting || (cfg.needsNotes && !dialog.notes.trim())}
                variant="contained"
                startIcon={submitting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <cfg.Icon />}
                sx={{
                  bgcolor: cfg.color,
                  '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.88)' },
                  '&.Mui-disabled': { opacity: 0.5 },
                  fontWeight: 700,
                  px: 3
                }}
              >
                {submitting ? 'Processing…' : `Confirm ${cfg.label}`}
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* ── Toast ── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast(t => ({ ...t, open: false }))}
          sx={{ bgcolor: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

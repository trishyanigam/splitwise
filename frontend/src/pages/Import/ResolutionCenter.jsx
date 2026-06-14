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
  Snackbar,
  Grid,
  Card,
  CardContent,
  Divider,
  MenuItem,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/WarningAmber';
import HistoryIcon from '@mui/icons-material/History';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PolicyIcon from '@mui/icons-material/SettingsBackupRestore';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutlined';
import HelpIcon from '@mui/icons-material/HelpOutlined';
import {
  getSessionAnomalies,
  resolveAnomalyStrategy,
  getAnomalyResolutionHistory
} from '../../services/importService.js';
import ResolutionHistory from '../../components/ResolutionHistory.jsx';

// ─── Frontend Policy Matching Logic (Mirrors Backend Policy Engine) ───
const POLICIES = {
  DUPLICATE: {
    name: 'DUPLICATE',
    label: 'Duplicate Transaction Policy',
    action: 'REJECTED', // maps to skip
    suggestedResolution: 'Skip duplicate record to prevent double-entry.'
  },
  NEGATIVE_AMOUNT: {
    name: 'NEGATIVE_AMOUNT',
    label: 'Negative Amount Policy',
    action: 'CONVERT_TO_REFUND',
    suggestedResolution: 'Convert to Refund (invert negative amount to positive).'
  },
  SETTLEMENT_ROW: {
    name: 'SETTLEMENT_ROW',
    label: 'Settlement Recognition Policy',
    action: 'CONVERT_TO_SETTLEMENT',
    suggestedResolution: 'Convert to Group Settlement.'
  },
  UNKNOWN_USER: {
    name: 'UNKNOWN_USER',
    label: 'Unknown User Policy',
    action: 'MANUAL_CORRECTION',
    suggestedResolution: 'Map to an active group member email.'
  },
  INVALID_DATE: {
    name: 'INVALID_DATE',
    label: 'Invalid Date Format Policy',
    action: 'MANUAL_CORRECTION',
    suggestedResolution: 'Apply current date or provide valid YYYY-MM-DD.'
  },
  MEMBERSHIP_VIOLATION: {
    name: 'MEMBERSHIP_VIOLATION',
    label: 'Membership Period Policy',
    action: 'APPROVED',
    suggestedResolution: 'Approve warning or manually map split shares.'
  }
};

function mapAnomalyToPolicy(anomaly) {
  const type = (anomaly.anomalyType || '').toUpperCase().trim();
  if (type === 'DUPLICATE_ROW' || type === 'DUPLICATE') {
    return POLICIES.DUPLICATE;
  }
  if (type === 'INVALID_AMOUNT_VALUE') {
    const desc = (anomaly.description || '').toLowerCase();
    if (desc.includes('negative') || desc.includes('less than zero') || desc.includes('amount "-"')) {
      return POLICIES.NEGATIVE_AMOUNT;
    }
    return POLICIES.NEGATIVE_AMOUNT;
  }
  if (type === 'INVALID_DATE_FORMAT' || type === 'FUTURE_DATE') {
    return POLICIES.INVALID_DATE;
  }
  if (type === 'UNKNOWN_USER_EMAIL' || type === 'MISSING_USER') {
    return POLICIES.UNKNOWN_USER;
  }
  if (type === 'GROUP_MEMBERSHIP_ERROR' || type === 'INACTIVE_MEMBER_SPLIT') {
    return POLICIES.MEMBERSHIP_VIOLATION;
  }
  if (type === 'SETTLEMENT_KEYWORDS_DETECTED') {
    return POLICIES.SETTLEMENT_ROW;
  }
  
  return {
    name: 'CUSTOM_POLICY',
    label: 'Custom Verification Rule',
    action: 'MANUAL_CORRECTION',
    suggestedResolution: anomaly.suggestedAction || 'Manually verify and resolve parameters.'
  };
}

// ─── Design Colors / Tokens ───
const STATUS_CONFIG = {
  OPEN:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Unresolved' },
  APPROVED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Approved' },
  REJECTED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Skipped (Rejected)' },
  FIXED:    { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Resolved (Fixed)' }
};

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'High' },
  MEDIUM:   { color: '#eab308', bg: 'rgba(234,179,8,0.12)', label: 'Medium' },
  LOW:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Low' }
};

// ─── DataGrid CSS overrides ───
const dataGridSx = {
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 3,
  color: '#cbd5e1',
  fontFamily: '"Outfit", "Inter", sans-serif',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'rgba(99,102,241,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  '& .MuiDataGrid-row': {
    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
    '&.row--resolved': { opacity: 0.6 }
  },
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    py: 1.5,
    alignItems: 'center'
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    bgcolor: 'rgba(15,23,42,0.6)'
  },
  '& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    color: '#64748b'
  },
  '& .MuiDataGrid-toolbarContainer': {
    px: 2,
    pt: 1.5,
    pb: 1,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    bgcolor: 'rgba(15,23,42,0.4)',
    '& .MuiButton-root': { color: '#94a3b8', fontSize: '0.78rem' },
    '& .MuiInputBase-root': { color: '#f1f5f9' }
  },
  bgcolor: 'rgba(30,41,59,0.3)'
};

export default function ResolutionCenter() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Loading & Error states
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // History states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [activeHistoryAnomaly, setActiveHistoryAnomaly] = useState(null);

  // Override States
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideAnomaly, setOverrideAnomaly] = useState(null);
  const [overrideType, setOverrideType] = useState('MANUAL_CORRECTION');
  const [overrideFields, setOverrideFields] = useState({
    title: '',
    amount: '',
    date: '',
    paidBy: '',
    description: ''
  });
  const [overrideError, setOverrideError] = useState('');

  // ── Fetch Anomalies ──
  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionAnomalies(sessionId);
      setAnomalies(data.anomalies || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load session anomalies.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Toast helper
  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  // ── Apply Suggested Resolution ──
  const handleApplyResolution = async (anomaly) => {
    const policy = mapAnomalyToPolicy(anomaly);
    let resolvedValue = null;

    // Build specific values for certain automatic policies
    if (policy.name === 'NEGATIVE_AMOUNT') {
      // Amount inversion handled automatically backend-side, so resolvedValue is empty
    } else if (policy.name === 'INVALID_DATE') {
      // Default date to today
      resolvedValue = { date: new Date().toISOString().split('T')[0] };
    }

    try {
      showToast('Applying suggested resolution strategy...', 'info');
      const result = await resolveAnomalyStrategy(anomaly.id, policy.action, resolvedValue);
      if (result.success) {
        showToast('Suggested resolution applied successfully!');
        fetchAnomalies();
      }
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.message || 'Failed to apply resolution.', 'error');
    }
  };

  // ── Open Override Resolution Dialog ──
  const handleOpenOverride = (anomaly) => {
    setOverrideAnomaly(anomaly);
    setOverrideError('');
    setOverrideType('MANUAL_CORRECTION');
    
    // Autofill override form from the raw data
    const raw = anomaly.importRecord?.rawData || {};
    // Normalize keys (amount, date, title, etc)
    const getVal = (field) => {
      const match = Object.keys(raw).find(k => k.trim().toLowerCase().replace(/\s+/g, '') === field);
      return match ? raw[match] : '';
    };

    setOverrideFields({
      title: getVal('title'),
      amount: getVal('amount'),
      date: getVal('date'),
      paidBy: getVal('paidby') || getVal('paidBy'),
      description: getVal('description')
    });
    setOverrideOpen(true);
  };

  // ── Submit Override Resolution ──
  const handleSubmitOverride = async () => {
    setOverrideError('');
    setSubmittingOverride(true);
    try {
      let resolvedValue = null;
      if (overrideType === 'MANUAL_CORRECTION') {
        resolvedValue = {};
        const raw = overrideAnomaly.importRecord?.rawData || {};
        
        // Helper to match casing of original keys or default
        const setField = (field, val) => {
          const match = Object.keys(raw).find(k => k.trim().toLowerCase().replace(/\s+/g, '') === field.toLowerCase());
          resolvedValue[match || field] = val;
        };

        if (overrideFields.title) setField('title', overrideFields.title);
        if (overrideFields.amount) setField('amount', overrideFields.amount);
        if (overrideFields.date) setField('date', overrideFields.date);
        if (overrideFields.paidBy) setField('paidBy', overrideFields.paidBy);
        if (overrideFields.description) setField('description', overrideFields.description);
      }

      const result = await resolveAnomalyStrategy(overrideAnomaly.id, overrideType, resolvedValue);
      if (result.success) {
        showToast('Resolution override applied successfully!');
        setOverrideOpen(false);
        fetchAnomalies();
      }
    } catch (err) {
      console.error(err);
      setOverrideError(err?.response?.data?.message || 'Failed to apply override resolution.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  // ── View Resolution History ──
  const handleViewHistory = async (anomaly) => {
    setActiveHistoryAnomaly(anomaly);
    setHistoryLogs([]);
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const result = await getAnomalyResolutionHistory(anomaly.id);
      if (result.success) {
        setHistoryLogs(result.history || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load resolution history log.', 'error');
      setHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Columns for DataGrid ──
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
      width: 100,
      renderCell: ({ value }) => {
        const config = SEVERITY_CONFIG[value] || SEVERITY_CONFIG.LOW;
        return (
          <Chip
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.bg,
              color: config.color,
              border: `1px solid ${config.color}33`,
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 22
            }}
          />
        );
      }
    },
    {
      field: 'anomalyType',
      headerName: 'Anomaly Details',
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Chip
            label={(row.anomalyType || '').replace(/_/g, ' ')}
            size="small"
            sx={{
              bgcolor: 'rgba(244,63,94,0.08)',
              color: '#fb7185',
              border: '1px solid rgba(244,63,94,0.2)',
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              height: 18,
              mb: 0.5
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: '#94a3b8', display: 'block', whiteSpace: 'normal', lineHeight: 1.3 }}
          >
            {row.description}
          </Typography>
        </Box>
      )
    },
    {
      field: 'suggestedPolicy',
      headerName: 'Suggested Policy',
      width: 170,
      valueGetter: (_, row) => mapAnomalyToPolicy(row).label,
      renderCell: ({ row }) => {
        const policy = mapAnomalyToPolicy(row);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <PolicyIcon sx={{ fontSize: 16, color: '#818cf8' }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#e2e8f0', display: 'block' }}>
                {policy.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>
                {policy.label}
              </Typography>
            </Box>
          </Box>
        );
      }
    },
    {
      field: 'suggestedResolution',
      headerName: 'Suggested Resolution',
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => {
        const policy = mapAnomalyToPolicy(row);
        return (
          <Box sx={{ py: 0.5 }}>
            <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#38bdf8', fontWeight: 600 }}>
              💡 {policy.action}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.72rem', whiteSpace: 'normal', lineHeight: 1.3 }}>
              {policy.suggestedResolution}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: ({ value }) => {
        const config = STATUS_CONFIG[value] || STATUS_CONFIG.OPEN;
        return (
          <Chip
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.bg,
              color: config.color,
              border: `1px solid ${config.color}33`,
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 22
            }}
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 320,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        const isResolved = row.status !== 'OPEN';
        return (
          <Stack direction="row" spacing={1} alignItems="center" height="100%">
            {!isResolved ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleApplyResolution(row)}
                  sx={{
                    fontSize: '0.68rem',
                    color: '#10b981',
                    borderColor: 'rgba(16,185,129,0.3)',
                    '&:hover': { bgcolor: 'rgba(16,185,129,0.08)', borderColor: '#10b981' }
                  }}
                >
                  Apply
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleOpenOverride(row)}
                  sx={{
                    fontSize: '0.68rem',
                    color: '#818cf8',
                    borderColor: 'rgba(129,140,248,0.3)',
                    '&:hover': { bgcolor: 'rgba(129,140,248,0.08)', borderColor: '#818cf8' }
                  }}
                >
                  Override
                </Button>
              </>
            ) : (
              <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic', mr: 1 }}>
                Decision: {row.reviewDecision || 'Resolved'}
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={() => handleViewHistory(row)}
              sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.04)' } }}
              title="View History"
            >
              <HistoryIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        );
      }
    }
  ];

  // ── Calculation counts ──
  const totalCounts = anomalies.length;
  const resolvedCounts = anomalies.filter(a => a.status !== 'OPEN').length;
  const progressPercent = totalCounts > 0 ? Math.round((resolvedCounts / totalCounts) * 100) : 0;

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #090d16 0%, #15102a 100%)', p: { xs: 2, md: 4 } }}>
      
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Tooltip title="Back to preview">
          <IconButton
            onClick={() => navigate(`/import/${sessionId}`)}
            sx={{
              color: '#64748b',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.04)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Box flex={1}>
          <Typography variant="h4" fontWeight={800} color="#f1f5f9" sx={{ letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            Resolution Center
            <Chip
              label="Staging System"
              size="small"
              sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 600, border: '1px solid rgba(99,102,241,0.3)' }}
            />
          </Typography>
          <Typography variant="body2" color="#64748b">
            Review session <span style={{ color: '#818cf8', fontWeight: 600 }}>#{sessionId}</span> anomalies, apply rule-based automated solutions, or override mappings.
          </Typography>
        </Box>

        <Tooltip title="Refresh data">
          <span>
            <IconButton
              onClick={fetchAnomalies}
              disabled={loading}
              sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.04)' } }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* ── Progress & Status Bar ── */}
      {!loading && totalCounts > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            background: 'rgba(30,41,59,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 4
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack direction="row" justifyContent="space-between" mb={1.2}>
                <Typography variant="subtitle2" color="#94a3b8" fontWeight={700}>
                  Anomaly Resolution Progress
                </Typography>
                <Typography variant="subtitle2" color="#f1f5f9" fontWeight={800}>
                  {resolvedCounts} of {totalCounts} resolved ({progressPercent}%)
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& .MuiLinearProgress-bar': {
                    background: progressPercent === 100
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #6366f1, #4f46e5)',
                    borderRadius: 4
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1.5} justifyContent={{ md: 'flex-end' }} flexWrap="wrap" gap={1}>
                <Chip
                  label={`Unresolved: ${totalCounts - resolvedCounts}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 600 }}
                />
                <Chip
                  label={`Resolved: ${resolvedCounts}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}
                />
                {progressPercent === 100 && (
                  <Chip
                    label="All Clear"
                    size="small"
                    sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 700 }}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Error Banner ── */}
      {error && !loading && (
        <Alert
          severity="error"
          sx={{ mb: 3, bgcolor: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </Alert>
      )}

      {/* ── Table Grid ── */}
      <Paper
        elevation={0}
        sx={{
          background: 'rgba(15,23,42,0.2)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 4,
          overflow: 'hidden'
        }}
      >
        <DataGrid
          rows={anomalies}
          columns={columns}
          loading={loading}
          autoHeight
          rowHeight={80}
          disableRowSelectionOnClick
          getRowClassName={({ row }) => row.status !== 'OPEN' ? 'row--resolved' : ''}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 }
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } }
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          sx={dataGridSx}
        />
      </Paper>

      {/* ── Empty State ── */}
      {!loading && anomalies.length === 0 && !error && (
        <Paper
          elevation={0}
          sx={{ p: 8, textAlign: 'center', bgcolor: 'rgba(30,41,59,0.1)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4 }}
        >
          <CheckCircleIcon sx={{ fontSize: 60, color: '#10b981', mb: 2 }} />
          <Typography variant="h6" color="#f1f5f9" fontWeight={700}>
            No Anomalies Found
          </Typography>
          <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
            Staged data has no warnings or inconsistencies. You are ready to finalize import.
          </Typography>
        </Paper>
      )}

      {/* ── Action Dialog: Override Resolution ── */}
      {overrideOpen && overrideAnomaly && (
        <Dialog
          open={overrideOpen}
          onClose={() => !submittingOverride && setOverrideOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              color: '#f1f5f9'
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BuildIcon sx={{ color: '#818cf8' }} />
            Override Resolution Mapping
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#94a3b8', mb: 3, fontSize: '0.85rem' }}>
              Select a specific resolution path to force override the system's policy recommendation.
            </DialogContentText>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Resolution Type"
                  value={overrideType}
                  onChange={e => setOverrideType(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="APPROVED">APPROVED (Accept warning as is)</MenuItem>
                  <MenuItem value="REJECTED">REJECTED (Skip record on import)</MenuItem>
                  <MenuItem value="CONVERT_TO_REFUND">CONVERT_TO_REFUND (Invert amount sign)</MenuItem>
                  <MenuItem value="CONVERT_TO_SETTLEMENT">CONVERT_TO_SETTLEMENT (Set as transfer payment)</MenuItem>
                  <MenuItem value="MANUAL_CORRECTION">MANUAL_CORRECTION (Apply manual edits)</MenuItem>
                </TextField>
              </Grid>

              {/* Dynamic Edit Form Fields for Manual Correction */}
              {overrideType === 'MANUAL_CORRECTION' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Title / Product Name"
                      value={overrideFields.title}
                      onChange={e => setOverrideFields(prev => ({ ...prev, title: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Amount"
                      value={overrideFields.amount}
                      onChange={e => setOverrideFields(prev => ({ ...prev, amount: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Date (YYYY-MM-DD)"
                      placeholder="YYYY-MM-DD"
                      value={overrideFields.date}
                      onChange={e => setOverrideFields(prev => ({ ...prev, date: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Payer Email"
                      value={overrideFields.paidBy}
                      onChange={e => setOverrideFields(prev => ({ ...prev, paidBy: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Description"
                      value={overrideFields.description}
                      onChange={e => setOverrideFields(prev => ({ ...prev, description: e.target.value }))}
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {overrideError && (
              <Alert severity="error" sx={{ mt: 3, bgcolor: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                {overrideError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={() => setOverrideOpen(false)} disabled={submittingOverride} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitOverride}
              disabled={submittingOverride}
              variant="contained"
              sx={{
                bgcolor: '#6366f1',
                fontWeight: 700,
                px: 3,
                '&:hover': { bgcolor: '#4f46e5' }
              }}
            >
              {submittingOverride ? 'Submitting...' : 'Apply Override'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ── Action Dialog: View Audit History ── */}
      {historyOpen && activeHistoryAnomaly && (
        <Dialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              color: '#f1f5f9'
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HistoryIcon sx={{ color: '#38bdf8' }} />
            Resolution Audit Log
            <Chip
              label={`Row #${activeHistoryAnomaly.importRecord?.rowNumber}`}
              size="small"
              sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
            />
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <ResolutionHistory
              history={historyLogs}
              loading={historyLoading}
              reviewedBy={activeHistoryAnomaly?.reviewedBy?.name || ''}
              resolutionNotes={activeHistoryAnomaly?.resolutionNotes || ''}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setHistoryOpen(false)} sx={{ color: '#64748b' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast(t => ({ ...t, open: false }))}
          sx={{ bgcolor: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

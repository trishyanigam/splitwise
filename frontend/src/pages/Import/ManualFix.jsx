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
  TextField,
  Snackbar,
  Grid
} from '@mui/material';
import {
  ArrowBack        as ArrowBackIcon,
  Refresh          as RefreshIcon,
  Build            as BuildIcon,
  CheckCircle      as CheckCircleIcon,
  EditNote         as EditIcon,
  WarningAmber     as WarningIcon,
  Error            as ErrorIcon,
  InfoOutlined     as InfoIcon,
  GppBad           as CriticalIcon,
  History          as HistoryIcon
} from '@mui/icons-material';
import { getSessionAnomalies, manualFixAnomaly } from '../../services/importService.js';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GRADIENT_BG = 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)';

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical', icon: <CriticalIcon sx={{ fontSize: 16 }} /> },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  label: 'High',     icon: <ErrorIcon    sx={{ fontSize: 16 }} /> },
  MEDIUM:   { color: '#eab308', bg: 'rgba(234,179,8,0.12)',   label: 'Medium',   icon: <WarningIcon  sx={{ fontSize: 16 }} /> },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Low',      icon: <InfoIcon     sx={{ fontSize: 16 }} /> }
};

const STATUS_CONFIG = {
  OPEN:     { color: '#94a3b8', label: 'Open' },
  APPROVED: { color: '#22c55e', label: 'Approved' },
  REJECTED: { color: '#ef4444', label: 'Rejected' },
  FIXED:    { color: '#6366f1', label: 'Fixed' }
};

// ─── Key Normalisation helpers ──────────────────────────────────────────────────
const normaliseKey = (key) => {
  return String(key).trim().toLowerCase().replace(/\s+/g, '');
};

const getRawValue = (rawData, field) => {
  if (!rawData) return '';
  const normField = normaliseKey(field);
  if (rawData[normField] !== undefined) return rawData[normField];
  
  // Case-insensitive fallback
  const matchingKey = Object.keys(rawData).find(
    k => normaliseKey(k) === normField
  );
  return matchingKey !== undefined ? rawData[matchingKey] : '';
};

const formatValue = (val) => {
  if (Array.isArray(val)) return val.join(', ');
  if (val === undefined || val === null) return '';
  return String(val);
};

// ─── Custom glassmorphism input style ──────────────────────────────────────────
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255, 255, 255, 0.02)',
    color: '#f1f5f9',
    fontFamily: '"Outfit", "Inter", sans-serif',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.08)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.18)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' }
  },
  '& .MuiInputLabel-root': { color: '#64748b', fontFamily: '"Outfit", "Inter", sans-serif' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#a5b4fc' },
  '& .MuiFormHelperText-root': { color: '#475569', fontSize: '0.72rem' }
};

export default function ManualFix() {
  const { sessionId, anomalyId } = useParams();
  const navigate = useNavigate();

  // Page states
  const [anomaly, setAnomaly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Form states
  const [formData, setFormData] = useState({
    amount: '',
    date: '',
    currency: '',
    participants: ''
  });
  const [notes, setNotes] = useState('');

  // ── Fetch all anomalies to find the target ───────────────────────────────
  const fetchAnomalyDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionAnomalies(sessionId);
      const found = (data.anomalies || []).find(a => String(a.id) === String(anomalyId));
      if (!found) {
        setError(`Anomaly #${anomalyId} not found in this session.`);
      } else {
        setAnomaly(found);
        
        // Initialize form fields with original rawData values
        const rawData = found.importRecord?.rawData || {};
        setFormData({
          amount: String(getRawValue(rawData, 'amount') || ''),
          date: String(getRawValue(rawData, 'date') || ''),
          currency: String(getRawValue(rawData, 'currency') || '').toUpperCase(),
          participants: formatValue(getRawValue(rawData, 'participants') || '')
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load anomaly details.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, anomalyId]);

  useEffect(() => {
    fetchAnomalyDetails();
  }, [fetchAnomalyDetails]);

  // Context & original raw data pointers
  const rawData = anomaly?.importRecord?.rawData || {};
  
  // ── Validation logic ─────────────────────────────────────────────────────
  const amountNum = Number(formData.amount.trim().replace(/,/g, ''));
  const isAmountValid = formData.amount.trim() === '' || (!isNaN(amountNum) && amountNum > 0);

  const dateStr = formData.date.trim();
  const dateParsed = dateStr ? new Date(dateStr) : null;
  const isDateValid = dateStr === '' || (dateParsed !== null && !isNaN(dateParsed.getTime()));

  const currencyStr = formData.currency.trim();
  const isCurrencyValid = currencyStr === '' || /^[A-Za-z]{3}$/.test(currencyStr);

  // Check differences to know what's modified
  const origAmount = String(getRawValue(rawData, 'amount') || '');
  const origDate = String(getRawValue(rawData, 'date') || '');
  const origCurrency = String(getRawValue(rawData, 'currency') || '');
  const origParticipants = formatValue(getRawValue(rawData, 'participants') || '');

  const isAmountDiff = origAmount !== formData.amount;
  const isDateDiff = origDate !== formData.date;
  const isCurrencyDiff = origCurrency !== formData.currency;
  const isParticipantsDiff = origParticipants !== formData.participants;

  const hasChanges = isAmountDiff || isDateDiff || isCurrencyDiff || isParticipantsDiff;
  const isFormValid = isAmountValid && isDateValid && isCurrencyValid && hasChanges;

  // ── Submitting action ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setError(null);

    // Build corrections object containing ONLY updated/different fields
    const corrections = {};
    if (isAmountDiff) corrections.amount = formData.amount;
    if (isDateDiff) corrections.date = formData.date;
    if (isCurrencyDiff) corrections.currency = formData.currency;
    if (isParticipantsDiff) corrections.participants = formData.participants;

    try {
      await manualFixAnomaly(anomalyId, corrections, notes || undefined);
      setToast({
        open: true,
        message: 'Manual correction applied successfully. Redirecting...',
        severity: 'success'
      });
      
      // Navigate back to Anomaly Review page after short delay
      setTimeout(() => {
        navigate(`/import/${sessionId}/anomalies`);
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to apply manual fix.');
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    if (!anomaly) return;
    setFormData({
      amount: String(getRawValue(rawData, 'amount') || ''),
      date: String(getRawValue(rawData, 'date') || ''),
      currency: String(getRawValue(rawData, 'currency') || '').toUpperCase(),
      participants: formatValue(getRawValue(rawData, 'participants') || '')
    });
    setNotes('');
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: GRADIENT_BG, flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: '#6366f1' }} />
        <Typography variant="body2" color="#64748b">Loading record details…</Typography>
      </Box>
    );
  }

  const sevCfg = anomaly ? (SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.LOW) : null;
  const statusCfg = anomaly ? (STATUS_CONFIG[anomaly.status] || STATUS_CONFIG.OPEN) : null;

  return (
    <Box sx={{ minHeight: '100vh', background: GRADIENT_BG, p: { xs: 2, md: 4 } }}>
      
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Tooltip title="Back to anomaly review">
          <IconButton
            onClick={() => navigate(`/import/${sessionId}/anomalies`)}
            sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <BuildIcon sx={{ color: '#6366f1', fontSize: 26 }} />

        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} color="#f1f5f9" sx={{ letterSpacing: '-0.02em' }}>
            Manual Correction
          </Typography>
          <Typography variant="body2" color="#64748b">
            Session&nbsp;<span style={{ color: '#6366f1', fontWeight: 600 }}>#{sessionId}</span>
            &nbsp;· Row&nbsp;<span style={{ color: '#818cf8', fontWeight: 600 }}>#{anomaly?.importRecord?.rowNumber}</span>
            &nbsp;— Review original values, edit corrections, and resolve the anomaly
          </Typography>
        </Box>

        <Tooltip title="Reset values">
          <span>
            <IconButton
              onClick={resetForm}
              sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* ── Error Banner ── */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 4, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Main Layout Grid ── */}
      {anomaly && (
        <Grid container spacing={3.5}>
          
          {/* ── Left Column: Anomaly Info & Context ── */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              
              {/* 1. Anomaly Flag Details Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0, height: '4px',
                    background: sevCfg?.color || '#cbd5e1'
                  }
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Flagged Issue
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      icon={sevCfg?.icon}
                      label={sevCfg?.label}
                      size="small"
                      sx={{
                        bgcolor: sevCfg?.bg,
                        color: sevCfg?.color,
                        border: `1px solid ${sevCfg?.color}33`,
                        fontWeight: 700, fontSize: '0.68rem', height: 22,
                        '& .MuiChip-icon': { color: 'inherit' }
                      }}
                    />
                    <Chip
                      label={statusCfg?.label}
                      size="small"
                      sx={{
                        bgcolor: `${statusCfg?.color}16`,
                        color: statusCfg?.color,
                        border: `1px solid ${statusCfg?.color}33`,
                        fontWeight: 700, fontSize: '0.68rem', height: 22
                      }}
                    />
                  </Stack>
                </Stack>

                <Typography variant="h6" fontWeight={700} color="#f1f5f9" mb={1}>
                  {anomaly.anomalyType.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="body2" color="#94a3b8" mb={2} sx={{ lineHeight: 1.6 }}>
                  {anomaly.description}
                </Typography>

                {anomaly.suggestedAction && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(99,102,241,0.05)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 2,
                      display: 'flex',
                      gap: 1.5
                    }}
                  >
                    <Typography variant="body2" color="#818cf8" sx={{ mt: '2px' }}>💡</Typography>
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="#818cf8" display="block">
                        Suggested Action
                      </Typography>
                      <Typography variant="caption" color="#cbd5e1">
                        {anomaly.suggestedAction}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>

              {/* 2. Original Raw Context Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 3
                }}
              >
                <Typography variant="subtitle2" color="#64748b" fontWeight={700} mb={2} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Complete CSV Row Values
                </Typography>
                <Stack spacing={1.25}>
                  {Object.entries(rawData).map(([key, val]) => {
                    if (key === '__fixHistory__') return null;
                    const isKeyEditableField = ['amount', 'date', 'currency', 'participants'].includes(normaliseKey(key));
                    return (
                      <Box
                        key={key}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          pb: 1,
                          alignItems: 'flex-start'
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            color: isKeyEditableField ? '#818cf8' : '#475569',
                            fontWeight: isKeyEditableField ? 600 : 400
                          }}
                        >
                          {key} {isKeyEditableField && '✎'}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="#cbd5e1"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            wordBreak: 'break-all',
                            textAlign: 'right',
                            pl: 2
                          }}
                        >
                          {Array.isArray(val) ? val.join(', ') : String(val ?? '—')}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          {/* ── Right Column: Edit Form & Live Preview ── */}
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              
              {/* Form Card */}
              <Paper
                elevation={0}
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  p: 3,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 3
                }}
              >
                <Typography variant="subtitle2" color="#64748b" fontWeight={700} mb={3} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Correction Form
                </Typography>

                <Stack spacing={3.5}>
                  {/* Amount Field */}
                  <TextField
                    label="Amount"
                    placeholder="e.g. 150.00"
                    variant="outlined"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    error={!isAmountValid}
                    helperText={!isAmountValid ? "Must be a valid positive number" : "Numeric transaction total (required)"}
                    fullWidth
                    size="small"
                    sx={textFieldSx}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />

                  {/* Date Field */}
                  <TextField
                    label="Date"
                    placeholder="YYYY-MM-DD"
                    variant="outlined"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    error={!isDateValid}
                    helperText={!isDateValid ? "Must be a valid date string (e.g. YYYY-MM-DD)" : "Transaction date (required)"}
                    fullWidth
                    size="small"
                    sx={textFieldSx}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />

                  {/* Currency Field */}
                  <TextField
                    label="Currency"
                    placeholder="USD"
                    variant="outlined"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    error={!isCurrencyValid}
                    helperText={!isCurrencyValid ? "Must be a 3-letter currency code (e.g. USD, INR)" : "3-letter ISO-4217 code (optional)"}
                    fullWidth
                    size="small"
                    sx={textFieldSx}
                    inputProps={{ maxLength: 3, style: { fontFamily: 'monospace' } }}
                  />

                  {/* Participants Field */}
                  <TextField
                    label="Participants"
                    placeholder="e.g. Alice, Bob, Charlie"
                    variant="outlined"
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                    helperText="Comma-separated list of transaction participants (optional)"
                    fullWidth
                    size="small"
                    sx={textFieldSx}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                  />

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                  {/* Notes Field */}
                  <TextField
                    label="Notes"
                    placeholder="Explain why this correction is being applied..."
                    variant="outlined"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    helperText="Optional reviewer explanation for audit trails"
                    fullWidth
                    multiline
                    minRows={2.5}
                    size="small"
                    sx={textFieldSx}
                  />

                  {/* Submit / Reset Actions */}
                  <Stack direction="row" justifyContent="flex-end" spacing={2} pt={1}>
                    <Button
                      variant="text"
                      onClick={resetForm}
                      disabled={submitting}
                      sx={{ color: '#64748b', fontWeight: 600 }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!isFormValid || submitting}
                      startIcon={submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CheckCircleIcon />}
                      sx={{
                        bgcolor: '#6366f1',
                        color: '#ffffff',
                        '&:hover': { bgcolor: '#4f46e5' },
                        '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.22)', color: 'rgba(255,255,255,0.3)' },
                        fontWeight: 700,
                        px: 4.5,
                        py: 1
                      }}
                    >
                      {submitting ? 'Applying...' : 'Save Fix'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {/* Live Preview Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 3
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
                  <HistoryIcon sx={{ color: '#64748b', fontSize: 18 }} />
                  <Typography variant="subtitle2" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Live Preview (Original vs New)
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  {/* Amount Row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <Typography variant="caption" color="#475569" fontWeight={700}>Amount</Typography>
                    <Typography variant="caption" color="#64748b" sx={{ fontFamily: 'monospace' }}>{origAmount || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: isAmountDiff ? '#10b981' : '#cbd5e1',
                        fontWeight: isAmountDiff ? 700 : 400,
                        bgcolor: isAmountDiff ? 'rgba(16,185,129,0.06)' : 'transparent',
                        px: 1, py: 0.5, borderRadius: 1, display: 'inline-block', width: 'fit-content'
                      }}
                    >
                      {formData.amount || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}
                    </Typography>
                  </Box>

                  {/* Date Row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <Typography variant="caption" color="#475569" fontWeight={700}>Date</Typography>
                    <Typography variant="caption" color="#64748b" sx={{ fontFamily: 'monospace' }}>{origDate || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: isDateDiff ? '#10b981' : '#cbd5e1',
                        fontWeight: isDateDiff ? 700 : 400,
                        bgcolor: isDateDiff ? 'rgba(16,185,129,0.06)' : 'transparent',
                        px: 1, py: 0.5, borderRadius: 1, display: 'inline-block', width: 'fit-content'
                      }}
                    >
                      {formData.date || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}
                    </Typography>
                  </Box>

                  {/* Currency Row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <Typography variant="caption" color="#475569" fontWeight={700}>Currency</Typography>
                    <Typography variant="caption" color="#64748b" sx={{ fontFamily: 'monospace' }}>{origCurrency || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: isCurrencyDiff ? '#10b981' : '#cbd5e1',
                        fontWeight: isCurrencyDiff ? 700 : 400,
                        bgcolor: isCurrencyDiff ? 'rgba(16,185,129,0.06)' : 'transparent',
                        px: 1, py: 0.5, borderRadius: 1, display: 'inline-block', width: 'fit-content'
                      }}
                    >
                      {formData.currency || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}
                    </Typography>
                  </Box>

                  {/* Participants Row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', alignItems: 'center' }}>
                    <Typography variant="caption" color="#475569" fontWeight={700}>Participants</Typography>
                    <Typography variant="caption" color="#64748b" sx={{ fontFamily: 'monospace', pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {origParticipants || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: isParticipantsDiff ? '#10b981' : '#cbd5e1',
                        fontWeight: isParticipantsDiff ? 700 : 400,
                        bgcolor: isParticipantsDiff ? 'rgba(16,185,129,0.06)' : 'transparent',
                        px: 1, py: 0.5, borderRadius: 1, display: 'inline-block', width: 'fit-content',
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                    >
                      {formData.participants || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>empty</span>}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* ── Toast Snackbar ── */}
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

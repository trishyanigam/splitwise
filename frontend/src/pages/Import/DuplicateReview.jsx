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
  LinearProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Badge
} from '@mui/material';
import {
  ArrowBack        as ArrowBackIcon,
  Refresh          as RefreshIcon,
  CopyAll          as CopyIcon,
  ContentCut       as CutIcon,
  MergeType        as MergeIcon,
  SkipNext         as SkipIcon,
  CheckCircle      as CheckCircleIcon,
  CompareArrows    as CompareIcon,
  FiberManualRecord as DotIcon,
  ArrowForward     as ArrowIcon
} from '@mui/icons-material';
import { getSessionAnomalies, resolveDuplicate } from '../../services/importService.js';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GRADIENT_BG = 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)';

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  MEDIUM:   { color: '#eab308', bg: 'rgba(234,179,8,0.10)'  },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.10)'  }
};

const ACTION_CONFIG = {
  KEEP_ORIGINAL:  { label: 'Keep Original',  shortLabel: 'Keep Orig.',  color: '#10b981', Icon: CopyIcon,   description: 'Retain the original record and discard the duplicate.' },
  KEEP_DUPLICATE: { label: 'Keep Duplicate', shortLabel: 'Keep Dup.',   color: '#6366f1', Icon: CutIcon,    description: 'Promote the duplicate record and discard the original.' },
  MERGE:          { label: 'Merge',          shortLabel: 'Merge',       color: '#f59e0b', Icon: MergeIcon,  description: 'Deep-merge both records (duplicate fields take priority).' },
  SKIP:           { label: 'Skip',           shortLabel: 'Skip',        color: '#64748b', Icon: SkipIcon,   description: 'Leave both records unchanged and resolve the anomaly.' }
};

// ─── Field diff utilities ───────────────────────────────────────────────────────
/** Returns set of keys that differ between two rawData objects */
function getDiffKeys(orig, dup) {
  const allKeys = new Set([...Object.keys(orig || {}), ...Object.keys(dup || {})]);
  const diffs   = new Set();
  allKeys.forEach(k => {
    if (String(orig?.[k] ?? '') !== String(dup?.[k] ?? '')) diffs.add(k);
  });
  return diffs;
}

/** All unique field keys from both records, with __fixHistory__ excluded */
function getAllKeys(orig, dup) {
  const all = new Set([...Object.keys(orig || {}), ...Object.keys(dup || {})]);
  all.delete('__fixHistory__');
  return Array.from(all);
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

/** Side-panel header showing record identity and status */
function RecordHeader({ label, record, accentColor }) {
  if (!record) return null;
  return (
    <Box
      sx={{
        p: 2,
        borderBottom: `2px solid ${accentColor}`,
        background: `${accentColor}0f`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}
    >
      <DotIcon sx={{ color: accentColor, fontSize: 12 }} />
      <Box flex={1}>
        <Typography variant="subtitle2" fontWeight={700} color={accentColor}>
          {label}
        </Typography>
        <Typography variant="caption" color="#475569">
          Row&nbsp;#{record.rowNumber}&nbsp;·&nbsp;ID&nbsp;{record.id}
        </Typography>
      </Box>
      <Chip
        label={record.status}
        size="small"
        sx={{
          bgcolor: record.status === 'VALID' ? 'rgba(34,197,94,0.15)'
                 : record.status === 'INVALID' ? 'rgba(239,68,68,0.15)'
                 : 'rgba(234,179,8,0.15)',
          color: record.status === 'VALID' ? '#22c55e'
               : record.status === 'INVALID' ? '#ef4444'
               : '#eab308',
          fontSize: '0.65rem',
          fontWeight: 700,
          height: 20,
          border: '1px solid currentColor'
        }}
      />
    </Box>
  );
}

/** Field-by-field comparison table row */
function FieldRow({ fieldKey, origValue, dupValue, isDiff }) {
  const fmt = (v) => (v === undefined || v === null || v === '') ? <span style={{ color: '#334155', fontStyle: 'italic' }}>—</span> : String(v);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '130px 1fr 1fr',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        '&:last-child': { borderBottom: 'none' },
        bgcolor: isDiff ? 'rgba(245,158,11,0.04)' : 'transparent',
        transition: 'background 0.15s'
      }}
    >
      {/* Field name */}
      <Box sx={{ px: 2, py: 1.25, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <Typography
          variant="caption"
          sx={{
            color: isDiff ? '#fbbf24' : '#475569',
            fontFamily: 'monospace',
            fontWeight: isDiff ? 700 : 400,
            fontSize: '0.72rem'
          }}
        >
          {fieldKey}
          {isDiff && <span style={{ marginLeft: 4, color: '#f59e0b' }}>●</span>}
        </Typography>
      </Box>

      {/* Original value */}
      <Box
        sx={{
          px: 2, py: 1.25,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          bgcolor: isDiff ? 'rgba(16,185,129,0.06)' : 'transparent'
        }}
      >
        <Typography variant="caption" sx={{ color: isDiff ? '#34d399' : '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
          {fmt(origValue)}
        </Typography>
      </Box>

      {/* Duplicate value */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: isDiff ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
        <Typography variant="caption" sx={{ color: isDiff ? '#818cf8' : '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
          {fmt(dupValue)}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function DuplicateReview() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  // Pairs: each item = { anomaly, originalRecord, duplicateRecord }
  const [pairs,      setPairs]      = useState([]);
  const [pairIndex,  setPairIndex]  = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState({ open: false, message: '', severity: 'success' });

  // Action dialog
  const [dialog,     setDialog]     = useState({ open: false, action: null, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // ── Fetch duplicate anomalies ─────────────────────────────────────────────
  const fetchPairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data       = await getSessionAnomalies(sessionId);
      const anomalies  = data.anomalies || [];

      // Filter only DUPLICATE_ROW anomalies that are still OPEN
      const dupAnomalies = anomalies.filter(
        a => a.anomalyType === 'DUPLICATE_ROW' && a.status === 'OPEN'
      );

      // Group into pairs by matching importRecordId pairs within the same session.
      // The backend tags both records, so we cluster them by a stable pair key.
      const seen = new Set();
      const built = [];
      for (const anomaly of dupAnomalies) {
        const recId = anomaly.importRecord?.id ?? anomaly.importRecordId;
        if (seen.has(recId)) continue;
        seen.add(recId);

        // Look for the sibling anomaly that references the other record of the pair.
        // The description usually contains the target; fall back to next unpaired anomaly.
        const sibling = dupAnomalies.find(a => {
          const sid = a.importRecord?.id ?? a.importRecordId;
          return sid !== recId && !seen.has(sid);
        });

        const originalRecord  = anomaly.importRecord   || null;
        const duplicateRecord = sibling?.importRecord  || null;

        if (duplicateRecord) seen.add(duplicateRecord.id);

        built.push({ anomaly, originalRecord, duplicateRecord });
      }

      setPairs(built);
      setPairIndex(0);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load duplicate anomalies.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchPairs(); }, [fetchPairs]);

  // ── Current pair ──────────────────────────────────────────────────────────
  const currentPair = pairs[pairIndex] || null;
  const resolvedCount = pairs.filter(p => p.resolved).length;
  const progress = pairs.length > 0 ? Math.round((resolvedCount / pairs.length) * 100) : 0;

  // ── Diff computation ──────────────────────────────────────────────────────
  const orig     = currentPair?.originalRecord?.rawData  || {};
  const dup      = currentPair?.duplicateRecord?.rawData || {};
  const diffKeys = getDiffKeys(orig, dup);
  const allKeys  = getAllKeys(orig, dup);

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const openDialog  = (action) => { setDialog({ open: true, action, notes: '' }); setDialogError(''); };
  const closeDialog = () => { if (submitting) return; setDialog(d => ({ ...d, open: false })); setDialogError(''); };

  const confirmAction = async () => {
    if (!currentPair) return;
    setSubmitting(true);
    setDialogError('');

    const { anomaly, originalRecord, duplicateRecord } = currentPair;

    try {
      await resolveDuplicate({
        anomalyId:         anomaly.id,
        originalRecordId:  originalRecord?.id,
        duplicateRecordId: duplicateRecord?.id,
        action:            dialog.action,
        notes:             dialog.notes || undefined
      });

      // Mark pair resolved locally
      setPairs(prev => prev.map((p, i) =>
        i === pairIndex ? { ...p, resolved: true, resolvedAction: dialog.action } : p
      ));

      setToast({ open: true, message: `${ACTION_CONFIG[dialog.action].label} applied successfully.`, severity: 'success' });
      closeDialog();

      // Auto-advance to next unresolved pair
      const nextIdx = pairs.findIndex((p, i) => i > pairIndex && !p.resolved);
      if (nextIdx !== -1) setPairIndex(nextIdx);

    } catch (err) {
      setDialogError(err?.response?.data?.message || 'Failed to resolve duplicate.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const goPrev = () => setPairIndex(i => Math.max(0, i - 1));
  const goNext = () => setPairIndex(i => Math.min(pairs.length - 1, i + 1));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', background: GRADIENT_BG, p: { xs: 2, md: 4 } }}>

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Tooltip title="Back to anomaly review">
          <IconButton
            onClick={() => navigate(`/import/${sessionId}/anomalies`)}
            sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <CompareIcon sx={{ color: '#f59e0b', fontSize: 26 }} />

        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} color="#f1f5f9" sx={{ letterSpacing: '-0.02em' }}>
            Duplicate Review
          </Typography>
          <Typography variant="body2" color="#475569">
            Session&nbsp;<span style={{ color: '#6366f1', fontWeight: 600 }}>#{sessionId}</span>
            &nbsp;— Side-by-side comparison of flagged duplicate records
          </Typography>
        </Box>

        <Tooltip title="Refresh">
          <span>
            <IconButton
              onClick={fetchPairs}
              disabled={loading}
              sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* ── Loading ── */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={12} flexDirection="column" gap={2}>
          <CircularProgress sx={{ color: '#f59e0b' }} />
          <Typography variant="body2" color="#475569">Loading duplicate pairs…</Typography>
        </Box>
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

      {/* ── Empty ── */}
      {!loading && !error && pairs.length === 0 && (
        <Paper
          elevation={0}
          sx={{ p: 8, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}
        >
          <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
          <Typography variant="h6" color="#f1f5f9" fontWeight={700} gutterBottom>
            No Duplicate Pairs Found
          </Typography>
          <Typography variant="body2" color="#475569">
            No open DUPLICATE_ROW anomalies were detected in this session.
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 3, borderColor: '#334155', color: '#94a3b8' }}
            onClick={() => navigate(`/import/${sessionId}/anomalies`)}
          >
            Back to Anomaly Review
          </Button>
        </Paper>
      )}

      {/* ── Main content ── */}
      {!loading && !error && pairs.length > 0 && (
        <>
          {/* Progress + navigation bar */}
          <Paper
            elevation={0}
            sx={{ mb: 3, p: 2.5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              {/* Progress */}
              <Box flex={1}>
                <Stack direction="row" justifyContent="space-between" mb={0.75}>
                  <Typography variant="body2" color="#64748b" fontWeight={600}>Pairs Resolved</Typography>
                  <Typography variant="body2" color="#f1f5f9" fontWeight={700}>
                    {resolvedCount} / {pairs.length}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6, borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': {
                      background: progress === 100
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : 'linear-gradient(90deg, #f59e0b, #6366f1)',
                      borderRadius: 4
                    }
                  }}
                />
              </Box>

              {/* Pair navigator */}
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <IconButton
                  onClick={goPrev}
                  disabled={pairIndex === 0}
                  size="small"
                  sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9' }, '&.Mui-disabled': { opacity: 0.3 } }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>

                <Typography variant="body2" color="#94a3b8" sx={{ minWidth: 80, textAlign: 'center' }}>
                  Pair <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{pairIndex + 1}</span> of {pairs.length}
                </Typography>

                <IconButton
                  onClick={goNext}
                  disabled={pairIndex === pairs.length - 1}
                  size="small"
                  sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9' }, '&.Mui-disabled': { opacity: 0.3 } }}
                >
                  <ArrowIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* Pair status */}
              {currentPair?.resolved && (
                <Chip
                  label={`Resolved: ${ACTION_CONFIG[currentPair.resolvedAction]?.shortLabel}`}
                  size="small"
                  sx={{
                    bgcolor: `${ACTION_CONFIG[currentPair.resolvedAction]?.color}22`,
                    color:    ACTION_CONFIG[currentPair.resolvedAction]?.color,
                    fontWeight: 700, fontSize: '0.72rem'
                  }}
                />
              )}
            </Stack>
          </Paper>

          {/* ── Anomaly context banner ── */}
          {currentPair?.anomaly && (
            <Paper
              elevation={0}
              sx={{
                mb: 2.5, px: 2.5, py: 1.75,
                background: `${SEVERITY_CONFIG[currentPair.anomaly.severity]?.bg || 'rgba(245,158,11,0.08)'}`,
                border: `1px solid ${SEVERITY_CONFIG[currentPair.anomaly.severity]?.color || '#f59e0b'}33`,
                borderRadius: 2.5
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={currentPair.anomaly.severity}
                  size="small"
                  sx={{
                    bgcolor: SEVERITY_CONFIG[currentPair.anomaly.severity]?.bg,
                    color:   SEVERITY_CONFIG[currentPair.anomaly.severity]?.color,
                    fontWeight: 700, fontSize: '0.68rem'
                  }}
                />
                <Typography variant="body2" color="#cbd5e1" flex={1}>
                  {currentPair.anomaly.description}
                </Typography>
                {currentPair.anomaly.suggestedAction && (
                  <Typography variant="caption" color="#64748b" sx={{ fontStyle: 'italic' }}>
                    💡 {currentPair.anomaly.suggestedAction}
                  </Typography>
                )}
              </Stack>
            </Paper>
          )}

          {/* ── Diff legend ── */}
          <Stack direction="row" spacing={2} mb={2} alignItems="center">
            <Typography variant="caption" color="#475569">Legend:</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
              <Typography variant="caption" color="#34d399">Original value</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#6366f1' }} />
              <Typography variant="caption" color="#818cf8">Duplicate value</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b', opacity: 0.7 }} />
              <Typography variant="caption" color="#fbbf24">
                {diffKeys.size} field{diffKeys.size !== 1 ? 's' : ''} differ
              </Typography>
            </Stack>
          </Stack>

          {/* ── Side-by-side comparison table ── */}
          <Paper
            elevation={0}
            sx={{ mb: 3, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}
          >
            {/* Column header row */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '130px 1fr 1fr',
                bgcolor: 'rgba(0,0,0,0.3)',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="caption" color="#334155" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
                  Field
                </Typography>
              </Box>
              <Box sx={{ borderRight: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <RecordHeader label="Original Record" record={currentPair.originalRecord} accentColor="#10b981" />
              </Box>
              <Box sx={{ overflow: 'hidden' }}>
                <RecordHeader label="Duplicate Record" record={currentPair.duplicateRecord} accentColor="#6366f1" />
              </Box>
            </Box>

            {/* Field rows */}
            {allKeys.length > 0 ? allKeys.map(key => (
              <FieldRow
                key={key}
                fieldKey={key}
                origValue={orig[key]}
                dupValue={dup[key]}
                isDiff={diffKeys.has(key)}
              />
            )) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="#334155">No field data available for comparison.</Typography>
              </Box>
            )}
          </Paper>

          {/* ── Action buttons ── */}
          {!currentPair.resolved ? (
            <Paper
              elevation={0}
              sx={{ p: 3, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}
            >
              <Typography variant="subtitle2" color="#64748b" mb={2} fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                Choose Resolution
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                {Object.entries(ACTION_CONFIG).map(([action, cfg]) => (
                  <Tooltip key={action} title={cfg.description} placement="top">
                    <Button
                      variant="outlined"
                      startIcon={<cfg.Icon />}
                      onClick={() => openDialog(action)}
                      fullWidth
                      sx={{
                        color: cfg.color,
                        borderColor: `${cfg.color}55`,
                        borderWidth: 1.5,
                        py: 1.5,
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        '&:hover': {
                          bgcolor: `${cfg.color}15`,
                          borderColor: cfg.color,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 20px ${cfg.color}25`
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {cfg.label}
                    </Button>
                  </Tooltip>
                ))}
              </Stack>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                background: `${ACTION_CONFIG[currentPair.resolvedAction]?.color}0c`,
                border: `1px solid ${ACTION_CONFIG[currentPair.resolvedAction]?.color}33`,
                borderRadius: 3,
                textAlign: 'center'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 36, color: ACTION_CONFIG[currentPair.resolvedAction]?.color, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} color={ACTION_CONFIG[currentPair.resolvedAction]?.color}>
                Resolved — {ACTION_CONFIG[currentPair.resolvedAction]?.label}
              </Typography>
              <Typography variant="body2" color="#475569" mt={0.5}>
                {ACTION_CONFIG[currentPair.resolvedAction]?.description}
              </Typography>
              {pairIndex < pairs.length - 1 && (
                <Button
                  onClick={goNext}
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowIcon />}
                  sx={{ mt: 2, borderColor: '#334155', color: '#94a3b8' }}
                >
                  Next Pair
                </Button>
              )}
            </Paper>
          )}
        </>
      )}

      {/* ── Action Confirmation Dialog ── */}
      {dialog.open && (() => {
        const cfg = ACTION_CONFIG[dialog.action] || {};
        return (
          <Dialog
            open={dialog.open}
            onClose={closeDialog}
            maxWidth="xs"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: '#111827',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                color: '#f1f5f9',
                backgroundImage: `linear-gradient(135deg, ${cfg.color}08 0%, transparent 60%)`
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <cfg.Icon sx={{ color: cfg.color, fontSize: 22 }} />
              {cfg.label}
            </DialogTitle>
            <DialogContent sx={{ pt: 0.5 }}>
              <DialogContentText sx={{ color: '#94a3b8', mb: 2, fontSize: '0.875rem' }}>
                {cfg.description}
              </DialogContentText>

              <TextField
                label="Notes (optional)"
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
                disabled={submitting}
                variant="contained"
                startIcon={submitting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <cfg.Icon />}
                sx={{
                  bgcolor: cfg.color,
                  '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.88)' },
                  fontWeight: 700,
                  px: 3
                }}
              >
                {submitting ? 'Applying…' : `Confirm ${cfg.label}`}
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

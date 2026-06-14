import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import api from '../../services/api.js';

// ─────────────────────────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────────────────────────

const fetchImportReport = async (sessionId) => {
  const { data } = await api.get(`/reports/import/${sessionId}`);
  return data.report;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animated radial progress ring built with pure SVG.
 * Renders a coloured arc representing `percent` out of 100.
 */
const RadialProgress = ({ percent = 0, color = '#10b981', size = 80, stroke = 7 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

/**
 * Horizontal stacked bar showing the proportion of row outcomes.
 */
const RowBreakdownBar = ({ imported, skipped, failed, total }) => {
  if (!total || total === 0) return null;
  const pImported = (imported / total) * 100;
  const pSkipped  = (skipped  / total) * 100;
  const pFailed   = (failed   / total) * 100;

  return (
    <Box sx={{ width: '100%', mt: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {pImported > 0 && (
          <Box
            sx={{
              width: `${pImported}%`,
              backgroundColor: '#10b981',
              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}
        {pSkipped > 0 && (
          <Box
            sx={{
              width: `${pSkipped}%`,
              backgroundColor: '#f59e0b',
              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}
        {pFailed > 0 && (
          <Box
            sx={{
              width: `${pFailed}%`,
              backgroundColor: '#ef4444',
              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}
      </Box>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2.5, mt: 1.5, flexWrap: 'wrap' }}>
        {[
          { label: 'Imported', color: '#10b981', value: imported },
          { label: 'Skipped',  color: '#f59e0b', value: skipped  },
          { label: 'Failed',   color: '#ef4444', value: failed   },
        ].map(({ label, color, value }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {label}: <span style={{ color: '#f9fafb' }}>{value}</span>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Donut chart built with SVG for anomaly resolution breakdown.
 * Shows resolved vs pending slices.
 */
const AnomalyDonut = ({ resolved, pending, total }) => {
  const size    = 110;
  const stroke  = 14;
  const r       = (size - stroke) / 2;
  const circ    = 2 * Math.PI * r;

  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;
  const pendingPct  = total > 0 ? (pending  / total) * 100 : 0;

  const resolvedArc = (resolvedPct / 100) * circ;
  const pendingArc  = (pendingPct  / 100) * circ;
  const resolvedOffset = circ - resolvedArc;
  const pendingOffset  = circ - pendingArc - resolvedArc;

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
        />
        {/* Resolved slice (green) */}
        {resolved > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#10b981" strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${resolvedArc} ${circ}`}
            strokeDashoffset={circ}
            style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          />
        )}
        {/* Pending slice (amber) */}
        {pending > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#f59e0b" strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${pendingArc} ${circ}`}
            strokeDashoffset={resolvedOffset}
            style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          />
        )}
      </svg>
      {/* Centre label */}
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, color: total === 0 ? 'text.disabled' : 'text.primary' }}>
          {total}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
          total
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Individual metric stat card.
 */
const MetricCard = ({
  label,
  value,
  icon,
  accentColor,
  percent,
  total,
  sublabel,
}) => (
  <Card
    sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${accentColor}12 0%, rgba(0,0,0,0) 100%)`,
      border: `1px solid ${accentColor}22`,
      transition: 'all 0.25s ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 12px 40px -8px ${accentColor}30`,
        border: `1px solid ${accentColor}44`,
      },
    }}
  >
    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Top row: icon + radial ring */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: '12px',
            backgroundColor: `${accentColor}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <RadialProgress percent={percent} color={accentColor} size={60} stroke={6} />
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              fontWeight: 800,
              fontSize: '0.6rem',
              color: accentColor,
            }}
          >
            {percent > 0 ? `${Math.round(percent)}%` : '—'}
          </Typography>
        </Box>
      </Box>

      {/* Value + label */}
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: 'text.primary' }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" sx={{ color: accentColor, fontWeight: 600, mt: 0.5, display: 'block' }}>
            {sublabel}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ImportReport page — displays a fully visualised report for a specific
 * import session identified by :sessionId in the URL.
 *
 * Route: /import/:sessionId/report
 */
const ImportReport = () => {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchImportReport(sessionId);
      setReport(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to load the import report.'
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 16, gap: 3 }}>
        <CircularProgress color="primary" size={48} />
        <Typography variant="body2" color="text.secondary">
          Generating import report…
        </Typography>
      </Box>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
          Go Back
        </Button>
        <Alert
          severity="error"
          sx={{ borderRadius: '12px' }}
          action={
            <Button color="inherit" size="small" onClick={loadReport}>
              Retry
            </Button>
          }
        >
          {error || 'Import report data is unavailable.'}
        </Alert>
      </Box>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const {
    totalRows,
    importedRows,
    skippedRows,
    failedRows,
    anomaliesDetected,
    anomaliesResolved,
    pendingAnomalies,
  } = report;

  const safeTotal       = totalRows        || 0;
  const safeDetected    = anomaliesDetected || 0;
  const safeResolved    = anomaliesResolved || 0;
  const safePending     = pendingAnomalies  || 0;

  const pctImported = safeTotal > 0 ? (importedRows / safeTotal) * 100 : 0;
  const pctSkipped  = safeTotal > 0 ? (skippedRows  / safeTotal) * 100 : 0;
  const pctFailed   = safeTotal > 0 ? (failedRows   / safeTotal) * 100 : 0;
  const pctResolved = safeDetected > 0 ? (safeResolved / safeDetected) * 100 : 0;
  const pctPending  = safeDetected > 0 ? (safePending  / safeDetected) * 100 : 0;

  // Overall health chip
  const healthLabel =
    failedRows   > 0  ? { label: 'Issues Found',    color: 'error'   } :
    skippedRows  > 0  ? { label: 'Partial Success',  color: 'warning' } :
    safePending  > 0  ? { label: 'Review Pending',   color: 'warning' } :
                        { label: 'Clean Import',      color: 'success' };

  const metricCards = [
    {
      label:       'Rows Imported',
      value:       importedRows,
      icon:        <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: 24 }} />,
      accentColor: '#10b981',
      percent:     pctImported,
      sublabel:    `${Math.round(pctImported)}% of total rows`,
    },
    {
      label:       'Rows Skipped',
      value:       skippedRows,
      icon:        <RemoveCircleOutlineIcon sx={{ color: '#f59e0b', fontSize: 24 }} />,
      accentColor: '#f59e0b',
      percent:     pctSkipped,
      sublabel:    skippedRows > 0 ? 'Invalid / rejected rows' : 'None skipped',
    },
    {
      label:       'Rows Failed',
      value:       failedRows,
      icon:        <HighlightOffIcon sx={{ color: '#ef4444', fontSize: 24 }} />,
      accentColor: '#ef4444',
      percent:     pctFailed,
      sublabel:    failedRows > 0 ? 'Unresolved row errors' : 'No failures',
    },
    {
      label:       'Anomalies Found',
      value:       safeDetected,
      icon:        <BugReportOutlinedIcon sx={{ color: '#6366f1', fontSize: 24 }} />,
      accentColor: '#6366f1',
      percent:     safeDetected > 0 ? 100 : 0,
      sublabel:    safeDetected === 0 ? 'No anomalies detected' : `${safePending} still pending`,
    },
    {
      label:       'Anomalies Resolved',
      value:       safeResolved,
      icon:        <TaskAltIcon sx={{ color: '#3b82f6', fontSize: 24 }} />,
      accentColor: '#3b82f6',
      percent:     pctResolved,
      sublabel:    safeDetected > 0 ? `${Math.round(pctResolved)}% resolution rate` : '—',
    },
  ];

  return (
    <Box>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)', color: 'text.primary' },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Import Report
              </Typography>
              <Chip
                label={healthLabel.label}
                color={healthLabel.color}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Session&nbsp;
              <Box component="span" sx={{ color: '#6366f1', fontWeight: 700 }}>
                #{sessionId}
              </Box>
              &nbsp;— detailed row and anomaly breakdown
            </Typography>
          </Box>
        </Box>

        <Tooltip title="Refresh report">
          <IconButton
            onClick={loadReport}
            disabled={loading}
            sx={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)', color: 'text.primary' },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Metric Cards Row ─────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {metricCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg key={card.label}>
            <MetricCard {...card} total={safeTotal} />
          </Grid>
        ))}
      </Grid>

      {/* ── Bottom Section: Row Breakdown + Anomaly Donut ────────────────── */}
      <Grid container spacing={2.5}>

        {/* Row distribution bar card */}
        <Grid item xs={12} md={7}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Row Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Visual breakdown of how each row was processed across the import session.
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {safeTotal}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  total rows
                </Typography>
              </Box>

              <RowBreakdownBar
                imported={importedRows}
                skipped={skippedRows}
                failed={failedRows}
                total={safeTotal}
              />

              <Divider sx={{ my: 3 }} />

              {/* Row stats table */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Rows Imported', value: importedRows, color: '#10b981' },
                  { label: 'Rows Skipped',  value: skippedRows,  color: '#f59e0b' },
                  { label: 'Rows Failed',   value: failedRows,   color: '#ef4444' },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {label}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 38, textAlign: 'right' }}>
                        {safeTotal > 0 ? `${Math.round((value / safeTotal) * 100)}%` : '—'}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Anomaly donut card */}
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <CardContent sx={{ p: 3.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Anomaly Resolution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Status of detected anomalies and reviewer actions taken.
              </Typography>

              {/* Donut + legend */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flex: 1,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <AnomalyDonut
                  resolved={safeResolved}
                  pending={safePending}
                  total={safeDetected}
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[
                    {
                      icon:  <BugReportOutlinedIcon sx={{ fontSize: 18, color: '#6366f1' }} />,
                      label: 'Detected',
                      value: safeDetected,
                      color: '#6366f1',
                    },
                    {
                      icon:  <TaskAltIcon sx={{ fontSize: 18, color: '#10b981' }} />,
                      label: 'Resolved',
                      value: safeResolved,
                      color: '#10b981',
                    },
                    {
                      icon:  <PendingActionsIcon sx={{ fontSize: 18, color: '#f59e0b' }} />,
                      label: 'Pending',
                      value: safePending,
                      color: '#f59e0b',
                    },
                  ].map(({ icon, label, value, color }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          p: 0.75,
                          borderRadius: '8px',
                          backgroundColor: `${color}18`,
                          display: 'flex',
                        }}
                      >
                        {icon}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', lineHeight: 1 }}>
                          {label}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.3 }}>
                          {value}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Resolution rate progress bar */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Resolution Rate
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                    {safeDetected > 0 ? `${Math.round(pctResolved)}%` : '—'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pctResolved}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      borderRadius: 999,
                      transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </Box>

                {safePending > 0 && (
                  <Alert
                    severity="warning"
                    icon={<PendingActionsIcon />}
                    sx={{
                      mt: 2,
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      py: 0.5,
                      '& .MuiAlert-icon': { fontSize: 18 },
                    }}
                  >
                    {safePending} anomali{safePending === 1 ? 'y' : 'es'} still need review before importing.
                  </Alert>
                )}

                {safeDetected === 0 && (
                  <Alert
                    severity="success"
                    sx={{
                      mt: 2,
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      py: 0.5,
                    }}
                  >
                    No anomalies were detected in this session.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImportReport;
